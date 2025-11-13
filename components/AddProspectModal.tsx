import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Prospect } from '../types';
import { XMarkIcon } from './icons';

interface AddProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prospect: Omit<Prospect, 'id' | 'stageId' | 'userId' | 'organizationId' | 'createdAt'>) => void;
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

const AddProspectModal: React.FC<AddProspectModalProps> = ({ isOpen, onClose, onSave }) => {
    const [cnpj, setCnpj] = useState('');
    const [company, setCompany] = useState('');
    const [name, setName] = useState(''); // contact name
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [source, setSource] = useState('');
    const [nextContactDate, setNextContactDate] = useState('');

    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    const [cnpjError, setCnpjError] = useState<string | null>(null);
    const [companyIsFromApi, setCompanyIsFromApi] = useState(false);
    
    const debounceTimeoutRef = useRef<number | null>(null);

    const resetForm = useCallback(() => {
        setCnpj('');
        setCompany('');
        setName('');
        setEmail('');
        setPhone('');
        setNotes('');
        setSource('');
        setNextContactDate('');
        setCnpjError(null);
        setIsFetchingCnpj(false);
        setCompanyIsFromApi(false);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        const cleanedCnpj = cnpj.replace(/\D/g, '');
        
        if (cleanedCnpj.length !== 14) {
            if (companyIsFromApi) {
                setCompany('');
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
                setCompany(data.razao_social || '');
                setCompanyIsFromApi(true);
                setCnpjError(null);
            } catch (error) {
                setCnpjError(error instanceof Error ? error.message : 'Erro ao buscar CNPJ.');
                setCompany('');
                setCompanyIsFromApi(false);
            } finally {
                setIsFetchingCnpj(false);
            }
        }, 1000); // 1 second debounce
        
    }, [cnpj, isOpen, companyIsFromApi]);


    const handleSave = () => {
        if (!name || !company) {
            alert('Por favor, preencha o nome do contato e a empresa.');
            return;
        }
        
        onSave({ name, company, cnpj, email, phone, notes, source, nextContactDate });
        resetForm();
        onClose();
    };
    
    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const maskedValue = maskCnpj(e.target.value);
        setCnpj(maskedValue);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-lg m-4 transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Novo Prospect</h2>
                    <button onClick={handleClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">CNPJ (preenchimento automático)</label>
                        <input type="text" value={cnpj} maxLength={18} onChange={handleCnpjChange} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500" placeholder="Digite o CNPJ para buscar" />
                        {isFetchingCnpj && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Buscando dados do CNPJ...</p>}
                        {cnpjError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{cnpjError}</p>}
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Empresa / Razão Social</label>
                        <input type="text" value={company} onChange={e => setCompany(e.target.value)} readOnly={companyIsFromApi} className={`w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500 ${companyIsFromApi ? 'bg-gray-200 dark:bg-slate-600 cursor-not-allowed' : ''}`} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome do Contato</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500" placeholder="Pessoa de referência na empresa" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Origem (Opcional)</label>
                            <input type="text" value={source} onChange={e => setSource(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500" placeholder="Indicação, Site, Evento..." />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Próximo Contato (Opcional)</label>
                             <input type="date" value={nextContactDate} onChange={e => setNextContactDate(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500 dark:[color-scheme:dark]" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">E-mail</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Telefone</label>
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Observações</label>
                         <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={handleClose} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600">Cancelar</button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar Prospect</button>
                </div>
            </div>
        </div>
    );
};

export default AddProspectModal;