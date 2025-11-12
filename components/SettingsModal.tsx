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
    const colors = {
        classic: { bg: 'bg-slate-100', sidebar: 'bg-white', accent: 'bg-blue-500', text: 'text-slate-500' },
        vibrant: { bg: 'bg-gray-50', sidebar: 'bg-white', accent: 'bg-indigo-600', text: 'text-gray-500' }
    };
    const currentColors = colors[variant];
    return (
        <div onClick={onClick} className={`cursor-pointer rounded-lg p-2 border-2 transition-all ${isActive ? 'border-blue-500' : 'border-transparent hover:border-gray-300 dark:hover:border-slate-600'}`}>
            <div className={`w-full h-24 ${currentColors.bg} rounded-md p-2 flex gap-2 overflow-hidden`}>
                <div className={`w-1/4 h-full ${currentColors.sidebar} rounded`}>
                    <div className={`w-3/4 h-2 ${currentColors.accent} rounded-full mx-auto mt-2`}></div>
                    <div className="w-3/4 h-1 bg-gray-300 rounded-full mx-auto mt-2"></div>
                    <div className="w-1/2 h-1 bg-gray-300 rounded-full mx-auto mt-1"></div>
                </div>
                <div className="w-3/4 h-full space-y-2">
                    <div className="w-1/2 h-2 bg-gray-300 rounded-full"></div>
                    <div className="w-full h-8 bg-white rounded flex items-center justify-between p-2">
                         <div className="w-1/3 h-2 bg-gray-300 rounded-full"></div>
                         <div className={`w-1/4 h-4 ${currentColors.accent} rounded`}></div>
                    </div>
                </div>
            </div>
            <p className={`text-center text-sm font-semibold mt-2 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-slate-300'}`}>{name}</p>
        </div>
    );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentThemeVariant, setThemeVariant, userProfile, organization, onSaveOrganization }) => {
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

    const isAdmin = userProfile?.role === UserRole.ADMIN || userProfile?.role === UserRole.SUPER_ADMIN;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 transition-opacity">
            <div className="bg-[var(--background-secondary)] rounded-xl shadow-2xl p-6 w-full max-w-2xl m-4 transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Configurações</h2>
                    <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="space-y-8">
                    {/* Theme Settings */}
                    <div>
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Aparência</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <ThemePreview variant="classic" name="Classic" isActive={currentThemeVariant === 'classic'} onClick={() => setThemeVariant('classic')} />
                            <ThemePreview variant="vibrant" name="Vibrant" isActive={currentThemeVariant === 'vibrant'} onClick={() => setThemeVariant('vibrant')} />
                        </div>
                    </div>
                    
                    {/* Organization Settings */}
                    {isAdmin && organization && (
                         <div>
                            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                <BriefcaseIcon className="w-5 h-5" />
                                Dados da Empresa
                            </h3>
                            <div className="bg-[var(--background-tertiary)] p-4 rounded-lg space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0">
                                        <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleLogoChange} className="hidden" />
                                        <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 bg-[var(--background-secondary)] rounded-full flex items-center justify-center border-2 border-dashed border-[var(--border-secondary)] hover:border-[var(--text-accent)] transition-colors group">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Logo preview" className="w-full h-full rounded-full object-cover"/>
                                            ) : (
                                                <PhotoIcon className="w-8 h-8 text-[var(--text-tertiary)] group-hover:text-[var(--text-accent)] transition-colors" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="flex-grow">
                                        <label htmlFor="org-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nome da Empresa</label>
                                        <input
                                            type="text"
                                            id="org-name"
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            className="w-full bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg p-2 text-[var(--text-primary)] focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={onClose} className="bg-[var(--background-tertiary)] hover:bg-[var(--background-tertiary-hover)] text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg border border-[var(--border-primary)]">Fechar</button>
                    {isAdmin && <button onClick={handleSave} className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] font-bold py-2 px-4 rounded-lg">Salvar Alterações</button>}
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
