

import React, { useMemo } from 'react';
import type { Budget, Client, Reminder } from '../types';
import { BudgetStatus } from '../types';
import { CalendarIcon, ExclamationTriangleIcon, ArrowRightIcon, CurrencyDollarIcon, ClipboardDocumentListIcon, ClockIcon, BriefcaseIcon } from './icons';

interface TasksViewProps {
  budgets: Budget[];
  clients: Client[];
  reminders: Reminder[];
  onSelectBudget: (id: string) => void;
}

type UnifiedTask = {
  id: string;
  type: 'follow-up' | 'reminder';
  date: Date;
  title: string;
  isCompleted?: boolean;
  // Follow-up specific
  clientName?: string;
  value?: number;
  budgetId?: string;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) return 'N/A';
    
    // Check if time is not midnight (00:00:00)
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
    
    if (hasTime) {
        return date.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Sao_Paulo' // Use a consistent timezone
        }).replace(',', ' às');
    } else {
        // For dates without specific time, ensure we show the correct day regardless of user's timezone
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }
};

const MetricCard: React.FC<{ title: string; value: string | number; icon: React.ReactElement<{ className?: string }>; colorClass?: string; style?: React.CSSProperties; className?: string; }> = ({ title, value, icon, colorClass = 'text-blue-500', style, className }) => (
    <div style={style} className={`bg-white dark:bg-slate-800 p-4 rounded-lg flex items-center gap-4 border border-gray-200 dark:border-slate-700 shadow-sm ${className || ''}`}>
        <div className={`bg-opacity-10 dark:bg-opacity-20 p-3 rounded-full ${colorClass.replace('text-', 'bg-')}`}>
            {React.cloneElement(icon, { className: `w-6 h-6 ${colorClass}` })}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

const TaskItem: React.FC<{ task: UnifiedTask; onSelectBudget: (id: string) => void; style?: React.CSSProperties; className?: string; }> = ({ task, onSelectBudget, style, className }) => (
    <div
        style={style}
        onClick={() => task.type === 'follow-up' && task.budgetId && onSelectBudget(task.budgetId)}
        className={`bg-white dark:bg-slate-800 p-4 rounded-lg transition-all duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-gray-200 dark:border-slate-700 shadow-sm ${task.type === 'follow-up' ? 'hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer' : ''} ${className || ''}`}
    >
        <div className="flex-1 flex items-start gap-3">
            <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${task.type === 'follow-up' ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-purple-100 dark:bg-purple-900/50'}`}>
                {task.type === 'follow-up' ? <BriefcaseIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" /> : <ClockIcon className="w-4 h-4 text-purple-500 dark:text-purple-400" />}
            </div>
            <div className="flex-1">
                <p className={`font-bold text-gray-800 dark:text-slate-100 text-lg ${task.isCompleted ? 'line-through text-gray-400 dark:text-slate-500' : ''}`}>{task.title}</p>
                {task.type === 'follow-up' && <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold">{task.clientName}</p>}
            </div>
        </div>
        <div className="w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between text-sm gap-2">
            {task.type === 'follow-up' && task.value != null && <p className="font-semibold text-gray-600 dark:text-gray-300">{formatCurrency(task.value)}</p>}
             <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-semibold">
                <CalendarIcon className="w-4 h-4" />
                <span>{formatDate(task.date)}</span>
            </div>
        </div>
    </div>
);

const TasksView: React.FC<TasksViewProps> = ({ budgets, clients, reminders, onSelectBudget }) => {
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const tasks = useMemo(() => {
        const followUpTasks: UnifiedTask[] = budgets
            .filter(b => (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP) && b.nextFollowUpDate)
            .map(b => ({
                id: `budget-${b.id}`,
                type: 'follow-up',
                date: new Date(b.nextFollowUpDate!),
                title: b.title,
                clientName: clientMap.get(b.clientId),
                value: b.value,
                budgetId: b.id,
            }));
        
        const reminderTasks: UnifiedTask[] = reminders
            .filter(r => !r.isDismissed)
            .map(r => ({
                id: `reminder-${r.id}`,
                type: 'reminder',
                date: new Date(r.reminderDateTime),
                title: r.title,
                isCompleted: r.isCompleted,
            }));

        const allTasks = [...followUpTasks, ...reminderTasks];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdue: UnifiedTask[] = [];
        const todayTasks: UnifiedTask[] = [];
        const upcoming: UnifiedTask[] = [];

        allTasks.forEach(task => {
            const taskDate = new Date(task.date);
            const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());

            if (task.isCompleted) return; // Ignore completed tasks from main lists

            if (taskDateOnly.getTime() < today.getTime()) {
                overdue.push(task);
            } else if (taskDateOnly.getTime() === today.getTime()) {
                todayTasks.push(task);
            } else {
                upcoming.push(task);
            }
        });
        
        const sortByDate = (a: UnifiedTask, b: UnifiedTask) => a.date.getTime() - b.date.getTime();
        overdue.sort(sortByDate);
        todayTasks.sort(sortByDate);
        upcoming.sort(sortByDate);
        
        const potentialValue = followUpTasks.reduce((sum, t) => sum + (t.value || 0), 0);

        return { overdue, today: todayTasks, upcoming, potentialValue };
    }, [budgets, reminders, clientMap]);
    
    const totalTasks = tasks.overdue.length + tasks.today.length + tasks.upcoming.length;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Plano de Ação</h2>
                <p className="text-gray-500 dark:text-gray-400">Seu resumo de atividades para focar e fechar mais negócios.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard style={{ animationDelay: '100ms' }} className="animated-item" title="Atrasadas" value={tasks.overdue.length} icon={<ExclamationTriangleIcon />} colorClass="text-red-500 dark:text-red-400" />
                <MetricCard style={{ animationDelay: '200ms' }} className="animated-item" title="Para Hoje" value={tasks.today.length} icon={<ArrowRightIcon />} colorClass="text-blue-500 dark:text-blue-400" />
                <MetricCard style={{ animationDelay: '300ms' }} className="animated-item" title="Próximas" value={tasks.upcoming.length} icon={<CalendarIcon />} colorClass="text-yellow-600 dark:text-yellow-400" />
                <MetricCard style={{ animationDelay: '400ms' }} className="animated-item" title="Valor em Jogo" value={formatCurrency(tasks.potentialValue)} icon={<CurrencyDollarIcon />} colorClass="text-green-500 dark:text-green-400" />
            </div>
            
            {totalTasks === 0 ? (
                 <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                    <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500"/>
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-200">Tudo em dia!</h3>
                    <p>Nenhuma atividade de follow-up ou tarefa agendada.</p>
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
                                {tasks.overdue.map((task, index) => (
                                    <TaskItem style={{ animationDelay: `${index * 50}ms` }} className="animated-item" key={task.id} task={task} onSelectBudget={onSelectBudget} />
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
                                {tasks.today.map((task, index) => (
                                    <TaskItem style={{ animationDelay: `${index * 50}ms` }} className="animated-item" key={task.id} task={task} onSelectBudget={onSelectBudget} />
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
                                {tasks.upcoming.map((task, index) => (
                                    <TaskItem style={{ animationDelay: `${index * 50}ms` }} className="animated-item" key={task.id} task={task} onSelectBudget={onSelectBudget} />
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