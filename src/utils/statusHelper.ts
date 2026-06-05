const naoVigentes = [
  'Pedido de Cancelamento Deferido',
  'Retificado',
  'Cancelado',
  'Não Admitido'
];

const bloqueados = [
  'Análise Concluída',
  'Análise concluída',
  'Cancelado',
  'Despacho Decisório Emitido',
  'Em discussão administrativa - CARF',
  'Em discussão administrativa – CARF',
  'Em discussão administrativa - CSRF',
  'Em discussão administrativa – CSRF',
  'Em discussão administrativa - DRJ',
  'Em discussão administrativa – DRJ',
  'Homologado',
  'Não Admitido',
  'Pedido de Cancelamento Deferido',
  'PER Deferido'
];

export const isPedidoCancelamento = (id?: string, tipoDocumento?: string): boolean => {
  if (tipoDocumento && tipoDocumento.includes('Pedido de Cancelamento')) return true;
  if (id && id.includes('.1.8.02-')) return true;
  return false;
};

export const isNaoVigente = (situacao: string, tipoDocumento?: string, id?: string): boolean => {
  if (isPedidoCancelamento(id, tipoDocumento)) return true;
  return naoVigentes.includes(situacao);
};

export const isBloqueado = (situacao: string, tipoDocumento?: string, id?: string): boolean => {
  if (isPedidoCancelamento(id, tipoDocumento)) return true;
  return bloqueados.includes(situacao);
};

export const isVigente = (situacao: string, tipoDocumento?: string, id?: string): boolean => {
  // Fallback: se não estiver explicitamente na lista de "Não Vigentes", consideramos "Vigente".
  if (isNaoVigente(situacao, tipoDocumento, id)) {
    return false;
  }
  return true;
};
