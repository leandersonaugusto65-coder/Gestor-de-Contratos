
import React from 'react';
import { IdentificationIcon } from './icons/IdentificationIcon';

export const HabilitacaoView: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-800 text-gray-500">
      <IdentificationIcon className="w-16 h-16 mb-4 opacity-20" />
      <h2 className="text-xl font-bold text-gray-400">Gerenciador de Habilitação</h2>
      <p className="text-sm mt-2 max-w-md text-center">
        Esta área será dedicada ao upload, gerenciamento e versionamento dos documentos de habilitação da empresa (certidões, balanços, etc.).
      </p>
      <p className="text-xs mt-4 italic">Funcionalidade em desenvolvimento.</p>
    </div>
  );
};
