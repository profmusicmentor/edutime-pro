/**
 * Lettura dell'orario che la scuola ha già, dalla parte del browser.
 *
 * È il muro del primo giorno: l'orario dell'anno scorso esiste, ma sta in un
 * PDF o in un foglio, e ribatterlo cella per cella dentro l'app vuol dire una
 * serata buttata prima ancora di aver capito se il programma serve. Qui il
 * documento si carica (PDF, TXT, CSV) oppure si incolla direttamente: da
 * Excel basta selezionare le celle e copiare, la tabella arriva come testo.
 *
 * Il testo va a un modello linguistico, che lo rimette in righe. A differenza
 * dell'aiuto sui conflitti, qui i nomi dei docenti escono davvero: sono il
 * dato da estrarre. Per questo la funzione parte solo dopo una spunta, e il
 * pannello lo dice a chiare lettere.
 *
 * Quello che torna indietro non è ancora un orario: è una proposta. Ogni riga
 * viene ricontrollata qui (la classe deve esistere, giorno e ora devono stare
 * dentro la griglia, il docente si cerca fra quelli già in archivio) e finisce
 * in un'anteprima con il conto di quante righe si possono importare e quante
 * no. L'orario dell'app cambia solo quando la persona preme «Importa».
 */

import { chiediAlServer, funzioneIaDisponibile } from './iaComune';
import { nomePulito } from './letturaElenchi';

const INDIRIZZO = '/api/importa-orario';

export interface RigaOrarioLetta {
  classId: string;
  day: number;
  hour: number;
  subject: string;
  /** Il docente riconosciuto fra quelli in archivio, quando c'è. */
  teacherId: string | null;
  /** Il nome come è arrivato dal documento, sempre. */
  nomeLetto: string;
}

export interface RigaScartata {
  riga: string;
  motivo: string;
}

export interface EsitoLetturaOrario {
  righe: RigaOrarioLetta[];
  scartate: RigaScartata[];
  /** Nomi trovati nel documento che in archivio non ci sono. */
  nomiSconosciuti: string[];
  nota: string;
}

export const letturaOrarioDisponibile = (): Promise<boolean> =>
  funzioneIaDisponibile(INDIRIZZO);

/** Persona già in archivio, nella forma minima che serve per abbinare. */
export interface PersonaNota {
  id: string;
  name: string;
}

const perConfronto = (nome: string): string =>
  nomePulito(nome)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Cerca il docente in archivio a partire dal nome scritto nel documento.
 *
 * Prima il confronto esatto sul nome ripulito, poi quello sul solo cognome:
 * nei PDF degli orari il nome di battesimo spesso non c'è, o c'è come
 * iniziale. Se il cognome corrisponde a due persone diverse non si sceglie:
 * meglio una riga da sistemare a mano che una lezione data alla collega
 * sbagliata.
 */
const abbina = (
  nomeLetto: string,
  noti: PersonaNota[]
): { id: string | null; ambiguo: boolean } => {
  const cercato = perConfronto(nomeLetto);
  if (!cercato) return { id: null, ambiguo: false };

  const esatti = noti.filter((p) => perConfronto(p.name) === cercato);
  if (esatti.length === 1) return { id: esatti[0].id, ambiguo: false };
  if (esatti.length > 1) return { id: null, ambiguo: true };

  const cognome = cercato.split(' ')[0];
  if (cognome.length < 3) return { id: null, ambiguo: false };

  const perCognome = noti.filter((p) => {
    const parti = perConfronto(p.name).split(' ');
    return parti.includes(cognome);
  });
  if (perCognome.length === 1) return { id: perCognome[0].id, ambiguo: false };
  return { id: null, ambiguo: perCognome.length > 1 };
};

interface RispostaOrario {
  righe?: {
    classe?: string;
    giorno?: number;
    ora?: number;
    materia?: string;
    docente?: string;
  }[];
  nota?: string;
}

/**
 * Manda il testo del documento e riporta le righe che reggono al controllo.
 *
 * `classiValide` sono le classi dell'istituto come le conosce l'app: una
 * riga che nomina una classe che non esiste si butta, perché quasi sempre
 * vuol dire che il modello ha letto storto l'intestazione di una colonna.
 */
export async function leggiOrarioDaTesto(
  testo: string,
  opzioni: {
    classiValide: string[];
    docentiNoti: PersonaNota[];
    giorni: string[];
    ore: number;
  }
): Promise<EsitoLetturaOrario> {
  const dati = await chiediAlServer<RispostaOrario>(INDIRIZZO, {
    testo,
    classi: opzioni.classiValide,
    nomiNoti: opzioni.docentiNoti.map((d) => d.name).filter(Boolean),
    giorni: opzioni.giorni,
    ore: opzioni.ore,
  });

  const classi = new Map(
    opzioni.classiValide.map((c) => [c.toUpperCase().replace(/\s+/g, ''), c])
  );
  const righe: RigaOrarioLetta[] = [];
  const scartate: RigaScartata[] = [];
  const nomiSconosciuti = new Set<string>();
  /** Una classe non può avere due lezioni nella stessa casella. */
  const occupate = new Set<string>();

  (dati.righe || []).forEach((r) => {
    const grezza = `${r?.classe ?? '?'} ${r?.giorno ?? '?'}/${r?.ora ?? '?'} ${
      r?.materia ?? ''
    } ${r?.docente ?? ''}`.trim();

    const classe = classi.get(
      String(r?.classe || '')
        .toUpperCase()
        .replace(/\s+/g, '')
    );
    if (!classe) {
      scartate.push({ riga: grezza, motivo: 'classe non presente nell’app' });
      return;
    }

    const day = Number(r?.giorno);
    const hour = Number(r?.ora);
    if (!Number.isInteger(day) || day < 0 || day >= opzioni.giorni.length) {
      scartate.push({ riga: grezza, motivo: 'giorno fuori dalla settimana' });
      return;
    }
    if (!Number.isInteger(hour) || hour < 0 || hour >= opzioni.ore) {
      scartate.push({ riga: grezza, motivo: 'ora fuori dalla griglia' });
      return;
    }

    const chiave = `${classe}_${day}_${hour}`;
    if (occupate.has(chiave)) {
      scartate.push({
        riga: grezza,
        motivo: 'quella classe ha già una lezione in quella casella',
      });
      return;
    }

    const nomeLetto = String(r?.docente || '').trim();
    const { id, ambiguo } = abbina(nomeLetto, opzioni.docentiNoti);
    if (!id && nomeLetto) {
      nomiSconosciuti.add(ambiguo ? `${nomeLetto} (più di uno con questo cognome)` : nomeLetto);
    }

    occupate.add(chiave);
    righe.push({
      classId: classe,
      day,
      hour,
      subject: String(r?.materia || '').slice(0, 40),
      teacherId: id,
      nomeLetto,
    });
  });

  return {
    righe,
    scartate,
    nomiSconosciuti: Array.from(nomiSconosciuti).slice(0, 60),
    nota: String(dati.nota || ''),
  };
}
