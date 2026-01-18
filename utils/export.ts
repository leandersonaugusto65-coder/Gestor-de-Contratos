
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

// FUNÇÃO ESPECIALIZADA PARA PROPOSTA COMERCIAL DA OFICINA DA ARTE - PADRÃO SOLICITADO
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
  
  // 1. CABEÇALHO (Dados da Empresa)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.company.name, margin, 25);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80);
  const splitAddress = doc.splitTextToSize(data.company.address, 110);
  doc.text(splitAddress, margin, 31);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`CNPJ: ${data.company.cnpj} | IE: ${data.company.ie}`, margin, 38);
  doc.text(`Fone: ${data.company.phone} | Email: ${data.company.email}`, margin, 42);

  // Linha Decorativa
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(margin, 48, pageWidth - margin, 48);

  // 2. REFERÊNCIA SOLICITADA (Órgão, UASG e Processo em 3 linhas)
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(data.client.name.toUpperCase(), pageWidth / 2, 60, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(`UASG: ${data.client.uasg}`, pageWidth / 2, 66, { align: 'center' });
  doc.text(`Proposta Comercial – Processo nº ${data.client.biddingId}`, pageWidth / 2, 72, { align: 'center' });

  // 3. CORPO / INTRODUÇÃO
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const introSplit = doc.splitTextToSize(data.proposal.introText || 'Apresentamos nossa proposta comercial para o fornecimento dos materiais abaixo relacionados.', pageWidth - (margin * 2));
  doc.text(introSplit, margin, 85);
  
  let currentY = 85 + (introSplit.length * 5);

  // 4. TABELA DE ITENS
  const tableData = data.items.map(item => [
    item.item,
    item.description,
    item.quantityBid,
    'UNIDADE',
    'Oficina da Arte',
    item.unitValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    (item.unitValue * item.quantityBid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  ]);

  const total = data.items.reduce((s, i) => s + (i.unitValue * i.quantityBid), 0);

  autoTable(doc, {
    startY: currentY + 5,
    head: [['ITEM', 'DESCRIÇÃO', 'QUANT.', 'UNID.', 'MARCA', 'VALOR', 'TOTAL']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontSize: 7, halign: 'center' },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, fontStyle: 'bold', halign: 'right' }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY;
  
  // Valor total em destaque
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Valor total da proposta: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, margin, finalY + 10);

  // 5. CONDIÇÕES COMERCIAIS
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Prazo de validade da proposta: ${data.proposal.validity}`, margin, finalY + 22);
  doc.text(`Prazo de entrega: ${data.proposal.delivery}`, margin, finalY + 27);
  doc.text(`Prazo de pagamento: ${data.proposal.payment}`, margin, finalY + 32);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Dados Bancários: ${data.proposal.bankInfo}`, margin, finalY + 37);

  // 6. ASSINATURA
  const signatureY = finalY + 60;
  if (data.signature) {
    try {
      doc.addImage(data.signature, 'PNG', (pageWidth / 2) - 20, signatureY - 18, 40, 18);
    } catch (e) { console.error("Erro ao carregar imagem da assinatura"); }
  }
  
  doc.setDrawColor(100);
  doc.setLineWidth(0.2);
  doc.line(pageWidth / 2 - 45, signatureY, pageWidth / 2 + 45, signatureY);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(data.company.owner, pageWidth / 2, signatureY + 5, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`CPF: ${data.company.cpf}`, pageWidth / 2, signatureY + 9, { align: 'center' });
  doc.text(data.company.role, pageWidth / 2, signatureY + 13, { align: 'center' });

  // Data e local final
  const today = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  doc.text(`Taubaté, ${today}`, margin, signatureY + 25);

  doc.save(`Proposta_${data.client.biddingId.replace(/\//g, '-')}.pdf`);
};
