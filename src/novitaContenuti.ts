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
export const NOVITA_VERSIONE = '2026-09-09d';

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
  {
    versione: '2026-09-08',
    data: '8 settembre 2026',
    voci: [
      'Nel «Registro Cattedre» la preferenza delle ore consecutive si può dare materia per materia. Prima la casella «2h» valeva per tutta la cattedra: chi insegna italiano in una classe e storia in un’altra doveva scegliere fra blocchi di due ore ovunque e blocchi da nessuna parte, mentre le due materie hanno esigenze opposte. Adesso, nel riquadro delle assegnazioni (pulsante ➕ a fine riga, poi la classe), ogni materia ha la sua casella «2h»: quella scritta lì batte la colonna, e con ↺ la materia torna a seguire il resto della cattedra. Chi non tocca niente non vede cambiare nulla. Suggerimento di un collega arrivato dal pulsante dei feedback.',
    ],
  },
  {
    versione: '2026-09-07',
    data: '7 settembre 2026',
    voci: [
      'Le risposte dell’IA non parlano più per sigle. Quando chiedi aiuto sui conflitti, o premi «Perché non ci riesce?» nel report della generazione, il testo diceva «sposta l’ora di D3»: le sigle servono a non far uscire i nomi dal computer, ma erano rimaste anche nella risposta, e capire di chi si trattava era impossibile. Adesso i nomi tornano al loro posto prima che la risposta compaia sullo schermo. Fuori dal computer, come sempre, vanno solo le sigle.',
      'Nel «Registro Cattedre» la colonna «2h» ha un pulsantino nell’intestazione: «spegni» toglie la preferenza delle ore consecutive a tutti i docenti di quella tabella in un colpo solo, «accendi» la mette a tutti. Prima si poteva solo docente per docente, e siccome nei dati di partenza la spunta è accesa per tutti, chi quelle ore appaiate non le voleva doveva togliere una spunta per riga. Il pulsante vale solo per la tabella che ha sotto: Materie, Sostegno e Strumento restano indipendenti.',
    ],
  },
  {
    versione: '2026-09-06e',
    data: '6 settembre 2026',
    voci: [
      'La lettura delle richieste dei docenti non manda più fuori i nomi. Prima il testo che incollavi partiva così com’era, cognomi compresi. Adesso ogni docente che è già in archivio diventa una sigla (D1, D2, D3…) prima che il testo esca dal computer, e il nome vero torna al suo posto qui sull’app, insieme alla frase da cui il vincolo è stato ricavato. Chi in archivio non c’è resta scritto com’era, perché è anche l’unico a cui l’app non saprebbe abbinare niente. Nell’uso non cambia nulla: leggi lo stesso elenco di prima, con gli stessi nomi.',
      'Attenzione, una cosa non è cambiata: il motivo personale della richiesta («ho il rientro all’altra scuola», «per motivi di salute») sta dentro la frase e non dentro il nome, quindi esce lo stesso. La spunta prima di partire lo dice, e il consiglio resta quello: incolla solo la parte utile.',
    ],
  },
  {
    versione: '2026-09-06d',
    data: '6 settembre 2026',
    voci: [
      'La Guida è stata rimessa in pari con l’app. Le schede sono nove e non più sei: adesso ci sono anche «Assemblee», «Consigli di classe» e «Documenti». C’è un capitolo nuovo, «Scheda: Assemblee sindacali», che spiega come si registra un’assemblea, come l’app conta da sola le ore di chi aderisce, come si aggiungono infanzia, primaria e personale ATA, e come funzionano il tetto di ore dell’anno e il massimo di assemblee al mese.',
      'Nel capitolo «La barra superiore» sono arrivati i due pulsanti che mancavano: «🔑 Abbonamento IA», dove si incolla e si toglie la chiave, e «🌙 Notte / ☀️ Chiara», che cambia i colori di tutta l’app e si ricorda la scelta.',
      'Sono state corrette le parti che l’app aveva superato: i modelli di settimana sono quattro (A, B, C e D) e non più due, i tetti di ore al giorno arrivano a otto, le classi articolate valgono per qualsiasi materia e non solo per le tre lingue straniere, e la voce «Cosa NON fa l’app» non dice più che l’app non legge file esterni, visto che con l’abbonamento IA legge l’orario e gli elenchi docenti.',
      'Il capitolo del Registro Cattedre spiega ora come si mettono due materie nella stessa classe, e quello di «Sezioni & Regole» descrive la scheda «📚 Materie della scuola», quella che rinomina o unisce una materia ovunque in un colpo solo.',
    ],
  },
  {
    versione: '2026-09-06c',
    data: '6 settembre 2026',
    voci: [
      'Nel capitolo «Trasparenza e privacy» della Guida c’è una scheda nuova. Da oggi l’app tiene il conto di quante pagine vengono aperte, con Vercel Web Analytics: serve soltanto a capire se l’app viene usata e quanto. Non usa cookie, non costruisce un profilo di chi naviga, non manda niente ai servizi pubblicitari e non distingue una persona dall’altra. L’orario, i nomi dei docenti e il codice scuola non c’entrano e restano dove sono. Nell’uso quotidiano non cambia nulla.',
    ],
  },
];
