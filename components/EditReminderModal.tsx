import React, { useState, useEffect } from 'react';
import type { Reminder } from '../types';
import { XMarkIcon, TrashIcon } from './icons';

interface EditReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: Reminder | null;
  onUpdate: (reminderId: string, updates: { title: string; reminderDateTime: string }) => void;
  onDelete: (reminderId: string) => void;
}

const EditReminderModal: React.FC<EditReminderModalProps> = ({ isOpen, onClose, reminder, onUpdate, onDelete }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    useEffect(() => {
        if (reminder) {
            const reminderDate = new Date(reminder.reminderDateTime);
            setTitle(reminder.title);
            // Ensure date is in YYYY-MM-DD format for the input
            setDate(reminderDate.toISOString().split('T')[0]);
            // Ensure time is in HH:mm format for the input
            setTime(reminderDate.toTimeString().slice(0, 5));
        }
    }, [reminder]);

    const handleUpdate = () => {
        if (!title.trim() || !reminder) return;
        const reminderDateTime = new Date(`${date}T${time}`).toISOString();
        onUpdate(reminder.id, { title, reminderDateTime });
        onClose();
    };

    const handleDelete = () => {
        if (reminder && window.confirm('Tem certeza que deseja excluir este lembrete?')) {
            onDelete(reminder.id);
            onClose();
        }
    };

    if (!isOpen || !reminder) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 transform transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Editar Lembrete</h2>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Título</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Data</label>
                            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 dark:[color-scheme:dark]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Horário</label>
                            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 dark:[color-scheme:dark]" />
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-between items-center">
                    <button onClick={handleDelete} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 font-semibold py-2 px-4 rounded-lg flex items-center gap-2">
                        <TrashIcon className="w-5 h-5" /> Excluir
                    </button>
                    <div className="space-x-4">
                        <button onClick={onClose} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600">Cancelar</button>
                        <button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar Alterações</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditReminderModal;
