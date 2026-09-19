import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Battery, 
  BatteryCharging, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Power,
  ShieldCheck,
  PhoneCall,
  Clock,
  Sparkles
} from 'lucide-react';
import type { WhatsAppInstance } from '../../types/whatsapp';
import { 
  generateNewQRCode, 
  disconnectWhatsApp, 
  simulatePairingSuccess, 
  formatDisplayPhone 
} from '../../services/whatsappService';

interface WhatsAppConnectionCardProps {
  instance: WhatsAppInstance;
  onInstanceUpdated: (updated: WhatsAppInstance) => void;
}

export const WhatsAppConnectionCard: React.FC<WhatsAppConnectionCardProps> = ({
  instance,
  onInstanceUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<number>(45);
  const [testPhoneInput, setTestPhoneInput] = useState('');
  const [showPairModal, setShowPairModal] = useState(false);

  // Contador de expiração do QR Code
  useEffect(() => {
    let timer: any;
    if (instance.status === 'qrcode' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0 && instance.status === 'qrcode') {
      // Auto reload qr code
      handleGenerateQR();
    }
    return () => clearInterval(timer);
  }, [instance.status, countdown]);

  const handleGenerateQR = async () => {
    setLoading(true);
    try {
      const res = await generateNewQRCode();
      onInstanceUpdated(res.instance);
      setCountdown(45);
    } catch (err) {
      console.error('Erro ao gerar QR Code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Deseja realmente desconectar a sessão do WhatsApp?')) return;
    setLoading(true);
    try {
      const updated = await disconnectWhatsApp();
      onInstanceUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePair = async () => {
    if (!testPhoneInput.trim()) return;
    setLoading(true);
    try {
      const updated = await simulatePairingSuccess(testPhoneInput);
      onInstanceUpdated(updated);
      setShowPairModal(false);
      setTestPhoneInput('');
    } finally {
      setLoading(false);
    }
  };

  const isConnected = instance.status === 'connected';
  const isQRCode = instance.status === 'qrcode';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* CARD PRINCIPAL DE STATUS */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div className="space-y-6">
          {/* HEADER COM BADGE */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {instance.name || 'WhatsApp Operacional Transcunha'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Instância de integração para disparos automáticos e atendimento operacional.
              </p>
            </div>

            {/* STATUS BADGE */}
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <Wifi className="w-3.5 h-3.5" />
                Conectado & Ativo
              </span>
            ) : isQRCode ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                <Clock className="w-3.5 h-3.5" />
                Aguardando Leitura do QR
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                <WifiOff className="w-3.5 h-3.5" />
                Desconectado
              </span>
            )}
          </div>

          {/* DETALHES DE CONEXÃO E HARDWARE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                Número Vinculado
              </span>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-blue-500" />
                {instance.phone_number ? formatDisplayPhone(instance.phone_number) : 'Nenhum número pareado'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                Dispositivo / Bateria
              </span>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                {instance.is_plugged ? (
                  <BatteryCharging className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Battery className="w-4 h-4 text-slate-500" />
                )}
                {isConnected ? `${instance.battery_level ?? 95}% (Carregando)` : '---'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                Chave da Instância
              </span>
              <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-1 truncate">
                {instance.instance_key}
              </p>
            </div>
          </div>
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 flex-wrap">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Criptografia de ponta a ponta & Rate Limit de segurança ativos
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowPairModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                >
                  Alterar Número
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Desconectar</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleGenerateQR}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>{isQRCode ? 'Atualizar QR Code' : 'Conectar via QR Code'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CARD DO QR CODE / PAREAMENTO RÁPIDO */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-6 text-white flex flex-col items-center justify-center text-center relative overflow-hidden shadow-lg">
        {isConnected ? (
          <div className="space-y-4 py-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">Número Operacional Pronto</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Disparos de aviso de carga, adiantamento, CT-e e saldos serão emitidos por este canal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPairModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Simular / Conectar Outro</span>
            </button>
          </div>
        ) : isQRCode && instance.qr_code_base64 ? (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-emerald-500/30 inline-block">
              <img 
                src={instance.qr_code_base64} 
                alt="QR Code WhatsApp" 
                className="w-44 h-44 object-contain rounded-lg"
              />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300">
                Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar Aparelho
              </p>
              <p className="text-[11px] text-amber-400 font-mono mt-1">
                Expira em {countdown}s
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPairModal(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              Ou parear digitando o número diretamente
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-6">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400">
              <QrCode className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Nenhum Aparelho Conectado</h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Clique no botão abaixo para gerar o QR Code de autenticação.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateQR}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 mx-auto cursor-pointer shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Gerar QR Code</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL DE PAREAMENTO / DIGITAÇÃO DE NÚMERO */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Vincular Número WhatsApp
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Digite o número do WhatsApp da empresa com DDD (ex: 11984219900).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                Telefone com DDD (Brasil)
              </label>
              <input
                type="text"
                value={testPhoneInput}
                onChange={(e) => setTestPhoneInput(e.target.value)}
                placeholder="Ex: 11 98421-9900"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPairModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSimulatePair}
                disabled={loading || !testPhoneInput.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar & Conectar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
