
import React, { useState, useMemo } from 'react';
import type { Contract, Invoice, InvoiceItem } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { PdfInvoiceExtractor } from './PdfInvoiceExtractor';

interface AddInvoiceFormProps {
  contract: Contract;
  onClose: () => void;
  onAddInvoice: (invoice: Omit<Invoice, 'id' | 'isPaid'>) => void;
}

export const AddInvoiceForm: React.FC<AddInvoiceFormProps> = ({ contract, onClose, onAddInvoice }) => {
    const [isAiMode, setIsAiMode] = useState(false);
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

    // FUNÇÃO CORRIGIDA: Salva direto ao receber dados da IA
    const handleExtractedData = (data: { invoiceNumber: string; date: string; items: any[] }) => {
        const itemsToSupply: InvoiceItem[] = data.items
            .filter(i => i.contractItemId)
            .map(i => ({
                contractItemId: Number(i.contractItemId),
                quantitySupplied: Number(i.quantitySupplied) || 0,
            }))
            .filter(item => item.quantitySupplied > 0);

        if (itemsToSupply.length > 0 && data.invoiceNumber.trim()) {
            // Executa o salvamento final imediatamente
            onAddInvoice({
                invoiceNumber: data.invoiceNumber.trim(),
                date: data.date,
                items: itemsToSupply
            });
            // Fecha o formulário principal e o modo IA de uma vez
            onClose();
        } else {
            // Caso falte algum dado crítico, apenas preenche o formulário para ajuste manual
            setInvoiceNumber(data.invoiceNumber);
            setDate(data.date);
            const newQuantities: Record<number, string> = {};
            data.items.forEach(i => {
                if (i.contractItemId) newQuantities[i.contractItemId] = i.quantitySupplied.toString();
            });
            setItemQuantities(newQuantities);
            setIsAiMode(false);
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
        onClose();
    };
    
    const itemsWithBalanceToSupply = contract.items.filter(item => balanceToSupply[item.id] > 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
                <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Nova Nota Fiscal</h2>
                        <button 
                            type="button"
                            onClick={() => setIsAiMode(true)}
                            className="group flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            Importar DANFE (PDF)
                        </button>
                    </div>
                    <div className="p-6 space-y-4 flex-grow overflow-y-auto bg-gray-900/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="invoiceNumber" className="block text-xs font-bold text-gray-500 uppercase mb-1">Número da Nota Fiscal</label>
                                <input type="text" id="invoiceNumber" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className={`block w-full bg-gray-900 border ${errors.invoiceNumber ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2 text-white focus:border-green-500 outline-none`} autoFocus />
                                {errors.invoiceNumber && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.invoiceNumber}</p>}
                            </div>
                            <div>
                                <label htmlFor="date" className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className={`block w-full bg-gray-900 border ${errors.date ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2 text-white focus:border-green-500 outline-none`} />
                                {errors.date && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.date}</p>}
                            </div>
                        </div>
                        <div className="pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Itens para Fornecer</h3>
                                {errors.items && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.items}</p>}
                            </div>
                            {itemsWithBalanceToSupply.length > 0 ? (
                                <div className="space-y-3">
                                    {itemsWithBalanceToSupply.map(item => (
                                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-3 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-colors">
                                            <div className="col-span-8">
                                                <p className="font-bold text-white text-sm">
                                                    <span className="text-green-500">Item {item.item}:</span> {item.description}
                                                </p>
                                                <p className="text-[10px] text-gray-500 uppercase font-black">Saldo pendente: {balanceToSupply[item.id]}</p>
                                            </div>
                                            <div className="col-span-4">
                                                <input
                                                    type="number"
                                                    placeholder="Qtd."
                                                    value={itemQuantities[item.id] || ''}
                                                    onChange={e => handleQuantityChange(item.id, e.target.value, balanceToSupply[item.id])}
                                                    max={balanceToSupply[item.id]}
                                                    min="0"
                                                    className="w-full text-center bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white focus:border-green-500 outline-none font-bold"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-gray-900/30 rounded-2xl border-2 border-dashed border-gray-800">
                                   <p className="text-gray-500 italic">Nenhum item com saldo a fornecer.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-900 px-6 py-4 flex justify-end space-x-3 rounded-b-lg border-t border-gray-700/50">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-400">Cancelar</button>
                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-black px-10 py-2 rounded-2xl shadow-lg active:scale-95 transition-all" disabled={itemsWithBalanceToSupply.length === 0}>Salvar Nota Fiscal</button>
                    </div>
                </form>
            </div>
            {isAiMode && <PdfInvoiceExtractor contract={contract} onDataExtracted={handleExtractedData} onClose={() => setIsAiMode(false)} />}
        </div>
    );
};
