import React from 'react';
import type { GlobalSummaryData } from '../types';
import { DocumentChartBarIcon } from './icons/DocumentChartBarIcon';
import { StampIcon } from './icons/StampIcon';
import { TruckIcon } from './icons/TruckIcon';
import { HourglassIcon } from './icons/HourglassIcon';
import { WalletIcon } from './icons/WalletIcon';

interface GlobalSummaryProps {
  summary: GlobalSummaryData;
  onReceivablesClick?: () => void;
  onBreakdownToggle: (type: 'licitado' | 'empenhado' | 'fornecido' | 'saldoFornecer') => void;
  activeBreakdown: 'licitado' | 'empenhado' | 'fornecido' | 'saldoFornecer' | null;
}

const SummaryCard: React.FC<{ icon: any; title: string; value: string; colorClasses: any; onClick?: () => void; isActive?: boolean }> = ({ icon, title, value, colorClasses, onClick, isActive }) => (
  <div 
    className={`group bg-gray-900/40 p-4 rounded-2xl shadow-lg border border-gray-800 flex items-center space-x-4 transition-all duration-300 hover:scale-[1.03] hover:bg-gray-800/60 hover:border-gray-700 ${onClick ? 'cursor-pointer' : ''} ${isActive ? 'ring-2 ring-yellow-500/80 shadow-[0_0_20px_rgba(202,138,4,0.3)]' : ''}`}
    onClick={onClick}
  >
    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:rotate-6 ${colorClasses.bg}`}>
      {React.cloneElement(icon, { className: `w-7 h-7 ${colorClasses.icon}` })}
    </div>
    <div className="min-w-0 flex-1 overflow-hidden">
      <p className="text-[10px] font-bold text-gray-500 truncate uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-lg sm:text-xl font-black tracking-tight whitespace-nowrap leading-none ${colorClasses.text}`}>
        {value}
      </p>
    </div>
  </div>
);

export const GlobalSummary: React.FC<GlobalSummaryProps> = ({ summary, onReceivablesClick, onBreakdownToggle, activeBreakdown }) => {
    const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <SummaryCard icon={<DocumentChartBarIcon />} title="Total Licitado" value={formatCurrency(summary.totalBidValue)} colorClasses={{ bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: 'text-yellow-500' }} onClick={() => onBreakdownToggle('licitado')} isActive={activeBreakdown === 'licitado'} />
            <SummaryCard icon={<StampIcon />} title="Total Empenhado" value={formatCurrency(summary.totalCommittedValue)} colorClasses={{ bg: 'bg-amber-500/10', text: 'text-amber-500', icon: 'text-amber-500' }} onClick={() => onBreakdownToggle('empenhado')} isActive={activeBreakdown === 'empenhado'} />
            <SummaryCard icon={<TruckIcon />} title="Total Fornecido" value={formatCurrency(summary.totalSuppliedValue)} colorClasses={{ bg: 'bg-emerald-500/10', text: 'text-emerald-500', icon: 'text-emerald-500' }} onClick={() => onBreakdownToggle('fornecido')} isActive={activeBreakdown === 'fornecido'} />
            <SummaryCard icon={<HourglassIcon />} title="Saldo a Fornecer" value={formatCurrency(summary.balanceToSupplyValue)} colorClasses={{ bg: 'bg-orange-500/10', text: 'text-orange-500', icon: 'text-orange-500' }} onClick={() => onBreakdownToggle('saldoFornecer')} isActive={activeBreakdown === 'saldoFornecer'} />
            <SummaryCard icon={<WalletIcon />} title="Valor a Receber" value={formatCurrency(summary.totalToReceiveValue)} colorClasses={{ bg: 'bg-indigo-500/10', text: 'text-indigo-500', icon: 'text-indigo-500' }} onClick={onReceivablesClick} />
        </div>
    );
};