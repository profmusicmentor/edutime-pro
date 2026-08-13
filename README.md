# EduTime Pro

App web per costruire l'orario scolastico di un istituto (anche con indirizzo
musicale): cattedre, generazione automatica, controllo dei conflitti, stampa A3
ed export Excel. Interfaccia in italiano, nessuna registrazione richiesta.

- App: `/`
- Guida all'uso: `/guida`

## Come funziona il salvataggio

Alla prima apertura l'utente sceglie uno **spazio di lavoro**:

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

### Regole Firestore consigliate

Le regole attuali del progetto permettono lettura e scrittura anonima su tutta
la base dati. Per limitare l'accesso alla sola collezione dell'app:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /eduTimeApp_v6/{scuola} {
      allow read, write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Resta il fatto che chiunque conosca un codice scuola può leggere e modificare
quel documento: il codice è l'unica barriera.

## Struttura

- `src/App.tsx` — tutta l'applicazione (tabelle, algoritmo di generazione,
  conflitti, stampa, export).
- `src/workspace.ts` — spazi di lavoro, codici scuola, salvataggio locale e
  cloud (Firebase caricato con import dinamico).
- `src/WorkspaceGate.tsx` — schermata iniziale di scelta.
- `src/Guida.tsx` — guida all'uso servita su `/guida`.
