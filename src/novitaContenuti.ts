/**
 * Elenco delle novità dell'app, dalla più recente alla più vecchia.
 *
 * `NOVITA_VERSIONE` è la firma dell'ultimo aggiornamento: quando cambia, chi
 * apre EduTime Pro vede una volta sola il pannello con le ultime modifiche.
 * Il valore è la data del rilascio, così è leggibile anche a distanza di mesi.
 *
 * Come si aggiorna: si aggiunge una voce in cima a `NOVITA` e si porta
 * `NOVITA_VERSIONE` alla data di quella voce. Nient'altro.
 */
export const NOVITA_VERSIONE = '2026-08-20b';

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
