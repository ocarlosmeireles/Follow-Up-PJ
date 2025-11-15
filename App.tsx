import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, query, where, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db } from './lib/firebase';

import type { Budget, Client, FollowUp, Prospect, ProspectingStage, Contact, Notification, UserProfile, UserData, Organization, Theme, ThemeVariant, Reminder, Invite } from './types';
import { BudgetStatus, UserRole } from './types';

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
import AdminSettingsView from './components/AdminSettingsView';
import { generateFollowUpReport } from './lib/reportGenerator';
import AddUserModal from './components/AddUserModal';
import ReminderNotification from './components/ReminderNotification';
import Auth from './components/Auth';
import SubscriptionView from './components/SubscriptionView';

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

const fileToBlob = async (file: File) => {
  return new Blob([new Uint8Array(await file.arrayBuffer())], { type: file.type });
};

const App: React.FC = () => {
    // Auth and loading states
    const [authState, setAuthState] = useState<{ loading: boolean; user: User | null }>({ loading: true, user: null });
    const [currentUserProfile, setCurrentUserProfile] = useState<UserData | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    
    // View states
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');
    const [viewKey, setViewKey] = useState(0); 
    
    // Data states from Firestore
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [users, setUsers] = useState<UserData[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [stages, setStages] = useState<ProspectingStage[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    
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

    // --- Firebase Auth Listener ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            setAuthState({ loading: false, user });
            if (!user) {
                // Clear all data on logout
                setIsDataLoaded(false);
                setCurrentUserProfile(null);
                setOrganization(null);
                setUsers([]);
                setBudgets([]);
                setClients([]);
                setContacts([]);
                setProspects([]);
                setStages([]);
                setReminders([]);
            }
        });
        return () => unsubscribe();
    }, []);

    // --- Firestore Data Listeners ---
    useEffect(() => {
        if (!authState.user) return;

        // Fetch user profile
        const userDocRef = doc(db, "users", authState.user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const userProfileData = { id: docSnap.id, ...docSnap.data() } as UserData;
                setCurrentUserProfile(userProfileData);
                
                // Once we have the profile, fetch organization data
                if (userProfileData.organizationId) {
                    const orgDocRef = doc(db, "organizations", userProfileData.organizationId);
                    const orgDocSnap = await getDoc(orgDocRef);
                    if(orgDocSnap.exists()) {
                         setOrganization({ id: orgDocSnap.id, ...orgDocSnap.data() } as Organization);
                    }
                }

            } else {
                console.error("User profile not found in Firestore!");
                // Handle case where user is authenticated but has no profile
            }
        });

        return () => unsubscribeUser();
    }, [authState.user]);

    useEffect(() => {
        if (!currentUserProfile?.organizationId) return;

        const orgId = currentUserProfile.organizationId;
        setIsDataLoaded(false);

        const collectionsToWatch = {
            users: setUsers,
            clients: setClients,
            contacts: setContacts,
            budgets: setBudgets,
            prospects: setProspects,
            stages: setStages,
            reminders: setReminders,
        };

        const unsubscribers = Object.entries(collectionsToWatch).map(([collectionName, setter]) => {
            const q = query(collection(db, collectionName), where("organizationId", "==", orgId));
            return onSnapshot(q, (querySnapshot) => {
                const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
                setter(data);
            });
        });

        setIsDataLoaded(true); // Mark data as loaded after setting up listeners

        return () => unsubscribers.forEach(unsub => unsub());

    }, [currentUserProfile?.organizationId]);


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
        if (!isDataLoaded) return;

        // Reminders
        const now = new Date();
        const upcomingReminder = reminders.find(r => {
            if (r.isDismissed || r.isCompleted) return false;
            const reminderTime = new Date(r.reminderDateTime);
            return reminderTime <= now;
        });
        if (upcomingReminder && !activeReminder) setActiveReminder(upcomingReminder);

        // Notifications
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
    }, [budgets, clients, reminders, activeReminder, isDataLoaded]);

    const handleInviteUser = async (email: string, role: UserRole) => {
        if (!organization) return;
        try {
            await addDoc(collection(db, "invites"), {
                email: email.toLowerCase(),
                role,
                organizationId: organization.id,
                status: "pending"
            });
            alert(`Convite enviado para ${email}! O usuário poderá se cadastrar com este e-mail.`);
            setAddUserModalOpen(false);
        } catch (error) {
            console.error("Error sending invite:", error);
            alert("Falha ao enviar o convite.");
        }
    };
    
    const handleAddBudget = async (
        budgetData: Omit<Budget, 'id' | 'followUps' | 'status' | 'userId' | 'organizationId' | 'clientId' | 'contactId'>,
        clientInfo: { existingId?: string; newClientData?: Omit<Client, 'id' | 'userId' | 'organizationId'> },
        contactInfo: { existingId?: string; newContactData?: Omit<Contact, 'id' | 'clientId' | 'organizationId'> }
    ) => {
        if (!currentUserProfile || !organization) return;
    
        let clientId = clientInfo.existingId;
        if (clientInfo.newClientData) {
            const newClientData = { ...clientInfo.newClientData, userId: currentUserProfile.id, organizationId: organization.id };
            const docRef = await addDoc(collection(db, 'clients'), newClientData);
            clientId = docRef.id;
        }
    
        if (!clientId) return;
    
        let contactId = contactInfo.existingId;
        if (contactInfo.newContactData) {
            const newContactData = { ...contactInfo.newContactData, clientId, organizationId: organization.id };
            const docRef = await addDoc(collection(db, 'contacts'), newContactData);
            contactId = docRef.id;
        }
        
        const newBudgetData = {
            ...budgetData,
            userId: currentUserProfile.id,
            organizationId: organization.id,
            clientId: String(clientId),
            contactId: contactId || null,
            status: BudgetStatus.SENT,
            followUps: []
        };
        await addDoc(collection(db, 'budgets'), newBudgetData);
    };

    const handleUpdateBudget = async (budgetId: string, updates: Partial<Budget>) => {
        const budgetDocRef = doc(db, "budgets", budgetId);
        await updateDoc(budgetDocRef, updates);
    };

    const handleAddFollowUp = async (budgetId: string, followUp: Omit<FollowUp, 'id'>, nextFollowUpDate: string | null) => {
        const budget = budgets.find(b => b.id === budgetId);
        if (!budget) return;

        const newFollowUp = { ...followUp, id: crypto.randomUUID() };
        const updatedFollowUps = [...budget.followUps, newFollowUp];
        const updatedBudget: Partial<Budget> = { 
            followUps: updatedFollowUps, 
            status: BudgetStatus.FOLLOWING_UP,
            nextFollowUpDate: nextFollowUpDate 
        };
        await handleUpdateBudget(budgetId, updatedBudget);
    };
    
    const handleConfirmWin = async (budgetId: string, closingValue: number) => {
        const budgetToWin = budgets.find(b => b.id === budgetId);
        if (!budgetToWin || !currentUserProfile || !organization) return;
    
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
            delete (lostPartBudget as Partial<Budget>).id; 
    
            await addDoc(collection(db, 'budgets'), lostPartBudget);
            await handleUpdateBudget(budgetId, { value: closingValue, status: BudgetStatus.INVOICED });
    
        } else {
            await handleUpdateBudget(budgetId, { status: BudgetStatus.INVOICED, value: closingValue });
        }
    };

    const handleUpdateBudgetStatus = (budgetId: string, status: BudgetStatus) => {
        handleUpdateBudget(budgetId, { status });
    };

    const handleAddProspect = async (prospectData: Omit<Prospect, 'id' | 'stageId' | 'userId' | 'organizationId' | 'createdAt'>) => {
        if (!currentUserProfile || !organization) return;
        const initialStage = stages.find(s => s.order === 0);
        if (!initialStage) return alert("Nenhuma etapa inicial de prospecção configurada.");
    
        const newProspectData: Omit<Prospect, 'id'> = {
            ...prospectData,
            userId: currentUserProfile.id,
            organizationId: organization.id,
            stageId: initialStage.id,
            createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, 'prospects'), newProspectData);
    };
    
    const handleUpdateProspectStage = async (prospectId: string, newStageId: string) => {
        await updateDoc(doc(db, 'prospects', prospectId), { stageId: newStageId });
    };
    
    const handleUpdateStages = async (updatedStages: ProspectingStage[]) => {
        for (const stage of updatedStages) {
            if (stage.id.startsWith('new-')) {
                const { id, ...newStageData } = stage;
                await addDoc(collection(db, 'stages'), newStageData);
            } else {
                await updateDoc(doc(db, 'stages', stage.id), stage);
            }
        }
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
        if (!currentUserProfile || !organization) return;
        const newClientData = { ...clientData, userId: currentUserProfile.id, organizationId: organization.id };
        const clientDocRef = await addDoc(collection(db, 'clients'), newClientData);
        
        if(contactData) {
            const newContactData = { ...contactData, clientId: clientDocRef.id, organizationId: organization.id };
            await addDoc(collection(db, 'contacts'), newContactData);
        }
    };

    const uploadFile = async (file: File, path: string): Promise<string> => {
        const storage = getStorage();
        const storageRef = ref(storage, path);
        const blob = await fileToBlob(file);
        const snapshot = await uploadBytes(storageRef, blob);
        return await getDownloadURL(snapshot.ref);
    };
    
    const handleUpdateClient = async (clientId: string, updates: Partial<Client>, logoFile?: File) => {
        let finalUpdates = { ...updates };
        if (logoFile && organization) {
            const logoPath = `organizations/${organization.id}/clients/${clientId}/logo-${Date.now()}`;
            const logoUrl = await uploadFile(logoFile, logoPath);
            finalUpdates.logoUrl = logoUrl;
        }
        await updateDoc(doc(db, 'clients', clientId), finalUpdates);
    };

     const handleSaveOrganization = async (orgUpdate: Partial<Omit<Organization, 'id'>>, logoFile?: File) => {
        if(!organization) return;
        let finalUpdate = { ...orgUpdate };
        if (logoFile) {
            const logoPath = `organizations/${organization.id}/logos/org-logo-${Date.now()}`;
            const logoUrl = await uploadFile(logoFile, logoPath);
            finalUpdate.logoUrl = logoUrl;
        }
        await updateDoc(doc(db, 'organizations', organization.id), finalUpdate);
    };
    
    const handleLogout = async () => {
      await signOut(auth);
    };

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

        if (reportItems.length > 0 && currentUserProfile) {
            generateFollowUpReport(`Relatório de Orçamentos`, reportItems as any, currentUserProfile, organization);
        } else {
            alert('Não foi possível gerar o relatório. Dados de cliente ou contato ausentes.');
        }
    };

    const handleGenerateDailyReport = () => {
        if (!currentUserProfile) return;
        const todayStr = new Date().toDateString();
        const dailyBudgets = budgets.filter(b => b.nextFollowUpDate && new Date(b.nextFollowUpDate).toDateString() === todayStr);
        handleGenerateReport(dailyBudgets.map(b => b.id));
        if (dailyBudgets.length === 0) alert('Nenhum follow-up agendado para hoje.');
    };

    const handleAddReminder = async (reminderData: Omit<Reminder, 'id' | 'userId' | 'organizationId' | 'isDismissed' | 'isCompleted'>) => {
        if (!currentUserProfile || !organization) return;
        const newReminder = { ...reminderData, userId: currentUserProfile.id, organizationId: organization.id, isDismissed: false, isCompleted: false };
        await addDoc(collection(db, 'reminders'), newReminder);
    };

    const handleDeleteReminder = async (reminderId: string) => {
        await deleteDoc(doc(db, 'reminders', reminderId));
    };

    const handleToggleReminderStatus = async (reminderId: string) => {
        const reminder = reminders.find(r => r.id === reminderId);
        if (reminder) {
            await updateDoc(doc(db, 'reminders', reminderId), { isCompleted: !reminder.isCompleted });
        }
    };

    const handleDismissReminder = async (reminderId: string) => {
        await updateDoc(doc(db, 'reminders', reminderId), { isDismissed: true });
        setActiveReminder(null);
    };
    
    // --- Render Logic ---
    if (authState.loading) {
        return <div className="flex h-screen w-screen items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">Carregando...</div>;
    }
    if (!authState.user) {
        return <Auth />;
    }
    if (!isDataLoaded || !currentUserProfile || !organization) {
        return <div className="flex h-screen w-screen items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">Carregando dados da organização...</div>;
    }
    if (organization.subscriptionStatus && !['active', 'trial'].includes(organization.subscriptionStatus)) {
        return <SubscriptionView organization={organization} user={authState.user} />
    }
    
    const selectedClientBudgets = selectedClient ? budgets.filter(b => b.clientId === selectedClient.id) : [];
    const selectedClientContacts = selectedClient ? contacts.filter(c => c.clientId === selectedClient.id) : [];
    
    return (
        <div className={`flex h-screen overflow-hidden ${themeVariant === 'dashboard' ? 'bg-[var(--background-primary)]' : 'bg-[var(--background-primary)]'}`}>
            {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}
            <Sidebar activeView={activeView} setActiveView={changeView} isOpen={isSidebarOpen} userProfile={currentUserProfile} organization={organization} themeVariant={themeVariant}/>
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    onAddBudget={() => setAddBudgetModalOpen(true)} 
                    onAddProspect={() => setAddProspectModalOpen(true)}
                    onToggleSidebar={() => setSidebarOpen(prev => !prev)}
                    theme={theme}
                    toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                    notifications={notifications}
                    onNotificationClick={handleSelectBudget}
                    userProfile={currentUserProfile}
                    onEditProfile={() => setProfileModalOpen(true)}
                    onSettings={() => setSettingsModalOpen(true)}
                    onLogout={handleLogout}
                    themeVariant={themeVariant}
                    reminders={reminders}
                    onAddReminder={handleAddReminder}
                    onDeleteReminder={handleDeleteReminder}
                    onToggleReminderStatus={handleToggleReminderStatus}
                />
                 <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div key={viewKey} className="fade-in">
                        {activeView === 'dashboard' && <Dashboard budgets={budgets} clients={clients} onSelectBudget={handleSelectBudget} themeVariant={themeVariant} userProfile={currentUserProfile}/>}
                        {activeView === 'deals' && <DealsView budgets={budgets.filter(b => ![BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status))} clients={clients} onSelectBudget={handleSelectBudget} onUpdateStatus={handleUpdateBudgetStatus} onScheduleFollowUp={() => {}}/>}
                        {activeView === 'prospecting' && <ProspectingView prospects={prospects} stages={stages} onAddProspectClick={() => setAddProspectModalOpen(true)} onUpdateProspectStage={handleUpdateProspectStage} onConvertProspect={handleConvertProspect} />}
                        {activeView === 'budgeting' && <BudgetingView budgets={budgets} clients={clients} contacts={contacts} onSelectBudget={handleSelectBudget} onGenerateReport={handleGenerateReport}/>}
                        {activeView === 'clients' && <ClientsView clients={clients} contacts={contacts} budgets={budgets} onSelectClient={handleSelectClient} onAddClientClick={() => setAddClientModalOpen(true)} />}
                        {activeView === 'reports' && <ReportsView budgets={budgets} clients={clients} userProfile={currentUserProfile} onGenerateDailyReport={handleGenerateDailyReport}/>}
                        {activeView === 'calendar' && <CalendarView budgets={budgets} clients={clients} reminders={reminders} onSelectBudget={handleSelectBudget} onAddReminder={handleAddReminder}/>}
                        {activeView === 'action-plan' && <TasksView budgets={budgets} clients={clients} reminders={reminders} onSelectBudget={handleSelectBudget}/>}
                        {activeView === 'map' && <MapView clients={clients}/>}
                        {activeView === 'users' && (currentUserProfile.role === 'Admin' || currentUserProfile.role === 'Manager') && <UsersView users={users} onUpdateRole={async (userId, newRole) => {
                            await updateDoc(doc(db, "users", userId), { role: newRole });
                        }} onAddUserClick={() => setAddUserModalOpen(true)}/>}
                        {activeView === 'settings' && (currentUserProfile.role === 'Admin' || currentUserProfile.role === 'Manager') && organization && (
                            <AdminSettingsView
                                organization={organization}
                                userProfile={currentUserProfile}
                                stages={stages}
                                users={users}
                                onSaveOrganization={handleSaveOrganization}
                                onUpdateStages={handleUpdateStages}
                                setActiveView={changeView}
                            />
                        )}
                        {activeView === 'organizations' && currentUserProfile.role === UserRole.SUPER_ADMIN && organization && (
                            <SuperAdminView
                                organizations={[organization]}
                                users={users}
                                clients={clients}
                                budgets={budgets}
                                onImpersonate={(org) => alert(`Impersonate not implemented for ${org.name}.`)}
                                onToggleStatus={(orgId, status) => alert(`Toggle status not implemented for ${orgId} (current: ${status}).`)}
                                onDelete={(orgId, orgName) => alert(`Delete not implemented for ${orgId} (${orgName}).`)}
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
            {currentUserProfile && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} userProfile={currentUserProfile} onSave={async (profileUpdate) => {
                await updateDoc(doc(db, "users", currentUserProfile.id), profileUpdate);
                setProfileModalOpen(false);
            }}/>}
            <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} currentTheme={theme} setTheme={setTheme} currentThemeVariant={themeVariant} setThemeVariant={setThemeVariant} />
            <AddClientModal isOpen={isAddClientModalOpen} onClose={() => setAddClientModalOpen(false)} onSave={handleAddClient} />
            <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setAddUserModalOpen(false)} onInviteUser={handleInviteUser}/>
        </div>
    );
};

export default App;
