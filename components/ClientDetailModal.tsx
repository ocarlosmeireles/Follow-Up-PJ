import React from 'react';
import type { Budget, Client, Contact } from '../types';
import { BudgetStatus } from '../types';
import { XMarkIcon, BriefcaseIcon, UserGroupIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, TrophyIcon, ChartPieIcon, CurrencyDollarIcon, ChartBarIcon, PlusIcon, WhatsAppIcon } from './icons';

interface ClientDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client;
    contacts: Contact[];
    budgets: Budget[];
    onSelectBudget: (budgetId: string) => void;
    onAddBudgetForClient: (client: Client) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

const cleanPhoneNumber = (phone: string) => phone.replace(/\D/g, '');

const getStatusBadgeColor = (status: BudgetStatus) => {
  switch (status) {
    case BudgetStatus.SENT: return { classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', barColor: 'bg-blue-400 dark:bg-blue-600' };
    case BudgetStatus.FOLLOWING_UP: return { classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', barColor: 'bg-yellow-400 dark:bg-yellow-500' };
    case BudgetStatus.WON: return { classes: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', barColor: 'bg-green-400 dark:bg-green-500' };
    case BudgetStatus.LOST: return { classes: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', barColor: 'bg-red-400 dark:bg-red-500' };
    case BudgetStatus.ON_HOLD: return { classes: 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200', barColor: 'bg-gray-400 dark:bg-slate-500' };
    default: return { classes: 'bg-gray-100 text-gray-700 dark:bg-slate-600 dark:text-slate-200', barColor: 'bg-gray-300 dark:bg-slate-600' };
  }
};

const KPICard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg flex items-center gap-3 border border-gray-200 dark:border-slate-700">
        <div className="flex-shrink-0">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-slate-400">{title}</p>
            <p className="text-lg font-bold text-gray-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);


const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ isOpen, onClose, client, contacts, budgets, onSelectBudget, onAddBudgetForClient }) => {
    if (!isOpen) return null;

    // --- KPI Calculations ---
    const wonBudgets = budgets.filter(b => b.status === BudgetStatus.WON);
    const lostBudgets = budgets.filter(b => b.status === BudgetStatus.LOST);
    const totalValueWon = wonBudgets.reduce((sum, b) => sum + b.value, 0);
    const totalClosed = wonBudgets.length + lostBudgets.length;
    const conversionRate = totalClosed > 0 ? `${((wonBudgets.length / totalClosed) * 100).toFixed(0)}%` : 'N/A';
    const averageTicket = wonBudgets.length > 0 ? formatCurrency(totalValueWon / wonBudgets.length) : 'N/A';
    
    // --- Chart Data Calculations ---
    const statusCounts = budgets.reduce((acc, budget) => {
        acc[budget.status] = (acc[budget.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const maxStatusCount = Math.max(0, ...Object.values(statusCounts).map(Number));

    const monthlyPerformance = wonBudgets.reduce((acc, b) => {
        const date = new Date(b.dateSent);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[monthKey]) acc[monthKey] = 0;
        acc[monthKey] += b.value;
        return acc;
    }, {} as { [key: string]: number });

    const sortedMonths = Object.keys(monthlyPerformance).sort().slice(-12);
    const monthlyChartData = sortedMonths.map(monthKey => {
        const [year, month] = monthKey.split('-');
        const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
        return { label, value: monthlyPerformance[monthKey] };
    });
    const maxMonthlyValue = Math.max(...monthlyChartData.map(d => d.value), 0);

    // --- General Data Prep ---
    const sortedBudgets = [...budgets].sort((a,b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime());

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-6xl m-4 max-h-[90vh] flex flex-col transform transition-all">
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{client.name}</h2>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-400 mt-2">
                            {client.cnpj && <span>CNPJ: {client.cnpj}</span>}
                            {client.address && <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4"/>{client.address}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onAddBudgetForClient(client)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm text-sm"
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Novo Orçamento
                        </button>
                        <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                            <XMarkIcon className="w-7 h-7" />
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                         <div>
                            <h3 className="font-semibold text-lg mb-3 text-gray-700 dark:text-slate-300 flex items-center"><UserGroupIcon className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400"/> Contatos</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {contacts.length > 0 ? contacts.map(contact => (
                                    <div key={contact.id} className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                                        <p className="font-bold text-gray-800 dark:text-slate-100">{contact.name}</p>
                                        {contact.email && (
                                            <a href={`mailto:${contact.email}`} className="text-xs text-gray-600 dark:text-slate-300 flex items-center gap-1.5 mt-1 truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                <EnvelopeIcon className="w-3 h-3 flex-shrink-0"/> {contact.email}
                                            </a>
                                        )}
                                        {contact.phone && (
                                            <div className="text-xs text-gray-600 dark:text-slate-300 flex items-center gap-1.5 mt-1">
                                                <PhoneIcon className="w-3 h-3 flex-shrink-0"/>
                                                <span>{contact.phone}</span>
                                                <a
                                                    href={`https://wa.me/55${cleanPhoneNumber(contact.phone)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Contatar no WhatsApp"
                                                    className="text-green-500 hover:text-green-600 transition-colors ml-2"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <WhatsAppIcon className="w-4 h-4" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )) : <p className="text-gray-400 dark:text-slate-500 italic col-span-full">Nenhum contato cadastrado.</p>}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg mb-3 text-gray-700 dark:text-slate-300 flex items-center"><BriefcaseIcon className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400"/> Histórico de Orçamentos ({budgets.length})</h3>
                            <div className="bg-gray-50/70 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs sticky top-0">
                                        <tr>
                                            <th className="p-3">Título</th>
                                            <th className="p-3">Contato</th>
                                            <th className="p-3 text-right">Valor</th>
                                            <th className="p-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="dark:divide-slate-700">
                                        {sortedBudgets.map(budget => {
                                            const contactName = contacts.find(c => c.id === budget.contactId)?.name || 'N/A';
                                            const statusColorClass = getStatusBadgeColor(budget.status).classes;
                                            return (
                                                <tr key={budget.id} onClick={() => onSelectBudget(budget.id)} className="border-t border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 cursor-pointer transition-colors duration-200">
                                                    <td className="p-3 font-medium text-gray-800 dark:text-slate-200">{budget.title}</td>
                                                    <td className="p-3 text-gray-600 dark:text-slate-300">{contactName}</td>
                                                    <td className="p-3 text-right text-gray-700 dark:text-slate-200 font-semibold">{formatCurrency(budget.value)}</td>
                                                    <td className="p-3 text-center">
                                                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${statusColorClass}`}>
                                                            {budget.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                         {budgets.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 dark:text-slate-500 p-8 italic">Nenhum orçamento para este cliente.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    {/* Analytics Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="space-y-3">
                            <h3 className="font-semibold text-lg text-gray-700 dark:text-slate-300">Performance</h3>
                            <KPICard title="Total Ganho" value={formatCurrency(totalValueWon)} icon={<TrophyIcon className="w-6 h-6 text-green-500 dark:text-green-400"/>} />
                            <KPICard title="Taxa de Conversão" value={conversionRate} icon={<ChartPieIcon className="w-6 h-6 text-yellow-500 dark:text-yellow-400"/>} />
                            <KPICard title="Ticket Médio" value={averageTicket} icon={<CurrencyDollarIcon className="w-6 h-6 text-blue-500 dark:text-blue-400"/>} />
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                            <h3 className="font-semibold text-gray-700 dark:text-slate-300 mb-3">Status dos Orçamentos</h3>
                            <div className="space-y-2 text-sm">
                                {Object.values(BudgetStatus).map(status => {
                                    const count = statusCounts[status] || 0;
                                    const percentage = maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
                                    const { barColor } = getStatusBadgeColor(status);
                                    return (
                                        <div key={status} className="flex items-center gap-2">
                                            <span className="w-24 text-gray-600 dark:text-slate-400 truncate text-xs">{status}</span>
                                            <div className="flex-grow bg-gray-200 dark:bg-slate-700 rounded-full h-4">
                                                <div className={`${barColor} h-4 rounded-full`} style={{ width: `${percentage}%` }}></div>
                                            </div>
                                            <span className="w-6 text-right font-semibold text-gray-800 dark:text-slate-200 text-xs">{count}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                         <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                            <h3 className="font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center"><ChartBarIcon className="w-5 h-5 mr-2 text-purple-500 dark:text-purple-400"/> Faturamento Mensal</h3>
                            {monthlyChartData.length > 0 ? (
                                <div className="h-48 flex items-end justify-around gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                                    {monthlyChartData.map(({ label, value }) => (
                                        <div key={label} className="flex flex-col items-center h-full flex-1" title={`${label}: ${formatCurrency(value)}`}>
                                            <div className="w-full h-full flex items-end">
                                                <div className="w-full bg-purple-500 hover:bg-purple-400 dark:bg-purple-600 dark:hover:bg-purple-500 rounded-t-md transition-all duration-300"
                                                    style={{ height: `${maxMonthlyValue > 0 ? (value / maxMonthlyValue) * 100 : 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-semibold capitalize">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-center text-gray-400 dark:text-slate-500 text-sm py-8 italic">Nenhum negócio ganho para exibir.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDetailModal;