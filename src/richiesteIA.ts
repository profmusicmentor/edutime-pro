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
 * Sui nomi: non escono. Prima di mandare il testo, ogni docente in archivio
 * diventa una sigla (D1, D2, D3…), come già succede per le sostituzioni e per
 * le domande sull'orario. Il modello legge «D7 il mercoledì non può» e
 * risponde con la sigla; i nomi veri li rimette qui il browser, al ritorno.
 * Chi nell'archivio non c'è resta scritto come nel testo: quel nome esce, ma
 * è anche l'unico caso in cui non c'è niente a cui abbinarlo. Il pannello
 * tiene la spunta esplicita prima di partire, perché il motivo personale
 * della richiesta («ho il rientro all'altra scuola») sta nella frase e non
 * nel nome, e quello esce lo stesso.
 *
 * Il modello propone, non applica. Ogni richiesta torna con la sigla, il
 * vincolo e la frase originale da cui l'ha ricavata; qui la sigla ritorna
 * docente e la riga finisce in un elenco con le caselle da spuntare. Le
 * regole cambiano solo quando la persona preme «Applica».
 */

import { chiediAlServer, funzioneIaDisponibile, rimettiNomi } from './iaComune';
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

/* --- I nomi diventano sigle prima di uscire ------------------------- */

/**
 * Pezzi di cognome composto che da soli non indicano nessuno. Sostituirli
 * vorrebbe dire riempire il testo di sigle a caso: «di» compare in mezza
 * mail.
 */
const PARTICELLE = new Set([
  'di', 'de', 'del', 'della', 'dello', 'dei', 'degli', 'da', 'dal', 'dalla',
  'la', 'lo', 'le', 'li', 'van', 'von', 'mac', 'san', 'santa', 'santo', 'sant',
]);

/**
 * La forma con cui si confrontano due parole di un nome: senza accenti, senza
 * apostrofi, minuscola. «Nicolò» e «D'Amico» diventano «nicolo» e «damico»,
 * così l'archivio e la mail si riconoscono anche se sono scritti diversi.
 */
const perChiave = (testo: string): string =>
  testo
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
    .toLowerCase();

const perRegola = (testo: string): string =>
  testo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * «D'AMICO» scritto come lo scrive chi manda una mail: «D'Amico». La
 * maiuscola torna dopo ogni apostrofo e ogni trattino, non solo all'inizio,
 * altrimenti il cognome più comune del sud Italia resterebbe fuori dalla
 * mascheratura senza che nessuno se ne accorga.
 */
const conIniziali = (parola: string): string =>
  parola
    .toLowerCase()
    .replace(/(^|['’-])(\p{L})/gu, (_intero, prima: string, lettera: string) =>
      `${prima}${lettera.toUpperCase()}`
    );

interface Mascheratura {
  /** Il testo con le sigle al posto dei nomi riconosciuti. */
  testo: string;
  /** L'elenco da mandare al modello al posto dei nomi veri. */
  elenco: string[];
  /** sigla → identificativo del docente in archivio. */
  perSigla: Map<string, string>;
  /** sigla → nome vero, per rimetterlo nelle citazioni al ritorno. */
  nomiPerSigla: Map<string, string>;
}

/**
 * Sostituisce nel testo i nomi dei docenti in archivio con le loro sigle.
 *
 * Si lavora parola per parola e non sul nome intero, perché nelle mail il
 * nome completo quasi non c'è mai: si scrive «la prof.ssa Rossi», non «Rossi
 * Maria». Una parola si sostituisce solo se appartiene a un docente solo: due
 * colleghe con lo stesso cognome la lasciano stare, esattamente come fa
 * `abbina` al ritorno, e per lo stesso motivo.
 *
 * Si sostituisce solo la forma con l'iniziale maiuscola. È il freno contro i
 * cognomi che sono anche parole comuni: un docente Franco non deve
 * trasformare ogni «franco» della mail in una sigla.
 */
const mascheraNomi = (testo: string, noti: PersonaNota[]): Mascheratura => {
  const siglaDiId = new Map<string, string>();
  const perSigla = new Map<string, string>();
  const nomiPerSigla = new Map<string, string>();

  noti.forEach((persona, indice) => {
    const sigla = `D${indice + 1}`;
    siglaDiId.set(persona.id, sigla);
    perSigla.set(sigla, persona.id);
    nomiPerSigla.set(sigla, persona.name);
  });

  // Per ogni parola: di chi è, e come è scritta nell'archivio.
  const proprietari = new Map<string, Set<string>>();
  const forme = new Map<string, Set<string>>();

  noti.forEach((persona) => {
    nomePulito(persona.name)
      .split(/\s+/)
      .filter(Boolean)
      .forEach((parola) => {
        const chiave = perChiave(parola);
        if (chiave.length < 3 || PARTICELLE.has(chiave)) return;
        if (!proprietari.has(chiave)) {
          proprietari.set(chiave, new Set());
          forme.set(chiave, new Set());
        }
        proprietari.get(chiave)!.add(persona.id);
        forme.get(chiave)!.add(parola);
      });
  });

  let risultato = testo;

  Array.from(proprietari.entries())
    .filter(([, chi]) => chi.size === 1)
    .sort((a, b) => b[0].length - a[0].length)
    .forEach(([chiave, chi]) => {
      const sigla = siglaDiId.get(Array.from(chi)[0]);
      if (!sigla) return;

      const varianti = new Set<string>();
      forme.get(chiave)!.forEach((parola) => {
        varianti.add(parola);
        varianti.add(parola.toUpperCase());
        varianti.add(conIniziali(parola));
      });

      varianti.forEach((variante) => {
        // Solo iniziale maiuscola: vedi il commento sopra.
        if (variante === variante.toLowerCase()) return;
        // Niente `\b`: in JavaScript non conosce le lettere accentate, e
        // «Nicolò» resterebbe fuori. Il confine si scrive a mano.
        risultato = risultato.replace(
          new RegExp(
            `([^\\p{L}\\p{N}'’]|^)${perRegola(variante)}(?=[^\\p{L}\\p{N}'’]|$)`,
            'gu'
          ),
          `$1${sigla}`
        );
      });
    });

  // «Rossi Maria» è diventato «D3 D3»: se ne tiene una sola.
  perSigla.forEach((_id, sigla) => {
    risultato = risultato.replace(
      new RegExp(`${sigla}(?:[\\s,]+${sigla})+`, 'g'),
      sigla
    );
  });

  // «De Luca» è diventato «De D6»: la particella rimasta davanti alla sigla
  // non indica più nessuno e fa solo confusione.
  const particelle = Array.from(PARTICELLE)
    .map((p) => conIniziali(p))
    .join('|');
  risultato = risultato.replace(
    new RegExp(`(^|[^\\p{L}\\p{N}])(?:${particelle})\\s+(D\\d+)`, 'gu'),
    '$1$2'
  );

  return {
    testo: risultato,
    elenco: Array.from(perSigla.keys()),
    perSigla,
    nomiPerSigla,
  };
};

/** La sigla dentro quello che il modello ha scritto nel campo «docente». */
const siglaScritta = (testo: string): string | null => {
  const trovata = /(^|[^A-Za-z0-9])D(\d{1,4})(?![A-Za-z0-9])/.exec(testo);
  return trovata ? `D${trovata[2]}` : null;
};

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
  const maschera = mascheraNomi(testo, opzioni.docentiNoti);

  const dati = await chiediAlServer<RispostaRichieste>(INDIRIZZO, {
    testo: maschera.testo,
    nomiNoti: maschera.elenco,
    giorni: opzioni.giorni,
    ore: opzioni.ore,
  });

  const nomiSconosciuti = new Set<string>();
  const richieste: RichiestaLetta[] = [];

  (dati.richieste || []).forEach((r, indice) => {
    const tipo = String(r?.tipo || '') as TipoRichiesta;
    const scritto = String(r?.docente || '').trim();

    // Il modello ha lavorato con le sigle: quasi sempre torna una sigla, e
    // allora il docente è già deciso senza doverlo indovinare. Un nome vero
    // qui dentro vuol dire che nel testo c'era qualcuno che in archivio non
    // c'è: si prova ad abbinarlo come si è sempre fatto.
    const sigla = siglaScritta(scritto);
    const daSigla = sigla ? maschera.perSigla.get(sigla) ?? null : null;
    const nomeLetto = sigla
      ? maschera.nomiPerSigla.get(sigla) ?? scritto
      : scritto;
    const teacherId = daSigla ?? (sigla ? null : abbina(scritto, opzioni.docentiNoti));
    if (!teacherId && !sigla && nomeLetto) nomiSconosciuti.add(nomeLetto);

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
      citazione: rimettiNomi(String(r?.citazione || ''), maschera.nomiPerSigla),
      sicuro: r?.sicuro !== false,
      giaPresente,
    });
  });

  return {
    richieste,
    nomiSconosciuti: Array.from(nomiSconosciuti).slice(0, 60),
    nota: rimettiNomi(String(dati.nota || ''), maschera.nomiPerSigla),
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
