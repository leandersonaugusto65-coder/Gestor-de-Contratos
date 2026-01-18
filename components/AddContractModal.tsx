
import React, { useState, useEffect } from 'react';
import type { Client, Contract, ContractItem } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { formatCNPJ, validateCNPJ, stripCNPJ } from '../utils/cnpj';
import { SparklesIcon } from './icons/SparklesIcon';
import { PdfFullExtractor } from './PdfFullExtractor';

interface AddContractModalProps {
  clients: Client[];
  onClose: () => void;
  onAddContract: (args: { 
    clientName: string; 
    address: string; 
    cep: string; 
    contractData: Omit<Contract, 'id' | 'items' | 'commitments' | 'invoices'>;
    items?: Omit<ContractItem, 'id'>[];
  }) => void;
}

export const AddContractModal: React.FC<AddContractModalProps> = ({ clients, onClose, onAddContract }) => {
    const [isAiMode, setIsAiMode] = useState(false);
    const [clientName, setClientName] = useState('');
    const [biddingId, setBiddingId] = useState('');
    const [biddingType, setBiddingType] = useState<'pregão' | 'dispensa'>('pregão');
    const [creationDate, setCreationDate] = useState(new Date().toISOString().split('T')[0]);
    const [cnpj, setCnpj] = useState('');
    const [uasg, setUasg] = useState('');
    const [address, setAddress] = useState('');
    const [cep, setCep] = useState('');
    const [extractedItems, setExtractedItems] = useState<Omit<ContractItem, 'id'>[]>([]);
    
    const [error, setError] = useState<string | null>(null);
    const [cnpjError, setCnpjError] = useState<string | null>(null);

    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    
    const debouncedCnpj = useDebounce(cnpj, 800);

    const fetchCnpjData = async (cnpjToFetch: string) => {
        const onlyNumbersCnpj = stripCNPJ(cnpjToFetch);
        if (onlyNumbersCnpj.length !== 14) return;
        
        if (!validateCNPJ(onlyNumbersCnpj)) {
            setCnpjError('CNPJ inválido.');
            return;
        }
        
        setCnpjError(null);
        setIsFetchingCnpj(true);
        setApiError(null);

        try {
            const brasilApiResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${onlyNumbersCnpj}`);
            if (!brasilApiResponse.ok) throw new Error('CNPJ não encontrado na Receita Federal.');
            
            const data = await brasilApiResponse.json();
            if (data) {
                // Só atualiza se o campo estiver vazio ou se for uma busca manual iniciada pelo usuário
                setClientName(prev => prev || data.razao_social || data.nome_fantasia);
                const formattedAddress = [
                    data.logradouro, 
                    data.numero, 
                    data.complemento, 
                    data.bairro, 
                    data.municipio, 
                    data.uf
                ].filter(Boolean).join(', ');
                setAddress(prev => prev || formattedAddress);
                if (data.cep) setCep(prev => prev || data.cep.replace(/\D/g, ''));
            }
        } catch (err) {
            setApiError(err instanceof Error ? err.message : 'Erro ao buscar CNPJ.');
        } finally {
            setIsFetchingCnpj(false);
        }
    };

    useEffect(() => {
        if (debouncedCnpj) fetchCnpjData(debouncedCnpj);
    }, [debouncedCnpj]);
    
    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = formatCNPJ(val);
        setCnpj(formatted);
        if (stripCNPJ(formatted).length < 14) {
             setCnpjError(null);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName.trim()) {
            setError('O nome do cliente é obrigatório.');
            return;
        }

        onAddContract({ 
            clientName: clientName.trim(),
            address: address.trim(),
            cep: cep.trim(),
            contractData: {
                biddingId: biddingId.trim(),
                biddingType,
                creationDate: creationDate,
                cnpj: stripCNPJ(cnpj),
                uasg: stripCNPJ(uasg),
            },
            items: extractedItems
        });
        onClose();
    };

    const handleAiExtractedData = (data: any) => {
        // Logica de preenchimento prioritário dos dados da IA
        setClientName(data.clientName);
        setUasg(data.uasg);
        setCnpj(formatCNPJ(data.cnpj));
        setBiddingId(data.biddingId);
        setBiddingType(data.biddingType);
        setAddress(data.address);
        setCep(data.cep);
        setExtractedItems(data.items || []);
        setIsAiMode(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in-up">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <header className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Novo Contrato</h2>
                                <p className="text-[10px] text-gray-500 uppercase font-black">Configure os dados principais</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsAiMode(true)}
                                className="group flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-black font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-xl hover:shadow-yellow-500/20"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                Importar PDF
                            </button>
                        </header>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Órgão / Razão Social</label>
                                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all font-bold" placeholder="Nome do Órgão"/>
                            </div>

                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">CNPJ</label>
                                <div className="relative">
                                    <input type="text" value={cnpj} onChange={handleCnpjChange} className={`w-full bg-gray-900 border ${cnpjError ? 'border-red-500' : 'border-gray-700'} rounded-2xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all font-mono`} maxLength={18} placeholder="00.000.000/0000-00"/>
                                    {isFetchingCnpj && <SpinnerIcon className="w-5 h-5 text-yellow-500 absolute right-4 top-1/2 -translate-y-1/2 animate-spin" />}
                                </div>
                                {cnpjError && <p className="text-red-500 text-[10px] mt-1 ml-1 font-bold">{cnpjError}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Licitação Nº</label>
                                    <input type="text" value={biddingId} onChange={(e) => setBiddingId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all font-bold" placeholder="90001/2024" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Modalidade</label>
                                    <select value={biddingType} onChange={(e) => setBiddingType(e.target.value as 'pregão' | 'dispensa')} className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all">
                                        <option value="pregão">Pregão Eletrônico</option>
                                        <option value="dispensa">Dispensa Eletrônica</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Endereço de Fornecimento</label>
                                <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all text-sm" placeholder="Rua, Número, Bairro..."/>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">CEP</label>
                                    <input type="text" value={cep} onChange={(e) => setCep(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all font-mono" maxLength={9} placeholder="00000-000"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">UASG</label>
                                    <input type="text" value={uasg} onChange={(e) => setUasg(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-yellow-500 outline-none transition-all font-mono" maxLength={6} placeholder="123456"/>
                                </div>
                            </div>

                            {extractedItems.length > 0 && (
                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest ml-1">
                                        {extractedItems.length} itens prontos para salvar
                                    </span>
                                    <SparklesIcon className="w-4 h-4 text-yellow-500 mr-1" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-900/80 px-6 py-5 flex justify-end space-x-3 rounded-b-2xl border-t border-gray-700/50">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-white transition-colors">Cancelar</button>
                        <button type="submit" className="px-10 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-black text-sm rounded-2xl transition-all shadow-xl active:scale-95">
                            Salvar Contrato {extractedItems.length > 0 ? 'e Itens' : ''}
                        </button>
                    </div>
                </form>
            </div>
            
            {isAiMode && <PdfFullExtractor onDataExtracted={handleAiExtractedData} onClose={() => setIsAiMode(false)} />}
        </div>
    );
};
