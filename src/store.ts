import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SimulacaoState, CadeiaRelacional, DCOMP, DebitoOficial } from './models/types';
import { recalcularCadeia } from './services/CalculoService';

export const useStore = create<SimulacaoState>()(
  persist(
    (set, get) => ({
      cadeias: {},
      cadeiaSelecionadaId: null,

      importarDados: (cadeiasList: CadeiaRelacional[]) => {
    const cadeiasMap: Record<string, CadeiaRelacional> = {};
    cadeiasList.forEach(c => {
      // Recalcula inicial pra setar os saldos e flag de divergência da importação pura
      cadeiasMap[c.id] = recalcularCadeia(c);
    });
    set({ cadeias: cadeiasMap });
  },

  selecionarCadeia: (id: string) => {
    set({ cadeiaSelecionadaId: id });
  },

  limparDados: () => {
    set({ cadeias: {}, cadeiaSelecionadaId: null });
  },

  atualizarDebito: (dcompId: string, debitoId: string, novoValorPrincipal: number, novoValorMulta: number, novoValorJuros: number) => {
    const { cadeias, cadeiaSelecionadaId, recalcularCadeia: actionRecalcular } = get();
    if (!cadeiaSelecionadaId) return;

    const cadeia = cadeias[cadeiaSelecionadaId];
    if (!cadeia) return;

    const dcompsAtualizadas = cadeia.dcomps.map((dcomp: DCOMP) => {
      if (dcomp.id !== dcompId) return dcomp;

      const debitosAtualizados = dcomp.debitos.map((deb: DebitoOficial) => {
        if (deb.id !== debitoId) return deb;
        return {
          ...deb,
          valorPrincipal: novoValorPrincipal,
          valorMulta: novoValorMulta,
          valorJuros: novoValorJuros,
          valorTotal: novoValorPrincipal + novoValorMulta + novoValorJuros
        };
      });

      const isAindaEditado = debitosAtualizados.some(deb => deb.valorTotal !== deb.valorTotalOriginal);

      return { ...dcomp, debitos: debitosAtualizados, isManuallyEdited: isAindaEditado };
    });

    const cadeiaAtualizada: CadeiaRelacional = { ...cadeia, dcomps: dcompsAtualizadas };
    
    set({
      cadeias: {
        ...cadeias,
        [cadeiaSelecionadaId]: cadeiaAtualizada
      }
    });

    // Logo após salvar o novo valor no estado, disparamos o recálculo em cascata da cadeia inteira
    actionRecalcular(cadeiaSelecionadaId);
  },

  editarCreditoOriginal: (cadeiaId: string, novoValor: number) => {
    const { cadeias, recalcularCadeia: actionRecalcular } = get();
    const cadeia = cadeias[cadeiaId];
    if (!cadeia || cadeia.dcomps.length === 0) return;

    const dcompsAtualizadas = [...cadeia.dcomps];
    // Atualiza apenas a DCOMP raiz
    dcompsAtualizadas[0] = {
      ...dcompsAtualizadas[0],
      valorTotalCreditoDetalhado: novoValor
    };

    set({
      cadeias: {
        ...cadeias,
        [cadeiaId]: { ...cadeia, dcomps: dcompsAtualizadas }
      }
    });

    actionRecalcular(cadeiaId);
  },

  adicionarDcompHipotetica: (cadeiaId: string, valorDesejado: number, dataTransmissao: Date) => {
    const { cadeias, recalcularCadeia: actionRecalcular } = get();
    const cadeia = cadeias[cadeiaId];
    if (!cadeia) return;

    const novaDcomp: DCOMP = {
      id: `SIMULACAO-${Date.now()}`,
      dataTransmissaoOriginal: dataTransmissao,
      dataTransmissao: dataTransmissao,
      tipoDocumento: 'Decl. Compensação Hipotética',
      situacao: 'Pendente', // Não impede
      indicadorCredito: 'Hipotético',
      tipoCredito: cadeia.tipoCredito,
      detentorCredito: 'Simulado',
      periodoApuracaoCredito: cadeia.periodoApuracao,
      valorTotalCreditoDetalhado: 0,
      valorTotalCreditoDetalhadoOriginal: 0,
      valorCreditoDataTransmissao: 0, // Será calculado
      valorUtilizadoPerdcomp: valorDesejado,
      valorUtilizadoPerdcompOriginal: valorDesejado,
      idCadeiaRelacional: cadeiaId,
      debitos: [
        {
          id: `deb_simul_${Date.now()}`,
          codigoReceita: 'SIMUL',
          periodoApuracao: 'SIMULADO',
          dataVencimento: '',
          valorPrincipal: valorDesejado,
          valorMulta: 0,
          valorJuros: 0,
          valorTotal: valorDesejado,
          valorPrincipalOriginal: valorDesejado,
          valorMultaOriginal: 0,
          valorJurosOriginal: 0,
          valorTotalOriginal: valorDesejado
        }
      ]
    };

    set({
      cadeias: {
        ...cadeias,
        [cadeiaId]: { ...cadeia, dcomps: [...cadeia.dcomps, novaDcomp] }
      }
    });

    actionRecalcular(cadeiaId);
  },

  recalcularCadeia: (cadeiaId: string) => {
    const { cadeias } = get();
    const cadeia = cadeias[cadeiaId];
    if (!cadeia) return;

    const cadeiaRecalculada = recalcularCadeia(cadeia);
    
    set({
      cadeias: {
        ...cadeias,
        [cadeiaId]: cadeiaRecalculada
      }
    });
  }
}),
  {
    name: 'bsmart-perdcomp-storage', // name of item in the storage (must be unique)
  }
));
