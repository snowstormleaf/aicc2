type SheetData = {
  name: string;
  rows: (string | number)[][];
};

const textEncoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const writeUint32 = (view: DataView, offset: number, value: number) => {
  view.setUint32(offset, value, true);
};

const writeUint16 = (view: DataView, offset: number, value: number) => {
  view.setUint16(offset, value, true);
};

const buildZip = (files: { name: string; data: Uint8Array }[]) => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = textEncoder.encode(file.name);
    const crc = crc32(file.data);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, 0);
    writeUint16(localView, 12, 0);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, file.data.length);
    writeUint32(localView, 22, file.data.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, file.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, 0);
    writeUint16(centralView, 14, 0);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, file.data.length);
    writeUint32(centralView, 24, file.data.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + file.data.length;
  });

  const centralDirectory = concatUint8(centralParts);
  const localDirectory = concatUint8(localParts);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, localDirectory.length);
  writeUint16(endView, 20, 0);

  return concatUint8([localDirectory, centralDirectory, endRecord]);
};

const concatUint8 = (parts: Uint8Array[]) => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const columnLetter = (index: number) => {
  let col = "";
  let num = index + 1;
  while (num > 0) {
    const rem = (num - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    num = Math.floor((num - 1) / 26);
  }
  return col;
};

const buildSheetXml = (rows: (string | number)[][]) => {
  const rowXml = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, cellIndex) => {
          const ref = `${columnLetter(cellIndex)}${rowIndex + 1}`;
          if (typeof cell === "number" && Number.isFinite(cell)) {
            return `<c r="${ref}"><v>${cell}</v></c>`;
          }
          const text = escapeXml(String(cell ?? ""));
          return `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
};

const buildWorkbookXml = (sheets: SheetData[]) => {
  const sheetsXml = sheets
    .map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetsXml}</sheets>
</workbook>`;
};

const buildWorkbookRels = (sheets: SheetData[]) => {
  const rels = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .concat(
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${rels}
</Relationships>`;
};

const buildContentTypes = (sheets: SheetData[]) => {
  const overrides = sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .concat(
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${overrides}
</Types>`;
};

const buildRootRels = () => `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const buildStylesXml = () => `<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export const createXlsxBlob = (sheets: SheetData[]) => {
  const files = [
    { name: "[Content_Types].xml", data: textEncoder.encode(buildContentTypes(sheets)) },
    { name: "_rels/.rels", data: textEncoder.encode(buildRootRels()) },
    { name: "xl/workbook.xml", data: textEncoder.encode(buildWorkbookXml(sheets)) },
    { name: "xl/_rels/workbook.xml.rels", data: textEncoder.encode(buildWorkbookRels(sheets)) },
    { name: "xl/styles.xml", data: textEncoder.encode(buildStylesXml()) },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: textEncoder.encode(buildSheetXml(sheet.rows)),
    })),
  ];

  const zip = buildZip(files);
  return new Blob([zip], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

const parseZip = async (buffer: ArrayBuffer) => {
  const data = new Uint8Array(buffer);
  let eocdOffset = -1;
  for (let i = data.length - 22; i >= 0; i--) {
    if (data[i] === 0x50 && data[i + 1] === 0x4b && data[i + 2] === 0x05 && data[i + 3] === 0x06) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error("Invalid XLSX file (missing central directory).");
  }
  const view = new DataView(buffer, eocdOffset);
  const totalEntries = view.getUint16(10, true);
  const centralOffset = view.getUint32(16, true);

  let offset = centralOffset;
  const files: Record<string, Uint8Array> = {};

  for (let i = 0; i < totalEntries; i++) {
    const header = new DataView(buffer, offset);
    const signature = header.getUint32(0, true);
    if (signature !== 0x02014b50) {
      throw new Error("Invalid XLSX file (bad central directory).");
    }
    const compression = header.getUint16(10, true);
    const compressedSize = header.getUint32(20, true);
    const uncompressedSize = header.getUint32(24, true);
    const fileNameLength = header.getUint16(28, true);
    const extraLength = header.getUint16(30, true);
    const commentLength = header.getUint16(32, true);
    const localOffset = header.getUint32(42, true);
    const nameBytes = data.slice(offset + 46, offset + 46 + fileNameLength);
    const name = new TextDecoder().decode(nameBytes);
    offset += 46 + fileNameLength + extraLength + commentLength;

    const localHeader = new DataView(buffer, localOffset);
    const localNameLength = localHeader.getUint16(26, true);
    const localExtraLength = localHeader.getUint16(28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = data.slice(dataStart, dataStart + compressedSize);

    if (compression === 0) {
      files[name] = compressed;
    } else if (compression === 8) {
      if (typeof DecompressionStream === "undefined") {
        throw new Error("XLSX parsing requires DecompressionStream support.");
      }
      const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate"));
      const decompressed = new Uint8Array(await new Response(stream).arrayBuffer());
      if (uncompressedSize && decompressed.length !== uncompressedSize) {
        throw new Error("Corrupted XLSX file (size mismatch).");
      }
      files[name] = decompressed;
    } else {
      throw new Error("Unsupported XLSX compression.");
    }
  }

  return files;
};

const parseSharedStrings = (xml: Document) => {
  const shared: string[] = [];
  xml.querySelectorAll("sst si").forEach((node) => {
    const text = Array.from(node.querySelectorAll("t"))
      .map((t) => t.textContent ?? "")
      .join("");
    shared.push(text);
  });
  return shared;
};

const cellRefToIndex = (ref: string) => {
  const match = ref.match(/([A-Z]+)(\d+)/);
  if (!match) return { row: 0, col: 0 };
  const [, colLetters, rowStr] = match;
  let col = 0;
  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 64);
  }
  return { row: parseInt(rowStr, 10) - 1, col: col - 1 };
};

export const parseXlsxRows = async (buffer: ArrayBuffer) => {
  const files = await parseZip(buffer);
  const sharedStringsFile = files["xl/sharedStrings.xml"];
  const sharedStrings = sharedStringsFile
    ? parseSharedStrings(new DOMParser().parseFromString(new TextDecoder().decode(sharedStringsFile), "application/xml"))
    : [];
  const sheetFile = files["xl/worksheets/sheet1.xml"];
  if (!sheetFile) {
    throw new Error("XLSX file missing sheet1.xml");
  }
  const doc = new DOMParser().parseFromString(new TextDecoder().decode(sheetFile), "application/xml");
  const rows: string[][] = [];

  doc.querySelectorAll("sheetData row").forEach((rowNode) => {
    const rowValues: string[] = [];
    rowNode.querySelectorAll("c").forEach((cell) => {
      const ref = cell.getAttribute("r") ?? "";
      const { col } = cellRefToIndex(ref);
      const type = cell.getAttribute("t");
      let value = "";
      if (type === "s") {
        const index = parseInt(cell.querySelector("v")?.textContent ?? "0", 10);
        value = sharedStrings[index] ?? "";
      } else if (type === "inlineStr") {
        value = cell.querySelector("is t")?.textContent ?? "";
      } else {
        value = cell.querySelector("v")?.textContent ?? "";
      }
      rowValues[col] = value;
    });
    rows.push(rowValues.map((val) => val ?? ""));
  });

  return rows;
};
