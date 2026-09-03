import type { CadeiaRelacional, DCOMP } from '../../models/types';
import { isVigente } from '../../utils/statusHelper';

export type VigenteIndex = {
  /**
   * Dado o número de uma PER/DCOMP, devolve o número da PER/DCOMP vigente
   * correspondente — o fim da linha de retificações/cancelamentos.
   *
   * - Se a própria referência já for a vigente, devolve o mesmo número.
   * - Se a linha terminar em documento não vigente (cancelado, por exemplo),
   *   não há vigente e o retorno é string vazia.
   * - Se o número não constar do relatório importado, o retorno é string vazia.
   */
  resolver: (numero: string | undefined | null) => string;
};

/**
 * O índice é global às cadeias carregadas, e não por cadeia, porque referências
 * de detalhamento podem apontar para documento de outra cadeia relacional.
 */
export function criarVigenteIndex(cadeias: CadeiaRelacional[]): VigenteIndex {
  const porNumero = new Map<string, DCOMP>();
  for (const cadeia of cadeias) {
    for (const dcomp of cadeia.dcomps) {
      porNumero.set(dcomp.id, dcomp);
    }
  }

  const memo = new Map<string, string>();

  const resolver = (numero: string | undefined | null): string => {
    if (!numero) return '';

    const emCache = memo.get(numero);
    if (emCache !== undefined) return emCache;

    const visitados = new Set<string>();
    let atual: DCOMP | undefined = porNumero.get(numero);

    while (atual?.numeroRetificador && !visitados.has(atual.id)) {
      visitados.add(atual.id);
      const proximo: DCOMP | undefined = porNumero.get(atual.numeroRetificador);
      if (!proximo) break;
      atual = proximo;
    }

    const resultado = atual && isVigente(atual.situacao, atual.tipoDocumento, atual.id)
      ? atual.id
      : '';

    memo.set(numero, resultado);
    return resultado;
  };

  return { resolver };
}
