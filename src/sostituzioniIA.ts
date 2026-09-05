/**
 * L'aiuto dell'IA sulle sostituzioni del giorno, dalla parte del browser.
 *
 * I candidati li trova l'app: per ogni ora scoperta sa già chi in quel
 * momento è libero, chi insegna in quella classe, chi ha la stessa materia.
 * Quello che l'app non sa fare è scegliere fra dieci nomi tutti buoni,
 * tenendo conto di chi ha già coperto tanto e di chi ha la giornata piena.
 * Quella scelta, alle sette e cinquanta del mattino, è la parte che fa
 * litigare in sala docenti.
 *
 * Due cose contano più del resto, e sono le stesse dell'aiuto sui conflitti.
 *
 * 1. I nomi non escono. Ogni docente diventa una sigla (D1, D2, D3…) prima
 *    della chiamata, e la tabella delle sigle resta qui. Al modello serve
 *    sapere che D4 ha già coperto sei ore questo mese, non come si chiama.
 *
 * 2. La parola definitiva non è del modello. Ogni scelta che torna indietro
 *    viene ricontrollata: la sigla deve essere fra i candidati di
 *    QUELL'ora, e nessuno può finire in due classi nella stessa ora. Quello
 *    che non passa il controllo si butta, e resta scritto perché.
 *
 * Niente viene assegnato da qui: le proposte finiscono in un'anteprima, e le
 * sostituzioni si registrano solo quando la persona preme «Applica».
 */

import { chiediAlServer, funzioneIaDisponibile } from './iaComune';

const INDIRIZZO = '/api/sostituzioni';

/** Un'ora rimasta scoperta, con i candidati che l'app ha già filtrato. */
export interface BucoScoperto {
  /** Identificativo della riga, costruito dall'app: assenza, ora, classe. */
  rif: string;
  absenceId: string;
  classId: string;
  hour: number;
  subject: string;
  candidati: {
    teacherId: string;
    name: string;
    /** 0 insegna in quella classe, 1 stessa materia, 2 altri. */
    priority: number;
  }[];
}

export interface AssegnazioneProposta {
  buco: BucoScoperto;
  teacherId: string;
  nome: string;
  perche: string;
}

export interface SceltaScartata {
  rif: string;
  descrizione: string;
  motivo: string;
}

export interface EsitoSostituzioni {
  assegnazioni: AssegnazioneProposta[];
  scartate: SceltaScartata[];
  nota: string;
}

export const aiutoSostituzioniDisponibile = (): Promise<boolean> =>
  funzioneIaDisponibile(INDIRIZZO);

interface Fotografia {
  buchi: string[];
  carico: string[];
  sigle: Map<string, string>;
  perSigla: Map<string, string>;
}

/**
 * Prepara quello che si manda: una riga per ora scoperta con i suoi
 * candidati, più il carico di sostituzioni già accumulato da ciascuno.
 *
 * Il carico è il dato che l'app da sola non sa pesare e il modello sì: senza,
 * la scelta cade sempre sul primo della lista, che è sempre la stessa persona.
 */
const costruisciFotografia = (
  buchi: BucoScoperto[],
  caricoPerDocente: Map<string, number>
): Fotografia => {
  const sigle = new Map<string, string>();
  const perSigla = new Map<string, string>();

  const siglaDi = (teacherId: string): string => {
    const gia = sigle.get(teacherId);
    if (gia) return gia;
    const nuova = `D${sigle.size + 1}`;
    sigle.set(teacherId, nuova);
    perSigla.set(nuova, teacherId);
    return nuova;
  };

  const righe = buchi.map((b) => {
    const candidati = b.candidati
      .map((c) => {
        const carico = caricoPerDocente.get(c.teacherId) ?? 0;
        return `${siglaDi(c.teacherId)}:${c.priority}:${carico}`;
      })
      .join(',');
    return [
      b.rif,
      b.classId,
      String(b.hour),
      (b.subject || 'lezione').slice(0, 40),
      candidati || '-',
    ].join('|');
  });

  // Nel carico entrano anche i docenti che non sono candidati oggi: servono a
  // far vedere al modello com'è distribuito il peso, non solo la fetta di
  // stamattina.
  const carico: string[] = [];
  caricoPerDocente.forEach((ore, teacherId) => {
    const sigla = sigle.get(teacherId);
    if (sigla && ore > 0) carico.push(`${sigla}|${ore}`);
  });

  return { buchi: righe, carico, sigle, perSigla };
};

interface RispostaScelte {
  scelte?: { rif?: string; docente?: string; perche?: string }[];
  nota?: string;
}

/**
 * Chiede la proposta e riporta solo le scelte che reggono al controllo.
 *
 * Il controllo è la parte seria: un modello linguistico, messo davanti a
 * venti righe di candidati, ogni tanto prende la sigla della riga di sopra.
 * Una sigla fuori posto vorrebbe dire mandare in classe qualcuno che in
 * quell'ora sta già insegnando altrove, e nel foglio del giorno non si
 * vedrebbe.
 */
export async function chiediSostituzioni(
  buchi: BucoScoperto[],
  caricoPerDocente: Map<string, number>,
  giorno: string
): Promise<EsitoSostituzioni> {
  const foto = costruisciFotografia(buchi, caricoPerDocente);

  const dati = await chiediAlServer<RispostaScelte>(INDIRIZZO, {
    buchi: foto.buchi,
    carico: foto.carico,
    giorno,
  });

  const perRif = new Map(buchi.map((b) => [b.rif, b]));
  const assegnazioni: AssegnazioneProposta[] = [];
  const scartate: SceltaScartata[] = [];
  /** Chi è già stato impegnato in quell'ora, dentro questa stessa proposta. */
  const occupatiPerOra = new Map<number, Set<string>>();

  (dati.scelte || []).forEach((scelta) => {
    const rif = String(scelta?.rif || '');
    const buco = perRif.get(rif);
    const descrizione = buco
      ? `${buco.classId}, ${buco.hour + 1}ª ora`
      : `riga ${rif || 'senza riferimento'}`;

    if (!buco) {
      scartate.push({
        rif,
        descrizione,
        motivo: 'non corrisponde a nessuna ora scoperta',
      });
      return;
    }

    const teacherId = foto.perSigla.get(String(scelta?.docente || '').toUpperCase());
    const candidato = teacherId
      ? buco.candidati.find((c) => c.teacherId === teacherId)
      : undefined;

    if (!candidato) {
      scartate.push({
        rif,
        descrizione,
        motivo: 'ha scelto un docente che non era fra i candidati di quell’ora',
      });
      return;
    }

    const gia = occupatiPerOra.get(buco.hour) ?? new Set<string>();
    if (gia.has(candidato.teacherId)) {
      scartate.push({
        rif,
        descrizione,
        motivo: 'quel docente era già stato assegnato a un’altra classe nella stessa ora',
      });
      return;
    }
    gia.add(candidato.teacherId);
    occupatiPerOra.set(buco.hour, gia);

    assegnazioni.push({
      buco,
      teacherId: candidato.teacherId,
      nome: candidato.name,
      perche: String(scelta?.perche || '').slice(0, 200),
    });
  });

  return {
    assegnazioni,
    scartate,
    nota: String(dati.nota || ''),
  };
}
