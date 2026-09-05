/**
 * Le richieste che i docenti mandano a parole, trasformate in vincoli, dalla
 * parte del browser.
 *
 * «Il mercoledì non posso, ho il rientro all'altra scuola.» «Preferirei non
 * avere prime ore il lunedì.» Dentro EduTime Pro quelle frasi sono spunte:
 * giorno libero, ora bloccata, preferenza oraria. Copiarle a mano per settanta
 * docenti è mezza giornata da copista, ed è il lavoro in cui si sbaglia di
 * più, perché a metà pomeriggio si comincia a leggere in diagonale.
 *
 * Il testo esce dal computer, con i nomi dentro: per questo il pannello mette
 * una spunta esplicita prima di partire, come per la lettura dei PDF.
 *
 * Il modello propone, non applica. Ogni richiesta torna con il nome, il
 * vincolo e la frase originale da cui l'ha ricavata; qui il nome si abbina ai
 * docenti in archivio e la riga finisce in un elenco con le caselle da
 * spuntare. Le regole cambiano solo quando la persona preme «Applica».
 */

import { chiediAlServer, funzioneIaDisponibile } from './iaComune';
import { nomePulito } from './letturaElenchi';

const INDIRIZZO = '/api/richieste-docenti';

export type TipoRichiesta = 'giorno-libero' | 'ora-bloccata' | 'preferenza';

export interface RichiestaLetta {
  /** Identificativo di riga, per le caselle da spuntare nel pannello. */
  rif: string;
  tipo: TipoRichiesta;
  /** Il docente riconosciuto in archivio, quando c'è. */
  teacherId: string | null;
  nomeLetto: string;
  giorno: number | null;
  ora: number | null;
  preferenza: 'prime' | 'ultime' | null;
  citazione: string;
  /** Falso quando il modello stesso dice di non essere sicuro. */
  sicuro: boolean;
  /** Vero quando il vincolo c'è già: la riga si mostra spenta. */
  giaPresente: boolean;
}

export interface EsitoRichieste {
  richieste: RichiestaLetta[];
  /** Nomi che in archivio non ci sono: quelle righe non si possono applicare. */
  nomiSconosciuti: string[];
  nota: string;
}

export const letturaRichiesteDisponibile = (): Promise<boolean> =>
  funzioneIaDisponibile(INDIRIZZO);

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
 * Cerca il docente in archivio. Prima il nome intero, poi il solo cognome:
 * nelle mail il nome di battesimo spesso non c'è. Due persone con lo stesso
 * cognome fermano l'abbinamento: meglio una riga da sistemare a mano che il
 * giorno libero dato alla collega sbagliata.
 */
const abbina = (nomeLetto: string, noti: PersonaNota[]): string | null => {
  const cercato = perConfronto(nomeLetto);
  if (!cercato) return null;

  const esatti = noti.filter((p) => perConfronto(p.name) === cercato);
  if (esatti.length === 1) return esatti[0].id;
  if (esatti.length > 1) return null;

  const parole = cercato.split(' ').filter((p) => p.length >= 3);
  if (!parole.length) return null;

  const perCognome = noti.filter((p) => {
    const parti = perConfronto(p.name).split(' ');
    return parole.some((parola) => parti.includes(parola));
  });
  return perCognome.length === 1 ? perCognome[0].id : null;
};

/** La chiave con cui l'app segna un'ora bloccata dentro le regole. */
const chiaveOra = (giorno: number, ora: number) => `${giorno}_${ora}`;

interface RispostaRichieste {
  richieste?: {
    docente?: string;
    tipo?: string;
    giorno?: number | null;
    ora?: number | null;
    preferenza?: string | null;
    citazione?: string;
    sicuro?: boolean;
  }[];
  nota?: string;
}

/**
 * Manda il testo delle richieste e riporta le righe già abbinate ai docenti
 * dell'app, con segnato quali vincoli ci sono già.
 *
 * `regoleAttuali` serve per l'ultima colonna: una richiesta già rispettata non
 * va nascosta (chi legge vuole sapere che è stata vista) ma va segnata, così
 * la spunta parte spenta e non si riscrive quello che c'è.
 */
export async function leggiRichieste(
  testo: string,
  opzioni: {
    docentiNoti: PersonaNota[];
    giorni: string[];
    ore: number;
    regoleAttuali: {
      teacherDaysOff?: Record<string, number[]>;
      teacherHoursOff?: Record<string, string[]>;
      teacherHourPreference?: Record<string, string>;
    };
  }
): Promise<EsitoRichieste> {
  const dati = await chiediAlServer<RispostaRichieste>(INDIRIZZO, {
    testo,
    nomiNoti: opzioni.docentiNoti.map((d) => d.name).filter(Boolean),
    giorni: opzioni.giorni,
    ore: opzioni.ore,
  });

  const nomiSconosciuti = new Set<string>();
  const richieste: RichiestaLetta[] = [];

  (dati.richieste || []).forEach((r, indice) => {
    const tipo = String(r?.tipo || '') as TipoRichiesta;
    const nomeLetto = String(r?.docente || '').trim();
    const teacherId = abbina(nomeLetto, opzioni.docentiNoti);
    if (!teacherId && nomeLetto) nomiSconosciuti.add(nomeLetto);

    const giorno =
      typeof r?.giorno === 'number' && r.giorno >= 0 && r.giorno < opzioni.giorni.length
        ? r.giorno
        : null;
    const ora =
      typeof r?.ora === 'number' && r.ora >= 0 && r.ora < opzioni.ore ? r.ora : null;
    const preferenza =
      r?.preferenza === 'prime' || r?.preferenza === 'ultime' ? r.preferenza : null;

    let giaPresente = false;
    if (teacherId) {
      if (tipo === 'giorno-libero' && giorno !== null) {
        giaPresente = (
          opzioni.regoleAttuali.teacherDaysOff?.[teacherId] || []
        ).includes(giorno);
      } else if (tipo === 'ora-bloccata' && giorno !== null && ora !== null) {
        giaPresente = (
          opzioni.regoleAttuali.teacherHoursOff?.[teacherId] || []
        ).includes(chiaveOra(giorno, ora));
      } else if (tipo === 'preferenza' && preferenza) {
        const attuale = opzioni.regoleAttuali.teacherHourPreference?.[teacherId];
        giaPresente = attuale === (preferenza === 'prime' ? 'early' : 'late');
      }
    }

    richieste.push({
      rif: `r${indice}`,
      tipo,
      teacherId,
      nomeLetto,
      giorno,
      ora,
      preferenza,
      citazione: String(r?.citazione || ''),
      sicuro: r?.sicuro !== false,
      giaPresente,
    });
  });

  return {
    richieste,
    nomiSconosciuti: Array.from(nomiSconosciuti).slice(0, 60),
    nota: String(dati.nota || ''),
  };
}

/**
 * Scrive le richieste scelte dentro le regole di generazione e restituisce le
 * regole nuove. Non tocca quelle vecchie: le somma, perché quello che c'era
 * dentro è stato messo a mano da qualcuno e non va cancellato da una mail
 * letta male.
 */
export function applicaRichieste(
  regole: Record<string, unknown>,
  scelte: RichiestaLetta[]
): Record<string, unknown> {
  const daysOff: Record<string, number[]> = {
    ...((regole.teacherDaysOff as Record<string, number[]>) || {}),
  };
  const hoursOff: Record<string, string[]> = {
    ...((regole.teacherHoursOff as Record<string, string[]>) || {}),
  };
  const preferenze: Record<string, string> = {
    ...((regole.teacherHourPreference as Record<string, string>) || {}),
  };

  scelte.forEach((r) => {
    if (!r.teacherId) return;

    if (r.tipo === 'giorno-libero' && r.giorno !== null) {
      const attuali = daysOff[r.teacherId] || [];
      if (!attuali.includes(r.giorno)) {
        daysOff[r.teacherId] = [...attuali, r.giorno].sort((a, b) => a - b);
      }
      return;
    }

    if (r.tipo === 'ora-bloccata' && r.giorno !== null && r.ora !== null) {
      const chiave = chiaveOra(r.giorno, r.ora);
      const attuali = hoursOff[r.teacherId] || [];
      if (!attuali.includes(chiave)) {
        hoursOff[r.teacherId] = [...attuali, chiave];
      }
      return;
    }

    if (r.tipo === 'preferenza' && r.preferenza) {
      preferenze[r.teacherId] = r.preferenza === 'prime' ? 'early' : 'late';
    }
  });

  return {
    ...regole,
    teacherDaysOff: daysOff,
    teacherHoursOff: hoursOff,
    teacherHourPreference: preferenze,
  };
}
