
import React, { useState, useMemo, useEffect } from 'react';
import type { Budget, Client } from '../types';
import { BudgetStatus } from '../types';
import { 
    CalendarIcon, SparklesIcon, FireIcon, CurrencyDollarIcon, HashtagIcon, 
    BuildingOffice2Icon, ExclamationTriangleIcon, ArrowRightIcon, 
    PencilSquareIcon, ChevronUpIcon, ChevronDownIcon 
} from './icons';
import BudgetAIAnalysisModal from './BudgetAIAnalysisModal';

interface DealsViewProps {
  budgets: Budget[];
  clients: Client[];
  onSelectBudget: (id: string) => void;
  onUpdateStatus: (budgetId: string, status: BudgetStatus) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatDate = (dateString: string | null, options: Intl.DateTimeFormatOptions = {}) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Inválido';
        const defaultOptions: Intl.DateTimeFormatOptions = {
            day: '2-digit', month: '2-digit', timeZone: 'UTC'
        };
        const finalOptions = {...defaultOptions, ...options};
        
        if (!dateString.includes('T')) {
            const [year, month, day] = dateString.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month-1, day));
            return utcDate.toLocaleDateString('pt-BR', finalOptions);
        }
        return new Date(dateString).toLocaleDateString('pt-BR', finalOptions);
    } catch {
        return 'Inválido';
    }
};

const KPICard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) => (
    <div className="bg-[var(--background-secondary)] p-4 rounded-lg flex items-center gap-4 border border-[var(--border-primary)] shadow-sm">
        <div className="bg-[var(--background-tertiary)] p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-sm text-[var(--text-secondary)]">{title}</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
    </div>
);

const TaskItem: React.FC<{ budget: Budget; clientName: string; onSelectBudget: (id: string) => void; }> = ({ budget, clientName, onSelectBudget }) => (
    <div
        onClick={() => onSelectBudget(budget.id)}
        className="bg-[var(--background-secondary)] hover:bg-[var(--background-secondary-hover)] p-3 rounded-lg cursor-pointer transition-all duration-200 flex justify-between items-center gap-4 border border-[var(--border-secondary)] shadow-sm"
    >
        <div className="flex-1 min-w-0">
            <p className="font-bold text-[var(--text-primary)] text-base truncate">{budget.title}</p>
            <p className="text-[var(--text-accent)] text-sm font-semibold truncate">{clientName}</p>
        </div>
        <div className="w-auto flex flex-col items-end text-sm gap-1 flex-shrink-0">
            <p className="font-semibold text-[var(--text-secondary)]">{formatCurrency(budget.value)}</p>
             <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold">
                <CalendarIcon className="w-4 h-4" />
                <span>{formatDate(budget.nextFollowUpDate, { day: '2-digit', month: 'short'})}</span>
            </div>
        </div>
    </div>
);

const BudgetCard: React.FC<{ budget: Budget; clientName: string; onSelect: (id: string) => void; onAnalyze: (budget: Budget) => void; }> = ({ budget, clientName, onSelect, onAnalyze }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => e.dataTransfer.setData('budgetId', budget.id);
    const isStale = useMemo(() => {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(new Date().getDate() - 14);
        const lastInteractionDate = budget.followUps.length > 0 ? new Date(Math.max(...budget.followUps.map(f => new Date(f.date).getTime()))) : new Date(budget.dateSent);
        return !budget.nextFollowUpDate && lastInteractionDate < fourteenDaysAgo;
    }, [budget.nextFollowUpDate, budget.followUps, budget.dateSent]);

    return (
        <div draggable onDragStart={handleDragStart} onClick={() => onSelect(budget.id)} className={`bg-[var(--background-secondary)] p-3 rounded-lg shadow-sm mb-3 cursor-pointer hover:bg-[var(--background-secondary-hover)] border border-[var(--border-secondary)] hover:border-[var(--accent-primary)] transition-all duration-200 relative group ${isStale ? 'border-amber-400 dark:border-amber-500' : ''}`}>
            {isStale && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full" title="Negócio parado. Realize um follow-up."></div>}
            <h4 className="font-bold text-[var(--text-primary)] text-base truncate">{budget.title}</h4>
            <p className="text-sm text-[var(--text-accent)] font-semibold mb-2 truncate">{clientName}</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(budget.value)}</p>
            <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] mt-2 pt-2 border-t border-[var(--border-primary)]">
                <div className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" /><span>{formatDate(budget.nextFollowUpDate)}</span></div>
                <button onClick={(e) => { e.stopPropagation(); onAnalyze(budget); }} className="opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--background-tertiary)] hover:bg-[var(--background-tertiary-hover)] text-[var(--text-accent)] p-1.5 rounded-full" title="Analisar com IA"><SparklesIcon className="w-4 h-4" /></button>
            </div>
        </div>
    );
};


const DealsView: React.FC<DealsViewProps> = ({ budgets, clients, onSelectBudget, onUpdateStatus }) => {
    const [draggingOverColumn, setDraggingOverColumn] = useState<BudgetStatus | null>(null);
    const [analysisModal, setAnalysisModal] = useState<{ isOpen: boolean, budget: Budget | null }>({ isOpen: false, budget: null });
    
    const [notes, setNotes] = useState(() => localStorage.getItem('actionPlanNotes') || '');
    const [isTasksVisible, setIsTasksVisible] = useState(true);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            localStorage.setItem('actionPlanNotes', notes);
        }, 500); // Debounce saving to localStorage
        return () => clearTimeout(timeoutId);
    }, [notes]);
    
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const { 
        activeBudgets, 
        overdueCount, 
        budgetsByStatus, 
        pipelineValue,
        tasks
    } = useMemo(() => {
        const active = budgets.filter(b => [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ORDER_PLACED].includes(b.status));
        const today = new Date(); 
        today.setHours(0, 0, 0, 0);

        const overdue = active.filter(b => {
            if (!b.nextFollowUpDate) return false;
            const dateParts = b.nextFollowUpDate.split('T')[0].split('-').map(Number);
            const followUpDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            return followUpDate < today && [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP].includes(b.status);
        });

        const grouped: { [key in BudgetStatus]?: Budget[] } = {};
        budgets.forEach(b => {
            if (!grouped[b.status]) grouped[b.status] = [];
            grouped[b.status]!.push(b);
        });

        const activeWithFollowup = budgets.filter(b => (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP) && b.nextFollowUpDate);
        
        const overdueTasks: Budget[] = [];
        const todayTasks: Budget[] = [];
        const upcomingTasks: Budget[] = [];

        activeWithFollowup.forEach(budget => {
            const dateParts = budget.nextFollowUpDate!.split('T')[0].split('-').map(Number);
            const followUpDateLocal = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            
            if (followUpDateLocal.getTime() < today.getTime()) {
                overdueTasks.push(budget);
            } else if (followUpDateLocal.getTime() === today.getTime()) {
                todayTasks.push(budget);
            } else {
                upcomingTasks.push(budget);
            }
        });

        const sortByDate = (a: Budget, b: Budget) => new Date(a.nextFollowUpDate!).getTime() - new Date(b.nextFollowUpDate!).getTime();
        overdueTasks.sort(sortByDate);
        todayTasks.sort(sortByDate);
        upcomingTasks.sort(sortByDate);
        
        return {
            activeBudgets: active,
            overdueCount: overdue.length,
            budgetsByStatus: grouped,
            pipelineValue: active.reduce((sum, b) => sum + b.value, 0),
            tasks: { overdue: overdueTasks, today: todayTasks, upcoming: upcomingTasks }
        };
    }, [budgets]);
    
    const agendaData = useMemo(() => {
        const next7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + i);
            return date;
        });

        return next7Days.map(date => {
            const dateString = date.toISOString().split('T')[0];
            const tasksForDay = budgets.filter(b => b.nextFollowUpDate && b.nextFollowUpDate.startsWith(dateString) && (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP));
            return {
                date,
                tasks: tasksForDay,
            };
        });
    }, [budgets]);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: BudgetStatus) => {
        e.preventDefault();
        const budgetId = e.dataTransfer.getData('budgetId');
        if (budgetId) onUpdateStatus(budgetId, newStatus);
        setDraggingOverColumn(null);
    }
    
    const columns: BudgetStatus[] = [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ORDER_PLACED, BudgetStatus.ON_HOLD];
    
    return (
        <div className="flex flex-col h-full space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Hub de Negócios</h1>
                <p className="text-[var(--text-secondary)]">Seu painel de controle para focar nas oportunidades certas.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard title="Pipeline Ativo" value={formatCurrency(pipelineValue)} icon={<CurrencyDollarIcon className="w-6 h-6 text-blue-500" />} />
                <KPICard title="Ticket Médio Ativo" value={formatCurrency(activeBudgets.length > 0 ? pipelineValue / activeBudgets.length : 0)} icon={<HashtagIcon className="w-6 h-6 text-purple-500" />} />
                <KPICard title="Negócios Ativos" value={activeBudgets.length} icon={<BuildingOffice2Icon className="w-6 h-6 text-green-500" />} />
                <KPICard title="Follow-ups Atrasados" value={overdueCount} icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-500" />} />
            </div>

            <div className="bg-[var(--background-secondary)] p-4 rounded-xl border border-[var(--border-primary)] shadow-sm">
                 <h3 className="font-semibold text-xl text-[var(--text-primary)] mb-3 flex items-center"><FireIcon className="w-6 h-6 mr-2 text-orange-500" />Plano de Ação</h3>
                 <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                        <h4 className="font-semibold text-[var(--text-primary)] mb-2">Agenda dos Próximos 7 Dias</h4>
                        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                           {agendaData.map(({ date, tasks }) => (
                               <div key={date.toISOString()}>
                                   <p className={`font-bold text-sm capitalize ${new Date().toDateString() === date.toDateString() ? 'text-[var(--text-accent)]' : 'text-[var(--text-secondary)]'}`}>
                                       {date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                                   </p>
                                   {tasks.length > 0 ? (
                                       <div className="pl-4 border-l-2 border-[var(--border-primary)] ml-2">
                                           {tasks.map(task => (
                                               <div key={task.id} onClick={() => onSelectBudget(task.id)} className="text-sm p-1.5 rounded-md hover:bg-[var(--background-tertiary)] cursor-pointer">
                                                   <p className="font-semibold text-[var(--text-primary)] truncate">{task.title}</p>
                                                   <p className="text-xs text-[var(--text-secondary)] truncate">{clientMap.get(task.clientId)}</p>
                                               </div>
                                           ))}
                                       </div>
                                   ) : (
                                       <p className="pl-4 text-xs text-[var(--text-tertiary)] italic ml-2 border-l-2 border-[var(--border-primary)] py-1">Nenhuma tarefa.</p>
                                   )}
                               </div>
                           ))}
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <h4 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                            <PencilSquareIcon className="w-5 h-5"/> Bloco de Notas do Dia
                        </h4>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Anote suas metas, lembretes ou insights para hoje..."
                            className="w-full h-72 bg-[var(--background-tertiary)] text-[var(--text-primary)] rounded-lg p-3 border border-[var(--border-secondary)] focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition resize-none custom-scrollbar"
                        />
                    </div>
                 </div>
            </div>

            <div className="bg-[var(--background-secondary)] p-4 rounded-xl border border-[var(--border-primary)] shadow-sm">
                <button onClick={() => setIsTasksVisible(!isTasksVisible)} className="w-full flex justify-between items-center p-1">
                    <h3 className="font-semibold text-xl text-[var(--text-primary)]">Listas de Foco</h3>
                    {isTasksVisible ? <ChevronUpIcon className="w-6 h-6 text-[var(--text-secondary)]" /> : <ChevronDownIcon className="w-6 h-6 text-[var(--text-secondary)]" />}
                </button>
                {isTasksVisible && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <section>
                            <h3 className="text-lg font-semibold text-red-600 dark:text-red-500 flex items-center mb-3">
                                <ExclamationTriangleIcon className="w-5 h-5 mr-2" /> Atrasadas ({tasks.overdue.length})
                            </h3>
                            <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                                {tasks.overdue.length > 0 ? tasks.overdue.map(b => <TaskItem key={b.id} budget={b} clientName={clientMap.get(b.clientId) || ''} onSelectBudget={onSelectBudget} />) : <p className="text-sm text-center italic text-[var(--text-tertiary)] pt-8">Nenhuma tarefa atrasada.</p>}
                            </div>
                        </section>
                        <section>
                            <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-500 flex items-center mb-3">
                                <ArrowRightIcon className="w-5 h-5 mr-2" /> Para Hoje ({tasks.today.length})
                            </h3>
                             <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                                {tasks.today.length > 0 ? tasks.today.map(b => <TaskItem key={b.id} budget={b} clientName={clientMap.get(b.clientId) || ''} onSelectBudget={onSelectBudget} />) : <p className="text-sm text-center italic text-[var(--text-tertiary)] pt-8">Nenhuma tarefa para hoje.</p>}
                            </div>
                        </section>
                        <section>
                            <h3 className="text-lg font-semibold text-gray-600 dark:text-slate-300 flex items-center mb-3">
                                <CalendarIcon className="w-5 h-5 mr-2" /> Próximas ({tasks.upcoming.length})
                            </h3>
                             <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                                {tasks.upcoming.length > 0 ? tasks.upcoming.map(b => <TaskItem key={b.id} budget={b} clientName={clientMap.get(b.clientId) || ''} onSelectBudget={onSelectBudget} />) : <p className="text-sm text-center italic text-[var(--text-tertiary)] pt-8">Nenhuma tarefa futura.</p>}
                            </div>
                        </section>
                    </div>
                )}
            </div>

            <div className="flex gap-6 overflow-x-auto pb-4 flex-grow">
                {columns.map(status => {
                    const columnBudgets = budgetsByStatus[status] || [];
                    const columnTotal = columnBudgets.reduce((s, b) => s + b.value, 0);
                    const columnColors: {[key in BudgetStatus]?: string} = {
                        [BudgetStatus.SENT]: 'border-t-blue-500',
                        [BudgetStatus.FOLLOWING_UP]: 'border-t-yellow-500',
                        [BudgetStatus.ORDER_PLACED]: 'border-t-green-500',
                        [BudgetStatus.ON_HOLD]: 'border-t-gray-500',
                    }
                    return (
                        <div key={status} onDragOver={(e) => { e.preventDefault(); setDraggingOverColumn(status); }} onDrop={(e) => handleDrop(e, status)} onDragLeave={() => setDraggingOverColumn(null)} className={`flex-1 min-w-[300px] bg-[var(--background-tertiary)] rounded-lg p-3 border-t-4 transition-colors flex flex-col ${columnColors[status] || 'border-t-gray-400'} ${draggingOverColumn === status ? 'bg-slate-200 dark:bg-slate-700' : ''}`}>
                            <div className="flex justify-between items-center mb-2"><h3 className="font-semibold text-lg text-[var(--text-primary)]">{status}</h3><span className="text-sm font-bold bg-[var(--background-secondary)] text-[var(--text-secondary)] rounded-full px-2.5 py-0.5">{columnBudgets.length}</span></div>
                            <p className="text-sm text-[var(--text-secondary)] mb-4 font-medium">{formatCurrency(columnTotal)}</p>
                            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-grow">{columnBudgets.sort((a,b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime()).map(b => <BudgetCard key={b.id} budget={b} clientName={clientMap.get(b.clientId) || ''} onSelect={onSelectBudget} onAnalyze={(budget) => setAnalysisModal({ isOpen: true, budget })} />)}</div>
                        </div>
                    )
                })}
            </div>
            
            {analysisModal.isOpen && analysisModal.budget && <BudgetAIAnalysisModal budget={analysisModal.budget} clientName={clientMap.get(analysisModal.budget.clientId) || ''} isOpen={analysisModal.isOpen} onClose={() => setAnalysisModal({ isOpen: false, budget: null })} />}
        </div>
    );
};

export default DealsView;
