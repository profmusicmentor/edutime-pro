/**
 * La finestra «Chiedi all'orario».
 *
 * «Chi è libero giovedì alla terza?» «Quante ore buche ha la Bianchi?» «La 2B
 * quando fa musica?» Sono le domande che si fanno dieci volte al giorno
 * guardando la griglia e contando con il dito, e che di solito si fanno male:
 * si guarda la colonna sbagliata, si dimentica il docente che quel giorno non
 * c'è.
 *
 * Le risposte stanno tutte dentro l'orario. I conti li fa l'app prima di
 * chiamare (chi è libero in ogni casella, le ore buche, i totali); al modello
 * resta capire la domanda e scrivere la risposta. I nomi non escono: diventano
 * sigle, e tornano nomi prima che la risposta compaia qui.
 */

import { useEffect, useRef, useState } from 'react';
import {
  chiediSullOrario,
  domandeOrarioDisponibili,
  type DatiOrario,
  type MessaggioOrario,
} from './domandeOrarioIA';
import { messaggioErroreIa } from './iaComune';

interface Props {
  dati: DatiOrario;
  onChiudi: () => void;
}

/** Le domande che fanno tutti: servono a capire cosa si può chiedere. */
const ESEMPI = [
  'Chi è libero giovedì alla terza ora?',
  'Quali docenti hanno più di tre ore buche?',
  'In che giorni la 2A ha lezione alla sesta ora?',
];

export default function DomandeOrario({ dati, onChiudi }: Props) {
  const [pronta, setPronta] = useState(false);
  const [messaggi, setMessaggi] = useState<MessaggioOrario[]>([]);
  const [domanda, setDomanda] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');
  const fondo = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let vivo = true;
    domandeOrarioDisponibili().then((ok) => {
      if (vivo) setPronta(ok);
    });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    fondo.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messaggi, inCorso]);

  const chiedi = async (testo: string) => {
    const pulita = testo.trim();
    if (!pulita || inCorso) return;

    const conversazione: MessaggioOrario[] = [
      ...messaggi,
      { ruolo: 'user', testo: pulita },
    ];
    setMessaggi(conversazione);
    setDomanda('');
    setErrore('');
    setInCorso(true);

    try {
      const risposta = await chiediSullOrario(conversazione, dati);
      setMessaggi([...conversazione, { ruolo: 'assistant', testo: risposta }]);
    } catch (e) {
      setErrore(messaggioErroreIa(e));
    } finally {
      setInCorso(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center z-[60] p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full my-6 overflow-hidden text-left flex flex-col">
        <div className="bg-brand-50 px-6 py-4 border-b border-brand-100 flex justify-between items-start gap-4">
          <div>
            <h3 className="font-bold text-slate-800">
              💬 Chiedi all&apos;orario
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-lg">
              Domande sull&apos;orario che hai adesso nell&apos;app. I nomi dei
              docenti non escono dal computer: al loro posto vanno delle sigle.
            </p>
          </div>
          <button
            onClick={onChiudi}
            className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-3">
          {!pronta && (
            <div className="bg-bruciato-50 border border-bruciato-200 rounded-lg p-3 text-xs text-bruciato-800">
              Le domande sull&apos;orario non sono accese su questo sito.
            </div>
          )}

          {messaggi.length === 0 && pronta && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Per esempio:</p>
              {ESEMPI.map((e) => (
                <button
                  key={e}
                  onClick={() => chiedi(e)}
                  className="block w-full text-left text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg p-2 cursor-pointer"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messaggi.map((m, i) => (
              <div
                key={`m-${i}`}
                className={`text-xs rounded-lg p-3 whitespace-pre-wrap ${
                  m.ruolo === 'user'
                    ? 'bg-brand-50 border border-brand-100 text-slate-700'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                {m.testo}
              </div>
            ))}
            {inCorso && (
              <p className="text-xs text-slate-500 italic">Sto guardando…</p>
            )}
            <div ref={fondo} />
          </div>

          {errore && (
            <div className="bg-fucsia-50 border border-fucsia-200 rounded-lg p-3 text-xs text-fucsia-800">
              {errore}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              chiedi(domanda);
            }}
            className="flex gap-2"
          >
            <input
              value={domanda}
              onChange={(e) => setDomanda(e.target.value)}
              disabled={!pronta || inCorso}
              placeholder="Scrivi la domanda"
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <button
              type="submit"
              disabled={!pronta || inCorso || !domanda.trim()}
              className="bg-fucsia-600 hover:bg-fucsia-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              Chiedi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
