/**
 * Assemblee sindacali: registro delle adesioni e conteggio automatico
 * delle ore, con il controllo dei due limiti di contratto (un tetto di ore
 * nell'anno scolastico e un numero massimo di assemblee al mese).
 *
 * Le ore non si scrivono a mano: si indica la fascia oraria dell'assemblea e
 * per ogni persona si contano le ore di servizio che cadono dentro quella
 * fascia. Per chi è già nell'orario (secondaria) le ore arrivano dalla
 * griglia; per chi non c'è (infanzia, primaria, personale ATA) si registra
 * qui una fascia di servizio per ogni giorno della settimana. Il valore
 * calcolato resta comunque correggibile a mano, caso per caso.
 */
import { useMemo, useState } from 'react';
import { buildXlsx } from './xlsxWriter';
import type { XlsxRow, XlsxSheet, XlsxStyle } from './xlsxWriter';

/** Persona che non compare nell'orario e va censita a parte. */
export interface PersonaExtra {
  id: string;
  name: string;
  /** infanzia, primaria, ATA... testo libero, serve solo a raggruppare */
  ruolo: string;
  /** fascia di servizio per ogni giorno, 'HH:MM - HH:MM' oppure vuoto */
  orario: string[];
}

export interface Assemblea {
  id: string;
  /** AAAA-MM-GG */
  date: string;
  /** HH:MM */
  from: string;
  /** HH:MM */
  to: string;
  titolo: string;
  /** id delle persone che hanno aderito */
  partecipanti: string[];
  /** ore corrette a mano, per id persona: hanno la precedenza sul calcolo */
  oreManuali: Record<string, number>;
}

export interface AssembleeConfig {
  /** tetto di ore nell'anno scolastico */
  maxOreAnno: number;
  /** numero massimo di assemblee nello stesso mese */
  maxAlMese: number;
}

export const DEFAULT_ASSEMBLEE_CONFIG: AssembleeConfig = {
  maxOreAnno: 10,
  maxAlMese: 2,
};

/** Ripulisce quello che arriva dal documento salvato. */
export const normalizeAssemblee = (raw: any): Assemblea[] =>
  Array.isArray(raw)
    ? raw
        .filter((a) => a && typeof a.date === 'string')
        .map((a) => ({
          id: String(a.id || `as-${Math.random().toString(36).slice(2)}`),
          date: String(a.date),
          from: String(a.from || ''),
          to: String(a.to || ''),
          titolo: String(a.titolo || ''),
          partecipanti: Array.isArray(a.partecipanti)
            ? a.partecipanti.map(String)
            : [],
          oreManuali:
            a.oreManuali && typeof a.oreManuali === 'object'
              ? a.oreManuali
              : {},
        }))
    : [];

export const normalizePersonaleExtra = (raw: any): PersonaExtra[] =>
  Array.isArray(raw)
    ? raw
        .filter((p) => p && typeof p.name === 'string' && p.name.trim())
        .map((p) => ({
          id: String(p.id || `px-${Math.random().toString(36).slice(2)}`),
          name: String(p.name),
          ruolo: String(p.ruolo || ''),
          orario: Array.isArray(p.orario)
            ? Array.from({ length: 6 }, (_, i) => String(p.orario[i] || ''))
            : ['', '', '', '', '', ''],
        }))
    : [];

export const normalizeAssembleeConfig = (raw: any): AssembleeConfig => ({
  maxOreAnno:
    Number(raw?.maxOreAnno) > 0
      ? Number(raw.maxOreAnno)
      : DEFAULT_ASSEMBLEE_CONFIG.maxOreAnno,
  maxAlMese:
    Number(raw?.maxAlMese) > 0
      ? Number(raw.maxAlMese)
      : DEFAULT_ASSEMBLEE_CONFIG.maxAlMese,
});

/* ------------------------------------------------------------- orologio */

/** 'HH:MM' in minuti dalla mezzanotte. null se il testo non è un orario. */
const toMinutes = (value: string): number | null => {
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(String(value || ''));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
};

/** 'HH:MM - HH:MM' in una coppia di minuti. null se la fascia non è valida. */
const parseRange = (value: string): [number, number] | null => {
  const parts = String(value || '').split(/[-–—]/);
  if (parts.length < 2) return null;
  const a = toMinutes(parts[0]);
  const b = toMinutes(parts[1]);
  if (a === null || b === null || b <= a) return null;
  return [a, b];
};

const overlapMinutes = (a: [number, number], b: [number, number]) =>
  Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));

/** Da 'AAAA-MM-GG' all'indice giorno dell'orario (0=Lunedì..5=Sabato, -1=Domenica). */
const dayIndexOf = (dateStr: string) => {
  const jsDay = new Date(`${dateStr}T00:00:00`).getDay();
  return Number.isNaN(jsDay) ? -1 : jsDay === 0 ? -1 : jsDay - 1;
};

/**
 * Anno scolastico di una data: parte da settembre, così le assemblee di
 * settembre e quelle di maggio finiscono nello stesso conteggio.
 */
const annoScolasticoDi = (dateStr: string): number => {
  const [y, m] = String(dateStr).split('-').map(Number);
  if (!y || !m) return 0;
  return m >= 9 ? y : y - 1;
};

const etichettaAnno = (anno: number) => `${anno}/${anno + 1}`;

/** Numeri corti e all'italiana: 2 resta 2, 1.5 diventa 1,5. */
const fmtOre = (n: number) =>
  String(Math.round(n * 100) / 100).replace('.', ',');

/** «1 ora», «1,5 ore»: il singolare vale solo per l'ora tonda. */
const fmtOreEstese = (n: number) =>
  `${fmtOre(n)} ${Math.round(n * 100) / 100 === 1 ? 'ora' : 'ore'}`;

const fmtData = (dateStr: string) => {
  const [y, m, d] = String(dateStr).split('-');
  return y && m && d ? `${d}/${m}/${y}` : dateStr;
};

/* ------------------------------------------------------------ componente */

interface Props {
  assemblee: Assemblea[];
  personale: PersonaExtra[];
  config: AssembleeConfig;
  /** docenti già presenti nell'orario */
  staff: any[];
  timetable: any[];
  /** indice ora → { time: 'HH:MM - HH:MM' } */
  hoursMap: Record<number, any>;
  days: string[];
  onChange: (next: {
    assemblee?: Assemblea[];
    personale?: PersonaExtra[];
    config?: AssembleeConfig;
  }) => void;
}

type Anagrafica = {
  id: string;
  name: string;
  ruolo: string;
  daOrario: boolean;
};

export default function Assemblee({
  assemblee,
  personale,
  config,
  staff,
  timetable,
  hoursMap,
  days,
  onChange,
}: Props) {
  const [subTab, setSubTab] = useState<
    'assemblee' | 'personale' | 'prospetto'
  >('assemblee');
  const [openId, setOpenId] = useState<string | null>(null);
  const [ricerca, setRicerca] = useState('');
  const [formErr, setFormErr] = useState('');
  const [nuovaData, setNuovaData] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [nuovaDa, setNuovaDa] = useState('08:00');
  const [nuovaA, setNuovaA] = useState('10:00');
  const [nuovoTitolo, setNuovoTitolo] = useState('');
  const [nuovoNome, setNuovoNome] = useState('');
  const [nuovoRuolo, setNuovoRuolo] = useState('Primaria');

  /** Anno scolastico su cui si sta lavorando. */
  const [annoScelto, setAnnoScelto] = useState<number>(() =>
    annoScolasticoDi(new Date().toISOString().slice(0, 10))
  );

  /** Elenco unico di chi può aderire: docenti dell'orario + personale extra. */
  const anagrafica = useMemo<Anagrafica[]>(
    () => [
      ...staff.map((s: any) => ({
        id: String(s.id),
        name: String(s.name || s.id),
        ruolo: String(s.subject || 'Secondaria'),
        daOrario: true,
      })),
      ...personale.map((p) => ({
        id: p.id,
        name: p.name,
        ruolo: p.ruolo || 'Personale',
        daOrario: false,
      })),
    ],
    [staff, personale]
  );

  const anagraficaById = useMemo(() => {
    const map: Record<string, Anagrafica> = {};
    anagrafica.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [anagrafica]);

  const personaleById = useMemo(() => {
    const map: Record<string, PersonaExtra> = {};
    personale.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [personale]);

  /**
   * Ore di servizio di una persona dentro la fascia dell'assemblea.
   * Le ore dell'orario si contano una volta sola anche in compresenza:
   * due classi nella stessa ora restano un'ora di servizio.
   */
  const oreDi = (personaId: string, a: Assemblea): number => {
    const manuale = a.oreManuali ? a.oreManuali[personaId] : undefined;
    if (typeof manuale === 'number' && Number.isFinite(manuale)) return manuale;

    const da = toMinutes(a.from);
    const al = toMinutes(a.to);
    if (da === null || al === null || al <= da) return 0;
    const finestra: [number, number] = [da, al];

    const giorno = dayIndexOf(a.date);
    if (giorno < 0) return 0;

    let fasce: [number, number][] = [];
    const extra = personaleById[personaId];
    if (extra) {
      const r = parseRange(extra.orario[giorno] || '');
      if (r) fasce = [r];
    } else {
      const oreViste = new Set<number>();
      timetable.forEach((slot: any) => {
        if (slot.teacherId !== personaId || slot.day !== giorno) return;
        if (oreViste.has(slot.hour)) return;
        oreViste.add(slot.hour);
        const r = parseRange(hoursMap[slot.hour]?.time || '');
        if (r) fasce.push(r);
      });
    }

    const minuti = fasce.reduce((tot, f) => tot + overlapMinutes(f, finestra), 0);
    return Math.round((minuti / 60) * 100) / 100;
  };

  /** Assemblee dell'anno scolastico scelto, dalla più recente. */
  const assembleeAnno = useMemo(
    () =>
      assemblee
        .filter((a) => annoScolasticoDi(a.date) === annoScelto)
        .slice()
        .sort((x, y) => (x.date < y.date ? 1 : -1)),
    [assemblee, annoScelto]
  );

  const anniDisponibili = useMemo(() => {
    const set = new Set<number>([annoScolasticoDi(new Date().toISOString().slice(0, 10))]);
    assemblee.forEach((a) => set.add(annoScolasticoDi(a.date)));
    return Array.from(set)
      .filter((n) => n > 0)
      .sort((a, b) => b - a);
  }, [assemblee]);

  /** Riepilogo per persona sull'anno scelto. */
  const prospetto = useMemo(() => {
    const righe: Record<
      string,
      {
        id: string;
        name: string;
        ruolo: string;
        ore: number;
        nAssemblee: number;
        perMese: Record<string, number>;
      }
    > = {};
    assembleeAnno.forEach((a) => {
      const mese = String(a.date).slice(0, 7);
      a.partecipanti.forEach((pid) => {
        const p = anagraficaById[pid];
        if (!righe[pid]) {
          righe[pid] = {
            id: pid,
            name: p ? p.name : pid,
            ruolo: p ? p.ruolo : '—',
            ore: 0,
            nAssemblee: 0,
            perMese: {},
          };
        }
        righe[pid].ore += oreDi(pid, a);
        righe[pid].nAssemblee += 1;
        righe[pid].perMese[mese] = (righe[pid].perMese[mese] || 0) + 1;
      });
    });
    return Object.values(righe)
      .map((r) => {
        const mesiOltre = Object.entries(r.perMese)
          .filter(([, n]) => n > config.maxAlMese)
          .map(([m]) => m);
        return {
          ...r,
          ore: Math.round(r.ore * 100) / 100,
          oltreOre: r.ore > config.maxOreAnno + 0.001,
          mesiOltre,
        };
      })
      .sort((a, b) => b.ore - a.ore || a.name.localeCompare(b.name));
    // oreDi dipende da timetable/hoursMap/personale, già nelle dipendenze sotto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assembleeAnno,
    anagraficaById,
    personaleById,
    timetable,
    hoursMap,
    config,
  ]);

  const prospettoById = useMemo(() => {
    const map: Record<string, (typeof prospetto)[number]> = {};
    prospetto.forEach((r) => {
      map[r.id] = r;
    });
    return map;
  }, [prospetto]);

  const inRegola = prospetto.filter((r) => r.oltreOre || r.mesiOltre.length > 0);

  /* ------------------------------------------------------------- azioni */

  const aggiungiAssemblea = () => {
    const da = toMinutes(nuovaDa);
    const al = toMinutes(nuovaA);
    if (!nuovaData) {
      setFormErr('Manca la data dell’assemblea.');
      return;
    }
    if (da === null || al === null) {
      setFormErr('Gli orari vanno scritti come 08:00.');
      return;
    }
    if (al <= da) {
      setFormErr('L’ora di fine deve venire dopo quella di inizio.');
      return;
    }
    const nuova: Assemblea = {
      id: `as-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: nuovaData,
      from: nuovaDa,
      to: nuovaA,
      titolo: nuovoTitolo.trim(),
      partecipanti: [],
      oreManuali: {},
    };
    setFormErr('');
    setNuovoTitolo('');
    setAnnoScelto(annoScolasticoDi(nuova.date));
    setOpenId(nuova.id);
    onChange({ assemblee: [...assemblee, nuova] });
  };

  const aggiornaAssemblea = (id: string, patch: Partial<Assemblea>) => {
    onChange({
      assemblee: assemblee.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  };

  const eliminaAssemblea = (id: string) => {
    if (
      !window.confirm(
        'Eliminare questa assemblea e tutte le adesioni registrate?'
      )
    )
      return;
    if (openId === id) setOpenId(null);
    onChange({ assemblee: assemblee.filter((a) => a.id !== id) });
  };

  const togglePartecipante = (a: Assemblea, personaId: string) => {
    const dentro = a.partecipanti.includes(personaId);
    const partecipanti = dentro
      ? a.partecipanti.filter((p) => p !== personaId)
      : [...a.partecipanti, personaId];
    const oreManuali = { ...(a.oreManuali || {}) };
    if (dentro) delete oreManuali[personaId];
    aggiornaAssemblea(a.id, { partecipanti, oreManuali });
  };

  const impostaOreManuali = (a: Assemblea, personaId: string, testo: string) => {
    const oreManuali = { ...(a.oreManuali || {}) };
    const pulito = testo.trim().replace(',', '.');
    if (pulito === '') delete oreManuali[personaId];
    else {
      const n = Number(pulito);
      if (!Number.isFinite(n) || n < 0) return;
      oreManuali[personaId] = n;
    }
    aggiornaAssemblea(a.id, { oreManuali });
  };

  const aggiungiPersona = () => {
    const nome = nuovoNome.trim();
    if (!nome) return;
    const nuova: PersonaExtra = {
      id: `px-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: nome.toUpperCase(),
      ruolo: nuovoRuolo.trim() || 'Personale',
      orario: ['', '', '', '', '', ''],
    };
    setNuovoNome('');
    onChange({ personale: [...personale, nuova] });
  };

  const aggiornaPersona = (id: string, patch: Partial<PersonaExtra>) => {
    onChange({
      personale: personale.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  };

  const eliminaPersona = (id: string) => {
    if (!window.confirm('Togliere questa persona dall’elenco?')) return;
    onChange({
      personale: personale.filter((p) => p.id !== id),
      assemblee: assemblee.map((a) => ({
        ...a,
        partecipanti: a.partecipanti.filter((p) => p !== id),
      })),
    });
  };

  /** Copia la stessa fascia su tutti i giorni feriali già compilabili. */
  const copiaSuTuttiIGiorni = (p: PersonaExtra, valore: string) => {
    aggiornaPersona(p.id, {
      orario: p.orario.map((_, i) => (i < 5 ? valore : p.orario[i])),
    });
  };

  /* --------------------------------------------------------------- excel */

  const esportaExcel = () => {
    const stili: Record<string, XlsxStyle> = {
      titolo: { bold: true, size: 14, color: '#1E3A8A' },
      intestazione: {
        bold: true,
        color: '#FFFFFF',
        fill: '#1E3A8A',
        align: 'center',
        border: true,
      },
      cella: { border: true },
      cellaCentro: { border: true, align: 'center' },
      allarme: { border: true, align: 'center', bold: true, fill: '#FEE2E2', color: '#991B1B' },
    };

    const righeProspetto: XlsxRow[] = [
      {
        cells: [
          {
            value: `Assemblee sindacali · anno ${etichettaAnno(annoScelto)}`,
            style: 'titolo',
            mergeAcross: 5,
          },
        ],
      },
      { cells: [] },
      {
        cells: [
          { value: 'Nome', style: 'intestazione' },
          { value: 'Ruolo', style: 'intestazione' },
          { value: 'Ore totali', style: 'intestazione' },
          { value: `Limite ore (${config.maxOreAnno})`, style: 'intestazione' },
          { value: 'N. assemblee', style: 'intestazione' },
          { value: `Mesi oltre ${config.maxAlMese}`, style: 'intestazione' },
        ],
      },
      ...prospetto.map((r) => ({
        cells: [
          { value: r.name, style: 'cella' },
          { value: r.ruolo, style: 'cella' },
          { value: fmtOre(r.ore), style: 'cellaCentro' },
          {
            value: r.oltreOre ? 'SUPERATO' : 'ok',
            style: r.oltreOre ? 'allarme' : 'cellaCentro',
          },
          { value: r.nAssemblee, style: 'cellaCentro' },
          {
            value: r.mesiOltre.length > 0 ? r.mesiOltre.join(' ') : '—',
            style: r.mesiOltre.length > 0 ? 'allarme' : 'cellaCentro',
          },
        ],
      })),
    ];

    const righeDettaglio: XlsxRow[] = [
      {
        cells: [
          { value: 'Dettaglio adesioni', style: 'titolo', mergeAcross: 4 },
        ],
      },
      { cells: [] },
      {
        cells: [
          { value: 'Data', style: 'intestazione' },
          { value: 'Orario', style: 'intestazione' },
          { value: 'Assemblea', style: 'intestazione' },
          { value: 'Nome', style: 'intestazione' },
          { value: 'Ore', style: 'intestazione' },
        ],
      },
    ];
    assembleeAnno
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .forEach((a) => {
        a.partecipanti.forEach((pid) => {
          righeDettaglio.push({
            cells: [
              { value: fmtData(a.date), style: 'cellaCentro' },
              { value: `${a.from} - ${a.to}`, style: 'cellaCentro' },
              { value: a.titolo || 'Assemblea sindacale', style: 'cella' },
              { value: anagraficaById[pid]?.name || pid, style: 'cella' },
              { value: fmtOre(oreDi(pid, a)), style: 'cellaCentro' },
            ],
          });
        });
      });

    const sheets: XlsxSheet[] = [
      {
        name: 'Prospetto',
        colWidthsPx: [220, 150, 90, 130, 110, 140],
        rows: righeProspetto,
      },
      {
        name: 'Dettaglio',
        colWidthsPx: [100, 120, 240, 220, 70],
        rows: righeDettaglio,
      },
    ];

    const data = buildXlsx(sheets, stili);
    const blob = new Blob([data as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `assemblee-sindacali-${annoScelto}-${annoScelto + 1}.xlsx`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ----------------------------------------------------------------- JSX */

  const elencoFiltrato = anagrafica.filter((p) =>
    ricerca.trim() === ''
      ? true
      : `${p.name} ${p.ruolo}`.toLowerCase().includes(ricerca.toLowerCase())
  );

  const tabBtn = (
    key: 'assemblee' | 'personale' | 'prospetto',
    label: string
  ) => (
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

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              🗳️ Assemblee sindacali
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Si registra l&apos;assemblea con data e orario, si spuntano le
              persone che aderiscono e le ore si contano da sole. L&apos;app
              avvisa quando qualcuno supera il tetto di ore dell&apos;anno o il
              numero di assemblee nel mese.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              Anno
              <select
                value={annoScelto}
                onChange={(e) => setAnnoScelto(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700"
              >
                {anniDisponibili.map((a) => (
                  <option key={a} value={a}>
                    {etichettaAnno(a)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              Max ore anno
              <input
                type="number"
                min={1}
                value={config.maxOreAnno}
                onChange={(e) =>
                  onChange({
                    config: {
                      ...config,
                      maxOreAnno: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }
                className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700"
              />
            </label>
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              Max al mese
              <input
                type="number"
                min={1}
                value={config.maxAlMese}
                onChange={(e) =>
                  onChange({
                    config: {
                      ...config,
                      maxAlMese: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }
                className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700"
              />
            </label>
            <button
              onClick={esportaExcel}
              className="bg-salvia-600 hover:bg-salvia-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
            >
              Esporta Excel 📊
            </button>
          </div>
        </div>

        {inRegola.length > 0 && (
          <div className="mt-4 bg-fucsia-50 border border-fucsia-200 rounded-lg p-3 text-sm text-fucsia-800">
            <span className="font-bold">
              {inRegola.length} {inRegola.length === 1 ? 'persona' : 'persone'}{' '}
              oltre i limiti:
            </span>{' '}
            {inRegola
              .map(
                (r) =>
                  `${r.name}${r.oltreOre ? ` (${fmtOreEstese(r.ore)})` : ''}${
                    r.mesiOltre.length > 0 ? ' (troppe nel mese)' : ''
                  }`
              )
              .join(' · ')}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {tabBtn('assemblee', `📅 Assemblee (${assembleeAnno.length})`)}
          {tabBtn('personale', `👥 Personale fuori orario (${personale.length})`)}
          {tabBtn('prospetto', `📊 Prospetto (${prospetto.length})`)}
        </div>
      </div>

      {subTab === 'assemblee' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-slate-700 mb-3">Nuova assemblea</h3>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-bold text-slate-500 flex flex-col gap-1">
                Data
                <input
                  type="date"
                  value={nuovaData}
                  onChange={(e) => setNuovaData(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700"
                />
              </label>
              <label className="text-xs font-bold text-slate-500 flex flex-col gap-1">
                Dalle
                <input
                  type="time"
                  value={nuovaDa}
                  onChange={(e) => setNuovaDa(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700"
                />
              </label>
              <label className="text-xs font-bold text-slate-500 flex flex-col gap-1">
                Alle
                <input
                  type="time"
                  value={nuovaA}
                  onChange={(e) => setNuovaA(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700"
                />
              </label>
              <label className="text-xs font-bold text-slate-500 flex flex-col gap-1 flex-1 min-w-[200px]">
                Titolo (facoltativo)
                <input
                  type="text"
                  value={nuovoTitolo}
                  onChange={(e) => setNuovoTitolo(e.target.value)}
                  placeholder="es. Assemblea territoriale FLC CGIL"
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700"
                />
              </label>
              <button
                onClick={aggiungiAssemblea}
                className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm"
              >
                Aggiungi
              </button>
            </div>
            {formErr && (
              <p className="mt-2 text-sm font-semibold text-fucsia-600">
                {formErr}
              </p>
            )}
          </div>

          {assembleeAnno.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Nessuna assemblea registrata per l&apos;anno{' '}
              {etichettaAnno(annoScelto)}.
            </div>
          )}

          {assembleeAnno.map((a) => {
            const aperta = openId === a.id;
            const oreTotali = a.partecipanti.reduce(
              (tot, pid) => tot + oreDi(pid, a),
              0
            );
            const domenica = dayIndexOf(a.date) < 0;
            return (
              <div
                key={a.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex-1 min-w-[220px]">
                    <div className="font-bold text-slate-800">
                      {fmtData(a.date)} · {a.from} - {a.to}
                    </div>
                    <div className="text-sm text-slate-500">
                      {a.titolo || 'Assemblea sindacale'}
                    </div>
                    {domenica && (
                      <div className="text-xs font-semibold text-bruciato-600 mt-1">
                        Attenzione: questa data è una domenica, le ore di
                        servizio non si possono calcolare.
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 font-semibold">
                    {a.partecipanti.length}{' '}
                    {a.partecipanti.length === 1 ? 'adesione' : 'adesioni'} ·{' '}
                    {fmtOreEstese(oreTotali)}
                  </div>
                  <button
                    onClick={() => setOpenId(aperta ? null : a.id)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    {aperta ? 'Chiudi' : 'Gestisci adesioni'}
                  </button>
                  <button
                    onClick={() => eliminaAssemblea(a.id)}
                    className="text-fucsia-600 hover:bg-fucsia-50 px-3 py-2 rounded-lg text-sm font-bold"
                  >
                    Elimina
                  </button>
                </div>

                {aperta && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50">
                    <input
                      type="text"
                      value={ricerca}
                      onChange={(e) => setRicerca(e.target.value)}
                      placeholder="Cerca una persona..."
                      className="w-full sm:w-72 border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
                    />
                    <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                      {elencoFiltrato.length === 0 && (
                        <div className="p-4 text-sm text-slate-500">
                          Nessuna persona trovata.
                        </div>
                      )}
                      {elencoFiltrato.map((p) => {
                        const scelta = a.partecipanti.includes(p.id);
                        const ore = scelta ? oreDi(p.id, a) : 0;
                        const riga = prospettoById[p.id];
                        const manuale =
                          a.oreManuali && a.oreManuali[p.id] !== undefined;
                        return (
                          <label
                            key={p.id}
                            className={`flex flex-wrap items-center gap-3 px-3 py-2 cursor-pointer ${
                              scelta ? 'bg-brand-50/50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={scelta}
                              onChange={() => togglePartecipante(a, p.id)}
                              className="w-4 h-4 accent-brand-600"
                            />
                            <span className="flex-1 min-w-[160px] text-sm font-semibold text-slate-700">
                              {p.name}
                              <span className="ml-2 text-xs font-normal text-slate-400">
                                {p.ruolo}
                                {p.daOrario ? '' : ' · fuori orario'}
                              </span>
                            </span>
                            {scelta && (
                              <>
                                <span className="text-sm font-bold text-slate-700">
                                  {fmtOreEstese(ore)}
                                  {manuale && (
                                    <span className="ml-1 text-xs font-normal text-bruciato-600">
                                      (a mano)
                                    </span>
                                  )}
                                </span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={
                                    manuale ? String(a.oreManuali[p.id]) : ''
                                  }
                                  onChange={(e) =>
                                    impostaOreManuali(a, p.id, e.target.value)
                                  }
                                  onClick={(e) => e.preventDefault()}
                                  placeholder="correggi"
                                  className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-sm"
                                />
                                {riga && riga.oltreOre && (
                                  <span className="text-xs font-bold text-fucsia-600">
                                    oltre le {config.maxOreAnno} ore
                                  </span>
                                )}
                                {riga && riga.mesiOltre.length > 0 && (
                                  <span className="text-xs font-bold text-fucsia-600">
                                    più di {config.maxAlMese} nel mese
                                  </span>
                                )}
                              </>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Le ore arrivano dall&apos;orario per chi ci sta dentro e
                      dalla scheda «Personale fuori orario» per tutti gli altri.
                      Il campo «correggi» le sovrascrive solo per questa
                      assemblea; si svuota per tornare al calcolo automatico.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {subTab === 'personale' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-bold text-slate-700">
            Personale fuori orario
          </h3>
          <p className="text-sm text-slate-500 mt-1 mb-4 max-w-3xl">
            Serve per chi non compare nell&apos;orario dell&apos;app: infanzia,
            primaria, personale ATA. Si scrive la fascia di servizio di ogni
            giorno (es. 08:00 - 13:00) e le ore di assemblea si contano da sole.
            I giorni liberi si lasciano vuoti.
          </p>

          <div className="flex flex-wrap items-end gap-3 mb-5">
            <label className="text-xs font-bold text-slate-500 flex flex-col gap-1 flex-1 min-w-[200px]">
              Nome e cognome
              <input
                type="text"
                value={nuovoNome}
                onChange={(e) => setNuovoNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') aggiungiPersona();
                }}
                placeholder="es. MAESTRA VERDI"
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-slate-500 flex flex-col gap-1">
              Ruolo
              <input
                type="text"
                value={nuovoRuolo}
                onChange={(e) => setNuovoRuolo(e.target.value)}
                placeholder="es. Primaria"
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-40"
              />
            </label>
            <button
              onClick={aggiungiPersona}
              className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm"
            >
              Aggiungi
            </button>
          </div>

          {personale.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center text-slate-500 text-sm">
              Nessuna persona aggiunta. I docenti già presenti nell&apos;orario
              non vanno inseriti qui: ci sono già.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600">
                    <th className="text-left px-3 py-2 font-bold">Nome</th>
                    <th className="text-left px-3 py-2 font-bold">Ruolo</th>
                    {days.map((d) => (
                      <th key={d} className="px-3 py-2 font-bold text-center">
                        {d.slice(0, 3)}
                      </th>
                    ))}
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {personale.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) =>
                            aggiornaPersona(p.id, { name: e.target.value })
                          }
                          className="w-44 border border-transparent hover:border-slate-300 focus:border-brand-400 rounded px-2 py-1 font-semibold text-slate-700"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={p.ruolo}
                          onChange={(e) =>
                            aggiornaPersona(p.id, { ruolo: e.target.value })
                          }
                          className="w-32 border border-transparent hover:border-slate-300 focus:border-brand-400 rounded px-2 py-1 text-slate-600"
                        />
                      </td>
                      {days.map((_, i) => (
                        <td key={i} className="px-2 py-2">
                          <input
                            type="text"
                            value={p.orario[i] || ''}
                            onChange={(e) => {
                              const orario = [...p.orario];
                              orario[i] = e.target.value;
                              aggiornaPersona(p.id, { orario });
                            }}
                            onDoubleClick={() =>
                              copiaSuTuttiIGiorni(p, p.orario[i] || '')
                            }
                            placeholder="08:00 - 13:00"
                            title="Doppio clic per copiare questa fascia da lunedì a venerdì"
                            className={`w-28 border rounded px-2 py-1 text-center ${
                              p.orario[i] && !parseRange(p.orario[i])
                                ? 'border-fucsia-400 bg-fucsia-50 text-fucsia-700'
                                : 'border-slate-200'
                            }`}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => eliminaPersona(p.id)}
                          className="text-fucsia-600 hover:bg-fucsia-50 px-2 py-1 rounded font-bold"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-slate-500">
                Doppio clic su una fascia per copiarla da lunedì a venerdì. Una
                fascia scritta male diventa rossa e vale zero ore.
              </p>
            </div>
          )}
        </div>
      )}

      {subTab === 'prospetto' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="font-bold text-slate-700 mb-3">
            Prospetto anno {etichettaAnno(annoScelto)}
          </h3>
          {prospetto.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center text-slate-500 text-sm">
              Nessuna adesione registrata per quest&apos;anno.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600">
                    <th className="text-left px-3 py-2 font-bold">Nome</th>
                    <th className="text-left px-3 py-2 font-bold">Ruolo</th>
                    <th className="px-3 py-2 font-bold text-center">
                      Ore totali
                    </th>
                    <th className="px-3 py-2 font-bold text-center">
                      Residuo su {config.maxOreAnno}
                    </th>
                    <th className="px-3 py-2 font-bold text-center">
                      Assemblee
                    </th>
                    <th className="px-3 py-2 font-bold text-center">Avvisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prospetto.map((r) => (
                    <tr
                      key={r.id}
                      className={
                        r.oltreOre || r.mesiOltre.length > 0
                          ? 'bg-fucsia-50'
                          : 'hover:bg-slate-50'
                      }
                    >
                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {r.name}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{r.ruolo}</td>
                      <td className="px-3 py-2 text-center font-bold text-slate-800">
                        {fmtOre(r.ore)}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600">
                        {fmtOre(Math.max(0, config.maxOreAnno - r.ore))}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-600">
                        {r.nAssemblee}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {r.oltreOre && (
                          <span className="inline-block bg-fucsia-100 text-fucsia-800 rounded-full px-2 py-0.5 text-xs font-bold mr-1">
                            oltre le ore
                          </span>
                        )}
                        {r.mesiOltre.length > 0 && (
                          <span className="inline-block bg-fucsia-100 text-fucsia-800 rounded-full px-2 py-0.5 text-xs font-bold">
                            {r.mesiOltre.length === 1
                              ? 'mese pieno'
                              : 'mesi pieni'}
                            : {r.mesiOltre.join(', ')}
                          </span>
                        )}
                        {!r.oltreOre && r.mesiOltre.length === 0 && (
                          <span className="text-slate-400">—</span>
                        )}
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
