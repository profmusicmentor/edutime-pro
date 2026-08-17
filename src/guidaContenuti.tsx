import type { ReactNode } from 'react';

/**
 * Contenuti testuali della guida operativa di EduTime Pro.
 * Separati dal componente perché servono anche all'assistente di ricerca
 * (`guidaIndice.ts`): tenerli qui evita un import circolare fra la pagina
 * della guida e il pannello dell'assistente.
 */

export interface Card {
  title: string;
  tag?: string;
  body: ReactNode;
}

export interface Chapter {
  id: string;
  num: string;
  title: string;
  intro: ReactNode;
  cards?: Card[];
  note?: { title: string; body: ReactNode };
}

const B = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-slate-900">{children}</strong>
);

const Ul = ({ items }: { items: ReactNode[] }) => (
  <ul className="list-disc pl-5 space-y-1">
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);

export const chapters: Chapter[] = [
  {
    id: 'introduzione',
    num: '01',
    title: "Cos'è EduTime Pro",
    intro: (
      <>
        EduTime Pro costruisce, modifica, controlla e stampa l'orario di un
        istituto (anche con indirizzo musicale) partendo dalle cattedre
        assegnate. È pensato per il collaboratore del Dirigente Scolastico o per
        il responsabile dell'orario che deve distribuire le ore dei docenti di
        materia, di sostegno e di strumento sulle classi.
        <span className="block mt-3">
          <B>Insegni alla scuola primaria?</B> L'app funziona anche per te, ma
          tre impostazioni vanno cambiate all'inizio: le trovi tutte insieme nel
          capitolo{' '}
          <a
            href="#primaria"
            className="text-indigo-700 font-semibold underline"
          >
            12 · Se lavori alla scuola primaria
          </a>
          .
        </span>
      </>
    ),
    cards: [
      {
        title: 'Le 6 schede principali',
        tag: 'interfaccia',
        body: (
          <Ul
            items={[
              <>
                <B>Orario Generale</B>: vista master di tutti i docenti,
                modificabile cella per cella.
              </>,
              <>
                <B>Viste Singole</B>: orario di una classe, docente, sostegno,
                strumento o dipartimento.
              </>,
              <>
                <B>Registro Cattedre</B>: assegnazione delle ore settimanali
                docente ↔ classe.
              </>,
              <>
                <B>Sezioni &amp; Regole</B>: sezioni, regole di generazione,
                orari della campanella.
              </>,
              <>
                <B>Conflitti</B>: analisi automatica con conteggio in tempo
                reale.
              </>,
              <>
                <B>Sostituzioni</B>: assenze del giorno, supplenze proposte e
                foglio da stampare.
              </>,
            ]}
          />
        ),
      },
      {
        title: "Cosa NON fa l'app",
        tag: 'limiti',
        body: (
          <Ul
            items={[
              'Non gestisce valutazioni, assenze o pagelle.',
              'Non importa orari da file esterni: i docenti si inseriscono a mano o si modificano quelli di esempio.',
              'Non ha login con email e password.',
              'Non genera orari "ottimali" in assoluto: propone una soluzione che rispetta i vincoli, poi va affinata a mano.',
            ]}
          />
        ),
      },
    ],
  },
  {
    id: 'primo-accesso',
    num: '02',
    title: 'Primo accesso: scegliere lo spazio di lavoro',
    intro: (
      <>
        Alla prima apertura l'app chiede come vuoi lavorare. La scelta si può
        cambiare in qualsiasi momento dal pulsante{' '}
        <B>🏫 Scuola &amp; Backup</B> nella barra superiore.
      </>
    ),
    cards: [
      {
        title: 'Solo su questo computer',
        tag: 'consigliato',
        body: (
          <>
            <p>
              I dati restano nel browser del dispositivo che stai usando e non
              vengono inviati in rete. È la modalità più semplice e più prudente
              se lavori da solo.
            </p>
            <p className="mt-2">
              Attenzione: se cancelli i dati del browser o cambi computer, i
              dati non ti seguono. Per questo conviene scaricare ogni tanto il{' '}
              <B>backup .json</B>.
            </p>
          </>
        ),
      },
      {
        title: 'Collabora online',
        tag: 'condiviso',
        body: (
          <>
            <p>
              L'orario viene salvato in un database cloud (Firebase Firestore) e
              più persone possono modificarlo insieme, vedendo le modifiche in
              tempo reale.
            </p>
            <p className="mt-2">
              Ogni scuola ha il proprio <B>codice scuola</B>, generato
              dall'app: funziona come una password condivisa. Chi ha il codice
              (o il link di invito) vede e modifica quell'orario. Conservalo e
              non pubblicarlo.
            </p>
          </>
        ),
      },
      {
        title: 'Invitare i colleghi',
        tag: 'condivisione',
        body: (
          <>
            Apri <B>🏫 Scuola &amp; Backup</B> e usa{' '}
            <B>🔗 Copia il link di invito</B>. Chi apre quel link entra
            direttamente nell'orario della tua scuola.
          </>
        ),
      },
      {
        title: 'Backup e ripristino',
        tag: 'sicurezza dei dati',
        body: (
          <>
            Sempre da <B>🏫 Scuola &amp; Backup</B>:{' '}
            <B>💾 Scarica backup (.json)</B> salva tutto (docenti, cattedre,
            orario, regole, note) in un file;{' '}
            <B>📂 Ripristina da backup</B> lo ricarica. È anche il modo per
            passare dalla modalità locale a quella condivisa e viceversa.
          </>
        ),
      },
      {
        title: 'Indicatore di stato',
        tag: 'in alto a sinistra',
        body: (
          <Ul
            items={[
              <>
                <B>💻 Solo su questo computer</B>: modalità locale attiva, i
                dati sono nel browser.
              </>,
              <>
                <B>⚡ Connessione...</B>: l'app sta contattando il cloud e
                scaricando il documento.
              </>,
              <>
                <B>💾 Salvataggio...</B>: una modifica è in scrittura, attendi
                prima di chiudere la finestra.
              </>,
              <>
                <B>Cloud sincronizzato</B>: dati locali e cloud coincidono.
              </>,
              <>
                <B>❌ Errore</B>: connessione fallita, le modifiche potrebbero
                non essere salvate. Verifica la rete e ricarica.
              </>,
            ]}
          />
        ),
      },
      {
        title: 'Modalità Sola Lettura',
        tag: 'protezione',
        body: (
          <>
            Il pulsante <B>🔒 Sola Lettura</B> in alto a destra disattiva tutti
            i comandi di modifica: utile per consultare l'orario senza rischio
            di alterarlo. La scelta resta memorizzata anche dopo aver ricaricato
            la pagina.
          </>
        ),
      },
    ],
  },
  {
    id: 'barra-superiore',
    num: '03',
    title: 'La barra superiore',
    intro: (
      <>
        L'intestazione blu-viola contiene le azioni globali: spazio di lavoro,
        guida, sola lettura, larghezza pagina, generazione automatica,
        allineamento del sostegno, stampa ed esportazione.
      </>
    ),
    cards: [
      {
        title: '🏫 Scuola & Backup',
        tag: 'dati',
        body: 'Mostra la scuola attiva e il codice di condivisione, permette di scaricare o ripristinare un backup e di uscire per cambiare scuola.',
      },
      {
        title: '📘 Guida',
        tag: 'aiuto',
        body: 'Apre questa guida in una nuova scheda.',
      },
      {
        title: 'Sola Lettura / Modifica',
        tag: 'sicurezza',
        body: 'Il pulsante mostra "Modifica" quando puoi scrivere e "Sola Lettura" quando i dati sono protetti. Lo stato è persistente tra le sessioni.',
      },
      {
        title: 'Centrata / Espandi',
        tag: 'layout',
        body: 'Passa dalla visualizzazione centrata a quella a piena schermo. Utile su tabelle larghe come l\'orario generale.',
      },
      {
        title: '✨ Auto-Genera Orario',
        tag: 'azione principale',
        body: 'Distribuisce le ore dei docenti sulle celle vuote rispettando le regole impostate in "Sezioni & Regole". Al termine mostra un report con ore richieste, assegnate e non assegnate. Le celle bloccate (🔒) non vengono toccate.',
      },
      {
        title: '🔄 Allinea Sostegno',
        tag: 'post-generazione',
        body: 'Ricalcola solo le ore di sostegno: cancella le assegnazioni esistenti e le ricolloca negli slot dove c\'è già una materia del docente titolare della classe. Va eseguito dopo aver generato o modificato le materie.',
      },
      {
        title: 'Stampa A3 📄',
        tag: 'output',
        body: "Apre una nuova finestra con l'orario completo (diurno + pomeridiano) pronto per la stampa in A3 orizzontale. Se il browser blocca i pop-up compare un avviso: autorizzali e riprova.",
      },
      {
        title: 'Esporta Excel 📊',
        tag: 'output',
        body: 'Scarica un file orario_scolastico.xls con due fogli: "Orario Diurno" (materie e sostegno) e "Orario Pomeridiano" (strumento). Le celle sono colorate per dipartimento e i giorni liberi evidenziati.',
      },
    ],
    note: {
      title: 'Quando usare quale',
      body: (
        <Ul
          items={[
            <>
              <B>Auto-Genera</B>: la prima volta, o quando cambi molto le
              cattedre.
            </>,
            <>
              <B>Allinea Sostegno</B>: dopo aver sistemato le materie.
            </>,
            <>
              <B>Stampa A3</B>: per la copia cartacea da appendere in sala
              professori.
            </>,
            <>
              <B>Esporta Excel</B>: per archiviare, rielaborare o inviare ad
              altri uffici.
            </>,
          ]}
        />
      ),
    },
  },
  {
    id: 'orario-generale',
    num: '04',
    title: 'Scheda: Orario Generale',
    intro: (
      <>
        La vista master: una grande tabella con tutti i docenti in riga e
        giorni/ore in colonna. Ogni cella è modificabile direttamente e in fondo
        alla tabella si aggiungono nuovi docenti.
      </>
    ),
    cards: [
      {
        title: 'Barra di ricerca',
        tag: 'filtro',
        body: 'Digita nome del docente o materia: la tabella filtra istantaneamente. Utile nelle scuole con molti docenti.',
      },
      {
        title: 'Toggle Diurno / Pomeridiano',
        tag: 'vista',
        body: 'Diurno mostra le ore 1ª–6ª (08:00–14:00). Pomeridiano mostra le ore 1ªP–6ªP (13:00–19:00), usate dai docenti di strumento.',
      },
      {
        title: 'Modifica diretta delle celle',
        tag: 'core',
        body: (
          <>
            <p>
              Ogni cella è un menu a tendina con le classi disponibili.
              Selezionando una classe assegni quel docente a quella classe in
              quel giorno/ora; selezionando «-» rimuovi l'assegnazione.
            </p>
            <p className="mt-2">
              Se crei un conflitto (docente già impegnato in quello slot),
              compare una finestra con le opzioni <B>Scambia Lezioni</B> o{' '}
              <B>Forza (lascia buco)</B>.
            </p>
          </>
        ),
      },
      {
        title: 'Celle bloccate (🔒/🔓)',
        tag: 'protezione',
        body: "Nella vista per classe ogni lezione ha un pulsante 🔒/🔓. Le celle bloccate vengono preservate dall'auto-generazione: blocca le ore che non vuoi far rimescolare.",
      },
      {
        title: 'Inserimento rapido nuovo docente',
        tag: 'in fondo alla tabella',
        body: (
          <>
            <p>Sotto l'ultima riga trovi il form «➕ Inserimento Rapido»:</p>
            <Ul
              items={[
                <>
                  <B>Cognome Nome</B> (convertito in MAIUSCOLO)
                </>,
                <>
                  <B>Materia/Strumento</B> (anch'essa in maiuscolo)
                </>,
                <>
                  <B>Tipo</B>: Materia, Sostegno o Strumento
                </>,
                <>
                  <B>Colore</B> identificativo
                </>,
              ]}
            />
            <p className="mt-2">
              Con «Aggiungi Staff» il docente compare subito in tabella e viene
              salvato.
            </p>
          </>
        ),
      },
      {
        title: 'Modifica e cancellazione',
        tag: 'inline',
        body: 'Nella prima colonna puoi modificare nome e materia direttamente nei campi di testo (salvataggio automatico) oppure eliminare il docente con 🗑️, insieme a tutti i suoi slot.',
      },
    ],
    note: {
      title: 'Come leggere la colonna docente',
      body: (
        <>
          Ogni riga mostra il nome (modificabile), un pallino colorato con la
          materia, un riquadro <B>Cls: 1E(10) - 1D(8)</B> con le classi
          assegnate e le rispettive ore, ed eventualmente il badge{' '}
          <B>🔗 2h Consecutive</B> se la preferenza è attiva.
        </>
      ),
    },
  },
  {
    id: 'viste-singole',
    num: '05',
    title: 'Scheda: Viste Singole',
    intro: (
      <>
        Quando devi concentrarti su un singolo orario, questa scheda offre una
        vista calendario pulita: scegli il tipo di vista, seleziona l'elemento
        e, se serve, stampalo in A4.
      </>
    ),
    cards: [
      {
        title: 'I cinque tipi di vista',
        tag: 'selettore',
        body: (
          <Ul
            items={[
              <>
                <B>Classe</B>: orario completo (materia, docente, sostegno
                affiancato, aula, note).
              </>,
              <>
                <B>Docente</B>: orario personale, con celle libere, giorni
                liberi evidenziati e aula di ogni lezione.
              </>,
              <>
                <B>Sostegno</B>: in quale classe è in compresenza ogni ora.
              </>,
              <>
                <B>Strumento</B>: orario pomeridiano del docente di strumento.
              </>,
              <>
                <B>Dipartimento</B>: tutti i docenti di una materia in una sola
                tabella.
              </>,
            ]}
          />
        ),
      },
      {
        title: 'Stampa singola A4',
        tag: 'singolo elemento',
        body: "Accanto al selettore c'è il pulsante 🖨️: apre una finestra con l'orario di quell'elemento in A4 verticale e avvia la stampa.",
      },
      {
        title: 'Modifica cella nella vista Classe',
        tag: 'click sulla cella',
        body: 'Cliccando una cella (vuota o occupata) si apre il modale Modifica Cella, da cui assegni docente, sostegno, aula oppure rimuovi la lezione.',
      },
      {
        title: 'Dove si svolge la lezione',
        tag: 'utile con la DADA',
        body: "Sotto il nome del docente compare 📍 con l'aula o il laboratorio, quando è diverso dall'aula della classe. Lo stesso dato si trova nelle stampe A4 della classe e del docente e nel quadro A3, dove per ragioni di spazio è abbreviato (Lab. Scienze diventa L.SCIEN).",
      },
      {
        title: 'Note sulle celle',
        tag: 'solo vista Classe',
        body: 'In alto a destra di ogni lezione compare + (aggiungi nota) o 📝 (nota presente). Servono per annotazioni libere tipo "Lezione recupero" o "Uscita anticipata".',
      },
    ],
    note: {
      title: 'Modello A e Modello B nella vista Classe',
      body: 'La vista Classe mostra i giorni e le ore della griglia del suo modello: con i valori di partenza il Modello A ha il sabato e 5 ore, il Modello B si ferma al venerdì con 6 ore. Se cambi la griglia in «Sezioni & Regole», la tabella si adegua.',
    },
  },
  {
    id: 'registro-cattedre',
    num: '06',
    title: 'Scheda: Registro Cattedre',
    intro: (
      <>
        Qui definisci il carico orario di ogni docente: quante ore in quale
        classe. È la base da cui parte l'auto-generazione. Tre sotto-schede:{' '}
        <B>☀️ Materie</B>, <B>🤝 Sostegno</B>, <B>🎵 Strumento</B>.
      </>
    ),
    cards: [
      {
        title: 'Come assegnare le ore',
        tag: 'passaggio chiave',
        body: 'In ogni riga-docente, sotto la colonna della classe, inserisci il numero di ore settimanali (es. 10). Lascia vuoto o metti 0 per rimuovere l\'assegnazione. Il totale in fondo si aggiorna in tempo reale.',
      },
      {
        title: 'Colonna 2h',
        tag: 'algoritmo',
        body: "Spunta la casella per i docenti che vogliono le ore raggruppate in blocchi di due consecutive nella stessa classe: l'auto-generazione cercherà di rispettarlo.",
      },
      {
        title: 'Colonna delle supplenze',
        tag: 'serve alle Sostituzioni',
        body: "Spunta la casella dei docenti disponibili a fare supplenze retribuite nelle proprie ore buca. Solo loro compaiono fra i sostituti proposti nella scheda Sostituzioni: se lasci tutte le caselle vuote, lì non verrà proposto nessun nome.",
      },
      {
        title: 'Ordine dei docenti (▲ ▼)',
        tag: 'anche nel quadro e nelle stampe',
        body: "Le frecce accanto a ogni nome spostano il docente su e giù nell'elenco. L'ordine che imposti qui è quello che vedi anche nell'Orario Generale e nella stampa A3, quindi serve a rimettere accanto ai colleghi di materia chi è stato inserito a metà anno. Il pulsante 🔤 Ordina per materia riordina in un colpo solo la sotto-scheda aperta, per materia e poi per nome.",
      },
      {
        title: 'Pulsante ➕',
        tag: 'modale',
        body: 'In fondo a ogni riga apre il modale «Aggiungi Assegnazione», dove scegli classe e ore da un form.',
      },
      {
        title: '🗑️ Resetta Tutto',
        tag: 'irreversibile',
        body: 'Cancella tutti i carichi orari di tutti i docenti (materia, sostegno, strumento) e svuota l\'orario generato. Compare una conferma prima di procedere.',
      },
    ],
    note: {
      title: 'Salvataggio automatico',
      body: 'Ogni cambio di valore viene salvato immediatamente. Non esiste un pulsante «Salva»: la modifica è già registrata.',
    },
  },
  {
    id: 'sezioni-regole',
    num: '07',
    title: 'Scheda: Sezioni & Regole',
    intro: (
      <>
        Il cuore della configurazione: vincoli dell'algoritmo, sezioni
        dell'istituto e orari della campanella. È divisa in cinque blocchi.
      </>
    ),
    cards: [
      {
        title: '🧠 Regole di Auto-Generazione',
        tag: 'vincoli',
        body: (
          <Ul
            items={[
              'Esclude i giorni liberi dei docenti.',
              'Evita più di 10 ore in due giorni consecutivi.',
              'Compatta le lezioni al mattino.',
              'Vieta due ore buche di fila.',
              'Rispetta la preferenza "2h consecutive".',
              'Limite giorni liberi: ≥18h → max 1, ≥12h → max 2, altri → max 3.',
              'Prenota automaticamente le aule speciali (laboratori).',
              'Gestisce le classi miste di lingue, se configurate.',
            ]}
          />
        ),
      },
      {
        title: '⚡ Cosa Generare / ⏱️ Ore buca',
        tag: 'opzioni',
        body: (
          <>
            <p>
              Spunta almeno una voce fra <B>Genera Materie</B>,{' '}
              <B>Genera Sostegno</B>, <B>Genera Strumento</B>.
            </p>
            <p className="mt-2">
              Il <B>limite generale ore buca</B> (0/1/2/3) vale per tutti i
              docenti; sotto puoi impostare un limite personalizzato per singolo
              docente oppure lasciare «Predefinito».
            </p>
          </>
        ),
      },
      {
        title: '📆 Massimo ore al giorno',
        tag: 'distribuzione',
        body: "Quante ore può fare un docente in una giornata: 4, 5 (predefinito), 6 oppure nessun limite. Oltre a questo tetto l'algoritmo ne applica uno suo, più stretto: le ore di cattedra divise per i giorni in cui il docente è a scuola. È quello che evita le giornate da sei ore e la settimana schiacciata su quattro giorni. Il compromesso c'è: distribuire di più significa qualche ora buca in più e, con le cattedre pesanti, qualche ora che resta fuori. Se il tetto rende la cattedra impossibile da piazzare, la scheda Conflitti lo dice.",
      },
      {
        title: "🚪 Minimo ore al giorno",
        tag: 'niente viaggi a vuoto',
        body: "Nessun minimo, 2 ore (predefinito) o 3. A generazione finita l'algoritmo ripassa le giornate sotto la soglia e prova a chiuderle, spostando quelle ore in un giorno in cui il docente è già a scuola: se non c'è posto libero scambia la cella con un'altra lezione della stessa classe, e se lo scambio non regge lascia tutto com'era. Le giornate che restano sotto il minimo finiscono nei Conflitti, così le sposti a mano.",
      },
      {
        title: '🌴 Indisponibilità',
        tag: 'per docente',
        body: "Premi le lettere L · Ma · Me · G · V · S per segnare i giorni liberi di ciascun docente. Il numero massimo dipende dalle ore assegnate; se un docente non ha giorni liberi, l'algoritmo gliene assegna uno.",
      },
      {
        title: '⏰ Ore singole bloccate',
        tag: 'cattedre condivise',
        body: "Il tasto ⏰ accanto ai giorni apre una griglia giorno × ora: cliccando una cella dichiari che il docente in quell'ora non è a scuola. Serve per chi ha la cattedra in comune con un altro istituto — per esempio «il lunedì può esserci solo dopo le 11»: blocchi 1ª, 2ª e 3ª ora del lunedì e l'algoritmo userà solo le ore successive. Le ore bloccate non contano nel limite dei giorni liberi; se però le celle rimaste non bastano per le ore di cattedra, la scheda Conflitti lo segnala.",
      },
      {
        title: '🌍 Classi Miste (lingue straniere)',
        tag: 'accorpamenti',
        body: "Scegli lingua (SPAGNOLO / FRANCESE / TEDESCO), Classe 1 e Classe 2, poi «Aggiungi Gruppo Misto». Se lo stesso docente insegna quella lingua in entrambe le classi, le ore verranno messe negli stessi slot.",
      },
      {
        title: '🔗 Vincoli di accorpamento / co-presenza',
        tag: 'controlli',
        body: 'Scegli Classe 1, Classe 2 e Materia, poi «Aggiungi Vincolo». Nella scheda Conflitti il sistema verifica se le due classi hanno davvero quella materia negli stessi slot e, in caso contrario, segnala un warning.',
      },
      {
        title: '⚙️ Gestione Sezioni',
        tag: 'struttura',
        body: (
          <>
            <p>
              I due modelli partono dalla configurazione classica della
              secondaria di primo grado — <B>Modello A</B>: 6 giorni (Lun-Sab),
              5 ore al giorno più il rientro; <B>Modello B</B>: 5 giorni
              (Lun-Ven), 6 ore al giorno — ma la <B>griglia è modificabile</B>:
              in questa scheda imposti quanti giorni a settimana, quante ore al
              giorno e se c'è il rientro pomeridiano. Generatore, controlli,
              tabelle e stampe seguono i numeri che imposti qui, quindi una
              scuola che lavora su 4 giorni da 3 ore può descrivere la propria
              settimana senza forzature.
            </p>
            <p className="mt-2">
              Per ogni sezione puoi cambiare modello, attivare o disattivare gli
              anni (dalla 1ª alla 5ª, così la scuola primaria può avere tutte le
              sue classi), rinominarla (✏️) o eliminarla (🗑️). Eliminare una
              sezione rimuove tutte le classi collegate da docenti, sostegno,
              strumento e orario. Per aggiungerne una usa il form «Nuova Sezione
              (es. H)».
            </p>
            <p className="mt-2">
              Sotto gli anni c'è il <B>monte ore</B> della sezione: quante ore
              curricolari ci si aspetta in una settimana. Serve alla scheda
              Conflitti, che segnala le classi lontane da quel numero. Se non lo
              tocchi vale 30, il tempo normale della secondaria di primo grado;
              alla primaria di solito è 24, 27 o 30, il tempo prolungato arriva
              a 36 o 40. Sta sulla singola sezione proprio perché la stessa
              scuola può averne alcune a tempo normale e altre a tempo
              prolungato, e il campo accetta qualsiasi numero.
            </p>
          </>
        ),
      },
      {
        title: '⏰ Orari e Campanella',
        tag: 'personalizzazione',
        body: (
          <>
            <p>
              Due colonne affiancate: ☀️ Ore Diurne (1ª–6ª) e 🌙 Ore
              Pomeridiane (1ªP–6ªP). Per ogni ora puoi modificare l'etichetta e
              la fascia oraria: le modifiche si riflettono su tutte le viste,
              sulla stampa A3 e sull'export Excel.
            </p>
            <p className="mt-2">
              Accanto c'è la <B>durata</B>, 60 o 30 minuti. Serve a chi ha
              lezioni più corte: alla primaria capita di avere una lezione da
              mezz'ora al giorno (per esempio un orario 8:00-13:30, cinque ore
              piene più una da 30 minuti). Impostando 30 minuti quella lezione
              conta mezz'ora nei totali del docente e della classe, quindi due
              mezze ore fanno un'ora sola. La durata vale per la colonna, cioè
              per quell'ora in tutti i giorni: dove la lezione non c'è, la cella
              resta vuota. Lasciando 60 minuti non cambia nulla rispetto a
              prima.
            </p>
          </>
        ),
      },
    ],
  },
  {
    id: 'conflitti',
    num: '08',
    title: 'Scheda: Conflitti',
    intro: (
      <>
        Analizzatore automatico che valuta in tempo reale ogni lezione. Il badge
        rosso sulla scheda indica quanti problemi ci sono: è la prima scheda da
        consultare dopo ogni generazione.
      </>
    ),
    cards: [
      {
        title: 'Errore (🛑)',
        tag: 'bloccante',
        body: 'Conflitti gravi: docente in più classi contemporaneamente, ore oltre il limite, docente assegnato in un giorno di indisponibilità, aula doppia, modello non rispettato.',
      },
      {
        title: 'Warning (⚠️)',
        tag: 'da controllare',
        body: 'Situazioni non bloccanti: classe con un totale di ore curricolari diverso dal monte ore della sua sezione, vincoli di accorpamento non rispettati.',
      },
      {
        title: '👁️ Vai alla cella / 🛠️ Rimuovi cella',
        tag: 'azioni',
        body: 'Il primo pulsante porta alla vista della classe coinvolta ed evidenzia la cella per qualche secondo; il secondo cancella subito la lezione problematica.',
      },
      {
        title: 'Controlli eseguiti',
        tag: 'elenco',
        body: (
          <Ul
            items={[
              'Docente in più classi nello stesso giorno/ora.',
              'Docente di sostegno in più classi contemporaneamente.',
              'Docente assegnato in un suo giorno di indisponibilità.',
              'Classe Modello B con ore di sabato.',
              'Classe Modello A che supera le 13:00 (5ª ora).',
              'Più di 3 ore giornaliere dello stesso docente nella stessa classe.',
              'Aula speciale occupata da più classi.',
              'Totale ore curricolari della classe diverso dal monte ore della sezione.',
              'Ore assegnate superiori a quelle previste dalla cattedra.',
              'Troppi giorni liberi rispetto alle ore assegnate.',
              'Vincoli di accorpamento non rispettati.',
            ]}
          />
        ),
      },
    ],
    note: {
      title: 'Suggerimenti',
      body: 'Ogni segnalazione include una riga 💡 con il consiglio pratico per risolverla (per esempio: «Rimuovi 2 ore dalla tabella Orario Generale oppure aggiungi ore nel Registro Cattedre»).',
    },
  },
  {
    id: 'sostituzioni',
    num: '09',
    title: 'Scheda: Sostituzioni e Assenze',
    intro: (
      <>
        La scheda <B>🩹 Sostituzioni</B> serve per l'emergenza della mattina —
        un docente ha appena dato forfait — e per pianificare il giorno dopo.
        Si sceglie la <B>data</B> in alto a destra, si segnala chi manca e
        l'app propone, ora per ora, chi può coprire. Tutto quello che vedi
        nella scheda riguarda solo la data selezionata: cambiandola cambia il
        giorno di lavoro.
      </>
    ),
    cards: [
      {
        title: 'Segnalare chi manca',
        tag: 'il modulo',
        body: (
          <Ul
            items={[
              <>
                <B>Tipo</B>: <B>Assenza</B> o <B>Permesso</B> riguardano un
                docente; <B>Entrata posticipata</B> e <B>Uscita anticipata</B>{' '}
                riguardano una classe.
              </>,
              <>
                <B>Docente</B> o <B>Classe</B>: il campo cambia da solo in base
                al tipo scelto.
              </>,
              <>
                <B>Da ora</B> e <B>A ora</B>: lasciali vuoti («tutta») se
                l'assenza copre l'intera giornata.
              </>,
              <>
                Le ore si scrivono come si leggono nell'orario: <B>1</B> è la
                prima ora. «Da 2 a 3» copre la 2ª e la 3ª ora.
              </>,
              <>
                <B>Nota</B> è libera (per esempio «visita medica»), poi{' '}
                <B>Segnala</B> conferma.
              </>,
            ]}
          />
        ),
      },
      {
        title: 'Entrata posticipata e uscita anticipata',
        tag: 'almeno il giorno prima',
        body: (
          <>
            <p>
              Riguardano la classe, non un docente: l'app non cerca nessuna
              supplenza, segnala solo che la classe entra più tardi o esce
              prima, con le ore coinvolte.
            </p>
            <p className="mt-2">
              Se provi a metterle su oggi o su una data passata, l'app rifiuta
              con un messaggio in rosso: vanno decise almeno il giorno prima
              perché le famiglie vanno avvisate per tempo.
            </p>
          </>
        ),
      },
      {
        title: 'Chi può sostituire',
        tag: 'le proposte',
        body: (
          <>
            <p>
              Per ogni ora scoperta l'app propone fino a quattro nomi, in
              ordine di priorità: <B>verde</B> chi insegna già in quella
              classe, <B>azzurro</B> chi ha la stessa materia dell'assente,{' '}
              <B>bianco</B> chi è semplicemente libero in quell'ora.
            </p>
            <p className="mt-2">
              Entra in elenco solo chi ha la spunta{' '}
              <B>disponibile per supplenze retribuite</B> nel Registro
              Cattedre, non ha lezione in quell'ora e non è nel proprio giorno
              libero. Se non compare nessuno, la prima cosa da controllare sono
              quelle spunte: senza, l'elenco resta sempre vuoto.
            </p>
          </>
        ),
      },
      {
        title: 'Le tre risposte possibili',
        tag: 'come si copre',
        body: (
          <Ul
            items={[
              <>
                <B>Un docente disponibile</B>: fa lezione al posto
                dell'assente e l'ora conta come <B>supplenza retribuita</B>.
              </>,
              <>
                <B>Sorveglianza</B>: la classe resta ai collaboratori, non
                conta come ora retribuita.
              </>,
              <>
                <B>Dividi alunni</B>: gli alunni vengono distribuiti nelle
                altre classi, non conta come ora retribuita.
              </>,
              <>
                Se in quell'ora la classe ha già il sostegno, l'app scrive{' '}
                <B>✅ Coperta da sostegno</B> e non chiede nulla.
              </>,
            ]}
          />
        ),
      },
      {
        title: '💰 Ore di supplenza retribuita',
        tag: 'conteggio',
        body: (
          <>
            Il riquadro in fondo alla scheda somma, docente per docente, le ore
            assegnate come supplenza retribuita. Sorveglianza e divisione degli
            alunni non entrano nel conteggio. È il numero da portare in
            segreteria.
          </>
        ),
      },
      {
        title: '🖨️ Stampa foglio',
        tag: 'A4 orizzontale',
        body: (
          <>
            Produce la <B>Predisposizione giornaliera supplenze docenti</B> del
            giorno scelto: anno scolastico, titolari assenti, ore coinvolte e
            sostituti assegnati. Come per le altre stampe si apre in una nuova
            finestra: se non compare niente, il browser sta bloccando i pop-up.
          </>
        ),
      },
    ],
    note: {
      title: 'Se non compare nessuna lezione',
      body: "Il messaggio «Nessuna lezione trovata per questo docente in questo giorno» ha tre cause possibili: il docente non ha lezione quel giorno, la data cade in un giorno che l'orario non copre (per esempio una domenica), oppure le ore indicate in «Da ora» e «A ora» cadono fuori dalle sue lezioni.",
    },
  },
  {
    id: 'modali',
    num: '10',
    title: 'Finestre modali',
    intro: (
      <>
        Le azioni di medio livello passano da finestre modali. Ecco cosa trovi
        in ciascuna.
      </>
    ),
    cards: [
      {
        title: 'Modifica Cella',
        tag: 'vista Classe',
        body: (
          <Ul
            items={[
              <>
                <B>Assegna Docente</B>: elenco dei docenti di materia; quelli
                occupati o in giorno libero sono disabilitati.
              </>,
              <>
                <B>Assegna Sostegno</B>: docenti di sostegno disponibili.
              </>,
              <>
                <B>🏫 Aula / Laboratorio</B>: Aula Normale, Palestra, Lab.
                Musica, Lab. Tecnologia, Lab. Arte, Lab. Scienze. Se non tocchi
                questo menu vale il laboratorio collegato alla materia; se lo
                scegli tu, la tua scelta resta anche quando cambi il docente
                della cella.
              </>,
            ]}
          />
        ),
      },
      {
        title: 'Nota sulla Cella',
        tag: 'annotazioni',
        body: 'Area di testo libero con i pulsanti 🗑️ Elimina Nota, Annulla e 💾 Salva Nota.',
      },
      {
        title: 'Aggiungi Assegnazione',
        tag: 'registro cattedre',
        body: 'Dal pulsante ➕: scegli Classe e Ore Settimanali (1-30), poi 💾 Salva.',
      },
      {
        title: 'Conflitto Rilevato!',
        tag: 'risoluzione',
        body: (
          <Ul
            items={[
              <>
                <B>🔄 Scambia Lezioni</B>: inverte i docenti fra le due classi.
              </>,
              <>
                <B>➡️ Forza (lascia buco)</B>: applica comunque, lasciando un
                buco.
              </>,
              <>
                <B>❌ Annulla</B>: non fa nulla.
              </>,
              <>
                Per il superamento del limite di 3 ore nella stessa classe
                compare invece <B>⚠️ Procedi Comunque</B>.
              </>,
            ]}
          />
        ),
      },
      {
        title: 'Azzerare tutto? / Eliminare Sez. X?',
        tag: 'conferme',
        body: 'Richieste di conferma prima del reset totale o dell\'eliminazione di una sezione (con tutte le sue classi). Operazioni irreversibili.',
      },
      {
        title: '✨ Report Auto-Generazione',
        tag: 'riepilogo',
        body: 'Mostra ore richieste, ore assegnate, elenco delle ore non assegnate (docente, materia, classe) e suggerimenti per migliorare il risultato.',
      },
      {
        title: 'Pop-up bloccati',
        tag: 'browser',
        body: 'Avvisa che il browser ha bloccato la finestra di stampa: autorizza i pop-up per questo sito e riprova.',
      },
    ],
  },
  {
    id: 'flusso',
    num: '11',
    title: 'Flusso di lavoro consigliato',
    intro: (
      <>
        Dieci passi per costruire l'orario da zero, nell'ordine più logico.
      </>
    ),
  },
  {
    id: 'primaria',
    num: '12',
    title: 'Se lavori alla scuola primaria',
    intro: (
      <>
        L'app è nata per la secondaria di primo grado, ma tutto quello che serve
        alla primaria c'è: va solo impostato, ed è sparso in punti diversi.
        Questo capitolo mette in fila le tre cose da fare la prima volta, e dice
        con franchezza cosa l'app ancora non sa fare.
      </>
    ),
    cards: [
      {
        title: 'Le classi fino alla 5ª',
        tag: 'da fare per primo',
        body: (
          <>
            <p>
              In <B>Sezioni & Regole → Gestione Sezioni</B>, per ogni sezione
              spunta gli anni che ti servono: le caselle arrivano fino alla 5ª.
            </p>
            <p className="mt-2">
              Le classi si chiamano anno + sezione, quindi spuntando 4ª e 5ª
              nella sezione A compaiono <B>4A</B> e <B>5A</B> in tutte le viste,
              nelle stampe e nell'export.
            </p>
          </>
        ),
      },
      {
        title: 'La lezione da mezz\'ora',
        tag: 'durata delle ore',
        body: (
          <>
            <p>
              In <B>Sezioni & Regole → Orari e Campanella</B>, accanto a ogni ora
              c'è la durata: <B>60</B> o <B>30 minuti</B>.
            </p>
            <p className="mt-2">
              Esempio di una giornata 8:00-13:30: lasci a 60 minuti le prime
              cinque ore e metti la sesta a 30 minuti, scrivendo "13:00 - 13:30"
              nella fascia oraria. Da quel momento due mezze ore contano come
              un'ora sola nel totale del docente e della classe.
            </p>
            <p className="mt-2">
              La durata vale per la colonna, cioè per quell'ora in tutti i
              giorni. Nei giorni in cui la mezz'ora non c'è, lasci le celle
              vuote: non serve nessuna impostazione per giorno.
            </p>
          </>
        ),
      },
      {
        title: 'Il monte ore settimanale',
        tag: '24 / 27 / 30',
        body: (
          <>
            <p>
              Sempre in <B>Gestione Sezioni</B>, sotto gli anni, c'è il monte ore
              atteso per una settimana. Di base vale 30, che è il tempo normale
              della secondaria: se non lo cambi, l'app segnalerà come "mancanti"
              ore che alla primaria non esistono.
            </p>
            <p className="mt-2">
              Mettici il vostro: alla primaria di solito 24, 27 o fino a 30
              (tempo pieno 40). Il campo accetta qualsiasi numero, mezze ore
              comprese, perché la ripartizione la decide ogni istituto in
              autonomia.
            </p>
          </>
        ),
      },
      {
        title: 'Cosa cambia rispetto alla secondaria',
        tag: 'da sapere',
        body: (
          <Ul
            items={[
              <>
                <B>Modello A e Modello B</B> non sono il monte ore: dicono solo
                come si distribuisce la settimana. Di partenza A = 6 giorni con
                5 ore e B = 5 giorni con 6 ore, ma giorni e ore si cambiano in
                «Sezioni & Regole». Scegli il modello che somiglia alla vostra
                settimana, adegua la griglia, poi regola le ore con la durata e
                il monte ore.
              </>,
              <>
                L'app ragiona per <B>cattedre</B>: ogni docente ha le sue ore su
                una o più classi. Il maestro prevalente si inserisce allo stesso
                modo, indicando le ore che fa in ciascuna classe.
              </>,
              <>
                Le voci legate all'indirizzo musicale (strumento, allinea
                sostegno per lo strumento) semplicemente non ti servono: puoi
                ignorarle senza effetti.
              </>,
            ]}
          />
        ),
      },
      {
        title: 'Cosa non c\'è ancora',
        tag: 'trasparenza',
        body: (
          <Ul
            items={[
              <>
                Le <B>ore di programmazione</B> fuori dalla classe non sono
                previste: l'app conta solo le ore che stanno in una casella
                dell'orario.
              </>,
              <>
                La <B>generazione automatica</B> ragiona in caselle e non in
                minuti: se usi le mezze ore, controlla la scheda Conflitti, che
                ti segnala se il totale in ore non torna. La compilazione a mano
                è invece già corretta.
              </>,
            ]}
          />
        ),
      },
    ],
    note: {
      title: 'Manca qualcosa?',
      body: "Queste funzioni sono nate dalle segnalazioni di maestre e maestri che hanno provato l'app e hanno scritto cosa non tornava. Se la tua scuola è organizzata in un modo che qui non entra, scrivilo: è così che l'app è arrivata fin qui.",
    },
  },
  {
    id: 'concetti',
    num: '13',
    title: 'Concetti chiave',
    intro: <>Il bignami da tenere sotto mano mentre lavori.</>,
    cards: [
      {
        title: 'Modello A vs Modello B',
        tag: 'sezioni',
        body: (
          <Ul
            items={[
              <>
                <B>Modello A</B>, di partenza: 6 giorni (Lun-Sab), 5 ore al
                giorno. L'ora successiva alle curricolari è il rientro
                pomeridiano.
              </>,
              <>
                <B>Modello B</B>, di partenza: 5 giorni (Lun-Ven), 6 ore al
                giorno, sabato libero.
              </>,
              <>
                Entrambi i modelli sono <B>modificabili</B> in «Sezioni &
                Regole»: giorni a settimana, ore al giorno e rientro
                pomeridiano. Chi non li tocca continua a lavorare come prima.
              </>,
            ]}
          />
        ),
      },
      {
        title: 'Tipi di docenti',
        tag: 'anagrafica',
        body: (
          <Ul
            items={[
              'Materia: docenti curricolari (Lettere, Matematica, Lingue, ...).',
              'Sostegno: docenti in compresenza.',
              'Strumento: Clarinetto, Violino, Chitarra, Pianoforte (pomeridiano).',
            ]}
          />
        ),
      },
      {
        title: 'Aule e laboratori',
        tag: 'assegnazione automatica',
        body: (
          <>
            <Ul
              items={[
                'ED. FISICA → Palestra',
                'MUSICA → Lab. Musica',
                'TECNOLOGIA → Lab. Tecnologia',
                'ARTE → Lab. Arte',
                'SCIENZE → Lab. Scienze',
                'Altro → Aula',
              ]}
            />
            <p className="mt-2">
              Collegare una materia a un'aula significa <B>prenotarla</B>: in
              quell'ora nessun'altra classe può usarla. Se le ore della materia
              superano quelle che l'aula offre in una settimana, le ore in
              eccesso non entrano in orario — la scheda Conflitti fa il conto e
              lo dice. Per questo conviene collegare solo le materie che si
              fanno davvero in laboratorio: la matematica si fa in classe.
            </p>
            <p className="mt-2">
              Se la scuola ha più spazi dello stesso tipo (due palestre, tre
              laboratori), scrivi quanti sono nel campo{' '}
              <B>Quante ce ne sono</B>: l'algoritmo permetterà altrettante
              classi in contemporanea.
            </p>
          </>
        ),
      },
      {
        title: 'Limiti automatici',
        tag: 'algoritmo',
        body: (
          <Ul
            items={[
              'Max 3 ore al giorno dello stesso docente nella stessa classe.',
              'Max 10 ore in due giorni consecutivi per docente.',
              'Vietate due ore buche di fila.',
              'Giorni liberi: ≥18h → 1, ≥12h → 2, altri → 3.',
              'La generazione piazza le ore dichiarate nel Registro Cattedre: il totale settimanale della classe non è un vincolo dell\'algoritmo, ma viene confrontato con il monte ore della sezione nella scheda Conflitti.',
            ]}
          />
        ),
      },
      {
        title: 'Dove finiscono i dati',
        tag: 'salvataggio',
        body: (
          <>
            In modalità locale tutto resta nel browser di questo dispositivo. In
            modalità condivisa i dati stanno in un documento cloud identificato
            dal codice scuola, e ogni modifica viene propagata in tempo reale a
            chi sta lavorando con lo stesso codice.
          </>
        ),
      },
    ],
  },
  {
    id: 'trasparenza',
    num: '14',
    title: 'Trasparenza e privacy',
    intro: (
      <>
        Chi sviluppa l'app, dove vivono i dati e come sono protetti, e cosa fa
        davvero l'algoritmo di generazione: tutto spiegato in chiaro.
      </>
    ),
    cards: [
      {
        title: "Chi ha creato l'app",
        tag: 'sviluppo',
        body: (
          <>
            EduTime Pro l'ho sviluppata io,{' '}
            <a
              href="https://www.facebook.com/profile.php?id=61556761432429"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-700 underline hover:text-indigo-900"
            >
              <B>Walter Vitale</B>
            </a>
            , insegnante e
            non un'azienda, usando Claude Code come assistente di sviluppo.
            Altri miei progetti su{' '}
            <a
              href="https://biscottodigitale.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-700 underline hover:text-indigo-900"
            >
              biscottodigitale.com
            </a>
            . L'app resta gratuita: se ti è utile e vuoi offrirmi un caffè,{' '}
            <a
              href="https://paypal.me/delfino0087"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-700 underline hover:text-indigo-900"
            >
              💛 puoi farlo qui
            </a>
            , senza nessun obbligo.
          </>
        ),
      },
      {
        title: 'Dove vivono i dati',
        tag: 'hosting',
        body: (
          <>
            Il frontend (l'app che stai usando) è ospitato su <B>Vercel</B>. Il
            database — solo per chi sceglie la modalità condivisa — è{' '}
            <B>Firebase / Google Cloud Firestore</B>. In modalità locale non
            viene contattato nessun server.
          </>
        ),
      },
      {
        title: 'Come sono protetti i dati',
        tag: 'sicurezza',
        body: "Le regole di sicurezza di Firestore permettono di leggere solo il documento di cui si conosce il codice scuola: non esiste un accesso libero al database, nessuno può sfogliare gli orari di scuole altrui.",
      },
      {
        title: 'Nessuna registrazione',
        tag: 'account',
        body: "Non c'è creazione di account, non viene chiesta nessuna email né altri dati per usare l'app, in nessuna delle due modalità.",
      },
      {
        title: 'Nomi e ruoli: etichette, non identità',
        tag: 'dati inseriti',
        body: "I nominativi che si inseriscono (docenti, classi) sono etichette libere scelte da chi usa l'app, non identità verificate. Restano visibili solo a chi conosce il codice scuola.",
      },
      {
        title: "Non è intelligenza artificiale generativa",
        tag: 'algoritmo',
        body: (
          <>
            La generazione automatica non usa IA generativa: è un{' '}
            <B>algoritmo euristico a regole/vincoli</B>. Assegna le ore
            rispettando i paletti impostati (giorni liberi dei docenti, ore
            massime al giorno, cattedre su più classi, laboratori) e segnala in
            tempo reale sovrapposizioni e conflitti. Le celle già buone si
            possono bloccare (🔒) e far rigenerare solo il resto.
          </>
        ),
      },
    ],
  },
];

export const steps: { title: string; body: ReactNode }[] = [
  {
    title: "Configura le sezioni dell'istituto",
    body: (
      <>
        In <B>Sezioni &amp; Regole → Gestione Sezioni</B> verifica le sezioni
        esistenti, aggiungi o elimina quelle che servono e scegli per ciascuna
        Modello A o Modello B e gli anni attivi.
      </>
    ),
  },
  {
    title: 'Personalizza orari e campanella',
    body: (
      <>
        Sempre in <B>Sezioni &amp; Regole → Orari e Campanella</B>, allinea
        etichette e fasce orarie a quelle della tua scuola.
      </>
    ),
  },
  {
    title: 'Inserisci o modifica i docenti',
    body: (
      <>
        In <B>Orario Generale</B> usa «➕ Inserimento Rapido» in fondo alla
        tabella. I docenti di esempio si modificano cliccando sui campi
        nome/materia e si eliminano con 🗑️.
      </>
    ),
  },
  {
    title: 'Assegna le cattedre',
    body: (
      <>
        In <B>Registro Cattedre</B> inserisci per ogni docente le ore
        settimanali nelle colonne delle classi, nelle tre sotto-schede Materie,
        Sostegno e Strumento. Attiva <B>2h</B> per chi vuole ore consecutive.
      </>
    ),
  },
  {
    title: 'Imposta regole e giorni liberi',
    body: (
      <>
        In <B>Sezioni &amp; Regole</B> scegli il limite di ore buca (globale e
        per docente) e marca i giorni di indisponibilità con le lettere
        L/Ma/Me/G/V/S.
      </>
    ),
  },
  {
    title: 'Configura classi miste e vincoli (facoltativo)',
    body: 'Aggiungi i gruppi di lingua accorpati e le compresenze fra classi, se la tua scuola ne ha.',
  },
  {
    title: "Auto-genera l'orario",
    body: (
      <>
        Premi <B>✨ Auto-Genera Orario</B> e leggi il report finale: se restano
        ore non assegnate, segui i suggerimenti (rilassare i vincoli, ridurre i
        giorni liberi, assegnare a mano).
      </>
    ),
  },
  {
    title: 'Allinea il sostegno',
    body: (
      <>
        Subito dopo premi <B>🔄 Allinea Sostegno</B>: le ore di sostegno si
        posizionano negli stessi slot delle materie dei docenti titolari.
      </>
    ),
  },
  {
    title: 'Verifica e risolvi i conflitti',
    body: (
      <>
        Apri <B>Conflitti</B> e usa 👁️ per raggiungere la cella o 🛠️ per
        rimuoverla, poi riassegna a mano le ore spostate. Blocca con 🔒 le celle
        che non vuoi far toccare da una futura generazione.
      </>
    ),
  },
  {
    title: 'Esporta, stampa e fai il backup',
    body: (
      <>
        <B>Stampa A3</B> per la copia cartacea, <B>Esporta Excel</B> per
        archiviare, 🖨️ nelle Viste Singole per l'A4 di una classe o di un
        docente. Infine <B>🏫 Scuola &amp; Backup → 💾 Scarica backup</B> per
        conservare una copia del lavoro.
      </>
    ),
  },
];
