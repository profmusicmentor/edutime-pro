/**
 * Collega e scollega la chiave di abbonamento dal dispositivo di chi la usa.
 *
 * Perché passa da qui e non dal browser: gli endpoint di LemonSqueezy sono
 * pubblici, ma i controlli su negozio e prodotto stanno lato server, e da qui
 * si può tenere il conto dei tentativi. Chi prova chiavi a caso trova un tetto
 * giornaliero per indirizzo, come per le domande all'assistente.
 *
 * POST { azione: 'attiva', licenza }            → { istanza }
 * POST { azione: 'libera', licenza, istanza }   → { liberata }
 *
 * L'identificativo dell'istanza torna al browser, che lo conserva accanto alla
 * chiave e lo rimanda a ogni domanda: è quello a dire che la chiave sta girando
 * su un dispositivo collegato e non su uno passato di mano.
 *
 * Variabili d'ambiente: le stesse di `_licenza.ts`, più
 *   LICENZA_TENTATIVI_IP  attivazioni al giorno per indirizzo (predefinito: 20)
 */

import { attivaLicenza, liberaLicenza } from './_licenza';
import { segnaUso, limiteDa } from './_limite';

export const config = { runtime: 'edge' };

const json = (corpo: unknown, stato = 200) =>
  new Response(JSON.stringify(corpo), {
    status: stato,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: { azione?: unknown; licenza?: unknown; istanza?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ errore: 'JSON non valido' }, 400);
  }

  // Scollegare è sempre concesso: non tocca il negozio di nessun altro e non
  // ha senso metterci in mezzo un tetto, visto che libera risorse.
  if (body.azione === 'libera') {
    const liberata = await liberaLicenza(body.licenza, body.istanza);
    return json({ liberata });
  }

  if (body.azione !== 'attiva') {
    return json({ errore: 'Azione sconosciuta.' }, 400);
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'ignoto';
  const tentativi = await segnaUso(`lic:${ip}`);
  if (tentativi > limiteDa('LICENZA_TENTATIVI_IP', 20)) {
    return json(
      {
        errore:
          'Troppi tentativi da questa connessione oggi. Riprova domani, oppure scrivimi dal pulsante dei feedback.',
      },
      429
    );
  }

  const esito = await attivaLicenza(body.licenza);
  if (!esito.attivata) {
    return json({ errore: esito.motivo, licenzaMancante: true }, 402);
  }

  return json({ istanza: esito.istanza });
}
