/**
 * fiscalDocParser.ts
 * 
 * Utilitário para extração automática de números sequenciais de documentos fiscais
 * (CT-e, NF-e e MDF-e) a partir de arquivos XML ou PDF com texto embutido.
 */

export interface FiscalDocNumbers {
  cteNumber?: string;
  nfeNumber?: string;
  mdfeNumber?: string;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file, 'utf-8');
  });
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

function extractNumberFromXml(xmlText: string): { field: keyof FiscalDocNumbers; value: string } | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) return null;

    const rootTag = doc.documentElement?.tagName?.toLowerCase() || '';

    if (rootTag.includes('cte') || rootTag === 'cteproc') {
      const value = getXmlTagValue(doc, 'nCT', 'NCT');
      if (value) return { field: 'cteNumber', value };
    }
    if (rootTag.includes('nfe') || rootTag.includes('nfproc')) {
      const value = getXmlTagValue(doc, 'nNF', 'NNF');
      if (value) return { field: 'nfeNumber', value };
    }
    if (rootTag.includes('mdfe') || rootTag.includes('mdfeproc')) {
      const value = getXmlTagValue(doc, 'nMDF', 'NMDF');
      if (value) return { field: 'mdfeNumber', value };
    }

    // Fallback: try all tags
    const nNF = getXmlTagValue(doc, 'nNF');
    if (nNF) return { field: 'nfeNumber', value: nNF };
    const nCT = getXmlTagValue(doc, 'nCT');
    if (nCT) return { field: 'cteNumber', value: nCT };
    const nMDF = getXmlTagValue(doc, 'nMDF');
    if (nMDF) return { field: 'mdfeNumber', value: nMDF };
  } catch (e) {
    console.warn('[fiscalDocParser] XML parse error:', e);
  }
  return null;
}

const CTE_PATTERNS = [
  /CT[- ]?e\s*(?:[Nn][oOº°ú]|N[úu]mero|Número|NÚMERO)\.?\s*:?\s*([\d.]+)/i,
  /Conhecimento\s+de\s+Transporte[^\d]*([\d.]+)/i,
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

function inferFieldFromDocType(docType: string): keyof FiscalDocNumbers | null {
  const lower = docType.toLowerCase();
  if (lower.includes('ct-e') || lower.includes('cte') || lower.includes('conhecimento')) return 'cteNumber';
  if (lower.includes('nf-e') || lower.includes('nota fiscal') || lower.includes('nfe')) return 'nfeNumber';
  if (lower.includes('mdf-e') || lower.includes('mdfe') || lower.includes('manifesto')) return 'mdfeNumber';
  return null;
}

export async function extractFiscalDocNumbers(
  filesToAttach: { [docType: string]: File[] }
): Promise<FiscalDocNumbers> {
  const result: FiscalDocNumbers = {};
  const FISCAL_DOC_TYPES = ['CT-e', 'Nota Fiscal', 'MDF-e', 'Documentação Fiscal'];

  for (const docType of FISCAL_DOC_TYPES) {
    const files = filesToAttach[docType];
    if (!Array.isArray(files) || files.length === 0) continue;
    const inferredField = inferFieldFromDocType(docType);

    for (const file of files) {
      if (result.cteNumber && result.nfeNumber && result.mdfeNumber) break;
      try {
        const text = await readFileAsText(file);
        const isXml = file.name.toLowerCase().endsWith('.xml') || text.trimStart().startsWith('<');
        if (isXml) {
          const parsed = extractNumberFromXml(text);
          if (parsed) result[parsed.field] = parsed.value;
        } else {
          if (inferredField === 'cteNumber' && !result.cteNumber) {
            const v = matchPatterns(text, CTE_PATTERNS); if (v) result.cteNumber = v;
          } else if (inferredField === 'nfeNumber' && !result.nfeNumber) {
            const v = matchPatterns(text, NFE_PATTERNS); if (v) result.nfeNumber = v;
          } else if (inferredField === 'mdfeNumber' && !result.mdfeNumber) {
            const v = matchPatterns(text, MDFE_PATTERNS); if (v) result.mdfeNumber = v;
          } else {
            if (!result.cteNumber) { const v = matchPatterns(text, CTE_PATTERNS); if (v) result.cteNumber = v; }
            if (!result.nfeNumber) { const v = matchPatterns(text, NFE_PATTERNS); if (v) result.nfeNumber = v; }
            if (!result.mdfeNumber) { const v = matchPatterns(text, MDFE_PATTERNS); if (v) result.mdfeNumber = v; }
          }
        }
      } catch (e) {
        console.warn(`[fiscalDocParser] Could not read file "${file.name}":`, e);
      }
    }
  }

  console.log('[fiscalDocParser] Extracted fiscal numbers:', result);
  return result;
}

/**
 * Extrai números fiscais a partir de URLs de documentos já armazenados.
 * Usado para backfill de embarques antigos que não têm cteNumber/nfeNumber/mdfeNumber.
 * 
 * @param docsByType Mapa de { tipo: [url1, url2, ...] } vindo do campo `documents` do embarque
 */
export async function extractFiscalDocNumbersFromUrls(
  docsByType: { [docType: string]: string[] }
): Promise<FiscalDocNumbers> {
  const result: FiscalDocNumbers = {};

  for (const [docType, urls] of Object.entries(docsByType)) {
    if (!Array.isArray(urls) || urls.length === 0) continue;
    const inferredField = inferFieldFromDocType(docType);
    if (!inferredField) continue; // só processa tipos fiscais conhecidos

    for (const url of urls) {
      if (result.cteNumber && result.nfeNumber && result.mdfeNumber) break;
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const text = await response.text();
        const fileName = url.split('/').pop() || '';
        const isXml = fileName.toLowerCase().endsWith('.xml') || text.trimStart().startsWith('<');

        if (isXml) {
          const parsed = extractNumberFromXml(text);
          if (parsed) result[parsed.field] = parsed.value;
        } else {
          if (inferredField === 'cteNumber' && !result.cteNumber) {
            const v = matchPatterns(text, CTE_PATTERNS); if (v) result.cteNumber = v;
          } else if (inferredField === 'nfeNumber' && !result.nfeNumber) {
            const v = matchPatterns(text, NFE_PATTERNS); if (v) result.nfeNumber = v;
          } else if (inferredField === 'mdfeNumber' && !result.mdfeNumber) {
            const v = matchPatterns(text, MDFE_PATTERNS); if (v) result.mdfeNumber = v;
          } else {
            if (!result.cteNumber) { const v = matchPatterns(text, CTE_PATTERNS); if (v) result.cteNumber = v; }
            if (!result.nfeNumber) { const v = matchPatterns(text, NFE_PATTERNS); if (v) result.nfeNumber = v; }
            if (!result.mdfeNumber) { const v = matchPatterns(text, MDFE_PATTERNS); if (v) result.mdfeNumber = v; }
          }
        }
      } catch (e) {
        console.warn(`[fiscalDocParser] Could not fetch URL "${url}":`, e);
      }
    }
  }

  return result;
}
