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
export const NOVITA_VERSIONE = '2026-09-08c';

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
];
