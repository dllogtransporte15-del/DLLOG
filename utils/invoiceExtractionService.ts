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
 * Converte data DD/MM/AAAA para formato aceito por input[type="date"] (AAAA-MM-DD)
 */
function convertBrDateToIso(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
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

  // 7. Data de Emissão
  const emissionPatterns = [
    /(?:DATA\s+(?:DA\s+|DE\s+)?EMISS[ÃA]O|DATA\s+EMISS[ÃA]O|EMISS[ÃA]O)\s*[:.\s]*(\d{2}\/\d{2}\/\d{4})/i,
    /EMITIDA\s+EM\s*[:.\s]*(\d{2}\/\d{2}\/\d{4})/i
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
    /(?:DATA\s+(?:DO\s+)?VENCIMENTO|VENCIMENTO|VENC\.)\s*[:.\s]*(\d{2}\/\d{2}\/\d{4})/i,
    /VENCER\s+EM\s*[:.\s]*(\d{2}\/\d{2}\/\d{4})/i
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
  const boletoMatch = text.match(/\b(\d{5}[\.\s]?\d{5}\s+\d{5}[\.\s]?\d{6}\s+\d{5}[\.\s]?\d{6}\s+\d\s+\d{14})\b/);
  if (boletoMatch) {
    res.paymentDetails = boletoMatch[1].trim();
    res.paymentMethod = 'Boleto';
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

      if (fullText.trim().length > 20) {
        localPdfResult = parseTextInvoice(fullText);
      }
    } catch (e) {
      console.warn('[invoiceExtractionService] Falha ao extrair texto do PDF via PDF.js:', e);
    }
  }

  // Se o parser local já obteve com sucesso os campos fundamentais (número, fornecedor e valor), retorna imediatamente
  if (
    localPdfResult &&
    localPdfResult.invoiceNumber &&
    localPdfResult.supplierName &&
    localPdfResult.totalAmount !== undefined
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
