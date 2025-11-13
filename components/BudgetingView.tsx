import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Budget, Client, Contact } from '../types';
import { BudgetStatus } from '../types';
import { MagnifyingGlassIcon, UserIcon, PrinterIcon, ChevronDownIcon } from './icons';

interface BudgetingViewProps {
  budgets: Budget[];
  clients: Client[];
  contacts: Contact[];
  onSelectBudget: (id: string) => void;
  onGenerateReport: (selectedIds: string[]) => void;
  onBulkUpdateStatus: (selectedIds: string[], status: BudgetStatus) => void;
}

const getStatusBadgeColor = (status: BudgetStatus) => {
  switch (status) {
    case BudgetStatus.SENT:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    case BudgetStatus.FOLLOWING_UP:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    // FIX: Replaced BudgetStatus.WON with BudgetStatus.INVOICED to match the enum.
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
        const hasTime = dateString.includes('T');
        if (hasTime) {
            return date.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
            }).replace(',', ' às');
        } else {
            const [year, month, day] = dateString.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day));
            return utcDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        }
    } catch (e) {
        return 'Data inválida';
    }
};

const BudgetingView: React.FC<BudgetingViewProps> = ({ budgets, clients, contacts, onSelectBudget, onGenerateReport, onBulkUpdateStatus }) => {
    const [filter, setFilter] = useState<BudgetStatus | 'ALL' | 'OVERDUE'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(new Set());
    const [isBulkMenuOpen, setBulkMenuOpen] = useState(false);
    const bulkMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (bulkMenuRef.current && !bulkMenuRef.current.contains(event.target as Node)) {
                setBulkMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                // Status Filter
                let statusMatch = true;
                if (filter === 'OVERDUE') {
                    statusMatch = budget.nextFollowUpDate && new Date(budget.nextFollowUpDate) < today && (budget.status === BudgetStatus.SENT || budget.status === BudgetStatus.FOLLOWING_UP);
                } else if (filter !== 'ALL') {
                    statusMatch = budget.status === filter;
                }

                // Search Term Filter
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
            if (isSelected) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };

    const handleSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedBudgetIds(new Set(filteredAndSortedBudgets.map(b => b.id)));
        } else {
            setSelectedBudgetIds(new Set());
        }
    };
    
    const handleBulkAction = (status: BudgetStatus) => {
        if (window.confirm(`Tem certeza que deseja alterar o status de ${selectedBudgetIds.size} orçamentos para "${status}"?`)) {
            onBulkUpdateStatus(Array.from(selectedBudgetIds), status);
            setSelectedBudgetIds(new Set());
        }
        setBulkMenuOpen(false);
    };

    const isAllSelected = filteredAndSortedBudgets.length > 0 && selectedBudgetIds.size === filteredAndSortedBudgets.length;

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Gestão de Orçamentos</h2>
                    <p className="text-gray-500 dark:text-gray-400">Visualize, filtre e gerencie todas as suas propostas.</p>
                </div>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
                     <div className="flex items-center gap-2">
                         {selectedBudgetIds.size > 0 && (
                            <>
                                <button
                                    onClick={() => onGenerateReport(Array.from(selectedBudgetIds))}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm"
                                >
                                    <PrinterIcon className="w-5 h-5" />
                                    Relatório ({selectedBudgetIds.size})
                                </button>
                                <div className="relative" ref={bulkMenuRef}>
                                    <button
                                        onClick={() => setBulkMenuOpen(prev => !prev)}
                                        className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm"
                                    >
                                        Ações em Massa
                                        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isBulkMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isBulkMenuOpen && (
                                        <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-600 z-10">
                                            <div className="p-1">
                                                <p className="px-3 py-1 text-xs font-semibold text-gray-400">Alterar Status para:</p>
                                                <button onClick={() => handleBulkAction(BudgetStatus.FOLLOWING_UP)} className="w-full text-left p-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-slate-700">Em Follow-up</button>
                                                <button onClick={() => handleBulkAction(BudgetStatus.ON_HOLD)} className="w-full text-left p-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-slate-700">Congelado</button>
                                                <button onClick={() => handleBulkAction(BudgetStatus.LOST)} className="w-full text-left p-2 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30">Perdido</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="relative w-full sm:w-64">
                         <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 rounded-lg p-2 pl-10 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as BudgetStatus | 'ALL' | 'OVERDUE')}
                        className="w-full sm:w-auto bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="ALL">Todos os Status</option>
                         <option value="OVERDUE">Atrasados</option>
                        {Object.values(BudgetStatus).map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            <div>
                 {/* Table for medium screens and up */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="p-3 w-4"><input type="checkbox" checked={isAllSelected} onChange={(e) => handleSelectAll(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" /></th>
                                <th className="p-3">Título</th>
                                <th className="p-3">Cliente / CNPJ</th>
                                <th className="p-3">Comprador</th>
                                <th className="p-3 text-right">Valor</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Próximo Follow-up</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedBudgets.map(budget => (
                                <tr 
                                    key={budget.id}
                                    className={`border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors duration-200 ${selectedBudgetIds.has(budget.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                >
                                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                        <input type="checkbox" checked={selectedBudgetIds.has(budget.id)} onChange={(e) => handleSelect(budget.id, e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                    </td>
                                    <td className="p-3 text-gray-800 dark:text-slate-100 font-semibold" onClick={() => onSelectBudget(budget.id)}>{budget.title}</td>
                                    <td className="p-3" onClick={() => onSelectBudget(budget.id)}>
                                        <p className="font-medium text-blue-600 dark:text-blue-400">{budget.client?.name || ''}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">{budget.client?.cnpj || 'N/A'}</p>
                                    </td>
                                    <td className="p-3 text-gray-600 dark:text-slate-300" onClick={() => onSelectBudget(budget.id)}>{budget.contact?.name || ''}</td>
                                    <td className="p-3 text-right text-gray-700 dark:text-slate-200 font-semibold" onClick={() => onSelectBudget(budget.id)}>{formatCurrency(budget.value)}</td>
                                    <td className="p-3 text-center" onClick={() => onSelectBudget(budget.id)}>
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusBadgeColor(budget.status)}`}>
                                            {budget.status}
                                        </span>
                                    </td>
                                    <td className={`p-3 text-center font-medium ${budget.nextFollowUpDate && new Date(budget.nextFollowUpDate) < new Date() && (budget.status === BudgetStatus.SENT || budget.status === BudgetStatus.FOLLOWING_UP) ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-gray-600 dark:text-slate-400'}`} onClick={() => onSelectBudget(budget.id)}>
                                        {formatDate(budget.nextFollowUpDate)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Cards for small screens */}
                <div className="md:hidden space-y-4">
                    {filteredAndSortedBudgets.map(budget => (
                        <div 
                            key={budget.id}
                            className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-gray-200 dark:border-slate-700 space-y-2 cursor-pointer active:bg-gray-100 dark:active:bg-slate-700 relative ${selectedBudgetIds.has(budget.id) ? 'border-blue-500 ring-2 ring-blue-500' : ''}`}
                        >
                            <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                                <input type="checkbox" checked={selectedBudgetIds.has(budget.id)} onChange={(e) => handleSelect(budget.id, e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            </div>
                            <div onClick={() => onSelectBudget(budget.id)}>
                                <div className="flex justify-between items-start pr-8">
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-slate-100">{budget.title}</p>
                                        <p className="text-sm text-blue-600 dark:text-blue-400">{budget.client?.name || ''}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">{budget.client?.cnpj || 'N/A'}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1"><UserIcon className="w-3 h-3"/> {budget.contact?.name || ''}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full whitespace-nowrap ${getStatusBadgeColor(budget.status)}`}>
                                        {budget.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-end text-sm pt-2 border-t border-gray-100 dark:border-slate-700">
                                    <p className="text-blue-600 dark:text-blue-400 font-semibold">{formatCurrency(budget.value)}</p>
                                    <div className={`font-medium text-right ${budget.nextFollowUpDate && new Date(budget.nextFollowUpDate) < new Date() && (budget.status === BudgetStatus.SENT || budget.status === BudgetStatus.FOLLOWING_UP) ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-slate-300'}`}>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Próx. Contato</p>
                                        <p>{formatDate(budget.nextFollowUpDate)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                 {filteredAndSortedBudgets.length === 0 && (
                    <div className="text-center py-10 text-gray-400 dark:text-slate-500">
                        <p>Nenhum orçamento encontrado.</p>
                        <p>Tente alterar os filtros ou a busca.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BudgetingView;