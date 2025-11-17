import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Budget, Client, FollowUp, Contact, Script, ScriptCategory, UserProfile, UserData } from '../types';
import { BudgetStatus, FollowUpStatus, scriptCategories } from '../types';
import { 
    XMarkIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, ArrowPathIcon, WhatsAppIcon, 
    PauseCircleIcon, PencilIcon, ClockIcon, CurrencyDollarIcon, ChatBubbleLeftRightIcon,
    ClipboardDocumentListIcon, PhoneIcon, EnvelopeIcon, StarIcon, ChevronDownIcon, TrophyIcon
} from './icons';
import LostReasonModal from './LostReasonModal';

interface BudgetDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    budget: Budget;
    client: Client;
    contact?: Contact;
    userProfile: UserProfile;
    users: UserData[];
    onAddFollowUp: (budgetId: string, followUp: Omit<FollowUp, 'id'>, nextFollowUpDate: string | null) => void;
    onAddComment: (budgetId: string, text: string) => void;
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

const getStatusBadgeColor = (status: BudgetStatus) => {
    switch (status) {
        case BudgetStatus.SENT: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
        case BudgetStatus.FOLLOWING_UP: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        case BudgetStatus.ORDER_PLACED: return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        case BudgetStatus.INVOICED: return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300';
        case BudgetStatus.LOST: return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        case BudgetStatus.ON_HOLD: return 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const unmaskCurrency = (maskedValue: string): number => {
    if (!maskedValue) return 0;
    const numericString = maskedValue.replace(/\./g, '').replace(',', '.');
    return parseFloat(numericString);
};

const formatCurrencyForInput = (value: string): string => {
    if (!value) return '';
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') return '';
    const numberValue = parseInt(digitsOnly, 10) / 100;
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numberValue);
};

export const BudgetDetailModal: React.FC<BudgetDetailModalProps> = ({
    isOpen,
    onClose,
    budget,
    client,
    contact,
    userProfile,
    users,
    onAddFollowUp,
    onAddComment,
    onChangeStatus,
    onConfirmWin,
    onUpdateBudget,
    scripts,
}) => {
    const [activeTab, setActiveTab] = useState<'followup' | 'comments'>('followup');
    // Follow-up state
    const [newFollowUpNote, setNewFollowUpNote] = useState('');
    const [newFollowUpStatus, setNewFollowUpStatus] = useState<FollowUpStatus>(FollowUpStatus.WAITING_RESPONSE);
    const [nextFollowUpDate, setNextFollowUpDate] = useState<string | null>(null);
    
    // Comment state
    const [newComment, setNewComment] = useState('');
    
    // General state
    const [closingValue, setClosingValue] = useState('');
    const [isConfirmingWin, setIsConfirmingWin] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editableTitle, setEditableTitle] = useState(budget.title);
    const [editableValue, setEditableValue] = useState(formatCurrency(budget.value));
    
    // Script state
    const [scriptCategory, setScriptCategory] = useState<ScriptCategory>('Follow-up Pós-Envio');
    const [selectedScript, setSelectedScript] = useState<Script | null>(null);
    const [isLostReasonModalOpen, setLostReasonModalOpen] = useState(false);
    
    // Mentions state
    const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [mentionSuggestions, setMentionSuggestions] = useState<UserData[]>([]);
    const [showMentions, setShowMentions] = useState(false);
    const mentionTriggerIndex = useRef<number | null>(null);

    const filteredScripts = useMemo(() => scripts.filter(s => s.category === scriptCategory), [scripts, scriptCategory]);
    
    useEffect(() => {
        if (isOpen) {
            setActiveTab('followup');
            setNewFollowUpNote('');
            setNewComment('');
            setNextFollowUpDate(null);
            setClosingValue(formatCurrency(budget.value));
            setIsConfirmingWin(false);
            setEditableTitle(budget.title);
            setEditableValue(formatCurrency(budget.value));
            setIsEditing(false);
            setScriptCategory('Follow-up Pós-Envio');
            setSelectedScript(null);
            setLostReasonModalOpen(false);
            setShowMentions(false);
        }
    }, [isOpen, budget]);

    // --- Data Handlers ---

    const handleConfirmLoss = (reason: string, notes: string) => {
        onUpdateBudget(budget.id, { status: BudgetStatus.LOST, lostReason: reason, lostNotes: notes, nextFollowUpDate: null });
        setLostReasonModalOpen(false);
        onClose();
    };

    const handleSaveFollowUp = () => {
        if (newFollowUpNote.trim()) {
            onAddFollowUp(budget.id, { date: new Date().toISOString(), notes: newFollowUpNote.trim(), status: newFollowUpStatus }, nextFollowUpDate);
            setNewFollowUpNote('');
        }
    };
    
    const handleSendExternal = (channel: 'WhatsApp' | 'Email') => {
        if (!newFollowUpNote.trim()) return;
        const noteWithPrefix = `(Enviado via ${channel}): ${newFollowUpNote.trim()}`;
        onAddFollowUp(budget.id, { date: new Date().toISOString(), notes: noteWithPrefix, status: FollowUpStatus.WAITING_RESPONSE }, nextFollowUpDate);
        const encodedMessage = encodeURIComponent(newFollowUpNote.trim());
        if (channel === 'WhatsApp' && contact?.phone) {
            const phoneNumber = contact.phone.replace(/\D/g, '');
            const whatsappUrl = `https://wa.me/${phoneNumber.startsWith('55') ? phoneNumber : '55' + phoneNumber}?text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
        } else if (channel === 'Email' && contact?.email) {
            const subject = encodeURIComponent(`Proposta: ${budget.title}`);
            const mailtoUrl = `mailto:${contact.email}?subject=${subject}&body=${encodedMessage}`;
            window.location.href = mailtoUrl;
        }
        setNewFollowUpNote('');
    };

    const handleApplyScript = (content: string) => {
        let finalContent = content;
        if (contact?.name) finalContent = finalContent.replace(/\[Nome do Cliente\]/g, contact.name.split(' ')[0]);
        if (budget.title) finalContent = finalContent.replace(/\[Título da Proposta\]/g, `"${budget.title}"`);
        setNewFollowUpNote(finalContent);
        setSelectedScript(null);
    };

    const handleSaveEdit = () => {
        const value = unmaskCurrency(editableValue);
        if (editableTitle.trim() === '' || isNaN(value) || value <= 0) {
            alert('Título e valor são obrigatórios.');
            return;
        }
        onUpdateBudget(budget.id, { title: editableTitle.trim(), value });
        setIsEditing(false);
    };
    
    // --- Mentions Logic ---
    const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewComment(text);

        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = text.substring(0, cursorPosition);
        const atIndex = textBeforeCursor.lastIndexOf('@');
        const spaceIndex = textBeforeCursor.lastIndexOf(' ');

        if (atIndex > spaceIndex) {
            const query = textBeforeCursor.substring(atIndex + 1);
            const suggestions = users.filter(user =>
                user.name.toLowerCase().includes(query.toLowerCase()) && user.id !== userProfile.id
            );
            if (suggestions.length > 0) {
                setMentionSuggestions(suggestions);
                setShowMentions(true);
                mentionTriggerIndex.current = atIndex;
            } else {
                setShowMentions(false);
            }
        } else {
            setShowMentions(false);
        }
    };

    const handleMentionSelect = (user: UserData) => {
        if (commentTextareaRef.current && mentionTriggerIndex.current !== null) {
            const text = newComment;
            const start = mentionTriggerIndex.current;
            const end = commentTextareaRef.current.selectionStart;

            const newText = text.substring(0, start) + `@${user.name} ` + text.substring(end);
            
            setNewComment(newText);
            setShowMentions(false);
            
            setTimeout(() => {
                commentTextareaRef.current?.focus();
                const newCursorPos = start + user.name.length + 2; // for "@" and trailing space
                commentTextareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        }
    };
    
    const handleSaveComment = () => {
        if (newComment.trim()) {
            onAddComment(budget.id, newComment.trim());
            setNewComment('');
        }
    };

    // --- Computed & Memoized Values ---
    const canSaveFollowUp = newFollowUpNote.trim().length > 0;
    const canSendWhatsApp = canSaveFollowUp && !!contact?.phone;
    const canSendEmail = canSaveFollowUp && !!contact?.email;
    const sortedFollowUps = useMemo(() => [...budget.followUps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [budget.followUps]);
    const sortedComments = useMemo(() => [...(budget.comments || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [budget.comments]);
    
    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50 p-2 sm:p-4" onClick={onClose}>
                <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col transform transition-all">
                    {/* Header */}
                    <div className="p-4 sm:p-6 flex justify-between items-start pb-4 border-b border-gray-200 dark:border-slate-700">
                        <div>
                             {isEditing ? (
                                <input type="text" value={editableTitle} onChange={e => setEditableTitle(e.target.value)} className="text-2xl font-bold bg-slate-100 dark:bg-slate-700 rounded-md p-1 -m-1" autoFocus/>
                            ) : (
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{budget.title}</h2>
                            )}
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mt-1">{client.name}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-400 mt-2">
                                <span className="flex items-center gap-1.5"><CalendarIcon className="w-4 h-4"/> <strong>Enviado em:</strong> {formatDisplayDate(budget.dateSent)}</span>
                                {budget.nextFollowUpDate && <span className="flex items-center gap-1.5"><ClockIcon className="w-4 h-4"/> <strong>Próximo Follow-up:</strong> {formatDisplayDate(budget.nextFollowUpDate)}</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                             {isEditing ? (
                                <>
                                    <button onClick={handleSaveEdit} className="p-2 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full"><CheckCircleIcon className="w-6 h-6"/></button>
                                    <button onClick={() => setIsEditing(false)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><XCircleIcon className="w-6 h-6"/></button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full"><PencilIcon className="w-5 h-5"/></button>
                            )}
                            <button onClick={onClose} className="p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full">
                                <XMarkIcon className="w-7 h-7" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-grow overflow-y-auto custom-scrollbar p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Left Column */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="border-b border-gray-200 dark:border-slate-700">
                                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                    <button onClick={() => setActiveTab('followup')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'followup' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                        Follow-ups
                                    </button>
                                    <button onClick={() => setActiveTab('comments')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm ${activeTab === 'comments' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                                        Comentários Internos
                                    </button>
                                </nav>
                            </div>
                            
                            {activeTab === 'followup' && (
                                <div className="space-y-6">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                        <h3 className="font-semibold text-lg mb-2 text-gray-700 dark:text-slate-300">Novo Follow-up</h3>
                                        <textarea value={newFollowUpNote} onChange={(e) => setNewFollowUpNote(e.target.value)} rows={4} placeholder="Digite sua anotação ou use um script..." className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"/>
                                        <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <select value={scriptCategory} onChange={e => {setScriptCategory(e.target.value as ScriptCategory); setSelectedScript(null);}} className="text-sm bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-lg py-1 px-2"><option value="">Usar script...</option>{scriptCategories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                                <select value={selectedScript?.id || ''} onChange={e => {const s = filteredScripts.find(fs => fs.id === e.target.value); if(s) { setSelectedScript(s); handleApplyScript(s.content); } else {setSelectedScript(null);}}} className="text-sm bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-lg py-1 px-2"><option value="">Selecione um script</option>{filteredScripts.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-end mt-4">
                                            <div className="flex-grow"><label className="text-xs font-medium text-gray-500 dark:text-slate-400">Próximo Contato (opcional)</label><input type="date" value={nextFollowUpDate || ''} onChange={(e) => setNextFollowUpDate(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm dark:[color-scheme:dark]"/></div>
                                            <button onClick={handleSaveFollowUp} disabled={!canSaveFollowUp} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center transition-colors text-sm"><PencilIcon className="w-4 h-4 mr-1.5"/> Salvar Nota</button>
                                            <button onClick={() => handleSendExternal('WhatsApp')} disabled={!canSendWhatsApp} title={!contact?.phone ? 'Contato sem telefone' : !canSaveFollowUp ? 'Digite uma mensagem' : 'Enviar via WhatsApp'} className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 dark:disabled:bg-green-800 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center transition-colors text-sm"><WhatsAppIcon className="w-4 h-4 mr-1.5"/> WhatsApp</button>
                                            <button onClick={() => handleSendExternal('Email')} disabled={!canSendEmail} title={!contact?.email ? 'Contato sem e-mail' : !canSaveFollowUp ? 'Digite uma mensagem' : 'Enviar via E-mail'} className="bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center transition-colors text-sm"><EnvelopeIcon className="w-4 h-4 mr-1.5"/> E-mail</button>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg mb-2 text-gray-700 dark:text-slate-300">Histórico de Follow-ups</h3>
                                        <div className="space-y-4">{sortedFollowUps.length > 0 ? sortedFollowUps.map(fu => (<div key={fu.id} className="border-l-4 border-gray-200 dark:border-slate-600 pl-4"><p className="text-sm font-semibold text-gray-500 dark:text-slate-400">{formatDisplayDate(fu.date)} {fu.status && <span className="text-xs font-bold bg-gray-200 dark:bg-slate-600 px-2 py-0.5 rounded-full ml-2">{fu.status}</span>}</p><p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap mt-1">{fu.notes}</p></div>)) : (<p className="text-gray-400 dark:text-slate-500 italic">Nenhum follow-up registrado.</p>)}</div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'comments' && (
                                <div className="space-y-6">
                                     <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                        <h3 className="font-semibold text-lg mb-2 text-gray-700 dark:text-slate-300">Novo Comentário</h3>
                                        <div className="relative">
                                            <textarea ref={commentTextareaRef} value={newComment} onChange={handleCommentChange} rows={4} placeholder="Digite um comentário. Use @ para mencionar um colega..." className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"/>
                                            {showMentions && (
                                                <div className="absolute bottom-full mb-1 w-full max-h-40 overflow-y-auto bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg z-10">
                                                    {mentionSuggestions.map(user => (<div key={user.id} onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(user);}} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 cursor-pointer text-sm font-semibold">{user.name}</div>))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end mt-2">
                                            <button onClick={handleSaveComment} disabled={!newComment.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors text-sm">Salvar Comentário</button>
                                        </div>
                                    </div>
                                     <div>
                                        <h3 className="font-semibold text-lg mb-2 text-gray-700 dark:text-slate-300">Comentários Internos</h3>
                                        <div className="space-y-4">{sortedComments.length > 0 ? sortedComments.map(c => (<div key={c.id} className="border-l-4 border-purple-200 dark:border-purple-700 pl-4"><p className="text-sm font-semibold text-gray-500 dark:text-slate-400"><strong>{c.userName}</strong> em {formatDisplayDate(c.createdAt)}</p><p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap mt-1">{c.text}</p></div>)) : (<p className="text-gray-400 dark:text-slate-500 italic">Nenhum comentário interno.</p>)}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column */}
                        <div className="md:col-span-1 space-y-4">
                             <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 space-y-3">
                                <div className="flex justify-between items-center"><span className={`px-3 py-1 text-sm font-bold rounded-full ${getStatusBadgeColor(budget.status)}`}>{budget.status}</span></div>
                                 {isEditing ? (<input type="text" value={editableValue} onChange={e => setEditableValue(formatCurrencyForInput(e.target.value))} className="text-3xl font-bold text-gray-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 p-1 -m-1 rounded-md w-full"/>) : (<p className="text-3xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2"><CurrencyDollarIcon className="w-7 h-7 text-green-500"/> {formatCurrency(budget.value)}</p>)}
                                {contact && (<div className="pt-3 border-t border-gray-200 dark:border-slate-600"><p className="font-bold text-gray-700 dark:text-slate-200">{contact.name}</p>{contact.email && <a href={`mailto:${contact.email}`} className="text-sm text-gray-500 dark:text-slate-400 hover:text-blue-600 flex items-center gap-1.5 truncate"><EnvelopeIcon className="w-4 h-4"/>{contact.email}</a>}{contact.phone && <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><PhoneIcon className="w-4 h-4"/>{contact.phone}</p>}</div>)}
                             </div>
                            {!isConfirmingWin && (
                                 <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 space-y-2">
                                    <h4 className="font-semibold text-gray-700 dark:text-slate-300 mb-2">Alterar Status</h4>
                                    <button onClick={() => onChangeStatus(budget.id, BudgetStatus.FOLLOWING_UP)} className="w-full text-left bg-yellow-100 hover:bg-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:hover:bg-yellow-900 dark:text-yellow-300 font-semibold p-2 rounded-md flex items-center gap-2 transition-colors"><ArrowPathIcon className="w-5 h-5"/> Em Follow-up</button>
                                    <button onClick={() => onChangeStatus(budget.id, BudgetStatus.ON_HOLD)} className="w-full text-left bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 font-semibold p-2 rounded-md flex items-center gap-2 transition-colors"><PauseCircleIcon className="w-5 h-5"/> Congelar</button>
                                    <button onClick={() => setIsConfirmingWin(true)} className="w-full text-left bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/50 dark:hover:bg-green-900 dark:text-green-300 font-semibold p-2 rounded-md flex items-center gap-2 transition-colors"><TrophyIcon className="w-5 h-5"/> Ganho/Faturado</button>
                                    <button onClick={() => setLostReasonModalOpen(true)} className="w-full text-left bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/50 dark:hover:bg-red-900 dark:text-red-300 font-semibold p-2 rounded-md flex items-center gap-2 transition-colors"><XCircleIcon className="w-5 h-5"/> Perdido</button>
                                </div>
                            )}
                            {isConfirmingWin && (<div className="bg-green-50 dark:bg-green-900/50 p-4 rounded-lg border border-green-200 dark:border-green-800"><h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Confirmar Valor de Fechamento</h4><input type="text" value={closingValue} onChange={e => setClosingValue(formatCurrencyForInput(e.target.value))} className="w-full bg-white dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg p-2 mb-3"/><div className="flex gap-2"><button onClick={() => onConfirmWin(budget.id, unmaskCurrency(closingValue))} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg">Confirmar</button><button onClick={() => setIsConfirmingWin(false)} className="w-full bg-transparent hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-200 font-semibold py-2 px-3 rounded-lg border border-green-300 dark:border-green-700">Cancelar</button></div></div>)}
                        </div>
                    </div>
                </div>
            </div>
            {isLostReasonModalOpen && (<LostReasonModal isOpen={isLostReasonModalOpen} onClose={() => setLostReasonModalOpen(false)} onConfirm={handleConfirmLoss}/>)}
        </>
    );
};
