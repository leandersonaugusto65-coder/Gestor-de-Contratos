

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Client, Contract, ContractItem, Commitment, Invoice, InvoiceItem, DashboardContract, DashboardCommitment, DashboardInvoice, GlobalSummaryData, Profile } from './types';
import { initialClientsData } from './data/initialData';
import { Dashboard } from './components/Dashboard';
import { ClientDetail } from './components/ClientDetail';
import { AddContractModal } from './components/AddContractModal';
import { LoginPage } from './components/LoginPage';
import { AdminPanel } from './components/AdminPanel';
import { ConfirmUpdateModal } from './components/ConfirmUpdateModal';

import { SunIcon } from './components/icons/SunIcon';
import { MoonIcon } from './components/icons/MoonIcon';
import { PlusIcon } from './components/icons/PlusIcon';
import { SpinnerIcon } from './components/icons/SpinnerIcon';
import { ArrowRightOnRectangleIcon } from './components/icons/ArrowRightOnRectangleIcon';
import { UserCircleIcon } from './components/icons/UserCircleIcon';
import { UserGroupIcon } from './components/icons/UserGroupIcon';
import { stripCNPJ } from './utils/cnpj';
import { supabase } from './supabaseClient';
import { useDebounce } from './hooks/useDebounce';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ClipboardDocumentListIcon } from './components/icons/ClipboardDocumentListIcon';
import { CheckIcon } from './components/icons/CheckIcon';
import { HourglassIcon } from './components/icons/HourglassIcon';
import { BackupButton } from './components/BackupButton';
import { RestoreButton } from './components/RestoreButton';
import { LogoPlaceholder } from './components/icons/LogoPlaceholder';

type Theme = 'light' | 'dark';

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
  const [theme, setTheme] = useLocalStorage<Theme>('theme', 'dark');
  const [isCopied, setIsCopied] = useState(false);
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

  // Session Management Effect
  useEffect(() => {
    const fetchInitialSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Initial session error:", sessionError);
        setAuthError("Falha ao obter sessão inicial.");
      }
      setSession(session);
    };

    fetchInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Effect to fetch profile whenever session changes
  useEffect(() => {
    const getProfile = async () => {
      if (session) {
        setIsAuthLoading(true);
        setAuthError(null);
        setProfile(null);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("Profile fetch error:", profileError.message);
          setAuthError("Não foi possível carregar seu perfil. Sua conta pode estar dessincronizada. Tente sair e entrar novamente.");
        } else {
          setProfile(profileData);
        }
        setIsAuthLoading(false);
      } else {
        setProfile(null);
        setIsAuthLoading(false);
      }
    };

    getProfile();
  }, [session]);

  
  // Fetch initial data from Supabase
  useEffect(() => {
    if (!session || !profile?.is_approved) return;

    const fetchData = async () => {
      setIsLoadingData(true);
      setErrorLoading(null);
      const { data, error } = await supabase
        .from('app_data')
        .select('data')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching data from Supabase:', error.message);
        setErrorLoading(error.message);
      } else if (data && data.data) {
        setClients(data.data);
      } else {
        console.log("No data found on Supabase. Seeding with initial data.");
        setClients(initialClientsData);
        const { error: insertError } = await supabase
          .from('app_data')
          .insert({ id: 1, data: initialClientsData });
        if (insertError) {
          console.error('Error saving initial data to Supabase:', insertError.message);
          setErrorLoading(insertError.message);
        }
      }
      setIsLoadingData(false);
    };

    fetchData();
  }, [session, profile]);

  // Save data to Supabase on change (debounced)
  const debouncedClients = useDebounce(clients, 1500);
  const isReadOnly = profile?.role === 'user';


  useEffect(() => {
    if (debouncedClients === null || isLoadingData || !session || !profile?.is_approved || isReadOnly) {
      return;
    }

    if (JSON.stringify(debouncedClients) === JSON.stringify(initialClientsData)) {
      // Avoid saving initial data seed if no changes were made
      const hasChangedFromInitial = localStorage.getItem('data_has_changed');
      if (!hasChangedFromInitial) return;
    }

    localStorage.setItem('data_has_changed', 'true');

    const saveData = async () => {
      setIsSavingData(true);
      const { error } = await supabase
        .from('app_data')
        .upsert({ id: 1, data: debouncedClients });

      if (error) {
        console.error('Error saving data to Supabase:', error.message);
        setNotification({ message: 'Erro ao salvar dados!', type: 'error' });
      }
      setIsSavingData(false);
    };

    saveData();
  }, [debouncedClients, isLoadingData, session, profile, isReadOnly]);
  

  const toggleTheme = () => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error logging out:', error);
      setNotification({ message: 'Erro de comunicação ao sair.', type: 'error' });
    }

    // Force a UI logout by clearing all session-related state.
    // This provides immediate feedback and handles offline cases.
    setSession(null);
    setProfile(null);
    setClients(null);
    setSelectedClientId(null);
  };

  const handleAddContract = ({ clientName, address, cep, clientId, contractData }: { clientName?: string; address?: string; cep?: string; clientId?: number; contractData: Omit<Contract, 'id' | 'items' | 'commitments' | 'invoices'> }) => {
    if (!clients) return;

    const newContract: Contract = {
      id: Date.now(),
      ...contractData,
      items: [],
      commitments: [],
      invoices: [],
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
        const newClient: Client = {
          id: Date.now(),
          name: clientName,
          uasg: contractData.uasg || '',
          cnpj: contractData.cnpj,
          address: address,
          cep: cep,
          contracts: [newContract],
        };
        newClients.push(newClient);
      }
    }
    setClients(newClients);
    setNotification({ message: 'Contrato salvo com sucesso!', type: 'success' });
    setIsAddingContract(false);
  };
  
  const handleUpdateClient = (clientId: number, updatedData: Partial<Client>) => {
    setClients(prev => prev?.map(c => c.id === clientId ? { ...c, ...updatedData } : c) || null);
    setNotification({ message: 'Cliente atualizado com sucesso!', type: 'success' });
  };
  
  const handleDeleteClient = (clientId: number) => {
    setClients(prev => prev?.filter(c => c.id !== clientId) || null);
    setSelectedClientId(null);
    setNotification({ message: 'Cliente excluído com sucesso!', type: 'success' });
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
    setNotification({ message: 'Contrato atualizado!', type: 'success' });
  };

  const handleDeleteContract = (clientId: number, contractId: number) => {
     setClients(prev => prev?.map(c => {
      if (c.id === clientId) {
        return { ...c, contracts: c.contracts.filter(ct => ct.id !== contractId) };
      }
      return c;
    }) || null);
    setNotification({ message: 'Contrato excluído!', type: 'success' });
  };

  const handleAddItem = (clientId: number, contractId: number, newItem: Omit<ContractItem, 'id'>) => {
    setClients(prev => prev?.map(c => {
      if (c.id === clientId) {
        return { ...c, contracts: c.contracts.map(ct => {
          if (ct.id === contractId) {
            const newFullItem: ContractItem = { id: Date.now(), ...newItem };
            return { ...ct, items: [...ct.items, newFullItem] };
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
            return { ...ct, items: ct.items.filter(item => item.id !== itemId) };
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
            const newFullCommitment: Commitment = { id: Date.now(), ...newCommitment };
            return { ...ct, commitments: [...ct.commitments, newFullCommitment] };
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
            const newFullInvoice: Invoice = { id: Date.now(), ...newInvoice, isPaid: false };
            return { ...ct, invoices: [...ct.invoices, newFullInvoice] };
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
    if (!clients) {
      setNotification({ message: 'Não há dados para exportar.', type: 'error' });
      return;
    }
    try {
      const dataStr = JSON.stringify(clients, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `backup_oficina_da_arte_${new Date().toISOString().split('T')[0]}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      setNotification({ message: 'Backup criado com sucesso!', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Falha ao criar o backup.', type: 'error' });
      console.error(error);
    }
  };

  const handleFileSelectForRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const parsedData = JSON.parse(text);
            // Basic validation can be improved
            if (Array.isArray(parsedData) && parsedData.every(c => 'id' in c && 'name' in c && 'contracts' in c)) {
              setBackupDataToRestore(parsedData);
              setIsRestoreConfirmOpen(true);
            } else {
              throw new Error('Formato do arquivo de backup inválido.');
            }
          }
        } catch (error) {
          console.error("Restore error:", error);
          setNotification({ message: 'Erro ao ler o arquivo de backup. Verifique se o arquivo é válido.', type: 'error' });
        }
      };
      reader.readAsText(file);
    }
     // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };

  const handleConfirmRestore = () => {
    if (backupDataToRestore) {
      setClients(backupDataToRestore);
      setNotification({ message: 'Dados restaurados com sucesso!', type: 'success' });
    }
    setIsRestoreConfirmOpen(false);
    setBackupDataToRestore(null);
  };

  // Memoized data for Dashboard
  const { dashboardContracts, dashboardCommitments, dashboardInvoices, globalSummary, availableYears } = useMemo(() => {
    if (!clients) return { dashboardContracts: [], dashboardCommitments: [], dashboardInvoices: [], globalSummary: { totalBidValue: 0, totalCommittedValue: 0, totalSuppliedValue: 0, balanceToSupplyValue: 0, totalToReceiveValue: 0 }, availableYears: [] };

    let filteredContracts = clients.flatMap(c => c.contracts.map(ct => ({ ...ct, clientName: c.name, clientId: c.id })));
    const years = [...new Set(filteredContracts.map(c => new Date(c.creationDate).getFullYear()))].sort((a,b) => b-a);

    if (filterYear !== 'all') {
      filteredContracts = filteredContracts.filter(c => new Date(c.creationDate).getFullYear() === parseInt(filterYear));
    }
    if (filterMonth !== 'all') {
      filteredContracts = filteredContracts.filter(c => new Date(c.creationDate).getMonth() + 1 === parseInt(filterMonth));
    }

    const dContracts: DashboardContract[] = filteredContracts;
    
    const dCommitments: DashboardCommitment[] = [];
    const dInvoices: DashboardInvoice[] = [];
    
    clients.forEach(client => {
      client.contracts.forEach(contract => {
        // Only include commitments from filtered contracts
        if (dContracts.some(dc => dc.id === contract.id)) {
            contract.commitments.forEach(commitment => {
                 const totalCommittedForItems = commitment.items.reduce((sum, item) => sum + item.quantity, 0);
                 const totalSuppliedForItems = contract.invoices.reduce((sum, inv) => 
                     sum + inv.items
                         .filter(invItem => commitment.items.some(cItem => cItem.contractItemId === invItem.contractItemId))
                         .reduce((invSum, invItem) => invSum + invItem.quantitySupplied, 0)
                 , 0);
                
                 dCommitments.push({
                     ...commitment,
                     clientName: client.name,
                     biddingId: contract.biddingId,
                     clientId: client.id,
                     contractId: contract.id,
                     contractItems: contract.items,
                     isPending: totalCommittedForItems > totalSuppliedForItems,
                     allContractCommitments: contract.commitments,
                     allContractInvoices: contract.invoices
                 });
            });

            contract.invoices.forEach(invoice => {
                 dInvoices.push({
                     ...invoice,
                     clientName: client.name,
                     biddingId: contract.biddingId,
                     contractItems: contract.items,
                     clientId: client.id,
                     contractId: contract.id
                 });
            });
        }
      });
    });

    // Global summary should be calculated on ALL data, not filtered data
    const summary: GlobalSummaryData = { totalBidValue: 0, totalCommittedValue: 0, totalSuppliedValue: 0, balanceToSupplyValue: 0, totalToReceiveValue: 0 };
    clients.forEach(c => c.contracts.forEach(ct => {
        // FIX: Coerce values to numbers to prevent arithmetic errors if data is string-based.
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
  
  // Render Logic
  if (isAuthLoading) {
    return <div className="min-h-screen flex justify-center items-center bg-gray-900"><SpinnerIcon className="w-10 h-10 text-yellow-500 animate-spin" /></div>;
  }

  if (!session) {
    return <LoginPage supabaseClient={supabase} />;
  }
  
  if (!profile) {
     return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white p-4 text-center">
            <HourglassIcon className="w-12 h-12 text-yellow-500 mb-4" />
            <h1 className="text-xl font-bold mb-2">Carregando perfil...</h1>
            <p className="text-gray-400 max-w-md">{authError || 'Aguarde um momento enquanto buscamos seus dados. Se esta tela persistir, tente recarregar a página.'}</p>
             {authError && (
                 <button onClick={handleLogout} className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Sair e Tentar Novamente</button>
             )}
        </div>
    );
  }

  if (!profile.is_approved) {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gray-900 text-white p-4 text-center">
            <HourglassIcon className="w-12 h-12 text-yellow-500 mb-4" />
            <h1 className="text-xl font-bold mb-2">Aguardando Aprovação</h1>
            <p className="text-gray-400 max-w-md">Sua conta foi criada com sucesso, mas ainda precisa ser aprovada por um administrador. Você será notificado por e-mail quando seu acesso for liberado.</p>
            <button onClick={handleLogout} className="mt-6 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg">Sair</button>
        </div>
    );
  }

  if (isLoadingData || clients === null) {
    return <div className="min-h-screen flex justify-center items-center bg-gray-900"><SpinnerIcon className="w-10 h-10 text-yellow-500 animate-spin" /></div>;
  }
  
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-black text-gray-800 dark:text-gray-200">
      <header className="bg-slate-50 dark:bg-gray-900 shadow-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
               <LogoPlaceholder className="h-10 w-10" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white font-title hidden sm:block">Oficina da Arte</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
               {isSavingData && <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><SpinnerIcon className="w-4 h-4 animate-spin" /><span>Salvando...</span></div>}
               <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  {theme === 'light' ? <MoonIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300" /> : <SunIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300" />}
               </button>
               {!isReadOnly && <BackupButton onBackup={handleBackup} />}
               {!isReadOnly && <RestoreButton onRestore={handleFileSelectForRestore} />}
               {profile.role === 'admin' && (
                  <button onClick={() => setIsAdminPanelOpen(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Painel do Administrador">
                    <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300" />
                  </button>
                )}
               <button onClick={handleLogout} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Sair">
                  <ArrowRightOnRectangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300" />
               </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {selectedClient ? (
          <ClientDetail 
            client={selectedClient}
            isReadOnly={isReadOnly}
            onBack={() => setSelectedClientId(null)}
            onDeleteItem={handleDeleteItem}
            onDeleteContract={handleDeleteContract}
            onDeleteClient={handleDeleteClient}
            onDeleteCommitment={handleDeleteCommitment}
            onDeleteInvoice={handleDeleteInvoice}
            onAddItem={handleAddItem}
            onAddContract={handleAddContract}
            onUpdateContract={handleUpdateContract}
            onUpdateClient={handleUpdateClient}
            onAddCommitment={handleAddCommitment}
            onAddInvoice={handleAddInvoice}
            onMarkInvoiceAsPaid={handleMarkInvoiceAsPaid}
            onMarkInvoiceAsUnpaid={handleMarkInvoiceAsUnpaid}
          />
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
              {!isReadOnly && (
                <button
                  onClick={() => setIsAddingContract(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-transform duration-200 hover:scale-105"
                >
                  <PlusIcon className="w-5 h-5" />
                  Novo Cliente / Contrato
                </button>
              )}
            </div>
            <Dashboard 
                clients={clients}
                contracts={dashboardContracts}
                commitments={dashboardCommitments}
                invoices={dashboardInvoices}
                onSelectClient={setSelectedClientId}
                globalSummary={globalSummary}
                filterYear={filterYear}
                setFilterYear={setFilterYear}
                filterMonth={filterMonth}
                setFilterMonth={setFilterMonth}
                availableYears={availableYears}
                onMarkInvoiceAsPaid={handleMarkInvoiceAsPaid}
                onMarkInvoiceAsUnpaid={handleMarkInvoiceAsUnpaid}
                onDeleteCommitment={handleDeleteCommitment}
                onDeleteInvoice={handleDeleteInvoice}
                isReadOnly={isReadOnly}
            />
          </div>
        )}
      </main>

      {isAddingContract && <AddContractModal clients={clients} onClose={() => setIsAddingContract(false)} onAddContract={handleAddContract} />}
      {isAdminPanelOpen && <AdminPanel supabase={supabase} onClose={() => setIsAdminPanelOpen(false)} />}
      <ConfirmUpdateModal
        isOpen={isRestoreConfirmOpen}
        onClose={() => setIsRestoreConfirmOpen(false)}
        onConfirm={handleConfirmRestore}
        title="Confirmar Restauração"
        message={
            <>
                <p className="mb-2">Você tem certeza que deseja restaurar os dados a partir do arquivo selecionado?</p>
                <p className="font-bold text-red-500">Atenção: Todos os dados atuais no sistema serão permanentemente substituídos. Esta ação não pode ser desfeita.</p>
            </>
        }
        confirmText="Sim, Restaurar Dados"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
       {notification && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-lg shadow-lg text-white animate-fade-in-up ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}