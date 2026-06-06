const brlCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export const formatCurrency = (value: number): string => brlCurrencyFormatter.format(value);

export const formatCurrencyMagnitude = (value: number): string => brlCurrencyFormatter.format(Math.abs(value));
