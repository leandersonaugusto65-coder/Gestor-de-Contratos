
import React, { useRef } from 'react';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';

interface RestoreButtonProps {
  onRestore: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const RestoreButton: React.FC<RestoreButtonProps> = ({ onRestore }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <button
        onClick={handleRestoreClick}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Restaurar Backup (Importar)"
      >
        <ArrowUpTrayIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300" />
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onRestore}
        accept=".json"
        className="hidden"
      />
    </>
  );
};
