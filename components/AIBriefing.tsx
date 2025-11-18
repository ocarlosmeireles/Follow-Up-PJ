import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Budget, UserProfile } from 'types';
import { LightBulbIcon, SparklesIcon, XMarkIcon } from './icons';

interface AIBriefingProps {
  budgets: Budget[];
  userProfile: UserProfile;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const AIBriefing: React.FC<AIBriefingProps> = ({ budgets, userProfile }) => {
    const [viewState, setViewState] = useState<'idle' | 'loading' | 'showingResult' | 'error'>('idle');
    const [briefing, setBriefing] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(true);

    const generateBriefing = async () => {
        setViewState('loading');
        setError(null);

        try {
            if (!process.env.API_KEY) {
                throw new Error("A chave de API do Gemini não foi configurada.");
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tasksForAI = budgets
                .filter(b => (b as any).healthStatus === 'risk' || (b.nextFollowUpDate && new Date(b.nextFollowUpDate.replace(/-/g, '/')).toDateString() === today.toDateString()))
                .map(b => `- "${b.title}" (Valor: ${formatCurrency(b.value)}). Status Saúde: ${(b as any).healthStatus}. `)
                .slice(0, 10);

            if (tasksForAI.length === 0) {
                setBriefing("✨ **Tudo em dia!** Aproveite para prospectar novos clientes e avançar nos negócios em andamento. Uma ótima dica é revisar seus clientes inativos e tentar uma nova abordagem.");
                setViewState('showingResult');
                return;
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Aja como um coach de vendas experiente para o vendedor ${userProfile.name}.
                Analise a lista de tarefas e negócios pendentes para hoje e forneça uma "Inteligência do Dia" em português do Brasil.
                A resposta deve ser um parágrafo curto de resumo, seguido por uma lista com as 3 principais prioridades, e por fim uma dica de vendas motivacional.
                Use markdown para formatação (negrito, listas). Não mencione o ID do Cliente, use apenas o nome do orçamento.

                Tarefas de Hoje:
                ${tasksForAI.join('\n')}

                Exemplo de Resposta:
                "Bom dia, ${userProfile.name}! Hoje o foco é nos negócios em risco. Vamos revertê-los! 🚀

                **Suas 3 prioridades:**
                *   **Recuperar [Nome do Orçamento 1]:** O follow-up está atrasado. Envie uma mensagem de valor para reengajar.
                *   **Avançar com [Nome do Orçamento 2]:** O follow-up é hoje. Tente agendar o próximo passo.
                *   **Não perder [Nome do Orçamento 3]:** Outro negócio em risco. Tente um contato por telefone.

                **Dica do Dia:** Lembre-se, a persistência inteligente vence. Cada "não" te deixa mais perto do "sim"! 💪"
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            setBriefing(response.text || '');
            setViewState('showingResult');

        } catch (err) {
            console.error("Erro ao gerar briefing com IA:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
            setError(`Não foi possível gerar a Inteligência do Dia. Causa: ${errorMessage}`);
            setViewState('error');
        }
    };
    
    if (!isVisible) return null;

    return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-purple-900/40 p-4 rounded-xl border border-blue-200 dark:border-slate-700 shadow-md relative animated-item">
            <button onClick={() => setIsVisible(false)} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <XMarkIcon className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-4">
                <div className="bg-white/50 dark:bg-slate-700/50 p-2 rounded-full mt-1">
                    <LightBulbIcon className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-purple-500" />
                        Inteligência do Dia
                    </h3>

                    {viewState === 'idle' && (
                        <>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Receba 3 prioridades e uma dica de vendas com base nas suas tarefas de hoje.</p>
                            <button onClick={generateBriefing} className="mt-3 bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-sm flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4" /> Gerar Briefing com IA
                            </button>
                        </>
                    )}

                    {viewState === 'loading' && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Analisando suas tarefas...</p>}
                    
                    {viewState === 'error' && <p className="text-sm text-red-600 dark:text-red-400 mt-2 bg-red-100 dark:bg-red-900/30 p-2 rounded-md">{error}</p>}
                    
                    {viewState === 'showingResult' && briefing && (
                        <div className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap font-sans"
                             dangerouslySetInnerHTML={{ __html: briefing.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^\s*\*\s/gm, '<span class="mr-2">•</span>') }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
