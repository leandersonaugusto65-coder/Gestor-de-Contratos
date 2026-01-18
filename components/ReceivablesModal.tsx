import React, { useMemo } from 'react';
import type { Client, Invoice } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';

interface ReceivablesModalProps {
  clients: Client[];
  onClose: () => void;
}

interface UnpaidInvoiceInfo {
    clientName: string;
    biddingId: string;
    invoice: Invoice;
    invoiceValue: number;
}

export const ReceivablesModal: React.FC<ReceivablesModalProps> = ({ clients, onClose }) => {
    
    const unpaidInvoices = useMemo((): UnpaidInvoiceInfo[] => {
        const allUnpaid: UnpaidInvoiceInfo[] = [];
        clients.forEach(client => {
            client.contracts.forEach(contract => {
                const unpaid = contract.invoices.filter(inv => !inv.isPaid);
                unpaid.forEach(invoice => {
                    const invoiceValue = invoice.items.reduce((sum, item) => {
                        const contractItem = contract.items.find(ci => ci.id === item.contractItemId);
                        return sum + (contractItem ? contractItem.unitValue * item.quantitySupplied : 0);
                    }, 0);
                    allUnpaid.push({
                        clientName: client.name,
                        biddingId: contract.biddingId,
                        invoice,
                        invoiceValue
                    });
                });
            });
        });
        return allUnpaid;
    }, [clients]);

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('pt-BR').format(new Date(`${dateString}T00:00:00`));
    }

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Notas Pendentes</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="p-4 sm:p-6 flex-grow overflow-y-auto bg-gray-900/30">
                    {unpaidInvoices.length > 0 ? (
                        <>
                            {/* Desktop View */}
                            <div className="hidden sm:block overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">Cliente</th>
                                            <th scope="col" className="px-4 py-3">Licitação Nº</th>
                                            <th scope="col" className="px-4 py-3">Nota Fiscal Nº</th>
                                            <th scope="col" className="px-4 py-3 text-center">Data</th>
                                            <th scope="col" className="px-4 py-3 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {unpaidInvoices.map(({clientName, biddingId, invoice, invoiceValue}) => (
                                            <tr key={invoice.id} className="border-b border-gray-700 hover:bg-gray-700">
                                                <td className="px-4 py-3 font-medium text-white">{clientName}</td>
                                                <td className="px-4 py-3">{biddingId}</td>
                                                <td className="px-4 py-3">{invoice.invoiceNumber}</td>
                                                <td className="px-4 py-3 text-center">{formatDate(invoice.date)}</td>
                                                <td className="px-4 py-3 text-right font-semibold font-mono text-yellow-500">{formatCurrency(invoiceValue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View */}
                            <div className="sm:hidden space-y-3">
                                {unpaidInvoices.map(({clientName, biddingId, invoice, invoiceValue}) => (
                                    <div key={invoice.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-sm">
                                        <h3 className="text-white font-bold text-xs mb-1">{clientName}</h3>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] text-gray-400 uppercase">Lic: {biddingId}</span>
                                            <span className="text-[10px] font-bold text-green-400">NF {invoice.invoiceNumber}</span>
                                        </div>
                                        <div className="flex justify-between items-baseline pt-2 border-t border-gray-700">
                                            <span className="text-[10px] text-gray-500">{formatDate(invoice.date)}</span>
                                            <span className="text-sm font-bold text-yellow-500 font-mono">{formatCurrency(invoiceValue)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-gray-400 py-12">Não há notas pendentes de pagamento.</p>
                    )}
                </div>
                <footer className="bg-gray-900 px-6 py-3 flex justify-end rounded-b-lg border-t border-gray-700">
                    <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600">
                        Fechar
                    </button>
                </footer>
            </div>
             <style>{`
              @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in-up {
                animation: fade-in-up 0.3s ease-out forwards;
              }
            `}</style>
        </div>
    );
};