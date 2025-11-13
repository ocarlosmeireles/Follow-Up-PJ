import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Prospect, ProspectingStage } from '../types';
import { GoogleGenAI } from '@google/genai';
import { PlusIcon, Cog6ToothIcon, AcademicCapIcon, ChatBubbleLeftRightIcon, EllipsisVerticalIcon, ClockIcon, ExclamationCircleIcon, SparklesIcon, CalendarIcon, XMarkIcon } from './icons';
import StageSettingsModal from './StageSettingsModal';
import ProspectAIModal from './ProspectAIModal';

interface ProspectingViewProps {
  prospects: Prospect[];
  stages: ProspectingStage[];
  onAddProspectClick: () => void;
  onUpdateProspectStage: (prospectId: string, newStageId: string) => void;
  onUpdateStages: (stages: ProspectingStage[]) => void;
  onConvertProspect: (prospectId: string) => void;
}

type ToolsModalMode = 'radar' | 'list' | 'scripts';

// --- SUB-COMPONENTS ---
const DailySummary: React.FC = () => (
    <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)] shadow-sm">
        <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-2">📝 Resumo do que fazer no dia</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-[var(--text-secondary)]">
            <li>Prospectar 5 novos CNPJs</li>
            <li>Enviar 3 primeiras abordagens</li>
            <li>Retomar 3 leads que esfriaram</li>
            <li>Atualizar status de quem respondeu</li>
            <li>Evitar deixar prospect parado mais de 48h</li>
        </ul>
    </div>
);

const StrategicTools: React.FC<{ onToolClick: (mode: ToolsModalMode) => void }> = ({ onToolClick }) => (
    <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)] shadow-sm">
        <h3 className="font-semibold text-[var(--text-primary)] text-lg mb-3">Ferramentas Estratégicas</h3>
        <div className="space-y-2">
            <button onClick={() => onToolClick('radar')} className="w-full text-left p-2 rounded-md hover:bg-[var(--background-tertiary)] transition-colors text-sm text-[var(--text-secondary)]"><strong>Radar de Empresas (IA):</strong> Encontre novas oportunidades.</button>
            <button onClick={() => onToolClick('list')} className="w-full text-left p-2 rounded-md hover:bg-[var(--background-tertiary)] transition-colors text-sm text-[var(--text-secondary)]"><strong>Gerador de Listas (IA):</strong> Crie listas segmentadas.</button>
            <button onClick={() => onToolClick('scripts')} className="w-full text-left p-2 rounded-md hover:bg-[var(--background-tertiary)] transition-colors text-sm text-[var(--text-secondary)]"><strong>Scripts Inteligentes:</strong> Modelos de abordagem.</button>
        </div>
    </div>
);


const ProspectCard: React.FC<{ 
    prospect: Prospect; 
    onConvert: (id: string) => void; 
    onOpenAiModal: (prospect: Prospect, mode: 'research' | 'icebreaker' | 'strategy') => void;
    isDragging: boolean; 
}> = ({ prospect, onConvert, onOpenAiModal, isDragging }) => {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const isNextContactOverdue = useMemo(() => {
        if (!prospect.nextContactDate) return false;
        const today = new Date(); today.setHours(0,0,0,0);
        return new Date(prospect.nextContactDate) < today;
    }, [prospect.nextContactDate]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`bg-[var(--background-secondary)] p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing border border-[var(--border-secondary)] hover:border-[var(--accent-primary)] transition-all duration-200 group ${isDragging ? 'opacity-50 rotate-3 shadow-xl' : 'hover:-translate-y-1'}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-[var(--text-primary)] text-base truncate" title={prospect.company}>{prospect.company}</h4>
                    <p className="text-sm text-[var(--text-accent)] font-semibold mb-2 truncate" title={prospect.name}>{prospect.name}</p>
                </div>
                 <div className="relative flex-shrink-0" ref={menuRef}>
                    <button onClick={() => setMenuOpen(p => !p)} className="p-1 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--background-tertiary-hover)]"><EllipsisVerticalIcon className="w-5 h-5"/></button>
                    {isMenuOpen && (
                        <div className="absolute top-full right-0 mt-1 w-48 bg-[var(--background-secondary)] rounded-lg shadow-xl border border-[var(--border-primary)] z-10 p-1">
                             <button onClick={() => { onOpenAiModal(prospect, 'research'); setMenuOpen(false); }} className="w-full text-left flex items-center gap-2 p-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] rounded-md"><AcademicCapIcon className="w-4 h-4"/>Pesquisar</button>
                             <button onClick={() => { onOpenAiModal(prospect, 'icebreaker'); setMenuOpen(false); }} className="w-full text-left flex items-center gap-2 p-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] rounded-md"><ChatBubbleLeftRightIcon className="w-4 h-4"/>Sugerir</button>
                             <button onClick={() => { onOpenAiModal(prospect, 'strategy'); setMenuOpen(false); }} className="w-full text-left flex items-center gap-2 p-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] rounded-md"><SparklesIcon className="w-4 h-4"/>Estratégia</button>
                             <div className="my-1 h-px bg-[var(--border-primary)]"></div>
                             <button onClick={() => { onConvert(prospect.id); setMenuOpen(false); }} className="w-full text-left flex items-center gap-2 p-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md">Converter</button>
                        </div>
                    )}
                </div>
            </div>
           
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mt-2 pt-2 border-t border-[var(--border-primary)]">
                <div className={`flex items-center gap-1.5 font-semibold ${isNextContactOverdue ? 'text-red-500 animate-pulse' : ''}`} title="Próximo Contato">
                    <CalendarIcon className="w-4 h-4"/>
                    <span>{prospect.nextContactDate ? new Date(prospect.nextContactDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}</span>
                </div>
                {isNextContactOverdue && <ExclamationCircleIcon className="w-4 h-4 text-red-500" title="Contato Atrasado!"/>}
            </div>
        </div>
    );
};


// Main Component
const ProspectingView: React.FC<ProspectingViewProps> = ({ prospects, stages, onAddProspectClick, onUpdateProspectStage, onUpdateStages, onConvertProspect }) => {
    const [draggingOverColumn, setDraggingOverColumn] = useState<string | null>(null);
    const [draggingProspectId, setDraggingProspectId] = useState<string | null>(null);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const [aiModalState, setAiModalState] = useState<{ isOpen: boolean, prospect: Prospect | null, mode: 'research' | 'icebreaker' | 'strategy' | null }>({ isOpen: false, prospect: null, mode: null });
    const [toolsModal, setToolsModal] = useState<{ isOpen: boolean; mode: ToolsModalMode | null }>({ isOpen: false, mode: null });

    const prospectsByStage = useMemo(() => {
        const grouped: { [key: string]: Prospect[] } = {};
        stages.forEach(stage => { grouped[stage.id] = []; });
        prospects.forEach(prospect => {
            if (grouped[prospect.stageId]) grouped[prospect.stageId].push(prospect);
        });
        return grouped;
    }, [prospects, stages]);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
        e.preventDefault();
        const prospectId = e.dataTransfer.getData('prospectId');
        if (prospectId) onUpdateProspectStage(prospectId, stageId);
        setDraggingOverColumn(null);
    }
    
    const sortedStages = useMemo(() => [...stages].sort((a,b) => a.order - b.order), [stages]);
    
    const handleOpenAiModal = (prospect: Prospect, mode: 'research' | 'icebreaker' | 'strategy') => setAiModalState({ isOpen: true, prospect, mode });
    const handleCloseAiModal = () => setAiModalState({ isOpen: false, prospect: null, mode: null });
    const handleOpenToolsModal = (mode: ToolsModalMode) => setToolsModal({ isOpen: true, mode });

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 flex-shrink-0 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)]">Centro de Comando de Prospecção</h2>
                    <p className="text-[var(--text-secondary)]">Organize seu dia, encontre leads e avance no funil de vendas.</p>
                </div>
                 <div className="flex gap-4 self-start md:self-center">
                    <button onClick={() => setSettingsModalOpen(true)} className="bg-[var(--background-secondary)] hover:bg-[var(--background-secondary-hover)] text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg border border-[var(--border-secondary)] flex items-center transition-colors duration-200 shadow-sm"><Cog6ToothIcon className="w-5 h-5 mr-2" />Configurar Etapas</button>
                    <button onClick={onAddProspectClick} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm"><PlusIcon className="w-5 h-5 mr-2" />Novo Prospect</button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <DailySummary />
                <StrategicTools onToolClick={handleOpenToolsModal} />
            </div>

            <div className="flex gap-6 pb-4 flex-grow overflow-x-auto -mx-4 px-4">
                {sortedStages.map((stage, index) => {
                    const stageProspects = prospectsByStage[stage.id] || [];
                    return (
                        <div 
                            key={stage.id} 
                            onDragOver={(e) => { e.preventDefault(); setDraggingOverColumn(stage.id); }} 
                            onDrop={(e) => handleDrop(e, stage.id)} 
                            onDragLeave={() => setDraggingOverColumn(null)} 
                            className="flex-1 min-w-[300px] bg-[var(--background-tertiary)] rounded-lg p-3 flex flex-col transition-colors duration-200 animated-item"
                            style={{ animationDelay: `${index * 80}ms` }}
                        >
                            <div className="flex justify-between items-center mb-3 flex-shrink-0 px-1">
                                <h3 className="font-semibold text-lg text-[var(--text-primary)]">{stage.name}</h3>
                                <span className="text-sm font-bold bg-[var(--background-secondary)] text-[var(--text-secondary)] rounded-full px-2.5 py-0.5">{stageProspects.length}</span>
                            </div>
                            <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
                                {stageProspects.map(prospect => (
                                    <div key={prospect.id} draggable onDragStart={(e) => { e.dataTransfer.setData('prospectId', prospect.id); setDraggingProspectId(prospect.id); }} onDragEnd={() => setDraggingProspectId(null)} className="mb-3">
                                        <ProspectCard prospect={prospect} onConvert={onConvertProspect} onOpenAiModal={handleOpenAiModal} isDragging={draggingProspectId === prospect.id}/>
                                    </div>
                                ))}
                                {draggingOverColumn === stage.id && (<div className="h-20 border-2 border-dashed border-[var(--border-secondary)] rounded-lg bg-[var(--background-tertiary-hover)]"></div>)}
                            </div>
                        </div>
                    );
                })}
            </div>
            <StageSettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} stages={stages} onSave={onUpdateStages} />
            {aiModalState.isOpen && aiModalState.prospect && <ProspectAIModal isOpen={aiModalState.isOpen} onClose={handleCloseAiModal} prospect={aiModalState.prospect} mode={aiModalState.mode!} />}
            {toolsModal.isOpen && <ToolsAIModal isOpen={toolsModal.isOpen} mode={toolsModal.mode} onClose={() => setToolsModal({isOpen: false, mode: null})} />}
        </div>
    );
};


// --- AI Tools Modal ---
const ToolsAIModal: React.FC<{ isOpen: boolean; mode: ToolsModalMode | null; onClose: () => void; }> = ({ isOpen, mode, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');
    const [input, setInput] = useState('');

    const config = {
        radar: { title: "Radar de Empresas", description: "Descreva seu perfil de cliente ideal (segmento, localização, porte) para a IA sugerir empresas.", placeholder: "Ex: Empresas de tecnologia em São Paulo com mais de 100 funcionários." },
        list: { title: "Gerador de Listas", description: "Insira um segmento para a IA gerar uma lista de leads qualificados.", placeholder: "Ex: Construtoras no Rio de Janeiro" },
        scripts: { title: "Scripts Inteligentes", description: "A IA irá gerar modelos de scripts de abordagem para diversas situações.", showDefault: true },
    };
    
    const generateContent = async (promptText: string) => {
        setLoading(true); setResult(''); setError('');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: promptText });
            setResult(response.text || '');
        } catch (err) { setError("Falha ao gerar conteúdo. Tente novamente."); } finally { setLoading(false); }
    };
    
    const handleSubmit = () => {
        if (!mode || (mode !== 'scripts' && !input)) return;
        let prompt;
        switch (mode) {
            case 'radar': prompt = `Aja como um especialista em prospecção B2B. Sugira 5 empresas que se encaixam neste perfil: "${input}". Forneça nome, site (se possível) e um breve motivo para a sugestão.`; break;
            case 'list': prompt = `Crie uma lista de 5 leads qualificados para o segmento: "${input}". Para cada um, sugira: Nome da Empresa, CNPJ (fictício, se necessário), e um possível contato ou cargo a ser procurado.`; break;
            case 'scripts': prompt = `Crie 3 modelos de scripts de abordagem para prospecção: 1. Primeiro contato por e-mail (frio). 2. Follow-up por WhatsApp após 2 dias sem resposta. 3. E-mail de reativação para um lead que sumiu há 3 semanas.`; break;
            default: return;
        }
        generateContent(prompt);
    };

    useEffect(() => {
        if (isOpen && mode === 'scripts') {
            handleSubmit();
        }
    }, [isOpen, mode]);

    if (!isOpen || !mode) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-[var(--background-secondary)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{config[mode].title}</h2>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-[var(--text-tertiary)]"/></button>
                </div>
                {mode !== 'scripts' && (
                    <div className="mb-4">
                        <p className="text-sm text-[var(--text-secondary)] mb-2">{config[mode].description}</p>
                        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder={config[mode].placeholder} className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-md p-2 text-sm" rows={3}></textarea>
                    </div>
                )}
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 bg-[var(--background-tertiary)] p-4 rounded-md">
                    {loading && <p>Gerando com IA...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {result && <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{result}</div>}
                </div>
                 {mode !== 'scripts' && <button onClick={handleSubmit} disabled={loading} className="mt-4 w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 rounded-lg disabled:opacity-50">Gerar</button>}
            </div>
        </div>
    );
};

export default ProspectingView;