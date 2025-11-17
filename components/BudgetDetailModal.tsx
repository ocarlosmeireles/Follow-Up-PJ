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
import LostReasonModal from './LostReasonModal';

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
    onAddFollowUp,
    onChangeStatus,
    onConfirmWin,
    onUpdateBudget,
    scripts,
}) => {
    const [newFollowUpNote, setNewFollowUpNote] = useState('');
    const [newFollowUpStatus, setNewFollowUpStatus] = useState<FollowUpStatus>(FollowUpStatus.WAITING_RESPONSE);
    const [nextFollowUpDate, setNextFollowUpDate] = useState<string | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [generatedScript, setGeneratedScript] = useState('');
    const [closingValue, setClosingValue] = useState('');
    const [isConfirmingWin, setIsConfirmingWin] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editableTitle, setEditableTitle] = useState(budget.title);
    const [editableValue, setEditableValue] = useState(formatCurrency(budget.value));
    const [isAIModalOpen, setAIModalOpen] = useState(false);
    
    const [scriptCategory, setScriptCategory] = useState<ScriptCategory>('Follow-up Pós-Envio');
    const [selectedScript, setSelectedScript] = useState<Script | null>(null);
    const [isLostReasonModalOpen, setLostReasonModalOpen] = useState(false);

    const filteredScripts = useMemo(() => scripts.filter(s => s.category === scriptCategory), [scripts, scriptCategory]);
    
    const modalRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (isOpen) {
            setNewFollowUpNote('');
            setNextFollowUpDate(null);
            setGeneratedScript('');
            setIsLoadingAI(false);
            setClosingValue(formatCurrency(budget.value));
            setIsConfirmingWin(false);
            setEditableTitle(budget.title);
            setEditableValue(formatCurrency(budget.value));
            setIsEditing(false);
            setScriptCategory('Follow-up Pós-Envio');
            setSelectedScript(null);
            setLostReasonModalOpen(false);
        }
    }, [isOpen, budget]);

    const handleConfirmLoss = (reason: string, notes: string) => {
        onUpdateBudget(budget.id, {
            status: BudgetStatus.LOST,
            lostReason: reason,
            lostNotes: notes,
            nextFollowUpDate: null // Clear next follow up when lost
        });
        setLostReasonModalOpen(false);
        onClose(); // Also close the main modal after confirming loss
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

    const handleGenerateScript = async () => {
        setIsLoadingAI(true);
        setGeneratedScript('');
        try {
            if (!process.env.API_KEY) throw new Error("A chave da API não foi configurada.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Gere um texto curto e amigável para um follow-up de orçamento.
Cliente: ${client.name}
Contato: ${contact?.name || 'Prezado(a)'}
Orçamento: ${budget.title}
Valor: ${formatCurrency(budget.value)}
Histórico: ${budget.followUps.length > 0 ? budget.followUps.map(f => f.notes).join(' | ') : 'Primeiro follow-up.'}
Objetivo: Manter a conversa ativa e buscar o próximo passo.
O tom deve ser profissional, mas pessoal.`;

            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setGeneratedScript(response.text || 'Não foi possível gerar um script.');
        } catch (error) {
            console.error(error);
            setGeneratedScript('Erro ao gerar script. Verifique sua chave de API.');
        } finally {
            setIsLoadingAI(false);
        }
    };

    const handleApplyScript = (content: string) => {
        let finalContent = content;
        if (contact?.name) finalContent = finalContent.replace(/\[Nome do Cliente\]/g, contact.name.split(' ')[0]);
        if (budget.title) finalContent = finalContent.replace(/\[Título da Proposta\]/g, `"${budget.title}"`);
        setNewFollowUpNote(finalContent);
        setGeneratedScript('');
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
    
    const canSaveFollowUp = newFollowUpNote.trim().length > 0;
    const canSendWhatsApp = canSaveFollowUp && !!contact?.phone;
    const canSendEmail = canSaveFollowUp && !!contact?.email;

    if (!isOpen) return null;
    
    const sortedFollowUps = [...budget.followUps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <>
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50 p-2 sm:p-4" onClick={onClose}>
                <div ref={modalRef} onClick={e => e.stopPropagation()} className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col transform transition-all">
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
                            {/* Follow-up form */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                <h3 className="font-semibold text-lg mb-2 text-gray-700 dark:text-slate-300">Novo Follow-up</h3>
                                 <textarea
                                    value={newFollowUpNote}
                                    onChange={(e) => setNewFollowUpNote(e.target.value)}
                                    rows={4}
                                    placeholder="Digite sua anotação ou gere um script com a IA..."
                                    className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {generatedScript && (
                                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-md">
                                        <p className="text-sm whitespace-pre-wrap text-blue-800 dark:text-blue-200">{generatedScript}</p>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => handleApplyScript(generatedScript)} className="text-sm bg-blue-500 text-white px-2 py-1 rounded">Aplicar</button>
                                            <button onClick={() => setGeneratedScript('')} className="text-sm bg-gray-200 px-2 py-1 rounded">Descartar</button>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2 items-center justify-between">
                                    <div className="flex flex-wrap gap-2 items-center">
                                         <button onClick={handleGenerateScript} disabled={isLoadingAI} className="text-sm bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold py-1 px-3 rounded-lg flex items-center gap-1.5 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                                            <SparklesIcon className={`w-4 h-4 ${isLoadingAI ? 'animate-pulse' : ''}`}/> {isLoadingAI ? 'Gerando...' : 'Gerar com IA'}
                                        </button>
                                        <select value={scriptCategory} onChange={e => {setScriptCategory(e.target.value as ScriptCategory); setSelectedScript(null);}} className="text-sm bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-lg py-1 px-2">
                                            {scriptCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <select value={selectedScript?.id || ''} onChange={e => {const s = filteredScripts.find(fs => fs.id === e.target.value); if(s) { setSelectedScript(s); handleApplyScript(s.content); } else {setSelectedScript(null);}}} className="text-sm bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-lg py-1 px-2">
                                            <option value="">Usar script...</option>
                                            {filteredScripts.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 items-end mt-4">
                                     <div className="flex-grow">
                                        <label className="text-xs font-medium text-gray-500 dark:text-slate-400">Próximo Contato (opcional)</label>
                                        <input type="date" value={nextFollowUpDate || ''} onChange={(e) => setNextFollowUpDate(e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm dark:[color-scheme:dark]"/>
                                    </div>
                                    <button onClick={handleSaveFollowUp} disabled={!canSaveFollowUp} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center transition-colors text-sm">
                                        <PencilIcon className="w-4 h-4 mr-1.5"/> Salvar Nota
                                    </button>
                                    <button onClick={() => handleSendExternal('WhatsApp')} disabled={!canSendWhatsApp} title={!contact?.phone ? 'Contato sem telefone' : !canSaveFollowUp ? 'Digite uma mensagem' : 'Enviar via WhatsApp'} className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 dark:disabled:bg-green-800 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center transition-colors text-sm">
                                        <WhatsAppIcon className="w-4 h-4 mr-1.5"/> WhatsApp
                                    </button>
                                    <button onClick={() => handleSendExternal('Email')} disabled={!canSendEmail} title={!contact?.email ? 'Contato sem e-mail' : !canSaveFollowUp ? 'Digite uma mensagem' : 'Enviar via E-mail'} className="bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center transition-colors text-sm">
                                        <EnvelopeIcon className="w-4 h-4 mr-1.5"/> E-mail
                                    </button>
                                </div>
                            </div>

                            {/* History */}
                            <div>
                                <h3 className="font-semibold text-lg mb-2 text-gray-700 dark:text-slate-300">Histórico de Follow-ups</h3>
                                <div className="space-y-4">
                                    {sortedFollowUps.length > 0 ? sortedFollowUps.map(fu => (
                                        <div key={fu.id} className="border-l-4 border-gray-200 dark:border-slate-600 pl-4">
                                            <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">{formatDisplayDate(fu.date)} {fu.status && <span className="text-xs font-bold bg-gray-200 dark:bg-slate-600 px-2 py-0.5 rounded-full ml-2">{fu.status}</span>}</p>
                                            <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap mt-1">{fu.notes}</p>
                                        </div>
                                    )) : (
                                        <p className="text-gray-400 dark:text-slate-500 italic">Nenhum follow-up registrado.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="md:col-span-1 space-y-4">
                             {/* Budget Info */}
                             <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className={`px-3 py-1 text-sm font-bold rounded-full ${getStatusBadgeColor(budget.status)}`}>{budget.status}</span>
                                     <button onClick={() => setAIModalOpen(true)} className="text-sm bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold py-1 px-3 rounded-lg flex items-center gap-1.5 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                                        <SparklesIcon className="w-4 h-4"/> Analisar
                                    </button>
                                </div>
                                 {isEditing ? (
                                    <input type="text" value={editableValue} onChange={e => setEditableValue(formatCurrencyForInput(e.target.value))} className="text-3xl font-bold text-gray-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 p-1 -m-1 rounded-md w-full"/>
                                ) : (
                                    <p className="text-3xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2"><CurrencyDollarIcon className="w-7 h-7 text-green-500"/> {formatCurrency(budget.value)}</p>
                                )}
                                {contact && (
                                    <div className="pt-3 border-t border-gray-200 dark:border-slate-600">
                                        <p className="font-bold text-gray-700 dark:text-slate-200">{contact.name}</p>
                                        {contact.email && <a href={`mailto:${contact.email}`} className="text-sm text-gray-500 dark:text-slate-400 hover:text-blue-600 flex items-center gap-1.5 truncate"><EnvelopeIcon className="w-4 h-4"/>{contact.email}</a>}
                                        {contact.phone && <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5"><PhoneIcon className="w-4 h-4"/>{contact.phone}</p>}
                                    </div>
                                )}
                             </div>
                            
                            {/* Actions */}
                            {!isConfirmingWin && (
                                 <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 space-y-2">
                                    <h4 className="font-semibold text-gray-700 dark:text-slate-300 mb-2">Alterar Status</h4>
                                    <button onClick={() => onChangeStatus(budget.id, BudgetStatus.FOLLOWING_UP)} className="w-full text-left bg-yellow-100 hover:bg-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:hover:bg-yellow-900 dark:text-yellow-300 font-semibold p-2 rounded-md flex items-center gap-2 transition-colors"><ArrowPathIcon className="w-5 h-5"/> Em Follow-up</button>
                                    <button onClick={() => onChangeStatus(budget.id, BudgetStatus.ON_HOLD)} className="w-full text-left bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 font-semibold p-2 rounded-md flex items-center gap-2 transition-colors"><PauseCircleIcon className="w-5 h-5"/> Congelar</button>
                                    <button onClick={() => setIsConfirmingWin(true)} className="w-full text-left bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/50 dark:hover:bg-green-900 dark:text-green-300 font-semibold p-2 rounded-md flex items-center gap-2 transition-colors"><TrophyIcon className="w-5 h-5"/> Ganho/Faturado</button>
                                    <button onClick={() => setLostReasonModalOpen(true)} className="w-full text-left bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900/50 dark:hover:bg-red-900 dark:text-red-300 font-semibold p-2 rounded-md flex items-center gap-2 transition-colors"><XCircleIcon className="w-5 h-5"/> Perdido</button>
                                </div>
                            )}
                            {isConfirmingWin && (
                                <div className="bg-green-50 dark:bg-green-900/50 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                    <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Confirmar Valor de Fechamento</h4>
                                    <input type="text" value={closingValue} onChange={e => setClosingValue(formatCurrencyForInput(e.target.value))} className="w-full bg-white dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg p-2 mb-3"/>
                                    <div className="flex gap-2">
                                        <button onClick={() => onConfirmWin(budget.id, unmaskCurrency(closingValue))} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg">Confirmar</button>
                                        <button onClick={() => setIsConfirmingWin(false)} className="w-full bg-transparent hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-200 font-semibold py-2 px-3 rounded-lg border border-green-300 dark:border-green-700">Cancelar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {isAIModalOpen && (
                <BudgetAIAnalysisModal 
                    isOpen={isAIModalOpen}
                    onClose={() => setAIModalOpen(false)}
                    budget={budget}
                    clientName={client.name}
                />
            )}
            {isLostReasonModalOpen && (
                <LostReasonModal
                    isOpen={isLostReasonModalOpen}
                    onClose={() => setLostReasonModalOpen(false)}
                    onConfirm={handleConfirmLoss}
                />
            )}
        </>
    );
};