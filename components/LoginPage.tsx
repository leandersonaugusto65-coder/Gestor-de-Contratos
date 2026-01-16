import React, { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ResetPasswordModal } from './ResetPasswordModal';
import { LogoPlaceholder } from './icons/LogoPlaceholder';

// Icons for password visibility
const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
  </svg>
);

interface LoginPageProps {
  supabaseClient: SupabaseClient;
}

type ActiveTab = 'login' | 'register';

export const LoginPage: React.FC<LoginPageProps> = ({ supabaseClient }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  const resetFormState = () => {
      setEmail('');
      setPassword('');
      setName('');
      setError(null);
      setMessage(null);
      setShowPassword(false);
  }

  const handleTabChange = (tab: ActiveTab) => {
      setActiveTab(tab);
      resetFormState();
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        if (error.message.includes('Email not confirmed')) {
            setError('Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada.');
        } else if (error.message.includes('Invalid login credentials')) {
            setError('E-mail ou senha inválidos.');
        } else {
            setError('Não foi possível fazer login. Tente novamente.');
        }
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    setIsLoading(true);
    const { error } = await supabaseClient.auth.signUp({
        email, 
        password,
        options: {
            data: {
                full_name: name,
            }
        }
    });

    if (error) {
        setError(error.message);
    } else {
        setMessage('Cadastro realizado! Verifique seu e-mail (e a caixa de spam) para confirmar sua conta antes de entrar.');
        setActiveTab('login');
        resetFormState();
    }
    setIsLoading(false);
  }

  type TabButtonProps = { tab: ActiveTab; children: React.ReactNode; };
  const TabButton: React.FC<TabButtonProps> = ({ tab, children }) => (
    <button
      type="button"
      onClick={() => handleTabChange(tab)}
      className={`w-full py-3 text-sm font-semibold leading-5 focus:outline-none transition-colors duration-300 ${
        activeTab === tab 
          ? 'text-amber-500 border-b-2 border-amber-500' 
          : 'text-slate-400 hover:text-slate-200'
        }`
      }
    >
      {children}
    </button>
  );

  return (
    <>
      <div className="min-h-screen flex flex-col justify-center items-center bg-black p-4 font-sans">
        <div className="w-full max-w-sm mx-auto bg-[#2B3441] rounded-2xl shadow-2xl border border-slate-700 overflow-hidden animate-fade-in-up">
          <div className="flex flex-col items-center pt-10 pb-6">
              <LogoPlaceholder className="h-20 w-20 mb-4 shadow-lg" />
              <h1 className="text-2xl font-bold text-slate-100">Oficina da Arte</h1>
              <p className="text-slate-400 text-sm mt-1">Acesse ou crie sua conta</p>
          </div>

          <div className="px-6">
              <div className="flex space-x-1">
                  <TabButton tab="login">Entrar</TabButton>
                  <TabButton tab="register">Criar Conta</TabButton>
              </div>
          </div>

          <div className="p-6">
              {message && (<p className="text-sm text-green-300 bg-green-500/10 p-3 rounded-lg border border-green-500/20 mb-4 text-center">{message}</p>)}
              {error && (<p className="text-sm text-red-300 bg-red-500/10 p-3 rounded-lg border border-red-500/20 mb-4 text-center">{error}</p>)}

              {activeTab === 'login' ? (
                   <form onSubmit={handleLogin} className="space-y-5">
                      <div>
                        <label htmlFor="email-login" className="block text-sm font-medium text-slate-300 mb-1">E-mail</label>
                        <input id="email-login" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-style" />
                      </div>

                      <div>
                        <div className="flex justify-between items-baseline mb-1">
                          <label htmlFor="password-login" className="block text-sm font-medium text-slate-300">Senha</label>
                          <button type="button" onClick={() => setIsResettingPassword(true)} className="text-xs text-amber-500 hover:text-amber-400 font-semibold">Esqueceu a senha?</button>
                        </div>
                        <div className="relative">
                          <input id="password-login" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-style" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200">
                            {showPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button type="submit" disabled={isLoading} className="button-primary">
                            {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 'Entrar'}
                        </button>
                      </div>
                  </form>
              ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                          <label htmlFor="register-name" className="block text-sm font-medium text-slate-300 mb-1">Nome</label>
                          <input id="register-name" name="name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className="input-style" />
                      </div>
                      <div>
                          <label htmlFor="register-email" className="block text-sm font-medium text-slate-300 mb-1">E-mail</label>
                          <input id="register-email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-style" />
                      </div>
                      <div>
                          <label htmlFor="register-password" className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
                          <input id="register-password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-style" />
                          <p className="text-xs text-slate-500 mt-1">Mínimo de 6 caracteres.</p>
                      </div>
                      <div className="pt-2">
                        <button type="submit" disabled={isLoading} className="button-primary">
                            {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 'Criar Conta'}
                        </button>
                      </div>
                  </form>
              )}
          </div>
        </div>
        <style>{`
          .input-style { appearance: none; display: block; width: 100%; padding: 0.75rem; border: 1px solid #475569; border-radius: 0.5rem; background-color: #1E293B; color: #f8fafc; transition: border-color 0.2s; }
          .input-style::placeholder { color: #64748b; }
          .input-style:focus { outline: 2px solid transparent; outline-offset: 2px; border-color: #f59e0b; }
          .button-primary { width: 100%; display: flex; justify-content: center; padding: 0.75rem 1rem; border: 1px solid transparent; border-radius: 0.5rem; font-size: 0.875rem; line-height: 1.25rem; font-weight: 600; color: #1E293B; background-color: #ca8a04; transition: background-color 0.2s; }
          .button-primary:hover:not(:disabled) { background-color: #d97706; }
          .button-primary:focus { outline: 2px solid transparent; outline-offset: 2px; }
          .button-primary:disabled { background-color: #b45309; cursor: not-allowed; }
          @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
        `}</style>
      </div>
      {isResettingPassword && (
        <ResetPasswordModal 
            supabaseClient={supabaseClient} 
            onClose={() => {
                setIsResettingPassword(false);
                setError(null);
                setMessage(null);
            }} 
            onSuccess={(msg) => {
                setIsResettingPassword(false);
                setMessage(msg);
            }}
        />
      )}
    </>
  );
};