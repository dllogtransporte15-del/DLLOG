import React, { useState } from 'react';
import { supabase } from '../supabase';
import { User, UserProfile } from '../types';
import type { ProfilePermissions } from '../types';

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
  const [isLoading, setIsLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  React.useEffect(() => {
    if (profilePermissions?.system_settings?.driver_portal_enabled === false) {
      setLoginType('interno');
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

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Função simples para formatar CPF na digitação (opcional)
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{3})/, "$1.$2");
    }
    setCpf(value);
  };

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

        const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

        // Busca o motorista na tabela drivers (com ou sem formatação)
        let { data: driverData, error: dbError } = await supabase
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
          setError('Motorista não encontrado com este CPF.');
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
           // Já existe em app_users, precisa de senha
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
           // Primeiro acesso, loga com sucesso mas força criação da senha
           isFirstSetup = true;
           requirePasswordChange = true;
        }

        const userProfile: User = {
          id: driverData.id,
          name: driverData.name,
          email: driverData.cpf, // Usando CPF como identificador
          profile: UserProfile.Motorista,
          active: driverData.active,
          requirePasswordChange,
          isFirstSetup
        };

        console.log('[LoginPage] Login motorista bem-sucedido:', userProfile.name);
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
        onLogin(userProfile);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Ocorreu um erro interno ao tentar entrar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-primary overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[80%] h-full bg-accent opacity-10 skew-x-[-25deg] origin-top-right"></div>
        <div className="absolute bottom-0 left-0 w-[40%] h-[50%] bg-accent opacity-5 skew-x-[-15deg] origin-bottom-left"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-10 space-y-8 bg-white dark:bg-dark-card rounded-2xl shadow-2xl border-t-8 border-accent">
        <div className="text-center">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo da Empresa" className="h-20 mx-auto filter drop-shadow-md" />
          ) : (
            <h1 className="text-4xl font-black text-primary dark:text-white tracking-tighter">
              TRANS<span className="text-accent">CUNHA</span>
            </h1>
          )}
          <div className="mt-4 flex flex-col items-center">
            <p className="text-lg font-bold text-primary dark:text-blue-400">Sistema de Gestão Logística</p>
            <div className="h-1 w-12 bg-accent mt-1 rounded-full"></div>
          </div>
        </div>

        {profilePermissions?.system_settings?.driver_portal_enabled !== false && (
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

              <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Acesse o aplicativo utilizando seu CPF e Senha. <br/>(Se for o seu primeiro acesso, deixe a senha em branco)
              </p>
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

        {loginType === 'motorista' && (
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
        
        <div className="text-center pt-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">
                Transparência | Cuidado | Prazo
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
