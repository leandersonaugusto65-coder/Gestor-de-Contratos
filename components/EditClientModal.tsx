import React, { useState, useEffect, useCallback } from 'react';
import type { Client } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { formatCNPJ, validateCNPJ, stripCNPJ } from '../utils/cnpj';

interface EditClientModalProps {
  client: Client;
  onClose: () => void;
  onUpdate: (data: Partial<Client>) => void;
}

export const EditClientModal: React.FC<EditClientModalProps> = ({ client, onClose, onUpdate }) => {
    const [name, setName] = useState(client.name);
    const [uasg, setUasg] = useState(client.uasg);
    const [cnpj, setCnpj] = useState(client.cnpj ? formatCNPJ(client.cnpj) : '');
    const [address, setAddress] = useState(client.address || '');
    const [cep, setCep] = useState(client.cep || '');
    const [cnpjError, setCnpjError] = useState<string | null>(null);
    const [cnpjStatus, setCnpjStatus] = useState<{ text: string; status: 'active' | 'inactive' } | null>(null);

    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    const [isFetchingUasg, setIsFetchingUasg] = useState(false);
    
    const debouncedCnpj = useDebounce(cnpj, 800);

    // CNPJ lookup for Address, Name, CEP, Status, and UASG
    useEffect(() => {
        const fetchCnpjData = async (val: string) => {
            const onlyNumbers = stripCNPJ(val);
            if (onlyNumbers.length !== 14 || onlyNumbers === stripCNPJ(client.cnpj || '')) return;

            if (!validateCNPJ(onlyNumbers)) {
                setCnpjError('CNPJ inválido.');
                return;
            }
            
            setCnpjError(null);
            setIsFetchingCnpj(true);
            try {
                const brasilApiResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${onlyNumbers}`);
                if (brasilApiResponse.ok) {
                    const data = await brasilApiResponse.json();
                    
                    const organName = data.nome_fantasia || data.razao_social;
                    setName(organName);
                    
                    const formatted = [data.logradouro, data.numero, data.complemento, data.bairro, data.municipio, data.uf].filter(Boolean).join(', ');
                    setAddress(formatted);
                    if (data.cep) setCep(data.cep.replace(/\D/g, ''));
                    
                    if (data.descricao_situacao_cadastral) {
                        const isActive = data.descricao_situacao_cadastral === 'ATIVA';
                        setCnpjStatus({ text: data.descricao_situacao_cadastral, status: isActive ? 'active' : 'inactive' });
                    }

                    // --- UASG Fetch from compras.dados.gov.br ---
                    setIsFetchingUasg(true);
                    try {
                        const govApiUrl = `https://compras.dados.gov.br/orgaos/v1/orgaos.json?cnpj=${onlyNumbers}`;
                        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(govApiUrl)}`;
                        const govApiResponse = await fetch(proxyUrl);
                        if (govApiResponse.ok) {
                            const govApiData = await govApiResponse.json();
                            if (govApiData?._embedded?.orgaos?.[0]?.codigoUasg) {
                                setUasg(govApiData._embedded.orgaos[0].codigoUasg);
                            } else {
                                console.warn(`UASG não encontrada para o CNPJ: ${onlyNumbers}`);
                            }
                        }
                    } catch (govError) {
                        console.error("UASG lookup by CNPJ failed:", govError);
                    } finally {
                        setIsFetchingUasg(false);
                    }
                }
            } catch (err) { console.error(err); }
            finally { setIsFetchingCnpj(false); }
        };
        if (debouncedCnpj) fetchCnpjData(debouncedCnpj);
    }, [debouncedCnpj, client.cnpj]);


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
        onUpdate({
            name: name.trim(),
            uasg: stripCNPJ(uasg),
            cnpj: stripCNPJ(cnpj),
            address: address.trim(),
            cep: cep.trim(),
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md animate-fade-in-up overflow-hidden">
                <header className="p-4 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">Editar Dados do Cliente</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">CNPJ</label>
                        <input
                            type="text"
                            value={cnpj}
                            onChange={handleCnpjChange}
                            className={`block w-full px-3 py-2 bg-gray-700 border ${cnpjError ? 'border-red-500' : 'border-gray-600'} rounded-md text-sm text-white focus:outline-none focus:border-yellow-600`}
                            placeholder="Digite o CNPJ para buscar"
                            maxLength={18}
                        />
                        {isFetchingCnpj && <SpinnerIcon className="w-4 h-4 text-blue-400 absolute right-3 top-8" />}
                    </div>
                     {cnpjError && <p className="text-red-500 text-[10px] -mt-2">{cnpjError}</p>}
                    {cnpjStatus && (
                        <p className={`text-xs -mt-2 font-bold ${cnpjStatus.status === 'active' ? 'text-green-400' : 'text-red-500'}`}>
                            Situação: {cnpjStatus.text}
                        </p>
                    )}

                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Nome / Razão Social</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600"
                            placeholder="Preenchido via CNPJ"
                            autoComplete="off"
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">UASG</label>
                        <input
                            type="text"
                            value={uasg}
                            onChange={(e) => setUasg(e.target.value)}
                            className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600"
                            placeholder="Preenchido via CNPJ"
                        />
                        {isFetchingUasg && <SpinnerIcon className="w-4 h-4 text-yellow-500 absolute right-3 top-8" />}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Endereço Principal</label>
                        <textarea
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            rows={2}
                            className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600"
                            placeholder="Rua, Número, Bairro, Cidade - UF"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">CEP</label>
                        <input
                            type="text"
                            value={cep}
                            onChange={(e) => setCep(e.target.value)}
                            className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600"
                            placeholder="00000-000"
                            maxLength={9}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg shadow-lg transition-all">
                            Salvar Alterações
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