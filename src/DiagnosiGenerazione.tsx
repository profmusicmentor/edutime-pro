/**
 * Il riquadro «Perché non ci riesce?» dentro il report della generazione.
 *
 * Il report dice quante ore sono rimaste fuori. Chi fa l'orario da vent'anni
 * a quel punto sa già dove guardare; chi ci prova per la prima volta chiude il
 * programma e torna al foglio a quadretti. Qui il modello guarda i numeri, le
 * ore rimaste fuori e i vincoli accesi, e dice cosa sta stringendo.
 *
 * Le proposte sono pulsanti, non modifiche: la regola cambia quando si preme,
 * e cambia una regola per volta, così si può rigenerare e vedere l'effetto.
 */

import { useEffect, useState } from 'react';
import {
  chiediDiagnosi,
  diagnosiDisponibile,
  type DatiDiagnosi,
  type Diagnosi,
} from './diagnosiIA';
import { messaggioErroreIa } from './iaComune';

interface Props {
  dati: DatiDiagnosi;
  readOnly: boolean;
  onApplicaRegola: (campo: string, valore: number | boolean) => void;
}

const comeSiLegge = (valore: number | boolean): string => {
  if (valore === true) return 'sì';
  if (valore === false) return 'no';
  if (valore === 0) return 'nessun limite';
  return String(valore);
};

export default function DiagnosiGenerazione({
  dati,
  readOnly,
  onApplicaRegola,
}: Props) {
  const [pronta, setPronta] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');
  const [diagnosi, setDiagnosi] = useState<Diagnosi | null>(null);
  /** Le regole già cambiate da qui: il pulsante non si ripreme due volte. */
  const [fatte, setFatte] = useState<Set<string>>(new Set());

  useEffect(() => {
    let vivo = true;
    diagnosiDisponibile().then((ok) => {
      if (vivo) setPronta(ok);
    });
    return () => {
      vivo = false;
    };
  }, []);

  if (!pronta) return null;

  const chiedi = async () => {
    if (inCorso) return;
    setErrore('');
    setDiagnosi(null);
    setInCorso(true);
    try {
      const risultato = await chiediDiagnosi(dati);
      setDiagnosi(risultato);
      if (!risultato.cause.length && !risultato.nota) {
        setErrore('Non sono riuscito a trovare una causa chiara.');
      }
    } catch (e) {
      setErrore(messaggioErroreIa(e));
    } finally {
      setInCorso(false);
    }
  };

  return (
    <div className="bg-brand-50 border border-brand-100 rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-md">
          <h4 className="font-bold text-slate-800 text-sm">
            ✨ Perché non ci riesce?
          </h4>
          <p className="text-xs text-slate-600 mt-1">
            L&apos;IA guarda le ore rimaste fuori e i vincoli accesi, e dice
            quale sta stringendo. I nomi dei docenti non escono dal computer.
          </p>
        </div>
        <button
          onClick={chiedi}
          disabled={inCorso}
          className="shrink-0 bg-fucsia-600 hover:bg-fucsia-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {inCorso ? 'Sto guardando…' : 'Spiegami'}
        </button>
      </div>

      {errore && (
        <div className="bg-fucsia-50 border border-fucsia-200 rounded-lg p-3 text-xs text-fucsia-800">
          {errore}
        </div>
      )}

      {diagnosi && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          {diagnosi.cause.map((c, i) => (
            <div key={`causa-${i}`}>
              <p className="text-xs font-bold text-slate-800">{c.titolo}</p>
              <p className="text-xs text-slate-600 mt-0.5">{c.spiegazione}</p>
            </div>
          ))}

          {diagnosi.nota && (
            <p className="text-xs text-slate-500 italic">{diagnosi.nota}</p>
          )}

          {diagnosi.regole.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-xs font-semibold text-slate-700">
                Cosa puoi cambiare adesso:
              </p>
              {diagnosi.regole.map((r) => (
                <div
                  key={r.campo}
                  className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 rounded-lg p-2"
                >
                  <div className="text-xs text-slate-700">
                    <span className="font-bold">{r.etichetta}</span>:{' '}
                    {r.valoreAttuale !== undefined && (
                      <>da {comeSiLegge(r.valoreAttuale)} </>
                    )}
                    a {comeSiLegge(r.valore)}
                    {r.perche && (
                      <span className="block text-slate-600">{r.perche}</span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      onApplicaRegola(r.campo, r.valore);
                      setFatte((prec) => new Set(prec).add(r.campo));
                    }}
                    disabled={readOnly || fatte.has(r.campo)}
                    className="shrink-0 bg-salvia-600 hover:bg-salvia-700 disabled:opacity-40 text-white font-bold text-xs py-1.5 px-3 rounded-lg cursor-pointer disabled:cursor-not-allowed"
                  >
                    {fatte.has(r.campo) ? 'Fatto' : 'Cambia'}
                  </button>
                </div>
              ))}
              <p className="text-xs text-slate-500">
                Dopo aver cambiato una regola rigenera l&apos;orario per vedere
                l&apos;effetto.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
