import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { DCOMP, DebitoOficial } from '../models/types';
import { useStore } from '../store';
import codigosReceitaData from '../data/CodigosDeReceita.json';
import { classificarStatusProcessamento } from '../services/normativo/statusRules';
import { verificarVedacaoDebito } from '../services/normativo/vedacaoCompensacaoService';

// Criar dicionário O(1)
const codigosReceitaDict = codigosReceitaData.reduce((acc, curr) => {
  acc[curr['Código de Receita']] = curr;
  return acc;
}, {} as Record<string, { 'Código de Receita': string, 'Descrição': string, 'Escrituração de Origem': string }>);

interface ModalEdicaoProps {
  dcomp: DCOMP;
  onClose: () => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const ModalEdicao: React.FC<ModalEdicaoProps> = ({ dcomp, onClose }) => {
  const atualizarDebitos = useStore(state => state.atualizarDebitos);
  const [debitosEdit, setDebitosEdit] = useState<DebitoOficial[]>([...dcomp.debitos]);
  const [buscaReceita, setBuscaReceita] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<string>('Todas');

  const origens = ['Todas', 'eSocial', 'EFD-Reinf CP', 'EFD-Reinf RET', 'Sero', 'MIT'];

  const handleEdit = (debId: string, field: keyof DebitoOficial, valStr: string) => {
    const val = Number(valStr);
    if (isNaN(val) || val < 0) return; // bloqueio de negativo

    setDebitosEdit(prev => prev.map(d => {
      if (d.id !== debId) return d;
      
      const novo = { ...d, [field]: val };
      
      // Recálculo proporcional automático (Se mudar o principal, ajusta multa e juros)
      if (field === 'valorPrincipal' && d.valorPrincipalOriginal > 0) {
        // Encontrar a proporção
        const prop = val / d.valorPrincipalOriginal;
        // Ajustar multa e juros
        novo.valorMulta = parseFloat((d.valorMultaOriginal * prop).toFixed(2));
        novo.valorJuros = parseFloat((d.valorJurosOriginal * prop).toFixed(2));
      }

      novo.valorTotal = novo.valorPrincipal + novo.valorMulta + novo.valorJuros;
      return novo;
    }));
  };

  const handleRestaurar = (debId: string) => {
    setDebitosEdit(prev => prev.map(d => {
      if (d.id !== debId) return d;
      return { 
        ...d, 
        valorPrincipal: d.valorPrincipalOriginal, 
        valorMulta: d.valorMultaOriginal, 
        valorJuros: d.valorJurosOriginal,
        valorTotal: d.valorTotalOriginal 
      };
    }));
  };

  const parsePasteValue = (pastedText: string): number | null => {
    let cleaned = pastedText.replace(/[^0-9.,-]/g, '');
    if (cleaned === '') return null;
    
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    let isCommaDecimal = false;
    if (lastComma > lastDot) {
      isCommaDecimal = true;
    }
    
    if (isCommaDecimal) {
      cleaned = cleaned.replace(/\./g, '');
      cleaned = cleaned.replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : Math.max(0, num);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, debId: string, field: keyof DebitoOficial) => {
    const pastedData = e.clipboardData.getData('Text');
    const parsed = parsePasteValue(pastedData);
    if (parsed !== null) {
      e.preventDefault();
      handleEdit(debId, field, parsed.toString());
    }
  };

  const handleSave = () => {
    let hasChanges = false;
    debitosEdit.forEach(d => {
      const orig = dcomp.debitos.find(x => x.id === d.id);
      if (orig && (orig.valorPrincipal !== d.valorPrincipal || orig.valorJuros !== d.valorJuros || orig.valorMulta !== d.valorMulta)) {
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      atualizarDebitos(dcomp.id, debitosEdit);
    }
    
    onClose();
  };

  const debitosFiltrados = useMemo(() => {
    return debitosEdit.filter(d => {
      const matchBusca = !buscaReceita || d.codigoReceita.toLowerCase().includes(buscaReceita.toLowerCase());
      
      const infoReceita = codigosReceitaDict[d.codigoReceita];
      const origemDb = infoReceita ? infoReceita['Escrituração de Origem'] : 'Não Identificado';
      const matchOrigem = filtroOrigem === 'Todas' || origemDb === filtroOrigem;

      return matchBusca && matchOrigem;
    });
  }, [debitosEdit, buscaReceita, filtroOrigem]);

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
    }}>
      <div className="card-glass" style={{ width: '95vw', maxWidth: '1700px', height: '85vh', display: 'flex', flexDirection: 'column', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Edição de Débitos</h2>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem', marginTop: '0.25rem' }}>DCOMP: {dcomp.id} {dcomp.numeroRetificador ? `| Retificadora: ${dcomp.numeroRetificador}` : ''}</p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ fontSize: '1.5rem', padding: '0.2rem 0.5rem', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
        </div>

        {(() => {
          const statusClassificado = classificarStatusProcessamento({
            status: dcomp.situacao,
            tipoDocumento: dcomp.tipoDocumento || ''
          });

          if (statusClassificado.editabilidadeSimulacao === 'bloqueado') {
            return (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--color-danger)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <span style={{ fontSize: '0.9rem' }}>
                  <strong>Atenção:</strong> O status atual (<strong>{dcomp.situacao}</strong>) indica que a retificação desta PER/DCOMP está processualmente bloqueada na RFB. As alterações simuladas aqui terão caráter estritamente hipotético.
                </span>
              </div>
            );
          }
          return null;
        })()}

        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--color-primary)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
          <span style={{ fontSize: '0.9rem' }}>
            Editando <strong>{dcomp.id}</strong>. Ao alterar o <strong>Valor Principal</strong>, multa e juros serão recalculados proporcionalmente.
          </span>
        </div>

        {/* Qualidade da Auditoria SELIC Panel */}
        {dcomp.resultadoSelic && (
          <div style={{ 
            backgroundColor: dcomp.resultadoSelic.statusCalculo === 'normativo' ? 'rgba(16, 185, 129, 0.1)' : 
                             dcomp.resultadoSelic.statusCalculo === 'estimativa_historica' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
            padding: '1rem 1.5rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem', 
            color: dcomp.resultadoSelic.statusCalculo === 'normativo' ? 'var(--color-success)' : 
                   dcomp.resultadoSelic.statusCalculo === 'estimativa_historica' ? 'var(--color-warning)' : 'var(--color-danger)', 
            display: 'flex', 
            flexDirection: 'column',
            gap: '0.5rem', 
            flexShrink: 0, 
            border: `1px solid ${dcomp.resultadoSelic.statusCalculo === 'normativo' ? 'rgba(16, 185, 129, 0.3)' : 
                                  dcomp.resultadoSelic.statusCalculo === 'estimativa_historica' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              {dcomp.resultadoSelic.statusCalculo === 'normativo' ? '✅ Qualidade SELIC: Cálculo Normativo' : 
               dcomp.resultadoSelic.statusCalculo === 'estimativa_historica' ? '⚠️ Qualidade SELIC: Estimativa Histórica' : '❌ Qualidade SELIC: Dados Insuficientes'}
            </div>
            
            <div style={{ fontSize: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <strong>Fontes Normativas:</strong> 
                <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                  {dcomp.resultadoSelic.fontesNormativas.map((f, i) => <li key={i}>{f.resumo}</li>)}
                </ul>
              </div>
              <div>
                <div><strong>Status:</strong> {dcomp.resultadoSelic.statusCalculo.toUpperCase()}</div>
                {dcomp.resultadoSelic.valor?.taxaSelicDecimal !== undefined && (
                  <div><strong>Taxa Selic Injetada:</strong> {(dcomp.resultadoSelic.valor.taxaSelicDecimal * 100).toFixed(4)}%</div>
                )}
              </div>
            </div>
            
            {dcomp.resultadoSelic.alertas && dcomp.resultadoSelic.alertas.length > 0 && (
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                <strong>Observações/Alertas:</strong>
                <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                  {dcomp.resultadoSelic.alertas.map((alerta, idx) => (
                    <li key={idx}>{alerta}</li>
                  ))}
                </ul>
              </div>
            )}

            {dcomp.resultadoSelic.dadosAusentes && dcomp.resultadoSelic.dadosAusentes.length > 0 && (
              <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                <strong>Dados Ausentes que Impedem o Cálculo Exato:</strong>
                <ul style={{ fontSize: '0.8rem', marginTop: '0.25rem', paddingLeft: '1.5rem', color: 'inherit' }}>
                  {dcomp.resultadoSelic.dadosAusentes.map((motivo, idx) => (
                    <li key={idx}>{motivo}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem', flexShrink: 0, display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="🔍 Filtrar por código de receita..." 
            className="input-field" 
            style={{ width: '100%', maxWidth: '300px', padding: '0.75rem 1rem' }}
            value={buscaReceita}
            onChange={e => setBuscaReceita(e.target.value)}
          />

          <select
            className="input-field"
            style={{ padding: '0.75rem 1rem', minWidth: '200px' }}
            value={filtroOrigem}
            onChange={e => setFiltroOrigem(e.target.value)}
          >
            {origens.map(o => (
              <option key={o} value={o}>{o === 'Todas' ? 'Todas as Origens' : o}</option>
            ))}
          </select>
        </div>

        <div className="table-floating-wrapper" style={{ flex: 1, overflowY: 'auto', padding: '0 1rem', border: '1px solid var(--color-glass-border)', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <table className="table-floating">
            <thead>
              <tr>
                <th>Código / PA</th>
                <th>Descrição da Receita</th>
                <th>Vencimento</th>
                <th>Principal (R$)</th>
                <th>Multa (R$)</th>
                <th>Juros (R$)</th>
                <th style={{ textAlign: 'right' }}>Total (R$)</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {debitosFiltrados.map(deb => {
                const isMudado = deb.valorTotal !== deb.valorTotalOriginal;
                const infoReceita = codigosReceitaDict[deb.codigoReceita];
                const origemDb = infoReceita ? infoReceita['Escrituração de Origem'] : 'Não Identificado';
                
                return (
                  <tr key={deb.id} style={{ backgroundColor: isMudado ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontWeight: 600 }}>{deb.codigoReceita}</span>
                          {(() => {
                            const alertas = verificarVedacaoDebito(deb, dcomp.dataTransmissaoOriginal || new Date());
                            if (alertas.length > 0) {
                              return (
                                <span style={{ cursor: 'help' }} title={alertas.map(a => a.mensagem).join(' | ')}>⚠️</span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>PA: {(() => {
                          const val = deb.periodoApuracao;
                          const num = Number(val);
                          if (!isNaN(num) && num > 10000) {
                            const date = new Date(Math.round((num - 25569) * 86400 * 1000));
                            date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
                            const dd = String(date.getDate()).padStart(2, '0');
                            const mm = String(date.getMonth() + 1).padStart(2, '0');
                            const yyyy = date.getFullYear();
                            return `${dd}/${mm}/${yyyy}`;
                          }
                          return val;
                        })()}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: '450px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={infoReceita ? infoReceita['Descrição'] : 'Descrição Indisponível'}>
                      <span style={{ fontSize: '0.85rem' }}>{infoReceita ? infoReceita['Descrição'] : 'Descrição Indisponível'}</span>
                      <br/>
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>{origemDb}</span>
                    </td>
                    <td>{deb.dataVencimento}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{ width: '100%', minWidth: '140px', borderColor: deb.valorPrincipal !== deb.valorPrincipalOriginal ? 'var(--color-primary)' : 'var(--color-border)' }} 
                            value={deb.valorPrincipal} 
                            onChange={e => handleEdit(deb.id, 'valorPrincipal', e.target.value)} 
                            onPaste={e => handlePaste(e, deb.id, 'valorPrincipal')}
                            min="0"
                            step="0.01"
                            tabIndex={0}
                            aria-label={`Editar valor principal do débito ${deb.codigoReceita}`}
                          />
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Orig: {formatCurrency(deb.valorPrincipalOriginal)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{ width: '100%', minWidth: '120px', borderColor: deb.valorMulta !== deb.valorMultaOriginal ? 'var(--color-primary)' : 'var(--color-border)' }} 
                            value={deb.valorMulta} 
                            onChange={e => handleEdit(deb.id, 'valorMulta', e.target.value)} 
                            onPaste={e => handlePaste(e, deb.id, 'valorMulta')}
                            min="0"
                            step="0.01"
                            tabIndex={0}
                            aria-label={`Editar valor multa do débito ${deb.codigoReceita}`}
                          />
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Orig: {formatCurrency(deb.valorMultaOriginal)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{ width: '100%', minWidth: '120px', borderColor: deb.valorJuros !== deb.valorJurosOriginal ? 'var(--color-primary)' : 'var(--color-border)' }} 
                            value={deb.valorJuros} 
                            onChange={e => handleEdit(deb.id, 'valorJuros', e.target.value)} 
                            onPaste={e => handlePaste(e, deb.id, 'valorJuros')}
                            min="0"
                            step="0.01"
                            tabIndex={0}
                            aria-label={`Editar valor juros do débito ${deb.codigoReceita}`}
                          />
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Orig: {formatCurrency(deb.valorJurosOriginal)}</span>
                      </div>
                    </td>
                    <td className="text-right font-mono" style={{ fontWeight: 600, color: isMudado ? 'var(--color-primary)' : 'inherit' }}>
                      {formatCurrency(deb.valorTotal)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {isMudado && (
                        <button className="btn btn-ghost text-danger" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} onClick={() => handleRestaurar(deb.id)}>
                          Restaurar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', flexShrink: 0, gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}>Salvar Alterações</button>
        </div>
      </div>
    </div>,
    document.body
  );
};
