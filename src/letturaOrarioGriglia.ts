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

export interface EsitoGriglia {
  righe: RigaGrezzaLetta[];
  /** Quanti giorni e quante ore ha la settimana disegnata nel documento. */
  giorniDocumento: number;
  oreDocumento: number;
}

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
const colonneOrarie = (riga: string): ColonnaOraria[] | null => {
  const pezzi = pezziDellaRiga(riga);
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
export function leggiGrigliaOrario(testo: string): EsitoGriglia | null {
  const righe = allineaTabulazioni(String(testo || '')).split('\n');

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

  const lette: RigaGrezzaLetta[] = [];
  let docenteCorrente = '';
  let materiaCorrente = '';

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
    }
    if (!docenteCorrente) continue;

    for (const pezzo of pezzi) {
      if (pezzo.colonna < primaColonnaOraria - tolleranza) continue;
      const classe = classeDellaCella(pezzo.testo);
      if (!classe) continue;

      // La colonna oraria più vicina all'inizio della cella.
      let vicina: ColonnaOraria | null = null;
      let distanza = Number.POSITIVE_INFINITY;
      for (const colonna of colonne) {
        const quanto = Math.abs(colonna.colonna - pezzo.colonna);
        if (quanto < distanza) {
          distanza = quanto;
          vicina = colonna;
        }
      }
      if (!vicina || distanza > tolleranza) continue;

      lette.push({
        classe,
        giorno: vicina.giorno,
        ora: vicina.ora,
        materia: materiaCorrente,
        docente: docenteCorrente,
      });
    }
  }

  if (!lette.length) return null;
  return { righe: lette, giorniDocumento, oreDocumento };
}
