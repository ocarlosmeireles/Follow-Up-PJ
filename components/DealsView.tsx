import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Budget, Client } from '../types';
import { BudgetStatus } from '../types';
import { 
    CalendarIcon, SparklesIcon, LightBulbIcon, ExclamationCircleIcon, XMarkIcon
} from './icons';

// --- Helper Functions & Interfaces ---

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

interface PriorityDeal {
    budgetId: string;
    priorityScore: number;
    nextBestAction: string;
    rationale: string;
}

// --- Sub-componentes do Modal de Foco ---

const HealthIndicator: React.FC<{ score: number }> = ({ score }) => {
    const health = useMemo(() => {
        if (score > 75) return { color: 'bg-green-500', label: 'Quente' };
        if (score > 40) return { color: 'bg-yellow-500', label: 'Morno' };
        return { color: 'bg-red-500', label: 'Frio' };
    }, [score]);
    return <div className={`w-3 h-3 rounded-full ${health.color}`} title={`Saúde do Negócio: ${health.label} (${score}%)`} />;
};

const FocusCard: React.FC<{ deal: PriorityDeal, budget: Budget, clientName: string, onSelect: () => void }> = ({ deal, budget, clientName, onSelect }) => (
    <div onClick={onSelect} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row items-start gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all duration-200">
        <div className="w-full sm:w-1/3">
            <div className="flex items-center gap-2">
                <HealthIndicator score={deal.priorityScore} />
                <h4 className="font-bold text-gray-800 dark:text-slate-100 truncate text-lg" title={budget.title}>{budget.title}</h4>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mt-1">{clientName}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white mt-2">{formatCurrency(budget.value)}</p>
        </div>
        <div className="w-full sm:w-2/3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md border border-dashed border-slate-300 dark:border-slate-700">
            <h5 className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5"><LightBulbIcon className="w-4 h-4" /> PRÓXIMA AÇÃO SUGERIDA</h5>
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-200 mt-1">{deal.nextBestAction}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 italic">"{deal.rationale}"</p>
        </div>
    </div>
);


// --- Modal de Foco (IA) ---

interface FocusDealsModalProps {
    isOpen: boolean;
    onClose: () => void;
    budgets: Budget[];
    clientMap: Map<string, string>;
    onSelectBudget: (id: string) => void;
}

const FocusDealsModal: React.FC<FocusDealsModalProps> = ({ isOpen, onClose, budgets, clientMap, onSelectBudget }) => {
    const [priorityDeals, setPriorityDeals] = useState<PriorityDeal[]>([]);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const fetchPriorityDeals = async () => {
            if (!budgets || budgets.length === 0) {
                setIsLoadingAI(false);
                setPriorityDeals([]);
                return;
            }

            setIsLoadingAI(true);
            setAiError(null);
            setPriorityDeals([]);

            try {
                if (!process.env.API_KEY) throw new Error("A chave de API do Gemini não foi configurada.");

                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                const activeBudgets = budgets
                    .filter(b => [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP].includes(b.status))
                    .map(b => ({
                        id: b.id,
                        title: b.title,
                        value: b.value,
                        status: b.status,
                        days_in_pipeline: Math.ceil((new Date().getTime() - new Date(b.dateSent).getTime()) / (1000 * 60 * 60 * 24)),
                        followup_count: b.followUps.length,
                        next_followup: b.nextFollowUpDate,
                    }));

                if (activeBudgets.length === 0) {
                    setIsLoadingAI(false);
                    return;
                }
                
                const prompt = `Aja como um coach de vendas especialista. Analise esta lista de orçamentos em andamento e me retorne um array JSON com os 5 mais importantes para focar agora. Para cada um, forneça uma "priorityScore" (0-100), uma "nextBestAction" (ação curta e direta), e uma "rationale" (justificativa curta do porquê é uma prioridade). Ordene o array pela "priorityScore" (mais alta primeiro).

Orçamentos: ${JSON.stringify(activeBudgets)}`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    budgetId: { type: Type.STRING },
                                    priorityScore: { type: Type.NUMBER },
                                    nextBestAction: { type: Type.STRING },
                                    rationale: { type: Type.STRING },
                                },
                            },
                        }
                    }
                });
                
                const jsonString = response.text?.trim();
                if (jsonString) {
                    setPriorityDeals(JSON.parse(jsonString));
                }
                
            } catch (err) {
                console.error("Erro ao priorizar negócios com IA:", err);
                setAiError("Não foi possível carregar as prioridades da IA. Verifique as configurações.");
            } finally {
                setIsLoadingAI(false);
            }
        };

        fetchPriorityDeals();
    }, [isOpen, budgets]);

    const priorityBudgetsData = useMemo(() => {
        return priorityDeals
            .map(deal => {
                const budget = budgets.find(b => b.id === deal.budgetId);
                if (!budget) return null;
                return { deal, budget };
            })
            .filter((item): item is { deal: PriorityDeal; budget: Budget } => item !== null);
    }, [priorityDeals, budgets]);


    return (
        <div 
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="focus-modal-title"
        >
            <div className="fixed inset-0 bg-black/60"></div>
            <div 
                className={`bg-[var(--background-secondary)] rounded-xl shadow-2xl w-full max-w-3xl transform transition-all duration-300 ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-[var(--border-primary)]">
                    <h2 id="focus-modal-title" className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-purple-500"/>
                        Zona de Foco (IA)
                    </h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {isLoadingAI && (
                        <div className="flex flex-col items-center justify-center text-center p-8">
                            <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-slate-200">Analisando seu pipeline...</p>
                            <p className="text-sm text-gray-500 dark:text-slate-400">A IA está identificando as melhores oportunidades.</p>
                        </div>
                    )}
                    {!isLoadingAI && aiError && <p className="text-center text-red-500 p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">{aiError}</p>}
                    {!isLoadingAI && !aiError && priorityBudgetsData.length === 0 && <p className="text-center text-gray-500 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">Nenhum negócio ativo para priorizar no momento.</p>}
                    {!isLoadingAI && (
                        <div className="space-y-4">
                            {priorityBudgetsData.map(({ deal, budget }) => (
                                <FocusCard 
                                    key={deal.budgetId} 
                                    deal={deal} 
                                    budget={budget} 
                                    clientName={clientMap.get(budget.clientId) || 'Cliente'} 
                                    onSelect={() => onSelectBudget(budget.id)} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Componente Principal da View ---

interface DealsViewProps {
  budgets: Budget[];
  clients: Client[];
  onSelectBudget: (id: string) => void;
  onUpdateStatus: (id: string, status: BudgetStatus) => void;
  onScheduleFollowUp: (id: string, date: Date) => void;
}

const CompactBudgetCard: React.FC<{ budget: Budget, clientName: string, onSelect: () => void, isDragging: boolean }> = ({ budget, clientName, onSelect, isDragging }) => {
     const today = new Date(); today.setHours(0, 0, 0, 0);
     const isOverdue = budget.nextFollowUpDate && new Date(budget.nextFollowUpDate) < today;

    return (
        <div onClick={onSelect} className={`bg-[var(--background-secondary)] p-3 rounded-lg shadow-sm cursor-pointer border border-[var(--border-secondary)] transition-all duration-200 group ${isDragging ? 'opacity-50 rotate-2' : 'hover:border-[var(--accent-primary)] hover:-translate-y-0.5'}`}>
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-[var(--text-primary)] text-base pr-2 truncate">{budget.title}</h4>
                {isOverdue && <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" title="Follow-up Atrasado!"/>}
            </div>
            <p className="text-sm text-[var(--text-accent)] font-semibold mb-2 truncate">{clientName}</p>
            <div className="flex justify-between items-center text-sm font-semibold text-[var(--text-secondary)]">
                <span className="font-bold text-lg text-[var(--text-primary)]">{formatCurrency(budget.value)}</span>
                {budget.nextFollowUpDate && 
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`} title="Próximo follow-up">
                        <CalendarIcon className="w-4 h-4"/>
                        <span>{new Date(budget.nextFollowUpDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                }
            </div>
        </div>
    );
};

const KanbanColumn: React.FC<{ title: string, budgets: Budget[], clientMap: Map<string, string>, onSelectBudget: (id: string) => void, onDragOver: (e: React.DragEvent<HTMLDivElement>) => void, onDrop: (e: React.DragEvent<HTMLDivElement>) => void, isDraggingOver: boolean, draggingBudgetId: string | null, setDraggingBudgetId: (id: string | null) => void }> = ({ title, budgets, clientMap, onSelectBudget, onDragOver, onDrop, isDraggingOver, draggingBudgetId, setDraggingBudgetId }) => {
    const totalValue = useMemo(() => budgets.reduce((sum, b) => sum + b.value, 0), [budgets]);
    
    return (
        <div onDragOver={onDragOver} onDrop={onDrop} className="flex-1 min-w-[300px] bg-[var(--background-tertiary)] rounded-lg p-3 flex flex-col transition-colors">
            <div className="flex justify-between items-center mb-1 px-1">
                <h3 className="font-semibold text-lg text-[var(--text-primary)]">{title}</h3>
                <span className="text-sm font-bold bg-[var(--background-secondary)] text-[var(--text-secondary)] rounded-full px-2.5 py-0.5">{budgets.length}</span>
            </div>
            <div className="text-sm font-bold text-[var(--text-accent)] mb-3 px-1">R$ {formatCurrency(totalValue)}</div>
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
                {budgets.map(budget => (
                    <div key={budget.id} draggable onDragStart={(e) => { e.dataTransfer.setData('budgetId', budget.id); setDraggingBudgetId(budget.id); }} onDragEnd={() => setDraggingBudgetId(null)} className="mb-3">
                        <CompactBudgetCard budget={budget} clientName={clientMap.get(budget.clientId) || 'Cliente'} onSelect={() => onSelectBudget(budget.id)} isDragging={draggingBudgetId === budget.id} />
                    </div>
                ))}
                {isDraggingOver && <div className="h-24 border-2 border-dashed border-[var(--border-secondary)] rounded-lg bg-[var(--background-tertiary-hover)] mt-2" />}
            </div>
        </div>
    );
};


const DealsView: React.FC<DealsViewProps> = ({ budgets, clients, onSelectBudget, onUpdateStatus }) => {
    const [draggingOverColumn, setDraggingOverColumn] = useState<BudgetStatus | null>(null);
    const [draggingBudgetId, setDraggingBudgetId] = useState<string | null>(null);
    const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const budgetsByStatus = useMemo(() => {
        const grouped: { [key in BudgetStatus]?: Budget[] } = {};
        budgets.forEach(budget => {
            (grouped[budget.status] = grouped[budget.status] || []).push(budget);
        });
        return grouped;
    }, [budgets]);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: BudgetStatus) => {
        e.preventDefault();
        const budgetId = e.dataTransfer.getData('budgetId');
        const budget = budgets.find(b => b.id === budgetId);
        if (budget && budget.status !== newStatus) onUpdateStatus(budgetId, newStatus);
        setDraggingOverColumn(null);
    };
    
    const columns: BudgetStatus[] = [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ORDER_PLACED];

    return (
        <div className="flex flex-col h-full w-full space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">Cockpit de Vendas</h2>
                <p className="text-[var(--text-secondary)] mt-1">Sua central de ações para fechar mais negócios.</p>
            </div>
            
            {/* --- ZONA DE FOCO COM IA --- */}
            <section className="animated-item">
                <div className="bg-gradient-to-br from-purple-500 to-blue-600 dark:from-purple-600 dark:to-blue-700 p-6 rounded-xl shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 text-center md:text-left">
                        <div className="bg-white/20 p-3 rounded-full hidden sm:block">
                            <SparklesIcon className="w-8 h-8"/>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Zona de Foco com IA</h3>
                            <p className="opacity-80 text-sm mt-1">Descubra quais negócios têm maior potencial de fechamento agora.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsFocusModalOpen(true)}
                        className="bg-white text-blue-600 font-bold py-3 px-6 rounded-lg w-full md:w-auto shadow-md hover:bg-slate-100 transition-all transform hover:scale-105"
                    >
                        Analisar Oportunidades
                    </button>
                </div>
            </section>
            
            {/* --- PIPELINE COMPLETO --- */}
            <section className="flex-1 flex flex-col min-h-0 animated-item" style={{animationDelay: '200ms'}}>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Pipeline Completo</h3>
                <div className="flex-1 flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
                    {columns.map(status => (
                        <KanbanColumn
                            key={status}
                            title={status}
                            budgets={budgetsByStatus[status] || []}
                            clientMap={clientMap}
                            onSelectBudget={onSelectBudget}
                            onDragOver={(e) => { e.preventDefault(); setDraggingOverColumn(status); }}
                            onDrop={(e) => handleDrop(e, status)}
                            isDraggingOver={draggingOverColumn === status}
                            draggingBudgetId={draggingBudgetId}
                            setDraggingBudgetId={setDraggingBudgetId}
                        />
                    ))}
                </div>
            </section>

             <FocusDealsModal 
                isOpen={isFocusModalOpen}
                onClose={() => setIsFocusModalOpen(false)}
                budgets={budgets}
                clientMap={clientMap}
                onSelectBudget={(budgetId) => {
                    setIsFocusModalOpen(false); // Close focus modal
                    onSelectBudget(budgetId); // Open detail modal
                }}
            />
        </div>
    );
};

export default DealsView;