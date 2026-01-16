
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
}

interface SummaryCardProps {
    icon: React.ReactElement<{ className?: string }>;
    title: string;
    value: string;
    colorClasses: {
        bg: string;
        text: string;
        icon: string;
    };
    onClick?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, value, colorClasses, onClick }) => (
  <div 
    className={`bg-slate-50 dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex items-center space-x-2 sm:space-x-3 transition-all duration-300 hover:scale-105 hover:bg-slate-100 dark:hover:bg-gray-700/50 ${onClick ? 'cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-offset-gray-100 dark:hover:ring-offset-black' : ''}`}
    onClick={onClick}
    style={{'--tw-ring-color': colorClasses.text.replace('text-', 'bg-').replace('-600', '-400')} as React.CSSProperties}
  >
    <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${colorClasses.bg}`}>
      {React.cloneElement(icon, { className: `w-5 h-5 sm:w-6 sm:h-6 ${colorClasses.icon}` })}
    </div>
    <div className="min-w-0 flex-1 overflow-hidden">
      <p className="text-[9px] sm:text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate uppercase tracking-wider mb-0.5">{title}</p>
      <p className={`text-sm sm:text-base lg:text-lg font-bold tracking-tight whitespace-nowrap leading-none ${colorClasses.text}`}>
        {value}
      </p>
    </div>
  </div>
);


export const GlobalSummary: React.FC<GlobalSummaryProps> = ({ summary, onReceivablesClick }) => {
    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
            <SummaryCard
                icon={<DocumentChartBarIcon />}
                title="Total Licitado"
                value={formatCurrency(summary.totalBidValue)}
                colorClasses={{ bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-500', icon: 'text-yellow-500 dark:text-yellow-400' }}
            />
             <SummaryCard
                icon={<StampIcon />}
                title="Total Empenhado"
                value={formatCurrency(summary.totalCommittedValue)}
                colorClasses={{ bg: 'bg-amber-100 dark:bg-yellow-900/30', text: 'text-amber-600 dark:text-yellow-400', icon: 'text-amber-500 dark:text-yellow-300' }}
            />
             <SummaryCard
                icon={<TruckIcon />}
                title="Total Fornecido"
                value={formatCurrency(summary.totalSuppliedValue)}
                colorClasses={{ bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', icon: 'text-green-500 dark:text-green-300' }}
            />
             <SummaryCard
                icon={<HourglassIcon />}
                title="Saldo a Fornecer"
                value={formatCurrency(summary.balanceToSupplyValue)}
                colorClasses={{ bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', icon: 'text-orange-500 dark:text-orange-300' }}
            />
             <SummaryCard
                icon={<WalletIcon />}
                title="Valor a Receber"
                value={formatCurrency(summary.totalToReceiveValue)}
                colorClasses={{ bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', icon: 'text-violet-500 dark:text-violet-300' }}
                onClick={onReceivablesClick}
            />
        </div>
    );
};