import React, { useMemo, useState } from 'react';
import type { Budget, Client, UserData } from '../types';
import { BudgetStatus, UserRole } from '../types';
import { TrophyIcon, ChartPieIcon, CurrencyDollarIcon, ChartBarIcon, FunnelIcon, UserGroupIcon, ClipboardDocumentListIcon, CalendarIcon, ExclamationTriangleIcon } from './icons';

interface ReportsViewProps {
  budgets: Budget[];
  clients: Client[];
  users: UserData[];
  userProfile: UserData;
  onGenerateDailyReport: () => void;
  onOpenReportDetail: (title: string, budgets: Budget[]) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const MetricCard = ({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg flex items-center gap-5 border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="bg-blue-50 dark:bg-slate-700 p-4 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-base text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

const ReportsView: React.FC<ReportsViewProps> = ({ budgets, clients, users, userProfile, onGenerateDailyReport, onOpenReportDetail }) => {
    const [leaderboardMetric, setLeaderboardMetric] = useState<'value' | 'count' | 'created'>('value');
    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
    
    const metrics = useMemo(() => {
        const invoicedBudgets = budgets.filter(b => b.status === BudgetStatus.INVOICED);
        const lostBudgets = budgets.filter(b => b.status === BudgetStatus.LOST);

        const totalInvoicedValue = invoicedBudgets.reduce((sum, b) => sum + b.value, 0);
        const totalClosed = invoicedBudgets.length + lostBudgets.length;
        
        const conversionRate = totalClosed > 0 
            ? ((invoicedBudgets.length / totalClosed) * 100).toFixed(1) + '%' 
            : 'N/A';
        
        const averageTicket = invoicedBudgets.length > 0 
            ? totalInvoicedValue / invoicedBudgets.length 
            : 0;
            
        return { totalWonValue: totalInvoicedValue, conversionRate, averageTicket };
    }, [budgets]);

    const monthlyPerformance = useMemo(() => {
        const performance: { [key: string]: number } = {};
        const invoicedBudgets = budgets.filter(b => b.status === BudgetStatus.INVOICED);
        
        invoicedBudgets.forEach(b => {
            const date = new Date(b.dateSent);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!performance[monthKey]) {
                performance[monthKey] = 0;
            }
            performance[monthKey] += b.value;
        });

        const sortedMonths = Object.keys(performance).sort();
        const last12Months = sortedMonths.slice(-12);
        
        const data = last12Months.map(monthKey => {
             const [year, month] = monthKey.split('-');
             const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
            return {
                label,
                value: performance[monthKey],
            };
        });

        const maxValue = Math.max(...data.map(d => d.value), 0);

        return { data, maxValue };

    }, [budgets]);
    
    const salesFunnelData = useMemo(() => {
        const sent = budgets;
        const followingUp = budgets.filter(b => [BudgetStatus.FOLLOWING_UP, BudgetStatus.ON_HOLD, BudgetStatus.ORDER_PLACED, BudgetStatus.WAITING_MATERIAL, BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status));
        const orderPlaced = budgets.filter(b => [BudgetStatus.ORDER_PLACED, BudgetStatus.WAITING_MATERIAL, BudgetStatus.INVOICED, BudgetStatus.LOST].includes(b.status));
        const invoiced = budgets.filter(b => b.status === BudgetStatus.INVOICED);

        const stages = [
            { name: 'Enviado', count: sent.length, value: sent.reduce((sum, b) => sum + b.value, 0) },
            { name: 'Em Follow-up', count: followingUp.length, value: followingUp.reduce((sum, b) => sum + b.value, 0) },
            { name: 'Pedido Emitido', count: orderPlaced.length, value: orderPlaced.reduce((sum, b) => sum + b.value, 0) },
            { name: 'Faturados', count: invoiced.length, value: invoiced.reduce((sum, b) => sum + b.value, 0) }
        ];
        
        const maxCount = Math.max(...stages.map(s => s.count), 1);

        return stages.map((stage, index) => {
            const prevStage = stages[index - 1];
            const conversionRate = (prevStage && prevStage.count > 0) ? (stage.count / prevStage.count) * 100 : 100;
            const widthPercentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
            return { ...stage, conversionRate, widthPercentage };
        });
    }, [budgets]);

    const convertedOrders = useMemo(() => {
        // Consider converted any budget that passed the 'ORDER_PLACED' milestone
        return budgets
            .filter(b => [BudgetStatus.ORDER_PLACED, BudgetStatus.WAITING_MATERIAL, BudgetStatus.INVOICED].includes(b.status))
            .sort((a, b) => new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime())
            .map(b => ({
                ...b,
                clientName: clientMap.get(b.clientId) || 'Desconhecido'
            }));
    }, [budgets, clientMap]);


    const topClients = useMemo(() => {
        const valueByClient: { [clientId: string]: number } = {};
        budgets.forEach(b => {
            if (b.status === BudgetStatus.INVOICED) {
                if (!valueByClient[b.clientId]) {
                    valueByClient[b.clientId] = 0;
                }
                valueByClient[b.clientId] += b.value;
            }
        });

        return (Object.entries(valueByClient) as [string, number][])
            .sort(([, aValue], [, bValue]) => bValue - aValue)
            .slice(0, 5)
            .map(([clientId, totalValue]) => ({
                name: clientMap.get(clientId) || 'Cliente desconhecido',
                value: totalValue
            }));
    }, [budgets, clientMap]);

    const lostReasonAnalysis = useMemo(() => {
        const lostBudgets = budgets.filter(b => b.status === BudgetStatus.LOST && b.lostReason);
        if (lostBudgets.length === 0) {
            return { data: [], maxValue: 0, totalLost: 0 };
        }

        const reasonCounts = lostBudgets.reduce((acc, budget) => {
            const reason = budget.lostReason!;
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const data = (Object.entries(reasonCounts) as [string, number][])
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count);
        
        const maxValue = Math.max(...data.map(d => d.count), 0);

        return { data, maxValue, totalLost: lostBudgets.length };
    }, [budgets]);

    const leaderboardData = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const salespeople = users.filter(u => u.role === UserRole.SALESPERSON || u.role === UserRole.ADMIN || u.role === UserRole.MANAGER);

        const rankedSalespeople = salespeople.map(user => {
            const userBudgets = budgets.filter(b => b.userId === user.id);
            
            const monthlyBudgets = userBudgets.filter(b => {
                const budgetDate = new Date(b.dateSent);
                return budgetDate.getMonth() === currentMonth && budgetDate.getFullYear() === currentYear;
            });
            
            let value = 0;
            switch(leaderboardMetric) {
                case 'value':
                    value = monthlyBudgets
                        .filter(b => b.status === BudgetStatus.INVOICED)
                        .reduce((sum, b) => sum + b.value, 0);
                    break;
                case 'count':
                    value = monthlyBudgets.filter(b => b.status === BudgetStatus.INVOICED).length;
                    break;
                case 'created':
                    value = monthlyBudgets.length;
                    break;
            }

            return {
                id: user.id,
                name: user.name,
                value: value,
            };
        });

        return rankedSalespeople
            .filter(s => s.value > 0)
            .sort((a, b) => b.value - a.value);

    }, [budgets, users, leaderboardMetric]);


    const handleOpenLostReasonDetail = (reason: string) => {
        const budgetsForReason = budgets.filter(b => b.status === BudgetStatus.LOST && b.lostReason === reason);
        onOpenReportDetail(`Orçamentos perdidos por: ${reason}`, budgetsForReason);
    };

    const handleExport = () => {
        const date = new Date().toLocaleString('pt-BR');

        const reportHtml = `
            <html>
            <head>
                <title>Relatório de Vendas</title>
                <style>
                    body { font-family: sans-serif; margin: 2rem; }
                    h1, h2, h3 { color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .header { margin-bottom: 2rem; border-bottom: 2px solid #ccc; padding-bottom: 1rem; }
                    .kpi-container { display: flex; justify-content: space-around; text-align: center; margin-bottom: 2rem; }
                    .kpi-card { border: 1px solid #ddd; padding: 1rem; border-radius: 8px; flex-grow: 1; margin: 0 0.5rem; }
                    .kpi-card p { margin: 0; }
                    .kpi-title { color: #666; font-size: 0.9rem; }
                    .kpi-value { font-size: 1.5rem; font-weight: bold; }
                    .section { margin-bottom: 2rem; }
                    @media print {
                        body { margin: 1rem; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Relatório de Vendas</h1>
                    <p>Exportado por: <strong>${userProfile.name}</strong> (Matrícula: ${userProfile.matricula})</p>
                    <p>E-mail: ${userProfile.email}</p>
                    <p>Data: ${date}</p>
                </div>

                <div class="section kpi-container">
                    <div class="kpi-card">
                        <p class="kpi-title">Faturamento Total</p>
                        <p class="kpi-value">${formatCurrency(metrics.totalWonValue)}</p>
                    </div>
                    <div class="kpi-card">
                        <p class="kpi-title">Taxa de Conversão</p>
                        <p class="kpi-value">${metrics.conversionRate}</p>
                    </div>
                    <div class="kpi-card">
                        <p class="kpi-title">Ticket Médio</p>
                        <p class="kpi-value">${formatCurrency(metrics.averageTicket)}</p>
                    </div>
                </div>
                
                <div class="section">
                    <h3>Top 5 Clientes por Faturamento</h3>
                    ${topClients.length > 0 ? `
                    <table>
                        <thead><tr><th>Cliente</th><th>Total Faturado</th></tr></thead>
                        <tbody>
                            ${topClients.map(c => `<tr><td>${c.name}</td><td>${formatCurrency(c.value)}</td></tr>`).join('')}
                        </tbody>
                    </table>
                    ` : '<p>Nenhum cliente com negócios faturados para exibir.</p>'}
                </div>

                <div class="section">
                    <h3>Funil de Vendas</h3>
                    <table>
                        <thead><tr><th>Etapa</th><th>Orçamentos (Qtd)</th><th>Valor</th></tr></thead>
                        <tbody>
                            ${salesFunnelData.map(s => `<tr><td>${s.name}</td><td>${s.count}</td><td>${formatCurrency(s.value)}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h3>Pedidos Convertidos</h3>
                    <table>
                        <thead><tr><th>Data</th><th>Cliente</th><th>Título</th><th>Valor</th><th>Status</th></tr></thead>
                        <tbody>
                            ${convertedOrders.map(o => `<tr><td>${new Date(o.dateSent).toLocaleDateString()}</td><td>${o.clientName}</td><td>${o.title}</td><td>${formatCurrency(o.value)}</td><td>${o.status}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h3>Performance Mensal (Últimos 12 meses)</h3>
                     ${monthlyPerformance.data.length > 0 ? `
                    <table>
                        <thead><tr><th>Mês</th><th>Faturamento</th></tr></thead>
                        <tbody>
                            ${monthlyPerformance.data.map(m => `<tr><td>${m.label}</td><td>${formatCurrency(m.value)}</td></tr>`).join('')}
                        </tbody>
                    </table>
                    ` : '<p>Nenhum dado de performance para exibir.</p>'}
                </div>

            </body>
            </html>
        `;

        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(reportHtml);
            reportWindow.document.close();
            reportWindow.print();
        } else {
            alert('Por favor, habilite pop-ups para exportar o relatório.');
        }
    };


    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Relatórios</h1>
                    <p className="text-gray-500 dark:text-gray-400">Analise a performance de suas vendas.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600 flex items-center transition-colors duration-200 shadow-sm"
                >
                    <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />
                    Exportar Relatório Geral
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animated-item" style={{ animationDelay: '100ms' }}>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-4">Relatórios Rápidos</h2>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={onGenerateDailyReport}
                        className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-lg border border-gray-300 dark:border-slate-600 flex items-center transition-colors duration-200"
                    >
                        <CalendarIcon className="w-5 h-5 mr-2" />
                        Relatório de Follow-ups do Dia
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="animated-item" style={{ animationDelay: '200ms' }}><MetricCard title="Faturamento Total" value={formatCurrency(metrics.totalWonValue)} icon={<TrophyIcon className="w-7 h-7 text-green-500 dark:text-green-400" />} /></div>
                <div className="animated-item" style={{ animationDelay: '300ms' }}><MetricCard title="Taxa de Conversão" value={metrics.conversionRate} icon={<ChartPieIcon className="w-7 h-7 text-yellow-500 dark:text-yellow-400" />} /></div>
                <div className="animated-item" style={{ animationDelay: '400ms' }}><MetricCard title="Ticket Médio" value={formatCurrency(metrics.averageTicket)} icon={<CurrencyDollarIcon className="w-7 h-7 text-blue-500 dark:text-blue-400" />} /></div>
            </div>

            {/* Relatório de Pedidos Convertidos */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animated-item" style={{ animationDelay: '450ms' }}>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
                    <TrophyIcon className="w-6 h-6 mr-3 text-green-500 dark:text-green-400"/>
                    Relatório de Pedidos Convertidos
                </h2>
                {convertedOrders.length > 0 ? (
                    <div className="overflow-x-auto max-h-96 custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="text-gray-500 dark:text-gray-400 uppercase text-xs bg-gray-50 dark:bg-slate-700/50 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3">Data</th>
                                    <th className="p-3">Cliente</th>
                                    <th className="p-3">Orçamento</th>
                                    <th className="p-3 text-right">Valor</th>
                                    <th className="p-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                                {convertedOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                        <td className="p-3 text-gray-600 dark:text-slate-300">{new Date(order.dateSent).toLocaleDateString('pt-BR')}</td>
                                        <td className="p-3 font-medium text-gray-800 dark:text-slate-100">{order.clientName}</td>
                                        <td className="p-3 text-gray-600 dark:text-slate-300">{order.title}</td>
                                        <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(order.value)}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                                order.status === BudgetStatus.INVOICED ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 
                                                order.status === BudgetStatus.WAITING_MATERIAL ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' :
                                                'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 dark:text-slate-500">
                        <p>Nenhum pedido convertido encontrado.</p>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animated-item" style={{ animationDelay: '500ms' }}>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
                    <UserGroupIcon className="w-6 h-6 mr-3 text-yellow-500 dark:text-yellow-400"/>
                    Ranking de Vendedores (Mês Atual)
                </h2>
                 <div className="flex items-center gap-1 bg-[var(--background-tertiary)] p-1 rounded-lg mb-4">
                    <button onClick={() => setLeaderboardMetric('value')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${leaderboardMetric === 'value' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>Valor Faturado</button>
                    <button onClick={() => setLeaderboardMetric('count')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${leaderboardMetric === 'count' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>Negócios Ganhos</button>
                    <button onClick={() => setLeaderboardMetric('created')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${leaderboardMetric === 'created' ? 'bg-[var(--background-secondary)] shadow-sm text-[var(--text-accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--background-secondary-hover)]'}`}>Orçamentos Criados</button>
                </div>
                <div className="space-y-3">
                    {leaderboardData.length > 0 ? leaderboardData.map((salesperson, index) => {
                        const rank = index + 1;
                        const isCurrentUser = salesperson.id === userProfile.id;
                        const topValue = leaderboardData[0].value || 1;
                        const progress = (salesperson.value / topValue) * 100;
                        
                        let rankIcon;
                        if (rank === 1) rankIcon = <TrophyIcon className="w-5 h-5 text-yellow-400" />;
                        else if (rank === 2) rankIcon = <TrophyIcon className="w-5 h-5 text-gray-400" />;
                        else if (rank === 3) rankIcon = <TrophyIcon className="w-5 h-5 text-amber-600" />;
                        else rankIcon = <span className="text-sm font-bold w-5 text-center">{rank}</span>;

                        const formatMetric = (value: number) => {
                            if (leaderboardMetric === 'value') return `R$ ${formatCurrency(value)}`;
                            if (leaderboardMetric === 'count') return `${value} negócio(s)`;
                            if (leaderboardMetric === 'created') return `${value} orçamento(s)`;
                            return value;
                        };
                        
                        return (
                             <div key={salesperson.id} className={`p-3 rounded-lg ${isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-6 flex justify-center">{rankIcon}</div>
                                    <div className="flex-grow">
                                        <p className="font-bold text-gray-800 dark:text-slate-100">{salesperson.name}</p>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 font-bold text-blue-600 dark:text-blue-400 text-lg">
                                        {formatMetric(salesperson.value)}
                                    </div>
                                </div>
                            </div>
                        )
                    }) : (
                        <p className="text-center py-8 text-gray-400 dark:text-slate-500">Nenhum dado para exibir no ranking deste mês.</p>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animated-item" style={{ animationDelay: '500ms' }}>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
                    <ChartBarIcon className="w-6 h-6 mr-3 text-purple-500 dark:text-purple-400"/>
                    Performance Mensal (Últimos 12 meses)
                </h2>
                {monthlyPerformance.data.length > 0 ? (
                    <div className="w-full overflow-x-auto pb-4">
                        <div className="h-80 flex items-end justify-start gap-4 pt-4 border-t border-gray-200 dark:border-slate-700 min-w-[600px]">
                            {monthlyPerformance.data.map(({ label, value }) => (
                                <div key={label} className="flex flex-col items-center h-full flex-1" title={`${label}: ${formatCurrency(value)}`}>
                                    <div className="w-full h-full flex items-end">
                                        <div 
                                            className="w-full bg-purple-500 hover:bg-purple-400 dark:bg-purple-600 dark:hover:bg-purple-500 rounded-t-md transition-all duration-300"
                                            style={{ height: `${monthlyPerformance.maxValue > 0 ? (value / monthlyPerformance.maxValue) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-semibold capitalize">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-400 dark:text-slate-500 border-t border-gray-200 dark:border-slate-700">
                        <p>Nenhum dado de performance para exibir.</p>
                        <p>Conclua um orçamento como "Faturado" para começar a gerar dados.</p>
                    </div>
                )}
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animated-item" style={{ animationDelay: '600ms' }}>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
                    <FunnelIcon className="w-6 h-6 mr-3 text-blue-500 dark:text-blue-400"/>
                    Funil de Vendas
                </h2>
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                    {salesFunnelData.map((stage, index) => (
                        <div key={stage.name}>
                            {index > 0 && (
                                <div className="text-center my-2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto text-gray-400 dark:text-slate-500">
                                        <path d="M12 5V19M12 19L7 14M12 19L17 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full">{stage.conversionRate.toFixed(1)}%</span>
                                </div>
                            )}
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                                <div className="flex justify-between items-center text-sm font-semibold mb-2">
                                    <span className="text-gray-800 dark:text-slate-200">{stage.name}</span>
                                    <div className="text-right">
                                        <span className="text-blue-600 dark:text-blue-400">{formatCurrency(stage.value)}</span>
                                        <span className="text-gray-500 dark:text-gray-400 ml-2">({stage.count})</span>
                                    </div>
                                </div>
                                <div className="bg-gray-200 dark:bg-slate-600 rounded-full h-3">
                                    <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${stage.widthPercentage}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animated-item" style={{ animationDelay: '700ms' }}>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
                        <ExclamationTriangleIcon className="w-6 h-6 mr-3 text-red-500 dark:text-red-400"/>
                        Análise de Perdas ({lostReasonAnalysis.totalLost} negócios)
                    </h2>
                    {lostReasonAnalysis.data.length > 0 ? (
                        <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                            {lostReasonAnalysis.data.map(item => {
                                const percentage = lostReasonAnalysis.maxValue > 0 ? (item.count / lostReasonAnalysis.maxValue) * 100 : 0;
                                return (
                                    <button 
                                        key={item.reason} 
                                        onClick={() => handleOpenLostReasonDetail(item.reason)}
                                        className="w-full flex items-center gap-3 text-sm group"
                                    >
                                        <span className="w-40 text-gray-600 dark:text-slate-400 truncate font-medium text-left group-hover:text-blue-600">{item.reason}</span>
                                        <div className="flex-grow bg-gray-200 dark:bg-slate-700 rounded-full h-4">
                                            <div className="bg-red-400 dark:bg-red-500 h-4 rounded-full group-hover:bg-red-500 dark:group-hover:bg-red-400 transition-colors" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                        <span className="w-8 text-right font-bold text-gray-800 dark:text-slate-200">{item.count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-400 dark:text-slate-500 border-t border-gray-200 dark:border-slate-700">
                            <p>Nenhum negócio perdido com motivo registrado.</p>
                            <p className="text-xs">Quando um negócio for perdido, registre o motivo para ver a análise aqui.</p>
                        </div>
                    )}
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm animated-item" style={{ animationDelay: '800ms' }}>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center">
                        <UserGroupIcon className="w-6 h-6 mr-3 text-yellow-500 dark:text-yellow-400"/>
                        Top 5 Clientes por Faturamento
                    </h2>
                    {topClients.length > 0 ? (
                        <div className="border-t border-gray-200 dark:border-slate-700">
                            <table className="w-full text-left">
                                <thead className="text-gray-500 dark:text-gray-400 uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Cliente</th>
                                        <th className="p-3 text-right">Total Faturado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topClients.map((client, index) => (
                                        <tr key={index} className="border-b border-gray-200 dark:border-slate-700 last:border-b-0">
                                            <td className="p-3 text-gray-800 dark:text-slate-200 font-semibold">{client.name}</td>
                                            <td className="p-3 text-right text-gray-700 dark:text-slate-300 font-medium">{formatCurrency(client.value)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-400 dark:text-slate-500 border-t border-gray-200 dark:border-slate-700">
                            <p>Nenhum cliente com negócios faturados para exibir.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportsView;