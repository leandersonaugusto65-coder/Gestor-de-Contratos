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
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { BookmarkSquareIcon } from './icons/BookmarkSquareIcon';
import { formatCNPJ } from '../utils/cnpj';

interface ContractCardProps {
  clientId: number; clientName: string; clientUasg: string; clientCnpj?: string; contract: Contract; isReadOnly: boolean;
  onDeleteItem: (cId: number, ctId: number, iId: number) => void; onDeleteContract: (cId: number, ctId: number) => void;
  onDeleteCommitment: (cId: number, ctId: number, comId: number) => void; onDeleteInvoice: (cId: number, ctId: number, invId: number) => void;
  onAddItem: (cId: number, ctId: number, newItem: any) => void; onUpdateContract: (cId: number, ctId: number, data: any) => void;
  onAddCommitment: (cId: number, ctId: number, data: any) => void; onAddInvoice: (cId: number, ctId: number, data: any) => void;
  onMarkInvoiceAsPaid: (cId: number, ctId: number, invId: number) => void; onMarkInvoiceAsUnpaid: (cId: number, ctId: number, invId: number) => void;
}

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (d: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(`${d}T00:00:00`));

export const ContractCard: React.FC<ContractCardProps> = (props) => {
  const { clientId, clientName, clientUasg, clientCnpj, contract, isReadOnly, onAddItem, onUpdateContract, onAddCommitment, onAddInvoice, onDeleteItem, onDeleteContract, onDeleteCommitment, onDeleteInvoice, onMarkInvoiceAsPaid, onMarkInvoiceAsUnpaid } = props;
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [isAddingCommitment, setIsAddingCommitment] = useState(false);
  const [isAddingInvoice, setIsAddingInvoice] = useState(false);
  const [activeView, setActiveView] = useState<'items' | 'commitments' | 'invoices'>('items');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const summary: ContractSummary = useMemo(() => {
    const totalContractValue = contract.items.reduce((acc, item) => acc + (item.unitValue * item.quantityBid), 0);
    const totalCommittedValue = contract.commitments.reduce((sum, c) => sum + c.items.reduce((iSum, cItem) => iSum + ((contract.items.find(i => i.id === cItem.contractItemId)?.unitValue || 0) * cItem.quantity), 0), 0);
    let totalSuppliedValue = 0, totalPaidValue = 0;
    contract.invoices.forEach(inv => {
        const invValue = inv.items.reduce((iSum, iItem) => iSum + ((contract.items.find(i => i.id === iItem.contractItemId)?.unitValue || 0) * iItem.quantitySupplied), 0);
        totalSuppliedValue += invValue;
        if (inv.isPaid) totalPaidValue += invValue;
    });
    return { totalContractValue, totalCommittedValue, totalSuppliedValue, totalToSupplyValue: totalCommittedValue - totalSuppliedValue, totalPaidValue, totalToReceiveValue: totalSuppliedValue - totalPaidValue };
  }, [contract]);
  
  const handleDownloadEdital = () => {
    if (!contract.biddingType || !contract.uasg || !contract.biddingId) {
      alert("Informações incompletas para gerar o link do edital (UASG, Nº da Licitação e Tipo são obrigatórios).");
      return;
    }
    
    if (!contract.biddingId.includes('/')) {
        alert("O formato do Nº da Licitação está inválido. Use o formato NÚMERO/ANO, por exemplo: 90001/2024.");
        return;
    }

    const coduasg = contract.uasg.replace(/\D/g, '');
    const [biddingNumber, biddingYear] = contract.biddingId.split('/');
    
    const cleanBiddingNumber = biddingNumber.replace(/\D/g, '');
    const cleanBiddingYear = biddingYear.replace(/\D/g, '');

    if (!cleanBiddingNumber || !cleanBiddingYear) {
         alert("O formato do Nº da Licitação está inválido. Use o formato NÚMERO/ANO, por exemplo: 90001/2024.");
        return;
    }

    const numprp = `${cleanBiddingNumber}${cleanBiddingYear}`;
    
    let modprp = '';
    if (contract.biddingType === 'pregão') {
        modprp = '5';
    } else if (contract.biddingType === 'dispensa') {
        modprp = '4';
    } else {
        alert("Tipo de licitação não suportado para busca automática do edital.");
        return;
    }

    const url = `http://comprasnet.gov.br/ConsultaLicitacoes/download/download_editais_detalhe.asp?coduasg=${coduasg}&modprp=${modprp}&numprp=${numprp}`;
    
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadAta = () => {
    if (!contract.uasg || !contract.biddingId || !contract.biddingType) {
      alert("Informações incompletas para gerar o link da ata (UASG, Nº da Licitação e Tipo são obrigatórios).");
      return;
    }
    
    if (!contract.biddingId.includes('/')) {
        alert("O formato do Nº da Licitação está inválido. Use o formato NÚMERO/ANO, por exemplo: 90001/2024.");
        return;
    }

    const uasg = contract.uasg.replace(/\D/g, '');
    const [biddingNumber, biddingYear] = contract.biddingId.split('/');
    
    const cleanBiddingNumber = biddingNumber.replace(/\D/g, '');
    const cleanBiddingYear = biddingYear.replace(/\D/g, '');

    if (!cleanBiddingNumber || !cleanBiddingYear) {
         alert("O formato do Nº da Licitação está inválido. Use o formato NÚMERO/ANO, por exemplo: 90001/2024.");
        return;
    }

    const numprp = `${cleanBiddingNumber}${cleanBiddingYear}`;

    const actionUrl = contract.biddingType === 'pregão'
        ? 'https://www.comprasnet.gov.br/livre/pregao/AtaEletronico.asp'
        : 'https://www.comprasnet.gov.br/seguro/dispensa/ata/AtaEletronico.asp';
    
    const form = document.createElement('form');
    form.method = 'post';
    form.action = actionUrl;
    form.target = '_blank';

    const params: { [key: string]: string } = {
        codUASG: uasg,
        numprp: numprp,
    };

    for (const key in params) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = params[key];
        form.appendChild(input);
    }
    
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const { exportHeaders, exportData, exportFilename, exportPdfTitle } = useMemo(() => {
    const fn = `Contrato_${contract.biddingId.replace(/[/\\?%*:|"<>]/g, '-')}`;
    if (activeView === 'items') return {
        exportHeaders: ['Item', 'Descrição', 'Valor Unit.', 'Licitada', 'Empenhada', 'Fornecida', 'Saldo Fornecer', 'Saldo Empenhar'],
        exportData: contract.items.map(item => [item.item, item.description, formatCurrency(item.unitValue), item.quantityBid, contract.commitments.reduce((s, c) => s + c.items.filter(i => i.contractItemId === item.id).reduce((is, i) => is + i.quantity, 0), 0), contract.invoices.reduce((s, inv) => s + inv.items.filter(i => i.contractItemId === item.id).reduce((is, i) => is + i.quantitySupplied, 0), 0), 0, 0]),
        exportFilename: `${fn}_Itens`, exportPdfTitle: `Itens - Contrato ${contract.biddingId}`
    };
    return { exportHeaders: [], exportData: [], exportFilename: fn, exportPdfTitle: '' };
  }, [activeView, contract]);

  const TabButton: React.FC<{view: any, label: string, icon: any}> = ({view, label, icon}) => (
      <button 
        onClick={() => setActiveView(view)} 
        className={`relative flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 border-2 overflow-hidden ${
          activeView === view 
          ? 'bg-yellow-600/10 border-yellow-500 text-white shadow-[0_0_15px_rgba(202,138,4,0.15)]' 
          : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/40'
        }`}
      >
          {activeView === view && <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/5 to-transparent" />}
          {React.cloneElement(icon as any, { className: `w-5 h-5 transition-colors ${activeView === view ? 'text-yellow-500' : 'text-gray-600'}` })}
          <span className="relative z-10">{label}</span>
      </button>
  );

  const ActionButton: React.FC<{onClick: () => void, label: string}> = ({onClick, label}) => (
    <button 
        onClick={onClick} 
        className="group flex items-center gap-2 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-yellow-600/50 text-white font-bold py-2.5 px-5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-yellow-600/20 active:scale-95"
    >
        <PlusIcon className="w-5 h-5 text-yellow-500 transition-transform group-hover:rotate-90" />
        <span className="text-sm">{label}</span>
    </button>
  );
  
  const biddingTypeLabel = contract.biddingType === 'pregão' ? 'Pregão Eletrônico' : 'Dispensa Eletrônica';

  const validityDate = useMemo(() => {
    if (!contract.creationDate) return null;
    const date = new Date(`${contract.creationDate}T00:00:00`);
    date.setFullYear(date.getFullYear() + 1);
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }, [contract.creationDate]);

  return (
    <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden mb-8 transition-all hover:border-gray-600">
        <div className="p-6 bg-gray-900/80 backdrop-blur-sm text-white flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-600/10 rounded-2xl border border-yellow-600/20">
                <FileTextIcon className="w-8 h-8 text-yellow-500" />
              </div>
              <div>
                  <h2 className="text-xl font-bold tracking-tight">{biddingTypeLabel}: {contract.biddingId}</h2>
                  <div className='text-sm text-gray-400 mt-1 flex flex-wrap gap-x-4 gap-y-1 items-center'>
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-yellow-600" /> Criado em: {formatDate(contract.creationDate)}</span>
                    {validityDate && <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Vigência até: {validityDate}</span>}
                    <span className="opacity-60">UASG: {contract.uasg} | CNPJ: {contract.cnpj}</span>
                  </div>
              </div>
            </div>
            {!isReadOnly && (
              <div className="flex gap-2">
                <button onClick={handleDownloadEdital} className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl hover:text-yellow-500 hover:border-yellow-600/30 transition-all" title="Baixar Edital"><DocumentArrowDownIcon className="w-5 h-5"/></button>
                <button onClick={handleDownloadAta} className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl hover:text-yellow-500 hover:border-yellow-600/30 transition-all" title="Baixar Ata"><BookmarkSquareIcon className="w-5 h-5"/></button>
                <button onClick={() => setIsEditingContract(true)} className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl hover:text-yellow-500 hover:border-yellow-600/30 transition-all"><PencilIcon className="w-5 h-5" /></button>
                <button onClick={() => setIsDeleteConfirmOpen(true)} className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl hover:text-red-500 hover:border-red-600/30 transition-all"><TrashIcon className="w-5 h-5" /></button>
                <ExportDropdown headers={exportHeaders} data={exportData} filenamePrefix={exportFilename} pdfTitle={exportPdfTitle} />
              </div>
            )}
        </div>

        <div className="bg-gray-900/40 px-6 pt-4 border-b border-gray-700/50">
            <nav className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide">
                <TabButton view="items" label="Itens" icon={<FileTextIcon />} />
                <TabButton view="commitments" label="Empenhos" icon={<ClipboardDocumentListIcon />} />
                <TabButton view="invoices" label="Notas Fiscais" icon={<ClipboardDocumentCheckIcon />} />
            </nav>
        </div>

        <div className="p-6 bg-gray-800/20">
          <div className="animate-fade-in">
            {activeView === 'items' && <ContractItemsTable contract={contract} onDeleteItem={(id) => onDeleteItem(clientId, contract.id, id)} isReadOnly={isReadOnly} />}
            {activeView === 'commitments' && <div className="space-y-4">{contract.commitments.map(c => <CommitmentCard key={c.id} commitment={c} contractItems={contract.items} allCommitments={contract.commitments} allInvoices={contract.invoices} onDelete={() => onDeleteCommitment(clientId, contract.id, c.id)} isReadOnly={isReadOnly}/>)}</div>}
            {activeView === 'invoices' && <div className="space-y-4">{contract.invoices.map(inv => <InvoiceCard key={inv.id} invoice={inv} contractItems={contract.items} onMarkAsPaid={() => onMarkInvoiceAsPaid(clientId, contract.id, inv.id)} onMarkAsUnpaid={() => onMarkInvoiceAsUnpaid(clientId, contract.id, inv.id)} onDelete={() => onDeleteInvoice(clientId, contract.id, inv.id)} isReadOnly={isReadOnly} />)}</div>}
          </div>

          {!isReadOnly && (
            <div className="mt-8 flex justify-end">
                {activeView === 'items' && <ActionButton onClick={() => setIsAddingItem(true)} label="Novo Item" />}
                {activeView === 'commitments' && <ActionButton onClick={() => setIsAddingCommitment(true)} label="Novo Empenho" />}
                {activeView === 'invoices' && <ActionButton onClick={() => setIsAddingInvoice(true)} label="Nova Nota" />}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-900/60 border-t border-gray-700/50">
          <ContractSummaryView summary={summary} />
        </div>

        {isEditingContract && <EditContractModal contract={contract} onClose={() => setIsEditingContract(false)} onUpdate={(d) => { onUpdateContract(clientId, contract.id, d); setIsEditingContract(false); }} />}
        <ConfirmUpdateModal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={() => onDeleteContract(clientId, contract.id)} title="Excluir Contrato" message="Deseja realmente excluir este contrato?" />
        {isAddingItem && <AddItemForm onClose={() => setIsAddingItem(false)} onAddItem={(i) => onAddItem(clientId, contract.id, i)} />}
        {isAddingCommitment && <AddCommitmentForm contract={contract} onClose={() => setIsAddingCommitment(false)} onAddCommitment={(c) => onAddCommitment(clientId, contract.id, c)} />}
        {isAddingInvoice && <AddInvoiceForm contract={contract} onClose={() => setIsAddingInvoice(false)} onAddInvoice={(i) => onAddInvoice(clientId, contract.id, i)} />}
    </div>
  );
};