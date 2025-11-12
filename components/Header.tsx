import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, Bars3Icon, BellIcon, SunIcon, MoonIcon, ExclamationTriangleIcon, CalendarIcon, Cog6ToothIcon, ArrowRightStartOnRectangleIcon } from './icons';
import type { Theme } from '../App';
import type { Notification, UserProfile } from '../types';
import { UserRole } from '../types';

interface HeaderProps {
  onAddBudget: () => void;
  onAddProspect: () => void;
  onToggleSidebar: () => void;
  theme: Theme;
  toggleTheme: () => void;
  notifications: Notification[];
  onNotificationClick: (budgetId: string) => void;
  userProfile: UserProfile;
  onEditProfile: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onAddBudget, 
    onAddProspect, 
    onToggleSidebar, 
    theme, 
    toggleTheme,
    notifications,
    onNotificationClick,
    userProfile,
    onEditProfile,
    onLogout
}) => {
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
            setNotificationsOpen(false);
        }
        if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
            setUserMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationItemClick = (budgetId: string) => {
    onNotificationClick(budgetId);
    setNotificationsOpen(false);
  }

  const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white dark:bg-slate-800 p-4 flex justify-between items-center sticky top-0 z-30 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
      <button onClick={onToggleSidebar} className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white md:hidden">
        <Bars3Icon className="w-6 h-6" />
      </button>

      <div className="hidden md:block flex-1">
        {/* Can be used for breadcrumbs or other context info later */}
      </div>

      <div className="flex justify-end items-center gap-2 sm:gap-4">
        {/* Action Buttons */}
        {userProfile.role !== UserRole.SUPER_ADMIN && (
          <>
            <button
              onClick={onAddProspect}
              className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600 flex items-center transition-colors duration-200 shadow-sm text-sm"
            >
              <span className="hidden sm:inline">Novo Prospect</span>
              <span className="sm:hidden">Prospect</span>
            </button>
            <button
              onClick={onAddBudget}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors duration-200 shadow-sm text-sm"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Novo Orçamento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </>
        )}
        
        <div className="flex items-center gap-1 border-l border-gray-200 dark:border-slate-700 pl-2 sm:pl-4">
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                {theme === 'dark' ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-slate-500" />}
            </button>
            
            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
                <button onClick={() => setNotificationsOpen(prev => !prev)} className="p-2 relative rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <BellIcon className="w-6 h-6" />
                    {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 block w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>}
                </button>
                {isNotificationsOpen && (
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-40">
                       <div className="p-3 border-b border-gray-200 dark:border-slate-700">
                         <h3 className="font-semibold text-gray-800 dark:text-slate-200">Notificações</h3>
                       </div>
                       <div className="max-h-96 overflow-y-auto custom-scrollbar">
                         {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div key={n.id} onClick={() => handleNotificationItemClick(n.budgetId)} className="p-3 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-100 dark:border-slate-700/50">
                                    <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${n.type === 'overdue' ? 'bg-red-100 dark:bg-red-900/50' : 'bg-blue-100 dark:bg-blue-900/50'}`}>
                                        {n.type === 'overdue' ? <ExclamationTriangleIcon className="w-4 h-4 text-red-500 dark:text-red-400"/> : <CalendarIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-700 dark:text-slate-300">{n.message}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{n.clientName}</p>
                                    </div>
                                </div>
                            ))
                         ) : (
                            <p className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma notificação.</p>
                         )}
                       </div>
                    </div>
                )}
            </div>

            {/* User Info */}
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(prev => !prev)} className="flex items-center gap-3 border-l border-gray-200 dark:border-slate-700 pl-2 sm:pl-4">
                  <div className="text-right hidden sm:block">
                      <span className="font-semibold text-sm text-gray-600 dark:text-slate-300">{userProfile.name}</span>
                      <span className="block text-xs text-gray-400 dark:text-slate-500 capitalize">{userProfile.role}</span>
                  </div>
                  <div className="w-9 h-9 bg-blue-200 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-sm">
                      {getInitials(userProfile.name)}
                  </div>
              </button>
               {isUserMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-40">
                       <div className="p-3 border-b border-gray-200 dark:border-slate-700 text-left">
                         <p className="font-semibold text-gray-800 dark:text-slate-200 truncate">{userProfile.name}</p>
                         <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{userProfile.email || 'Sem e-mail cadastrado'}</p>
                         <p className="text-xs text-gray-500 dark:text-slate-400">Matrícula: {userProfile.matricula}</p>
                       </div>
                       <div className="p-2">
                          <button 
                            onClick={() => { onEditProfile(); setUserMenuOpen(false); }} 
                            className="w-full text-left text-sm flex items-center gap-2 p-2 rounded-md text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                          >
                            <Cog6ToothIcon className="w-5 h-5"/>
                            Editar Perfil
                          </button>
                          <button 
                            onClick={() => { onLogout(); setUserMenuOpen(false); }} 
                            className="w-full text-left text-sm flex items-center gap-2 p-2 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                          >
                            <ArrowRightStartOnRectangleIcon className="w-5 h-5"/>
                            Sair
                          </button>
                       </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;