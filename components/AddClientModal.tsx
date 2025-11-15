import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Client, Contact } from '../types';
import { XMarkIcon, UserIcon } from './icons';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Omit<Client, 'id'>, contact?: Omit<Contact, 'id' | 'clientId'>) => void;
}

const maskCnpj = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .substring(0, 18);
};

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onSave }) => {
    // Client fields
    const [name, setName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    
    // Contact fields
    const [addContact, setAddContact] = useState(false);
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');

    // CNPJ Fetch states
    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    const [cnpjError, setCnpjError] = useState<string | null>(null);
    const [companyIsFromApi, setCompanyIsFromApi] = useState(false);
    const debounceTimeoutRef = useRef<number | null>(null);

    const resetForm = useCallback(() => {
        setName(''); setCnpj(''); setAddress(''); setNotes('');
        setAddContact(false);
        setContactName(''); setContactEmail(''); setContactPhone('');
        setIsFetchingCnpj(false); setCnpjError(null); setCompanyIsFromApi(false);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

        const cleanedCnpj = cnpj.replace(/\D/g, '');
        if (cleanedCnpj.length !== 14) {
            if (companyIsFromApi) setName('');
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
                setName(data.razao_social || '');
                setCompanyIsFromApi(true);
                setCnpjError(null);
            } catch (error) {
                setCnpjError(error instanceof Error ? error.message : 'Erro ao buscar CNPJ.');
                setName('');
                setCompanyIsFromApi(false);
            } finally {
                setIsFetchingCnpj(false);
            }
        }, 1000);
    }, [cnpj, isOpen, companyIsFromApi]);

    const handleSave = () => {
        if (!name.trim()) return alert('O nome do cliente é obrigatório.');
        if (addContact && !contactName.trim()) return alert('O nome do contato é obrigatório.');

        const clientData = { name, cnpj, address, notes };
        const contactData = addContact ? { name: contactName, email: contactEmail, phone: contactPhone } : undefined;

        onSave(clientData, contactData);
        onClose();
    };
    
    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-lg m-4 transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Novo Cliente</h2>
                    <button onClick={handleClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">CNPJ (preenchimento automático)</label>
                        <input type="text" value={cnpj} maxLength={18} onChange={(e) => setCnpj(maskCnpj(e.target.value))} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100" placeholder="Digite para buscar os dados" />
                        {isFetchingCnpj && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Buscando dados do CNPJ...</p>}
                        {cnpjError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{cnpjError}</p>}
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome / Razão Social</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} readOnly={companyIsFromApi} className={`w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 ${companyIsFromApi ? 'cursor-not-allowed' : ''}`} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Endereço (Opcional)</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Anotações Iniciais (Opcional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100" placeholder="Informações importantes sobre o cliente..."></textarea>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={addContact} onChange={(e) => setAddContact(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Adicionar contato principal</span>
                        </label>
                    </div>

                    {addContact && (
                        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg space-y-3 border border-gray-200 dark:border-slate-600">
                            <h3 className="font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2"><UserIcon className="w-5 h-5"/> Contato Principal</h3>
                            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nome do Contato" className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="E-mail (Opcional)" className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                            <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Telefone (Opcional)" className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={handleClose} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600">Cancelar</button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar Cliente</button>
                </div>
            </div>
        </div>
    );
};
export default AddClientModal;