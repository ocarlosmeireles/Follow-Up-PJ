import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Budget, Client, Reminder, PriorityDeal, DailyBriefing, UserProfile } from '../types';
import { BudgetStatus } from '../types';
import { 
    CalendarIcon, ExclamationTriangleIcon, BriefcaseIcon, LightBulbIcon, SparklesIcon,
    MoonIcon, SunIcon, CheckCircleIcon, TrophyIcon, ArrowTrendingUpIcon, ClockIcon, PencilIcon, ExclamationCircleIcon, FireIcon
} from './icons';

// --- PROPS ---
interface TasksViewProps {
  budgets: Budget[];
  clients: Client[];
  reminders: Reminder[];
  onSelectBudget: (id: string) => void;
  userProfile: UserProfile;
}

// --- TYPES ---
type UnifiedTask = {
  id: string;
  type: 'follow-up' | 'reminder';
  date: number; // Storing as timestamp for stability
  title: string;
  isCompleted?: boolean;
  clientName?: string;
  value?: number;
  budgetId?: string;
  isOverdue: boolean;
  isToday: boolean;
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

const DailyBriefingPanel: React.FC<{
    briefingData: any;
    userProfile: UserProfile;
    onSelectBudget: (id: string) => void;
}> = ({ briefingData, userProfile, onSelectBudget }) => {
    const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const today = new Date().toDateString();
        try {
            const cached = localStorage.getItem('dailyBriefing');
            if (cached) {
                const { date, data } = JSON.parse(cached);
                if (date === today) {
                    setBriefing(data);
                }
            }
        } catch (e) {
            console.error("Failed to read cached briefing", e);
            localStorage.removeItem('dailyBriefing');
        }
    }, []);

    const handleGenerateBriefing = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Aja como um coach de vendas expert e assistente pessoal. O nome do vendedor é ${userProfile.name}.
Com base nos dados a seguir, crie um "briefing diário" conciso e motivacional para o vendedor. A resposta DEVE ser um objeto JSON.

Dados de hoje:
- Tarefas Atrasadas: ${JSON.stringify(briefingData.overdueTasks.slice(0, 5))}
- Tarefas para Hoje: ${JSON.stringify(briefingData.todayTasks.slice(0, 5))}
- Orçamentos Ativos de Alto Valor (> R$ 10.000): ${JSON.stringify(briefingData.highValueActive.slice(0, 3))}
- Vitórias Recentes: ${JSON.stringify(briefingData.recentWins.slice(0, 2))}
- Perdas Recentes: ${JSON.stringify(briefingData.recentLosses.slice(0, 2))}

O objeto JSON de resposta deve ter os seguintes campos:
- "greeting": Uma saudação curta e personalizada para ${userProfile.name}.
- "priorities": Um array com as 3 principais prioridades para hoje. Cada item é um objeto com "text" (a ação recomendada) e opcionalmente "budgetId".
- "warnings": Um array com até 2 "pontos de atenção" (riscos, orçamentos parados). Cada item é um objeto com "text" e opcionalmente "budgetId".
- "quickWins": Um array com até 2 "ganhos rápidos" (ações fáceis como parabenizar um cliente). Cada item é um objeto com "text" e opcionalmente "budgetId".
- "motivation": Uma frase motivacional curta para fechar o briefing.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT, properties: {
                            greeting: { type: Type.STRING },
                            priorities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, budgetId: { type: Type.STRING, nullable: true } } } },
                            warnings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, budgetId: { type: Type.STRING, nullable: true } } } },
                            quickWins: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, budgetId: { type: Type.STRING, nullable: true } } } },
                            motivation: { type: Type.STRING }
                        }
                    }
                }
            });
            const data = JSON.parse(response.text || '{}');
            setBriefing(data);
            localStorage.setItem('dailyBriefing', JSON.stringify({ date: new Date().toDateString(), data }));
        } catch (err) {
            console.error(err);
            setError("Falha ao gerar o briefing. Verifique a chave da API e tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const BriefingItem: React.FC<{ item: { text: string; budgetId?: string }, icon: React.ReactNode }> = ({ item, icon }) => (
        <div 
            onClick={() => item.budgetId && onSelectBudget(item.budgetId)}
            className={`flex items-start gap-3 p-3 rounded-md ${item.budgetId ? 'cursor-pointer hover:bg-[var(--background-secondary-hover)]' : ''}`}
        >
            <div className="flex-shrink-0 mt-1">{icon}</div>
            <p className="text-sm text-[var(--text-secondary)]">{item.text}</p>
        </div>
    );
    
    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-800 dark:to-purple-900/50 p-6 rounded-lg border border-[var(--border-primary)] shadow-sm text-center">
                 <SparklesIcon className="w-10 h-10 text-purple-500 mx-auto animate-pulse mb-3" />
                 <p className="font-semibold text-[var(--text-primary)]">Analisando seus dados para criar o plano perfeito...</p>
                 <p className="text-sm text-[var(--text-secondary)]">Isso pode levar alguns segundos.</p>
            </div>
        );
    }

    if (error) {
         return <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-200 dark:border-red-800 text-center"><p className="text-red-700 dark:text-red-300 font-semibold">{error}</p></div>
    }

    if (!briefing) {
        return (
             <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-800 dark:to-purple-900/50 p-6 rounded-lg border border-[var(--border-primary)] shadow-sm text-center">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Seu Briefing Diário Inteligente</h3>
                <p className="text-[var(--text-secondary)] mt-2 mb-4">Comece seu dia com um resumo estratégico gerado por IA sobre suas prioridades, riscos e oportunidades.</p>
                <button onClick={handleGenerateBriefing} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center mx-auto transition-colors shadow-lg hover:shadow-purple-400/30">
                    <SparklesIcon className="w-5 h-5 mr-2" />
                    Gerar Briefing do Dia
                </button>
            </div>
        );
    }
    
    return (
         <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-lg border border-[var(--border-primary)] shadow-sm">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{briefing.greeting}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                <div>
                    <h4 className="font-semibold flex items-center gap-2 text-red-600 dark:text-red-400"><FireIcon className="w-5 h-5"/> Prioridades Máximas</h4>
                    <div className="mt-2 space-y-1">{briefing.priorities.map((p, i) => <BriefingItem key={`p-${i}`} item={p} icon={<span className="font-bold text-red-500">{i + 1}.</span>} />)}</div>
                </div>
                 <div>
                    <h4 className="font-semibold flex items-center gap-2 text-yellow-600 dark:text-yellow-400"><ExclamationTriangleIcon className="w-5 h-5"/> Pontos de Atenção</h4>
                     <div className="mt-2 space-y-1">{briefing.warnings.map((w, i) => <BriefingItem key={`w-${i}`} item={w} icon={<ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />} />)}</div>
                </div>
                 <div>
                    <h4 className="font-semibold flex items-center gap-2 text-green-600 dark:text-green-400"><CheckCircleIcon className="w-5 h-5"/> Ganhos Rápidos</h4>
                     <div className="mt-2 space-y-1">{briefing.quickWins.map((q, i) => <BriefingItem key={`q-${i}`} item={q} icon={<CheckCircleIcon className="w-4 h-4 text-green-500" />} />)}</div>
                </div>
            </div>
            <p className="text-center text-sm italic font-semibold text-purple-600 dark:text-purple-400 mt-6 pt-4 border-t border-[var(--border-primary)]">"{briefing.motivation}"</p>
         </div>
    );
};


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
                <MetricCard style={{ animationDelay: '200ms' }} title="Tarefas Atrasadas" value={tasks.overdue.length} icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-500"/>} />
                <MetricCard style={{ animationDelay: '300ms' }} title="Valor em Jogo" value={`R$ ${formatCurrency(tasks.potentialValue)}`} icon={<TrophyIcon className="w-6 h-6 text-green-500"/>} />
                <MetricCard style={{ animationDelay: '400ms' }} title="Orçamentos (7d)" value={weeklyNewBudgets} icon={<ArrowTrendingUpIcon className="w-6 h-6 text-purple-500"/>} />
            </div>
        </div>
    );
};

const AIPriorityActions: React.FC<{ budgets: Budget[], clients: Client[], onSelectBudget: (id: string) => void }> = ({ budgets, clients, onSelectBudget }) => {
    const [actions, setActions] = useState<PriorityDeal[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAnalyzed, setIsAnalyzed] = useState(false);
    const cache = useRef<{ data: PriorityDeal[], timestamp: number } | null>(null);

    const analyze = async () => {
        if (cache.current && (Date.now() - cache.current.timestamp < 10 * 60 * 1000)) { // 10 min cache
            setActions(cache.current.data);
            setIsAnalyzed(true);
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
            setIsAnalyzed(true);
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
            if (!Array.isArray(deals)) {
                console.error("AI response is not an array:", deals);
                throw new Error("Formato de resposta da IA inválido.");
            }
            setActions(deals);
            cache.current = { data: deals, timestamp: Date.now() };
            setIsAnalyzed(true);

        } catch (err) {
            setError("Falha ao obter sugestões da IA.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    const renderContent = () => {
        if (!isAnalyzed) {
             return (
                <div className="text-center p-4">
                    <p className="text-sm text-[var(--text-secondary)] mb-3">Deixe a IA analisar seu pipeline e sugerir as próximas melhores ações para focar hoje.</p>
                    <button onClick={analyze} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center mx-auto transition-colors">
                        <SparklesIcon className="w-5 h-5 mr-2" />
                        Analisar e Sugerir Ações
                    </button>
                </div>
            );
        }
        if (loading) return <p className="text-sm text-[var(--text-secondary)] p-4">Analisando pipeline...</p>;
        if (error) return <p className="text-sm text-red-500 p-4">{error}</p>;
        if (actions.length === 0) return <p className="text-sm text-[var(--text-secondary)] p-4">Nenhuma ação prioritária no momento. Você está em dia!</p>;

        return (
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
        );
    };

    return (
        <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)] shadow-sm">
            <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-3 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-500" /> Ações Prioritárias com IA
            </h3>
            {renderContent()}
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
    
    return (
        <div 
            onClick={() => isFollowUp && task.budgetId && onSelectBudget(task.budgetId)}
            style={{ animationDelay: `${50 * index}ms` }}
            className={`flex items-center gap-3 p-3 rounded-lg border-l-4 animated-item ${
                isFollowUp ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50' 
                           : 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
            } ${task.isCompleted ? 'opacity-60' : ''}`}
        >
            <div className="flex-shrink-0">
                {isFollowUp ? <BriefcaseIcon className="w-5 h-5 text-blue-500"/> : <LightBulbIcon className="w-5 h-5 text-purple-500"/>}
            </div>
            <div className="flex-grow overflow-hidden">
                <p className={`font-semibold text-[var(--text-primary)] truncate ${task.isCompleted ? 'line-through text-[var(--text-tertiary)]' : ''}`}>{task.title}</p>
                {task.clientName && <p className="text-xs text-[var(--text-accent)] truncate">{task.clientName}</p>}
            </div>
            <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-[var(--text-secondary)]">{formatTimeOrDate(task.date, !task.isOverdue)}</p>
                {task.isOverdue && !task.isCompleted && <p className="text-xs font-bold text-red-500">Atrasado</p>}
            </div>
        </div>
    );
});

const UpcomingTasks: React.FC<{ 
    overdueTasks: UnifiedTask[],
    todayTasks: UnifiedTask[],
    upcomingTasks: UnifiedTask[],
    onSelectBudget: (id: string) => void 
}> = ({ overdueTasks, todayTasks, upcomingTasks, onSelectBudget }) => {
    
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
                <TaskSection title="Para Hoje" tasks={todayTasks} icon={<CalendarIcon className="w-5 h-5 text-yellow-500" />} />
                <TaskSection title="Próximas" tasks={upcomingTasks} icon={<ClockIcon className="w-5 h-5 text-blue-500" />} />

                {overdueTasks.length === 0 && todayTasks.length === 0 && upcomingTasks.length === 0 && (
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

        const parseDateString = (dateString: string): Date => {
            if (dateString.includes('T')) {
                return new Date(dateString); 
            }
            const parts = dateString.split('-').map(Number);
            return new Date(parts[0], parts[1] - 1, parts[2]);
        };

        const followUpTasks: UnifiedTask[] = budgets
            .filter(b => (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP) && b.nextFollowUpDate)
            .map(b => {
                const eventDate = parseDateString(b.nextFollowUpDate!);
                const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                return {
                    id: `budget-${b.id}`, type: 'follow-up', date: eventDate.getTime(), title: b.title,
                    clientName: clientMap.get(b.clientId), value: b.value, budgetId: b.id,
                    isOverdue: eventDateOnly.getTime() < todayTime,
                    isToday: eventDateOnly.getTime() === todayTime,
                };
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
            today: todayTasks.sort(sortByDate), 
            upcoming: upcoming.sort(sortByDate), 
            potentialValue 
        };
    }, [budgets, reminders, clientMap]);
    
    const briefingData = useMemo(() => {
        const highValueActive = budgets
            .filter(b => b.value > 10000 && [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP].includes(b.status))
            .map(b => ({ id: b.id, title: b.title, value: b.value, clientName: clientMap.get(b.clientId) }));

        const recentWins = budgets
            .filter(b => b.status === BudgetStatus.INVOICED)
            .map(b => ({ id: b.id, title: b.title, value: b.value, clientName: clientMap.get(b.clientId) }));
            
        const recentLosses = budgets
            .filter(b => b.status === BudgetStatus.LOST)
            .map(b => ({ id: b.id, title: b.title, value: b.value, clientName: clientMap.get(b.clientId), reason: b.lostReason }));

        return {
            overdueTasks: tasks.overdue.map(t => ({ id: t.budgetId, title: t.title })),
            todayTasks: tasks.today.map(t => ({ id: t.budgetId, title: t.title })),
            highValueActive,
            recentWins,
            recentLosses,
        };
    }, [budgets, tasks, clientMap]);


    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">Plano de Ação Estratégico</h2>
                <p className="text-[var(--text-secondary)]">Seu centro de comando para um dia de vendas produtivo e focado.</p>
            </div>

            <div className="animated-item">
                <DailyBriefingPanel briefingData={briefingData} userProfile={userProfile} onSelectBudget={onSelectBudget} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <div className="animated-item" style={{ animationDelay: '100ms' }}><FocusOfTheDay /></div>
                    <div className="animated-item" style={{ animationDelay: '200ms' }}><AIPriorityActions budgets={budgets} clients={clients} onSelectBudget={onSelectBudget} /></div>
                    <div className="animated-item" style={{ animationDelay: '300ms' }}>
                        <UpcomingTasks 
                            overdueTasks={tasks.overdue}
                            todayTasks={tasks.today}
                            upcomingTasks={tasks.upcoming}
                            onSelectBudget={onSelectBudget} 
                        />
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <div className="animated-item" style={{ animationDelay: '400ms' }}><GoalsPanel tasks={tasks} budgets={budgets} /></div>
                    <div className="animated-item" style={{ animationDelay: '500ms' }}><DailyRhythm /></div>
                </div>
            </div>
        </div>
    );
};

export default TasksView;