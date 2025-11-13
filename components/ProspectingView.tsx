import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Prospect, ProspectingStage } from '../types';
import { PlusIcon, Cog6ToothIcon, AcademicCapIcon, ChatBubbleLeftRightIcon, EllipsisVerticalIcon, ClockIcon, ExclamationCircleIcon, SparklesIcon, CalendarIcon } from './icons';
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

    return (
        <div className="flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 flex-shrink-0 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)]">Funil de Prospecção</h2>
                    <p className="text-[var(--text-secondary)]">Arraste os cards para avançar os prospects no funil de vendas.</p>
                </div>
                 <div className="flex gap-4 self-start md:self-center">
                    <button onClick={() => setSettingsModalOpen(true)} className="bg-[var(--background-secondary)] hover:bg-[var(--background-secondary-hover)] text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg border border-[var(--border-secondary)] flex items-center transition-colors duration-200 shadow-sm"><Cog6ToothIcon className="w-5 h-5 mr-2" />Configurar Etapas</button>
                    <button onClick={onAddProspectClick} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm"><PlusIcon className="w-5 h-5 mr-2" />Novo Prospect</button>
                </div>
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
        </div>
    );
};

export default ProspectingView;