import React, { useState, useEffect, useRef } from 'react';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';

interface DataManagementDropdownProps {
  onBackup: () => void;
  onRestore: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DataManagementDropdown: React.FC<DataManagementDropdownProps> = ({ onBackup, onRestore }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-700 transition-colors"
        title="Gerenciar Dados"
      >
        <DatabaseIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
        <span className="hidden sm:inline text-sm font-semibold text-gray-300">Dados</span>
        <ChevronDownIcon className={`hidden sm:block w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20 animate-fade-in-down">
          <ul className="py-2">
            <li className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Gerenciar Dados</li>
            <li>
              <button
                onClick={onBackup}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-3"
              >
                <ArrowDownTrayIcon className="w-5 h-5 text-gray-400" />
                <span>Fazer Backup (Exportar)</span>
              </button>
            </li>
            <li>
              <button
                onClick={handleRestoreClick}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-3"
              >
                <ArrowUpTrayIcon className="w-5 h-5 text-gray-400" />
                <span>Restaurar Backup (Importar)</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onRestore}
                accept=".json"
                className="hidden"
              />
            </li>
          </ul>
        </div>
      )}
      <style>{`
          @keyframes fade-in-down {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-down {
            animation: fade-in-down 0.2s ease-out forwards;
          }
      `}</style>
    </div>
  );
};