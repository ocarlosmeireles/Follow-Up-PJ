import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
// FIX: Imported `getDocs` from 'firebase/firestore' to resolve 'Cannot find name' error.
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from './lib/firebase';
import type { Budget, Client, FollowUp, Prospect, ProspectingStage, Contact, Notification, UserProfile, UserData, Invite, Organization, Theme, ThemeVariant, Reminder } from './types';
import { BudgetStatus, UserRole } from './types';
import Auth from './components/Auth';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DealsView from './components/DealsView';
import ProspectingView from './components/ProspectingView';
import CalendarView from './components/CalendarView';
import TasksView from './components/TasksView';
import MapView from './components/MapView';
import ClientsView from './components/ClientsView';
import ReportsView from './components/ReportsView';
import UsersView from './components/UsersView';
import SuperAdminView from './components/SuperAdminView';
import AddBudgetModal from './components/AddBudgetModal';
import BudgetDetailModal from './components/BudgetDetailModal';
import BudgetingView from './components/BudgetingView';
import AddProspectModal from './components/AddProspectModal';
import ClientDetailModal from './components/ClientDetailModal';
import ProfileModal from './components/ProfileModal';
import SettingsModal from './components/SettingsModal';
import AddClientModal from './components/AddClientModal';
import SubscriptionView from './components/SubscriptionView';
import AdminSettingsView from './components/AdminSettingsView';
import { generateFollowUpReport } from './lib/reportGenerator';
import AddUserModal from './components/AddUserModal';
import ReminderNotification from './components/ReminderNotification';

export type ActiveView = 
    | 'dashboard'
    | 'prospecting' 
    | 'budgeting' 
    | 'deals' 
    | 'clients' 
    | 'reports' 
    | 'calendar'
    | 'action-plan'
    | 'map'
    | 'users'
    | 'settings'
    | 'organizations';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

// --- AUTHENTICATED APP WRAPPER ---
const AuthenticatedApp: React.FC<{ user: User }> = ({ user }) => {
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<UserData | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');
    const [viewKey, setViewKey] = useState(0);

    // Data states
    const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [allClients, setAllClients] = useState<Client[]>([]);
    const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
    
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [stages, setStages] = useState<ProspectingStage[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    
    // UI states
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
    const [themeVariant, setThemeVariant] = useState<ThemeVariant>(() => (localStorage.getItem('themeVariant') as ThemeVariant) || 'dashboard');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
    const [isAddBudgetModalOpen, setAddBudgetModalOpen] = useState(false);
    const [isBudgetDetailModalOpen, setBudgetDetailModalOpen] = useState(false);
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
    const [isAddProspectModalOpen, setAddProspectModalOpen] = useState(false);
    const [prospectToConvert, setProspectToConvert] = useState<Prospect | null>(null);
    const [isClientDetailModalOpen, setClientDetailModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const [isAddClientModalOpen, setAddClientModalOpen] = useState(false);
    const [initialClientIdForBudget, setInitialClientIdForBudget] = useState<string | null>(null);
    const [isAddUserModalOpen, setAddUserModalOpen] = useState(false);

    // Fetch user profile and organization
    useEffect(() => {
        const fetchUserData = async () => {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const profile = { id: userDocSnap.id, ...userDocSnap.data() } as UserData;
                setUserProfile(profile);

                const orgDocRef = doc(db, "organizations", profile.organizationId);
                const orgDocSnap = await getDoc(orgDocRef);
                if (orgDocSnap.exists()) {
                    setOrganization({ id: orgDocSnap.id, ...orgDocSnap.data() } as Organization);
                } else {
                    console.error("Organization not found!");
                }
            } else {
                console.error("User profile not found in Firestore!");
                await signOut(auth);
            }
        };
        fetchUserData();
    }, [user.uid]);

    // Data subscriptions
    useEffect(() => {
        if (!userProfile) return;
    
        let unsubscribers: (() => void)[] = [];
    
        const subscribeToCollection = (collectionName: string, setState: React.Dispatch<any>, customQuery?: any) => {
            const q = customQuery || query(collection(db, collectionName), where("organizationId", "==", userProfile.organizationId));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setState(data);
            });
            unsubscribers.push(unsubscribe);
        };
    
        if (userProfile.role === UserRole.SUPER_ADMIN) {
            setActiveView('organizations');
            const collectionsToFetch = [
                { name: 'organizations', setter: setAllOrganizations },
                { name: 'users', setter: setAllUsers },
                { name: 'clients', setter: setAllClients },
                { name: 'budgets', setter: setAllBudgets },
            ];
            collectionsToFetch.forEach(c => {
                 const unsubscribe = onSnapshot(collection(db, c.name), (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    c.setter(data);
                });
                unsubscribers.push(unsubscribe);
            });
            setLoading(false);
        } else if (organization) {
            subscribeToCollection('budgets', setBudgets);
            subscribeToCollection('clients', setClients);
            subscribeToCollection('contacts', setContacts);
            subscribeToCollection('prospects', setProspects);
            subscribeToCollection('prospectingStages', setStages);
            subscribeToCollection('reminders', setReminders);
            subscribeToCollection('users', setUsers);
            setLoading(false);
        }
    
        return () => unsubscribers.forEach(unsub => unsub());
    }, [userProfile, organization]);


    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', themeVariant);
        localStorage.setItem('themeVariant', themeVariant);
    }, [themeVariant]);

    const changeView = (view: ActiveView) => {
        setActiveView(view);
        setViewKey(prev => prev + 1);
    };

    // Check for upcoming reminders & notifications
    useEffect(() => {
        if (loading || !userProfile) return;

        const now = new Date();
        const upcomingReminder = reminders.find(r => {
            if (r.isDismissed || r.isCompleted) return false;
            const reminderTime = new Date(r.reminderDateTime);
            return reminderTime <= now;
        });
        if (upcomingReminder && !activeReminder) setActiveReminder(upcomingReminder);
        
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const newNotifications: Notification[] = [];
        budgets.forEach(b => {
            if (!b.nextFollowUpDate || ![BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP].includes(b.status)) return;
            const followUpDate = new Date(b.nextFollowUpDate);
            followUpDate.setHours(0, 0, 0, 0);
            const clientName = clients.find(c => c.id === b.clientId)?.name || 'Cliente desconhecido';
            if (followUpDate < today) {
                newNotifications.push({ id: `${b.id}-overdue`, type: 'overdue', message: `Follow-up atrasado!`, budgetId: b.id, clientName });
            } else if (followUpDate.getTime() === today.getTime()) {
                newNotifications.push({ id: `${b.id}-today`, type: 'today', message: `Follow-up para hoje.`, budgetId: b.id, clientName });
            }
        });
        setNotifications(newNotifications);
    }, [budgets, clients, reminders, activeReminder, loading, userProfile]);

    const handleLogout = async () => {
        if (window.confirm("Deseja realmente sair?")) {
            await signOut(auth);
        }
    };
    
    // --- Data Handlers (Firestore interactions) ---

    const handleAddBudget = async (
        budgetData: Omit<Budget, 'id' | 'followUps' | 'status' | 'userId' | 'organizationId' | 'clientId' | 'contactId'>,
        clientInfo: { existingId?: string; newClientData?: Omit<Client, 'id' | 'userId' | 'organizationId'> },
        contactInfo: { existingId?: string; newContactData?: Omit<Contact, 'id' | 'clientId' | 'organizationId'> }
    ) => {
        if (!userProfile || !organization) return;
        let clientId = clientInfo.existingId;
        if (clientInfo.newClientData) {
            const newClient = { ...clientInfo.newClientData, userId: userProfile.id, organizationId: organization.id };
            const clientRef = await addDoc(collection(db, "clients"), newClient);
            clientId = clientRef.id;
        }

        if (!clientId) return;

        let contactId = contactInfo.existingId;
        if (contactInfo.newContactData) {
            const newContact = { ...contactInfo.newContactData, clientId, organizationId: organization.id };
            const contactRef = await addDoc(collection(db, "contacts"), newContact);
            contactId = contactRef.id;
        }

        const newBudget: Omit<Budget, 'id'> = {
            ...budgetData,
            userId: userProfile.id,
            organizationId: organization.id,
            clientId,
            contactId: contactId || null,
            status: BudgetStatus.SENT,
            followUps: []
        };
        await addDoc(collection(db, "budgets"), newBudget);
    };

    const handleUpdateBudget = async (budgetId: string, updates: Partial<Budget>) => {
        await updateDoc(doc(db, "budgets", budgetId), updates);
    };

    const handleAddFollowUp = async (budgetId: string, followUp: Omit<FollowUp, 'id'>, nextFollowUpDate: string | null) => {
        const budget = budgets.find(b => b.id === budgetId);
        if (!budget) return;

        const newFollowUp = { ...followUp, id: crypto.randomUUID() };
        const updatedFollowUps = [...budget.followUps, newFollowUp];
        await updateDoc(doc(db, "budgets", budgetId), {
            followUps: updatedFollowUps,
            status: BudgetStatus.FOLLOWING_UP,
            nextFollowUpDate: nextFollowUpDate
        });
    };

    const handleConfirmWin = async (budgetId: string, closingValue: number) => {
        const budgetToWin = budgets.find(b => b.id === budgetId);
        if (!budgetToWin) return;
    
        if (closingValue < budgetToWin.value) {
            const lostValue = budgetToWin.value - closingValue;
            const lostPartBudget: Omit<Budget, 'id'> = {
                ...budgetToWin,
                title: `[Perda Parcial] ${budgetToWin.title}`,
                value: lostValue,
                status: BudgetStatus.LOST,
                followUps: [...budgetToWin.followUps, {
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                    notes: `Orçamento perdido parcialmente. Valor ganho: ${formatCurrency(closingValue)}. Valor perdido: ${formatCurrency(lostValue)}.`
                }]
            };
            await addDoc(collection(db, 'budgets'), lostPartBudget);
            await updateDoc(doc(db, 'budgets', budgetId), { value: closingValue, status: BudgetStatus.INVOICED });
        } else {
            await updateDoc(doc(db, 'budgets', budgetId), { status: BudgetStatus.INVOICED, value: closingValue });
        }
    };
    
    const handleUpdateBudgetStatus = async (budgetId: string, status: BudgetStatus) => {
        await updateDoc(doc(db, 'budgets', budgetId), { status });
    };

    const handleAddProspect = async (prospectData: Omit<Prospect, 'id' | 'stageId' | 'userId' | 'organizationId' | 'createdAt'>) => {
        if (!userProfile || !organization) return;
        const initialStage = stages.find(s => s.order === 0);
        if (!initialStage) return alert("Nenhuma etapa inicial de prospecção configurada.");
        const newProspect: Omit<Prospect, 'id'> = {
            ...prospectData,
            userId: userProfile.id,
            organizationId: organization.id,
            stageId: initialStage.id,
            createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, 'prospects'), newProspect);
    };

    const handleUpdateProspectStage = async (prospectId: string, newStageId: string) => {
        await updateDoc(doc(db, 'prospects', prospectId), { stageId: newStageId });
    };
    
    const handleUpdateStages = async (updatedStages: ProspectingStage[]) => {
        const batch = [];
        for (const stage of updatedStages) {
            const stageRef = doc(db, 'prospectingStages', stage.id);
            batch.push(setDoc(stageRef, stage, { merge: true }));
        }
        await Promise.all(batch);
    };

    const handleConvertProspect = async (prospectId: string) => {
        const prospect = prospects.find(p => p.id === prospectId);
        if(!prospect) return;
        setProspectToConvert(prospect);
        setAddBudgetModalOpen(true);
        await deleteDoc(doc(db, 'prospects', prospectId));
    };

    const handleAddClient = async (
        clientData: Omit<Client, 'id' | 'userId' | 'organizationId'>,
        contactData?: Omit<Contact, 'id' | 'clientId' | 'organizationId'>
    ) => {
        if (!userProfile || !organization) return;
        const newClient = { ...clientData, userId: userProfile.id, organizationId: organization.id };
        const clientRef = await addDoc(collection(db, 'clients'), newClient);
        
        if(contactData) {
            const newContact = { ...contactData, clientId: clientRef.id, organizationId: organization.id };
            await addDoc(collection(db, 'contacts'), newContact);
        }
    };

    const handleUpdateClient = async (clientId: string, updates: Partial<Client>, logoFile?: File) => {
        if (!organization) return;
        let finalUpdates = { ...updates };
        if (logoFile) {
            const storageRef = ref(storage, `organizations/${organization.id}/logos/${clientId}_${logoFile.name}`);
            await uploadBytes(storageRef, logoFile);
            finalUpdates.logoUrl = await getDownloadURL(storageRef);
        }
        await updateDoc(doc(db, "clients", clientId), finalUpdates);
    };

    const handleSaveOrganization = async (orgUpdate: Partial<Omit<Organization, 'id'>>, logoFile?: File) => {
        if(!organization) return;
        let finalUpdate = { ...orgUpdate };
        if (logoFile) {
            const storageRef = ref(storage, `organizations/${organization.id}/logos/org_logo_${logoFile.name}`);
            await uploadBytes(storageRef, logoFile);
            finalUpdate.logoUrl = await getDownloadURL(storageRef);
        }
        await updateDoc(doc(db, "organizations", organization.id), finalUpdate);
    };

    const handleAddUserInvite = async (email: string, role: UserRole) => {
        if (!organization) return;
        const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()), where('organizationId', '==', organization.id));
        const existingUsers = await getDocs(q);
        if (!existingUsers.empty) {
            alert('Um usuário com este e-mail já existe nesta organização.');
            return;
        }
        await addDoc(collection(db, 'invites'), {
            email: email.toLowerCase(),
            role,
            organizationId: organization.id,
            status: 'pending'
        });
        alert(`Convite enviado para ${email}! O usuário pode agora se cadastrar.`);
        setAddUserModalOpen(false);
    };
    
    const handleUpdateUserProfile = async (profileUpdate: Partial<UserProfile>) => {
        await updateDoc(doc(db, "users", userProfile!.id), profileUpdate);
        setProfileModalOpen(false);
    };

    const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
        await updateDoc(doc(db, 'users', userId), { role: newRole });
    };

    const handleToggleReminder = async (reminderId: string) => {
        const reminder = reminders.find(r => r.id === reminderId);
        if (reminder) {
            await updateDoc(doc(db, 'reminders', reminderId), { isCompleted: !reminder.isCompleted });
        }
    };
    
    const handleAddReminder = async (reminderData: Omit<Reminder, 'id' | 'userId' | 'organizationId' | 'isDismissed' | 'isCompleted'>) => {
        if (!userProfile || !organization) return;
        const newReminder: Omit<Reminder, 'id'> = {
            ...reminderData,
            userId: userProfile.id,
            organizationId: organization.id,
            isDismissed: false,
            isCompleted: false
        };
        await addDoc(collection(db, 'reminders'), newReminder);
    };
    
    const handleDeleteReminder = async (reminderId: string) => {
        await deleteDoc(doc(db, 'reminders', reminderId));
    };

    const handleDismissReminder = async (reminderId: string) => {
        await updateDoc(doc(db, 'reminders', reminderId), { isDismissed: true });
        setActiveReminder(null);
    };

     // UI functions
    const handleSelectBudget = (budgetId: string) => {
        const budget = budgets.find(b => b.id === budgetId);
        if (budget) {
            setSelectedBudget(budget);
            setBudgetDetailModalOpen(true);
        }
    };
    
    const handleSelectClient = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        if(client) {
            setSelectedClient(client);
            setClientDetailModalOpen(true);
        }
    };
    
    const handleAddBudgetForClient = (client: Client) => {
        setInitialClientIdForBudget(client.id);
        setClientDetailModalOpen(false);
        setAddBudgetModalOpen(true);
    };
    
     const handleGenerateReport = (selectedIds: string[]) => {
        const reportItems = selectedIds.map(id => {
            const budget = budgets.find(b => b.id === id);
            if (!budget) return null;
            const client = clients.find(c => c.id === budget.clientId);
            const contact = contacts.find(c => c.id === budget.contactId);
            return (client && contact) ? { budget, client, contact, followUps: budget.followUps } : null;
        }).filter(Boolean);

        if (reportItems.length > 0 && userProfile) {
            generateFollowUpReport(`Relatório de Orçamentos`, reportItems as any, userProfile, organization);
        } else {
            alert('Não foi possível gerar o relatório. Dados de cliente ou contato ausentes.');
        }
    };

    const handleGenerateDailyReport = () => {
        if (!userProfile) return;
        const todayStr = new Date().toDateString();
        const dailyBudgets = budgets.filter(b => b.nextFollowUpDate && new Date(b.nextFollowUpDate).toDateString() === todayStr);
        handleGenerateReport(dailyBudgets.map(b => b.id));
        if (dailyBudgets.length === 0) alert('Nenhum follow-up agendado para hoje.');
    };

    // --- RENDER LOGIC ---

    if (loading || !userProfile || !organization) {
        return <div className="h-screen w-screen flex items-center justify-center bg-[var(--background-primary)]">Carregando...</div>;
    }

    if (userProfile.role !== UserRole.SUPER_ADMIN && organization.subscriptionStatus !== 'active' && organization.subscriptionStatus !== 'trial') {
        return <SubscriptionView organization={organization} user={user} />;
    }
    
    const selectedClientBudgets = selectedClient ? budgets.filter(b => b.clientId === selectedClient.id) : [];
    const selectedClientContacts = selectedClient ? contacts.filter(c => c.clientId === selectedClient.id) : [];
    
    return (
        <div className={`flex h-screen overflow-hidden ${themeVariant === 'dashboard' ? 'bg-[var(--background-primary)]' : 'bg-[var(--background-primary)]'}`}>
            {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}
            <Sidebar activeView={activeView} setActiveView={changeView} isOpen={isSidebarOpen} userProfile={userProfile} organization={organization} themeVariant={themeVariant}/>
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    onAddBudget={() => setAddBudgetModalOpen(true)} 
                    onAddProspect={() => setAddProspectModalOpen(true)}
                    onToggleSidebar={() => setSidebarOpen(prev => !prev)}
                    theme={theme}
                    toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                    notifications={notifications}
                    onNotificationClick={handleSelectBudget}
                    userProfile={userProfile}
                    onEditProfile={() => setProfileModalOpen(true)}
                    onSettings={() => setSettingsModalOpen(true)}
                    onLogout={handleLogout}
                    themeVariant={themeVariant}
                    reminders={reminders}
                    onAddReminder={handleAddReminder}
                    onDeleteReminder={handleDeleteReminder}
                    onToggleReminderStatus={handleToggleReminder}
                />
                 <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div key={viewKey} className="fade-in">
                        {activeView === 'dashboard' && <Dashboard budgets={budgets} clients={clients} onSelectBudget={handleSelectBudget} themeVariant={themeVariant} userProfile={userProfile}/>}
                        {activeView === 'deals' && <DealsView budgets={budgets.filter(b => ![BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status))} clients={clients} onSelectBudget={handleSelectBudget} onUpdateStatus={handleUpdateBudgetStatus} onScheduleFollowUp={() => {}}/>}
                        {activeView === 'prospecting' && <ProspectingView prospects={prospects} stages={stages} onAddProspectClick={() => setAddProspectModalOpen(true)} onUpdateProspectStage={handleUpdateProspectStage} onConvertProspect={handleConvertProspect} />}
                        {activeView === 'budgeting' && <BudgetingView budgets={budgets} clients={clients} contacts={contacts} onSelectBudget={handleSelectBudget} onGenerateReport={handleGenerateReport}/>}
                        {activeView === 'clients' && <ClientsView clients={clients} contacts={contacts} budgets={budgets} onSelectClient={handleSelectClient} onAddClientClick={() => setAddClientModalOpen(true)} />}
                        {activeView === 'reports' && <ReportsView budgets={budgets} clients={clients} userProfile={userProfile} onGenerateDailyReport={handleGenerateDailyReport}/>}
                        {activeView === 'calendar' && <CalendarView budgets={budgets} clients={clients} reminders={reminders} onSelectBudget={handleSelectBudget} onAddReminder={handleAddReminder} />}
                        {activeView === 'action-plan' && <TasksView budgets={budgets} clients={clients} reminders={reminders} onSelectBudget={handleSelectBudget}/>}
                        {activeView === 'map' && <MapView clients={clients}/>}
                        {activeView === 'users' && (userProfile.role === 'Admin' || userProfile.role === 'Manager') && <UsersView users={users} onUpdateRole={handleUpdateUserRole} onAddUserClick={() => setAddUserModalOpen(true)}/>}
                        {activeView === 'settings' && (userProfile.role === 'Admin' || userProfile.role === 'Manager') && organization && (
                            <AdminSettingsView
                                organization={organization}
                                userProfile={userProfile}
                                stages={stages}
                                users={users}
                                onSaveOrganization={handleSaveOrganization}
                                onUpdateStages={handleUpdateStages}
                                setActiveView={changeView}
                            />
                        )}
                        {activeView === 'organizations' && userProfile.role === UserRole.SUPER_ADMIN && (
                             <SuperAdminView
                                organizations={allOrganizations}
                                users={allUsers}
                                clients={allClients}
                                budgets={allBudgets}
                                onImpersonate={(org) => alert(`Impersonate not implemented for ${org.name}.`)}
                                onToggleStatus={(orgId, status) => updateDoc(doc(db, 'organizations', orgId), { status: status === 'active' ? 'suspended' : 'active' })}
                                onDelete={(orgId, orgName) => { if(window.confirm(`Tem certeza que quer deletar ${orgName}? Essa ação é irreversível.`)) alert(`Delete not implemented for ${orgId}`)}}
                            />
                        )}
                    </div>
                </main>
                 {activeReminder && (
                    <ReminderNotification 
                        reminder={activeReminder}
                        onDismiss={() => handleDismissReminder(activeReminder.id)}
                    />
                )}
            </div>
            
            {/* Modals */}
            <AddBudgetModal 
                isOpen={isAddBudgetModalOpen} 
                onClose={() => { setAddBudgetModalOpen(false); setProspectToConvert(null); setInitialClientIdForBudget(null); }} 
                onSave={handleAddBudget} 
                clients={clients} 
                contacts={contacts}
                prospectData={prospectToConvert ? { 
                    clientName: prospectToConvert.company, 
                    contactName: prospectToConvert.name, 
                    contactInfo: prospectToConvert.email || prospectToConvert.phone || '',
                    clientCnpj: prospectToConvert.cnpj 
                } : null}
                initialClientId={initialClientIdForBudget}
            />
            {selectedBudget && <BudgetDetailModal isOpen={isBudgetDetailModalOpen} onClose={() => setBudgetDetailModalOpen(false)} budget={selectedBudget} client={clients.find(c => c.id === selectedBudget.clientId)!} contact={contacts.find(c => c.id === selectedBudget.contactId)} onAddFollowUp={handleAddFollowUp} onChangeStatus={handleUpdateBudgetStatus} onConfirmWin={handleConfirmWin} onUpdateBudget={handleUpdateBudget} />}
            <AddProspectModal isOpen={isAddProspectModalOpen} onClose={() => setAddProspectModalOpen(false)} onSave={handleAddProspect} />
            {selectedClient && <ClientDetailModal isOpen={isClientDetailModalOpen} onClose={() => setClientDetailModalOpen(false)} client={selectedClient} contacts={selectedClientContacts} budgets={selectedClientBudgets} onSelectBudget={handleSelectBudget} onAddBudgetForClient={handleAddBudgetForClient} onUpdateClient={handleUpdateClient} />}
            <ProfileModal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} userProfile={userProfile} onSave={handleUpdateUserProfile} />
            <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} currentTheme={theme} setTheme={setTheme} currentThemeVariant={themeVariant} setThemeVariant={setThemeVariant} />
            <AddClientModal isOpen={isAddClientModalOpen} onClose={() => setAddClientModalOpen(false)} onSave={handleAddClient} />
            <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setAddUserModalOpen(false)} onAddUser={handleAddUserInvite} />
        </div>
    );
};

const App: React.FC = () => {
    const [authState, setAuthState] = useState<{ state: 'loading' | 'authenticated' | 'unauthenticated', user: User | null }>({ state: 'loading', user: null });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            if (user) {
                setAuthState({ state: 'authenticated', user });
            } else {
                setAuthState({ state: 'unauthenticated', user: null });
            }
        });
        return () => unsubscribe();
    }, []);

    if (authState.state === 'loading') {
        return <div className="h-screen w-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">Carregando autenticação...</div>;
    }

    if (authState.state === 'unauthenticated' || !authState.user) {
        return <Auth />;
    }
    
    return <AuthenticatedApp user={authState.user} />;
}

export default App;