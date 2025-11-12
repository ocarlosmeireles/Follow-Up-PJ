import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Budget, Client, FollowUp, Contact } from '../types';
import { BudgetStatus } from '../types';
import { XMarkIcon, CheckCircleIcon, XCircleIcon, CalendarIcon, ArrowPathIcon, WhatsAppIcon, MicrophoneIcon, StopCircleIcon, PlayCircleIcon, TrashIcon, PauseCircleIcon, UserIcon, SparklesIcon } from './icons';

interface BudgetDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    budget: Budget;
    client: Client;
    contact: Contact;
    onAddFollowUp: (budgetId: string, followUp: Omit<FollowUp, 'id'>, nextFollowUpDate: string | null) => void;
    onChangeStatus: (budgetId: string, status: BudgetStatus) => void;
}

const formatFollowUpTimestamp = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (dateString.includes('T')) {
        // It's a full ISO string, format with time
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
        }).replace(',', ' às');
    } else {
        // It's just a date string 'YYYY-MM-DD'
        const [year, month, day] = dateString.split('-').map(Number);
        // To prevent timezone issues with new Date('YYYY-MM-DD')
        const utcDate = new Date(Date.UTC(year, month - 1, day));
        return utcDate.toLocaleDateString('pt-BR', {timeZone: 'UTC'});
    }
};


const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const cleanPhoneNumber = (phone: string) => {
    return phone.replace(/\D/g, '');
};

const isPhoneNumber = (contact: string) => {
    const cleaned = cleanPhoneNumber(contact);
    return cleaned.length >= 10 && /^\d+$/.test(cleaned);
};

const today = new Date().toISOString().split('T')[0];

const BudgetDetailModal: React.FC<BudgetDetailModalProps> = ({ isOpen, onClose, budget, client, contact, onAddFollowUp, onChangeStatus }) => {
    const [notes, setNotes] = useState('');
    const [nextDate, setNextDate] = useState('');
    const [includeTime, setIncludeTime] = useState(true);
    
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
            setIncludeTime(true);
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

        const followUpDate = includeTime ? new Date().toISOString() : new Date().toISOString().split('T')[0];
        const followUpData: Omit<FollowUp, 'id'> = { date: followUpDate, notes };

        if (audioUrl) {
            followUpData.audioUrl = audioUrl;
        }

        onAddFollowUp(budget.id, followUpData, nextDate || null);
        
        // Reset state
        setNotes('');
        setNextDate('');
        setAudioUrl(null);
        setRecordingStatus('idle');
        setIncludeTime(true);
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
                ? budget.followUps.map(f => `- ${formatFollowUpTimestamp(f.date)}: ${f.notes}`).join('\n')
                : 'Nenhum contato anterior registrado.';
    
            const prompt = `Gere um e-mail de follow-up para o orçamento '${budget.title}' no valor de ${formatCurrency(budget.value)}, enviado para ${contact.name} da empresa ${client.name}.

O status atual do orçamento é: '${budget.status}'.

Histórico de contatos anteriores:
${history}

O objetivo do e-mail é reengajar o cliente, entender se há alguma dúvida e gentilmente buscar os próximos passos. Mantenha o e-mail conciso e termine com uma pergunta clara para incentivar uma resposta. Não inclua placeholders como '[Seu Nome]' ou '[Sua Empresa]', apenas o corpo do e-mail. Comece com uma saudação como "Olá ${contact.name}," ou "Prezado(a) ${contact.name},".`;
    
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: "Você é um assistente de vendas especialista em CRM e follow-ups. Seu tom é profissional, mas amigável e proativo. Escreva em português do Brasil.",
                }
            });
    
            setNotes(response.text);
    
        } catch (error) {
            console.error("Erro ao gerar e-mail com IA:", error);
            alert("Ocorreu um erro ao gerar o e-mail. Verifique o console para mais detalhes e tente novamente.");
        } finally {
            setIsGeneratingEmail(false);
        }
    };
    
    const isFinalStatus = budget.status === BudgetStatus.WON || budget.status === BudgetStatus.LOST;
    const contactPhone = contact?.phone || '';
    const canContactOnWhatsApp = isPhoneNumber(contactPhone);

    const handleSendWhatsApp = () => {
        if (!canContactOnWhatsApp) return;

        const phoneNumber = `55${cleanPhoneNumber(contactPhone)}`;
        const message = `Olá ${contact.name}, tudo bem?\n\nReferente à proposta *${budget.title}* para a empresa ${client.name}.\n\n*Valor:* ${formatCurrency(budget.value)}\n\nQualquer dúvida, estou à disposição!`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl m-4 max-h-[90vh] flex flex-col transform transition-all">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{budget.title}</h2>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-400 mt-1">
                           <span className="text-blue-600 dark:text-blue-400 font-semibold">{client.name}</span>
                           <span className="flex items-center gap-1.5"><UserIcon className="w-4 h-4 text-gray-400"/> {contact.name}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                            <p className="text-sm text-gray-500 dark:text-slate-400">Valor</p>
                            <p className="font-semibold text-lg text-gray-800 dark:text-slate-100">{formatCurrency(budget.value)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                            <label htmlFor="budget-status" className="text-sm text-gray-500 dark:text-slate-400 block mb-1">Status</label>
                            <select
                                id="budget-status"
                                value={budget.status}
                                onChange={(e) => onChangeStatus(budget.id, e.target.value as BudgetStatus)}
                                className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-800 dark:text-slate-100 font-semibold focus:ring-blue-500 focus:border-blue-500"
                            >
                                {Object.values(BudgetStatus).map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                         <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                            <p className="text-sm text-gray-500 dark:text-slate-400">Enviado em</p>
                            <p className="font-semibold text-lg text-gray-800 dark:text-slate-100">{formatDate(budget.dateSent)}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                            <p className="text-sm text-gray-500 dark:text-slate-400">Próximo Contato</p>
                            <p className="font-semibold text-lg text-gray-800 dark:text-slate-100">{formatDate(budget.nextFollowUpDate || '')}</p>
                        </div>
                    </div>

                    {budget.observations && (
                        <div className="mb-6">
                             <h3 className="font-semibold text-lg mb-2 text-gray-700 dark:text-slate-300">Observações</h3>
                             <div className="bg-yellow-50 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800/50 text-sm">
                                {budget.observations}
                             </div>
                        </div>
                    )}
                    
                    <div className="mb-6">
                        <h3 className="font-semibold text-lg mb-2 text-gray-700 dark:text-slate-300 flex items-center"><ArrowPathIcon className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400"/> Histórico de Follow-ups</h3>
                        <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {budget.followUps.length > 0 ? budget.followUps.slice().reverse().map(fu => (
                                <div key={fu.id} className="bg-gray-100 dark:bg-slate-700 p-3 rounded-lg border border-gray-200 dark:border-slate-600">
                                    <p className="font-semibold text-sm text-gray-600 dark:text-slate-400">{formatFollowUpTimestamp(fu.date)}</p>
                                    {fu.notes && <p className="text-gray-700 dark:text-slate-300">{fu.notes}</p>}
                                    {fu.audioUrl && <audio controls src={fu.audioUrl} className="w-full mt-2 h-10"></audio>}
                                </div>
                            )) : <p className="text-gray-400 dark:text-slate-500 italic">Nenhum follow-up registrado.</p>}
                        </div>
                    </div>

                    {!isFinalStatus && (
                         <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                            <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-slate-200">Adicionar Novo Follow-up</h3>
                            <div className="space-y-4">
                                <textarea 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)} 
                                    rows={5} 
                                    placeholder="Descreva o contato com o cliente ou gere um e-mail com IA..." 
                                    className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
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
                                 <p className="text-xs text-center text-gray-500 dark:text-slate-500 -mt-2">IA pode cometer erros. Verifique fatos importantes.</p>


                                <div className="flex flex-col sm:flex-row gap-4 items-end">
                                     <div className="flex-grow">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Próximo Follow-up</label>
                                        <input 
                                            type="date" 
                                            value={nextDate} 
                                            onChange={e => setNextDate(e.target.value)}
                                            min={today}
                                            className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500 dark:[color-scheme:dark]"
                                        />
                                    </div>
                                    <div className="flex items-center mb-2">
                                        <input
                                            type="checkbox"
                                            id="includeTime"
                                            checked={includeTime}
                                            onChange={(e) => setIncludeTime(e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 dark:border-slate-500 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="includeTime" className="ml-2 block text-sm text-gray-700 dark:text-slate-300">
                                            Incluir horário
                                        </label>
                                    </div>
                                    <div className="w-full sm:w-auto">
                                        <button onClick={handleAddFollowUp} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Registrar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row-reverse items-center justify-start gap-3">
                    <div className="flex w-full sm:w-auto sm:space-x-4 space-x-2">
                        <button onClick={() => onChangeStatus(budget.id, BudgetStatus.WON)} className="flex-1 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg">
                            <CheckCircleIcon className="w-5 h-5 mr-2" /> Ganho
                        </button>
                        <button onClick={() => onChangeStatus(budget.id, BudgetStatus.LOST)} className="flex-1 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">
                            <XCircleIcon className="w-5 h-5 mr-2" /> Perdido
                        </button>
                    </div>
                     <button onClick={() => onChangeStatus(budget.id, BudgetStatus.ON_HOLD)} className="flex items-center justify-center bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-800 dark:text-slate-100 font-bold py-2 px-4 rounded-lg w-full sm:w-auto">
                        <PauseCircleIcon className="w-5 h-5 mr-2" /> Congelar
                    </button>
                    {canContactOnWhatsApp && (
                        <button 
                            onClick={handleSendWhatsApp} 
                            className="flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg w-full sm:w-auto transition-colors"
                        >
                            <WhatsAppIcon className="w-5 h-5 mr-2" /> Enviar via WhatsApp
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BudgetDetailModal;
