import { useEffect } from 'react';
import type { ReactNode } from 'react';

/**
 * Guida operativa di EduTime Pro.
 * Pagina statica raggiungibile su /guida.
 */

interface Card {
  title: string;
  tag?: string;
  body: ReactNode;
}

interface Chapter {
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

const chapters: Chapter[] = [
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
      </>
    ),
    cards: [
      {
        title: 'Le 5 schede principali',
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
                affiancato, note).
              </>,
              <>
                <B>Docente</B>: orario personale, con celle libere e giorni
                liberi evidenziati.
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
        title: 'Note sulle celle',
        tag: 'solo vista Classe',
        body: 'In alto a destra di ogni lezione compare + (aggiungi nota) o 📝 (nota presente). Servono per annotazioni libere tipo "Lezione recupero" o "Uscita anticipata".',
      },
    ],
    note: {
      title: 'Modello A e Modello B nella vista Classe',
      body: 'Se la classe è di Modello A vedrai anche il sabato (5 ore). Se è di Modello B il sabato non compare: la classe ha 6 ore dal lunedì al venerdì.',
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
        title: '🌴 Giorni di indisponibilità',
        tag: 'per docente',
        body: "Premi le lettere L · Ma · Me · G · V · S per segnare i giorni liberi di ciascun docente. Il numero massimo dipende dalle ore assegnate; se un docente non ha giorni liberi, l'algoritmo gliene assegna uno.",
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
              <B>Modello A</B>: 6 giorni (Lun-Sab), 5 ore al giorno, sabato
              attivo. <B>Modello B</B>: 5 giorni (Lun-Ven), 6 ore al giorno,
              sabato libero.
            </p>
            <p className="mt-2">
              Per ogni sezione puoi cambiare modello, attivare o disattivare gli
              anni (1ª/2ª/3ª), rinominarla (✏️) o eliminarla (🗑️). Eliminare
              una sezione rimuove tutte le classi collegate da docenti,
              sostegno, strumento e orario. Per aggiungerne una usa il form
              «Nuova Sezione (es. H)».
            </p>
          </>
        ),
      },
      {
        title: '⏰ Orari e Campanella',
        tag: 'personalizzazione',
        body: "Due colonne affiancate: ☀️ Ore Diurne (1ª–6ª) e 🌙 Ore Pomeridiane (1ªP–6ªP). Per ogni ora puoi modificare l'etichetta e la fascia oraria: le modifiche si riflettono su tutte le viste, sulla stampa A3 e sull'export Excel.",
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
        body: 'Situazioni non bloccanti: classe con meno di 30 ore curricolari, vincoli di accorpamento non rispettati.',
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
              'Totale ore curricolari della classe diverso da 30.',
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
    id: 'modali',
    num: '09',
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
                Musica, Lab. Tecnologia, Lab. Arte, Lab. Scienze.
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
    num: '10',
    title: 'Flusso di lavoro consigliato',
    intro: (
      <>
        Dieci passi per costruire l'orario da zero, nell'ordine più logico.
      </>
    ),
  },
  {
    id: 'concetti',
    num: '11',
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
                <B>Modello A</B>: 6 giorni (Lun-Sab), 5 ore al giorno. La 6ª ora
                (13:00-14:00) è considerata pomeridiana.
              </>,
              <>
                <B>Modello B</B>: 5 giorni (Lun-Ven), 6 ore al giorno, sabato
                libero.
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
          <Ul
            items={[
              'ED. FISICA → Palestra',
              'MUSICA → Lab. Musica',
              'TECNOLOGIA → Lab. Tecnologia',
              'ARTE → Lab. Arte',
              'SCIENZE / MATEM. SCI. → Lab. Scienze',
              'Altro → Aula',
            ]}
          />
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
              'Ogni classe deve totalizzare 30 ore curricolari settimanali.',
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
    num: '12',
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

const steps: { title: string; body: ReactNode }[] = [
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

export default function Guida() {
  useEffect(() => {
    document.title = 'Guida a EduTime Pro';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p className="text-xs font-bold tracking-widest text-indigo-300 uppercase">
            Guida operativa · passo per passo
          </p>
          <h1 className="text-4xl font-bold mt-2">Guida a EduTime Pro</h1>
          <p className="text-indigo-200 mt-3 max-w-2xl">
            Manuale d'uso per la costruzione dell'orario scolastico: come
            muoversi fra le cinque schede dell'app, assegnare le cattedre,
            generare l'orario e risolvere i conflitti.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {[
              '5 schede principali',
              'Generazione automatica',
              'Conflitti in tempo reale',
              'Stampa A3 / Excel',
              'Backup .json',
            ].map((t) => (
              <span
                key={t}
                className="text-xs bg-white/10 border border-white/20 rounded-full px-3 py-1"
              >
                {t}
              </span>
            ))}
          </div>
          <a
            href="/"
            className="inline-block mt-8 bg-white text-indigo-800 font-bold px-5 py-2.5 rounded-lg hover:bg-indigo-50"
          >
            ← Torna all'app
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-[220px_1fr] gap-10">
        <nav className="lg:sticky lg:top-6 self-start">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Indice
          </p>
          <ol className="space-y-1.5 text-sm">
            {chapters.map((c) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="text-slate-600 hover:text-indigo-700"
                >
                  <span className="font-mono text-xs text-slate-400 mr-2">
                    {c.num}
                  </span>
                  {c.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-14 min-w-0">
          {chapters.map((c) => (
            <section key={c.id} id={c.id} className="scroll-mt-6">
              <p className="text-xs font-bold tracking-widest text-indigo-600 uppercase">
                Capitolo {c.num}
              </p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                {c.title}
              </h2>
              <p className="text-slate-600 mt-3 leading-relaxed">{c.intro}</p>

              {c.cards && (
                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  {c.cards.map((card) => (
                    <div
                      key={card.title}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-bold text-slate-900">
                          {card.title}
                        </h3>
                        {card.tag && (
                          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
                            {card.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 mt-2 leading-relaxed">
                        {card.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {c.id === 'flusso' && (
                <ol className="mt-6 space-y-4">
                  {steps.map((s, i) => (
                    <li
                      key={s.title}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex gap-4"
                    >
                      <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900">{s.title}</h3>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                          {s.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {c.id === 'flusso' && (
                <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-5 text-sm text-indigo-900">
                  <strong>Iterazione.</strong> È normale ripetere i passi 7-9
                  più volte: dopo ogni rigenerazione i conflitti cambiano.
                  Affina finché la scheda Conflitti non mostra «✅ Nessun
                  conflitto rilevato!».
                </div>
              )}

              {c.note && (
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900">
                  <strong>{c.note.title}.</strong>{' '}
                  <span className="block mt-1">{c.note.body}</span>
                </div>
              )}
            </section>
          ))}

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">In sintesi</h2>
            <p className="text-slate-600 mt-2 leading-relaxed">
              EduTime Pro funziona in modo iterativo: configuri → generi →
              controlli i conflitti → affini → esporti. Non aspettarti un'unica
              generazione perfetta: l'algoritmo propone, il controllo umano
              porta all'orario definitivo.
            </p>
            <a
              href="/"
              className="inline-block mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-lg"
            >
              Apri EduTime Pro →
            </a>
          </section>
        </div>
      </main>

      <footer className="bg-slate-100 border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-500">
        Guida a EduTime Pro · Manuale d'uso per l'orario scolastico
      </footer>
    </div>
  );
}
