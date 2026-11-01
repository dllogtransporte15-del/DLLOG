import React, { useState, useMemo, useEffect } from 'react';
import { 
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
  ArrowLeft,
  HelpCircle, 
  Sparkles, 
  FileSpreadsheet,
  Layers,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Info,
  Printer,
  Check
} from 'lucide-react';
import type { User } from '../types';
import { 
  CourseChapter, 
  COURSE_CHAPTERS, 
  QUIZ_QUESTIONS, 
  VEHICLE_CAPACITIES 
} from '../utils/shipperCourseData';

interface ShipperCoursePageProps {
  currentUser?: User | null;
  onBackToApp?: () => void;
}

export const ShipperCoursePage: React.FC<ShipperCoursePageProps> = ({
  currentUser,
  onBackToApp
}) => {
  const [activeTab, setActiveTab] = useState<'conteudo' | 'calculadora' | 'tabela' | 'quiz'>('conteudo');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('apresentacao');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Progresso salvo no localStorage
  const [completedChapters, setCompletedChapters] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('transcunha_course_completed_chapters');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleChapterCompletion = (chapterId: string) => {
    setCompletedChapters(prev => {
      const next = prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId];
      try {
        localStorage.setItem('transcunha_course_completed_chapters', JSON.stringify(next));
      } catch (err) {
        console.error('Erro ao salvar progresso do curso:', err);
      }
      return next;
    });
  };

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

  const currentChapterIndex = useMemo(() => {
    return COURSE_CHAPTERS.findIndex(c => c.id === selectedChapterId);
  }, [selectedChapterId]);

  const currentChapter = useMemo(() => {
    return COURSE_CHAPTERS.find(c => c.id === selectedChapterId) || COURSE_CHAPTERS[0];
  }, [selectedChapterId]);

  const progressPercentage = Math.round((completedChapters.length / COURSE_CHAPTERS.length) * 100);

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

  const handleNextChapter = () => {
    if (currentChapterIndex < COURSE_CHAPTERS.length - 1) {
      const nextId = COURSE_CHAPTERS[currentChapterIndex + 1].id;
      setSelectedChapterId(nextId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      const prevId = COURSE_CHAPTERS[currentChapterIndex - 1].id;
      setSelectedChapterId(prevId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCloseOrBack = () => {
    if (onBackToApp) {
      onBackToApp();
    } else if (window.opener) {
      window.close();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-violet-500/30">
      {/* Barra de Topo Fixa / Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-xl px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo e Título */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 rounded-2xl bg-linear-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  Manual Profissional do Embarcador
                </h1>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-950/80 text-violet-300 border border-violet-700/60 shadow-xs">
                  Transcunha Academy
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950/70 text-amber-300 border border-amber-700/60 hidden sm:inline-block">
                  Guia Oficial
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 hidden md:block truncate">
                Capacitação técnica completa: do zero à gestão avançada de veículos, gerenciamento de risco e fretes
              </p>
            </div>
          </div>

          {/* Ações do Header */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Indicador de Progresso */}
            <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                <div 
                  className="bg-linear-to-r from-violet-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                {completedChapters.length}/{COURSE_CHAPTERS.length} Concluídos ({progressPercentage}%)
              </span>
            </div>

            <button
              onClick={handlePrint}
              type="button"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleCloseOrBack}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
            >
              <ArrowLeft className="w-4 h-4 text-violet-400" />
              <span>Voltar ao Sistema</span>
            </button>
          </div>
        </div>

        {/* Barra de Progresso Mobile */}
        <div className="mt-2.5 lg:hidden max-w-7xl mx-auto flex items-center justify-between text-[11px] text-slate-400">
          <span>Progresso: {completedChapters.length} de {COURSE_CHAPTERS.length} módulos</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="lg:hidden w-full bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
          <div 
            className="bg-violet-500 h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </header>

      {/* Navegação Secundária / Abas */}
      <nav className="sticky top-[69px] sm:top-[73px] z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('conteudo')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'conteudo'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Capítulos do Manual</span>
            </button>

            <button
              onClick={() => setActiveTab('calculadora')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'calculadora'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Simulador de Frota & Margem</span>
            </button>

            <button
              onClick={() => setActiveTab('tabela')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'tabela'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Tabela Rápida de Pesos & Carretas</span>
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'quiz'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Teste de Fixação</span>
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative shrink-0 hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Pesquisar termos no manual..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none w-56"
            />
          </div>
        </div>
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {/* ABA 1: CAPÍTULOS DO MANUAL */}
        {activeTab === 'conteudo' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Menu Lateral de Capítulos */}
            <aside className="lg:col-span-4 bg-slate-950/70 border border-slate-800/80 rounded-3xl p-4 shadow-xl space-y-2 sticky top-[140px]">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Índice de Módulos ({filteredChapters.length})
                </span>
                <span className="text-[11px] text-violet-400 font-bold">
                  {completedChapters.length} lidos
                </span>
              </div>

              <div className="space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1 custom-scrollbar">
                {filteredChapters.map((ch) => {
                  const isSelected = ch.id === selectedChapterId;
                  const isDone = completedChapters.includes(ch.id);

                  return (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChapterId(ch.id)}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer flex items-start gap-3 border ${
                        isSelected 
                          ? 'bg-violet-600/15 border-violet-500/50 text-white shadow-lg shadow-violet-950/40 ring-1 ring-violet-500/30'
                          : 'bg-slate-900/50 border-slate-800/50 hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                        <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-md ${
                          isSelected 
                            ? 'bg-violet-600 text-white' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {ch.number}
                        </span>
                        {isDone && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold leading-snug truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {ch.title}
                        </p>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {ch.subtitle}
                        </p>
                      </div>

                      <span className="text-[9px] font-bold text-slate-500 shrink-0">
                        {ch.readTime}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Painel de Leitura do Capítulo Selecionado */}
            <article className="lg:col-span-8 bg-slate-950/70 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8">
              {/* Topo do Capítulo */}
              <div className="pb-6 border-b border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-violet-600 text-white shadow-sm">
                      Módulo {currentChapter.number}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-violet-400" /> {currentChapter.readTime} de leitura
                    </span>
                  </div>

                  {/* Botão de Marcar como Concluído */}
                  <button
                    onClick={() => toggleChapterCompletion(currentChapter.id)}
                    type="button"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      completedChapters.includes(currentChapter.id)
                        ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'
                        : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {completedChapters.includes(currentChapter.id) ? 'Módulo Concluído' : 'Marcar como Lido'}
                    </span>
                  </button>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  {currentChapter.title}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  {currentChapter.subtitle}
                </p>

                {/* Resumo Executivo */}
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-300 leading-relaxed space-y-1">
                  <span className="font-black text-violet-400 uppercase tracking-wider text-[11px] block">
                    Resumo Executivo do Módulo:
                  </span>
                  <p>{currentChapter.summary}</p>
                </div>
              </div>

              {/* Seções do Capítulo */}
              <div className="space-y-8">
                {currentChapter.sections.map((sec, idx) => (
                  <section key={idx} className="space-y-3.5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2.5 border-l-4 border-violet-500 pl-3">
                      {sec.title}
                    </h3>

                    <div className="space-y-2.5 text-sm text-slate-300 leading-relaxed">
                      {sec.content.map((p, pIdx) => (
                        <p key={pIdx}>{p}</p>
                      ))}
                    </div>

                    {/* Tabela Comparativa (se houver) */}
                    {sec.table && (
                      <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-md my-4">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider border-b border-slate-800">
                            <tr>
                              {sec.table.headers.map((h, hIdx) => (
                                <th key={hIdx} className="py-3 px-4 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                            {sec.table.rows.map((r, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-900/50 transition-colors">
                                {r.map((cell, cIdx) => (
                                  <td key={cIdx} className={`py-3 px-4 ${cIdx === 0 ? 'font-bold text-white' : 'text-slate-300'}`}>
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Dica de Ouro */}
                    {sec.tips && sec.tips.length > 0 && (
                      <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-2xl space-y-1.5 my-3">
                        <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          Dica de Ouro do Embarcador
                        </span>
                        {sec.tips.map((tip, tIdx) => (
                          <p key={tIdx} className="text-xs sm:text-sm text-emerald-300/90 leading-relaxed">{tip}</p>
                        ))}
                      </div>
                    )}

                    {/* Alerta Operacional / Warning */}
                    {sec.warning && (
                      <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-2xl flex items-start gap-3 my-3">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[11px] font-black text-rose-400 uppercase tracking-wider block mb-0.5">
                            Atenção Mandatória:
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-rose-200 leading-relaxed">
                            {sec.warning}
                          </p>
                        </div>
                      </div>
                    )}
                  </section>
                ))}
              </div>

              {/* Navegação Entre Capítulos (Anterior / Próximo) */}
              <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handlePrevChapter}
                  disabled={currentChapterIndex === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Capítulo Anterior</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextChapter}
                  disabled={currentChapterIndex === COURSE_CHAPTERS.length - 1}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Próximo Capítulo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </article>
          </div>
        )}

        {/* ABA 2: SIMULADOR DE FROTA & MARGEM */}
        {activeTab === 'calculadora' && (
          <div className="max-w-4xl mx-auto bg-slate-950/70 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-violet-950/60 border border-violet-800/60 text-violet-300 text-xs font-bold mb-2">
                <Calculator className="w-4 h-4 text-violet-400" />
                Ferramenta Prática do Embarcador
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Simulador de Frota, Viagens e Margem Comercial
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Exercício dinâmico: calcule a quantidade de caminhões, peso útil líquido e lucro operacional (spread) da sua carga.
              </p>
            </div>

            {/* Inputs do Formulário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Volume Total Contratado (Toneladas)
                </label>
                <input 
                  type="number"
                  min="1"
                  value={calcTotalTons}
                  onChange={(e) => setCalcTotalTons(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-bold text-white focus:ring-2 focus:ring-violet-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Conjunto Veicular Escolhido
                </label>
                <select
                  value={calcVehicleType}
                  onChange={(e) => setCalcVehicleType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:ring-2 focus:ring-violet-500 outline-none"
                >
                  <option value="carreta_simples">Carreta Simples 3 eixos (Líquido: 32 t | PBT 48,5 t)</option>
                  <option value="ls_4_eixos">Carreta 4 eixos LS (Líquido: 40 t | PBT 58,5 t)</option>
                  <option value="bitrem">Bitrem 7 eixos (Líquido: 37,5 t | PBT 57 t)</option>
                  <option value="rodotrem">Rodotrem 9 eixos (Líquido: 49,5 t | PBT 74 t)</option>
                  <option value="rodocacamba">Rodocaçamba 9 eixos (Líquido: 47,5 t | PBT 74 t)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Frete Cliente (R$ por tonelada)
                </label>
                <input 
                  type="number"
                  step="0.50"
                  min="0"
                  value={calcFreightRate}
                  onChange={(e) => setCalcFreightRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-bold text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Frete Motorista (R$ por tonelada)
                </label>
                <input 
                  type="number"
                  step="0.50"
                  min="0"
                  value={calcDriverRate}
                  onChange={(e) => setCalcDriverRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-bold text-sky-400 focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>
            </div>

            {/* Cards de Resultados */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Viagens / Carregamentos
                </span>
                <span className="text-3xl font-black text-violet-400 block">
                  {trucksNeeded} {trucksNeeded === 1 ? 'veículo' : 'veículos'}
                </span>
                <span className="text-xs text-slate-400 block">
                  Capacidade: {selectedVehicleData.capacity} t/viagem
                </span>
              </div>

              <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Lucro Operacional (Spread)
                </span>
                <span className="text-3xl font-black text-emerald-400 block">
                  R$ {totalProfitMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400 block">
                  Spread de R$ {(calcFreightRate - calcDriverRate).toFixed(2)}/t
                </span>
              </div>

              <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Margem Percentual
                </span>
                <span className={`text-3xl font-black block ${profitMarginPercent >= 7 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {profitMarginPercent.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400 block">
                  {profitMarginPercent >= 7 ? '✅ Margem excelente (meta 7-12%)' : '⚠️ Margem abaixo da média do agro'}
                </span>
              </div>
            </div>

            {/* Explicação da Balança ANTT */}
            <div className="p-5 bg-violet-950/30 border border-violet-800/60 rounded-2xl space-y-2 text-xs text-violet-200">
              <div className="flex items-center gap-2 font-bold text-violet-300 text-sm">
                <Info className="w-4 h-4 text-violet-400" />
                <span>Auditoria de Balança: Regra de Tolerância de 5% da ANTT</span>
              </div>
              <p className="leading-relaxed">
                Para o conjunto selecionado (<strong>{selectedVehicleData.name}</strong>), o PBT regulamentar é de <strong>{selectedVehicleData.pbt} t</strong>. A tolerância de 5% sobre o PBT permite passagem na pesagem rodoviária com até <strong>{(selectedVehicleData.pbt * 1.05).toFixed(3)} toneladas brutas</strong> sem autuação de excesso de peso.
              </p>
            </div>
          </div>
        )}

        {/* ABA 3: TABELA RÁPIDA DE PESOS & CARRETAS */}
        {activeTab === 'tabela' && (
          <div className="max-w-5xl mx-auto bg-slate-950/70 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-violet-950/60 border border-violet-800/60 text-violet-300 text-xs font-bold mb-2">
                <Truck className="w-4 h-4 text-violet-400" />
                Referência Rápida de Implementos
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Guia Rápido de Veículos, Conjuntos e Aplicações
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Consulte a qualquer momento as tara médias, capacidades e restrições para não errar no agendamento com os motoristas.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-base">Carreta LS 3 Eixos (Trucada)</span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/60">PBT 48,5 t</span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-300">
                  <p>• <strong>Carga Líquida Útil:</strong> ≈ 32 toneladas (Graneleiro)</p>
                  <p>• <strong>Se for Caçamba:</strong> ≈ 28 a 30 toneladas (tara maior)</p>
                  <p>• <strong>Comprimento:</strong> Em torno de 16 a 18 metros</p>
                  <p>• <strong>Vantagem:</strong> Cabe em praticamente qualquer balança de armazém e porto.</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-base">Carreta LS 4 Eixos</span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/60">PBT 58,5 t</span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-300">
                  <p>• <strong>Carga Líquida Útil:</strong> ≈ 40 toneladas (Graneleiro)</p>
                  <p>• <strong>Se for Caçamba:</strong> ≈ 37 a 38 toneladas</p>
                  <p>• <strong>Tendência:</strong> Muito utilizada atualmente no agronegócio por não exigir cavalo com 6x4 obrigatório e levar quase a carga de um bitrem.</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-base">Bitrem / Bicaçamba (7 Eixos)</span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">PBT 57,0 t</span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-300">
                  <p>• <strong>Carga Líquida Útil:</strong> ≈ 37 a 38 toneladas (Graneleiro)</p>
                  <p>• <strong>Bicaçamba:</strong> ≈ 35 a 36 toneladas (ideal para fertilizante)</p>
                  <p>• <strong>Comprimento:</strong> ≈ 19,80 metros</p>
                  <p>• <strong>Atenção:</strong> Duas carretas acopladas diretamente no pino rei.</p>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-base">Rodotrem / Rodocaçamba (9 Eixos)</span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/60">PBT 74,0 t</span>
                </div>
                <div className="text-xs space-y-1.5 text-slate-300">
                  <p>• <strong>Carga Líquida Útil:</strong> ≈ 48,5 a 50 toneladas</p>
                  <p>• <strong>Rodocaçamba:</strong> ≈ 47 a 49 toneladas</p>
                  <p>• <strong>Comprimento:</strong> Curto (19m) ou Alongado (25m a 30m)</p>
                  <p>• <strong>Alerta de Balança:</strong> Se o destino tiver balança menor que 25 metros, o rodotrem precisará desengatar para pesar cada carreta!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: TESTE DE FIXAÇÃO (QUIZ) */}
        {activeTab === 'quiz' && (
          <div className="max-w-3xl mx-auto bg-slate-950/70 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs font-bold mb-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Capacitação Profissional
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Teste de Fixação do Embarcador
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Responda às questões fundamentais para testar seu domínio operacional de agronegócio, veículos e regras fiscais.
                </p>
              </div>

              {quizSubmitted && (
                <div className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-right">
                  <span className="text-xs text-slate-400 block font-bold">Sua Pontuação:</span>
                  <span className="text-2xl font-black text-violet-400">
                    {calculateScore()} / {QUIZ_QUESTIONS.length} acertos ({Math.round((calculateScore() / QUIZ_QUESTIONS.length) * 100)}%)
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {QUIZ_QUESTIONS.map((q, idx) => {
                const selectedOpt = quizAnswers[q.id];
                const isAnswered = selectedOpt !== undefined;
                const isCorrect = isAnswered && selectedOpt === q.correctIndex;

                return (
                  <div key={q.id} className="p-5 bg-slate-900/70 rounded-2xl border border-slate-800 space-y-3.5">
                    <p className="font-bold text-sm sm:text-base text-white">
                      {idx + 1}. {q.question}
                    </p>

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isThisSelected = selectedOpt === optIdx;
                        let btnStyle = 'border-slate-800 hover:bg-slate-800/60 text-slate-300';
                        
                        if (quizSubmitted) {
                          if (optIdx === q.correctIndex) {
                            btnStyle = 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-bold';
                          } else if (isThisSelected && optIdx !== q.correctIndex) {
                            btnStyle = 'bg-rose-950/40 border-rose-500 text-rose-200 font-bold';
                          }
                        } else if (isThisSelected) {
                          btnStyle = 'bg-violet-950/60 border-violet-500 text-violet-200 font-bold';
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={quizSubmitted}
                            onClick={() => handleSelectQuizOption(q.id, optIdx)}
                            className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-between ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {quizSubmitted && optIdx === q.correctIndex && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {quizSubmitted && (
                      <div className={`p-3 rounded-xl text-xs sm:text-sm mt-2 leading-relaxed ${isCorrect ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-800/40' : 'bg-amber-950/30 text-amber-300 border border-amber-800/40'}`}>
                        <strong>Explicação Oficial: </strong>{q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              {quizSubmitted ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuizSubmitted(false);
                    setQuizAnswers({});
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refazer Teste</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={Object.keys(quizAnswers).length < QUIZ_QUESTIONS.length}
                  onClick={() => setQuizSubmitted(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-black bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Finalizar e Ver Resultados</span>
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Rodapé Fixo */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-4 sm:px-6 py-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">Material Oficial:</span>
            <span>Manual Profissional do Embarcador • Transcunha Logística</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseOrBack}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Concluir e Voltar
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ShipperCoursePage;

