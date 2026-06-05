import type { CadeiaRelacional } from './models/types';

export const mockCadeias: CadeiaRelacional[] = [
  {
    id: '12345.67890-00',
    dcomps: [
      {
        id: '12345.67890-00',
        dataTransmissaoOriginal: new Date('2024-01-15T00:00:00'),
        dataTransmissao: new Date('2024-01-15T00:00:00'),
        tipoDocumento: 'Decl. Compensação',
        situacao: 'Despacho Decisório Emitido',
        indicadorCredito: 'Original',
        tipoCredito: 'Saldo Negativo de IRPJ',
        detentorCredito: 'Empresa Exemplo LTDA',
        periodoApuracaoCredito: '2023',
        valorTotalCreditoDetalhado: 1500000.00,
        valorTotalCreditoDetalhadoOriginal: 1500000.00,
        valorCreditoDataTransmissao: 1500000.00,
        valorUtilizadoPerdcomp: 450000.00,
        valorUtilizadoPerdcompOriginal: 450000.00,
        idCadeiaRelacional: '12345.67890-00',
        debitos: [
          {
            id: 'deb_mock_1',
            codigoReceita: '5952-07',
            periodoApuracao: 'DEZ/2023',
            dataVencimento: '20/01/2024',
            valorPrincipal: 400000.00,
            valorMulta: 20000.00,
            valorJuros: 30000.00,
            valorTotal: 450000.00,
            valorPrincipalOriginal: 400000.00,
            valorMultaOriginal: 20000.00,
            valorJurosOriginal: 30000.00,
            valorTotalOriginal: 450000.00
          }
        ]
      },
      {
        id: '98765.43210-99',
        dataTransmissaoOriginal: new Date('2024-02-15T00:00:00'),
        dataTransmissao: new Date('2024-02-15T00:00:00'),
        tipoDocumento: 'Decl. Compensação',
        situacao: 'Em análise',
        indicadorCredito: 'Sucedido',
        tipoCredito: 'Saldo Negativo de IRPJ',
        detentorCredito: 'Empresa Exemplo LTDA',
        periodoApuracaoCredito: '2023',
        valorTotalCreditoDetalhado: 1050000.00,
        valorTotalCreditoDetalhadoOriginal: 1050000.00,
        valorCreditoDataTransmissao: 1050000.00,
        valorUtilizadoPerdcomp: 250000.00,
        valorUtilizadoPerdcompOriginal: 250000.00,
        idCadeiaRelacional: '12345.67890-00',
        debitos: [
          {
            id: 'deb_mock_2',
            codigoReceita: '1708-01',
            periodoApuracao: 'JAN/2024',
            dataVencimento: '20/02/2024',
            valorPrincipal: 250000.00,
            valorMulta: 0,
            valorJuros: 0,
            valorTotal: 250000.00,
            valorPrincipalOriginal: 250000.00,
            valorMultaOriginal: 0,
            valorJurosOriginal: 0,
            valorTotalOriginal: 250000.00
          }
        ]
      }
    ],
    tipoCredito: 'Saldo Negativo de IRPJ',
    periodoApuracao: '2023',
    numeroDcompInicial: '12345.67890-00'
  }
];
