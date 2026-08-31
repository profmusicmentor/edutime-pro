/**
 * Ripulisce la domanda dell'utente prima di spedirla al modello linguistico.
 *
 * L'assistente risponde su come si usa EduTime Pro, non sull'orario di una
 * scuola precisa: i nomi delle persone non servono alla risposta e non hanno
 * motivo di uscire dal browser. La ripulitura sta qui, lato server, e non nel
 * client: così vale anche se qualcuno chiama l'endpoint per conto suo.
 *
 * Non è un anonimizzatore perfetto e non pretende di esserlo. Copre i casi
 * che capitano davvero in una domanda scritta di fretta: «il prof. Rossi ha
 * tre buchi», un indirizzo email incollato, un numero di telefono, un codice
 * fiscale. Il resto lo tiene fuori il testo del prompt, che dice al modello
 * di rispondere solo sull'uso dell'app.
 */

/** Un titolo (prof., docente, maestra…) seguito da uno o due nomi propri. */
const TITOLO_PIU_NOME =
  /\b(prof(?:\.ssa|\.|essor[ei]|essoress[ae])?|docent[ei]|maestr[oaei]|sig(?:\.|nor[ae])?|collega|alunn[oaei]|student[ei]|dirigente|preside)\s+((?:[A-ZÀ-Þ][\p{L}'’]+)(?:\s+[A-ZÀ-Þ][\p{L}'’]+)?)/gu;

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/g;

const CODICE_FISCALE = /\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/gi;

/**
 * Sequenze lunghe di cifre, anche spezzate da spazi, punti o trattini.
 * Il conteggio vero delle cifre si fa nel sostitutore: una data scritta per
 * esteso (31-08-2026) ha lo stesso aspetto di un numero di telefono, ma meno
 * cifre di quante ne servano per esserlo.
 */
const CIFRE_LUNGHE = /(?:\+39[\s.-]?)?\b\d[\d\s.-]{7,15}\d\b/g;

const MIN_CIFRE_TELEFONO = 9;

export function anonimizza(testo: string): string {
  return testo
    .replace(EMAIL, '[email]')
    .replace(CODICE_FISCALE, '[codice fiscale]')
    .replace(CIFRE_LUNGHE, (trovato) => {
      const cifre = trovato.replace(/\D/g, '').length;
      return cifre >= MIN_CIFRE_TELEFONO ? '[numero]' : trovato;
    })
    .replace(TITOLO_PIU_NOME, (_intero, titolo: string) => `${titolo} [nome]`);
}
