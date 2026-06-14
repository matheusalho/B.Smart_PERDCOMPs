import { describe, expect, it } from 'vitest';

import { classificarStatusProcessamento } from '../statusRules';

describe('statusRules', () => {
  it('classifica pedido de cancelamento deferido como nao vigente e bloqueado mesmo com tipo Pedido Cancelamento', () => {
    const result = classificarStatusProcessamento({
      status: 'Pedido de cancelamento deferido',
      tipoDocumento: 'Pedido Cancelamento',
    });

    expect(result.vigenciaCascata).toBe('nao_vigente');
    expect(result.editabilidadeSimulacao).toBe('bloqueado');
    expect(result.cancelabilidade).toBe('nao_cancelavel');
    expect(result.motivos).toContain('cancelamento_deferido_irreversivel');
  });

  it('normaliza Nao admitido sem depender de acento', () => {
    const result = classificarStatusProcessamento({
      status: 'Não admitido',
      tipoDocumento: 'Decl. Compensação',
    });

    expect(result.vigenciaCascata).toBe('nao_vigente');
    expect(result.editabilidadeSimulacao).toBe('bloqueado');
    expect(result.motivos).toContain('documento_nao_admitido');
  });

  it('mantem homologado como historicamente vigente mas bloqueado para edicao', () => {
    const result = classificarStatusProcessamento({
      status: 'Homologado',
      tipoDocumento: 'Decl. Compensação',
    });

    expect(result.vigenciaCascata).toBe('vigente');
    expect(result.editabilidadeSimulacao).toBe('bloqueado');
    expect(result.cancelabilidade).toBe('nao_cancelavel');
  });
  it('classifica PER/DCOMP em analise como vigente e editavel', () => {
    const result = classificarStatusProcessamento({
      status: 'Em análise',
      tipoDocumento: 'Decl. Compensação',
    });

    expect(result.vigenciaCascata).toBe('vigente');
    expect(result.editabilidadeSimulacao).toBe('editavel');
    expect(result.cancelabilidade).toBe('cancelavel');
    expect(result.motivos).toContain('documento_em_analise_vigente_editavel');
  });
});
