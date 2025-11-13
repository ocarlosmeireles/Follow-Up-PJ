





import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, getDocs, doc, addDoc, updateDoc, writeBatch, deleteDoc, getDoc, setDoc, query, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Budget, Client, FollowUp, Prospect, ProspectingStage, Contact, Notification, UserProfile, UserData, Invite, Organization, Theme, ThemeVariant, Reminder } from './types';
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
import SubscriptionView from './components/SubscriptionView'; // Import the new view
import AdminSettingsView from './components/AdminSettingsView';
import { auth, db, storage } from './lib/firebase';
import Auth from './components/Auth';
import { generateFollowUpReport } from './lib/reportGenerator';
import AddUserModal from './components/AddUserModal';
import ReminderNotification from './components/ReminderNotification';
import { ExclamationTriangleIcon } from './components/icons';

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

const FullScreenLoader: React.FC<{ message: string }> = ({ message }) => (
     <div className="h-screen w-screen flex justify-center items-center bg-[var(--background-primary)]">
        <div className="text-center">
            <svg className="animate-spin h-10 w-10 text-[var(--accent-primary)] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg font-semibold text-[var(--text-secondary)]">{message}</p>
        </div>
    </div>
);

type ReportDataItem = { budget: Budget; client: Client; contact: Contact; followUps: FollowUp[] };

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('Autenticando...');
    const [activeView, setActiveView] = useState<ActiveView>('dashboard');
    const [viewKey, setViewKey] = useState(0); // Used to re-trigger animations
    
    // Data states for regular users
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [stages, setStages] = useState<ProspectingStage[]>([]);
    const [users, setUsers] = useState<UserData[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    
    // Data states for super admin
    const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [allClients, setAllClients] = useState<Client[]>([]);
    const [allBudgets, setAllBudgets] = useState<Budget[]>([]);

    // Impersonation state
    const [originalUserProfile, setOriginalUserProfile] = useState<UserProfile | null>(null);
    const [impersonatingOrg, setImpersonatingOrg] = useState<Organization | null>(null);

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
        setViewKey(prev => prev + 1); // Trigger animation on view change
    };

    const fetchData = useCallback(async (uid: string, profile: UserProfile) => {
        setLoadingMessage('Carregando dados...');
        if (!profile.organizationId) {
            console.error("User has no organization ID.");
            setLoading(false);
            return;
        }

        const isSuperAdmin = profile.role === UserRole.SUPER_ADMIN;

        // Fetch Organization Info
        if (!isSuperAdmin) {
             const orgDoc = await getDoc(doc(db, "organizations", profile.organizationId));
             if (orgDoc.exists()) {
                setOrganization({ id: orgDoc.id, ...orgDoc.data() } as Organization);
             }
        }
       
        // Define queries
        const budgetsQuery = isSuperAdmin ? collection(db, 'budgets') : query(collection(db, 'budgets'), where('organizationId', '==', profile.organizationId));
        const clientsQuery = isSuperAdmin ? collection(db, 'clients') : query(collection(db, 'clients'), where('organizationId', '==', profile.organizationId));
        const contactsQuery = isSuperAdmin ? collection(db, 'contacts') : query(collection(db, 'contacts'), where('organizationId', '==', profile.organizationId));
        const prospectsQuery = isSuperAdmin ? collection(db, 'prospects') : query(collection(db, 'prospects'), where('organizationId', '==', profile.organizationId));
        const stagesQuery = isSuperAdmin ? collection(db, 'prospectingStages') : query(collection(db, 'prospectingStages'), where('organizationId', '==', profile.organizationId));
        const usersQuery = isSuperAdmin ? collection(db, 'users') : query(collection(db, 'users'), where('organizationId', '==', profile.organizationId));
        const remindersQuery = isSuperAdmin ? collection(db, 'reminders') : query(collection(db, 'reminders'), where('organizationId', '==', profile.organizationId));
        const organizationsQuery = isSuperAdmin ? collection(db, 'organizations') : null;

        const [budgetsSnap, clientsSnap, contactsSnap, prospectsSnap, stagesSnap, usersSnap, remindersSnap, orgsSnap] = await Promise.all([
            getDocs(budgetsQuery),
            getDocs(clientsQuery),
            getDocs(contactsQuery),
            getDocs(prospectsQuery),
            // FIX: Corrected variable from stagesSnap to stagesQuery to prevent using a variable before declaration.
            getDocs(stagesQuery),
            getDocs(usersQuery),
            getDocs(remindersQuery),
            organizationsQuery ? getDocs(organizationsQuery) : Promise.resolve(null),
        ]);

        const budgetData = budgetsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
        const clientData = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        const contactData = contactsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact));
        const prospectData = prospectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prospect));
        const stageData = stagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProspectingStage));
        const userData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
        const reminderData = remindersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
        
        if (isSuperAdmin) {
            setAllBudgets(budgetData);
            setAllClients(clientData);
            setAllUsers(userData);
            if (orgsSnap) {
                setAllOrganizations(orgsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization)));
            }
        } else {
            setBudgets(budgetData);
            setClients(clientData);
            setContacts(contactData);
            setProspects(prospectData);
            setStages(stageData.length > 0 ? stageData : [
                { id: 'stage-1', name: 'Prospect Frio', order: 0, organizationId: profile.organizationId },
                { id: 'stage-2', name: 'Primeiro Contato', order: 1, organizationId: profile.organizationId },
                { id: 'stage-3', name: 'Contato Respondido', order: 2, organizationId: profile.organizationId },
                { id: 'stage-4', name: 'Reunião Agendada', order: 3, organizationId: profile.organizationId },
                { id: 'stage-5', name: 'Proposta Enviada', order: 4, organizationId: profile.organizationId },
                { id: 'stage-6', name: 'Negociação', order: 5, organizationId: profile.organizationId },
                { id: 'stage-7', name: 'Perdido', order: 6, organizationId: profile.organizationId },
            ]);
            setUsers(userData);
            setReminders(reminderData);
        }

    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUser(user);
                setLoadingMessage('Verificando perfil...');
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const profile = userDoc.data() as UserProfile;
                    
                    if (profile.role === UserRole.SUPER_ADMIN && !originalUserProfile) {
                        setUserProfile(profile);
                    } else if (impersonatingOrg && originalUserProfile) {
                         const impersonatedProfile = {
                            ...originalUserProfile,
                            role: UserRole.ADMIN, // Impersonate as admin
                            organizationId: impersonatingOrg.id,
                        };
                        setUserProfile(impersonatedProfile);
                        setOrganization(impersonatingOrg);
                    } else {
                         setUserProfile(profile);
                    }

                    if (userProfile) { // Check if userProfile is set
                       await fetchData(user.uid, userProfile);
                    }
                } else {
                    console.log("No user profile found, logging out.");
                    await signOut(auth);
                }
            } else {
                setUser(null);
                setUserProfile(null);
                setOrganization(null);
                setLoading(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [fetchData, impersonatingOrg, originalUserProfile, userProfile]);
    
    // Check for upcoming reminders
    useEffect(() => {
        const now = new Date();
        const upcomingReminder = reminders.find(r => {
            if (r.isDismissed || r.isCompleted) return false;
            const reminderTime = new Date(r.reminderDateTime);
            return reminderTime <= now;
        });

        if (upcomingReminder && !activeReminder) {
            setActiveReminder(upcomingReminder);
        }
    }, [reminders, activeReminder]);
    
    // Check for notifications
    useEffect(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      const newNotifications: Notification[] = [];
  
      budgets.forEach(b => {
        if (!b.nextFollowUpDate || ![BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP].includes(b.status)) return;
  
        const followUpDate = new Date(b.nextFollowUpDate);
        followUpDate.setHours(0, 0, 0, 0); // Ignore time part for date comparison
  
        const clientName = clients.find(c => c.id === b.clientId)?.name || 'Cliente desconhecido';
  
        if (followUpDate < today) {
          newNotifications.push({
            id: `${b.id}-overdue`,
            type: 'overdue',
            message: `Follow-up atrasado!`,
            budgetId: b.id,
            clientName
          });
        } else if (followUpDate.getTime() === today.getTime()) {
          newNotifications.push({
            id: `${b.id}-today`,
            type: 'today',
            message: `Follow-up para hoje.`,
            budgetId: b.id,
            clientName
          });
        }
      });
  
      setNotifications(newNotifications);
    }, [budgets, clients]);


    // Data handling functions
    const handleAddBudget = async (
        budgetData: Omit<Budget, 'id' | 'followUps' | 'status' | 'userId' | 'organizationId' | 'clientId' | 'contactId'>,
        clientInfo: { existingId?: string; newClientData?: Omit<Client, 'id' | 'userId' | 'organizationId'> },
        contactInfo: { existingId?: string; newContactData?: Omit<Contact, 'id' | 'clientId' | 'organizationId'> }
    ) => {
        if (!user || !userProfile) return;

        let clientId = clientInfo.existingId;
        if (clientInfo.newClientData) {
            const newClient = { ...clientInfo.newClientData, userId: user.uid, organizationId: userProfile.organizationId };
            const clientRef = await addDoc(collection(db, "clients"), newClient);
            clientId = clientRef.id;
            setClients(prev => [...prev, { id: clientId!, ...newClient }]);
        }

        if (!clientId) return;

        let contactId = contactInfo.existingId;
        if (contactInfo.newContactData) {
            const newContact = { ...contactInfo.newContactData, clientId, organizationId: userProfile.organizationId };
            const contactRef = await addDoc(collection(db, "contacts"), newContact);
            contactId = String(contactRef.id);
            setContacts(prev => [...prev, { id: contactId!, ...newContact }]);
        }

        const newBudget: Omit<Budget, 'id'> = {
            ...budgetData,
            userId: user.uid,
            organizationId: userProfile.organizationId,
            clientId: String(clientId),
            contactId: contactId || null,
            status: BudgetStatus.SENT,
            followUps: []
        };

        const docRef = await addDoc(collection(db, "budgets"), newBudget);
        setBudgets(prev => [...prev, { id: docRef.id, ...newBudget }]);
    };

    const handleUpdateBudget = async (budgetId: string, updates: Partial<Budget>) => {
        const budgetDocRef = doc(db, "budgets", budgetId);
        await updateDoc(budgetDocRef, updates);

        const updatedBudget = { ...budgets.find(b => b.id === budgetId)!, ...updates };
        
        setBudgets(prev => prev.map(b => b.id === budgetId ? updatedBudget as Budget : b));
        
        if (selectedBudget?.id === budgetId) {
            setSelectedBudget(updatedBudget as Budget);
        }
    };

    const handleAddFollowUp = async (budgetId: string, followUp: Omit<FollowUp, 'id'>, nextFollowUpDate: string | null) => {
        const budget = budgets.find(b => b.id === budgetId);
        if (!budget) return;

        const newFollowUp = { ...followUp, id: `${Date.now()}` };
        const updatedFollowUps = [...budget.followUps, newFollowUp];
        const updatedBudget: Partial<Budget> = { 
            followUps: updatedFollowUps, 
            status: BudgetStatus.FOLLOWING_UP,
            nextFollowUpDate: nextFollowUpDate 
        };

        await updateDoc(doc(db, "budgets", budgetId), updatedBudget);
        setBudgets(prev => prev.map(b => b.id === budgetId ? { ...b, ...updatedBudget } as Budget : b));
    };
    
    const handleConfirmWin = async (budgetId: string, closingValue: number) => {
        const budgetToWin = budgets.find(b => b.id === budgetId);
        if (!budgetToWin || !userProfile) return;

        const batch = writeBatch(db);

        // Partial win logic
        if (closingValue < budgetToWin.value) {
            const lostValue = budgetToWin.value - closingValue;
            
            // Create a new "lost" budget for the remaining value
            const lostPartBudget: Omit<Budget, 'id'> = {
                ...budgetToWin,
                title: `[Perda Parcial] ${budgetToWin.title}`,
                value: lostValue,
                status: BudgetStatus.LOST,
                followUps: [...budgetToWin.followUps, {
                    id: `${Date.now()}`,
                    date: new Date().toISOString(),
                    notes: `Orçamento perdido parcialmente. Valor ganho: ${formatCurrency(closingValue)}. Valor perdido: ${formatCurrency(lostValue)}.`
                }]
            };
            const newLostDocRef = doc(collection(db, "budgets"));
            batch.set(newLostDocRef, lostPartBudget);

            // Update the original budget with the won value
            const wonPartUpdate: Partial<Budget> = {
                value: closingValue,
                status: BudgetStatus.INVOICED,
            };
            const originalDocRef = doc(db, "budgets", budgetId);
            batch.update(originalDocRef, wonPartUpdate);

            await batch.commit();

            // Update local state
            setBudgets(prev => [
                ...prev.map(b => b.id === budgetId ? { ...b, ...wonPartUpdate } as Budget : b),
                { ...lostPartBudget, id: newLostDocRef.id }
            ]);

        } else {
            // Full win or won for more than original value
            const updatedBudget: Partial<Budget> = { status: BudgetStatus.INVOICED, value: closingValue };
            await updateDoc(doc(db, "budgets", budgetId), updatedBudget);
            setBudgets(prev => prev.map(b => b.id === budgetId ? { ...b, ...updatedBudget } as Budget : b));
        }
    };


    const handleUpdateBudgetStatus = async (budgetId: string, status: BudgetStatus) => {
        const updatedBudget: Partial<Budget> = { status };
        await updateDoc(doc(db, "budgets", budgetId), updatedBudget);
        setBudgets(prev => prev.map(b => b.id === budgetId ? { ...b, ...updatedBudget } as Budget : b));
    };

    const handleAddProspect = async (prospectData: Omit<Prospect, 'id' | 'stageId' | 'userId' | 'organizationId' | 'createdAt'>) => {
        if (!user || !userProfile) return;
        const initialStage = stages.find(s => s.order === 0);
        if (!initialStage) {
            alert("Nenhuma etapa inicial de prospecção configurada.");
            return;
        }

        const newProspect: Omit<Prospect, 'id'> = {
            ...prospectData,
            userId: user.uid,
            organizationId: userProfile.organizationId,
            stageId: initialStage.id,
            createdAt: new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, "prospects"), newProspect);
        setProspects(prev => [...prev, { id: docRef.id, ...newProspect }]);
    };
    
    const handleUpdateProspectStage = async (prospectId: string, newStageId: string) => {
        await updateDoc(doc(db, "prospects", prospectId), { stageId: newStageId });
        setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, stageId: newStageId } : p));
    };
    
    const handleUpdateStages = async (updatedStages: ProspectingStage[]) => {
         if (!userProfile) return;
         const batch = writeBatch(db);
         // First, delete stages that are no longer in the list to handle removals
         const updatedStageIds = new Set(updatedStages.map(s => s.id));
         const stagesToDelete = stages.filter(s => !updatedStageIds.has(s.id));
         
         for(const stage of stagesToDelete) {
            const stageRef = doc(db, "prospectingStages", stage.id);
            batch.delete(stageRef);
         }

         // Then, set/update the remaining stages
         updatedStages.forEach(stage => {
            const stageRef = stage.id.startsWith('new-') 
                ? doc(collection(db, "prospectingStages")) 
                : doc(db, "prospectingStages", stage.id);
            batch.set(stageRef, { ...stage, organizationId: userProfile.organizationId }, { merge: true });
         });

         await batch.commit();
         // Refetching might be the simplest way to get new IDs
         await fetchData(user!.uid, userProfile);
    };


    const handleConvertProspect = async (prospectId: string) => {
        const prospect = prospects.find(p => p.id === prospectId);
        if(!prospect) return;
        
        setProspectToConvert(prospect);
        setAddBudgetModalOpen(true);
        
        // After budget is created (or not), remove the prospect
        await deleteDoc(doc(db, "prospects", prospectId));
        setProspects(prev => prev.filter(p => p.id !== prospectId));
    };
    
    const handleAddClient = async (
        clientData: Omit<Client, 'id' | 'userId' | 'organizationId'>,
        contactData?: Omit<Contact, 'id' | 'clientId' | 'organizationId'>
    ) => {
        if (!user || !userProfile) return;
        const batch = writeBatch(db);

        const newClient = { ...clientData, userId: user.uid, organizationId: userProfile.organizationId };
        const newClientRef = doc(collection(db, "clients"));
        batch.set(newClientRef, newClient);
        setClients(prev => [...prev, { id: newClientRef.id, ...newClient }]);
        
        if(contactData) {
            const newContact = { ...contactData, clientId: newClientRef.id, organizationId: userProfile.organizationId };
            const newContactRef = doc(collection(db, "contacts"));
            batch.set(newContactRef, newContact);
            setContacts(prev => [...prev, { id: String(newContactRef.id), ...newContact }]);
        }
        
        await batch.commit();
    };
    
    const handleUpdateClient = async (clientId: string, updates: Partial<Client>, logoFile?: File) => {
        if(!user || !userProfile) return;
        
        let logoUrl = clients.find(c => c.id === clientId)?.logoUrl;

        if(logoFile) {
            const storageRef = ref(storage, `organizations/${userProfile.organizationId}/clients/${clientId}/logo.png`);
            const snapshot = await uploadBytes(storageRef, logoFile);
            logoUrl = await getDownloadURL(snapshot.ref);
        }

        const finalUpdates = { ...updates, logoUrl };
        
        await updateDoc(doc(db, "clients", clientId), finalUpdates);
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...finalUpdates } as Client : c));
    };

     const handleSaveOrganization = async (orgUpdate: Partial<Omit<Organization, 'id'>>, logoFile?: File) => {
         if(!organization || !userProfile) return;

        let logoUrl = organization.logoUrl;

        if(logoFile) {
            const storageRef = ref(storage, `organizations/${userProfile.organizationId}/logo.png`);
            const snapshot = await uploadBytes(storageRef, logoFile);
            logoUrl = await getDownloadURL(snapshot.ref);
        }

        const finalUpdate = { ...orgUpdate, logoUrl };
        await updateDoc(doc(db, "organizations", organization.id), finalUpdate);
        setOrganization(prev => ({...prev, ...finalUpdate } as Organization));
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
        const reportItems: ReportDataItem[] = [];
        selectedIds.forEach(id => {
            const budget = budgets.find(b => b.id === id);
            if (budget) {
                const client = clients.find(c => c.id === budget.clientId);
                const contact = contacts.find(c => c.id === budget.contactId);
                if (client && contact) {
                    reportItems.push({ budget, client, contact, followUps: budget.followUps });
                }
            }
        });

        if (reportItems.length > 0 && userProfile) {
            generateFollowUpReport(`Relatório de Orçamentos`, reportItems, userProfile, organization);
        } else {
            alert('Não foi possível gerar o relatório. Dados de cliente ou contato ausentes para os orçamentos selecionados.');
        }
    };

    const handleGenerateDailyReport = () => {
        if (!userProfile) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyBudgets = budgets.filter(b => b.nextFollowUpDate && new Date(b.nextFollowUpDate).toDateString() === today.toDateString());
        
        const reportItems: ReportDataItem[] = [];
        dailyBudgets.forEach(budget => {
            const client = clients.find(c => c.id === budget.clientId);
            const contact = contacts.find(c => c.id === budget.contactId);
            if (client && contact) {
                reportItems.push({ budget, client, contact, followUps: budget.followUps });
            }
        });

        if (reportItems.length > 0) {
            generateFollowUpReport(`Relatório de Follow-ups de Hoje`, reportItems, userProfile, organization);
        } else {
            alert('Nenhum follow-up agendado para hoje.');
        }
    };

    if (loading) return <FullScreenLoader message={loadingMessage} />;
    if (!user) return <Auth />;
    if (!userProfile) return <FullScreenLoader message="Carregando perfil..." />;
    if (!organization && userProfile.role !== UserRole.SUPER_ADMIN) {
         if (userProfile.organizationId) {
             // Organization is being fetched, show loader
             return <FullScreenLoader message="Carregando organização..." />;
         }
         // Org is invalid or not found, show subscription view
         return <SubscriptionView organization={null} user={user} />;
    }
    if (organization && (organization.status === 'suspended' || organization.subscriptionStatus === 'past_due' || organization.subscriptionStatus === 'unpaid' || organization.subscriptionStatus === 'canceled') && userProfile.role !== UserRole.SUPER_ADMIN && !impersonatingOrg) {
        return <SubscriptionView organization={organization} user={user} />;
    }
    
    const selectedClientBudgets = selectedClient ? budgets.filter(b => b.clientId === selectedClient.id) : [];
    const selectedClientContacts = selectedClient ? contacts.filter(c => c.clientId === selectedClient.id) : [];
    
    return (
        <div className={`flex h-screen overflow-hidden ${themeVariant === 'dashboard' ? 'bg-[var(--background-primary)]' : 'bg-[var(--background-primary)]'}`}>
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
                    onLogout={() => signOut(auth)}
                    themeVariant={themeVariant}
                    reminders={reminders}
                    onAddReminder={async (reminderData) => {
                        if(!user || !userProfile) return;
                        const newReminder = { ...reminderData, userId: user.uid, organizationId: userProfile.organizationId, isDismissed: false, isCompleted: false };
                        const docRef = await addDoc(collection(db, 'reminders'), newReminder);
                        setReminders(prev => [...prev, {id: docRef.id, ...newReminder}]);
                    }}
                    onDeleteReminder={async (reminderId) => {
                        await deleteDoc(doc(db, 'reminders', reminderId));
                        setReminders(prev => prev.filter(r => r.id !== reminderId));
                    }}
                     onToggleReminderStatus={async (reminderId) => {
                        const reminder = reminders.find(r => r.id === reminderId);
                        if(reminder){
                            await updateDoc(doc(db, 'reminders', reminderId), { isCompleted: !reminder.isCompleted });
                            setReminders(prev => prev.map(r => r.id === reminderId ? {...r, isCompleted: !r.isCompleted} : r));
                        }
                    }}
                />
                 <main className={`flex-1 ${activeView === 'deals' ? 'overflow-hidden p-4 sm:p-6' : 'overflow-y-auto p-4 sm:p-6 lg:p-8'}`}>
                    <div key={viewKey} className="fade-in">
                        {activeView === 'dashboard' && <Dashboard budgets={budgets} clients={clients} onSelectBudget={handleSelectBudget} themeVariant={themeVariant} userProfile={userProfile}/>}
                        {activeView === 'deals' && <DealsView budgets={budgets.filter(b => ![BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status))} clients={clients} onSelectBudget={handleSelectBudget} onUpdateStatus={handleUpdateBudgetStatus} onScheduleFollowUp={() => {}}/>}
                        {activeView === 'prospecting' && <ProspectingView prospects={prospects} stages={stages} onAddProspectClick={() => setAddProspectModalOpen(true)} onUpdateProspectStage={handleUpdateProspectStage} onConvertProspect={handleConvertProspect} />}
                        {activeView === 'budgeting' && <BudgetingView budgets={budgets} clients={clients} contacts={contacts} onSelectBudget={handleSelectBudget} onGenerateReport={handleGenerateReport}/>}
                        {activeView === 'clients' && <ClientsView clients={clients} contacts={contacts} budgets={budgets} onSelectClient={handleSelectClient} onAddClientClick={() => setAddClientModalOpen(true)} />}
                        {activeView === 'reports' && <ReportsView budgets={budgets} clients={clients} userProfile={userProfile} onGenerateDailyReport={handleGenerateDailyReport}/>}
                        {activeView === 'calendar' && <CalendarView budgets={budgets} clients={clients} reminders={reminders} onSelectBudget={handleSelectBudget} onAddReminder={async (reminderData) => {
                            if(!user || !userProfile) return;
                            const newReminder = { ...reminderData, userId: user.uid, organizationId: userProfile.organizationId, isDismissed: false, isCompleted: false };
                            const docRef = await addDoc(collection(db, 'reminders'), newReminder);
                            setReminders(prev => [...prev, {id: docRef.id, ...newReminder}]);
                        }}/>}
                        {activeView === 'action-plan' && <TasksView budgets={budgets} clients={clients} reminders={reminders} onSelectBudget={handleSelectBudget}/>}
                        {activeView === 'map' && <MapView clients={clients}/>}
                        {activeView === 'users' && (userProfile.role === 'Admin' || userProfile.role === 'Manager') && <UsersView users={users} onUpdateRole={async (userId, newRole) => {
                            await updateDoc(doc(db, "users", userId), { role: newRole });
                            setUsers(prev => prev.map(u => u.id === userId ? {...u, role: newRole} : u));
                        }} onInviteUserClick={() => setAddUserModalOpen(true)}/>}
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
                        {activeView === 'organizations' && userProfile.role === 'Super Admin' && <SuperAdminView 
                            organizations={allOrganizations} 
                            users={allUsers} 
                            clients={allClients}
                            budgets={allBudgets}
                            onImpersonate={(org) => {
                                setOriginalUserProfile(userProfile);
                                setImpersonatingOrg(org);
                            }}
                            onToggleStatus={async(orgId, currentStatus) => {
                                const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
                                await updateDoc(doc(db, "organizations", orgId), { status: newStatus });
                                setAllOrganizations(prev => prev.map(o => o.id === orgId ? {...o, status: newStatus} : o));
                            }}
                             onDelete={async (orgId, orgName) => {
                                 if(window.confirm(`Tem certeza que deseja DELETAR a organização "${orgName}"? Esta ação é irreversível e removerá todos os dados associados.`)) {
                                    // In a real app, you'd run a cloud function to delete all sub-collections.
                                    // Here we just delete the org doc for simplicity.
                                    await deleteDoc(doc(db, "organizations", orgId));
                                    setAllOrganizations(prev => prev.filter(o => o.id !== orgId));
                                 }
                             }}
                        />}

                    </div>
                </main>
                 {activeReminder && (
                    <ReminderNotification 
                        reminder={activeReminder}
                        onDismiss={async () => {
                             await updateDoc(doc(db, 'reminders', activeReminder.id), { isDismissed: true });
                             setReminders(prev => prev.map(r => r.id === activeReminder.id ? {...r, isDismissed: true} : r));
                             setActiveReminder(null);
                        }}
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
            {userProfile && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} userProfile={userProfile} onSave={async (profileUpdate) => {
                if(!user) return;
                await updateDoc(doc(db, "users", user.uid), profileUpdate as any);
                setUserProfile(prev => ({...prev, ...profileUpdate} as UserProfile));
                setProfileModalOpen(false);
            }}/>}
            <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} currentTheme={theme} setTheme={setTheme} currentThemeVariant={themeVariant} setThemeVariant={setThemeVariant} />
            <AddClientModal isOpen={isAddClientModalOpen} onClose={() => setAddClientModalOpen(false)} onSave={handleAddClient} />
            <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setAddUserModalOpen(false)} onInvite={async(email, role) => {
                if(!userProfile) return;
                 const invitesRef = collection(db, "invites");
                 const q = query(invitesRef, where("email", "==", email), where("organizationId", "==", userProfile.organizationId));
                 const existingInvites = await getDocs(q);

                 if(!existingInvites.empty) {
                    alert('Um convite para este e-mail já foi enviado.');
                    return;
                 }

                 await addDoc(invitesRef, { email, role, organizationId: userProfile.organizationId, status: 'pending' });
                 alert(`Convite enviado para ${email}!`);
                 setAddUserModalOpen(false);
            }}/>
        </div>
    );
};

export default App;