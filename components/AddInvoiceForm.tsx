import React, { useState, useMemo } from 'react';
import type { Contract, Invoice, InvoiceItem } from '../types';

interface AddInvoiceFormProps {
  contract: Contract;
  onClose: () => void;
  onAddInvoice: (invoice: Omit<Invoice, 'id' | 'isPaid'>) => void;
}

export const AddInvoiceForm: React.FC<AddInvoiceFormProps> = ({ contract, onClose, onAddInvoice }) => {
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [itemQuantities, setItemQuantities] = useState<Record<number, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    const balanceToSupply = useMemo(() => {
        const balances: Record<number, number> = {};
        contract.items.forEach(item => {
            const totalCommitted = contract.commitments.reduce((sum, c) => 
                sum + (c.items.find(ci => ci.contractItemId === item.id)?.quantity ?? 0)
            , 0);
            const totalSupplied = contract.invoices.reduce((sum, inv) => 
                sum + (inv.items.find(i => i.contractItemId === item.id)?.quantitySupplied ?? 0)
            , 0);
            balances[item.id] = totalCommitted - totalSupplied;
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
        if (!invoiceNumber.trim()) newErrors.invoiceNumber = 'O número da nota fiscal é obrigatório.';
        if (!date) newErrors.date = 'A data é obrigatória.';

        const itemsToSupply: InvoiceItem[] = Object.entries(itemQuantities)
            .map(([itemId, quantity]) => ({
                contractItemId: Number(itemId),
                quantitySupplied: Number(quantity) || 0,
            }))
            .filter(item => item.quantitySupplied > 0);

        if (itemsToSupply.length === 0) {
            newErrors.items = 'Adicione a quantidade para pelo menos um item.';
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        onAddInvoice({
            invoiceNumber: invoiceNumber.trim(),
            date,
            items: itemsToSupply
        });
        // Fecha o modal após adicionar
        onClose();
    };
    
    const itemsWithBalanceToSupply = contract.items.filter(item => balanceToSupply[item.id] > 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
                <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">Adicionar Nota Fiscal</h2>
                    </div>
                    <div className="p-6 space-y-4 flex-grow overflow-y-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-300">Número da Nota Fiscal</label>
                                <input type="text" id="invoiceNumber" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className={`mt-1 block w-full input ${errors.invoiceNumber ? 'border-red-500' : 'border-gray-600'}`} autoFocus />
                                {errors.invoiceNumber && <p className="text-red-500 text-xs mt-1">{errors.invoiceNumber}</p>}
                            </div>
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-300">Data</label>
                                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className={`mt-1 block w-full input ${errors.date ? 'border-red-500' : 'border-gray-600'}`} />
                                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                            </div>
                        </div>
                        <div className="pt-4">
                            <h3 className="text-lg font-semibold text-gray-100 mb-2">Itens para Fornecer</h3>
                            {errors.items && <p className="text-red-500 text-sm mb-2">{errors.items}</p>}
                            {itemsWithBalanceToSupply.length > 0 ? (
                                <div className="space-y-3">
                                    {itemsWithBalanceToSupply.map(item => (
                                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md hover:bg-gray-700/50">
                                            <div className="col-span-8">
                                                <p className="font-medium text-gray-200 text-sm">
                                                    <span className="font-bold text-yellow-500">Item {item.item}:</span> {item.description}
                                                </p>
                                                <p className="text-xs text-gray-400">Saldo a fornecer: <span className="font-bold">{balanceToSupply[item.id]}</span></p>
                                            </div>
                                            <div className="col-span-4">
                                                <input
                                                    type="number"
                                                    placeholder="Qtd."
                                                    value={itemQuantities[item.id] || ''}
                                                    onChange={e => handleQuantityChange(item.id, e.target.value, balanceToSupply[item.id])}
                                                    max={balanceToSupply[item.id]}
                                                    min="0"
                                                    className="w-full text-center input"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-400 py-4">Nenhum item com saldo a fornecer.</p>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-900 px-6 py-3 flex justify-end space-x-3 rounded-b-lg border-t border-gray-700">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={itemsWithBalanceToSupply.length === 0}>Salvar Nota Fiscal</button>
                    </div>
                </form>
            </div>
             <style>{`
                .input { display: block; width: 100%; padding: 0.5rem 0.75rem; background-color: #374151; border: 1px solid #4b5563; border-radius: 0.375rem; font-size: 0.875rem; color: white; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
                .input:focus { outline: 2px solid transparent; outline-offset: 2px; --tw-ring-color: #ca8a04; border-color: #ca8a04; }
                .input:disabled { background-color: #4b5563; cursor: not-allowed; }
                .btn-primary { display: inline-flex; justify-content: center; padding: 0.5rem 1rem; border: 1px solid transparent; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: black; background-color: #eab308; }
                .btn-primary:hover { background-color: #ca8a04; }
                .btn-primary:disabled { background-color: #4b5563; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; border: 1px solid #4b5563; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); font-size: 0.875rem; font-weight: 500; color: #d1d5db; background-color: #374151; }
                .btn-secondary:hover { background-color: #4b5563; }
            `}</style>
        </div>
    );
};