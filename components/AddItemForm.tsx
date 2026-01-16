
import React, { useState } from 'react';
import type { ContractItem } from '../types';

interface AddItemFormProps {
  onClose: () => void;
  onAddItem: (item: Omit<ContractItem, 'id'>) => void;
}

export const AddItemForm: React.FC<AddItemFormProps> = ({ onClose, onAddItem }) => {
  const [formData, setFormData] = useState({
    item: '',
    description: '',
    unitValue: '',
    quantityBid: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if(errors[name]) {
      setErrors(prev => ({...prev, [name]: ''}));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const bid = Number(formData.quantityBid);

    if (!formData.item || isNaN(Number(formData.item))) newErrors.item = 'Número inválido.';
    if (!formData.description.trim()) newErrors.description = 'Descrição é obrigatória.';
    if (!formData.unitValue || isNaN(Number(formData.unitValue)) || Number(formData.unitValue) <= 0) newErrors.unitValue = 'Valor unitário inválido.';
    if (!formData.quantityBid || isNaN(bid) || bid <= 0) newErrors.quantityBid = 'Qtd. licitada inválida.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    onAddItem({
      item: Number(formData.item),
      description: formData.description,
      unitValue: Number(formData.unitValue),
      quantityBid: Number(formData.quantityBid),
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/75 dark:bg-black/70 z-50 flex justify-center items-center p-4">
      <div className="bg-slate-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl w-full max-w-lg animate-fade-in-up">
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Adicionar Novo Item</h2>
            <div className="space-y-4">
               <div>
                  <label htmlFor="item" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número do Item</label>
                  <input type="number" name="item" id="item" value={formData.item} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-slate-200 dark:bg-gray-700 border ${errors.item ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md text-sm shadow-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600`} />
                  {errors.item && <p className="text-red-500 text-xs mt-1">{errors.item}</p>}
              </div>
              <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
                  <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={3} className={`mt-1 block w-full px-3 py-2 bg-slate-200 dark:bg-gray-700 border ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md text-sm shadow-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600`}></textarea>
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="unitValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor Unit. (R$)</label>
                    <input type="number" name="unitValue" id="unitValue" value={formData.unitValue} onChange={handleChange} step="0.01" className={`mt-1 block w-full px-3 py-2 bg-slate-200 dark:bg-gray-700 border ${errors.unitValue ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md text-sm shadow-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600`} />
                    {errors.unitValue && <p className="text-red-500 text-xs mt-1">{errors.unitValue}</p>}
                </div>
                <div>
                    <label htmlFor="quantityBid" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Qtd. Licitada</label>
                    <input type="number" name="quantityBid" id="quantityBid" value={formData.quantityBid} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-slate-200 dark:bg-gray-700 border ${errors.quantityBid ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md text-sm shadow-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600`} />
                    {errors.quantityBid && <p className="text-red-500 text-xs mt-1">{errors.quantityBid}</p>}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-gray-900 px-6 py-3 flex justify-end space-x-3 rounded-b-lg">
            <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-slate-50 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600">
              Cancelar
            </button>
            <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-600">
              Adicionar Item
            </button>
          </div>
        </form>
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