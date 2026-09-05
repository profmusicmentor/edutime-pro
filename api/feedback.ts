/**
 * Riceve i messaggi del pulsante «Segnala un bug o un suggerimento» e li
 * gira a Brevo come contatto nella lista dedicata. La chiave Brevo resta
 * qui, lato server: non deve mai finire nel bundle del browser.
 *
 * Ogni invio crea un contatto con email sintetica (mai la stessa due
 * volte), così due segnalazioni diverse non si sovrascrivono a vicenda
 * anche se arrivano dalla stessa persona.
 *
 * Il campo esca antispam da solo non basta più a marcare il messaggio come
 * "sospetto". La compilazione automatica del browser e i gestori di password
 * riempiono anche gli input nascosti: una segnalazione vera e dettagliata è
 * finita fuori dalla coda per questo motivo, e nessuno l'ha letta per giorni.
 * Ora serve anche la fretta tipica del bot (form compilato in meno di
 * SOGLIA_BOT_MS): una persona che scrive davvero ci mette molto di più.
 *
 * Lo screenshot non può stare dentro un attributo Brevo, che tiene solo
 * testo: arriva già ridotto e in base64 dal browser e viene spedito come
 * allegato di una mail di avviso. Nel contatto resta scritto che c'è.
 *
 * Variabili d'ambiente:
 *   BREVO_API_KEY           chiave dell'account Brevo
 *   BREVO_FEEDBACK_LIST_ID  lista che raccoglie le segnalazioni
 *   FEEDBACK_NOTIFY_EMAIL   destinatario della mail con lo screenshot
 *   FEEDBACK_LIMITE_IP      segnalazioni al giorno per indirizzo (predefinito: 20)
 */

import { segnaUso, limiteDa } from './_limite';

export const config = { runtime: 'edge' };

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const LIST_ID = process.env.BREVO_FEEDBACK_LIST_ID;

const emailValida = (valore: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valore);

/**
 * Sotto questa soglia il modulo è stato compilato troppo in fretta perché
 * dietro ci sia una persona che scrive una segnalazione.
 */
const SOGLIA_BOT_MS = 2000;

/** Dove arriva l'avviso con lo screenshot allegato. */
const NOTIFICA_A = process.env.FEEDBACK_NOTIFY_EMAIL || 'walter@biscottodigitale.com';

/** Tetto dell'allegato in base64: oltre, Vercel rifiuta già il corpo. */
const MAX_SCREENSHOT_B64 = 3_500_000;

const escapeHtml = (valore: string) =>
  valore
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Manda a Walter la segnalazione con lo screenshot allegato. Se fallisce non
 * si blocca niente: il contatto Brevo è già stato creato e il messaggio non
 * va perso.
 */
const inviaScreenshot = async (
  message: string,
  email: string,
  pagina: string,
  nomeFile: string,
  contenutoBase64: string
) => {
  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY as string,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'EduTime Pro', email: NOTIFICA_A },
        to: [{ email: NOTIFICA_A }],
        subject: 'EduTime Pro: segnalazione con screenshot',
        htmlContent:
          `<p><strong>Pagina:</strong> ${escapeHtml(pagina || '/')}</p>` +
          `<p><strong>Email per la risposta:</strong> ${escapeHtml(email || 'non lasciata')}</p>` +
          `<p><strong>Messaggio:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>` +
          `<p>Lo screenshot è in allegato.</p>`,
        attachment: [{ content: contenutoBase64, name: nomeFile }],
      }),
    });
  } catch {
    /* l'avviso è un di più: la segnalazione è già salvata su Brevo */
  }
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!BREVO_API_KEY || !LIST_ID) {
    return new Response('Feedback non configurato', { status: 500 });
  }

  // Tetto giornaliero per indirizzo, come per le domande all'assistente.
  // L'esca antispam ferma i bot ingenui, non uno script che ripete la stessa
  // POST: senza questo freno ogni invio crea un contatto Brevo e una mail, e
  // la lista dei feedback si riempirebbe di rumore. La soglia è alta: chi
  // segnala davvero manda un paio di messaggi al giorno, non venti.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'ignoto';
  const invii = await segnaUso(`fb:ip:${ip}`);
  if (invii > limiteDa('FEEDBACK_LIMITE_IP', 20)) {
    return new Response('Troppe segnalazioni da questa connessione oggi', {
      status: 429,
    });
  }

  let body: {
    message?: string;
    email?: string;
    pagina?: string;
    honeypot?: string;
    msDaApertura?: number;
    screenshot?: { name?: string; data?: string };
  };
  try {
    body = await request.json();
  } catch {
    return new Response('JSON non valido', { status: 400 });
  }

  // Campo esca compilato: da solo non decide niente, perché lo riempiono
  // anche l'autofill del browser e i gestori di password di persone vere.
  // Serve anche che il modulo sia stato spedito in un lampo. Le versioni
  // vecchie dell'app non mandano msDaApertura: in quel caso il messaggio
  // resta nella coda normale, meglio una segnalazione di spam in più che
  // una vera persa.
  const msDaApertura = Number(body.msDaApertura);
  const troppoVeloce =
    Number.isFinite(msDaApertura) && msDaApertura >= 0 && msDaApertura < SOGLIA_BOT_MS;
  const sospetto = Boolean(body.honeypot) && troppoVeloce;

  // Lo screenshot arriva già ridotto e in JPEG dal browser. Qui si controlla
  // solo che sia base64 e che non sia troppo grosso per l'invio.
  const screenshotB64 = String(body.screenshot?.data ?? '').trim();
  const screenshotValido =
    screenshotB64.length > 0 &&
    screenshotB64.length <= MAX_SCREENSHOT_B64 &&
    /^[A-Za-z0-9+/=]+$/.test(screenshotB64);
  const screenshotNome = screenshotValido
    ? String(body.screenshot?.name || 'screenshot.jpg')
        .replace(/[^A-Za-z0-9._-]/g, '_')
        .slice(0, 80)
    : '';

  const message = (body.message ?? '').trim().slice(0, 4000);
  const email = (body.email ?? '').trim().slice(0, 200);
  const pagina = (body.pagina ?? '').trim().slice(0, 200);

  if (message.length < 3) {
    return new Response('Messaggio troppo corto', { status: 400 });
  }
  if (email && !emailValida(email)) {
    return new Response('Email non valida', { status: 400 });
  }

  const emailSintetica = `fb-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}@feedback.edutimepro.local`;

  const risposta = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: emailSintetica,
      listIds: [Number(LIST_ID)],
      attributes: {
        MESSAGGIO: screenshotValido
          ? `${message}\n\n[Screenshot allegato: inviato per email a ${NOTIFICA_A}]`
          : message,
        EMAIL_RISPOSTA: email,
        PAGINA: pagina,
        STATO: sospetto ? 'sospetto' : 'nuovo',
      },
    }),
  });

  if (!risposta.ok) {
    return new Response('Errore invio', { status: 502 });
  }

  if (screenshotValido && !sospetto) {
    await inviaScreenshot(
      message,
      email,
      pagina,
      screenshotNome,
      screenshotB64
    );
  }

  return new Response(null, { status: 204 });
}
