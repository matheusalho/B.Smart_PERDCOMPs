import { describe, expect, it } from 'vitest';

import { fixturesSelicNormativas } from '../fixturesSelic';

describe('fixturesSelic', () => {
  it('define as oito fixtures SELIC minimas da Fase 1', () => {
    expect(fixturesSelicNormativas.map((fixture) => fixture.id)).toEqual([
      'FX-SEL-001',
      'FX-SEL-002',
      'FX-SEL-003',
      'FX-SEL-004',
      'FX-SEL-005',
      'FX-SEL-006',
      'FX-SEL-007',
      'FX-SEL-008',
    ]);
  });

  it('mantem IPI limitado a SELIC do credito sem apuracao operacional', () => {
    const fixture = fixturesSelicNormativas.find((item) => item.id === 'FX-SEL-005');

    expect(fixture?.escopoNegativo).toContain('nao_implementar_raipi');
    expect(fixture?.escopoNegativo).toContain('nao_implementar_apuracao_operacional_ipi');
  });

  it('marca caso sem PER original como dados insuficientes', () => {
    const fixture = fixturesSelicNormativas.find((item) => item.id === 'FX-SEL-007');

    expect(fixture?.resultadoEsperado.statusCalculo).toBe('dados_insuficientes');
    expect(fixture?.resultadoEsperado.dadosAusentes).toContain('dataProtocoloPerOriginal');
  });
});
