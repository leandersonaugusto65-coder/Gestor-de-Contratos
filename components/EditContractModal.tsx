
import React, { useState, useEffect } from 'react';
import type { Contract } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { formatCNPJ, validateCNPJ, stripCNPJ } from '../utils/cnpj';

interface EditContractModalProps {
  contract: Contract;
  onClose: () => void;
  onUpdate: (data: Partial<Contract> & { address?: string }) => void;
}

export const EditContractModal: React.FC<EditContractModalProps> = ({ contract, onClose, onUpdate }) => {
    const [biddingId, setBiddingId] = useState(contract.biddingId);
    const [creationDate, setCreationDate] = useState(contract.creationDate);
    const [cnpj, setCnpj] = useState(contract.cnpj ? formatCNPJ(contract.cnpj) : '');
    const [uasg, setUasg] = useState(contract.uasg || '');
    const [address, setAddress] = useState('');
    const [cnpjError, setCnpjError] = useState<string | null>(null);
    const [cnpjStatus, setCnpjStatus] = useState<{ text: string; status: 'active' | 'inactive' } | null>(null);

    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    const [isFetchingUasg, setIsFetchingUasg] = useState(false);
    
    const debouncedCnpj = useDebounce(cnpj, 800);
    const debouncedUasg = useDebounce(uasg, 800);

    // CNPJ lookup for Address, Status, and UASG
    useEffect(() => {
        const fetchCnpjData = async (val: string) => {
            const onlyNumbers = stripCNPJ(val);
            setCnpjStatus(null);
            if (onlyNumbers.length !== 14 || onlyNumbers === stripCNPJ(contract.cnpj || '')) return;

            if (!validateCNPJ(onlyNumbers)) {
                setCnpjError('CNPJ inválido.');
                return;
            } else {
                setCnpjError(null);
            }

            setIsFetchingCnpj(true);
            try {
                // --- Fetch 1: BrasilAPI for primary data ---
                const brasilApiResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${onlyNumbers}`);
                if (brasilApiResponse.ok) {
                    const data = await brasilApiResponse.json();
                    const formatted = [data.logradouro, data.numero, data.complemento, data.bairro, data.municipio, data.uf].filter(Boolean).join(', ');
                    setAddress(formatted);
                    
                    if (data.descricao_situacao_cadastral) {
                        const isActive = data.descricao_situacao_cadastral === 'ATIVA';
                        setCnpjStatus({ text: data.descricao_situacao_cadastral, status: isActive ? 'active' : 'inactive' });
                    }
                }

                // --- Fetch 2: Compras Gov API for UASG ---
                try {
                    const govApiUrl = `https://compras.dados.gov.br/orgaos/v1/orgaos.json?cnpj=${onlyNumbers}`;
                    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(govApiUrl)}`;
                    const govApiResponse = await fetch(proxyUrl);
                    if (govApiResponse.ok) {
                        const govApiData = await govApiResponse.json();
                        if (govApiData?._embedded?.orgaos?.[0]?.codigo_uasg) {
                           if (!uasg) {
                               setUasg(govApiData._embedded.orgaos[0].codigo_uasg);
                           }
                        }
                    }
                } catch (govError) {
                    console.error("UASG lookup by CNPJ failed:", govError);
                }
            } catch (err) { console.error(err); }
            finally { setIsFetchingCnpj(false); }
        };
        if (debouncedCnpj) fetchCnpjData(debouncedCnpj);
    }, [debouncedCnpj, contract.cnpj, uasg]);

    // UASG lookup
    useEffect(() => {
        const fetchUasgData = async (val: string) => {
            const onlyNumbers = stripCNPJ(val);
            if (onlyNumbers.length < 6 || onlyNumbers === stripCNPJ(contract.uasg || '')) return;

            setIsFetchingUasg(true);
            try {
                const targetUrl = `https://pncp.gov.br/api/pncp/v1/orgaos/uasg/${onlyNumbers}`;
                const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) {
                    throw new Error(`UASG "${val}" não encontrada ou API indisponível.`);
                }
                const data = await response.json();

                if(data && data.cnpj) {
                    if(!cnpj) {
                        setCnpj(formatCNPJ(data.cnpj));
                    }
                } else {
                    throw new Error('Resposta da API de UASG inválida ou UASG não encontrada.');
                }
            } catch (err) { console.error(err); }
            finally { setIsFetchingUasg(false); }
        };
        if (debouncedUasg) fetchUasgData(debouncedUasg);
    }, [debouncedUasg, contract.uasg, cnpj]);

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
            biddingId: biddingId.trim(),
            creationDate,
            cnpj: stripCNPJ(cnpj),
            uasg: stripCNPJ(uasg),
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md animate-fade-in-up overflow-hidden">
                <header className="p-4 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white">Editar Contrato</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">UASG</label>
                            <input
                                type="text"
                                value={uasg}
                                onChange={(e) => setUasg(e.target.value)}
                                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600"
                            />
                            {isFetchingUasg && <SpinnerIcon className="w-4 h-4 text-yellow-500 absolute right-3 top-8" />}
                        </div>
                        <div className="relative">
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">CNPJ</label>
                            <input
                                type="text"
                                value={cnpj}
                                onChange={handleCnpjChange}
                                className={`block w-full px-3 py-2 bg-gray-700 border ${cnpjError ? 'border-red-500' : 'border-gray-600'} rounded-md text-sm text-white focus:outline-none focus:border-yellow-600`}
                                maxLength={18}
                            />
                            {isFetchingCnpj && <SpinnerIcon className="w-4 h-4 text-blue-400 absolute right-3 top-8" />}
                        </div>
                    </div>
                    {cnpjError && <p className="text-red-500 text-[10px]">{cnpjError}</p>}
                    {cnpjStatus && (
                        <p className={`text-xs -mt-2 font-bold ${cnpjStatus.status === 'active' ? 'text-green-400' : 'text-red-500'}`}>
                            Situação: {cnpjStatus.text}
                        </p>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">ID da Licitação</label>
                        <input
                            type="text"
                            value={biddingId}
                            onChange={(e) => setBiddingId(e.target.value)}
                            className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Data de Criação</label>
                        <input
                            type="date"
                            value={creationDate}
                            onChange={(e) => setCreationDate(e.target.value)}
                            className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-white focus:outline-none focus:border-yellow-600"
                        />
                    </div>

                    {address && (
                        <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded text-xs text-yellow-200">
                            Sugestão de endereço encontrada: <br/>
                            <span className="font-medium">{address}</span>
                        </div>
                    )}

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
        </div>
    );
};
