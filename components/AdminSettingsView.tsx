import React, { useState, useEffect, useRef } from 'react';
import type { Organization, UserProfile, ProspectingStage, UserData } from '../types';
import { BriefcaseIcon, PhotoIcon, PencilIcon, CheckCircleIcon, UserGroupIcon, TrashIcon, PlusIcon, FunnelIcon, BillingIcon } from './icons';
import type { ActiveView } from '../App';

interface AdminSettingsViewProps {
    organization: Organization;
    userProfile: UserProfile;
    stages: ProspectingStage[];
    users: UserData[];
    onSaveOrganization: (orgUpdate: Partial<Omit<Organization, 'id'>>, logoFile?: File) => void;
    onUpdateStages: (stages: ProspectingStage[]) => void;
    setActiveView: (view: ActiveView) => void;
}

const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
    organization,
    stages,
    users,
    onSaveOrganization,
    onUpdateStages,
    setActiveView,
}) => {
    // Organization State
    const [orgName, setOrgName] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isOrgDirty, setIsOrgDirty] = useState(false);

    // Stages State
    const [localStages, setLocalStages] = useState<ProspectingStage[]>([]);
    const [isStagesDirty, setIsStagesDirty] = useState(false);

    useEffect(() => {
        setOrgName(organization.name);
        setLogoPreview(organization.logoUrl || null);
        setIsOrgDirty(false);
        setLogoFile(null);
    }, [organization]);

    useEffect(() => {
        setLocalStages([...stages].sort((a, b) => a.order - b.order));
        setIsStagesDirty(false);
    }, [stages]);

    // --- Organization Logic ---
    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            if (logoPreview && logoPreview.startsWith('blob:')) {
                URL.revokeObjectURL(logoPreview);
            }
            setLogoPreview(URL.createObjectURL(file));
            setIsOrgDirty(true);
        }
    };

    const handleSaveOrg = () => {
        const orgUpdate: Partial<Omit<Organization, 'id'>> = {};
        if (orgName !== organization.name) {
            orgUpdate.name = orgName;
        }
        onSaveOrganization(orgUpdate, logoFile || undefined);
        setIsOrgDirty(false);
    };

    // --- Stages Logic ---
    const handleStageNameChange = (id: string, newName: string) => {
        setLocalStages(prev => prev.map(s => (s.id === id ? { ...s, name: newName } : s)));
        setIsStagesDirty(true);
    };
    
    const handleAddStage = () => {
        const newStage: ProspectingStage = {
            id: `new-${Date.now()}`,
            name: 'Nova Etapa',
            organizationId: organization.id,
            order: localStages.length > 0 ? Math.max(...localStages.map(s => s.order)) + 1 : 0
        };
        setLocalStages(prev => [...prev, newStage]);
        setIsStagesDirty(true);
    };
    
    const handleRemoveStage = (id: string) => {
        setLocalStages(prev => prev.filter(s => s.id !== id));
        setIsStagesDirty(true);
    };
    
    const handleSaveStages = () => {
        const stagesWithOrder = localStages.map((stage, index) => ({ ...stage, order: index }));
        onUpdateStages(stagesWithOrder);
        setIsStagesDirty(false);
    };

    const getSubscriptionStatusPill = (status: Organization['subscriptionStatus']) => {
        const styles = {
            active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
            trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
            past_due: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
            unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
            canceled: 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200',
        };
        const text = {
            active: 'Ativa',
            trial: 'Teste',
            past_due: 'Pendente',
            unpaid: 'Não Paga',
            canceled: 'Cancelada',
        }
        return <span className={`px-3 py-1 text-sm font-bold rounded-full whitespace-nowrap ${styles[status || 'canceled']}`}>{text[status || 'canceled']}</span>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Configurações de Administrador</h1>
                <p className="text-[var(--text-secondary)]">Gerencie as configurações da sua organização e fluxos de trabalho.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Organization Profile Card */}
                    <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] shadow-sm animated-item" style={{ animationDelay: '100ms' }}>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><BriefcaseIcon className="w-6 h-6"/> Perfil da Organização</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nome da Organização</label>
                                <input
                                    type="text"
                                    value={orgName}
                                    onChange={(e) => { setOrgName(e.target.value); setIsOrgDirty(true); }}
                                    className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-[var(--background-tertiary)] rounded-lg flex items-center justify-center">
                                        {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-contain rounded-lg"/> : <PhotoIcon className="w-8 h-8 text-[var(--text-tertiary)]"/>}
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/*" className="hidden"/>
                                    <button onClick={() => fileInputRef.current?.click()} className="bg-[var(--background-secondary)] hover:bg-[var(--background-secondary-hover)] text-[var(--text-secondary)] font-semibold py-2 px-4 rounded-lg border border-[var(--border-secondary)] text-sm">
                                        Alterar Logo
                                    </button>
                                </div>
                            </div>
                             {isOrgDirty && (
                                <div className="flex justify-end">
                                    <button onClick={handleSaveOrg} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                        <CheckCircleIcon className="w-5 h-5"/> Salvar Alterações
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Prospecting Stages Card */}
                    <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] shadow-sm animated-item" style={{ animationDelay: '200ms' }}>
                        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><FunnelIcon className="w-6 h-6"/> Funil de Prospecção</h3>
                        <div className="space-y-3">
                            {localStages.map(stage => (
                                <div key={stage.id} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={stage.name}
                                        onChange={(e) => handleStageNameChange(stage.id, e.target.value)}
                                        className="flex-grow bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2"
                                    />
                                    <button onClick={() => handleRemoveStage(stage.id)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30">
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleAddStage} className="w-full flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-2 mt-4 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition">
                            <PlusIcon className="w-5 h-5" /> Adicionar Etapa
                        </button>
                         {isStagesDirty && (
                            <div className="flex justify-end mt-4">
                                <button onClick={handleSaveStages} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                    <CheckCircleIcon className="w-5 h-5"/> Salvar Funil
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Users Card */}
                    <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] shadow-sm animated-item" style={{ animationDelay: '300ms' }}>
                         <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><UserGroupIcon className="w-6 h-6"/> Usuários</h3>
                         <div className="flex justify-between items-center bg-[var(--background-tertiary)] p-3 rounded-lg">
                            <p className="font-semibold">{users.length} membros na equipe</p>
                            <button onClick={() => setActiveView('users')} className="text-sm font-semibold text-blue-600 hover:underline">Gerenciar</button>
                         </div>
                    </div>
                    {/* Subscription Card */}
                     <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] shadow-sm animated-item" style={{ animationDelay: '400ms' }}>
                         <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2"><BillingIcon className="w-6 h-6"/> Assinatura</h3>
                         <div className="flex justify-between items-center bg-[var(--background-tertiary)] p-3 rounded-lg">
                            <div>
                                <p className="text-sm text-[var(--text-secondary)]">Status do plano</p>
                                {getSubscriptionStatusPill(organization.subscriptionStatus)}
                            </div>
                            <button className="text-sm font-semibold text-blue-600 hover:underline">Gerenciar</button>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsView;