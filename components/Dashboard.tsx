
import React, { useState, useMemo } from 'react';
import type { Client, GlobalSummaryData, DashboardContract, DashboardCommitment, DashboardInvoice, DashboardView } from '../types';
import { GlobalSummary } from './GlobalSummary';
import { ReceivablesModal } from './ReceivablesModal';
import { AllCommitmentsView } from './AllCommitmentsView';
import { AllInvoicesView } from './AllInvoicesView';
import { ContractSummaryCard } from './ContractSummaryCard';
import { BanknotesIcon } from './icons/BanknotesIcon';
import { DocumentDuplicateIcon } from './icons/DocumentDuplicateIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { ClipboardDocumentCheckIcon } from './icons/ClipboardDocumentCheckIcon';
import { WrenchScrewdriverIcon } from './icons/WrenchScrewdriverIcon';
import { CommitmentDetailModal } from './CommitmentDetailModal';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { ExportDropdown } from './ExportDropdown';
import { FinancialBreakdown } from './FinancialBreakdown';
import { ProposalGenerator } from './ProposalGenerator';
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
    storedCert: string | null;
    onSaveCert: (base64: string | null) => void;
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T00:00:00`));

export const Dashboard: React.FC<DashboardProps> = (props) => {
    const { clients, contracts, commitments, invoices, onSelectClient, globalSummary, filterYear, setFilterYear, filterMonth, setFilterMonth, availableYears, onMarkInvoiceAsPaid, onMarkInvoiceAsUnpaid, onDeleteCommitment, onDeleteInvoice, isReadOnly, storedCert, onSaveCert } = props;
    
    const [isReceivablesModalOpen, setIsReceivablesModalOpen] = useState(false);
    const [activeView, setActiveView] = useState<DashboardView>('finance');
    const [selectedCommitment, setSelectedCommitment] = useState<DashboardCommitment | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<DashboardInvoice | null>(null);
    const [activeBreakdown, setActiveBreakdown] = useState<'licitado' | 'empenhado' | 'fornecido' | 'saldoFornecer' | null>(null);

    const handleBreakdownToggle = (type: 'licitado' | 'empenhado' | 'fornecido' | 'saldoFornecer') => {
        setActiveBreakdown(prev => (prev === type ? null : type));
    };

    const pendingCommitments = useMemo(() => commitments.filter(c => c.isPending), [commitments]);
    const pendingInvoices = useMemo(() => invoices.filter(inv => !inv.isPaid), [invoices]);

    const { exportHeaders, exportData, exportFilename, exportPdfTitle } = useMemo(() => {
        const dateSuffix = `${filterYear !== 'all' ? `_${filterYear}` : ''}${filterMonth !== 'all' ? `_${filterMonth}` : ''}`;
        switch(activeView) {
            case 'finance':
                return {
                    exportHeaders: ['Órgão / Cliente', 'Total Licitado', 'Total Empenhado', 'Total Fornecido'],
                    exportData: clients.map(client => {
                        let totalBid = 0;
                        let totalCommitted = 0;
                        let totalSupplied = 0;
                        client.contracts.forEach(contract => {
                            totalBid += contract.items.reduce((sum, item) => sum + (item.unitValue * item.quantityBid), 0);
                            contract.commitments.forEach(c => totalCommitted += c.items.reduce((s, ci) => s + ((contract.items.find(i => i.id === ci.contractItemId)?.unitValue || 0) * ci.quantity), 0));
                            contract.invoices.forEach(inv => totalSupplied += inv.items.reduce((s, ii) => s + ((contract.items.find(i => i.id === ii.contractItemId)?.unitValue || 0) * ii.quantitySupplied), 0));
                        });
                        return [client.name, formatCurrency(totalBid), formatCurrency(totalCommitted), formatCurrency(totalSupplied)];
                    }),
                    exportFilename: `Relatorio_Geral${dateSuffix}`,
                    exportPdfTitle: `Gestão Financeira Global`
                };
            case 'contracts':
                return {
                    exportHeaders: ['Cliente', 'UASG', 'CNPJ', 'Licitação Nº', 'Data Criação'],
                    exportData: contracts.map(c => [c.clientName, c.uasg || '', c.cnpj ? formatCNPJ(c.cnpj) : '', c.biddingId, formatDate(c.creationDate)]),
                    exportFilename: `Relatorio_Contratos${dateSuffix}`,
                    exportPdfTitle: `Relatório de Contratos Ativos`
                };
            case 'commitments':
                return {
                    exportHeaders: ['Cliente', 'UASG', 'CNPJ', 'Licitação Nº', 'Empenho Nº', 'Data', 'Valor Total'],
                    exportData: pendingCommitments.map(c => {
                        const client = clients.find(cl => cl.id === c.clientId);
                        return [c.clientName, client?.uasg || '', client?.cnpj ? formatCNPJ(client.cnpj) : '', c.biddingId, c.commitmentNumber, formatDate(c.date), formatCurrency(c.items.reduce((sum, item) => sum + ((c.contractItems.find(ci => ci.id === item.contractItemId)?.unitValue || 0) * item.quantity), 0))];
                    }),
                    exportFilename: `Relatorio_Empenhos_Pendentes${dateSuffix}`,
                    exportPdfTitle: 'Relatório de Fornecimento Pendente'
                };
            case 'invoices':
                return {
                    exportHeaders: ['Cliente', 'UASG', 'CNPJ', 'Licitação Nº', 'Nota Fiscal Nº', 'Data', 'Valor Total'],
                    exportData: pendingInvoices.map(inv => {
                        const client = clients.find(cl => cl.id === inv.clientId);
                        return [inv.clientName, client?.uasg || '', client?.cnpj ? formatCNPJ(client.cnpj) : '', inv.biddingId, inv.invoiceNumber, formatDate(inv.date), formatCurrency(inv.items.reduce((sum, item) => sum + ((inv.contractItems.find(ci => ci.id === item.contractItemId)?.unitValue || 0) * item.quantitySupplied), 0))];
                    }),
                    exportFilename: `Relatorio_Pagamentos_Pendentes${dateSuffix}`,
                    exportPdfTitle: 'Relatório de Pagamentos Pendentes'
                };
            default:
                return { exportHeaders: [], exportData: [], exportFilename: 'Relatorio', exportPdfTitle: 'Relatório' };
        }
    }, [activeView, contracts, pendingCommitments, pendingInvoices, filterYear, filterMonth, clients]);

    const NavButton: React.FC<{ label: string; icon: any; isActive: boolean; onClick: () => void; }> = ({ label, icon, isActive, onClick }) => (
        <button
            onClick={onClick}
            className={`group relative flex flex-col items-center justify-center gap-2 p-3 sm:p-5 text-center transition-all duration-300 rounded-2xl border-2 overflow-hidden ${
                isActive 
                ? 'bg-yellow-600/10 border-yellow-500 shadow-[0_0_20px_rgba(202,138,4,0.2)] scale-105 z-10' 
                : 'bg-gray-900/40 border-gray-800 text-gray-500 hover:border-gray-700 hover:bg-gray-800/60'
            }`}
        >
            {isActive && <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/20 to-transparent opacity-50" />}
            
            <div className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-yellow-500' : 'text-gray-600 group-hover:text-gray-400'}`}>
                {React.cloneElement(icon, { className: 'w-6 h-6 sm:w-8 sm:h-8' })}
            </div>
            
            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
            }`}>
                {label}
            </span>
            {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-yellow-500 rounded-t-full shadow-[0_-2px_10px_rgba(234,179,8,0.5)]" />}
        </button>
    );
    
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-5 gap-2 sm:gap-4">
                <NavButton label="Geral" icon={<BanknotesIcon />} isActive={activeView === 'finance'} onClick={() => setActiveView('finance')} />
                <NavButton label="Contratos" icon={<DocumentDuplicateIcon />} isActive={activeView === 'contracts'} onClick={() => setActiveView('contracts')} />
                <NavButton label="Fornec." icon={<ClipboardDocumentListIcon />} isActive={activeView === 'commitments'} onClick={() => setActiveView('commitments')} />
                <NavButton label="Pagtos." icon={<ClipboardDocumentCheckIcon />} isActive={activeView === 'invoices'} onClick={() => setActiveView('invoices')} />
                <NavButton label="Proposta" icon={<WrenchScrewdriverIcon />} isActive={activeView === 'proposal'} onClick={() => setActiveView('proposal')} />
            </div>

            <div className="animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-gray-800 pb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                       {activeView === 'finance' ? 'Gestão Financeira Global' : 
                        activeView === 'commitments' ? 'Fornecimento Pendente' : 
                        activeView === 'invoices' ? 'Pagamentos Pendentes' : 
                        activeView === 'proposal' ? 'Gerador de Propostas Comerciais' : 'Contratos Ativos'}
                    </h2>
                    {activeView !== 'proposal' && (
                        <div className="flex w-full sm:w-auto items-center gap-3">
                            <div className="flex items-center bg-gray-900 border border-gray-700 rounded-lg p-1">
                                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="bg-transparent border-none text-white text-xs font-bold py-1.5 px-3 focus:ring-0 cursor-pointer">
                                    <option value="all">Anos</option>
                                    {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                                <div className="w-px h-4 bg-gray-700 mx-1" />
                                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-transparent border-none text-white text-xs font-bold py-1.5 px-3 focus:ring-0 cursor-pointer">
                                    <option value="all">Mês</option>
                                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{new Intl.DateTimeFormat('pt-BR', {month: 'short'}).format(new Date(2000, m-1, 1)).toUpperCase()}</option>)}
                                </select>
                            </div>
                            <ExportDropdown headers={exportHeaders} data={exportData} filenamePrefix={exportFilename} pdfTitle={exportPdfTitle} />
                        </div>
                    )}
                </div>

                <div className="transition-all duration-500 ease-in-out">
                    {activeView === 'finance' && (
                        <div className="space-y-12">
                            <GlobalSummary 
                                summary={globalSummary} 
                                onReceivablesClick={() => setIsReceivablesModalOpen(true)}
                                onBreakdownToggle={handleBreakdownToggle}
                                activeBreakdown={activeBreakdown}
                            />
                            <FinancialBreakdown 
                                clients={clients} 
                                activeBreakdown={activeBreakdown}
                                onClose={() => setActiveBreakdown(null)}
                            />
                        </div>
                    )}
                    {activeView === 'commitments' && <AllCommitmentsView commitments={pendingCommitments} onSelectCommitment={setSelectedCommitment} />}
                    {activeView === 'invoices' && <AllInvoicesView invoices={pendingInvoices} onSelectInvoice={setSelectedInvoice} />}
                    {activeView === 'proposal' && <ProposalGenerator clients={clients} storedCert={storedCert} onSaveCert={onSaveCert} />}
                    {activeView === 'contracts' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {contracts.length > 0 ? (
                                contracts.map(contract => <ContractSummaryCard key={contract.id} contract={contract} onSelectClient={onSelectClient} />)
                            ) : (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-800 text-gray-500">
                                    <DocumentDuplicateIcon className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-lg font-medium">Nenhum contrato ativo encontrado.</p>
                                    <p className="text-sm">Ajuste os filtros ou adicione um novo contrato.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {isReceivablesModalOpen && <ReceivablesModal clients={clients} onClose={() => setIsReceivablesModalOpen(false)} />}
            {selectedCommitment && <CommitmentDetailModal commitment={selectedCommitment} onClose={() => setSelectedCommitment(null)} onDelete={() => { onDeleteCommitment(selectedCommitment.clientId, selectedCommitment.contractId, selectedCommitment.id); setSelectedCommitment(null); }} isReadOnly={isReadOnly} />}
            {selectedInvoice && <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} onMarkAsPaid={() => onMarkInvoiceAsPaid(selectedInvoice.clientId, selectedInvoice.contractId, selectedInvoice.id)} onMarkAsUnpaid={() => onMarkInvoiceAsUnpaid(selectedInvoice.clientId, selectedInvoice.contractId, selectedInvoice.id)} onDelete={() => { onDeleteInvoice(selectedInvoice.clientId, selectedInvoice.contractId, selectedInvoice.id); setSelectedInvoice(null); }} isReadOnly={isReadOnly} />}
        </div>
    );
};
