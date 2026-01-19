
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Client, ContractItem } from '../types';
import { GoogleGenAI, Type } from '@google/genai';
import forge from 'node-forge';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { CloudArrowUpIcon } from './icons/CloudArrowUpIcon';
import { exportProposalPDF, valorPorExtenso } from '../utils/export';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PencilIcon } from './icons/PencilIcon';
import { BookmarkSquareIcon } from './icons/BookmarkSquareIcon';
import { TrashIcon } from './icons/TrashIcon';

interface ProposalGeneratorProps {
  clients: Client[];
}

interface DigitalCertInfo {
  subject: string;
  cnpj: string;
  expiry: string;
  issuer: string;
}

export const ProposalGenerator: React.FC<ProposalGeneratorProps> = ({ clients }) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  // Estados para Certificado Digital
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [certInfo, setCertInfo] = useState<DigitalCertInfo | null>(null);
  const [isProcessingCert, setIsProcessingCert] = useState(false);
  const [signatureType, setSignatureType] = useState<'manual' | 'digital'>('manual');
  const [saveCertPermanently, setSaveCertPermanently] = useState(false);
  const [hasStoredCert, setHasStoredCert] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [proposalData, setProposalData] = useState({
    clientName: '',
    uasg: '',
    biddingId: '',
    delivery: '30 dias',
    validity: '90 (noventa) dias',
    payment: 'Conforme Edital / 30 dias após aceite',
    bankInfo: 'Banco: CORA SDC - 403 | Agência: 0001 | Conta Corrente: 5445321-4',
  });

  const [items, setItems] = useState<Omit<ContractItem, 'id'>[]>([]);

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

  // Carregar certificado salvo do LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('oda_stored_cert_pfx');
    if (saved) {
      setHasStoredCert(true);
      setSignatureType('digital');
    }
  }, []);

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
            { text: "Analise este edital e extraia: clientName (Nome do órgão), uasg, biddingId (Número da licitação), delivery (prazo de entrega) e a lista de itens com 'item' (número), 'description' (descrição completa), 'unitValue' (valor unitário se houver, senão 0) e 'quantityBid' (quantidade)." }
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
        clientName: data.clientName?.toUpperCase() || '',
        uasg: data.uasg || '',
        biddingId: data.biddingId || '',
        delivery: data.delivery || '30 dias',
      }));
      setItems(data.items || []);
      setSelectedIndices(new Set((data.items || []).map((_: any, i: number) => i)));
    } catch (e) {
      console.error(e);
      alert('Erro ao processar o PDF do edital.');
    } finally {
      setIsExtracting(false);
    }
  };

  const processCertificate = async () => {
    setIsProcessingCert(true);
    try {
      let pfxData: ArrayBuffer;

      // Se tiver certificado salvo, usa ele. Senão usa o arquivo do input.
      if (hasStoredCert) {
        const base64 = localStorage.getItem('oda_stored_cert_pfx');
        if (!base64) throw new Error("Erro ao carregar certificado salvo.");
        const binaryStr = atob(base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryStr.charCodeAt(i);
        pfxData = bytes.buffer;
      } else {
        if (!certFile) throw new Error("Selecione um arquivo de certificado.");
        const reader = new FileReader();
        pfxData = await new Promise<ArrayBuffer>((resolve) => {
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.readAsArrayBuffer(certFile);
        });
      }

      const p12Der = forge.util.createBuffer(new Uint8Array(pfxData).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, certPassword);
      
      const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const cert = bags[forge.pki.oids.certBag]![0].cert!;
      const subject = cert.subject.attributes.map((a: any) => `${a.shortName}=${a.value}`).join(', ');
      const cnpjMatch = subject.match(/\d{14}/);
      
      const info = {
        subject: cert.subject.getField('CN')?.value || 'Não identificado',
        cnpj: cnpjMatch ? cnpjMatch[0] : 'Não identificado',
        expiry: cert.validity.notAfter.toLocaleDateString('pt-BR'),
        issuer: cert.issuer.getField('CN')?.value || 'Desconhecido'
      };

      setCertInfo(info);

      // Se o usuário marcou para salvar permanentemente e não é o que já estava salvo
      if (saveCertPermanently && !hasStoredCert && certFile) {
          const base64 = await fileToBase64String(certFile);
          localStorage.setItem('oda_stored_cert_pfx', base64);
          setHasStoredCert(true);
      }

    } catch (err) {
      alert("Senha incorreta ou erro ao processar certificado.");
      setCertInfo(null);
    } finally {
      setIsProcessingCert(false);
    }
  };

  const fileToBase64String = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
  };

  const removeStoredCert = () => {
    if (confirm("Deseja remover o certificado salvo deste dispositivo?")) {
      localStorage.removeItem('oda_stored_cert_pfx');
      setHasStoredCert(false);
      setCertFile(null);
      setCertInfo(null);
      setCertPassword('');
    }
  };

  const toggleItemSelection = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  const handleUpdateItemValue = (index: number, val: number) => {
    const newItems = [...items];
    newItems[index].unitValue = val;
    setItems(newItems);
  };

  const selectedItemsList = useMemo(() => items.filter((_, idx) => selectedIndices.has(idx)), [items, selectedIndices]);
  const totalValue = useMemo(() => selectedItemsList.reduce((s, i) => s + (i.unitValue * i.quantityBid), 0), [selectedItemsList]);

  const handleExport = () => {
    if (!proposalData.clientName) {
        alert("Preencha o nome do órgão comprador.");
        return;
    }
    if (selectedItemsList.length === 0) {
        alert("Selecione ao menos um item.");
        return;
    }
    if (signatureType === 'digital' && !certInfo) {
        alert("Autentique seu e-CNPJ primeiro com sua senha.");
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
        introText: `À ${proposalData.clientName}\n\nA Oficina da Arte declara seu interesse em fornecer os materiais para o processo nº ${proposalData.biddingId}, submetendo-se integralmente às exigências do edital.`
      },
      items: selectedItemsList.map((it, idx) => ({ ...it, id: idx })),
      signature: signatureType === 'manual' ? signatureBase64 : null,
      digitalCert: signatureType === 'digital' ? certInfo : null
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-8 shadow-2xl space-y-10">
        
        {/* Seção 1: Dados do Órgão */}
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
                    <input type="text" value={proposalData.clientName} onChange={e => setProposalData({...proposalData, clientName: e.target.value})} className="w-full bg-black border border-gray-800 rounded-2xl px-5 py-3 text-white text-sm focus:border-yellow-500 outline-none transition-all font-bold" placeholder="NOME DO ÓRGÃO" />
                </div>
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block ml-1 tracking-widest">UASG</label>
                    <input type="text" value={proposalData.uasg} onChange={e => setProposalData({...proposalData, uasg: e.target.value})} className="w-full bg-black border border-gray-800 rounded-2xl px-5 py-3 text-white text-sm font-mono focus:border-yellow-500 outline-none transition-all" placeholder="123456" />
                </div>
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block ml-1 tracking-widest">Processo</label>
                    <input type="text" value={proposalData.biddingId} onChange={e => setProposalData({...proposalData, biddingId: e.target.value})} className="w-full bg-black border border-gray-800 rounded-2xl px-5 py-3 text-white text-sm font-mono focus:border-yellow-500 outline-none transition-all" placeholder="90001/2024" />
                </div>
            </div>
        </section>

        {/* Seção 2: Itens com Seleção */}
        <section className="space-y-4 pt-6 border-t border-gray-800/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-yellow-500 rounded-full" />
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Itens da Proposta</h3>
                </div>
                {items.length > 0 && (
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{selectedIndices.size} de {items.length} selecionados</span>
                )}
            </div>

            <div className="overflow-x-auto rounded-3xl border border-gray-800 bg-black/40">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-black border-b border-gray-800">
                        <tr>
                            <th className="px-6 py-4 w-12 text-center">Incluir</th>
                            <th className="px-6 py-4 w-12 text-center">Item</th>
                            <th className="px-6 py-4">Descrição</th>
                            <th className="px-6 py-4 w-24 text-center">Qtd</th>
                            <th className="px-6 py-4 w-40 text-right">Valor Unitário</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {items.length > 0 ? items.map((item, idx) => (
                            <tr key={idx} className={`hover:bg-yellow-500/5 transition-colors ${!selectedIndices.has(idx) ? 'opacity-30 grayscale' : ''}`}>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => toggleItemSelection(idx)}
                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all mx-auto ${selectedIndices.has(idx) ? 'bg-yellow-500 border-yellow-500' : 'border-gray-700'}`}
                                    >
                                        {selectedIndices.has(idx) && <CheckIcon className="w-4 h-4 text-black" />}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-gray-400">{item.item}</td>
                                <td className="px-6 py-4 text-xs font-bold text-gray-200">{item.description}</td>
                                <td className="px-6 py-4 text-center font-black text-white">{item.quantityBid}</td>
                                <td className="px-6 py-4">
                                    <input 
                                        type="number" 
                                        value={item.unitValue}
                                        onChange={(e) => handleUpdateItemValue(idx, parseFloat(e.target.value) || 0)}
                                        className="w-full bg-transparent text-right font-mono font-bold text-yellow-500 focus:outline-none"
                                    />
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">Carregue um edital para ver os itens aqui.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {totalValue > 0 && (
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl text-right">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Valor Total Selecionado:</p>
                    <p className="text-2xl font-black text-yellow-500 font-mono">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            )}
        </section>

        {/* Seção 3: Assinatura */}
        <section className="pt-6 border-t border-gray-800/50">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-yellow-500 rounded-full" />
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Método de Assinatura</h3>
                </div>
                <div className="flex bg-black p-1 rounded-2xl border border-gray-800">
                    <button 
                        onClick={() => setSignatureType('manual')}
                        className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${signatureType === 'manual' ? 'bg-yellow-500 text-black' : 'text-gray-500'}`}
                    >
                        Manual / Imagem
                    </button>
                    <button 
                        onClick={() => setSignatureType('digital')}
                        className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${signatureType === 'digital' ? 'bg-yellow-500 text-black' : 'text-gray-500'}`}
                    >
                        Digital (e-CNPJ A1)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {signatureType === 'manual' ? (
                    <div 
                        onClick={() => signatureInputRef.current?.click()}
                        className="group cursor-pointer w-full h-48 bg-black border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center transition-all hover:border-yellow-500/50 hover:bg-yellow-500/5"
                    >
                        {signatureBase64 ? (
                            <img src={signatureBase64} alt="Assinatura" className="h-32 object-contain" />
                        ) : (
                            <>
                                <CloudArrowUpIcon className="w-10 h-10 text-gray-700 group-hover:text-yellow-500 transition-colors" />
                                <span className="text-[10px] text-gray-500 mt-3 uppercase font-black tracking-widest">Carregar Assinatura Digitalizada</span>
                            </>
                        )}
                        <input type="file" ref={signatureInputRef} onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => setSignatureBase64(ev.target?.result as string);
                                reader.readAsDataURL(file);
                            }
                        }} className="hidden" accept="image/*" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {!certInfo ? (
                            <div className="bg-black border border-gray-800 rounded-3xl p-6 space-y-4">
                                {hasStoredCert ? (
                                    <div className="flex justify-between items-center bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20">
                                        <div className="flex items-center gap-2">
                                            <BookmarkSquareIcon className="w-4 h-4 text-yellow-500" />
                                            <span className="text-[10px] font-black text-yellow-500 uppercase">Certificado Salvo Detectado</span>
                                        </div>
                                        <button onClick={removeStoredCert} className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Remover certificado">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Certificado (.pfx / .p12)</label>
                                            <input type="file" onChange={e => setCertFile(e.target.files?.[0] || null)} className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-gray-800 file:text-white" accept=".pfx,.p12" />
                                        </div>
                                        <div className="flex items-center gap-2 px-1">
                                            <input type="checkbox" id="save-cert" checked={saveCertPermanently} onChange={e => setSaveCertPermanently(e.target.checked)} className="rounded border-gray-800 bg-black text-yellow-500" />
                                            <label htmlFor="save-cert" className="text-[10px] font-bold text-gray-400 uppercase cursor-pointer">Salvar neste computador</label>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block">Senha do Certificado</label>
                                    <input type="password" value={certPassword} onChange={e => setCertPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm" placeholder="••••••••" />
                                </div>
                                <button onClick={processCertificate} disabled={(!certFile && !hasStoredCert) || !certPassword || isProcessingCert} className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-30 text-black font-black py-3 rounded-xl uppercase text-xs tracking-widest shadow-lg" >
                                    {isProcessingCert ? 'Autenticando...' : 'Autenticar e Assinar'}
                                </button>
                            </div>
                        ) : (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex items-start gap-4">
                                <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500"><BookmarkSquareIcon className="w-6 h-6" /></div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-emerald-500 font-black text-xs uppercase tracking-widest mb-1">e-CNPJ Ativo</h4>
                                    <p className="text-white font-bold text-sm truncate">{certInfo.subject}</p>
                                    <p className="text-gray-500 text-[10px] mt-1">CNPJ: {certInfo.cnpj} | Vencimento: {certInfo.expiry}</p>
                                    <button onClick={() => {setCertInfo(null); setCertFile(null); setCertPassword('');}} className="mt-4 text-[9px] font-black text-red-500 uppercase hover:underline">Trocar Certificado</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex flex-col justify-end">
                    <button 
                        onClick={handleExport}
                        disabled={!proposalData.clientName || items.length === 0}
                        className="w-full flex items-center justify-center gap-4 bg-yellow-500 hover:bg-yellow-600 text-black font-black py-5 rounded-3xl shadow-[0_0_40px_rgba(234,179,8,0.2)] transition-all active:scale-95 disabled:opacity-20 uppercase tracking-widest text-lg"
                    >
                        <DocumentArrowDownIcon className="w-7 h-7" />
                        Gerar Proposta Oficial
                    </button>
                </div>
            </div>
        </section>

      </div>
      <footer className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-widest pb-10">
          Proposta Gerada Eletronicamente • Oficina da Arte • {new Date().getFullYear()}
      </footer>
    </div>
  );
};
