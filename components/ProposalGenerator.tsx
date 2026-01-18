
import React, { useState, useMemo, useRef } from 'react';
import type { Client, Contract, ContractItem } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { GoogleGenAI, Type } from '@google/genai';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { CloudArrowUpIcon } from './icons/CloudArrowUpIcon';
import { exportProposalPDF } from '../utils/export';
import { formatCNPJ } from '../utils/cnpj';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

interface ProposalGeneratorProps {
  clients: Client[];
}

export const ProposalGenerator: React.FC<ProposalGeneratorProps> = ({ clients }) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Dados da Proposta (Editáveis por precaução)
  const [proposalData, setProposalData] = useState({
    clientName: '',
    uasg: '',
    biddingId: '',
    delivery: '',
    validity: '90 (noventa) dias',
    payment: 'Conforme Edital / 30 dias após aceite',
    bankInfo: 'Banco: CORA SDC - 403 | Agência: 0001 | Conta Corrente: 5445321-4',
    introText: '',
  });

  // Itens da Proposta (Preenchidos via PDF)
  const [items, setItems] = useState<Omit<ContractItem, 'id'>[]>([]);

  // Dados Oficiais da Empresa (Fixo conforme imagem)
  const companyInfo = {
    name: 'DONIMARA RIBEIRO DO CARMO',
    cnpj: '27.454.615/0001-44',
    ie: '688.658.049.116',
    phone: '(12) 98155-7822',
    email: 'oficinacomprasnet@gmail.com',
    address: 'Av. Professora Elba Maria Ramos Pereira, 157 - Jardim Hípica Pinheiro - Taubaté - SP - CEP: 12092-821',
    owner: 'DONIMARA RIBEIRO DO CARMO',
    cpf: '013.135.292-06',
    role: 'PROPRIETÁRIA'
  };

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
          { text: "Analise este documento (edital/tr) e extraia: 1. Nome do Órgão, 2. Código UASG, 3. Número da Licitação/Processo, 4. Prazo de entrega mencionado, 5. Tabela de itens com Descrição, Valor Unitário (se houver, senão 0) e Quantidade." }
        ],
        config: {
          responseMimeType: 'application/json',
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
      setProposalData(prev => ({
        ...prev,
        clientName: data.clientName || '',
        uasg: data.uasg || '',
        biddingId: data.biddingId || '',
        delivery: data.delivery || 'Conforme Edital',
      }));
      setItems(data.items || []);
    } catch (e) {
      alert('Erro ao processar o PDF.');
    } finally {
      setIsExtracting(false);
    }
  };

  const generateIntroWithIA = async () => {
    if (!proposalData.clientName) {
        alert("Preencha o nome do órgão ou importe um edital primeiro.");
        return;
    }
    setIsGeneratingText(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Escreva um texto formal de interesse para fornecimento de materiais para o órgão ${proposalData.clientName} referente ao processo ${proposalData.biddingId}.`,
        config: {
          systemInstruction: "Você é um assistente comercial. O texto DEVE obrigatoriamente começar com: 'A Oficina da Arte, inscrita sob o CNPJ nº 27.454.615/0001-44,'. O texto deve declarar pleno interesse, submissão às condições do edital e reafirmar disponibilidade técnica. IMPORTANTE: Não use saudações como 'Atenciosamente' ou o nome da empresa no final, pois isso já consta na assinatura da página."
        }
      });
      setProposalData(prev => ({ ...prev, introText: response.text || '' }));
    } catch (e) {
      alert('Erro na IA.');
    } finally {
      setIsGeneratingText(false);
    }
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
    if (!proposalData.clientName) return;
    exportProposalPDF({
      company: companyInfo,
      client: {
        name: proposalData.clientName,
        uasg: proposalData.uasg,
        biddingId: proposalData.biddingId,
      },
      proposal: proposalData,
      items: items.map((it, idx) => ({ ...it, id: idx })),
      signature: signatureBase64
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Coluna de Configuração */}
      <div className="xl:col-span-4 space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <header>
             <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting}
                className="w-full flex items-center justify-center gap-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-tighter"
             >
                {isExtracting ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <DocumentTextIcon className="w-5 h-5" />}
                {isExtracting ? 'Processando Edital...' : 'Importar Dados do Edital (PDF)'}
             </button>
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf" />
             <p className="text-[10px] text-gray-500 uppercase font-black text-center mt-3 tracking-widest">A IA preencherá os campos abaixo</p>
          </header>

          <div className="space-y-4 pt-4 border-t border-gray-800/50">
             <div>
                <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block ml-1">Órgão Comprador</label>
                <input type="text" value={proposalData.clientName} onChange={e => setProposalData({...proposalData, clientName: e.target.value})} className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-yellow-500 outline-none" />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block ml-1">UASG</label>
                    <input type="text" value={proposalData.uasg} onChange={e => setProposalData({...proposalData, uasg: e.target.value})} className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:border-yellow-500 outline-none" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block ml-1">Processo/Licitação</label>
                    <input type="text" value={proposalData.biddingId} onChange={e => setProposalData({...proposalData, biddingId: e.target.value})} className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:border-yellow-500 outline-none" />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block ml-1">Prazo de Entrega</label>
                    <input type="text" value={proposalData.delivery} onChange={e => setProposalData({...proposalData, delivery: e.target.value})} className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-yellow-500 outline-none" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block ml-1">Validade Proposta</label>
                    <input type="text" value={proposalData.validity} onChange={e => setProposalData({...proposalData, validity: e.target.value})} className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-white text-sm focus:border-yellow-500 outline-none" />
                </div>
             </div>

             <div>
                <label className="text-[10px] font-black text-gray-500 uppercase mb-1 block ml-1">Dados Bancários</label>
                <textarea value={proposalData.bankInfo} onChange={e => setProposalData({...proposalData, bankInfo: e.target.value})} className="w-full bg-black border border-gray-800 rounded-xl px-4 py-2 text-white text-[11px] h-20 resize-none focus:border-yellow-500 outline-none" />
             </div>
          </div>

          <div className="pt-4 border-t border-gray-800/50">
             <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Assinatura Digitalizada</h3>
             <div 
              onClick={() => signatureInputRef.current?.click()}
              className="group cursor-pointer w-full h-24 bg-black border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center transition-all hover:border-yellow-500/50"
             >
                {signatureBase64 ? (
                  <img src={signatureBase64} alt="Assinatura" className="h-16 object-contain" />
                ) : (
                  <>
                    <CloudArrowUpIcon className="w-6 h-6 text-gray-700 group-hover:text-yellow-500" />
                    <span className="text-[9px] text-gray-600 mt-1 uppercase font-black">Carregar PNG/JPG</span>
                  </>
                )}
             </div>
             <input type="file" ref={signatureInputRef} onChange={handleSignatureUpload} className="hidden" accept="image/*" />
          </div>
        </div>
      </div>

      {/* Preview da Proposta */}
      <div className="xl:col-span-8">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[850px]">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-black/40">
             <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Preview Oficial</h2>
                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-0.5">Layout A4 Padronizado</p>
             </div>
             <button 
              onClick={generateIntroWithIA}
              disabled={isGeneratingText}
              className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-500 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              {isGeneratingText ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
              Redigir Corpo via IA
            </button>
          </div>

          <div className="flex-grow p-1 sm:p-6 lg:p-10 bg-gray-950">
             <div className="bg-white text-gray-900 w-full mx-auto max-w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl rounded-sm font-sans flex flex-col space-y-6">
                
                {/* Header Proposta */}
                <div className="flex justify-between border-b border-gray-300 pb-4">
                  <div className="max-w-[400px]">
                      <h1 className="text-sm font-black uppercase text-gray-900 leading-tight">{companyInfo.name}</h1>
                      <p className="text-[8px] text-gray-600 uppercase mt-1 leading-relaxed">{companyInfo.address}</p>
                      <p className="text-[8px] font-black text-gray-900 mt-1 uppercase">
                         CNPJ: {companyInfo.cnpj} | IE: {companyInfo.ie}
                      </p>
                  </div>
                  <div className="text-right flex flex-col justify-end">
                      <p className="text-[8px] text-gray-500 uppercase font-bold">Fone: {companyInfo.phone}</p>
                      <p className="text-[8px] text-gray-500 font-bold">{companyInfo.email}</p>
                  </div>
                </div>

                {/* Referência solicitada: Nome Órgão, UASG, Processo */}
                <div className="text-center py-4 space-y-1">
                   <h2 className="text-xs font-black uppercase text-black">{proposalData.clientName || 'ÓRGÃO COMPRADOR'}</h2>
                   <p className="text-[10px] font-bold text-gray-800 uppercase">UASG: {proposalData.uasg || '---'}</p>
                   <p className="text-[10px] font-black text-gray-900">Proposta Comercial – Processo nº {proposalData.biddingId || '---'}</p>
                </div>

                {/* Texto da IA */}
                <div className="text-[10px] leading-relaxed text-justify px-2 min-h-[80px] whitespace-pre-wrap italic text-gray-700">
                    {proposalData.introText || 'Clique em "Redigir Corpo via IA" para gerar o texto padrão automático...'}
                </div>

                {/* Tabela de Itens */}
                <div className="overflow-x-auto">
                    <table className="w-full text-[9px] border-collapse border border-gray-300">
                        <thead className="bg-gray-100 uppercase font-bold text-gray-600">
                            <tr>
                                <th className="border border-gray-300 p-1.5 text-center w-8">Item</th>
                                <th className="border border-gray-300 p-1.5 text-left">Descrição</th>
                                <th className="border border-gray-300 p-1.5 text-center w-12">Qtd</th>
                                <th className="border border-gray-300 p-1.5 text-center w-16">Unid.</th>
                                <th className="border border-gray-300 p-1.5 text-center w-20">Marca</th>
                                <th className="border border-gray-300 p-1.5 text-right w-24">Unitário</th>
                                <th className="border border-gray-300 p-1.5 text-right w-24">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length > 0 ? items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 p-1.5 text-center">{item.item}</td>
                                    <td className="border border-gray-300 p-1.5 text-[8px] leading-tight">{item.description}</td>
                                    <td className="border border-gray-300 p-1.5 text-center font-bold">{item.quantityBid}</td>
                                    <td className="border border-gray-300 p-1.5 text-center uppercase">UNIDADE</td>
                                    <td className="border border-gray-300 p-1.5 text-center uppercase">Oficina da Arte</td>
                                    <td className="border border-gray-300 p-1.5 text-right font-mono">{item.unitValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="border border-gray-300 p-1.5 text-right font-mono font-bold">{(item.unitValue * item.quantityBid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="border border-gray-300 p-8 text-center text-gray-400 italic">Nenhum item importado. Importe o PDF do edital acima.</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 font-black">
                            <tr>
                                <td colSpan={6} className="border border-gray-300 p-2 text-right uppercase text-[10px]">Valor total da proposta:</td>
                                <td className="border border-gray-300 p-2 text-right text-[10px]">{items.reduce((s, i) => s + (i.unitValue * i.quantityBid), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Condições Rodapé */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6">
                    <div className="space-y-2 text-[9px]">
                        <p><span className="font-black uppercase text-gray-500 mr-1">Prazo de Validade:</span> <span className="font-bold text-gray-900">{proposalData.validity}</span></p>
                        <p><span className="font-black uppercase text-gray-500 mr-1">Prazo de Entrega:</span> <span className="font-bold text-gray-900">{proposalData.delivery}</span></p>
                        <p><span className="font-black uppercase text-gray-500 mr-1">Pagamento:</span> <span className="font-bold text-gray-900">{proposalData.payment}</span></p>
                        <div className="mt-4 p-2 bg-gray-50 border border-gray-200 rounded">
                            <p className="font-black text-[8px] text-gray-500 uppercase mb-1">Dados Bancários</p>
                            <p className="font-bold text-gray-800 leading-relaxed">{proposalData.bankInfo}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-end text-center space-y-4">
                         <div className="border-b border-gray-300 w-full max-w-[200px] min-h-[50px] flex items-end justify-center pb-1">
                            {signatureBase64 && <img src={signatureBase64} alt="Assinatura" className="h-14 object-contain" />}
                         </div>
                         <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase text-gray-900">{companyInfo.owner}</p>
                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">CPF: {companyInfo.cpf} | {companyInfo.role}</p>
                         </div>
                    </div>
                </div>

                <div className="mt-auto pt-10 text-[8px] text-gray-400 font-bold italic border-t border-gray-100 flex justify-between">
                    <span>Proposta emitida eletronicamente via Sistema Gestor Oficina da Arte</span>
                    <span>Taubaté, {new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</span>
                </div>
             </div>
          </div>

          <footer className="p-8 bg-black/60 border-t border-gray-800 flex justify-end">
             <button 
              onClick={handleExport}
              disabled={!proposalData.clientName || items.length === 0}
              className="group flex items-center gap-4 bg-white hover:bg-yellow-500 text-black font-black px-12 py-5 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all active:scale-95 disabled:opacity-20 uppercase tracking-tighter text-lg"
             >
                <DocumentArrowDownIcon className="w-6 h-6 transition-transform group-hover:translate-y-1" />
                Gerar PDF da Proposta
             </button>
          </footer>
        </div>
      </div>
    </div>
  );
};
