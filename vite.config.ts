import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Gli header di sicurezza veri li mette Vercel, leggendoli da vercel.json.
 * In locale non li metterebbe nessuno, e una Content-Security-Policy sbagliata
 * si scoprirebbe solo in produzione, con le scuole dentro l'app. Qui gli stessi
 * header vengono riletti da quel file e serviti anche da `vite preview`, così
 * la prova in locale vale davvero.
 *
 * Solo `preview` (che serve la build vera) e non `dev`: in sviluppo il
 * ricaricamento a caldo usa una WebSocket verso localhost che la policy
 * bloccherebbe, e le violazioni finte coprirebbero quelle vere.
 */
const headerDiSicurezza = (): Record<string, string> => {
  try {
    const conf = JSON.parse(
      readFileSync(fileURLToPath(new URL('./vercel.json', import.meta.url)), 'utf8')
    ) as { headers?: { headers: { key: string; value: string }[] }[] }
    const elenco = conf.headers?.[0]?.headers ?? []
    return Object.fromEntries(elenco.map((h) => [h.key, h.value]))
  } catch {
    return {}
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    headers: headerDiSicurezza(),
  },
})
