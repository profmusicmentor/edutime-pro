# EduTime Pro

App web per costruire l'orario scolastico di un istituto (anche con indirizzo
musicale): cattedre, generazione automatica, controllo dei conflitti, stampa A3
ed export Excel. Interfaccia in italiano, nessuna registrazione richiesta.

- App online: <https://edutimepro.vercel.app>
- Guida all'uso: <https://edutimepro.vercel.app/guida>

![L'orario generale di EduTime Pro: una riga per docente, le sei ore di ogni
giorno della settimana, le classi assegnate in evidenza e i giorni liberi
tratteggiati](docs/orario-generato.png)

L'orario qui sopra è quello prodotto dal pulsante **Auto-Genera Orario** sui
dati di esempio, in pochi secondi: ogni riga è un docente, ogni colonna un'ora
di lezione, le celle tratteggiate sono i giorni liberi richiesti e il contatore
dei conflitti in alto segnala quello che resta da sistemare a mano.

## Come funziona il salvataggio

Alla prima apertura l'utente sceglie uno **spazio di lavoro**:

![La schermata iniziale di EduTime Pro: la scelta fra lavorare solo sul proprio
computer e collaborare online con un codice scuola](docs/schermata-iniziale.png)

| Modalità | Dove finiscono i dati | Quando usarla |
| --- | --- | --- |
| Solo su questo computer | `localStorage` del browser, nessuna chiamata di rete | uso individuale, massima riservatezza |
| Collabora online | documento Firestore identificato dal **codice scuola** | più persone sullo stesso orario, in tempo reale |

Il codice scuola viene generato dall'app (`nome-scuola-xxxx-xxxx`) e funziona
come una password condivisa: chi lo conosce legge e modifica quell'orario. Il
link di invito è `https://<dominio>/?scuola=<codice>`.

Da **🏫 Scuola & Backup** si scarica un backup `.json` completo e lo si
ripristina, anche per passare da una modalità all'altra.

## Sviluppo

```bash
npm install
npx vite            # sviluppo su http://localhost:5173
npx vite build      # build di produzione in dist/
```

## Configurazione Firebase

Le credenziali stanno in `src/firebase-config.js` e possono essere sostituite
con variabili d'ambiente in fase di build:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_SENDER_ID
VITE_FIREBASE_APP_ID
```

Sono chiavi pubbliche lato client: la protezione dei dati dipende dalle regole
di sicurezza Firestore del progetto, non dalla loro segretezza.

### Regole Firestore

Le regole in vigore sono quelle del file [`firestore.rules`](firestore.rules) di
questo repository, ed è il file da pubblicare anche su un proprio progetto
Firebase. In sintesi:

- `get` su un singolo documento solo conoscendone il codice scuola esatto, lungo
  almeno 12 caratteri;
- `list` sulla collezione vietato, quindi i codici altrui non sono scopribili;
- `create` e `update` limitati ai soli campi previsti dall'app;
- `delete` vietato: i dati non si cancellano dall'app;
- tutto il resto del database chiuso in lettura e scrittura.

Resta il fatto che chiunque conosca un codice scuola può leggere e modificare
quel documento: il codice è l'unica barriera.

## Struttura

- `src/App.tsx` — tutta l'applicazione (tabelle, algoritmo di generazione,
  conflitti, stampa, export).
- `src/workspace.ts` — spazi di lavoro, codici scuola, salvataggio locale e
  cloud (Firebase caricato con import dinamico).
- `src/WorkspaceGate.tsx` — schermata iniziale di scelta.
- `src/Guida.tsx` — guida all'uso servita su `/guida`.

## Licenza

Copyright (C) 2026 Walter Vitale.

EduTime Pro è software libero rilasciato sotto la **GNU Affero General Public
License versione 3** (o, a scelta, una versione successiva). Il testo completo è
nel file [`LICENSE`](LICENSE).

In pratica: l'app si può usare, studiare, modificare e ridistribuire
liberamente, ma chi ne mette online una versione modificata — anche solo come
servizio, senza distribuire il programma — deve rendere disponibile il codice
sorgente delle proprie modifiche con la stessa licenza.

Il nome «EduTime Pro» non è coperto dalla licenza del codice: una versione
derivata va pubblicata con un nome diverso.

Per un uso che la AGPL non consente, si può chiedere una licenza commerciale
separata all'autore.
