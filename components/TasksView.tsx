import React, { useMemo } from 'react';
import type { Budget, Client } from '../types';
import { BudgetStatus } from '../types';
import { CalendarIcon, ExclamationTriangleIcon, ArrowRightIcon, CurrencyDollarIcon, ClipboardDocumentListIcon } from './icons';

interface TasksViewProps {
  budgets: Budget[];
  clients: Client[];
  onSelectBudget: (id: string) => void;
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
        if (isNaN(date.getTime())) return 'Data inválida';

        const hasTime = dateString.includes('T');
        
        if (hasTime) {
            return date.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
                timeZone: 'America/Sao_Paulo'
            }).replace(',', ' às');
        } else {
            const [year, month, day] = dateString.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day));
            return utcDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        }
    } catch(e) {
        return 'Data inválida';
    }
};

const MetricCard = ({ title, value, icon, colorClass = 'text-blue-500' }: { title: string, value: string | number, icon: React.ReactElement<{ className?: string }>, colorClass?: string }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg flex items-center gap-4 border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className={`bg-opacity-10 dark:bg-opacity-20 p-3 rounded-full ${colorClass.replace('text-', 'bg-')}`}>
            {React.cloneElement(icon, { className: `w-6 h-6 ${colorClass}` })}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

const TaskItem: React.FC<{ budget: Budget; clientName: string; onSelectBudget: (id: string) => void; }> = ({ budget, clientName, onSelectBudget }) => (
    <div
        onClick={() => onSelectBudget(budget.id)}
        className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50 p-4 rounded-lg cursor-pointer transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-gray-200 dark:border-slate-700 shadow-sm"
    >
        <div className="flex-1">
            <p className="font-bold text-gray-800 dark:text-slate-100 text-lg">{budget.title}</p>
            <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold">{clientName}</p>
        </div>
        <div className="w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between text-sm gap-2">
            <p className="font-semibold text-gray-600 dark:text-gray-300">{formatCurrency(budget.value)}</p>
             <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-semibold">
                <CalendarIcon className="w-4 h-4" />
                <span>{formatDate(budget.nextFollowUpDate)}</span>
            </div>
        </div>
    </div>
);

const TasksView: React.FC<TasksViewProps> = ({ budgets, clients, onSelectBudget }) => {
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const tasks = useMemo(() => {
        const activeBudgets = budgets.filter(b =>
            (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP) && b.nextFollowUpDate
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdue: Budget[] = [];
        const todayTasks: Budget[] = [];
        const upcoming: Budget[] = [];

        activeBudgets.forEach(budget => {
            const followUpDate = new Date(budget.nextFollowUpDate!);
            const followUpDateOnly = new Date(followUpDate.getUTCFullYear(), followUpDate.getUTCMonth(), followUpDate.getUTCDate());

            if (followUpDateOnly.getTime() < today.getTime()) {
                overdue.push(budget);
            } else if (followUpDateOnly.getTime() === today.getTime()) {
                todayTasks.push(budget);
            } else {
                upcoming.push(budget);
            }
        });
        
        const sortByDate = (a: Budget, b: Budget) => new Date(a.nextFollowUpDate!).getTime() - new Date(b.nextFollowUpDate!).getTime();
        overdue.sort(sortByDate);
        todayTasks.sort(sortByDate);
        upcoming.sort(sortByDate);
        
        const potentialValue = activeBudgets.reduce((sum, b) => sum + b.value, 0);

        return { overdue, today: todayTasks, upcoming, potentialValue };
    }, [budgets]);
    
    const totalTasks = tasks.overdue.length + tasks.today.length + tasks.upcoming.length;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Plano de Ação</h2>
                <p className="text-gray-500 dark:text-gray-400">Seu resumo de atividades para focar e fechar mais negócios.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Atrasadas" value={tasks.overdue.length} icon={<ExclamationTriangleIcon />} colorClass="text-red-500 dark:text-red-400" />
                <MetricCard title="Para Hoje" value={tasks.today.length} icon={<ArrowRightIcon />} colorClass="text-blue-500 dark:text-blue-400" />
                <MetricCard title="Próximas" value={tasks.upcoming.length} icon={<CalendarIcon />} colorClass="text-yellow-600 dark:text-yellow-400" />
                <MetricCard title="Valor em Jogo" value={formatCurrency(tasks.potentialValue)} icon={<CurrencyDollarIcon />} colorClass="text-green-500 dark:text-green-400" />
            </div>
            
            {totalTasks === 0 ? (
                 <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                    <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500"/>
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-200">Tudo em dia!</h3>
                    <p>Nenhuma atividade de follow-up agendada.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {tasks.overdue.length > 0 && (
                        <section>
                            <h3 className="text-lg font-semibold text-red-600 dark:text-red-500 flex items-center mb-3">
                                <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                                Atrasadas ({tasks.overdue.length})
                            </h3>
                            <div className="space-y-3">
                                {tasks.overdue.map(budget => (
                                    <TaskItem key={budget.id} budget={budget} clientName={clientMap.get(budget.clientId) || ''} onSelectBudget={onSelectBudget} />
                                ))}
                            </div>
                        </section>
                    )}
                    {tasks.today.length > 0 && (
                        <section>
                            <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-500 flex items-center mb-3">
                                <ArrowRightIcon className="w-5 h-5 mr-2" />
                                Para Hoje ({tasks.today.length})
                            </h3>
                            <div className="space-y-3">
                                {tasks.today.map(budget => (
                                    <TaskItem key={budget.id} budget={budget} clientName={clientMap.get(budget.clientId) || ''} onSelectBudget={onSelectBudget} />
                                ))}
                            </div>
                        </section>
                    )}
                    {tasks.upcoming.length > 0 && (
                        <section>
                            <h3 className="text-lg font-semibold text-gray-600 dark:text-slate-300 flex items-center mb-3">
                                <CalendarIcon className="w-5 h-5 mr-2" />
                                Próximas ({tasks.upcoming.length})
                            </h3>
                            <div className="space-y-3">
                                {tasks.upcoming.map(budget => (
                                    <TaskItem key={budget.id} budget={budget} clientName={clientMap.get(budget.clientId) || ''} onSelectBudget={onSelectBudget} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
};

export default TasksView;