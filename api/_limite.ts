/**
 * Il freno a mano dell'assistente IA: quante domande al giorno può fare una
 * persona, e quante ne può fare l'app intera.
 *
 * Serve perché su Google Cloud gli avvisi di budget mandano solo una mail:
 * non fermano niente. L'unico tetto di spesa vero è questo, che sta prima
 * della chiamata al modello.
 *
 * Il conteggio si appoggia a un archivio Redis via REST (Vercel KV oppure
 * Upstash: stessa interfaccia) se le variabili ci sono. Se non ci sono, il
 * conteggio resta nella memoria della funzione: regge un utente che insiste,
 * non un attacco vero, perché ogni istanza ha il suo contatore e le istanze
 * si riavviano. Va bene per partire; il giorno in cui l'assistente conta
 * davvero, si collega Vercel KV dal pannello del progetto e questo file
 * comincia a usarlo da solo, senza modifiche.
 */

const KV_URL = (
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  ''
).replace(/\/+$/, '');

const KV_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const kvAttivo = Boolean(KV_URL && KV_TOKEN);

/** Le chiavi vivono un giorno e mezzo: bastano, visto che portano la data. */
const DURATA_SECONDI = 129600;

/** Giorno in UTC: fa parte della chiave, e a mezzanotte azzera il conteggio. */
const oggi = (): string => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Conteggio su Redis (Vercel KV / Upstash)                            */
/* ------------------------------------------------------------------ */

async function contaSuKv(chiave: string): Promise<number | null> {
  try {
    const risposta = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', chiave],
        ['EXPIRE', chiave, String(DURATA_SECONDI), 'NX'],
      ]),
    });
    if (!risposta.ok) return null;
    const dati = (await risposta.json()) as { result?: number }[];
    const conteggio = Number(dati?.[0]?.result);
    return Number.isFinite(conteggio) ? conteggio : null;
  } catch {
    // Se l'archivio non risponde non si blocca l'assistente: si ricade sul
    // conteggio in memoria, che è debole ma non è zero.
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Conteggio in memoria (ripiego)                                      */
/* ------------------------------------------------------------------ */

const inMemoria = new Map<string, { conteggio: number; scade: number }>();

function contaInMemoria(chiave: string): number {
  const adesso = Date.now();

  // Pulizia pigra: senza, la mappa cresce di chiave in chiave finché
  // l'istanza non si riavvia.
  if (inMemoria.size > 5000) {
    inMemoria.forEach((v, k) => {
      if (v.scade <= adesso) inMemoria.delete(k);
    });
  }

  const voce = inMemoria.get(chiave);
  if (!voce || voce.scade <= adesso) {
    inMemoria.set(chiave, {
      conteggio: 1,
      scade: adesso + DURATA_SECONDI * 1000,
    });
    return 1;
  }
  voce.conteggio += 1;
  return voce.conteggio;
}

/* ------------------------------------------------------------------ */

/**
 * Segna una domanda in più e dice a che numero siamo arrivati oggi.
 * Il numero torna sempre, anche quando l'archivio è irraggiungibile.
 */
export async function segnaUso(etichetta: string): Promise<number> {
  const chiave = `edutime:ia:${oggi()}:${etichetta}`;
  if (kvAttivo) {
    const daKv = await contaSuKv(chiave);
    if (daKv !== null) return daKv;
  }
  return contaInMemoria(chiave);
}

/** Legge un numero da variabile d'ambiente, con valore di scorta. */
export const limiteDa = (nome: string, scorta: number): number => {
  const valore = Number((process.env[nome] || '').trim());
  return Number.isFinite(valore) && valore > 0 ? valore : scorta;
};
