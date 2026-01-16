
import React, { useState } from 'react';
import type { Contract, ContractItem } from '../types';
import { ItemRow } from './ItemRow';
import { TrashIcon } from './icons/TrashIcon';
import { ConfirmUpdateModal } from './ConfirmUpdateModal';

interface ContractItemsTableProps {
  contract: Contract;
  onDeleteItem: (itemId: number) => void;
  isReadOnly: boolean;
}

export const ContractItemsTable: React.FC<ContractItemsTableProps> = ({ contract, onDeleteItem, isReadOnly }) => {
  const [itemToDelete, setItemToDelete] = useState<ContractItem | null>(null);

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    }
  };
  
  if (contract.items.length === 0) {
    return <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum item cadastrado neste contrato ainda.</p>;
  }

  const getQuantities = (contractItemId: number) => {
    const quantityCommitted = contract.commitments.reduce((sum, c) => sum + c.items.filter(i => i.contractItemId === contractItemId).reduce((itemSum, i) => itemSum + i.quantity, 0), 0);
    const quantitySupplied = contract.invoices.reduce((sum, inv) => sum + inv.items.filter(i => i.contractItemId === contractItemId).reduce((itemSum, i) => itemSum + i.quantitySupplied, 0), 0);
    return { quantityCommitted, quantitySupplied };
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="w-full">
      {/* Visualização em Tabela - Apenas Desktop (lg+) */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-slate-100 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-center">Item</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3 text-right">Valor Unit.</th>
              <th className="px-4 py-3 text-center">Licitada</th>
              <th className="px-4 py-3 text-center">Empenhada</th>
              <th className="px-4 py-3 text-center">Fornecida</th>
              <th className="px-4 py-3 text-center">Saldo Fornecer</th>
              <th className="px-4 py-3 text-center">Saldo Empenhar</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contract.items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                quantities={getQuantities(item.id)}
                onDeleteItemRequest={() => setItemToDelete(item)}
                isReadOnly={isReadOnly}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Visualização em Cards - Mobile e Tablet (até lg) */}
      <div className="lg:hidden space-y-4">
        {contract.items.map(item => {
          const { quantityCommitted, quantitySupplied } = getQuantities(item.id);
          const balanceToSupply = quantityCommitted - quantitySupplied;
          const balanceToCommit = item.quantityBid - quantityCommitted;

          return (
            <div key={item.id} className="bg-slate-100 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3 relative">
              <div className="flex justify-between items-start">
                <span className="bg-yellow-100 dark:bg-yellow-600/20 text-yellow-800 dark:text-yellow-500 text-xs font-bold px-2 py-1 rounded">Item {item.item}</span>
                {!isReadOnly && (
                  <button 
                    onClick={() => setItemToDelete(item)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight">{item.description}</p>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-2 border-t border-gray-200 dark:border-gray-600/50 text-xs">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 uppercase font-semibold text-[10px]">Valor Unitário</p>
                  <p className="text-gray-700 dark:text-gray-200 font-mono">{formatCurrency(item.unitValue)}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 uppercase font-semibold text-[10px]">Qtd. Licitada</p>
                  <p className="text-gray-700 dark:text-gray-200">{item.quantityBid}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 uppercase font-semibold text-[10px]">Empenhada</p>
                  <p className="text-gray-700 dark:text-gray-200">{quantityCommitted}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 uppercase font-semibold text-[10px]">Fornecida</p>
                  <p className="text-gray-700 dark:text-gray-200">{quantitySupplied}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-orange-600 dark:text-orange-500/80 uppercase font-semibold text-[10px]">Saldo a Fornecer</p>
                  <p className={`font-bold ${balanceToSupply > 0 ? 'text-orange-500 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>{balanceToSupply}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-blue-600 dark:text-blue-500/80 uppercase font-semibold text-[10px]">Saldo a Empenhar</p>
                  <p className={`font-bold ${balanceToCommit > 0 ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{balanceToCommit}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
       <ConfirmUpdateModal
            isOpen={!!itemToDelete}
            onClose={() => setItemToDelete(null)}
            onConfirm={handleConfirmDelete}
            title="Confirmar Exclusão de Item"
            message={
              <>
                <p className="mb-2">Tem certeza que deseja excluir o item <strong>{itemToDelete ? `${itemToDelete.item} - ${itemToDelete.description}` : ''}</strong>?</p>
                <p className="font-bold text-red-500">Atenção: A exclusão de um item pode afetar empenhos e notas fiscais existentes. Esta ação é irreversível.</p>
              </>
            }
            confirmText="Sim, Excluir Item"
            confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
    </div>
  );
};