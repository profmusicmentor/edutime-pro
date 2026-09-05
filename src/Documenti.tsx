/**
 * La scheda «Documenti»: i testi che accompagnano l'orario.
 *
 * L'orario finito non basta quasi mai. Va presentato al collegio spiegando con
 * che criteri è stato fatto, va comunicato ai docenti, e quando una classe
 * entra dopo o esce prima va avvisata la famiglia. Sono pagine che si
 * riscrivono ogni anno uguali, il giorno in cui non si ha più voglia di
 * scrivere niente.
 *
 * I numeri li mette l'app: quante classi, quante cattedre, quali vincoli sono
 * stati rispettati, quali sostituzioni sono state assegnate oggi. Le frasi le
 * mette il modello. La persona corregge e copia: da qui non parte niente
 * verso nessuno, e la mail la manda lei dalla casella della scuola.
 */

import { useEffect, useState } from 'react';
import {
  DOCUMENTI,
  documentiDisponibili,
  scaricaDocumento,
  scriviDocumento,
  type DocumentoScritto,
  type TipoDocumento,
} from './documentiIA';
import { messaggioErroreIa } from './iaComune';

interface Props {
  /**
   * Prepara i dati per il documento scelto. La costruisce l'app, che è la
   * sola a sapere cosa c'è dentro l'orario. `perSigla` c'è solo per i
   * documenti in cui i docenti compaiono come sigle e vanno rimessi a nome.
   */
  preparaDati: (tipo: TipoDocumento) => {
    dati: string[];
    perSigla?: Map<string, string>;
  };
}

export default function Documenti({ preparaDati }: Props) {
  const [pronta, setPronta] = useState(false);
  const [tipo, setTipo] = useState<TipoDocumento>('relazione-orario');
  const [istituto, setIstituto] = useState('');
  const [richiesta, setRichiesta] = useState('');
  const [consenso, setConsenso] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');
  const [documento, setDocumento] = useState<DocumentoScritto | null>(null);
  const [copiato, setCopiato] = useState(false);

  useEffect(() => {
    let vivo = true;
    documentiDisponibili().then((ok) => {
      if (vivo) setPronta(ok);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const voce = DOCUMENTI.find((d) => d.tipo === tipo) as (typeof DOCUMENTI)[0];

  const scrivi = async () => {
    if (inCorso) return;
    if (voce.conNomi && !consenso) return;
    setErrore('');
    setDocumento(null);
    setInCorso(true);
    try {
      const { dati, perSigla } = preparaDati(tipo);
      const scritto = await scriviDocumento(tipo, dati, {
        richiesta,
        istituto,
        perSigla,
      });
      setDocumento(scritto);
    } catch (e) {
      setErrore(messaggioErroreIa(e));
    } finally {
      setInCorso(false);
    }
  };

  const copia = async () => {
    if (!documento) return;
    try {
      await navigator.clipboard.writeText(documento.testo);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      setErrore(
        'Il browser non mi lascia copiare da solo. Seleziona il testo e copialo a mano.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            📝 Documenti
          </h2>
          <p className="text-sm text-slate-500">
            La relazione per il Dirigente, le circolari e gli avvisi, scritti a
            partire dai dati che hai nell&apos;app. Il testo resta qui: si
            legge, si corregge e si copia.
          </p>
        </div>

        {!pronta && (
          <div className="bg-bruciato-50 border border-bruciato-200 rounded-lg p-3 text-xs text-bruciato-800">
            La scrittura dei documenti non è accesa su questo sito.
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {DOCUMENTI.map((d) => (
            <button
              key={d.tipo}
              onClick={() => {
                setTipo(d.tipo);
                setDocumento(null);
                setErrore('');
              }}
              className={`text-left rounded-xl border p-3 cursor-pointer ${
                d.tipo === tipo
                  ? 'bg-brand-50 border-brand-200'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="block text-sm font-bold text-slate-800">
                {d.nome}
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">
                {d.descrizione}
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-600">
            Istituto (facoltativo)
            <input
              value={istituto}
              onChange={(e) => setIstituto(e.target.value)}
              placeholder="Istituto Comprensivo …"
              className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
          <label className="text-xs text-slate-600">
            Cosa aggiungere (facoltativo)
            <input
              value={richiesta}
              onChange={(e) => setRichiesta(e.target.value)}
              placeholder="Es. l'orario vale dal 16 settembre"
              className="mt-1 w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
        </div>

        {voce.conNomi && (
          <label className="flex items-start gap-2 text-xs text-slate-600 bg-bruciato-50 border border-bruciato-200 rounded-lg p-3">
            <input
              type="checkbox"
              checked={consenso}
              onChange={(e) => setConsenso(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Questo documento contiene i <b>nomi dei docenti</b>, quindi
              vengono mandati alla società che gestisce il modello linguistico
              per scriverlo. Non vengono conservati da EduTime Pro. Negli altri
              documenti i nomi non escono.
            </span>
          </label>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={scrivi}
            disabled={!pronta || inCorso || (voce.conNomi && !consenso)}
            className="bg-fucsia-600 hover:bg-fucsia-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            {inCorso ? 'Sto scrivendo…' : `Scrivi: ${voce.nome}`}
          </button>
        </div>

        {errore && (
          <div className="bg-fucsia-50 border border-fucsia-200 rounded-lg p-3 text-xs text-fucsia-800">
            {errore}
          </div>
        )}

        {documento && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-800">
                {documento.titolo}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={copia}
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-lg cursor-pointer"
                >
                  {copiato ? 'Copiato' : 'Copia'}
                </button>
                <button
                  onClick={() =>
                    scaricaDocumento(
                      documento.titolo.replace(/[^\p{L}\p{N} -]/gu, '').trim() ||
                        voce.nome,
                      documento.testo
                    )
                  }
                  className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-lg cursor-pointer"
                >
                  Scarica
                </button>
              </div>
            </div>
            <textarea
              value={documento.testo}
              onChange={(e) =>
                setDocumento({ ...documento, testo: e.target.value })
              }
              rows={18}
              className="w-full text-xs p-4 focus:outline-none whitespace-pre-wrap"
            />
          </div>
        )}
      </div>
    </div>
  );
}
