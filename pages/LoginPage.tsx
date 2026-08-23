import React, { useState } from 'react';
import { supabase } from '../supabase';
import { User, UserProfile, DriverClassification, VehicleSetType, VehicleBodyType } from '../types';
import type { ProfilePermissions } from '../types';
import { formatCPF, formatPhone } from '../utils/formatters';
import { UserPlus, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

interface LoginPageProps {
  onLogin: (user: User) => void;
  users: User[];
  companyLogo: string | null;
  profilePermissions?: ProfilePermissions;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, users, companyLogo, profilePermissions }) => {
  const [loginType, setLoginType] = useState<'interno' | 'motorista'>('interno');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Estado para alternar entre login e cadastro de novo motorista
  const [isRegisteringDriver, setIsRegisteringDriver] = useState(false);

  // Campos do formulário de cadastro de motorista
  const [regCpf, setRegCpf] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regName, setRegName] = useState('');
  const [regHorsePlate, setRegHorsePlate] = useState('');
  const [regVehicleSetType, setRegVehicleSetType] = useState<VehicleSetType | ''>('');
  const [regVehicleBodyType, setRegVehicleBodyType] = useState<VehicleBodyType | ''>('');
  const [regTrailer1Plate, setRegTrailer1Plate] = useState('');
  const [regTrailer2Plate, setRegTrailer2Plate] = useState('');
  const [regTrailer3Plate, setRegTrailer3Plate] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  React.useEffect(() => {
    if (profilePermissions?.system_settings?.driver_portal_enabled === false) {
      setLoginType('interno');
      setIsRegisteringDriver(false);
    }
  }, [profilePermissions]);

  React.useEffect(() => {
    const isPwaEnabled = profilePermissions?.system_settings?.pwa_enabled !== false;
    if (!isPwaEnabled) return;
    
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [profilePermissions]);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleRegCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegCpf(formatCPF(e.target.value));
  };

  const handleRegPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegPhone(formatPhone(e.target.value));
  };

  const formatPlate = (val: string) => {
    return val.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 8);
  };

  // Submit de Login (Interno ou Motorista Existente)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (loginType === 'motorista') {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {});
      }
      
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
              setDeferredPrompt(null);
            }
          });
        } catch(err) {
          console.error('Erro ao chamar o prompt de instalação:', err);
        }
      }
    }

    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await supabase.auth.signOut();

      if (loginType === 'motorista') {
        const cleanCpf = cpf.replace(/\D/g, '');
        if (cleanCpf.length !== 11) {
          setError('CPF inválido. Digite os 11 números.');
          setIsLoading(false);
          return;
        }

        console.log('[LoginPage] Iniciando login motorista para:', cleanCpf);

        const formattedCpf = formatCPF(cleanCpf);

        // Busca o motorista na tabela drivers (com ou sem formatação)
        let { data: driverData } = await supabase
          .from('drivers')
          .select('*')
          .eq('cpf', formattedCpf)
          .maybeSingle();

        if (!driverData) {
          const { data: dbDriverClean } = await supabase
            .from('drivers')
            .select('*')
            .eq('cpf', cleanCpf)
            .maybeSingle();
          driverData = dbDriverClean;
        }

        if (!driverData) {
          setError('Motorista não encontrado com este CPF. Se você é novo por aqui, clique em "Criar conta de motorista" abaixo.');
          setIsLoading(false);
          return;
        }

        if (!driverData.active) {
          setError('Este motorista está inativo no sistema.');
          setIsLoading(false);
          return;
        }
        
        // Verifica se o motorista já tem uma senha configurada em app_users
        const { data: appUser } = await supabase
          .from('app_users')
          .select('password, require_password_change')
          .eq('id', driverData.id)
          .maybeSingle();

        let isFirstSetup = false;
        let requirePasswordChange = false;

        if (appUser) {
           if (!password) {
             setError('Senha obrigatória para acessar.');
             setIsLoading(false);
             return;
           }
           if (appUser.password !== password) {
             setError('Senha incorreta.');
             setIsLoading(false);
             return;
           }
           requirePasswordChange = appUser.require_password_change;
        } else {
           isFirstSetup = true;
           requirePasswordChange = true;
        }

        const userProfile: User = {
          id: driverData.id,
          name: driverData.name,
          email: driverData.cpf,
          profile: UserProfile.Motorista,
          active: driverData.active,
          requirePasswordChange,
          isFirstSetup
        };

        console.log('[LoginPage] Login motorista bem-sucedido:', userProfile.name);
        localStorage.setItem('trancunha_user_email', userProfile.email);
        localStorage.setItem('trancunha_currentUser', JSON.stringify(userProfile));
        onLogin(userProfile);

      } else {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();

        console.log('[LoginPage] Iniciando login interno para:', cleanEmail);
        
        const { data: dbUser, error: dbError } = await supabase
          .from('app_users')
          .select('*')
          .eq('email', cleanEmail)
          .eq('password', cleanPassword)
          .single();

        if (dbError || !dbUser) {
          console.error('[LoginPage] Erro de login:', dbError);
          setError('Email ou senha inválidos no sistema interno.');
          setIsLoading(false);
          return;
        }

        const userProfile: User = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          profile: dbUser.profile,
          active: dbUser.active,
          password: dbUser.password,
          clientId: dbUser.client_id,
          requirePasswordChange: dbUser.require_password_change,
          authId: dbUser.auth_id
        };

        if (!userProfile.active) {
          setError('Este usuário está inativo.');
          setIsLoading(false);
          return;
        }

        console.log('[LoginPage] Login bem-sucedido:', userProfile.name);
        localStorage.setItem('trancunha_user_email', userProfile.email);
        localStorage.setItem('trancunha_currentUser', JSON.stringify(userProfile));
        onLogin(userProfile);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Ocorreu um erro interno ao tentar entrar.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit de Cadastro de Novo Motorista
  const handleDriverRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');
    setSuccessMessage('');

    const cleanCpf = regCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setError('CPF do motorista inválido. Digite os 11 dígitos.');
      return;
    }

    const cleanPhone = regPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Informe um telefone/WhatsApp de contato válido.');
      return;
    }

    if (!regName.trim()) {
      setError('Informe o nome completo do motorista.');
      return;
    }

    if (!regHorsePlate.trim()) {
      setError('Informe a Placa do Cavalo.');
      return;
    }

    if (!regVehicleSetType) {
      setError('Selecione o Tipo de Veículo.');
      return;
    }

    if (!regVehicleBodyType) {
      setError('Selecione o Tipo de Carroceria.');
      return;
    }

    if (!regTrailer1Plate.trim()) {
      setError('A Placa da Carreta 1 é obrigatória.');
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setError('A senha deve ter pelo menos 4 dígitos/caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setIsLoading(true);

    try {
      const formattedCpf = formatCPF(cleanCpf);

      // 1. Verifica se já existe motorista cadastrado com este CPF
      const { data: existingDriver } = await supabase
        .from('drivers')
        .select('id, name, cpf')
        .or(`cpf.eq.${formattedCpf},cpf.eq.${cleanCpf}`)
        .maybeSingle();

      if (existingDriver) {
        setError(`Já existe um motorista cadastrado com o CPF ${formattedCpf} (${existingDriver.name}). Por favor, faça o login.`);
        setIsLoading(false);
        return;
      }

      // 1.1 Calcula o próximo ID sequencial curto (padrão DRV-xxx)
      const { data: allDrivers } = await supabase.from('drivers').select('id');
      let maxDrvNum = 99;
      if (allDrivers) {
        for (const d of allDrivers) {
          if (typeof d.id === 'string') {
            const m = d.id.match(/DRV-(\d+)/i);
            if (m) {
              const n = parseInt(m[1], 10);
              if (n < 1000000 && n > maxDrvNum) maxDrvNum = n;
            }
          }
        }
      }
      const driverId = `DRV-${maxDrvNum + 1}`;

      // 1.2 Calcula o próximo ID sequencial curto para os veículos (padrão VEH-xxx)
      const { data: allVehicles } = await supabase.from('vehicles').select('id');
      let currentVehNum = 99;
      if (allVehicles) {
        for (const v of allVehicles) {
          if (typeof v.id === 'string') {
            const m = v.id.match(/VEH-(\d+)/i);
            if (m) {
              const n = parseInt(m[1], 10);
              if (n < 1000000 && n > currentVehNum) currentVehNum = n;
            }
          }
        }
      }

      const upperName = regName.trim().toUpperCase();
      const cleanHorsePlate = regHorsePlate.trim().toUpperCase();

      // 2. Insere na tabela 'drivers'
      const { error: driverErr } = await supabase
        .from('drivers')
        .insert({
          id: driverId,
          name: upperName,
          cpf: formattedCpf,
          cnh: '',
          phone: regPhone.trim(),
          classification: DriverClassification.Terceiro,
          active: true,
          has_app: true,
        });

      if (driverErr) {
        console.error('[LoginPage] Erro ao cadastrar motorista:', driverErr);
        setError('Erro ao salvar dados do motorista: ' + (driverErr.message || 'Erro no banco de dados'));
        setIsLoading(false);
        return;
      }

      // 3. Insere o Cavalo na tabela 'vehicles'
      currentVehNum++;
      const { error: horseErr } = await supabase
        .from('vehicles')
        .insert({
          id: `VEH-${currentVehNum}`,
          plate: cleanHorsePlate,
          set_type: regVehicleSetType,
          body_type: regVehicleBodyType,
          classification: DriverClassification.Terceiro,
          driver_id: driverId,
          owner_id: null,
        });

      if (horseErr) {
        console.warn('[LoginPage] Aviso ao registrar cavalo:', horseErr);
      }

      // 4. Insere as Carretas na tabela 'vehicles'
      const trailers = [regTrailer1Plate, regTrailer2Plate, regTrailer3Plate].filter(p => p && p.trim().length > 0);
      for (const tPlate of trailers) {
        currentVehNum++;
        await supabase.from('vehicles').insert({
          id: `VEH-${currentVehNum}`,
          plate: tPlate.trim().toUpperCase(),
          set_type: regVehicleSetType,
          body_type: regVehicleBodyType,
          classification: DriverClassification.Terceiro,
          driver_id: driverId,
          owner_id: null,
        });
      }

      // 5. Cria usuário em 'app_users' para autenticação segura
      const { error: userErr } = await supabase
        .from('app_users')
        .upsert({
          id: driverId,
          name: upperName,
          email: cleanCpf,
          phone: regPhone.trim(),
          profile: UserProfile.Motorista,
          active: true,
          password: regPassword.trim(),
          require_password_change: false,
          password_updated_at: new Date().toISOString(),
        });

      if (userErr) {
        console.warn('[LoginPage] Aviso ao salvar usuário em app_users:', userErr);
      }

      // 6. Realiza o login direto no app
      const userProfile: User = {
        id: driverId,
        name: upperName,
        email: formattedCpf,
        profile: UserProfile.Motorista,
        active: true,
        requirePasswordChange: false,
        isFirstSetup: false,
      };

      setSuccessMessage('Cadastro realizado com sucesso! Entrando...');
      localStorage.setItem('trancunha_user_email', formattedCpf);
      localStorage.setItem('trancunha_currentUser', JSON.stringify(userProfile));
      
      setTimeout(() => {
        onLogin(userProfile);
      }, 600);

    } catch (err: any) {
      console.error('[LoginPage] Erro inesperado no cadastro:', err);
      setError('Ocorreu um erro ao processar o cadastro: ' + (err.message || 'Erro inesperado'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-primary overflow-y-auto py-8 px-4 sm:px-6">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[80%] h-full bg-accent opacity-10 skew-x-[-25deg] origin-top-right"></div>
        <div className="absolute bottom-0 left-0 w-[40%] h-[50%] bg-accent opacity-5 skew-x-[-15deg] origin-bottom-left"></div>
      </div>

      <div className={`relative z-10 w-full ${isRegisteringDriver ? 'max-w-2xl' : 'max-w-md'} p-6 sm:p-10 space-y-6 sm:space-y-8 bg-white dark:bg-dark-card rounded-2xl shadow-2xl border-t-8 border-accent transition-all duration-300 my-auto`}>
        <div className="text-center">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo da Empresa" className="h-16 sm:h-20 mx-auto filter drop-shadow-md object-contain" />
          ) : (
            <h1 className="text-3xl sm:text-4xl font-black text-primary dark:text-white tracking-tighter">
              TRANS<span className="text-accent">CUNHA</span>
            </h1>
          )}
          <div className="mt-3 flex flex-col items-center">
            <p className="text-base sm:text-lg font-bold text-primary dark:text-blue-400">
              {isRegisteringDriver ? 'Cadastro de Motorista' : 'Sistema de Gestão Logística'}
            </p>
            <div className="h-1 w-12 bg-accent mt-1 rounded-full"></div>
          </div>
        </div>

        {/* Abas Acesso Restrito / Sou Motorista (apenas quando não está no formulário de cadastro) */}
        {!isRegisteringDriver && profilePermissions?.system_settings?.driver_portal_enabled !== false && (
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginType === 'interno' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary dark:text-white' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setLoginType('interno'); setError(''); }}
            >
              Acesso Restrito
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginType === 'motorista' ? 'bg-white dark:bg-gray-700 shadow-sm text-accent dark:text-orange-400' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setLoginType('motorista'); setError(''); }}
            >
              Sou Motorista
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* FORMULÁRIO DE CADASTRO DE NOVO MOTORISTA                  */}
        {/* ========================================================= */}
        {isRegisteringDriver ? (
          <form className="space-y-4" onSubmit={handleDriverRegister}>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => { setIsRegisteringDriver(false); setError(''); }}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-500 hover:text-primary dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao login</span>
              </button>
              <span className="text-xs font-bold text-accent uppercase tracking-wider bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-md border border-orange-200 dark:border-orange-900/40">
                Novo Cadastro
              </span>
            </div>

            {/* Linha 1: CPF e Contato (WhatsApp) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  CPF do Motorista <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  value={regCpf}
                  onChange={handleRegCpfChange}
                  placeholder="Digite o CPF do motorista"
                  maxLength={14}
                  className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Contato (WhatsApp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  value={regPhone}
                  onChange={handleRegPhoneChange}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Linha 2: Nome do Motorista */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Motorista <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isLoading}
                value={regName}
                onChange={e => setRegName(e.target.value)}
                placeholder="Digite o nome do motorista"
                className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-accent focus:outline-none uppercase"
              />
            </div>

            {/* Linha 3: Placa Cavalo */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Placa Cavalo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isLoading}
                value={regHorsePlate}
                onChange={e => setRegHorsePlate(formatPlate(e.target.value))}
                placeholder="AAA-1234"
                maxLength={8}
                className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono uppercase focus:ring-2 focus:ring-accent focus:outline-none"
              />
            </div>

            {/* Linha 4: Tipo de Veículo e Tipo de Carroceria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Veículo <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={isLoading}
                  value={regVehicleSetType}
                  onChange={e => setRegVehicleSetType(e.target.value as VehicleSetType)}
                  className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                >
                  <option value="" disabled>Selecione...</option>
                  {Object.values(VehicleSetType).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Carroceria <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={isLoading}
                  value={regVehicleBodyType}
                  onChange={e => setRegVehicleBodyType(e.target.value as VehicleBodyType)}
                  className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                >
                  <option value="" disabled>Selecione...</option>
                  {Object.values(VehicleBodyType).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Linha 5: Placas das Carretas 1, 2 e 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Placa Carreta 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  value={regTrailer1Plate}
                  onChange={e => setRegTrailer1Plate(formatPlate(e.target.value))}
                  placeholder="Obrigatório"
                  maxLength={8}
                  className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono uppercase focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Placa Carreta 2
                </label>
                <input
                  type="text"
                  disabled={isLoading}
                  value={regTrailer2Plate}
                  onChange={e => setRegTrailer2Plate(formatPlate(e.target.value))}
                  placeholder="Opcional"
                  maxLength={8}
                  className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono uppercase focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Placa Carreta 3
                </label>
                <input
                  type="text"
                  disabled={isLoading}
                  value={regTrailer3Plate}
                  onChange={e => setRegTrailer3Plate(formatPlate(e.target.value))}
                  placeholder="Opcional"
                  maxLength={8}
                  className="p-3 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono uppercase focus:ring-2 focus:ring-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Linha 6: Definição de Senha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Criar Senha de Acesso <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    placeholder="Mínimo 4 dígitos"
                    className="p-3 pr-10 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Confirmar Senha <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    required
                    disabled={isLoading}
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    className="p-3 pr-10 w-full border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-center text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 font-semibold">{successMessage}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-sm sm:text-base font-black rounded-xl text-white shadow-lg transition-all transform active:scale-[0.98] ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-accent hover:bg-accent-dark hover:-translate-y-0.5 shadow-accent/20'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    CADASTRANDO MOTORISTA...
                  </span>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>CRIAR CONTA E ENTRAR</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setIsRegisteringDriver(false); setError(''); }}
                className="text-xs sm:text-sm text-gray-500 hover:text-primary dark:hover:text-blue-400 underline font-medium"
              >
                Já possui cadastro? Fazer login com CPF
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================= */
          /* FORMULÁRIO PADRÃO DE LOGIN (INTERNO OU MOTORISTA)        */
          /* ========================================================= */
          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            {loginType === 'interno' ? (
              <div className="space-y-4">
                <div className="relative">
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    required
                    disabled={isLoading}
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm dark:bg-gray-800 dark:text-white transition-all disabled:opacity-50"
                    placeholder="Seu email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    disabled={isLoading}
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm dark:bg-gray-800 dark:text-white transition-all disabled:opacity-50"
                    placeholder="Sua senha"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <input
                    id="cpf-motorista"
                    name="cpf"
                    type="text"
                    required
                    disabled={isLoading}
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm dark:bg-gray-800 dark:text-white transition-all disabled:opacity-50 font-mono text-center text-lg"
                    placeholder="Digite seu CPF"
                    value={cpf}
                    onChange={handleCpfChange}
                    maxLength={14}
                  />
                </div>
                
                <div className="mt-4 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-accent transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    className="appearance-none block w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm dark:bg-gray-800 dark:text-white transition-all disabled:opacity-50 text-center text-lg"
                    placeholder="Senha (Opcional no 1º acesso)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <p className="mt-3 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Acesse o aplicativo utilizando seu CPF e Senha.
                </p>

                {/* Opção para criar conta de motorista */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsRegisteringDriver(true); setError(''); }}
                    className="w-full py-2.5 px-3 rounded-xl border border-dashed border-accent/60 bg-accent/5 hover:bg-accent/10 text-accent font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Não é cadastrado? Criar conta de motorista</span>
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                 <p className="text-center text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-4 px-4 border border-transparent text-base font-black rounded-xl text-white shadow-lg transition-all transform active:scale-[0.98] ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-accent hover:bg-accent-dark hover:-translate-y-1 shadow-accent/20'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    PROCESSANDO...
                  </span>
                ) : 'ENTRAR NO SISTEMA'}
              </button>
            </div>
          </form>
        )}

        {loginType === 'motorista' && !isRegisteringDriver && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={(e) => {
                e.preventDefault();
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  deferredPrompt.userChoice.then((choiceResult: any) => {
                    if (choiceResult.outcome === 'accepted') {
                      setDeferredPrompt(null);
                    }
                  });
                } else {
                  alert("Para instalar o aplicativo no seu celular:\n\nNo Android (Chrome): Toque nos 3 pontinhos e selecione 'Adicionar à tela inicial'.\n\nNo iPhone (Safari): Toque no ícone de Compartilhar e selecione 'Adicionar à Tela de Início'.");
                }
              }}
              className="w-full flex justify-center py-3 px-4 border-2 border-primary dark:border-blue-500 text-primary dark:text-blue-500 hover:bg-primary hover:text-white dark:hover:bg-blue-600 dark:hover:text-white text-sm font-black rounded-xl transition-all"
            >
              BAIXAR APLICATIVO PARA MOTORISTA
            </button>
          </div>
        )}
        
        <div className="text-center pt-2">
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">
                Transparência | Cuidado | Prazo
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
