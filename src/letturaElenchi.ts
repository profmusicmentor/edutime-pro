/**
 * Import degli elenchi «classe → docenti» che le scuole tengono in un PDF.
 *
 * Il lavoro si fa in due tempi, e il primo basta quasi sempre:
 *
 * 1. Il PDF si apre qui dentro, nel browser. Il testo si estrae con pdf.js e
 *    lo legge un piccolo interprete scritto a mano, che cerca le classi
 *    dell'istituto e i nomi che le accompagnano. In questo passaggio non esce
 *    niente: nessuna rete, nessun server, nessun documento caricato da
 *    qualche parte.
 *
 * 2. Se il documento è fatto in un modo che l'interprete non capisce (tabelle
 *    su più colonne, righe spezzate, sigle strane) si può chiedere aiuto a un
 *    modello linguistico, dall'endpoint /api/importa-docenti. È la parte
 *    dell'abbonamento, e va detto chiaro perché conta: in quel caso il testo
 *    del documento, nomi dei docenti compresi, esce dal computer e arriva
 *    alla società che gestisce il modello. Per questo la chiamata parte solo
 *    con una spunta esplicita, mai da sola.
 *
 * In tutti e due i casi non si scrive niente nel documento della scuola
 * finché la persona non guarda l'anteprima e conferma.
 */

/* --------------------------------------------------------------- tipi */

/** Una classe con i docenti letti dal documento, ancora come testo. */
export interface RigaLetta {
  classe: string;
  docenti: string[];
}

/** Come è andata la ricerca di un nome fra i docenti già presenti in app. */
export type EsitoNome = 'trovato' | 'nuovo' | 'ambiguo';

export interface DocenteProposto {
  /** Il nome così come sta nel documento, ripulito. */
  testo: string;
  /** L'id del docente in EduTime Pro, quando lo si è riconosciuto. */
  id: string | null;
  esito: EsitoNome;
  /** True finché la persona non lo toglie dall'anteprima. */
  scelto: boolean;
  /**
   * I docenti dell'app che potrebbero essere questa persona, quando ce n'è
   * più d'uno che ci somiglia: l'anteprima li mette in un menù e la scelta
   * la fa chi guarda.
   */
  candidati: { id: string; name: string }[];
}

export interface ClasseProposta {
  classe: string;
  docenti: DocenteProposto[];
}

/* -------------------------------------------------- lettura del file */

/** Un pezzo di testo del PDF, con la sua misura e il suo posto sul foglio. */
type PezzoPdf = { str?: string; width?: number; transform?: number[] };

/** Un'ora scritta da sola: «8.00», «13h30», «10:15», oppure il suo numero. */
const SOLO_ORA = /^(?:(?:[01]?\d|2[0-3])[h:.][0-5]\d|\d{1,2})$/i;

/**
 * Stacca le ore che il PDF ha scritto tutte in un pezzo solo.
 *
 * Un pezzo di testo del PDF di solito è una casella. La stampante «Microsoft
 * Print to PDF» di Windows però tira via di seguito le ore che le stanno
 * comode, e la fascia delle ore arriva come «10.00 11.00 12.00 13.00 14.00»:
 * un pezzo unico, di cui si legge la prima ora e le altre quattro spariscono.
 * Senza quelle non si sa più quante colonne ha la tabella, e l'orario non si
 * legge.
 *
 * Si stacca solo il pezzo fatto tutto di ore, e da tre in su: un nome e
 * cognome non si tocca, e nemmeno «1 A», che è una classe. Ogni ora si rimette
 * al suo posto sul foglio dividendo la larghezza del pezzo per le lettere che
 * ha: è il conto che serve, perché quelle ore sul foglio sono distanti fra
 * loro il doppio di quanto sembrano dalle lettere.
 */
const staccaOreAttaccate = (pezzi: PezzoPdf[]): PezzoPdf[] => {
  const staccati: PezzoPdf[] = [];
  for (const item of pezzi) {
    const testo = item.str ?? '';
    const larghezza = item.width ?? 0;
    const parole: { testo: string; da: number }[] = [];
    const regola = /\S+/g;
    let trovato: RegExpExecArray | null;
    while ((trovato = regola.exec(testo))) {
      parole.push({ testo: trovato[0], da: trovato.index });
    }
    const tutteOre = parole.every((p) => SOLO_ORA.test(p.testo));
    if (parole.length < 3 || !tutteOre || !(larghezza > 0) || !item.transform) {
      staccati.push(item);
      continue;
    }
    for (const parola of parole) {
      const transform = [...item.transform];
      transform[4] += (parola.da / testo.length) * larghezza;
      staccati.push({
        str: parola.testo,
        width: (parola.testo.length / testo.length) * larghezza,
        transform,
      });
    }
  }
  return staccati;
};

/**
 * Estrae il testo di un PDF. pdf.js si carica solo qui, con un import
 * dinamico: è una libreria grossa e chi non importa mai niente non deve
 * scaricarsela.
 *
 * Le righe si ricostruiscono dalla posizione verticale dei pezzi di testo:
 * il PDF non ha il concetto di riga, ha frammenti con delle coordinate. I
 * frammenti che stanno alla stessa altezza tornano sulla stessa riga.
 *
 * Dentro la riga ogni pezzo viene rimesso alla colonna in cui sta davvero,
 * riempiendo di spazi il vuoto che ha davanti: la tabella esce allineata,
 * come la si vede sul foglio. Prima i pezzi venivano solo separati da due
 * spazi, e su un orario questo cancellava l'informazione più importante:
 * nella riga di un docente le ore libere non stampano niente, quindi
 * diciotto classi scritte di fila non dicono più a quale delle trentacinque
 * ore appartengono. Con le colonne al loro posto, invece, ogni classe sta
 * sotto il suo giorno e la sua ora, e si può leggere.
 */
export async function estraiTestoPdf(file: File): Promise<string> {
  return (await leggiPdf(file, false)).testo;
}

/**
 * Il testo di un PDF insieme ai colori di fondo delle sue caselle.
 *
 * Serve agli orari già costruiti dalla scuola, dove il colore dice quello che
 * il testo non dice: la fascia rossa sul giorno libero, quella gialla sul
 * giorno in cui il docente sta in un'altra scuola. Sono righe vuote tutte e
 * due, e senza il colore restano indistinguibili da un'ora buca qualsiasi.
 */
export async function estraiTestoPdfConSfondi(
  file: File
): Promise<{ testo: string; sfondi: SfondiPdf | null }> {
  return leggiPdf(file, true);
}

/**
 * Il colore di fondo del documento, letto per riga di testo e colonna di
 * carattere: le stesse due misure con cui `leggiGrigliaOrario` conta le celle,
 * così le due letture parlano la stessa lingua e non serve incrociare
 * coordinate.
 */
export interface SfondiPdf {
  /** «#rrggbb» se lì sotto c'è un colore, `null` se il foglio è bianco. */
  coloreDi: (riga: number, colonna: number) => string | null;
}

/** Una riga ricostruita dal PDF, con il posto che occupa sul foglio. */
interface RigaPdf {
  testo: string;
  /** La pagina, contata da 1. */
  pagina: number;
  /** L'altezza a cui sta la riga, in punti PDF (dal basso). */
  y: number;
}

/** Il colore di un pixel, nella forma «#rrggbb». */
const esadecimale = (r: number, g: number, b: number): string =>
  '#' +
  [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

/**
 * Il campione è caduto sopra una lettera o sopra il filo di una tabella?
 *
 * Si guarda la componente più forte, non la luminosità: il rosso pieno è un
 * colore scuro a guardarlo con gli occhi (viene un terzo del bianco), e
 * scartando i campioni scuri sparivano proprio le fasce rosse dei giorni
 * liberi, cioè la cosa che si era venuti a cercare. L'inchiostro, invece, è
 * spento in tutti e tre i colori.
 */
const inchiostro = (r: number, g: number, b: number): boolean =>
  Math.max(r, g, b) < 110;

/**
 * Guarda che colore ha il foglio sotto ogni casella.
 *
 * La strada più corta non è leggere i comandi di disegno del PDF, che cambiano
 * da una versione all'altra della libreria e da un programma di stampa
 * all'altro: è stampare la pagina in un'immagine e guardare i pixel, che è
 * quello che farebbe una persona. La pagina si disegna in memoria, non si vede
 * e non esce di qui, esattamente come il testo.
 *
 * Di ogni casella si prendono sei campioni, un po' più in alto della riga di
 * scrittura e in tre punti diversi della sua larghezza, e vince il colore che
 * esce più volte: così una lettera o il filo della tabella non spostano il
 * risultato. I campioni scuri si buttano prima di contarli.
 */
const campionaSfondi = async (
  documento: any,
  righe: RigaPdf[],
  xMinimo: number,
  passo: number
): Promise<SfondiPdf | null> => {
  if (typeof document === 'undefined' || !righe.length) return null;

  // Fin dove guardare: la riga più lunga del documento, più un margine. Il
  // colore va cercato anche dove non c'è scritto niente, che è proprio il caso
  // del giorno libero.
  const colonne = righe.reduce((m, r) => Math.max(m, r.testo.length), 0) + 12;
  const trovati = new Map<string, string>();

  for (let n = 1; n <= documento.numPages; n++) {
    const diQui = righe
      .map((r, indice) => ({ ...r, indice }))
      .filter((r) => r.pagina === n);
    if (!diQui.length) continue;

    /*
     * Quanto è alta una riga su questa pagina. Si prende la distanza più
     * frequente fra una riga e la successiva: serve a sapere di quanto salire
     * sopra la riga di scrittura per finire in mezzo alla casella e non sulla
     * casella di sopra. Misurarla sul documento invece di fissarla vuol dire
     * che vale anche per un orario stampato in corpo grande.
     */
    const salti = diQui
      .slice(1)
      .map((r, i) => diQui[i].y - r.y)
      .filter((d) => d > 0.5)
      .sort((a, b) => a - b);
    const altezza = salti.length ? salti[Math.floor(salti.length / 2)] : 10;

    const pagina = await documento.getPage(n);
    const misura = pagina.getViewport({ scale: 1 });
    // Un tetto ai pixel: una pagina grande non deve far esplodere la memoria.
    const scala = Math.min(
      2,
      Math.max(1, Math.sqrt(4_000_000 / (misura.width * misura.height)))
    );
    const vista = pagina.getViewport({ scale: scala });
    const tela = document.createElement('canvas');
    tela.width = Math.ceil(vista.width);
    tela.height = Math.ceil(vista.height);
    const pennello = tela.getContext('2d', { willReadFrequently: true });
    if (!pennello) return null;
    // Il foglio è bianco: senza questo, dove il PDF non disegna niente
    // resterebbe trasparente e i campioni uscirebbero neri.
    pennello.fillStyle = '#ffffff';
    pennello.fillRect(0, 0, tela.width, tela.height);
    /*
     * Si disegna «come per la stampa», e non è un dettaglio: con il disegno
     * normale pdf.js avanza un pezzo per fotogramma, e una scheda che in quel
     * momento non è in primo piano di fotogrammi non ne riceve nessuno. La
     * pagina resterebbe lì a metà per sempre, e l'import con lei. Il disegno
     * per la stampa va avanti da solo, senza aspettare lo schermo, e i colori
     * di fondo delle caselle sono gli stessi nei due modi.
     */
    await pagina.render({
      canvasContext: pennello,
      canvas: tela,
      viewport: vista,
      intent: 'print',
    }).promise;
    const pixel = pennello.getImageData(0, 0, tela.width, tela.height).data;

    const pixelDi = (x: number, y: number): [number, number, number] | null => {
      const punto = vista.convertToViewportPoint(x, y);
      const cx = Math.round(punto[0]);
      const cy = Math.round(punto[1]);
      if (cx < 0 || cy < 0 || cx >= tela.width || cy >= tela.height) return null;
      const i = (cy * tela.width + cx) * 4;
      return [pixel[i], pixel[i + 1], pixel[i + 2]];
    };

    const alture = [altezza * 0.22, altezza * 0.42];
    const larghi = [passo * 0.3, passo * 0.5, passo * 0.7];
    for (const riga of diQui) {
      for (let colonna = 0; colonna < colonne; colonna++) {
        const conto = new Map<string, number>();
        for (const su of alture) {
          for (const lato of larghi) {
            const c = pixelDi(xMinimo + colonna * passo + lato, riga.y + su);
            if (!c) continue;
            if (inchiostro(c[0], c[1], c[2])) continue;
            const chiave = esadecimale(c[0], c[1], c[2]);
            conto.set(chiave, (conto.get(chiave) || 0) + 1);
          }
        }
        let vincitore = '';
        let quante = 0;
        conto.forEach((v, k) => {
          if (v > quante) {
            quante = v;
            vincitore = k;
          }
        });
        // Il bianco del foglio non è un colore: è l'assenza di colore, e
        // tenerlo vorrebbe dire riempire la mappa di niente.
        if (!vincitore || quante < 2) continue;
        const r = parseInt(vincitore.slice(1, 3), 16);
        const g = parseInt(vincitore.slice(3, 5), 16);
        const b = parseInt(vincitore.slice(5, 7), 16);
        if (r > 245 && g > 245 && b > 245) continue;
        trovati.set(`${riga.indice}:${colonna}`, vincitore);
      }
    }
    pagina.cleanup();
  }

  if (!trovati.size) return null;
  return {
    coloreDi: (riga: number, colonna: number) =>
      trovati.get(`${riga}:${colonna}`) || null,
  };
};

/**
 * Il corpo della lettura, uguale col colore e senza. I colori costano una
 * stampa in memoria di ogni pagina, perciò si fanno solo quando servono: chi
 * importa un elenco di docenti non deve pagarla.
 */
async function leggiPdf(
  file: File,
  conSfondi: boolean
): Promise<{ testo: string; sfondi: SfondiPdf | null }> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (
    await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  // Il documento non deve tirare giù font né altro da fuori: qui serve solo
  // il testo, e il file resta tutto in memoria.
  const caricamento = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableFontFace: true,
    disableAutoFetch: true,
  });
  const documento = await caricamento.promise;

  const pagine: string[] = [];
  /** Le righe emesse, nell'ordine in cui escono, per la lettura dei colori. */
  const righeConPosto: RigaPdf[] = [];
  let sfondi: SfondiPdf | null = null;
  try {
    /*
     * I pezzi fatti di soli spazi si buttano via. Certi programmi riempiono
     * le caselle vuote di una tabella con uno spazio lungo quanto la casella:
     * quello spazio non porta niente da leggere, ma occupa posto nella riga e
     * fa scivolare a destra tutto quello che viene dopo, che in una tabella
     * vuol dire mandare le celle sotto l'ora sbagliata.
     */
    const pezziPerPagina: PezzoPdf[][] = [];
    for (let n = 1; n <= documento.numPages; n++) {
      const pagina = await documento.getPage(n);
      const contenuto = await pagina.getTextContent();
      pezziPerPagina.push(
        staccaOreAttaccate(
          (contenuto.items as PezzoPdf[]).filter(
            (item) => item.transform && (item.str ?? '').trim().length
          )
        )
      );
      pagina.cleanup();
    }
    const tuttiIPezzi = pezziPerPagina.flat();

    /*
     * Quanto è larga una lettera in questo documento, in punti. Serve a
     * trasformare le coordinate in colonne di caratteri: senza una misura
     * presa dal documento stesso, un orario stampato in corpo piccolo e uno
     * in corpo grande finirebbero con allineamenti diversi. Si prende la
     * misura più stretta fra i pezzi lunghi, che è quella che non fa
     * sovrapporre niente.
     *
     * La misura si prende una volta sola per tutto il documento, non pagina
     * per pagina. Un orario di più pagine ha la stessa tabella su ognuna, ma
     * il nome più lungo, quello che detta la misura, sta su una pagina sola:
     * misurando pagina per pagina le colonne uscivano di larghezza diversa da
     * una pagina all'altra, e le ore dei docenti stampati dopo il primo foglio
     * finivano tutte spostate.
     */
    let passo = 5;
    const larghezze = tuttiIPezzi
      .filter((item) => (item.str ?? '').length >= 4 && (item.width ?? 0) > 0)
      .map((item) => (item.width as number) / (item.str as string).length);
    if (larghezze.length) passo = Math.min(...larghezze);
    if (!(passo > 0.5)) passo = 5;

    const xMinimo = tuttiIPezzi.length
      ? Math.min(...tuttiIPezzi.map((item) => item.transform![4]))
      : 0;

    for (const [indicePagina, pezzi] of pezziPerPagina.entries()) {
      /*
       * Le righe si mettono insieme guardando l'altezza, non l'ordine in cui i
       * pezzi stanno scritti nel file. Nel PDF il testo sta nell'ordine in cui
       * il programma l'ha buttato giù, che non è per forza quello in cui si
       * legge: la stampante «Microsoft Print to PDF» di Windows, per esempio,
       * scrive il nome del giorno e subito sotto le sue sette ore, poi passa al
       * giorno dopo. Seguendo quell'ordine la riga delle ore usciva spezzata in
       * cinque tronconi da sette, e con un'intestazione monca non si capisce
       * più sotto quale ora cade ogni casella: l'orario di un istituto vero
       * (Orario Facile, cinque giorni per sette ore) non si leggeva affatto.
       *
       * Prima si ordinano i pezzi dall'alto in basso, poi si raccolgono in
       * righe: si sta nella stessa riga finché non si scende di più di tre
       * punti dal primo pezzo della riga. Dentro la riga si va da sinistra a
       * destra, che è come la si legge sul foglio.
       */
      const dallAlto = [...pezzi].sort(
        (a, b) => b.transform![5] - a.transform![5]
      );

      const gruppi: PezzoPdf[][] = [];
      let yRiga: number | null = null;
      for (const item of dallAlto) {
        const y = item.transform![5];
        // Più di tre punti di dislivello dall'inizio della riga: riga nuova.
        if (yRiga === null || Math.abs(y - yRiga) > 3) {
          gruppi.push([]);
          yRiga = y;
        }
        gruppi[gruppi.length - 1].push(item);
      }

      const righe: string[] = [];
      for (const gruppo of gruppi) {
        // L'altezza della riga si prende prima di rimettere i pezzi in fila da
        // sinistra a destra: dopo, il primo pezzo non è più quello che ha
        // aperto la riga.
        const altezzaRiga = gruppo[0]?.transform?.[5] ?? 0;
        gruppo.sort((a, b) => a.transform![4] - b.transform![4]);
        let riga = '';
        for (const item of gruppo) {
          const testo = item.str ?? '';
          const x = item.transform![4];
          // La colonna in cui il pezzo sta sul foglio. Se il posto è già
          // occupato (due scritte attaccate, o misure arrotondate per difetto)
          // si accoda con uno spazio, senza mai tornare indietro.
          const colonna = Math.round((x - xMinimo) / passo);
          riga +=
            colonna > riga.length
              ? ' '.repeat(colonna - riga.length)
              : riga
                ? ' '
                : '';
          riga += testo;
        }
        const pulita = riga.trimEnd();
        // Le righe vuote non escono nel testo: per far tornare i conti a chi
        // legge i colori, non devono contare nemmeno qui.
        if (!pulita.trim()) continue;
        righe.push(pulita);
        righeConPosto.push({
          testo: pulita,
          pagina: indicePagina + 1,
          y: altezzaRiga,
        });
      }
      pagine.push(righe.join('\n'));
    }

    if (conSfondi) {
      try {
        sfondi = await campionaSfondi(documento, righeConPosto, xMinimo, passo);
      } catch {
        // Un documento che non si lascia stampare in memoria non è un
        // documento rotto: il testo c'è ed è quello che conta. Si va avanti
        // senza colori.
        sfondi = null;
      }
    }
  } finally {
    await caricamento.destroy();
  }

  return { testo: pagine.join('\n'), sfondi };
}

/** Legge un file di testo semplice (txt, csv) così com'è. */
const leggiTesto = (file: File): Promise<string> => file.text();

/**
 * Apre il file scelto dalla persona e ne restituisce il testo. Lancia un
 * Error con un messaggio già pronto da mostrare quando il file non va bene.
 */
export async function testoDelFile(file: File): Promise<string> {
  return (await apriFile(file, false)).testo;
}

/**
 * Come `testoDelFile`, ma dei PDF si porta dietro anche i colori di fondo.
 * La usa l'import dell'orario, l'unico posto in cui il colore di una casella
 * vuole dire qualcosa.
 */
export async function apriFileOrario(
  file: File
): Promise<{ testo: string; sfondi: SfondiPdf | null }> {
  return apriFile(file, true);
}

async function apriFile(
  file: File,
  conSfondi: boolean
): Promise<{ testo: string; sfondi: SfondiPdf | null }> {
  const nome = file.name.toLowerCase();
  if (nome.endsWith('.pdf')) {
    let testo: string;
    let sfondi: SfondiPdf | null = null;
    try {
      const letto = await leggiPdf(file, conSfondi);
      testo = letto.testo;
      sfondi = letto.sfondi;
    } catch {
      throw new Error(
        'Non riesco ad aprire questo PDF. Se è protetto da password, toglila e riprova.'
      );
    }
    if (testo.replace(/\s/g, '').length < 20) {
      throw new Error(
        'Questo PDF non contiene testo: è la fotografia di un foglio. Serve un PDF con il testo dentro, oppure copia e incolla l\'elenco qui sotto.'
      );
    }
    return { testo, sfondi };
  }
  /*
   * Il file di Excel. Si apre qui dentro come il PDF, senza mandare niente
   * fuori, e il lettore si carica solo adesso: chi non importa mai un foglio
   * non se lo deve scaricare. Le colonne del foglio diventano colonne di
   * testo separate da una tabulazione, cioè la stessa forma del copia e
   * incolla, che il resto dell'app sa già leggere.
   */
  if (nome.endsWith('.xlsx')) {
    const { testoDaFoglio } = await import('./letturaFoglioCalcolo');
    return { testo: await testoDaFoglio(file), sfondi: null };
  }
  /*
   * Il vecchio .xls di Excel 2003 non è un foglio compresso ma un file
   * binario di un altro secolo: aprirlo qui non si può, e conviene dirlo
   * chiaro insieme alla via d'uscita, che è un salvataggio e basta.
   */
  if (nome.endsWith('.xls')) {
    throw new Error(
      'Questo è un vecchio file .xls. Aprilo in Excel e salvalo con «Salva con nome» scegliendo «Cartella di lavoro di Excel (.xlsx)», poi ricaricalo qui.'
    );
  }
  if (/\.(txt|csv|tsv)$/.test(nome))
    return { testo: await leggiTesto(file), sfondi: null };
  throw new Error(
    'Formato non riconosciuto: serve un PDF, un file Excel .xlsx, un TXT o un CSV.'
  );
}

/* ------------------------------------------------- interprete locale */

/** Toglie accenti e maiuscole, per confrontare due nomi scritti diversi. */
const senzaAccenti = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Titoli e sigle che precedono un nome e non fanno parte del nome. */
const TITOLI =
  /\b(?:prof(?:\.ssa|\.essa|essore|essoressa|\.)?|docente|docenti|sig(?:\.ra|\.)?|dott(?:\.ssa|\.)?|maestr[oa]|ins(?:\.)?)\b\.?/gi;

/**
 * Parole che compaiono negli elenchi scolastici e non sono nomi di persona.
 * Serve a non prendere per docente l'intestazione di una colonna o il nome
 * di una materia.
 */
const NON_NOMI = new Set(
  [
    'classe','classi','sezione','sezioni','docente','docenti','materia','materie',
    'disciplina','discipline','cognome','nome','nominativo','elenco','consiglio',
    'consigli','coordinatore','coordinatrice','segretario','segretaria','verbale',
    'anno','scolastico','istituto','comprensivo','scuola','secondaria','primaria',
    'plesso','sede','pagina','allegato','totale','ore','firma','presente','assente',
    'italiano','storia','geografia','matematica','scienze','inglese','francese',
    'spagnolo','tedesco','tecnologia','arte','immagine','musica','strumento',
    'motorie','motoria','sportive','religione','alternativa','sostegno','educazione',
    'civica','approfondimento','lettere','fisica','chimica','informatica','diritto',
    'economia','latino','greco','filosofia','laboratorio',
  ].map((v) => v)
);

/**
 * Costruisce l'espressione che riconosce le classi dell'istituto dentro il
 * testo. Si parte dalle classi vere, non da una forma generica: così un
 * «5 B» scritto in una nota a piè di pagina, se la 5B non esiste, non
 * diventa una classe.
 *
 * Fra anno e sezione si accettano spazio, °, ^ e -, che è come le scuole
 * scrivono le classi nei documenti.
 */
const regexClassi = (classi: string[]): RegExp | null => {
  const pezzi = classi
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map((c) => {
      const m = /^(\d+)\s*(.+)$/.exec(c);
      const corpo = m
        ? `${m[1]}\\s*[°^\\-.]?\\s*${m[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
        : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return corpo;
    });
  if (!pezzi.length) return null;
  return new RegExp(`(?<![A-Z0-9])(?:${pezzi.join('|')})(?![A-Z0-9])`, 'g');
};

/** Da «1 ^ A» all'id della classe in app, «1A». */
const idClasse = (trovato: string): string =>
  trovato.replace(/[\s°^\-.]/g, '').toUpperCase();

/**
 * Dice se un pezzo di riga somiglia al nome di una persona: da due a quattro
 * parole, tutte alfabetiche, e nessuna che sia una parola d'ufficio.
 */
const sembraNome = (pezzo: string): boolean => {
  const pulito = pezzo
    .replace(/\(.*?\)/g, ' ')
    .replace(TITOLI, ' ')
    .replace(/[^\p{L}'’\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!pulito) return false;
  const parole = pulito.split(' ');
  if (parole.length < 2 || parole.length > 4) return false;
  return parole.every((p) => {
    if (p.length < 2) return false;
    return !NON_NOMI.has(senzaAccenti(p).toLowerCase());
  });
};

/** Ripulisce il nome per come va mostrato e confrontato. */
export const nomePulito = (pezzo: string): string =>
  pezzo
    .replace(/\(.*?\)/g, ' ')
    .replace(TITOLI, ' ')
    .replace(/^[\s\d.\-–—•·|)]+/, '')
    .replace(/[^\p{L}'’\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

/**
 * Legge il testo e ne ricava l'elenco «classe → docenti».
 *
 * Riconosce i due modi in cui questi elenchi sono scritti quasi sempre:
 * a blocchi («CLASSE 1A» e sotto i nomi, fino alla classe successiva) e a
 * righe («ROSSI MARIO - MATEMATICA - 1A, 2B»). Quando una riga contiene sia
 * classi sia un nome, vince la lettura a righe.
 */
export function leggiElenco(testo: string, classi: string[]): RigaLetta[] {
  const re = regexClassi(classi);
  if (!re) return [];

  const perClasse = new Map<string, string[]>();
  const aggiungi = (classe: string, nome: string) => {
    const lista = perClasse.get(classe) ?? [];
    if (!lista.includes(nome)) lista.push(nome);
    perClasse.set(classe, lista);
  };

  let blocco: string[] = [];

  for (const grezza of testo.split('\n')) {
    const riga = grezza.replace(/\t/g, '  ').trimEnd();
    if (!riga.trim()) continue;

    re.lastIndex = 0;
    const trovate = Array.from(riga.toUpperCase().matchAll(re)).map((m) =>
      idClasse(m[0])
    );

    // Quello che resta della riga tolte le classi: lì dentro si cercano i nomi.
    re.lastIndex = 0;
    const resto = riga.replace(re, '  ');

    // Le colonne di una tabella arrivano separate da due spazi (li mette
    // l'estrattore del PDF); virgole, punti e virgola e pallini separano gli
    // elenchi scritti in fila; i due punti e il trattino con gli spazi
    // attorno staccano il nome dall'etichetta («Religione: NERI LUCIA»,
    // «ROSSI MARIO - Lettere»). Il trattino senza spazi resta attaccato: nei
    // cognomi doppi fa parte del nome.
    const pezzi = resto
      .split(/\s{2,}|[;,•·|:]|\s[-–—]\s/)
      .map((p) => p.trim())
      .filter(Boolean);
    const nomi = pezzi.filter(sembraNome).map(nomePulito).filter(Boolean);

    if (nomi.length && trovate.length) {
      trovate.forEach((c) => nomi.forEach((n) => aggiungi(c, n)));
      blocco = trovate;
      continue;
    }
    if (trovate.length) {
      blocco = trovate;
      continue;
    }
    if (nomi.length && blocco.length) {
      blocco.forEach((c) => nomi.forEach((n) => aggiungi(c, n)));
    }
  }

  return Array.from(perClasse.entries())
    .map(([classe, docenti]) => ({ classe, docenti }))
    .filter((r) => r.docenti.length)
    .sort((a, b) => a.classe.localeCompare(b.classe, 'it'));
}

/* ------------------------------------------- abbinamento con lo staff */

const chiaveOrdinata = (nome: string): string =>
  senzaAccenti(nome)
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');

const parole = (nome: string): string[] =>
  senzaAccenti(nome)
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * Cerca ogni nome letto fra i docenti già in app. L'ordine dei tentativi va
 * dal sicuro all'incerto: prima le stesse parole in qualunque ordine (nel
 * documento può esserci «MARIO ROSSI» dove in app c'è «ROSSI MARIO»), poi
 * cognome più iniziale, infine il solo cognome se in tutto l'istituto ce n'è
 * uno solo che si chiama così. Se i candidati restano due, il nome si segna
 * come ambiguo e la scelta la fa la persona.
 */
export function abbina(
  righe: RigaLetta[],
  staff: { id: string; name: string }[]
): ClasseProposta[] {
  const perChiave = new Map<string, { id: string; name: string }[]>();
  const perCognome = new Map<string, { id: string; name: string }[]>();
  const perCognomeIniziale = new Map<string, { id: string; name: string }[]>();

  const spingi = (
    mappa: Map<string, { id: string; name: string }[]>,
    chiave: string,
    valore: { id: string; name: string }
  ) => {
    if (!chiave) return;
    const lista = mappa.get(chiave) ?? [];
    lista.push(valore);
    mappa.set(chiave, lista);
  };

  staff.forEach((s) => {
    const voce = { id: String(s.id), name: String(s.name) };
    const p = parole(nomePulito(voce.name));
    if (!p.length) return;
    spingi(perChiave, chiaveOrdinata(nomePulito(voce.name)), voce);
    spingi(perCognome, p[0], voce);
    if (p[1]) spingi(perCognomeIniziale, `${p[0]} ${p[1][0]}`, voce);
  });

  const cerca = (
    nome: string
  ): {
    id: string | null;
    esito: EsitoNome;
    candidati: { id: string; name: string }[];
  } => {
    const p = parole(nome);
    if (!p.length) return { id: null, esito: 'nuovo', candidati: [] };

    const tentativi = [
      perChiave.get(chiaveOrdinata(nome)),
      p[1] ? perCognomeIniziale.get(`${p[0]} ${p[1][0]}`) : undefined,
      perCognome.get(p[0]),
    ];
    for (const candidati of tentativi) {
      if (!candidati || !candidati.length) continue;
      if (candidati.length === 1)
        return { id: candidati[0].id, esito: 'trovato', candidati };
      return { id: null, esito: 'ambiguo', candidati };
    }
    return { id: null, esito: 'nuovo', candidati: [] };
  };

  return righe.map((r) => ({
    classe: r.classe,
    docenti: r.docenti.map((testo) => {
      const { id, esito, candidati } = cerca(testo);
      return { testo, id, esito, scelto: true, candidati };
    }),
  }));
}

/* --------------------------------------------- lettura assistita (IA) */

const INDIRIZZO = '/api/importa-docenti';

/** Errore che dice al pannello di riaprire il campo della chiave. */
export class ErroreLicenzaImport extends Error {}

/** Lo stato si chiede una volta sola: non cambia mentre l'app è aperta. */
let statoInCorso: Promise<boolean> | null = null;

/** True se sul server c'è un modello configurato per la lettura assistita. */
export function letturaAssistitaDisponibile(): Promise<boolean> {
  if (!statoInCorso) {
    statoInCorso = fetch(INDIRIZZO)
      .then((r) => (r.ok ? r.json() : { disponibile: false }))
      .then((d: { disponibile?: boolean }) => Boolean(d?.disponibile))
      .catch(() => false);
  }
  return statoInCorso;
}

/**
 * Manda il testo del documento al modello e riporta l'elenco che ne esce.
 *
 * Da qui esce il testo del PDF con dentro i nomi dei docenti: è il passaggio
 * che l'interfaccia fa accettare con una spunta prima di arrivare qui.
 */
export async function letturaAssistita(
  testo: string,
  classi: string[],
  nomiNoti: string[],
  credenziali: { licenza: string; istanza: string; clientId: string | null }
): Promise<RigaLetta[]> {
  let risposta: Response;
  try {
    risposta = await fetch(INDIRIZZO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testo,
        classi,
        nomiNoti,
        licenza: credenziali.licenza,
        istanza: credenziali.istanza,
        clientId: credenziali.clientId,
      }),
    });
  } catch {
    throw new Error(
      'Non riesco a collegarmi per far leggere il documento. Controlla la connessione e riprova.'
    );
  }

  let dati: {
    classi?: { classe?: string; docenti?: string[] }[];
    errore?: string;
    licenzaMancante?: boolean;
  } = {};
  try {
    dati = await risposta.json();
  } catch {
    /* corpo vuoto o non JSON: sotto c'è già un messaggio di scorta */
  }

  const messaggio =
    dati.errore || 'Non sono riuscito a leggere il documento. Riprova fra poco.';

  if (risposta.status === 402 || dati.licenzaMancante) {
    throw new ErroreLicenzaImport(messaggio);
  }
  if (!risposta.ok || !Array.isArray(dati.classi)) {
    throw new Error(messaggio);
  }

  return dati.classi
    .map((r) => ({
      classe: String(r?.classe || '').toUpperCase(),
      docenti: Array.isArray(r?.docenti)
        ? Array.from(
            new Set(r.docenti.map((d) => nomePulito(String(d))).filter(Boolean))
          )
        : [],
    }))
    .filter((r) => r.classe && r.docenti.length);
}
