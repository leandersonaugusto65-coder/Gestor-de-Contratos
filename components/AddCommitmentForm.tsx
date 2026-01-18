
import React, { useState, useMemo } from 'react';
import type { Contract, Commitment } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { PdfCommitmentExtractor } from './PdfCommitmentExtractor';

interface AddCommitmentFormProps {
  contract: Contract;
  onClose: () => void;
  onAddCommitment: (commitment: Omit<Commitment, 'id'>) => void;
}

export const AddCommitmentForm: React.FC<AddCommitmentFormProps> = ({ contract, onClose, onAddCommitment }) => {
    const [isAiMode, setIsAiMode] = useState(false);
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

    // FUNÇÃO CORRIGIDA: Salva direto ao receber dados da IA
    const handleExtractedData = (data: { commitmentNumber: string; date: string; items: any[] }) => {
        const itemsToCommit = data.items
            .filter(i => i.contractItemId)
            .map(i => ({
                contractItemId: Number(i.contractItemId),
                quantity: Number(i.quantity) || 0,
            }))
            .filter(item => item.quantity > 0);

        if (itemsToCommit.length > 0 && data.commitmentNumber.trim()) {
            // Executa o salvamento final imediatamente
            onAddCommitment({
                commitmentNumber: data.commitmentNumber.trim(),
                date: data.date,
                items: itemsToCommit
            });
            // Fecha o formulário principal e o modo IA de uma vez
            onClose();
        } else {
            // Caso falte algum dado crítico, apenas preenche o formulário para ajuste manual
            setCommitmentNumber(data.commitmentNumber);
            setDate(data.date);
            const newQuantities: Record<number, string> = {};
            data.items.forEach(i => {
                if (i.contractItemId) newQuantities[i.contractItemId] = i.quantity.toString();
            });
            setItemQuantities(newQuantities);
            setIsAiMode(false);
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
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up">
                <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Novo Empenho</h2>
                        <button 
                            type="button"
                            onClick={() => setIsAiMode(true)}
                            className="group flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-lg"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            Importar de PDF
                        </button>
                    </div>
                    <div className="p-6 space-y-4 flex-grow overflow-y-auto bg-gray-900/20">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="commitmentNumber" className="block text-xs font-bold text-gray-500 uppercase mb-1">Número do Empenho</label>
                                <input type="text" id="commitmentNumber" value={commitmentNumber} onChange={e => setCommitmentNumber(e.target.value)} className={`block w-full bg-gray-900 border ${errors.commitmentNumber ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2 text-white focus:border-yellow-500 outline-none`} autoFocus />
                                {errors.commitmentNumber && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.commitmentNumber}</p>}
                            </div>
                            <div>
                                <label htmlFor="date" className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className={`block w-full bg-gray-900 border ${errors.date ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-2 text-white focus:border-yellow-500 outline-none`} />
                                {errors.date && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.date}</p>}
                            </div>
                        </div>
                        <div className="pt-4">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Itens para Empenhar</h3>
                                {errors.items && <p className="text-red-500 text-[10px] font-bold uppercase">{errors.items}</p>}
                             </div>
                            <div className="space-y-3">
                                {contract.items.map(item => (
                                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-3 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-700/50 transition-colors">
                                        <div className="col-span-8">
                                            <p className="font-bold text-white text-sm">
                                                <span className="text-yellow-500">Item {item.item}:</span> {item.description}
                                            </p>
                                            <p className="text-[10px] text-gray-500 uppercase font-black">Saldo a empenhar: {balanceToCommit[item.id]}</p>
                                        </div>
                                        <div className="col-span-4">
                                            <input
                                                type="number"
                                                placeholder="Qtd."
                                                value={itemQuantities[item.id] || ''}
                                                onChange={e => handleQuantityChange(item.id, e.target.value, balanceToCommit[item.id])}
                                                max={balanceToCommit[item.id]}
                                                min="0"
                                                className="w-full text-center bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white focus:border-yellow-500 outline-none font-bold"
                                                disabled={balanceToCommit[item.id] === 0}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-900 px-6 py-4 flex justify-end space-x-3 rounded-b-lg border-t border-gray-700/50">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-400">Cancelar</button>
                        <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-black font-black px-10 py-2 rounded-2xl shadow-lg active:scale-95 transition-all">Salvar Empenho</button>
                    </div>
                </form>
            </div>
            {isAiMode && <PdfCommitmentExtractor contract={contract} onDataExtracted={handleExtractedData} onClose={() => setIsAiMode(false)} />}
        </div>
    );
};
