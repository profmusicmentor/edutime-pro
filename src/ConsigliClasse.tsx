/**
 * Consigli di classe: da un elenco di classi e dai docenti già assegnati,
 * costruisce il calendario delle riunioni mettendone più d'una in
 * contemporanea, senza mai mettere lo stesso docente in due consigli nello
 * stesso momento. Gestisce più sale, anche in sedi diverse, e — se l'orario
 * scolastico è già stato generato — prova a lasciare la pausa pranzo a chi ha
 * fatto l'ultima ora del mattino, tenendolo fuori dal primo consiglio del
 * pomeriggio.
 *
 * Il calendario non si salva: si ricalcola ogni volta dai consigli e dalle
 * impostazioni, così basta cambiare un docente o un orario e si aggiorna da
 * solo. Nel documento restano solo l'elenco dei consigli e la configurazione.
 */
import { useMemo, useState } from 'react';
import { buildXlsx } from './xlsxWriter';
import type { XlsxRow, XlsxSheet, XlsxStyle } from './xlsxWriter';

/* ------------------------------------------------------------------- tipi */

export interface SalaConsiglio {
  id: string;
  nome: string;
  /** id della sede, oppure null quando la sede è una sola */
  sedeId: string | null;
}

export interface ConsiglioClasse {
  id: string;
  /** id della classe, es. "1A" */
  classId: string;
  /** id dei docenti che compongono il consiglio */
  docentiIds: string[];
  /** sede in cui deve tenersi, oppure null = qualunque sala */
  sedeId?: string | null;
  /** true = tolto dalla generazione del calendario */
  disattivato?: boolean;
}

export interface ConsigliConfig {
  /** AAAA-MM-GG; vuota = oggi */
  data: string;
  /** HH:MM di inizio del primo consiglio */
  oraInizio: string;
  /** durata di un consiglio, in minuti */
  durataMin: number;
  /** pausa fra la fine di un consiglio e l'inizio del successivo */
  intervalloMin: number;
  /** le sale disponibili: quante ne servono, tanti consigli in contemporanea */
  sale: SalaConsiglio[];
  /** prova a lasciare la pausa pranzo a chi esce all'ultima ora del mattino */
  pausaPranzo: boolean;
  /** HH:MM da cui parte il pomeriggio */
  inizioPomeriggio: string;
  /** minuti di pausa pranzo da garantire */
  pausaPranzoMin: number;
  /**
   * Docenti "jolly": stanno in tante classi (religione, motoria, sostegno
   * itinerante) e se il calendario li tenesse per forza in un consiglio alla
   * volta diventerebbe una fila unica. Qui il loro incrocio è ignorato quando
   * l'app monta il calendario: compaiono in più consigli in parallelo e
   * l'app avvisa che per loro i turni vanno concordati a parte.
   */
  jollyIds: string[];
}

export const DEFAULT_CONSIGLI_CONFIG: ConsigliConfig = {
  data: '',
  oraInizio: '14:30',
  durataMin: 45,
  intervalloMin: 0,
  sale: [
    { id: 'sala-1', nome: 'Sala 1', sedeId: null },
    { id: 'sala-2', nome: 'Sala 2', sedeId: null },
  ],
  pausaPranzo: false,
  inizioPomeriggio: '14:30',
  pausaPranzoMin: 30,
  jollyIds: [],
};

/* ---------------------------------------------------------- normalizzatori */

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export const normalizeConsigli = (raw: any): ConsiglioClasse[] =>
  Array.isArray(raw)
    ? raw
        .filter((c) => c && typeof c.classId === 'string' && c.classId.trim())
        .map((c) => ({
          id: String(c.id || rid('cc')),
          classId: String(c.classId),
          docentiIds: Array.isArray(c.docentiIds)
            ? Array.from(new Set<string>(c.docentiIds.map(String)))
            : [],
          sedeId: c.sedeId ? String(c.sedeId) : null,
          disattivato: !!c.disattivato,
        }))
    : [];

export const normalizeConsigliConfig = (raw: any): ConsigliConfig => {
  const d = DEFAULT_CONSIGLI_CONFIG;
  const isHHMM = (v: any) => typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v);
  const saleRaw = Array.isArray(raw?.sale) && raw.sale.length ? raw.sale : d.sale;
  const sale: SalaConsiglio[] = saleRaw
    .filter((s: any) => s && (s.nome || s.id))
    .map((s: any, i: number) => ({
      id: String(s.id || `sala-${i + 1}`),
      nome: String(s.nome || `Sala ${i + 1}`),
      sedeId: s.sedeId ? String(s.sedeId) : null,
    }));
  return {
    data: typeof raw?.data === 'string' ? raw.data : d.data,
    oraInizio: isHHMM(raw?.oraInizio) ? raw.oraInizio : d.oraInizio,
    durataMin:
      Number(raw?.durataMin) > 0 ? Math.round(Number(raw.durataMin)) : d.durataMin,
    intervalloMin:
      Number(raw?.intervalloMin) >= 0
        ? Math.round(Number(raw.intervalloMin))
        : d.intervalloMin,
    sale: sale.length ? sale : d.sale,
    pausaPranzo: !!raw?.pausaPranzo,
    inizioPomeriggio: isHHMM(raw?.inizioPomeriggio)
      ? raw.inizioPomeriggio
      : d.inizioPomeriggio,
    pausaPranzoMin:
      Number(raw?.pausaPranzoMin) >= 0
        ? Math.round(Number(raw.pausaPranzoMin))
        : d.pausaPranzoMin,
    jollyIds: Array.isArray(raw?.jollyIds)
      ? Array.from(new Set<string>(raw.jollyIds.map(String)))
      : [],
  };
};

/* --------------------------------------------------------------- orologio */

const toMin = (v: string): number => {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(String(v || ''));
  if (!m) return 0;
  return Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2]));
};
const toHHMM = (min: number): string => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(
    2,
    '0'
  )}`;
};
/** AAAA-MM-GG → 0=Lun..5=Sab, -1 = domenica o data non valida */
const dayIndexOf = (dateStr: string): number => {
  const j = new Date(`${dateStr}T00:00:00`).getDay();
  return Number.isNaN(j) ? -1 : j === 0 ? -1 : j - 1;
};
const oggiISO = () => new Date().toISOString().slice(0, 10);
const fmtData = (s: string) => {
  const [y, m, d] = String(s).split('-');
  return y && m && d ? `${d}/${m}/${y}` : s;
};

/* ---------------------------------------------------------- pianificazione */

export interface RigaCalendario {
  consiglioId: string;
  classId: string;
  slotIndex: number;
  inizio: string;
  fine: string;
  salaId: string;
  salaNome: string;
  docentiIds: string[];
}

interface Pianificazione {
  righe: RigaCalendario[];
  orari: { index: number; inizio: string; fine: string }[];
  perDocente: {
    id: string;
    name: string;
    righe: RigaCalendario[];
    prima: string;
    ultima: string;
  }[];
  conflitti: string[];
  nonPiazzati: { classId: string; motivo: string }[];
  /** docenti jolly attesi in più consigli in parallelo: turni da concordare */
  avvisiJolly: string[];
}

/**
 * Assegnazione golosa: i consigli più numerosi vanno per primi, ognuno nel
 * primo slot e nella prima sala dove nessuno dei suoi docenti è già occupato.
 * Gli slot crescono all'infinito, quindi un consiglio resta fuori solo se ha
 * vincoli impossibili (nessun docente, o sede senza sale). I docenti jolly
 * non bloccano il parallelo: il loro incrocio è ignorato e segnalato a parte.
 */
const pianifica = (
  consigli: ConsiglioClasse[],
  config: ConsigliConfig,
  staffById: Map<string, any>,
  flaggati: Set<string>,
  sogliaPranzoMin: number
): Pianificazione => {
  const jolly = new Set(config.jollyIds || []);
  const nonPiazzati: { classId: string; motivo: string }[] = [];
  const coda = consigli
    .filter((c) => !c.disattivato)
    .map((c) => ({
      ...c,
      docentiIds: (c.docentiIds || []).filter((id) => staffById.has(id)),
    }));
  coda.forEach((c) => {
    if (c.docentiIds.length === 0)
      nonPiazzati.push({
        classId: c.classId,
        motivo: 'nessun docente nel consiglio',
      });
  });

  const sale = config.sale.length ? config.sale : DEFAULT_CONSIGLI_CONFIG.sale;
  const daPiazzare = coda
    .filter((c) => c.docentiIds.length > 0)
    .filter((c) => {
      if (c.sedeId && !sale.some((s) => s.sedeId === c.sedeId)) {
        nonPiazzati.push({
          classId: c.classId,
          motivo: 'nessuna sala nella sede scelta',
        });
        return false;
      }
      return true;
    })
    .sort(
      (a, b) =>
        b.docentiIds.length - a.docentiIds.length ||
        a.classId.localeCompare(b.classId, 'it', { numeric: true })
    );

  const passo = Math.max(5, config.durataMin + config.intervalloMin);
  const inizio = toMin(config.oraInizio);

  const teacherPerSlot = new Map<number, Set<string>>();
  const salePerSlot = new Map<number, Set<string>>();
  const righe: RigaCalendario[] = [];

  for (const c of daPiazzare) {
    const rispettaPranzo =
      config.pausaPranzo && c.docentiIds.some((id) => flaggati.has(id));
    let piazzato = false;
    for (let si = 0; si < 240 && !piazzato; si++) {
      const startMin = inizio + si * passo;
      if (rispettaPranzo && startMin < sogliaPranzoMin) continue;
      const occ = teacherPerSlot.get(si) || new Set<string>();
      if (c.docentiIds.some((id) => !jolly.has(id) && occ.has(id))) continue;
      const saleUsate = salePerSlot.get(si) || new Set<string>();
      const sala = sale.find(
        (s) => !saleUsate.has(s.id) && (!c.sedeId || s.sedeId === c.sedeId)
      );
      if (!sala) continue;
      righe.push({
        consiglioId: c.id,
        classId: c.classId,
        slotIndex: si,
        inizio: toHHMM(startMin),
        fine: toHHMM(startMin + config.durataMin),
        salaId: sala.id,
        salaNome: sala.nome,
        docentiIds: c.docentiIds,
      });
      c.docentiIds.forEach((id) => {
        if (!jolly.has(id)) occ.add(id);
      });
      teacherPerSlot.set(si, occ);
      saleUsate.add(sala.id);
      salePerSlot.set(si, saleUsate);
      piazzato = true;
    }
    if (!piazzato)
      nonPiazzati.push({
        classId: c.classId,
        motivo:
          'nessuno slot libero: troppi consigli insieme o troppi docenti in comune',
      });
  }

  const maxSlot = righe.reduce((m, r) => Math.max(m, r.slotIndex), -1);
  const orari: { index: number; inizio: string; fine: string }[] = [];
  for (let si = 0; si <= maxSlot; si++) {
    const s = inizio + si * passo;
    orari.push({ index: si, inizio: toHHMM(s), fine: toHHMM(s + config.durataMin) });
  }

  const mapT = new Map<string, RigaCalendario[]>();
  righe.forEach((r) =>
    r.docentiIds.forEach((id) => {
      const arr = mapT.get(id) || [];
      arr.push(r);
      mapT.set(id, arr);
    })
  );
  const perDocente = Array.from(mapT.entries())
    .map(([id, arr]) => {
      arr.sort((a, b) => a.slotIndex - b.slotIndex);
      return {
        id,
        name: staffById.get(id)?.name || id,
        righe: arr,
        prima: arr[0]?.inizio || '',
        ultima: arr[arr.length - 1]?.fine || '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));

  const conflitti: string[] = [];
  const avvisiJolly: string[] = [];
  perDocente.forEach((d) => {
    const perSlot = new Map<number, number>();
    d.righe.forEach((r) =>
      perSlot.set(r.slotIndex, (perSlot.get(r.slotIndex) || 0) + 1)
    );
    perSlot.forEach((n, si) => {
      if (n < 2) return;
      const ora = d.righe.find((r) => r.slotIndex === si)?.inizio || '';
      if (jolly.has(d.id))
        avvisiJolly.push(
          `${d.name}: ${n} consigli in parallelo alle ${ora}, turni da concordare`
        );
      else conflitti.push(`${d.name}: ${n} consigli alle ${ora}`);
    });
  });

  return { righe, orari, perDocente, conflitti, nonPiazzati, avvisiJolly };
};

/* --------------------------------------------------------------- componente */

interface Props {
  /** classi attive dell'istituto, es. [{ id: '1A', year: 1, section: 'A' }] */
  classi: { id: string; year: number; section: string }[];
  /** tutti i docenti (materia, sostegno, strumento) con le loro assegnazioni */
  staff: any[];
  /** sedi dell'istituto */
  sedi: { id: string; name: string }[];
  /** orario generato, per capire chi esce all'ultima ora del mattino */
  timetable: any[];
  /** ore del mattino della griglia */
  diurnalHours: any[];
  /** nomi dei giorni, 0 = lunedì */
  giorni: string[];
  consigli: ConsiglioClasse[];
  config: ConsigliConfig;
  onChange: (next: {
    consigli?: ConsiglioClasse[];
    config?: ConsigliConfig;
  }) => void;
}

const inputCls =
  'border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700';

export default function ConsigliClasse({
  classi,
  staff,
  sedi,
  timetable,
  diurnalHours,
  giorni,
  consigli,
  config,
  onChange,
}: Props) {
  const [subTab, setSubTab] = useState<'classi' | 'calendario' | 'docenti'>(
    'classi'
  );
  const [apriId, setApriId] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState('');
  const [nuovoDoc, setNuovoDoc] = useState<Record<string, string>>({});
  const [nuovoJolly, setNuovoJolly] = useState('');

  const multiSede = sedi.length > 1;

  const staffById = useMemo(() => {
    const m = new Map<string, any>();
    staff.forEach((s) => m.set(String(s.id), s));
    return m;
  }, [staff]);

  const dataEff = config.data || oggiISO();
  const weekday = dayIndexOf(dataEff);

  const ultimaOraMattino = useMemo(() => {
    const idx = (diurnalHours || []).map((h: any) => Number(h.index));
    return idx.length ? Math.max(...idx) : -1;
  }, [diurnalHours]);

  const flaggati = useMemo(() => {
    const set = new Set<string>();
    if (config.pausaPranzo && weekday >= 0 && ultimaOraMattino >= 0) {
      timetable.forEach((s: any) => {
        if (
          Number(s.day) === weekday &&
          Number(s.hour) === ultimaOraMattino &&
          s.teacherId
        )
          set.add(String(s.teacherId));
      });
    }
    return set;
  }, [config.pausaPranzo, weekday, ultimaOraMattino, timetable]);

  const sogliaPranzoMin =
    toMin(config.inizioPomeriggio) + Math.max(0, config.pausaPranzoMin);

  const piano = useMemo(
    () =>
      pianifica(
        consigli,
        { ...config, data: dataEff },
        staffById,
        flaggati,
        sogliaPranzoMin
      ),
    [consigli, config, dataEff, staffById, flaggati, sogliaPranzoMin]
  );

  const sedeNome = (sedeId: string | null | undefined) =>
    sedeId ? sedi.find((s) => s.id === sedeId)?.name || '' : '';

  const docentiSuggeriti = (classId: string): string[] =>
    staff
      .filter(
        (s) =>
          Array.isArray(s.assignments) &&
          s.assignments.some((a: any) => a.classId === classId)
      )
      .map((s) => String(s.id));

  /* --- scritture --- */
  const setConfig = (patch: Partial<ConsigliConfig>) =>
    onChange({ config: { ...config, data: dataEff, ...patch } });
  const setConsigli = (next: ConsiglioClasse[]) => onChange({ consigli: next });

  const aggiungiConsiglio = (classId: string) => {
    if (consigli.some((c) => c.classId === classId)) return;
    setConsigli([
      ...consigli,
      { id: rid('cc'), classId, docentiIds: docentiSuggeriti(classId), sedeId: null },
    ]);
    setApriId(classId);
  };
  const aggiungiTutte = () => {
    const mancanti = classi
      .filter((c) => !consigli.some((x) => x.classId === c.id))
      .map((c) => ({
        id: rid('cc'),
        classId: c.id,
        docentiIds: docentiSuggeriti(c.id),
        sedeId: null,
      }));
    if (mancanti.length) setConsigli([...consigli, ...mancanti]);
  };
  const rimuoviConsiglio = (id: string) =>
    setConsigli(consigli.filter((c) => c.id !== id));
  const patchConsiglio = (id: string, patch: Partial<ConsiglioClasse>) =>
    setConsigli(consigli.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const togliDocente = (id: string, docId: string) => {
    const c = consigli.find((x) => x.id === id);
    if (c)
      patchConsiglio(id, {
        docentiIds: c.docentiIds.filter((d) => d !== docId),
      });
  };
  const aggiungiDocente = (id: string, docId: string) => {
    if (!docId) return;
    const c = consigli.find((x) => x.id === id);
    if (c && !c.docentiIds.includes(docId))
      patchConsiglio(id, { docentiIds: [...c.docentiIds, docId] });
    setNuovoDoc((p) => ({ ...p, [id]: '' }));
  };

  const setSala = (i: number, patch: Partial<SalaConsiglio>) =>
    setConfig({
      sale: config.sale.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    });
  const aggiungiSala = () =>
    setConfig({
      sale: [
        ...config.sale,
        { id: rid('sala'), nome: `Sala ${config.sale.length + 1}`, sedeId: null },
      ],
    });
  const rimuoviSala = (i: number) => {
    if (config.sale.length <= 1) return;
    setConfig({ sale: config.sale.filter((_, idx) => idx !== i) });
  };

  const aggiungiJolly = (docId: string) => {
    if (!docId || config.jollyIds.includes(docId)) return;
    setConfig({ jollyIds: [...config.jollyIds, docId] });
    setNuovoJolly('');
  };
  const togliJolly = (docId: string) =>
    setConfig({ jollyIds: config.jollyIds.filter((id) => id !== docId) });

  const stampa = () => window.print();

  const esportaExcel = () => {
    const stili: Record<string, XlsxStyle> = {
      titolo: { bold: true, size: 14, color: '#13233C' },
      intestazione: {
        bold: true,
        color: '#FFFFFF',
        fill: '#195275',
        align: 'center',
        border: true,
      },
      cella: { border: true },
      centro: { border: true, align: 'center' },
    };

    const rCal: XlsxRow[] = [
      {
        cells: [
          {
            value: `Consigli di classe · ${fmtData(dataEff)}`,
            style: 'titolo',
            mergeAcross: 4,
          },
        ],
      },
      { cells: [] },
      {
        cells: [
          { value: 'Orario', style: 'intestazione' },
          { value: 'Sala', style: 'intestazione' },
          { value: 'Sede', style: 'intestazione' },
          { value: 'Classe', style: 'intestazione' },
          { value: 'Docenti', style: 'intestazione' },
        ],
      },
    ];
    piano.righe
      .slice()
      .sort(
        (a, b) =>
          a.slotIndex - b.slotIndex || a.salaNome.localeCompare(b.salaNome)
      )
      .forEach((r) => {
        const sala = config.sale.find((s) => s.id === r.salaId);
        rCal.push({
          cells: [
            { value: `${r.inizio} - ${r.fine}`, style: 'centro' },
            { value: r.salaNome, style: 'cella' },
            { value: sedeNome(sala?.sedeId) || '—', style: 'cella' },
            { value: r.classId, style: 'centro' },
            {
              value: r.docentiIds
                .map((id) => staffById.get(id)?.name || id)
                .join(', '),
              style: 'cella',
            },
          ],
        });
      });

    const rDoc: XlsxRow[] = [
      {
        cells: [
          { value: 'Impegni per docente', style: 'titolo', mergeAcross: 3 },
        ],
      },
      { cells: [] },
      {
        cells: [
          { value: 'Docente', style: 'intestazione' },
          { value: 'Orario', style: 'intestazione' },
          { value: 'Classe', style: 'intestazione' },
          { value: 'Sala', style: 'intestazione' },
        ],
      },
    ];
    piano.perDocente.forEach((d) => {
      d.righe.forEach((r, i) => {
        rDoc.push({
          cells: [
            { value: i === 0 ? d.name : '', style: 'cella' },
            { value: `${r.inizio} - ${r.fine}`, style: 'centro' },
            { value: r.classId, style: 'centro' },
            { value: r.salaNome, style: 'cella' },
          ],
        });
      });
    });

    const sheets: XlsxSheet[] = [
      { name: 'Calendario', colWidthsPx: [110, 90, 140, 70, 420], rows: rCal },
      { name: 'Per docente', colWidthsPx: [200, 110, 70, 90], rows: rDoc },
    ];

    const bytes = buildXlsx(sheets, stili);
    const blob = new Blob([bytes as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consigli-di-classe-${dataEff}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* --- pezzi di interfaccia --- */

  const tabBtn = (key: 'classi' | 'calendario' | 'docenti', label: string) => (
    <button
      onClick={() => setSubTab(key)}
      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
        subTab === key
          ? 'bg-brand-600 text-white shadow-sm'
          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );

  const nConsigliAttivi = consigli.filter((c) => !c.disattivato).length;
  const rigaPerSlotSala = (slotIndex: number, salaId: string) =>
    piano.righe.find((r) => r.slotIndex === slotIndex && r.salaId === salaId);

  return (
    <div className="space-y-5">
      {/* intestazione */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              🧑‍🏫 Consigli di classe
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Scegli le classi: per ognuna l&apos;elenco dei docenti si riempie
              da solo dalle cattedre. L&apos;app monta il calendario mettendo più
              consigli in contemporanea, uno per sala, senza mai mettere lo
              stesso docente in due riunioni nello stesso orario.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={esportaExcel}
              className="bg-salvia-600 hover:bg-salvia-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
            >
              Esporta Excel 📊
            </button>
            <button
              onClick={stampa}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
            >
              Stampa 🖨️
            </button>
          </div>
        </div>

        {/* impostazioni */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-slate-500 flex flex-col gap-1">
            Giorno
            <input
              type="date"
              value={dataEff}
              onChange={(e) => setConfig({ data: e.target.value })}
              className={inputCls}
            />
            <span className="font-semibold text-slate-400">
              {weekday >= 0 ? giorni[weekday]?.toLowerCase() : 'scegli un giorno feriale'}
            </span>
          </label>
          <label className="text-xs font-bold text-slate-500 flex flex-col gap-1">
            Ora inizio
            <input
              type="time"
              value={config.oraInizio}
              onChange={(e) => setConfig({ oraInizio: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="text-xs font-bold text-slate-500 flex flex-col gap-1">
            Durata (min)
            <input
              type="number"
              min={5}
              step={5}
              value={config.durataMin}
              onChange={(e) =>
                setConfig({
                  durataMin: Math.max(5, Number(e.target.value) || 5),
                })
              }
              className={inputCls}
            />
          </label>
          <label className="text-xs font-bold text-slate-500 flex flex-col gap-1">
            Pausa tra consigli (min)
            <input
              type="number"
              min={0}
              step={5}
              value={config.intervalloMin}
              onChange={(e) =>
                setConfig({
                  intervalloMin: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className={inputCls}
            />
          </label>
        </div>

        {/* sale */}
        <div className="mt-4">
          <div className="text-xs font-bold text-slate-500 mb-2">
            Sale in contemporanea ({config.sale.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {config.sale.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
              >
                <input
                  value={s.nome}
                  onChange={(e) => setSala(i, { nome: e.target.value })}
                  className="w-24 bg-transparent text-sm font-semibold text-slate-700 outline-none"
                />
                {multiSede && (
                  <select
                    value={s.sedeId || ''}
                    onChange={(e) =>
                      setSala(i, { sedeId: e.target.value || null })
                    }
                    className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded px-1 py-1"
                  >
                    <option value="">Sede —</option>
                    {sedi.map((sede) => (
                      <option key={sede.id} value={sede.id}>
                        {sede.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => rimuoviSala(i)}
                  disabled={config.sale.length <= 1}
                  className="text-slate-400 hover:text-fucsia-600 disabled:opacity-30 text-lg leading-none"
                  title="Togli sala"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={aggiungiSala}
              className="bg-white border border-dashed border-slate-300 hover:border-brand-400 text-slate-500 rounded-lg px-3 py-1.5 text-sm font-bold"
            >
              + Sala
            </button>
          </div>
        </div>

        {/* pausa pranzo */}
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={config.pausaPranzo}
              onChange={(e) => setConfig({ pausaPranzo: e.target.checked })}
            />
            Lascia la pausa pranzo a chi esce all&apos;ultima ora del mattino
          </label>
          {config.pausaPranzo && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
              <label className="flex items-center gap-1.5">
                Pomeriggio dalle
                <input
                  type="time"
                  value={config.inizioPomeriggio}
                  onChange={(e) =>
                    setConfig({ inizioPomeriggio: e.target.value })
                  }
                  className={inputCls}
                />
              </label>
              <label className="flex items-center gap-1.5">
                Minuti di pausa
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={config.pausaPranzoMin}
                  onChange={(e) =>
                    setConfig({
                      pausaPranzoMin: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className={`${inputCls} w-20`}
                />
              </label>
              <span className="font-semibold text-slate-400">
                {timetable.length === 0
                  ? 'orario non ancora generato: nessun docente segnato in uscita'
                  : `${flaggati.size} docenti escono all'ultima ora del mattino di ${
                      weekday >= 0 ? giorni[weekday]?.toLowerCase() : '—'
                    }`}
              </span>
            </div>
          )}
        </div>

        {/* docenti jolly */}
        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="text-sm font-bold text-slate-700">
            Docenti in più consigli (non bloccano il parallelo)
          </div>
          <p className="text-xs text-slate-500 mt-0.5 mb-2 max-w-2xl">
            Religione, motoria, sostegno itinerante: stanno in tante classi. Se
            devono per forza fare un consiglio alla volta, il calendario diventa
            una fila unica. Mettili qui: l&apos;app li fa comparire in più
            consigli in parallelo e segnala che per loro i turni vanno
            concordati a parte.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {config.jollyIds
              .map((id) => staffById.get(id))
              .filter(Boolean)
              .map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 bg-bruciato-50 border border-bruciato-200 text-bruciato-800 rounded-full pl-2 pr-1 py-0.5 text-xs font-semibold"
                >
                  {s.name}
                  <button
                    onClick={() => togliJolly(String(s.id))}
                    className="text-bruciato-400 hover:text-fucsia-600 text-sm leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            {config.jollyIds.length === 0 && (
              <span className="text-xs text-slate-400 font-semibold">
                nessuno: tutti i docenti bloccano il parallelo
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={nuovoJolly}
              onChange={(e) => setNuovoJolly(e.target.value)}
              className={inputCls}
            >
              <option value="">+ aggiungi docente jolly…</option>
              {staff
                .filter((s) => !config.jollyIds.includes(String(s.id)))
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, 'it'))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.subject}
                  </option>
                ))}
            </select>
            <button
              onClick={() => aggiungiJolly(nuovoJolly)}
              className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold"
            >
              Aggiungi
            </button>
          </div>
        </div>

        {/* avvisi */}
        {piano.conflitti.length > 0 && (
          <div className="mt-4 bg-fucsia-50 border border-fucsia-200 rounded-lg p-3 text-sm text-fucsia-800">
            <span className="font-bold">Conflitti:</span>{' '}
            {piano.conflitti.join(' · ')}
          </div>
        )}
        {piano.nonPiazzati.length > 0 && (
          <div className="mt-3 bg-bruciato-50 border border-bruciato-200 rounded-lg p-3 text-sm text-bruciato-800">
            <span className="font-bold">
              {piano.nonPiazzati.length}{' '}
              {piano.nonPiazzati.length === 1
                ? 'consiglio non collocato'
                : 'consigli non collocati'}
              :
            </span>{' '}
            {piano.nonPiazzati
              .map((n) => `${n.classId} (${n.motivo})`)
              .join(' · ')}
          </div>
        )}
        {piano.avvisiJolly.length > 0 && (
          <div className="mt-3 bg-brand-50 border border-brand-200 rounded-lg p-3 text-sm text-brand-800">
            <span className="font-bold">Turni da concordare:</span>{' '}
            {piano.avvisiJolly.join(' · ')}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {tabBtn('classi', `📋 Classi e docenti (${nConsigliAttivi})`)}
          {tabBtn('calendario', `📅 Calendario (${piano.righe.length})`)}
          {tabBtn('docenti', `👤 Per docente (${piano.perDocente.length})`)}
        </div>
      </div>

      {/* --- CLASSI E DOCENTI --- */}
      {subTab === 'classi' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-500">
              {consigli.length} consigli su {classi.length} classi
            </div>
            <button
              onClick={aggiungiTutte}
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
            >
              + Crea un consiglio per ogni classe
            </button>
          </div>

          {classi.length === 0 && (
            <p className="text-sm text-slate-400">
              Non ci sono classi configurate. Aggiungile dalla scheda Cattedre.
            </p>
          )}

          <div className="space-y-2">
            {classi.map((cl) => {
              const c = consigli.find((x) => x.classId === cl.id);
              if (!c)
                return (
                  <div
                    key={cl.id}
                    className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2"
                  >
                    <span className="font-bold text-slate-700">{cl.id}</span>
                    <button
                      onClick={() => aggiungiConsiglio(cl.id)}
                      className="text-sm font-bold text-brand-600 hover:text-brand-700"
                    >
                      + aggiungi consiglio
                    </button>
                  </div>
                );
              const aperto = apriId === cl.id;
              const nomi = c.docentiIds
                .map((id) => staffById.get(id))
                .filter(Boolean);
              const disponibili = staff
                .filter((s) => !c.docentiIds.includes(String(s.id)))
                .sort((a, b) => a.name.localeCompare(b.name, 'it'));
              return (
                <div
                  key={cl.id}
                  className={`border rounded-lg ${
                    c.disattivato
                      ? 'border-slate-100 opacity-60'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between px-3 py-2">
                    <button
                      onClick={() => setApriId(aperto ? null : cl.id)}
                      className="flex items-center gap-2 font-bold text-slate-700"
                    >
                      <span className="text-slate-400">{aperto ? '▾' : '▸'}</span>
                      {cl.id}
                      <span className="text-xs font-semibold text-slate-400">
                        {c.docentiIds.length} docenti
                      </span>
                      {c.sedeId && (
                        <span className="text-xs font-semibold text-brand-600">
                          📍 {sedeNome(c.sedeId)}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-xs font-bold text-slate-500">
                        <input
                          type="checkbox"
                          checked={!c.disattivato}
                          onChange={(e) =>
                            patchConsiglio(c.id, {
                              disattivato: !e.target.checked,
                            })
                          }
                        />
                        attivo
                      </label>
                      <button
                        onClick={() => rimuoviConsiglio(c.id)}
                        className="text-slate-400 hover:text-fucsia-600 text-lg leading-none"
                        title="Elimina consiglio"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {aperto && (
                    <div className="px-3 pb-3 space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {nomi.length === 0 && (
                          <span className="text-xs text-bruciato-700 font-semibold">
                            nessun docente: il consiglio resta fuori dal
                            calendario
                          </span>
                        )}
                        {nomi.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1 bg-brand-50 border border-brand-200 text-brand-800 rounded-full pl-2 pr-1 py-0.5 text-xs font-semibold"
                          >
                            {s.name}
                            <button
                              onClick={() =>
                                togliDocente(c.id, String(s.id))
                              }
                              className="text-brand-400 hover:text-fucsia-600 text-sm leading-none"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={nuovoDoc[c.id] || ''}
                          onChange={(e) =>
                            setNuovoDoc((p) => ({
                              ...p,
                              [c.id]: e.target.value,
                            }))
                          }
                          className={inputCls}
                        >
                          <option value="">+ aggiungi docente…</option>
                          {disponibili.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} · {s.subject}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() =>
                            aggiungiDocente(c.id, nuovoDoc[c.id] || '')
                          }
                          className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold"
                        >
                          Aggiungi
                        </button>
                        <button
                          onClick={() =>
                            patchConsiglio(c.id, {
                              docentiIds: docentiSuggeriti(cl.id),
                            })
                          }
                          className="text-xs font-bold text-slate-500 hover:text-brand-600"
                        >
                          rimetti quelli delle cattedre
                        </button>
                        {multiSede && (
                          <select
                            value={c.sedeId || ''}
                            onChange={(e) =>
                              patchConsiglio(c.id, {
                                sedeId: e.target.value || null,
                              })
                            }
                            className={inputCls}
                          >
                            <option value="">sede: qualunque</option>
                            {sedi.map((sede) => (
                              <option key={sede.id} value={sede.id}>
                                sede: {sede.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- CALENDARIO --- */}
      {subTab === 'calendario' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          {piano.righe.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nessun consiglio da collocare. Crea i consigli nella scheda
              «Classi e docenti».
            </p>
          ) : (
            <>
              <div className="text-sm text-slate-500 mb-3">
                {piano.righe.length} consigli · {config.sale.length} sale · dalle{' '}
                {piano.orari[0]?.inizio} alle{' '}
                {piano.orari[piano.orari.length - 1]?.fine} ·{' '}
                {fmtData(dataEff)}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-bold text-slate-600">
                        Orario
                      </th>
                      {config.sale.map((s) => (
                        <th
                          key={s.id}
                          className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-bold text-slate-600"
                        >
                          {s.nome}
                          {s.sedeId && (
                            <span className="block text-xs font-semibold text-slate-400">
                              📍 {sedeNome(s.sedeId)}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {piano.orari.map((o) => (
                      <tr key={o.index}>
                        <td className="border border-slate-200 px-3 py-2 font-bold text-slate-500 whitespace-nowrap align-top">
                          {o.inizio} – {o.fine}
                        </td>
                        {config.sale.map((s) => {
                          const r = rigaPerSlotSala(o.index, s.id);
                          return (
                            <td
                              key={s.id}
                              className="border border-slate-200 px-3 py-2 align-top"
                            >
                              {r ? (
                                <div>
                                  <div className="font-black text-slate-800">
                                    {r.classId}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {r.docentiIds.length} docenti
                                  </div>
                                  <div className="text-xs text-slate-400 mt-0.5">
                                    {r.docentiIds
                                      .map(
                                        (id) =>
                                          staffById.get(id)?.name || id
                                      )
                                      .join(', ')}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- PER DOCENTE --- */}
      {subTab === 'docenti' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <input
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca un docente…"
            className={`${inputCls} w-full sm:w-72 mb-3`}
          />
          {piano.perDocente.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nessun impegno: crea i consigli e collócali nel calendario.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-bold text-slate-600">
                      Docente
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-bold text-slate-600">
                      Consigli
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-bold text-slate-600">
                      Impegni
                    </th>
                    <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-bold text-slate-600">
                      Dalle – alle
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {piano.perDocente
                    .filter((d) =>
                      ricerca.trim()
                        ? d.name
                            .toLowerCase()
                            .includes(ricerca.toLowerCase())
                        : true
                    )
                    .map((d) => (
                      <tr key={d.id}>
                        <td className="border border-slate-200 px-3 py-2 font-bold text-slate-700 whitespace-nowrap">
                          {d.name}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-500">
                          {d.righe.length}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-slate-600">
                          {d.righe
                            .map(
                              (r) =>
                                `${r.inizio} ${r.classId} · ${r.salaNome}`
                            )
                            .join('  |  ')}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 whitespace-nowrap text-slate-500">
                          {d.prima} – {d.ultima}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
