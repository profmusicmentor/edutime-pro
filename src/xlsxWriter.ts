/**
 * Generatore di file .xlsx (Excel moderno, formato OOXML).
 *
 * Prima l'app esportava in SpreadsheetML 2003, cioè un XML con estensione
 * .xls: le versioni recenti di Excel lo rifiutano ("il formato e l'estensione
 * non corrispondono", poi errori di importazione HTML). Un .xlsx vero è invece
 * un archivio zip con dentro più file XML, ed è quello che costruisce questo
 * modulo — senza dipendenze esterne, perché serve solo un sottoinsieme minimo
 * del formato: testo, colori di sfondo, bordi, celle unite, larghezze e altezze.
 */

export interface XlsxStyle {
  bold?: boolean;
  italic?: boolean;
  /** dimensione in punti */
  size?: number;
  /** colore del testo, formato #RRGGBB */
  color?: string;
  /** colore di sfondo, formato #RRGGBB */
  fill?: string;
  align?: 'left' | 'center' | 'right';
  wrap?: boolean;
  border?: boolean;
}

export interface XlsxCell {
  value?: string | number;
  /** nome di uno stile passato a buildXlsx */
  style?: string;
  /** celle unite verso destra, oltre a questa */
  mergeAcross?: number;
  /** celle unite verso il basso, oltre a questa */
  mergeDown?: number;
}

export interface XlsxRow {
  /** altezza in pixel, convertita in punti */
  heightPx?: number;
  cells: (XlsxCell | null)[];
}

export interface XlsxSheet {
  name: string;
  /** larghezze delle colonne in pixel */
  colWidthsPx: number[];
  rows: XlsxRow[];
}

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Excel rifiuta i caratteri di controllo dentro il testo delle celle.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** #195275 → FF195275 (ARGB, come vuole OOXML). */
const argb = (hex?: string, fallback = 'FF000000') => {
  if (!hex) return fallback;
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return fallback;
  return `FF${clean.toUpperCase()}`;
};

/** A, B, ... Z, AA, AB, ... */
const colName = (index: number) => {
  let n = index;
  let name = '';
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
};

/* ------------------------------------------------------------------- stili */

interface StyleTables {
  fonts: string[];
  fills: string[];
  borders: string[];
  xfs: string[];
  indexByName: Record<string, number>;
}

const buildStyleTables = (styles: Record<string, XlsxStyle>): StyleTables => {
  const fonts = [
    '<font><sz val="10"/><color rgb="FF1F2937"/><name val="Segoe UI"/></font>',
  ];
  // I primi due riempimenti sono obbligatori e devono restare in quest'ordine.
  const fills = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
  ];
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
  const indexByName: Record<string, number> = {};

  const push = (list: string[], xml: string) => {
    const found = list.indexOf(xml);
    if (found >= 0) return found;
    list.push(xml);
    return list.length - 1;
  };

  Object.entries(styles).forEach(([name, st]) => {
    const fontId = push(
      fonts,
      `<font>${st.bold ? '<b/>' : ''}${st.italic ? '<i/>' : ''}<sz val="${
        st.size ?? 10
      }"/><color rgb="${argb(st.color, 'FF1F2937')}"/><name val="Segoe UI"/></font>`
    );
    const fillId = st.fill
      ? push(
          fills,
          `<fill><patternFill patternType="solid"><fgColor rgb="${argb(
            st.fill
          )}"/><bgColor indexed="64"/></patternFill></fill>`
        )
      : 0;
    const borderId = st.border
      ? push(
          borders,
          '<border><left style="thin"><color rgb="FF64748B"/></left><right style="thin"><color rgb="FF64748B"/></right><top style="thin"><color rgb="FF64748B"/></top><bottom style="thin"><color rgb="FF64748B"/></bottom><diagonal/></border>'
        )
      : 0;
    const alignment = `<alignment horizontal="${
      st.align ?? 'left'
    }" vertical="center"${st.wrap ? ' wrapText="1"' : ''}/>`;
    xfs.push(
      `<xf numFmtId="0" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${alignment}</xf>`
    );
    indexByName[name] = xfs.length - 1;
  });

  return { fonts, fills, borders, xfs, indexByName };
};

const stylesXml = (t: StyleTables) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${
    t.fonts.length
  }">${t.fonts.join('')}</fonts><fills count="${t.fills.length}">${t.fills.join(
    ''
  )}</fills><borders count="${t.borders.length}">${t.borders.join(
    ''
  )}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${
    t.xfs.length
  }">${t.xfs.join(
    ''
  )}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

/* ------------------------------------------------------------------ foglio */

const sheetXml = (sheet: XlsxSheet, styleIndex: Record<string, number>) => {
  const merges: string[] = [];
  let rowsXml = '';

  sheet.rows.forEach((row, rIdx) => {
    const rowNum = rIdx + 1;
    let cellsXml = '';
    row.cells.forEach((cell, cIdx) => {
      if (!cell) return;
      const ref = `${colName(cIdx)}${rowNum}`;
      const s = cell.style ? styleIndex[cell.style] : undefined;
      const sAttr = s !== undefined ? ` s="${s}"` : '';
      if (typeof cell.value === 'number') {
        cellsXml += `<c r="${ref}"${sAttr}><v>${cell.value}</v></c>`;
      } else {
        const text = cell.value === undefined ? '' : String(cell.value);
        cellsXml += text
          ? `<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">${esc(
              text
            )}</t></is></c>`
          : `<c r="${ref}"${sAttr}/>`;
      }
      const across = cell.mergeAcross ?? 0;
      const down = cell.mergeDown ?? 0;
      if (across > 0 || down > 0) {
        merges.push(
          `<mergeCell ref="${ref}:${colName(cIdx + across)}${rowNum + down}"/>`
        );
      }
    });
    const heightAttr = row.heightPx
      ? ` ht="${(row.heightPx * 0.75).toFixed(2)}" customHeight="1"`
      : '';
    rowsXml += `<row r="${rowNum}"${heightAttr}>${cellsXml}</row>`;
  });

  const colsXml = sheet.colWidthsPx.length
    ? `<cols>${sheet.colWidthsPx
        .map(
          (px, i) =>
            `<col min="${i + 1}" max="${i + 1}" width="${(px / 7).toFixed(
              2
            )}" customWidth="1"/>`
        )
        .join('')}</cols>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${colsXml}<sheetData>${rowsXml}</sheetData>${
    merges.length
      ? `<mergeCells count="${merges.length}">${merges.join('')}</mergeCells>`
      : ''
  }</worksheet>`;
};

/* --------------------------------------------------------------------- zip */

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (data: Uint8Array) => {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++)
    c = crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/**
 * Costruisce un archivio zip senza compressione (metodo "store"): è valido a
 * tutti gli effetti e evita di dover implementare deflate.
 */
const zip = (entries: ZipEntry[]) => {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = new Uint8Array(30 + nameBytes.length + size);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // versione necessaria
    lv.setUint16(6, 0x0800, true); // nomi in UTF-8
    lv.setUint16(8, 0, true); // metodo: store
    lv.setUint16(10, 0, true); // ora
    lv.setUint16(12, 0x21, true); // data (1980-01-01)
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(entry.data, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length;
  });

  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const total =
    locals.reduce((sum, l) => sum + l.length, 0) + centralSize + end.length;
  const out = new Uint8Array(total);
  let pos = 0;
  [...locals, ...centrals, end].forEach((chunk) => {
    out.set(chunk, pos);
    pos += chunk.length;
  });
  return out;
};

/* ------------------------------------------------------------------ output */

/** Costruisce il contenuto binario di un file .xlsx. */
export const buildXlsx = (
  sheets: XlsxSheet[],
  styles: Record<string, XlsxStyle>
): Uint8Array => {
  const tables = buildStyleTables(styles);
  const encoder = new TextEncoder();
  const sheetPaths = sheets.map((_, i) => `xl/worksheets/sheet${i + 1}.xml`);

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetPaths
    .map(
      (p) =>
        `<Override PartName="/${p}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join(
      ''
    )}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
    .map(
      (s, i) =>
        `<sheet name="${esc(s.name).slice(0, 31)}" sheetId="${
          i + 1
        }" r:id="rId${i + 1}"/>`
    )
    .join('')}</sheets></workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${
          i + 1
        }.xml"/>`
    )
    .join(
      ''
    )}<Relationship Id="rId${
    sheets.length + 1
  }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: encoder.encode(contentTypes) },
    { name: '_rels/.rels', data: encoder.encode(rootRels) },
    { name: 'xl/workbook.xml', data: encoder.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRels) },
    { name: 'xl/styles.xml', data: encoder.encode(stylesXml(tables)) },
    ...sheets.map((sheet, i) => ({
      name: sheetPaths[i],
      data: encoder.encode(sheetXml(sheet, tables.indexByName)),
    })),
  ];

  return zip(entries);
};
