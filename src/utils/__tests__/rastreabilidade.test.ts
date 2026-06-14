import { describe, expect, it } from 'vitest';
import type { CadeiaRelacional, DCOMP, Empresa } from '../../models/types';
import { buildRastreabilidadeResumo } from '../rastreabilidade';

describe('buildRastreabilidadeResumo', () => {
  it('resume titularidade, sucessao e periodos distintos dos debitos da PER/DCOMP selecionada', () => {
    const empresa: Empresa = {
      cnpj: '61486650000183',
      razaoSocial: 'DIAGNOSTICOS DA AMERICA S.A.',
    };
    const dcomp = {
      id: '13941.91673.180923.1.7.24-0207',
      situacao: 'Em análise',
      tipoDocumento: 'Decl. Compensação',
      tipoCredito: 'Pagamento Indevido ou a Maior eSocial',
      detentorCredito: '83933275000105',
      metadadosCreditoImportado: {},
      debitos: [
        {
          id: 'deb-1',
          codigoReceita: '1191-01',
          periodoApuracao: '01/07/2023',
          dataVencimento: '18/08/2023',
          valorPrincipal: 100,
          valorMulta: 0,
          valorJuros: 0,
          valorTotal: 100,
          valorPrincipalOriginal: 100,
          valorMultaOriginal: 0,
          valorJurosOriginal: 0,
          valorTotalOriginal: 100,
          cnpjDebito: '83933275000105',
          cnpjDetentorCredito: '83933275000105',
          cnpjTransmissorDcomp: '61486650000183',
          debitoSucedida: 'SIM',
        },
        {
          id: 'deb-2',
          codigoReceita: '1191-01',
          periodoApuracao: '01/08/2023',
          dataVencimento: '18/08/2023',
          valorPrincipal: 50,
          valorMulta: 0,
          valorJuros: 0,
          valorTotal: 50,
          valorPrincipalOriginal: 50,
          valorMultaOriginal: 0,
          valorJurosOriginal: 0,
          valorTotalOriginal: 50,
          cnpjDebito: '83933275000105',
          cnpjDetentorCredito: '83933275000105',
          cnpjTransmissorDcomp: '61486650000183',
          debitoSucedida: 'SIM',
        },
      ],
    } as DCOMP;
    const cadeia = { id: 'cadeia-1', dcomps: [dcomp] } as CadeiaRelacional;

    const resumo = buildRastreabilidadeResumo(cadeia, dcomp, empresa);

    expect(resumo.possuiCnpjDivergente).toBe(true);
    expect(resumo.possuiDebitoSucedida).toBe(true);
    expect(resumo.cnpjsDetentoresCredito).toEqual(['83933275000105']);
    expect(resumo.cnpjsDetentoresDebito).toEqual(['83933275000105']);
    expect(resumo.periodosApuracaoDebitos).toEqual(['01/07/2023', '01/08/2023']);
    expect(resumo.exibirDarfPagamento).toBe(true);
    expect(resumo.exibirProcessos).toBe(false);
  });

  it('exibe processos apenas para credito oriundo de acao judicial', () => {
    const dcomp = {
      id: '32552.06818.210225.1.3.57-2529',
      situacao: 'Em análise',
      tipoDocumento: 'Decl. Compensação',
      tipoCredito: 'Crédito Oriundo de Ação Judicial',
      detentorCredito: '61486650000183',
      metadadosCreditoImportado: {
        processoJudicial: '5004178-45.2021.4.03.6144',
      },
      debitos: [],
    } as DCOMP;
    const cadeia = { id: 'cadeia-judicial', dcomps: [dcomp] } as CadeiaRelacional;

    const resumo = buildRastreabilidadeResumo(cadeia, dcomp, null);

    expect(resumo.exibirDarfPagamento).toBe(false);
    expect(resumo.exibirProcessos).toBe(true);
  });
});
