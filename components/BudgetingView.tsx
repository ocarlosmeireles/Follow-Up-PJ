import React, { useState, useMemo } from 'react';
import type { Budget, Client, Contact } from '../types';
import { BudgetStatus } from '../types';
import { MagnifyingGlassIcon, PrinterIcon, CurrencyDollarIcon, TrophyIcon, ChartPieIcon } from './icons';

interface BudgetingViewProps {
  budgets: Budget[];
  clients: Client[];
  contacts: Contact[];
  onSelectBudget: (id: string) => void;
  onGenerateReport: (selectedIds: string[]) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const KPICard = ({ title, value, icon, style }: { title: string; value: string | number; icon: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={style} className="bg-[var(--background-secondary)] p-4 rounded-xl flex items-center gap-4 border border-[var(--border-primary)] shadow-sm">
        <div className="bg-[var(--background-tertiary)] p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
    </div>
);

const PipelineOverview: React.FC<{ budgets: Budget[] }> = ({ budgets }) => {
    const pipelineStages = [
        BudgetStatus.SENT,
        BudgetStatus.FOLLOWING_UP,
        BudgetStatus.ON_HOLD,
        BudgetStatus.ORDER_PLACED,
    ];

    const data = useMemo(() => {
        const stageData = pipelineStages.map(stage => {
            const stageBudgets = budgets.filter(b => b.status === stage);
            const totalValue = stageBudgets.reduce((sum, b) => sum + b.value, 0);
            return { stage, totalValue, count: stageBudgets.length };
        });
        const maxValue = Math.max(...stageData.map(d => d.totalValue), 0);
        return { stageData, maxValue };
    }, [budgets]);

    if (data.maxValue === 0) return null;

    return (
        <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] shadow-sm">
            <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4">Pipeline de Orçamentos Ativos</h3>
            <div className="space-y-4">
                {data.stageData.map(({ stage, totalValue, count }) => (
                    <div key={stage}>
                        <div className="flex justify-between items-center mb-1 text-sm">
                            <span className="font-semibold text-[var(--text-secondary)]">{stage}</span>
                            <span className="font-bold text-[var(--text-primary)]">R$ {formatCurrency(totalValue)} <span className="text-xs font-normal text-[var(--text-tertiary)]">({count})</span></span>
                        </div>
                        <div className="bg-[var(--background-tertiary)] rounded-full h-3 w-full">
                            <div
                                className="bg-[var(--accent-primary)] h-3 rounded-full"
                                style={{ width: `${data.maxValue > 0 ? (totalValue / data.maxValue) * 100 : 0}%`, transition: 'width 0.5s ease-in-out' }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BudgetCard: React.FC<{ budget: any, onSelect: () => void, isSelected: boolean, onToggleSelect: () => void }> = ({ budget, onSelect, isSelected, onToggleSelect }) => {
    const statusInfo = useMemo(() => {
        const statusOrder = [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ON_HOLD, BudgetStatus.ORDER_PLACED, BudgetStatus.INVOICED, BudgetStatus.LOST];
        const currentIndex = statusOrder.indexOf(budget.status);
        const progress = currentIndex >= 4 ? 100 : ((currentIndex + 1) / 4) * 100;
        
        const colors: Record<BudgetStatus, string> = {
            [BudgetStatus.SENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
            [BudgetStatus.FOLLOWING_UP]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
            [BudgetStatus.INVOICED]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
            [BudgetStatus.LOST]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
            [BudgetStatus.ON_HOLD]: 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200',
            [BudgetStatus.ORDER_PLACED]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
        };

        return { progress, badgeClasses: colors[budget.status] || colors[BudgetStatus.ON_HOLD] };
    }, [budget.status]);
    
    return (
        <div className={`bg-[var(--background-secondary)] rounded-lg shadow-sm border transition-all duration-200 ${isSelected ? 'border-[var(--accent-primary)] shadow-md' : 'border-[var(--border-primary)] hover:border-[var(--border-secondary)] hover:shadow-md'}`}>
            <div className="p-4 cursor-pointer" onClick={onSelect}>
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-grow">
                        <p className="font-bold text-lg text-[var(--text-primary)] truncate">{budget.title}</p>
                        <p className="text-sm font-semibold text-[var(--text-accent)] truncate">{budget.client?.name || 'Cliente'}</p>
                    </div>
                     <span className={`px-2 py-0.5 text-xs font-bold rounded-full whitespace-nowrap ${statusInfo.badgeClasses}`}>{budget.status}</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mt-3 gap-2">
                     <p className="text-2xl font-bold text-[var(--text-primary)]">R$ {formatCurrency(budget.value)}</p>
                     <div className="text-sm text-[var(--text-secondary)] text-left sm:text-right">
                        <p>Enviado: {new Date(budget.dateSent).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                        <p>Comprador: {budget.contact?.name || 'N/A'}</p>
                     </div>
                </div>
            </div>
            <div className="bg-[var(--background-secondary-hover)] p-3 rounded-b-lg flex items-center gap-4">
                <input type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); onToggleSelect(); }} onClick={(e) => e.stopPropagation()} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                <div className="w-full bg-[var(--background-tertiary)] rounded-full h-1.5">
                    <div className="bg-[var(--accent-primary)] h-1.5 rounded-full" style={{ width: `${statusInfo.progress}%`, transition: 'width 0.5s ease' }}></div>
                </div>
            </div>
        </div>
    );
};


const BudgetingView: React.FC<BudgetingViewProps> = ({ budgets, clients, contacts, onSelectBudget, onGenerateReport }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(new Set());

    const clientMap = useMemo(() => new Map(clients.map(c => c)), [clients]);
    const contactMap = useMemo(() => new Map(contacts.map(c => c)), [contacts]);

    const kpis = useMemo(() => {
        const pipelineBudgets = budgets.filter(b => ![BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status));
        const wonBudgets = budgets.filter(b => b.status === BudgetStatus.INVOICED);

        const pipelineValue = pipelineBudgets.reduce((sum, b) => sum + b.value, 0);
        const wonValue = wonBudgets.reduce((sum, b) => sum + b.value, 0);

        const closedBudgets = budgets.filter(b => [BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status));
        const conversionRate = closedBudgets.length > 0 ? (wonBudgets.length / closedBudgets.length) * 100 : 0;

        return { pipelineValue, wonValue, conversionRate };
    }, [budgets]);
    

    const filteredBudgets = useMemo(() => {
        return budgets
            .map(budget => ({
                ...budget,
                client: clientMap.get(budget.clientId),
                contact: contactMap.get(budget.contactId),
            }))
            .filter(budget => {
                const lowerSearchTerm = searchTerm.toLowerCase();
                return searchTerm === '' ||
                    (budget.client?.name || '').toLowerCase().includes(lowerSearchTerm) ||
                    budget.title.toLowerCase().includes(lowerSearchTerm);
            })
            .sort((a, b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime());
    }, [budgets, clientMap, contactMap, searchTerm]);

    const handleToggleSelect = (id: string) => {
        setSelectedBudgetIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };


    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">Hub de Orçamentos</h2>
                <p className="text-[var(--text-secondary)]">Uma visão completa e estratégica de suas propostas comerciais.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <KPICard style={{animationDelay: '100ms'}} title="Pipeline Ativo" value={`R$ ${formatCurrency(kpis.pipelineValue)}`} icon={<CurrencyDollarIcon className="w-7 h-7 text-blue-500"/>} />
                <KPICard style={{animationDelay: '200ms'}} title="Total Faturado" value={`R$ ${formatCurrency(kpis.wonValue)}`} icon={<TrophyIcon className="w-7 h-7 text-green-500"/>} />
                <KPICard style={{animationDelay: '300ms'}} title="Taxa de Conversão" value={`${kpis.conversionRate.toFixed(1)}%`} icon={<ChartPieIcon className="w-7 h-7 text-yellow-500"/>} />
            </div>

            <PipelineOverview budgets={budgets} />
            
            <div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                     <h3 className="font-semibold text-lg text-[var(--text-primary)]">Todos os Orçamentos ({filteredBudgets.length})</h3>
                     <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
                         {selectedBudgetIds.size > 0 && (
                            <button onClick={() => onGenerateReport(Array.from(selectedBudgetIds))} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm">
                                <PrinterIcon className="w-5 h-5" />
                                Gerar Relatório ({selectedBudgetIds.size})
                            </button>
                        )}
                        <div className="relative w-full sm:w-64">
                             <span className="absolute inset-y-0 left-0 flex items-center pl-3"><MagnifyingGlassIcon className="w-5 h-5 text-[var(--text-tertiary)]" /></span>
                            <input type="text" placeholder="Buscar por título ou cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] text-[var(--text-primary)] rounded-lg p-2 pl-10 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"/>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredBudgets.length > 0 ? filteredBudgets.map((budget, index) => (
                        <div key={budget.id} className="animated-item" style={{ animationDelay: `${index * 30}ms`}}>
                            <BudgetCard 
                                budget={budget}
                                onSelect={() => onSelectBudget(budget.id)}
                                isSelected={selectedBudgetIds.has(budget.id)}
                                onToggleSelect={() => handleToggleSelect(budget.id)}
                            />
                        </div>
                    )) : (
                        <div className="text-center py-16 text-[var(--text-tertiary)] col-span-full bg-[var(--background-secondary)] rounded-lg border border-dashed border-[var(--border-primary)]">
                            <p className="font-semibold">Nenhum orçamento encontrado.</p>
                            <p className="text-sm">Tente limpar a busca ou adicione um novo orçamento.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BudgetingView;