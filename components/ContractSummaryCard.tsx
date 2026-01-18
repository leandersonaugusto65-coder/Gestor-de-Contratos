import React, { useMemo } from 'react';
import type { DashboardContract } from '../types';
import { FileTextIcon } from './icons/FileTextIcon';

interface ContractSummaryCardProps {
    contract: DashboardContract;
    onSelectClient: (clientId: number) => void;
}

export const ContractSummaryCard: React.FC<ContractSummaryCardProps> = ({ contract, onSelectClient }) => {
    
    const formattedDate = useMemo(() => {
        const date = new Date(`${contract.creationDate}T00:00:00`);
        return new Intl.DateTimeFormat('pt-BR').format(date);
    }, [contract.creationDate]);

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-yellow-600/10 hover:-translate-y-1 flex flex-col">
            <div className="p-6 flex-grow">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-700 text-gray-300 rounded-lg flex items-center justify-center">
                        <FileTextIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-100 leading-tight">Licitação: {contract.biddingId}</h3>
                        <p className="text-sm text-gray-300">{contract.clientName}</p>
                        <p className="text-xs text-gray-400 mt-1">Criado em: {formattedDate}</p>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-gray-900/50 border-t border-gray-700">
                 <button
                    onClick={() => onSelectClient(contract.clientId)}
                    className="w-full text-center bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded-lg transition-colors duration-200"
                >
                    Ver Detalhes
                </button>
            </div>
        </div>
    );
};