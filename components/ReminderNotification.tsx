import React from 'react';
import type { Reminder } from '../types';
import { BellIcon } from './icons';

interface ReminderNotificationProps {
  reminder: Reminder;
  onDismiss: () => void;
}

const ReminderNotification: React.FC<ReminderNotificationProps> = ({ reminder, onDismiss }) => {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4 fade-in">
      <div className="bg-[var(--background-secondary)] w-full max-w-md rounded-xl shadow-2xl p-6 text-center border-t-4 border-[var(--accent-primary)]">
        <div className="w-16 h-16 bg-[var(--background-accent-subtle)] rounded-full flex items-center justify-center mx-auto mb-4">
            <BellIcon className="w-8 h-8 text-[var(--text-accent)] animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Lembrete!</h2>
        <p className="text-lg text-[var(--text-secondary)] mt-2">{reminder.title}</p>
        <p className="text-sm text-[var(--text-tertiary)] mt-1">
            Agendado para: {new Date(reminder.reminderDateTime).toLocaleString('pt-BR')}
        </p>
        <button 
            onClick={onDismiss}
            className="mt-6 w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] font-bold py-3 px-4 rounded-lg transition-colors duration-200"
        >
            Ok, entendi
        </button>
      </div>
    </div>
  );
};

export default ReminderNotification;