import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Script, ScriptCategory } from '../types';
import { scriptCategories } from '../types';
import { StarIcon, PlusIcon, EllipsisVerticalIcon, PencilIcon, TrashIcon } from './icons';

interface ScriptsViewProps {
    scripts: Script[];
    onAdd: () => void;
    onEdit: (script: Script) => void;
    onDelete: (scriptId: string) => void;
}

const ScriptsView: React.FC<ScriptsViewProps> = ({ scripts, onAdd, onEdit, onDelete }) => {
    const [activeCategory, setActiveCategory] = useState('favorites');
    const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const [favorites, setFavorites] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('favoriteScripts');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        } catch (e) {
            return new Set();
        }
    });

    useEffect(() => {
        localStorage.setItem('favoriteScripts', JSON.stringify(Array.from(favorites)));
    }, [favorites]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleFavorite = (scriptId: string) => {
        setFavorites(prev => {
            const newFavs = new Set(prev);
            if (newFavs.has(scriptId)) {
                newFavs.delete(scriptId);
            } else {
                newFavs.add(scriptId);
            }
            return newFavs;
        });
    };

    const allCategories = useMemo(() => {
        const favoriteScripts = scripts.filter(s => favorites.has(s.id));
        const favoritesCategory = { id: 'favorites', name: '⭐ Favoritos', scripts: favoriteScripts };

        const groupedByCategory = scripts.reduce((acc, script) => {
            const category = script.category || 'Reengajamento'; // Fallback for old data
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(script);
            return acc;
        }, {} as Record<ScriptCategory, Script[]>);
        
        const otherCategories = scriptCategories.map(catName => ({
            id: catName.toLowerCase().replace(/ /g, '-'),
            name: catName,
            scripts: groupedByCategory[catName] || []
        }));

        return [favoritesCategory, ...otherCategories];
    }, [scripts, favorites]);

    const handleCopy = (script: Script) => {
        navigator.clipboard.writeText(script.content);
        setCopiedScriptId(script.id);
        setTimeout(() => setCopiedScriptId(null), 2000);
    };

    const selectedCategoryData = allCategories.find(c => c.id === activeCategory);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)]">Central de Scripts</h1>
                    <p className="text-[var(--text-secondary)]">Acelere sua comunicação com mensagens prontas e personalizadas.</p>
                </div>
                <button onClick={onAdd} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors duration-200 shadow-sm">
                    <PlusIcon className="w-5 h-5"/>
                    Adicionar Script
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Categories Sidebar */}
                <aside className="md:w-1/4 lg:w-1/5 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Categorias</h2>
                    <div className="space-y-2">
                        {allCategories.map(category => (
                             (category.id === 'favorites' && category.scripts.length === 0) ? null : (
                                <button
                                    key={category.id}
                                    onClick={() => setActiveCategory(category.id)}
                                    className={`w-full text-left px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                                        activeCategory === category.id
                                            ? 'bg-[var(--accent-primary)] text-white'
                                            : 'bg-[var(--background-secondary)] text-[var(--text-primary)] hover:bg-[var(--background-tertiary)]'
                                    }`}
                                >
                                    {category.name} ({category.scripts.length})
                                </button>
                            )
                        ))}
                    </div>
                </aside>

                {/* Scripts Content */}
                <main className="flex-1 min-w-0">
                    <div className="space-y-4">
                        {selectedCategoryData && selectedCategoryData.scripts.length > 0 ? (
                            selectedCategoryData.scripts.map((script, index) => (
                                <div key={script.id} className="bg-[var(--background-secondary)] rounded-lg border border-[var(--border-primary)] shadow-sm p-4 animated-item" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => toggleFavorite(script.id)} className="text-yellow-400 hover:text-yellow-500 transition-colors">
                                                <StarIcon solid={favorites.has(script.id)} className="w-5 h-5"/>
                                            </button>
                                            <h3 className="font-bold text-lg text-[var(--text-primary)]">{script.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleCopy(script)}
                                                className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                                    copiedScriptId === script.id
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white'
                                                }`}
                                            >
                                                {copiedScriptId === script.id ? 'Copiado!' : 'Copiar'}
                                            </button>
                                            <div className="relative">
                                                <button onClick={() => setOpenMenuId(openMenuId === script.id ? null : script.id)} className="p-2 rounded-full text-[var(--text-tertiary)] hover:bg-[var(--background-tertiary)]">
                                                    <EllipsisVerticalIcon className="w-5 h-5"/>
                                                </button>
                                                {openMenuId === script.id && (
                                                    <div ref={menuRef} className="absolute top-full right-0 mt-1 w-32 bg-[var(--background-secondary)] rounded-lg shadow-xl border border-[var(--border-primary)] z-10">
                                                        <button onClick={() => { onEdit(script); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-2 p-2 text-sm hover:bg-[var(--background-tertiary)]">
                                                            <PencilIcon className="w-4 h-4"/> Editar
                                                        </button>
                                                         <button onClick={() => { onDelete(script.id); setOpenMenuId(null); }} className="w-full text-left flex items-center gap-2 p-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                                                            <TrashIcon className="w-4 h-4"/> Excluir
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <pre className="bg-[var(--background-tertiary)] p-3 rounded-md text-sm text-[var(--text-secondary)] whitespace-pre-wrap font-sans">
                                        {script.content}
                                    </pre>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16 text-[var(--text-secondary)] bg-[var(--background-secondary)] rounded-lg border-2 border-dashed border-[var(--border-secondary)]">
                                <p className="font-semibold text-lg">
                                    {activeCategory === 'favorites' ? 'Nenhum script favorito.' : 'Nenhum script nesta categoria.'}
                                </p>
                                <p className="text-sm mt-1">
                                    {activeCategory === 'favorites' ? 'Clique na estrela ★ ao lado do título de um script para adicioná-lo aqui.' : 'Adicione um novo script para começar.'}
                                </p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ScriptsView;