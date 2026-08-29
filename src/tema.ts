/**
 * Modalità chiara e modalità notte.
 *
 * La scelta vive in due posti: la classe `dark` su <html>, che accende le
 * regole scritte in `index.css`, e una riga in localStorage, perché al
 * rientro nell'app il tema sia già quello di prima.
 *
 * Chi non ha mai scelto niente si prende l'impostazione del suo computer
 * (`prefers-color-scheme`): chi tiene il Mac o Windows in scuro trova l'app
 * già scura, senza dover cercare il pulsante.
 *
 * La prima applicazione non avviene qui ma in uno script dentro `index.html`,
 * che gira prima che la pagina si disegni: altrimenti si vedrebbe un lampo
 * bianco a ogni apertura. Questo file serve al pulsante nella testata e
 * ripete la stessa logica, così le due parti non possono divergere.
 */

export type Tema = 'chiaro' | 'scuro';

export const CHIAVE_TEMA = 'eduTime_tema';

/** Il colore della barra del browser sul telefono, tema per tema. */
const COLORE_BARRA: Record<Tema, string> = {
  chiaro: '#13233c',
  scuro: '#0b1220',
};

/** Il tema da usare all'avvio: quello salvato, altrimenti quello del sistema. */
export function temaIniziale(): Tema {
  try {
    const salvato = localStorage.getItem(CHIAVE_TEMA);
    if (salvato === 'chiaro' || salvato === 'scuro') return salvato;
  } catch {
    // Navigazione in incognito o cookie bloccati: si tira dritto col sistema.
  }
  const preferenzaSistema =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return preferenzaSistema ? 'scuro' : 'chiaro';
}

/** Accende o spegne la modalità notte e si ricorda la scelta. */
export function applicaTema(tema: Tema): void {
  document.documentElement.classList.toggle('dark', tema === 'scuro');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', COLORE_BARRA[tema]);

  try {
    localStorage.setItem(CHIAVE_TEMA, tema);
  } catch {
    // Se non si può salvare pazienza: il tema vale per questa visita.
  }
}
