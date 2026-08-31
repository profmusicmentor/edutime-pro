import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { cerca, DOMANDE_SUGGERITE } from './guidaIndice';
import {
  chiediInChat,
  MAX_TURNI,
  ErroreLicenza,
  type Messaggio,
} from './assistenteIA';

/**
 * La conversazione con l'assistente IA, per gli abbonati.
 *
 * Vive tutta qui dentro, nello stato del componente: chiusa la scheda o
 * ricaricata la pagina, sparisce. Non tocca né `localStorage` né il cloud.
 * Chi vuole tenerla usa «Scarica»: un file Markdown salvato sul suo computer.
 *
 * Ogni conversazione ha un tetto di {@link MAX_TURNI} domande. Il freno vero è
 * lato server; qui si blocca solo l'invio, per non far premere un pulsante che
 * tanto darebbe errore.
 */

interface Props {
  /** Come in Assistente: nella pagina /guida i link scorrono, non aprono schede. */
  inGuida?: boolean;
  /**
   * Chiamata quando il server rifiuta la chiave di abbonamento a metà
   * conversazione: il pannello riapre il campo per reincollarla.
   */
  onLicenzaRifiutata?: (messaggio: string) => void;
}

export default function AssistenteChat({
  inGuida = false,
  onLicenzaRifiutata,
}: Props) {
  const [conversazione, setConversazione] = useState<Messaggio[]>([]);
  const [bozza, setBozza] = useState('');
  const [inAttesa, setInAttesa] = useState(false);
  const [errore, setErrore] = useState('');
  const [rimaste, setRimaste] = useState<number | null>(null);
  const fondoRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const turni = conversazione.filter((m) => m.ruolo === 'user').length;
  const alLimite = turni >= MAX_TURNI;
  const vuota = conversazione.length === 0;
  const ultimaERisposta =
    conversazione.length > 0 &&
    conversazione[conversazione.length - 1].ruolo === 'assistant';

  // I capitoli-fonte sono quelli che la ricerca locale trova per l'ultima
  // domanda dell'utente: si mostrano sotto la risposta come rimando.
  const ultimaDomanda = useMemo(() => {
    for (let i = conversazione.length - 1; i >= 0; i -= 1) {
      if (conversazione[i].ruolo === 'user') return conversazione[i].testo;
    }
    return '';
  }, [conversazione]);
  const fonti = useMemo(() => cerca(ultimaDomanda), [ultimaDomanda]);

  useEffect(() => {
    fondoRef.current?.scrollIntoView({ block: 'end' });
  }, [conversazione, inAttesa]);

  useEffect(() => {
    if (!alLimite) inputRef.current?.focus();
  }, [alLimite, inAttesa]);

  const invia = async () => {
    const testo = bozza.trim();
    if (!testo || inAttesa || alLimite) return;

    const primaDellInvio = conversazione;
    const conUtente: Messaggio[] = [...conversazione, { ruolo: 'user', testo }];
    setConversazione(conUtente);
    setBozza('');
    setInAttesa(true);
    setErrore('');

    try {
      const esito = await chiediInChat(conUtente, cerca(testo));
      setConversazione([
        ...conUtente,
        { ruolo: 'assistant', testo: esito.risposta },
      ]);
      setRimaste(esito.rimaste);
    } catch (e) {
      const messaggio = e instanceof Error ? e.message : 'Errore imprevisto.';
      setErrore(messaggio);
      // La domanda non ha avuto risposta: si toglie la riga appena messa e si
      // rimette il testo nel campo, così si riprova senza doppioni.
      setConversazione(primaDellInvio);
      setBozza(testo);
      if (e instanceof ErroreLicenza) onLicenzaRifiutata?.(messaggio);
    } finally {
      setInAttesa(false);
    }
  };

  const nuovaConversazione = () => {
    setConversazione([]);
    setBozza('');
    setErrore('');
    setRimaste(null);
  };

  const scarica = () => {
    const righe = conversazione.map(
      (m) => `**${m.ruolo === 'user' ? 'Tu' : 'Assistente'}:**\n${m.testo}`
    );
    const contenuto =
      `# Conversazione con l'assistente di EduTime Pro\n\n` +
      `${new Date().toLocaleString('it-IT')}\n\n` +
      `${righe.join('\n\n')}\n`;
    const blob = new Blob([contenuto], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversazione-assistente-${new Date()
      .toISOString()
      .slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const propsLink = inGuida
    ? {}
    : { target: '_blank', rel: 'noopener noreferrer' };

  const vaiAlCapitolo = (
    e: MouseEvent<HTMLAnchorElement>,
    capitoloId: string
  ) => {
    if (!inGuida) return;
    const sezione = document.getElementById(capitoloId);
    if (!sezione) return;
    e.preventDefault();
    sezione.scrollIntoView({ block: 'start' });
    window.history.replaceState(null, '', `#${capitoloId}`);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
        {vuota && (
          <>
            <p className="text-xs text-slate-500">
              Fai una domanda sull'uso di EduTime Pro. L'assistente risponde
              leggendo la guida e puoi incalzarlo fino a {MAX_TURNI} volte.
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              {DOMANDE_SUGGERITE.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setBozza(d)}
                  className="text-xs bg-slate-100 hover:bg-brand-50 hover:text-brand-800 border border-slate-200 rounded-full px-3 py-1.5 text-left"
                >
                  {d}
                </button>
              ))}
            </div>
          </>
        )}

        {conversazione.map((m, i) => (
          <div
            key={i}
            className={
              m.ruolo === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[92%]'
            }
          >
            <div
              className={
                m.ruolo === 'user'
                  ? 'bg-brand-600 text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm whitespace-pre-wrap'
                  : 'bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed'
              }
            >
              {m.testo}
            </div>
          </div>
        ))}

        {inAttesa && (
          <div className="self-start bg-slate-100 text-slate-500 rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
            Sto leggendo la guida…
          </div>
        )}

        {!inAttesa && ultimaERisposta && fonti.length > 0 && (
          <div className="self-stretch mt-1">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
              Dai capitoli
            </p>
            <div className="flex flex-col gap-1">
              {fonti.map((r) => (
                <a
                  key={r.voce.id}
                  href={`/guida#${r.voce.capitoloId}`}
                  {...propsLink}
                  onClick={(e) => vaiAlCapitolo(e, r.voce.capitoloId)}
                  className="text-xs text-brand-700 hover:text-brand-900 underline"
                >
                  Capitolo {r.voce.capitoloNum} · {r.voce.capitoloTitolo}
                </a>
              ))}
            </div>
          </div>
        )}

        {!vuota && (
          <div className="self-stretch flex items-center justify-between gap-2 pt-1">
            <span className="text-[10px] text-slate-400">
              {alLimite
                ? 'Conversazione al limite'
                : `Domanda ${turni} di ${MAX_TURNI}`}
              {rimaste !== null && !alLimite ? ` · ${rimaste} oggi` : ''}
            </span>
            <div className="flex gap-3 shrink-0">
              <button
                type="button"
                onClick={scarica}
                className="text-[10px] text-slate-500 underline"
              >
                Scarica
              </button>
              <button
                type="button"
                onClick={nuovaConversazione}
                className="text-[10px] text-brand-700 font-semibold underline"
              >
                Nuova conversazione
              </button>
            </div>
          </div>
        )}

        <div ref={fondoRef} />
      </div>

      <div className="border-t border-slate-200 p-3 shrink-0">
        {errore && (
          <p className="text-xs text-fucsia-600 mb-2 leading-snug">{errore}</p>
        )}

        {alLimite ? (
          <button
            type="button"
            onClick={nuovaConversazione}
            className="w-full text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-2"
          >
            Comincia una nuova conversazione
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={bozza}
              onChange={(e) => setBozza(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') invia();
              }}
              placeholder="Scrivi la tua domanda…"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={invia}
              disabled={!bozza.trim() || inAttesa}
              className="text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-4 py-2 disabled:opacity-50 shrink-0"
            >
              Invia
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
