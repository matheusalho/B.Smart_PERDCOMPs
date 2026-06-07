import { describe, expect, it } from 'vitest';

import { calcularSelicComTaxaInjetada } from '../selicMath';

describe('selicMath', () => {
  it('calcula credito atualizado e credito original utilizado com taxa injetada', () => {
    const result = calcularSelicComTaxaInjetada({
      valorCreditoOriginalNaDataEntrega: 10000,
      totalDebitosDocumento: 11500,
      taxaSelicDecimal: 0.15,
      fonteTabelaSelic: 'fixture',
    });

    expect(result.statusCalculo).toBe('normativo');
    expect(result.origemValor).toBe('calculado_motor');
    expect(result.valor?.valorCreditoAtualizado).toBe(11500);
    expect(result.valor?.creditoOriginalUtilizadoCalculado).toBe(10000);
    expect(result.valor?.saldoCreditoOriginalCalculado).toBe(0);
    expect(result.dadosAusentes).toEqual([]);
  });

  it('retorna dados insuficientes quando a taxa nao esta disponivel', () => {
    const result = calcularSelicComTaxaInjetada({
      valorCreditoOriginalNaDataEntrega: 10000,
      totalDebitosDocumento: 11500,
    });

    expect(result.statusCalculo).toBe('dados_insuficientes');
    expect(result.valor).toBeUndefined();
    expect(result.dadosAusentes).toContain('taxaSelicDecimal');
  });
});
