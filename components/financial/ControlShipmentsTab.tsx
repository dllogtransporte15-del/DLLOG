import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { Shipment, Cargo, Client, ShipmentStatus, User } from '../../types';
import type { ShipmentControlItem } from '../../utils/financialCalculations';
import { 
  TranscunhaSpreadsheetRow, 
  parseTranscunhaWorkbook, 
  SAMPLE_TRANSCUNHA_SHEET_ROWS,
  recalculateSpreadsheetRow,
  createNewEmptyRow,
  loadPersistedSpreadsheetRows,
  savePersistedSpreadsheetRows,
  clearPersistedSpreadsheetRows,
  parseNumberPtBr,
  parseShipmentDate,
  formatCteAndHours,
  STORAGE_KEY_SPREADSHEET_ROWS,
  STORAGE_KEY_SPREADSHEET_SHEETS,
  STORAGE_KEY_ACTIVE_SHEET
} from '../../utils/transcunhaSpreadsheetParser';
import {
  saveSpreadsheetRowsToIndexedDB,
  loadSpreadsheetRowsFromIndexedDB,
  saveSpreadsheetMetadata,
  loadSpreadsheetMetadata,
  clearSpreadsheetStorage
} from '../../utils/transcunhaSpreadsheetStorage';
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
  Link as LinkIcon,
  Filter,
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  RotateCw,
  Save,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  X,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Move,
  Loader2
} from 'lucide-react';

interface ExtendedSpreadsheetRow extends TranscunhaSpreadsheetRow {
  isSynced?: boolean;
}

interface ControlShipmentsTabProps {
  items: ShipmentControlItem[];
  shipments?: Shipment[];
  cargos?: Cargo[];
  clients?: Client[];
  currentUser?: User | null;
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

// Definição das 61 colunas oficiais agrupadas por setor (Primeira coluna: ID Embarque Sistema)
export const SPREADSHEET_COLUMNS: SpreadsheetColDef[] = [
  // 0. Embarques do Sistema (Primeira Coluna no Canto Esquerdo)
  { 
    key: 'idEmbarqueSistema', 
    label: 'ID EMBARQUE SISTEMA', 
    category: 'Embarques do Sistema', 
    categoryColor: 'bg-emerald-600', 
    type: 'text', 
    width: 'min-w-[150px]', 
    isSynchronized: true 
  },

  // 1. Faturamento & Recebimento Empresa (Sky)
  { key: 'cteHoras', label: 'CTE E HORAS', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'text', width: 'min-w-[175px]' },
  { key: 'jaFaturado', label: 'JÁ FATURADO', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'select', options: ['SIM', 'NÃO'], width: 'min-w-[100px]' },
  { key: 'dataVencimento', label: 'DATA VENCIM', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'text', width: 'min-w-[105px]' },
  { key: 'formaPagamento', label: 'FORMA DE PAGAMENTO', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'text', width: 'min-w-[140px]' },
  { key: 'dataPagamento', label: 'DATA DO PAGAMENTO', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'text', width: 'min-w-[115px]' },
  { key: 'statusRecebimento', label: 'A RECEBER OU RECEBIDO', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'select', options: ['A RECEBER', 'RECEBIDO'], width: 'min-w-[135px]' },

  // 2. Identificação & Motorista (Blue)
  { key: 'dataEmbarque', label: 'DATA DO EMBARQUE', category: 'Identificação & Motorista', categoryColor: 'bg-blue-700', type: 'text', width: 'min-w-[115px]' },
  { key: 'placa', label: 'PLACA', category: 'Identificação & Motorista', categoryColor: 'bg-blue-700', type: 'text', width: 'min-w-[95px]' },
  { key: 'obsCavaloAntt', label: 'PF/PJ OBS CAVALO ANTT', category: 'Identificação & Motorista', categoryColor: 'bg-blue-700', type: 'select', options: ['PJ-SN', 'PJ', 'PF'], width: 'min-w-[125px]' },
  { key: 'codigoAtua', label: 'CODIG ATUA', category: 'Identificação & Motorista', categoryColor: 'bg-blue-700', type: 'text', width: 'min-w-[95px]' },
  { key: 'motorista', label: 'MOTORISTA A CARREGAR', category: 'Identificação & Motorista', categoryColor: 'bg-blue-700', type: 'text', width: 'min-w-[170px]' },
  { key: 'cpfMotorista', label: 'CPF MOTORISTA 🔄', category: 'Identificação & Motorista', categoryColor: 'bg-blue-700', type: 'text', isSynchronized: true, width: 'min-w-[135px]' },

  // 3. Carga, Pedido & Logística (Cyan)
  { key: 'proprietario', label: 'PROPRIETÁRIO VEÍCULO', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[170px]' },
  { key: 'anttContratoPix', label: 'ANTT / PIX 🔄', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', isSynchronized: true, width: 'min-w-[160px]' },
  { key: 'telefone', label: 'TELEFONE 🔄', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', isSynchronized: true, width: 'min-w-[125px]' },
  { key: 'solicitante', label: 'SOLICITANTE', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[145px]' },
  { key: 'carregarEmpresa', label: 'CARREGAR EMPRESA', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[155px]' },
  { key: 'numeroPedido', label: 'Nº PEDIDO', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[105px]' },
  { key: 'saldoOriginalPedido', label: 'SALDO PEDIDO', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[115px]' },
  { key: 'produto', label: 'PRODUTO', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[135px]' },
  { key: 'tipoCarga', label: 'TIPO', category: 'Carga, Pedido & Logística', categoryColor: 'bg-cyan-700', type: 'text', width: 'min-w-[95px]' },

  // 4. Cadastros & Controles (Slate)
  { key: 'transportadora', label: 'TRANSPORTADORA', category: 'Cadastros & Controles', categoryColor: 'bg-slate-700', type: 'text', width: 'min-w-[135px]' },
  { key: 'cadastro', label: 'CADASTRO', category: 'Cadastros & Controles', categoryColor: 'bg-slate-700', type: 'select', options: ['LIBERADO', 'BLOQUEADO', 'PENDENTE'], width: 'min-w-[105px]' },
  { key: 'matrizFilial', label: 'MATRIZ FILIAL', category: 'Cadastros & Controles', categoryColor: 'bg-slate-700', type: 'select', options: ['MATRIZ', 'FILIAL'], width: 'min-w-[105px]' },
  { key: 'liberacao', label: 'LIBERAÇÃO', category: 'Cadastros & Controles', categoryColor: 'bg-slate-700', type: 'text', width: 'min-w-[105px]' },
  { key: 'gr', label: 'GR', category: 'Cadastros & Controles', categoryColor: 'bg-slate-700', type: 'text', width: 'min-w-[105px]' },
  { key: 'ordemCarregamento', label: 'ORDEM DE CARREG', category: 'Cadastros & Controles', categoryColor: 'bg-slate-700', type: 'text', width: 'min-w-[125px]' },

  // 5. Tomador, Rota & Pesagem (Amber)
  { key: 'clienteTomadorPagador', label: 'CLIENTE TOMADOR PAGADOR', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'text', width: 'min-w-[185px]' },
  { key: 'freteEmpresaUnitario', label: 'FRETE EMPRESA', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'currency', width: 'min-w-[115px]', align: 'right' },
  { key: 'origem', label: 'ORIGEM', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'text', width: 'min-w-[125px]' },
  { key: 'kmDistancia', label: 'KM DISTÂNCIA', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'text', width: 'min-w-[105px]' },
  { key: 'destino', label: 'DESTINO', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'text', width: 'min-w-[125px]' },
  { key: 'eixo', label: 'EIXO', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'text', width: 'min-w-[85px]' },
  { key: 'pedagio', label: 'PEDÁGIO', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'currency', width: 'min-w-[105px]', align: 'right' },
  { key: 'peso', label: 'PESO (TON)', category: 'Tomador, Rota & Pesagem', categoryColor: 'bg-amber-600', type: 'number', width: 'min-w-[105px]', align: 'right' },

  // 6. Impostos & Custos (Purple)
  { key: 'freteBrutoEmpresa', label: 'FRETE BRUTO', category: 'Impostos & Custos', categoryColor: 'bg-purple-700', type: 'currency', isCalculated: true, width: 'min-w-[125px]', align: 'right' },
  { key: 'icms', label: 'ICMS 🔄', category: 'Impostos & Custos', categoryColor: 'bg-purple-700', type: 'currency', isSynchronized: true, width: 'min-w-[110px]', align: 'right' },
  { key: 'debitoPisCofins', label: 'DÉBITO PIS/COFINS 🔄', category: 'Impostos & Custos', categoryColor: 'bg-purple-700', type: 'currency', isSynchronized: true, width: 'min-w-[125px]', align: 'right' },
  { key: 'creditoPisCofins', label: 'CRÉDITO PIS/COFINS 🔄', category: 'Impostos & Custos', categoryColor: 'bg-purple-700', type: 'currency', isSynchronized: true, width: 'min-w-[125px]', align: 'right' },
  { key: 'patronal4', label: 'PATRONAL 4% 🔄', category: 'Impostos & Custos', categoryColor: 'bg-purple-700', type: 'currency', isSynchronized: true, width: 'min-w-[115px]', align: 'right' },
  { key: 'inssSestSenat', label: 'INSS SEST/SENAT 🔄', category: 'Impostos & Custos', categoryColor: 'bg-purple-700', type: 'currency', isSynchronized: true, width: 'min-w-[115px]', align: 'right' },

  // 7. Frete & Acerto Motorista (Indigo)
  { key: 'tarifaTonMotorista', label: 'TON MOT', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'currency', width: 'min-w-[105px]', align: 'right' },
  { key: 'valorFreteMotorista', label: 'VL PG MOT', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'currency', isCalculated: true, width: 'min-w-[125px]', align: 'right' },
  { key: 'nfCliente', label: 'NF CLIENTE 🔄', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'text', isSynchronized: true, width: 'min-w-[115px]' },
  { key: 'valorNf', label: 'VALOR NF', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'currency', width: 'min-w-[115px]', align: 'right' },
  { key: 'cte', label: 'CTE', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'text', width: 'min-w-[95px]' },
  { key: 'controle', label: 'CONTROLE', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'text', width: 'min-w-[95px]' },
  { key: 'status', label: 'STATUS', category: 'Frete & Acerto Motorista', categoryColor: 'bg-indigo-700', type: 'select', options: ['CARREGADO', 'Ag. Carregamento', 'Em Viagem', 'Ag. Descarga', 'Finalizado', 'Cancelado'], width: 'min-w-[125px]' },

  // 8. Adiantamentos & Saldo (Emerald)
  { key: 'percentualAdiantamento', label: '% ADIANT', category: 'Adiantamentos & Saldo', categoryColor: 'bg-emerald-700', type: 'percent', width: 'min-w-[90px]', align: 'right' },
  { key: 'valorAdiantamento', label: 'ADIANTAMENTO', category: 'Adiantamentos & Saldo', categoryColor: 'bg-emerald-700', type: 'currency', isCalculated: true, width: 'min-w-[125px]', align: 'right' },
  { key: 'horaDataLiberacaoAdiantamento', label: 'HORA-DATA LIBER ADIANT 🔄', category: 'Adiantamentos & Saldo', categoryColor: 'bg-emerald-700', type: 'text', isSynchronized: true, width: 'min-w-[155px]' },
  { key: 'ticketDescarga', label: 'TIKIT DESCARGA', category: 'Adiantamentos & Saldo', categoryColor: 'bg-emerald-700', type: 'select', options: ['SIM', 'NÃO'], width: 'min-w-[105px]' },
  { key: 'pesoChegada', label: 'PESO CHEGADA', category: 'Adiantamentos & Saldo', categoryColor: 'bg-emerald-700', type: 'number', width: 'min-w-[115px]', align: 'right' },
  { key: 'saldo', label: 'SALDO', category: 'Adiantamentos & Saldo', categoryColor: 'bg-emerald-700', type: 'currency', isCalculated: true, width: 'min-w-[125px]', align: 'right' },

  // 9. Fechamento, CIOT, Quebra (Ton) & Valor Total (Rose)
  { key: 'horaDataLiberacaoSaldo', label: 'HORA-DATA LIBER SALD 🔄', category: 'Fechamento, CIOT, Quebra & Valor Total', categoryColor: 'bg-rose-700', type: 'text', isSynchronized: true, width: 'min-w-[155px]' },
  { key: 'tipoPagamentoSaldo', label: 'TIPO DE PAGAMENTO', category: 'Fechamento, CIOT, Quebra & Valor Total', categoryColor: 'bg-rose-700', type: 'text', width: 'min-w-[135px]' },
  { key: 'statusSaldo', label: 'STATUS DO SALDO', category: 'Fechamento, CIOT, Quebra & Valor Total', categoryColor: 'bg-rose-700', type: 'select', options: ['PENDENTE', 'PAGO'], width: 'min-w-[115px]' },
  { key: 'ciot', label: 'CIOT', category: 'Fechamento, CIOT, Quebra & Valor Total', categoryColor: 'bg-rose-700', type: 'text', width: 'min-w-[115px]' },
  { key: 'totalQuebra', label: 'QUEBRA (TON) 🔄', category: 'Fechamento, CIOT, Quebra & Valor Total', categoryColor: 'bg-rose-700', type: 'number', isSynchronized: true, isCalculated: true, width: 'min-w-[115px]', align: 'right' },
  { key: 'valorQuebraCiot', label: 'VALOR TOTAL 🔄', category: 'Fechamento, CIOT, Quebra & Valor Total', categoryColor: 'bg-rose-700', type: 'currency', isSynchronized: true, width: 'min-w-[115px]', align: 'right' },
];

/**
 * Componente de Input com Debounce para digitação rápida sem congelamentos nem perda de estado
 */
const DebouncedFilterInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  hasFilter?: boolean;
  onClear: () => void;
}> = ({ value, onChange, hasFilter, onClear }) => {
  const [localVal, setLocalVal] = useState<string>(value || '');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sincroniza quando o valor mudar externamente (ex: clique no popup de valores frequentes ou limpar)
  useEffect(() => {
    setLocalVal(value || '');
  }, [value]);

  // Limpa timer se componente desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setLocalVal(nextVal);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(nextVal);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (timerRef.current) clearTimeout(timerRef.current);
      onChange(localVal);
    } else if (e.key === 'Escape') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setLocalVal('');
      onClear();
    }
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timerRef.current) clearTimeout(timerRef.current);
    setLocalVal('');
    onClear();
  };

  return (
    <div className="relative w-full" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        placeholder="Filtro..."
        value={localVal}
        onClick={(e) => e.stopPropagation()}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`w-full pl-1.5 pr-4 py-0.5 text-[10px] rounded border outline-none font-normal transition-all ${
          hasFilter
            ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 font-bold focus:ring-1 focus:ring-amber-500'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500'
        }`}
      />
      {hasFilter && (
        <button
          type="button"
          onClick={handleClearClick}
          title="Limpar filtro"
          className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 text-[10px] font-bold cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export const ControlShipmentsTab: React.FC<ControlShipmentsTabProps> = ({ 
  items, 
  shipments = [], 
  cargos = [], 
  clients = [],
  currentUser
}) => {
  // Inicialização com persistência permanente no LocalStorage
  const [spreadsheetRows, setSpreadsheetRows] = useState<TranscunhaSpreadsheetRow[]>(() => {
    return loadPersistedSpreadsheetRows() || SAMPLE_TRANSCUNHA_SHEET_ROWS;
  });

  const [dataSource, setDataSource] = useState<'onedrive' | 'system'>('onedrive');

  // CONTROLE DE JANELA SOBREPOSTA (PORTAL), MAXIMIZAÇÃO, MOVIMENTAÇÃO E REDIMENSIONAMENTO
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
  
  const [activeSheetName, setActiveSheetName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_ACTIVE_SHEET) || 'TESTE DAVI';
    }
    return 'TESTE DAVI';
  });

  const [availableSheets, setAvailableSheets] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_SPREADSHEET_SHEETS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // fallback
      }
    }
    return [
      'TESTE DAVI', 
      'Planilha Carregamento Geral', 
      'ACERTO PESSOAL GRAO DE OURO', 
      'MONTAR TESTE OTAVIO',
      'MULTAS ANTT'
    ];
  });

  const [rawWorkbookBuffer, setRawWorkbookBuffer] = useState<ArrayBuffer | null>(null);

  // Pilha de histórico de alterações (Undo / Redo)
  const [undoStack, setUndoStack] = useState<TranscunhaSpreadsheetRow[][]>([]);
  const [redoStack, setRedoStack] = useState<TranscunhaSpreadsheetRow[][]>([]);

  // Estado de célula ativa e edição inline estilo Excel
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; colKey: keyof TranscunhaSpreadsheetRow } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: keyof TranscunhaSpreadsheetRow } | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState<string>('');
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(true);

  // Classificador de Ordem Padrão: Último embarque emitido sempre o primeiro (dataEmbarque decrescente)
  const [sortConfig, setSortConfig] = useState<{ key: keyof TranscunhaSpreadsheetRow; direction: 'asc' | 'desc' } | null>({
    key: 'dataEmbarque',
    direction: 'desc'
  });
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [activeFilterPopup, setActiveFilterPopup] = useState<keyof TranscunhaSpreadsheetRow | null>(null);
  const [showFilterRow, setShowFilterRow] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Carregamento resiliente permanente via IndexedDB (sem limitação de quota do LocalStorage)
  useEffect(() => {
    let isMounted = true;
    loadSpreadsheetRowsFromIndexedDB().then(savedRows => {
      if (isMounted) {
        if (savedRows && savedRows.length > 0) {
          setSpreadsheetRows(savedRows);
        } else if (spreadsheetRows && spreadsheetRows.length > 30) {
          // Se o IndexedDB ainda não tinha os dados mas a memória tem (ex: 16.819 linhas importadas), grava imediatamente
          saveSpreadsheetRowsToIndexedDB(spreadsheetRows);
        }
      }
    });

    loadSpreadsheetMetadata().then(meta => {
      if (isMounted) {
        if (meta.activeSheet) setActiveSheetName(meta.activeSheet);
        if (meta.sheetNames && meta.sheetNames.length > 0) setAvailableSheets(meta.sheetNames);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Monitoramento contínuo: qualquer alteração em lote de dados (>30 linhas) garante persistência imediata
  useEffect(() => {
    if (spreadsheetRows && spreadsheetRows.length > 30) {
      saveSpreadsheetRowsToIndexedDB(spreadsheetRows);
    }
  }, [spreadsheetRows]);

  // Garantia absoluta contra fechamento acidental ou recarregamento brusco
  useEffect(() => {
    const handleFlushOnExit = () => {
      if (spreadsheetRows && spreadsheetRows.length > 30) {
        saveSpreadsheetRowsToIndexedDB(spreadsheetRows);
      }
    };
    window.addEventListener('beforeunload', handleFlushOnExit);
    window.addEventListener('pagehide', handleFlushOnExit);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && spreadsheetRows && spreadsheetRows.length > 30) {
        saveSpreadsheetRowsToIndexedDB(spreadsheetRows);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleFlushOnExit);
      window.removeEventListener('pagehide', handleFlushOnExit);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [spreadsheetRows]);

  // Paginação de alta performance
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Filtros gerais existentes
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [saldoFilter, setSaldoFilter] = useState('all');
  const [faturamentoFilter, setFaturamentoFilter] = useState('all');
  const [syncFilter, setSyncFilter] = useState<'all' | 'synced' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'full' | 'summary'>('full');
  const [totalAggregationType, setTotalAggregationType] = useState<'sum' | 'avg' | 'count'>('sum');

  // Feedback de importação / sincronização
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Identificação do Usuário Suporte
  const isSupportUser = useMemo(() => {
    // 1. Verificar prop currentUser
    if (currentUser) {
      const name = (currentUser.name || '').trim().toLowerCase();
      const email = (currentUser.email || '').trim().toLowerCase();
      const role = String((currentUser as any).role || (currentUser as any).profile || '').trim().toLowerCase();
      if (name.includes('suporte') || email.includes('suporte') || role.includes('suporte')) return true;
    }
    // 2. Verificar sessionStorage trancunha_currentUser e trancunha_user_email
    try {
      const stored = sessionStorage.getItem('trancunha_currentUser');
      if (stored) {
        const u = JSON.parse(stored);
        const name = (u.name || '').trim().toLowerCase();
        const email = (u.email || '').trim().toLowerCase();
        const role = String(u.role || u.profile || '').trim().toLowerCase();
        if (name.includes('suporte') || email.includes('suporte') || role.includes('suporte')) return true;
      }
      const sessionEmail = (sessionStorage.getItem('trancunha_user_email') || '').trim().toLowerCase();
      if (sessionEmail.includes('suporte')) return true;
    } catch {}
    // 3. Verificar localStorage dllog_logged_in_user e trancunha_user_email
    try {
      const stored = localStorage.getItem('dllog_logged_in_user');
      if (stored) {
        const u = JSON.parse(stored);
        const name = (u.name || '').trim().toLowerCase();
        const email = (u.email || '').trim().toLowerCase();
        const role = String(u.role || u.profile || '').trim().toLowerCase();
        if (name.includes('suporte') || email.includes('suporte') || role.includes('suporte')) return true;
      }
      const email = (localStorage.getItem('trancunha_user_email') || '').trim().toLowerCase();
      if (email.includes('suporte')) return true;
    } catch {}
    // 4. Fallback: verificar se o elemento do cabeçalho ou documento contém Suporte
    if (typeof document !== 'undefined') {
      const pageText = document.body.innerText || '';
      if (/suporte/i.test(pageText.slice(0, 2000))) return true;
    }
    return false;
  }, [currentUser]);

  // Listener para movimentação e redimensionamento da janela flutuante
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingWindow) {
        const dx = e.clientX - dragStartRef.current.mouseX;
        const dy = e.clientY - dragStartRef.current.mouseY;
        const newX = Math.max(0, Math.min(window.innerWidth - 300, dragStartRef.current.windowX + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - 150, dragStartRef.current.windowY + dy));
        setWindowPos({ x: newX, y: newY });
      } else if (isResizingWindow) {
        const dx = e.clientX - resizeStartRef.current.mouseX;
        const dy = e.clientY - resizeStartRef.current.mouseY;
        const newW = Math.max(650, Math.min(window.innerWidth - windowPos.x - 10, resizeStartRef.current.startW + dx));
        const newH = Math.max(450, Math.min(window.innerHeight - windowPos.y - 10, resizeStartRef.current.startH + dy));
        setWindowSize({ width: newW, height: newH });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingWindow(false);
      setIsResizingWindow(false);
    };

    if (isDraggingWindow || isResizingWindow) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingWindow, isResizingWindow, windowPos.x, windowPos.y]);

  // Fechar popover de filtro ao clicar fora ou apertar Escape
  useEffect(() => {
    if (!activeFilterPopup) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-filter-popover="true"]')) {
        setActiveFilterPopup(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveFilterPopup(null);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeFilterPopup]);

  // Mapa de busca rápido da planilha importada indexado por CT-e, Placa e Motorista
  const spreadsheetSyncMap = useMemo(() => {
    const map = new Map<string, TranscunhaSpreadsheetRow>();
    spreadsheetRows.forEach(row => {
      if (row.cteHoras && row.cteHoras !== '-') map.set(`cte:${row.cteHoras.trim()}`, row);
      if (row.cte && row.cte !== '-') map.set(`cte:${row.cte.trim()}`, row);
      if (row.placa && row.placa !== '-') {
        const cleanPlaca = row.placa.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        map.set(`placa:${cleanPlaca}`, row);
        map.set(`placa_orig:${row.placa.trim().toUpperCase()}`, row);
      }
      if (row.motorista && row.motorista !== '-') map.set(`mot:${row.motorista.trim().toLowerCase()}`, row);
    });
    return map;
  }, [spreadsheetRows]);

  // Mapas de apoio do sistema
  const cargoMap = useMemo(() => new Map(cargos.map(c => [c.id, c])), [cargos]);
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.razaoSocial || c.nomeFantasia || c.id])), [clients]);
  const shipmentMap = useMemo(() => new Map(shipments.map(s => [s.id, s])), [shipments]);

  // Conversão e Sincronização dos Embarques do Sistema com a Planilha
  const systemConvertedRows = useMemo<ExtendedSpreadsheetRow[]>(() => {
    return items.map((item, idx) => {
      const s = shipmentMap.get(item.shipmentId);
      const cargo = s ? cargoMap.get(s.cargoId) : undefined;
      const clientName = cargo?.clientId ? (clientMap.get(cargo.clientId) || cargo.clientId) : item.clientName;

      const cteKey = item.cteNumber ? item.cteNumber.trim() : (s?.cteNumber ? s.cteNumber.trim() : '');
      const placaClean = item.horsePlate ? item.horsePlate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';
      const motKey = item.driverName ? item.driverName.trim().toLowerCase() : '';

      let syncRow = (cteKey ? spreadsheetSyncMap.get(`cte:${cteKey}`) : undefined) ||
                    (placaClean ? spreadsheetSyncMap.get(`placa:${placaClean}`) : undefined) ||
                    (motKey ? spreadsheetSyncMap.get(`mot:${motKey}`) : undefined);

      const isSynced = !!syncRow;

      const advTimestamp = s?.statusHistory?.find(h => h.status === ShipmentStatus.AguardandoAdiantamento)?.timestamp;
      const salTimestamp = s?.statusHistory?.find(h => h.status === ShipmentStatus.AguardandoPagamentoSaldo)?.timestamp;
      const fallbackHoraLiberAdiant = advTimestamp ? new Date(advTimestamp).toLocaleString('pt-BR') : '-';
      const fallbackHoraLiberSald = salTimestamp ? new Date(salTimestamp).toLocaleString('pt-BR') : '-';
      const systemQuebra = (s?.loadedTonnage && s?.unloadedTonnage) ? (s.loadedTonnage - s.unloadedTonnage) : 0;

      const cteNum = s?.cteNumber || (s?.documents as any)?.cte_number || item.cteNumber || item.shipmentId;
      const emissionDt = s?.cteEmissionDate || (s?.documents as any)?.cte_emission_date;
      const fallbackDt = item.scheduledDate ? new Date(item.scheduledDate).toISOString() : (s?.createdAt || item.scheduledDate);
      const formattedCteHoras = formatCteAndHours(syncRow?.cteHoras || cteNum, emissionDt, fallbackDt, item.shipmentId);

      return {
        id: `sys_${item.shipmentId}`,
        idEmbarqueSistema: item.shipmentId || s?.id || '',
        isSynced,
        cteHoras: formattedCteHoras,
        jaFaturado: syncRow?.jaFaturado || (item.companyFreightTotal > 0 ? 'SIM' : 'NÃO'),
        dataVencimento: syncRow?.dataVencimento || (item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('pt-BR') : ''),
        formaPagamento: syncRow?.formaPagamento || 'FATURAS 14 DIAS',
        dataPagamento: syncRow?.dataPagamento || (item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('pt-BR') : ''),
        statusRecebimento: syncRow?.statusRecebimento || 'A RECEBER',

        dataEmbarque: syncRow?.dataEmbarque || (item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString('pt-BR') : ''),
        placa: syncRow?.placa || item.horsePlate || '-',
        obsCavaloAntt: syncRow?.obsCavaloAntt || (s?.driverFreightType === 'PJ' ? 'PJ-SN' : 'PF'),
        codigoAtua: syncRow?.codigoAtua || String(4000 + idx),
        motorista: syncRow?.motorista || item.driverName || 'Motorista',
        cpfMotorista: syncRow?.cpfMotorista || s?.driverCpf || '-',

        proprietario: syncRow?.proprietario || s?.ownerName || item.driverName || 'Proprietário',
        anttContratoPix: syncRow?.anttContratoPix || s?.pixKey || s?.anttOwnerIdentifier || '-',
        telefone: syncRow?.telefone || s?.driverContact || '-',
        solicitante: syncRow?.solicitante || 'Controladoria Transcunha',
        carregarEmpresa: syncRow?.carregarEmpresa || item.origin || 'Origem',
        numeroPedido: syncRow?.numeroPedido || item.orderId || `PED-${item.shipmentId}`,
        saldoOriginalPedido: syncRow?.saldoOriginalPedido || `${item.tonnage.toFixed(1)} ton`,
        produto: syncRow?.produto || (cargo as any)?.productName || 'Carga Geral',
        tipoCarga: syncRow?.tipoCarga || 'GRANEL',

        transportadora: syncRow?.transportadora || 'TRANSCUNHA',
        cadastro: syncRow?.cadastro || 'LIBERADO',
        matrizFilial: syncRow?.matrizFilial || 'MATRIZ',
        liberacao: syncRow?.liberacao || s?.riskReleaseCode || 'LIB-OK',
        gr: syncRow?.gr || (s?.riskQueryType ? String(s.riskQueryType) : 'LIBERADO'),
        ordemCarregamento: syncRow?.ordemCarregamento || `OC-${item.shipmentId}`,

        clienteTomadorPagador: syncRow?.clienteTomadorPagador || clientName || 'Cliente Geral',
        freteEmpresaUnitario: syncRow?.freteEmpresaUnitario || (item.tonnage > 0 ? (item.companyFreightTotal / item.tonnage) : 0),
        origem: syncRow?.origem || item.origin || '-',
        kmDistancia: syncRow?.kmDistancia || s?.route || '-',
        destino: syncRow?.destino || item.destination || '-',
        eixo: syncRow?.eixo || (s?.vehicleSetType ? String(s.vehicleSetType) : '7-EIXO'),
        pedagio: syncRow?.pedagio !== undefined ? syncRow.pedagio : (item.tollValue || 0),
        peso: syncRow?.peso !== undefined ? syncRow.peso : (item.tonnage || 0),

        freteBrutoEmpresa: syncRow?.freteBrutoEmpresa !== undefined ? syncRow.freteBrutoEmpresa : (item.companyFreightTotal || 0),
        icms: syncRow?.icms !== undefined ? syncRow.icms : (s?.icmsValue || s?.realProfitData?.icmsDifference || 0),
        debitoPisCofins: syncRow?.debitoPisCofins !== undefined ? syncRow.debitoPisCofins : (s?.federalTax || s?.realProfitData?.federalTax || 0),
        creditoPisCofins: syncRow?.creditoPisCofins !== undefined ? syncRow.creditoPisCofins : (s?.generatedCredit || s?.realProfitData?.generatedCredit || 0),
        patronal4: syncRow?.patronal4 !== undefined ? syncRow.patronal4 : (s?.realProfitData?.inssPatronal || 0),
        inssSestSenat: syncRow?.inssSestSenat !== undefined ? syncRow.inssSestSenat : 0,

        tarifaTonMotorista: syncRow?.tarifaTonMotorista !== undefined ? syncRow.tarifaTonMotorista : (item.tonnage > 0 ? (item.driverFreightTotal / item.tonnage) : 0),
        valorFreteMotorista: syncRow?.valorFreteMotorista !== undefined ? syncRow.valorFreteMotorista : (item.driverFreightTotal || 0),
        nfCliente: syncRow?.nfCliente || s?.nfeNumber || '-',
        valorNf: syncRow?.valorNf !== undefined ? syncRow.valorNf : (s?.nfeValue || item.companyFreightTotal * 5),
        cte: syncRow?.cte || item.cteNumber || item.shipmentId,
        controle: syncRow?.controle || item.shipmentId,
        status: syncRow?.status || item.status || 'CARREGADO',

        percentualAdiantamento: syncRow?.percentualAdiantamento !== undefined ? syncRow.percentualAdiantamento : (item.driverFreightTotal > 0 ? Math.round((item.advanceValue / item.driverFreightTotal) * 100) : 0),
        valorAdiantamento: syncRow?.valorAdiantamento !== undefined ? syncRow.valorAdiantamento : (item.advanceValue || 0),
        horaDataLiberacaoAdiantamento: syncRow?.horaDataLiberacaoAdiantamento || fallbackHoraLiberAdiant,
        ticketDescarga: syncRow?.ticketDescarga || 'SIM',
        pesoChegada: syncRow?.pesoChegada !== undefined ? syncRow.pesoChegada : (s?.unloadedTonnage || item.tonnage || 0),
        saldo: syncRow?.saldo !== undefined ? syncRow.saldo : (item.balanceValue || 0),

        horaDataLiberacaoSaldo: syncRow?.horaDataLiberacaoSaldo || fallbackHoraLiberSald,
        tipoPagamentoSaldo: syncRow?.tipoPagamentoSaldo || (s?.paymentMethod ? String(s.paymentMethod) : 'EFRETE/PRAZO'),
        statusSaldo: syncRow?.statusSaldo || (item.balanceValue <= 0 ? 'PAGO' : 'PENDENTE'),
        ciot: syncRow?.ciot || '5698552365,00',
        totalQuebra: syncRow?.totalQuebra !== undefined ? syncRow.totalQuebra : systemQuebra,
        valorQuebraCiot: syncRow?.valorQuebraCiot !== undefined ? syncRow.valorQuebraCiot : (s?.discountValue || 0),
      };
    });
  }, [items, shipments, spreadsheetSyncMap, shipmentMap, cargoMap, clientMap]);

  // SINCRONIZAÇÃO AUTOMÁTICA EM TEMPO REAL:
  // Cada novo embarque criado no sistema gera automaticamente uma nova linha na planilha
  // com seu respectivo ID na 1ª coluna ("ID EMBARQUE SISTEMA") e vai preenchendo as colunas
  // conforme o status for sendo atualizado.
  useEffect(() => {
    if (!shipments || shipments.length === 0) return;

    setSpreadsheetRows(prevRows => {
      let hasChanges = false;
      const updatedRows = [...prevRows];

      shipments.forEach(s => {
        const cargo = s ? cargoMap.get(s.cargoId) : undefined;
        const clientName = cargo?.clientId ? (clientMap.get(cargo.clientId) || cargo.clientId) : '';

        // Localiza linha existente pelo ID do sistema, id direto ou CTE/Placa
        const existingIdx = updatedRows.findIndex(r => 
          r.idEmbarqueSistema === s.id || 
          r.id === `sys_${s.id}` || 
          r.id === s.id || 
          (s.cteNumber && r.cte === s.cteNumber && r.placa === s.horsePlate)
        );

        const advTimestamp = s?.statusHistory?.find(h => h.status === ShipmentStatus.AguardandoAdiantamento)?.timestamp;
        const salTimestamp = s?.statusHistory?.find(h => h.status === ShipmentStatus.AguardandoPagamentoSaldo)?.timestamp;
        const horaLiberAdiant = advTimestamp ? new Date(advTimestamp).toLocaleString('pt-BR') : '';
        const horaLiberSald = salTimestamp ? new Date(salTimestamp).toLocaleString('pt-BR') : '';
        const systemQuebra = (s.loadedTonnage && s.unloadedTonnage && s.loadedTonnage > s.unloadedTonnage) 
          ? Number((s.loadedTonnage - s.unloadedTonnage).toFixed(2)) 
          : 0;

        const baseFreteEmpresa = s.companyFreightRateSnapshot && (s.loadedTonnage || s.shipmentTonnage) 
          ? Number((s.companyFreightRateSnapshot * (s.loadedTonnage || s.shipmentTonnage)).toFixed(2)) 
          : 0;

        const calculatedSaldo = s.netBalanceValue || s.balanceToReceiveValue || Math.max(0, (s.driverFreightValue || 0) - (s.advanceValue || 0) - (s.discountValue || 0));

        if (existingIdx >= 0) {
          // Atualiza colunas de acordo com a evolução do status do embarque
          const curr = updatedRows[existingIdx];
          const updated: TranscunhaSpreadsheetRow = {
            ...curr,
            idEmbarqueSistema: s.id,
            status: s.status ? String(s.status).toUpperCase() : curr.status,
            peso: s.loadedTonnage || s.shipmentTonnage || curr.peso,
            pesoChegada: s.unloadedTonnage !== undefined ? s.unloadedTonnage : curr.pesoChegada,
            ticketDescarga: s.unloadedTonnage ? 'SIM' : curr.ticketDescarga,
            totalQuebra: systemQuebra || curr.totalQuebra,
            valorQuebraCiot: s.discountValue !== undefined ? s.discountValue : curr.valorQuebraCiot,
            freteBrutoEmpresa: baseFreteEmpresa || curr.freteBrutoEmpresa,
            valorFreteMotorista: s.driverFreightValue !== undefined ? s.driverFreightValue : curr.valorFreteMotorista,
            tarifaTonMotorista: s.driverFreightRateSnapshot !== undefined ? s.driverFreightRateSnapshot : curr.tarifaTonMotorista,
            percentualAdiantamento: s.advancePercentage !== undefined ? s.advancePercentage : curr.percentualAdiantamento,
            valorAdiantamento: s.advanceValue !== undefined ? s.advanceValue : curr.valorAdiantamento,
            horaDataLiberacaoAdiantamento: horaLiberAdiant || curr.horaDataLiberacaoAdiantamento,
            saldo: calculatedSaldo !== undefined ? calculatedSaldo : curr.saldo,
            horaDataLiberacaoSaldo: horaLiberSald || curr.horaDataLiberacaoSaldo,
            statusSaldo: s.status === ShipmentStatus.Finalizado || (calculatedSaldo === 0 && s.status !== ShipmentStatus.AguardandoPagamentoSaldo) ? 'PAGO' : (curr.statusSaldo || 'PENDENTE'),
            cte: s.cteNumber || curr.cte,
            cteHoras: s.cteEmissionDate || (s.cteNumber ? `${s.cteNumber}` : curr.cteHoras),
            nfCliente: s.nfeNumber || curr.nfCliente,
            valorNf: s.nfeValue !== undefined ? s.nfeValue : curr.valorNf,
            placa: s.horsePlate || curr.placa,
            motorista: s.driverName || curr.motorista,
            cpfMotorista: s.driverCpf || curr.cpfMotorista,
            anttContratoPix: s.pixKey || s.anttOwnerIdentifier || curr.anttContratoPix,
            telefone: s.driverContact || curr.telefone,
            formaPagamento: s.paymentMethod ? String(s.paymentMethod).toUpperCase() : curr.formaPagamento,
            tipoPagamentoSaldo: s.paymentMethod ? String(s.paymentMethod).toUpperCase() : curr.tipoPagamentoSaldo,
            jaFaturado: s.status === ShipmentStatus.Finalizado ? 'SIM' : curr.jaFaturado,
            statusRecebimento: s.status === ShipmentStatus.Finalizado ? 'RECEBIDO' : curr.statusRecebimento,
          };

          if (JSON.stringify(curr) !== JSON.stringify(updated)) {
            const cteNum = s.cteNumber || (s.documents as any)?.cte_number || curr.cte || s.id;
            const emissionDt = s.cteEmissionDate || (s.documents as any)?.cte_emission_date;
            const fallbackDt = s.scheduledDate || s.createdAt;

            updatedRows[existingIdx] = {
              ...curr,
              ...updated,
              cte: s.cteNumber || curr.cte,
              cteHoras: formatCteAndHours(curr.cteHoras ? curr.cteHoras : cteNum, emissionDt, fallbackDt, s.id),
              idEmbarqueSistema: s.id,
            };
            hasChanges = true;
          }
        } else {
          // NOVO EMBARQUE CRIADO NO SISTEMA: cria nova linha no topo da planilha
          const today = s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString('pt-BR') : new Date(s.createdAt).toLocaleDateString('pt-BR');
          const cteNum = s.cteNumber || (s.documents as any)?.cte_number || s.id;
          const emissionDt = s.cteEmissionDate || (s.documents as any)?.cte_emission_date;
          const fallbackDt = s.scheduledDate || s.createdAt;

          const newRow: TranscunhaSpreadsheetRow = {
            id: `sys_${s.id}`,
            orderIndex: Date.now() + Math.floor(Math.random() * 1000),
            idEmbarqueSistema: s.id,
            cteHoras: formatCteAndHours(cteNum, emissionDt, fallbackDt, s.id),
            jaFaturado: s.status === ShipmentStatus.Finalizado ? 'SIM' : 'NÃO',
            dataVencimento: today,
            formaPagamento: s.paymentMethod ? String(s.paymentMethod).toUpperCase() : 'FATURAS 14 DIAS',
            dataPagamento: today,
            statusRecebimento: s.status === ShipmentStatus.Finalizado ? 'RECEBIDO' : 'A RECEBER',

            dataEmbarque: today,
            placa: s.horsePlate || '-',
            obsCavaloAntt: s.driverFreightType === 'PJ' ? 'PJ-SN' : 'PF',
            codigoAtua: s.id,
            motorista: s.driverName || 'Motorista',
            cpfMotorista: s.driverCpf || '-',

            proprietario: s.ownerName || s.driverName || 'Proprietário',
            anttContratoPix: s.pixKey || s.anttOwnerIdentifier || '-',
            telefone: s.driverContact || '-',
            solicitante: s.createdById || 'Controladoria Transcunha',
            carregarEmpresa: cargo?.origin || cargo?.originLocation || 'Origem',
            numeroPedido: s.orderId || `PED-${s.id}`,
            saldoOriginalPedido: `${(s.shipmentTonnage || 0).toFixed(1)} ton`,
            produto: (cargo as any)?.productName || 'SOJA EM GRÃOS',
            tipoCarga: s.vehicleSetType || 'GRANEL',

            transportadora: 'TRANSCUNHA',
            cadastro: 'LIBERADO',
            matrizFilial: 'MATRIZ',
            liberacao: s.riskReleaseCode || 'LIB-OK',
            gr: s.riskQueryType ? String(s.riskQueryType).toUpperCase() : 'BUONNY OK',
            ordemCarregamento: `OC-${s.orderId || s.id}`,

            clienteTomadorPagador: clientName || 'Cliente Geral',
            freteEmpresaUnitario: s.companyFreightRateSnapshot || 0,
            origem: cargo?.origin || '-',
            kmDistancia: s.route || '-',
            destino: cargo?.destination || '-',
            eixo: s.vehicleSetType ? String(s.vehicleSetType) : '7-EIXO',
            pedagio: s.tollValue || 0,
            peso: s.loadedTonnage || s.shipmentTonnage || 0,

            freteBrutoEmpresa: baseFreteEmpresa,
            icms: s.icmsValue || s.realProfitData?.icmsDifference || 0,
            debitoPisCofins: s.federalTax || s.realProfitData?.federalTax || 0,
            creditoPisCofins: s.generatedCredit || s.realProfitData?.generatedCredit || 0,
            patronal4: s.realProfitData?.inssPatronal || 0,
            inssSestSenat: 0,

            tarifaTonMotorista: s.driverFreightRateSnapshot || 0,
            valorFreteMotorista: s.driverFreightValue || 0,
            nfCliente: s.nfeNumber || '-',
            valorNf: s.nfeValue || 0,
            cte: s.cteNumber || s.id,
            controle: s.orderId || s.id,
            status: String(s.status).toUpperCase(),

            percentualAdiantamento: s.advancePercentage || 70,
            valorAdiantamento: s.advanceValue || 0,
            horaDataLiberacaoAdiantamento: horaLiberAdiant,
            ticketDescarga: s.unloadedTonnage ? 'SIM' : 'NÃO',
            pesoChegada: s.unloadedTonnage || 0,
            saldo: calculatedSaldo,

            horaDataLiberacaoSaldo: horaLiberSald,
            tipoPagamentoSaldo: s.paymentMethod ? String(s.paymentMethod).toUpperCase() : 'PIX - E-FRETE',
            statusSaldo: s.status === ShipmentStatus.Finalizado ? 'PAGO' : 'PENDENTE',
            ciot: s.id,
            totalQuebra: systemQuebra,
            valorQuebraCiot: s.discountValue || 0,
          };

          updatedRows.unshift(newRow);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        savePersistedSpreadsheetRows(updatedRows);
        return updatedRows;
      }
      return prevRows;
    });
  }, [shipments, cargoMap, clientMap]);

  const syncedCount = useMemo(() => {
    return systemConvertedRows.filter(r => r.isSynced).length;
  }, [systemConvertedRows]);

  const activeRows = useMemo(() => {
    return dataSource === 'onedrive' ? spreadsheetRows : systemConvertedRows;
  }, [dataSource, spreadsheetRows, systemConvertedRows]);

  const activeColumnFiltersCount = useMemo(() => {
    return Object.values(columnFilters).filter(v => Boolean(v && v.trim())).length;
  }, [columnFilters]);

  const handleSort = useCallback((key: keyof TranscunhaSpreadsheetRow) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        // Ao desativar classificação secundária, retorna para a ordem padrão: último embarque emitido no topo
        return { key: 'dataEmbarque', direction: 'desc' };
      }
      return { key, direction: key === 'dataEmbarque' ? 'desc' : 'asc' };
    });
  }, []);

  const handleSetColumnFilter = useCallback((key: keyof TranscunhaSpreadsheetRow, value: string) => {
    setColumnFilters(prev => {
      if (!value || value.trim() === '') {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const handleClearColumnFilter = useCallback((key: keyof TranscunhaSpreadsheetRow) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleClearAllColumnFilters = useCallback(() => {
    setColumnFilters({});
    setSortConfig(null);
  }, []);

  const getDistinctColumnValues = useCallback((colKey: keyof TranscunhaSpreadsheetRow) => {
    const counts = new Map<string, number>();
    activeRows.forEach(r => {
      const raw = (r as any)[colKey];
      const val = raw !== null && raw !== undefined ? String(raw).trim() : '';
      if (val && val !== '-') {
        counts.set(val, (counts.get(val) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 35)
      .map(([val, count]) => ({ val, count }));
  }, [activeRows]);

  // Função auxiliar para normalização de texto (remove acentos, espaços extras e minúsculas)
  const normalize = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  };

  // Filtragem e Classificação Otimizada
  const filteredRows = useMemo(() => {
    const term = normalize(searchTerm);

    let result = activeRows.filter(row => {
      // 1. Busca Global Rápida
      if (term) {
        const matchesSearch = 
          normalize(row.cteHoras).includes(term) ||
          normalize(row.cte).includes(term) ||
          normalize(row.placa).includes(term) ||
          normalize(row.motorista).includes(term) ||
          normalize(row.cpfMotorista).includes(term) ||
          normalize(row.clienteTomadorPagador).includes(term) ||
          normalize(row.origem).includes(term) ||
          normalize(row.destino).includes(term) ||
          normalize(row.produto).includes(term) ||
          normalize(row.solicitante).includes(term) ||
          normalize(row.nfCliente).includes(term) ||
          normalize(row.formaPagamento).includes(term) ||
          normalize(row.statusRecebimento).includes(term);

        if (!matchesSearch) return false;
      }

      // 2. Filtros de Toolbar
      if (statusFilter !== 'all' && !normalize(row.status).includes(normalize(statusFilter))) return false;
      if (saldoFilter !== 'all' && normalize(row.statusSaldo) !== normalize(saldoFilter)) return false;
      if (faturamentoFilter !== 'all' && normalize(row.jaFaturado) !== normalize(faturamentoFilter)) return false;

      if (syncFilter === 'synced' && (row as ExtendedSpreadsheetRow).isSynced !== true && dataSource !== 'onedrive') return false;
      if (syncFilter === 'pending' && (row as ExtendedSpreadsheetRow).isSynced !== false) return false;

      // 3. Filtros Individuais de cada Coluna
      for (const [colKey, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal || filterVal.trim() === '') continue;
        const normFilter = normalize(filterVal);
        const rawCell = (row as any)[colKey];
        const normCell = normalize(rawCell);

        // Se for número ou moeda, aceitar tanto formato cru quanto formatado (com vírgula ou ponto)
        if (typeof rawCell === 'number') {
          const numRaw = String(rawCell).toLowerCase();
          const numPtBr = rawCell.toLocaleString('pt-BR');
          if (normCell.includes(normFilter) || numRaw.includes(normFilter) || numPtBr.includes(normFilter)) {
            continue;
          }
          return false;
        }

        if (!normCell.includes(normFilter)) {
          return false;
        }
      }

      return true;
    });

    // Classificação garantida: Por padrão ou por configuração, último embarque sempre no topo
    const effectiveSort = sortConfig || { key: 'dataEmbarque' as keyof TranscunhaSpreadsheetRow, direction: 'desc' as const };
    const { key, direction } = effectiveSort;
    const colDef = SPREADSHEET_COLUMNS.find(c => c.key === key);

    result = [...result].sort((a, b) => {
      const valA = (a as any)[key];
      const valB = (b as any)[key];

      // Ordenação especial por Datas (dataEmbarque, dataVencimento, dataPagamento, etc)
      if (key === 'dataEmbarque' || key === 'dataVencimento' || key === 'dataPagamento' || /data/i.test(String(key))) {
        const timeA = parseShipmentDate(valA);
        const timeB = parseShipmentDate(valB);

        if (timeA !== timeB) {
          return direction === 'asc' ? timeA - timeB : timeB - timeA;
        }
        // Desempate de mesma data: o embarque emitido por último aparece primeiro
        const orderA = a.orderIndex !== undefined ? a.orderIndex : (parseInt(String(a.id).replace(/\D/g, ''), 10) || 0);
        const orderB = b.orderIndex !== undefined ? b.orderIndex : (parseInt(String(b.id).replace(/\D/g, ''), 10) || 0);
        return orderB - orderA;
      }

      if (colDef?.type === 'number' || colDef?.type === 'currency' || colDef?.type === 'percent') {
        const numA = typeof valA === 'number' ? valA : (parseFloat(String(valA).replace(/[^\d.-]/g, '')) || 0);
        const numB = typeof valB === 'number' ? valB : (parseFloat(String(valB).replace(/[^\d.-]/g, '')) || 0);
        if (numA !== numB) {
          return direction === 'asc' ? numA - numB : numB - numA;
        }
      } else {
        const strA = String(valA ?? '').trim();
        const strB = String(valB ?? '').trim();
        const comp = strA.localeCompare(strB, 'pt-BR', { numeric: true, sensitivity: 'base' });
        if (comp !== 0) {
          return direction === 'asc' ? comp : -comp;
        }
      }

      // Desempate final sempre pela ordem de emissão (último emitido no topo)
      const orderA = a.orderIndex !== undefined ? a.orderIndex : (parseInt(String(a.id).replace(/\D/g, ''), 10) || 0);
      const orderB = b.orderIndex !== undefined ? b.orderIndex : (parseInt(String(b.id).replace(/\D/g, ''), 10) || 0);
      return orderB - orderA;
    });

    return result;
  }, [activeRows, searchTerm, statusFilter, saldoFilter, faturamentoFilter, syncFilter, dataSource, columnFilters, sortConfig]);

  // Paginação
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, saldoFilter, faturamentoFilter, syncFilter, columnFilters, sortConfig, pageSize]);

  const totalPages = useMemo(() => {
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(filteredRows.length / pageSize));
  }, [filteredRows.length, pageSize]);

  const paginatedRows = useMemo(() => {
    if (pageSize <= 0) return filteredRows;
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // KPIs Totais Calculados
  const totalFreteEmpresa = filteredRows.reduce((sum, r) => sum + (r.freteBrutoEmpresa || 0), 0);
  const totalFreteMotorista = filteredRows.reduce((sum, r) => sum + (r.valorFreteMotorista || 0), 0);
  const totalAdiantamentos = filteredRows.reduce((sum, r) => sum + (r.valorAdiantamento || 0), 0);
  const totalSaldos = filteredRows.reduce((sum, r) => sum + (r.saldo || 0), 0);
  const totalPedagios = filteredRows.reduce((sum, r) => sum + (r.pedagio || 0), 0);
  const totalTonnage = filteredRows.reduce((sum, r) => sum + (r.peso || 0), 0);
  const margemBruta = totalFreteEmpresa - totalFreteMotorista - totalPedagios;
  const margemPercent = totalFreteEmpresa > 0 ? (margemBruta / totalFreteEmpresa) * 100 : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Persistência assíncrona segura no IndexedDB (sem travamentos e sem limite de 5MB)
  const persistChanges = useCallback((newRows: TranscunhaSpreadsheetRow[]) => {
    setIsSavedRecently(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveSpreadsheetRowsToIndexedDB(newRows).then(() => {
        setIsSavedRecently(true);
      });
      savePersistedSpreadsheetRows(newRows);
    }, 400);
  }, []);

  // Atualização de Célula
  const handleUpdateCell = useCallback((rowId: string, colKey: keyof TranscunhaSpreadsheetRow, rawValue: string) => {
    setSpreadsheetRows(prev => {
      setUndoStack(old => [prev, ...old.slice(0, 29)]);
      setRedoStack([]);

      const colDef = SPREADSHEET_COLUMNS.find(c => c.key === colKey);
      const updatedList = prev.map(row => {
        if (row.id !== rowId) return row;

        let parsedVal: any = rawValue;
        if (colDef?.type === 'currency' || colDef?.type === 'number' || colDef?.type === 'percent') {
          parsedVal = parseNumberPtBr(rawValue);
        }

        const modifiedRow = { ...row, [colKey]: parsedVal };
        return recalculateSpreadsheetRow(modifiedRow);
      });

      persistChanges(updatedList);
      return updatedList;
    });
  }, [persistChanges]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const [previousState, ...restUndo] = undoStack;
    setRedoStack(old => [spreadsheetRows, ...old]);
    setUndoStack(restUndo);
    setSpreadsheetRows(previousState);
    persistChanges(previousState);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const [nextState, ...restRedo] = redoStack;
    setUndoStack(old => [spreadsheetRows, ...old]);
    setRedoStack(restRedo);
    setSpreadsheetRows(nextState);
    persistChanges(nextState);
  };

  const handleAddRow = () => {
    setSpreadsheetRows(prev => {
      setUndoStack(old => [prev, ...old]);
      const newRow = createNewEmptyRow(prev.length + 1);
      const updated = [newRow, ...prev];
      persistChanges(updated);
      setSelectedCell({ rowId: newRow.id, colKey: 'placa' });
      setEditingCell({ rowId: newRow.id, colKey: 'placa' });
      setFormulaBarValue('');
      return updated;
    });
    setNotification({
      type: 'success',
      message: 'Nova linha adicionada!'
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDuplicateRow = (rowId: string) => {
    setSpreadsheetRows(prev => {
      setUndoStack(old => [prev, ...old]);
      const target = prev.find(r => r.id === rowId);
      if (!target) return prev;
      const duplicated: TranscunhaSpreadsheetRow = {
        ...target,
        id: `row_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        cteHoras: `${target.cteHoras}-COPIA`,
        cte: `${target.cte}-COPIA`,
      };
      const idx = prev.findIndex(r => r.id === rowId);
      const updated = [...prev.slice(0, idx + 1), duplicated, ...prev.slice(idx + 1)];
      persistChanges(updated);
      return updated;
    });
  };

  const handleDeleteRow = (rowId: string) => {
    if (!window.confirm('Deseja realmente excluir esta linha da planilha?')) return;
    setSpreadsheetRows(prev => {
      setUndoStack(old => [prev, ...old]);
      const updated = prev.filter(r => r.id !== rowId);
      persistChanges(updated);
      return updated;
    });
    if (selectedCell?.rowId === rowId) {
      setSelectedCell(null);
      setEditingCell(null);
      setFormulaBarValue('');
    }
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent, 
    rowId: string, 
    colKey: keyof TranscunhaSpreadsheetRow,
    rowIndex: number,
    colIndex: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingCell) {
        handleUpdateCell(rowId, colKey, formulaBarValue);
        setEditingCell(null);
      }
      if (rowIndex < paginatedRows.length - 1) {
        const nextRow = paginatedRows[rowIndex + 1];
        setSelectedCell({ rowId: nextRow.id, colKey });
        setFormulaBarValue(String((nextRow as any)[colKey] || ''));
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (editingCell) {
        handleUpdateCell(rowId, colKey, formulaBarValue);
        setEditingCell(null);
      }
      if (!e.shiftKey && colIndex < SPREADSHEET_COLUMNS.length - 1) {
        const nextCol = SPREADSHEET_COLUMNS[colIndex + 1];
        setSelectedCell({ rowId, colKey: nextCol.key });
        const row = paginatedRows[rowIndex];
        setFormulaBarValue(String((row as any)[nextCol.key] || ''));
      } else if (e.shiftKey && colIndex > 0) {
        const prevCol = SPREADSHEET_COLUMNS[colIndex - 1];
        setSelectedCell({ rowId, colKey: prevCol.key });
        const row = paginatedRows[rowIndex];
        setFormulaBarValue(String((row as any)[prevCol.key] || ''));
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
      const row = paginatedRows.find(r => r.id === rowId);
      if (row) setFormulaBarValue(String((row as any)[colKey] || ''));
    } else if (e.key === 'F2') {
      e.preventDefault();
      setEditingCell({ rowId, colKey });
    }
  };

  const handleFormulaBarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;
    handleUpdateCell(selectedCell.rowId, selectedCell.colKey, formulaBarValue);
    setEditingCell(null);
  };

  const handleProcessFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      setRawWorkbookBuffer(buffer);
      const parsed = parseTranscunhaWorkbook(buffer);
      
      if (parsed.rows.length === 0) {
        setNotification({
          type: 'error',
          message: `Nenhum registro localizado no arquivo ${file.name}.`
        });
        return;
      }

      setAvailableSheets(parsed.sheetNames);
      setActiveSheetName(parsed.activeSheet);
      setSpreadsheetRows(parsed.rows);
      setDataSource('onedrive');

      // Gravação garantida permanente no IndexedDB
      await saveSpreadsheetRowsToIndexedDB(parsed.rows);
      await saveSpreadsheetMetadata(parsed.activeSheet, parsed.sheetNames);
      persistChanges(parsed.rows);

      setNotification({
        type: 'success',
        message: `Planilha importada com sucesso! ${parsed.totalRows} registros salvos permanentemente.`
      });

      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      console.error('Erro ao importar planilha:', err);
      setNotification({
        type: 'error',
        message: `Falha ao processar arquivo: ${err.message || 'Formato incompatível'}`
      });
    }
  };

  const handleSheetChange = (sheetName: string) => {
    setActiveSheetName(sheetName);
    localStorage.setItem(STORAGE_KEY_ACTIVE_SHEET, sheetName);
    if (!rawWorkbookBuffer) return;
    const parsed = parseTranscunhaWorkbook(rawWorkbookBuffer, sheetName);
    setSpreadsheetRows(parsed.rows);
    persistChanges(parsed.rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleTriggerSync = () => {
    setDataSource('system');
    setNotification({
      type: 'info',
      message: `Sincronização ativa! ${syncedCount} de ${systemConvertedRows.length} embarques cruzados com a planilha importada.`
    });
    setTimeout(() => setNotification(null), 5000);
  };

  // Exportação Segura, Otimizada e Não-Bloqueante (Garante permanência total dos dados gravados)
  const handleExportExcelXlsx = () => {
    if (isExporting) return;
    setIsExporting(true);
    setNotification({
      type: 'info',
      message: `Preparando exportação de ${filteredRows.length} registros... Aguarde um instante.`
    });

    // Desacopla da thread principal para permitir renderização imediata do feedback
    setTimeout(() => {
      try {
        const headers = SPREADSHEET_COLUMNS.map(col => col.label.replace(' 🔄', ''));
        // Uso de AOA (Array of Arrays) para alta performance e baixíssimo consumo de memória
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
        XLSX.utils.book_append_sheet(workbook, worksheet, activeSheetName || 'Carregamento');

        const fileName = `PLANILHA_EMBARQUE_TRANSCUNHA_${(activeSheetName || 'EMBARQUES').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Escreve como binário em array para criação segura de Blob
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        // Limpeza segura com atraso para garantir que o Chrome inicie o download
        setTimeout(() => {
          if (link.parentNode) link.parentNode.removeChild(link);
          URL.revokeObjectURL(url);
        }, 3000);

        setNotification({
          type: 'success',
          message: `Planilha exportada com sucesso (${filteredRows.length} linhas)! Todos os dados permanecem salvos.`
        });
        setTimeout(() => setNotification(null), 4000);
      } catch (err) {
        console.warn('Erro na geração XLSX, executando fallback CSV direto:', err);
        handleExportFullCsv();
      } finally {
        setIsExporting(false);
      }
    }, 60);
  };

  const handleExportFullCsv = () => {
    try {
      const headers = SPREADSHEET_COLUMNS.map(c => c.label.replace(' 🔄', ''));
      const rows = filteredRows.map(r => {
        return SPREADSHEET_COLUMNS.map(col => {
          const val = (r as any)[col.key];
          if (val === null || val === undefined) return '""';
          if (typeof val === 'number') return val.toFixed(2).replace('.', ',');
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(';');
      });

      const csvContent = [headers.join(';'), ...rows].join('\r\n');
      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PLANILHA_EMBARQUE_TRANSCUNHA_${(activeSheetName || 'EMBARQUES').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
        URL.revokeObjectURL(url);
      }, 3000);

      setNotification({
        type: 'success',
        message: `Planilha CSV exportada com sucesso (${filteredRows.length} registros)!`
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      console.error('Falha ao exportar CSV:', err);
      setNotification({
        type: 'error',
        message: 'Falha ao processar arquivo de exportação.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetSample = () => {
    if (!window.confirm('Tem certeza que deseja restaurar a planilha para a base de dados original do OneDrive?')) return;
    clearPersistedSpreadsheetRows();
    setSpreadsheetRows(SAMPLE_TRANSCUNHA_SHEET_ROWS);
    setDataSource('onedrive');
    setActiveSheetName('TESTE DAVI');
    setColumnFilters({});
    setSortConfig(null);
    setNotification({
      type: 'success',
      message: 'Planilha redefinida para a base original capturada do OneDrive!'
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDeleteSpreadsheet = () => {
    if (!isSupportUser) {
      alert('Ação restrita: Apenas o usuário Suporte possui autorização para excluir a planilha.');
      return;
    }
    clearSpreadsheetStorage();
    clearPersistedSpreadsheetRows();
    savePersistedSpreadsheetRows([]);
    setSpreadsheetRows([]);
    setAvailableSheets([]);
    setActiveSheetName('Planilha1');
    setColumnFilters({});
    setSortConfig({ key: 'dataEmbarque', direction: 'desc' });
    setSelectedCell(null);
    setEditingCell(null);
    setFormulaBarValue('');
    setUndoStack([]);
    setRedoStack([]);
    setShowDeleteModal(false);
    setNotification({
      type: 'info',
      message: 'Planilha excluída com sucesso pelo usuário Suporte!'
    });
    setTimeout(() => setNotification(null), 5000);
  };

  // Atalhos de teclado
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
      } else if (e.key === 'Escape') {
        if (isWindowOpen) {
          setIsWindowOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isWindowOpen]);

  // RENDERIZAÇÃO DA GRADE PRINCIPAL DA TABELA (Compartilhada entre visão normal e janela sobreposta)
  const renderSpreadsheetContent = (isInsideWindow: boolean = false) => {
    return (
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden w-full h-full">
        {/* BARRA DE FÓRMULAS & CONTROLES */}
        <div className="bg-white dark:bg-slate-900 p-2.5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-2.5 shrink-0 select-none">
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono font-black text-slate-800 dark:text-slate-100 min-w-[120px] text-center truncate">
              {selectedCell ? (
                <span>{SPREADSHEET_COLUMNS.find(c => c.key === selectedCell.colKey)?.label.replace(' 🔄', '') || selectedCell.colKey}</span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 font-normal">Nenhuma célula</span>
              )}
            </div>

            <div className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-md font-serif italic font-bold text-xs">
              fx
            </div>
          </div>

          <form onSubmit={handleFormulaBarSubmit} className="flex-1 flex items-center gap-2">
            <input
              ref={formulaInputRef}
              type="text"
              placeholder={selectedCell ? "Digite o valor ou fórmula e pressione Enter..." : "Clique numa célula para editar ou ver a fórmula..."}
              value={formulaBarValue}
              disabled={!selectedCell}
              onChange={(e) => setFormulaBarValue(e.target.value)}
              className="flex-1 px-3 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 font-mono"
            />
            {selectedCell && (
              <button
                type="submit"
                title="Confirmar alteração (Enter)"
                className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </form>

          <div className="flex items-center gap-1.5 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-1.5 md:pt-0 md:pl-2.5">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova Linha
            </button>

            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Desfazer (Ctrl+Z)"
              className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs border border-slate-300 dark:border-slate-700 disabled:opacity-40 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Refazer (Ctrl+Y)"
              className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs border border-slate-300 dark:border-slate-700 disabled:opacity-40 transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* TABELA COM SCROLL OTIMIZADO */}
        <div className="flex-1 min-h-0 overflow-auto bg-white dark:bg-slate-900">
          {viewMode === 'full' ? (
            <table className="w-full text-left text-[11px] whitespace-nowrap border-collapse bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
              <thead className="sticky top-0 z-30 shadow-sm select-none">
                {/* Linha 1: Setores com Cores Harmoniosas */}
                <tr className="text-center font-black tracking-wider uppercase text-[10px]">
                  <th className="bg-slate-800 text-white py-1 px-2 border-r border-slate-700 w-12 text-center">#</th>
                  <th colSpan={6} className="bg-sky-600 text-white py-1 border-r border-sky-700">Faturamento & Recebimento Empresa</th>
                  <th colSpan={6} className="bg-blue-700 text-white py-1 border-r border-blue-800">Identificação & Motorista</th>
                  <th colSpan={9} className="bg-cyan-700 text-white py-1 border-r border-cyan-800">Carga, Pedido & Logística</th>
                  <th colSpan={6} className="bg-slate-700 text-white py-1 border-r border-slate-800">Cadastros & Controles</th>
                  <th colSpan={8} className="bg-amber-600 text-white py-1 border-r border-amber-700">Tomador, Rota & Pesagem</th>
                  <th colSpan={6} className="bg-purple-700 text-white py-1 border-r border-purple-800">Impostos & Deduções</th>
                  <th colSpan={7} className="bg-indigo-700 text-white py-1 border-r border-indigo-800">Frete & Acerto Motorista</th>
                  <th colSpan={6} className="bg-emerald-700 text-white py-1 border-r border-emerald-800">Adiantamentos & Saldo</th>
                  <th colSpan={6} className="bg-rose-700 text-white py-1">Fechamento, CIOT, Quebra & Valor Total</th>
                </tr>

                {/* Linha 2: Cabeçalhos com Ordenação e Filtros Rápidos */}
                <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-bold uppercase text-[10px] tracking-tight border-b border-slate-300 dark:border-slate-800">
                  <th className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-950">
                    <span>#</span>
                  </th>

                  {SPREADSHEET_COLUMNS.map((col) => {
                    const isSorted = sortConfig?.key === col.key;
                    const hasFilter = Boolean(columnFilters[col.key]);
                    const isPopupOpen = activeFilterPopup === col.key;
                    const distinctValues = isPopupOpen ? getDistinctColumnValues(col.key) : [];

                    return (
                      <th 
                        key={col.key}
                        className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 relative bg-slate-100 dark:bg-slate-950 ${
                          col.width || 'min-w-[115px]'
                        } ${col.isSynchronized ? 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <button
                            onClick={() => handleSort(col.key)}
                            className="flex items-center gap-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-300 text-left flex-1 truncate font-bold"
                            title={`Clique para classificar por ${col.label}`}
                          >
                            <span className="truncate">{col.label}</span>
                            {col.isCalculated && (
                              <span title="Fórmula automática" className="text-[9px] text-emerald-500 font-mono shrink-0">∑</span>
                            )}
                          </button>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => handleSort(col.key)}
                              className={`p-0.5 rounded cursor-pointer ${
                                isSorted ? 'text-amber-500 font-black' : 'text-slate-400 opacity-30 hover:opacity-100'
                              }`}
                            >
                              {isSorted ? (
                                sortConfig.direction === 'asc' ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-amber-500 stroke-[3]" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-amber-500 stroke-[3]" />
                                )
                              ) : (
                                <ArrowUpDown className="w-2.5 h-2.5" />
                              )}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFilterPopup(isPopupOpen ? null : col.key);
                              }}
                              className={`p-0.5 rounded cursor-pointer ${
                                hasFilter
                                  ? 'text-amber-600 bg-amber-500/20 ring-1 ring-amber-500/40'
                                  : 'text-slate-400 opacity-40 hover:opacity-100'
                              }`}
                              title={`Filtrar ${col.label}`}
                            >
                              <Filter className={`w-2.5 h-2.5 ${hasFilter ? 'fill-amber-500' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Linha de Busca Rápida Debounced */}
                        {showFilterRow && (
                          <div className="mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-800/80">
                            <DebouncedFilterInput
                              value={columnFilters[col.key] || ''}
                              onChange={(val) => handleSetColumnFilter(col.key, val)}
                              hasFilter={hasFilter}
                              onClear={() => handleClearColumnFilter(col.key)}
                            />
                          </div>
                        )}

                        {/* Popover AutoFilter */}
                        {isPopupOpen && (
                          <div 
                            data-filter-popover="true"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 p-2.5 text-xs text-slate-800 dark:text-slate-200 font-sans normal-case animate-in fade-in zoom-in-95 duration-100"
                          >
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {col.label.replace(' 🔄', '')}
                              </span>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveFilterPopup(null);
                                }} 
                                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-0.5 rounded cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Botão de Limpar Filtro desta Coluna (se houver) */}
                            {hasFilter && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClearColumnFilter(col.key);
                                  setActiveFilterPopup(null);
                                }}
                                className="w-full flex items-center justify-center gap-1.5 px-2 py-1 my-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-lg text-[11px] font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                                <span>Limpar Filtro ({columnFilters[col.key]})</span>
                              </button>
                            )}

                            <div className="py-1.5 space-y-1 border-b border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortConfig({ key: col.key, direction: 'asc' });
                                  setActiveFilterPopup(null);
                                }}
                                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-[11px] cursor-pointer ${
                                  isSorted && sortConfig.direction === 'asc' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                                <span>{col.type === 'number' || col.type === 'currency' ? 'Menor para Maior (0 → 9)' : 'Crescente (A → Z)'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSortConfig({ key: col.key, direction: 'desc' });
                                  setActiveFilterPopup(null);
                                }}
                                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-[11px] cursor-pointer ${
                                  isSorted && sortConfig.direction === 'desc' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                                <span>{col.type === 'number' || col.type === 'currency' ? 'Maior para Menor (9 → 0)' : 'Decrescente (Z → A)'}</span>
                              </button>
                            </div>

                            {distinctValues.length > 0 && (
                              <div className="pt-2">
                                <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400 font-bold">
                                  <span>Valores Frequentes:</span>
                                  <span className="text-[9px]">({distinctValues.length})</span>
                                </div>
                                <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
                                  {distinctValues.map(({ val, count }) => {
                                    const isSelected = columnFilters[col.key] === val;
                                    return (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isSelected) {
                                            handleClearColumnFilter(col.key);
                                          } else {
                                            handleSetColumnFilter(col.key, val);
                                          }
                                          setActiveFilterPopup(null);
                                        }}
                                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[11px] transition-all truncate cursor-pointer ${
                                          isSelected
                                            ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        <span className="truncate flex items-center gap-1">
                                          {isSelected && <span className="font-bold">✓</span>}
                                          {val}
                                        </span>
                                        <span className={`text-[9px] ml-1 shrink-0 ${isSelected ? 'text-slate-950/80 font-bold' : 'opacity-60'}`}>
                                          ({count})
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={61} className="px-4 py-12 text-center text-slate-400 font-sans bg-white dark:bg-slate-900">
                      <div className="flex flex-col items-center justify-center gap-2.5">
                        <AlertCircle className="w-8 h-8 text-amber-400 opacity-60" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                          {activeRows.length === 0 
                            ? 'A planilha está vazia.' 
                            : 'Nenhum registro localizado com os filtros aplicados.'}
                        </span>
                        {activeRows.length === 0 ? (
                          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                            <button
                              onClick={handleAddRow}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Adicionar Linha
                            </button>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Importar Planilha XLSX
                            </button>
                            {isSupportUser && (
                              <button
                                onClick={handleResetSample}
                                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Restaurar Base Exemplo
                              </button>
                            )}
                          </div>
                        ) : (
                          (activeColumnFiltersCount > 0 || sortConfig) && (
                            <button
                              onClick={handleClearAllColumnFilters}
                              className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 cursor-pointer"
                            >
                              Limpar Filtros das Colunas
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, rowIndex) => {
                    const actualIndex = pageSize > 0 ? (currentPage - 1) * pageSize + rowIndex : rowIndex;
                    const isRowSelected = selectedCell?.rowId === row.id;

                    return (
                      <tr 
                        key={row.id} 
                        className={`transition-colors group ${
                          rowIndex % 2 === 0
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-slate-50/70 dark:bg-slate-900/60'
                        } hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 ${
                          isRowSelected ? '!bg-indigo-100/50 dark:!bg-indigo-900/60' : ''
                        }`}
                      >
                        <td className="px-2 py-1 text-center text-slate-400 dark:text-slate-500 font-sans text-[10px] bg-slate-50 dark:bg-slate-950/70 border-r border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-center gap-1">
                            <span className="group-hover:hidden">{actualIndex + 1}</span>
                            <div className="hidden group-hover:flex items-center gap-0.5">
                              <button onClick={() => handleDuplicateRow(row.id)} title="Duplicar" className="p-0.5 hover:text-indigo-400">
                                <Copy className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteRow(row.id)} title="Excluir" className="p-0.5 hover:text-rose-400">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {SPREADSHEET_COLUMNS.map((col, colIndex) => {
                          const isSelected = selectedCell?.rowId === row.id && selectedCell?.colKey === col.key;
                          const isEditing = editingCell?.rowId === row.id && editingCell?.colKey === col.key;
                          const rawValue = (row as any)[col.key];

                          let displayValue = rawValue || '-';
                          if (col.key === 'cteHoras' && rawValue && rawValue !== '-') {
                            displayValue = formatCteAndHours(rawValue, (row as any).cteEmissionDate, row.dataEmbarque, (row as any).cte || row.idEmbarqueSistema || row.id);
                          } else if (col.type === 'currency' && typeof rawValue === 'number') {
                            displayValue = rawValue > 0 ? formatCurrency(rawValue) : '-';
                          } else if (col.type === 'percent' && typeof rawValue === 'number') {
                            displayValue = rawValue > 0 ? `${rawValue}%` : '-';
                          } else if (col.type === 'number' && typeof rawValue === 'number') {
                            displayValue = rawValue > 0 ? rawValue.toFixed(2) : '-';
                          }

                          return (
                            <td 
                              key={col.key}
                              onClick={() => {
                                setSelectedCell({ rowId: row.id, colKey: col.key });
                                setFormulaBarValue(String(rawValue ?? ''));
                              }}
                              onDoubleClick={() => {
                                setSelectedCell({ rowId: row.id, colKey: col.key });
                                setEditingCell({ rowId: row.id, colKey: col.key });
                                setFormulaBarValue(String(rawValue ?? ''));
                              }}
                              className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 transition-all cursor-cell relative select-none ${
                                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                              } ${col.isSynchronized ? 'bg-amber-50/25 dark:bg-amber-950/25' : ''} ${
                                isSelected ? 'ring-2 ring-emerald-500 ring-inset z-10 bg-emerald-500/15 dark:bg-emerald-500/30' : ''
                              }`}
                            >
                              {isEditing ? (
                                col.type === 'select' && col.options ? (
                                  <select
                                    autoFocus
                                    value={String(rawValue || '')}
                                    onChange={(e) => {
                                      handleUpdateCell(row.id, col.key, e.target.value);
                                      setEditingCell(null);
                                    }}
                                    onBlur={() => setEditingCell(null)}
                                    onKeyDown={(e) => handleCellKeyDown(e, row.id, col.key, rowIndex, colIndex)}
                                    className="w-full bg-white dark:bg-slate-950 border border-emerald-500 rounded px-1 py-0 text-xs text-slate-900 dark:text-slate-100 outline-none"
                                  >
                                    {col.options.map(opt => (
                                      <option key={opt} value={opt} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{opt}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    autoFocus
                                    type="text"
                                    defaultValue={String(rawValue ?? '')}
                                    onBlur={(e) => {
                                      handleUpdateCell(row.id, col.key, (e.target as HTMLInputElement).value);
                                      setEditingCell(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleUpdateCell(row.id, col.key, (e.target as HTMLInputElement).value);
                                        setEditingCell(null);
                                        if (rowIndex < paginatedRows.length - 1) {
                                          const nextRow = paginatedRows[rowIndex + 1];
                                          setSelectedCell({ rowId: nextRow.id, colKey: col.key });
                                          setFormulaBarValue(String((nextRow as any)[col.key] || ''));
                                        }
                                      } else if (e.key === 'Tab') {
                                        e.preventDefault();
                                        handleUpdateCell(row.id, col.key, (e.target as HTMLInputElement).value);
                                        setEditingCell(null);
                                        if (!e.shiftKey && colIndex < SPREADSHEET_COLUMNS.length - 1) {
                                          const nextCol = SPREADSHEET_COLUMNS[colIndex + 1];
                                          setSelectedCell({ rowId: row.id, colKey: nextCol.key });
                                          setFormulaBarValue(String((row as any)[nextCol.key] || ''));
                                        }
                                      } else if (e.key === 'Escape') {
                                        setEditingCell(null);
                                      }
                                    }}
                                    className="w-full bg-white dark:bg-slate-950 border border-emerald-500 rounded px-1 py-0 text-xs text-slate-900 dark:text-slate-100 outline-none font-mono"
                                  />
                                )
                              ) : (
                                <div className="flex items-center gap-1 overflow-hidden">
                                  {col.key === 'idEmbarqueSistema' ? (
                                    rawValue ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-black border border-emerald-500/30">
                                        <Sparkles className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                        {rawValue}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-mono text-[10px]">-</span>
                                    )
                                  ) : (
                                    <>
                                      {col.key === 'cteHoras' && (row as ExtendedSpreadsheetRow).isSynced && (
                                        <span title="Sincronizado" className="text-emerald-500 font-sans text-xs shrink-0">✅</span>
                                      )}
                                      <span className={`truncate ${
                                        col.key === 'placa' ? 'font-black text-slate-900 dark:text-emerald-400' :
                                        col.key === 'saldo' ? 'font-bold text-indigo-600 dark:text-indigo-400' :
                                        col.key === 'valorFreteMotorista' ? 'font-bold text-rose-600 dark:text-rose-400' :
                                        col.key === 'statusSaldo' && rawValue === 'PAGO' ? 'text-emerald-600 dark:text-emerald-400 font-bold' :
                                        col.key === 'statusSaldo' && rawValue === 'PENDENTE' ? 'text-amber-600 dark:text-amber-400 font-bold' :
                                        col.isSynchronized ? 'text-amber-900 dark:text-amber-300 font-semibold' :
                                        'text-slate-800 dark:text-slate-100'
                                      }`}>
                                        {displayValue}
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* RODAPÉ DO EXCEL COM TOTAIS */}
              <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-800 font-mono font-bold text-[11px] shadow-lg text-slate-900 dark:text-slate-100">
                <tr>
                  <td className="px-2 py-1.5 text-center text-slate-500 dark:text-slate-400 border-r border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                    <select
                      value={totalAggregationType}
                      onChange={(e) => setTotalAggregationType(e.target.value as any)}
                      className="bg-transparent text-[10px] font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                    >
                      <option value="sum" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">SOMA</option>
                      <option value="avg" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">MÉDIA</option>
                      <option value="count" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">CONTAGEM</option>
                    </select>
                  </td>

                  {SPREADSHEET_COLUMNS.map((col) => {
                    if (col.type === 'currency' || col.type === 'number') {
                      const sum = filteredRows.reduce((acc, r) => acc + (Number((r as any)[col.key]) || 0), 0);
                      const count = filteredRows.filter(r => (Number((r as any)[col.key]) || 0) > 0).length;
                      const avg = count > 0 ? sum / count : 0;

                      let display = '';
                      if (totalAggregationType === 'sum') {
                        display = col.type === 'currency' ? formatCurrency(sum) : `${sum.toFixed(2)}`;
                      } else if (totalAggregationType === 'avg') {
                        display = col.type === 'currency' ? formatCurrency(avg) : `${avg.toFixed(2)}`;
                      } else {
                        display = `${count} itens`;
                      }

                      return (
                        <td 
                          key={col.key} 
                          className={`px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 text-right ${
                            col.isSynchronized ? 'text-amber-800 dark:text-amber-300 bg-amber-50/20 dark:bg-amber-950/20' : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {display}
                        </td>
                      );
                    }

                    if (col.key === 'idEmbarqueSistema') {
                      const systemCount = filteredRows.filter(r => Boolean(r.idEmbarqueSistema)).length;
                      return (
                        <td key={col.key} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 font-bold">
                          {systemCount} do sistema
                        </td>
                      );
                    }

                    if (col.key === 'cteHoras') {
                      return (
                        <td key={col.key} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          {filteredRows.length} registros
                        </td>
                      );
                    }

                    return (
                      <td key={col.key} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-600">
                        -
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          ) : (
            // Visão Resumo
            <table className="w-full text-left text-xs whitespace-nowrap bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">ID Embarque</th>
                  <th className="px-3 py-2.5">Embarque / CT-e</th>
                  <th className="px-3 py-2.5">Data</th>
                  <th className="px-3 py-2.5">Rota</th>
                  <th className="px-3 py-2.5">Cliente Tomador</th>
                  <th className="px-3 py-2.5">Motorista / Placa</th>
                  <th className="px-3 py-2.5 text-right">Peso</th>
                  <th className="px-3 py-2.5 text-right">Frete Empresa</th>
                  <th className="px-3 py-2.5 text-right">Frete Motorista</th>
                  <th className="px-3 py-2.5 text-right">Pedágio</th>
                  <th className="px-3 py-2.5 text-right">Adiantamento</th>
                  <th className="px-3 py-2.5 text-right">Saldo</th>
                  <th className="px-3 py-2.5 text-right">Margem</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedRows.length === 0 ? (
                  <tr><td colSpan={14} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900">Nenhum registro localizado.</td></tr>
                ) : (
                  paginatedRows.map((r) => {
                    const margem = r.freteBrutoEmpresa - r.valorFreteMotorista - r.pedagio;
                    const margemPct = r.freteBrutoEmpresa > 0 ? (margem / r.freteBrutoEmpresa) * 100 : 0;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="px-3 py-2 font-mono font-bold">
                          {r.idEmbarqueSistema ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
                              {r.idEmbarqueSistema}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold font-mono">
                          {(r as ExtendedSpreadsheetRow).isSynced && <span className="text-emerald-500 mr-1">✅</span>}
                          {r.cteHoras ? formatCteAndHours(r.cteHoras, (r as any).cteEmissionDate, r.dataEmbarque, r.cte || r.idEmbarqueSistema || r.id) : (r.cte || '-')}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300 font-mono">{r.dataEmbarque || '-'}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{r.origem} → {r.destino}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-medium max-w-[180px] truncate">{r.clienteTomadorPagador}</td>
                        <td className="px-3 py-2 font-mono">
                          <span className="font-bold text-slate-900 dark:text-white block">{r.placa}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[150px]">{r.motorista}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white font-mono">{r.peso.toFixed(2)} ton</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(r.freteBrutoEmpresa)}</td>
                        <td className="px-3 py-2 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(r.valorFreteMotorista)}</td>
                        <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400 font-mono">{r.pedagio > 0 ? formatCurrency(r.pedagio) : '-'}</td>
                        <td className="px-3 py-2 text-right text-blue-600 dark:text-blue-400 font-mono font-semibold">{r.valorAdiantamento > 0 ? formatCurrency(r.valorAdiantamento) : '-'}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(r.saldo)}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(margem)} ({margemPct.toFixed(0)}%)</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.statusSaldo === 'PAGO' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          }`}>
                            {r.statusSaldo || 'PENDENTE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* CONTROLE DE PAGINAÇÃO */}
        {pageSize > 0 && totalPages > 1 && (
          <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 px-4 py-1.5 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 select-none">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Mostrando <span className="font-bold text-slate-800 dark:text-slate-200">{(currentPage - 1) * pageSize + 1}</span> a{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, filteredRows.length)}</span> de{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{filteredRows.length}</span> linhas ({activeRows.length} total)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 text-xs font-bold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </button>

              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-slate-800 border border-indigo-200 dark:border-slate-700 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 text-xs font-bold flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                Próxima
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Backdrop invisível para fechar o popup de filtro */}
      {activeFilterPopup && (
        <div 
          className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40 backdrop-blur-[0.5px]" 
          onClick={() => setActiveFilterPopup(null)} 
        />
      )}

      {/* Input de arquivo invisível */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".xlsx,.xlsm,.xls,.csv" 
        className="hidden" 
      />

      {/* PAINEL UNIFICADO E ULTRA-OTIMIZADO DA CONTROLADORIA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-3 sm:p-3.5 space-y-2.5">
        {/* LINHA 1: TÍTULO, ORIGEM E TOOLBAR DE AÇÕES */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          {/* Lado Esquerdo: Título & Seletor de Origem */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Controladoria & Planilha
              </h2>
            </div>

            {/* Alternador de Origem Estilo Pill */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setDataSource('onedrive')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dataSource === 'onedrive'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Planilha ({spreadsheetRows.length})
              </button>
              <button
                onClick={() => setDataSource('system')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  dataSource === 'system'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sistema ({items.length})
                {syncedCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                    {syncedCount} sinc
                  </span>
                )}
              </button>
            </div>

            {/* Abas ativas da Planilha (se houver) */}
            {dataSource === 'onedrive' && availableSheets.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-[180px] sm:max-w-xs">
                {availableSheets.map(sheet => (
                  <button
                    key={sheet}
                    onClick={() => handleSheetChange(sheet)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activeSheetName === sheet
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    {sheet}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lado Direito: Toolbar Compacta de Ações */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setIsWindowOpen(true);
                setWindowMode('fullscreen');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/25 transition-all cursor-pointer active:scale-95"
              title="Abrir em tela cheia maximizada (Esc para sair)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Maximizar Planilha</span>
            </button>

            <button
              onClick={() => {
                setIsWindowOpen(true);
                setWindowMode('floating');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Abrir como janela flutuante arrastável"
            >
              <Move className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Janela</span>
            </button>

            <button
              onClick={handleTriggerSync}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              title="Sincronizar dados entre a planilha e o sistema"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Sincronizar ({syncedCount})</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Importar arquivo Excel (.xlsx, .csv)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importar</span>
            </button>

            <button
              onClick={handleExportExcelXlsx}
              disabled={isExporting}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isExporting ? 'opacity-70 cursor-wait' : ''
              }`}
              title="Exportar dados como planilha Excel (.xlsx)"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isExporting ? 'Exportando...' : 'Exportar'}</span>
            </button>

            {isSupportUser && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Excluir Planilha (Disponível apenas para Suporte)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span className="hidden sm:inline">Excluir Planilha</span>
                <span className="sm:hidden">Excluir</span>
              </button>
            )}

            <button
              onClick={handleResetSample}
              title="Restaurar dados originais"
              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* NOTIFICAÇÃO (SE HOUVER) */}
        {notification && (
          <div className={`p-2 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            notification.type === 'success' 
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-200' 
              : notification.type === 'info'
              ? 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-200'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 text-slate-500 dark:text-white ml-2">✕</button>
          </div>
        )}

        {/* LINHA 2: FAIXA INTEGRADA E ULTRA-COMPACTA DE KPIS */}
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
              <span className="text-[10px] text-rose-600 dark:text-rose-400/90 font-bold">
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

        {/* LINHA 3: BARRA INTEGRADA DE PESQUISA, FILTROS E CONTROLE DE VISÃO */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar em todas as colunas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setShowFilterRow(prev => !prev)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                showFilterRow
                  ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{showFilterRow ? 'Filtros em Coluna' : 'Exibir Filtros'}</span>
            </button>

            {(activeColumnFiltersCount > 0 || sortConfig !== null) && (
              <button
                onClick={handleClearAllColumnFilters}
                className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500 text-rose-600 dark:text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Limpar todos os filtros e ordenações aplicadas"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar ({activeColumnFiltersCount + (sortConfig ? 1 : 0)})</span>
              </button>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">Status: Todos</option>
              <option value="CARREGADO">Carregado</option>
              <option value="Ag. Carregamento">Ag. Carregamento</option>
              <option value="Em Viagem">Em Viagem</option>
              <option value="Ag. Descarga">Ag. Descarga</option>
              <option value="Finalizado">Finalizado</option>
            </select>

            <select
              value={saldoFilter}
              onChange={(e) => setSaldoFilter(e.target.value)}
              className="px-2 py-1 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">Saldo: Todos</option>
              <option value="PAGO">Pago</option>
              <option value="PENDENTE">Pendente</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 rounded-xl text-xs border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 font-bold outline-none cursor-pointer"
            >
              <option value={25}>25 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
              <option value={200}>200 por pág.</option>
              <option value={-1}>Todos ({filteredRows.length})</option>
            </select>

            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-950 p-0.5 border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setViewMode('full')}
                className={`px-2.5 py-0.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'full' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Grade
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`px-2.5 py-0.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'summary' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Resumo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DA TABELA NO MODO NORMAL DA PÁGINA */}
      <div className="h-[700px] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        {renderSpreadsheetContent(false)}
      </div>

      {/* ========================================================================= */}
      {/* JANELA SOBREPOSTA FLEXÍVEL / MAXIMIZADA (PORTAL RENDERIZADO NO BODY) */}
      {/* ========================================================================= */}
      {isWindowOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className={`fixed inset-0 z-[999999] bg-slate-950/70 backdrop-blur-sm flex ${
            windowMode === 'fullscreen' ? 'p-0' : 'p-3 pointer-events-none'
          }`}
        >
          {/* Container da Janela Flutuante ou Fullscreen */}
          <div 
            style={
              windowMode === 'floating' ? {
                position: 'fixed',
                left: `${windowPos.x}px`,
                top: `${windowPos.y}px`,
                width: `${windowSize.width}px`,
                height: `${windowSize.height}px`,
              } : undefined
            }
            className={`pointer-events-auto bg-slate-900 text-white border-2 border-indigo-500/80 shadow-[0_25px_100px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden transition-shadow ${
              windowMode === 'fullscreen'
                ? 'w-screen h-screen rounded-none'
                : 'rounded-2xl ring-1 ring-white/20'
            }`}
          >
            {/* BARRA SUPERIOR DE CONTROLE E MOVIMENTAÇÃO DA JANELA */}
            <div 
              onMouseDown={(e) => {
                if (windowMode === 'floating') {
                  setIsDraggingWindow(true);
                  dragStartRef.current = {
                    mouseX: e.clientX,
                    mouseY: e.clientY,
                    windowX: windowPos.x,
                    windowY: windowPos.y,
                  };
                }
              }}
              className={`px-4 py-2.5 bg-slate-950 text-white border-b border-indigo-500/40 flex items-center justify-between gap-4 select-none shrink-0 ${
                windowMode === 'floating' ? 'cursor-move' : ''
              }`}
            >
              {/* Traffic Light Controls & Título da Janela */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 mr-1">
                  {/* Botão Vermelho: Fechar Janela */}
                  <button
                    onClick={() => setIsWindowOpen(false)}
                    className="w-3.5 h-3.5 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center cursor-pointer group"
                    title="Fechar Janela (Esc)"
                  >
                    <X className="w-2.5 h-2.5 text-rose-950 opacity-0 group-hover:opacity-100" />
                  </button>

                  {/* Botão Amarelo: Alternar Modo Janela Flutuante / Fullscreen */}
                  <button
                    onClick={() => setWindowMode(prev => prev === 'fullscreen' ? 'floating' : 'fullscreen')}
                    className="w-3.5 h-3.5 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center cursor-pointer group"
                    title={windowMode === 'fullscreen' ? "Modo Janela Flutuante (Arrastável/Redimensionável)" : "Modo Tela Cheia"}
                  >
                    <span className="w-1.5 h-0.5 bg-amber-950 opacity-0 group-hover:opacity-100 rounded-full" />
                  </button>

                  {/* Botão Verde: Maximizar Tela Cheia */}
                  <button
                    onClick={() => setWindowMode('fullscreen')}
                    className="w-3.5 h-3.5 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center cursor-pointer group"
                    title="Maximizar Tela Cheia Total"
                  >
                    <Maximize2 className="w-2 h-2 text-emerald-950 opacity-0 group-hover:opacity-100" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PLANILHA TRANSCUNHA</span>
                  </div>

                  {windowMode === 'floating' && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-indigo-300/80 font-mono">
                      <Move className="w-3 h-3" /> Arraste pela barra para posicionar • Redimensione pelas bordas
                    </span>
                  )}
                </div>
              </div>

              {/* Ações da Janela */}
              <div className="flex items-center gap-2">
                {/* Abas ativas */}
                {dataSource === 'onedrive' && availableSheets.length > 0 && (
                  <div className="hidden lg:flex items-center gap-1 overflow-x-auto max-w-sm">
                    {availableSheets.map(sheet => (
                      <button
                        key={sheet}
                        onClick={() => handleSheetChange(sheet)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          activeSheetName === sheet
                            ? 'bg-white text-slate-950 shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sheet}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleExportExcelXlsx}
                  disabled={isExporting}
                  className={`flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isExporting ? 'opacity-70 cursor-wait' : ''
                  }`}
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {isExporting ? 'Exportando...' : 'Exportar'}
                </button>

                {isSupportUser && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    title="Excluir Planilha (Apenas Suporte)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                )}

                <button
                  onClick={() => setWindowMode(prev => prev === 'fullscreen' ? 'floating' : 'fullscreen')}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
                  title={windowMode === 'fullscreen' ? "Restaurar para Janela Flutuante" : "Maximizar em Tela Cheia"}
                >
                  {windowMode === 'fullscreen' ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-emerald-400" />}
                </button>

                <button
                  onClick={() => setIsWindowOpen(false)}
                  className="flex items-center gap-1 px-3 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  title="Fechar janela (Esc)"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Fechar</span>
                </button>
              </div>
            </div>

            {/* CONTEÚDO DA PLANILHA DENTRO DA JANELA SOBREPOSTA */}
            <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-white dark:bg-slate-900">
              {renderSpreadsheetContent(true)}
            </div>

            {/* ALÇA DE REDIMENSIONAMENTO NO CANTO INFERIOR DIREITO (quando em modo flutuante) */}
            {windowMode === 'floating' && (
              <div 
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsResizingWindow(true);
                  resizeStartRef.current = {
                    mouseX: e.clientX,
                    mouseY: e.clientY,
                    startW: windowSize.width,
                    startH: windowSize.height
                  };
                }}
                className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize flex items-end justify-end p-0.5 text-indigo-400 hover:text-white z-50 select-none"
                title="Arraste para redimensionar tamanho da janela"
              >
                <svg className="w-3.5 h-3.5 opacity-60 hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15L15 21M21 8L8 21" />
                </svg>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DA PLANILHA (RESTRITO AO SUPORTE) */}
      {showDeleteModal && isSupportUser && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Cabeçalho do Modal */}
            <div className="bg-gradient-to-r from-rose-600 to-red-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-black leading-tight">Excluir Planilha</h3>
                  <span className="text-[10px] font-black text-rose-100 uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-white/20">
                    Apenas Suporte
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-xs leading-relaxed">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-rose-900 dark:text-rose-100 mb-1">
                    Atenção: Ação irreversível
                  </p>
                  <p>
                    Você está prestes a excluir todos os registros da planilha ({spreadsheetRows.length} linhas carregadas). 
                    O armazenamento local e as abas sincronizadas serão totalmente limpos.
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  Ao confirmar a exclusão:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                  <li>Todas as linhas da planilha serão excluídas da memória e do navegador;</li>
                  <li>Esta ação só pode ser realizada pelo usuário <strong>Suporte</strong>;</li>
                  <li>Você poderá importar um novo arquivo XLSX ou adicionar linhas manualmente a qualquer momento.</li>
                </ul>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSpreadsheet}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
