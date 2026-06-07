import type { FonteNormativa } from './types';

export type StatusProcessamentoInput = {
  status: string;
  tipoDocumento: string;
};

export type StatusProcessamentoClassificado = {
  statusOriginal: string;
  statusNormalizado: string;
  tipoDocumentoOriginal: string;
  tipoDocumentoNormalizado: string;
  vigenciaCascata: 'vigente' | 'nao_vigente' | 'indeterminado';
  editabilidadeSimulacao: 'editavel' | 'bloqueado' | 'indeterminado';
  cancelabilidade: 'cancelavel' | 'nao_cancelavel' | 'indeterminado';
  motivos: string[];
  fontesNormativas: FonteNormativa[];
};

const fonteOrientacoes = {
  arquivo: 'orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.pdf',
  resumo: 'Manual inicial da RFB sobre status, cancelamento e processamento no PER/DCOMP Web.',
};

export function classificarStatusProcessamento(
  input: StatusProcessamentoInput,
): StatusProcessamentoClassificado {
  const statusNormalizado = normalizarTexto(input.status);
  const tipoDocumentoNormalizado = normalizarTexto(input.tipoDocumento);

  if (statusNormalizado.includes('pedido de cancelamento deferido')) {
    return criarResultado(input, statusNormalizado, tipoDocumentoNormalizado, {
      vigenciaCascata: 'nao_vigente',
      editabilidadeSimulacao: 'bloqueado',
      cancelabilidade: 'nao_cancelavel',
      motivos: ['cancelamento_deferido_irreversivel'],
    });
  }

  if (statusNormalizado.includes('nao admitido')) {
    return criarResultado(input, statusNormalizado, tipoDocumentoNormalizado, {
      vigenciaCascata: 'nao_vigente',
      editabilidadeSimulacao: 'bloqueado',
      cancelabilidade: 'nao_cancelavel',
      motivos: ['documento_nao_admitido'],
    });
  }

  if (
    statusNormalizado.includes('homologado') ||
    statusNormalizado.includes('despacho decisorio emitido') ||
    statusNormalizado.includes('analise concluida') ||
    statusNormalizado.includes('em discussao administrativa')
  ) {
    return criarResultado(input, statusNormalizado, tipoDocumentoNormalizado, {
      vigenciaCascata: 'vigente',
      editabilidadeSimulacao: 'bloqueado',
      cancelabilidade: 'nao_cancelavel',
      motivos: ['documento_analisado_ou_em_discussao'],
    });
  }

  if (
    statusNormalizado.includes('cancelado') ||
    statusNormalizado.includes('retificado')
  ) {
    return criarResultado(input, statusNormalizado, tipoDocumentoNormalizado, {
      vigenciaCascata: 'nao_vigente',
      editabilidadeSimulacao: 'bloqueado',
      cancelabilidade: 'nao_cancelavel',
      motivos: ['documento_nao_vigente'],
    });
  }

  return criarResultado(input, statusNormalizado, tipoDocumentoNormalizado, {
    vigenciaCascata: 'indeterminado',
    editabilidadeSimulacao: 'indeterminado',
    cancelabilidade: 'indeterminado',
    motivos: ['status_nao_classificado'],
  });
}

function criarResultado(
  input: StatusProcessamentoInput,
  statusNormalizado: string,
  tipoDocumentoNormalizado: string,
  classificacao: Pick<
    StatusProcessamentoClassificado,
    'vigenciaCascata' | 'editabilidadeSimulacao' | 'cancelabilidade' | 'motivos'
  >,
): StatusProcessamentoClassificado {
  return {
    statusOriginal: input.status,
    statusNormalizado,
    tipoDocumentoOriginal: input.tipoDocumento,
    tipoDocumentoNormalizado,
    fontesNormativas: [fonteOrientacoes],
    ...classificacao,
  };
}

function normalizarTexto(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
