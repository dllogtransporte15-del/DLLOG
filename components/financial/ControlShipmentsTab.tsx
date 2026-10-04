import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { Shipment, Cargo, Client, ShipmentStatus, User, Product } from '../../types';
import { getShipmentCte, getShipmentCteEmissionDate, hasCteAttached, getShipmentCiotNumber } from '../../utils';
import { calculateRoadDistanceKm } from '../../utils/distance';
import { calculateTacTaxDeductions } from '../../utils/freightCalculation';
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
  ExternalLink
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
  { key: 'idEmbarqueSistema', label: 'ID EMBARQUE SISTEMA', category: 'Embarques do Sistema', categoryColor: 'bg-emerald-600', type: 'text', width: 'min-w-[95px] max-w-[105px]', isSynchronized: true, align: 'center' },

  // 1. Faturamento & Recebimento Empresa
  { key: 'cteHoras', label: 'CTE', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'text', width: 'min-w-[65px] max-w-[75px]', align: 'center' },
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
  { key: 'icms', label: 'ICMS', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[75px] max-w-[85px]', align: 'right' },
  { key: 'debitoPisCofins', label: 'DÉBITO PIS/COFINS', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[85px] max-w-[95px]', align: 'right' },
  { key: 'creditoPisCofins', label: 'CRÉDITO PIS/COFINS', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[85px] max-w-[95px]', align: 'right' },
  { key: 'patronal4', label: 'PATRONAL 4%', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[80px] max-w-[90px]', align: 'right' },
  { key: 'inssSestSenat', label: 'INSS / SEST SENAT', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[85px] max-w-[95px]', align: 'right' },
  { key: 'valorTaxaCiot', label: 'VL. CIOT', category: 'Impostos & Deduções', categoryColor: 'bg-purple-700', type: 'currency', width: 'min-w-[80px] max-w-[90px]', align: 'right' },

  // 7. Frete & Acerto Motorista
  { key: 'tarifaTonMotorista', label: 'TARIFA TON MOTORISTA', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'currency', width: 'min-w-[90px] max-w-[100px]', align: 'right' },
  { key: 'valorFreteMotorista', label: 'VALOR FRETE MOTORISTA', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'currency', width: 'min-w-[95px] max-w-[105px]', align: 'right' },
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
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('week');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePickerPopup, setShowDatePickerPopup] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [saldoFilter, setSaldoFilter] = useState('all');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showFilterRow, setShowFilterRow] = useState<boolean>(true);
  const [onlyWithCte, setOnlyWithCte] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'full' | 'summary'>('full');

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

      const pesoChegada = s.unloadedTonnage || 0;
      const quebra = (peso > pesoChegada && pesoChegada > 0) ? Number((peso - pesoChegada).toFixed(3)) : 0;
      const calculatedSaldo = (s.netBalanceValue !== undefined && s.netBalanceValue !== null)
        ? s.netBalanceValue
        : ((s.balanceToReceiveValue !== undefined && s.balanceToReceiveValue !== null)
            ? s.balanceToReceiveValue
            : Math.max(0, freteMotorista - (s.tollValue || 0) - (s.advanceValue || 0) - (s.discountValue || 0)));

      const dateStr = s.scheduledDate ? formatDatePtBr(s.scheduledDate) : formatDatePtBr(s.createdAt);
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

        freteBrutoEmpresa: freteBruto,
        icms: s.realProfitData?.icmsDifference || 0,
        debitoPisCofins: s.realProfitData?.federalTax || 0,
        creditoPisCofins: s.realProfitData?.generatedCredit || 0,
        patronal4: s.realProfitData?.inssPatronal || 0,
        inssSestSenat: (() => {
          const isShipmentPf = (s.driverFreightType === 'PF' || s.anttModality === 'TAC');
          const savedSest = (s as any).sestSenatValue || 
            (s.realProfitData as any)?.sestSenat || 
            (s.documents as any)?.sest_senat || 
            (s.documents as any)?.sestSenat || 
            0;
          if (savedSest > 0) return Number(savedSest);
          if (isShipmentPf && freteMotorista > 0) {
            return calculateTacTaxDeductions(freteMotorista, s.tollValue || 0).sestSenat;
          }
          return 0;
        })(),
        valorTaxaCiot: (() => {
          const isShipmentPf = (s.driverFreightType === 'PF' || s.anttModality === 'TAC');
          const savedCiotFee = (s as any).ciotFeeValue || 
            (s.documents as any)?.taxa_ciot || 
            (s.documents as any)?.ciotFeeValue || 
            (s.realProfitData as any)?.ciotFeeValue;
          if (savedCiotFee !== undefined && savedCiotFee !== null && Number(savedCiotFee) > 0) {
            return Number(savedCiotFee);
          }
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
        valorFreteMotorista: freteMotorista,
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

  const getRowDateTimestamp = useCallback((row: TranscunhaSpreadsheetRow): number => {
    if (row.dataEmbarque) {
      const t = parseShipmentDate(row.dataEmbarque);
      if (t > 0) return t;
    }
    if ((row as any).dataHoraEmissao) {
      const t = parseShipmentDate((row as any).dataHoraEmissao);
      if (t > 0) return t;
    }
    return 0;
  }, []);

  // Normalização de texto para busca
  const normalize = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

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

      // 2. Filtro de Período Temporal
      if (dateRangeBounds.start !== null || dateRangeBounds.end !== null) {
        const rowTimestamp = getRowDateTimestamp(row);
        if (!rowTimestamp) return false;
        if (dateRangeBounds.start !== null && rowTimestamp < dateRangeBounds.start) return false;
        if (dateRangeBounds.end !== null && rowTimestamp > dateRangeBounds.end) return false;
      }

      // 3. Filtros Toolbar
      if (statusFilter !== 'all' && !normalize(row.status).includes(normalize(statusFilter))) return false;
      if (saldoFilter !== 'all' && normalize(row.statusSaldo) !== normalize(saldoFilter)) return false;

      // 4. Filtros Individuais de Coluna
      for (const [colKey, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal || filterVal.trim() === '') continue;
        const normFilter = normalize(filterVal);
        const rawCell = (row as any)[colKey];
        const normCell = normalize(rawCell);

        if (typeof rawCell === 'number') {
          const numRaw = String(rawCell).toLowerCase();
          const numPtBr = rawCell.toLocaleString('pt-BR');
          if (normCell.includes(normFilter) || numRaw.includes(normFilter) || numPtBr.includes(normFilter)) {
            continue;
          }
          return false;
        }

        if (colKey === 'saldoOriginalPedido') {
          const cleanFilter = normFilter.replace(/\./g, '').replace(/,/g, '.');
          const cleanCell = normCell.replace(/\./g, '').replace(/,/g, '.');
          if (normCell.includes(normFilter) || cleanCell.includes(cleanFilter)) {
            continue;
          }
          return false;
        }

        if (!normCell.includes(normFilter)) return false;
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
  }, [mappedRows, searchTerm, dateRangeBounds, statusFilter, saldoFilter, columnFilters, sortConfig, getRowDateTimestamp]);

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
    let count = Object.values(columnFilters).filter(v => Boolean(v && v.trim())).length;
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

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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

  // Tabela renderizada
  const renderTable = () => (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full bg-white dark:bg-slate-900">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left text-[11px] whitespace-nowrap border-collapse text-slate-800 dark:text-slate-100">
          <thead className="sticky top-0 z-30 shadow-md select-none">
            {/* Linha 1: Setores com Cores Harmoniosas e Alto Destaque */}
            <tr className="text-center font-black tracking-wider uppercase text-[11px] sm:text-xs">
              <th className="bg-slate-950 text-white py-2.5 px-3 border-r border-slate-700 w-12 text-center text-xs font-black shadow-xs">#</th>
              <th colSpan={7} className="bg-gradient-to-r from-sky-600 to-sky-500 text-white py-2.5 px-3 border-r border-white/20 shadow-xs drop-shadow-sm">Faturamento & Recebimento Empresa</th>
              <th colSpan={6} className="bg-gradient-to-r from-blue-700 to-blue-600 text-white py-2.5 px-3 border-r border-white/20 shadow-xs drop-shadow-sm">Identificação & Motorista</th>
              <th colSpan={9} className="bg-gradient-to-r from-cyan-700 to-cyan-600 text-white py-2.5 px-3 border-r border-white/20 shadow-xs drop-shadow-sm">Carga, Pedido & Logística</th>
              <th colSpan={6} className="bg-gradient-to-r from-slate-700 to-slate-600 text-white py-2.5 px-3 border-r border-white/20 shadow-xs drop-shadow-sm">Cadastros & Controles</th>
              <th colSpan={8} className="bg-gradient-to-r from-amber-600 to-amber-500 text-white py-2.5 px-3 border-r border-white/20 shadow-xs drop-shadow-sm">Tomador, Rota & Pesagem</th>
              <th colSpan={6} className="bg-gradient-to-r from-purple-700 to-purple-600 text-white py-2.5 px-3 border-r border-white/20 shadow-xs drop-shadow-sm">Impostos & Deduções</th>
              <th colSpan={5} className="bg-gradient-to-r from-indigo-700 to-indigo-600 text-white py-2.5 px-3 border-r border-white/20 shadow-xs drop-shadow-sm">Frete & Acerto Motorista</th>
              <th colSpan={6} className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white py-2.5 px-3 border-r border-white/20 shadow-xs drop-shadow-sm">Adiantamentos & Saldo</th>
              <th colSpan={6} className="bg-gradient-to-r from-rose-700 to-rose-600 text-white py-2.5 px-3 shadow-xs drop-shadow-sm">Fechamento, CIOT, Quebra & Valor Total</th>
            </tr>

            {/* Linha 2: Cabeçalhos das Colunas com Quebra em 2 Linhas e Altura Compacta */}
            <tr className="bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-white font-black uppercase text-[10px] sm:text-[11px] tracking-tight border-b-2 border-indigo-500/70 shadow-sm">
              <th className="px-1.5 py-2 border-r border-slate-300 dark:border-slate-800 text-center text-slate-600 dark:text-slate-300 font-black text-xs w-10 min-w-[40px]">#</th>
              {SPREADSHEET_COLUMNS.map(col => {
                const isSorted = sortConfig?.key === col.key;
                return (
                  <th 
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-1.5 py-1.5 border-r border-slate-300 dark:border-slate-800 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-950/70 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all select-none whitespace-normal text-center align-middle ${
                      col.width || 'min-w-[85px]'
                    } ${isSorted ? 'bg-indigo-500/15 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-500/40' : ''}`}
                    title={col.label}
                  >
                    <div className="flex items-center justify-center gap-1 text-center whitespace-normal leading-[1.15]">
                      <span className="break-words font-black tracking-tight">{col.label}</span>
                      {isSorted && (
                        <span className="text-amber-500 dark:text-amber-400 font-black text-xs shrink-0 drop-shadow-sm">
                          {sortConfig.direction === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>

            {/* Linha Fixa de Totais na Parte Superior da Planilha */}
            <tr className="bg-slate-950 text-white font-mono text-[11px] font-black border-b border-indigo-500/80 shadow-md select-none">
              <th className="px-2 py-2 text-center text-[10px] bg-slate-900 text-indigo-400 font-black uppercase tracking-wider border-r border-slate-800">
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

                return (
                  <th
                    key={`top-total-${col.key}`}
                    className={`px-2 py-2 border-r border-slate-800 font-black ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${totalDisplay ? 'bg-slate-900 text-amber-300 font-bold' : 'text-slate-600'}`}
                  >
                    {totalDisplay || '-'}
                  </th>
                );
              })}
            </tr>

            {/* Linha 3: Filtros por Coluna Refinados e Compactos */}
            {showFilterRow && (
              <tr className="bg-slate-100/90 dark:bg-slate-950 border-b border-slate-300 dark:border-slate-800">
                <th className="px-1 py-1 text-center border-r border-slate-300 dark:border-slate-800 text-slate-400">
                  <Filter className="w-3.5 h-3.5 mx-auto text-indigo-500 dark:text-indigo-400" />
                </th>
                {SPREADSHEET_COLUMNS.map(col => (
                  <th key={`filter-${col.key}`} className="px-1 py-1 border-r border-slate-300 dark:border-slate-800">
                    <input
                      type="text"
                      placeholder="Filtro..."
                      value={columnFilters[col.key] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setColumnFilters(prev => {
                          if (!val) {
                            const next = { ...prev };
                            delete next[col.key];
                            return next;
                          }
                          return { ...prev, [col.key]: val };
                        });
                      }}
                      className="w-full px-1 py-0.5 text-[10px] text-center rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 font-normal transition-all shadow-xs"
                    />
                  </th>
                ))}
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px] bg-white dark:bg-slate-900">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={SPREADSHEET_COLUMNS.length + 1} className="px-4 py-16 text-center text-slate-400 font-sans">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle className="w-8 h-8 text-amber-500 opacity-60" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
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
                return (
                  <tr 
                    key={row.id} 
                    className={`transition-colors hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 ${
                      idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-900/60'
                    }`}
                  >
                    <td className="px-2 py-1 text-center text-slate-400 font-sans text-[10px] bg-slate-50 dark:bg-slate-950/70 border-r border-slate-200 dark:border-slate-800">
                      {idx + 1}
                    </td>
                    {SPREADSHEET_COLUMNS.map(col => {
                      const raw = (row as any)[col.key];

                      // Coluna Especial: ID EMBARQUE SISTEMA (Atalho rápido para Ordem de Carregamento)
                      if (col.key === 'idEmbarqueSistema') {
                        const idVal = String(raw || row.id || '-');
                        return (
                          <td 
                            key={col.key}
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[11px]"
                          >
                            <button
                              type="button"
                              onClick={() => {
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
                                  ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center font-bold font-mono text-[11px]"
                          >
                            <button
                              type="button"
                              onClick={() => {
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
                                  ? 'text-sky-600 dark:text-sky-400 hover:text-sky-500 hover:underline'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[10px] text-slate-600 dark:text-slate-300 whitespace-nowrap"
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

                        const badgeColor = isPix
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                          : isTransf
                          ? 'border-sky-500/40 text-sky-400 bg-sky-500/10'
                          : 'border-amber-500/40 text-amber-400 bg-amber-500/10';

                        return (
                          <td 
                            key={col.key}
                            className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 text-center"
                          >
                            <select
                              value={isPix ? 'PIX' : isTransf ? 'TRANSFERÊNCIA BANCÁRIA' : 'BOLETO'}
                              onChange={(e) => handlePaymentMethodChange(row.id, e.target.value)}
                              className={`text-[10px] font-black py-0.5 px-1 rounded-lg border outline-none cursor-pointer transition-all shadow-xs ${badgeColor} bg-white dark:bg-slate-900 w-full max-w-[105px] truncate`}
                            >
                              <option value="BOLETO" className="bg-slate-900 text-slate-100 font-bold">Boleto</option>
                              <option value="PIX" className="bg-slate-900 text-slate-100 font-bold">Pix</option>
                              <option value="TRANSFERÊNCIA BANCÁRIA" className="bg-slate-900 text-slate-100 font-bold">Transf.</option>
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center"
                            title={`${rotaDireta ? rotaDireta + ' • ' : ''}${kmVal}`}
                          >
                            <div className="flex flex-col items-center justify-center leading-tight">
                              <span className="font-black text-amber-500 text-[11px] whitespace-nowrap">
                                {kmVal}
                              </span>
                              {rotaDireta && rotaDireta !== kmVal && (
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[170px]" title={rotaDireta}>
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center"
                            title={modelo ? `${modelo} • ${eixoVal}` : eixoVal}
                          >
                            <div className="flex flex-col items-center justify-center leading-tight">
                              <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px] whitespace-nowrap">
                                {eixoVal}
                              </span>
                              {modelo && (
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[95px]" title={modelo}>
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

                        // Taxa de emissão CIOT (0,20% s/ Frete Líquido do motorista)
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center font-mono"
                            title={hasCiotCode 
                              ? `Nº CIOT: ${finalCiot}${calculatedCiotFee > 0 ? ` • Taxa CIOT 0,20%: ${formatCurrency(calculatedCiotFee)}` : ''}` 
                              : (calculatedCiotFee > 0 ? `Taxa CIOT (0,20%): ${formatCurrency(calculatedCiotFee)}` : 'CIOT não informado')}
                          >
                            {hasCiotCode ? (
                              <span className="font-mono font-bold text-rose-700 dark:text-rose-300 text-[11px] tracking-tight bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800/60 inline-block">
                                {finalCiot}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[11px]"
                            title={isNum ? `Saldo Total Lançado: ${displayVal} ton | Carregado: ${carregado.toLocaleString('pt-BR')} ton | Saldo Restante: ${saldoRestante.toLocaleString('pt-BR')} ton` : 'Saldo do pedido'}
                          >
                            <span className={isNum ? 'font-bold text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500'}>
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[11px]"
                            title={nfVal !== '-' ? `Nota Fiscal nº ${nfVal}` : 'Sem NF-e informada'}
                          >
                            <span className={nfVal !== '-' ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}>
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-right font-mono"
                            title={valNum > 0 ? `Valor da NF: ${formatCurrency(valNum)}` : 'Sem NF-e informada'}
                          >
                            <span className={valNum > 0 ? 'font-bold text-slate-900 dark:text-slate-100 text-[11px]' : 'text-slate-400 dark:text-slate-500'}>
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

                        const badgeColor = isPf
                          ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10'
                          : isSimples
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                          : isReal
                          ? 'border-purple-500/40 text-purple-400 bg-purple-500/10'
                          : isPresumido
                          ? 'border-sky-500/40 text-sky-400 bg-sky-500/10'
                          : isMei
                          ? 'border-teal-500/40 text-teal-400 bg-teal-500/10'
                          : 'border-slate-500/40 text-slate-300 bg-slate-500/10';

                        return (
                          <td 
                            key={col.key}
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center"
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[11px]"
                            title={atuaVal !== '-' ? `Código ATUA: ${atuaVal}` : 'Sem código ATUA informado'}
                          >
                            <span className={atuaVal !== '-' ? 'font-bold text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}>
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[10px] text-slate-600 dark:text-slate-300 whitespace-nowrap"
                            title={dhVal !== '-' ? `Adiantamento liberado em: ${dhVal}` : 'Adiantamento pendente de liberação'}
                          >
                            <span className={dhVal !== '-' ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}>
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[10px] text-slate-600 dark:text-slate-300 whitespace-nowrap"
                            title={dhVal !== '-' ? `Saldo liberado / finalizado em: ${dhVal}` : 'Saldo pendente de liberação'}
                          >
                            <span className={dhVal !== '-' ? 'font-semibold text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}>
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[11px]"
                          >
                            <button
                              type="button"
                              onClick={() => {
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
                                  ? 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline'
                                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
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
                          <td key={col.key} className="px-1.5 py-1 border-r border-slate-200 dark:border-slate-800 text-center">
                            <button
                              type="button"
                              onClick={() => {
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
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-xs' 
                                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
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
                            className="px-2 py-1 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-[11px]"
                            title={feeVal > 0 ? `Taxa CIOT (0,20%): ${formatCurrency(feeVal)}` : 'Sem taxa CIOT calculada'}
                          >
                            <span className={feeVal > 0 ? 'font-bold text-purple-700 dark:text-purple-300' : 'text-slate-400 dark:text-slate-500'}>
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

                      return (
                        <td 
                          key={col.key}
                          className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {display}
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
      <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none text-xs">
        <div className="flex items-center gap-2.5">
          <span className="text-slate-500">
            Mostrando todos os <span className="font-bold text-slate-900 dark:text-white">{filteredRows.length}</span> embarques
            {filteredRows.length !== mappedRows.length && (
              <span className="text-slate-400 font-normal"> (de {mappedRows.length} no total)</span>
            )}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
            {periodFilter === 'week' && '📆 Semana Atual'}
            {periodFilter === 'today' && '📅 Hoje'}
            {periodFilter === 'month' && '🗓️ Este Mês'}
            {periodFilter === 'year' && '📊 Este Ano'}
            {periodFilter === 'custom' && '⚙️ Personalizado'}
            {periodFilter === 'all' && '🌐 Todos os Embarques'}
          </span>
        </div>

        <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Rolagem contínua • Sem quebra de página
        </div>
      </div>
    </div>
  );

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
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                onlyWithCte 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {totalComCte}
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
                  {periodFilter === 'year' && 'Este Ano'}
                  {periodFilter === 'custom' && (customStartDate || customEndDate ? `${customStartDate.split('-').reverse().join('/') || '...'} a ${customEndDate.split('-').reverse().join('/') || '...'}` : 'Personalizado')}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform text-slate-400 ${showDatePickerPopup ? 'rotate-180 text-indigo-400' : ''}`} />
              </button>

              {/* POPUP DE SELEÇÃO DE PERÍODOS E CALENDÁRIO COM CORES REFINADAS DE ALTO CONTRASTE */}
              {showDatePickerPopup && (
                <div className="absolute top-full left-0 mt-2 z-50 p-3.5 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] w-80 space-y-3 text-xs text-slate-100 ring-1 ring-white/10 animate-in fade-in zoom-in-95">
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
      <div className="h-[680px] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        {renderTable()}
      </div>

      {/* MODAL MAXIMIZADO / FULLSCREEN (PORTAL) */}
      {isWindowOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-sm flex p-0">
          <div className="w-screen h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-950 border-b border-indigo-500/40 flex items-center justify-between gap-4 select-none shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm">Controladoria & Planilha de Embarques (Tela Cheia)</span>
                <span className="text-xs text-slate-400">({filteredRows.length} embarques)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar
                </button>
                <button
                  onClick={() => setIsWindowOpen(false)}
                  className="flex items-center gap-1 px-3 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Fechar
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-white dark:bg-slate-900">
              {renderTable()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
