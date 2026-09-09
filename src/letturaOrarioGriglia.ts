/**
 * Lettura dell'orario direttamente qui, senza modello linguistico.
 *
 * Gli orari che le scuole stampano hanno quasi tutti la stessa forma: una
 * riga per docente, e in cima una fascia di intestazioni con i giorni e, sotto
 * di essi, i numeri delle ore. È una tabella, e una tabella si legge contando
 * le colonne: non serve nessuna intelligenza, serve sapere dove cade ogni
 * cella.
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
 * allineate a forza di spazi. Se le colonne non ci sono - un copia e incolla
 * da Excel, per dire, che separa con tabulazioni - questa lettura si ferma e
 * restituisce `null` senza fare danni.
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
 * Cerca la riga che porta i numeri delle ore e ne ricava le colonne.
 *
 * Si riconosce così: tanti pezzi fatti di un numero solo, e quei numeri che
 * ricominciano da capo a ogni giorno («1 2 3 4 5 6 1 2 3...»). Ogni volta che
 * il numero non cresce, comincia un giorno nuovo. Le colonne prima del primo
 * numero sono l'anagrafica del docente e non si toccano.
 */
const colonneOrarie = (riga: string): ColonnaOraria[] | null => {
  const pezzi = pezziDellaRiga(riga);
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
 * Legge l'orario da un testo con le colonne allineate.
 *
 * Torna `null` quando il documento non ha questa forma: allora tocca al
 * modello. Torna un esito con poche righe quando la forma c'è ma il contenuto
 * è magro, e sta a chi chiama decidere se basta.
 */
export function leggiGrigliaOrario(testo: string): EsitoGriglia | null {
  const righe = String(testo || '').split('\n');

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
      const classe = pezzo.testo.toUpperCase().replace(/\s+/g, '');
      if (!FORMA_CLASSE.test(classe)) continue;

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
