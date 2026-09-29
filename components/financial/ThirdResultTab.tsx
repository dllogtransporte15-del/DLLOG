import React from 'react';
import type { ThirdLevelFinancialResult } from '../../utils/financialCalculations';
import { Target, TrendingUp, BarChart3, ArrowUpRight, ArrowDownLeft, ShieldCheck, CalendarClock } from 'lucide-react';

interface ThirdResultTabProps {
  data: ThirdLevelFinancialResult;
}

export const ThirdResultTab: React.FC<ThirdResultTabProps> = ({ data }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 p-6 rounded-3xl text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
              Visão Estratégica, EBITDA & Projeções
            </span>
            <h2 className="text-2xl font-black mt-1">3º Resultado Financeiro</h2>
            <p className="text-sm text-emerald-200/90 mt-1 max-w-2xl">
              Resultado Líquido Final da empresa após receitas e despesas financeiras, margens estratégicas de lucro e projeções de fluxo de caixa futuro.
            </p>
          </div>
          <div className="text-right bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/10 shrink-0">
            <span className="text-xs text-emerald-200 font-semibold block">Margem Líquida</span>
            <span className="text-3xl font-black text-emerald-300">{data.netMarginPercent.toFixed(1)}%</span>
            <span className="text-xs text-white/70 block mt-0.5">{formatCurrency(data.netResult)}</span>
          </div>
        </div>
      </div>

      {/* Top Strategic KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">EBITDA Gerencial</span>
          <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">
            {formatCurrency(data.ebitda)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Geração de caixa operacional
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Despesas Financeiras / Juros</span>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(data.financialExpenses)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Tarifas bancárias e taxas de antecipação
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">3º Resultado (Líquido)</span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(data.netResult)}
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
            Margem Líquida de {data.netMarginPercent.toFixed(1)}%
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Projeção Caixa (30 dias)</span>
          <div className={`text-2xl font-extrabold mt-1 ${data.projectedCashFlow30d >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {formatCurrency(data.projectedCashFlow30d)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Recebíveis (-) Pagáveis programados
          </span>
        </div>
      </div>

      {/* DRE Estruturada 3º Nível */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Demonstração do 3º Resultado (Estratégico / Final)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Consolidação do resultado líquido final após despesas financeiras bancárias e fiscais.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {/* Base: 2º Resultado */}
          <div className="p-4 flex items-center justify-between bg-indigo-50/40 dark:bg-indigo-950/20">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span className="font-bold text-indigo-950 dark:text-indigo-200 text-sm">
                (+) Resultado Operacional Gerencial (2º Resultado)
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-indigo-700 font-semibold">{data.operatingMarginPercent.toFixed(1)}%</span>
              <span className="font-black text-indigo-700 dark:text-indigo-300 text-base w-36 text-right">
                {formatCurrency(data.operatingResult)}
              </span>
            </div>
          </div>

          {/* Despesas Financeiras */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 pl-4">
              <span className="text-rose-500 font-bold text-sm">(-)</span>
              <div>
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Despesas Financeiras & Bancárias</span>
                <span className="block text-xs text-slate-400">Tarifas de cobrança, juros bancários, taxas de antecipação e IOF</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-rose-500 font-medium">
                {data.totalGrossRevenue > 0 ? ((data.financialExpenses / data.totalGrossRevenue) * 100).toFixed(1) : 0}%
              </span>
              <span className="font-bold text-rose-600 text-sm w-36 text-right">
                - {formatCurrency(data.financialExpenses)}
              </span>
            </div>
          </div>

          {/* Receitas Financeiras */}
          {data.financialIncomes > 0 && (
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 pl-4">
                <span className="text-emerald-500 font-bold text-sm">(+)</span>
                <div>
                  <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Receitas Financeiras & Outras Receitas</span>
                  <span className="block text-xs text-slate-400">Rendimentos de aplicações e descontos obtidos</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-bold text-emerald-600 text-sm w-36 text-right">
                  + {formatCurrency(data.financialIncomes)}
                </span>
              </div>
            </div>
          )}

          {/* 3º Resultado Final */}
          <div className="p-5 flex items-center justify-between bg-emerald-50/90 dark:bg-emerald-950/50">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[9px] font-bold">★</div>
              <div>
                <span className="font-black text-emerald-950 dark:text-emerald-100 text-base">(=) 3º RESULTADO: Resultado Líquido Final da Empresa</span>
                <span className="block text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">Resultado líquido consolidado à disposição dos sócios e reinvestimento</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 px-3.5 py-1 bg-emerald-100 dark:bg-emerald-900/60 rounded-full">
                {data.netMarginPercent.toFixed(1)}% Líquido
              </span>
              <span className="font-black text-emerald-700 dark:text-emerald-300 text-2xl w-36 text-right">
                {formatCurrency(data.netResult)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Projeção de Fluxo de Caixa Futuro */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Projeção de Fluxo de Caixa (Próximos 30 Dias)</h4>
            <p className="text-xs text-slate-500">Estimativa baseada nos vencimentos de recebíveis e despesas em aberto.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 uppercase">Recebimentos Previstos (30d)</span>
            <div className="text-xl font-bold text-emerald-600 mt-1">
              {formatCurrency(data.projectedReceivables30d)}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 uppercase">Pagamentos Previstos (30d)</span>
            <div className="text-xl font-bold text-rose-600 mt-1">
              {formatCurrency(data.projectedPayables30d)}
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 uppercase">Saldo Líquido Previsto (30d)</span>
            <div className={`text-xl font-bold mt-1 ${data.projectedCashFlow30d >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              {formatCurrency(data.projectedCashFlow30d)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
