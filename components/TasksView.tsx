import React, { useMemo, useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Budget, Client, Reminder } from '../types';
import { BriefcaseIcon, ClockIcon, ExclamationTriangleIcon, FireIcon, SparklesIcon, LightBulbIcon, SunIcon, TrashIcon } from './icons';

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

interface AIAction {
  taskId: string;
  microTip: string;
}
interface AITimeBlock {
  summary: string;
  tasks: AIAction[];
}
interface AIPlan {
  morning: AITimeBlock;
  afternoon: AITimeBlock;
  lateAfternoon: AITimeBlock;
}

// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

// --- SUB-COMPONENTS ---
const TaskCard: React.FC<{ task: UnifiedTask; onSelectBudget: (id: string) => void; microTip?: string }> = ({ task, onSelectBudget, microTip }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(task.date);
    taskDate.setHours(0, 0, 0, 0);

    const isOverdue = !task.isCompleted && taskDate < today;

    const cardStyles = {
        'follow-up': { icon: <BriefcaseIcon className="w-5 h-5 text-blue-500" />, borderColor: 'border-l-blue-500' },
        'reminder': { icon: <ClockIcon className="w-5 h-5 text-purple-500" />, borderColor: 'border-l-purple-500' },
    };
    
    const { icon, borderColor } = cardStyles[task.type];
    const finalBorderColor = isOverdue ? 'border-l-red-500' : borderColor;

    return (
        <div 
            onClick={() => task.type === 'follow-up' && task.budgetId && onSelectBudget(task.budgetId)}
            className={`bg-[var(--background-secondary)] p-3 rounded-lg shadow-sm border-l-4 transition-all duration-200 ${finalBorderColor} ${task.type === 'follow-up' ? 'cursor-pointer hover:bg-[var(--background-secondary-hover)] hover:shadow-md' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">{icon}</div>
                <div className="flex-grow">
                    <p className={`font-semibold text-[var(--text-primary)] ${task.isCompleted ? 'line-through text-[var(--text-tertiary)]' : ''}`}>{task.title}</p>
                    {task.clientName && <p className="text-sm text-[var(--text-accent)]">{task.clientName}</p>}
                </div>
            </div>
            {(task.value !== undefined || task.date) && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--border-primary)] text-sm">
                    <span className="font-semibold text-[var(--text-secondary)]">{task.value !== undefined ? `R$ ${formatCurrency(task.value)}` : ''}</span>
                    <span className={`font-semibold ${isOverdue ? 'text-red-500' : 'text-[var(--text-tertiary)]'}`}>
                        {new Date(task.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                </div>
            )}
            {microTip && (
                <div className="mt-2 pt-2 border-t border-dashed border-[var(--border-primary)]/70 flex items-start gap-2 text-purple-700 dark:text-purple-300">
                    <LightBulbIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-xs italic">{microTip}</p>
                </div>
            )}
        </div>
    );
};

// FIX: The component definition was incomplete, causing a syntax error. It has been fully implemented to manage and display task pools.
const TaskPool: React.FC<{ title: string; tasks: UnifiedTask[]; onSelectBudget: (id: string) => void; aiActions?: AIAction[] }> = ({ title, tasks, onSelectBudget, aiActions }) => {
    const findMicroTip = (taskId: string) => aiActions?.find(a => a.taskId === taskId)?.microTip;

    return (
        <div className="bg-[var(--background-tertiary)] p-3 rounded-lg flex flex-col flex-1 min-w-[300px]">
            <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-3 px-1">{title} ({tasks.length})</h3>
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
                {tasks.length > 0 ? tasks.map(task => (
                    <div key={task.id} className="mb-3">
                        <TaskCard 
                            task={task} 
                            onSelectBudget={onSelectBudget}
                            microTip={findMicroTip(task.id)}
                        />
                    </div>
                )) : <p className="text-sm text-center text-[var(--text-secondary)] pt-8">Nenhuma tarefa aqui.</p>}
            </div>
        </div>
    );
};


const TasksView: React.FC<TasksViewProps> = ({ budgets, clients, reminders, onSelectBudget }) => {
    const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const allTasks = useMemo<UnifiedTask[]>(() => {
        const followUpTasks: UnifiedTask[] = budgets
            .filter(b => b.nextFollowUpDate)
            .map(b => ({
                id: `follow-up-${b.id}`,
                type: 'follow-up',
                date: new Date(b.nextFollowUpDate!),
                title: b.title,
                clientName: clientMap.get(b.clientId) || 'Cliente',
                value: b.value,
                budgetId: b.id
            }));
        
        const reminderTasks: UnifiedTask[] = reminders
            .filter(r => !r.isDismissed)
            .map(r => ({
                id: `reminder-${r.id}`,
                type: 'reminder',
                date: new Date(r.reminderDateTime),
                title: r.title,
                isCompleted: r.isCompleted
            }));

        return [...followUpTasks, ...reminderTasks].sort((a,b) => a.date.getTime() - b.date.getTime());
    }, [budgets, reminders, clientMap]);

    const { overdueTasks, todayTasks, upcomingTasks } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const overdue: UnifiedTask[] = [];
        const todayT: UnifiedTask[] = [];
        const upcoming: UnifiedTask[] = [];

        allTasks.forEach(task => {
            if(task.isCompleted) return;
            const taskDate = new Date(task.date);
            taskDate.setHours(0, 0, 0, 0);

            if (taskDate < today) {
                overdue.push(task);
            } else if (taskDate.getTime() === today.getTime()) {
                todayT.push(task);
            } else {
                upcoming.push(task);
            }
        });

        return { overdueTasks: overdue, todayTasks: todayT, upcomingTasks: upcoming };
    }, [allTasks]);

    const handleGeneratePlan = async () => {
        setIsLoadingAI(true);
        setAiError(null);
        setAiPlan(null);

        const tasksForAI = todayTasks.map(t => ({ id: t.id, title: t.title, type: t.type, value: t.value }));
        if (tasksForAI.length === 0) {
            setAiError("Nenhuma tarefa para hoje. Adicione algumas tarefas e tente novamente.");
            setIsLoadingAI(false);
            return;
        }

        try {
            if (!process.env.API_KEY) throw new Error("A chave da API do Gemini não foi configurada.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const prompt = `Você é um coach de produtividade. Sua tarefa é analisar esta lista de tarefas de hoje e criar um "Plano de Ação Inteligente".
    
Tarefas de hoje: ${JSON.stringify(tasksForAI)}

Sua resposta DEVE ser um objeto JSON com a seguinte estrutura:
{
  "morning": { "summary": "string", "tasks": [{ "taskId": "string", "microTip": "string" }] },
  "afternoon": { "summary": "string", "tasks": [{ "taskId": "string", "microTip": "string" }] },
  "lateAfternoon": { "summary": "string", "tasks": [{ "taskId": "string", "microTip": "string" }] }
}
Onde:
- "summary" é um breve resumo (1 frase) do foco para aquele bloco de tempo (manhã, tarde, fim de tarde).
- "tasks" é um array onde cada objeto contém o "taskId" original da tarefa e uma "microTip" (uma dica rápida e acionável, com no máximo 10 palavras, para executar aquela tarefa com eficácia).
- Distribua as tarefas entre os blocos de tempo de forma lógica (ex: tarefas de maior valor pela manhã).
- Se não houver tarefas para um bloco, retorne um array vazio para "tasks".`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            morning: { 
                                type: Type.OBJECT,
                                properties: {
                                    summary: { type: Type.STRING },
                                    tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { taskId: { type: Type.STRING }, microTip: { type: Type.STRING } }, required: ["taskId", "microTip"] } }
                                },
                                required: ["summary", "tasks"]
                             },
                            afternoon: { 
                                type: Type.OBJECT,
                                properties: {
                                    summary: { type: Type.STRING },
                                    tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { taskId: { type: Type.STRING }, microTip: { type: Type.STRING } }, required: ["taskId", "microTip"] } }
                                },
                                required: ["summary", "tasks"]
                            },
                             lateAfternoon: { 
                                type: Type.OBJECT,
                                properties: {
                                    summary: { type: Type.STRING },
                                    tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { taskId: { type: Type.STRING }, microTip: { type: Type.STRING } }, required: ["taskId", "microTip"] } }
                                },
                                required: ["summary", "tasks"]
                            }
                        },
                        required: ["morning", "afternoon", "lateAfternoon"]
                    }
                }
            });

            const jsonString = response.text.trim();
            const plan = JSON.parse(jsonString);
            setAiPlan(plan);
        } catch (error) {
            console.error("AI plan generation failed:", error);
            setAiError("Falha ao gerar o plano. Tente novamente mais tarde.");
        } finally {
            setIsLoadingAI(false);
        }
    };
    
    const getTasksForBlock = (taskIds: string[]) => todayTasks.filter(t => taskIds.includes(t.id));

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Plano de Ação</h1>
                    <p className="text-[var(--text-secondary)]">Suas tarefas e follow-ups organizados para máxima produtividade.</p>
                </div>
                 <button 
                    onClick={handleGeneratePlan}
                    disabled={isLoadingAI || todayTasks.length === 0}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm disabled:bg-purple-400 disabled:cursor-not-allowed self-start md:self-center"
                >
                    {isLoadingAI ? (
                        <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <SparklesIcon className="w-5 h-5 mr-2" />
                    )}
                    {isLoadingAI ? 'Gerando Plano...' : 'Plano do Dia com IA'}
                </button>
            </div>

            {aiError && <div className="p-3 bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 rounded-lg">{aiError}</div>}
            
            {aiPlan ? (
                <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
                    <div className="flex-1 flex flex-col bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)] shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2"><SunIcon className="w-5 h-5 text-yellow-500"/>Manhã</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-3 italic">"{aiPlan.morning.summary}"</p>
                        <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
                             {getTasksForBlock(aiPlan.morning.tasks.map(t=>t.taskId)).map(task => (
                                 <div key={task.id} className="mb-3"><TaskCard task={task} onSelectBudget={onSelectBudget} microTip={aiPlan.morning.tasks.find(t=>t.taskId === task.id)?.microTip} /></div>
                             ))}
                        </div>
                    </div>
                     <div className="flex-1 flex flex-col bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)] shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2"><SunIcon className="w-5 h-5 text-orange-500"/>Tarde</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-3 italic">"{aiPlan.afternoon.summary}"</p>
                        <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
                             {getTasksForBlock(aiPlan.afternoon.tasks.map(t=>t.taskId)).map(task => (
                                 <div key={task.id} className="mb-3"><TaskCard task={task} onSelectBudget={onSelectBudget} microTip={aiPlan.afternoon.tasks.find(t=>t.taskId === task.id)?.microTip} /></div>
                             ))}
                        </div>
                    </div>
                     <div className="flex-1 flex flex-col bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)] shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2"><SunIcon className="w-5 h-5 text-indigo-500"/>Fim de Tarde</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-3 italic">"{aiPlan.lateAfternoon.summary}"</p>
                        <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
                             {getTasksForBlock(aiPlan.lateAfternoon.tasks.map(t=>t.taskId)).map(task => (
                                 <div key={task.id} className="mb-3"><TaskCard task={task} onSelectBudget={onSelectBudget} microTip={aiPlan.lateAfternoon.tasks.find(t=>t.taskId === task.id)?.microTip} /></div>
                             ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
                    <TaskPool title="Atrasadas" tasks={overdueTasks} onSelectBudget={onSelectBudget} />
                    <TaskPool title="Para Hoje" tasks={todayTasks} onSelectBudget={onSelectBudget} />
                    <TaskPool title="Próximas" tasks={upcomingTasks} onSelectBudget={onSelectBudget} />
                </div>
            )}
            
        </div>
    );
};

export default TasksView;
