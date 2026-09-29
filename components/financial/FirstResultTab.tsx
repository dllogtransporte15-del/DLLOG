import React from 'react';
import type { FirstLevelFinancialResult } from '../../utils/financialCalculations';
import { DollarSign, Percent, TrendingUp, Truck, ShieldAlert, Award } from 'lucide-react';

interface FirstResultTabProps {
  data: FirstLevelFinancialResult;
}

export const FirstResultTab: React.FC<FirstResultTabProps> = ({ data }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const marginPerTon = data.totalTonnage > 0 ? (data.contributionMargin / data.totalTonnage) : 0;
  const driverCostPercent = data.totalGrossRevenue > 0 ? (data.totalDriverCosts / data.totalGrossRevenue) * 100 : 0;
  const taxPercent = data.totalGrossRevenue > 0 ? (data.totalTaxes / data.totalGrossRevenue) * 100 : 0;
  const tollPercent = data.totalGrossRevenue > 0 ? (data.totalTollCosts / data.totalGrossRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Description Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-blue-300">
              DRE Operacional Consolidada
            </span>
            <h2 className="text-2xl font-black mt-1">1º Resultado Financeiro</h2>
            <p className="text-sm text-blue-200/90 mt-1 max-w-2xl">
              Demonstração da Margem de Contribuição Operacional: Receita Bruta de Fretes deduzida de impostos diretos, fretes pagos aos motoristas e pedágios.
            </p>
          </div>
          <div className="text-right bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/10 shrink-0">
            <span className="text-xs text-blue-200 font-semibold block">Margem de Contribuição</span>
            <span className="text-3xl font-black text-emerald-300">{data.contributionMarginPercent.toFixed(1)}%</span>
            <span className="text-xs text-white/70 block mt-0.5">{formatCurrency(marginPerTon)} / ton</span>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Receita Bruta Total</span>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {formatCurrency(data.totalGrossRevenue)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {data.shipmentCount} embarques • {data.totalTonnage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ton
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Custos Frete Motoristas</span>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(data.totalDriverCosts)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {driverCostPercent.toFixed(1)}% da receita bruta
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Impostos & Tributos</span>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(data.totalTaxes)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {taxPercent.toFixed(1)}% da receita bruta
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Margem de Contribuição (R$)</span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(data.contributionMargin)}
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
            Sobram {data.contributionMarginPercent.toFixed(1)}% para custos fixos
          </span>
        </div>
      </div>

      {/* DRE Operacional Detalhada Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Demonstração Analítica da Margem de Contribuição
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Estrutura vertical calculada com base nos embarques ativos e concluídos no período.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {/* 1. Receita Bruta */}
          <div className="p-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="font-bold text-slate-900 dark:text-white text-sm">(+) Faturamento Bruto de Fretes (Empresa)</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-slate-500 font-medium">100.0%</span>
              <span className="font-black text-slate-900 dark:text-white text-base w-36 text-right">
                {formatCurrency(data.totalGrossRevenue)}
              </span>
            </div>
          </div>

          {/* 2. Deduções */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 pl-4">
              <span className="text-rose-500 font-bold text-sm">(-)</span>
              <span className="text-slate-700 dark:text-slate-300 text-sm">Impostos Diretos sobre Frete (ICMS / Federais)</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-rose-500 font-medium">{taxPercent.toFixed(1)}%</span>
              <span className="font-bold text-rose-600 text-sm w-36 text-right">
                - {formatCurrency(data.totalTaxes)}
              </span>
            </div>
          </div>

          {/* 3. Receita Líquida */}
          <div className="p-4 flex items-center justify-between bg-blue-50/30 dark:bg-blue-950/20">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span className="font-bold text-indigo-950 dark:text-indigo-200 text-sm">(=) Receita Líquida Operacional</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-indigo-700 font-medium">{(100 - taxPercent).toFixed(1)}%</span>
              <span className="font-black text-indigo-950 dark:text-indigo-200 text-base w-36 text-right">
                {formatCurrency(data.netRevenue)}
              </span>
            </div>
          </div>

          {/* 4. Custos com Motoristas */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 pl-4">
              <span className="text-rose-500 font-bold text-sm">(-)</span>
              <span className="text-slate-700 dark:text-slate-300 text-sm">Frete Pago aos Motoristas / Terceiros</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-rose-500 font-medium">{driverCostPercent.toFixed(1)}%</span>
              <span className="font-bold text-rose-600 text-sm w-36 text-right">
                - {formatCurrency(data.totalDriverCosts)}
              </span>
            </div>
          </div>

          {/* 5. Pedágios */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 pl-4">
              <span className="text-rose-500 font-bold text-sm">(-)</span>
              <span className="text-slate-700 dark:text-slate-300 text-sm">Pedágios Pagos na Operação</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-rose-500 font-medium">{tollPercent.toFixed(1)}%</span>
              <span className="font-bold text-rose-600 text-sm w-36 text-right">
                - {formatCurrency(data.totalTollCosts)}
              </span>
            </div>
          </div>

          {/* 6. Margem de Contribuição (1º Resultado) */}
          <div className="p-5 flex items-center justify-between bg-emerald-50/80 dark:bg-emerald-950/40">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px] font-bold">✓</div>
              <div>
                <span className="font-black text-emerald-950 dark:text-emerald-100 text-base">(=) 1º RESULTADO: Margem de Contribuição Operacional</span>
                <span className="block text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">Recurso disponível para cobertura dos custos fixos e geração de lucro</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm font-black text-emerald-700 dark:text-emerald-300 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/60 rounded-full">
                {data.contributionMarginPercent.toFixed(1)}%
              </span>
              <span className="font-black text-emerald-700 dark:text-emerald-300 text-xl w-36 text-right">
                {formatCurrency(data.contributionMargin)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
