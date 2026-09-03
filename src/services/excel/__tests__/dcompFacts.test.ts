import { describe, expect, it } from 'vitest';

import { isBloqueado, isVigente } from '../../../utils/statusHelper';
import {
  getFiltrosCascata,
  getNatureza,
  getOrigemDocumento,
  getPapelDocumento,
  getStatusCascataLabel,
  getVinculoSubstituicao,
  simNao,
} from '../dcompFacts';
import { criarCadeiaCompleta, criarDcomp } from './fixtures';

describe('dcompFacts', () => {
  it('classifica natureza e origem do documento', () => {
    expect(getNatureza(criarDcomp())).toBe('DCOMP');
    expect(getNatureza(criarDcomp({ tipoDocumento: 'Pedido de Restituição', debitos: [] }))).toBe('PER');
    expect(getNatureza(criarDcomp({ id: '00005.00005.050124.1.8.02-0005' }))).toBe('Pedido de Cancelamento');

    expect(getOrigemDocumento(criarDcomp({ indicadorCredito: '1' }))).toBe('Original');
    expect(getOrigemDocumento(criarDcomp({ indicadorCredito: '2' }))).toBe('Retificador');
  });

  it('distingue detalhador de consumidor pela regra da TimelineCascata', () => {
    expect(getPapelDocumento(criarDcomp({ numeroDcompDetalhamento: undefined }))).toBe('Detalhador');
    expect(getPapelDocumento(criarDcomp({ id: 'X', numeroDcompDetalhamento: 'X' }))).toBe('Detalhador');
    expect(getPapelDocumento(criarDcomp({ id: 'X', numeroDcompDetalhamento: 'Y' }))).toBe('Consumidor');
    expect(getPapelDocumento(criarDcomp({ indicadorCredito: 'Hipotético' }))).toBe('—');
  });

  it('rotula o status da cascata na mesma ordem de precedencia da tela', () => {
    expect(getStatusCascataLabel(criarDcomp({ statusCascata: 'EDITADO_E_RETIFICAR' }))).toBe('EDITADO E A RETIFICAR');
    expect(getStatusCascataLabel(criarDcomp({ statusCascata: 'RETIFICAR' }))).toBe('A RETIFICAR');
    expect(getStatusCascataLabel(criarDcomp({ statusCascata: 'IMPACTADO_BLOQUEADO' }))).toBe('BLOQUEADO');
    expect(getStatusCascataLabel(criarDcomp({ statusCascata: 'EDITADO' }))).toBe('EDITADO');
    expect(getStatusCascataLabel(criarDcomp({ situacao: 'Retificado', statusCascata: undefined }))).toBe('Não vigente');
    expect(getStatusCascataLabel(criarDcomp())).toBe('OK');
  });

  it('resolve os dois sentidos do vinculo de substituicao', () => {
    const cadeia = criarCadeiaCompleta();
    const retificada = cadeia.dcomps[2];
    const retificadora = cadeia.dcomps[3];

    expect(getVinculoSubstituicao(retificada, cadeia)).toEqual({
      tipo: 'Retificada por',
      substituiPerdcomp: '',
    });
    expect(getVinculoSubstituicao(retificadora, cadeia)).toEqual({
      tipo: '—',
      substituiPerdcomp: '00003.00003.030124.1.3.24-0003',
    });
  });

  it('reproduz literalmente os predicados de filtro da TimelineCascata', () => {
    for (const dcomp of criarCadeiaCompleta().dcomps) {
      const vigente = isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
      const bloqueado = isBloqueado(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
      const aRetificar = dcomp.statusCascata === 'RETIFICAR' || dcomp.statusCascata === 'EDITADO_E_RETIFICAR';

      expect(getFiltrosCascata(dcomp)).toEqual({
        vigentesEditaveis: (vigente && !bloqueado) || aRetificar,
        ok: vigente && !bloqueado && (dcomp.statusCascata === 'OK' || dcomp.statusCascata === 'EDITADO'),
        aRetificar,
        impedido: !vigente || bloqueado,
        apenasDetalhadores: !dcomp.numeroDcompDetalhamento || dcomp.numeroDcompDetalhamento === dcomp.id,
      });
    }
  });

  it('formata booleano como Sim/Nao', () => {
    expect(simNao(true)).toBe('Sim');
    expect(simNao(false)).toBe('Não');
  });
});
