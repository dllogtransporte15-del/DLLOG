import React, { useState, useRef } from 'react';
import type { OfxTransaction, OfxImportLog } from '../../types';
import { parseOfxFileContent } from '../../utils/ofxParser';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, ArrowUpRight, ArrowDownLeft, RefreshCw, Link2 } from 'lucide-react';

interface OfxReconciliationTabProps {
  onReconcileTransaction?: (ofxTrnId: string) => void;
}

export const OfxReconciliationTab: React.FC<OfxReconciliationTabProps> = ({
  onReconcileTransaction,
}) => {
  const [importLog, setImportLog] = useState<OfxImportLog | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'CREDIT' | 'DEBIT'>('all');
  const [onlyPending, setOnlyPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      try {
        const parsed = parseOfxFileContent(content);
        const log: OfxImportLog = {
          id: `ofx_log_${Date.now()}`,
          filename: file.name,
          importDate: new Date().toISOString(),
          bankAccountId: parsed.bankId || 'BANCO',
          accountNumber: parsed.accountNumber,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          totalTransactions: parsed.transactions.length,
          reconciledCount: 0,
          transactions: parsed.transactions,
        };
        setImportLog(log);
      } catch (err) {
        console.error('Erro ao ler arquivo OFX:', err);
        alert('Não foi possível processar o arquivo OFX selecionado. Verifique a formatação do extrato bancário.');
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const toggleReconcile = (trnId: string) => {
    if (!importLog) return;
    setImportLog(prev => {
      if (!prev) return null;
      const updated = prev.transactions.map(t => {
        if (t.id === trnId) {
          return { ...t, reconciled: !t.reconciled };
        }
        return t;
      });
      const reconciledCount = updated.filter(t => t.reconciled).length;
      return { ...prev, transactions: updated, reconciledCount };
    });

    if (onReconcileTransaction) {
      onReconcileTransaction(trnId);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const filteredTransactions = (importLog?.transactions || []).filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (onlyPending && t.reconciled) return false;
    return true;
  });

  const totalCredits = (importLog?.transactions || []).filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalDebits = (importLog?.transactions || []).filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const netExtractBalance = totalCredits - totalDebits;

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      {!importLog ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all bg-white dark:bg-slate-800 ${
            isDragging 
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
              : 'border-slate-300 dark:border-slate-700 hover:border-blue-400'
          }`}
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 dark:bg-blue-950/50 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            Importar Extrato Bancário (.OFX)
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
            Arraste seu arquivo .ofx emitido pelo Internet Banking da empresa ou selecione manualmente para conferência e conciliação.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".ofx,.txt"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95"
          >
            Selecionar Arquivo OFX
          </button>
        </div>
      ) : (
        <>
          {/* Header Summary */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {importLog.filename}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    Conta: {importLog.accountNumber || 'Empresarial'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Período: {importLog.startDate || 'Início'} até {importLog.endDate || 'Fim'} • {importLog.totalTransactions} lançamentos importados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setImportLog(null)}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Trocar Arquivo
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Entradas (Créditos)</span>
              <div className="text-xl font-bold text-emerald-600 mt-1 flex items-center gap-1">
                <ArrowDownLeft className="w-4 h-4" />
                {formatCurrency(totalCredits)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Saídas (Débitos)</span>
              <div className="text-xl font-bold text-rose-600 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" />
                {formatCurrency(totalDebits)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Saldo Líquido Período</span>
              <div className={`text-xl font-bold mt-1 ${netExtractBalance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600'}`}>
                {formatCurrency(netExtractBalance)}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase">Conciliação</span>
              <div className="text-xl font-bold text-blue-600 mt-1">
                {importLog.reconciledCount} / {importLog.totalTransactions}
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Todos ({importLog.transactions.length})
              </button>
              <button
                onClick={() => setFilterType('CREDIT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'CREDIT' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Créditos (+)
              </button>
              <button
                onClick={() => setFilterType('DEBIT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'DEBIT' 
                    ? 'bg-rose-600 text-white' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Débitos (-)
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={onlyPending}
                onChange={(e) => setOnlyPending(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600"
              />
              Mostrar apenas não conciliados
            </label>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">Data</th>
                    <th className="px-5 py-3.5">Identificador / Doc</th>
                    <th className="px-5 py-3.5">Descrição Extrato</th>
                    <th className="px-5 py-3.5">Valor</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-750 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-200">
                        {new Date(t.date).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {t.checkNum || '-'}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                        {t.description}
                      </td>
                      <td className={`px-5 py-3.5 font-bold ${
                        t.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          t.reconciled 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {t.reconciled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {t.reconciled ? 'Conciliado' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => toggleReconcile(t.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                            t.reconciled
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          }`}
                        >
                          {t.reconciled ? 'Desfazer' : 'Conciliar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
