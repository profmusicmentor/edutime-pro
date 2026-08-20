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
export const NOVITA_VERSIONE = '2026-08-20';

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
    versione: '2026-08-20',
    data: '20 agosto 2026',
    voci: [
      'Ore diverse da un giorno all\'altro: in Impostazioni → Modelli orario ogni giorno può avere il suo numero di ore (per esempio 5 il lunedì e 9 il martedì con il rientro). Lasciando i campi vuoti resta il valore unico di prima.',
      'Compresenza di due docenti curricolari nella stessa ora (CLIL, potenziamento): si aggiunge a mano dalla cella dell\'orario, spuntando "in compresenza" prima di scegliere il secondo docente. Il generatore automatico non la crea da solo e la rigenerazione la cancella come le altre lezioni non bloccate.',
      'Questo pannello: da adesso, a ogni aggiornamento dell\'app, all\'apertura compare l\'elenco delle novità.',
    ],
  },
];
