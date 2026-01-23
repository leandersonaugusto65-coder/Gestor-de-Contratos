
export interface User {
  id: number;
  name: string;
  email: string;
  password: string; // In a real app, this should be a hash
  isApproved: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  is_approved: boolean;
  role: 'admin' | 'editor' | 'user';
}

export interface ContractItem {
  id: number;
  item: number;
  description: string;
  unitValue: number;
  quantityBid: number; // Licitada
}

export interface CommitmentItem {
  contractItemId: number;
  quantity: number;
}

export interface Commitment {
  id: number;
  commitmentNumber: string;
  date: string; // YYYY-MM-DD
  items: CommitmentItem[];
}

export interface InvoiceItem {
  id?: number; // Tornando o ID opcional para retrocompatibilidade com backups antigos
  contractItemId: number;
  quantitySupplied: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  items: InvoiceItem[];
  isPaid: boolean;
}

export interface Contract {
  id: number;
  biddingId: string;
  biddingType: 'pregão' | 'dispensa';
  creationDate: string; // YYYY-MM-DD
  cnpj?: string;
  uasg?: string;
  items: ContractItem[];
  commitments: Commitment[];
  invoices: Invoice[];
}

export interface Client {
    id: number;
    name: string; // Razão Social or Nome Fantasia
    uasg: string;
    cnpj?: string;
    address?: string;
    cep?: string;
    contracts: Contract[];
}

export interface ContractSummary {
  totalCommittedValue: number;
  totalSuppliedValue: number;
  totalToSupplyValue: number;
  totalContractValue: number;
  totalPaidValue: number;
  totalToReceiveValue: number;
}

export interface GlobalSummaryData {
    totalBidValue: number;
    totalCommittedValue: number;
    totalSuppliedValue: number;
    balanceToSupplyValue: number;
    totalToReceiveValue: number;
}

// Types for flattened data on dashboard views
export interface DashboardContract extends Contract {
  clientName: string;
  clientId: number;
}

export interface DashboardCommitment extends Commitment {
  clientName: string;
  biddingId: string;
  clientId: number;
  contractId: number;
  contractItems: ContractItem[];
  isPending: boolean;
  allContractCommitments: Commitment[];
  allContractInvoices: Invoice[];
}

export interface DashboardInvoice extends Invoice {
  clientName: string;
  biddingId: string;
  contractItems: ContractItem[];
  clientId: number;
  contractId: number;
}

export type DashboardView = 'finance' | 'contracts' | 'commitments' | 'invoices' | 'proposal' | 'habilitação';

// Tipos para a funcionalidade de Habilitação
export interface Certidao {
  issueDate: string | null;
  expiryDate: string | null;
  fileData: string | null;
  fileName: string | null;
}

export type HabilitacaoData = Record<string, Certidao>;
