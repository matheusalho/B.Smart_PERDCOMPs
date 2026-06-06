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
  return (
    <div className="kpi-panel tour-cadeia-kpi" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <div className="card-glass" style={{ flex: 1, minWidth: '180px', padding: '1.25rem 1.5rem' }}>
        <div className="label-uppercase">Saldo Inicial (Raiz)</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: totalCreditoAtual !== totalCreditoOriginal ? 'var(--color-primary)' : 'inherit' }}>
          {formatCurrency(totalCreditoAtual)}
        </div>
      </div>

      <div className="card-glass" style={{ flex: 1, minWidth: '180px', padding: '1.25rem 1.5rem' }}>
        <div className="label-uppercase" title="Total do Crédito Original Utilizado na Cadeia de PER/DCOMP Selecionada">Créd. Original Usado</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-primary)' }}>
          {formatCurrency(totalCreditoUtilizado)}
        </div>
      </div>
      
      <div className="card-glass" style={{ flex: 1, minWidth: '180px', padding: '1.25rem 1.5rem' }}>
        <div className="label-uppercase" title="Reflete o novo Saldo de Crédito Original após as edições">Saldo Original Restante</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-primary)' }}>
          {formatCurrency(saldoFinal)}
        </div>
      </div>

      <div className="card-glass" style={{ flex: 1, minWidth: '180px', padding: '1.25rem 1.5rem' }}>
        <div className="label-uppercase">Valor Total dos Débitos Reduzidos</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
          {formatCurrencyMagnitude(debitosReduzidos)}
        </div>
      </div>

      <div className="card-glass" style={{ flex: 1, minWidth: '180px', padding: '1.25rem 1.5rem' }}>
        <div className="label-uppercase">Lastro Original Disponibilizado</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
          {formatCurrencyMagnitude(variacaoDebitos)}
        </div>
      </div>

      <div className="card-glass" style={{ flex: 1, minWidth: '180px', padding: '1.25rem 1.5rem' }}>
        <div className="label-uppercase">Retificadas pelo Usuário</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: docsRetificadosUsuario > 0 ? 'var(--color-success)' : 'var(--color-text-main)' }}>
          {docsRetificadosUsuario} Docs
        </div>
      </div>

      <div className="card-glass" style={{ flex: 1, minWidth: '150px', padding: '1.25rem 1.5rem' }}>
        <div className="label-uppercase">A Retificar (Colaterais)</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: docsARetificar > 0 ? 'var(--color-warning)' : 'var(--color-text-main)' }}>
          {docsARetificar} Docs
        </div>
      </div>
    </div>
  );
};
