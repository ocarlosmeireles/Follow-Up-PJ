import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, Bars3Icon, BellIcon, SunIcon, MoonIcon, ExclamationTriangleIcon, CalendarIcon, Cog6ToothIcon, ArrowRightStartOnRectangleIcon, ClockIcon, TrashIcon, FunnelIcon, MagnifyingGlassIcon, UserIcon, BriefcaseIcon } from './icons';
import type { Notification, UserProfile, Theme, ThemeVariant, Reminder } from '../types';
import { UserRole } from '../types';
import PomodoroTimer from './PomodoroTimer';

type SearchResult = {
  type: 'client' | 'budget' | 'prospect' | 'contact';
  id: string;
  title: string;
  subtitle: string;
};

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
  onSettings: () => void;
  onLogout: () => void;
  themeVariant: ThemeVariant;
  reminders: Reminder[];
  onAddReminder: (reminderData: Omit<Reminder, 'id' | 'userId' | 'organizationId' | 'isDismissed' | 'isCompleted'>) => void;
  onDeleteReminder: (reminderId: string) => void;
  onToggleReminderStatus: (reminderId: string) => void;
  globalSearchTerm: string;
  globalSearchResults: SearchResult[];
  onGlobalSearch: (term: string) => void;
  onClearGlobalSearch: () => void;
  onSearchResultClick: (result: SearchResult) => void;
  pomodoroMode: 'work' | 'shortBreak' | 'longBreak';
  pomodoroSecondsLeft: number;
  isPomodoroActive: boolean;
  pomodoroCount: number;
  onTogglePomodoro: () => void;
  onResetPomodoro: () => void;
  pomodoroAudioRef: React.RefObject<HTMLAudioElement>;
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
    onSettings,
    onLogout,
    themeVariant,
    reminders,
    onAddReminder,
    onDeleteReminder,
    onToggleReminderStatus,
    globalSearchTerm,
    globalSearchResults,
    onGlobalSearch,
    onClearGlobalSearch,
    onSearchResultClick,
    pomodoroMode,
    pomodoroSecondsLeft,
    isPomodoroActive,
    pomodoroCount,
    onTogglePomodoro,
    onResetPomodoro,
    pomodoroAudioRef,
}) => {
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [isRemindersOpen, setRemindersOpen] = useState(false);
  
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const remindersRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');

  const isDashboardTheme = themeVariant === 'dashboard';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
            setNotificationsOpen(false);
        }
        if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
            setUserMenuOpen(false);
        }
        if (remindersRef.current && !remindersRef.current.contains(event.target as Node)) {
            setRemindersOpen(false);
        }
        if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
            if (globalSearchTerm.length > 0) {
                onClearGlobalSearch();
            }
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [globalSearchTerm, onClearGlobalSearch]);

  const handleNotificationItemClick = (budgetId: string) => {
    onNotificationClick(budgetId);
    setNotificationsOpen(false);
  }

  const handleAddReminder = () => {
    if (!newReminderTitle || !newReminderDate || !newReminderTime) {
        alert('Por favor, preencha todos os campos da tarefa.');
        return;
    }
    const reminderDateTime = new Date(`${newReminderDate}T${newReminderTime}`).toISOString();
    onAddReminder({ title: newReminderTitle, reminderDateTime });
    setNewReminderTitle('');
    setNewReminderDate('');
    setNewReminderTime('');
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const sortedReminders = [...reminders]
    .filter(r => !r.isDismissed)
    .sort((a, b) => (a.isCompleted ? 1 : -1) - (b.isCompleted ? 1 : -1) || new Date(a.reminderDateTime).getTime() - new Date(b.reminderDateTime).getTime());

  const renderSearchResults = () => {
    // FIX: Explicitly set generic type for the reduce accumulator to avoid potential mis-inference by TypeScript.
    const groupedResults = globalSearchResults.reduce<Record<string, SearchResult[]>>((acc, result) => {
      const key = result.type;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(result);
      return acc;
    }, {});

    const getIconForType = (type: string) => {
        switch(type) {
            case 'client': return <UserIcon className="w-5 h-5 text-blue-500" />;
            case 'budget': return <BriefcaseIcon className="w-5 h-5 text-green-500" />;
            case 'prospect': return <FunnelIcon className="w-5 h-5 text-purple-500" />;
            case 'contact': return <UserIcon className="w-5 h-5 text-yellow-500" />;
            default: return null;
        }
    }

    const getTypeName = (type: string) => {
        switch(type) {
            case 'client': return 'Clientes';
            case 'budget': return 'Orçamentos';
            case 'prospect': return 'Prospects';
            case 'contact': return 'Contatos';
            default: return 'Resultados';
        }
    }

    return Object.entries(groupedResults).map(([type, results]) => (
      <div key={type}>
        <h3 className="px-4 py-2 text-xs font-bold uppercase text-[var(--text-tertiary)] bg-[var(--background-tertiary)]">{getTypeName(type)}</h3>
        <ul>
          {results.map(result => (
            <li key={`${result.type}-${result.id}`} onClick={() => onSearchResultClick(result)} className="px-4 py-3 hover:bg-[var(--background-tertiary)] cursor-pointer border-b border-[var(--border-primary)]/50 last:border-b-0">
              <div className="flex items-center gap-3">
                {getIconForType(type)}
                <div>
                  <p className="font-semibold text-sm text-[var(--text-primary)]">{result.title}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{result.subtitle}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ));
  };


  return (
    <header className={`p-4 flex items-center gap-2 sm:gap-4 flex-shrink-0 transition-colors duration-300 ${isDashboardTheme ? 'bg-transparent' : 'bg-[var(--background-secondary)] sticky top-0 z-20 shadow-sm'}`}>
      <button onClick={onToggleSidebar} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:hidden">
        <Bars3Icon className="w-6 h-6" />
      </button>

      <div className="flex-1 flex justify-start" ref={searchRef}>
          <div className="relative w-full max-w-xl">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MagnifyingGlassIcon className="w-5 h-5 text-[var(--text-tertiary)]" />
            </div>
            <input
                type="text"
                placeholder="Busca global..."
                value={globalSearchTerm}
                onChange={(e) => onGlobalSearch(e.target.value)}
                className="w-full bg-[var(--background-tertiary)] border border-transparent focus:border-[var(--border-secondary)] rounded-lg py-2 pl-10 pr-4 text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
            />
            {globalSearchResults.length > 0 && (
                <div className="absolute top-full mt-2 w-full bg-[var(--background-secondary)] rounded-lg shadow-2xl border border-[var(--border-primary)] z-50 max-h-96 overflow-y-auto custom-scrollbar">
                    {renderSearchResults()}
                </div>
            )}
          </div>
      </div>

      <div className="flex justify-end items-center gap-2 sm:gap-4">
        {/* Pomodoro Timer - hidden on smaller screens to avoid clutter */}
        <div className="hidden lg:flex">
             <PomodoroTimer
                mode={pomodoroMode}
                secondsLeft={pomodoroSecondsLeft}
                isActive={isPomodoroActive}
                pomodoros={pomodoroCount}
                onToggle={onTogglePomodoro}
                onReset={onResetPomodoro}
                audioRef={pomodoroAudioRef}
            />
        </div>

        {/* Action Buttons */}
        {userProfile.role !== UserRole.SUPER_ADMIN && (
          <div className="hidden sm:flex items-center gap-2 sm:gap-4">
            <button
              onClick={onAddProspect}
              className={`${isDashboardTheme ? 'bg-[var(--background-tertiary)] hover:bg-[var(--background-tertiary-hover)]' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'} text-[var(--text-secondary)] font-semibold p-2 sm:py-2 sm:px-4 rounded-lg border border-[var(--border-secondary)] flex items-center transition-all duration-200 shadow-sm hover:shadow-md text-sm`}
            >
              <FunnelIcon className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Novo Prospect</span>
            </button>
            <button
              onClick={onAddBudget}
              className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] font-bold p-2 sm:py-2 sm:px-4 rounded-lg flex items-center transition-all duration-200 shadow-md hover:shadow-lg text-sm"
            >
              <PlusIcon className="w-5 h-5 sm:mr-2" />
              <span className="hidden sm:inline">Novo Orçamento</span>
            </button>
          </div>
        )}
        
        <div className={`flex items-center gap-1 ${isDashboardTheme ? '' : 'border-l border-[var(--border-primary)] pl-2 sm:pl-4'}`}>
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] transition-colors">
                {theme === 'dark' ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-slate-500" />}
            </button>

            {/* Reminders / Tasks */}
            <div className="relative" ref={remindersRef}>
                <button onClick={() => setRemindersOpen(prev => !prev)} className="p-2 relative rounded-full text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] transition-colors">
                    <ClockIcon className="w-6 h-6" />
                </button>
                <div className={`absolute top-full right-0 mt-2 w-80 bg-[var(--background-secondary)] rounded-xl shadow-2xl border border-[var(--border-primary)] overflow-hidden z-40 transition-all transform duration-300 ease-in-out ${isRemindersOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                   <div className="p-4 border-b border-[var(--border-primary)]">
                     <h3 className="font-semibold text-[var(--text-primary)]">Lista de Tarefas</h3>
                   </div>
                   <div className="max-h-64 overflow-y-auto custom-scrollbar">
                     {sortedReminders.length > 0 ? (
                        sortedReminders.map(r => (
                            <div key={r.id} className="p-3 flex items-start justify-between gap-3 hover:bg-[var(--background-secondary-hover)] border-b border-[var(--border-primary)]/50">
                                <div className="flex items-start gap-3 flex-grow">
                                  <input 
                                      type="checkbox"
                                      checked={r.isCompleted}
                                      onChange={() => onToggleReminderStatus(r.id)}
                                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  />
                                  <div className="flex-grow">
                                      <p className={`text-sm text-[var(--text-primary)] ${r.isCompleted ? 'line-through text-[var(--text-tertiary)]' : ''}`}>{r.title}</p>
                                      <p className={`text-xs ${r.isCompleted ? 'text-[var(--text-tertiary)]/80' : 'text-[var(--text-tertiary)]'}`}>{new Date(r.reminderDateTime).toLocaleString('pt-BR')}</p>
                                  </div>
                                </div>
                                <button onClick={() => onDeleteReminder(r.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full flex-shrink-0"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        ))
                     ) : (
                        <p className="p-6 text-center text-sm text-[var(--text-secondary)]">Nenhuma tarefa adicionada.</p>
                     )}
                   </div>
                   <div className="p-3 bg-[var(--background-tertiary)] space-y-2">
                        <input type="text" placeholder="Adicionar nova tarefa..." value={newReminderTitle} onChange={e => setNewReminderTitle(e.target.value)} className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-lg p-2 text-sm"/>
                        <div className="flex gap-2">
                             <input type="date" value={newReminderDate} onChange={e => setNewReminderDate(e.target.value)} className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-lg p-2 text-sm dark:[color-scheme:dark]"/>
                             <input type="time" value={newReminderTime} onChange={e => setNewReminderTime(e.target.value)} className="w-full bg-[var(--background-secondary)] border border-[var(--border-secondary)] rounded-lg p-2 text-sm dark:[color-scheme:dark]"/>
                        </div>
                        <button onClick={handleAddReminder} className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-semibold py-2 rounded-lg text-sm">Adicionar Tarefa</button>
                   </div>
                </div>
            </div>
            
            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
                <button onClick={() => setNotificationsOpen(prev => !prev)} className="p-2 relative rounded-full text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] transition-colors">
                    <BellIcon className="w-6 h-6" />
                    {notifications.length > 0 && (
                        <span className="absolute top-1 right-1 h-5 min-w-[20px] flex items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white border-2 border-[var(--background-secondary)]">
                            {notifications.length}
                        </span>
                    )}
                </button>
                <div className={`absolute top-full right-0 mt-2 w-80 bg-[var(--background-secondary)] rounded-xl shadow-2xl border border-[var(--border-primary)] overflow-hidden z-40 transition-all transform duration-300 ease-in-out ${isNotificationsOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                   <div className="p-4 border-b border-[var(--border-primary)]">
                     <h3 className="font-semibold text-[var(--text-primary)]">Notificações</h3>
                   </div>
                   <div className="max-h-96 overflow-y-auto custom-scrollbar">
                     {notifications.length > 0 ? (
                        notifications.map(n => (
                            <div key={n.id} onClick={() => handleNotificationItemClick(n.budgetId)} className="p-3 flex items-start gap-3 hover:bg-[var(--background-secondary-hover)] cursor-pointer border-b border-[var(--border-primary)]/50">
                                <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${n.type === 'overdue' ? 'bg-red-100 dark:bg-red-900/50' : 'bg-blue-100 dark:bg-blue-900/50'}`}>
                                    {n.type === 'overdue' ? <ExclamationTriangleIcon className="w-4 h-4 text-red-500 dark:text-red-400"/> : <CalendarIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />}
                                </div>
                                <div>
                                    <p className="text-sm text-[var(--text-secondary)]">{n.message}</p>
                                    <p className="text-xs text-[var(--text-tertiary)]">{n.clientName}</p>
                                </div>
                            </div>
                        ))
                     ) : (
                        <p className="p-6 text-center text-sm text-[var(--text-secondary)]">Nenhuma notificação.</p>
                     )}
                   </div>
                </div>
            </div>

            {/* User Info */}
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(prev => !prev)} className={`flex items-center gap-3 pl-2 sm:pl-4`}>
                  <div className="text-right hidden sm:block">
                      <span className="font-semibold text-sm text-[var(--text-primary)]">{userProfile.name}</span>
                      <span className="block text-xs text-[var(--text-tertiary)] capitalize">{userProfile.role}</span>
                  </div>
                  <div className="w-9 h-9 bg-[var(--background-accent-subtle)] rounded-full flex items-center justify-center text-[var(--text-accent)] font-bold text-sm">
                      {getInitials(userProfile.name)}
                  </div>
              </button>
               <div className={`absolute top-full right-0 mt-2 w-64 bg-[var(--background-secondary)] rounded-xl shadow-2xl border border-[var(--border-primary)] overflow-hidden z-40 transition-all transform duration-300 ease-in-out ${isUserMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                   <div className="p-4 border-b border-[var(--border-primary)] text-left">
                     <p className="font-semibold text-[var(--text-primary)] truncate">{userProfile.name}</p>
                     <p className="text-sm text-[var(--text-secondary)] truncate">{userProfile.email || 'Sem e-mail cadastrado'}</p>
                     <p className="text-xs text-[var(--text-tertiary)]">Matrícula: {userProfile.matricula}</p>
                   </div>
                   <div className="p-2">
                       <button 
                        onClick={() => { onSettings(); setUserMenuOpen(false); }} 
                        className="w-full text-left text-sm flex items-center gap-3 p-2 rounded-md text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]"
                      >
                        <Cog6ToothIcon className="w-5 h-5"/>
                        Configurações
                      </button>
                      <button 
                        onClick={() => { onEditProfile(); setUserMenuOpen(false); }} 
                        className="w-full text-left text-sm flex items-center gap-3 p-2 rounded-md text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]"
                      >
                        <Cog6ToothIcon className="w-5 h-5"/>
                        Editar Perfil
                      </button>
                      <div className="my-1 h-px bg-[var(--border-primary)]"></div>
                      <button 
                        onClick={() => { onLogout(); setUserMenuOpen(false); }} 
                        className="w-full text-left text-sm flex items-center gap-3 p-2 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <ArrowRightStartOnRectangleIcon className="w-5 h-5"/>
                        Sair
                      </button>
                   </div>
                </div>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;