import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Budget } from '../types';
import { XMarkIcon, SparklesIcon } from './icons';

interface BudgetAIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget;
  clientName: string;
}

interface AnalysisResult {
    winProbability: number;
    rationale: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const BudgetAIAnalysisModal: React.FC<BudgetAIAnalysisModalProps> = ({ isOpen, onClose, budget, clientName }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const generateAnalysis = async () => {
            setLoading(true);
            setResult(null);
            setError(null);

            try {
                if (!process.env.API_KEY) throw new Error("A chave de API do Gemini não foi configurada.");
                
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

                const daysInPipeline = Math.ceil((new Date().getTime() - new Date(budget.dateSent).getTime()) / (1000 * 60 * 60 * 24));
                const followUpSummary = budget.followUps.map(f => `- Em ${new Date(f.date).toLocaleDateString('pt-BR')}: ${f.notes.substring(0, 100)}...`).join('\n') || 'Nenhum follow-up registrado.';

                const prompt = `Aja como um analista de vendas sênior. Com base nos dados do orçamento a seguir, estime a probabilidade de ganhar este negócio (como uma porcentagem) e forneça uma breve justificativa de uma frase.

- Título do Orçamento: ${budget.title}
- Valor: ${formatCurrency(budget.value)}
- Cliente: ${clientName}
- Dias no pipeline: ${daysInPipeline}
- Status Atual: ${budget.status}
- Resumo dos Follow-ups:
${followUpSummary}
- Próximo Follow-up Agendado: ${budget.nextFollowUpDate ? new Date(budget.nextFollowUpDate).toLocaleDateString('pt-BR') : 'Nenhum'}

Sua resposta DEVE ser um objeto JSON.`;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                winProbability: {
                                    type: Type.NUMBER,
                                    description: 'Uma chance percentual estimada de ganhar o negócio, de 0 a 100.',
                                },
                                rationale: {
                                    type: Type.STRING,
                                    description: 'Uma breve explicação de uma frase para a probabilidade estimada.',
                                },
                            },
                            required: ['winProbability', 'rationale'],
                        },
                    }
                });
                
                const jsonString = response.text?.trim();
                if (jsonString) {
                    try {
                        const parsedResult = JSON.parse(jsonString);
                        setResult(parsedResult);
                    } catch (e) {
                        console.error("Failed to parse AI response:", e);
                        setError("A resposta da IA não estava no formato esperado.");
                    }
                } else {
                    setError("A IA retornou uma resposta vazia.");
                }

            } catch (err) {
                console.error("Erro ao gerar análise com IA:", err);
                setError("Ocorreu um erro ao gerar a análise. Verifique sua chave de API e tente novamente.");
            } finally {
                setLoading(false);
            }
        };

        generateAnalysis();
    }, [isOpen, budget, clientName]);
    
    if (!isOpen) return null;
    
    const probability = result?.winProbability || 0;
    const getRingColor = () => {
        if (probability >= 70) return 'text-green-500';
        if (probability >= 40) return 'text-yellow-500';
        return 'text-red-500';
    };
    
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md m-4 transform transition-all">
                <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-purple-500"/>
                        Análise de Oportunidade
                    </h2>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="text-center p-6">
                     {loading && (
                        <div className="flex flex-col items-center justify-center">
                            <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-slate-200">Analisando dados...</p>
                        </div>
                    )}
                    {error && <p className="text-red-500 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{error}</p>}
                    {result && (
                        <div className="flex flex-col items-center">
                             <div className="relative w-40 h-40">
                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                    <path className="text-slate-200 dark:text-slate-700" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                                    <path className={`${getRingColor()} transition-all duration-1000`} strokeWidth="3" strokeDasharray={`${probability}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                     <span className="text-4xl font-bold text-gray-800 dark:text-slate-100">{probability}<span className="text-2xl">%</span></span>
                                </div>
                             </div>
                             <p className="font-semibold mt-4 text-gray-800 dark:text-slate-200 text-lg">Probabilidade de Ganho</p>
                             <p className="mt-2 text-sm text-gray-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 p-3 rounded-lg w-full">{result.rationale}</p>
                        </div>
                    )}
                </div>
                 <p className="text-xs text-center text-gray-500 dark:text-slate-500 mt-2">Análise gerada por IA. Use como um guia e não como uma certeza absoluta.</p>
            </div>
        </div>
    );
};
export default BudgetAIAnalysisModal;