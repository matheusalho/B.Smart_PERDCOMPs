import type { CadeiaRelacional, DCOMP, DebitoOficial } from '../../models/types';
import { recalcularCadeia } from '../CalculoService';
import { isHypothetical } from './dcompFacts';

export type ReconstrucaoECAC = {
  cadeias: CadeiaRelacional[];
  dcompsHipoteticasExcluidas: number;
  cadeiasRemovidas: number;
};

function restaurarDebito(debito: DebitoOficial): DebitoOficial {
  return {
    ...debito,
    valorPrincipal: debito.valorPrincipalOriginal,
    valorMulta: debito.valorMultaOriginal,
    valorJuros: debito.valorJurosOriginal,
    valorTotal: debito.valorTotalOriginal,
  };
}

function restaurarDcomp(dcomp: DCOMP): DCOMP {
  return {
    ...dcomp,
    valorTotalCreditoDetalhado: dcomp.valorTotalCreditoDetalhadoOriginal,
    valorUtilizadoPerdcomp: dcomp.valorUtilizadoPerdcompOriginal,
    isManuallyEdited: false,
    divergenciaDetalhes: undefined,
    statusCascata: undefined,
    saldoCreditoOriginalCalculado: undefined,
    saldoCreditoOriginalAnterior: undefined,
    debitos: dcomp.debitos.map(restaurarDebito),
  };
}

/**
 * Devolve uma cópia da cadeia com os valores restaurados às âncoras importadas
 * do e-CAC, sem DCOMPs hipotéticas, reprocessada pelo motor de cascata.
 *
 * Existe porque, no modo e-CAC, esconder as colunas de simulação não basta: numa
 * cadeia editada o statusCascata, o saldo e o resultado SELIC dos documentos a
 * jusante já carregam o efeito da edição. Sem a reconstrução, valores simulados
 * apareceriam rotulados como originais.
 *
 * Não muta a cadeia recebida.
 */
export function reconstruirCadeiaOriginal(cadeia: CadeiaRelacional): CadeiaRelacional {
  const dcomps = cadeia.dcomps
    .filter((dcomp) => !isHypothetical(dcomp))
    .map(restaurarDcomp);

  if (dcomps.length === 0) return { ...cadeia, dcomps };

  return recalcularCadeia({ ...cadeia, dcomps });
}

export function reconstruirCadeiasOriginais(cadeias: CadeiaRelacional[]): ReconstrucaoECAC {
  let dcompsHipoteticasExcluidas = 0;
  let cadeiasRemovidas = 0;
  const reconstruidas: CadeiaRelacional[] = [];

  for (const cadeia of cadeias) {
    dcompsHipoteticasExcluidas += cadeia.dcomps.filter(isHypothetical).length;
    const reconstruida = reconstruirCadeiaOriginal(cadeia);

    if (reconstruida.dcomps.length === 0) {
      cadeiasRemovidas += 1;
      continue;
    }
    reconstruidas.push(reconstruida);
  }

  return { cadeias: reconstruidas, dcompsHipoteticasExcluidas, cadeiasRemovidas };
}
