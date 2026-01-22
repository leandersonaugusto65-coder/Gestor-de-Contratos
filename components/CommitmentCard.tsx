
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
      <div className="bg-gray-900/40 rounded-2xl border border-gray-800 overflow-hidden shadow-xl backdrop-blur-sm">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-600/10 rounded-lg">
              <ClipboardDocumentListIcon className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
                <h4 className="font-bold text-gray-100">Empenho Nº: {commitment.commitmentNumber}</h4>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Data: {formattedDate}</p>
            </div>
          </div>
          {!isReadOnly && (
            <button 
              onClick={() => setIsDeleteConfirmOpen(true)} 
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              title="Excluir empenho"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="p-0 sm:p-4">
          <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-300">
                  <thead className="text-[10px] text-gray-500 uppercase font-black bg-black/40">
                      <tr>
                          <th className="px-4 py-3 text-center">Item</th>
                          <th className="px-4 py-3">Descrição</th>
                          <th className="px-4 py-3 text-center">Qtd. Empenhada</th>
                          <th className="px-4 py-3 text-right">Valor Total</th>
                          <th className="px-4 py-3 text-center">Saldo Entregar</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                      {commitment.items.map(item => {
                          const contractItem = getItem(item.contractItemId);
                          if (!contractItem) return null;
                          const totalValue = item.quantity * contractItem.unitValue;
                          const balanceToSupply = getBalanceToSupply(item.contractItemId);
                          return (
                              <tr key={item.contractItemId} className="hover:bg-yellow-600/5 transition-colors">
                                  <td className="px-4 py-3 text-center font-bold text-gray-500">{contractItem.item}</td>
                                  <td className="px-4 py-3 whitespace-normal break-words font-medium">{contractItem.description}</td>
                                  <td className="px-4 py-3 text-center font-mono font-bold text-gray-400">{item.quantity}</td>
                                  <td className="px-4 py-3 text-right font-mono font-bold text-yellow-500">{formatCurrency(totalValue)}</td>
                                  <td className={`px-4 py-3 text-center font-black ${balanceToSupply > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>{balanceToSupply}</td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>

          <div className="md:hidden divide-y divide-gray-800">
            {commitment.items.map(item => {
              const contractItem = getItem(item.contractItemId);
              if (!contractItem) return null;
              const balanceToSupply = getBalanceToSupply(item.contractItemId);
              const totalValue = item.quantity * contractItem.unitValue;

              return (
                <div key={item.contractItemId} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Item {contractItem.item}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${balanceToSupply > 0 ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {balanceToSupply} a entregar
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-200 leading-relaxed">{contractItem.description}</p>
                  <div className="flex justify-between items-end pt-1">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Qtd: <span className="text-gray-300">{item.quantity}</span></p>
                    <p className="text-sm font-black text-yellow-500 font-mono">{formatCurrency(totalValue)}</p>
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
