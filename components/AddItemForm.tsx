
import React, { useState } from 'react';
import type { ContractItem } from '../types';
import { PdfItemExtractor } from './PdfItemExtractor';
import { SparklesIcon } from './icons/SparklesIcon';

interface AddItemFormProps {
  onClose: () => void;
  onAddItem: (item: Omit<ContractItem, 'id'>) => void;
}

export const AddItemForm: React.FC<AddItemFormProps> = ({ onClose, onAddItem }) => {
  const [isAiMode, setIsAiMode] = useState(false);
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
    onClose();
  };

  const handleExtractedItems = (items: Omit<ContractItem, 'id'>[]) => {
    items.forEach(item => onAddItem(item));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in-up overflow-hidden">
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Adicionar Novo Item</h2>
                <p className="text-xs text-gray-400 mt-0.5">Preencha manualmente ou use a IA</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsAiMode(true)}
                className="group flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg hover:shadow-yellow-500/20"
              >
                <SparklesIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                Extrair de PDF
              </button>
            </div>

            <div className="space-y-4">
               <div>
                  <label htmlFor="item" className="block text-sm font-medium text-gray-400 mb-1">Número do Item</label>
                  <input type="number" name="item" id="item" value={formData.item} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-gray-900 border ${errors.item ? 'border-red-500' : 'border-gray-700'} rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600`} placeholder="Ex: 1" />
                  {errors.item && <p className="text-red-500 text-xs mt-1">{errors.item}</p>}
              </div>
              <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
                  <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={3} className={`mt-1 block w-full px-3 py-2 bg-gray-900 border ${errors.description ? 'border-red-500' : 'border-gray-700'} rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600`} placeholder="Descreva o material ou serviço..."></textarea>
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="unitValue" className="block text-sm font-medium text-gray-400 mb-1">Valor Unit. (R$)</label>
                    <input type="number" name="unitValue" id="unitValue" value={formData.unitValue} onChange={handleChange} step="0.01" className={`mt-1 block w-full px-3 py-2 bg-gray-900 border ${errors.unitValue ? 'border-red-500' : 'border-gray-700'} rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600`} placeholder="0,00" />
                    {errors.unitValue && <p className="text-red-500 text-xs mt-1">{errors.unitValue}</p>}
                </div>
                <div>
                    <label htmlFor="quantityBid" className="block text-sm font-medium text-gray-400 mb-1">Qtd. Licitada</label>
                    <input type="number" name="quantityBid" id="quantityBid" value={formData.quantityBid} onChange={handleChange} className={`mt-1 block w-full px-3 py-2 bg-gray-900 border ${errors.quantityBid ? 'border-red-500' : 'border-gray-700'} rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 focus:ring-1 focus:ring-yellow-600`} placeholder="0" />
                    {errors.quantityBid && <p className="text-red-500 text-xs mt-1">{errors.quantityBid}</p>}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg border-t border-gray-700/50">
            <button type="button" onClick={onClose} className="py-2.5 px-6 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors">
              Cancelar
            </button>
            <button type="submit" className="inline-flex justify-center py-2.5 px-8 border border-transparent shadow-lg text-sm font-bold rounded-xl text-black bg-yellow-500 hover:bg-yellow-600 transition-all active:scale-95">
              Adicionar Item
            </button>
          </div>
        </form>
      </div>

      {isAiMode && <PdfItemExtractor onItemsExtracted={handleExtractedItems} onClose={() => setIsAiMode(false)} />}
      
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
