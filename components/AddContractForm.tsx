
import React, { useState, useEffect } from 'react';
import type { Client, Contract } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { formatCNPJ, validateCNPJ, stripCNPJ } from '../utils/cnpj';

interface AddContractFormProps {
  client: Client;
  onClose: () => void;
  onAddContract: (args: { address: string, cep: string, contractData: Omit<Contract, 'id' | 'items' | 'commitments' | 'invoices'> }) => void;
}

export const AddContractForm: React.FC<AddContractFormProps> = ({ client, onClose, onAddContract }) => {
    const [biddingId, setBiddingId] = useState('');
    const [creationDate, setCreationDate] = useState(new Date().toISOString().split('T')[0]);
    const [cnpj, setCnpj] = useState(client.cnpj ? formatCNPJ(client.cnpj) : '');
    const [uasg, setUasg] = useState(client.uasg || '');
    const [address, setAddress] = useState(client.address || '');
    const [cep, setCep] = useState(client.cep || '');
    const [cnpjError, setCnpjError] = useState<string | null>(null);
    const [cnpjStatus, setCnpjStatus] = useState<{ text: string; status: 'active' | 'inactive' } | null>(null);

    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    
    const debouncedCnpj = useDebounce(cnpj, 800);

    // CNPJ Lookup for Address, CEP, and Status
    useEffect(() => {
        const fetchCnpjData = async (cnpjToFetch: string) => {
            const onlyNumbersCnpj = stripCNPJ(cnpjToFetch);
            setCnpjStatus(null);
            if (onlyNumbersCnpj.length !== 14 || (onlyNumbersCnpj === stripCNPJ(client.cnpj || '') && address)) return;

            if (!validateCNPJ(onlyNumbersCnpj)) {
                setCnpjError('CNPJ inválido.');
                return;
            } else {
                setCnpjError(null);
            }

            setIsFetchingCnpj(true);
            try {
                // --- Fetch from BrasilAPI for address/cep ---
                const brasilApiResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${onlyNumbersCnpj}`);
                if (brasilApiResponse.ok) {
                    const data = await brasilApiResponse.json();
                    const formattedAddress = [
                        data.logradouro, data.numero, data.complemento, data.bairro, data.municipio, data.uf
                    ].filter(Boolean).join(', ').replace(' ,', ',');
                    setAddress(formattedAddress);
                    if (data.cep) setCep(data.cep.replace(/\D/g, ''));
                    
                    if (data.descricao_situacao_cadastral) {
                        const isActive = data.descricao_situacao_cadastral === 'ATIVA';
                        setCnpjStatus({ text: data.descricao_situacao_cadastral, status: isActive ? 'active' : 'inactive' });
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar CNPJ:', err);
            } finally {
                setIsFetchingCnpj(false);
            }
        };

        if (debouncedCnpj) fetchCnpjData(debouncedCnpj);
    }, [debouncedCnpj, client.cnpj, address]);

    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = formatCNPJ(val);
        setCnpj(formatted);
        setCnpjStatus(null);
        if (stripCNPJ(formatted).length === 14 && !validateCNPJ(formatted)) {
            setCnpjError('CNPJ Inválido');
        } else {
            setCnpjError(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (cnpj && !validateCNPJ(cnpj)) {
            setCnpjError('CNPJ inválido.');
            return;
        }
        onAddContract({ 
            address: address.trim(),
            cep: cep.trim(),
            contractData: {
                biddingId: biddingId.trim(),
                creationDate: creationDate,
                cnpj: stripCNPJ(cnpj),
                uasg: stripCNPJ(uasg),
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-md animate-fade-in-up">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-2">Adicionar Contrato</h2>
                        
                        <div className="bg-gray-900 p-3 rounded border border-gray-700">
                            <label className="block text-xs font-medium text-gray-500 uppercase">Cliente Atual</label>
                            <p className="text-white font-bold">{client.name}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <label htmlFor="uasg" className="block text-sm font-medium text-gray-400 mb-1">UASG</label>
                                <input
                                    type="text"
                                    id="uasg"
                                    value={uasg}
                                    onChange={(e) => setUasg(e.target.value)}
                                    className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600"
                                    placeholder="123456"
                                    autoFocus
                                />
                            </div>
                             <div className="relative">
                                <label htmlFor="cnpj" className="block text-sm font-medium text-gray-400 mb-1">CNPJ</label>
                                <input
                                    type="text"
                                    id="cnpj"
                                    value={cnpj}
                                    onChange={handleCnpjChange}
                                    className={`block w-full px-3 py-2 bg-gray-700 border ${cnpjError ? 'border-red-500' : 'border-gray-600'} rounded-md text-sm text-white focus:outline-none focus:border-yellow-600`}
                                    placeholder="Opcional"
                                    maxLength={18}
                                />
                                {isFetchingCnpj && <SpinnerIcon className="w-4 h-4 text-blue-400 absolute right-3 top-9" />}
                            </div>
                        </div>
                        {cnpjError && <p className="text-red-500 text-[10px]">{cnpjError}</p>}
                        {cnpjStatus && (
                            <p className={`text-xs -mt-2 font-bold ${cnpjStatus.status === 'active' ? 'text-green-400' : 'text-red-500'}`}>
                                Situação: {cnpjStatus.text}
                            </p>
                        )}

                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-400 mb-1">Endereço do Órgão</label>
                            <textarea
                                id="address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                rows={2}
                                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600"
                            />
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
                                <input
                                    type="text"
                                    id="biddingId"
                                    value={biddingId}
                                    onChange={(e) => setBiddingId(e.target.value)}
                                    className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600"
                                />
                            </div>
                            <div>
                                <label htmlFor="creationDate" className="block text-sm font-medium text-gray-400 mb-1">Data</label>
                                <input
                                    type="date"
                                    id="creationDate"
                                    value={creationDate}
                                    onChange={(e) => setCreationDate(e.target.value)}
                                    className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-900 px-6 py-3 flex justify-end space-x-3 rounded-b-lg">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-600 rounded-md text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" className="py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 shadow-md">
                            Salvar Contrato
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
