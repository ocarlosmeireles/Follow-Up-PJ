import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Organization, UserData, Client, Budget } from '../types';
import { BudgetStatus } from '../types';
import { BriefcaseIcon, CurrencyDollarIcon, MagnifyingGlassIcon, UserGroupIcon, ArrowRightStartOnRectangleIcon, CheckCircleIcon, XCircleIcon, TrashIcon } from './icons';

interface SuperAdminViewProps {
  organizations: Organization[];
  users: UserData[];
  clients: Client[];
  budgets: Budget[];
  onImpersonate: (org: Organization) => void;
  onToggleStatus: (orgId: string, currentStatus: 'active' | 'suspended') => void;
  onDelete: (orgId: string, orgName: string) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

type ExtendedOrg = Organization & {
    userCount: number;
    clientCount: number;
    budgetCount: number;
    totalRevenue: number;
};

const KPICard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg flex items-center gap-4 border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="bg-blue-50 dark:bg-slate-700 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

const EllipsisVerticalIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
);

const OrganizationCard: React.FC<{ 
    org: ExtendedOrg;
    onImpersonate: (org: Organization) => void;
    onToggleStatus: (orgId: string, currentStatus: 'active' | 'suspended') => void;
    onDelete: (orgId: string, orgName: string) => void;
}> = ({ org, onImpersonate, onToggleStatus, onDelete }) => {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isSuspended = org.status === 'suspended';

    return (
        <div className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 relative ${isSuspended ? 'opacity-60' : ''}`}>
            {isSuspended && <div className="absolute top-2 left-2 text-xs font-bold bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">SUSPENSA</div>}
            <div className="absolute top-2 right-2" ref={menuRef}>
                <button onClick={() => setMenuOpen(prev => !prev)} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">
                    <EllipsisVerticalIcon className="w-5 h-5"/>
                </button>
                {isMenuOpen && (
                     <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-10">
                         <button onClick={() => { onImpersonate(org); setMenuOpen(false); }} className="w-full text-left flex items-center gap-2 p-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700">
                             <ArrowRightStartOnRectangleIcon className="w-4 h-4" /> Entrar como Admin
                         </button>
                         <button onClick={() => { onToggleStatus(org.id, org.status); setMenuOpen(false); }} className={`w-full text-left flex items-center gap-2 p-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 ${isSuspended ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-500'}`}>
                             {isSuspended ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                             {isSuspended ? 'Reativar' : 'Suspender'}
                         </button>
                         <button onClick={() => { onDelete(org.id, org.name); setMenuOpen(false); }} className="w-full text-left flex items-center gap-2 p-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                            <TrashIcon className="w-4 h-4" /> Excluir
                         </button>
                     </div>
                )}
            </div>

            <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400 truncate pr-8">{org.name}</h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">ID: {org.id}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
                    <p className="font-semibold text-gray-700 dark:text-slate-200">{org.userCount}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Usuários</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
                    <p className="font-semibold text-gray-700 dark:text-slate-200">{org.clientCount}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Clientes</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
                    <p className="font-semibold text-gray-700 dark:text-slate-200">{org.budgetCount}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Orçamentos</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md">
                    <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(org.totalRevenue)}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Faturamento</p>
                </div>
            </div>
        </div>
    );
};

const SuperAdminView: React.FC<SuperAdminViewProps> = ({ organizations, users, clients, budgets, onImpersonate, onToggleStatus, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const extendedOrgs = useMemo<ExtendedOrg[]>(() => {
        return organizations.map(org => {
            const orgUsers = users.filter(u => u.organizationId === org.id);
            const orgClients = clients.filter(c => c.organizationId === org.id);
            const orgBudgets = budgets.filter(b => b.organizationId === org.id);
            const orgRevenue = orgBudgets
                // FIX: Replaced BudgetStatus.WON with BudgetStatus.INVOICED to match the enum.
                .filter(b => b.status === BudgetStatus.INVOICED)
                .reduce((sum, b) => sum + b.value, 0);

            return {
                ...org,
                userCount: orgUsers.length,
                clientCount: orgClients.length,
                budgetCount: orgBudgets.length,
                totalRevenue: orgRevenue,
            };
        });
    }, [organizations, users, clients, budgets]);
    
    const kpis = useMemo(() => {
        const totalRevenue = extendedOrgs.reduce((sum, org) => sum + org.totalRevenue, 0);
        return {
            totalOrgs: organizations.length,
            totalUsers: users.filter(u => u.role !== 'Super Admin').length,
            totalRevenue,
        }
    }, [extendedOrgs, organizations, users]);

    const filteredOrgs = useMemo(() => {
        const sortedOrgs = [...extendedOrgs].sort((a, b) => (a.status === 'suspended' ? 1 : -1) - (b.status === 'suspended' ? 1 : -1) || a.name.localeCompare(b.name));
        if (!searchTerm) return sortedOrgs;
        const lowerSearch = searchTerm.toLowerCase();
        return sortedOrgs.filter(org => org.name.toLowerCase().includes(lowerSearch));
    }, [extendedOrgs, searchTerm]);
    

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Painel do Super Administrador</h1>
                <p className="text-gray-500 dark:text-gray-400">Visão geral de todas as organizações na plataforma.</p>
            </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="animated-item" style={{ animationDelay: '100ms' }}><KPICard title="Total de Organizações" value={kpis.totalOrgs} icon={<BriefcaseIcon className="w-6 h-6 text-blue-500 dark:text-blue-400"/>} /></div>
                <div className="animated-item" style={{ animationDelay: '200ms' }}><KPICard title="Total de Usuários" value={kpis.totalUsers} icon={<UserGroupIcon className="w-6 h-6 text-purple-500 dark:text-purple-400"/>} /></div>
                <div className="animated-item" style={{ animationDelay: '300ms' }}><KPICard title="Receita Global" value={formatCurrency(kpis.totalRevenue)} icon={<CurrencyDollarIcon className="w-6 h-6 text-green-500 dark:text-green-400"/>} /></div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 animated-item" style={{ animationDelay: '400ms' }}>
                 <div className="relative w-full sm:w-96 mb-4">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar organização..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 rounded-lg py-2 pl-10 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {filteredOrgs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredOrgs.map((org, index) => <div className="animated-item" style={{ animationDelay: `${index * 50}ms`}} key={org.id}><OrganizationCard org={org} onImpersonate={onImpersonate} onToggleStatus={onToggleStatus} onDelete={onDelete} /></div>)}
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-400 dark:text-slate-500">
                        <p className="font-semibold text-gray-600 dark:text-slate-300">Nenhuma organização encontrada.</p>
                        <p>A busca não retornou resultados.</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default SuperAdminView;
