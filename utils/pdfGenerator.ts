
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Shipment, Cargo, Client, Product, Vehicle } from "../types";
import { findExpedidorRecebedorByName } from "./locationStorage";

export const getStoredCompanyLogo = (): string | null => {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('transcunha_companyLogo') ||
    localStorage.getItem('trancunha_companyLogo') ||
    null
  );
};

export const addPdfLogo = (
  doc: jsPDF,
  logo?: string | null,
  options?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    align?: 'left' | 'right' | 'center';
  }
): boolean => {
  const effectiveLogo = logo || getStoredCompanyLogo();
  if (!effectiveLogo) return false;

  const w = options?.width ?? 35;
  const h = options?.height ?? 15;
  const y = options?.y ?? 5;
  const pageWidth = doc.internal.pageSize.getWidth();

  let x = options?.x;
  if (x === undefined) {
    if (options?.align === 'left') {
      x = 14;
    } else if (options?.align === 'center') {
      x = (pageWidth - w) / 2;
    } else {
      // Default: Top right
      x = pageWidth - 14 - w;
    }
  }

  try {
    doc.addImage(effectiveLogo, 'PNG', x, y, w, h);
    return true;
  } catch (e) {
    console.warn("Could not add company logo to PDF", e);
    return false;
  }
};

export const generateConsubeLoadingOrderPDF = (
  shipment: Shipment,
  cargo: Cargo,
  clients: Client[],
  products: Product[],
  vehicles: Vehicle[],
  companyLogo?: string | null
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const client = clients.find((c) => c.id === cargo.clientId);
  const branch = client?.secondaryCnpjs?.find(b => b.id === cargo.clientBranchId || b.cnpj === cargo.clientCnpj);
  const product = products.find((p) => p.id === cargo.productId);
  const normalizePlate = (p: string | undefined | null) => p ? p.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : "";

  // Geometria da página A4: 210 x 297 mm
  const margin = 10;
  const contentWidth = 190;
  let currentY = 12;

  // Linhas e bordas pretas clássicas do modelo impresso Consube
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);

  // ─────────────────────────────────────────────
  // 1. CABEÇALHO SUPERIOR (Logo + Nome da Transportadora)
  // ─────────────────────────────────────────────
  const headerHeight = 24;
  const leftColWidth = 62;
  const rightColWidth = contentWidth - leftColWidth; // 128 mm

  // Caixa da Logo (Esquerda)
  doc.rect(margin, currentY, leftColWidth, headerHeight);
  const effectiveLogo = companyLogo || getStoredCompanyLogo();
  if (effectiveLogo) {
    try {
      doc.addImage(effectiveLogo, 'PNG', margin + 4, currentY + 3, leftColWidth - 8, headerHeight - 6);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text("LOGO DA TRANSPORTADORA", margin + leftColWidth / 2, currentY + 11, { align: 'center' });
      doc.setFontSize(7.5);
      doc.text("(OPCIONAL)", margin + leftColWidth / 2, currentY + 16, { align: 'center' });
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text("LOGO DA TRANSPORTADORA", margin + leftColWidth / 2, currentY + 11, { align: 'center' });
    doc.setFontSize(7.5);
    doc.text("(OPCIONAL)", margin + leftColWidth / 2, currentY + 16, { align: 'center' });
  }

  // Caixa dos Dados da Transportadora (Direita)
  doc.rect(margin + leftColWidth, currentY, rightColWidth, headerHeight);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TRANSCUNHA TRANSPORTES E LOGÍSTICA", margin + leftColWidth + rightColWidth / 2, currentY + 8, { align: 'center' });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("CNPJ: 57.359.600/0001-68 - RUA MONTEIRO LOBATO, 325 - VILA NOVA", margin + leftColWidth + rightColWidth / 2, currentY + 13, { align: 'center' });
  doc.text("POÇOS DE CALDAS/MG - CEP: 37701-110 - FONE: (35) 99882-9694 / 3721-0000", margin + leftColWidth + rightColWidth / 2, currentY + 17, { align: 'center' });
  doc.text("DADOS DA TRANSPORTADORA (ENDEREÇO, TELEFONE, ENTRE OUTROS...)", margin + leftColWidth + rightColWidth / 2, currentY + 21, { align: 'center' });

  currentY += headerHeight;

  // ─────────────────────────────────────────────
  // 2. BARRA DE TÍTULO (Fundo cinza claro)
  // ─────────────────────────────────────────────
  const titleBarHeight = 7;
  doc.setFillColor(225, 228, 232); // cinza suave do documento oficial
  doc.rect(margin, currentY, contentWidth, titleBarHeight, 'FD');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 0, 0);
  doc.text("ORDEM DE CARREGAMENTO", margin + 3, currentY + 4.8);

  const cleanOcNum = shipment.id.replace(/\D/g, '') || shipment.id || cargo.sequenceId;
  const branchName = branch?.nomeFantasia || branch?.city || 'MATRIZ POÇOS DE CALDAS';
  const emissionDate = new Date().toLocaleDateString('pt-BR');

  doc.setFontSize(8.5);
  doc.text(`Nro: ${cleanOcNum}`, margin + 70, currentY + 4.8);
  doc.text(`Filial: ${branchName.toUpperCase()}`, margin + 105, currentY + 4.8);
  doc.text(`Emissão: ${emissionDate}`, margin + 155, currentY + 4.8);

  currentY += titleBarHeight;

  // ─────────────────────────────────────────────
  // 3. SEÇÃO 1: MOTORISTA E VEÍCULOS
  // ─────────────────────────────────────────────
  const sec1Height = 44;
  doc.rect(margin, currentY, contentWidth, sec1Height);

  // Vencimento da OC (data programada ou +3 dias)
  const vctoOc = shipment.scheduledDate 
    ? new Date(`${shipment.scheduledDate}T00:00:00`).toLocaleDateString('pt-BR') 
    : new Date(Date.now() + 3 * 86400000).toLocaleDateString('pt-BR');

  const driverTypeTag = '[TERCEIRO]';
  const driverName = (shipment.driverName || 'NÃO INFORMADO').toUpperCase();
  const driverCpf = shipment.driverCpf || 'N/A';
  const driverCnh = (shipment as any).driverCnh || (shipment as any).cnh || 'N/A';
  const driverReg = (shipment as any).driverCnhRegister || driverCnh;
  const vctoCnh = (shipment as any).driverCnhExpiry || 'EM DIA';
  const driverPhone = shipment.driverContact || 'N/A';
  const driverRg = (shipment as any).driverRg || 'N/A';
  const horsePlate = normalizePlate(shipment.horsePlate) || 'N/A';
  const trailer1 = normalizePlate(shipment.trailer1Plate) || '-';
  const trailer2 = normalizePlate(shipment.trailer2Plate) || '-';
  const dolly = normalizePlate(shipment.trailer3Plate) || '-';

  doc.setFont("courier", "normal");
  doc.setFontSize(8.5);

  let sY = currentY + 4.5;
  const lineGap = 5.0;

  // Linha 1: Autorizamos o Sr. [TERCEIRO] Vcto O.C. :
  doc.text("Autorizamos o Sr.", margin + 3, sY);
  doc.setFont("courier", "bold");
  doc.text(driverTypeTag, margin + 75, sY);
  doc.setFont("courier", "normal");
  doc.text(`Vcto O.C. : ${vctoOc}`, margin + 125, sY);

  sY += lineGap;
  // Linha 2: Motorista : ... CPF : ...
  doc.text(`Motorista : ${driverName}`, margin + 3, sY);
  doc.text(`CPF      : ${driverCpf}`, margin + 125, sY);

  sY += lineGap;
  // Linha 3: CNH : ... N°Reg: ... Vcto CNH : ...
  doc.text(`CNH       : ${driverCnh}`, margin + 3, sY);
  doc.text(`N°Reg: ${driverReg}`, margin + 65, sY);
  doc.text(`Vcto CNH : ${vctoCnh}`, margin + 125, sY);

  sY += lineGap;
  // Linha 4: Fone : ... RG : ...
  doc.text(`Fone      : ${driverPhone}`, margin + 3, sY);
  doc.text(`RG       : ${driverRg}`, margin + 125, sY);

  sY += lineGap;
  // Linha 5: Cavalo : ...
  doc.text(`Cavalo    : ${horsePlate}`, margin + 3, sY);

  sY += lineGap;
  // Linha 6: Reboque 1 : ...
  doc.text(`Reboque 1 : ${trailer1}`, margin + 3, sY);

  sY += lineGap;
  // Linha 7: Reboque 2 : ...
  doc.text(`Reboque 2 : ${trailer2}`, margin + 3, sY);

  sY += lineGap;
  // Linha 8: DOLLY : ...
  doc.text(`DOLLY     : ${dolly}`, margin + 3, sY);

  currentY += sec1Height;

  // ─────────────────────────────────────────────
  // 4. SEÇÃO 2: CARGA / PRODUTO
  // ─────────────────────────────────────────────
  const sec2Height = 14;
  doc.rect(margin, currentY, contentWidth, sec2Height);

  const productName = (product?.name || cargo.productId || 'MERCADORIA EM GERAL').toUpperCase();
  const weightTons = Number(shipment.shipmentTonnage) || Number(cargo.totalVolume) || 0;
  const weightKgStr = (weightTons * 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  const packaging = (cargo.packaging || 'GRANEL').toUpperCase();
  const bags = (packaging.includes('SACO') || packaging.includes('BIG')) ? `${Math.round(weightTons * 1000 / 50)} SC` : '-';
  const natureCargo = (cargo.type || 'SÓLIDOS A GRANEL').toUpperCase();
  const orderNum = (cargo.orderNumber || (cargo as any).numeroPedido || cargo.tmsLoteNumber || shipment.orderId || '-').toUpperCase();

  sY = currentY + 4.8;
  // Linha 1: A retirar : ... Sacos: ... Peso:KG ...
  doc.text(`A retirar : ${productName}`, margin + 3, sY);
  doc.text(`Sacos: ${bags}`, margin + 105, sY);
  doc.text(`Peso:KG ${weightKgStr}`, margin + 140, sY);

  sY += lineGap + 0.5;
  // Linha 2: Espécie : ... Nat. Carga: ... N°Pedido: ...
  doc.text(`Espécie   : ${packaging}`, margin + 3, sY);
  doc.text(`Nat. Carga: ${natureCargo}`, margin + 75, sY);
  doc.text(`N°Pedido: ${orderNum}`, margin + 140, sY);

  currentY += sec2Height;

  // ─────────────────────────────────────────────
  // 5. SEÇÃO 3: REMETENTE / ORIGEM
  // ─────────────────────────────────────────────
  const sec3Height = 18;
  doc.rect(margin, currentY, contentWidth, sec3Height);

  const originLoc = findExpedidorRecebedorByName(cargo.originLocation || '');
  const shipperName = (originLoc?.name || cargo.originLocation || client?.razaoSocial || client?.nomeFantasia || 'REMETENTE CONFORME NOTA FISCAL').toUpperCase();
  const shipperAddress = (originLoc?.city ? `${originLoc.name} - ${originLoc.city}/${originLoc.state || ''}` : (cargo.origin || 'ENDEREÇO CONFORME CADASTRO')).toUpperCase();
  const originCityState = (cargo.origin || `${originLoc?.city || ''}/${originLoc?.state || ''}` || 'ORIGEM NÃO INFORMADA').toUpperCase();

  sY = currentY + 4.5;
  doc.text(`Remetente : ${shipperName}`, margin + 3, sY);
  sY += lineGap;
  doc.text(`Endereço  : ${shipperAddress}`, margin + 3, sY);
  sY += lineGap;
  doc.text(`Origem    : ${originCityState}`, margin + 3, sY);

  currentY += sec3Height;

  // ─────────────────────────────────────────────
  // 6. SEÇÃO 4: DESTINATÁRIO / CLIENTE
  // ─────────────────────────────────────────────
  const sec4Height = 14;
  doc.rect(margin, currentY, contentWidth, sec4Height);

  const clientName = (client?.nomeFantasia || client?.razaoSocial || cargo.clientId || 'CLIENTE DESTINATÁRIO').toUpperCase();
  const clientCnpj = (branch?.cnpj || client?.cnpj || cargo.clientCnpj || 'N/A').toUpperCase();
  const destLoc = findExpedidorRecebedorByName(cargo.destinationLocation || '');
  const destCity = (cargo.destination || `${destLoc?.city || ''}/${destLoc?.state || ''}` || 'DESTINO NÃO INFORMADO').toUpperCase();
  const destDisplay = cargo.destinationLocation ? `${cargo.destinationLocation.toUpperCase()} — ${destCity}` : destCity;

  sY = currentY + 4.8;
  doc.text(`CLIENTE   : ${clientName}`, margin + 3, sY);
  doc.text(`CNPJ: ${clientCnpj}`, margin + 125, sY);
  sY += lineGap + 0.5;
  doc.text(`Destino   : ${destDisplay}`, margin + 3, sY);

  currentY += sec4Height;

  // ─────────────────────────────────────────────
  // 7. SEÇÃO 5: LIBERAÇÃO DA GESTORA DE RISCO & OBSERVAÇÕES
  // ─────────────────────────────────────────────
  const sec5Height = 20;
  doc.rect(margin, currentY, contentWidth, sec5Height);

  const riskProtocol = (shipment.riskReleaseCode || (shipment as any).riskProtocol || 'CONSULTA APROVADA - BUONNY / OPEN TECH').toUpperCase();
  const loadNum = String(cargo.orderNumber || cleanOcNum).toUpperCase();
  const ulaNum = String((cargo as any).ulaNumber || '-').toUpperCase();
  const anttNum = (shipment.anttOwnerIdentifier?.replace(/\D/g, '') || '057359600').toUpperCase();

  sY = currentY + 4.5;
  doc.text(`Liberação da gestora de Risco: ${riskProtocol}`, margin + 3, sY);

  sY += lineGap;
  doc.text(`Load Num/DT: ${loadNum}        ULA: ${ulaNum}        ANTT: ${anttNum}`, margin + 3, sY);

  sY += lineGap;
  doc.setFont("courier", "bold");
  doc.text("Observação :PREENCHER OS DADOS SEM O USO DE PONTUAÇÃO.", margin + 3, sY);

  currentY += sec5Height;

  // ─────────────────────────────────────────────
  // 8. BLOCO DE ASSINATURAS (Rodapé formal)
  // ─────────────────────────────────────────────
  currentY += 12;
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);

  // Assinatura do Motorista
  doc.line(margin + 10, currentY + 12, margin + 85, currentY + 12);
  doc.setFontSize(7.5);
  doc.text("ASSINATURA DO MOTORISTA", margin + 47.5, currentY + 16, { align: 'center' });
  doc.setFontSize(7);
  doc.text(driverName, margin + 47.5, currentY + 20, { align: 'center' });

  // Assinatura da Transcunha
  doc.line(margin + 105, currentY + 12, margin + 180, currentY + 12);
  doc.setFontSize(7.5);
  doc.text("TRANSCUNHA TRANSPORTES E LOGÍSTICA", margin + 142.5, currentY + 16, { align: 'center' });
  doc.setFontSize(7);
  doc.text("EMISSOR RESPONSÁVEL / AUTORIZADO", margin + 142.5, currentY + 20, { align: 'center' });

  // Rodapé com data/hora e nota de controle
  doc.setFontSize(6.5);
  doc.setTextColor(140, 140, 140);
  doc.text(`Documento emitido via Sistema Transcunha Logística em ${new Date().toLocaleString('pt-BR')} - Modelo Consube`, margin + contentWidth / 2, 287, { align: 'center' });

  // Salvar PDF
  doc.save(`OC_CONSUBE_${cleanOcNum}_${horsePlate}.pdf`);
};

export const generateLoadingOrderPDF = (
  shipment: Shipment,
  cargo: Cargo,
  clients: Client[],
  products: Product[],
  vehicles: Vehicle[],
  companyLogo?: string | null,
  modelIdOverride?: string
) => {
  const client = clients.find((c) => c.id === cargo.clientId);
  const branch = client?.secondaryCnpjs?.find(b => b.id === cargo.clientBranchId || b.cnpj === cargo.clientCnpj);
  const effectiveModelId = modelIdOverride || branch?.loadingOrderModelId || branch?.ordemCarregamentoModelId || client?.loadingOrderModelId || client?.ordemCarregamentoModelId;

  if (effectiveModelId === 'mod_consube') {
    return generateConsubeLoadingOrderPDF(shipment, cargo, clients, products, vehicles, companyLogo);
  }

  const doc = new jsPDF();
  const product = products.find((p) => p.id === cargo.productId);
  const normalizePlate = (p: string | undefined | null) => p ? p.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : "";
  const mainVehicle = vehicles.find((v) => normalizePlate(v.plate) === normalizePlate(shipment.horsePlate));

  // Brand Colors
  const primaryBlue: [number, number, number] = [11, 102, 228]; // #0B66E4 Transcunha Vivid Electric Blue
  const accentBlue: [number, number, number] = [2, 132, 199];  // #0284C7 Transcunha Sky Accent
  const secondaryGray: [number, number, number] = [100, 116, 139]; // #64748B

  // Constants
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Draw Header background for branding
  doc.setFillColor(248, 250, 252); // light slate
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Logo
  const effectiveLogo = companyLogo || getStoredCompanyLogo();
  if (effectiveLogo) {
      try {
          doc.addImage(effectiveLogo, 'PNG', margin, 5, 35, 20); 
      } catch (e) {
          console.warn("Could not add company logo to PDF", e);
      }
  }

  // Company Info Header (Under the logo)
  doc.setFontSize(8);
  doc.setTextColor(secondaryGray[0], secondaryGray[1], secondaryGray[2]);
  doc.setFont("helvetica", "normal");
  doc.text("CNPJ: 57.359.600/0001-68", margin, 28);
  doc.text("Rua Monteiro Lobato, 325 - Vila Nova - Poços de Caldas/MG - 37701-110", margin, 32);
  doc.text("Autorização de Carregamento de Transportes", margin, 36);

  // Document ID & Date (Top Right)
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(`OC Nº: ${shipment.id}`, pageWidth - margin, 18, { align: 'right' });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, 24, { align: 'right' });

  // Divider
  doc.setDrawColor(accentBlue[0], accentBlue[1], accentBlue[2]);
  doc.setLineWidth(1.5);
  doc.line(margin, 40, pageWidth - margin, 40);

  // Title Section
  doc.setFontSize(16);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setFont("helvetica", "bold");
  doc.text("ORDEM DE CARREGAMENTO", pageWidth / 2, 53, { align: 'center' });

  // --- Carga Info ---
  doc.setFontSize(11);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text("1. INFORMAÇÕES DA CARGA", margin, 68);

  const originLoc = findExpedidorRecebedorByName(cargo.originLocation || '');
  const originDocInfo = originLoc?.documentNumber ? ` [${originLoc.documentType || 'DOC'}: ${originLoc.documentNumber}]` : '';
  const originDisplay = cargo.originLocation
    ? `${cargo.origin ? cargo.origin.toUpperCase() + ' - ' : ''}LOCAL / EXPEDIDOR: ${cargo.originLocation.toUpperCase()}${originDocInfo}`
    : (cargo.origin || '').toUpperCase();

  const destLoc = findExpedidorRecebedorByName(cargo.destinationLocation || '');
  const destDocInfo = destLoc?.documentNumber ? ` [${destLoc.documentType || 'DOC'}: ${destLoc.documentNumber}]` : '';
  const destDisplay = cargo.destinationLocation
    ? `${cargo.destination ? cargo.destination.toUpperCase() + ' - ' : ''}LOCAL / RECEBEDOR: ${cargo.destinationLocation.toUpperCase()}${destDocInfo}`
    : (cargo.destination || '').toUpperCase();

  autoTable(doc, {
    startY: 71,
    head: [["Descrição do Requisito", "Informações Detalhadas"]],
    body: [
      ["CLIENTE / EMBARCADOR", (client?.nomeFantasia || client?.razaoSocial || cargo.clientId || '').toUpperCase()],
      ["Nº DO PEDIDO", (cargo.orderNumber || (cargo as any).numeroPedido || cargo.tmsLoteNumber || 'N/A').toUpperCase()],
      ["PRODUTO / MERCADORIA", (product?.name || cargo.productId || '').toUpperCase()],
      ["TIPO DE EMBALAGEM", (cargo.packaging || 'GRANEL').toUpperCase()],
      ["PESO / TONELAGEM", `${(Number(shipment.shipmentTonnage) || 0).toLocaleString("pt-BR")} TON`],
      ["ORIGEM DO CARREGAMENTO", originDisplay],
      ["DESTINO DA CARGA", destDisplay],
      ["DATA PROGRAMADA", shipment.scheduledDate ? new Date(`${shipment.scheduledDate}T00:00:00`).toLocaleDateString('pt-BR') : 'N/A'],
    ],
    theme: "striped",
    headStyles: { fillColor: primaryBlue, fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: primaryBlue } }
  });

  const driverY = (doc as any).lastAutoTable.finalY + 12;

  // --- Motorista & Veiculo Info ---
  doc.setFontSize(11);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text("2. INFORMAÇÕES DO TRANSPORTADOR", margin, driverY);

  autoTable(doc, {
    startY: driverY + 3,
    head: [["Descrição", "Dados do Condutor e Veículo"]],
    body: [
      ["MOTORISTA", shipment.driverName.toUpperCase()],
      ["CPF DO CONDUTOR", shipment.driverCpf || "N/A"],
      ["TELEFONE CONTATO", shipment.driverContact || "N/A"],
      ["PLACA (CAVALO)", shipment.horsePlate.toUpperCase()],
      ["TIPO DE VEÍCULO", (mainVehicle?.setType || shipment.vehicleSetType || "N/A").toUpperCase()],
      ["CARROCERIA", (mainVehicle?.bodyType || shipment.vehicleBodyType || "N/A").toUpperCase()],
      ["PLACA(S) CARRETA(S)", [shipment.trailer1Plate, shipment.trailer2Plate, shipment.trailer3Plate].filter(Boolean).join(" / ").toUpperCase() || "N/A"],
      ["PROPRIETÁRIO / TITULAR", (shipment.anttOwnerIdentifier || shipment.ownerContact || "N/A").toUpperCase()],
    ],
    theme: "striped",
    headStyles: { fillColor: primaryBlue, fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: primaryBlue } }
  });

  const paymentY = (doc as any).lastAutoTable.finalY + 8;

  // --- Pagamento & Adiantamento ---
  doc.setFontSize(11);
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.text("3. CONDIÇÕES DE PAGAMENTO E ADIANTAMENTO", margin, paymentY);

  autoTable(doc, {
    startY: paymentY + 3,
    head: [["Item de Pagamento", "Detalhamento"]],
    body: [
      ["FORMA DE PAGAMENTO", (shipment.paymentMethod || "PIX - E-FRETE").toUpperCase()],
      ["ADIANTAMENTO (%)", `${shipment.advancePercentage !== undefined ? shipment.advancePercentage : 70}%`],
      ["CHAVE PIX / DADOS BANCÁRIOS", (shipment.paymentMethod === 'PIX - E-FRETE' ? (shipment.pixKey || shipment.bankDetails || "N/A") : (shipment.bankDetails || shipment.pixKey || "N/A")).toUpperCase()],
    ],
    theme: "striped",
    headStyles: { fillColor: primaryBlue, fontSize: 10, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: primaryBlue } }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 8;

  // Espaço antes do rodapé
  currentY += 5;


  // --- Footer / Signatures ---
  const footerY = Math.max(currentY + 25, pageHeight - 55);

  // Signature lines
  doc.setLineWidth(0.5);
  doc.setDrawColor(secondaryGray[0], secondaryGray[1], secondaryGray[2]);
  
  // Driver signature
  doc.line(margin, footerY, margin + 80, footerY);
  doc.setFontSize(8);
  doc.setTextColor(secondaryGray[0], secondaryGray[1], secondaryGray[2]);
  doc.text("ASSINATURA DO MOTORISTA", margin + 40, footerY + 5, { align: 'center' });
  doc.setFontSize(7);
  doc.text(shipment.driverName.toUpperCase(), margin + 40, footerY + 9, { align: 'center' });

  // Authority signature
  doc.line(pageWidth - margin - 80, footerY, pageWidth - margin, footerY);
  doc.setFontSize(8);
  doc.text("TRANSCUNHA LOGÍSTICA", pageWidth - margin - 40, footerY + 5, { align: 'center' });
  doc.setFontSize(7);
  doc.text("AUTORIZAÇÃO DE CARREGAMENTO", pageWidth - margin - 40, footerY + 9, { align: 'center' });

  // Final Footer Note
  doc.setFontSize(7);
  doc.setTextColor(150);
  const footerText = "Este documento é exclusivo para controle interno de carregamento da TRANSCUNHA LOGÍSTICA. As informações aqui contidas são confidenciais.";
  doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save PDF
  doc.save(`OC_${shipment.id}_${shipment.horsePlate.toUpperCase()}.pdf`);
};

