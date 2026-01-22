
import React from 'react';
import type { ContractItem } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface ItemRowProps {
  item: ContractItem;
  quantities: {
      quantityCommitted: number;
      quantitySupplied: number;
  };
  onDeleteItemRequest: () => void;
  isReadOnly: boolean;
}

export const ItemRow: React.FC<ItemRowProps> = ({ item, quantities, onDeleteItemRequest, isReadOnly }) => {
  const { quantityCommitted, quantitySupplied } = quantities;
  
  const balanceToSupply = quantityCommitted - quantitySupplied;
  const balanceToCommit = item.quantityBid - quantityCommitted;
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <tr className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700 transition-colors duration-200">
      <td className="px-4 py-3 font-medium text-gray-100 text-center">{item.item}</td>
      <td className="px-4 py-3 text-gray-300 whitespace-normal break-words min-w-[250px]">{item.description}</td>
      <td className="px-4 py-3 text-right font-mono text-gray-200">{formatCurrency(item.unitValue)}</td>
      <td className="px-4 py-3 text-center font-medium text-gray-200">{item.quantityBid}</td>
      <td className="px-4 py-3 text-center text-gray-400">{quantityCommitted}</td>
      <td className="px-4 py-3 text-center text-gray-400">{quantitySupplied}</td>
      <td className={`px-4 py-3 text-center font-bold ${balanceToSupply > 0 ? 'text-orange-400' : 'text-green-400'}`}>
        {balanceToSupply}
      </td>
      <td className={`px-4 py-3 text-center font-bold ${balanceToCommit > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
        {balanceToCommit}
      </td>
      <td className="px-4 py-3 text-center">
        {!isReadOnly && (
          <button
            onClick={onDeleteItemRequest}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-700 rounded-full transition-colors duration-200"
            aria-label="Deletar item"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        )}
      </td>
    </tr>
  );
};
