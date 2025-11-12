import React, { useState, useMemo } from 'react';
import type { Budget, Client } from '../types';
import { BudgetStatus } from '../types';

interface DealsViewProps {
  budgets: Budget[];
  clients: Client[];
  onSelectBudget: (id: string) => void;
  onUpdateStatus: (budgetId: string, newStatus: BudgetStatus) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const BudgetCard: React.FC<{ budget: Budget; clientName: string; onSelect: (id: string) => void; }> = ({ budget, clientName, onSelect }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('budgetId', budget.id);
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onClick={() => onSelect(budget.id)}
            className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm mb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 border border-gray-200 dark:border-slate-700 hover:border-blue-500 transition-all duration-200"
        >
            <h4 className="font-bold text-gray-800 dark:text-slate-100">{budget.title}</h4>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2">{clientName}</p>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{formatCurrency(budget.value)}</p>
        </div>
    );
};

const DealsView: React.FC<DealsViewProps> = ({ budgets, clients, onSelectBudget, onUpdateStatus }) => {
    const [draggingOverColumn, setDraggingOverColumn] = useState<BudgetStatus | null>(null);
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const budgetsByStatus = useMemo(() => {
        const grouped: { [key in BudgetStatus]?: Budget[] } = {};
        Object.values(BudgetStatus).forEach(status => {
            grouped[status] = [];
        });

        budgets.forEach(budget => {
            if (grouped[budget.status]) {
                grouped[budget.status]!.push(budget);
            }
        });
        return grouped as { [key in BudgetStatus]: Budget[] };
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
    
    const columns: BudgetStatus[] = [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ON_HOLD, BudgetStatus.WON, BudgetStatus.LOST];
    
    return (
        <div className="flex gap-6 overflow-x-auto pb-4">
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
                    className={`flex-1 min-w-[300px] bg-slate-100 dark:bg-slate-800/50 rounded-lg p-4 border-t-4 transition-colors duration-200
                        ${status === BudgetStatus.SENT ? 'border-t-blue-500' : ''}
                        ${status === BudgetStatus.FOLLOWING_UP ? 'border-t-yellow-500' : ''}
                        ${status === BudgetStatus.ON_HOLD ? 'border-t-gray-500' : ''}
                        ${status === BudgetStatus.WON ? 'border-t-green-500' : ''}
                        ${status === BudgetStatus.LOST ? 'border-t-red-500' : ''}
                        ${draggingOverColumn === status ? 'bg-slate-200 dark:bg-slate-700' : ''}
                    `}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-slate-200">{status}</h3>
                        <span className="text-sm font-bold bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full px-2 py-0.5">{budgetsByStatus[status].length}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">{formatCurrency(budgetsByStatus[status].reduce((sum, b) => sum + b.value, 0))}</p>
                    <div className="space-y-3 h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
                        {budgetsByStatus[status]
                            .sort((a,b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime())
                            .map(budget => (
                            <BudgetCard
                                key={budget.id}
                                budget={budget}
                                clientName={clientMap.get(budget.clientId) || 'Cliente Desconhecido'}
                                onSelect={onSelectBudget}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DealsView;