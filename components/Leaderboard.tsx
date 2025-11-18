import React, { useMemo, useState } from 'react';
import type { Budget, UserData } from '../types';
import { UserRole, BudgetStatus } from '../types';
import { TrophyIcon, CurrencyDollarIcon, ChartPieIcon } from './icons';

interface LeaderboardProps {
    users: UserData[];
    budgets: Budget[];
    currentUser: UserData;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 0 }).format(value);
};

const Leaderboard: React.FC<LeaderboardProps> = ({ users, budgets, currentUser }) => {
    const [metric, setMetric] = useState<'value' | 'count'>('value');
    
    const leaderboardData = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const salespeople = users.filter(u => u.role === UserRole.SALESPERSON || u.role === UserRole.ADMIN || u.role === UserRole.MANAGER);

        const ranked = salespeople.map(user => {
            const monthlyBudgets = budgets.filter(b => {
                const budgetDate = new Date(b.dateSent);
                return b.userId === user.id && budgetDate.getMonth() === currentMonth && budgetDate.getFullYear() === currentYear;
            });
            
            const wonBudgets = monthlyBudgets.filter(b => b.status === BudgetStatus.INVOICED);

            const value = metric === 'value'
                ? wonBudgets.reduce((sum, b) => sum + b.value, 0)
                : wonBudgets.length;

            return { id: user.id, name: user.name, value };
        });

        return ranked.sort((a, b) => b.value - a.value);

    }, [users, budgets, metric]);

    const getInitials = (name: string) => {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };
    
    return (
        <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <TrophyIcon className="w-6 h-6 text-yellow-500"/>
                    Ranking do Mês
                </h3>
                <div className="flex items-center gap-1 bg-[var(--background-tertiary)] p-1 rounded-lg">
                    <button onClick={() => setMetric('value')} title="Valor Faturado" className={`p-1.5 rounded-md transition ${metric === 'value' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>
                        <CurrencyDollarIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={() => setMetric('count')} title="Negócios Ganhos" className={`p-1.5 rounded-md transition ${metric === 'count' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>
                        <ChartPieIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
            <div className="flex-grow space-y-3 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                {leaderboardData.length > 0 ? leaderboardData.slice(0, 10).map((salesperson, index) => {
                    const isCurrentUser = salesperson.id === currentUser.id;
                    const rank = index + 1;
                    
                    let rankDisplay;
                    if (rank === 1) rankDisplay = <TrophyIcon className="w-5 h-5 text-yellow-400" />;
                    else if (rank === 2) rankDisplay = <TrophyIcon className="w-5 h-5 text-gray-400" />;
                    else if (rank === 3) rankDisplay = <TrophyIcon className="w-5 h-5 text-amber-600" />;
                    else rankDisplay = <span className="text-sm font-bold text-[var(--text-secondary)] w-5 text-center">{rank}</span>;

                    const formattedValue = metric === 'value' ? `R$ ${formatCurrency(salesperson.value)}` : `${salesperson.value} negócios`;

                    return (
                        <div key={salesperson.id} className={`flex items-center gap-3 p-2 rounded-lg ${isCurrentUser ? 'bg-[var(--background-accent-subtle)]' : ''}`}>
                            <div className="flex-shrink-0 w-6 flex justify-center">{rankDisplay}</div>
                            <div className="w-8 h-8 bg-[var(--background-tertiary)] rounded-full flex items-center justify-center text-sm font-bold text-[var(--text-accent)]">
                                {getInitials(salesperson.name)}
                            </div>
                            <p className="font-semibold text-[var(--text-primary)] flex-grow truncate">{salesperson.name}</p>
                            <p className="font-bold text-[var(--text-accent)]">{formattedValue}</p>
                        </div>
                    );
                }) : (
                     <div className="text-center py-10 text-[var(--text-secondary)]">
                        <TrophyIcon className="w-12 h-12 mx-auto mb-2 text-[var(--text-tertiary)]"/>
                        <p className="font-semibold text-[var(--text-primary)]">O ranking está vazio.</p>
                        <p className="text-sm">Feche negócios para começar a competir!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;