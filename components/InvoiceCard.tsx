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
      <div className={`bg-gray-900/40 rounded-2xl border border-gray-800 overflow-hidden shadow-xl backdrop-blur-sm transition-all ${invoice.isPaid ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-yellow-600'}`}>
          <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-black/20">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${invoice.isPaid ? 'bg-emerald-500/10' : 'bg-yellow-600/10'}`}>
                    <ClipboardDocumentCheckIcon className={`w-6 h-6 ${invoice.isPaid ? 'text-emerald-500' : 'text-yellow-600'}`} />
                  </div>
                  <div>
                      <h4 className="font-bold text-gray-100">Nota Fiscal Nº: {invoice.invoiceNumber}</h4>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Data: {formattedDate}</p>
                  </div>
              </div>
               {invoice.isPaid ? (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckIcon className="w-4 h-4"/>
                          Paga
                      </span>
                      {!isReadOnly && (
                        <>
                          <button 
                              onClick={() => openConfirmation('unpay')}
                              className="p-2 text-gray-400 bg-gray-800 hover:text-yellow-500 rounded-xl border border-gray-700 transition-all"
                              title="Desfazer pagamento"
                          >
                            <ArrowUturnLeftIcon className="w-4 h-4"/>
                          </button>
                          <button 
                              onClick={() => setIsDeleteConfirmOpen(true)}
                              className="p-2 text-gray-400 bg-gray-800 hover:text-red-500 rounded-xl border border-gray-700 transition-all"
                              title="Excluir nota fiscal"
                          >
                              <TrashIcon className="w-4 h-4"/>
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
                            className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg bg-yellow-500 text-black hover:bg-yellow-600"
                        >
                            <CheckIcon className="w-4 h-4"/>
                            Marcar Paga
                        </button>
                        <button 
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            className="p-2 text-gray-400 bg-gray-800 hover:text-red-500 rounded-xl border border-gray-700 transition-all"
                            title="Excluir nota fiscal"
                        >
                            <TrashIcon className="w-4 h-4"/>
                        </button>
                      </>
                    )}
                  </div>
              )}
          </div>
          <div className="p-0 sm:p-4">
            <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-300">
                      <thead className="text-[10px] text-gray-500 uppercase font-black bg-black/40">
                          <tr>
                              <th className="px-4 py-3 text-center">Item</th>
                              <th className="px-4 py-3">Descrição</th>
                              <th className="px-4 py-3 text-center">Qtd. Fornecida</th>
                              <th className="px-4 py-3 text-right">Valor Total</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                          {invoice.items.map(item => {
                              const contractItem = getItem(item.contractItemId);
                              if (!contractItem) return null;
                              const totalValue = item.quantitySupplied * contractItem.unitValue;
                              return (
                                  <tr key={item.contractItemId} className="hover:bg-yellow-600/5 transition-colors">
                                      <td className="px-4 py-3 text-center font-bold text-gray-500">{contractItem.item}</td>
                                      <td className="px-4 py-3 max-w-xs truncate font-medium">{contractItem.description}</td>
                                      <td className="px-4 py-3 text-center font-mono font-bold text-gray-400">{item.quantitySupplied}</td>
                                      <td className={`px-4 py-3 text-right font-mono font-bold ${invoice.isPaid ? 'text-emerald-500' : 'text-yellow-500'}`}>{formatCurrency(totalValue)}</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>

              <div className="md:hidden divide-y divide-gray-800">
                  {invoice.items.map(item => {
                      const contractItem = getItem(item.contractItemId);
                      if (!contractItem) return null;
                      const totalValue = item.quantitySupplied * contractItem.unitValue;
                      return (
                          <div key={item.contractItemId} className="p-4 space-y-1">
                              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Item {contractItem.item}</span>
                              <p className="text-xs font-semibold text-gray-200 line-clamp-1">{contractItem.description}</p>
                              <div className="flex justify-between items-end pt-1">
                                  <p className="text-[10px] text-gray-500 uppercase font-bold">Fornecidos: <span className="text-gray-300">{item.quantitySupplied}</span></p>
                                  <p className={`text-sm font-black font-mono ${invoice.isPaid ? 'text-emerald-500' : 'text-yellow-500'}`}>{formatCurrency(totalValue)}</p>
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
        confirmButtonClass={actionToConfirm === 'pay' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
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