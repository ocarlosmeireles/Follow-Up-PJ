import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
// FIX: Imported `getDocs` from 'firebase/firestore' to resolve 'Cannot find name' error.
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, setDoc, deleteDoc, getDocs, writeBatch, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from './lib/firebase';
import type { Budget, Client, FollowUp, Prospect, ProspectingStage, Contact, Notification, UserProfile, UserData, Invite, Organization, Theme, ThemeVariant, Reminder, Script, ScriptCategory } from './types';
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
import { BudgetDetailModal } from './components/BudgetDetailModal';
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
import ScriptsView from './components/ScriptsView';
import ScriptModal from './components/ScriptModal';
import { scriptData } from './lib/scripts';


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
    | 'organizations'
    | 'scripts';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

type SearchResult = {
  type: 'client' | 'budget' | 'prospect' | 'contact';
  id: string;
  title: string;
  subtitle: string;
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
    const [scripts, setScripts] = useState<Script[]>([]);
    
    // UI states
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
    const [themeVariant, setThemeVariant] = useState<ThemeVariant>(() => (localStorage.getItem('themeVariant') as ThemeVariant) || 'aurora');
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
    const [isScriptModalOpen, setScriptModalOpen] = useState(false);
    const [scriptToEdit, setScriptToEdit] = useState<Script | null>(null);
    
    // Global Search State
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');
    const [globalSearchResults, setGlobalSearchResults] = useState<SearchResult[]>([]);
    const searchDebounceRef = useRef<number | null>(null);

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
        setStages([]); setReminders([]); setUsers([]); setScripts([]);
        
        setImpersonatingOrg(org);
        setActiveView('dashboard');
        setViewKey(prev => prev + 1);
    }, [userProfile]);

    const handleExitImpersonation = useCallback(() => {
        setLoading(true);
        setImpersonatingOrg(null);
        // Clear org data
        setBudgets([]); setClients([]); setContacts([]); setProspects([]);
        setStages([]); setReminders([]); setUsers([]); setScripts([]);
        
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
            subscribeToCollection('scripts', setScripts);
            setLoading(false);
        }
    
        return () => unsubscribers.forEach(unsub => unsub());
    }, [userProfile, impersonatingOrg, effectiveOrganization, effectiveUserProfile]);

    // Seeding default scripts for new organizations
    useEffect(() => {
        if (loading || !effectiveOrganization || !effectiveUserProfile) return;

        const checkAndSeedScripts = async () => {
            const scriptsQuery = query(collection(db, 'scripts'), where("organizationId", "==", effectiveOrganization.id), limit(1));
            const snapshot = await getDocs(scriptsQuery);

            if (snapshot.empty) {
                console.log(`No scripts found for organization ${effectiveOrganization.id}. Seeding default scripts...`);
                const batch = writeBatch(db);
                scriptData.forEach(category => {
                    category.scripts.forEach(script => {
                        const scriptRef = doc(collection(db, 'scripts'));
                        const newScript: Omit<Script, 'id'> = {
                            organizationId: effectiveOrganization.id,
                            userId: effectiveUserProfile.id,
                            title: script.title,
                            content: script.content,
                            category: category.name as ScriptCategory
                        };
                        batch.set(scriptRef, newScript);
                    });
                });
                try {
                    await batch.commit();
                    console.log("Default scripts seeded successfully.");
                } catch (error) {
                    console.error("Error seeding default scripts:", error);
                }
            }
        };

        checkAndSeedScripts();
    }, [loading, effectiveOrganization, effectiveUserProfile]);


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

    // --- Global Search Logic ---
    const handleGlobalSearch = useCallback((term: string) => {
        setGlobalSearchTerm(term);
    
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }
    
        if (!term.trim()) {
            setGlobalSearchResults([]);
            return;
        }
    
        searchDebounceRef.current = window.setTimeout(() => {
            const lowerTerm = term.toLowerCase();
            const results: SearchResult[] = [];
    
            clients.forEach(c => {
                if (c.name.toLowerCase().includes(lowerTerm) || (c.cnpj && c.cnpj.replace(/\D/g, '').includes(lowerTerm.replace(/\D/g, '')))) {
                    results.push({ type: 'client', id: c.id, title: c.name, subtitle: c.cnpj || 'Cliente' });
                }
            });
    
            budgets.forEach(b => {
                if (b.title.toLowerCase().includes(lowerTerm)) {
                    const clientName = clients.find(c => c.id === b.clientId)?.name;
                    results.push({ type: 'budget', id: b.id, title: b.title, subtitle: `Em ${clientName}` || 'Orçamento' });
                }
            });
            
            prospects.forEach(p => {
                if (p.company.toLowerCase().includes(lowerTerm) || p.name.toLowerCase().includes(lowerTerm)) {
                    results.push({ type: 'prospect', id: p.id, title: p.company, subtitle: `Prospect: ${p.name}` });
                }
            });
    
            contacts.forEach(ct => {
                if (ct.name.toLowerCase().includes(lowerTerm)) {
                    const clientName = clients.find(c => c.id === ct.clientId)?.name;
                    results.push({ type: 'contact', id: ct.clientId, title: ct.name, subtitle: `Contato em ${clientName || 'Cliente'}` });
                }
            });
    
            setGlobalSearchResults(results.slice(0, 10));
        }, 300);
    }, [clients, budgets, prospects, contacts]);
    
    const handleClearSearch = useCallback(() => {
        setGlobalSearchTerm('');
        setGlobalSearchResults([]);
    }, []);

    const handleSearchResultClick = (result: SearchResult) => {
        handleClearSearch();
        
        switch (result.type) {
            case 'client': {
                const client = clients.find(c => c.id === result.id);
                if (client) {
                    setSelectedClient(client);
                    setClientDetailModalOpen(true);
                }
                break;
            }
            case 'budget': {
                const budget = budgets.find(b => b.id === result.id);
                if (budget) {
                    setSelectedBudget(budget);
                    setBudgetDetailModalOpen(true);
                }
                break;
            }
            case 'prospect': {
                changeView('prospecting');
                break;
            }
            case 'contact': {
                const client = clients.find(c => c.id === result.id); // Note: contact search result ID is the clientId
                 if (client) {
                    setSelectedClient(client);
                    setClientDetailModalOpen(true);
                 }
                break;
            }
        }
    };


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

    const handleBulkUpdateBudgets = async (budgetIds: string[], updates: Partial<Budget>) => {
        if (!effectiveOrganization) return;
        const batch = writeBatch(db);
        budgetIds.forEach(id => {
            const budgetRef = doc(db, "budgets", id);
            batch.update(budgetRef, updates);
        });
        try {
            await batch.commit();
        } catch (error) {
            console.error("Error performing bulk update:", error);
            alert("Ocorreu um erro ao atualizar os orçamentos.");
        }
    };

    const handleAddFollowUp = async (budgetId: string, followUp: Omit<FollowUp, 'id'>, nextFollowUpDate: string | null) => {
        const budget = budgets.find(b => b.id === budgetId);
        if (!budget) return;

        const newFollowUp = { ...followUp, id: crypto.randomUUID() };
        const updatedFollowUps = [...budget.followUps, newFollowUp];
        // FIX: Replaced invalid status string 'Budget' with the correct enum value `BudgetStatus.FOLLOWING_UP`.
        await updateDoc(doc(db, "budgets", budgetId), {
            followUps: updatedFollowUps,
            status: BudgetStatus.FOLLOWING_UP,
            nextFollowUpDate: nextFollowUpDate,
        });
    };
    
    const handleConfirmWin = async (budgetId: string, closingValue: number) => {
        await updateDoc(doc(db, "budgets", budgetId), {
            status: BudgetStatus.INVOICED,
            value: closingValue,
            nextFollowUpDate: null
        });
    };

    const handleChangeBudgetStatus = async (budgetId: string, status: BudgetStatus) => {
        await updateDoc(doc(db, "budgets", budgetId), { status });
    };

    const handleAddProspect = async (prospectData: Omit<Prospect, 'id' | 'stageId' | 'userId' | 'organizationId' | 'createdAt'>) => {
        if (!effectiveUserProfile || !effectiveOrganization) return;
        const firstStage = stages.find(s => s.order === 0);
        if (!firstStage) {
            alert("Nenhuma etapa inicial de prospecção configurada. Vá para Configurações > Funil de Prospecção.");
            return;
        }

        const newProspect = {
            ...prospectData,
            userId: effectiveUserProfile.id,
            organizationId: effectiveOrganization.id,
            stageId: firstStage.id,
            createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "prospects"), newProspect);
    };

    const handleUpdateProspectStage = async (prospectId: string, newStageId: string) => {
        await updateDoc(doc(db, "prospects", prospectId), { stageId: newStageId });
    };
    
    const handleConvertProspect = async (prospectId: string) => {
        const prospect = prospects.find(p => p.id === prospectId);
        if (!prospect) return;

        setProspectToConvert(prospect);
        setAddBudgetModalOpen(true);

        // After conversion, delete the prospect
        await deleteDoc(doc(db, "prospects", prospectId));
    };

    const handleDeleteProspect = async (prospectId: string) => {
        if (window.confirm("Tem certeza que deseja marcar este prospect como perdido e removê-lo do funil?")) {
            await deleteDoc(doc(db, "prospects", prospectId));
        }
    };
    
    const handleAddClient = async (clientData: Omit<Client, 'id' | 'userId' | 'organizationId'>, contactData?: Omit<Contact, 'id'|'clientId'|'organizationId'>) => {
        if (!effectiveUserProfile || !effectiveOrganization) return;
        const newClient = { ...clientData, userId: effectiveUserProfile.id, organizationId: effectiveOrganization.id };
        const clientRef = await addDoc(collection(db, 'clients'), newClient);
        if(contactData) {
            const newContact = {...contactData, clientId: clientRef.id, organizationId: effectiveOrganization.id };
            await addDoc(collection(db, 'contacts'), newContact);
        }
    };
    
    const handleUpdateClient = async (clientId: string, updates: Partial<Client>, logoFile?: File) => {
        if (!effectiveOrganization) return;
        let finalUpdates = { ...updates };

        if (logoFile) {
            const logoRef = ref(storage, `organizations/${effectiveOrganization.id}/clients/${clientId}/logo`);
            await uploadBytes(logoRef, logoFile);
            const downloadURL = await getDownloadURL(logoRef);
            finalUpdates.logoUrl = downloadURL;
        }
        await updateDoc(doc(db, 'clients', clientId), finalUpdates);
    };

    const handleBulkDeleteClients = async (clientIds: string[]) => {
        if (clientIds.length === 0) return;
        if (!window.confirm(`Tem certeza que deseja excluir ${clientIds.length} cliente(s)? Esta ação também excluirá todos os orçamentos e contatos associados e não pode ser desfeita.`)) return;

        if (!effectiveOrganization) return;
        
        setLoading(true);
        try {
            const batch = writeBatch(db);

            // Batch delete clients
            clientIds.forEach(clientId => {
                const clientRef = doc(db, "clients", clientId);
                batch.delete(clientRef);
            });
            
            // Find and batch delete associated contacts
            const contactsQuery = query(collection(db, "contacts"), where('clientId', 'in', clientIds));
            const contactsSnapshot = await getDocs(contactsQuery);
            contactsSnapshot.forEach(contactDoc => {
                batch.delete(contactDoc.ref);
            });

            // Find and batch delete associated budgets
            const budgetsQuery = query(collection(db, "budgets"), where('clientId', 'in', clientIds));
            const budgetsSnapshot = await getDocs(budgetsQuery);
            budgetsSnapshot.forEach(budgetDoc => {
                batch.delete(budgetDoc.ref);
            });
            
            await batch.commit();
            alert(`${clientIds.length} cliente(s) e seus dados associados foram excluídos com sucesso.`);
        } catch (error) {
            console.error("Erro ao excluir clientes em massa:", error);
            alert("Ocorreu um erro ao excluir os clientes. Verifique o console para mais detalhes.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (profileUpdates: Partial<UserProfile>) => {
        if (!effectiveUserProfile) return;
        await updateDoc(doc(db, 'users', effectiveUserProfile.id), profileUpdates);
        setProfileModalOpen(false);
    };

    const handleSaveOrganization = async (orgUpdate: Partial<Omit<Organization, 'id'>>, logoFile?: File) => {
        if (!effectiveOrganization) return;
        let finalUpdates = { ...orgUpdate };

        if (logoFile) {
            const logoRef = ref(storage, `organizations/${effectiveOrganization.id}/logo`);
            await uploadBytes(logoRef, logoFile);
            const downloadURL = await getDownloadURL(logoRef);
            finalUpdates.logoUrl = downloadURL;
        }

        if (Object.keys(finalUpdates).length > 0) {
            await updateDoc(doc(db, 'organizations', effectiveOrganization.id), finalUpdates);
        }
    };
    
    const handleUpdateStages = async (updatedStages: ProspectingStage[]) => {
        if(!effectiveOrganization) return;
        const batch = writeBatch(db);
        const stagesCollection = collection(db, 'prospectingStages');
        
        // Delete stages that are no longer in the list
        const currentStageIds = stages.map(s => s.id);
        const updatedStageIds = updatedStages.map(s => s.id);
        currentStageIds.forEach(id => {
            if (!updatedStageIds.includes(id)) {
                batch.delete(doc(stagesCollection, id));
            }
        });

        // Add or update stages
        updatedStages.forEach(stage => {
            if (stage.id.startsWith('new-')) {
                // It's a new stage, create it
                const { id, ...stageData } = stage;
                batch.set(doc(stagesCollection), stageData);
            } else {
                // It's an existing stage, update it
                batch.update(doc(stagesCollection, stage.id), { name: stage.name, order: stage.order });
            }
        });
        await batch.commit();
    };

    const handleAddUser = async (email: string, role: UserRole) => {
        if (!effectiveOrganization) return;
        
        // Check if user already exists in the org
        const userExistsQuery = query(collection(db, 'users'), where('email', '==', email), where('organizationId', '==', effectiveOrganization.id));
        const userExistsSnap = await getDocs(userExistsQuery);
        if (!userExistsSnap.empty) {
            alert('Este usuário já pertence à organização.');
            return;
        }

        // Check if invite already exists
        const inviteExistsQuery = query(collection(db, 'invites'), where('email', '==', email), where('organizationId', '==', effectiveOrganization.id));
        const inviteExistsSnap = await getDocs(inviteExistsQuery);
        if (!inviteExistsSnap.empty) {
            alert('Já existe um convite pendente para este e-mail.');
            return;
        }

        await addDoc(collection(db, "invites"), {
            email,
            role,
            organizationId: effectiveOrganization.id,
            status: 'pending'
        });
        setAddUserModalOpen(false);
        alert('Convite enviado com sucesso!');
    };

    const handleUpdateUserGoals = async (goals: { [userId: string]: number }) => {
        if (!effectiveOrganization) return;
    
        setLoading(true);
        try {
            const batch = writeBatch(db);
            Object.entries(goals).forEach(([userId, goal]) => {
                const userRef = doc(db, "users", userId);
                batch.update(userRef, { monthlyGoal: goal });
            });
            await batch.commit();
            alert('Metas atualizadas com sucesso!');
        } catch (error) {
            console.error("Erro ao atualizar metas dos usuários:", error);
            alert("Ocorreu um erro ao atualizar as metas.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddReminder = async (reminderData: Omit<Reminder, 'id' | 'userId' | 'organizationId' | 'isDismissed' | 'isCompleted'>) => {
        if (!effectiveUserProfile || !effectiveOrganization) return;
        const newReminder = {
            ...reminderData,
            userId: effectiveUserProfile.id,
            organizationId: effectiveOrganization.id,
            isDismissed: false,
            isCompleted: false,
        };
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
    
    const handleSaveScript = async (scriptData: Omit<Script, 'id' | 'organizationId' | 'userId'>, scriptId: string | null) => {
        if (!effectiveUserProfile || !effectiveOrganization) return;
        if (scriptId) {
            // Editing existing script
            await updateDoc(doc(db, 'scripts', scriptId), scriptData);
        } else {
            // Creating new script
            const newScript = {
                ...scriptData,
                userId: effectiveUserProfile.id,
                organizationId: effectiveOrganization.id,
            };
            await addDoc(collection(db, 'scripts'), newScript);
        }
    };

    const handleDeleteScript = async (scriptId: string) => {
        if (window.confirm("Tem certeza que deseja excluir este script?")) {
            await deleteDoc(doc(db, 'scripts', scriptId));
        }
    };

    const onGenerateDailyReport = () => {
        if (!effectiveUserProfile || !effectiveOrganization) return;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const budgetsForToday = budgets.filter(b => {
            if (!b.nextFollowUpDate) return false;
            const followUpDate = new Date(b.nextFollowUpDate);
            followUpDate.setHours(0,0,0,0);
            return followUpDate.getTime() === today.getTime() && (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP);
        });
        
        if (budgetsForToday.length === 0) {
            alert('Nenhum follow-up agendado para hoje.');
            return;
        }

        const reportData = budgetsForToday.map(budget => {
            const client = clients.find(c => c.id === budget.clientId);
            const contact = contacts.find(c => c.id === budget.contactId);
            return {
                budget,
                client: client!,
                contact: contact!,
                followUps: budget.followUps.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            }
        }).filter(item => item.client && item.contact);
        
        generateFollowUpReport(
            'Relatório de Follow-ups de Hoje',
            reportData,
            effectiveUserProfile,
            effectiveOrganization
        );
    };

    // --- RENDER LOGIC ---
    if (loading || !effectiveUserProfile) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900"><p>Carregando...</p></div>;
    }

    if (effectiveOrganization && effectiveOrganization.subscriptionStatus && ['past_due', 'unpaid', 'canceled'].includes(effectiveOrganization.subscriptionStatus)) {
        return <SubscriptionView organization={effectiveOrganization} user={user} />;
    }

    // Main App UI
    return (
        <div className={`min-h-screen flex ${theme === 'dark' ? 'dark' : ''}`}>
            {effectiveUserProfile.role !== UserRole.SUPER_ADMIN && (
                <Sidebar 
                    activeView={activeView}
                    setActiveView={changeView}
                    isOpen={isSidebarOpen}
                    userProfile={effectiveUserProfile}
                    organization={effectiveOrganization}
                    themeVariant={themeVariant}
                />
            )}
            <div className="flex-1 flex flex-col bg-[var(--background-primary)]">
                <Header 
                    onAddBudget={() => { setInitialClientIdForBudget(null); setAddBudgetModalOpen(true); }}
                    onAddProspect={() => setAddProspectModalOpen(true)}
                    onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
                    theme={theme}
                    toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                    notifications={notifications}
                    onNotificationClick={(budgetId) => {
                        const budget = budgets.find(b => b.id === budgetId);
                        if(budget) {
                            setSelectedBudget(budget);
                            setBudgetDetailModalOpen(true);
                        }
                    }}
                    userProfile={effectiveUserProfile}
                    onEditProfile={() => setProfileModalOpen(true)}
                    onSettings={() => setSettingsModalOpen(true)}
                    onLogout={handleLogout}
                    themeVariant={themeVariant}
                    reminders={reminders}
                    onAddReminder={handleAddReminder}
                    onDeleteReminder={handleDeleteReminder}
                    onToggleReminderStatus={handleToggleReminderStatus}
                    globalSearchTerm={globalSearchTerm}
                    globalSearchResults={globalSearchResults}
                    onGlobalSearch={handleGlobalSearch}
                    onClearGlobalSearch={handleClearSearch}
                    onSearchResultClick={handleSearchResultClick}
                />
                
                <main className="flex-grow p-4 sm:p-6 overflow-y-auto">
                    {/* Render active view based on state */}
                    {activeView === 'dashboard' && <Dashboard key={viewKey} budgets={budgets} clients={clients} onSelectBudget={(id) => { setSelectedBudget(budgets.find(b => b.id === id) || null); setBudgetDetailModalOpen(true); }} themeVariant={themeVariant} userProfile={effectiveUserProfile}/>}
                    {activeView === 'prospecting' && <ProspectingView key={viewKey} prospects={prospects} stages={stages} onAddProspectClick={() => setAddProspectModalOpen(true)} onUpdateProspectStage={handleUpdateProspectStage} onConvertProspect={handleConvertProspect} onDeleteProspect={handleDeleteProspect}/>}
                    {activeView === 'budgeting' && <BudgetingView key={viewKey} budgets={budgets} clients={clients} contacts={contacts} onSelectBudget={(id) => { setSelectedBudget(budgets.find(b => b.id === id) || null); setBudgetDetailModalOpen(true); }} onGenerateReport={onGenerateDailyReport} onBulkUpdate={handleBulkUpdateBudgets} />}
                    {activeView === 'deals' && <DealsView key={viewKey} budgets={budgets} clients={clients} onSelectBudget={(id) => { setSelectedBudget(budgets.find(b => b.id === id) || null); setBudgetDetailModalOpen(true); }} onUpdateStatus={handleChangeBudgetStatus} onScheduleFollowUp={() => {}} />}
                    {activeView === 'clients' && <ClientsView key={viewKey} clients={clients} contacts={contacts} budgets={budgets} onSelectClient={(id) => { setSelectedClient(clients.find(c => c.id === id) || null); setClientDetailModalOpen(true); }} onAddClientClick={() => setAddClientModalOpen(true)} onBulkDelete={handleBulkDeleteClients} />}
                    {activeView === 'reports' && <ReportsView key={viewKey} budgets={budgets} clients={clients} userProfile={effectiveUserProfile} onGenerateDailyReport={onGenerateDailyReport}/>}
                    {activeView === 'calendar' && <CalendarView key={viewKey} budgets={budgets} clients={clients} reminders={reminders} onSelectBudget={(id) => { setSelectedBudget(budgets.find(b => b.id === id) || null); setBudgetDetailModalOpen(true); }} onAddReminder={handleAddReminder}/>}
                    {activeView === 'action-plan' && <TasksView key={viewKey} budgets={budgets} clients={clients} reminders={reminders} onSelectBudget={(id) => { setSelectedBudget(budgets.find(b => b.id === id) || null); setBudgetDetailModalOpen(true); }} userProfile={effectiveUserProfile} />}
                    {activeView === 'map' && <MapView key={viewKey} clients={clients} />}
                    {activeView === 'scripts' && <ScriptsView key={viewKey} scripts={scripts} onAdd={() => { setScriptToEdit(null); setScriptModalOpen(true); }} onEdit={(script) => { setScriptToEdit(script); setScriptModalOpen(true); }} onDelete={handleDeleteScript}/>}
                    
                    {/* Admin Views */}
                    {activeView === 'users' && <UsersView key={viewKey} users={users} onUpdateRole={() => {}} onAddUserClick={() => setAddUserModalOpen(true)} onUpdateUserGoals={handleUpdateUserGoals} />}
                    {activeView === 'settings' && effectiveOrganization && <AdminSettingsView key={viewKey} organization={effectiveOrganization} userProfile={effectiveUserProfile} stages={stages} users={users} onSaveOrganization={handleSaveOrganization} onUpdateStages={handleUpdateStages} setActiveView={changeView}/>}
                    {activeView === 'organizations' && <SuperAdminView key={viewKey} organizations={allOrganizations} users={allUsers} clients={allClients} budgets={allBudgets} onImpersonate={handleImpersonate} onToggleStatus={()=>{}} onDelete={()=>{}} />}
                </main>

                {/* --- Modals --- */}
                {isAddBudgetModalOpen && (
                    <AddBudgetModal 
                        isOpen={isAddBudgetModalOpen}
                        onClose={() => setAddBudgetModalOpen(false)}
                        onSave={handleAddBudget}
                        clients={clients}
                        contacts={contacts}
                        prospectData={prospectToConvert ? { clientName: prospectToConvert.company, contactName: prospectToConvert.name, contactInfo: prospectToConvert.email || prospectToConvert.phone || '', clientCnpj: prospectToConvert.cnpj } : null}
                        initialClientId={initialClientIdForBudget}
                    />
                )}
                 {isBudgetDetailModalOpen && selectedBudget && (
                    <BudgetDetailModal 
                        isOpen={isBudgetDetailModalOpen}
                        onClose={() => setBudgetDetailModalOpen(false)}
                        budget={selectedBudget}
                        client={clients.find(c => c.id === selectedBudget.clientId)!}
                        contact={contacts.find(c => c.id === selectedBudget.contactId)}
                        onAddFollowUp={handleAddFollowUp}
                        onChangeStatus={handleChangeBudgetStatus}
                        onConfirmWin={handleConfirmWin}
                        onUpdateBudget={handleUpdateBudget}
                        scripts={scripts}
                    />
                )}
                {isAddProspectModalOpen && <AddProspectModal isOpen={isAddProspectModalOpen} onClose={() => setAddProspectModalOpen(false)} onSave={handleAddProspect} />}
                {isClientDetailModalOpen && selectedClient && (
                    <ClientDetailModal
                        isOpen={isClientDetailModalOpen}
                        onClose={() => setClientDetailModalOpen(false)}
                        client={selectedClient}
                        contacts={contacts.filter(c => c.clientId === selectedClient.id)}
                        budgets={budgets.filter(b => b.clientId === selectedClient.id)}
                        onSelectBudget={(id) => { setClientDetailModalOpen(false); setSelectedBudget(budgets.find(b => b.id === id) || null); setBudgetDetailModalOpen(true); }}
                        onAddBudgetForClient={(client) => { setClientDetailModalOpen(false); setInitialClientIdForBudget(client.id); setAddBudgetModalOpen(true); }}
                        onUpdateClient={handleUpdateClient}
                    />
                )}
                 {isProfileModalOpen && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setProfileModalOpen(false)} userProfile={effectiveUserProfile} onSave={handleUpdateProfile}/>}
                 {isSettingsModalOpen && <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} currentTheme={theme} setTheme={setTheme} currentThemeVariant={themeVariant} setThemeVariant={setThemeVariant}/>}
                 {isAddClientModalOpen && <AddClientModal isOpen={isAddClientModalOpen} onClose={() => setAddClientModalOpen(false)} onSave={handleAddClient} />}
                 {isAddUserModalOpen && <AddUserModal isOpen={isAddUserModalOpen} onClose={() => setAddUserModalOpen(false)} onAddUser={handleAddUser} />}
                 {isScriptModalOpen && <ScriptModal isOpen={isScriptModalOpen} onClose={() => setScriptModalOpen(false)} onSave={handleSaveScript} scriptToEdit={scriptToEdit}/>}
                
                {activeReminder && <ReminderNotification reminder={activeReminder} onDismiss={() => { updateDoc(doc(db, 'reminders', activeReminder.id), { isDismissed: true }); setActiveReminder(null); }}/>}
            </div>
        </div>
    );
};

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
            <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                <div className="text-xl font-semibold text-slate-700 dark:text-slate-300">Carregando...</div>
            </div>
        );
    }

    return user ? <AuthenticatedApp user={user} /> : <Auth />;
};

export default App;