import type { CadeiaRelacional } from '../../../models/types';
import {
  joinFontes,
  joinList,
  toExcelDate,
  toExcelMonth,
  WIDTH,
  type ReportColumn,
  type RowInput,
} from '../workbookKit';

export function buildSelicColumns(): ReportColumn[] {
  return [
    { key: 'idCadeia', header: 'ID Cadeia Relacional', width: WIDTH.regular },
    { key: 'perdcomp', header: 'PER/DCOMP', width: WIDTH.wide },
    { key: 'statusCalculo', header: 'Status Cálculo', width: WIDTH.regular },
    { key: 'metodo', header: 'Método', width: WIDTH.maximum, wrap: true },
    { key: 'origem', header: 'Origem', width: WIDTH.regular },
    { key: 'taxaSelic', header: 'Taxa SELIC', kind: 'percentage', width: WIDTH.medium },
    { key: 'termoInicial', header: 'Termo Inicial', kind: 'month', width: WIDTH.date },
    { key: 'termoFinal', header: 'Termo Final', kind: 'month', width: WIDTH.date },
    { key: 'dataEntrega', header: 'Data Entrega / Valoração', kind: 'date', width: WIDTH.date },
    { key: 'creditoAtualizado', header: 'Crédito Atualizado', kind: 'currency', width: WIDTH.regular },
    { key: 'creditoUtilizado', header: 'Crédito Original Utilizado', kind: 'currency', width: WIDTH.regular },
    { key: 'saldoCalculado', header: 'Saldo Original Calculado', kind: 'currency', width: WIDTH.regular },
    { key: 'dadosUsados', header: 'Dados Usados', width: WIDTH.maximum, wrap: true },
    { key: 'dadosAusentes', header: 'Dados Ausentes', width: WIDTH.maximum, wrap: true },
    { key: 'hipoteses', header: 'Hipóteses', width: WIDTH.maximum, wrap: true },
    { key: 'alertas', header: 'Alertas', width: WIDTH.maximum, wrap: true },
    { key: 'fontes', header: 'Fontes Normativas', width: WIDTH.maximum, wrap: true },
  ];
}

export function buildSelicRows(cadeias: CadeiaRelacional[]): RowInput[] {
  return cadeias.flatMap((cadeia) =>
    cadeia.dcomps.map((dcomp) => {
      const resultado = dcomp.resultadoSelic;
      return {
        idCadeia: cadeia.id,
        perdcomp: dcomp.id,
        statusCalculo: resultado?.statusCalculo ?? '',
        metodo: resultado?.metodo ?? '',
        origem: resultado?.origemValor ?? '',
        taxaSelic: resultado?.valor?.taxaSelicDecimal ?? null,
        termoInicial: toExcelMonth(resultado?.valor?.termoInicialMes),
        termoFinal: toExcelMonth(resultado?.valor?.termoFinalMes),
        dataEntrega: toExcelDate(resultado?.valor?.dataEntregaValoracao),
        creditoAtualizado: resultado?.valor?.valorCreditoAtualizado ?? null,
        creditoUtilizado: resultado?.valor?.creditoOriginalUtilizadoCalculado ?? null,
        saldoCalculado: resultado?.valor?.saldoCreditoOriginalCalculado ?? null,
        dadosUsados: joinList(resultado?.dadosUsados),
        dadosAusentes: joinList(resultado?.dadosAusentes),
        hipoteses: joinList(resultado?.hipoteses),
        alertas: joinList(resultado?.alertas),
        fontes: joinFontes(resultado?.fontesNormativas),
      };
    }),
  );
}
