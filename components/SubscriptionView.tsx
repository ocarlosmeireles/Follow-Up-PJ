import React from 'react';
import type { Organization } from '../types';
import type { User } from 'firebase/auth';
import { ExclamationTriangleIcon, ArrowRightStartOnRectangleIcon } from './icons';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface SubscriptionViewProps {
  organization: Organization | null;
  user: User | null;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ organization, user }) => {
    
    const handleLogout = async () => {
        await signOut(auth);
        window.location.reload(); // Force a full reload to clear state
    };

    const getStatusMessage = () => {
        switch (organization?.subscriptionStatus) {
            case 'past_due':
                return { title: 'Pagamento Pendente', message: 'Não conseguimos processar seu último pagamento. Por favor, contate o suporte para reativar sua conta.' };
            case 'unpaid':
                return { title: 'Ative sua Conta', message: 'Sua assinatura precisa ser ativada. Por favor, contate o suporte para iniciar seu plano e desbloquear todos os recursos.' };
            case 'canceled':
                 return { title: 'Assinatura Cancelada', message: 'Sua assinatura foi cancelada. Contate o suporte se desejar reativá-la.' };
            default:
                return { title: 'Conta Suspensa', message: 'O acesso à sua conta foi suspenso. Por favor, entre em contato com nosso suporte para resolver a pendência e reativar seus serviços.' };
        }
    };

    const { title, message } = getStatusMessage();

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-lg mx-auto">
                <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-8 text-center border border-gray-200 dark:border-slate-700">
                    <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-yellow-500" />
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-6">
                        {title}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-3 text-base">
                        Olá! O acesso à organização <strong className="text-gray-700 dark:text-slate-200">{organization?.name || '...'}</strong> está temporariamente indisponível.
                    </p>
                    <div className="mt-6 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                         <p className="text-gray-600 dark:text-slate-300 text-sm">{message}</p>
                    </div>

                    <div className="mt-8">
                        <a href="mailto:suporte@exemplo.com" className="w-full inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg text-lg">
                            Contatar Suporte
                        </a>
                        <button 
                            onClick={handleLogout}
                            className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-slate-200"
                        >
                            <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                            Sair da conta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionView;
