
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
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #F8F9FA 0%, #FFFFFF 40%, #FFFDF5 100%)' }}>
      
      {/* Decorative Gold Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Top-right gold accent blob */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #D4AF37, #B8860B)' }}
        />
        {/* Bottom-left subtle gold */}
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-6"
          style={{ background: 'radial-gradient(circle, #F1D279, #D4AF37)' }}
        />
        {/* Angled gold stripe */}
        <div className="absolute top-0 right-0 h-full w-[45%] opacity-[0.04] skew-x-[-20deg] origin-top-right"
          style={{ background: 'linear-gradient(to bottom, #D4AF37, #B8860B)' }}
        />
        {/* Top gold thin line */}
        <div className="absolute top-0 left-0 right-0 h-1 opacity-60"
          style={{ background: 'linear-gradient(to right, transparent, #D4AF37, #F1D279, #D4AF37, transparent)' }}
        />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{ boxShadow: '0 25px 60px -10px rgba(212, 175, 55, 0.15), 0 10px 30px -10px rgba(0,0,0,0.1)' }}>
          
          {/* Card top gold border */}
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(to right, #D4AF37, #F1D279, #B8860B)' }} />
          
          <div className="p-10 space-y-8">
            {/* Logo Area */}
            <div className="text-center">
              {companyLogo ? (
                <img src={companyLogo} alt="Logo da Empresa" className="h-20 mx-auto filter drop-shadow-md" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <h1 className="text-5xl font-black tracking-tighter" style={{ color: '#1A1A1A' }}>
                    DL<span style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>LOG</span>
                  </h1>
                </div>
              )}

              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-sm font-semibold tracking-widest uppercase" style={{ color: '#6B7280' }}>
                  Sistema de Gestão Logística
                </p>
                <div className="h-0.5 w-16 rounded-full" style={{ background: 'linear-gradient(to right, #D4AF37, #F1D279, #B8860B)' }} />
              </div>
            </div>

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>
                    Email
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    required
                    className="appearance-none block w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none transition-all text-sm"
                    style={{ 
                      borderColor: '#E5E7EB',
                      boxShadow: 'none',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.15)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>
                    Senha
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="appearance-none block w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none transition-all text-sm"
                    style={{ 
                      borderColor: '#E5E7EB',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#D4AF37'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.15)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = 'none'; }}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-center text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3.5 px-4 border-0 text-sm font-bold rounded-xl transition-all transform hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none"
                  style={{ 
                    background: 'linear-gradient(135deg, #D4AF37 0%, #F1D279 50%, #B8860B 100%)',
                    color: '#1A1A1A',
                    boxShadow: '0 8px 20px -4px rgba(212, 175, 55, 0.4)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 25px -4px rgba(212, 175, 55, 0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(212, 175, 55, 0.4)'; }}
                >
                  ENTRAR NO SISTEMA
                </button>
              </div>
            </form>
            
            <div className="text-center pt-2">
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#D4AF37' }}>
                Transparência · Cuidado · Prazo
              </p>
            </div>
          </div>
        </div>

        {/* Bottom attribution */}
        <p className="text-center mt-6 text-xs" style={{ color: '#9CA3AF' }}>
          © 2025 DLLOG — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
