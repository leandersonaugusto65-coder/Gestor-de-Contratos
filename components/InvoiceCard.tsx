
import React, { useState } from 'react';
import type { Invoice, ContractItem } from '../types';
import { ClipboardDocumentCheckIcon } from './icons/ClipboardDocumentCheckIcon';
import { ConfirmUpdateModal } from './ConfirmUpdateModal';
import { CheckIcon } from './icons/CheckIcon';
import { ArrowUturnLeftIcon } from './icons/ArrowUturnLeftIcon';
import { TrashIcon } from './icons/TrashIcon';

interface InvoiceCardProps {
  invoice: Invoice;
  contractItems: ContractItem[];
  onMarkAsPaid: () => void;
  onMarkAsUnpaid: () => void;
  onDelete: () => void;
  isReadOnly: boolean;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, contractItems, onMarkAsPaid, onMarkAsUnpaid, onDelete, isReadOnly }) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState<'pay' | 'unpay' | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleConfirm = () => {
    if (actionToConfirm === 'pay') {
      onMarkAsPaid();
    } else if (actionToConfirm === 'unpay') {
      onMarkAsUnpaid();
    }
    setIsConfirmOpen(false);
    setActionToConfirm(null);
  };
  
  const openConfirmation = (action: 'pay' | 'unpay') => {
    setActionToConfirm(action);
    setIsConfirmOpen(true);
  };

  const getItem = (contractItemId: number) => {
    return contractItems.find(item => item.id === contractItemId);
  }
  
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formattedDate = new Intl.DateTimeFormat('pt-BR').format(new Date(`${invoice.date}T00:00:00`));

  return (
    <>
      <div className={`bg-slate-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${invoice.isPaid ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-yellow-600'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-100 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                  <ClipboardDocumentCheckIcon className="w-6 h-6 text-green-400" />
                  <div>
                      <h4 className="font-bold text-gray-900 dark:text-gray-100">Nota Fiscal Nº: {invoice.invoiceNumber}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Data: {formattedDate}</p>
                  </div>
              </div>
               {invoice.isPaid ? (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-green-100 dark:bg-green-600/20 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/30">
                          <CheckIcon className="w-5 h-5"/>
                          Pagamento Efetuado
                      </span>
                      {!isReadOnly && (
                        <>
                          <button 
                              onClick={() => openConfirmation('unpay')}
                              className="px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-slate-50 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                              title="Desfazer pagamento"
                          >
                            <ArrowUturnLeftIcon className="w-5 h-5"/>
                          </button>
                          <button 
                              onClick={() => setIsDeleteConfirmOpen(true)}
                              className="p-1.5 text-gray-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 hover:text-red-500 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                              title="Excluir nota fiscal"
                          >
                              <TrashIcon className="w-5 h-5"/>
                          </button>
                        </>
                      )}
                  </div>
              ) : (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!isReadOnly && (
                      <>
                        <button
                            onClick={() => openConfirmation('pay')}
                            className="w-full sm:w-auto px-4 py-1.5 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-colors shadow-sm bg-yellow-600 text-white hover:bg-yellow-700"
                        >
                            <CheckIcon className="w-5 h-5"/>
                            Marcar como Paga
                        </button>
                        <button 
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            className="p-1.5 text-gray-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 hover:text-red-500 rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                            title="Excluir nota fiscal"
                        >
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                      </>
                    )}
                  </div>
              )}
          </div>
          <div className="p-0 sm:p-4">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                      <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-slate-100 dark:bg-gray-700/50">
                          <tr>
                              <th className="px-3 py-2 text-center">Item</th>
                              <th className="px-3 py-2">Descrição</th>
                              <th className="px-3 py-2 text-center">Qtd. Fornecida</th>
                              <th className="px-3 py-2 text-right">Valor Total</th>
                          </tr>
                      </thead>
                      <tbody>
                          {invoice.items.map(item => {
                              const contractItem = getItem(item.contractItemId);
                              if (!contractItem) return null;
                              const totalValue = item.quantitySupplied * contractItem.unitValue;
                              return (
                                  <tr key={item.contractItemId} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-slate-100 dark:hover:bg-gray-700/50">
                                      <td className="px-3 py-2 text-center">{contractItem.item}</td>
                                      <td className="px-3 py-2 max-w-xs truncate">{contractItem.description}</td>
                                      <td className="px-3 py-2 text-center">{item.quantitySupplied}</td>
                                      <td className="px-3 py-2 text-right font-mono font-semibold text-yellow-600 dark:text-yellow-500">{formatCurrency(totalValue)}</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>

              {/* Mobile List View */}
              <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                  {invoice.items.map(item => {
                      const contractItem = getItem(item.contractItemId);
                      if (!contractItem) return null;
                      const totalValue = item.quantitySupplied * contractItem.unitValue;
                      return (
                          <div key={item.contractItemId} className="p-4 space-y-1">
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Item {contractItem.item}</span>
                              <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-1">{contractItem.description}</p>
                              <div className="flex justify-between items-baseline pt-1">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Fornecidos: <span className="text-gray-700 dark:text-gray-200">{item.quantitySupplied}</span></p>
                                  <p className="text-sm font-bold text-yellow-600 dark:text-yellow-500 font-mono">{formatCurrency(totalValue)}</p>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>

      <ConfirmUpdateModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={actionToConfirm === 'pay' ? 'Confirmar Pagamento' : 'Reverter Pagamento'}
        message={
          actionToConfirm === 'pay' ?
          <p>Tem certeza que deseja marcar a nota fiscal <strong>{invoice.invoiceNumber}</strong> como paga?</p> :
          <p>Deseja reverter o pagamento da nota fiscal <strong>{invoice.invoiceNumber}</strong> e marcá-la como pendente novamente?</p>
        }
        confirmText={actionToConfirm === 'pay' ? 'Confirmar' : 'Reverter'}
        confirmButtonClass={actionToConfirm === 'pay' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
      />

      <ConfirmUpdateModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
          onDelete();
          setIsDeleteConfirmOpen(false);
        }}
        title="Confirmar Exclusão de Nota Fiscal"
        message={
          <>
            <p className="mb-2">Tem certeza que deseja excluir a nota fiscal <strong>{invoice.invoiceNumber}</strong>?</p>
            <p className="font-bold text-red-500">Esta ação é irreversível.</p>
          </>
        }
        confirmText="Sim, Excluir"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </>
  );
};