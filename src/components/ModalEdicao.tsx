import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { DCOMP, DebitoOficial } from '../models/types';
import { useStore } from '../store';
import codigosReceitaData from '../data/CodigosDeReceita.json';

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
  const atualizarDebito = useStore(state => state.atualizarDebito);
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
    debitosEdit.forEach(d => {
      // Comparar com o DCOMP para ver se de fato mudou algo em relação ao estado atual do store
      const orig = dcomp.debitos.find(x => x.id === d.id);
      if (orig && (orig.valorPrincipal !== d.valorPrincipal || orig.valorJuros !== d.valorJuros || orig.valorMulta !== d.valorMulta)) {
        atualizarDebito(dcomp.id, d.id, d.valorPrincipal, d.valorMulta, d.valorJuros);
      }
    });
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

        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1rem 1.5rem', borderRadius: '8px', marginBottom: '1.5rem', color: 'var(--color-primary)', display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
          <span style={{ fontSize: '0.9rem' }}>
            Editando <strong>{dcomp.id}</strong>. Ao alterar o <strong>Valor Principal</strong>, multa e juros serão recalculados proporcionalmente.
          </span>
        </div>

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
                        <span style={{ fontWeight: 600 }}>{deb.codigoReceita}</span>
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
