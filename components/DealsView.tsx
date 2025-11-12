import React, { useState, useMemo } from 'react';
import type { Budget, Client } from '../types';
import { BudgetStatus } from '../types';
import { CalendarIcon, ExclamationTriangleIcon, SparklesIcon } from './icons';
import BudgetAIAnalysisModal from './BudgetAIAnalysisModal';


interface DealsViewProps {
  budgets: Budget[];
  clients: Client[];
  onSelectBudget: (id: string) => void;
  onUpdateStatus: (budgetId: string, newStatus: BudgetStatus) => void;
}

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
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
        return 'Inválido';
    }
}

const BudgetCard: React.FC<{ 
    budget: Budget; 
    clientName: string; 
    onSelect: (id: string) => void; 
    onAnalyze: (budget: Budget) => void;
}> = ({ budget, clientName, onSelect, onAnalyze }) => {
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('budgetId', budget.id);
    };

    const isStale = useMemo(() => {
        const now = new Date();
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(now.getDate() - 2);

        if (budget.nextFollowUpDate) {
            return new Date(budget.nextFollowUpDate) < twoDaysAgo;
        }
        
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(now.getDate() - 14);

        const lastInteractionDate = budget.followUps.length > 0
            ? new Date(Math.max(...budget.followUps.map(f => new Date(f.date).getTime())))
            : new Date(budget.dateSent);
            
        return lastInteractionDate < fourteenDaysAgo;
    }, [budget.nextFollowUpDate, budget.followUps, budget.dateSent]);


    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onClick={() => onSelect(budget.id)}
            className={`bg-[var(--background-secondary)] p-3 rounded-lg shadow-sm mb-3 cursor-pointer hover:bg-[var(--background-secondary-hover)] border border-[var(--border-secondary)] hover:border-[var(--accent-primary)] transition-all duration-200 relative group
                ${isStale ? 'border-amber-400 dark:border-amber-500' : ''}
            `}
        >
            {isStale && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full" title="Negócio parado. Realize um follow-up."></div>}
            <h4 className="font-bold text-[var(--text-primary)] text-base truncate">{budget.title}</h4>
            <p className="text-sm text-[var(--text-accent)] font-semibold mb-2 truncate">{clientName}</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(budget.value)}</p>
            <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] mt-2 pt-2 border-t border-[var(--border-primary)]">
                <div className="flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4"/>
                    <span>{formatDate(budget.nextFollowUpDate)}</span>
                </div>
                 <button 
                    onClick={(e) => { e.stopPropagation(); onAnalyze(budget); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--background-tertiary)] hover:bg-[var(--background-tertiary-hover)] text-[var(--text-accent)] p-1.5 rounded-full"
                    title="Analisar com IA"
                 >
                    <SparklesIcon className="w-4 h-4"/>
                </button>
            </div>
        </div>
    );
};

const PipelineChart: React.FC<{ budgets: Budget[] }> = ({ budgets }) => {
    const pipelineData = useMemo(() => {
        const stages = [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ON_HOLD];
        const data = stages.map(status => ({
            status,
            value: budgets.filter(b => b.status === status).reduce((sum, b) => sum + b.value, 0),
        }));
        const totalValue = data.reduce((sum, d) => sum + d.value, 0);
        return { data, totalValue };
    }, [budgets]);
    
    if (pipelineData.totalValue === 0) return null;

    return (
        <div className="mb-6 bg-[var(--background-secondary)] p-4 rounded-xl border border-[var(--border-primary)] shadow-sm">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">Pipeline de Vendas: <span className="text-[var(--text-accent)] font-bold">{formatCurrency(pipelineData.totalValue)}</span></h3>
            <div className="w-full flex rounded-lg overflow-hidden h-8 bg-[var(--background-tertiary)]">
                {pipelineData.data.map(({ status, value }) => {
                    const percentage = (value / pipelineData.totalValue) * 100;
                    const colors = {
                        [BudgetStatus.SENT]: 'bg-blue-500',
                        [BudgetStatus.FOLLOWING_UP]: 'bg-yellow-500',
                        [BudgetStatus.ON_HOLD]: 'bg-gray-500',
                    }
                    if (percentage === 0) return null;
                    return (
                        <div key={status} style={{ width: `${percentage}%` }} className={`h-full transition-all duration-500 ${colors[status as keyof typeof colors]}`} title={`${status}: ${formatCurrency(value)}`}></div>
                    );
                })}
            </div>
             <div className="flex justify-start items-center gap-4 mt-2 text-xs">
                {pipelineData.data.map(({status, value}) => (
                    <div key={status} className="flex items-center gap-1.5">
                         <div className={`w-2.5 h-2.5 rounded-full ${ { [BudgetStatus.SENT]: 'bg-blue-500', [BudgetStatus.FOLLOWING_UP]: 'bg-yellow-500', [BudgetStatus.ON_HOLD]: 'bg-gray-500' }[status as 'Enviado' | 'Em Follow-up' | 'Congelado']}`}></div>
                         <span className="text-[var(--text-secondary)]">{status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const DealsView: React.FC<DealsViewProps> = ({ budgets, clients, onSelectBudget, onUpdateStatus }) => {
    const [draggingOverColumn, setDraggingOverColumn] = useState<BudgetStatus | null>(null);
    const [analysisModal, setAnalysisModal] = useState<{ isOpen: boolean, budget: Budget | null }>({ isOpen: false, budget: null });
    
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const budgetsByStatus = useMemo(() => {
        const grouped: { [key in BudgetStatus]: Budget[] } = {
            [BudgetStatus.SENT]: [],
            [BudgetStatus.FOLLOWING_UP]: [],
            [BudgetStatus.ON_HOLD]: [],
            [BudgetStatus.WON]: [],
            [BudgetStatus.LOST]: [],
        };

        budgets.forEach(budget => {
            if (grouped[budget.status]) {
                grouped[budget.status]!.push(budget);
            }
        });
        return grouped;
    }, [budgets]);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: BudgetStatus) => {
        e.preventDefault();
        const budgetId = e.dataTransfer.getData('budgetId');
        const budget = budgets.find(b => b.id === budgetId);
        
        if (budgetId && budget && budget.status !== newStatus) {
            onUpdateStatus(budgetId, newStatus);
        }
        setDraggingOverColumn(null);
    }
    
    const handleOpenAnalysis = (budget: Budget) => {
        setAnalysisModal({ isOpen: true, budget });
    };

    const handleCloseAnalysis = () => {
        setAnalysisModal({ isOpen: false, budget: null });
    };

    const columns: BudgetStatus[] = [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ON_HOLD, BudgetStatus.WON, BudgetStatus.LOST];
    
    return (
        <div className="flex flex-col h-full">
            <PipelineChart budgets={budgets} />
            <div className="flex gap-6 overflow-x-auto pb-4 flex-grow">
                {columns.map(status => (
                    <div
                        key={status}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDraggingOverColumn(status);
                        }}
                        onDrop={(e) => handleDrop(e, status)}
                        onDragEnter={() => setDraggingOverColumn(status)}
                        onDragLeave={() => setDraggingOverColumn(null)}
                        className={`flex-1 min-w-[300px] bg-[var(--background-tertiary)] rounded-lg p-3 border-t-4 transition-colors duration-200 flex flex-col
                            ${status === BudgetStatus.SENT ? 'border-t-blue-500' : ''}
                            ${status === BudgetStatus.FOLLOWING_UP ? 'border-t-yellow-500' : ''}
                            ${status === BudgetStatus.ON_HOLD ? 'border-t-gray-500' : ''}
                            ${status === BudgetStatus.WON ? 'border-t-green-500' : ''}
                            ${status === BudgetStatus.LOST ? 'border-t-red-500' : ''}
                            ${draggingOverColumn === status ? 'bg-slate-200 dark:bg-slate-700' : ''}
                        `}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-lg text-[var(--text-primary)]">{status}</h3>
                            <span className="text-sm font-bold bg-[var(--background-secondary)] text-[var(--text-secondary)] rounded-full px-2.5 py-0.5">{budgetsByStatus[status].length}</span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mb-4 font-medium">{formatCurrency(budgetsByStatus[status].reduce((sum, b) => sum + b.value, 0))}</p>
                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-grow">
                            {budgetsByStatus[status]
                                .sort((a,b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime())
                                .map(budget => (
                                <BudgetCard
                                    key={budget.id}
                                    budget={budget}
                                    clientName={clientMap.get(budget.clientId) || 'Cliente Desconhecido'}
                                    onSelect={onSelectBudget}
                                    onAnalyze={handleOpenAnalysis}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {analysisModal.isOpen && analysisModal.budget && (
                 <BudgetAIAnalysisModal
                    budget={analysisModal.budget}
                    clientName={clientMap.get(analysisModal.budget.clientId) || 'N/A'}
                    isOpen={analysisModal.isOpen}
                    onClose={handleCloseAnalysis}
                 />
            )}
        </div>
    );
};

export default DealsView;