import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Budget, Client, FollowUp, Contact, Script, ScriptCategory } from '../types';
import { BudgetStatus, FollowUpStatus, scriptCategories } from '../types';
import { 
    XMarkIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, ArrowPathIcon, WhatsAppIcon, 
    PauseCircleIcon, SparklesIcon, PencilIcon, ClockIcon, CurrencyDollarIcon, 
    ClipboardDocumentListIcon, PhoneIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, StarIcon
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
    scripts: Script[];
}

const formatDisplayDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data inválida';

        const hasTime = dateString.includes('T');

        if (hasTime) {
            return date.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
                timeZone: 'America/Sao_Paulo'
            }).replace(',', ' às');
        } else {
            const [year, month, day] = dateString.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day));
            return utcDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        }
    } catch (e) {
        return 'Data inválida';
    }
};

const formatCurrencyForInput = (value: number | string): string => {
    let numberValue: number;
    if (typeof value === 'number') {
        numberValue = value;
    } else {
        const digitsOnly = String(value).replace(/\D/g, '');
        if (digitsOnly === '') return '';
        numberValue = parseInt(digitsOnly, 10) / 100;
    }

    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numberValue);
};

const unmaskCurrency = (maskedValue: string): number => {
    if (!maskedValue) return 0;
    const numericString = maskedValue.replace(/\./g, '').replace(',', '.');
    return parseFloat(numericString) || 0;
};


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const cleanPhoneNumber = (phone: string) => {
    return phone.replace(/\D/g, '');
};

const isPhoneNumber = (contact: string) => {
    const cleaned = cleanPhoneNumber(contact);
    return cleaned.length >= 10 && /^\d+$/.test(cleaned);
};

const today = new Date().toISOString().split('T')[0];

const getStatusPill = (status: BudgetStatus) => {
  const styles: {[key in BudgetStatus]: string} = {
    [BudgetStatus.SENT]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    [BudgetStatus.FOLLOWING_UP]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    [BudgetStatus.ORDER_PLACED]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    [BudgetStatus.INVOICED]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    [BudgetStatus.LOST]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    [BudgetStatus.ON_HOLD]: 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200',
  }
  return <span className={`px-3 py-1 text-sm font-bold rounded-full whitespace-nowrap ${styles[status] || styles[BudgetStatus.ON_HOLD]}`}>{status}</span>;
}

const getFollowUpStatusPill = (status: FollowUpStatus | undefined) => {
  if (!status) return null;
  const styles: {[key in FollowUpStatus]: string} = {
    [FollowUpStatus.COMPLETED]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    [FollowUpStatus.WAITING_RESPONSE]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    [FollowUpStatus.RESCHEDULED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  }
  return <span className={`px-2 py-0.5 text-xs font-bold rounded-full whitespace-nowrap ${styles[status]}`}>{status}</span>;
};

// --- Editable Field Component ---
const EditableField: React.FC<{ value: string | number, onSave: (newValue: string | number) => void, type?: 'text' | 'textarea' | 'date' | 'currency', renderDisplay: (value: any) => React.ReactNode, inputClassName?: string, containerClassName?: string }> = ({ value: initialValue, onSave, type = 'text', renderDisplay, inputClassName, containerClassName }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (type === 'currency') {
            onSave(unmaskCurrency(String(value)));
        } else {
            onSave(value);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && type !== 'textarea') {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            setValue(initialValue);
            setIsEditing(false);
        }
    };
    
    if (isEditing) {
        const commonClasses = `bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-lg text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none ${inputClassName}`;
        return (
            <div className="w-full">
                {type === 'textarea' ? (
                     <textarea ref={inputRef} value={String(value)} onChange={e => setValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleSave} className={`w-full min-h-[100px] ${commonClasses}`} />
                ) : (
                    <input ref={inputRef} type={type === 'currency' ? 'text' : type} value={String(value)} onChange={e => setValue(type === 'currency' ? formatCurrencyForInput(e.target.value) : e.target.value)} onKeyDown={handleKeyDown} onBlur={handleSave} className={`w-full p-2 ${commonClasses}`} />
                )}
            </div>
        );
    }

    return (
         <div className={`group relative w-full ${containerClassName || ''}`} onClick={() => setIsEditing(true)}>
             <div className="cursor-pointer relative">
                {renderDisplay(initialValue)}
                <PencilIcon className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 right-1" />
            </div>
         </div>
    );
};

const BudgetDetailModal: React.FC<BudgetDetailModalProps> = ({ isOpen, onClose, budget, client, contact, onAddFollowUp, onChangeStatus, onConfirmWin, onUpdateBudget, scripts }) => {
    const [notes, setNotes] = useState('');
    const [nextFollowUpDate, setNextFollowUpDate] = useState('');
    const [nextFollowUpTime, setNextFollowUpTime] = useState('');
    const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus>(FollowUpStatus.WAITING_RESPONSE);
    const [showWinPrompt, setShowWinPrompt] = useState(false);
    const [winValue, setWinValue] = useState('');
    const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
    const [isScriptSelectorOpen, setScriptSelectorOpen] = useState(false);
    const scriptSelectorRef = useRef<HTMLDivElement>(null);

    // --- Script Selector Logic ---
    const [favorites, setFavorites] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('favoriteScripts');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch (e) {
            return new Set();
        }
    });

    const favoriteScripts = useMemo(() => {
        return scripts.filter(s => favorites.has(s.id));
    }, [favorites, scripts]);

    const scriptsByCategory = useMemo(() => {
        return scripts.reduce((acc, script) => {
            if (favorites.has(script.id)) return acc; // Don't show in regular categories if it's a favorite
            const category = script.category || 'Reengajamento'; // Fallback for old data
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(script);
            return acc;
        }, {} as Record<ScriptCategory, Script[]>);
    }, [scripts, favorites]);


    const handleSelectScript = (content: string) => {
        let finalMessage = content;
        finalMessage = finalMessage.replace(/\[Nome do Cliente\]/g, contact?.name || client.name);
        finalMessage = finalMessage.replace(/\[Empresa do Cliente\]/g, client.name);
        finalMessage = finalMessage.replace(/\[Título da Proposta\]/g, budget.title);
        finalMessage = finalMessage.replace(/\[Valor da Proposta\]/g, formatCurrency(budget.value));
        
        setNotes(finalMessage);
        setScriptSelectorOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (scriptSelectorRef.current && !scriptSelectorRef.current.contains(event.target as Node)) {
                setScriptSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- End Script Selector Logic ---

    useEffect(() => {
        if (!isOpen) {
            setShowWinPrompt(false);
            setWinValue('');
        }
    }, [isOpen]);

    if (!budget || !isOpen) return null;

    const handleAddFollowUp = () => {
        if (!notes) {
            alert('Por favor, adicione uma nota ao follow-up.');
            return;
        }

        const followUpData: Omit<FollowUp, 'id'> = { date: new Date().toISOString(), notes, status: followUpStatus };

        let combinedNextDate: string | null = nextFollowUpDate || null;
        if (combinedNextDate && nextFollowUpTime) {
            combinedNextDate = `${nextFollowUpDate}T${nextFollowUpTime}`;
        }

        onAddFollowUp(budget.id, followUpData, combinedNextDate);
        
        setNotes('');
        setNextFollowUpDate('');
        setNextFollowUpTime('');
        setFollowUpStatus(FollowUpStatus.WAITING_RESPONSE);
    };

    const handleGenerateEmail = async () => {
        setIsGeneratingEmail(true);
        try {
            if (!process.env.API_KEY) throw new Error('A chave de API do Gemini não foi configurada.');
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const history = budget.followUps.length > 0
                ? budget.followUps.map(f => `- ${formatDisplayDate(f.date)}: ${f.notes}`).join('\n')
                : 'Nenhum contato anterior registrado.';
    
            const contactName = contact?.name || 'Cliente';
            const prompt = `Gere um e-mail de follow-up para o orçamento '${budget.title}' no valor de ${formatCurrency(budget.value)}, enviado para ${contactName} da empresa ${client.name}.
O status atual do orçamento é: '${budget.status}'.
Histórico de contatos anteriores:
${history}
O objetivo do e-mail é reengajar o cliente, entender se há alguma dúvida e gentilmente buscar os próximos passos. Mantenha o e-mail conciso e termine com uma pergunta clara para incentivar uma resposta. Não inclua placeholders como '[Seu Nome]' ou '[Sua Empresa]', apenas o corpo do e-mail. Comece com uma saudação como "Olá ${contactName}," ou "Prezado(a) ${contactName},".`;
    
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { systemInstruction: "Você é um assistente de vendas especialista em CRM e follow-ups. Seu tom é profissional, mas amigável e proativo. Escreva em português do Brasil." }
            });
            setNotes(response.text || '');
        } catch (error) {
            console.error("Erro ao gerar e-mail com IA:", error);
            alert("Ocorreu um erro ao gerar o e-mail.");
        } finally {
            setIsGeneratingEmail(false);
        }
    };
    
    const contactPhone = contact?.phone || '';
    const canContactOnWhatsApp = isPhoneNumber(contactPhone);

    const handleSendWhatsApp = () => {
        if (!canContactOnWhatsApp || !contact) return;
        const phoneNumber = `55${cleanPhoneNumber(contactPhone)}`;
        const message = `Olá ${contact.name}, tudo bem?\n\nReferente à proposta *${budget.title}* para a empresa ${client.name}.\n\n*Valor:* ${formatCurrency(budget.value)}\n\nQualquer dúvida, estou à disposição!`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');
    };

    const handleConfirmWinClick = () => {
        const finalValue = unmaskCurrency(winValue);
        if (isNaN(finalValue) || finalValue <= 0) {
            alert("Por favor, insira um valor de fechamento válido.");
            return;
        }
        onConfirmWin(budget.id, finalValue);
        onClose();
    };


    return (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 flex justify-center items-center z-50 p-2 sm:p-4">
            <div className="bg-[var(--background-primary)] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col transform transition-all">
                {/* Header */}
                <div className="flex justify-between items-center p-4 sm:p-6 border-b border-[var(--border-primary)] flex-shrink-0">
                    <div className="flex-grow">
                        <EditableField
                            value={budget.title}
                            onSave={newTitle => onUpdateBudget(budget.id, { title: newTitle as string })}
                            renderDisplay={value => <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] pr-6 truncate" title={value as string}>{value}</h2>}
                            inputClassName="text-xl sm:text-2xl font-bold"
                        />
                        <p className="text-md text-[var(--text-accent)] font-semibold">{client.name}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                             <EditableField value={formatCurrencyForInput(budget.value)} onSave={(newValue) => onUpdateBudget(budget.id, { value: newValue as number})} type="currency" renderDisplay={(v) => <p className="font-semibold text-lg text-[var(--text-primary)] pr-6">R$ {v}</p>} inputClassName="text-lg font-semibold text-right" />
                             {getStatusPill(budget.status)}
                        </div>
                        <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                            <XMarkIcon className="w-7 h-7" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar flex flex-col lg:grid lg:grid-cols-3 gap-6 p-4 sm:p-6">
                    {/* Main Content (Left & Center) */}
                    <div className="lg:col-span-2 space-y-6">
                         {/* Action Center Card */}
                        <div className="bg-[var(--background-secondary)] p-4 rounded-xl border border-[var(--border-primary)] shadow-sm">
                            <h3 className="font-semibold text-lg mb-3 text-[var(--text-primary)]">Centro de Ações</h3>
                            <div className="space-y-4">
                                <textarea 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)} 
                                    rows={4} 
                                    placeholder="Descreva o contato, gere um e-mail com IA ou use um script..." 
                                    className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2 focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                                />
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                     <div className="flex items-center gap-2">
                                        <button 
                                            onClick={handleGenerateEmail}
                                            disabled={isGeneratingEmail}
                                            className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 font-semibold py-2 px-3 rounded-lg bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 transition"
                                        >
                                            {isGeneratingEmail ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : <SparklesIcon className="w-5 h-5" />}
                                            {isGeneratingEmail ? 'Gerando...' : 'IA'}
                                        </button>
                                        <div className="relative">
                                            <button 
                                                onClick={() => setScriptSelectorOpen(prev => !prev)}
                                                className="flex items-center gap-2 text-sm text-white font-bold py-2 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm"
                                            >
                                                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                                                Usar Script Rápido
                                            </button>
                                            {isScriptSelectorOpen && (
                                                <div ref={scriptSelectorRef} className="absolute top-full left-0 mt-2 w-96 bg-[var(--background-secondary)] rounded-xl shadow-2xl border border-[var(--border-primary)] z-20 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                                    {favoriteScripts.length > 0 && (
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-[var(--text-primary)] bg-[var(--background-tertiary)] px-3 py-1.5 border-b border-[var(--border-primary)] sticky top-0 z-10">⭐ Favoritos</h4>
                                                            <div className="p-2">
                                                                {favoriteScripts.map(script => (
                                                                    <button key={script.id} onClick={() => handleSelectScript(script.content)} className="w-full text-left p-2 text-sm rounded-md hover:bg-[var(--background-tertiary)]">{script.title}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                     {scriptCategories.map(categoryName => {
                                                        const categoryScripts = scriptsByCategory[categoryName];
                                                        if (!categoryScripts || categoryScripts.length === 0) return null;
                                                        return (
                                                            <div key={categoryName}>
                                                                <h4 className="text-sm font-semibold text-[var(--text-primary)] bg-[var(--background-tertiary)] px-3 py-1.5 border-b border-[var(--border-primary)] sticky top-0 z-10">{categoryName}</h4>
                                                                <div className="p-2">
                                                                    {categoryScripts.map(script => (
                                                                        <button key={script.id} onClick={() => handleSelectScript(script.content)} className="w-full text-left p-2 text-sm rounded-md hover:bg-[var(--background-tertiary)]">{script.title}</button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                     </div>
                                     <div className="flex flex-wrap items-end gap-2">
                                        <div className="flex-grow min-w-[120px]">
                                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Próximo Contato</label>
                                            <input type="date" value={nextFollowUpDate} onChange={e => setNextFollowUpDate(e.target.value)} min={today} className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2 text-sm dark:[color-scheme:dark]" />
                                        </div>
                                        <div className="flex-grow min-w-[90px]">
                                             <input type="time" value={nextFollowUpTime} onChange={e => setNextFollowUpTime(e.target.value)} disabled={!nextFollowUpDate} className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2 text-sm dark:[color-scheme:dark] disabled:bg-[var(--background-tertiary-hover)]"/>
                                        </div>
                                        <button onClick={handleAddFollowUp} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg text-sm">Registrar</button>
                                    </div>
                                </div>
                                 {/* Closing Actions */}
                                <div className="space-y-2 pt-4 border-t border-[var(--border-primary)]">
                                     {showWinPrompt ? (
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-2">
                                            <label className="block text-sm font-medium text-emerald-800 dark:text-emerald-200">Valor final do fechamento:</label>
                                            <div className="flex gap-2">
                                                <input type="text" value={winValue} onChange={e => setWinValue(formatCurrencyForInput(e.target.value))} className="flex-grow bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" autoFocus />
                                                <button onClick={handleConfirmWinClick} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-lg text-sm">Confirmar</button>
                                                <button onClick={() => setShowWinPrompt(false)} className="bg-white hover:bg-gray-100 text-gray-700 font-semibold p-2 rounded-lg border border-gray-300 text-sm"><XMarkIcon className="w-5 h-5"/></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button onClick={() => { setShowWinPrompt(true); setWinValue(formatCurrencyForInput(budget.value)); }} className="flex-1 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-lg text-sm"><CheckCircleIcon className="w-5 h-5 mr-2" /> Ganho</button>
                                            <button onClick={() => onChangeStatus(budget.id, BudgetStatus.LOST)} className="flex-1 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg text-sm"><XCircleIcon className="w-5 h-5 mr-2" /> Perdido</button>
                                            <button onClick={() => onChangeStatus(budget.id, BudgetStatus.ON_HOLD)} className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-800 dark:text-slate-100 font-bold py-2 px-3 rounded-lg text-sm"><PauseCircleIcon className="w-5 h-5 mr-2" /> Congelar</button>
                                        </div>
                                     )}
                                </div>
                            </div>
                        </div>

                         {/* Business Timeline */}
                        <div>
                            <h3 className="font-semibold text-lg mb-3 text-[var(--text-primary)] flex items-center"><ArrowPathIcon className="w-5 h-5 mr-2 text-[var(--text-accent)]"/> Linha do Tempo do Negócio</h3>
                            <div className="relative pl-5 border-l-2 border-[var(--border-secondary)]">
                                {budget.followUps.length > 0 ? budget.followUps.slice().reverse().map((fu, index) => (
                                    <div key={fu.id} className="mb-6 relative">
                                        <div className="absolute -left-[30px] top-1 w-4 h-4 bg-[var(--accent-primary)] rounded-full border-4 border-[var(--background-primary)]"></div>
                                        <div className="bg-[var(--background-secondary)] p-3 rounded-lg border border-[var(--border-primary)] shadow-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="font-semibold text-sm text-[var(--text-secondary)]">{formatDisplayDate(fu.date)}</p>
                                                {getFollowUpStatusPill(fu.status)}
                                            </div>
                                            <p className="text-[var(--text-primary)] whitespace-pre-wrap text-sm">{fu.notes}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-gray-400 dark:text-slate-500 italic text-center p-4">Nenhum follow-up registrado.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Information Sidebar (Right) */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[var(--background-secondary)] p-4 rounded-xl border border-[var(--border-primary)] shadow-sm space-y-4">
                            <h3 className="font-semibold text-lg text-[var(--text-primary)]">Detalhes Essenciais</h3>
                            <div>
                                <label className="text-sm text-[var(--text-secondary)] block">Enviado em</label>
                               <EditableField value={budget.dateSent.split('T')[0]} onSave={(newDate) => onUpdateBudget(budget.id, { dateSent: newDate as string})} type="date" renderDisplay={(v) => <p className="font-semibold text-[var(--text-primary)] pr-6">{formatDisplayDate(v as string)}</p>} inputClassName="text-base font-semibold" />
                            </div>
                            <div>
                                <label className="text-sm text-[var(--text-secondary)] block">Próximo Contato</label>
                                <p className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><ClockIcon className="w-4 h-4"/> {formatDisplayDate(budget.nextFollowUpDate)}</p>
                            </div>
                        </div>
                        
                        <div className="bg-[var(--background-secondary)] p-4 rounded-xl border border-[var(--border-primary)] shadow-sm">
                             <h3 className="font-semibold text-lg mb-3 text-[var(--text-primary)]">Informações do Comprador</h3>
                             <div className="space-y-3 text-sm">
                                <p className="flex items-center gap-2"><strong className="text-[var(--text-secondary)] w-20 inline-block">Nome:</strong> <span className="text-[var(--text-primary)] font-semibold">{contact?.name || 'N/A'}</span></p>
                                {contact?.email && <p className="flex items-start gap-2"><EnvelopeIcon className="w-4 h-4 mt-0.5 text-[var(--text-secondary)]"/><a href={`mailto:${contact.email}`} className="text-blue-600 dark:text-blue-400 hover:underline break-all">{contact.email}</a></p>}
                                {contact?.phone && <p className="flex items-center gap-2"><PhoneIcon className="w-4 h-4 text-[var(--text-secondary)]"/><span>{contact.phone}</span></p>}
                                {canContactOnWhatsApp && (
                                     <button onClick={handleSendWhatsApp} className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm mt-2"><WhatsAppIcon className="w-5 h-5" /> Contatar via WhatsApp</button>
                                )}
                             </div>
                        </div>

                        <div className="bg-[var(--background-secondary)] p-4 rounded-xl border border-[var(--border-primary)] shadow-sm">
                            <h3 className="font-semibold text-lg mb-2 text-[var(--text-primary)] flex items-center gap-2"><ClipboardDocumentListIcon className="w-5 h-5"/> Observações Estratégicas</h3>
                            <EditableField 
                                value={budget.observations || ''} 
                                onSave={(newObs) => onUpdateBudget(budget.id, { observations: newObs as string })} 
                                type="textarea" 
                                containerClassName="w-full"
                                renderDisplay={(v) => <div className="bg-yellow-50 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800/50 text-sm min-h-[60px] whitespace-pre-wrap w-full">{v || 'Clique para adicionar...'}</div>} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetDetailModal;