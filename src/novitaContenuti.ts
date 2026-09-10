/**
 * Elenco delle novità dell'app, dalla più recente alla più vecchia.
 * Il pannello le mostra all'incontrario, dalla più vecchia alla più recente.
 *
 * `NOVITA_VERSIONE` è la firma dell'ultimo aggiornamento: quando cambia, chi
 * apre EduTime Pro vede una volta sola il pannello con le ultime modifiche.
 * Il valore è la data del rilascio, così è leggibile anche a distanza di mesi.
 *
 * Chi apre l'app vede solo i rilasci usciti dopo l'ultimo che ha già letto,
 * non tutto l'elenco: il pannello non si allunga di visita in visita e
 * nessuno rilegge due volte la stessa cosa. L'elenco intero resta a
 * disposizione dal pulsante ✨ Novità in fondo alla pagina.
 *
 * Come si aggiorna: si aggiunge una voce in cima a `NOVITA`, si porta
 * `NOVITA_VERSIONE` alla data di quella voce e si copia la stessa voce
 * nell'archivio (vedi sotto). Nient'altro.
 *
 * Tre regole da rispettare:
 * - `versione` va scritta AAAA-MM-GG, con una lettera in coda per il secondo
 *   rilascio dello stesso giorno ('2026-08-21b'). Il confronto fra rilasci è
 *   alfabetico, quindi questo formato è anche l'ordine cronologico.
 * - si tengono gli ultimi dieci rilasci e le voci più vecchie si cancellano:
 *   l'elenco completo è un promemoria recente, non l'archivio dell'app. Erano
 *   sei, ma con più rilasci nello stesso giorno sparivano dal pannello cose
 *   uscite tre giorni prima, che per chi apre l'app una volta a settimana
 *   sono ancora novità.
 * - prima di cancellare una voce da qui la si copia nell'archivio, che è
 *   `Second Brain EduTime Pro/Conoscenza/Archivio delle novità (tutti i
 *   rilasci).md`: lì lo storico è completo e non si taglia mai.
 */
export const NOVITA_VERSIONE = '2026-09-10';

export type VoceNovita = {
  /** Data del rilascio, formato AAAA-MM-GG. */
  versione: string;
  /** Data scritta come si legge, per il titolo del blocco. */
  data: string;
  /** Le modifiche di quel rilascio, una frase per riga. */
  voci: string[];
};

export const NOVITA: VoceNovita[] = [
  {
    versione: '2026-09-10',
    data: '10 settembre 2026',
    voci: [
      '«📥 Importa orario» adesso legge anche gli orari stampati con «Stampa in PDF» di Windows, che prima non entravano affatto. Quella stampante scrive il file in un ordine suo: prima il nome del giorno, poi le sue ore, poi il giorno dopo. La fascia delle ore arrivava spezzata in cinque pezzi da sette, e senza la riga delle ore intera la tabella non si può leggere: restava solo la strada dell’assistente, cioè l’abbonamento e i nomi dei colleghi mandati fuori. Adesso le righe si rimettono insieme guardando l’altezza sul foglio, non l’ordine in cui sono scritte. Segnalazione di un collega.',
      'Nello stesso documento le ore erano scritte tutte attaccate — «10.00 11.00 12.00 13.00 14.00» in un pezzo solo — e se ne leggeva una su cinque. Ora si staccano, e ognuna torna al suo posto sul foglio.',
      'Gli orari di più pagine non si spostano più dopo il primo foglio. La larghezza delle colonne veniva misurata pagina per pagina, ma il nome più lungo, quello che detta la misura, sta su una pagina sola: dal secondo foglio in poi le lezioni finivano tutte nell’ora sbagliata. La misura adesso si prende una volta per tutto il documento.',
      'Le lezioni di due ore di fila nella stessa classe entrano tutte e due anche quando il foglio le stampa come un’unica casella larga il doppio, con la classe scritta in mezzo. Su un orario vero di un istituto comprensivo — sessantatré docenti, cinque giorni per sette ore — erano ottantuno ore su ottocentottanta che sparivano. Adesso si leggono tutte e ottocentottanta, senza sbagliarne una.',
    ],
  },
  {
    versione: '2026-09-09g',
    data: '9 settembre 2026',
    voci: [
      'Il file di Excel dell’orario adesso si carica com’è. Prima «📥 Importa orario» accettava solo PDF, TXT e CSV: chi l’orario ce l’aveva in un .xlsx si sentiva dire «formato non riconosciuto» e doveva passare per il copia e incolla. Ora si sceglie il file e basta. Si apre qui dentro, nel browser, senza mandare fuori niente e senza abbonamento, esattamente come il PDF.',
      'Ed era proprio il copia e incolla a non bastare, con l’orario esportato da EDT. Quel foglio scrive «13h00» e sotto «14h00» dentro la stessa casella, e le ore libere come un trattino sopra l’altro: quando si copia una casella con un a capo dentro, il foglio di calcolo la consegna fra virgolette e l’a capo se lo tiene. Una riga della tabella arrivava spezzata in tre, le colonne non tornavano più e la lettura non trovava niente. Adesso quelle caselle vengono rimesse su una riga sola prima di leggere, quindi anche l’incolla funziona.',
      'Due cose che si perdevano per strada nella stessa tabella. L’ultima ora del giorno, quando l’intestazione tiene due orari nella stessa casella («13h00 14h00»): erano cinque colonne su trenta, con dentro le loro lezioni. E le caselle dove ci sono due docenti nella stessa ora, che i programmi scrivono «Rossi,3A»: quelle sparivano intere, e con loro spariva l’orario di chi fa sostegno o compresenza tutta la settimana. Su un orario vero di undici classi si passa da 237 lezioni lette a 341, che sono tutte quelle che ci sono.',
      'Anche le lezioni lunghe due ore, quelle che sul foglio sono una casella sola larga il doppio, adesso entrano su tutte e due le ore invece che solo sulla prima.',
    ],
  },
  {
    versione: '2026-09-09f',
    data: '9 settembre 2026',
    voci: [
      'La tabella copiata da Excel e incollata nel riquadro dell’import adesso si legge, e si legge qui dentro. Quando si copiano delle celle, il foglio di calcolo separa le colonne con una tabulazione: sullo schermo la tabella si vede ancora, ma nel testo l’allineamento non c’è più, e la lettura in casa, che le colonne le conta, non trovava niente. Ora quello che incolli viene rimesso in colonna prima di essere letto, con le caselle vuote al loro posto.',
      'Serve a chi l’orario ce l’ha in un foglio di calcolo e non in PDF, e a chi il PDF ce l’ha ma stampato in una forma che l’app non riconosce: si apre il foglio, si selezionano le celle, si incolla. Come per il PDF, letto così nessun nome esce dal computer e l’abbonamento non serve.',
    ],
  },
  {
    versione: '2026-09-09e',
    data: '9 settembre 2026',
    voci: [
      '«📥 Importa orario» adesso legge da solo anche gli orari che al posto del numero dell’ora stampano l’ora dell’orologio: «8h00 9h00 10h00» invece di «1 2 3». È la forma di EDT, che è un programma francese e in parecchie scuole è quello con cui si fa l’orario. Prima la lettura veloce si fermava sulla prima riga, perché cercava i numeri, e restava solo la strada dell’assistente: l’abbonamento, e i nomi dei colleghi mandati fuori. Adesso quei PDF entrano contati dal browser, gratis e senza far uscire niente.',
      'Il numero dell’ora, in quei documenti, si ricava mettendo in fila gli orari diversi che compaiono in cima: il primo è la prima ora, il secondo la seconda, e così via. Serve perché un giorno che comincia alle 9h00 mentre gli altri cominciano alle 8h00 va incolonnato con gli altri lo stesso, e non spostato di un’ora.',
    ],
  },
  {
    versione: '2026-09-09d',
    data: '9 settembre 2026',
    voci: [
      'La spunta «i nomi dei docenti vengono mandati fuori» adesso compare solo quando serve davvero. Siccome il PDF lo legge il browser, quel testo stava in mezzo alla finestra anche quando fuori non andava niente: un allarme per una cosa che non succedeva. Ora si preme «Leggi l’orario» e basta; se la tabella non ha la forma che l’app riconosce da sola, allora compare l’avviso, con la spunta e il pulsante «Prova con l’assistente».',
      'Un docente che nel documento fa sia sostegno sia una materia sua adesso nasce due volte, una scheda per lavoro: la sua materia fra le cattedre curricolari e le ore di sostegno nell’elenco del sostegno. Prima finiva tutto in una scheda sola, e le quattro ore di arte di chi ne fa diciotto di sostegno restavano nascoste in fondo a un elenco dove nessuno le cerca. Succede più spesso di quanto sembri, e non è un errore di lettura: è una cattedra sola fatta di due lavori.',
    ],
  },
  {
    versione: '2026-09-09c',
    data: '9 settembre 2026',
    voci: [
      'Nuovo pulsante «🧹 Svuota la scuola», nel Registro Cattedre accanto a quello che azzera le ore. Cancella docenti, sostegno, strumento, classi e orario e lascia l’app vuota: è il passo che mancava a chi apre EduTime Pro con i dati di esempio e vuole caricare al loro posto l’orario vero con «📥 Importa orario». Prima le due scuole si mescolavano e, fra i nomi, non si capiva più quale fosse un collega e quale un docente inventato. Restano la griglia oraria, le regole, le aule e le sedi, che non sono la tua scuola ma l’attrezzatura per costruirla.',
      'Il vecchio «🗑️ Resetta Tutto» adesso si chiama «🗑️ Azzera le ore», che è quello che ha sempre fatto: toglie i carichi orari e svuota la griglia, ma docenti e classi restano al loro posto. Il nome prometteva più di quanto cancellasse.',
      'Nella finestra dell’import c’è ora l’avviso di svuotare prima, e nella schermata iniziale una riga dice dove trovare l’import: è la domanda che arriva sempre il primo giorno, con l’orario dell’anno scorso in PDF già aperto sulla scrivania.',
      '«📥 Importa orario» adesso porta dentro anche i secondi docenti: la compresenza e il sostegno. Prima, quando nella stessa ora della stessa classe c’erano due nomi, la seconda riga veniva buttata con la scritta «quella classe ha già una lezione in quella casella»: su un orario vero voleva dire perdere una riga su cinque, e sparivano proprio le ore di sostegno. Ora entrano tutte e due nella stessa casella, il titolare con la sua materia e l’altro accanto. Il terzo docente sulla stessa ora resta fuori, perché l’app tiene due caselle per ora.',
      'Chi viene riconosciuto nell’elenco del sostegno entra come sostegno anche se nel documento sta su una riga come tutti gli altri, e le ore da secondo docente non finiscono nella cattedra ma nelle righe delle compresenze del Registro: così il monte ore della classe non risulta doppio e un «Allinea Compresenze» non cancella quello che hai appena importato.',
      'Il PDF dell’orario adesso lo legge il browser, contando le colonne della tabella, e il modello linguistico interviene solo se quella forma non c’è. Provando con l’orario vero di un istituto — trentacinque colonne fra lunedì e sabato — il modello si tirava indietro dicendo che le colonne non erano abbastanza allineate e tornava con zero righe; contarle qui dentro ne ha portate dentro 733 su 736, comprese le ore di sostegno. Va da sé, ma è la cosa che conta di più: letto così, nessun nome di collega esce dal computer, e non serve l’abbonamento.',
      'Quando l’app è ancora vuota, l’import si adatta alla settimana del documento invece di imporre la sua: chi fa lezione il sabato, o ha sei ore al giorno, non si vede più tagliare le celle che nella griglia di partenza non ci stavano. Le classi create prendono una settimana larga abbastanza da contenerle. Se invece la scuola nell’app c’è già ed è più stretta del documento, la finestra lo dice prima di importare.',
      'I docenti che nel documento hanno «SOSTEGNO» al posto della materia nascono nell’elenco del sostegno, non fra le cattedre curricolari: prima toccava spostarli a mano uno per uno.',
      'Il pannello delle novità adesso tiene gli ultimi dieci rilasci invece di sei. Con due o tre rilasci nello stesso giorno, chi apre l’app una volta a settimana si perdeva cose uscite tre giorni prima.',
    ],
  },
  {
    versione: '2026-09-09b',
    data: '9 settembre 2026',
    voci: [
      'La chat dell’assistente della Guida entra nell’abbonamento EduTime Pro AI, come le altre funzioni con l’intelligenza artificiale. Finora era rimasta aperta a tutti come prova: adesso, per farsi scrivere la risposta a parole tue, serve la chiave dell’abbonamento incollata in «🔑 Abbonamento IA».',
      'La ricerca nei capitoli della guida resta gratis per sempre e senza limiti: gira tutta dentro il tuo browser, non passa da nessun modello e non manda niente in rete. È quella che vedi aprendo «💬 Serve aiuto?», e continua a funzionare uguale anche senza chiave.',
    ],
  },
  {
    versione: '2026-09-09',
    data: '9 settembre 2026',
    voci: [
      '«📥 Importa orario» adesso crea anche le classi e i docenti che nell’app non ci sono. Prima leggeva il PDF o il foglio dell’anno scorso, ma teneva solo le righe in cui il docente era già in archivio: chi arrivava con l’orario completo dell’istituto e l’app ancora vuota si vedeva scartare tutto, e per usare la funzione doveva prima ribattere a mano settanta nomi e tutte le sezioni. Era il contrario di quello che serviva. Adesso, dopo la lettura, compare la spunta «Crea quello che manca» con il conto di quante classi e quanti docenti nascerebbero: con la spunta entrano insieme all’orario, senza la spunta si importano solo le righe che stanno in piedi da sole, come prima.',
      'I docenti creati così non arrivano vuoti: la cattedra viene contata dalle ore che hai importato, classe per classe, e la materia è quella scritta più volte accanto al loro nome nel documento. Restano da controllare, ma il registro non è più da riempire da zero.',
      'Due cose l’app non le inventa mai. Un cognome che in archivio corrisponde già a due persone non viene abbinato e non viene creato, perché un terzo omonimo è peggio di una riga da sistemare a mano; e una sigla che non ha la forma di una classe (anno più sezione, tipo 1A) resta scartata, perché quasi sempre è l’intestazione di una colonna letta storta.',
    ],
  },
  {
    versione: '2026-09-08c',
    data: '8 settembre 2026',
    voci: [
      'La chiave dell’abbonamento si può incollare anche senza trattini. La mail dell’acquisto stampa la chiave tutta attaccata, ma il negozio la riconosce solo scritta come «xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx»: chi copiava dalla ricevuta si sentiva rispondere «Chiave non valida» pur avendo pagato, e non c’era modo di indovinare che mancavano cinque trattini. Adesso li rimette l’app, e sotto il campo c’è scritto dove trovare la chiave. Segnalazione arrivata dal pulsante dei feedback.',
    ],
  },
  {
    versione: '2026-09-08b',
    data: '8 settembre 2026',
    voci: [
      'Il riquadro «✨ Fatti aiutare dall’IA» dei Conflitti adesso ammette quando non può fare niente. Se quel che resta in lista sono solo avvisi «giornata sotto il minimo di ore», te lo dice prima che tu prema il pulsante: quegli avvisi non si tolgono spostando lezioni, perché l’ora isolata deve avere un altro giorno dove andare e con i docenti divisi su più scuole quel giorno non c’è. Prima l’IA ci provava lo stesso e rispondeva «nessuna mossa migliora l’orario», che è vero ma sembra una resa. Adesso la strada c’è: si porta «🚪 Minimo ore al giorno» su «Nessun minimo» in «⚙️ Sezioni & Regole» e spariscono tutti insieme. Vale la pena ricordare che quegli avvisi non sono errori: un orario con zero errori si può già usare. Segnalazione di un collega.',
      'Tolte due date di scadenza rimaste scritte a mano nell’app: il riquadro dei conflitti e la striscia dell’assistente della guida promettevano una prova gratuita «fino al 5 settembre 2026», che è passato da un pezzo. Ora dicono semplicemente come stanno le cose oggi.',
    ],
  },
];
