import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Prospect } from '../types';
import { XMarkIcon, AcademicCapIcon, ChatBubbleLeftRightIcon, SparklesIcon } from './icons';

interface ProspectAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: Prospect;
  mode: 'research' | 'icebreaker';
}

const ProspectAIModal: React.FC<ProspectAIModalProps> = ({ isOpen, onClose, prospect, mode }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const generateContent = async () => {
            setLoading(true);
            setResult('');
            setError(null);

            try {
                if (!process.env.API_KEY) throw new Error("A chave de API do Gemini não foi configurada.");
                
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

                const researchPrompt = `Faça uma pesquisa concisa sobre a empresa "${prospect.company}". Foco em:
- Principal área de atuação e produtos/serviços.
- Notícias recentes ou conquistas notáveis.
- Possíveis pontos de conexão para uma abordagem de vendas.
A resposta deve ser em português do Brasil e formatada em tópicos (usando *).`;

                const icebreakerPrompt = `Crie uma curta e personalizada frase de abertura para um primeiro contato (e-mail ou mensagem) com ${prospect.name} da empresa ${prospect.company}. 
Use as seguintes anotações sobre o prospect, se disponíveis: "${prospect.notes || 'Nenhuma'}".
O tom deve ser profissional, mas amigável e direto ao ponto. Forneça apenas o texto da abordagem.`;

                const prompt = mode === 'research' ? researchPrompt : icebreakerPrompt;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                setResult(response.text || '');

            } catch (err) {
                console.error("Erro ao gerar conteúdo com IA:", err);
                setError("Ocorreu um erro ao buscar informações. Verifique sua chave de API e tente novamente.");
            } finally {
                setLoading(false);
            }
        };

        generateContent();
    }, [isOpen, prospect, mode]);
    
    if (!isOpen) return null;

    const modalConfig = {
        research: {
            title: `Pesquisa sobre ${prospect.company}`,
            icon: <AcademicCapIcon className="w-6 h-6 text-sky-500" />
        },
        icebreaker: {
            title: `Sugestão de Abordagem`,
            icon: <ChatBubbleLeftRightIcon className="w-6 h-6 text-violet-500" />
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 transform transition-all max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        {modalConfig[mode].icon}
                        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{modalConfig[mode].title}</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                    {loading && (
                        <div className="flex flex-col items-center justify-center text-center p-8">
                            <SparklesIcon className="w-12 h-12 text-blue-500 animate-pulse" />
                            <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-slate-200">Analisando com IA...</p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">Isso pode levar alguns segundos.</p>
                        </div>
                    )}
                    {error && <p className="text-red-500 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{error}</p>}
                    {result && (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-slate-200 whitespace-pre-wrap bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                            {result}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex-shrink-0">
                     <p className="text-xs text-center text-gray-500 dark:text-slate-500">A IA pode cometer erros. Verifique fatos importantes.</p>
                </div>
            </div>
        </div>
    );
};
export default ProspectAIModal;