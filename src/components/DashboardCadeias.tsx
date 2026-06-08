import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../store';
import type { CadeiaRelacional } from '../models/types';
import { TimelineCascata } from './TimelineCascata';
import { UploadComponent } from './UploadComponent';
import { isVigente } from '../utils/statusHelper';
import { Network, FileText, Edit3, Unlock, TrendingDown, AlertTriangle, Building2, Calendar } from 'lucide-react';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val));

const formatCNPJ = (cnpj: string) => {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj; // fallback caso não tenha 14 dígitos
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
};

export const DashboardCadeias: React.FC = () => {
  const cadeias = useStore(state => state.cadeias);
  const empresa = useStore(state => state.empresa);
  const cadeiaSelecionadaId = useStore(state => state.cadeiaSelecionadaId);
  const selecionarCadeia = useStore(state => state.selecionarCadeia);

  const [isResumoOpen, setIsResumoOpen] = useState(true);
  const [filtroDcomp, setFiltroDcomp] = useState('');
  const [filtroPACredito, setFiltroPACredito] = useState('');
  const [filtroPADebito, setFiltroPADebito] = useState('');
  const [filtroTipoCredito, setFiltroTipoCredito] = useState('');
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const listaCadeias = Object.values(cadeias) as CadeiaRelacional[];
  const cadeiaSelecionada = cadeiaSelecionadaId ? cadeias[cadeiaSelecionadaId] : null;
  const tiposCreditoDisponiveis = useMemo(() => {
    return Array.from(
      new Set(
        listaCadeias
          .map(cadeia => cadeia.tipoCredito.trim())
          .filter(tipoCredito => tipoCredito.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [listaCadeias]);

  const kpisGlobais = useMemo(() => {
    let cadeiasEditadas = 0;
    let debitosReduzidos = 0;
    let saldoDisponibilizado = 0;
    let dcompsIndividuais = 0;
    let dcompsDivergentes = 0;
    let minDate = new Date('2099-01-01').getTime();
    let maxDate = new Date('1970-01-01').getTime();

    listaCadeias.forEach(cadeia => {
      let isEditada = false;
      dcompsIndividuais += cadeia.dcomps.length;
      cadeia.dcomps.forEach(dcomp => {
        if (dcomp.isManuallyEdited || dcomp.indicadorCredito === 'Hipotético') {
          isEditada = true;
        }

        if (dcomp.isDivergente) {
          dcompsDivergentes++;
        }

        // Zustand persist serializa Date como string no LocalStorage. Precisamos garantir a conversão.
        const dTime = new Date(dcomp.dataTransmissaoOriginal).getTime();
        if (dTime < minDate) minDate = dTime;
        if (dTime > maxDate) maxDate = dTime;

        if (isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id) && dcomp.indicadorCredito !== 'Hipotético') {
          const originalUsado = dcomp.valorUtilizadoPerdcompOriginal || dcomp.valorUtilizadoPerdcomp;
          saldoDisponibilizado += (originalUsado - dcomp.valorUtilizadoPerdcomp);

          dcomp.debitos.forEach(deb => {
            const original = deb.valorTotalOriginal || deb.valorTotal;
            debitosReduzidos += (original - deb.valorTotal);
          });
        }
      });
      if (isEditada) cadeiasEditadas++;
    });

    const anoMin = minDate <= maxDate ? new Date(minDate).getFullYear() : null;
    const anoMax = minDate <= maxDate ? new Date(maxDate).getFullYear() : null;

    return { cadeiasEditadas, debitosReduzidos, saldoDisponibilizado, dcompsIndividuais, dcompsDivergentes, anoMin, anoMax };
  }, [listaCadeias]);

  const listaCadeiasFiltradas = useMemo(() => {
    return listaCadeias.filter(cadeia => {
      // Filtro PER/DCOMP
      if (filtroDcomp) {
        const dcompLimpa = filtroDcomp.replace(/\D/g, '');
        const hasDcomp = cadeia.dcomps.some(d => d.id.replace(/\D/g, '').includes(dcompLimpa));
        if (!hasDcomp) return false;
      }

      // Filtro PA Crédito
      if (filtroPACredito) {
        if (!cadeia.periodoApuracao.toLowerCase().includes(filtroPACredito.toLowerCase())) return false;
      }

      // Filtro PA Débito
      if (filtroPADebito) {
        const hasDebito = cadeia.dcomps.some(d => 
          d.debitos.some(deb => deb.periodoApuracao.toLowerCase().includes(filtroPADebito.toLowerCase()))
        );
        if (!hasDebito) return false;
      }

      // Filtro Tipo de Crédito
      if (filtroTipoCredito) {
        if (cadeia.tipoCredito !== filtroTipoCredito) return false;
      }

      return true;
    });
  }, [listaCadeias, filtroDcomp, filtroPACredito, filtroPADebito, filtroTipoCredito]);

  if (listaCadeias.length === 0) {
    return (
      <div>
        <UploadComponent />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '60vh' }}>
      
      {/* Resumo Executivo Colapsável */}
      <div className="card-glass tour-global-kpi" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem 2rem' }}>
        <div 
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={(e) => {
            // Ignora o click se clicar nos botões de ação
            if ((e.target as HTMLElement).closest('.action-buttons')) return;
            setIsResumoOpen(!isResumoOpen);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Visão Executiva (Dashboard Global)</h3>
          </div>
          <div className="action-buttons" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn btn-ghost" style={{ padding: '0.5rem' }}>
              {isResumoOpen ? '▲ Recolher' : '▼ Expandir'}
            </button>
          </div>
        </div>

        {isResumoOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
            
            {/* Informações da Empresa */}
            {empresa && (
              <div style={{ padding: '1.25rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--color-glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                    <Building2 size={24} color="var(--color-primary)" />
                  </div>
                  <div>
                    <div className="label-uppercase" style={{ marginBottom: '0.25rem' }}>Empresa Analisada</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{empresa.razaoSocial}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontWeight: 400, marginTop: '0.15rem' }}>
                      CNPJ: {formatCNPJ(empresa.cnpj)}
                    </div>
                  </div>
                </div>

                {kpisGlobais.anoMin && kpisGlobais.anoMax && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid var(--color-glass-border)' }}>
                    <Calendar size={18} color="var(--color-text-muted)" />
                    <span style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                      Dados de {kpisGlobais.anoMin} a {kpisGlobais.anoMax}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Cards de KPI */}
            <div className="kpi-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              
              {/* Alerta de Inconsistências */}
              {kpisGlobais.dcompsDivergentes > 0 && (
                <div className="card-glass" style={{ flex: 1, minWidth: '180px', padding: '1.25rem', position: 'relative', overflow: 'hidden', border: '1px solid rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                  <div className="label-uppercase" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
                    <AlertTriangle size={16} /> Inconsistências Identificadas
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-danger)', marginTop: '0.5rem' }}>{kpisGlobais.dcompsDivergentes}</div>
                </div>
              )}

              {/* Total de Cadeias */}
              <div className="card-glass" style={{ flex: 1, minWidth: '180px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                <div className="label-uppercase" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Network size={16} color="var(--color-text-muted)" /> Total de Cadeias
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 600, marginTop: '0.5rem' }}>{listaCadeias.length}</div>
                <svg width="100%" height="4" style={{ position: 'absolute', bottom: 0, left: 0 }}>
                  <rect width="100%" height="4" fill="var(--color-primary)" opacity="0.3" />
                  <rect width="100%" height="4" fill="var(--color-primary)" />
                </svg>
              </div>

              {/* Total PER/DCOMPs */}
              <div className="card-glass" style={{ flex: 1, minWidth: '180px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                <div className="label-uppercase" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} color="var(--color-text-muted)" /> Total PER/DCOMPs
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 600, marginTop: '0.5rem' }}>{kpisGlobais.dcompsIndividuais}</div>
                <svg width="100%" height="4" style={{ position: 'absolute', bottom: 0, left: 0 }}>
                  <rect width="100%" height="4" fill="var(--color-primary)" opacity="0.3" />
                  <rect width="100%" height="4" fill="var(--color-primary)" />
                </svg>
              </div>

              {/* Cadeias Editadas */}
              <div className="card-glass" style={{ flex: 1, minWidth: '220px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                <div className="label-uppercase" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit3 size={16} color="var(--color-text-muted)" /> Cadeias Editadas pelo Usuário
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 600, marginTop: '0.5rem', color: kpisGlobais.cadeiasEditadas > 0 ? 'var(--color-success)' : 'inherit' }}>
                  {kpisGlobais.cadeiasEditadas} <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>/ {listaCadeias.length}</span>
                </div>
                <svg width="100%" height="4" style={{ position: 'absolute', bottom: 0, left: 0 }}>
                  <rect width="100%" height="4" fill="var(--color-success)" opacity="0.2" />
                  <rect width={`${(kpisGlobais.cadeiasEditadas / Math.max(listaCadeias.length, 1)) * 100}%`} height="4" fill="var(--color-success)" />
                </svg>
              </div>

              {/* Lastro */}
              <div className="card-glass" style={{ flex: 1, minWidth: '220px', padding: '1.25rem' }}>
                <div className="label-uppercase" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Unlock size={16} color="var(--color-text-muted)" /> Lastro Disp. pelas Edições
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--color-success)' }}>
                  {formatCurrency(kpisGlobais.saldoDisponibilizado)}
                </div>
              </div>

              {/* Débitos */}
              <div className="card-glass" style={{ flex: 1, minWidth: '220px', padding: '1.25rem' }}>
                <div className="label-uppercase" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingDown size={16} color="var(--color-text-muted)" /> Débitos Reduzidos
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--color-success)' }}>
                  {formatCurrency(kpisGlobais.debitosReduzidos)}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Menu Superior - Seleção de Cadeia */}
      <div className="card-glass sidebar-cadeias" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 50 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>Cadeias Relacionais</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>Filtre e selecione uma Cadeia de PER/DCOMPs para simular suas retificações:</p>
          </div>
          
          {/* Filtros da Cadeia */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label className="label-uppercase" style={{ marginBottom: '0.5rem', display: 'block' }}>Filtrar por PER/DCOMP (Nº)</label>
              <input 
                type="text" 
                className="input-field" 
                style={{ width: '100%' }}
                placeholder="Ex: 20923.60398..."
                value={filtroDcomp}
                onChange={e => setFiltroDcomp(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <label className="label-uppercase" style={{ marginBottom: '0.5rem', display: 'block' }}>Tipo de Crédito</label>
              <select
                className="input-field"
                style={{ width: '100%' }}
                value={filtroTipoCredito}
                onChange={e => setFiltroTipoCredito(e.target.value)}
                aria-label="Filtrar por tipo de crédito"
              >
                <option value="">Todos os tipos de crédito</option>
                {tiposCreditoDisponiveis.map(tipoCredito => (
                  <option key={tipoCredito} value={tipoCredito}>
                    {tipoCredito}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label className="label-uppercase" style={{ marginBottom: '0.5rem', display: 'block' }}>PA do Crédito</label>
              <input 
                type="text" 
                className="input-field" 
                style={{ width: '100%' }}
                placeholder="Ex: 01/2023"
                value={filtroPACredito}
                onChange={e => setFiltroPACredito(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label className="label-uppercase" style={{ marginBottom: '0.5rem', display: 'block' }}>PA de algum Débito</label>
              <input 
                type="text" 
                className="input-field" 
                style={{ width: '100%' }}
                placeholder="Ex: 2023-11"
                value={filtroPADebito}
                onChange={e => setFiltroPADebito(e.target.value)}
              />
            </div>
          </div>

          <div className="tour-custom-dropdown" style={{ position: 'relative' }} ref={dropdownRef}>
            <div 
              className="input-field"
              style={{ width: '100%', cursor: 'pointer', padding: '0.85rem 1rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-glass-bg)' }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>
                {cadeiaSelecionada ? (
                  `Origem: ${cadeiaSelecionada.numeroDcompInicial} | ${cadeiaSelecionada.tipoCredito} | PA Crédito: ${cadeiaSelecionada.periodoApuracao} (${cadeiaSelecionada.dcomps.length} DCOMPs)`
                ) : (
                  `-- Selecione uma Cadeia (${listaCadeiasFiltradas.length} encontradas) --`
                )}
              </span>
              <span>{isDropdownOpen ? '▲' : '▼'}</span>
            </div>

            {isDropdownOpen && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0, 
                maxHeight: '400px', 
                overflowY: 'auto', 
                backgroundColor: 'var(--color-bg)', 
                border: '1px solid var(--color-glass-border)', 
                borderRadius: 'var(--border-radius-md)', 
                marginTop: '0.5rem', 
                zIndex: 1000,
                boxShadow: 'var(--shadow-glass)'
              }}>
                {listaCadeiasFiltradas.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Nenhuma cadeia encontrada com os filtros atuais.</div>
                ) : (
                  listaCadeiasFiltradas.map((cadeia: CadeiaRelacional) => (
                    <div 
                      key={cadeia.id}
                      onClick={() => {
                        selecionarCadeia(cadeia.id);
                        setIsDropdownOpen(false);
                      }}
                      style={{ 
                        padding: '1rem', 
                        borderBottom: '1px solid var(--color-glass-border)', 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        backgroundColor: cadeiaSelecionadaId === cadeia.id ? 'var(--color-glass-hover)' : 'transparent',
                        borderLeft: cadeiaSelecionadaId === cadeia.id ? '4px solid var(--color-primary)' : '4px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (cadeiaSelecionadaId !== cadeia.id) {
                          e.currentTarget.style.backgroundColor = 'var(--color-glass-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (cadeiaSelecionadaId !== cadeia.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.25rem', fontSize: '1.1rem' }}>
                        Origem: {cadeia.numeroDcompInicial}
                      </div>
                      <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', color: 'var(--color-text-main)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span className="text-muted">Tipo:</span> <strong>{cadeia.tipoCredito}</strong>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span className="text-muted">PA Crédito:</span> <strong>{cadeia.periodoApuracao}</strong>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                          <div className="status-led status-muted" style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}>{cadeia.dcomps.length} DCOMPs</div>
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Cascata */}
      <div className="card-glass" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, backdropFilter: 'none', WebkitBackdropFilter: 'none' }}>
        {cadeiaSelecionada ? (
          <TimelineCascata cadeia={cadeiaSelecionada} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--color-text-muted)' }}>
            Selecione uma cadeia no menu acima para iniciar a simulação.
          </div>
        )}
      </div>
    </div>
  );
};
