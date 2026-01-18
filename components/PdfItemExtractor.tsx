
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import type { ContractItem } from '../types';

interface PdfItemExtractorProps {
  onItemsExtracted: (items: Omit<ContractItem, 'id'>[]) => void;
  onClose: () => void;
}

export const PdfItemExtractor: React.FC<PdfItemExtractorProps> = ({ onItemsExtracted, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<Omit<ContractItem, 'id'>[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const base64Data = await fileToBase64(file);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data
                }
              },
              {
                text: `Analise este documento de licitação e extraia a lista de itens. 
                Para cada item, identifique o número do item, a descrição detalhada, o valor unitário licitado e a quantidade licitada.
                Ignore itens que não possuam valores ou quantidades claras.
                Retorne estritamente um array JSON de objetos com as chaves: "item" (número), "description" (texto), "unitValue" (número decimal) e "quantityBid" (número inteiro).`
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.NUMBER, description: 'O número identificador do item na licitação' },
                description: { type: Type.STRING, description: 'Descrição completa do produto ou serviço' },
                unitValue: { type: Type.NUMBER, description: 'O valor unitário adjudicado/homologado' },
                quantityBid: { type: Type.NUMBER, description: 'A quantidade total licitada para este item' }
              },
              required: ['item', 'description', 'unitValue', 'quantityBid']
            }
          }
        }
      });

      const jsonStr = response.text;
      const items = JSON.parse(jsonStr || '[]');
      setExtractedItems(items);
      setSelectedIndices(new Set(items.map((_: any, i: number) => i)));
    } catch (err) {
      console.error(err);
      setError('Erro ao processar o PDF. Verifique se o arquivo é legível e tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const toggleSelection = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  const handleUpdateItem = (index: number, field: keyof Omit<ContractItem, 'id'>, value: any) => {
    const updated = [...extractedItems];
    updated[index] = { ...updated[index], [field]: value };
    setExtractedItems(updated);
  };

  const handleImport = () => {
    const selected = extractedItems.filter((_, i) => selectedIndices.has(i));
    // Validar se todos os selecionados têm valores válidos antes de importar
    const hasInvalid = selected.some(item => isNaN(item.unitValue) || isNaN(item.quantityBid) || !item.description.trim());
    if (hasInvalid) {
        setError("Certifique-se de que todos os itens selecionados têm descrição, valor e quantidade preenchidos corretamente.");
        return;
    }
    onItemsExtracted(selected);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex justify-center items-center p-4 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        <header className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl">
              <SparklesIcon className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Revisão de Itens Extraídos</h2>
              <p className="text-xs text-gray-400">Verifique e edite os valores encontrados pela IA</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-grow overflow-y-auto p-6 bg-gray-900/20">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)}><XMarkIcon className="w-4 h-4"/></button>
            </div>
          )}

          {extractedItems.length === 0 && !isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-gray-700/30 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-gray-600">
                <DocumentTextIcon className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-200">Selecione o Documento</h3>
              <p className="text-sm text-gray-500 max-w-xs mb-8">Arraste um PDF (Edital ou Homologação) para extrair os itens.</p>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-2xl transition-all shadow-lg hover:shadow-yellow-500/20 active:scale-95"
              >
                Selecionar Arquivo PDF
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
            </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <SpinnerIcon className="w-16 h-16 text-yellow-500 animate-spin" />
                <SparklesIcon className="w-6 h-6 text-yellow-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white mt-6 animate-pulse">Lendo PDF com Inteligência Artificial...</h3>
              <p className="text-sm text-gray-400 mt-2 italic">Aguarde, estamos processando tabelas e descrições.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-900/60 p-4 rounded-xl border border-gray-700/50 mb-6">
                <div className="flex items-center gap-4">
                   <span className="text-sm font-bold text-white">{extractedItems.length} Itens Extraídos</span>
                   <div className="w-px h-4 bg-gray-700" />
                   <span className="text-xs text-gray-400">{selectedIndices.size} selecionados para importação</span>
                </div>
                <button 
                  onClick={() => setSelectedIndices(selectedIndices.size === extractedItems.length ? new Set() : new Set(extractedItems.map((_, i) => i)))}
                  className="text-xs font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
                >
                  {selectedIndices.size === extractedItems.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {extractedItems.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`flex flex-col sm:flex-row gap-4 p-5 rounded-2xl border transition-all ${
                      selectedIndices.has(idx) 
                        ? 'bg-yellow-600/5 border-yellow-500/40 shadow-[0_0_15px_rgba(202,138,4,0.05)]' 
                        : 'bg-gray-800/40 border-gray-700/50 opacity-60 grayscale-[0.5]'
                    }`}
                  >
                    <div className="flex items-start pt-2">
                        <button 
                            onClick={() => toggleSelection(idx)}
                            className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            selectedIndices.has(idx) ? 'bg-yellow-500 border-yellow-500' : 'border-gray-600 hover:border-gray-500'
                            }`}
                        >
                            {selectedIndices.has(idx) && (
                                <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* ID e Descrição */}
                        <div className="md:col-span-1 flex items-start pt-2">
                             <span className="text-xs font-black text-yellow-600 bg-yellow-600/10 px-2 py-1 rounded">#{item.item}</span>
                        </div>
                        
                        <div className="md:col-span-6">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição do Item</label>
                            <textarea 
                                value={item.description}
                                onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-yellow-500 transition-colors resize-none"
                                rows={2}
                            />
                        </div>

                        <div className="md:col-span-3">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Valor Unitário (R$)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">R$</span>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={item.unitValue}
                                    onChange={(e) => handleUpdateItem(idx, 'unitValue', parseFloat(e.target.value))}
                                    className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-8 pr-3 py-2 text-sm font-mono text-yellow-500 focus:outline-none focus:border-yellow-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Quantidade</label>
                            <input 
                                type="number"
                                value={item.quantityBid}
                                onChange={(e) => handleUpdateItem(idx, 'quantityBid', parseInt(e.target.value))}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl px-3 py-2 text-sm font-mono text-gray-200 focus:outline-none focus:border-yellow-500 transition-colors"
                            />
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="p-6 bg-gray-900/80 border-t border-gray-700 flex justify-between items-center">
          <div className="text-xs text-gray-500 italic hidden sm:block">
            Dica: Edite os campos acima antes de clicar em importar.
          </div>
          <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={handleImport}
                disabled={selectedIndices.size === 0 || isProcessing}
                className="flex items-center gap-2 px-8 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-sm rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
                <CheckIcon className="w-5 h-5"/>
                Importar {selectedIndices.size} {selectedIndices.size === 1 ? 'Item' : 'Itens'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

const DocumentTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);
