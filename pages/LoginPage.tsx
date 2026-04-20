
import React, { useState } from 'react';
import type { User } from '../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
  users: User[];
  companyLogo: string | null;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, users, companyLogo }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    
    // Find user with extremely robust matching:
    // 1. Case-insensitive email
    // 2. Trimming any accidental spaces in DB records
    // 3. Ensuring users list is available
    const user = users.find(u => {
      const dbEmail = (u.email || '').trim().toLowerCase();
      const dbPassword = (u.password || '').trim();
      return dbEmail === cleanEmail && dbPassword === cleanPassword;
    });
    
    if (user && user.active) {
      onLogin(user);
    } else if (user && !user.active) {
      setError('Este usuário está inativo.');
    } else {
      console.log('Login failed. Input email:', cleanEmail, 'Input password:', '***');
      console.log('Available users in state:', users.length);
      setError('Email ou senha inválidos.');
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-primary overflow-hidden">
      {/* Brand Angled Pattern Background */}
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
              RODO<span className="text-accent">CHAGAS</span>
            </h1>
          )}
          <div className="mt-4 flex flex-col items-center">
            <p className="text-lg font-bold text-primary dark:text-blue-400">Sistema de Gestão Logística</p>
            <div className="h-1 w-12 bg-accent mt-1 rounded-full"></div>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative">
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm dark:bg-gray-800 dark:text-white transition-all"
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
                className="appearance-none block w-full px-4 py-3 border border-gray-200 dark:border-gray-700 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent sm:text-sm dark:bg-gray-800 dark:text-white transition-all"
                placeholder="Sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
               <p className="text-center text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-bold rounded-xl text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-4 focus:ring-accent/50 shadow-lg shadow-accent/20 transition-all transform hover:-translate-y-1 active:scale-[0.98]"
            >
              ENTRAR NO SISTEMA
            </button>
          </div>
        </form>
        
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
