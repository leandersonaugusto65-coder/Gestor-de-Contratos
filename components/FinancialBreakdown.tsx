import React, { useMemo } from 'react';
import type { Client } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';

interface FinancialBreakdownProps {
  clients: Client[];
  activeBreakdown: 'licitado' | 'empenhado' | 'fornecido' | 'saldoFornecer' | null;
  onClose: () => void;
}

interface ClientStats {
  id: number;
  name: string;
  totalBid: number;
  totalCommitted: number;
  totalSupplied: number;
  balanceToSupply: number;
}

const breakdownConfig = {
  licitado: {
    title: 'Total Licitado',
    color: 'text-yellow-500/80',
    dataKey: 'totalBid',
  },
  empenhado: {
    title: 'Total Empenhado',
    color: 'text-amber-500/80',
    dataKey: 'totalCommitted',
  },
  fornecido: {
    title: 'Total Fornecido',
    color: 'text-emerald-500',
    dataKey: 'totalSupplied',
  },
  saldoFornecer: {
    title: 'Saldo a Fornecer',
    color: 'text-orange-500',
    dataKey: 'balanceToSupply',
  },
};

export const FinancialBreakdown: React.FC<FinancialBreakdownProps> = ({ clients, activeBreakdown, onClose }) => {
  
  const stats = useMemo((): ClientStats[] => {
    const clientStats = clients.map(client => {
      let totalBid = 0;
      let totalCommitted = 0;
      let totalSupplied = 0;

      client.contracts.forEach(contract => {
        totalBid += contract.items.reduce((sum, item) => sum + (item.unitValue * item.quantityBid), 0);
        contract.commitments.forEach(commitment => {
          totalCommitted += commitment.items.reduce((sum, comItem) => {
            const contractItem = contract.items.find(i => i.id === comItem.contractItemId);
            return sum + (contractItem ? contractItem.unitValue * comItem.quantity : 0);
          }, 0);
        });
        contract.invoices.forEach(invoice => {
          totalSupplied += invoice.items.reduce((sum, invItem) => {
            const contractItem = contract.items.find(i => i.id === invItem.contractItemId);
            return sum + (contractItem ? contractItem.unitValue * invItem.quantitySupplied : 0);
          }, 0);
        });
      });
      const balanceToSupply = totalCommitted - totalSupplied;
      return { id: client.id, name: client.name, totalBid, totalCommitted, totalSupplied, balanceToSupply };
    });

    if (activeBreakdown) {
      const dataKey = breakdownConfig[activeBreakdown].dataKey as keyof ClientStats;
      return clientStats.sort((a, b) => (b[dataKey] as number) - (a[dataKey] as number));
    }
    return [];

  }, [clients, activeBreakdown]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  if (!activeBreakdown) return null;
  
  const config = breakdownConfig[activeBreakdown];

  return (
    <div className="mt-8 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1.5 bg-yellow-600 rounded-full shadow-[0_0_10px_rgba(202,138,4,0.5)]" />
          <h3 className="text-xl font-bold text-white tracking-tight">Detalhamento por Órgão - <span className={config.color}>{config.title}</span></h3>
        </div>
        <button onClick={onClose} className="p-2 text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors">
            <XMarkIcon className="w-5 h-5"/>
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/40 backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-[10px] text-gray-500 uppercase tracking-widest bg-black/40 border-b border-gray-800">
              <tr>
                <th scope="col" className="px-6 py-4 font-black">Órgão / Cliente</th>
                <th scope="col" className={`px-6 py-4 font-black text-right ${config.color}`}>{config.title}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {stats.map((client) => (
                <tr key={client.id} className="hover:bg-yellow-600/5 transition-colors group">
                  <td className="px-6 py-4 font-bold text-gray-200 group-hover:text-white transition-colors">
                    {client.name}
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-bold ${config.color}`}>
                    {formatCurrency(client[config.dataKey as keyof ClientStats] as number)}
                  </td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-6 py-10 text-center text-gray-500 italic">
                    Nenhum dado financeiro disponível para exibição.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};