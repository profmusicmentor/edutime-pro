/**
 * I documenti che accompagnano l'orario, dalla parte del browser: la
 * relazione per il Dirigente, la circolare ai docenti, l'avviso alle
 * famiglie, il foglio delle sostituzioni, la convocazione dei consigli.
 *
 * Sono testi che si riscrivono ogni anno uguali e che nessuno ha voglia di
 * scrivere il giorno in cui l'orario è finalmente chiuso. I numeri li mette
 * l'app (quante classi, quante cattedre, quanti vincoli rispettati), le frasi
 * le mette il modello, e la persona corregge quello che vuole prima di
 * copiare.
 *
 * Sui nomi la regola è la stessa di sempre e la decide chi chiama: dove il
 * nome non serve si mandano le sigle e `rimettiNomi` le riporta a posto nel
 * testo finito. Dove il nome è il contenuto (il foglio delle sostituzioni del
 * giorno) il pannello lo dice prima, con la spunta.
 *
 * Niente parte da qui verso nessuno: il documento resta nell'app, e la mail
 * la manda la persona dalla casella della scuola.
 */

import {
  chiediAlServer,
  funzioneIaDisponibile,
  rimettiNomi,
} from './iaComune';

const INDIRIZZO = '/api/documenti';

export type TipoDocumento =
  | 'relazione-orario'
  | 'circolare-docenti'
  | 'circolare-famiglie'
  | 'foglio-sostituzioni'
  | 'convocazione-consigli';

export interface VoceDocumento {
  tipo: TipoDocumento;
  nome: string;
  descrizione: string;
  /** Vero quando i nomi dei docenti escono davvero: serve la spunta. */
  conNomi: boolean;
}

/** I documenti che si sanno scrivere, nell'ordine in cui si mostrano. */
export const DOCUMENTI: VoceDocumento[] = [
  {
    tipo: 'relazione-orario',
    nome: 'Relazione al Dirigente',
    descrizione:
      'I criteri seguiti, i vincoli rispettati e quello che non è stato possibile accontentare. Da allegare al collegio.',
    conNomi: false,
  },
  {
    tipo: 'circolare-docenti',
    nome: 'Circolare ai docenti',
    descrizione:
      'L’orario entra in vigore: da quando, dove si consulta, come si segnalano gli errori.',
    conNomi: false,
  },
  {
    tipo: 'circolare-famiglie',
    nome: 'Avviso alle famiglie',
    descrizione:
      'Entrate posticipate, uscite anticipate, variazioni di orario. Senza nomi di docenti.',
    conNomi: false,
  },
  {
    tipo: 'foglio-sostituzioni',
    nome: 'Comunicazione delle sostituzioni',
    descrizione:
      'L’elenco del giorno da appendere in sala docenti: ora, classe, chi copre.',
    conNomi: true,
  },
  {
    tipo: 'convocazione-consigli',
    nome: 'Convocazione dei consigli',
    descrizione:
      'Classi, date, orari, ordine del giorno e chi è tenuto a partecipare.',
    conNomi: false,
  },
];

export interface DocumentoScritto {
  titolo: string;
  testo: string;
}

export const documentiDisponibili = (): Promise<boolean> =>
  funzioneIaDisponibile(INDIRIZZO);

/**
 * Chiede il documento e riporta il testo con i nomi già rimessi al posto
 * delle sigle. `perSigla` è vuota per i documenti che i nomi non li usano.
 */
export async function scriviDocumento(
  tipo: TipoDocumento,
  dati: string[],
  opzioni: {
    richiesta?: string;
    istituto?: string;
    perSigla?: Map<string, string>;
  } = {}
): Promise<DocumentoScritto> {
  const risposta = await chiediAlServer<{ titolo?: string; testo?: string }>(
    INDIRIZZO,
    {
      tipo,
      dati,
      richiesta: opzioni.richiesta || '',
      istituto: opzioni.istituto || '',
    }
  );

  const perSigla = opzioni.perSigla;
  const testo = String(risposta.testo || '');
  const titolo = String(risposta.titolo || '');

  return {
    titolo: perSigla ? rimettiNomi(titolo, perSigla) : titolo,
    testo: perSigla ? rimettiNomi(testo, perSigla) : testo,
  };
}

/**
 * Salva il documento come file di testo. Non è un PDF di proposito: chi lo
 * riceve deve poterlo incollare nella circolare della scuola, che ha già la
 * sua carta intestata e il suo protocollo.
 */
export function scaricaDocumento(nomeFile: string, testo: string): void {
  const blob = new Blob([testo], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeFile.endsWith('.txt') ? nomeFile : `${nomeFile}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
