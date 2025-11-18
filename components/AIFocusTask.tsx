import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Budget, Client, UserProfile } from '../types';
import { LightBulbIcon, SparklesIcon, CrosshairsIcon, BriefcaseIcon } from './icons';

interface AIFocusTaskProps {
  budgets: Budget[];
  clients: Client[];
  userProfile: UserProfile;
  onSelectBudget: (id: string) => void;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const AIFocusTask: React.FC<AIFocusTaskProps> = ({ budgets, clients, userProfile, onSelectBudget }) => {
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'success' | 'no-task' | 'error'>('idle');
    const [focusTask, setFocusTask] = useState<Budget | null>(null);
    const [client, setClient] = useState<Client | null>(null);
    const [strategy, setStrategy] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleAnalysis = async () => {
        setStatus('analyzing');
        setError(null);
        
        const findFocusTask = () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const activeBudgets = budgets.filter(b => ['Enviado', 'Em Follow-up'].includes(b.status));

            const overdue = activeBudgets.filter(b => (b as any).healthStatus === 'risk');
            const forToday = activeBudgets.filter(b => b.nextFollowUpDate && new Date(b.nextFollowUpDate.replace(/-/g, '/')).toDateString() === today.toDateString());
            
            overdue.sort((a, b) => b.value - a.value);
            if (overdue.length > 0) return overdue[0];

            forToday.sort((a, b) => b.value - a.value);
            if (forToday.length > 0) return forToday[0];
            
            return null;
        };
        
        const task = findFocusTask();
        if (!task) {
            setStatus('no-task');
            return;
        }

        const clientMap = new Map(clients.map(c => [c.id, c]));
        setFocusTask(task);
        setClient(clientMap.get(task.clientId) || null);
        
        try {
            if (!process.env.API_KEY) throw new Error("A chave de API do Gemini não foi configurada.");
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            // FIX: Resolve client name before creating the prompt to avoid potential type issues.
            const clientName = clientMap.get(task.clientId)?.name || 'Cliente desconhecido';
            const prompt = `
                Aja como um coach de vendas para ${userProfile.name}.
                Esta é a tarefa mais crítica para hoje: o orçamento "${task.title}" para o cliente "${clientName}", no valor de ${formatCurrency(task.value)}.
                O status de saúde do negócio é: ${(task as any).healthStatus}.
                Forneça uma estratégia curta, direta e acionável em uma ou duas frases para esta tarefa específica.
                Seja encorajador e focado na ação. A resposta DEVE ser um objeto JSON.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            strategy: { type: Type.STRING }
                        },
                        required: ['strategy']
                    }
                }
            });
            
            const jsonString = response.text?.trim();
            if (!jsonString) throw new Error("Resposta vazia da IA.");

            const parsed = JSON.parse(jsonString);
            setStrategy(parsed.strategy);
            setStatus('success');

        } catch (err) {
             console.error("Erro ao gerar estratégia com IA:", err);
             const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
             setError(`Não foi possível gerar a estratégia. Causa: ${errorMessage}`);
             setStatus('error');
        }
    };

    const renderContent = () => {
        switch (status) {
            case 'idle':
                return (
                    <div>
                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">Encontre sua Tarefa Mais Importante</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Deixe a IA analisar seus negócios pendentes e destacar a oportunidade mais crítica para você focar agora.</p>
                        <button onClick={handleAnalysis} className="mt-4 w-full bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-sm flex items-center justify-center gap-2">
                           <SparklesIcon className="w-4 h-4 text-purple-500" /> Encontrar Foco do Dia
                        </button>
                    </div>
                );
            case 'analyzing':
                return <p className="text-sm text-slate-500 dark:text-slate-400">IA analisando suas prioridades...</p>;
            case 'no-task':
                return (
                    <div>
                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">Tudo em dia! ✨</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Nenhuma tarefa crítica para hoje. Ótima oportunidade para prospectar novos clientes!</p>
                    </div>
                );
            case 'error':
                 return <p className="text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded-md">{error}</p>;
            case 'success':
                if (!focusTask || !client) return null;
                return (
                     <div>
                        <p className="text-xs font-bold uppercase text-purple-500 tracking-wider">Foco do Dia</p>
                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate">{focusTask.title}</h4>
                        <p className="font-semibold text-sm text-blue-600 dark:text-blue-400">{client.name}</p>
                        <p className="font-bold text-xl text-slate-700 dark:text-slate-200 mt-1">{formatCurrency(focusTask.value)}</p>
                        
                        <div className="mt-4 bg-white/50 dark:bg-slate-900/50 p-3 rounded-lg">
                            <h5 className="font-semibold text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5"><LightBulbIcon className="w-4 h-4 text-yellow-500"/> Estratégia da IA:</h5>
                            <p className="text-sm text-slate-800 dark:text-slate-200 mt-1">{strategy}</p>
                        </div>
                        
                        <button onClick={() => onSelectBudget(focusTask.id)} className="mt-4 w-full bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-sm flex items-center justify-center gap-2">
                           <BriefcaseIcon className="w-4 h-4" /> Ver Detalhes do Orçamento
                        </button>
                    </div>
                );
        }
    };
    
    return (
        <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 dark:from-slate-800 dark:via-purple-900/30 dark:to-blue-900/30 p-4 rounded-xl border border-blue-200 dark:border-slate-700 shadow-lg relative animated-item">
            <div className="flex items-start gap-4">
                 <div className="bg-white/50 dark:bg-slate-700/50 p-2 rounded-full mt-1">
                    <CrosshairsIcon className="w-7 h-7 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AIFocusTask;