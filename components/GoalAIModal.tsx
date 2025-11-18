import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { UserData, Budget } from '../types';
import { BudgetStatus } from '../types';
import { XMarkIcon, SparklesIcon, TrophyIcon } from './icons';

interface GoalAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserData;
  budgets: Budget[];
  onApplyGoal: (userId: string, newGoal: number) => void;
}

interface SuggestionResult {
    suggestedGoal: number;
    rationale: string;
}

const GoalAIModal: React.FC<GoalAIModalProps> = ({ isOpen, onClose, user, budgets, onApplyGoal }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SuggestionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const performanceMetrics = useMemo(() => {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const recentBudgets = budgets.filter(b => new Date(b.dateSent) >= ninetyDaysAgo);
        const invoiced = recentBudgets.filter(b => b.status === BudgetStatus.INVOICED);
        const lost = recentBudgets.filter(b => b.status === BudgetStatus.LOST);
        
        const totalInvoicedValue = invoiced.reduce((sum, b) => sum + b.value, 0);
        const totalDecided = invoiced.length + lost.length;
        const conversionRate = totalDecided > 0 ? (invoiced.length / totalDecided) * 100 : 0;
        
        return {
            totalInvoicedValue,
            budgetsCreated: recentBudgets.length,
            conversionRate: conversionRate.toFixed(1)
        };
    }, [budgets]);

    useEffect(() => {
        if (!isOpen) return;

        const generateSuggestion = async () => {
            setLoading(true);
            setResult(null);
            setError(null);

            try {
                if (!process.env.API_KEY) throw new Error("A chave de API do Gemini não foi configurada.");
                
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                const prompt = `Aja como um diretor de vendas experiente. Analise os dados de performance dos últimos 90 dias do vendedor "${user.name}" e sugira uma nova meta de vendas mensal (monthlyGoal) que seja ambiciosa, mas realista. Considere um crescimento saudável em relação à performance passada. Forneça uma breve justificativa (rationale).

Dados de performance (últimos 90 dias):
- Valor total faturado: R$ ${performanceMetrics.totalInvoicedValue.toFixed(2)} (Média mensal: R$ ${(performanceMetrics.totalInvoicedValue / 3).toFixed(2)})
- Total de orçamentos criados: ${performanceMetrics.budgetsCreated}
- Taxa de conversão: ${performanceMetrics.conversionRate}%
- Meta mensal atual: R$ ${user.monthlyGoal || 0}

Sua resposta DEVE ser um objeto JSON.`;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                suggestedGoal: {
                                    type: Type.NUMBER,
                                    description: 'A nova meta mensal sugerida, como um número arredondado. Ex: 15500.',
                                },
                                rationale: {
                                    type: Type.STRING,
                                    description: 'Uma breve justificativa para a meta sugerida, explicando o cálculo ou a lógica.',
                                },
                            },
                            required: ['suggestedGoal', 'rationale'],
                        },
                    }
                });

                const jsonString = response.text?.trim();
                if (jsonString) {
                    const parsedResult = JSON.parse(jsonString);
                    setResult(parsedResult);
                } else {
                    setError("A IA retornou uma resposta vazia.");
                }

            } catch (err) {
                console.error("Erro ao gerar sugestão com IA:", err);
                setError("Ocorreu um erro ao gerar a sugestão. Verifique sua chave de API e tente novamente.");
            } finally {
                setLoading(false);
            }
        };

        generateSuggestion();
    }, [isOpen, user, performanceMetrics]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md m-4 transform transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-purple-500"/>
                        Sugestão de Meta para {user.name}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="text-center p-4 sm:p-6">
                     {loading && (
                        <div className="flex flex-col items-center justify-center">
                            <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-slate-200">Analisando performance...</p>
                        </div>
                    )}
                    {error && <p className="text-red-500 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{error}</p>}
                    {result && (
                        <div className="flex flex-col items-center">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-full inline-block">
                                <TrophyIcon className="w-12 h-12 text-blue-500"/>
                            </div>
                            <p className="font-semibold mt-4 text-gray-500 dark:text-slate-400 text-sm uppercase">Nova Meta Sugerida</p>
                            <p className="text-5xl font-bold text-gray-800 dark:text-slate-100 mt-1">
                                R$ {new Intl.NumberFormat('pt-BR').format(result.suggestedGoal)}
                            </p>
                             <p className="mt-4 text-sm text-gray-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 p-3 rounded-lg w-full">{result.rationale}</p>
                            <button
                                onClick={() => onApplyGoal(user.id, result.suggestedGoal)}
                                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
                            >
                                Aplicar Meta
                            </button>
                        </div>
                    )}
                </div>
                 <p className="text-xs text-center text-gray-500 dark:text-slate-500 mt-2">Análise gerada por IA com base na performance dos últimos 90 dias.</p>
            </div>
        </div>
    );
};
export default GoalAIModal;
