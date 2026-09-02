/**
 * Consigli di classe: da un elenco di classi e dai docenti già assegnati,
 * costruisce il calendario delle riunioni mettendone più d'una in
 * contemporanea, senza mai mettere lo stesso docente in due consigli nello
 * stesso momento. Gestisce più sale, anche in sedi diverse, e — se l'orario
 * scolastico è già stato generato — prova a lasciare la pausa pranzo a chi ha
 * fatto l'ultima ora del mattino, tenendolo fuori dal primo consiglio del
 * pomeriggio.
 *
 * Le riunioni restano dentro la fascia oraria scelta (dalle… alle…): quando un
 * pomeriggio è pieno si passa al giorno feriale successivo, fino al numero di
 * pomeriggi indicato. Quello che non entra viene segnalato come non collocato,
 * invece di finire di notte.
 *
 * Il calendario non si salva: si ricalcola ogni volta dai consigli e dalle
 * impostazioni, così basta cambiare un docente o un orario e si aggiorna da
 * solo. Nel documento restano solo l'elenco dei consigli e la configurazione.
 */
import { useMemo, useState } from 'react';
import ImportaDocenti from './ImportaDocenti';
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
  /** HH:MM entro cui deve finire l'ultimo consiglio della giornata */
  oraFine: string;
  /** durata di un consiglio, in minuti */
  durataMin: number;
  /** pausa fra la fine di un consiglio e l'inizio del successivo */
  intervalloMin: number;
  /**
   * Quanti pomeriggi si possono usare, a partire dalla data scelta. Quello che
   * non entra nella fascia oraria di un giorno passa al giorno dopo.
   */
  giorniTotali: number;
  /** true = si può usare anche il sabato; la domenica è sempre esclusa */
  includiSabato: boolean;
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
  oraFine: '19:00',
  durataMin: 45,
  intervalloMin: 0,
  giorniTotali: 3,
  includiSabato: false,
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
    oraFine: isHHMM(raw?.oraFine) ? raw.oraFine : d.oraFine,
    durataMin:
      Number(raw?.durataMin) > 0 ? Math.round(Number(raw.durataMin)) : d.durataMin,
    intervalloMin:
      Number(raw?.intervalloMin) >= 0
        ? Math.round(Number(raw.intervalloMin))
        : d.intervalloMin,
    giorniTotali:
      Number(raw?.giorniTotali) > 0
        ? Math.min(30, Math.round(Number(raw.giorniTotali)))
        : d.giorniTotali,
    includiSabato: !!raw?.includiSabato,
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
const isData = (s: string) => !Number.isNaN(new Date(`${s}T00:00:00`).getTime());
/** AAAA-MM-GG + n giorni, restando sul calendario locale */
const piuGiorni = (dateStr: string, n: number): string => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  const p = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/**
 * Le date su cui spalmare i consigli: si parte dal giorno scelto e si vanno a
 * prendere i giorni successivi, saltando la domenica (e il sabato, se non è
 * stato acceso). Serve perché in una sola fascia pomeridiana i consigli non ci
 * stanno quasi mai: quello che avanza va al giorno dopo, non a notte fonda.
 */
const giorniDisponibili = (
  da: string,
  quanti: number,
  includiSabato: boolean
): string[] => {
  const partenza = isData(da) ? da : oggiISO();
  const out: string[] = [];
  for (let i = 0; out.length < Math.max(1, quanti) && i < 90; i++) {
    const g = piuGiorni(partenza, i);
    const wd = new Date(`${g}T00:00:00`).getDay();
    if (wd !== 0 && (includiSabato || wd !== 6)) out.push(g);
  }
  return out;
};

/* ---------------------------------------------------------- pianificazione */

/**
 * Quante riunioni entrano in un pomeriggio: l'ultima deve finire entro l'ora
 * di fine. Se la fascia è più corta di un consiglio ne resta comunque uno,
 * altrimenti il calendario non partirebbe mai.
 */
const slotAlGiorno = (config: ConsigliConfig): number => {
  const passo = Math.max(5, config.durataMin + config.intervalloMin);
  const inizio = toMin(config.oraInizio);
  const fine = toMin(config.oraFine);
  const fascia = fine > inizio ? fine - inizio : config.durataMin;
  return Math.max(1, Math.floor((fascia - config.durataMin) / passo) + 1);
};

export interface RigaCalendario {
  consiglioId: string;
  classId: string;
  /** posizione nella fila di tutti gli slot, giorno per giorno */
  slotIndex: number;
  /** 0 = primo giorno del calendario */
  giorno: number;
  /** AAAA-MM-GG del giorno in cui cade la riunione */
  data: string;
  inizio: string;
  fine: string;
  salaId: string;
  salaNome: string;
  docentiIds: string[];
}

interface SlotOrario {
  index: number;
  giorno: number;
  data: string;
  inizio: string;
  fine: string;
}

interface Pianificazione {
  righe: RigaCalendario[];
  orari: SlotOrario[];
  /** gli slot raggruppati per giornata, per stampare una tabella per giorno */
  giornate: { giorno: number; data: string; orari: SlotOrario[] }[];
  perDocente: {
    id: string;
    name: string;
    righe: RigaCalendario[];
    prima: string;
    ultima: string;
    /** date in cui il docente è impegnato */
    date: string[];
  }[];
  conflitti: string[];
  nonPiazzati: { classId: string; motivo: string }[];
  /** docenti jolly attesi in più consigli in parallelo: turni da concordare */
  avvisiJolly: string[];
}

/**
 * Assegnazione golosa: i consigli più numerosi vanno per primi, ognuno nel
 * primo slot e nella prima sala dove nessuno dei suoi docenti è già occupato.
 * Gli slot stanno dentro la fascia oraria del pomeriggio (dall'ora di inizio
 * all'ora di fine) e, quando la giornata è piena, si passa al giorno dopo:
 * nessuna riunione finisce di sera tardi o di notte. Se i giorni a
 * disposizione non bastano, i consigli che avanzano restano fuori e l'app lo
 * dice. I docenti jolly non bloccano il parallelo: il loro incrocio è
 * ignorato e segnalato a parte.
 */
const pianifica = (
  consigli: ConsiglioClasse[],
  config: ConsigliConfig,
  staffById: Map<string, any>,
  flaggatiPerWeekday: Map<number, Set<string>>,
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
  const slotPerGiorno = slotAlGiorno(config);
  const date = giorniDisponibili(
    config.data,
    config.giorniTotali,
    config.includiSabato
  );
  const totaleSlot = date.length * slotPerGiorno;

  const teacherPerSlot = new Map<number, Set<string>>();
  const salePerSlot = new Map<number, Set<string>>();
  const righe: RigaCalendario[] = [];

  for (const c of daPiazzare) {
    let piazzato = false;
    for (let si = 0; si < totaleSlot && !piazzato; si++) {
      const giorno = Math.floor(si / slotPerGiorno);
      const startMin = inizio + (si % slotPerGiorno) * passo;
      const flaggati =
        flaggatiPerWeekday.get(dayIndexOf(date[giorno])) || new Set<string>();
      const rispettaPranzo =
        config.pausaPranzo && c.docentiIds.some((id) => flaggati.has(id));
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
        giorno,
        data: date[giorno],
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
          'spazio finito: aggiungi giorni o sale, allunga la fascia oraria o accorcia i consigli',
      });
  }

  /* la griglia da stampare: solo le giornate e gli slot davvero usati */
  const ultimoPerGiorno = new Map<number, number>();
  righe.forEach((r) => {
    const idx = r.slotIndex % slotPerGiorno;
    ultimoPerGiorno.set(r.giorno, Math.max(ultimoPerGiorno.get(r.giorno) ?? 0, idx));
  });
  const orari: SlotOrario[] = [];
  const giornate: { giorno: number; data: string; orari: SlotOrario[] }[] = [];
  Array.from(ultimoPerGiorno.keys())
    .sort((a, b) => a - b)
    .forEach((g) => {
      const suoi: SlotOrario[] = [];
      for (let i = 0; i <= (ultimoPerGiorno.get(g) ?? 0); i++) {
        const s = inizio + i * passo;
        suoi.push({
          index: g * slotPerGiorno + i,
          giorno: g,
          data: date[g],
          inizio: toHHMM(s),
          fine: toHHMM(s + config.durataMin),
        });
      }
      orari.push(...suoi);
      giornate.push({ giorno: g, data: date[g], orari: suoi });
    });

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
        date: Array.from(new Set(arr.map((r) => r.data))),
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
      const r = d.righe.find((x) => x.slotIndex === si);
      const quando = `${r?.inizio || ''} del ${fmtData(r?.data || '')}`;
      if (jolly.has(d.id))
        avvisiJolly.push(
          `${d.name}: ${n} consigli in parallelo alle ${quando}, turni da concordare`
        );
      else conflitti.push(`${d.name}: ${n} consigli alle ${quando}`);
    });
  });

  return {
    righe,
    orari,
    giornate,
    perDocente,
    conflitti,
    nonPiazzati,
    avvisiJolly,
  };
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
  /**
   * Riceve il risultato dell'import da PDF: i consigli già uniti a quelli che
   * c'erano, e i docenti che nell'app non esistevano e vanno creati. Sono due
   * scritture diverse (i consigli e il registro dei docenti) e devono partire
   * insieme, per questo non passano dal solito `onChange`. Se manca, il
   * pulsante «Importa da PDF» non compare.
   */
  onImporta?: (
    nuoviDocenti: { id: string; name: string }[],
    nuoviConsigli: ConsiglioClasse[]
  ) => void;
  /** In sola lettura non si importa niente. */
  readOnly?: boolean;
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
  onImporta,
  readOnly,
}: Props) {
  const [subTab, setSubTab] = useState<'classi' | 'calendario' | 'docenti'>(
    'classi'
  );
  const [apriId, setApriId] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState('');
  const [nuovoDoc, setNuovoDoc] = useState<Record<string, string>>({});
  const [nuovoJolly, setNuovoJolly] = useState('');
  const [importaAperto, setImportaAperto] = useState(false);

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

  /**
   * Chi esce all'ultima ora del mattino, giorno per giorno: il calendario può
   * occupare più pomeriggi e ogni giorno ha i suoi docenti in uscita.
   */
  const flaggatiPerWeekday = useMemo(() => {
    const m = new Map<number, Set<string>>();
    if (config.pausaPranzo && ultimaOraMattino >= 0) {
      timetable.forEach((s: any) => {
        if (Number(s.hour) !== ultimaOraMattino || !s.teacherId) return;
        const g = Number(s.day);
        if (!Number.isFinite(g)) return;
        const set = m.get(g) || new Set<string>();
        set.add(String(s.teacherId));
        m.set(g, set);
      });
    }
    return m;
  }, [config.pausaPranzo, ultimaOraMattino, timetable]);

  const flaggati = flaggatiPerWeekday.get(weekday) || new Set<string>();

  const sogliaPranzoMin =
    toMin(config.inizioPomeriggio) + Math.max(0, config.pausaPranzoMin);

  const piano = useMemo(
    () =>
      pianifica(
        consigli,
        { ...config, data: dataEff },
        staffById,
        flaggatiPerWeekday,
        sogliaPranzoMin
      ),
    [consigli, config, dataEff, staffById, flaggatiPerWeekday, sogliaPranzoMin]
  );

  const slotPerGiornoUI = slotAlGiorno(config);

  /** «12/09/2026» oppure «dal 12/09/2026 al 15/09/2026» */
  const periodoTesto =
    piano.giornate.length > 1
      ? `dal ${fmtData(piano.giornate[0].data)} al ${fmtData(
          piano.giornate[piano.giornate.length - 1].data
        )}`
      : fmtData(piano.giornate[0]?.data || dataEff);

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
  /**
   * Porta dentro quello che l'import ha letto dal PDF. I consigli che già
   * esistono non si buttano: i docenti letti si aggiungono a quelli che ci
   * sono, senza doppioni, così un import fatto due volte non fa danni e un
   * elenco corretto a mano non si perde.
   */
  const applicaImport = (
    perClasse: { classe: string; docentiIds: string[] }[],
    nuoviDocenti: { id: string; name: string }[]
  ) => {
    const valide = new Set(classi.map((c) => c.id));
    const aggiornati = consigli.slice();

    perClasse.forEach(({ classe, docentiIds }) => {
      if (!valide.has(classe)) return;
      const posto = aggiornati.findIndex((c) => c.classId === classe);
      if (posto >= 0) {
        aggiornati[posto] = {
          ...aggiornati[posto],
          docentiIds: Array.from(
            new Set([...aggiornati[posto].docentiIds, ...docentiIds])
          ),
        };
      } else {
        aggiornati.push({
          id: rid('cc'),
          classId: classe,
          docentiIds: Array.from(new Set(docentiIds)),
          sedeId: null,
        });
      }
    });

    onImporta?.(nuoviDocenti, aggiornati);
    setImportaAperto(false);
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
            value: `Consigli di classe · ${periodoTesto}`,
            style: 'titolo',
            mergeAcross: 5,
          },
        ],
      },
      { cells: [] },
      {
        cells: [
          { value: 'Giorno', style: 'intestazione' },
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
            { value: fmtData(r.data), style: 'centro' },
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
          { value: 'Impegni per docente', style: 'titolo', mergeAcross: 4 },
        ],
      },
      { cells: [] },
      {
        cells: [
          { value: 'Docente', style: 'intestazione' },
          { value: 'Giorno', style: 'intestazione' },
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
            { value: fmtData(r.data), style: 'centro' },
            { value: `${r.inizio} - ${r.fine}`, style: 'centro' },
            { value: r.classId, style: 'centro' },
            { value: r.salaNome, style: 'cella' },
          ],
        });
      });
    });

    const sheets: XlsxSheet[] = [
      {
        name: 'Calendario',
        colWidthsPx: [100, 110, 90, 140, 70, 420],
        rows: rCal,
      },
      { name: 'Per docente', colWidthsPx: [200, 100, 110, 70, 90], rows: rDoc },
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
      {importaAperto && (
        <ImportaDocenti
          classi={classi.map((c) => c.id)}
          staff={staff.map((s) => ({ id: String(s.id), name: String(s.name) }))}
          onChiudi={() => setImportaAperto(false)}
          onApplica={applicaImport}
        />
      )}

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
              stesso docente in due riunioni nello stesso orario. Le riunioni
              stanno dentro la fascia oraria che scegli: quando un pomeriggio è
              pieno si passa al giorno dopo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {onImporta && !readOnly && (
              <button
                onClick={() => setImportaAperto(true)}
                className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
                title="Carica il PDF con i docenti classe per classe"
              >
                Importa da PDF 📄
              </button>
            )}
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
            Si parte il
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
            Dalle
            <input
              type="time"
              value={config.oraInizio}
              onChange={(e) => setConfig({ oraInizio: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="text-xs font-bold text-slate-500 flex flex-col gap-1">
            Alle (ultimo consiglio finito entro)
            <input
              type="time"
              value={config.oraFine}
              onChange={(e) => setConfig({ oraFine: e.target.value })}
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
          <label className="text-xs font-bold text-slate-500 flex flex-col gap-1">
            Pomeriggi a disposizione
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              value={config.giorniTotali}
              onChange={(e) =>
                setConfig({
                  giorniTotali: Math.min(
                    30,
                    Math.max(1, Number(e.target.value) || 1)
                  ),
                })
              }
              className={inputCls}
            />
            <span className="font-semibold text-slate-400">
              quello che non entra in un giorno passa al giorno dopo
            </span>
          </label>
          <label className="text-xs font-bold text-slate-500 flex flex-col gap-1 justify-end">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={config.includiSabato}
                onChange={(e) => setConfig({ includiSabato: e.target.checked })}
              />
              Usa anche il sabato
            </span>
            <span className="font-semibold text-slate-400">
              la domenica resta sempre libera
            </span>
          </label>
        </div>

        <div className="mt-3 text-xs font-semibold text-slate-500">
          Ogni pomeriggio ci stanno {slotPerGiornoUI}{' '}
          {slotPerGiornoUI === 1 ? 'consiglio' : 'consigli'} per sala:{' '}
          {slotPerGiornoUI * config.sale.length} in tutto al giorno, dalle{' '}
          {config.oraInizio} alle {config.oraFine}.
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
                {piano.righe.length} consigli · {config.sale.length} sale ·{' '}
                {piano.giornate.length}{' '}
                {piano.giornate.length === 1 ? 'pomeriggio' : 'pomeriggi'} ·{' '}
                {periodoTesto} · dalle {config.oraInizio} alle {config.oraFine}
              </div>
              <div className="space-y-5">
                {piano.giornate.map((g) => (
                  <div key={g.giorno}>
                    <div className="text-sm font-black text-slate-700 mb-1">
                      📅 {giorni[dayIndexOf(g.data)] || ''} {fmtData(g.data)}
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
                          {g.orari.map((o) => (
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
                  </div>
                ))}
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
                      Giorni
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
                                `${fmtData(r.data)} ${r.inizio} ${r.classId} · ${
                                  r.salaNome
                                }`
                            )
                            .join('  |  ')}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 whitespace-nowrap text-slate-500">
                          {d.date.length === 1
                            ? `${fmtData(d.date[0])} · ${d.prima} – ${d.ultima}`
                            : `${d.date.length} pomeriggi`}
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
