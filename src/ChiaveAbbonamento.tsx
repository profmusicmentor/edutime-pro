/**
 * La finestra dove si incolla la chiave dell'abbonamento EduTime Pro AI.
 *
 * Prima la chiave si metteva solo dentro il pannello dell'assistente, in fondo
 * alla Guida, e quel campo compariva soltanto se anche l'assistente della
 * guida era a pagamento. Da quando le funzioni con l'IA sono sette e
 * l'assistente è rimasto gratuito, quel campo non si vedeva più: chi comprava
 * l'abbonamento riceveva una chiave e non trovava dove metterla. Questa
 * finestra è la sua casa, e si apre dal pulsante «🔑 Abbonamento IA» in alto.
 *
 * Cosa fa la chiave: si collega a questo dispositivo (LemonSqueezy registra
 * un'istanza e tiene il conto di quante ne esistono), e da quel momento le
 * funzioni con l'IA rispondono. «Togli la chiave» libera il posto, così lo si
 * può usare su un altro computer senza passare dal negozio.
 */

import { useEffect, useState } from 'react';
import {
  collegaLicenza,
  scollegaLicenza,
  leggiLicenza,
  leggiIstanza,
  LINK_ABBONAMENTO,
  PREZZO_ABBONAMENTO,
} from './assistenteIA';

interface Props {
  onChiudi: () => void;
  /** Si chiama quando la chiave viene collegata o tolta, per aggiornare la barra. */
  onCambiata?: () => void;
}

export default function ChiaveAbbonamento({ onChiudi, onCambiata }: Props) {
  const [licenza, setLicenza] = useState(() => leggiLicenza());
  const [bozza, setBozza] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [avviso, setAvviso] = useState('');
  const [fatto, setFatto] = useState('');

  const collegata = licenza.length > 0 && Boolean(leggiIstanza());

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onChiudi]);

  /**
   * Collega la chiave a questo dispositivo. Non basta salvarla nel browser:
   * il negozio deve registrarla, ed è lì che si scopre se è buona.
   */
  const attiva = async () => {
    const pulita = bozza.trim();
    if (!pulita || inCorso) return;
    setInCorso(true);
    setAvviso('');
    setFatto('');
    try {
      // Cambio di chiave: prima si libera il posto della vecchia, altrimenti
      // resta occupato su un abbonamento che qui non si userà più.
      if (licenza && licenza !== pulita) {
        await scollegaLicenza();
        setLicenza('');
      }
      await collegaLicenza(pulita);
      setLicenza(pulita);
      setBozza('');
      setFatto('Chiave collegata. Le funzioni con l’IA sono accese.');
      onCambiata?.();
    } catch (e) {
      setAvviso(
        e instanceof Error
          ? e.message
          : 'Non sono riuscito a collegare la chiave. Riprova fra poco.'
      );
    } finally {
      setInCorso(false);
    }
  };

  const togli = async () => {
    if (inCorso) return;
    setInCorso(true);
    setFatto('');
    try {
      await scollegaLicenza();
    } finally {
      setLicenza('');
      setBozza('');
      setAvviso('');
      setFatto('Chiave tolta da questo dispositivo. Il posto è di nuovo libero.');
      setInCorso(false);
      onCambiata?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center z-[70] p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full my-6 overflow-hidden text-left">
        <div className="bg-brand-50 px-6 py-4 border-b border-brand-100 flex justify-between items-start gap-4">
          <div>
            <h3 className="font-bold text-slate-800">
              🔑 Abbonamento EduTime Pro AI
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {collegata
                ? 'Le funzioni con l’intelligenza artificiale sono accese su questo dispositivo.'
                : 'Qui si incolla la chiave che hai ricevuto dopo l’acquisto.'}
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
          <div
            className={`rounded-xl border p-3 text-xs ${
              collegata
                ? 'bg-salvia-50 border-salvia-200 text-salvia-800'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            {collegata ? (
              <>
                <b>Abbonamento attivo.</b> La chiave è collegata a questo
                dispositivo e finisce per <b>{licenza.slice(-6)}</b>.
              </>
            ) : (
              <>
                <b>Nessuna chiave su questo dispositivo.</b> L’app funziona lo
                stesso: orario, sostituzioni, conflitti, stampe ed Excel restano
                gratuiti e senza limiti.
              </>
            )}
          </div>

          <label className="block text-xs text-slate-600">
            {collegata ? 'Cambia la chiave' : 'La tua chiave'}
            <input
              value={bozza}
              onChange={(e) => setBozza(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') attiva();
              }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              spellCheck={false}
              autoComplete="off"
              className="mt-1 w-full text-sm font-mono border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>

          {avviso && (
            <div className="bg-fucsia-50 border border-fucsia-200 rounded-lg p-3 text-xs text-fucsia-800">
              {avviso}
            </div>
          )}
          {fatto && (
            <div className="bg-salvia-50 border border-salvia-200 rounded-lg p-3 text-xs text-salvia-800">
              {fatto}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={attiva}
              disabled={inCorso || !bozza.trim()}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {inCorso ? 'Sto collegando…' : 'Attiva'}
            </button>
            {collegata && (
              <button
                onClick={togli}
                disabled={inCorso}
                className="bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-600 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer"
                title="Libera il posto per usarla su un altro computer"
              >
                Togli la chiave da questo dispositivo
              </button>
            )}
          </div>

          {!collegata && (
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <p className="text-xs text-slate-600">
                Non ce l’hai ancora? L’abbonamento accende le sette funzioni con
                l’intelligenza artificiale: i sostituti proposti la mattina
                dell’assenza, l’orario importato da un PDF, le richieste dei
                colleghi trasformate in vincoli, i documenti già scritti.
              </p>
              <a
                href={LINK_ABBONAMENTO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-fucsia-600 hover:bg-fucsia-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm"
              >
                Attiva l’abbonamento · {PREZZO_ABBONAMENTO}
              </a>
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed">
            La chiave resta su questo computer e non viene mai mostrata a
            nessun altro. La stessa chiave vale su più dispositivi: quando i
            posti finiscono, apri EduTime Pro sul computer che non usi più e
            premi «Togli la chiave da questo dispositivo».
          </p>
        </div>
      </div>
    </div>
  );
}
