
import React, { useState, useMemo } from 'react';
import type { Contract, Commitment } from '../types';

interface AddCommitmentFormProps {
  contract: Contract;
  onClose: () => void;
  onAddCommitment: (commitment: Omit<Commitment, 'id'>) => void;
}

export const AddCommitmentForm: React.FC<AddCommitmentFormProps> = ({ contract, onClose, onAddCommitment }) => {
    const [commitmentNumber, setCommitmentNumber] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [itemQuantities, setItemQuantities] = useState<Record<number, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const balanceToCommit = useMemo(() => {
        const balances: Record<number, number> = {};
        contract.items.forEach(item => {
            const totalCommitted = contract.commitments.reduce((sum, c) => 
                sum + (c.items.find(ci => ci.contractItemId === item.id)?.quantity ?? 0)
            , 0);
            balances[item.id] = item.quantityBid - totalCommitted;
        });
        return balances;
    }, [contract]);

    const handleQuantityChange = (itemId: number, value: string, max: number) => {
        const numValue = parseInt(value, 10);
        if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= max)) {
            setItemQuantities(prev => ({ ...prev, [itemId]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        if (!commitmentNumber.trim()) newErrors.commitmentNumber = 'O número do empenho é obrigatório.';
        if (!date) newErrors.date = 'A data é obrigatória.';

        const itemsToCommit = Object.entries(itemQuantities)
            .map(([itemId, quantity]) => ({
                contractItemId: Number(itemId),
                quantity: Number(quantity) || 0,
            }))
            .filter(item => item.quantity > 0);

        if (itemsToCommit.length === 0) {
            newErrors.items = 'Adicione a quantidade para pelo menos um item.';
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        onAddCommitment({
            commitmentNumber: commitmentNumber.trim(),
            date,
            items: itemsToCommit
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
                <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">Adicionar Novo Empenho</h2>
                    </div>
                    <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="commitmentNumber" className="block text-sm font-medium text-gray-300">Número do Empenho</label>
                                <input type="text" id="commitmentNumber" value={commitmentNumber} onChange={e => setCommitmentNumber(e.target.value)} className={`mt-1 block w-full input ${errors.commitmentNumber ? 'border-red-500' : 'border-gray-600'}`} autoFocus />
                                {errors.commitmentNumber && <p className="text-red-500 text-xs mt-1">{errors.commitmentNumber}</p>}
                            </div>
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-300">Data</label>
                                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className={`mt-1 block w-full input ${errors.date ? 'border-red-500' : 'border-gray-600'}`} />
                                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                            </div>
                        </div>
                        <div className="pt-4">
                            <h3 className="text-lg font-semibold text-gray-100 mb-2">Itens para Empenhar</h3>
                             {errors.items && <p className="text-red-500 text-sm mb-2">{errors.items}</p>}
                            <div className="space-y-3">
                                {contract.items.map(item => (
                                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md hover:bg-gray-700/50">
                                        <div className="col-span-8">
                                            <p className="font-medium text-gray-200 text-sm">
                                                <span className="font-bold text-yellow-500">Item {item.item}:</span> {item.description}
                                            </p>
                                            <p className="text-xs text-gray-400">Saldo a empenhar: <span className="font-bold">{balanceToCommit[item.id]}</span></p>
                                        </div>
                                        <div className="col-span-4">
                                            <input
                                                type="number"
                                                placeholder="Qtd."
                                                value={itemQuantities[item.id] || ''}
                                                onChange={e => handleQuantityChange(item.id, e.target.value, balanceToCommit[item.id])}
                                                max={balanceToCommit[item.id]}
                                                min="0"
                                                className="w-full text-center input"
                                                disabled={balanceToCommit[item.id] === 0}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-900 px-6 py-3 flex justify-end space-x-3 rounded-b-lg border-t border-gray-700">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary">Salvar Empenho</button>
                    </div>
                </form>
            </div>
            <style>{`
                .input {
                    display: block;
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    background-color: #374151;
                    border-width: 1px;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    color: white;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                }
                .input:focus {
                    outline: 2px solid transparent;
                    outline-offset: 2px;
                    --tw-ring-color: #ca8a04;
                    border-color: #ca8a04;
                }
                .input:disabled {
                    background-color: #4b5563;
                    cursor: not-allowed;
                }
                .btn-primary {
                    display: inline-flex; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: white; background-color: #ca8a04;
                }
                .btn-primary:hover { background-color: #a16207; }
                .btn-secondary {
                    padding: 0.5rem 1rem; border: 1px solid #4b5563; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); font-size: 0.875rem; font-weight: 500; color: #d1d5db; background-color: #374151;
                }
                 .btn-secondary:hover { background-color: #4b5563; }
            `}</style>
        </div>
    );
};