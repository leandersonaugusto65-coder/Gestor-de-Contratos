
import React from 'react';
import type { DashboardCommitment } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';
import { CommitmentCard } from './CommitmentCard';

interface CommitmentDetailModalProps {
  commitment: DashboardCommitment;
  onClose: () => void;
  onDelete: () => void;
  isReadOnly: boolean;
}

export const CommitmentDetailModal: React.FC<CommitmentDetailModalProps> = ({ commitment, onClose, onDelete, isReadOnly }) => {
    
    return (
        <div className="fixed inset-0 bg-gray-900/75 dark:bg-black/70 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up">
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Detalhes do Empenho</h2>
                    <button onClick={onClose} className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="p-6 flex-grow overflow-y-auto bg-gray-50 dark:bg-gray-900">
                   <CommitmentCard 
                        commitment={commitment} 
                        contractItems={commitment.contractItems} 
                        allCommitments={commitment.allContractCommitments}
                        allInvoices={commitment.allContractInvoices}
                        onDelete={onDelete}
                        isReadOnly={isReadOnly}
                    />
                </div>
                <footer className="bg-white dark:bg-gray-800 px-6 py-3 flex justify-end rounded-b-lg border-t border-gray-200 dark:border-gray-700">
                    <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                        Fechar
                    </button>
                </footer>
            </div>
             <style>{`
              @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in-up {
                animation: fade-in-up 0.3s ease-out forwards;
              }
            `}</style>
        </div>
    );
};