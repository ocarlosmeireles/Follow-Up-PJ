import React, { useState, useEffect } from 'react';
import type { ProspectingStage } from '../types';
import { XMarkIcon, PlusIcon } from './icons';

interface StageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: ProspectingStage[];
  onSave: (stages: ProspectingStage[]) => void;
}

const StageSettingsModal: React.FC<StageSettingsModalProps> = ({ isOpen, onClose, stages, onSave }) => {
    const [localStages, setLocalStages] = useState<ProspectingStage[]>([]);

    useEffect(() => {
        if (isOpen) {
            setLocalStages([...stages].sort((a, b) => a.order - b.order));
        }
    }, [isOpen, stages]);

    const handleStageNameChange = (id: string, newName: string) => {
        setLocalStages(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
    };

    const handleAddStage = () => {
        const newStage: ProspectingStage = {
            id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: 'Nova Etapa',
            organizationId: stages.length > 0 ? stages[0].organizationId : '',
            order: localStages.length > 0 ? Math.max(...localStages.map(s => s.order)) + 1 : 0
        };
        setLocalStages(prev => [...prev, newStage]);
    };

    const handleRemoveStage = (id: string) => {
        // Here you might want to add logic to handle prospects in the stage being deleted
        if (window.confirm('Tem certeza que deseja remover esta etapa? Prospects nesta etapa precisarão ser movidos manualmente.')) {
            setLocalStages(prev => prev.filter(s => s.id !== id));
        }
    };
    
    const handleSave = () => {
        const stagesWithOrder = localStages.map((stage, index) => ({ ...stage, order: index }));
        onSave(stagesWithOrder);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-lg m-4 transform transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Configurar Etapas de Prospecção</h2>
                    <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {localStages.map(stage => (
                        <div key={stage.id} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={stage.name}
                                onChange={(e) => handleStageNameChange(stage.id, e.target.value)}
                                className="flex-grow bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-gray-900 dark:text-slate-100 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button onClick={() => handleRemoveStage(stage.id)} className="text-red-500 hover:text-red-600 p-2">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="mt-4">
                    <button onClick={handleAddStage} className="w-full flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500 rounded-lg p-2 transition">
                        <PlusIcon className="w-5 h-5" />
                        Adicionar Etapa
                    </button>
                </div>
                <div className="mt-6 flex justify-end space-x-4">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600">Cancelar</button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar Alterações</button>
                </div>
            </div>
        </div>
    );
};

export default StageSettingsModal;