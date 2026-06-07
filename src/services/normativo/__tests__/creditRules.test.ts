import { describe, expect, it } from 'vitest';

import { classificarTipoCredito } from '../creditRules';

describe('creditRules', () => {
  it.each([
    ['Pagamento Indevido ou a Maior', 'pagamento_indevido_maior'],
    ['Pagamento Indevido ou a Maior eSocial', 'pagamento_indevido_maior_esocial'],
    ['Contribuicao Previdenciaria Indevida ou a Maior', 'contribuicao_previdenciaria_indevida_maior'],
    ['Saldo Negativo de IRPJ', 'saldo_negativo_irpj'],
    ['Saldo Negativo de CSLL', 'saldo_negativo_csll'],
    ['Credito Oriundo de Acao Judicial', 'credito_judicial'],
  ] as const)('classifica %s como %s', (tipoCredito, tipoCreditoId) => {
    const result = classificarTipoCredito(tipoCredito);

    expect(result.tipoCreditoId).toBe(tipoCreditoId);
    expect(result.fontesNormativas.length).toBeGreaterThan(0);
  });

  it('marca credito judicial como dependente de habilitacao e componentes', () => {
    const result = classificarTipoCredito('Credito Oriundo de Acao Judicial');

    expect(result.dcompAdmitida).toBe('depende');
    expect(result.exigeHabilitacao).toBe(true);
    expect(result.exigeComponentesJudiciais).toBe(true);
  });

  it('marca tipo desconhecido sem aplicar regra por analogia', () => {
    const result = classificarTipoCredito('Tipo inexistente');

    expect(result.tipoCreditoId).toBe('desconhecido');
    expect(result.dcompAdmitida).toBe('depende');
    expect(result.alertas).toEqual(
      expect.arrayContaining([expect.stringContaining('TIPO DESCONHECIDO')]),
    );
  });
});
