import React from 'react';
import type { ActiveView } from '../App';
import type { UserProfile } from '../types';
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
} from './icons';

interface SidebarProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    isOpen: boolean;
    userProfile: UserProfile | null;
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
            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' 
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-slate-200'
        }`}
    >
        {icon}
        <span className="ml-3 font-semibold text-sm">{label}</span>
    </button>
);

const NavSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-6">
        <h3 className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{title}</h3>
        <div className="mt-2 space-y-1">
            {children}
        </div>
    </div>
);


const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, userProfile }) => {
    return (
        <aside className={`w-64 bg-white dark:bg-slate-800 p-4 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-slate-700 fixed md:sticky top-0 h-screen z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
            <div className="text-2xl font-bold text-blue-600 mb-8 px-2">
                Follow-up CRM
            </div>

            <nav className="flex-grow overflow-y-auto custom-scrollbar">
                 <NavLink 
                    label="Painel"
                    icon={<DashboardIcon className="w-6 h-6" />}
                    isActive={activeView === 'dashboard'}
                    onClick={() => setActiveView('dashboard')}
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
                        label="Negócios"
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
                        label="Tarefas"
                        icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
                        isActive={activeView === 'tasks'}
                        onClick={() => setActiveView('tasks')}
                    />
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

                {userProfile?.role === UserRole.ADMIN && (
                    <NavSection title="Admin">
                        <NavLink 
                            label="Gerenciar Usuários"
                            icon={<UsersIcon className="w-6 h-6" />}
                            isActive={activeView === 'users'}
                            onClick={() => setActiveView('users')}
                        />
                    </NavSection>
                )}
            </nav>

            <div className="mt-auto text-center text-xs text-gray-400 dark:text-gray-500 pt-4">
                <p>&copy; 2024 Follow-up CRM</p>
                <p>Todos os direitos reservados.</p>
            </div>
        </aside>
    );
};

export default Sidebar;