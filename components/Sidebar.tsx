import React from 'react';
import type { ActiveView } from '../App';
import type { UserProfile, Organization, ThemeVariant } from '../types';
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
    Cog6ToothIcon,
    BillingIcon,
} from './icons';

interface SidebarProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    isOpen: boolean;
    userProfile: UserProfile | null;
    organization: Organization | null;
    themeVariant: ThemeVariant;
}

const NavLink: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    isDashboardTheme: boolean;
}> = ({ icon, label, isActive, onClick, isDashboardTheme }) => {
    
    const activeClass = isDashboardTheme 
        ? 'bg-[var(--background-sidebar-active)] text-[var(--text-on-sidebar-active)]'
        : 'bg-[var(--background-accent-subtle)] text-[var(--text-accent)]';
    
    const inactiveClass = isDashboardTheme
        ? 'text-[var(--text-on-sidebar)] hover:bg-[var(--background-sidebar-hover)] hover:text-[var(--text-on-sidebar-hover)]'
        : 'text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-[var(--text-primary)]';

    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center p-3 rounded-lg text-left transition-colors duration-200 ${
                isActive ? activeClass : inactiveClass
            }`}
        >
            {icon}
            <span className="ml-3 font-semibold text-sm">{label}</span>
        </button>
    );
};

const NavSection: React.FC<{ title: string; children: React.ReactNode; isDashboardTheme: boolean; }> = ({ title, children, isDashboardTheme }) => (
    <div className="mt-6">
        <h3 className={`px-3 text-xs font-semibold uppercase tracking-wider ${isDashboardTheme ? 'text-gray-400' : 'text-[var(--text-tertiary)]'}`}>
            {title}
        </h3>
        <div className="mt-2 space-y-1">
            {children}
        </div>
    </div>
);


const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, userProfile, organization, themeVariant }) => {
    const isDashboardTheme = themeVariant === 'dashboard';

    const renderLink = (view: ActiveView, label: string, icon: React.ReactNode) => (
        <NavLink
            label={label}
            icon={icon}
            isActive={activeView === view}
            onClick={() => setActiveView(view)}
            isDashboardTheme={isDashboardTheme}
        />
    );

    const renderSection = (title: string, children: React.ReactNode) => (
        <NavSection title={title} isDashboardTheme={isDashboardTheme}>
            {children}
        </NavSection>
    );
    
    return (
        <aside className={`w-64 flex-shrink-0 flex flex-col fixed md:sticky top-0 h-screen z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isDashboardTheme ? 'bg-[var(--background-sidebar)] p-5' : 'bg-[var(--background-secondary)] p-4 border-r border-[var(--border-primary)]'}`}>
            <div className={`flex items-center gap-3 mb-8 ${isDashboardTheme ? 'px-0' : 'px-2'}`}>
                {organization?.logoUrl ? (
                    <img src={organization.logoUrl} alt={`${organization.name} logo`} className={`w-10 h-10 object-contain ${isDashboardTheme ? 'rounded-lg' : 'rounded-full'}`} />
                ) : (
                    <div className={`w-10 h-10 flex items-center justify-center font-bold ${isDashboardTheme ? 'bg-white/10 text-white rounded-lg' : 'bg-[var(--background-accent-subtle)] text-[var(--text-accent)] rounded-full'}`}>
                        {organization?.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <span className={`text-xl font-bold ${isDashboardTheme ? 'text-white' : 'text-[var(--text-accent)]'}`}>{organization?.name || "Follow-up CRM"}</span>
            </div>

            <nav className="flex-grow overflow-y-auto custom-scrollbar -mr-2 pr-2">
                {userProfile?.role === UserRole.SUPER_ADMIN ? (
                    <>
                        {renderSection("Super Admin", 
                           renderLink('organizations', "Organizações", <Cog6ToothIcon className="w-6 h-6" />)
                        )}
                    </>
                ) : (
                    <>
                        {renderLink('dashboard', "Painel", <DashboardIcon className="w-6 h-6" />)}
                        
                        {renderSection("Vendas", <>
                            {renderLink('prospecting', "Prospecção", <FunnelIcon className="w-6 h-6" />)}
                            {renderLink('budgeting', "Orçamentos", <BriefcaseIcon className="w-6 h-6" />)}
                            {renderLink('deals', "Hub de Negócios", <CurrencyDollarIcon className="w-6 h-6" />)}
                            {renderLink('clients', "Clientes", <UserIcon className="w-6 h-6" />)}
                        </>)}

                        {renderSection("Organização", <>
                            {renderLink('calendar', "Calendário", <CalendarDaysIcon className="w-6 h-6" />)}
                            {renderLink('action-plan', "Plano de Ação", <ClipboardDocumentListIcon className="w-6 h-6" />)}
                        </>)}
                         
                        {renderSection("Análise", <>
                            {renderLink('reports', "Relatórios", <ChartBarIcon className="w-6 h-6" />)}
                            {renderLink('map', "Mapa", <MapPinIcon className="w-6 h-6" />)}
                        </>)}

                        {(userProfile?.role === UserRole.ADMIN || userProfile?.role === UserRole.MANAGER) && (
                            renderSection("Admin", 
                                renderLink('users', "Gerenciar Usuários", <UsersIcon className="w-6 h-6" />)
                            )
                        )}
                    </>
                )}
            </nav>
        </aside>
    );
};

export default Sidebar;