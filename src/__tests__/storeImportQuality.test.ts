import { describe, expect, it } from 'vitest';

import { useStore } from '../store';
import type { CadeiaRelacional, Empresa, ImportQualityReport } from '../models/types';

describe('store import quality report', () => {
  it('preserva ImportQualityReport no estado sem recalcular quando dados ja vieram recalculados', () => {
    const report: ImportQualityReport = {
      linhasProcessamento: 2,
      linhasDebitos: 1,
      dcompsCarregadas: 1,
      cadeiasCarregadas: 1,
      debitosCarregados: 1,
      documentosIgnorados: [
        {
          numeroPerdcomp: '22222.22222.010124.1.3.01-2222',
          motivo: 'sem_cadeia_relacional',
          tipoCredito: 'Pagamento Indevido ou a Maior eSocial',
          situacao: 'Em análise',
        },
      ],
    };

    useStore.getState().limparDados();
    useStore.getState().importarDados([criarCadeiaMinima()], criarEmpresa(), true, report);

    expect(useStore.getState().importQualityReport).toEqual(report);
  });
});

function criarEmpresa(): Empresa {
  return {
    cnpj: '00.000.000/0001-00',
    razaoSocial: 'Empresa Teste',
  };
}

function criarCadeiaMinima(): CadeiaRelacional {
  return {
    id: 'CADEIA-1',
    numeroDcompInicial: '11111.11111.010124.1.3.01-1111',
    tipoCredito: 'Pagamento Indevido ou a Maior',
    periodoApuracao: '01/2024',
    dcomps: [
      {
        id: '11111.11111.010124.1.3.01-1111',
        dataTransmissaoOriginal: new Date('2024-02-10T00:00:00Z'),
        dataTransmissao: new Date('2024-02-10T00:00:00Z'),
        tipoDocumento: 'Decl. Compensação',
        situacao: 'Homologado',
        indicadorCredito: '1',
        tipoCredito: 'Pagamento Indevido ou a Maior',
        detentorCredito: 'Empresa Teste',
        periodoApuracaoCredito: '01/2024',
        valorTotalCreditoDetalhado: 100,
        valorTotalCreditoDetalhadoOriginal: 100,
        valorCreditoDataTransmissao: 100,
        valorUtilizadoPerdcomp: 50,
        valorUtilizadoPerdcompOriginal: 50,
        idCadeiaRelacional: 'CADEIA-1',
        debitos: [],
      },
    ],
  };
}
