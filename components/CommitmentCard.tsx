
import React, { useState } from 'react';
import type { Commitment, ContractItem, Invoice } from '../types';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ConfirmUpdateModal } from './ConfirmUpdateModal';

interface CommitmentCardProps {
  commitment: Commitment;
  contractItems: ContractItem[];
  allCommitments: Commitment[];
  allInvoices: Invoice[];
  onDelete: () => void;
  isReadOnly: boolean;
}

export const CommitmentCard: React.FC<CommitmentCardProps> = ({ commitment, contractItems, allCommitments, allInvoices, onDelete, isReadOnly }) => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const formattedDate = new Intl.DateTimeFormat('pt-BR').format(new Date(`${commitment.date}T00:00:00`));
  
  const getItem = (contractItemId: number) => {
    return contractItems.find(item => item.id === contractItemId);
  }

  const getBalanceToSupply = (contractItemId: number) => {
    const totalCommitted = allCommitments.reduce((sum, c) =>
        sum + (c.items.find(i => i.contractItemId === contractItemId)?.quantity ?? 0)
    , 0);

    const totalSupplied = allInvoices.reduce((sum, inv) =>
        sum + (inv.items.find(i => i.contractItemId === contractItemId)?.quantitySupplied ?? 0)
    , 0);

    return totalCommitted - totalSupplied;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <>
      <div className="bg-slate-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-slate-100 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <ClipboardDocumentListIcon className="w-6 h-6 text-yellow-500" />
            <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100">Empenho Nº: {commitment.commitmentNumber}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Data: {formattedDate}</p>
            </div>
          </div>
          {!isReadOnly && (
            <button 
              onClick={() => setIsDeleteConfirmOpen(true)} 
              className="p-1 text-gray-400 dark:text-gray-400 hover:text-red-500 transition-colors"
              title="Excluir empenho"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="p-0 sm:p-4">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                  <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-slate-100 dark:bg-gray-700">
                      <tr>
                          <th className="px-3 py-2 text-center">Item</th>
                          <th className="px-3 py-2">Descrição</th>
                          <th className="px-3 py-2 text-center">Qtd. Empenhada</th>
                          <th className="px-3 py-2 text-right">Valor Total</th>
                          <th className="px-3 py-2 text-center">Saldo Entregar</th>
                      </tr>
                  </thead>
                  <tbody>
                      {commitment.items.map(item => {
                          const contractItem = getItem(item.contractItemId);
                          if (!contractItem) return null;
                          const totalValue = item.quantity * contractItem.unitValue;
                          const balanceToSupply = getBalanceToSupply(item.contractItemId);
                          return (
                              <tr key={item.contractItemId} className="border-b border-gray-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700/50">
                                  <td className="px-3 py-2 text-center">{contractItem.item}</td>
                                  <td className="px-3 py-2 max-w-xs truncate">{contractItem.description}</td>
                                  <td className="px-3 py-2 text-center font-medium">{item.quantity}</td>
                                  <td className="px-3 py-2 text-right font-mono font-semibold text-yellow-600 dark:text-yellow-500">{formatCurrency(totalValue)}</td>
                                  <td className={`px-3 py-2 text-center font-bold ${balanceToSupply > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>{balanceToSupply}</td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {commitment.items.map(item => {
              const contractItem = getItem(item.contractItemId);
              if (!contractItem) return null;
              const balanceToSupply = getBalanceToSupply(item.contractItemId);
              const totalValue = item.quantity * contractItem.unitValue;

              return (
                <div key={item.contractItemId} className="p-4 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-600 uppercase">Item {contractItem.item}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${balanceToSupply > 0 ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400' : 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'}`}>
                      {balanceToSupply} a entregar
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{contractItem.description}</p>
                  <div className="flex justify-between items-end pt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Qtd: <span className="text-gray-700 dark:text-gray-200">{item.quantity}</span></p>
                    <p className="text-sm font-bold text-yellow-600 dark:text-yellow-500 font-mono">{formatCurrency(totalValue)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ConfirmUpdateModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          onDelete();
          setIsDeleteConfirmOpen(false);
        }}
        title="Confirmar Exclusão de Empenho"
        message={
          <>
            <p className="mb-2">Tem certeza que deseja excluir o empenho <strong>{commitment.commitmentNumber}</strong>?</p>
            <p className="font-bold text-red-500">Esta ação é irreversível.</p>
          </>
        }
        confirmText="Sim, Excluir"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </>
  );
};