import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Budget, Client, Reminder, PriorityDeal } from '../types';
import { BudgetStatus } from '../types';
import { 
    CalendarIcon, ExclamationTriangleIcon, BriefcaseIcon, LightBulbIcon, SparklesIcon,
    MoonIcon, SunIcon, CheckCircleIcon, TrophyIcon, ArrowTrendingUpIcon, ClockIcon, PencilIcon
} from './icons';

// --- PROPS ---
interface TasksViewProps {
  budgets: Budget[];
  clients: Client[];
  reminders: Reminder[];
  onSelectBudget: (id: string) => void;
}

// --- TYPES ---
type UnifiedTask = {
  id: string;
  type: 'follow-up' | 'reminder';
  date: Date;
  title: string;
  isCompleted?: boolean;
  clientName?: string;
  value?: number;
  budgetId?: string;
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};
const formatDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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

const GoalsPanel: React.FC<{ tasks: any, budgets: Budget[] }> = ({ tasks, budgets }) => {
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
                <MetricCard style={{ animationDelay: '200ms' }} title="Tarefas Atrasadas" value={tasks.overdue.length} icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-500"/>} />
                <MetricCard style={{ animationDelay: '300ms' }} title="Valor em Jogo" value={`R$ ${formatCurrency(tasks.potentialValue)}`} icon={<TrophyIcon className="w-6 h-6 text-green-500"/>} />
                <MetricCard style={{ animationDelay: '400ms' }} title="Orçamentos (7d)" value={weeklyNewBudgets} icon={<ArrowTrendingUpIcon className="w-6 h-6 text-purple-500"/>} />
            </div>
        </div>
    );
};

const AIPriorityActions: React.FC<{ budgets: Budget[], clients: Client[], onSelectBudget: (id: string) => void }> = ({ budgets, clients, onSelectBudget }) => {
    const [actions, setActions] = useState<PriorityDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const cache = useRef<{ data: PriorityDeal[], timestamp: number } | null>(null);

    useEffect(() => {
        const analyze = async () => {
            if (cache.current && (Date.now() - cache.current.timestamp < 10 * 60 * 1000)) { // 10 min cache
                setActions(cache.current.data);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            
            const activeBudgets = budgets
                .filter(b => [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP].includes(b.status))
                .map(b => ({
                    budgetId: b.id,
                    title: b.title,
                    value: b.value,
                    days_in_pipeline: Math.ceil((new Date().getTime() - new Date(b.dateSent).getTime()) / (1000 * 60 * 60 * 24)),
                    followup_count: b.followUps.length,
                    next_followup: b.nextFollowUpDate,
                }));
            
            if (activeBudgets.length === 0) {
                setLoading(false);
                setActions([]);
                return;
            }

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const prompt = `Aja como um coach de vendas estratégico. Analise a lista de orçamentos a seguir e retorne um array JSON com as 3 ações MAIS IMPORTANTES que o vendedor deve tomar hoje para maximizar os resultados. Para cada ação, retorne um objeto JSON com: "budgetId", "priorityScore" (0 a 100), "nextBestAction" (uma ação tática e clara), e "rationale" (uma justificativa estratégica concisa do 'porquê'). A resposta deve ser apenas o array JSON, ordenado por prioridade. Orçamentos: ${JSON.stringify(activeBudgets)}`;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash', contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.ARRAY, items: {
                                type: Type.OBJECT, properties: {
                                    budgetId: { type: Type.STRING },
                                    priorityScore: { type: Type.NUMBER },
                                    nextBestAction: { type: Type.STRING },
                                    rationale: { type: Type.STRING },
                                }, required: ['budgetId', 'priorityScore', 'nextBestAction', 'rationale'],
                            }
                        }
                    }
                });
                const deals = JSON.parse(response.text || '[]');
                setActions(deals);
                cache.current = { data: deals, timestamp: Date.now() };

            } catch (err) {
                setError("Falha ao obter sugestões da IA.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        analyze();
    }, [budgets]);

    return (
        <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)] shadow-sm">
            <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-3 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-500" /> Ações Prioritárias com IA
            </h3>
            {loading ? <p className="text-sm text-[var(--text-secondary)]">Analisando pipeline...</p> :
             error ? <p className="text-sm text-red-500">{error}</p> :
             actions.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">Nenhuma ação prioritária no momento.</p> :
             <div className="space-y-3">
                 {actions.map((action, index) => {
                     const budget = budgets.find(b => b.id === action.budgetId);
                     const client = clients.find(c => c.id === budget?.clientId);
                     if (!budget || !client) return null;
                     return (
                         <div key={index} onClick={() => onSelectBudget(budget.id)} className="bg-[var(--background-tertiary)] p-3 rounded-md cursor-pointer hover:bg-[var(--background-tertiary-hover)]">
                             <p className="font-bold text-sm text-[var(--text-primary)]">{action.nextBestAction}</p>
                             <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{client.name}</p>
                             <p className="text-xs text-[var(--text-secondary)] italic mt-1">"{action.rationale}"</p>
                         </div>
                     );
                 })}
             </div>
            }
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

const UpcomingTasks: React.FC<{ tasks: UnifiedTask[], onSelectBudget: (id: string) => void }> = ({ tasks, onSelectBudget }) => (
    <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)] shadow-sm">
        <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-3">Próximas Tarefas</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
            {tasks.length > 0 ? tasks.map(task => (
                <div key={task.id} onClick={() => task.budgetId && onSelectBudget(task.budgetId)} className={`flex items-center justify-between p-2 rounded-md ${task.budgetId ? 'cursor-pointer hover:bg-[var(--background-tertiary)]' : ''}`}>
                    <div className="flex items-center gap-3">
                        {task.type === 'follow-up' ? <BriefcaseIcon className="w-5 h-5 text-blue-500"/> : <LightBulbIcon className="w-5 h-5 text-purple-500"/>}
                        <div>
                            <p className={`text-sm font-semibold text-[var(--text-primary)] ${task.isCompleted ? 'line-through text-[var(--text-tertiary)]' : ''}`}>{task.title}</p>
                            {task.clientName && <p className="text-xs text-[var(--text-accent)]">{task.clientName}</p>}
                        </div>
                    </div>
                    <span className="text-xs font-bold text-[var(--text-secondary)]">{formatDate(task.date)}</span>
                </div>
            )) : <p className="text-sm text-center text-[var(--text-secondary)] p-4">Tudo em dia!</p>}
        </div>
    </div>
);


// --- MAIN COMPONENT ---
const TasksView: React.FC<TasksViewProps> = ({ budgets, clients, reminders, onSelectBudget }) => {
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const tasks = useMemo(() => {
        const followUpTasks: UnifiedTask[] = budgets
            .filter(b => (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP) && b.nextFollowUpDate)
            .map(b => ({
                id: `budget-${b.id}`, type: 'follow-up', date: new Date(b.nextFollowUpDate!), title: b.title,
                clientName: clientMap.get(b.clientId), value: b.value, budgetId: b.id,
            }));
        
        const reminderTasks: UnifiedTask[] = reminders
            .filter(r => !r.isDismissed)
            .map(r => ({
                id: `reminder-${r.id}`, type: 'reminder', date: new Date(r.reminderDateTime), title: r.title,
                isCompleted: r.isCompleted,
            }));

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const overdue = [...followUpTasks, ...reminderTasks].filter(t => !t.isCompleted && new Date(t.date) < today);
        const todayTasks = [...followUpTasks, ...reminderTasks].filter(t => !t.isCompleted && new Date(t.date).toDateString() === today.toDateString());
        const upcoming = [...followUpTasks, ...reminderTasks].filter(t => !t.isCompleted && new Date(t.date) > today);
        
        const sortByDate = (a: UnifiedTask, b: UnifiedTask) => a.date.getTime() - b.date.getTime();
        
        const potentialValue = followUpTasks.reduce((sum, t) => sum + (t.value || 0), 0);

        return { 
            overdue: overdue.sort(sortByDate), 
            today: todayTasks.sort(sortByDate), 
            upcoming: upcoming.sort(sortByDate), 
            potentialValue 
        };
    }, [budgets, reminders, clientMap]);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">Plano de Ação Estratégico</h2>
                <p className="text-[var(--text-secondary)]">Seu centro de comando para um dia de vendas produtivo e focado.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <FocusOfTheDay />
                    <AIPriorityActions budgets={budgets} clients={clients} onSelectBudget={onSelectBudget} />
                    <UpcomingTasks tasks={[...tasks.today, ...tasks.upcoming]} onSelectBudget={onSelectBudget} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <GoalsPanel tasks={tasks} budgets={budgets} />
                    <DailyRhythm />
                </div>
            </div>
        </div>
    );
};

export default TasksView;
