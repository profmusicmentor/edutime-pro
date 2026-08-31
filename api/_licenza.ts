/**
 * Controlla che chi usa l'assistente IA abbia un abbonamento valido.
 *
 * L'abbonamento si compra su LemonSqueezy, che a ogni acquisto genera una
 * «chiave di licenza». Il cliente la incolla in EduTime Pro; qui la si manda a
 * LemonSqueezy, che dice se è ancora buona. Quando l'abbonamento annuale non
 * viene rinnovato LemonSqueezy segna la chiave come scaduta, e questo
 * controllo comincia a dire di no da solo: non c'è niente da disattivare a
 * mano.
 *
 * L'endpoint /v1/licenses/validate è pubblico: non serve la chiave API del
 * negozio. Verso LemonSqueezy esce solo la chiave di licenza, nient'altro.
 *
 * Se l'assistente IA non è ancora a pagamento (ASSISTENTE_RICHIEDE_LICENZA
 * assente o '0') questo file si fa da parte e ogni chiave è buona: serve per
 * provare la qualità delle risposte senza montare prima il pagamento.
 *
 * Variabili d'ambiente:
 *   ASSISTENTE_RICHIEDE_LICENZA  '1' per pretendere la chiave; assente o
 *                                qualunque altro valore lascia l'IA libera
 *   LEMONSQUEEZY_STORE_ID        se c'è, la chiave deve essere di questo negozio
 *   LEMONSQUEEZY_PRODUCT_ID      se c'è, la chiave deve essere di questo prodotto
 */

const ENDPOINT = 'https://api.lemonsqueezy.com/v1/licenses/validate';

/** Forma di una chiave LemonSqueezy: un UUID, gruppi esadecimali con trattini. */
const FORMA_CHIAVE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Positiva: sei ore. Negativa: cinque minuti, così un rinnovo si vede presto. */
const TTL_OK = 6 * 60 * 60 * 1000;
const TTL_NO = 5 * 60 * 1000;

export interface EsitoLicenza {
  valida: boolean;
  /** Messaggio già scritto per essere mostrato così com'è all'utente. */
  motivo?: string;
}

export const licenzaObbligatoria = (): boolean =>
  (process.env.ASSISTENTE_RICHIEDE_LICENZA || '').trim() === '1';

/**
 * Cache in memoria della funzione. Come per il conteggio delle domande: se
 * Vercel riavvia l'istanza si riparte da vuoto, il che vuol dire al massimo
 * qualche controllo in più verso LemonSqueezy, non un buco di sicurezza.
 */
const cache = new Map<string, { esito: EsitoLicenza; scade: number }>();

interface RispostaLemon {
  valid?: boolean;
  error?: string;
  license_key?: { status?: string };
  meta?: { store_id?: number; product_id?: number };
}

function valuta(dati: RispostaLemon): EsitoLicenza {
  if (!dati.valid) {
    const stato = dati.license_key?.status;
    if (stato === 'expired') {
      return {
        valida: false,
        motivo:
          "L'abbonamento è scaduto. Rinnovalo per riattivare l'assistente che scrive le risposte.",
      };
    }
    if (stato === 'disabled') {
      return { valida: false, motivo: 'Questa chiave è stata disattivata.' };
    }
    return {
      valida: false,
      motivo: 'Chiave non valida. Controlla di averla copiata per intero.',
    };
  }

  const negozio = Number((process.env.LEMONSQUEEZY_STORE_ID || '').trim());
  if (negozio && dati.meta?.store_id !== negozio) {
    return { valida: false, motivo: "Questa chiave non è di EduTime Pro." };
  }

  const prodotto = Number((process.env.LEMONSQUEEZY_PRODUCT_ID || '').trim());
  if (prodotto && dati.meta?.product_id !== prodotto) {
    return { valida: false, motivo: 'Questa chiave è di un altro prodotto.' };
  }

  return { valida: true };
}

/**
 * Dice se questa chiave dà diritto a una risposta scritta dall'IA. Torna
 * sempre un esito, anche quando LemonSqueezy non risponde: in quel caso non
 * si blocca chi ha pagato per un guasto che non è suo.
 */
export async function verificaLicenza(grezza: unknown): Promise<EsitoLicenza> {
  if (!licenzaObbligatoria()) return { valida: true };

  const chiave = String(grezza ?? '')
    .trim()
    .toLowerCase();

  if (!chiave) {
    return {
      valida: false,
      motivo:
        "L'assistente che scrive le risposte è per chi ha l'abbonamento. Incolla qui la tua chiave.",
    };
  }
  if (!FORMA_CHIAVE.test(chiave)) {
    return {
      valida: false,
      motivo: 'Chiave non valida. Controlla di averla copiata per intero.',
    };
  }

  const salvato = cache.get(chiave);
  if (salvato && salvato.scade > Date.now()) return salvato.esito;

  let esito: EsitoLicenza;
  try {
    const risposta = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ license_key: chiave }),
    });
    esito = valuta((await risposta.json()) as RispostaLemon);
  } catch {
    // LemonSqueezy irraggiungibile: se poco fa questa chiave era buona la si
    // tiene per buona ancora un po', altrimenti si lascia passare. Il tetto
    // di domande al giorno (_limite.ts) resta comunque in mezzo.
    esito = salvato?.esito.valida ? salvato.esito : { valida: true };
    cache.set(chiave, { esito, scade: Date.now() + TTL_NO });
    return esito;
  }

  cache.set(chiave, {
    esito,
    scade: Date.now() + (esito.valida ? TTL_OK : TTL_NO),
  });
  return esito;
}
