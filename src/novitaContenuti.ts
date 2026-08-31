/**
 * Elenco delle novità dell'app, dalla più recente alla più vecchia.
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
export const NOVITA_VERSIONE = '2026-08-31';

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
