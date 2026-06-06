import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import type { SimulacaoState, CadeiaRelacional, DCOMP, DebitoOficial, Empresa } from './models/types';
import { recalcularCadeia } from './services/CalculoService';

export const useStore = create<SimulacaoState>()(
  persist(
    (set, get) => ({
      empresa: null,
      cadeias: {},
      cadeiaSelecionadaId: null,
      simulacoesSalvas: [],

      importarDados: (cadeiasList: CadeiaRelacional[], empresa: Empresa, isRecalculated: boolean = false) => {
    const cadeiasMap: Record<string, CadeiaRelacional> = {};
    cadeiasList.forEach(c => {
      // Se vier do worker, já está recalculada, o que salva bloqueio da UI
      cadeiasMap[c.id] = isRecalculated ? c : recalcularCadeia(c);
    });
    set({ cadeias: cadeiasMap, empresa });
  },

  selecionarCadeia: (id: string) => {
    set({ cadeiaSelecionadaId: id });
  },

  limparDados: () => {
    set({ cadeias: {}, cadeiaSelecionadaId: null, simulacoesSalvas: [], empresa: null });
  },

  limparSimulacoesSalvas: () => {
    set({ simulacoesSalvas: [] });
  },

  salvarSimulacaoCadeia: (cadeiaId: string, kpis) => {
    const { cadeias, simulacoesSalvas } = get();
    const cadeia = cadeias[cadeiaId];
    if (!cadeia) return;

    const novaSimulacao = {
      id: `SIMULACAO-${Date.now()}`,
      dataSalvamento: new Date(),
      cadeiaId: cadeia.id,
      numeroDcompInicial: cadeia.numeroDcompInicial,
      tipoCredito: cadeia.tipoCredito,
      kpis,
      // Fazendo deep copy simplificada para snapshot das dcomps
      dcomps: JSON.parse(JSON.stringify(cadeia.dcomps))
    };

    set({
      simulacoesSalvas: [...simulacoesSalvas, novaSimulacao]
    });
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

  adicionarDcompHipotetica: (cadeiaId, debitosSimulados, dataTransmissao) => {
    const { cadeias, recalcularCadeia: actionRecalcular } = get();
    const cadeia = cadeias[cadeiaId];
    if (!cadeia) return;

    // Converte os débitos simulados para o formato DebitoOficial
    let valorDesejadoTotal = 0;
    const debitosOficiais: DebitoOficial[] = debitosSimulados.map((d, index) => {
      const total = d.principal + d.multa + d.juros;
      valorDesejadoTotal += total;
      
      return {
        id: `deb_simul_${Date.now()}_${index}`,
        codigoReceita: d.codigoReceita || 'SIMUL',
        periodoApuracao: d.periodoApuracao || 'SIMULADO',
        dataVencimento: d.dataVencimento || '',
        valorPrincipal: d.principal,
        valorMulta: d.multa,
        valorJuros: d.juros,
        valorTotal: total,
        valorPrincipalOriginal: d.principal,
        valorMultaOriginal: d.multa,
        valorJurosOriginal: d.juros,
        valorTotalOriginal: total
      };
    });

    const qtdHipoteticas = cadeia.dcomps.filter(d => d.indicadorCredito === 'Hipotético').length;
    const nextX = qtdHipoteticas + 1;
    
    // dataTransmissao é um Date
    const dateStr = format(dataTransmissao, 'ddMMyyyy');
    
    const partesRaiz = cadeia.numeroDcompInicial.split('.');
    const sufixoRaiz = partesRaiz.length > 3 ? partesRaiz.slice(3).join('.') : 'SIMULACAO';
    
    const novaId = `Hipotética.${nextX}.${dateStr}.${sufixoRaiz}`;

    const novaDcomp: DCOMP = {
      id: novaId,
      dataTransmissaoOriginal: dataTransmissao,
      dataTransmissao: dataTransmissao,
      tipoDocumento: 'Decl. Compensação Hipotética',
      situacao: 'Pendente',
      indicadorCredito: 'Hipotético',
      tipoCredito: cadeia.tipoCredito,
      detentorCredito: 'Simulado',
      periodoApuracaoCredito: cadeia.periodoApuracao,
      valorTotalCreditoDetalhado: 0,
      valorTotalCreditoDetalhadoOriginal: 0,
      valorCreditoDataTransmissao: 0,
      valorUtilizadoPerdcomp: valorDesejadoTotal,
      valorUtilizadoPerdcompOriginal: valorDesejadoTotal,
      idCadeiaRelacional: cadeiaId,
      debitos: debitosOficiais
    };

    set({
      cadeias: {
        ...cadeias,
        [cadeiaId]: { ...cadeia, dcomps: [...cadeia.dcomps, novaDcomp] }
      }
    });

    actionRecalcular(cadeiaId);
  },

  removerDcompHipotetica: (cadeiaId, dcompId) => {
    const { cadeias, recalcularCadeia: actionRecalcular } = get();
    const cadeia = cadeias[cadeiaId];
    if (!cadeia) return;

    const novaListaDcomps = cadeia.dcomps.filter(d => d.id !== dcompId);

    set({
      cadeias: {
        ...cadeias,
        [cadeiaId]: { ...cadeia, dcomps: novaListaDcomps }
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
