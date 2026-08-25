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
export const NOVITA_VERSIONE = '2026-08-25';

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
  {
    versione: '2026-08-21b',
    data: '21 agosto 2026',
    voci: [
      'La classe si legge nell\'Orario Generale: nelle caselle del quadro comparivano solo le frecce blu del menu, e su uno schermo piccolo non si capiva quale classe fosse coinvolta. Ora la sigla della classe è sempre scritta nella casella, e il menu si apre cliccandoci sopra come prima.',
      'Orario per laboratorio: in Viste Singole c\'è la vista "🔬 Laboratorio". Si sceglie un\'aula speciale (palestra, laboratori, aula magna) e si vede ora per ora quale classe c\'è e con quale docente. Con 🖨️ si stampa in A4 il foglio da attaccare dietro la porta.',
      'Ore buco, entrate e uscite: in Viste Singole c\'è la vista "⚖️ Equità", che conta per ogni docente le ore buco, i giorni in cui entra dopo la prima ora e quelli in cui esce prima della fine delle lezioni. In rosso chi sta sopra la media; si ordina cliccando l\'intestazione delle colonne e si stampa con 🖨️.',
    ],
  },
  {
    versione: '2026-08-21',
    data: '21 agosto 2026',
    voci: [
      'Segnalazioni sistemate: il filtro antispam del modulo "Segnala un bug o un suggerimento" scartava per errore qualche messaggio vero, che quindi non mi arrivava anche se l\'app rispondeva "ricevuto". Ora non succede più. Se mi hai scritto nei giorni scorsi e non ti ho risposto, rimandamelo: non l\'ho letto.',
    ],
  },
];
