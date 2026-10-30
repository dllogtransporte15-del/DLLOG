import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Trash2, 
  Receipt, 
  Check, 
  Loader2,
  Calendar,
  DollarSign,
  Copy,
  Eye,
  FileCheck,
  CreditCard,
  Building2,
  Tag,
  RotateCcw
} from 'lucide-react';
import { openDocumentInNewTab } from '../../utils/documentViewer';
import { uploadInvoiceAttachmentToStorage } from '../../services/financialInvoiceService';
import { formatBrl } from '../../utils/financialCalculations';
import type { FinancialInvoice, InvoicePaymentStatus } from '../../types';

export interface SettlingAccountItem {
  id: string;
  kind: 'invoice' | 'manual' | 'leader';
  docNumber: string;
  title: string;
  entityName: string;
  entityCpfCnpj?: string;
  categoryOrCenter: string;
  dueDate: string;
  totalAmount: number;
  payableAmount: number;
  currentStatus: 'Pendente' | 'Pago' | 'Atrasado' | InvoicePaymentStatus;
  paymentDate?: string;
  paymentMethod?: FinancialInvoice['paymentMethod'];
  paymentDetails?: string;
  receiptFileUrl?: string;
  receiptFileName?: string;
  receiptFileType?: string;
  receiptFileSize?: number;
  paymentAuthCode?: string;
  notes?: string;
  originalItem: any;
}

interface AccountsPayableSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SettlingAccountItem | null;
  onConfirm: (data: {
    status: 'Pago';
    paymentDate: string;
    paymentMethod?: FinancialInvoice['paymentMethod'];
    paymentAuthCode?: string;
    notes?: string;
    receiptFile?: File | null;
    receiptFileUrl?: string | null;
    receiptFileName?: string | null;
    receiptFileType?: string | null;
    receiptFileSize?: number | null;
  }) => Promise<void>;
  onReopen?: (item: SettlingAccountItem) => Promise<void>;
}

export const AccountsPayableSettlementModal: React.FC<AccountsPayableSettlementModalProps> = ({
  isOpen,
  onClose,
  item,
  onConfirm,
  onReopen
}) => {
  if (!isOpen || !item) return null;

  const isAlreadyPaid = item.currentStatus === 'Pago';

  // Form states
  const [paymentDate, setPaymentDate] = useState<string>(
    item.paymentDate || new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<FinancialInvoice['paymentMethod']>(
    item.paymentMethod || 'Pix'
  );
  const [paymentAuthCode, setPaymentAuthCode] = useState<string>(item.paymentAuthCode || '');
  const [notes, setNotes] = useState<string>(item.notes || '');

  // File states
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(item.receiptFileUrl || null);
  const [existingReceiptName, setExistingReceiptName] = useState<string | null>(item.receiptFileName || null);
  const [newReceiptFile, setNewReceiptFile] = useState<File | null>(null);

  const [copiedKey, setCopiedKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when item changes
  useEffect(() => {
    if (item) {
      setPaymentDate(item.paymentDate || new Date().toISOString().split('T')[0]);
      setPaymentMethod(item.paymentMethod || 'Pix');
      setPaymentAuthCode(item.paymentAuthCode || '');
      setNotes(item.notes || '');
      setExistingReceiptUrl(item.receiptFileUrl || null);
      setExistingReceiptName(item.receiptFileName || null);
      setNewReceiptFile(null);
      setCopiedKey(false);
    }
  }, [item]);

  const handleCopyPaymentDetails = () => {
    if (item.paymentDetails) {
      navigator.clipboard.writeText(item.paymentDetails);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewReceiptFile(file);
    }
  };

  const handleRemoveExistingReceipt = () => {
    setExistingReceiptUrl(null);
    setExistingReceiptName(null);
    setNewReceiptFile(null);
  };

  const handleRemoveNewReceipt = () => {
    setNewReceiptFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalReceiptUrl = existingReceiptUrl;
      let finalReceiptName = existingReceiptName;
      let finalReceiptType = item.receiptFileType;
      let finalReceiptSize = item.receiptFileSize;

      // Se houver um novo arquivo de comprovante selecionado, envia para o Storage
      if (newReceiptFile) {
        finalReceiptUrl = await uploadInvoiceAttachmentToStorage(
          newReceiptFile,
          item.id,
          'comprovante',
          newReceiptFile.name,
          newReceiptFile.type
        );
        finalReceiptName = newReceiptFile.name;
        finalReceiptType = newReceiptFile.type;
        finalReceiptSize = newReceiptFile.size;
      }

      await onConfirm({
        status: 'Pago',
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod,
        paymentAuthCode: paymentAuthCode.trim() || undefined,
        notes: notes.trim() || undefined,
        receiptFile: newReceiptFile,
        receiptFileUrl: finalReceiptUrl,
        receiptFileName: finalReceiptName,
        receiptFileType: finalReceiptType,
        receiptFileSize: finalReceiptSize
      });

      onClose();
    } catch (err) {
      console.error('Erro ao registrar baixa / comprovante:', err);
      alert('Ocorreu um erro ao salvar o comprovante de pagamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopen = async () => {
    if (!onReopen) return;
    if (confirm(`Deseja realmente reabrir esta conta para 'Pendente'? (O comprovante anexado será mantido)`)) {
      setIsReopening(true);
      try {
        await onReopen(item);
        onClose();
      } catch (err) {
        console.error('Erro ao reabrir conta:', err);
      } finally {
        setIsReopening(false);
      }
    }
  };

  const hasReceiptAttached = Boolean(newReceiptFile || existingReceiptUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full my-auto overflow-hidden transition-all text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white ${isAlreadyPaid ? 'bg-purple-600' : 'bg-emerald-600'} shadow-xs`}>
              {isAlreadyPaid ? <Receipt className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                {isAlreadyPaid ? 'Editar Baixa e Comprovante' : 'Dar Baixa / Registrar Pagamento'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAlreadyPaid 
                  ? 'Substitua o comprovante ou atualize os dados da quitação.' 
                  : 'Anexe o comprovante de quitação e confirme a baixa para status Pago.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isReopening}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Card Resumo do Pagamento */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {item.docNumber}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {item.categoryOrCenter}
                  </span>
                </div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white line-clamp-1" title={item.entityName}>
                  {item.entityName}
                </h4>
                {item.entityCpfCnpj && (
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {item.entityCpfCnpj}
                  </p>
                )}
              </div>

              {/* Valor a pagar em destaque */}
              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Valor a Pagar
                </span>
                <span className="font-black text-xl text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {formatBrl(item.payableAmount)}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Venc: {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Linha Digitável / Chave PIX se disponível */}
            {item.paymentDetails && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                    Dados Pagamento:
                  </span>
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 truncate" title={item.paymentDetails}>
                    {item.paymentDetails}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPaymentDetails}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
                >
                  <Copy className="w-2.5 h-2.5" />
                  <span>{copiedKey ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Dados da Quitação: Data e Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data Efetiva do Pagamento *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden transition-all"
              >
                <option value="Pix">PIX</option>
                <option value="Boleto">Boleto Bancário</option>
                <option value="Transferência">Transferência Bancária (TED/DOC)</option>
                <option value="Cartão">Cartão de Crédito/Débito</option>
                <option value="Dinheiro">Dinheiro / Espécie</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
          </div>

          {/* Área de Anexo do Comprovante de Pagamento */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Comprovante de Pagamento (Anexo)</span>
              </label>
              {hasReceiptAttached && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Pronto para arquivamento
                </span>
              )}
            </div>

            {/* Caso 1: Comprovante já existente no banco/storage */}
            {existingReceiptUrl && !newReceiptFile && (
              <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                      {existingReceiptName || 'Comprovante_de_Pagamento.pdf'}
                    </p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      Comprovante arquivado na nuvem Transcunha
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openDocumentInNewTab(existingReceiptUrl, existingReceiptName || 'Comprovante_Pagamento')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg hover:bg-emerald-100/50 transition-colors cursor-pointer"
                    title="Visualizar documento em nova aba"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-white/80 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Substituir por outro arquivo"
                  >
                    Trocar
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveExistingReceipt}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100/60 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                    title="Remover anexo do comprovante"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Caso 2: Novo arquivo selecionado para upload */}
            {newReceiptFile && (
              <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg shrink-0">
                    <Upload className="w-4 h-4 animate-bounce" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-blue-900 dark:text-blue-200 truncate">
                      {newReceiptFile.name}
                    </p>
                    <p className="text-[10px] text-blue-700 dark:text-blue-400">
                      {(newReceiptFile.size / 1024).toFixed(1)} KB • Pronto para upload
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 rounded-lg transition-colors cursor-pointer"
                  >
                    Trocar
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveNewReceipt}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100/60 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                    title="Remover seleção"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Caso 3: Nenhum arquivo selecionado nem existente (Dropzone) */}
            {!existingReceiptUrl && !newReceiptFile && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 rounded-xl p-4 text-center cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-950 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 flex items-center justify-center transition-colors">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">
                  Clique ou arraste o comprovante aqui (PDF, PNG, JPG)
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Extensões aceitas: PDF, Imagens de comprovantes bancários até 15MB
                </p>
              </div>
            )}

            {/* Input file invisível */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Autenticação Bancária (Opcional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Autenticação Bancária / ID Transação (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: E0041696820261029..."
                value={paymentAuthCode}
                onChange={(e) => setPaymentAuthCode(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-hidden transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                Observações do Pagamento (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Pago via banco Itaú PJ..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Rodapé e Botões de Ação */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <div>
              {isAlreadyPaid && onReopen && (
                <button
                  type="button"
                  onClick={handleReopen}
                  disabled={isSubmitting || isReopening}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Desfazer baixa e retornar ao status Pendente"
                >
                  {isReopening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>Reabrir para Pendente</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isReopening}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmitting || isReopening}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      {isAlreadyPaid 
                        ? 'Salvar Alterações' 
                        : hasReceiptAttached 
                        ? 'Anexar e Dar Baixa (Pago)' 
                        : 'Confirmar Baixa (Pago)'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

