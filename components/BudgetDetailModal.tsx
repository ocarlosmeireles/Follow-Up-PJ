import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Budget, Client, FollowUp, Contact, Script, ScriptCategory } from '../types';
import { BudgetStatus, FollowUpStatus, scriptCategories } from '../types';
import { 
    XMarkIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, ArrowPathIcon, WhatsAppIcon, 
    PauseCircleIcon, SparklesIcon, PencilIcon, ClockIcon, CurrencyDollarIcon, 
    ClipboardDocumentListIcon, PhoneIcon, EnvelopeIcon, StarIcon, ChevronDownIcon, TrophyIcon
} from './icons';
import BudgetAIAnalysisModal from './BudgetAIAnalysisModal';

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
    scripts: Script[];
}

// --- Helper Functions ---

const formatDisplayDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data inválida';
        const hasTime = dateString.includes('T');
        if (hasTime) {
            return date.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }
        const [year, month, day] = dateString.split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day));
        return utcDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) {
        return 'Data inválida';
    }
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const cleanPhoneNumber = (phone: string | undefined) => phone ? phone.replace(/\D/g, '') : '';

const formatCurrencyForInput = (value: string): string => {
    const digitsOnly = value.replace(/\D/g, '');
    if (!digitsOnly) return '';
    const numberValue = parseInt(digitsOnly, 10) / 100;
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numberValue);
};

const unmaskCurrency = (maskedValue: string): number => {
    if (!maskedValue) return 0;
    return parseFloat(maskedValue.replace(/\./g, '').replace(',', '.'));
};

const today = new Date().toISOString().split('T')[0];

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; className?: string }> = ({ icon, label, value, className }) => (
    <div className={`flex items-start gap-3 ${className}`}>
        <div className="flex-shrink-0 text-[var(--text-accent)] mt-1">{icon}</div>
        <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
            <div className="text-base font-semibold text-[var(--text-primary)]">{value}</div>
        </div>
    </div>
);


const BudgetDetailModal: React.FC<BudgetDetailModalProps> = ({ isOpen, onClose, budget, client, contact, onAddFollowUp, onChangeStatus, onConfirmWin, onUpdateBudget, scripts }) => {
    // Follow-up form state
    const [followUpNotes, setFollowUpNotes] = useState('');
    const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus>(FollowUpStatus.COMPLETED);
    const [nextFollowUpDate, setNextFollowUpDate] = useState<string | null>(null);

    // Editing state
    const [isEditing, setIsEditing] = useState(false);
    const [editableTitle, setEditableTitle] = useState(budget.title);
    const [editableValue, setEditableValue] = useState(formatCurrency(budget.value));

    // Win confirmation state
    const [isConfirmingWin, setIsConfirmingWin] = useState(false);
    const [closingValue, setClosingValue] = useState(formatCurrency(budget.value));
    
    // AI Analysis Modal State
    const [isAIModalOpen, setAIModalOpen] = useState(false);

    // Script state
    const [isScriptMenuOpen, setScriptMenuOpen] = useState(false);
    const scriptMenuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (scriptMenuRef.current && !scriptMenuRef.current.contains(event.target as Node)) {
                setScriptMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddFollowUp = (e: React.FormEvent) => {
        e.preventDefault();
        if (!followUpNotes.trim()) {
            alert('Por favor, adicione uma nota ao follow-up.');
            return;
        }
        const followUpData = { date: new Date().toISOString(), notes: followUpNotes, status: followUpStatus };
        onAddFollowUp(budget.id, followUpData, nextFollowUpDate);
        setFollowUpNotes('');
        setNextFollowUpDate(null);
    };

    const handleSaveEdit = () => {
        const updates: Partial<Budget> = {};
        const numericValue = unmaskCurrency(editableValue);

        if (editableTitle !== budget.title) updates.title = editableTitle;
        if (numericValue !== budget.value) updates.value = numericValue;
        
        if (Object.keys(updates).length > 0) {
            onUpdateBudget(budget.id, updates);
        }
        setIsEditing(false);
    };
    
    const handleConfirmWin = () => {
        const numericClosingValue = unmaskCurrency(closingValue);
        if (isNaN(numericClosingValue) || numericClosingValue < 0) {
            alert("Por favor, insira um valor de fechamento válido.");
            return;
        }
        onConfirmWin(budget.id, numericClosingValue);
        setIsConfirmingWin(false);
        onClose();
    };

    const useScript = (script: Script) => {
        const personalizedContent = script.content
            .replace(/\[Nome do Cliente\]/g, contact?.name || client.name)
            .replace(/\[Título da Proposta\]/g, budget.title)
            .replace(/\[Sua Empresa\]/g, 'Nossa Empresa') // Placeholder, ideally from org settings
            .replace(/\[Seu Nome\]/g, 'Seu Nome'); // Placeholder, ideally from user profile
        setFollowUpNotes(personalizedContent);
        setScriptMenuOpen(false);
    };

    const getStatusInfo = (status: BudgetStatus) => {
        switch (status) {
            case BudgetStatus.INVOICED: return { icon: <CheckCircleIcon className="w-5 h-5" />, color: 'text-emerald-500' };
            case BudgetStatus.LOST: return { icon: <XCircleIcon className="w-5 h-5" />, color: 'text-red-500' };
            case BudgetStatus.ON_HOLD: return { icon: <PauseCircleIcon className="w-5 h-5" />, color: 'text-gray-500' };
            default: return { icon: <ClockIcon className="w-5 h-5" />, color: 'text-yellow-600' };
        }
    };
    
    const isFinished = [BudgetStatus.INVOICED, BudgetStatus.LOST, BudgetStatus.ON_HOLD].includes(budget.status);

    const timelineEvents = useMemo(() => {
        const creationEvent = {
            id: 'creation',
            date: budget.dateSent,
            notes: `Orçamento "${budget.title}" criado e enviado no valor de R$ ${formatCurrency(budget.value)}.`,
            status: 'Criado' as const
        };

        const followUpEvents = budget.followUps.map(fu => ({
            ...fu,
            status: fu.status || FollowUpStatus.COMPLETED
        }));
        
        return [creationEvent, ...followUpEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [budget]);

    const getEventIcon = (status: FollowUpStatus | 'Criado') => {
        switch(status) {
            case FollowUpStatus.COMPLETED: return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
            case FollowUpStatus.RESCHEDULED: return <ArrowPathIcon className="w-5 h-5 text-yellow-500" />;
            case FollowUpStatus.WAITING_RESPONSE: return <ClockIcon className="w-5 h-5 text-blue-500" />;
            case 'Criado': return <ClipboardDocumentListIcon className="w-5 h-5 text-purple-500" />;
            default: return <ClipboardDocumentListIcon className="w-5 h-5 text-gray-500" />;
        }
    };

    const getEventTitle = (event: typeof timelineEvents[0]) => {
        if (event.id === 'creation') return "Orçamento Criado";
        return event.status || "Follow-up Realizado";
    };

    if (!isOpen) return null;
    if (!client) return <div>Cliente não encontrado.</div>;

    return (
        <>
            <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
                <div className="bg-[var(--background-secondary)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="p-4 sm:p-6 flex justify-between items-start border-b border-[var(--border-primary)]">
                        <div>
                            {isEditing ? (
                                <input type="text" value={editableTitle} onChange={e => setEditableTitle(e.target.value)} className="text-2xl font-bold bg-slate-100 dark:bg-slate-700 rounded p-1 -m-1"/>
                            ) : (
                                <h2 className="text-2xl font-bold text-[var(--text-primary)]">{budget.title}</h2>
                            )}
                            <p className="text-base font-semibold text-[var(--text-accent)]">{client.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                             {isEditing ? (
                                 <button onClick={handleSaveEdit} className="p-2 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full"><CheckCircleIcon className="w-6 h-6"/></button>
                             ) : (
                                 <button onClick={() => setIsEditing(true)} className="p-2 text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] rounded-full"><PencilIcon className="w-5 h-5"/></button>
                             )}
                            <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><XMarkIcon className="w-7 h-7" /></button>
                        </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-grow p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <InfoItem icon={<CurrencyDollarIcon className="w-6 h-6"/>} label="Valor" value={isEditing ? <input value={editableValue} onChange={e => setEditableValue(formatCurrencyForInput(e.target.value))} className="font-semibold text-base bg-slate-100 dark:bg-slate-700 rounded p-1 w-full"/> : `R$ ${formatCurrency(budget.value)}`} />
                            <InfoItem icon={getStatusInfo(budget.status).icon} label="Status" value={<span className={getStatusInfo(budget.status).color}>{budget.status}</span>} />
                            <InfoItem icon={<CalendarIcon className="w-6 h-6"/>} label="Data de Envio" value={formatDisplayDate(budget.dateSent)} />
                            <InfoItem icon={<CalendarIcon className="w-6 h-6"/>} label="Próximo Follow-up" value={formatDisplayDate(budget.nextFollowUpDate)} />
                        </div>
                        
                        {contact && (
                            <div className="bg-[var(--background-tertiary)] p-4 rounded-lg mb-6">
                                <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-2">Contato</h3>
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                                    <p className="font-bold text-[var(--text-primary)]">{contact.name}</p>
                                    {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-accent)]"><PhoneIcon className="w-4 h-4"/> {contact.phone}</a>}
                                    {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-accent)]"><EnvelopeIcon className="w-4 h-4"/> {contact.email}</a>}
                                    {contact.phone && <a href={`https://wa.me/55${cleanPhoneNumber(contact.phone)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-green-600 hover:text-green-700"><WhatsAppIcon className="w-4 h-4"/> Chamar no WhatsApp</a>}
                                </div>
                            </div>
                        )}
                        
                        {/* Action Center */}
                        <div className="bg-[var(--background-tertiary)] p-4 rounded-lg mb-6">
                            <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-3">Centro de Ações</h3>
                            <div className="flex flex-wrap items-center gap-3">
                                <button onClick={() => setAIModalOpen(true)} className="flex items-center gap-2 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900 font-semibold py-2 px-4 rounded-lg transition-colors">
                                    <SparklesIcon className="w-5 h-5"/> Análise com IA
                                </button>
                                {!isFinished ? (
                                    <>
                                        <button onClick={() => setIsConfirmingWin(true)} className="flex items-center gap-2 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900 font-semibold py-2 px-4 rounded-lg transition-colors">
                                            <TrophyIcon className="w-5 h-5"/> Marcar como Ganho
                                        </button>
                                        <button onClick={() => onChangeStatus(budget.id, BudgetStatus.LOST)} className="flex items-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 font-semibold py-2 px-4 rounded-lg transition-colors">
                                            <XCircleIcon className="w-5 h-5"/> Marcar como Perdido
                                        </button>
                                        <button onClick={() => onChangeStatus(budget.id, BudgetStatus.ON_HOLD)} className="flex items-center gap-2 bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 font-semibold py-2 px-4 rounded-lg transition-colors">
                                            <PauseCircleIcon className="w-5 h-5"/> Congelar
                                        </button>
                                    </>
                                ) : (
                                     <button onClick={() => onChangeStatus(budget.id, BudgetStatus.FOLLOWING_UP)} className="flex items-center gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 font-semibold py-2 px-4 rounded-lg transition-colors">
                                        <ArrowPathIcon className="w-5 h-5"/> Reativar Orçamento
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="mt-6 pt-4 border-t border-[var(--border-secondary)]">
                            <h3 className="font-semibold text-lg text-[var(--text-primary)] mb-4 flex items-center">
                                <ClockIcon className="w-5 h-5 mr-2 text-[var(--text-accent)]" /> Linha do Tempo
                            </h3>
                            {timelineEvents.length > 0 ? (
                                <div className="relative pl-12 border-l-2 border-[var(--border-secondary)] space-y-8">
                                    {timelineEvents.map((event) => (
                                        <div key={event.id} className="relative">
                                            <div className="absolute -left-[17px] top-0 flex items-center justify-center w-8 h-8 bg-[var(--background-tertiary)] rounded-full ring-4 ring-[var(--background-secondary)]">
                                                {getEventIcon(event.status)}
                                            </div>
                                            <div className="bg-[var(--background-secondary-hover)] p-3 rounded-lg border border-[var(--border-secondary)]">
                                                <div className="flex justify-between items-center flex-wrap gap-2">
                                                    <span className="font-bold text-[var(--text-primary)]">{getEventTitle(event)}</span>
                                                    <span className="text-xs font-medium text-[var(--text-secondary)]">{formatDisplayDate(event.date)}</span>
                                                </div>
                                                <p className="text-sm text-[var(--text-secondary)] mt-2 whitespace-pre-wrap">{event.notes}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-[var(--text-secondary)] py-4">Nenhum evento no histórico.</p>
                            )}
                        </div>

                        {/* Add Follow-up Form */}
                        {!isFinished && (
                            <form onSubmit={handleAddFollowUp} className="mt-6 pt-6 border-t border-[var(--border-primary)]">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-semibold text-lg text-[var(--text-primary)]">Adicionar Follow-up</h3>
                                    <div className="relative" ref={scriptMenuRef}>
                                        <button type="button" onClick={() => setScriptMenuOpen(prev => !prev)} className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-accent)] hover:underline">
                                            Usar Script <ChevronDownIcon className="w-4 h-4"/>
                                        </button>
                                        {isScriptMenuOpen && (
                                            <div className="absolute bottom-full right-0 mb-2 w-72 bg-[var(--background-secondary)] rounded-lg shadow-xl border border-[var(--border-primary)] z-10 max-h-64 overflow-y-auto">
                                                {scriptCategories.map(category => {
                                                    const categoryScripts = scripts.filter(s => s.category === category);
                                                    if (categoryScripts.length === 0) return null;
                                                    return (
                                                        <div key={category}>
                                                            <h4 className="p-2 text-xs font-bold uppercase text-[var(--text-tertiary)] bg-[var(--background-tertiary)]">{category}</h4>
                                                            {categoryScripts.map(script => (
                                                                <button key={script.id} type="button" onClick={() => useScript(script)} className="w-full text-left p-2 text-sm hover:bg-[var(--background-tertiary)] text-[var(--text-primary)]">
                                                                    {script.title}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <textarea
                                    value={followUpNotes}
                                    onChange={e => setFollowUpNotes(e.target.value)}
                                    placeholder="Descreva a interação com o cliente..."
                                    rows={4}
                                    className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                                ></textarea>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Status da Interação</label>
                                        <select value={followUpStatus} onChange={e => setFollowUpStatus(e.target.value as FollowUpStatus)} className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2">
                                            {Object.values(FollowUpStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Agendar Próximo Follow-up</label>
                                        <input type="date" value={nextFollowUpDate || ''} onChange={e => setNextFollowUpDate(e.target.value)} min={today} className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2 dark:[color-scheme:dark]"/>
                                    </div>
                                </div>
                                <div className="flex justify-end mt-4">
                                    <button type="submit" className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg">Salvar Follow-up</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
             {/* Win Confirmation Modal */}
            {isConfirmingWin && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-[var(--background-secondary)] rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
                        <TrophyIcon className="w-12 h-12 text-green-500 mx-auto mb-4"/>
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">Confirmar Venda!</h3>
                        <p className="text-[var(--text-secondary)] mt-2">Parabéns! Qual o valor final de fechamento do orçamento?</p>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-left text-[var(--text-secondary)] mb-1">Valor de Fechamento</label>
                             <input 
                                value={closingValue} 
                                onChange={e => setClosingValue(formatCurrencyForInput(e.target.value))} 
                                className="w-full text-center text-xl font-bold bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2"
                            />
                        </div>
                        <div className="flex justify-center gap-4 mt-6">
                            <button onClick={() => setIsConfirmingWin(false)} className="bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-black dark:text-white font-semibold py-2 px-6 rounded-lg">Cancelar</button>
                            <button onClick={handleConfirmWin} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
             <BudgetAIAnalysisModal isOpen={isAIModalOpen} onClose={() => setAIModalOpen(false)} budget={budget} clientName={client.name} />
        </>
    );
};

export default BudgetDetailModal;
