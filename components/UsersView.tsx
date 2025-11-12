import React from 'react';
import type { UserData } from '../types';
import { UserRole } from '../types';
import { UserGroupIcon } from './icons';

interface UsersViewProps {
  users: UserData[];
  onUpdateRole: (userId: string, newRole: UserRole) => void;
}

const RoleBadge: React.FC<{ role: UserRole }> = ({ role }) => {
    const roleColors: Record<UserRole, string> = {
        [UserRole.ADMIN]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        [UserRole.MANAGER]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        [UserRole.SALESPERSON]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    };
    return (
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${roleColors[role]}`}>
            {role}
        </span>
    );
};

const UsersView: React.FC<UsersViewProps> = ({ users, onUpdateRole }) => {
  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Gerenciar Usuários</h1>
            <p className="text-gray-500 dark:text-gray-400">Altere o nível de acesso de cada usuário no sistema.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="border-b-2 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
                        <tr>
                            <th className="p-4">Nome</th>
                            <th className="p-4">E-mail</th>
                            <th className="p-4">Matrícula</th>
                            <th className="p-4 text-center">Cargo Atual</th>
                            <th className="p-4">Alterar Cargo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr 
                                key={user.id}
                                className="border-b border-gray-200 dark:border-slate-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                                <td className="p-4 text-gray-800 dark:text-slate-100 font-semibold">{user.name}</td>
                                <td className="p-4 text-gray-600 dark:text-slate-300">{user.email}</td>
                                <td className="p-4 text-gray-600 dark:text-slate-300">{user.matricula}</td>
                                <td className="p-4 text-center"><RoleBadge role={user.role} /></td>
                                <td className="p-4">
                                    <select
                                        value={user.role}
                                        onChange={(e) => onUpdateRole(user.id, e.target.value as UserRole)}
                                        className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-slate-200 rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {Object.values(UserRole).map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {users.length === 0 && (
                    <div className="text-center py-10 text-gray-400 dark:text-slate-500">
                        <UserGroupIcon className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600"/>
                        <p>Nenhum usuário encontrado.</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default UsersView;
