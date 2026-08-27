import { useState } from 'react';
import SostieniProgetto from './SostieniProgetto';
import {
  buildCode,
  codeFromInviteText,
  looksLikeUrl,
  MIN_CODE_LENGTH,
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
  const [joinError, setJoinError] = useState('');
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

  /**
   * Capita che al posto del nome della scuola venga incollato il link di
   * invito ricevuto da un collega: in quel caso creare un orario nuovo è
   * quasi sempre l'opposto di quello che serve, quindi si propone di
   * entrare in quello esistente.
   */
  const cloudNameIsLink = looksLikeUrl(cloudName);
  const cloudNameCode = codeFromInviteText(cloudName);
  const joinCodeFromLink = codeFromInviteText(joinCode);
  const effectiveJoinCode = joinCodeFromLink || normalizeCode(joinCode);

  const openSharedWorkspace = (code: string) => {
    setJoinError('');
    onChoose({ mode: 'cloud', code, label: 'Scuola condivisa' });
  };

  const createCloud = () => {
    if (cloudNameIsLink) return;
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
    const code = effectiveJoinCode;
    if (!code) return;
    if (code.length < MIN_CODE_LENGTH) {
      setJoinError(
        `Il codice scuola deve avere almeno ${MIN_CODE_LENGTH} caratteri: ricopialo esattamente come te l'hanno passato.`
      );
      return;
    }
    setJoinError('');
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
      <header className="bg-gradient-to-r from-brand-700 via-brand-800 to-brand-950 text-white px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              {/* Marchio EduTime Pro: tre caselle d'orario e il cerchio del tempo. */}
              <svg
                className="w-8 h-8"
                viewBox="0 0 48 48"
                role="img"
                aria-label="EduTime Pro"
              >
                <rect x="0" y="0" width="21" height="21" rx="5" fill="#b1c5a4" />
                <circle cx="37.5" cy="10.5" r="10.5" fill="#cbd817" />
                <rect x="0" y="27" width="21" height="21" rx="5" fill="#f8f9fa" />
                <rect x="27" y="27" width="21" height="21" rx="5" fill="#b1c5a4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">EduTime Pro</h1>
              <p className="text-sm text-brand-200">
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
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div>
              <p className="font-bold text-brand-900">
                Hai ricevuto un invito a un orario condiviso
              </p>
              <p className="text-sm text-brand-700">
                Codice scuola:{' '}
                <code className="font-mono bg-white px-2 py-0.5 rounded border border-brand-200">
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
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-5 rounded-lg"
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
              <span className="text-[10px] font-bold bg-salvia-100 text-salvia-700 px-2 py-0.5 rounded">
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
              className="bg-salvia-600 hover:bg-salvia-700 text-white font-bold py-2.5 px-4 rounded-lg"
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
                <p className="text-xs text-fucsia-600 mt-1">{importError}</p>
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
                  className="text-xs font-semibold text-brand-700 hover:underline self-start"
                >
                  {copied ? '✅ Link copiato' : '🔗 Copia il link di invito'}
                </button>
                <button
                  onClick={enterCreatedCloud}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-4 rounded-lg"
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
                {cloudNameIsLink && (
                  <div className="bg-bruciato-50 border border-bruciato-200 rounded-lg p-3 flex flex-col gap-2 text-sm text-bruciato-900">
                    <p>
                      Questo sembra un <strong>link di invito</strong>, non il
                      nome di una scuola. Se te l'ha mandato un collega non
                      creare un orario nuovo: entra in quello che esiste già,
                      altrimenti vi ritrovate con due orari separati.
                    </p>
                    {cloudNameCode ? (
                      <button
                        onClick={() => openSharedWorkspace(cloudNameCode)}
                        className="self-start bg-bruciato-600 hover:bg-bruciato-700 text-white font-bold py-2 px-4 rounded-lg"
                      >
                        Entra nell'orario di questo link →
                      </button>
                    ) : (
                      <p>
                        Nel link non c'è nessun codice scuola: fattelo ripetere
                        dal collega e incollalo qui sotto, in «Oppure entra con
                        un codice esistente».
                      </p>
                    )}
                  </div>
                )}
                <button
                  onClick={createCloud}
                  disabled={cloudNameIsLink}
                  className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-lg"
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
                  disabled={!effectiveJoinCode}
                  className="bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-semibold py-2 px-4 rounded-lg text-sm"
                >
                  Entra
                </button>
              </div>
              {joinCodeFromLink && (
                <p className="text-xs text-slate-600">
                  Hai incollato un link di invito: userò il codice{' '}
                  <code className="font-mono">{joinCodeFromLink}</code>.
                </p>
              )}
              {joinError && (
                <p className="text-xs text-fucsia-600">{joinError}</p>
              )}
            </div>
          </section>
        </div>

        <div className="bg-bruciato-50 border border-bruciato-200 rounded-xl p-4 text-sm text-bruciato-900">
          <strong>Nota sulla privacy.</strong> In modalità condivisa i dati
          (nomi dei docenti, classi, orari) vengono salvati su un database in
          cloud accessibile a chiunque conosca il codice scuola. Non inserire
          dati personali diversi da nome e cognome dei docenti. Se hai dubbi,
          usa la modalità «solo su questo computer».
        </div>
      </main>

      <footer className="bg-slate-100 border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        EduTime Pro • Gestione dell'orario scolastico • Creata da Walter
        Vitale •{' '}
        <a
          href="https://biscottodigitale.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-700"
        >
          biscottodigitale.com
        </a>{' '}
        •{' '}
        <a href="/guida" className="underline hover:text-slate-700">
          Guida all'uso
        </a>{' '}
        •{' '}
        <a
          href="https://github.com/profmusicmentor/edutime-pro"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-700"
        >
          Codice sorgente (AGPL-3.0)
        </a>{' '}
        •{' '}
        <SostieniProgetto />
      </footer>
    </div>
  );
}
