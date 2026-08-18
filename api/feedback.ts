/**
 * Riceve i messaggi del pulsante «Segnala un bug o un suggerimento» e li
 * gira a Brevo come contatto nella lista dedicata. La chiave Brevo resta
 * qui, lato server: non deve mai finire nel bundle del browser.
 *
 * Ogni invio crea un contatto con email sintetica (mai la stessa due
 * volte), così due segnalazioni diverse non si sovrascrivono a vicenda
 * anche se arrivano dalla stessa persona.
 */

export const config = { runtime: 'edge' };

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const LIST_ID = process.env.BREVO_FEEDBACK_LIST_ID;

const emailValida = (valore: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valore);

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
  };
  try {
    body = await request.json();
  } catch {
    return new Response('JSON non valido', { status: 400 });
  }

  if (body.honeypot) {
    return new Response(null, { status: 204 });
  }

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
        STATO: 'nuovo',
      },
    }),
  });

  if (!risposta.ok) {
    return new Response('Errore invio', { status: 502 });
  }

  return new Response(null, { status: 204 });
}
