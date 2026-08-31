/**
 * Il lato browser dell'assistente IA: parla con /api/assistente.
 *
 * La ricerca nella guida resta quella locale di `guidaIndice`: gratuita,
 * istantanea e senza rete. Questa parte è un di più per gli abbonati: una
 * conversazione a più battute con un modello linguistico. In rete vanno lo
 * scambio finora e i capitoli di guida che la ricerca locale ha scelto per
 * l'ultima domanda. La conversazione non viene salvata da nessuna parte:
 * vive nella pagina finché è aperta.
 *
 * Nessuna chiave qui dentro. La chiave del modello vive su Vercel, dietro
 * l'endpoint: se stesse nel bundle sarebbe leggibile da chiunque apra gli
 * strumenti per sviluppatori.
 */

import type { Risultato } from './guidaIndice';

/** Il numero massimo di domande per conversazione (allineato al server). */
export const MAX_TURNI = 5;

export interface Messaggio {
  ruolo: 'user' | 'assistant';
  testo: string;
}

const INDIRIZZO = '/api/assistente';

/** Identificatore casuale del browser: serve solo a contare le domande. */
const CHIAVE_CLIENTE = 'edutime.assistenteIA.cliente';

/** Dove il browser tiene la chiave di abbonamento incollata dall'utente. */
const CHIAVE_LICENZA = 'edutime.assistenteIA.licenza';

export interface StatoIA {
  disponibile: boolean;
  motore?: string;
  modello?: string;
  limiteGiorno?: number;
  /** True quando il server pretende una chiave di abbonamento valida. */
  richiedeLicenza?: boolean;
}

export interface RispostaIA {
  risposta: string;
  rimaste: number;
}

/**
 * Errore lanciato quando il server rifiuta la chiave di abbonamento (o non ne
 * ha ricevuta una). Il pannello lo riconosce e riapre il campo per incollarla,
 * invece di mostrarlo come un guasto qualsiasi.
 */
export class ErroreLicenza extends Error {}

/**
 * Errore lanciato quando la conversazione ha esaurito le sue battute. Il
 * pannello lo riconosce e propone di cominciarne una nuova.
 */
export class ErroreLimiteConversazione extends Error {}

/** La chiave di abbonamento salvata su questo browser, o stringa vuota. */
export const leggiLicenza = (): string => {
  try {
    return localStorage.getItem(CHIAVE_LICENZA)?.trim() || '';
  } catch {
    return '';
  }
};

/** Salva la chiave; una stringa vuota la cancella. */
export const salvaLicenza = (valore: string): void => {
  try {
    const pulita = valore.trim();
    if (pulita) localStorage.setItem(CHIAVE_LICENZA, pulita);
    else localStorage.removeItem(CHIAVE_LICENZA);
  } catch {
    /* browser senza storage: la chiave vale solo per questa sessione */
  }
};

/**
 * Un identificatore che non dice niente di chi lo porta: non è un login, non
 * è collegato al workspace e serve unicamente a non far sparare mille domande
 * dallo stesso browser. Se `localStorage` è chiuso si va avanti lo stesso e
 * il conteggio ricade sull'indirizzo di rete.
 */
const idCliente = (): string | null => {
  try {
    const salvato = localStorage.getItem(CHIAVE_CLIENTE);
    if (salvato) return salvato;
    const nuovo = crypto.randomUUID();
    localStorage.setItem(CHIAVE_CLIENTE, nuovo);
    return nuovo;
  } catch {
    return null;
  }
};

/** Lo stato si chiede una volta sola: non cambia mentre l'app è aperta. */
let statoInCorso: Promise<StatoIA> | null = null;

export function statoIA(): Promise<StatoIA> {
  if (!statoInCorso) {
    statoInCorso = fetch(INDIRIZZO)
      .then((r) => (r.ok ? (r.json() as Promise<StatoIA>) : { disponibile: false }))
      .catch(() => ({ disponibile: false }));
  }
  return statoInCorso;
}

/**
 * Manda la conversazione al modello, insieme ai capitoli trovati dalla ricerca
 * locale per l'ultima domanda. `messaggi` va dal più vecchio al più recente e
 * finisce con la riga `user` a cui rispondere adesso. Se qualcosa va storto
 * lancia un Error con un messaggio già scritto per essere mostrato così com'è
 * (o un ErroreLicenza / ErroreLimiteConversazione per i due casi speciali).
 */
export async function chiediInChat(
  messaggi: Messaggio[],
  risultati: Risultato[]
): Promise<RispostaIA> {
  const risposta = await fetch(INDIRIZZO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaggi,
      clientId: idCliente(),
      licenza: leggiLicenza(),
      contesto: risultati.map((r) => ({
        titolo: r.voce.titolo,
        capitolo: r.voce.capitoloTitolo,
        testo: r.voce.testo,
      })),
    }),
  });

  let dati: {
    risposta?: string;
    rimaste?: number;
    errore?: string;
    licenzaMancante?: boolean;
    limiteConversazione?: boolean;
  } = {};
  try {
    dati = await risposta.json();
  } catch {
    /* corpo vuoto o non JSON: sotto c'è già un messaggio di scorta */
  }

  const messaggio =
    dati.errore || "L'assistente non è riuscito a rispondere. Riprova fra poco.";

  if (risposta.status === 402 || dati.licenzaMancante) {
    throw new ErroreLicenza(messaggio);
  }
  if (risposta.status === 409 || dati.limiteConversazione) {
    throw new ErroreLimiteConversazione(messaggio);
  }

  if (!risposta.ok || !dati.risposta) {
    throw new Error(messaggio);
  }

  return { risposta: dati.risposta, rimaste: Number(dati.rimaste ?? 0) };
}
