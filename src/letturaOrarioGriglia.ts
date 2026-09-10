/**
 * Lettura dell'orario direttamente qui, senza modello linguistico.
 *
 * Gli orari che le scuole stampano hanno quasi tutti la stessa forma: una
 * riga per docente, e in cima una fascia di intestazioni con i giorni e, sotto
 * di essi, le ore. È una tabella, e una tabella si legge contando le colonne:
 * non serve nessuna intelligenza, serve sapere dove cade ogni cella.
 *
 * Le ore in cima sono scritte in due modi. Numerate, «1 2 3 4 5 6», come fanno
 * i programmi italiani. Oppure come orologio, «8h00 9h00 10h00», come fa EDT
 * che è francese. Vanno bene tutte e due.
 *
 * È il motivo per cui questo file esiste. Provando con l'orario vero di un
 * istituto - trentacinque colonne fra lunedì e sabato, le ore libere stampate
 * come spazio vuoto - il modello si tirava indietro dicendo che le colonne non
 * erano abbastanza allineate per ricostruirle, e tornava indietro con zero
 * righe. Contarle a mano invece riesce sempre, costa zero e ha un effetto che
 * vale più del resto: i nomi dei colleghi non escono dal computer.
 *
 * Il modello resta la riserva, per i documenti che questa forma non ce
 * l'hanno: elenchi scritti a frasi, tabelle per classe invece che per
 * docente, fogli riempiti a modo proprio.
 *
 * Il testo che arriva qui è quello di `estraiTestoPdf`, che tiene le colonne
 * allineate a forza di spazi. Arrivano però anche le tabulazioni: il copia e
 * incolla da un foglio di calcolo e il file .xlsx letto da
 * `letturaFoglioCalcolo`, che allineamento non ne hanno. Quelle si allineano
 * qui prima di leggerle, che è meno lavoro che insegnare a contare in due modi
 * diversi.
 */

import type { SfondiPdf } from './letturaElenchi';

/** Una cella letta: dove sta e cosa c'è scritto. */
interface Pezzo {
  colonna: number;
  testo: string;
}

/** Una colonna oraria della tabella: che ora è, e dove cade sul foglio. */
interface ColonnaOraria {
  giorno: number;
  ora: number;
  colonna: number;
}

export interface RigaGrezzaLetta {
  classe: string;
  giorno: number;
  ora: number;
  materia: string;
  docente: string;
}

/**
 * Una giornata intera dipinta di un colore solo, nella riga di un docente.
 *
 * Negli orari già costruiti dalla scuola il colore dice quello che la casella
 * vuota non dice: qui il docente non c'è, e non è un buco fra due lezioni. Il
 * rosso di solito è il giorno libero, il giallo il giorno in cui insegna in
 * un'altra scuola, ma ogni istituto usa i suoi: qui si riporta il colore così
 * com'è e a dargli un significato ci pensa chi guarda l'anteprima.
 */
export interface GiornoColorato {
  docente: string;
  giorno: number;
  /** «#rrggbb». */
  colore: string;
}

/** Un'ora segnata «D»: disponibilità per le supplenze. */
export interface DisponibilitaLetta {
  docente: string;
  giorno: number;
  ora: number;
}

export interface EsitoGriglia {
  righe: RigaGrezzaLetta[];
  /** Quanti giorni e quante ore ha la settimana disegnata nel documento. */
  giorniDocumento: number;
  oreDocumento: number;
  /** Le giornate dipinte di un colore solo, quando il documento ha i colori. */
  giorniColorati: GiornoColorato[];
  /** Le ore segnate «D». Queste si leggono dal testo, colori o non colori. */
  disponibilita: DisponibilitaLetta[];
}

/** Cosa vuol dire un colore, secondo il primo colpo d'occhio. */
export type SensoColore = 'libero' | 'altraScuola' | 'niente';

/**
 * L'ipotesi di partenza sul significato di un colore.
 *
 * Rosso vuol dire giorno libero e giallo altra scuola: è la convenzione che
 * gli orari delle scuole usano quasi sempre. È solo un'ipotesi, e l'anteprima
 * la mette in un menù da cui si cambia: un istituto che il giorno libero lo
 * segna in verde non deve trovarsi l'app che indovina male in silenzio.
 *
 * I colori pallidi non contano. Un fondo grigetto è quasi sempre la riga
 * alternata di una tabella, e le tinte tenui gli orari le usano per le note.
 */
export const sensoDelColore = (colore: string): SensoColore => {
  const r = parseInt(colore.slice(1, 3), 16) / 255;
  const g = parseInt(colore.slice(3, 5), 16) / 255;
  const b = parseInt(colore.slice(5, 7), 16) / 255;
  if (![r, g, b].every((v) => Number.isFinite(v))) return 'niente';
  const massimo = Math.max(r, g, b);
  const minimo = Math.min(r, g, b);
  const pienezza = massimo === 0 ? 0 : (massimo - minimo) / massimo;
  if (massimo < 0.5 || pienezza < 0.45) return 'niente';

  // La tinta, in gradi: 0 rosso, 60 giallo, 120 verde.
  const giro = massimo - minimo;
  let tinta = 0;
  if (massimo === r) tinta = ((g - b) / giro) * 60;
  else if (massimo === g) tinta = ((b - r) / giro) * 60 + 120;
  else tinta = ((r - g) / giro) * 60 + 240;
  if (tinta < 0) tinta += 360;

  if (tinta <= 20 || tinta >= 340) return 'libero';
  if (tinta >= 35 && tinta <= 75) return 'altraScuola';
  return 'niente';
};

/** La forma di una classe: anno attaccato alla sezione. */
const FORMA_CLASSE = /^\d{1,2}[A-Z]{1,3}$/;

/**
 * La classe scritta dentro una casella dell'orario.
 *
 * Di solito nella casella c'è la classe e basta, «3A». Quando però nell'ora
 * ci sono due docenti, i programmi ci mettono dentro tutti e due i dati
 * separati da una virgola: «Rossi,3A», cioè «in 3A insieme a Rossi». La
 * casella va letta lo stesso, altrimenti sparisce l'ora intera, e con lei
 * spariscono proprio le ore di sostegno e di compresenza.
 *
 * Il nome del collega qui non si prende: quell'ora sta scritta anche nella
 * riga di chi è nominato, e da lì entra col suo nome per conto proprio. Chi
 * legge la riga di Rossi trova «Bianchi,3A», e le due righe si ritrovano nella
 * stessa casella senza che nessuno debba indovinare chi è il titolare.
 */
const classeDellaCella = (cella: string): string | null => {
  for (const pezzo of cella.split(',')) {
    const forse = pezzo.toUpperCase().replace(/\s+/g, '');
    if (FORMA_CLASSE.test(forse)) return forse;
  }
  return null;
};

/** Spezza una riga di testo nei suoi pezzi, tenendosi la colonna di ognuno. */
const pezziDellaRiga = (riga: string): Pezzo[] => {
  const pezzi: Pezzo[] = [];
  const regola = /\S+(?: \S+)*?(?=\s{2,}|$)/g;
  let trovato: RegExpExecArray | null;
  while ((trovato = regola.exec(riga))) {
    const testo = trovato[0].trim();
    if (testo) pezzi.push({ colonna: trovato.index, testo });
  }
  return pezzi;
};

/**
 * L'ora scritta come la legge un orologio: «8h00», «08:00», «8.00», «13h30».
 *
 * Conta solo come comincia la casella, non come finisce: EDT nell'ultima
 * colonna scrive «13h00» e sotto «14h00», dentro la stessa casella, e quella
 * casella arriva qui come «13h00 14h00». Pretendere che l'orario finisca lì
 * voleva dire perdere l'ultima ora di ogni giornata, che sono cinque colonne
 * su trenta e le lezioni che ci stanno dentro.
 */
const FORMA_OROLOGIO = /^([01]?\d|2[0-3])[h:.]([0-5]\d)(?![\d.,:])/i;

/** Quanti minuti dopo la mezzanotte, se il pezzo è un'ora da orologio. */
const minutiOrologio = (testo: string): number | null => {
  const trovato = FORMA_OROLOGIO.exec(testo);
  if (!trovato) return null;
  return Number(trovato[1]) * 60 + Number(trovato[2]);
};

/**
 * Le ore numerate: «1 2 3 4 5 6 1 2 3...».
 *
 * Ogni volta che il numero non cresce comincia un giorno nuovo. È la forma
 * che stampano quasi tutti i programmi italiani.
 */
const dallaNumerazione = (pezzi: Pezzo[]): ColonnaOraria[] | null => {
  const numeri = pezzi.filter((p) => /^\d{1,2}$/.test(p.testo));
  if (numeri.length < 8) return null;

  const colonne: ColonnaOraria[] = [];
  let giorno = -1;
  let precedente = Number.POSITIVE_INFINITY;
  for (const pezzo of numeri) {
    const numero = Number(pezzo.testo);
    // Un numero che non cresce apre il giorno dopo. Le ore partono da 1 sul
    // foglio e da 0 nell'app, da qui il meno uno.
    if (numero <= precedente) giorno++;
    precedente = numero;
    colonne.push({ giorno, ora: numero - 1, colonna: pezzo.colonna });
  }

  // Una tabella vera ha almeno due giorni e ore che si ripetono uguali. Se
  // esce un giorno solo, quei numeri erano altro: ore di cattedra, conteggi.
  if (giorno < 1) return null;
  return colonne;
};

/**
 * Le ore scritte come orologio: «8h00 9h00 10h00 ... 8h00 9h00...».
 *
 * È la forma di EDT, che è francese e stampa l'ora invece del suo numero. Il
 * giorno cambia quando l'ora torna indietro. Il numero dell'ora non si ricava
 * dall'orologio: si prendono tutti gli orari diversi della riga, si mettono in
 * fila dal primo all'ultimo, e la posizione in quella fila è l'ora. Così un
 * giorno che comincia più tardi degli altri resta comunque incolonnato.
 *
 * Bastano sei orari invece degli otto chiesti ai numeri nudi: «8h00» non
 * capita per caso in mezzo a un orario, un «5» sì.
 */
const dallOrologio = (pezzi: Pezzo[]): ColonnaOraria[] | null => {
  const orologi: { colonna: number; minuti: number }[] = [];
  for (const pezzo of pezzi) {
    const minuti = minutiOrologio(pezzo.testo);
    if (minuti !== null) orologi.push({ colonna: pezzo.colonna, minuti });
  }
  if (orologi.length < 6) return null;

  const fila = [...new Set(orologi.map((o) => o.minuti))].sort((a, b) => a - b);

  const colonne: ColonnaOraria[] = [];
  let giorno = -1;
  let precedente = Number.POSITIVE_INFINITY;
  for (const orologio of orologi) {
    if (orologio.minuti <= precedente) giorno++;
    precedente = orologio.minuti;
    colonne.push({
      giorno,
      ora: fila.indexOf(orologio.minuti),
      colonna: orologio.colonna,
    });
  }

  if (giorno < 1) return null;
  return colonne;
};

/**
 * Cerca la riga che porta le ore e ne ricava le colonne.
 *
 * Le ore possono essere numerate («1 2 3 4 5 6») oppure scritte come orologio
 * («8h00 9h00 10h00»): si prova prima la forma numerata, poi l'altra. Le
 * colonne prima della prima ora sono l'anagrafica del docente e non si
 * toccano.
 */
/**
 * Apre le intestazioni che arrivano tutte attaccate in un pezzo solo.
 *
 * Un pezzo è quello che sta fra due spazi larghi, e di solito è una casella.
 * Certe stampe però scrivono più caselle di seguito con un unico spazio in
 * mezzo, e allora le ore di mezza giornata arrivano qui come «10.00 11.00
 * 12.00 13.00 14.00»: un pezzo solo, di cui si legge la prima ora e le altre
 * quattro si perdono. Succede con «Microsoft Print to PDF», la stampante di
 * Windows, ed è bastato a non far leggere un orario intero.
 *
 * Si aprono solo i pezzi che portano dentro tre o più ore: è il segno che
 * sono caselle diverse finite insieme. Con due si sta fermi, perché due ore in
 * una casella sono una casella vera: EDT scrive «13h00» e sotto «14h00» per
 * dire l'ora che va dalle 13 alle 14, ed è una colonna sola.
 *
 * La colonna di ogni ora si conta in lettere dall'inizio del pezzo, che nel
 * testo allineato è la stessa cosa che misurarla sul foglio.
 */
const apriPezziAttaccati = (pezzi: Pezzo[]): Pezzo[] => {
  const aperti: Pezzo[] = [];
  for (const pezzo of pezzi) {
    const dentro: Pezzo[] = [];
    const regola = /\S+/g;
    let trovato: RegExpExecArray | null;
    while ((trovato = regola.exec(pezzo.testo))) {
      dentro.push({
        colonna: pezzo.colonna + trovato.index,
        testo: trovato[0],
      });
    }
    const ore = dentro.filter(
      (p) => minutiOrologio(p.testo) !== null || /^\d{1,2}$/.test(p.testo)
    );
    if (dentro.length > 1 && ore.length >= 3) aperti.push(...dentro);
    else aperti.push(pezzo);
  }
  return aperti;
};

const colonneOrarie = (riga: string): ColonnaOraria[] | null => {
  const pezzi = apriPezziAttaccati(pezziDellaRiga(riga));
  return dallaNumerazione(pezzi) ?? dallOrologio(pezzi);
};

/**
 * Rimette in colonna una tabella incollata da un foglio di calcolo.
 *
 * Excel, quando si copiano delle celle, separa le colonne con una tabulazione
 * e basta: sullo schermo la tabella si vede, nel testo l'allineamento non
 * esiste più. Qui ogni colonna prende la larghezza della sua cella più lunga e
 * viene riscritta con gli spazi, come se fosse stampata su carta. Da lì in poi
 * è un documento come gli altri.
 *
 * Il conto della larghezza si fa per posizione: la terza cella di ogni riga
 * finisce nella terza colonna anche quando è vuota, e le caselle vuote restano
 * vuote invece di far scivolare le altre di un posto.
 */
/**
 * Rimette su una riga sola le caselle che ne occupano più d'una.
 *
 * Quando in una casella di Excel c'è un a capo, il copia e incolla la
 * consegna fra virgolette e l'a capo se lo tiene. Una riga della tabella
 * diventa così due o tre righe di testo, e le colonne non tornano più.
 * Capita sempre con gli orari esportati da EDT, che scrive «13h00» e sotto
 * «14h00» nella stessa casella dell'intestazione e un trattino sopra l'altro
 * nelle ore libere: bastava quello per non fare leggere niente di tutto il
 * documento, perché la riga delle ore arrivava qui spezzata in tre.
 *
 * Le virgolette contano solo a inizio casella, cioè dopo una tabulazione o a
 * capo. Così un paio di virgolette in mezzo a un nome restano quello che sono.
 */
const spianaCelleVirgolettate = (testo: string): string => {
  if (!testo.includes('"')) return testo;

  let fuori = '';
  let dentro = false;
  let inizioCella = true;
  for (let i = 0; i < testo.length; i++) {
    const carattere = testo[i];
    if (dentro) {
      if (carattere === '"') {
        if (testo[i + 1] === '"') {
          fuori += '"';
          i++;
        } else {
          dentro = false;
          inizioCella = false;
        }
        continue;
      }
      fuori += carattere === '\n' || carattere === '\r' ? ' ' : carattere;
      continue;
    }
    if (carattere === '"' && inizioCella) {
      dentro = true;
      continue;
    }
    fuori += carattere;
    inizioCella =
      carattere === '\t' || carattere === '\n' || carattere === '\r';
  }
  return fuori;
};

const allineaTabulazioni = (testo: string): string => {
  if (!testo.includes('\t')) return testo;

  const righe = spianaCelleVirgolettate(testo)
    .split('\n')
    .map((riga) =>
      riga
        .replace(/\r$/, '')
        .split('\t')
        // Due spazi di fila dentro una cella aprirebbero un pezzo nuovo più
        // avanti, quando la riga viene spezzata: qui ne resta uno solo.
        .map((cella) => cella.trim().replace(/\s+/g, ' '))
    );

  const larghezze: number[] = [];
  for (const riga of righe) {
    riga.forEach((cella, i) => {
      larghezze[i] = Math.max(larghezze[i] ?? 0, cella.length);
    });
  }

  return righe
    .map((riga) =>
      riga
        .map((cella, i) => cella.padEnd((larghezze[i] ?? 0) + 2, ' '))
        .join('')
        .trimEnd()
    )
    .join('\n');
};

/**
 * Legge l'orario da un testo con le colonne allineate.
 *
 * Torna `null` quando il documento non ha questa forma: allora tocca al
 * modello. Torna un esito con poche righe quando la forma c'è ma il contenuto
 * è magro, e sta a chi chiama decidere se basta.
 */
export function leggiGrigliaOrario(
  testo: string,
  sfondi?: SfondiPdf | null
): EsitoGriglia | null {
  const grezzo = String(testo || '');
  const righe = allineaTabulazioni(grezzo).split('\n');
  /*
   * I colori sono agganciati alla colonna di carattere del testo com'è
   * arrivato. `allineaTabulazioni` riscrive le colonne, quindi dove ha
   * lavorato i colori non combaciano più e si lasciano perdere: succede solo
   * col copia e incolla e col foglio di Excel, che i colori non ce li hanno.
   */
  const colori = grezzo.includes('\t') ? null : sfondi || null;

  let indiceIntestazione = -1;
  let colonne: ColonnaOraria[] | null = null;
  for (let i = 0; i < Math.min(righe.length, 40); i++) {
    const trovate = colonneOrarie(righe[i]);
    if (trovate) {
      indiceIntestazione = i;
      colonne = trovate;
      break;
    }
  }
  if (!colonne || indiceIntestazione < 0) return null;

  const primaColonnaOraria = colonne[0].colonna;
  /*
   * Quanto può sbagliare una cella e finire lo stesso nella colonna giusta:
   * metà della distanza fra due colonne. Le celle non cadono mai esattamente
   * sotto il numero dell'intestazione, perché «1E» è più largo di «1» e i
   * programmi che stampano l'orario centrano il testo nella casella.
   */
  const passi = colonne
    .slice(1)
    .map((c, i) => c.colonna - colonne![i].colonna)
    .filter((d) => d > 0);
  const passo = passi.length ? Math.min(...passi) : 6;
  const tolleranza = Math.max(2, Math.round(passo * 0.75));

  const giorniDocumento = colonne[colonne.length - 1].giorno + 1;
  const oreDocumento = Math.max(...colonne.map((c) => c.ora)) + 1;

  /*
   * Le celle si raccolgono tutte prima di trasformarle in ore, perché una
   * cella da sola non dice quanto è larga: lo dice il confronto con tutte le
   * altre. Vedi `oreDellaCella`.
   */
  interface CellaLetta {
    classe: string;
    docente: string;
    materia: string;
    indice: number;
    scarto: number;
  }
  const celle: CellaLetta[] = [];
  const giorniColorati: GiornoColorato[] = [];
  const disponibilita: DisponibilitaLetta[] = [];
  let docenteCorrente = '';
  let materiaCorrente = '';

  /**
   * La colonna oraria più vicina all'inizio di una cella, se ce n'è una
   * abbastanza vicina.
   */
  const colonnaVicina = (colonna: number): number => {
    let vicina = -1;
    let distanza = Number.POSITIVE_INFINITY;
    for (let k = 0; k < colonne!.length; k++) {
      const quanto = Math.abs(colonne![k].colonna - colonna);
      if (quanto < distanza) {
        distanza = quanto;
        vicina = k;
      }
    }
    return distanza > tolleranza ? -1 : vicina;
  };

  /**
   * Le giornate che sulla riga di un docente sono dipinte tutte di un colore
   * solo.
   *
   * Si guarda il colore sotto ogni ora della giornata e si tiene solo il caso
   * in cui sono tutte uguali: una giornata mezza colorata è un'altra cosa (una
   * mattina di disponibilità, una nota) e non va scambiata per un giorno di
   * assenza. Il colore si legge sulla riga dove sta il nome, che è quella che
   * la fascia colorata attraversa di sicuro anche quando la casella di un
   * docente va a capo.
   */
  const giornateDipinte = (riga: number): { giorno: number; colore: string }[] => {
    if (!colori) return [];
    const perGiorno = new Map<number, string[]>();
    for (const c of colonne!) {
      const trovato = colori.coloreDi(riga, c.colonna);
      const elenco = perGiorno.get(c.giorno) || [];
      elenco.push(trovato || '');
      perGiorno.set(c.giorno, elenco);
    }
    const dipinte: { giorno: number; colore: string }[] = [];
    perGiorno.forEach((elenco, giorno) => {
      if (elenco.length < 2) return;
      const primo = elenco[0];
      if (!primo || !elenco.every((c) => c === primo)) return;
      dipinte.push({ giorno, colore: primo });
    });
    return dipinte;
  };

  for (let i = indiceIntestazione + 1; i < righe.length; i++) {
    const riga = righe[i];
    if (!riga.trim()) continue;
    const pezzi = pezziDellaRiga(riga);

    /*
     * L'anagrafica sta prima della prima colonna oraria: nome, materia, le
     * classi della cattedra, il totale delle ore. Il nome è il primo pezzo,
     * la materia il secondo. Una riga che comincia direttamente con le celle
     * è la continuazione del docente di sopra, e se lo tiene.
     */
    const anagrafica = pezzi.filter(
      (p) => p.colonna < primaColonnaOraria - tolleranza
    );
    if (anagrafica.length) {
      docenteCorrente = anagrafica[0].testo;
      materiaCorrente = anagrafica[1]?.testo || '';
      /*
       * Il colore si guarda qui, sulla riga che apre il docente, e una volta
       * sola: è la riga che porta il nome, quindi è quella su cui la fascia
       * colorata passa di sicuro. Le righe di continuazione, quelle di chi ha
       * due scritte in una casella, cadono più in basso e potrebbero già
       * sporgere nella fascia del docente dopo.
       */
      for (const dipinta of giornateDipinte(i)) {
        giorniColorati.push({
          docente: docenteCorrente,
          giorno: dipinta.giorno,
          colore: dipinta.colore,
        });
      }
    }
    if (!docenteCorrente) continue;

    for (const pezzo of pezzi) {
      if (pezzo.colonna < primaColonnaOraria - tolleranza) continue;

      /*
       * La «D» delle ore di disponibilità. Sta scritta nella casella come una
       * classe qualsiasi, ma classe non è: prima veniva buttata via, e con lei
       * l'unica cosa che nell'orario dice dove il docente è tenuto a restare a
       * scuola per le supplenze.
       */
      if (/^d\.?$/i.test(pezzo.testo.trim())) {
        const dove = colonnaVicina(pezzo.colonna);
        if (dove >= 0) {
          disponibilita.push({
            docente: docenteCorrente,
            giorno: colonne[dove].giorno,
            ora: colonne[dove].ora,
          });
        }
        continue;
      }

      const classe = classeDellaCella(pezzo.testo);
      if (!classe) continue;

      // La colonna oraria più vicina all'inizio della cella.
      const vicina = colonnaVicina(pezzo.colonna);
      if (vicina < 0) continue;

      celle.push({
        classe,
        docente: docenteCorrente,
        materia: materiaCorrente,
        indice: vicina,
        scarto: pezzo.colonna - colonne[vicina].colonna,
      });
    }
  }

  if (!celle.length) return null;

  /*
   * Un docente che nel documento non ha nemmeno un'ora e nemmeno una «D» non
   * ha una riga d'orario: è un nome in elenco e basta, tipico dei docenti di
   * sostegno che l'orario ce l'hanno a parte. Di suo non porta colori (la sua
   * riga è bianca), ma se il documento gliene mette uno per altre ragioni non
   * deve diventare un vincolo che nessuno ha deciso.
   */
  const conRiga = new Set([
    ...celle.map((c) => c.docente),
    ...disponibilita.map((d) => d.docente),
  ]);
  const colorateVere = giorniColorati.filter((g) => conRiga.has(g.docente));

  /*
   * Le caselle larghe due ore.
   *
   * Quando un docente ha due ore di fila nella stessa classe, i programmi che
   * stampano l'orario non scrivono la classe due volte: uniscono le due
   * caselle in una sola e ci mettono la classe in mezzo. Nel testo resta una
   * scritta sola, e letta com'è vale un'ora invece di due: su un orario vero
   * (Orario Facile, un istituto comprensivo) sono ottantuno ore su
   * ottocentottanta che sparivano.
   *
   * Una casella unita si riconosce da dove comincia. Le caselle normali
   * cominciano tutte allo stesso modo rispetto alla loro ora, un po' più in là
   * perché la scritta è più corta della colonna e sta in mezzo. Quella unita
   * sta in mezzo a due colonne, quindi comincia mezza colonna prima delle
   * altre. Il «come cominciano le altre» si prende dal documento stesso, con
   * la mediana: così vale sia per chi centra le scritte sia per chi le
   * incolonna a sinistra, senza dover sapere quale programma le ha stampate.
   */
  const scarti = [...celle].map((c) => c.scarto).sort((a, b) => a - b);
  const scartoNormale = scarti[Math.floor(scarti.length / 2)];
  const oreDellaCella = (cella: CellaLetta): number[] => {
    const indietro = scartoNormale - cella.scarto;
    const unita = indietro >= passo * 0.35 && indietro <= passo * 0.8;
    const prima = colonne![cella.indice - 1];
    if (
      !unita ||
      !prima ||
      prima.giorno !== colonne![cella.indice].giorno ||
      prima.ora !== colonne![cella.indice].ora - 1
    ) {
      return [cella.indice];
    }
    return [cella.indice - 1, cella.indice];
  };

  const lette: RigaGrezzaLetta[] = [];
  for (const cella of celle) {
    for (const indice of oreDellaCella(cella)) {
      lette.push({
        classe: cella.classe,
        giorno: colonne[indice].giorno,
        ora: colonne[indice].ora,
        materia: cella.materia,
        docente: cella.docente,
      });
    }
  }

  return {
    righe: lette,
    giorniDocumento,
    oreDocumento,
    giorniColorati: colorateVere,
    disponibilita,
  };
}
