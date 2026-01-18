import React from 'react';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';

interface BackupButtonProps {
  onBackup: () => void;
}

export const BackupButton: React.FC<BackupButtonProps> = ({ onBackup }) => {
  return (
    <button
      onClick={onBackup}
      className="p-2 rounded-full hover:bg-gray-700 transition-colors"
      title="Fazer Backup (Exportar)"
    >
      <ArrowDownTrayIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
    </button>
  );
};