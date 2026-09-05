/**
 * La finestra «Leggi le richieste dei docenti».
 *
 * Si incollano le mail arrivate a giugno e a settembre, tutte insieme, e
 * tornano indietro come spunte: giorno libero, ora bloccata, preferenza per
 * le prime o per le ultime ore. Quello che si guadagna non è solo il tempo:
 * è che a metà pomeriggio, ricopiando la sessantesima richiesta, si smette di
 * leggere davvero, e il vincolo sbagliato lo si scopre a orario generato.
 *
 * Ogni riga porta con sé la frase da cui è stata ricavata, così il controllo
 * si fa guardando, non fidandosi. Le richieste ambigue arrivano segnate e con
 * la spunta spenta: vanno lette da una persona. Le regole cambiano solo
 * quando si preme «Applica», e i vincoli già presenti non vengono toccati.
 *
 * Nel testo delle richieste ci sono i nomi dei docenti e, spesso, il motivo
 * personale: per questo la spunta di consenso è scritta chiara, e il
 * pannello consiglia di incollare solo la parte utile.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  applicaRichieste,
  leggiRichieste,
  letturaRichiesteDisponibile,
  type EsitoRichieste,
  type PersonaNota,
  type RichiestaLetta,
} from './richiesteIA';
import { messaggioErroreIa } from './iaComune';

interface Props {
  docenti: PersonaNota[];
  giorni: string[];
  ore: number;
  regole: Record<string, unknown>;
  onChiudi: () => void;
  onApplica: (regoleNuove: Record<string, unknown>) => void;
}

/** Come si legge una richiesta nell'elenco, in una riga sola. */
const descrivi = (r: RichiestaLetta, giorni: string[]): string => {
  const nome = r.nomeLetto || 'docente';
  if (r.tipo === 'giorno-libero') {
    return `${nome}: libero il ${giorni[r.giorno ?? 0] || 'giorno ' + r.giorno}`;
  }
  if (r.tipo === 'ora-bloccata') {
    return `${nome}: non disponibile ${
      giorni[r.giorno ?? 0] || 'giorno ' + r.giorno
    }, ${(r.ora ?? 0) + 1}ª ora`;
  }
  return `${nome}: preferisce le ${r.preferenza === 'prime' ? 'prime' : 'ultime'} ore`;
};

export default function RichiesteDocenti({
  docenti,
  giorni,
  ore,
  regole,
  onChiudi,
  onApplica,
}: Props) {
  const [pronta, setPronta] = useState(false);
  const [testo, setTesto] = useState('');
  const [consenso, setConsenso] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');
  const [esito, setEsito] = useState<EsitoRichieste | null>(null);
  const [scelti, setScelti] = useState<Set<string>>(new Set());

  useEffect(() => {
    let vivo = true;
    letturaRichiesteDisponibile().then((ok) => {
      if (vivo) setPronta(ok);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const leggi = async () => {
    if (!consenso || testo.trim().length < 20 || inCorso) return;
    setErrore('');
    setEsito(null);
    setInCorso(true);
    try {
      const risultato = await leggiRichieste(testo, {
        docentiNoti: docenti,
        giorni,
        ore,
        regoleAttuali: regole,
      });
      setEsito(risultato);

      // Parte spuntato solo quello su cui non c'è niente da decidere: docente
      // riconosciuto, modello sicuro, vincolo non ancora presente.
      setScelti(
        new Set(
          risultato.richieste
            .filter((r) => r.teacherId && r.sicuro && !r.giaPresente)
            .map((r) => r.rif)
        )
      );

      if (!risultato.richieste.length) {
        setErrore(
          'Non ho trovato richieste da trasformare in vincoli. Prova a incollare il testo delle mail, non i loro allegati.'
        );
      }
    } catch (e) {
      setErrore(messaggioErroreIa(e));
    } finally {
      setInCorso(false);
    }
  };

  const commuta = (rif: string) =>
    setScelti((prec) => {
      const nuovi = new Set(prec);
      if (nuovi.has(rif)) nuovi.delete(rif);
      else nuovi.add(rif);
      return nuovi;
    });

  const applicabili = useMemo(
    () => (esito?.richieste || []).filter((r) => r.teacherId && scelti.has(r.rif)),
    [esito, scelti]
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center z-[60] p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-3xl w-full my-6 overflow-hidden text-left">
        <div className="bg-brand-50 px-6 py-4 border-b border-brand-100 flex justify-between items-start gap-4">
          <div>
            <h3 className="font-bold text-slate-800">
              ✉️ Le richieste dei docenti, scritte a parole
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Incolla le mail o il foglio delle richieste. Tornano indietro
              come vincoli da spuntare, con la frase da cui arrivano.
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
              La lettura delle richieste non è accesa su questo sito. I vincoli
              si mettono a mano dalla scheda «Docenti».
            </div>
          )}

          <textarea
            value={testo}
            onChange={(e) => {
              setTesto(e.target.value);
              setEsito(null);
            }}
            rows={8}
            placeholder="Incolla qui le richieste. Una per riga, o le mail una dopo l'altra."
            className="w-full text-xs border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />

          <label className="flex items-start gap-2 text-xs text-slate-600 bg-bruciato-50 border border-bruciato-200 rounded-lg p-3">
            <input
              type="checkbox"
              checked={consenso}
              onChange={(e) => setConsenso(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Ho capito che questo testo, <b>nomi compresi</b>, viene mandato
              alla società che gestisce il modello linguistico per essere letto.
              Non viene conservato da EduTime Pro. Incolla solo le richieste:
              se una mail contiene certificati, motivi di salute o altri fatti
              personali, toglili prima.
            </span>
          </label>

          <button
            onClick={leggi}
            disabled={!pronta || !consenso || inCorso || testo.trim().length < 20}
            className="bg-fucsia-600 hover:bg-fucsia-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {inCorso ? 'Sto leggendo…' : 'Leggi le richieste'}
          </button>

          {errore && (
            <div className="bg-fucsia-50 border border-fucsia-200 rounded-lg p-3 text-xs text-fucsia-800">
              {errore}
            </div>
          )}

          {esito && esito.richieste.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              {esito.nota && (
                <p className="text-xs text-slate-600">{esito.nota}</p>
              )}

              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {esito.richieste.map((r) => {
                  const bloccata = !r.teacherId;
                  return (
                    <li
                      key={r.rif}
                      className={`text-xs rounded-lg border p-2 ${
                        bloccata
                          ? 'bg-slate-50 border-slate-200 text-slate-500'
                          : r.giaPresente
                          ? 'bg-white border-slate-200 text-slate-600'
                          : r.sicuro
                          ? 'bg-salvia-50 border-salvia-100 text-slate-700'
                          : 'bg-bruciato-50 border-bruciato-200 text-bruciato-800'
                      }`}
                    >
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={scelti.has(r.rif)}
                          disabled={bloccata}
                          onChange={() => commuta(r.rif)}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-bold">
                            {descrivi(r, giorni)}
                          </span>
                          {r.citazione && (
                            <span className="block italic mt-0.5">
                              «{r.citazione}»
                            </span>
                          )}
                          {bloccata && (
                            <span className="block mt-0.5">
                              Questo docente non è nella scheda Docenti: creane
                              la scheda e rifai la lettura.
                            </span>
                          )}
                          {!bloccata && r.giaPresente && (
                            <span className="block mt-0.5">
                              Questo vincolo c&apos;è già.
                            </span>
                          )}
                          {!bloccata && !r.sicuro && (
                            <span className="block mt-0.5">
                              Frase poco chiara: controlla prima di applicarla.
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={() => onApplica(applicaRichieste(regole, applicabili))}
                disabled={applicabili.length === 0}
                className="bg-salvia-600 hover:bg-salvia-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
              >
                Applica {applicabili.length}{' '}
                {applicabili.length === 1 ? 'vincolo' : 'vincoli'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
