
export const stripCNPJ = (cnpj: string): string => {
  return cnpj.replace(/\D/g, '');
};

export const formatCNPJ = (cnpj: string): string => {
  const digits = stripCNPJ(cnpj).slice(0, 14);
  let formatted = digits;
  if (digits.length > 2) formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length > 5) formatted = `${formatted.slice(0, 6)}.${digits.slice(5)}`;
  if (digits.length > 8) formatted = `${formatted.slice(0, 10)}/${digits.slice(8)}`;
  if (digits.length > 12) formatted = `${formatted.slice(0, 15)}-${digits.slice(12)}`;
  return formatted;
};

export const validateCNPJ = (cnpj: string): boolean => {
  const val = stripCNPJ(cnpj);
  if (!val || val.length !== 14) return false;

  // Elimina CNPJs com todos os dígitos iguais
  if (/^(\d)\1+$/.test(val)) return false;

  // Validação dos dígitos verificadores (DVs)
  const calculateDV = (base: string, weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += parseInt(base[i]) * weights[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const dv1 = calculateDV(val.slice(0, 12), weights1);
  const dv2 = calculateDV(val.slice(0, 13), weights2);

  return dv1 === parseInt(val[12]) && dv2 === parseInt(val[13]);
};
