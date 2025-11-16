import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Prospect } from '../types';
import { XMarkIcon } from './icons';

interface AddProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prospect: Omit<Prospect, 'id' | 'stageId' | 'userId' | 'organizationId' | 'createdAt'>) => Promise<void>;
}

const maskCnpj = (value: string) => {
    return value
        .replace(/\D/g, '') // Remove all non-digit characters
        .replace(/^(\d{2})(\d)/, '$1.$2') // Add dot after first 2 digits
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3') // Add dot after next 3 digits
        .replace(/\.(\d{3})(\d)/, '.$1/$2') // Add slash after next 3 digits
        .replace(/(\d{4})(\d)/, '$1-$2') // Add dash after next 4 digits
        .substring(0, 18); // Limit to CNPJ format length (18 characters)
};

const unmaskCurrency = (maskedValue: string): number => {
    if (!maskedValue) return 0;
    const numericString = maskedValue.replace(/\./g, '').replace(',', '.');
    return parseFloat(numericString);
};

const formatCurrencyForInput = (value: string): string => {
    if (!value) return '';
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly === '') return '';
    
    const numberValue = parseInt(digitsOnly, 10) / 100;

    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numberValue);
};

const AddProspectModal: React.FC<AddProspectModalProps> = ({ isOpen, onClose, onSave }) => {
    const [prospect, setProspect] = useState<Partial<Omit<Prospect, 'id' | 'stageId' | 'userId' | 'organizationId' | 'createdAt'>>>({});
    const [estimatedBudgetString, setEstimatedBudgetString] = useState('');

    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    const [cnpjError, setCnpjError] = useState<string | null>(null);
    const [companyIsFromApi, setCompanyIsFromApi] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const debounceTimeoutRef = useRef<number | null>(null);

    const resetForm = useCallback(() => {
        setProspect({});
        setEstimatedBudgetString('');
        setCnpjError(null);
        setIsFetchingCnpj(false);
        setCompanyIsFromApi(false);
        setIsSaving(false);
    }, []);

    const handleChange = (field: keyof Prospect, value: any) => {
        setProspect(prev => ({ ...prev, [field]: value }));
    };
    
    const handleSocialChange = (platform: 'linkedin' | 'instagram' | 'facebook', value: string) => {
        setProspect(prev => ({
            ...prev,
            socialMedia: {
                ...prev.socialMedia,
                [platform]: value
            }
        }))
    }

    useEffect(() => {
        if (!isOpen) return;

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        const cleanedCnpj = prospect.cnpj?.replace(/\D/g, '') || '';
        
        if (cleanedCnpj.length !== 14) {
            if (companyIsFromApi) {
                handleChange('company', '');
            }
            setCompanyIsFromApi(false);
            setCnpjError(null);
            setIsFetchingCnpj(false);
            return;
        }
        
        setCnpjError(null);
        setIsFetchingCnpj(true);

        debounceTimeoutRef.current = window.setTimeout(async () => {
            try {
                const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanedCnpj}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'CNPJ não encontrado ou inválido.');
                }
                const data = await response.json();
                setProspect(prev => ({
                    ...prev,
                    company: data.razao_social || '',
                    address: `${data.logradouro}, ${data.numero}, ${data.bairro}, ${data.municipio} - ${data.uf}`,
                    landline: data.ddd_telefone_1 || '',
                }));
                setCompanyIsFromApi(true);
                setCnpjError(null);
            } catch (error) {
                setCnpjError(error instanceof Error ? error.message : 'Erro ao buscar CNPJ.');
                handleChange('company', '');
                setCompanyIsFromApi(false);
            } finally {
                setIsFetchingCnpj(false);
            }
        }, 1000);
        
    }, [prospect.cnpj, isOpen, companyIsFromApi]);


    const handleSave = async () => {
        if (!prospect.name || !prospect.company) {
            alert('Por favor, preencha o nome do contato e a empresa.');
            return;
        }
        
        setIsSaving(true);
        const finalProspect = {
            ...prospect,
            estimatedBudget: unmaskCurrency(estimatedBudgetString)
        };
        
        try {
            await onSave(finalProspect as any);
            resetForm();
            onClose();
        } catch (error) {
            console.error("Failed to save prospect:", error);
            alert(`Ocorreu um erro ao salvar o prospect: ${error instanceof Error ? error.message : 'Erro desconhecido.'}. Verifique o console para mais detalhes.`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-2xl m-4 transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Novo Prospect (Lead)</h2>
                    <button onClick={handleClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">CNPJ</label>
                            <input type="text" value={prospect.cnpj || ''} maxLength={18} onChange={e => handleChange('cnpj', maskCnpj(e.target.value))} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" placeholder="Digite para buscar" />
                            {isFetchingCnpj && <p className="text-xs text-blue-500 mt-1">Buscando dados...</p>}
                            {cnpjError && <p className="text-xs text-red-500 mt-1">{cnpjError}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome da Empresa <span className="text-red-500">*</span></label>
                            <input type="text" value={prospect.company || ''} onChange={e => handleChange('company', e.target.value)} readOnly={companyIsFromApi} className={`w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 ${companyIsFromApi ? 'cursor-not-allowed' : ''}`} />
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Segmento</label>
                            <input type="text" value={prospect.segment || ''} onChange={e => handleChange('segment', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Porte da Empresa</label>
                            <select value={prospect.companySize || ''} onChange={e => handleChange('companySize', e.target.value || undefined)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2">
                                <option value="">Não informado</option>
                                <option value="Pequena">Pequena</option>
                                <option value="Média">Média</option>
                                <option value="Grande">Grande</option>
                            </select>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Endereço</label>
                        <input type="text" value={prospect.address || ''} onChange={e => handleChange('address', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Telefone Fixo</label>
                            <input type="tel" value={prospect.landline || ''} onChange={e => handleChange('landline', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Celular / WhatsApp</label>
                            <input type="tel" value={prospect.phone || ''} onChange={e => handleChange('phone', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">E-mail Corporativo</label>
                        <input type="email" value={prospect.email || ''} onChange={e => handleChange('email', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Website</label>
                            <input type="url" value={prospect.website || ''} onChange={e => handleChange('website', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" placeholder="https://..." />
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">LinkedIn (URL)</label>
                            <input type="url" value={prospect.socialMedia?.linkedin || ''} onChange={e => handleSocialChange('linkedin', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" placeholder="https://linkedin.com/company/..."/>
                        </div>
                    </div>
                     <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                        <h3 className="text-lg font-semibold mb-2">Contato Principal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome do Contato <span className="text-red-500">*</span></label>
                                <input type="text" value={prospect.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Cargo</label>
                                <input type="text" value={prospect.role || ''} onChange={e => handleChange('role', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                            </div>
                        </div>
                    </div>
                     <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                        <h3 className="text-lg font-semibold mb-2">Detalhes da Oportunidade</h3>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Necessidade Identificada</label>
                            <input type="text" value={prospect.identifiedNeed || ''} onChange={e => handleChange('identifiedNeed', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Produtos de Interesse</label>
                            <input type="text" value={prospect.productsOfInterest || ''} onChange={e => handleChange('productsOfInterest', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Orçamento Estimado</label>
                                <input type="text" inputMode="decimal" value={estimatedBudgetString} onChange={e => setEstimatedBudgetString(formatCurrencyForInput(e.target.value))} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" placeholder="R$ 0,00" />
                            </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nível de Urgência</label>
                                <select value={prospect.urgencyLevel || ''} onChange={e => handleChange('urgencyLevel', e.target.value || undefined)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2">
                                    <option value="">Não informado</option>
                                    <option value="Baixa">Baixa</option>
                                    <option value="Média">Média</option>
                                    <option value="Alta">Alta</option>
                                </select>
                            </div>
                        </div>
                    </div>
                     <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                        <h3 className="text-lg font-semibold mb-2">Follow-up</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Canal de Origem</label>
                                <input type="text" value={prospect.source || ''} onChange={e => handleChange('source', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" placeholder="Indicação, Site, Evento..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Data do Próximo Contato</label>
                                <input type="date" value={prospect.nextContactDate || ''} onChange={e => handleChange('nextContactDate', e.target.value || null)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 dark:[color-scheme:dark]" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Observações Estratégicas</label>
                            <textarea value={prospect.notes || ''} onChange={e => handleChange('notes', e.target.value)} rows={3} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                        </div>
                     </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={handleClose} disabled={isSaving} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg min-w-[140px] flex justify-center items-center disabled:bg-blue-400">
                        {isSaving ? (
                             <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Salvar Prospect'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddProspectModal;