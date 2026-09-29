import React from 'react';
import type { SecondLevelFinancialResult } from '../../utils/financialCalculations';
import { Briefcase, Building, PieChart, TrendingUp, Layers, Users } from 'lucide-react';

interface SecondResultTabProps {
  data: SecondLevelFinancialResult;
}

export const SecondResultTab: React.FC<SecondResultTabProps> = ({ data }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const personnelPercent = data.totalGrossRevenue > 0 ? (data.personnelExpenses / data.totalGrossRevenue) * 100 : 0;
  const operationalPercent = data.totalGrossRevenue > 0 ? (data.operationalExpenses / data.totalGrossRevenue) * 100 : 0;
  const adminPercent = data.totalGrossRevenue > 0 ? (data.administrativeExpenses / data.totalGrossRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-indigo-300">
              Visão Gerencial & Centros de Custo
            </span>
            <h2 className="text-2xl font-black mt-1">2º Resultado Financeiro</h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Resultado Operacional Gerencial obtido após a dedução dos custos fixos, folha de pessoal, encargos e despesas administrativas por centro de custo.
            </p>
          </div>
          <div className="text-right bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/10 shrink-0">
            <span className="text-xs text-indigo-200 font-semibold block">Margem Operacional</span>
            <span className="text-3xl font-black text-indigo-300">{data.operatingMarginPercent.toFixed(1)}%</span>
            <span className="text-xs text-white/70 block mt-0.5">{formatCurrency(data.operatingResult)}</span>
          </div>
        </div>
      </div>

      {/* Centros de Custo Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Margem de Contribuição</span>
          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
            {formatCurrency(data.contributionMargin)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Base vinda do 1º Resultado
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Pessoal & Encargos</span>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(data.personnelExpenses)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {personnelPercent.toFixed(1)}% da receita bruta
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Despesas Operacionais / Filiais</span>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(data.operationalExpenses)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {operationalPercent.toFixed(1)}% da receita bruta
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Despesas Administrativas</span>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
            {formatCurrency(data.administrativeExpenses)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {adminPercent.toFixed(1)}% da receita bruta
          </span>
        </div>
      </div>

      {/* DRE Gerencial Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Demonstração do 2º Resultado (Gerencial)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dedução dos custos e centros de custos da empresa a partir da margem operacional.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {/* Base: 1º Resultado */}
          <div className="p-4 flex items-center justify-between bg-emerald-50/40 dark:bg-emerald-950/20">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                (+) Margem de Contribuição Operacional (1º Resultado)
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-emerald-700 font-semibold">{data.contributionMarginPercent.toFixed(1)}%</span>
              <span className="font-black text-emerald-700 dark:text-emerald-300 text-base w-36 text-right">
                {formatCurrency(data.contributionMargin)}
              </span>
            </div>
          </div>

          {/* Despesas Pessoal */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 pl-4">
              <span className="text-rose-500 font-bold text-sm">(-)</span>
              <div>
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Centro de Custo: Recursos Humanos e Pessoal</span>
                <span className="block text-xs text-slate-400">Salários de expedição, comercial, encargos trabalhistas, benefícios</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-rose-500 font-medium">{personnelPercent.toFixed(1)}%</span>
              <span className="font-bold text-rose-600 text-sm w-36 text-right">
                - {formatCurrency(data.personnelExpenses)}
              </span>
            </div>
          </div>

          {/* Despesas Operacionais */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 pl-4">
              <span className="text-rose-500 font-bold text-sm">(-)</span>
              <div>
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Centro de Custo: Operações, Filiais e Logística</span>
                <span className="block text-xs text-slate-400">Rastreamento, seguros de carga, vistorias, suprimentos</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-rose-500 font-medium">{operationalPercent.toFixed(1)}%</span>
              <span className="font-bold text-rose-600 text-sm w-36 text-right">
                - {formatCurrency(data.operationalExpenses)}
              </span>
            </div>
          </div>

          {/* Despesas Administrativas */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 pl-4">
              <span className="text-rose-500 font-bold text-sm">(-)</span>
              <div>
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Centro de Custo: Administrativo, TI e Geral</span>
                <span className="block text-xs text-slate-400">Aluguéis, internet, telecom, sistemas em nuvem, contabilidade</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-xs text-rose-500 font-medium">{adminPercent.toFixed(1)}%</span>
              <span className="font-bold text-rose-600 text-sm w-36 text-right">
                - {formatCurrency(data.administrativeExpenses)}
              </span>
            </div>
          </div>

          {/* 2º Resultado Final */}
          <div className="p-5 flex items-center justify-between bg-indigo-50/80 dark:bg-indigo-950/40">
            <div className="flex items-center gap-3">
              <div className="w-3.5 h-3.5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">✓</div>
              <div>
                <span className="font-black text-indigo-950 dark:text-indigo-100 text-base">(=) 2º RESULTADO: Resultado Operacional Gerencial</span>
                <span className="block text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">Lucro operacional antes de impostos sobre o lucro e resultado financeiro</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm font-black text-indigo-700 dark:text-indigo-300 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/60 rounded-full">
                {data.operatingMarginPercent.toFixed(1)}%
              </span>
              <span className="font-black text-indigo-700 dark:text-indigo-300 text-xl w-36 text-right">
                {formatCurrency(data.operatingResult)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
