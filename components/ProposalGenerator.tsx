
import React, { useState, useMemo, useRef } from 'react';
import type { Client, ContractItem } from '../types';
import { GoogleGenAI, Type } from '@google/genai';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { CloudArrowUpIcon } from './icons/CloudArrowUpIcon';
import { exportProposalPDF, valorPorExtenso } from '../utils/export';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PencilIcon } from './icons/PencilIcon';

interface ProposalGeneratorProps {
  clients: Client[];
}

export const ProposalGenerator: React.FC<ProposalGeneratorProps> = ({ clients }) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Dados da Proposta
  const [proposalData, setProposalData] = useState({
    clientName: '',
    uasg: '',
    biddingId: '',
    delivery: '30 dias',
    validity: '90 (noventa) dias',
    payment: 'Conforme Edital / 30 dias após aceite',
    bankInfo: 'Banco: CORA SDC - 403 | Agência: 0001 | Conta Corrente: 5445321-4',
  });

  // Itens da Proposta (Editáveis)
  const [items, setItems] = useState<Omit<ContractItem, 'id'>[]>([]);

  // Dados Oficiais da Empresa - NOME ATUALIZADO CONFORME PEDIDO
  const companyInfo = {
    name: '27.454.615 DONIMARA RIBEIRO DO CARMO',
    cnpj: '27.454.615/0001-44',
    ie: '688.658.049.116',
    phone: '(12) 98155-7822',
    email: 'oficinacomprasnet@gmail.com',
    address: 'Av. Professora Elba Maria Ramos Pereira, 157 - Jardim Hípica Pinheiro - Taubaté - SP - CEP: 12092-821',
    owner: 'DONIMARA RIBEIRO DO CARMO',
    cpf: '013.135.292-06',
    role: 'PROPRIETÁRIA'
  };

  const introText = useMemo(() => {
    return `À ${proposalData.clientName || '[Nome do Órgão]'}\n\nA Oficina da Arte, inscrita sob o CNPJ nº 27.454.615/0001-44, declara seu pleno interesse em fornecer os materiais referentes ao processo nº ${proposalData.biddingId || '[Número do Processo]'}, submetendo-se integralmente às condições e exigências estabelecidas no edital.\n\nReiteramos nossa total disponibilidade e capacidade técnica para atender às demandas desta prestigiada instituição, garantindo o estrito cumprimento dos prazos e a qualidade dos itens solicitados.`;
  }, [proposalData.clientName, proposalData.biddingId]);

  // Filtra itens selecionados para cálculo e exportação
  const selectedItems = useMemo(() => items.filter((_, idx) => selectedIndices.has(idx)), [items, selectedIndices]);
  
  const totalValue = useMemo(() => selectedItems.reduce((s, i) => s + (i.unitValue * i.quantityBid), 0), [selectedItems]);
  const totalExtenso = useMemo(() => valorPorExtenso(totalValue), [totalValue]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { inlineData: { mimeType: 'application/pdf', data: base64Data } },
          { text: "Analise este edital e extraia: Nome do órgão (clientName), UASG, Número da Licitação (biddingId), Prazo de entrega e a lista de itens com 'item', 'description', 'unitValue' (se não houver, deixe 0) e 'quantityBid'." }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clientName: { type: Type.STRING },
              uasg: { type: Type.STRING },
              biddingId: { type: Type.STRING },
              delivery: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    item: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                    unitValue: { type: Type.NUMBER },
                    quantityBid: { type: Type.NUMBER }
                  }
                }
              }
            }
          }
        }
      });
      
      const data = JSON.parse(response.text || '{}');
      const newItems = data.items || [];
      setProposalData(prev => ({
        ...prev,
        clientName: data.clientName?.toUpperCase() || '',
        uasg: data.uasg || '',
        biddingId: data.biddingId || '',
        delivery: data.delivery || '30 dias',
      }));
      setItems(newItems);
      // Seleciona todos os itens por padrão ao importar
      setSelectedIndices(new Set(newItems.map((_: any, i: number) => i)));
    } catch (e) {
      alert('Erro ao processar o PDF.');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleItemSelection = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  const toggleAll = () => {
    if (selectedIndices.size === items.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(items.map((_, i) => i)));
    }
  };

  const handleUpdateItemValue = (index: number, newValue: number) => {
    const newItems = [...items];
    newItems[index].unitValue = newValue;
    setItems(newItems);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setSignatureBase64(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleExport = () => {
    if (!proposalData.clientName) {
        alert("Preencha o nome do órgão comprador.");
        return;
    }
    if (selectedItems.length === 0) {
        alert("Selecione ao menos um item para incluir na proposta.");
        return;
    }
    exportProposalPDF({
      company: companyInfo,
      client: {
        name: proposalData.clientName,
        uasg: proposalData.uasg,
        biddingId: proposalData.biddingId,
      },
      proposal: {
        ...proposalData,
        introText: introText
      },
      items: selectedItems.map((it, idx) => ({ ...it, id: idx })),
      signature: signatureBase64
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 shadow-2xl space-y-10">
        
        {/* Seção 1: Importação e Dados do Órgão */}
        <section className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-yellow-500 rounded-full" />
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Dados da Licitação</h3>
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting}
                    className="flex items-center gap-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-black py-3 px-8 rounded-2xl shadow-xl transition-all active:scale-95 uppercase text-xs tracking-widest"
                >
                    {isExtracting ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <DocumentTextIcon className="w-4 h-4" />}
                    {isExtracting ? 'Processando Edital...' : 'Importar Edital (PDF)'}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block ml-1 tracking-widest">Órgão Comprador</label>
                    <input type="text" value={proposalData.clientName} onChange={e => setProposalData({...proposalData, clientName: e.target.value})} className="w-full bg-black border border-gray-800 rounded-2xl px-5 py-3 text-white text-sm focus:border-yellow-500 outline-none transition-all font-bold" placeholder="EX: DIRETORIA DO PESSOAL DA MARINHA" />
                </div>
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block ml-1 tracking-widest">UASG</label>
                    <input type="text" value={proposalData.uasg} onChange={e => setProposalData({...proposalData, uasg: e.target.value})} className="w-full bg-black border border-gray-800 rounded-2xl px-5 py-3 text-white text-sm font-mono focus:border-yellow-500 outline-none transition-all" placeholder="764000" />
                </div>
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block ml-1 tracking-widest">Processo</label>
                    <input type="text" value={proposalData.biddingId} onChange={e => setProposalData({...proposalData, biddingId: e.target.value})} className="w-full bg-black border border-gray-800 rounded-2xl px-5 py-3 text-white text-sm font-mono focus:border-yellow-500 outline-none transition-all" placeholder="90033/2025" />
                </div>
            </div>
        </section>

        {/* Seção 2: Itens e Valores */}
        <section className="space-y-6 pt-6 border-t border-gray-800/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-yellow-500 rounded-full" />
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Itens da Proposta</h3>
                </div>
                {items.length > 0 && (
                  <button 
                    onClick={toggleAll}
                    className="text-[10px] font-black text-gray-500 hover:text-yellow-500 uppercase tracking-widest transition-colors"
                  >
                    {selectedIndices.size === items.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                )}
            </div>

            <div className="overflow-x-auto rounded-3xl border border-gray-800 bg-black/40">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-black border-b border-gray-800">
                        <tr>
                            <th className="px-4 py-4 w-12 text-center">Incluir</th>
                            <th className="px-4 py-4 w-12 text-center">Item</th>
                            <th className="px-6 py-4">Descrição do Material</th>
                            <th className="px-6 py-4 w-20 text-center">Modelo</th>
                            <th className="px-6 py-4 w-20 text-center">Marca</th>
                            <th className="px-6 py-4 w-24 text-center">Qtd</th>
                            <th className="px-6 py-4 w-40 text-right">Valor Unitário (R$)</th>
                            <th className="px-6 py-4 w-40 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {items.length > 0 ? items.map((item, idx) => (
                            <tr key={idx} className={`hover:bg-yellow-500/5 transition-colors group ${!selectedIndices.has(idx) ? 'opacity-40 grayscale' : ''}`}>
                                <td className="px-4 py-4 text-center">
                                  <button 
                                    onClick={() => toggleItemSelection(idx)}
                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all mx-auto ${
                                      selectedIndices.has(idx) ? 'bg-yellow-500 border-yellow-500' : 'border-gray-700 hover:border-gray-500'
                                    }`}
                                  >
                                    {selectedIndices.has(idx) && <CheckIcon className="w-4 h-4 text-black" />}
                                  </button>
                                </td>
                                <td className="px-4 py-4 text-center font-bold text-gray-400 group-hover:text-yellow-500">{item.item}</td>
                                <td className="px-6 py-4 text-xs font-bold text-gray-300 uppercase leading-tight">{item.description}</td>
                                <td className="px-6 py-4 text-center text-[10px] font-bold text-gray-400">2026</td>
                                <td className="px-6 py-4 text-center text-[10px] font-black text-yellow-600/80">ODA</td>
                                <td className="px-6 py-4 text-center font-black text-white">{item.quantityBid}</td>
                                <td className="px-6 py-4">
                                    <div className="relative group/input">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-[10px]">R$</span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={item.unitValue || ''}
                                            onChange={(e) => handleUpdateItemValue(idx, parseFloat(e.target.value) || 0)}
                                            className="w-full bg-black/60 border border-gray-800 group-hover/input:border-yellow-500/50 rounded-xl pl-8 pr-4 py-2 text-right font-mono font-black text-yellow-500 focus:border-yellow-500 outline-none transition-all"
                                            placeholder="0,00"
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-black text-white">
                                    {(item.unitValue * item.quantityBid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-gray-500 italic">
                                    Nenhum item importado. Use o botão acima para carregar um edital.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-black/80 font-black">
                        <tr className="border-t border-gray-700">
                            <td colSpan={7} className="px-6 py-5 text-right text-gray-400 uppercase tracking-widest text-[10px]">Valor Total Selecionado ({selectedIndices.size} itens):</td>
                            <td className="px-6 py-5 text-right text-xl text-yellow-500 font-mono">
                                {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {totalValue > 0 && (
                <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-1">Valor Total por Extenso:</p>
                    <p className="text-white font-bold italic">({totalExtenso})</p>
                </div>
            )}
        </section>

        {/* Seção 3: Condições e Assinatura */}
        <section className="pt-6 border-t border-gray-800/50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-yellow-500 rounded-full" />
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Condições Finais</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block ml-1">Validade da Proposta</label>
                            <input type="text" value={proposalData.validity} onChange={e => setProposalData({...proposalData, validity: e.target.value})} className="w-full bg-black border border-gray-800 rounded-2xl px-5 py-3 text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block ml-1">Prazo de Entrega</label>
                            <input type="text" value={proposalData.delivery} onChange={e => setProposalData({...proposalData, delivery: e.target.value})} className="w-full bg-black border border-gray-800 rounded-2xl px-5 py-3 text-white text-xs font-bold focus:border-yellow-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block ml-1">Dados Bancários</label>
                        <textarea value={proposalData.bankInfo} onChange={e => setProposalData({...proposalData, bankInfo: e.target.value})} rows={2} className="w-full bg-black border border-gray-800 rounded-2xl px-5 py-3 text-white text-[11px] font-bold focus:border-yellow-500 outline-none resize-none" />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-yellow-500 rounded-full" />
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Assinatura</h3>
                    </div>
                    <div 
                        onClick={() => signatureInputRef.current?.click()}
                        className="group cursor-pointer w-full h-40 bg-black border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center transition-all hover:border-yellow-500/50 hover:bg-yellow-500/5"
                    >
                        {signatureBase64 ? (
                            <div className="relative group">
                                <img src={signatureBase64} alt="Assinatura" className="h-28 object-contain" />
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                    <PencilIcon className="w-8 h-8 text-yellow-500" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <CloudArrowUpIcon className="w-10 h-10 text-gray-700 group-hover:text-yellow-500 transition-colors" />
                                <span className="text-[10px] text-gray-500 mt-3 uppercase font-black tracking-widest group-hover:text-gray-300">Carregar Assinatura Digitalizada</span>
                            </>
                        )}
                    </div>
                    <input type="file" ref={signatureInputRef} onChange={handleSignatureUpload} className="hidden" accept="image/*" />
                    
                    <button 
                        onClick={handleExport}
                        disabled={!proposalData.clientName || selectedItems.length === 0}
                        className="w-full group flex items-center justify-center gap-4 bg-yellow-500 hover:bg-yellow-600 text-black font-black py-5 rounded-3xl shadow-[0_0_40px_rgba(234,179,8,0.2)] transition-all active:scale-95 disabled:opacity-20 uppercase tracking-widest text-lg mt-4"
                    >
                        <DocumentArrowDownIcon className="w-7 h-7" />
                        Gerar PDF Oficial ({selectedItems.length} Itens)
                    </button>
                </div>
            </div>
        </section>

      </div>

      <footer className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest pb-10">
          Proposta Gerada Eletronicamente • Oficina da Arte • {new Date().getFullYear()}
      </footer>

      <style>{`
          .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};
