import React from 'react';
import { XMarkIcon } from './icons/XMarkIcon';

interface ConfirmUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

export const ConfirmUpdateModal: React.FC<ConfirmUpdateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmButtonClass = 'bg-yellow-600 hover:bg-yellow-700'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-md animate-fade-in-up">
        <div className="p-6">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <div className="mt-2 text-sm text-gray-300">{message}</div>
        </div>
        <div className="bg-gray-900 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
          <button onClick={onClose} type="button" className="py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600">
            {cancelText}
          </button>
          <button onClick={onConfirm} type="button" className={`inline-flex items-center justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${confirmButtonClass}`}>
            {confirmText}
          </button>
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
    </div>
  );
};