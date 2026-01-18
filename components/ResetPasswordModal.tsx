import React, { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface ResetPasswordModalProps {
  supabaseClient: SupabaseClient;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ supabaseClient, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, 
    });

    if (error) {
      setError('Não foi possível enviar o link. Verifique o e-mail e tente novamente.');
    } else {
      onSuccess('Link de recuperação enviado! Verifique sua caixa de entrada.');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md animate-fade-in-up">
        <form onSubmit={handlePasswordReset}>
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-2">Recuperar Senha</h2>
            <p className="text-sm text-gray-300 mb-4">
              Digite seu e-mail e enviaremos um link para você cadastrar uma nova senha.
            </p>
            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-300">E-mail</label>
              <input 
                id="reset-email" 
                name="email" 
                type="email" 
                autoComplete="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm shadow-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-600"
                autoFocus
              />
            </div>
          </div>
          <div className="bg-gray-900 px-6 py-3 flex justify-end space-x-3 rounded-b-lg">
            <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 disabled:cursor-not-allowed">
              {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : 'Enviar Link'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
          @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};