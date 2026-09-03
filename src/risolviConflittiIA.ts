/**
 * L'aiuto dell'IA sui conflitti dell'orario, dalla parte del browser.
 *
 * Il generatore piazza le ore una dopo l'altra e non torna indietro: quando
 * finisce, qualche conflitto resta quasi sempre. Toglierlo a mano vuol dire
 * spostare celle a tentativi, ed è la parte che fa perdere le serate. Qui il
 * browser prepara una fotografia del problema, la manda a
 * `/api/risolvi-conflitti`, e riceve una lista di spostamenti proposti.
 *
 * Due cose contano più del resto.
 *
 * 1. I nomi non escono. Ogni docente diventa una sigla (D1, D2, D3…) prima
 *    della chiamata, e la tabella delle sigle resta qui. Al modello servono
 *    le classi e le ore, non chi ci insegna. Per questo l'aiuto sui conflitti
 *    non chiede nessuna spunta, a differenza della lettura del PDF: là i nomi
 *    sono il dato da estrarre, qui non servono.
 *
 * 2. La parola definitiva non è del modello. Ogni mossa che torna indietro
 *    viene provata sull'orario e pesata con lo stesso calcolo dei conflitti
 *    che alimenta il pannello: si tengono solo le mosse che migliorano, una
 *    dopo l'altra, e le altre si buttano. Un modello linguistico sa proporre
 *    uno spostamento sensato, non sa contare le sovrapposizioni che quello
 *    spostamento crea.
 */

/* --------------------------------------------------------------- tipi */

/** Un conflitto come lo mette in lista il pannello dell'app. */
export interface ConflittoLetto {
  type?: string;
  message?: string;
  suggestion?: string;
  slot?: { classId?: string; day?: number; hour?: number } | null;
}

/** Una cella di orario già piazzata. */
export interface LezionePiazzata {
  classId?: string;
  day?: number;
  hour?: number;
  subject?: string;
  teacherId?: string | null;
  room?: string | null;
  type?: string;
}

/** Uno spostamento proposto dal modello. */
export interface Mossa {
  classe: string;
  daGiorno: number;
  daOra: number;
  aGiorno: number;
  aOra: number;
  perche: string;
}

export interface Proposta {
  mosse: Mossa[];
  nota: string;
}

/** Una mossa che è stata provata sull'orario, con il suo esito. */
export interface MossaProvata {
  mossa: Mossa;
  /** Descrizione leggibile: «1A, LUNEDÌ 3ª ora → GIOVEDÌ 1ª ora». */
  descrizione: string;
  /** Quanti conflitti c'erano prima e quanti restano dopo questa mossa. */
  primaErrori: number;
  dopoErrori: number;
  primaTotale: number;
  dopoTotale: number;
  /** True quando la mossa si scambia il posto con un'altra lezione. */
  scambio: boolean;
}

export interface MossaScartata {
  mossa: Mossa;
  descrizione: string;
  motivo: string;
}

export interface EsitoProva {
  /** L'orario che verrebbe fuori applicando le mosse accettate. */
  timetable: any[];
  accettate: MossaProvata[];
  scartate: MossaScartata[];
  primaErrori: number;
  dopoErrori: number;
  primaTotale: number;
  dopoTotale: number;
}

/** Errore che dice al pannello di mandare la persona alla chiave. */
export class ErroreLicenzaConflitti extends Error {
  readonly riattivare: boolean;

  constructor(messaggio: string, riattivare: boolean) {
    super(messaggio);
    this.name = 'ErroreLicenzaConflitti';
    this.riattivare = riattivare;
  }
}

const INDIRIZZO = '/api/risolvi-conflitti';

/* ------------------------------------------------ la fotografia */

/**
 * Quante lezioni si possono mandare. Oltre questo numero la fotografia
 * diventa un orario intero, che costa e serve a poco: le mosse utili stanno
 * quasi sempre nelle classi che il conflitto nomina.
 */
const MAX_LEZIONI = 900;
const MAX_LIBERE = 900;
const MAX_PROBLEMI = 60;

export interface DatiPerIa {
  conflitti: ConflittoLetto[];
  timetable: LezionePiazzata[];
  staff: { id: string; name?: string }[];
  /** I giorni in uso, nell'ordine: il numero 0 è il primo. */
  giorni: string[];
  /** Le caselle della griglia, cioè i posti dove una lezione può stare. */
  celle: { day: number; hour: number }[];
  /** Dice se quel docente, in quella casella, non ha lezione e può starci. */
  docenteLibero: (teacherId: string, day: number, hour: number) => boolean;
}

export interface Fotografia {
  giorni: string[];
  problemi: string[];
  lezioni: string[];
  libere: string[];
  /** Sigla → id vero del docente. Non esce dal browser. */
  sigle: Map<string, string>;
}

const etichettaOra = (ora: number) => `${ora + 1}`;

/**
 * Prepara quello che si manda al modello: i conflitti scritti come li legge
 * la persona, le lezioni delle classi coinvolte e le caselle dove i docenti
 * di quelle lezioni sono liberi.
 *
 * Le classi coinvolte sono quelle nominate dai conflitti, più tutte quelle
 * dove insegnano i docenti che compaiono in quelle celle: uno spostamento
 * quasi sempre si incastra con l'orario di un'altra classe dello stesso
 * docente, e senza quelle righe il modello propone mosse impossibili.
 */
export function costruisciFotografia(dati: DatiPerIa): Fotografia {
  const { conflitti, timetable, staff, giorni, celle, docenteLibero } = dati;

  const classiCoinvolte = new Set<string>();
  conflitti.forEach((c) => {
    const classe = c?.slot?.classId;
    if (classe) classiCoinvolte.add(String(classe));
  });

  const docentiCoinvolti = new Set<string>();
  timetable.forEach((l) => {
    if (!l?.teacherId || !l?.classId) return;
    if (classiCoinvolte.has(String(l.classId))) {
      docentiCoinvolti.add(String(l.teacherId));
    }
  });

  timetable.forEach((l) => {
    if (!l?.teacherId || !l?.classId) return;
    if (docentiCoinvolti.has(String(l.teacherId))) {
      classiCoinvolte.add(String(l.classId));
    }
  });

  // Nessun conflitto porta con sé una cella (capita con gli avvisi sulle ore
  // in cattedra): in quel caso si manda tutto, entro il tetto.
  const tutte = classiCoinvolte.size === 0;

  const lezioniScelte = timetable
    .filter(
      (l) =>
        l?.classId &&
        typeof l.day === 'number' &&
        typeof l.hour === 'number' &&
        (tutte || classiCoinvolte.has(String(l.classId)))
    )
    .slice(0, MAX_LEZIONI);

  // Le sigle: un docente per volta, nell'ordine in cui compare. Chi guarda i
  // dati in uscita non ha modo di risalire ai nomi, che restano qui.
  const perId = new Map<string, string>();
  const siglaDi = (id: string): string => {
    const gia = perId.get(id);
    if (gia) return gia;
    const nuova = `D${perId.size + 1}`;
    perId.set(id, nuova);
    return nuova;
  };

  const lezioni = lezioniScelte.map((l) => {
    const id = l.teacherId ? String(l.teacherId) : '';
    const sigla = id ? siglaDi(id) : '';
    return [
      String(l.classId),
      String(l.day),
      String(l.hour),
      String(l.subject || '').slice(0, 40) || 'materia',
      sigla || '-',
      String(l.room || '').slice(0, 30) || '-',
    ].join('|');
  });

  const libere: string[] = [];
  const docentiInLista = Array.from(perId.keys());
  docentiInLista.forEach((id) => {
    const sigla = perId.get(id) as string;
    celle.forEach((c) => {
      if (libere.length >= MAX_LIBERE) return;
      if (docenteLibero(id, c.day, c.hour)) {
        libere.push(`${sigla}|${c.day}|${c.hour}`);
      }
    });
  });

  const problemi = conflitti
    .slice(0, MAX_PROBLEMI)
    .map((c) => {
      const testa = c?.type === 'warning' ? 'Avviso' : 'Errore';
      const dove = c?.slot
        ? ` [classe ${c.slot.classId}, giorno ${c.slot.day}, ora ${c.slot.hour}]`
        : '';
      return `${testa}: ${String(c?.message || '').slice(0, 300)}${dove}`;
    })
    .filter((p) => p.length > 10);

  // Nei messaggi dei conflitti i nomi ci sono davvero, ed è la cosa che non
  // deve uscire: si sostituiscono con la sigla del docente, e quelli che non
  // hanno una sigla (docenti fuori dalle classi coinvolte) con «un docente».
  const nomi = staff
    .map((s) => ({ id: String(s.id), nome: String(s.name || '') }))
    .filter((s) => s.nome.length > 2)
    .sort((a, b) => b.nome.length - a.nome.length);

  const senzaNomi = problemi.map((p) => {
    let testo = p;
    nomi.forEach((s) => {
      if (!testo.includes(s.nome)) return;
      const sigla = perId.get(s.id) || 'un docente';
      testo = testo.split(s.nome).join(sigla);
    });
    return testo;
  });

  return {
    giorni,
    problemi: senzaNomi,
    lezioni,
    libere,
    sigle: perId,
  };
}

/* ------------------------------------------------ la chiamata */

let statoInCorso: Promise<boolean> | null = null;

/** Dice se il sito ha un modello configurato per questa funzione. */
export function aiutoConflittiDisponibile(): Promise<boolean> {
  if (!statoInCorso) {
    statoInCorso = fetch(INDIRIZZO)
      .then((r) => (r.ok ? r.json() : { disponibile: false }))
      .then((d: { disponibile?: boolean }) => Boolean(d?.disponibile))
      .catch(() => false);
  }
  return statoInCorso;
}

/**
 * Manda la fotografia e riporta le mosse proposte. Le mosse non sono ancora
 * buone: sono solo proposte, e vanno passate a `provaMosse`.
 */
export async function chiediProposta(
  foto: Fotografia,
  credenziali: { licenza: string; istanza: string; clientId: string | null }
): Promise<Proposta> {
  const risposta = await fetch(INDIRIZZO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      giorni: foto.giorni,
      problemi: foto.problemi,
      lezioni: foto.lezioni,
      libere: foto.libere,
      licenza: credenziali.licenza,
      istanza: credenziali.istanza,
      clientId: credenziali.clientId,
    }),
  });

  let dati: {
    mosse?: Mossa[];
    nota?: string;
    errore?: string;
    licenzaMancante?: boolean;
    riattivare?: boolean;
  } = {};
  try {
    dati = await risposta.json();
  } catch {
    /* risposta illeggibile: sotto si usa lo stato HTTP */
  }

  if (risposta.status === 402 || dati.licenzaMancante) {
    throw new ErroreLicenzaConflitti(
      dati.errore || 'Serve la chiave dell’abbonamento.',
      dati.riattivare === true
    );
  }

  if (!risposta.ok) {
    throw new Error(dati.errore || 'Proposta non riuscita. Riprova fra poco.');
  }

  return {
    mosse: Array.isArray(dati.mosse) ? dati.mosse : [],
    nota: String(dati.nota || ''),
  };
}

/* ------------------------------------------------ la prova */

/** Quanto pesa un conflitto: un errore vale dieci avvisi. */
const peso = (conflitti: ConflittoLetto[]) => {
  const errori = conflitti.filter((c) => c?.type !== 'warning').length;
  return { errori, totale: conflitti.length, punti: errori * 10 + conflitti.length };
};

const uguale = (l: LezionePiazzata, classe: string, day: number, hour: number) =>
  String(l?.classId) === classe && l?.day === day && l?.hour === hour;

/**
 * Prova le mosse una dopo l'altra e tiene solo quelle che migliorano.
 *
 * È il punto in cui l'app smette di fidarsi del modello. Ogni mossa si applica
 * su una copia dell'orario, i conflitti si ricalcolano con `valuta`, che è lo
 * stesso calcolo del pannello, e la mossa resta solo se il peso scende. Le
 * mosse si provano nell'ordine proposto, perché la seconda spesso ha senso
 * solo dopo la prima.
 */
export function provaMosse(
  mosse: Mossa[],
  timetable: any[],
  valuta: (orario: any[]) => ConflittoLetto[],
  giorni: string[]
): EsitoProva {
  const partenza = peso(valuta(timetable));
  let corrente = timetable;
  let pesoCorrente = partenza;

  const accettate: MossaProvata[] = [];
  const scartate: MossaScartata[] = [];

  const nome = (m: Mossa) =>
    `${m.classe}, ${giorni[m.daGiorno] || `giorno ${m.daGiorno}`} ${etichettaOra(
      m.daOra
    )}ª ora → ${giorni[m.aGiorno] || `giorno ${m.aGiorno}`} ${etichettaOra(
      m.aOra
    )}ª ora`;

  mosse.forEach((m) => {
    const classe = String(m.classe);
    const descrizione = nome(m);

    const daSpostare = corrente.find((l) =>
      uguale(l, classe, m.daGiorno, m.daOra)
    );
    if (!daSpostare) {
      scartate.push({
        mossa: m,
        descrizione,
        motivo: 'in quella casella non c’è più la lezione di partenza',
      });
      return;
    }

    const allArrivo = corrente.find((l) => uguale(l, classe, m.aGiorno, m.aOra));

    const candidato = corrente.map((l) => {
      if (uguale(l, classe, m.daGiorno, m.daOra)) {
        return { ...l, day: m.aGiorno, hour: m.aOra };
      }
      if (allArrivo && uguale(l, classe, m.aGiorno, m.aOra)) {
        return { ...l, day: m.daGiorno, hour: m.daOra };
      }
      return l;
    });

    const dopo = peso(valuta(candidato));
    if (dopo.punti >= pesoCorrente.punti) {
      scartate.push({
        mossa: m,
        descrizione,
        motivo:
          dopo.punti === pesoCorrente.punti
            ? 'non cambia niente'
            : 'creerebbe più problemi di quanti ne toglie',
      });
      return;
    }

    accettate.push({
      mossa: m,
      descrizione,
      primaErrori: pesoCorrente.errori,
      dopoErrori: dopo.errori,
      primaTotale: pesoCorrente.totale,
      dopoTotale: dopo.totale,
      scambio: Boolean(allArrivo),
    });
    corrente = candidato;
    pesoCorrente = dopo;
  });

  return {
    timetable: corrente,
    accettate,
    scartate,
    primaErrori: partenza.errori,
    dopoErrori: pesoCorrente.errori,
    primaTotale: partenza.totale,
    dopoTotale: pesoCorrente.totale,
  };
}
