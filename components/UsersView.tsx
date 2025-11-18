import React, { useState, useEffect, useMemo } from 'react';
import type { UserData, Budget } from '../types';
import { UserRole } from '../types';
import { UserGroupIcon, UserPlusIcon, CheckCircleIcon, SparklesIcon } from './icons';

interface UsersViewProps {
  users: UserData[];
  budgets: Budget[];
  onUpdateRole: (userId: string, newRole: UserRole) => void;
  onAddUserClick: () => void;
  onUpdateUserGoals: (goals: { [userId: string]: number }) => void;
  onOpenGoalAIModal: (user: UserData) => void;
}

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const roleColors: Record<UserRole, string> = {
        [UserRole.ADMIN]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        [UserRole.MANAGER]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        [UserRole.SALESPERSON]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        [UserRole.SUPER_ADMIN]: 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-200',
    };
    return (
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${roleColors[role]}`}>
            {role}
        </span>
    );
};

const UsersView: React.FC<UsersViewProps> = ({ users, budgets, onUpdateRole, onAddUserClick, onUpdateUserGoals, onOpenGoalAIModal }) => {
    const [goals, setGoals] = useState<{ [userId: string]: string }>({});
    const [initialGoals, setInitialGoals] = useState<{ [userId: string]: string }>({});

    useEffect(() => {
        if (users) {
            const goalsMap = users.reduce((acc, user) => {
                acc[user.id] = user.monthlyGoal?.toString() || '';
                return acc;
            }, {} as { [userId: string]: string });
            setGoals(goalsMap);
            setInitialGoals(goalsMap);
        }
    }, [users]);

    const handleGoalChange = (userId: string, value: string) => {
        setGoals(prev => ({ ...prev, [userId]: value }));
    };

    const isDirty = useMemo(() => {
        return JSON.stringify(goals) !== JSON.stringify(initialGoals);
    }, [goals, initialGoals]);

    const handleSaveGoals = () => {
        const goalsToUpdate: { [userId: string]: number } = {};
        for (const userId in goals) {
            if (goals[userId] !== initialGoals[userId]) {
                 goalsToUpdate[userId] = parseFloat(goals[userId]) || 0;
            }
        }
        if (Object.keys(goalsToUpdate).length > 0) {
            onUpdateUserGoals(goalsToUpdate);
        }
    };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Gerenciar Usuários e Metas</h1>
                <p className="text-gray-500 dark:text-gray-400">Adicione membros e defina metas de vendas individuais.</p>
            </div>
            <div className="flex items-center gap-4 self-start md:self-center">
                 <button 
                    onClick={handleSaveGoals}
                    disabled={!isDirty}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    Salvar Metas
                </button>
                <button 
                    onClick={onAddUserClick}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm"
                >
                    <UserPlusIcon className="w-5 h-5 mr-2"/>
                    Adicionar Usuário
                </button>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 animated-item" style={{ animationDelay: '100ms' }}>
            {/* Table for medium screens and up */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
                        <tr>
                            <th className="p-4">Nome</th>
                            <th className="p-4">E-mail</th>
                            <th className="p-4">Meta Mensal (R$)</th>
                            <th className="p-4 min-w-[180px]">Alterar Cargo</th>
                            <th className="p-4">Matrícula</th>
                            <th className="p-4 text-center">Cargo Atual</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, index) => (
                            <tr 
                                key={user.id}
                                className="border-b border-gray-200 dark:border-slate-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors animated-item"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <td className="p-4 text-gray-800 dark:text-slate-100 font-semibold">{user.name}</td>
                                <td className="p-4 text-gray-600 dark:text-slate-300">{user.email}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={goals[user.id] || ''}
                                            onChange={(e) => handleGoalChange(user.id, e.target.value)}
                                            placeholder="0"
                                            className="w-32 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <button
                                            onClick={() => onOpenGoalAIModal(user)}
                                            title="Sugerir meta com IA"
                                            className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900 transition-colors"
                                        >
                                            <SparklesIcon className="w-5 h-5"/>
                                        </button>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <select
                                        value={user.role}
                                        onChange={(e) => onUpdateRole(user.id, e.target.value as UserRole)}
                                        className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {Object.values(UserRole).filter(r => r !== UserRole.SUPER_ADMIN).map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-4 text-gray-600 dark:text-slate-300">{user.matricula}</td>
                                <td className="p-4 text-center"><RoleBadge role={user.role} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Cards for small screens */}
            <div className="md:hidden space-y-4 p-4">
                {users.map((user, index) => (
                    <div 
                        key={user.id} 
                        className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700 animated-item"
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-gray-800 dark:text-slate-100">{user.name}</p>
                                <p className="text-sm text-gray-500 dark:text-slate-400">{user.email}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Matrícula: {user.matricula}</p>
                            </div>
                            <RoleBadge role={user.role} />
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-4">
                             <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Meta Mensal (R$)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={goals[user.id] || ''}
                                        onChange={(e) => handleGoalChange(user.id, e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <button
                                        onClick={() => onOpenGoalAIModal(user)}
                                        title="Sugerir meta com IA"
                                        className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900 transition-colors"
                                    >
                                        <SparklesIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Alterar Cargo</label>
                                <select
                                    value={user.role}
                                    onChange={(e) => onUpdateRole(user.id, e.target.value as UserRole)}
                                    className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {Object.values(UserRole).filter(r => r !== UserRole.SUPER_ADMIN).map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {users.length === 0 && (
                <div className="text-center py-10 text-gray-400 dark:text-slate-500">
                    <UserGroupIcon className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600"/>
                    <p>Nenhum usuário encontrado.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default UsersView;