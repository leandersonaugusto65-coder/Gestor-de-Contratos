
import React from 'react';
import type { ContractSummary } from '../types';

interface ContractSummaryProps {
  summary: ContractSummary;
}

const SummaryItem: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="flex flex-col items-center justify-center p-4 bg-slate-200 dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{label}</dt>
    <dd className={`mt-1 text-2xl font-semibold tracking-tight ${color}`}>{value}</dd>
  </div>
);

export const ContractSummaryView: React.FC<ContractSummaryProps> = ({ summary }) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center sm:text-left">Resumo Financeiro do Contrato</h3>
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem 
          label="Total Empenhado"
          value={formatCurrency(summary.totalCommittedValue)}
          color="text-amber-600 dark:text-amber-400"
        />
        <SummaryItem 
          label="Total Fornecido"
          value={formatCurrency(summary.totalSuppliedValue)}
          color="text-green-600 dark:text-green-400"
        />
         <SummaryItem 
          label="Saldo a Fornecer"
          value={formatCurrency(summary.totalToSupplyValue)}
          color="text-orange-600 dark:text-orange-400"
        />
         <SummaryItem 
          label="Valor a Receber"
          value={formatCurrency(summary.totalToReceiveValue)}
          color="text-violet-600 dark:text-violet-400"
        />
      </dl>
    </div>
  );
};