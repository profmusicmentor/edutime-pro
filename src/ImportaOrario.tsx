/**
 * La finestra «Importa l'orario che hai già».
 *
 * Serve il primo giorno, ed è la ragione per cui tanti si fermano prima di
 * cominciare: l'orario dell'anno scorso c'è, ma è in un PDF, e ribatterlo
 * cella per cella prima ancora di sapere se il programma serve non lo fa
 * nessuno. Qui si carica il documento (PDF, TXT, CSV) oppure si incolla la
 * tabella copiata da Excel, e un modello linguistico la rimette in righe.
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
import { testoDelFile } from './letturaElenchi';
import { leggiGrigliaOrario } from './letturaOrarioGriglia';
import {
  componiEsito,
  leggiOrarioDaTesto,
  letturaOrarioDisponibile,
  type EsitoLetturaOrario,
  type PersonaNota,
  type RigaOrarioLetta,
} from './importaOrarioIA';
import { messaggioErroreIa } from './iaComune';

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
    nuoviDocenti: { id: string; name: string }[],
    nuoveClassi: string[],
    /** La settimana disegnata nel documento: serve a chi crea le sezioni. */
    grigliaDocumento?: { giorni: number; ore: number }
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
   * La griglia entro cui le righe sono state accettate. Non sempre è quella
   * dell'app: con la scuola ancora vuota si allarga fino al documento, e
   * l'avviso «settimana più larga» deve guardare questa, altrimenti compare
   * anche quando non è stato tagliato niente.
   */
  const [limiti, setLimiti] = useState({ giorni: giorni.length, ore });

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

  /** Le righe che restano fuori comunque, spunta o no. */
  const scartateDalNome = useMemo(
    () => (esito?.righe || []).filter((r) => !r.teacherId && (r.ambiguo || !r.nomeLetto)),
    [esito]
  );

  const scegliFile = async (file: File | undefined) => {
    if (!file) return;
    setErrore('');
    setEsito(null);
    setInCorso('file');
    try {
      const estratto = await testoDelFile(file);
      setTesto(estratto);
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
    if (!consenso || testo.trim().length < 40) return;
    setErrore('');
    setEsito(null);

    const inCasa = leggiGrigliaOrario(testo);
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

    setLetturaLocale(false);
    setLimiti({ giorni: giorni.length, ore });
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
   */
  const applica = () => {
    if (!importabili.length) return;

    const adesso = Date.now();
    const nuovi = new Map<string, { id: string; name: string }>();

    const righe = importabili.map((r) => {
      if (r.teacherId) return r;
      const chiave = r.nomeLetto.toUpperCase();
      let voce = nuovi.get(chiave);
      if (!voce) {
        voce = { id: `staff_${adesso}_${nuovi.size}`, name: r.nomeLetto };
        nuovi.set(chiave, voce);
      }
      return { ...r, teacherId: voce.id };
    });

    const classiNuove = Array.from(
      new Set(righe.filter((r) => r.classeNuova).map((r) => r.classId))
    );

    onApplica(
      righe,
      Array.from(nuovi.values()),
      classiNuove,
      esito?.giorniDocumento && esito?.oreDocumento
        ? { giorni: esito.giorniDocumento, ore: esito.oreDocumento }
        : undefined
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
              Carica il PDF dell&apos;orario, oppure aprilo in Excel, seleziona
              le celle, copia e incolla qui sotto. L&apos;orario dell&apos;app
              non cambia finché non premi «Importa».
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
                accept=".pdf,.txt,.csv"
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
            }}
            rows={8}
            placeholder="Oppure incolla qui la tabella dell'orario."
            className="w-full text-xs font-mono border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />

          <label className="flex items-start gap-2 text-xs text-slate-600 bg-bruciato-50 border border-bruciato-200 rounded-lg p-3">
            <input
              type="checkbox"
              checked={consenso}
              onChange={(e) => setConsenso(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Ho capito che, <b>se la tabella non si lascia leggere qui</b>, il
              testo qui sopra viene mandato alla società che gestisce il modello
              linguistico per essere letto, <b>nomi dei docenti compresi</b>.
              Non viene conservato da EduTime Pro. Se nel documento ci sono dati
              che non c&apos;entrano con l&apos;orario, toglili prima.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={leggi}
              disabled={!consenso || inCorso !== '' || testo.trim().length < 40}
              className="bg-fucsia-600 hover:bg-fucsia-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {inCorso === 'ia' ? 'Sto leggendo…' : 'Leggi l’orario'}
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
