import { useEffect } from 'react';
import Assistente from './Assistente';
import Feedback from './Feedback';
import { chapters, steps } from './guidaContenuti';

/**
 * Guida operativa di EduTime Pro.
 * Pagina statica raggiungibile su /guida.
 */

export default function Guida() {
  useEffect(() => {
    document.title = 'Guida a EduTime Pro';
  }, []);

  // Il browser cerca l'ancora del link (/guida#conflitti) mentre la pagina è
  // ancora vuota, perché i capitoli li disegna React subito dopo: senza questo
  // salto manuale si resta dove capita invece di arrivare al capitolo giusto.
  // Il ripristino automatico della posizione è già spento da main.tsx.
  useEffect(() => {
    // Tolleranza: il capitolo ha già uno stacco dal bordo (scroll-mt-6).
    const saltaAlCapitolo = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const sezione = document.getElementById(id);
      if (!sezione) return;
      if (Math.abs(sezione.getBoundingClientRect().top) > 40) {
        sezione.scrollIntoView({ block: 'start' });
      }
    };

    // Cambio di ancora a pagina già aperta: un salto solo, subito.
    window.addEventListener('hashchange', saltaAlCapitolo);

    let timer = 0;
    let annullato = false;
    const annulla = () => {
      annullato = true;
      window.clearTimeout(timer);
    };

    if (window.location.hash) {
      // Il ripristino della posizione fatto dal browser può arrivare parecchio
      // dopo il primo disegno, quindi in apertura si ricontrolla a intervalli
      // crescenti fino a un secondo e mezzo.
      const attese = [0, 100, 250, 500, 900, 1500];
      let prossima = 0;
      const insisti = () => {
        if (annullato) return;
        saltaAlCapitolo();
        if (prossima < attese.length) {
          const attesa = attese[prossima] - (attese[prossima - 1] ?? 0);
          prossima += 1;
          timer = window.setTimeout(insisti, attesa);
        }
      };
      // Se il lettore scorre di suo, smettiamo subito di inseguire l'ancora.
      ['wheel', 'touchstart', 'keydown'].forEach((evento) =>
        window.addEventListener(evento, annulla, { once: true, passive: true })
      );
      timer = window.setTimeout(insisti, 0);
    }

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('hashchange', saltaAlCapitolo);
      ['wheel', 'touchstart', 'keydown'].forEach((evento) =>
        window.removeEventListener(evento, annulla)
      );
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-950 text-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p className="text-xs font-bold tracking-widest text-indigo-300 uppercase">
            Guida operativa · passo per passo
          </p>
          <h1 className="text-4xl font-bold mt-2">Guida a EduTime Pro</h1>
          <p className="text-indigo-200 mt-3 max-w-2xl">
            Manuale d'uso per la costruzione dell'orario scolastico: come
            muoversi fra le sei schede dell'app, assegnare le cattedre,
            generare l'orario e risolvere i conflitti.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {[
              '6 schede principali',
              'Generazione automatica',
              'Conflitti in tempo reale',
              'Stampa A3 / Excel',
              'Backup .json',
            ].map((t) => (
              <span
                key={t}
                className="text-xs bg-white/10 border border-white/20 rounded-full px-3 py-1"
              >
                {t}
              </span>
            ))}
          </div>
          <a
            href="/"
            className="inline-block mt-8 bg-white text-indigo-800 font-bold px-5 py-2.5 rounded-lg hover:bg-indigo-50"
          >
            ← Torna all'app
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-[220px_1fr] gap-10">
        <nav className="lg:sticky lg:top-6 self-start">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Indice
          </p>
          <ol className="space-y-1.5 text-sm">
            {chapters.map((c) => (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className="text-slate-600 hover:text-indigo-700"
                >
                  <span className="font-mono text-xs text-slate-400 mr-2">
                    {c.num}
                  </span>
                  {c.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-col gap-14 min-w-0">
          {chapters.map((c) => (
            <section key={c.id} id={c.id} className="scroll-mt-6">
              <p className="text-xs font-bold tracking-widest text-indigo-600 uppercase">
                Capitolo {c.num}
              </p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                {c.title}
              </h2>
              <p className="text-slate-600 mt-3 leading-relaxed">{c.intro}</p>

              {c.cards && (
                <div className="grid sm:grid-cols-2 gap-4 mt-6">
                  {c.cards.map((card) => (
                    <div
                      key={card.title}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-bold text-slate-900">
                          {card.title}
                        </h3>
                        {card.tag && (
                          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">
                            {card.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 mt-2 leading-relaxed">
                        {card.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {c.id === 'flusso' && (
                <ol className="mt-6 space-y-4">
                  {steps.map((s, i) => (
                    <li
                      key={s.title}
                      className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex gap-4"
                    >
                      <span className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900">{s.title}</h3>
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                          {s.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              {c.id === 'flusso' && (
                <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-xl p-5 text-sm text-indigo-900">
                  <strong>Iterazione.</strong> È normale ripetere i passi 7-9
                  più volte: dopo ogni rigenerazione i conflitti cambiano.
                  Affina finché la scheda Conflitti non mostra «✅ Nessun
                  conflitto rilevato!».
                </div>
              )}

              {c.note && (
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900">
                  <strong>{c.note.title}.</strong>{' '}
                  <span className="block mt-1">{c.note.body}</span>
                </div>
              )}
            </section>
          ))}

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">In sintesi</h2>
            <p className="text-slate-600 mt-2 leading-relaxed">
              EduTime Pro funziona in modo iterativo: configuri → generi →
              controlli i conflitti → affini → esporti. Non aspettarti un'unica
              generazione perfetta: l'algoritmo propone, il controllo umano
              porta all'orario definitivo.
            </p>
            <a
              href="/"
              className="inline-block mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-lg"
            >
              Apri EduTime Pro →
            </a>
          </section>
        </div>
      </main>

      <footer className="bg-slate-100 border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-500">
        Guida a EduTime Pro · Manuale d'uso per l'orario scolastico ·{' '}
        <a
          href="https://github.com/profmusicmentor/edutime-pro"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-700"
        >
          Codice sorgente (AGPL-3.0)
        </a>{' '}
        • <Feedback />
      </footer>

      <Assistente inGuida />
    </div>
  );
}
