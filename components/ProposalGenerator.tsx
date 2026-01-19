
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Client, ContractItem } from '../types';
import { GoogleGenAI, Type } from '@google/genai';
import forge from 'node-forge';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { exportProposalPDF } from '../utils/export';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { BookmarkSquareIcon } from './icons/BookmarkSquareIcon';

interface ProposalGeneratorProps {
  clients: Client[];
  storedCert: string | null;
  onSaveCert: (base64: string | null) => void;
}

interface DigitalCertInfo {
  subject: string;
  cnpj: string;
  expiry: string;
  issuer: string;
}

export const ProposalGenerator: React.FC<ProposalGeneratorProps> = ({ clients, storedCert, onSaveCert }) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [keepAccents, setKeepAccents] = useState(false);
  
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [certInfo, setCertInfo] = useState<DigitalCertInfo | null>(null);
  const [isProcessingCert, setIsProcessingCert] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [proposalData, setProposalData] = useState({
    clientName: '',
    uasg: '',
    biddingId: '',
    biddingType: 'pregão',
    delivery: '30 (trinta) dias corridos',
    validity: '60 (sessenta) dias',
    payment: 'Conforme Edital / 30 dias após aceite e nota fiscal',
    bankInfo: 'Banco: CORA SDC - 403 | Agencia: 0001 | Conta: 5445321-4',
  });

  const [items, setItems] = useState<Omit<ContractItem, 'id'>[]>([]);

  const companyInfo = {
    name: '27.454.615 DONIMARA RIBEIRO DO CARMO',
    cnpj: '27.454.615/0001-44',
    ie: '688.658.049.116',
    phone: '(12) 98155-7822',
    email: 'oficinacomprasnet@gmail.com',
    address: 'Av. Professora Elba Maria Ramos Pereira, 157 - Jardim Hipica Pinheiro - Taubate - SP - CEP: 12092-821',
    owner: 'DONIMARA RIBEIRO DO CARMO',
    cpf: '013.135.292-06',
    role: 'PROPRIETARIA'
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
        contents: {
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64Data } },
            { text: "Extraia do edital: clientName, uasg, biddingId (numero/ano), biddingType (pregao ou dispensa), delivery (prazo entrega) e a lista de itens (item, description, unitValue, quantityBid)." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clientName: { type: Type.STRING },
              uasg: { type: Type.STRING },
              biddingId: { type: Type.STRING },
              biddingType: { type: Type.STRING },
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
        clientName: data.clientName?.toUpperCase() || prev.clientName,
        uasg: data.uasg || prev.uasg,
        biddingId: data.biddingId || prev.biddingId,
        biddingType: data.biddingType || prev.biddingType,
        delivery: data.delivery || prev.delivery,
      }));
      setItems(data.items || []);
      setSelectedIndices(new Set((data.items || []).map((_: any, i: number) => i)));
    } catch (e) {
      console.error(e);
      alert('Erro ao processar o edital.');
    } finally {
      setIsExtracting(false);
    }
  };

  const processCertificate = async () => {
    setIsProcessingCert(true);
    try {
      let pfxArrayBuffer: ArrayBuffer;
      if (storedCert && !certFile) {
        const binaryStr = atob(storedCert);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);
        pfxArrayBuffer = bytes.buffer;
      } else if (certFile) {
        pfxArrayBuffer = await certFile.arrayBuffer();
      } else return;

      const p12Der = forge.util.createBuffer(new Uint8Array(pfxArrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, certPassword);
      const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const cert = bags[forge.pki.oids.certBag]![0].cert!;
      const subjectAttr = cert.subject.attributes.map((a: any) => `${a.shortName}=${a.value}`).join(', ');
      const cnpjMatch = subjectAttr.match(/\d{14}/);
      
      setCertInfo({
        subject: cert.subject.getField('CN')?.value || 'Nao identificado',
        cnpj: cnpjMatch ? cnpjMatch[0] : 'Nao identificado',
        expiry: cert.validity.notAfter.toLocaleDateString('pt-BR'),
        issuer: cert.issuer.getField('CN')?.value || 'Desconhecido'
      });

      if (certFile) {
          const reader = new FileReader();
          reader.onload = () => onSaveCert((reader.result as string).split(',')[1]);
          reader.readAsDataURL(certFile);
      }
    } catch (err) {
      alert("Senha incorreta ou erro no certificado.");
    } finally {
      setIsProcessingCert(false);
    }
  };

  const handleUpdateItem = (index: number, field: keyof Omit<ContractItem, 'id'>, val: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = val;
    setItems(newItems);
  };

  const selectedItemsList = useMemo(() => items.filter((_, idx) => selectedIndices.has(idx)), [items, selectedIndices]);
  const totalValue = useMemo(() => selectedItemsList.reduce((s, i) => s + (i.unitValue * i.quantityBid), 0), [selectedItemsList]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="bg-gray-900 border border-gray-700 rounded-[2.5rem] p-6 sm:p-10 shadow-2xl space-y-12">
        
        {/* HEADER E IMPORTAÇÃO */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
                <div className="w-2.5 h-10 bg-yellow-500 rounded-full" />
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">Gerador de Proposta</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Extração via IA & Edição Manual</p>
                </div>
            </div>
            <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting}
                className="w-full md:w-auto flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 text-white font-black py-4 px-10 rounded-2xl transition-all shadow-xl active:scale-95"
            >
                {isExtracting ? <SpinnerIcon className="w-5 h-5 animate-spin text-yellow-500" /> : <DocumentTextIcon className="w-5 h-5 text-yellow-500" />}
                <span>{isExtracting ? 'PROCESSANDO EDITAL...' : 'IMPORTAR EDITAL PDF'}</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="application/pdf" />
        </section>

        {/* DADOS DO CLIENTE E LICITAÇÃO */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-12">
                <label className="text-[11px] font-black text-yellow-600 uppercase mb-3 block tracking-[0.2em]">Órgão Comprador</label>
                <input type="text" value={proposalData.clientName} onChange={e => setProposalData({...proposalData, clientName: e.target.value})} className="w-full bg-black/40 border border-gray-800 rounded-2xl px-6 py-4 text-white text-lg font-bold focus:border-yellow-500 outline-none transition-all" placeholder="RAZÃO SOCIAL DO ÓRGÃO" />
            </div>
            <div className="md:col-span-4">
                <label className="text-[11px] font-black text-gray-500 uppercase mb-3 block tracking-[0.2em]">Código UASG</label>
                <input type="text" value={proposalData.uasg} onChange={e => setProposalData({...proposalData, uasg: e.target.value})} className="w-full bg-black/40 border border-gray-800 rounded-2xl px-6 py-4 text-white text-base font-mono focus:border-yellow-500 outline-none transition-all" placeholder="000000" />
            </div>
            <div className="md:col-span-4">
                <label className="text-[11px] font-black text-gray-500 uppercase mb-3 block tracking-[0.2em]">Processo / Licitação</label>
                <input type="text" value={proposalData.biddingId} onChange={e => setProposalData({...proposalData, biddingId: e.target.value})} className="w-full bg-black/40 border border-gray-800 rounded-2xl px-6 py-4 text-white text-base font-bold focus:border-yellow-500 outline-none transition-all" placeholder="90001/2024" />
            </div>
            <div className="md:col-span-4">
                <label className="text-[11px] font-black text-gray-500 uppercase mb-3 block tracking-[0.2em]">Modalidade</label>
                <select value={proposalData.biddingType} onChange={e => setProposalData({...proposalData, biddingType: e.target.value})} className="w-full bg-black/40 border border-gray-800 rounded-2xl px-6 py-4 text-white text-base font-bold focus:border-yellow-500 outline-none transition-all appearance-none">
                    <option value="pregão">PREGÃO ELETRÔNICO</option>
                    <option value="dispensa">DISPENSA DE LICITAÇÃO</option>
                </select>
            </div>
        </section>

        {/* CONDIÇÕES GERAIS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-800/50">
            <div>
                <label className="text-[11px] font-black text-gray-500 uppercase mb-3 block tracking-[0.2em]">Prazo de Entrega</label>
                <input type="text" value={proposalData.delivery} onChange={e => setProposalData({...proposalData, delivery: e.target.value})} className="w-full bg-black/40 border border-gray-800 rounded-2xl px-6 py-4 text-white text-sm focus:border-yellow-500 outline-none transition-all" />
            </div>
            <div>
                <label className="text-[11px] font-black text-gray-500 uppercase mb-3 block tracking-[0.2em]">Validade da Proposta</label>
                <input type="text" value={proposalData.validity} onChange={e => setProposalData({...proposalData, validity: e.target.value})} className="w-full bg-black/40 border border-gray-800 rounded-2xl px-6 py-4 text-white text-sm focus:border-yellow-500 outline-none transition-all" />
            </div>
            <div className="md:col-span-2">
                <label className="text-[11px] font-black text-gray-500 uppercase mb-3 block tracking-[0.2em]">Condições de Pagamento</label>
                <input type="text" value={proposalData.payment} onChange={e => setProposalData({...proposalData, payment: e.target.value})} className="w-full bg-black/40 border border-gray-800 rounded-2xl px-6 py-4 text-white text-sm focus:border-yellow-500 outline-none transition-all" />
            </div>
            <div className="md:col-span-2">
                <label className="text-[11px] font-black text-gray-500 uppercase mb-3 block tracking-[0.2em]">Dados Bancários</label>
                <input type="text" value={proposalData.bankInfo} onChange={e => setProposalData({...proposalData, bankInfo: e.target.value})} className="w-full bg-black/40 border border-gray-800 rounded-2xl px-6 py-4 text-white text-sm focus:border-yellow-500 outline-none transition-all" />
            </div>
        </section>

        {/* TABELA DE ITENS EDITÁVEL */}
        <section className="space-y-6 pt-6 border-t border-gray-800/50">
            <h3 className="text-[11px] font-black text-yellow-600 uppercase tracking-[0.2em]">Itens Selecionados</h3>
            <div className="overflow-hidden rounded-3xl border border-gray-800 bg-black/20">
                <table className="w-full text-left">
                    <thead className="bg-black text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800">
                        <tr>
                            <th className="px-6 py-5 w-16 text-center">SEL.</th>
                            <th className="px-6 py-5 w-20 text-center">ITEM</th>
                            <th className="px-6 py-5">DESCRIÇÃO (EDITÁVEL)</th>
                            <th className="px-6 py-5 w-28 text-center">QTD.</th>
                            <th className="px-6 py-5 w-44 text-right">VALOR UNIT.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {items.length > 0 ? items.map((item, idx) => (
                            <tr key={idx} className={`group hover:bg-yellow-500/5 transition-colors ${!selectedIndices.has(idx) ? 'opacity-30' : ''}`}>
                                <td className="px-6 py-4 text-center">
                                    <input type="checkbox" checked={selectedIndices.has(idx)} onChange={() => {
                                        const next = new Set(selectedIndices);
                                        if(next.has(idx)) next.delete(idx); else next.add(idx);
                                        setSelectedIndices(next);
                                    }} className="w-6 h-6 rounded-lg border-gray-700 bg-gray-900 text-yellow-500 focus:ring-0 cursor-pointer" />
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-gray-400">#{item.item}</td>
                                <td className="px-6 py-4">
                                    <textarea value={item.description} onChange={e => handleUpdateItem(idx, 'description', e.target.value)} className="w-full bg-transparent text-sm text-gray-200 focus:text-white focus:outline-none resize-none py-1" rows={2} />
                                </td>
                                <td className="px-6 py-4">
                                    <input type="number" value={item.quantityBid} onChange={e => handleUpdateItem(idx, 'quantityBid', Number(e.target.value))} className="w-full bg-transparent text-center font-black text-white focus:outline-none" />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-gray-600 text-xs font-bold">R$</span>
                                        <input type="number" step="0.01" value={item.unitValue} onChange={e => handleUpdateItem(idx, 'unitValue', parseFloat(e.target.value) || 0)} className="bg-transparent text-right font-mono font-bold text-yellow-500 focus:outline-none w-28" />
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-600 italic font-medium">Nenhum item importado. Use o botão acima para carregar o PDF.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {totalValue > 0 && (
                <div className="flex justify-end pt-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-8 py-4 text-right">
                        <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1">Total da Proposta</p>
                        <p className="text-3xl font-black text-yellow-500 font-mono tracking-tighter">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </div>
            )}
        </section>

        {/* ASSINATURA E CONCLUSÃO */}
        <section className="pt-10 border-t border-gray-800/50 flex flex-col lg:flex-row gap-12">
            <div className="w-full lg:w-1/2 space-y-6">
                <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">Autenticação Digital</h3>
                {!certInfo ? (
                    <div className="bg-black/40 border border-gray-800 rounded-3xl p-8 space-y-5">
                        {storedCert && <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-green-500" /><p className="text-[10px] text-green-500 font-black uppercase">Certificado em Nuvem OK</p></div>}
                        <input type="password" value={certPassword} onChange={e => setCertPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-6 py-4 text-white focus:border-yellow-500 outline-none" placeholder="SENHA DO E-CNPJ" />
                        <button onClick={processCertificate} disabled={isProcessingCert} className="w-full bg-white text-black font-black py-4 rounded-2xl uppercase text-xs tracking-widest hover:bg-gray-200 transition-all active:scale-95">
                            {isProcessingCert ? 'AUTENTICANDO...' : 'CARREGAR ASSINATURA DIGITAL'}
                        </button>
                    </div>
                ) : (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-8 flex items-center gap-6">
                        <div className="p-4 bg-emerald-500/10 rounded-2xl">
                          <BookmarkSquareIcon className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <h4 className="text-emerald-500 font-black text-xs uppercase tracking-widest">CERTIFICADO ATIVO</h4>
                            <p className="text-white font-black truncate">{certInfo.subject}</p>
                            <p className="text-gray-500 text-[10px] mt-1">CNPJ: {certInfo.cnpj} | Vencimento: {certInfo.expiry}</p>
                            <button onClick={() => setCertInfo(null)} className="mt-3 text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-400">Trocar Certificado</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full lg:w-1/2 flex flex-col justify-center">
                 <div className="flex items-center justify-center gap-3 mb-4">
                    <input 
                        type="checkbox" 
                        id="keepAccents" 
                        checked={keepAccents} 
                        onChange={(e) => setKeepAccents(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-yellow-600 focus:ring-yellow-500 cursor-pointer"
                    />
                    <label htmlFor="keepAccents" className="text-sm text-gray-400 cursor-pointer">
                        Manter acentuação <span className="text-gray-500 italic">(pode causar erros no PDF)</span>
                    </label>
                </div>
                <button 
                    onClick={() => exportProposalPDF({
                        company: companyInfo,
                        client: { name: proposalData.clientName, uasg: proposalData.uasg, biddingId: proposalData.biddingId },
                        proposal: proposalData,
                        items: selectedItemsList,
                        signature: null,
                        digitalCert: certInfo,
                        keepAccents: keepAccents
                    })}
                    disabled={!proposalData.clientName || selectedItemsList.length === 0}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-20 text-black font-black py-10 rounded-[2.5rem] shadow-[0_15px_40px_rgba(234,179,8,0.25)] transition-all active:scale-[0.98] flex flex-col items-center gap-4"
                >
                    <DocumentArrowDownIcon className="w-12 h-12" />
                    <div className="text-center">
                      <span className="block text-2xl uppercase tracking-tighter">Gerar PDF Oficial</span>
                      <span className="text-[10px] opacity-60 uppercase font-bold tracking-widest mt-1 block">Pronto para envio imediato</span>
                    </div>
                </button>
            </div>
        </section>
      </div>
    </div>
  );
};
