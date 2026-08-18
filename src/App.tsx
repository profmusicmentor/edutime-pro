import React, { useState, useEffect, useMemo, useRef } from 'react';
import Assistente from './Assistente';
import WorkspaceGate from './WorkspaceGate';
import {
  buildXlsx,
  type XlsxCell,
  type XlsxRow,
  type XlsxSheet,
  type XlsxStyle,
} from './xlsxWriter';
import {
  codeFromUrl,
  forgetWorkspace,
  persistWorkspace,
  readStoredWorkspace,
  shareUrl,
  storeWorkspace,
  subscribeWorkspace,
  syncUrl,
  type CloudStatus,
  type Workspace,
} from './workspace';

const escapeXml = (str: any) => {
  if (!str) return '';
  return str
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const DEPARTMENT_COLORS: Record<string, string> = {
  LETTERE: '#dbeafe',
  'MATEM. SCI.': '#ede9fe',
  MATEMATICA: '#ede9fe',
  SCIENZE: '#ede9fe',
  INGLESE: '#d1fae5',
  SPAGNOLO: '#fef3c7',
  TEDESCO: '#fce7f3',
  FRANCESE: '#e9d5ff',
  TECNOLOGIA: '#ffedd5',
  ARTE: '#fae8ff',
  MUSICA: '#ccfbf1',
  'ED. FISICA': '#dcfce7',
  RELIGIONE: '#fef9c3',
  SOSTEGNO: '#fed7aa',
  CLARINETTO: '#e0e7ff',
  VIOLINO: '#e0e7ff',
  CHITARRA: '#e0e7ff',
  PIANOFORTE: '#e0e7ff',
};
const getDeptColor = (subject: string) =>
  DEPARTMENT_COLORS[subject] || '#f1f5f9';
const DAY_OFF_COLOR = '#fee2e2';
/** Cella di un'ora bloccata: ambra, per distinguerla dal giorno libero. */
const HOUR_OFF_COLOR = '#fef3c7';

/**
 * Anni di corso che una sezione può contenere. Arriva fino al quinto per la
 * scuola primaria: la secondaria di primo grado usa solo i primi tre e le
 * sezioni già configurate restano com'erano.
 */
const SELECTABLE_YEARS = [1, 2, 3, 4, 5];

const DEFAULT_SECTIONS_CONFIG: any = {
  A: { model: 'modelloA', years: [1, 2, 3] },
  B: { model: 'modelloA', years: [1, 2, 3] },
  C: { model: 'modelloB', years: [1, 2, 3] },
  D: { model: 'modelloB', years: [1, 2, 3] },
  E: { model: 'modelloB', years: [1, 2, 3] },
  F: { model: 'modelloB', years: [1, 2, 3] },
  G: { model: 'modelloB', years: [2, 3] },
};
const DEFAULT_RULES: any = {
  globalMaxGapHours: 1,
  /**
   * Tetto di ore in un giorno per un docente. Senza, il generatore riempiva
   * classe per classe partendo dal lunedì e ammassava giornate da 6 ore su
   * quattro giorni. 0 = nessun limite.
   */
  globalMaxHoursPerDay: 5,
  /**
   * Minimo di ore in una giornata di lavoro: dopo la generazione le giornate
   * più corte vengono riassorbite dove il docente è già a scuola.
   * 0 = nessun vincolo.
   */
  globalMinHoursPerDay: 2,
  teacherMaxGapHours: {},
  teacherDaysOff: {},
  /**
   * Indisponibilità della singola ora, per il docente in comune con un altro
   * istituto ("il lunedì può esserci solo dopo le 11"). Mappa id docente →
   * elenco di chiavi "giorno_ora". Affianca teacherDaysOff, che resta il
   * modo di dichiarare un giorno intero.
   */
  teacherHoursOff: {},
};
const DEFAULT_GEN_OPTIONS = { materie: true, sostegno: true, strumento: true };
const DEFAULT_MIXED_CLASSES: any[] = [];
const DEFAULT_SEDI: any[] = [{ id: 'sede-principale', name: 'Sede Principale' }];
/**
 * Le aule/laboratori di default sono risorse condivise da tutte le classi
 * (assegnate per materia, non per sezione): non hanno una sede propria di
 * default, altrimenti il loro sedeId fisso vincerebbe sempre sul fallback
 * "sede della sezione" e il vincolo multi-plesso classico (sezioni intere
 * in edifici diversi) non scatterebbe mai. Chi vuole un laboratorio con una
 * sede fissa (es. un vero laboratorio DADA in un edificio specifico) la
 * imposta esplicitamente dalla Gestione Aule/Laboratori.
 */
const DEFAULT_ROOMS: any[] = [
  { id: 'aula', name: 'Aula', subjects: [] },
  { id: 'palestra', name: 'Palestra', subjects: ['ED. FISICA'] },
  { id: 'lab-musica', name: 'Lab. Musica', subjects: ['MUSICA'] },
  { id: 'lab-tecnologia', name: 'Lab. Tecnologia', subjects: ['TECNOLOGIA'] },
  { id: 'lab-arte', name: 'Lab. Arte', subjects: ['ARTE'] },
  // Attenzione a collegare qui una materia curricolare pesante: l'aula diventa
  // una risorsa unica per tutta la scuola e le sue ore non entrano più
  // nell'orario. Matematica si fa in classe, il laboratorio serve a scienze.
  {
    id: 'lab-scienze',
    name: 'Lab. Scienze',
    subjects: ['SCIENZE'],
  },
];

const DEFAULT_TEACHERS: any[] = [
  {
    id: 't1',
    name: 'PROF. ROSSI',
    subject: 'LETTERE',
    color: '#3b82f6',
    preferConsecutive: true,
    assignments: [
      { classId: '1E', hours: 10 },
      { classId: '1D', hours: 8 },
    ],
  },
  {
    id: 't2',
    name: 'PROF. BIANCHI',
    subject: 'LETTERE',
    color: '#2563eb',
    preferConsecutive: true,
    assignments: [
      { classId: '1B', hours: 4 },
      { classId: '2B', hours: 10 },
      { classId: '3C', hours: 4 },
    ],
  },
  {
    id: 't3',
    name: 'PROF. VERDI',
    subject: 'LETTERE',
    color: '#1d4ed8',
    preferConsecutive: true,
    assignments: [
      { classId: '1F', hours: 10 },
      { classId: '1C', hours: 4 },
      { classId: '3A', hours: 8 },
    ],
  },
  {
    id: 't4',
    name: 'PROF. NERI',
    subject: 'LETTERE',
    color: '#60a5fa',
    preferConsecutive: true,
    assignments: [
      { classId: '1A', hours: 8 },
      { classId: '3C', hours: 6 },
      { classId: '3D', hours: 4 },
    ],
  },
  {
    id: 't5',
    name: 'PROF. RUSSO',
    subject: 'LETTERE',
    color: '#3b82f6',
    preferConsecutive: true,
    assignments: [
      { classId: '1B', hours: 6 },
      { classId: '1A', hours: 2 },
      { classId: '2A', hours: 10 },
    ],
  },
  {
    id: 't6',
    name: 'PROF. FERRARI',
    subject: 'LETTERE',
    color: '#2563eb',
    preferConsecutive: true,
    assignments: [
      { classId: '2E', hours: 8 },
      { classId: '3E', hours: 10 },
    ],
  },
  {
    id: 't7',
    name: 'PROF. ESPOSITO',
    subject: 'LETTERE',
    color: '#1d4ed8',
    preferConsecutive: true,
    assignments: [
      { classId: '1C', hours: 6 },
      { classId: '2C', hours: 10 },
      { classId: '2F', hours: 2 },
    ],
  },
  {
    id: 't8',
    name: 'PROF. ROMANO',
    subject: 'LETTERE',
    color: '#60a5fa',
    preferConsecutive: true,
    assignments: [
      { classId: '2F', hours: 8 },
      { classId: '3F', hours: 10 },
    ],
  },
  {
    id: 't9',
    name: 'PROF. COLOMBO',
    subject: 'LETTERE',
    color: '#3b82f6',
    preferConsecutive: true,
    assignments: [
      { classId: '1G', hours: 10 },
      { classId: '1D', hours: 2 },
      { classId: '2G', hours: 8 },
    ],
  },
  {
    id: 't10',
    name: 'PROF. RICCI',
    subject: 'LETTERE',
    color: '#2563eb',
    preferConsecutive: true,
    assignments: [
      { classId: '2E', hours: 2 },
      { classId: '3B', hours: 10 },
    ],
  },
  {
    id: 't11',
    name: 'PROF. MARINO',
    subject: 'LETTERE',
    color: '#1d4ed8',
    preferConsecutive: true,
    assignments: [{ classId: '2G', hours: 2 }],
  },
  {
    id: 't12',
    name: 'PROF. GRECO',
    subject: 'LETTERE',
    color: '#60a5fa',
    preferConsecutive: true,
    assignments: [
      { classId: '2D', hours: 10 },
      { classId: '3A', hours: 2 },
      { classId: '3D', hours: 6 },
    ],
  },
  {
    id: 't13',
    name: 'PROF. BRUNO',
    subject: 'MATEM. SCI.',
    color: '#a855f7',
    preferConsecutive: true,
    assignments: [
      { classId: '1C', hours: 6 },
      { classId: '1E', hours: 2 },
      { classId: '1A', hours: 10 },
    ],
  },
  {
    id: 't14',
    name: 'PROF. GALLO',
    subject: 'MATEM. SCI.',
    color: '#9333ea',
    preferConsecutive: true,
    assignments: [
      { classId: '1G', hours: 6 },
      { classId: '2G', hours: 6 },
      { classId: '3E', hours: 8 },
    ],
  },
  {
    id: 't15',
    name: 'PROF. CONTI',
    subject: 'MATEM. SCI.',
    color: '#7e22ce',
    preferConsecutive: true,
    assignments: [
      { classId: '1D', hours: 4 },
      { classId: '2D', hours: 6 },
      { classId: '3D', hours: 6 },
    ],
  },
  {
    id: 't16',
    name: 'PROF. DE LUCA',
    subject: 'MATEM. SCI.',
    color: '#c084fc',
    preferConsecutive: true,
    assignments: [
      { classId: '3A', hours: 6 },
      { classId: '2C', hours: 6 },
      { classId: '3C', hours: 6 },
    ],
  },
  {
    id: 't17',
    name: 'PROF. MANCINI',
    subject: 'MATEM. SCI.',
    color: '#a855f7',
    preferConsecutive: true,
    assignments: [
      { classId: '1B', hours: 4 },
      { classId: '1D', hours: 2 },
      { classId: '1E', hours: 4 },
      { classId: '2E', hours: 6 },
      { classId: '1A', hours: 2 },
    ],
  },
  {
    id: 't18',
    name: 'PROF. COSTA',
    subject: 'MATEM. SCI.',
    color: '#9333ea',
    preferConsecutive: true,
    assignments: [
      { classId: '1F', hours: 6 },
      { classId: '2F', hours: 6 },
      { classId: '3F', hours: 6 },
    ],
  },
  {
    id: 't19',
    name: 'PROF. GIORDANO',
    subject: 'MATEM. SCI.',
    color: '#7e22ce',
    preferConsecutive: true,
    assignments: [
      { classId: '1A', hours: 6 },
      { classId: '2A', hours: 6 },
    ],
  },
  {
    id: 't20',
    name: 'PROF. FONTANA',
    subject: 'MATEM. SCI.',
    color: '#c084fc',
    preferConsecutive: true,
    assignments: [
      { classId: '1B', hours: 2 },
      { classId: '2B', hours: 6 },
      { classId: '3B', hours: 6 },
      { classId: '3A', hours: 4 },
    ],
  },
  {
    id: 't21',
    name: 'PROF. SERRA',
    subject: 'INGLESE',
    color: '#10b981',
    assignments: [
      { classId: '3A', hours: 3 },
      { classId: '1F', hours: 3 },
      { classId: '2F', hours: 3 },
      { classId: '3F', hours: 3 },
      { classId: '1G', hours: 3 },
      { classId: '2G', hours: 3 },
    ],
  },
  {
    id: 't22',
    name: 'PROF. SANTORO',
    subject: 'INGLESE',
    color: '#059669',
    assignments: [
      { classId: '1B', hours: 3 },
      { classId: '2B', hours: 3 },
      { classId: '3B', hours: 3 },
      { classId: '1E', hours: 3 },
      { classId: '2E', hours: 3 },
      { classId: '3E', hours: 3 },
    ],
  },
  {
    id: 't23',
    name: 'PROF. MARINI',
    subject: 'INGLESE',
    color: '#047857',
    assignments: [
      { classId: '1C', hours: 3 },
      { classId: '2C', hours: 3 },
      { classId: '3C', hours: 3 },
      { classId: '1D', hours: 3 },
      { classId: '2D', hours: 3 },
      { classId: '3D', hours: 3 },
    ],
  },
  {
    id: 't24',
    name: 'PROF. LOMBARDI',
    subject: 'INGLESE',
    color: '#34d399',
    assignments: [
      { classId: '1A', hours: 3 },
      { classId: '2A', hours: 3 },
    ],
  },
  {
    id: 't25',
    name: 'PROF. BARBIERI',
    subject: 'SPAGNOLO',
    color: '#14b8a6',
    assignments: [
      { classId: '1D', hours: 2 },
      { classId: '1E', hours: 2 },
      { classId: '1F', hours: 2 },
      { classId: '2A', hours: 2 },
      { classId: '2B', hours: 2 },
      { classId: '2E', hours: 2 },
      { classId: '2F', hours: 2 },
      { classId: '2G', hours: 2 },
      { classId: '3A', hours: 2 },
    ],
  },
  {
    id: 't26',
    name: 'PROF. MORETTI',
    subject: 'SPAGNOLO',
    color: '#0d9488',
    assignments: [
      { classId: '1A', hours: 2 },
      { classId: '1B', hours: 2 },
      { classId: '1C', hours: 2 },
      { classId: '1G', hours: 2 },
      { classId: '2C', hours: 2 },
    ],
  },
  {
    id: 't27',
    name: 'PROF. RINALDI',
    subject: 'TEDESCO',
    color: '#0f766e',
    assignments: [
      { classId: '1A', hours: 2 },
      { classId: '1B', hours: 2 },
      { classId: '1D', hours: 2 },
      { classId: '1E', hours: 2 },
    ],
  },
  {
    id: 't28',
    name: 'PROF. CARUSO',
    subject: 'FRANCESE',
    color: '#2dd4bf',
    assignments: [
      { classId: '1A', hours: 2 },
      { classId: '1B', hours: 2 },
      { classId: '1D', hours: 2 },
    ],
  },
  {
    id: 't29',
    name: 'PROF. FERRARA',
    subject: 'TECNOLOGIA',
    color: '#f59e0b',
    assignments: [
      { classId: '1G', hours: 2 },
      { classId: '2G', hours: 2 },
    ],
  },
  {
    id: 't30',
    name: 'PROF. SANTINI',
    subject: 'TECNOLOGIA',
    color: '#d97706',
    assignments: [
      { classId: '1B', hours: 2 },
      { classId: '2B', hours: 2 },
      { classId: '3B', hours: 2 },
      { classId: '1C', hours: 2 },
      { classId: '2C', hours: 2 },
      { classId: '3C', hours: 2 },
      { classId: '1E', hours: 2 },
      { classId: '2E', hours: 2 },
      { classId: '3E', hours: 2 },
    ],
  },
  {
    id: 't31',
    name: 'PROF. PARODI',
    subject: 'TECNOLOGIA',
    color: '#b45309',
    assignments: [
      { classId: '1A', hours: 2 },
      { classId: '2A', hours: 2 },
      { classId: '3A', hours: 2 },
      { classId: '1D', hours: 2 },
      { classId: '2D', hours: 2 },
      { classId: '3D', hours: 2 },
      { classId: '1F', hours: 2 },
      { classId: '2F', hours: 2 },
      { classId: '3F', hours: 2 },
    ],
  },
  {
    id: 't32',
    name: 'PROF. MARTINI',
    subject: 'ARTE',
    color: '#ec4899',
    preferConsecutive: true,
    assignments: [
      { classId: '1A', hours: 2 },
      { classId: '2A', hours: 2 },
      { classId: '3A', hours: 2 },
      { classId: '1D', hours: 2 },
      { classId: '2D', hours: 2 },
      { classId: '3D', hours: 2 },
      { classId: '1F', hours: 2 },
      { classId: '2F', hours: 2 },
      { classId: '3F', hours: 2 },
    ],
  },
  {
    id: 't33',
    name: 'PROF. SARTORI',
    subject: 'ARTE',
    color: '#db2777',
    preferConsecutive: true,
    assignments: [
      { classId: '1B', hours: 2 },
      { classId: '2B', hours: 2 },
      { classId: '3B', hours: 2 },
      { classId: '1E', hours: 2 },
      { classId: '2E', hours: 2 },
      { classId: '3E', hours: 2 },
      { classId: '1G', hours: 2 },
      { classId: '2G', hours: 2 },
      { classId: '1C', hours: 2 },
    ],
  },
  {
    id: 't41',
    name: 'PROF. CATTANEO',
    subject: 'ARTE',
    color: '#be185d',
    preferConsecutive: true,
    assignments: [
      { classId: '2C', hours: 2 },
      { classId: '3C', hours: 2 },
    ],
  },
  {
    id: 't34',
    name: 'PROF. LEONE',
    subject: 'MUSICA',
    color: '#06b6d4',
    assignments: [
      { classId: '1B', hours: 2 },
      { classId: '2B', hours: 2 },
      { classId: '3B', hours: 2 },
      { classId: '1C', hours: 2 },
      { classId: '2C', hours: 2 },
      { classId: '3C', hours: 2 },
      { classId: '1E', hours: 2 },
      { classId: '2E', hours: 2 },
      { classId: '3E', hours: 2 },
    ],
  },
  {
    id: 't35',
    name: 'PROF. LONGO',
    subject: 'MUSICA',
    color: '#0891b2',
    assignments: [
      { classId: '1G', hours: 2 },
      { classId: '2G', hours: 2 },
    ],
  },
  {
    id: 't36',
    name: 'PROF. MARTINELLI',
    subject: 'MUSICA',
    color: '#0e7490',
    assignments: [
      { classId: '1A', hours: 2 },
      { classId: '2A', hours: 2 },
      { classId: '3A', hours: 2 },
      { classId: '1D', hours: 2 },
      { classId: '2D', hours: 2 },
      { classId: '3D', hours: 2 },
      { classId: '1F', hours: 2 },
      { classId: '2F', hours: 2 },
      { classId: '3F', hours: 2 },
    ],
  },
  {
    id: 't37',
    name: 'PROF. GENTILE',
    subject: 'ED. FISICA',
    color: '#84cc16',
    preferConsecutive: true,
    assignments: [
      { classId: '1A', hours: 2 },
      { classId: '2A', hours: 2 },
      { classId: '3A', hours: 2 },
      { classId: '1B', hours: 2 },
      { classId: '2B', hours: 2 },
      { classId: '3B', hours: 2 },
      { classId: '1E', hours: 2 },
      { classId: '2E', hours: 2 },
      { classId: '3E', hours: 2 },
    ],
  },
  {
    id: 't42',
    name: 'PROF. VITALI',
    subject: 'ED. FISICA',
    color: '#65a30d',
    preferConsecutive: true,
    assignments: [
      { classId: '1C', hours: 2 },
      { classId: '2C', hours: 2 },
      { classId: '3C', hours: 2 },
      { classId: '1D', hours: 2 },
      { classId: '2D', hours: 2 },
      { classId: '3D', hours: 2 },
      { classId: '1F', hours: 2 },
      { classId: '2F', hours: 2 },
      { classId: '3F', hours: 2 },
    ],
  },
  {
    id: 't38',
    name: 'PROF. BELLINI',
    subject: 'ED. FISICA',
    color: '#4d7c0f',
    preferConsecutive: true,
    assignments: [
      { classId: '1G', hours: 2 },
      { classId: '2G', hours: 2 },
    ],
  },
  {
    id: 't39',
    name: 'PROF. MESSINA',
    subject: 'RELIGIONE',
    color: '#f43f5e',
    assignments: [
      { classId: '1A', hours: 1 },
      { classId: '3C', hours: 1 },
    ],
  },
  {
    id: 't40',
    name: 'PROF. ORLANDO',
    subject: 'RELIGIONE',
    color: '#e11d48',
    assignments: [
      { classId: '2A', hours: 1 },
      { classId: '3A', hours: 1 },
      { classId: '1B', hours: 1 },
      { classId: '2B', hours: 1 },
      { classId: '3B', hours: 1 },
      { classId: '1D', hours: 1 },
      { classId: '2D', hours: 1 },
      { classId: '3D', hours: 1 },
      { classId: '1E', hours: 1 },
      { classId: '2E', hours: 1 },
      { classId: '3E', hours: 1 },
      { classId: '1F', hours: 1 },
      { classId: '2F', hours: 1 },
      { classId: '3F', hours: 1 },
      { classId: '1G', hours: 1 },
      { classId: '2G', hours: 1 },
      { classId: '1C', hours: 1 },
      { classId: '2C', hours: 1 },
    ],
  },
];
const DEFAULT_SOSTEGNO: any[] = [
  {
    id: 's1',
    name: 'SOSTEGNO 1',
    subject: 'SOSTEGNO',
    color: '#f59e0b',
    assignments: [
      { classId: '1D', hours: 9 },
      { classId: '3F', hours: 9 },
    ],
  },
  {
    id: 's2',
    name: 'SOSTEGNO 2',
    subject: 'SOSTEGNO',
    color: '#f59e0b',
    assignments: [
      { classId: '3A', hours: 9 },
      { classId: '2A', hours: 9 },
    ],
  },
  {
    id: 's3',
    name: 'SOSTEGNO 3',
    subject: 'SOSTEGNO',
    color: '#f59e0b',
    assignments: [{ classId: '3E', hours: 18 }],
  },
  {
    id: 's4',
    name: 'SOSTEGNO 4',
    subject: 'SOSTEGNO',
    color: '#f59e0b',
    assignments: [{ classId: '3E', hours: 18 }],
  },
  {
    id: 's6',
    name: 'SOSTEGNO 6',
    subject: 'SOSTEGNO',
    color: '#f59e0b',
    assignments: [
      { classId: '1C', hours: 9 },
      { classId: '2E', hours: 9 },
    ],
  },
  {
    id: 's5',
    name: 'SOSTEGNO 5',
    subject: 'SOSTEGNO',
    color: '#f59e0b',
    assignments: [{ classId: '2G', hours: 18 }],
  },
  {
    id: 's7',
    name: 'SOSTEGNO 7',
    subject: 'SOSTEGNO',
    color: '#f59e0b',
    assignments: [
      { classId: '2B', hours: 9 },
      { classId: '3C', hours: 9 },
    ],
  },
  {
    id: 's8',
    name: 'SOSTEGNO 8',
    subject: 'SOSTEGNO',
    color: '#f59e0b',
    assignments: [
      { classId: '1A', hours: 6 },
      { classId: '1E', hours: 6 },
      { classId: '3C', hours: 6 },
    ],
  },
  {
    id: 's9',
    name: 'SOSTEGNO 9',
    subject: 'SOSTEGNO',
    color: '#f59e0b',
    assignments: [{ classId: '1C', hours: 12 }],
  },
  {
    id: 's10',
    name: 'SOSTEGNO 10',
    subject: 'SOSTEGNO',
    color: '#f59e0b',
    assignments: [{ classId: '1F', hours: 18 }],
  },
  {
    id: 's11',
    name: 'SOSTEGNO 11',
    subject: 'SOSTEGNO',
    color: '#f59e0b',
    assignments: [{ classId: '3F', hours: 18 }],
  },
  {
    id: 's12',
    name: 'SOSTEGNO 12',
    subject: 'SOSTEGNO',
    color: '#f59e0b',
    assignments: [{ classId: '3D', hours: 18 }],
  },
];
const DEFAULT_STRUMENTO: any[] = [
  {
    id: 'm1',
    name: 'DOCENTE CLARINETTO',
    subject: 'CLARINETTO',
    color: '#0284c7',
    assignments: [],
  },
  {
    id: 'm2',
    name: 'DOCENTE VIOLINO',
    subject: 'VIOLINO',
    color: '#b45309',
    assignments: [],
  },
  {
    id: 'm3',
    name: 'DOCENTE CHITARRA',
    subject: 'CHITARRA',
    color: '#15803d',
    assignments: [],
  },
  {
    id: 'm4',
    name: 'DOCENTE PIANOFORTE',
    subject: 'PIANOFORTE',
    color: '#6d28d9',
    assignments: [],
  },
];
const DAYS = ['LUNEDÌ', 'MARTEDÌ', 'MERCOLEDÌ', 'GIOVEDÌ', 'VENERDÌ', 'SABATO'];
const DAY_INITIALS = ['L', 'Ma', 'Me', 'G', 'V', 'S'];

/**
 * Griglia di un modello orario: quanti giorni, quante ore curricolari al
 * giorno, e se dopo le ore curricolari c'è il rientro pomeridiano.
 *
 * Prima questi numeri erano scritti dentro il generatore, i controlli e le
 * tabelle (5 ore per 6 giorni nel modello A, 6 ore per 5 giorni nel modello
 * B). Adesso sono un dato che la scuola può cambiare, e i valori di partenza
 * sono esattamente quelli di prima: chi non tocca niente non vede differenze.
 */
const DEFAULT_MODEL_GRIDS: Record<
  string,
  { days: number; hours: number; rientro: boolean }
> = {
  modelloA: { days: 6, hours: 5, rientro: true },
  modelloB: { days: 5, hours: 6, rientro: false },
};

/** Limiti di sicurezza dei campi: oltre non si va, sotto non ha senso. */
const GRID_MIN_DAYS = 1;
const GRID_MAX_DAYS = DAYS.length;
const GRID_MIN_HOURS = 1;
const GRID_MAX_HOURS = 12;

/** Righe che un modello occupa nella griglia: ore curricolari più il rientro. */
const gridSlots = (grid: { hours: number; rientro: boolean }) =>
  grid.hours + (grid.rientro ? 1 : 0);

/** Fonde le griglie salvate con quelle di partenza, scartando valori fuori scala. */
const normalizeModelGrids = (saved: any) => {
  const out: Record<string, { days: number; hours: number; rientro: boolean }> =
    { ...DEFAULT_MODEL_GRIDS };
  if (!saved || typeof saved !== 'object') return out;
  Object.entries(saved).forEach(([model, value]: [string, any]) => {
    if (!value || typeof value !== 'object') return;
    const base = out[model] || DEFAULT_MODEL_GRIDS.modelloB;
    out[model] = {
      days: Math.min(
        GRID_MAX_DAYS,
        Math.max(GRID_MIN_DAYS, Number(value.days) || base.days)
      ),
      hours: Math.min(
        GRID_MAX_HOURS,
        Math.max(GRID_MIN_HOURS, Number(value.hours) || base.hours)
      ),
      rientro: value.rientro === undefined ? base.rientro : !!value.rientro,
    };
  });
  return out;
};

/** Da 'AAAA-MM-GG' all'indice giorno usato in `timetable` (0=Lunedì..5=Sabato, -1=Domenica). */
const getDayIndexFromDate = (dateStr: string) => {
  const jsDay = new Date(`${dateStr}T00:00:00`).getDay();
  return jsDay === 0 ? -1 : jsDay - 1;
};
/**
 * Durata di un'ora della griglia quando non è specificata. Le ore create
 * prima di questa funzione non hanno il campo `duration`: valgono 60 minuti,
 * così i conteggi restano identici a prima per le scuole già avviate.
 */
const HOUR_DEFAULT_MINUTES = 60;
/** Durate selezionabili: l'ora piena e la mezz'ora della scuola primaria. */
const HOUR_DURATION_OPTIONS = [60, 30];

/**
 * Monte ore curricolare settimanale atteso per una sezione, quando non è
 * stato impostato: 30 ore, il tempo normale della secondaria di primo grado.
 * È il valore con cui l'app è nata, quindi le scuole già avviate non vedono
 * cambiare i propri avvisi.
 */
const DEFAULT_WEEKLY_HOURS = 30;
/**
 * Valori tipici, offerti come scorciatoia. Non sono un vincolo: l'autonomia
 * scolastica fa variare i monte ore, quindi il campo accetta qualsiasi numero.
 * 24 / 27 / 30 primaria (DPR 89/2009), 30 secondaria tempo normale,
 * 36 tempo prolungato, 40 tempo pieno.
 */
const COMMON_WEEKLY_HOURS = [24, 27, 30, 36, 40];

/** Ore in cifra leggibile: 20 resta "20", 20.5 diventa "20,5". */
const formatHours = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');

const INITIAL_DIURNAL_HOURS = [
  { index: 0, label: '1ª', time: '08:00 - 09:00' },
  { index: 1, label: '2ª', time: '09:00 - 10:00' },
  { index: 2, label: '3ª', time: '10:00 - 11:00' },
  { index: 3, label: '4ª', time: '11:00 - 12:00' },
  { index: 4, label: '5ª', time: '12:00 - 13:00' },
  { index: 5, label: '6ª', time: '13:00 - 14:00' },
];
const INITIAL_AFTERNOON_HOURS = [
  { index: 6, label: '1ªP', time: '13:00 - 14:00' },
  { index: 7, label: '2ªP', time: '14:00 - 15:00' },
  { index: 8, label: '3ªP', time: '15:00 - 16:00' },
  { index: 9, label: '4ªP', time: '16:00 - 17:00' },
  { index: 10, label: '5ªP', time: '17:00 - 18:00' },
  { index: 11, label: '6ªP', time: '18:00 - 19:00' },
];

const getMaxDaysOffForHours = (hours: number) => {
  if (hours >= 18) return 1;
  if (hours >= 12) return 2;
  return 3;
};

/**
 * Quante ore può fare un docente in un giorno. 0 (o assente) = nessun limite.
 */
const maxHoursPerDayFor = (rules: any) => {
  const v = rules?.globalMaxHoursPerDay;
  return v === undefined || v === null ? 5 : v;
};

/**
 * Minimo di ore in una giornata di lavoro: sotto questa soglia il docente
 * verrebbe a scuola per un'ora sola. 0 = nessun vincolo.
 */
const minHoursPerDayFor = (rules: any) => {
  const v = rules?.globalMinHoursPerDay;
  return v === undefined || v === null ? 2 : v;
};

/** Ore già assegnate a un docente in un giorno, sostegno compreso. */
const hoursOfTeacherOnDay = (tt: any[], teacherId: string, day: number) =>
  tt.filter((s) => s.teacherId === teacherId && s.day === day).length;

/**
 * Tetto giornaliero effettivo di un docente: il limite scelto dalla scuola,
 * abbassato alla sua quota giornaliera (ore di cattedra divise per i giorni in
 * cui è a scuola) quando questa è più stretta. È la regola che distribuisce la
 * cattedra invece di ammassarla sui primi giorni della settimana.
 */
const dailyCapFor = (rules: any, idealPerDay: any, teacherId: string) => {
  const rule = maxHoursPerDayFor(rules);
  if (rule <= 0) return 0;
  const ideal = (idealPerDay || {})[teacherId];
  return ideal ? Math.min(rule, ideal) : rule;
};

/** Chiave di una cella di indisponibilità oraria dentro teacherHoursOff. */
const hourOffKey = (day: number, hour: number) => `${day}_${hour}`;

/**
 * Il docente è indisponibile in questa cella? Vale sia per il giorno intero
 * (teacherDaysOff) sia per la singola ora (teacherHoursOff). Il tetto di
 * getMaxDaysOffForHours riguarda solo i giorni interi: le ore singole servono
 * a chi divide la cattedra con un'altra scuola e non vanno contate come
 * giorno libero.
 */
const isTeacherOff = (
  rules: any,
  teacherId: string,
  day: number,
  hour: number
) => {
  if (!teacherId) return false;
  const daysOff = (rules?.teacherDaysOff || {})[teacherId] || [];
  if (daysOff.includes(day)) return true;
  const hoursOff = (rules?.teacherHoursOff || {})[teacherId] || [];
  return hoursOff.includes(hourOffKey(day, hour));
};

/** Il docente ha bloccato almeno un'ora in questo giorno? */
const hasHoursOffOnDay = (rules: any, teacherId: string, day: number) =>
  ((rules?.teacherHoursOff || {})[teacherId] || []).some(
    (k: string) => k.split('_')[0] === String(day)
  );

/**
 * Quante aule di quel tipo ha la scuola: due palestre, tre laboratori di
 * informatica. Finché il campo non c'è vale 1, com'era prima.
 */
const roomCapacity = (roomName: string, rooms: any[]) => {
  const room = (rooms || []).find((r) => r.name === roomName);
  const n = Number(room?.capacity);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

/** L'aula è satura in quella cella? */
const isRoomFull = (
  tt: any[],
  roomName: string,
  day: number,
  hour: number,
  rooms: any[],
  ignoreSlot?: any
) => {
  if (!roomName || roomName === 'Aula' || roomName === 'Classe') return false;
  const used = tt.filter(
    (s) =>
      s !== ignoreSlot &&
      s.room === roomName &&
      s.day === day &&
      s.hour === hour
  ).length;
  return used >= roomCapacity(roomName, rooms);
};

const getRoomForSubject = (subject: string, rooms: any[]) => {
  const match = (rooms || []).find((r) =>
    (r.subjects || []).includes(subject)
  );
  return match ? match.name : 'Aula';
};

/**
 * L'aula va mostrata solo se dice qualcosa: "Aula" e "Classe" sono il
 * default di chi non usa i laboratori, scriverli in ogni cella sarebbe
 * rumore. Chi lavora in DADA ha invece nomi veri e li vuole vedere.
 */
const isNamedRoom = (roomName?: string) =>
  !!roomName && roomName !== 'Aula' && roomName !== 'Classe';

/**
 * Etichetta corta per le celle strette della stampa A3: "Lab. Scienze"
 * diventa "L.SCIEN". Il nome intero non ci sta in una colonna da 6.5pt.
 */
const roomShortLabel = (roomName?: string) => {
  if (!isNamedRoom(roomName)) return '';
  const name = String(roomName);
  const lab = name.match(/^lab\.?\s*(?:di\s+)?(.+)$/i);
  if (lab) return `L.${lab[1].slice(0, 5).toUpperCase()}`;
  return name.slice(0, 7).toUpperCase();
};

const getRoomSede = (roomName: string, rooms: any[]) =>
  (rooms || []).find((r) => r.name === roomName)?.sedeId;

/**
 * Sede di una lezione: priorità all'aula/laboratorio (copre il caso DADA,
 * dove ogni laboratorio ha la sua sede), altrimenti eredita dalla sede
 * configurata sulla sezione della classe (copre il multi-plesso classico,
 * dove è la classe intera ad essere in un edificio diverso).
 */
const getSedeForSlot = (
  slot: { room?: string; classId?: string },
  rooms: any[],
  classesList: any[],
  sectionsCfg: any
) => {
  const roomSede = getRoomSede(slot.room || '', rooms);
  if (roomSede) return roomSede;
  const classObj = classesList.find((c) => c.id === slot.classId);
  const section = classObj ? sectionsCfg[classObj.section] : null;
  return section && typeof section === 'object' ? section.sedeId : undefined;
};

/**
 * Una lezione curricolare appartiene a una coppia di classi abbinate per la
 * seconda lingua? Quelle lezioni hanno un vincolo incrociato fra due classi:
 * la fase di riparazione le lascia stare, sia come ora da recuperare sia come
 * lezione da spostare.
 */
const isMixedLesson = (
  lesson: { subject: string; classId: string },
  mixedClassesList: any[]
) =>
  (mixedClassesList || []).some(
    (m: any) =>
      m.subject === lesson.subject &&
      (m.c1 === lesson.classId || m.c2 === lesson.classId)
  );

/**
 * Vincoli rigidi per piazzare un'ora curricolare in una cella.
 *
 * ATTENZIONE: questi controlli rispecchiano uno per uno i filtri scritti
 * dentro generateTimetable. Se aggiungi o cambi una regola là, cambiala anche
 * qui, altrimenti la fase di riparazione piazza ore che il generatore avrebbe
 * rifiutato. L'unico controllo in più è quello sulla cella della classe già
 * occupata: la riparazione lavora su una griglia piena, il generatore no.
 */
const canPlaceMateriaHard = (
  tt: any[],
  lesson: any,
  classId: string,
  day: number,
  hour: number,
  ctx: any
) => {
  const { rules, rooms, classes: classesList, sectionsConfig: sectionsCfg } = ctx;

  if (isTeacherOff(rules, lesson.teacherId, day, hour)) return false;

  const maxPerDay = dailyCapFor(rules, ctx.idealPerDay, lesson.teacherId);
  if (
    maxPerDay > 0 &&
    hoursOfTeacherOnDay(tt, lesson.teacherId, day) >= maxPerDay
  )
    return false;

  const classCellBusy = tt.some(
    (s) =>
      s.classId === classId &&
      s.day === day &&
      s.hour === hour &&
      s.type !== 'sostegno'
  );
  if (classCellBusy) return false;

  const teacherBusy = tt.some(
    (s) => s.day === day && s.hour === hour && s.teacherId === lesson.teacherId
  );
  if (teacherBusy) return false;

  const sameTeacherToday = tt.filter(
    (s) =>
      s.classId === classId && s.day === day && s.teacherId === lesson.teacherId
  );
  if (sameTeacherToday.length >= 3) return false;

  const room = getRoomForSubject(lesson.subject, rooms);
  if (isRoomFull(tt, room, day, hour, rooms)) return false;

  const sede = getSedeForSlot(
    { room, classId },
    rooms,
    classesList,
    sectionsCfg
  );
  if (sede) {
    const spostamentoSenzaBuco = tt.some(
      (s) =>
        s.teacherId === lesson.teacherId &&
        s.day === day &&
        (s.hour === hour - 1 || s.hour === hour + 1) &&
        getSedeForSlot(s, rooms, classesList, sectionsCfg) &&
        getSedeForSlot(s, rooms, classesList, sectionsCfg) !== sede
    );
    if (spostamentoSenzaBuco) return false;
  }

  const hoursToday = tt.filter(
    (s) => s.teacherId === lesson.teacherId && s.day === day
  ).length;
  if (day > 0) {
    const hoursYesterday = tt.filter(
      (s) => s.teacherId === lesson.teacherId && s.day === day - 1
    ).length;
    if (hoursYesterday + hoursToday + 1 > 10) return false;
  }
  const hoursTomorrow = tt.filter(
    (s) => s.teacherId === lesson.teacherId && s.day === day + 1
  ).length;
  if (hoursToday + hoursTomorrow + 1 > 10) return false;

  return true;
};

/**
 * Punteggio morbido di una collocazione: stessa formula del generatore
 * (buchi, buco lungo, prime ore, ore consecutive), senza il pizzico di
 * casualità, perché qui serve una scelta ripetibile.
 */
const materiaPlacementPenalty = (
  tt: any[],
  lesson: any,
  classId: string,
  day: number,
  hour: number,
  maxGapAllowed: number
) => {
  let penalty = 0;
  const dailyLessons = tt.filter(
    (s) => s.teacherId === lesson.teacherId && s.day === day
  );

  if (dailyLessons.length > 0) {
    const minHour = Math.min(...dailyLessons.map((l) => l.hour), hour);
    const maxHour = Math.max(...dailyLessons.map((l) => l.hour), hour);
    const gaps = maxHour - minHour + 1 - (dailyLessons.length + 1);
    if (gaps > maxGapAllowed) penalty += 50 + gaps * 5;
    else penalty += gaps * 5;

    const dayHours = [...dailyLessons.map((l) => l.hour), hour].sort(
      (a, b) => a - b
    );
    for (let j = 0; j < dayHours.length - 1; j++) {
      if (dayHours[j + 1] - dayHours[j] >= 3) {
        penalty += 9999;
        break;
      }
    }
  } else {
    penalty += hour * 2;
  }

  const sameClassToday = tt.filter(
    (s) =>
      s.teacherId === lesson.teacherId &&
      s.classId === classId &&
      s.day === day
  );
  if (sameClassToday.length > 0) {
    const isAdjacent = sameClassToday.some(
      (s) => Math.abs(s.hour - hour) === 1
    );
    if (lesson.preferConsecutive) penalty += isAdjacent ? -100 : 50;
    else if (isAdjacent) penalty += 30;
  }

  return penalty;
};

/**
 * Fase di riparazione a profondità 1, ispirata al recursive swapping di FET
 * ma fermata al primo livello.
 *
 * Per ogni ora rimasta fuori dalla passata greedy: prima cerca una cella
 * libera; se non ce n'è, prova a sfrattare una lezione già piazzata nella
 * stessa classe e a ricollocarla altrove. Se lo sfrattato non trova casa la
 * mossa viene annullata e la griglia torna esattamente com'era.
 *
 * Non tocca mai le celle bloccate col lucchetto e non sposta le lezioni delle
 * classi abbinate. Ha un tetto di tempo: scaduto quello, le ore che restano
 * finiscono nell'elenco delle mancanti come prima.
 */
const repairUnplacedLessons = (
  tt: any[],
  unplaced: any[],
  ctx: any,
  budgetMs = 2000
) => {
  const deadline = Date.now() + budgetMs;
  const stillMissing: any[] = [];
  let recovered = 0;
  let swaps = 0;

  const maxGapFor = (teacherId: string) =>
    ctx.rules.teacherMaxGapHours &&
    ctx.rules.teacherMaxGapHours[teacherId] !== undefined
      ? ctx.rules.teacherMaxGapHours[teacherId]
      : ctx.rules.globalMaxGapHours || 1;

  const asLesson = (slot: any) => ({
    teacherId: slot.teacherId,
    subject: slot.subject,
    classId: slot.classId,
    preferConsecutive: !!(ctx.teachers || []).find(
      (t: any) => t.id === slot.teacherId
    )?.preferConsecutive,
  });

  const bestFreeCell = (lesson: any, cells: any[], skipCell?: any) => {
    let best: any = null;
    for (const cell of cells) {
      if (skipCell && cell.day === skipCell.day && cell.hour === skipCell.hour)
        continue;
      if (!canPlaceMateriaHard(tt, lesson, lesson.classId, cell.day, cell.hour, ctx))
        continue;
      const penalty = materiaPlacementPenalty(
        tt,
        lesson,
        lesson.classId,
        cell.day,
        cell.hour,
        maxGapFor(lesson.teacherId)
      );
      if (!best || penalty < best.penalty) best = { ...cell, penalty };
    }
    return best;
  };

  const makeSlot = (lesson: any, cell: any) => ({
    classId: lesson.classId,
    day: cell.day,
    hour: cell.hour,
    teacherId: lesson.teacherId,
    subject: lesson.subject,
    type: 'materia',
    room: getRoomForSubject(lesson.subject, ctx.rooms),
  });

  for (const lesson of unplaced) {
    if (Date.now() > deadline || isMixedLesson(lesson, ctx.mixedClasses)) {
      stillMissing.push(lesson);
      continue;
    }

    const cells: any[] = [];
    for (let d = 0; d < lesson.totalDays; d++)
      for (let h = 0; h < lesson.maxHoursPerDay; h++)
        cells.push({ day: d, hour: h });

    const free = bestFreeCell(lesson, cells);
    if (free) {
      tt.push(makeSlot(lesson, free));
      recovered++;
      continue;
    }

    let placed = false;
    for (const cell of cells) {
      if (Date.now() > deadline) break;

      const victimIndex = tt.findIndex(
        (s) =>
          s.classId === lesson.classId &&
          s.day === cell.day &&
          s.hour === cell.hour &&
          s.type === 'materia' &&
          !s.locked
      );
      if (victimIndex === -1) continue;

      const victim = tt[victimIndex];
      if (isMixedLesson(victim, ctx.mixedClasses)) continue;

      tt.splice(victimIndex, 1);
      if (
        !canPlaceMateriaHard(tt, lesson, lesson.classId, cell.day, cell.hour, ctx)
      ) {
        tt.splice(victimIndex, 0, victim);
        continue;
      }

      const newSlot = makeSlot(lesson, cell);
      tt.push(newSlot);

      const home = bestFreeCell(asLesson(victim), cells, cell);
      if (home) {
        tt.push({ ...victim, day: home.day, hour: home.hour });
        recovered++;
        swaps++;
        placed = true;
        break;
      }

      const undoIndex = tt.indexOf(newSlot);
      if (undoIndex !== -1) tt.splice(undoIndex, 1);
      tt.splice(victimIndex, 0, victim);
    }

    if (!placed) stillMissing.push(lesson);
  }

  return { stillMissing, recovered, swaps };
};

/**
 * Cerca una lezione della stessa classe con cui scambiare la cella: la nostra
 * sale nel giorno in cui il docente è già a scuola, quella scende nella cella
 * lasciata libera. Vale solo se entrambe le collocazioni reggono i vincoli
 * rigidi e se lo scambio non regala all'altro docente una giornata sotto il
 * minimo.
 */
const findExchange = (
  tt: any[],
  slot: any,
  lesson: any,
  shortDay: number,
  grid: any,
  teacherId: string,
  minPerDay: number,
  ctx: any
) => {
  const candidates = tt.filter(
    (s) =>
      s.classId === slot.classId &&
      s.type === 'materia' &&
      !s.locked &&
      s.day !== shortDay &&
      s.day < grid.days &&
      s.hour < grid.hours &&
      s.teacherId !== teacherId &&
      !isMixedLesson(s, ctx.mixedClasses) &&
      hoursOfTeacherOnDay(tt, teacherId, s.day) > 0
  );

  const gapFor = (id: string) =>
    ctx.rules.teacherMaxGapHours &&
    ctx.rules.teacherMaxGapHours[id] !== undefined
      ? ctx.rules.teacherMaxGapHours[id]
      : ctx.rules.globalMaxGapHours || 1;

  let best: any = null;

  for (const victim of candidates) {
    // L'altro docente scende nella giornata corta: se lì non ha già abbastanza
    // ore, lo scambio sposterebbe il problema sulle sue spalle.
    const victimHoursOnShortDay = hoursOfTeacherOnDay(
      tt,
      victim.teacherId,
      shortDay
    );
    if (victimHoursOnShortDay > 0 && victimHoursOnShortDay + 1 < minPerDay)
      continue;
    if (victimHoursOnShortDay === 0) continue;

    const index = tt.indexOf(victim);
    tt.splice(index, 1);

    const nostraOk = canPlaceMateriaHard(
      tt,
      lesson,
      slot.classId,
      victim.day,
      victim.hour,
      ctx
    );
    const suaOk =
      nostraOk &&
      canPlaceMateriaHard(
        tt,
        {
          teacherId: victim.teacherId,
          subject: victim.subject,
          classId: victim.classId,
        },
        victim.classId,
        shortDay,
        slot.hour,
        ctx
      );

    // Fra tutti gli scambi possibili si sceglie quello che lascia meno ore
    // buca: consolidare non deve sfilacciare le altre giornate.
    let costo = Infinity;
    if (nostraOk && suaOk) {
      costo =
        materiaPlacementPenalty(
          tt,
          lesson,
          slot.classId,
          victim.day,
          victim.hour,
          gapFor(teacherId)
        ) +
        materiaPlacementPenalty(
          tt,
          {
            teacherId: victim.teacherId,
            subject: victim.subject,
            classId: victim.classId,
          },
          victim.classId,
          shortDay,
          slot.hour,
          gapFor(victim.teacherId)
        );
    }

    tt.splice(index, 0, victim);
    if (costo < Infinity && (!best || costo < best.costo))
      best = { victim, costo };
  }

  return best;
};

/**
 * Terza passata: le giornate spezzate.
 *
 * Distribuire la cattedra sui giorni disponibili lascia qualche coda: il
 * docente si ritrova a venire a scuola per una sola ora. Qui quelle giornate
 * vengono riassorbite, spostando le lezioni in un giorno in cui il docente è
 * già presente. Lo spostamento vale solo se tutte le ore di quella giornata
 * trovano casa: altrimenti si torna indietro e la giornata resta com'era.
 *
 * Il tetto che conta in questa passata è il massimo della scuola, non la quota
 * giornaliera: la quota serve a distribuire, ma non deve impedire di chiudere
 * una giornata da un'ora sola. Celle col lucchetto e classi abbinate restano
 * ferme, come nella riparazione.
 */
const consolidateShortDays = (tt: any[], ctx: any, budgetMs = 1500) => {
  const minPerDay = minHoursPerDayFor(ctx.rules);
  if (minPerDay <= 1) return { moved: 0, shortDaysLeft: 0 };

  const deadline = Date.now() + budgetMs;
  // Senza idealPerDay il tetto torna a essere quello della scuola.
  const relaxedCtx = { ...ctx, idealPerDay: null };
  const maxGapFor = (teacherId: string) =>
    ctx.rules.teacherMaxGapHours &&
    ctx.rules.teacherMaxGapHours[teacherId] !== undefined
      ? ctx.rules.teacherMaxGapHours[teacherId]
      : ctx.rules.globalMaxGapHours || 1;

  let moved = 0;
  let shortDaysLeft = 0;

  const teacherIds = Array.from(
    new Set(tt.filter((s) => s.type === 'materia').map((s) => s.teacherId))
  );

  for (const teacherId of teacherIds) {
    if (Date.now() > deadline) break;

    const daysWorked = Array.from(
      new Set(
        tt.filter((s) => s.teacherId === teacherId).map((s) => s.day)
      )
    ).sort((a, b) => a - b);

    for (const day of daysWorked) {
      if (Date.now() > deadline) break;

      const daySlots = tt.filter(
        (s) => s.teacherId === teacherId && s.day === day
      );
      if (daySlots.length === 0 || daySlots.length >= minPerDay) continue;

      const movable = daySlots.every(
        (s) =>
          s.type === 'materia' &&
          !s.locked &&
          !isMixedLesson(s, ctx.mixedClasses)
      );
      if (!movable) {
        shortDaysLeft++;
        continue;
      }

      // Le lezioni escono dalla griglia: così le celle che liberano tornano
      // disponibili e i controlli non le vedono come occupate.
      const removed = daySlots.map((slot) => ({
        slot,
        index: tt.indexOf(slot),
      }));
      removed
        .sort((a, b) => b.index - a.index)
        .forEach(({ index }) => tt.splice(index, 1));

      const landed: any[] = [];
      const evicted: any[] = [];
      let allPlaced = true;

      for (const { slot } of removed) {
        const grid = ctx.getGrid(slot.classId);
        const lesson = {
          teacherId: slot.teacherId,
          subject: slot.subject,
          classId: slot.classId,
          preferConsecutive: !!(ctx.teachers || []).find(
            (t: any) => t.id === slot.teacherId
          )?.preferConsecutive,
        };

        let best: any = null;
        for (let d = 0; d < grid.days; d++) {
          if (d === day) continue;
          // Solo dove il docente è già a scuola: aprire un'altra giornata
          // corta non risolverebbe niente.
          if (hoursOfTeacherOnDay(tt, teacherId, d) === 0) continue;
          for (let h = 0; h < grid.hours; h++) {
            if (
              !canPlaceMateriaHard(tt, lesson, slot.classId, d, h, relaxedCtx)
            )
              continue;
            const penalty = materiaPlacementPenalty(
              tt,
              lesson,
              slot.classId,
              d,
              h,
              maxGapFor(teacherId)
            );
            if (!best || penalty < best.penalty)
              best = { day: d, hour: h, penalty };
          }
        }

        if (best) {
          const newSlot = { ...slot, day: best.day, hour: best.hour };
          tt.push(newSlot);
          landed.push(newSlot);
          continue;
        }

        // Le classi sono quasi sempre piene: senza celle libere l'unica
        // strada è lo scambio. La lezione prende il posto di un'altra della
        // stessa classe in un giorno buono, e quella scende qui.
        const swap = findExchange(
          tt,
          slot,
          lesson,
          day,
          grid,
          teacherId,
          minPerDay,
          relaxedCtx
        );
        if (!swap) {
          allPlaced = false;
          break;
        }
        const victimIndex = tt.indexOf(swap.victim);
        if (victimIndex !== -1) tt.splice(victimIndex, 1);
        evicted.push(swap.victim);
        const movedLesson = {
          ...slot,
          day: swap.victim.day,
          hour: swap.victim.hour,
        };
        const movedVictim = { ...swap.victim, day, hour: slot.hour };
        tt.push(movedLesson, movedVictim);
        landed.push(movedLesson, movedVictim);
      }

      if (allPlaced) {
        moved += landed.length;
      } else {
        // Annullo tutto: la griglia deve tornare identica a com'era, comprese
        // le lezioni sfrattate per gli scambi.
        landed.forEach((s) => {
          const i = tt.indexOf(s);
          if (i !== -1) tt.splice(i, 1);
        });
        evicted.forEach((s) => tt.push(s));
        removed
          .sort((a, b) => a.index - b.index)
          .forEach(({ slot, index }) => tt.splice(index, 0, slot));
        shortDaysLeft++;
      }
    }
  }

  return { moved, shortDaysLeft };
};

/** Frecce per spostare una riga docente su e giù nel suo elenco. */
const StaffOrderButtons = ({
  index,
  total,
  disabled,
  onMove,
}: {
  index: number;
  total: number;
  disabled?: boolean;
  onMove: (direction: number) => void;
}) => (
  <div className="flex flex-col gap-0.5 shrink-0">
    <button
      onClick={() => onMove(-1)}
      disabled={disabled || index === 0}
      title="Sposta su"
      className="w-5 h-4 leading-none rounded bg-white/70 hover:bg-white text-slate-600 text-[9px] font-bold border border-slate-300 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
    >
      ▲
    </button>
    <button
      onClick={() => onMove(1)}
      disabled={disabled || index === total - 1}
      title="Sposta giù"
      className="w-5 h-4 leading-none rounded bg-white/70 hover:bg-white text-slate-600 text-[9px] font-bold border border-slate-300 transition-all disabled:opacity-25 disabled:cursor-not-allowed"
    >
      ▼
    </button>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('master-view');
  const [sectionsConfig, setSectionsConfig] = useState<any>(
    DEFAULT_SECTIONS_CONFIG
  );
  const [generationRules, setGenerationRules] = useState<any>(DEFAULT_RULES);
  const [generateOptions, setGenerateOptions] =
    useState<any>(DEFAULT_GEN_OPTIONS);
  const [teachers, setTeachers] = useState<any[]>(DEFAULT_TEACHERS);
  const [sostegno, setSostegno] = useState<any[]>(DEFAULT_SOSTEGNO);
  const [strumento, setStrumento] = useState<any[]>(DEFAULT_STRUMENTO);
  const [rooms, setRooms] = useState<any[]>(DEFAULT_ROOMS);
  const [modelGrids, setModelGrids] = useState<any>(DEFAULT_MODEL_GRIDS);
  /**
   * Copia sincrona delle griglie: il salvataggio parte subito dopo la
   * modifica, quando lo stato di React non è ancora aggiornato, e senza
   * questa copia scriverebbe nel cloud i valori vecchi.
   */
  const modelGridsRef = useRef<any>(DEFAULT_MODEL_GRIDS);
  const [sedi, setSedi] = useState<any[]>(DEFAULT_SEDI);
  const [absences, setAbsences] = useState<any[]>([]);
  const [substitutions, setSubstitutions] = useState<any[]>([]);
  /** Ora per cui è aperto l'elenco di chi può anticipare la lezione. */
  const [anticipoPanel, setAnticipoPanel] = useState<any>(null);
  const [substitutionsDate, setSubstitutionsDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [newAbsenceType, setNewAbsenceType] = useState('assenza');
  const [newAbsenceTeacherId, setNewAbsenceTeacherId] = useState('');
  const [newAbsenceClassId, setNewAbsenceClassId] = useState('');
  const [newAbsenceFromHour, setNewAbsenceFromHour] = useState('');
  const [newAbsenceToHour, setNewAbsenceToHour] = useState('');
  const [newAbsenceNote, setNewAbsenceNote] = useState('');
  const [absenceFormError, setAbsenceFormError] = useState('');
  const [timetable, setTimetable] = useState<any[]>([]);
  const [cellNotes, setCellNotes] = useState<any>({});
  const [cattedreSubTab, setCattedreSubTab] = useState('diurne');
  const [diurnalHours, setDiurnalHours] = useState<any[]>(
    INITIAL_DIURNAL_HOURS
  );
  const [afternoonHours, setAfternoonHours] = useState<any[]>(
    INITIAL_AFTERNOON_HOURS
  );
  const [isFullWidth, setIsFullWidth] = useState(true);
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [invitedCode] = useState<string | null>(() => codeFromUrl());
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('connessione');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showWorkspacePanel, setShowWorkspacePanel] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  /**
   * Codice dello spazio di lavoro per cui sono già stati creati i dati
   * iniziali. Serve a non riprovare all'infinito: se il salvataggio del
   * primo documento fallisce (regole di sicurezza, rete), il cloud continua
   * a segnalare "documento assente" e senza questa guardia l'app rientrerebbe
   * in un ciclo di scrittura che azzera lo schermo di continuo.
   */
  const seededCodeRef = useRef<string | null>(null);
  const [viewType, setViewType] = useState('class');
  const [selectedClass, setSelectedClass] = useState('1A');
  const [selectedTeacherId, setSelectedTeacherId] = useState('t1');
  const [selectedSostegnoId, setSelectedSostegnoId] = useState('s1');
  const [selectedStrumentoId, setSelectedStrumentoId] = useState('m1');
  const [selectedDepartment, setSelectedDepartment] = useState('LETTERE');
  const [masterSearch, setMasterSearch] = useState('');
  const [masterHourFilter, setMasterHourFilter] = useState('diurno');
  /** Docente di cui è aperta la griglia delle ore di indisponibilità. */
  const [hoursOffEditorId, setHoursOffEditorId] = useState<string | null>(null);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [newTeacherType, setNewTeacherType] = useState('materia');
  const [newTeacherColor, setNewTeacherColor] = useState('#4f46e5');
  const [newSectionName, setNewSectionName] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomSubjects, setNewRoomSubjects] = useState('');
  const [newSedeName, setNewSedeName] = useState('');
  const [editingCell, setEditingCell] = useState<any>(null);
  const [editingNoteCell, setEditingNoteCell] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [printAlertOpen, setPrintAlertOpen] = useState(false);
  const [sectionActionModal, setSectionActionModal] = useState<any>(null);
  const [conflictModal, setConflictModal] = useState<any>(null);
  const [generationReport, setGenerationReport] = useState<any>(null);
  const [highlightedSlot, setHighlightedSlot] = useState<any>(null);
  const [tempRoom, setTempRoom] = useState('Aula');
  /**
   * L'aula scelta a mano nel modale vince solo se l'utente ha davvero
   * toccato il menu: altrimenti resta il laboratorio legato alla materia,
   * che è quello che si aspetta chi non usa la DADA.
   */
  const [roomTouched, setRoomTouched] = useState(false);
  const [assignModal, setAssignModal] = useState<any>(null);
  const [assignClass, setAssignClass] = useState('');
  const [assignHours, setAssignHours] = useState(1);
  const [groupConstraints, setGroupConstraints] = useState<any[]>([]);
  const [newGroupC1, setNewGroupC1] = useState('');
  const [newGroupC2, setNewGroupC2] = useState('');
  const [newGroupSubj, setNewGroupSubj] = useState('');

  const [mixedClasses, setMixedClasses] = useState<any[]>(
    DEFAULT_MIXED_CLASSES
  );
  const [newMixSubj, setNewMixSubj] = useState('SPAGNOLO');
  const [newMixC1, setNewMixC1] = useState('');
  const [newMixC2, setNewMixC2] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('eduTime_readOnlyMode');
    if (saved === 'true') setReadOnlyMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('eduTime_readOnlyMode', String(readOnlyMode));
  }, [readOnlyMode]);

  useEffect(() => {
    if (editingCell) {
      // L'aula da mostrare è quella della lezione, non quella del sostegno
      // che sta nella stessa cella (e che sta sempre in classe).
      const cellSlots = timetable.filter(
        (s) =>
          s.classId === editingCell.classId &&
          s.day === editingCell.day &&
          s.hour === editingCell.hour
      );
      const slot =
        cellSlots.find(
          (s) => s.type === 'materia' || s.type === 'pomeriggio_musica'
        ) || cellSlots[0];
      setTempRoom(slot?.room || 'Aula');
      // Se l'ora era già stata spostata a mano in un'aula diversa da quella
      // della sua materia, quella scelta vale come se l'utente l'avesse
      // appena fatta: cambiando docente non deve tornare al default.
      setRoomTouched(
        !!slot?.room &&
          slot.room !== getRoomForSubject(slot.subject, rooms)
      );
    }
  }, [editingCell, timetable, rooms]);

  const mergedHoursMap = useMemo(() => {
    const map: any = {};
    [...diurnalHours, ...afternoonHours].forEach((h) => {
      map[h.index] = h;
    });
    return map;
  }, [diurnalHours, afternoonHours]);

  /**
   * Quanto vale un'ora della griglia in ore di servizio: un'ora piena vale 1,
   * una mezz'ora vale 0,5. Serve alle scuole (primaria) che hanno una lezione
   * da 30 minuti al giorno: due mezze ore fanno un'ora sola di servizio.
   */
  const hourWeight = (index: number) =>
    (mergedHoursMap[index]?.duration ?? HOUR_DEFAULT_MINUTES) / 60;

  /** Monte ore curricolare settimanale atteso per le classi di una sezione. */
  const getSectionWeeklyHours = (sec: string) => {
    const conf = sectionsConfig?.[sec];
    if (!conf || typeof conf === 'string') return DEFAULT_WEEKLY_HOURS;
    return Number(conf.weeklyHours) > 0
      ? Number(conf.weeklyHours)
      : DEFAULT_WEEKLY_HOURS;
  };

  const getSectionModel = (sec: string) => {
    if (!sectionsConfig) return 'modelloB';
    const conf = sectionsConfig[sec];
    if (!conf) return 'modelloB';
    return typeof conf === 'string' ? conf : conf.model;
  };

  /** Griglia del modello di una sezione: giorni, ore curricolari, rientro. */
  const getSectionGrid = (sec: string) =>
    modelGrids?.[getSectionModel(sec)] ||
    DEFAULT_MODEL_GRIDS[getSectionModel(sec)] ||
    DEFAULT_MODEL_GRIDS.modelloB;

  /** Giorni e righe da mostrare nelle viste che tengono insieme più sezioni. */
  const gridsInUse = () =>
    Object.keys(sectionsConfig || {}).length
      ? Object.keys(sectionsConfig).map((sec) => getSectionGrid(sec))
      : [DEFAULT_MODEL_GRIDS.modelloB];
  const maxGridDays = Math.max(...gridsInUse().map((g: any) => g.days));
  const maxGridSlots = Math.max(...gridsInUse().map((g: any) => gridSlots(g)));

  /**
   * Giorni da mostrare nelle tabelle e nelle stampe: quelli davvero usati da
   * almeno un modello. Con i valori di partenza sono i sei di sempre.
   */
  const DAYS_IN_USE = DAYS.slice(0, maxGridDays);

  /**
   * Righe della griglia oraria: le ore del mattino e, se la scuola ne ha
   * impostate di più, quelle del pomeriggio a seguire. Con i valori di
   * partenza sono le sei righe di sempre.
   */
  const gridHourRows = [...diurnalHours, ...afternoonHours].slice(
    0,
    Math.max(maxGridSlots, diurnalHours.length)
  );

  const getNoteKey = (
    classId: string,
    day: number,
    hour: number,
    type: string
  ) => `${classId}_${day}_${hour}_${type}`;

  /** Dati di partenza per uno spazio di lavoro appena creato. */
  const buildInitialData = () => ({
    timetable: [],
    teachers: DEFAULT_TEACHERS,
    sostegno: DEFAULT_SOSTEGNO,
    sectionsConfig: DEFAULT_SECTIONS_CONFIG,
    generationRules: DEFAULT_RULES,
    generateOptions: DEFAULT_GEN_OPTIONS,
    strumento: DEFAULT_STRUMENTO,
    diurnalHours: INITIAL_DIURNAL_HOURS,
    afternoonHours: INITIAL_AFTERNOON_HOURS,
    cellNotes: {},
    groupConstraints: [],
    mixedClasses: DEFAULT_MIXED_CLASSES,
    rooms: DEFAULT_ROOMS,
    modelGrids: DEFAULT_MODEL_GRIDS,
    sedi: DEFAULT_SEDI,
    absences: [],
    substitutions: [],
    lastUpdatedAt: new Date().toISOString(),
  });

  /** Applica allo stato dell'app un documento (locale o cloud). */
  const applyData = (data: any) => {
          if (data.timetable) setTimetable(data.timetable);
          if (data.teachers) setTeachers(data.teachers);
          if (data.sostegno) setSostegno(data.sostegno);
          if (data.cellNotes) setCellNotes(data.cellNotes);
          if (data.sectionsConfig) {
            const safeConfig: any = {};
            Object.entries(data.sectionsConfig).forEach(([k, v]: any) => {
              safeConfig[k] =
                typeof v === 'string'
                  ? { model: v, years: k === 'G' ? [2, 3] : [1, 2, 3] }
                  : v;
            });
            setSectionsConfig(safeConfig);
          }
          if (data.generationRules) {
            const rules = data.generationRules;
            const safeDaysOff: any = {};
            if (rules.teacherDaysOff) {
              Object.keys(rules.teacherDaysOff).forEach((k) => {
                safeDaysOff[k] = Array.isArray(rules.teacherDaysOff[k])
                  ? rules.teacherDaysOff[k]
                  : [rules.teacherDaysOff[k]];
              });
            }
            // I file salvati prima dell'indisponibilità oraria non hanno
            // teacherHoursOff: parte vuoto e l'orario resta com'era.
            const safeHoursOff: any = {};
            if (rules.teacherHoursOff) {
              Object.keys(rules.teacherHoursOff).forEach((k) => {
                const v = rules.teacherHoursOff[k];
                safeHoursOff[k] = Array.isArray(v) ? v.map(String) : [];
              });
            }
            setGenerationRules({
              globalMaxGapHours: rules.globalMaxGapHours ?? 1,
              globalMaxHoursPerDay: rules.globalMaxHoursPerDay ?? 5,
              globalMinHoursPerDay: rules.globalMinHoursPerDay ?? 2,
              teacherMaxGapHours: rules.teacherMaxGapHours || {},
              teacherDaysOff: safeDaysOff,
              teacherHoursOff: safeHoursOff,
            });
          }
          if (data.generateOptions) setGenerateOptions(data.generateOptions);
          if (data.strumento) setStrumento(data.strumento);
          if (data.diurnalHours) setDiurnalHours(data.diurnalHours);
          if (data.afternoonHours) setAfternoonHours(data.afternoonHours);
          if (data.groupConstraints) setGroupConstraints(data.groupConstraints);
          if (data.mixedClasses) setMixedClasses(data.mixedClasses);
          if (data.rooms) setRooms(data.rooms);
          // I documenti salvati prima della griglia parametrica non hanno
          // modelGrids: restano sui valori di partenza, che sono gli stessi
          // numeri che l'app usava quando erano scritti nel codice.
          if (data.modelGrids) {
            const grids = normalizeModelGrids(data.modelGrids);
            modelGridsRef.current = grids;
            setModelGrids(grids);
          }
          if (data.sedi) setSedi(data.sedi);
          if (data.absences) setAbsences(data.absences);
          if (data.substitutions) setSubstitutions(data.substitutions);
  };

  /** Riapre l'ultimo spazio di lavoro usato (o quello del link di invito). */
  useEffect(() => {
    const stored = readStoredWorkspace();
    if (invitedCode) {
      if (stored && stored.mode === 'cloud' && stored.code === invitedCode) {
        setWorkspace(stored);
      }
      return;
    }
    if (stored) setWorkspace(stored);
  }, [invitedCode]);

  /**
   * Salva i dati iniziali di uno spazio di lavoro appena creato.
   * Se il salvataggio fallisce riprova al massimo due volte, poi si ferma
   * lasciando il badge su "errore": meglio un avviso che un ciclo infinito.
   */
  const seedWorkspace = (ws: Workspace, initial: any, attempt = 0) => {
    persistWorkspace(ws, initial, (status) => {
      setCloudStatus(status);
      if (status === 'errore' && attempt < 2) {
        window.setTimeout(
          () => seedWorkspace(ws, initial, attempt + 1),
          1500 * (attempt + 1)
        );
      }
    });
  };

  /** Ascolta i dati dello spazio di lavoro attivo. */
  useEffect(() => {
    if (!workspace) return;
    setIsInitialLoad(true);
    const unsubscribe = subscribeWorkspace(workspace, {
      onData: (data) => {
        applyData(data);
        setIsInitialLoad(false);
      },
      onEmpty: () => {
        if (seededCodeRef.current === workspace.code) {
          setIsInitialLoad(false);
          return;
        }
        seededCodeRef.current = workspace.code;
        const initial = buildInitialData();
        applyData(initial);
        setIsInitialLoad(false);
        seedWorkspace(workspace, initial);
      },
      onStatus: setCloudStatus,
    });
    return () => unsubscribe();
  }, [workspace]);

  /** Sceglie (o cambia) lo spazio di lavoro. */
  const handleChooseWorkspace = (ws: Workspace, importedData?: any) => {
    storeWorkspace(ws);
    syncUrl(ws);
    setWorkspace(ws);
    setShowWorkspacePanel(false);
    if (importedData) {
      applyData(importedData);
      setIsInitialLoad(false);
      persistWorkspace(ws, importedData, setCloudStatus);
    }
  };

  /** Torna alla schermata iniziale di scelta. */
  const handleLeaveWorkspace = () => {
    forgetWorkspace();
    syncUrl(null);
    setWorkspace(null);
    setShowWorkspacePanel(false);
    setIsInitialLoad(true);
  };

  const pushDataToCloud = async (
    newTimetable: any[],
    newTeachers: any[],
    newSostegno: any[],
    newSections: any,
    newStrumento: any[],
    newDiurnals: any[],
    newAfternoons: any[],
    newRules: any,
    newGenOptions: any,
    newCellNotes: any,
    newGroupConstraints: any[],
    newMixedClasses: any[],
    newRooms?: any[],
    newSedi?: any[],
    newAbsences?: any[],
    newSubstitutions?: any[]
  ) => {
    if (!workspace || isInitialLoad) return;
    await persistWorkspace(
      workspace,
      {
        timetable: newTimetable,
        teachers: newTeachers,
        sostegno: newSostegno,
        sectionsConfig: newSections,
        generationRules: newRules || generationRules,
        generateOptions: newGenOptions || generateOptions,
        strumento: newStrumento,
        diurnalHours: newDiurnals || diurnalHours,
        afternoonHours: newAfternoons || afternoonHours,
        cellNotes: newCellNotes !== undefined ? newCellNotes : cellNotes,
        groupConstraints:
          newGroupConstraints !== undefined
            ? newGroupConstraints
            : groupConstraints,
        mixedClasses:
          newMixedClasses !== undefined ? newMixedClasses : mixedClasses,
        rooms: newRooms !== undefined ? newRooms : rooms,
        modelGrids: modelGridsRef.current,
        sedi: newSedi !== undefined ? newSedi : sedi,
        absences: newAbsences !== undefined ? newAbsences : absences,
        substitutions:
          newSubstitutions !== undefined ? newSubstitutions : substitutions,
        lastUpdatedAt: new Date().toISOString(),
      },
      setCloudStatus
    );
  };

  /** Scarica un backup completo in formato JSON. */
  const handleBackupDownload = () => {
    const data = {
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      generationRules,
      generateOptions,
      strumento,
      diurnalHours,
      afternoonHours,
      cellNotes,
      groupConstraints,
      mixedClasses,
      rooms,
      modelGrids,
      sedi,
      absences,
      substitutions,
      lastUpdatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `edutime-backup-${stamp}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /** Ricarica un backup JSON dentro lo spazio di lavoro corrente. */
  const handleBackupRestore = (file: File) => {
    setRestoreError('');
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || typeof data !== 'object' || !('teachers' in data)) {
          throw new Error('formato');
        }
        applyData(data);
        if (workspace) persistWorkspace(workspace, data, setCloudStatus);
      } catch {
        setRestoreError('File non valido: serve un backup .json di EduTime Pro.');
      }
    };
    reader.onerror = () =>
      setRestoreError('Impossibile leggere il file selezionato.');
    reader.readAsText(file);
  };

  const handleSaveNote = () => {
    if (!editingNoteCell) return;
    const { classId, day, hour, type } = editingNoteCell;
    const key = getNoteKey(classId, day, hour, type);
    const newNotes = { ...cellNotes };
    if (noteText.trim()) newNotes[key] = noteText.trim();
    else delete newNotes[key];
    setCellNotes(newNotes);
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      newNotes,
      groupConstraints,
      mixedClasses
    );
    setEditingNoteCell(null);
    setNoteText('');
  };

  const handleDeleteNote = () => {
    if (!editingNoteCell) return;
    const { classId, day, hour, type } = editingNoteCell;
    const newNotes = { ...cellNotes };
    delete newNotes[getNoteKey(classId, day, hour, type)];
    setCellNotes(newNotes);
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      newNotes,
      groupConstraints,
      mixedClasses
    );
    setEditingNoteCell(null);
    setNoteText('');
  };

  const classes = useMemo(() => {
    const list: any[] = [];
    if (!sectionsConfig) return list;
    Object.entries(sectionsConfig).forEach(([sec, config]: any) => {
      const years =
        typeof config === 'string'
          ? sec === 'G'
            ? [2, 3]
            : [1, 2, 3]
          : config.years;
      years.forEach((yr: number) => {
        list.push({ id: `${yr}${sec}`, year: yr, section: sec });
      });
    });
    list.sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.section.localeCompare(b.section)
    );
    return list;
  }, [sectionsConfig]);

  /** Griglia di una classe, cercata dalla sua sezione. */
  const getClassGrid = (classId: string) => {
    const classObj = classes.find((c) => c.id === classId);
    return classObj
      ? getSectionGrid(classObj.section)
      : DEFAULT_MODEL_GRIDS.modelloB;
  };

  /**
   * È l'ora del rientro pomeridiano per questa classe? Prima era l'ora 5 del
   * modello A, scritta a mano in cinque punti; ora è la prima ora dopo quelle
   * curricolari, qualunque sia la griglia del modello.
   */
  const isRientroHour = (classId: string, hour: number) => {
    const grid = getClassGrid(classId);
    return !!grid.rientro && hour === grid.hours;
  };

  const allStaff = useMemo(
    () => [
      ...teachers.map((t) => ({ ...t, staffType: 'materia' })),
      ...sostegno.map((s) => ({ ...s, staffType: 'sostegno' })),
      ...strumento.map((m) => ({ ...m, staffType: 'strumento' })),
    ],
    [teachers, sostegno, strumento]
  );

  const filteredStaff = useMemo(
    () =>
      allStaff.filter(
        (s) =>
          s.name.toLowerCase().includes(masterSearch.toLowerCase()) ||
          s.subject.toLowerCase().includes(masterSearch.toLowerCase())
      ),
    [allStaff, masterSearch]
  );
  const filteredInstrumentStaff = useMemo(
    () => allStaff.filter((s) => s.staffType === 'strumento'),
    [allStaff]
  );
  const allDepartments = useMemo(
    () => Array.from(new Set(teachers.map((t) => t.subject))).sort(),
    [teachers]
  );

  const staffClassSummary = useMemo(() => {
    const summary: any = {};
    allStaff.forEach((staff) => {
      const assigns = staff.assignments || [];
      summary[staff.id] =
        assigns.length > 0
          ? assigns.map((a: any) => `${a.classId}(${a.hours})`).join(' - ')
          : staff.subject;
    });
    return summary;
  }, [allStaff]);

  const staffHoursPlanned = useMemo(() => {
    const hours: any = {};
    allStaff.forEach((s) => {
      hours[s.id] =
        s.assignments?.reduce((sum: number, a: any) => sum + a.hours, 0) || 0;
    });
    return hours;
  }, [allStaff]);

  const staffHoursActual = useMemo(() => {
    const hours: any = {};
    allStaff.forEach((s) => {
      hours[s.id] = 0;
    });
    timetable.forEach((slot) => {
      if (slot.teacherId && hours[slot.teacherId] !== undefined)
        hours[slot.teacherId] += hourWeight(slot.hour);
    });
    Object.keys(hours).forEach((id) => {
      hours[id] = Math.round(hours[id] * 100) / 100;
    });
    return hours;
  }, [allStaff, timetable, mergedHoursMap]);

  const validationResult = useMemo(() => {
    const conflicts: any[] = [];
    const classHourCounts: any = {};
    classes.forEach((c) => {
      classHourCounts[c.id] = 0;
    });
    const teacherSchedules: any = {};
    const sostegnoSchedules: any = {};
    const teacherDailyClassCounts: any = {};
    const roomSchedules: any = {};

    allStaff.forEach((staff) => {
      const planned = staffHoursPlanned[staff.id] || 0;
      const actual = staffHoursActual[staff.id] || 0;
      if (actual > planned) {
        conflicts.push({
          type: 'error',
          message: `Il docente ${staff.name} ha ${formatHours(
            actual
          )} ore in orario ma ne sono state assegnate solo ${formatHours(
            planned
          )}.`,
          suggestion: `Rimuovi ${formatHours(
            actual - planned
          )} ora/e dalla tabella Orario Generale oppure aggiungi ore nel Registro Cattedre.`,
          teacherId: staff.id,
        });
      }
      const daysOff = generationRules.teacherDaysOff[staff.id] || [];
      // Le ore bloccate non hanno un tetto come i giorni liberi: il freno è
      // che restino abbastanza celle per le ore di cattedra.
      const hoursOff = (generationRules.teacherHoursOff || {})[staff.id] || [];
      if (planned > 0 && hoursOff.length > 0) {
        const staffHours =
          staff.staffType === 'strumento' ? afternoonHours : gridHourRows;
        let freeCells = 0;
        DAYS.slice(0, maxGridDays).forEach((_, d) => {
          if (daysOff.includes(d)) return;
          if (staff.staffType === 'strumento' && d === 5) return;
          staffHours.forEach((h: any) => {
            if (!hoursOff.includes(hourOffKey(d, h.index))) freeCells++;
          });
        });
        if (freeCells < planned) {
          conflicts.push({
            type: 'error',
            message: `Il docente ${staff.name} ha ${formatHours(
              planned
            )} ore pianificate ma solo ${freeCells} celle disponibili dopo giorni e ore di indisponibilità.`,
            suggestion: `Libera qualche ora nella griglia di indisponibilità oppure riduci le ore in cattedra.`,
            teacherId: staff.id,
          });
        }
      }
      // Il tetto di ore al giorno può rendere la cattedra impossibile da
      // piazzare: meglio dirlo qui che lasciare ore fuori dall'orario senza
      // spiegazione.
      const capPerDay = maxHoursPerDayFor(generationRules);
      if (planned > 0 && capPerDay > 0 && staff.staffType !== 'strumento') {
        let workDays = 0;
        DAYS.slice(0, maxGridDays).forEach((_, d) => {
          if (!daysOff.includes(d)) workDays++;
        });
        const capacity = workDays * capPerDay;
        if (capacity < planned) {
          conflicts.push({
            type: 'error',
            message: `Il docente ${staff.name} ha ${formatHours(
              planned
            )} ore pianificate ma con il tetto di ${capPerDay} ore al giorno su ${workDays} giorni ne entrano al massimo ${capacity}.`,
            suggestion: `Alza il tetto di ore al giorno in "Sezioni & Regole", togli un giorno libero oppure riduci le ore in cattedra.`,
            teacherId: staff.id,
          });
        }
      }
      // Giornate rimaste sotto il minimo: il docente viene a scuola per
      // un'ora sola e la passata di consolidamento non è riuscita a chiuderla.
      const minPerDay = minHoursPerDayFor(generationRules);
      if (minPerDay > 1) {
        const perDay: Record<number, number> = {};
        timetable.forEach((s) => {
          if (s.teacherId === staff.id)
            perDay[s.day] = (perDay[s.day] || 0) + 1;
        });
        const corte = Object.entries(perDay)
          .filter(([, n]) => n < minPerDay)
          .map(([d]) => DAYS[Number(d)]);
        if (corte.length > 0) {
          conflicts.push({
            type: 'warning',
            message: `Il docente ${staff.name} ha una giornata sotto il minimo di ${minPerDay} ore (${corte.join(', ')}).`,
            suggestion: `Sposta a mano quelle ore in un giorno in cui è già a scuola, oppure abbassa il minimo in "Sezioni & Regole".`,
            teacherId: staff.id,
          });
        }
      }
      const maxAllowed = getMaxDaysOffForHours(planned);
      if (planned > 0 && daysOff.length > maxAllowed) {
        conflicts.push({
          type: 'error',
          message: `Il docente ${staff.name} ha ${planned}h pianificate e ${daysOff.length} giorni liberi (max consentito: ${maxAllowed}).`,
          suggestion: `Con ${planned} ore settimanali, il sistema consente al massimo ${maxAllowed} giorno/i libero/i.`,
          teacherId: staff.id,
        });
      }
    });

    timetable.forEach((slot) => {
      const { classId, day, hour, teacherId, type, room } = slot;
      const classObj = classes.find((c) => c.id === classId);
      if (!classObj) return;

      // "Lab. Musica" sulle lezioni di strumento e' solo un'etichetta di
      // comodo quando in "Aule" non c'e' un'aula dedicata a quello strumento:
      // le lezioni sono individuali e ogni docente ha il suo spazio. Segnalare
      // un conflitto d'aula li' vorrebbe dire dare al collega un allarme che
      // non puo' risolvere. Se invece l'aula e' configurata, vale come tutte
      // le altre.
      const isEtichettaDiComodo =
        slot.type === 'pomeriggio_musica' &&
        getRoomForSubject(slot.subject, rooms) === 'Aula';

      if (room && room !== 'Aula' && room !== 'Classe' && !isEtichettaDiComodo) {
        const rKey = `${room}_${day}_${hour}`;
        if (!roomSchedules[rKey]) roomSchedules[rKey] = [];
        roomSchedules[rKey].push(classId);
      }

      if (teacherId) {
        const daysOff = generationRules.teacherDaysOff[teacherId] || [];
        if (daysOff.includes(day)) {
          conflicts.push({
            type: 'error',
            message: `Il docente ${
              allStaff.find((t) => t.id === teacherId)?.name
            } è stato assegnato in un giorno di indisponibilità (${
              DAYS[day]
            }).`,
            slot,
          });
        } else if (isTeacherOff(generationRules, teacherId, day, hour)) {
          const hourLabel =
            [...diurnalHours, ...afternoonHours].find((h) => h.index === hour)
              ?.label || `${hour + 1}ª`;
          conflicts.push({
            type: 'error',
            message: `Il docente ${
              allStaff.find((t) => t.id === teacherId)?.name
            } è stato assegnato in un'ora di indisponibilità (${
              DAYS[day]
            }, ${hourLabel}).`,
            slot,
          });
        }
      }
      // I limiti della griglia (quanti giorni, quante ore, se c'è il rientro)
      // arrivano dalle impostazioni del modello, non più da numeri fissi.
      const grid = getSectionGrid(classObj.section);
      if (day >= grid.days && hour < gridSlots(grid)) {
        conflicts.push({
          type: 'error',
          message: `La classe ${classId} ha ore assegnate di ${DAYS[day]}, fuori dai ${grid.days} giorni del suo modello.`,
          slot,
        });
      }
      if (grid.rientro && hour === grid.hours && type === 'materia') {
        conflicts.push({
          type: 'error',
          message: `La classe ${classId} ha una materia nell'ora del rientro pomeridiano.`,
          slot,
        });
      }
      const isDiurnalClassHour = hour < grid.hours;
      if (type === 'materia' && isDiurnalClassHour)
        classHourCounts[classId] =
          (classHourCounts[classId] || 0) + hourWeight(hour);
      if (type === 'materia' && teacherId) {
        const tcdKey = `${teacherId}_${classId}_${day}`;
        teacherDailyClassCounts[tcdKey] =
          (teacherDailyClassCounts[tcdKey] || 0) + 1;
        if (teacherDailyClassCounts[tcdKey] > 3) {
          conflicts.push({
            type: 'error',
            message: `Il docente ${
              allStaff.find((t) => t.id === teacherId)?.name
            } supera il limite di 3 ore giornaliere nella classe ${classId}.`,
            slot,
          });
        }
      }
      if (teacherId && (type === 'materia' || type === 'pomeriggio_musica')) {
        const key = `${day}_${hour}`;
        if (!teacherSchedules[teacherId]) teacherSchedules[teacherId] = {};
        if (!teacherSchedules[teacherId][key])
          teacherSchedules[teacherId][key] = [];
        teacherSchedules[teacherId][key].push(classId);
        if (teacherSchedules[teacherId][key].length > 1) {
          conflicts.push({
            type: 'conflict',
            message: `Il docente ${
              allStaff.find((t) => t.id === teacherId)?.name
            } è assegnato a più classi contemporaneamente (${teacherSchedules[
              teacherId
            ][key].join(', ')}) il ${DAYS[day]} alle ore ${
              mergedHoursMap[hour]?.label
            }.`,
            slot,
          });
        }
      }
      if (
        teacherId &&
        room &&
        (type === 'materia' || type === 'pomeriggio_musica')
      ) {
        const currentSede = getSedeForSlot(slot, rooms, classes, sectionsConfig);
        if (currentSede) {
          const nextSlot = timetable.find(
            (s) =>
              s.teacherId === teacherId &&
              s.day === day &&
              s.hour === hour + 1 &&
              (s.type === 'materia' || s.type === 'pomeriggio_musica')
          );
          if (nextSlot) {
            const nextSede = getSedeForSlot(
              nextSlot,
              rooms,
              classes,
              sectionsConfig
            );
            if (nextSede && nextSede !== currentSede) {
              const sedeName = (id: string) =>
                sedi.find((s) => s.id === id)?.name || id;
              conflicts.push({
                type: 'error',
                message: `Il docente ${
                  allStaff.find((t) => t.id === teacherId)?.name
                } passa dalla sede "${sedeName(
                  currentSede
                )}" alla sede "${sedeName(
                  nextSede
                )}" il ${DAYS[day]} tra le ore ${
                  mergedHoursMap[hour]?.label
                } e ${mergedHoursMap[hour + 1]?.label}, senza un'ora di buco per lo spostamento.`,
                suggestion: `Lascia un'ora libera tra le due lezioni in sedi diverse, oppure assegna un altro docente.`,
                slot,
              });
            }
          }
        }
      }
      if (type === 'sostegno' && teacherId) {
        const key = `${day}_${hour}`;
        if (!sostegnoSchedules[teacherId]) sostegnoSchedules[teacherId] = {};
        if (!sostegnoSchedules[teacherId][key])
          sostegnoSchedules[teacherId][key] = [];
        sostegnoSchedules[teacherId][key].push(classId);
        if (sostegnoSchedules[teacherId][key].length > 1) {
          conflicts.push({
            type: 'conflict',
            message: `Il docente di sostegno ${
              allStaff.find((s) => s.id === teacherId)?.name
            } si trova in più classi contemporaneamente.`,
            slot,
          });
        }
      }
    });

    Object.entries(roomSchedules).forEach(([key, cls]: any) => {
      const [roomName] = key.split('_');
      if (cls.length > roomCapacity(roomName, rooms)) {
        const [room, day, hour] = key.split('_');
        conflicts.push({
          type: 'error',
          message: `Conflitto Aula: ${room} (${roomCapacity(
            room,
            rooms
          )} disponibile/i) è occupata contemporaneamente da ${cls.join(
            ', '
          )}.`,
          suggestion: `Sposta una delle lezioni in un'altra ora o assegna un'altra aula.`,
          slot: timetable.find(
            (s) =>
              s.room === room &&
              s.day === parseInt(day) &&
              s.hour === parseInt(hour)
          ),
        });
      }
    });

    // Una materia collegata a un'aula speciale può chiedere più ore di quante
    // l'aula ne offra in una settimana: le ore in eccesso non entrano
    // nell'orario e sembrano sparite. Meglio dirlo prima di generare.
    const oreRichiestePerMateria: Record<string, number> = {};
    teachers.forEach((t) => {
      (t.assignments || []).forEach((a: any) => {
        oreRichiestePerMateria[t.subject] =
          (oreRichiestePerMateria[t.subject] || 0) + a.hours;
      });
    });
    const celleSettimanali = maxGridDays * gridHourRows.length;
    const materiePerAula: Record<string, string[]> = {};
    Object.keys(oreRichiestePerMateria).forEach((subject) => {
      const room = getRoomForSubject(subject, rooms);
      if (!room || room === 'Aula' || room === 'Classe') return;
      if (!materiePerAula[room]) materiePerAula[room] = [];
      materiePerAula[room].push(subject);
    });
    Object.entries(materiePerAula).forEach(([room, subjects]) => {
      const richieste = subjects.reduce(
        (sum, s) => sum + (oreRichiestePerMateria[s] || 0),
        0
      );
      const disponibili = celleSettimanali * roomCapacity(room, rooms);
      if (richieste > disponibili) {
        conflicts.push({
          type: 'error',
          message: `${subjects.join(' e ')} ${
            subjects.length > 1 ? 'chiedono' : 'chiede'
          } ${formatHours(
            richieste
          )} ore ma "${room}" ne offre ${disponibili} a settimana: ${formatHours(
            richieste - disponibili
          )} ore non entreranno in orario.`,
          suggestion: `In "Aule e Laboratori" aumenta quante ${room} ci sono, oppure scollega la materia dall'aula se si può fare in classe.`,
        });
      }
    });

    groupConstraints.forEach((gc) => {
      const slots1 = timetable.filter(
        (s) => s.classId === gc.class1 && s.subject === gc.subject
      );
      const slots2 = timetable.filter(
        (s) => s.classId === gc.class2 && s.subject === gc.subject
      );
      let overlap = false;
      slots1.forEach((s1) => {
        if (slots2.some((s2) => s2.day === s1.day && s2.hour === s1.hour))
          overlap = true;
      });
      if (!overlap && slots1.length > 0 && slots2.length > 0) {
        conflicts.push({
          type: 'warning',
          message: `Accorpamento non rispettato: ${gc.class1} e ${gc.class2} dovrebbero avere ${gc.subject} contemporaneamente.`,
        });
      }
    });

    classes.forEach((c) => {
      const hrs = classHourCounts[c.id] || 0;
      const expected = getSectionWeeklyHours(c.section);
      if (hrs === expected || hrs === 0) return;
      // Il Registro Cattedre dice quante ore sono state assegnate ai docenti,
      // questo conteggio dice quante ne sono davvero finite in orario: se i
      // due numeri non coincidono è perché qualche ora non è stata piazzata.
      const inCattedra = teachers.reduce(
        (sum, t) =>
          sum +
          (t.assignments || [])
            .filter((a: any) => a.classId === c.id)
            .reduce((s: number, a: any) => s + a.hours, 0),
        0
      );
      const fuori = inCattedra - hrs;
      conflicts.push({
        type: 'warning',
        message:
          fuori > 0
            ? `La classe ${c.id} ha ${formatHours(
                hrs
              )} ore in orario sulle ${formatHours(
                expected
              )} previste: ${formatHours(fuori)} ${
                fuori === 1
                  ? 'ora è in cattedra ma non è stata piazzata'
                  : 'ore sono in cattedra ma non sono state piazzate'
              }.`
            : `La classe ${c.id} ha ${formatHours(
                hrs
              )} ore in orario sulle ${formatHours(expected)} previste.`,
        suggestion:
          fuori > 0
            ? `Guarda gli altri conflitti: di solito è un'aula satura o un docente senza celle libere. Puoi anche rigenerare o assegnare le ore a mano.`
            : `Controlla le ore assegnate ai docenti per questa classe nel Registro Cattedre.`,
      });
    });
    return { conflicts, classHourCounts };
  }, [
    timetable,
    classes,
    sectionsConfig,
    allStaff,
    mergedHoursMap,
    generationRules,
    staffHoursPlanned,
    staffHoursActual,
    groupConstraints,
    rooms,
    sedi,
    diurnalHours,
    afternoonHours,
  ]);

  const handleRemoveSlot = (slotToRemove: any) => {
    if (!slotToRemove || readOnlyMode) return;
    const newTimetable = timetable.filter((s) => s !== slotToRemove);
    setTimetable(newTimetable);
    pushDataToCloud(
      newTimetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const generateTimetable = () => {
    if (readOnlyMode) return;
    let newTimetable = timetable.filter((s) => s.locked);
    let newRules = { ...generationRules };
    if (!newRules.teacherDaysOff) newRules.teacherDaysOff = {};
    if (!newRules.teacherHoursOff) newRules.teacherHoursOff = {};

    allStaff.forEach((staff) => {
      const plannedHours = staffHoursPlanned[staff.id] || 0;
      const maxDaysOff = getMaxDaysOffForHours(plannedHours);
      const currentDaysOff = newRules.teacherDaysOff[staff.id] || [];
      if (currentDaysOff.length > maxDaysOff && plannedHours > 0)
        newRules.teacherDaysOff[staff.id] = currentDaysOff.slice(0, maxDaysOff);
    });

    let daysOffCount = [0, 0, 0, 0, 0, 0];
    Object.values(newRules.teacherDaysOff).forEach((arr: any) =>
      arr.forEach((d: number) => {
        if (d >= 0 && d <= 5) daysOffCount[d]++;
      })
    );

    allStaff.forEach((staff) => {
      const plannedHours = staffHoursPlanned[staff.id] || 0;
      const maxDaysOff = getMaxDaysOffForHours(plannedHours);
      /**
       * Giorni in cui il docente può davvero lavorare: il massimo fra le
       * griglie delle sue classi. Chi non arriva ai giorni della scuola ha il
       * giorno libero d'ufficio nel primo giorno che le sue classi non usano
       * (con i modelli di partenza è il sabato di chi sta solo sul modello B,
       * come prima); gli altri lo ricevono nel giorno meno affollato.
       */
      const teacherGridDays =
        staff.staffType === 'strumento'
          ? maxGridDays
          : Math.max(
              0,
              ...(staff.assignments || []).map(
                (a: any) => getClassGrid(a.classId).days
              )
            );
      const currentDaysOff = newRules.teacherDaysOff[staff.id] || [];
      if (currentDaysOff.length === 0 && plannedHours > 0) {
        if (teacherGridDays > 0 && teacherGridDays < maxGridDays)
          newRules.teacherDaysOff[staff.id] = [teacherGridDays];
        else {
          let minDay = 0;
          for (let i = 1; i < maxGridDays; i++)
            if (daysOffCount[i] < daysOffCount[minDay]) minDay = i;
          newRules.teacherDaysOff[staff.id] = [minDay];
          daysOffCount[minDay]++;
        }
      }
      if (
        newRules.teacherDaysOff[staff.id] &&
        newRules.teacherDaysOff[staff.id].length > maxDaysOff
      )
        newRules.teacherDaysOff[staff.id] = newRules.teacherDaysOff[
          staff.id
        ].slice(0, maxDaysOff);
    });
    setGenerationRules(newRules);

    const report = {
      materie: {
        requested: 0,
        assigned: 0,
        recovered: 0,
        swaps: 0,
        consolidated: 0,
        shortDaysLeft: 0,
        missing: [] as any[],
      },
    };

    const maxPerDayRule = maxHoursPerDayFor(newRules);

    // Quota giornaliera ideale di ogni docente: le sue ore spalmate sui giorni
    // in cui è a scuola. Oltre quella quota la cella costa cara, così la
    // cattedra si distribuisce invece di ammassarsi sui primi giorni.
    const idealPerDay: Record<string, number> = {};
    allStaff.forEach((staff) => {
      const planned = staffHoursPlanned[staff.id] || 0;
      const daysOff = newRules.teacherDaysOff[staff.id] || [];
      const workDays = Math.max(1, maxGridDays - daysOff.length);
      idealPerDay[staff.id] = Math.max(1, Math.ceil(planned / workDays));
    });

    if (generateOptions.materie) {
      const unplacedLessons: any[] = [];
      classes.forEach((cls) => {
        // Quante ore al giorno e su quanti giorni: sono i numeri della
        // griglia del modello, impostabili dalla scuola.
        const grid = getClassGrid(cls.id);
        const maxHoursPerDay = grid.hours;
        const totalDays = grid.days;
        const pool: any[] = [];

        teachers.forEach((t) => {
          const assignment = t.assignments.find(
            (a: any) => a.classId === cls.id
          );
          if (assignment) {
            report.materie.requested += assignment.hours;
            for (let i = 0; i < assignment.hours; i++)
              pool.push({
                teacherId: t.id,
                subject: t.subject,
                teacherName: t.name,
                preferConsecutive: !!t.preferConsecutive,
              });
          }
        });
        pool.sort(() => Math.random() - 0.5);

        for (let day = 0; day < totalDays; day++) {
          for (let hour = 0; hour < maxHoursPerDay; hour++) {
            if (pool.length === 0) break;

            // La cella potrebbe essere gia' occupata da una lezione col
            // lucchetto: in quel caso si salta, altrimenti la classe si
            // ritrova due materie nella stessa ora. Il sostegno invece sta
            // in compresenza sulla materia, quindi non occupa la cella.
            const cellBusy = newTimetable.some(
              (s) =>
                s.classId === cls.id &&
                s.day === day &&
                s.hour === hour &&
                s.type !== 'sostegno'
            );
            if (cellBusy) continue;

            let selectedLessonIndex = -1;
            let bestCandidateGapPenalty = 9999;

            for (let i = 0; i < pool.length; i++) {
              const candidate = pool[i];
              if (isTeacherOff(newRules, candidate.teacherId, day, hour))
                continue;

              let mixPairClassId = null;
              if (
                ['SPAGNOLO', 'FRANCESE', 'TEDESCO'].includes(candidate.subject)
              ) {
                const mix = mixedClasses.find(
                  (m: any) =>
                    m.subject === candidate.subject &&
                    (m.c1 === cls.id || m.c2 === cls.id)
                );
                if (mix) {
                  mixPairClassId = mix.c1 === cls.id ? mix.c2 : mix.c1;
                  if (
                    newTimetable.some(
                      (s) =>
                        s.classId === mixPairClassId &&
                        s.day === day &&
                        s.hour === hour
                    )
                  )
                    continue;
                }
              }

              const isTeacherBusy = newTimetable.some(
                (slot) =>
                  slot.day === day &&
                  slot.hour === hour &&
                  slot.teacherId === candidate.teacherId
              );
              if (isTeacherBusy) continue;
              // Tetto di ore al giorno: senza, riempiendo classe per classe
              // dal lunedì, lo stesso docente si ritrovava giornate da sei ore
              // e la settimana schiacciata su quattro giorni.
              const hoursTodayForCandidate = hoursOfTeacherOnDay(
                newTimetable,
                candidate.teacherId,
                day
              );
              const capForCandidate = dailyCapFor(
                newRules,
                idealPerDay,
                candidate.teacherId
              );
              if (
                capForCandidate > 0 &&
                hoursTodayForCandidate >= capForCandidate
              )
                continue;
              const dailyClassLessons = newTimetable.filter(
                (slot) =>
                  slot.classId === cls.id &&
                  slot.day === day &&
                  slot.teacherId === candidate.teacherId
              );
              if (dailyClassLessons.length >= 3) continue;
              const currentRoom = getRoomForSubject(candidate.subject, rooms);
              if (isRoomFull(newTimetable, currentRoom, day, hour, rooms))
                continue;
              const currentSede = getSedeForSlot(
                { room: currentRoom, classId: cls.id },
                rooms,
                classes,
                sectionsConfig
              );
              if (currentSede) {
                const spostamentoSenzaBuco = newTimetable.some(
                  (s) =>
                    s.teacherId === candidate.teacherId &&
                    s.day === day &&
                    (s.hour === hour - 1 || s.hour === hour + 1) &&
                    getSedeForSlot(s, rooms, classes, sectionsConfig) &&
                    getSedeForSlot(s, rooms, classes, sectionsConfig) !==
                      currentSede
                );
                if (spostamentoSenzaBuco) continue;
              }
              if (day > 0) {
                const hoursYesterday = newTimetable.filter(
                  (s) =>
                    s.teacherId === candidate.teacherId && s.day === day - 1
                ).length;
                const hoursToday = newTimetable.filter(
                  (s) => s.teacherId === candidate.teacherId && s.day === day
                ).length;
                if (hoursYesterday + hoursToday + 1 > 10) continue;
              }
              const maxGapAllowed =
                newRules.teacherMaxGapHours[candidate.teacherId] !== undefined
                  ? newRules.teacherMaxGapHours[candidate.teacherId]
                  : newRules.globalMaxGapHours || 1;
              const dailyLessons = newTimetable.filter(
                (slot) =>
                  slot.teacherId === candidate.teacherId && slot.day === day
              );
              let penalty = 0;

              // Spinta a distribuire: più ore ha già oggi, meno conviene
              // dargliene un'altra. Il tetto giornaliero fa il grosso del
              // lavoro, questa serve a scegliere fra due giorni entrambi
              // ammessi.
              penalty += dailyLessons.length * 4;

              if (dailyLessons.length > 0) {
                const minHour = Math.min(
                  ...dailyLessons.map((l) => l.hour),
                  hour
                );
                const maxHour = Math.max(
                  ...dailyLessons.map((l) => l.hour),
                  hour
                );
                const spread = maxHour - minHour + 1;
                const totalLessons = dailyLessons.length + 1;
                const gaps = spread - totalLessons;
                if (gaps > maxGapAllowed) penalty += 50 + gaps * 5;
                else penalty += gaps * 5;

                const dayHours = [
                  ...dailyLessons.map((l) => l.hour),
                  hour,
                ].sort((a, b) => a - b);
                for (let j = 0; j < dayHours.length - 1; j++) {
                  if (dayHours[j + 1] - dayHours[j] >= 3) {
                    penalty += 9999;
                    break;
                  }
                }
              } else {
                penalty += hour * 2;
              }

              if (candidate.preferConsecutive) {
                const alreadyAssignedInClassToday = newTimetable.filter(
                  (s) =>
                    s.teacherId === candidate.teacherId &&
                    s.classId === cls.id &&
                    s.day === day
                );
                if (alreadyAssignedInClassToday.length > 0) {
                  const isAdjacent = alreadyAssignedInClassToday.some(
                    (s) => Math.abs(s.hour - hour) === 1
                  );
                  if (isAdjacent) penalty -= 100;
                  else penalty += 50;
                }
              } else {
                const alreadyAssignedInClassToday = newTimetable.filter(
                  (s) =>
                    s.teacherId === candidate.teacherId &&
                    s.classId === cls.id &&
                    s.day === day
                );
                if (alreadyAssignedInClassToday.length > 0) {
                  const isAdjacent = alreadyAssignedInClassToday.some(
                    (s) => Math.abs(s.hour - hour) === 1
                  );
                  if (isAdjacent) penalty += 30;
                }
              }
              penalty += Math.random() * 5;
              if (penalty < bestCandidateGapPenalty) {
                bestCandidateGapPenalty = penalty;
                selectedLessonIndex = i;
              }
            }

            if (selectedLessonIndex !== -1) {
              const lesson = pool.splice(selectedLessonIndex, 1)[0];
              newTimetable.push({
                classId: cls.id,
                day,
                hour,
                teacherId: lesson.teacherId,
                subject: lesson.subject,
                type: 'materia',
                room: getRoomForSubject(lesson.subject, rooms),
              });
              report.materie.assigned++;

              const mix = mixedClasses.find(
                (m: any) =>
                  m.subject === lesson.subject &&
                  (m.c1 === cls.id || m.c2 === cls.id)
              );
              if (mix) {
                const otherClassId = mix.c1 === cls.id ? mix.c2 : mix.c1;
                const idxOther = pool.findIndex(
                  (p) =>
                    p.teacherId === lesson.teacherId &&
                    p.subject === lesson.subject
                );
                if (idxOther !== -1) pool.splice(idxOther, 1);
                report.materie.assigned++;
              }
            }
          }
        }
        pool.forEach((lesson) =>
          unplacedLessons.push({
            ...lesson,
            classId: cls.id,
            totalDays,
            maxHoursPerDay,
          })
        );
      });

      // Seconda passata: prova a recuperare le ore rimaste fuori sfrattando
      // una lezione già piazzata e ricollocandola. Se non ci riesce, la
      // griglia resta identica a quella della passata greedy.
      const repairCtx = {
        rules: newRules,
        rooms,
        classes,
        sectionsConfig,
        mixedClasses,
        teachers,
        idealPerDay,
        getGrid: getClassGrid,
      };
      const repair = repairUnplacedLessons(
        newTimetable,
        unplacedLessons,
        repairCtx
      );
      report.materie.assigned += repair.recovered;
      report.materie.recovered = repair.recovered;
      report.materie.swaps = repair.swaps;
      repair.stillMissing.forEach((lesson) =>
        report.materie.missing.push({
          classId: lesson.classId,
          teacherName: lesson.teacherName,
          subject: lesson.subject,
        })
      );

      // Terza passata: chiude le giornate da un'ora sola lasciate dalla
      // distribuzione.
      const consolidation = consolidateShortDays(newTimetable, repairCtx);
      report.materie.consolidated = consolidation.moved;
      report.materie.shortDaysLeft = consolidation.shortDaysLeft;
    }

    if (generateOptions.sostegno) {
      sostegno.forEach((sos) => {
        const assigns = sos.assignments || [];
        assigns.forEach((assign: any) => {
          const targetClassId = assign.classId;
          const targetHours = assign.hours;
          const occupiedSlots = newTimetable.filter(
            (slot) => slot.classId === targetClassId && slot.type === 'materia'
          );
          occupiedSlots.sort(() => Math.random() - 0.5);
          let assignedHours = 0;
          for (let i = 0; i < occupiedSlots.length; i++) {
            if (assignedHours >= targetHours) break;
            const baseSlot = occupiedSlots[i];
            if (isTeacherOff(newRules, sos.id, baseSlot.day, baseSlot.hour))
              continue;
            let hYest = 0,
              hTod = 0,
              hTom = 0;
            if (baseSlot.day > 0)
              hYest = newTimetable.filter(
                (s) => s.teacherId === sos.id && s.day === baseSlot.day - 1
              ).length;
            hTod = newTimetable.filter(
              (s) => s.teacherId === sos.id && s.day === baseSlot.day
            ).length;
            if (baseSlot.day < 5)
              hTom = newTimetable.filter(
                (s) => s.teacherId === sos.id && s.day === baseSlot.day + 1
              ).length;
            if (hYest + hTod + 1 > 10) continue;
            if (hTod + hTom + 1 > 10) continue;
            if (maxPerDayRule > 0 && hTod >= maxPerDayRule) continue;
            const isSostegnoBusy = newTimetable.some(
              (slot) =>
                slot.day === baseSlot.day &&
                slot.hour === baseSlot.hour &&
                slot.teacherId === sos.id
            );
            if (!isSostegnoBusy) {
              newTimetable.push({
                classId: targetClassId,
                day: baseSlot.day,
                hour: baseSlot.hour,
                teacherId: sos.id,
                subject: 'Sostegno',
                type: 'sostegno',
                room: 'Aula',
              });
              assignedHours++;
            }
          }
        });
      });
    }

    if (generateOptions.strumento) {
      strumento.forEach((str, strIdx) => {
        const assigns = str.assignments || [];
        // Se in "Aule" c'e' un'aula dedicata a questo strumento la si usa e la
        // si tratta come occupata; altrimenti resta l'etichetta generica
        // "Lab. Musica", che e' solo un nome sul tabellone: le lezioni di
        // strumento sono individuali e ogni docente ha il suo spazio.
        const configuredRoom = getRoomForSubject(str.subject, rooms);
        const strumentoRoom =
          configuredRoom !== 'Aula' ? configuredRoom : 'Lab. Musica';
        const roomIsExclusive = configuredRoom !== 'Aula';
        const roomTaken = (day: number, hour: number) =>
          roomIsExclusive &&
          isRoomFull(newTimetable, strumentoRoom, day, hour, rooms);
        if (assigns.length > 0) {
          assigns.forEach((assign: any) => {
            const targetClassId = assign.classId;
            const targetHours = assign.hours;
            let assignedHours = 0;
            const possibleSlots: any[] = [];
            for (let d = 0; d < 5; d++)
              for (let h = 6; h < 12; h++)
                possibleSlots.push({ day: d, hour: h });
            possibleSlots.sort(() => Math.random() - 0.5);
            for (let i = 0; i < possibleSlots.length; i++) {
              if (assignedHours >= targetHours) break;
              const slot = possibleSlots[i];
              if (isTeacherOff(newRules, str.id, slot.day, slot.hour)) continue;
              const isBusy = newTimetable.some(
                (s) =>
                  s.teacherId === str.id &&
                  s.day === slot.day &&
                  s.hour === slot.hour
              );
              const classBusy = newTimetable.some(
                (s) =>
                  s.classId === targetClassId &&
                  s.day === slot.day &&
                  s.hour === slot.hour
              );
              if (!isBusy && !classBusy && !roomTaken(slot.day, slot.hour)) {
                newTimetable.push({
                  classId: targetClassId,
                  day: slot.day,
                  hour: slot.hour,
                  teacherId: str.id,
                  subject: str.subject,
                  type: 'pomeriggio_musica',
                  room: strumentoRoom,
                });
                assignedHours++;
              }
            }
          });
        } else {
          const targetClasses = classes.map((c) => c.id).slice(0, 7);
          targetClasses.forEach((cId, index) => {
            const day = (strIdx + index) % 5;
            const hour = 6 + ((strIdx + index) % afternoonHours.length);
            if (isTeacherOff(newRules, str.id, day, hour)) return;
            // Anche la distribuzione automatica deve guardare dove mette le
            // ore: prima spingeva la lezione nella cella qualunque cosa ci
            // fosse dentro, docente o classe gia' occupati compresi.
            const teacherBusy = newTimetable.some(
              (s) => s.teacherId === str.id && s.day === day && s.hour === hour
            );
            const classBusy = newTimetable.some(
              (s) => s.classId === cId && s.day === day && s.hour === hour
            );
            if (teacherBusy || classBusy || roomTaken(day, hour)) return;
            newTimetable.push({
              classId: cId,
              day,
              hour,
              teacherId: str.id,
              subject: `${str.subject}`,
              type: 'pomeriggio_musica',
              room: strumentoRoom,
            });
          });
        }
      });
    }
    setTimetable(newTimetable);
    setGenerationReport(report);
    pushDataToCloud(
      newTimetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      newRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const handleAlignSostegno = () => {
    if (readOnlyMode) return;
    let newTimetable = timetable.filter((s) => s.type !== 'sostegno');
    const materieSlots = timetable.filter((s) => s.type === 'materia');
    sostegno.forEach((sos) => {
      const assigns = sos.assignments || [];
      assigns.forEach((assign: any) => {
        const classMaterie = materieSlots.filter(
          (s) => s.classId === assign.classId
        );
        let placed = 0;
        const shuffled = [...classMaterie].sort(() => Math.random() - 0.5);
        for (let slot of shuffled) {
          if (placed >= assign.hours) break;
          const isBusy = newTimetable.some(
            (s) =>
              s.teacherId === sos.id &&
              s.day === slot.day &&
              s.hour === slot.hour
          );
          if (!isBusy) {
            newTimetable.push({
              ...slot,
              teacherId: sos.id,
              subject: 'Sostegno',
              type: 'sostegno',
              locked: false,
            });
            placed++;
          }
        }
      });
    });
    setTimetable(newTimetable);
    pushDataToCloud(
      newTimetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const executeCellUpdate = (
    teacherId: string,
    day: number,
    hour: number,
    newClassId: string,
    staffType: string
  ) => {
    const typeToClear =
      staffType === 'sostegno'
        ? 'sostegno'
        : staffType === 'strumento'
        ? 'pomeriggio_musica'
        : 'materia';
    let filtered = timetable.filter(
      (slot) =>
        !(
          slot.teacherId === teacherId &&
          slot.day === day &&
          slot.hour === hour &&
          slot.type === typeToClear
        )
    );
    filtered = filtered.filter(
      (slot) =>
        !(
          slot.classId === newClassId &&
          slot.day === day &&
          slot.hour === hour &&
          slot.type === typeToClear
        )
    );
    if (newClassId !== '') {
      let type = typeToClear,
        subject = '',
        room = tempRoom;
      if (staffType === 'sostegno') {
        subject = 'Sostegno';
        room = 'Aula';
      } else if (staffType === 'strumento') {
        subject =
          strumento.find((m) => m.id === teacherId)?.subject || 'Strumento';
        room = 'Lab. Musica';
      } else {
        type = isRientroHour(newClassId, hour) ? 'pomeriggio_musica' : 'materia';
        subject =
          teachers.find((t) => t.id === teacherId)?.subject || 'Lezione';
        room = roomTouched ? tempRoom : getRoomForSubject(subject, rooms);
      }
      filtered.push({
        classId: newClassId,
        day,
        hour,
        teacherId,
        subject,
        type,
        room,
      });
    }
    setTimetable(filtered);
    pushDataToCloud(
      filtered,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const handleUpdateCellDirectly = (
    teacherId: string,
    day: number,
    hour: number,
    newClassId: string,
    staffType: string
  ) => {
    if (readOnlyMode) return;
    if (newClassId === '') {
      executeCellUpdate(teacherId, day, hour, newClassId, staffType);
      return;
    }
    let actualStaffType = staffType;
    if (!actualStaffType) {
      const tDoc = allStaff.find((t) => t.id === teacherId);
      actualStaffType = tDoc?.staffType || 'materia';
    }
    const typeToClear =
      actualStaffType === 'sostegno'
        ? 'sostegno'
        : actualStaffType === 'strumento'
        ? 'pomeriggio_musica'
        : 'materia';
    if (typeToClear === 'materia') {
      const dailyClassLessons = timetable.filter(
        (slot) =>
          slot.classId === newClassId &&
          slot.day === day &&
          slot.teacherId === teacherId &&
          slot.hour !== hour &&
          slot.type === 'materia'
      );
      if (dailyClassLessons.length >= 3) {
        setConflictModal({
          type: 'warning',
          title: 'Limite Ore Superato',
          message: `Il docente ${
            allStaff.find((t) => t.id === teacherId)?.name
          } ha già 3 ore nella classe ${newClassId}.`,
          hideSwap: true,
          onConfirm: () => {
            executeCellUpdate(
              teacherId,
              day,
              hour,
              newClassId,
              actualStaffType
            );
            setConflictModal(null);
          },
        });
        return;
      }
    }
    const conflictingSlot = timetable.find(
      (slot) =>
        slot.classId === newClassId &&
        slot.day === day &&
        slot.hour === hour &&
        slot.type === typeToClear &&
        slot.teacherId !== teacherId
    );
    if (conflictingSlot) {
      setConflictModal({
        type: 'conflict',
        title: 'Conflitto Rilevato!',
        message: `La classe ${newClassId} è già con ${
          allStaff.find((t) => t.id === conflictingSlot.teacherId)?.name
        }.`,
        onSwap: () => {
          const oldSlot = timetable.find(
            (s) =>
              s.teacherId === teacherId &&
              s.day === day &&
              s.hour === hour &&
              s.type === typeToClear
          );
          let newTimetable = timetable.filter(
            (s) => s !== conflictingSlot && s !== oldSlot
          );
          let type1 = typeToClear,
            type2 = typeToClear;
          if (isRientroHour(newClassId, hour) && typeToClear === 'materia')
            type1 = 'pomeriggio_musica';
          newTimetable.push({
            classId: newClassId,
            day,
            hour,
            teacherId,
            subject:
              allStaff.find((t) => t.id === teacherId)?.subject || 'Materia',
            type: type1,
            room: tempRoom,
          });
          if (oldSlot) {
            if (isRientroHour(oldSlot.classId, hour) && typeToClear === 'materia')
              type2 = 'pomeriggio_musica';
            newTimetable.push({
              classId: oldSlot.classId,
              day,
              hour,
              teacherId: conflictingSlot.teacherId,
              subject: conflictingSlot.subject,
              type: type2,
              room: conflictingSlot.room,
            });
          }
          setTimetable(newTimetable);
          pushDataToCloud(
            newTimetable,
            teachers,
            sostegno,
            sectionsConfig,
            strumento,
            diurnalHours,
            afternoonHours,
            generationRules,
            generateOptions,
            cellNotes,
            groupConstraints,
            mixedClasses
          );
          setConflictModal(null);
        },
        onForce: () => {
          executeCellUpdate(teacherId, day, hour, newClassId, actualStaffType);
          setConflictModal(null);
        },
      });
      return;
    }
    executeCellUpdate(teacherId, day, hour, newClassId, actualStaffType);
  };

  const handleStaffDetailChange = (
    id: string,
    field: string,
    value: string,
    staffType: string
  ) => {
    if (readOnlyMode) return;
    let updatedTeachers = [...teachers],
      updatedSostegno = [...sostegno],
      updatedStrumento = [...strumento];
    if (staffType === 'materia') {
      updatedTeachers = teachers.map((t) =>
        t.id === id ? { ...t, [field]: value.toUpperCase() } : t
      );
      setTeachers(updatedTeachers);
    } else if (staffType === 'sostegno') {
      updatedSostegno = sostegno.map((s) =>
        s.id === id ? { ...s, [field]: value.toUpperCase() } : s
      );
      setSostegno(updatedSostegno);
    } else if (staffType === 'strumento') {
      updatedStrumento = strumento.map((m) =>
        m.id === id ? { ...m, [field]: value.toUpperCase() } : m
      );
      setStrumento(updatedStrumento);
    }
    pushDataToCloud(
      timetable,
      updatedTeachers,
      updatedSostegno,
      sectionsConfig,
      updatedStrumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  /**
   * L'ordine delle liste docenti è l'ordine di inserimento, ed è quello che
   * si vede ovunque: registro cattedre, quadro master, stampe. Chi aggiunge
   * una collega a metà anno se la ritrova in coda, staccata dal suo
   * dipartimento (e senza la riga di separazione, che guarda solo la
   * materia della riga precedente). Queste due funzioni servono a
   * rimetterla al suo posto.
   */
  const reorderStaffList = (list: any[], id: string, direction: number) => {
    const idx = list.findIndex((s) => s.id === id);
    const target = idx + direction;
    if (idx < 0 || target < 0 || target >= list.length) return null;
    const next = [...list];
    next[idx] = list[target];
    next[target] = list[idx];
    return next;
  };

  const persistStaffLists = (
    updatedTeachers: any[],
    updatedSostegno: any[],
    updatedStrumento: any[]
  ) => {
    pushDataToCloud(
      timetable,
      updatedTeachers,
      updatedSostegno,
      sectionsConfig,
      updatedStrumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  /** Sposta un docente di una posizione su (-1) o giù (+1) nel suo elenco. */
  const handleMoveStaff = (
    id: string,
    direction: number,
    staffType: string
  ) => {
    if (readOnlyMode) return;
    if (staffType === 'materia') {
      const next = reorderStaffList(teachers, id, direction);
      if (!next) return;
      setTeachers(next);
      persistStaffLists(next, sostegno, strumento);
    } else if (staffType === 'sostegno') {
      const next = reorderStaffList(sostegno, id, direction);
      if (!next) return;
      setSostegno(next);
      persistStaffLists(teachers, next, strumento);
    } else if (staffType === 'strumento') {
      const next = reorderStaffList(strumento, id, direction);
      if (!next) return;
      setStrumento(next);
      persistStaffLists(teachers, sostegno, next);
    }
  };

  /** Riordina l'elenco per materia e, a parità di materia, per nome. */
  const handleSortStaffBySubject = (staffType: string) => {
    if (readOnlyMode) return;
    const bySubject = (a: any, b: any) =>
      (a.subject || '').localeCompare(b.subject || '') ||
      (a.name || '').localeCompare(b.name || '');
    if (staffType === 'materia') {
      const next = [...teachers].sort(bySubject);
      setTeachers(next);
      persistStaffLists(next, sostegno, strumento);
    } else if (staffType === 'sostegno') {
      const next = [...sostegno].sort(bySubject);
      setSostegno(next);
      persistStaffLists(teachers, next, strumento);
    } else if (staffType === 'strumento') {
      const next = [...strumento].sort(bySubject);
      setStrumento(next);
      persistStaffLists(teachers, sostegno, next);
    }
  };

  const handleToggleConsecutive = (
    id: string,
    value: boolean,
    staffType: string
  ) => {
    if (readOnlyMode) return;
    let updatedTeachers = [...teachers],
      updatedSostegno = [...sostegno],
      updatedStrumento = [...strumento];
    if (staffType === 'materia') {
      updatedTeachers = teachers.map((t) =>
        t.id === id ? { ...t, preferConsecutive: value } : t
      );
      setTeachers(updatedTeachers);
    } else if (staffType === 'sostegno') {
      updatedSostegno = sostegno.map((s) =>
        s.id === id ? { ...s, preferConsecutive: value } : s
      );
      setSostegno(updatedSostegno);
    } else if (staffType === 'strumento') {
      updatedStrumento = strumento.map((m) =>
        m.id === id ? { ...m, preferConsecutive: value } : m
      );
      setStrumento(updatedStrumento);
    }
    pushDataToCloud(
      timetable,
      updatedTeachers,
      updatedSostegno,
      sectionsConfig,
      updatedStrumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const handleUpdateRules = (
    field: string,
    value: any,
    teacherId: string | null = null
  ) => {
    if (readOnlyMode) return;
    let newRules = { ...generationRules };
    if (!newRules.teacherDaysOff) newRules.teacherDaysOff = {};
    if (!newRules.teacherHoursOff) newRules.teacherHoursOff = {};
    if (!newRules.teacherMaxGapHours) newRules.teacherMaxGapHours = {};
    if (teacherId) {
      if (field === 'teacherDaysOff')
        newRules.teacherDaysOff[teacherId] = value;
      else if (field === 'teacherHoursOff')
        newRules.teacherHoursOff[teacherId] = value;
      else if (value === -1) delete newRules[field][teacherId];
      else newRules[field][teacherId] = value;
    } else {
      newRules[field] = value;
    }
    setGenerationRules(newRules);
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      newRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const handleUpdateGenOptions = (field: string, value: boolean) => {
    if (readOnlyMode) return;
    const newOpts = { ...generateOptions, [field]: value };
    setGenerateOptions(newOpts);
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      newOpts,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const handleHourLabelChange = (
    index: number,
    field: string,
    value: string | number,
    isDiurnal = true
  ) => {
    if (readOnlyMode) return;
    let updatedHours = [];
    if (isDiurnal) {
      updatedHours = diurnalHours.map((h) =>
        h.index === index ? { ...h, [field]: value } : h
      );
      setDiurnalHours(updatedHours);
      pushDataToCloud(
        timetable,
        teachers,
        sostegno,
        sectionsConfig,
        strumento,
        updatedHours,
        afternoonHours,
        generationRules,
        generateOptions,
        cellNotes,
        groupConstraints,
        mixedClasses
      );
    } else {
      updatedHours = afternoonHours.map((h) =>
        h.index === index ? { ...h, [field]: value } : h
      );
      setAfternoonHours(updatedHours);
      pushDataToCloud(
        timetable,
        teachers,
        sostegno,
        sectionsConfig,
        strumento,
        diurnalHours,
        updatedHours,
        generationRules,
        generateOptions,
        cellNotes,
        groupConstraints,
        mixedClasses
      );
    }
  };

  const handleDeleteStaff = (id: string, staffType: string) => {
    if (readOnlyMode) return;
    let updatedTeachers = [...teachers],
      updatedSostegno = [...sostegno],
      updatedStrumento = [...strumento];
    if (staffType === 'materia') {
      updatedTeachers = teachers.filter((t) => t.id !== id);
      setTeachers(updatedTeachers);
    } else if (staffType === 'sostegno') {
      updatedSostegno = sostegno.filter((s) => s.id !== id);
      setSostegno(updatedSostegno);
    } else if (staffType === 'strumento') {
      updatedStrumento = strumento.filter((m) => m.id !== id);
      setStrumento(updatedStrumento);
    }
    const updatedTimetable = timetable.filter((slot) => slot.teacherId !== id);
    setTimetable(updatedTimetable);
    pushDataToCloud(
      updatedTimetable,
      updatedTeachers,
      updatedSostegno,
      sectionsConfig,
      updatedStrumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const handleCreateTeacherDirectly = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnlyMode || !newTeacherName.trim() || !newTeacherSubject.trim())
      return;
    const newId = `staff_${Date.now()}`;
    let updatedTeachers = [...teachers],
      updatedSostegno = [...sostegno],
      updatedStrumento = [...strumento];
    if (newTeacherType === 'materia') {
      updatedTeachers = [
        ...teachers,
        {
          id: newId,
          name: newTeacherName.toUpperCase(),
          subject: newTeacherSubject.toUpperCase(),
          color: newTeacherColor,
          assignments: [],
        },
      ];
      setTeachers(updatedTeachers);
    } else if (newTeacherType === 'sostegno') {
      updatedSostegno = [
        ...sostegno,
        {
          id: newId,
          name: newTeacherName.toUpperCase(),
          subject: 'SOSTEGNO',
          color: newTeacherColor,
          assignments: [],
        },
      ];
      setSostegno(updatedSostegno);
    } else if (newTeacherType === 'strumento') {
      updatedStrumento = [
        ...strumento,
        {
          id: newId,
          name: newTeacherName.toUpperCase(),
          subject: newTeacherSubject.toUpperCase(),
          color: newTeacherColor,
          assignments: [],
        },
      ];
      setStrumento(updatedStrumento);
    }
    setNewTeacherName('');
    setNewTeacherSubject('');
    pushDataToCloud(
      timetable,
      updatedTeachers,
      updatedSostegno,
      sectionsConfig,
      updatedStrumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const executeAssignTeacher = (teacherId: string, staffType: string) => {
    if (!editingCell) return;
    const { classId, day, hour } = editingCell;
    const typeToClear =
      staffType === 'sostegno'
        ? 'sostegno'
        : staffType === 'strumento'
        ? 'pomeriggio_musica'
        : 'materia';
    let filtered = timetable.filter(
      (slot) =>
        !(
          slot.classId === classId &&
          slot.day === day &&
          slot.hour === hour &&
          slot.type === typeToClear
        )
    );
    filtered = filtered.filter(
      (slot) =>
        !(
          slot.teacherId === teacherId &&
          slot.day === day &&
          slot.hour === hour &&
          slot.type === typeToClear
        )
    );
    const tDoc = allStaff.find((t) => t.id === teacherId);
    let type = typeToClear,
      room = tempRoom;
    if (type === 'materia') {
      type = isRientroHour(classId, hour) ? 'pomeriggio_musica' : 'materia';
      room = roomTouched
        ? tempRoom
        : getRoomForSubject(tDoc?.subject || '', rooms);
    } else if (type === 'sostegno') {
      room = 'Aula';
    } else {
      room = 'Lab. Musica';
    }
    filtered.push({
      classId,
      day,
      hour,
      teacherId,
      subject: tDoc ? tDoc.subject : 'Lezione',
      type,
      room,
    });
    setTimetable(filtered);
    setEditingCell(null);
    pushDataToCloud(
      filtered,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const handleAssignTeacher = (teacherId: string, isSostegno = false) => {
    if (readOnlyMode || !editingCell) return;
    const { classId, day, hour } = editingCell;
    let actualStaffType = isSostegno ? 'sostegno' : 'materia';
    const teacherDoc = allStaff.find((t) => t.id === teacherId);
    if (teacherDoc && teacherDoc.staffType === 'strumento')
      actualStaffType = 'strumento';
    const typeToClear =
      actualStaffType === 'sostegno'
        ? 'sostegno'
        : actualStaffType === 'strumento'
        ? 'pomeriggio_musica'
        : 'materia';
    if (teacherId === 'cancella') {
      let filtered = timetable.filter(
        (slot) =>
          !(
            slot.classId === classId &&
            slot.day === day &&
            slot.hour === hour &&
            slot.type === (isSostegno ? 'sostegno' : 'materia')
          )
      );
      setTimetable(filtered);
      setEditingCell(null);
      pushDataToCloud(
        filtered,
        teachers,
        sostegno,
        sectionsConfig,
        strumento,
        diurnalHours,
        afternoonHours,
        generationRules,
        generateOptions,
        cellNotes,
        groupConstraints,
        mixedClasses
      );
      return;
    }
    if (actualStaffType === 'materia') {
      const dailyClassLessons = timetable.filter(
        (slot) =>
          slot.classId === classId &&
          slot.day === day &&
          slot.teacherId === teacherId &&
          slot.hour !== hour &&
          slot.type === 'materia'
      );
      if (dailyClassLessons.length >= 3) {
        setConflictModal({
          type: 'warning',
          title: 'Limite Ore Superato',
          message: `Il docente ${teacherDoc?.name} ha già 3 ore in questa classe.`,
          hideSwap: true,
          onConfirm: () => {
            executeAssignTeacher(teacherId, actualStaffType);
            setConflictModal(null);
          },
        });
        return;
      }
    }
    const conflictingSlot = timetable.find(
      (slot) =>
        slot.teacherId === teacherId &&
        slot.day === day &&
        slot.hour === hour &&
        slot.classId !== classId &&
        slot.type === typeToClear
    );
    if (conflictingSlot) {
      setConflictModal({
        type: 'conflict',
        title: 'Conflitto Rilevato!',
        message: `Il docente ${teacherDoc?.name} è già nella classe ${conflictingSlot.classId}.`,
        onSwap: () => {
          const oldSlotInClass = timetable.find(
            (s) =>
              s.classId === classId &&
              s.day === day &&
              s.hour === hour &&
              s.type === typeToClear
          );
          let newTimetable = timetable.filter(
            (s) => s !== conflictingSlot && s !== oldSlotInClass
          );
          let type1 = typeToClear,
            type2 = typeToClear;
          if (isRientroHour(classId, hour) && typeToClear === 'materia')
            type1 = 'pomeriggio_musica';
          newTimetable.push({
            classId,
            day,
            hour,
            teacherId,
            subject: teacherDoc?.subject || 'Materia',
            type: type1,
            room: tempRoom,
          });
          if (oldSlotInClass) {
            if (
              isRientroHour(conflictingSlot.classId, hour) &&
              typeToClear === 'materia'
            )
              type2 = 'pomeriggio_musica';
            newTimetable.push({
              classId: conflictingSlot.classId,
              day,
              hour,
              teacherId: oldSlotInClass.teacherId,
              subject: oldSlotInClass.subject,
              type: type2,
              room: oldSlotInClass.room,
            });
          }
          setTimetable(newTimetable);
          setEditingCell(null);
          pushDataToCloud(
            newTimetable,
            teachers,
            sostegno,
            sectionsConfig,
            strumento,
            diurnalHours,
            afternoonHours,
            generationRules,
            generateOptions,
            cellNotes,
            groupConstraints,
            mixedClasses
          );
          setConflictModal(null);
        },
        onForce: () => {
          executeAssignTeacher(teacherId, actualStaffType);
          setConflictModal(null);
        },
      });
      return;
    }
    executeAssignTeacher(teacherId, actualStaffType);
  };

  const handleUpdateAssignment = (
    staffId: string,
    classId: string,
    hours: number,
    staffType: string
  ) => {
    if (readOnlyMode) return;
    let updatedList = [];
    const updateLogic = (list: any[]) =>
      list.map((t) => {
        if (t.id === staffId) {
          let assigns = [...(t.assignments || [])];
          const idx = assigns.findIndex((a) => a.classId === classId);
          if (hours <= 0) {
            if (idx !== -1) assigns.splice(idx, 1);
          } else {
            if (idx !== -1) assigns[idx].hours = hours;
            else assigns.push({ classId, hours });
          }
          return { ...t, assignments: assigns };
        }
        return t;
      });
    if (staffType === 'materia') {
      updatedList = updateLogic(teachers);
      setTeachers(updatedList);
      pushDataToCloud(
        timetable,
        updatedList,
        sostegno,
        sectionsConfig,
        strumento,
        diurnalHours,
        afternoonHours,
        generationRules,
        generateOptions,
        cellNotes,
        groupConstraints,
        mixedClasses
      );
    } else if (staffType === 'sostegno') {
      updatedList = updateLogic(sostegno);
      setSostegno(updatedList);
      pushDataToCloud(
        timetable,
        teachers,
        updatedList,
        sectionsConfig,
        strumento,
        diurnalHours,
        afternoonHours,
        generationRules,
        generateOptions,
        cellNotes,
        groupConstraints,
        mixedClasses
      );
    } else if (staffType === 'strumento') {
      updatedList = updateLogic(strumento);
      setStrumento(updatedList);
      pushDataToCloud(
        timetable,
        teachers,
        sostegno,
        sectionsConfig,
        updatedList,
        diurnalHours,
        afternoonHours,
        generationRules,
        generateOptions,
        cellNotes,
        groupConstraints,
        mixedClasses
      );
    }
  };

  const handleSaveAssignmentModal = () => {
    if (!assignClass || assignHours <= 0) return;
    handleUpdateAssignment(
      assignModal.staffId,
      assignClass,
      assignHours,
      assignModal.staffType
    );
    setAssignModal(null);
    setAssignClass('');
    setAssignHours(1);
  };

  const handleResetAllAssignments = () => {
    if (readOnlyMode) return;
    const resetList = (list: any[]) =>
      list.map((item) => ({ ...item, assignments: [] }));
    const newTeachers = resetList(teachers);
    const newSostegno = resetList(sostegno);
    const newStrumento = resetList(strumento);
    setTeachers(newTeachers);
    setSostegno(newSostegno);
    setStrumento(newStrumento);
    setTimetable([]);
    setCellNotes({});
    pushDataToCloud(
      [],
      newTeachers,
      newSostegno,
      sectionsConfig,
      newStrumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      {},
      groupConstraints,
      mixedClasses
    );
    setShowResetModal(false);
  };

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnlyMode) return;
    const name = newSectionName.trim().toUpperCase();
    if (!name || sectionsConfig[name]) return;
    const newConfig = {
      ...sectionsConfig,
      [name]: { model: 'modelloA', years: [1, 2, 3] },
    };
    setSectionsConfig(newConfig);
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      newConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
    setNewSectionName('');
  };

  const handleDeleteSection = (secName: string) => {
    if (readOnlyMode) return;
    setSectionActionModal({ type: 'delete', name: secName });
  };

  const executeDeleteSection = (secName: string) => {
    const newConfig = { ...sectionsConfig };
    delete newConfig[secName];
    const removeAssignments = (staffList: any[]) =>
      staffList.map((t) => ({
        ...t,
        assignments: (t.assignments || []).filter(
          (a: any) => !a.classId.endsWith(secName)
        ),
      }));
    const newTeachers = removeAssignments(teachers);
    const newSostegno = removeAssignments(sostegno);
    const newStrumento = removeAssignments(strumento);
    const newTimetable = timetable.filter(
      (slot) => !slot.classId.endsWith(secName)
    );
    setSectionsConfig(newConfig);
    setTeachers(newTeachers);
    setSostegno(newSostegno);
    setStrumento(newStrumento);
    setTimetable(newTimetable);
    pushDataToCloud(
      newTimetable,
      newTeachers,
      newSostegno,
      newConfig,
      newStrumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const handleRenameSection = (oldName: string, newName: string) => {
    if (
      readOnlyMode ||
      !newName ||
      oldName === newName ||
      sectionsConfig[newName]
    )
      return;
    const newConfig = { ...sectionsConfig };
    newConfig[newName] = newConfig[oldName];
    delete newConfig[oldName];
    const renameClass = (classId: string) =>
      classId.endsWith(oldName)
        ? classId.slice(0, -oldName.length) + newName
        : classId;
    const updateAssignments = (staffList: any[]) =>
      staffList.map((t) => ({
        ...t,
        assignments: (t.assignments || []).map((a: any) => ({
          ...a,
          classId: renameClass(a.classId),
        })),
      }));
    const newTeachers = updateAssignments(teachers);
    const newSostegno = updateAssignments(sostegno);
    const newStrumento = updateAssignments(strumento);
    const newTimetable = timetable.map((slot) => ({
      ...slot,
      classId: renameClass(slot.classId),
    }));
    setSectionsConfig(newConfig);
    setTeachers(newTeachers);
    setSostegno(newSostegno);
    setStrumento(newStrumento);
    setTimetable(newTimetable);
    if (selectedClass.endsWith(oldName))
      setSelectedClass(selectedClass.slice(0, -oldName.length) + newName);
    pushDataToCloud(
      newTimetable,
      newTeachers,
      newSostegno,
      newConfig,
      newStrumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const handleUpdateSection = (secName: string, field: string, value: any) => {
    if (readOnlyMode) return;
    const currentConfig = sectionsConfig[secName];
    const oldYears =
      typeof currentConfig === 'string'
        ? secName === 'G'
          ? [2, 3]
          : [1, 2, 3]
        : currentConfig.years;
    const oldModel =
      typeof currentConfig === 'string' ? currentConfig : currentConfig.model;
    const oldSedeId =
      typeof currentConfig === 'string' ? undefined : currentConfig.sedeId;
    const oldWeeklyHours =
      typeof currentConfig === 'string' ? undefined : currentConfig.weeklyHours;
    const newConfig = { ...sectionsConfig };
    newConfig[secName] = {
      model: field === 'model' ? value : oldModel,
      years: field === 'years' ? value : oldYears,
      sedeId: field === 'sedeId' ? value || undefined : oldSedeId,
      weeklyHours:
        field === 'weeklyHours' ? value || undefined : oldWeeklyHours,
    };
    if (field === 'years') {
      const removedYears = oldYears.filter((y: number) => !value.includes(y));
      if (removedYears.length > 0) {
        const classesToRemove = removedYears.map(
          (y: number) => `${y}${secName}`
        );
        let updatedTeachers = teachers.map((t) => ({
          ...t,
          assignments: (t.assignments || []).filter(
            (a: any) => !classesToRemove.includes(a.classId)
          ),
        }));
        let updatedSostegno = sostegno.map((s) => ({
          ...s,
          assignments: (s.assignments || []).filter(
            (a: any) => !classesToRemove.includes(a.classId)
          ),
        }));
        let updatedStrumento = strumento.map((s) => ({
          ...s,
          assignments: (s.assignments || []).filter(
            (a: any) => !classesToRemove.includes(a.classId)
          ),
        }));
        let updatedTimetable = timetable.filter(
          (slot) => !classesToRemove.includes(slot.classId)
        );
        setTeachers(updatedTeachers);
        setSostegno(updatedSostegno);
        setStrumento(updatedStrumento);
        setTimetable(updatedTimetable);
        setSectionsConfig(newConfig);
        if (classesToRemove.includes(selectedClass))
          setSelectedClass(
            classes.find((c) => !classesToRemove.includes(c.id))?.id || ''
          );
        pushDataToCloud(
          updatedTimetable,
          updatedTeachers,
          updatedSostegno,
          newConfig,
          updatedStrumento,
          diurnalHours,
          afternoonHours,
          generationRules,
          generateOptions,
          cellNotes,
          groupConstraints,
          mixedClasses
        );
        return;
      }
    }
    setSectionsConfig(newConfig);
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      newConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  /**
   * Cambia la griglia di un modello: quanti giorni, quante ore al giorno, se
   * c'è il rientro pomeridiano. Sono gli stessi numeri che prima erano
   * scritti nel codice del generatore.
   */
  const handleUpdateModelGrid = (
    model: string,
    field: 'days' | 'hours' | 'rientro',
    value: any
  ) => {
    if (readOnlyMode) return;
    const current =
      modelGrids?.[model] ||
      DEFAULT_MODEL_GRIDS[model] ||
      DEFAULT_MODEL_GRIDS.modelloB;
    const next = normalizeModelGrids({
      ...modelGrids,
      [model]: { ...current, [field]: value },
    });
    modelGridsRef.current = next;
    setModelGrids(next);
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses
    );
  };

  const pushRooms = (newRooms: any[]) => {
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses,
      newRooms
    );
  };

  const parseSubjects = (text: string) =>
    text
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnlyMode) return;
    const name = newRoomName.trim();
    if (!name || rooms.some((r) => r.name === name)) return;
    const newRooms = [
      ...rooms,
      { id: `room_${Date.now()}`, name, subjects: parseSubjects(newRoomSubjects) },
    ];
    setRooms(newRooms);
    pushRooms(newRooms);
    setNewRoomName('');
    setNewRoomSubjects('');
  };

  const handleDeleteRoom = (id: string) => {
    if (readOnlyMode) return;
    const newRooms = rooms.filter((r) => r.id !== id);
    setRooms(newRooms);
    pushRooms(newRooms);
  };

  const handleRenameRoom = (id: string, newName: string) => {
    if (readOnlyMode || !newName.trim()) return;
    const newRooms = rooms.map((r) =>
      r.id === id ? { ...r, name: newName.trim() } : r
    );
    setRooms(newRooms);
    pushRooms(newRooms);
  };

  const handleUpdateRoomSubjects = (id: string, subjectsText: string) => {
    if (readOnlyMode) return;
    const newRooms = rooms.map((r) =>
      r.id === id ? { ...r, subjects: parseSubjects(subjectsText) } : r
    );
    setRooms(newRooms);
    pushRooms(newRooms);
  };

  const handleUpdateRoomCapacity = (roomId: string, value: string) => {
    if (readOnlyMode) return;
    const n = Math.max(1, Math.min(12, parseInt(value) || 1));
    const newRooms = rooms.map((r) =>
      r.id === roomId ? { ...r, capacity: n } : r
    );
    setRooms(newRooms);
    pushRooms(newRooms);
  };

  const handleUpdateRoomSede = (roomId: string, sedeId: string) => {
    if (readOnlyMode) return;
    const newRooms = rooms.map((r) =>
      r.id === roomId ? { ...r, sedeId: sedeId || undefined } : r
    );
    setRooms(newRooms);
    pushRooms(newRooms);
  };

  const pushSedi = (newSedi: any[]) => {
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses,
      rooms,
      newSedi
    );
  };

  const handleAddSede = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnlyMode) return;
    const name = newSedeName.trim();
    if (!name || sedi.some((s) => s.name === name)) return;
    const newSedi = [...sedi, { id: `sede_${Date.now()}`, name }];
    setSedi(newSedi);
    pushSedi(newSedi);
    setNewSedeName('');
  };

  const handleDeleteSede = (id: string) => {
    if (readOnlyMode) return;
    const newSedi = sedi.filter((s) => s.id !== id);
    const newRooms = rooms.map((r) =>
      r.sedeId === id ? { ...r, sedeId: undefined } : r
    );
    const newSectionsConfig: any = {};
    Object.entries(sectionsConfig).forEach(([sec, cfg]: any) => {
      newSectionsConfig[sec] =
        cfg && cfg.sedeId === id ? { ...cfg, sedeId: undefined } : cfg;
    });
    setSedi(newSedi);
    setRooms(newRooms);
    setSectionsConfig(newSectionsConfig);
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      newSectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses,
      newRooms,
      newSedi
    );
  };

  const handleRenameSede = (id: string, newName: string) => {
    if (readOnlyMode || !newName.trim()) return;
    const newSedi = sedi.map((s) =>
      s.id === id ? { ...s, name: newName.trim() } : s
    );
    setSedi(newSedi);
    pushSedi(newSedi);
  };

  const pushAbsencesSubs = (newAbsences: any[], newSubstitutions: any[]) => {
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses,
      rooms,
      sedi,
      newAbsences,
      newSubstitutions
    );
  };

  /**
   * Chi è già occupato in quell'ora: le lezioni dell'orario, ma anche le
   * supplenze e gli anticipi già decisi per quella data. Senza la seconda
   * metà lo stesso docente poteva essere proposto due volte nella stessa
   * ora di due assenze diverse.
   */
  const busyTeacherIdsAt = (day: number, hour: number, date: string) => {
    const busy = new Set(
      timetable
        .filter((s) => s.day === day && s.hour === hour)
        .map((s) => s.teacherId)
    );
    substitutions
      .filter(
        (sub) => sub.date === date && sub.hour === hour && sub.teacherSubstitute
      )
      .forEach((sub) => busy.add(sub.teacherSubstitute));
    return busy;
  };

  /**
   * Per un'assenza di tipo assenza/permesso: le ore della cattedra del
   * docente in quel giorno, con stato di copertura (sostegno già presente,
   * già assegnato un sostituto, o da coprire) e candidati sostituti
   * ordinati per priorità (1: insegna già in quella classe, 2: stessa
   * materia dell'assente, 3: altri disponibili).
   */
  const getSubstitutionSuggestions = (absence: any) => {
    if (absence.type !== 'assenza' && absence.type !== 'permesso') return [];
    const day = getDayIndexFromDate(absence.date);
    if (day < 0) return [];
    const absentTeacher = teachers.find((t) => t.id === absence.teacherId);
    const teacherLessons = timetable
      .filter(
        (s) =>
          s.teacherId === absence.teacherId &&
          s.day === day &&
          (s.type === 'materia' || s.type === 'pomeriggio_musica') &&
          (absence.fromHour === undefined || s.hour >= absence.fromHour) &&
          (absence.toHour === undefined || s.hour <= absence.toHour)
      )
      .sort((a, b) => a.hour - b.hour);

    return teacherLessons.map((lesson) => {
      const existingSub = substitutions.find(
        (sub) =>
          sub.absenceId === absence.id &&
          sub.day === day &&
          sub.hour === lesson.hour
      );
      const coveredBySostegno = timetable.some(
        (s) =>
          s.type === 'sostegno' &&
          s.classId === lesson.classId &&
          s.day === day &&
          s.hour === lesson.hour
      );
      let candidates: any[] = [];
      if (!coveredBySostegno && !existingSub) {
        const busyTeacherIds = busyTeacherIdsAt(
          day,
          lesson.hour,
          absence.date
        );
        candidates = teachers
          .filter(
            (t) =>
              t.id !== absence.teacherId &&
              t.availableForPaidSubstitution &&
              !isTeacherOff(generationRules, t.id, day, lesson.hour) &&
              !busyTeacherIds.has(t.id)
          )
          .map((t) => {
            const teachesThisClass = (t.assignments || []).some(
              (a: any) => a.classId === lesson.classId
            );
            const sameSubject = t.subject === absentTeacher?.subject;
            const priority = teachesThisClass ? 0 : sameSubject ? 1 : 2;
            return {
              teacherId: t.id,
              name: t.name,
              subject: t.subject,
              priority,
            };
          })
          .sort((a, b) => a.priority - b.priority);
      }
      return {
        day,
        hour: lesson.hour,
        classId: lesson.classId,
        subject: lesson.subject,
        coveredBySostegno,
        existingSub,
        candidates,
      };
    });
  };

  /**
   * Chi può coprire un'ora scoperta anticipando una propria lezione.
   *
   * È il caso classico segnalato dalle scuole: manca la collega di quinta e
   * un'altra docente della stessa classe ha lezione a sesta e buca a quinta.
   * Anticipa, e la classe esce un'ora prima. Non è uno spostamento
   * dell'orario — quello resta quello di sempre — ma un modo di coprire
   * quell'ora in quel giorno, alla pari della sorveglianza.
   *
   * Candidata è ogni lezione della stessa classe, più avanti nella
   * giornata, di una docente libera nell'ora scoperta. Se l'ora che si
   * svuota è l'ultima della classe l'uscita è pulita; altrimenti resta un
   * buco a metà mattina, e chi sceglie deve saperlo.
   */
  const getAnticipoCandidates = (
    absence: any,
    hour: number,
    classId: string
  ) => {
    const day = getDayIndexFromDate(absence.date);
    if (day < 0) return [];
    // Solo le ore curricolari del mattino: le lezioni di strumento sono
    // pomeridiane e individuali, anticiparle non manda a casa la classe.
    const classDayLessons = timetable.filter(
      (s) =>
        s.classId === classId &&
        s.day === day &&
        (s.type === 'materia' || s.type === 'pomeriggio_musica') &&
        diurnalHours.some((dh) => dh.index === s.hour) &&
        !strumento.some((m) => m.id === s.teacherId)
    );
    const lastHourOfDay = classDayLessons.reduce(
      (max, s) => Math.max(max, s.hour),
      -1
    );
    const busy = busyTeacherIdsAt(day, hour, absence.date);
    return classDayLessons
      .filter(
        (l) =>
          l.hour > hour &&
          l.teacherId !== absence.teacherId &&
          !busy.has(l.teacherId) &&
          !isTeacherOff(generationRules, l.teacherId, day, hour)
      )
      .map((l) => {
        // Se in quell'ora la classe è divisa in gruppi (lingue, classi
        // miste) spostare una lezione non svuota l'ora: la classe resta.
        const altreLezioniStessaOra = classDayLessons.some(
          (s) => s.hour === l.hour && s !== l
        );
        const exitClean = l.hour === lastHourOfDay && !altreLezioniStessaOra;
        const oreRimaste = classDayLessons
          .filter((s) => s.hour !== l.hour)
          .map((s) => s.hour);
        const ultimaRimasta = oreRimaste.length
          ? Math.max(...oreRimaste, hour)
          : hour;
        return {
          teacherId: l.teacherId,
          name:
            allStaff.find((t) => t.id === l.teacherId)?.name || l.teacherId,
          subject: l.subject,
          fromHour: l.hour,
          exitClean,
          exitAfterHour: exitClean ? ultimaRimasta : undefined,
        };
      })
      .sort((a, b) =>
        a.exitClean === b.exitClean
          ? a.fromHour - b.fromHour
          : a.exitClean
          ? -1
          : 1
      );
  };

  const paidSubstitutionHoursByTeacher = useMemo(() => {
    const counts: any = {};
    substitutions.forEach((s) => {
      if (s.paid && s.teacherSubstitute) {
        counts[s.teacherSubstitute] = (counts[s.teacherSubstitute] || 0) + 1;
      }
    });
    return counts;
  }, [substitutions]);

  const handleAddAbsence = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnlyMode) return;
    setAbsenceFormError('');
    const isClassBased =
      newAbsenceType === 'entrata_posticipata' ||
      newAbsenceType === 'uscita_anticipata';
    const todayStr = new Date().toISOString().slice(0, 10);
    if (isClassBased && substitutionsDate <= todayStr) {
      setAbsenceFormError(
        "Entrata posticipata/uscita anticipata va decisa almeno il giorno prima: le famiglie vanno avvisate per tempo. Seleziona una data futura."
      );
      return;
    }
    if (isClassBased && !newAbsenceClassId) {
      setAbsenceFormError('Seleziona la classe.');
      return;
    }
    if (!isClassBased && !newAbsenceTeacherId) {
      setAbsenceFormError('Seleziona il docente.');
      return;
    }
    // Nel modulo le ore si scrivono come si leggono in tutta l'app (1 = 1ª
    // ora), mentre nell'orario sono indicizzate da 0.
    const toHourIndex = (value: string) =>
      value === '' ? undefined : Number(value) - 1;
    const fromHour = toHourIndex(newAbsenceFromHour);
    const toHour = toHourIndex(newAbsenceToHour);
    const isValidHour = (h: number | undefined) =>
      h === undefined || (Number.isInteger(h) && h >= 0);
    if (!isValidHour(fromHour) || !isValidHour(toHour)) {
      setAbsenceFormError(
        'Le ore si contano come nell\'orario: 1 è la prima ora. Lascia vuoto per tutta la giornata.'
      );
      return;
    }
    if (fromHour !== undefined && toHour !== undefined && toHour < fromHour) {
      setAbsenceFormError('«A ora» non può essere precedente a «Da ora».');
      return;
    }
    const newAbsence = {
      id: `absence_${Date.now()}`,
      date: substitutionsDate,
      type: newAbsenceType,
      teacherId: isClassBased ? undefined : newAbsenceTeacherId,
      classId: isClassBased ? newAbsenceClassId : undefined,
      fromHour,
      toHour,
      note: newAbsenceNote.trim(),
    };
    const newAbsences = [...absences, newAbsence];
    setAbsences(newAbsences);
    pushAbsencesSubs(newAbsences, substitutions);
    setNewAbsenceTeacherId('');
    setNewAbsenceClassId('');
    setNewAbsenceFromHour('');
    setNewAbsenceToHour('');
    setNewAbsenceNote('');
  };

  const handleDeleteAbsence = (id: string) => {
    if (readOnlyMode) return;
    const newAbsences = absences.filter((a) => a.id !== id);
    const newSubstitutions = substitutions.filter((s) => s.absenceId !== id);
    setAbsences(newAbsences);
    setSubstitutions(newSubstitutions);
    pushAbsencesSubs(newAbsences, newSubstitutions);
  };

  const handleConfirmSubstitution = (
    absence: any,
    hour: number,
    classId: string,
    subject: string,
    method: string,
    teacherSubstitute?: string
  ) => {
    if (readOnlyMode) return;
    const day = getDayIndexFromDate(absence.date);
    const newSub = {
      id: `sub_${Date.now()}`,
      absenceId: absence.id,
      date: absence.date,
      day,
      hour,
      classId,
      subjectOriginal: subject,
      teacherOriginal: absence.teacherId,
      teacherSubstitute: teacherSubstitute || undefined,
      method,
      paid: method === 'docente_disponibile',
    };
    const newSubstitutions = [...substitutions, newSub];
    setSubstitutions(newSubstitutions);
    pushAbsencesSubs(absences, newSubstitutions);
  };

  /**
   * Registra un anticipo: la collega copre l'ora scoperta portando avanti la
   * lezione che avrebbe fatto più tardi. L'orario settimanale non si tocca,
   * la variazione vale solo per quella data e finisce nel foglio del giorno.
   */
  const handleConfirmAnticipo = (
    absence: any,
    hour: number,
    classId: string,
    subject: string,
    candidate: any
  ) => {
    if (readOnlyMode) return;
    const day = getDayIndexFromDate(absence.date);
    const newSub = {
      id: `sub_${Date.now()}`,
      absenceId: absence.id,
      date: absence.date,
      day,
      hour,
      classId,
      subjectOriginal: subject,
      teacherOriginal: absence.teacherId,
      teacherSubstitute: candidate.teacherId,
      method: 'anticipo',
      paid: false,
      movedFromHour: candidate.fromHour,
      subjectMoved: candidate.subject,
      exitAfterHour: candidate.exitAfterHour,
    };
    const newSubstitutions = [...substitutions, newSub];
    setSubstitutions(newSubstitutions);
    pushAbsencesSubs(absences, newSubstitutions);
    setAnticipoPanel(null);
  };

  const handleRemoveSubstitution = (id: string) => {
    if (readOnlyMode) return;
    const newSubstitutions = substitutions.filter((s) => s.id !== id);
    setSubstitutions(newSubstitutions);
    pushAbsencesSubs(absences, newSubstitutions);
  };

  const handleToggleAvailableForSubstitution = (teacherId: string) => {
    if (readOnlyMode) return;
    const newTeachers = teachers.map((t) =>
      t.id === teacherId
        ? {
            ...t,
            availableForPaidSubstitution: !t.availableForPaidSubstitution,
          }
        : t
    );
    setTeachers(newTeachers);
    pushDataToCloud(
      timetable,
      newTeachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      mixedClasses,
      rooms,
      sedi,
      absences,
      substitutions
    );
  };

  const addGroupConstraint = () => {
    if (
      !newGroupC1 ||
      !newGroupC2 ||
      !newGroupSubj ||
      newGroupC1 === newGroupC2
    )
      return;
    const newConstraints = [
      ...groupConstraints,
      { class1: newGroupC1, class2: newGroupC2, subject: newGroupSubj },
    ];
    setGroupConstraints(newConstraints);
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      newConstraints,
      mixedClasses
    );
    setNewGroupC1('');
    setNewGroupC2('');
    setNewGroupSubj('');
  };

  const removeGroupConstraint = (idx: number) => {
    const newConstraints = groupConstraints.filter((_, i) => i !== idx);
    setGroupConstraints(newConstraints);
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      newConstraints,
      mixedClasses
    );
  };

  const addMixedClass = () => {
    if (!newMixC1 || !newMixC2 || newMixC1 === newMixC2) return;
    const newMix = [
      ...mixedClasses,
      { subject: newMixSubj, c1: newMixC1, c2: newMixC2 },
    ];
    setMixedClasses(newMix);
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      newMix
    );
    setNewMixC1('');
    setNewMixC2('');
  };

  const removeMixedClass = (idx: number) => {
    const newMix = mixedClasses.filter((_, i) => i !== idx);
    setMixedClasses(newMix);
    pushDataToCloud(
      timetable,
      teachers,
      sostegno,
      sectionsConfig,
      strumento,
      diurnalHours,
      afternoonHours,
      generationRules,
      generateOptions,
      cellNotes,
      groupConstraints,
      newMix
    );
  };

  /** Stili condivisi dai due fogli dell'export Excel. */
  const buildExcelStyles = (): Record<string, XlsxStyle> => {
    const styles: Record<string, XlsxStyle> = {
      Title: { bold: true, size: 14, color: '#1E3A8A', align: 'left' },
      Header: {
        bold: true,
        color: '#FFFFFF',
        fill: '#1E3A8A',
        align: 'center',
        wrap: true,
        border: true,
      },
      SubHeader: {
        bold: true,
        size: 9,
        color: '#374151',
        fill: '#E5E7EB',
        align: 'center',
        border: true,
      },
      HoursCell: {
        bold: true,
        color: '#1E3A8A',
        fill: '#F0F4FF',
        align: 'center',
        border: true,
      },
      ClassList: {
        bold: true,
        size: 9,
        color: '#4F46E5',
        fill: '#EEF2F6',
        align: 'left',
        wrap: true,
        border: true,
      },
      ActiveLesson: {
        bold: true,
        color: '#1E3A8A',
        fill: '#DBEAFE',
        align: 'center',
        border: true,
      },
      EmptySlot: { fill: '#FAFAFA', align: 'center', border: true },
      DayOffSlot: {
        bold: true,
        italic: true,
        size: 9,
        color: '#991B1B',
        fill: DAY_OFF_COLOR,
        align: 'center',
        border: true,
      },
      DeptSeparator: { fill: '#1E3A8A' },
    };
    Object.entries(DEPARTMENT_COLORS).forEach(([dept, color]) => {
      styles[`Dept_${dept.replace(/[^A-Za-z0-9]/g, '_')}`] = {
        bold: true,
        color: '#111827',
        fill: color,
        align: 'left',
        wrap: true,
        border: true,
      };
    });
    return styles;
  };

  /**
   * Costruisce un foglio dell'export: intestazioni, una riga per docente e
   * una cella per ogni ora di ogni giorno.
   */
  const buildExcelSheet = (
    name: string,
    title: string,
    subtitle: string,
    thirdColumnHeader: string,
    days: string[],
    hours: any[],
    staffList: any[]
  ): XlsxSheet => {
    const totalColumns = 3 + days.length * hours.length;
    const rows: XlsxRow[] = [];

    rows.push({
      heightPx: 28,
      cells: [{ value: title, style: 'Title', mergeAcross: totalColumns - 1 }],
    });
    rows.push({ heightPx: 22, cells: [{ value: subtitle, style: 'Header' }] });
    // L'intestazione di ogni giorno copre tutte le sue ore, quindi va messa
    // nella colonna in cui quel giorno comincia: le posizioni intermedie
    // restano vuote perché sono assorbite dall'unione delle celle.
    const dayHeaderCells: (XlsxCell | null)[] = [
      { value: 'Docente', style: 'Header', mergeDown: 1 },
      { value: 'Ore', style: 'Header', mergeDown: 1 },
      { value: thirdColumnHeader, style: 'Header', mergeDown: 1 },
    ];
    days.forEach((day, dIdx) => {
      dayHeaderCells[3 + dIdx * hours.length] = {
        value: day,
        style: 'Header',
        mergeAcross: hours.length - 1,
      };
    });
    rows.push({ heightPx: 26, cells: dayHeaderCells });
    rows.push({
      heightPx: 20,
      cells: [
        null,
        null,
        null,
        ...days.flatMap(() =>
          hours.map((h) => ({
            value: h.label.split(' ')[0],
            style: 'SubHeader',
          }))
        ),
      ],
    });

    let prevSubject = '';
    staffList.forEach((staff, idx) => {
      const deptStyle = `Dept_${staff.subject.replace(/[^A-Za-z0-9]/g, '_')}`;
      if (staff.subject !== prevSubject && idx > 0)
        rows.push({
          heightPx: 4,
          cells: [{ style: 'DeptSeparator', mergeAcross: totalColumns - 1 }],
        });
      prevSubject = staff.subject;

      const cells: (XlsxCell | null)[] = [
        { value: `${staff.name}\n[${staff.subject}]`, style: deptStyle },
        { value: `${staffHoursPlanned[staff.id]}h`, style: 'HoursCell' },
        { value: staffClassSummary[staff.id], style: 'ClassList' },
      ];
      days.forEach((_, dIdx) => {
        const isDayOff = (
          generationRules.teacherDaysOff[staff.id] || []
        ).includes(dIdx);
        hours.forEach((h) => {
          if (isDayOff) {
            cells.push({ value: 'LIBERO', style: 'DayOffSlot' });
            return;
          }
          if (isTeacherOff(generationRules, staff.id, dIdx, h.index)) {
            cells.push({ value: 'N.D.', style: 'DayOffSlot' });
            return;
          }
          const occupied = timetable.find(
            (slot) =>
              slot.teacherId === staff.id &&
              slot.day === dIdx &&
              slot.hour === h.index
          );
          cells.push(
            occupied
              ? { value: occupied.classId, style: 'ActiveLesson' }
              : { value: '-', style: 'EmptySlot' }
          );
        });
      });
      rows.push({ heightPx: 38, cells });
    });

    return {
      name,
      colWidthsPx: [
        150,
        40,
        140,
        ...Array(days.length * hours.length).fill(55),
      ],
      rows,
    };
  };

  const handleExportExcel = () => {
    const sheets: XlsxSheet[] = [
      buildExcelSheet(
        'Orario Diurno',
        '📋 ORARIO SCOLASTICO DIURNO',
        '☀️ Orario Mattutino - Tutti i Docenti',
        'Classi Assegnate',
        DAYS,
        diurnalHours,
        filteredStaff.filter((s) => s.staffType !== 'strumento')
      ),
      buildExcelSheet(
        'Orario Pomeridiano',
        '🎵 ORARIO POMERIDIANO - INDIRIZZO MUSICALE',
        'Strumenti Musicali',
        'Strumento',
        DAYS.slice(0, 5),
        afternoonHours,
        filteredInstrumentStaff
      ),
    ];

    const data = buildXlsx(sheets, buildExcelStyles());
    const blob = new Blob([data as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'orario_scolastico.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintBypass = (
    printType: string = 'master',
    id: string | null = null
  ) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setPrintAlertOpen(true);
      return;
    }
    let css = `@page { size: A3 landscape; margin: 6mm; } * { box-sizing: border-box; } body { background-color: white; color: black; font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 6mm; font-size: 7.5pt; } h1 { font-size: 14pt; font-weight: bold; margin: 0 0 4mm 0; color: #1e3a8a; text-align: center; } h2 { font-size: 9pt; margin: 0 0 2mm 0; color: #1e3a8a; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #1e3a8a; padding-bottom: 1mm; } table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 3mm; } tr { page-break-inside: auto; } td, th { border: 0.5pt solid #64748b; padding: 1.5pt 2pt; text-align: center; font-size: 6.5pt; line-height: 1.15; overflow: hidden; vertical-align: middle; } th { background-color: #1e3a8a !important; color: white !important; font-weight: bold; font-size: 6.5pt; border: 1pt solid #1e3a8a; } th.sub { background-color: #e5e7eb !important; color: #374151 !important; font-size: 6pt; } td.staff-cell { text-align: left; font-weight: bold; font-size: 7pt; padding: 2pt 3pt; } td.staff-cell .subj { font-size: 5.5pt; font-weight: normal; color: #374151; text-transform: uppercase; display: block; } td.hours-cell { font-weight: bold; color: #1e3a8a; background-color: #f0f4ff !important; } td.class-cell { text-align: left; color: #4f46e5; font-weight: bold; font-size: 6pt; } td.day-off { background-color: ${DAY_OFF_COLOR} !important; color: #991b1b !important; font-style: italic; font-weight: bold; font-size: 6pt; } td.lesson-active { background-color: #dbeafe !important; color: #1e3a8a !important; font-weight: bold; font-size: 7.5pt; line-height: 1.05; } td.lesson-active .room { display: block; font-size: 4.8pt; font-weight: normal; color: #4338ca; letter-spacing: -0.15pt; white-space: nowrap; } td.empty { background-color: #fafafa; } tr.dept-separator td { background-color: #1e3a8a !important; height: 3pt; padding: 0; } .page-break { page-break-before: always; } .day-sep { border-right: 2pt solid #1e3a8a !important; }`;
    let contentHtml = `<html><head><title>Orario - EduTime Pro</title><style>${css}</style></head><body>`;
    if (printType === 'master') {
      const staffDiurno = filteredStaff.filter(
        (s) => s.staffType !== 'strumento'
      );
      const staffPomeridiano = filteredStaff.filter(
        (s) => s.staffType === 'strumento'
      );
      contentHtml += `<h1>📋 ORARIO SCOLASTICO DIURNO</h1><h2>☀️ Orario Mattutino - Tutti i Docenti</h2><table><thead><tr><th style="width: 130pt;" rowspan="2">Docente</th><th style="width: 25pt;" rowspan="2">Ore</th><th style="width: 130pt;" rowspan="2">Classi Assegnate</th>${DAYS_IN_USE.map(
        (day, idx) =>
          `<th colspan="${diurnalHours.length}" class="${
            idx < DAYS_IN_USE.length - 1 ? 'day-sep' : ''
          }">${day}</th>`
      ).join('')}</tr><tr>${DAYS_IN_USE.map((_, dIdx) =>
        diurnalHours
          .map((dh, hIdx) => {
            const isLast =
              hIdx === diurnalHours.length - 1 && dIdx < DAYS_IN_USE.length - 1;
            return `<th class="sub ${isLast ? 'day-sep' : ''}">${escapeXml(
              dh.label.split(' ')[0]
            )}</th>`;
          })
          .join('')
      ).join('')}</tr></thead><tbody>`;
      let prevSubject = '';
      staffDiurno.forEach((staff, idx) => {
        const deptColor = getDeptColor(staff.subject);
        const isNewDept = staff.subject !== prevSubject && idx > 0;
        prevSubject = staff.subject;
        if (isNewDept)
          contentHtml += `<tr class="dept-separator"><td colspan="${
            3 + DAYS_IN_USE.length * diurnalHours.length
          }"></td></tr>`;
        contentHtml += `<tr><td class="staff-cell" style="background-color: ${deptColor} !important;">${escapeXml(
          staff.name
        )}<span class="subj">${escapeXml(
          staff.subject
        )}</span></td><td class="hours-cell">${
          staffHoursPlanned[staff.id]
        }h</td><td class="class-cell">${escapeXml(
          staffClassSummary[staff.id]
        )}</td>`;
        DAYS.forEach((_, dIdx) => {
          const isDayOff = (
            generationRules.teacherDaysOff[staff.id] || []
          ).includes(dIdx);
          const isLastDay = dIdx < DAYS_IN_USE.length - 1;
          diurnalHours.forEach((dh, hIdx) => {
            const isLastHour = hIdx === diurnalHours.length - 1;
            const borderClass = isLastHour && isLastDay ? 'day-sep' : '';
            if (isDayOff)
              contentHtml += `<td class="day-off ${borderClass}">LIBERO</td>`;
            else if (
              isTeacherOff(generationRules, staff.id, dIdx, dh.index)
            )
              contentHtml += `<td class="day-off ${borderClass}">N.D.</td>`;
            else {
              const occupied = timetable.find(
                (slot) =>
                  slot.teacherId === staff.id &&
                  slot.day === dIdx &&
                  slot.hour === dh.index
              );
              if (occupied)
                contentHtml += `<td class="lesson-active ${borderClass}">${escapeXml(
                  occupied.classId
                )}${
                  roomShortLabel(occupied.room)
                    ? `<span class="room">${escapeXml(
                        roomShortLabel(occupied.room)
                      )}</span>`
                    : ''
                }</td>`;
              else contentHtml += `<td class="empty ${borderClass}">-</td>`;
            }
          });
        });
        contentHtml += `</tr>`;
      });
      contentHtml += `</tbody></table><div class="page-break"></div><h1>🎵 ORARIO POMERIDIANO - INDIRIZZO MUSICALE</h1><h2>Strumenti Musicali</h2><table><thead><tr><th style="width: 130pt;" rowspan="2">Docente</th><th style="width: 25pt;" rowspan="2">Ore</th><th style="width: 130pt;" rowspan="2">Strumento</th>${DAYS.slice(
        0,
        5
      )
        .map(
          (day, idx) =>
            `<th colspan="${afternoonHours.length}" class="${
              idx < 4 ? 'day-sep' : ''
            }">${day}</th>`
        )
        .join('')}</tr><tr>${DAYS.slice(0, 5)
        .map((_, dIdx) =>
          afternoonHours
            .map((ah, hIdx) => {
              const isLast = hIdx === afternoonHours.length - 1 && dIdx < 4;
              return `<th class="sub ${isLast ? 'day-sep' : ''}">${escapeXml(
                ah.label.split(' ')[0]
              )}</th>`;
            })
            .join('')
        )
        .join('')}</tr></thead><tbody>`;
      let prevSubjPM = '';
      staffPomeridiano.forEach((staff, idx) => {
        const deptColor = getDeptColor(staff.subject);
        const isNewDept = staff.subject !== prevSubjPM && idx > 0;
        prevSubjPM = staff.subject;
        if (isNewDept)
          contentHtml += `<tr class="dept-separator"><td colspan="${
            3 + 5 * afternoonHours.length
          }"></td></tr>`;
        contentHtml += `<tr><td class="staff-cell" style="background-color: ${deptColor} !important;">${escapeXml(
          staff.name
        )}<span class="subj">${escapeXml(
          staff.subject
        )}</span></td><td class="hours-cell">${
          staffHoursPlanned[staff.id]
        }h</td><td class="class-cell" style="color: #10b981;">${escapeXml(
          staffClassSummary[staff.id]
        )}</td>`;
        DAYS.slice(0, 5).forEach((_, dIdx) => {
          const isDayOff = (
            generationRules.teacherDaysOff[staff.id] || []
          ).includes(dIdx);
          const isLastDay = dIdx < 4;
          afternoonHours.forEach((ah, hIdx) => {
            const isLastHour = hIdx === afternoonHours.length - 1;
            const borderClass = isLastHour && isLastDay ? 'day-sep' : '';
            if (isDayOff)
              contentHtml += `<td class="day-off ${borderClass}">LIBERO</td>`;
            else if (
              isTeacherOff(generationRules, staff.id, dIdx, ah.index)
            )
              contentHtml += `<td class="day-off ${borderClass}">N.D.</td>`;
            else {
              const occupied = timetable.find(
                (slot) =>
                  slot.teacherId === staff.id &&
                  slot.day === dIdx &&
                  slot.hour === ah.index
              );
              if (occupied)
                contentHtml += `<td class="lesson-active ${borderClass}">${escapeXml(
                  occupied.classId
                )}${
                  roomShortLabel(occupied.room)
                    ? `<span class="room">${escapeXml(
                        roomShortLabel(occupied.room)
                      )}</span>`
                    : ''
                }</td>`;
              else contentHtml += `<td class="empty ${borderClass}">-</td>`;
            }
          });
        });
        contentHtml += `</tr>`;
      });
      contentHtml += `</tbody></table><script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script></body></html>`;
    } else if (printType === 'single_class') {
      const classObj = classes.find((c) => c.id === id);
      // Giorni e righe della classe: quelli del suo modello, non piu' il
      // sabato tolto a mano al modello B.
      const classGrid = classObj
        ? getSectionGrid(classObj.section)
        : DEFAULT_MODEL_GRIDS.modelloB;
      contentHtml = `<html><head><title>Orario Classe ${id}</title><style>@page { size: A4 portrait; margin: 15mm; } body { font-family: sans-serif; font-size: 12px; margin: 15mm; padding: 0; } table { width: 100%; border-collapse: collapse; page-break-inside: avoid; } th, td { border: 1px solid #ccc; padding: 8px; text-align: center; } th { background-color: #f0f0f0; } tr { page-break-inside: avoid; }</style></head><body><h2 style="text-align:center;">Orario Classe ${id}</h2><table><thead><tr><th>Ora</th>${DAYS_IN_USE.map(
        (d, dIdx) => {
          if (dIdx >= classGrid.days) return '';
          return `<th>${d}</th>`;
        }
      ).join('')}</tr></thead><tbody>${gridHourRows
        .slice(0, gridSlots(classGrid))
        .map(
          (dh) =>
            `<tr><td style="font-weight:bold; width: 60px;">${
              dh.label
            }<br/><span style="font-size: 8px; font-weight:normal;">${
              dh.time
            }</span></td>${DAYS_IN_USE.map((day, dIdx) => {
              if (dIdx >= classGrid.days) return '';
              const l = timetable.find(
                (slot) =>
                  slot.classId === id &&
                  slot.day === dIdx &&
                  slot.hour === dh.index &&
                  slot.type === 'materia'
              );
              const deptColor = l ? getDeptColor(l.subject) : '#fff';
              return `<td style="background-color: ${deptColor};">${
                l
                  ? `<b>${escapeXml(
                      l.subject
                    )}</b><br/><span style="font-size:10px;">${escapeXml(
                      allStaff.find((s) => s.id === l.teacherId)?.name
                    )}</span>${
                      isNamedRoom(l.room)
                        ? `<br/><span style="font-size:9px;color:#4338ca;">📍 ${escapeXml(
                            l.room
                          )}</span>`
                        : ''
                    }`
                  : '-'
              }</td>`;
            }).join('')}</tr>`
        )
        .join('')}</tbody></table></body></html>`;
    } else if (printType === 'single_teacher') {
      const staff = allStaff.find((s) => s.id === id);
      const deptColor = getDeptColor(staff?.subject);
      contentHtml = `<html><head><title>Orario ${
        staff?.name
      }</title><style>@page { size: A4 portrait; margin: 15mm; } body { font-family: sans-serif; font-size: 12px; margin: 15mm; padding: 0; } table { width: 100%; border-collapse: collapse; page-break-inside: avoid; } th, td { border: 1px solid #ccc; padding: 8px; text-align: center; } th { background-color: #f0f0f0; } .dayoff { background-color: ${DAY_OFF_COLOR}; color: #991b1b; font-weight: bold; font-style: italic; } tr { page-break-inside: avoid; }</style></head><body><h2 style="text-align:center; background-color: ${deptColor}; padding: 10px; border-radius: 4px;">Orario: ${
        staff?.name
      }</h2><h3 style="text-align:center; color: #666;">${
        staff?.subject
      }</h3><table><thead><tr><th>Ora</th>${DAYS_IN_USE.map(
        (d) => `<th>${d}</th>`
      ).join('')}</tr></thead><tbody>${(staff?.staffType === 'strumento'
        ? afternoonHours
        : gridHourRows
      )
        .map(
          (dh) =>
            `<tr><td style="font-weight:bold; width: 60px;">${
              dh.label
            }<br/><span style="font-size: 8px; font-weight:normal;">${
              dh.time
            }</span></td>${DAYS_IN_USE.map((day, dIdx) => {
              const isDayOff = (
                generationRules.teacherDaysOff[staff?.id] || []
              ).includes(dIdx);
              if (isDayOff) return `<td class="dayoff">LIBERO</td>`;
              if (isTeacherOff(generationRules, staff?.id, dIdx, dh.index))
                return `<td class="dayoff">N.D.</td>`;
              const l = timetable.find(
                (slot) =>
                  slot.teacherId === staff?.id &&
                  slot.day === dIdx &&
                  slot.hour === dh.index
              );
              return `<td style="${
                l ? 'background-color: #dbeafe; font-weight: bold;' : ''
              }">${
                l
                  ? `<b>Classe ${escapeXml(l.classId)}</b>${
                      isNamedRoom(l.room)
                        ? `<br/><span style="font-size:9px;font-weight:normal;color:#4338ca;">📍 ${escapeXml(
                            l.room
                          )}</span>`
                        : ''
                    }`
                  : '-'
              }</td>`;
            }).join('')}</tr>`
        )
        .join('')}</tbody></table></body></html>`;
    }
    printWindow.document.write(contentHtml);
    printWindow.document.close();
    if (printType !== 'master') {
      const script = printWindow.document.createElement('script');
      script.innerHTML =
        'window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }';
      printWindow.document.body.appendChild(script);
    }
  };

  /** Foglio giornaliero di predisposizione supplenze, A4 orizzontale, stampabile/salvabile in PDF. */
  const handlePrintSostituzioni = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setPrintAlertOpen(true);
      return;
    }
    const day = getDayIndexFromDate(substitutionsDate);
    const [yyyy, mm, dd] = substitutionsDate.split('-');
    const dateLabel =
      day >= 0
        ? `${DAYS[day]} ${dd}.${mm}.${yyyy.slice(2)}`
        : substitutionsDate;
    const schoolYearStart =
      Number(mm) >= 9 ? Number(yyyy) : Number(yyyy) - 1;
    const schoolYear = `${schoolYearStart}/${schoolYearStart + 1}`;

    const dayAbsences = absences.filter((a) => a.date === substitutionsDate);
    const teacherAbsences = dayAbsences.filter(
      (a) => a.type === 'assenza' || a.type === 'permesso'
    );
    const classAbsences = dayAbsences.filter(
      (a) =>
        a.type === 'entrata_posticipata' || a.type === 'uscita_anticipata'
    );
    const daySubs = substitutions.filter(
      (s) => s.date === substitutionsDate
    );

    const css = `@page { size: A4 landscape; margin: 8mm; } * { box-sizing: border-box; } body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #111827; font-size: 8pt; } h1 { text-align: center; font-size: 13pt; margin: 0 0 1mm 0; color: #1e3a8a; } h2 { text-align: center; font-size: 10pt; margin: 0 0 4mm 0; text-decoration: underline; } h3 { font-size: 8.5pt; text-transform: uppercase; background: #1e3a8a; color: white; margin: 4mm 0 0 0; padding: 1.5mm 2mm; } table { width: 100%; border-collapse: collapse; margin-bottom: 2mm; } th, td { border: 0.5pt solid #64748b; padding: 1.5pt 2pt; text-align: center; vertical-align: middle; font-size: 7.5pt; } th { background: #e5e7eb; font-weight: bold; } td.name-cell { text-align: left; font-weight: bold; padding-left: 2mm; } td.motivo-cell, td.note-cell { text-align: left; font-size: 7pt; } td.empty-row { font-style: italic; color: #6b7280; text-align: left; padding-left: 2mm; } .legend { font-size: 7pt; margin-top: 2mm; color: #374151; }`;

    let html = `<html><head><title>Foglio Supplenze ${escapeXml(
      dateLabel
    )}</title><style>${css}</style></head><body>`;
    html += `<h1>PREDISPOSIZIONE GIORNALIERA SUPPLENZE DOCENTI — A.S. ${schoolYear}</h1>`;
    html += `<h2>${escapeXml(dateLabel)}</h2>`;

    html += `<h3>Titolari assenti (Ass.) o in permesso (P.B.)</h3>`;
    html += `<table><thead><tr><th style="width:18pt;">#</th><th style="width:110pt;">Docente</th>`;
    diurnalHours.forEach(
      (dh) =>
        (html += `<th>${escapeXml(dh.label)}<br/><span style="font-weight:normal;font-size:6pt;">${escapeXml(
          dh.time
        )}</span></th>`)
    );
    html += `<th style="width:70pt;">Motivo</th><th style="width:90pt;">Note</th></tr></thead><tbody>`;
    if (teacherAbsences.length === 0) {
      html += `<tr><td class="empty-row" colspan="${
        3 + diurnalHours.length
      }">Nessuna assenza segnalata per questa data.</td></tr>`;
    }
    teacherAbsences.forEach((absence, idx) => {
      const teacher = teachers.find((t) => t.id === absence.teacherId);
      const lessons = getSubstitutionSuggestions(absence);
      html += `<tr><td>${idx + 1}</td><td class="name-cell">${escapeXml(
        teacher?.name || absence.teacherId
      )}</td>`;
      diurnalHours.forEach((dh) => {
        const l = lessons.find((x: any) => x.hour === dh.index);
        html += `<td>${l ? escapeXml(l.classId) : ''}</td>`;
      });
      html += `<td class="motivo-cell">${
        absence.type === 'assenza' ? 'Assenza' : 'Permesso'
      }</td><td class="note-cell">${escapeXml(absence.note || '')}</td></tr>`;
    });
    html += `</tbody></table>`;

    html += `<h3>Supplenti (D = retribuita) / Sorveglianza / Alunni divisi</h3>`;
    html += `<table><thead><tr><th style="width:18pt;">#</th><th style="width:110pt;">Docente supplente / Modalità</th>`;
    diurnalHours.forEach(
      (dh) => (html += `<th>${escapeXml(dh.label)}</th>`)
    );
    html += `<th style="width:120pt;">Note</th></tr></thead><tbody>`;

    const subsByTeacher: Record<string, any[]> = {};
    const sorveglianzaSubs: any[] = [];
    const divisioneSubs: any[] = [];
    const anticipoSubs: any[] = [];
    daySubs.forEach((s) => {
      if (s.method === 'anticipo') anticipoSubs.push(s);
      else if (s.method === 'docente_disponibile' && s.teacherSubstitute) {
        if (!subsByTeacher[s.teacherSubstitute])
          subsByTeacher[s.teacherSubstitute] = [];
        subsByTeacher[s.teacherSubstitute].push(s);
      } else if (s.method === 'sorveglianza') sorveglianzaSubs.push(s);
      else if (s.method === 'divisione_alunni') divisioneSubs.push(s);
    });

    let rowIdx = 0;
    Object.entries(subsByTeacher).forEach(([tid, subs]) => {
      rowIdx++;
      const teacher = teachers.find((t) => t.id === tid);
      html += `<tr><td>${rowIdx}</td><td class="name-cell">${escapeXml(
        teacher?.name || tid
      )}</td>`;
      diurnalHours.forEach((dh) => {
        const s = subs.find((x: any) => x.hour === dh.index);
        html += `<td>${s ? escapeXml(`${s.classId} (D)`) : ''}</td>`;
      });
      html += `<td class="note-cell"></td></tr>`;
    });
    if (sorveglianzaSubs.length > 0) {
      rowIdx++;
      html += `<tr><td>${rowIdx}</td><td class="name-cell">Collaboratori scolastici</td>`;
      diurnalHours.forEach((dh) => {
        const s = sorveglianzaSubs.find((x: any) => x.hour === dh.index);
        html += `<td>${s ? escapeXml(s.classId) : ''}</td>`;
      });
      html += `<td class="note-cell">Sorveglianza</td></tr>`;
    }
    if (divisioneSubs.length > 0) {
      rowIdx++;
      html += `<tr><td>${rowIdx}</td><td class="name-cell">Alunni divisi tra le classi</td>`;
      diurnalHours.forEach((dh) => {
        const s = divisioneSubs.find((x: any) => x.hour === dh.index);
        html += `<td>${s ? escapeXml(s.classId) : ''}</td>`;
      });
      html += `<td class="note-cell"></td></tr>`;
    }
    anticipoSubs.forEach((sub) => {
      rowIdx++;
      const docente = allStaff.find((t) => t.id === sub.teacherSubstitute);
      html += `<tr><td>${rowIdx}</td><td class="name-cell">${escapeXml(
        docente?.name || sub.teacherSubstitute || ''
      )}</td>`;
      diurnalHours.forEach((dh) => {
        if (dh.index === sub.hour)
          html += `<td>${escapeXml(`${sub.classId} (ANT.)`)}</td>`;
        else if (dh.index === sub.movedFromHour)
          html += `<td>${escapeXml(`${sub.classId} spostata`)}</td>`;
        else html += `<td></td>`;
      });
      html += `<td class="note-cell">${escapeXml(
        `Anticipa ${sub.subjectMoved || 'la lezione'} dalla ${
          sub.movedFromHour + 1
        }ª${
          sub.exitAfterHour !== undefined
            ? `; la classe esce dopo la ${sub.exitAfterHour + 1}ª`
            : `; la ${sub.movedFromHour + 1}ª resta scoperta`
        }`
      )}</td></tr>`;
    });
    if (rowIdx === 0) {
      html += `<tr><td class="empty-row" colspan="${
        3 + diurnalHours.length
      }">Nessuna sostituzione assegnata per questa data.</td></tr>`;
    }
    html += `</tbody></table>`;

    html += `<h3>Comunicazione alle classi su entrate/uscite in orario diverso</h3>`;
    html += `<table><thead><tr><th style="width:250pt;">Classe</th><th style="width:150pt;">Ore coinvolte</th><th>Note</th></tr></thead><tbody>`;
    const usciteDaAnticipo = anticipoSubs.filter(
      (sub) => sub.exitAfterHour !== undefined
    );
    if (classAbsences.length === 0 && usciteDaAnticipo.length === 0) {
      html += `<tr><td class="empty-row" colspan="3">Nessuna comunicazione per questa data.</td></tr>`;
    }
    classAbsences.forEach((absence) => {
      const action =
        absence.type === 'entrata_posticipata'
          ? 'ENTRA più tardi'
          : 'ESCE prima';
      const hoursLabel =
        absence.fromHour !== undefined || absence.toHour !== undefined
          ? `${(absence.fromHour ?? 0) + 1}ª – ${
              (absence.toHour ?? diurnalHours.length - 1) + 1
            }ª`
          : 'Tutta la giornata';
      html += `<tr><td class="name-cell">Classe ${escapeXml(
        absence.classId
      )} — ${escapeXml(action)}</td><td>${escapeXml(
        hoursLabel
      )}</td><td class="note-cell">${escapeXml(absence.note || '')}</td></tr>`;
    });
    usciteDaAnticipo.forEach((sub) => {
      const docente = allStaff.find((t) => t.id === sub.teacherSubstitute);
      html += `<tr><td class="name-cell">Classe ${escapeXml(
        sub.classId
      )} — ESCE prima</td><td>${escapeXml(
        `dopo la ${sub.exitAfterHour + 1}ª ora`
      )}</td><td class="note-cell">${escapeXml(
        `${docente?.name || ''} anticipa alla ${sub.hour + 1}ª la lezione della ${
          sub.movedFromHour + 1
        }ª${
          timetable.some(
            (slot) =>
              slot.type === 'sostegno' &&
              slot.classId === sub.classId &&
              slot.day === sub.day &&
              slot.hour === sub.movedFromHour
          )
            ? '. In quell\'ora era previsto il sostegno: avvisare la docente'
            : ''
        }`
      )}</td></tr>`;
    });
    html += `</tbody></table>`;

    html += `<p class="legend">Legenda: (D) supplenza retribuita nell'ora buca del docente disponibile. (ANT.) lezione anticipata da un'ora successiva dello stesso giorno. — Foglio generato da EduTime Pro il ${new Date().toLocaleDateString(
      'it-IT'
    )}.</p>`;
    html += `</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    const script = printWindow.document.createElement('script');
    script.innerHTML =
      'window.onload = function() { window.print(); }';
    printWindow.document.body.appendChild(script);
  };

  if (!workspace) {
    return (
      <WorkspaceGate
        invitedCode={invitedCode}
        onChoose={handleChooseWorkspace}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {showWorkspacePanel && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Spazio di lavoro
                </h3>
                <p className="text-sm text-slate-600">
                  {workspace.mode === 'locale'
                    ? 'I dati sono salvati solo in questo browser.'
                    : 'I dati sono condivisi con chi conosce il codice scuola.'}
                </p>
              </div>
              <button
                onClick={() => setShowWorkspacePanel(false)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none"
                aria-label="Chiudi"
              >
                ×
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
              <p className="font-semibold text-slate-800">{workspace.label}</p>
              {workspace.mode === 'cloud' && (
                <>
                  <p className="text-slate-600 mt-1">Codice scuola:</p>
                  <code className="font-mono text-xs bg-white border border-slate-300 rounded px-2 py-1 inline-block mt-1 break-all">
                    {workspace.code}
                  </code>
                  <button
                    onClick={() =>
                      navigator.clipboard?.writeText(shareUrl(workspace.code))
                    }
                    className="block mt-2 text-xs font-semibold text-indigo-700 hover:underline"
                  >
                    🔗 Copia il link di invito per i colleghi
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleBackupDownload}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm"
              >
                💾 Scarica backup (.json)
              </button>
              <button
                onClick={() => restoreInputRef.current?.click()}
                disabled={readOnlyMode}
                className="bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-semibold py-2.5 px-4 rounded-lg text-sm"
              >
                📂 Ripristina da backup
              </button>
              <input
                ref={restoreInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBackupRestore(file);
                  e.target.value = '';
                }}
              />
              {restoreError && (
                <p className="text-xs text-rose-600">{restoreError}</p>
              )}
              <a
                href="/guida"
                target="_blank"
                rel="noreferrer"
                className="text-center bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-lg text-sm"
              >
                📘 Apri la guida
              </a>
              <button
                onClick={handleLeaveWorkspace}
                className="text-sm text-slate-500 hover:text-rose-600 underline mt-2"
              >
                Esci e cambia scuola
              </button>
            </div>
          </div>
        </div>
      )}
      <header className="bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-950 text-white shadow-md p-4 print:hidden shrink-0 relative z-40">
        <div
          className={`mx-auto flex flex-col md:flex-row justify-between items-center gap-4 transition-all duration-300 ${
            isFullWidth ? 'max-w-full px-4' : 'max-w-7xl'
          }`}
        >
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
              <h1 className="text-2xl font-bold tracking-tight">EduTime Pro</h1>
              <p className="text-xs text-indigo-200 flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="font-semibold text-white/90">
                  {workspace.label}
                </span>
                •
                {cloudStatus === 'locale' && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-slate-500/30 text-slate-100 font-bold px-1.5 py-0.5 rounded-sm">
                    💻 SOLO SU QUESTO COMPUTER
                  </span>
                )}
                {cloudStatus === 'sincronizzato' && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{' '}
                    CLOUD SINCRONIZZATO
                  </span>
                )}
                {cloudStatus === 'salvataggio' && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded-sm">
                    💾 SALVATAGGIO...
                  </span>
                )}
                {cloudStatus === 'connessione' && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.5 rounded-sm animate-pulse">
                    ⚡ CONNESSIONE...
                  </span>
                )}
                {cloudStatus === 'errore' && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.5 rounded-sm">
                    ❌ ERRORE
                  </span>
                )}
                {readOnlyMode && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/30 text-rose-200 font-bold px-1.5 py-0.5 rounded-sm ml-2">
                    🔒 SOLA LETTURA
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setShowWorkspacePanel(true)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold text-white border border-white/20 transition-all cursor-pointer"
              title="Spazio di lavoro, backup e condivisione"
            >
              🏫 Scuola & Backup
            </button>
            <a
              href="/guida"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold text-white border border-white/20 transition-all"
            >
              📘 Guida
            </a>
            <button
              onClick={() => setReadOnlyMode(!readOnlyMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                readOnlyMode
                  ? 'bg-rose-500/20 text-rose-100 border-rose-400/50'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
              title={
                readOnlyMode
                  ? 'Disabilita modalità sola lettura'
                  : 'Abilita modalità sola lettura'
              }
            >
              {readOnlyMode ? '🔒 Sola Lettura' : '🔓 Modifica'}
            </button>
            <button
              onClick={() => setIsFullWidth(!isFullWidth)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 active:bg-white/35 rounded-lg text-xs font-semibold text-white border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isFullWidth ? '🖥️ Centrata' : '↔️ Espandi'}</span>
            </button>
            <button
              onClick={generateTimetable}
              disabled={readOnlyMode}
              className={`bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-2 px-4 rounded-lg shadow-md flex items-center gap-2 transition-all duration-150 text-sm cursor-pointer ring-2 ring-emerald-400/50 ${
                readOnlyMode
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:from-emerald-600 hover:to-teal-700'
              }`}
            >
              <span className="text-base">✨</span>Auto-Genera Orario
            </button>
            <button
              onClick={handleAlignSostegno}
              disabled={readOnlyMode}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 Allinea Sostegno
            </button>
            <button
              onClick={() => handlePrintBypass('master')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2z"
                />
              </svg>
              Stampa A3 📄
            </button>
            <button
              onClick={handleExportExcel}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-xs text-sm cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
              </svg>
              Esporta Excel 📊
            </button>
          </div>
        </div>
      </header>
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs shrink-0 print:hidden">
        <div
          className={`mx-auto flex overflow-x-auto justify-start sm:justify-center transition-all duration-300 ${
            isFullWidth ? 'max-w-full px-4' : 'max-w-7xl'
          }`}
        >
          <nav className="flex space-x-6 px-4" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('master-view')}
              className={`py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'master-view'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📋 Orario Generale
            </button>
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setViewType('class');
              }}
              className={`py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📅 Viste Singole
            </button>
            <button
              onClick={() => {
                setActiveTab('teachers');
                setCattedreSubTab('diurne');
              }}
              className={`py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'teachers'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500'
              }`}
            >
              👩‍🏫 Registro Cattedre
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`py-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === 'config'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500'
              }`}
            >
              ⚙️ Sezioni & Regole
            </button>
            <button
              onClick={() => setActiveTab('validations')}
              className={`py-4 px-1 border-b-2 font-bold text-sm relative transition-all whitespace-nowrap ${
                activeTab === 'validations'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500'
              }`}
            >
              ⚠️ Conflitti
              {validationResult.conflicts.length > 0 && (
                <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                  {validationResult.conflicts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('sostituzioni')}
              className={`py-4 px-1 border-b-2 font-bold text-sm relative transition-all whitespace-nowrap ${
                activeTab === 'sostituzioni'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500'
              }`}
            >
              🩹 Sostituzioni
              {absences.length > 0 && (
                <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  {absences.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>
      <main
        className={`flex-1 w-full mx-auto p-4 md:p-6 overflow-y-auto transition-all duration-300 ${
          isFullWidth ? 'max-w-full px-4 md:px-8' : 'max-w-7xl'
        }`}
      >
        {activeTab === 'master-view' && (
          <div className="space-y-6 flex flex-col h-full">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between print:hidden shrink-0">
              <div className="w-full md:w-auto flex flex-wrap items-center gap-4">
                <div className="relative w-full md:w-80">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Cerca docente o materia..."
                    value={masterSearch}
                    onChange={(e) => setMasterSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
                  <button
                    onClick={() => setMasterHourFilter('diurno')}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      masterHourFilter === 'diurno'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    ☀️ Diurno
                  </button>
                  <button
                    onClick={() => setMasterHourFilter('pomeridiano')}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      masterHourFilter === 'pomeridiano'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    🌙 Pomeridiano
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-500 text-right flex items-center gap-3">
                <div>
                  <p className="font-semibold text-indigo-600">
                    ✍️ Modifiche condivise
                  </p>
                  <p>Salvataggio su azione</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md flex-1 min-h-[400px] h-[65vh] resize-y relative flex flex-col">
              <div className="overflow-x-auto overflow-y-auto flex-1 h-full">
                <table className="w-full text-left border-collapse table-fixed min-w-[1400px]">
                  <thead className="sticky top-0 z-30">
                    <tr className="bg-slate-100 border-b-2 border-slate-300 shadow-sm">
                      <th className="p-3 w-80 min-w-[20rem] bg-slate-200 font-bold text-slate-800 border-r border-slate-300 sticky left-0 z-40 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]">
                        Docente / Materia
                      </th>
                      <th className="p-3 w-16 bg-slate-200 font-bold text-center border-r-4 border-slate-300 text-indigo-800 sticky left-80 z-40 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]">
                        Ore
                      </th>
                      {DAYS_IN_USE.map((day, idx) => {
                        const activeHours =
                          masterHourFilter === 'diurno'
                            ? diurnalHours
                            : afternoonHours;
                        const isLastDay = idx === DAYS_IN_USE.length - 1;
                        return (
                          <th
                            key={day}
                            colSpan={activeHours.length}
                            className={`p-2 font-bold text-center text-slate-800 bg-slate-100 ${
                              !isLastDay ? 'border-r-4 border-slate-300' : ''
                            }`}
                          >
                            {day}
                          </th>
                        );
                      })}
                    </tr>
                    <tr className="bg-slate-50 text-[10px] border-b border-slate-200 sticky top-[48px] z-20">
                      <th className="p-2 w-80 bg-slate-100 border-r border-slate-300 sticky left-0 z-30 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)] text-slate-500 font-medium">
                        Dati Anagrafici
                      </th>
                      <th className="p-2 w-16 bg-slate-100 border-r-4 border-slate-300 text-center text-slate-500 font-medium sticky left-80 z-30 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]">
                        Tot.
                      </th>
                      {DAYS_IN_USE.map((day, dIdx) => {
                        const activeHours =
                          masterHourFilter === 'diurno'
                            ? diurnalHours
                            : afternoonHours;
                        return activeHours.map((hObj, hIdx) => {
                          const isLastHourOfDay =
                            hIdx === activeHours.length - 1 &&
                            dIdx < DAYS_IN_USE.length - 1;
                          return (
                            <th
                              key={`${day}_h${hObj.index}`}
                              className={`p-1 text-center font-semibold border-r border-slate-200 text-slate-600 truncate bg-slate-50 ${
                                isLastHourOfDay
                                  ? 'border-r-4 border-slate-300'
                                  : 'border-r border-slate-200'
                              }`}
                            >
                              {escapeXml(hObj.label)}
                            </th>
                          );
                        });
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {(() => {
                      let prevSubject = '';
                      return filteredStaff.map((staff, idx) => {
                        const classSummary =
                          staffClassSummary[staff.id] || 'Nessun carico';
                        const hoursPlanned = staffHoursPlanned[staff.id] || 0;
                        const deptColor = getDeptColor(staff.subject);
                        const isNewDept =
                          staff.subject !== prevSubject && idx > 0;
                        prevSubject = staff.subject;
                        return (
                          <React.Fragment key={staff.id}>
                            {isNewDept && (
                              <tr>
                                <td
                                  colSpan={
                                    2 +
                                    DAYS_IN_USE.length *
                                      (masterHourFilter === 'diurno'
                                        ? diurnalHours.length
                                        : afternoonHours.length)
                                  }
                                  className="h-1 bg-slate-800 border-y-2 border-slate-800"
                                ></td>
                              </tr>
                            )}
                            <tr className="hover:bg-indigo-50/20 transition-colors">
                              <td
                                className="p-2.5 w-80 border-r border-slate-300 sticky left-0 z-10 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]"
                                style={{ backgroundColor: deptColor }}
                              >
                                <div className="flex flex-col gap-1.5">
                                  <input
                                    type="text"
                                    value={staff.name}
                                    onChange={(e) =>
                                      handleStaffDetailChange(
                                        staff.id,
                                        'name',
                                        e.target.value,
                                        staff.staffType
                                      )
                                    }
                                    disabled={readOnlyMode}
                                    className="font-bold text-xs text-slate-800 bg-white/70 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded p-1 transition-all w-full uppercase disabled:opacity-60 disabled:cursor-not-allowed"
                                    placeholder="Nome"
                                  />
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className="w-3 h-3 rounded-full shrink-0"
                                      style={{ backgroundColor: staff.color }}
                                    />
                                    <input
                                      type="text"
                                      value={staff.subject}
                                      onChange={(e) =>
                                        handleStaffDetailChange(
                                          staff.id,
                                          'subject',
                                          e.target.value,
                                          staff.staffType
                                        )
                                      }
                                      disabled={readOnlyMode}
                                      className="text-[10px] text-slate-700 font-bold bg-white/70 hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded p-0.5 transition-all w-full uppercase disabled:opacity-60 disabled:cursor-not-allowed"
                                      placeholder="Materia"
                                    />
                                    <button
                                      onClick={() =>
                                        handleDeleteStaff(
                                          staff.id,
                                          staff.staffType
                                        )
                                      }
                                      disabled={readOnlyMode}
                                      title="Rimuovi docente"
                                      className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-1 py-0.5 rounded font-bold transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                  <div
                                    className="text-[9px] text-indigo-600 font-bold bg-indigo-50/80 rounded px-1.5 py-0.5 mt-0.5 truncate"
                                    title={classSummary}
                                  >
                                    Cls: {classSummary}
                                  </div>
                                  {staff.preferConsecutive && (
                                    <div
                                      className="text-[9px] text-purple-700 font-bold bg-purple-100 rounded px-1.5 py-0.5 mt-0.5 truncate flex items-center gap-1"
                                      title="Preferenza 2 ore consecutive attive"
                                    >
                                      <span>🔗</span> 2h Consecutive
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 w-16 border-r-4 border-slate-300 text-center font-bold text-indigo-700 bg-indigo-50/10 sticky left-80 z-10 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]">
                                {hoursPlanned}h
                              </td>
                              {DAYS_IN_USE.map((day, dIdx) => {
                                const activeHours =
                                  masterHourFilter === 'diurno'
                                    ? diurnalHours
                                    : afternoonHours;
                                const isDayOff = (
                                  generationRules.teacherDaysOff[staff.id] || []
                                ).includes(dIdx);
                                return activeHours.map((hObj, hIdx) => {
                                  const currentHour = hObj.index;
                                  const isLastHourOfDay =
                                    hIdx === activeHours.length - 1 &&
                                    dIdx < DAYS_IN_USE.length - 1;
                                  const borderClass = isLastHourOfDay
                                    ? 'border-r-4 border-slate-300'
                                    : 'border-r border-slate-200';
                                  const isHourOff =
                                    !isDayOff &&
                                    isTeacherOff(
                                      generationRules,
                                      staff.id,
                                      dIdx,
                                      currentHour
                                    );
                                  if (isDayOff || isHourOff)
                                    return (
                                      <td
                                        key={`${dIdx}_${currentHour}`}
                                        className={`p-1 align-middle ${borderClass}`}
                                        style={{
                                          backgroundColor: isHourOff
                                            ? HOUR_OFF_COLOR
                                            : DAY_OFF_COLOR,
                                          backgroundImage:
                                            'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(153, 27, 27, 0.1) 8px, rgba(153, 27, 27, 0.1) 16px)',
                                        }}
                                      >
                                        <div
                                          className={`w-full text-center text-[10px] font-bold py-1 rounded select-none cursor-not-allowed ${
                                            isHourOff
                                              ? 'text-amber-800'
                                              : 'text-red-800'
                                          }`}
                                        >
                                          {isHourOff ? 'N.D.' : 'LIBERO'}
                                        </div>
                                      </td>
                                    );
                                  const occupiedSlot = timetable.find(
                                    (slot) =>
                                      slot.teacherId === staff.id &&
                                      slot.day === dIdx &&
                                      slot.hour === currentHour
                                  );
                                  return (
                                    <td
                                      key={`${dIdx}_${currentHour}`}
                                      className={`p-1 align-middle ${borderClass}`}
                                    >
                                      <select
                                        value={
                                          occupiedSlot
                                            ? occupiedSlot.classId
                                            : ''
                                        }
                                        onChange={(e) =>
                                          handleUpdateCellDirectly(
                                            staff.id,
                                            dIdx,
                                            currentHour,
                                            e.target.value,
                                            staff.staffType
                                          )
                                        }
                                        disabled={readOnlyMode}
                                        className={`w-full text-center text-xs font-bold rounded p-1 border cursor-pointer transition-all ${
                                          occupiedSlot
                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                            : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                                      >
                                        <option
                                          value=""
                                          className="bg-white text-slate-500"
                                        >
                                          -
                                        </option>
                                        {classes.map((c) => (
                                          <option
                                            key={c.id}
                                            value={c.id}
                                            className="bg-white text-slate-800"
                                          >
                                            {c.id}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  );
                                });
                              })}
                            </tr>
                          </React.Fragment>
                        );
                      });
                    })()}
                    <tr className="bg-slate-50 print:hidden">
                      <td
                        className="p-3 sticky left-0 z-10 bg-slate-100 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)] w-80 min-w-[20rem]"
                        colSpan={1}
                      >
                        <form
                          onSubmit={handleCreateTeacherDirectly}
                          className="flex flex-col gap-2"
                        >
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            ➕ Inserimento Rapido:
                          </span>
                          <input
                            type="text"
                            placeholder="Cognome Nome"
                            value={newTeacherName}
                            onChange={(e) => setNewTeacherName(e.target.value)}
                            disabled={readOnlyMode}
                            className="text-xs border border-slate-300 rounded-lg p-2 uppercase bg-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                          />
                          <input
                            type="text"
                            placeholder="Materia/Strumento"
                            value={newTeacherSubject}
                            onChange={(e) =>
                              setNewTeacherSubject(e.target.value)
                            }
                            disabled={readOnlyMode}
                            className="text-xs border border-slate-300 rounded-lg p-2 uppercase bg-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                          />
                          <div className="flex gap-1">
                            <select
                              value={newTeacherType}
                              onChange={(e) =>
                                setNewTeacherType(e.target.value)
                              }
                              disabled={readOnlyMode}
                              className="text-[10px] border border-slate-300 rounded-lg p-1 bg-white flex-1 disabled:opacity-50"
                            >
                              <option value="materia">Materia</option>
                              <option value="sostegno">Sostegno</option>
                              <option value="strumento">Strumento</option>
                            </select>
                            <input
                              type="color"
                              value={newTeacherColor}
                              onChange={(e) =>
                                setNewTeacherColor(e.target.value)
                              }
                              disabled={readOnlyMode}
                              className="w-8 h-8 rounded-lg cursor-pointer p-0.5 border disabled:opacity-50"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={readOnlyMode}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-xs mt-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Aggiungi Staff
                          </button>
                        </form>
                      </td>
                      <td
                        colSpan={
                          masterHourFilter === 'diurno'
                            ? 6 * diurnalHours.length + 1
                            : 6 * afternoonHours.length + 1
                        }
                        className="bg-slate-50/50 sticky left-80"
                      ></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0">
              <div>
                💡 <strong>Salvataggio automatico:</strong> ogni modifica viene
                salvata subito nello spazio di lavoro attivo.
              </div>
              <span className="font-bold shrink-0 bg-amber-100 px-2 py-1 rounded">
                EduTime v7.1
              </span>
            </div>
          </div>
        )}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between print:hidden">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-semibold text-slate-700">Filtro:</span>
                <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 overflow-x-auto max-w-full">
                  <button
                    onClick={() => setViewType('class')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      viewType === 'class'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🏫 Classe
                  </button>
                  <button
                    onClick={() => setViewType('teacher')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      viewType === 'teacher'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    👩‍🏫 Docente
                  </button>
                  <button
                    onClick={() => setViewType('sostegno')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      viewType === 'sostegno'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🤝 Sostegno
                  </button>
                  <button
                    onClick={() => setViewType('strumento')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      viewType === 'strumento'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🎵 Strumento
                  </button>
                  <button
                    onClick={() => setViewType('department')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      viewType === 'department'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📚 Dipartimento
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewType === 'class' && (
                  <>
                    <span className="text-sm text-slate-500">Classe:</span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-slate-700 font-semibold focus:ring-1 focus:ring-indigo-500"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.id}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        handlePrintBypass('single_class', selectedClass)
                      }
                      className="ml-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg"
                    >
                      🖨️
                    </button>
                  </>
                )}
                {viewType === 'teacher' && (
                  <>
                    <span className="text-sm text-slate-500">Docente:</span>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-slate-700 font-semibold focus:ring-1 focus:ring-indigo-500"
                    >
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.subject})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        handlePrintBypass('single_teacher', selectedTeacherId)
                      }
                      className="ml-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg"
                    >
                      🖨️
                    </button>
                  </>
                )}
                {viewType === 'sostegno' && (
                  <>
                    <span className="text-sm text-slate-500">Sostegno:</span>
                    <select
                      value={selectedSostegnoId}
                      onChange={(e) => setSelectedSostegnoId(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-slate-700 font-semibold focus:ring-1 focus:ring-indigo-500"
                    >
                      {sostegno.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        handlePrintBypass('single_teacher', selectedSostegnoId)
                      }
                      className="ml-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg"
                    >
                      🖨️
                    </button>
                  </>
                )}
                {viewType === 'strumento' && (
                  <>
                    <span className="text-sm text-slate-500">Strumento:</span>
                    <select
                      value={selectedStrumentoId}
                      onChange={(e) => setSelectedStrumentoId(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-slate-700 font-semibold focus:ring-1 focus:ring-indigo-500"
                    >
                      {strumento.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.subject})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        handlePrintBypass('single_teacher', selectedStrumentoId)
                      }
                      className="ml-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg"
                    >
                      🖨️
                    </button>
                  </>
                )}
                {viewType === 'department' && (
                  <>
                    <span className="text-sm text-slate-500">
                      Dipartimento:
                    </span>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-slate-700 font-semibold focus:ring-1 focus:ring-indigo-500"
                    >
                      {allDepartments.map((dep) => (
                        <option key={dep} value={dep}>
                          {dep}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>
            {viewType !== 'department' ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                        <th className="p-4 w-36 font-semibold border-r border-slate-200">
                          Ora
                        </th>
                        {DAYS_IN_USE.map((day, idx) => {
                          // Nella vista di una classe si mostrano solo i
                          // giorni del suo modello, quali che siano.
                          if (
                            viewType === 'class' &&
                            idx >= getClassGrid(selectedClass).days
                          )
                            return null;
                          return (
                            <th
                              key={day}
                              className="p-4 font-semibold text-center border-r border-slate-200 last:border-0"
                            >
                              {day}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gridHourRows.map((hObj, hIdx) => {
                        // Riga del rientro pomeridiano: la prima dopo le ore
                        // curricolari, se il modello della classe lo prevede.
                        const isRientroRow =
                          viewType === 'class' &&
                          isRientroHour(selectedClass, hIdx);
                        if (
                          viewType === 'class' &&
                          hIdx >= gridSlots(getClassGrid(selectedClass))
                        )
                          return null;
                        return (
                          <tr
                            key={hIdx}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="p-4 font-medium text-slate-600 bg-slate-50/70 border-r border-slate-200 flex flex-col justify-center h-24">
                              <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">
                                {hObj.label}
                              </span>
                              <span className="text-[10px] text-slate-500 mt-1">
                                {hObj.time}
                              </span>
                            </td>
                            {DAYS_IN_USE.map((day, dIdx) => {
                              if (
                                viewType === 'class' &&
                                dIdx >= getClassGrid(selectedClass).days
                              )
                                return null;
                              if (viewType === 'class') {
                                const classLessons = timetable.filter(
                                  (slot) =>
                                    slot.classId === selectedClass &&
                                    slot.day === dIdx &&
                                    slot.hour === hIdx
                                );
                                const materia = classLessons.find(
                                  (l) => l.type === 'materia'
                                );
                                const sost = classLessons.find(
                                  (l) => l.type === 'sostegno'
                                );
                                const pmLesson = classLessons.find(
                                  (l) => l.type === 'pomeriggio_musica'
                                );
                                const noteKey = materia
                                  ? getNoteKey(
                                      selectedClass,
                                      dIdx,
                                      hIdx,
                                      'materia'
                                    )
                                  : null;
                                const hasNote = noteKey && cellNotes[noteKey];
                                const cellDeptColor = materia
                                  ? getDeptColor(materia.subject)
                                  : null;
                                if (pmLesson && !materia)
                                  return (
                                    <td
                                      key={dIdx}
                                      onClick={() =>
                                        !readOnlyMode &&
                                        setEditingCell({
                                          classId: selectedClass,
                                          day: dIdx,
                                          hour: hIdx,
                                        })
                                      }
                                      className={`p-3 border-r border-slate-200 text-center relative ${
                                        readOnlyMode
                                          ? ''
                                          : 'cursor-pointer hover:bg-emerald-50/60'
                                      } transition-all h-24 align-middle`}
                                    >
                                      <div className="border-l-4 border-emerald-400 pl-2 text-left h-full flex flex-col justify-between">
                                        <div>
                                          <p className="font-bold text-emerald-800 text-xs sm:text-sm truncate">
                                            {pmLesson.subject}
                                          </p>
                                          <p className="text-xs text-slate-500 truncate">
                                            {teachers.find(
                                              (t) => t.id === pmLesson.teacherId
                                            )?.name ||
                                              strumento.find(
                                                (m) =>
                                                  m.id === pmLesson.teacherId
                                              )?.name}
                                          </p>
                                          {isNamedRoom(pmLesson.room) && (
                                            <p
                                              className="text-[10px] text-emerald-700 font-semibold truncate"
                                              title={`Aula: ${pmLesson.room}`}
                                            >
                                              📍 {pmLesson.room}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                return (
                                  <td
                                    key={dIdx}
                                    onClick={() =>
                                      !readOnlyMode &&
                                      setEditingCell({
                                        classId: selectedClass,
                                        day: dIdx,
                                        hour: hIdx,
                                      })
                                    }
                                    className={`p-3 border-r border-slate-200 text-center relative ${
                                      readOnlyMode
                                        ? ''
                                        : 'cursor-pointer hover:bg-indigo-50/60'
                                    } transition-all h-24 align-middle`}
                                    style={
                                      cellDeptColor
                                        ? { backgroundColor: cellDeptColor }
                                        : {}
                                    }
                                  >
                                    {materia ? (
                                      <div className="relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setTimetable((prev) =>
                                              prev.map((s) =>
                                                s === materia
                                                  ? { ...s, locked: !s.locked }
                                                  : s
                                              )
                                            );
                                          }}
                                          className="absolute -top-1 -left-1 bg-slate-800 text-white rounded-br-lg px-1.5 py-0.5 text-[10px] hover:bg-slate-900 z-10 shadow-md"
                                        >
                                          {materia.locked ? '🔒' : '🔓'}
                                        </button>
                                        <div
                                          style={{
                                            borderLeftColor:
                                              teachers.find(
                                                (t) =>
                                                  t.id === materia.teacherId
                                              )?.color || '#94a3b8',
                                          }}
                                          className="border-l-4 pl-2 text-left h-full flex flex-col justify-between"
                                        >
                                          <div>
                                            <p className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                                              {materia.subject}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                              {
                                                teachers.find(
                                                  (t) =>
                                                    t.id === materia.teacherId
                                                )?.name
                                              }
                                            </p>
                                            {isNamedRoom(materia.room) && (
                                              <p
                                                className="text-[10px] text-indigo-700 font-semibold truncate"
                                                title={`Aula: ${materia.room}`}
                                              >
                                                📍 {materia.room}
                                              </p>
                                            )}
                                          </div>
                                          {sost && (
                                            <div className="mt-1.5 text-[10px] bg-purple-100 text-purple-800 font-semibold px-1.5 py-0.5 rounded-sm inline-block self-start">
                                              🤝{' '}
                                              {
                                                sostegno.find(
                                                  (s) => s.id === sost.teacherId
                                                )?.name
                                              }
                                            </div>
                                          )}
                                        </div>
                                        {hasNote && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingNoteCell({
                                                classId: selectedClass,
                                                day: dIdx,
                                                hour: hIdx,
                                                type: 'materia',
                                              });
                                              setNoteText(
                                                cellNotes[noteKey] || ''
                                              );
                                            }}
                                            className="absolute top-0 right-0 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md transition-all"
                                            title={cellNotes[noteKey]}
                                          >
                                            📝
                                          </button>
                                        )}
                                        {!hasNote && !readOnlyMode && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingNoteCell({
                                                classId: selectedClass,
                                                day: dIdx,
                                                hour: hIdx,
                                                type: 'materia',
                                              });
                                              setNoteText('');
                                            }}
                                            className="absolute top-0 right-0 bg-slate-200 hover:bg-yellow-400 text-slate-600 hover:text-yellow-900 rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all"
                                            title="Aggiungi nota"
                                          >
                                            +
                                          </button>
                                        )}
                                      </div>
                                    ) : isRientroRow ? (
                                      <span className="text-[11px] text-emerald-600 italic bg-emerald-50 px-2 py-1 rounded border border-emerald-100 block">
                                        Fine diurno
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-300 italic">
                                        Ora Libera
                                      </span>
                                    )}
                                  </td>
                                );
                              }
                              if (viewType === 'teacher') {
                                const isDayOff = (
                                  generationRules.teacherDaysOff[
                                    selectedTeacherId
                                  ] || []
                                ).includes(dIdx);
                                const isHourOff =
                                  !isDayOff &&
                                  isTeacherOff(
                                    generationRules,
                                    selectedTeacherId,
                                    dIdx,
                                    hIdx
                                  );
                                if (isDayOff || isHourOff)
                                  return (
                                    <td
                                      key={dIdx}
                                      className="p-3 border-r border-slate-200 text-center h-24 align-middle"
                                      style={{
                                        backgroundColor: isHourOff
                                          ? HOUR_OFF_COLOR
                                          : DAY_OFF_COLOR,
                                        backgroundImage:
                                          'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(153, 27, 27, 0.1) 10px, rgba(153, 27, 27, 0.1) 20px)',
                                      }}
                                    >
                                      <span
                                        className={`font-bold text-xs select-none ${
                                          isHourOff
                                            ? 'text-amber-800'
                                            : 'text-red-800'
                                        }`}
                                      >
                                        {isHourOff
                                          ? 'NON DISPONIBILE'
                                          : 'LIBERO'}
                                      </span>
                                    </td>
                                  );
                                const slotOccupied = timetable.find(
                                  (slot) =>
                                    slot.teacherId === selectedTeacherId &&
                                    slot.day === dIdx &&
                                    slot.hour === hIdx &&
                                    slot.type === 'materia'
                                );
                                const deptColor = slotOccupied
                                  ? getDeptColor(slotOccupied.subject)
                                  : '#fff';
                                return (
                                  <td
                                    key={dIdx}
                                    className="p-3 border-r border-slate-200 text-center h-24 align-middle"
                                    style={{ backgroundColor: deptColor }}
                                  >
                                    {slotOccupied ? (
                                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 flex flex-col justify-center items-center h-full">
                                        <span className="font-bold text-indigo-700 text-lg">
                                          {slotOccupied.classId}
                                        </span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                                          {slotOccupied.subject}
                                        </span>
                                        {isNamedRoom(slotOccupied.room) && (
                                          <span
                                            className="text-[10px] text-indigo-700 font-semibold truncate max-w-full"
                                            title={`Aula: ${slotOccupied.room}`}
                                          >
                                            📍 {slotOccupied.room}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-200">
                                        Libero
                                      </span>
                                    )}
                                  </td>
                                );
                              }
                              if (viewType === 'sostegno') {
                                const isDayOff = (
                                  generationRules.teacherDaysOff[
                                    selectedSostegnoId
                                  ] || []
                                ).includes(dIdx);
                                const isHourOff =
                                  !isDayOff &&
                                  isTeacherOff(
                                    generationRules,
                                    selectedSostegnoId,
                                    dIdx,
                                    hIdx
                                  );
                                if (isDayOff || isHourOff)
                                  return (
                                    <td
                                      key={dIdx}
                                      className="p-3 border-r border-slate-200 text-center h-24 align-middle"
                                      style={{
                                        backgroundColor: isHourOff
                                          ? HOUR_OFF_COLOR
                                          : DAY_OFF_COLOR,
                                        backgroundImage:
                                          'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(153, 27, 27, 0.1) 10px, rgba(153, 27, 27, 0.1) 20px)',
                                      }}
                                    >
                                      <span
                                        className={`font-bold text-xs select-none ${
                                          isHourOff
                                            ? 'text-amber-800'
                                            : 'text-red-800'
                                        }`}
                                      >
                                        {isHourOff
                                          ? 'NON DISPONIBILE'
                                          : 'LIBERO'}
                                      </span>
                                    </td>
                                  );
                                const slotOccupied = timetable.find(
                                  (slot) =>
                                    slot.teacherId === selectedSostegnoId &&
                                    slot.day === dIdx &&
                                    slot.hour === hIdx &&
                                    slot.type === 'sostegno'
                                );
                                return (
                                  <td
                                    key={dIdx}
                                    className="p-3 border-r border-slate-200 text-center h-24 align-middle bg-white"
                                  >
                                    {slotOccupied ? (
                                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 flex flex-col justify-center items-center h-full">
                                        <span className="font-bold text-purple-700 text-sm">
                                          Classe {slotOccupied.classId}
                                        </span>
                                        <span className="text-[10px] text-slate-500 italic mt-0.5">
                                          Sostegno
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-200">
                                        Libero
                                      </span>
                                    )}
                                  </td>
                                );
                              }
                              if (viewType === 'strumento') {
                                const isDayOff = (
                                  generationRules.teacherDaysOff[
                                    selectedStrumentoId
                                  ] || []
                                ).includes(dIdx);
                                const isHourOff =
                                  !isDayOff &&
                                  isTeacherOff(
                                    generationRules,
                                    selectedStrumentoId,
                                    dIdx,
                                    hIdx
                                  );
                                if (isDayOff || isHourOff)
                                  return (
                                    <td
                                      key={dIdx}
                                      className="p-3 border-r border-slate-200 text-center h-24 align-middle"
                                      style={{
                                        backgroundColor: isHourOff
                                          ? HOUR_OFF_COLOR
                                          : DAY_OFF_COLOR,
                                        backgroundImage:
                                          'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(153, 27, 27, 0.1) 10px, rgba(153, 27, 27, 0.1) 20px)',
                                      }}
                                    >
                                      <span
                                        className={`font-bold text-xs select-none ${
                                          isHourOff
                                            ? 'text-amber-800'
                                            : 'text-red-800'
                                        }`}
                                      >
                                        {isHourOff
                                          ? 'NON DISPONIBILE'
                                          : 'LIBERO'}
                                      </span>
                                    </td>
                                  );
                                const slotOccupied = timetable.find(
                                  (slot) =>
                                    slot.teacherId === selectedStrumentoId &&
                                    slot.day === dIdx &&
                                    slot.hour === hIdx &&
                                    slot.type === 'pomeriggio_musica'
                                );
                                const deptColor = slotOccupied
                                  ? getDeptColor(slotOccupied.subject)
                                  : '#fafafa';
                                return (
                                  <td
                                    key={dIdx}
                                    className={`p-3 border-r border-slate-200 text-center h-24 align-middle`}
                                    style={{ backgroundColor: deptColor }}
                                  >
                                    {slotOccupied ? (
                                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex flex-col justify-center items-center h-full">
                                        <span className="font-bold text-emerald-700 text-lg">
                                          {slotOccupied.classId}
                                        </span>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                                          {slotOccupied.subject}
                                        </span>
                                        {isNamedRoom(slotOccupied.room) && (
                                          <span
                                            className="text-[10px] text-indigo-700 font-semibold truncate max-w-full"
                                            title={`Aula: ${slotOccupied.room}`}
                                          >
                                            📍 {slotOccupied.room}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-300">
                                        -
                                      </span>
                                    )}
                                  </td>
                                );
                              }
                              return null;
                            })}
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-100 border-t-2 border-indigo-200">
                        <td
                          colSpan={7}
                          className="p-2 text-center text-xs font-bold text-indigo-800 tracking-wider"
                        >
                          🎵 CORSO POMERIDIANO AD INDIRIZZO MUSICALE
                        </td>
                      </tr>
                      {afternoonHours.map((hObj) => {
                        const hIdx = hObj.index;
                        return (
                          <tr
                            key={hIdx}
                            className="bg-slate-50/50 hover:bg-slate-50 transition-colors"
                          >
                            <td className="p-4 font-medium text-slate-600 bg-slate-50/70 border-r border-slate-200 flex flex-col justify-center h-20">
                              <span className="text-[10px] text-purple-600 font-bold tracking-wider">
                                {hObj.label}
                              </span>
                              <span className="text-[10px] text-slate-500 mt-0.5">
                                {hObj.time}
                              </span>
                            </td>
                            {DAYS_IN_USE.map((day, dIdx) => {
                              if (dIdx === 5) return null;
                              if (viewType === 'class') {
                                const pmLessons = timetable.filter(
                                  (slot) =>
                                    slot.classId === selectedClass &&
                                    slot.day === dIdx &&
                                    slot.hour === hIdx
                                );
                                return (
                                  <td
                                    key={dIdx}
                                    className={`p-2 border-r border-slate-200 h-20 align-middle ${
                                      readOnlyMode
                                        ? ''
                                        : 'cursor-pointer hover:bg-slate-100/50'
                                    } transition-colors`}
                                    onClick={() =>
                                      !readOnlyMode &&
                                      setEditingCell({
                                        classId: selectedClass,
                                        day: dIdx,
                                        hour: hIdx,
                                      })
                                    }
                                  >
                                    {pmLessons.length > 0 ? (
                                      <div className="flex flex-col gap-1">
                                        {pmLessons.map((pm, pmKey) => {
                                          const pmDeptColor = getDeptColor(
                                            pm.subject
                                          );
                                          return (
                                            <div
                                              key={pmKey}
                                              className="border-l-4 border-emerald-500 p-1 rounded-sm text-left"
                                              style={{
                                                backgroundColor: pmDeptColor,
                                              }}
                                            >
                                              <p className="text-[10px] font-bold text-emerald-800 leading-tight">
                                                {pm.subject}
                                              </p>
                                              <p className="text-[9px] text-slate-500">
                                                {
                                                  allStaff.find(
                                                    (s) => s.id === pm.teacherId
                                                  )?.name
                                                }
                                              </p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-300 italic">
                                        Libero
                                      </span>
                                    )}
                                  </td>
                                );
                              }
                              if (viewType === 'strumento') {
                                const isDayOff = (
                                  generationRules.teacherDaysOff[
                                    selectedStrumentoId
                                  ] || []
                                ).includes(dIdx);
                                const isHourOff =
                                  !isDayOff &&
                                  isTeacherOff(
                                    generationRules,
                                    selectedStrumentoId,
                                    dIdx,
                                    hIdx
                                  );
                                if (isDayOff || isHourOff)
                                  return (
                                    <td
                                      key={dIdx}
                                      className="p-2 border-r border-slate-200 h-20 text-center align-middle"
                                      style={{
                                        backgroundColor: isHourOff
                                          ? HOUR_OFF_COLOR
                                          : DAY_OFF_COLOR,
                                        backgroundImage:
                                          'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(153, 27, 27, 0.1) 10px, rgba(153, 27, 27, 0.1) 20px)',
                                      }}
                                    >
                                      <span
                                        className={`font-bold text-xs select-none ${
                                          isHourOff
                                            ? 'text-amber-800'
                                            : 'text-red-800'
                                        }`}
                                      >
                                        {isHourOff
                                          ? 'NON DISPONIBILE'
                                          : 'LIBERO'}
                                      </span>
                                    </td>
                                  );
                                const slotOccupied = timetable.find(
                                  (slot) =>
                                    slot.teacherId === selectedStrumentoId &&
                                    slot.day === dIdx &&
                                    slot.hour === hIdx
                                );
                                const deptColor = slotOccupied
                                  ? getDeptColor(slotOccupied.subject)
                                  : '#fff';
                                return (
                                  <td
                                    key={dIdx}
                                    className="p-2 border-r border-slate-200 h-20 text-center align-middle"
                                    style={{ backgroundColor: deptColor }}
                                  >
                                    {slotOccupied ? (
                                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-1 h-full flex flex-col justify-center">
                                        <p className="font-bold text-emerald-700 text-xs">
                                          Classe {slotOccupied.classId}
                                        </p>
                                        <p
                                          style={{
                                            fontSize: '9px',
                                            color: '#64748b',
                                          }}
                                        >
                                          Lezione Strumento
                                        </p>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-200 font-normal">
                                        Nessun Alunno
                                      </span>
                                    )}
                                  </td>
                                );
                              }
                              return (
                                <td
                                  key={dIdx}
                                  className="p-2 border-r border-slate-200 h-20 text-center align-middle text-xs text-slate-300 bg-slate-50/20"
                                >
                                  -
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div
                  className="p-4 border-b border-slate-200"
                  style={{ backgroundColor: getDeptColor(selectedDepartment) }}
                >
                  <h3 className="font-bold text-slate-700 text-sm uppercase">
                    👥 Dipartimento di {selectedDepartment}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-500 border-b">
                        <th className="p-3 w-64 bg-slate-100 font-semibold border-r sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                          Docente
                        </th>
                        {DAYS_IN_USE.map((day, dIdx) => (
                          <th
                            key={day}
                            colSpan={diurnalHours.length}
                            className={`p-2 font-bold text-center text-slate-700 ${
                              dIdx < DAYS_IN_USE.length - 1
                                ? 'border-r-4 border-slate-300 bg-slate-100/60'
                                : 'bg-slate-100/30'
                            }`}
                          >
                            {day}
                          </th>
                        ))}
                      </tr>
                      <tr className="bg-slate-50 text-[9px] text-slate-400 border-b">
                        <th className="p-2 bg-slate-100 border-r sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                          Carico ore
                        </th>
                        {DAYS_IN_USE.map((day, dIdx) =>
                          diurnalHours.map((dh, hIdx) => {
                            const isLast =
                              hIdx === diurnalHours.length - 1 &&
                              dIdx < DAYS_IN_USE.length - 1;
                            return (
                              <th
                                key={`${day}_h_${dh.index}`}
                                className={`p-1 text-center font-bold ${
                                  isLast
                                    ? 'border-r-4 border-slate-300'
                                    : 'border-r border-slate-100'
                                }`}
                              >
                                {dh.label}
                              </th>
                            );
                          })
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {teachers
                        .filter((t) => t.subject === selectedDepartment)
                        .map((teacher) => {
                          const totalHours =
                            teacher.assignments?.reduce(
                              (sum: number, a: any) => sum + a.hours,
                              0
                            ) || 0;
                          const deptColor = getDeptColor(teacher.subject);
                          return (
                            <tr
                              key={teacher.id}
                              className="hover:bg-slate-50/50"
                            >
                              <td
                                className="p-3 w-64 border-r sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.1)]"
                                style={{ backgroundColor: deptColor }}
                              >
                                <div className="font-bold text-slate-800 text-xs truncate">
                                  {teacher.name}
                                </div>
                                <div className="text-[10px] text-indigo-600 font-bold">
                                  {totalHours} ore assegnate
                                </div>
                              </td>
                              {DAYS_IN_USE.map((day, dIdx) => {
                                const isDayOff = (
                                  generationRules.teacherDaysOff[teacher.id] ||
                                  []
                                ).includes(dIdx);
                                return diurnalHours.map((dh, hIdx) => {
                                  const isLast =
                                    hIdx === diurnalHours.length - 1 &&
                                    dIdx < DAYS_IN_USE.length - 1;
                                  const borderStyle = isLast
                                    ? 'border-r-4 border-slate-300'
                                    : 'border-r border-slate-100';
                                  const isHourOff =
                                    !isDayOff &&
                                    isTeacherOff(
                                      generationRules,
                                      teacher.id,
                                      dIdx,
                                      dh.index
                                    );
                                  if (isDayOff || isHourOff)
                                    return (
                                      <td
                                        key={`${dIdx}_${dh.index}`}
                                        className={`p-2 text-[10px] italic font-bold text-center ${borderStyle} ${
                                          isHourOff
                                            ? 'text-amber-800'
                                            : 'text-red-800'
                                        }`}
                                        style={{
                                          backgroundColor: isHourOff
                                            ? HOUR_OFF_COLOR
                                            : DAY_OFF_COLOR,
                                          backgroundImage:
                                            'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(153,27,27,0.08) 10px, rgba(153,27,27,0.08) 20px)',
                                        }}
                                      >
                                        {isHourOff ? 'N.D.' : 'LIBERO'}
                                      </td>
                                    );
                                  const occupied = timetable.find(
                                    (slot) =>
                                      slot.teacherId === teacher.id &&
                                      slot.day === dIdx &&
                                      slot.hour === dh.index
                                  );
                                  return (
                                    <td
                                      key={`${dIdx}_${dh.index}`}
                                      className={`p-2 text-center text-xs font-bold ${borderStyle} ${
                                        occupied
                                          ? 'bg-indigo-50 text-indigo-700'
                                          : 'text-slate-300'
                                      }`}
                                    >
                                      {occupied ? occupied.classId : '-'}
                                    </td>
                                  );
                                });
                              })}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'teachers' && (
          <div className="space-y-6 flex flex-col h-full">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  📋 Registro Cattedre
                </h2>
                <p className="text-xs text-slate-500">
                  Configura le ore curricolari per docenti, Sostegno e
                  Strumento.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 shrink-0">
                  <button
                    onClick={() => setCattedreSubTab('diurne')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                      cattedreSubTab === 'diurne'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ☀️ Materie
                  </button>
                  <button
                    onClick={() => setCattedreSubTab('sostegno')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                      cattedreSubTab === 'sostegno'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🤝 Sostegno
                  </button>
                  <button
                    onClick={() => setCattedreSubTab('strumento')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                      cattedreSubTab === 'strumento'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🎵 Strumento
                  </button>
                </div>
                <button
                  onClick={() =>
                    handleSortStaffBySubject(
                      cattedreSubTab === 'diurne' ? 'materia' : cattedreSubTab
                    )
                  }
                  disabled={readOnlyMode}
                  title="Riordina l'elenco per materia e, a parità di materia, per nome"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🔤 Ordina per materia
                </button>
                <button
                  onClick={() => setShowResetModal(true)}
                  disabled={readOnlyMode}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:text-rose-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🗑️ Resetta Tutto
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md flex-1 min-h-[400px] h-[65vh] resize-y relative flex flex-col">
              <div className="overflow-x-auto overflow-y-auto flex-1 h-full">
                {cattedreSubTab === 'diurne' && (
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="sticky top-0 bg-slate-100 z-20 border-b border-slate-200 shadow-sm">
                      <tr>
                        <th className="p-3 w-64 bg-slate-200 font-bold text-slate-800 border-r border-slate-300 sticky left-0 z-30 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]">
                          Docente
                        </th>
                        <th
                          className="p-3 w-16 bg-slate-100 font-bold text-center border-r border-slate-200 text-indigo-700"
                          title="Preferenza 2 ore consecutive"
                        >
                          2h
                        </th>
                        <th className="p-3 w-20 bg-slate-100 font-bold text-center border-r border-slate-200 text-indigo-700">
                          Totale
                        </th>
                        <th
                          className="p-3 w-16 bg-slate-100 font-bold text-center border-r border-slate-200 text-amber-700"
                          title="Disponibile per supplenze retribuite nell'ora buca"
                        >
                          🩹
                        </th>
                        {classes.map((c) => (
                          <th
                            key={c.id}
                            className="p-2 w-16 bg-slate-100 font-bold text-center border-r border-slate-200 text-slate-600"
                          >
                            {c.id}
                          </th>
                        ))}
                        <th className="p-3 w-16 bg-slate-100"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {(() => {
                        let prevSubject = '';
                        return teachers.map((teacher, idx) => {
                          const totalHoursAssigned = teacher.assignments.reduce(
                            (sum: number, a: any) => sum + a.hours,
                            0
                          );
                          const deptColor = getDeptColor(teacher.subject);
                          const isNewDept =
                            teacher.subject !== prevSubject && idx > 0;
                          prevSubject = teacher.subject;
                          return (
                            <React.Fragment key={teacher.id}>
                              {isNewDept && (
                                <tr>
                                  <td
                                    colSpan={5 + classes.length}
                                    className="h-1 bg-slate-800 border-y-2 border-slate-800"
                                  ></td>
                                </tr>
                              )}
                              <tr className="hover:bg-indigo-50/20 transition-colors">
                                <td
                                  className="p-2 w-64 border-r border-slate-300 sticky left-0 z-10 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]"
                                  style={{ backgroundColor: deptColor }}
                                >
                                  <div className="flex items-center gap-2">
                                    <StaffOrderButtons
                                      index={idx}
                                      total={teachers.length}
                                      disabled={readOnlyMode}
                                      onMove={(direction) =>
                                        handleMoveStaff(
                                          teacher.id,
                                          direction,
                                          'materia'
                                        )
                                      }
                                    />
                                    <div className="min-w-0">
                                      <div className="font-bold text-xs text-slate-800 uppercase truncate">
                                        {teacher.name}
                                      </div>
                                      <div className="text-[10px] text-slate-600 uppercase font-bold truncate">
                                        {teacher.subject}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2 w-16 border-r border-slate-200 text-center bg-white">
                                  <input
                                    type="checkbox"
                                    checked={!!teacher.preferConsecutive}
                                    onChange={(e) =>
                                      handleToggleConsecutive(
                                        teacher.id,
                                        e.target.checked,
                                        'materia'
                                      )
                                    }
                                    disabled={readOnlyMode}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Richiedi 2 ore consecutive"
                                  />
                                </td>
                                <td className="p-2 w-20 border-r border-slate-200 text-center font-bold text-indigo-700 bg-indigo-50/30">
                                  {totalHoursAssigned}h
                                </td>
                                <td className="p-2 w-16 border-r border-slate-200 text-center bg-white">
                                  <input
                                    type="checkbox"
                                    checked={!!teacher.availableForPaidSubstitution}
                                    onChange={() =>
                                      handleToggleAvailableForSubstitution(
                                        teacher.id
                                      )
                                    }
                                    disabled={readOnlyMode}
                                    className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Disponibile per supplenze retribuite nell'ora buca"
                                  />
                                </td>
                                {classes.map((cls) => {
                                  const currentAssignment =
                                    teacher.assignments.find(
                                      (a: any) => a.classId === cls.id
                                    );
                                  const val = currentAssignment
                                    ? currentAssignment.hours
                                    : 0;
                                  return (
                                    <td
                                      key={cls.id}
                                      className="p-1 border-r border-slate-200 align-middle"
                                    >
                                      <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={val || ''}
                                        placeholder="-"
                                        onChange={(e) =>
                                          handleUpdateAssignment(
                                            teacher.id,
                                            cls.id,
                                            parseInt(e.target.value) || 0,
                                            'materia'
                                          )
                                        }
                                        disabled={readOnlyMode}
                                        className="w-full text-center text-xs font-bold rounded p-1.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-transparent focus:bg-white text-slate-700 placeholder-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                    </td>
                                  );
                                })}
                                <td className="p-2 w-16 text-center">
                                  <button
                                    onClick={() => {
                                      setAssignModal({
                                        staffId: teacher.id,
                                        staffType: 'materia',
                                      });
                                      setAssignClass(classes[0]?.id || '');
                                      setAssignHours(1);
                                    }}
                                    disabled={readOnlyMode}
                                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold text-xs px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    ➕
                                  </button>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                )}
                {cattedreSubTab === 'sostegno' && (
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="sticky top-0 bg-slate-100 z-20 border-b border-slate-200 shadow-sm">
                      <tr>
                        <th className="p-3 w-64 bg-slate-200 font-bold text-slate-800 border-r border-slate-300 sticky left-0 z-30 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]">
                          Docente Sostegno
                        </th>
                        <th
                          className="p-3 w-16 bg-slate-100 font-bold text-center border-r border-slate-200 text-indigo-700"
                          title="Preferenza 2 ore consecutive"
                        >
                          2h
                        </th>
                        <th className="p-3 w-20 bg-slate-100 font-bold text-center border-r border-slate-200 text-indigo-700">
                          Totale
                        </th>
                        {classes.map((c) => (
                          <th
                            key={c.id}
                            className="p-2 w-16 bg-slate-100 font-bold text-center border-r border-slate-200 text-slate-600"
                          >
                            {c.id}
                          </th>
                        ))}
                        <th className="p-3 w-16 bg-slate-100"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {sostegno.map((sos, idx) => {
                        const assignments = sos.assignments || [];
                        const totalHoursAssigned = assignments.reduce(
                          (sum: number, a: any) => sum + a.hours,
                          0
                        );
                        return (
                          <tr
                            key={sos.id}
                            className="hover:bg-indigo-50/20 transition-colors"
                          >
                            <td
                              className="p-2 w-64 border-r border-slate-300 sticky left-0 z-10 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]"
                              style={{
                                backgroundColor: getDeptColor('SOSTEGNO'),
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <StaffOrderButtons
                                  index={idx}
                                  total={sostegno.length}
                                  disabled={readOnlyMode}
                                  onMove={(direction) =>
                                    handleMoveStaff(
                                      sos.id,
                                      direction,
                                      'sostegno'
                                    )
                                  }
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-slate-800 uppercase truncate">
                                    {sos.name}
                                  </div>
                                  <div className="text-[10px] text-slate-600 uppercase font-bold truncate">
                                    {sos.subject}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-2 w-16 border-r border-slate-200 text-center bg-white">
                              <input
                                type="checkbox"
                                checked={!!sos.preferConsecutive}
                                onChange={(e) =>
                                  handleToggleConsecutive(
                                    sos.id,
                                    e.target.checked,
                                    'sostegno'
                                  )
                                }
                                disabled={readOnlyMode}
                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Richiedi 2 ore consecutive"
                              />
                            </td>
                            <td className="p-2 w-20 border-r border-slate-200 text-center font-bold text-indigo-700 bg-indigo-50/30">
                              {totalHoursAssigned}h
                            </td>
                            {classes.map((cls) => {
                              const currentAssignment = assignments.find(
                                (a: any) => a.classId === cls.id
                              );
                              const val = currentAssignment
                                ? currentAssignment.hours
                                : 0;
                              return (
                                <td
                                  key={cls.id}
                                  className="p-1 border-r border-slate-200 align-middle"
                                >
                                  <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    value={val || ''}
                                    placeholder="-"
                                    onChange={(e) =>
                                      handleUpdateAssignment(
                                        sos.id,
                                        cls.id,
                                        parseInt(e.target.value) || 0,
                                        'sostegno'
                                      )
                                    }
                                    disabled={readOnlyMode}
                                    className="w-full text-center text-xs font-bold rounded p-1.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-transparent focus:bg-white text-slate-700 placeholder-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </td>
                              );
                            })}
                            <td className="p-2 w-16 text-center">
                              <button
                                onClick={() => {
                                  setAssignModal({
                                    staffId: sos.id,
                                    staffType: 'sostegno',
                                  });
                                  setAssignClass(classes[0]?.id || '');
                                  setAssignHours(1);
                                }}
                                disabled={readOnlyMode}
                                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold text-xs px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                ➕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {cattedreSubTab === 'strumento' && (
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead className="sticky top-0 bg-slate-100 z-20 border-b border-slate-200 shadow-sm">
                      <tr>
                        <th className="p-3 w-64 bg-slate-200 font-bold text-slate-800 border-r border-slate-300 sticky left-0 z-30 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]">
                          Docente Strumento
                        </th>
                        <th
                          className="p-3 w-16 bg-slate-100 font-bold text-center border-r border-slate-200 text-indigo-700"
                          title="Preferenza 2 ore consecutive"
                        >
                          2h
                        </th>
                        <th className="p-3 w-20 bg-slate-100 font-bold text-center border-r border-slate-200 text-indigo-700">
                          Totale
                        </th>
                        {classes.map((c) => (
                          <th
                            key={c.id}
                            className="p-2 w-16 bg-slate-100 font-bold text-center border-r border-slate-200 text-slate-600"
                          >
                            {c.id}
                          </th>
                        ))}
                        <th className="p-3 w-16 bg-slate-100"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {(() => {
                        let prevSubject = '';
                        return strumento.map((str, idx) => {
                          const assignments = str.assignments || [];
                          const totalHoursAssigned = assignments.reduce(
                            (sum: number, a: any) => sum + a.hours,
                            0
                          );
                          const deptColor = getDeptColor(str.subject);
                          const isNewDept =
                            str.subject !== prevSubject && idx > 0;
                          prevSubject = str.subject;
                          return (
                            <React.Fragment key={str.id}>
                              {isNewDept && (
                                <tr>
                                  <td
                                    colSpan={4 + classes.length}
                                    className="h-1 bg-slate-800 border-y-2 border-slate-800"
                                  ></td>
                                </tr>
                              )}
                              <tr className="hover:bg-indigo-50/20 transition-colors">
                                <td
                                  className="p-2 w-64 border-r border-slate-300 sticky left-0 z-10 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.15)]"
                                  style={{ backgroundColor: deptColor }}
                                >
                                  <div className="flex items-center gap-2">
                                    <StaffOrderButtons
                                      index={idx}
                                      total={strumento.length}
                                      disabled={readOnlyMode}
                                      onMove={(direction) =>
                                        handleMoveStaff(
                                          str.id,
                                          direction,
                                          'strumento'
                                        )
                                      }
                                    />
                                    <div className="min-w-0">
                                      <div className="font-bold text-xs text-slate-800 uppercase truncate">
                                        {str.name}
                                      </div>
                                      <div className="text-[10px] text-slate-600 uppercase font-bold truncate">
                                        {str.subject}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2 w-16 border-r border-slate-200 text-center bg-white">
                                  <input
                                    type="checkbox"
                                    checked={!!str.preferConsecutive}
                                    onChange={(e) =>
                                      handleToggleConsecutive(
                                        str.id,
                                        e.target.checked,
                                        'strumento'
                                      )
                                    }
                                    disabled={readOnlyMode}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Richiedi 2 ore consecutive"
                                  />
                                </td>
                                <td className="p-2 w-20 border-r border-slate-200 text-center font-bold text-indigo-700 bg-indigo-50/30">
                                  {totalHoursAssigned}h
                                </td>
                                {classes.map((cls) => {
                                  const currentAssignment = assignments.find(
                                    (a: any) => a.classId === cls.id
                                  );
                                  const val = currentAssignment
                                    ? currentAssignment.hours
                                    : 0;
                                  return (
                                    <td
                                      key={cls.id}
                                      className="p-1 border-r border-slate-200 align-middle"
                                    >
                                      <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        value={val || ''}
                                        placeholder="-"
                                        onChange={(e) =>
                                          handleUpdateAssignment(
                                            str.id,
                                            cls.id,
                                            parseInt(e.target.value) || 0,
                                            'strumento'
                                          )
                                        }
                                        disabled={readOnlyMode}
                                        className="w-full text-center text-xs font-bold rounded p-1.5 border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-transparent focus:bg-white text-slate-700 placeholder-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                    </td>
                                  );
                                })}
                                <td className="p-2 w-16 text-center">
                                  <button
                                    onClick={() => {
                                      setAssignModal({
                                        staffId: str.id,
                                        staffType: 'strumento',
                                      });
                                      setAssignClass(classes[0]?.id || '');
                                      setAssignHours(1);
                                    }}
                                    disabled={readOnlyMode}
                                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold text-xs px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    ➕
                                  </button>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-200 border-l-4 border-l-indigo-600">
              <h2 className="text-xl font-bold text-indigo-900 mb-2">
                🧠 Regole di Auto-Generazione
              </h2>
              <ul className="text-sm text-slate-600 mb-6 list-disc pl-5">
                <li>
                  L'algoritmo escluderà i <strong>Giorni Liberi</strong> e le{' '}
                  <strong>ore bloccate</strong> di ogni docente.
                </li>
                <li>
                  Eviterà assegnazioni &gt; 10 ore in 2 giorni consecutivi.
                </li>
                <li>
                  Rispetterà il <strong>massimo ore al giorno</strong> per
                  docente e distribuirà le ore sui giorni disponibili.
                </li>
                <li>
                  Chiuderà le giornate sotto il{' '}
                  <strong>minimo ore al giorno</strong> spostando quelle ore
                  dove il docente è già a scuola.
                </li>
                <li>Compatterà le lezioni al mattino.</li>
                <li>
                  <strong>Vietato avere due ore buche di fila</strong>{' '}
                  (selezione automatica della migliore posizione).
                </li>
                <li>
                  Rispetterà la preferenza "2h consecutive" per i docenti che
                  l'hanno attivata.
                </li>
                <li>
                  <strong>Limite giorni liberi basato sulle ore:</strong> ≥18h =
                  max 1 giorno, ≥12h = max 2 giorni, altri = max 3 giorni.
                </li>
                <li>
                  <strong>Gestione Aule:</strong> Le materie speciali prenotano
                  automaticamente i laboratori evitando sovrapposizioni.
                </li>
                <li>
                  <strong>Classi Miste Lingue:</strong> Spagnolo, Francese e
                  Tedesco possono essere accorpate tra classi diverse se
                  configurato.
                </li>
              </ul>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span>⚡ Cosa Generare?</span>
                  </h3>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={generateOptions.materie}
                        onChange={(e) =>
                          handleUpdateGenOptions('materie', e.target.checked)
                        }
                        disabled={readOnlyMode}
                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                      />
                      Genera Materie Curricolari
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={generateOptions.sostegno}
                        onChange={(e) =>
                          handleUpdateGenOptions('sostegno', e.target.checked)
                        }
                        disabled={readOnlyMode}
                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                      />
                      Genera Sostegno
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={generateOptions.strumento}
                        onChange={(e) =>
                          handleUpdateGenOptions('strumento', e.target.checked)
                        }
                        disabled={readOnlyMode}
                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                      />
                      Genera Strumento
                    </label>
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    ⏱️ Limite Generale "Ore Buca"
                  </h3>
                  <div className="flex items-center gap-3">
                    <select
                      value={
                        generationRules.globalMaxGapHours !== undefined
                          ? generationRules.globalMaxGapHours
                          : 1
                      }
                      onChange={(e) =>
                        handleUpdateRules(
                          'globalMaxGapHours',
                          parseInt(e.target.value)
                        )
                      }
                      disabled={readOnlyMode}
                      className="text-sm bg-white border border-indigo-300 rounded py-1.5 px-3 focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 cursor-pointer disabled:opacity-50"
                    >
                      <option value={0}>0 ore</option>
                      <option value={1}>1 ora</option>
                      <option value={2}>2 ore</option>
                      <option value={3}>3 ore</option>
                    </select>
                    <div className="text-xs font-medium text-slate-600">
                      Limite{' '}
                      <span className="font-bold underline">predefinito</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 mt-5 mb-3 flex items-center gap-2">
                    📆 Massimo Ore al Giorno
                  </h3>
                  <div className="flex items-center gap-3">
                    <select
                      value={maxHoursPerDayFor(generationRules)}
                      onChange={(e) =>
                        handleUpdateRules(
                          'globalMaxHoursPerDay',
                          parseInt(e.target.value)
                        )
                      }
                      disabled={readOnlyMode}
                      className="text-sm bg-white border border-indigo-300 rounded py-1.5 px-3 focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 cursor-pointer disabled:opacity-50"
                    >
                      <option value={4}>4 ore</option>
                      <option value={5}>5 ore</option>
                      <option value={6}>6 ore</option>
                      <option value={0}>Nessun limite</option>
                    </select>
                    <div className="text-xs font-medium text-slate-600">
                      Per docente, così la settimana non si schiaccia su pochi
                      giorni
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 mt-5 mb-3 flex items-center gap-2">
                    🚪 Minimo Ore al Giorno
                  </h3>
                  <div className="flex items-center gap-3">
                    <select
                      value={minHoursPerDayFor(generationRules)}
                      onChange={(e) =>
                        handleUpdateRules(
                          'globalMinHoursPerDay',
                          parseInt(e.target.value)
                        )
                      }
                      disabled={readOnlyMode}
                      className="text-sm bg-white border border-indigo-300 rounded py-1.5 px-3 focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 cursor-pointer disabled:opacity-50"
                    >
                      <option value={0}>Nessun minimo</option>
                      <option value={2}>2 ore</option>
                      <option value={3}>3 ore</option>
                    </select>
                    <div className="text-xs font-medium text-slate-600">
                      Niente viaggi a scuola per un'ora sola
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col h-80">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 shrink-0">
                    ⏱️ Limite "Ore Buca" per Docente
                  </h3>
                  <div className="space-y-2 overflow-y-auto pr-2 flex-1">
                    {allStaff.map((staff) => {
                      const customGap =
                        generationRules.teacherMaxGapHours?.[staff.id];
                      const deptColor = getDeptColor(staff.subject);
                      return (
                        <div
                          key={staff.id}
                          className="flex items-center justify-between p-2 rounded border border-slate-100"
                          style={{ backgroundColor: deptColor }}
                        >
                          <span className="text-xs font-bold text-slate-700">
                            {staff.name}
                          </span>
                          <select
                            value={customGap !== undefined ? customGap : -1}
                            onChange={(e) =>
                              handleUpdateRules(
                                'teacherMaxGapHours',
                                parseInt(e.target.value),
                                staff.id
                              )
                            }
                            disabled={readOnlyMode}
                            className={`text-xs border rounded py-1 px-1.5 focus:ring-1 focus:ring-indigo-500 ${
                              customGap !== undefined
                                ? 'bg-white border-indigo-200 font-bold text-indigo-700'
                                : 'bg-white/80 border-slate-200 text-slate-500'
                            } disabled:opacity-50`}
                          >
                            <option value={-1}>Predefinito</option>
                            <option value={0}>0 ore buca</option>
                            <option value={1}>Max 1 ora</option>
                            <option value={2}>Max 2 ore</option>
                            <option value={3}>Max 3 ore</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col h-80">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 shrink-0">
                    🌴 Indisponibilità
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 shrink-0">
                    Se il docente non ha giorni liberi,{' '}
                    <strong>
                      il sistema gliene assegnerà uno in automatico
                    </strong>
                    . Con ⏰ blocchi le singole ore, per chi è in comune con
                    un altro istituto.
                  </p>
                  <div className="space-y-2 overflow-y-auto pr-2 flex-1">
                    {allStaff.map((staff) => {
                      const daysOffArr =
                        generationRules.teacherDaysOff[staff.id] || [];
                      const hoursOffArr =
                        (generationRules.teacherHoursOff || {})[staff.id] || [];
                      const deptColor = getDeptColor(staff.subject);
                      const plannedHours = staffHoursPlanned[staff.id] || 0;
                      const maxDays = getMaxDaysOffForHours(plannedHours);
                      const isLimitReached = daysOffArr.length >= maxDays;
                      const isHoursOpen = hoursOffEditorId === staff.id;
                      const staffHoursList =
                        staff.staffType === 'strumento'
                          ? afternoonHours
                          : diurnalHours;
                      const toggleHour = (day: number, hour: number) => {
                        if (readOnlyMode) return;
                        const key = hourOffKey(day, hour);
                        const nextArr = hoursOffArr.includes(key)
                          ? hoursOffArr.filter((k: string) => k !== key)
                          : [...hoursOffArr, key];
                        handleUpdateRules(
                          'teacherHoursOff',
                          nextArr,
                          staff.id
                        );
                      };
                      return (
                        <div
                          key={staff.id}
                          className="p-2 rounded border border-slate-100"
                          style={{ backgroundColor: deptColor }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col w-1/2">
                              <span
                                className="text-xs font-bold text-slate-700 truncate"
                                title={staff.name}
                              >
                                {staff.name}
                              </span>
                              <span className="text-[9px] text-slate-500">
                                Max {maxDays} gg libero/i ({plannedHours}h)
                                {hoursOffArr.length > 0
                                  ? ` · ${hoursOffArr.length} ore bloccate`
                                  : ''}
                              </span>
                            </div>
                            <div className="flex gap-1 items-center">
                              {DAYS_IN_USE.map((dName, idx) => {
                                const isOff = daysOffArr.includes(idx);
                                const isDisabled =
                                  readOnlyMode || (!isOff && isLimitReached);
                                const hasPartial =
                                  !isOff &&
                                  hasHoursOffOnDay(
                                    generationRules,
                                    staff.id,
                                    idx
                                  );
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      if (readOnlyMode) return;
                                      const nextArr = isOff
                                        ? daysOffArr.filter((x) => x !== idx)
                                        : [...daysOffArr, idx];
                                      handleUpdateRules(
                                        'teacherDaysOff',
                                        nextArr,
                                        staff.id
                                      );
                                    }}
                                    disabled={isDisabled}
                                    className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold transition-all border ${
                                      isOff
                                        ? 'bg-red-600 border-red-700 text-white shadow-inner'
                                        : hasPartial
                                        ? 'bg-amber-100 border-amber-400 text-amber-700'
                                        : 'bg-white/80 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-300'
                                    } ${
                                      isDisabled && !isOff
                                        ? 'opacity-30 cursor-not-allowed'
                                        : ''
                                    } disabled:cursor-not-allowed`}
                                    title={
                                      hasPartial
                                        ? `${dName} — alcune ore bloccate`
                                        : dName
                                    }
                                  >
                                    {DAY_INITIALS[idx]}
                                  </button>
                                );
                              })}
                              <button
                                onClick={() =>
                                  setHoursOffEditorId(
                                    isHoursOpen ? null : staff.id
                                  )
                                }
                                className={`w-6 h-6 flex items-center justify-center rounded text-[10px] border transition-all ${
                                  isHoursOpen
                                    ? 'bg-indigo-600 border-indigo-700 text-white'
                                    : 'bg-white/80 border-slate-200 hover:bg-white hover:border-indigo-300'
                                }`}
                                title="Blocca singole ore"
                              >
                                ⏰
                              </button>
                            </div>
                          </div>
                          {isHoursOpen && (
                            <div className="mt-2 pt-2 border-t border-white/70">
                              <p className="text-[9px] text-slate-500 mb-1">
                                Clicca le ore in cui il docente non è a scuola
                                (es. impegnato in un altro istituto). I giorni
                                interi restano segnati con i tasti sopra.
                              </p>
                              <div className="overflow-x-auto">
                                <table className="text-[9px] border-collapse">
                                  <thead>
                                    <tr>
                                      <th className="p-0.5"></th>
                                      {DAYS_IN_USE.map((dName, dIdx) => (
                                        <th
                                          key={dIdx}
                                          className="p-0.5 font-bold text-slate-600"
                                          title={dName}
                                        >
                                          {DAY_INITIALS[dIdx]}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {staffHoursList.map((h: any) => (
                                      <tr key={h.index}>
                                        <td
                                          className="p-0.5 font-bold text-slate-600 whitespace-nowrap"
                                          title={h.time}
                                        >
                                          {h.label}
                                        </td>
                                        {DAYS_IN_USE.map((dName, dIdx) => {
                                          const dayIsOff =
                                            daysOffArr.includes(dIdx);
                                          const isBlocked =
                                            hoursOffArr.includes(
                                              hourOffKey(dIdx, h.index)
                                            );
                                          return (
                                            <td key={dIdx} className="p-0.5">
                                              <button
                                                onClick={() =>
                                                  toggleHour(dIdx, h.index)
                                                }
                                                disabled={
                                                  readOnlyMode || dayIsOff
                                                }
                                                title={`${dName} ${h.label} (${h.time})`}
                                                className={`w-6 h-5 rounded border transition-all ${
                                                  dayIsOff
                                                    ? 'bg-red-200 border-red-300 cursor-not-allowed'
                                                    : isBlocked
                                                    ? 'bg-amber-500 border-amber-600 text-white font-bold'
                                                    : 'bg-white/80 border-slate-200 hover:border-amber-400'
                                                }`}
                                              >
                                                {dayIsOff
                                                  ? ''
                                                  : isBlocked
                                                  ? '×'
                                                  : ''}
                                              </button>
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 border-l-4 border-l-emerald-600">
              <h2 className="text-xl font-bold text-emerald-900 mb-2">
                🌍 Classi Miste (Lingue Straniere)
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Configura accorpamenti per Spagnolo, Francese e Tedesco.
                L'algoritmo metterà le lezioni nelle due classi
                contemporaneamente se lo stesso docente è assegnato ad entrambe.
              </p>
              <div className="flex flex-wrap gap-2 mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <select
                  value={newMixSubj}
                  onChange={(e) => setNewMixSubj(e.target.value)}
                  disabled={readOnlyMode}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50"
                >
                  <option value="SPAGNOLO">SPAGNOLO</option>
                  <option value="FRANCESE">FRANCESE</option>
                  <option value="TEDESCO">TEDESCO</option>
                </select>
                <select
                  value={newMixC1}
                  onChange={(e) => setNewMixC1(e.target.value)}
                  disabled={readOnlyMode}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50"
                >
                  <option value="">Classe 1</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                    </option>
                  ))}
                </select>
                <select
                  value={newMixC2}
                  onChange={(e) => setNewMixC2(e.target.value)}
                  disabled={readOnlyMode}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50"
                >
                  <option value="">Classe 2</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addMixedClass}
                  disabled={readOnlyMode}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ➕ Aggiungi Gruppo Misto
                </button>
              </div>
              <div className="space-y-2">
                {mixedClasses.map((mc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <span className="text-sm font-bold text-slate-700">
                      {mc.subject}: {mc.c1} + {mc.c2}
                    </span>
                    <button
                      onClick={() => removeMixedClass(idx)}
                      disabled={readOnlyMode}
                      className="text-rose-500 hover:text-rose-700 font-bold text-xs disabled:opacity-50"
                    >
                      🗑️ Rimuovi
                    </button>
                  </div>
                ))}
                {mixedClasses.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center">
                    Nessun gruppo misto configurato.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                🔗 Vincoli di Accorpamento / Co-presenza
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Forza o monitora le ore in compresenza per classi diverse (es.
                Ed. Fisica o progetti comuni).
              </p>
              <div className="flex flex-wrap gap-2 mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <select
                  value={newGroupC1}
                  onChange={(e) => setNewGroupC1(e.target.value)}
                  disabled={readOnlyMode}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50"
                >
                  <option value="">Classe 1</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                    </option>
                  ))}
                </select>
                <select
                  value={newGroupC2}
                  onChange={(e) => setNewGroupC2(e.target.value)}
                  disabled={readOnlyMode}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50"
                >
                  <option value="">Classe 2</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                    </option>
                  ))}
                </select>
                <select
                  value={newGroupSubj}
                  onChange={(e) => setNewGroupSubj(e.target.value)}
                  disabled={readOnlyMode}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50"
                >
                  <option value="">Materia</option>
                  {allDepartments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addGroupConstraint}
                  disabled={readOnlyMode}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ➕ Aggiungi Vincolo
                </button>
              </div>
              <div className="space-y-2">
                {groupConstraints.map((gc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <span className="text-sm font-bold text-slate-700">
                      {gc.class1} + {gc.class2}{' '}
                      <span className="text-indigo-600">({gc.subject})</span>
                    </span>
                    <button
                      onClick={() => removeGroupConstraint(idx)}
                      disabled={readOnlyMode}
                      className="text-rose-500 hover:text-rose-700 font-bold text-xs disabled:opacity-50"
                    >
                      🗑️ Rimuovi
                    </button>
                  </div>
                ))}
                {groupConstraints.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center">
                    Nessun vincolo di accorpamento impostato.
                  </p>
                )}
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                ⚙️ Gestione Sezioni
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Aggiungi, rinomina o rimuovi le sezioni dell'istituto.
              </p>
              <p className="text-sm text-slate-500 mb-4">
                La griglia oraria dei due modelli è modificabile: giorni della
                settimana, ore al giorno ed eventuale rientro pomeridiano. Il
                generatore, i controlli, le tabelle e le stampe seguono questi
                numeri.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {[
                  {
                    model: 'modelloA',
                    nome: 'Modello A',
                    box: 'bg-indigo-50 border-indigo-100',
                    tag: 'bg-indigo-100 text-indigo-800',
                  },
                  {
                    model: 'modelloB',
                    nome: 'Modello B',
                    box: 'bg-amber-50 border-amber-100',
                    tag: 'bg-amber-100 text-amber-800',
                  },
                ].map(({ model, nome, box, tag }) => {
                  const grid =
                    modelGrids?.[model] || DEFAULT_MODEL_GRIDS[model];
                  return (
                    <div
                      key={model}
                      className={`p-5 rounded-2xl border ${box}`}
                    >
                      <span
                        className={`${tag} text-xs font-bold px-3 py-1 rounded-full uppercase`}
                      >
                        {nome}
                      </span>
                      <h3 className="text-lg font-bold text-slate-800 mt-3 mb-3">
                        {grid.days} giorni ({DAYS[0].slice(0, 3).toLowerCase()}-
                        {DAYS[grid.days - 1].slice(0, 3).toLowerCase()}),{' '}
                        {grid.hours} ore
                      </h3>
                      <div className="flex flex-wrap gap-4 items-end">
                        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                          Giorni a settimana
                          <input
                            type="number"
                            min={GRID_MIN_DAYS}
                            max={GRID_MAX_DAYS}
                            value={grid.days}
                            onChange={(e) =>
                              handleUpdateModelGrid(
                                model,
                                'days',
                                Number(e.target.value)
                              )
                            }
                            disabled={readOnlyMode}
                            className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                          Ore al giorno
                          <input
                            type="number"
                            min={GRID_MIN_HOURS}
                            max={GRID_MAX_HOURS}
                            value={grid.hours}
                            onChange={(e) =>
                              handleUpdateModelGrid(
                                model,
                                'hours',
                                Number(e.target.value)
                              )
                            }
                            disabled={readOnlyMode}
                            className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 pb-1">
                          <input
                            type="checkbox"
                            checked={!!grid.rientro}
                            onChange={(e) =>
                              handleUpdateModelGrid(
                                model,
                                'rientro',
                                e.target.checked
                              )
                            }
                            disabled={readOnlyMode}
                            className="w-4 h-4 accent-indigo-600 disabled:opacity-50"
                          />
                          Rientro pomeridiano
                        </label>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-3">
                        Le etichette e gli orari delle singole ore si cambiano
                        in "Ore e Orari".
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-100 pt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h3 className="text-base font-bold text-slate-800">
                    Sezioni Attive
                  </h3>
                  <form onSubmit={handleAddSection} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nuova Sezione (es. H)"
                      value={newSectionName}
                      onChange={(e) =>
                        setNewSectionName(e.target.value.toUpperCase())
                      }
                      disabled={readOnlyMode}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-48 uppercase focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={readOnlyMode}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Aggiungi
                    </button>
                  </form>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(sectionsConfig).map(
                    ([section, config]: any) => {
                      const model = config.model;
                      const years = config.years;
                      return (
                        <div
                          key={section}
                          className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3 relative shadow-sm"
                        >
                          <button
                            onClick={() => handleDeleteSection(section)}
                            disabled={readOnlyMode}
                            className="absolute top-3 right-3 text-rose-400 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Elimina"
                          >
                            🗑️
                          </button>
                          <div className="flex items-center gap-2 pr-6">
                            <span className="text-lg font-black text-slate-700">
                              Sez. {section}
                            </span>
                            <button
                              onClick={() => {
                                if (readOnlyMode) return;
                                const newName = window
                                  .prompt(
                                    `Nuovo nome per la sezione {section}:`,
                                    section
                                  )
                                  ?.toUpperCase();
                                if (newName && newName !== section)
                                  handleRenameSection(section, newName);
                              }}
                              disabled={readOnlyMode}
                              className="text-xs text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              ✏️ Rinomina
                            </button>
                          </div>
                          <select
                            value={model}
                            onChange={(e) =>
                              handleUpdateSection(
                                section,
                                'model',
                                e.target.value
                              )
                            }
                            disabled={readOnlyMode}
                            className="text-sm bg-white border border-slate-300 rounded-lg py-1.5 px-2 font-medium w-full focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="modelloA">
                              Modello A ({(modelGrids?.modelloA ||
                                DEFAULT_MODEL_GRIDS.modelloA).days}{' '}
                              giorni)
                            </option>
                            <option value="modelloB">
                              Modello B ({(modelGrids?.modelloB ||
                                DEFAULT_MODEL_GRIDS.modelloB).days}{' '}
                              giorni)
                            </option>
                          </select>
                          <select
                            value={config.sedeId || ''}
                            onChange={(e) =>
                              handleUpdateSection(
                                section,
                                'sedeId',
                                e.target.value
                              )
                            }
                            disabled={readOnlyMode || sedi.length === 0}
                            title="Sede della sezione (per il vincolo di spostamento multi-sede)"
                            className="text-xs bg-white border border-slate-300 rounded-lg py-1 px-2 w-full focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">📍 — Nessuna sede —</option>
                            {sedi.map((s) => (
                              <option key={s.id} value={s.id}>
                                📍 {s.name}
                              </option>
                            ))}
                          </select>
                          <div className="flex justify-center gap-3 mt-1 bg-white py-2 rounded-lg border border-slate-100">
                            {SELECTABLE_YEARS.map((yr) => (
                              <label
                                key={yr}
                                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={years.includes(yr)}
                                  onChange={(e) => {
                                    if (readOnlyMode) return;
                                    const newYears = e.target.checked
                                      ? [...years, yr].sort()
                                      : years.filter((y: number) => y !== yr);
                                    handleUpdateSection(
                                      section,
                                      'years',
                                      newYears
                                    );
                                  }}
                                  disabled={readOnlyMode}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer disabled:opacity-50"
                                />
                                {yr}ª
                              </label>
                            ))}
                          </div>
                          <label className="flex items-center justify-between gap-2 mt-1 bg-white py-1.5 px-2 rounded-lg border border-slate-100 text-xs font-bold text-slate-600">
                            <span title="Ore curricolari attese in una settimana. Serve solo all'avviso nella scheda Conflitti.">
                              Monte ore
                            </span>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              step={0.5}
                              value={getSectionWeeklyHours(section)}
                              onChange={(e) =>
                                handleUpdateSection(
                                  section,
                                  'weeklyHours',
                                  Number(e.target.value)
                                )
                              }
                              disabled={readOnlyMode}
                              list="monte-ore-tipici"
                              className="w-16 text-center border border-slate-300 rounded p-1 font-normal focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                            />
                          </label>
                        </div>
                      );
                    }
                  )}
                  <datalist id="monte-ore-tipici">
                    {COMMON_WEEKLY_HOURS.map((h) => (
                      <option key={h} value={h} />
                    ))}
                  </datalist>
                  <p className="text-xs text-slate-500 col-span-full">
                    Il <strong>monte ore</strong> è il totale delle ore
                    curricolari attese in una settimana, e serve solo
                    all'avviso nella scheda Conflitti. Valori tipici: 24, 27 o
                    30 alla primaria, 30 alla secondaria di primo grado a tempo
                    normale, 36 (fino a 40) a tempo prolungato. Ogni scuola può
                    metterci il proprio.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                📍 Gestione Sedi
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Per scuole con più sedi. Assegna ogni aula/laboratorio a una
                sede qui sotto: l'Auto-Generazione lascerà automaticamente
                un'ora di buco quando un docente deve spostarsi tra sedi
                diverse in ore consecutive dello stesso giorno.
              </p>
              <form
                onSubmit={handleAddSede}
                className="flex gap-2 mb-4"
              >
                <input
                  type="text"
                  placeholder="Nuova sede (es. Plesso Via Roma)"
                  value={newSedeName}
                  onChange={(e) => setNewSedeName(e.target.value)}
                  disabled={readOnlyMode}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm flex-1 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={readOnlyMode}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Aggiungi
                </button>
              </form>
              <div className="flex flex-wrap gap-2">
                {sedi.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5"
                  >
                    <span className="text-sm font-bold text-slate-700">
                      {s.name}
                    </span>
                    <button
                      onClick={() => {
                        if (readOnlyMode) return;
                        const newName = window
                          .prompt(`Nuovo nome per "${s.name}":`, s.name)
                          ?.trim();
                        if (newName && newName !== s.name)
                          handleRenameSede(s.id, newName);
                      }}
                      disabled={readOnlyMode}
                      className="text-xs text-indigo-500 hover:text-indigo-700 cursor-pointer disabled:opacity-50"
                      title="Rinomina"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteSede(s.id)}
                      disabled={readOnlyMode}
                      className="text-xs text-rose-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                      title="Elimina"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {sedi.length === 0 && (
                  <p className="text-xs text-slate-400 italic">
                    Nessuna sede configurata: la scuola è considerata a sede
                    unica, nessun vincolo di spostamento attivo.
                  </p>
                )}
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                🏫 Gestione Aule/Laboratori
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Aggiungi, rinomina o rimuovi aule e laboratori. Utile per la
                didattica DADA: ogni laboratorio ha la sua materia collegata
                (usata per assegnare l'aula di default) ed è controllato per
                conflitti di prenotazione. "Aula" resta lo spazio generico, non
                soggetto a conflitti.
              </p>
              <form
                onSubmit={handleAddRoom}
                className="flex flex-col sm:flex-row gap-2 mb-6"
              >
                <input
                  type="text"
                  placeholder="Nome (es. Lab. Informatica)"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  disabled={readOnlyMode}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm flex-1 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
                <input
                  type="text"
                  placeholder="Materie collegate (es. TECNOLOGIA)"
                  value={newRoomSubjects}
                  onChange={(e) => setNewRoomSubjects(e.target.value)}
                  disabled={readOnlyMode}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm flex-1 uppercase focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={readOnlyMode}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Aggiungi
                </button>
              </form>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2 relative shadow-sm"
                  >
                    <button
                      onClick={() => handleDeleteRoom(r.id)}
                      disabled={readOnlyMode}
                      className="absolute top-3 right-3 text-rose-400 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Elimina"
                    >
                      🗑️
                    </button>
                    <div className="flex items-center gap-2 pr-6">
                      <span className="text-base font-black text-slate-700">
                        {r.name}
                      </span>
                      <button
                        onClick={() => {
                          if (readOnlyMode) return;
                          const newName = window
                            .prompt(`Nuovo nome per "${r.name}":`, r.name)
                            ?.trim();
                          if (newName && newName !== r.name)
                            handleRenameRoom(r.id, newName);
                        }}
                        disabled={readOnlyMode}
                        className="text-xs text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ✏️
                      </button>
                    </div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Materie collegate
                    </label>
                    <input
                      type="text"
                      defaultValue={(r.subjects || []).join(', ')}
                      onBlur={(e) =>
                        handleUpdateRoomSubjects(r.id, e.target.value)
                      }
                      disabled={readOnlyMode}
                      placeholder="es. MUSICA"
                      className="text-xs border border-slate-300 rounded-lg p-1.5 bg-white uppercase focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                      Quante ce ne sono
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={roomCapacity(r.name, rooms)}
                      onChange={(e) =>
                        handleUpdateRoomCapacity(r.id, e.target.value)
                      }
                      disabled={readOnlyMode}
                      title="Quante aule di questo tipo ha la scuola: due palestre, tre laboratori..."
                      className="text-xs border border-slate-300 rounded-lg p-1.5 bg-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                      Sede
                    </label>
                    <select
                      value={r.sedeId || ''}
                      onChange={(e) =>
                        handleUpdateRoomSede(r.id, e.target.value)
                      }
                      disabled={readOnlyMode || sedi.length === 0}
                      className="text-xs border border-slate-300 rounded-lg p-1.5 bg-white focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="">— Nessuna sede —</option>
                      {sedi.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                {rooms.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center col-span-full">
                    Nessuna aula/laboratorio configurato.
                  </p>
                )}
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                ⏰ Orari e Campanella
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Personalizza le etichette e le fasce orarie delle lezioni.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-indigo-700 flex items-center gap-1.5">
                    <span>☀️ Ore Diurne</span>
                  </h3>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                    {diurnalHours.map((dh) => (
                      <div
                        key={dh.index}
                        className="flex gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-200"
                      >
                        <span className="text-xs font-bold text-slate-400 w-12">
                          Ora {dh.index + 1}
                        </span>
                        <input
                          type="text"
                          value={dh.label}
                          onChange={(e) =>
                            handleHourLabelChange(
                              dh.index,
                              'label',
                              e.target.value,
                              true
                            )
                          }
                          disabled={readOnlyMode}
                          placeholder="Etichetta"
                          className="text-xs border border-slate-300 rounded p-1.5 bg-white w-28 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        <input
                          type="text"
                          value={dh.time}
                          onChange={(e) =>
                            handleHourLabelChange(
                              dh.index,
                              'time',
                              e.target.value,
                              true
                            )
                          }
                          disabled={readOnlyMode}
                          placeholder="Fascia"
                          className="text-xs border border-slate-300 rounded p-1.5 bg-white flex-1 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        <select
                          value={dh.duration ?? HOUR_DEFAULT_MINUTES}
                          onChange={(e) =>
                            handleHourLabelChange(
                              dh.index,
                              'duration',
                              Number(e.target.value),
                              true
                            )
                          }
                          disabled={readOnlyMode}
                          title="Durata della lezione. La mezz'ora conta 0,5 nel totale delle ore."
                          className="text-xs border border-slate-300 rounded p-1.5 bg-white w-20 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                        >
                          {HOUR_DURATION_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {m} min
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    La durata serve solo a chi ha lezioni più corte (per
                    esempio la primaria, con una lezione da 30 minuti al
                    giorno): due mezze ore contano come un'ora sola nel totale
                    del docente. Lasciando 60 minuti non cambia nulla.
                  </p>
                </div>
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-purple-700 flex items-center gap-1.5">
                    <span>🌙 Ore Pomeridiane</span>
                  </h3>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                    {afternoonHours.map((ah) => (
                      <div
                        key={ah.index}
                        className="flex gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-200"
                      >
                        <span className="text-xs font-bold text-slate-400 w-12">
                          Pom. {ah.index - 5}
                        </span>
                        <input
                          type="text"
                          value={ah.label}
                          onChange={(e) =>
                            handleHourLabelChange(
                              ah.index,
                              'label',
                              e.target.value,
                              false
                            )
                          }
                          disabled={readOnlyMode}
                          placeholder="Etichetta"
                          className="text-xs border border-slate-300 rounded p-1.5 bg-white w-28 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        <input
                          type="text"
                          value={ah.time}
                          onChange={(e) =>
                            handleHourLabelChange(
                              ah.index,
                              'time',
                              e.target.value,
                              false
                            )
                          }
                          disabled={readOnlyMode}
                          placeholder="Fascia"
                          className="text-xs border border-slate-300 rounded p-1.5 bg-white flex-1 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        <select
                          value={ah.duration ?? HOUR_DEFAULT_MINUTES}
                          onChange={(e) =>
                            handleHourLabelChange(
                              ah.index,
                              'duration',
                              Number(e.target.value),
                              false
                            )
                          }
                          disabled={readOnlyMode}
                          title="Durata della lezione. La mezz'ora conta 0,5 nel totale delle ore."
                          className="text-xs border border-slate-300 rounded p-1.5 bg-white w-20 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                        >
                          {HOUR_DURATION_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {m} min
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'validations' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">
                    ⚠️ Analizzatore dei Conflitti Automatico
                  </h2>
                  <p className="text-sm text-slate-500">
                    Il sistema convalida in tempo reale tutte le lezioni.
                    Risolvi manualmente ogni conflitto tramite il pulsante
                    "Risolvi" di ciascuno.
                  </p>
                </div>
              </div>
              {validationResult.conflicts.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <h3 className="text-lg font-bold text-emerald-800 mb-1">
                    ✅ Nessun conflitto rilevato!
                  </h3>
                  <p className="text-sm text-emerald-600">
                    L'orario generato rispetta tutti i requisiti.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {validationResult.conflicts.map((conf, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border flex flex-col gap-3 ${
                        conf.type === 'error'
                          ? 'bg-rose-50 border-rose-100 text-rose-800'
                          : 'bg-amber-50 border-amber-100 text-amber-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg leading-none">
                          {conf.type === 'error' ? '🛑' : '⚠️'}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">
                            {conf.message}
                          </p>
                          {conf.suggestion && (
                            <p className="text-xs mt-2 text-slate-600 italic">
                              💡 {conf.suggestion}
                            </p>
                          )}
                          {conf.slot && (
                            <p className="text-xs opacity-85 mt-1">
                              {DAYS[conf.slot.day]} | Ora:{' '}
                              {mergedHoursMap[conf.slot.hour]
                                ? `${mergedHoursMap[conf.slot.hour].label} (${
                                    mergedHoursMap[conf.slot.hour].time
                                  })`
                                : `${conf.slot.hour + 1}ª Ora`}{' '}
                              | Classe: {conf.slot.classId}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {conf.slot && (
                          <>
                            <button
                              onClick={() => {
                                setHighlightedSlot(conf.slot);
                                setActiveTab('dashboard');
                                setViewType('class');
                                setSelectedClass(conf.slot.classId);
                                setTimeout(
                                  () => setHighlightedSlot(null),
                                  3000
                                );
                              }}
                              className="shrink-0 bg-white hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-transparent font-bold text-xs py-1.5 px-3 rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>👁️</span> Vai alla cella
                            </button>
                            <button
                              onClick={() => handleRemoveSlot(conf.slot)}
                              disabled={readOnlyMode}
                              className="shrink-0 bg-white hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-transparent font-bold text-xs py-1.5 px-3 rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span>🛠️</span> Rimuovi cella
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'sostituzioni' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">
                    🩹 Sostituzioni e Assenze
                  </h2>
                  <p className="text-sm text-slate-500">
                    Segnala un'assenza per l'emergenza della mattina, o
                    seleziona domani per pianificare in anticipo. I docenti
                    disponibili per supplenze retribuite si segnano nel
                    Registro Cattedre.
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={substitutionsDate}
                      onChange={(e) => setSubstitutionsDate(e.target.value)}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={handlePrintSostituzioni}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                    title="Stampa o salva in PDF il foglio supplenze del giorno selezionato"
                  >
                    🖨️ Stampa foglio
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleAddAbsence}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 mb-6"
              >
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Tipo
                    </label>
                    <select
                      value={newAbsenceType}
                      onChange={(e) => setNewAbsenceType(e.target.value)}
                      disabled={readOnlyMode}
                      className="text-sm border border-slate-300 rounded-lg p-2 bg-white disabled:opacity-50"
                    >
                      <option value="assenza">Assenza</option>
                      <option value="permesso">Permesso</option>
                      <option value="entrata_posticipata">
                        Entrata posticipata (classe)
                      </option>
                      <option value="uscita_anticipata">
                        Uscita anticipata (classe)
                      </option>
                    </select>
                  </div>
                  {newAbsenceType === 'assenza' ||
                  newAbsenceType === 'permesso' ? (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Docente
                      </label>
                      <select
                        value={newAbsenceTeacherId}
                        onChange={(e) =>
                          setNewAbsenceTeacherId(e.target.value)
                        }
                        disabled={readOnlyMode}
                        className="text-sm border border-slate-300 rounded-lg p-2 bg-white disabled:opacity-50"
                      >
                        <option value="">— Seleziona —</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Classe
                      </label>
                      <select
                        value={newAbsenceClassId}
                        onChange={(e) => setNewAbsenceClassId(e.target.value)}
                        disabled={readOnlyMode}
                        className="text-sm border border-slate-300 rounded-lg p-2 bg-white disabled:opacity-50"
                      >
                        <option value="">— Seleziona —</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Da ora
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="tutta"
                      title="1 = prima ora. Lascia vuoto per tutta la giornata."
                      value={newAbsenceFromHour}
                      onChange={(e) => setNewAbsenceFromHour(e.target.value)}
                      disabled={readOnlyMode}
                      className="w-20 text-sm border border-slate-300 rounded-lg p-2 bg-white disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      A ora
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="tutta"
                      title="1 = prima ora. Lascia vuoto per tutta la giornata."
                      value={newAbsenceToHour}
                      onChange={(e) => setNewAbsenceToHour(e.target.value)}
                      disabled={readOnlyMode}
                      className="w-20 text-sm border border-slate-300 rounded-lg p-2 bg-white disabled:opacity-50"
                    />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Nota
                    </label>
                    <input
                      type="text"
                      value={newAbsenceNote}
                      onChange={(e) => setNewAbsenceNote(e.target.value)}
                      disabled={readOnlyMode}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-white disabled:opacity-50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={readOnlyMode}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Segnala
                  </button>
                </div>
                {absenceFormError && (
                  <p className="text-xs text-rose-600 font-semibold">
                    {absenceFormError}
                  </p>
                )}
              </form>

              <div className="space-y-4">
                {absences.filter((a) => a.date === substitutionsDate)
                  .length === 0 && (
                  <p className="text-sm text-slate-400 italic text-center py-6">
                    Nessuna assenza segnalata per il {substitutionsDate}.
                  </p>
                )}
                {absences
                  .filter((a) => a.date === substitutionsDate)
                  .map((absence) => {
                    const isClassBased =
                      absence.type === 'entrata_posticipata' ||
                      absence.type === 'uscita_anticipata';
                    const teacher = teachers.find(
                      (t) => t.id === absence.teacherId
                    );
                    const suggestions = isClassBased
                      ? []
                      : getSubstitutionSuggestions(absence);
                    return (
                      <div
                        key={absence.id}
                        className="p-4 border border-slate-200 rounded-xl bg-white"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <span className="font-bold text-sm text-slate-800">
                              {isClassBased
                                ? `Classe ${absence.classId}`
                                : teacher?.name || absence.teacherId}
                            </span>
                            <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {absence.type.replace('_', ' ')}
                            </span>
                            {absence.note && (
                              <p className="text-xs text-slate-500 mt-1">
                                {absence.note}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteAbsence(absence.id)}
                            disabled={readOnlyMode}
                            className="shrink-0 text-rose-400 hover:text-rose-600 text-xs font-bold disabled:opacity-50"
                          >
                            🗑️ Rimuovi
                          </button>
                        </div>

                        {isClassBased ? (
                          <p className="text-xs text-slate-600 mt-3 bg-sky-50 border border-sky-100 rounded-lg p-2">
                            Nessuna supplenza da cercare: la classe{' '}
                            {absence.type === 'entrata_posticipata'
                              ? 'entra più tardi'
                              : 'esce prima'}
                            {absence.fromHour !== undefined ||
                            absence.toHour !== undefined
                              ? ` (ore coinvolte: ${
                                  (absence.fromHour ?? 0) + 1
                                }ª–${(absence.toHour ?? 11) + 1}ª)`
                              : ''}
                            .
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {suggestions.length === 0 && (
                              <p className="text-xs text-slate-400 italic">
                                Nessuna lezione trovata per questo docente in
                                questo giorno (controlla l'orario o le ore
                                indicate).
                              </p>
                            )}
                            {suggestions.map((s) => {
                              const anticipoAperto =
                                anticipoPanel &&
                                anticipoPanel.absenceId === absence.id &&
                                anticipoPanel.hour === s.hour;
                              const anticipoCandidati = anticipoAperto
                                ? getAnticipoCandidates(
                                    absence,
                                    s.hour,
                                    s.classId
                                  )
                                : [];
                              return (
                              <div
                                key={s.hour}
                                className="bg-slate-50 rounded-lg border border-slate-100"
                              >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3">
                                <div className="text-xs">
                                  <span className="font-bold">
                                    {mergedHoursMap[s.hour]?.label ||
                                      `${s.hour + 1}ª`}
                                  </span>{' '}
                                  — Classe {s.classId} ({s.subject})
                                </div>
                                {s.coveredBySostegno ? (
                                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                                    ✅ Coperta da sostegno
                                  </span>
                                ) : s.existingSub ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                                      {s.existingSub.method ===
                                      'docente_disponibile'
                                        ? `Sostituto: ${
                                            teachers.find(
                                              (t) =>
                                                t.id ===
                                                s.existingSub.teacherSubstitute
                                            )?.name ||
                                            s.existingSub.teacherSubstitute
                                          }`
                                        : s.existingSub.method === 'anticipo'
                                        ? `⏪ ${
                                            allStaff.find(
                                              (t) =>
                                                t.id ===
                                                s.existingSub.teacherSubstitute
                                            )?.name ||
                                            s.existingSub.teacherSubstitute
                                          } anticipa dalla ${
                                            s.existingSub.movedFromHour + 1
                                          }ª${
                                            s.existingSub.exitAfterHour !==
                                            undefined
                                              ? ` — la classe esce dopo la ${
                                                  s.existingSub.exitAfterHour +
                                                  1
                                                }ª`
                                              : ''
                                          }`
                                        : s.existingSub.method ===
                                          'sorveglianza'
                                        ? 'Sorveglianza collaboratori'
                                        : 'Alunni divisi tra le classi'}
                                    </span>
                                    <button
                                      onClick={() =>
                                        handleRemoveSubstitution(
                                          s.existingSub.id
                                        )
                                      }
                                      disabled={readOnlyMode}
                                      className="text-xs text-rose-500 hover:text-rose-700 disabled:opacity-50"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {s.candidates.length === 0 && (
                                      <span className="text-xs text-slate-400 italic mr-2">
                                        Nessun docente disponibile —
                                      </span>
                                    )}
                                    {s.candidates
                                      .slice(0, 4)
                                      .map((c: any) => (
                                        <button
                                          key={c.teacherId}
                                          onClick={() =>
                                            handleConfirmSubstitution(
                                              absence,
                                              s.hour,
                                              s.classId,
                                              s.subject,
                                              'docente_disponibile',
                                              c.teacherId
                                            )
                                          }
                                          disabled={readOnlyMode}
                                          title={
                                            c.priority === 0
                                              ? 'Insegna già in questa classe'
                                              : c.priority === 1
                                              ? 'Stessa materia'
                                              : 'Disponibile'
                                          }
                                          className={`text-xs font-bold px-2 py-1 rounded-lg border cursor-pointer disabled:opacity-50 ${
                                            c.priority === 0
                                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                              : c.priority === 1
                                              ? 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
                                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                          }`}
                                        >
                                          {c.name}
                                        </button>
                                      ))}
                                    <button
                                      onClick={() =>
                                        handleConfirmSubstitution(
                                          absence,
                                          s.hour,
                                          s.classId,
                                          s.subject,
                                          'sorveglianza'
                                        )
                                      }
                                      disabled={readOnlyMode}
                                      className="text-xs font-bold px-2 py-1 rounded-lg border bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 cursor-pointer disabled:opacity-50"
                                    >
                                      Sorveglianza
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleConfirmSubstitution(
                                          absence,
                                          s.hour,
                                          s.classId,
                                          s.subject,
                                          'divisione_alunni'
                                        )
                                      }
                                      disabled={readOnlyMode}
                                      className="text-xs font-bold px-2 py-1 rounded-lg border bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 cursor-pointer disabled:opacity-50"
                                    >
                                      Dividi alunni
                                    </button>
                                    <button
                                      onClick={() =>
                                        setAnticipoPanel(
                                          anticipoAperto
                                            ? null
                                            : {
                                                absenceId: absence.id,
                                                hour: s.hour,
                                              }
                                        )
                                      }
                                      disabled={readOnlyMode}
                                      title="Una collega della stessa classe anticipa la lezione che avrebbe più tardi"
                                      className="text-xs font-bold px-2 py-1 rounded-lg border bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 cursor-pointer disabled:opacity-50"
                                    >
                                      ⏪ Anticipa lezione
                                    </button>
                                  </div>
                                )}
                              </div>
                              {anticipoAperto && (
                                <div className="border-t border-slate-200 px-3 py-2.5">
                                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                                    Chi può anticipare la sua lezione in{' '}
                                    {s.classId}
                                  </p>
                                  {anticipoCandidati.length === 0 && (
                                    <p className="text-xs text-slate-400 italic">
                                      Nessuna docente della classe ha lezione
                                      più tardi ed è libera in quest'ora.
                                    </p>
                                  )}
                                  <div className="flex flex-col gap-1.5">
                                    {anticipoCandidati.map((c: any) => (
                                      <button
                                        key={`${c.teacherId}_${c.fromHour}`}
                                        onClick={() =>
                                          handleConfirmAnticipo(
                                            absence,
                                            s.hour,
                                            s.classId,
                                            s.subject,
                                            c
                                          )
                                        }
                                        disabled={readOnlyMode}
                                        className={`text-left text-xs px-2.5 py-2 rounded-lg border cursor-pointer disabled:opacity-50 ${
                                          c.exitClean
                                            ? 'bg-white border-emerald-200 hover:bg-emerald-50'
                                            : 'bg-white border-amber-200 hover:bg-amber-50'
                                        }`}
                                      >
                                        <span className="font-bold">
                                          {c.name}
                                        </span>{' '}
                                        anticipa {c.subject} dalla{' '}
                                        {c.fromHour + 1}ª
                                        <span
                                          className={`block mt-0.5 font-semibold ${
                                            c.exitClean
                                              ? 'text-emerald-700'
                                              : 'text-amber-700'
                                          }`}
                                        >
                                          {c.exitClean
                                            ? `La classe esce dopo la ${
                                                (c.exitAfterHour ?? s.hour) + 1
                                              }ª ora: avvisa le famiglie.`
                                            : `Attenzione: la ${
                                                c.fromHour + 1
                                              }ª resta scoperta, la classe non esce.`}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    onClick={() => setAnticipoPanel(null)}
                                    className="mt-2 text-[11px] text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                                  >
                                    Chiudi
                                  </button>
                                </div>
                              )}
                              </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4">
                💰 Ore di supplenza retribuita per docente
              </h2>
              {Object.keys(paidSubstitutionHoursByTeacher).length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Nessuna supplenza retribuita registrata finora.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(paidSubstitutionHoursByTeacher).map(
                    ([tid, count]: any) => (
                      <div
                        key={tid}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center"
                      >
                        <div className="text-xs font-bold text-slate-700">
                          {teachers.find((t) => t.id === tid)?.name || tid}
                        </div>
                        <div className="text-lg font-black text-indigo-600">
                          {count}h
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      {editingCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Modifica Cella</h3>
                <p className="text-xs text-slate-500">
                  Classe {editingCell.classId} | {DAYS[editingCell.day]} -{' '}
                  {mergedHoursMap[editingCell.hour]
                    ? mergedHoursMap[editingCell.hour].label
                    : `${editingCell.hour + 1}ª Ora`}
                </p>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Assegna Docente
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {allStaff.map((t) => {
                    if (t.staffType === 'sostegno') return null;
                    const isBusy = timetable.some(
                      (slot) =>
                        slot.day === editingCell.day &&
                        slot.hour === editingCell.hour &&
                        slot.teacherId === t.id
                    );
                    const isDayOff = (
                      generationRules.teacherDaysOff[t.id] || []
                    ).includes(editingCell.day);
                    const isUnavailable = isTeacherOff(
                      generationRules,
                      t.id,
                      editingCell.day,
                      editingCell.hour
                    );
                    const deptColor = getDeptColor(t.subject);
                    return (
                      <button
                        key={t.id}
                        onClick={() => handleAssignTeacher(t.id, false)}
                        disabled={isUnavailable}
                        className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                          isUnavailable
                            ? 'border-slate-200 opacity-60 cursor-not-allowed'
                            : 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40'
                        }`}
                        style={{
                          backgroundColor: isUnavailable
                            ? DAY_OFF_COLOR
                            : deptColor,
                        }}
                      >
                        <span
                          className={`text-xs font-bold ${
                            isUnavailable ? 'text-red-800' : 'text-slate-700'
                          }`}
                        >
                          {t.name} ({t.subject})
                        </span>
                        {isUnavailable && (
                          <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {isDayOff ? 'LIBERO' : 'ORA BLOCCATA'}
                          </span>
                        )}
                        {isBusy && !isUnavailable && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1 py-0.5 rounded">
                            Occupato
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Assegna Sostegno
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {sostegno.map((s) => {
                    const isBusy = timetable.some(
                      (slot) =>
                        slot.day === editingCell.day &&
                        slot.hour === editingCell.hour &&
                        slot.teacherId === s.id &&
                        slot.type === 'sostegno'
                    );
                    const isUnavailable = isTeacherOff(
                      generationRules,
                      s.id,
                      editingCell.day,
                      editingCell.hour
                    );
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleAssignTeacher(s.id, true)}
                        disabled={isUnavailable}
                        className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                          isUnavailable
                            ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                            : 'border-slate-200 hover:border-purple-500 hover:bg-purple-50/40'
                        }`}
                      >
                        <span
                          className={`text-xs font-bold ${
                            isUnavailable ? 'text-slate-400' : 'text-purple-700'
                          }`}
                        >
                          {s.name} (Sostegno)
                        </span>
                        {isUnavailable && (
                          <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            NON DISP.
                          </span>
                        )}
                        {isBusy && !isUnavailable && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1 py-0.5 rounded">
                            Occupato
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  🏫 Aula / Laboratorio
                </label>
                <select
                  value={tempRoom}
                  onChange={(e) => {
                    setTempRoom(e.target.value);
                    setRoomTouched(true);
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.id === 'aula' ? 'Aula Normale' : r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => handleAssignTeacher('cancella')}
                  className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-2 px-4 rounded-lg text-xs border border-rose-200 transition-all cursor-pointer"
                >
                  Rimuovi
                </button>
                <button
                  onClick={() => setEditingCell(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-xs transition-all cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingNoteCell && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
            <div className="bg-yellow-50 px-6 py-4 border-b border-yellow-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  📝 Nota sulla Cella
                </h3>
                <p className="text-xs text-slate-500">
                  Classe {editingNoteCell.classId} | {DAYS[editingNoteCell.day]}{' '}
                  -{' '}
                  {mergedHoursMap[editingNoteCell.hour]
                    ? mergedHoursMap[editingNoteCell.hour].label
                    : `${editingNoteCell.hour + 1}ª Ora`}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingNoteCell(null);
                  setNoteText('');
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Scrivi qui la tua nota... (es: 'Lezione recupero', 'Uscita anticipata', 'Progetto speciale')"
                className="w-full h-32 border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                autoFocus
              />
              <div className="flex gap-2">
                {cellNotes[
                  getNoteKey(
                    editingNoteCell.classId,
                    editingNoteCell.day,
                    editingNoteCell.hour,
                    editingNoteCell.type
                  )
                ] && (
                  <button
                    onClick={handleDeleteNote}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-2 px-4 rounded-lg text-xs border border-rose-200 transition-all cursor-pointer"
                  >
                    🗑️ Elimina Nota
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingNoteCell(null);
                    setNoteText('');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-xs transition-all cursor-pointer flex-1"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveNote}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-all cursor-pointer flex-1"
                >
                  💾 Salva Nota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {assignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden">
            <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">
                  ➕ Aggiungi Assegnazione
                </h3>
                <p className="text-xs text-slate-500">
                  {allStaff.find((s) => s.id === assignModal.staffId)?.name}
                </p>
              </div>
              <button
                onClick={() => setAssignModal(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Classe
                </label>
                <select
                  value={assignClass}
                  onChange={(e) => setAssignClass(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Ore Settimanali
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={assignHours}
                  onChange={(e) =>
                    setAssignHours(parseInt(e.target.value) || 1)
                  }
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAssignModal(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-xs transition-all cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveAssignmentModal}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-all cursor-pointer"
                >
                  💾 Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {conflictModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
            <div className="p-6 text-center border-b border-slate-100">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                ⚠️
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {conflictModal.title}
              </h3>
              <p className="text-sm text-slate-500">{conflictModal.message}</p>
            </div>
            <div className="p-6 bg-slate-50 flex flex-col gap-3">
              {!conflictModal.hideSwap && (
                <>
                  <button
                    onClick={conflictModal.onSwap}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    🔄 Scambia Lezioni
                  </button>
                  <button
                    onClick={conflictModal.onForce}
                    className="w-full bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    ➡️ Forza (lascia buco)
                  </button>
                </>
              )}
              {conflictModal.hideSwap && (
                <button
                  onClick={conflictModal.onConfirm}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  ⚠️ Procedi Comunque
                </button>
              )}
              <button
                onClick={() => setConflictModal(null)}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3 px-4 rounded-xl transition-all mt-2 cursor-pointer"
              >
                ❌ Annulla
              </button>
            </div>
          </div>
        </div>
      )}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                ⚠️
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Azzerare tutto?
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Cancellerà{' '}
                <strong className="text-rose-600">tutti i carichi orari</strong>{' '}
                e <strong className="text-rose-600">svuoterà l'orario</strong>.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  onClick={handleResetAllAssignments}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Sì, azzera
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {printAlertOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🔒
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Pop-up Bloccati
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Il browser ha bloccato la finestra di stampa.{' '}
                <strong className="text-amber-600">Consenti i pop-up</strong> e
                riprova.
              </p>
              <button
                onClick={() => setPrintAlertOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                Ho capito
              </button>
            </div>
          </div>
        </div>
      )}
      {sectionActionModal && sectionActionModal.type === 'delete' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                ⚠️
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Eliminare Sez. {sectionActionModal.name}?
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Rimuoverà{' '}
                <strong className="text-rose-600">tutte le classi</strong> di
                questa sezione. Irreversibile.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSectionActionModal(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  onClick={() => {
                    executeDeleteSection(sectionActionModal.name);
                    setSectionActionModal(null);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Sì, elimina
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {generationReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full overflow-hidden">
            <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  ✨ Report Auto-Generazione
                </h3>
                <p className="text-xs text-slate-500">
                  Riepilogo delle ore assegnate
                </p>
              </div>
              <button
                onClick={() => setGenerationReport(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-semibold leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                <h4 className="font-bold text-indigo-900 mb-2">
                  📚 Materie Curricolari
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Ore richieste:</span>
                    <span className="ml-2 font-bold text-indigo-700">
                      {generationReport.materie.requested}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Ore assegnate:</span>
                    <span className="ml-2 font-bold text-emerald-700">
                      {generationReport.materie.assigned}
                    </span>
                  </div>
                </div>
                {generationReport.materie.recovered > 0 && (
                  <p className="text-xs text-emerald-700 mt-3">
                    🔧 {generationReport.materie.recovered} ore recuperate dalla
                    seconda passata
                    {generationReport.materie.swaps > 0 &&
                      ` (${generationReport.materie.swaps} spostando un'altra lezione)`}
                    .
                  </p>
                )}
                {generationReport.materie.consolidated > 0 && (
                  <p className="text-xs text-emerald-700 mt-1">
                    🧩 {generationReport.materie.consolidated} ore spostate per
                    chiudere le giornate sotto il minimo
                    {generationReport.materie.shortDaysLeft > 0 &&
                      ` (${generationReport.materie.shortDaysLeft} giornate non è stato possibile chiuderle)`}
                    .
                  </p>
                )}
                {generationReport.materie.missing.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-indigo-200">
                    <p className="text-xs text-rose-700 font-semibold mb-2">
                      ⚠️ {generationReport.materie.missing.length} ore non
                      assegnate:
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {generationReport.materie.missing
                        .slice(0, 10)
                        .map((m: any, i: number) => (
                          <div
                            key={i}
                            className="text-xs text-slate-600 bg-white p-2 rounded"
                          >
                            <strong>{m.teacherName}</strong> ({m.subject}) →
                            Classe {m.classId}
                          </div>
                        ))}
                      {generationReport.materie.missing.length > 10 && (
                        <p className="text-xs text-slate-500 italic">
                          ...e altre{' '}
                          {generationReport.materie.missing.length - 10} ore
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-800">
                <strong>💡 Suggerimento:</strong> Se alcune ore non sono state
                assegnate, prova a:
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>
                    Rilassare i vincoli di "Ore Buca" nella tab "Sezioni &
                    Regole"
                  </li>
                  <li>
                    Verificare che i giorni liberi dei docenti non siano troppo
                    restrittivi
                  </li>
                  <li>Assegnare manualmente le ore mancanti</li>
                </ul>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setGenerationReport(null)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
      <footer className="bg-slate-100 border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-500 mt-auto print:hidden shrink-0">
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
        <a
          href="https://paypal.me/delfino0087"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-700"
        >
          💛 Offrimi un caffè
        </a>
      </footer>

      <Assistente />
    </div>
  );
}
