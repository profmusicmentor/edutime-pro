/**
 * I «motori» dell'assistente: un adattatore per ognuna delle API che possono
 * generare la risposta.
 *
 * Il motore si cambia da variabile d'ambiente su Vercel, senza toccare il
 * codice: ASSISTENTE_MOTORE sceglie la famiglia di API, ASSISTENTE_MODELLO il
 * modello preciso. Serve a poter passare a un modello più economico o più
 * bravo quando ne esce uno, in due minuti e senza riscrivere niente.
 *
 * L'adattatore 'openai' non parla solo con OpenAI: quasi tutti i fornitori
 * (Groq, OpenRouter, DeepSeek, Mistral, Together, un modello in locale)
 * espongono lo stesso formato /chat/completions. Basta puntare
 * OPENAI_BASE_URL al loro indirizzo e mettere la loro chiave.
 *
 * Ogni adattatore fa gli stessi due mestieri: manda la domanda e restituisce
 * il testo. Gli errori tornano come ErroreMotore con un messaggio leggibile,
 * così il chiamante non deve conoscere il formato di nessun fornitore.
 */

export type NomeMotore = 'gemini' | 'openai' | 'anthropic';

const MOTORI_VALIDI: NomeMotore[] = ['gemini', 'openai', 'anthropic'];

/** Modello usato quando ASSISTENTE_MODELLO non dice niente. */
const MODELLO_PREDEFINITO: Record<NomeMotore, string> = {
  gemini: 'gemini-2.5-flash-lite',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001',
};

/** Variabile che contiene la chiave, motore per motore. */
const NOME_CHIAVE: Record<NomeMotore, string> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
};

export interface Messaggio {
  ruolo: 'user' | 'assistant';
  testo: string;
}

export interface Domanda {
  /** Istruzioni fisse più i pezzi di guida: chi è l'assistente, cosa può dire. */
  sistema: string;
  /**
   * Lo scambio finora, dal più vecchio al più recente. L'ultimo è sempre una
   * riga `user`: la domanda a cui il modello deve rispondere adesso.
   */
  messaggi: Messaggio[];
  /** Tetto duro sulla lunghezza della risposta: è anche un tetto di spesa. */
  maxToken: number;
}

export interface Configurazione {
  motore: NomeMotore;
  modello: string;
  chiave: string;
}

/**
 * Legge le variabili d'ambiente. Torna null se manca la chiave: in quel caso
 * l'assistente IA resta spento e l'app continua a funzionare con la sola
 * ricerca nella guida.
 */
export function leggiConfigurazione(): Configurazione | null {
  const richiesto = (process.env.ASSISTENTE_MOTORE || 'gemini')
    .trim()
    .toLowerCase();
  const motore = MOTORI_VALIDI.includes(richiesto as NomeMotore)
    ? (richiesto as NomeMotore)
    : 'gemini';

  const chiave = (process.env[NOME_CHIAVE[motore]] || '').trim();
  if (!chiave) return null;

  const modello =
    (process.env.ASSISTENTE_MODELLO || '').trim() || MODELLO_PREDEFINITO[motore];

  return { motore, modello, chiave };
}

/** Errore che porta con sé lo stato HTTP da restituire al browser. */
export class ErroreMotore extends Error {
  readonly stato: number;

  constructor(message: string, stato = 502) {
    super(message);
    this.name = 'ErroreMotore';
    this.stato = stato;
  }
}

const leggiErrore = async (risposta: Response): Promise<string> => {
  try {
    return (await risposta.text()).slice(0, 600);
  } catch {
    return '';
  }
};

/* ------------------------------------------------------------------ */
/* Gemini (Google Generative Language API)                             */
/* ------------------------------------------------------------------ */

/**
 * Quanto «ragionamento» interno lasciare al modello. Sui modelli 2.5 il
 * ragionamento si paga come testo prodotto anche se non lo vedi mai: per una
 * risposta pescata dalla guida non serve, e a zero la bolletta è più bassa e
 * la risposta più veloce. ASSISTENTE_GEMINI_THINKING='auto' lascia decidere al
 * modello, un numero fissa il tetto.
 */
const budgetPensiero = (): number | null => {
  const grezzo = (process.env.ASSISTENTE_GEMINI_THINKING || '')
    .trim()
    .toLowerCase();
  if (grezzo === 'auto') return null;
  if (grezzo === '') return 0;
  const numero = Number(grezzo);
  return Number.isFinite(numero) ? numero : 0;
};

async function chiediGemini(cfg: Configurazione, d: Domanda): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    cfg.modello
  )}:generateContent`;

  const generationConfig: Record<string, unknown> = {
    temperature: 0.2,
    maxOutputTokens: d.maxToken,
  };
  const budget = budgetPensiero();
  if (budget !== null) {
    generationConfig.thinkingConfig = { thinkingBudget: budget };
  }

  const contents = d.messaggi.map((m) => ({
    role: m.ruolo === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.testo }],
  }));

  const invia = (config: Record<string, unknown>) =>
    fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': cfg.chiave,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: d.sistema }] },
        contents,
        generationConfig: config,
      }),
    });

  let risposta = await invia(generationConfig);

  // I modelli più vecchi non conoscono thinkingConfig e rifiutano tutta la
  // richiesta. Se è quello il problema si riprova senza: cambiare modello non
  // deve rompere l'assistente.
  if (
    !risposta.ok &&
    risposta.status === 400 &&
    generationConfig.thinkingConfig
  ) {
    const dettaglio = await leggiErrore(risposta);
    if (!/thinking/i.test(dettaglio)) {
      throw new ErroreMotore(`Gemini ha rifiutato la richiesta: ${dettaglio}`);
    }
    const senzaPensiero = { ...generationConfig };
    delete senzaPensiero.thinkingConfig;
    risposta = await invia(senzaPensiero);
  }

  if (!risposta.ok) {
    throw new ErroreMotore(
      `Gemini ha risposto ${risposta.status}: ${await leggiErrore(risposta)}`
    );
  }

  const dati = (await risposta.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
    promptFeedback?: { blockReason?: string };
  };

  if (dati.promptFeedback?.blockReason) {
    throw new ErroreMotore(
      'La domanda è stata bloccata dai filtri del modello.',
      422
    );
  }

  const testo = (dati.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim();

  if (!testo) throw new ErroreMotore('Gemini ha risposto senza testo.');
  return testo;
}

/* ------------------------------------------------------------------ */
/* Formato OpenAI (OpenAI, Groq, OpenRouter, DeepSeek, Mistral…)       */
/* ------------------------------------------------------------------ */

/**
 * I modelli «che ragionano» (DeepSeek, Qwen thinking, o1…) scrivono prima un
 * ragionamento interno che non si vede ma si paga come testo prodotto. Per una
 * risposta pescata dalla guida non serve, e c'è di peggio: quel ragionamento
 * consuma il tetto di max_token, e quando se lo mangia tutto il campo
 * `content` arriva vuoto e l'assistente sembra rotto. Su OpenRouter si spegne
 * con `reasoning: { enabled: false }`, che gli altri fornitori del formato
 * OpenAI non conoscono: si manda solo lì. ASSISTENTE_REASONING='1' lo rimette
 * acceso, se un giorno servisse un modello che senza ragionamento risponde
 * peggio.
 */
const ragionamentoDaSpegnere = (base: string): boolean =>
  (process.env.ASSISTENTE_REASONING || '').trim() !== '1' &&
  /openrouter\.ai/i.test(base);

async function chiediOpenAi(cfg: Configurazione, d: Domanda): Promise<string> {
  const base = (
    process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  ).replace(/\/+$/, '');

  const corpo: Record<string, unknown> = {
    model: cfg.modello,
    messages: [
      { role: 'system', content: d.sistema },
      ...d.messaggi.map((m) => ({ role: m.ruolo, content: m.testo })),
    ],
    max_tokens: d.maxToken,
    temperature: 0.2,
  };

  if (ragionamentoDaSpegnere(base)) corpo.reasoning = { enabled: false };

  const invia = (body: Record<string, unknown>) =>
    fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.chiave}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

  const leggiTesto = async (risposta: Response): Promise<string> => {
    const dati = (await risposta.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return (dati.choices?.[0]?.message?.content ?? '').trim();
  };

  let risposta = await invia(corpo);

  // I modelli più recenti hanno rinominato max_tokens e alcuni non accettano
  // più temperature. Sono i due soli inciampi che capitano cambiando modello:
  // si correggono e si riprova una volta sola.
  if (!risposta.ok && risposta.status === 400) {
    const dettaglio = await leggiErrore(risposta);
    const corretto = { ...corpo };
    let cambiato = false;

    if (/max_tokens/i.test(dettaglio)) {
      delete corretto.max_tokens;
      corretto.max_completion_tokens = d.maxToken;
      cambiato = true;
    }
    if (/temperature/i.test(dettaglio)) {
      delete corretto.temperature;
      cambiato = true;
    }
    if (/reasoning/i.test(dettaglio)) {
      delete corretto.reasoning;
      cambiato = true;
    }

    if (!cambiato) {
      throw new ErroreMotore(
        `Il modello ha rifiutato la richiesta: ${dettaglio}`
      );
    }
    risposta = await invia(corretto);
  }

  if (!risposta.ok) {
    throw new ErroreMotore(
      `Il modello ha risposto ${risposta.status}: ${await leggiErrore(risposta)}`
    );
  }

  let testo = await leggiTesto(risposta);

  // Rete di sicurezza per i modelli che ragionano e non li abbiamo spenti
  // (fornitore diverso da OpenRouter, o interruttore ASSISTENTE_REASONING):
  // se il ragionamento si è mangiato tutto il tetto, il testo arriva vuoto.
  // Meglio un secondo tentativo senza ragionamento che un errore in faccia a
  // chi ha pagato l'abbonamento. Si riprova una volta sola.
  if (!testo && !corpo.reasoning) {
    const riprova = await invia({ ...corpo, reasoning: { enabled: false } });
    if (riprova.ok) testo = await leggiTesto(riprova);
  }

  if (!testo) throw new ErroreMotore('Il modello ha risposto senza testo.');
  return testo;
}

/* ------------------------------------------------------------------ */
/* Anthropic (Claude)                                                  */
/* ------------------------------------------------------------------ */

async function chiediAnthropic(
  cfg: Configurazione,
  d: Domanda
): Promise<string> {
  const risposta = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': cfg.chiave,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.modello,
      max_tokens: d.maxToken,
      temperature: 0.2,
      system: d.sistema,
      messages: d.messaggi.map((m) => ({ role: m.ruolo, content: m.testo })),
    }),
  });

  if (!risposta.ok) {
    throw new ErroreMotore(
      `Claude ha risposto ${risposta.status}: ${await leggiErrore(risposta)}`
    );
  }

  const dati = (await risposta.json()) as {
    content?: { type?: string; text?: string }[];
  };

  const testo = (dati.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim();

  if (!testo) throw new ErroreMotore('Claude ha risposto senza testo.');
  return testo;
}

/* ------------------------------------------------------------------ */

const ADATTATORI: Record<
  NomeMotore,
  (c: Configurazione, d: Domanda) => Promise<string>
> = {
  gemini: chiediGemini,
  openai: chiediOpenAi,
  anthropic: chiediAnthropic,
};

export function chiediAlModello(
  cfg: Configurazione,
  d: Domanda
): Promise<string> {
  return ADATTATORI[cfg.motore](cfg, d);
}
