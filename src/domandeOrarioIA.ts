/**
 * Le domande sull'orario che c'è dentro l'app, dalla parte del browser.
 *
 * «Chi è libero giovedì alla terza?» «Quante ore buche ha la Bianchi?» «La 2B
 * quando fa musica?» Sono le domande che si fanno dieci volte al giorno
 * guardando la griglia e contando con il dito. Le risposte stanno tutte
 * dentro l'orario: manca solo qualcuno che le legga.
 *
 * I conti li fa questo file, non il modello. Le caselle libere, le ore buche
 * e i totali si calcolano qui e si mandano già fatti: un modello linguistico
 * messo a contare millecinquecento righe sbaglia, e sbaglia con sicurezza,
 * che è il modo peggiore. Al modello resta la parte che sa fare: capire la
 * domanda e scrivere la risposta.
 *
 * I nomi non escono: ogni docente diventa una sigla, e le sigle tornano nomi
 * nella risposta prima che la persona la legga.
 */

import {
  chiediAlServer,
  funzioneIaDisponibile,
  rimettiNomi,
} from './iaComune';

const INDIRIZZO = '/api/domande-orario';

export interface MessaggioOrario {
  ruolo: 'user' | 'assistant';
  testo: string;
}

export interface LezioneOrario {
  classId?: string;
  day?: number;
  hour?: number;
  subject?: string;
  teacherId?: string | null;
  room?: string | null;
}

export interface PersonaOrario {
  id: string;
  name: string;
  subject?: string;
}

export interface DatiOrario {
  lezioni: LezioneOrario[];
  persone: PersonaOrario[];
  giorni: string[];
  /** Quante ore ha la giornata più lunga. */
  ore: number;
  /** Il docente è indisponibile in quella casella (giorno libero, ore bloccate). */
  indisponibile?: (teacherId: string, day: number, hour: number) => boolean;
}

export const domandeOrarioDisponibili = (): Promise<boolean> =>
  funzioneIaDisponibile(INDIRIZZO);

const MAX_LEZIONI = 1500;

interface Fotografia {
  lezioni: string[];
  liberi: string[];
  docenti: string[];
  perSigla: Map<string, string>;
}

/**
 * Prepara le tre tabelle che il modello riceve: le lezioni, chi è libero in
 * ogni casella, il riepilogo per docente.
 *
 * Le ore buche si contano come le conta la scuola: i vuoti fra la prima e
 * l'ultima ora della giornata, non i vuoti prima di entrare o dopo essere
 * usciti.
 */
const costruisciFotografia = (dati: DatiOrario): Fotografia => {
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

  // Le sigle si assegnano prima, in ordine di elenco: così restano stabili
  // fra una domanda e l'altra della stessa conversazione.
  dati.persone.forEach((p) => siglaDi(p.id));

  const valide = dati.lezioni.filter(
    (l) =>
      l?.classId !== undefined &&
      typeof l.day === 'number' &&
      typeof l.hour === 'number'
  );

  const lezioni = valide.slice(0, MAX_LEZIONI).map((l) => {
    const id = l.teacherId ? String(l.teacherId) : '';
    return [
      String(l.classId),
      String(l.day),
      String(l.hour),
      String(l.subject || 'materia').slice(0, 40),
      id ? siglaDi(id) : '-',
      String(l.room || '-').slice(0, 30),
    ].join('|');
  });

  /** Chi ha lezione in quella casella. */
  const occupati = new Map<string, Set<string>>();
  valide.forEach((l) => {
    if (!l.teacherId) return;
    const chiave = `${l.day}_${l.hour}`;
    const gia = occupati.get(chiave) ?? new Set<string>();
    gia.add(String(l.teacherId));
    occupati.set(chiave, gia);
  });

  const liberi: string[] = [];
  for (let day = 0; day < dati.giorni.length; day += 1) {
    for (let hour = 0; hour < dati.ore; hour += 1) {
      const impegnati = occupati.get(`${day}_${hour}`) ?? new Set<string>();
      const disponibili = dati.persone
        .filter((p) => !impegnati.has(p.id))
        .filter((p) => !dati.indisponibile?.(p.id, day, hour))
        .map((p) => sigle.get(p.id) as string)
        .filter(Boolean);
      liberi.push(`${day}|${hour}|${disponibili.join(',') || '-'}`);
    }
  }

  const docenti = dati.persone.map((p) => {
    const sue = valide.filter((l) => String(l.teacherId) === p.id);
    const oreSettimanali = sue.length;

    let buche = 0;
    const giorniConLezione = new Set<number>();
    for (let day = 0; day < dati.giorni.length; day += 1) {
      const ore = sue
        .filter((l) => l.day === day)
        .map((l) => l.hour as number)
        .sort((a, b) => a - b);
      if (!ore.length) continue;
      giorniConLezione.add(day);
      for (let h = ore[0]; h < ore[ore.length - 1]; h += 1) {
        if (!ore.includes(h)) buche += 1;
      }
    }

    const liberiInteri: string[] = [];
    for (let day = 0; day < dati.giorni.length; day += 1) {
      if (!giorniConLezione.has(day)) liberiInteri.push(dati.giorni[day]);
    }

    return [
      sigle.get(p.id) as string,
      String(p.subject || '-').slice(0, 30),
      String(oreSettimanali),
      String(buche),
      liberiInteri.join(',') || '-',
    ].join('|');
  });

  // La tabella dei nomi si costruisce solo adesso, quando le sigle sono
  // tutte assegnate: dentro `perSigla` finora c'erano gli identificativi.
  const nomiPerSigla = new Map<string, string>();
  dati.persone.forEach((p) => {
    const sigla = sigle.get(p.id);
    if (sigla && p.name) nomiPerSigla.set(sigla, p.name);
  });

  return { lezioni, liberi, docenti, perSigla: nomiPerSigla };
};

/**
 * Manda la conversazione e riporta la risposta con i nomi al posto delle
 * sigle. `messaggi` va dal più vecchio al più recente e finisce con la
 * domanda nuova.
 */
export async function chiediSullOrario(
  messaggi: MessaggioOrario[],
  dati: DatiOrario
): Promise<string> {
  const foto = costruisciFotografia(dati);

  const risposta = await chiediAlServer<{ risposta?: string }>(INDIRIZZO, {
    messaggi,
    lezioni: foto.lezioni,
    liberi: foto.liberi,
    docenti: foto.docenti,
    giorni: dati.giorni,
  });

  return rimettiNomi(String(risposta.risposta || ''), foto.perSigla);
}
