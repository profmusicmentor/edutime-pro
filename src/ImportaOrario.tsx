/**
 * La finestra «Importa l'orario che hai già».
 *
 * Serve il primo giorno, ed è la ragione per cui tanti si fermano prima di
 * cominciare: l'orario dell'anno scorso c'è, ma è in un PDF, e ribatterlo
 * cella per cella prima ancora di sapere se il programma serve non lo fa
 * nessuno. Qui si carica il documento (PDF, TXT, CSV) oppure si incolla la
 * tabella copiata da Excel, e un modello linguistico la rimette in righe.
 *
 * A differenza dell'aiuto sui conflitti, qui i nomi dei docenti escono
 * davvero: sono il dato da estrarre. Per questo la spunta è scritta chiara e
 * il pulsante resta spento finché non la si mette.
 *
 * Si importano solo le righe in cui il docente è stato riconosciuto fra
 * quelli già in archivio. Le altre restano elencate qui, con il nome come
 * l'ha letto: chi le vuole crea prima quei docenti nella scheda Docenti e
 * rifà la lettura. È voluto: creare da soli settanta persone lette da un PDF
 * storto è il modo migliore per riempire l'archivio di doppioni.
 */

import { useEffect, useMemo, useState } from 'react';
import { testoDelFile } from './letturaElenchi';
import {
  leggiOrarioDaTesto,
  letturaOrarioDisponibile,
  type EsitoLetturaOrario,
  type PersonaNota,
  type RigaOrarioLetta,
} from './importaOrarioIA';
import { messaggioErroreIa } from './iaComune';

interface Props {
  /** Le classi dell'istituto, come le conosce l'app. */
  classi: string[];
  docenti: PersonaNota[];
  giorni: string[];
  /** Quante ore ha la giornata più lunga della griglia. */
  ore: number;
  onChiudi: () => void;
  onApplica: (righe: RigaOrarioLetta[]) => void;
}

export default function ImportaOrario({
  classi,
  docenti,
  giorni,
  ore,
  onChiudi,
  onApplica,
}: Props) {
  const [pronta, setPronta] = useState(false);
  const [testo, setTesto] = useState('');
  const [nomeFile, setNomeFile] = useState('');
  const [consenso, setConsenso] = useState(false);
  const [inCorso, setInCorso] = useState('');
  const [errore, setErrore] = useState('');
  const [esito, setEsito] = useState<EsitoLetturaOrario | null>(null);

  useEffect(() => {
    let vivo = true;
    letturaOrarioDisponibile().then((ok) => {
      if (vivo) setPronta(ok);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const importabili = useMemo(
    () => (esito?.righe || []).filter((r) => r.teacherId),
    [esito]
  );
  const senzaDocente = useMemo(
    () => (esito?.righe || []).filter((r) => !r.teacherId),
    [esito]
  );

  const scegliFile = async (file: File | undefined) => {
    if (!file) return;
    setErrore('');
    setEsito(null);
    setInCorso('file');
    try {
      const estratto = await testoDelFile(file);
      setTesto(estratto);
      setNomeFile(file.name);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Non riesco ad aprire il file.');
    } finally {
      setInCorso('');
    }
  };

  const leggi = async () => {
    if (!consenso || testo.trim().length < 40) return;
    setErrore('');
    setEsito(null);
    setInCorso('ia');
    try {
      const risultato = await leggiOrarioDaTesto(testo, {
        classiValide: classi,
        docentiNoti: docenti,
        giorni,
        ore,
      });
      setEsito(risultato);
      if (!risultato.righe.length) {
        setErrore(
          'Non sono riuscito a ricavare nessuna riga. Prova a incollare solo la tabella dell’orario, senza le pagine intorno.'
        );
      }
    } catch (e) {
      setErrore(messaggioErroreIa(e));
    } finally {
      setInCorso('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center z-[60] p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-3xl w-full my-6 overflow-hidden text-left">
        <div className="bg-brand-50 px-6 py-4 border-b border-brand-100 flex justify-between items-start gap-4">
          <div>
            <h3 className="font-bold text-slate-800">
              📥 Importa l&apos;orario che hai già
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Carica il PDF dell&apos;orario, oppure aprilo in Excel, seleziona
              le celle, copia e incolla qui sotto. L&apos;orario dell&apos;app
              non cambia finché non premi «Importa».
            </p>
          </div>
          <button
            onClick={onChiudi}
            className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!pronta && (
            <div className="bg-bruciato-50 border border-bruciato-200 rounded-lg p-3 text-xs text-bruciato-800">
              La lettura assistita non è accesa su questo sito. L&apos;orario si
              compila dalla scheda «Orario Generale».
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <label className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer">
              {inCorso === 'file' ? 'Apro il file…' : 'Scegli un file'}
              <input
                type="file"
                accept=".pdf,.txt,.csv"
                className="hidden"
                onChange={(e) => scegliFile(e.target.files?.[0])}
              />
            </label>
            {nomeFile && (
              <span className="text-xs text-slate-500">{nomeFile}</span>
            )}
          </div>

          <textarea
            value={testo}
            onChange={(e) => {
              setTesto(e.target.value);
              setEsito(null);
            }}
            rows={8}
            placeholder="Oppure incolla qui la tabella dell'orario."
            className="w-full text-xs font-mono border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />

          <label className="flex items-start gap-2 text-xs text-slate-600 bg-bruciato-50 border border-bruciato-200 rounded-lg p-3">
            <input
              type="checkbox"
              checked={consenso}
              onChange={(e) => setConsenso(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Ho capito che il testo qui sopra, <b>nomi dei docenti compresi</b>,
              viene mandato alla società che gestisce il modello linguistico per
              essere letto. Non viene conservato da EduTime Pro. Se nel
              documento ci sono dati che non c&apos;entrano con l&apos;orario,
              toglili prima.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={leggi}
              disabled={
                !pronta || !consenso || inCorso !== '' || testo.trim().length < 40
              }
              className="bg-fucsia-600 hover:bg-fucsia-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {inCorso === 'ia' ? 'Sto leggendo…' : 'Leggi l’orario'}
            </button>
          </div>

          {errore && (
            <div className="bg-fucsia-50 border border-fucsia-200 rounded-lg p-3 text-xs text-fucsia-800">
              {errore}
            </div>
          )}

          {esito && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-slate-800">
                {importabili.length}{' '}
                {importabili.length === 1
                  ? 'lezione pronta da importare'
                  : 'lezioni pronte da importare'}
              </p>

              {esito.nota && (
                <p className="text-xs text-slate-600">{esito.nota}</p>
              )}

              {senzaDocente.length > 0 && (
                <details className="text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold">
                    {senzaDocente.length}{' '}
                    {senzaDocente.length === 1
                      ? 'riga senza un docente riconosciuto: non si importa'
                      : 'righe senza un docente riconosciuto: non si importano'}
                  </summary>
                  <p className="mt-2">
                    Questi nomi non risultano nella scheda Docenti. Creali lì e
                    rifai la lettura, oppure inserisci queste ore a mano.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {esito.nomiSconosciuti.map((n, i) => (
                      <li key={`ns-${i}`}>- {n}</li>
                    ))}
                  </ul>
                </details>
              )}

              {esito.scartate.length > 0 && (
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer font-semibold">
                    Righe scartate dall&apos;app: {esito.scartate.length}
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {esito.scartate.slice(0, 30).map((s, i) => (
                      <li key={`sc-${i}`}>
                        {s.riga} - {s.motivo}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="bg-bruciato-50 border border-bruciato-200 rounded-lg p-3 text-xs text-bruciato-800">
                Attenzione: importando, le lezioni che hai adesso nelle stesse
                caselle vengono sostituite.
              </div>

              <button
                onClick={() => onApplica(importabili)}
                disabled={importabili.length === 0}
                className="bg-salvia-600 hover:bg-salvia-700 disabled:opacity-40 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer disabled:cursor-not-allowed"
              >
                Importa {importabili.length}{' '}
                {importabili.length === 1 ? 'lezione' : 'lezioni'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
