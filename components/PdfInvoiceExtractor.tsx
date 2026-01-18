
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckIcon } from './icons/CheckIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import type { Contract, ContractItem, InvoiceItem } from '../types';

interface PdfInvoiceExtractorProps {
  contract: Contract;
  onDataExtracted: (data: { invoiceNumber: string; date: string; items: InvoiceItem[] }) => void;
  onClose: () => void;
}

export const PdfInvoiceExtractor: React.FC<PdfInvoiceExtractorProps> = ({ contract, onDataExtracted, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reviewData, setReviewData] = useState<{
    invoiceNumber: string;
    date: string;
    items: { contractItemId: number; description: string; quantitySupplied: number; unitValue: number }[];
  } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Por favor, selecione uma Nota Fiscal em PDF.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Lendo Nota Fiscal (DANFE)...');
    setError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const contractItemsContext = contract.items.map(i => ({ id: i.id, itemNum: i.item, desc: i.description, price: i.unitValue }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64Data } },
            {
              text: `Analise esta Nota Fiscal. 
              Extraia:
              1. O número da nota fiscal (Campo Nº da nota).
              2. A data de emissão (YYYY-MM-DD).
              3. Os itens fornecidos, relacionando-os com os itens do contrato.
              
              ITENS DO CONTRATO PARA MATCHING:
              ${JSON.stringify(contractItemsContext)}

              REGRAS:
              - Retorne o "id" do contrato que corresponde ao item do PDF.
              - Extraia a quantidade fornecida.
              - Extraia o valor unitário bruto do item conforme o PDF.

              Retorne JSON:
              {
                "invoiceNumber": "string",
                "date": "string",
                "items": [
                  { "contractItemId": number, "description": "string do pdf", "quantitySupplied": number, "unitValue": number }
                ]
              }`
            }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              invoiceNumber: { type: Type.STRING },
              date: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    contractItemId: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                    quantitySupplied: { type: Type.NUMBER },
                    unitValue: { type: Type.NUMBER }
                  }
                }
              }
            }
          }
        }
      });

      const extracted = JSON.parse(response.text || '{}');
      setReviewData(extracted);
    } catch (err) {
      setError('Erro ao ler a Nota Fiscal.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!reviewData) return;
    onDataExtracted({
      invoiceNumber: reviewData.invoiceNumber,
      date: reviewData.date,
      items: reviewData.items.map(i => ({ contractItemId: i.contractItemId, quantitySupplied: i.quantitySupplied }))
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[80] flex justify-center items-center p-4 backdrop-blur-xl">
      <div className="bg-gray-800 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        <header className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
           <div className="flex items-center gap-3">
              <SparklesIcon className="w-6 h-6 text-green-500" />
              <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Revisar Nota Fiscal Extraída</h2>
           </div>
           <button onClick={onClose} className="p-2 text-gray-400 hover:text-white"><XMarkIcon className="w-6 h-6"/></button>
        </header>

        <div className="flex-grow overflow-y-auto p-6 bg-gray-900/20">
          {!reviewData && !isProcessing && (
            <div className="flex flex-col items-center justify-center py-20">
               <DocumentTextIcon className="w-16 h-16 text-gray-600 mb-4" />
               <button onClick={() => fileInputRef.current?.click()} className="bg-green-600 hover:bg-green-700 text-white font-black px-8 py-3 rounded-2xl shadow-lg">Selecionar PDF da Nota (DANFE)</button>
               <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-20">
               <SpinnerIcon className="w-12 h-12 text-green-500 animate-spin mb-4" />
               <p className="text-white font-bold animate-pulse uppercase tracking-widest">{statusMessage}</p>
            </div>
          )}

          {reviewData && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-900/50 p-4 rounded-2xl border border-gray-700">
                  <div>
                     <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nº Nota Fiscal</label>
                     <input type="text" value={reviewData.invoiceNumber} onChange={e => setReviewData({...reviewData, invoiceNumber: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white font-mono"/>
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Data Emissão</label>
                     <input type="date" value={reviewData.date} onChange={e => setReviewData({...reviewData, date: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white"/>
                  </div>
               </div>

               <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Itens Fornecidos</h3>
                  {reviewData.items.map((item, idx) => {
                    const contractItem = contract.items.find(ci => ci.id === item.contractItemId);
                    return (
                      <div key={idx} className="bg-gray-800/50 border border-gray-700 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                         <div className="flex-grow">
                            <p className="text-xs font-bold text-green-500 mb-0.5">
                               {contractItem ? `Correspondência: Item ${contractItem.item}` : '⚠️ Item não identificado'}
                            </p>
                            <p className="text-sm text-white line-clamp-2">{item.description}</p>
                         </div>
                         <div className="flex gap-4 w-full md:w-auto">
                            <div className="w-32">
                                <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Valor Unitário</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">R$</span>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={item.unitValue} 
                                        onChange={e => {
                                            const newItems = [...reviewData.items];
                                            newItems[idx].unitValue = Number(e.target.value);
                                            setReviewData({...reviewData, items: newItems});
                                        }}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-6 pr-2 py-1.5 text-white text-right font-mono font-bold text-xs"
                                    />
                                </div>
                            </div>
                            <div className="w-24">
                                <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Qtd Entregue</label>
                                <input 
                                    type="number" 
                                    value={item.quantitySupplied} 
                                    onChange={e => {
                                        const newItems = [...reviewData.items];
                                        newItems[idx].quantitySupplied = Number(e.target.value);
                                        setReviewData({...reviewData, items: newItems});
                                    }} 
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center font-bold text-xs"
                                />
                            </div>
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>
          )}
        </div>

        <footer className="p-6 bg-gray-900 border-t border-gray-700 flex justify-end gap-4">
           <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-400">Cancelar</button>
           <button onClick={handleConfirm} disabled={!reviewData} className="bg-green-600 hover:bg-green-700 text-white font-black px-10 py-2 rounded-2xl disabled:opacity-50 shadow-lg">Confirmar e Salvar Nota</button>
        </footer>
      </div>
    </div>
  );
};
