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
export const NOVITA_VERSIONE = '2026-09-06d';

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
  {
    versione: '2026-09-05',
    data: '5 settembre 2026',
    voci: [
      'In «🩹 Sostituzioni» c’è il riquadro «✨ Chi mando a coprire?». L’IA guarda le ore rimaste scoperte quel giorno e sceglie fra i docenti che l’app ha già trovato liberi, tenendo conto di chi ha già coperto tante ore: è il modo di non far ricadere tutto sempre sulla stessa persona. Prima di mostrarti le proposte, l’app ricontrolla che ogni scelta sia davvero fra i candidati di quell’ora e che nessuno finisca in due classi contemporaneamente. Le proposte si tolgono una per una e niente viene registrato finché non premi «Applica». I nomi dei docenti non escono dal computer: al loro posto vanno delle sigle.',
      'Nell’«Orario Generale» c’è «📥 Importa orario»: se l’orario dell’anno scorso è in un PDF o in un foglio, non serve più ribatterlo cella per cella. Si carica il file (PDF, TXT, CSV) oppure si apre in Excel, si selezionano le celle, si copiano e si incollano nella finestra. Prima di importare vedi quante lezioni sono pronte, quali righe sono state scartate e quali docenti non risultano ancora nel Registro Cattedre. Come per la lettura del PDF dei consigli, qui i nomi escono davvero dal computer, quindi la lettura parte solo dopo la spunta.',
      'Nel report dell’Auto-Generazione, quando restano ore non assegnate, compare «✨ Perché non ci riesce?». L’IA guarda le ore rimaste fuori e i vincoli accesi e dice in italiano quale sta stringendo, per esempio un tetto di ore al giorno troppo basso o un giorno libero che non ci sta. Dove può, propone la modifica come pulsante: la regola cambia quando la premi tu, una per volta, così puoi rigenerare e vedere l’effetto.',
      'Nel «Registro Cattedre» c’è «✉️ Richieste dei docenti»: si incollano le mail arrivate a giugno e a settembre, tutte insieme, e tornano indietro come vincoli da spuntare (giorno libero, ora bloccata, preferenza per le prime o per le ultime ore). Ogni riga porta con sé la frase da cui arriva, così il controllo si fa guardando; le richieste ambigue sono segnate e partono senza spunta, e i vincoli già presenti non vengono toccati. Anche qui il testo esce dal computer, quindi serve la spunta: incolla solo le richieste, non i motivi personali.',
      'Nell’«Orario Generale» c’è «💬 Chiedi all’orario»: domande a parole sull’orario che hai adesso, del tipo «chi è libero giovedì alla terza ora?» o «quali docenti hanno più di tre ore buche?». I conti li fa l’app prima di chiedere, così le risposte sono quelle vere e non stime; i nomi restano nel computer e diventano sigle.',
      'C’è una scheda nuova, «📝 Documenti»: la relazione per il Dirigente sui criteri seguiti, la circolare ai docenti, l’avviso alle famiglie per entrate e uscite fuori orario, la comunicazione delle sostituzioni del giorno e la convocazione dei consigli. I numeri li mette l’app, le frasi le scrive l’IA, e il testo resta lì da correggere, copiare o scaricare: da EduTime Pro non parte niente verso nessuno.',
      'Tutte queste funzioni fanno parte dell’abbonamento EduTime Pro AI, come l’aiuto sui conflitti e la lettura del PDF dei consigli. Senza la chiave l’app continua a funzionare come sempre: le sostituzioni si assegnano a mano, l’orario si compila dalla griglia, i vincoli si mettono uno per uno.',
      'La chiave dell’abbonamento ha finalmente un posto suo: il pulsante «🔑 Abbonamento IA» in alto a destra, accanto alla Guida. Prima si incollava dentro il pannello dell’assistente e si faceva fatica a trovarlo. Da lì vedi anche se l’abbonamento è attivo su questo dispositivo, e puoi togliere la chiave per liberare il posto e usarla su un altro computer.',
    ],
  },
  {
    versione: '2026-09-04',
    data: '4 settembre 2026',
    voci: [
      'Le aule adesso rispettano le sedi. Se la scuola ha più plessi, l’Auto-Generazione non manda più una classe in un laboratorio che sta in un altro edificio: cerca il laboratorio di quella materia nella sede della classe e, se lì non c’è, la lezione resta in aula. I laboratori a cui non è stata assegnata nessuna sede continuano a valere per tutti, quindi per le scuole a plesso unico non cambia niente. La stessa regola vale quando si cambia un’ora a mano.',
    ],
  },
];
