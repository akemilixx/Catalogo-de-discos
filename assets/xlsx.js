// Gerador mínimo de planilhas .xlsx (sem bibliotecas externas).
// Uso: baixarXlsx('arquivo.xlsx', [{ nome, colunas: [{ titulo, largura, tipo }], linhas: [[...]] }])
// tipo: 'texto' (padrão), 'numero', 'moeda' (R$), 'data' (AAAA-MM-DD → data do Excel), 'longo' (texto com quebra de linha).
// Em colunas 'moeda'/'numero', valores que não são número (ex.: "Indisponível") ficam como texto.

const ESTILO = { texto: 0, cabecalho: 1, moeda: 2, data: 3, longo: 4, numero: 0 };

const xml = (s) => String(s)
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
  .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function letraColuna(n) { // 0 → A, 26 → AA
  let s = '';
  for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function serialData(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return null;
  return (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000;
}

function celula(ref, valor, tipo) {
  if (valor === '' || valor == null) return '';
  if (tipo === 'data') {
    const n = serialData(valor);
    if (n != null) return `<c r="${ref}" s="${ESTILO.data}"><v>${n}</v></c>`;
  }
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return `<c r="${ref}" s="${ESTILO[tipo] ?? 0}"><v>${valor}</v></c>`;
  }
  const s = tipo === 'longo' ? ESTILO.longo : ESTILO.texto;
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xml(String(valor).slice(0, 32767))}</t></is></c>`;
}

function planilhaXml({ colunas, linhas }) {
  const ultCol = letraColuna(Math.max(colunas.length, 1) - 1);
  const ultLin = linhas.length + 1;
  const cols = colunas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.largura || 14}" customWidth="1"/>`).join('');
  const cab = `<row r="1">${colunas.map((c, i) =>
    `<c r="${letraColuna(i)}1" s="${ESTILO.cabecalho}" t="inlineStr"><is><t>${xml(c.titulo)}</t></is></c>`).join('')}</row>`;
  const corpo = linhas.map((l, li) => `<row r="${li + 2}">${colunas.map((c, ci) =>
    celula(`${letraColuna(ci)}${li + 2}`, l[ci], c.tipo)).join('')}</row>`).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${cols}</cols><sheetData>${cab}${corpo}</sheetData>` +
    `<autoFilter ref="A1:${ultCol}${ultLin}"/></worksheet>`;
}

const ESTILOS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF9A3412"/><bgColor indexed="64"/></patternFill></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="5">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
  '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

function nomeAba(nome, usados) {
  const base = String(nome).replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Planilha';
  let n = base;
  for (let i = 2; usados.has(n.toLowerCase()); i++) n = `${base.slice(0, 28)} ${i}`;
  usados.add(n.toLowerCase());
  return n;
}

function arquivosXlsx(abas) {
  const usados = new Set();
  const nomes = abas.map((a) => nomeAba(a.nome, usados));
  const f = {};
  f['[Content_Types].xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
    '</Types>';
  f['_rels/.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';
  f['xl/workbook.xml'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${nomes.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>` +
    `<definedNames>${abas.map((a, i) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xml(nomes[i].replace(/'/g, "''"))}'!$A$1:$${letraColuna(Math.max(a.colunas.length, 1) - 1)}$${a.linhas.length + 1}</definedName>`).join('')}</definedNames>` +
    '</workbook>';
  f['xl/_rels/workbook.xml.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>';
  f['xl/styles.xml'] = ESTILOS_XML;
  abas.forEach((a, i) => { f[`xl/worksheets/sheet${i + 1}.xml`] = planilhaXml(a); });
  return f;
}

/* ---------- ZIP (sem compressão) ---------- */
const TAB_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TAB_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(arquivos) {
  const enc = new TextEncoder();
  const agora = new Date();
  const hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1);
  const dia = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();
  const partes = [];
  const central = [];
  let pos = 0;
  for (const [nome, texto] of Object.entries(arquivos)) {
    const n = enc.encode(nome);
    const d = enc.encode(texto);
    const crc = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint16(8, 0, true); h.setUint16(10, hora, true); h.setUint16(12, dia, true);
    h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true);
    h.setUint16(26, n.length, true); h.setUint16(28, 0, true);
    partes.push(new Uint8Array(h.buffer), n, d);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true); c.setUint16(12, hora, true); c.setUint16(14, dia, true);
    c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true);
    c.setUint16(28, n.length, true); c.setUint32(42, pos, true);
    central.push(new Uint8Array(c.buffer), n);
    pos += 30 + n.length + d.length;
  }
  const tamCentral = central.reduce((s, p) => s + p.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  const qtd = Object.keys(arquivos).length;
  fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, qtd, true); fim.setUint16(10, qtd, true);
  fim.setUint32(12, tamCentral, true); fim.setUint32(16, pos, true);
  return new Blob([...partes, ...central, new Uint8Array(fim.buffer)],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export const gerarXlsx = (abas) => zip(arquivosXlsx(abas));

export function baixarXlsx(nomeArquivo, abas) {
  const url = URL.createObjectURL(gerarXlsx(abas));
  const a = Object.assign(document.createElement('a'), { href: url, download: nomeArquivo });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
