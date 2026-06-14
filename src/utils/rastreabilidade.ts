import type { CadeiaRelacional, DCOMP, Empresa } from '../models/types';
import { isVigente } from './statusHelper';

export type RastreabilidadeBadgeTone = 'success' | 'danger' | 'warning' | 'muted';

export type RastreabilidadeResumo = {
  quantidadeDocumentosCadeia: number;
  quantidadeDocumentosVigentes: number;
  quantidadeDebitos: number;
  totalDebitos: number;
  totalDebitosOriginal: number;
  periodosApuracaoDebitos: string[];
  cnpjsDetentoresCredito: string[];
  cnpjsDetentoresDebito: string[];
  cnpjsTransmissoresDcomp: string[];
  possuiCnpjDivergente: boolean;
  possuiDebitoSucedida: boolean;
  possuiDebitoControladoProcesso: boolean;
  exibirDarfPagamento: boolean;
  exibirProcessos: boolean;
  dadosAusentes: string[];
};

export const buildRastreabilidadeResumo = (
  cadeia: CadeiaRelacional,
  dcomp: DCOMP,
  empresa: Empresa | null,
): RastreabilidadeResumo => {
  const debitos = Array.isArray(dcomp.debitos) ? dcomp.debitos : [];
  const metadados = dcomp.metadadosCreditoImportado;
  const tipoCreditoNormalizado = normalizarTexto(dcomp.tipoCredito);
  const exibirDarfPagamento = tipoCreditoNormalizado.includes('pagamento indevido ou a maior');
  const exibirProcessos = tipoCreditoNormalizado.includes('credito oriundo de acao judicial');
  const cnpjEmpresa = normalizarCnpj(empresa?.cnpj);
  const cnpjsDetentoresCredito = uniquePresent([
    dcomp.detentorCredito,
    ...debitos.map((debito) => debito.cnpjDetentorCredito),
  ]);
  const cnpjsDetentoresDebito = uniquePresent(debitos.map((debito) => debito.cnpjDebito));
  const cnpjsTransmissoresDcomp = uniquePresent(
    debitos.map((debito) => debito.cnpjTransmissorDcomp),
  );
  const cnpjsParaComparar = [
    ...cnpjsDetentoresCredito,
    ...cnpjsDetentoresDebito,
  ].map(normalizarCnpj).filter(Boolean);

  return {
    quantidadeDocumentosCadeia: cadeia.dcomps.length,
    quantidadeDocumentosVigentes: cadeia.dcomps.filter((item) =>
      isVigente(item.situacao, item.tipoDocumento, item.id),
    ).length,
    quantidadeDebitos: debitos.length,
    totalDebitos: debitos.reduce((total, debito) => total + debito.valorTotal, 0),
    totalDebitosOriginal: debitos.reduce(
      (total, debito) => total + debito.valorTotalOriginal,
      0,
    ),
    periodosApuracaoDebitos: uniquePresent(debitos.map((debito) => debito.periodoApuracao)),
    cnpjsDetentoresCredito,
    cnpjsDetentoresDebito,
    cnpjsTransmissoresDcomp,
    possuiCnpjDivergente: Boolean(
      cnpjEmpresa && cnpjsParaComparar.some((cnpj) => cnpj !== cnpjEmpresa),
    ),
    possuiDebitoSucedida: debitos.some((debito) => isSim(debito.debitoSucedida)),
    possuiDebitoControladoProcesso: debitos.some((debito) =>
      isSim(debito.debitoControladoEmProcesso),
    ),
    exibirDarfPagamento,
    exibirProcessos,
    dadosAusentes: buildDadosAusentes(dcomp, metadados),
  };
};

const buildDadosAusentes = (
  dcomp: DCOMP,
  metadados: DCOMP['metadadosCreditoImportado'],
): string[] => {
  const ausentes: string[] = [];
  const tipoCredito = normalizarTexto(dcomp.tipoCredito);

  if (!dcomp.detentorCredito) {
    ausentes.push('Detentor do crédito não informado na importação.');
  }

  const debitos = Array.isArray(dcomp.debitos) ? dcomp.debitos : [];

  if (debitos.length > 0 && debitos.every((debito) => !debito.cnpjDebito)) {
    ausentes.push('CNPJ detentor do débito não informado nos débitos importados.');
  }

  if (tipoCredito.includes('credito oriundo de acao judicial')) {
    if (!metadados?.processoJudicial) {
      ausentes.push('Processo judicial não informado para crédito judicial.');
    }
    if (!metadados?.processoHabilitacao) {
      ausentes.push('Processo de habilitação não informado para crédito judicial.');
    }
  }

  if (tipoCredito.includes('pagamento indevido ou a maior')) {
    if (!metadados?.dataArrecadacaoCredito) {
      ausentes.push('Data de arrecadação do crédito não informada.');
    }
    if (!metadados?.numeroPagamento && !metadados?.codigoReceitaCredito) {
      ausentes.push('Identificação do pagamento/DARF não informada.');
    }
  }

  return ausentes;
};

const uniquePresent = (values: Array<unknown>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const formatted = typeof value === 'string' ? value.trim() : '';
    if (!formatted || seen.has(formatted)) return;
    seen.add(formatted);
    result.push(formatted);
  });

  return result;
};

const normalizarCnpj = (value?: unknown): string =>
  typeof value === 'string' ? value.replace(/\D/g, '') : '';

const normalizarTexto = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const isSim = (value?: string): boolean => normalizarTexto(value ?? '') === 'sim';
