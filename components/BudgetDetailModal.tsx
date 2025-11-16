import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Budget, Client, FollowUp, Contact, Script, ScriptCategory } from '../types';
import { BudgetStatus, FollowUpStatus, scriptCategories } from '../types';
import { 
    XMarkIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, ArrowPathIcon, WhatsAppIcon, 
    PauseCircleIcon, SparklesIcon, PencilIcon, ClockIcon, CurrencyDollarIcon, 
    ClipboardDocumentListIcon, PhoneIcon, EnvelopeIcon, StarIcon, ChevronDownIcon
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
            return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' às');
        } else {
            const [year, month, day] = dateString.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day));
            return utcDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        }
    } catch (e) { return 'Data inválida'; }
};

const formatCurrencyForInput = (value: number | string): string => {
    let numberValue: number;
    if (typeof value === 'number') { numberValue = value; } else {
        const digitsOnly = String(value).replace(/\D/g, '');
        if (digitsOnly === '') return '';
        numberValue = parseInt(digitsOnly, 10) / 100;
    }
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numberValue);
};

const unmaskCurrency = (maskedValue: string): number => {
    if (!maskedValue) return 0;
    const numericString = maskedValue.replace(/\./g, '').replace(',', '.');
    return parseFloat(numericString) || 0;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

const cleanPhoneNumber = (phone: string) => phone.replace(/\D/g, '');

// --- Helper Components (Moved to top level) ---

const EditableField: React.FC<{ value: string | number, onSave: (newValue: string | number) => void, type?: 'text' | 'textarea' | 'date' | 'currency', renderDisplay: (value: any) => React.ReactNode, inputClassName?: string, containerClassName?: string }> = ({ value: initialValue, onSave, type = 'text', renderDisplay, inputClassName, containerClassName }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
    useEffect(() => { if (isEditing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [isEditing]);
    const handleSave = () => { onSave(type === 'currency' ? unmaskCurrency(String(value)) : value); setIsEditing(false); };
    const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && type !== 'textarea') { e.preventDefault(); handleSave(); } if (e.key === 'Escape') { setValue(initialValue); setIsEditing(false); } };
    if (isEditing) {
        const commonClasses = `bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-lg text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none ${inputClassName}`;
        return ( <div className="w-full"> {type === 'textarea' ? <textarea ref={inputRef} value={String(value)} onChange={e => setValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleSave} className={`w-full min-h-[100px] ${commonClasses}`} /> : <input ref={inputRef} type={type === 'currency' ? 'text' : type} value={String(value)} onChange={e => setValue(type === 'currency' ? formatCurrencyForInput(e.target.value) : e.target.value)} onKeyDown={handleKeyDown} onBlur={handleSave} className={`w-full p-2 ${commonClasses}`} />} </div> );
    }
    return ( <div className={`group relative w-full ${containerClassName || ''}`} onClick={() => setIsEditing(true)}> <div className="cursor-pointer relative p-1 -m-1"> {renderDisplay(initialValue)} <PencilIcon className="w-4 h-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1" /> </div> </div> );
};

const ScriptSelectorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    scripts: Script[];
    onSelect: (content: string) => void;
}> = ({ isOpen, onClose, scripts, onSelect }) => {
    
    const [favorites, setFavorites] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('favoriteScripts');
            return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
        } catch {
            return new Set<string>();
        }
    });

    useEffect(() => {
        localStorage.setItem('favoriteScripts', JSON.stringify(Array.from(favorites)));
    }, [favorites]);

    const toggleFavorite = (scriptId: string) => {
        setFavorites(prev => {
            const newFavs = new Set(prev);
            if (newFavs.has(scriptId)) {
                newFavs.delete(scriptId);
            } else {
                newFavs.add(scriptId);
            }
            return newFavs;
        });
    };
    
    const favoriteScripts = useMemo(() => scripts.filter(s => s && favorites.has(s.id)), [scripts, favorites]);

    const scriptsByCategory = useMemo(() => scripts.reduce((acc, script) => {
        if (!script || favorites.has(script.id)) return acc;
        const category = script.category || 'Reengajamento';
        if (!acc[category]) acc[category] = [];
        acc[category].push(script);
        return acc;
    }, {} as Record<ScriptCategory, Script[]>), [scripts, favorites]);

    if (!isOpen) return null;

    const renderScriptList = (scriptList: Script[]) => (
        <div className="space-y-2 mt-2">
            {scriptList.map(s => (
                <div key={s.id} className="group w-full flex items-start gap-2 text-left p-3 rounded-lg bg-[var(--background-tertiary)] hover:bg-[var(--background-tertiary-hover)] transition-colors">
                    <button onClick={() => toggleFavorite(s.id)} className="mt-0.5 text-yellow-400 hover:text-yellow-500 transition-colors">
                        <StarIcon solid={favorites.has(s.id)} className="w-5 h-5"/>
                    </button>
                    <button onClick={() => onSelect(s.content || '')} className="flex-grow text-left">
                        <p className="font-semibold text-[var(--text-primary)]">{s.title || '(Script sem título)'}</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">{s.content || '(Script sem conteúdo)'}</p>
                    </button>
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-900/60 flex justify-center items-center z-[60] p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-[var(--background-secondary)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col transform transition-all">
                <div className="flex justify-between items-center p-4 border-b border-[var(--border-primary)] flex-shrink-0">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Selecionar Script</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="overflow-y-auto custom-scrollbar p-4 space-y-4">
                    {favoriteScripts.length > 0 && (
                        <div>
                            <h3 className="font-bold text-yellow-500 mb-2 px-1">⭐ Favoritos</h3>
                            {renderScriptList(favoriteScripts)}
                        </div>
                    )}
                    
                    {scriptCategories.map(categoryName => {
                        const categoryScripts = scriptsByCategory[categoryName];
                        if (!categoryScripts || categoryScripts.length === 0) return null;
                        return (
                            <div key={categoryName}>
                                <h3 className="font-bold text-[var(--text-secondary)] mb-2 px-1">{categoryName}</h3>
                                {renderScriptList(categoryScripts)}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

// --- Main Modal Component ---

const BudgetDetailModal: React.FC<BudgetDetailModalProps> = ({ isOpen, onClose, budget, client, contact, onAddFollowUp, onChangeStatus, onConfirmWin, onUpdateBudget, scripts }) => {
    // Action Center State
    const [notes, setNotes] = useState('');
    const [nextFollowUpDate, setNextFollowUpDate] = useState('');
    const [nextFollowUpTime, setNextFollowUpTime] = useState('');
    const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus>(FollowUpStatus.WAITING_RESPONSE);
    
    // UI State
    const [showWinPrompt, setShowWinPrompt] = useState(false);
    const [winValue, setWinValue] = useState('');
    const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
    const [isScriptSelectorModalOpen, setScriptSelectorModalOpen] = useState(false);
    const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
    
    useEffect(() => { if (!isOpen) { setShowWinPrompt(false); setWinValue(formatCurrencyForInput(budget?.value)); setNotes(''); } }, [isOpen, budget]);

    if (!budget || !isOpen) return null;

    // --- Data Handlers & Logic ---

    const handleAddFollowUp = () => {
        if (!notes) { alert('Por favor, adicione uma nota ao follow-up.'); return; }
        const followUpData: Omit<FollowUp, 'id'> = { date: new Date().toISOString(), notes, status: followUpStatus };
        let combinedNextDate: string | null = nextFollowUpDate || null;
        if (combinedNextDate && nextFollowUpTime) combinedNextDate = `${nextFollowUpDate}T${nextFollowUpTime}`;
        onAddFollowUp(budget.id, followUpData, combinedNextDate);
        setNotes(''); setNextFollowUpDate(''); setNextFollowUpTime(''); setFollowUpStatus(FollowUpStatus.WAITING_RESPONSE);
    };

    const handleConfirmWinClick = () => {
        const finalValue = unmaskCurrency(winValue);
        if (isNaN(finalValue) || finalValue <= 0) { alert("Por favor, insira um valor de fechamento válido."); return; }
        onConfirmWin(budget.id, finalValue);
        onClose();
    };

    // --- AI & Script Logic ---
    
    const handleScriptSelectAndClose = (content: string) => {
        let finalMessage = content;
        finalMessage = finalMessage.replace(/\[Nome do Cliente\]/g, contact?.name || client.name);
        finalMessage = finalMessage.replace(/\[Empresa do Cliente\]/g, client.name);
        finalMessage = finalMessage.replace(/\[Título da Proposta\]/g, budget.title);
        finalMessage = finalMessage.replace(/\[Valor da Proposta\]/g, formatCurrency(budget.value));
        setNotes(finalMessage);
        setScriptSelectorModalOpen(false);
    };

     const handleGenerateEmail = async () => {
        setIsGeneratingEmail(true);
        try {
            if (!process.env.API_KEY) throw new Error('A chave de API do Gemini não foi configurada.');
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const history = budget.followUps.length > 0 ? budget.followUps.map(f => `- ${formatDisplayDate(f.date)}: ${f.notes}`).join('\n') : 'Nenhum contato anterior.';
            const contactName = contact?.name || 'Cliente';
            const prompt = `Gere um e-mail de follow-up conciso e profissional para o orçamento '${budget.title}' de ${formatCurrency(budget.value)}, enviado para ${contactName} da ${client.name}. O status atual é '${budget.status}'. Histórico: ${history}. O objetivo é reengajar e buscar os próximos passos. Termine com uma pergunta clara. Forneça apenas o corpo do e-mail.`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { systemInstruction: "Você é um assistente de vendas especialista em CRM. Escreva em português do Brasil." }});
            setNotes(response.text || '');
        } catch (error) { console.error("Erro ao gerar e-mail:", error); alert("Ocorreu um erro ao gerar o e-mail."); }
        finally { setIsGeneratingEmail(false); }
    };
    
    const handleSendWhatsApp = () => {
        if (!contact?.phone || !notes) return;
        const phoneNumber = cleanPhoneNumber(contact.phone);
        const text = encodeURIComponent(notes);
        const fullPhoneNumber = phoneNumber.startsWith('55') ? phoneNumber : `55${phoneNumber}`;
        window.open(`https://wa.me/${fullPhoneNumber}?text=${text}`, '_blank', 'noopener,noreferrer');
    };

    const handleSendEmail = () => {
        if (!contact?.email || !notes) return;
        const subject = encodeURIComponent(`Re: Proposta - ${budget.title}`);
        const body = encodeURIComponent(notes);
        window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
    };


    // --- Component Renders ---

    const renderHeader = () => (
        <div className="flex justify-between items-start p-4 sm:p-6 border-b border-[var(--border-primary)] flex-shrink-0">
            <div className="flex-grow min-w-0">
                <EditableField value={budget.title} onSave={newTitle => onUpdateBudget(budget.id, { title: newTitle as string })} renderDisplay={value => <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] truncate" title={value}>{value}</h2>} inputClassName="text-xl sm:text-2xl font-bold p-1 -ml-1" />
                 <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[var(--text-secondary)]">
                    <span className="font-semibold text-base text-[var(--text-accent)]">{client.name}</span>
                    {client.cnpj && <span className="text-sm font-mono bg-[var(--background-tertiary)] px-2 py-0.5 rounded">{client.cnpj}</span>}
                </div>
                <div className="mt-2">
                    <EditableField value={formatCurrencyForInput(budget.value)} onSave={newValue => onUpdateBudget(budget.id, { value: newValue as number })} type="currency" renderDisplay={_ => <span className="text-2xl font-bold text-[var(--text-primary)]">{`R$ ${formatCurrency(budget.value)}`}</span>} inputClassName="text-2xl font-bold" />
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button onClick={onClose} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
    );

    const renderBuyerCard = () => (
        <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)]">
            <h4 className="font-semibold text-lg text-[var(--text-primary)] mb-3">Comprador</h4>
            <p className="font-bold text-xl text-[var(--text-accent)]">{contact?.name || 'Contato não definido'}</p>
            <div className="space-y-3 mt-4 text-sm">
                {contact?.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors"><EnvelopeIcon className="w-5 h-5 flex-shrink-0"/> <span className="truncate">{contact.email}</span></a>}
                {contact?.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-[var(--text-secondary)] hover:text-[var(--text-accent)] transition-colors"><PhoneIcon className="w-5 h-5 flex-shrink-0"/> <span>{contact.phone}</span></a>}
            </div>
            {contact?.phone && <a href={`https://wa.me/55${cleanPhoneNumber(contact.phone)}`} target="_blank" rel="noopener noreferrer" className="mt-4 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-lg transition-colors"><WhatsAppIcon className="w-5 h-5"/> Contatar no WhatsApp</a>}
        </div>
    );

    const renderVitalsCard = () => {
        const daysInPipeline = Math.ceil((new Date().getTime() - new Date(budget.dateSent).getTime()) / (1000 * 60 * 60 * 24));
        const Vital = ({ label, value }: { label: string, value: string | number }) => (
            <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{label}</p>
                <p className="text-lg font-bold text-[var(--text-primary)]">{value}</p>
            </div>
        );
        return (
            <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)]">
                <h4 className="font-semibold text-lg text-[var(--text-primary)] mb-3">Sinais Vitais do Negócio</h4>
                <div className="grid grid-cols-2 gap-4">
                    <Vital label="Status" value={budget.status} />
                    <Vital label="Dias no Funil" value={daysInPipeline} />
                    <Vital label="Follow-ups" value={budget.followUps.length} />
                    <div>
                        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Próxima Ação</p>
                        <p className={`text-lg font-bold ${!budget.nextFollowUpDate || new Date(budget.nextFollowUpDate) < new Date() ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                            {formatDisplayDate(budget.nextFollowUpDate) || 'N/A'}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const renderAIToolsCard = () => (
        <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)]">
            <h4 className="font-semibold text-lg text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-500" /> Ferramentas de IA ✨
            </h4>
            <div className="space-y-3">
                <button 
                    onClick={() => setAnalysisModalOpen(true)} 
                    className="w-full text-left bg-purple-50 dark:bg-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 p-3 rounded-lg transition-colors"
                >
                    <p className="font-semibold text-purple-800 dark:text-purple-200">Analisar Oportunidade</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">Calcular probabilidade de ganho e obter insights.</p>
                </button>
                <button 
                    onClick={handleGenerateEmail} 
                    disabled={isGeneratingEmail}
                    className="w-full text-left bg-purple-50 dark:bg-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 p-3 rounded-lg transition-colors disabled:opacity-50"
                >
                    <p className="font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                        {isGeneratingEmail && <ArrowPathIcon className="w-4 h-4 animate-spin"/>}
                        Sugerir E-mail de Follow-up
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">Gerar um rascunho com base no histórico do negócio.</p>
                </button>
            </div>
        </div>
    );

    const renderActionCenter = () => (
         <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)]">
            <label className="font-semibold text-lg text-[var(--text-primary)] mb-2 block">Centro de Ações</label>
            
            {/* Text Area and sending options */}
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} placeholder={`Registre o contato ou escreva uma mensagem para enviar...`} className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-3 text-sm focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none" />
            
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                 <div className="flex items-center gap-2">
                     <button onClick={() => setScriptSelectorModalOpen(true)} className="text-sm flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-1.5 px-3 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                         <ClipboardDocumentListIcon className="w-4 h-4"/> Usar Script
                     </button>
                 </div>
                 <div className="flex items-center gap-2">
                     <button
                        onClick={handleSendWhatsApp}
                        disabled={!notes || !contact?.phone}
                        className="text-sm flex items-center gap-1.5 bg-green-500 text-white font-semibold py-1.5 px-3 rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                        title={!notes ? "Escreva uma mensagem para enviar" : !contact?.phone ? "Contato sem telefone cadastrado" : "Enviar por WhatsApp"}
                    >
                         <WhatsAppIcon className="w-4 h-4"/> WhatsApp
                     </button>
                      <button
                        onClick={handleSendEmail}
                        disabled={!notes || !contact?.email}
                        className="text-sm flex items-center gap-1.5 bg-blue-500 text-white font-semibold py-1.5 px-3 rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                        title={!notes ? "Escreva uma mensagem para enviar" : !contact?.email ? "Contato sem e-mail cadastrado" : "Enviar por E-mail"}
                    >
                         <EnvelopeIcon className="w-4 h-4"/> E-mail
                     </button>
                 </div>
            </div>

            {/* Scheduling and Logging */}
            <div className="mt-4 border-t border-[var(--border-primary)] pt-4">
                <label className="font-semibold text-[var(--text-primary)] mb-2 block">Registrar e Agendar Próxima Ação</label>
                <div className="space-y-3">
                    <select value={followUpStatus} onChange={e => setFollowUpStatus(e.target.value as FollowUpStatus)} className="w-full text-sm bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-md py-2 px-3 font-semibold">
                        {Object.values(FollowUpStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="date" value={nextFollowUpDate} onChange={e => setNextFollowUpDate(e.target.value)} className="bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2 text-sm dark:[color-scheme:dark]" />
                        <input type="time" value={nextFollowUpTime} onChange={e => setNextFollowUpTime(e.target.value)} className="bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2 text-sm dark:[color-scheme:dark]" />
                    </div>
                </div>
                <button onClick={handleAddFollowUp} className="w-full mt-4 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2.5 rounded-lg">Registrar Follow-up</button>
            </div>
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-gray-900/60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-[var(--background-primary)] rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col transform transition-all">
                {renderHeader()}
                <div className="flex-grow p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* --- LEFT "INTEL" COLUMN --- */}
                        <div className="space-y-6">
                            {renderBuyerCard()}
                            {renderVitalsCard()}
                            {renderAIToolsCard()}
                             <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)]">
                                <h4 className="font-semibold text-lg text-[var(--text-primary)] mb-3">Observações Gerais</h4>
                                <EditableField
                                    value={budget.observations || ''}
                                    onSave={newObs => onUpdateBudget(budget.id, { observations: newObs as string })}
                                    type="textarea"
                                    renderDisplay={value => <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap min-h-[40px]">{value || 'Nenhuma observação.'}</p>}
                                />
                            </div>
                        </div>

                        {/* --- RIGHT "ACTION" COLUMN --- */}
                        <div className="space-y-6">
                            {renderActionCenter()}
                             <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)]">
                                <h4 className="font-semibold text-lg text-[var(--text-primary)] mb-4">Linha do Tempo</h4>
                                <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                                    <div className="relative pl-6 after:absolute after:top-2 after:bottom-2 after:left-0 after:w-0.5 after:bg-[var(--border-primary)]">
                                        <div className="relative mb-6">
                                            <div className="absolute -left-[29px] top-0.5 w-5 h-5 bg-blue-500 rounded-full border-4 border-[var(--background-secondary)]"></div>
                                            <p className="font-semibold text-sm text-[var(--text-primary)]">Orçamento Criado e Enviado</p>
                                            <p className="text-xs text-[var(--text-secondary)]">{formatDisplayDate(budget.dateSent)}</p>
                                        </div>
                                        {[...budget.followUps].reverse().map((f, index) => (
                                            <div key={index} className="relative mb-6">
                                                <div className="absolute -left-[29px] top-0.5 w-5 h-5 bg-slate-400 rounded-full border-4 border-[var(--background-secondary)]"></div>
                                                <div className="flex justify-between items-center">
                                                    <p className="font-semibold text-sm text-[var(--text-primary)]">Follow-up Registrado</p>
                                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`}>{f.status || 'Concluído'}</span>
                                                </div>
                                                <p className="text-xs text-[var(--text-secondary)] mb-2">{formatDisplayDate(f.date)}</p>
                                                <div className="bg-[var(--background-tertiary)] p-3 rounded-lg text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{f.notes}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
            <ScriptSelectorModal
                isOpen={isScriptSelectorModalOpen}
                onClose={() => setScriptSelectorModalOpen(false)}
                scripts={scripts}
                onSelect={handleScriptSelectAndClose}
            />
            {isAnalysisModalOpen && <BudgetAIAnalysisModal isOpen={isAnalysisModalOpen} onClose={() => setAnalysisModalOpen(false)} budget={budget} clientName={client.name} />}
        </div>
    );
};

export default BudgetDetailModal;