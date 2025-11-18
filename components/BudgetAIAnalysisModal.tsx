import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Budget } from '../types';
import { XMarkIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, ArrowRightIcon } from './icons';

interface BudgetAIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget;
  clientName: string;
}

interface AnalysisResult {
    winProbability: number;
    rationale: string;
    strengths: string[];
    weaknesses: string[];
    suggestedNextStep: string;
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

                const prompt = `Aja como um analista de vendas sênior. Com base nos dados do orçamento, forneça uma análise completa.

Dados do Orçamento:
- Título: ${budget.title}
- Valor: ${formatCurrency(budget.value)}
- Cliente: ${clientName}
- Dias no pipeline: ${daysInPipeline}
- Status Atual: ${budget.status}
- Resumo dos Follow-ups:
${followUpSummary}
- Próximo Follow-up Agendado: ${budget.nextFollowUpDate ? new Date(budget.nextFollowUpDate).toLocaleDateString('pt-BR') : 'Nenhum'}

Sua tarefa é retornar um objeto JSON com:
1.  "winProbability": Uma chance percentual (0-100) de ganhar o negócio.
2.  "rationale": Uma breve justificativa para a probabilidade.
3.  "strengths": Um array com 2 ou 3 pontos fortes desta oportunidade.
4.  "weaknesses": Um array com 2 ou 3 pontos de atenção ou riscos.
5.  "suggestedNextStep": Uma sugestão clara e acionável para o próximo passo.`;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                winProbability: { type: Type.NUMBER, description: 'Chance percentual de 0 a 100.' },
                                rationale: { type: Type.STRING, description: 'Justificativa para a probabilidade.' },
                                strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Pontos fortes da negociação.' },
                                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Pontos de atenção e riscos.' },
                                suggestedNextStep: { type: Type.STRING, description: 'Sugestão de próximo passo acionável.' },
                            },
                            required: ['winProbability', 'rationale', 'strengths', 'weaknesses', 'suggestedNextStep'],
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-lg m-4 transform transition-all max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                     <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-purple-500"/>
                        Análise de Oportunidade
                    </h2>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 -mr-2">
                     {loading && (
                        <div className="flex flex-col items-center justify-center p-8">
                            <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-slate-200">Analisando dados...</p>
                        </div>
                    )}
                    {error && <p className="text-red-500 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{error}</p>}
                    {result && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="relative w-32 h-32 mx-auto">
                                    <svg className="w-full h-full" viewBox="0 0 36 36">
                                        <path className="text-slate-200 dark:text-slate-700" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                                        <path className={`${getRingColor()} transition-all duration-1000`} strokeWidth="3" strokeDasharray={`${probability}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-3xl font-bold text-gray-800 dark:text-slate-100">{probability}<span className="text-xl">%</span></span>
                                    </div>
                                </div>
                                <p className="font-semibold mt-3 text-gray-800 dark:text-slate-200">Probabilidade de Ganho</p>
                                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg">{result.rationale}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                                    <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">Pontos Fortes</h4>
                                    <ul className="space-y-1.5 text-sm text-green-700 dark:text-green-200">
                                        {result.strengths.map((s, i) => <li key={i} className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0"/><span>{s}</span></li>)}
                                    </ul>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                                    <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Pontos de Atenção</h4>
                                    <ul className="space-y-1.5 text-sm text-red-700 dark:text-red-200">
                                        {result.weaknesses.map((w, i) => <li key={i} className="flex items-start gap-2"><XCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0"/><span>{w}</span></li>)}
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                                <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Próximo Passo Sugerido</h4>
                                <div className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-200">
                                    <ArrowRightIcon className="w-4 h-4 mt-0.5 flex-shrink-0"/>
                                    <p>{result.suggestedNextStep}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <p className="text-xs text-center text-gray-500 dark:text-slate-500 mt-4 flex-shrink-0">Análise gerada por IA. Use como um guia e não como uma certeza absoluta.</p>
            </div>
        </div>
    );
};
export default BudgetAIAnalysisModal;
