import React, { useState, useMemo } from 'react';
import type { Client, GlobalSummaryData, DashboardContract, DashboardCommitment, DashboardInvoice } from '../types';
import { GlobalSummary } from './GlobalSummary';
import { FilterIcon } from './icons/FilterIcon';
import { ReceivablesModal } from './ReceivablesModal';
import { AllCommitmentsView } from './AllCommitmentsView';
import { AllInvoicesView } from './AllInvoicesView';
import { ContractSummaryCard } from './ContractSummaryCard';
import { BanknotesIcon } from './icons/BanknotesIcon';
import { DocumentDuplicateIcon } from './icons/DocumentDuplicateIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { ClipboardDocumentCheckIcon } from './icons/ClipboardDocumentCheckIcon';
import { CommitmentDetailModal } from './CommitmentDetailModal';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { ExportDropdown } from './ExportDropdown';
import { formatCNPJ } from '../utils/cnpj';

interface DashboardProps {
    clients: Client[];
    contracts: DashboardContract[];
    commitments: DashboardCommitment[];
    invoices: DashboardInvoice[];
    onSelectClient: (clientId: number) => void;
    globalSummary: GlobalSummaryData;
    filterYear: string;
    setFilterYear: (year: string) => void;
    filterMonth: string;
    setFilterMonth: (month: string) => void;
    availableYears: number[];
    onMarkInvoiceAsPaid: (clientId: number, contractId: number, invoiceId: number) => void;
    onMarkInvoiceAsUnpaid: (clientId: number, contractId: number, invoiceId: number) => void;
    onDeleteCommitment: (clientId: number, contractId: number, commitmentId: number) => void;
    onDeleteInvoice: (clientId: number, contractId: number, invoiceId: number) => void;
    isReadOnly: boolean;
}

type DashboardView = 'finance' | 'contracts' | 'commitments' | 'invoices';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T00:00:00`));


export const Dashboard: React.FC<DashboardProps> = (props) => {
    const { clients, contracts, commitments, invoices, onSelectClient, globalSummary, filterYear, setFilterYear, filterMonth, setFilterMonth, availableYears, onMarkInvoiceAsPaid, onMarkInvoiceAsUnpaid, onDeleteCommitment, onDeleteInvoice, isReadOnly } = props;
    
    const [isReceivablesModalOpen, setIsReceivablesModalOpen] = useState(false);
    const [activeView, setActiveView] = useState<DashboardView>('contracts');
    const [selectedCommitment, setSelectedCommitment] = useState<DashboardCommitment | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<DashboardInvoice | null>(null);
    
    const months = [
        { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' },
        { value: '3', label: 'Março' }, { value: '4', label: 'Abril' },
        { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
        { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' },
        { value: '9', label: 'Setembro' }, { value: '10', label: 'Outubro' },
        { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
    ];

    const pendingCommitments = useMemo(() => {
        return commitments.filter(c => c.isPending);
    }, [commitments]);

    const pendingInvoices = useMemo(() => {
        return invoices.filter(inv => !inv.isPaid);
    }, [invoices]);

    const { exportHeaders, exportData, exportFilename, exportPdfTitle } = useMemo(() => {
        const dateSuffix = `${filterYear !== 'all' ? `_${filterYear}` : ''}${filterMonth !== 'all' ? `_${filterMonth}` : ''}`;

        switch(activeView) {
            case 'contracts':
                return {
                    exportHeaders: ['Cliente', 'UASG', 'CNPJ', 'Licitação Nº', 'Data Criação'],
                    exportData: contracts.map(c => [
                        c.clientName, 
                        c.uasg || '',
                        c.cnpj ? formatCNPJ(c.cnpj) : '',
                        c.biddingId, 
                        formatDate(c.creationDate)
                    ]),
                    exportFilename: `Relatorio_Contratos${dateSuffix}`,
                    exportPdfTitle: `Relatório de Contratos Ativos`
                };
            case 'commitments':
                const calculateCommitmentValue = (c: DashboardCommitment) => c.items.reduce((sum, item) => {
                    const contractItem = c.contractItems.find(ci => ci.id === item.contractItemId);
                    return sum + (contractItem ? contractItem.unitValue * item.quantity : 0);
                }, 0);
                return {
                    exportHeaders: ['Cliente', 'UASG', 'CNPJ', 'Licitação Nº', 'Empenho Nº', 'Data', 'Valor Total'],
                    exportData: pendingCommitments.map(c => {
                        const client = clients.find(cl => cl.id === c.clientId);
                        return [
                            c.clientName,
                            client?.uasg || '',
                            client?.cnpj ? formatCNPJ(client.cnpj) : '',
                            c.biddingId,
                            c.commitmentNumber,
                            formatDate(c.date),
                            formatCurrency(calculateCommitmentValue(c))
                        ];
                    }),
                    exportFilename: `Relatorio_Empenhos_Pendentes${dateSuffix}`,
                    exportPdfTitle: 'Relatório de Fornecimento Pendente'
                };
            case 'invoices':
                 const calculateInvoiceValue = (inv: DashboardInvoice) => inv.items.reduce((sum, item) => {
                    const contractItem = inv.contractItems.find(ci => ci.id === item.contractItemId);
                    return sum + (contractItem ? contractItem.unitValue * item.quantitySupplied : 0);
                }, 0);
                return {
                    exportHeaders: ['Cliente', 'UASG', 'CNPJ', 'Licitação Nº', 'Nota Fiscal Nº', 'Data', 'Valor Total'],
                    exportData: pendingInvoices.map(inv => {
                        const client = clients.find(cl => cl.id === inv.clientId);
                        return [
                            inv.clientName,
                            client?.uasg || '',
                            client?.cnpj ? formatCNPJ(client.cnpj) : '',
                            inv.biddingId,
                            inv.invoiceNumber,
                            formatDate(inv.date),
                            formatCurrency(calculateInvoiceValue(inv))
                        ];
                    }),
                    exportFilename: `Relatorio_Pagamentos_Pendentes${dateSuffix}`,
                    exportPdfTitle: 'Relatório de Pagamentos Pendentes'
                };
            default:
                return { exportHeaders: [], exportData: [], exportFilename: 'Relatorio', exportPdfTitle: 'Relatório' };
        }
    }, [activeView, contracts, pendingCommitments, pendingInvoices, filterYear, filterMonth, clients]);


    const handleMarkInvoicePaidAndCloseModal = (clientId: number, contractId: number, invoiceId: number) => {
        onMarkInvoiceAsPaid(clientId, contractId, invoiceId);
        setSelectedInvoice(prev => prev ? {...prev, isPaid: true} : null);
    };

    const handleMarkInvoiceUnpaidAndCloseModal = (clientId: number, contractId: number, invoiceId: number) => {
        onMarkInvoiceAsUnpaid(clientId, contractId, invoiceId);
        setSelectedInvoice(prev => prev ? {...prev, isPaid: false} : null);
    };

    const handleDeleteCommitmentAndCloseModal = () => {
        if (!selectedCommitment) return;
        onDeleteCommitment(selectedCommitment.clientId, selectedCommitment.contractId, selectedCommitment.id);
        setSelectedCommitment(null);
    };

    const handleDeleteInvoiceAndCloseModal = () => {
        if (!selectedInvoice) return;
        onDeleteInvoice(selectedInvoice.clientId, selectedInvoice.contractId, selectedInvoice.id);
        setSelectedInvoice(null);
    };

    const NavButton: React.FC<{
        label: string;
        icon: React.ReactElement<{ className?: string }>;
        isActive: boolean;
        onClick: () => void;
    }> = ({ label, icon, isActive, onClick }) => (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-2 p-3 sm:p-5 text-center font-semibold rounded-xl transition-all duration-200 border-2 shadow-sm ${
                isActive 
                ? 'bg-yellow-600 text-white border-yellow-700 shadow-yellow-900/20 scale-105 z-10' 
                : 'bg-slate-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-yellow-600/50 hover:text-yellow-600'
            }`}
        >
            {React.cloneElement(icon, { className: `w-6 h-6 sm:w-8 sm:h-8 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'}` })}
            <span className="text-[10px] sm:text-xs leading-tight">{label}</span>
        </button>
    );
    
    const renderActiveView = () => {
        switch(activeView) {
            case 'finance':
                 return <GlobalSummary summary={globalSummary} onReceivablesClick={() => setIsReceivablesModalOpen(true)} />;
            case 'commitments':
                return <AllCommitmentsView commitments={pendingCommitments} onSelectCommitment={setSelectedCommitment} />;
            case 'invoices':
                return <AllInvoicesView invoices={pendingInvoices} onSelectInvoice={setSelectedInvoice} />;
            case 'contracts':
            default:
                return (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {contracts.length > 0 ? (
                            contracts.map(contract => (
                                <ContractSummaryCard 
                                    key={contract.id} 
                                    contract={contract} 
                                    onSelectClient={onSelectClient} 
                                />
                            ))
                        ) : (
                             <div className="col-span-full text-center py-12 bg-slate-100 dark:bg-gray-800 rounded-lg shadow-inner">
                                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Nenhum contrato encontrado</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2">Tente ajustar os filtros de data.</p>
                            </div>
                        )}
                    </div>
                );
        }
    }

    return (
        <>
            <div className="space-y-8">
                {/* Mobile-Friendly Navigation Panel */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <NavButton label="Geral" icon={<BanknotesIcon />} isActive={activeView === 'finance'} onClick={() => setActiveView('finance')} />
                    <NavButton label="Contratos" icon={<DocumentDuplicateIcon />} isActive={activeView === 'contracts'} onClick={() => setActiveView('contracts')} />
                    <NavButton label="Fornecimento Pendente" icon={<ClipboardDocumentListIcon />} isActive={activeView === 'commitments'} onClick={() => setActiveView('commitments')} />
                    <NavButton label="Pagamento Pendente" icon={<ClipboardDocumentCheckIcon />} isActive={activeView === 'invoices'} onClick={() => setActiveView('invoices')} />
                </div>

                {/* Content Area */}
                <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div className="flex-1">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 capitalize">
                               {activeView === 'finance' ? 'Finanças' : 
                                activeView === 'commitments' ? 'Fornecimento Pendente' :
                                activeView === 'invoices' ? 'Pagamento Pendente' :
                                'Contratos Ativos'}
                            </h2>
                        </div>
                        <div className="flex w-full sm:w-auto items-center gap-2">
                            <div className="flex flex-grow items-center gap-2">
                                <FilterIcon className="hidden sm:block w-5 h-5 text-gray-500 dark:text-gray-400" />
                                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="w-full sm:w-auto bg-slate-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-xs py-2 px-3 focus:ring-yellow-600 focus:border-yellow-600">
                                    <option value="all">Anos</option>
                                    {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full sm:w-auto bg-slate-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-xs py-2 px-3 focus:ring-yellow-600 focus:border-yellow-600">
                                    <option value="all">Meses</option>
                                    {months.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
                                </select>
                            </div>
                             {activeView !== 'finance' && (
                                <ExportDropdown 
                                    headers={exportHeaders}
                                    data={exportData}
                                    filenamePrefix={exportFilename}
                                    pdfTitle={exportPdfTitle}
                                />
                            )}
                        </div>
                    </div>
                    {renderActiveView()}
                </div>
            </div>
            {isReceivablesModalOpen && (
                <ReceivablesModal clients={clients} onClose={() => setIsReceivablesModalOpen(false)} />
            )}
            {selectedCommitment && (
                <CommitmentDetailModal 
                    commitment={selectedCommitment} 
                    onClose={() => setSelectedCommitment(null)} 
                    onDelete={handleDeleteCommitmentAndCloseModal}
                    isReadOnly={isReadOnly}
                />
            )}
            {selectedInvoice && (
                <InvoiceDetailModal 
                    invoice={selectedInvoice} 
                    onClose={() => setSelectedInvoice(null)}
                    onMarkAsPaid={() => handleMarkInvoicePaidAndCloseModal(selectedInvoice.clientId, selectedInvoice.contractId, selectedInvoice.id)}
                    onMarkAsUnpaid={() => handleMarkInvoiceUnpaidAndCloseModal(selectedInvoice.clientId, selectedInvoice.contractId, selectedInvoice.id)}
                    onDelete={handleDeleteInvoiceAndCloseModal}
                    isReadOnly={isReadOnly}
                />
            )}
        </>
    );
};