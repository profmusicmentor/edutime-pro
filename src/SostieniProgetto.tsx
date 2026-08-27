import { useState } from 'react';

/**
 * Pannello «Sostieni il progetto».
 *
 * Raccoglie in un punto solo i modi per dare una mano all'app, invece di
 * mettere un pulsante di acquisto nel piè di pagina: EduTime Pro è uno
 * strumento di lavoro e deve continuare a sembrarlo. Il caffè resta una delle
 * voci, non l'unica richiesta.
 */

const LINK_APP = 'https://biscottodigitale.com/app/edutime-pro/';

interface VoceProps {
  emoji: string;
  titolo: string;
  testo: string;
  azione: string;
  href?: string;
  onClick?: () => void;
}

function Voce({ emoji, titolo, testo, azione, href, onClick }: VoceProps) {
  const classi =
    'w-full flex items-center gap-3 text-left border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 rounded-xl px-4 py-3 transition-all cursor-pointer';

  const contenuto = (
    <>
      <span className="text-xl leading-none shrink-0">{emoji}</span>
      <span className="min-w-0">
        <span className="block font-semibold text-slate-800">{titolo}</span>
        <span className="block text-xs text-slate-500">{testo}</span>
      </span>
      <span className="ml-auto shrink-0 text-xs font-semibold text-brand-700 whitespace-nowrap">
        {azione}
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classi}
      >
        {contenuto}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classi}>
      {contenuto}
    </button>
  );
}

export default function SostieniProgetto() {
  const [aperto, setAperto] = useState(false);
  const [copiato, setCopiato] = useState(false);

  const copiaLink = async () => {
    try {
      await navigator.clipboard.writeText(LINK_APP);
      setCopiato(true);
      window.setTimeout(() => setCopiato(false), 2500);
    } catch {
      // Contesti senza clipboard (o senza permesso): lo diamo da copiare a mano.
      window.prompt("Copia il link dell'app:", LINK_APP);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="underline hover:text-slate-700 cursor-pointer"
      >
        💛 Sostieni il progetto
      </button>

      {aperto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden text-left">
            <div className="bg-brand-50 px-6 py-4 border-b border-brand-100 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-slate-800">
                  💛 Sostieni il progetto
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  EduTime Pro è gratuita e la mantengo da solo, la sera, dopo le
                  lezioni. Se ti è utile, ecco quattro modi per darmi una mano.
                  Sono tutti facoltativi: l'app resta identica anche se chiudi
                  qui.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAperto(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none cursor-pointer"
                aria-label="Chiudi"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-2">
              <Voce
                emoji="👕"
                titolo="Prendi un gadget Nerd Approach"
                testo="Magliette, felpe e tazze con illustrazioni su scuola, musica e cultura nerd."
                azione="Vedi i design"
                href="https://linktr.ee/NerdApproach"
              />
              <Voce
                emoji="✉️"
                titolo="Iscriviti alla newsletter"
                testo="Una mail ogni tanto su scuola, musica e strumenti digitali. È gratis."
                azione="Iscriviti"
                href="https://biscottodigitale.com/newsletter/"
              />
              <Voce
                emoji="🔗"
                titolo="Consiglia l'app a un collega"
                testo="Il modo che aiuta di più, e non costa niente."
                azione={copiato ? 'Copiato ✓' : 'Copia il link'}
                onClick={copiaLink}
              />
              <Voce
                emoji="☕"
                titolo="Offrimi un caffè"
                testo="Una donazione una tantum su PayPal, senza nessun obbligo."
                azione="Offri un caffè"
                href="https://paypal.me/delfino0087"
              />
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setAperto(false)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 rounded-lg transition-all cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
