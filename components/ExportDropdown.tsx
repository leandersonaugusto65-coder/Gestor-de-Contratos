
import React, { useState, useEffect, useRef } from 'react';
import { exportToCSV, exportToPDF } from '../utils/export';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { TableCellsIcon } from './icons/TableCellsIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface ExportDropdownProps {
  headers: string[];
  data: any[][];
  filenamePrefix: string;
  pdfTitle: string;
  pdfSubtitle?: string;
  variant?: 'default' | 'icon';
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({ headers, data, filenamePrefix, pdfTitle, pdfSubtitle, variant = 'default' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isDisabled = data.length === 0;

  const handleExportCSV = () => {
    exportToCSV(headers, data, filenamePrefix);
    setIsOpen(false);
  };

  const handleExportPDF = () => {
    exportToPDF(headers, data, filenamePrefix, pdfTitle, pdfSubtitle);
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

  const baseButtonClass = "transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClasses = {
    default: "flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:enabled:bg-gray-200 dark:hover:enabled:bg-gray-700 text-xs font-semibold",
    icon: "p-1 text-gray-500 dark:text-gray-400 hover:enabled:text-yellow-500"
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={`${baseButtonClass} ${variantClasses[variant]}`}
        title="Exportar dados"
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
        {variant === 'default' && (
          <>
            <span className="hidden sm:inline">Exportar</span>
            <ChevronDownIcon className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 animate-fade-in-down">
          <ul className="py-1">
            <li>
              <button
                onClick={handleExportCSV}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <TableCellsIcon className="w-4 h-4 text-gray-500" />
                <span>Exportar CSV</span>
              </button>
            </li>
            <li>
              <button
                onClick={handleExportPDF}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <DocumentArrowDownIcon className="w-4 h-4 text-gray-500" />
                <span>Exportar PDF</span>
              </button>
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
