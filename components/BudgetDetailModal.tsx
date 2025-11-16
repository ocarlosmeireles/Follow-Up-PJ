import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Budget, Client, FollowUp, Contact } from '../types';
import { BudgetStatus, FollowUpStatus } from '../types';
// FIX: Imported TrophyIcon to resolve a reference error.
import { 
    XMarkIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, ArrowPathIcon, WhatsAppIcon, 
    PauseCircleIcon, UserIcon, SparklesIcon, PencilIcon, CurrencyDollarIcon, ClockIcon, 
    HashtagIcon, LightBulbIcon, TrophyIcon
} from './icons';

interface BudgetDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    budget: Budget;
    client: Client;
    contact?: Contact;
    onAddFollowUp: (budgetId: string, followUp: Omit<FollowUp, 'id'>, nextFollowUpDate: string | null) => void;
    onChangeStatus: (budgetId: string, status: BudgetStatus) => void;
    onConfirmWin: (budgetId: string, closingValue: number) => void;
    onUpdateBudget: (budgetId: string, updates: Partial<Budget>) => void;
}

// --- Helper Functions ---

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const formatDisplayDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Data inválida';
    return date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
};
const formatTime = (dateString: string | null | undefined) => {
    if (!dateString || !dateString.includes('T')) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
};

const cleanPhoneNumber = (phone?: string) => phone?.replace(/\D/g, '') || '';
const today = new Date().toISOString().split('T')[0];

const getStatusPill = (status: BudgetStatus) => {
  const styles: {[key in BudgetStatus]: string} = {
    [BudgetStatus.SENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    [BudgetStatus.FOLLOWING_UP]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    [BudgetStatus.ORDER_PLACED]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    [BudgetStatus.INVOICED]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    [BudgetStatus.LOST]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    [BudgetStatus.ON_HOLD]: 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200',
  };
  return <span className={`px-3 py-1 text-sm font-bold rounded-full whitespace-nowrap ${styles[status] || styles[BudgetStatus.ON_HOLD]}`}>{status}</span>;
};

// --- Sub-components ---

const KPI: React.FC<{ icon: React.ReactNode; label: string; value: string | number; className?: string }> = ({ icon, label, value, className }) => (
    <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex-shrink-0 bg-[var(--background-tertiary)] p-2 rounded-lg">{icon}</div>
        <div>
            <p className="text-xs text-[var(--text-secondary)]">{label}</p>
            <p className="font-bold text-sm text-[var(--text-primary)]">{value}</p>
        </div>
    </div>
);

const TimelineItem: React.FC<{ icon: React.ReactNode; date: string; time?: string; title: string; content?: string; isLast?: boolean; }> = ({ icon, date, time, title, content, isLast }) => (
    <div className="relative pl-8">
        {!isLast && <div className="absolute left-3.5 top-5 h-full w-px bg-[var(--border-primary)]"></div>}
        <div className="absolute left-0 top-2 w-7 h-7 bg-[var(--background-secondary-hover)] rounded-full flex items-center justify-center border-2 border-[var(--border-primary)]">
            {icon}
        </div>
        <div className="flex items-baseline gap-2">
            <p className="font-semibold text-sm text-[var(--text-primary)]">{title}</p>
            <p className="text-xs text-[var(--text-tertiary)]">{date} {time && `às ${time}`}</p>
        </div>
        {content && <p className="text-sm text-[var(--text-secondary)] mt-1 whitespace-pre-wrap">{content}</p>}
    </div>
);

interface AIAnalysis {
    healthScore: number;
    rationale: string;
    nextAction: string;
}

const HealthIndicator: React.FC<{ score: number }> = ({ score }) => {
    const getRingColor = () => {
        if (score > 70) return 'text-green-500';
        if (score > 40) return 'text-yellow-500';
        return 'text-red-500';
    };
    return (
        <div className="relative w-24 h-24">
            <svg className="w-full h-full" viewBox="0 0 36 36">
                <path className="text-slate-200 dark:text-slate-700" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                <path className={`${getRingColor()} transition-all duration-1000`} strokeWidth="3" strokeDasharray={`${score}, 100`} strokeLinecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-[var(--text-primary)]">{score}<span className="text-lg">%</span></span>
            </div>
        </div>
    );
};

// --- Main Modal Component ---
const BudgetDetailModal: React.FC<BudgetDetailModalProps> = ({ isOpen, onClose, budget, client, contact, onAddFollowUp, onChangeStatus, onConfirmWin, onUpdateBudget }) => {
    // State
    const [notes, setNotes] = useState('');
    const [nextFollowUpDate, setNextFollowUpDate] = useState('');
    const [nextFollowUpTime, setNextFollowUpTime] = useState('');
    const [showWinPrompt, setShowWinPrompt] = useState(false);
    const [winValue, setWinValue] = useState('');
    const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(true);

    // Memos & Calculations
    const daysInPipeline = useMemo(() => Math.ceil((new Date().getTime() - new Date(budget.dateSent).getTime()) / (1000 * 60 * 60 * 24)), [budget.dateSent]);
    const lastContactDate = useMemo(() => budget.followUps.length > 0 ? new Date(budget.followUps[budget.followUps.length - 1].date) : new Date(budget.dateSent), [budget]);
    const isFinalStatus = [BudgetStatus.INVOICED, BudgetStatus.LOST].includes(budget.status);
    
    const timelineEvents = useMemo(() => {
        const creationEvent = {
            date: new Date(budget.dateSent),
            type: 'creation',
            title: 'Orçamento Criado e Enviado',
            content: `Valor: ${formatCurrency(budget.value)}`
        };
        const followUpEvents = budget.followUps.map(fu => ({
            date: new Date(fu.date),
            type: 'follow-up',
            title: `Follow-up: ${fu.status || 'Registrado'}`,
            content: fu.notes
        }));
        return [creationEvent, ...followUpEvents].sort((a,b) => b.date.getTime() - a.date.getTime());
    }, [budget]);

    // Effects
    useEffect(() => {
        if (!isOpen) {
            setShowWinPrompt(false);
            setWinValue('');
            setAiAnalysis(null);
            setIsAiLoading(true);
            return;
        }

        const analyzeOpportunity = async () => {
            setIsAiLoading(true);
            try {
                 if (!process.env.API_KEY) throw new Error("A chave da API não está configurada.");
                 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                 const prompt = `Analise este negócio e retorne um JSON com "healthScore" (probabilidade de ganho de 0 a 100), "rationale" (justificativa curta) e "nextAction" (próxima ação tática e clara). Dados: Orçamento "${budget.title}" de ${formatCurrency(budget.value)} para ${client.name}, aberto há ${daysInPipeline} dias. Status: ${budget.status}. Último contato: ${lastContactDate.toLocaleDateString()}. Follow-ups: ${budget.followUps.length}. Próximo agendado: ${budget.nextFollowUpDate ? formatDisplayDate(budget.nextFollowUpDate) : 'Nenhum'}.`;
                 const response = await ai.models.generateContent({
                     model: 'gemini-2.5-flash', contents: prompt,
                     config: {
                         responseMimeType: 'application/json',
                         responseSchema: {
                             type: Type.OBJECT, properties: {
                                healthScore: { type: Type.NUMBER },
                                rationale: { type: Type.STRING },
                                nextAction: { type: Type.STRING },
                             }, required: ['healthScore', 'rationale', 'nextAction'],
                         }
                     }
                 });
                 setAiAnalysis(JSON.parse(response.text || '{}'));
            } catch (error) {
                console.error("AI Analysis failed:", error);
                setAiAnalysis({ healthScore: 0, rationale: "Não foi possível analisar.", nextAction: "Verifique o histórico manualmente." });
            } finally {
                setIsAiLoading(false);
            }
        };

        if (!isFinalStatus) analyzeOpportunity();
        else setIsAiLoading(false);

    }, [isOpen, budget, client, daysInPipeline, lastContactDate]);

    // Handlers
    const handleAddFollowUp = () => {
        if (!notes) return alert('Adicione uma nota ao follow-up.');
        let combinedNextDate: string | null = nextFollowUpDate || null;
        if (combinedNextDate && nextFollowUpTime) combinedNextDate = `${nextFollowUpDate}T${nextFollowUpTime}`;
        onAddFollowUp(budget.id, { date: new Date().toISOString(), notes, status: FollowUpStatus.COMPLETED }, combinedNextDate);
        setNotes(''); setNextFollowUpDate(''); setNextFollowUpTime('');
    };
    
    const handleConfirmWin = () => {
        const finalValue = parseFloat(winValue.replace(/\./g, '').replace(',', '.'));
        if (isNaN(finalValue) || finalValue <= 0) return alert("Insira um valor de fechamento válido.");
        onConfirmWin(budget.id, finalValue);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/70 flex justify-center items-center z-50 p-4 fade-in">
            <div className="bg-[var(--background-secondary)] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col transform transition-all duration-300">
                {/* Header */}
                <div className="p-4 sm:p-6 flex justify-between items-start border-b border-[var(--border-primary)] flex-shrink-0">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{budget.title}</h2>
                        <p className="text-md text-[var(--text-accent)] font-semibold">{client.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(budget.value)}</p>
                        {getStatusPill(budget.status)}
                    </div>
                     <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors ml-4 -mr-2">
                        <XMarkIcon className="w-7 h-7" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
                    {/* Left Panel: KPIs & Info */}
                    <div className="w-full md:w-64 lg:w-72 p-4 border-b md:border-b-0 md:border-r border-[var(--border-primary)] flex-shrink-0 space-y-5">
                        <h3 className="font-semibold text-[var(--text-secondary)]">Painel Rápido</h3>
                        <KPI icon={<ClockIcon className="w-6 h-6 text-yellow-500"/>} label="Dias no Funil" value={daysInPipeline} />
                        <KPI icon={<ArrowPathIcon className="w-6 h-6 text-blue-500"/>} label="Follow-ups" value={budget.followUps.length} />
                        <KPI icon={<CalendarIcon className="w-6 h-6 text-purple-500"/>} label="Último Contato" value={lastContactDate.toLocaleDateString('pt-BR')} />
                        
                        <div className="pt-4 border-t border-[var(--border-primary)]">
                            <h3 className="font-semibold text-[var(--text-secondary)] mb-2">Contato</h3>
                             <div className="space-y-2 text-sm">
                                <p className="font-bold text-[var(--text-primary)] flex items-center gap-2"><UserIcon className="w-4 h-4"/>{contact?.name || 'N/A'}</p>
                                {contact?.phone && (
                                    <a href={`https://wa.me/55${cleanPhoneNumber(contact.phone)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold">
                                        <WhatsAppIcon className="w-4 h-4"/> Chamar no WhatsApp
                                    </a>
                                )}
                             </div>
                        </div>
                    </div>

                    {/* Center Panel: Timeline */}
                    <div className="flex-grow p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                         <div className="space-y-6">
                            {timelineEvents.map((event, index) => (
                                <TimelineItem
                                    key={index}
                                    isLast={index === timelineEvents.length - 1}
                                    icon={event.type === 'creation' ? <CurrencyDollarIcon className="w-4 h-4 text-green-500"/> : <ArrowPathIcon className="w-4 h-4 text-blue-500"/>}
                                    date={formatDisplayDate(event.date.toISOString())}
                                    time={formatTime(event.date.toISOString())}
                                    title={event.title}
                                    content={event.content}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Actions & AI */}
                    <div className="w-full md:w-72 lg:w-80 p-4 bg-[var(--background-secondary-hover)] border-t md:border-t-0 md:border-l border-[var(--border-primary)] flex-shrink-0 overflow-y-auto custom-scrollbar">
                        {!isFinalStatus ? (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-purple-500"/> Cockpit de Análise</h3>
                                    {isAiLoading ? (
                                        <div className="text-center p-4"><p className="text-sm animate-pulse">Analisando...</p></div>
                                    ) : aiAnalysis && (
                                        <div className="bg-[var(--background-secondary)] p-3 rounded-lg border border-[var(--border-secondary)] space-y-3">
                                            <div className="flex items-center gap-3">
                                                <HealthIndicator score={aiAnalysis.healthScore} />
                                                <div>
                                                    <p className="text-xs text-[var(--text-secondary)]">Saúde do Negócio</p>
                                                    <p className="text-sm font-bold">{aiAnalysis.rationale}</p>
                                                </div>
                                            </div>
                                            <div className="bg-purple-50 dark:bg-purple-900/40 p-2 rounded-md border border-dashed border-purple-200 dark:border-purple-800/50">
                                                <p className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5"><LightBulbIcon className="w-4 h-4"/>AÇÃO RECOMENDADA</p>
                                                <p className="text-sm font-semibold mt-1">{aiAnalysis.nextAction}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--text-secondary)] mb-2">Registrar Ação</h3>
                                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Descreva o contato..." className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-lg p-2"/>
                                    <div className="flex gap-2 mt-2">
                                        <input type="date" value={nextFollowUpDate} onChange={e => setNextFollowUpDate(e.target.value)} min={today} className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-lg p-2 text-sm dark:[color-scheme:dark]"/>
                                        <input type="time" value={nextFollowUpTime} onChange={e => setNextFollowUpTime(e.target.value)} className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-lg p-2 text-sm dark:[color-scheme:dark]"/>
                                    </div>
                                    <button onClick={handleAddFollowUp} className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-3 rounded-lg mt-2">Registrar Follow-up</button>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--text-secondary)] mb-2">Atualizar Status</h3>
                                    {showWinPrompt ? (
                                         <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                            <label className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1 block">Valor Final do Fechamento</label>
                                            <input type="text" value={winValue} onChange={e => setWinValue(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" autoFocus />
                                            <div className="flex gap-2 mt-2">
                                                <button onClick={handleConfirmWin} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-lg text-sm">Confirmar</button>
                                                <button onClick={() => setShowWinPrompt(false)} className="flex-1 bg-white hover:bg-gray-100 text-gray-700 font-semibold py-2 px-3 rounded-lg border border-gray-300 text-sm">Cancelar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                             <button onClick={() => { setShowWinPrompt(true); setWinValue(formatCurrency(budget.value)); }} className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-lg"><CheckCircleIcon className="w-5 h-5"/> Ganho</button>
                                            <div className="flex gap-2">
                                                <button onClick={() => onChangeStatus(budget.id, BudgetStatus.LOST)} className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg"><XCircleIcon className="w-5 h-5"/> Perdido</button>
                                                <button onClick={() => onChangeStatus(budget.id, BudgetStatus.ON_HOLD)} className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-800 dark:text-slate-100 font-bold py-2 px-3 rounded-lg"><PauseCircleIcon className="w-5 h-5"/> Congelar</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                             <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 mb-4">
                                     {budget.status === BudgetStatus.INVOICED ? <TrophyIcon className="w-8 h-8 text-green-500"/> : <XCircleIcon className="w-8 h-8 text-red-500"/>}
                                </div>
                                <h3 className="font-bold text-lg text-[var(--text-primary)]">Negócio Finalizado</h3>
                                <p className="text-sm text-[var(--text-secondary)]">Este orçamento foi marcado como <strong>{budget.status}</strong> e arquivado.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetDetailModal;
