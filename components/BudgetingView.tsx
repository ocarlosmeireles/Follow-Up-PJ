import React, { useState, useMemo } from 'react';
import type { Budget, Client, Contact } from '../types';
import { BudgetStatus } from '../types';
import { MagnifyingGlassIcon, UserIcon } from './icons';

interface BudgetingViewProps {
  budgets: Budget[];
  clients: Client[];
  contacts: Contact[];
  onSelectBudget: (id: string) => void;
}

const getStatusBadgeColor = (status: BudgetStatus) => {
  switch (status) {
    case BudgetStatus.SENT:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    case BudgetStatus.FOLLOWING_UP:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    case BudgetStatus.WON:
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
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    // Handles date format yyyy-mm-dd
    const date = new Date(dateString);
    // Adjust for timezone offset
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return new Intl.DateTimeFormat('pt-BR').format(adjustedDate);
};

const BudgetingView: React.FC<BudgetingViewProps> = ({ budgets, clients, contacts, onSelectBudget }) => {
    const [filter, setFilter] = useState<BudgetStatus | 'ALL' | 'OVERDUE'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

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

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Gestão de Orçamentos</h2>
                    <p className="text-gray-500 dark:text-gray-400">Visualize, filtre e gerencie todas as suas propostas.</p>
                </div>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
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
                                    onClick={() => onSelectBudget(budget.id)}
                                    className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors duration-200"
                                >
                                    <td className="p-3 text-gray-800 dark:text-slate-100 font-semibold">{budget.title}</td>
                                    <td className="p-3">
                                        <p className="font-medium text-blue-600 dark:text-blue-400">{budget.client?.name || ''}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">{budget.client?.cnpj || 'N/A'}</p>
                                    </td>
                                    <td className="p-3 text-gray-600 dark:text-slate-300">{budget.contact?.name || ''}</td>
                                    <td className="p-3 text-right text-gray-700 dark:text-slate-200 font-semibold">{formatCurrency(budget.value)}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusBadgeColor(budget.status)}`}>
                                            {budget.status}
                                        </span>
                                    </td>
                                    <td className={`p-3 text-center font-medium ${budget.nextFollowUpDate && new Date(budget.nextFollowUpDate) < new Date() && (budget.status === BudgetStatus.SENT || budget.status === BudgetStatus.FOLLOWING_UP) ? 'text-red-500 dark:text-red-400 animate-pulse' : 'text-gray-600 dark:text-slate-400'}`}>
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
                            onClick={() => onSelectBudget(budget.id)}
                            className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-gray-200 dark:border-slate-700 space-y-2 cursor-pointer active:bg-gray-100 dark:active:bg-slate-700"
                        >
                            <div className="flex justify-between items-start">
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