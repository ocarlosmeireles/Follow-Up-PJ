import React, { useState, useMemo } from 'react';
import type { Budget, Client } from '../types';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

interface CalendarViewProps {
  budgets: Budget[];
  clients: Client[];
  onSelectBudget: (id: string) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const CalendarView: React.FC<CalendarViewProps> = ({ budgets, clients, onSelectBudget }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const budgetsByDate = useMemo(() => {
        const map = new Map<string, Budget[]>();
        budgets.forEach(budget => {
            if (budget.nextFollowUpDate) {
                const dateKey = new Date(budget.nextFollowUpDate).toDateString();
                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)!.push(budget);
            }
        });
        return map;
    }, [budgets]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const renderHeader = () => {
        const monthYearFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
        return (
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700">
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-semibold capitalize text-gray-800 dark:text-slate-100">
                    {monthYearFormat.format(currentDate)}
                </h2>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700">
                    <ChevronRightIcon className="w-6 h-6" />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        const dayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
        const days = [];
        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="text-center font-medium text-gray-500 dark:text-gray-400 text-sm capitalize">
                    {dayFormat.format(new Date(2023, 0, i + 1)).replace('.', '')}
                </div>
            );
        }
        return <div className="grid grid-cols-7 gap-1">{days}</div>;
    };

    const renderCells = () => {
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
            const events = budgetsByDate.get(dateKey) || [];
            
            const cellDate = new Date(day); // Capture date for the click handler

            cells.push(
                <div
                    key={day.toString()}
                    className={`h-28 p-2 border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden transition-colors duration-200 rounded-md
                        ${isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-gray-100/50 dark:bg-slate-800/20 text-gray-400 dark:text-gray-500'}
                        ${events.length > 0 ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50' : ''}
                    `}
                    onClick={() => events.length > 0 && setSelectedDate(cellDate)}
                >
                    <span className={`font-semibold ${isToday ? 'bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : ''}`}>
                        {day.getDate()}
                    </span>
                    {events.length > 0 && (
                        <div className="mt-1 flex-grow">
                             <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                {events.length} tarefa{events.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                </div>
            );
            day.setDate(day.getDate() + 1);
        }
        return <div className="grid grid-cols-7 gap-1 mt-2">{cells}</div>;
    };
    
    const renderEventModal = () => {
        if (!selectedDate) return null;

        const events = budgetsByDate.get(selectedDate.toDateString()) || [];
        const dayFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' });

        return (
             <div className="fixed inset-0 bg-gray-900 bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex justify-center items-center z-50" onClick={() => setSelectedDate(null)}>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-slate-100">Atividades para {dayFormat.format(selectedDate)}</h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {events.map(budget => (
                            <div key={budget.id} onClick={() => { onSelectBudget(budget.id); setSelectedDate(null); }} className="bg-gray-50 dark:bg-slate-700 p-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600">
                                <p className="font-bold text-gray-800 dark:text-slate-100">{budget.title}</p>
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{clientMap.get(budget.clientId)}</p>
                                <p className="text-sm font-semibold mt-1 text-gray-600 dark:text-slate-300">{formatCurrency(budget.value)}</p>
                            </div>
                        ))}
                    </div>
                     <button onClick={() => setSelectedDate(null)} className="mt-4 w-full bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-800 dark:text-slate-100 font-bold py-2 px-4 rounded-lg">
                        Fechar
                    </button>
                </div>
            </div>
        )
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
            {renderEventModal()}
        </div>
    );
};

export default CalendarView;