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
 * - si tengono gli ultimi sei rilasci e le voci più vecchie si cancellano:
 *   l'elenco completo è un promemoria recente, non l'archivio dell'app.
 * - prima di cancellare una voce da qui la si copia nell'archivio, che è
 *   `Second Brain EduTime Pro/Conoscenza/Archivio delle novità (tutti i
 *   rilasci).md`: lì lo storico è completo e non si taglia mai.
 */
export const NOVITA_VERSIONE = '2026-09-07';

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
  {
    versione: '2026-09-06b',
    data: '6 settembre 2026',
    voci: [
      'Lo stesso docente può finalmente fare due materie nella stessa classe: italiano e storia in 1A, matematica e scienze in 2B. Si aggiungono dal pulsante ➕ del Registro Cattedre, scrivendo nel campo «Materia in questa classe» una materia che in quella classe non ha ancora: invece di cambiare quella di prima, si aggiunge una riga. Nella finestra vedi l’elenco di quello che quel docente ha già in quella classe, con la ✕ per togliere una riga. Nella griglia del Registro la casella di quella classe diventa arancione e mostra il totale delle due materie: si preme e si apre la finestra, perché una casella sola non basta più a dire quale delle due stai cambiando. Chi ha una materia per classe non vede nessuna differenza.',
      'C’è una scheda nuova in «⚙️ Sezioni & Regole»: «📚 Materie della scuola». Elenca tutte le materie che l’app conosce, con quanti docenti le insegnano, quante ore di cattedra hanno, quante ore sono già in orario e quale laboratorio è collegato. Da lì si rinomina una materia ovunque in un colpo solo: docenti, righe di cattedra, lezioni già in orario, elenco delle materie del laboratorio, coppie da non affiancare e classi articolate. Se il nome nuovo esiste già le due materie diventano una, ed è il modo di rimettere insieme «ED. FISICA» e «EDUCAZIONE FISICA» scritte in due modi.',
      'Le classi articolate non sono più solo per Spagnolo, Francese e Tedesco: la materia si sceglie fra tutte quelle della scuola. L’elenco delle tre lingue era scritto dentro al programma e non serviva a niente, perché l’accorpamento esiste comunque solo dove lo dichiari tu.',
      'Gli elenchi delle materie sparsi per l’app (le coppie da non affiancare, le classi articolate, il filtro del tabellone) adesso vedono anche le materie scritte sulle singole righe di cattedra. Prima conoscevano solo la materia principale del docente, quindi una materia insegnata da una riga sola non compariva da nessuna parte.',
    ],
  },
  {
    versione: '2026-09-06',
    data: '6 settembre 2026',
    voci: [
      'Le ore che metti a mano e chiudi col lucchetto non vengono più raddoppiate. Prima, se assegnavi tu due ore di un docente in una classe e le bloccavi, l’Auto-Generazione gliene aggiungeva altre due: il docente si ritrovava con il doppio delle ore in quella classe e, per farcele stare, le ore in più finivano anche oltre la fine della giornata prevista dal modello. Adesso il generatore parte contando quello che è già in orario e piazza solo le ore che mancano davvero.',
      'Il tetto di ore al giorno adesso conta i minuti, non le caselle. Chi ha accorciato un’ora della giornata a 30 minuti (in «Impostazioni», colonna Durata) vedeva quella mezz’ora pesare come un’ora intera: il tetto si riempiva prima del tempo e l’ultima ora restava vuota tutti i giorni. Adesso una lezione da mezz’ora vale mezz’ora. Se la giornata piena supera comunque il tetto (cinque ore più una mezz’ora fanno 5,5 contro un tetto di 5), il tetto va alzato a 6 in «Sezioni & Regole».',
      'I modelli di orario sono passati da due a quattro: A, B, C e D. Gli istituti con più plessi, dove la primaria, la secondaria e un terzo edificio hanno giornate diverse, non devono più far entrare tutto in due griglie sole. I modelli C e D partono uguali al B e restano fermi finché non li assegni a una sezione, quindi per chi non li tocca non cambia niente.',
      'Il «Massimo ore al giorno» e il «Massimo ore al giorno nella stessa classe» arrivano fino a otto. Serve ai laboratori lunghi degli istituti professionali e dei corsi serali, che tengono lo stesso docente in classe per quattro, cinque o più ore di fila. È anche il tetto che decide quanto può durare un blocco consecutivo: la preferenza «ore consecutive» non è mai stata limitata a due ore, era l’etichetta a dirlo, e adesso è scritta giusta.',
      'Nella scheda «Sostegno» c’è il pulsante «🖨️ Tutti»: stampa un tabellone unico con l’orario di tutti i docenti di sostegno, invece di un foglio per volta.',
    ],
  },
];
