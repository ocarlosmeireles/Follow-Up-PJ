


import React, { useState, useMemo } from 'react';
import type { Budget, Client, ThemeVariant, UserProfile, Organization } from '../types';
import { BudgetStatus } from '../types';
import { CurrencyDollarIcon, TrophyIcon, ChartPieIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon, CalendarIcon, CheckCircleIcon } from './icons';

interface DashboardProps {
  budgets: Budget[];
  clients: Client[];
  onSelectBudget: (id: string) => void;
  themeVariant: ThemeVariant;
  userProfile: UserProfile;
  organization: Organization | null;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatFollowUpDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data inválida';
        const hasTime = dateString.includes('T');
        if (hasTime) {
            return date.toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
            }).replace(',', ' às');
        } else {
            const [year, month, day] = dateString.split('-').map(Number);
            const utcDate = new Date(Date.UTC(year, month - 1, day));
            return utcDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        }
    } catch (e) {
        return 'Data inválida';
    }
};

// Componente de cartão de métrica para temas clássicos
const ClassicMetricCard = ({ title, value, icon, style, className }: { title: string, value: string | number, icon: React.ReactNode, style?: React.CSSProperties, className?: string }) => (
    <div style={style} className={`bg-[var(--background-secondary)] p-6 rounded-xl flex items-center gap-4 border border-[var(--border-primary)] shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${className || ''}`}>
        <div className="bg-[var(--background-tertiary)] p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
        </div>
    </div>
);

// Componente de cartão de métrica para o novo tema 'dashboard'
const DashboardMetricCard = ({ title, value, subValue, icon, gradient, style, className }: { title: string, value: string | number, subValue: string, icon: React.ReactNode, gradient: string, style?: React.CSSProperties, className?: string }) => (
    <div style={style} className={`relative p-6 rounded-2xl text-white overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${gradient} ${className || ''}`}>
        <div className="relative z-10">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-lg font-semibold">{title}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                    {icon}
                </div>
            </div>
            <p className="text-sm opacity-80 mt-4">{subValue}</p>
        </div>
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full"></div>
         <div className="absolute -bottom-10 -left-2 w-20 h-20 bg-white/10 rounded-full"></div>
    </div>
);

const SalesGoalTracker: React.FC<{ revenue: number; goal: number | undefined }> = ({ revenue, goal }) => {
    if (!goal || goal <= 0) {
        return (
            <div className="bg-[var(--background-secondary)] p-6 rounded-xl border border-[var(--border-primary)] shadow-sm text-center">
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Acompanhe sua Meta Mensal</h3>
                <p className="text-[var(--text-secondary)]">Um administrador pode definir uma meta de faturamento nas configurações para visualizar o progresso aqui.</p>
            </div>
        );
    }

    const progress = Math.min((revenue / goal) * 100, 100);
    const achievedPercentage = (revenue / goal) * 100;
    const goalMet = revenue >= goal;

    return (
        <div className="bg-[var(--background-secondary)] p-6 rounded-xl border border-[var(--border-primary)] shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <div>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">Meta de Faturamento do Mês</h3>
                    <p className="text-[var(--text-secondary)] text-sm">Progresso em relação à meta definida.</p>
                </div>
                {goalMet && (
                    <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-bold px-4 py-2 rounded-lg mt-2 sm:mt-0">
                        <TrophyIcon className="w-6 h-6"/>
                        <span>Meta Batida!</span>
                    </div>
                )}
            </div>
            <div className="w-full bg-[var(--background-tertiary)] rounded-full h-6 overflow-hidden">
                <div 
                    className="bg-gradient-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 h-full rounded-full flex items-center justify-center text-white font-bold text-sm transition-all duration-1000 ease-out"
                    style={{ width: `${progress}%` }}
                >
                    {progress > 15 && `${achievedPercentage.toFixed(0)}%`}
                </div>
            </div>
            <div className="flex justify-between items-center mt-2 text-sm font-semibold">
                <span className="text-[var(--text-secondary)]">Faturado: <span className="text-[var(--text-primary)]">{formatCurrency(revenue)}</span></span>
                <span className="text-[var(--text-secondary)]">Meta: <span className="text-[var(--text-primary)]">{formatCurrency(goal)}</span></span>
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ budgets, clients, onSelectBudget, themeVariant, userProfile, organization }) => {
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
        const activeBudgets = filteredBudgetsByTime.filter(b => [BudgetStatus.SENT, BudgetStatus.FOLLOWING_UP, BudgetStatus.ORDER_PLACED].includes(b.status));
        const invoicedBudgets = filteredBudgetsByTime.filter(b => b.status === BudgetStatus.INVOICED);
        const lostBudgets = filteredBudgetsByTime.filter(b => b.status === BudgetStatus.LOST);

        const totalActiveValue = activeBudgets.reduce((sum, b) => sum + b.value, 0);
        const totalInvoicedValue = invoicedBudgets.reduce((sum, b) => sum + b.value, 0);

        const totalClosed = invoicedBudgets.length + lostBudgets.length;
        const conversionRateRaw = totalClosed > 0 ? (invoicedBudgets.length / totalClosed) : 0;
        const conversionRate = totalClosed > 0 ? (conversionRateRaw * 100).toFixed(1) + '%' : 'N/A';
        
        const forecastValue = totalActiveValue * conversionRateRaw;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const overdueCount = budgets.filter(b => // Overdue is independent of time filter
            b.nextFollowUpDate && 
            new Date(b.nextFollowUpDate) < today && 
            (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP)
        ).length;

        return { totalActiveValue, totalWonValue: totalInvoicedValue, conversionRate, overdueCount, forecastValue, totalActiveCount: activeBudgets.length };
    }, [filteredBudgetsByTime, budgets]);

    const currentMonthRevenue = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return budgets
            .filter(b => {
                if (b.status !== BudgetStatus.INVOICED) return false;
                const budgetDate = new Date(b.dateSent);
                return budgetDate.getMonth() === currentMonth && budgetDate.getFullYear() === currentYear;
            })
            .reduce((sum, b) => sum + b.value, 0);
    }, [budgets]);
    
    const nextTasks = useMemo(() => {
         const activeBudgetsWithFollowUp = budgets.filter(b =>
            (b.status === BudgetStatus.SENT || b.status === BudgetStatus.FOLLOWING_UP) && b.nextFollowUpDate
        );
        return activeBudgetsWithFollowUp
            .sort((a,b) => new Date(a.nextFollowUpDate!).getTime() - new Date(b.nextFollowUpDate!).getTime())
            .slice(0, 5);
    }, [budgets]);
    
    const isDashboardTheme = themeVariant === 'dashboard';

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                    <h2 className="text-xl font-medium text-[var(--text-secondary)]">Olá, {userProfile.name}!</h2>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mt-1">Dashboard de Vendas</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Bem-vindo(a) de volta! Este é o seu painel de controle.</p>
                </div>
                <div className="flex items-center gap-1 bg-[var(--background-tertiary)] p-1 rounded-lg mt-4 md:mt-0 self-start md:self-center">
                    <button onClick={() => setTimePeriod('month')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${timePeriod === 'month' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>Este Mês</button>
                    <button onClick={() => setTimePeriod('30days')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${timePeriod === '30days' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>Últimos 30 dias</button>
                    <button onClick={() => setTimePeriod('all')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${timePeriod === 'all' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>Todo o Período</button>
                </div>
            </div>
            
            <SalesGoalTracker revenue={currentMonthRevenue} goal={organization?.salesGoal} />

            {isDashboardTheme ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    <DashboardMetricCard style={{ animationDelay: '100ms' }} className="animated-item" title="Pipeline Ativo" value={`R$ ${formatCurrency(metrics.totalActiveValue)}`} subValue={`${metrics.totalActiveCount} negócios`} icon={<CurrencyDollarIcon className="w-8 h-8"/>} gradient="bg-gradient-to-br from-blue-500 to-blue-700"/>
                    <DashboardMetricCard style={{ animationDelay: '200ms' }} className="animated-item" title="Total Faturado" value={`R$ ${formatCurrency(metrics.totalWonValue)}`} subValue="no período" icon={<TrophyIcon className="w-8 h-8"/>} gradient="bg-gradient-to-br from-purple-500 to-purple-700"/>
                    <DashboardMetricCard style={{ animationDelay: '300ms' }} className="animated-item" title="Conversão" value={metrics.conversionRate} subValue="de negócios fechados" icon={<ChartPieIcon className="w-8 h-8"/>} gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"/>
                    <DashboardMetricCard style={{ animationDelay: '400ms' }} className="animated-item" title="Atrasados" value={metrics.overdueCount} subValue="follow-ups pendentes" icon={<ExclamationTriangleIcon className="w-8 h-8"/>} gradient="bg-gradient-to-br from-teal-500 to-teal-700"/>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
                    <ClassicMetricCard style={{ animationDelay: '100ms' }} className="animated-item" title="Total Ativo" value={formatCurrency(metrics.totalActiveValue)} icon={<CurrencyDollarIcon className="w-6 h-6 text-blue-500" />} />
                    <ClassicMetricCard style={{ animationDelay: '200ms' }} className="animated-item" title="Previsão de Vendas" value={formatCurrency(metrics.forecastValue)} icon={<ArrowTrendingUpIcon className="w-6 h-6 text-purple-500" />} />
                    <ClassicMetricCard style={{ animationDelay: '300ms' }} className="animated-item" title="Total Faturado" value={formatCurrency(metrics.totalWonValue)} icon={<TrophyIcon className="w-6 h-6 text-green-500" />} />
                    <ClassicMetricCard style={{ animationDelay: '400ms' }} className="animated-item" title="Taxa de Conversão" value={metrics.conversionRate} icon={<ChartPieIcon className="w-6 h-6 text-yellow-500" />} />
                    <ClassicMetricCard style={{ animationDelay: '500ms' }} className="animated-item" title="Follow-ups Atrasados" value={metrics.overdueCount} icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-500" />} />
                </div>
            )}
            

            <div className="bg-[var(--background-secondary)] p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] shadow-sm">
                 <h3 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] mb-4">Próximas Tarefas</h3>
                 {nextTasks.length > 0 ? (
                    <div className="space-y-4">
                        {nextTasks.map((budget, index) => {
                             const today = new Date();
                             today.setHours(0,0,0,0);
                             const followUpDate = new Date(budget.nextFollowUpDate!);
                             const isOverdue = followUpDate < today;
                             return (
                                <div 
                                    key={budget.id}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    onClick={() => onSelectBudget(budget.id)}
                                    className="animated-item bg-[var(--background-secondary-hover)] p-4 rounded-lg cursor-pointer hover:bg-[var(--background-tertiary)] border border-[var(--border-secondary)] shadow-sm transition-all duration-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center"
                                >
                                    <div>
                                        <p className="font-bold text-[var(--text-primary)] truncate">{budget.title}</p>
                                        <p className="text-sm text-[var(--text-accent)]">{clientMap.get(budget.clientId)}</p>
                                    </div>
                                    <p className="text-lg font-semibold text-[var(--text-secondary)] text-left sm:text-right">{formatCurrency(budget.value)}</p>
                                    <div className={`flex items-center gap-2 font-semibold ${isOverdue ? 'text-red-500' : 'text-yellow-600'}`}>
                                        <CalendarIcon className="w-5 h-5"/>
                                        <span>{formatFollowUpDate(budget.nextFollowUpDate)}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                 ) : (
                    <div className="text-center py-10 bg-[var(--background-secondary-hover)] rounded-lg text-[var(--text-secondary)] border border-dashed border-[var(--border-secondary)]">
                        <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-[var(--text-tertiary)]"/>
                        <p className="font-semibold text-[var(--text-primary)]">Nenhuma tarefa futura agendada.</p>
                        <p className="text-sm">Agende um follow-up em um orçamento para vê-lo aqui.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default Dashboard;