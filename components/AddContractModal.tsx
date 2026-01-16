
import React, { useState, useEffect, useCallback } from 'react';
import type { Client, Contract } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { formatCNPJ, validateCNPJ, stripCNPJ } from '../utils/cnpj';
import { GoogleGenAI } from '@google/genai';

interface AddContractModalProps {
  clients: Client[];
  onClose: () => void;
  onAddContract: (args: { clientName: string; address: string; cep: string; contractData: Omit<Contract, 'id' | 'items' | 'commitments' | 'invoices'> }) => void;
}

export const AddContractModal: React.FC<AddContractModalProps> = ({ clients, onClose, onAddContract }) => {
    const [clientName, setClientName] = useState('');
    const [biddingId, setBiddingId] = useState('');
    const [creationDate, setCreationDate] = useState(new Date().toISOString().split('T')[0]);
    const [cnpj, setCnpj] = useState('');
    const [uasg, setUasg] = useState('');
    const [address, setAddress] = useState('');
    const [cep, setCep] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [cnpjError, setCnpjError] = useState<string | null>(null);
    const [cnpjStatus, setCnpjStatus] = useState<{ text: string; status: 'active' | 'inactive' } | null>(null);

    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    const [isFetchingUasgFromGoogle, setIsFetchingUasgFromGoogle] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    
    const debouncedCnpj = useDebounce(cnpj, 800);

    const fetchUasgFromGoogle = useCallback(async (organName: string) => {
        if (!organName) return;
        setIsFetchingUasgFromGoogle(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const prompt = `Qual é o código UASG do órgão "${organName}"? Responda apenas com o número de 6 dígitos, se encontrar.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { tools: [{ googleSearch: {} }] },
            });

            const text = response.text;
            if (text) {
                const uasgMatch = text.match(/\b(\d{6})\b/);
                if (uasgMatch && uasgMatch[1]) {
                    setUasg(uasgMatch[1]);
                }
            }
        } catch (err) {
            console.error("Error fetching UASG from Google/Gemini:", err);
        } finally {
            setIsFetchingUasgFromGoogle(false);
        }
    }, []);

    // Effect for CNPJ -> Name, Address, CEP, Status, and then UASG via Google
    useEffect(() => {
        const fetchCnpjData = async (cnpjToFetch: string) => {
            const onlyNumbersCnpj = stripCNPJ(cnpjToFetch);
            if (onlyNumbersCnpj.length !== 14) {
                if (onlyNumbersCnpj.length > 0 && onlyNumbersCnpj.length < 14) setCnpjError(null);
                return;
            }

            if (!validateCNPJ(onlyNumbersCnpj)) {
                setCnpjError('CNPJ inválido (Dígito verificador incorreto).');
                return;
            }
            
            setCnpjError(null);
            setIsFetchingCnpj(true);
            setApiError(null);

            try {
                const brasilApiResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${onlyNumbersCnpj}`);
                if (!brasilApiResponse.ok) throw new Error('CNPJ não encontrado.');
                
                const data = await brasilApiResponse.json();
                if (data) {
                    const organName = data.nome_fantasia || data.razao_social;
                    setClientName(organName);
                    
                    const formattedAddress = [
                        data.logradouro, data.numero, data.complemento, data.bairro, data.municipio, data.uf
                    ].filter(Boolean).join(', ').replace(' ,', ',');
                    setAddress(formattedAddress);
                    if (data.cep) setCep(data.cep.replace(/\D/g, ''));
                    
                    if (data.descricao_situacao_cadastral) {
                        const isActive = data.descricao_situacao_cadastral === 'ATIVA';
                        setCnpjStatus({ text: data.descricao_situacao_cadastral, status: isActive ? 'active' : 'inactive' });
                    }
                    
                    if (organName) {
                        fetchUasgFromGoogle(organName);
                    }
                }
            } catch (err) {
                setApiError(err instanceof Error ? err.message : 'Erro ao buscar CNPJ.');
            } finally {
                setIsFetchingCnpj(false);
            }
        };

        if (debouncedCnpj) {
             // Reset fields for new search
            setClientName('');
            setAddress('');
            setCep('');
            setUasg('');
            setCnpjStatus(null);
            setApiError(null);
            fetchCnpjData(debouncedCnpj);
        }
    }, [debouncedCnpj, fetchUasgFromGoogle]);

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
        if (!clientName.trim() && !cnpj.trim()) {
            setError('Preencha o CNPJ para buscar o cliente.');
            return;
        }
         if (!clientName.trim()) {
            setError('O nome do cliente é obrigatório.');
            return;
        }
        if (cnpj && !validateCNPJ(cnpj)) {
            setCnpjError('O CNPJ informado é inválido.');
            return;
        }

        onAddContract({ 
            clientName: clientName.trim(),
            address: address.trim(),
            cep: cep.trim(),
            contractData: {
                biddingId: biddingId.trim(),
                creationDate: creationDate,
                cnpj: stripCNPJ(cnpj),
                uasg: stripCNPJ(uasg),
            }
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md animate-fade-in-up">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <header className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-white">Novo Contrato</h2>
                            <div className="flex gap-2">
                                {isFetchingCnpj && <span className="text-[10px] text-blue-400 animate-pulse">Buscando CNPJ...</span>}
                                {isFetchingUasgFromGoogle && <span className="text-[10px] text-green-400 animate-pulse">Buscando UASG (Google)...</span>}
                            </div>
                        </header>
                        
                         <div>
                            <label htmlFor="cnpj" className="block text-sm font-medium text-gray-400 mb-1">CNPJ</label>
                            <div className="relative">
                                <input type="text" id="cnpj" value={cnpj} onChange={handleCnpjChange} className={`block w-full px-3 py-2 bg-gray-700 border ${cnpjError || (cnpjStatus && cnpjStatus.status === 'inactive') ? 'border-red-500' : 'border-gray-600'} rounded-md text-sm text-white focus:outline-none focus:border-yellow-600`} placeholder="Digite o CNPJ para buscar" maxLength={18} autoFocus />
                                {isFetchingCnpj && <SpinnerIcon className="w-4 h-4 text-blue-400 absolute right-3 top-1/2 -translate-y-1/2" />}
                            </div>
                            {cnpjError && <p className="text-red-500 text-[10px] mt-1">{cnpjError}</p>}
                            {cnpjStatus && <p className={`text-xs mt-1 font-bold ${cnpjStatus.status === 'active' ? 'text-green-400' : 'text-red-500'}`}>Situação: {cnpjStatus.text}</p>}
                        </div>

                        <div className="relative">
                            <label htmlFor="clientName" className="block text-sm font-medium text-gray-400 mb-1">Órgão / Cliente</label>
                            <input
                                type="text"
                                id="clientName"
                                value={clientName}
                                onChange={(e) => { setClientName(e.target.value); setError(null); }}
                                className={`block w-full px-3 py-2 bg-gray-700 border ${error ? 'border-red-500' : 'border-gray-600'} rounded-md text-sm text-white focus:outline-none focus:border-yellow-600`}
                                placeholder="Preenchido via CNPJ"
                                autoComplete="off"
                            />
                            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
                        </div>

                        <div>
                            <label htmlFor="uasg" className="block text-sm font-medium text-gray-400 mb-1">Nº da UASG</label>
                            <div className="relative">
                                <input type="text" id="uasg" value={uasg} onChange={(e) => setUasg(e.target.value)} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600" placeholder="Preenchido via Google" />
                                {isFetchingUasgFromGoogle && <SpinnerIcon className="w-4 h-4 text-yellow-500 absolute right-3 top-1/2 -translate-y-1/2" />}
                            </div>
                        </div>
                        
                        {apiError && <p className="text-orange-400 text-[10px]">{apiError}</p>}

                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-400 mb-1">Endereço de Fornecimento</label>
                            <textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-600" placeholder="Rua, Número, Cidade - UF" />
                        </div>

                        <div>
                            <label htmlFor="cep" className="block text-sm font-medium text-gray-400 mb-1">CEP</label>
                            <input
                                type="text"
                                id="cep"
                                value={cep}
                                onChange={(e) => setCep(e.target.value)}
                                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600"
                                placeholder="00000-000"
                                maxLength={9}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="biddingId" className="block text-sm font-medium text-gray-400 mb-1">Licitação</label>
                                <input type="text" id="biddingId" value={biddingId} onChange={(e) => setBiddingId(e.target.value)} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600" placeholder="Ex: 90001/2024" />
                            </div>
                            <div>
                                <label htmlFor="creationDate" className="block text-sm font-medium text-gray-400 mb-1">Data</label>
                                <input type="date" id="creationDate" value={creationDate} onChange={(e) => setCreationDate(e.target.value)} className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-900 px-6 py-3 flex justify-end space-x-3 rounded-b-lg">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-600 rounded-md text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors">Cancelar</button>
                        <button type="submit" className="py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 transition-all shadow-md">Salvar Contrato</button>
                    </div>
                </form>
            </div>
        </div>
    );
};