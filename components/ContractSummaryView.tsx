import React from 'react';
import type { ContractSummary } from '../types';

interface ContractSummaryProps {
  summary: ContractSummary;
}

const SummaryItem: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="flex flex-col items-center justify-center p-4 bg-gray-900 rounded-lg shadow-sm border border-gray-700">
    <dt className="text-sm font-medium text-gray-400 truncate">{label}</dt>
    <dd className={`mt-1 text-2xl font-semibold tracking-tight ${color}`}>{value}</dd>
  </div>
);

export const ContractSummaryView: React.FC<ContractSummaryProps> = ({ summary }) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-200 mb-4 text-center sm:text-left">Resumo Financeiro</h3>
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryItem 
          label="Total Licitado"
          value={formatCurrency(summary.totalContractValue)}
          color="text-yellow-400"
        />
        <SummaryItem 
          label="Total Empenhado"
          value={formatCurrency(summary.totalCommittedValue)}
          color="text-amber-400"
        />
        <SummaryItem 
          label="Total Fornecido"
          value={formatCurrency(summary.totalSuppliedValue)}
          color="text-green-400"
        />
         <SummaryItem 
          label="Saldo a Fornecer"
          value={formatCurrency(summary.totalToSupplyValue)}
          color="text-orange-400"
        />
         <SummaryItem 
          label="Valor a Receber"
          value={formatCurrency(summary.totalToReceiveValue)}
          color="text-violet-400"
        />
      </dl>
    </div>
  );
};