import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Budget, Client, Reminder, UserData } from '../types';
import { BudgetStatus } from '../types';
import { 
    CalendarIcon, ExclamationTriangleIcon, BriefcaseIcon, LightBulbIcon,
    MoonIcon, SunIcon, CheckCircleIcon, TrophyIcon, ArrowTrendingUpIcon, ClockIcon, PencilIcon, ExclamationCircleIcon,
    SparklesIcon, XMarkIcon
} from './icons';
import AIFocusTask from './AIFocusTask';
import { AIBriefing } from './AIBriefing';


// --- PROPS ---
interface TasksViewProps {
  budgets: Budget[];
  clients: Client[];
  reminders: Reminder[];
  onSelectBudget: (id: string) => void;
  userProfile: UserData;
}

// --- TYPES ---
type UnifiedTask = {
  id: string;
  type: 'follow-up' | 'reminder' | 'stale';
  date: number; // Storing as timestamp for stability
  title: string;
  isCompleted?: boolean;
  clientName?: string;
  value?: number;
  budgetId?: string;
  isOverdue: boolean;
  isToday: boolean;
  daysSince?: number;
  healthStatus?: 'risk' | 'attention' | 'healthy';
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};
const formatTimeOrDate = (timestamp: number, isToday: boolean) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'N/A';
    
    // Check if the original date had time info by seeing if it's not midnight on the dot
    if (date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};


// --- SUB-COMPONENTS ---

const FocusOfTheDay: React.FC = () => {
    const [focus, setFocus] = useState(() => localStorage.getItem('dailyFocus') || '');
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = () => {
        localStorage.setItem('dailyFocus', focus);
        setIsEditing(false);
    };

    return (
        <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)] shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-[var(--text-primary)] text-lg">🎯 Foco do Dia</h3>
                <button onClick={() => setIsEditing(!isEditing)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    {isEditing ? <CheckCircleIcon className="w-5 h-5 text-green-500" /> : <PencilIcon className="w-4 h-4" />}
                </button>
            </div>
            {isEditing ? (
                <textarea 
                    value={focus} 
                    onChange={e => setFocus(e.target.value)} 
                    onBlur={handleSave}
                    autoFocus
                    className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-md p-2 text-sm" 
                    placeholder="Ex: Fechar o negócio X, reativar Y..."
                />
            ) : (
                <p className="text-[var(--text-secondary)] text-sm italic">{focus || 'Defina seu principal objetivo para hoje...'}</p>
            )}
        </div>
    );
};

interface GoalsPanelTasks {
    today: UnifiedTask[];
    overdue: UnifiedTask[];
    stale: UnifiedTask[];
    potentialValue: number;
}

const GoalsPanel: React.FC<{ tasks: GoalsPanelTasks, budgets: Budget[] }> = ({ tasks, budgets }) => {
    const weeklyNewBudgets = useMemo(() => {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return budgets.filter(b => new Date(b.dateSent) >= oneWeekAgo).length;
    }, [budgets]);

    const MetricCard = ({ title, value, icon, style }: { title: string, value: string|number, icon: React.ReactNode, style?: React.CSSProperties }) => (
        <div style={style} className="bg-[var(--background-secondary)] p-3 rounded-lg flex items-center gap-3 border border-[var(--border-primary)] shadow-sm">
            {icon}
            <div>
                <p className="font-bold text-xl text-[var(--text-primary)]">{value}</p>
                <p className="text-xs text-[var(--text-secondary)]">{title}</p>
            </div>
        </div>
    );

    return (
        <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)] shadow-sm">
            <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-3">Painel de Metas</h3>
            <div className="grid grid-cols-2 gap-3">
                <MetricCard style={{ animationDelay: '100ms' }} title="Follow-ups Hoje" value={tasks.today.length} icon={<CalendarIcon className="w-6 h-6 text-blue-500"/>} />
                <MetricCard style={{ animationDelay: '200ms' }} title="Atrasados" value={tasks.overdue.length} icon={<ExclamationCircleIcon className="w-6 h-6 text-red-500"/>} />
                <MetricCard style={{ animationDelay: '300ms' }} title="Esquecidos" value={tasks.stale.length} icon={<ExclamationTriangleIcon className="w-6 h-6 text-yellow-500"/>} />
                <MetricCard style={{ animationDelay: '400ms' }} title="Orçamentos (7d)" value={weeklyNewBudgets} icon={<ArrowTrendingUpIcon className="w-6 h-6 text-purple-500"/>} />
            </div>
        </div>
    );
};

const DailyRhythm = () => {
    const items = [
        { icon: <SunIcon className="w-5 h-5 text-yellow-500" />, title: "Manhã", tasks: "Responder pendências, revisar clientes quentes." },
        { icon: <ClockIcon className="w-5 h-5 text-blue-500" />, title: "Tarde", tasks: "Buscar novos contatos, follow-ups de reforço." },
        { icon: <MoonIcon className="w-5 h-5 text-indigo-500" />, title: "Final do Dia", tasks: "Registrar tudo, planejar o dia seguinte." },
    ];
    return (
        <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)] shadow-sm">
            <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-3">Ritmo Diário Sugerido</h3>
            <div className="space-y-3">
                {items.map(item => (
                    <div key={item.title} className="flex items-start gap-3">
                        <div className="bg-[var(--background-tertiary)] p-2 rounded-full mt-0.5">{item.icon}</div>
                        <div>
                            <p className="font-semibold text-[var(--text-primary)] text-sm">{item.title}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{item.tasks}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TaskItem: React.FC<{ task: UnifiedTask; onSelectBudget: (id: string) => void; index: number; }> = React.memo(({ task, onSelectBudget, index }) => {
    const isFollowUp = task.type === 'follow-up';
    const isStale = task.type === 'stale';

    const baseClasses = "flex items-center gap-3 p-3 rounded-lg border-l-4 animated-item";
    const colorClasses = isStale
        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/50'
        : isFollowUp 
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50' 
        : 'border-purple-500 bg-purple-50 dark:bg-purple-900/30';

    const icon = isStale 
        ? <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500"/>
        : isFollowUp 
        ? <BriefcaseIcon className="w-5 h-5 text-blue-500"/>
        : <LightBulbIcon className="w-5 h-5 text-purple-500"/>;
        
    const healthConfig = {
      risk: { color: 'bg-red-500', title: 'Em Risco: Follow-up atrasado' },
      attention: { color: 'bg-yellow-500', title: 'Atenção: Negócio parado ou sem próximo passo' },
      healthy: { color: 'bg-green-500', title: 'Saudável: Em dia' },
    };

    const healthInfo = task.healthStatus ? healthConfig[task.healthStatus] : null;

    return (
        <div 
            onClick={() => (isFollowUp || isStale) && task.budgetId && onSelectBudget(task.budgetId)}
            style={{ animationDelay: `${50 * index}ms` }}
            className={`${baseClasses} ${colorClasses} ${task.isCompleted ? 'opacity-60' : ''}`}
        >
            <div className="flex-shrink-0">{icon}</div>
             {healthInfo && (
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${healthInfo.color}`} title={healthInfo.title} />
            )}
            <div className="flex-grow overflow-hidden">
                <p className={`font-semibold text-[var(--text-primary)] truncate ${task.isCompleted ? 'line-through text-[var(--text-tertiary)]' : ''}`}>{task.title}</p>
                {task.clientName && <p className="text-xs text-[var(--text-accent)] truncate">{task.clientName}</p>}
            </div>
            <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-[var(--text-secondary)]">{isStale ? `${task.daysSince} dias parado` : formatTimeOrDate(task.date, !task.isOverdue)}</p>
                {task.isOverdue && !task.isCompleted && <p className="text-xs font-bold text-red-500">Atrasado</p>}
            </div>
        </div>
    );
});

const UpcomingTasks: React.FC<{ 
    overdueTasks: UnifiedTask[],
    staleTasks: UnifiedTask[],
    todayTasks: UnifiedTask[],
    upcomingTasks: UnifiedTask[],
    onSelectBudget: (id: string) => void 
}> = ({ overdueTasks, staleTasks, todayTasks, upcomingTasks, onSelectBudget }) => {
    
    const TaskSection: React.FC<{ title: string, tasks: UnifiedTask[], icon: React.ReactNode }> = ({ title, tasks, icon }) => {
        if (tasks.length === 0) return null;
        return (
            <div>
                <h4 className="font-semibold text-[var(--text-secondary)] text-sm mb-2 flex items-center gap-2">
                    {icon} {title}
                </h4>
                <div className="space-y-2">
                    {tasks.map((task, index) => <TaskItem key={task.id} task={task} onSelectBudget={onSelectBudget} index={index} />)}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)] shadow-sm">
            <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-3">Lista de Tarefas</h3>
            <div className="space-y-6">
                <TaskSection title="Atrasadas" tasks={overdueTasks} icon={<ExclamationCircleIcon className="w-5 h-5 text-red-500" />} />
                <TaskSection title="Orçamentos Esquecidos (>7d)" tasks={staleTasks} icon={<ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />} />
                <TaskSection title="Para Hoje" tasks={todayTasks} icon={<CalendarIcon className="w-5 h-5 text-blue-500" />} />
                <TaskSection title="Próximas" tasks={upcomingTasks} icon={<ClockIcon className="w-5 h-5 text-gray-500" />} />

                {overdueTasks.length === 0 && todayTasks.length === 0 && upcomingTasks.length === 0 && staleTasks.length === 0 && (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                        <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-500"/>
                        <p className="font-semibold text-[var(--text-primary)]">Tudo em dia!</p>
                        <p className="text-sm">Nenhuma tarefa pendente ou futura.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- MAIN COMPONENT ---
const TasksView: React.FC<TasksViewProps> = ({ budgets, clients, reminders, onSelectBudget, userProfile }) => {
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const tasks = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTime = today.getTime();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const parseDateString = (dateString: string): Date => {
            if (dateString.includes('T')) {
                return new Date(dateString); 
            }
            const parts = dateString.split('-').map(Number);
            return new Date(parts[0], parts[1] - 1, parts[2]);
        };

        const followUpTasks: UnifiedTask[] = [];
        const staleBudgets: UnifiedTask[] = [];

        budgets.forEach(b => {
            const healthStatus = (b as any).healthStatus;
            
            // Stale logic - uses healthStatus 'attention'
            if (healthStatus === 'attention' && (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP)) {
                let lastActivityDate;
                if (b.followUps && b.followUps.length > 0) {
                    const latestFollowUpDate = Math.max(...b.followUps.map(fu => new Date(fu.date).getTime()));
                    lastActivityDate = new Date(latestFollowUpDate);
                } else {
                    lastActivityDate = new Date(b.dateSent);
                }

                const diffTime = Math.abs(new Date().getTime() - lastActivityDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                staleBudgets.push({
                    id: `stale-${b.id}`, type: 'stale', date: lastActivityDate.getTime(), title: b.title,
                    clientName: clientMap.get(b.clientId), value: b.value, budgetId: b.id,
                    isOverdue: false, isToday: false, daysSince: diffDays,
                    healthStatus: 'attention'
                });
            }

            // Follow-up task logic
            if ((b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP) && b.nextFollowUpDate) {
                 const eventDate = parseDateString(b.nextFollowUpDate!);
                const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                followUpTasks.push({
                    id: `budget-${b.id}`, type: 'follow-up', date: eventDate.getTime(), title: b.title,
                    clientName: clientMap.get(b.clientId), value: b.value, budgetId: b.id,
                    isOverdue: eventDateOnly.getTime() < todayTime,
                    isToday: eventDateOnly.getTime() === todayTime,
                    healthStatus: healthStatus
                });
            }
        });
        
        const reminderTasks: UnifiedTask[] = reminders
            .filter(r => !r.isDismissed)
            .map(r => {
                const eventDate = new Date(r.reminderDateTime);
                const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                return {
                    id: `reminder-${r.id}`, type: 'reminder', date: eventDate.getTime(), title: r.title,
                    isCompleted: r.isCompleted,
                    isOverdue: !r.isCompleted && eventDateOnly.getTime() < todayTime,
                    isToday: !r.isCompleted && eventDateOnly.getTime() === todayTime,
                };
            });

        const allTasks = [...followUpTasks, ...reminderTasks];
        
        const overdue = allTasks.filter(t => t.isOverdue && !t.isCompleted);
        const todayTasks = allTasks.filter(t => t.isToday && !t.isCompleted);
        const upcoming = allTasks.filter(t => !t.isOverdue && !t.isToday && !t.isCompleted);
        
        const sortByDate = (a: UnifiedTask, b: UnifiedTask) => a.date - b.date;
        
        const potentialValue = followUpTasks.reduce((sum, t) => sum + (t.value || 0), 0);

        return { 
            overdue: overdue.sort(sortByDate), 
            stale: staleBudgets.sort((a,b) => b.date - a.date),
            today: todayTasks.sort(sortByDate), 
            upcoming: upcoming.sort(sortByDate), 
            potentialValue 
        };
    }, [budgets, reminders, clientMap]);
    

    return (
        <div className="space-y-6">
             <AIBriefing 
                budgets={budgets} 
                userProfile={userProfile}
            />
            <AIFocusTask 
                budgets={budgets} 
                clients={clients} 
                userProfile={userProfile} 
                onSelectBudget={onSelectBudget}
            />
            <div>
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">Plano de Ação</h2>
                <p className="text-[var(--text-secondary)]">Seu centro de comando para um dia de vendas produtivo e focado.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <div className="animated-item" style={{ animationDelay: '100ms' }}><FocusOfTheDay /></div>
                    <div className="animated-item" style={{ animationDelay: '200ms' }}>
                        <UpcomingTasks 
                            overdueTasks={tasks.overdue}
                            staleTasks={tasks.stale}
                            todayTasks={tasks.today}
                            upcomingTasks={tasks.upcoming}
                            onSelectBudget={onSelectBudget} 
                        />
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <div className="animated-item" style={{ animationDelay: '300ms' }}><GoalsPanel tasks={tasks} budgets={budgets} /></div>
                    <div className="animated-item" style={{ animationDelay: '400ms' }}><DailyRhythm /></div>
                </div>
            </div>
        </div>
    );
};

export default TasksView;