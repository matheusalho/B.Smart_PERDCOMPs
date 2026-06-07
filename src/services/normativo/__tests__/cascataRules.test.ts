import { describe, expect, it } from 'vitest';

import { obterCascataRule } from '../cascataRules';

describe('cascataRules', () => {
  it('usa pool de detalhadores vigentes para eSocial e contribuicao previdenciaria indevida', () => {
    expect(obterCascataRule('pagamento_indevido_maior_esocial').estrategiaSaldoInicial).toBe(
      'pool_detalhadores_vigentes',
    );
    expect(
      obterCascataRule('contribuicao_previdenciaria_indevida_maior').permiteMultiplosDetalhamentos,
    ).toBe(true);
  });

  it('usa credito raiz replicado para saldo negativo IRPJ e CSLL', () => {
    expect(obterCascataRule('saldo_negativo_irpj').estrategiaSaldoInicial).toBe(
      'credito_raiz_replicado',
    );
    expect(obterCascataRule('saldo_negativo_csll').estrategiaSaldoInicial).toBe(
      'credito_raiz_replicado',
    );
  });

  it('exige componentes para credito judicial', () => {
    const rule = obterCascataRule('credito_judicial');

    expect(rule.estrategiaSaldoInicial).toBe('componentes_credito_judicial');
    expect(rule.alertas).toContain('componentes_credito_judicial_exigidos');
  });

  it('nao cria regra por analogia para tipo desconhecido', () => {
    const rule = obterCascataRule('desconhecido');

    expect(rule.estrategiaSaldoInicial).toBe('dados_insuficientes');
    expect(rule.alertas).toContain('tipo_credito_nao_classificado');
  });
});
