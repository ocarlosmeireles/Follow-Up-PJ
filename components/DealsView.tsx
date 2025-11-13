

import React, { useState, useMemo } from 'react';
import type { Budget, Client } from '../types';
import { BudgetStatus } from '../types';
import { 
    CalendarIcon, SparklesIcon, FireIcon, BuildingOffice2Icon, ClockIcon, HashtagIcon
} from './icons';
import BudgetAIAnalysisModal from './BudgetAIAnalysisModal';

interface DealsViewProps {
  budgets: Budget[];
  clients: Client[];
  onSelectBudget: (id: string) => void;
  onUpdateStatus: (id: string, status: BudgetStatus) => void;
  onScheduleFollowUp: (id: string, date: Date) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const timeSince = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
    let interval = seconds / 86400; // days
    if (interval > 1) {
      return `${Math.floor(interval)}d atrás`;
    }
    interval = seconds / 3600; // hours
    if (interval > 1) {
      return `${Math.floor(interval)}h atrás`;
    }
    interval = seconds / 60; // minutes
    if (interval > 1) {
      return `${Math.floor(interval)}min atrás`;
    }
    return 'agora';
};


const BudgetCard: React.FC<{
    budget: Budget;
    clientName: string;
    onSelect: (id: string) => void;
    onOpenAiModal: (budget: Budget) => void;
    isDragging: boolean;
}> = ({ budget, clientName, onSelect, onOpenAiModal, isDragging }) => {
    const STALE_THRESHOLD_DAYS = 15;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOverdue = budget.nextFollowUpDate && new Date(budget.nextFollowUpDate) < today && [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP].includes(budget.status);
    
    const lastActivityDate = useMemo(() => {
        if (budget.followUps.length > 0) {
            return new Date(Math.max(...budget.followUps.map(f => new Date(f.date).getTime())));
        }
        return new Date(budget.dateSent);
    }, [budget.followUps, budget.dateSent]);
    
    const daysSinceLastActivity = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 3600 * 24));
    const isStale = daysSinceLastActivity > STALE_THRESHOLD_DAYS;

    return (
        <div 
            className={`bg-[var(--background-secondary)] p-3 rounded-lg shadow-sm cursor-pointer border border-[var(--border-secondary)] hover:border-[var(--accent-primary)] transition-all duration-200 group ${isDragging ? 'opacity-50 rotate-2 shadow-2xl' : 'hover:-translate-y-1'}`} 
            onClick={() => onSelect(budget.id)}
        >
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-[var(--text-primary)] text-base pr-2">{budget.title}</h4>
                <button onClick={(e) => { e.stopPropagation(); onOpenAiModal(budget); }} className="p-1 rounded-full text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex-shrink-0" title="Análise com IA">
                    <SparklesIcon className="w-5 h-5"/>
                </button>
            </div>
            <p className="text-sm text-[var(--text-accent)] font-semibold mb-2 flex items-center gap-1.5" title={clientName}>
                <BuildingOffice2Icon className="w-4 h-4 flex-shrink-0"/>
                <span className="truncate">{clientName}</span>
            </p>
             <p className="text-xs text-[var(--text-secondary)] font-medium mb-2 flex items-center gap-1.5" title={`ID: ${budget.id}`}>
                <HashtagIcon className="w-4 h-4 flex-shrink-0"/>
                <span className="truncate">{budget.id.substring(0, 8)}...</span>
            </p>

            <div className="flex justify-between items-center text-sm font-semibold text-[var(--text-secondary)]">
                <span className="font-bold text-lg text-[var(--text-primary)]">{formatCurrency(budget.value)}</span>
                <div className="flex items-center gap-2">
                    {isStale && <span title={`Parado há ${daysSinceLastActivity} dias`} className="text-sky-500 font-bold text-xs animate-pulse">❄️</span>}
                    {isOverdue && <span className="text-red-500 font-bold text-xs">ATRASADO</span>}
                </div>
            </div>
            
            <div className="mt-2 pt-2 border-t border-[var(--border-primary)]/50 text-xs text-[var(--text-tertiary)] flex justify-between items-center">
                <div className="flex items-center gap-1.5" title={`Última atividade: ${lastActivityDate.toLocaleDateString()}`}>
                    <ClockIcon className="w-3 h-3"/>
                    <span>{timeSince(lastActivityDate.toISOString())}</span>
                </div>
                {budget.nextFollowUpDate && 
                    <div className="flex items-center gap-1.5 font-semibold" title="Próximo follow-up">
                        <CalendarIcon className="w-3 h-3"/>
                        <span>{new Date(budget.nextFollowUpDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                }
            </div>
        </div>
    );
};

const KanbanColumn: React.FC<{
    title: string;
    budgets: Budget[];
    clientMap: Map<string, string>;
    onSelectBudget: (id: string) => void;
    onOpenAiModal: (budget: Budget) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    isDraggingOver: boolean;
    draggingBudgetId: string | null;
    setDraggingBudgetId: (id: string | null) => void;
    className?: string;
    style?: React.CSSProperties;
}> = ({ title, budgets, clientMap, onSelectBudget, onOpenAiModal, onDragOver, onDrop, isDraggingOver, draggingBudgetId, setDraggingBudgetId, className, style }) => {
    
    const totalValue = useMemo(() => budgets.reduce((sum, b) => sum + b.value, 0), [budgets]);
    
    return (
        <div 
            onDragOver={onDragOver} 
            onDrop={onDrop}
            className={`flex-1 min-w-[320px] bg-[var(--background-tertiary)] rounded-lg p-3 flex flex-col transition-colors duration-300 ease-in-out ${className}`}
            style={style}
        >
            <div className="flex justify-between items-center mb-1 flex-shrink-0 px-1">
                <h3 className="font-semibold text-lg text-[var(--text-primary)]">{title}</h3>
                <span className="text-sm font-bold bg-[var(--background-secondary)] text-[var(--text-secondary)] rounded-full px-2.5 py-0.5">{budgets.length}</span>
            </div>
            <div className="text-sm font-bold text-[var(--text-accent)] mb-3 px-1">
                R$ {formatCurrency(totalValue)}
            </div>
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
                {budgets.map(budget => (
                    <div 
                        key={budget.id} 
                        draggable 
                        onDragStart={(e) => { e.dataTransfer.setData('budgetId', budget.id); setDraggingBudgetId(budget.id); }} 
                        onDragEnd={() => setDraggingBudgetId(null)}
                        className="mb-3"
                    >
                        <BudgetCard
                            budget={budget}
                            clientName={clientMap.get(budget.clientId) || 'Cliente Desconhecido'}
                            onSelect={onSelectBudget}
                            onOpenAiModal={onOpenAiModal}
                            isDragging={draggingBudgetId === budget.id}
                        />
                    </div>
                ))}
                {isDraggingOver && (
                    <div className="h-24 border-2 border-dashed border-[var(--border-secondary)] rounded-lg bg-[var(--background-tertiary-hover)] mt-2 transition-all"></div>
                )}
            </div>
        </div>
    );
};

const FilterButton: React.FC<{label: string; icon: string; isActive: boolean; onClick: () => void;}> = ({label, icon, isActive, onClick}) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 border ${isActive ? 'bg-[var(--accent-primary)] text-white border-transparent' : 'bg-[var(--background-secondary)] hover:bg-[var(--background-secondary-hover)] text-[var(--text-secondary)] border-[var(--border-primary)]'}`}>
        <span>{icon}</span> {label}
    </button>
)

const DealsView: React.FC<DealsViewProps> = ({ budgets, clients, onSelectBudget, onUpdateStatus, onScheduleFollowUp }) => {
    const [aiModalState, setAiModalState] = useState<{ isOpen: boolean, budget: Budget | null }>({ isOpen: false, budget: null });
    const [draggingOverColumn, setDraggingOverColumn] = useState<BudgetStatus | null>(null);
    const [draggingBudgetId, setDraggingBudgetId] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'all' | 'hot' | 'stale' | 'closingSoon'>('all');

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const filteredBudgets = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(new Date().getDate() - 30);
        const nextWeek = new Date();
        nextWeek.setDate(new Date().getDate() + 7);

        const activeDeals = budgets.filter(b => ![BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status));

        if (activeFilter === 'all') return budgets;

        if (activeFilter === 'hot') {
            const values = activeDeals.map(b => b.value).sort((a,b) => b-a);
            const top20Percentile = values[Math.floor(values.length * 0.20)] || 0;
            return budgets.filter(b => b.value >= top20Percentile && b.value > 0);
        }
        
        if (activeFilter === 'stale') {
            return budgets.filter(b => {
                const lastActivity = b.followUps.length > 0 
                    ? new Date(Math.max(...b.followUps.map(f => new Date(f.date).getTime())))
                    : new Date(b.dateSent);
                return lastActivity < thirtyDaysAgo && ![BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status);
            });
        }

        if (activeFilter === 'closingSoon') {
            return budgets.filter(b => 
                b.nextFollowUpDate && 
                new Date(b.nextFollowUpDate) >= new Date() &&
                new Date(b.nextFollowUpDate) <= nextWeek
            );
        }
        
        return budgets;
    }, [budgets, activeFilter]);

    const budgetsByStatus = useMemo(() => {
        const grouped: { [key in BudgetStatus]?: Budget[] } = {};
        filteredBudgets.forEach(budget => {
            (grouped[budget.status] = grouped[budget.status] || []).push(budget);
        });
        return grouped;
    }, [filteredBudgets]);
    
    const suggestedFollowUps = useMemo(() => {
        return budgets.filter(b =>
            (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP) &&
            !b.nextFollowUpDate
        );
    }, [budgets]);

    const handleScheduleClick = (budgetId: string) => {
        const date = new Date();
        date.setDate(date.getDate() + 3);
        onScheduleFollowUp(budgetId, date);
    };

    const handleOpenAiModal = (budget: Budget) => setAiModalState({ isOpen: true, budget });
    const handleCloseAiModal = () => setAiModalState({ isOpen: false, budget: null });

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: BudgetStatus) => {
        e.preventDefault();
        const budgetId = e.dataTransfer.getData('budgetId');
        const budget = budgets.find(b => b.id === budgetId);
        if (budget && budget.status !== newStatus) {
            onUpdateStatus(budgetId, newStatus);
        }
        setDraggingOverColumn(null);
    };
    
    const columns: BudgetStatus[] = [
        BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ORDER_PLACED, BudgetStatus.INVOICED, BudgetStatus.LOST,
    ];

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 flex-shrink-0 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)]">Hub de Negócios</h2>
                    <p className="text-[var(--text-secondary)] mt-1">Arraste os negócios para atualizar seu pipeline.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
                   <FilterButton label="Todos" icon="✨" isActive={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
                   <FilterButton label="Hot" icon="🔥" isActive={activeFilter === 'hot'} onClick={() => setActiveFilter('hot')} />
                   <FilterButton label="Stale" icon="❄️" isActive={activeFilter === 'stale'} onClick={() => setActiveFilter('stale')} />
                   <FilterButton label="Fechando" icon="🎯" isActive={activeFilter === 'closingSoon'} onClick={() => setActiveFilter('closingSoon')} />
                </div>
            </div>
            
            {suggestedFollowUps.length > 0 && (
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/40 dark:to-purple-900/40 p-4 rounded-lg border border-blue-200 dark:border-blue-800/50 animated-item shadow-sm">
                    <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-300 dark:to-purple-300 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5" />
                        Assistente de Vendas Proativo
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-300 mb-3">Estes negócios precisam de um próximo passo. Agende um follow-up para não perder a oportunidade.</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                        {suggestedFollowUps.map(budget => (
                            <div key={budget.id} className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-2 pl-3 rounded-md flex flex-wrap justify-between items-center shadow-sm gap-2 border border-black/5">
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-slate-200">{budget.title}</p>
                                    <p className="text-sm text-blue-600 dark:text-blue-400">{clientMap.get(budget.clientId) || 'Cliente'}</p>
                                </div>
                                <button
                                    onClick={() => handleScheduleClick(budget.id)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
                                >
                                    <CalendarIcon className="w-4 h-4" />
                                    Agendar (+3d)
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex-1 flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
                {columns.map((status, index) => (
                    <KanbanColumn
                        key={status}
                        title={status}
                        budgets={budgetsByStatus[status] || []}
                        clientMap={clientMap}
                        onSelectBudget={onSelectBudget}
                        onOpenAiModal={handleOpenAiModal}
                        onDragOver={(e) => { e.preventDefault(); setDraggingOverColumn(status); }}
                        onDrop={(e) => handleDrop(e, status)}
                        isDraggingOver={draggingOverColumn === status}
                        draggingBudgetId={draggingBudgetId}
                        setDraggingBudgetId={setDraggingBudgetId}
                        className="animated-item"
                        style={{ animationDelay: `${index * 80}ms` }}
                    />
                ))}
            </div>
            
            {aiModalState.isOpen && aiModalState.budget && (
                <BudgetAIAnalysisModal 
                    isOpen={aiModalState.isOpen}
                    onClose={handleCloseAiModal}
                    budget={aiModalState.budget}
                    clientName={clientMap.get(aiModalState.budget.clientId) || 'Cliente Desconhecido'}
                />
            )}
        </div>
    );
};

export default DealsView;
