/**
 * fiscalDocParser.ts
 * 
 * Utilitário para extração automática de números sequenciais e datas/horas de emissão
 * de documentos fiscais (CT-e, NF-e e MDF-e) a partir de arquivos XML ou PDF (DACTE/DANFE).
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker do PDF.js para ambiente de navegador/Vite
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface FiscalDocNumbers {
  cteNumber?: string;
  cteEmissionDate?: string;
  nfeNumber?: string;
  mdfeNumber?: string;
  advancePercentage?: number;
  advanceValue?: number;
  tollValue?: number;
  totalFreightValue?: number;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file, 'utf-8');
  });
}

export async function extractTextFromPdfBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (err) {
    console.warn('[fiscalDocParser] Erro na extração PDF.js:', err);
    try {
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(arrayBuffer);
    } catch {
      return '';
    }
  }
}

function getXmlTagValue(doc: Document, ...tagNames: string[]): string | undefined {
  for (const tag of tagNames) {
    const els = doc.getElementsByTagName(tag);
    if (els.length > 0 && els[0].textContent) {
      return els[0].textContent.trim();
    }
  }
  return undefined;
}

export function formatFiscalDateTime(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const matchIso = val.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (matchIso) {
    return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]} ${matchIso[4]}:${matchIso[5]}`;
  }
  const matchPt = val.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2}:\d{2})?/);
  if (matchPt) {
    return matchPt[4] ? `${matchPt[1]}/${matchPt[2]}/${matchPt[3]} ${matchPt[4]}` : `${matchPt[1]}/${matchPt[2]}/${matchPt[3]}`;
  }
  return val;
}

function extractNumberFromXml(xmlText: string): { numbers: FiscalDocNumbers } | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) return null;

    const res: FiscalDocNumbers = {};
    const rootTag = doc.documentElement?.tagName?.toLowerCase() || '';

    if (rootTag.includes('cte') || rootTag === 'cteproc') {
      const nCT = getXmlTagValue(doc, 'nCT', 'NCT');
      if (nCT) res.cteNumber = nCT;
      const dhEmi = getXmlTagValue(doc, 'dhEmi', 'DHEMI', 'dEmi');
      if (dhEmi) res.cteEmissionDate = formatFiscalDateTime(dhEmi);
    }
    if (rootTag.includes('nfe') || rootTag.includes('nfproc')) {
      const nNF = getXmlTagValue(doc, 'nNF', 'NNF');
      if (nNF) res.nfeNumber = nNF;
    }
    if (rootTag.includes('mdfe') || rootTag.includes('mdfeproc')) {
      const nMDF = getXmlTagValue(doc, 'nMDF', 'NMDF');
      if (nMDF) res.mdfeNumber = nMDF;
    }

    // Fallback: try all tags
    if (!res.cteNumber) {
      const nCT = getXmlTagValue(doc, 'nCT');
      if (nCT) res.cteNumber = nCT;
    }
    if (!res.cteEmissionDate) {
      const dhEmi = getXmlTagValue(doc, 'dhEmi', 'DHEMI', 'dEmi');
      if (dhEmi) res.cteEmissionDate = formatFiscalDateTime(dhEmi);
    }
    if (!res.nfeNumber) {
      const nNF = getXmlTagValue(doc, 'nNF');
      if (nNF) res.nfeNumber = nNF;
    }
    if (!res.mdfeNumber) {
      const nMDF = getXmlTagValue(doc, 'nMDF');
      if (nMDF) res.mdfeNumber = nMDF;
    }

    if (res.cteNumber || res.cteEmissionDate || res.nfeNumber || res.mdfeNumber) {
      return { numbers: res };
    }
  } catch (e) {
    console.warn('[fiscalDocParser] XML parse error:', e);
  }
  return null;
}

function extractCteFromChaveAcesso(text: string): string | undefined {
  const clean = text.replace(/[\s.-]/g, '');
  const matches = clean.match(/\b\d{44}\b/g);
  if (matches && matches.length > 0) {
    for (const chave of matches) {
      const nCTRaw = chave.substring(25, 34);
      const nCT = parseInt(nCTRaw, 10);
      if (!isNaN(nCT) && nCT > 0) {
        return String(nCT);
      }
    }
  }
  return undefined;
}

function extractCteEmissionDateFromText(text: string): string | undefined {
  const patterns = [
    /DATA\s*(?:E|\/)?\s*HORA\s*(?:DA|DE)?\s*EMISS[ÃA]O[^\d]*(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/i,
    /EMISS[ÃA]O[^\d]*(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/i,
    /DATA\s*(?:DA|DE)?\s*EMISS[ÃA]O[^\d]*(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2}(?::\d{2})?)?)/i,
    /EMISS[ÃA]O[^\d]*(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?)/i,
    /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(?::\d{2})?)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const formatted = formatFiscalDateTime(m[1].trim());
      if (formatted) return formatted;
    }
  }
  return undefined;
}

const CTE_PATTERNS = [
  /CT[- ]?e\s*(?:[Nn][oOº°ú]|N[úu]mero|Número|NÚMERO)\.?\s*:?\s*([\d.]+)/i,
  /Conhecimento\s+(?:de\s+Transporte\s+)?(?:Nº|N°|N°\.|Nº\.)?\s*([\d.]+)/i,
  /\bN[º°°]\s*([\d.]+)/i,
  /\bCT[- ]?e\b[^\d]{0,20}([\d]+)/i,
];
const NFE_PATTERNS = [
  /NF[- ]?e?\s*(?:[Nn][oOº°ú]|N[úu]mero|Número|NÚMERO)\.?\s*:?\s*([\d.]+)/i,
  /Nota\s+Fiscal[^\d]*([\d.]+)/i,
  /\bNFe?\b[^\d]{0,20}([\d]+)/i,
];
const MDFE_PATTERNS = [
  /MDF[- ]?e\s*(?:[Nn][oOº°ú]|N[úu]mero|Número|NÚMERO)\.?\s*:?\s*([\d.]+)/i,
  /Manifesto\s+(?:de\s+)?Documentos\s+Fiscais[^\d]*([\d.]+)/i,
  /\bMDFe?\b[^\d]{0,20}([\d]+)/i,
];

function matchPatterns(text: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].replace(/\./g, '').trim();
  }
  return undefined;
}

function parseTextContent(text: string, isCteType: boolean): FiscalDocNumbers {
  const res: FiscalDocNumbers = {};

  if (isCteType) {
    // 1. Tenta extrair CT-e via Chave de Acesso de 44 dígitos
    const cteChave = extractCteFromChaveAcesso(text);
    if (cteChave) res.cteNumber = cteChave;

    // 2. Se não achou por Chave de Acesso, tenta padrões regex
    if (!res.cteNumber) {
      const v = matchPatterns(text, CTE_PATTERNS);
      if (v) res.cteNumber = v;
    }

    // 3. Extrai data/hora de emissão
    const dateVal = extractCteEmissionDateFromText(text);
    if (dateVal) res.cteEmissionDate = dateVal;
  } else {
    const vCte = matchPatterns(text, CTE_PATTERNS) || extractCteFromChaveAcesso(text);
    if (vCte) res.cteNumber = vCte;
    const dCte = extractCteEmissionDateFromText(text);
    if (dCte) res.cteEmissionDate = dCte;

    const vNfe = matchPatterns(text, NFE_PATTERNS);
    if (vNfe) res.nfeNumber = vNfe;

    const vMdfe = matchPatterns(text, MDFE_PATTERNS);
    if (vMdfe) res.mdfeNumber = vMdfe;
  }

  // Extrai valores do contrato de frete (Pedágio, Adiantamento, % Adiantamento, Total)
  const contractVals = extractFreightContractValues(text);
  if (contractVals.tollValue !== undefined) res.tollValue = contractVals.tollValue;
  if (contractVals.advanceValue !== undefined) res.advanceValue = contractVals.advanceValue;
  if (contractVals.totalFreightValue !== undefined) res.totalFreightValue = contractVals.totalFreightValue;
  if (contractVals.advancePercentage !== undefined) res.advancePercentage = contractVals.advancePercentage;

  return res;
}

export function parseCurrencyPtBr(str: string): number | undefined {
  if (!str) return undefined;
  const clean = str.replace(/[^\d.,]/g, '').trim();
  if (!clean) return undefined;

  if (clean.includes(',') && clean.includes('.')) {
    const normalized = clean.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? undefined : num;
  } else if (clean.includes(',')) {
    const normalized = clean.replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? undefined : num;
  } else if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length === 2 && parts[1].length === 2) {
      const num = parseFloat(clean);
      return isNaN(num) ? undefined : num;
    } else {
      const normalized = clean.replace(/\./g, '');
      const num = parseFloat(normalized);
      return isNaN(num) ? undefined : num;
    }
  } else {
    const num = parseFloat(clean);
    return isNaN(num) ? undefined : num;
  }
}

export function extractFreightContractValues(text: string): {
  tollValue?: number;
  advanceValue?: number;
  totalFreightValue?: number;
  advancePercentage?: number;
} {
  const res: {
    tollValue?: number;
    advanceValue?: number;
    totalFreightValue?: number;
    advancePercentage?: number;
  } = {};

  if (!text) return res;

  // 1. Vale-Pedágio / Pedágio
  const tollPatterns = [
    /VALE[- ]?PED[ÁA]GIO[^\d\n]*R?\$\s*([\d.,]+)/i,
    /VALOR\s+(?:DO\s+)?VALE[- ]?PED[ÁA]GIO[^\d\n]*R?\$\s*([\d.,]+)/i,
    /PED[ÁA]GIO[^\d\n]*R?\$\s*([\d.,]+)/i,
  ];
  for (const re of tollPatterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const val = parseCurrencyPtBr(m[1]);
      if (val !== undefined && val >= 0) {
        res.tollValue = val;
        break;
      }
    }
  }

  // 2. Adiantamento (efete: Adiantamento, Adiantamento, 1ª Parcela, etc.)
  const advancePatterns = [
    /(?:efete:|efrete:|e-frete:)?\s*Adiantamento[^\d\n]*R?\$\s*([\d.,]+)/i,
    /Valor\s+(?:do\s+)?Adiantamento[^\d\n]*R?\$\s*([\d.,]+)/i,
    /1[ªa]\s*Parcela[^\d\n]*R?\$\s*([\d.,]+)/i,
    /ADIANTAMENTO[^\d\n]*R?\$\s*([\d.,]+)/i,
  ];
  for (const re of advancePatterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const val = parseCurrencyPtBr(m[1]);
      if (val !== undefined && val > 0) {
        res.advanceValue = val;
        break;
      }
    }
  }

  // 3. Valor Total do Frete (Valor Total, Valor Líquido, Frete Total)
  const totalFreightPatterns = [
    /VALOR\s+TOTAL[^\d\n]*R?\$\s*([\d.,]+)/i,
    /VALOR\s+L[ÍI]QUIDO[^\d\n]*R?\$\s*([\d.,]+)/i,
    /FRETE\s+TOTAL[^\d\n]*R?\$\s*([\d.,]+)/i,
    /TOTAL\s+DO\s+FRETE[^\d\n]*R?\$\s*([\d.,]+)/i,
  ];
  for (const re of totalFreightPatterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const val = parseCurrencyPtBr(m[1]);
      if (val !== undefined && val > 0) {
        res.totalFreightValue = val;
        break;
      }
    }
  }

  // 4. Porcentagem do Adiantamento (% Adiantamento)
  const pctPatterns = [
    /Adiantamento[^\n%]*?(\d{1,2}(?:[.,]\d+)?)\s*%/i,
    /(\d{1,2}(?:[.,]\d+)?)\s*%\s*(?:de\s*)?Adiantamento/i,
    /%\s*(?:de\s*)?Adiantamento[^\d\n]*(\d{1,2}(?:[.,]\d+)?)/i,
  ];
  for (const re of pctPatterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const pct = parseFloat(m[1].replace(',', '.'));
      if (!isNaN(pct) && pct > 0 && pct <= 100) {
        res.advancePercentage = Math.round(pct);
        break;
      }
    }
  }

  if (!res.advancePercentage && res.advanceValue && res.totalFreightValue && res.totalFreightValue > 0) {
    const pct = Math.round((res.advanceValue / res.totalFreightValue) * 100);
    if (pct > 0 && pct <= 100) {
      res.advancePercentage = pct;
    }
  }

  return res;
}

export async function extractFiscalDocNumbers(
  filesToAttach: { [docType: string]: File[] }
): Promise<FiscalDocNumbers> {
  const result: FiscalDocNumbers = {};

  const docTypes = Object.keys(filesToAttach);
  for (const docType of docTypes) {
    const files = filesToAttach[docType];
    if (!Array.isArray(files) || files.length === 0) continue;
    const isCteType = docType.toLowerCase().includes('cte') || docType.toLowerCase().includes('ct-e') || docType.toLowerCase().includes('fiscal');

    for (const file of files) {
      try {
        const fileNameLower = file.name.toLowerCase();
        const isPdf = fileNameLower.endsWith('.pdf') || file.type.includes('pdf');
        const isXml = fileNameLower.endsWith('.xml') || file.type.includes('xml');

        let text = '';
        if (isPdf) {
          const buffer = await file.arrayBuffer();
          text = await extractTextFromPdfBuffer(buffer);
        } else {
          text = await readFileAsText(file);
        }

        const isXmlText = isXml || text.trimStart().startsWith('<');
        if (isXmlText) {
          const parsed = extractNumberFromXml(text);
          if (parsed?.numbers) {
            if (parsed.numbers.cteNumber && !result.cteNumber) result.cteNumber = parsed.numbers.cteNumber;
            if (parsed.numbers.cteEmissionDate && !result.cteEmissionDate) result.cteEmissionDate = parsed.numbers.cteEmissionDate;
            if (parsed.numbers.nfeNumber && !result.nfeNumber) result.nfeNumber = parsed.numbers.nfeNumber;
            if (parsed.numbers.mdfeNumber && !result.mdfeNumber) result.mdfeNumber = parsed.numbers.mdfeNumber;
          }
        } else {
          const parsed = parseTextContent(text, isCteType);
          if (parsed.cteNumber && !result.cteNumber) result.cteNumber = parsed.cteNumber;
          if (parsed.cteEmissionDate && !result.cteEmissionDate) result.cteEmissionDate = parsed.cteEmissionDate;
          if (parsed.nfeNumber && !result.nfeNumber) result.nfeNumber = parsed.nfeNumber;
          if (parsed.mdfeNumber && !result.mdfeNumber) result.mdfeNumber = parsed.mdfeNumber;
          if (parsed.tollValue !== undefined && result.tollValue === undefined) result.tollValue = parsed.tollValue;
          if (parsed.advanceValue !== undefined && result.advanceValue === undefined) result.advanceValue = parsed.advanceValue;
          if (parsed.totalFreightValue !== undefined && result.totalFreightValue === undefined) result.totalFreightValue = parsed.totalFreightValue;
          if (parsed.advancePercentage !== undefined && result.advancePercentage === undefined) result.advancePercentage = parsed.advancePercentage;
        }
      } catch (e) {
        console.warn(`[fiscalDocParser] Could not read file "${file.name}":`, e);
      }
    }
  }

  console.log('[fiscalDocParser] Extracted fiscal and contract numbers:', result);
  return result;
}

/**
 * Extrai números fiscais e data de emissão a partir de URLs de documentos já armazenados.
 */
export async function extractFiscalDocNumbersFromUrls(
  docsByType: { [docType: string]: string[] }
): Promise<FiscalDocNumbers> {
  const result: FiscalDocNumbers = {};

  for (const [docType, urls] of Object.entries(docsByType)) {
    if (!Array.isArray(urls) || urls.length === 0) continue;
    const isCteType = docType.toLowerCase().includes('cte') || docType.toLowerCase().includes('ct-e') || docType.toLowerCase().includes('fiscal');

    for (const url of urls) {
      if (result.cteNumber && result.cteEmissionDate && result.nfeNumber && result.mdfeNumber) break;
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const buffer = await response.arrayBuffer();
        const urlLower = url.toLowerCase();
        const isPdf = urlLower.includes('.pdf');

        const decoder = new TextDecoder('utf-8');
        const rawHead = decoder.decode(buffer.slice(0, 100));
        const isXml = urlLower.endsWith('.xml') || rawHead.trimStart().startsWith('<');

        let text = '';
        if (isPdf || rawHead.includes('%PDF')) {
          text = await extractTextFromPdfBuffer(buffer);
        } else {
          text = decoder.decode(buffer);
        }

        if (isXml) {
          const parsed = extractNumberFromXml(text);
          if (parsed?.numbers) {
            if (parsed.numbers.cteNumber && !result.cteNumber) result.cteNumber = parsed.numbers.cteNumber;
            if (parsed.numbers.cteEmissionDate && !result.cteEmissionDate) result.cteEmissionDate = parsed.numbers.cteEmissionDate;
            if (parsed.numbers.nfeNumber && !result.nfeNumber) result.nfeNumber = parsed.numbers.nfeNumber;
            if (parsed.numbers.mdfeNumber && !result.mdfeNumber) result.mdfeNumber = parsed.numbers.mdfeNumber;
          }
        } else {
          const parsed = parseTextContent(text, isCteType);
          if (parsed.cteNumber && !result.cteNumber) result.cteNumber = parsed.cteNumber;
          if (parsed.cteEmissionDate && !result.cteEmissionDate) result.cteEmissionDate = parsed.cteEmissionDate;
          if (parsed.nfeNumber && !result.nfeNumber) result.nfeNumber = parsed.nfeNumber;
          if (parsed.mdfeNumber && !result.mdfeNumber) result.mdfeNumber = parsed.mdfeNumber;
        }
      } catch (e) {
        console.warn(`[fiscalDocParser] Could not fetch URL "${url}":`, e);
      }
    }
  }

  return result;
}
