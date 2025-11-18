import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile, Organization, Theme, ThemeVariant, LayoutMode } from '../types';
import { UserRole } from '../types';
import { XMarkIcon, BriefcaseIcon, SunIcon, MoonIcon, PhotoIcon } from './icons';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTheme: Theme;
    setTheme: (theme: Theme) => void;
    currentThemeVariant: ThemeVariant;
    setThemeVariant: (variant: ThemeVariant) => void;
    layoutMode: LayoutMode;
    setLayoutMode: (mode: LayoutMode) => void;
}

const ThemePreview: React.FC<{ variant: ThemeVariant; name: string; isActive: boolean; onClick: () => void; }> = ({ variant, name, isActive, onClick }) => {
    const classicColors = { bg: 'bg-slate-100', sidebar: 'bg-white', accent: 'bg-blue-500' };
    const vibrantColors = { bg: 'bg-slate-50', sidebar: 'bg-white', accent: 'bg-purple-600' };
    const flowColors = { bg: 'bg-gray-50', sidebar: 'bg-white', accent: 'bg-cyan-500' };
    const dashboardColors = { bg: 'bg-[#eef1f8]', sidebar: 'bg-[#28334d]', accent: 'bg-blue-500' };
    const auroraColors = { bg: 'bg-[#f6f8fa]', sidebar: 'bg-white', accent: 'bg-[#1f6feb]' };
    
    const colors = variant === 'classic' ? classicColors : variant === 'vibrant' ? vibrantColors : variant === 'dashboard' ? dashboardColors : variant === 'aurora' ? auroraColors : flowColors;
    
    return (
        <div onClick={onClick} className={`cursor-pointer rounded-lg p-2 border-2 transition-all ${isActive ? 'border-[var(--accent-primary)]' : 'border-transparent hover:border-[var(--border-secondary)]'}`}>
            <div className={`w-full h-24 ${colors.bg} rounded-md p-2 flex gap-2 overflow-hidden border border-slate-200`}>
                <div className={`w-1/4 h-full ${colors.sidebar} rounded shadow-sm`}>
                    <div className={`w-3/4 h-2 ${colors.accent} rounded-full mx-auto mt-2`}></div>
                    <div className="w-3/4 h-1 bg-slate-300 rounded-full mx-auto mt-2"></div>
                    <div className="w-1/2 h-1 bg-slate-300 rounded-full mx-auto mt-1"></div>
                </div>
                <div className="w-3/4 h-full space-y-2">
                    <div className="w-1/2 h-2 bg-slate-300 rounded-full"></div>
                    <div className="w-full h-8 bg-white rounded shadow-sm flex items-center justify-between p-2">
                         <div className="w-1/3 h-2 bg-slate-300 rounded-full"></div>
                         <div className={`w-1/4 h-4 ${colors.accent} rounded`}></div>
                    </div>
                </div>
            </div>
            <p className={`text-center text-sm font-semibold mt-2 ${isActive ? 'text-[var(--text-accent)]' : 'text-[var(--text-secondary)]'}`}>{name}</p>
        </div>
    );
};


const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    currentTheme, 
    setTheme,
    currentThemeVariant, 
    setThemeVariant,
    layoutMode,
    setLayoutMode
}) => {
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-[var(--background-secondary)] rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-3xl m-4 transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Configurações</h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="space-y-8">
                    {/* Theme Settings */}
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Tema da Aplicação</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <ThemePreview variant="aurora" name="Aurora" isActive={currentThemeVariant === 'aurora'} onClick={() => setThemeVariant('aurora')} />
                            <ThemePreview variant="dashboard" name="Painel" isActive={currentThemeVariant === 'dashboard'} onClick={() => setThemeVariant('dashboard')} />
                            <ThemePreview variant="classic" name="Clássico" isActive={currentThemeVariant === 'classic'} onClick={() => setThemeVariant('classic')} />
                            <ThemePreview variant="flow" name="Fluxo" isActive={currentThemeVariant === 'flow'} onClick={() => setThemeVariant('flow')} />
                            <ThemePreview variant="vibrant" name="Vibrante" isActive={currentThemeVariant === 'vibrant'} onClick={() => setThemeVariant('vibrant')} />
                        </div>
                    </div>

                    {/* Layout Density Settings */}
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Densidade da Interface</h3>
                        <div className="flex gap-2 rounded-lg bg-[var(--background-tertiary)] p-1">
                            <button
                                onClick={() => setLayoutMode('comfortable')}
                                className={`w-full rounded-md py-2 text-sm font-semibold transition-colors ${layoutMode === 'comfortable' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow-sm' : 'text-[var(--text-secondary)]'}`}
                            >
                                Confortável
                            </button>
                            <button
                                onClick={() => setLayoutMode('compact')}
                                className={`w-full rounded-md py-2 text-sm font-semibold transition-colors ${layoutMode === 'compact' ? 'bg-[var(--background-secondary)] text-[var(--text-accent)] shadow-sm' : 'text-[var(--text-secondary)]'}`}
                            >
                                Compacto
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[var(--border-primary)] flex justify-end">
                    <button onClick={onClose} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] font-bold py-2 px-4 rounded-lg">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;