import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { CadeiaRelacional, DCOMP, Empresa } from '../models/types';
import { classificarStatusProcessamento } from '../services/normativo/statusRules';
import { formatCurrency } from '../utils/formatters';
import { buildRastreabilidadeResumo } from '../utils/rastreabilidade';
import { isBloqueado, isVigente } from '../utils/statusHelper';
import { formatarListaMotivosStatus } from '../utils/tooltipMessages';
import { StatusBadge } from './StatusBadge';

type RastreabilidadePanelProps = {
  cadeia: CadeiaRelacional;
  dcomp: DCOMP;
  empresa: Empresa | null;
};

type FieldProps = {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
};

const STORAGE_KEY = 'bsmart-rastreabilidade-panel-open';

export const RastreabilidadePanel: React.FC<RastreabilidadePanelProps> = ({
  cadeia,
  dcomp,
  empresa,
}) => {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) return stored === 'true';
    return window.innerWidth >= 900;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_KEY, String(isOpen));
    }
  }, [isOpen]);

  const resumo = useMemo(
    () => buildRastreabilidadeResumo(cadeia, dcomp, empresa),
    [cadeia, dcomp, empresa],
  );
  const metadados = dcomp.metadadosCreditoImportado;
  const statusClassificadoImportado = dcomp.statusProcessamentoConsultivo;
  const statusClassificadoCalculado = classificarStatusProcessamento({
    status: String(dcomp.situacao ?? ''),
    tipoDocumento: String(dcomp.tipoDocumento ?? ''),
  });
  const statusClassificado =
    statusClassificadoImportado?.vigenciaCascata &&
    statusClassificadoImportado?.editabilidadeSimulacao &&
    Array.isArray(statusClassificadoImportado.motivos)
      ? statusClassificadoImportado
      : statusClassificadoCalculado;
  const vigente = isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
  const bloqueado = isBloqueado(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
  const papelDocumento =
    dcomp.indicadorCredito !== 'Hipotético' &&
    (!dcomp.numeroDcompDetalhamento || dcomp.numeroDcompDetalhamento === dcomp.id)
      ? 'Detalhador do crédito'
      : 'Consumidor de crédito detalhado por outra declaração';
  const processosInformados = [
    metadados?.processoJudicial,
    metadados?.processoHabilitacao,
    metadados?.processoAdministrativo,
  ].filter(Boolean).length;
  const dadosAusentes = [
    ...resumo.dadosAusentes,
    ...(dcomp.resultadoSelic?.dadosAusentes ?? []),
  ];

  return (
    <section className="rastreabilidade-panel card-glass" aria-label="Dados importados e rastreabilidade da PER/DCOMP">
      <button
        type="button"
        className="rastreabilidade-toggle"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span>
          <span className="rastreabilidade-title">Dados importados e rastreabilidade da PER/DCOMP</span>
          <span className="rastreabilidade-subtitle">
            {dcomp.id} · {resumo.quantidadeDebitos} débitos · {resumo.cnpjsDetentoresCredito.length || 1} detentor(es) de crédito
          </span>
        </span>
        <span className="rastreabilidade-toggle-icon">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      <div className="rastreabilidade-badges" aria-label="Alertas de rastreabilidade">
        {vigente ? (
          <StatusBadge tone="success">Vigente</StatusBadge>
        ) : (
          <StatusBadge tone="muted">Não vigente</StatusBadge>
        )}
        {bloqueado && <StatusBadge tone="warning">Bloqueado</StatusBadge>}
        {resumo.possuiCnpjDivergente && <StatusBadge tone="warning">CNPJ divergente</StatusBadge>}
        {resumo.possuiDebitoSucedida && <StatusBadge tone="warning">Débito sucedida</StatusBadge>}
        {processosInformados > 0 && <StatusBadge tone="success">Processo informado</StatusBadge>}
        {dadosAusentes.length > 0 && <StatusBadge tone="danger">Dados insuficientes</StatusBadge>}
      </div>

      {isOpen && (
        <div className="rastreabilidade-content">
          <section className="rastreabilidade-summary" aria-label="Resumo da cadeia">
            <SummaryMetric label="Docs na cadeia" value={resumo.quantidadeDocumentosCadeia} />
            <SummaryMetric label="Docs vigentes" value={resumo.quantidadeDocumentosVigentes} />
            <SummaryMetric label="Débitos nesta PER/DCOMP" value={resumo.quantidadeDebitos} />
            <SummaryMetric label="Total débitos atual" value={formatCurrency(resumo.totalDebitos)} />
            <SummaryMetric label="Total débitos original" value={formatCurrency(resumo.totalDebitosOriginal)} />
          </section>

          <div className="rastreabilidade-grid">
            <InfoSection title="Identificação">
              <InfoField label="PER/DCOMP" value={dcomp.id} mono />
              <InfoField label="Tipo de documento" value={dcomp.tipoDocumento} />
              <InfoField label="Situação" value={dcomp.situacao} />
              <InfoField label="Situação detalhada" value={dcomp.situacaoDetalhada} />
              <InfoField label="Data transmitida" value={formatDateLike(dcomp.dataTransmissao)} />
              <InfoField label="Data de referência" value={formatDateLike(dcomp.dataTransmissaoOriginal)} />
              <InfoField label="Tipo de crédito" value={dcomp.tipoCredito} />
              <InfoField label="PA do crédito" value={dcomp.periodoApuracaoCredito} />
              <InfoField label="PA dos débitos compensados" value={formatList(resumo.periodosApuracaoDebitos)} />
            </InfoSection>

            <InfoSection title="Titularidade">
              <InfoField label="Detentor do crédito" value={formatCnpj(dcomp.detentorCredito)} mono />
              <InfoField label="CNPJ detentor do débito" value={formatList(resumo.cnpjsDetentoresDebito.map(formatCnpj))} mono />
              <InfoField label="Débito de sucedida" value={resumo.possuiDebitoSucedida ? 'Sim' : 'Não'} />
            </InfoSection>

            {resumo.exibirDarfPagamento && (
              <InfoSection title="DARF/Pagamento">
                <InfoField label="Número do pagamento - DARF" value={metadados?.numeroPagamento} mono />
                <InfoField label="Data de arrecadação" value={formatDateLike(metadados?.dataArrecadacaoCredito)} />
                <InfoField label="Tipo competência" value={metadados?.tipoCompetenciaCredito} />
                <InfoField label="PA do DARF" value={metadados?.periodoApuracaoDarf} />
              </InfoSection>
            )}

            {resumo.exibirProcessos && (
              <InfoSection title="Processos">
                <InfoField label="Processo judicial" value={metadados?.processoJudicial} mono />
                <InfoField label="Processo de habilitação" value={metadados?.processoHabilitacao} mono />
                <InfoField label="Processo administrativo" value={metadados?.processoAdministrativo} mono />
                <InfoField label="Origem da discussão" value={metadados?.origemDiscussao} />
              </InfoSection>
            )}

            <InfoSection title="Linhagem e vigência">
              <InfoField label="Papel na cadeia" value={papelDocumento} />
              <InfoField label="Retificado/cancelado por" value={dcomp.numeroRetificador} mono />
              <InfoField label="Detalhamento anterior" value={dcomp.numeroDcompDetalhamento} mono />
              <InfoField label="Vigência consultiva" value={statusClassificado.vigenciaCascata.replace('_', ' ')} />
              <InfoField label="Editabilidade consultiva" value={statusClassificado.editabilidadeSimulacao} />
              <InfoField label="Motivo" value={formatarListaMotivosStatus(statusClassificado.motivos)} />
            </InfoSection>

            <InfoSection title="Qualidade e SELIC">
              <InfoField label="Status SELIC" value={dcomp.resultadoSelic?.statusCalculo} />
              <InfoField label="Método SELIC" value={dcomp.resultadoSelic?.metodo} />
              <InfoField label="Dados ausentes" value={formatList(dadosAusentes)} />
            </InfoSection>
          </div>
        </div>
      )}
    </section>
  );
};

const SummaryMetric: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rastreabilidade-metric">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const InfoSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rastreabilidade-section">
    <h4>{title}</h4>
    <div className="rastreabilidade-field-grid">{children}</div>
  </section>
);

const InfoField: React.FC<FieldProps> = ({ label, value, mono = false }) => (
  <div className="rastreabilidade-field">
    <span>{label}</span>
    <strong className={mono ? 'font-mono' : undefined}>{isEmptyValue(value) ? 'Não informado' : value}</strong>
  </div>
);

const isEmptyValue = (value?: React.ReactNode): boolean =>
  value === undefined || value === null || value === '';

const formatDateLike = (value?: Date | string): string | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear(),
  ].join('/');
};

const formatCnpj = (value?: unknown): string | undefined => {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (!digits) return undefined;
  if (digits.length !== 14) return digits;

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const formatList = (values?: Array<unknown>): string | undefined => {
  const present = values
    ?.map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);
  if (!present || present.length === 0) return undefined;

  return present.join(' · ');
};
