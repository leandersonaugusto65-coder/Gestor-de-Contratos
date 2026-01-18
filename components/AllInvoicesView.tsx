import React from 'react';
import type { DashboardInvoice } from '../types';

interface AllInvoicesViewProps {
  invoices: DashboardInvoice[];
  onSelectInvoice: (invoice: DashboardInvoice) => void;
}

export const AllInvoicesView: React.FC<AllInvoicesViewProps> = ({ invoices, onSelectInvoice }) => {

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('pt-BR').format(new Date(`${dateString}T00:00:00`));
    }

    const calculateInvoiceValue = (invoice: DashboardInvoice) => {
        return invoice.items.reduce((sum, item) => {
            const contractItem = invoice.contractItems.find(ci => ci.id === item.contractItemId);
            return sum + (contractItem ? contractItem.unitValue * item.quantitySupplied : 0);
        }, 0);
    }

    if (invoices.length === 0) {
        return <div className="text-center py-12 bg-gray-800 rounded-lg shadow-inner"><p className="text-gray-400">Nenhuma nota fiscal pendente encontrada.</p></div>;
    }

    return (
        <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                        <tr>
                            <th scope="col" className="px-4 py-3">Cliente</th>
                            <th scope="col" className="px-4 py-3">Licitação Nº</th>
                            <th scope="col" className="px-4 py-3">Nota Fiscal Nº</th>
                            <th scope="col" className="px-4 py-3 text-center">Data</th>
                            <th scope="col" className="px-4 py-3 text-right">Valor Total</th>
                            <th scope="col" className="px-4 py-3 text-center">Status Pgto.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map(invoice => (
                            <tr key={invoice.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700 cursor-pointer" onClick={() => onSelectInvoice(invoice)}>
                                <td className="px-4 py-3 font-medium text-white">{invoice.clientName}</td>
                                <td className="px-4 py-3">{invoice.biddingId}</td>
                                <td className="px-4 py-3">{invoice.invoiceNumber}</td>
                                <td className="px-4 py-3 text-center">{formatDate(invoice.date)}</td>
                                <td className="px-4 py-3 text-right font-semibold font-mono text-yellow-500">{formatCurrency(calculateInvoiceValue(invoice))}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        invoice.isPaid 
                                        ? 'bg-green-900/40 text-green-400 border border-green-500/20'
                                        : 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/20'
                                    }`}>
                                        {invoice.isPaid ? 'Pago' : 'Pendente'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {invoices.map(invoice => (
                    <div 
                        key={invoice.id} 
                        className="bg-gray-800 border border-gray-700 rounded-lg p-4 active:bg-gray-700 transition-colors shadow-sm"
                        onClick={() => onSelectInvoice(invoice)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-white font-bold text-sm line-clamp-1 flex-1">{invoice.clientName}</h3>
                            <span className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded font-bold uppercase ml-2">
                                NF {invoice.invoiceNumber}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                            <div>
                                <p className="text-[10px] uppercase font-semibold text-gray-500">Licitação</p>
                                <p>{invoice.biddingId}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase font-semibold text-gray-500">Data</p>
                                <p>{formatDate(invoice.date)}</p>
                            </div>
                            <div className="col-span-2 pt-2 border-t border-gray-700 mt-1 flex justify-between items-center">
                                <p className="text-[10px] uppercase font-semibold text-gray-500">Valor da Nota</p>
                                <p className="text-sm font-bold text-yellow-500 font-mono">{formatCurrency(calculateInvoiceValue(invoice))}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};