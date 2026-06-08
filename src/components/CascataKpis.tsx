import React from 'react';
import { formatCurrency, formatCurrencyMagnitude } from '../utils/formatters';

interface CascataKpisProps {
  totalCreditoAtual: number;
  totalCreditoOriginal: number;
  totalCreditoUtilizado: number;
  variacaoDebitos: number;
  debitosReduzidos: number;
  saldoFinal: number;
  docsRetificadosUsuario: number;
  docsARetificar: number;
}

type KpiTone = 'default' | 'primary' | 'success' | 'warning';

interface ChainKpi {
  label: string;
  value: string;
  tone: KpiTone;
  title?: string;
}

export const CascataKpis: React.FC<CascataKpisProps> = ({
  totalCreditoAtual,
  totalCreditoOriginal,
  totalCreditoUtilizado,
  variacaoDebitos,
  debitosReduzidos,
  saldoFinal,
  docsRetificadosUsuario,
  docsARetificar
}) => {
  const kpis: ChainKpi[] = [
    {
      label: 'Saldo Inicial (Raiz)',
      value: formatCurrency(totalCreditoAtual),
      tone: totalCreditoAtual !== totalCreditoOriginal ? 'primary' : 'default',
    },
    {
      label: 'Créd. Original Usado',
      title: 'Total do Crédito Original Utilizado na Cadeia de PER/DCOMP Selecionada',
      value: formatCurrency(totalCreditoUtilizado),
      tone: 'primary',
    },
    {
      label: 'Saldo Original Restante',
      title: 'Reflete o novo Saldo de Crédito Original após as edições',
      value: formatCurrency(saldoFinal),
      tone: 'primary',
    },
    {
      label: 'Valor Total dos Débitos Reduzidos',
      value: formatCurrencyMagnitude(debitosReduzidos),
      tone: 'default',
    },
    {
      label: 'Lastro Original Disponibilizado',
      value: formatCurrencyMagnitude(variacaoDebitos),
      tone: 'default',
    },
    {
      label: 'Retificadas pelo Usuário',
      value: `${docsRetificadosUsuario} Docs`,
      tone: docsRetificadosUsuario > 0 ? 'success' : 'default',
    },
    {
      label: 'A Retificar (Colaterais)',
      value: `${docsARetificar} Docs`,
      tone: docsARetificar > 0 ? 'warning' : 'default',
    },
  ];

  return (
    <div className="kpi-panel cascade-kpi-panel tour-cadeia-kpi">
      {kpis.map(kpi => (
        <div className="card-glass cascade-kpi-card" key={kpi.label}>
          <div className="label-uppercase cascade-kpi-label" title={kpi.title}>
            {kpi.label}
          </div>
          <div className={`cascade-kpi-value cascade-kpi-value--${kpi.tone}`} title={kpi.value}>
            {kpi.value}
          </div>
        </div>
      ))}
    </div>
  );
};
