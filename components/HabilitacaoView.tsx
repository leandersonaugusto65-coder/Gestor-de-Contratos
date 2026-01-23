
import React, { useState, useRef, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import JSZip from 'jszip';
import { PrinterIcon } from './icons/PrinterIcon';
import { ArrowDownTrayIcon } from './icons/ArrowDownTrayIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import type { Certidao, HabilitacaoData } from '../types';

// --- TIPOS ---
type CertidaoStatus = 'Válida' | 'A Vencer' | 'Vence Hoje' | 'Vencida' | 'Não Emitida';

type CertidaoStatusInfo = {
  text: CertidaoStatus;
  color: string;
};

// --- DADOS MOCKADOS (COMO NO CADESP) ---
const cadespData = {
  ie: '688.658.049.116',
  cnpj: '27.454.615/0001-44',
  nomeEmpresarial: '27.454.615 DONIMARA RIBEIRO DO CARMO',
  situacao: 'Ativo',
  dataInscricao: '19/04/2022',
  regimeEstadual: 'SN-MEI',
  regimeRFB: 'SN-MEI',
  empresa: {
    naturezaJuridica: 'Empresário (Individual)',
    inicioAtividade: '19/04/2022',
    porte: 'Microempresa',
    capitalSocial: 'R$ 50.000,00',
    inicioRegime: '19/04/2022',
  },
  estabelecimento: {
    nomeFantasia: 'OFICINA DA ARTE - BRINDES E PERSONALIZADOS',
    nire: '35.8.6369287-6',
    situacaoCadastral: 'Ativo',
    ocorrenciaFiscal: 'Ativa',
    tipoUnidade: 'Unidade produtiva',
    formasAtuacao: ['Em Local Fixo Fora de Loja', 'Estabelecimento Fixo', 'Internet', 'Porta a Porta, Postos Móveis ou por Ambulantes'],
  },
  tributario: {
    substituto: 'Não',
    cpr: '1200',
    cnaePrincipal: { codigo: '23.99-1/01', descricao: 'Decoração, lapidação, gravação, vitrificação e outros trabalhos em cerâmica, louça, vidro e cristal' },
    cnaeSecundarios: [
        { codigo: '16.29-3/02', descricao: 'Fabricação de artefatos diversos de cortiça, bambu, palha, vime e outros materiais trançados, exceto móveis' },
        { codigo: '17.49-4/00', descricao: 'Fabricação de produtos de pastas celulósicas, papel, cartolina, papel-cartão e papelão ondulado não especificados anteriormente' },
        { codigo: '18.13-0/99', descricao: 'Impressão de material para outros usos' },
        { codigo: '18.22-9/01', descricao: 'Serviços de encadernação e plastificação' },
        { codigo: '22.29-3/99', descricao: 'Fabricação de artefatos de material plástico para outros usos não especificados anteriormente' },
        { codigo: '23.49-4/99', descricao: 'Fabricação de produtos cerâmicos não-refratários não especificados anteriormente' },
        { codigo: '32.12-4/00', descricao: 'Fabricação de bijuterias e artefatos semelhantes' },
        { codigo: '32.99-0/03', descricao: 'Fabricação de letras, letreiros e placas de qualquer material, exceto luminosos' },
        { codigo: '43.29-1/01', descricao: 'Instalação de painéis publicitários' },
        { codigo: '47.89-0/01', descricao: 'Comércio varejista de suvenires, bijuterias e artesanatos' },
        { codigo: '82.19-9/99', descricao: 'Preparação de documentos e serviços especializados de apoio administrativo não especificados anteriormente' },
    ],
    drt: 'DRT-03 - VALE DO PARAÍBA',
    postoFiscal: 'PF-10 - TAUBATÉ',
  }
};

// --- COMPONENTES AUXILIARES ---
const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`relative px-6 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 border-2 ${ isActive ? 'bg-yellow-600/10 border-yellow-500 text-white' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}`}>
        {label}
    </button>
);

const DataField: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className }) => (
    <div className={`bg-black/20 p-4 rounded-2xl border border-gray-800/60 ${className}`}>
        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1 tracking-wider">{label}</p>
        <div className="text-gray-200 font-medium text-sm">{value}</div>
    </div>
);

const StatusBadge: React.FC<{ status: CertidaoStatusInfo }> = ({ status }) => (
    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border-2 ${status.color}`}>
        {status.text}
    </span>
);


// --- LÓGICA DE STATUS ---
const getCertidaoStatus = (expiryDate: string | null): CertidaoStatusInfo => {
    if (!expiryDate) return { text: 'Não Emitida', color: 'border-gray-700 bg-gray-800 text-gray-500' };
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(`${expiryDate}T00:00:00`);
    vencimento.setHours(0,0,0,0);

    const diffTime = vencimento.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: 'Vencida', color: 'border-red-500/50 bg-red-500/10 text-red-400' };
    }
    if (diffDays === 0) {
        return { text: 'Vence Hoje', color: 'border-orange-500/50 bg-orange-500/10 text-orange-400' };
    }
    if (diffDays > 0 && diffDays <= 5) {
        return { text: 'A Vencer', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' };
    }
    return { text: 'Válida', color: 'border-green-500/50 bg-green-500/10 text-green-400' };
};

const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Não identificada';
    return new Intl.DateTimeFormat('pt-BR').format(new Date(`${dateString}T00:00:00`));
}

// --- ABA DE CERTIDÃO (GENÉRICA) ---
interface CertidaoTabProps {
  title: string;
  certidao: Certidao;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  onAutoUpdate: () => void;
  isProcessingAI: boolean;
  isUpdating: boolean;
  children?: React.ReactNode;
}

const CertidaoTab: React.FC<CertidaoTabProps> = ({ title, certidao, onFileUpload, onRemoveFile, onAutoUpdate, isProcessingAI, isUpdating, children }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const status = getCertidaoStatus(certidao.expiryDate);
    const needsUpdate = status.text === 'Vencida' || status.text === 'A Vencer' || status.text === 'Vence Hoje';

    const handleDownload = () => {
        if (!certidao.fileData || !certidao.fileName) return;
        const link = document.createElement('a');
        link.href = certidao.fileData;
        link.download = certidao.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    return (
        <div className="animate-fade-in space-y-8">
            <div className="bg-gray-900 rounded-3xl border border-gray-800 shadow-xl p-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                        <StatusBadge status={status} />
                    </div>
                    <div className="flex items-center gap-2">
                        {isProcessingAI ? (
                            <div className="flex items-center gap-2 text-sm text-yellow-500 font-bold">
                                <SpinnerIcon className="w-5 h-5 animate-spin" />
                                <span>Analisando PDF...</span>
                            </div>
                        ) : (
                            <>
                                {needsUpdate && (
                                    <button onClick={onAutoUpdate} disabled={isUpdating} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-black font-bold py-2 px-4 rounded-lg transition-all text-sm">
                                        {isUpdating ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : <ArrowPathIcon className="w-4 h-4" />}
                                        {isUpdating ? 'Buscando...' : 'Atualizar via IA'}
                                    </button>
                                )}

                                {!certidao.fileData ? (
                                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm">
                                        <ArrowUpTrayIcon className="w-4 h-4" /> Anexar PDF
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={handleDownload} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm">
                                            <ArrowDownTrayIcon className="w-4 h-4" /> Baixar
                                        </button>
                                        <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors" title="Substituir PDF">
                                            <ArrowUpTrayIcon className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                         <input type="file" ref={fileInputRef} onChange={onFileUpload} accept="application/pdf" className="hidden" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DataField label="Data de Emissão" value={<p className="font-mono">{formatDate(certidao.issueDate)}</p>} />
                    <DataField label="Data de Vencimento" value={<p className="font-mono">{formatDate(certidao.expiryDate)}</p>} />
                </div>

                {certidao.fileName && (
                    <div className="mt-4 bg-black/20 p-3 rounded-lg border border-gray-800/60 flex justify-between items-center text-sm">
                        <p className="text-gray-300 font-medium truncate">Arquivo: <span className="font-mono text-cyan-400">{certidao.fileName}</span></p>
                        <button onClick={onRemoveFile} className="p-1 text-gray-500 hover:text-red-400" title="Remover anexo"><XMarkIcon className="w-4 h-4"/></button>
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
interface HabilitacaoViewProps {
    data: HabilitacaoData | null;
    onUpdate: (data: HabilitacaoData) => void;
}

export const HabilitacaoView: React.FC<HabilitacaoViewProps> = ({ data, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('estadual');
    const [isProcessingAI, setIsProcessingAI] = useState<string | null>(null);
    const [isSearchingLink, setIsSearchingLink] = useState<string | null>(null);
    const [isZipping, setIsZipping] = useState(false);

    const certidoes = useMemo(() => {
        const defaultData: HabilitacaoData = {
            estadual: { issueDate: null, expiryDate: null, fileData: null, fileName: null },
            federal: { issueDate: null, expiryDate: null, fileData: null, fileName: null },
            municipal: { issueDate: null, expiryDate: null, fileData: null, fileName: null },
            distrital: { issueDate: null, expiryDate: null, fileData: null, fileName: null },
            fgts: { issueDate: null, expiryDate: null, fileData: null, fileName: null },
            trabalhista: { issueDate: null, expiryDate: null, fileData: null, fileName: null },
        };
        return { ...defaultData, ...(data || {}) };
    }, [data]);
    
    const handleUpdateCertidao = (tab: string, updates: Partial<Certidao>) => {
        onUpdate({
            ...certidoes,
            [tab]: { ...certidoes[tab], ...updates }
        });
    };
    
    const tabConfig: Record<string, { label: string }> = {
        estadual: { label: "Inscrição Estadual" },
        federal: { label: "Certidão Federal" },
        municipal: { label: "Certidão Municipal" },
        distrital: { label: "Estadual (Dívida Ativa)" },
        fgts: { label: "FGTS" },
        trabalhista: { label: "Trabalhista" },
        consolidacao: { label: "Consolidação" },
    };

    const handleAutoUpdate = async (tabKey: string) => {
        setIsSearchingLink(tabKey);
        try {
            const cnpj = cadespData.cnpj.replace(/\D/g, '');
            const certidaoUrls: Record<string, string> = {
                distrital: `https://www.dividaativa.pge.sp.gov.br/sc/pages/crda/emitirCrda.jsf?cpf_cnpj=${cnpj}`
            };
    
            if (certidaoUrls[tabKey]) {
                window.open(certidaoUrls[tabKey], '_blank');
                setIsSearchingLink(null);
                return;
            }

            const certidaoNomes: Record<string, string> = {
              federal: 'Certidão de Débitos Relativos a Créditos Tributários Federais e à Dívida Ativa da União',
              municipal: 'Certidão Negativa de Débitos Mobiliários da Prefeitura de Taubaté',
              fgts: 'Certificado de Regularidade do FGTS - CRF',
              trabalhista: 'Certidão Negativa de Débitos Trabalhistas (CNDT)',
            };
            
            if (!certidaoNomes[tabKey]) {
                alert('Atualização automática não disponível para esta certidão.');
                setIsSearchingLink(null);
                return;
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Encontre o link oficial e direto do governo para emitir a "${certidaoNomes[tabKey]}" para o CNPJ 27.454.615/0001-44. Retorne apenas a URL.`,
                config: { 
                    tools: [{googleSearch: {}}],
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: { url: { type: Type.STRING } },
                        required: ['url']
                    }
                }
            });

            const result = JSON.parse(response.text || '{}');
            if (result.url) {
                window.open(result.url, '_blank');
            } else {
                alert('Não foi possível encontrar o link de emissão. Tente manualmente.');
            }
        } catch (error) {
            console.error("Auto-update search failed:", error);
            alert('Ocorreu um erro ao buscar o link. Verifique o console para mais detalhes.');
        } finally {
            setIsSearchingLink(null);
        }
    };

    const extractDatesWithAI = async (base64Data: string): Promise<{ issueDate: string | null, expiryDate: string | null }> => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    {
                        parts: [
                            { inlineData: { mimeType: 'application/pdf', data: base64Data } },
                            { text: `Analise este documento de certidão. Extraia a data de emissão e a data de validade/vencimento. Retorne um objeto JSON com as chaves "issueDate" e "expiryDate" no formato "YYYY-MM-DD". Se uma data não for encontrada, retorne null para a chave correspondente.` }
                        ]
                    }
                ],
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            issueDate: { type: Type.STRING, nullable: true },
                            expiryDate: { type: Type.STRING, nullable: true }
                        }
                    }
                }
            });

            const result = JSON.parse(response.text || '{}');
            return {
                issueDate: result.issueDate || null,
                expiryDate: result.expiryDate || null,
            };
        } catch (error) {
            console.error("AI date extraction failed:", error);
            return { issueDate: null, expiryDate: null };
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tab: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessingAI(tab);
        try {
            const reader = new FileReader();
            const fileDataPromise = new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
            const fileData = await fileDataPromise;
            const base64Data = fileData.split(',')[1];
            
            const dates = await extractDatesWithAI(base64Data);
            
            handleUpdateCertidao(tab, {
                fileData: fileData,
                fileName: file.name,
                ...dates
            });
        } catch (error) {
            console.error("File processing error:", error);
        } finally {
            setIsProcessingAI(null);
        }

        e.target.value = ''; // Reset input
    };
    
    const handleDownloadAll = async () => {
        setIsZipping(true);
        const zip = new JSZip();

        const filesToZip = Object.entries(certidoes).filter(([key, certValue]) => {
            const cert = certValue as Certidao;
            if (key === 'estadual' || key === 'consolidacao') return false;
            return cert.fileData && cert.fileName;
        });

        if (filesToZip.length === 0) {
            alert('Nenhum documento anexado para consolidar.');
            setIsZipping(false);
            return;
        }

        filesToZip.forEach(([key, certValue]) => {
            const cert = certValue as Certidao;
            if (cert.fileData && cert.fileName) {
                const base64Data = cert.fileData.split(',')[1];
                const extension = cert.fileName.split('.').pop()?.toLowerCase() || 'pdf';
                
                // Normaliza o nome da certidão: remove acentos, substitui caracteres especiais por _ e limpa duplicatas
                const sanitizedLabel = tabConfig[key].label
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                    .replace(/[^a-zA-Z0-9]/g, '_')   // Remove caracteres especiais
                    .replace(/__+/g, '_')          // Remove underscores repetidos
                    .replace(/^_|_$/g, '');         // Remove underscores no início ou fim
                
                const newFileName = `${sanitizedLabel}.${extension}`;
                zip.file(newFileName, base64Data, { base64: true });
            }
        });

        try {
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            const today = new Date().toISOString().slice(0, 10);
            link.download = `Habilitacao_Oficina_da_Arte_${today}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error("Failed to generate zip file:", error);
            alert('Ocorreu um erro ao gerar o arquivo .zip.');
        } finally {
            setIsZipping(false);
        }
    };
    
    const documentsForConsolidation = Object.entries(certidoes).filter(([key, certValue]) => {
        const cert = certValue as Certidao;
        if (key === 'estadual' || key === 'consolidacao') return false;
        return !!cert.fileName;
    });

    return (
        <div className="space-y-8">
            <nav className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide border-b border-gray-800">
                {Object.entries(tabConfig).map(([key, { label }]) => (
                    <TabButton key={key} label={label} isActive={activeTab === key} onClick={() => setActiveTab(key)} />
                ))}
            </nav>

            <div className="mt-6">
                {activeTab === 'consolidacao' ? (
                     <div className="animate-fade-in bg-gray-900 rounded-3xl border border-gray-800 shadow-xl p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <ArchiveBoxIcon className="w-8 h-8 text-yellow-500" />
                            <h3 className="text-xl font-bold text-white">Consolidar Documentos de Habilitação</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-6 max-w-2xl">
                            Esta ferramenta agrupa todos os documentos de habilitação que você anexou nas outras abas em um único arquivo .zip, facilitando o download e o envio para licitações.
                        </p>
            
                        <div className="bg-black/20 p-6 rounded-2xl border border-gray-800/60 mb-8">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wider">Documentos Encontrados</h4>
                            <ul className="space-y-2 text-sm">
                                {documentsForConsolidation.length > 0 ? (
                                    documentsForConsolidation.map(([key]) => (
                                        <li key={key} className="flex items-center gap-3">
                                            <DocumentTextIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                            <span className="truncate font-medium text-gray-200">{tabConfig[key].label}</span>
                                        </li>
                                    ))
                                ) : (
                                    <p className="text-gray-500 italic">Nenhum documento anexado nas abas de habilitação.</p>
                                )}
                            </ul>
                        </div>
                        
                        <div className="text-center">
                            <button 
                                onClick={handleDownloadAll} 
                                disabled={isZipping || documentsForConsolidation.length === 0}
                                className="flex items-center justify-center gap-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-2xl transition-all duration-300 shadow-[0_4px_15px_rgba(234,179,8,0.3)] hover:shadow-[0_6px_25px_rgba(234,179,8,0.4)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto mx-auto"
                            >
                                {isZipping ? (
                                    <>
                                        <SpinnerIcon className="w-5 h-5 animate-spin"/>
                                        <span>Gerando Arquivo...</span>
                                    </>
                                ) : (
                                    <>
                                        <ArrowDownTrayIcon className="w-5 h-5" />
                                        <span>Baixar Todos (.zip)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : (
                    <CertidaoTab 
                        title={tabConfig[activeTab].label}
                        certidao={certidoes[activeTab]}
                        isProcessingAI={isProcessingAI === activeTab}
                        isUpdating={isSearchingLink === activeTab}
                        onFileUpload={(e) => handleFileUpload(e, activeTab)}
                        onRemoveFile={() => handleUpdateCertidao(activeTab, { fileData: null, fileName: null, issueDate: null, expiryDate: null })}
                        onAutoUpdate={() => handleAutoUpdate(activeTab)}
                    >
                        {activeTab === 'estadual' ? (
                            <div className="bg-gray-900 rounded-3xl border border-gray-800 shadow-xl p-8 animate-fade-in">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Consulta Cadastral - CADESP</h3>
                                        <p className="text-sm text-gray-400">Secretaria da Fazenda do Estado de São Paulo</p>
                                    </div>
                                    <button onClick={() => window.print()} className="flex items-center gap-2 text-sm font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg border border-gray-700 transition-colors">
                                        <PrinterIcon className="w-4 h-4" />
                                        Imprimir
                                    </button>
                                </div>
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <DataField label="IE" value={<p className="font-mono">{cadespData.ie}</p>} />
                                    <DataField label="CNPJ" value={<p className="font-mono">{cadespData.cnpj}</p>} />
                                    <DataField label="Situação" value={<span className="font-bold text-green-400">{cadespData.situacao}</span>} />
                                    <DataField label="Data da Inscrição" value={cadespData.dataInscricao} />
                                </div>
                                <DataField label="Nome Empresarial" value={cadespData.nomeEmpresarial} className="mt-4" />
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-800 text-gray-500">
                                <SparklesIcon className="w-8 h-8 mx-auto text-gray-700 mb-4" />
                                <p className="text-sm mt-2 max-w-md text-center mx-auto">
                                    Anexe o PDF da certidão acima. A validade será lida automaticamente pela IA.
                                </p>
                            </div>
                        )}
                    </CertidaoTab>
                )}
            </div>
        </div>
    );
};
