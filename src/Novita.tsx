import { useEffect } from 'react';
import { NOVITA, NOVITA_VERSIONE } from './novitaContenuti';

/**
 * Pannello delle novità.
 *
 * Si apre da solo, una volta sola, quando l'app è stata aggiornata dopo
 * l'ultima visita: la firma dell'ultimo rilascio visto resta nel browser,
 * quindi non serve alcun dato in rete e chi non ha aggiornamenti da vedere non
 * vede niente. Il pulsante in fondo alla pagina lo riapre quando si vuole.
 */

const CHIAVE = 'eduTime_novitaViste';

export function novitaDaVedere() {
  try {
    return localStorage.getItem(CHIAVE) !== NOVITA_VERSIONE;
  } catch {
    // Browser che blocca lo storage: meglio non mostrare niente che insistere
    // a ogni apertura.
    return false;
  }
}

export function segnaNovitaViste() {
  try {
    localStorage.setItem(CHIAVE, NOVITA_VERSIONE);
  } catch {
    /* niente storage, pazienza: il pannello si richiude comunque */
  }
}

export default function Novita({
  aperto,
  onChiudi,
}: {
  aperto: boolean;
  onChiudi: () => void;
}) {
  useEffect(() => {
    if (!aperto) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aperto, onChiudi]);

  if (!aperto) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-slate-100">
          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
            Novità
          </span>
          <h3 className="text-xl font-bold text-slate-800 mt-3">
            Cosa è cambiato in EduTime Pro
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Le ultime modifiche all'app. I tuoi dati e i tuoi orari restano
            come li hai lasciati.
          </p>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
          {NOVITA.map((blocco) => (
            <div key={blocco.versione}>
              <h4 className="text-sm font-bold text-slate-700 mb-2">
                {blocco.data}
              </h4>
              <ul className="space-y-2">
                {blocco.voci.map((voce, i) => (
                  <li
                    key={i}
                    className="text-sm text-slate-600 leading-relaxed pl-5 relative"
                  >
                    <span className="absolute left-0 top-0 text-indigo-500">
                      •
                    </span>
                    {voce}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onChiudi}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all cursor-pointer"
          >
            Ho capito
          </button>
        </div>
      </div>
    </div>
  );
}
