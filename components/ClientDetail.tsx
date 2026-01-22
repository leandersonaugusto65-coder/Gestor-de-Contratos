
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
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-8 gap-4">
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-yellow-500 transition-all group">
                    <div className="p-2 bg-gray-900 rounded-xl border border-gray-800 group-hover:border-yellow-600/30">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </div>
                    Voltar ao Dashboard
                </button>
                 {!isReadOnly && (
                    <button
                        onClick={() => setIsAddingContract(true)}
                        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-2xl transition-all duration-300 shadow-[0_4px_15px_rgba(234,179,8,0.3)] hover:shadow-[0_6px_25px_rgba(234,179,8,0.4)] active:scale-95"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Novo Contrato
                    </button>
                 )}
            </div>

            <div className="relative mb-10 p-8 bg-gray-900 rounded-3xl shadow-2xl border border-gray-800 overflow-hidden">
                 {/* Decorative background glow */}
                 <div className="absolute -top-24 -right-24 w-64 h-64 bg-yellow-600/10 rounded-full blur-3xl pointer-events-none" />
                 
                 <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600">Ficha do Cliente</span>
                            <h2 className="text-3xl font-bold text-gray-100">{client.name}</h2>
                        </div>
                        {!isReadOnly && (
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setIsEditingClient(true)}
                                    className="p-3 text-gray-400 hover:text-yellow-500 transition-all bg-black/40 border border-gray-800 rounded-xl hover:border-yellow-600/30"
                                    title="Editar cadastro"
                                >
                                    <PencilIcon className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => setIsDeleteClientConfirmOpen(true)}
                                    className="p-3 text-gray-400 hover:text-red-500 transition-all bg-black/40 border border-gray-800 rounded-xl hover:border-red-600/30"
                                    title="Excluir cliente"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                        <div className="p-4 bg-black/30 rounded-2xl border border-gray-800/50">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">UASG</p>
                            <p className="text-gray-200 font-mono">{client.uasg}</p>
                        </div>
                        <div className="p-4 bg-black/30 rounded-2xl border border-gray-800/50">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">CNPJ</p>
                            <p className="text-gray-200 font-mono">{client.cnpj || '---'}</p>
                        </div>
                        <div className="sm:col-span-2 p-4 bg-black/30 rounded-2xl border border-gray-800/50">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Endereço Principal</p>
                            <p className="text-gray-200 break-words">{client.address || 'Não informado'}</p>
                            
                            {client.cep && (
                                <>
                                    <div className="w-full h-px bg-gray-700/50 my-3" />
                                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">CEP</p>
                                    <p className="text-gray-200 font-mono">{client.cep}</p>
                                </>
                            )}
                        </div>
                    </div>
                 </div>
            </div>
           
            <div className="space-y-10">
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
                    <div className="text-center py-20 bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-800">
                        <PlusIcon className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-400">Nenhum contrato ativo</h3>
                        <p className="text-gray-500 mt-1 max-w-xs mx-auto">Comece adicionando a primeira licitação para este cliente clicando no botão acima.</p>
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
                title="Confirmar Exclusão"
                message={
                  <>
                    <p className="mb-2 text-gray-300">Tem certeza que deseja remover permanentemente o cliente <strong>{client.name}</strong>?</p>
                    <p className="text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-red-400 font-medium">Atenção: Todos os dados financeiros, contratos, empenhos e notas associados serão perdidos.</p>
                  </>
                }
                confirmText="Excluir Cliente"
                confirmButtonClass="bg-red-600 hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
            />
        </div>
    );
};
