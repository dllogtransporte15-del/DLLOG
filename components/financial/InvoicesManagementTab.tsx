import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { 
  FinancialInvoice, 
  CostCenter, 
  CostType, 
  InvoiceCostNature, 
  InvoicePaymentStatus, 
  User 
} from '../../types';
import { 
  financialInvoiceService,
  subscribeToFinancialInvoices,
  getNextInvoiceId,
  findDuplicateInvoice,
  type DuplicateInvoiceMatch
} from '../../services/financialInvoiceService';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  FileText, 
  UploadCloud, 
  Trash2, 
  Edit3, 
  Eye, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  X, 
  Users, 
  Building2, 
  Tag, 
  File, 
  PieChart, 
  BarChart3, 
  Printer, 
  FileDown, 
  ExternalLink, 
  Briefcase, 
  Package, 
  Box, 
  Layers, 
  Sparkles,
  Paperclip,
  Loader2,
  Receipt,
  CreditCard,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  Copy
} from 'lucide-react';
import { extractDataFromInvoiceFile, extractDataFromBoletoFile } from '../../utils/invoiceExtractionService';
import { openDocumentInNewTab } from '../../utils/documentViewer';
import { parseBrazilianCurrency, formatBrl } from '../../utils/financialCalculations';

interface InvoicesManagementTabProps {
  users: User[];
  currentUser?: User | null;
  onNavigateToPayables?: () => void;
}

const NATURE_CONFIG: Record<InvoiceCostNature, { label: string; icon: React.ElementType; badgeClass: string }> = {
  servico: {
    label: 'Prestação de Serviço',
    icon: Briefcase,
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800'
  },
  produto: {
    label: 'Aquisição de Produto',
    icon: Package,
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  },
  bem: {
    label: 'Compra de Bem / Ativo',
    icon: Box,
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800'
  },
  outros: {
    label: 'Outras Despesas',
    icon: Tag,
    badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  }
};

const STATUS_CONFIG: Record<InvoicePaymentStatus, { label: string; icon: React.ElementType; badgeClass: string }> = {
  Pendente: {
    label: 'Pendente',
    icon: Clock,
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
  },
  Pago: {
    label: 'Pago',
    icon: CheckCircle2,
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
  },
  Atrasado: {
    label: 'Atrasado',
    icon: AlertCircle,
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
  },
  Cancelado: {
    label: 'Cancelado',
    icon: XCircle,
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700'
  }
};

export const InvoicesManagementTab: React.FC<InvoicesManagementTabProps> = ({
  users,
  currentUser,
  onNavigateToPayables
}) => {
  // State: Dados principais
  const [invoices, setInvoices] = useState<FinancialInvoice[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [costTypes, setCostTypes] = useState<CostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State: Visão ativa ('table' ou 'analytics')
  const [activeView, setActiveView] = useState<'table' | 'analytics'>('table');

  // State: Filtros de listagem
  const [searchTerm, setSearchTerm] = useState('');
  const [natureFilter, setNatureFilter] = useState<string>('all');
  const [costCenterFilter, setCostCenterFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodPreset, setPeriodPreset] = useState<
    'today' | 'yesterday' | 'current_week' | 'current_month' | 'last_month' | 'current_year' | 'custom' | 'all'
  >('today');
  const [dateBasis, setDateBasis] = useState<'issue' | 'due' | 'created'>('issue');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [onlyDuplicatesFilter, setOnlyDuplicatesFilter] = useState(false);

  // State: Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type?: string } | null>(null);

  // State: Modais de cadastro rápido inline
  const [isQuickCostCenterModalOpen, setIsQuickCostCenterModalOpen] = useState(false);
  const [quickCenterCode, setQuickCenterCode] = useState('');
  const [quickCenterName, setQuickCenterName] = useState('');
  const [quickCenterDesc, setQuickCenterDesc] = useState('');

  const [isQuickCostTypeModalOpen, setIsQuickCostTypeModalOpen] = useState(false);
  const [quickTypeName, setQuickTypeName] = useState('');
  const [quickTypeNature, setQuickTypeNature] = useState<InvoiceCostNature>('servico');
  const [quickTypeDesc, setQuickTypeDesc] = useState('');

  // Form State: Nota Fiscal
  const [formNumber, setFormNumber] = useState('');
  const [formSeries, setFormSeries] = useState('');
  const [formAccessKey, setFormAccessKey] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formCnpjCpf, setFormCnpjCpf] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPayableAmount, setFormPayableAmount] = useState('');
  const [formIssueDate, setFormIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPaymentDate, setFormPaymentDate] = useState('');
  const [formStatus, setFormStatus] = useState<InvoicePaymentStatus>('Pendente');
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>('Boleto');
  const [formPaymentDetails, setFormPaymentDetails] = useState('');
  const [formNature, setFormNature] = useState<InvoiceCostNature>('servico');
  const [formCostTypeId, setFormCostTypeId] = useState('');
  const [formCostCenterId, setFormCostCenterId] = useState('');
  const [formResponsibleUserId, setFormResponsibleUserId] = useState(currentUser?.id || '');
  const [formDescription, setFormDescription] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Form State: Anexo de arquivo da Nota Fiscal e Extração Inteligente
  const [formFileUrl, setFormFileUrl] = useState<string | undefined>(undefined);
  const [formFileName, setFormFileName] = useState<string | undefined>(undefined);
  const [formFileType, setFormFileType] = useState<string | undefined>(undefined);
  const [formFileSize, setFormFileSize] = useState<number | undefined>(undefined);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State: Anexo de Boleto Bancário e Extração Automática
  const [formBoletoFileUrl, setFormBoletoFileUrl] = useState<string | undefined>(undefined);
  const [formBoletoFileName, setFormBoletoFileName] = useState<string | undefined>(undefined);
  const [formBoletoFileType, setFormBoletoFileType] = useState<string | undefined>(undefined);
  const [formBoletoFileSize, setFormBoletoFileSize] = useState<number | undefined>(undefined);
  const [isExtractingBoleto, setIsExtractingBoleto] = useState(false);
  const [boletoExtractionSuccess, setBoletoExtractionSuccess] = useState<string | null>(null);
  const boletoFileInputRef = useRef<HTMLInputElement>(null);

  // State: Blob URL seguro para visualização em iframe sem bloqueio do navegador
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!previewFile?.url) {
      setPreviewBlobUrl(null);
      return;
    }

    let activeBlobUrl: string | null = null;
    const rawUrl = previewFile.url;

    if (rawUrl.startsWith('data:')) {
      try {
        const parts = rawUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        let mime = mimeMatch ? mimeMatch[1] : (previewFile.type || 'application/octet-stream');
        if (previewFile.name.toLowerCase().endsWith('.pdf')) {
          mime = 'application/pdf';
        }

        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        activeBlobUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl(activeBlobUrl);
      } catch (err) {
        console.warn('Falha ao converter data URL para blob:', err);
        setPreviewBlobUrl(rawUrl);
      }
    } else {
      setPreviewBlobUrl(rawUrl);
    }

    return () => {
      if (activeBlobUrl && activeBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [previewFile]);

  // Carregamento principal e sincronização em tempo real (Realtime)
  const loadData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) {
      setLoading(true);
    } else {
      setIsSyncing(true);
    }
    try {
      const [invs, centers, types] = await Promise.all([
        financialInvoiceService.getInvoices(users),
        financialInvoiceService.getCostCenters(),
        financialInvoiceService.getCostTypes()
      ]);
      if (Array.isArray(invs)) {
        setInvoices(invs);
      }
      setCostCenters(centers);
      setCostTypes(types);

      // Pre-seleção padrão
      if (centers.length > 0 && !formCostCenterId) {
        setFormCostCenterId(centers[0].id);
      }
      if (types.length > 0 && !formCostTypeId) {
        setFormCostTypeId(types[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de notas fiscais:', err);
      // Fallback defensivo de emergência
      try {
        const local = localStorage.getItem('transcunha_financial_invoices');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInvoices(parsed);
          }
        }
      } catch {}
    } finally {
      if (showLoadingSpinner) setLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData(true);

    // Escuta em tempo real: qualquer nota inserida, editada ou excluída por qualquer usuário atualiza instantaneamente
    const unsubscribe = subscribeToFinancialInvoices(() => {
      loadData(false);
    });

    return () => {
      unsubscribe();
    };
  }, [users]);

  // ID prospectivo para o próximo lançamento (ex: 'nf-1', 'nf-12'...)
  const prospectiveNextId = useMemo(() => {
    return getNextInvoiceId(invoices);
  }, [invoices]);

  // Identificação em tempo real de notas fiscais repetidas/duplicadas no formulário de lançamento
  const duplicateInvoiceMatch: DuplicateInvoiceMatch = useMemo(() => {
    if (!isFormModalOpen) return { isDuplicate: false };
    return findDuplicateInvoice(
      {
        invoiceNumber: formNumber,
        series: formSeries,
        accessKey: formAccessKey,
        supplierName: formSupplier,
        supplierCnpjCpf: formCnpjCpf
      },
      invoices,
      editingInvoiceId || undefined
    );
  }, [
    isFormModalOpen,
    formNumber,
    formSeries,
    formAccessKey,
    formSupplier,
    formCnpjCpf,
    invoices,
    editingInvoiceId
  ]);

  // Mapeamento de notas repetidas já existentes na base para alerta e auditoria visual
  const duplicateInvoicesMap = useMemo(() => {
    const map = new Map<string, FinancialInvoice>();
    if (!Array.isArray(invoices) || invoices.length < 2) return map;

    for (let i = 0; i < invoices.length; i++) {
      for (let j = i + 1; j < invoices.length; j++) {
        const match = findDuplicateInvoice(invoices[i], [invoices[j]]);
        if (match.isDuplicate) {
          map.set(invoices[i].id, invoices[j]);
          map.set(invoices[j].id, invoices[i]);
        }
      }
    }
    return map;
  }, [invoices]);

  // Tipos filtrados pela modalidade ativa no form
  const availableCostTypesForForm = useMemo(() => {
    return costTypes.filter(t => t.nature === formNature);
  }, [costTypes, formNature]);

  // Se trocar a modalidade e o tipo atual não pertencer a ela, seleciona o primeiro disponível
  useEffect(() => {
    if (availableCostTypesForForm.length > 0) {
      const exists = availableCostTypesForForm.some(t => t.id === formCostTypeId);
      if (!exists) {
        setFormCostTypeId(availableCostTypesForForm[0].id);
      }
    }
  }, [formNature, availableCostTypesForForm, formCostTypeId]);

  // Tratamento de arquivo anexo com Leitura e Extração Automática
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('O arquivo selecionado excede o limite máximo permitido de 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const detectedType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined);
      setFormFileUrl(base64);
      setFormFileName(file.name);
      setFormFileType(detectedType);
      setFormFileSize(file.size);

      // Inicia leitura e extração automática dos dados fiscais
      setIsExtracting(true);
      setExtractionSuccess(null);
      try {
        const extracted = await extractDataFromInvoiceFile(file);
        let count = 0;

        if (extracted.invoiceNumber) {
          setFormNumber(extracted.invoiceNumber);
          count++;
        }
        if (extracted.series) {
          setFormSeries(extracted.series);
          count++;
        }
        if (extracted.totalAmount !== undefined && extracted.totalAmount > 0) {
          const formatted = extracted.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          setFormAmount(formatted);
          setFormPayableAmount(formatted);
          count++;
        }
        if (extracted.supplierName) {
          setFormSupplier(extracted.supplierName);
          count++;
        }
        if (extracted.supplierCnpjCpf) {
          setFormCnpjCpf(extracted.supplierCnpjCpf);
          count++;
        }
        if (extracted.issueDate) {
          setFormIssueDate(extracted.issueDate);
          count++;
        }
        if (extracted.dueDate) {
          setFormDueDate(extracted.dueDate);
        }
        if (extracted.accessKey) {
          setFormAccessKey(extracted.accessKey);
        }
        if (extracted.paymentMethod) {
          setFormPaymentMethod(extracted.paymentMethod);
        }
        if (extracted.paymentDetails) {
          setFormPaymentDetails(extracted.paymentDetails);
        }
        if (extracted.description && !formDescription) {
          setFormDescription(extracted.description);
        }

        if (count > 0) {
          setExtractionSuccess(`✨ ${count} campos extraídos automaticamente da Nota Fiscal anexada!`);
        }
      } catch (err) {
        console.warn('Erro ao extrair dados fiscais:', err);
      } finally {
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFormFileUrl(undefined);
    setFormFileName(undefined);
    setFormFileType(undefined);
    setFormFileSize(undefined);
    setIsExtracting(false);
    setExtractionSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Tratamento do Anexo de Boleto com Leitura e Preenchimento Automático
  const handleBoletoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('O boleto selecionado excede o limite máximo permitido de 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const detectedType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined);
      setFormBoletoFileUrl(base64);
      setFormBoletoFileName(file.name);
      setFormBoletoFileType(detectedType);
      setFormBoletoFileSize(file.size);

      // Leitura automática dos dados do boleto
      setIsExtractingBoleto(true);
      setBoletoExtractionSuccess(null);
      try {
        const extracted = await extractDataFromBoletoFile(file);
        const updatedFields: string[] = [];

        // 1. Atualização automática do "Valor a Pagar (R$)"
        if (extracted.payableAmount !== undefined && extracted.payableAmount > 0) {
          const formatted = extracted.payableAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          setFormPayableAmount(formatted);
          if (!formAmount || formAmount === '0,00') {
            setFormAmount(formatted);
          }
          updatedFields.push(`Valor a Pagar (R$ ${formatted})`);
        }

        // 2. Atualização automática da "Data de Vencimento"
        if (extracted.dueDate) {
          setFormDueDate(extracted.dueDate);
          const [ano, mes, dia] = extracted.dueDate.split('-');
          updatedFields.push(`Vencimento (${dia}/${mes}/${ano})`);
        }

        // 3. Atualização da Forma de Pagamento para Boleto
        setFormPaymentMethod('Boleto');

        // 4. Preenchimento de Linha Digitável
        if (extracted.digitableLine) {
          setFormPaymentDetails(extracted.digitableLine);
          updatedFields.push('Linha Digitável');
        }

        // 5. Sugestão de Fornecedor / Beneficiário se ainda vazio
        if (extracted.beneficiaryName && !formSupplier) {
          setFormSupplier(extracted.beneficiaryName);
          updatedFields.push('Favorecido');
        }
        if (extracted.beneficiaryCnpjCpf && !formCnpjCpf) {
          setFormCnpjCpf(extracted.beneficiaryCnpjCpf);
        }

        if (updatedFields.length > 0) {
          setBoletoExtractionSuccess(`✨ Boleto identificado com sucesso! ${updatedFields.join(', ')} atualizados automaticamente.`);
        } else {
          setBoletoExtractionSuccess('✨ Boleto bancário anexado com sucesso!');
        }
      } catch (err) {
        console.warn('Erro ao extrair dados do boleto:', err);
      } finally {
        setIsExtractingBoleto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBoletoFile = () => {
    setFormBoletoFileUrl(undefined);
    setFormBoletoFileName(undefined);
    setFormBoletoFileType(undefined);
    setFormBoletoFileSize(undefined);
    setIsExtractingBoleto(false);
    setBoletoExtractionSuccess(null);
    if (boletoFileInputRef.current) {
      boletoFileInputRef.current.value = '';
    }
  };

  // Abrir modal de criação
  const handleOpenCreateModal = () => {
    setEditingInvoiceId(null);
    setFormNumber('');
    setFormSeries('');
    setFormAccessKey('');
    setFormSupplier('');
    setFormCnpjCpf('');
    setFormAmount('');
    setFormPayableAmount('');
    setFormIssueDate(new Date().toISOString().split('T')[0]);
    setFormDueDate(new Date().toISOString().split('T')[0]);
    setFormPaymentDate('');
    setFormStatus('Pendente');
    setFormPaymentMethod('Boleto');
    setFormPaymentDetails('');
    setFormNature('servico');
    setFormDescription('');
    setFormNotes('');
    setFormFileUrl(undefined);
    setFormFileName(undefined);
    setFormFileType(undefined);
    setFormFileSize(undefined);
    setIsExtracting(false);
    setExtractionSuccess(null);
    setFormBoletoFileUrl(undefined);
    setFormBoletoFileName(undefined);
    setFormBoletoFileType(undefined);
    setFormBoletoFileSize(undefined);
    setIsExtractingBoleto(false);
    setBoletoExtractionSuccess(null);
    if (boletoFileInputRef.current) {
      boletoFileInputRef.current.value = '';
    }

    // Selecionar o usuário logado ou primeiro usuário disponível
    const selectedUser = users.find(u => u.id === currentUser?.id) || users[0];
    if (selectedUser) {
      setFormResponsibleUserId(selectedUser.id);
    }
    if (costCenters.length > 0) {
      setFormCostCenterId(costCenters[0].id);
    }

    setIsFormModalOpen(true);
  };

  // Função utilitária para formatar máscara monetária ao sair do campo (onBlur)
  const handleFormatAmountBlur = (
    val: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    mirrorSetter?: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (!val || !val.trim()) return;
    const num = parseBrazilianCurrency(val);
    if (!isNaN(num) && num > 0) {
      const formatted = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      setter(formatted);
      if (mirrorSetter) {
        mirrorSetter((prev) => (!prev || prev === val ? formatted : prev));
      }
    }
  };

  // Abrir modal de edição
  const handleOpenEditModal = (inv: FinancialInvoice) => {
    setEditingInvoiceId(inv.id);
    setFormNumber(inv.invoiceNumber);
    setFormSeries(inv.series || '');
    setFormAccessKey(inv.accessKey || '');
    setFormSupplier(inv.supplierName);
    setFormCnpjCpf(inv.supplierCnpjCpf || '');
    setFormAmount(inv.totalAmount ? inv.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    setFormPayableAmount((inv.payableAmount ?? inv.totalAmount) ? (inv.payableAmount ?? inv.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
    setFormIssueDate(inv.issueDate);
    setFormDueDate(inv.dueDate);
    setFormPaymentDate(inv.paymentDate || '');
    setFormStatus(inv.status);
    setFormPaymentMethod(inv.paymentMethod || 'Boleto');
    setFormPaymentDetails(inv.paymentDetails || '');
    setFormNature(inv.costNature);
    setFormCostTypeId(inv.costTypeId);
    setFormCostCenterId(inv.costCenterId);
    setFormResponsibleUserId(inv.responsibleUserId);
    setFormDescription(inv.description);
    setFormNotes(inv.notes || '');
    setFormFileUrl(inv.fileUrl);
    setFormFileName(inv.fileName);
    setFormFileType(inv.fileType);
    setFormFileSize(inv.fileSize);
    setFormBoletoFileUrl(inv.boletoFileUrl);
    setFormBoletoFileName(inv.boletoFileName);
    setFormBoletoFileType(inv.boletoFileType);
    setFormBoletoFileSize(inv.boletoFileSize);
    setIsExtracting(false);
    setExtractionSuccess(null);
    setIsExtractingBoleto(false);
    setBoletoExtractionSuccess(null);

    setIsFormModalOpen(true);
  };

  // Salvar nota fiscal (Criar / Editar)
  const handleSubmitInvoiceForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNumber || !formSupplier || !formAmount || !formIssueDate || !formDueDate) {
      alert('Por favor, preencha os campos obrigatórios: Número da NF, Fornecedor, Valor Total e Datas.');
      return;
    }

    const totalNum = parseBrazilianCurrency(formAmount);
    const payableNum = formPayableAmount ? parseBrazilianCurrency(formPayableAmount) : totalNum;

    if (totalNum <= 0) {
      alert('Por favor, informe um Valor Total válido para a Nota Fiscal.');
      return;
    }

    const selectedResponsible = users.find(u => u.id === formResponsibleUserId);
    const selectedCenter = costCenters.find(c => c.id === formCostCenterId);
    const selectedType = costTypes.find(t => t.id === formCostTypeId);

    const payload: Omit<FinancialInvoice, 'id' | 'createdAt'> = {
      invoiceNumber: formNumber.trim(),
      series: formSeries.trim() || undefined,
      accessKey: formAccessKey.replace(/\s+/g, '') || undefined,
      supplierName: formSupplier.trim(),
      supplierCnpjCpf: formCnpjCpf.trim() || undefined,
      totalAmount: totalNum,
      payableAmount: payableNum > 0 ? payableNum : totalNum,
      issueDate: formIssueDate,
      dueDate: formDueDate,
      paymentDate: formStatus === 'Pago' ? (formPaymentDate || formDueDate) : undefined,
      status: formStatus,
      paymentMethod: formPaymentMethod as any,
      paymentDetails: formPaymentDetails.trim() || undefined,
      costNature: formNature,
      costTypeId: formCostTypeId,
      costTypeName: selectedType?.name || 'Geral',
      costCenterId: formCostCenterId,
      costCenterName: selectedCenter?.name || 'Geral',
      responsibleUserId: formResponsibleUserId,
      responsibleUserName: selectedResponsible?.name || 'Não informado',
      responsibleUserProfile: String(selectedResponsible?.profile || ''),
      description: formDescription.trim(),
      notes: formNotes.trim() || undefined,
      fileUrl: formFileUrl,
      fileName: formFileName,
      fileType: formFileType,
      fileSize: formFileSize,
      boletoFileUrl: formBoletoFileUrl,
      boletoFileName: formBoletoFileName,
      boletoFileType: formBoletoFileType,
      boletoFileSize: formBoletoFileSize
    };

    // REGRA DE SEGURANÇA: Bloqueia lançamento duplicado
    if (duplicateInvoiceMatch.isDuplicate && duplicateInvoiceMatch.matchedInvoice) {
      alert(duplicateInvoiceMatch.message || `Ação bloqueada: A Nota Fiscal nº "${formNumber}" já está cadastrada no sistema sob o ID [${duplicateInvoiceMatch.matchedInvoice.id}] pelo fornecedor "${duplicateInvoiceMatch.matchedInvoice.supplierName}". O sistema não permite lançamentos repetidos.`);
      return;
    }

    setIsSaving(true);
    try {
      const saved = await financialInvoiceService.saveInvoice(payload, editingInvoiceId || undefined);
      if (editingInvoiceId) {
        setInvoices(prev => prev.map(inv => inv.id === editingInvoiceId ? saved : inv));
      } else {
        setInvoices(prev => [saved, ...prev]);
      }
      setIsFormModalOpen(false);

      if (formBoletoFileUrl && onNavigateToPayables) {
        onNavigateToPayables();
      }
    } catch (err: any) {
      console.error('Erro ao salvar nota fiscal:', err);
      alert(err?.message || 'Houve um erro ao salvar a nota fiscal. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Alteração rápida de status Pago / Pendente
  const handleToggleStatus = async (inv: FinancialInvoice) => {
    const newStatus: InvoicePaymentStatus = inv.status === 'Pago' ? 'Pendente' : 'Pago';
    const payDate = newStatus === 'Pago' ? new Date().toISOString().split('T')[0] : undefined;

    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: newStatus, paymentDate: payDate } : i));
    await financialInvoiceService.updateInvoiceStatus(inv.id, newStatus, payDate);
  };

  // Excluir Nota Fiscal
  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este lançamento de Nota Fiscal?')) return;
    setInvoices(prev => prev.filter(i => i.id !== id));
    await financialInvoiceService.deleteInvoice(id);
  };

  // Cadastro Rápido: Novo Centro de Custo
  const handleSaveQuickCostCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCenterName.trim()) return;

    try {
      const created = await financialInvoiceService.addCostCenter({
        code: quickCenterCode.trim() || undefined,
        name: quickCenterName.trim(),
        description: quickCenterDesc.trim() || undefined,
        isDefault: false
      });
      setCostCenters(prev => [...prev, created]);
      setFormCostCenterId(created.id);
      setQuickCenterCode('');
      setQuickCenterName('');
      setQuickCenterDesc('');
      setIsQuickCostCenterModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Cadastro Rápido: Novo Tipo de Custo
  const handleSaveQuickCostType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTypeName.trim()) return;

    try {
      const created = await financialInvoiceService.addCostType({
        name: quickTypeName.trim(),
        nature: quickTypeNature,
        description: quickTypeDesc.trim() || undefined,
        isDefault: false
      });
      setCostTypes(prev => [...prev, created]);
      setFormNature(quickTypeNature);
      setFormCostTypeId(created.id);
      setQuickTypeName('');
      setQuickTypeDesc('');
      setIsQuickCostTypeModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Datas de referência com cálculo local preciso
  const now = new Date();
  const getLocalDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString(now);

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);

  // Segunda-feira até Domingo da semana atual
  const currentDayOfWeek = now.getDay();
  const diffToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  const startOfWeekDate = new Date(now);
  startOfWeekDate.setDate(now.getDate() - diffToMonday);
  const startOfWeekStr = getLocalDateString(startOfWeekDate);

  const endOfWeekDate = new Date(startOfWeekDate);
  endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);
  const endOfWeekStr = getLocalDateString(endOfWeekDate);

  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const currentYearPrefix = `${now.getFullYear()}-`;

  // Função para extrair a data comparada de acordo com dateBasis ('issue' | 'due' | 'created')
  const getInvoiceComparisonDate = (inv: FinancialInvoice, basis: 'issue' | 'due' | 'created'): string => {
    if (basis === 'due') {
      return inv.dueDate || inv.issueDate || '';
    }
    if (basis === 'created') {
      return inv.createdAt ? inv.createdAt.split('T')[0] : (inv.issueDate || '');
    }
    return inv.issueDate || (inv.createdAt ? inv.createdAt.split('T')[0] : '');
  };

  // Contadores para os botões de período
  const todayCount = useMemo(() => {
    return invoices.filter(i => getInvoiceComparisonDate(i, dateBasis) === todayStr).length;
  }, [invoices, dateBasis, todayStr]);

  const currentMonthCount = useMemo(() => {
    return invoices.filter(i => getInvoiceComparisonDate(i, dateBasis).startsWith(currentMonthPrefix)).length;
  }, [invoices, dateBasis, currentMonthPrefix]);

  // Filtragem dos dados
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // 1. Busca textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesNumber = inv.invoiceNumber.toLowerCase().includes(term);
        const matchesSupplier = inv.supplierName.toLowerCase().includes(term);
        const matchesCnpj = (inv.supplierCnpjCpf || '').toLowerCase().includes(term);
        const matchesDesc = (inv.description || '').toLowerCase().includes(term);
        const matchesResp = (inv.responsibleUserName || '').toLowerCase().includes(term);
        if (!matchesNumber && !matchesSupplier && !matchesCnpj && !matchesDesc && !matchesResp) {
          return false;
        }
      }

      // 2. Natureza
      if (natureFilter !== 'all' && inv.costNature !== natureFilter) {
        return false;
      }

      // 3. Centro de Custo
      if (costCenterFilter !== 'all' && inv.costCenterId !== costCenterFilter) {
        return false;
      }

      // 4. Usuário / Responsável Interno
      if (userFilter !== 'all' && inv.responsibleUserId !== userFilter) {
        return false;
      }

      // 5. Status
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }

      // 6. Período
      if (periodPreset !== 'all') {
        const compDate = getInvoiceComparisonDate(inv, dateBasis);

        if (periodPreset === 'today') {
          if (compDate !== todayStr) return false;
        } else if (periodPreset === 'yesterday') {
          if (compDate !== yesterdayStr) return false;
        } else if (periodPreset === 'current_week') {
          if (!compDate || compDate < startOfWeekStr || compDate > endOfWeekStr) return false;
        } else if (periodPreset === 'current_month') {
          if (!compDate.startsWith(currentMonthPrefix)) return false;
        } else if (periodPreset === 'last_month') {
          if (!compDate.startsWith(lastMonthPrefix)) return false;
        } else if (periodPreset === 'current_year') {
          if (!compDate.startsWith(currentYearPrefix)) return false;
        } else if (periodPreset === 'custom') {
          if (customStartDate && compDate < customStartDate) return false;
          if (customEndDate && compDate > customEndDate) return false;
        }
      }

      // 7. Filtro de Notas Repetidas / Duplicadas
      if (onlyDuplicatesFilter && !duplicateInvoicesMap.has(inv.id)) {
        return false;
      }

      return true;
    });
  }, [
    invoices, 
    searchTerm, 
    natureFilter, 
    costCenterFilter, 
    userFilter, 
    statusFilter, 
    periodPreset, 
    dateBasis,
    customStartDate, 
    customEndDate,
    todayStr,
    yesterdayStr,
    startOfWeekStr,
    endOfWeekStr,
    currentMonthPrefix,
    lastMonthPrefix,
    currentYearPrefix,
    onlyDuplicatesFilter,
    duplicateInvoicesMap
  ]);

  // KPIs
  const totalAmount = useMemo(() => filteredInvoices.reduce((acc, i) => acc + i.totalAmount, 0), [filteredInvoices]);
  const totalPayable = useMemo(() => filteredInvoices.reduce((acc, i) => acc + (i.payableAmount ?? i.totalAmount), 0), [filteredInvoices]);
  const pendingInvoices = useMemo(() => filteredInvoices.filter(i => i.status === 'Pendente'), [filteredInvoices]);
  const totalPending = useMemo(() => pendingInvoices.reduce((acc, i) => acc + (i.payableAmount ?? i.totalAmount), 0), [pendingInvoices]);
  const paidInvoices = useMemo(() => filteredInvoices.filter(i => i.status === 'Pago'), [filteredInvoices]);
  const totalPaid = useMemo(() => paidInvoices.reduce((acc, i) => acc + (i.payableAmount ?? i.totalAmount), 0), [paidInvoices]);
  const overdueInvoices = useMemo(() => filteredInvoices.filter(i => i.status === 'Atrasado' || (i.status === 'Pendente' && i.dueDate < new Date().toISOString().split('T')[0])), [filteredInvoices]);
  const totalOverdue = useMemo(() => overdueInvoices.reduce((acc, i) => acc + (i.payableAmount ?? i.totalAmount), 0), [overdueInvoices]);

  // Relatórios Analíticos: Agrupamento por Responsável Interno
  const analyticsByUser = useMemo(() => {
    const map: Record<string, { id: string; name: string; profile: string; count: number; total: number; natureBreakdown: Record<string, number> }> = {};

    filteredInvoices.forEach(inv => {
      const uid = inv.responsibleUserId || 'nao_informado';
      if (!map[uid]) {
        map[uid] = {
          id: uid,
          name: inv.responsibleUserName || 'Não Informado',
          profile: inv.responsibleUserProfile || 'Colaborador',
          count: 0,
          total: 0,
          natureBreakdown: {}
        };
      }
      map[uid].count += 1;
      map[uid].total += inv.totalAmount;
      map[uid].natureBreakdown[inv.costNature] = (map[uid].natureBreakdown[inv.costNature] || 0) + inv.totalAmount;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredInvoices]);

  // Relatórios Analíticos: Agrupamento por Centro de Custos
  const analyticsByCostCenter = useMemo(() => {
    const map: Record<string, { id: string; name: string; count: number; total: number }> = {};

    filteredInvoices.forEach(inv => {
      const cid = inv.costCenterId || 'outros';
      if (!map[cid]) {
        map[cid] = {
          id: cid,
          name: inv.costCenterName || 'Geral',
          count: 0,
          total: 0
        };
      }
      map[cid].count += 1;
      map[cid].total += inv.totalAmount;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredInvoices]);

  // Relatórios Analíticos: Agrupamento por Natureza de Custos
  const analyticsByNature = useMemo(() => {
    const map: Record<InvoiceCostNature, { nature: InvoiceCostNature; label: string; count: number; total: number }> = {
      servico: { nature: 'servico', label: 'Prestação de Serviço', count: 0, total: 0 },
      produto: { nature: 'produto', label: 'Aquisição de Produto', count: 0, total: 0 },
      bem: { nature: 'bem', label: 'Compra de Bem / Ativo', count: 0, total: 0 },
      outros: { nature: 'outros', label: 'Outras Despesas', count: 0, total: 0 }
    };

    filteredInvoices.forEach(inv => {
      if (map[inv.costNature]) {
        map[inv.costNature].count += 1;
        map[inv.costNature].total += inv.totalAmount;
      }
    });

    return Object.values(map).filter(m => m.count > 0 || m.total > 0).sort((a, b) => b.total - a.total);
  }, [filteredInvoices]);

  // Exportar para CSV
  const handleExportCsv = () => {
    if (filteredInvoices.length === 0) {
      alert('Não há dados filtrados para exportar.');
      return;
    }

    const headers = [
      'Número NF',
      'Série',
      'Fornecedor / Prestador',
      'CNPJ / CPF',
      'Valor Total (R$)',
      'Data Emissão',
      'Data Vencimento',
      'Data Pagamento',
      'Status',
      'Forma Pagamento',
      'Natureza do Custo',
      'Tipo / Modalidade',
      'Centro de Custo',
      'Responsável Interno',
      'Cargo / Perfil',
      'Descrição',
      'Possui Anexo'
    ];

    const rows = filteredInvoices.map(i => [
      `"${i.invoiceNumber}"`,
      `"${i.series || ''}"`,
      `"${i.supplierName.replace(/"/g, '""')}"`,
      `"${i.supplierCnpjCpf || ''}"`,
      i.totalAmount.toFixed(2).replace('.', ','),
      `"${i.issueDate}"`,
      `"${i.dueDate}"`,
      `"${i.paymentDate || ''}"`,
      `"${i.status}"`,
      `"${i.paymentMethod || ''}"`,
      `"${NATURE_CONFIG[i.costNature]?.label || i.costNature}"`,
      `"${i.costTypeName || ''}"`,
      `"${i.costCenterName || ''}"`,
      `"${i.responsibleUserName || ''}"`,
      `"${i.responsibleUserProfile || ''}"`,
      `"${(i.description || '').replace(/"/g, '""')}"`,
      `"${i.fileUrl ? 'Sim' : 'Não'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_notas_fiscais_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Imprimir Relatório Analítico Gerencial
  const handlePrintReport = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6">
      {/* Barra de Status Realtime & Totais Compartilhados */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-blue-900/10 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center shrink-0">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative"></span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                Sincronização Realtime Ativa
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                Em Nuvem Transcunha
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Todas as notas anexadas por qualquer usuário aparecem instantaneamente para todos que têm acesso ({invoices.length} notas no sistema • Total Geral: {formatCurrency(invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0))})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadData(false)}
            disabled={isSyncing}
            title="Sincronizar com o banco central em nuvem"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Atualizar Realtime'}</span>
          </button>
        </div>
      </div>

      {/* Top Banner / KPIs Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Geral */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              Total em NFs ({filteredInvoices.length})
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
              {formatCurrency(totalAmount)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {filteredInvoices.length !== invoices.length ? `Filtrado (${invoices.length} no sistema)` : 'Volume total compartilhado'}
            </span>
          </div>
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: A Pagar (Pendente) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              A Pagar / Pendente ({pendingInvoices.length})
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5 tracking-tight">
              {formatCurrency(totalPending)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Aguardando quitação
            </span>
          </div>
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Pago */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Total Pago ({paidInvoices.length})
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5 tracking-tight">
              {formatCurrency(totalPaid)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Despesas liquidadas
            </span>
          </div>
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Vencidos / Atrasados */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              Vencidas ({overdueInvoices.length})
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5 tracking-tight">
              {formatCurrency(totalOverdue)}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Atenção necessária
            </span>
          </div>
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Ações & Navegação de Visão */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Toggle de Visualização (Tabela vs Relatório Analítico) */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveView('table')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeView === 'table'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Lista de Notas Fiscais</span>
            <span className="text-[11px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 rounded-md font-semibold">
              {filteredInvoices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeView === 'analytics'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Relatórios Gerenciais</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded font-extrabold">
              Analítico
            </span>
          </button>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleExportCsv}
            title="Exportar planilha CSV"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handlePrintReport}
            title="Imprimir relatório analítico"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          {onNavigateToPayables && (
            <button
              onClick={onNavigateToPayables}
              title="Abrir painel de Contas a Pagar"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-sm transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">Contas a Pagar</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Nova NF</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Avançados */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-700/60">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            Filtros & Rastreamento de Custos
          </span>
          {(searchTerm || natureFilter !== 'all' || costCenterFilter !== 'all' || userFilter !== 'all' || statusFilter !== 'all' || periodPreset !== 'today' || onlyDuplicatesFilter || dateBasis !== 'issue') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setNatureFilter('all');
                setCostCenterFilter('all');
                setUserFilter('all');
                setStatusFilter('all');
                setPeriodPreset('today');
                setDateBasis('issue');
                setCustomStartDate('');
                setCustomEndDate('');
                setOnlyDuplicatesFilter(false);
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer lowercase text-[11px]"
            >
              limpar filtros (restaurar notas de hoje)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Busca Textual */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por NF, fornecedor, CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {/* Filtro: Responsável / Usuário Interno */}
          <div>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="all">👤 Todos os Responsáveis</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.profile || 'Usuário'})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro: Natureza do Custo */}
          <div>
            <select
              value={natureFilter}
              onChange={(e) => setNatureFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="all">🏷️ Todas as Naturezas</option>
              <option value="servico">Prestação de Serviço</option>
              <option value="produto">Aquisição de Produto</option>
              <option value="bem">Compra de Bem / Ativo</option>
              <option value="outros">Outras Despesas</option>
            </select>
          </div>

          {/* Filtro: Centro de Custo */}
          <div>
            <select
              value={costCenterFilter}
              onChange={(e) => setCostCenterFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="all">🏢 Todos os Centros de Custo</option>
              {costCenters.map(cc => (
                <option key={cc.id} value={cc.id}>
                  {cc.code ? `${cc.code} - ` : ''}{cc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro: Status de Pagamento */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="all">⚡ Todos os Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Pago">Pago</option>
              <option value="Atrasado">Atrasado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Linha 2 de Filtros: Período Avançado */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300 mr-0.5">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>Período:</span>
          </div>

          {[
            { id: 'today' as const, label: 'Hoje (Notas do Dia)', count: todayCount },
            { id: 'yesterday' as const, label: 'Ontem' },
            { id: 'current_week' as const, label: 'Esta Semana' },
            { id: 'current_month' as const, label: 'Mês Atual', count: currentMonthCount },
            { id: 'last_month' as const, label: 'Mês Anterior' },
            { id: 'current_year' as const, label: 'Ano Atual' },
            { id: 'custom' as const, label: 'Personalizado...' },
            { id: 'all' as const, label: 'Todo o Histórico', count: invoices.length },
          ].map(preset => {
            const isSelected = periodPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPeriodPreset(preset.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{preset.label}</span>
                {typeof preset.count === 'number' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                  }`}>
                    {preset.count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Seletor de Base de Data para o filtro */}
          <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200 dark:border-slate-700">
            <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">Data por:</span>
            <select
              value={dateBasis}
              onChange={(e) => setDateBasis(e.target.value as any)}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              title="Escolha qual data da nota fiscal utilizar no filtro por período"
            >
              <option value="issue">📅 Data de Emissão</option>
              <option value="due">⏰ Data de Vencimento</option>
              <option value="created">📥 Data de Lançamento</option>
            </select>
          </div>

          {/* Inputs de Data Personalizada */}
          {periodPreset === 'custom' && (
            <div className="flex items-center gap-2 ml-1 p-1 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 pl-1">De:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200"
              />
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">Até:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200"
              />
            </div>
          )}

          {duplicateInvoicesMap.size > 0 && (
            <button
              type="button"
              onClick={() => setOnlyDuplicatesFilter(prev => !prev)}
              className={`ml-auto px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                onlyDuplicatesFilter
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/40'
              }`}
              title="Filtrar notas que possuem o mesmo número e fornecedor no sistema"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{onlyDuplicatesFilter ? 'Exibindo Repetidas' : 'Ver Repetidas'} ({duplicateInvoicesMap.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL: TABELA DE NOTAS FISCAIS */}
      {activeView === 'table' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              Carregando notas fiscais e centro de custos...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-20 text-center">
              <Calendar className="w-12 h-12 text-blue-400 dark:text-blue-500 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
                {periodPreset === 'today'
                  ? `Nenhuma Nota Fiscal para hoje (${new Date().toLocaleDateString('pt-BR')})`
                  : 'Nenhuma Nota Fiscal encontrada para os filtros'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {periodPreset === 'today'
                  ? 'Ainda não constam notas fiscais para o dia de hoje. Você pode alternar para visualizar o mês ou o histórico completo abaixo.'
                  : 'Não há lançamentos fiscais correspondentes aos filtros selecionados. Tente ajustar o período ou centro de custo.'}
              </p>
              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                {periodPreset !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setPeriodPreset('all')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Ver Todo o Histórico ({invoices.length})
                  </button>
                )}
                {periodPreset !== 'current_month' && (
                  <button
                    type="button"
                    onClick={() => setPeriodPreset('current_month')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                  >
                    Ver Mês Atual ({currentMonthCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-md shadow-blue-600/30"
                >
                  + Lançar Nova NF
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">ID / Nota Fiscal</th>
                    <th className="py-3 px-4">Fornecedor / Prestador</th>
                    <th className="py-3 px-4">Natureza / Tipo</th>
                    <th className="py-3 px-4">Centro de Custo</th>
                    <th className="py-3 px-4">Responsável Interno</th>
                    <th className="py-3 px-4">Datas (Emissão / Venc.)</th>
                    <th className="py-3 px-4 text-right">Valor a Pagar / Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Anexo</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredInvoices.map((inv) => {
                    const natConf = NATURE_CONFIG[inv.costNature] || NATURE_CONFIG.outros;
                    const stConf = STATUS_CONFIG[inv.status] || STATUS_CONFIG.Pendente;
                    const StatusIcon = stConf.icon;

                    return (
                      <tr 
                        key={inv.id} 
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        {/* 1. NF / Documento */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 font-mono font-bold border border-blue-200 dark:border-blue-800 shrink-0">
                                  {inv.id}
                                </span>
                                <span>NF nº {inv.invoiceNumber}</span>
                                {inv.series && (
                                  <span className="text-[10px] px-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500 font-mono">
                                    Série {inv.series}
                                  </span>
                                )}
                                {duplicateInvoicesMap.has(inv.id) && (
                                  <span 
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-sm"
                                    title={`Atenção: Esta nota fiscal possui número e fornecedor idênticos à nota ${duplicateInvoicesMap.get(inv.id)?.id} (${duplicateInvoicesMap.get(inv.id)?.supplierName})`}
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                    Repetida ({duplicateInvoicesMap.get(inv.id)?.id})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 line-clamp-1 max-w-[180px]" title={inv.description}>
                                {inv.description || 'Sem descrição'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Fornecedor */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {inv.supplierName}
                          </div>
                          {inv.supplierCnpjCpf && (
                            <div className="text-[11px] text-slate-400 font-mono">
                              {inv.supplierCnpjCpf}
                            </div>
                          )}
                        </td>

                        {/* 3. Natureza / Tipo */}
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${natConf.badgeClass}`}>
                            <natConf.icon className="w-3 h-3" />
                            {natConf.label}
                          </span>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                            {inv.costTypeName || 'Geral'}
                          </div>
                        </td>

                        {/* 4. Centro de Custo */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{inv.costCenterName}</span>
                          </div>
                        </td>

                        {/* 5. Responsável Interno */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-[10px] flex items-center justify-center flex-shrink-0 shadow-sm">
                              {inv.responsibleUserName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                {inv.responsibleUserName}
                              </div>
                              {inv.responsibleUserProfile && (
                                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                  {inv.responsibleUserProfile}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 6. Datas */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-slate-600 dark:text-slate-300">
                            <span className="text-[10px] text-slate-400">Emissão: </span>
                            <span className="font-medium">{formatDate(inv.issueDate)}</span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                            <span className="text-[10px] text-slate-400">Vencimento: </span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">{formatDate(inv.dueDate)}</span>
                          </div>
                        </td>

                        {/* 7. Valor a Pagar / Total */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-black text-sm text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {formatCurrency(inv.payableAmount ?? inv.totalAmount)}
                          </div>
                          {inv.payableAmount !== undefined && inv.payableAmount !== inv.totalAmount && (
                            <div className="text-[10px] text-slate-400 font-medium line-through" title="Valor Total Bruto da NF">
                              Total: {formatCurrency(inv.totalAmount)}
                            </div>
                          )}
                          {inv.paymentMethod && (
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                              via {inv.paymentMethod}
                              {inv.paymentDetails && (
                                <span className="block text-[9px] text-slate-500 dark:text-slate-400 truncate max-w-[140px] font-mono" title={inv.paymentDetails}>
                                  {inv.paymentDetails}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 8. Status */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(inv)}
                            title="Clique para alternar entre Pendente e Pago"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer hover:opacity-80 ${stConf.badgeClass}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span>{stConf.label}</span>
                          </button>
                        </td>

                        {/* 9. Anexo */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                            {inv.fileUrl && (
                              <button
                                onClick={() => setPreviewFile({ url: inv.fileUrl!, name: inv.fileName || 'Nota Fiscal', type: inv.fileType })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold text-[11px] transition-colors cursor-pointer"
                                title="Visualizar Nota Fiscal"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                <span>Ver NF</span>
                              </button>
                            )}
                            {inv.boletoFileUrl && (
                              <button
                                onClick={() => setPreviewFile({ url: inv.boletoFileUrl!, name: inv.boletoFileName || 'Boleto para Pagamento', type: inv.boletoFileType })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-semibold text-[11px] border border-emerald-200 dark:border-emerald-800/60 transition-colors cursor-pointer"
                                title="Visualizar Boleto para Pagamento"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Boleto</span>
                              </button>
                            )}
                            {!inv.fileUrl && !inv.boletoFileUrl && (
                              <span className="text-[11px] text-slate-400 italic">Sem anexo</span>
                            )}
                          </div>
                        </td>

                        {/* 10. Ações */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(inv)}
                              title="Editar Nota Fiscal"
                              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {inv.boletoFileUrl && onNavigateToPayables && (
                              <button
                                onClick={onNavigateToPayables}
                                title="Abrir em Contas a Pagar"
                                className="p-1.5 text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteInvoice(inv.id)}
                              title="Excluir Nota Fiscal"
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL: RELATÓRIOS GERENCIAIS ANALÍTICOS */}
      {activeView === 'analytics' && (
        <div className="space-y-6">
          {/* Top Info Banner para Relatório */}
          <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900/40 border border-blue-800/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Relatório Analítico de Custos & Notas Fiscais
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Demonstrativo consolidado por Usuário/Responsável Interno, Centro de Custos e Modalidade de Despesa.
              </p>
            </div>
            <div className="text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 whitespace-nowrap">
              <span>Total Analisado: </span>
              <strong className="text-emerald-300 text-sm">{formatCurrency(totalAmount)}</strong>
              <span className="text-slate-300 ml-1">({filteredInvoices.length} NFs)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PAINEL 1: CUSTOS POR RESPONSÁVEL / USUÁRIO INTERNO */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Volume por Responsável / Usuário Interno
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Quem gerou custos ou solicitou os serviços
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                  {analyticsByUser.length} colaboradores
                </span>
              </div>

              {analyticsByUser.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhum dado para o período selecionado.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {analyticsByUser.map((u) => {
                    const pct = totalAmount > 0 ? (u.total / totalAmount) * 100 : 0;
                    return (
                      <div 
                        key={u.id}
                        className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-100 block leading-tight">
                                {u.name}
                              </span>
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                {u.profile}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-xs text-slate-900 dark:text-white block">
                              {formatCurrency(u.total)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {u.count} NF{u.count > 1 ? 's' : ''} ({pct.toFixed(1)}%)
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progresso Visual */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PAINEL 2: CUSTOS POR CENTRO DE CUSTO */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Distribuição por Centro de Custos
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Alocação de orçamento e setores
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                  {analyticsByCostCenter.length} centros
                </span>
              </div>

              {analyticsByCostCenter.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhum dado para o período selecionado.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {analyticsByCostCenter.map((cc) => {
                    const pct = totalAmount > 0 ? (cc.total / totalAmount) * 100 : 0;
                    return (
                      <div 
                        key={cc.id}
                        className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/50 hover:border-sky-300 dark:hover:border-sky-700 transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                            {cc.name}
                          </span>
                          <div className="text-right">
                            <span className="font-black text-xs text-slate-900 dark:text-white block">
                              {formatCurrency(cc.total)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {cc.count} NF{cc.count > 1 ? 's' : ''} ({pct.toFixed(1)}%)
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progresso Visual */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-sky-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PAINEL 3: CUSTOS POR NATUREZA (SERVIÇO, PRODUTO, BEM) */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Classificação por Natureza de Custo
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Serviços vs Produtos vs Bens Patrimoniais
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analyticsByNature.map((nat) => {
                  const conf = NATURE_CONFIG[nat.nature];
                  const Icon = conf.icon;
                  const pct = totalAmount > 0 ? (nat.total / totalAmount) * 100 : 0;

                  return (
                    <div 
                      key={nat.nature}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${conf.badgeClass}`}>
                          {conf.label}
                        </span>
                        <Icon className="w-4 h-4 text-slate-400" />
                      </div>

                      <div className="mt-3">
                        <div className="text-xl font-black text-slate-900 dark:text-white">
                          {formatCurrency(nat.total)}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-medium">
                          <span>{nat.count} notas fiscais</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{pct.toFixed(1)}% do total</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PAINEL 4: TOP FORNECEDORES & PRESTADORES */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                    <PieChart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Principais Fornecedores / Credores
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Maiores concentradores de despesas
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2">Fornecedor</th>
                      <th className="py-2 text-center">NFs</th>
                      <th className="py-2 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                    {Object.values(
                      filteredInvoices.reduce((acc, i) => {
                        acc[i.supplierName] = acc[i.supplierName] || { name: i.supplierName, count: 0, total: 0 };
                        acc[i.supplierName].count += 1;
                        acc[i.supplierName].total += i.totalAmount;
                        return acc;
                      }, {} as Record<string, { name: string; count: number; total: number }>)
                    )
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 5)
                      .map((sup, idx) => (
                        <tr key={sup.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold flex items-center justify-center text-slate-600 dark:text-slate-300">
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[200px]">{sup.name}</span>
                          </td>
                          <td className="py-2.5 text-center text-slate-500 font-medium">{sup.count}</td>
                          <td className="py-2.5 text-right font-black text-slate-900 dark:text-white">
                            {formatCurrency(sup.total)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: LANÇAMENTO / EDIÇÃO DE NOTA FISCAL               */}
      {/* ========================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="px-7 py-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl">
                  <FileText className="w-6 h-6 text-blue-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-black tracking-tight">
                      {editingInvoiceId ? 'Editar Nota Fiscal' : 'Lançar Nova Nota Fiscal'}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/50 font-mono font-bold tracking-wider">
                      ID: {editingInvoiceId || prospectiveNextId}
                    </span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Preencha os dados da NF, anexo, centro de custo e responsável interno.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitInvoiceForm} className="p-7 space-y-6 max-h-[82vh] overflow-y-auto">
              {/* ALERTA DE DUPLICIDADE EM TEMPO REAL */}
              {duplicateInvoiceMatch.isDuplicate && duplicateInvoiceMatch.matchedInvoice && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900 dark:text-rose-200 shadow-lg shadow-rose-500/10">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-rose-600 text-white rounded-xl shrink-0 mt-0.5 shadow-md shadow-rose-600/30">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-black text-sm flex items-center gap-2 text-rose-600 dark:text-rose-400 uppercase tracking-tight">
                        <span>⚠️ NOTA FISCAL JÁ CADASTRADA NO SISTEMA! LANÇAMENTO BLOQUEADO</span>
                      </div>
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 font-medium">
                        {duplicateInvoiceMatch.message}
                      </p>
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="font-bold bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-800">
                          ID: {duplicateInvoiceMatch.matchedInvoice.id}
                        </span>
                        <span>
                          Valor: R$ {(duplicateInvoiceMatch.matchedInvoice.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span>•</span>
                        <span>
                          Emissão: {new Date(duplicateInvoiceMatch.matchedInvoice.issueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span>•</span>
                        <span>
                          Resp: {duplicateInvoiceMatch.matchedInvoice.responsibleUserName || 'Sistema'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (duplicateInvoiceMatch.matchedInvoice) {
                        handleOpenEditModal(duplicateInvoiceMatch.matchedInvoice);
                      }
                    }}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shrink-0 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-600/30"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Abrir Nota Existente</span>
                  </button>
                </div>
              )}

              {/* 1. SEÇÃO DE ANEXOS: NOTA FISCAL E BOLETO PARA PAGAMENTO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1.1 ANEXO DA NOTA FISCAL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-blue-500" />
                      Arquivo da Nota Fiscal (PDF/XML)
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">Máx: 15MB</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xml,application/pdf,application/xml,text/xml,image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    id="invoice-file-upload"
                  />

                  {formFileUrl ? (
                    <div className="flex items-center justify-between p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl min-h-[96px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0">
                          <File className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white block truncate max-w-[150px] sm:max-w-[200px]" title={formFileName}>
                            {formFileName || 'Documento Anexado'}
                          </span>
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 block">
                            {formFileSize ? `${(formFileSize / (1024 * 1024)).toFixed(2)} MB` : 'NF pronta'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ url: formFileUrl, name: formFileName || 'Nota Fiscal', type: formFileType })}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-colors cursor-pointer"
                          title="Visualizar anexo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors cursor-pointer"
                          title="Remover anexo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="invoice-file-upload"
                      className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all cursor-pointer text-center group min-h-[96px]"
                    >
                      <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors mb-1" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Anexar Nota Fiscal (PDF ou XML)
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Lê número, fornecedor, CNPJ e valores com IA
                      </span>
                    </label>
                  )}

                  {/* Banner de Processamento da Extração Automática de NF */}
                  {isExtracting && (
                    <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-2 text-blue-600 dark:text-blue-300 text-xs font-semibold animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
                      <span>Extraindo dados fiscais da NF...</span>
                    </div>
                  )}

                  {/* Banner de Sucesso da Extração da NF */}
                  {extractionSuccess && (
                    <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between gap-2 text-blue-700 dark:text-blue-300 text-xs font-semibold animate-fade-in">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="line-clamp-1">{extractionSuccess}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExtractionSuccess(null)}
                        className="text-blue-500 hover:text-blue-700 p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 1.2 ANEXO DO BOLETO PARA PAGAMENTO */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-500" />
                      Boleto para Pagamento (PDF ou Imagem)
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">Máx: 15MB</span>
                  </label>

                  <input
                    ref={boletoFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
                    onChange={handleBoletoFileChange}
                    className="hidden"
                    id="boleto-file-upload"
                  />

                  {formBoletoFileUrl ? (
                    <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl min-h-[96px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white block truncate max-w-[150px] sm:max-w-[200px]" title={formBoletoFileName}>
                            {formBoletoFileName || 'Boleto Anexado'}
                          </span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">
                            {formBoletoFileSize ? `${(formBoletoFileSize / (1024 * 1024)).toFixed(2)} MB` : 'Boleto pronto'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ url: formBoletoFileUrl, name: formBoletoFileName || 'Boleto para Pagamento', type: formBoletoFileType })}
                          className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition-colors cursor-pointer"
                          title="Visualizar boleto"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveBoletoFile}
                          className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors cursor-pointer"
                          title="Remover boleto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="boleto-file-upload"
                      className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-300 dark:border-emerald-700/80 hover:border-emerald-500 rounded-2xl bg-emerald-50/20 dark:bg-emerald-950/10 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all cursor-pointer text-center group min-h-[96px]"
                    >
                      <Receipt className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Anexar Boleto para Pagamento
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Preenche Valor a Pagar e Vencimento automaticamente
                      </span>
                    </label>
                  )}

                  {/* Banner de Processamento da Extração do Boleto */}
                  {isExtractingBoleto && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-600 dark:text-emerald-300 text-xs font-semibold animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500 shrink-0" />
                      <span>Identificando valor e vencimento do boleto...</span>
                    </div>
                  )}

                  {/* Banner de Sucesso da Extração do Boleto */}
                  {boletoExtractionSuccess && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold animate-fade-in">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="line-clamp-1">{boletoExtractionSuccess}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBoletoExtractionSuccess(null)}
                        className="text-emerald-500 hover:text-emerald-700 p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. DADOS BÁSICOS DA NOTA FISCAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Número da NF */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                    <span>Número da NF *</span>
                    {duplicateInvoiceMatch.isDuplicate && (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        NF Repetida
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 89240"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm focus:outline-none transition-all ${
                      duplicateInvoiceMatch.isDuplicate
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/40 font-bold'
                        : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40'
                    }`}
                  />
                  {duplicateInvoiceMatch.isDuplicate && (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 block font-medium">
                      Já existe nota com este número para este fornecedor.
                    </span>
                  )}
                </div>

                {/* Série */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Série
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1"
                    value={formSeries}
                    onChange={(e) => setFormSeries(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                {/* Valor Total da NF */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Valor Total da NF (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={formAmount}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormAmount(v);
                      if (!formPayableAmount || formPayableAmount === formAmount) {
                        setFormPayableAmount(v);
                      }
                    }}
                    onBlur={() => handleFormatAmountBlur(formAmount, setFormAmount, setFormPayableAmount)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Valor bruto cheio da nota</span>
                </div>

                {/* Valor a Pagar */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>Valor a Pagar (R$) *</span>
                      {formBoletoFileUrl && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                          Boleto
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Líquido</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={formPayableAmount}
                    onChange={(e) => setFormPayableAmount(e.target.value)}
                    onBlur={() => handleFormatAmountBlur(formPayableAmount, setFormPayableAmount)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {formBoletoFileUrl ? 'Valor nominal extraído do boleto bancário' : 'Valor efetivo (com retenções/acordos)'}
                  </span>
                </div>

                {/* Fornecedor / Prestador */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                    <span>Fornecedor / Prestador de Serviço *</span>
                    {duplicateInvoiceMatch.isDuplicate && (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Conflito de Fornecedor
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Razão Social ou Nome Fantasia"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm focus:outline-none transition-all ${
                      duplicateInvoiceMatch.isDuplicate
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/40 font-bold'
                        : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40'
                    }`}
                  />
                </div>

                {/* CNPJ / CPF */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    CNPJ ou CPF do Fornecedor
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={formCnpjCpf}
                    onChange={(e) => setFormCnpjCpf(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                {/* Data de Emissão */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Data de Emissão *
                  </label>
                  <input
                    type="date"
                    required
                    value={formIssueDate}
                    onChange={(e) => setFormIssueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                {/* Data de Vencimento */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                    <span>Data de Vencimento *</span>
                    {formBoletoFileUrl && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                        Do Boleto
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  {formBoletoFileUrl && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      Vencimento extraído do boleto bancário
                    </span>
                  )}
                </div>

                {/* Status do Pagamento */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Status do Pagamento
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as InvoicePaymentStatus)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                    <option value="Atrasado">Atrasado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Pix">Chave Pix</option>
                    <option value="Transferência">Transferência / TED</option>
                    <option value="Cartão">Cartão Corporativo</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                {/* Dados para Pagamento */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Dados para Pagamento
                  </label>
                  <input
                    type="text"
                    placeholder={
                      formPaymentMethod === 'Pix'
                        ? 'Chave Pix (CPF, CNPJ, e-mail, celular...)'
                        : formPaymentMethod === 'Boleto'
                        ? 'Linha digitável / Código de barras'
                        : formPaymentMethod === 'Transferência'
                        ? 'Banco, Agência e Conta'
                        : 'Chave Pix, linha digitável ou conta'
                    }
                    value={formPaymentDetails}
                    onChange={(e) => setFormPaymentDetails(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                {/* Chave de Acesso NFe */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                    <span>Chave de Acesso NFe (44 dígitos)</span>
                    {duplicateInvoiceMatch.isDuplicate && duplicateInvoiceMatch.reason === 'access_key' && (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Chave Já Cadastrada
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    maxLength={44}
                    placeholder="Chave completa da NFe (opcional)"
                    value={formAccessKey}
                    onChange={(e) => setFormAccessKey(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono text-[11px] focus:outline-none transition-all ${
                      duplicateInvoiceMatch.isDuplicate && duplicateInvoiceMatch.reason === 'access_key'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500/40 font-bold'
                        : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40'
                    }`}
                  />
                  {duplicateInvoiceMatch.isDuplicate && duplicateInvoiceMatch.reason === 'access_key' && (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 block font-medium">
                      Esta chave de 44 dígitos já pertence a outra NF no sistema.
                    </span>
                  )}
                </div>
              </div>

              {/* 3. CLASSIFICAÇÃO DE CUSTOS & CADASTRO RÁPIDO */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-indigo-500" />
                  Categorização, Centro de Custos e Responsabilidade
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Natureza do Custo */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Natureza do Custo *
                    </label>
                    <select
                      value={formNature}
                      onChange={(e) => setFormNature(e.target.value as InvoiceCostNature)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      <option value="servico">Prestação de Serviço</option>
                      <option value="produto">Aquisição de Produto</option>
                      <option value="bem">Compra de Bem / Ativo</option>
                      <option value="outros">Outras Despesas</option>
                    </select>
                  </div>

                  {/* Tipo / Modalidade de Custo (com Cadastro Rápido) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Tipo / Modalidade *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickTypeNature(formNature);
                          setIsQuickCostTypeModalOpen(true);
                        }}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                      >
                        + Novo Tipo
                      </button>
                    </div>
                    <select
                      value={formCostTypeId}
                      onChange={(e) => setFormCostTypeId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      {availableCostTypesForForm.map(ct => (
                        <option key={ct.id} value={ct.id}>{ct.name}</option>
                      ))}
                      {availableCostTypesForForm.length === 0 && (
                        <option value="">Nenhum tipo cadastrado para esta natureza</option>
                      )}
                    </select>
                  </div>

                  {/* Centro de Custos (com Cadastro Rápido) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Centro de Custos *
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsQuickCostCenterModalOpen(true)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                      >
                        + Novo Centro
                      </button>
                    </div>
                    <select
                      value={formCostCenterId}
                      onChange={(e) => setFormCostCenterId(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      {costCenters.map(cc => (
                        <option key={cc.id} value={cc.id}>
                          {cc.code ? `${cc.code} - ` : ''}{cc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* VINCULAÇÃO DE RESPONSÁVEL / USUÁRIO INTERNO */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Responsável / Solicitante Interno *
                  </label>
                  <select
                    required
                    value={formResponsibleUserId}
                    onChange={(e) => setFormResponsibleUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    <option value="">Selecione quem solicitou ou gerou o custo...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {u.profile || 'Colaborador'} ({u.email})
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Permite mapear exatamente qual operador, embarcador ou agenciador gerou a despesa para os relatórios.
                  </span>
                </div>
              </div>

              {/* 4. DESCRIÇÃO & OBSERVAÇÕES */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Descrição Detalhada do Objeto / Serviço *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Descreva o que foi adquirido ou contratado..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Observações Internas (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Instruções de pagamento, número de ordem de serviço, etc."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>

              {/* Modal Footer / Botões */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {formBoletoFileUrl ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                    <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Boleto anexado: será direcionado ao <strong>Contas a Pagar</strong> vinculado a esta Nota Fiscal.
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
                    * Campos obrigatórios para lançamento fiscal.
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsFormModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={duplicateInvoiceMatch.isDuplicate || isSaving}
                    className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                      duplicateInvoiceMatch.isDuplicate
                        ? 'bg-rose-500 text-white cursor-not-allowed opacity-90 shadow-md shadow-rose-500/20'
                        : isSaving
                        ? 'bg-blue-400 text-white cursor-wait opacity-80 shadow-md'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 cursor-pointer'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Salvando e Anexando...</span>
                      </>
                    ) : duplicateInvoiceMatch.isDuplicate ? (
                      <>
                        <ShieldAlert className="w-4 h-4 text-white" />
                        <span>Bloqueado (Nota Repetida)</span>
                      </>
                    ) : (
                      <>
                        {formBoletoFileUrl && <Receipt className="w-4 h-4" />}
                        <span>{editingInvoiceId ? 'Salvar Alterações' : (formBoletoFileUrl ? 'Lançar e Ir para Contas a Pagar' : 'Confirmar e Lançar NF')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CADASTRO RÁPIDO DE NOVO CENTRO DE CUSTO          */}
      {/* ========================================================= */}
      {isQuickCostCenterModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                Cadastrar Novo Centro de Custos
              </h4>
              <button
                onClick={() => setIsQuickCostCenterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickCostCenter} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Código (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: CC-007"
                  value={quickCenterCode}
                  onChange={(e) => setQuickCenterCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome do Centro de Custos *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Filial Curitiba / Logística Reversa"
                  value={quickCenterName}
                  onChange={(e) => setQuickCenterName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Breve detalhamento..."
                  value={quickCenterDesc}
                  onChange={(e) => setQuickCenterDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCostCenterModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Adicionar Centro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CADASTRO RÁPIDO DE NOVO TIPO / MODALIDADE        */}
      {/* ========================================================= */}
      {isQuickCostTypeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" />
                Cadastrar Novo Tipo de Custo
              </h4>
              <button
                onClick={() => setIsQuickCostTypeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickCostType} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Natureza do Custo *
                </label>
                <select
                  value={quickTypeNature}
                  onChange={(e) => setQuickTypeNature(e.target.value as InvoiceCostNature)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm"
                >
                  <option value="servico">Prestação de Serviço</option>
                  <option value="produto">Aquisição de Produto</option>
                  <option value="bem">Compra de Bem / Ativo</option>
                  <option value="outros">Outras Despesas</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome do Tipo / Modalidade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treinamentos e Certificações"
                  value={quickTypeName}
                  onChange={(e) => setQuickTypeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Finalidade da modalidade..."
                  value={quickTypeDesc}
                  onChange={(e) => setQuickTypeDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCostTypeModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Adicionar Tipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: VISUALIZADOR DE DOCUMENTO / ANEXO DA NOTA FISCAL */}
      {/* ========================================================= */}
      {previewFile && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[92vh] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-blue-500" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                  {previewFile.name}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openDocumentInNewTab(previewBlobUrl || previewFile.url, previewFile.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  title="Abrir documento em tela cheia em nova aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nova Aba</span>
                </button>
                <a
                  href={previewBlobUrl || previewFile.url}
                  download={previewFile.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-3 sm:p-4 flex-1 overflow-auto flex flex-col items-center justify-center bg-slate-950/20">
              {(() => {
                const isPdf = previewFile.type?.includes('pdf') ||
                  previewFile.name.toLowerCase().endsWith('.pdf') ||
                  previewFile.url.startsWith('data:application/pdf') ||
                  previewFile.url.includes('.pdf');

                const isImage = previewFile.type?.startsWith('image/') ||
                  ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'].some(ext => previewFile.name.toLowerCase().endsWith(ext)) ||
                  previewFile.url.startsWith('data:image/');

                if (isPdf) {
                  return (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <iframe
                        src={previewBlobUrl || previewFile.url}
                        title={previewFile.name}
                        className="w-full h-[72vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white shadow-inner"
                      />
                      <div className="mt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <span>Documento carregado. Caso o navegador bloqueie a exibição integrada:</span>
                        <button
                          type="button"
                          onClick={() => openDocumentInNewTab(previewBlobUrl || previewFile.url, previewFile.name)}
                          className="text-blue-400 hover:text-blue-300 font-bold underline flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Abrir em Nova Aba
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isImage) {
                  return (
                    <img
                      src={previewBlobUrl || previewFile.url}
                      alt={previewFile.name}
                      className="max-h-[74vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
                    />
                  );
                }

                return (
                  <div className="text-center p-8 bg-slate-900 rounded-2xl border border-slate-700 max-w-md">
                    <FileText className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-white mb-2">{previewFile.name}</p>
                    <p className="text-xs text-slate-400 mb-4">
                      Arquivo anexado. Clique abaixo para abrir ou baixar diretamente.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => openDocumentInNewTab(previewBlobUrl || previewFile.url, previewFile.name)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Abrir em Nova Aba
                      </button>
                      <a
                        href={previewBlobUrl || previewFile.url}
                        download={previewFile.name}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow"
                      >
                        <Download className="w-4 h-4" />
                        Baixar Arquivo
                      </a>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
