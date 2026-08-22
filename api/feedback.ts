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
 */

export const config = { runtime: 'edge' };

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const LIST_ID = process.env.BREVO_FEEDBACK_LIST_ID;

const emailValida = (valore: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valore);

/**
 * Sotto questa soglia il modulo è stato compilato troppo in fretta perché
 * dietro ci sia una persona che scrive una segnalazione.
 */
const SOGLIA_BOT_MS = 2000;

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!BREVO_API_KEY || !LIST_ID) {
    return new Response('Feedback non configurato', { status: 500 });
  }

  let body: {
    message?: string;
    email?: string;
    pagina?: string;
    honeypot?: string;
    msDaApertura?: number;
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
        MESSAGGIO: message,
        EMAIL_RISPOSTA: email,
        PAGINA: pagina,
        STATO: sospetto ? 'sospetto' : 'nuovo',
      },
    }),
  });

  if (!risposta.ok) {
    return new Response('Errore invio', { status: 502 });
  }

  return new Response(null, { status: 204 });
}
