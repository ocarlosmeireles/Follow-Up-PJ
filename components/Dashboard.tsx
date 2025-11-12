import React, { useState, useMemo } from 'react';
import type { Budget, Client } from '../types';
import { BudgetStatus } from '../types';
import { CurrencyDollarIcon, TrophyIcon, ChartPieIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon, CalendarIcon } from './icons';

interface DashboardProps {
  budgets: Budget[];
  clients: Client[];
  onSelectBudget: (id: string) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

const MetricCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg flex items-center gap-4 border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="bg-blue-50 dark:bg-slate-700 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);


const Dashboard: React.FC<DashboardProps> = ({ budgets, clients, onSelectBudget }) => {
    const [timePeriod, setTimePeriod] = useState<'month' | '30days' | 'all'>('all');

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

    const filteredBudgetsByTime = useMemo(() => {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        return budgets.filter(b => {
            if (timePeriod === 'all') return true;
            const budgetDate = new Date(b.dateSent);
            if (timePeriod === 'month') return budgetDate >= firstDayOfMonth;
            if (timePeriod === '30days') return budgetDate >= thirtyDaysAgo;
            return true;
        });
    }, [budgets, timePeriod]);

    const metrics = useMemo(() => {
        const activeBudgets = filteredBudgetsByTime.filter(b => b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP);
        const wonBudgets = filteredBudgetsByTime.filter(b => b.status === BudgetStatus.WON);
        const lostBudgets = filteredBudgetsByTime.filter(b => b.status === BudgetStatus.LOST);

        const totalActiveValue = activeBudgets.reduce((sum, b) => sum + b.value, 0);
        const totalWonValue = wonBudgets.reduce((sum, b) => sum + b.value, 0);

        const totalClosed = wonBudgets.length + lostBudgets.length;
        const conversionRateRaw = totalClosed > 0 ? (wonBudgets.length / totalClosed) : 0;
        const conversionRate = totalClosed > 0 ? (conversionRateRaw * 100).toFixed(1) + '%' : 'N/A';
        
        const forecastValue = totalActiveValue * conversionRateRaw;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdueCount = budgets.filter(b => // Overdue is independent of time filter
            b.nextFollowUpDate && 
            new Date(b.nextFollowUpDate) < today && 
            (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP)
        ).length;

        return { totalActiveValue, totalWonValue, conversionRate, overdueCount, forecastValue };
    }, [filteredBudgetsByTime, budgets]);
    
    const nextTasks = useMemo(() => {
         const activeBudgetsWithFollowUp = budgets.filter(b =>
            (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP) && b.nextFollowUpDate
        );
        return activeBudgetsWithFollowUp
            .sort((a,b) => new Date(a.nextFollowUpDate!).getTime() - new Date(b.nextFollowUpDate!).getTime())
            .slice(0, 3);
    }, [budgets]);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                 <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Dashboard de Vendas</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Métricas de performance do seu funil de vendas.</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-200/70 dark:bg-slate-700/50 p-1 rounded-lg mt-4 md:mt-0">
                    <button onClick={() => setTimePeriod('month')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${timePeriod === 'month' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-slate-600/50'}`}>Este Mês</button>
                    <button onClick={() => setTimePeriod('30days')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${timePeriod === '30days' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-slate-600/50'}`}>Últimos 30 dias</button>
                    <button onClick={() => setTimePeriod('all')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${timePeriod === 'all' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-slate-600/50'}`}>Todo o Período</button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
                <MetricCard title="Total Ativo" value={formatCurrency(metrics.totalActiveValue)} icon={<CurrencyDollarIcon className="w-6 h-6 text-blue-500 dark:text-blue-400" />} />
                <MetricCard title="Previsão de Vendas" value={formatCurrency(metrics.forecastValue)} icon={<ArrowTrendingUpIcon className="w-6 h-6 text-purple-500 dark:text-purple-400" />} />
                <MetricCard title="Total Ganho" value={formatCurrency(metrics.totalWonValue)} icon={<TrophyIcon className="w-6 h-6 text-green-500 dark:text-green-400" />} />
                <MetricCard title="Taxa de Conversão" value={metrics.conversionRate} icon={<ChartPieIcon className="w-6 h-6 text-yellow-500 dark:text-yellow-400" />} />
                <MetricCard title="Follow-ups Atrasados" value={metrics.overdueCount} icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-500 dark:text-red-400" />} />
            </div>

            <div>
                 <h3 className="text-2xl font-semibold text-gray-800 dark:text-slate-100 mb-4">Próximas Tarefas</h3>
                 {nextTasks.length > 0 ? (
                    <div className="space-y-3">
                        {nextTasks.map(budget => {
                             const today = new Date();
                             today.setHours(0,0,0,0);
                             const followUpDate = new Date(budget.nextFollowUpDate!);
                             const isOverdue = followUpDate < today;
                             return (
                                <div 
                                    key={budget.id}
                                    onClick={() => onSelectBudget(budget.id)}
                                    className="bg-white dark:bg-slate-800 p-4 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 border border-gray-200 dark:border-slate-700 shadow-sm transition-all duration-200 grid grid-cols-2 sm:grid-cols-3 gap-4 items-center"
                                >
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-slate-100 truncate">{budget.title}</p>
                                        <p className="text-sm text-blue-600 dark:text-blue-400">{clientMap.get(budget.clientId)}</p>
                                    </div>
                                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 text-left sm:text-right">{formatCurrency(budget.value)}</p>
                                    <div className={`flex items-center gap-2 font-semibold ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                        <CalendarIcon className="w-5 h-5"/>
                                        <span>{new Date(budget.nextFollowUpDate!).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                 ) : (
                    <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-lg text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-500"/>
                        <p className="font-semibold text-gray-600 dark:text-gray-300">Nenhuma tarefa futura agendada.</p>
                        <p className="text-sm">Agende um follow-up em um orçamento para vê-lo aqui.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default Dashboard;