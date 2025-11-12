import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, doc, addDoc, updateDoc, writeBatch, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import type { Budget, Client, FollowUp, Prospect, ProspectingStage, Contact, Notification, UserProfile } from './types';
import { BudgetStatus } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TasksView from './components/TasksView';
import DealsView from './components/DealsView';
import ProspectingView from './components/ProspectingView';
import CalendarView from './components/CalendarView';
import MapView from './components/MapView';
import ClientsView from './components/ClientsView';
import ReportsView from './components/ReportsView';
import AddBudgetModal from './components/AddBudgetModal';
import BudgetDetailModal from './components/BudgetDetailModal';
import BudgetingView from './components/BudgetingView';
import AddProspectModal from './components/AddProspectModal';
import ClientDetailModal from './components/ClientDetailModal';
import ProfileModal from './components/ProfileModal';
import AddClientModal from './components/AddClientModal';
import { db } from './lib/firebase';


export type ActiveView = 
    | 'dashboard' 
    | 'prospecting' 
    | 'budgeting' 
    | 'deals' 
    | 'tasks' 
    | 'clients' 
    | 'reports' 
    | 'calendar' 
    | 'map';

export type Theme = 'light' | 'dark';

const App: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [prospectingStages, setProspectingStages] = useState<ProspectingStage[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isAddProspectModalOpen, setAddProspectModalOpen] = useState(false);
    const [isAddClientModalOpen, setAddClientModalOpen] = useState(false);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);
    const [newBudgetFromProspect, setNewBudgetFromProspect] = useState<{ clientName: string; contactName: string; contactInfo: string; clientCnpj?: string } | null>(null);
    const [initialClientIdForNewBudget, setInitialClientIdForNewBudget] = useState<string | null>(null);
    const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
    const [selectedClientForDetail, setSelectedClientForDetail] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [theme, setTheme] = useState<Theme>('light');
   
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = storedTheme || (prefersDark ? 'dark' : 'light');
        setTheme(initialTheme);
        if (initialTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        setTheme(prevTheme => {
            const newTheme = prevTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            if (newTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            return newTheme;
        });
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [
                    clientsSnapshot,
                    contactsSnapshot,
                    budgetsSnapshot,
                    prospectsSnapshot,
                    stagesSnapshot,
                    profileDoc,
                ] = await Promise.all([
                    getDocs(collection(db, 'clients')),
                    getDocs(collection(db, 'contacts')),
                    getDocs(collection(db, 'budgets')),
                    getDocs(collection(db, 'prospects')),
                    getDocs(collection(db, 'prospecting_stages')),
                    getDoc(doc(db, "user_profile", "main_profile")),
                ]);

                const clientsData = clientsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Client[];
                const contactsData = contactsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Contact[];
                const budgetsData = budgetsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Budget[];
                const prospectsData = prospectsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Prospect[];
                const stagesData = stagesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as ProspectingStage[];
                
                let profileData: UserProfile | null = null;
                if (profileDoc.exists()) {
                    profileData = profileDoc.data() as UserProfile;
                } else {
                    console.warn("User profile not found in Firestore. Creating a default one.");
                    // Create a default profile if it doesn't exist
                    const defaultProfile: UserProfile = { name: 'Usuário', matricula: '00000', email: 'user@example.com' };
                    await setDoc(doc(db, "user_profile", "main_profile"), defaultProfile);
                    profileData = defaultProfile;
                }

                setClients(clientsData);
                setContacts(contactsData);
                setBudgets(budgetsData);
                setProspects(prospectsData);
                setProspectingStages(stagesData.sort((a,b) => a.order - b.order));
                setUserProfile(profileData);

            } catch (error) {
                console.error("Failed to fetch data from Firebase", error);
                alert("Não foi possível carregar os dados. Verifique o console e sua configuração do Firebase.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);


    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) { // md breakpoint
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
    
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newNotifications: Notification[] = [];

        budgets.forEach(budget => {
            if (budget.nextFollowUpDate && (budget.status === BudgetStatus.SENT || budget.status === BudgetStatus.FOLLOWING_UP)) {
                 const [year, month, day] = budget.nextFollowUpDate!.split('-').map(Number);
                 const followUpDate = new Date(year, month - 1, day);
                
                if (followUpDate < today) {
                    newNotifications.push({
                        id: `overdue-${budget.id}`,
                        type: 'overdue',
                        message: `Follow-up atrasado para ${budget.title}`,
                        budgetId: budget.id,
                        clientName: clientMap.get(budget.clientId) || 'Cliente'
                    });
                } else if (followUpDate.getTime() === today.getTime()) {
                     newNotifications.push({
                        id: `today-${budget.id}`,
                        type: 'today',
                        message: `Follow-up hoje para ${budget.title}`,
                        budgetId: budget.id,
                        clientName: clientMap.get(budget.clientId) || 'Cliente'
                    });
                }
            }
        });
        setNotifications(newNotifications);
    }, [budgets, clientMap]);

    const handleAddBudget = useCallback(async (
        budgetData: Omit<Budget, 'id' | 'followUps' | 'status' | 'clientId' | 'contactId'>,
        clientInfo: { existingId?: string; newClientData?: Omit<Client, 'id'> },
        contactInfo: { existingId?: string; newContactData?: Omit<Contact, 'id' | 'clientId'> }
    ) => {
        let finalClientId = clientInfo.existingId;
        let finalContactId = contactInfo.existingId;

        try {
            if (!finalClientId && clientInfo.newClientData) {
                const newClientRef = await addDoc(collection(db, 'clients'), clientInfo.newClientData);
                finalClientId = newClientRef.id;
                const newClient: Client = { id: finalClientId, ...clientInfo.newClientData };
                setClients(prev => [...prev, newClient]);
            }
            
            if (!finalClientId) throw new Error("Client ID is missing for the budget.");

            if (!finalContactId && contactInfo.newContactData) {
                const contactToInsert = { ...contactInfo.newContactData, clientId: finalClientId };
                const newContactRef = await addDoc(collection(db, 'contacts'), contactToInsert);
                finalContactId = newContactRef.id;
                const newContact: Contact = { id: finalContactId, ...contactToInsert };
                setContacts(prev => [...prev, newContact]);
            }

            if (!finalContactId) throw new Error("Contact ID is missing for the budget.");
            
            const budgetToInsert = {
                ...budgetData,
                clientId: finalClientId,
                contactId: finalContactId,
                status: BudgetStatus.SENT,
                followUps: [],
            };
            
            const newBudgetRef = await addDoc(collection(db, 'budgets'), budgetToInsert);
            const newBudget: Budget = { ...budgetToInsert, id: newBudgetRef.id };
            setBudgets(prev => [...prev, newBudget]);

            setAddModalOpen(false);
            setNewBudgetFromProspect(null);
            setInitialClientIdForNewBudget(null);

        } catch (error) {
            console.error("Error saving budget:", error);
            alert("Falha ao salvar o orçamento.");
        }
    }, []);
    
    const handleUpdateBudgetStatus = useCallback(async (budgetId: string, newStatus: BudgetStatus) => {
        const budget = budgets.find(b => b.id === budgetId);
        if (!budget) return;

        const isFinal = newStatus === BudgetStatus.WON || newStatus === BudgetStatus.LOST;
        const isOnHold = newStatus === BudgetStatus.ON_HOLD;
        const nextFollowUpDate = isFinal || isOnHold ? null : (budget.nextFollowUpDate || new Date().toISOString().split('T')[0]);

        try {
            const budgetRef = doc(db, 'budgets', budgetId);
            await updateDoc(budgetRef, { status: newStatus, nextFollowUpDate: nextFollowUpDate });
            
            setBudgets(prev => prev.map(b => b.id === budgetId ? { ...b, status: newStatus, nextFollowUpDate: nextFollowUpDate } : b));
        } catch (error) {
            console.error("Error updating budget status:", error);
            alert("Falha ao atualizar o status.");
        }
    }, [budgets]);

    const handleAddFollowUp = useCallback(async (budgetId: string, followUp: Omit<FollowUp, 'id'>, nextFollowUpDate: string | null) => {
        const budget = budgets.find(b => b.id === budgetId);
        if (!budget) return;

        const updatedFollowUps = [...(budget.followUps || []), { ...followUp, id: crypto.randomUUID() }];

        try {
            const budgetRef = doc(db, 'budgets', budgetId);

            // Create a sanitized version of the follow-ups array for Firestore.
            // This ensures only plain data is sent, preventing circular structure errors during serialization.
            const plainFollowUps = updatedFollowUps.map(f => ({
                id: f.id,
                date: f.date,
                notes: f.notes,
                ...(f.audioUrl && { audioUrl: f.audioUrl }),
            }));

            await updateDoc(budgetRef, { 
                followUps: plainFollowUps, 
                nextFollowUpDate: nextFollowUpDate,
                status: BudgetStatus.FOLLOWING_UP
            });

            setBudgets(prev => prev.map(b => b.id === budgetId ? { ...b, followUps: updatedFollowUps, nextFollowUpDate, status: BudgetStatus.FOLLOWING_UP } : b));
        } catch (error) {
            console.error("Error adding follow-up:", error);
            alert("Falha ao adicionar follow-up.");
        }
    }, [budgets]);

    const handleChangeStatus = useCallback((budgetId: string, status: BudgetStatus) => {
        handleUpdateBudgetStatus(budgetId, status);
        if (status === BudgetStatus.WON || status === BudgetStatus.LOST) {
            setSelectedBudgetId(null);
        }
    }, [handleUpdateBudgetStatus]);

    const handleAddProspect = useCallback(async (prospectData: Omit<Prospect, 'id' | 'stageId'>) => {
        const firstStage = prospectingStages.find(s => s.order === 0);
        if (!firstStage) {
            alert("Crie uma etapa no funil de prospecção primeiro.");
            return;
        }
        const prospectToInsert = {
            ...prospectData,
            stageId: firstStage.id,
        };
        try {
            const newProspectRef = await addDoc(collection(db, 'prospects'), prospectToInsert);
            const newProspect: Prospect = { ...prospectToInsert, id: newProspectRef.id };
            setProspects(prev => [...prev, newProspect]);
        } catch (error) {
            console.error("Error adding prospect:", error);
            alert("Falha ao adicionar prospect.");
        }
    }, [prospectingStages]);

    const handleUpdateProspectStage = useCallback(async (prospectId: string, newStageId: string) => {
        try {
            const prospectRef = doc(db, 'prospects', prospectId);
            await updateDoc(prospectRef, { stageId: newStageId });
            setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, stageId: newStageId } : p));
        } catch (error) {
            console.error("Error updating prospect stage:", error);
            alert("Falha ao mover o prospect.");
        }
    }, []);
    
    const handleUpdateProspectingStages = useCallback(async (stages: ProspectingStage[]) => {
        try {
            const batch = writeBatch(db);
            const newStageIds = new Set(stages.map(s => s.id));
            const stagesToDelete = prospectingStages.filter(s => !newStageIds.has(s.id));

            stages.forEach(stage => {
                const stageRef = doc(db, 'prospecting_stages', stage.id);
                batch.set(stageRef, stage);
            });

            stagesToDelete.forEach(stage => {
                const stageRef = doc(db, 'prospecting_stages', stage.id);
                batch.delete(stageRef);
            });
            
            await batch.commit();
            setProspectingStages(stages.sort((a,b) => a.order - b.order));
        } catch (error) {
            console.error("Error updating stages:", error);
            alert("Falha ao salvar as etapas.");
        }
    }, [prospectingStages]);
    
    const handleConvertProspect = useCallback(async (prospectId: string) => {
        const prospect = prospects.find(p => p.id === prospectId);
        if (prospect) {
            try {
                await deleteDoc(doc(db, 'prospects', prospectId));
                
                const contactInfo = prospect.phone || prospect.email || '';
                setNewBudgetFromProspect({ 
                    clientName: prospect.company, 
                    contactName: prospect.name, 
                    contactInfo: contactInfo, 
                    clientCnpj: prospect.cnpj 
                });
                setProspects(prev => prev.filter(p => p.id !== prospectId));
                setAddModalOpen(true);
            } catch (error) {
                console.error("Error converting prospect:", error);
                alert("Falha ao converter o prospect.");
            }
        }
    }, [prospects]);

    const handleUpdateProfile = async (newProfile: UserProfile) => {
        try {
            const profileRef = doc(db, 'user_profile', 'main_profile');
            // Explicitly create a plain object to prevent passing any non-serializable data to Firestore.
            const dataToUpdate = {
                name: newProfile.name,
                matricula: newProfile.matricula,
                email: newProfile.email,
            };
            await updateDoc(profileRef, dataToUpdate);
            setUserProfile(newProfile);
            setProfileModalOpen(false);
        } catch(error) {
            console.error("Error updating profile:", error);
            alert("Falha ao atualizar perfil.");
        }
    };

    const handleAddClient = useCallback(async (
        clientData: Omit<Client, 'id'>,
        contactData?: Omit<Contact, 'id' | 'clientId'>
    ) => {
        try {
            const newClientRef = await addDoc(collection(db, 'clients'), clientData);
            const newClient: Client = { ...clientData, id: newClientRef.id };
            setClients(prev => [...prev, newClient]);

            if (contactData && contactData.name) {
                const contactToInsert = { ...contactData, clientId: newClient.id };
                const newContactRef = await addDoc(collection(db, 'contacts'), contactToInsert);
                const newContact: Contact = { ...contactToInsert, id: newContactRef.id };
                setContacts(prev => [...prev, newContact]);
            }
            setAddClientModalOpen(false);
        } catch (error) {
             console.error("Error adding client:", error);
             alert("Falha ao adicionar novo cliente.");
        }
    }, []);

    const selectedBudget = budgets.find(b => b.id === selectedBudgetId);
    const selectedClient = clients.find(c => c.id === selectedBudget?.clientId);
    const selectedContact = contacts.find(c => c.id === selectedBudget?.contactId);
    
    const clientForDetail = clients.find(c => c.id === selectedClientForDetail);

    const openAddBudgetModal = () => {
        setNewBudgetFromProspect(null);
        setInitialClientIdForNewBudget(null);
        setAddModalOpen(true);
    }
    
    const openAddProspectModal = () => setAddProspectModalOpen(true);

    const handleViewChange = (view: ActiveView) => {
        setActiveView(view);
        if(window.innerWidth < 768) { // md breakpoint
            setSidebarOpen(false);
        }
    };

    const handleOpenNewBudgetForClient = (client: Client) => {
        setSelectedClientForDetail(null); // Close the detail modal
        setInitialClientIdForNewBudget(client.id);
        setAddModalOpen(true);
    };

    if (isLoading || !userProfile) {
        return (
            <div className="h-screen w-screen flex justify-center items-center bg-slate-100 dark:bg-slate-900">
                <div className="text-center">
                    <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-slate-300">Carregando dados...</p>
                </div>
            </div>
        );
    }

    const renderActiveView = () => {
        switch (activeView) {
            case 'dashboard':
                return <Dashboard budgets={budgets} clients={clients} onSelectBudget={setSelectedBudgetId} />;
            case 'prospecting':
                return <ProspectingView prospects={prospects} stages={prospectingStages} onAddProspectClick={openAddProspectModal} onUpdateProspectStage={handleUpdateProspectStage} onUpdateStages={handleUpdateProspectingStages} onConvertProspect={handleConvertProspect} />;
            case 'budgeting':
                return <BudgetingView budgets={budgets} clients={clients} contacts={contacts} onSelectBudget={setSelectedBudgetId} />;
            case 'deals':
                return <DealsView budgets={budgets} clients={clients} onSelectBudget={setSelectedBudgetId} onUpdateStatus={handleUpdateBudgetStatus} />;
            case 'tasks':
                return <TasksView budgets={budgets} clients={clients} onSelectBudget={setSelectedBudgetId} />;
            case 'clients':
                return <ClientsView clients={clients} contacts={contacts} budgets={budgets} onSelectClient={setSelectedClientForDetail} onAddClientClick={() => setAddClientModalOpen(true)} />;
            case 'reports':
                return <ReportsView budgets={budgets} clients={clients} />;
            case 'calendar':
                return <CalendarView budgets={budgets} clients={clients} onSelectBudget={setSelectedBudgetId} />;
            case 'map':
                return <MapView clients={clients} />;
            default:
                return <Dashboard budgets={budgets} clients={clients} onSelectBudget={setSelectedBudgetId} />;
        }
    }

    return (
        <div className="h-screen bg-slate-50 flex text-gray-800 dark:bg-slate-900 dark:text-slate-200 overflow-hidden">
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}
            <Sidebar activeView={activeView} setActiveView={handleViewChange} isOpen={isSidebarOpen} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header 
                    onAddBudget={openAddBudgetModal} 
                    onAddProspect={openAddProspectModal} 
                    onToggleSidebar={() => setSidebarOpen(true)}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    notifications={notifications}
                    onNotificationClick={(budgetId) => setSelectedBudgetId(budgetId)}
                    userProfile={userProfile}
                    onEditProfile={() => setProfileModalOpen(true)}
                />
                <main className="p-4 md:p-8 flex-grow bg-slate-100 dark:bg-slate-900 overflow-y-auto">
                    {renderActiveView()}
                </main>
            </div>
            <AddBudgetModal
                isOpen={isAddModalOpen}
                onClose={() => { setAddModalOpen(false); setNewBudgetFromProspect(null); setInitialClientIdForNewBudget(null); }}
                onSave={handleAddBudget}
                clients={clients}
                contacts={contacts}
                prospectData={newBudgetFromProspect}
                initialClientId={initialClientIdForNewBudget}
            />
            <AddProspectModal
                isOpen={isAddProspectModalOpen}
                onClose={() => setAddProspectModalOpen(false)}
                onSave={handleAddProspect}
            />
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                onSave={handleUpdateProfile}
                userProfile={userProfile}
            />
            <AddClientModal
                isOpen={isAddClientModalOpen}
                onClose={() => setAddClientModalOpen(false)}
                onSave={handleAddClient}
            />
            {selectedBudget && selectedClient && selectedContact && (
                <BudgetDetailModal
                    isOpen={!!selectedBudget}
                    onClose={() => setSelectedBudgetId(null)}
                    budget={selectedBudget}
                    client={selectedClient}
                    contact={selectedContact}
                    onAddFollowUp={handleAddFollowUp}
                    onChangeStatus={handleChangeStatus}
                />
            )}
            {clientForDetail && (
                 <ClientDetailModal
                    isOpen={!!clientForDetail}
                    onClose={() => setSelectedClientForDetail(null)}
                    client={clientForDetail}
                    contacts={contacts.filter(c => c.clientId === clientForDetail.id)}
                    budgets={budgets.filter(b => b.clientId === clientForDetail.id)}
                    onSelectBudget={(id) => {
                        setSelectedClientForDetail(null);
                        setSelectedBudgetId(id);
                    }}
                    onAddBudgetForClient={handleOpenNewBudgetForClient}
                />
            )}
        </div>
    );
};

export default App;