import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Prospect, ProspectingStage } from '../types';
import { PlusIcon, CalendarIcon, TrophyIcon, FunnelIcon, XCircleIcon, MagnifyingGlassIcon, EllipsisVerticalIcon, SparklesIcon, AcademicCapIcon, ChatBubbleLeftRightIcon, UserGroupIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ChartBarIcon } from './icons';
import ProspectAIModal from './ProspectAIModal';

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
    onOpenAIModal: (mode: 'research' | 'icebreaker' | 'strategy') => void;
    isDragging: boolean;
}> = ({ prospect, onOpenAIModal, isDragging }) => {
    
    const [isMenuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
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
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setMenuOpen(p => !p)} className="p-1 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--background-tertiary)]">
                        <EllipsisVerticalIcon className="w-5 h-5"/>
                    </button>
                    {isMenuOpen && (
                         <div className="absolute top-full right-0 mt-1 w-48 bg-[var(--background-secondary)] rounded-lg shadow-xl border border-[var(--border-primary)] z-10">
                             <button onClick={() => onOpenAIModal('research')} className="w-full text-left flex items-center gap-2 p-2 text-sm hover:bg-[var(--background-tertiary)]">
                                 <AcademicCapIcon className="w-4 h-4 text-sky-500"/> Pesquisar
                             </button>
                             <button onClick={() => onOpenAIModal('icebreaker')} className="w-full text-left flex items-center gap-2 p-2 text-sm hover:bg-[var(--background-tertiary)]">
                                 <ChatBubbleLeftRightIcon className="w-4 h-4 text-violet-500"/> Gerar Abordagem
                             </button>
                             <button onClick={() => onOpenAIModal('strategy')} className="w-full text-left flex items-center gap-2 p-2 text-sm hover:bg-[var(--background-tertiary)]">
                                <SparklesIcon className="w-4 h-4 text-emerald-500"/> Sugerir Estratégia
                             </button>
                         </div>
                    )}
                </div>
            </div>
            
            <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">{prospect.segment || 'Sem segmento'}</p>
           
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border-primary)]">
                <div className={`flex items-center gap-1.5 text-xs font-semibold ${isNextContactOverdue ? 'text-red-500' : 'text-[var(--text-tertiary)]'}`} title="Próximo Contato">
                    <CalendarIcon className="w-4 h-4"/>
                    <span>{prospect.nextContactDate ? new Date(prospect.nextContactDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}</span>
                </div>
                {prospect.estimatedBudget && prospect.estimatedBudget > 0 ? (
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prospect.estimatedBudget)}
                    </span>
                ) : null}
            </div>
        </div>
    );
};

// Main Component
const ProspectingView: React.FC<ProspectingViewProps> = ({ prospects, stages, onAddProspectClick, onUpdateProspectStage, onConvertProspect, onDeleteProspect }) => {
    const [draggingOverColumn, setDraggingOverColumn] = useState<string | null>(null);
    const [draggingProspectId, setDraggingProspectId] = useState<string | null>(null);
    const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
    const [aiModal, setAiModal] = useState<{ isOpen: boolean; mode: 'research' | 'icebreaker' | 'strategy' }>({ isOpen: false, mode: 'research' });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [segmentFilter, setSegmentFilter] = useState('all');
    const [sizeFilter, setSizeFilter] = useState('all');
    const [urgencyFilter, setUrgencyFilter] = useState('all');

    
    const sortedStages = useMemo(() => [...stages].sort((a,b) => a.order - b.order), [stages]);

    const filteredProspects = useMemo(() => {
        return prospects.filter(p => {
            const searchLower = searchTerm.toLowerCase();
            const searchMatch = !searchTerm || p.company.toLowerCase().includes(searchLower) || p.name.toLowerCase().includes(searchLower) || p.cnpj?.includes(searchLower);
            const segmentMatch = segmentFilter === 'all' || p.segment === segmentFilter;
            const sizeMatch = sizeFilter === 'all' || p.companySize === sizeFilter;
            const urgencyMatch = urgencyFilter === 'all' || p.urgencyLevel === urgencyFilter;
            return searchMatch && segmentMatch && sizeMatch && urgencyMatch;
        });
    }, [prospects, searchTerm, segmentFilter, sizeFilter, urgencyFilter]);

    const prospectsByStage = useMemo(() => {
        const grouped: { [key: string]: Prospect[] } = {};
        stages.forEach(stage => { grouped[stage.id] = []; });
        filteredProspects.forEach(prospect => {
            if (grouped[prospect.stageId]) {
                grouped[prospect.stageId].push(prospect);
            }
        });
        return grouped;
    }, [filteredProspects, stages]);

    const metrics = useMemo(() => {
        const qualifiedStages = sortedStages.slice(1).map(s => s.id);
        const qualifiedLeads = prospects.filter(p => qualifiedStages.includes(p.stageId));
        const negotiationValue = prospects.filter(p => p.stageId === sortedStages.find(s => s.name.toLowerCase().includes('negociação'))?.id).reduce((sum, p) => sum + (p.estimatedBudget || 0), 0);
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        
        const idleLeads = prospects.filter(p => {
            if (!p.nextContactDate) return true; // No next contact scheduled
            const nextContact = new Date(p.nextContactDate);
            return nextContact < sevenDaysAgo; // Next contact was over 7 days ago
        }).length;
        
        return {
            total: prospects.length,
            qualified: qualifiedLeads.length,
            negotiationValue,
            idleLeads,
        };
    }, [prospects, sortedStages]);

    const uniqueSegments = useMemo(() => [...new Set(prospects.map(p => p.segment).filter(Boolean))], [prospects]);

    const handleOpenAIModal = (prospect: Prospect, mode: 'research' | 'icebreaker' | 'strategy') => {
        setSelectedProspect(prospect);
        setAiModal({ isOpen: true, mode });
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
        e.preventDefault();
        const prospectId = e.dataTransfer.getData('prospectId');
        
        if (stageId === 'CONVERT') {
            onConvertProspect(prospectId);
        } else if (stageId === 'DELETE') {
            onDeleteProspect(prospectId);
        } else {
            const prospect = prospects.find(p => p.id === prospectId);
            if (prospect && prospect.stageId !== stageId) {
                 onUpdateProspectStage(prospectId, stageId);
            }
        }
        setDraggingOverColumn(null);
        setDraggingProspectId(null);
    }
    
    return (
        <div className="flex flex-col h-full w-full -mx-4 sm:-mx-6">
            <div className="flex-shrink-0 mb-6 px-4 sm:px-6">
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">Central de Prospecção e Geração de Leads</h2>
                <p className="text-[var(--text-secondary)]">Encontre novos clientes, valide oportunidades, registre dados críticos e acompanhe o funil até virar venda.</p>
                 <div className="flex justify-end">
                    <button onClick={onAddProspectClick} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Criar Lead
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 px-4 sm:px-6">
                <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)]"><p className="text-sm text-[var(--text-secondary)]">Total de Leads</p><p className="text-2xl font-bold">{metrics.total}</p></div>
                <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)]"><p className="text-sm text-[var(--text-secondary)]">Leads Qualificados</p><p className="text-2xl font-bold">{metrics.qualified}</p></div>
                <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)]"><p className="text-sm text-[var(--text-secondary)]">Valor em Negociação</p><p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.negotiationValue)}</p></div>
                <div className="bg-[var(--background-secondary)] p-4 rounded-lg border border-[var(--border-primary)]"><p className="text-sm text-[var(--text-secondary)]">Leads sem Follow-up (&gt;7d)</p><p className="text-2xl font-bold text-yellow-500">{metrics.idleLeads}</p></div>
            </div>

             <div className="bg-[var(--background-secondary)] p-3 rounded-lg border border-[var(--border-primary)] mb-4 flex flex-wrap items-center gap-4 mx-4 sm:mx-6">
                 <div className="relative flex-grow min-w-[200px]">
                    <MagnifyingGlassIcon className="w-5 h-5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2"/>
                    <input type="text" placeholder="Buscar por empresa, contato..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-md py-2 pl-10 pr-3"/>
                 </div>
                 <select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)} className="flex-grow min-w-[150px] bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-md py-2 px-3"><option value="all">Todos Segmentos</option>{uniqueSegments.map(s => <option key={s} value={s}>{s}</option>)}</select>
                 <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} className="flex-grow min-w-[150px] bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-md py-2 px-3"><option value="all">Todos Portes</option><option value="Pequena">Pequena</option><option value="Média">Média</option><option value="Grande">Grande</option></select>
                 <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)} className="flex-grow min-w-[150px] bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-md py-2 px-3"><option value="all">Toda Urgência</option><option value="Baixa">Baixa</option><option value="Média">Média</option><option value="Alta">Alta</option></select>
            </div>

            <div className="flex-grow flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-0 px-4 sm:px-6">
                {sortedStages.map((stage) => {
                    const stageProspects = prospectsByStage[stage.id] || [];
                    return (
                        <div key={stage.id} onDragOver={(e) => { e.preventDefault(); setDraggingOverColumn(stage.id); }} onDrop={(e) => handleDrop(e, stage.id)} onDragLeave={() => setDraggingOverColumn(null)} className={`flex-1 min-w-72 bg-[var(--background-tertiary)] rounded-lg p-3 flex flex-col transition-colors ${draggingOverColumn === stage.id ? 'bg-[var(--background-tertiary-hover)]' : ''}`}>
                            <div className="flex justify-between items-center mb-4 flex-shrink-0 px-1">
                                <h3 className="font-semibold text-lg text-[var(--text-primary)]">{stage.name}</h3>
                                <span className="text-sm font-bold bg-[var(--background-secondary)] text-[var(--text-secondary)] rounded-full px-2.5 py-0.5">{stageProspects.length}</span>
                            </div>
                            <div className="overflow-y-auto pr-1 -mr-3 custom-scrollbar flex-grow">
                                {stageProspects.length > 0 ? (
                                    <div className="space-y-3">
                                        {stageProspects.map(prospect => (
                                            <div key={prospect.id} draggable onDragStart={(e) => { e.dataTransfer.setData('prospectId', prospect.id); setDraggingProspectId(prospect.id); }} onDragEnd={() => setDraggingProspectId(null)}>
                                                <ProspectCard prospect={prospect} onOpenAIModal={(mode) => handleOpenAIModal(prospect, mode)} isDragging={draggingProspectId === prospect.id} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    draggingOverColumn !== stage.id && (
                                        <div className="flex h-full items-center justify-center">
                                            <p className="text-xs text-center text-[var(--text-tertiary)] p-4">Nenhum lead nesta etapa.</p>
                                        </div>
                                    )
                                )}
                                {draggingOverColumn === stage.id && <div className="h-20 border-2 border-dashed border-[var(--border-secondary)] rounded-lg mt-3"></div>}
                            </div>
                        </div>
                    );
                })}
                 <div className="flex-shrink-0 w-64 space-y-4">
                     <div onDragOver={(e) => { e.preventDefault(); setDraggingOverColumn('CONVERT'); }} onDrop={(e) => handleDrop(e, 'CONVERT')} onDragLeave={() => setDraggingOverColumn(null)} className={`h-1/2 flex flex-col items-center justify-center text-center p-4 rounded-lg border-2 border-dashed transition-colors ${draggingOverColumn === 'CONVERT' ? 'bg-green-100 dark:bg-green-900/50 border-green-400' : 'bg-green-50 dark:bg-green-900/30 border-green-300'}`}>
                         <TrophyIcon className="w-8 h-8 text-green-500 mb-2"/>
                         <h3 className="font-bold text-green-800 dark:text-green-200">Converter em Venda</h3>
                         <p className="text-xs text-green-600 dark:text-green-400">Arraste aqui para criar um orçamento</p>
                     </div>
                     <div onDragOver={(e) => { e.preventDefault(); setDraggingOverColumn('DELETE'); }} onDrop={(e) => handleDrop(e, 'DELETE')} onDragLeave={() => setDraggingOverColumn(null)} className={`h-1/2 flex flex-col items-center justify-center text-center p-4 rounded-lg border-2 border-dashed transition-colors ${draggingOverColumn === 'DELETE' ? 'bg-red-100 dark:bg-red-900/50 border-red-400' : 'bg-red-50 dark:bg-red-900/30 border-red-300'}`}>
                         <XCircleIcon className="w-8 h-8 text-red-500 mb-2"/>
                         <h3 className="font-bold text-red-800 dark:text-red-200">Marcar como Perdido</h3>
                         <p className="text-xs text-red-600 dark:text-red-400">Arraste aqui para remover do funil</p>
                     </div>
                 </div>
            </div>
            
            <footer className="flex-shrink-0 flex items-center justify-center gap-4 sm:gap-6 text-sm text-[var(--text-secondary)] mt-4 border-t border-[var(--border-primary)] py-4 px-4 sm:px-6">
                <button title="Em breve" disabled className="flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <ArrowUpTrayIcon className="w-5 h-5" /> Importar Lista
                </button>
                <span className="text-[var(--border-secondary)]">|</span>
                <button title="Em breve" disabled className="flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <ArrowDownTrayIcon className="w-5 h-5" /> Exportar Leads
                </button>
                <span className="text-[var(--border-secondary)]">|</span>
                <button title="Em breve" disabled className="flex items-center gap-2 hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChartBarIcon className="w-5 h-5" /> Gerar Relatórios
                </button>
            </footer>

            {aiModal.isOpen && selectedProspect && (
                <ProspectAIModal
                    isOpen={aiModal.isOpen}
                    onClose={() => setAiModal({ isOpen: false, mode: 'research' })}
                    prospect={selectedProspect}
                    mode={aiModal.mode}
                />
            )}
        </div>
    );
};

export default ProspectingView;
