/**
 * Il riquadro «Fatti aiutare dall'IA» in cima alla scheda Sostituzioni.
 *
 * L'app sa già chi può coprire ogni ora scoperta. Questo riquadro chiede al
 * modello di scegliere, ora per ora, guardando anche chi ha già coperto tanto:
 * è la parte che l'app da sola non sa pesare, e che di mattina si risolve
 * sempre chiamando la stessa persona, quella che non dice mai di no.
 *
 * Le proposte si vedono prima di essere applicate, e si tolgono una per una.
 * Finché non si preme «Applica» non viene registrata nessuna sostituzione.
 */

import { useEffect, useState } from 'react';
import {
  aiutoSostituzioniDisponibile,
  chiediSostituzioni,
  type AssegnazioneProposta,
  type BucoScoperto,
  type EsitoSostituzioni,
} from './sostituzioniIA';
import { messaggioErroreIa } from './iaComune';

interface Props {
  /** Le ore rimaste scoperte oggi, con i candidati già filtrati dall'app. */
  buchi: BucoScoperto[];
  /** Quante ore di sostituzione ha già ricevuto ciascun docente. */
  carico: Map<string, number>;
  /** La data di cui si parla, scritta come la legge una persona. */
  giorno: string;
  readOnly: boolean;
  onApplica: (assegnazioni: AssegnazioneProposta[]) => void;
}

export default function PannelloSostituzioni({
  buchi,
  carico,
  giorno,
  readOnly,
  onApplica,
}: Props) {
  const [pronta, setPronta] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');
  const [esito, setEsito] = useState<EsitoSostituzioni | null>(null);
  /** I riferimenti che la persona ha tolto dall'elenco prima di applicare. */
  const [escluse, setEscluse] = useState<Set<string>>(new Set());

  useEffect(() => {
    let vivo = true;
    aiutoSostituzioniDisponibile().then((ok) => {
      if (vivo) setPronta(ok);
    });
    return () => {
      vivo = false;
    };
  }, []);

  // Cambiando giorno le proposte di prima non valgono più: sono legate alle
  // assenze di quella data.
  useEffect(() => {
    setEsito(null);
    setErrore('');
    setEscluse(new Set());
  }, [giorno]);

  if (!pronta || buchi.length === 0) return null;

  const chiedi = async () => {
    if (readOnly || inCorso) return;
    setErrore('');
    setEsito(null);
    setEscluse(new Set());
    setInCorso(true);
    try {
      const risultato = await chiediSostituzioni(buchi, carico, giorno);
      setEsito(risultato);
      if (!risultato.assegnazioni.length && !risultato.nota) {
        setErrore(
          'Non è arrivata nessuna proposta utilizzabile. Le sostituzioni restano da assegnare a mano.'
        );
      }
    } catch (e) {
      setErrore(messaggioErroreIa(e));
    } finally {
      setInCorso(false);
    }
  };

  const scelte = (esito?.assegnazioni || []).filter(
    (a) => !escluse.has(a.buco.rif)
  );

  const togli = (rif: string) =>
    setEscluse((prec) => {
      const nuove = new Set(prec);
      nuove.add(rif);
      return nuove;
    });

  const applica = () => {
    if (readOnly || !scelte.length) return;
    onApplica(scelte);
    setEsito(null);
    setEscluse(new Set());
  };

  return (
    <div className="mb-6 bg-brand-50 border border-brand-100 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="font-bold text-slate-800 text-sm">
            ✨ Chi mando a coprire?
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            L&apos;IA guarda le {buchi.length}{' '}
            {buchi.length === 1 ? 'ora scoperta' : 'ore scoperte'} di oggi e
            sceglie fra i docenti che l&apos;app ha già trovato liberi, tenendo
            conto di chi ha già coperto tanto. Prima di mostrartele, l&apos;app
            ricontrolla che ogni scelta sia davvero fra i candidati di
            quell&apos;ora. Niente viene registrato finché non premi
            «Applica». I nomi dei docenti non escono dal computer: al loro
            posto vanno delle sigle.
          </p>
        </div>
        <button
          onClick={chiedi}
          disabled={readOnly || inCorso}
          className="shrink-0 bg-fucsia-600 hover:bg-fucsia-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {inCorso ? 'Sto scegliendo…' : 'Proponi i sostituti'}
        </button>
      </div>

      {errore && (
        <div className="bg-fucsia-50 border border-fucsia-200 rounded-lg p-3 text-xs text-fucsia-800">
          {errore}
        </div>
      )}

      {esito?.nota && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
          {esito.nota}
        </div>
      )}

      {esito && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          {scelte.length > 0 ? (
            <ul className="space-y-2">
              {scelte.map((a) => (
                <li
                  key={a.buco.rif}
                  className="text-xs text-slate-700 bg-salvia-50 border border-salvia-100 rounded-lg p-2 flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="font-bold">
                      {a.buco.classId}, {a.buco.hour + 1}ª ora: {a.nome}
                    </span>
                    {a.perche && (
                      <span className="block text-slate-600 mt-0.5">
                        {a.perche}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => togli(a.buco.rif)}
                    className="shrink-0 text-slate-400 hover:text-fucsia-600 font-bold cursor-pointer"
                    title="Togli questa proposta"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-600">
              Nessuna proposta da applicare.
            </p>
          )}

          {esito.scartate.length > 0 && (
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer font-semibold">
                Proposte scartate dall&apos;app: {esito.scartate.length}
              </summary>
              <ul className="mt-2 space-y-1">
                {esito.scartate.map((s, i) => (
                  <li key={`no-${i}`}>
                    {s.descrizione} - {s.motivo}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={applica}
              disabled={readOnly || scelte.length === 0}
              className="bg-salvia-600 hover:bg-salvia-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              Applica {scelte.length}{' '}
              {scelte.length === 1 ? 'sostituzione' : 'sostituzioni'}
            </button>
            <button
              onClick={() => {
                setEsito(null);
                setEscluse(new Set());
              }}
              className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer"
            >
              Lascia stare
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
