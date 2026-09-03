import type { CadeiaRelacional, DCOMP, DebitoOficial } from '../../../models/types';

export function criarDebito(overrides: Partial<DebitoOficial> = {}): DebitoOficial {
  const principal = overrides.valorPrincipalOriginal ?? 1000;
  const multa = overrides.valorMultaOriginal ?? 200;
  const juros = overrides.valorJurosOriginal ?? 100;

  return {
    id: 'deb_1',
    codigoReceita: '5952-07',
    periodoApuracao: '01/09/2024',
    dataVencimento: '20/10/2024',
    valorPrincipal: principal,
    valorMulta: multa,
    valorJuros: juros,
    valorTotal: principal + multa + juros,
    valorPrincipalOriginal: principal,
    valorMultaOriginal: multa,
    valorJurosOriginal: juros,
    valorTotalOriginal: principal + multa + juros,
    cnpjDebito: '12345678000199',
    cnpjTransmissorDcomp: '12345678000199',
    nomeEmpresarial: 'Empresa Teste Ltda.',
    numeroReciboPerDcomp: 'REC-0001',
    categoriaDctf: 'GERAL',
    ...overrides,
  };
}

export function criarDcomp(overrides: Partial<DCOMP> = {}): DCOMP {
  return {
    id: '00001.00001.010124.1.3.24-0001',
    dataTransmissaoOriginal: new Date(2024, 0, 1),
    dataTransmissao: new Date(2024, 0, 1),
    tipoDocumento: 'Declaração de Compensação',
    situacao: 'Pendente',
    indicadorCredito: '1',
    tipoCredito: 'Pagamento Indevido ou a Maior eSocial',
    detentorCredito: 'Empresa Teste Ltda.',
    periodoApuracaoCredito: '01/09/2024',
    valorTotalCreditoDetalhado: 10000,
    valorTotalCreditoDetalhadoOriginal: 10000,
    valorCreditoDataTransmissao: 10000,
    valorUtilizadoPerdcomp: 1300,
    valorUtilizadoPerdcompOriginal: 1300,
    idCadeiaRelacional: 'CADEIA-1',
    debitos: [criarDebito()],
    statusCascata: 'OK',
    saldoCreditoOriginalCalculado: 8700,
    saldoCreditoOriginalAnterior: 8700,
    ...overrides,
  };
}

export function criarCadeia(overrides: Partial<CadeiaRelacional> = {}): CadeiaRelacional {
  const dcomps = overrides.dcomps ?? [criarDcomp()];
  return {
    id: 'CADEIA-1',
    numeroDcompInicial: dcomps[0]?.id ?? '',
    tipoCredito: 'Pagamento Indevido ou a Maior eSocial',
    periodoApuracao: '01/09/2024',
    ...overrides,
    dcomps,
  };
}

/**
 * Cadeia com os seis cenários exigidos pelo spec:
 * DCOMP com 2 débitos · PER sem débitos · retificada não vigente ·
 * retificadora consumidora a retificar · pedido de cancelamento · DCOMP hipotética.
 */
export function criarCadeiaCompleta(): CadeiaRelacional {
  const doisDebitos = criarDcomp({
    id: '00001.00001.010124.1.3.24-0001',
    debitos: [
      criarDebito({ id: 'deb_1', codigoReceita: '5952-07' }),
      criarDebito({
        id: 'deb_2',
        codigoReceita: '1138-01',
        valorPrincipalOriginal: 500,
        valorMultaOriginal: 0,
        valorJurosOriginal: 0,
      }),
    ],
  });

  const perSemDebitos = criarDcomp({
    id: '00002.00002.020124.1.1.01-0002',
    tipoDocumento: 'Pedido de Restituição',
    debitos: [],
    valorUtilizadoPerdcomp: 0,
    valorUtilizadoPerdcompOriginal: 0,
    dataTransmissao: new Date(2024, 1, 2),
    dataTransmissaoOriginal: new Date(2024, 1, 2),
  });

  const retificadaNaoVigente = criarDcomp({
    id: '00003.00003.030124.1.3.24-0003',
    situacao: 'Retificado',
    numeroRetificador: '00004.00004.040124.1.7.24-0004',
    dataTransmissao: new Date(2024, 2, 3),
    dataTransmissaoOriginal: new Date(2024, 2, 3),
  });

  const retificadora = criarDcomp({
    id: '00004.00004.040124.1.7.24-0004',
    indicadorCredito: '2',
    numeroDcompDetalhamento: '00001.00001.010124.1.3.24-0001',
    statusCascata: 'RETIFICAR',
    divergenciaDetalhes: { esperado: 9000, calculado: 8700 },
    dataTransmissao: new Date(2024, 3, 4),
    dataTransmissaoOriginal: new Date(2024, 2, 3),
  });

  const pedidoCancelamento = criarDcomp({
    id: '00005.00005.050124.1.8.02-0005',
    tipoDocumento: 'Pedido de Cancelamento',
    debitos: [],
    dataTransmissao: new Date(2024, 4, 5),
    dataTransmissaoOriginal: new Date(2024, 4, 5),
  });

  const hipotetica = criarDcomp({
    id: 'HIPOTETICA-1',
    indicadorCredito: 'Hipotético',
    isManuallyEdited: true,
    dataTransmissao: new Date(2024, 5, 6),
    dataTransmissaoOriginal: new Date(2024, 5, 6),
  });

  return criarCadeia({
    dcomps: [
      doisDebitos,
      perSemDebitos,
      retificadaNaoVigente,
      retificadora,
      pedidoCancelamento,
      hipotetica,
    ],
  });
}
