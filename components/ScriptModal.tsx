import React, { useState, useEffect } from 'react';
import type { Script, ScriptCategory } from '../types';
import { scriptCategories } from '../types';
import { XMarkIcon } from './icons';

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (scriptData: Omit<Script, 'id' | 'organizationId' | 'userId'>, scriptId: string | null) => void;
  scriptToEdit: Script | null;
}

const ScriptModal: React.FC<ScriptModalProps> = ({ isOpen, onClose, onSave, scriptToEdit }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<ScriptCategory>('Prospecção Fria');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (scriptToEdit) {
                setTitle(scriptToEdit.title);
                setContent(scriptToEdit.content);
                setCategory(scriptToEdit.category);
            } else {
                setTitle('');
                setContent('');
                setCategory('Prospecção Fria');
            }
            setError('');
        }
    }, [isOpen, scriptToEdit]);

    const handleSave = () => {
        if (!title.trim() || !content.trim()) {
            setError('Título e conteúdo são obrigatórios.');
            return;
        }
        onSave({ title, content, category }, scriptToEdit?.id || null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-lg m-4 transform transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{scriptToEdit ? 'Editar Script' : 'Novo Script'}</h2>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Título do Script</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Categoria</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as ScriptCategory)}
                            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2"
                        >
                            {scriptCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Conteúdo da Mensagem</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={8}
                            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 font-mono text-sm"
                            placeholder="Use [Nome do Cliente], [Valor da Proposta], etc."
                        />
                         <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Use placeholders como [Nome do Cliente] para preenchimento automático.</p>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600">Cancelar</button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar</button>
                </div>
            </div>
        </div>
    );
};

export default ScriptModal;
