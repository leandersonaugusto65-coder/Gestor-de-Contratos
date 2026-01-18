
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckIcon } from './icons/CheckIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { formatCNPJ, stripCNPJ } from '../utils/cnpj';
import type { ContractItem } from '../types';

interface PdfFullExtractorProps {
  onDataExtracted: (data: { 
    clientName: string; 
    uasg: string; 
    cnpj: string; 
    address: string;
    cep: string;
    biddingId: string; 
    biddingType: 'pregão' | 'dispensa';
    items: Omit<ContractItem, 'id'>[];
  }) => void;
  onClose: () => void;
}

export const PdfFullExtractor: React.FC<PdfFullExtractorProps> = ({ onDataExtracted, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reviewData, setReviewData] = useState<{
    clientName: string;
    uasg: string;
    cnpj: string;
    address: string;
    cep: string;
    biddingId: string;
    biddingType: 'pregão' | 'dispensa';
    items: Omit<ContractItem, 'id'>[];
  } | null>(null);

  const [selectedItemIndices, setSelectedItemIndices] = useState<Set<number>>(new Set());

  const fetchAddressByCnpj = async (cnpj: string) => {
    const cleanCnpj = stripCNPJ(cnpj);
    if (cleanCnpj.length !== 14) return null;
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (response.ok) {
        const data = await response.json();
        const fullAddress = [
          data.logradouro, 
          data.numero, 
          data.complemento, 
          data.bairro, 
          data.municipio, 
          data.uf
        ].filter(Boolean).join(', ');
        return {
          address: fullAddress,
          cep: data.cep ? data.cep.replace(/\D/g, '') : ''
        };
      }
    } catch (e) {
      console.error("Erro ao buscar endereço:", e);
    }
    return null;
  };

  const searchOnlyCnpj = async (extractedName: string) => {
    setStatusMessage(`Localizando CNPJ para: ${extractedName}...`);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Qual é o número de CNPJ oficial do seguinte órgão público brasileiro: "${extractedName}"? 
        Responda obrigatoriamente apenas o número puro (14 dígitos).`,
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cnpj: { type: Type.STRING, description: 'O número do CNPJ com 14 dígitos' }
            },
            required: ['cnpj']
          }
        },
      });
      
      const info = JSON.parse(response.text || '{}');
      return info.cnpj ? stripCNPJ(info.cnpj) : null;
    } catch (e) {
      console.error("Erro na busca do CNPJ no Google:", e);
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF válido.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Lendo PDF e extraindo dados...');
    setError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64Data } },
            {
              text: `Analise este documento de licitação e extraia os dados fielmente.
              
              REGRAS:
              1. clientName: Nome do Órgão Comprador EXATAMENTE como escrito no documento.
              2. biddingId: Número da licitação (ex: 90033/2024).
              3. biddingType: "pregão" ou "dispensa".
              4. uasg: Código UASG (6 dígitos).
              5. items: Lista de todos os itens com Número, Descrição, Valor Unitário e Quantidade.

              Retorne JSON:
              {
                "clientName": "string",
                "uasg": "string",
                "biddingId": "string",
                "biddingType": "pregão" | "dispensa",
                "items": [
                  { "item": number, "description": "string", "unitValue": number, "quantityBid": number }
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
              clientName: { type: Type.STRING },
              uasg: { type: Type.STRING },
              biddingId: { type: Type.STRING },
              biddingType: { type: Type.STRING, enum: ['pregão', 'dispensa'] },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                    unitValue: { type: Type.NUMBER },
                    quantityBid: { type: Type.NUMBER }
                  },
                  required: ['item', 'description', 'unitValue', 'quantityBid']
                }
              }
            }
          }
        }
      });

      const extracted = JSON.parse(response.text || '{}');
      if (!extracted.clientName || extracted.items.length === 0) {
        throw new Error("Não foi possível identificar o órgão ou os itens no PDF.");
      }

      // 1. O NOME DO PDF PREVALECE (extracted.clientName)
      const organNameFromPdf = extracted.clientName;

      // 2. BUSCA SOMENTE O CNPJ NA INTERNET
      const foundCnpj = await searchOnlyCnpj(organNameFromPdf);
      
      let finalAddress = '';
      let finalCep = '';

      // 3. BUSCA ENDEREÇO VIA CNPJ (Receita Federal)
      if (foundCnpj && foundCnpj.length === 14) {
        setStatusMessage('Consultando endereço oficial...');
        const addrData = await fetchAddressByCnpj(foundCnpj);
        if (addrData) {
          finalAddress = addrData.address;
          finalCep = addrData.cep;
        }
      }

      setReviewData({
        clientName: organNameFromPdf, // Mantém o nome original do PDF
        uasg: extracted.uasg || '',
        cnpj: foundCnpj || '',
        address: finalAddress,
        cep: finalCep,
        biddingId: extracted.biddingId,
        biddingType: extracted.biddingType,
        items: extracted.items || []
      });
      setSelectedItemIndices(new Set(extracted.items.map((_: any, i: number) => i)));

    } catch (err) {
      console.error(err);
      setError('Erro ao processar o arquivo. Certifique-se que o PDF não está protegido por senha.');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleConfirmImport = () => {
    if (!reviewData) return;
    const finalItems = reviewData.items.filter((_, i) => selectedItemIndices.has(i));
    onDataExtracted({ ...reviewData, items: finalItems });
  };

  const updateHeader = (field: string, value: string) => {
    if (!reviewData) return;
    setReviewData({ ...reviewData, [field]: value } as any);
  };

  const updateItem = (index: number, field: string, value: any) => {
    if (!reviewData) return;
    const newItems = [...reviewData.items];
    newItems[index] = { ...newItems[index], [field]: value } as any;
    setReviewData({ ...reviewData, items: newItems });
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[70] flex justify-center items-center p-4 backdrop-blur-xl">
      <div className="bg-gray-800 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-fade-in-up">
        <header className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900/80">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-2xl border border-yellow-500/30">
              <SparklesIcon className="w-7 h-7 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Importação de Edital</h2>
              <p className="text-xs text-gray-400">Nome do PDF + CNPJ da Web</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-grow overflow-y-auto p-6 space-y-8 bg-gray-900/30">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)}><XMarkIcon className="w-4 h-4"/></button>
            </div>
          )}

          {!reviewData && !isProcessing && (
             <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 bg-gray-800 rounded-3xl flex items-center justify-center mb-6 border-2 border-dashed border-gray-700">
                  <DocumentTextIcon className="w-12 h-12 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-100 uppercase tracking-tighter">Carregar Arquivo da Licitação</h3>
                <p className="text-sm text-gray-500 max-w-sm mt-2 mb-8 italic">
                  O nome será lido do PDF e o CNPJ será buscado automaticamente na internet.
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-black py-4 px-10 rounded-2xl transition-all shadow-xl active:scale-95 flex items-center gap-3"
                >
                  <DocumentTextIcon className="w-5 h-5"/>
                  Selecionar PDF
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
             </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-24">
               <div className="relative">
                 <SpinnerIcon className="w-20 h-20 text-yellow-500 animate-spin" />
                 <SparklesIcon className="w-8 h-8 text-yellow-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
               </div>
               <h3 className="text-2xl font-black text-white mt-8 tracking-tighter animate-pulse uppercase">{statusMessage || 'Processando...'}</h3>
            </div>
          )}

          {reviewData && (
            <div className="animate-fade-in space-y-8">
              <section className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 shadow-inner">
                <h3 className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-6 flex items-center gap-3">
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  Dados do Órgão
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-8">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Nome Extraído do PDF</label>
                    <input type="text" value={reviewData.clientName} onChange={(e) => updateHeader('clientName', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-yellow-500 outline-none font-bold" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">CNPJ (Localizado via Web)</label>
                    <div className="relative">
                      <input type="text" value={formatCNPJ(reviewData.cnpj)} onChange={(e) => updateHeader('cnpj', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-yellow-500 focus:border-yellow-500 outline-none font-mono font-bold" />
                      {reviewData.cnpj.length === 14 && <CheckIcon className="w-4 h-4 text-green-500 absolute right-4 top-1/2 -translate-y-1/2" />}
                    </div>
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Licitação Nº</label>
                    <input type="text" value={reviewData.biddingId} onChange={(e) => updateHeader('biddingId', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-yellow-500 outline-none font-bold" />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Modalidade</label>
                    <select value={reviewData.biddingType} onChange={(e) => updateHeader('biddingType', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-yellow-500 outline-none" >
                      <option value="pregão">Pregão Eletrônico</option>
                      <option value="dispensa">Dispensa/Outros</option>
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">UASG</label>
                    <input type="text" value={reviewData.uasg} onChange={(e) => updateHeader('uasg', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-white focus:border-yellow-500 outline-none font-mono" />
                  </div>
                  <div className="md:col-span-12">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1 flex items-center gap-1">
                      <MapPinIcon className="w-3 h-3"/> Endereço Oficial (Puxado via CNPJ)
                    </label>
                    <input type="text" value={`${reviewData.address}${reviewData.cep ? ` | CEP: ${reviewData.cep}` : ''}`} onChange={(e) => updateHeader('address', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 text-gray-300 focus:border-yellow-500 outline-none text-sm" />
                  </div>
                </div>
              </section>

              <section>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black text-yellow-600 uppercase tracking-widest flex items-center gap-3">
                    <DocumentTextIcon className="w-4 h-4" />
                    Itens Lidos do PDF ({reviewData.items.length})
                  </h3>
                  <button onClick={() => setSelectedItemIndices(selectedItemIndices.size === reviewData.items.length ? new Set() : new Set(reviewData.items.map((_, i) => i)))} className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase">
                    {selectedItemIndices.size === reviewData.items.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {reviewData.items.map((item, idx) => (
                    <div key={idx} className={`flex gap-4 p-5 rounded-3xl border transition-all ${selectedItemIndices.has(idx) ? 'bg-yellow-600/5 border-yellow-500/30' : 'bg-gray-800/20 border-gray-700/50 opacity-40 grayscale'}`} >
                      <button onClick={() => { const next = new Set(selectedItemIndices); if (next.has(idx)) next.delete(idx); else next.add(idx); setSelectedItemIndices(next); }} className={`w-7 h-7 flex-shrink-0 rounded-xl border-2 flex items-center justify-center transition-all mt-2 ${selectedItemIndices.has(idx) ? 'bg-yellow-500 border-yellow-500' : 'border-gray-600'}`} >
                        {selectedItemIndices.has(idx) && <CheckIcon className="w-5 h-5 text-black" />}
                      </button>
                      <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                        <div className="md:col-span-1">
                           <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Item</label>
                           <input type="number" value={item.item} onChange={(e) => updateItem(idx, 'item', parseInt(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-2 text-white text-center font-bold"/>
                        </div>
                        <div className="md:col-span-7">
                           <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Descrição</label>
                           <textarea value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white resize-none" rows={2}/>
                        </div>
                        <div className="md:col-span-2">
                           <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Unitário</label>
                           <input type="number" step="0.01" value={item.unitValue} onChange={(e) => updateItem(idx, 'unitValue', parseFloat(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-yellow-500 font-mono font-bold"/>
                        </div>
                        <div className="md:col-span-2">
                           <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Qtd</label>
                           <input type="number" value={item.quantityBid} onChange={(e) => updateItem(idx, 'quantityBid', parseInt(e.target.value))} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-300 font-bold"/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        <footer className="p-6 bg-gray-900 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
           <div className="text-xs text-gray-400 font-medium italic">
             {reviewData ? `Confirmando dados para: ${reviewData.clientName}` : ''}
           </div>
           <div className="flex gap-4 w-full sm:w-auto">
              <button onClick={onClose} className="flex-1 sm:flex-none px-8 py-3 text-sm font-bold text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleConfirmImport} disabled={!reviewData || selectedItemIndices.size === 0} className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-10 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-black text-sm rounded-2xl transition-all shadow-xl disabled:opacity-30 active:scale-95" >
                Confirmar Importação Total
              </button>
           </div>
        </footer>
      </div>
    </div>
  );
};
