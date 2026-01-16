
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const escapeCSV = (field: any): string => {
    const str = String(field ?? '');
    // If the field contains a comma, double quote, or newline, wrap it in double quotes.
    if (/[",\n]/.test(str)) {
        // Also, double up any existing double quotes.
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
        const doc = new jsPDF({
            orientation: 'landscape',
        });
        
        let startY = 30;

        doc.setFontSize(16);
        doc.text(title, 14, 20);

        if (subtitle) {
            doc.setFontSize(9);
            doc.setTextColor(100); // Grey color
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
            headStyles: {
                fillColor: [202, 138, 4], // yellow-600
                textColor: [255, 255, 255]
            },
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
        });

        doc.save(`${filename}.pdf`);
    } catch (error) {
        console.error("Erro ao exportar para PDF:", error);
        alert("Não foi possível exportar o arquivo PDF.");
    }
};
