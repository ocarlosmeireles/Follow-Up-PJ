import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Prospect, ProspectingStage } from '../types';
import { PlusIcon, CalendarIcon, TrophyIcon, FunnelIcon, XCircleIcon, MagnifyingGlassIcon } from './icons';

// --- PROPS & TYPES ---
interface ProspectingViewProps {
  prospects: Prospect[];
  stages: ProspectingStage[];
  onAddProspectClick: () => void;
  onUpdateProspectStage: (prospectId: string, newStageId: string) => void;
  onConvertProspect: (prospectId: string) => void;
  onDeleteProspect: (prospectId: string) => void;
}

// --- SUB-COMPONENTS ---

const ProspectCard: React.FC<{ 
    prospect: Prospect; 
    isDragging: boolean;
}> = ({ prospect, isDragging }) => {
    
    const isNextContactOverdue = useMemo(() => {
        if (!prospect.nextContactDate) return false;
        const today = new Date(); 
        today.setHours(0,0,0,0);
        const prospectDate = new Date(prospect.nextContactDate);
        return prospectDate < today;
    }, [prospect.nextContactDate]);

    return (
        <div className={`bg-[var(--background-secondary)] p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing border border-[var(--border-secondary)] hover:border-[var(--accent-primary)] transition-all duration-200 group ${isDragging ? 'opacity-50 rotate-3 shadow-xl' : 'hover:-translate-y-0.5'}`}>
            <div className="flex justify-between items-start">
                <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-[var(--text-primary)] text-base truncate" title={prospect.company}>{prospect.company}</h4>
                    <p className="text-sm text-[var(--text-accent)] font-semibold truncate" title={prospect.name}>{prospect.name}</p>
                </div>
            </div>
            
            <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">{prospect.segment || 'Sem segmento'}</p>
           
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border-primary)]">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${isNextContactOverdue ? 'text-red-500' : 'text-[var(--text-tertiary)]'}`} title="Próximo Contato">
                    <CalendarIcon className="w-4 h-4"/>
                    <span>{prospect.nextContactDate ? new Date(prospect.nextContactDate).toLocaleDateString() : 'N/A'}</span>
                </div>
            </div>
        </div>
    );
};

const Column: React.FC<{
    stage: ProspectingStage;
    prospects: Prospect[];
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    setDraggingProspectId: (id: string | null) => void;
    draggingProspectId: string | null;
    isDraggingOver: boolean;
    onConvertProspect: (id: string) => void;
    onDeleteProspect: (id: string) => void;
}> = ({ stage, prospects, onDragOver, onDrop, setDraggingProspectId, draggingProspectId, isDraggingOver, onConvertProspect, onDeleteProspect }) => {
    
    const totalValue = useMemo(() => {
        return prospects.reduce((sum, p) => sum + (p.estimatedBudget || 0), 0)
    }, [prospects]);

    return (
        <div 
            onDragOver={onDragOver} 
            onDrop={onDrop}
            className={`flex-1 min-w-[320px] bg-[var(--background-tertiary)] rounded-lg p-3 flex flex-col transition-colors ${isDraggingOver ? 'bg-[var(--background-secondary-hover)]' : ''}`}
        >
            <div className="flex justify-between items-center mb-1 px-1">
                <h3 className="font-semibold text-lg text-[var(--text-primary)]">{stage.name}</h3>
                <span className="text-sm font-bold bg-[var(--background-secondary)] text-[var(--text-secondary)] rounded-full px-2.5 py-0.5">{prospects.length}</span>
            </div>
            <div className="text-sm font-bold text-[var(--text-accent)] mb-3 px-1">~ R$ {new Intl.NumberFormat('pt-BR').format(totalValue)}</div>
            
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-grow">
                {prospects.map((prospect, index) => (
                    <div 
                        key={prospect.id} 
                        draggable 
                        onDragStart={(e) => {
                            e.dataTransfer.setData('prospectId', prospect.id);
                            setDraggingProspectId(prospect.id);
                        }}
                        onDragEnd={() => setDraggingProspectId(null)}
                        className="mb-3 animated-item"
                        style={{ animationDelay: `${index * 50}ms`}}
                    >
                        <ProspectCard 
                            prospect={prospect} 
                            isDragging={draggingProspectId === prospect.id}
                        />
                    </div>
                ))}
                {isDraggingOver && <div className="h-24 border-2 border-dashed border-[var(--border-secondary)] rounded-lg bg-[var(--background-tertiary-hover)] mt-2" />}
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-3 text-sm font-semibold">
                 <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        const prospectId = e.dataTransfer.getData('prospectId');
                        onConvertProspect(prospectId);
                    }}
                    className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg p-3 flex items-center justify-center gap-2 text-center transition-colors hover:bg-green-200 dark:hover:bg-green-900 border-2 border-dashed border-transparent hover:border-green-400"
                >
                    <TrophyIcon className="w-5 h-5"/> Converter
                </div>
                 <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={(e) => {
                        e.preventDefault();
                        const prospectId = e.dataTransfer.getData('prospectId');
                        onDeleteProspect(prospectId);
                    }}
                    className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg p-3 flex items-center justify-center gap-2 text-center transition-colors hover:bg-red-200 dark:hover:bg-red-900 border-2 border-dashed border-transparent hover:border-red-400"
                >
                    <XCircleIcon className="w-5 h-5"/> Perder
                </div>
            </div>
        </div>
    );
};


// --- MAIN VIEW COMPONENT ---

export const ProspectingView: React.FC<ProspectingViewProps> = ({ prospects, stages, onAddProspectClick, onUpdateProspectStage, onConvertProspect, onDeleteProspect }) => {
    const [draggingProspectId, setDraggingProspectId] = useState<string | null>(null);
    const [draggingOverStageId, setDraggingOverStageId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const sortedStages = useMemo(() => stages.sort((a, b) => a.order - b.order), [stages]);

    const filteredProspects = useMemo(() => {
        if (!searchTerm) return prospects;
        const lowerSearch = searchTerm.toLowerCase();
        return prospects.filter(p => 
            p.company.toLowerCase().includes(lowerSearch) || 
            p.name.toLowerCase().includes(lowerSearch)
        );
    }, [prospects, searchTerm]);
    
    const prospectsByStage = useMemo(() => {
        const grouped: { [stageId: string]: Prospect[] } = {};
        sortedStages.forEach(stage => grouped[stage.id] = []);
        filteredProspects.forEach(prospect => {
            if (grouped[prospect.stageId]) {
                grouped[prospect.stageId].push(prospect);
            }
        });
        return grouped;
    }, [filteredProspects, sortedStages]);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
        e.preventDefault();
        const prospectId = e.dataTransfer.getData('prospectId');
        onUpdateProspectStage(prospectId, stageId);
        setDraggingOverStageId(null);
    };

    return (
        <div className="flex flex-col h-full w-full space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Funil de Prospecção</h1>
                    <p className="text-[var(--text-secondary)]">Gerencie seus leads e transforme oportunidades em clientes.</p>
                </div>
                <div className="flex items-center gap-4 self-start sm:self-center">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <MagnifyingGlassIcon className="w-5 h-5 text-[var(--text-tertiary)]" />
                        </span>
                        <input 
                            type="text"
                            placeholder="Buscar prospect..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-[var(--background-secondary)] border border-[var(--border-secondary)] text-[var(--text-primary)] rounded-lg py-2 pl-10 pr-4 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                        />
                    </div>
                    <button
                        onClick={onAddProspectClick}
                        className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Novo Prospect
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar">
                {sortedStages.length > 0 ? (
                    sortedStages.map(stage => (
                        <Column
                            key={stage.id}
                            stage={stage}
                            prospects={prospectsByStage[stage.id] || []}
                            onDragOver={(e) => { e.preventDefault(); setDraggingOverStageId(stage.id); }}
                            onDrop={(e) => handleDrop(e, stage.id)}
                            setDraggingProspectId={setDraggingProspectId}
                            draggingProspectId={draggingProspectId}
                            isDraggingOver={draggingOverStageId === stage.id}
                            onConvertProspect={onConvertProspect}
                            onDeleteProspect={onDeleteProspect}
                        />
                    ))
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center bg-[var(--background-tertiary)] p-8 rounded-lg">
                        <FunnelIcon className="w-16 h-16 text-[var(--text-tertiary)] mb-4"/>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)]">Nenhum funil de prospecção configurado.</h3>
                        <p className="text-[var(--text-secondary)]">Vá para as Configurações para criar suas etapas e começar a prospectar.</p>
                    </div>
                )}
            </div>
        </div>
    );
};