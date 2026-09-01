/**
 * Import degli elenchi «classe → docenti» che le scuole tengono in un PDF.
 *
 * Il lavoro si fa in due tempi, e il primo basta quasi sempre:
 *
 * 1. Il PDF si apre qui dentro, nel browser. Il testo si estrae con pdf.js e
 *    lo legge un piccolo interprete scritto a mano, che cerca le classi
 *    dell'istituto e i nomi che le accompagnano. In questo passaggio non esce
 *    niente: nessuna rete, nessun server, nessun documento caricato da
 *    qualche parte.
 *
 * 2. Se il documento è fatto in un modo che l'interprete non capisce (tabelle
 *    su più colonne, righe spezzate, sigle strane) si può chiedere aiuto a un
 *    modello linguistico, dall'endpoint /api/importa-docenti. È la parte
 *    dell'abbonamento, e va detto chiaro perché conta: in quel caso il testo
 *    del documento, nomi dei docenti compresi, esce dal computer e arriva
 *    alla società che gestisce il modello. Per questo la chiamata parte solo
 *    con una spunta esplicita, mai da sola.
 *
 * In tutti e due i casi non si scrive niente nel documento della scuola
 * finché la persona non guarda l'anteprima e conferma.
 */

/* --------------------------------------------------------------- tipi */

/** Una classe con i docenti letti dal documento, ancora come testo. */
export interface RigaLetta {
  classe: string;
  docenti: string[];
}

/** Come è andata la ricerca di un nome fra i docenti già presenti in app. */
export type EsitoNome = 'trovato' | 'nuovo' | 'ambiguo';

export interface DocenteProposto {
  /** Il nome così come sta nel documento, ripulito. */
  testo: string;
  /** L'id del docente in EduTime Pro, quando lo si è riconosciuto. */
  id: string | null;
  esito: EsitoNome;
  /** True finché la persona non lo toglie dall'anteprima. */
  scelto: boolean;
  /**
   * I docenti dell'app che potrebbero essere questa persona, quando ce n'è
   * più d'uno che ci somiglia: l'anteprima li mette in un menù e la scelta
   * la fa chi guarda.
   */
  candidati: { id: string; name: string }[];
}

export interface ClasseProposta {
  classe: string;
  docenti: DocenteProposto[];
}

/* -------------------------------------------------- lettura del file */

/**
 * Estrae il testo di un PDF. pdf.js si carica solo qui, con un import
 * dinamico: è una libreria grossa e chi non importa mai niente non deve
 * scaricarsela.
 *
 * Le righe si ricostruiscono dalla posizione verticale dei pezzi di testo:
 * il PDF non ha il concetto di riga, ha frammenti con delle coordinate. I
 * frammenti che stanno alla stessa altezza tornano sulla stessa riga,
 * separati da due spazi quando fra loro c'è un salto orizzontale: sono i due
 * spazi che più avanti fanno riconoscere le colonne di una tabella.
 */
export async function estraiTestoPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (
    await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  // Il documento non deve tirare giù font né altro da fuori: qui serve solo
  // il testo, e il file resta tutto in memoria.
  const caricamento = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableFontFace: true,
    disableAutoFetch: true,
  });
  const documento = await caricamento.promise;

  const pagine: string[] = [];
  try {
    for (let n = 1; n <= documento.numPages; n++) {
      const pagina = await documento.getPage(n);
      const contenuto = await pagina.getTextContent();

      let riga = '';
      let ultimaY: number | null = null;
      let ultimoFine = 0;
      const righe: string[] = [];

      for (const pezzo of contenuto.items) {
        const item = pezzo as {
          str?: string;
          width?: number;
          transform?: number[];
        };
        const testo = item.str ?? '';
        const t = item.transform;
        if (!t) continue;
        const x = t[4];
        const y = t[5];

        // Più di tre punti di dislivello: è una riga nuova.
        if (ultimaY !== null && Math.abs(y - ultimaY) > 3) {
          righe.push(riga.trim());
          riga = '';
          ultimoFine = 0;
        }
        if (riga && x - ultimoFine > 8) riga += '  ';
        riga += testo;
        ultimaY = y;
        ultimoFine = x + (item.width ?? 0);
      }
      righe.push(riga.trim());
      pagine.push(righe.filter(Boolean).join('\n'));
      pagina.cleanup();
    }
  } finally {
    await caricamento.destroy();
  }

  return pagine.join('\n');
}

/** Legge un file di testo semplice (txt, csv) così com'è. */
const leggiTesto = (file: File): Promise<string> => file.text();

/**
 * Apre il file scelto dalla persona e ne restituisce il testo. Lancia un
 * Error con un messaggio già pronto da mostrare quando il file non va bene.
 */
export async function testoDelFile(file: File): Promise<string> {
  const nome = file.name.toLowerCase();
  if (nome.endsWith('.pdf')) {
    let testo: string;
    try {
      testo = await estraiTestoPdf(file);
    } catch {
      throw new Error(
        'Non riesco ad aprire questo PDF. Se è protetto da password, toglila e riprova.'
      );
    }
    if (testo.replace(/\s/g, '').length < 20) {
      throw new Error(
        'Questo PDF non contiene testo: è la fotografia di un foglio. Serve un PDF con il testo dentro, oppure copia e incolla l\'elenco qui sotto.'
      );
    }
    return testo;
  }
  if (/\.(txt|csv|tsv)$/.test(nome)) return leggiTesto(file);
  throw new Error('Formato non riconosciuto: serve un PDF, un TXT o un CSV.');
}

/* ------------------------------------------------- interprete locale */

/** Toglie accenti e maiuscole, per confrontare due nomi scritti diversi. */
const senzaAccenti = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Titoli e sigle che precedono un nome e non fanno parte del nome. */
const TITOLI =
  /\b(?:prof(?:\.ssa|\.essa|essore|essoressa|\.)?|docente|docenti|sig(?:\.ra|\.)?|dott(?:\.ssa|\.)?|maestr[oa]|ins(?:\.)?)\b\.?/gi;

/**
 * Parole che compaiono negli elenchi scolastici e non sono nomi di persona.
 * Serve a non prendere per docente l'intestazione di una colonna o il nome
 * di una materia.
 */
const NON_NOMI = new Set(
  [
    'classe','classi','sezione','sezioni','docente','docenti','materia','materie',
    'disciplina','discipline','cognome','nome','nominativo','elenco','consiglio',
    'consigli','coordinatore','coordinatrice','segretario','segretaria','verbale',
    'anno','scolastico','istituto','comprensivo','scuola','secondaria','primaria',
    'plesso','sede','pagina','allegato','totale','ore','firma','presente','assente',
    'italiano','storia','geografia','matematica','scienze','inglese','francese',
    'spagnolo','tedesco','tecnologia','arte','immagine','musica','strumento',
    'motorie','motoria','sportive','religione','alternativa','sostegno','educazione',
    'civica','approfondimento','lettere','fisica','chimica','informatica','diritto',
    'economia','latino','greco','filosofia','laboratorio',
  ].map((v) => v)
);

/**
 * Costruisce l'espressione che riconosce le classi dell'istituto dentro il
 * testo. Si parte dalle classi vere, non da una forma generica: così un
 * «5 B» scritto in una nota a piè di pagina, se la 5B non esiste, non
 * diventa una classe.
 *
 * Fra anno e sezione si accettano spazio, °, ^ e -, che è come le scuole
 * scrivono le classi nei documenti.
 */
const regexClassi = (classi: string[]): RegExp | null => {
  const pezzi = classi
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((c) => {
      const m = /^(\d+)\s*(.+)$/.exec(c);
      const corpo = m
        ? `${m[1]}\\s*[°^\\-.]?\\s*${m[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
        : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return corpo;
    });
  if (!pezzi.length) return null;
  return new RegExp(`(?<![A-Z0-9])(?:${pezzi.join('|')})(?![A-Z0-9])`, 'g');
};

/** Da «1 ^ A» all'id della classe in app, «1A». */
const idClasse = (trovato: string): string =>
  trovato.replace(/[\s°^\-.]/g, '').toUpperCase();

/**
 * Dice se un pezzo di riga somiglia al nome di una persona: da due a quattro
 * parole, tutte alfabetiche, e nessuna che sia una parola d'ufficio.
 */
const sembraNome = (pezzo: string): boolean => {
  const pulito = pezzo
    .replace(/\(.*?\)/g, ' ')
    .replace(TITOLI, ' ')
    .replace(/[^\p{L}'’\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!pulito) return false;
  const parole = pulito.split(' ');
  if (parole.length < 2 || parole.length > 4) return false;
  return parole.every((p) => {
    if (p.length < 2) return false;
    return !NON_NOMI.has(senzaAccenti(p).toLowerCase());
  });
};

/** Ripulisce il nome per come va mostrato e confrontato. */
export const nomePulito = (pezzo: string): string =>
  pezzo
    .replace(/\(.*?\)/g, ' ')
    .replace(TITOLI, ' ')
    .replace(/^[\s\d.\-–—•·|)]+/, '')
    .replace(/[^\p{L}'’\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

/**
 * Legge il testo e ne ricava l'elenco «classe → docenti».
 *
 * Riconosce i due modi in cui questi elenchi sono scritti quasi sempre:
 * a blocchi («CLASSE 1A» e sotto i nomi, fino alla classe successiva) e a
 * righe («ROSSI MARIO - MATEMATICA - 1A, 2B»). Quando una riga contiene sia
 * classi sia un nome, vince la lettura a righe.
 */
export function leggiElenco(testo: string, classi: string[]): RigaLetta[] {
  const re = regexClassi(classi);
  if (!re) return [];

  const perClasse = new Map<string, string[]>();
  const aggiungi = (classe: string, nome: string) => {
    const lista = perClasse.get(classe) ?? [];
    if (!lista.includes(nome)) lista.push(nome);
    perClasse.set(classe, lista);
  };

  let blocco: string[] = [];

  for (const grezza of testo.split('\n')) {
    const riga = grezza.replace(/\t/g, '  ').trimEnd();
    if (!riga.trim()) continue;

    re.lastIndex = 0;
    const trovate = Array.from(riga.toUpperCase().matchAll(re)).map((m) =>
      idClasse(m[0])
    );

    // Quello che resta della riga tolte le classi: lì dentro si cercano i nomi.
    re.lastIndex = 0;
    const resto = riga.replace(re, '  ');

    // Le colonne di una tabella arrivano separate da due spazi (li mette
    // l'estrattore del PDF); virgole, punti e virgola e pallini separano gli
    // elenchi scritti in fila; i due punti e il trattino con gli spazi
    // attorno staccano il nome dall'etichetta («Religione: NERI LUCIA»,
    // «ROSSI MARIO - Lettere»). Il trattino senza spazi resta attaccato: nei
    // cognomi doppi fa parte del nome.
    const pezzi = resto
      .split(/\s{2,}|[;,•·|:]|\s[-–—]\s/)
      .map((p) => p.trim())
      .filter(Boolean);
    const nomi = pezzi.filter(sembraNome).map(nomePulito).filter(Boolean);

    if (nomi.length && trovate.length) {
      trovate.forEach((c) => nomi.forEach((n) => aggiungi(c, n)));
      blocco = trovate;
      continue;
    }
    if (trovate.length) {
      blocco = trovate;
      continue;
    }
    if (nomi.length && blocco.length) {
      blocco.forEach((c) => nomi.forEach((n) => aggiungi(c, n)));
    }
  }

  return Array.from(perClasse.entries())
    .map(([classe, docenti]) => ({ classe, docenti }))
    .filter((r) => r.docenti.length)
    .sort((a, b) => a.classe.localeCompare(b.classe, 'it'));
}

/* ------------------------------------------- abbinamento con lo staff */

const chiaveOrdinata = (nome: string): string =>
  senzaAccenti(nome)
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');

const parole = (nome: string): string[] =>
  senzaAccenti(nome)
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * Cerca ogni nome letto fra i docenti già in app. L'ordine dei tentativi va
 * dal sicuro all'incerto: prima le stesse parole in qualunque ordine (nel
 * documento può esserci «MARIO ROSSI» dove in app c'è «ROSSI MARIO»), poi
 * cognome più iniziale, infine il solo cognome se in tutto l'istituto ce n'è
 * uno solo che si chiama così. Se i candidati restano due, il nome si segna
 * come ambiguo e la scelta la fa la persona.
 */
export function abbina(
  righe: RigaLetta[],
  staff: { id: string; name: string }[]
): ClasseProposta[] {
  const perChiave = new Map<string, { id: string; name: string }[]>();
  const perCognome = new Map<string, { id: string; name: string }[]>();
  const perCognomeIniziale = new Map<string, { id: string; name: string }[]>();

  const spingi = (
    mappa: Map<string, { id: string; name: string }[]>,
    chiave: string,
    valore: { id: string; name: string }
  ) => {
    if (!chiave) return;
    const lista = mappa.get(chiave) ?? [];
    lista.push(valore);
    mappa.set(chiave, lista);
  };

  staff.forEach((s) => {
    const voce = { id: String(s.id), name: String(s.name) };
    const p = parole(nomePulito(voce.name));
    if (!p.length) return;
    spingi(perChiave, chiaveOrdinata(nomePulito(voce.name)), voce);
    spingi(perCognome, p[0], voce);
    if (p[1]) spingi(perCognomeIniziale, `${p[0]} ${p[1][0]}`, voce);
  });

  const cerca = (
    nome: string
  ): {
    id: string | null;
    esito: EsitoNome;
    candidati: { id: string; name: string }[];
  } => {
    const p = parole(nome);
    if (!p.length) return { id: null, esito: 'nuovo', candidati: [] };

    const tentativi = [
      perChiave.get(chiaveOrdinata(nome)),
      p[1] ? perCognomeIniziale.get(`${p[0]} ${p[1][0]}`) : undefined,
      perCognome.get(p[0]),
    ];
    for (const candidati of tentativi) {
      if (!candidati || !candidati.length) continue;
      if (candidati.length === 1)
        return { id: candidati[0].id, esito: 'trovato', candidati };
      return { id: null, esito: 'ambiguo', candidati };
    }
    return { id: null, esito: 'nuovo', candidati: [] };
  };

  return righe.map((r) => ({
    classe: r.classe,
    docenti: r.docenti.map((testo) => {
      const { id, esito, candidati } = cerca(testo);
      return { testo, id, esito, scelto: true, candidati };
    }),
  }));
}

/* --------------------------------------------- lettura assistita (IA) */

const INDIRIZZO = '/api/importa-docenti';

/** Errore che dice al pannello di riaprire il campo della chiave. */
export class ErroreLicenzaImport extends Error {}

/** Lo stato si chiede una volta sola: non cambia mentre l'app è aperta. */
let statoInCorso: Promise<boolean> | null = null;

/** True se sul server c'è un modello configurato per la lettura assistita. */
export function letturaAssistitaDisponibile(): Promise<boolean> {
  if (!statoInCorso) {
    statoInCorso = fetch(INDIRIZZO)
      .then((r) => (r.ok ? r.json() : { disponibile: false }))
      .then((d: { disponibile?: boolean }) => Boolean(d?.disponibile))
      .catch(() => false);
  }
  return statoInCorso;
}

/**
 * Manda il testo del documento al modello e riporta l'elenco che ne esce.
 *
 * Da qui esce il testo del PDF con dentro i nomi dei docenti: è il passaggio
 * che l'interfaccia fa accettare con una spunta prima di arrivare qui.
 */
export async function letturaAssistita(
  testo: string,
  classi: string[],
  nomiNoti: string[],
  credenziali: { licenza: string; istanza: string; clientId: string | null }
): Promise<RigaLetta[]> {
  let risposta: Response;
  try {
    risposta = await fetch(INDIRIZZO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testo,
        classi,
        nomiNoti,
        licenza: credenziali.licenza,
        istanza: credenziali.istanza,
        clientId: credenziali.clientId,
      }),
    });
  } catch {
    throw new Error(
      'Non riesco a collegarmi per far leggere il documento. Controlla la connessione e riprova.'
    );
  }

  let dati: {
    classi?: { classe?: string; docenti?: string[] }[];
    errore?: string;
    licenzaMancante?: boolean;
  } = {};
  try {
    dati = await risposta.json();
  } catch {
    /* corpo vuoto o non JSON: sotto c'è già un messaggio di scorta */
  }

  const messaggio =
    dati.errore || 'Non sono riuscito a leggere il documento. Riprova fra poco.';

  if (risposta.status === 402 || dati.licenzaMancante) {
    throw new ErroreLicenzaImport(messaggio);
  }
  if (!risposta.ok || !Array.isArray(dati.classi)) {
    throw new Error(messaggio);
  }

  return dati.classi
    .map((r) => ({
      classe: String(r?.classe || '').toUpperCase(),
      docenti: Array.isArray(r?.docenti)
        ? Array.from(
            new Set(r.docenti.map((d) => nomePulito(String(d))).filter(Boolean))
          )
        : [],
    }))
    .filter((r) => r.classe && r.docenti.length);
}
