import React, { useState, useEffect } from 'react';
import { Joyride } from 'react-joyride';
import type { Step } from 'react-joyride';
import { useStore } from '../store';
import { PlayCircle } from 'lucide-react';

const STEPS_SEM_DADOS: Step[] = [
  {
    target: 'body',
    content: 'Bem-vindo ao Balera PER/DCOMP Simulator! Este tour vai te mostrar como simular sua cascata de compensações.',
    placement: 'center',
  },
  {
    target: '.upload-area',
    content: 'Você começa subindo sua planilha do e-CAC ou clicando no botão de "Carregar Dados de Exemplo (Mock)" abaixo.',
  }
];

const STEPS_COM_DADOS: Step[] = [
  {
    target: '.tour-global-kpi',
    content: 'Visão Executiva: Este é o seu painel de comando global. Aqui você tem um raio-X instantâneo de todas as cadeias, inconsistências e economias projetadas da sua empresa.',
  },
  {
    target: '.tour-custom-dropdown',
    content: 'Seleção de Cadeia: Use este menu para escolher uma cadeia relacional específica e isolá-la para simulação. Você pode buscar por Origem, Tipo ou PA.',
  },
  {
    target: '.tour-cadeia-kpi',
    content: 'Métricas da Cascata (KPIs Locais): Aqui acompanhamos a matemática de perto: o Saldo Inicial da Origem, o valor atualizado das reduções e as economias na ponta do lápis.',
  },
  {
    target: '#tour-target-table',
    content: 'Análise Detalhada: A Tabela de Cascata mostra linha a linha o uso de cada crédito. Você pode editar os valores na coluna de "Crédito Utilizado" diretamente na tabela para testar novos cenários!',
  },
  {
    target: '#tour-target-hipotetica',
    content: 'Simulação Hipotética: Precisa testar o impacto de um novo crédito na cadeia? Adicione uma DCOMP Hipotética e veja a mágica do reprocessamento automático acontecer.',
  },
  {
    target: '.tour-nova-simulacao',
    content: 'Quer testar outra planilha? Basta clicar em Nova Simulação. Lembre-se, enquanto não limpar a memória, suas edições ficam salvas em cache local para exportação em PDF!',
  }
];

export const OnboardingTutorial: React.FC = () => {
  const [run, setRun] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const temDados = useStore(state => Object.keys(state.cadeias).length > 0);
  const cadeias = useStore(state => state.cadeias);
  const cadeiaSelecionadaId = useStore(state => state.cadeiaSelecionadaId);
  const selecionarCadeia = useStore(state => state.selecionarCadeia);

  const steps = temDados ? STEPS_COM_DADOS : STEPS_SEM_DADOS;

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;

    if (['finished', 'skipped'].includes(status)) {
      setRun(false);
    }
  };

  useEffect(() => {
    if (run && temDados && !cadeiaSelecionadaId) {
      const ids = Object.keys(cadeias);
      if (ids.length > 0) {
        selecionarCadeia(ids[0]);
      }
    }
  }, [run, temDados, cadeiaSelecionadaId, cadeias, selecionarCadeia]);

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '0.5rem' }}>
      <button 
        className="btn btn-outline" 
        onClick={() => {
          setTourKey(prev => prev + 1);
          setRun(true);
        }}
      >
        <PlayCircle size={18} />
        {!temDados ? 'Como Funciona?' : 'Tour Guiado'}
      </button>

      <Joyride
        key={tourKey}
        steps={steps}
        run={run}
        continuous={true}
        disableScrolling={false}
        scrollOffset={150}
        {...({ showProgress: true, showSkipButton: true } as any)}
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#00b3ff',
            backgroundColor: 'var(--color-bg)',
            textColor: 'var(--color-text-main)',
            arrowColor: 'var(--color-bg)'
          },
          beaconInner: {
            backgroundColor: '#00b3ff',
          },
          beaconOuter: {
            backgroundColor: 'rgba(0, 179, 255, 0.3)',
            borderColor: 'rgba(0, 179, 255, 0.5)',
          }
        } as any}
      />
    </div>
  );
};
