import React, { useState, useEffect } from 'react';
import { Joyride } from 'react-joyride';
import type { Step } from 'react-joyride';
import { useStore } from '../store';
import { PlayCircle } from 'lucide-react';

export const OnboardingTutorial: React.FC = () => {
  const [run, setRun] = useState(false);
  const temDados = useStore(state => Object.keys(state.cadeias).length > 0);

  const stepsSemDados: Step[] = [
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

  const stepsComDados: Step[] = [
    {
      target: '.sidebar-cadeias',
      content: 'Cadeias de Crédito: O sistema agrupa a cascata lendo a aba "Processamento PERDCOMP", coluna "IDs da Cadeia Relacional". Aqui você seleciona o Crédito Original raiz que deseja auditar e simular.',
    },
    {
      target: '.kpi-panel',
      content: 'KPIs (Fórmulas): O "Saldo Inicial" vem da aba "Processamento", coluna "Valor Total do Crédito Detalhado" da DCOMP inicial. O "Lastro Original Disponibilizado" é o somatório da coluna "Valor Utilizado no Perdcomp" de todos os documentos da cadeia. O "Saldo Restante" é a subtração simples (Inicial - Lastro Original).',
    },
    {
      target: '.data-table',
      content: 'Lógica da Cascata: Ordenamos as linhas pela "Data Transmissão" (aba Processamento). Para cada linha, o [Crédito Recebido] é sempre igual ao [Saldo Final da DCOMP anterior]. Desse valor, subtraímos o [Débito Compensado (Valor Utilizado no Perdcomp)] para calcular qual saldo será repassado para o documento seguinte.',
    },
    {
      target: '.data-table',
      content: 'Auditoria de Divergência (Flag RETIFICAR): Se, durante a simulação em cascata, o crédito repassado calculado ficar menor do que o crédito que a DCOMP seguinte declarou no Excel original, o sistema dispara a flag vermelha [RETIFICAR], indicando que faltou saldo.',
    },
    {
      target: '.btn-edit-debito',
      content: 'Edição de Débitos: Ao clicar em "Editar", listamos os débitos extraídos da aba "PERDCOMP Débitos". Se você simular uma alteração no "Valor Principal", aplicamos a fórmula: Nova Multa = (Novo Principal / Principal Antigo) * Multa Antiga (o mesmo vale para os juros). Isso mantém a proporcionalidade original sem precisar do SICALC.',
    }
  ];

  const steps = temDados ? stepsComDados : stepsSemDados;

  // Se o usuário carregar os dados enquanto o tutorial de upload estava aberto, podemos auto-iniciar a fase 2
  useEffect(() => {
    if (temDados && run) {
       // Pequeno atraso para a tela renderizar a Dashboard
       setTimeout(() => setRun(true), 500);
    }
  }, [temDados, run]);

  return (
    <div style={{ display: 'inline-block', marginLeft: '0.5rem' }}>
      <button 
        className="btn btn-outline" 
        onClick={() => setRun(true)}
      >
        <PlayCircle size={18} />
        {temDados ? 'Tour Guiado' : 'Como Funciona?'}
      </button>
      
      <Joyride
        steps={steps}
        run={run}
        continuous={true}
      />
    </div>
  );
};
