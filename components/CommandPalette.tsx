import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Budget, Client, Contact, Prospect, SearchResult, CommandResult, ActionSearchResult } from '../types';
import type { ActiveView } from '../App';
import { 
    MagnifyingGlassIcon, XMarkIcon, BriefcaseIcon, UserIcon, FunnelIcon, 
    ArrowRightIcon, PlusIcon, Squares2X2Icon, ChartBarIcon, CalendarDaysIcon, 
    ClipboardDocumentListIcon, MapPinIcon, ChatBubbleLeftRightIcon
} from './icons';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ActiveView) => void;
  onOpenNewBudget: () => void;
  onOpenNewProspect: () => void;
  onResultClick: (result: { type: string; id: string }) => void;
  clients: Client[];
  budgets: Budget[];
  prospects: Prospect[];
  contacts: Contact[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
    isOpen, onClose, onNavigate, onOpenNewBudget, onOpenNewProspect, onResultClick,
    clients, budgets, prospects, contacts
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const baseActions: ActionSearchResult[] = useMemo(() => [
        { type: 'action', id: 'action-new-budget', title: 'Novo Orçamento', subtitle: 'Criar uma nova proposta comercial', onSelect: onOpenNewBudget },
        { type: 'action', id: 'action-new-prospect', title: 'Novo Prospect', subtitle: 'Adicionar um novo lead ao funil', onSelect: onOpenNewProspect },
        { type: 'action', id: 'nav-dashboard', title: 'Ir para Painel', subtitle: 'Navegar para o dashboard principal', onSelect: () => onNavigate('dashboard') },
        { type: 'action', id: 'nav-prospecting', title: 'Ir para Prospecção', subtitle: 'Navegar para o funil de prospecção', onSelect: () => onNavigate('prospecting') },
        { type: 'action', id: 'nav-budgeting', title: 'Ir para Orçamentos', subtitle: 'Navegar para a lista de orçamentos', onSelect: () => onNavigate('budgeting') },
        { type: 'action', id: 'nav-clients', title: 'Ir para Clientes', subtitle: 'Navegar para a lista de clientes', onSelect: () => onNavigate('clients') },
        { type: 'action', id: 'nav-reports', title: 'Ir para Relatórios', subtitle: 'Navegar para a tela de relatórios', onSelect: () => onNavigate('reports') },
        { type: 'action', id: 'nav-calendar', title: 'Ir para Calendário', subtitle: 'Navegar para o calendário', onSelect: () => onNavigate('calendar') },
    ], [onNavigate, onOpenNewBudget, onOpenNewProspect]);

    const searchResults = useMemo<SearchResult[]>(() => {
        if (!searchTerm.trim()) return [];
        const lowerTerm = searchTerm.toLowerCase();
        const results: SearchResult[] = [];

        clients.forEach(c => {
            if (c.name.toLowerCase().includes(lowerTerm) || (c.cnpj && c.cnpj.includes(lowerTerm))) {
                results.push({ type: 'client', id: c.id, title: c.name, subtitle: c.cnpj || 'Cliente' });
            }
        });
        budgets.forEach(b => {
            if (b.title.toLowerCase().includes(lowerTerm)) {
                const clientName = clients.find(c => c.id === b.clientId)?.name;
                results.push({ type: 'budget', id: b.id, title: b.title, subtitle: `Em ${clientName}` || 'Orçamento' });
            }
        });
        prospects.forEach(p => {
            if (p.company.toLowerCase().includes(lowerTerm) || p.name.toLowerCase().includes(lowerTerm)) {
                results.push({ type: 'prospect', id: p.id, title: p.company, subtitle: `Prospect: ${p.name}` });
            }
        });
        return results.slice(0, 10);
    }, [searchTerm, clients, budgets, prospects]);
    
    const filteredActions = useMemo<ActionSearchResult[]>(() => {
        if (!searchTerm.trim()) return baseActions;
        const lowerTerm = searchTerm.toLowerCase();
        return baseActions.filter(action => action.title.toLowerCase().includes(lowerTerm) || action.subtitle.toLowerCase().includes(lowerTerm));
    }, [searchTerm, baseActions]);

    const allResults: CommandResult[] = useMemo(() => {
        return searchTerm.trim() ? [...filteredActions, ...searchResults] : baseActions;
    }, [searchTerm, filteredActions, searchResults]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setSearchTerm('');
        }
    }, [isOpen]);

    useEffect(() => {
        setActiveIndex(0);
    }, [searchTerm]);

    useEffect(() => {
        if (activeIndex >= 0 && resultsRef.current) {
            const activeElement = resultsRef.current.children[activeIndex] as HTMLElement;
            if (activeElement) {
                activeElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % allResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + allResults.length) % allResults.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = allResults[activeIndex];
            if (selected) {
                if (selected.type === 'action') {
                    selected.onSelect();
                } else {
                    onResultClick(selected);
                }
            }
        }
    };
    
    const getIconForType = (type: CommandResult['type']) => {
        switch(type) {
            case 'client': return <UserIcon className="w-5 h-5 text-blue-500" />;
            case 'budget': return <BriefcaseIcon className="w-5 h-5 text-green-500" />;
            case 'prospect': return <FunnelIcon className="w-5 h-5 text-purple-500" />;
            case 'action': return <ArrowRightIcon className="w-5 h-5 text-gray-500" />;
            default: return null;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center pt-[15vh]" onClick={onClose}>
            <div
                className="bg-[var(--background-secondary)] w-full max-w-xl rounded-xl shadow-2xl border border-[var(--border-primary)] flex flex-col overflow-hidden animated-item"
                style={{ animationName: 'fadeInDown', animationDuration: '300ms' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3 p-4 border-b border-[var(--border-primary)]">
                    <MagnifyingGlassIcon className="w-5 h-5 text-[var(--text-tertiary)]" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Busque por clientes, orçamentos ou execute ações..."
                        className="w-full bg-transparent outline-none text-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                    />
                    <button onClick={onClose} className="p-1 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--background-tertiary)]">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                <div ref={resultsRef} className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
                    {allResults.length > 0 ? (
                        allResults.map((result, index) => {
                            const onSelect = () => {
                                if (result.type === 'action') result.onSelect();
                                else onResultClick(result);
                            };
                            return (
                                <div
                                    key={`${result.type}-${result.id}`}
                                    onClick={onSelect}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    className={`flex items-center justify-between gap-3 p-3 rounded-lg cursor-pointer ${activeIndex === index ? 'bg-[var(--background-accent-subtle)]' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        {getIconForType(result.type)}
                                        <div>
                                            <p className="font-semibold text-sm text-[var(--text-primary)]">{result.title}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">{result.subtitle}</p>
                                        </div>
                                    </div>
                                    {activeIndex === index && <span className="text-xs text-[var(--text-tertiary)]">Enter</span>}
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center p-8 text-[var(--text-secondary)]">Nenhum resultado encontrado.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
