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
 * viene ricontrollata qui (giorno e ora devono stare dentro la griglia, la
 * classe deve avere la forma anno + sezione, il docente si cerca fra quelli
 * già in archivio) e finisce in un'anteprima con il conto di quante righe si
 * possono importare e quante no. L'orario dell'app cambia solo quando la
 * persona preme «Importa».
 *
 * Classi e docenti che nell'app non ci sono NON fanno buttare la riga: si
 * segnano come da creare. Chi arriva con l'orario completo dell'istituto e
 * l'app vuota è il caso normale, e pretendere che ribatta prima settanta nomi
 * a mano era il modo migliore per farlo smettere al primo tentativo. La
 * decisione resta sua: nella finestra c'è una spunta, e finché non la mette
 * si importano solo le righe che stanno in piedi da sole.
 */

import { chiediAlServer, funzioneIaDisponibile } from './iaComune';
import { nomePulito } from './letturaElenchi';

const INDIRIZZO = '/api/importa-orario';

/**
 * Che posto occupa il docente dentro la casella.
 *
 * «materia» è il titolare, «compresenza» il secondo docente sulla stessa ora,
 * «sostegno» chi in archivio sta nell'elenco del sostegno: sono i tre tipi di
 * casella che l'app conosce già, e l'import non ne inventa un quarto.
 */
export type RuoloRiga = 'materia' | 'compresenza' | 'sostegno';

export interface RigaOrarioLetta {
  classId: string;
  day: number;
  hour: number;
  subject: string;
  /** Titolare, secondo docente o sostegno. */
  ruolo: RuoloRiga;
  /** Il docente riconosciuto fra quelli in archivio, quando c'è. */
  teacherId: string | null;
  /** Il nome come è arrivato dal documento, sempre. */
  nomeLetto: string;
  /** La classe della riga nell'app non c'è ancora: va creata. */
  classeNuova: boolean;
  /**
   * Il cognome corrisponde a più di una persona in archivio. Non si abbina e
   * non si crea: creare un terzo omonimo è peggio di una riga da fare a mano.
   */
  ambiguo: boolean;
}

export interface RigaScartata {
  riga: string;
  motivo: string;
}

export interface EsitoLetturaOrario {
  righe: RigaOrarioLetta[];
  scartate: RigaScartata[];
  /**
   * Quanti giorni e quante ore ha la settimana disegnata nel documento.
   * Quando sono più di quelli della griglia dell'app, le celle in eccesso non
   * hanno dove andare: la finestra lo dice, invece di lasciar credere che il
   * sabato sia sparito per un errore di lettura.
   */
  giorniDocumento: number | null;
  oreDocumento: number | null;
  /** Nomi trovati nel documento che in archivio non ci sono. */
  nomiSconosciuti: string[];
  /** Classi lette nel documento che nell'app non esistono ancora. */
  classiSconosciute: string[];
  nota: string;
}

/**
 * La classe come la scrive l'app: anno attaccato alla sezione, in maiuscolo.
 *
 * Serve per decidere se una classe letta nel documento si può creare davvero.
 * «1 A», «1a» e «1A» sono la stessa cosa; «PRIMA A» o «CLASSE» non sono una
 * classe e la riga si butta, perché quasi sempre è l'intestazione di una
 * colonna letta storta.
 */
const FORMA_CLASSE = /^(\d{1,2})([A-Z]{1,3})$/;

export const normalizzaClasse = (grezza: string): string | null => {
  const pulita = String(grezza || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');
  return FORMA_CLASSE.test(pulita) ? pulita : null;
};

export const letturaOrarioDisponibile = (): Promise<boolean> =>
  funzioneIaDisponibile(INDIRIZZO);

/** Persona già in archivio, nella forma minima che serve per abbinare. */
export interface PersonaNota {
  id: string;
  name: string;
  /**
   * In quale elenco sta, quando si sa. Serve a dare alla casella il tipo
   * giusto: il docente di sostegno riconosciuto in archivio entra come
   * sostegno anche se nel documento sta su una riga come tutti gli altri.
   */
  tipo?: 'materia' | 'sostegno' | 'strumento';
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
): { persona: PersonaNota | null; ambiguo: boolean } => {
  const cercato = perConfronto(nomeLetto);
  if (!cercato) return { persona: null, ambiguo: false };

  const esatti = noti.filter((p) => perConfronto(p.name) === cercato);
  if (esatti.length === 1) return { persona: esatti[0], ambiguo: false };
  if (esatti.length > 1) return { persona: null, ambiguo: true };

  const cognome = cercato.split(' ')[0];
  if (cognome.length < 3) return { persona: null, ambiguo: false };

  const perCognome = noti.filter((p) => {
    const parti = perConfronto(p.name).split(' ');
    return parti.includes(cognome);
  });
  if (perCognome.length === 1)
    return { persona: perCognome[0], ambiguo: false };
  return { persona: null, ambiguo: perCognome.length > 1 };
};

interface RispostaOrario {
  righe?: {
    classe?: string;
    giorno?: number;
    ora?: number;
    materia?: string;
    docente?: string;
  }[];
  giorniDocumento?: number | null;
  oreDocumento?: number | null;
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

  return componiEsito(dati, opzioni);
}

/**
 * Passa al setaccio le righe grezze, da qualunque parte arrivino.
 *
 * Le stesse regole valgono per la lettura fatta qui nel browser e per quella
 * fatta dal modello: giorno e ora dentro la griglia, classe con la forma
 * giusta, docente cercato in archivio, due posti per casella. Tenerle in un
 * punto solo è l'unico modo perché le due strade diano lo stesso risultato.
 */
export function componiEsito(
  dati: RispostaOrario,
  opzioni: {
    classiValide: string[];
    docentiNoti: PersonaNota[];
    giorni: string[];
    ore: number;
  }
): EsitoLetturaOrario {
  const classi = new Map(
    opzioni.classiValide.map((c) => [c.toUpperCase().replace(/\s+/g, ''), c])
  );
  const righe: RigaOrarioLetta[] = [];
  const scartate: RigaScartata[] = [];
  const nomiSconosciuti = new Set<string>();
  const classiSconosciute = new Set<string>();
  /**
   * Chi è già stato messo in una casella, casella per casella.
   *
   * Due docenti nella stessa ora della stessa classe sono la normalità: il
   * titolare e chi gli sta accanto, cioè la compresenza o il sostegno. Prima
   * la seconda riga si buttava, e su un orario vero questo voleva dire
   * perderne una su cinque: sparivano proprio le ore di sostegno, che sono
   * quelle che nessuno vuole ribattere a mano. Il terzo docente invece resta
   * fuori: l'app tiene due caselle per ora e in tre non è più un orario.
   */
  const dentroLaCasella = new Map<string, RigaOrarioLetta[]>();

  (dati.righe || []).forEach((r) => {
    const grezza = `${r?.classe ?? '?'} ${r?.giorno ?? '?'}/${r?.ora ?? '?'} ${
      r?.materia ?? ''
    } ${r?.docente ?? ''}`.trim();

    const scritta = String(r?.classe || '')
      .toUpperCase()
      .replace(/\s+/g, '');
    const gia = classi.get(scritta);
    const nuova = gia ? null : normalizzaClasse(scritta);
    const classe = gia || nuova;
    if (!classe) {
      scartate.push({
        riga: grezza,
        motivo: 'non sembra una classe (serve anno e sezione, tipo 1A)',
      });
      return;
    }
    if (!gia) classiSconosciute.add(classe);

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
    const giaDentro = dentroLaCasella.get(chiave) || [];
    if (giaDentro.length >= 2) {
      scartate.push({
        riga: grezza,
        motivo: 'in quella casella ci sono già due docenti',
      });
      return;
    }

    const nomeLetto = String(r?.docente || '').trim();
    const { persona, ambiguo } = abbina(nomeLetto, opzioni.docentiNoti);
    if (!persona && nomeLetto) {
      nomiSconosciuti.add(ambiguo ? `${nomeLetto} (più di uno con questo cognome)` : nomeLetto);
    }

    // La stessa persona due volte nella stessa ora è il documento letto
    // storto, non una compresenza con se stessa.
    const stessoNome = perConfronto(nomeLetto);
    if (
      stessoNome &&
      giaDentro.some((r2) => perConfronto(r2.nomeLetto) === stessoNome)
    ) {
      scartate.push({
        riga: grezza,
        motivo: 'quel docente è già in quella casella',
      });
      return;
    }

    /*
     * Il ruolo. Chi in archivio sta nell'elenco del sostegno entra come
     * sostegno comunque, anche se nel documento è il primo della casella:
     * l'elenco dell'app è più affidabile dell'ordine delle righe del PDF.
     * Vale lo stesso per chi in archivio non c'è ancora ma nel documento ha
     * «SOSTEGNO» al posto della materia, che è come lo scrivono tutti.
     * Fuori da quel caso il titolare è chi arriva per primo, e chi lo segue
     * gli sta accanto in compresenza. Si guarda però se il titolare c'è
     * davvero, non solo quanti sono: in una casella dove il sostegno è
     * finito per primo, il collega che viene dopo è il titolare, non una
     * compresenza appesa al nulla.
     */
    const materiaLetta = String(r?.materia || '')
      .trim()
      .toUpperCase();
    const ruolo: RuoloRiga =
      persona?.tipo === 'sostegno' || materiaLetta.startsWith('SOSTEGNO')
        ? 'sostegno'
        : giaDentro.some((r2) => r2.ruolo === 'materia')
          ? 'compresenza'
          : 'materia';

    const riga: RigaOrarioLetta = {
      classId: classe,
      day,
      hour,
      subject: String(r?.materia || '').slice(0, 40),
      ruolo,
      teacherId: persona?.id ?? null,
      nomeLetto,
      classeNuova: !gia,
      ambiguo,
    };
    dentroLaCasella.set(chiave, [...giaDentro, riga]);
    righe.push(riga);
  });

  const numeroSano = (valore: unknown): number | null => {
    const n = Number(valore);
    return Number.isInteger(n) && n > 0 && n < 30 ? n : null;
  };

  return {
    righe,
    scartate,
    giorniDocumento: numeroSano(dati.giorniDocumento),
    oreDocumento: numeroSano(dati.oreDocumento),
    nomiSconosciuti: Array.from(nomiSconosciuti).slice(0, 60),
    classiSconosciute: Array.from(classiSconosciute).sort(),
    nota: String(dati.nota || ''),
  };
}
