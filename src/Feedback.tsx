import { useState, type FormEvent } from 'react';

/**
 * Pulsante «Segnala un bug o un suggerimento».
 *
 * Manda il messaggio a /api/feedback (funzione Vercel), che lo gira a Brevo
 * come contatto nella lista dedicata: niente credenziali nel bundle del
 * browser, la chiave Brevo resta lato server.
 */

type Stato = 'idle' | 'inviando' | 'inviato' | 'errore';

export default function Feedback() {
  const [aperto, setAperto] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [email, setEmail] = useState('');
  const [tranello, setTranello] = useState('');
  const [stato, setStato] = useState<Stato>('idle');

  const chiudi = () => {
    setAperto(false);
    setStato('idle');
    setMessaggio('');
    setEmail('');
  };

  const invia = async (evento: FormEvent) => {
    evento.preventDefault();
    if (messaggio.trim().length < 3) return;

    setStato('inviando');
    try {
      const risposta = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messaggio.trim(),
          email: email.trim(),
          pagina: window.location.pathname,
          honeypot: tranello,
        }),
      });
      if (!risposta.ok) throw new Error('invio fallito');
      setStato('inviato');
    } catch {
      setStato('errore');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="underline hover:text-slate-700 cursor-pointer"
      >
        🐞 Segnala un bug o un suggerimento
      </button>

      {aperto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden text-left">
            <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-slate-800">
                  🐞 Scrivimi
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Un bug, una cosa poco chiara, un'idea: la leggo io appena
                  posso e la metto nell'elenco delle prossime modifiche.
                </p>
              </div>
              <button
                type="button"
                onClick={chiudi}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none cursor-pointer"
                aria-label="Chiudi"
              >
                &times;
              </button>
            </div>

            {stato === 'inviato' ? (
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-700">
                  Grazie, l'ho ricevuto! Se hai lasciato la tua email ti
                  scrivo quando è sistemato.
                </p>
                <button
                  type="button"
                  onClick={chiudi}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            ) : (
              <form onSubmit={invia} className="p-6 space-y-3">
                <div>
                  <label
                    htmlFor="feedback-messaggio"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    Cosa vuoi segnalarmi?
                  </label>
                  <textarea
                    id="feedback-messaggio"
                    required
                    minLength={3}
                    maxLength={4000}
                    rows={4}
                    value={messaggio}
                    onChange={(evento) => setMessaggio(evento.target.value)}
                    placeholder="Es: nella stampa PDF le ore del sabato si sovrappongono..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                <div>
                  <label
                    htmlFor="feedback-email"
                    className="block text-xs font-semibold text-slate-600 mb-1"
                  >
                    La tua email (facoltativa, solo se vuoi una risposta)
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(evento) => setEmail(evento.target.value)}
                    placeholder="nome@provider.it"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                {/*
                  Campo esca per i bot: resta vuoto per un utente vero.
                  Gli attributi data-* servono a tenere lontani i gestori di
                  password (1Password, LastPass, Dashlane) e la compilazione
                  automatica del browser, che riempiono anche gli input
                  nascosti e facevano finire le segnalazioni vere fra lo spam.
                */}
                <input
                  type="text"
                  name="edutime-campo-tecnico"
                  value={tranello}
                  onChange={(evento) => setTranello(evento.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore
                  data-bwignore
                  data-form-type="other"
                  className="absolute -left-[9999px] w-px h-px opacity-0"
                  aria-hidden="true"
                />

                {stato === 'errore' && (
                  <p className="text-xs text-red-600">
                    Non sono riuscito a inviarlo. Riprova tra un minuto.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={stato === 'inviando' || messaggio.trim().length < 3}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-all cursor-pointer"
                >
                  {stato === 'inviando' ? 'Invio...' : 'Invia'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
