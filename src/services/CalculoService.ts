import type { CadeiaRelacional, DCOMP } from '../models/types';
import selicData from '../selic.json';
import { isVigente, isBloqueado } from '../utils/statusHelper';

const getSelicMensal = (ano: string, mes: string): number => {
  const data = (selicData as Record<string, Record<string, number>>);
  if (data[ano] && data[ano][mes] !== undefined) {
    return data[ano][mes] / 100.0; // Converter 100,00 para 1.0000
  }
  return 0; // Fallback se não encontrar
};

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/**
 * Calcula a Taxa Selic Acumulada.
 * Marco Inicial genérico (aplicado aos créditos que seguem atualização padrão, ex: Ação Judicial, Saldo Negativo):
 * "Corresponde à taxa Selic acumulada desde o mês seguinte ao final do período de apuração do crédito, 
 * até o mês anterior à data de entrega da declaração de compensação, mais 1% referente ao mês corrente."
 * 
 * NOTA: Para Saldo Negativo, os manuais especificam isso. Para o MVP, adotaremos a Selic acumulada
 * puxando diretamente da tabela que já dá a "taxa acumulada" no mês de vencimento até o pagamento.
 * Na verdade, a tabela do SICALC já traz a Selic Acumulada da data de incidência até hoje.
 * Se a DCOMP foi entregue na dataTransmissaoOriginal, e a competência de início é dataInicioSelic,
 * usamos: taxa da dataInicioSelic - taxa da dataTransmissaoOriginal (+ 1% em alguns casos).
 * 
 * Por simplicidade para o MVP (já que abstraímos parcialmente), usaremos a tabela de Selic Acumulada
 * diretamente baseando-se no mês inicial de incidência, subtraindo a taxa acumulada do mês de transmissão.
 */
export const calcularSelicAcumulada = (dataInicioIncidencia: Date, dataTransmissaoOriginal: Date): number => {
  // O mês inicial de incidência (ex: janeiro do ano seguinte para Saldo Negativo Anual)
  const mesInicio = dataInicioIncidencia.getMonth();
  const anoInicio = dataInicioIncidencia.getFullYear().toString();
  const mesInicioStr = MESES[mesInicio];

  const taxaAcumuladaInicio = getSelicMensal(anoInicio, mesInicioStr);

  const mesTransmissao = dataTransmissaoOriginal.getMonth();
  const anoTransmissao = dataTransmissaoOriginal.getFullYear().toString();
  const mesTransmissaoStr = MESES[mesTransmissao];

  const taxaAcumuladaTransmissao = getSelicMensal(anoTransmissao, mesTransmissaoStr);

  // A taxa a ser aplicada é a Selic acumulada do início até hoje. 
  // A tabela do BCB (SICALC) costuma mostrar a taxa acumulada da data base ATÉ A DATA DE EMISSÃO DA TABELA.
  // Portanto: TaxaAplicavel = Taxa(Inicio) - Taxa(Transmissao)
  // + 0.01 (1% do mês de transmissão, conforme regra "mais 1% referente ao mês corrente").
  // Vamos simplificar para:
  let taxa = taxaAcumuladaInicio - taxaAcumuladaTransmissao;
  if (taxa < 0) taxa = 0;
  
  // Se forem do mesmo mês/ano, a tabela pode dar 0 ou negativo. A regra diz:
  // "Se a declaração de compensação original for apresentada no mesmo mês em que for finalizado o 
  // período de apuração, não é cabível a atualização do crédito."
  if (anoInicio === anoTransmissao && mesInicio === mesTransmissao) {
    return 0;
  }

  // + 1% referente ao mês corrente.
  return taxa + 0.01;
};

/**
 * Função para atualizar o valor do crédito pela Selic
 */
export const aplicarAtualizacaoSelic = (valorOriginal: number, taxaDecimal: number): number => {
  return valorOriginal * (1 + taxaDecimal);
};

export const IMPEDIMENTOS = [
  'Análise concluída',
  'Cancelado',
  'Despacho Decisório Emitido',
  'Em discussão administrativa – CARF',
  'Em discussão administrativa – CSRF',
  'Em discussão administrativa – DRJ',
  'Homologado',
  'Não Admitido',
  'Pedido de Cancelamento Deferido',
  'PER Deferido',
  'Retificado'
];

export const isImpedido = (situacao: string): boolean => {
  return IMPEDIMENTOS.includes(situacao);
};

/**
 * Recalcula toda a cadeia baseando-se na ordem das "Data de Transmissão de Referência".
 * (DCOMPs Originais determinam a cronologia).
 */
export const recalcularCadeia = (cadeia: CadeiaRelacional): CadeiaRelacional => {
  // A cadeia já vem ordenada corretamente por Linhagens pelo ExcelParser
  // Não podemos reordenar puramente por data aqui, senão quebramos os blocos de retificação
  const dcompsOrdenadas = [...cadeia.dcomps];
  
  let primeiraDcompVigente = dcompsOrdenadas.find(d => isVigente(d.situacao));
  let valorCreditoDetalhadoRaiz = primeiraDcompVigente ? primeiraDcompVigente.valorTotalCreditoDetalhado : 0;

  // O Saldo Inicial a ser exibido na KPI deverá ser o maior valor que existir na 
  // coluna "Valor Total do Crédito Detalhado" dentre as PER/DCOMPs Vigentes da cadeia.
  let maiorCreditoVigente = 0;
  for (const dcomp of dcompsOrdenadas) {
    if (isVigente(dcomp.situacao)) {
      if (dcomp.valorTotalCreditoDetalhado > maiorCreditoVigente) {
        maiorCreditoVigente = dcomp.valorTotalCreditoDetalhado;
      }
    }
  }

  // Replica o valor do Crédito Detalhado da 1ª Vigente para as subsequentes
  if (primeiraDcompVigente) {
    let passedPrimeira = false;
    for (const dcomp of dcompsOrdenadas) {
      if (dcomp.id === primeiraDcompVigente.id) {
        passedPrimeira = true;
      } else if (passedPrimeira) {
        dcomp.valorTotalCreditoDetalhado = valorCreditoDetalhadoRaiz;
      }
    }
  }

  // Se não houver nenhum vigente ou valor for 0, cai num fallback básico do primeiro
  let saldoOriginalDisponivel = maiorCreditoVigente > 0 
    ? maiorCreditoVigente 
    : (dcompsOrdenadas.length > 0 ? dcompsOrdenadas[0].valorTotalCreditoDetalhado : 0);

  // Também manteremos um tracking do saldo estritamente histórico (sem nossas simulações)
  let saldoAntigoDisponivel = saldoOriginalDisponivel;

  for (let i = 0; i < dcompsOrdenadas.length; i++) {
    const dcomp = dcompsOrdenadas[i];
    const vigente = isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
    
    // Calcula o total dos débitos informados (Valor Atualizado nesta DCOMP real)
    const valorUtilizadoReal = dcomp.debitos.reduce((acc, debito) => acc + debito.valorTotal, 0);
    
    if (dcomp.isManuallyEdited) {
      // Se o usuário editou os débitos, precisamos descobrir o novo "Crédito Original Utilizado"
      // Fator SELIC = Soma dos Débitos Originais / Crédito Original Utilizado Histórico
      const totalDebitosOriginal = dcomp.debitos.reduce((acc, debito) => acc + debito.valorTotalOriginal, 0);
      const fatorSelic = (totalDebitosOriginal > 0 && dcomp.valorUtilizadoPerdcompOriginal > 0) 
        ? (totalDebitosOriginal / dcomp.valorUtilizadoPerdcompOriginal) 
        : 1;
      
      // O novo valor original utilizado é a nova soma atualizada dos débitos descapitalizada pelo fator SELIC
      dcomp.valorUtilizadoPerdcomp = valorUtilizadoReal / fatorSelic;
    } else {
      // Se não foi editado, o valor histórico permanece intacto
      dcomp.valorUtilizadoPerdcomp = dcomp.valorUtilizadoPerdcompOriginal;
    }

    // Se for vigente, o valor consumido ABATE DO SALDO ORIGINAL.
    const novoSaldo = vigente ? (saldoOriginalDisponivel - dcomp.valorUtilizadoPerdcomp) : saldoOriginalDisponivel;
    dcomp.saldoCreditoOriginalCalculado = novoSaldo;

    const saldoAntigo = vigente ? (saldoAntigoDisponivel - dcomp.valorUtilizadoPerdcompOriginal) : saldoAntigoDisponivel;
    dcomp.saldoCreditoOriginalAnterior = saldoAntigo;

    if (i === 0) {
      if (dcomp.isManuallyEdited) {
        dcomp.statusCascata = 'EDITADO';
      } else {
        dcomp.statusCascata = 'OK'; 
      }
    } else {
      if (vigente) {
        // O saldo que chegou para essa DCOMP (o saldo disponível ANTES de abater o valor atual)
        const saldoEntradaCalculado = saldoOriginalDisponivel;
        const saldoEntradaOriginal = dcomp.valorCreditoDataTransmissao;
        
        // Se houver divergência maior que 5 centavos entre o que o Excel disse que entrava e o que nossa conta diz
        // que deveria entrar, significa que houve quebra na cadeia (sobra ou falta de crédito).
        if (Math.abs(saldoEntradaCalculado - saldoEntradaOriginal) > 0.05) {
           const bloqueado = isBloqueado(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
           if (bloqueado) {
              dcomp.statusCascata = 'IMPACTADO_BLOQUEADO';
           } else if (dcomp.isManuallyEdited) {
              dcomp.statusCascata = 'EDITADO_E_RETIFICAR';
           } else {
              dcomp.statusCascata = 'RETIFICAR';
           }
           dcomp.divergenciaDetalhes = {
             esperado: saldoEntradaOriginal,
             calculado: saldoEntradaCalculado
           };
        } else {
           dcomp.divergenciaDetalhes = undefined;
           if (dcomp.isManuallyEdited) {
             dcomp.statusCascata = 'EDITADO';
           } else {
             dcomp.statusCascata = 'OK';
           }
        }
      } else {
        // Declarações não-vigentes não sofrem quebra de cascata ativa, ignoramos a divergência
        dcomp.statusCascata = 'OK';
        dcomp.divergenciaDetalhes = undefined;
      }
    }
    
    dcomp.isDivergente = false; // Desativando essa logica antiga de divergencia detalhada por enquanto.
    
    // Atualiza os saldos para o próximo passo no loop
    saldoOriginalDisponivel = novoSaldo;
    saldoAntigoDisponivel = saldoAntigo;
  }

  return {
    ...cadeia,
    dcomps: dcompsOrdenadas
  };
};
