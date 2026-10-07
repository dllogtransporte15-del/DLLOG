import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { Shipment, Cargo, Client, ShipmentStatus, User, Product } from '../../types';
import { getShipmentCte, getShipmentCteEmissionDate, hasCteAttached, getShipmentCiotNumber } from '../../utils';
import { calculateRoadDistanceKm } from '../../utils/distance';
import { calculateTacTaxDeductions } from '../../utils/freightCalculation';
import { calculateShipmentExpenses } from '../../utils/operationalExpensesCalculator';
import { fetchProducts } from '../../lib/db';
import type { ShipmentControlItem } from '../../utils/financialCalculations';
import { 
  TranscunhaSpreadsheetRow, 
  parseNumberPtBr, 
  formatDatePtBr, 
  parseShipmentDate,
  formatCteAndHours
} from '../../utils/transcunhaSpreadsheetParser';
import { 
  Search, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowLeftRight,
  Sparkles, 
  Filter, 
  Plus, 
  Trash2, 
  Copy, 
  RotateCcw, 
  RotateCw, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown, 
  X, 
  Maximize2, 
  Minimize2, 
  Move, 
  Loader2, 
  Calendar,
  Database,
  FileText,
  ExternalLink,
  Sun,
  Moon
} from 'lucide-react';
import { 
  openDocumentInNewTab, 
  getShipmentCteFileUrl, 
  getShipmentDischargeTicketUrl, 
  getShipmentTmsOrderUrl 
} from '../../utils/documentViewer';

interface ControlShipmentsTabProps {
  items: ShipmentControlItem[];
  shipments?: Shipment[];
  cargos?: Cargo[];
  clients?: Client[];
  users?: User[];
  currentUser?: User | null;
  products?: Product[];
}

/**
 * Determina a quantidade de eixos do veículo do embarque conforme a regra operacional da Transcunha:
 * - Rodotrem / Rodotrem (3x3): Basculante - 9 eixos
 * - LS Simples: Basculante - 5 eixos
 * - LS Trucada: Basculante - 6 eixos
 * - Vanderleia: Basculante - 6 eixos
 * - Bitrem 7e: Basculante - 7 eixos
 * - Bitrem 8e: Basculante - 8 eixos
 * - Cavalo 4e: Basculante - 7 eixos
 * - Carreta 4e: Basculante - 7 eixos
 * - Caminhão Truck: Basculante - 3 eixos
 * - Bitruck: Basculante - 4 eixos
 */
export function getVehicleAxlesCount(setType?: string | null): string {
  if (!setType) return '7 eixos';
  const norm = setType.toLowerCase().trim();

  // Rodotrem / Rodotrem (3x3): 9 eixos
  if (norm.includes('rodotrem')) return '9 eixos';

  // Bitrem 8e: 8 eixos
  if (norm.includes('bitrem 8') || norm.includes('bitrem 8e')) return '8 eixos';

  // Bitrem 7e / Cavalo 4e / Carreta 4e: 7 eixos
  if (norm.includes('bitrem 7') || norm.includes('bitrem 7e') || 
      norm.includes('cavalo 4') || norm.includes('cavalo 4e') || 
      norm.includes('carreta 4') || norm.includes('carreta 4e')) {
    return '7 eixos';
  }

  // LS Trucada / Vanderleia: 6 eixos
  if (norm.includes('ls trucada') || norm.includes('trucada') || 
      norm.includes('vanderleia') || norm.includes('vanderléia')) {
    return '6 eixos';
  }

  // LS Simples: 5 eixos
  if (norm.includes('ls simples') || norm.includes('simples')) return '5 eixos';

  // Bitruck: 4 eixos
  if (norm.includes('bitruck')) return '4 eixos';

  // Caminhão Truck: 3 eixos
  if (norm.includes('truck')) return '3 eixos';

  return '7 eixos';
}

/**
 * Formata timestamps ISO em formato de data e hora legível (DD/MM/AAAA HH:mm)
 */
export function formatDateTimePtBr(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '-';
  }
}

/**
 * Obtém a data e hora em que o comprovante de adiantamento foi anexado e o embarque avançou para o próximo status
 */
export function getAdvanceLiberationDateTime(s: Shipment): string {
  // 1. Timestamp direto gravado no documento ou embarque
  const direct = (s.documents as any)?.data_liberacao_adiantamento || 
                 (s.documents as any)?.hora_data_liberacao_adiantamento ||
                 (s.documents as any)?.advance_released_at ||
                 (s as any).advanceReleasedAt;
  if (direct) {
    const formatted = formatDateTimePtBr(direct);
    if (formatted !== '-') return formatted;
  }

  // 2. Status operacionais posteriores ao adiantamento
  const advancedStatuses: ShipmentStatus[] = [
    ShipmentStatus.AguardandoAgendamento,
    ShipmentStatus.AguardandoDescarga,
    ShipmentStatus.ValidacaoTicket,
    ShipmentStatus.AguardandoPagamentoSaldo,
    ShipmentStatus.Finalizado
  ];

  // 3. Busca no statusHistory a transição para status posterior
  if (s.statusHistory && s.statusHistory.length > 0) {
    const transition = s.statusHistory.find(sh => advancedStatuses.includes(sh.status));
    if (transition?.timestamp) {
      const formatted = formatDateTimePtBr(transition.timestamp);
      if (formatted !== '-') return formatted;
    }
  }

  // 4. Busca nos logs do histórico a anexação do comprovante ou avanço de status
  if (s.history && s.history.length > 0) {
    const logMatch = [...s.history].reverse().find(h => {
      const desc = h.description || '';
      return (
        desc.includes('Comprovante de Adiantamento') ||
        desc.includes('Adiantamento liberado') ||
        advancedStatuses.some(st => desc.includes(`Status alterado para "${st}"`))
      );
    });
    if (logMatch?.timestamp) {
      const formatted = formatDateTimePtBr(logMatch.timestamp);
      if (formatted !== '-') return formatted;
    }
  }

  // 5. Se já avançou além de AguardandoAdiantamento ou possui comprovante anexado
  const hasAdvanceProof = Boolean(
    (s.documents?.['Comprovante de Adiantamento'] && (s.documents['Comprovante de Adiantamento'] as any).length > 0) ||
    (s.documents as any)?.comprovante_adiantamento
  );

  const fallbackDate = (s as any).updatedAt || s.createdAt;
  if ((advancedStatuses.includes(s.status) || hasAdvanceProof) && fallbackDate) {
    const formatted = formatDateTimePtBr(fallbackDate);
    if (formatted !== '-') return formatted;
  }

  return '-';
}

/**
 * Obtém a data e hora em que o comprovante de saldo foi anexado e o embarque avançou para o próximo status
 */
export function getBalanceLiberationDateTime(s: Shipment): string {
  // 1. Timestamp direto gravado no documento ou embarque
  const direct = (s.documents as any)?.data_liberacao_saldo || 
                 (s.documents as any)?.hora_data_liberacao_saldo ||
                 (s.documents as any)?.balance_released_at ||
                 (s as any).balanceReleasedAt;
  if (direct) {
    const formatted = formatDateTimePtBr(direct);
    if (formatted !== '-') return formatted;
  }

  // 2. Busca no statusHistory a transição para Finalizado
  if (s.statusHistory && s.statusHistory.length > 0) {
    const transition = s.statusHistory.find(sh => sh.status === ShipmentStatus.Finalizado);
    if (transition?.timestamp) {
      const formatted = formatDateTimePtBr(transition.timestamp);
      if (formatted !== '-') return formatted;
    }
  }

  // 3. Busca nos logs do histórico o registro de pagamento ou finalização
  if (s.history && s.history.length > 0) {
    const logMatch = [...s.history].reverse().find(h => {
      const desc = h.description || '';
      return (
        desc.includes('Comprovante de Pagamento de Saldo') ||
        desc.includes('Pagamento de Saldo registrado') ||
        desc.includes(`Status alterado para "${ShipmentStatus.Finalizado}"`) ||
        desc.includes('Status alterado para "Finalizado"')
      );
    });
    if (logMatch?.timestamp) {
      const formatted = formatDateTimePtBr(logMatch.timestamp);
      if (formatted !== '-') return formatted;
    }
  }

  // 4. Se o status é Finalizado ou possui comprovante anexado
  const hasBalanceProof = Boolean(
    (s.documents?.['Comprovante de Pagamento de Saldo'] && (s.documents['Comprovante de Pagamento de Saldo'] as any).length > 0) ||
    (s.documents?.['Comprovante de Saldo'] && (s.documents['Comprovante de Saldo'] as any).length > 0) ||
    (s.documents as any)?.comprovante_saldo
  );

  const fallbackDate = (s as any).updatedAt || s.createdAt;
  if ((s.status === ShipmentStatus.Finalizado || hasBalanceProof) && fallbackDate) {
    const formatted = formatDateTimePtBr(fallbackDate);
    if (formatted !== '-') return formatted;
  }

  return '-';
}

export interface SpreadsheetColDef {
  key: keyof TranscunhaSpreadsheetRow;
  label: string;
  tooltip?: string;
  category: string;
  categoryColor: string;
  type: 'text' | 'number' | 'currency' | 'percent' | 'select';
  options?: string[];
  isCalculated?: boolean;
  isSynchronized?: boolean;
  width?: string;
  align?: 'left' | 'right' | 'center';
}

// 61 Colunas Oficiais da Controladoria Mapeadas com o Sistema (Compactas & Otimizadas)
export const SPREADSHEET_COLUMNS: SpreadsheetColDef[] = [
  // 0. Embarques do Sistema
  { key: 'idEmbarqueSistema', label: 'ID EMBARQUE SISTEMA', category: 'Embarques do Sistema', categoryColor: 'bg-emerald-600', type: 'text', width: 'w-[100px] min-w-[100px] max-w-[100px]', isSynchronized: true, align: 'center' },

  // 1. Faturamento & Recebimento Empresa
  { key: 'cteHoras', label: 'CTE', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'text', width: 'w-[75px] min-w-[75px] max-w-[75px]', align: 'center' },
  { key: 'dataHoraEmissao', label: 'DATA/HORA DE EMISSÃO', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'text', width: 'min-w-[105px] max-w-[120px]', align: 'center' },
  { key: 'jaFaturado', label: 'JÁ FATURADO', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'select', options: ['SIM', 'NÃO'], width: 'min-w-[70px] max-w-[80px]', align: 'center' },
  { key: 'dataVencimento', label: 'DATA VENCIM', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'text', width: 'min-w-[80px] max-w-[90px]', align: 'center' },
  { key: 'formaPagamento', label: 'FORMA DE PAGAMENTO', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'text', width: 'min-w-[110px] max-w-[125px]', align: 'center' },
  { key: 'dataPagamento', label: 'DATA DO PAGAMENTO', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'text', width: 'min-w-[85px] max-w-[95px]', align: 'center' },
  { key: 'statusRecebimento', label: 'A RECEBER OU RECEBIDO', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'select', options: ['A RECEBER', 'RECEBIDO'], width: 'min-w-[95px] max-w-[105px]', align: 'center' },

  // 2. Identificação & Motorista
  { key: 'dataEmbarque', label: 'DATA DO EMBARQUE', category: 'Identificação & Motorista', categoryColor: 'bg-blue-700', type: 'text', width: 'min-w-[85px] max-w-[95px]', align: 'center' },
  { key: 'placa', label: 'PLACA', category: 'Identificação & Motorista', categoryColor: 'bg-blue-700', type: 'text', width: 'min-w-[75px] max-w-[85px]', align: 'center' },
  { key: 'obsCavaloAntt', label: 'ENQUADRAMENTO ANTT', category: 'Identificação & Motorista', categoryColor: 'bg-blue-700', type: 'text', width: 'min-w-[105px] max-w-[130px]', align: 'center' },
  { key: 'codigoAtua', label: 'CODG. ATUA', category: 'Identificação & Motorista', categoryColor: 'bg-blue-700', type: 'text', width: 'min-w-[105px] max-w-[120px]', align: 'center' },
  { key: 'motorista', label: 'MOTORISTA A CARREGAR', category: 'Identificação & Motorista', categoryColor: 'bg-blue-700', type: 'text', width: 'min-w-[140px] max-w-[170px]' },
  { key: 'cpfMotorista', label: 'CPF MOTORISTA 🔄', category: 'Identificação & Motorista', categoryColor: 'bg-blue-700', type: 'text', isSynchronized: true, width: 'min-w-[105px] max-w-[115px]', align: 'center' },

  // 3. Carga, Pedido & Logística
  { key: 'proprietario', label: 'PROPRIETÁRIO VEÍCULO', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[130px] max-w-[160px]' },
  { key: 'anttContratoPix', label: 'ANTT / PIX 🔄', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', isSynchronized: true, width: 'min-w-[110px] max-w-[125px]', align: 'center' },
  { key: 'telefone', label: 'TELEFONE 🔄', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', isSynchronized: true, width: 'min-w-[95px] max-w-[110px]', align: 'center' },
  { key: 'solicitante', label: 'SOLICITANTE', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[110px] max-w-[130px]' },
  { key: 'carregarEmpresa', label: 'REMETENTE', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[125px] max-w-[155px]' },
  { key: 'numeroPedido', label: 'Nº PEDIDO', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[85px] max-w-[110px]', align: 'center' },
  { key: 'saldoOriginalPedido', label: 'SALDO PEDIDO', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[85px] max-w-[105px]', align: 'center' },
  { key: 'produto', label: 'PRODUTO', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[110px] max-w-[140px]' },
  { key: 'tipoCarga', label: 'TIPO', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[80px] max-w-[105px]', align: 'center' },

  // 4. Cadastros & Controles
  { key: 'transportadora', label: 'TRANSPORTADORA', category: 'Cadastros & Controles', categoryColor: 'bg-slate-700', type: 'text', width: 'min-w-[115px] max-w-[135px]' },
  { key: 'cadastro', label: 'CADASTRO', category: 'Cadastros & Controles', categoryColor: 'bg-slate-700', type: 'select', options: ['LIBERADO', 'BLOQUEADO', 'PENDENTE'], width: 'min-w-[80px] max-w-[90px]', align: 'center' },
  { key: 'matrizFilial', label: 'MATRIZ FILIAL', category: 'Cadastros & Controles', categoryColor: 'bg-slate-700', type: 'select', options: ['MATRIZ', 'FILIAL'], width: 'min-w-[80px] max-w-[90px]', align: 'center' },
  { key: 'liberacao', label: 'LIBERAÇÃO', category: 'Cadastros & Controles', categoryColor: 'bg-slate-700', type: 'text', width: 'min-w-[80px] max-w-[90px]', align: 'center' },
  { key: 'gr', label: 'GR', category: 'Cadastros & Controles', categoryColor: 'bg-slate-700', type: 'text', width: 'min-w-[75px] max-w-[85px]', align: 'center' },
  { key: 'ordemCarregamento', label: 'ORDEM DE CARREG', category: 'Cadastros & Controles', categoryColor: 'bg-slate-700', type: 'text', width: 'min-w-[90px] max-w-[100px]', align: 'center' },

  // 5. Tomador, Rota & Pesagem
  { key: 'clienteTomadorPagador', label: 'CLIENTE TOMADOR PAGADOR', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'text', width: 'min-w-[135px] max-w-[160px]' },
  { key: 'freteEmpresaUnitario', label: 'FRETE EMPRESA', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'currency', width: 'min-w-[85px] max-w-[95px]', align: 'right' },
  { key: 'origem', label: 'ORIGEM', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'text', width: 'min-w-[95px] max-w-[115px]' },
  { key: 'kmDistancia', label: 'KM DISTÂNCIA', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'text', width: 'min-w-[80px] max-w-[90px]', align: 'center' },
  { key: 'destino', label: 'DESTINO', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'text', width: 'min-w-[95px] max-w-[115px]' },
  { key: 'eixo', label: 'EIXO', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'text', width: 'min-w-[75px] max-w-[85px]', align: 'center' },
  { key: 'pedagio', label: 'PEDÁGIO', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'currency', width: 'min-w-[80px] max-w-[90px]', align: 'right' },
  { key: 'peso', label: 'PESO', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'number', width: 'min-w-[75px] max-w-[85px]', align: 'right' },

  // 6. Impostos & Deduções
  { key: 'freteBrutoEmpresa', label: 'FRETE BRUTO EMPRESA', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[95px] max-w-[110px]', isCalculated: true, align: 'right' },
  { key: 'icms', label: 'ICMS', tooltip: 'ICMS: ICMS Destacado no CT-e / Isento / Cálculo de ICMS', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[75px] max-w-[85px]', align: 'right' },
  { key: 'debitoPisCofins', label: 'DÉBITO PIS/COFINS', tooltip: 'DÉBITO PIS/COFINS: Imposto Federal (Composição das Deduções)', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[85px] max-w-[95px]', align: 'right' },
  { key: 'creditoPisCofins', label: 'CRÉDITO PIS/COFINS', tooltip: 'CRÉDITO PIS/COFINS: Crédito Gerado (Exportação / Ajuste Manual)', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[85px] max-w-[95px]', align: 'right' },
  { key: 'patronal4', label: 'PATRONAL 4%', tooltip: 'PATRONAL 4%: INSS Patronal / CPRB (4% sobre Frete Motorista - Pedágio se PF)', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[80px] max-w-[90px]', align: 'right' },
  { key: 'inssSestSenat', label: 'INSS / SEST SENAT', tooltip: 'INSS / SEST SENAT: 3.5.3 (-) Desconto SEST/SENAT (Carta Frete)', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[85px] max-w-[95px]', align: 'right' },
  { key: 'valorTaxaCiot', label: 'VL. CIOT', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[80px] max-w-[90px]', align: 'right' },

  // 7. Frete & Acerto Motorista
  { key: 'tarifaTonMotorista', label: 'TARIFA TON MOTORISTA', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'currency', width: 'min-w-[90px] max-w-[100px]', align: 'right' },
  { key: 'valorFreteMotorista', label: 'VALOR FRETE MOTORISTA', tooltip: 'VALOR FRETE MOTORISTA: Valor em conta bancária (excluindo pedágio pago no tag)', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'currency', width: 'min-w-[95px] max-w-[105px]', align: 'right' },
  { key: 'nfCliente', label: 'NF CLIENTE', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'text', width: 'min-w-[80px] max-w-[90px]', align: 'center' },
  { key: 'valorNf', label: 'VALOR DA NF', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'currency', width: 'min-w-[85px] max-w-[95px]', align: 'right' },
  { key: 'status', label: 'STATUS EMBARQUE', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'text', width: 'min-w-[90px] max-w-[100px]', align: 'center' },

  // 8. Adiantamentos & Saldo
  { key: 'percentualAdiantamento', label: '% ADIANT', category: 'Adiantamentos & Saldo', categoryColor: 'bg-emerald-700', type: 'percent', width: 'min-w-[65px] max-w-[75px]', align: 'right' },
  { key: 'valorAdiantamento', label: 'VALOR ADIANTAMENTO', category: 'Adiantamentos & Saldo', categoryColor: 'bg-emerald-700', type: 'currency', width: 'min-w-[90px] max-w-[100px]', align: 'right' },
  { key: 'horaDataLiberacaoAdiantamento', label: 'HORA/DATA LIBER. ADIANT', category: 'Adiantamentos & Saldo', categoryColor: 'bg-emerald-700', type: 'text', width: 'min-w-[110px] max-w-[130px]', align: 'center' },
  { key: 'ticketDescarga', label: 'TICKET DESCARGA', category: 'Adiantamentos & Saldo', categoryColor: 'bg-emerald-700', type: 'select', options: ['SIM', 'NÃO'], width: 'min-w-[75px] max-w-[85px]', align: 'center' },
  { key: 'pesoChegada', label: 'PESO CHEGADA', category: 'Adiantamentos & Saldo', categoryColor: 'bg-emerald-700', type: 'number', width: 'min-w-[75px] max-w-[85px]', align: 'right' },
  { key: 'saldo', label: 'SALDO RESTANTE', category: 'Adiantamentos & Saldo', categoryColor: 'bg-emerald-700', type: 'currency', width: 'min-w-[85px] max-w-[95px]', isCalculated: true, align: 'right' },

  // 9. Fechamento, CIOT, Quebra & Valor Total
  { key: 'horaDataLiberacaoSaldo', label: 'HORA/DATA LIBER. SALDO', category: 'Fechamento, CIOT, Quebra & Valor Total', categoryColor: 'bg-rose-700', type: 'text', width: 'min-w-[110px] max-w-[130px]', align: 'center' },
  { key: 'tipoPagamentoSaldo', label: 'FORMA PGTO SALDO', category: 'Fechamento, CIOT, Quebra & Valor Total', categoryColor: 'bg-rose-700', type: 'text', width: 'min-w-[90px] max-w-[100px]', align: 'center' },
  { key: 'statusSaldo', label: 'STATUS SALDO', category: 'Fechamento, CIOT, Quebra & Valor Total', categoryColor: 'bg-rose-700', type: 'select', options: ['PAGO', 'PENDENTE'], width: 'min-w-[80px] max-w-[90px]', align: 'center' },
  { key: 'ciot', label: 'CIOT', category: 'Fechamento, CIOT, Quebra & Valor Total', categoryColor: 'bg-rose-700', type: 'text', width: 'min-w-[130px] max-w-[160px]', isCalculated: true, align: 'center' },
  { key: 'totalQuebra', label: 'TOTAL QUEBRA', category: 'Fechamento, CIOT, Quebra & Valor Total', categoryColor: 'bg-rose-700', type: 'number', width: 'min-w-[75px] max-w-[85px]', isCalculated: true, align: 'right' },
  { key: 'valorQuebraCiot', label: 'VALOR QUEBRA / DESC', category: 'Fechamento, CIOT, Quebra & Valor Total', categoryColor: 'bg-rose-700', type: 'currency', width: 'min-w-[90px] max-w-[100px]', align: 'right' },
];

export const ControlShipmentsTab: React.FC<ControlShipmentsTabProps> = ({ 
  items = [], 
  shipments = [], 
  cargos = [], 
  clients = [],
  users = [],
  currentUser,
  products = []
}) => {
  // Estado de dados mapeados e carregamento
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isWindowOpen, setIsWindowOpen] = useState<boolean>(false);
  const [windowMode, setWindowMode] = useState<'fullscreen' | 'floating'>('fullscreen');
  const [windowPos, setWindowPos] = useState({ x: 20, y: 20 });
  const [windowSize, setWindowSize] = useState({ 
    width: typeof window !== 'undefined' ? Math.min(1600, window.innerWidth - 40) : 1200, 
    height: typeof window !== 'undefined' ? Math.min(900, window.innerHeight - 40) : 750 
  });
  const [isDraggingWindow, setIsDraggingWindow] = useState<boolean>(false);
  const [isResizingWindow, setIsResizingWindow] = useState<boolean>(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, windowX: 20, windowY: 20 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, startW: 1200, startH: 750 });

  // Filtros e busca (rolagem contínua por período, sem quebra de páginas)
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month' | 'current_cycle' | 'year' | 'custom'>('month');
  const [dateFilterBasis, setDateFilterBasis] = useState<'smart' | 'emission' | 'boarding'>('smart');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePickerPopup, setShowDatePickerPopup] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [saldoFilter, setSaldoFilter] = useState('all');
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [openFilterColumnKey, setOpenFilterColumnKey] = useState<string | null>(null);
  const [filterSearchQuery, setFilterSearchQuery] = useState<string>('');
  const [showFilterRow, setShowFilterRow] = useState<boolean>(true);
  const [onlyWithCte, setOnlyWithCte] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'full' | 'summary'>('full');

  // Modo de tema independente da planilha (Escuro ou Claro)
  const [sheetTheme, setSheetTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('control_shipments_theme_mode');
      if (saved === 'dark' || saved === 'light') return saved;
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });

  const isSheetDark = sheetTheme === 'dark';

  const toggleSheetTheme = useCallback(() => {
    setSheetTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('control_shipments_theme_mode', next);
      }
      return next;
    });
  }, []);

  // Seleção e Navegação Ativa por Célula (Estilo Excel / Planilha com Setas)
  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Ordenação: CT-e decrescente por padrão (linhas organizadas pelo número de CTE)
  const [sortConfig, setSortConfig] = useState<{ key: keyof TranscunhaSpreadsheetRow; direction: 'asc' | 'desc' } | null>({
    key: 'cteHoras',
    direction: 'desc'
  });

  // Fechar popover de período ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!showDatePickerPopup) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-period-popover="true"]')) {
        setShowDatePickerPopup(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDatePickerPopup(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDatePickerPopup]);

  // Fechamento do popover de filtro de coluna ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!openFilterColumnKey) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-filter-popover="true"]')) return;
      setOpenFilterColumnKey(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenFilterColumnKey(null);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openFilterColumnKey]);

  // Helper para identificar embarques cancelados
  const isShipmentCancelled = useCallback((s: Shipment): boolean => {
    if (s.status === ShipmentStatus.Cancelado) return true;
    const norm = String(s.status || '').toLowerCase().trim();
    return norm === 'cancelado' || norm.includes('cancel');
  }, []);

  // Total de embarques ativos com CT-e emitido (excluindo cancelados)
  const totalComCte = useMemo(() => {
    return shipments.filter(s => !isShipmentCancelled(s) && hasCteAttached(s)).length;
  }, [shipments, isShipmentCancelled]);

  // Filtragem dos embarques da planilha (exclui cancelados por padrão para nunca poluir a controladoria ativa)
  const shipmentsFiltered = useMemo(() => {
    const isExplicitlyLookingForCancelled = statusFilter && statusFilter.toLowerCase().includes('cancel');

    return shipments.filter(s => {
      const cancelled = isShipmentCancelled(s);
      
      // Se o usuário selecionou explicitamente ver 'Cancelado', filtra só os cancelados
      if (isExplicitlyLookingForCancelled) {
        if (!cancelled) return false;
      } else {
        // Por padrão (e para qualquer outro filtro operacional), embarques cancelados NUNCA aparecem
        if (cancelled) return false;
      }

      // Filtro de CT-e (apenas com CT-e por padrão)
      if (onlyWithCte && !hasCteAttached(s)) {
        return false;
      }

      return true;
    });
  }, [shipments, onlyWithCte, statusFilter, isShipmentCancelled]);

  // Formas de pagamento do cliente personalizadas por embarque (Pix, Boleto, Transferência Bancária)
  const [clientPaymentMethodOverrides, setClientPaymentMethodOverrides] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('transcunha_control_client_payment_methods');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handlePaymentMethodChange = useCallback((shipmentId: string, method: string) => {
    setClientPaymentMethodOverrides(prev => {
      const next = { ...prev, [shipmentId]: method };
      try {
        localStorage.setItem('transcunha_control_client_payment_methods', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Mapeamento em tempo de execução dos embarques operacionais para as 61 colunas
  const [loadedProducts, setLoadedProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!products || products.length === 0) {
      fetchProducts().then(res => {
        if (res && res.length > 0) setLoadedProducts(res);
      }).catch(err => console.warn('[ControlShipmentsTab] Erro ao carregar produtos:', err));
    }
  }, [products]);

  const effectiveProducts = useMemo(() => {
    return (products && products.length > 0) ? products : loadedProducts;
  }, [products, loadedProducts]);

  const productMap = useMemo(() => new Map(effectiveProducts.map(p => [p.id, p])), [effectiveProducts]);
  const cargoMap = useMemo(() => new Map(cargos.map(c => [c.id, c])), [cargos]);
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.razaoSocial || c.nomeFantasia || ''])), [clients]);
  const clientObjMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);

  const mappedRows = useMemo<TranscunhaSpreadsheetRow[]>(() => {
    return shipmentsFiltered.map((s, index) => {
      const cargo = s.cargoId ? cargoMap.get(s.cargoId) : undefined;
      const clientName = cargo?.clientId ? clientMap.get(cargo.clientId) || '' : '';

      // Embarcador Solicitante
      let solicitanteName = '';
      if (s.embarcadorId) {
        solicitanteName = userMap.get(s.embarcadorId) || clientMap.get(s.embarcadorId) || '';
      }
      if (!solicitanteName && s.createdById) {
        solicitanteName = userMap.get(s.createdById) || '';
      }
      if (!solicitanteName && (cargo as any)?.requesterName) {
        solicitanteName = (cargo as any).requesterName;
      }
      if (!solicitanteName && s.embarcadorId && !s.embarcadorId.startsWith('USR-') && s.embarcadorId !== 'Embarcador') {
        solicitanteName = s.embarcadorId;
      }
      if (!solicitanteName && s.id && s.id.includes('-')) {
        const prefix = s.id.split('-')[0].trim().toUpperCase();
        if (prefix.length >= 3) {
          const matchUser = users.find(u => (u.name || '').trim().toUpperCase().startsWith(prefix));
          if (matchUser?.name) {
            solicitanteName = matchUser.name;
          }
        }
      }
      if (!solicitanteName) {
        solicitanteName = 'Não Informado';
      }
      solicitanteName = solicitanteName.trim();

      const peso = s.loadedTonnage || s.shipmentTonnage || 0;
      const tarifaEmpresa = s.companyFreightRateSnapshot || cargo?.companyFreightValuePerTon || 0;
      const freteBruto = Number((peso * tarifaEmpresa).toFixed(2));
      const tarifaMotorista = s.driverFreightRateSnapshot || cargo?.driverFreightValuePerTon || (peso > 0 ? Number((s.driverFreightValue / peso).toFixed(2)) : 0);
      const freteMotorista = s.driverFreightValue || Number((peso * tarifaMotorista).toFixed(2));
      const pedagioMotorista = s.tollValue || 0;

      // Valor do Frete Motorista em Conta Bancária: não considera os valores de pedágio (tag/vale-pedágio),
      // considerando apenas os valores creditados/pagos na conta bancária do motorista.
      const freteMotoristaConta = Math.max(0, freteMotorista - pedagioMotorista);

      const pesoChegada = s.unloadedTonnage || 0;
      const quebra = (peso > pesoChegada && pesoChegada > 0) ? Number((peso - pesoChegada).toFixed(3)) : 0;
      const calculatedSaldo = (s.netBalanceValue !== undefined && s.netBalanceValue !== null)
        ? s.netBalanceValue
        : ((s.balanceToReceiveValue !== undefined && s.balanceToReceiveValue !== null)
            ? s.balanceToReceiveValue
            : Math.max(0, freteMotorista - (s.tollValue || 0) - (s.advanceValue || 0) - (s.discountValue || 0)));

      const dateStr = s.scheduledDate ? formatDatePtBr(s.scheduledDate) : formatDatePtBr(s.createdAt);
      const opExp = calculateShipmentExpenses(s, cargo);
      const realCte = getShipmentCte(s);
      const cteNum = (realCte && realCte !== '-') ? realCte : (s.cteNumber || (s.documents as any)?.cte_number || s.id);
      
      // Data e hora de emissão separada do CT-e
      const rawEmission = getShipmentCteEmissionDate(s);
      const emissionDateStr = rawEmission || `${dateStr} 08:00`;

      // Origem e Destino do Embarque (cidade de origem e cidade de destino)
      let cidadeOrigem = cargo?.origin || '';
      let cidadeDestino = cargo?.destination || '';

      const routeStr = s.route && s.route.trim() !== '.' ? s.route.trim() : '';

      if ((!cidadeOrigem || cidadeOrigem === '-') && routeStr) {
        if (routeStr.includes('→')) {
          cidadeOrigem = routeStr.split('→')[0].trim();
        } else if (routeStr.includes('->')) {
          cidadeOrigem = routeStr.split('->')[0].trim();
        } else if (routeStr.includes('x')) {
          cidadeOrigem = routeStr.split('x')[0].trim();
        }
      }

      if ((!cidadeDestino || cidadeDestino === '-') && routeStr) {
        if (routeStr.includes('→')) {
          const raw = routeStr.split('→').slice(-1)[0].trim();
          cidadeDestino = raw.includes('/') ? raw.split('/')[0].trim() : raw;
        } else if (routeStr.includes('->')) {
          const raw = routeStr.split('->').slice(-1)[0].trim();
          cidadeDestino = raw.includes('/') ? raw.split('/')[0].trim() : raw;
        } else if (routeStr.includes('x')) {
          const raw = routeStr.split('x').slice(-1)[0].trim();
          cidadeDestino = raw.includes('/') ? raw.split('/')[0].trim() : raw;
        }
      }

      if (!cidadeOrigem) cidadeOrigem = '-';
      if (!cidadeDestino) cidadeDestino = '-';

      const distKm = calculateRoadDistanceKm(cidadeOrigem, cidadeDestino, routeStr);
      const kmFormatado = distKm > 0 ? `${distKm} km` : (cidadeOrigem !== '-' && cidadeDestino !== '-' ? `${cidadeOrigem} → ${cidadeDestino}` : '-');

      // Forma de Pagamento do Cliente (Pix, Boleto, Transferência Bancária)
      const clientObj = cargo?.clientId ? clientObjMap.get(cargo.clientId) : undefined;
      let formaPagamentoCliente = clientPaymentMethodOverrides[s.id] || '';
      
      if (!formaPagamentoCliente && cargo?.clientId && clientPaymentMethodOverrides[cargo.clientId]) {
        formaPagamentoCliente = clientPaymentMethodOverrides[cargo.clientId];
      }

      if (!formaPagamentoCliente) {
        const clientMethodRaw = clientObj?.paymentMethod ? String(clientObj.paymentMethod).toUpperCase() : '';
        const docMethodRaw = (s.documents as any)?.client_payment_method ? String((s.documents as any).client_payment_method).toUpperCase() : '';
        const searchMethod = docMethodRaw || clientMethodRaw;

        if (searchMethod.includes('PIX')) {
          formaPagamentoCliente = 'PIX';
        } else if (searchMethod.includes('TRANSF') || searchMethod.includes('TED') || searchMethod.includes('DOC') || searchMethod.includes('CONTA') || searchMethod.includes('BANCA')) {
          formaPagamentoCliente = 'TRANSFERÊNCIA BANCÁRIA';
        } else {
          // Padrão do tomador/faturamento: BOLETO
          formaPagamentoCliente = 'BOLETO';
        }
      }

      return {
        id: s.id,
        orderIndex: index + 1,
        idEmbarqueSistema: s.id,
        cteHoras: cteNum,
        dataHoraEmissao: emissionDateStr,
        jaFaturado: s.status === ShipmentStatus.Finalizado ? 'SIM' : 'NÃO',
        dataVencimento: dateStr,
        formaPagamento: formaPagamentoCliente,
        dataPagamento: dateStr,
        statusRecebimento: s.status === ShipmentStatus.Finalizado ? 'RECEBIDO' : 'A RECEBER',

        dataEmbarque: dateStr,
        placa: s.horsePlate || '-',
        obsCavaloAntt: (() => {
          if (s.etcTaxRegime) return String(s.etcTaxRegime).toUpperCase();
          if ((s.documents as any)?.etc_tax_regime) return String((s.documents as any).etc_tax_regime).toUpperCase();
          if (s.driverFreightType === 'PF' || s.anttModality === 'TAC') return 'PF';
          if (s.driverFreightType === 'PJ' || s.anttModality === 'ETC') return 'PJ';
          return 'PJ';
        })(),
        codigoAtua: s.codigoAtua || (s.documents as any)?.codigo_atua || (s.documents as any)?.codg_atua || (s.documents as any)?.codigoAtua || '-',
        motorista: s.driverName || 'NÃO ATRIBUÍDO',
        cpfMotorista: s.driverCpf || '-',

        proprietario: s.ownerName || s.driverName || '-',
        anttContratoPix: s.pixKey || s.anttOwnerIdentifier || '-',
        telefone: s.driverContact || '-',
        solicitante: solicitanteName,
        carregarEmpresa: (cargo as any)?.loadingCompany || (cargo as any)?.remetente || clientName || '-',
        numeroPedido: cargo?.orderNumber || (cargo as any)?.numeroPedido || cargo?.tmsLoteNumber || (cargo?.sequenceId ? String(cargo.sequenceId) : (s.orderId || '-')),
        saldoOriginalPedido: (() => {
          if (!cargo) return '-';
          const totalLancado = Number(cargo.totalVolume ?? (cargo as any).scheduledVolume ?? 0);
          if (totalLancado <= 0) return '-';
          return totalLancado % 1 === 0 ? String(totalLancado) : Number(totalLancado.toFixed(2)).toString();
        })(),
        produto: (() => {
          const p = cargo?.productId ? productMap.get(cargo.productId) : undefined;
          if (p?.name) return p.name.toUpperCase();
          if ((cargo as any)?.productName) return String((cargo as any).productName).toUpperCase();
          if (cargo?.productId && !cargo.productId.startsWith('prod_') && !cargo.productId.includes('-')) return cargo.productId.toUpperCase();
          return 'SOJA EM GRÃOS';
        })(),
        tipoCarga: (() => {
          if (cargo?.packaging) return String(cargo.packaging).toUpperCase();
          if ((cargo as any)?.tipoEmbalagem) return String((cargo as any).tipoEmbalagem).toUpperCase();
          const p = cargo?.productId ? productMap.get(cargo.productId) : undefined;
          if ((p as any)?.packaging) return String((p as any).packaging).toUpperCase();
          return 'GRANEL';
        })(),

        transportadora: 'TRANSCUNHA LOGISTICA LTDA',
        cadastro: 'LIBERADO',
        matrizFilial: 'MATRIZ',
        liberacao: s.riskReleaseCode || 'LIB-001',
        gr: s.riskQueryType ? String(s.riskQueryType).toUpperCase() : 'BUONNY OK',
        ordemCarregamento: `OC-${s.orderId || s.id.slice(0, 6)}`,

        clienteTomadorPagador: clientName || 'CLIENTE GERAL',
        freteEmpresaUnitario: tarifaEmpresa,
        origem: cidadeOrigem,
        kmDistancia: kmFormatado,
        destino: cidadeDestino,
        eixo: getVehicleAxlesCount(s.vehicleSetType),
        modeloVeiculo: s.vehicleSetType || '',
        pedagio: s.tollValue || 0,
        peso,

        // --- Impostos & Deduções: sincronizados com a lógica do CteCostAutomationPanel e DocumentExtractedDataModal ---
        freteBrutoEmpresa: (() => {
          // Prioriza companyFreight salvo no realProfitData (mesma fonte do painel)
          if (s.realProfitData?.companyFreight !== undefined && s.realProfitData.companyFreight > 0) {
            return s.realProfitData.companyFreight;
          }
          if (opExp.companyFreight > 0) {
            return opExp.companyFreight;
          }
          // Fallback: cálculo local peso × tarifa
          return freteBruto;
        })(),

        // 1. ICMS: ICMS Destacado no CT-e / Isento / Cálculo de ICMS
        icms: (() => {
          // 1. Diferença de ICMS explicitamente registrada no realProfitData
          if (s.realProfitData?.icmsDifference !== undefined && s.realProfitData.icmsDifference > 0) {
            return s.realProfitData.icmsDifference;
          }
          // 2. ICMS Destacado nos documentos fiscais (CT-e / XML)
          const icmsDoc = Number((s.documents as any)?.icms_value) || 
                          Number((s.documents as any)?.vICMS) || 
                          Number((s.documents as any)?.valor_icms) || 
                          Number((s.documents as any)?.icms_destacado) || 
                          Number((s as any).icmsValue) || 
                          0;
          if (icmsDoc > 0) return icmsDoc;
          // 3. Informação do campo "ICMS Destacado" apurada pelo motor operacional
          return opExp.icms || 0;
        })(),

        // 2. DÉBITO PIS/CONFINS = Imposto Federal (Composição das Deduções)
        debitoPisCofins: (() => {
          // 1. Respeita edição manual (isFederalTaxManual) — mesma prioridade do painel
          if (s.isFederalTaxManual === true || s.realProfitData?.isFederalTaxManual === true || (s.documents as any)?.is_federal_tax_manual === true) {
            const manualVal = s.realProfitData?.federalTax !== undefined
              ? s.realProfitData.federalTax
              : ((s as any).federalTax !== undefined
                  ? Number((s as any).federalTax)
                  : (Number((s.documents as any)?.federal_tax) || Number((s.documents as any)?.imposto_federal) || 0));
            return manualVal;
          }
          // 2. Se houver valor explicitamente salvo no realProfitData
          if (s.realProfitData?.federalTax !== undefined && s.realProfitData.federalTax !== null) {
            return s.realProfitData.federalTax;
          }
          // 3. Informação puxada do campo "Imposto Federal" via motor de despesas operacionais (0 em Exportação; Simples/PF/PJ em Mercado Interno)
          return opExp.impostoFederal || 0;
        })(),

        // 3. CREDITO PIS/CONFINS = Crédito Gerado (Card CRÉDITO GERADO / Exportação / Ajuste Manual)
        creditoPisCofins: (() => {
          // 1. Respeita edição manual (isGeneratedCreditManual) — card "CRÉDITO GERADO (Manual)"
          if (s.isGeneratedCreditManual === true || s.realProfitData?.isGeneratedCreditManual === true || (s.documents as any)?.is_generated_credit_manual === true) {
            const manualVal = s.realProfitData?.generatedCredit !== undefined
              ? s.realProfitData.generatedCredit
              : ((s as any).generatedCredit !== undefined
                  ? Number((s as any).generatedCredit)
                  : (Number((s.documents as any)?.generated_credit) || Number((s.documents as any)?.credito_gerado) || 0));
            return manualVal;
          }
          // 2. Valor gravado no realProfitData ou nos dados do embarque
          if (s.realProfitData?.generatedCredit !== undefined && s.realProfitData.generatedCredit > 0) {
            return s.realProfitData.generatedCredit;
          }
          if ((s as any).generatedCredit !== undefined && Number((s as any).generatedCredit) > 0) {
            return Number((s as any).generatedCredit);
          }
          if ((s.documents as any)?.credito_gerado !== undefined && Number((s.documents as any).credito_gerado) > 0) {
            return Number((s.documents as any).credito_gerado);
          }
          if ((s.documents as any)?.generated_credit !== undefined && Number((s.documents as any).generated_credit) > 0) {
            return Number((s.documents as any).generated_credit);
          }
          // 3. Informação puxada do card "Crédito Gerado" via cálculo operacional de exportação (opExp.generatedCredit)
          return opExp.generatedCredit || 0;
        })(),

        // 4. PATRONAL = INSS Patronal / CPRB (4% s/ Frete Mot. - Pedágio se PF)
        patronal4: (() => {
          // 1. Se gravado explicitamente no realProfitData ou embarque
          if (s.realProfitData?.inssPatronal !== undefined && s.realProfitData.inssPatronal > 0) {
            return s.realProfitData.inssPatronal;
          }
          if ((s as any).inssPatronal !== undefined && Number((s as any).inssPatronal) > 0) {
            return Number((s as any).inssPatronal);
          }
          // 2. Informação calculada no campo "INSS Patronal / CPRB" via motor de despesas (opExp.inssPatronal)
          if (opExp.inssPatronal !== undefined && opExp.inssPatronal > 0) {
            return opExp.inssPatronal;
          }
          // 3. Fallback: 4% sobre (Frete Motorista - Pedágio) para PF / TAC; PJ = R$ 0
          const isShipmentPf = (s.driverFreightType === 'PF' || s.anttModality === 'TAC');
          if (!isShipmentPf) return 0;
          const tollVal = s.tollValue || 0;
          const baseInss = Math.max(0, freteMotorista - tollVal);
          return baseInss > 0 ? Number((baseInss * 0.04).toFixed(2)) : 0;
        })(),

        // 5. INSS / SEST SENAT = Desconto SEST/SENAT: (3.5.3 (-) Desconto SEST/SENAT da Carta Frete)
        inssSestSenat: (() => {
          const isShipmentPf = (s.driverFreightType === 'PF' || s.anttModality === 'TAC');
          if (!isShipmentPf && s.driverFreightType === 'PJ') return 0;

          // 1. Prioridade máxima: Leitura direta do campo "3.5.3 (-) Desconto SEST/SENAT" extraído da Carta Frete / Documentos
          const docSest = 
            (s.documents as any)?.calculoSaldoFrete?.sestSenat ??
            (s.documents as any)?.calculo_saldo_frete?.sestSenat ??
            (s.documents as any)?.detailed?.calculoSaldoFrete?.sestSenat ??
            (s.documents as any)?.carta_frete?.calculoSaldoFrete?.sestSenat ??
            (s.documents as any)?.sestSenatValue ??
            (s.documents as any)?.sest_senat ??
            (s.documents as any)?.sestSenat ??
            (s as any)?.sestSenatValue ??
            (s as any)?.sestSenat ??
            (s.realProfitData as any)?.sestSenat;

          if (docSest !== undefined && docSest !== null && Number(docSest) > 0) {
            return Number(docSest);
          }

          // 2. Se for PF e tiver frete motorista, calcula a dedução oficial da cláusula 3.5.3 (2,5% sobre a base fiscal do TAC)
          if (isShipmentPf && freteMotorista > 0) {
            const tacTaxes = calculateTacTaxDeductions(freteMotorista, s.tollValue || 0);
            if (tacTaxes.sestSenat > 0) {
              return tacTaxes.sestSenat;
            }
          }
          return 0;
        })(),
        valorTaxaCiot: (() => {
          const isShipmentPf = (s.driverFreightType === 'PF' || s.anttModality === 'TAC');
          // Valor salvo manualmente tem prioridade
          const savedCiotFee = (s as any).ciotFeeValue || 
            (s.documents as any)?.taxa_ciot || 
            (s.documents as any)?.ciotFeeValue || 
            (s.realProfitData as any)?.ciotFeeValue;
          if (savedCiotFee !== undefined && savedCiotFee !== null && Number(savedCiotFee) > 0) {
            return Number(savedCiotFee);
          }
          // Cálculo 0,20% × base CIOT — mesma lógica do panel
          const tollVal = s.tollValue || 0;
          const tacDeds = isShipmentPf ? calculateTacTaxDeductions(freteMotorista, tollVal) : null;
          const inssPf = tacDeds?.inss || 0;
          const sestSenatPf = tacDeds?.sestSenat || 0;
          const baseCiotFreight = isShipmentPf
            ? Math.max(0, freteMotorista - tollVal - inssPf - sestSenatPf)
            : Math.max(0, freteMotorista - tollVal);
          return baseCiotFreight > 0 ? Number((baseCiotFreight * 0.0020).toFixed(2)) : 0;
        })(),

        tarifaTonMotorista: tarifaMotorista,
        valorFreteMotorista: freteMotoristaConta,
        nfCliente: s.nfeNumber || (s.documents as any)?.nfe_number || (s.documents as any)?.numero_nfe || (s.documents as any)?.nfe || '-',
        valorNf: (s.nfeValue !== undefined && s.nfeValue > 0)
          ? s.nfeValue
          : ((s.realProfitData?.invoiceValue !== undefined && s.realProfitData.invoiceValue > 0)
              ? s.realProfitData.invoiceValue
              : ((s.documents as any)?.nfe_value !== undefined && (s.documents as any)?.nfe_value > 0
                  ? Number((s.documents as any).nfe_value)
                  : ((s.documents as any)?.valor_mercadoria !== undefined && (s.documents as any)?.valor_mercadoria > 0
                      ? Number((s.documents as any).valor_mercadoria)
                      : 0))),
        cte: (realCte && realCte !== '-') ? realCte : (s.cteNumber || s.id),
        controle: s.orderId || s.id,
        status: String(s.status).toUpperCase(),

        percentualAdiantamento: s.advancePercentage || 70,
        valorAdiantamento: s.advanceValue || 0,
        horaDataLiberacaoAdiantamento: getAdvanceLiberationDateTime(s),
        ticketDescarga: (getShipmentDischargeTicketUrl(s) || pesoChegada > 0) ? 'SIM' : 'NÃO',
        pesoChegada,
        saldo: calculatedSaldo,

        horaDataLiberacaoSaldo: getBalanceLiberationDateTime(s),
        tipoPagamentoSaldo: s.paymentMethod ? String(s.paymentMethod).toUpperCase() : 'PIX - E-FRETE',
        statusSaldo: s.status === ShipmentStatus.Finalizado ? 'PAGO' : 'PENDENTE',
        ciot: (() => {
          const ciotCode = getShipmentCiotNumber(s);
          if (ciotCode && ciotCode !== '-') return ciotCode;
          if (s.ciotNumber) return String(s.ciotNumber).trim();
          if (s.ciot && !String(s.ciot).startsWith('FEL-')) return String(s.ciot).trim();
          if ((s.documents as any)?.ciot_number) return String((s.documents as any).ciot_number).trim();
          if ((s.documents as any)?.ciot) return String((s.documents as any).ciot).trim();
          return '-';
        })(),
        totalQuebra: quebra,
        valorQuebraCiot: s.discountValue || 0,

        // Metadata para atalhos diretos aos documentos
        shipmentId: s.id,
        cteFileUrl: getShipmentCteFileUrl(s),
        ticketDescargaUrl: getShipmentDischargeTicketUrl(s),
        ordemCarregamentoUrl: getShipmentTmsOrderUrl(s),
      };
    });
  }, [shipmentsFiltered, cargoMap, clientMap, clientObjMap, userMap, users, clientPaymentMethodOverrides, productMap]);

  // Limites temporais calculados para filtro de período
  const dateRangeBounds = useMemo(() => {
    if (periodFilter === 'all') return { start: null, end: null };
    const now = new Date();

    if (periodFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return { start, end };
    }
    if (periodFilter === 'week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
      return { start: monday.getTime(), end: sunday.getTime() };
    }
    if (periodFilter === 'current_cycle') {
      // Ciclo Atual de Fechamento: do dia 25 do mês anterior até o fim do mês corrente
      const prevMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const start = new Date(prevMonthYear, prevMonth, 25, 0, 0, 0, 0).getTime();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return { start, end: lastDay };
    }
    if (periodFilter === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      return { start: firstDay, end: lastDay };
    }
    if (periodFilter === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
      const lastDay = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
      return { start: firstDay, end: lastDay };
    }
    if (periodFilter === 'custom') {
      let start: number | null = null;
      let end: number | null = null;
      if (customStartDate) {
        const parts = customStartDate.split('-');
        if (parts.length === 3) {
          start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0).getTime();
        }
      }
      if (customEndDate) {
        const parts = customEndDate.split('-');
        if (parts.length === 3) {
          end = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999).getTime();
        }
      }
      return { start, end };
    }
    return { start: null, end: null };
  }, [periodFilter, customStartDate, customEndDate]);

  // Avaliação temporal para contemplar emissão do CT-e e data de embarque
  const isRowInPeriod = useCallback((
    row: TranscunhaSpreadsheetRow, 
    bounds: { start: number | null; end: number | null }, 
    basis: 'smart' | 'emission' | 'boarding'
  ): boolean => {
    if (bounds.start === null && bounds.end === null) return true;

    const embarqueTime = row.dataEmbarque ? parseShipmentDate(row.dataEmbarque) : 0;
    const emissionTime = (row as any).dataHoraEmissao ? parseShipmentDate((row as any).dataHoraEmissao) : 0;

    const checkTime = (t: number) => {
      if (!t || t <= 0) return false;
      if (bounds.start !== null && t < bounds.start) return false;
      if (bounds.end !== null && t > bounds.end) return false;
      return true;
    };

    if (basis === 'boarding') {
      return embarqueTime > 0 ? checkTime(embarqueTime) : checkTime(emissionTime);
    }

    // Tanto no modo 'smart' quanto no modo 'emission':
    // O faturamento e o fechamento de embarques com CT-e emitido devem SEMPRE ser contabilizados
    // para o dia/período em que o CT-e foi emitido.
    // Apenas se ainda não houver CT-e emitido é que utiliza a data de embarque/agendamento.
    const hasCte = row.cteHoras && row.cteHoras !== '-' && row.cteHoras !== row.id;
    if (hasCte && emissionTime > 0) {
      return checkTime(emissionTime);
    }
    if (emissionTime > 0) {
      return checkTime(emissionTime);
    }

    return checkTime(embarqueTime);
  }, []);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Normalização de texto para busca
  const normalize = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  // Opções únicas de cada coluna calculadas a partir das linhas disponíveis (mappedRows)
  const columnUniqueOptions = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const col of SPREADSHEET_COLUMNS) {
      const set = new Set<string>();
      for (const row of mappedRows) {
        const val = (row as any)[col.key];
        if (val === null || val === undefined || val === '' || String(val).trim() === '-' || (typeof val === 'number' && val === 0)) {
          set.add('(Vazios)');
          continue;
        }

        if (col.type === 'currency' && typeof val === 'number') {
          if (val > 0) set.add(formatCurrency(val));
        } else if (col.type === 'percent' && typeof val === 'number') {
          if (val > 0) set.add(`${val}%`);
        } else if (col.type === 'number' && typeof val === 'number') {
          if (val > 0) set.add(val.toFixed(2));
        } else {
          const s = String(val).trim();
          if (s && s !== '-') set.add(s);
        }
      }
      map[col.key] = Array.from(set).sort((a, b) => {
        if (a === '(Vazios)') return 1;
        if (b === '(Vazios)') return -1;
        return a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });
      });
    }
    return map;
  }, [mappedRows]);

  // Filtragem
  const filteredRows = useMemo(() => {
    const term = normalize(searchTerm);

    let result = mappedRows.filter(row => {
      // 1. Busca Global
      if (term) {
        const matchesSearch = 
          normalize(row.cteHoras).includes(term) ||
          normalize((row as any).dataHoraEmissao).includes(term) ||
          normalize(row.cte).includes(term) ||
          normalize(row.ciot).includes(term) ||
          normalize(row.placa).includes(term) ||
          normalize(row.motorista).includes(term) ||
          normalize(row.cpfMotorista).includes(term) ||
          normalize(row.clienteTomadorPagador).includes(term) ||
          normalize(row.origem).includes(term) ||
          normalize(row.destino).includes(term) ||
          normalize(row.produto).includes(term) ||
          normalize(row.status).includes(term);

        if (!matchesSearch) return false;
      }

      // 2. Filtro de Período Temporal Inteligente
      if (dateRangeBounds.start !== null || dateRangeBounds.end !== null) {
        if (!isRowInPeriod(row, dateRangeBounds, dateFilterBasis)) return false;
      }

      // 3. Filtros Toolbar
      if (statusFilter !== 'all' && !normalize(row.status).includes(normalize(statusFilter))) return false;
      if (saldoFilter !== 'all' && normalize(row.statusSaldo) !== normalize(saldoFilter)) return false;

      // 4. Filtros Individuais de Coluna (Múltipla Seleção)
      for (const [colKey, selectedList] of Object.entries(columnFilters)) {
        if (!selectedList) continue;
        if (selectedList.length === 0) return false;

        const rawCell = (row as any)[colKey];
        const isEmptyCell = rawCell === null || rawCell === undefined || rawCell === '' || String(rawCell).trim() === '-' || (typeof rawCell === 'number' && rawCell === 0);

        const matchesAny = selectedList.some(filterItem => {
          if (!filterItem) return false;
          if (filterItem === '(Vazios)') {
            return isEmptyCell;
          }
          if (isEmptyCell) return false;

          const normFilter = normalize(filterItem);
          const normCell = normalize(rawCell);

          if (typeof rawCell === 'number') {
            const numRaw = String(rawCell).toLowerCase();
            const numPtBr = rawCell.toLocaleString('pt-BR');
            const currencyFmt = normalize(formatCurrency(rawCell));
            const percentFmt = `${rawCell}%`;
            return normCell === normFilter || normCell.includes(normFilter) ||
                   numRaw === normFilter || numPtBr === normFilter ||
                   currencyFmt === normFilter || percentFmt === normFilter;
          }

          if (colKey === 'saldoOriginalPedido') {
            const cleanFilter = normFilter.replace(/\./g, '').replace(/,/g, '.');
            const cleanCell = normCell.replace(/\./g, '').replace(/,/g, '.');
            return normCell.includes(normFilter) || cleanCell.includes(cleanFilter);
          }

          return normCell === normFilter || normCell.includes(normFilter);
        });

        if (!matchesAny) return false;
      }

      return true;
    });

    // Ordenação
    if (sortConfig) {
      result.sort((a, b) => {
        let valA = (a as any)[sortConfig.key];
        let valB = (b as any)[sortConfig.key];

        // Comparação numérica para números de CT-e
        if (sortConfig.key === 'cteHoras' || sortConfig.key === 'cte') {
          const numA = parseInt(String(valA || '').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(valB || '').replace(/\D/g, ''), 10) || 0;
          if (numA !== numB) {
            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
          }
        }

        if (sortConfig.key === 'dataEmbarque' || sortConfig.key === 'dataHoraEmissao') {
          valA = parseShipmentDate(valA);
          valB = parseShipmentDate(valB);
        } else if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = (valB || '').toLowerCase();
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [mappedRows, searchTerm, dateRangeBounds, dateFilterBasis, isRowInPeriod, statusFilter, saldoFilter, columnFilters, sortConfig]);

  // Contagem de embarques com CT-e dentro do filtro ativo do período
  const filteredWithCteCount = useMemo(() => {
    return filteredRows.filter(r => r.cte && r.cte !== '-' && r.cteHoras && r.cteHoras !== '-').length;
  }, [filteredRows]);

  // Totais e KPIs
  const totalFreteEmpresa = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.freteBrutoEmpresa || 0), 0), [filteredRows]);
  const totalFreteMotorista = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.valorFreteMotorista || 0), 0), [filteredRows]);
  const margemBruta = totalFreteEmpresa - totalFreteMotorista;
  const margemPercent = totalFreteEmpresa > 0 ? (margemBruta / totalFreteEmpresa) * 100 : 0;
  const totalTonnage = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.peso || 0), 0), [filteredRows]);
  const totalPedagio = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.pedagio || 0), 0), [filteredRows]);
  const totalIcms = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.icms || 0), 0), [filteredRows]);
  const totalDebitoPisCofins = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.debitoPisCofins || 0), 0), [filteredRows]);
  const totalCreditoPisCofins = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.creditoPisCofins || 0), 0), [filteredRows]);
  const totalPatronal = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.patronal4 || 0), 0), [filteredRows]);
  const totalInssSestSenat = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.inssSestSenat || 0), 0), [filteredRows]);
  const totalValorTaxaCiot = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.valorTaxaCiot || 0), 0), [filteredRows]);
  const totalValorNf = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.valorNf || 0), 0), [filteredRows]);
  const totalAdiantamentos = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.valorAdiantamento || 0), 0), [filteredRows]);
  const totalSaldos = useMemo(() => filteredRows.reduce((acc, r) => acc + (r.saldo || 0), 0), [filteredRows]);

  const activeColumnFiltersCount = useMemo(() => {
    let count = Object.values(columnFilters).filter(v => v !== undefined && v !== null && v.length > 0).length;
    if (periodFilter !== 'all') count += 1;
    if (statusFilter !== 'all') count += 1;
    if (saldoFilter !== 'all') count += 1;
    return count;
  }, [columnFilters, periodFilter, statusFilter, saldoFilter]);

  const handleClearAllFilters = () => {
    setColumnFilters({});
    setSortConfig({ key: 'cteHoras', direction: 'desc' });
    setPeriodFilter('week');
    setCustomStartDate('');
    setCustomEndDate('');
    setStatusFilter('all');
    setSaldoFilter('all');
    setSearchTerm('');
  };

  const handleSort = (key: keyof TranscunhaSpreadsheetRow) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return { key: 'cteHoras', direction: 'desc' };
      }
      return { key, direction: (key === 'dataEmbarque' || key === 'cteHoras' || key === 'cte') ? 'desc' : 'asc' };
    });
  };

  // Exportação XLSX
  const handleExportExcel = () => {
    setIsExporting(true);
    setNotification({
      type: 'info',
      message: `Exportando ${filteredRows.length} registros... Aguarde.`
    });

    setTimeout(() => {
      try {
        const headers = SPREADSHEET_COLUMNS.map(col => col.label.replace(' 🔄', ''));
        const rowsAoa = filteredRows.map(r => {
          return SPREADSHEET_COLUMNS.map(col => {
            const val = (r as any)[col.key];
            if (val === undefined || val === null) return '';
            return val;
          });
        });

        const aoaData = [headers, ...rowsAoa];
        const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Controladoria');

        const fileName = `CONTROLADORIA_EMBARQUES_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);

        setNotification({
          type: 'success',
          message: `Planilha exportada com sucesso (${filteredRows.length} registros)!`
        });
        setTimeout(() => setNotification(null), 4000);
      } catch (err) {
        console.error('Erro ao exportar:', err);
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  // Navegação por teclado na planilha (Setas, Tab, Home, End, PageUp, PageDown)
  const handleTableKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
      if (target.closest('thead') || target.closest('[data-period-popover="true"]')) return;
    }

    const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'PageUp', 'PageDown', 'Escape'];
    if (!navigationKeys.includes(e.key)) return;

    if (!selectedCell) {
      if (filteredRows.length > 0 && ['ArrowDown', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
        e.preventDefault();
        setSelectedCell({ rowIdx: 0, colIdx: 0 });
      }
      return;
    }

    e.preventDefault();
    setSelectedCell(prev => {
      if (!prev) return { rowIdx: 0, colIdx: 0 };
      let { rowIdx, colIdx } = prev;
      const maxRow = filteredRows.length - 1;
      const maxCol = SPREADSHEET_COLUMNS.length - 1;

      switch (e.key) {
        case 'ArrowUp':
          rowIdx = Math.max(0, rowIdx - 1);
          break;
        case 'ArrowDown':
          rowIdx = Math.min(maxRow, rowIdx + 1);
          break;
        case 'ArrowLeft':
          colIdx = Math.max(0, colIdx - 1);
          break;
        case 'ArrowRight':
          colIdx = Math.min(maxCol, colIdx + 1);
          break;
        case 'Tab':
          if (e.shiftKey) {
            if (colIdx > 0) colIdx -= 1;
            else if (rowIdx > 0) { rowIdx -= 1; colIdx = maxCol; }
          } else {
            if (colIdx < maxCol) colIdx += 1;
            else if (rowIdx < maxRow) { rowIdx += 1; colIdx = 0; }
          }
          break;
        case 'Home':
          colIdx = 0;
          break;
        case 'End':
          colIdx = maxCol;
          break;
        case 'PageUp':
          rowIdx = Math.max(0, rowIdx - 10);
          break;
        case 'PageDown':
          rowIdx = Math.min(maxRow, rowIdx + 10);
          break;
        case 'Escape':
          return null;
      }
      return { rowIdx, colIdx };
    });
  }, [selectedCell, filteredRows.length]);

  // Efeito para scrollIntoView automático da célula selecionada
  useEffect(() => {
    if (!selectedCell) return;
    const el = document.querySelector(`[data-cell-coord="${selectedCell.rowIdx}-${selectedCell.colIdx}"]`) as HTMLElement;
    if (el) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [selectedCell]);

  // Tabela renderizada
  const renderTable = () => {
    const isDark = isSheetDark;
    const borderCol = isDark ? 'border-slate-800' : 'border-black/35';

    return (
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-[#00a8e5] text-black'}`}>
        <div 
          ref={tableContainerRef}
          tabIndex={0}
          onKeyDown={handleTableKeyDown}
          className="flex-1 min-h-0 overflow-auto outline-none focus:ring-1 focus:ring-indigo-500/40"
        >
          <table className={`w-full text-left text-[11px] whitespace-nowrap border-collapse ${isDark ? 'text-slate-100' : 'text-black'}`}>
            <thead className="sticky top-0 z-30 shadow-md select-none">
              {/* Linha 1: Setores com Cores Harmoniosas e Alto Destaque (com colunas fixas alinhadas) */}
              <tr className="text-center font-black tracking-wider uppercase text-[11px] sm:text-xs">
                <th className={`sticky left-0 z-50 ${isDark ? 'bg-slate-950 text-white border-slate-700' : 'bg-[#002b52] text-white border-black/40'} py-2 px-1 border-r w-10 min-w-[40px] max-w-[40px] text-center text-xs font-black shadow-xs`}>#</th>
                <th className={`sticky left-[40px] z-50 ${isDark ? 'bg-slate-950 text-emerald-400 border-slate-700' : 'bg-[#002b52] text-emerald-300 border-black/40'} py-2 px-1 border-r w-[100px] min-w-[100px] max-w-[100px] text-center text-[10px] font-black shadow-xs`}>SISTEMA</th>
                <th className={`sticky left-[140px] z-50 ${isDark ? 'bg-slate-950 text-sky-400 border-slate-700' : 'bg-[#002b52] text-sky-200 border-r-2 border-black'} py-2 px-1 border-r-2 ${isDark ? 'border-indigo-500/80 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]' : 'border-black'} w-[75px] min-w-[75px] max-w-[75px] text-center text-[10px] font-black`}>CTE</th>
                <th colSpan={6} className={`${isDark ? 'bg-gradient-to-r from-sky-600 to-sky-500' : 'bg-[#0070c0]'} text-white py-2.5 px-3 border-r ${isDark ? 'border-white/20' : 'border-black/30'} shadow-xs drop-shadow-sm font-black`}>Faturamento & Recebimento Empresa</th>
                <th colSpan={6} className={`${isDark ? 'bg-gradient-to-r from-blue-700 to-blue-600' : 'bg-[#005a9e]'} text-white py-2.5 px-3 border-r ${isDark ? 'border-white/20' : 'border-black/30'} shadow-xs drop-shadow-sm font-black`}>Identificação & Motorista</th>
                <th colSpan={9} className={`${isDark ? 'bg-gradient-to-r from-cyan-700 to-cyan-600' : 'bg-[#006e82]'} text-white py-2.5 px-3 border-r ${isDark ? 'border-white/20' : 'border-black/30'} shadow-xs drop-shadow-sm font-black`}>Carga, Pedido & Logística</th>
                <th colSpan={6} className={`${isDark ? 'bg-gradient-to-r from-slate-700 to-slate-600' : 'bg-[#475569]'} text-white py-2.5 px-3 border-r ${isDark ? 'border-white/20' : 'border-black/30'} shadow-xs drop-shadow-sm font-black`}>Cadastros & Controles</th>
                <th colSpan={8} className={`${isDark ? 'bg-gradient-to-r from-amber-600 to-amber-500' : 'bg-[#b45309]'} text-white py-2.5 px-3 border-r ${isDark ? 'border-white/20' : 'border-black/30'} shadow-xs drop-shadow-sm font-black`}>Tomador, Rota & Pesagem</th>
                <th colSpan={7} className={`${isDark ? 'bg-gradient-to-r from-purple-700 to-purple-600' : 'bg-[#6b21a8]'} text-white py-2.5 px-3 border-r ${isDark ? 'border-white/20' : 'border-black/30'} shadow-xs drop-shadow-sm font-black`}>Impostos & Deduções</th>
                <th colSpan={5} className={`${isDark ? 'bg-gradient-to-r from-indigo-700 to-indigo-600' : 'bg-[#3730a3]'} text-white py-2.5 px-3 border-r ${isDark ? 'border-white/20' : 'border-black/30'} shadow-xs drop-shadow-sm font-black`}>Frete & Acerto Motorista</th>
                <th colSpan={6} className={`${isDark ? 'bg-gradient-to-r from-emerald-700 to-emerald-600' : 'bg-[#15803d]'} text-white py-2.5 px-3 border-r ${isDark ? 'border-white/20' : 'border-black/30'} shadow-xs drop-shadow-sm font-black`}>Adiantamentos & Saldo</th>
                <th colSpan={6} className={`${isDark ? 'bg-gradient-to-r from-rose-700 to-rose-600' : 'bg-[#9f1239]'} text-white py-2.5 px-3 shadow-xs drop-shadow-sm font-black`}>Fechamento, CIOT, Quebra & Valor Total</th>
              </tr>

              {/* Linha 2: Cabeçalhos das Colunas com Quebra em 2 Linhas e Altura Compacta */}
              <tr className={`${isDark ? 'bg-slate-900 text-white border-b-2 border-indigo-500/70' : 'bg-[#004b87] text-white border-b-2 border-black'} font-black uppercase text-[10px] sm:text-[11px] tracking-tight shadow-sm`}>
                <th className={`sticky left-0 z-40 ${isDark ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-[#00386b] text-white border-black/40'} px-1.5 py-2 border-r text-center font-black text-xs w-10 min-w-[40px] max-w-[40px]`}>#</th>
                {SPREADSHEET_COLUMNS.map(col => {
                  const isSorted = sortConfig?.key === col.key;
                  const isStickyId = col.key === 'idEmbarqueSistema';
                  const isStickyCte = col.key === 'cteHoras';
                  const stickyClass = isStickyId 
                    ? `sticky left-[40px] z-40 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-[#004b87] border-black/40 text-white'} w-[100px] min-w-[100px] max-w-[100px]` 
                    : isStickyCte 
                    ? `sticky left-[140px] z-40 ${isDark ? 'bg-slate-900 border-r-2 border-indigo-500/80 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]' : 'bg-[#004b87] text-yellow-300 border-r-2 border-black'} w-[75px] min-w-[75px] max-w-[75px]` 
                    : (col.width || 'min-w-[85px]');

                  return (
                    <th 
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`px-1.5 py-1.5 border-r ${isDark ? 'border-slate-800 hover:bg-indigo-950/70 hover:text-indigo-300' : 'border-black/30 hover:bg-[#00386b] text-white font-black'} cursor-pointer transition-all select-none whitespace-normal text-center align-middle ${stickyClass} ${
                        isSorted ? (isDark ? 'bg-indigo-900/40 text-indigo-300 ring-1 ring-inset ring-indigo-500/40' : 'bg-[#00386b] text-yellow-300 ring-1 ring-inset ring-yellow-400') : ''
                      }`}
                      title={col.tooltip || col.label}
                    >
                      <div className="flex items-center justify-center gap-1 text-center whitespace-normal leading-[1.15]">
                        <span className="break-words font-black tracking-tight">{col.label}</span>
                        {isSorted && (
                          <span className="text-amber-300 font-black text-xs shrink-0 drop-shadow-sm">
                            {sortConfig.direction === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* Linha Fixa de Totais na Parte Superior da Planilha */}
              <tr className={`${isDark ? 'bg-slate-950 text-white border-indigo-500/80' : 'bg-[#00264d] text-white border-b-2 border-black'} font-mono text-[11px] font-black border-b shadow-md select-none`}>
                <th className={`sticky left-0 z-40 ${isDark ? 'bg-slate-950 text-indigo-400 border-slate-800' : 'bg-[#001c38] text-amber-300 border-black/40'} px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider border-r w-10 min-w-[40px] max-w-[40px]`}>
                  ∑ TOTAIS
                </th>
                {SPREADSHEET_COLUMNS.map(col => {
                  let totalDisplay = '';
                  if (col.key === 'cteHoras') totalDisplay = `${filteredRows.length} VIAGENS`;
                  else if (col.key === 'pedagio') totalDisplay = formatCurrency(totalPedagio);
                  else if (col.key === 'peso') totalDisplay = `${totalTonnage.toFixed(2)} t`;
                  else if (col.key === 'freteBrutoEmpresa') totalDisplay = formatCurrency(totalFreteEmpresa);
                  else if (col.key === 'icms') totalDisplay = formatCurrency(totalIcms);
                  else if (col.key === 'debitoPisCofins') totalDisplay = formatCurrency(totalDebitoPisCofins);
                  else if (col.key === 'creditoPisCofins') totalDisplay = formatCurrency(totalCreditoPisCofins);
                  else if (col.key === 'patronal4') totalDisplay = formatCurrency(totalPatronal);
                  else if (col.key === 'inssSestSenat') totalDisplay = formatCurrency(totalInssSestSenat);
                  else if (col.key === 'valorTaxaCiot') totalDisplay = formatCurrency(totalValorTaxaCiot);
                  else if (col.key === 'valorFreteMotorista') totalDisplay = formatCurrency(totalFreteMotorista);
                  else if (col.key === 'valorNf') totalDisplay = formatCurrency(totalValorNf);
                  else if (col.key === 'valorAdiantamento') totalDisplay = formatCurrency(totalAdiantamentos);
                  else if (col.key === 'saldo') totalDisplay = formatCurrency(totalSaldos);

                  const isStickyId = col.key === 'idEmbarqueSistema';
                  const isStickyCte = col.key === 'cteHoras';
                  const stickyClass = isStickyId 
                    ? `sticky left-[40px] z-40 ${isDark ? 'bg-slate-950' : 'bg-[#00264d] text-amber-300 border-black/40'} w-[100px] min-w-[100px] max-w-[100px]` 
                    : isStickyCte 
                    ? `sticky left-[140px] z-40 ${isDark ? 'bg-slate-950 border-r-2 border-indigo-500/80 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]' : 'bg-[#00264d] text-yellow-300 border-r-2 border-black'} w-[75px] min-w-[75px] max-w-[75px]` 
                    : '';

                  return (
                    <th
                      key={`top-total-${col.key}`}
                      className={`px-2 py-2 border-r ${isDark ? 'border-slate-800' : 'border-black/30'} font-black ${stickyClass} ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      } ${totalDisplay ? (isDark ? 'bg-slate-900 text-amber-300 font-bold' : 'bg-[#001c38] text-amber-300 font-black') : (isDark ? 'text-slate-600' : 'text-slate-400')}`}
                    >
                      {totalDisplay || '-'}
                    </th>
                  );
                })}
              </tr>

              {/* Linha 3: Filtros por Coluna Refinados e Compactos */}
              {showFilterRow && (
                <tr className={`${isDark ? 'bg-slate-950 border-slate-800' : 'bg-[#005a9e] border-b border-black/40'} border-b`}>
                  <th className={`sticky left-0 z-40 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-[#004b87] border-black/40'} px-1 py-1 text-center border-r text-slate-400 w-10 min-w-[40px] max-w-[40px]`}>
                    <Filter className={`w-3.5 h-3.5 mx-auto ${isDark ? 'text-indigo-400' : 'text-yellow-300'}`} />
                  </th>
                  {SPREADSHEET_COLUMNS.map((col, colIdx) => {
                    const isStickyId = col.key === 'idEmbarqueSistema';
                    const isStickyCte = col.key === 'cteHoras';
                    const stickyClass = isStickyId 
                      ? `sticky left-[40px] z-40 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-[#005a9e] border-black/40'} w-[100px] min-w-[100px] max-w-[100px]` 
                      : isStickyCte 
                      ? `sticky left-[140px] z-40 ${isDark ? 'bg-slate-950 border-r-2 border-indigo-500/80' : 'bg-[#005a9e] border-r-2 border-black'} w-[75px] min-w-[75px] max-w-[75px]` 
                      : '';

                    const opts = columnUniqueOptions[col.key] || [];
                    const selectedList = columnFilters[col.key];
                    const isFiltered = selectedList !== undefined;
                    const isOpen = openFilterColumnKey === col.key;
                    const selectedCount = selectedList ? selectedList.length : opts.length;
                    const isAllSelected = !isFiltered || (opts.length > 0 && selectedCount === opts.length);

                    return (
                      <th key={`filter-${col.key}`} className={`px-1 py-1 border-r ${isDark ? 'border-slate-800' : 'border-black/30'} ${stickyClass}`}>
                        <div className="relative w-full">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenFilterColumnKey(prev => prev === col.key ? null : col.key);
                              setFilterSearchQuery('');
                            }}
                            className={`w-full flex items-center justify-between gap-1 px-1.5 py-0.5 text-[10px] rounded border outline-none font-bold transition-all shadow-xs cursor-pointer truncate ${
                              isDark 
                                ? (isFiltered ? 'border-indigo-400 bg-indigo-950 text-indigo-200 ring-1 ring-indigo-400' : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500') 
                                : (isFiltered ? 'border-blue-700 bg-yellow-200 text-black ring-1 ring-blue-700' : 'border-black/40 bg-white text-black font-bold hover:border-black/60')
                            }`}
                            title={isFiltered ? `Filtro ativo (${selectedCount} selecionados): ${selectedList.join(', ')}` : `Filtrar ${col.label} (${opts.length} opções)`}
                          >
                            <span className="truncate flex-1 text-center">
                              {!isFiltered
                                ? `(Todos${opts.length > 0 ? ` - ${opts.length}` : ''})`
                                : selectedList.length === 0
                                ? `(Nenhum)`
                                : selectedList.length === 1
                                ? selectedList[0]
                                : `(${selectedList.length} sel.)`
                              }
                            </span>
                            <span className="text-[8px] opacity-70 shrink-0">▼</span>
                          </button>

                          {/* Popover de Múltipla Seleção */}
                          {isOpen && (
                            <div
                              data-filter-popover="true"
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute top-full mt-1 z-50 min-w-[220px] max-w-[280px] w-max rounded-xl shadow-2xl border p-2.5 text-left font-sans ${
                                isDark 
                                  ? 'bg-slate-900 border-slate-700 text-white shadow-black/90' 
                                  : 'bg-white border-slate-300 text-slate-900 ring-1 ring-black/10 shadow-2xl'
                              } ${colIdx > 40 ? 'right-0' : 'left-0'}`}
                            >
                              {/* Topo do Popover */}
                              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 dark:border-slate-800 gap-2">
                                <div className="truncate">
                                  <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate" title={col.label}>
                                    {col.label}
                                  </p>
                                  <p className="text-[9px] text-slate-500 dark:text-slate-400">
                                    {isFiltered ? `${selectedList.length} de ${opts.length} selecionados` : `${opts.length} opções disponíveis`}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setOpenFilterColumnKey(null)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs leading-none"
                                  title="Fechar"
                                >
                                  ✕
                                </button>
                              </div>

                              {/* Campo de Busca Rápida */}
                              {opts.length > 5 && (
                                <div className="mb-2">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={filterSearchQuery}
                                    onChange={(e) => setFilterSearchQuery(e.target.value)}
                                    placeholder="Pesquisar opções..."
                                    className={`w-full px-2 py-1 text-xs rounded-lg border outline-none font-sans ${
                                      isDark 
                                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400 focus:border-indigo-500' 
                                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500'
                                    }`}
                                  />
                                </div>
                              )}

                              {/* Ações Rápidas: Marcar Tudo / Desmarcar Tudo */}
                              <div className="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setColumnFilters(prev => {
                                      const next = { ...prev };
                                      delete next[col.key];
                                      return next;
                                    });
                                  }}
                                  className="px-2 py-0.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-bold transition-colors cursor-pointer"
                                >
                                  Marcar Todos
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setColumnFilters(prev => ({
                                      ...prev,
                                      [col.key]: []
                                    }));
                                  }}
                                  className="px-2 py-0.5 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold transition-colors cursor-pointer"
                                >
                                  Desmarcar Todos
                                </button>
                              </div>

                              {/* Lista de Checkboxes */}
                              <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5 text-xs">
                                {/* Opção Geral: (Selecionar Tudo) */}
                                <label className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer font-bold text-slate-700 dark:text-slate-200">
                                  <input
                                    type="checkbox"
                                    checked={isAllSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setColumnFilters(prev => {
                                          const next = { ...prev };
                                          delete next[col.key];
                                          return next;
                                        });
                                      } else {
                                        setColumnFilters(prev => ({ ...prev, [col.key]: [] }));
                                      }
                                    }}
                                    className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                                  />
                                  <span className="truncate">(Selecionar Tudo)</span>
                                </label>

                                {(() => {
                                  const filteredOpts = filterSearchQuery.trim()
                                    ? opts.filter(o => normalize(o).includes(normalize(filterSearchQuery)))
                                    : opts;

                                  if (filteredOpts.length === 0) {
                                    return (
                                      <p className="text-[11px] text-slate-400 italic py-2 text-center">
                                        Nenhuma opção encontrada
                                      </p>
                                    );
                                  }

                                  return filteredOpts.map(opt => {
                                    const isChecked = !isFiltered ? true : selectedList.includes(opt);

                                    return (
                                      <label 
                                        key={opt}
                                        className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer text-slate-800 dark:text-slate-200"
                                        title={opt}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            setColumnFilters(prev => {
                                              const current = prev[col.key] !== undefined ? prev[col.key] : [...opts];
                                              let nextList: string[];
                                              if (checked) {
                                                nextList = Array.from(new Set([...current, opt]));
                                              } else {
                                                nextList = current.filter(item => item !== opt);
                                              }

                                              // Se marcou todos os itens existentes, remove a chave para não pesar
                                              if (nextList.length === opts.length) {
                                                const updated = { ...prev };
                                                delete updated[col.key];
                                                return updated;
                                              }

                                              return { ...prev, [col.key]: nextList };
                                            });
                                          }}
                                          className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer shrink-0"
                                        />
                                        <span className="truncate flex-1">{opt}</span>
                                      </label>
                                    );
                                  });
                                })()}
                              </div>

                              {/* Rodapé com Reset e Botão OK */}
                              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                                {isFiltered ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setColumnFilters(prev => {
                                        const next = { ...prev };
                                        delete next[col.key];
                                        return next;
                                      });
                                    }}
                                    className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline font-semibold cursor-pointer"
                                  >
                                    Limpar filtro
                                  </button>
                                ) : <span />}
                                <button
                                  type="button"
                                  onClick={() => setOpenFilterColumnKey(null)}
                                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                                >
                                  OK
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              )}
            </thead>

            <tbody className={`divide-y font-mono text-[11px] ${
              isDark ? 'divide-slate-800 bg-slate-900 text-slate-100' : 'divide-slate-200 bg-white text-slate-900'
            }`}>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={SPREADSHEET_COLUMNS.length + 1} className="px-4 py-16 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-amber-500 opacity-60" />
                      <span className={`font-semibold text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Nenhum embarque localizado com os filtros informados.
                      </span>
                      {activeColumnFiltersCount > 0 && (
                        <button
                          onClick={handleClearAllFilters}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 cursor-pointer mt-1"
                        >
                          Limpar Filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const rowBg = isDark
                    ? (idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/60')
                    : (idx % 2 === 0 ? 'bg-[#00a8e5]' : 'bg-[#009ee0]');

                  const rowBgSticky = isDark
                    ? (idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900')
                    : (idx % 2 === 0 ? 'bg-[#0096d8]' : 'bg-[#008dcf]');

                  const hoverBg = isDark ? 'hover:bg-indigo-950/40' : 'hover:bg-[#008ecb]/90';

                  return (
                    <tr 
                      key={row.id} 
                      className={`transition-colors ${hoverBg} ${rowBg}`}
                    >
                      <td className={`sticky left-0 z-20 ${rowBgSticky} px-2 py-1 text-center font-sans text-[10px] border-r ${borderCol} ${isDark ? 'text-slate-400' : 'text-black font-black'} w-10 min-w-[40px] max-w-[40px] select-none`}>
                        {idx + 1}
                      </td>
                    {SPREADSHEET_COLUMNS.map((col, colIndex) => {
                      const raw = (row as any)[col.key];
                      const isSelected = selectedCell?.rowIdx === idx && selectedCell?.colIdx === colIndex;
                      const isStickyId = col.key === 'idEmbarqueSistema';
                      const isStickyCte = col.key === 'cteHoras';

                      const cellFocusRing = isSelected
                        ? (isDark
                            ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-950/90 font-bold z-30'
                            : 'ring-2 ring-yellow-400 ring-inset bg-yellow-300 text-black font-black z-30 shadow-md')
                        : '';

                      const stickyClass = isStickyId
                        ? `sticky left-[40px] ${isSelected ? 'z-30' : 'z-20'} ${rowBgSticky} w-[100px] min-w-[100px] max-w-[100px]`
                        : isStickyCte
                        ? `sticky left-[140px] ${isSelected ? 'z-30' : 'z-20'} ${rowBgSticky} w-[75px] min-w-[75px] max-w-[75px] border-r-2 border-indigo-500/80 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]`
                        : '';

                      const cellCoord = `${idx}-${colIndex}`;
                      const handleCellClick = () => {
                        setSelectedCell({ rowIdx: idx, colIdx: colIndex });
                        tableContainerRef.current?.focus();
                      };

                      // Coluna Especial: ID EMBARQUE SISTEMA (Atalho rápido para Ordem de Carregamento)
                      if (col.key === 'idEmbarqueSistema') {
                        const idVal = String(raw || row.id || '-');
                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-center font-mono text-[11px] cursor-pointer select-none ${stickyClass} ${cellFocusRing}`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellClick();
                                if (row.ordemCarregamentoUrl) {
                                  openDocumentInNewTab(row.ordemCarregamentoUrl, `OC_TMS_${idVal}`);
                                } else {
                                  setNotification({
                                    type: 'info',
                                    message: `Nenhum arquivo de Ordem de Carregamento (OC TMS) anexado para o embarque #${idVal}.`
                                  });
                                }
                              }}
                              className={`inline-flex items-center justify-center gap-1 font-bold cursor-pointer transition-colors ${
                                row.ordemCarregamentoUrl
                                  ? (isDark ? 'text-emerald-400 hover:text-emerald-300 hover:underline' : 'text-emerald-950 font-black hover:underline bg-emerald-300/40 px-1 py-0.5 rounded border border-emerald-600/50')
                                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-black font-black hover:text-slate-800')
                              }`}
                              title={row.ordemCarregamentoUrl ? `Clique para abrir a Ordem de Carregamento TMS (#${idVal})` : `Embarque #${idVal} (sem OC TMS anexada)`}
                            >
                              <span>#{idVal}</span>
                              {row.ordemCarregamentoUrl && <ExternalLink className="w-2.5 h-2.5 opacity-70" />}
                            </button>
                          </td>
                        );
                      }

                      // Coluna Especial: CTE (link direto para abrir PDF do CT-e)
                      if (col.key === 'cteHoras') {
                        const cteVal = String(raw || '-');
                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 ${isDark ? 'border-r-2 border-indigo-500/80 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]' : 'border-r-2 border-black'} text-center font-bold font-mono text-[11px] cursor-pointer select-none ${stickyClass} ${cellFocusRing}`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellClick();
                                if (row.cteFileUrl) {
                                  openDocumentInNewTab(row.cteFileUrl, `CTE_${cteVal}`);
                                } else {
                                  setNotification({
                                    type: 'info',
                                    message: `Nenhum documento/PDF de CT-e anexado para o embarque ${cteVal}.`
                                  });
                                }
                              }}
                              className={`inline-flex items-center justify-center gap-1 font-bold cursor-pointer transition-colors ${
                                row.cteFileUrl
                                  ? (isDark ? 'text-sky-400 hover:text-sky-300 hover:underline' : 'text-blue-950 font-black hover:underline bg-white/70 px-1.5 py-0.5 rounded border border-blue-900/40 shadow-xs')
                                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-black font-black hover:text-slate-800')
                              }`}
                              title={row.cteFileUrl ? `Clique para abrir o PDF do CT-e ${cteVal}` : `CT-e: ${cteVal} (sem PDF anexado)`}
                            >
                              <span>{cteVal}</span>
                              {row.cteFileUrl && <ExternalLink className="w-2.5 h-2.5 opacity-70" />}
                            </button>
                          </td>
                        );
                      }

                      // Coluna Especial: DATA/HORA DE EMISSÃO
                      if (col.key === 'dataHoraEmissao') {
                        const dhVal = String(raw || '-');
                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-center font-mono text-[10px] ${isDark ? 'text-slate-300' : 'text-black font-bold'} whitespace-nowrap cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                          >
                            {dhVal}
                          </td>
                        );
                      }

                      // Coluna Especial: FORMA DE PAGAMENTO DO CLIENTE (Boleto, Pix, Transferência Bancária)
                      if (col.key === 'formaPagamento') {
                        const currentVal = String(raw || 'BOLETO').toUpperCase();
                        const isPix = currentVal === 'PIX';
                        const isTransf = currentVal.includes('TRANSF');
                        const isBoleto = !isPix && !isTransf;

                        const badgeColor = isDark
                          ? (isPix
                              ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                              : isTransf
                              ? 'border-sky-500/40 text-sky-400 bg-sky-500/10'
                              : 'border-amber-500/40 text-amber-400 bg-amber-500/10')
                          : (isPix
                              ? 'border-teal-700 text-white bg-teal-600 shadow-xs'
                              : isTransf
                              ? 'border-blue-800 text-white bg-blue-700 shadow-xs'
                              : 'border-emerald-700 text-white bg-emerald-600 shadow-xs');

                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-1.5 py-1 border-r ${borderCol} text-center cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                          >
                            <select
                              value={isPix ? 'PIX' : isTransf ? 'TRANSFERÊNCIA BANCÁRIA' : 'BOLETO'}
                              onChange={(e) => handlePaymentMethodChange(row.id, e.target.value)}
                              className={`text-[10px] font-black py-0.5 px-1 rounded-lg border outline-none cursor-pointer transition-all shadow-xs ${badgeColor} ${isDark ? 'bg-slate-900 text-slate-100' : (isPix ? 'bg-teal-600 text-white' : isTransf ? 'bg-blue-700 text-white' : 'bg-emerald-600 text-white')} w-full max-w-[105px] truncate`}
                            >
                              <option value="BOLETO" className={isDark ? "bg-slate-900 text-slate-100 font-bold" : "bg-emerald-700 text-white font-bold"}>Boleto</option>
                              <option value="PIX" className={isDark ? "bg-slate-900 text-slate-100 font-bold" : "bg-teal-700 text-white font-bold"}>Pix</option>
                              <option value="TRANSFERÊNCIA BANCÁRIA" className={isDark ? "bg-slate-900 text-slate-100 font-bold" : "bg-blue-800 text-white font-bold"}>Transf.</option>
                            </select>
                          </td>
                        );
                      }

                      // Coluna Especial: KM DISTÂNCIA (distância calculada entre cidade de origem e destino)
                      if (col.key === 'kmDistancia') {
                        const kmVal = String(raw || '-');
                        const rotaDireta = row.origem && row.destino && row.origem !== '-' && row.destino !== '-'
                          ? `${row.origem} → ${row.destino}`
                          : '';

                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-center cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                            title={`${rotaDireta ? rotaDireta + ' • ' : ''}${kmVal}`}
                          >
                            <div className="flex flex-col items-center justify-center leading-tight">
                              <span className={`font-black ${isDark ? 'text-amber-500' : 'text-black'} text-[11px] whitespace-nowrap`}>
                                {kmVal}
                              </span>
                              {rotaDireta && rotaDireta !== kmVal && (
                                <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-900 font-semibold'} font-medium truncate max-w-[170px]`} title={rotaDireta}>
                                  {rotaDireta}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // Coluna Especial: EIXO (quantidade de eixos do veículo)
                      if (col.key === 'eixo') {
                        const eixoVal = String(raw || '7 eixos');
                        const modelo = (row as any).modeloVeiculo || '';

                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-center cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                            title={modelo ? `${modelo} • ${eixoVal}` : eixoVal}
                          >
                            <div className="flex flex-col items-center justify-center leading-tight">
                              <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-black font-black'} text-[11px] whitespace-nowrap`}>
                                {eixoVal}
                              </span>
                              {modelo && (
                                <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-900 font-semibold'} font-medium truncate max-w-[95px]`} title={modelo}>
                                  {modelo}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // Coluna Especial: CIOT (Código CIOT da Carta Frete / ANTT)
                      if (col.key === 'ciot') {
                        const sOrig = shipments.find(s => s.id === row.id);
                        const ciotDocNumber = sOrig ? getShipmentCiotNumber(sOrig) : (typeof raw === 'string' && raw !== '-' ? raw : '-');
                        const finalCiot = (ciotDocNumber && ciotDocNumber !== '-') ? ciotDocNumber : (typeof raw === 'string' && raw !== '-' ? raw : '-');
                        const hasCiotCode = finalCiot && finalCiot !== '-';

                        const isShipmentPf = (sOrig?.driverFreightType === 'PF' || sOrig?.anttModality === 'TAC');
                        const freteMot = sOrig?.driverFreightValue || 0;
                        const tollV = sOrig?.tollValue || 0;
                        const tacDed = isShipmentPf ? calculateTacTaxDeductions(freteMot, tollV) : null;
                        const inssRet = tacDed?.inss || 0;
                        const sestRet = tacDed?.sestSenat || 0;
                        const baseFreightCiot = isShipmentPf ? Math.max(0, freteMot - tollV - inssRet - sestRet) : Math.max(0, freteMot - tollV);
                        const calculatedCiotFee = baseFreightCiot > 0 ? Number((baseFreightCiot * 0.0020).toFixed(2)) : 0;

                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-center font-mono cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                            title={hasCiotCode 
                              ? `Nº CIOT: ${finalCiot}${calculatedCiotFee > 0 ? ` • Taxa CIOT 0,20%: ${formatCurrency(calculatedCiotFee)}` : ''}` 
                              : (calculatedCiotFee > 0 ? `Taxa CIOT (0,20%): ${formatCurrency(calculatedCiotFee)}` : 'CIOT não informado')}
                          >
                            {hasCiotCode ? (
                              <span className={`font-mono font-bold ${isDark ? 'text-rose-300 bg-rose-950/40 border-rose-800/60' : 'text-rose-950 bg-rose-200 border-rose-400 font-black shadow-xs'} text-[11px] tracking-tight px-1.5 py-0.5 rounded border inline-block`}>
                                {finalCiot}
                              </span>
                            ) : (
                              <span className={isDark ? "text-slate-500" : "text-slate-900 font-bold"}>
                                -
                              </span>
                            )}
                          </td>
                        );
                      }

                      // Coluna Especial: SALDO PEDIDO (Saldo total em ton lançado na carga)
                      if (col.key === 'saldoOriginalPedido') {
                        const valNum = Number(raw);
                        const isNum = !isNaN(valNum) && valNum > 0;
                        const displayVal = isNum 
                          ? (valNum % 1 === 0 ? valNum.toLocaleString('pt-BR') : valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                          : String(raw || '-');

                        const sOrig = shipments.find(s => s.id === row.id);
                        const matchedCargo = sOrig?.cargoId ? cargoMap.get(sOrig.cargoId) : undefined;
                        const totalLancado = matchedCargo ? Number(matchedCargo.totalVolume ?? (matchedCargo as any).scheduledVolume ?? 0) : valNum;
                        const carregado = matchedCargo ? Number(matchedCargo.loadedVolume || 0) : 0;
                        const saldoRestante = Math.max(0, totalLancado - carregado);

                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-center font-mono text-[11px] cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                            title={isNum ? `Saldo Total Lançado: ${displayVal} ton | Carregado: ${carregado.toLocaleString('pt-BR')} ton | Saldo Restante: ${saldoRestante.toLocaleString('pt-BR')} ton` : 'Saldo do pedido'}
                          >
                            <span className={isNum ? (isDark ? 'font-bold text-cyan-400' : 'font-black text-black') : (isDark ? 'text-slate-500' : 'text-slate-900 font-bold')}>
                              {displayVal}
                            </span>
                          </td>
                        );
                      }

                      // Coluna Especial: NF CLIENTE (Número da Nota Fiscal)
                      if (col.key === 'nfCliente') {
                        const nfVal = String(raw || '-');
                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-center font-mono text-[11px] cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                            title={nfVal !== '-' ? `Nota Fiscal nº ${nfVal}` : 'Sem NF-e informada'}
                          >
                            <span className={nfVal !== '-' ? (isDark ? 'font-bold text-indigo-400' : 'font-black text-blue-950 bg-white/70 px-1 py-0.5 rounded border border-blue-900/40 shadow-xs') : (isDark ? 'text-slate-500' : 'text-slate-900 font-bold')}>
                              {nfVal}
                            </span>
                          </td>
                        );
                      }

                      // Coluna Especial: VALOR DA NF (Valor da NF-e / Carga da Mercadoria)
                      if (col.key === 'valorNf') {
                        const valNum = typeof raw === 'number' ? raw : (typeof raw === 'string' && raw.trim() !== '-' ? parseNumberPtBr(raw) : 0);
                        const displayVal = valNum > 0 ? formatCurrency(valNum) : '-';
                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-right font-mono cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                            title={valNum > 0 ? `Valor da NF: ${formatCurrency(valNum)}` : 'Sem NF-e informada'}
                          >
                            <span className={valNum > 0 ? `font-bold ${isDark ? 'text-slate-100' : 'text-black font-black'} text-[11px]` : (isDark ? 'text-slate-500' : 'text-slate-900 font-bold')}>
                              {displayVal}
                            </span>
                          </td>
                        );
                      }

                      // Coluna Especial: ENQUADRAMENTO ANTT (Regime Tributário do Embarque)
                      if (col.key === 'obsCavaloAntt') {
                        const regimeVal = String(raw || 'PJ').toUpperCase();
                        const isPf = regimeVal === 'PF' || regimeVal.includes('TAC');
                        const isSimples = regimeVal.includes('SIMPLES');
                        const isReal = regimeVal.includes('REAL');
                        const isPresumido = regimeVal.includes('PRESUMIDO');
                        const isMei = regimeVal === 'MEI';

                        const badgeColor = isDark
                          ? (isPf
                              ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10'
                              : isSimples
                              ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                              : isReal
                              ? 'border-purple-500/40 text-purple-400 bg-purple-500/10'
                              : isPresumido
                              ? 'border-sky-500/40 text-sky-400 bg-sky-500/10'
                              : isMei
                              ? 'border-teal-500/40 text-teal-400 bg-teal-500/10'
                              : 'border-slate-500/40 text-slate-300 bg-slate-500/10')
                          : (isPf
                              ? 'border-blue-600 text-blue-950 bg-blue-100 font-black shadow-xs'
                              : isSimples
                              ? 'border-emerald-600 text-emerald-950 bg-emerald-100 font-black shadow-xs'
                              : isReal
                              ? 'border-purple-600 text-purple-950 bg-purple-100 font-black shadow-xs'
                              : isPresumido
                              ? 'border-sky-600 text-sky-950 bg-sky-100 font-black shadow-xs'
                              : isMei
                              ? 'border-teal-600 text-teal-950 bg-teal-100 font-black shadow-xs'
                              : 'border-slate-500 text-slate-950 bg-slate-100 font-black shadow-xs');

                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-center cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                            title={`Enquadramento ANTT / Regime Tributário: ${regimeVal}`}
                          >
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${badgeColor}`}>
                              {regimeVal}
                            </span>
                          </td>
                        );
                      }

                      // Coluna Especial: CODG. ATUA (Código de Atualização Cadastral)
                      if (col.key === 'codigoAtua') {
                        const atuaVal = String(raw || '-');
                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-center font-mono text-[11px] cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                            title={atuaVal !== '-' ? `Código ATUA: ${atuaVal}` : 'Sem código ATUA informado'}
                          >
                            <span className={atuaVal !== '-' ? (isDark ? 'font-bold text-sky-400' : 'font-black text-black') : (isDark ? 'text-slate-500' : 'text-slate-900 font-bold')}>
                              {atuaVal}
                            </span>
                          </td>
                        );
                      }

                      // Coluna Especial: HORA/DATA LIBER. ADIANT (Data/Hora de Liberação do Adiantamento)
                      if (col.key === 'horaDataLiberacaoAdiantamento') {
                        const dhVal = String(raw || '-');
                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-center font-mono text-[10px] ${isDark ? 'text-slate-300' : 'text-black font-bold'} whitespace-nowrap cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                            title={dhVal !== '-' ? `Adiantamento liberado em: ${dhVal}` : 'Adiantamento pendente de liberação'}
                          >
                            <span className={dhVal !== '-' ? (isDark ? 'font-semibold text-emerald-400' : 'font-black text-emerald-950 bg-emerald-300/60 px-1 py-0.5 rounded border border-emerald-600/40 shadow-xs') : (isDark ? 'text-slate-500' : 'text-slate-900 font-bold')}>
                              {dhVal}
                            </span>
                          </td>
                        );
                      }

                      // Coluna Especial: HORA/DATA LIBER. SALDO (Data/Hora de Liberação do Saldo)
                      if (col.key === 'horaDataLiberacaoSaldo') {
                        const dhVal = String(raw || '-');
                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-center font-mono text-[10px] ${isDark ? 'text-slate-300' : 'text-black font-bold'} whitespace-nowrap cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                            title={dhVal !== '-' ? `Saldo liberado / finalizado em: ${dhVal}` : 'Saldo pendente de liberação'}
                          >
                            <span className={dhVal !== '-' ? (isDark ? 'font-semibold text-purple-400' : 'font-black text-purple-950 bg-purple-300/60 px-1 py-0.5 rounded border border-purple-600/40 shadow-xs') : (isDark ? 'text-slate-500' : 'text-slate-900 font-bold')}>
                              {dhVal}
                            </span>
                          </td>
                        );
                      }

                      // Coluna Especial: ORDEM DE CARREGAMENTO (link direto para abrir OC TMS)
                      if (col.key === 'ordemCarregamento') {
                        const ocVal = String(raw || '-');
                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-center font-mono text-[11px] cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellClick();
                                if (row.ordemCarregamentoUrl) {
                                  openDocumentInNewTab(row.ordemCarregamentoUrl, `OC_${ocVal}`);
                                } else {
                                  setNotification({
                                    type: 'info',
                                    message: `Nenhum arquivo de Ordem de Carregamento (OC TMS) anexado para o embarque ${row.cte || row.id}.`
                                  });
                                }
                              }}
                              className={`inline-flex items-center justify-center gap-1 font-bold cursor-pointer transition-colors ${
                                row.ordemCarregamentoUrl
                                  ? (isDark ? 'text-indigo-400 hover:text-indigo-300 hover:underline' : 'text-black font-black bg-white/70 hover:bg-white px-1.5 py-0.5 rounded border border-black/30 shadow-xs')
                                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-black font-black hover:text-slate-800')
                              }`}
                              title={row.ordemCarregamentoUrl ? `Clique para abrir a Ordem de Carregamento TMS (${ocVal})` : `${ocVal} (sem OC TMS anexada)`}
                            >
                              <span>{ocVal}</span>
                              {row.ordemCarregamentoUrl && <ExternalLink className="w-2.5 h-2.5 opacity-70" />}
                            </button>
                          </td>
                        );
                      }

                      // Coluna Especial: TICKET DE DESCARGA (link direto para abrir foto/comprovante de descarga)
                      if (col.key === 'ticketDescarga') {
                        const sOrig = shipments.find(s => s.id === row.id);
                        const ticketUrl = row.ticketDescargaUrl || (sOrig ? getShipmentDischargeTicketUrl(sOrig) : null);
                        const hasDoc = Boolean(ticketUrl);
                        const ticketVal = String(raw || 'NÃO').toUpperCase();
                        const isSim = ticketVal === 'SIM' || hasDoc;
                        
                        return (
                          <td 
                            key={col.key} 
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-1.5 py-1 border-r ${borderCol} text-center cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellClick();
                                if (ticketUrl) {
                                  const rawName = typeof ticketUrl === 'string' ? ticketUrl.split('/').pop()?.split('?')[0] : '';
                                  const cleanDocName = rawName ? decodeURIComponent(rawName) : `Comprovante_de_Descarga_${row.cte || row.id}`;
                                  openDocumentInNewTab(ticketUrl, cleanDocName);
                                } else {
                                  setNotification({
                                    type: 'info',
                                    message: `Nenhum comprovante de descarga anexado para o embarque ${row.cte || row.id}.`
                                  });
                                }
                              }}
                              className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                isSim 
                                  ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-xs' : 'bg-emerald-600 border-emerald-700 text-white font-black hover:bg-emerald-700 shadow-xs')
                                  : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-white/70 border-black/30 text-slate-900 font-bold hover:bg-white')
                              }`}
                              title={ticketUrl ? "Clique para abrir o Comprovante de Descarga anexado" : "Nenhum comprovante de descarga anexado"}
                            >
                              <span>{isSim ? 'SIM' : 'NÃO'}</span>
                              {hasDoc && <ExternalLink className="w-2.5 h-2.5 opacity-80" />}
                            </button>
                          </td>
                        );
                      }

                      // Coluna Especial: VL. CIOT (Taxa de 0,20% s/ Frete Líquido do motorista)
                      if (col.key === 'valorTaxaCiot') {
                        const feeVal = typeof raw === 'number' ? raw : 0;
                        return (
                          <td 
                            key={col.key}
                            data-cell-coord={cellCoord}
                            onClick={handleCellClick}
                            className={`px-2 py-1 border-r ${borderCol} text-right font-mono text-[11px] cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''}`}
                            title={feeVal > 0 ? `Taxa CIOT (0,20%): ${formatCurrency(feeVal)}` : 'Sem taxa CIOT calculada'}
                          >
                            <span className={feeVal > 0 ? (isDark ? 'font-bold text-purple-400' : 'font-black text-red-700') : (isDark ? 'text-slate-500' : 'text-slate-900 font-bold')}>
                              {feeVal > 0 ? formatCurrency(feeVal) : '-'}
                            </span>
                          </td>
                        );
                      }

                      let display = raw !== null && raw !== undefined ? String(raw) : '-';

                      if (col.type === 'currency' && typeof raw === 'number') {
                        display = raw > 0 ? formatCurrency(raw) : '-';
                      } else if (col.type === 'percent' && typeof raw === 'number') {
                        display = raw > 0 ? `${raw}%` : '-';
                      } else if (col.type === 'number' && typeof raw === 'number') {
                        display = raw > 0 ? raw.toFixed(2) : '-';
                      }

                      // Conteúdo formatado com base na paleta original do Excel em Modo Claro
                      let cellContent: React.ReactNode = display;

                      if (!isDark) {
                        const normStr = String(raw || '').toUpperCase().trim();
                        const isTranscunha = normStr.includes('TRANSCUNHA');
                        const isRafael = normStr.includes('AGENCIA') || normStr.includes('RAFAEL');
                        const isFilialSp = normStr.includes('FILIAL SP');

                        if (isTranscunha) {
                          cellContent = (
                            <span className="bg-[#005c00] text-yellow-300 font-black px-1.5 py-0.5 rounded inline-block shadow-xs border border-green-800">
                              {display}
                            </span>
                          );
                        } else if (isRafael) {
                          cellContent = (
                            <span className="bg-[#e2d308] text-black font-black px-1.5 py-0.5 rounded inline-block shadow-xs border border-yellow-600">
                              {display}
                            </span>
                          );
                        } else if (isFilialSp) {
                          cellContent = (
                            <span className="bg-[#ea580c] text-white font-black px-1.5 py-0.5 rounded inline-block shadow-xs border border-orange-700">
                              {display}
                            </span>
                          );
                        } else if (col.key === 'jaFaturado') {
                          cellContent = normStr === 'SIM' ? (
                            <span className="bg-[#ffff00] text-black font-black px-2 py-0.5 rounded border border-yellow-600 shadow-xs inline-block">
                              SIM
                            </span>
                          ) : (
                            <span className="text-red-700 font-black">NÃO</span>
                          );
                        } else if (col.key === 'statusRecebimento') {
                          cellContent = normStr === 'RECEBIDO' ? (
                            <span className="bg-[#d946ef] text-white font-black px-1.5 py-0.5 rounded shadow-xs inline-block">
                              RECEBIDO
                            </span>
                          ) : (
                            <span className="bg-[#f59e0b] text-black font-black px-1.5 py-0.5 rounded shadow-xs inline-block">
                              A RECEBER
                            </span>
                          );
                        } else if (col.key === 'matrizFilial') {
                          cellContent = normStr === 'MATRIZ' ? (
                            <span className="font-black italic underline text-black">MATRIZ</span>
                          ) : (
                            <span className="font-black italic underline text-blue-950">FILIAL</span>
                          );
                        } else if (col.key === 'cadastro' || col.key === 'liberacao') {
                          cellContent = normStr === 'LIBERADO' ? (
                            <span className="text-emerald-950 font-black italic underline bg-emerald-200/70 px-1.5 py-0.5 rounded border border-emerald-500/40 shadow-xs">
                              LIBERADO
                            </span>
                          ) : (
                            <span className="text-red-700 font-black">{display}</span>
                          );
                        } else if (['icms', 'debitoPisCofins', 'creditoPisCofins', 'patronal4', 'inssSestSenat', 'totalQuebra', 'valorQuebraCiot'].includes(col.key as string)) {
                          cellContent = (
                            <span className="text-red-700 font-black drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
                              {display}
                            </span>
                          );
                        } else if (col.key === 'freteBrutoEmpresa' || col.key === 'valorFreteMotorista') {
                          const numV = typeof raw === 'number' ? raw : 0;
                          cellContent = numV > 8000 ? (
                            <span className="text-yellow-300 font-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)] bg-slate-900/50 px-1.5 py-0.5 rounded inline-block">
                              {display}
                            </span>
                          ) : (
                            <span className="text-black font-black">{display}</span>
                          );
                        } else if (display.startsWith('-')) {
                          cellContent = <span className="text-red-700 font-black">{display}</span>;
                        } else {
                          cellContent = <span className="text-black font-bold">{display}</span>;
                        }
                      } else {
                        // Dark mode
                        cellContent = (
                          <span className={col.type === 'currency' ? 'text-amber-300 font-medium' : ''}>
                            {display}
                          </span>
                        );
                      }

                      return (
                        <td 
                          key={col.key}
                          data-cell-coord={cellCoord}
                          onClick={handleCellClick}
                          className={`px-2 py-1 border-r ${borderCol} cursor-pointer select-none ${cellFocusRing} ${isSelected ? 'relative z-10' : ''} ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé Informativo (Rolagem contínua sem quebra de página) */}
      <div className={`${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-[#002b52] border-t-2 border-black text-white'} px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none text-xs`}>
        <div className="flex items-center gap-2.5">
          <span className={isDark ? 'text-slate-400' : 'text-slate-100 font-bold'}>
            Mostrando todos os <span className={`font-black ${isDark ? 'text-white' : 'text-yellow-300'}`}>{filteredRows.length}</span> embarques
            {filteredRows.length !== mappedRows.length && (
              <span className={isDark ? 'text-slate-500 font-normal' : 'text-slate-300 font-normal'}> (de {mappedRows.length} no total)</span>
            )}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            isDark ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-white/20 border-white/40 text-white'
          }`}>
            {periodFilter === 'week' && '📆 Semana Atual'}
            {periodFilter === 'today' && '📅 Hoje'}
            {periodFilter === 'current_cycle' && '⚡ Ciclo de Fechamento'}
            {periodFilter === 'month' && '🗓️ Este Mês'}
            {periodFilter === 'year' && '📊 Este Ano'}
            {periodFilter === 'custom' && '⚙️ Personalizado'}
            {periodFilter === 'all' && '🌐 Todos os Embarques'}
          </span>
        </div>

        <div className={`text-[11px] font-medium flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-200'}`}>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Rolagem contínua • Sem quebra de página
        </div>
      </div>
    </div>
  );
  };

  return (
    <div className="space-y-3">
      {/* Toast de Notificação */}
      {notification && (
        <div className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-sm ${
          notification.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-200' 
            : notification.type === 'info'
            ? 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-200'
            : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 text-slate-500">✕</button>
        </div>
      )}

      {/* PAINEL SUPERIOR DA CONTROLADORIA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-3.5 space-y-3">
        {/* LINHA 1: TÍTULO & AÇÕES */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Controladoria & Planilha de Embarques
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                  {mappedRows.length} {onlyWithCte ? 'Embarques com CT-e' : 'Embarques Mapeados'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Integração nativa com 61 colunas sincronizadas em tempo real com as tabelas de embarques e fretes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* BOTÃO MODO CLARO / ESCURO INDEPENDENTE (MODO NORMAL) */}
            <button
              type="button"
              onClick={toggleSheetTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-xs ${
                isSheetDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 hover:border-amber-400/50 shadow-slate-900/30'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 hover:border-indigo-400'
              }`}
              title={isSheetDark ? "Alternar planilha para Modo Claro (Paleta Original do Excel)" : "Alternar planilha para Modo Escuro (Navy)"}
            >
              {isSheetDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
              <span>{isSheetDark ? "Modo Claro (Excel)" : "Modo Escuro (Navy)"}</span>
            </button>

            <button
              onClick={() => {
                setIsWindowOpen(true);
                setWindowMode('fullscreen');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Maximizar</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>{isExporting ? 'Exportando...' : 'Exportar Excel'}</span>
            </button>
          </div>
        </div>

        {/* LINHA 2: CARDS DE KPIS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-950/70 p-2 sm:p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
          <div className="px-2.5 py-1 border-r border-slate-200 dark:border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Frete Bruto Empresa</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">{formatCurrency(totalFreteEmpresa)}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">({filteredRows.length} viag. • {totalTonnage.toFixed(0)}t)</span>
            </div>
          </div>

          <div className="px-2.5 py-1 border-r border-slate-200 dark:border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Custo Motorista</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400">{formatCurrency(totalFreteMotorista)}</span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                ({totalFreteEmpresa > 0 ? ((totalFreteMotorista / totalFreteEmpresa) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>

          <div className="px-2.5 py-1 border-r border-slate-200 dark:border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Margem Retida</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(margemBruta)}</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">({margemPercent.toFixed(1)}%)</span>
            </div>
          </div>

          <div className="px-2.5 py-1">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Acertos Motoristas</span>
            <div className="flex items-center justify-between text-xs font-mono font-bold mt-0.5">
              <span className="text-blue-600 dark:text-blue-400" title="Adiantamentos">Ad: {formatCurrency(totalAdiantamentos)}</span>
              <span className="text-indigo-600 dark:text-indigo-400" title="Saldos">Sld: {formatCurrency(totalSaldos)}</span>
            </div>
          </div>
        </div>

        {/* LINHA 3: BARRA DE FILTROS & PERÍODOS */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar em todas as colunas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* FILTRO RÁPIDO: APENAS COM CT-E */}
            <button
              type="button"
              onClick={() => setOnlyWithCte(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                onlyWithCte
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/60 shadow-sm shadow-blue-500/25 ring-1 ring-blue-500/40'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-slate-400'
              }`}
              title={onlyWithCte ? 'Mostrando apenas embarques com CT-e emitido (clique para ver todos)' : 'Mostrando todos os embarques (clique para filtrar apenas com CT-e)'}
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Apenas com CT-e</span>
              <span 
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  onlyWithCte 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title={`${filteredWithCteCount} com CT-e no período/filtros atuais (${totalComCte} no total geral)`}
              >
                {filteredWithCteCount} / {totalComCte}
              </span>
            </button>

            <button
              onClick={() => setShowFilterRow(prev => !prev)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                showFilterRow
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{showFilterRow ? 'Filtros em Coluna' : 'Exibir Filtros'}</span>
            </button>

            {/* SELETOR DE PERÍODO & CALENDÁRIO COM INÍCIO E FIM (CUSTOM DROPDOWN ELEGANTE) */}
            <div className="relative" data-period-popover="true">
              <button
                type="button"
                onClick={() => setShowDatePickerPopup(prev => !prev)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  periodFilter !== 'all'
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-500/50'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-indigo-500 hover:text-indigo-400'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {periodFilter === 'all' && 'Período: Todos'}
                  {periodFilter === 'today' && 'Hoje (Dia)'}
                  {periodFilter === 'week' && 'Esta Semana'}
                  {periodFilter === 'month' && 'Este Mês'}
                  {periodFilter === 'current_cycle' && 'Ciclo Fechamento (25 a 31)'}
                  {periodFilter === 'year' && 'Este Ano'}
                  {periodFilter === 'custom' && (customStartDate || customEndDate ? `${customStartDate.split('-').reverse().join('/') || '...'} a ${customEndDate.split('-').reverse().join('/') || '...'}` : 'Personalizado')}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform text-slate-400 ${showDatePickerPopup ? 'rotate-180 text-indigo-400' : ''}`} />
              </button>

              {/* POPUP DE SELEÇÃO DE PERÍODOS E CALENDÁRIO COM CORES REFINADAS DE ALTO CONTRASTE */}
              {showDatePickerPopup && (
                <div className="absolute top-full left-0 mt-2 z-50 p-3.5 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] w-84 space-y-3 text-xs text-slate-100 ring-1 ring-white/10 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2 font-black text-indigo-400">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider">Filtro de Período</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowDatePickerPopup(false)} 
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Lista de Opções Pré-Definidas */}
                  <div className="space-y-1">
                    {[
                      { val: 'all' as const, label: 'Período: Todos', icon: '🌐' },
                      { val: 'today' as const, label: 'Hoje (Dia)', icon: '📅' },
                      { val: 'week' as const, label: 'Esta Semana', icon: '📆' },
                      { val: 'month' as const, label: 'Este Mês', icon: '🗓️' },
                      { val: 'current_cycle' as const, label: 'Ciclo Fechamento (Virada + Mês)', icon: '🔄' },
                      { val: 'year' as const, label: 'Este Ano', icon: '📊' },
                      { val: 'custom' as const, label: 'Personalizado (Início / Fim)', icon: '⚙️' },
                    ].map(opt => {
                      const isSelected = periodFilter === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => {
                            setPeriodFilter(opt.val);
                            if (opt.val !== 'custom') {
                              setShowDatePickerPopup(false);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{opt.icon}</span>
                            <span>{opt.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Base de Data para Filtragem */}
                  <div className="pt-2.5 border-t border-slate-800 space-y-1.5">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400 block">
                      Critério de Data
                    </span>
                    <div className="grid grid-cols-1 gap-1">
                      {[
                        { val: 'smart' as const, label: 'CT-e ou Embarque no Período (Recomendado)', desc: 'Inclui viagens com CT-e emitido ou agendadas no mês' },
                        { val: 'emission' as const, label: 'Apenas Emissão do CT-e', desc: 'Considera estritamente a data de emissão fiscal' },
                        { val: 'boarding' as const, label: 'Apenas Data de Embarque', desc: 'Considera a data agendada da viagem' },
                      ].map(crit => (
                        <button
                          key={crit.val}
                          type="button"
                          onClick={() => setDateFilterBasis(crit.val)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer border ${
                            dateFilterBasis === crit.val
                              ? 'bg-indigo-950/60 border-indigo-500/80 text-indigo-200 font-bold'
                              : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{crit.label}</span>
                            {dateFilterBasis === crit.val && <Check className="w-3 h-3 text-indigo-400" />}
                          </div>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{crit.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Faixa Personalizada (Início e Fim) */}
                  <div className={`pt-2.5 border-t border-slate-800 space-y-2.5 ${periodFilter === 'custom' ? 'block' : 'opacity-80'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
                        Faixa de Datas (Início e Fim)
                      </span>
                      {periodFilter !== 'custom' && (
                        <button
                          type="button"
                          onClick={() => setPeriodFilter('custom')}
                          className="text-[10px] text-indigo-400 hover:underline cursor-pointer font-bold"
                        >
                          Ativar
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium text-slate-400 block mb-1">Início:</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => { 
                            setCustomStartDate(e.target.value); 
                            setPeriodFilter('custom'); 
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-slate-400 block mb-1">Fim:</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => { 
                            setCustomEndDate(e.target.value); 
                            setPeriodFilter('custom'); 
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ações do Popover */}
                  <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button 
                      type="button" 
                      onClick={() => { 
                        setPeriodFilter('week'); 
                        setCustomStartDate(''); 
                        setCustomEndDate(''); 
                        setDateFilterBasis('smart');
                        setShowDatePickerPopup(false); 
                      }} 
                      className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Limpar
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowDatePickerPopup(false)} 
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none cursor-pointer focus:border-indigo-500 font-medium"
            >
              <option value="all" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Status: Todos (Ativos)</option>
              <option value="CARREGADO" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Carregado</option>
              <option value="Ag. Carregamento" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Ag. Carregamento</option>
              <option value="Em Viagem" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Em Viagem</option>
              <option value="Ag. Descarga" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Ag. Descarga</option>
              <option value="Finalizado" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Finalizado</option>
              <option value="Cancelado" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Cancelado</option>
            </select>

            <select
              value={saldoFilter}
              onChange={(e) => setSaldoFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none cursor-pointer focus:border-indigo-500 font-medium"
            >
              <option value="all" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Saldo: Todos</option>
              <option value="PAGO" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Pago</option>
              <option value="PENDENTE" className="bg-slate-900 text-slate-100 dark:bg-slate-900 dark:text-slate-100">Pendente</option>
            </select>

            {activeColumnFiltersCount > 0 && (
              <button
                onClick={handleClearAllFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500 text-rose-600 dark:text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar ({activeColumnFiltersCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ÁREA DA TABELA NO MODO NORMAL */}
      <div className={`h-[680px] flex flex-col rounded-2xl border shadow-sm overflow-hidden ${
        isSheetDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
      }`}>
        {renderTable()}
      </div>

      {/* MODAL MAXIMIZADO / FULLSCREEN (PORTAL) */}
      {isWindowOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-sm flex p-0">
          <div className={`w-screen h-screen flex flex-col overflow-hidden ${
            isSheetDark ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'
          }`}>
            <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-4 select-none shrink-0 ${
              isSheetDark 
                ? 'bg-slate-950 border-indigo-500/40 text-white' 
                : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-sm">Controladoria & Planilha de Embarques (Tela Cheia)</span>
                <span className={`text-xs ${isSheetDark ? 'text-slate-400' : 'text-slate-500'}`}>({filteredRows.length} embarques)</span>
                <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isSheetDark 
                    ? 'bg-slate-800 border-slate-700 text-slate-300' 
                    : 'bg-[#002b52] border-black/40 text-yellow-300'
                }`}>
                  {isSheetDark ? '🌙 Modo Escuro' : '📊 Paleta Excel'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* BOTÃO MODO CLARO / ESCURO INDEPENDENTE (TELA CHEIA) */}
                <button
                  type="button"
                  onClick={toggleSheetTheme}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-xs ${
                    isSheetDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 hover:border-amber-400/50'
                      : 'bg-[#002b52] hover:bg-[#001f3d] text-white border-black/50 hover:border-yellow-400'
                  }`}
                  title={isSheetDark ? "Alternar planilha para Modo Claro (Paleta Original do Excel)" : "Alternar planilha para Modo Escuro (Navy)"}
                >
                  {isSheetDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                  <span>{isSheetDark ? "Modo Claro (Excel)" : "Modo Escuro (Navy)"}</span>
                </button>

                <button
                  onClick={handleExportExcel}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar
                </button>
                <button
                  onClick={() => setIsWindowOpen(false)}
                  className="flex items-center gap-1 px-3 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Fechar
                </button>
              </div>
            </div>
            <div className={`flex-1 min-h-0 flex flex-col relative overflow-hidden ${
              isSheetDark ? 'bg-slate-900' : 'bg-[#00a8e5]'
            }`}>
              {renderTable()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
