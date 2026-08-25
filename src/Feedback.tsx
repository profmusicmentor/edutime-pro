import { useEffect, useRef, useState, type FormEvent } from 'react';

/**
 * Pulsante «Segnala un bug o un suggerimento».
 *
 * Manda il messaggio a /api/feedback (funzione Vercel), che lo gira a Brevo
 * come contatto nella lista dedicata: niente credenziali nel bundle del
 * browser, la chiave Brevo resta lato server.
 *
 * Si può allegare uno screenshot, scegliendolo o incollandolo con Ctrl+V.
 * L'immagine viene rimpicciolita qui nel browser prima di partire: un
 * ritaglio di schermo pesa qualche mega e il corpo della richiesta non lo
 * reggerebbe.
 */

/** Lato lungo massimo dello screenshot, in pixel. */
const LATO_MAX = 1600;
/** Qualità del JPEG: sotto questa soglia il testo dello schermo si sgrana. */
const QUALITA_JPEG = 0.82;
/** Tetto del file scelto, prima della riduzione. */
const PESO_MAX_BYTE = 12 * 1024 * 1024;

/**
 * Riduce un'immagine e la restituisce come JPEG in base64 (senza il
 * prefisso `data:`). Null se il file non è un'immagine leggibile.
 */
const riduciImmagine = (file: File): Promise<string | null> =>
  new Promise((risolvi) => {
    const lettore = new FileReader();
    lettore.onerror = () => risolvi(null);
    lettore.onload = () => {
      const img = new Image();
      img.onerror = () => risolvi(null);
      img.onload = () => {
        const scala = Math.min(1, LATO_MAX / Math.max(img.width, img.height));
        const tela = document.createElement('canvas');
        tela.width = Math.max(1, Math.round(img.width * scala));
        tela.height = Math.max(1, Math.round(img.height * scala));
        const ctx = tela.getContext('2d');
        if (!ctx) {
          risolvi(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tela.width, tela.height);
        ctx.drawImage(img, 0, 0, tela.width, tela.height);
        const dataUrl = tela.toDataURL('image/jpeg', QUALITA_JPEG);
        const virgola = dataUrl.indexOf(',');
        risolvi(virgola > 0 ? dataUrl.slice(virgola + 1) : null);
      };
      img.src = String(lettore.result);
    };
    lettore.readAsDataURL(file);
  });

type Stato = 'idle' | 'inviando' | 'inviato' | 'errore';

export default function Feedback() {
  const [aperto, setAperto] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [email, setEmail] = useState('');
  const [tranello, setTranello] = useState('');
  const [stato, setStato] = useState<Stato>('idle');
  /** Screenshot allegato: anteprima da mostrare e JPEG in base64 da spedire. */
  const [anteprima, setAnteprima] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [nomeScreenshot, setNomeScreenshot] = useState('');
  const [erroreFile, setErroreFile] = useState('');
  const [caricando, setCaricando] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  /**
   * Istante in cui il modulo si è aperto. Il server lo usa insieme al campo
   * esca: solo un invio in un lampo tradisce il bot, perché l'autofill del
   * browser riempie l'esca anche a chi sta scrivendo davvero.
   */
  const apertoDa = useRef(0);

  const apri = () => {
    apertoDa.current = Date.now();
    setAperto(true);
  };

  const togliScreenshot = () => {
    setAnteprima('');
    setScreenshot('');
    setNomeScreenshot('');
    setErroreFile('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const chiudi = () => {
    setAperto(false);
    setStato('idle');
    setMessaggio('');
    setEmail('');
    togliScreenshot();
  };

  /** Prende un file (scelto o incollato) e lo prepara per l'invio. */
  const prendiFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErroreFile('Si possono allegare solo immagini.');
      return;
    }
    if (file.size > PESO_MAX_BYTE) {
      setErroreFile('Immagine troppo grande: massimo 12 MB.');
      return;
    }
    setErroreFile('');
    setCaricando(true);
    const base64 = await riduciImmagine(file);
    setCaricando(false);
    if (!base64) {
      setErroreFile('Non sono riuscito a leggere questa immagine.');
      return;
    }
    setScreenshot(base64);
    setAnteprima(`data:image/jpeg;base64,${base64}`);
    // l'allegato parte sempre in JPEG: il nome deve dirlo, altrimenti chi
    // riceve la mail vede un .png che il visualizzatore non apre.
    const base = (file.name || 'screenshot').replace(/\.[^.]+$/, '');
    setNomeScreenshot(`${base || 'screenshot'}.jpg`);
  };

  /** Con il modulo aperto, Ctrl+V incolla direttamente uno screenshot. */
  useEffect(() => {
    if (!aperto || stato === 'inviato') return;
    const suIncolla = (evento: ClipboardEvent) => {
      const elementi = evento.clipboardData?.items;
      if (!elementi) return;
      for (const elemento of Array.from(elementi)) {
        if (elemento.type.startsWith('image/')) {
          const file = elemento.getAsFile();
          if (file) {
            evento.preventDefault();
            void prendiFile(file);
          }
          return;
        }
      }
    };
    window.addEventListener('paste', suIncolla);
    return () => window.removeEventListener('paste', suIncolla);
    // prendiFile usa solo setter di stato, stabili fra un render e l'altro
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperto, stato]);

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
          msDaApertura: apertoDa.current ? Date.now() - apertoDa.current : -1,
          screenshot: screenshot
            ? { name: nomeScreenshot, data: screenshot }
            : undefined,
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
        onClick={apri}
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
                  posso e la metto nell'elenco delle prossime modifiche. Se
                  serve, allega uno screenshot.
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

                <div>
                  <span className="block text-xs font-semibold text-slate-600 mb-1">
                    Screenshot (facoltativo)
                  </span>
                  {anteprima ? (
                    <div className="flex items-start gap-3">
                      <img
                        src={anteprima}
                        alt="Anteprima dello screenshot allegato"
                        className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                      />
                      <div className="text-xs text-slate-500 flex-1">
                        <p className="break-all">{nomeScreenshot}</p>
                        <button
                          type="button"
                          onClick={togliScreenshot}
                          className="mt-1 text-red-600 hover:underline font-semibold cursor-pointer"
                        >
                          Togli l'immagine
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={fileRef}
                        id="feedback-screenshot"
                        type="file"
                        accept="image/*"
                        onChange={(evento) =>
                          void prendiFile(evento.target.files?.[0])
                        }
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        {caricando
                          ? 'Sto preparando l\u2019immagine...'
                          : 'Oppure fai la foto dello schermo e incollala qui con Ctrl+V (Cmd+V sul Mac).'}
                      </p>
                    </>
                  )}
                  {erroreFile && (
                    <p className="text-xs text-red-600 mt-1">{erroreFile}</p>
                  )}
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
                  disabled={
                    stato === 'inviando' ||
                    caricando ||
                    messaggio.trim().length < 3
                  }
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
