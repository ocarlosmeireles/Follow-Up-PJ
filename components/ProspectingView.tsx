import React, { useState, useMemo } from 'react';
import type { Prospect, ProspectingStage } from '../types';
import { PlusIcon, Cog6ToothIcon, WhatsAppIcon, EnvelopeIcon, PhoneIcon, AcademicCapIcon, ChatBubbleLeftRightIcon } from './icons';
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

const cleanPhoneNumber = (phone: string) => {
    return phone.replace(/\D/g, '');
};

const ProspectCard: React.FC<{ prospect: Prospect; onConvert: (id: string) => void; onOpenAiModal: (prospect: Prospect, mode: 'research' | 'icebreaker') => void; }> = ({ prospect, onConvert, onOpenAiModal }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('prospectId', prospect.id);
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="bg-[var(--background-secondary)] p-3 rounded-lg shadow-sm mb-3 cursor-grab active:cursor-grabbing border border-[var(--border-secondary)] hover:border-[var(--accent-primary)] transition-all duration-200 group"
        >
            <h4 className="font-bold text-[var(--text-primary)] text-base truncate">{prospect.name}</h4>
            <p className="text-sm text-[var(--text-accent)] font-semibold mb-2 truncate">{prospect.company}</p>
            
            <div className="space-y-1.5 text-sm text-[var(--text-secondary)] my-2">
                {prospect.phone && (
                    <div className="flex items-center gap-2">
                        <PhoneIcon className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                        <span className="truncate">{prospect.phone}</span>
                         <a
                            href={`https://wa.me/55${cleanPhoneNumber(prospect.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Contatar no WhatsApp"
                            className="text-green-500 hover:text-green-600 transition-colors ml-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <WhatsAppIcon className="w-4 h-4" />
                        </a>
                    </div>
                )}
                {prospect.email && (
                    <div className="flex items-center gap-2">
                        <EnvelopeIcon className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                        <span className="truncate" title={prospect.email}>{prospect.email}</span>
                    </div>
                )}
            </div>
           
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-primary)]">
                 <div className="flex items-center gap-2">
                    <button onClick={() => onOpenAiModal(prospect, 'research')} title="Pesquisar empresa com IA" className="p-1.5 text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/50 hover:bg-sky-200 dark:hover:bg-sky-900 rounded-full transition-colors"><AcademicCapIcon className="w-4 h-4"/></button>
                    <button onClick={() => onOpenAiModal(prospect, 'icebreaker')} title="Sugerir abordagem com IA" className="p-1.5 text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50 hover:bg-violet-200 dark:hover:bg-violet-900 rounded-full transition-colors"><ChatBubbleLeftRightIcon className="w-4 h-4"/></button>
                 </div>
                 <button
                    onClick={() => onConvert(prospect.id)}
                    className="text-xs bg-green-500 hover:bg-green-600 text-white font-semibold py-1.5 px-2.5 rounded-md transition-colors"
                >
                    Converter
                </button>
            </div>
        </div>
    );
};


const ProspectingView: React.FC<ProspectingViewProps> = ({ prospects, stages, onAddProspectClick, onUpdateProspectStage, onUpdateStages, onConvertProspect }) => {
    const [draggingOverColumn, setDraggingOverColumn] = useState<string | null>(null);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const [aiModalState, setAiModalState] = useState<{ isOpen: boolean, prospect: Prospect | null, mode: 'research' | 'icebreaker' | null }>({ isOpen: false, prospect: null, mode: null });

    const prospectsByStage = useMemo(() => {
        const grouped: { [key: string]: Prospect[] } = {};
        stages.forEach(stage => {
            grouped[stage.id] = [];
        });
        prospects.forEach(prospect => {
            if (grouped[prospect.stageId]) {
                grouped[prospect.stageId].push(prospect);
            }
        });
        return grouped;
    }, [prospects, stages]);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
        e.preventDefault();
        const prospectId = e.dataTransfer.getData('prospectId');
        const prospect = prospects.find(p => p.id === prospectId);
        
        if (prospectId && prospect && prospect.stageId !== stageId) {
            onUpdateProspectStage(prospectId, stageId);
        }
        setDraggingOverColumn(null);
    }
    
    const sortedStages = useMemo(() => [...stages].sort((a,b) => a.order - b.order), [stages]);
    
    const handleOpenAiModal = (prospect: Prospect, mode: 'research' | 'icebreaker') => {
        setAiModalState({ isOpen: true, prospect, mode });
    };

    const handleCloseAiModal = () => {
        setAiModalState({ isOpen: false, prospect: null, mode: null });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Funil de Prospecção</h2>
                    <p className="text-[var(--text-secondary)]">Arraste os prospects entre as etapas para avançar no funil.</p>
                </div>
                 <div className="flex gap-4">
                    <button
                        onClick={() => setSettingsModalOpen(true)}
                        className="bg-[var(--background-secondary)] hover:bg-[var(--background-secondary-hover)] text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg border border-[var(--border-secondary)] flex items-center transition-colors duration-200 shadow-sm"
                    >
                        <Cog6ToothIcon className="w-5 h-5 mr-2" />
                        Configurar Etapas
                    </button>
                    <button
                        onClick={onAddProspectClick}
                        className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Novo Prospect
                    </button>
                </div>
            </div>
            <div className="flex gap-6 pb-4 flex-grow overflow-x-auto">
                {sortedStages.map(stage => (
                    <div
                        key={stage.id}
                        onDragOver={(e) => { e.preventDefault(); setDraggingOverColumn(stage.id); }}
                        onDrop={(e) => handleDrop(e, stage.id)}
                        onDragEnter={() => setDraggingOverColumn(stage.id)}
                        onDragLeave={() => setDraggingOverColumn(null)}
                        className={`flex-1 min-w-[300px] bg-[var(--background-tertiary)] rounded-lg p-3 border-t-4 border-[var(--accent-primary)] flex flex-col transition-colors duration-200 ${draggingOverColumn === stage.id ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
                    >
                        <div className="flex justify-between items-center mb-4 flex-shrink-0 px-1">
                            <h3 className="font-semibold text-lg text-[var(--text-primary)]">{stage.name}</h3>
                            <span className="text-sm font-bold bg-[var(--background-secondary)] text-[var(--text-secondary)] rounded-full px-2.5 py-0.5">{prospectsByStage[stage.id]?.length || 0}</span>
                        </div>
                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-grow">
                            {(prospectsByStage[stage.id] || []).map(prospect => (
                                <ProspectCard key={prospect.id} prospect={prospect} onConvert={onConvertProspect} onOpenAiModal={handleOpenAiModal} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <StageSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
                stages={stages}
                onSave={onUpdateStages}
            />
            {aiModalState.isOpen && aiModalState.prospect && (
                 <ProspectAIModal
                    isOpen={aiModalState.isOpen}
                    onClose={handleCloseAiModal}
                    prospect={aiModalState.prospect}
                    mode={aiModalState.mode!}
                 />
            )}
        </div>
    );
};

export default ProspectingView;