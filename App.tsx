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
    const [impersonatingOrg, setImpersonatingOrg] = useState<Organization | null>(null);


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

    // Derived states for impersonation
    const effectiveUserProfile = useMemo<UserData | null>(() => {
        if (impersonatingOrg && userProfile?.role === UserRole.SUPER_ADMIN) {
            return {
                ...userProfile,
                role: UserRole.ADMIN, // Act as an Admin within the org
                organizationId: impersonatingOrg.id,
            };
        }
        return userProfile;
    }, [userProfile, impersonatingOrg]);

    const effectiveOrganization = useMemo<Organization | null>(() => {
        return impersonatingOrg || organization;
    }, [impersonatingOrg, organization]);

    const handleImpersonate = useCallback((org: Organization) => {
        if (userProfile?.role !== UserRole.SUPER_ADMIN) return;
        setLoading(true);
        // Clear old data
        setBudgets([]); setClients([]); setContacts([]); setProspects([]);
        setStages([]); setReminders([]); setUsers([]);
        
        setImpersonatingOrg(org);
        setActiveView('dashboard');
        setViewKey(prev => prev + 1);
    }, [userProfile]);

    const handleExitImpersonation = useCallback(() => {
        setLoading(true);
        setImpersonatingOrg(null);
        // Clear org data
        setBudgets([]); setClients([]); setContacts([]); setProspects([]);
        setStages([]); setReminders([]); setUsers([]);
        
        setActiveView('organizations');
        setViewKey(prev => prev + 1);
    }, []);

    // Fetch user profile and organization
    useEffect(() => {
        const fetchUserData = async () => {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const profile = { id: userDocSnap.id, ...userDocSnap.data() } as UserData;
                setUserProfile(profile);

                if (profile.role === UserRole.SUPER_ADMIN) {
                    return;
                }

                if (profile.organizationId) {
                    const orgDocRef = doc(db, "organizations", profile.organizationId);
                    const orgDocSnap = await getDoc(orgDocRef);
                    if (orgDocSnap.exists()) {
                        setOrganization({ id: orgDocSnap.id, ...orgDocSnap.data() } as Organization);
                    } else {
                        console.error("Organization not found!");
                        await signOut(auth);
                    }
                } else {
                    console.error("User is not a super admin and has no organizationId!");
                    await signOut(auth);
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
        if (!effectiveUserProfile) return;
    
        let unsubscribers: (() => void)[] = [];
    
        const subscribeToCollection = (collectionName: string, setState: React.Dispatch<any>, customQuery?: any) => {
            const q = customQuery || query(collection(db, collectionName), where("organizationId", "==", effectiveUserProfile.organizationId));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setState(data);
            }, (error) => {
                console.error(`Error fetching ${collectionName}: `, error);
            });
            unsubscribers.push(unsubscribe);
        };
    
        if (userProfile?.role === UserRole.SUPER_ADMIN && !impersonatingOrg) {
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
                 }, (error) => {
                    console.error(`Error fetching all ${c.name}: `, error);
                 });
                unsubscribers.push(unsubscribe);
            });
            setLoading(false);
        } else if (effectiveOrganization) {
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
    }, [userProfile, impersonatingOrg, effectiveOrganization, effectiveUserProfile]);


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
        // Fecha a sidebar em telas móveis após a seleção de um item do menu
        if (window.innerWidth < 768) { // O ponto de quebra 'md' do Tailwind é 768px
            setSidebarOpen(false);
        }
    };

    // Check for upcoming reminders & notifications
    useEffect(() => {
        if (loading || !effectiveUserProfile) return;

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
    }, [budgets, clients, reminders, activeReminder, loading, effectiveUserProfile]);

    const handleLogout = async () => {
        if (window.confirm("Deseja realmente sair?")) {
            if (impersonatingOrg) {
                handleExitImpersonation();
            }
            await signOut(auth);
        }
    };
    
    // --- Data Handlers (Firestore interactions) ---

    const handleAddBudget = async (
        budgetData: Omit<Budget, 'id' | 'followUps' | 'status' | 'userId' | 'organizationId' | 'clientId' | 'contactId'>,
        clientInfo: { existingId?: string; newClientData?: Omit<Client, 'id' | 'userId' | 'organizationId'> },
        contactInfo: { existingId?: string; newContactData?: Omit<Contact, 'id' | 'clientId' | 'organizationId'> }
    ) => {
        if (!effectiveUserProfile || !effectiveOrganization) return;
        let clientId = clientInfo.existingId;
        if (clientInfo.newClientData) {
            const newClient = { ...clientInfo.newClientData, userId: effectiveUserProfile.id, organizationId: effectiveOrganization.id };
            const clientRef = await addDoc(collection(db, "clients"), newClient);
            clientId = clientRef.id;
        }

        if (!clientId) return;

        let contactId = contactInfo.existingId;
        if (contactInfo.newContactData) {
            const newContact = { ...contactInfo.newContactData, clientId, organizationId: effectiveOrganization.id };
            const contactRef = await addDoc(collection(db, "contacts"), newContact);
            contactId = contactRef.id;
        }

        const newBudget: Omit<Budget, 'id'> = {
            ...budgetData,
            userId: effectiveUserProfile.id,
            organizationId: effectiveOrganization.id,
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
        if (!effectiveUserProfile || !effectiveOrganization) return;
        const initialStage = stages.find(s => s.order === 0);
        if (!initialStage) return alert("Nenhuma etapa inicial de prospecção configurada.");
        const newProspect: Omit<Prospect, 'id'> = {
            ...prospectData,
            userId: effectiveUserProfile.id,
            organizationId: effectiveOrganization.id,
            stageId: initialStage.id,
            createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, 'prospects'), newProspect);
    };

    const handleUpdateProspectStage = async (prospectId: string, newStageId: string) => {
        await updateDoc(doc(db, 'prospects', prospectId), { stageId: newStageId });
    };

    const handleDeleteProspect = async (prospectId: string) => {
        if (window.confirm("Tem certeza que deseja marcar este prospect como perdido? Esta ação não pode ser desfeita.")) {
            await deleteDoc(doc(db, 'prospects', prospectId));
        }
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
        if (!effectiveUserProfile || !effectiveOrganization) return;
        const newClient = { ...clientData, userId: effectiveUserProfile.id, organizationId: effectiveOrganization.id };
        const clientRef = await addDoc(collection(db, 'clients'), newClient);
        
        if(contactData) {
            const newContact = { ...contactData, clientId: clientRef.id, organizationId: effectiveOrganization.id };
            await addDoc(collection(db, 'contacts'), newContact);
        }
    };

    const handleUpdateClient = async (clientId: string, updates: Partial<Client>, logoFile?: File) => {
        if (!effectiveOrganization) return;
        let finalUpdates = { ...updates };
        if (logoFile) {
            const storageRef = ref(storage, `organizations/${effectiveOrganization.id}/logos/${clientId}_${logoFile.name}`);
            await uploadBytes(storageRef, logoFile);
            finalUpdates.logoUrl = await getDownloadURL(storageRef);
        }
        await updateDoc(doc(db, "clients", clientId), finalUpdates);
    };

    const handleSaveOrganization = async (orgUpdate: Partial<Omit<Organization, 'id'>>, logoFile?: File) => {
        if(!effectiveOrganization) return;
        let finalUpdate = { ...orgUpdate };
        if (logoFile) {
            const storageRef = ref(storage, `organizations/${effectiveOrganization.id}/logos/org_logo_${logoFile.name}`);
            await uploadBytes(storageRef, logoFile);
            finalUpdate.logoUrl = await getDownloadURL(storageRef);
        }
        await updateDoc(doc(db, "organizations", effectiveOrganization.id), finalUpdate);
    };

    const handleAddUserInvite = async (email: string, role: UserRole) => {
        if (!effectiveOrganization) return;
        const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()), where('organizationId', '==', effectiveOrganization.id));
        const existingUsers = await getDocs(q);
        if (!existingUsers.empty) {
            alert('Um usuário com este e-mail já existe nesta organização.');
            return;
        }
        await addDoc(collection(db, 'invites'), {
            email: email.toLowerCase(),
            role,
            organizationId: effectiveOrganization.id,
            status: 'pending'
        });
        alert(`Convite enviado para ${email}! O usuário pode agora se cadastrar.`);
        setAddUserModalOpen(false);
    };
    
    const handleUpdateUserProfile = async (profileUpdate: Partial<UserProfile>) => {
        if (!userProfile) return;
        await updateDoc(doc(db, "users", userProfile.id), profileUpdate);
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
        if (!effectiveUserProfile || !effectiveOrganization) return;
        const newReminder: Omit<Reminder, 'id'> = {
            ...reminderData,
            userId: effectiveUserProfile.id,
            organizationId: effectiveOrganization.id,
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

    // --- RENDER LOGIC ---

    const MemoizedSidebar = React.memo(Sidebar);

    const renderView = useCallback(() => {
        if (!userProfile || !effectiveUserProfile) return null; 

        if (userProfile.role === UserRole.SUPER_ADMIN && !impersonatingOrg) {
             return <SuperAdminView 
                        organizations={allOrganizations} 
                        users={allUsers} 
                        clients={allClients} 
                        budgets={allBudgets} 
                        onImpersonate={handleImpersonate} 
                        onToggleStatus={(id, status) => console.log("Toggle", id, status)} 
                        onDelete={(id, name) => console.log("Delete", id, name)} 
                    />;
        }

        switch (activeView) {
            case 'dashboard':
                return <Dashboard budgets={budgets} clients={clients} onSelectBudget={handleSelectBudget} themeVariant={themeVariant} userProfile={effectiveUserProfile} />;
            case 'prospecting':
                return <ProspectingView prospects={prospects} stages={stages} onAddProspectClick={() => setAddProspectModalOpen(true)} onUpdateProspectStage={handleUpdateProspectStage} onConvertProspect={handleConvertProspect} onDeleteProspect={handleDeleteProspect}/>;
            case 'budgeting':
                return <BudgetingView budgets={budgets} clients={clients} contacts={contacts} onSelectBudget={handleSelectBudget} onGenerateReport={(ids) => console.log('generate report', ids)} />;
            case 'deals':
                return <DealsView budgets={budgets} clients={clients} onSelectBudget={handleSelectBudget} onUpdateStatus={handleUpdateBudgetStatus} onScheduleFollowUp={(id, date) => console.log('schedule fup', id, date)} />;
            case 'clients':
                return <ClientsView clients={clients} contacts={contacts} budgets={budgets} onSelectClient={handleSelectClient} onAddClientClick={() => setAddClientModalOpen(true)} />;
            case 'reports':
                return <ReportsView budgets={budgets} clients={clients} userProfile={effectiveUserProfile} onGenerateDailyReport={() => console.log('daily report')} />;
            case 'calendar':
                return <CalendarView budgets={budgets} clients={clients} reminders={reminders} onSelectBudget={handleSelectBudget} onAddReminder={handleAddReminder} />;
            case 'action-plan':
                return <TasksView budgets={budgets} clients={clients} reminders={reminders} onSelectBudget={handleSelectBudget} />;
            case 'map':
                return <MapView clients={clients} />;
            case 'users':
                return <UsersView users={users} onUpdateRole={handleUpdateUserRole} onAddUserClick={() => setAddUserModalOpen(true)} />;
            case 'settings':
                return <AdminSettingsView organization={effectiveOrganization!} userProfile={effectiveUserProfile} stages={stages} users={users} onSaveOrganization={handleSaveOrganization} onUpdateStages={handleUpdateStages} setActiveView={changeView} />;
            default:
                return <Dashboard budgets={budgets} clients={clients} onSelectBudget={handleSelectBudget} themeVariant={themeVariant} userProfile={effectiveUserProfile} />;
        }
    }, [activeView, userProfile, effectiveUserProfile, budgets, clients, contacts, prospects, stages, reminders, users, effectiveOrganization, allOrganizations, allUsers, allClients, allBudgets, themeVariant, impersonatingOrg, handleImpersonate]);

    if (loading || !effectiveUserProfile || (userProfile?.role !== UserRole.SUPER_ADMIN && !organization)) {
        return (
            <div className="w-screen h-screen flex justify-center items-center bg-[var(--background-primary)]">
                <div className="text-center">
                    <svg className="animate-spin h-8 w-8 text-[var(--text-accent)] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-lg font-semibold text-[var(--text-secondary)]">Carregando...</p>
                </div>
            </div>
        );
    }
    
    if (userProfile.role !== UserRole.SUPER_ADMIN && effectiveOrganization?.status === 'suspended') {
        return <SubscriptionView organization={effectiveOrganization} user={user} />;
    }

    return (
        <div className={`flex h-screen bg-[var(--background-primary)] ${themeVariant === 'dashboard' ? 'font-sans' : ''}`}>
            <MemoizedSidebar 
                activeView={activeView}
                setActiveView={changeView}
                isOpen={isSidebarOpen}
                userProfile={effectiveUserProfile}
                organization={effectiveOrganization}
                themeVariant={themeVariant}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                {impersonatingOrg && (
                    <div className="bg-yellow-400 text-yellow-900 font-bold p-2 text-center text-sm z-30 flex justify-center items-center gap-4 flex-shrink-0">
                        <span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 inline-block mr-2"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
                            Você está visualizando como admin da <strong>{impersonatingOrg.name}</strong>.
                        </span>
                        <button
                            onClick={handleExitImpersonation}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-1 px-3 rounded-md text-xs"
                        >
                            Sair da Visualização
                        </button>
                    </div>
                )}
                <Header
                    onAddBudget={() => setAddBudgetModalOpen(true)}
                    onAddProspect={() => setAddProspectModalOpen(true)}
                    onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
                    theme={theme}
                    toggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    notifications={notifications}
                    onNotificationClick={handleSelectBudget}
                    userProfile={effectiveUserProfile}
                    onEditProfile={() => setProfileModalOpen(true)}
                    onSettings={() => setSettingsModalOpen(true)}
                    onLogout={handleLogout}
                    themeVariant={themeVariant}
                    reminders={reminders}
                    onAddReminder={handleAddReminder}
                    onDeleteReminder={handleDeleteReminder}
                    onToggleReminderStatus={handleToggleReminder}
                />
                <main key={viewKey} className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 fade-in">
                    {renderView()}
                </main>
            </div>
            
            {isAddBudgetModalOpen && <AddBudgetModal isOpen={isAddBudgetModalOpen} onClose={() => { setAddBudgetModalOpen(false); setProspectToConvert(null); setInitialClientIdForBudget(null); }} onSave={handleAddBudget} clients={clients} contacts={contacts} prospectData={prospectToConvert ? { clientName: prospectToConvert.company, contactName: prospectToConvert.name, contactInfo: prospectToConvert.email || prospectToConvert.phone || '', clientCnpj: prospectToConvert.cnpj } : null} initialClientId={initialClientIdForBudget} />}
            {isBudgetDetailModalOpen && selectedBudget && <BudgetDetailModal isOpen={isBudgetDetailModalOpen} onClose={() => setBudgetDetailModalOpen(false)} budget={selectedBudget} client={clients.find(c => c.id === selectedBudget.clientId)!} contact={contacts.find(c => c.id === selectedBudget.contactId)} onAddFollowUp={handleAddFollowUp} onChangeStatus={handleUpdateBudgetStatus} onConfirmWin={handleConfirmWin} onUpdateBudget={handleUpdateBudget} />}
            {isAddProspectModalOpen && <AddProspectModal isOpen={isAddProspectModalOpen} onClose={() => setAddProspectModalOpen(false)} onSave={handleAddProspect} />}
            {isClientDetailModalOpen && selectedClient && <ClientDetailModal isOpen={isClientDetailModalOpen} onClose={() => setClientDetailModalOpen(false)} client={selectedClient} contacts={contacts.filter(c => c.clientId === selectedClient.id)} budgets={budgets.filter(b => b.clientId === selectedClient.id)} onSelectBudget={handleSelectBudget} onAddBudgetForClient={(client) => { setInitialClientIdForBudget(client.id); setAddBudgetModalOpen(true); }} onUpdateClient={handleUpdateClient} />}
            {isProfileModalOpen && userProfile && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} onSave={handleUpdateUserProfile} userProfile={userProfile} />}
            {isSettingsModalOpen && <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} currentTheme={theme} setTheme={setTheme} currentThemeVariant={themeVariant} setThemeVariant={setThemeVariant} />}
            {isAddClientModalOpen && <AddClientModal isOpen={isAddClientModalOpen} onClose={() => setAddClientModalOpen(false)} onSave={handleAddClient} />}
            {isAddUserModalOpen && <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setAddUserModalOpen(false)} onAddUser={handleAddUserInvite} />}
            {activeReminder && <ReminderNotification reminder={activeReminder} onDismiss={() => handleDismissReminder(activeReminder.id)} />}
        </div>
    );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="w-screen h-screen flex justify-center items-center bg-[var(--background-primary)]">
                <div className="text-center">
                     <svg className="animate-spin h-8 w-8 text-[var(--text-accent)] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            </div>
        );
    }
    
    return user ? <AuthenticatedApp user={user} /> : <Auth />;
};

export default App;