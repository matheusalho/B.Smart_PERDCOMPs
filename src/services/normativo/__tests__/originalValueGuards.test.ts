import { describe, expect, it } from 'vitest';

import { capturarCamposOriginal, compararCamposOriginal } from '../originalValueGuards';

describe('originalValueGuards', () => {
  it('detecta alteracao em campo com sufixo Original', () => {
    const antes = {
      numero: 'DCOMP-1',
      valorUtilizadoPerdcompOriginal: 100,
      debito: { principalOriginal: 50, principal: 50 },
    };
    const depois = {
      numero: 'DCOMP-1',
      valorUtilizadoPerdcompOriginal: 99,
      debito: { principalOriginal: 50, principal: 40 },
    };

    const snapshot = capturarCamposOriginal(antes);
    const comparacao = compararCamposOriginal(snapshot, depois);

    expect(comparacao.preservado).toBe(false);
    expect(comparacao.camposAlterados).toContain('valorUtilizadoPerdcompOriginal');
    expect(comparacao.camposAlterados).not.toContain('debito.principal');
  });

  it('permite alteracao de campos mutaveis quando campos Original ficam preservados', () => {
    const antes = {
      numero: 'DCOMP-1',
      valorUtilizadoPerdcompOriginal: 100,
      valorUtilizadoPerdcomp: 100,
    };
    const depois = {
      numero: 'DCOMP-1',
      valorUtilizadoPerdcompOriginal: 100,
      valorUtilizadoPerdcomp: 80,
    };

    const snapshot = capturarCamposOriginal(antes);
    const comparacao = compararCamposOriginal(snapshot, depois);

    expect(comparacao.preservado).toBe(true);
    expect(comparacao.camposAlterados).toEqual([]);
  });
});
