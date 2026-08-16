import { isValidElement } from 'react';
import type { ReactNode } from 'react';
import { chapters, steps } from './guidaContenuti';

/**
 * Indice di ricerca costruito sul testo della guida.
 *
 * L'assistente non usa un modello linguistico: appiattisce il JSX della guida
 * in testo, lo indicizza per parole e risponde con il pezzo di guida più
 * pertinente. Nessuna chiave API, nessuna chiamata di rete, nessun dato che
 * esce dal browser.
 */

export interface VoceGuida {
  /** Chiave stabile per React. */
  id: string;
  /** Ancora del capitolo nella pagina /guida. */
  capitoloId: string;
  capitoloNum: string;
  capitoloTitolo: string;
  titolo: string;
  tag?: string;
  testo: string;
}

export interface Risultato {
  voce: VoceGuida;
  punteggio: number;
  /** Frase (o due) della guida che risponde alla domanda. */
  estratto: string;
}

/* ------------------------------------------------------------------ */
/* Da JSX a testo                                                      */
/* ------------------------------------------------------------------ */

/**
 * Appiattisce un ReactNode in testo semplice. Oltre ai children gestisce la
 * prop `items` usata dal componente `Ul` della guida, che non passa figli.
 */
function nodoInTesto(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(nodoInTesto).join(' ');
  }
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode; items?: ReactNode[] };
    if (Array.isArray(props.items)) {
      return props.items.map(nodoInTesto).join('. ');
    }
    return nodoInTesto(props.children);
  }
  return '';
}

const ripulisci = (testo: string) =>
  testo
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();

/* ------------------------------------------------------------------ */
/* Costruzione dell'indice                                             */
/* ------------------------------------------------------------------ */

function costruisciVoci(): VoceGuida[] {
  const voci: VoceGuida[] = [];

  chapters.forEach((cap) => {
    voci.push({
      id: `${cap.id}-intro`,
      capitoloId: cap.id,
      capitoloNum: cap.num,
      capitoloTitolo: cap.title,
      titolo: cap.title,
      testo: ripulisci(nodoInTesto(cap.intro)),
    });

    cap.cards?.forEach((card, i) => {
      voci.push({
        id: `${cap.id}-card-${i}`,
        capitoloId: cap.id,
        capitoloNum: cap.num,
        capitoloTitolo: cap.title,
        titolo: card.title,
        tag: card.tag,
        testo: ripulisci(nodoInTesto(card.body)),
      });
    });

    if (cap.note) {
      voci.push({
        id: `${cap.id}-nota`,
        capitoloId: cap.id,
        capitoloNum: cap.num,
        capitoloTitolo: cap.title,
        titolo: cap.note.title,
        tag: 'nota',
        testo: ripulisci(nodoInTesto(cap.note.body)),
      });
    }
  });

  const capFlusso = chapters.find((c) => c.id === 'flusso');
  steps.forEach((step, i) => {
    voci.push({
      id: `flusso-step-${i}`,
      capitoloId: 'flusso',
      capitoloNum: capFlusso?.num ?? '10',
      capitoloTitolo: capFlusso?.title ?? 'Flusso di lavoro consigliato',
      titolo: `Passo ${i + 1} · ${step.title}`,
      tag: 'flusso di lavoro',
      testo: ripulisci(nodoInTesto(step.body)),
    });
  });

  return voci;
}

export const vociGuida: VoceGuida[] = costruisciVoci();

/** Quanti capitoli copre l'assistente, mostrato nell'intestazione. */
export const NUMERO_CAPITOLI = chapters.length;

/* ------------------------------------------------------------------ */
/* Normalizzazione e vocabolario                                       */
/* ------------------------------------------------------------------ */

const normalizza = (testo: string) =>
  testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const PAROLE_VUOTE = new Set([
  'ad', 'ai', 'al', 'alla', 'alle', 'allo', 'anche', 'ancora', 'avere',
  'aver', 'bisogna', 'che', 'chi', 'ci', 'cio', 'come', 'con', 'cosa',
  'cui', 'da', 'dal', 'dalla', 'dalle', 'dallo', 'degli', 'dei', 'del',
  'della', 'delle', 'dello', 'devo', 'di', 'dove', 'ed', 'essere', 'far',
  'fare', 'gli', 'ho', 'il', 'in', 'io', 'la', 'le', 'lo', 'loro', 'ma',
  'me', 'mi', 'mia', 'mie', 'miei', 'mio', 'ne', 'nei', 'nel', 'nella',
  'nelle', 'no', 'noi', 'non', 'per', 'perche', 'piu', 'posso', 'puo',
  'puoi', 'qual', 'quale', 'quali', 'quando', 'quel', 'quella', 'quelle',
  'quelli', 'quello', 'questa', 'queste', 'questi', 'questo', 'qui', 'se',
  'sei', 'serve', 'si', 'sono', 'su', 'sui', 'sul', 'sulla', 'sulle',
  'ti', 'tra', 'tu', 'tuo', 'un', 'una', 'uno', 'vi', 'voglio', 'vorrei',
]);

/**
 * Sinonimi e modi di dire con cui un docente pone la domanda, mappati sul
 * lessico che la guida usa davvero. Ogni gruppo è bidirezionale: se una
 * parola della query cade in un gruppo, tutte le altre entrano nella ricerca
 * con peso ridotto.
 */
const GRUPPI_SINONIMI: string[][] = [
  ['stampa', 'stampare', 'stampante', 'carta', 'cartaceo', 'a3', 'a4', 'pdf'],
  ['excel', 'xlsx', 'esporta', 'esportare', 'export', 'foglio', 'calcolo'],
  ['backup', 'salvare', 'salvataggio', 'salva', 'json', 'copia', 'perso',
    'perdere', 'ripristino', 'ripristinare', 'recuperare'],
  ['conflitto', 'conflitti', 'errore', 'errori', 'rosso', 'sovrapposizione',
    'sovrapposti', 'warning', 'avviso', 'problema', 'problemi'],
  ['genera', 'generare', 'generazione', 'automatica', 'automatico', 'auto',
    'creare', 'costruire', 'calcola', 'calcolare'],
  ['cattedra', 'cattedre', 'assegnazione', 'assegnare', 'assegna',
    'monteore', 'registro'],
  ['docente', 'docenti', 'professore', 'professori', 'prof', 'insegnante',
    'insegnanti', 'collega', 'colleghi'],
  ['classe', 'classi', 'sezione', 'sezioni', 'corso', 'corsi'],
  ['sostegno', 'disabilita', 'inclusione'],
  ['strumento', 'strumenti', 'musicale', 'musica', 'clarinetto', 'violino',
    'chitarra', 'pianoforte'],
  ['libero', 'liberi', 'indisponibilita', 'indisponibile', 'riposo'],
  ['sostituzione', 'sostituzioni', 'sostituto', 'supplenza', 'supplenze',
    'supplente', 'assenza', 'assenze', 'assente', 'permesso', 'malattia',
    'sorveglianza', 'retribuita'],
  ['buca', 'buche', 'vuota', 'vuote', 'scoperta', 'scoperte'],
  ['collaborare', 'condividere', 'condivisione', 'insieme', 'online',
    'cloud', 'invito', 'invitare', 'link'],
  ['primaria', 'elementare', 'elementari', 'maestra', 'maestro'],
  ['cancellare', 'eliminare', 'resettare', 'azzerare', 'reset', 'rimuovere',
    'togliere'],
  ['modificare', 'cambiare', 'spostare', 'correggere', 'sistemare',
    'aggiustare'],
  ['bloccare', 'blocco', 'bloccate', 'lucchetto', 'fissare', 'congelare'],
  ['aula', 'aule', 'laboratorio', 'laboratori', 'palestra'],
  ['privacy', 'personali', 'gdpr', 'sicurezza', 'riservatezza', 'dati'],
  ['campanella', 'orari', 'ricreazione', 'intervallo', 'durata', 'minuti'],
  ['mista', 'miste', 'accorpamento', 'accorpate', 'lingua', 'lingue',
    'inglese', 'spagnolo', 'francese', 'tedesco'],
  ['copresenza', 'compresenza', 'vincolo', 'vincoli', 'legare'],
  ['registrazione', 'account', 'password', 'login', 'iscrizione'],
];

function tokenizza(testo: string): string[] {
  return normalizza(testo)
    .split(' ')
    .filter((t) => t.length >= 2 && !PAROLE_VUOTE.has(t));
}

/**
 * Confronto tollerante alla morfologia italiana: "stampo" trova "stampa",
 * "celle" trova "cella", "conflitti" trova "conflitto". Niente stemmer: basta
 * un prefisso comune lungo, che però deve coprire buona parte della parola
 * più lunga — altrimenti "perso" finirebbe per trovare "personalizza".
 */
const PREFISSO_MINIMO = 4;
const COPERTURA_MINIMA = 0.6;

function combaciano(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < PREFISSO_MINIMO || b.length < PREFISSO_MINIMO) return false;
  let comune = 0;
  const limite = Math.min(a.length, b.length);
  while (comune < limite && a[comune] === b[comune]) comune += 1;
  if (comune < PREFISSO_MINIMO) return false;
  return comune / Math.max(a.length, b.length) >= COPERTURA_MINIMA;
}

/* ------------------------------------------------------------------ */
/* Indice invertito                                                    */
/* ------------------------------------------------------------------ */

const PESO_TITOLO = 6;
const PESO_TAG = 4;
const PESO_CAPITOLO = 3;
const PESO_TESTO = 1;

interface VoceIndicizzata {
  voce: VoceGuida;
  /** token → peso massimo del campo in cui compare */
  pesi: Map<string, number>;
  testoNormalizzato: string;
}

const indice: VoceIndicizzata[] = vociGuida.map((voce) => {
  const pesi = new Map<string, number>();
  const aggiungi = (testo: string, peso: number) => {
    tokenizza(testo).forEach((t) => {
      pesi.set(t, Math.max(pesi.get(t) ?? 0, peso));
    });
  };
  aggiungi(voce.titolo, PESO_TITOLO);
  if (voce.tag) aggiungi(voce.tag, PESO_TAG);
  aggiungi(voce.capitoloTitolo, PESO_CAPITOLO);
  aggiungi(voce.testo, PESO_TESTO);
  return { voce, pesi, testoNormalizzato: normalizza(voce.testo) };
});

/**
 * Quanto è informativa una parola. «Orario» compare in quasi ogni capitolo e
 * non distingue niente; «campanella» o «xls» compaiono in un punto solo e
 * valgono molto di più. Senza questa correzione una domanda come «come stampo
 * l'orario» premia le voci che nominano l'orario invece di quelle che parlano
 * di stampa.
 */
const frequenzaToken = (() => {
  const frequenza = new Map<string, number>();
  indice.forEach(({ pesi }) => {
    pesi.forEach((_, token) => {
      frequenza.set(token, (frequenza.get(token) ?? 0) + 1);
    });
  });
  return frequenza;
})();

const cacheRarita = new Map<string, number>();

/**
 * Rarità di una parola della domanda, calcolata sull'intera famiglia
 * morfologica: «orario» e «orari» sono la stessa parola, e se una delle due
 * compare ovunque nella guida allora entrambe pesano poco.
 */
function rarita(parola: string): number {
  const inCache = cacheRarita.get(parola);
  if (inCache !== undefined) return inCache;

  let frequenzaMassima = 0;
  frequenzaToken.forEach((df, token) => {
    if (combaciano(parola, token)) {
      frequenzaMassima = Math.max(frequenzaMassima, df);
    }
  });

  const valore = Math.log(1 + indice.length / (1 + frequenzaMassima));
  cacheRarita.set(parola, valore);
  return valore;
}

/* ------------------------------------------------------------------ */
/* Estratto                                                            */
/* ------------------------------------------------------------------ */

const LUNGHEZZA_MINIMA_ESTRATTO = 120;
const LUNGHEZZA_MASSIMA_ESTRATTO = 320;

function estraiFrase(testo: string, token: string[]): string {
  const frasi = testo.split(/(?<=[.!?:])\s+/).filter((f) => f.trim());
  if (!frasi.length) return testo.slice(0, LUNGHEZZA_MASSIMA_ESTRATTO);

  let migliore = 0;
  let punteggioMigliore = -1;
  frasi.forEach((frase, i) => {
    const tokenFrase = tokenizza(frase);
    const colpi = token.filter((q) =>
      tokenFrase.some((t) => combaciano(q, t))
    ).length;
    if (colpi > punteggioMigliore) {
      punteggioMigliore = colpi;
      migliore = i;
    }
  });

  let estratto = frasi[migliore];
  let i = migliore + 1;
  while (estratto.length < LUNGHEZZA_MINIMA_ESTRATTO && i < frasi.length) {
    estratto += ' ' + frasi[i];
    i += 1;
  }
  if (estratto.length > LUNGHEZZA_MASSIMA_ESTRATTO) {
    const tagliato = estratto.slice(0, LUNGHEZZA_MASSIMA_ESTRATTO);
    const spazio = tagliato.lastIndexOf(' ');
    estratto = (spazio > 0 ? tagliato.slice(0, spazio) : tagliato) + '…';
  }
  return estratto;
}

/* ------------------------------------------------------------------ */
/* Ricerca                                                             */
/* ------------------------------------------------------------------ */

const PESO_SINONIMO = 0.45;
const BONUS_FRASE = 8;
// Soglia sotto la quale il risultato è rumore: un'unica parola
// pescata nel corpo del testo non basta per proporre un capitolo.
const PUNTEGGIO_MINIMO = 6;

export function cerca(domanda: string, quanti = 4): Risultato[] {
  const token = tokenizza(domanda);
  if (!token.length) return [];

  // Gruppi di sinonimi toccati dalla domanda. Ogni gruppo conta una volta
  // sola: altrimenti una voce che parla di cattedre verrebbe premiata dieci
  // volte solo perché il gruppo contiene dieci parole affini.
  const gruppiAttivi = GRUPPI_SINONIMI.map((gruppo) =>
    gruppo.filter((p) => !token.some((t) => combaciano(t, p)))
  ).filter(
    (gruppo, i) =>
      gruppo.length < GRUPPI_SINONIMI[i].length && gruppo.length > 0
  );

  const domandaNormalizzata = normalizza(domanda);

  const risultati = indice
    .map(({ voce, pesi, testoNormalizzato }) => {
      const chiavi = Array.from(pesi.keys());
      const pesoDi = (q: string) => {
        let massimo = 0;
        chiavi.forEach((k) => {
          if (combaciano(q, k)) massimo = Math.max(massimo, pesi.get(k) ?? 0);
        });
        return massimo * rarita(q);
      };

      let punteggio = 0;
      let colpiDiretti = 0;
      token.forEach((q) => {
        const peso = pesoDi(q);
        if (peso > 0) {
          punteggio += peso;
          colpiDiretti += 1;
        }
      });
      gruppiAttivi.forEach((gruppo) => {
        const massimo = gruppo.reduce((max, s) => Math.max(max, pesoDi(s)), 0);
        punteggio += massimo * PESO_SINONIMO;
      });

      if (
        domandaNormalizzata.length >= 6 &&
        testoNormalizzato.includes(domandaNormalizzata)
      ) {
        punteggio += BONUS_FRASE;
      }

      // Chi risponde a più parole della domanda vince su chi ne azzecca una
      // sola per caso in un titolo.
      punteggio *= 1 + colpiDiretti / (token.length * 2);

      return { voce, punteggio, estratto: '' } as Risultato;
    })
    .filter((r) => r.punteggio >= PUNTEGGIO_MINIMO)
    .sort((a, b) => b.punteggio - a.punteggio)
    .slice(0, quanti);

  return risultati.map((r) => ({
    ...r,
    estratto: estraiFrase(r.voce.testo, token),
  }));
}

/** Domande di partenza mostrate a pannello vuoto. */
export const DOMANDE_SUGGERITE = [
  'Come assegno le ore a un docente?',
  'Perché la generazione lascia ore scoperte?',
  'Come stampo l\'orario in A3?',
  'Come lavoro insieme a un collega?',
  'Dove finiscono i miei dati?',
  'Come imposto un giorno libero?',
  'Come esporto in Excel?',
  'Uso l\'app alla scuola primaria: cosa cambio?',
  'Un docente è assente: come organizzo la supplenza?',
];
