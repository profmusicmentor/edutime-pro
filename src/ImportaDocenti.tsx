/**
 * La finestra «Importa da PDF» della scheda Consigli di classe.
 *
 * Prende il documento che la scuola ha già (il PDF con l'elenco dei docenti
 * classe per classe), lo legge e propone i consigli da creare. Niente viene
 * scritto finché la persona non guarda l'anteprima e conferma.
 *
 * La lettura si fa in due modi, e il primo è quello predefinito:
 *
 * - qui dentro, nel browser, senza rete: il PDF non esce dal computer;
 * - con l'aiuto di un modello linguistico, per i documenti che l'app da sola
 *   non riesce a interpretare. Questa seconda strada fa uscire il testo del
 *   documento, nomi compresi, verso la società che gestisce il modello: per
 *   questo sta dietro una spunta scritta chiara, e serve la chiave
 *   dell'abbonamento.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  abbina,
  ErroreLicenzaImport,
  leggiElenco,
  letturaAssistita,
  letturaAssistitaDisponibile,
  testoDelFile,
  type ClasseProposta,
  type RigaLetta,
} from './letturaElenchi';
import { idCliente, leggiIstanza, leggiLicenza } from './assistenteIA';

interface Props {
  /** Gli id delle classi dell'istituto, es. ['1A', '2A']. */
  classi: string[];
  /** I docenti già presenti in app: servono per riconoscere i nomi. */
  staff: { id: string; name: string }[];
  onChiudi: () => void;
  /**
   * Consegna il risultato: per ogni classe gli id dei docenti scelti, e a
   * parte i docenti che nell'app non c'erano e vanno creati.
   */
  onApplica: (
    perClasse: { classe: string; docentiIds: string[] }[],
    nuoviDocenti: { id: string; name: string }[]
  ) => void;
}

/** Materia di scorta per i docenti che nascono da un import. */
const MATERIA_DA_COMPLETARE = 'DA COMPLETARE';

export default function ImportaDocenti({
  classi,
  staff,
  onChiudi,
  onApplica,
}: Props) {
  const [testo, setTesto] = useState('');
  const [nomeFile, setNomeFile] = useState('');
  const [proposta, setProposta] = useState<ClasseProposta[] | null>(null);
  const [errore, setErrore] = useState('');
  const [avviso, setAvviso] = useState('');
  const [inCorso, setInCorso] = useState<'' | 'file' | 'locale' | 'ia'>('');
  const [iaDisponibile, setIaDisponibile] = useState(false);
  const [consensoIa, setConsensoIa] = useState(false);

  useEffect(() => {
    let vivo = true;
    letturaAssistitaDisponibile().then((ok) => {
      if (vivo) setIaDisponibile(ok);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /* --- lettura --- */

  const scegliFile = async (file: File | undefined) => {
    if (!file) return;
    setErrore('');
    setAvviso('');
    setInCorso('file');
    try {
      const estratto = await testoDelFile(file);
      setTesto(estratto);
      setNomeFile(file.name);
      leggiInLocale(estratto);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non riesco ad aprire il file.');
      setProposta(null);
    } finally {
      setInCorso('');
    }
  };

  const applicaRighe = (righe: RigaLetta[]) => {
    const abbinate = abbina(righe, staff);
    setProposta(abbinate);
    return abbinate;
  };

  const leggiInLocale = (contenuto: string) => {
    const righe = leggiElenco(contenuto, classi);
    const abbinate = applicaRighe(righe);
    if (!abbinate.length) {
      setAvviso(
        'Da questo documento non sono riuscito a tirare fuori nessuna classe. Controlla che le classi siano scritte come nell\'app (per esempio 1A), oppure prova la lettura assistita qui sotto.'
      );
    }
  };

  const chiediAllIa = async () => {
    setErrore('');
    setAvviso('');
    setInCorso('ia');
    try {
      const righe = await letturaAssistita(
        testo,
        classi,
        staff.map((s) => s.name),
        {
          licenza: leggiLicenza(),
          istanza: leggiIstanza(),
          clientId: idCliente(),
        }
      );
      const abbinate = applicaRighe(righe);
      if (!abbinate.length) {
        setAvviso('Nemmeno così sono riuscito a leggere delle classi.');
      }
    } catch (e) {
      if (e instanceof ErroreLicenzaImport) {
        setErrore(
          `${e.message} La lettura assistita fa parte dell'abbonamento: la chiave si incolla nel pannello dell'assistente, in fondo alla Guida.`
        );
      } else {
        setErrore(e instanceof Error ? e.message : 'Lettura non riuscita.');
      }
    } finally {
      setInCorso('');
    }
  };

  /* --- anteprima --- */

  const cambiaDocente = (
    classe: string,
    indice: number,
    patch: Partial<ClasseProposta['docenti'][number]>
  ) =>
    setProposta((prec) =>
      (prec || []).map((c) =>
        c.classe !== classe
          ? c
          : {
              ...c,
              docenti: c.docenti.map((d, i) =>
                i === indice ? { ...d, ...patch } : d
              ),
            }
      )
    );

  const conteggi = useMemo(() => {
    let scelti = 0;
    let nuovi = 0;
    const nomiNuovi = new Set<string>();
    (proposta || []).forEach((c) =>
      c.docenti.forEach((d) => {
        if (!d.scelto) return;
        scelti += 1;
        if (!d.id) nomiNuovi.add(d.testo);
      })
    );
    nuovi = nomiNuovi.size;
    return { scelti, nuovi, classi: (proposta || []).length };
  }, [proposta]);

  const applica = () => {
    if (!proposta) return;

    // Un nome che nell'app non c'è va creato una volta sola, anche se compare
    // in dieci classi: qui si tiene la corrispondenza nome → id appena nato.
    const nuovi = new Map<string, { id: string; name: string }>();
    const adesso = Date.now();

    const perClasse = proposta.map((c) => ({
      classe: c.classe,
      docentiIds: c.docenti
        .filter((d) => d.scelto)
        .map((d) => {
          if (d.id) return d.id;
          const esistente = nuovi.get(d.testo);
          if (esistente) return esistente.id;
          const voce = {
            id: `staff_${adesso}_${nuovi.size}`,
            name: d.testo,
          };
          nuovi.set(d.testo, voce);
          return voce.id;
        }),
    }));

    onApplica(
      perClasse.filter((c) => c.docentiIds.length),
      Array.from(nuovi.values())
    );
  };

  /* --- interfaccia --- */

  const etichetta = (esito: ClasseProposta['docenti'][number]['esito']) => {
    if (esito === 'trovato')
      return (
        <span className="text-[10px] font-bold text-salvia-700 bg-salvia-50 border border-salvia-200 rounded px-1 py-0.5">
          già in app
        </span>
      );
    if (esito === 'ambiguo')
      return (
        <span className="text-[10px] font-bold text-bruciato-700 bg-bruciato-50 border border-bruciato-200 rounded px-1 py-0.5">
          da scegliere
        </span>
      );
    return (
      <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded px-1 py-0.5">
        nuovo
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center z-[60] p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-3xl w-full my-6 overflow-hidden text-left">
        <div className="bg-brand-50 px-6 py-4 border-b border-brand-100 flex justify-between items-start gap-4">
          <div>
            <h3 className="font-bold text-slate-800">
              📄 Importa i docenti da un elenco
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Carica il PDF con i docenti classe per classe, oppure incolla
              l&apos;elenco. L&apos;app lo legge qui nel browser: il documento
              non esce dal computer. Prima di scrivere qualcosa ti mostro cosa
              ha capito.
            </p>
          </div>
          <button
            onClick={onChiudi}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
            title="Chiudi"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* scelta del documento */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 block">
              Il documento
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm cursor-pointer">
                {inCorso === 'file' ? 'Apro il file…' : 'Scegli un PDF…'}
                <input
                  type="file"
                  accept=".pdf,.txt,.csv,.tsv"
                  className="hidden"
                  onChange={(e) => scegliFile(e.target.files?.[0])}
                />
              </label>
              {nomeFile && (
                <span className="text-xs font-semibold text-slate-500">
                  {nomeFile}
                </span>
              )}
            </div>
            <textarea
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              rows={4}
              placeholder={'…oppure incolla qui l\'elenco, per esempio:\nCLASSE 1A\nROSSI MARIO\nBIANCHI ANNA'}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700"
            />
            <button
              onClick={() => leggiInLocale(testo)}
              disabled={testo.trim().length < 10 || inCorso !== ''}
              className="bg-slate-700 hover:bg-slate-800 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-bold"
            >
              Leggi l&apos;elenco
            </button>
          </div>

          {errore && (
            <div className="bg-fucsia-50 border border-fucsia-200 rounded-lg p-3 text-sm text-fucsia-800">
              {errore}
            </div>
          )}
          {avviso && !errore && (
            <div className="bg-bruciato-50 border border-bruciato-200 rounded-lg p-3 text-sm text-bruciato-800">
              {avviso}
            </div>
          )}

          {/* anteprima */}
          {proposta && proposta.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-bold text-slate-700">
                Ho trovato {conteggi.classi}{' '}
                {conteggi.classi === 1 ? 'classe' : 'classi'} e{' '}
                {conteggi.scelti} docenti da mettere nei consigli
                {conteggi.nuovi > 0 && (
                  <>
                    , di cui {conteggi.nuovi} da creare (finiranno nel Registro
                    Cattedre con materia «{MATERIA_DA_COMPLETARE}»)
                  </>
                )}
                .
              </div>
              {proposta.map((c) => (
                <div
                  key={c.classe}
                  className="border border-slate-200 rounded-lg p-3"
                >
                  <div className="font-black text-slate-700 text-sm mb-2">
                    {c.classe}
                  </div>
                  <div className="space-y-1.5">
                    {c.docenti.map((d, i) => (
                      <div
                        key={`${c.classe}-${i}`}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={d.scelto}
                          onChange={(e) =>
                            cambiaDocente(c.classe, i, {
                              scelto: e.target.checked,
                            })
                          }
                        />
                        <span className="font-semibold text-slate-700">
                          {d.testo}
                        </span>
                        {etichetta(d.esito)}
                        {d.esito === 'ambiguo' && (
                          <select
                            value={d.id || ''}
                            onChange={(e) =>
                              cambiaDocente(c.classe, i, {
                                id: e.target.value || null,
                              })
                            }
                            className="text-xs font-semibold text-slate-600 border border-slate-300 rounded px-1 py-1"
                          >
                            <option value="">crea un docente nuovo</option>
                            {d.candidati.map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* lettura assistita */}
          {iaDisponibile && testo.trim().length >= 10 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
              <div className="text-sm font-bold text-slate-700">
                ✨ Il documento si legge male? Fallo leggere all&apos;IA
              </div>
              <p className="text-xs text-slate-600">
                Serve quando il PDF è fatto a tabelle strane e qui sopra esce
                poco o niente. Fa parte dell&apos;abbonamento, insieme
                all&apos;assistente della Guida.
              </p>
              <p className="text-xs text-fucsia-800 bg-fucsia-50 border border-fucsia-200 rounded p-2">
                <strong>Da sapere prima di premere:</strong> con questa
                scorciatoia il testo del documento, <strong>nomi dei
                docenti compresi</strong>, esce dal tuo computer e arriva alla
                società che gestisce il modello di intelligenza artificiale
                (Google, OpenAI o Anthropic, secondo il motore configurato).
                Serve a leggere il file e non viene conservato da EduTime Pro,
                ma il passaggio da quella società c&apos;è. La lettura fatta
                dall&apos;app qui sopra, invece, non manda niente a nessuno.
              </p>
              <label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={consensoIa}
                  onChange={(e) => setConsensoIa(e.target.checked)}
                  className="mt-0.5"
                />
                Ho letto, e voglio mandare il testo di questo documento al
                modello.
              </label>
              <button
                onClick={chiediAllIa}
                disabled={!consensoIa || inCorso !== ''}
                className="bg-fucsia-600 hover:bg-fucsia-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-bold"
              >
                {inCorso === 'ia' ? 'Sto leggendo…' : 'Fammi aiutare dall’IA'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex flex-wrap justify-end gap-2">
          <button
            onClick={onChiudi}
            className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold"
          >
            Annulla
          </button>
          <button
            onClick={applica}
            disabled={!proposta || conteggi.scelti === 0}
            className="bg-salvia-600 hover:bg-salvia-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-bold"
          >
            Crea i consigli
          </button>
        </div>
      </div>
    </div>
  );
}

export { MATERIA_DA_COMPLETARE };
