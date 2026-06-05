import React from 'react';
import { useStore } from '../store';
import type { CadeiaRelacional } from '../models/types';
import { TimelineCascata } from './TimelineCascata';
import { UploadComponent } from './UploadComponent';

export const DashboardCadeias: React.FC = () => {
  const cadeias = useStore(state => state.cadeias);
  const cadeiaSelecionadaId = useStore(state => state.cadeiaSelecionadaId);
  const selecionarCadeia = useStore(state => state.selecionarCadeia);

  const listaCadeias = Object.values(cadeias) as CadeiaRelacional[];
  const cadeiaSelecionada = cadeiaSelecionadaId ? cadeias[cadeiaSelecionadaId] : null;

  if (listaCadeias.length === 0) {
    return (
      <div className="container">
        <UploadComponent />
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Menu Superior - Seleção de Cadeia */}
      <div className="card-glass sidebar-cadeias" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>Cadeias Relacionais</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>Selecione uma Cadeia de PER/DCOMPs para simular suas retificações:</p>
          </div>
          
          <select 
            className="input-field" 
            style={{ width: '100%', cursor: 'pointer', padding: '0.75rem 1rem', fontWeight: 600, maxWidth: '100%' }}
            value={cadeiaSelecionadaId || ''}
            onChange={(e) => selecionarCadeia(e.target.value)}
          >
            <option value="" disabled>-- Selecione uma Cadeia --</option>
            {listaCadeias.map((cadeia: CadeiaRelacional) => (
              <option key={cadeia.id} value={cadeia.id}>
                Origem: {cadeia.numeroDcompInicial} | {cadeia.tipoCredito} | PA: {cadeia.periodoApuracao} ({cadeia.dcomps.length} DCOMPs)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content - Cascata */}
      <div className="card-glass" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1 }}>
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
