import React, { useState, useMemo } from 'react';
import type { Budget, Client, Contact } from '../types';
import { BudgetStatus } from '../types';
import { MagnifyingGlassIcon, UserIcon, PrinterIcon, CalendarIcon } from './icons';

interface BudgetingViewProps {
  budgets: Budget[];
  clients: Client[];
  contacts: Contact[];
  onSelectBudget: (id: string) => void;
  onGenerateReport: (selectedIds: string[]) => void;
}

const getStatusBadgeColor = (status: BudgetStatus) => {
  switch (status) {
    case BudgetStatus.SENT:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    case BudgetStatus.FOLLOWING_UP:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    case BudgetStatus.INVOICED:
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    case BudgetStatus.LOST:
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    case BudgetStatus.ON_HOLD:
      return 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-200';
  }
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data inválida';
        const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day));
        return utcDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) {
        return 'Data inválida';
    }
};

const BudgetingView: React.FC<BudgetingViewProps> = ({ budgets, clients, contacts, onSelectBudget, onGenerateReport }) => {
    const [filter, setFilter] = useState<BudgetStatus | 'ALL' | 'OVERDUE'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(new Set());

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
    const contactMap = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);

    const filteredAndSortedBudgets = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return budgets
            .map(budget => ({
                ...budget,
                client: clientMap.get(budget.clientId),
                contact: contactMap.get(budget.contactId),
            }))
            .filter(budget => {
                let statusMatch = true;
                if (filter === 'OVERDUE') {
                    statusMatch = budget.nextFollowUpDate && new Date(budget.nextFollowUpDate) < today && (budget.status === BudgetStatus.SENT || budget.status === BudgetStatus.FOLLOWING_UP);
                } else if (filter !== 'ALL') {
                    statusMatch = budget.status === filter;
                }

                const lowerSearchTerm = searchTerm.toLowerCase();
                const searchMatch = searchTerm === '' ||
                    (budget.client?.name || '').toLowerCase().includes(lowerSearchTerm) ||
                    (budget.client?.cnpj || '').replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')) ||
                    budget.title.toLowerCase().includes(lowerSearchTerm) ||
                    (budget.contact?.name || '').toLowerCase().includes(lowerSearchTerm);

                return statusMatch && searchMatch;
            })
            .sort((a, b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime());
    }, [budgets, clientMap, contactMap, filter, searchTerm]);

    const handleSelect = (id: string, isSelected: boolean) => {
        setSelectedBudgetIds(prev => {
            const newSet = new Set(prev);
            if (isSelected) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleSelectAll = (isChecked: boolean) => {
        setSelectedBudgetIds(isChecked ? new Set(filteredAndSortedBudgets.map(b => b.id)) : new Set());
    };

    const isAllSelected = filteredAndSortedBudgets.length > 0 && selectedBudgetIds.size === filteredAndSortedBudgets.length;

    return (
        <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl shadow-lg border border-[var(--border-primary)] space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Gestão de Orçamentos</h2>
                    <p className="text-[var(--text-secondary)]">Visualize, filtre e gerencie todas as suas propostas.</p>
                </div>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
                     {selectedBudgetIds.size > 0 && (
                        <button onClick={() => onGenerateReport(Array.from(selectedBudgetIds))} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm">
                            <PrinterIcon className="w-5 h-5" />
                            Gerar Relatório ({selectedBudgetIds.size})
                        </button>
                    )}
                    <div className="relative w-full sm:w-64">
                         <span className="absolute inset-y-0 left-0 flex items-center pl-3"><MagnifyingGlassIcon className="w-5 h-5 text-gray-400" /></span>
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] text-[var(--text-primary)] rounded-lg p-2 pl-10 focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <select value={filter} onChange={(e) => setFilter(e.target.value as BudgetStatus | 'ALL' | 'OVERDUE')} className="w-full sm:w-auto bg-[var(--background-tertiary)] border border-[var(--border-secondary)] text-[var(--text-primary)] rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="ALL">Todos os Status</option>
                         <option value="OVERDUE">Atrasados</option>
                        {Object.values(BudgetStatus).map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="bg-[var(--background-tertiary)] rounded-lg overflow-hidden border border-[var(--border-primary)]">
                 {/* Header for list view */}
                <div className="grid grid-cols-12 gap-4 p-3 text-xs font-bold text-[var(--text-secondary)] uppercase border-b border-[var(--border-primary)] hidden md:grid">
                    <div className="col-span-1 flex items-center"><input type="checkbox" checked={isAllSelected} onChange={(e) => handleSelectAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /></div>
                    <div className="col-span-4">Orçamento</div>
                    <div className="col-span-2">Comprador</div>
                    <div className="col-span-2 text-right">Valor</div>
                    <div className="col-span-2 text-center">Status</div>
                    <div className="col-span-1 text-center">Data</div>
                </div>

                <div className="divide-y divide-[var(--border-primary)]">
                    {filteredAndSortedBudgets.length > 0 ? filteredAndSortedBudgets.map((budget, index) => {
                        const isOverdue = budget.nextFollowUpDate && new Date(budget.nextFollowUpDate) < new Date() && (budget.status === BudgetStatus.SENT || budget.status === BudgetStatus.FOLLOWING_UP);
                        return (
                            <div key={budget.id} className="animated-item" style={{ animationDelay: `${index * 30}ms`}}>
                                {/* Desktop view */}
                                <div className={`hidden md:grid grid-cols-12 gap-4 items-center p-3 cursor-pointer hover:bg-[var(--background-secondary-hover)] transition-colors ${selectedBudgetIds.has(budget.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                    <div className="col-span-1" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedBudgetIds.has(budget.id)} onChange={(e) => handleSelect(budget.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/></div>
                                    <div className="col-span-4" onClick={() => onSelectBudget(budget.id)}>
                                        <p className="font-bold text-[var(--text-primary)] truncate">{budget.title}</p>
                                        <p className="text-sm text-[var(--text-accent)] truncate">{budget.client?.name || 'Cliente'}</p>
                                    </div>
                                    <div className="col-span-2 text-sm text-[var(--text-secondary)]" onClick={() => onSelectBudget(budget.id)}>{budget.contact?.name || ''}</div>
                                    <div className="col-span-2 text-right font-semibold text-[var(--text-primary)]" onClick={() => onSelectBudget(budget.id)}>R$ {formatCurrency(budget.value)}</div>
                                    <div className="col-span-2 text-center" onClick={() => onSelectBudget(budget.id)}><span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusBadgeColor(budget.status)}`}>{budget.status}</span></div>
                                    <div className="col-span-1 text-center text-sm" onClick={() => onSelectBudget(budget.id)}>
                                        <p className={`font-semibold ${isOverdue ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}>{formatDate(budget.dateSent)}</p>
                                        {isOverdue && <p className="text-xs text-red-500 font-bold">Atrasado</p>}
                                    </div>
                                </div>
                                {/* Mobile view */}
                                <div className={`md:hidden p-4 space-y-3 cursor-pointer hover:bg-[var(--background-secondary-hover)] transition-colors ${selectedBudgetIds.has(budget.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                     <div onClick={() => onSelectBudget(budget.id)}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-[var(--text-primary)]">{budget.title}</p>
                                                <p className="text-sm text-[var(--text-accent)]">{budget.client?.name || ''}</p>
                                            </div>
                                            <div onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedBudgetIds.has(budget.id)} onChange={(e) => handleSelect(budget.id, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/></div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mt-2">
                                            <UserIcon className="w-4 h-4"/>
                                            <span>{budget.contact?.name || ''}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between border-t border-[var(--border-secondary)] pt-3 mt-3">
                                        <div>
                                            <p className="text-lg font-bold text-[var(--text-primary)]">R$ {formatCurrency(budget.value)}</p>
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getStatusBadgeColor(budget.status)}`}>{budget.status}</span>
                                        </div>
                                        <div className={`text-right text-sm font-semibold ${isOverdue ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}>
                                            <div className="flex items-center gap-1.5 justify-end"><CalendarIcon className="w-4 h-4"/> <span>{formatDate(budget.dateSent)}</span></div>
                                            {isOverdue && <p className="text-xs font-bold">Atrasado!</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="text-center py-16 text-[var(--text-tertiary)]">
                            <p>Nenhum orçamento encontrado.</p>
                            <p>Tente alterar os filtros ou a busca.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BudgetingView;