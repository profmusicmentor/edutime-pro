/**
 * Apertura di un foglio di calcolo .xlsx, qui dentro, nel browser.
 *
 * Le scuole l'orario ce l'hanno in tre forme: il PDF stampato, il copia e
 * incolla da Excel, e il file di Excel vero e proprio. Le prime due l'app le
 * sapeva già leggere, la terza no: il file veniva rifiutato con un «formato
 * non riconosciuto» e la persona si trovava a dover fare un giro per arrivare
 * dove voleva. È il caso di chi esporta da EDT, che salva in .xlsx.
 *
 * Il copia e incolla, poi, su questi fogli si rompe da solo: EDT scrive le ore
 * come «13h00» e «14h00» dentro la stessa casella, una sopra l'altra, e le ore
 * libere come un trattino a capo di un altro trattino. Excel, quando copia una
 * casella con un a capo dentro, la mette fra virgolette e l'a capo se lo tiene:
 * una riga della tabella diventa tre righe di testo e l'allineamento delle
 * colonne, che è tutto quello su cui si regge la lettura, sparisce.
 *
 * Leggere il file invece della sua fotocopia toglie il problema alla radice:
 * le colonne non si contano, ci sono. E non esce niente dal computer, come per
 * il PDF: nessuna libreria, nessuna rete, i nomi dei colleghi restano qui.
 *
 * Un .xlsx è una cartella compressa con dentro dei file XML. Il browser sa già
 * fare le due cose che servono: `DecompressionStream` scompatta, e per l'XML
 * basta scorrere le etichette, che qui sono scritte da un programma e non da
 * una persona. Perciò questo file non porta con sé nessuna dipendenza nuova.
 */

/* ------------------------------------------------- la cartella compressa */

const numero16 = (dati: DataView, dove: number): number =>
  dati.getUint16(dove, true);
const numero32 = (dati: DataView, dove: number): number =>
  dati.getUint32(dove, true);

/** La firma che chiude una cartella compressa: «PK\x05\x06». */
const FINE_INDICE = 0x06054b50;
/** La firma di ogni voce dell'indice: «PK\x01\x02». */
const VOCE_INDICE = 0x02014b50;

/**
 * Scompatta una voce. Il metodo 8 è il solito «deflate», il metodo 0 vuol dire
 * che la voce era già piccola e sta lì com'è.
 */
const scompatta = async (
  pezzo: Uint8Array,
  metodo: number
): Promise<Uint8Array> => {
  if (metodo === 0) return pezzo;
  if (metodo !== 8) {
    throw new Error(
      'Questo file Excel è compresso in un modo che non so aprire. Riaprilo in Excel e salvalo di nuovo come .xlsx.'
    );
  }
  const flusso = new Blob([pezzo as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flusso).arrayBuffer());
};

/**
 * Tira fuori i file che stanno dentro la cartella compressa.
 *
 * Si parte dalla fine: l'indice di una cartella zip sta in fondo, non in cima,
 * e dice per ogni voce come si chiama e a che punto del file comincia.
 */
const apriCartella = async (
  contenuto: ArrayBuffer
): Promise<Map<string, Uint8Array>> => {
  const dati = new DataView(contenuto);
  const bytes = new Uint8Array(contenuto);

  let fine = -1;
  const daDove = Math.max(0, contenuto.byteLength - 66000);
  for (let i = contenuto.byteLength - 22; i >= daDove; i--) {
    if (numero32(dati, i) === FINE_INDICE) {
      fine = i;
      break;
    }
  }
  if (fine < 0) {
    throw new Error(
      'Questo non sembra un file Excel .xlsx. Se è un vecchio .xls, riaprilo e salvalo come .xlsx.'
    );
  }

  const quante = numero16(dati, fine + 10);
  let dove = numero32(dati, fine + 16);
  const voci = new Map<string, Uint8Array>();

  for (let n = 0; n < quante; n++) {
    if (numero32(dati, dove) !== VOCE_INDICE) break;
    const metodo = numero16(dati, dove + 10);
    const quantoCompresso = numero32(dati, dove + 20);
    const lunghezzaNome = numero16(dati, dove + 28);
    const lunghezzaExtra = numero16(dati, dove + 30);
    const lunghezzaNota = numero16(dati, dove + 32);
    const inizioVoce = numero32(dati, dove + 42);
    const nome = new TextDecoder().decode(
      bytes.subarray(dove + 46, dove + 46 + lunghezzaNome)
    );

    // Nell'intestazione locale il nome e la parte extra possono avere una
    // lunghezza diversa da quella scritta nell'indice: i dati cominciano dopo
    // quelle, e vanno rilette qui.
    const nomeLocale = numero16(dati, inizioVoce + 26);
    const extraLocale = numero16(dati, inizioVoce + 28);
    const inizioDati = inizioVoce + 30 + nomeLocale + extraLocale;

    if (nome.endsWith('.xml') || nome.endsWith('.rels')) {
      voci.set(
        nome,
        await scompatta(
          bytes.subarray(inizioDati, inizioDati + quantoCompresso),
          metodo
        )
      );
    }

    dove += 46 + lunghezzaNome + lunghezzaExtra + lunghezzaNota;
  }

  return voci;
};

/* ------------------------------------------------- le etichette XML */

/** Rimette al loro posto i caratteri che l'XML scrive per esteso. */
const testoVero = (grezzo: string): string =>
  grezzo
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

/** Tutto il testo dentro le etichette `<t>` di un pezzo di XML. */
const testoDelleT = (xml: string): string => {
  let insieme = '';
  const regola = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let trovato: RegExpExecArray | null;
  while ((trovato = regola.exec(xml))) insieme += testoVero(trovato[1]);
  return insieme;
};

/**
 * Le parole che il foglio tiene da parte.
 *
 * Excel non scrive due volte la stessa parola: la mette in un elenco a parte e
 * nelle caselle ci lascia il suo numero d'ordine. Senza questo elenco un foglio
 * di testo si legge come una distesa di numeri.
 */
const paroleInComune = (xml: string): string[] => {
  const parole: string[] = [];
  const regola = /<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g;
  let trovato: RegExpExecArray | null;
  while ((trovato = regola.exec(xml))) parole.push(testoDelleT(trovato[1] || ''));
  return parole;
};

/** Da «AA12» alla colonna 27, contando come conta Excel. */
const numeroColonna = (riferimento: string): number => {
  const lettere = /^([A-Z]+)/.exec(riferimento.toUpperCase());
  if (!lettere) return 0;
  let n = 0;
  for (const lettera of lettere[1]) n = n * 26 + (lettera.charCodeAt(0) - 64);
  return n;
};

/** Da «AA12» alla riga 12. */
const numeroRiga = (riferimento: string): number => {
  const cifre = /(\d+)$/.exec(riferimento);
  return cifre ? Number(cifre[1]) : 0;
};

/* ------------------------------------------------- il foglio */

/**
 * Trasforma un foglio in una tabella di caselle.
 *
 * Le caselle vuote nel file non sono scritte affatto: si ritrovano qui perché
 * ogni casella porta con sé il proprio indirizzo, «C7», e va messa lì e non
 * dove capita. È la stessa ragione per cui l'orario si legge contando le
 * colonne: la terza casella della riga deve restare la terza anche quando le
 * prime due sono vuote.
 */
const tabellaDelFoglio = (xml: string, parole: string[]): string[][] => {
  const righe: string[][] = [];
  const metti = (riga: number, colonna: number, valore: string) => {
    if (riga < 1 || colonna < 1) return;
    while (righe.length < riga) righe.push([]);
    const dentro = righe[riga - 1];
    while (dentro.length < colonna) dentro.push('');
    dentro[colonna - 1] = valore;
  };

  const regola = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let trovato: RegExpExecArray | null;
  while ((trovato = regola.exec(xml))) {
    const attributi = trovato[1] || '';
    const dentro = trovato[2] || '';
    const indirizzo = /r="([A-Z]+\d+)"/i.exec(attributi);
    if (!indirizzo) continue;
    const tipo = /t="([^"]+)"/.exec(attributi)?.[1] || 'n';

    let valore = '';
    if (tipo === 'inlineStr') {
      valore = testoDelleT(dentro);
    } else {
      const v = /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(dentro);
      const grezzo = v ? testoVero(v[1]) : '';
      valore = tipo === 's' ? (parole[Number(grezzo)] ?? '') : grezzo;
    }
    if (!valore.trim()) continue;

    metti(
      numeroRiga(indirizzo[1]),
      numeroColonna(indirizzo[1]),
      valore.replace(/\s+/g, ' ').trim()
    );
  }

  /*
   * Le caselle unite. Sul foglio una lezione di due ore è una casella sola,
   * larga il doppio, e il suo contenuto sta scritto una volta: nell'angolo in
   * alto a sinistra. Copiarlo in tutte le caselle che copre è il modo di non
   * perdere la seconda ora, che è il caso più frequente di tutti (il modulo di
   * due ore) e quello che fa dire «mancano delle lezioni».
   */
  const unite = /<mergeCell\b[^>]*ref="([A-Z]+\d+):([A-Z]+\d+)"/g;
  while ((trovato = unite.exec(xml))) {
    const primaRiga = numeroRiga(trovato[1]);
    const primaColonna = numeroColonna(trovato[1]);
    const ultimaRiga = numeroRiga(trovato[2]);
    const ultimaColonna = numeroColonna(trovato[2]);
    const valore = righe[primaRiga - 1]?.[primaColonna - 1] || '';
    if (!valore) continue;
    for (let r = primaRiga; r <= ultimaRiga; r++) {
      for (let c = primaColonna; c <= ultimaColonna; c++) {
        if (r === primaRiga && c === primaColonna) continue;
        metti(r, c, valore);
      }
    }
  }

  return righe;
};

/* ------------------------------------------------- l'ingresso */

/**
 * Il testo di un file .xlsx, nella forma che il resto dell'app già conosce:
 * una riga per riga del foglio, le colonne separate da una tabulazione, come
 * un copia e incolla da Excel ma senza i suoi guai.
 *
 * Dei fogli si prende quello con più caselle piene. Gli esporti veri portano
 * dietro un foglio di servizio con dentro la riga del copyright, e prenderli
 * tutti e due vorrebbe dire attaccare in fondo all'orario una riga che orario
 * non è.
 */
export async function testoDaFoglio(file: File): Promise<string> {
  let voci: Map<string, Uint8Array>;
  try {
    voci = await apriCartella(await file.arrayBuffer());
  } catch (e) {
    throw e instanceof Error
      ? e
      : new Error('Non riesco ad aprire questo file Excel.');
  }

  const testoDi = (nome: string): string => {
    const dati = voci.get(nome);
    return dati ? new TextDecoder().decode(dati) : '';
  };

  const parole = paroleInComune(testoDi('xl/sharedStrings.xml'));

  const fogli = Array.from(voci.keys())
    .filter((n) => /^xl\/worksheets\/[^/]+\.xml$/.test(n))
    .sort();
  if (!fogli.length) {
    throw new Error(
      'Questo file Excel non ha nessun foglio dentro. Riaprilo in Excel e salvalo di nuovo.'
    );
  }

  let migliore: string[][] = [];
  for (const foglio of fogli) {
    const tabella = tabellaDelFoglio(testoDi(foglio), parole);
    const piene = tabella.reduce(
      (conto, riga) => conto + riga.filter((c) => c).length,
      0
    );
    const pieneMigliore = migliore.reduce(
      (conto, riga) => conto + riga.filter((c) => c).length,
      0
    );
    if (piene > pieneMigliore) migliore = tabella;
  }

  if (!migliore.length) {
    throw new Error(
      'Questo foglio Excel è vuoto, o le caselle sono immagini invece che testo.'
    );
  }

  const quanteColonne = migliore.reduce((max, r) => Math.max(max, r.length), 0);
  return migliore
    .map((riga) => {
      const piena = [...riga];
      while (piena.length < quanteColonne) piena.push('');
      return piena.join('\t');
    })
    .join('\n');
}
