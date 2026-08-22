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
export const NOVITA_VERSIONE = '2026-08-22';

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
  {
    versione: '2026-08-20b',
    data: '20 agosto 2026',
    voci: [
      'Compresenze automatiche: nel Registro Cattedre, nel riquadro "Compresenze", si dice chi affianca il titolare, in quale classe, per quante ore e su quale materia. Da lì le piazza l\'Auto-Genera Orario, oppure il pulsante "Allinea Compresenze" se non si vuole rifare tutto l\'orario.',
      'Ore diverse da un giorno all\'altro: in Impostazioni → Modelli orario ogni giorno può avere il suo numero di ore (per esempio 5 il lunedì e 9 il martedì con il rientro). Lasciando i campi vuoti resta il valore unico di prima.',
      'Compresenza a mano: nella cella dell\'orario, spuntando "in compresenza" prima di scegliere il secondo docente, lo si affianca al titolare senza sostituirlo. Serve per i casi singoli; per quelle fisse di ogni settimana conviene il riquadro del Registro Cattedre.',
      'Questo pannello: da adesso, a ogni aggiornamento dell\'app, all\'apertura compare l\'elenco delle novità.',
    ],
  },
];
