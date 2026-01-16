import React, { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { CheckIcon } from './icons/CheckIcon';
import { HourglassIcon } from './icons/HourglassIcon';

interface AdminPanelProps {
  supabase: SupabaseClient;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ supabase, onClose }) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('email', { ascending: true });

    if (error) {
      setError('Não foi possível carregar os usuários. Verifique se você tem permissão de administrador.');
      console.error(error);
    } else {
      setUsers(data);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handlePermissionChange = async (userId: string, newPermission: string) => {
    let newRole: 'editor' | 'user' = 'user';
    let newApprovalStatus = false;

    if (newPermission === 'editor') {
        newRole = 'editor';
        newApprovalStatus = true;
    } else if (newPermission === 'user') {
        newRole = 'user';
        newApprovalStatus = true;
    } // else it's 'pending', defaults are correct (is_approved: false, role: 'user')
    
    setUpdatingUserId(userId);
    const { data: updatedUser, error } = await supabase
        .from('profiles')
        .update({ role: newRole, is_approved: newApprovalStatus })
        .eq('id', userId)
        .select()
        .single();
    
    if (error) {
        console.error("Error updating user:", error);
        setError(`Falha ao atualizar o usuário ${userId}.`);
        // Optionally revert UI change here or refetch all users
    } else if(updatedUser) {
        setUsers(currentUsers => 
            currentUsers.map(u => u.id === userId ? updatedUser : u)
        );
    }
    setUpdatingUserId(null);
  };
  
  const getPermissionValue = (user: Profile): string => {
    if (!user.is_approved) return 'pending';
    if (user.role === 'editor') return 'editor';
    if (user.role === 'user') return 'user';
    return 'pending'; // fallback
  }

  return (
    <div className="fixed inset-0 bg-gray-900/75 dark:bg-black/70 z-50 flex justify-center items-center p-4">
      <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gerenciar Usuários</h2>
          <button onClick={onClose} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="p-4 sm:p-6 flex-grow overflow-y-auto bg-slate-100 dark:bg-gray-900/30">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <SpinnerIcon className="w-8 h-8 animate-spin text-yellow-600" />
            </div>
          ) : error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : (
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate" title={user.full_name}>{user.full_name || '(Nome não informado)'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate" title={user.email}>{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                     {updatingUserId === user.id && <SpinnerIcon className="w-5 h-5 animate-spin text-yellow-500" />}
                    {user.role === 'admin' ? (
                        <span className="text-xs font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1.5 rounded-full w-full text-center sm:w-36">
                            Admin
                        </span>
                    ) : (
                      <select 
                        value={getPermissionValue(user)}
                        onChange={(e) => handlePermissionChange(user.id, e.target.value)}
                        disabled={updatingUserId === user.id}
                        className="w-full sm:w-48 text-xs font-bold py-1.5 px-3 rounded-lg border-gray-300 dark:border-gray-600 focus:ring-yellow-500 focus:border-yellow-500 bg-slate-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                      >
                          <option value="editor">Aprovado (Editor)</option>
                          <option value="user">Aprovado (Leitura)</option>
                          <option value="pending">Pendente</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <footer className="bg-slate-50 dark:bg-gray-900 px-6 py-3 flex justify-end rounded-b-lg border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-slate-50 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600">
            Fechar
          </button>
        </footer>
      </div>
      <style>{`
          @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};