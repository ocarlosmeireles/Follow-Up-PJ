import React, { useState, useEffect } from 'react';
import type { Budget, Client, Contact } from '../types';
import { BudgetStatus } from '../types';
import { XMarkIcon, BriefcaseIcon, UserGroupIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, TrophyIcon, ChartPieIcon, CurrencyDollarIcon, ChartBarIcon, PlusIcon, WhatsAppIcon, ClipboardDocumentListIcon, PencilIcon, CheckCircleIcon } from './icons';

interface ClientDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client;
    contacts: Contact[];
    budgets: Budget[];
    onSelectBudget: (budgetId: string) => void;
    onAddBudgetForClient: (client: Client) => void;
    onUpdateClient: (clientId: string, updates: Partial<Client>, logoFile?: File) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const cleanPhoneNumber = (phone: string) => phone.replace(/\D/g, '');

const getStatusBadgeColor = (status: BudgetStatus) => {
  switch (status) {
    case BudgetStatus.SENT: return { classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', barColor: 'bg-blue-400 dark:bg-blue-600' };
    case BudgetStatus.FOLLOWING_UP: return { classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', barColor: 'bg-yellow-400 dark:bg-yellow-500' };
    case BudgetStatus.ORDER_PLACED: return { classes: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', barColor: 'bg-green-400 dark:bg-green-500' };
    case BudgetStatus.INVOICED: return { classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300', barColor: 'bg-emerald-400 dark:bg-emerald-500' };
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


const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ isOpen, onClose, client, contacts, budgets, onSelectBudget, onAddBudgetForClient, onUpdateClient }) => {
    const [notes, setNotes] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setNotes(client.notes || '');
            setLogoFile(null);
            setLogoPreview(client.logoUrl || null);
            setIsDirty(false);
        }
        return () => {
            if (logoPreview && logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(logoPreview);
            }
        }
    }, [isOpen, client]);
    
    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
        setIsDirty(true);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            if (logoPreview && logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(logoPreview);
            }
            setLogoPreview(URL.createObjectURL(file));
            setIsDirty(true);
        }
    };

    const handleSave = () => {
        const updates: Partial<Client> = {};
        if (notes !== (client.notes || '')) {
            updates.notes = notes;
        }
        onUpdateClient(client.id, updates, logoFile || undefined);
        setIsDirty(false);
        setLogoFile(null);
    };

    if (!isOpen) return null;

    // --- KPI Calculations ---
    const invoicedBudgets = budgets.filter(b => b.status === BudgetStatus.INVOICED);
    const lostBudgets = budgets.filter(b => b.status === BudgetStatus.LOST);
    const totalValueInvoiced = invoicedBudgets.reduce((sum, b) => sum + b.value, 0);
    const totalClosed = invoicedBudgets.length + lostBudgets.length;
    const conversionRate = totalClosed > 0 ? `${((invoicedBudgets.length / totalClosed) * 100).toFixed(0)}%` : 'N/A';
    const averageTicket = invoicedBudgets.length > 0 ? formatCurrency(totalValueInvoiced / invoicedBudgets.length) : 'N/A';
    
    // --- Chart Data Calculations ---
    const statusCounts = budgets.reduce((acc, budget) => {
        acc[budget.status] = (acc[budget.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const maxStatusCount = Math.max(0, ...Object.values(statusCounts).map(Number));

    const monthlyPerformance = invoicedBudgets.reduce((acc, b) => {
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col transform transition-all">
                <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-4 w-full">
                         <div className="relative group flex-shrink-0">
                            <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" id="client-logo-upload" />
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-lg object-contain bg-slate-100 dark:bg-slate-700 p-1"/>
                            ) : (
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                    <BriefcaseIcon className="w-8 h-8 text-slate-400"/>
                                </div>
                            )}
                            <label htmlFor="client-logo-upload" className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <PencilIcon className="w-6 h-6"/>
                            </label>
                        </div>
                        <div className="flex-grow">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100">{client.name}</h2>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-400 mt-2">
                                {client.cnpj && <span>CNPJ: {client.cnpj}</span>}
                                {client.address && <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4"/>{client.address}</span>}
                            </div>
                        </div>
                         <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 sm:ml-4">
                            <XMarkIcon className="w-7 h-7" />
                        </button>
                    </div>
                    <div className="flex items-center gap-4 mt-4 sm:mt-0 w-full sm:w-auto flex-wrap">
                        {isDirty && (
                             <button onClick={handleSave} className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 shadow-sm text-sm">
                                <CheckCircleIcon className="w-4 h-4 mr-2" />
                                Salvar
                            </button>
                        )}
                        <button
                            onClick={() => onAddBudgetForClient(client)}
                            className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors duration-200 shadow-sm text-sm"
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Novo Orçamento
                        </button>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar flex flex-col lg:grid lg:grid-cols-3 gap-6 p-4 sm:p-6 pt-0">
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
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold text-lg text-gray-700 dark:text-slate-300 flex items-center">
                                    <ClipboardDocumentListIcon className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400"/> Anotações Gerais
                                </h3>
                            </div>
                            <div className="bg-yellow-50/70 dark:bg-yellow-900/40 p-1 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                                <textarea
                                    value={notes}
                                    onChange={handleNotesChange}
                                    placeholder={"Adicione anotações sobre o cliente aqui..."}
                                    rows={5}
                                    className="w-full bg-transparent text-yellow-800 dark:text-yellow-200 text-sm focus:outline-none resize-y p-2"
                                />
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
                            <KPICard title="Total Faturado" value={formatCurrency(totalValueInvoiced)} icon={<TrophyIcon className="w-6 h-6 text-green-500 dark:text-green-400"/>} />
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
                            ) : <p className="text-center text-gray-400 dark:text-slate-500 text-sm py-8 italic">Nenhum negócio faturado para exibir.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientDetailModal;