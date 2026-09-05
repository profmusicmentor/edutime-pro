import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { cerca, DOMANDE_SUGGERITE, NUMERO_CAPITOLI } from './guidaIndice';
import Feedback from './Feedback';
import AssistenteChat from './AssistenteChat';
import {
  statoIA,
  leggiLicenza,
  leggiIstanza,
  collegaLicenza,
  scollegaLicenza,
  MAX_TURNI,
  LINK_ABBONAMENTO,
  PREZZO_ABBONAMENTO,
  type StatoIA,
} from './assistenteIA';

/*
 * Il link del checkout e il prezzo stanno in `assistenteIA.ts`: li usa anche
 * il riquadro delle novità, e un indirizzo scritto in due posti è un
 * indirizzo che prima o poi resta vecchio in uno dei due.
 */

/**
 * Quanti dispositivi può collegare una chiave. Il numero che conta davvero è
 * quello impostato sul prodotto in LemonSqueezy, che è anche quello che
 * rifiuta le attivazioni di troppo: questo serve solo a scriverlo nel
 * pannello, e va tenuto uguale a quello del negozio.
 */
const MAX_DISPOSITIVI = 3;

/**
 * Fino a questa data la chat è aperta a tutti: il server ha
 * ASSISTENTE_RICHIEDE_LICENZA spento e chiunque può provarla. La striscia qui
 * sotto lo dice, perché una prova che non si sa di avere non fa comprare
 * niente. Quando l'interruttore si accende, `serveLicenza` diventa vero, la
 * striscia sparisce da sola e al suo posto arriva il pannello della chiave.
 */
const FINE_PROVA = '5 settembre';

/**
 * Assistente della guida: pannello di aiuto in basso a destra.
 *
 * Base gratuita per tutti: una ricerca fra i capitoli della guida che gira
 * interamente nel browser, senza modelli linguistici né rete.
 *
 * Per gli abbonati (o quando ASSISTENTE_RICHIEDE_LICENZA è spento) il pannello
 * diventa una conversazione con un modello linguistico: vedi `AssistenteChat`.
 * Senza endpoint configurato sul server, resta la sola ricerca.
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

  const [ia, setIa] = useState<StatoIA | null>(null);

  // La chiave di abbonamento vive su questo browser. Il campo per incollarla
  // compare quando il server la chiede e non ce n'è una, quando l'utente vuole
  // cambiarla, o quando il server l'ha rifiutata a metà conversazione.
  const [licenza, setLicenza] = useState(() => leggiLicenza());
  const [bozzaLicenza, setBozzaLicenza] = useState('');
  const [campoLicenzaAperto, setCampoLicenzaAperto] = useState(false);
  const [avvisoLicenza, setAvvisoLicenza] = useState('');
  /** Vero mentre si parla col negozio per collegare o scollegare la chiave. */
  const [licenzaInCorso, setLicenzaInCorso] = useState(false);

  const iaAttiva = Boolean(ia?.disponibile);
  const serveLicenza = Boolean(ia?.richiedeLicenza);
  const haLicenza = licenza.length > 0;
  const mostraCampoLicenza =
    serveLicenza && (campoLicenzaAperto || !haLicenza);
  const modalitaChat = iaAttiva && !mostraCampoLicenza;

  const chiudiCampoLicenza = () => {
    setBozzaLicenza('');
    setCampoLicenzaAperto(false);
    setAvvisoLicenza('');
  };

  /**
   * Collega la chiave a questo dispositivo. Non basta più salvarla nel
   * browser: il negozio registra l'attivazione e conta i dispositivi, quindi
   * qui si aspetta la sua risposta e, se dice di no, si mostra il perché
   * (chiave sbagliata, abbonamento scaduto, troppi dispositivi).
   */
  const attivaLicenza = async () => {
    const pulita = bozzaLicenza.trim();
    if (!pulita || licenzaInCorso) return;

    // Stessa chiave e collegamento ancora buono: non si rifà l'attivazione,
    // altrimenti si occuperebbe un secondo posto per niente.
    if (pulita === licenza && leggiIstanza()) {
      chiudiCampoLicenza();
      return;
    }

    setLicenzaInCorso(true);
    setAvvisoLicenza('');
    try {
      // Cambio di chiave: prima si libera il posto della vecchia, così non
      // resta occupato su un abbonamento che qui non si userà più. Da quel
      // momento il browser non ha più nessuna chiave, e lo stato lo deve dire:
      // se la nuova viene rifiutata, il pannello non può restare a dire
      // «abbonamento attivo» con dietro il vuoto.
      if (licenza && licenza !== pulita) {
        await scollegaLicenza();
        setLicenza('');
      }
      await collegaLicenza(pulita);
      setLicenza(pulita);
      chiudiCampoLicenza();
    } catch (e) {
      setAvvisoLicenza(
        e instanceof Error
          ? e.message
          : 'Non sono riuscito a collegare la chiave. Riprova fra poco.'
      );
    } finally {
      setLicenzaInCorso(false);
    }
  };

  /** Toglie la chiave da questo dispositivo e libera il posto nel negozio. */
  const togliLicenza = async () => {
    if (licenzaInCorso) return;
    setLicenzaInCorso(true);
    try {
      await scollegaLicenza();
    } finally {
      setLicenza('');
      setBozzaLicenza('');
      setAvvisoLicenza(
        'Chiave tolta da questo dispositivo. Il posto è di nuovo libero.'
      );
      setLicenzaInCorso(false);
    }
  };

  const apriCampoLicenza = () => {
    setBozzaLicenza(licenza);
    setCampoLicenzaAperto(true);
  };

  // Si chiede al server se l'assistente IA è acceso solo quando qualcuno apre
  // davvero il pannello, e una volta sola per visita.
  useEffect(() => {
    if (!aperto || ia) return;
    let vivo = true;
    statoIA().then((stato) => {
      if (vivo) setIa(stato);
    });
    return () => {
      vivo = false;
    };
  }, [aperto, ia]);

  useEffect(() => {
    if (aperto && !modalitaChat) inputRef.current?.focus();
  }, [aperto, modalitaChat]);

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
    e: MouseEvent<HTMLAnchorElement>,
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
      className="fixed bottom-5 right-5 left-5 sm:left-auto z-50 print:hidden w-auto sm:w-[400px] h-[75vh] max-h-[560px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="bg-gradient-to-r from-brand-700 via-brand-800 to-brand-950 text-white px-4 py-3 flex items-start justify-between gap-3 shrink-0">
        <div>
          <p className="font-bold text-sm">Assistente della guida</p>
          <p className="text-[11px] text-brand-200 mt-0.5">
            {modalitaChat
              ? `Conversa sull'uso dell'app · ${NUMERO_CAPITOLI} capitoli`
              : `Cerca fra i ${NUMERO_CAPITOLI} capitoli · tutto nel tuo browser`}
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

      {modalitaChat ? (
        <>
          {!serveLicenza && (
            <div className="shrink-0 bg-brand-50 border-b border-brand-200 px-3 py-2 flex items-center gap-2">
              <p className="text-[11px] text-slate-700 leading-snug flex-1">
                ✨ <strong className="text-brand-800">Prova gratuita</strong>{' '}
                fino al {FINE_PROVA}. Poi la chat con l'assistente è per gli
                abbonati: {PREZZO_ABBONAMENTO}. La ricerca nei capitoli resta
                gratis per sempre.
              </p>
              <a
                href={LINK_ABBONAMENTO}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[11px] font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-2"
              >
                Abbonati
              </a>
            </div>
          )}
          <AssistenteChat
            inGuida={inGuida}
            onLicenzaRifiutata={(messaggio) => {
              setAvvisoLicenza(messaggio);
              apriCampoLicenza();
            }}
          />
        </>
      ) : (
        <>
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

          <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
            {iaAttiva && mostraCampoLicenza && (
              <div className="border border-brand-200 bg-brand-50 rounded-xl p-3">
                <p className="text-sm font-bold text-brand-800">
                  ✨ La chat con l'assistente è per gli abbonati
                </p>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  La ricerca nei capitoli qui sotto resta gratis e senza limiti.
                  Con l'abbonamento annuale ({PREZZO_ABBONAMENTO}) puoi anche
                  fare domande a parole tue e ricevere una risposta scritta, in
                  una conversazione fino a {MAX_TURNI} domande.
                </p>
                {avvisoLicenza && (
                  <p className="text-xs text-fucsia-600 mt-2">{avvisoLicenza}</p>
                )}
                <input
                  type="text"
                  value={bozzaLicenza}
                  onChange={(e) => setBozzaLicenza(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void attivaLicenza();
                  }}
                  disabled={licenzaInCorso}
                  placeholder="Incolla qui la chiave di abbonamento"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100"
                />
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  La stessa chiave vale su {MAX_DISPOSITIVI} dispositivi (per
                  esempio il computer di scuola e quello di casa). Quando ne
                  cambi uno, togli prima la chiave da quello vecchio: il posto
                  torna libero subito.
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => void attivaLicenza()}
                    className="flex-1 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-2 disabled:opacity-50"
                    disabled={!bozzaLicenza.trim() || licenzaInCorso}
                  >
                    {licenzaInCorso ? 'Controllo…' : 'Attiva'}
                  </button>
                  <a
                    href={LINK_ABBONAMENTO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm font-bold text-brand-700 bg-white border border-brand-300 hover:bg-brand-100 rounded-lg px-3 py-2 text-center"
                  >
                    Abbonati
                  </a>
                </div>
                <div className="flex flex-wrap gap-x-3 mt-2">
                  {campoLicenzaAperto && haLicenza && (
                    <button
                      type="button"
                      onClick={chiudiCampoLicenza}
                      className="text-[11px] text-slate-500 underline"
                    >
                      Annulla
                    </button>
                  )}
                  {haLicenza && (
                    <button
                      type="button"
                      onClick={() => void togliLicenza()}
                      disabled={licenzaInCorso}
                      className="text-[11px] text-slate-500 underline disabled:opacity-50"
                    >
                      Togli la chiave da questo dispositivo
                    </button>
                  )}
                </div>
              </div>
            )}

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
        </>
      )}

      <div className="text-[10px] text-slate-400 px-3 py-2 border-t border-slate-200 shrink-0">
        <p>
          {modalitaChat
            ? "Le risposte le scrive un modello linguistico a partire dai capitoli della guida: se qualcosa non torna, fanno fede quelli. La conversazione non viene salvata."
            : iaAttiva
              ? 'La ricerca resta nel tuo browser.'
              : "Risposte prese dalla guida dell'app. Nessun dato inviato in rete."}
        </p>
        <div className="text-slate-500 mt-0.5 flex flex-wrap gap-x-2">
          {serveLicenza && haLicenza && !mostraCampoLicenza && (
            <button
              type="button"
              onClick={apriCampoLicenza}
              className="underline"
            >
              Abbonamento attivo · cambia chiave
            </button>
          )}
          <span>
            Non hai trovato quello che cerchi? <Feedback />
          </span>
        </div>
      </div>
    </div>
  );
}
