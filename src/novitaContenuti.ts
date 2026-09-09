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
export const NOVITA_VERSIONE = '2026-09-09b';

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
];
