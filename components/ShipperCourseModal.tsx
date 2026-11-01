import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  Truck, 
  ShieldCheck, 
  FileText, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  Calculator, 
  CheckSquare, 
  ChevronRight, 
  Search, 
  Award, 
  Clock, 
  ArrowRight, 
  HelpCircle, 
  Sparkles, 
  FileSpreadsheet,
  Layers,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import type { User } from '../types';
import { 
  CourseChapter, 
  COURSE_CHAPTERS, 
  QUIZ_QUESTIONS, 
  VEHICLE_CAPACITIES 
} from '../utils/shipperCourseData';

interface ShipperCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
}

export const ShipperCourseModal: React.FC<ShipperCourseModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'conteudo' | 'calculadora' | 'tabela' | 'quiz'>('conteudo');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('apresentacao');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado da Calculadora de Dimensionamento de Cargas
  const [calcTotalTons, setCalcTotalTons] = useState<number>(240);
  const [calcVehicleType, setCalcVehicleType] = useState<string>('rodotrem');
  const [calcFreightRate, setCalcFreightRate] = useState<number>(195);
  const [calcDriverRate, setCalcDriverRate] = useState<number>(175);

  // Estado do Quiz
  const [quizAnswers, setQuizAnswers] = useState<{ [questionId: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const selectedVehicleData = VEHICLE_CAPACITIES[calcVehicleType] || VEHICLE_CAPACITIES.rodotrem;
  const trucksNeeded = Math.ceil(calcTotalTons / (selectedVehicleData.capacity || 1));
  const totalClientFreight = calcTotalTons * calcFreightRate;
  const totalDriverFreight = calcTotalTons * calcDriverRate;
  const totalProfitMargin = totalClientFreight - totalDriverFreight;
  const profitMarginPercent = totalClientFreight > 0 ? (totalProfitMargin / totalClientFreight) * 100 : 0;

  // Filtragem de capítulos por busca
  const filteredChapters = useMemo(() => {
    if (!searchTerm) return COURSE_CHAPTERS;
    const term = searchTerm.toLowerCase();
    return COURSE_CHAPTERS.filter(ch => 
      ch.title.toLowerCase().includes(term) ||
      ch.subtitle.toLowerCase().includes(term) ||
      ch.summary.toLowerCase().includes(term) ||
      ch.sections.some(s => s.title.toLowerCase().includes(term) || s.content.some(c => c.toLowerCase().includes(term)))
    );
  }, [searchTerm]);

  const currentChapter = useMemo(() => {
    return COURSE_CHAPTERS.find(c => c.id === selectedChapterId) || COURSE_CHAPTERS[0];
  }, [selectedChapterId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleSelectQuizOption = (questionId: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const calculateScore = () => {
    let correct = 0;
    QUIZ_QUESTIONS.forEach(q => {
      if (quizAnswers[q.id] === q.correctIndex) {
        correct++;
      }
    });
    return correct;
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      style={{ zoom: 1 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#0b1328] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full h-full sm:h-[90vh] max-h-[900px] flex flex-col overflow-hidden transition-all text-slate-800 dark:text-slate-100 relative my-auto animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Curso */}
        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800/80 bg-linear-to-r from-violet-600/10 via-indigo-600/5 to-transparent flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-linear-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Manual Profissional do Embarcador
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300 border border-violet-300 dark:border-violet-800">
                  Transcunha Academy
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Exclusivo Desenvolvedor
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Capacitação técnica completa: do zero à gestão avançada de veículos, gerenciamento de risco e fretes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/curso-embarcador"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors cursor-pointer"
              title="Abrir Curso em Nova Guia"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Guia</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar Manual"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas Superiores de Navegação */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 overflow-x-auto gap-2 py-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('conteudo')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'conteudo'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Capítulos do Manual</span>
            </button>

            <button
              onClick={() => setActiveTab('calculadora')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'calculadora'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Simulador de Frota & Margem</span>
            </button>

            <button
              onClick={() => setActiveTab('tabela')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'tabela'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Tabela Rápida de Pesos & Carretas</span>
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'quiz'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Teste de Fixação</span>
            </button>
          </div>

          <div className="relative shrink-0 hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Pesquisar no manual..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs focus:ring-2 focus:ring-violet-500 outline-none w-48 text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Corpo Principal Dinâmico */}
        <div className="flex-1 overflow-hidden min-h-0">
          {/* ABA 1: CONTEÚDO DOS CAPÍTULOS */}
          {activeTab === 'conteudo' && (
            <div className="flex flex-col md:flex-row h-full">
              {/* Menu Lateral de Capítulos */}
              <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 overflow-y-auto p-3 space-y-1.5 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-2">
                  Índice de Módulos ({filteredChapters.length})
                </span>
                {filteredChapters.map((ch) => {
                  const isSelected = ch.id === selectedChapterId;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChapterId(ch.id)}
                      className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSelected 
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25 ring-2 ring-violet-400/30'
                          : 'hover:bg-slate-200/70 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {ch.number}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-snug truncate">
                          {ch.title}
                        </p>
                        <p className={`text-[10px] line-clamp-1 mt-0.5 ${isSelected ? 'text-violet-100' : 'text-slate-400'}`}>
                          {ch.subtitle}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold shrink-0 ${isSelected ? 'text-violet-200' : 'text-slate-400'}`}>
                        {ch.readTime}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Área de Leitura do Capítulo Selecionado */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white dark:bg-[#0b1328]">
                {/* Cabeçalho do Capítulo */}
                <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-300">
                      Módulo {currentChapter.number}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {currentChapter.readTime} de leitura
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {currentChapter.title}
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {currentChapter.subtitle}
                  </p>
                  <div className="mt-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-800 dark:text-slate-100">Resumo Executivo: </span>
                    {currentChapter.summary}
                  </div>
                </div>

                {/* Seções do Capítulo */}
                <div className="space-y-6">
                  {currentChapter.sections.map((sec, idx) => (
                    <div key={idx} className="space-y-3">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-l-4 border-violet-600 pl-2.5">
                        {sec.title}
                      </h3>

                      <div className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {sec.content.map((p, pIdx) => (
                          <p key={pIdx}>{p}</p>
                        ))}
                      </div>

                      {/* Tabela se houver */}
                      {sec.table && (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs mt-3">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                {sec.table.headers.map((h, hIdx) => (
                                  <th key={hIdx} className="py-2.5 px-3 whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {sec.table.rows.map((r, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                  {r.map((cell, cIdx) => (
                                    <td key={cIdx} className={`py-2 px-3 ${cIdx === 0 ? 'font-bold text-slate-900 dark:text-white' : ''}`}>
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Dicas / Tips */}
                      {sec.tips && sec.tips.length > 0 && (
                        <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-1">
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            Dica de Ouro do Embarcador
                          </span>
                          {sec.tips.map((tip, tIdx) => (
                            <p key={tIdx} className="text-xs text-emerald-700 dark:text-emerald-300">{tip}</p>
                          ))}
                        </div>
                      )}

                      {/* Avisos Importantes */}
                      {sec.warning && (
                        <div className="p-3 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                            {sec.warning}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: CALCULADORA DE DIMENSIONAMENTO & MARGEM */}
          {activeTab === 'calculadora' && (
            <div className="p-6 overflow-y-auto h-full space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/30">
              <div className="max-w-3xl mx-auto space-y-6">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-violet-600" />
                    Simulador Prático de Frota e Margem Operacional
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Exercício prático baseado no Capítulo 1 e Capítulo 3 do manual: calcule o número de viagens, carga líquida e lucro operacional da carga.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-[#0b1328] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Volume Total Contratado (Toneladas)
                    </label>
                    <input 
                      type="number"
                      min="1"
                      value={calcTotalTons}
                      onChange={(e) => setCalcTotalTons(Math.max(1, parseFloat(e.target.value) || 0))}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Conjunto Veicular Escolhido
                    </label>
                    <select
                      value={calcVehicleType}
                      onChange={(e) => setCalcVehicleType(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                    >
                      <option value="carreta_simples">Carreta Simples 3 eixos (Líquido: 32 t | PBT 48,5 t)</option>
                      <option value="ls_4_eixos">Carreta 4 eixos LS (Líquido: 40 t | PBT 58,5 t)</option>
                      <option value="bitrem">Bitrem 7 eixos (Líquido: 37,5 t | PBT 57 t)</option>
                      <option value="rodotrem">Rodotrem 9 eixos (Líquido: 49,5 t | PBT 74 t)</option>
                      <option value="rodocacamba">Rodocaçamba 9 eixos (Líquido: 47,5 t | PBT 74 t)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Frete Cliente (R$ por tonelada)
                    </label>
                    <input 
                      type="number"
                      step="0.50"
                      min="0"
                      value={calcFreightRate}
                      onChange={(e) => setCalcFreightRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Frete Motorista (R$ por tonelada)
                    </label>
                    <input 
                      type="number"
                      step="0.50"
                      min="0"
                      value={calcDriverRate}
                      onChange={(e) => setCalcDriverRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Cards de Resultados do Dimensionamento */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-white dark:bg-[#0b1328] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Viagens / Caminhões Necessários
                    </span>
                    <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
                      {trucksNeeded} {trucksNeeded === 1 ? 'veículo' : 'veículos'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Carga líquida: {selectedVehicleData.capacity} t/viagem
                    </span>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#0b1328] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Margem Bruta (Spread R$)
                    </span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      R$ {totalProfitMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Spread de R$ {(calcFreightRate - calcDriverRate).toFixed(2)}/t
                    </span>
                  </div>

                  <div className="p-4 bg-white dark:bg-[#0b1328] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Percentual de Lucro Operacional
                    </span>
                    <span className={`text-2xl font-black ${profitMarginPercent >= 7 ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {profitMarginPercent.toFixed(1)}%
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {profitMarginPercent >= 7 ? '✅ Margem excelente (meta 7-10%)' : '⚠️ Margem abaixo do ideal do agro'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/60 rounded-2xl text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-violet-900 dark:text-violet-200">
                    <Info className="w-4 h-4 text-violet-600" />
                    <span>Regra de Tolerância de Balança (5% do PBT)</span>
                  </div>
                  <p className="text-violet-800 dark:text-violet-300">
                    Para o conjunto selecionado ({selectedVehicleData.name}), o PBT nominal é de <strong>{selectedVehicleData.pbt} t</strong>. Com a tolerância de 5% da ANTT, o veículo pode passar na balança com até <strong>{(selectedVehicleData.pbt * 1.05).toFixed(3)} t</strong> sem incorrer em auto de infração por excesso de peso.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: TABELA DE PESOS & CARRETAS */}
          {activeTab === 'tabela' && (
            <div className="p-6 overflow-y-auto h-full space-y-6 custom-scrollbar bg-white dark:bg-[#0b1328]">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-violet-600" />
                  Guia Rápido de Veículos, Conjuntos e Aplicações
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Consulte a qualquer momento as tara médias, capacidades e restrições para não errar no agendamento com os motoristas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/60 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">Carreta LS 3 Eixos (Trucada)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">PBT 48,5 t</span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p>• <strong>Carga Líquida:</strong> ≈ 32 toneladas (Graneleiro)</p>
                    <p>• <strong>Se for Caçamba:</strong> ≈ 28 a 30 toneladas (tara maior)</p>
                    <p>• <strong>Comprimento:</strong> Em torno de 16 a 18 metros</p>
                    <p>• <strong>Vantagem:</strong> Cabe em praticamente qualquer balança de armazém e porto.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/60 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">Carreta LS 4 Eixos</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">PBT 58,5 t</span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p>• <strong>Carga Líquida:</strong> ≈ 40 toneladas (Graneleiro)</p>
                    <p>• <strong>Se for Caçamba:</strong> ≈ 37 a 38 toneladas</p>
                    <p>• <strong>Tendência:</strong> Muito utilizada atualmente no agronegócio por não exigir cavalo com 6x4 obrigatório e levar quase a carga de um bitrem.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/60 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">Bitrem / Bicaçamba (7 Eixos)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">PBT 57,0 t</span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p>• <strong>Carga Líquida:</strong> ≈ 37 a 38 toneladas (Graneleiro)</p>
                    <p>• <strong>Bicaçamba:</strong> ≈ 35 a 36 toneladas (ideal para fertilizante)</p>
                    <p>• <strong>Comprimento:</strong> ≈ 19,80 metros</p>
                    <p>• <strong>Atenção:</strong> Duas carretas acopladas diretamente no pino rei.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/60 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">Rodotrem / Rodocaçamba (9 Eixos)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">PBT 74,0 t</span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p>• <strong>Carga Líquida:</strong> ≈ 48,5 a 50 toneladas</p>
                    <p>• <strong>Rodocaçamba:</strong> ≈ 47 a 49 toneladas</p>
                    <p>• <strong>Comprimento:</strong> Curto (19m) ou Alongado (25m a 30m)</p>
                    <p>• <strong>Alerta de Balança:</strong> Se o destino tiver balança menor que 25 metros, o rodotrem terá que desengatar para pesar cada carreta separada!</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: TESTE DE FIXAÇÃO (QUIZ) */}
          {activeTab === 'quiz' && (
            <div className="p-6 overflow-y-auto h-full space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/30">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      Avaliação de Conhecimento do Embarcador
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Responda às questões fundamentais para testar seu domínio operacional.
                    </p>
                  </div>
                  {quizSubmitted && (
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-bold">Sua Pontuação:</span>
                      <span className="text-xl font-black text-violet-600 dark:text-violet-400">
                        {calculateScore()} / {QUIZ_QUESTIONS.length} acertos
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {QUIZ_QUESTIONS.map((q, idx) => {
                    const selectedOpt = quizAnswers[q.id];
                    const isAnswered = selectedOpt !== undefined;
                    const isCorrect = isAnswered && selectedOpt === q.correctIndex;

                    return (
                      <div key={q.id} className="p-4 bg-white dark:bg-[#0b1328] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {idx + 1}. {q.question}
                        </p>

                        <div className="space-y-1.5">
                          {q.options.map((opt, optIdx) => {
                            const isThisSelected = selectedOpt === optIdx;
                            let btnStyle = 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300';
                            
                            if (quizSubmitted) {
                              if (optIdx === q.correctIndex) {
                                btnStyle = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold';
                              } else if (isThisSelected && optIdx !== q.correctIndex) {
                                btnStyle = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-800 dark:text-rose-300 font-bold';
                              }
                            } else if (isThisSelected) {
                              btnStyle = 'bg-violet-50 dark:bg-violet-950/50 border-violet-500 text-violet-800 dark:text-violet-300 font-bold';
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={quizSubmitted}
                                onClick={() => handleSelectQuizOption(q.id, optIdx)}
                                className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                              >
                                <span>{opt}</span>
                                {quizSubmitted && optIdx === q.correctIndex && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {quizSubmitted && (
                          <div className={`p-2.5 rounded-xl text-xs mt-2 ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'}`}>
                            <strong>Explicação: </strong>{q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  {quizSubmitted ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQuizSubmitted(false);
                        setQuizAnswers({});
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refazer Teste</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={Object.keys(quizAnswers).length < QUIZ_QUESTIONS.length}
                      onClick={() => setQuizSubmitted(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/25 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Finalizar e Ver Resultados</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Fixo */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/60 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">Material Oficial:</span>
            <span>Manual Profissional Embarcador (PDF) • Licenciado Transcunha</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Concluir Leitura
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

