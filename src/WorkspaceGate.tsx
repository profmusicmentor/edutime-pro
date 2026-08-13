import { useState } from 'react';
import {
  buildCode,
  normalizeCode,
  shareUrl,
  type Workspace,
} from './workspace';

interface Props {
  /** codice arrivato da un link di invito (?scuola=...) */
  invitedCode: string | null;
  onChoose: (ws: Workspace, importedData?: any) => void;
}

const CARD =
  'bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4';

export default function WorkspaceGate({ invitedCode, onChoose }: Props) {
  const [localName, setLocalName] = useState('');
  const [cloudName, setCloudName] = useState('');
  const [joinCode, setJoinCode] = useState(invitedCode || '');
  const [importError, setImportError] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const startLocal = (data?: any) => {
    onChoose(
      {
        mode: 'locale',
        code: 'locale',
        label: localName.trim() || 'La mia scuola',
      },
      data
    );
  };

  const createCloud = () => {
    const code = buildCode(cloudName || 'scuola');
    setCreatedCode(code);
  };

  const enterCreatedCloud = () => {
    if (!createdCode) return;
    onChoose({
      mode: 'cloud',
      code: createdCode,
      label: cloudName.trim() || 'La mia scuola',
    });
  };

  const joinCloud = () => {
    const code = normalizeCode(joinCode);
    if (!code) return;
    onChoose({ mode: 'cloud', code, label: cloudName.trim() || 'Scuola' });
  };

  const handleImport = (file: File) => {
    setImportError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || typeof data !== 'object') throw new Error('formato');
        startLocal(data);
      } catch {
        setImportError('File non valido: serve un backup .json di EduTime Pro.');
      }
    };
    reader.onerror = () => setImportError('Impossibile leggere il file.');
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      <header className="bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-950 text-white px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <svg
                className="w-8 h-8 text-indigo-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">EduTime Pro</h1>
              <p className="text-sm text-indigo-200">
                Costruisci l'orario scolastico della tua scuola
              </p>
            </div>
          </div>
          <a
            href="/guida"
            className="self-start md:self-auto px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-semibold"
          >
            📘 Leggi la guida
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
        {invitedCode && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div>
              <p className="font-bold text-indigo-900">
                Hai ricevuto un invito a un orario condiviso
              </p>
              <p className="text-sm text-indigo-700">
                Codice scuola:{' '}
                <code className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200">
                  {invitedCode}
                </code>
              </p>
            </div>
            <button
              onClick={() =>
                onChoose({
                  mode: 'cloud',
                  code: invitedCode,
                  label: 'Scuola condivisa',
                })
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-lg"
            >
              Apri l'orario condiviso →
            </button>
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Come vuoi lavorare?
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Puoi cambiare idea in qualsiasi momento: dall'app puoi scaricare un
            backup e ricaricarlo nell'altra modalità.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ------------------------------------------------ modalità locale */}
          <section className={CARD}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">💻</span>
              <h3 className="text-lg font-bold">Solo su questo computer</h3>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                CONSIGLIATO
              </span>
            </div>
            <p className="text-sm text-slate-600">
              I dati restano nel browser di questo dispositivo. Nessun dato
              viene inviato in rete: la scelta più semplice e più prudente se
              lavori da solo. Ricordati di scaricare ogni tanto il backup.
            </p>
            <label className="text-sm font-semibold text-slate-700">
              Nome della scuola (facoltativo)
              <input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="Es. IC Giovanni Pascoli"
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-normal"
              />
            </label>
            <button
              onClick={() => startLocal()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg"
            >
              Inizia con i dati di esempio →
            </button>
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700">
                Hai già un backup?
              </p>
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                }}
                className="mt-2 w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-semibold"
              />
              {importError && (
                <p className="text-xs text-rose-600 mt-1">{importError}</p>
              )}
            </div>
          </section>

          {/* -------------------------------------------------- modalità cloud */}
          <section className={CARD}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">☁️</span>
              <h3 className="text-lg font-bold">Collabora online</h3>
            </div>
            <p className="text-sm text-slate-600">
              L'orario viene salvato su un database condiviso (Firebase) e più
              persone possono modificarlo insieme in tempo reale. Ogni scuola ha
              il proprio <strong>codice scuola</strong>, che funziona come una
              password: chi lo conosce vede e modifica i dati.
            </p>

            {createdCode ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-sm font-semibold text-slate-700">
                  Ecco il codice della tua scuola. Conservalo: serve per
                  rientrare e per invitare i colleghi.
                </p>
                <code className="font-mono text-sm bg-white border border-slate-300 rounded px-3 py-2 break-all">
                  {createdCode}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(shareUrl(createdCode))
                      .then(() => setCopied(true))
                      .catch(() => setCopied(false));
                  }}
                  className="text-xs font-semibold text-indigo-700 hover:underline self-start"
                >
                  {copied ? '✅ Link copiato' : '🔗 Copia il link di invito'}
                </button>
                <button
                  onClick={enterCreatedCloud}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg"
                >
                  Entra nell'orario condiviso →
                </button>
              </div>
            ) : (
              <>
                <label className="text-sm font-semibold text-slate-700">
                  Nome della scuola
                  <input
                    value={cloudName}
                    onChange={(e) => setCloudName(e.target.value)}
                    placeholder="Es. IC Giovanni Pascoli"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-normal"
                  />
                </label>
                <button
                  onClick={createCloud}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg"
                >
                  Crea un nuovo orario condiviso
                </button>
              </>
            )}

            <div className="border-t border-slate-200 pt-4 flex flex-col gap-2">
              <p className="text-sm font-semibold text-slate-700">
                Oppure entra con un codice esistente
              </p>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="codice-scuola-xxxx-xxxx"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                />
                <button
                  onClick={joinCloud}
                  disabled={!normalizeCode(joinCode)}
                  className="bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                >
                  Entra
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
          <strong>Nota sulla privacy.</strong> In modalità condivisa i dati
          (nomi dei docenti, classi, orari) vengono salvati su un database in
          cloud accessibile a chiunque conosca il codice scuola. Non inserire
          dati personali diversi da nome e cognome dei docenti. Se hai dubbi,
          usa la modalità «solo su questo computer».
        </div>
      </main>

      <footer className="bg-slate-100 border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        EduTime Pro • Gestione dell'orario scolastico •{' '}
        <a href="/guida" className="underline hover:text-slate-700">
          Guida all'uso
        </a>
      </footer>
    </div>
  );
}
