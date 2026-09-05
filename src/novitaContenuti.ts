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
export const NOVITA_VERSIONE = '2026-09-05';

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
  {
    versione: '2026-09-03',
    data: '3 settembre 2026',
    voci: [
      'Nella scheda «Conflitti» c\u2019è un riquadro nuovo: «✨ Fatti aiutare dall\u2019IA». L\u2019IA guarda i conflitti rimasti e propone degli spostamenti di lezione. Prima di mostrarteli, l\u2019app li prova uno per uno sull\u2019orario e tiene solo quelli che tolgono davvero un problema: vedi quanti conflitti restano, e l\u2019orario cambia solo quando premi «Applica». I nomi dei docenti non escono dal computer, al loro posto vanno delle sigle. Fino al 5 settembre 2026 si prova senza chiave; dopo fa parte dell\u2019abbonamento EduTime Pro AI.',
      'Anche la lettura del PDF con l\u2019IA nei «Consigli di classe» si prova senza chiave fino al 5 settembre 2026, e da quel giorno entra nell\u2019abbonamento insieme all\u2019aiuto sui conflitti. La lettura fatta dall\u2019app, quella che non manda niente a nessuno, resta gratuita e senza limiti.',
    ],
  },
  {
    versione: '2026-09-02b',
    data: '2 settembre 2026',
    voci: [
      'Il «Monte ore» in «Gestione Sezioni» si riesce finalmente a cambiare. Prima, appena si cancellava il numero, la casella tornava da sola a 30 e non si riusciva più a scriverci dentro: alla primaria diventava impossibile impostare 24 o 27. Adesso la casella resta vuota mentre si scrive, accetta anche le mezze ore, e sotto ci sono i valori pronti 24, 27, 30, 36 e 40 da premere per impostarli in un colpo solo.',
      'Il lucchetto «🔒 Sola Lettura» adesso si nota. Sotto l\'intestazione compare una fascia gialla che spiega perché i comandi sono grigi, con il pulsante «🔓 Torna a modificare». Il blocco riguarda solo il proprio browser: non dipende dal cloud né dal collega che ha passato il codice scuola, e chi ha il codice può sempre scrivere.',
      'Nei «🧑\u200d🏫 Consigli di classe» il piano dice quante sale sta usando davvero, per esempio «Sale usate: 1 su 3», e spiega il perché: due consigli occupano due sale nello stesso momento solo se non hanno nessun docente in comune, altrimenti le riunioni vanno una dopo l\'altra e le altre sale restano vuote.',
    ],
  },
  {
    versione: '2026-09-02',
    data: '2 settembre 2026',
    voci: [
      'Il calendario dei «🧑‍🏫 Consigli di classe» non va più a finire di sera tardi o di notte. Prima le riunioni si accodavano una dopo l\'altra senza mai fermarsi; adesso si imposta la fascia oraria del pomeriggio («Dalle» e «Alle») e nessun consiglio finisce oltre quell\'ora. Quando un pomeriggio è pieno, l\'app passa al giorno feriale successivo: con «Pomeriggi a disposizione» si dice quanti giorni può usare (di partenza tre), la domenica resta sempre libera e il sabato si usa solo se lo si accende. Sotto le impostazioni è scritto quanti consigli entrano in un pomeriggio.',
      'Il calendario esce diviso per giornata, con la data in cima a ogni tabella; nell\'Excel c\'è la colonna «Giorno», sia nel foglio del calendario sia in quello degli impegni per docente. Se i giorni indicati non bastano, le classi che avanzano compaiono fra i «consigli non collocati» con scritto cosa fare: aggiungere giorni o sale, allungare la fascia oraria o accorciare le riunioni.',
    ],
  },
  {
    versione: '2026-09-01e',
    data: '1 settembre 2026',
    voci: [
      'Nella scheda «🧑\u200d🏫 Consigli di classe» c\'è il pulsante «Importa da PDF 📄»: se gli elenchi dei docenti classe per classe esistono già in un PDF, non serve più ribatterli a mano. Il file si apre dentro il browser e non esce dal computer. L\'app riconosce gli elenchi a blocchi («CLASSE 1A» e sotto i nomi) e quelli a righe («ROSSI MARIO - Lettere - 1A, 2A»), e vanno bene anche un TXT, un CSV o il testo incollato. Prima di scrivere qualcosa compare l\'anteprima: ogni nome ha la sua spunta, quelli già presenti in app sono segnati come tali e i nomi nuovi vengono creati nel Registro Cattedre con materia «DA COMPLETARE», senza ore e senza entrare nella generazione dell\'orario. Reimportare lo stesso file non crea doppioni.',
      'Se il PDF è fatto a tabelle strane e l\'app non ne cava niente, compare «Fammi aiutare dall\'IA»: fa rileggere il testo a un modello linguistico e fa parte dell\'abbonamento, come l\'assistente della Guida. Parte solo dopo una spunta, mai da sola, perché è l\'unico punto dell\'app in cui i nomi dei docenti escono davvero dal computer e arrivano alla società che gestisce il modello. La lettura fatta dall\'app, invece, non manda niente a nessuno. Nella guida c\'è il capitolo nuovo «Scheda: Consigli di classe» con tutto il percorso.',
    ],
  },
];
