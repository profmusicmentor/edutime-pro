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
 * Come si aggiorna: si aggiunge una voce in cima a `NOVITA` e si porta
 * `NOVITA_VERSIONE` alla data di quella voce. Nient'altro.
 *
 * Due regole da rispettare:
 * - `versione` va scritta AAAA-MM-GG, con una lettera in coda per il secondo
 *   rilascio dello stesso giorno ('2026-08-21b'). Il confronto fra rilasci è
 *   alfabetico, quindi questo formato è anche l'ordine cronologico.
 * - si tengono gli ultimi sei rilasci e le voci più vecchie si cancellano:
 *   l'elenco completo è un promemoria recente, non l'archivio dell'app.
 */
export const NOVITA_VERSIONE = '2026-09-02';

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
  {
    versione: '2026-09-01d',
    data: '1 settembre 2026',
    voci: [
      'La casella «2h» adesso funziona anche per i docenti di sostegno. Prima si poteva spuntare, restava spuntata e non cambiava niente: le ore venivano sparse a caso fra le lezioni della classe. Adesso il docente prende le ore di quella classe una accanto all\'altra, e l\'app parte dai giorni in cui la classe ha almeno due lezioni di fila. Resta una preferenza, non un obbligo: un\'ora già presa in un\'altra classe, il giorno libero o il tetto di ore al giorno possono spezzare la coppia. Vale sia per «✨ Auto-Genera Orario» sia per «🔄 Allinea Sostegno».',
      'L\'assenza di un docente di sostegno si registra come quella di tutti gli altri. Nel modulo delle assenze, in «🩹 Sostituzioni», il menu dei docenti è ora diviso in due gruppi: materia e sostegno. Scegli il nome e l\'app elenca le sue ore di sostegno di quel giorno e propone chi può coprirle, partendo dai colleghi di sostegno liberi in quell\'ora — prima quelli che seguono già la stessa classe — e poi dai docenti curricolari con la spunta delle supplenze. Se in quell\'ora c\'è già un altro docente di sostegno nella classe, l\'ora risulta coperta. Non compaiono «Dividi alunni», «Anticipa lezione» ed entrata o uscita fuori orario: quelle servono quando la classe resta senza docente, mentre qui la classe è regolarmente in orario col curricolare. Le ore coperte così finiscono nella stampa e nell\'export del giorno, e i permessi brevi del sostegno entrano nel conteggio delle ore da recuperare.',
    ],
  },
  {
    versione: '2026-09-01c',
    data: '1 settembre 2026',
    voci: [
      '«🔄 Allinea Sostegno» ora rispetta il giorno libero. Prima ricollocava le ore alla cieca e poteva rimettere un docente di sostegno a scuola nel suo giorno libero o in un\'ora che aveva bloccato, mentre l\'auto-generazione quelle ore le saltava già: adesso i due pulsanti si comportano allo stesso modo.',
      'Nuovo capitolo della guida: «I docenti di sostegno». Finora il sostegno era spiegato a pezzi, sparso fra il Registro Cattedre, la barra in alto e le viste, e chi lo chiedeva all\'assistente non trovava una risposta sola. Ora c\'è il percorso intero in fila: come si inserisce il docente, come si scrivono le ore classe per classe, dove si mettono giorno libero e indisponibilità, cosa fa davvero «🔄 Allinea Sostegno» e dove si controlla il risultato. C\'è scritta anche una cosa che prima si scopriva per prova: il report di fine generazione non conta le ore di sostegno.',
    ],
  },
  {
    versione: '2026-09-01b',
    data: '1 settembre 2026',
    voci: [
      'La chiave dell\'abbonamento ora si collega al dispositivo. Quando la incolli nel pannello dell\'assistente, EduTime Pro la registra e ti dice subito se va bene: prima si limitava a tenersela, e ti accorgevi di un errore solo alla prima domanda. La stessa chiave vale su tre dispositivi, per esempio il computer di scuola, quello di casa e il tablet. Se cambi computer, apri il pannello sul vecchio e premi «Togli la chiave da questo dispositivo»: il posto torna libero subito e puoi collegare il nuovo. Se la chiave è già su due dispositivi te lo scrive, invece di lasciarti nel dubbio.',
    ],
  },
  {
    versione: '2026-09-01',
    data: '1 settembre 2026',
    voci: [
      'L\'assistente che risponde a parole tue è acceso, e fino al 5 settembre lo puoi provare senza pagare niente. Apri «💬 Serve aiuto?» in basso a destra e scrivi la domanda come la diresti a un collega: «un docente è assente, come organizzo la supplenza?», «perché la generazione lascia ore scoperte?». L\'assistente legge i 14 capitoli della guida e ti risponde in poche righe, con sotto i capitoli da cui ha preso la risposta, e puoi incalzarlo fino a cinque volte di fila. Dal 5 settembre questa parte diventa un abbonamento annuale da 9,90 €, con la chiave da incollare una volta sola nel pannello. La ricerca nei capitoli, quella che hai sempre usato, resta gratis e senza limiti anche dopo. Le tue domande escono ripulite da nomi, email e numeri; l\'orario della tua scuola non esce mai.',
    ],
  },
  {
    versione: '2026-08-31c',
    data: '31 agosto 2026',
    voci: [
      'Salvataggio cloud riparato. Da stamattina, con l\'arrivo della scheda «Consigli di classe», il database rifiutava l\'intero salvataggio delle scuole in modalità cloud: il lavoro sembrava fatto ma alla riapertura si tornava indietro di giorni, e per giunta senza nessun avviso in rosso. Ora l\'app manda al cloud solo i dati previsti, così una scheda nuova non può più bloccare il salvataggio di tutto il resto; se qualcosa viene comunque rifiutato, l\'orario viene salvato lo stesso e compare una striscia arancione che lo dice; e l\'avviso di salvataggio fallito non sparisce più da solo dopo un istante, ma resta finché un salvataggio non riesce davvero. Grazie a chi lo ha segnalato dal pulsante dei feedback.',
    ],
  },
  {
    versione: '2026-08-31b',
    data: '31 agosto 2026',
    voci: [
      'Assistente della guida: il pannello «💬 Serve aiuto?» ora può reggere una conversazione. La ricerca nei capitoli resta com\'è: gratis, senza limiti e dentro il tuo browser. In più, con l\'abbonamento annuale, puoi fare domande a parole tue e farti rispondere: scrivi, leggi la risposta, incalza con un\'altra domanda, fino a cinque per conversazione. Sotto ogni risposta trovi i capitoli da cui è stata presa. L\'abbonamento si attiva una volta sola incollando nel pannello la chiave che ricevi al momento dell\'acquisto. La conversazione non viene salvata da nessuna parte: se vuoi tenerla, il pulsante «Scarica» te la mette in un file sul tuo computer. Verso il servizio esterno partono solo le tue domande, ripulite da nomi, email e numeri, e i capitoli della guida: l\'orario della tua scuola non esce mai.',
    ],
  },
  {
    versione: '2026-08-31',
    data: '31 agosto 2026',
    voci: [
      'Consigli di classe: c\'è una scheda nuova in alto, «Consigli di classe». Si scelgono le classi e, per ognuna, l\'elenco dei docenti si riempie da solo dalle cattedre (poi si corregge a mano). Si impostano giorno, ora di inizio, durata e quante sale sono disponibili: l\'app monta il calendario mettendo più consigli in contemporanea, uno per sala, senza mai mettere lo stesso docente in due riunioni nello stesso orario. Le sale possono stare in sedi diverse. I docenti che stanno in tante classi (religione, motoria, sostegno itinerante) si possono segnare come «jolly»: non bloccano il parallelo e l\'app segnala che per loro i turni vanno concordati a parte. C\'è anche un interruttore per lasciare la pausa pranzo a chi ha fatto l\'ultima ora del mattino, tenendolo fuori dal primo consiglio del pomeriggio (funziona se l\'orario è già stato generato). Il calendario si scarica in Excel, con anche il prospetto degli impegni per docente. Nato da una richiesta arrivata via mail.',
    ],
  },
  {
    versione: '2026-08-29',
    data: '29 agosto 2026',
    voci: [
      'Modalità notte. In alto a destra, accanto a «Espandi», c\'è il pulsante 🌙 Notte: tutta l\'app passa su fondo scuro, griglie dell\'orario comprese. Serve a chi sistema le sostituzioni la sera o lavora in una stanza poco illuminata. La scelta resta impostata anche alla prossima apertura, e chi tiene già il computer in modalità scura trova l\'app scura da sola, senza toccare niente. La stampa A3, i PDF e i fogli Excel restano su carta bianca in ogni caso.',
    ],
  },
  {
    versione: '2026-08-27b',
    data: '27 agosto 2026',
    voci: [
      'Il tetto di ore nella stessa classe ora resta dove lo metti. Chi lo abbassava a 2 se lo ritrovava a 3 alla riapertura dell\'app: il valore veniva perso quando i dati venivano ricaricati. Ora si salva insieme a tutte le altre regole. Grazie alla segnalazione arrivata dal pulsante dei feedback.',
      'Materie da non affiancare, davvero divise. Dopo la generazione c\'è una passata in più che scioglie le coppie rimaste nello stesso giorno (arte e tecnologia, le due lingue): sposta un\'ora in un altro giorno o la scambia con un\'altra lezione della stessa classe, senza mai lasciare ore fuori dall\'orario e senza creare giornate sotto il minimo. Quello che resta appaiato ora si legge nei Conflitti, con classe e giorno, come avviso arancione e non come errore: la regola è una preferenza didattica, non un divieto.',
    ],
  },
  {
    versione: '2026-08-27',
    data: '27 agosto 2026',
    voci: [
      'Faccia nuova. EduTime Pro ha finalmente un marchio suo: tre caselle d\'orario e il cerchio del tempo. Prima al suo posto c\'era ancora l\'icona di default dello strumento con cui l\'app è costruita.',
      'Colori di casa. Tutta l\'app passa alla palette di biscottodigitale.com: blu scuro per le testate, blu medio per i pulsanti, giallo lime per «Auto-Genera Orario». Verde salvia per le conferme, arancio per gli avvisi, rosa per gli errori. Cambia solo l\'aspetto: dati, orari, stampa A3 ed Excel funzionano esattamente come prima.',
      'Carattere unico per tutti. L\'app ora carica il carattere Inter invece di usare quello del computer di chi la apre: le tabelle dell\'orario si vedono uguali su Windows, Mac e telefono.',
    ],
  },
  {
    versione: '2026-08-26',
    data: '26 agosto 2026',
    voci: [
      'Salvataggio riparato. Chi lavora in modalità cloud non riusciva più a salvare niente: le modifiche restavano sullo schermo, compariva il badge rosso e al rientro nell\'app tornavano i dati di esempio. Era il database che rifiutava le funzioni aggiunte negli ultimi giorni. Ora il salvataggio funziona di nuovo, e se qualcosa va storto l\'app lo dice con una fascia rossa in cima alla pagina, spiega il motivo e offre il pulsante per scaricare subito un backup: nessuno lavora più per ore credendo di aver salvato.',
      'Foglio supplenze in Excel. Accanto a «Stampa foglio» c\'è il pulsante «Excel»: il foglio del giorno si scarica in tre schede (assenti, sostituzioni, comunicazioni alle famiglie) e si corregge a mano prima di stamparlo, per le situazioni che l\'app non poteva prevedere.',
      'La classe entra dopo o esce prima, direttamente dalla sostituzione. Quando l\'ora scoperta è la prima o l\'ultima della classe, accanto a «Sorveglianza» e «Dividi alunni» compaiono «Entra alla ...» e «Esce dopo la ...», con l\'orario vero scritto sul pulsante. La variazione finisce da sola nel riquadro delle comunicazioni alle famiglie, sul foglio del giorno e nell\'Excel.',
      'Ore a recupero dei permessi brevi. In Sostituzioni c\'è un nuovo riquadro: per ogni permesso l\'app conta le ore dalle lezioni che il docente aveva in quella fascia, segnala quando si supera la metà dell\'orario di servizio della giornata e tiene il saldo di chi deve ancora restituire le ore. Si spunta «recuperato» e il saldo scende. Il prospetto per la segreteria ora include anche questa tabella.',
    ],
  },
  {
    versione: '2026-08-25',
    data: '25 agosto 2026',
    voci: [
      'Assemblee sindacali: c\'è una scheda nuova in alto, «Assemblee». Si registra l\'assemblea con data e orario, si spuntano le persone che aderiscono e le ore si contano da sole, prese dall\'orario di quel giorno. L\'app avvisa in rosso quando qualcuno supera il tetto di ore dell\'anno o il numero di assemblee nello stesso mese: i due limiti si impostano in alto e partono da 10 ore e 2 assemblee. Il prospetto si scarica in Excel per la segreteria. Per chi non è nell\'orario dell\'app (infanzia, primaria, personale ATA) c\'è la scheda «Personale fuori orario», dove si scrive una fascia di servizio per ogni giorno: da lì in poi il conteggio è automatico anche per loro.',
      'Screenshot nelle segnalazioni: nel modulo «Segnala un bug o un suggerimento» ora si può allegare un\'immagine, scegliendo il file oppure incollandola con Ctrl+V (Cmd+V sul Mac). Prima si poteva solo descrivere il problema a parole.',
    ],
  },
];
