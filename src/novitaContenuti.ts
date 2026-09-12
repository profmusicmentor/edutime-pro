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
export const NOVITA_VERSIONE = '2026-09-12';

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
    versione: '2026-09-12',
    data: '12 settembre 2026',
    voci: [
      'Le ore di potenziamento si segnano con la «P», come la disponibilità si segna con la «D». Nel menù della cella dell’Orario Generale, accanto a «D (disponibilità)», adesso c’è «P (potenziamento)»: chi ha otto ore di potenziamento in cattedra non deve più lasciarle vuote o inventarsi una classe finta per farle stare da qualche parte. La cella diventa verde con una «P» dentro, e la stessa «P» si rivede nella striscia della giornata in Sostituzioni. Segnalazione di una collega.',
      'Nella vista del singolo docente di sostegno non c’è più scritta solo la classe. Adesso si legge anche la materia di quell’ora, il nome del collega con cui si sta in aula e il laboratorio dove la classe si sposta: erano le tre cose che servivano per consegnare quel foglio al docente, e ogni volta bisognava andarle a cercare nella vista della classe. Vale a video e nel foglio stampato.',
      'Il foglio del laboratorio dice anche chi fa sostegno in quell’ora. Prima si leggevano classe, docente e materia: chi è dentro davvero, però, spesso è una persona in più. Adesso compare accanto agli altri, sia nella vista sia nella stampa da appendere alla porta.',
      'Quando si sceglie un’aula già occupata, l’app dice adesso anche con quale docente. «Lab. Scienze — occupata da 2B» diventa «occupata da 2B (Bianchi)»: per liberare il laboratorio bisogna parlare con una persona, e il nome di quella persona era l’unica cosa che mancava.',
      'I laboratori si possono mettere in ordine. Nel riquadro «Aule e Laboratori» ogni scheda ha due frecce, su e giù: l’ordine che si sceglie lì è quello con cui le aule escono nel menù della cella. Prima restavano nell’ordine in cui erano state create, che dopo il decimo laboratorio non è più l’ordine di nessuno.',
      'Si possono stampare tutte le schede in un colpo solo. Accanto al pulsante di stampa, nelle viste per classe, per docente e per laboratorio, adesso c’è «🖨️ Tutte»: esce un unico documento con una pagina per ogni classe, per ogni docente o per ogni laboratorio, già impaginata come la scheda singola. Il browser non sa salvare tanti PDF separati da solo, ma un file fatto così si divide in un momento, invece di ristampare sessanta volte scegliendo un nome per volta.',
    ],
  },
  {
    versione: '2026-09-10c',
    data: '10 settembre 2026',
    voci: [
      'Le ore di compresenza non gonfiano più il monte ore del docente. Nell’Orario Generale, nel file Excel e nelle stampe la colonna «Ore» dice adesso le sole ore di cattedra, e le compresenze si leggono sotto, scritte come «+2h comp.»: chi ha diciotto ore di cattedra e due di compresenza si vedeva scritto venti accanto al proprio nome, che non è la sua cattedra e non è il numero che si aspetta di trovare in un prospetto. Per l’orario restano ore di servizio come prima, quindi i Conflitti continuano a segnalare il docente che in quell’ora sarebbe in due classi. Segnalazione di un collega.',
      'Le compresenze si possono dichiarare per disciplina, senza fare nomi. Nel riquadro «👥 Compresenze» del Registro Cattedre due pulsanti scelgono il modo: «per docente» è quello di sempre, «per discipline» chiede la classe, la disciplina che ospita e la disciplina che affianca, e il docente lo trova l’app. È il modo in cui la compresenza viene decisa nei consigli, «in 2A inglese entra sulle ore di geografia», e non costringe più a cercare a mano chi insegna cosa in quella classe. Se le persone possibili sono più di una, l’app lo dice e la scelta resta tua.',
    ],
  },
  {
    versione: '2026-09-10b',
    data: '10 settembre 2026',
    voci: [
      '«📥 Importa orario» adesso guarda anche i colori del documento. Negli orari che le scuole costruiscono da sé la giornata in cui il docente non c’è è dipinta: rossa quando è il giorno libero, gialla quando quel giorno insegna in un’altra scuola. Sono due righe vuote uguali, e senza il colore erano indistinguibili da un buco fra due lezioni: i giorni liberi di sessanta colleghi andavano riscritti a mano uno per uno, dopo aver importato l’orario. Adesso si leggono dal foglio insieme alle lezioni.',
        'Il significato dei colori non viene indovinato in silenzio. Nell’anteprima si vede il colore com’è, quante giornate ha dipinto e su quanti docenti, e da un menù si dice cosa vuol dire: il rosso arriva già proposto come giorno libero e il giallo come altra scuola, ma un istituto che li usa al contrario cambia due menù e via. Le tinte tenui non contano: un fondo grigetto è quasi sempre solo una riga alternata.',
      'Il giorno in un’altra scuola non diventa un giorno libero: viene bloccato ora per ora, che è il posto che l’app tiene per chi divide la cattedra fra due istituti. E quando il documento segna più giorni liberi di quanti il tetto ne consenta (chi ha diciotto ore ne ha diritto a uno solo), quelli in più non si buttano: diventano ore bloccate, che per il generatore vale lo stesso. Buttarli vorrebbe dire ritrovarsi una lezione nel giorno in cui il docente non c’è.',
      'Entrano anche le ore segnate «D», la disponibilità per le supplenze. Prima venivano scartate perché non hanno la forma di una classe, e con loro se ne andava l’unica cosa che nell’orario dice dove il docente deve restare a scuola. Adesso si ritrovano nell’Orario Generale e nel prospetto delle ore di disponibilità della segreteria. Le «D» si leggono da qualsiasi documento, anche dal foglio di Excel e dal copia e incolla; i colori, per ora, solo dal PDF.',
      'Chi nel documento compare solo con i colori e le «D», senza nemmeno una lezione sua, adesso ha una scheda dove finire: è il caso del docente di potenziamento con sei ore di disponibilità. Prima i suoi vincoli si perdevano in silenzio.',
    ],
  },
  {
    versione: '2026-09-10',
    data: '10 settembre 2026',
    voci: [
      '«📥 Importa orario» adesso legge anche gli orari stampati con «Stampa in PDF» di Windows, che prima non entravano affatto. Quella stampante scrive il file in un ordine suo: prima il nome del giorno, poi le sue ore, poi il giorno dopo. La fascia delle ore arrivava spezzata in cinque pezzi da sette, e senza la riga delle ore intera la tabella non si può leggere: restava solo la strada dell’assistente, cioè l’abbonamento e i nomi dei colleghi mandati fuori. Adesso le righe si rimettono insieme guardando l’altezza sul foglio, non l’ordine in cui sono scritte. Segnalazione di un collega.',
      'Nello stesso documento le ore erano scritte tutte attaccate, «10.00 11.00 12.00 13.00 14.00» in un pezzo solo, e se ne leggeva una su cinque. Ora si staccano, e ognuna torna al suo posto sul foglio.',
      'Gli orari di più pagine non si spostano più dopo il primo foglio. La larghezza delle colonne veniva misurata pagina per pagina, ma il nome più lungo, quello che detta la misura, sta su una pagina sola: dal secondo foglio in poi le lezioni finivano tutte nell’ora sbagliata. La misura adesso si prende una volta per tutto il documento.',
      'Le lezioni di due ore di fila nella stessa classe entrano tutte e due anche quando il foglio le stampa come un’unica casella larga il doppio, con la classe scritta in mezzo. Su un orario vero di un istituto comprensivo, sessantatré docenti e cinque giorni per sette ore, erano ottantuno ore su ottocentottanta che sparivano. Adesso si leggono tutte e ottocentottanta, senza sbagliarne una.',
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
];
