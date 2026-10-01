import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { Shipment, Cargo, Client, ShipmentStatus } from '../../types';
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
  STORAGE_KEY_SPREADSHEET_ROWS,
  STORAGE_KEY_SPREADSHEET_SHEETS,
  STORAGE_KEY_ACTIVE_SHEET
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
  Move
} from 'lucide-react';

interface ExtendedSpreadsheetRow extends TranscunhaSpreadsheetRow {
  isSynced?: boolean;
}

interface ControlShipmentsTabProps {
  items: ShipmentControlItem[];
  shipments?: Shipment[];
  cargos?: Cargo[];
  clients?: Client[];
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

// Definição das 60 colunas oficiais agrupadas por setor
export const SPREADSHEET_COLUMNS: SpreadsheetColDef[] = [
  // 1. Faturamento & Recebimento Empresa (Sky)
  { key: 'cteHoras', label: 'CTE E HORAS', category: 'Faturamento & Recebimento Empresa', categoryColor: 'bg-sky-600', type: 'text', width: 'min-w-[110px]' },
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
 * Componente de Input com Debounce para digitação 60 FPS sem congelamentos
 */
const DebouncedFilterInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  hasFilter?: boolean;
  onClear: () => void;
}> = ({ value, onChange, hasFilter, onClear }) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localVal !== value) {
        onChange(localVal);
      }
    }, 200);
    return () => clearTimeout(handler);
  }, [localVal, onChange, value]);

  return (
    <div className="relative w-full">
      <input
        type="text"
        placeholder="Filtro..."
        value={localVal}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setLocalVal(e.target.value)}
        className={`w-full pl-1.5 pr-4 py-0.5 text-[10px] rounded border outline-none font-normal transition-all ${
          hasFilter
            ? 'border-amber-400 dark:border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold focus:ring-1 focus:ring-amber-500'
            : 'border-slate-300/80 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-indigo-500'
        }`}
      />
      {hasFilter && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLocalVal('');
            onClear();
          }}
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
  clients = [] 
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

  // Classificador de Ordem e Filtros por Coluna
  const [sortConfig, setSortConfig] = useState<{ key: keyof TranscunhaSpreadsheetRow; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [activeFilterPopup, setActiveFilterPopup] = useState<keyof TranscunhaSpreadsheetRow | null>(null);
  const [showFilterRow, setShowFilterRow] = useState<boolean>(true);

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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

      return {
        id: `sys_${item.shipmentId}`,
        isSynced,
        cteHoras: syncRow?.cteHoras || item.cteNumber || item.shipmentId,
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
        return null;
      }
      return { key, direction: 'asc' };
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
      const val = String((r as any)[colKey] ?? '').trim();
      if (val && val !== '-') {
        counts.set(val, (counts.get(val) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([val, count]) => ({ val, count }));
  }, [activeRows]);

  // Filtragem e Classificação Otimizada
  const filteredRows = useMemo(() => {
    let result = activeRows.filter(row => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        !term ||
        row.cteHoras.toLowerCase().includes(term) ||
        row.cte.toLowerCase().includes(term) ||
        row.placa.toLowerCase().includes(term) ||
        row.motorista.toLowerCase().includes(term) ||
        row.cpfMotorista.toLowerCase().includes(term) ||
        row.clienteTomadorPagador.toLowerCase().includes(term) ||
        row.origem.toLowerCase().includes(term) ||
        row.destino.toLowerCase().includes(term) ||
        row.produto.toLowerCase().includes(term) ||
        row.solicitante.toLowerCase().includes(term) ||
        row.nfCliente.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      if (statusFilter !== 'all' && !row.status.toLowerCase().includes(statusFilter.toLowerCase())) return false;
      if (saldoFilter !== 'all' && row.statusSaldo.toLowerCase() !== saldoFilter.toLowerCase()) return false;
      if (faturamentoFilter !== 'all' && row.jaFaturado.toLowerCase() !== faturamentoFilter.toLowerCase()) return false;

      if (syncFilter === 'synced' && (row as ExtendedSpreadsheetRow).isSynced !== true && dataSource !== 'onedrive') return false;
      if (syncFilter === 'pending' && (row as ExtendedSpreadsheetRow).isSynced !== false) return false;

      for (const [colKey, filterVal] of Object.entries(columnFilters)) {
        if (!filterVal || filterVal.trim() === '') continue;
        const cellVal = String((row as any)[colKey] ?? '').toLowerCase();
        if (!cellVal.includes(filterVal.toLowerCase().trim())) {
          return false;
        }
      }

      return true;
    });

    if (sortConfig) {
      const { key, direction } = sortConfig;
      const colDef = SPREADSHEET_COLUMNS.find(c => c.key === key);

      result = [...result].sort((a, b) => {
        const valA = (a as any)[key];
        const valB = (b as any)[key];

        if (colDef?.type === 'number' || colDef?.type === 'currency' || colDef?.type === 'percent') {
          const numA = typeof valA === 'number' ? valA : (parseFloat(String(valA).replace(/[^\d.-]/g, '')) || 0);
          const numB = typeof valB === 'number' ? valB : (parseFloat(String(valB).replace(/[^\d.-]/g, '')) || 0);
          return direction === 'asc' ? numA - numB : numB - numA;
        }

        if (typeof valA === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(valA) && typeof valB === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(valB)) {
          const parseDate = (dStr: string) => {
            const parts = dStr.split(/[\/\s:]/);
            const d = parseInt(parts[0], 10) || 1;
            const m = (parseInt(parts[1], 10) || 1) - 1;
            const y = parseInt(parts[2], 10) || 2026;
            const h = parseInt(parts[3], 10) || 0;
            const min = parseInt(parts[4], 10) || 0;
            return new Date(y, m, d, h, min).getTime();
          };
          const timeA = parseDate(valA);
          const timeB = parseDate(valB);
          return direction === 'asc' ? timeA - timeB : timeB - timeA;
        }

        const strA = String(valA ?? '').trim();
        const strB = String(valB ?? '').trim();
        const comp = strA.localeCompare(strB, 'pt-BR', { numeric: true, sensitivity: 'base' });
        return direction === 'asc' ? comp : -comp;
      });
    }

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

  // Persistência assíncrona
  const persistChanges = useCallback((newRows: TranscunhaSpreadsheetRow[]) => {
    setIsSavedRecently(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      savePersistedSpreadsheetRows(newRows);
      setIsSavedRecently(true);
    }, 450);
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

      persistChanges(parsed.rows);
      localStorage.setItem(STORAGE_KEY_ACTIVE_SHEET, parsed.activeSheet);
      localStorage.setItem(STORAGE_KEY_SPREADSHEET_SHEETS, JSON.stringify(parsed.sheetNames));

      setNotification({
        type: 'success',
        message: `Planilha importada com sucesso! ${parsed.totalRows} registros carregados.`
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

  const handleExportExcelXlsx = () => {
    try {
      const exportData = filteredRows.map(r => {
        const obj: { [key: string]: any } = {};
        SPREADSHEET_COLUMNS.forEach(col => {
          obj[col.label.replace(' 🔄', '')] = (r as any)[col.key];
        });
        return obj;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, activeSheetName || 'Carregamento');
      
      const fileName = `PLANILHA_EMBARQUE_TRANSCUNHA_${activeSheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      setNotification({
        type: 'success',
        message: `Planilha exportada com sucesso (${fileName})!`
      });
      setTimeout(() => setNotification(null), 4000);
    } catch {
      handleExportFullCsv();
    }
  };

  const handleExportFullCsv = () => {
    const headers = SPREADSHEET_COLUMNS.map(c => c.label.replace(' 🔄', ''));
    const rows = filteredRows.map(r => {
      return SPREADSHEET_COLUMNS.map(col => {
        const val = (r as any)[col.key];
        if (typeof val === 'number') return val.toFixed(2).replace('.', ',');
        return `"${String(val || '').replace(/"/g, '""')}"`;
      }).join(';');
    });

    const csvContent = [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PLANILHA_EMBARQUE_TRANSCUNHA_${activeSheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
        <div className="bg-white dark:bg-slate-800 p-2.5 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-stretch md:items-center gap-2.5 shrink-0 select-none">
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-black text-slate-800 dark:text-slate-200 min-w-[120px] text-center truncate">
              {selectedCell ? (
                <span>{SPREADSHEET_COLUMNS.find(c => c.key === selectedCell.colKey)?.label.replace(' 🔄', '') || selectedCell.colKey}</span>
              ) : (
                <span className="text-slate-400 font-normal">Nenhuma célula</span>
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
              className="flex-1 px-3 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
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

          <div className="flex items-center gap-1.5 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 pt-1.5 md:pt-0 md:pl-2.5">
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
              className="p-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs border border-slate-300 dark:border-slate-600 disabled:opacity-40 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Refazer (Ctrl+Y)"
              className="p-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs border border-slate-300 dark:border-slate-600 disabled:opacity-40 transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* TABELA COM SCROLL OTIMIZADO */}
        <div className="flex-1 min-h-0 overflow-auto bg-white dark:bg-slate-850">
          {viewMode === 'full' ? (
            <table className="w-full text-left text-[11px] whitespace-nowrap border-collapse">
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
                <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-tight border-b border-slate-300 dark:border-slate-700">
                  <th className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-400">
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
                        className={`px-2 py-1 border-r border-slate-200 dark:border-slate-800 relative ${
                          col.width || 'min-w-[115px]'
                        } ${col.isSynchronized ? 'bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300' : ''}`}
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
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-0 top-full mt-1.5 w-60 bg-white dark:bg-slate-850 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 p-2.5 text-xs text-slate-800 dark:text-slate-200 font-sans normal-case animate-in fade-in zoom-in-95 duration-100"
                          >
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {col.label.replace(' 🔄', '')}
                              </span>
                              <button onClick={() => setActiveFilterPopup(null)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div className="py-1.5 space-y-1 border-b border-slate-200 dark:border-slate-700">
                              <button
                                onClick={() => {
                                  setSortConfig({ key: col.key, direction: 'asc' });
                                  setActiveFilterPopup(null);
                                }}
                                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-[11px] ${
                                  isSorted && sortConfig.direction === 'asc' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                                <span>{col.type === 'number' || col.type === 'currency' ? 'Menor para Maior (0 → 9)' : 'Crescente (A → Z)'}</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSortConfig({ key: col.key, direction: 'desc' });
                                  setActiveFilterPopup(null);
                                }}
                                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-[11px] ${
                                  isSorted && sortConfig.direction === 'desc' ? 'bg-amber-500 text-slate-950 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                                <span>{col.type === 'number' || col.type === 'currency' ? 'Maior para Menor (9 → 0)' : 'Decrescente (Z → A)'}</span>
                              </button>
                            </div>

                            {distinctValues.length > 0 && (
                              <div className="pt-2">
                                <span className="text-[10px] text-slate-400 font-bold block mb-1">Valores Frequentes:</span>
                                <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                                  {distinctValues.map(({ val, count }) => (
                                    <button
                                      key={val}
                                      onClick={() => {
                                        handleSetColumnFilter(col.key, val);
                                        setActiveFilterPopup(null);
                                      }}
                                      className="w-full flex items-center justify-between px-1.5 py-0.5 rounded text-left text-[11px] hover:bg-slate-100 dark:hover:bg-slate-800 truncate"
                                    >
                                      <span className="truncate">{val}</span>
                                      <span className="text-[9px] opacity-60 ml-1">({count})</span>
                                    </button>
                                  ))}
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

              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-mono text-[11px]">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={61} className="px-4 py-12 text-center text-slate-400 font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-7 h-7 text-amber-400 opacity-60" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          Nenhum registro localizado com os filtros aplicados.
                        </span>
                        {(activeColumnFiltersCount > 0 || sortConfig) && (
                          <button
                            onClick={handleClearAllColumnFilters}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 cursor-pointer"
                          >
                            Limpar Filtros das Colunas
                          </button>
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
                        className={`hover:bg-indigo-50/30 dark:hover:bg-slate-750 transition-colors group ${
                          isRowSelected ? 'bg-indigo-50/20 dark:bg-slate-700/30' : ''
                        }`}
                      >
                        <td className="px-2 py-1 text-center text-slate-400 font-sans text-[10px] bg-slate-50/50 dark:bg-slate-900/40 border-r border-slate-200 dark:border-slate-800">
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
                          if (col.type === 'currency' && typeof rawValue === 'number') {
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
                              } ${col.isSynchronized ? 'bg-amber-50/10 dark:bg-amber-950/10' : ''} ${
                                isSelected ? 'ring-2 ring-emerald-500 ring-inset z-10 bg-emerald-500/10 dark:bg-emerald-500/20' : ''
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
                                    className="w-full bg-white dark:bg-slate-900 border border-emerald-500 rounded px-1 py-0 text-xs text-slate-900 dark:text-white outline-none"
                                  >
                                    {col.options.map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
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
                                    className="w-full bg-white dark:bg-slate-900 border border-emerald-500 rounded px-1 py-0 text-xs text-slate-900 dark:text-white outline-none font-mono"
                                  />
                                )
                              ) : (
                                <div className="flex items-center gap-1 overflow-hidden">
                                  {col.key === 'cteHoras' && (row as ExtendedSpreadsheetRow).isSynced && (
                                    <span title="Sincronizado" className="text-emerald-500 font-sans text-xs shrink-0">✅</span>
                                  )}
                                  <span className={`truncate ${
                                    col.key === 'placa' ? 'font-black text-slate-900 dark:text-white' :
                                    col.key === 'saldo' ? 'font-bold text-indigo-600 dark:text-indigo-400' :
                                    col.key === 'valorFreteMotorista' ? 'font-bold text-rose-600 dark:text-rose-400' :
                                    col.key === 'statusSaldo' && rawValue === 'PAGO' ? 'text-emerald-600 dark:text-emerald-400 font-bold' :
                                    col.key === 'statusSaldo' && rawValue === 'PENDENTE' ? 'text-amber-600 dark:text-amber-400 font-bold' :
                                    col.isSynchronized ? 'text-amber-800 dark:text-amber-300 font-semibold' :
                                    'text-slate-800 dark:text-slate-200'
                                  }`}>
                                    {displayValue}
                                  </span>
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
              <tfoot className="sticky bottom-0 z-20 bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700 font-mono font-bold text-[11px] shadow-lg">
                <tr>
                  <td className="px-2 py-1.5 text-center text-slate-500 border-r border-slate-300 dark:border-slate-800">
                    <select
                      value={totalAggregationType}
                      onChange={(e) => setTotalAggregationType(e.target.value as any)}
                      className="bg-transparent text-[10px] font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
                    >
                      <option value="sum">SOMA</option>
                      <option value="avg">MÉDIA</option>
                      <option value="count">CONTAGEM</option>
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
                            col.isSynchronized ? 'text-amber-800 dark:text-amber-400 bg-amber-50/20' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {display}
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
                      <td key={col.key} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-800">
                        -
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          ) : (
            // Visão Resumo
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                <tr>
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {paginatedRows.length === 0 ? (
                  <tr><td colSpan={13} className="px-4 py-8 text-center text-slate-400">Nenhum registro localizado.</td></tr>
                ) : (
                  paginatedRows.map((r) => {
                    const margem = r.freteBrutoEmpresa - r.valorFreteMotorista - r.pedagio;
                    const margemPct = r.freteBrutoEmpresa > 0 ? (margem / r.freteBrutoEmpresa) * 100 : 0;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors">
                        <td className="px-3 py-2 font-bold font-mono">
                          {(r as ExtendedSpreadsheetRow).isSynced && <span className="text-emerald-500 mr-1">✅</span>}
                          {r.cteHoras || r.cte || '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300 font-mono">{r.dataEmbarque || '-'}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{r.origem} → {r.destino}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-medium max-w-[180px] truncate">{r.clienteTomadorPagador}</td>
                        <td className="px-3 py-2 font-mono">
                          <span className="font-bold text-slate-900 dark:text-white block">{r.placa}</span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">{r.motorista}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white font-mono">{r.peso.toFixed(2)} ton</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(r.freteBrutoEmpresa)}</td>
                        <td className="px-3 py-2 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(r.valorFreteMotorista)}</td>
                        <td className="px-3 py-2 text-right text-slate-600 dark:text-slate-400 font-mono">{r.pedagio > 0 ? formatCurrency(r.pedagio) : '-'}</td>
                        <td className="px-3 py-2 text-right text-blue-600 font-mono font-semibold">{r.valorAdiantamento > 0 ? formatCurrency(r.valorAdiantamento) : '-'}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(r.saldo)}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-600 font-bold">{formatCurrency(margem)} ({margemPct.toFixed(0)}%)</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.statusSaldo === 'PAGO' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
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
          <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-1.5 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 select-none">
            <span className="text-[11px] text-slate-500">
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
    <div className="space-y-6">
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

      {/* BANNER PRINCIPAL DA CONTROLADORIA */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 p-5 sm:p-6 shadow-xl text-white">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Planilha Oficial Editável Transcunha • Alta Performance
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Controladoria & Planilha de Embarques
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
              Abra em janela sobreposta para expandir, redimensionar e movimentar livremente sobre toda a tela do sistema.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setIsWindowOpen(true);
                setWindowMode('fullscreen');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
              title="Abrir em janela sobreposta maximizada"
            >
              <Maximize2 className="w-4 h-4 text-white" />
              Maximizar Planilha
            </button>

            <button
              onClick={() => {
                setIsWindowOpen(true);
                setWindowMode('floating');
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm"
              title="Abrir como janela flutuante arrastável"
            >
              <Move className="w-4 h-4 text-indigo-300" />
              Janela Flutuante
            </button>

            <button
              onClick={handleTriggerSync}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Sincronizar ({syncedCount})
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Importar
            </button>

            <button
              onClick={handleExportExcelXlsx}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Exportar XLSX
            </button>

            <button
              onClick={handleResetSample}
              title="Restaurar dados originais"
              className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {notification && (
          <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            notification.type === 'success' 
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' 
              : notification.type === 'info'
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100 text-white ml-2">✕</button>
          </div>
        )}
      </div>

      {/* BARRA DE ORIGEM E ABAS */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Origem:</span>
          <button
            onClick={() => setDataSource('onedrive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dataSource === 'onedrive'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Planilha Editável ({spreadsheetRows.length} linhas)
          </button>
          <button
            onClick={() => setDataSource('system')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              dataSource === 'system'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Embarques do Sistema ({items.length})
            {syncedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                {syncedCount} sincronizados
              </span>
            )}
          </button>
        </div>

        {dataSource === 'onedrive' && availableSheets.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 lg:pb-0">
            <span className="text-xs font-semibold text-slate-400 mr-1 shrink-0">Aba:</span>
            {availableSheets.map(sheet => (
              <button
                key={sheet}
                onClick={() => handleSheetChange(sheet)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeSheetName === sheet
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {sheet}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards Estratégicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Frete Bruto Empresa</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            {formatCurrency(totalFreteEmpresa)}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {filteredRows.length} viagens • {totalTonnage.toFixed(2)} ton
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Custo Frete Motorista</span>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
            {formatCurrency(totalFreteMotorista)}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {totalFreteEmpresa > 0 ? ((totalFreteMotorista / totalFreteEmpresa) * 100).toFixed(1) : 0}% da receita
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Margem Bruta Retida</span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {formatCurrency(margemBruta)}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold block">
            Margem de {margemPercent.toFixed(1)}%
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Acertos de Motoristas</span>
          <div className="flex items-center justify-between mt-0.5">
            <div>
              <span className="text-[10px] text-slate-400 font-semibold">Adiant:</span>{' '}
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalAdiantamentos)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold">Saldo:</span>{' '}
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(totalSaldos)}</span>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Pedágios: {formatCurrency(totalPedagios)}</span>
        </div>
      </div>

      {/* BARRA DE FILTROS GERAIS E CONTROLES */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar registros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilterRow(prev => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              showFilterRow
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {showFilterRow ? 'Filtros em Coluna' : 'Exibir Filtros'}
          </button>

          {(activeColumnFiltersCount > 0 || sortConfig !== null) && (
            <button
              onClick={handleClearAllColumnFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Limpar ({activeColumnFiltersCount + (sortConfig ? 1 : 0)})
            </button>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer"
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
            className="px-2.5 py-1.5 rounded-xl text-xs border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none cursor-pointer"
          >
            <option value="all">Saldo: Todos</option>
            <option value="PAGO">Pago</option>
            <option value="PENDENTE">Pendente</option>
          </select>

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl text-xs border border-indigo-300 dark:border-indigo-600 bg-indigo-50/40 dark:bg-slate-900 text-indigo-900 dark:text-indigo-300 font-bold outline-none cursor-pointer"
          >
            <option value={25}>25 por pág.</option>
            <option value={50}>50 por pág.</option>
            <option value={100}>100 por pág.</option>
            <option value={200}>200 por pág.</option>
            <option value={-1}>Todos ({filteredRows.length})</option>
          </select>

          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-700/60 p-0.5 border border-slate-200 dark:border-slate-600">
            <button
              onClick={() => setViewMode('full')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'full' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Grade
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'summary' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Resumo
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DA TABELA NO MODO NORMAL DA PÁGINA */}
      <div className="h-[700px] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-850">
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
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar
                </button>

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
            <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
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
    </div>
  );
};
