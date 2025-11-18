import React, { useState, useMemo, useRef } from 'react';
import type { Budget, Client, Contact } from '../types';
import { BudgetStatus } from '../types';
import { MagnifyingGlassIcon, PrinterIcon, CurrencyDollarIcon, TrophyIcon, ArrowTrendingUpIcon, ChevronUpIcon, ChevronDownIcon, ChartPieIcon, PencilSquareIcon, ExclamationTriangleIcon } from './icons';

interface BudgetingViewProps {
  budgets: Budget[];
  clients: Client[];
  contacts: Contact[];
  onSelectBudget: (id: string) => void;
  onGenerateReport: (selectedIds: string[]) => void;
  onBulkUpdate: (ids: string[], updates: Partial<Budget>) => void;
}

// --- TYPES & INTERFACES ---
type FormattedBudget = Budget & {
    client?: Client;
    contact?: Contact;
};
type SortKey = keyof FormattedBudget | 'client.name' | 'id';


// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const getStatusStyles = (status: BudgetStatus) => {
  const styles: {[key in BudgetStatus]: { pill: string; bar: string }} = {
    [BudgetStatus.SENT]: { pill: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', bar: 'border-l-blue-500' },
    [BudgetStatus.FOLLOWING_UP]: { pill: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', bar: 'border-l-yellow-500' },
    [BudgetStatus.ORDER_PLACED]: { pill: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', bar: 'border-l-green-500' },
    [BudgetStatus.WAITING_MATERIAL]: { pill: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300', bar: 'border-l-orange-500' },
    [BudgetStatus.INVOICED]: { pill: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300', bar: 'border-l-emerald-500' },
    [BudgetStatus.LOST]: { pill: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', bar: 'border-l-red-500' },
    [BudgetStatus.ON_HOLD]: { pill: 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200', bar: 'border-l-gray-400' },
  };
  return styles[status] || styles[BudgetStatus.ON_HOLD];
}

const isStale = (budget: Budget): boolean => {
    if (budget.status !== BudgetStatus.SENT && budget.status !== BudgetStatus.FOLLOWING_UP) {
        return false;
    }
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let lastActivityDate;
    if (budget.followUps && budget.followUps.length > 0) {
        const latestFollowUpDate = Math.max(...budget.followUps.map(fu => new Date(fu.date).getTime()));
        lastActivityDate = new Date(latestFollowUpDate);
    } else {
        lastActivityDate = new Date(budget.dateSent);
    }

    return lastActivityDate < sevenDaysAgo;
};


// --- SUB-COMPONENTS ---
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
const BudgetingView: React.FC<BudgetingViewProps> = ({ budgets, clients, contacts, onSelectBudget, onGenerateReport, onBulkUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'dateSent', direction: 'desc' });
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'won' | 'lost'>('all');
    const [showStatusChanger, setShowStatusChanger] = useState(false);
    const statusChangerRef = useRef<HTMLDivElement>(null);

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
    const contactMap = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);

    const formattedBudgets = useMemo<FormattedBudget[]>(() => {
        return budgets.map(budget => ({
            ...budget,
            client: clientMap.get(budget.clientId),
            contact: budget.contactId ? contactMap.get(budget.contactId) : undefined,
        }));
    }, [budgets, clientMap, contactMap]);

    const kpis = useMemo(() => {
        const wonBudgets = budgets.filter(b => b.status === BudgetStatus.INVOICED);
        const lostBudgets = budgets.filter(b => b.status === BudgetStatus.LOST);
        const activeBudgets = budgets.filter(b => ![BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status));
        
        const wonValue = wonBudgets.reduce((sum, b) => sum + b.value, 0);
        const pipelineValue = activeBudgets.reduce((sum, b) => sum + b.value, 0);
        const averageTicket = wonBudgets.length > 0 ? wonValue / wonBudgets.length : 0;
        
        const totalClosed = wonBudgets.length + lostBudgets.length;
        const conversionRate = totalClosed > 0 ? `${((wonBudgets.length / totalClosed) * 100).toFixed(1)}%` : 'N/A';
        
        return { wonValue, pipelineValue, averageTicket, conversionRate };
    }, [budgets]);

    const filteredAndSortedBudgets = useMemo(() => {
        let filtered = formattedBudgets;

        if (statusFilter !== 'all') {
            const activeStatuses = [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ORDER_PLACED, BudgetStatus.WAITING_MATERIAL, BudgetStatus.ON_HOLD];
            filtered = filtered.filter(b => {
                if (statusFilter === 'active') return activeStatuses.includes(b.status);
                if (statusFilter === 'won') return b.status === BudgetStatus.INVOICED;
                if (statusFilter === 'lost') return b.status === BudgetStatus.LOST;
                return true;
            });
        }
        
        if (searchTerm) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            const numericSearchTerm = searchTerm.replace(/\D/g, '');
            filtered = filtered.filter(b => 
                b.title.toLowerCase().includes(lowerSearchTerm) ||
                b.id.toLowerCase().includes(lowerSearchTerm) ||
                (b.client?.name || '').toLowerCase().includes(lowerSearchTerm) ||
                (numericSearchTerm && (b.client?.cnpj || '').replace(/\D/g, '').includes(numericSearchTerm))
            );
        }

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                let aValue: any, bValue: any;
                if (sortConfig.key === 'client.name') {
                    aValue = a.client?.name || '';
                    bValue = b.client?.name || '';
                } else {
                    aValue = a[sortConfig.key as keyof FormattedBudget];
                    bValue = b[sortConfig.key as keyof FormattedBudget];
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [formattedBudgets, statusFilter, searchTerm, sortConfig]);

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

    const handleBulkStatusChange = (status: BudgetStatus) => {
        if (selectedBudgetIds.size > 0) {
            onBulkUpdate(Array.from(selectedBudgetIds), { status });
            setSelectedBudgetIds(new Set());
            setShowStatusChanger(false);
        }
    };

    const isAllSelected = selectedBudgetIds.size > 0 && selectedBudgetIds.size === filteredAndSortedBudgets.length;
    const isAnySelected = selectedBudgetIds.size > 0;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">Central de Propostas</h2>
                <p className="text-[var(--text-secondary)]">Uma visão completa e inteligente de suas propostas comerciais.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <KPICard style={{animationDelay: '100ms'}} className="animated-item" title="Pipeline Ativo" value={`R$ ${formatCurrency(kpis.pipelineValue)}`} icon={<CurrencyDollarIcon className="w-7 h-7 text-blue-500"/>} />
                <KPICard style={{animationDelay: '200ms'}} className="animated-item" title="Total Faturado" value={`R$ ${formatCurrency(kpis.wonValue)}`} icon={<TrophyIcon className="w-7 h-7 text-green-500"/>} />
                <KPICard style={{animationDelay: '300ms'}} className="animated-item" title="Ticket Médio" value={`R$ ${formatCurrency(kpis.averageTicket)}`} icon={<ArrowTrendingUpIcon className="w-7 h-7 text-yellow-500"/>} />
                <KPICard style={{animationDelay: '400ms'}} className="animated-item" title="Taxa de Conversão" value={kpis.conversionRate} icon={<ChartPieIcon className="w-7 h-7 text-purple-500"/>} />
            </div>
            
            <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] shadow-sm animated-item" style={{ animationDelay: '500ms' }}>
                 <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-1 bg-[var(--background-tertiary)] p-1 rounded-lg self-start w-full md:w-auto overflow-x-auto">
                        {(['all', 'active', 'won', 'lost'] as const).map(filter => (
                            <button key={filter} onClick={() => setStatusFilter(filter)} className={`px-3 py-1 text-sm font-semibold rounded-md transition whitespace-nowrap ${statusFilter === filter ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>{
                                {all: 'Todos', active: 'Ativos', won: 'Ganhos', lost: 'Perdidos'}[filter]
                            }</button>
                        ))}
                    </div>
                     <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-4 self-stretch md:self-center">
                        <div className="relative w-full sm:w-64">
                             <span className="absolute inset-y-0 left-0 flex items-center pl-3"><MagnifyingGlassIcon className="w-5 h-5 text-[var(--text-tertiary)]" /></span>
                            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] text-[var(--text-primary)] rounded-lg p-2 pl-10 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"/>
                        </div>
                    </div>
                </div>

                {/* --- TABLE VIEW for md+ screens --- */}
                <div className="overflow-x-auto hidden md:block">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-[var(--background-tertiary)] text-[var(--text-secondary)] uppercase text-xs">
                            <tr>
                                <th className="p-3 w-10">
                                    <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} disabled={filteredAndSortedBudgets.length === 0} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                </th>
                                <SortableHeader label="Orçamento" sortKey="title" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Cliente" sortKey="client.name" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Valor" sortKey="value" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                                <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label="Data Envio" sortKey="dateSent" sortConfig={sortConfig} requestSort={requestSort} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-primary)]">
                            {filteredAndSortedBudgets.map((budget, index) => {
                                const isBudgetStale = isStale(budget);
                                return (
                                <tr 
                                    key={budget.id} 
                                    className={`hover:bg-[var(--background-secondary-hover)] transition-colors group animated-item border-l-4 ${getStatusStyles(budget.status).bar} ${selectedBudgetIds.has(budget.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                                    style={{ animationDelay: `${index * 30}ms`}}
                                >
                                    <td className="p-3"><input type="checkbox" checked={selectedBudgetIds.has(budget.id)} onChange={() => handleToggleSelect(budget.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/></td>
                                    <td className="p-3 cursor-pointer" onClick={() => onSelectBudget(budget.id)}>
                                        <div className="flex items-center gap-2">
                                            {isBudgetStale && <span title="Atenção: Orçamento sem follow-up há mais de 7 dias."><ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" /></span>}
                                            <p className="font-bold text-[var(--text-primary)] group-hover:text-[var(--text-accent)] transition-colors truncate" title={budget.title}>{budget.title}</p>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <p className="font-semibold text-[var(--text-primary)] truncate" title={budget.client?.name}>{budget.client?.name || 'Cliente'}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{budget.client?.cnpj || 'CNPJ não informado'}</p>
                                    </td>
                                    <td className="p-3 font-semibold text-[var(--text-primary)] text-right">R$ {formatCurrency(budget.value)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full whitespace-nowrap ${getStatusStyles(budget.status).pill}`}>
                                            {budget.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-[var(--text-secondary)]">{new Date(budget.dateSent).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>

                {/* --- CARD VIEW for small screens --- */}
                <div className="space-y-3 md:hidden">
                    {filteredAndSortedBudgets.map((budget, index) => {
                        const isBudgetStale = isStale(budget);
                        return (
                        <div key={budget.id} className={`bg-[var(--background-secondary-hover)] p-3 rounded-lg border-l-4 animated-item ${getStatusStyles(budget.status).bar} ${selectedBudgetIds.has(budget.id) ? 'ring-2 ring-blue-500' : ''}`} style={{ animationDelay: `${index * 30}ms`}}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <input type="checkbox" checked={selectedBudgetIds.has(budget.id)} onChange={() => handleToggleSelect(budget.id)} className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                    <div>
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer"
                                            onClick={() => onSelectBudget(budget.id)}
                                        >
                                            {isBudgetStale && <span title="Atenção: Orçamento sem follow-up há mais de 7 dias."><ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" /></span>}
                                            <p className="font-bold text-[var(--text-primary)] hover:text-[var(--text-accent)]">{budget.title}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-[var(--text-secondary)]">{budget.client?.name || 'Cliente'}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 text-xs font-bold rounded-full whitespace-nowrap ${getStatusStyles(budget.status).pill}`}>
                                    {budget.status}
                                </span>
                            </div>
                            <div className="mt-3 flex justify-between items-end">
                                <div className="text-sm text-[var(--text-secondary)]">
                                    <p>Enviado em:</p>
                                    <p className="font-semibold">{new Date(budget.dateSent).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-[var(--text-primary)] text-right">R$ {formatCurrency(budget.value)}</p>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>


                {filteredAndSortedBudgets.length === 0 && (
                    <div className="text-center py-16 text-[var(--text-tertiary)]">
                        <p className="font-semibold">Nenhum orçamento encontrado.</p>
                        <p className="text-sm">Tente limpar a busca ou adicione um novo orçamento.</p>
                    </div>
                )}
            </div>

             {isAnySelected && (
                <div className="fixed bottom-0 left-0 md:left-64 right-0 z-30 transform translate-y-0 transition-transform duration-300">
                    <div className="bg-[var(--background-secondary)] p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)] border-t border-[var(--border-primary)] flex justify-between items-center">
                        <span className="font-semibold text-sm">{selectedBudgetIds.size} selecionado(s)</span>
                        <div className="flex items-center gap-2">
                             <div className="relative" ref={statusChangerRef}>
                                <button onClick={() => setShowStatusChanger(p => !p)} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold py-2 px-3 rounded-lg flex items-center gap-2 text-sm">
                                    <PencilSquareIcon className="w-4 h-4" /> Alterar Status
                                </button>
                                {showStatusChanger && (
                                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-[var(--background-secondary)] rounded-lg shadow-lg border border-[var(--border-primary)] overflow-hidden">
                                        {[BudgetStatus.ON_HOLD, BudgetStatus.LOST, BudgetStatus.WAITING_MATERIAL].map(status => (
                                            <button key={status} onClick={() => handleBulkStatusChange(status)} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--background-tertiary)]">{status}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => onGenerateReport(Array.from(selectedBudgetIds))} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 font-semibold py-2 px-3 rounded-lg flex items-center gap-2 text-sm">
                                <PrinterIcon className="w-4 h-4" /> Relatório
                            </button>
                            <button onClick={() => setSelectedBudgetIds(new Set())} className="text-sm font-semibold py-2 px-3">Limpar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetingView;