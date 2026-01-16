
import React, { useState } from 'react';
import type { Client, Contract, ContractItem, Commitment, Invoice } from '../types';
import { ContractCard } from './ContractCard';
import { AddContractForm } from './AddContractForm';
import { EditClientModal } from './EditClientModal';
import { ConfirmUpdateModal } from './ConfirmUpdateModal';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ClientDetailProps {
    client: Client;
    isReadOnly: boolean;
    onBack: () => void;
    onDeleteItem: (clientId: number, contractId: number, itemId: number) => void;
    onDeleteContract: (clientId: number, contractId: number) => void;
    onDeleteClient: (clientId: number) => void;
    onDeleteCommitment: (clientId: number, contractId: number, commitmentId: number) => void;
    onDeleteInvoice: (clientId: number, contractId: number, invoiceId: number) => void;
    onAddItem: (clientId: number, contractId: number, newItem: Omit<ContractItem, 'id'>) => void;
    onAddContract: (args: { clientName?: string; address?: string; cep?: string; clientId?: number; contractData: Omit<Contract, 'id' | 'items' | 'commitments' | 'invoices'> }) => void;
    onUpdateContract: (clientId: number, contractId: number, updatedData: Partial<Contract>) => void;
    onUpdateClient: (clientId: number, updatedData: Partial<Client>) => void;
    onAddCommitment: (clientId: number, contractId: number, newCommitment: Omit<Commitment, 'id'>) => void;
    onAddInvoice: (clientId: number, contractId: number, newInvoice: Omit<Invoice, 'id' | 'isPaid'>) => void;
    onMarkInvoiceAsPaid: (clientId: number, contractId: number, invoiceId: number) => void;
    onMarkInvoiceAsUnpaid: (clientId: number, contractId: number, invoiceId: number) => void;
}

export const ClientDetail: React.FC<ClientDetailProps> = (props) => {
    const { 
        client, 
        isReadOnly,
        onBack, 
        onDeleteItem,
        onDeleteContract,
        onDeleteClient,
        onDeleteCommitment,
        onDeleteInvoice,
        onAddItem,
        onAddContract,
        onUpdateContract,
        onUpdateClient,
        onAddCommitment,
        onAddInvoice,
        onMarkInvoiceAsPaid,
        onMarkInvoiceAsUnpaid
    } = props;
    
    const [isAddingContract, setIsAddingContract] = useState(false);
    const [isEditingClient, setIsEditingClient] = useState(false);
    const [isDeleteClientConfirmOpen, setIsDeleteClientConfirmOpen] = useState(false);

    const handleAddContract = ({ address, cep, contractData }: { address: string, cep: string, contractData: Omit<Contract, 'id' | 'items' | 'commitments' | 'invoices'> }) => {
        onAddContract({ clientId: client.id, address, cep, contractData });
        setIsAddingContract(false);
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-yellow-600 hover:text-yellow-500 transition-colors self-start">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Voltar para o Dashboard
                </button>
                 {!isReadOnly && (
                    <button
                        onClick={() => setIsAddingContract(true)}
                        className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-transform duration-200 hover:scale-105 self-end sm:self-center"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Novo Contrato
                    </button>
                 )}
            </div>

            <div className="relative mb-8 p-6 bg-slate-100 dark:bg-gray-800 rounded-lg shadow-inner border border-gray-200 dark:border-gray-700 group">
                 <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{client.name}</h2>
                    {!isReadOnly && (
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setIsEditingClient(true)}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-yellow-500 transition-colors bg-slate-200 dark:bg-gray-900/50 rounded-lg"
                                title="Editar cadastro do cliente"
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setIsDeleteClientConfirmOpen(true)}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors bg-slate-200 dark:bg-gray-900/50 rounded-lg"
                                title="Excluir cliente"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                 </div>
                 
                 <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p><span className="font-semibold text-gray-700 dark:text-gray-300">UASG:</span> {client.uasg}</p>
                    {client.cnpj && <p><span className="font-semibold text-gray-700 dark:text-gray-300">CNPJ:</span> {client.cnpj}</p>}
                    {client.address && <p><span className="font-semibold text-gray-700 dark:text-gray-300">Endereço:</span> {client.address}</p>}
                    {client.cep && <p><span className="font-semibold text-gray-700 dark:text-gray-300">CEP:</span> {client.cep}</p>}
                </div>
                 <p className="text-gray-500 dark:text-gray-400 mt-3">{client.contracts.length} contrato(s) ativo(s)</p>
            </div>
           
            <div className="space-y-8">
                {client.contracts.length > 0 ? (
                    client.contracts.map(contract => (
                        <ContractCard 
                            key={contract.id} 
                            clientId={client.id}
                            clientName={client.name}
                            clientUasg={client.uasg}
                            clientCnpj={client.cnpj}
                            contract={contract} 
                            isReadOnly={isReadOnly}
                            onDeleteItem={onDeleteItem}
                            onDeleteContract={onDeleteContract}
                            onDeleteCommitment={onDeleteCommitment}
                            onDeleteInvoice={onDeleteInvoice}
                            onAddItem={onAddItem}
                            onUpdateContract={onUpdateContract}
                            onAddCommitment={onAddCommitment}
                            onAddInvoice={onAddInvoice}
                            onMarkInvoiceAsPaid={onMarkInvoiceAsPaid}
                            onMarkInvoiceAsUnpaid={onMarkInvoiceAsUnpaid}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 bg-slate-100 dark:bg-gray-800 rounded-lg shadow-inner">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Nenhum contrato cadastrado</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Clique em "Novo Contrato" para adicionar a primeira licitação para este cliente.</p>
                    </div>
                )}
            </div>
            
            {isAddingContract && (
                <AddContractForm
                    client={client}
                    onClose={() => setIsAddingContract(false)}
                    onAddContract={handleAddContract}
                />
            )}

            {isEditingClient && (
                <EditClientModal
                    client={client}
                    onClose={() => setIsEditingClient(false)}
                    onUpdate={(updatedData) => {
                        onUpdateClient(client.id, updatedData);
                        setIsEditingClient(false);
                    }}
                />
            )}

            <ConfirmUpdateModal
                isOpen={isDeleteClientConfirmOpen}
                onClose={() => setIsDeleteClientConfirmOpen(false)}
                onConfirm={() => onDeleteClient(client.id)}
                title="Confirmar Exclusão do Cliente"
                message={
                  <>
                    <p className="mb-2">Tem certeza que deseja excluir o cliente <strong>{client.name}</strong>?</p>
                    <p className="font-bold text-red-500">Atenção: Todos os contratos e dados financeiros associados a este cliente serão permanentemente removidos. Esta ação é irreversível.</p>
                  </>
                }
                confirmText="Sim, Excluir Cliente"
                confirmButtonClass="bg-red-600 hover:bg-red-700"
            />
        </div>
    );
};