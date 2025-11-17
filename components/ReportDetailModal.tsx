import React from 'react';
import type { Budget, Client } from '../types';
import { XMarkIcon, BriefcaseIcon } from './icons';

interface ReportDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        title: string;
        budgets: Budget[];
    };
    clients: Client[];
    onSelectBudget: (budgetId: string) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2 }).format(value);
};

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ isOpen, onClose, data, clients, onSelectBudget }) => {
    if (!isOpen) return null;

    const clientMap = new Map(clients.map(c => [c.id, c.name]));

    return (
        <div className="fixed inset-0 bg-gray-900/50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-[var(--background-secondary)] rounded-xl shadow-2xl p-6 w-full max-w-2xl m-4 transform transition-all max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] truncate" title={data.title}>{data.title}</h2>
                    <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto custom-scrollbar -mr-2 pr-2">
                    <div className="space-y-3">
                        {data.budgets.map(budget => (
                            <div
                                key={budget.id}
                                onClick={() => onSelectBudget(budget.id)}
                                className="bg-[var(--background-tertiary)] hover:bg-[var(--background-tertiary-hover)] p-3 rounded-lg cursor-pointer border border-[var(--border-secondary)] transition-colors"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-grow">
                                        <p className="font-bold text-[var(--text-primary)]">{budget.title}</p>
                                        <p className="text-sm text-[var(--text-accent)]">{clientMap.get(budget.clientId) || 'Cliente desconhecido'}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-lg text-[var(--text-primary)]">R$ {formatCurrency(budget.value)}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{new Date(budget.dateSent).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                         {data.budgets.length === 0 && (
                             <div className="text-center py-12 text-[var(--text-secondary)]">
                                <BriefcaseIcon className="w-12 h-12 mx-auto mb-2 text-[var(--text-tertiary)]" />
                                <p>Nenhum orçamento para exibir.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportDetailModal;
