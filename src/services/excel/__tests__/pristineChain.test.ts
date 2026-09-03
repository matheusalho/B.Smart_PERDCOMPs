import { describe, expect, it } from 'vitest';

import { reconstruirCadeiaOriginal, reconstruirCadeiasOriginais } from '../pristineChain';
import { criarCadeia, criarCadeiaCompleta, criarDcomp, criarDebito } from './fixtures';

describe('pristineChain', () => {
  it('restaura os valores mutaveis a partir das ancoras Original', () => {
    const editada = criarCadeia({
      dcomps: [criarDcomp({
        isManuallyEdited: true,
        valorTotalCreditoDetalhado: 7000,
        valorTotalCreditoDetalhadoOriginal: 10000,
        valorUtilizadoPerdcomp: 900,
        valorUtilizadoPerdcompOriginal: 1300,
        debitos: [criarDebito({
          valorPrincipal: 600, valorPrincipalOriginal: 1000,
          valorMulta: 120, valorMultaOriginal: 200,
          valorJuros: 60, valorJurosOriginal: 100,
          valorTotal: 780, valorTotalOriginal: 1300,
        })],
      })],
    });

    const [documento] = reconstruirCadeiaOriginal(editada).dcomps;

    expect(documento.valorTotalCreditoDetalhado).toBe(10000);
    expect(documento.valorUtilizadoPerdcomp).toBe(1300);
    expect(documento.isManuallyEdited).toBe(false);
    expect(documento.divergenciaDetalhes).toBeUndefined();
    expect(documento.debitos[0].valorPrincipal).toBe(1000);
    expect(documento.debitos[0].valorMulta).toBe(200);
    expect(documento.debitos[0].valorJuros).toBe(100);
    expect(documento.debitos[0].valorTotal).toBe(1300);
  });

  it('nao muta a cadeia recebida', () => {
    const original = criarCadeia({
      dcomps: [criarDcomp({ valorTotalCreditoDetalhado: 7000, valorTotalCreditoDetalhadoOriginal: 10000 })],
    });
    const snapshot = JSON.stringify(original);

    reconstruirCadeiaOriginal(original);

    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it('descarta DCOMPs hipoteticas e conta quantas sairam', () => {
    const resultado = reconstruirCadeiasOriginais([criarCadeiaCompleta()]);

    expect(resultado.dcompsHipoteticasExcluidas).toBe(1);
    expect(resultado.cadeias[0].dcomps.map((d) => d.id)).not.toContain('HIPOTETICA-1');
    expect(resultado.cadeias[0].dcomps).toHaveLength(5);
  });

  it('remove cadeia que fica vazia apos descartar as hipoteticas', () => {
    const soHipotetica = criarCadeia({
      id: 'CADEIA-HIP',
      dcomps: [criarDcomp({ id: 'HIP-1', indicadorCredito: 'Hipotético' })],
    });

    const resultado = reconstruirCadeiasOriginais([soHipotetica]);

    expect(resultado.cadeias).toHaveLength(0);
    expect(resultado.cadeiasRemovidas).toBe(1);
    expect(resultado.dcompsHipoteticasExcluidas).toBe(1);
  });

  it('em cadeia sem edicoes produz os mesmos valores das ancoras', () => {
    const intacta = criarCadeiaCompleta();
    intacta.dcomps = intacta.dcomps.filter((d) => d.indicadorCredito !== 'Hipotético');

    const reconstruida = reconstruirCadeiaOriginal(intacta);

    reconstruida.dcomps.forEach((documento) => {
      const equivalente = intacta.dcomps.find((d) => d.id === documento.id)!;
      expect(documento.valorTotalCreditoDetalhado).toBe(equivalente.valorTotalCreditoDetalhadoOriginal);
      expect(documento.valorUtilizadoPerdcomp).toBe(equivalente.valorUtilizadoPerdcompOriginal);
    });
  });
});
