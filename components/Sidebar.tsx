import React from 'react';
import type { ActiveView } from '../App';
import type { UserProfile, Organization } from '../types';
import { UserRole } from '../types';
import { 
    ChartPieIcon as DashboardIcon, 
    BriefcaseIcon, 
    FunnelIcon, 
    ClipboardDocumentListIcon, 
    CalendarDaysIcon, 
    MapPinIcon,
    ChartBarIcon,
    CurrencyDollarIcon,
    UserIcon,
    UserGroupIcon as UsersIcon,
    Cog6ToothIcon
} from './icons';

interface SidebarProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    isOpen: boolean;
    userProfile: UserProfile | null;
    organization: Organization | null;
}

const NavLink: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center p-3 rounded-lg text-left transition-colors duration-200 ${
            isActive 
            ? 'bg-[var(--background-accent-subtle)] text-[var(--text-accent)]' 
            : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--text-primary)]'
        }`}
    >
        {icon}
        <span className="ml-3 font-semibold text-sm">{label}</span>
    </button>
);

const NavSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-6">
        <h3 className="px-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">{title}</h3>
        <div className="mt-2 space-y-1">
            {children}
        </div>
    </div>
);


const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, userProfile, organization }) => {
    return (
        <aside className={`w-64 bg-[var(--background-secondary)] p-4 flex-shrink-0 flex flex-col border-r border-[var(--border-primary)] fixed md:sticky top-0 h-screen z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
            <div className="flex items-center gap-3 mb-8 px-2">
                {organization?.logoUrl ? (
                    <img src={organization.logoUrl} alt={`${organization.name} logo`} className="w-10 h-10 rounded-full object-contain" />
                ) : (
                    <div className="w-10 h-10 bg-[var(--background-accent-subtle)] rounded-full flex items-center justify-center text-[var(--text-accent)] font-bold">
                        {organization?.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <span className="text-xl font-bold text-[var(--text-accent)]">{organization?.name || "Follow-up CRM"}</span>
            </div>

            <nav className="flex-grow overflow-y-auto custom-scrollbar">
                {userProfile?.role === UserRole.SUPER_ADMIN ? (
                    <>
                        <NavSection title="Super Admin">
                             <NavLink 
                                label="Organizações"
                                icon={<Cog6ToothIcon className="w-6 h-6" />}
                                isActive={activeView === 'organizations'}
                                onClick={() => setActiveView('organizations')}
                            />
                        </NavSection>
                    </>
                ) : (
                    <>
                        <NavLink 
                            label="Painel"
                            icon={<DashboardIcon className="w-6 h-6" />}
                            isActive={activeView === 'dashboard'}
                            onClick={() => setActiveView('dashboard')}
                        />
                         <NavLink 
                            label="Plano de Ação"
                            icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
                            isActive={activeView === 'action-plan'}
                            onClick={() => setActiveView('action-plan')}
                        />

                        <NavSection title="Vendas">
                            <NavLink 
                                label="Prospecção"
                                icon={<FunnelIcon className="w-6 h-6" />}
                                isActive={activeView === 'prospecting'}
                                onClick={() => setActiveView('prospecting')}
                            />
                            <NavLink 
                                label="Orçamentos"
                                icon={<BriefcaseIcon className="w-6 h-6" />}
                                isActive={activeView === 'budgeting'}
                                onClick={() => setActiveView('budgeting')}
                            />
                             <NavLink 
                                label="Hub de Negócios"
                                icon={<CurrencyDollarIcon className="w-6 h-6" />}
                                isActive={activeView === 'deals'}
                                onClick={() => setActiveView('deals')}
                            />
                            <NavLink 
                                label="Clientes"
                                icon={<UserIcon className="w-6 h-6" />}
                                isActive={activeView === 'clients'}
                                onClick={() => setActiveView('clients')}
                            />
                        </NavSection>

                        <NavSection title="Organização">
                             <NavLink 
                                label="Calendário"
                                icon={<CalendarDaysIcon className="w-6 h-6" />}
                                isActive={activeView === 'calendar'}
                                onClick={() => setActiveView('calendar')}
                            />
                        </NavSection>
                         <NavSection title="Análise">
                             <NavLink 
                                label="Relatórios"
                                icon={<ChartBarIcon className="w-6 h-6" />}
                                isActive={activeView === 'reports'}
                                onClick={() => setActiveView('reports')}
                            />
                             <NavLink 
                                label="Mapa"
                                icon={<MapPinIcon className="w-6 h-6" />}
                                isActive={activeView === 'map'}
                                onClick={() => setActiveView('map')}
                            />
                        </NavSection>

                        {(userProfile?.role === UserRole.ADMIN || userProfile?.role === UserRole.MANAGER) && (
                            <NavSection title="Admin">
                                <NavLink 
                                    label="Gerenciar Usuários"
                                    icon={<UsersIcon className="w-6 h-6" />}
                                    isActive={activeView === 'users'}
                                    onClick={() => setActiveView('users')}
                                />
                            </NavSection>
                        )}
                    </>
                )}
            </nav>

            <div className="mt-auto text-center text-xs text-[var(--text-tertiary)] pt-4">
                <p>&copy; 2024 Follow-up CRM</p>
                <p>Todos os direitos reservados.</p>
            </div>
        </aside>
    );
};

export default Sidebar;