import React, { useState } from 'react';
import { XMarkIcon } from './icons';

export const lostReasons = [
    'Preço',
    'Concorrência',
    'Timing / Sem Urgência',
    'Falta de Orçamento',
    'Solução não adequada',
    'Contato sem resposta',
    'Outro'
];

interface LostReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string, notes: string) => void;
}

const LostReasonModal: React.FC<LostReasonModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    const handleConfirm = () => {
        if (!reason) {
            alert('Por favor, selecione um motivo.');
            return;
        }
        onConfirm(reason, notes);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-[var(--background-secondary)] rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 transform transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Registrar Motivo da Perda</h2>
                    <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <p className="text-sm text-[var(--text-secondary)]">Selecionar o motivo nos ajuda a entender e melhorar.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {lostReasons.map(r => (
                            <button
                                key={r}
                                onClick={() => setReason(r)}
                                className={`p-3 text-sm font-semibold rounded-lg border-2 transition-all ${
                                    reason === r
                                        ? 'border-[var(--accent-primary)] bg-[var(--background-accent-subtle)] text-[var(--text-accent)]'
                                        : 'border-[var(--border-secondary)] hover:border-[var(--text-accent)]'
                                }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    {reason === 'Outro' && (
                         <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Especifique o motivo</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                                placeholder="Descreva brevemente por que o negócio foi perdido..."
                                className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2"
                            />
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600">Cancelar</button>
                    <button onClick={handleConfirm} disabled={!reason} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-red-400">
                        Confirmar Perda
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LostReasonModal;