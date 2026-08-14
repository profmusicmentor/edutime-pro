/**
 * Gestione dello "spazio di lavoro" (la scuola su cui si sta lavorando).
 *
 * Due modalità:
 *  - locale: i dati restano nel browser (localStorage). Nessun invio in rete.
 *  - cloud : i dati stanno in un documento Firestore identificato dal codice
 *            scuola, così più persone possono lavorare insieme in tempo reale.
 *
 * Firebase viene caricato con un import dinamico: in modalità locale il
 * bundle non viene nemmeno scaricato.
 */

export type WorkspaceMode = 'locale' | 'cloud';

export interface Workspace {
  mode: WorkspaceMode;
  /** id del documento cloud oppure id dello slot locale */
  code: string;
  /** nome leggibile della scuola, mostrato nell'intestazione */
  label: string;
}

export type CloudStatus =
  | 'connessione'
  | 'sincronizzato'
  | 'salvataggio'
  | 'errore'
  | 'locale';

const WS_KEY = 'eduTime_workspace_v1';
const DATA_PREFIX = 'eduTime_data_';
export const CLOUD_COLLECTION = 'eduTimeApp_v6';
/** documento storico creato con la prima versione dell'app */
export const LEGACY_DOC_ID = 'masterTimetable';

/* ------------------------------------------------------------------ codici */

const ALPHABET = 'abcdefghijkmnopqrstuvwxyz23456789';

/**
 * Lunghezza minima del codice scuola. Le regole di sicurezza Firestore
 * rifiutano i codici più corti: un codice breve sarebbe indovinabile.
 */
export const MIN_CODE_LENGTH = 12;

const randomChunk = (len: number) => {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
};

/** Normalizza un codice scuola in una stringa usabile come id documento. */
export const normalizeCode = (raw: string): string => {
  if (raw.trim() === LEGACY_DOC_ID) return LEGACY_DOC_ID;
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
};

/**
 * Costruisce un codice difficile da indovinare a partire dal nome della
 * scuola: il codice funziona come una password condivisa.
 */
export const buildCode = (schoolName: string): string => {
  const base = normalizeCode(schoolName) || 'scuola';
  return `${base.slice(0, 24)}-${randomChunk(4)}-${randomChunk(4)}`;
};

/* -------------------------------------------------------------- workspace */

export const readStoredWorkspace = (): Workspace | null => {
  try {
    const raw = localStorage.getItem(WS_KEY);
    if (!raw) return null;
    const ws = JSON.parse(raw);
    if (ws && (ws.mode === 'locale' || ws.mode === 'cloud') && ws.code) {
      return ws as Workspace;
    }
  } catch {
    /* storage non disponibile o dato corrotto: si riparte dalla scelta */
  }
  return null;
};

export const storeWorkspace = (ws: Workspace) => {
  try {
    localStorage.setItem(WS_KEY, JSON.stringify(ws));
  } catch {
    /* modalità privata senza storage: si lavora comunque per questa sessione */
  }
};

export const forgetWorkspace = () => {
  try {
    localStorage.removeItem(WS_KEY);
  } catch {
    /* niente da fare */
  }
};

/** Codice scuola passato nell'URL (?scuola=...), usato per gli inviti. */
export const codeFromUrl = (): string | null => {
  try {
    const value = new URLSearchParams(window.location.search).get('scuola');
    if (!value) return null;
    const code = normalizeCode(value);
    return code.length >= MIN_CODE_LENGTH ? code : null;
  } catch {
    return null;
  }
};

/**
 * Estrae il codice scuola da un link di invito incollato per intero
 * (es. https://edutimepro.vercel.app/?scuola=ic-pascoli-ab12-cd34).
 * Restituisce null se nel testo non c'è un codice utilizzabile.
 */
export const codeFromInviteText = (raw: string): string | null => {
  const match = raw.match(/[?&]scuola=([^&\s]+)/i);
  if (!match) return null;
  let value = match[1];
  try {
    value = decodeURIComponent(value);
  } catch {
    /* valore già leggibile così com'è */
  }
  const code = normalizeCode(value);
  return code.length >= MIN_CODE_LENGTH ? code : null;
};

/** Vero se il testo sembra un indirizzo web invece che il nome di una scuola. */
export const looksLikeUrl = (raw: string): boolean =>
  /https?:\/\/|www\.|\.app\b|\.com\b|\.it\b|[?&]scuola=/i.test(raw.trim());

export const shareUrl = (code: string) =>
  `${window.location.origin}${window.location.pathname}?scuola=${encodeURIComponent(code)}`;

/** Rimette in pari la barra degli indirizzi con lo spazio di lavoro attivo. */
export const syncUrl = (ws: Workspace | null) => {
  try {
    const url = new URL(window.location.href);
    if (ws && ws.mode === 'cloud') url.searchParams.set('scuola', ws.code);
    else url.searchParams.delete('scuola');
    window.history.replaceState({}, '', url.toString());
  } catch {
    /* ambiente senza history API */
  }
};

/* ---------------------------------------------------------------- storage */

const localKey = (code: string) => `${DATA_PREFIX}${code}`;

const readLocal = (code: string): any | null => {
  try {
    const raw = localStorage.getItem(localKey(code));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeLocal = (code: string, data: any) => {
  localStorage.setItem(localKey(code), JSON.stringify(data));
};

let cloudPromise: Promise<any> | null = null;

/** Carica Firebase una sola volta e solo quando serve davvero. */
const getCloud = () => {
  if (!cloudPromise) {
    cloudPromise = (async () => {
      const [{ initializeApp }, authMod, storeMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const { firebaseConfig } = await import('./firebase-config.js');
      const app = initializeApp(firebaseConfig);
      const auth = authMod.getAuth(app);
      await authMod.signInAnonymously(auth);
      return { db: storeMod.getFirestore(app), storeMod };
    })();
  }
  return cloudPromise;
};

export interface SubscribeHandlers {
  /** dati trovati: vanno applicati allo stato dell'app */
  onData: (data: any) => void;
  /** spazio di lavoro nuovo: nessun dato ancora salvato */
  onEmpty: () => void;
  onStatus: (status: CloudStatus) => void;
}

/**
 * Si mette in ascolto dei dati dello spazio di lavoro.
 * Restituisce la funzione per interrompere l'ascolto.
 */
export const subscribeWorkspace = (
  ws: Workspace,
  handlers: SubscribeHandlers
): (() => void) => {
  const { onData, onEmpty, onStatus } = handlers;

  if (ws.mode === 'locale') {
    const data = readLocal(ws.code);
    if (data) onData(data);
    else onEmpty();
    onStatus('locale');
    return () => {};
  }

  let stopped = false;
  let unsubscribe: (() => void) | null = null;
  onStatus('connessione');

  getCloud()
    .then(({ db, storeMod }) => {
      if (stopped) return;
      const ref = storeMod.doc(db, CLOUD_COLLECTION, ws.code);
      unsubscribe = storeMod.onSnapshot(
        ref,
        (snap: any) => {
          if (snap.exists()) onData(snap.data());
          else onEmpty();
          onStatus('sincronizzato');
        },
        () => onStatus('errore')
      );
    })
    .catch(() => onStatus('errore'));

  return () => {
    stopped = true;
    if (unsubscribe) unsubscribe();
  };
};

/** Salva i dati dello spazio di lavoro (locale o cloud). */
export const persistWorkspace = async (
  ws: Workspace,
  data: any,
  onStatus: (status: CloudStatus) => void
) => {
  if (ws.mode === 'locale') {
    try {
      writeLocal(ws.code, data);
      onStatus('locale');
    } catch {
      onStatus('errore');
    }
    return;
  }

  onStatus('salvataggio');
  try {
    const { db, storeMod } = await getCloud();
    await storeMod.setDoc(storeMod.doc(db, CLOUD_COLLECTION, ws.code), data, {
      merge: true,
    });
    onStatus('sincronizzato');
  } catch {
    onStatus('errore');
  }
};

/** Verifica se un codice scuola esiste già sul cloud. */
export const cloudDocExists = async (code: string): Promise<boolean> => {
  const { db, storeMod } = await getCloud();
  const snap = await storeMod.getDoc(storeMod.doc(db, CLOUD_COLLECTION, code));
  return snap.exists();
};
