import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Budget, Client, Reminder } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon } from './icons';

// Local type for unifying events from different sources
type CalendarEvent = {
  id: string;
  date: Date;
  title: string;
  type: 'follow-up' | 'reminder';
  data: Budget | Reminder;
  clientName?: string;
};

// Modal for adding a new event/reminder
const AddEventModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (title: string, dateTime: string) => void;
    selectedDate: Date;
}> = ({ isOpen, onClose, onSave, selectedDate }) => {
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('09:00');
// FIX: Imported useEffect from React to resolve 'Cannot find name' error.
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setTime('09:00');
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!title.trim()) {
            alert('Por favor, insira um título para o evento.');
            return;
        }
        const [hours, minutes] = time.split(':').map(Number);
        const eventDateTime = new Date(selectedDate);
        eventDateTime.setHours(hours, minutes);
        onSave(title, eventDateTime.toISOString());
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/50 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-[var(--background-secondary)] rounded-xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Adicionar Evento em {selectedDate.toLocaleDateString('pt-BR')}</h2>
                    <button onClick={onClose}><XMarkIcon className="w-6 h-6 text-[var(--text-tertiary)]"/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-[var(--text-secondary)]">Título</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2"/>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-[var(--text-secondary)]">Horário</label>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-[var(--background-tertiary)] border border-[var(--border-secondary)] rounded-lg p-2 dark:[color-scheme:dark]"/>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600">Cancelar</button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Salvar Evento</button>
                </div>
            </div>
        </div>
    );
};


interface CalendarViewProps {
  budgets: Budget[];
  clients: Client[];
  reminders: Reminder[];
  onSelectBudget: (id: string) => void;
  onAddReminder: (reminderData: Omit<Reminder, 'id' | 'userId' | 'organizationId' | 'isDismissed' | 'isCompleted'>) => void;
  onSelectReminder: (reminderId: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ budgets, clients, reminders, onSelectBudget, onAddReminder, onSelectReminder }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'agenda'>('month');
    const [addModalState, setAddModalState] = useState<{isOpen: boolean, date: Date | null}>({isOpen: false, date: null});

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const allEvents = useMemo<CalendarEvent[]>(() => {
        const followUpEvents: CalendarEvent[] = budgets
            .filter(b => b.nextFollowUpDate)
            .map(b => ({
                id: `budget-${b.id}`,
                date: new Date(b.nextFollowUpDate!),
                title: b.title,
                type: 'follow-up',
                data: b,
                clientName: clientMap.get(b.clientId) || 'Cliente'
            }));

        const reminderEvents: CalendarEvent[] = reminders
            .map(r => ({
                id: `reminder-${r.id}`,
                date: new Date(r.reminderDateTime),
                title: r.title,
                type: 'reminder',
                data: r,
            }));
            
        return [...followUpEvents, ...reminderEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [budgets, reminders, clientMap]);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        allEvents.forEach(event => {
            const dateKey = event.date.toDateString();
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)!.push(event);
        });
        return map;
    }, [allEvents]);
    
    const handleAddEventClick = (date: Date) => {
        setAddModalState({isOpen: true, date});
    };

    const handleSaveEvent = (title: string, dateTime: string) => {
        onAddReminder({ title, reminderDateTime: dateTime });
        setAddModalState({isOpen: false, date: null});
    };

    const handleEventClick = (event: CalendarEvent) => {
        if (event.type === 'follow-up') {
            onSelectBudget((event.data as Budget).id);
        } else {
            onSelectReminder((event.data as Reminder).id);
        }
    };

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    const renderHeader = () => (
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
                <button onClick={handleToday} className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600">Hoje</button>
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"><ChevronLeftIcon className="w-6 h-6" /></button>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700"><ChevronRightIcon className="w-6 h-6" /></button>
                 <h2 className="text-xl font-semibold capitalize text-gray-800 dark:text-slate-100">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
            </div>
            <div className="flex items-center gap-1 bg-[var(--background-tertiary)] p-1 rounded-lg">
                <button onClick={() => setView('month')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${view === 'month' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : ''}`}>Mês</button>
                <button onClick={() => setView('agenda')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${view === 'agenda' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : ''}`}>Agenda</button>
            </div>
        </div>
    );
    
    const renderCells = useCallback(() => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const startDate = new Date(monthStart);
        startDate.setDate(startDate.getDate() - monthStart.getDay());
        const endDate = new Date(monthEnd);
        endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));

        const cells = [];
        let day = new Date(startDate);

        while (day <= endDate) {
            const dateKey = day.toDateString();
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();
            const events = eventsByDate.get(dateKey) || [];
            
            const cellDate = new Date(day);
            cells.push(
                <div key={day.toString()} className={`min-h-[120px] p-2 border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden transition-colors duration-200 rounded-md group ${isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-800/20'}`}>
                    <div className="flex justify-between items-center">
                        <span className={`text-sm font-semibold ${isToday ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : (isCurrentMonth ? '' : 'text-gray-400 dark:text-gray-500')}`}>{day.getDate()}</span>
                        <button onClick={() => handleAddEventClick(cellDate)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"><PlusIcon className="w-4 h-4 text-slate-500 dark:text-slate-300"/></button>
                    </div>
                    <div className="mt-1 flex-grow space-y-1 overflow-y-auto">
                        {events.slice(0, 3).map(event => (
                            <div key={event.id} onClick={() => handleEventClick(event)} className={`text-xs p-1 rounded-md truncate cursor-pointer ${event.type === 'follow-up' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300'}`}>
                                {event.title}
                            </div>
                        ))}
                        {events.length > 3 && <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-1">+ {events.length - 3} mais</div>}
                    </div>
                </div>
            );
            day.setDate(day.getDate() + 1);
        }
        return <div className="grid grid-cols-7 gap-1 mt-2">{cells}</div>;
    }, [currentDate, eventsByDate, handleEventClick]);
    
    const renderAgenda = () => {
        const upcomingEvents = allEvents.filter(e => e.date >= new Date(new Date().toDateString()));
        const groupedByDay = upcomingEvents.reduce((acc, event) => {
            const dayKey = event.date.toDateString();
            if(!acc[dayKey]) acc[dayKey] = [];
            acc[dayKey].push(event);
            return acc;
        }, {} as Record<string, CalendarEvent[]>);

        return (
            <div className="max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                {Object.keys(groupedByDay).length > 0 ? Object.entries(groupedByDay).map(([dateStr, events]) => (
                    <div key={dateStr} className="mb-6">
                        <h3 className="font-bold text-gray-800 dark:text-slate-200 capitalize mb-2 border-b-2 border-slate-200 dark:border-slate-700 pb-1">{new Date(dateStr).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h3>
                        <div className="space-y-3">
                            {(events as CalendarEvent[]).map(event => (
                                 <div key={event.id} onClick={() => handleEventClick(event)} className={`p-3 rounded-lg border-l-4 cursor-pointer ${event.type === 'follow-up' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-slate-100">{event.title}</p>
                                            {event.clientName && <p className="text-sm text-blue-600 dark:text-blue-400">{event.clientName}</p>}
                                        </div>
                                        <div className="text-sm font-semibold text-gray-700 dark:text-slate-300">{event.date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )) : <p className="text-center py-16 text-gray-500 dark:text-slate-400">Nenhuma atividade futura agendada.</p>}
            </div>
        )
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200">
            {renderHeader()}
            {view === 'month' ? (
                <>
                    <div className="grid grid-cols-7 gap-1 text-center font-medium text-gray-500 dark:text-gray-400 text-sm capitalize">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d}>{d}</div>)}
                    </div>
                    {renderCells()}
                </>
            ) : renderAgenda()}
            
            {addModalState.isOpen && addModalState.date && (
                <AddEventModal 
                    isOpen={addModalState.isOpen}
                    onClose={() => setAddModalState({isOpen: false, date: null})}
                    onSave={handleSaveEvent}
                    selectedDate={addModalState.date}
                />
            )}
        </div>
    );
};

export default CalendarView;