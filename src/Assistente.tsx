import { useEffect, useMemo, useRef, useState } from 'react';
import { cerca, DOMANDE_SUGGERITE, NUMERO_CAPITOLI } from './guidaIndice';
import Feedback from './Feedback';

/**
 * Assistente della guida: pannello di aiuto che risponde a domande in
 * italiano pescando dai capitoli della guida.
 *
 * Funziona interamente nel browser, senza modelli linguistici né chiamate di
 * rete: la domanda dell'utente non lascia mai il dispositivo.
 */

interface Props {
  /**
   * True quando il pannello vive nella pagina /guida: i risultati portano al
   * capitolo con uno scorrimento invece di aprire una nuova scheda.
   */
  inGuida?: boolean;
}

export default function Assistente({ inGuida = false }: Props) {
  const [aperto, setAperto] = useState(false);
  const [domanda, setDomanda] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const risultati = useMemo(() => cerca(domanda), [domanda]);
  const haDomanda = domanda.trim().length > 0;

  useEffect(() => {
    if (aperto) inputRef.current?.focus();
  }, [aperto]);

  useEffect(() => {
    if (!aperto) return;
    const chiudiConEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAperto(false);
    };
    window.addEventListener('keydown', chiudiConEsc);
    return () => window.removeEventListener('keydown', chiudiConEsc);
  }, [aperto]);

  /**
   * Nella pagina della guida il capitolo è già a schermo: si scorre e basta.
   * Dall'app invece si lascia lavorare il link, che apre /guida sull'ancora
   * giusta in una nuova scheda.
   */
  const vaiAlCapitolo = (
    e: React.MouseEvent<HTMLAnchorElement>,
    capitoloId: string
  ) => {
    if (!inGuida) return;
    const sezione = document.getElementById(capitoloId);
    if (!sezione) return;
    e.preventDefault();
    // Salto secco e non animato: lo scorrimento morbido su una pagina lunga
    // come la guida viene interrotto da alcuni browser e lascia il lettore
    // dove si trovava.
    sezione.scrollIntoView({ block: 'start' });
    window.history.replaceState(null, '', `#${capitoloId}`);
    setAperto(false);
  };

  const propsLink = inGuida
    ? {}
    : { target: '_blank', rel: 'noopener noreferrer' };

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="fixed bottom-5 right-5 z-50 print:hidden bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm px-4 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all"
        aria-label="Apri l'assistente della guida"
      >
        <span aria-hidden="true">💬</span> Serve aiuto?
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Assistente della guida"
      className="fixed bottom-5 right-5 left-5 sm:left-auto z-50 print:hidden w-auto sm:w-[400px] max-h-[75vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="bg-gradient-to-r from-brand-700 via-brand-800 to-brand-950 text-white px-4 py-3 flex items-start justify-between gap-3 shrink-0">
        <div>
          <p className="font-bold text-sm">Assistente della guida</p>
          <p className="text-[11px] text-brand-200 mt-0.5">
            Cerca fra i {NUMERO_CAPITOLI} capitoli · tutto nel tuo browser
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAperto(false)}
          className="text-brand-200 hover:text-white text-lg leading-none shrink-0"
          aria-label="Chiudi l'assistente"
        >
          ✕
        </button>
      </div>

      <div className="p-3 border-b border-slate-200 shrink-0">
        <input
          ref={inputRef}
          type="search"
          value={domanda}
          onChange={(e) => setDomanda(e.target.value)}
          placeholder="Scrivi la tua domanda…"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="overflow-y-auto p-3 flex flex-col gap-3">
        {!haDomanda && (
          <>
            <p className="text-xs text-slate-500">
              Domande frequenti — oppure scrivi la tua con parole tue:
            </p>
            <div className="flex flex-wrap gap-2">
              {DOMANDE_SUGGERITE.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDomanda(d)}
                  className="text-xs bg-slate-100 hover:bg-brand-50 hover:text-brand-800 border border-slate-200 rounded-full px-3 py-1.5 text-left"
                >
                  {d}
                </button>
              ))}
            </div>
          </>
        )}

        {haDomanda && risultati.length === 0 && (
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-slate-800">
              Non ho trovato niente su questo.
            </p>
            <p className="mt-2">
              Prova con parole diverse (per esempio «cattedre», «conflitti»,
              «stampa», «backup») oppure sfoglia la guida completa.
            </p>
            <a
              href="/guida#introduzione"
              {...propsLink}
              onClick={(e) => vaiAlCapitolo(e, 'introduzione')}
              className="inline-block mt-3 text-brand-700 font-semibold underline"
            >
              Apri la guida completa →
            </a>
          </div>
        )}

        {haDomanda &&
          risultati.map((r) => (
            <div
              key={r.voce.id}
              className="border border-slate-200 rounded-xl p-3 bg-slate-50"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  {r.voce.titolo}
                </h3>
                {r.voce.tag && (
                  <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
                    {r.voce.tag}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                {r.estratto}
              </p>
              <a
                href={`/guida#${r.voce.capitoloId}`}
                {...propsLink}
                onClick={(e) => vaiAlCapitolo(e, r.voce.capitoloId)}
                className="inline-block mt-2 text-xs font-semibold text-brand-700 hover:text-brand-900 underline"
              >
                Capitolo {r.voce.capitoloNum} · {r.voce.capitoloTitolo} →
              </a>
            </div>
          ))}
      </div>

      <div className="text-[10px] text-slate-400 px-3 py-2 border-t border-slate-200 shrink-0">
        <p>Risposte prese dalla guida dell'app. Nessun dato inviato in rete.</p>
        <p className="text-slate-500 mt-0.5">
          Non hai trovato quello che cerchi? <Feedback />
        </p>
      </div>
    </div>
  );
}
