import { classificarStatusProcessamento } from '../services/normativo/statusRules';

export const isPedidoCancelamento = (id?: string, tipoDocumento?: string): boolean => {
  if (tipoDocumento && tipoDocumento.includes('Pedido de Cancelamento')) return true;
  if (id && id.includes('.1.8.02-')) return true;
  return false;
};

export const isNaoVigente = (situacao: string, tipoDocumento?: string, id?: string): boolean => {
  if (isPedidoCancelamento(id, tipoDocumento)) return true;
  
  const classificado = classificarStatusProcessamento({
    status: situacao,
    tipoDocumento: tipoDocumento || 'desconhecido'
  });
  
  return classificado.vigenciaCascata === 'nao_vigente';
};

export const isBloqueado = (situacao: string, tipoDocumento?: string, id?: string): boolean => {
  if (isPedidoCancelamento(id, tipoDocumento)) return true;

  const classificado = classificarStatusProcessamento({
    status: situacao,
    tipoDocumento: tipoDocumento || 'desconhecido'
  });
  
  return classificado.editabilidadeSimulacao === 'bloqueado';
};

export const isVigente = (situacao: string, tipoDocumento?: string, id?: string): boolean => {
  if (isPedidoCancelamento(id, tipoDocumento)) return false;

  const classificado = classificarStatusProcessamento({
    status: situacao,
    tipoDocumento: tipoDocumento || 'desconhecido'
  });
  
  // Se for classificado como 'vigente' ou 'indeterminado', e não for pedido de cancelamento, consideramos vigente.
  return classificado.vigenciaCascata !== 'nao_vigente';
};
