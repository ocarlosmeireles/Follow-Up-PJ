import React, { useState, useEffect } from 'react';
import type { UserData, UserProfile } from '../types';
import { XMarkIcon } from './icons';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Partial<UserProfile>) => void;
  userProfile: UserData;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSave, userProfile }) => {
    const [name, setName] = useState('');
    const [matricula, setMatricula] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        if (isOpen) {
            setName(userProfile.name);
            setMatricula(userProfile.matricula);
            setEmail(userProfile.email);
        }
    }, [isOpen, userProfile]);

    const handleSave = () => {
        if (!name.trim() || !matricula.trim()) {
            alert('Nome e matrícula são obrigatórios.');
            return;
        }
        onSave({ name, matricula, email });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md m-4 transform transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Editar Perfil</h2>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome Completo</label>
                        <input
                            type="text"
                            id="profile-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="profile-matricula" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Matrícula</label>
                        <input
                            type="text"
                            id="profile-matricula"
                            value={matricula}
                            onChange={(e) => setMatricula(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">E-mail</label>
                        <input
                            type="email"
                            id="profile-email"
                            value={email}
                            readOnly
                            className="w-full bg-gray-200 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-500 dark:text-slate-400 cursor-not-allowed"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600">Cancelar</button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
