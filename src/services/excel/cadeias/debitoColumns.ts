import codigosReceitaData from '../../../data/CodigosDeReceita.json';
import type { CadeiaRelacional, DCOMP, DebitoOficial } from '../../../models/types';
import { hasMeaningfulDifference, simNao } from '../dcompFacts';
import type { VigenteIndex } from '../vigenteIndex';
import { toExcelDate, toExcelMonth, WIDTH, type ReportColumn, type RowInput } from '../workbookKit';
import {
  buildDocumentoColumns,
  buildDocumentoRow,
  money,
  semSubtotal,
  valores,
  type ModoRelatorio,
} from './documentoColumns';

type CodigoReceita = {
  'Código de Receita': string;
  'Descrição': string;
  'Escrituração de Origem': string;
};

const CODIGOS_RECEITA = new Map<string, CodigoReceita>(
  (codigosReceitaData as CodigoReceita[]).map((item) => [item['Código de Receita'], item]),
);

const txt = (key: string, header: string, width: number, wrap = false): ReportColumn =>
  ({ key, header, width, wrap });
const int = (key: string, header: string, width: number): ReportColumn =>
  ({ key, header, kind: 'integer', width });
const dat = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'date', width: WIDTH.date });
const mes = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'month', width: WIDTH.date });
const cnpj = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'cnpj', width: WIDTH.date });
const cur = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'currency', width: WIDTH.regular });

export function buildDebitoColumns(modo: ModoRelatorio): ReportColumn[] {
  return [
    // Blocos A–G repetidos, sem subtotal para não contar em duplicidade
    ...semSubtotal(buildDocumentoColumns(modo)),
    // H. Identificação do débito
    txt('temDebitos', 'Tem Débitos', WIDTH.compact),
    int('numeroDebito', 'Nº do Débito na PER/DCOMP', WIDTH.short),
    txt('codigoReceita', 'Código de Receita', WIDTH.medium),
    txt('descricaoCodigoReceita', 'Descrição do Código de Receita', WIDTH.maximum, true),
    txt('escrituracaoOrigem', 'Escrituração de Origem', WIDTH.medium),
    mes('paDebito', 'PA do Débito'),
    txt('periodicidadeDebito', 'Periodicidade do Débito', WIDTH.medium),
    dat('dataVencimento', 'Data de Vencimento'),
    // I. Valores do débito
    ...money('debitoPrincipal', 'Principal', modo),
    ...money('debitoMulta', 'Multa', modo),
    ...money('debitoJuros', 'Juros', modo),
    ...money('debitoTotal', 'Total', modo),
    ...(modo === 'completo' ? [txt('debitoEditado', 'Débito Editado', WIDTH.short)] : []),
    // J. Metadados do débito
    cnpj('cnpjDetentorDebito', 'CNPJ Detentor do Débito'),
    cnpj('cnpjTransmissor', 'CNPJ Transmissor PER/DCOMP'),
    txt('nomeEmpresarial', 'Nome Empresarial', WIDTH.maximum, true),
    txt('apelido', 'Apelido', WIDTH.regular),
    cnpj('cnpjDetentorCredito', 'CNPJ Detentor do Crédito'),
    txt('paCreditoDebito', 'PA do Crédito (Débito)', WIDTH.date),
    txt('periodicidadeCredito', 'Periodicidade do PA do Crédito', WIDTH.medium),
    txt('inicioPaCredito', 'Início do PA do Crédito', WIDTH.date),
    txt('fimPaCredito', 'Fim do PA do Crédito', WIDTH.date),
    cur('totalCreditoOriginalUtilizado', 'Total Crédito Original Utilizado'),
    cnpj('cnpjPrestador', 'CNPJ Prestador'),
    txt('cnoObra', 'CNO Obra', WIDTH.regular),
    txt('debitoControladoProcesso', 'Débito Controlado em Processo', WIDTH.regular),
    txt('reciboPerdcomp', 'Nº do Recibo PER/DCOMP', WIDTH.wide),
    txt('reciboPerdcompVigente', 'Nº do Recibo PER/DCOMP — Vigente', WIDTH.wide),
    txt('reciboDctf', 'Nº do Recibo de Transmissão DCTF', WIDTH.wide),
    txt('categoriaDctf', 'Categoria DCTF', WIDTH.medium),
    txt('dataTransmissaoDctf', 'Data de Transmissão DCTF', WIDTH.date),
    txt('debitoSucedida', 'Débito Sucedida', WIDTH.regular),
  ];
}

function debitoEditado(debito: DebitoOficial): boolean {
  return (
    hasMeaningfulDifference(debito.valorPrincipalOriginal, debito.valorPrincipal) ||
    hasMeaningfulDifference(debito.valorMultaOriginal, debito.valorMulta) ||
    hasMeaningfulDifference(debito.valorJurosOriginal, debito.valorJuros) ||
    hasMeaningfulDifference(debito.valorTotalOriginal, debito.valorTotal)
  );
}

function buildDebitoRow(
  debito: DebitoOficial,
  numeroDebito: number,
  modo: ModoRelatorio,
  vigentes: VigenteIndex,
): RowInput {
  const receita = CODIGOS_RECEITA.get(debito.codigoReceita);

  return {
    temDebitos: 'Sim',
    numeroDebito,
    codigoReceita: debito.codigoReceita,
    descricaoCodigoReceita: receita?.['Descrição'] ?? '',
    escrituracaoOrigem: receita?.['Escrituração de Origem'] ?? '',
    paDebito: toExcelMonth(debito.periodoApuracao),
    periodicidadeDebito: debito.periodicidadeDebito ?? '',
    dataVencimento: toExcelDate(debito.dataVencimento),

    ...valores('debitoPrincipal', debito.valorPrincipalOriginal, debito.valorPrincipal, modo),
    ...valores('debitoMulta', debito.valorMultaOriginal, debito.valorMulta, modo),
    ...valores('debitoJuros', debito.valorJurosOriginal, debito.valorJuros, modo),
    ...valores('debitoTotal', debito.valorTotalOriginal, debito.valorTotal, modo),
    ...(modo === 'completo' ? { debitoEditado: simNao(debitoEditado(debito)) } : {}),

    cnpjDetentorDebito: debito.cnpjDebito ?? '',
    cnpjTransmissor: debito.cnpjTransmissorDcomp ?? '',
    nomeEmpresarial: debito.nomeEmpresarial ?? '',
    apelido: debito.apelido ?? '',
    cnpjDetentorCredito: debito.cnpjDetentorCredito ?? '',
    paCreditoDebito: debito.periodoApuracaoCredito ?? '',
    periodicidadeCredito: debito.periodicidadeCredito ?? '',
    inicioPaCredito: debito.inicioPeriodoApuracaoCredito ?? '',
    fimPaCredito: debito.fimPeriodoApuracaoCredito ?? '',
    totalCreditoOriginalUtilizado: debito.totalCreditoOriginalUtilizado ?? null,
    cnpjPrestador: debito.cnpjPrestador ?? '',
    cnoObra: debito.cnoObra ?? '',
    debitoControladoProcesso: debito.debitoControladoEmProcesso ?? '',
    reciboPerdcomp: debito.numeroReciboPerDcomp ?? '',
    reciboPerdcompVigente: vigentes.resolver(debito.numeroReciboPerDcomp),
    reciboDctf: debito.numeroReciboTransmissaoDctf ?? '',
    categoriaDctf: debito.categoriaDctf ?? '',
    dataTransmissaoDctf: debito.dataTransmissaoDctf ?? '',
    debitoSucedida: debito.debitoSucedida ?? '',
  };
}

function buildLinhasDoDocumento(
  dcomp: DCOMP,
  cadeia: CadeiaRelacional,
  ordem: number,
  modo: ModoRelatorio,
  vigentes: VigenteIndex,
): RowInput[] {
  const documento = buildDocumentoRow(dcomp, cadeia, ordem, modo, vigentes);

  // PER e qualquer documento sem débitos importados ocupam exatamente uma
  // linha, com os blocos H, I e J vazios.
  if (dcomp.debitos.length === 0) {
    return [{ ...documento, temDebitos: 'Não' }];
  }

  return dcomp.debitos.map((debito, indice) => ({
    ...documento,
    ...buildDebitoRow(debito, indice + 1, modo, vigentes),
  }));
}

export function buildDebitosRows(
  cadeias: CadeiaRelacional[],
  modo: ModoRelatorio,
  vigentes: VigenteIndex,
): RowInput[] {
  return cadeias.flatMap((cadeia) =>
    cadeia.dcomps.flatMap((dcomp, indice) =>
      buildLinhasDoDocumento(dcomp, cadeia, indice + 1, modo, vigentes)),
  );
}
