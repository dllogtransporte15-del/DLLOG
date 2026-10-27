import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenAI } from '@google/genai';
import { parseAccessKey44, parseCurrencyPtBr } from './fiscalDocParser';

// Configura worker do PDF.js se necessário
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface ExtractedInvoiceData {
  invoiceNumber?: string;
  series?: string;
  totalAmount?: number;
  supplierName?: string;
  supplierCnpjCpf?: string;
  issueDate?: string; // YYYY-MM-DD
  dueDate?: string;   // YYYY-MM-DD
  accessKey?: string;
  paymentMethod?: 'Boleto' | 'Pix' | 'Transferência' | 'Cartão' | 'Dinheiro' | 'Outro';
  paymentDetails?: string;
  description?: string;
}

/**
 * Converte data DD/MM/AAAA ou variações para formato aceito por input[type="date"] (AAAA-MM-DD)
 */
export function convertBrDateToIso(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/AAAA ou DD.MM.AAAA ou DD-MM-AAAA (com possíveis espaços extras)
  const match4 = trimmed.match(/(\d{1,2})\s*[\/\.-]\s*(\d{1,2})\s*[\/\.-]\s*(\d{4})/);
  if (match4) {
    const day = parseInt(match4[1], 10);
    const month = parseInt(match4[2], 10);
    const year = parseInt(match4[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1990 && year <= 2099) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // DD/MM/AA (ano com 2 dígitos, ex: 15/10/26 -> 2026-10-15)
  const match2 = trimmed.match(/(\d{1,2})\s*[\/\.-]\s*(\d{1,2})\s*[\/\.-]\s*(\d{2})\b/);
  if (match2) {
    const day = parseInt(match2[1], 10);
    const month = parseInt(match2[2], 10);
    let year = parseInt(match2[3], 10);
    year = year < 50 ? 2000 + year : 1900 + year;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Formato extenso simples: "25 de Outubro de 2026"
  const monthMap: Record<string, string> = {
    janeiro: '01', jan: '01',
    fevereiro: '02', fev: '02',
    março: '03', marco: '03', mar: '03',
    abril: '04', abr: '04',
    maio: '05', mai: '05',
    junho: '06', jun: '06',
    julho: '07', jul: '07',
    agosto: '08', ago: '08',
    setembro: '09', set: '09',
    outubro: '10', out: '10',
    novembro: '11', nov: '11',
    dezembro: '12', dez: '12'
  };
  const matchExtenso = trimmed.match(/(\d{1,2})\s+de\s+([a-zçãé]+)\s+de\s+(\d{4})/i);
  if (matchExtenso) {
    const day = parseInt(matchExtenso[1], 10);
    const mName = matchExtenso[2].toLowerCase();
    const year = parseInt(matchExtenso[3], 10);
    const mNum = monthMap[mName];
    if (mNum && day >= 1 && day <= 31) {
      return `${year}-${mNum}-${String(day).padStart(2, '0')}`;
    }
  }

  return undefined;
}

/**
 * Formata CNPJ ou CPF para exibição padrão
 */
function formatCnpjCpf(raw?: string): string | undefined {
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  } else if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return raw.trim();
}

/**
 * Converte Data URL (Base64) em ArrayBuffer
 */
function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Helper para extrair texto de elementos XML
 */
function getXmlTagValue(doc: Document | Element, ...tagNames: string[]): string | undefined {
  for (const tag of tagNames) {
    const els = doc.getElementsByTagName(tag);
    if (els.length > 0 && els[0].textContent) {
      return els[0].textContent.trim();
    }
  }
  return undefined;
}

/**
 * Extração de dados de arquivo XML (DANFE / NF-e / NFS-e)
 */
function parseXmlInvoice(xmlText: string): ExtractedInvoiceData | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
      return null;
    }

    const res: ExtractedInvoiceData = {};

    // 1. Número e Série
    const nNF = getXmlTagValue(doc, 'nNF', 'numero', 'Numero', 'NumeroNf');
    if (nNF) res.invoiceNumber = String(parseInt(nNF, 10) || nNF);

    const serie = getXmlTagValue(doc, 'serie', 'Serie');
    if (serie) res.series = String(parseInt(serie, 10) || serie);

    // 2. Chave de acesso
    const chNFe = getXmlTagValue(doc, 'chNFe', 'chaveAcesso', 'ChaveAcesso');
    if (chNFe) {
      res.accessKey = chNFe.replace(/\D/g, '');
    } else {
      const infNFe = doc.getElementsByTagName('infNFe')[0];
      if (infNFe) {
        const idAttr = infNFe.getAttribute('Id') || '';
        const cleanId = idAttr.replace(/\D/g, '');
        if (cleanId.length === 44) res.accessKey = cleanId;
      }
    }

    // Se tiver chave de acesso e não tiver número/série, extrai da chave
    if (res.accessKey && res.accessKey.length === 44) {
      const meta = parseAccessKey44(res.accessKey);
      if (meta) {
        if (!res.invoiceNumber) res.invoiceNumber = meta.docNumber;
        if (!res.series) res.series = meta.serie;
        if (!res.supplierCnpjCpf && meta.cnpj) res.supplierCnpjCpf = formatCnpjCpf(meta.cnpj);
      }
    }

    // 3. Fornecedor / Prestador (Emitente)
    const emit = doc.getElementsByTagName('emit')[0] || doc.getElementsByTagName('prestador')[0] || doc;
    const razaoSocial = getXmlTagValue(emit, 'xNome', 'razaoSocial', 'RazaoSocial', 'NomeFantasia', 'xFant');
    if (razaoSocial) res.supplierName = razaoSocial;

    const cnpjEmit = getXmlTagValue(emit, 'CNPJ', 'Cnpj', 'CPF', 'Cpf');
    if (cnpjEmit) res.supplierCnpjCpf = formatCnpjCpf(cnpjEmit);

    // 4. Valor Total
    const vNF = getXmlTagValue(doc, 'vNF', 'valorTotal', 'ValorTotal', 'vProd', 'ValorLiquido');
    if (vNF) {
      const parsedAmount = parseFloat(vNF.replace(',', '.'));
      if (!isNaN(parsedAmount)) res.totalAmount = parsedAmount;
    }

    // 5. Datas
    const dhEmi = getXmlTagValue(doc, 'dhEmi', 'dEmi', 'dataEmissao', 'DataEmissao');
    if (dhEmi) {
      const iso = convertBrDateToIso(dhEmi.split('T')[0]);
      if (iso) res.issueDate = iso;
    }

    const dVenc = getXmlTagValue(doc, 'dVenc', 'dataVencimento', 'DataVencimento');
    if (dVenc) {
      const iso = convertBrDateToIso(dVenc.split('T')[0]);
      if (iso) res.dueDate = iso;
    }

    // 6. Pagamento
    const tPag = getXmlTagValue(doc, 'tPag');
    if (tPag) {
      if (tPag === '01') res.paymentMethod = 'Dinheiro';
      else if (tPag === '03' || tPag === '04') res.paymentMethod = 'Cartão';
      else if (tPag === '15') res.paymentMethod = 'Boleto';
      else if (tPag === '17' || tPag === '20') res.paymentMethod = 'Pix';
      else if (tPag === '18') res.paymentMethod = 'Transferência';
      else res.paymentMethod = 'Outro';
    }

    return res;
  } catch (err) {
    console.warn('[invoiceExtractionService] Falha ao processar XML:', err);
    return null;
  }
}

/**
 * Extração de dados via expressões regulares sobre o texto extraído de PDF/Documento
 */
function parseTextInvoice(text: string): ExtractedInvoiceData {
  const res: ExtractedInvoiceData = {};
  if (!text) return res;

  // 1. Chave de acesso de 44 dígitos
  const textNoSpaces = text.replace(/[\s.-]/g, '');
  const match44 = textNoSpaces.match(/\b\d{44}\b/);
  if (match44) {
    res.accessKey = match44[0];
    const meta = parseAccessKey44(res.accessKey);
    if (meta) {
      res.invoiceNumber = meta.docNumber;
      res.series = meta.serie;
      res.supplierCnpjCpf = formatCnpjCpf(meta.cnpj);
    }
  }

  // 2. Número da NF
  if (!res.invoiceNumber) {
    const numPatterns = [
      /(?:N[º°ú]|N[úu]mero|NF-?e|DANFE)[^\d\n]{0,20}?N[º°ú]?[^\d\n]{0,10}?(\d{1,9})\b/i,
      /\bN[º°]\s*(\d{1,9})\b/i,
      /(?:NOTA\s+FISCAL.*?N[º°ú]|DANFE.*?N[º°ú])\s*(\d{1,9})/is,
      /\bNF\s*(\d{1,9})\b/i,
      /DOCUMENTO\s+AUXILIAR[^\d\n]*?N[º°ú]?[^\d\n]*?(\d{1,9})/i
    ];
    for (const p of numPatterns) {
      const m = text.match(p);
      if (m && m[1]) {
        res.invoiceNumber = String(parseInt(m[1], 10) || m[1]);
        break;
      }
    }
  }

  // 3. Série
  if (!res.series) {
    const mSerie = text.match(/\bS[ée]rie[^\d\n]{0,10}?(\d{1,4})\b/i);
    if (mSerie && mSerie[1]) {
      res.series = String(parseInt(mSerie[1], 10) || mSerie[1]);
    }
  }

  // 4. Valor Total
  const amountPatterns = [
    /(?:VALOR\s+TOTAL\s+DA\s+NOTA|V\.?\s*TOTAL\s+DA\s+NOTA|VALOR\s+TOTAL\s+DOS\s+PRODUTOS|VALOR\s+TOTAL|TOTAL\s+DA\s+NOTA|TOTAL\s+GERAL|TOTAL\s+L[ÍI]QUIDO|VALOR\s+L[ÍI]QUIDO|TOTAL\s+A\s+PAGAR|TOTAL\s+R\$)[^\d\n,.]*?(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/i,
    /(?:VALOR\s+DO\s+DOCUMENTO|VALOR\s+A\s+RECEBER|VALOR\s+COBRADO)[^\d\n,.]*?(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/i,
    /R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i
  ];
  for (const p of amountPatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const val = parseCurrencyPtBr(m[1]);
      if (val !== undefined && val > 0) {
        res.totalAmount = val;
        break;
      }
    }
  }

  // 5. CNPJ ou CPF do Emitente / Fornecedor
  if (!res.supplierCnpjCpf) {
    const cnpjMatch = text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
    if (cnpjMatch) {
      res.supplierCnpjCpf = cnpjMatch[0];
    } else {
      const cpfMatch = text.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
      if (cpfMatch) {
        res.supplierCnpjCpf = cpfMatch[0];
      }
    }
  }

  // 6. Fornecedor / Razão Social / Nome Fantasia
  const supplierPatterns = [
    /(?:RAZ[ÃA]O\s+SOCIAL|NOME\s+EMPRESARIAL|NOME\s*\/\s*RAZ[ÃA]O\s+SOCIAL|EMITENTE|PRESTADOR(?:\s+DE\s+SERVI[ÇC]OS)?)\s*[:.\s]+([A-Z0-9\s.,&'-]{3,80})/i,
    /(?:IDENTIFICA[ÇC][ÃA]O\s+DO\s+EMITENTE)\s*[:.\s\n]+([A-Z0-9\s.,&'-]{3,80})/i
  ];
  for (const p of supplierPatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const clean = m[1].replace(/(?:CNPJ|CPF|INSCRI|ENDERE|FONE|BAIRRO|CEP)[\s\S]*/i, '').trim();
      if (clean.length >= 3) {
        res.supplierName = clean;
        break;
      }
    }
  }

  // Se não achou por rótulo, verifica as primeiras linhas do documento (comum em DANFE)
  if (!res.supplierName) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines.slice(0, 10)) {
      if (
        line.length >= 4 &&
        !line.includes('DANFE') &&
        !line.includes('DOCUMENTO AUXILIAR') &&
        !line.includes('NOTA FISCAL') &&
        !line.includes('CHAVE DE ACESSO') &&
        !line.includes('MINISTÉRIO') &&
        !line.includes('RECEITA FEDERAL')
      ) {
        res.supplierName = line.slice(0, 80);
        break;
      }
    }
  }

  // 7. Data de Emissão / Data do Documento / Fatura
  const emissionPatterns = [
    /(?:DATA\s+(?:DA\s+|DE\s+)?EMISS[ÃA]O|DATA\s+EMISS[ÃA]O|DT\.?\s*EMISS[ÃA]O|EMISS[ÃA]O|EMITID[AO]\s+EM)\s*[:.\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:DATA\s+(?:DO\s+)?DOCUMENTO|DATA\s+DOCUMENTO|DT\.?\s*DOC\.?|DATA\s+DOC)\s*[:.\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:DATA\s+(?:DE\s+)?PROCESSAMENTO|DATA\s+PROCESSAMENTO|PROCESSAMENTO)\s*[:.\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:DATA\s+(?:DA\s+)?FATURA|DATA\s+FATURA|FATURA\s+EMITIDA\s+EM)\s*[:.\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:PER[ÍI]ODO\s+DE\s+FATURAMENTO|M[ÊE]S\s+DE\s+REFER[ÊE]NCIA)[^\n\d]*?(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:DATA\s+(?:DA\s+|DE\s+)?EMISS[ÃA]O|DATA\s+EMISS[ÃA]O|DATA\s+DO\s+DOCUMENTO)[\s\r\n]+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i
  ];
  for (const p of emissionPatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const iso = convertBrDateToIso(m[1]);
      if (iso) {
        res.issueDate = iso;
        break;
      }
    }
  }

  // 8. Data de Vencimento
  const duePatterns = [
    /(?:DATA\s+(?:DO\s+|DE\s+)?VENCIMENTO|DATA\s+VENCIMENTO|VENCIMENTO|VENC\.?|DT\.?\s*VENC\.?)\s*[:.\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:VENCER\s+EM|PAGAR\s+AT[ÉE]|PAG[ÁA]VEL\s+AT[ÉE]|DATA\s+LIMITE\s+(?:PARA\s+|DE\s+)?PAGAMENTO)\s*[:.\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:VENCIMENTO\s+DA\s+FATURA|VENCIMENTO\s+DO\s+BOLETO|VENCIMENTO\s+PAGAMENTO)\s*[:.\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:DATA\s+(?:DO\s+)?VENCIMENTO|VENCIMENTO|DATA\s+VENCIMENTO)[\s\r\n]+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i
  ];
  for (const p of duePatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const iso = convertBrDateToIso(m[1]);
      if (iso) {
        res.dueDate = iso;
        break;
      }
    }
  }

  // 9. Dados de Pagamento (Linha digitável de boleto ou PIX)
  const boletoMatch = text.match(/\b(\d{5}[\.\s]?\d{5}\s+\d{5}[\.\s]?\d{6}\s+\d{5}[\.\s]?\d{6}\s+\d\s+\d{14})\b/) ||
                      text.match(/\b\d{47}\b/) ||
                      text.match(/\b\d{11,12}[-\s.]?\d\s+\d{11,12}[-\s.]?\d\s+\d{11,12}[-\s.]?\d\s+\d{11,12}[-\s.]?\d\b/) ||
                      text.match(/\b\d{48}\b/);
  if (boletoMatch) {
    const decoded = parseBoletoDigitableLine(boletoMatch[0]);
    res.paymentDetails = decoded.digitableLine || boletoMatch[0].trim();
    res.paymentMethod = 'Boleto';
    if (!res.dueDate && decoded.dueDate) {
      res.dueDate = decoded.dueDate;
    }
    if ((!res.totalAmount || res.totalAmount <= 0) && decoded.payableAmount) {
      res.totalAmount = decoded.payableAmount;
    }
  } else {
    const pixMatch = text.match(/(?:Chave\s+PIX|PIX)\s*[:.\s]+([a-zA-Z0-9_\-\.\@\+]{8,60})/i);
    if (pixMatch) {
      res.paymentDetails = `Pix: ${pixMatch[1].trim()}`;
      res.paymentMethod = 'Pix';
    }
  }

  return res;
}

/**
 * Chamada à API Gemini Multimodal para documentos digitalizados, imagens ou scans
 */
async function parseWithGemini(
  base64Data: string,
  mimeType: string
): Promise<ExtractedInvoiceData | null> {
  const apiKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    localStorage.getItem('gemini_api_key') ||
    '';

  if (!apiKey) {
    console.warn('[invoiceExtractionService] VITE_GEMINI_API_KEY não configurada para OCR multimodal.');
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é um auditor fiscal especializado em documentos fiscais brasileiros (DANFE, NF-e, NFS-e, NFC-e, Recibos e Contratos).
Analise com atenção a imagem/PDF da Nota Fiscal anexada e extraia os seguintes dados:
1. "numeroNf": Número da Nota Fiscal (somente números, ex: "89240")
2. "serie": Série da Nota Fiscal (ex: "1")
3. "valorTotal": Valor total em decimal (ex: 14850.00, sem R$)
4. "fornecedor": Razão Social ou Nome Fantasia completo do Fornecedor / Prestador de Serviço emitente
5. "cnpjCpfFornecedor": CNPJ ou CPF do Fornecedor / Prestador formatado (ex: "12.345.678/0001-99")
6. "dataEmissao": Data de Emissão no formato "AAAA-MM-DD" (ex: "2026-10-02")
7. "dataVencimento": Data de Vencimento no formato "AAAA-MM-DD"
8. "formaPagamento": Sugestão entre "Boleto", "Pix", "Transferência", "Cartão", "Dinheiro" ou "Outro"
9. "dadosPagamento": Linha digitável do boleto, Chave Pix ou dados bancários se informados
10. "chaveAcesso": Chave de acesso oficial de 44 dígitos se presente na nota
11. "descricao": Breve resumo do que foi adquirido ou contratado

Retorne ESTRITAMENTE um JSON válido no formato cru (sem markdown ou blocos de código \`\`\`json):
{
  "numeroNf": "89240",
  "serie": "1",
  "valorTotal": 14850.00,
  "fornecedor": "Posto e Restaurante Graal Parada Real",
  "cnpjCpfFornecedor": "12.345.678/0001-99",
  "dataEmissao": "2026-10-02",
  "dataVencimento": "2026-10-16",
  "formaPagamento": "Boleto",
  "dadosPagamento": "23793.38128 60000.123456 12345.678901 1 98760001485000",
  "chaveAcesso": "35261012345678000199550010000892401827364519",
  "descricao": "Abastecimento quinzenal da frota"
}`;

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-latest'
    ];

    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const cleanMime = mimeType.includes('pdf') ? 'application/pdf' : (mimeType || 'image/jpeg');

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: cleanBase64
                  }
                },
                {
                  text: prompt
                }
              ]
            }
          ]
        });

        const textOutput = response.text || '';
        const cleanJson = textOutput.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return {
          invoiceNumber: parsed.numeroNf ? String(parsed.numeroNf).trim() : undefined,
          series: parsed.serie ? String(parsed.serie).trim() : undefined,
          totalAmount: typeof parsed.valorTotal === 'number' ? parsed.valorTotal : parseFloat(String(parsed.valorTotal || '').replace(',', '.')) || undefined,
          supplierName: parsed.fornecedor ? String(parsed.fornecedor).trim() : undefined,
          supplierCnpjCpf: parsed.cnpjCpfFornecedor ? formatCnpjCpf(String(parsed.cnpjCpfFornecedor)) : undefined,
          issueDate: convertBrDateToIso(parsed.dataEmissao),
          dueDate: convertBrDateToIso(parsed.dataVencimento),
          paymentMethod: parsed.formaPagamento as any,
          paymentDetails: parsed.dadosPagamento ? String(parsed.dadosPagamento).trim() : undefined,
          accessKey: parsed.chaveAcesso ? String(parsed.chaveAcesso).replace(/\D/g, '') : undefined,
          description: parsed.descricao ? String(parsed.descricao).trim() : undefined
        };
      } catch (e) {
        console.warn(`[invoiceExtractionService] Modelo ${model} falhou:`, e);
      }
    }
  } catch (err) {
    console.error('[invoiceExtractionService] Erro ao chamar Gemini:', err);
  }
  return null;
}

/**
 * Função pública principal para extração automática de dados de Nota Fiscal
 */
export async function extractDataFromInvoiceFile(
  fileOrBase64: File | string,
  fileName?: string
): Promise<ExtractedInvoiceData> {
  const isFile = typeof fileOrBase64 !== 'string';
  const name = isFile ? fileOrBase64.name : (fileName || 'documento');
  const lowerName = name.toLowerCase();

  let mimeType = isFile ? fileOrBase64.type : '';
  let base64String = '';

  if (isFile) {
    base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBase64);
    });
  } else {
    base64String = fileOrBase64;
    const matchMime = base64String.match(/^data:(.*?);base64,/);
    if (matchMime) mimeType = matchMime[1];
  }

  // 1. Tenta extrair como XML se for arquivo .xml ou texto XML
  if (lowerName.endsWith('.xml') || mimeType.includes('xml')) {
    try {
      let xmlText = '';
      if (isFile) {
        xmlText = await fileOrBase64.text();
      } else {
        const rawBase64 = base64String.includes(',') ? base64String.split(',')[1] : base64String;
        xmlText = atob(rawBase64);
      }
      const xmlResult = parseXmlInvoice(xmlText);
      if (xmlResult && (xmlResult.invoiceNumber || xmlResult.supplierName || xmlResult.totalAmount)) {
        console.log('[invoiceExtractionService] Dados extraídos com sucesso do XML:', xmlResult);
        return xmlResult;
      }
    } catch (e) {
      console.warn('[invoiceExtractionService] Falha ao ler XML:', e);
    }
  }

  // 2. Tenta extrair texto local de PDF via PDF.js
  let localPdfResult: ExtractedInvoiceData | null = null;
  const isPdf = lowerName.endsWith('.pdf') || mimeType.includes('pdf') || base64String.startsWith('data:application/pdf');

  if (isPdf) {
    try {
      const buffer = isFile ? await fileOrBase64.arrayBuffer() : dataUrlToArrayBuffer(base64String);
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((it: any) => it.str || '').join(' ') + '\n';
      }

      if (fullText.trim().length > 10) {
        localPdfResult = parseTextInvoice(fullText);
        // Enriquecimento cruzado inteligente com parseTextBoleto para faturas com boleto em anexo
        const boletoInfo = parseTextBoleto(fullText);
        if (boletoInfo) {
          if (!localPdfResult.dueDate && boletoInfo.dueDate) localPdfResult.dueDate = boletoInfo.dueDate;
          if (!localPdfResult.issueDate && boletoInfo.issueDate) localPdfResult.issueDate = boletoInfo.issueDate;
          if ((!localPdfResult.totalAmount || localPdfResult.totalAmount <= 0) && boletoInfo.payableAmount) localPdfResult.totalAmount = boletoInfo.payableAmount;
          if (!localPdfResult.paymentDetails && boletoInfo.digitableLine) {
            localPdfResult.paymentDetails = boletoInfo.digitableLine;
            localPdfResult.paymentMethod = 'Boleto';
          }
          if (!localPdfResult.supplierName && boletoInfo.beneficiaryName) localPdfResult.supplierName = boletoInfo.beneficiaryName;
          if (!localPdfResult.supplierCnpjCpf && boletoInfo.beneficiaryCnpjCpf) localPdfResult.supplierCnpjCpf = boletoInfo.beneficiaryCnpjCpf;
          if (!localPdfResult.invoiceNumber && boletoInfo.documentNumber) localPdfResult.invoiceNumber = boletoInfo.documentNumber;
        }
      }
    } catch (e) {
      console.warn('[invoiceExtractionService] Falha ao extrair texto do PDF via PDF.js:', e);
    }
  }

  // Se o parser local já obteve com sucesso dados fundamentais (número/pagamento e vencimento/emissão/valor), retorna imediatamente
  if (
    localPdfResult &&
    (localPdfResult.invoiceNumber || localPdfResult.paymentDetails || localPdfResult.supplierName) &&
    (localPdfResult.totalAmount !== undefined || localPdfResult.dueDate || localPdfResult.issueDate)
  ) {
    console.log('[invoiceExtractionService] Dados extraídos com sucesso do PDF local:', localPdfResult);
    return localPdfResult;
  }

  // 3. Fallback inteligente com IA Gemini Multimodal (para imagens, scans ou PDFs escaneados)
  try {
    const geminiResult = await parseWithGemini(base64String, mimeType || (isPdf ? 'application/pdf' : 'image/jpeg'));
    if (geminiResult) {
      // Mescla os dados priorizando as informações mais completas
      const merged: ExtractedInvoiceData = {
        invoiceNumber: geminiResult.invoiceNumber || localPdfResult?.invoiceNumber,
        series: geminiResult.series || localPdfResult?.series,
        totalAmount: geminiResult.totalAmount !== undefined ? geminiResult.totalAmount : localPdfResult?.totalAmount,
        supplierName: geminiResult.supplierName || localPdfResult?.supplierName,
        supplierCnpjCpf: geminiResult.supplierCnpjCpf || localPdfResult?.supplierCnpjCpf,
        issueDate: geminiResult.issueDate || localPdfResult?.issueDate,
        dueDate: geminiResult.dueDate || localPdfResult?.dueDate,
        paymentMethod: geminiResult.paymentMethod || localPdfResult?.paymentMethod,
        paymentDetails: geminiResult.paymentDetails || localPdfResult?.paymentDetails,
        accessKey: geminiResult.accessKey || localPdfResult?.accessKey,
        description: geminiResult.description || localPdfResult?.description
      };

      console.log('[invoiceExtractionService] Dados extraídos com sucesso via Gemini Multimodal:', merged);
      return merged;
    }
  } catch (e) {
    console.warn('[invoiceExtractionService] Falha no Gemini Multimodal:', e);
  }

  // Se o Gemini falhou mas tínhamos algum dado local, retorna o local
  if (localPdfResult) {
    return localPdfResult;
  }

  return {};
}

// ====================================================================
// EXTRAÇÃO E LEITURA INTELIGENTE DE BOLETOS BANCÁRIOS PARA PAGAMENTO
// ====================================================================

export interface ExtractedBoletoData {
  payableAmount?: number;
  dueDate?: string; // YYYY-MM-DD
  issueDate?: string; // YYYY-MM-DD (Data do Documento / Emissão / Processamento)
  documentNumber?: string;
  digitableLine?: string;
  beneficiaryName?: string;
  beneficiaryCnpjCpf?: string;
  bankName?: string;
}

/**
 * Decodifica linha digitável de boleto bancário (47 dígitos) ou arrecadação (48 dígitos)
 * Extrai valor e data de vencimento (fator Febraban)
 */
export function parseBoletoDigitableLine(raw: string): {
  digitableLine?: string;
  payableAmount?: number;
  dueDate?: string;
} {
  const clean = raw.replace(/\D/g, '');

  // 1. Boleto Bancário de Cobrança Tradicional (47 dígitos)
  if (clean.length === 47) {
    const formatted = `${clean.slice(0, 5)}.${clean.slice(5, 10)} ${clean.slice(10, 15)}.${clean.slice(15, 21)} ${clean.slice(21, 26)}.${clean.slice(26, 32)} ${clean.slice(32, 33)} ${clean.slice(33, 47)}`;

    // Campo 5 (14 dígitos): 4 dígitos do fator de vencimento + 10 dígitos de valor
    const factorStr = clean.slice(33, 37);
    const amountStr = clean.slice(37, 47);

    const factor = parseInt(factorStr, 10);
    const rawAmount = parseInt(amountStr, 10);
    const payableAmount = rawAmount > 0 ? Number((rawAmount / 100).toFixed(2)) : undefined;

    let dueDate: string | undefined = undefined;
    if (factor > 0) {
      // Regra Febraban:
      // Ciclo 2: A partir de 22/02/2025, o fator 1000 corresponde a 22/02/2025
      const baseCiclo2 = new Date(Date.UTC(2025, 1, 22));
      const days = factor - 1000;
      const targetDate = new Date(baseCiclo2.getTime() + days * 86400000);

      const y = targetDate.getUTCFullYear();
      const m = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
      const d = String(targetDate.getUTCDate()).padStart(2, '0');
      dueDate = `${y}-${m}-${d}`;
    }

    return {
      digitableLine: formatted,
      payableAmount,
      dueDate
    };
  }

  // 2. Boleto de Concessionária / Tributos / Arrecadação (48 dígitos)
  if (clean.length === 48 && clean.startsWith('8')) {
    const formatted = `${clean.slice(0, 11)}-${clean.slice(11, 12)} ${clean.slice(12, 23)}-${clean.slice(23, 24)} ${clean.slice(24, 35)}-${clean.slice(35, 36)} ${clean.slice(36, 47)}-${clean.slice(47, 48)}`;
    const rawValStr = clean.slice(4, 15);
    const rawAmount = parseInt(rawValStr, 10);
    const payableAmount = rawAmount > 0 ? Number((rawAmount / 100).toFixed(2)) : undefined;

    return {
      digitableLine: formatted,
      payableAmount
    };
  }

  return {};
}

/**
 * Extração de dados de boleto bancário via expressões regulares sobre o texto
 */
function parseTextBoleto(text: string): ExtractedBoletoData {
  const res: ExtractedBoletoData = {};
  if (!text) return res;

  // 1. Linha Digitável
  const matchLinha = text.match(/\b\d{5}[\.\s]?\d{5}\s+\d{5}[\.\s]?\d{6}\s+\d{5}[\.\s]?\d{6}\s+\d\s+\d{14}\b/) ||
                     text.match(/\b\d{47}\b/) ||
                     text.match(/\b\d{11,12}[-\s.]?\d\s+\d{11,12}[-\s.]?\d\s+\d{11,12}[-\s.]?\d\s+\d{11,12}[-\s.]?\d\b/) ||
                     text.match(/\b\d{48}\b/);

  if (matchLinha) {
    const decoded = parseBoletoDigitableLine(matchLinha[0]);
    if (decoded.digitableLine) res.digitableLine = decoded.digitableLine;
    if (decoded.payableAmount !== undefined && decoded.payableAmount > 0) res.payableAmount = decoded.payableAmount;
    if (decoded.dueDate) res.dueDate = decoded.dueDate;
  }

  // 2. Data de Vencimento explícita no texto
  const duePatterns = [
    /(?:(?:Data\s+(?:do\s+)?)?Vencimento|Data\s+Venc\.|Vencimento|Venc\.|Vencer\s+em|Pagar\s+at[ée]|Data\s+Limite\s+(?:para\s+)?Pagamento|Vencimento\s+do\s+Boleto|Vencimento\s+da\s+Fatura)\s*[:.\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:Vencimento|Data\s+do\s+Vencimento)[\s\r\n]+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i
  ];
  for (const p of duePatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const iso = convertBrDateToIso(m[1]);
      if (iso) {
        res.dueDate = iso; // Data textual do boleto tem prioridade máxima
        break;
      }
    }
  }

  // 3. Data de Emissão / Data do Documento / Data de Processamento
  const issuePatterns = [
    /(?:Data\s+(?:do\s+)?Documento|Data\s+Documento|Dt\.?\s*Doc\.?|Data\s+(?:de\s+)?Emiss[ãa]o|Data\s+Emiss[ãa]o|Dt\.?\s*Emiss[ãa]o|Emiss[ãa]o|Emitido\s+em)\s*[:.\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:Data\s+(?:de\s+)?Processamento|Data\s+Processamento|Processamento)\s*[:.\s]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i,
    /(?:Data\s+(?:do\s+)?Documento|Data\s+de\s+Processamento|Data\s+de\s+Emiss[ãa]o)[\s\r\n]+(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i
  ];
  for (const p of issuePatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const iso = convertBrDateToIso(m[1]);
      if (iso) {
        res.issueDate = iso;
        break;
      }
    }
  }

  // 4. Número do Documento / Seu Número / Nosso Número
  const docNumPatterns = [
    /(?:N[úu]mero\s+(?:do\s+)?Documento|N[º°]\s+(?:do\s+)?Documento|No\s+Documento|Seu\s+N[úu]mero|Nosso\s+N[úu]mero)\s*[:.\s]*([A-Z0-9\/-]{3,30})/i,
    /(?:N[úu]mero\s+do\s+Documento)[\s\r\n]+([A-Z0-9\/-]{3,30})/i
  ];
  for (const p of docNumPatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const clean = m[1].trim();
      if (clean && !res.documentNumber) {
        res.documentNumber = clean;
        break;
      }
    }
  }

  // 3. Valor a Pagar explícito no texto
  const valPatterns = [
    /(?:(?:\(=\)\s*)?Valor\s+(?:do\s+)?Documento|Valor\s+Cobrado|Valor\s+a\s+Pagar|Valor\s+Documento|Valor\s+Nominal|Valor\s+L[íi]quido|Total\s+a\s+Pagar)\s*[:.\s]*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/i,
    /(?:Valor\s+do\s+Boleto|Total\s+do\s+Boleto)\s*[:.\s]*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/i,
    /(?:\(=\)\s*VALOR\s+DO\s+DOCUMENTO)[^\d\n,.]*?(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/i
  ];
  for (const p of valPatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const parsed = parseCurrencyPtBr(m[1]);
      if (parsed !== undefined && parsed > 0) {
        res.payableAmount = parsed; // Valor explícito do boleto tem prioridade
        break;
      }
    }
  }

  // 4. Beneficiário / Cedente
  const benPatterns = [
    /(?:Benefici[áa]rio|Cedente|Nome\s+do\s+Benefici[áa]rio|Raz[ãa]o\s+Social)\s*[:.\s]+([A-Z0-9\s.,&'-]{3,80})/i,
    /(?:Pagador\s*\/)?Benefici[áa]rio\s*[:.\s\n]+([A-Z0-9\s.,&'-]{3,80})/i
  ];
  for (const p of benPatterns) {
    const m = text.match(p);
    if (m && m[1]) {
      const clean = m[1].replace(/(?:CNPJ|CPF|ENDERE|AG[ÊE]NCIA|CONTA|DATA)[\s\S]*/i, '').trim();
      if (clean.length >= 3) {
        res.beneficiaryName = clean;
        break;
      }
    }
  }

  // 5. CNPJ / CPF do Beneficiário
  const cnpjCpfMatch = text.match(/(?:CNPJ|CPF)(?:\s+(?:do\s+)?Benefici[áa]rio)?\s*[:.\s]*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})/i);
  if (cnpjCpfMatch && cnpjCpfMatch[1]) {
    res.beneficiaryCnpjCpf = formatCnpjCpf(cnpjCpfMatch[1]);
  }

  return res;
}

/**
 * Chamada à API Gemini Multimodal para reconhecimento visual de Boleto Bancário
 */
async function parseBoletoWithGemini(
  base64Data: string,
  mimeType: string
): Promise<ExtractedBoletoData | null> {
  const apiKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    localStorage.getItem('gemini_api_key') ||
    '';

  if (!apiKey) {
    console.warn('[invoiceExtractionService] VITE_GEMINI_API_KEY não configurada para OCR de boleto.');
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é um auditor financeiro especialista em conferência de Boletos Bancários e Títulos de Cobrança brasileiros (Febraban / Concessionárias).
Analise com extrema atenção a imagem/PDF do boleto bancário anexado e extraia:
1. "valorAPagar": Valor nominal/cobrado do boleto em decimal (ex: 1250.00, sem R$)
2. "dataVencimento": Data de vencimento no formato "AAAA-MM-DD" (ex: "2026-10-25")
3. "dataEmissao": Data do documento, data de emissão ou data de processamento no formato "AAAA-MM-DD" (ex: "2026-10-10")
4. "numeroDocumento": Número do documento, número da fatura, seu número ou nosso número se visível (ex: "89240")
5. "linhaDigitavel": Linha digitável completa com pontuações (ex: "34191.09008 00000.282119 00818.989004 5 98760000150000")
6. "beneficiario": Razão Social ou Nome do Beneficiário / Cedente
7. "cnpjCpfBeneficiario": CNPJ ou CPF do Beneficiário formatado
8. "banco": Nome do banco emissor se visível (ex: Itaú, Bradesco, Santander, Banco do Brasil, Caixa, etc.)

Retorne ESTRITAMENTE um JSON válido no formato cru (sem markdown ou blocos de código \`\`\`json):
{
  "valorAPagar": 1250.00,
  "dataVencimento": "2026-10-25",
  "dataEmissao": "2026-10-10",
  "numeroDocumento": "89240",
  "linhaDigitavel": "34191.09008 00000.282119 00818.989004 5 98760000150000",
  "beneficiario": "Posto Graal Parada Real",
  "cnpjCpfBeneficiario": "12.345.678/0001-99",
  "banco": "Itaú"
}`;

    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-latest'
    ];

    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const cleanMime = mimeType.includes('pdf') ? 'application/pdf' : (mimeType || 'image/jpeg');

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: cleanBase64
                  }
                },
                {
                  text: prompt
                }
              ]
            }
          ]
        });

        const textOutput = response.text || '';
        const cleanJson = textOutput.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return {
          payableAmount: typeof parsed.valorAPagar === 'number' ? parsed.valorAPagar : parseFloat(String(parsed.valorAPagar || '').replace(',', '.')) || undefined,
          dueDate: convertBrDateToIso(parsed.dataVencimento),
          issueDate: convertBrDateToIso(parsed.dataEmissao),
          documentNumber: parsed.numeroDocumento ? String(parsed.numeroDocumento).trim() : undefined,
          digitableLine: parsed.linhaDigitavel ? String(parsed.linhaDigitavel).trim() : undefined,
          beneficiaryName: parsed.beneficiario ? String(parsed.beneficiario).trim() : undefined,
          beneficiaryCnpjCpf: parsed.cnpjCpfBeneficiario ? formatCnpjCpf(String(parsed.cnpjCpfBeneficiario)) : undefined,
          bankName: parsed.banco ? String(parsed.banco).trim() : undefined
        };
      } catch (e) {
        console.warn(`[invoiceExtractionService] Modelo ${model} para boleto falhou:`, e);
      }
    }
  } catch (err) {
    console.error('[invoiceExtractionService] Erro ao chamar Gemini para boleto:', err);
  }
  return null;
}

/**
 * Função pública principal para extração automática de dados de Boleto Bancário para Pagamento
 */
export async function extractDataFromBoletoFile(
  fileOrBase64: File | string,
  fileName?: string
): Promise<ExtractedBoletoData> {
  const isFile = typeof fileOrBase64 !== 'string';
  const name = isFile ? fileOrBase64.name : (fileName || 'boleto');
  const lowerName = name.toLowerCase();

  let mimeType = isFile ? fileOrBase64.type : '';
  let base64String = '';

  if (isFile) {
    base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBase64);
    });
  } else {
    base64String = fileOrBase64;
    const matchMime = base64String.match(/^data:(.*?);base64,/);
    if (matchMime) mimeType = matchMime[1];
  }

  let localPdfResult: ExtractedBoletoData | null = null;
  const isPdf = lowerName.endsWith('.pdf') || mimeType.includes('pdf') || base64String.startsWith('data:application/pdf');

  // 1. Tenta extrair texto de PDF via PDF.js
  if (isPdf) {
    try {
      const buffer = isFile ? await fileOrBase64.arrayBuffer() : dataUrlToArrayBuffer(base64String);
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((it: any) => it.str || '').join(' ') + '\n';
      }

      if (fullText.trim().length > 10) {
        localPdfResult = parseTextBoleto(fullText);
        // Enriquecimento cruzado com parseTextInvoice caso tenha dados da fatura/cabeçalho
        const invoiceComplement = parseTextInvoice(fullText);
        if (invoiceComplement) {
          if (!localPdfResult.issueDate && invoiceComplement.issueDate) {
            localPdfResult.issueDate = invoiceComplement.issueDate;
          }
          if (!localPdfResult.dueDate && invoiceComplement.dueDate) {
            localPdfResult.dueDate = invoiceComplement.dueDate;
          }
          if (!localPdfResult.documentNumber && invoiceComplement.invoiceNumber) {
            localPdfResult.documentNumber = invoiceComplement.invoiceNumber;
          }
          if (!localPdfResult.beneficiaryName && invoiceComplement.supplierName) {
            localPdfResult.beneficiaryName = invoiceComplement.supplierName;
          }
          if (!localPdfResult.beneficiaryCnpjCpf && invoiceComplement.supplierCnpjCpf) {
            localPdfResult.beneficiaryCnpjCpf = invoiceComplement.supplierCnpjCpf;
          }
        }
      }
    } catch (e) {
      console.warn('[invoiceExtractionService] Falha ao extrair texto do PDF do boleto:', e);
    }
  }

  // Se o parser local já obteve o vencimento e o valor (ou emissão), retorna imediatamente
  if (
    localPdfResult &&
    (localPdfResult.dueDate || localPdfResult.issueDate) &&
    (localPdfResult.payableAmount !== undefined || localPdfResult.digitableLine)
  ) {
    console.log('[invoiceExtractionService] Dados do boleto extraídos com sucesso do PDF local:', localPdfResult);
    return localPdfResult;
  }

  // 2. Fallback inteligente com IA Gemini Multimodal (para scans, fotos ou PDFs rasterizados)
  try {
    const geminiResult = await parseBoletoWithGemini(base64String, mimeType || (isPdf ? 'application/pdf' : 'image/jpeg'));
    if (geminiResult) {
      const merged: ExtractedBoletoData = {
        payableAmount: geminiResult.payableAmount !== undefined ? geminiResult.payableAmount : localPdfResult?.payableAmount,
        dueDate: geminiResult.dueDate || localPdfResult?.dueDate,
        issueDate: geminiResult.issueDate || localPdfResult?.issueDate,
        documentNumber: geminiResult.documentNumber || localPdfResult?.documentNumber,
        digitableLine: geminiResult.digitableLine || localPdfResult?.digitableLine,
        beneficiaryName: geminiResult.beneficiaryName || localPdfResult?.beneficiaryName,
        beneficiaryCnpjCpf: geminiResult.beneficiaryCnpjCpf || localPdfResult?.beneficiaryCnpjCpf,
        bankName: geminiResult.bankName || localPdfResult?.bankName
      };

      console.log('[invoiceExtractionService] Dados do boleto extraídos com sucesso via Gemini Multimodal:', merged);
      return merged;
    }
  } catch (e) {
    console.warn('[invoiceExtractionService] Falha no Gemini Multimodal para boleto:', e);
  }

  if (localPdfResult) {
    return localPdfResult;
  }

  return {};
}

