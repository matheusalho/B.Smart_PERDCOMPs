import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Plus, Trash2, Filter } from 'lucide-react';
import codigosReceitaData from '../data/CodigosDeReceita.json';

// Criar dicionário O(1)
const codigosReceitaDict = codigosReceitaData.reduce((acc, curr) => {
  acc[curr['Código de Receita']] = curr;
  return acc;
}, {} as Record<string, { 'Código de Receita': string, 'Descrição': string, 'Escrituração de Origem': string }>);

export interface DebitoSimulado {
  codigoReceita: string;
  periodoApuracao: string;
  dataVencimento: string;
  principal: number;
  multa: number;
  juros: number;
}

interface DebitoForm {
  id: string;
  codigoReceita: string;
  periodoApuracao: string;
  dataVencimento: string;
  principal: string;
  multa: string;
  juros: string;
}

interface Props {
  onClose: () => void;
  onConfirm: (debitos: DebitoSimulado[]) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const ModalHipotetica: React.FC<Props> = ({ onClose, onConfirm }) => {
  const [debitos, setDebitos] = useState<DebitoForm[]>([
    {
      id: Date.now().toString(),
      codigoReceita: '',
      periodoApuracao: '',
      dataVencimento: '',
      principal: '',
      multa: '',
      juros: ''
    }
  ]);
  const [filtroOrigem, setFiltroOrigem] = useState<string>('Todas');
  const origens = ['Todas', 'eSocial', 'EFD-Reinf CP', 'EFD-Reinf RET', 'Sero', 'MIT'];

  const opcoesDatalist = useMemo(() => {
    if (filtroOrigem === 'Todas') return codigosReceitaData;
    return codigosReceitaData.filter(c => c['Escrituração de Origem'] === filtroOrigem);
  }, [filtroOrigem]);

  const handleAddDebito = () => {
    setDebitos([
      ...debitos,
      {
        id: Date.now().toString(),
        codigoReceita: '',
        periodoApuracao: '',
        dataVencimento: '',
        principal: '',
        multa: '',
        juros: ''
      }
    ]);
  };

  const handleRemoveDebito = (id: string) => {
    if (debitos.length === 1) return;
    setDebitos(debitos.filter(d => d.id !== id));
  };

  const handleChange = (id: string, field: keyof DebitoForm, value: string) => {
    setDebitos(debitos.map(d => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const handleConfirm = () => {
    const parsedDebitos: DebitoSimulado[] = [];
    let hasError = false;

    for (const d of debitos) {
      const p = Number(d.principal);
      if (isNaN(p) || p <= 0) {
        hasError = true;
        break;
      }

      parsedDebitos.push({
        codigoReceita: d.codigoReceita.trim() || 'SIMULADO',
        periodoApuracao: d.periodoApuracao.trim() || 'SIMULADO',
        dataVencimento: d.dataVencimento.trim() || '',
        principal: p,
        multa: Number(d.multa) || 0,
        juros: Number(d.juros) || 0
      });
    }

    if (hasError) {
      alert("Por favor, preencha o Valor Principal numérico (maior que zero) para todos os débitos.");
      return;
    }

    onConfirm(parsedDebitos);
    onClose();
  };

  const totalGeral = debitos.reduce((acc, d) => {
    const p = Number(d.principal) || 0;
    const m = Number(d.multa) || 0;
    const j = Number(d.juros) || 0;
    return acc + p + m + j;
  }, 0);

  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .debito-row {
            display: grid;
            grid-template-columns: 2.2fr 1fr 1fr 1.2fr 1.2fr 1.2fr auto;
            gap: 0.75rem;
            align-items: start;
            background: rgba(255,255,255,0.02);
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.05);
          }
          .debito-row input {
            min-width: 0; /* Previne overflow */
            width: 100%;
          }
        `}
      </style>
      <div className="card-glass" style={{ 
        width: '95vw', 
        maxWidth: '1600px', 
        maxHeight: '90vh',
        padding: '2.5rem 2rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem', 
        position: 'relative' 
      }}>
        
        <button 
          className="btn-ghost" 
          style={{ 
            position: 'absolute', top: '1.5rem', right: '1.5rem', 
            border: 'none', background: 'none', cursor: 'pointer', 
            padding: '0.5rem', color: 'var(--color-text-muted)',
            borderRadius: '50%'
          }}
          onClick={onClose}
          title="Fechar"
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
            <Sparkles size={24} />
            <h3 style={{ margin: 0 }}>PER/DCOMP Hipotética (Múltiplos Débitos)</h3>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', maxWidth: '60%' }}>
              Simule o comportamento da cascata injetando uma nova declaração (futura) para abater um conjunto específico de débitos detalhados.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={16} className="text-muted" />
              <select
                className="input-field"
                style={{ padding: '0.5rem 1rem', minWidth: '180px', fontSize: '0.85rem' }}
                value={filtroOrigem}
                onChange={e => setFiltroOrigem(e.target.value)}
              >
                {origens.map(o => (
                  <option key={o} value={o}>{o === 'Todas' ? 'Todas as Origens' : o}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <datalist id="receitas-datalist">
          {opcoesDatalist.map(c => (
            <option key={c['Código de Receita']} value={c['Código de Receita']}>
              {c['Descrição']}
            </option>
          ))}
        </datalist>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {debitos.map((debito) => {
            const infoReceita = codigosReceitaDict[debito.codigoReceita];
            const origemDb = infoReceita ? infoReceita['Escrituração de Origem'] : 'Não Identificado';
            const hideRow = filtroOrigem !== 'Todas' && debito.codigoReceita && origemDb !== filtroOrigem;

            if (hideRow) return null;

            return (
            <div key={debito.id} className="debito-row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Cód. Receita</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: 5952-07"
                  list="receitas-datalist"
                  value={debito.codigoReceita}
                  onChange={(e) => handleChange(debito.id, 'codigoReceita', e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }} title={infoReceita ? infoReceita['Descrição'] : ''}>
                  {infoReceita ? infoReceita['Descrição'] : (debito.codigoReceita ? 'Origem/Descrição Indisponível' : '')}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}>PA</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: 31/01/2024"
                  value={debito.periodoApuracao}
                  onChange={(e) => handleChange(debito.id, 'periodoApuracao', e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Vencimento</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: 20/02/2024"
                  value={debito.dataVencimento}
                  onChange={(e) => handleChange(debito.id, 'dataVencimento', e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Principal (R$)*</label>
                <input 
                  type="number" step="0.01" min="0"
                  className="input-field" 
                  placeholder="0.00"
                  value={debito.principal}
                  onChange={(e) => handleChange(debito.id, 'principal', e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Multa (R$)</label>
                <input 
                  type="number" step="0.01" min="0"
                  className="input-field" 
                  placeholder="0.00"
                  value={debito.multa}
                  onChange={(e) => handleChange(debito.id, 'multa', e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Juros (R$)</label>
                <input 
                  type="number" step="0.01" min="0"
                  className="input-field" 
                  placeholder="0.00"
                  value={debito.juros}
                  onChange={(e) => handleChange(debito.id, 'juros', e.target.value)}
                />
              </div>

              <button 
                className="btn-ghost" 
                style={{ padding: '0.75rem', color: debitos.length > 1 ? 'var(--color-danger)' : 'var(--color-text-muted)', cursor: debitos.length > 1 ? 'pointer' : 'not-allowed', borderRadius: '8px', alignSelf: 'start', marginTop: '1rem' }}
                onClick={() => handleRemoveDebito(debito.id)}
                disabled={debitos.length === 1}
                title="Remover Débito"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )})}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button 
            className="btn btn-ghost" 
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--color-primary)', fontWeight: 600 }}
            onClick={handleAddDebito}
          >
            <Plus size={16} /> Adicionar Novo Débito
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Total a Abater na DCOMP</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>{formatCurrency(totalGeral)}</span>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ fontWeight: 600 }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleConfirm} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Sparkles size={16} /> Injetar na Cascata
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
