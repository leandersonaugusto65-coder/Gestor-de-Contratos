
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Função para converter caracteres problemáticos para mobile em equivalentes seguros
const safeText = (text: string | number | undefined | null): string => {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/[º°]/g, 'N.')
    .replace(/[ª]/g, 'a.')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .normalize('NFC'); // Garante normalização Unicode
};

const escapeCSV = (field: any): string => {
    const str = String(field ?? '');
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

// Função de limpeza agressiva para nomes de arquivos (fundamental para mobile)
const sanitizeFilename = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Troca TUDO que não for letra/número por underscore
    .replace(/__+/g, '_')           // Remove underscores duplicados
    .replace(/^_|_$/g, '');         // Remove underscores no início ou fim
};

// Função auxiliar para forçar download no mobile com extensão correta
const forceDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
};

export const exportToCSV = (headers: string[], data: any[][], filename: string): void => {
    try {
        const csvContent = [
            headers.map(h => safeText(h)).map(escapeCSV).join(','),
            ...data.map(row => row.map(cell => safeText(cell)).map(escapeCSV).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const safeName = `${sanitizeFilename(filename)}.csv`;
        forceDownload(blob, safeName);
    } catch (error) {
        console.error("Erro ao exportar para CSV:", error);
    }
};

export const exportToPDF = (headers: string[], data: any[][], filename: string, title: string, subtitle?: string): void => {
    try {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(16);
        doc.text(safeText(title), 14, 20);
        
        const safeData = data.map(row => row.map(cell => safeText(cell)));
        const safeHeaders = headers.map(h => safeText(h));

        autoTable(doc, {
            head: [safeHeaders],
            body: safeData,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [202, 138, 4], textColor: [255, 255, 255] },
        });

        const blob = doc.output('blob');
        const safeName = `${sanitizeFilename(filename)}.pdf`;
        forceDownload(blob, safeName);
    } catch (error) {
        console.error("Erro ao exportar para PDF:", error);
    }
};

export const valorPorExtenso = (valor: number): string => {
  if (valor === 0) return 'Zero Reais';
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezenaEspecial = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  const converterParte = (num: number): string => {
    if (num === 0) return '';
    if (num === 100) return 'cem';
    let res = '';
    const c = Math.floor(num / 100);
    const d = Math.floor((num % 100) / 10);
    const u = num % 10;
    if (c > 0) res += (c === 1 && (d > 0 || u > 0) ? 'cento' : centenas[c]);
    if (d > 0) {
      if (res !== '') res += ' e ';
      if (d === 1) {
        res += dezenaEspecial[u];
        return res;
      }
      res += dezenas[d];
    }
    if (u > 0) {
      if (res !== '') res += ' e ';
      res += unidades[u];
    }
    return res;
  };

  const partes = [];
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  if (inteiro > 0) {
    const milhoes = Math.floor(inteiro / 1000000);
    const milhares = Math.floor((inteiro % 1000000) / 1000);
    const resto = inteiro % 1000;
    if (milhoes > 0) partes.push(converterParte(milhoes) + (milhoes === 1 ? ' milhao' : ' milhoes'));
    if (milhares > 0) partes.push(converterParte(milhares) + ' mil');
    if (resto > 0) partes.push(converterParte(resto));
    const textoInteiro = partes.join(', ').replace(/, ([^,]*)$/, ' e $1');
    partes.length = 0;
    partes.push(textoInteiro + (inteiro === 1 ? ' real' : ' reais'));
  }
  if (centavos > 0) partes.push(converterParte(centavos) + (centavos === 1 ? ' centavo' : ' centavos'));
  const final = partes.join(' e ');
  return safeText(final.charAt(0).toUpperCase() + final.slice(1));
};

export const exportProposalPDF = (data: {
  company: any,
  client: any,
  proposal: any,
  items: any[],
  signature: string | null,
  digitalCert?: any
}): void => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const amareloOficina = [234, 179, 8];
  const pretoOficina = [30, 30, 30];

  // Configura fonte padrão para garantir máxima compatibilidade
  doc.setFont('helvetica', 'normal');

  // Faixa topo
  doc.setFillColor(amareloOficina[0], amareloOficina[1], amareloOficina[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');
  
  // Cabeçalho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0);
  doc.text(safeText(data.company.name), margin, 25);
  
  doc.setDrawColor(amareloOficina[0], amareloOficina[1], amareloOficina[2]);
  doc.setLineWidth(1.5);
  doc.line(margin - 2, 30, margin - 2, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80);
  const splitAddress = doc.splitTextToSize(safeText(data.company.address), 120);
  doc.text(splitAddress, margin, 32);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`CNPJ: ${safeText(data.company.cnpj)} | IE: ${safeText(data.company.ie)}`, margin, 40);
  doc.text(`Fone: ${safeText(data.company.phone)} | Email: ${safeText(data.company.email)}`, margin, 44);

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(margin, 48, pageWidth - margin, 48);

  // Referência
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(safeText(data.client.name).toUpperCase(), pageWidth / 2, 60, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`UASG: ${safeText(data.client.uasg)}`, pageWidth / 2, 66, { align: 'center' });
  
  doc.setFillColor(amareloOficina[0], amareloOficina[1], amareloOficina[2]);
  const processText = `Proposta Comercial - Processo N. ${safeText(data.client.biddingId)}`;
  const processWidth = doc.getTextWidth(processText) + 10;
  doc.rect((pageWidth - processWidth) / 2, 69, processWidth, 6, 'F');
  doc.setTextColor(255);
  doc.text(processText, pageWidth / 2, 73.5, { align: 'center' });

  // Itens
  const tableData = data.items.map(item => [
    safeText(item.item),
    safeText(item.description).toUpperCase(),
    '2026',
    'ODA',
    safeText(item.quantityBid),
    'UNID.',
    item.unitValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    (item.unitValue * item.quantityBid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  ]);

  const total = data.items.reduce((s, i) => s + (i.unitValue * i.quantityBid), 0);

  autoTable(doc, {
    startY: 90,
    head: [['ITEM', 'DESCRICAO', 'MODELO', 'MARCA', 'QUANT.', 'UNID.', 'VALOR', 'TOTAL']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: pretoOficina, textColor: [255, 255, 255], fontSize: 7.5, halign: 'center' },
    styles: { font: 'helvetica', fontSize: 6.5, cellPadding: 2, textColor: [0, 0, 0], halign: 'center', overflow: 'linebreak' },
    columnStyles: { 
      0: { cellWidth: 10 }, 
      1: { cellWidth: 'auto', halign: 'left' }, 
      4: { cellWidth: 15 },
      5: { cellWidth: 12 },
      6: { cellWidth: 28 },
      7: { cellWidth: 32, fontStyle: 'bold' }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  const totalY = finalY + 12;
  const extenso = valorPorExtenso(total);
  doc.text(safeText(`Valor total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${extenso})`), margin, totalY);

  // SEÇÃO DE ASSINATURA
  const signatureY = totalY + 25; 

  if (data.digitalCert) {
    const boxW = 120;
    const boxX = (pageWidth - boxW) / 2;
    const blockY = signatureY - 10; 
    
    // Símbolo visual simplificado
    doc.setDrawColor(240, 189, 189);
    doc.setLineWidth(0.8);
    doc.line(boxX + boxW/2 - 5, blockY + 5, boxX + boxW/2 + 5, blockY + 15);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0);
    const mainCertText = `${safeText(data.digitalCert.subject)}:${safeText(data.digitalCert.cnpj)}`;
    const splitCert = doc.splitTextToSize(mainCertText, 65);
    doc.text(splitCert, boxX, blockY + 8);

    doc.setDrawColor(230);
    doc.setLineWidth(0.1);
    doc.line(boxX + 68, blockY + 2, boxX + 68, blockY + 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(80);
    const techX = boxX + 71;
    doc.text(`Assinado de forma digital por`, techX, blockY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(safeText(data.digitalCert.subject.split(':')[0]), techX, blockY + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dados: ${new Date().toLocaleString('pt-BR')} -03'00'`, techX, blockY + 11);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(safeText(data.company.owner), pageWidth / 2, signatureY + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`CPF: ${safeText(data.company.cpf)}`, pageWidth / 2, signatureY + 17, { align: 'center' });

  } else {
    if (data.signature) {
      doc.addImage(data.signature, 'PNG', (pageWidth / 2) - 25, signatureY - 22, 50, 20);
    }
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(pageWidth / 2 - 45, signatureY, pageWidth / 2 + 45, signatureY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(safeText(data.company.owner), pageWidth / 2, signatureY + 6, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`CPF: ${safeText(data.company.cpf)}`, pageWidth / 2, signatureY + 11, { align: 'center' });
  }

  // NOME DO ARQUIVO: Tipo_Numero_UASG.pdf
  const biddingType = (data.proposal.biddingType || 'Proposta').toUpperCase();
  const biddingNum = data.client.biddingId || 'SN';
  const uasg = data.client.uasg || '000000';
  
  const rawFilename = `${biddingType}_${biddingNum}_UASG_${uasg}`;
  const finalFilename = `${sanitizeFilename(rawFilename)}.pdf`;

  const blob = doc.output('blob');
  forceDownload(blob, finalFilename);
};
