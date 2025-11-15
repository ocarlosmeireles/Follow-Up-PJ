import React, { useState, useCallback } from 'react';
import { UserRole } from '../types';
import { XMarkIcon, EnvelopeIcon } from './icons';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (email: string, role: UserRole) => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onAddUser }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.SALESPERSON);
    const [error, setError] = useState('');

    const resetForm = useCallback(() => {
        setEmail('');
        setRole(UserRole.SALESPERSON);
        setError('');
    }, []);
    
    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleAdd = () => {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Por favor, insira um e-mail válido.');
            return;
        }
        setError('');
        onAddUser(email.toLowerCase(), role);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md m-4 transform transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Convidar Novo Usuário</h2>
                    <button onClick={handleClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                    Um convite será enviado para o e-mail informado. O usuário precisará criar uma conta para se juntar à sua organização.
                </p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">E-mail do Usuário</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                            </span>
                            <input
                                type="email"
                                id="user-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="exemplo@empresa.com"
                                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-3 pl-10 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="user-role" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Cargo</label>
                        <select
                            id="user-role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value={UserRole.SALESPERSON}>Vendedor(a)</option>
                            <option value={UserRole.MANAGER}>Gerente</option>
                            <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                    </div>
                     {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={handleClose} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600">Cancelar</button>
                    <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Enviar Convite</button>
                </div>
            </div>
        </div>
    );
};

export default AddUserModal;
