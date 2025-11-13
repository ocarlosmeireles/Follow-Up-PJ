import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Budget, Client, FollowUp, Contact } from '../types';
import { BudgetStatus } from '../types';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, ArrowPathIcon, WhatsAppIcon, MicrophoneIcon, StopCircleIcon, TrashIcon, PauseCircleIcon, UserIcon, SparklesIcon } from './icons';

interface BudgetDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    budget: Budget;
    client: Client;
    contact?: Contact;
    onAddFollowUp: (budgetId: string, followUp: Omit<FollowUp, 'id'>, nextFollowUpDate: string | null) => void;
    onChangeStatus: (budgetId: string, status: BudgetStatus) => void;
}

const formatDisplayDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data inválida';

        // Check if time is specified (not midnight) or if 'T' is in the original string
        const hasTime = dateString.includes('T');

        if (hasTime) {
            return date.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
                timeZone: 'America/Sao_Paulo' // Be explicit to avoid browser inconsistencies
            }).replace(',', ' às');
        } else {
            // Handles 'YYYY-MM-DD' correctly by treating it as UTC to avoid timezone shifts
            const [year, month, day] = dateString.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day));
            return utcDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        }
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
  return <span className={`px-3 py-1 text-sm font-bold rounded-full ${styles[status] || styles[BudgetStatus.ON_HOLD]}`}>{status}</span>;
}

const InfoPill: React.FC<{label: string, value: string, icon?: React.ReactNode}> = ({label, value, icon}) => (
    <div className="bg-[var(--background-tertiary)] p-3 rounded-lg border border-[var(--border-secondary)]">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-1">
            {icon}
            <span>{label}</span>
        </div>
        <p className="font-semibold text-lg text-[var(--text-primary)]">{value}</p>
    </div>
);

const BudgetDetailModal: React.FC<BudgetDetailModalProps> = ({ isOpen, onClose, budget, client, contact, onAddFollowUp, onChangeStatus }) => {
    const [notes, setNotes] = useState('');
    const [nextFollowUpDate, setNextFollowUpDate] = useState('');
    const [nextFollowUpTime, setNextFollowUpTime] = useState('');
    
    // Audio recording state
    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'recorded'>('idle');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // AI Email Generation
    const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

    useEffect(() => {
        // Cleanup audio URL on close
        if (!isOpen) {
            if(audioUrl) URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
            setRecordingStatus('idle');
        }
    }, [isOpen, audioUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setRecordingStatus('recording');
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                setRecordingStatus('recorded');
                audioChunksRef.current = [];
                 // Stop all tracks to turn off the microphone indicator
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorderRef.current.start();
        } catch (err) {
            console.error("Error starting recording:", err);
            alert("Não foi possível iniciar a gravação. Verifique as permissões do microfone.");
            setRecordingStatus('idle');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
    };
    
    const deleteAudio = () => {
        if(audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setRecordingStatus('idle');
    }

    const handleAddFollowUp = () => {
        if (!notes && !audioUrl) {
            alert('Por favor, adicione uma nota de texto ou áudio ao follow-up.');
            return;
        }

        const followUpDate = new Date().toISOString();
        const followUpData: Omit<FollowUp, 'id'> = { date: followUpDate, notes };

        if (audioUrl) {
            followUpData.audioUrl = audioUrl;
        }

        let combinedNextDate: string | null = nextFollowUpDate || null;
        if (combinedNextDate && nextFollowUpTime) {
            combinedNextDate = `${nextFollowUpDate}T${nextFollowUpTime}`;
        }

        onAddFollowUp(budget.id, followUpData, combinedNextDate);
        
        // Reset state
        setNotes('');
        setNextFollowUpDate('');
        setNextFollowUpTime('');
        setAudioUrl(null);
        setRecordingStatus('idle');
    };

    const handleGenerateEmail = async () => {
        setIsGeneratingEmail(true);
        try {
            if (!process.env.API_KEY) {
                alert('A chave de API do Gemini não foi configurada.');
                return;
            }
    
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
                config: {
                    systemInstruction: "Você é um assistente de vendas especialista em CRM e follow-ups. Seu tom é profissional, mas amigável e proativo. Escreva em português do Brasil.",
                }
            });
    
            setNotes(response.text || '');
    
        } catch (error) {
            console.error("Erro ao gerar e-mail com IA:", error);
            alert("Ocorreu um erro ao gerar o e-mail. Verifique o console para mais detalhes e tente novamente.");
        } finally {
            setIsGeneratingEmail(false);
        }
    };
    
    const isFinalStatus = [BudgetStatus.INVOICED, BudgetStatus.LOST].includes(budget.status);
    const contactPhone = contact?.phone || '';
    const canContactOnWhatsApp = isPhoneNumber(contactPhone);

    const handleSendWhatsApp = () => {
        if (!canContactOnWhatsApp || !contact) return;

        const phoneNumber = `55${cleanPhoneNumber(contactPhone)}`;
        const message = `Olá ${contact.name}, tudo bem?\n\nReferente à proposta *${budget.title}* para a empresa ${client.name}.\n\n*Valor:* ${formatCurrency(budget.value)}\n\nQualquer dúvida, estou à disposição!`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 flex justify-center items-center z-50 p-4">
            <div className="bg-[var(--background-secondary)] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col transform transition-all">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-[var(--border-primary)] flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--text-primary)]">{budget.title}</h2>
                        <p className="text-md text-[var(--text-accent)] font-semibold">{client.name}</p>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{client.cnpj || 'CNPJ não cadastrado'}</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                        <XMarkIcon className="w-7 h-7" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
                    {/* Main Content (Left) */}
                    <div className="lg:col-span-3 space-y-6">
                        {!isFinalStatus && (
                         <div className="bg-[var(--background-secondary-hover)] p-4 rounded-lg border border-[var(--border-primary)]">
                            <h3 className="font-semibold text-lg mb-3 text-[var(--text-primary)]">Adicionar Novo Follow-up</h3>
                            <div className="space-y-4">
                                <textarea 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)} 
                                    rows={5} 
                                    placeholder="Descreva o contato com o cliente ou gere um e-mail com IA..." 
                                    className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-lg p-2 text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                                />

                                <div className="flex items-center flex-wrap gap-4">
                                    {recordingStatus === 'idle' && (
                                        <button onClick={startRecording} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold py-2 px-3 rounded-lg bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900 transition">
                                            <MicrophoneIcon className="w-5 h-5" /> Gravar Áudio
                                        </button>
                                    )}
                                    {recordingStatus === 'recording' && (
                                        <button onClick={stopRecording} className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold py-2 px-3 rounded-lg bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900 transition animate-pulse">
                                            <StopCircleIcon className="w-5 h-5" /> Parar Gravação
                                        </button>
                                    )}
                                    {recordingStatus === 'recorded' && audioUrl && (
                                        <div className="flex items-center gap-2 bg-gray-200 dark:bg-slate-700 rounded-lg p-2 flex-grow">
                                            <audio controls src={audioUrl} className="h-8 flex-grow"></audio>
                                            <button onClick={deleteAudio} className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-1">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex-grow"></div>
                                    
                                     <button 
                                        onClick={handleGenerateEmail}
                                        disabled={isGeneratingEmail}
                                        className="flex items-center gap-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-semibold py-2 px-3 rounded-lg bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-wait transition"
                                    >
                                        {isGeneratingEmail ? (
                                            <svg className="animate-spin h-5 w-5 text-purple-600 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <SparklesIcon className="w-5 h-5" />
                                        )}
                                        <span className="ml-1">{isGeneratingEmail ? 'Gerando...' : 'Gerar E-mail com IA'}</span>
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-end gap-4">
                                    <div className="flex-grow min-w-[150px]">
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Próximo Follow-up</label>
                                        <input 
                                            type="date" 
                                            value={nextFollowUpDate} 
                                            onChange={e => {
                                                setNextFollowUpDate(e.target.value);
                                                if (e.target.value && !nextFollowUpTime) {
                                                    setNextFollowUpTime('09:00');
                                                } else if (!e.target.value) {
                                                    setNextFollowUpTime('');
                                                }
                                            }}
                                            min={today}
                                            className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-lg p-2 text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] dark:[color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="flex-grow min-w-[120px]">
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Horário</label>
                                        <input 
                                            type="time" 
                                            value={nextFollowUpTime} 
                                            onChange={e => setNextFollowUpTime(e.target.value)}
                                            disabled={!nextFollowUpDate}
                                            className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-lg p-2 text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] dark:[color-scheme:dark] disabled:bg-[var(--background-tertiary)] disabled:dark:bg-slate-800"
                                        />
                                    </div>
                                    <div className="flex-shrink-0">
                                        <button onClick={handleAddFollowUp} className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg">Registrar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        )}
                        <div>
                            <h3 className="font-semibold text-lg mb-2 text-[var(--text-primary)] flex items-center"><ArrowPathIcon className="w-5 h-5 mr-2 text-[var(--text-accent)]"/> Histórico de Follow-ups</h3>
                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                {budget.followUps.length > 0 ? budget.followUps.slice().reverse().map(fu => (
                                    <div key={fu.id} className="bg-[var(--background-tertiary)] p-3 rounded-lg border border-[var(--border-secondary)]">
                                        <p className="font-semibold text-sm text-[var(--text-secondary)]">{formatDisplayDate(fu.date)}</p>
                                        {fu.notes && <p className="text-[var(--text-primary)] whitespace-pre-wrap">{fu.notes}</p>}
                                        {fu.audioUrl && <audio controls src={fu.audioUrl} className="w-full mt-2 h-10"></audio>}
                                    </div>
                                )) : <p className="text-gray-400 dark:text-slate-500 italic text-center p-4">Nenhum follow-up registrado.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar (Right) */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-[var(--background-secondary-hover)] p-4 rounded-lg border border-[var(--border-primary)]">
                            <h3 className="font-semibold text-lg mb-3 text-[var(--text-primary)]">Detalhes do Orçamento</h3>
                            <div className="space-y-3">
                                <div className="bg-[var(--background-tertiary)] p-3 rounded-lg border border-[var(--border-secondary)]">
                                    <label htmlFor="budget-status" className="text-sm text-[var(--text-secondary)] block mb-1">Status</label>
                                    <div className="flex items-center gap-4">
                                        {getStatusPill(budget.status)}
                                        <select
                                            id="budget-status"
                                            value={budget.status}
                                            onChange={(e) => onChangeStatus(budget.id, e.target.value as BudgetStatus)}
                                            className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-lg p-2 text-[var(--text-primary)] font-semibold focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] text-sm"
                                        >
                                            {Object.values(BudgetStatus).map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                   <InfoPill label="Valor" value={`R$ ${formatCurrency(budget.value)}`} />
                                   <InfoPill label="Enviado em" value={formatDisplayDate(budget.dateSent)} />
                                   <InfoPill label="Próximo Contato" value={formatDisplayDate(budget.nextFollowUpDate)} />
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-[var(--background-secondary-hover)] p-4 rounded-lg border border-[var(--border-primary)]">
                             <h3 className="font-semibold text-lg mb-3 text-[var(--text-primary)]">Informações do Contato</h3>
                             <div className="space-y-2 text-sm">
                                <p><strong className="text-[var(--text-secondary)] w-20 inline-block">Comprador:</strong> <span className="text-[var(--text-primary)] font-semibold">{contact?.name || 'N/A'}</span></p>
                                {canContactOnWhatsApp && (
                                     <button 
                                        onClick={handleSendWhatsApp} 
                                        className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg w-full transition-colors"
                                    >
                                        <WhatsAppIcon className="w-5 h-5" /> Contatar via WhatsApp
                                    </button>
                                )}
                             </div>
                        </div>

                        {budget.observations && (
                            <div className="bg-[var(--background-secondary-hover)] p-4 rounded-lg border border-[var(--border-primary)]">
                                <h3 className="font-semibold text-lg mb-2 text-[var(--text-primary)]">Observações</h3>
                                <div className="bg-yellow-50 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800/50 text-sm">
                                    {budget.observations}
                                </div>
                            </div>
                        )}
                        
                        <div className="space-y-2 pt-4 border-t border-[var(--border-primary)]">
                            <button onClick={() => onChangeStatus(budget.id, BudgetStatus.INVOICED)} className="w-full flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg">
                                <CheckCircleIcon className="w-5 h-5 mr-2" /> Ganho
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => onChangeStatus(budget.id, BudgetStatus.LOST)} className="flex-1 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">
                                    <XCircleIcon className="w-5 h-5 mr-2" /> Perdido
                                </button>
                                <button onClick={() => onChangeStatus(budget.id, BudgetStatus.ON_HOLD)} className="flex-1 flex items-center justify-center bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-800 dark:text-slate-100 font-bold py-2 px-4 rounded-lg">
                                    <PauseCircleIcon className="w-5 h-5 mr-2" /> Congelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetDetailModal;