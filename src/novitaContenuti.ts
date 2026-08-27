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
export const NOVITA_VERSIONE = '2026-08-27';

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
  {
    versione: '2026-08-24',
    data: '24 agosto 2026',
    voci: [
      'Indisponibilità anche al pomeriggio: nel riquadro Indisponibilità, il tasto con l\'orologio apriva una griglia con le sole ore del mattino. Chi ha impostato ore pomeridiane non riusciva a bloccarle e non poteva dire, per esempio, che un docente non c\'è mai all\'ultima ora del pomeriggio. Ora la griglia mostra le stesse ore dell\'orario, mattino e pomeriggio.',
    ],
  },
  {
    versione: '2026-08-22b',
    data: '22 agosto 2026',
    voci: [
      'Le intestazioni restano ferme: nell\'Orario Generale e nel Registro Cattedre la riga con i giorni, le ore e le classi non scorre più via quando si scende in fondo all\'elenco dei docenti. Sul tablet funzionava già, sul computer no: il riquadro della tabella si allungava fino a contenere tutte le righe e non scorreva al suo interno. Ora scorre davvero e l\'intestazione tiene.',
      'Classi in ordine di corso: nel Registro Cattedre, in alto, si sceglie come mettere in fila le colonne delle classi. "1A 1B 1C" è l\'ordine di sempre, "1A 2A 3A" le raggruppa per corso. La scelta vale in tutta l\'app e resta impostata anche alla prossima apertura.',
      'La giornata sott\'occhio in Sostituzioni: appena si segnala l\'assenza di un collega compare la sua giornata ora per ora, con classi e laboratori. E sotto ogni proposta di anticipo si vede anche la giornata della collega che si sposterebbe, così si capisce subito se lo spostamento le lascia un buco.',
      'Le ore "D" nel quadro generale: nell\'Orario Generale, al posto della classe, si può scegliere "D (disponibilità)" per segnare le ore messe a disposizione a inizio anno. La casella diventa gialla con la D, le ore si contano da sole in Sostituzioni e con "🖨️ Prospetto per la segreteria" si stampa il foglio con le ore dichiarate e quelle di supplenza davvero svolte, docente per docente.',
    ],
  },
  {
    versione: '2026-08-22',
    data: '22 agosto 2026',
    voci: [
      'Preferenza oraria per docente: in Sezioni & Regole, nel riquadro "Indisponibilità", accanto a ogni docente c\'è il menu "Preferisce", con le prime ore o le ultime. È un desiderio, non un vincolo: l\'algoritmo prova a far cominciare lì la giornata di quel docente, ma se l\'orario non regge in altro modo piazza l\'ora dove può invece di lasciarla fuori. Per un vincolo vero restano le ore bloccate con ⏰.',
    ],
  },
];
