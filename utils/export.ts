
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Converte caracteres especiais para seus equivalentes visuais simples.
 * Resolve o erro de caracteres corrompidos (ï¿½) mantendo a legibilidade.
 */
const safeText = (text: string | number | undefined | null): string => {
  if (text === undefined || text === null) return '';
  const str = String(text);
  
  const map: Record<string, string> = {
    'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'é': 'e', 'ê': 'e', 'í': 'i', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ú': 'u', 'ç': 'c',
    'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A', 'É': 'E', 'Ê': 'E', 'Í': 'I', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ú': 'U', 'Ç': 'C',
    'º': '.', 'ª': 'a', '°': '.', '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'"
  };

  return str.replace(/[áàãâéêíóôõúçÁÀÃÂÉÊÍÓÔÕÚÇºª°–—“”‘’]/g, m => map[m] || m)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, "");
};

/**
 * Gera um código de autenticidade único para conferência.
 */
const generateAuthCode = (cnpj: string, value: number): string => {
  const seed = `${cnpj}-${value}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().padEnd(12, 'X').slice(0, 16).replace(/(.{4})/g, '$1.').slice(0, -1);
};

const sanitizeFilename = (name: string): string => {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
    .trim();
};

const forceDownload = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }, 600);
};

export const exportToCSV = (headers: string[], data: any[][], filename: string): void => {
    try {
        const csvContent = [
            headers.map(h => safeText(h)).join(','),
            ...data.map(row => row.map(cell => `"${safeText(cell)}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        forceDownload(blob, `${sanitizeFilename(filename)}.csv`);
    } catch (error) {
        console.error("Erro CSV:", error);
    }
};

export const exportToPDF = (headers: string[], data: any[][], filename: string, title: string): void => {
    try {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFont('helvetica', 'bold');
        doc.text(safeText(title), 14, 20);
        
        autoTable(doc, {
            head: [headers.map(h => safeText(h))],
            body: data.map(row => row.map(cell => safeText(cell))),
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [202, 138, 4], textColor: [255, 255, 255] },
            styles: { font: 'helvetica' }
        });

        const blob = doc.output('blob');
        forceDownload(blob, `${sanitizeFilename(filename)}.pdf`);
    } catch (error) {
        console.error("Erro PDF:", error);
    }
};

export const valorPorExtenso = (valor: number): string => {
  if (valor === 0) return 'Zero Reais';
  const unidades = ['', 'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
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
  return final.charAt(0).toUpperCase() + final.slice(1);
};

export const exportProposalPDF = (data: {
  company: any,
  client: any,
  proposal: any,
  items: any[],
  signature: string | null,
  digitalCert?: any,
  keepAccents?: boolean
}): void => {
  const text = (str: string | number | undefined | null): string => {
    if (data.keepAccents) {
      return String(str ?? '');
    }
    return safeText(str);
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const amareloOficina = [234, 179, 8];
  const pretoOficina = [30, 30, 30];

  doc.setFont('helvetica', 'normal');

  // Cabeçalho
  doc.setFillColor(amareloOficina[0], amareloOficina[1], amareloOficina[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(text(data.company.name), margin, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80);
  const splitAddress = doc.splitTextToSize(text(data.company.address), pageWidth - (margin * 2));
  doc.text(splitAddress, margin, 25);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`CNPJ: ${text(data.company.cnpj)} | IE: ${text(data.company.ie)}`, margin, 35);
  doc.text(`Fone: ${text(data.company.phone)} | Email: ${text(data.company.email)}`, margin, 39);

  doc.setDrawColor(200);
  doc.line(margin, 43, pageWidth - margin, 43);

  // Titulo Proposta
  const clientUpper = text(data.client.name).toUpperCase();
  doc.setFontSize(12);
  doc.text(clientUpper, pageWidth / 2, 55, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`UASG: ${text(data.client.uasg)}`, pageWidth / 2, 61, { align: 'center' });
  
  doc.setFillColor(amareloOficina[0], amareloOficina[1], amareloOficina[2]);
  const processText = `Proposta Comercial - Processo N. ${text(data.client.biddingId)}`;
  const processWidth = doc.getTextWidth(processText) + 10;
  doc.rect((pageWidth - processWidth) / 2, 64, processWidth, 7, 'F');
  doc.setTextColor(255);
  doc.text(processText, pageWidth / 2, 69, { align: 'center' });

  // --- NOVO TEXTO DE APRESENTAÇÃO ---
  let currentY = 82;
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`A ${clientUpper}`, margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  const introText = `A Oficina da Arte, inscrita sob o CNPJ n 27.454.615/0001-44, declara seu pleno interesse em fornecer os materiais referentes ao processo n ${text(data.client.biddingId)}, submetendo-se integralmente as condicoes e exigencias estabelecidas no edital.`;
  const splitIntro = doc.splitTextToSize(introText, pageWidth - (margin * 2));
  doc.text(splitIntro, margin, currentY);
  currentY += (splitIntro.length * 5) + 2;

  const capacityText = `Reiteramos nossa total disponibilidade e capacidade tecnica para atender as demandas desta prestigiada instituicao, garantindo o estrito cumprimento dos prazos e a qualidade dos itens solicitados.`;
  const splitCapacity = doc.splitTextToSize(capacityText, pageWidth - (margin * 2));
  doc.text(splitCapacity, margin, currentY);
  currentY += (splitCapacity.length * 5) + 8;

  // Tabela de Itens
  const tableData = data.items.map(item => [
    text(item.item),
    text(item.description).toUpperCase(),
    '2026',
    'ODA',
    text(item.quantityBid),
    'UNID.',
    item.unitValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    (item.unitValue * item.quantityBid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  ]);

  const total = data.items.reduce((s, i) => s + (i.unitValue * i.quantityBid), 0);

  autoTable(doc, {
    startY: currentY,
    head: [['ITEM', 'DESCRICAO', 'MODELO', 'MARCA', 'QUANT.', 'UNID.', 'VALOR', 'TOTAL']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: pretoOficina, textColor: [255, 255, 255], fontSize: 8 },
    styles: { font: 'helvetica', fontSize: 7, textColor: [0, 0, 0] },
    columnStyles: { 
      1: { cellWidth: 'auto' }, 
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY || currentY + 20;
  
  // Total e Extenso
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  const totalY = finalY + 10;
  const extenso = valorPorExtenso(total);
  doc.text(`Valor total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${text(extenso)})`, margin, totalY);

  // Condições Gerais
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const infoY = totalY + 10;
  doc.text(`Prazo de Entrega: ${text(data.proposal.delivery)}`, margin, infoY);
  doc.text(`Validade da Proposta: ${text(data.proposal.validity)}`, margin, infoY + 4);
  doc.text(`Pagamento: ${text(data.proposal.payment)}`, margin, infoY + 8);
  doc.text(`Dados Bancarios: ${text(data.proposal.bankInfo)}`, margin, infoY + 12);

  // --- SEÇÃO DE ASSINATURA PADRÃO ADOBE (IMAGEM 2) ---
  const signatureStartY = infoY + 30;
  const boxWidth = 90; // Largura do bloco de assinatura estilo Adobe
  const boxHeight = 28;
  const boxX = (pageWidth / 2) - (boxWidth / 2);

  if (data.digitalCert) {
    // 1. Box Externo (Cinza claro discreto)
    doc.setDrawColor(220);
    doc.setLineWidth(0.1);
    doc.rect(boxX, signatureStartY, boxWidth, boxHeight);

    // 2. Marca d'água sutil (Estilo Adobe PDF)
    doc.setTextColor(245, 230, 230); // Vermelho muito pálido
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text("A", boxX + (boxWidth / 2), signatureStartY + 20, { align: 'center' });

    // 3. Lado Esquerdo: Nome em Destaque
    doc.setTextColor(30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Split text to fit left half
    const signerName = text(data.digitalCert.subject);
    const leftText = doc.splitTextToSize(signerName, (boxWidth / 2) - 5);
    doc.text(leftText, boxX + 3, signatureStartY + 8);

    // 4. Linha Divisória Vertical Central
    doc.setDrawColor(235);
    doc.line(boxX + (boxWidth / 2), signatureStartY + 3, boxX + (boxWidth / 2), signatureStartY + boxHeight - 3);

    // 5. Lado Direito: Detalhes Técnicos
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(60);
    
    const rightX = boxX + (boxWidth / 2) + 3;
    let currentRY = signatureStartY + 6;
    
    doc.text("Assinado de forma digital por", rightX, currentRY);
    currentRY += 3;
    
    doc.setFont('helvetica', 'bold');
    const rightName = doc.splitTextToSize(signerName, (boxWidth / 2) - 6);
    doc.text(rightName, rightX, currentRY);
    currentRY += (rightName.length * 3);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Dados: ${new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')} -03'00'`, rightX, currentRY);
    
    // 6. Código de Autenticidade (Discreto na parte inferior)
    const authCode = generateAuthCode(data.digitalCert.cnpj, total);
    doc.setFontSize(5);
    doc.setTextColor(150);
    doc.text(`HASH: ${authCode}`, boxX + 3, signatureStartY + boxHeight - 2);

    // --- DADOS DO PROPRIETÁRIO ABAIXO DA ASSINATURA ---
    const detailY = signatureStartY + boxHeight + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(text(data.company.owner), pageWidth / 2, detailY, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(text(data.company.role), pageWidth / 2, detailY + 5, { align: 'center' });
    doc.text(`CPF: ${text(data.company.cpf)}`, pageWidth / 2, detailY + 9, { align: 'center' });

  } else {
    // Assinatura Manual Padrão
    if (data.signature) {
      doc.addImage(data.signature, 'PNG', (pageWidth / 2) - 25, signatureStartY - 15, 50, 15);
    }
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(pageWidth / 2 - 40, signatureStartY + 5, pageWidth / 2 + 40, signatureStartY + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(text(data.company.owner), pageWidth / 2, signatureStartY + 11, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(text(data.company.role), pageWidth / 2, signatureStartY + 16, { align: 'center' });
    doc.text(`CPF: ${text(data.company.cpf)}`, pageWidth / 2, signatureStartY + 20, { align: 'center' });
  }

  // Nome do Arquivo TIPO_NUMERO_UASG.pdf
  const type = (data.proposal.biddingType || 'PROPOSTA').toUpperCase();
  const num = (data.client.biddingId || 'SN').replace(/\//g, '_');
  const uasg = data.client.uasg || '000000';
  const finalFilename = `${sanitizeFilename(`${type}_${num}_UASG_${uasg}`)}.pdf`;

  const blob = doc.output('blob');
  forceDownload(blob, finalFilename);
};
