import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Budget, Client } from '../types';
import { BudgetStatus } from '../types';
import { 
    CalendarIcon, ExclamationCircleIcon, ExclamationTriangleIcon
} from './icons';

// --- Helper Functions & Interfaces ---

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const isStale = (budget: Budget): boolean => {
    if (budget.status !== BudgetStatus.SENT && budget.status !== BudgetStatus.FOLLOWING_UP) {
        return false;
    }
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let lastActivityDate;
    if (budget.followUps && budget.followUps.length > 0) {
        // Find the latest follow-up date
        const latestFollowUpDate = Math.max(...budget.followUps.map(fu => new Date(fu.date).getTime()));
        lastActivityDate = new Date(latestFollowUpDate);
    } else {
        lastActivityDate = new Date(budget.dateSent);
    }

    return lastActivityDate < sevenDaysAgo;
};

// --- Componente Principal da View ---

interface DealsViewProps {
  budgets: Budget[];
  clients: Client[];
  onSelectBudget: (id: string) => void;
  onUpdateStatus: (id: string, status: BudgetStatus) => void;
  onScheduleFollowUp: (id: string, date: Date) => void;
}

const CompactBudgetCard: React.FC<{ budget: Budget, clientName: string, onSelect: () => void, isDragging: boolean }> = ({ budget, clientName, onSelect, isDragging }) => {
     const today = new Date(); today.setHours(0, 0, 0, 0);
     const isOverdue = budget.nextFollowUpDate && new Date(budget.nextFollowUpDate) < today;
     const isBudgetStale = useMemo(() => isStale(budget), [budget]);

    return (
        <div onClick={onSelect} className={`bg-[var(--background-secondary)] p-3 rounded-lg shadow-sm cursor-pointer border border-[var(--border-secondary)] transition-all duration-200 group ${isDragging ? 'opacity-50 rotate-2' : 'hover:border-[var(--accent-primary)] hover:-translate-y-0.5'}`}>
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-[var(--text-primary)] text-base pr-2 truncate">{budget.title}</h4>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isBudgetStale && <span title="Atenção: Orçamento sem follow-up há mais de 7 dias."><ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" /></span>}
                    {isOverdue && <span title="Follow-up atrasado!"><ExclamationCircleIcon className="w-5 h-5 text-red-500" /></span>}
                </div>
            </div>
            <p className="text-sm text-[var(--text-accent)] font-semibold mb-2 truncate">{clientName}</p>
            <div className="flex justify-between items-center text-sm font-semibold text-[var(--text-secondary)]">
                <span className="font-bold text-lg text-[var(--text-primary)]">{formatCurrency(budget.value)}</span>
                {budget.nextFollowUpDate && 
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} title="Próximo follow-up">
                        <CalendarIcon className="w-4 h-4"/>
                        <span>{new Date(budget.nextFollowUpDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                }
            </div>
        </div>
    );
};

const KanbanColumn: React.FC<{ title: string, budgets: Budget[], clientMap: Map<string, string>, onSelectBudget: (id: string) => void, onDragOver: (e: React.DragEvent<HTMLDivElement>) => void, onDrop: (e: React.DragEvent<HTMLDivElement>) => void, isDraggingOver: boolean, draggingBudgetId: string | null, setDraggingBudgetId: (id: string | null) => void }> = ({ title, budgets, clientMap, onSelectBudget, onDragOver, onDrop, isDraggingOver, draggingBudgetId, setDraggingBudgetId }) => {
    const totalValue = useMemo(() => budgets.reduce((sum, b) => sum + b.value, 0), [budgets]);
    
    return (
        <div onDragOver={onDragOver} onDrop={onDrop} className="flex-1 min-w-[300px] bg-[var(--background-tertiary)] rounded-lg p-3 flex flex-col transition-colors">
            <div className="flex justify-between items-center mb-1 px-1">
                <h3 className="font-semibold text-lg text-[var(--text-primary)]">{title}</h3>
                <span className="text-sm font-bold bg-[var(--background-secondary)] text-[var(--text-secondary)] rounded-full px-2.5 py-0.5">{budgets.length}</span>
            </div>
            <div className="text-sm font-bold text-[var(--text-accent)] mb-3 px-1">R$ {formatCurrency(totalValue)}</div>
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
                {budgets.map(budget => (
                    <div key={budget.id} draggable onDragStart={(e) => { e.dataTransfer.setData('budgetId', budget.id); setDraggingBudgetId(budget.id); }} onDragEnd={() => setDraggingBudgetId(null)} className="mb-3">
                        <CompactBudgetCard budget={budget} clientName={clientMap.get(budget.clientId) || 'Cliente'} onSelect={() => onSelectBudget(budget.id)} isDragging={draggingBudgetId === budget.id} />
                    </div>
                ))}
                {isDraggingOver && <div className="h-24 border-2 border-dashed border-[var(--border-secondary)] rounded-lg bg-[var(--background-tertiary-hover)] mt-2" />}
            </div>
        </div>
    );
};


const DealsView: React.FC<DealsViewProps> = ({ budgets, clients, onSelectBudget, onUpdateStatus }) => {
    const [draggingOverColumn, setDraggingOverColumn] = useState<BudgetStatus | null>(null);
    const [draggingBudgetId, setDraggingBudgetId] = useState<string | null>(null);

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const budgetsByStatus = useMemo(() => {
        const grouped: { [key in BudgetStatus]?: Budget[] } = {};
        budgets.forEach(budget => {
            (grouped[budget.status] = grouped[budget.status] || []).push(budget);
        });
        return grouped;
    }, [budgets]);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: BudgetStatus) => {
        e.preventDefault();
        const budgetId = e.dataTransfer.getData('budgetId');
        const budget = budgets.find(b => b.id === budgetId);
        if (budget && budget.status !== newStatus) onUpdateStatus(budgetId, newStatus);
        setDraggingOverColumn(null);
    };
    
    const columns: BudgetStatus[] = [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ORDER_PLACED];

    return (
        <div className="flex flex-col h-full w-full space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">Hub de Negócios</h2>
                <p className="text-[var(--text-secondary)] mt-1">Sua central de ações para fechar mais negócios.</p>
            </div>
            
            {/* --- PIPELINE COMPLETO --- */}
            <section className="flex-1 flex flex-col min-h-0 animated-item" style={{animationDelay: '200ms'}}>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Pipeline Completo</h3>
                <div className="flex-1 flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar">
                    {columns.map(status => (
                        <KanbanColumn
                            key={status}
                            title={status}
                            budgets={budgetsByStatus[status] || []}
                            clientMap={clientMap}
                            onSelectBudget={onSelectBudget}
                            onDragOver={(e) => { e.preventDefault(); setDraggingOverColumn(status); }}
                            onDrop={(e) => handleDrop(e, status)}
                            isDraggingOver={draggingOverColumn === status}
                            draggingBudgetId={draggingBudgetId}
                            setDraggingBudgetId={setDraggingBudgetId}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
};

export default DealsView;