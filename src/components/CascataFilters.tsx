import React from 'react';

interface CascataFiltersProps {
  filtroBusca: string;
  setFiltroBusca: (val: string) => void;
  filtroStatus: string;
  setFiltroStatus: (val: string) => void;
  apenasDetalhadores: boolean;
  setApenasDetalhadores: (val: boolean) => void;
  onSalvarSimulacao: () => void;
}

export const CascataFilters: React.FC<CascataFiltersProps> = ({
  filtroBusca,
  setFiltroBusca,
  filtroStatus,
  setFiltroStatus,
  apenasDetalhadores,
  setApenasDetalhadores,
  onSalvarSimulacao
}) => {
  return (
    <div style={{ paddingBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
      <input 
        type="text" 
        placeholder="Buscar PER/DCOMP..." 
        className="input-field" 
        style={{ width: '250px' }}
        value={filtroBusca}
        onChange={e => setFiltroBusca(e.target.value)}
        aria-label="Buscar PER/DCOMP por número"
      />
      <select 
        className="input-field" 
        style={{ width: '250px' }}
        value={filtroStatus}
        onChange={e => setFiltroStatus(e.target.value)}
        aria-label="Filtrar por Status"
      >
        <option value="ALL">Todos os Status</option>
        <option value="VIGENTES_EDITAVEIS">Apenas Vigentes e Editáveis</option>
        <option value="OK">OK</option>
        <option value="RETIFICAR">A Retificar</option>
        <option value="IMPEDIDO">Impedido</option>
      </select>
      
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text)', cursor: 'pointer', userSelect: 'none' }}>
        <input 
          type="checkbox" 
          checked={apenasDetalhadores}
          onChange={e => setApenasDetalhadores(e.target.checked)}
          style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
        />
        <span>Mostrar apenas detalhadores</span>
      </label>

      <div style={{ marginLeft: 'auto' }}>
        <button 
          className="btn btn-primary" 
          style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}
          onClick={onSalvarSimulacao}
          aria-label="Salvar Simulação da Cadeia"
        >
          💾 Salvar Simulação da Cadeia
        </button>
      </div>
    </div>
  );
};
