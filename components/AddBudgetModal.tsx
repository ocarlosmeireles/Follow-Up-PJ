import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Budget, Client, Contact } from '../types';
import { XMarkIcon, PlusIcon } from './icons';

interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
      budgetData: Omit<Budget, 'id' | 'followUps' | 'status' | 'userId' | 'organizationId' | 'clientId' | 'contactId'>,
      clientInfo: { existingId?: string; newClientData?: Omit<Client, 'id' | 'userId' | 'organizationId'> },
      contactInfo: { existingId?: string; newContactData?: Omit<Contact, 'id' | 'clientId' | 'organizationId'> }
  ) => void;
  clients: Client[];
  contacts: Contact[];
  prospectData?: { clientName: string; contactName: string; contactInfo: string; clientCnpj?: string } | null;
  initialClientId?: string | null;
}

const today = new Date().toISOString().split('T')[0];

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
    // Removes thousand separators, replaces decimal comma with a dot
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


const AddBudgetModal: React.FC<AddBudgetModalProps> = ({ isOpen, onClose, onSave, clients, contacts, prospectData, initialClientId }) => {
    // Budget fields
    const [title, setTitle] = useState('');
    const [value, setValue] = useState('');
    const [dateSent, setDateSent] = useState(today);
    const [observations, setObservations] = useState('');

    // Client fields
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [newClientAddress, setNewClientAddress] = useState('');
    const [newClientCnpj, setNewClientCnpj] = useState('');
    const [newClientNotes, setNewClientNotes] = useState('');
    const isNewClient = !selectedClientId && clientSearch.length > 0;

    // Contact fields
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [showNewContactForm, setShowNewContactForm] = useState(false);
    const [newContactName, setNewContactName] = useState('');
    const [newContactEmail, setNewContactEmail] = useState('');
    const [newContactPhone, setNewContactPhone] = useState('');
    const isNewContact = showNewContactForm;
    const availableContacts = selectedClientId ? contacts.filter(c => c.clientId === selectedClientId) : [];
    
    // CNPJ Fetch states
    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
    const [cnpjError, setCnpjError] = useState<string | null>(null);
    const [companyIsFromApi, setCompanyIsFromApi] = useState(false);
    const debounceTimeoutRef = useRef<number | null>(null);

    const resetForm = useCallback(() => {
        setTitle(''); setValue(''); setDateSent(today); setObservations('');
        setClientSearch(''); setSelectedClientId(''); setNewClientAddress(''); setNewClientCnpj(''); setNewClientNotes('');
        setSelectedContactId(null); setShowNewContactForm(false);
        setNewContactName(''); setNewContactEmail(''); setNewContactPhone('');
        setIsFetchingCnpj(false); setCnpjError(null); setCompanyIsFromApi(false);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            resetForm();
            return;
        }

        if (initialClientId) {
            const client = clients.find(c => c.id === initialClientId);
            if (client) {
                setSelectedClientId(client.id);
                setClientSearch(client.name);
            }
        } else if (prospectData) {
            const existingClient = clients.find(c => c.name.toLowerCase() === prospectData.clientName.toLowerCase() || (prospectData.clientCnpj && c.cnpj === prospectData.clientCnpj));
            if (existingClient) {
                setSelectedClientId(existingClient.id);
                setClientSearch(existingClient.name);
            } else {
                setClientSearch(prospectData.clientName);
                setNewClientCnpj(prospectData.clientCnpj || '');
            }
            setShowNewContactForm(true);
            setNewContactName(prospectData.contactName);
            if (prospectData.contactInfo.includes('@')) {
                setNewContactEmail(prospectData.contactInfo);
            } else {
                setNewContactPhone(prospectData.contactInfo);
            }
        }
    }, [isOpen, initialClientId, prospectData, clients, resetForm]);
    
    // Effect for CNPJ fetching
    useEffect(() => {
        if (!isOpen || !isNewClient) return;

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        const cleanedCnpj = newClientCnpj.replace(/\D/g, '');
        
        if (cleanedCnpj.length !== 14) {
            if (companyIsFromApi) {
                setClientSearch('');
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
                setClientSearch(data.razao_social || '');
                setCompanyIsFromApi(true);
                setCnpjError(null);
            } catch (error) {
                setCnpjError(error instanceof Error ? error.message : 'Erro ao buscar CNPJ.');
                setClientSearch('');
                setCompanyIsFromApi(false);
            } finally {
                setIsFetchingCnpj(false);
            }
        }, 1000); // 1 second debounce
        
    }, [newClientCnpj, isOpen, companyIsFromApi, isNewClient]);

    useEffect(() => {
        if (clientSearch.length > 0 && !selectedClientId) {
            const searchLower = clientSearch.toLowerCase();
            const cleanedSearch = searchLower.replace(/\D/g, '');
            const filtered = clients.filter(client => 
                client.name.toLowerCase().includes(searchLower) ||
                (cleanedSearch.length > 0 && client.cnpj && client.cnpj.replace(/\D/g, '').includes(cleanedSearch))
            );
            setClientSuggestions(filtered);
            setShowClientSuggestions(filtered.length > 0 && !companyIsFromApi);
        } else {
            setClientSuggestions([]);
            setShowClientSuggestions(false);
        }
    }, [clientSearch, clients, selectedClientId, companyIsFromApi]);

    const handleSave = () => {
        const budgetValue = unmaskCurrency(value);
        if (!title || isNaN(budgetValue) || budgetValue <= 0) return alert('Por favor, preencha o título e um valor válido.');
        if (!selectedClientId && !isNewClient) return alert('Selecione ou cadastre um cliente.');
        if (isNewClient && !clientSearch) return alert('Digite o nome do novo cliente.');
        if (!selectedContactId && !isNewContact) return alert('Selecione ou cadastre um comprador.');
        if (isNewContact && !newContactName) return alert('Digite o nome do novo comprador.');

        const budgetData = { title, value: budgetValue, dateSent, nextFollowUpDate: null, observations };
        
        const clientInfo = {
            existingId: selectedClientId || undefined,
            newClientData: isNewClient ? { name: clientSearch, address: newClientAddress, cnpj: newClientCnpj, notes: newClientNotes } : undefined
        };
        
        const contactInfo = {
            existingId: selectedContactId || undefined,
            newContactData: isNewContact ? { name: newContactName, email: newContactEmail, phone: newContactPhone } : undefined
        };

        onSave(budgetData, clientInfo, contactInfo);
        onClose();
    };
    
    const handleClose = () => {
        onClose();
    };

    const handleSelectClient = (client: Client) => {
        setSelectedClientId(client.id);
        setClientSearch(client.name);
        setShowClientSuggestions(false);
    };

    const handleClientSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setClientSearch(e.target.value);
        if (selectedClientId) {
            setSelectedClientId('');
            setSelectedContactId(null);
            setShowNewContactForm(false);
        }
        if(companyIsFromApi) {
            setCompanyIsFromApi(false);
        }
    };

    const handleContactSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === 'new') {
            setSelectedContactId(null);
            setShowNewContactForm(true);
        } else {
            setSelectedContactId(e.target.value);
            setShowNewContactForm(false);
        }
    }
    
    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const maskedValue = maskCnpj(e.target.value);
        setNewClientCnpj(maskedValue);
    };

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formattedValue = formatCurrencyForInput(e.target.value);
        setValue(formattedValue);
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-40">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 transform transition-all max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Novo Orçamento</h2>
                    <button onClick={handleClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    {/* Budget Details */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Título do Orçamento</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Valor</label>
                            <input 
                               type="text"
                               inputMode="decimal"
                               value={value} 
                               onChange={handleValueChange}
                               placeholder="0,00"
                               className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Data de Envio</label>
                            <input type="date" value={dateSent} onChange={e => setDateSent(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500 dark:[color-scheme:dark]" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Observações (Opcional)</label>
                        <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={2} placeholder="Detalhes específicos do orçamento..." className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"></textarea>
                    </div>

                    {/* Client Selection */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Cliente</label>
                        <input 
                           type="text" 
                           value={clientSearch} 
                           onChange={handleClientSearchChange} 
                           onFocus={() => !selectedClientId && setShowClientSuggestions(true)} 
                           onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)} 
                           placeholder="Digite o nome ou CNPJ para buscar ou cadastrar" 
                           readOnly={companyIsFromApi}
                           className={`w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500 ${companyIsFromApi ? 'bg-gray-200 dark:bg-slate-600 cursor-not-allowed' : ''}`}
                        />
                        {showClientSuggestions && clientSuggestions.length > 0 && (
                            <div className="absolute z-20 w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-b-lg shadow-lg max-h-40 overflow-y-auto">
                                {clientSuggestions.map(client => (
                                    <div key={client.id} onMouseDown={() => handleSelectClient(client)} className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/50 cursor-pointer">
                                        <p className="font-semibold dark:text-slate-100">{client.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{client.cnpj || client.id}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {isNewClient && (
                        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg space-y-3 border border-gray-200 dark:border-slate-600">
                            <h3 className="font-semibold text-gray-800 dark:text-slate-200">Cadastrar Novo Cliente "{clientSearch}"</h3>
                            <div>
                                <input type="text" value={newClientCnpj} maxLength={18} onChange={handleCnpjChange} placeholder="CNPJ (preenchimento automático)" className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100" />
                                {isFetchingCnpj && <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Buscando dados do CNPJ...</p>}
                                {cnpjError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{cnpjError}</p>}
                            </div>
                            <div><input type="text" value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} placeholder="Endereço (Opcional)" className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100" /></div>
                             <div>
                                <textarea 
                                    value={newClientNotes} 
                                    onChange={e => setNewClientNotes(e.target.value)} 
                                    placeholder="Anotações Iniciais (Opcional)"
                                    rows={2}
                                    className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100"
                                ></textarea>
                            </div>
                        </div>
                    )}

                    {/* Contact Selection */}
                    {(selectedClientId || isNewClient) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Comprador (Contato)</label>
                            <select onChange={handleContactSelectionChange} value={selectedContactId || (showNewContactForm ? 'new' : '')} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500">
                                <option value="" disabled>-- Selecione um comprador --</option>
                                {availableContacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                                <option value="new" className="font-bold text-blue-600">
                                    <PlusIcon className="w-4 h-4 inline mr-2"/> Cadastrar Novo Comprador
                                </option>
                            </select>
                        </div>
                    )}
                    {isNewContact && (selectedClientId || isNewClient) && (
                         <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg space-y-3 border border-gray-200 dark:border-slate-600">
                             <h3 className="font-semibold text-gray-800 dark:text-slate-200">Novo Comprador</h3>
                             <input type="text" value={newContactName} onChange={e => setNewContactName(e.target.value)} placeholder="Nome do Comprador" className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                             <input type="email" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} placeholder="E-mail (Opcional)" className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                             <input type="tel" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} placeholder="Telefone (Opcional)" className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2" />
                         </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={handleClose} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600">Cancelar</button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar</button>
                </div>
            </div>
        </div>
    );
};

export default AddBudgetModal;