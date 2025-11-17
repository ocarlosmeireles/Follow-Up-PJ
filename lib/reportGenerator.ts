import type { Budget, Client, Contact, UserProfile, FollowUp, Organization } from '../types';

type ReportDataItem = {
    budget: Budget;
    client: Client;
    contact: Contact;
    followUps: FollowUp[];
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatTimestamp = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (dateString.includes('T')) {
        return date.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'America/Sao_Paulo',
        }).replace(',', ' às');
    } else {
        const [year, month, day] = dateString.split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day));
        return utcDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }
};

export const generateFollowUpReport = (
    title: string,
    reportData: ReportDataItem[],
    userProfile: UserProfile,
    organization: Organization | null
) => {
    const reportHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
                    font-size: 11px;
                    line-height: 1.5;
                    color: #333;
                    margin: 0;
                    padding: 0;
                }
                .page {
                    padding: 2.5cm 2cm;
                    width: 21cm;
                    min-height: 29.7cm;
                    box-sizing: border-box;
                    page-break-after: always;
                }
                @page {
                    size: A4;
                    margin: 0;
                }
                .report-header {
                    text-align: center;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                    position: relative;
                }
                .org-logo {
                    position: absolute;
                    top: -10px;
                    left: 0;
                    max-height: 40px;
                    max-width: 150px;
                    object-fit: contain;
                }
                .report-header h1 {
                    margin: 0;
                    color: #1a202c;
                    font-size: 24px;
                }
                .report-header p {
                    margin: 2px 0;
                    font-size: 12px;
                    color: #718096;
                }
                .budget-section {
                    margin-bottom: 25px;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 15px;
                    page-break-inside: avoid;
                }
                .budget-header {
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .budget-header .client-logo {
                    max-width: 50px;
                    max-height: 50px;
                    object-fit: contain;
                }
                .budget-header h2 {
                    font-size: 16px;
                    margin: 0;
                    color: #2d3748;
                }
                .budget-header span {
                    font-size: 12px;
                    color: #4a5568;
                }
                .budget-details {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                    font-size: 12px;
                }
                .followup-list h3 {
                    font-size: 13px;
                    color: #4a5568;
                    margin-bottom: 10px;
                }
                .followup-item {
                    border-left: 3px solid #cbd5e0;
                    padding-left: 15px;
                    margin-bottom: 12px;
                }
                .followup-item p {
                    margin: 3px 0;
                }
                .followup-item p:first-child {
                    font-weight: bold;
                    color: #718096;
                }
                .no-followups {
                    font-style: italic;
                    color: #718096;
                }
                .footer {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-size: 10px;
                    color: #a0aec0;
                    padding: 1cm;
                }
                 @media print {
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="report-header">
                    ${organization?.logoUrl ? `<img src="${organization.logoUrl}" class="org-logo" alt="${organization.name} logo">` : ''}
                    <h1>${title}</h1>
                    <p>Gerado por: <strong>${userProfile.name}</strong> (Matrícula: ${userProfile.matricula})</p>
                    <p>Data de Geração: ${new Date().toLocaleString('pt-BR')}</p>
                </div>
            
                ${reportData.map(item => `
                    <div class="budget-section">
                        <div class="budget-header">
                            ${item.client.logoUrl ? `<img src="${item.client.logoUrl}" class="client-logo" alt="${item.client.name} logo">` : ''}
                            <div>
                                <h2>${item.budget.title}</h2>
                                <span><strong>Cliente:</strong> ${item.client.name}</span>
                            </div>
                        </div>
                        <div class="budget-details">
                            <div><strong>Contato:</strong> ${item.contact.name}</div>
                            <div><strong>Valor:</strong> ${formatCurrency(item.budget.value)}</div>
                            <div><strong>Status:</strong> ${item.budget.status}</div>
                        </div>
                        <div class="followup-list">
                            <h3>Histórico de Follow-ups</h3>
                            ${item.followUps.length > 0 ? item.followUps.map(fu => `
                                <div class="followup-item">
                                    <p>Data: ${formatTimestamp(fu.date)} ${fu.status ? `| <strong>Status: ${fu.status}</strong>` : ''}</p>
                                    <p>${fu.notes ? fu.notes.replace(/\n/g, '<br>') : '<em>Nenhuma nota de texto.</em>'}</p>
                                </div>
                            `).join('') : '<p class="no-followups">Nenhum follow-up registrado para este relatório.</p>'}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="footer">Follow-up CRM - &copy; ${new Date().getFullYear()}</div>
        </body>
        </html>
    `;

    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
        reportWindow.document.write(reportHtml);
        reportWindow.document.close();
        // Delay print to allow styles to load
        setTimeout(() => reportWindow.print(), 500);
    } else {
        alert('Por favor, habilite pop-ups para gerar o relatório.');
    }
};
