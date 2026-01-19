
import React, { useState, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Client, Contract, ContractItem, Commitment, Invoice, DashboardContract, DashboardCommitment, DashboardInvoice, GlobalSummaryData, Profile } from './types';
import { initialClientsData } from './data/initialData';
import { Dashboard } from './components/Dashboard';
import { ClientDetail } from './components/ClientDetail';
import { AddContractModal } from './components/AddContractModal';
import { LoginPage } from './components/LoginPage';
import { AdminPanel } from './components/AdminPanel';
import { ConfirmUpdateModal } from './components/ConfirmUpdateModal';

import { PlusIcon } from './components/icons/PlusIcon';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import { ArrowRightOnRectangleIcon } from './components/icons/ArrowRightOnRectangleIcon';
import { UserGroupIcon } from './components/icons/UserGroupIcon';
import { supabase } from './supabaseClient';
import { useDebounce } from './hooks/useDebounce';
import { HourglassIcon } from './components/icons/HourglassIcon';
import { BackupButton } from './components/BackupButton';
import { RestoreButton } from './components/RestoreButton';
import { LogoPlaceholder } from './components/icons/LogoPlaceholder';

export default function App() {
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Data State from Supabase
  const [clients, setClients] = useState<Client[] | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSavingData, setIsSavingData] = useState(false);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  
  // UI State
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isAddingContract, setIsAddingContract] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [backupDataToRestore, setBackupDataToRestore] = useState<Client[] | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtering State
  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Session Management
  useEffect(() => {
    const fetchInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        setSession(initialSession);
      } catch (e) {
        console.error("Session error:", e);
        setAuthError("Erro de sessão.");
      } finally {
        setIsAuthLoading(false);
      }
    };

    fetchInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        // Só atualiza o estado se o ID do usuário mudar, prevenindo refreshes de token de resetarem a UI
        setSession(prev => (prev?.user.id === currentSession?.user.id ? prev : currentSession));
        if (!currentSession) {
          setProfile(null);
          setClients(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Profile
  useEffect(() => {
    const getProfile = async () => {
      if (session?.user.id) {
        setIsAuthLoading(true);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("Profile fetch error:", profileError.message);
          setAuthError("Erro ao carregar perfil.");
        } else {
          setProfile(profileData);
        }
        setIsAuthLoading(false);
      }
    };

    getProfile();
  }, [session?.user.id]);

  // Fetch initial data
  useEffect(() => {
    if (!session?.user.id || !profile?.is_approved) return;

    const fetchData = async () => {
      // Se já temos dados, não mostramos o spinner global para não resetar a UI aberta
      if (!clients) setIsLoadingData(true);
      
      setErrorLoading(null);
      const { data, error } = await supabase
        .from('app_data')
        .select('data')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') {
        setErrorLoading(error.message);
      } else if (data && data.data) {
        setClients(data.data);
      } else {
        setClients(initialClientsData);
      }
      setIsLoadingData(false);
    };

    fetchData();
  }, [session?.user.id, profile?.is_approved]);

  const debouncedClients = useDebounce(clients, 1500);
  const isReadOnly = profile?.role === 'user';

  // Save data
  useEffect(() => {
    if (debouncedClients === null || isLoadingData || !session || !profile?.is_approved || isReadOnly) {
      return;
    }

    const saveData = async () => {
      setIsSavingData(true);
      await supabase.from('app_data').upsert({ id: 1, data: debouncedClients });
      setIsSavingData(false);
    };

    saveData();
  }, [debouncedClients, isLoadingData, session, profile, isReadOnly]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      setSession(null);
      setProfile(null);
      setClients(null);
      setSelectedClientId(null);
      window.location.href = window.location.origin;
    } catch (e) {
      console.error("Logout error:", e);
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleAddContract = ({ clientName, address, cep, clientId, contractData, items }: any) => {
    if (!clients) return;
    
    // Preparar os itens se vierem da extração
    const finalItems: ContractItem[] = (items || []).map((item: any, index: number) => ({
      ...item,
      id: Date.now() + index
    }));

    const newContract: Contract = {
      id: Date.now(),
      ...contractData,
      items: finalItems, commitments: [], invoices: [],
    };

    let newClients = [...clients];
    if (clientId) {
      newClients = newClients.map(c => {
        if (c.id === clientId) {
          const updatedClient = { ...c, contracts: [...c.contracts, newContract] };
          if (address && c.address !== address) updatedClient.address = address;
          if (cep && c.cep !== cep) updatedClient.cep = cep;
          return updatedClient;
        }
        return c;
      });
    } else if (clientName) {
      const clientExists = newClients.find(c => c.name.trim().toLowerCase() === clientName.trim().toLowerCase());
      if (clientExists) {
        newClients = newClients.map(c => c.id === clientExists.id ? { ...c, contracts: [...c.contracts, newContract] } : c);
      } else {
        newClients.push({
          id: Date.now(),
          name: clientName,
          uasg: contractData.uasg || '',
          cnpj: contractData.cnpj,
          address, cep,
          contracts: [newContract],
        });
      }
    }
    setClients(newClients);
    setNotification({ message: 'Contrato salvo com sucesso!', type: 'success' });
    setIsAddingContract(false);
  };

  const handleUpdateClient = (clientId: number, updatedData: Partial<Client>) => {
    setClients(prev => prev?.map(c => c.id === clientId ? { ...c, ...updatedData } : c) || null);
    setNotification({ message: 'Cliente atualizado!', type: 'success' });
  };
  
  const handleDeleteClient = (clientId: number) => {
    setClients(prev => prev?.filter(c => c.id !== clientId) || null);
    setSelectedClientId(null);
    setNotification({ message: 'Cliente excluído!', type: 'success' });
  };

  const handleUpdateContract = (clientId: number, contractId: number, updatedData: Partial<Contract>) => {
    setClients(prev => prev?.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          contracts: c.contracts.map(ct => ct.id === contractId ? { ...ct, ...updatedData } : ct),
        };
      }
      return c;
    }) || null);
  };

  const handleDeleteContract = (clientId: number, contractId: number) => {
    setClients(prev => prev?.map(c => {
      if (c.id === clientId) {
        return { ...c, contracts: c.contracts.filter(ct => ct.id !== contractId) };
      }
      return c;
    }) || null);
  };

  const handleAddItem = (clientId: number, contractId: number, newItem: Omit<ContractItem, 'id'>) => {
    setClients(prev => prev?.map(c => {
      if (c.id === clientId) {
        return { ...c, contracts: c.contracts.map(ct => {
          if (ct.id === contractId) {
            return { ...ct, items: [...ct.items, { id: Date.now(), ...newItem }] };
          }
          return ct;
        })};
      }
      return c;
    }) || null);
  };

  const handleDeleteItem = (clientId: number, contractId: number, itemId: number) => {
    setClients(prev => prev?.map(c => {
      if (c.id === clientId) {
        return { ...c, contracts: c.contracts.map(ct => {
          if (ct.id === contractId) {
            return { ...ct, items: ct.items.filter(i => i.id !== itemId) };
          }
          return ct;
        })};
      }
      return c;
    }) || null);
  };
  
  const handleAddCommitment = (clientId: number, contractId: number, newCommitment: Omit<Commitment, 'id'>) => {
    setClients(prev => prev?.map(c => {
      if (c.id === clientId) {
        return { ...c, contracts: c.contracts.map(ct => {
          if (ct.id === contractId) {
            return { ...ct, commitments: [...ct.commitments, { id: Date.now(), ...newCommitment }] };
          }
          return ct;
        })};
      }
      return c;
    }) || null);
  };

  const handleDeleteCommitment = (clientId: number, contractId: number, commitmentId: number) => {
    setClients(prev => prev?.map(c => {
      if (c.id === clientId) {
        return { ...c, contracts: c.contracts.map(ct => {
          if (ct.id === contractId) {
            return { ...ct, commitments: ct.commitments.filter(com => com.id !== commitmentId) };
          }
          return ct;
        })};
      }
      return c;
    }) || null);
  };

  const handleAddInvoice = (clientId: number, contractId: number, newInvoice: Omit<Invoice, 'id' | 'isPaid'>) => {
    setClients(prev => prev?.map(c => {
      if (c.id === clientId) {
        return { ...c, contracts: c.contracts.map(ct => {
          if (ct.id === contractId) {
            return { ...ct, invoices: [...ct.invoices, { id: Date.now(), ...newInvoice, isPaid: false }] };
          }
          return ct;
        })};
      }
      return c;
    }) || null);
  };

  const handleDeleteInvoice = (clientId: number, contractId: number, invoiceId: number) => {
    setClients(prev => prev?.map(c => {
      if (c.id === clientId) {
        return { ...c, contracts: c.contracts.map(ct => {
          if (ct.id === contractId) {
            return { ...ct, invoices: ct.invoices.filter(inv => inv.id !== invoiceId) };
          }
          return ct;
        })};
      }
      return c;
    }) || null);
  };

  const handleMarkInvoiceAsPaid = (clientId: number, contractId: number, invoiceId: number) => {
    setClients(prev => prev?.map(c => {
      if (c.id === clientId) {
        return { ...c, contracts: c.contracts.map(ct => {
          if (ct.id === contractId) {
            return { ...ct, invoices: ct.invoices.map(inv => inv.id === invoiceId ? { ...inv, isPaid: true } : inv) };
          }
          return ct;
        })};
      }
      return c;
    }) || null);
  };

  const handleMarkInvoiceAsUnpaid = (clientId: number, contractId: number, invoiceId: number) => {
    setClients(prev => prev?.map(c => {
      if (c.id === clientId) {
        return { ...c, contracts: c.contracts.map(ct => {
          if (ct.id === contractId) {
            return { ...ct, invoices: ct.invoices.map(inv => inv.id === invoiceId ? { ...inv, isPaid: false } : inv) };
          }
          return ct;
        })};
      }
      return c;
    }) || null);
  };

  const handleBackup = () => {
    if (!clients) return;
    const dataStr = JSON.stringify(clients, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `backup_oficina_${new Date().toISOString().split('T')[0]}.json`);
    linkElement.click();
  };

  const handleFileSelectForRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedData = JSON.parse(e.target?.result as string);
          if (Array.isArray(parsedData)) {
            setBackupDataToRestore(parsedData);
            setIsRestoreConfirmOpen(true);
          }
        } catch (error) {
          setNotification({ message: 'Erro ao ler arquivo de backup.', type: 'error' });
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const handleConfirmRestore = () => {
    if (backupDataToRestore) setClients(backupDataToRestore);
    setIsRestoreConfirmOpen(false);
    setBackupDataToRestore(null);
  };

  const { dashboardContracts, dashboardCommitments, dashboardInvoices, globalSummary, availableYears } = useMemo(() => {
    if (!clients) return { dashboardContracts: [], dashboardCommitments: [], dashboardInvoices: [], globalSummary: { totalBidValue: 0, totalCommittedValue: 0, totalSuppliedValue: 0, balanceToSupplyValue: 0, totalToReceiveValue: 0 }, availableYears: [] };

    let filteredContracts = clients.flatMap(c => c.contracts.map(ct => ({ ...ct, clientName: c.name, clientId: c.id })));
    const years = [...new Set(filteredContracts.map(c => new Date(c.creationDate).getFullYear()))].sort((a: number, b: number) => b - a);

    if (filterYear !== 'all') filteredContracts = filteredContracts.filter(c => new Date(c.creationDate).getFullYear() === parseInt(filterYear));
    if (filterMonth !== 'all') filteredContracts = filteredContracts.filter(c => new Date(c.creationDate).getMonth() + 1 === parseInt(filterMonth));

    const dContracts: DashboardContract[] = filteredContracts;
    const dCommitments: DashboardCommitment[] = [];
    const dInvoices: DashboardInvoice[] = [];
    
    clients.forEach(client => {
      client.contracts.forEach(contract => {
        if (dContracts.some(dc => dc.id === contract.id)) {
            contract.commitments.forEach(commitment => {
                 const totalCommittedForItems = commitment.items.reduce((sum, item) => sum + item.quantity, 0);
                 const totalSuppliedForItems = contract.invoices.reduce((sum, inv) => 
                     sum + inv.items
                         .filter(invItem => commitment.items.some(cItem => cItem.contractItemId === invItem.contractItemId))
                         .reduce((invSum, invItem) => invSum + invItem.quantitySupplied, 0)
                 , 0);
                 dCommitments.push({
                     ...commitment, clientName: client.name, biddingId: contract.biddingId, clientId: client.id, contractId: contract.id, contractItems: contract.items, isPending: totalCommittedForItems > totalSuppliedForItems, allContractCommitments: contract.commitments, allContractInvoices: contract.invoices
                 });
            });
            contract.invoices.forEach(invoice => {
                 dInvoices.push({ ...invoice, clientName: client.name, biddingId: contract.biddingId, contractItems: contract.items, clientId: client.id, contractId: contract.id });
            });
        }
      });
    });

    const summary: GlobalSummaryData = { totalBidValue: 0, totalCommittedValue: 0, totalSuppliedValue: 0, balanceToSupplyValue: 0, totalToReceiveValue: 0 };
    clients.forEach(c => c.contracts.forEach(ct => {
        const contractBidValue = ct.items.reduce((sum, item) => sum + (Number(item.unitValue) * Number(item.quantityBid)), 0);
        const contractCommittedValue = ct.commitments.reduce((sum, com) => sum + com.items.reduce((itemSum, comItem) => {
            const item = ct.items.find(i => i.id === comItem.contractItemId);
            return itemSum + (item ? Number(item.unitValue) * Number(comItem.quantity) : 0);
        }, 0), 0);
        const contractSuppliedValue = ct.invoices.reduce((sum, inv) => sum + inv.items.reduce((itemSum, invItem) => {
            const item = ct.items.find(i => i.id === invItem.contractItemId);
            return itemSum + (item ? Number(item.unitValue) * Number(invItem.quantitySupplied) : 0);
        }, 0), 0);
        const contractPaidValue = ct.invoices.filter(inv => inv.isPaid).reduce((sum, inv) => sum + inv.items.reduce((itemSum, invItem) => {
            const item = ct.items.find(i => i.id === invItem.contractItemId);
            return itemSum + (item ? Number(item.unitValue) * Number(invItem.quantitySupplied) : 0);
        }, 0), 0);
        summary.totalBidValue += contractBidValue;
        summary.totalCommittedValue += contractCommittedValue;
        summary.totalSuppliedValue += contractSuppliedValue;
        summary.totalToReceiveValue += (contractSuppliedValue - contractPaidValue);
    }));
    summary.balanceToSupplyValue = summary.totalCommittedValue - summary.totalSuppliedValue;

    return { dashboardContracts: dContracts, dashboardCommitments: dCommitments, dashboardInvoices: dInvoices, globalSummary: summary, availableYears: years };
  }, [clients, filterYear, filterMonth]);
  
  const selectedClient = useMemo(() => clients?.find(c => c.id === selectedClientId), [clients, selectedClientId]);
  
  if (isAuthLoading) return <div className="min-h-screen flex justify-center items-center bg-gray-900"><SpinnerIcon className="w-10 h-10 text-yellow-500 animate-spin" /></div>;
  if (!session) return <LoginPage supabaseClient={supabase} />;
  
  if (!profile) return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white p-4 text-center">
        <HourglassIcon className="w-12 h-12 text-yellow-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Sessão expirada ou erro de perfil</h1>
        <button onClick={handleLogout} className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Sair e Resetar App</button>
    </div>
  );

  if (!profile.is_approved) return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white p-4 text-center">
        <HourglassIcon className="w-12 h-12 text-yellow-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Aguardando Aprovação</h1>
        <button onClick={handleLogout} className="mt-6 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg">Sair</button>
    </div>
  );

  // Só mostra o Spinner se os clientes ainda forem nulos (primeiro carregamento)
  if (isLoadingData && clients === null) return <div className="min-h-screen flex justify-center items-center bg-gray-900"><SpinnerIcon className="w-10 h-10 text-yellow-500 animate-spin" /></div>;
  
  return (
    <div className="min-h-screen bg-black text-gray-200">
      <header className="bg-gray-900 shadow-md border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
               <LogoPlaceholder className="h-10 w-10" />
              <h1 className="text-xl font-bold text-white font-title hidden sm:block">Oficina da Arte</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
               {isSavingData && <div className="flex items-center gap-2 text-xs text-gray-400"><SpinnerIcon className="w-4 h-4 animate-spin" /><span>Salvando...</span></div>}
               {!isReadOnly && <BackupButton onBackup={handleBackup} />}
               {!isReadOnly && <RestoreButton onRestore={handleFileSelectForRestore} />}
               {profile.role === 'admin' && (
                  <button onClick={() => setIsAdminPanelOpen(true)} className="p-2 rounded-full hover:bg-gray-700 transition-colors" title="Painel do Administrador">
                    <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
                  </button>
                )}
               <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-700 transition-colors" title="Sair">
                  <ArrowRightOnRectangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
               </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {selectedClient ? (
          <ClientDetail client={selectedClient} isReadOnly={isReadOnly} onBack={() => setSelectedClientId(null)} onDeleteItem={handleDeleteItem} onDeleteContract={handleDeleteContract} onDeleteClient={handleDeleteClient} onDeleteCommitment={handleDeleteCommitment} onDeleteInvoice={handleDeleteInvoice} onAddItem={handleAddItem} onAddContract={handleAddContract} onUpdateContract={handleUpdateContract} onUpdateClient={handleUpdateClient} onAddCommitment={handleAddCommitment} onAddInvoice={handleAddInvoice} onMarkInvoiceAsPaid={handleMarkInvoiceAsPaid} onMarkInvoiceAsUnpaid={handleMarkInvoiceAsUnpaid} />
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Painel de Controle</h1>
              {!isReadOnly && (
                <button 
                  onClick={() => setIsAddingContract(true)} 
                  className="group relative w-full sm:w-auto flex items-center justify-center gap-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-2xl transition-all duration-300 shadow-[0_4px_15px_rgba(234,179,8,0.3)] hover:shadow-[0_6px_25px_rgba(234,179,8,0.4)] active:scale-95"
                >
                  <PlusIcon className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90" /> 
                  <span className="tracking-wide">Novo Cliente / Contrato</span>
                </button>
              )}
            </div>
            <Dashboard clients={clients || []} contracts={dashboardContracts} commitments={dashboardCommitments} invoices={dashboardInvoices} onSelectClient={setSelectedClientId} globalSummary={globalSummary} filterYear={filterYear} setFilterYear={setFilterYear} filterMonth={filterMonth} setFilterMonth={setFilterMonth} availableYears={availableYears} onMarkInvoiceAsPaid={handleMarkInvoiceAsPaid} onMarkInvoiceAsUnpaid={handleMarkInvoiceAsUnpaid} onDeleteCommitment={handleDeleteCommitment} onDeleteInvoice={handleDeleteInvoice} isReadOnly={isReadOnly} />
          </div>
        )}
      </main>

      {isAddingContract && <AddContractModal clients={clients || []} onClose={() => setIsAddingContract(false)} onAddContract={handleAddContract} />}
      {isAdminPanelOpen && <AdminPanel supabase={supabase} onClose={() => setIsAdminPanelOpen(false)} />}
      <ConfirmUpdateModal isOpen={isRestoreConfirmOpen} onClose={() => setIsRestoreConfirmOpen(false)} onConfirm={handleConfirmRestore} title="Confirmar Restauração" message={<><p className="mb-2">Você tem certeza que deseja restaurar os dados?</p><p className="font-bold text-red-500">Atenção: Todos os dados atuais serão substituídos.</p></>} confirmText="Sim, Restaurar Dados" confirmButtonClass="bg-red-600 hover:bg-red-700" />
      {notification && <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-lg shadow-lg text-white animate-fade-in-up ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{notification.message}</div>}
    </div>
  );
}
