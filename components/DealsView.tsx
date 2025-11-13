

import React, { useState, useMemo } from 'react';
import type { Budget, Client } from '../types';
import { BudgetStatus } from '../types';
import { 
    CalendarIcon, SparklesIcon, FireIcon, BuildingOffice2Icon, ExclamationTriangleIcon, ChevronUpIcon, ChevronDownIcon 
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

const BudgetCard: React.FC<{
    budget: Budget;
    clientName: string;
    onSelect: (id: string) => void;
    onOpenAiModal: (budget: Budget) => void;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
}> = ({ budget, clientName, onSelect, onOpenAiModal, isExpanded, onToggleExpand }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = budget.nextFollowUpDate && new Date(budget.nextFollowUpDate) < today && [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP].includes(budget.status);
    
    return (
        <div className="bg-[var(--background-secondary)] p-3 rounded-lg shadow-sm mb-3 cursor-pointer border border-[var(--border-secondary)] hover:border-[var(--accent-primary)] transition-all duration-200 group" onClick={() => onSelect(budget.id)}>
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-[var(--text-primary)] text-base pr-2">{budget.title}</h4>
                <button onClick={(e) => { e.stopPropagation(); onOpenAiModal(budget); }} className="p-1 rounded-full text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/50 flex-shrink-0">
                    <SparklesIcon className="w-5 h-5"/>
                </button>
            </div>
            <p className="text-sm text-[var(--text-accent)] font-semibold mb-2 flex items-center gap-2"><BuildingOffice2Icon className="w-4 h-4"/>{clientName}</p>
            
            <div className="flex justify-between items-center text-sm font-semibold text-[var(--text-secondary)]">
                <span>{formatCurrency(budget.value)}</span>
                {isOverdue && <span className="text-red-500 animate-pulse font-bold text-xs">ATRASADO</span>}
            </div>
            
            {isExpanded && (
                <div className="mt-2 pt-2 border-t border-[var(--border-primary)] text-xs text-[var(--text-secondary)] space-y-1">
                    {budget.nextFollowUpDate && <p className="flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> {new Date(budget.nextFollowUpDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>}
                    {budget.observations && <p className="italic">"{budget.observations}"</p>}
                </div>
            )}
            
            <div className="text-center mt-1">
                 <button onClick={(e) => { e.stopPropagation(); onToggleExpand(budget.id); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                    {isExpanded ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                </button>
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
    isExpanded: { [key: string]: boolean };
    onToggleExpand: (id: string) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    isDraggingOver: boolean;
}> = ({ title, budgets, clientMap, onSelectBudget, onOpenAiModal, isExpanded, onToggleExpand, onDragOver, onDrop, isDraggingOver }) => {
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, budgetId: string) => {
        e.dataTransfer.setData('budgetId', budgetId);
    };
    
    return (
        <div onDragOver={onDragOver} onDrop={onDrop} className={`flex-1 min-w-[300px] w-full sm:w-1/5 bg-[var(--background-tertiary)] rounded-lg p-3 flex flex-col transition-colors duration-200 ${isDraggingOver ? 'bg-slate-200 dark:bg-slate-700' : ''}`}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0 px-1">
                <h3 className="font-semibold text-lg text-[var(--text-primary)]">{title}</h3>
                <span className="text-sm font-bold bg-[var(--background-secondary)] text-[var(--text-secondary)] rounded-full px-2.5 py-0.5">{budgets.length}</span>
            </div>
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
                {budgets.map(budget => (
                    <div key={budget.id} draggable onDragStart={(e) => handleDragStart(e, budget.id)}>
                        <BudgetCard
                            budget={budget}
                            clientName={clientMap.get(budget.clientId) || 'Cliente Desconhecido'}
                            onSelect={onSelectBudget}
                            onOpenAiModal={onOpenAiModal}
                            isExpanded={!!isExpanded[budget.id]}
                            onToggleExpand={onToggleExpand}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};


const DealsView: React.FC<DealsViewProps> = ({ budgets, clients, onSelectBudget, onUpdateStatus, onScheduleFollowUp }) => {
    const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>({});
    const [aiModalState, setAiModalState] = useState<{ isOpen: boolean, budget: Budget | null }>({ isOpen: false, budget: null });
    const [draggingOverColumn, setDraggingOverColumn] = useState<BudgetStatus | null>(null);

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const budgetsByStatus = useMemo(() => {
        const grouped: { [key in BudgetStatus]?: Budget[] } = {};
        budgets.forEach(budget => {
            (grouped[budget.status] = grouped[budget.status] || []).push(budget);
        });
        return grouped;
    }, [budgets]);
    
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

    const handleToggleExpand = (id: string) => setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
    const handleOpenAiModal = (budget: Budget) => setAiModalState({ isOpen: true, budget });
    const handleCloseAiModal = () => setAiModalState({ isOpen: false, budget: null });

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: BudgetStatus) => {
        e.preventDefault();
        const budgetId = e.dataTransfer.getData('budgetId');
        if (budgetId) {
            onUpdateStatus(budgetId, newStatus);
        }
        setDraggingOverColumn(null);
    };
    
    const columns: BudgetStatus[] = [
        BudgetStatus.SENT,
        BudgetStatus.FOLLOWING_UP,
        BudgetStatus.ORDER_PLACED,
        BudgetStatus.INVOICED,
        BudgetStatus.LOST,
    ];

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)] flex items-center"><FireIcon className="w-6 h-6 mr-2 text-red-500"/> Hub de Negócios</h2>
                    <p className="text-[var(--text-secondary)]">Arraste os negócios entre as colunas para atualizar o status.</p>
                </div>
            </div>
            
            {suggestedFollowUps.length > 0 && (
                <div className="mb-6 bg-amber-50 dark:bg-amber-900/40 p-4 rounded-lg border border-amber-200 dark:border-amber-800/50 animated-item">
                    <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        Ações Sugeridas
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">Estes orçamentos precisam de um próximo passo. Agende um follow-up para não perder a oportunidade.</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                        {suggestedFollowUps.map(budget => (
                            <div key={budget.id} className="bg-white dark:bg-slate-800 p-2 rounded-md flex flex-wrap justify-between items-center shadow-sm gap-2">
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-slate-200">{budget.title}</p>
                                    <p className="text-sm text-blue-600 dark:text-blue-400">{clientMap.get(budget.clientId) || 'Cliente'}</p>
                                </div>
                                <button
                                    onClick={() => handleScheduleClick(budget.id)}
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-1 px-3 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
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
                {columns.map(status => (
                    <KanbanColumn
                        key={status}
                        title={status}
                        budgets={budgetsByStatus[status] || []}
                        clientMap={clientMap}
                        onSelectBudget={onSelectBudget}
                        onOpenAiModal={handleOpenAiModal}
                        isExpanded={expandedCards}
                        onToggleExpand={handleToggleExpand}
                        onDragOver={(e) => { e.preventDefault(); setDraggingOverColumn(status); }}
                        onDrop={(e) => handleDrop(e, status)}
                        isDraggingOver={draggingOverColumn === status}
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
