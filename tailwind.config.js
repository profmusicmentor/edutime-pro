/** @type {import('tailwindcss').Config} */

// Palette di biscottodigitale.com.
// I valori di riferimento del sito sono:
//   blu-scuro #13233c, blu-medio #195275, giallo-lime #cbd817,
//   verde-salvia #b1c5a4, rosa-fucsia #f24a7f, arancio-bruciato #d8613c.
// Qui sono espansi in scale complete 50-950 perche' il codice usa tutte le
// tonalita' intermedie. Se un valore cambia sul sito, cambialo anche qui.

export default {
  // La modalità notte si accende con la classe `dark` su <html>. Le regole
  // vere stanno in src/index.css; qui si dichiara solo il meccanismo, per chi
  // in futuro volesse usare le varianti `dark:` di Tailwind.
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Colore principale: interfaccia, bottoni, testate. Sostituisce indigo.
        brand: {
          50: '#f2f7fa',
          100: '#e3eef5',
          200: '#c7deed',
          300: '#a0c8e1',
          400: '#65aad5',
          500: '#2b7fb3',
          600: '#195275',
          700: '#14425f',
          800: '#11354b',
          900: '#13233c',
          950: '#0a1a24',
        },
        // Accento vivo: evidenze, ora selezionata, pulsante di richiamo.
        lime: {
          50: '#fbfce9',
          100: '#f6f9c6',
          200: '#edf393',
          300: '#e0ea55',
          400: '#cbd817',
          500: '#b3bf14',
          600: '#8e9910',
          700: '#6b730f',
          800: '#525911',
          900: '#434912',
          950: '#232806',
        },
        // Esito positivo: salvato, nessun conflitto. Sostituisce emerald.
        salvia: {
          50: '#f4f7f3',
          100: '#e8eee5',
          200: '#d4dfce',
          300: '#b1c5a4',
          400: '#90b677',
          500: '#6ea54b',
          600: '#598b39',
          700: '#48722c',
          800: '#3a5c24',
          900: '#2e481e',
          950: '#1c2b12',
        },
        // Attenzione: ore scoperte, avvisi. Sostituisce amber.
        bruciato: {
          50: '#fbf4f1',
          100: '#f7e8e3',
          200: '#f0d2c9',
          300: '#e9b5a5',
          400: '#e08d73',
          500: '#d8613c',
          600: '#c04c28',
          700: '#9a4125',
          800: '#7a3722',
          900: '#5f2d1e',
          950: '#371b12',
        },
        // Errore: conflitti, dati non validi. Sostituisce rose e red.
        fucsia: {
          50: '#fdf2f5',
          100: '#fbe4eb',
          200: '#f8c6d6',
          300: '#f49fba',
          400: '#f2739b',
          500: '#f24a7f',
          600: '#e9205f',
          700: '#bd194d',
          800: '#911a40',
          900: '#6e1934',
          950: '#421020',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        // Playfair Display sta sul sito, non qui: dentro l'app servono tabelle
        // fitte di numeri, e il carattere neutro si legge meglio.
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
