/**
 * Le cose che tutte le funzioni con l'intelligenza artificiale fanno uguali:
 * chiedere al server se la funzione è accesa, mandare la richiesta con le
 * credenziali dell'abbonamento, e riconoscere i due errori che vanno trattati
 * in modo speciale (chiave mancante e limite giornaliero).
 *
 * Prima stava scritto una volta per funzione. Con una funzione sola andava
 * bene; con sette diventa il posto dove si dimentica un pezzo, e il pezzo che
 * si dimentica è sempre lo stesso: la chiave scaduta che finisce mostrata
 * come «errore di rete», e la persona che ha pagato non capisce cosa deve
 * fare.
 *
 * Le sigle dei docenti non passano da qui: ogni funzione ha la sua fotografia
 * e se le costruisce da sola. Qui c'è solo il trasporto.
 */

import { leggiLicenza, leggiIstanza, idCliente } from './assistenteIA';

/** La chiave dell'abbonamento non è valida, o non è collegata a questo dispositivo. */
export class ErroreLicenzaIa extends Error {
  readonly riattivare: boolean;

  constructor(messaggio: string, riattivare: boolean) {
    super(messaggio);
    this.name = 'ErroreLicenzaIa';
    this.riattivare = riattivare;
  }
}

/** Il tetto giornaliero è finito: non è un guasto, e domani riparte. */
export class ErroreLimiteIa extends Error {
  constructor(messaggio: string) {
    super(messaggio);
    this.name = 'ErroreLimiteIa';
  }
}

export interface Credenziali {
  licenza: string;
  istanza: string;
  clientId: string | null;
}

/** Chiave, istanza e etichetta del dispositivo, come le tiene l'assistente. */
export const credenzialiIa = (): Credenziali => ({
  licenza: leggiLicenza(),
  istanza: leggiIstanza(),
  clientId: idCliente(),
});

/**
 * «Questa funzione è accesa su questo sito?». La risposta non cambia mentre
 * l'app è aperta, quindi si chiede una volta sola per indirizzo: serve a non
 * mostrare un pulsante che poi darebbe solo un errore.
 */
const statiInCorso = new Map<string, Promise<boolean>>();

export function funzioneIaDisponibile(indirizzo: string): Promise<boolean> {
  const gia = statiInCorso.get(indirizzo);
  if (gia) return gia;
  const richiesta = fetch(indirizzo)
    .then((r) => (r.ok ? r.json() : { disponibile: false }))
    .then((d: { disponibile?: boolean }) => Boolean(d?.disponibile))
    .catch(() => false);
  statiInCorso.set(indirizzo, richiesta);
  return richiesta;
}

interface RispostaConErrore {
  errore?: string;
  licenzaMancante?: boolean;
  riattivare?: boolean;
}

/**
 * Manda il corpo al server e riporta la risposta già letta.
 *
 * Gli errori arrivano con un messaggio scritto per essere mostrato così
 * com'è. I due casi speciali diventano eccezioni riconoscibili: la chiave che
 * manca (che va rimandata al pannello dell'abbonamento) e il tetto di oggi
 * (che non è un guasto).
 */
export async function chiediAlServer<T>(
  indirizzo: string,
  corpo: Record<string, unknown>
): Promise<T> {
  const risposta = await fetch(indirizzo, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...corpo, ...credenzialiIa() }),
  });

  let dati: (T & RispostaConErrore) | RispostaConErrore = {};
  try {
    dati = await risposta.json();
  } catch {
    // Una risposta senza JSON è già un guasto: il messaggio lo mette il ramo
    // qui sotto, che guarda lo stato HTTP.
  }

  const conErrore = dati as RispostaConErrore;

  if (risposta.status === 402 || conErrore.licenzaMancante) {
    throw new ErroreLicenzaIa(
      conErrore.errore || 'Serve la chiave dell’abbonamento.',
      conErrore.riattivare === true
    );
  }

  if (risposta.status === 429) {
    throw new ErroreLimiteIa(
      conErrore.errore || 'Hai finito le richieste di oggi. Riprova domani.'
    );
  }

  if (!risposta.ok) {
    throw new Error(conErrore.errore || 'Non è riuscito. Riprova fra poco.');
  }

  return dati as T;
}

/**
 * Rimette i nomi veri al posto delle sigle, nel testo che il modello ha
 * scritto.
 *
 * Le sigle si sostituiscono dalla più lunga alla più corta, altrimenti la
 * D1 si mangia la D10 e il testo finisce con «Rossi0». Il confine di parola
 * serve per la stessa ragione dall'altro lato: dentro «DAD» non c'è nessuna
 * D e non va toccata.
 */
export const rimettiNomi = (
  testo: string,
  perSigla: Map<string, string>
): string => {
  let risultato = testo;
  Array.from(perSigla.keys())
    .sort((a, b) => b.length - a.length)
    .forEach((sigla) => {
      const nome = perSigla.get(sigla);
      if (!nome) return;
      risultato = risultato.replace(
        new RegExp(`\\b${sigla}\\b`, 'g'),
        nome
      );
    });
  return risultato;
};

/**
 * Il messaggio da mostrare quando qualcosa va storto, qualunque cosa sia
 * arrivata. Sta qui perché la frase sull'abbonamento deve essere identica in
 * tutte le funzioni: chi la legge deve capire dove si incolla la chiave senza
 * doverlo chiedere.
 */
export const messaggioErroreIa = (errore: unknown): string => {
  if (errore instanceof ErroreLicenzaIa) {
    return `${errore.message} Le funzioni con l'intelligenza artificiale fanno parte dell'abbonamento EduTime Pro AI: la chiave si incolla dal pulsante «🔑 Abbonamento IA», in alto a destra.`;
  }
  if (errore instanceof ErroreLimiteIa) return errore.message;
  return errore instanceof Error ? errore.message : 'Non è riuscito.';
};
