



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
import { auth, db, storage } from './lib/firebase';
import Auth from './components/Auth';
import { generateFollowUpReport } from './lib/reportGenerator';
import AddUserModal from './components/AddUserModal';
import ReminderNotification from './components/ReminderNotification';
import { ExclamationTriangleIcon } from './components/icons';
import EditReminderModal from './components/EditReminderModal';

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
    const [isEditReminderModalOpen, setEditReminderModalOpen] = useState(false);
    const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);


    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', themeVariant);
        localStorage.setItem('themeVariant', themeVariant);
    }, [themeVariant]);

    const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    
    const handleSetView = (view: ActiveView) => {
        setActiveView(view);
        setViewKey(prev => prev + 1); // Increment key to force re-render with animation
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setLoadingMessage('Carregando perfil...');
                
                const impersonationData = sessionStorage.getItem('impersonation');
                if (impersonationData) {
                    try {
                        const { originalProfile, targetOrg, impersonatedProfile } = JSON.parse(impersonationData);
                        if (impersonatedProfile) {
                            setUser(currentUser); // Keep the auth user (Super Admin)
                            setUserProfile(impersonatedProfile); // But display the impersonated profile
                            setOriginalUserProfile(originalProfile);
                            setImpersonatingOrg(targetOrg);
                            setLoading(false); // Stop loading early
                            return; // Skip normal user profile fetching
                        }
                    } catch (error) {
                        console.error("Failed to parse impersonation data:", error);
                        sessionStorage.removeItem('impersonation');
                    }
                }
                
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const profile = userDocSnap.data() as UserProfile;
                    
                     if (profile.role !== UserRole.SUPER_ADMIN) {
                        const orgDocRef = doc(db, 'organizations', profile.organizationId);
                        const orgDocSnap = await getDoc(orgDocRef);
                        if (!orgDocSnap.exists() || orgDocSnap.data().status === 'suspended') {
                            alert('Sua organização está suspensa ou foi removida. Contate o suporte.');
                            await signOut(auth);
                            return;
                        }
                        setOrganization({ id: orgDocSnap.id, ...orgDocSnap.data() } as Organization);
                    }

                    setUser(currentUser);
                    setUserProfile(profile);
                    setActiveView(profile.role === UserRole.SUPER_ADMIN ? 'organizations' : 'dashboard');
                } else {
                    console.error("User profile not found in Firestore.");
                    await signOut(auth);
                }
            } else {
                setUser(null);
                setUserProfile(null);
                setOrganization(null);
                setOriginalUserProfile(null);
                setImpersonatingOrg(null);
                sessionStorage.removeItem('impersonation');
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchOrganizationData = useCallback(async () => {
        if (!user || !userProfile) return;
        setLoading(true);
        setLoadingMessage('Carregando dados da organização...');

        try {
            const { organizationId } = userProfile;

            // Fetch organization details
            const orgDocRef = doc(db, 'organizations', organizationId);
            const orgDocSnap = await getDoc(orgDocRef);
            if (orgDocSnap.exists()) {
                setOrganization({ id: orgDocSnap.id, ...orgDocSnap.data() } as Organization);
            }

            const collectionsToFetch = {
                clients: collection(db, 'clients'),
                budgets: collection(db, 'budgets'),
                prospects: collection(db, 'prospects'),
                prospectingStages: collection(db, 'prospectingStages'),
                contacts: collection(db, 'contacts'),
                users: collection(db, 'users'),
                reminders: collection(db, 'reminders'),
            };

            const queries = Object.fromEntries(
                Object.entries(collectionsToFetch).map(([key, coll]) => [
                    key,
                    query(coll, where('organizationId', '==', organizationId))
                ])
            );

            const [
                clientsSnapshot, 
                budgetsSnapshot, 
                prospectsSnapshot, 
                stagesSnapshot,
                contactsSnapshot,
                usersSnapshot,
                remindersSnapshot
            ] = await Promise.all([
                getDocs(queries.clients),
                getDocs(queries.budgets),
                getDocs(queries.prospects),
                getDocs(queries.prospectingStages),
                getDocs(queries.contacts),
                getDocs(queries.users),
                getDocs(query(collection(db, 'reminders'), where('userId', '==', user.uid))),
            ]);

            const clientsData = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
            setClients(clientsData);

            const budgetsData = budgetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
            setBudgets(budgetsData);

            const prospectsData = prospectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prospect));
            setProspects(prospectsData);
            
            if (stagesSnapshot.empty) {
                const defaultStages = [
                    { name: 'Qualificação', order: 0 }, { name: 'Contato Inicial', order: 1 },
                    { name: 'Apresentação', order: 2 }, { name: 'Negociação', order: 3 },
                ];
                const batch = writeBatch(db);
                const createdStages: ProspectingStage[] = [];
                defaultStages.forEach(stage => {
                    const newStageRef = doc(collection(db, 'prospectingStages'));
                    const newStageData = { ...stage, id: newStageRef.id, organizationId };
                    batch.set(newStageRef, newStageData);
                    createdStages.push(newStageData);
                });
                await batch.commit();
                setStages(createdStages);
            } else {
                 setStages(stagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProspectingStage)));
            }

            setContacts(contactsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contact)));
            setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData)));
            setReminders(remindersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder)));

        } catch (error) {
            console.error("Error fetching data: ", error);
        } finally {
            setLoading(false);
        }
    }, [user, userProfile]);

    const fetchSuperAdminData = useCallback(async () => {
        if (!user || !userProfile || userProfile.role !== UserRole.SUPER_ADMIN) return;
        setLoading(true);
        setLoadingMessage('Carregando dados da plataforma...');
    
        try {
            const [
                orgsSnapshot,
                usersSnapshot,
                clientsSnapshot,
                budgetsSnapshot
            ] = await Promise.all([
                getDocs(collection(db, 'organizations')),
                getDocs(collection(db, 'users')),
                getDocs(collection(db, 'clients')),
                getDocs(collection(db, 'budgets'))
            ]);
    
            setAllOrganizations(orgsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization)));
            setAllUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData)));
            setAllClients(clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
            setAllBudgets(budgetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
    
        } catch (error) {
            console.error("Error fetching super admin data: ", error);
        } finally {
            setLoading(false);
        }
    }, [user, userProfile]);

    useEffect(() => {
        if (userProfile) {
            if (userProfile.role === UserRole.SUPER_ADMIN && !impersonatingOrg) {
                fetchSuperAdminData();
            } else {
                fetchOrganizationData();
            }
        }
    }, [userProfile, fetchOrganizationData, fetchSuperAdminData, impersonatingOrg]);

    // FIX: This useEffect hook keeps the selectedBudget state in sync with the main budgets list.
    // When budgets are refetched (e.g., after a status change), this ensures the modal
    // receives the updated budget data, fixing the bug where the status pill wouldn't update.
    useEffect(() => {
        if (selectedBudget) {
            const updatedBudget = budgets.find(b => b.id === selectedBudget.id) || null;
            setSelectedBudget(updatedBudget);
        }
    }, [budgets, selectedBudget]);

    useEffect(() => {
        if (userProfile?.role === UserRole.SUPER_ADMIN) {
            setNotifications([]);
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const clientMap = new Map(clients.map(c => [c.id, c.name]));
        const newNotifications: Notification[] = [];
        budgets.forEach(b => {
            if (b.nextFollowUpDate && (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP)) {
                const followUpDate = new Date(b.nextFollowUpDate);
                const clientName = clientMap.get(b.clientId) || 'Cliente Desconhecido';
                if (followUpDate < today) {
                    newNotifications.push({ id: `${b.id}-overdue`, type: 'overdue', message: 'Follow-up atrasado!', budgetId: b.id, clientName });
                } else if (followUpDate.toDateString() === today.toDateString()) {
                    newNotifications.push({ id: `${b.id}-today`, type: 'today', message: 'Follow-up para hoje.', budgetId: b.id, clientName });
                }
            }
        });
        setNotifications(newNotifications);
    }, [budgets, clients, userProfile]);

    // Reminder check effect
    useEffect(() => {
        const interval = setInterval(() => {
            if (activeReminder) return; // Don't show a new one if one is already active

            const now = new Date();
            const dueReminder = reminders.find(r => 
                !r.isDismissed && new Date(r.reminderDateTime) <= now
            );

            if (dueReminder) {
                setActiveReminder(dueReminder);
            }
        }, 15000); // Check every 15 seconds

        return () => clearInterval(interval);
    }, [reminders, activeReminder]);

    const handleLogout = async () => {
        await signOut(auth);
        setBudgets([]); setClients([]); setContacts([]); setProspects([]); setStages([]); setUsers([]);
        setAllOrganizations([]); setAllUsers([]); setAllClients([]); setAllBudgets([]);
        setActiveView('dashboard');
    };

    const handleSelectBudget = useCallback((budgetId: string) => {
        const budget = budgets.find(b => b.id === budgetId);
        if (budget) {
            setSelectedBudget(budget);
            setBudgetDetailModalOpen(true);
        }
    }, [budgets]);
    
     const handleSelectClient = useCallback((clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setSelectedClient(client);
            setClientDetailModalOpen(true);
        }
    }, [clients]);

    const handleAddBudget = useCallback(async (
        budgetData: Omit<Budget, 'id' | 'followUps' | 'status' | 'userId' | 'organizationId' | 'clientId' | 'contactId'>,
        clientInfo: { existingId?: string; newClientData?: Omit<Client, 'id' | 'userId' | 'organizationId'> },
        contactInfo: { existingId?: string; newContactData?: Omit<Contact, 'id' | 'clientId' | 'organizationId'> }
    ) => {
        if (!user || !userProfile) return;
        try {
            let finalClientId = clientInfo.existingId;
            if (clientInfo.newClientData) {
                const newClientRef = await addDoc(collection(db, 'clients'), { 
                    ...clientInfo.newClientData, 
                    userId: user.uid,
                    organizationId: userProfile.organizationId
                });
                // FIX: Replaced `as string` cast with `String()` to correctly handle potential 'unknown' type from Firebase DocumentReference id.
                finalClientId = String(newClientRef.id);
            }

            if (!finalClientId) {
                throw new Error("Client ID is missing.");
            }

            let finalContactId: string | null = contactInfo.existingId || null;
            if (contactInfo.newContactData) {
                const newContactRef = await addDoc(collection(db, 'contacts'), {
                    ...contactInfo.newContactData,
                    clientId: finalClientId,
                    organizationId: userProfile.organizationId
                });
                // FIX: Replaced `as string` cast with `String()` to correctly handle potential 'unknown' type from Firebase DocumentReference id.
                finalContactId = String(newContactRef.id);
            }
            
            const newBudget: Omit<Budget, 'id'> = {
                ...budgetData,
                userId: user.uid,
                organizationId: userProfile.organizationId,
                clientId: finalClientId,
                contactId: finalContactId,
                status: BudgetStatus.SENT,
                followUps: []
            };
            await addDoc(collection(db, 'budgets'), newBudget);
            await fetchOrganizationData();
            setAddBudgetModalOpen(false);
        } catch (error) {
            console.error("Error adding budget:", error);
        }
    }, [user, userProfile, fetchOrganizationData]);

    const handleAddProspect = async (prospectData: Omit<Prospect, 'id' | 'stageId' | 'userId' | 'organizationId' | 'createdAt'>) => {
        if (!user || !userProfile) return;
        const firstStage = stages.find(s => s.order === 0);
        if (!firstStage) {
            alert("Nenhuma etapa de prospecção configurada. Configure as etapas primeiro.");
            return;
        }
        await addDoc(collection(db, 'prospects'), { 
            ...prospectData, 
            userId: user.uid,
            organizationId: userProfile.organizationId,
            stageId: firstStage.id,
            createdAt: new Date().toISOString(),
        });
        await fetchOrganizationData();
    };

    const handleUpdateProspectStage = async (prospectId: string, newStageId: string) => {
        const prospectRef = doc(db, 'prospects', prospectId);
        await updateDoc(prospectRef, { stageId: newStageId });
        await fetchOrganizationData();
    };
    
    const handleUpdateStages = async (updatedStages: ProspectingStage[]) => {
        if (!userProfile) return;
        const batch = writeBatch(db);
        const stageCollection = collection(db, 'prospectingStages');
        const existingStageIds = stages.map(s => s.id);
        
        updatedStages.forEach(stage => {
            const stageRef = doc(stageCollection, stage.id);
            batch.set(stageRef, { ...stage, organizationId: userProfile.organizationId }, { merge: true });
        });

        // Delete removed stages
        existingStageIds.forEach(id => {
            if (!updatedStages.some(s => s.id === id)) {
                const stageRef = doc(stageCollection, id);
                batch.delete(stageRef);
            }
        });

        await batch.commit();
        await fetchOrganizationData();
    };

    const handleConvertProspect = async (prospectId: string) => {
        const prospectToConvert = prospects.find(p => p.id === prospectId);
        if (prospectToConvert) {
            setProspectToConvert(prospectToConvert);
            setAddBudgetModalOpen(true);
            const prospectRef = doc(db, 'prospects', prospectId);
            await deleteDoc(prospectRef);
            await fetchOrganizationData();
        }
    };
    
    const handleAddFollowUp = async (budgetId: string, followUp: Omit<FollowUp, 'id'>, nextFollowUpDate: string | null) => {
        const budgetRef = doc(db, 'budgets', budgetId);
        const budgetDoc = await getDoc(budgetRef);
        if (budgetDoc.exists()) {
            const budgetData = budgetDoc.data() as Budget;
            const newFollowUp: FollowUp = { 
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                date: followUp.date,
                notes: followUp.notes,
            };
            if (followUp.audioUrl) {
                newFollowUp.audioUrl = followUp.audioUrl;
            }
            const updatedFollowUps = [...budgetData.followUps, newFollowUp];
            await updateDoc(budgetRef, {
                followUps: updatedFollowUps,
                status: BudgetStatus.FOLLOWING_UP,
                nextFollowUpDate: nextFollowUpDate
            });
            await fetchOrganizationData();
        }
    };

    const handleChangeStatus = async (budgetId: string, status: BudgetStatus) => {
        const budgetRef = doc(db, 'budgets', budgetId);
        await updateDoc(budgetRef, { status });
        await fetchOrganizationData();
    };

    const handleAddClient = async (clientData: Omit<Client, 'id' | 'userId' | 'organizationId'>, contactData?: Omit<Contact, 'id' | 'clientId' | 'organizationId'>) => {
        if (!user || !userProfile) return;
        const clientRef = await addDoc(collection(db, 'clients'), {
            ...clientData,
            userId: user.uid,
            organizationId: userProfile.organizationId,
        });
        if (contactData) {
            await addDoc(collection(db, 'contacts'), {
                ...contactData,
                clientId: clientRef.id,
                organizationId: userProfile.organizationId
            });
        }
        await fetchOrganizationData();
    };
    
    const handleUpdateUserProfile = async (profileUpdate: Partial<UserProfile>) => {
        if (!user) return;
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, profileUpdate);
        setUserProfile(prev => prev ? { ...prev, ...profileUpdate } : null);
    };
    
     const handleUpdateOrganizationData = async (orgUpdate: Partial<Omit<Organization, 'id'>>, logoFile?: File) => {
        if (!organization) return;

        let logoUrl = organization.logoUrl;
        if (logoFile) {
            const logoRef = ref(storage, `organizations/${organization.id}/logo`);
            await uploadBytes(logoRef, logoFile);
            logoUrl = await getDownloadURL(logoRef);
        }

        const finalUpdate: Partial<Organization> = {
            ...orgUpdate,
            logoUrl,
        };
        
        const orgRef = doc(db, 'organizations', organization.id);
        await updateDoc(orgRef, finalUpdate);
        
        // Optimistically update local state for immediate feedback
        setOrganization(prev => prev ? { ...prev, ...finalUpdate } : null);
    };

    const handleUpdateClientData = async (clientId: string, clientUpdate: Partial<Client>, logoFile?: File) => {
        const clientRef = doc(db, 'clients', clientId);
        const currentClient = clients.find(c => c.id === clientId);
        if (!currentClient) return;
    
        let finalUpdate: Partial<Client> & { [key: string]: any } = { ...clientUpdate };
    
        if (logoFile) {
            const logoRef = ref(storage, `clients/${clientId}/logo`);
            await uploadBytes(logoRef, logoFile);
            const logoUrl = await getDownloadURL(logoRef);
            finalUpdate.logoUrl = logoUrl;
        }
    
        await updateDoc(clientRef, finalUpdate);
        await fetchOrganizationData();
    };

    const handleUpdateUserRole = async (userId: string, newRole: UserRole) => {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { role: newRole });
        await fetchOrganizationData();
    };

    const handleInviteUser = async (email: string, role: UserRole) => {
        if (!userProfile) return;
        
        const usersQuery = query(collection(db, 'users'), where('email', '==', email), where('organizationId', '==', userProfile.organizationId));
        const invitesQuery = query(collection(db, 'invites'), where('email', '==', email), where('organizationId', '==', userProfile.organizationId));
        
        const [usersSnap, invitesSnap] = await Promise.all([getDocs(usersQuery), getDocs(invitesQuery)]);

        if (!usersSnap.empty || !invitesSnap.empty) {
            alert('Um usuário ou convite com este e-mail já existe nesta organização.');
            return;
        }

        await addDoc(collection(db, 'invites'), {
            email,
            role,
            organizationId: userProfile.organizationId,
            status: 'pending'
        });
        alert(`Convite enviado para ${email}!`);
        setAddUserModalOpen(false);
    };

    const handleAddReminder = async (reminderData: Omit<Reminder, 'id' | 'userId' | 'organizationId' | 'isDismissed' | 'isCompleted'>) => {
        if (!user || !userProfile) return;
        await addDoc(collection(db, 'reminders'), {
            ...reminderData,
            userId: user.uid,
            organizationId: userProfile.organizationId,
            isDismissed: false,
            isCompleted: false,
        });
        await fetchOrganizationData();
    };

    const handleSelectReminder = useCallback((reminderId: string) => {
        const reminder = reminders.find(r => r.id === reminderId);
        if (reminder) {
            setSelectedReminder(reminder);
            setEditReminderModalOpen(true);
        }
    }, [reminders]);

    const handleUpdateReminder = async (reminderId: string, updates: { title: string; reminderDateTime: string }) => {
        const reminderRef = doc(db, 'reminders', reminderId);
        await updateDoc(reminderRef, updates);
        await fetchOrganizationData();
    };

    const handleToggleReminderStatus = async (reminderId: string) => {
        const reminder = reminders.find(r => r.id === reminderId);
        if (reminder) {
            const reminderRef = doc(db, 'reminders', reminderId);
            await updateDoc(reminderRef, { isCompleted: !reminder.isCompleted });
            await fetchOrganizationData();
        }
    };

    const handleDeleteReminder = async (reminderId: string) => {
        await deleteDoc(doc(db, 'reminders', reminderId));
        await fetchOrganizationData();
    };
    
    const handleDismissReminder = async (reminderId: string) => {
        const reminderRef = doc(db, 'reminders', reminderId);
        await updateDoc(reminderRef, { isDismissed: true });
        setActiveReminder(null); // Hide notification immediately
        await fetchOrganizationData(); // Refresh state
    };

    const handleGenerateSelectionReport = (selectedIds: string[]) => {
        if (!userProfile) return;
        
        const reportData = selectedIds
            .map(id => {
                const budget = budgets.find(b => b.id === id);
                if (!budget) return null;
                const client = clients.find(c => c.id === budget.clientId);
                if (!client) return null;
                const contact = contacts.find(c => c.id === budget.contactId);
                // Contact is required for the report.
                if (!contact) return null;
                return { budget, client, contact, followUps: budget.followUps };
            })
            .filter((item): item is ReportDataItem => item !== null);

        if (reportData.length > 0) {
            generateFollowUpReport('Relatório de Follow-Ups', reportData, userProfile, organization);
        }
    };

    const handleSaveClientNotes = async (clientId: string, notes: string) => {
        const clientRef = doc(db, 'clients', clientId);
        await updateDoc(clientRef, { notes });
        await fetchOrganizationData();
    };

    // Super Admin Actions
    const handleImpersonate = (targetOrg: Organization) => {
        if (!userProfile || userProfile.role !== UserRole.SUPER_ADMIN) return;

        // Prioritize finding an Admin, but fall back to a Manager
        let targetUser = allUsers.find(u => u.organizationId === targetOrg.id && u.role === UserRole.ADMIN);
        if (!targetUser) {
            targetUser = allUsers.find(u => u.organizationId === targetOrg.id && u.role === UserRole.MANAGER);
        }

        if (!targetUser) {
            alert('Não foi possível encontrar um administrador ou gerente para esta organização.');
            return;
        }

        sessionStorage.setItem('impersonation', JSON.stringify({ 
            originalProfile: userProfile, 
            targetOrg,
            impersonatedProfile: targetUser
        }));
        window.location.reload();
    };
    
    const handleExitImpersonation = () => {
        sessionStorage.removeItem('impersonation');
        window.location.reload();
    };

    const handleToggleOrgStatus = async (orgId: string, currentStatus: 'active' | 'suspended') => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        if (window.confirm(`Tem certeza que deseja ${newStatus === 'active' ? 'reativar' : 'suspender'} esta organização?`)) {
            await updateDoc(doc(db, 'organizations', orgId), { status: newStatus });
            await fetchSuperAdminData();
        }
    };

    const handleDeleteOrganization = async (orgId: string, orgName: string) => {
        if (!window.confirm(`TEM CERTEZA?\n\nIsso excluirá permanentemente a organização "${orgName}" e TODOS os seus dados (usuários, clientes, orçamentos, etc.).\n\nEssa ação não pode ser desfeita.`)) return;

        setLoading(true);
        setLoadingMessage(`Excluindo ${orgName}...`);
        try {
            const collectionsToDelete = ['users', 'clients', 'budgets', 'contacts', 'prospects', 'prospectingStages', 'invites'];
            const batch = writeBatch(db);

            for (const coll of collectionsToDelete) {
                const q = query(collection(db, coll), where('organizationId', '==', orgId));
                const snapshot = await getDocs(q);
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
            }

            const orgRef = doc(db, 'organizations', orgId);
            batch.delete(orgRef);

            await batch.commit();
            await fetchSuperAdminData();
        } catch (error) {
            console.error("Error deleting organization:", error);
            alert("Falha ao excluir organização. Verifique o console para mais detalhes.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateDailyReport = () => {
        if (!userProfile) return;
        const today = new Date().toDateString();

        const reportData = budgets
            .filter(b => b.nextFollowUpDate && new Date(b.nextFollowUpDate).toDateString() === today)
            .map(budget => {
                const client = clients.find(c => c.id === budget.clientId);
                if (!client) return null;
                const contact = contacts.find(c => c.id === budget.contactId);
                if (!contact) return null;
                const todaysFollowUps = budget.followUps.filter(fu => new Date(fu.date).toDateString() === today);
                return { budget, client, contact, followUps: todaysFollowUps };
            })
            .filter((item): item is ReportDataItem => item !== null);
        
        if (reportData.length > 0) {
            generateFollowUpReport('Relatório de Follow-ups do Dia', reportData, userProfile, organization);
        } else {
            alert('Nenhum follow-up agendado para hoje.');
        }
    };


    if (loading) return <FullScreenLoader message={loadingMessage} />;
    if (!user || !userProfile) return <Auth />;
    
    // Gatekeeper logic for subscription
    if (userProfile.role !== UserRole.SUPER_ADMIN && organization?.subscriptionStatus !== 'active') {
        // Here we can also check for a 'trial' status in the future
        // e.g., !['active', 'trial'].includes(organization?.subscriptionStatus)
        return <SubscriptionView organization={organization} user={user} />;
    }

    const selectedBudgetClient = clients.find(c => c.id === selectedBudget?.clientId);
    const selectedBudgetContact = contacts.find(c => c.id === selectedBudget?.contactId);
    
    const isDashboardTheme = themeVariant === 'dashboard';

    return (
        <div className={`flex h-screen ${isDashboardTheme ? 'bg-[var(--background-primary)]' : 'bg-[var(--background-primary)]'}`}>
             {/* Sidebar backdrop for mobile */}
            {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/30 z-20 md:hidden"></div>}
            
            <Sidebar 
                activeView={activeView} 
                setActiveView={handleSetView} 
                isOpen={isSidebarOpen} 
                userProfile={userProfile} 
                organization={organization}
                themeVariant={themeVariant}
            />

            <div className={`flex-1 flex flex-col h-screen ${isDashboardTheme ? 'p-4 sm:p-6' : ''}`}>
                 <div className={`flex flex-col h-full w-full ${isDashboardTheme ? 'bg-[var(--background-secondary)] rounded-2xl shadow-lg' : ''}`}>
                     {impersonatingOrg && originalUserProfile && (
                        <div className="bg-yellow-400 dark:bg-yellow-600 text-black dark:text-white text-center p-2 font-semibold flex justify-center items-center gap-4 z-50">
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            Você está visualizando como {userProfile.name} da organização {impersonatingOrg.name}.
                            <button onClick={handleExitImpersonation} className="ml-4 bg-black/20 hover:bg-black/40 text-white font-bold py-1 px-3 rounded-lg">
                                Voltar ao Super Admin
                            </button>
                        </div>
                    )}
                    <Header 
                        onAddBudget={() => setAddBudgetModalOpen(true)} 
                        onAddProspect={() => setAddProspectModalOpen(true)}
                        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
                        theme={theme}
                        toggleTheme={toggleTheme}
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
                        onToggleReminderStatus={handleToggleReminderStatus}
                    />
                    <main key={viewKey} className={`flex-1 overflow-y-auto fade-in ${isDashboardTheme ? 'p-4 sm:p-6' : 'p-4 sm:p-8'}`}>
                        {userProfile.role === UserRole.SUPER_ADMIN && !impersonatingOrg ? (
                            <SuperAdminView 
                                organizations={allOrganizations} 
                                users={allUsers} 
                                clients={allClients} 
                                budgets={allBudgets}
                                onImpersonate={handleImpersonate}
                                onToggleStatus={handleToggleOrgStatus}
                                onDelete={handleDeleteOrganization}
                            />
                        ) : (
                            <>
                                {activeView === 'dashboard' && <Dashboard userProfile={userProfile} budgets={budgets} clients={clients} onSelectBudget={handleSelectBudget} themeVariant={themeVariant} />}
                                {activeView === 'deals' && <DealsView budgets={budgets} clients={clients} onSelectBudget={handleSelectBudget} onUpdateStatus={handleChangeStatus} />}
                                {activeView === 'prospecting' && <ProspectingView prospects={prospects} stages={stages} onAddProspectClick={() => setAddProspectModalOpen(true)} onUpdateProspectStage={handleUpdateProspectStage} onUpdateStages={handleUpdateStages} onConvertProspect={handleConvertProspect} />}
                                {activeView === 'budgeting' && <BudgetingView budgets={budgets} clients={clients} contacts={contacts} onSelectBudget={handleSelectBudget} onGenerateReport={handleGenerateSelectionReport}/>}
                                {activeView === 'calendar' && <CalendarView budgets={budgets} clients={clients} reminders={reminders} onSelectBudget={handleSelectBudget} onAddReminder={handleAddReminder} onSelectReminder={handleSelectReminder} />}
                                {activeView === 'action-plan' && <TasksView budgets={budgets} clients={clients} reminders={reminders} onSelectBudget={handleSelectBudget} />}
                                {activeView === 'map' && <MapView clients={clients} />}
                                {activeView === 'clients' && <ClientsView clients={clients} contacts={contacts} budgets={budgets} onSelectClient={handleSelectClient} onAddClientClick={() => setAddClientModalOpen(true)}/>}
                                {activeView === 'reports' && <ReportsView budgets={budgets} clients={clients} userProfile={userProfile} onGenerateDailyReport={handleGenerateDailyReport} />}
                                {(activeView === 'users' && (userProfile.role === UserRole.ADMIN || userProfile.role === UserRole.MANAGER)) && <UsersView users={users} onUpdateRole={handleUpdateUserRole} onInviteUserClick={() => setAddUserModalOpen(true)} />}
                            </>
                        )}
                    </main>
                </div>
            </div>
            
            {/* Reminder Notification */}
            {activeReminder && (
                <ReminderNotification 
                    reminder={activeReminder}
                    onDismiss={() => handleDismissReminder(activeReminder.id)}
                />
            )}

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
            {isBudgetDetailModalOpen && selectedBudget && selectedBudgetClient && (
                <BudgetDetailModal 
                    isOpen={isBudgetDetailModalOpen} 
                    onClose={() => setBudgetDetailModalOpen(false)}
                    budget={selectedBudget}
                    client={selectedBudgetClient}
                    contact={selectedBudgetContact}
                    onAddFollowUp={handleAddFollowUp}
                    onChangeStatus={handleChangeStatus}
                />
            )}
             <AddProspectModal 
                isOpen={isAddProspectModalOpen} 
                onClose={() => setAddProspectModalOpen(false)}
                onSave={handleAddProspect}
            />
            {isClientDetailModalOpen && selectedClient && (
                <ClientDetailModal
                    isOpen={isClientDetailModalOpen}
                    onClose={() => setClientDetailModalOpen(false)}
                    client={selectedClient}
                    contacts={contacts.filter(c => c.clientId === selectedClient.id)}
                    budgets={budgets.filter(b => b.clientId === selectedClient.id)}
                    onSelectBudget={handleSelectBudget}
                    onAddBudgetForClient={(client) => {
                        setClientDetailModalOpen(false);
                        setInitialClientIdForBudget(client.id);
                        setAddBudgetModalOpen(true);
                    }}
                    onUpdateClient={handleUpdateClientData}
                />
            )}
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                onSave={(profileUpdate) => {
                    handleUpdateUserProfile(profileUpdate);
                    setProfileModalOpen(false);
                }}
                userProfile={userProfile}
            />
            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
                currentTheme={theme}
                currentThemeVariant={themeVariant}
                setTheme={setTheme}
                setThemeVariant={setThemeVariant}
                userProfile={userProfile}
                organization={organization}
                onSaveOrganization={handleUpdateOrganizationData}
            />
            <AddClientModal
                isOpen={isAddClientModalOpen}
                onClose={() => setAddClientModalOpen(false)}
                onSave={(client, contact) => {
                    handleAddClient(client, contact);
                    setAddClientModalOpen(false);
                }}
            />
             {(userProfile.role === UserRole.ADMIN || userProfile.role === UserRole.MANAGER) && (
                <AddUserModal
                    isOpen={isAddUserModalOpen}
                    onClose={() => setAddUserModalOpen(false)}
                    onInvite={handleInviteUser}
                />
            )}
             <EditReminderModal
                isOpen={isEditReminderModalOpen}
                onClose={() => setEditReminderModalOpen(false)}
                reminder={selectedReminder}
                onUpdate={handleUpdateReminder}
                onDelete={handleDeleteReminder}
            />
        </div>
    );
};

export default App;