/**
 * Controlla che chi usa l'assistente IA abbia un abbonamento valido, e che lo
 * usi sui propri dispositivi.
 *
 * L'abbonamento si compra su LemonSqueezy, che a ogni acquisto genera una
 * «chiave di licenza». Il cliente la incolla in EduTime Pro; qui la si manda a
 * LemonSqueezy, che dice se è ancora buona. Quando l'abbonamento annuale non
 * viene rinnovato LemonSqueezy segna la chiave come scaduta, e questo
 * controllo comincia a dire di no da solo: non c'è niente da disattivare a
 * mano.
 *
 * La sola convalida però non ferma una chiave che gira di mano in mano:
 * /v1/licenses/validate risponde «buona» a chiunque la mandi, quante volte
 * vuole. Per questo la chiave va prima «attivata» sul dispositivo
 * (/v1/licenses/activate): LemonSqueezy registra un'istanza, ne restituisce
 * l'identificativo e tiene il conto di quante ne esistono. Da lì in poi ogni
 * domanda porta con sé chiave e istanza, e la convalida passa solo se quella
 * istanza risulta ancora registrata. Oltre il tetto di attivazioni rifiuta
 * LemonSqueezy stesso: il tetto si imposta nel negozio, non qui. Quando si
 * toglie la chiave da un dispositivo si chiama /v1/licenses/deactivate, così
 * il posto torna libero senza passare dal pannello del negozio.
 *
 * Gli endpoint /v1/licenses/* sono pubblici: non serve la chiave API del
 * negozio. Verso LemonSqueezy escono solo la chiave di licenza, l'istanza e un
 * nome di dispositivo costruito qui, che non dice niente di chi lo porta.
 *
 * Se l'assistente IA non è ancora a pagamento (ASSISTENTE_RICHIEDE_LICENZA
 * assente o '0') la convalida si fa da parte e ogni chiave è buona: serve per
 * provare la qualità delle risposte senza montare prima il pagamento.
 *
 * Variabili d'ambiente:
 *   ASSISTENTE_RICHIEDE_LICENZA  '1' per pretendere la chiave; assente o
 *                                qualunque altro valore lascia l'IA libera
 *   LEMONSQUEEZY_STORE_ID        se c'è, la chiave deve essere di questo negozio
 *   LEMONSQUEEZY_PRODUCT_ID      se c'è, la chiave deve essere di questo prodotto
 */

const ENDPOINT_VALIDA = 'https://api.lemonsqueezy.com/v1/licenses/validate';
const ENDPOINT_ATTIVA = 'https://api.lemonsqueezy.com/v1/licenses/activate';
const ENDPOINT_LIBERA = 'https://api.lemonsqueezy.com/v1/licenses/deactivate';

/**
 * Forma di una chiave LemonSqueezy: un UUID, gruppi esadecimali con trattini.
 * L'identificativo dell'istanza restituito dall'attivazione ha la stessa
 * forma, quindi il controllo vale per tutti e due.
 */
const FORMA_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Positiva: sei ore. Negativa: cinque minuti, così un rinnovo si vede presto. */
const TTL_OK = 6 * 60 * 60 * 1000;
const TTL_NO = 5 * 60 * 1000;

/** Messaggi ripetuti, scritti in un posto solo. */
const MSG_STORTA = 'Chiave non valida. Controlla di averla copiata per intero.';
const MSG_SCADUTA =
  "L'abbonamento è scaduto. Rinnovalo per riattivare l'assistente che scrive le risposte.";
const MSG_DISATTIVATA = 'Questa chiave è stata disattivata.';
const MSG_ALTRO_PRODOTTO = 'Questa chiave è di un altro prodotto.';
const MSG_ALTRO_NEGOZIO = "Questa chiave non è di EduTime Pro.";
const MSG_SENZA_CHIAVE =
  "Le funzioni con l'intelligenza artificiale fanno parte dell'abbonamento EduTime Pro AI. Incolla qui la tua chiave.";

const MSG_DA_COLLEGARE =
  'Collega la chiave a questo dispositivo: incollala qui sotto e premi Attiva.';
const MSG_TETTO =
  'Questa chiave è già collegata al numero massimo di dispositivi. Apri EduTime Pro sul dispositivo che non usi più e premi «Togli la chiave da questo dispositivo»: il posto torna libero subito.';
const MSG_LEMON_MUTO =
  'Non riesco a raggiungere il negozio per collegare la chiave. Riprova fra qualche minuto.';

/**
 * `interruttore` e' il nome della variabile d'ambiente che comanda questa
 * funzione, al posto di ASSISTENTE_RICHIEDE_LICENZA. Serve alle funzioni che
 * hanno un calendario loro: la lettura del PDF con l'IA e la proposta di
 * sistemazione dei conflitti sono in prova libera mentre l'assistente della
 * guida e' gia' a pagamento, e il giorno in cui entrano nell'abbonamento si
 * decide da solo, senza toccare quello dell'assistente.
 *
 * Vale la regola solita: se la variabile non dice '1', la funzione e' aperta
 * a tutti e la chiave non viene nemmeno chiesta.
 */
export interface OpzioniVerifica {
  interruttore?: string;
}

export interface EsitoLicenza {
  valida: boolean;
  /** Messaggio già scritto per essere mostrato così com'è all'utente. */
  motivo?: string;
  /**
   * True quando la chiave regge ma questo dispositivo non risulta collegato:
   * il pannello riapre il campo e l'utente rifà l'attivazione. Serve anche a
   * chi aveva incollato la chiave durante la prova gratuita, quando le
   * attivazioni non esistevano ancora.
   */
  riattivare?: boolean;
}

export interface EsitoAttivazione {
  attivata: boolean;
  /** Identificativo dell'istanza da conservare nel browser. */
  istanza?: string;
  motivo?: string;
}

export const licenzaObbligatoria = (): boolean =>
  (process.env.ASSISTENTE_RICHIEDE_LICENZA || '').trim() === '1';

/**
 * Cache in memoria della convalida. Come per il conteggio delle domande: se
 * Vercel riavvia l'istanza si riparte da vuoto, il che vuol dire al massimo
 * qualche controllo in più verso LemonSqueezy, non un buco di sicurezza.
 * La voce è per coppia chiave + dispositivo: due dispositivi con la stessa
 * chiave non si prestano il risultato a vicenda.
 */
const cache = new Map<string, { esito: EsitoLicenza; scade: number }>();

interface RispostaLemon {
  valid?: boolean;
  activated?: boolean;
  deactivated?: boolean;
  error?: string | null;
  license_key?: {
    status?: string;
    activation_limit?: number;
    activation_usage?: number;
  } | null;
  instance?: { id?: string } | null;
  meta?: { store_id?: number; product_id?: number };
}

/** Normalizza una chiave o un identificativo di istanza; '' se è storto. */
const uuid = (grezzo: unknown): string => {
  const pulito = String(grezzo ?? '')
    .trim()
    .toLowerCase();
  return FORMA_UUID.test(pulito) ? pulito : '';
};

/**
 * Nome con cui l'attivazione compare nella scheda della licenza su
 * LemonSqueezy. La data serve a riconoscere il dispositivo da liberare; le
 * quattro lettere in coda a distinguere due attivazioni dello stesso giorno.
 * Del browser di chi attiva non esce niente.
 */
const nomeDispositivo = (): string => {
  const oggi = new Date().toLocaleDateString('it-IT');
  const coda = Math.random().toString(36).slice(2, 6);
  return `EduTime Pro · ${oggi} · ${coda}`;
};

/** Il negozio e il prodotto sono quelli giusti? '' quando va tutto bene. */
function controllaOrigine(dati: RispostaLemon): string {
  const negozio = Number((process.env.LEMONSQUEEZY_STORE_ID || '').trim());
  if (negozio && dati.meta?.store_id !== negozio) return MSG_ALTRO_NEGOZIO;

  const prodotto = Number((process.env.LEMONSQUEEZY_PRODUCT_ID || '').trim());
  if (prodotto && dati.meta?.product_id !== prodotto) return MSG_ALTRO_PRODOTTO;

  return '';
}

/** Traduce in un messaggio il rifiuto di LemonSqueezy sullo stato della chiave. */
function motivoDelRifiuto(dati: RispostaLemon): string {
  const stato = dati.license_key?.status;
  if (stato === 'expired') return MSG_SCADUTA;
  if (stato === 'disabled') return MSG_DISATTIVATA;
  return MSG_STORTA;
}

function valuta(dati: RispostaLemon): EsitoLicenza {
  if (!dati.valid) {
    // «instance_id not found»: la chiave può essere ottima, è il dispositivo
    // che non risulta più collegato. Succede quando l'attivazione viene
    // liberata da un altro dispositivo o dal pannello del negozio.
    if ((dati.error || '').toLowerCase().includes('instance')) {
      return { valida: false, riattivare: true, motivo: MSG_DA_COLLEGARE };
    }
    return { valida: false, motivo: motivoDelRifiuto(dati) };
  }

  const origine = controllaOrigine(dati);
  if (origine) return { valida: false, motivo: origine };

  return { valida: true };
}

/**
 * Dice se questa chiave, su questo dispositivo, dà diritto a una risposta
 * scritta dall'IA. Torna sempre un esito, anche quando LemonSqueezy non
 * risponde: in quel caso non si blocca chi ha pagato per un guasto che non è
 * suo.
 */
export async function verificaLicenza(
  grezzaChiave: unknown,
  grezzaIstanza?: unknown,
  opzioni?: OpzioniVerifica
): Promise<EsitoLicenza> {
  const obbligatoria = opzioni?.interruttore
    ? (process.env[opzioni.interruttore] || '').trim() === '1'
    : licenzaObbligatoria();
  if (!obbligatoria) return { valida: true };

  const chiave = uuid(grezzaChiave);
  if (!chiave) {
    const scritta = String(grezzaChiave ?? '').trim();
    return {
      valida: false,
      motivo: scritta
        ? MSG_STORTA
        : MSG_SENZA_CHIAVE,
    };
  }

  // Senza istanza la convalida non ha senso: /validate direbbe «buona» anche a
  // chi si è fatto passare la chiave da un collega. Si rimanda all'attivazione.
  const istanza = uuid(grezzaIstanza);
  if (!istanza) {
    return { valida: false, riattivare: true, motivo: MSG_DA_COLLEGARE };
  }

  const impronta = `${chiave}|${istanza}`;
  const salvato = cache.get(impronta);
  if (salvato && salvato.scade > Date.now()) return salvato.esito;

  let esito: EsitoLicenza;
  try {
    esito = valuta(
      await chiediALemon(ENDPOINT_VALIDA, {
        license_key: chiave,
        instance_id: istanza,
      })
    );
  } catch {
    // LemonSqueezy irraggiungibile: se poco fa questa coppia era buona la si
    // tiene per buona ancora un po', altrimenti si lascia passare. Il tetto
    // di domande al giorno (_limite.ts) resta comunque in mezzo.
    esito = salvato?.esito.valida ? salvato.esito : { valida: true };
    cache.set(impronta, { esito, scade: Date.now() + TTL_NO });
    return esito;
  }

  cache.set(impronta, {
    esito,
    scade: Date.now() + (esito.valida ? TTL_OK : TTL_NO),
  });
  return esito;
}

/**
 * Collega la chiave a questo dispositivo e restituisce l'identificativo
 * dell'istanza, che il browser conserva e rimanda a ogni domanda. È qui che
 * scatta il tetto di dispositivi: oltre il numero previsto dal prodotto,
 * LemonSqueezy rifiuta e l'utente legge come liberare un posto.
 */
export async function attivaLicenza(
  grezzaChiave: unknown
): Promise<EsitoAttivazione> {
  const chiave = uuid(grezzaChiave);
  if (!chiave) return { attivata: false, motivo: MSG_STORTA };

  let dati: RispostaLemon;
  try {
    dati = await chiediALemon(ENDPOINT_ATTIVA, {
      license_key: chiave,
      instance_name: nomeDispositivo(),
    });
  } catch {
    // Qui non si può lasciar passare come nella convalida: senza risposta non
    // c'è nessuna istanza da conservare. Meglio dirlo e far riprovare.
    return { attivata: false, motivo: MSG_LEMON_MUTO };
  }

  if (!dati.activated) {
    const chiavi = dati.license_key;
    const tetto =
      (dati.error || '').toLowerCase().includes('activation limit') ||
      (typeof chiavi?.activation_limit === 'number' &&
        typeof chiavi?.activation_usage === 'number' &&
        chiavi.activation_usage >= chiavi.activation_limit);
    return { attivata: false, motivo: tetto ? MSG_TETTO : motivoDelRifiuto(dati) };
  }

  const origine = controllaOrigine(dati);
  if (origine) {
    // Chiave buona ma di un altro prodotto: il posto appena occupato si
    // restituisce subito, altrimenti resta bruciato per sempre.
    await liberaLicenza(chiave, dati.instance?.id);
    return { attivata: false, motivo: origine };
  }

  const istanza = uuid(dati.instance?.id);
  if (!istanza) return { attivata: false, motivo: MSG_LEMON_MUTO };

  return { attivata: true, istanza };
}

/**
 * Stacca la chiave da questo dispositivo e libera il posto. Non fa rumore se
 * fallisce: il browser ha comunque già dimenticato chiave e istanza, e un
 * posto rimasto occupato si libera dalla scheda della licenza nel negozio.
 */
export async function liberaLicenza(
  grezzaChiave: unknown,
  grezzaIstanza: unknown
): Promise<boolean> {
  const chiave = uuid(grezzaChiave);
  const istanza = uuid(grezzaIstanza);
  if (!chiave || !istanza) return false;

  cache.delete(`${chiave}|${istanza}`);

  try {
    const dati = await chiediALemon(ENDPOINT_LIBERA, {
      license_key: chiave,
      instance_id: istanza,
    });
    return Boolean(dati.deactivated);
  } catch {
    return false;
  }
}

/**
 * La License API di LemonSqueezy vuole i dati come form, non JSON, e pretende
 * l'header Accept. Con un corpo JSON il campo license_key non viene letto e
 * ogni chiave risulterebbe non valida.
 */
async function chiediALemon(
  indirizzo: string,
  campi: Record<string, string>
): Promise<RispostaLemon> {
  const risposta = await fetch(indirizzo, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(campi).toString(),
  });
  return (await risposta.json()) as RispostaLemon;
}
