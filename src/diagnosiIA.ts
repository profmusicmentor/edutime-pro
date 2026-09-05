/**
 * «Perché non ci riesce?»: la spiegazione delle ore rimaste fuori dalla
 * generazione, dalla parte del browser.
 *
 * Il report della generazione dice quante ore non sono state assegnate, e a
 * quel punto la persona è sola. Chi fa l'orario da vent'anni indovina il
 * vincolo colpevole al primo colpo; chi ci prova per la prima volta chiude il
 * programma. Qui la fotografia del problema (i numeri, le ore fuori, i vincoli
 * accesi) va a un modello linguistico che la racconta in italiano e propone
 * cosa mollare.
 *
 * I nomi dei docenti non escono: diventano sigle, e nella risposta le sigle
 * tornano nomi. Per capire che una cattedra da diciotto ore non ci sta in tre
 * giorni non serve sapere di chi è.
 *
 * Le proposte non cambiano niente da sole. Arrivano come coppie campo/valore,
 * il browser tiene solo i campi che sa applicare e li mostra come pulsanti.
 */

import { chiediAlServer, funzioneIaDisponibile } from './iaComune';

const INDIRIZZO = '/api/diagnosi';

export interface CausaSpiegata {
  titolo: string;
  spiegazione: string;
}

export interface RegolaProposta {
  campo: string;
  valore: number | boolean;
  perche: string;
  /** Come si chiama quella regola nel pannello, per scriverlo sul pulsante. */
  etichetta: string;
  /** Il valore che ha adesso, per non proporre un cambio che non cambia. */
  valoreAttuale: number | boolean | undefined;
}

export interface Diagnosi {
  cause: CausaSpiegata[];
  regole: RegolaProposta[];
  nota: string;
}

export const diagnosiDisponibile = (): Promise<boolean> =>
  funzioneIaDisponibile(INDIRIZZO);

/**
 * Come si chiamano, per chi legge, le regole che il modello può proporre di
 * cambiare. Il nome del campo non si mostra mai: sul pulsante ci va la frase.
 */
const ETICHETTE: Record<string, string> = {
  globalMaxHoursPerDay: 'Tetto di ore al giorno per docente',
  globalMaxHoursPerClassPerDay: 'Ore dello stesso docente nella stessa classe in un giorno',
  globalMaxGapHours: 'Ore buche ammesse in una giornata',
  globalMinHoursPerDay: 'Minimo di ore in una giornata di lavoro',
  autoDayOff: 'Giorno libero d’ufficio a chi non ce l’ha',
  spreadSameSubject: 'Tenere in giorni diversi le materie della stessa famiglia',
};

export interface DatiDiagnosi {
  /** Le righe dei numeri del report, già scritte dall'app. */
  numeri: string[];
  /** Le ore rimaste fuori, nella forma CLASSE|materia|sigla. */
  mancanti: string[];
  /** I vincoli accesi, già scritti con le sigle al posto dei nomi. */
  vincoli: string[];
  griglia: string;
  /** Le regole come stanno adesso, per confrontarle con le proposte. */
  regoleAttuali: Record<string, unknown>;
}

interface RispostaDiagnosi {
  cause?: { titolo?: string; spiegazione?: string }[];
  regole?: { campo?: string; valore?: number | boolean; perche?: string }[];
  nota?: string;
}

export async function chiediDiagnosi(dati: DatiDiagnosi): Promise<Diagnosi> {
  const risposta = await chiediAlServer<RispostaDiagnosi>(INDIRIZZO, {
    numeri: dati.numeri.join('\n'),
    mancanti: dati.mancanti,
    vincoli: dati.vincoli,
    griglia: dati.griglia,
  });

  const cause = (risposta.cause || [])
    .map((c) => ({
      titolo: String(c?.titolo || ''),
      spiegazione: String(c?.spiegazione || ''),
    }))
    .filter((c) => c.titolo || c.spiegazione);

  const regole = (risposta.regole || [])
    .map((r) => {
      const campo = String(r?.campo || '');
      return {
        campo,
        valore: r?.valore as number | boolean,
        perche: String(r?.perche || ''),
        etichetta: ETICHETTE[campo] || campo,
        valoreAttuale: dati.regoleAttuali?.[campo] as number | boolean | undefined,
      };
    })
    .filter(
      (r) =>
        r.campo in ETICHETTE &&
        (typeof r.valore === 'number' || typeof r.valore === 'boolean') &&
        // Una proposta che rimette il valore che c'è già è rumore: il modello
        // ogni tanto la fa, e sul pannello sembrerebbe un pulsante rotto.
        r.valore !== r.valoreAttuale
    );

  return { cause, regole, nota: String(risposta.nota || '') };
}
