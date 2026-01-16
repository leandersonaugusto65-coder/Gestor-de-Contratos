import React, { useMemo, useState } from 'react';
import type { Contract, ContractSummary, ContractItem, Commitment, Invoice } from '../types';
import { ContractItemsTable } from './ContractItemsTable';
import { ContractSummaryView } from './ContractSummaryView';
import { AddItemForm } from './AddItemForm';
import { AddCommitmentForm } from './AddCommitmentForm';
import { AddInvoiceForm } from './AddInvoiceForm';
import { EditContractModal } from './EditContractModal';
import { PlusIcon } from './icons/PlusIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { PencilIcon } from './icons/PencilIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { ClipboardDocumentCheckIcon } from './icons/ClipboardDocumentCheckIcon';
import { CommitmentCard } from './CommitmentCard';
import { InvoiceCard } from './InvoiceCard';
import { TrashIcon } from './icons/TrashIcon';
import { ConfirmUpdateModal } from './ConfirmUpdateModal';
import { ExportDropdown } from './ExportDropdown';
import { formatCNPJ } from '../utils/cnpj';

interface ContractCardProps {
  clientId: number;
  clientName: string;
  clientUasg: string;
  clientCnpj?: string;
  contract: Contract;
  isReadOnly: boolean;
  onDeleteItem: (clientId: number, contractId: number, itemId: number) => void;
  onDeleteContract: (clientId: number, contractId: number) => void;
  onDeleteCommitment: (clientId: number, contractId: number, commitmentId: number) => void;
  onDeleteInvoice: (clientId: number, contractId: number, invoiceId: number) => void;
  onAddItem: (clientId: number, contractId: number, newItem: Omit<ContractItem, 'id'>) => void;
  onUpdateContract: (clientId: number, contractId: number, updatedData: Partial<Contract>) => void;
  onAddCommitment: (clientId: number, contractId: number, newCommitment: Omit<Commitment, 'id'>) => void;
  onAddInvoice: (clientId: number, contractId: number, newInvoice: Omit<Invoice, 'id' | 'isPaid'>) => void;
  onMarkInvoiceAsPaid: (clientId: number, contractId: number, invoiceId: number) => void;
  onMarkInvoiceAsUnpaid: (clientId: number, contractId: number, invoiceId: number) => void;
}

type ActiveView = 'items' | 'commitments' | 'invoices';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(`${date}T00:00:00`));


export const ContractCard: React.FC<ContractCardProps> = (props) => {
  const { clientId, clientName, clientUasg, clientCnpj, contract, isReadOnly, onAddItem, onUpdateContract, onAddCommitment, onAddInvoice, onDeleteItem, onDeleteContract, onDeleteCommitment, onDeleteInvoice, onMarkInvoiceAsPaid, onMarkInvoiceAsUnpaid } = props;
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [isAddingCommitment, setIsAddingCommitment] = useState(false);
  const [isAddingInvoice, setIsAddingInvoice] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('items');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const summary: ContractSummary = useMemo(() => {
    const getItem = (id: number) => contract.items.find(i => i.id === id);
    const totalContractValue = contract.items.reduce((acc, item) => acc + (item.unitValue * item.quantityBid), 0);
    
    const totalCommittedValue = contract.commitments.reduce((sum, c) => sum + c.items.reduce((itemSum, cItem) => {
        const item = getItem(cItem.contractItemId);
        return itemSum + (item ? item.unitValue * cItem.quantity : 0);
    }, 0), 0);
    
    let totalSuppliedValue = 0;
    let totalPaidValue = 0;

    contract.invoices.forEach(inv => {
        const invoiceValue = inv.items.reduce((itemSum, iItem) => {
            const item = getItem(iItem.contractItemId);
            return itemSum + (item ? item.unitValue * iItem.quantitySupplied : 0);
        }, 0);
        totalSuppliedValue += invoiceValue;
        if (inv.isPaid) {
            totalPaidValue += invoiceValue;
        }
    });

    const totalToSupplyValue = totalCommittedValue - totalSuppliedValue;
    const totalToReceiveValue = totalSuppliedValue - totalPaidValue;
    
    return { totalContractValue, totalCommittedValue, totalSuppliedValue, totalToSupplyValue, totalPaidValue, totalToReceiveValue };
  }, [contract]);

  const handleDeleteItemClick = (itemId: number) => {
    onDeleteItem(clientId, contract.id, itemId);
  };

  const { exportHeaders, exportData, exportFilename, exportPdfTitle } = useMemo(() => {
    const filename = `Contrato_${contract.biddingId.replace(/[/\\?%*:|"<>]/g, '-')}`;
    
    if (activeView === 'items') {
      const getQuantities = (contractItemId: number) => {
        const quantityCommitted = contract.commitments.reduce((sum, c) => sum + c.items.filter(i => i.contractItemId === contractItemId).reduce((itemSum, i) => itemSum + i.quantity, 0), 0);
        const quantitySupplied = contract.invoices.reduce((sum, inv) => sum + inv.items.filter(i => i.contractItemId === contractItemId).reduce((itemSum, i) => itemSum + i.quantitySupplied, 0), 0);
        return { quantityCommitted, quantitySupplied };
      }
      return {
        exportHeaders: ['Item', 'Descrição', 'Valor Unit.', 'Licitada', 'Empenhada', 'Fornecida', 'Saldo Fornecer', 'Saldo Empenhar'],
        exportData: contract.items.map(item => {
          const { quantityCommitted, quantitySupplied } = getQuantities(item.id);
          return [
            item.item,
            item.description,
            formatCurrency(item.unitValue),
            item.quantityBid,
            quantityCommitted,
            quantitySupplied,
            quantityCommitted - quantitySupplied,
            item.quantityBid - quantityCommitted
          ];
        }),
        exportFilename: `${filename}_Itens`,
        exportPdfTitle: `Relatório de Itens - Contrato ${contract.biddingId}`
      };
    } else if (activeView === 'commitments') {
      return {
        exportHeaders: ['Empenho Nº', 'Data', 'Item Nº', 'Item Descrição', 'Qtd. Empenhada', 'Valor Empenhado'],
        exportData: contract.commitments.flatMap(c => c.items.map(cItem => {
          const item = contract.items.find(i => i.id === cItem.contractItemId);
          return [
            c.commitmentNumber,
            formatDate(c.date),
            item?.item || 'N/A',
            item?.description || 'Item não encontrado',
            cItem.quantity,
            formatCurrency(cItem.quantity * (item?.unitValue || 0))
          ];
        })),
        exportFilename: `${filename}_Empenhos`,
        exportPdfTitle: `Relatório de Empenhos - Contrato ${contract.biddingId}`
      };
    } else { // invoices
      return {
        exportHeaders: ['Nota Fiscal Nº', 'Data', 'Status Pgto.', 'Item Nº', 'Item Descrição', 'Qtd. Fornecida', 'Valor Fornecido'],
        exportData: contract.invoices.flatMap(inv => inv.items.map(iItem => {
          const item = contract.items.find(i => i.id === iItem.contractItemId);
          return [
            inv.invoiceNumber,
            formatDate(inv.date),
            inv.isPaid ? 'Pago' : 'Pendente',
            item?.item || 'N/A',
            item?.description || 'Item não encontrado',
            iItem.quantitySupplied,
            formatCurrency(iItem.quantitySupplied * (item?.unitValue || 0))
          ];
        })),
        exportFilename: `${filename}_NotasFiscais`,
        exportPdfTitle: `Relatório de Notas Fiscais - Contrato ${contract.biddingId}`
      }
    }
  }, [activeView, contract]);

  const pdfSubtitle = `Cliente: ${clientName} | UASG: ${clientUasg || 'N/A'} | CNPJ: ${clientCnpj ? formatCNPJ(clientCnpj) : 'N/A'}`;

  const renderActiveView = () => {
    switch(activeView) {
      case 'commitments':
        return (
          <div className="space-y-4">
            {contract.commitments.length > 0 ? (
              contract.commitments.map(c => <CommitmentCard key={c.id} commitment={c} contractItems={contract.items} allCommitments={contract.commitments} allInvoices={contract.invoices} onDelete={() => onDeleteCommitment(clientId, contract.id, c.id)} isReadOnly={isReadOnly}/>)
            ) : <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum empenho cadastrado.</p>}
          </div>
        );
      case 'invoices':
        return (
          <div className="space-y-4">
            {contract.invoices.length > 0 ? (
              contract.invoices.map(inv => <InvoiceCard 
                key={inv.id} 
                invoice={inv} 
                contractItems={contract.items} 
                onMarkAsPaid={() => onMarkInvoiceAsPaid(clientId, contract.id, inv.id)}
                onMarkAsUnpaid={() => onMarkInvoiceAsUnpaid(clientId, contract.id, inv.id)}
                onDelete={() => onDeleteInvoice(clientId, contract.id, inv.id)}
                isReadOnly={isReadOnly}
              />)
            ) : <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma nota fiscal cadastrada.</p>}
          </div>
        );
      case 'items':
      default:
        return <ContractItemsTable contract={contract} onDeleteItem={handleDeleteItemClick} isReadOnly={isReadOnly} />;
    }
  }

  const getActiveButton = () => {
    if (isReadOnly) return null;
    switch(activeView) {
        case 'commitments': return <button onClick={() => setIsAddingCommitment(true)} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-75 whitespace-nowrap"><PlusIcon className="w-5 h-5" /> Adicionar Empenho</button>;
        case 'invoices': return <button onClick={() => setIsAddingInvoice(true)} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-75 whitespace-nowrap"><PlusIcon className="w-5 h-5" /> Adicionar Nota Fiscal</button>;
        case 'items': return <button onClick={() => setIsAddingItem(true)} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-75 whitespace-nowrap"><PlusIcon className="w-5 h-5" /> Adicionar Item</button>;
    }
  }

  const TabButton: React.FC<{view: ActiveView, label: string, icon: React.ReactNode}> = ({view, label, icon}) => (
      <button 
        onClick={() => setActiveView(view)} 
        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
            activeView === view ? 'border-yellow-600 text-yellow-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-gray-700'
        }`}
      >
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4 sm:w-5 sm:h-5' }) : null}
          <span>{label}</span>
      </button>
  );

  return (
    <>
      <div className="bg-slate-50 dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-yellow-600/20">
        <div className="p-6 bg-slate-100 dark:bg-gray-900 text-gray-900 dark:text-white">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <FileTextIcon className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-1" />
              <div className="flex justify-between items-start gap-4 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold" title={contract.biddingId || 'Não especificado'}>Licitação: {contract.biddingId || 'Não especificado'}</h2>
                    <div className='text-sm text-gray-700 dark:text-gray-300 space-y-1 mt-1'>
                      <p>Criado em: {formatDate(contract.creationDate)}</p>
                      <div className="flex flex-wrap gap-x-4">
                        {contract.uasg && <p><span className="text-gray-500">UASG:</span> {contract.uasg}</p>}
                        {contract.cnpj && <p><span className="text-gray-500">CNPJ:</span> {contract.cnpj}</p>}
                      </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 flex-shrink-0">
                    {!isReadOnly && (
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => setIsEditingContract(true)}
                                className="p-1 text-gray-500 dark:text-gray-400 hover:text-yellow-500 transition-colors"
                                title="Editar cadastro do contrato"
                            >
                                <PencilIcon className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => setIsDeleteConfirmOpen(true)}
                                className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors"
                                title="Excluir contrato"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <ExportDropdown
                        headers={exportHeaders}
                        data={exportData}
                        filenamePrefix={exportFilename}
                        pdfTitle={exportPdfTitle}
                        pdfSubtitle={pdfSubtitle}
                        variant="icon"
                    />
                </div>
              </div>
            </div>
            <div className="w-full sm:w-auto flex justify-start sm:justify-end">
                {getActiveButton()}
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700 px-2 sm:px-6">
            <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-hide" aria-label="Tabs">
                <TabButton view="items" label="Itens do Contrato" icon={<FileTextIcon />} />
                <TabButton view="commitments" label="Empenhos" icon={<ClipboardDocumentListIcon />} />
                <TabButton view="invoices" label="Notas Fiscais" icon={<ClipboardDocumentCheckIcon />} />
            </nav>
        </div>

        <div className="p-6">
          {renderActiveView()}
        </div>

        <div className="p-6 bg-slate-100 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <ContractSummaryView summary={summary} />
        </div>
      </div>
      
      {isEditingContract && (
        <EditContractModal
          contract={contract}
          onClose={() => setIsEditingContract(false)}
          onUpdate={(data) => {
            onUpdateContract(clientId, contract.id, data);
            setIsEditingContract(false);
          }}
        />
      )}
      
      <ConfirmUpdateModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => {
            onDeleteContract(clientId, contract.id);
            setIsDeleteConfirmOpen(false);
        }}
        title="Confirmar Exclusão do Contrato"
        message={
          <>
            <p className="mb-2">Tem certeza que deseja excluir o contrato da licitação <strong>{contract.biddingId || 'N/A'}</strong>?</p>
            <p className="font-bold text-red-500">Atenção: Todos os seus itens, empenhos e notas fiscais serão removidos permanentemente. Esta ação é irreversível.</p>
          </>
        }
        confirmText="Sim, Excluir Contrato"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {isAddingItem && <AddItemForm onClose={() => setIsAddingItem(false)} onAddItem={(newItem) => { onAddItem(clientId, contract.id, newItem); setIsAddingItem(false); }} />}
      {isAddingCommitment && <AddCommitmentForm contract={contract} onClose={() => setIsAddingCommitment(false)} onAddCommitment={(newCommitment) => { onAddCommitment(clientId, contract.id, newCommitment); setIsAddingCommitment(false); }} />}
      {isAddingInvoice && <AddInvoiceForm contract={contract} onClose={() => setIsAddingInvoice(false)} onAddInvoice={(newInvoice) => { onAddInvoice(clientId, contract.id, newInvoice); setIsAddingInvoice(false); }} />}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </>
  );
};