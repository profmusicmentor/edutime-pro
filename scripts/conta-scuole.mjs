/**
 * Conta quante scuole usano davvero EduTime Pro in modalità cloud.
 *
 * Le regole Firestore vietano `list` sulla collezione (i codici scuola sono
 * password: chi li elenca entra ovunque), quindi il conteggio non si può fare
 * dal browser. Questo script gira sul computer di chi amministra il progetto
 * Firebase e usa un account di servizio, che le regole non lo riguardano.
 *
 * Non stampa MAI l'id dei documenti: l'id è il codice scuola.
 * Non legge i dati dell'orario: chiede a Firestore solo `lastUpdatedAt`.
 *
 * Uso:
 *   1. Console Firebase > Impostazioni progetto > Account di servizio >
 *      "Genera nuova chiave privata": scarica un file .json.
 *   2. node scripts/conta-scuole.mjs /percorso/della/chiave.json
 *      (oppure: EDUTIME_SERVICE_ACCOUNT=/percorso/chiave.json node scripts/conta-scuole.mjs)
 *
 * La chiave NON va messa nel repository: dà accesso completo al database.
 */

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const COLLEZIONE = 'eduTimeApp_v6';
const CAMPO_DATA = 'lastUpdatedAt';
const FINESTRE_GIORNI = [7, 30, 90, 365];

const percorsoChiave =
  process.argv[2] ||
  process.env.EDUTIME_SERVICE_ACCOUNT ||
  './service-account.json';

function base64url(dati) {
  return Buffer.from(dati)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Firma un JWT RS256 con la chiave privata dell'account di servizio e lo
 * scambia con Google per un token d'accesso valido un'ora.
 */
async function ottieniToken(account) {
  const adesso = Math.floor(Date.now() / 1000);
  const intestazione = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: adesso,
      exp: adesso + 3600,
    })
  );
  const firma = createSign('RSA-SHA256')
    .update(`${intestazione}.${corpo}`)
    .sign(account.private_key);
  const jwt = `${intestazione}.${corpo}.${base64url(firma)}`;

  const risposta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const dati = await risposta.json();
  if (!risposta.ok) {
    throw new Error(
      `Google ha rifiutato la chiave (${risposta.status}): ${dati.error_description || dati.error}`
    );
  }
  return dati.access_token;
}

/**
 * Scorre la collezione una pagina alla volta. La `mask` è importante: senza,
 * Firestore restituirebbe l'orario intero di ogni scuola, che è enorme.
 */
async function leggiDate(progetto, token) {
  const base =
    `https://firestore.googleapis.com/v1/projects/${progetto}` +
    `/databases/(default)/documents/${COLLEZIONE}`;
  const date = [];
  let pageToken = '';

  for (;;) {
    const parametri = new URLSearchParams({
      pageSize: '300',
      'mask.fieldPaths': CAMPO_DATA,
    });
    if (pageToken) parametri.set('pageToken', pageToken);

    const risposta = await fetch(`${base}?${parametri}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dati = await risposta.json();
    if (!risposta.ok) {
      throw new Error(
        `Firestore ha risposto ${risposta.status}: ${dati.error?.message || 'errore sconosciuto'}`
      );
    }

    for (const documento of dati.documents || []) {
      date.push(documento.fields?.[CAMPO_DATA]?.stringValue || null);
    }

    pageToken = dati.nextPageToken || '';
    if (!pageToken) break;
  }

  return date;
}

function riassumi(date) {
  const adesso = Date.now();
  const valide = date
    .map((valore) => (valore ? Date.parse(valore) : NaN))
    .filter((istante) => Number.isFinite(istante));

  const righe = FINESTRE_GIORNI.map((giorni) => {
    const soglia = adesso - giorni * 24 * 60 * 60 * 1000;
    const quante = valide.filter((istante) => istante >= soglia).length;
    return { giorni, quante };
  });

  const ultima = valide.length ? new Date(Math.max(...valide)) : null;
  return { righe, senzaData: date.length - valide.length, ultima };
}

async function main() {
  let account;
  try {
    account = JSON.parse(readFileSync(percorsoChiave, 'utf8'));
  } catch (errore) {
    console.error(
      `Non riesco a leggere la chiave in "${percorsoChiave}".\n` +
        'Scaricala dalla console Firebase (Impostazioni progetto > Account di servizio)\n' +
        'e passa il percorso: node scripts/conta-scuole.mjs /percorso/chiave.json'
    );
    process.exitCode = 1;
    return;
  }

  const token = await ottieniToken(account);
  const date = await leggiDate(account.project_id, token);
  const { righe, senzaData, ultima } = riassumi(date);

  console.log(`Progetto Firebase: ${account.project_id}`);
  console.log(`Scuole con un orario salvato in cloud: ${date.length}`);
  for (const { giorni, quante } of righe) {
    console.log(`  attive negli ultimi ${String(giorni).padStart(3)} giorni: ${quante}`);
  }
  if (senzaData) {
    console.log(`  senza data di ultima modifica: ${senzaData}`);
  }
  if (ultima) {
    console.log(`Ultimo salvataggio in assoluto: ${ultima.toLocaleString('it-IT')}`);
  }
  console.log(
    '\nNota: chi lavora in modalità locale (solo browser) non compare qui.'
  );
}

main().catch((errore) => {
  console.error(errore.message);
  process.exitCode = 1;
});
