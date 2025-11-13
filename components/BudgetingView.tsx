import React, { useState, useMemo } from 'react';
import type { Budget, Client, Contact } from '../types';
import { BudgetStatus } from '../types';
import { MagnifyingGlassIcon, PrinterIcon, CurrencyDollarIcon, TrophyIcon, ChartPieIcon, ArrowTrendingUpIcon, ChevronUpIcon, ChevronDownIcon } from './icons';

interface BudgetingViewProps {
  budgets: Budget[];
  clients: Client[];
  contacts: Contact[];
  onSelectBudget: (id: string) => void;
  onGenerateReport: (selectedIds: string[]) => void;
}

// --- TYPES & INTERFACES ---
type FormattedBudget = Budget & {
    client?: Client;
    contact?: Contact;
};
type SortKey = keyof FormattedBudget | 'client.name';


// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const getStatusPill = (status: BudgetStatus) => {
  const styles: {[key in BudgetStatus]: string} = {
    [BudgetStatus.SENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    [BudgetStatus.FOLLOWING_UP]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    [BudgetStatus.ORDER_PLACED]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    [BudgetStatus.INVOICED]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    [BudgetStatus.LOST]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    [BudgetStatus.ON_HOLD]: 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200',
  };
  return <span className={`px-2 py-0.5 text-xs font-bold rounded-full whitespace-nowrap ${styles[status]}`}>{status}</span>;
}


// --- SUB-COMPONENTS ---
// FIX: Added className prop to KPICard to allow passing additional classes.
const KPICard = ({ title, value, icon, style, className }: { title: string; value: string | number; icon: React.ReactNode; style?: React.CSSProperties; className?: string; }) => (
    <div style={style} className={`bg-[var(--background-secondary)] p-4 rounded-xl flex items-center gap-4 border border-[var(--border-primary)] shadow-sm ${className || ''}`}>
        <div className="bg-[var(--background-tertiary)] p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
    </div>
);

const SortableHeader: React.FC<{
    label: string;
    sortKey: SortKey;
    sortConfig: { key: SortKey; direction: 'asc' | 'desc' } | null;
    requestSort: (key: SortKey) => void;
    className?: string;
}> = ({ label, sortKey, sortConfig, requestSort, className }) => {
    const isSorted = sortConfig?.key === sortKey;
    const direction = isSorted ? sortConfig.direction : undefined;
    
    return (
        <th onClick={() => requestSort(sortKey)} className={`p-3 cursor-pointer select-none hover:bg-[var(--background-tertiary)] transition-colors ${className}`}>
            <div className="flex items-center gap-1">
                {label}
                {isSorted ? (
                    direction === 'asc' ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />
                ) : (
                    <ChevronDownIcon className="w-4 h-4 opacity-30" />
                )}
            </div>
        </th>
    );
};

// --- MAIN VIEW COMPONENT ---
const BudgetingView: React.FC<BudgetingViewProps> = ({ budgets, clients, contacts, onSelectBudget, onGenerateReport }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'dateSent', direction: 'desc' });
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'won' | 'lost'>('all');

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
    const contactMap = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);

    const formattedBudgets = useMemo<FormattedBudget[]>(() => {
        return budgets.map(budget => ({
            ...budget,
            client: clientMap.get(budget.clientId),
            contact: budget.contactId ? contactMap.get(budget.contactId) : undefined,
        }));
    }, [budgets, clientMap, contactMap]);

    const filteredAndSortedBudgets = useMemo(() => {
        let filtered = formattedBudgets;

        if (statusFilter !== 'all') {
            const activeStatuses = [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ORDER_PLACED, BudgetStatus.ON_HOLD];
            filtered = filtered.filter(b => {
                if (statusFilter === 'active') return activeStatuses.includes(b.status);
                if (statusFilter === 'won') return b.status === BudgetStatus.INVOICED;
                if (statusFilter === 'lost') return b.status === BudgetStatus.LOST;
                return true;
            });
        }
        
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(b => 
                b.title.toLowerCase().includes(lowerSearchTerm) ||
                (b.client?.name || '').toLowerCase().includes(lowerSearchTerm)
            );
        }

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                let aValue: any, bValue: any;
                if (sortConfig.key === 'client.name') {
                    aValue = a.client?.name || '';
                    bValue = b.client?.name || '';
                } else {
                    aValue = a[sortConfig.key as keyof Budget];
                    bValue = b[sortConfig.key as keyof Budget];
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [formattedBudgets, statusFilter, searchTerm, sortConfig]);

    const kpis = useMemo(() => {
        const wonBudgets = budgets.filter(b => b.status === BudgetStatus.INVOICED);
        const activeBudgets = budgets.filter(b => ![BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status));
        const wonValue = wonBudgets.reduce((sum, b) => sum + b.value, 0);
        const pipelineValue = activeBudgets.reduce((sum, b) => sum + b.value, 0);
        const averageTicket = wonBudgets.length > 0 ? wonValue / wonBudgets.length : 0;
        return { wonValue, pipelineValue, averageTicket };
    }, [budgets]);
    
    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleToggleSelect = (id: string) => {
        setSelectedBudgetIds(prev => {
            const newSet = new Set(prev);
            newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            return newSet;
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedBudgetIds(new Set(filteredAndSortedBudgets.map(b => b.id)));
        } else {
            setSelectedBudgetIds(new Set());
        }
    };

    const isAllSelected = selectedBudgetIds.size === filteredAndSortedBudgets.length && filteredAndSortedBudgets.length > 0;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">Hub de Orçamentos</h2>
                <p className="text-[var(--text-secondary)]">Uma visão completa e estratégica de suas propostas comerciais.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <KPICard style={{animationDelay: '100ms'}} className="animated-item" title="Pipeline Ativo" value={`R$ ${formatCurrency(kpis.pipelineValue)}`} icon={<CurrencyDollarIcon className="w-7 h-7 text-blue-500"/>} />
                <KPICard style={{animationDelay: '200ms'}} className="animated-item" title="Total Faturado" value={`R$ ${formatCurrency(kpis.wonValue)}`} icon={<TrophyIcon className="w-7 h-7 text-green-500"/>} />
                <KPICard style={{animationDelay: '300ms'}} className="animated-item" title="Ticket Médio (Ganhos)" value={`R$ ${formatCurrency(kpis.averageTicket)}`} icon={<ArrowTrendingUpIcon className="w-7 h-7 text-yellow-500"/>} />
            </div>
            
            <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-1 bg-[var(--background-tertiary)] p-1 rounded-lg self-start md:self-center">
                        {(['all', 'active', 'won', 'lost'] as const).map(filter => (
                            <button key={filter} onClick={() => setStatusFilter(filter)} className={`px-3 py-1 text-sm font-semibold rounded-md transition capitalize ${statusFilter === filter ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>{
                                {all: 'Todos', active: 'Ativos', won: 'Ganhos', lost: 'Perdidos'}[filter]
                            }</button>
                        ))}
                    </div>
                     <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4 self-stretch md:self-center">
                         {selectedBudgetIds.size > 0 && (
                            <button onClick={() => onGenerateReport(Array.from(selectedBudgetIds))} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm order-1 sm:order-2">
                                <PrinterIcon className="w-5 h-5" />
                                Gerar Relatório ({selectedBudgetIds.size})
                            </button>
                        )}
                        <div className="relative w-full sm:w-64 order-2 sm:order-1">
                             <span className="absolute inset-y-0 left-0 flex items-center pl-3"><MagnifyingGlassIcon className="w-5 h-5 text-[var(--text-tertiary)]" /></span>
                            <input type="text" placeholder="Buscar por título ou cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] text-[var(--text-primary)] rounded-lg p-2 pl-10 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"/>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--background-tertiary)] text-[var(--text-secondary)] uppercase text-xs">
                            <tr>
                                <th className="p-3 w-10"><input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/></th>
                                <SortableHeader label="Cliente / Orçamento" sortKey="client.name" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Valor" sortKey="value" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                                <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Data Envio" sortKey="dateSent" sortConfig={sortConfig} requestSort={requestSort} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-primary)]">
                            {filteredAndSortedBudgets.map(budget => (
                                <tr key={budget.id} className="hover:bg-[var(--background-secondary-hover)] transition-colors group">
                                    <td className="p-3"><input type="checkbox" checked={selectedBudgetIds.has(budget.id)} onChange={() => handleToggleSelect(budget.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/></td>
                                    <td className="p-3 cursor-pointer" onClick={() => onSelectBudget(budget.id)}>
                                        <p className="font-bold text-[var(--text-primary)] group-hover:text-[var(--text-accent)] transition-colors">{budget.client?.name || 'Cliente'}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{budget.title}</p>
                                    </td>
                                    <td className="p-3 font-semibold text-[var(--text-primary)] text-right">R$ {formatCurrency(budget.value)}</td>
                                    <td className="p-3">{getStatusPill(budget.status)}</td>
                                    <td className="p-3 text-[var(--text-secondary)]">{new Date(budget.dateSent).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredAndSortedBudgets.length === 0 && (
                    <div className="text-center py-16 text-[var(--text-tertiary)]">
                        <p className="font-semibold">Nenhum orçamento encontrado.</p>
                        <p className="text-sm">Tente limpar a busca ou adicione um novo orçamento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BudgetingView;