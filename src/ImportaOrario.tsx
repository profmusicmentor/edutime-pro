/**
 * La finestra «Importa l'orario che hai già».
 *
 * Serve il primo giorno, ed è la ragione per cui tanti si fermano prima di
 * cominciare: l'orario dell'anno scorso c'è, ma è in un PDF, e ribatterlo
 * cella per cella prima ancora di sapere se il programma serve non lo fa
 * nessuno. Qui si carica il documento (PDF, XLSX, TXT, CSV) oppure si incolla
 * la tabella copiata da Excel, e un modello linguistico la rimette in righe.
 *
 * A differenza dell'aiuto sui conflitti, qui i nomi dei docenti escono
 * davvero: sono il dato da estrarre. Per questo la spunta è scritta chiara e
 * il pulsante resta spento finché non la si mette.
 *
 * Il caso normale è l'app vuota: si arriva con l'orario completo dell'anno
 * scorso e dentro EduTime Pro non c'è ancora niente. Perciò la finestra sa
 * anche creare quello che manca, docenti e classi, con la seconda spunta
 * «Crea quello che manca». Senza quella spunta si importano soltanto le righe
 * che stanno in piedi da sole, cioè classe e docente già presenti: chi vuole
 * tenere pulito l'archivio non si trova settanta nomi nuovi senza averlo
 * chiesto, e chi parte da zero non deve ribatterli a mano.
 *
 * Due cose non si creano mai da sole. I nomi ambigui, cioè quei cognomi che
 * in archivio corrispondono già a due persone: creare un terzo omonimo è
 * peggio di una riga da sistemare a mano. E le sigle che non hanno la forma
 * di una classe, che quasi sempre sono intestazioni di colonna lette storte.
 */

import { useEffect, useMemo, useState } from 'react';
import { apriFileOrario, type SfondiPdf } from './letturaElenchi';
import {
  leggiGrigliaOrario,
  sensoDelColore,
  type DisponibilitaLetta,
  type GiornoColorato,
  type SensoColore,
} from './letturaOrarioGriglia';
import {
  abbinaDocente,
  componiEsito,
  leggiOrarioDaTesto,
  letturaOrarioDisponibile,
  type EsitoLetturaOrario,
  type PersonaNota,
  type RigaOrarioLetta,
} from './importaOrarioIA';
import { messaggioErroreIa } from './iaComune';

/**
 * I vincoli che il documento porta con sé oltre alle lezioni: i giorni in cui
 * il docente non c'è e le ore di disponibilità. Sono già abbinati alle
 * persone dell'app, id per id, perché è la finestra a sapere chi è chi.
 */
export interface VincoliImportati {
  /** id docente → giorni liberi. */
  giorniLiberi: Record<string, number[]>;
  /** id docente → chiavi «giorno_ora» in cui è in un'altra scuola. */
  oreBloccate: Record<string, string[]>;
  /** id docente → chiavi «giorno_ora» segnate «D». */
  disponibilita: Record<string, string[]>;
}

interface Props {
  /** Le classi dell'istituto, come le conosce l'app. */
  classi: string[];
  docenti: PersonaNota[];
  giorni: string[];
  /** Quante ore ha la giornata più lunga della griglia. */
  ore: number;
  onChiudi: () => void;
  onApplica: (
    righe: RigaOrarioLetta[],
    /** I docenti da creare, ognuno con l'elenco in cui deve nascere. */
    nuoviDocenti: {
      id: string;
      name: string;
      tipo: 'materia' | 'sostegno';
    }[],
    nuoveClassi: string[],
    /** La settimana disegnata nel documento: serve a chi crea le sezioni. */
    grigliaDocumento?: { giorni: number; ore: number },
    /** Giorni liberi, altra scuola e ore «D» letti dai colori del documento. */
    vincoli?: VincoliImportati
  ) => void;
}

export default function ImportaOrario({
  classi,
  docenti,
  giorni,
  ore,
  onChiudi,
  onApplica,
}: Props) {
  const [pronta, setPronta] = useState(false);
  const [testo, setTesto] = useState('');
  const [nomeFile, setNomeFile] = useState('');
  const [consenso, setConsenso] = useState(false);
  const [creaMancanti, setCreaMancanti] = useState(true);
  const [inCorso, setInCorso] = useState('');
  const [errore, setErrore] = useState('');
  const [esito, setEsito] = useState<EsitoLetturaOrario | null>(null);
  /** La lettura è riuscita qui dentro, senza mandare niente fuori. */
  const [letturaLocale, setLetturaLocale] = useState(false);
  /**
   * La tabella non si è lasciata leggere dal browser: da qui in avanti serve
   * il modello, e quindi anche la spunta sui nomi dei docenti.
   */
  const [serveModello, setServeModello] = useState(false);
  /**
   * La griglia entro cui le righe sono state accettate. Non sempre è quella
   * dell'app: con la scuola ancora vuota si allarga fino al documento, e
   * l'avviso «settimana più larga» deve guardare questa, altrimenti compare
   * anche quando non è stato tagliato niente.
   */
  const [limiti, setLimiti] = useState({ giorni: giorni.length, ore });
  /** I colori di fondo del documento, quando è un PDF che ne ha. */
  const [sfondi, setSfondi] = useState<SfondiPdf | null>(null);
  /**
   * Quello che il documento dice oltre alle lezioni: le giornate dipinte e le
   * ore segnate «D». Si tiene a parte dalle righe perché sono vincoli, non
   * lezioni, e chi guarda decide se portarseli dentro.
   */
  const [extra, setExtra] = useState<{
    colorati: GiornoColorato[];
    disponibilita: DisponibilitaLetta[];
  } | null>(null);
  /** Che significato dare a ogni colore trovato. Modificabile qui. */
  const [sensi, setSensi] = useState<Record<string, SensoColore>>({});
  const [portaVincoli, setPortaVincoli] = useState(true);
  const [portaDisponibilita, setPortaDisponibilita] = useState(true);

  useEffect(() => {
    let vivo = true;
    letturaOrarioDisponibile().then((ok) => {
      if (vivo) setPronta(ok);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /**
   * I docenti che il documento nomina e in archivio non ci sono, una volta
   * sola per nome anche se compaiono in venti righe. Gli ambigui restano
   * fuori: quelli si sistemano a mano.
   */
  const docentiDaCreare = useMemo(() => {
    const nomi = new Map<string, string>();
    (esito?.righe || []).forEach((r) => {
      if (r.teacherId || r.ambiguo || !r.nomeLetto) return;
      const chiave = r.nomeLetto.toUpperCase();
      if (!nomi.has(chiave)) nomi.set(chiave, r.nomeLetto);
    });
    return Array.from(nomi.values());
  }, [esito]);

  const classiDaCreare = useMemo(
    () => esito?.classiSconosciute || [],
    [esito]
  );

  const mancaQualcosa = docentiDaCreare.length > 0 || classiDaCreare.length > 0;

  /**
   * Cosa entra davvero nell'orario. Senza la spunta valgono solo le righe
   * complete: una lezione in una classe che non esiste non si può mettere da
   * nessuna parte, e una senza docente lascerebbe una casella orfana.
   */
  const importabili = useMemo(() => {
    const righe = esito?.righe || [];
    const tenute = creaMancanti
      ? righe.filter((r) => r.teacherId || (r.nomeLetto && !r.ambiguo))
      : righe.filter((r) => r.teacherId && !r.classeNuova);

    /*
     * Se il titolare di una casella è rimasto fuori (nome ambiguo, o classe
     * che non si crea) chi gli stava accanto diventa il titolare: una
     * compresenza da sola sarebbe un secondo docente appoggiato a una lezione
     * che nell'orario non c'è.
     */
    const conTitolare = new Set(
      tenute
        .filter((r) => r.ruolo === 'materia')
        .map((r) => `${r.classId}_${r.day}_${r.hour}`)
    );
    return tenute.map((r) => {
      if (r.ruolo !== 'compresenza') return r;
      const chiave = `${r.classId}_${r.day}_${r.hour}`;
      if (conTitolare.has(chiave)) return r;
      conTitolare.add(chiave);
      return { ...r, ruolo: 'materia' as const };
    });
  }, [esito, creaMancanti]);

  /** Quanti secondi docenti entrano: compresenze e ore di sostegno. */
  const affiancati = useMemo(
    () => importabili.filter((r) => r.ruolo !== 'materia').length,
    [importabili]
  );

  /**
   * I colori trovati, uno per riga, con quante giornate hanno dipinto e su
   * quanti docenti. È quello che si vede nell'anteprima: il colore non si può
   * mostrare a parole, ma si può mostrare com'è.
   */
  const colori = useMemo(() => {
    const conti = new Map<
      string,
      { colore: string; giornate: number; docenti: Set<string> }
    >();
    (extra?.colorati || []).forEach((g) => {
      const voce = conti.get(g.colore) || {
        colore: g.colore,
        giornate: 0,
        docenti: new Set<string>(),
      };
      voce.giornate++;
      voce.docenti.add(g.docente);
      conti.set(g.colore, voce);
    });
    return Array.from(conti.values()).sort((a, b) => b.giornate - a.giornate);
  }, [extra]);

  /**
   * I nomi che nel documento hanno solo colori o ore «D», e nell'app non
   * esistono: il docente di potenziamento con sei ore di disponibilità e
   * nessuna lezione sua. Senza una scheda dove metterli, i loro vincoli
   * restano fuori, e questo va detto prima di premere «Importa».
   */
  const soloVincoli = useMemo(() => {
    if (!extra) return [];
    const conLezione = new Set(
      importabili.map((r) => (r.nomeLetto || '').toUpperCase().trim())
    );
    const nomi = new Set<string>();
    extra.colorati.forEach((g) => nomi.add(g.docente));
    extra.disponibilita.forEach((d) => nomi.add(d.docente));
    return Array.from(nomi).filter((nome) => {
      if (conLezione.has(nome.toUpperCase().trim())) return false;
      return !abbinaDocente(nome, docenti).persona;
    });
  }, [extra, importabili, docenti]);

  /** Quanti docenti hanno almeno un'ora «D». */
  const docentiConD = useMemo(
    () => new Set((extra?.disponibilita || []).map((d) => d.docente)).size,
    [extra]
  );

  /** Le righe che restano fuori comunque, spunta o no. */
  const scartateDalNome = useMemo(
    () => (esito?.righe || []).filter((r) => !r.teacherId && (r.ambiguo || !r.nomeLetto)),
    [esito]
  );

  const scegliFile = async (file: File | undefined) => {
    if (!file) return;
    setErrore('');
    setEsito(null);
    setServeModello(false);
    setInCorso('file');
    try {
      const estratto = await apriFileOrario(file);
      setTesto(estratto.testo);
      setSfondi(estratto.sfondi);
      setExtra(null);
      setNomeFile(file.name);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non riesco ad aprire il file.');
    } finally {
      setInCorso('');
    }
  };

  /*
   * Prima si prova a leggere qui, contando le colonne della tabella: gli
   * orari stampati dalle scuole hanno quasi tutti la stessa forma, una riga
   * per docente e in cima i giorni con le ore. Quando la forma c'è, questa
   * strada è più precisa del modello (che su trentacinque colonne si tira
   * indietro), è istantanea, non costa niente e soprattutto i nomi dei
   * colleghi non escono dal computer. Il modello parte solo se qui non si
   * ricava abbastanza: documenti scritti a modo proprio, tabelle per classe,
   * elenchi a frasi.
   */
  const leggi = async () => {
    if (testo.trim().length < 40) return;
    setErrore('');
    setEsito(null);

    /*
     * La spunta sui nomi si chiede solo quando serve davvero, cioè al secondo
     * tentativo: se la tabella si legge qui dentro, fuori non va niente e
     * mettere quell'avviso davanti a tutti sarebbe un allarme per una cosa
     * che non succede. Chi ha un documento di altra forma lo vede comparire
     * quando la lettura in casa non ce l'ha fatta, ed è il momento in cui la
     * domanda ha un senso.
     */
    const inCasa = serveModello ? null : leggiGrigliaOrario(testo, sfondi);
    if (inCasa && inCasa.righe.length >= 20) {
      setLetturaLocale(true);
      /*
       * Con l'app ancora vuota la griglia da rispettare è quella del
       * documento, non quella di partenza dell'app: le classi non ci sono
       * ancora, quindi i cinque giorni e le sei ore che si vedono sono solo
       * un valore di riserva. Tagliare il sabato di una scuola che il sabato
       * ci va, per rispettare una griglia che nessuno ha scelto, sarebbe
       * assurdo: le sezioni nascono adesso e si adattano al documento.
       */
      const scuolaVuota = classi.length === 0;
      const quantiGiorni = scuolaVuota
        ? Math.max(giorni.length, Math.min(6, inCasa.giorniDocumento))
        : giorni.length;
      const quanteOre = scuolaVuota
        ? Math.max(ore, Math.min(12, inCasa.oreDocumento))
        : ore;
      setLimiti({ giorni: quantiGiorni, ore: quanteOre });
      /*
       * I colori e le «D» stanno dentro la griglia dell'app come le lezioni:
       * un giorno libero il sabato non ha senso in una scuola che il sabato
       * non ce l'ha.
       */
      const colorati = inCasa.giorniColorati.filter(
        (g) => g.giorno < quantiGiorni
      );
      setExtra({
        colorati,
        disponibilita: inCasa.disponibilita.filter(
          (d) => d.giorno < quantiGiorni && d.ora < quanteOre
        ),
      });
      const primaIdea: Record<string, SensoColore> = {};
      colorati.forEach((g) => {
        if (!primaIdea[g.colore]) primaIdea[g.colore] = sensoDelColore(g.colore);
      });
      setSensi(primaIdea);
      setEsito(
        componiEsito(
          {
            righe: inCasa.righe,
            giorniDocumento: inCasa.giorniDocumento,
            oreDocumento: inCasa.oreDocumento,
            nota: '',
          },
          {
            classiValide: classi,
            docentiNoti: docenti,
            giorni: Array.from(
              { length: quantiGiorni },
              (_, i) => giorni[i] || `giorno ${i + 1}`
            ),
            ore: quanteOre,
          }
        )
      );
      return;
    }

    // La lettura in casa non ce l'ha fatta: da qui in poi tocca al modello, e
    // prima di mandargli i nomi si chiede il permesso.
    if (!serveModello) {
      setServeModello(true);
      return;
    }
    if (!consenso) return;

    setLetturaLocale(false);
    setLimiti({ giorni: giorni.length, ore });
    // Il modello legge il testo, e nel testo i colori non ci sono.
    setExtra(null);
    setInCorso('ia');
    try {
      const risultato = await leggiOrarioDaTesto(testo, {
        classiValide: classi,
        docentiNoti: docenti,
        giorni,
        ore,
      });
      setEsito(risultato);
      if (!risultato.righe.length) {
        setErrore(
          'Non sono riuscito a ricavare nessuna riga. Prova a incollare solo la tabella dell’orario, senza le pagine intorno.'
        );
      }
    } catch (e) {
      setErrore(messaggioErroreIa(e));
    } finally {
      setInCorso('');
    }
  };

  /**
   * I docenti nuovi nascono qui, un id per nome: la stessa persona compare in
   * decine di righe e deve restare una persona sola. Le righe che la nominano
   * si portano dietro quell'id, altrimenti l'orario punterebbe a un docente
   * che non esiste.
   *
   * Con un'eccezione: chi nel documento fa sia sostegno sia una materia sua
   * nasce due volte, una scheda per parte. Capita davvero (diciotto ore di
   * sostegno e quattro di arte sono una cattedra sola, ma sono due lavori) e
   * l'app tiene i due elenchi separati: una persona sola in mezzo li
   * costringerebbe a stare tutti e due nella scheda del sostegno, con le ore
   * di arte nascoste in fondo a un elenco dove nessuno le cerca.
   */
  const applica = () => {
    if (!importabili.length) return;

    const adesso = Date.now();
    const nuovi = new Map<
      string,
      { id: string; name: string; tipo: 'materia' | 'sostegno' }
    >();

    const righe = importabili.map((r) => {
      if (r.teacherId) return r;
      const tipo = r.ruolo === 'sostegno' ? 'sostegno' : 'materia';
      const chiave = `${r.nomeLetto.toUpperCase()}::${tipo}`;
      let voce = nuovi.get(chiave);
      if (!voce) {
        voce = {
          id: `staff_${adesso}_${nuovi.size}`,
          name: r.nomeLetto,
          tipo,
        };
        nuovi.set(chiave, voce);
      }
      return { ...r, teacherId: voce.id };
    });

    const classiNuove = Array.from(
      new Set(righe.filter((r) => r.classeNuova).map((r) => r.classId))
    );

    /*
     * I vincoli arrivano col nome scritto nel documento e vanno consegnati con
     * l'id della persona. Si guarda prima fra le righe appena importate, che
     * hanno già l'abbinamento fatto (e l'id di chi nasce adesso), poi in
     * archivio: il docente che ha solo ore di disponibilità, senza nemmeno una
     * lezione, in quelle righe non compare e altrimenti si perderebbe.
     */
    const perNome = new Map<string, string>();
    righe.forEach((r) => {
      const chiave = (r.nomeLetto || '').toUpperCase().trim();
      if (chiave && r.teacherId && !perNome.has(chiave))
        perNome.set(chiave, r.teacherId);
    });
    /*
     * Chi nel documento compare solo per i colori o per le «D».
     *
     * Capita davvero, e non è un caso di scuola: il docente di potenziamento
     * ha sei ore di disponibilità e nemmeno una lezione sua, e nella riga ha
     * il giorno libero segnato come tutti. Senza una scheda in cui metterli,
     * quei vincoli si perderebbero in silenzio, che è il modo peggiore di
     * perderli. Se la spunta «Crea quello che manca» è messa, la scheda nasce
     * qui, vuota di cattedra come quella di chi si aggiunge a mano.
     */
    const idDelNome = (nome: string): string | null => {
      const chiave = (nome || '').toUpperCase().trim();
      const gia = perNome.get(chiave);
      if (gia) return gia;
      const { persona, ambiguo } = abbinaDocente(nome, docenti);
      if (persona) return persona.id;
      // Un cognome che in archivio è già di due persone non si crea e non si
      // sceglie, qui come per le lezioni.
      if (!creaMancanti || ambiguo || !chiave) return null;
      const chiaveNuovo = `${chiave}::materia`;
      let voce = nuovi.get(chiaveNuovo);
      if (!voce) {
        voce = { id: `staff_${adesso}_${nuovi.size}`, name: nome, tipo: 'materia' };
        nuovi.set(chiaveNuovo, voce);
      }
      perNome.set(chiave, voce.id);
      return voce.id;
    };

    const vincoli: VincoliImportati = {
      giorniLiberi: {},
      oreBloccate: {},
      disponibilita: {},
    };
    const aggiungi = (dove: Record<string, any[]>, id: string, cosa: any) => {
      const elenco = dove[id] || [];
      if (!elenco.includes(cosa)) elenco.push(cosa);
      dove[id] = elenco;
    };

    if (portaVincoli) {
      (extra?.colorati || []).forEach((g) => {
        const senso = sensi[g.colore];
        if (senso !== 'libero' && senso !== 'altraScuola') return;
        const id = idDelNome(g.docente);
        if (!id) return;
        if (senso === 'libero') {
          aggiungi(vincoli.giorniLiberi, id, g.giorno);
          return;
        }
        // L'altra scuola non è un giorno libero: è un giorno in cui il
        // docente c'è, ma non qui. Si blocca ora per ora, come fa l'app per
        // chi divide la cattedra fra due istituti.
        for (let h = 0; h < limiti.ore; h++) {
          aggiungi(vincoli.oreBloccate, id, `${g.giorno}_${h}`);
        }
      });
    }

    if (portaDisponibilita) {
      (extra?.disponibilita || []).forEach((d) => {
        const id = idDelNome(d.docente);
        if (!id) return;
        aggiungi(vincoli.disponibilita, id, `${d.giorno}_${d.ora}`);
      });
    }

    onApplica(
      righe,
      Array.from(nuovi.values()),
      classiNuove,
      esito?.giorniDocumento && esito?.oreDocumento
        ? { giorni: esito.giorniDocumento, ore: esito.oreDocumento }
        : undefined,
      vincoli
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center z-[60] p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-3xl w-full my-6 overflow-hidden text-left">
        <div className="bg-brand-50 px-6 py-4 border-b border-brand-100 flex justify-between items-start gap-4">
          <div>
            <h3 className="font-bold text-slate-800">
              📥 Importa l&apos;orario che hai già
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Carica il file dell&apos;orario, che sia il PDF o il foglio di
              Excel (.xlsx), oppure copia le celle e incollale qui sotto.
              L&apos;orario dell&apos;app non cambia finché non premi
              «Importa».
            </p>
          </div>
          <button
            onClick={onChiudi}
            className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!pronta && (
            <div className="bg-bruciato-50 border border-bruciato-200 rounded-lg p-3 text-xs text-bruciato-800">
              La lettura assistita non è accesa su questo sito: qui funziona
              solo la lettura delle tabelle fatta dal browser, quella che conta
              le colonne del documento. Se il tuo orario ha una riga per
              docente e in cima i giorni con le ore, va lo stesso.
            </div>
          )}

          {/*
            I dati di esempio hanno le stesse sezioni di mezza Italia (1A, 2B,
            3C) e docenti inventati: l'orario letto dal documento ci si
            incastra sopra e alla fine, fra i nomi, non si distingue più il
            vero dal finto. Chi importa per la prima volta va avvisato prima
            di caricare il file, non dopo.
          */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
            Nell&apos;app ci sono ancora i docenti e le classi di esempio? Se
            sì, svuotala prima: <strong>Registro Cattedre → 🧹 Svuota la
            scuola</strong>. Altrimenti i nomi finti restano mescolati ai tuoi.
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer">
              {inCorso === 'file' ? 'Apro il file…' : 'Scegli un file'}
              <input
                type="file"
                accept=".pdf,.xlsx,.txt,.csv"
                className="hidden"
                onChange={(e) => scegliFile(e.target.files?.[0])}
              />
            </label>
            {nomeFile && (
              <span className="text-xs text-slate-500">{nomeFile}</span>
            )}
          </div>

          <textarea
            value={testo}
            onChange={(e) => {
              setTesto(e.target.value);
              setEsito(null);
              // Testo battuto a mano: i colori del file di prima non valgono
              // più, e le colonne nemmeno.
              setSfondi(null);
              setExtra(null);
              // Testo nuovo, lettura da rifare in casa: la richiesta di mandare
              // i nomi fuori valeva per la tabella di prima.
              setServeModello(false);
            }}
            rows={8}
            placeholder="Oppure incolla qui la tabella dell'orario."
            className="w-full text-xs font-mono border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />

          {serveModello && (
            <label className="flex items-start gap-2 text-xs text-slate-600 bg-bruciato-50 border border-bruciato-200 rounded-lg p-3">
              <input
                type="checkbox"
                checked={consenso}
                onChange={(e) => setConsenso(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Questa tabella non sono riuscito a leggerla qui dentro: la forma
                che riconosco da solo è quella con una riga per docente e in
                cima i giorni con le ore. Posso provare con l&apos;assistente,
                ma allora il testo qui sopra viene mandato alla società che
                gestisce il modello linguistico, <b>nomi dei docenti compresi</b>
                . Non viene conservato da EduTime Pro. Se nel documento ci sono
                dati che non c&apos;entrano con l&apos;orario, toglili prima.
              </span>
            </label>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={leggi}
              disabled={
                inCorso !== '' ||
                testo.trim().length < 40 ||
                (serveModello && !consenso)
              }
              className="bg-fucsia-600 hover:bg-fucsia-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {inCorso === 'ia'
                ? 'Sto leggendo…'
                : serveModello
                  ? 'Prova con l’assistente'
                  : 'Leggi l’orario'}
            </button>
          </div>

          {errore && (
            <div className="bg-fucsia-50 border border-fucsia-200 rounded-lg p-3 text-xs text-fucsia-800">
              {errore}
            </div>
          )}

          {esito && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-slate-800">
                {importabili.length}{' '}
                {importabili.length === 1
                  ? 'lezione pronta da importare'
                  : 'lezioni pronte da importare'}
              </p>

              {letturaLocale && (
                <p className="text-xs text-salvia-700 bg-salvia-50 border border-salvia-200 rounded-lg p-2">
                  🔒 La tabella è stata letta qui dentro, contando le colonne
                  del documento: nessun nome è uscito dal tuo computer e non è
                  stata usata nessuna funzione a pagamento.
                </p>
              )}

              {affiancati > 0 && (
                <p className="text-xs text-slate-600">
                  Di queste, {affiancati}{' '}
                  {affiancati === 1
                    ? 'è un secondo docente'
                    : 'sono secondi docenti'}{' '}
                  su un&apos;ora già occupata: compresenze e ore di sostegno.
                  Entrano nella stessa casella del titolare, ognuno con la sua
                  riga.
                </p>
              )}

              {/*
                La griglia dell'app più stretta della settimana del documento:
                capita a chi fa lezione il sabato e ha ancora la settimana
                corta dei dati di partenza. Le celle in eccesso non hanno dove
                andare, e senza questo avviso sembrerebbe che l'app abbia
                letto male.
              */}
              {((esito.giorniDocumento || 0) > limiti.giorni ||
                (esito.oreDocumento || 0) > limiti.ore) && (
                <div className="bg-bruciato-50 border border-bruciato-200 rounded-lg p-3 text-xs text-bruciato-800">
                  Il documento ha una settimana più larga di quella dell&apos;app
                  {(esito.giorniDocumento || 0) > limiti.giorni && (
                    <>
                      {' '}
                      ({esito.giorniDocumento} giorni contro {limiti.giorni})
                    </>
                  )}
                  {(esito.oreDocumento || 0) > limiti.ore && (
                    <>
                      {' '}
                      ({esito.oreDocumento} ore al giorno contro {limiti.ore})
                    </>
                  )}
                  . Le lezioni che cadono fuori dalla griglia non si possono
                  importare. Chiudi, vai in «⚙️ Sezioni &amp; Regole» e allarga
                  il modello di settimana, poi torna qui.
                </div>
              )}

              {esito.nota && (
                <p className="text-xs text-slate-600">{esito.nota}</p>
              )}

              {/*
                I colori del documento. Negli orari già costruiti dalla scuola
                la fascia colorata dice quello che la casella vuota non dice, e
                senza di essa un giorno libero e un buco di due ore si
                assomigliano troppo. Il significato però non si indovina in
                silenzio: qui si vede il colore com'è, quante giornate ha
                dipinto, e da un menù si cambia cosa vuol dire.
              */}
              {colori.length > 0 && (
                <div className="border border-brand-200 bg-brand-50 rounded-lg p-3 space-y-2">
                  <label className="flex items-start gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={portaVincoli}
                      onChange={(e) => setPortaVincoli(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      <b>Leggi anche i colori.</b> Nel documento ci sono
                      giornate intere dipinte di un colore solo: di solito è
                      così che si segnano il giorno libero e il giorno in
                      un&apos;altra scuola. Controlla che il significato sia
                      quello giusto, poi li porto dentro come vincoli del
                      docente.
                    </span>
                  </label>

                  {portaVincoli && (
                    <ul className="space-y-2">
                      {colori.map((c) => (
                        <li
                          key={c.colore}
                          className="flex flex-wrap items-center gap-2 text-xs text-slate-700"
                        >
                          <span
                            className="inline-block w-5 h-5 rounded border border-slate-300 shrink-0"
                            style={{ backgroundColor: c.colore }}
                          />
                          <span className="min-w-[9rem]">
                            {c.giornate}{' '}
                            {c.giornate === 1 ? 'giornata' : 'giornate'} su{' '}
                            {c.docenti.size}{' '}
                            {c.docenti.size === 1 ? 'docente' : 'docenti'}
                          </span>
                          <select
                            value={sensi[c.colore] || 'niente'}
                            onChange={(e) =>
                              setSensi((prima) => ({
                                ...prima,
                                [c.colore]: e.target.value as SensoColore,
                              }))
                            }
                            className="border border-slate-200 rounded-lg px-2 py-1 bg-white cursor-pointer"
                          >
                            <option value="libero">giorno libero</option>
                            <option value="altraScuola">
                              in un&apos;altra scuola
                            </option>
                            <option value="niente">non vuol dire niente</option>
                          </select>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/*
                Le ore «D». Queste stanno scritte nel testo, quindi si leggono
                anche senza colori: prima venivano buttate via perché non hanno
                la forma di una classe, e con loro se ne andava l'unica cosa
                che nell'orario dice dove il docente deve restare a scuola per
                le supplenze.
              */}
              {(extra?.disponibilita.length || 0) > 0 && (
                <label className="flex items-start gap-2 text-xs text-slate-700 border border-brand-200 bg-brand-50 rounded-lg p-3">
                  <input
                    type="checkbox"
                    checked={portaDisponibilita}
                    onChange={(e) => setPortaDisponibilita(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <b>Prendi anche le ore «D».</b> Nel documento ce ne sono{' '}
                    {extra?.disponibilita.length} su {docentiConD}{' '}
                    {docentiConD === 1 ? 'docente' : 'docenti'}: sono le ore di
                    disponibilità per le supplenze. Le segno nell&apos;Orario
                    Generale e le conto nel prospetto della segreteria.
                  </span>
                </label>
              )}

              {soloVincoli.length > 0 && (portaVincoli || portaDisponibilita) && (
                <details className="text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold">
                    {soloVincoli.length}{' '}
                    {soloVincoli.length === 1
                      ? 'docente compare solo con i colori o le «D»'
                      : 'docenti compaiono solo con i colori o le «D»'}
                  </summary>
                  <p className="mt-2">
                    Nel documento non hanno nessuna lezione propria e
                    nell&apos;app non ci sono ancora: è il caso di chi ha solo
                    ore di disponibilità.{' '}
                    {creaMancanti
                      ? 'Con la spunta «Crea quello che manca» nasce una scheda anche per loro, senza cattedra, e i vincoli ci finiscono dentro.'
                      : 'Senza la spunta «Crea quello che manca» i loro vincoli restano fuori.'}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {soloVincoli.map((n, i) => (
                      <li key={`sv-${i}`}>- {n}</li>
                    ))}
                  </ul>
                </details>
              )}

              {mancaQualcosa && (
                <div className="border border-brand-200 bg-brand-50 rounded-lg p-3 space-y-2">
                  <label className="flex items-start gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={creaMancanti}
                      onChange={(e) => setCreaMancanti(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      <b>Crea quello che manca.</b> Nel documento ci sono{' '}
                      {classiDaCreare.length > 0 && (
                        <>
                          {classiDaCreare.length}{' '}
                          {classiDaCreare.length === 1
                            ? 'classe'
                            : 'classi'}
                        </>
                      )}
                      {classiDaCreare.length > 0 &&
                        docentiDaCreare.length > 0 &&
                        ' e '}
                      {docentiDaCreare.length > 0 && (
                        <>
                          {docentiDaCreare.length}{' '}
                          {docentiDaCreare.length === 1
                            ? 'docente'
                            : 'docenti'}
                        </>
                      )}{' '}
                      che nell&apos;app non ci sono. Con la spunta li creo
                      insieme all&apos;orario: i docenti nascono con la materia
                      «DA COMPLETARE» e con la cattedra contata dalle ore che
                      hai importato.
                    </span>
                  </label>

                  {classiDaCreare.length > 0 && (
                    <details className="text-xs text-slate-600">
                      <summary className="cursor-pointer font-semibold">
                        Classi da creare: {classiDaCreare.length}
                      </summary>
                      <p className="mt-2">{classiDaCreare.join(', ')}</p>
                    </details>
                  )}

                  {docentiDaCreare.length > 0 && (
                    <details className="text-xs text-slate-600">
                      <summary className="cursor-pointer font-semibold">
                        Docenti da creare: {docentiDaCreare.length}
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {docentiDaCreare.map((n, i) => (
                          <li key={`nd-${i}`}>- {n}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              {scartateDalNome.length > 0 && (
                <details className="text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold">
                    {scartateDalNome.length}{' '}
                    {scartateDalNome.length === 1
                      ? 'riga che non si importa comunque'
                      : 'righe che non si importano comunque'}
                  </summary>
                  <p className="mt-2">
                    Un cognome che in archivio corrisponde già a due persone
                    non lo abbino e non lo creo: sceglierei io al posto tuo.
                    Queste ore vanno messe a mano.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {esito.nomiSconosciuti
                      .filter((n) => n.includes('più di uno'))
                      .map((n, i) => (
                        <li key={`ns-${i}`}>- {n}</li>
                      ))}
                  </ul>
                </details>
              )}

              {esito.scartate.length > 0 && (
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer font-semibold">
                    Righe scartate dall&apos;app: {esito.scartate.length}
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {esito.scartate.slice(0, 30).map((s, i) => (
                      <li key={`sc-${i}`}>
                        {s.riga} - {s.motivo}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="bg-bruciato-50 border border-bruciato-200 rounded-lg p-3 text-xs text-bruciato-800">
                Attenzione: importando, le lezioni che hai adesso nelle stesse
                caselle vengono sostituite.
              </div>

              <button
                onClick={applica}
                disabled={importabili.length === 0}
                className="bg-salvia-600 hover:bg-salvia-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
              >
                Importa {importabili.length}{' '}
                {importabili.length === 1 ? 'lezione' : 'lezioni'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
