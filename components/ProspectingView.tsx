import React, { useState, useMemo } from 'react';
import type { Prospect, ProspectingStage } from '../types';
import { PlusIcon, Cog6ToothIcon, WhatsAppIcon, EnvelopeIcon, PhoneIcon } from './icons';
import StageSettingsModal from './StageSettingsModal';

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

const isPhoneNumber = (contact: string) => {
    const cleaned = cleanPhoneNumber(contact);
    return cleaned.length >= 10 && /^\d+$/.test(cleaned);
};


const ProspectCard: React.FC<{ prospect: Prospect, onConvert: (id: string) => void }> = ({ prospect, onConvert }) => {
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('prospectId', prospect.id);
    };

    const canContactOnWhatsApp = prospect.phone && isPhoneNumber(prospect.phone);

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm mb-3 cursor-grab active:cursor-grabbing border border-gray-200 dark:border-slate-700 hover:border-blue-500 transition-all duration-200"
        >
            <h4 className="font-bold text-gray-800 dark:text-slate-100">{prospect.name}</h4>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold mb-2">{prospect.company}</p>
            
            <div className="space-y-1.5 text-sm text-gray-600 dark:text-slate-300 my-2">
                {prospect.phone && (
                    <div className="flex items-center gap-2">
                        <PhoneIcon className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                        <span>{prospect.phone}</span>
                        {canContactOnWhatsApp && (
                             <a
                                href={`https://wa.me/55${cleanPhoneNumber(prospect.phone)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Contatar no WhatsApp"
                                className="text-green-500 hover:text-green-600 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <WhatsAppIcon className="w-4 h-4" />
                            </a>
                        )}
                    </div>
                )}
                {prospect.email && (
                    <div className="flex items-center gap-2">
                        <EnvelopeIcon className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                        <span className="truncate" title={prospect.email}>{prospect.email}</span>
                    </div>
                )}
            </div>
           
            <button
                onClick={() => onConvert(prospect.id)}
                className="mt-3 w-full text-xs bg-green-500 hover:bg-green-600 text-white font-semibold py-1.5 px-2 rounded-md transition-colors"
            >
                Converter em Orçamento
            </button>
        </div>
    );
};


const ProspectingView: React.FC<ProspectingViewProps> = ({ prospects, stages, onAddProspectClick, onUpdateProspectStage, onUpdateStages, onConvertProspect }) => {
    const [draggingOverColumn, setDraggingOverColumn] = useState<string | null>(null);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

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
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Funil de Prospecção</h2>
                    <p className="text-gray-500 dark:text-gray-400">Arraste os prospects entre as etapas para avançar no funil.</p>
                </div>
                 <div className="flex gap-4">
                    <button
                        onClick={() => setSettingsModalOpen(true)}
                        className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600 flex items-center transition-colors duration-200 shadow-sm"
                    >
                        <Cog6ToothIcon className="w-5 h-5 mr-2" />
                        Configurar Etapas
                    </button>
                    <button
                        onClick={onAddProspectClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm"
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
                        className={`flex-1 min-w-[300px] bg-slate-100 dark:bg-slate-800/50 rounded-lg p-4 border-t-4 border-blue-500 flex flex-col transition-colors duration-200 ${draggingOverColumn === stage.id ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
                    >
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h3 className="font-semibold text-lg text-gray-800 dark:text-slate-200">{stage.name}</h3>
                            <span className="text-sm font-bold bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full px-2 py-0.5">{prospectsByStage[stage.id]?.length || 0}</span>
                        </div>
                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-grow">
                            {(prospectsByStage[stage.id] || []).map(prospect => (
                                <ProspectCard key={prospect.id} prospect={prospect} onConvert={onConvertProspect} />
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
        </div>
    );
};

export default ProspectingView;