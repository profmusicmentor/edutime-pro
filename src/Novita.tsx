import { useEffect } from 'react';
import { NOVITA, NOVITA_VERSIONE } from './novitaContenuti';
import type { VoceNovita } from './novitaContenuti';

/**
 * Pannello delle novità.
 *
 * All'avvio mostra solo i rilasci che chi sta davanti allo schermo non ha
 * ancora letto: la firma dell'ultimo rilascio visto resta nel browser, quindi
 * non serve alcun dato in rete. Chi ha già chiuso il pannello non lo rivede
 * finché non esce un aggiornamento nuovo, e quando esce legge solo quello,
 * non tutta la storia dell'app da capo.
 *
 * Il pulsante ✨ Novità in fondo alla pagina apre invece l'elenco completo:
 * lì è una scelta di chi legge, non un pannello che compare da solo.
 */

const CHIAVE = 'eduTime_novitaViste';

/** Modo di apertura: nulla, solo i rilasci non letti, tutto l'elenco. */
export type ModoNovita = '' | 'nuove' | 'tutte';

/** Firma dell'ultimo rilascio già letto in questo browser. */
function ultimaVista(): string | null {
  try {
    return localStorage.getItem(CHIAVE);
  } catch {
    // Browser che blocca lo storage: meglio non mostrare niente che
    // insistere a ogni apertura.
    return null;
  }
}

/**
 * I rilasci usciti dopo l'ultimo letto. Il confronto è fra stringhe e
 * funziona perché `versione` è una data AAAA-MM-GG, eventualmente seguita da
 * una lettera per i rilasci multipli dello stesso giorno: l'ordine
 * alfabetico coincide con quello cronologico.
 */
function novitaNonLette(): VoceNovita[] {
  const vista = ultimaVista();
  if (vista === null) return [];
  return NOVITA.filter((blocco) => blocco.versione > vista);
}

export function segnaNovitaViste() {
  try {
    localStorage.setItem(CHIAVE, NOVITA_VERSIONE);
  } catch {
    /* niente storage, pazienza: il pannello si richiude comunque */
  }
}

/**
 * Cosa aprire all'avvio dell'app.
 *
 * Al primo accesso in assoluto non c'è niente da raccontare (l'app è nuova
 * per chi la apre): si segna il rilascio corrente come già visto e non
 * compare nessun pannello. Dalla volta dopo compaiono solo gli aggiornamenti
 * arrivati nel frattempo.
 */
export function novitaAllAvvio(): ModoNovita {
  if (ultimaVista() === null) {
    segnaNovitaViste();
    return '';
  }
  return novitaNonLette().length > 0 ? 'nuove' : '';
}

export default function Novita({
  modo,
  onChiudi,
}: {
  modo: ModoNovita;
  onChiudi: () => void;
}) {
  const aperto = modo !== '';
  useEffect(() => {
    if (!aperto) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [aperto, onChiudi]);

  if (!aperto) return null;

  const blocchi = modo === 'nuove' ? novitaNonLette() : NOVITA;
  if (blocchi.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 print:hidden">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-slate-100">
          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
            Novità
          </span>
          <h3 className="text-xl font-bold text-slate-800 mt-3">
            {modo === 'nuove'
              ? "Cosa è cambiato dall'ultima volta"
              : 'Cosa è cambiato in EduTime Pro'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {modo === 'nuove'
              ? "Solo le modifiche uscite da quando hai chiuso questo pannello l'ultima volta. I tuoi dati e i tuoi orari restano come li hai lasciati."
              : "Tutte le modifiche degli ultimi rilasci. I tuoi dati e i tuoi orari restano come li hai lasciati."}
          </p>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
          {blocchi.map((blocco) => (
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
