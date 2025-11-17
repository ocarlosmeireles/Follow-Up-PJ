import React, { useState, useMemo, useCallback } from 'react';
import type { Budget, Client, Contact } from '../types';
import { BudgetStatus } from '../types';
import { MagnifyingGlassIcon, UserPlusIcon, UserGroupIcon, CurrencyDollarIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon, Squares2X2Icon, ViewColumnsIcon, ChevronUpIcon, ChevronDownIcon, ArrowDownTrayIcon, TrashIcon } from './icons';

interface ClientsViewProps {
  clients: Client[];
  contacts: Contact[];
  budgets: Budget[];
  onSelectClient: (clientId: string) => void;
  onAddClientClick: () => void;
  onBulkDelete: (clientIds: string[]) => void;
}

type ExtendedClient = Client & {
    budgetCount: number;
    contactCount: number;
    totalValue: number;
    lastActivityDate: Date | null;
    activityStatus: 'active' | 'inactive' | 'idle';
    daysSinceActivity: number | null;
    wonBudgets: Budget[];
};

type SortKey = keyof ExtendedClient | 'name' | 'totalValue' | 'budgetCount' | 'lastActivityDate';


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const KPICard = ({ title, value, icon, className = '', style }: { title: string, value: string | number, icon: React.ReactNode, className?: string, style?: React.CSSProperties }) => (
    <div style={style} className={`bg-white dark:bg-slate-800 p-4 rounded-lg flex items-center gap-4 border border-gray-200 dark:border-slate-700 shadow-sm ${className}`}>
        <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

const ActivityBadge: React.FC<{ status: ExtendedClient['activityStatus'], showText?: boolean }> = ({ status, showText = false }) => {
    const config = {
        active: { color: 'bg-green-500', text: 'Ativo', textColor: 'text-green-600 dark:text-green-400' },
        inactive: { color: 'bg-yellow-500', text: 'Inativo', textColor: 'text-yellow-600 dark:text-yellow-400' },
        idle: { color: 'bg-gray-400', text: 'Ocioso', textColor: 'text-gray-500 dark:text-gray-400' },
    };
    const { color, text, textColor } = config[status];

    return (
        <div className="flex items-center gap-1.5" title={text}>
            <span className={`w-2 h-2 rounded-full ${color}`}></span>
            {showText && <span className={`text-xs font-semibold ${textColor}`}>{text}</span>}
        </div>
    );
};

const ClientCard: React.FC<{ client: ExtendedClient, onSelectClient: (id: string) => void, isSelected: boolean, onToggleSelect: (id: string) => void, style?: React.CSSProperties, className?: string }> = ({ client, onSelectClient, isSelected, onToggleSelect, style, className }) => {
    
    return (
        <div style={style} className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col p-4 transition-all duration-200 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 ${isSelected ? 'border-blue-500 ring-2 ring-blue-500' : ''} ${className || ''}`}>
            <div className="flex-grow">
                <div className="flex justify-between items-start">
                     <div className="flex items-start gap-3">
                         <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => onToggleSelect(client.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1.5 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div onClick={() => onSelectClient(client.id)} className="cursor-pointer">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-slate-100">{client.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{client.cnpj || 'Sem CNPJ'}</p>
                        </div>
                    </div>
                    <ActivityBadge status={client.activityStatus} />
                </div>
                
                <div onClick={() => onSelectClient(client.id)} className="cursor-pointer">
                    <div className="grid grid-cols-3 gap-2 text-center my-4 py-2 border-y border-gray-100 dark:border-slate-700">
                        <div>
                            <p className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(client.totalValue)}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Ganhos</p>
                        </div>
                        <div>
                            <p className="font-bold text-gray-700 dark:text-slate-200">{client.budgetCount}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Orçamentos</p>
                        </div>
                         <div>
                            <p className="font-bold text-gray-700 dark:text-slate-200">{client.contactCount}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Contatos</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                        Última atividade: {client.lastActivityDate ? client.lastActivityDate.toLocaleDateString('pt-BR') : 'Nenhuma'}
                    </p>
                </div>
            </div>
            <div className="mt-4 flex gap-2">
                <button onClick={() => onSelectClient(client.id)} className="w-full text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-gray-800 dark:text-slate-200 font-semibold py-2 px-3 rounded-md transition-colors">
                    Ver Detalhes
                </button>
            </div>
        </div>
    );
};

const SortableHeader: React.FC<{ label: string; sortKey: SortKey; sortConfig: { key: SortKey; direction: 'asc' | 'desc' } | null; requestSort: (key: SortKey) => void; className?: string; }> = ({ label, sortKey, sortConfig, requestSort, className }) => {
    const isSorted = sortConfig?.key === sortKey;
    return (
        <th onClick={() => requestSort(sortKey)} className={`p-3 cursor-pointer select-none hover:bg-[var(--background-tertiary)] transition-colors ${className}`}>
            <div className="flex items-center gap-1">
                {label}
                {isSorted ? (sortConfig.direction === 'asc' ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />) : <ChevronDownIcon className="w-4 h-4 opacity-30" />}
            </div>
        </th>
    );
};


const ClientsView: React.FC<ClientsViewProps> = ({ clients, contacts, budgets, onSelectClient, onAddClientClick, onBulkDelete }) => {
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'totalValue', direction: 'desc' });
    const [selectedClientIds, setSelectedClientIds] = useState(new Set<string>());

    const clientData = useMemo<ExtendedClient[]>(() => {
        const INACTIVE_THRESHOLD_DAYS = 90;
        const now = new Date();

        return clients.map(client => {
            const clientBudgets = budgets.filter(b => b.clientId === client.id);
            const clientContacts = contacts.filter(c => c.clientId === client.id);
            
            let lastActivityDate: Date | null = null;
            if (clientBudgets.length > 0) {
                const dates = clientBudgets.flatMap(b => [new Date(b.dateSent), ...b.followUps.map(f => new Date(f.date))]).filter(d => !isNaN(d.getTime()));
                if(dates.length > 0) {
                     lastActivityDate = new Date(Math.max(...dates.map(d => d.getTime())));
                }
            }
            
            let activityStatus: 'active' | 'inactive' | 'idle' = 'idle';
            let daysSinceActivity: number | null = null;

            if (lastActivityDate) {
                const diffTime = Math.abs(now.getTime() - lastActivityDate.getTime());
                daysSinceActivity = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                activityStatus = daysSinceActivity > INACTIVE_THRESHOLD_DAYS ? 'inactive' : 'active';
            }
            
            const wonBudgets = clientBudgets.filter(b => b.status === BudgetStatus.INVOICED);
            const totalValue = wonBudgets.reduce((sum, b) => sum + b.value, 0);

            return {
                ...client,
                budgetCount: clientBudgets.length,
                contactCount: clientContacts.length,
                totalValue,
                lastActivityDate,
                activityStatus,
                daysSinceActivity,
                wonBudgets,
            };
        });
    }, [clients, contacts, budgets]);

    const kpis = useMemo(() => {
        const activeClients = clientData.filter(c => c.activityStatus === 'active').length;
        const inactiveClients = clientData.filter(c => c.activityStatus === 'inactive').length;
        const totalRevenue = clientData.reduce((sum, c) => sum + c.totalValue, 0);
        return {
            totalClients: clients.length,
            activeClients,
            inactiveClients,
            totalRevenue,
        };
    }, [clientData, clients.length]);
    
    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredClients = useMemo(() => {
        let filtered = clientData
            .filter(client => {
                const statusMatch = filter === 'all' || client.activityStatus === filter;
                const searchMatch = searchTerm === '' ||
                    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (client.cnpj && client.cnpj.replace(/\D/g,'').includes(searchTerm.replace(/\D/g,'')));
                return statusMatch && searchMatch;
            });

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === null) return 1;
                if (bValue === null) return -1;
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [clientData, searchTerm, filter, sortConfig]);
    
    const isAllSelected = sortedAndFilteredClients.length > 0 && selectedClientIds.size === sortedAndFilteredClients.length;

    const handleToggleSelect = (clientId: string) => {
        setSelectedClientIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(clientId)) {
                newSet.delete(clientId);
            } else {
                newSet.add(clientId);
            }
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedClientIds(new Set(sortedAndFilteredClients.map(c => c.id)));
        } else {
            setSelectedClientIds(new Set());
        }
    };
    
    const handleExportSelected = () => {
        const selected = sortedAndFilteredClients.filter(c => selectedClientIds.has(c.id));
        if (selected.length === 0) return;

        const headers = ["ID", "Nome", "CNPJ", "Endereço", "Orçamentos (Qtd)", "Valor Ganho (R$)", "Última Atividade"];
        const rows = selected.map(c => [
            c.id,
            `"${c.name.replace(/"/g, '""')}"`,
            c.cnpj || '',
            c.address ? `"${c.address.replace(/"/g, '""')}"` : '',
            c.budgetCount,
            c.totalValue.toString().replace('.', ','),
            c.lastActivityDate ? c.lastActivityDate.toLocaleDateString('pt-BR') : ''
        ].join(';')); 

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(';'), ...rows].join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "clientes_exportados.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkDeleteClick = () => {
        onBulkDelete(Array.from(selectedClientIds));
        setSelectedClientIds(new Set());
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Hub de Clientes</h1>
                    <p className="text-gray-500 dark:text-gray-400">Sua central de inteligência sobre a carteira de clientes.</p>
                </div>
                <button onClick={onAddClientClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm self-start md:self-center">
                    <UserPlusIcon className="w-5 h-5 mr-2" />
                    Novo Cliente
                </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard style={{ animationDelay: '100ms' }} className="animated-item" title="Total de Clientes" value={kpis.totalClients} icon={<UserGroupIcon className="w-6 h-6 text-blue-500 dark:text-blue-400"/>} />
                <KPICard style={{ animationDelay: '200ms' }} className="animated-item" title="Clientes Ativos" value={kpis.activeClients} icon={<ArrowTrendingUpIcon className="w-6 h-6 text-green-500 dark:text-green-400"/>} />
                <KPICard style={{ animationDelay: '300ms' }} className="animated-item" title="Clientes Inativos" value={kpis.inactiveClients} icon={<ExclamationTriangleIcon className="w-6 h-6 text-yellow-500 dark:text-yellow-400"/>} />
                <KPICard style={{ animationDelay: '400ms' }} className="animated-item" title="Receita Total" value={formatCurrency(kpis.totalRevenue)} icon={<CurrencyDollarIcon className="w-6 h-6 text-purple-500 dark:text-purple-400"/>} />
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700/50 p-1 rounded-lg">
                        <button onClick={() => setFilter('all')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${filter === 'all' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>Todos</button>
                        <button onClick={() => setFilter('active')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${filter === 'active' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>Ativos</button>
                        <button onClick={() => setFilter('inactive')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${filter === 'inactive' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>Inativos</button>
                    </div>
                     <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative w-full sm:w-72">
                             <span className="absolute inset-y-0 left-0 flex items-center pl-3"><MagnifyingGlassIcon className="w-5 h-5 text-gray-400" /></span>
                            <input type="text" placeholder="Buscar por nome ou CNPJ..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 rounded-lg py-2 pl-10 focus:ring-blue-500 focus:border-blue-500"/>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700/50 p-1 rounded-lg">
                            <button onClick={() => setViewMode('card')} title="Visualização em Grade" className={`p-1.5 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'}`}><Squares2X2Icon className="w-5 h-5"/></button>
                            <button onClick={() => setViewMode('list')} title="Visualização em Lista" className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'}`}><ViewColumnsIcon className="w-5 h-5"/></button>
                        </div>
                     </div>
                </div>

                {sortedAndFilteredClients.length > 0 ? (
                    viewMode === 'card' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {sortedAndFilteredClients.map((client, index) => (
                                <ClientCard style={{ animationDelay: `${index * 50}ms` }} className="animated-item" key={client.id} client={client} onSelectClient={onSelectClient} isSelected={selectedClientIds.has(client.id)} onToggleSelect={handleToggleSelect} />
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[var(--background-tertiary)] text-[var(--text-secondary)] uppercase text-xs">
                                    <tr>
                                        <th className="p-3 w-10">
                                            <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} disabled={sortedAndFilteredClients.length === 0} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        </th>
                                        <th className="p-3">Status</th>
                                        <SortableHeader label="Cliente" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} />
                                        <SortableHeader label="Valor Total" sortKey="totalValue" sortConfig={sortConfig} requestSort={requestSort} />
                                        <SortableHeader label="Orçamentos" sortKey="budgetCount" sortConfig={sortConfig} requestSort={requestSort} />
                                        <SortableHeader label="Última Atividade" sortKey="lastActivityDate" sortConfig={sortConfig} requestSort={requestSort} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedAndFilteredClients.map((client, index) => (
                                        <tr key={client.id} className={`border-b border-[var(--border-primary)] last:border-b-0 hover:bg-[var(--background-secondary-hover)] animated-item ${selectedClientIds.has(client.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`} style={{ animationDelay: `${index * 30}ms` }}>
                                            <td className="p-3">
                                                <input type="checkbox" checked={selectedClientIds.has(client.id)} onChange={() => handleToggleSelect(client.id)} onClick={(e) => e.stopPropagation()} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                            </td>
                                            <td className="p-3"><ActivityBadge status={client.activityStatus} /></td>
                                            <td className="p-3 cursor-pointer" onClick={() => onSelectClient(client.id)}>
                                                <p className="font-bold text-[var(--text-primary)]">{client.name}</p>
                                                <p className="text-xs text-[var(--text-secondary)]">{client.cnpj || 'Sem CNPJ'}</p>
                                            </td>
                                            <td className="p-3 font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(client.totalValue)}</td>
                                            <td className="p-3 font-semibold text-center">{client.budgetCount}</td>
                                            <td className="p-3">{client.lastActivityDate ? client.lastActivityDate.toLocaleDateString('pt-BR') : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    <div className="text-center py-16 text-gray-400 dark:text-slate-500">
                        <p className="font-semibold text-gray-600 dark:text-slate-300">Nenhum cliente encontrado.</p>
                        <p>Tente ajustar a busca ou os filtros.</p>
                    </div>
                )}
            </div>
            {selectedClientIds.size > 0 && (
                <div className="fixed bottom-0 left-0 md:left-64 right-0 z-30 bg-[var(--background-secondary)] p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)] border-t border-[var(--border-primary)] flex justify-between items-center transition-transform duration-300">
                    <span className="font-semibold text-sm text-[var(--text-primary)]">{selectedClientIds.size} selecionado(s)</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedClientIds(new Set())} className="text-sm font-semibold py-2 px-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Limpar</button>
                        <button onClick={handleExportSelected} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold py-2 px-3 rounded-lg flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <ArrowDownTrayIcon className="w-4 h-4" /> Exportar
                        </button>
                        <button onClick={handleBulkDeleteClick} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-lg flex items-center gap-2 text-sm">
                            <TrashIcon className="w-4 h-4" /> Excluir
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientsView;