import React from 'react';
import type { DashboardCommitment } from '../types';

interface AllCommitmentsViewProps {
  commitments: DashboardCommitment[];
  onSelectCommitment: (commitment: DashboardCommitment) => void;
}

export const AllCommitmentsView: React.FC<AllCommitmentsViewProps> = ({ commitments, onSelectCommitment }) => {

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('pt-BR').format(new Date(`${dateString}T00:00:00`));
    }

    const calculateCommitmentValue = (commitment: DashboardCommitment) => {
        return commitment.items.reduce((sum, item) => {
            const contractItem = commitment.contractItems.find(ci => ci.id === item.contractItemId);
            return sum + (contractItem ? contractItem.unitValue * item.quantity : 0);
        }, 0);
    }

    if (commitments.length === 0) {
        return <div className="text-center py-12 bg-gray-800 rounded-lg shadow-inner"><p className="text-gray-400">Nenhum empenho pendente encontrado.</p></div>;
    }

    return (
        <div className="space-y-4">
            {/* Desktop Table - Hidden on Mobile */}
            <div className="hidden md:block bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                        <tr>
                            <th scope="col" className="px-4 py-3">Cliente</th>
                            <th scope="col" className="px-4 py-3">Licitação Nº</th>
                            <th scope="col" className="px-4 py-3">Empenho Nº</th>
                            <th scope="col" className="px-4 py-3 text-center">Data</th>
                            <th scope="col" className="px-4 py-3 text-right">Valor Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {commitments.map(commitment => (
                            <tr key={commitment.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700 cursor-pointer" onClick={() => onSelectCommitment(commitment)}>
                                <td className="px-4 py-3 font-medium text-white">{commitment.clientName}</td>
                                <td className="px-4 py-3">{commitment.biddingId}</td>
                                <td className="px-4 py-3">{commitment.commitmentNumber}</td>
                                <td className="px-4 py-3 text-center">{formatDate(commitment.date)}</td>
                                <td className="px-4 py-3 text-right font-semibold font-mono text-yellow-500">{formatCurrency(calculateCommitmentValue(commitment))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards - Hidden on Desktop */}
            <div className="md:hidden space-y-3">
                {commitments.map(commitment => (
                    <div 
                        key={commitment.id} 
                        className="bg-gray-800 border border-gray-700 rounded-lg p-4 active:bg-gray-700 transition-colors shadow-sm"
                        onClick={() => onSelectCommitment(commitment)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-white font-bold text-sm line-clamp-1 flex-1">{commitment.clientName}</h3>
                            <span className="text-[10px] bg-yellow-600/20 text-yellow-500 px-2 py-0.5 rounded font-bold uppercase ml-2">
                                NE {commitment.commitmentNumber}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                            <div>
                                <p className="text-[10px] uppercase font-semibold text-gray-500">Licitação</p>
                                <p>{commitment.biddingId}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-semibold text-gray-500">Data</p>
                                <p>{formatDate(commitment.date)}</p>
                            </div>
                            <div className="col-span-2 pt-2 border-t border-gray-700 mt-1 flex justify-between items-center">
                                <p className="text-[10px] uppercase font-semibold text-gray-500">Valor do Empenho</p>
                                <p className="text-sm font-bold text-yellow-500 font-mono">{formatCurrency(calculateCommitmentValue(commitment))}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};