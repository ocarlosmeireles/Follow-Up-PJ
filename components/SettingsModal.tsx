import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile, Organization, Theme, ThemeVariant } from '../types';
import { UserRole } from '../types';
import { XMarkIcon, BriefcaseIcon, SunIcon, MoonIcon, PhotoIcon } from './icons';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentTheme: Theme;
    setTheme: (theme: Theme) => void;
    currentThemeVariant: ThemeVariant;
    setThemeVariant: (variant: ThemeVariant) => void;
    userProfile: UserProfile | null;
    organization: Organization | null;
    onSaveOrganization: (orgUpdate: Partial<Omit<Organization, 'id'>>, logoFile?: File) => void;
}

const ThemePreview: React.FC<{ variant: ThemeVariant; name: string; isActive: boolean; onClick: () => void; }> = ({ variant, name, isActive, onClick }) => {
    const classicColors = { bg: 'bg-slate-100', sidebar: 'bg-white', accent: 'bg-blue-500' };
    const vibrantColors = { bg: 'bg-slate-50', sidebar: 'bg-white', accent: 'bg-purple-600' };
    const colors = variant === 'classic' ? classicColors : vibrantColors;
    
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
    userProfile, 
    organization, 
    onSaveOrganization 
}) => {
    const [orgName, setOrgName] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && organization) {
            setOrgName(organization.name);
            setLogoPreview(organization.logoUrl || null);
        }
        return () => { // Cleanup on close
            setLogoFile(null);
            if (logoPreview && logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(logoPreview);
            }
        };
    }, [isOpen, organization]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            // Revoke old blob URL if it exists
            if (logoPreview && logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(logoPreview);
            }
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = () => {
        const orgUpdate: Partial<Omit<Organization, 'id'>> = {};
        if (orgName !== organization?.name) {
            orgUpdate.name = orgName;
        }
        onSaveOrganization(orgUpdate, logoFile || undefined);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-[var(--background-secondary)] rounded-xl shadow-2xl p-6 w-full max-w-2xl m-4 transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ThemePreview variant="classic" name="Clássico" isActive={currentThemeVariant === 'classic'} onClick={() => setThemeVariant('classic')} />
                            <ThemePreview variant="vibrant" name="Vibrante" isActive={currentThemeVariant === 'vibrant'} onClick={() => setThemeVariant('vibrant')} />
                        </div>
                    </div>
                    
                    {/* Organization Settings for Admins */}
                    {(userProfile?.role === UserRole.ADMIN || userProfile?.role === UserRole.MANAGER) && organization && (
                        <div className="pt-6 border-t border-[var(--border-primary)]">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><BriefcaseIcon className="w-5 h-5"/> Organização</h3>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="org-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nome da Organização</label>
                                    <input
                                        type="text"
                                        id="org-name"
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2 text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Logo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-[var(--background-tertiary)] rounded-lg flex items-center justify-center">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Preview" className="w-full h-full object-contain rounded-lg"/>
                                            ) : (
                                                <PhotoIcon className="w-8 h-8 text-[var(--text-tertiary)]"/>
                                            )}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/*" className="hidden"/>
                                        <button onClick={() => fileInputRef.current?.click()} className="bg-[var(--background-secondary)] hover:bg-[var(--background-secondary-hover)] text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg border border-[var(--border-secondary)] text-sm">
                                            Alterar Logo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-[var(--border-primary)] flex justify-end">
                    <button onClick={handleSave} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-bold py-2 px-4 rounded-lg">
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
