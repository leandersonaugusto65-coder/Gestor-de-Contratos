
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const escapeCSV = (field: any): string => {
    const str = String(field ?? '');
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

export const exportToCSV = (headers: string[], data: any[][], filename: string): void => {
    try {
        const csvContent = [
            headers.map(escapeCSV).join(','),
            ...data.map(row => row.map(escapeCSV).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Erro ao exportar para CSV:", error);
        alert("Não foi possível exportar o arquivo CSV.");
    }
};

export const exportToPDF = (headers: string[], data: any[][], filename: string, title: string, subtitle?: string): void => {
    try {
        const doc = new jsPDF({ orientation: 'landscape' });
        let startY = 30;
        doc.setFontSize(16);
        doc.text(title, 14, 20);
        if (subtitle) {
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(subtitle, 14, 26);
            startY = 35;
        }
        doc.setFontSize(8);
        doc.setTextColor(150);
        const dateText = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
        const dateTextWidth = doc.getTextWidth(dateText);
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.text(dateText, pageWidth - 14 - dateTextWidth, 20);
        autoTable(doc, {
            head: [headers],
            body: data,
            startY: startY,
            theme: 'grid',
            headStyles: { fillColor: [202, 138, 4], textColor: [255, 255, 255] },
            styles: { fontSize: 8, cellPadding: 2 },
        });
        doc.save(`${filename}.pdf`);
    } catch (error) {
        console.error("Erro ao exportar para PDF:", error);
    }
};

/**
 * Converte um número para valor monetário por extenso em português.
 */
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

    if (milhoes > 0) {
      partes.push(converterParte(milhoes) + (milhoes === 1 ? ' milhão' : ' milhões'));
    }
    if (milhares > 0) {
      partes.push(converterParte(milhares) + ' mil');
    }
    if (resto > 0) {
      partes.push(converterParte(resto));
    }

    const textoInteiro = partes.join(', ').replace(/, ([^,]*)$/, ' e $1');
    partes.length = 0;
    partes.push(textoInteiro + (inteiro === 1 ? ' real' : ' reais'));
  }

  if (centavos > 0) {
    partes.push(converterParte(centavos) + (centavos === 1 ? ' centavo' : ' centavos'));
  }

  const final = partes.join(' e ');
  return final.charAt(0).toUpperCase() + final.slice(1);
};

export const exportProposalPDF = (data: {
  company: any,
  client: any,
  proposal: any,
  items: any[],
  signature: string | null
}): void => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // CORES PADRÃO
  const amareloOficina = [234, 179, 8]; // #eab308
  const pretoOficina = [30, 30, 30];

  // DETALHE AMARELO: Faixa decorativa no topo
  doc.setFillColor(amareloOficina[0], amareloOficina[1], amareloOficina[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');
  
  // 1. CABEÇALHO (Dados da Empresa)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0);
  doc.text(data.company.name, margin, 25);
  
  // Detalhe: Linha amarela vertical ao lado do endereço
  doc.setDrawColor(amareloOficina[0], amareloOficina[1], amareloOficina[2]);
  doc.setLineWidth(1.5);
  doc.line(margin - 2, 30, margin - 2, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80);
  const splitAddress = doc.splitTextToSize(data.company.address, 120);
  doc.text(splitAddress, margin, 32);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`CNPJ: ${data.company.cnpj} | IE: ${data.company.ie}`, margin, 40);
  doc.text(`Fone: ${data.company.phone} | Email: ${data.company.email}`, margin, 44);

  // Linha Decorativa Inferior do Cabeçalho
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(margin, 48, pageWidth - margin, 48);

  // 2. REFERÊNCIA (Órgão, UASG e Processo)
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(data.client.name.toUpperCase(), pageWidth / 2, 60, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`UASG: ${data.client.uasg}`, pageWidth / 2, 66, { align: 'center' });
  
  // Destaque para o número do processo (Fundo amarelo, texto branco)
  doc.setFillColor(amareloOficina[0], amareloOficina[1], amareloOficina[2]);
  const processText = `Proposta Comercial – Processo nº ${data.client.biddingId}`;
  const processWidth = doc.getTextWidth(processText) + 10;
  doc.rect((pageWidth - processWidth) / 2, 69, processWidth, 6, 'F');
  doc.setTextColor(255);
  doc.text(processText, pageWidth / 2, 73.5, { align: 'center' });

  // 3. INTRODUÇÃO
  doc.setTextColor(30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const introSplit = doc.splitTextToSize(data.proposal.introText, pageWidth - (margin * 2));
  doc.text(introSplit, margin, 85);
  
  let currentY = 85 + (introSplit.length * 5.5);

  // 4. TABELA DE ITENS
  const tableData = data.items.map(item => [
    item.item,
    item.description.toUpperCase(),
    '2026',
    'ODA',
    item.quantityBid,
    'UNID.',
    item.unitValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    (item.unitValue * item.quantityBid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  ]);

  const total = data.items.reduce((s, i) => s + (i.unitValue * i.quantityBid), 0);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['ITEM', 'DESCRIÇÃO', 'MODELO', 'MARCA', 'QUANT.', 'UNID.', 'VALOR', 'TOTAL']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: pretoOficina, 
      textColor: [255, 255, 255], 
      fontSize: 7.5,
      halign: 'center', 
      fontStyle: 'bold',
      minCellHeight: 8
    },
    styles: { 
      fontSize: 6.5, 
      cellPadding: 2, 
      textColor: [0, 0, 0],
      valign: 'middle' 
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 17, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 25, fontStyle: 'bold', halign: 'right' }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY;
  
  // 5. VALOR TOTAL COM EXTENSO (Destaque limpo conforme imagem original)
  const totalFormatted = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalExtenso = valorPorExtenso(total);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(`Valor total da proposta: ${totalFormatted} (${totalExtenso})`, margin, finalY + 12);

  // 6. CONDIÇÕES COMERCIAIS
  doc.setTextColor(80);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Prazo de validade da proposta: ${data.proposal.validity}`, margin, finalY + 25);
  doc.text(`Prazo de entrega: ${data.proposal.delivery}`, margin, finalY + 30);
  doc.text(`Prazo de pagamento: ${data.proposal.payment}`, margin, finalY + 35);
  
  // Detalhe: Caixa com borda amarela para dados bancários
  doc.setDrawColor(amareloOficina[0], amareloOficina[1], amareloOficina[2]);
  doc.setLineWidth(0.5);
  doc.setFillColor(252, 252, 252);
  doc.rect(margin, finalY + 39, 130, 10, 'FD');
  
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Dados Bancários: ${data.proposal.bankInfo}`, margin + 3, finalY + 45.5);

  // 7. ASSINATURA (Linha PRETA agora)
  const signatureY = finalY + 75;
  if (data.signature) {
    try {
      doc.addImage(data.signature, 'PNG', (pageWidth / 2) - 25, signatureY - 22, 50, 20);
    } catch (e) { console.error("Erro ao carregar imagem da assinatura"); }
  }
  
  doc.setDrawColor(0); // LINHA PRETA
  doc.setLineWidth(0.3);
  doc.line(pageWidth / 2 - 45, signatureY, pageWidth / 2 + 45, signatureY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(data.company.owner, pageWidth / 2, signatureY + 6, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`CPF: ${data.company.cpf}`, pageWidth / 2, signatureY + 11, { align: 'center' });
  doc.text(data.company.role, pageWidth / 2, signatureY + 15, { align: 'center' });

  // Data e local final
  const today = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  doc.setFontSize(8.5);
  doc.setTextColor(120);
  doc.text(`Taubaté, ${today}`, margin, signatureY + 28);
  
  // Detalhe Amarelo Final: Barra no rodapé
  doc.setFillColor(amareloOficina[0], amareloOficina[1], amareloOficina[2]);
  doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');

  doc.save(`Proposta_${data.client.biddingId.replace(/\//g, '-')}.pdf`);
};
