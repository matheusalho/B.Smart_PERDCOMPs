import type { CadeiaRelacional } from '../models/types';
import selicData from '../selic.json';
import { isVigente, isBloqueado } from '../utils/statusHelper';
import { calcularSelicRastreavel } from './normativo/selicService';
import { obterTaxaSelicAcumulada } from './normativo/selicProvider';

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
  
  // A DCOMP Raiz Histórica (Apenas para fallback e replicação em tipos restritos)
  const primeiraDcompVigente = dcompsOrdenadas.find(d => isVigente(d.situacao, d.tipoDocumento, d.id));
  const valorCreditoDetalhadoRaiz = primeiraDcompVigente ? primeiraDcompVigente.valorTotalCreditoDetalhado : 0;

  // LÓGICA REVISADA: "Soma dos Detalhadores (Pool Global)"
  // Uma DCOMP é Detalhadora se sua coluna `numeroDcompDetalhamento` estiver vazia ou for igual ao seu próprio ID
  // e se ela for Vigente. Adicionalmente, DCOMPs puras (Decl. Compensação) não são detalhadoras a menos que sejam a raiz.
  let saldoOriginalDisponivel = 0;
  
  for (const dcomp of dcompsOrdenadas) {
    if (isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id)) {
      const isDetalhador = (!dcomp.numeroDcompDetalhamento || dcomp.numeroDcompDetalhamento === dcomp.id);
      
      if (isDetalhador) {
        // Usamos o valorOriginal se existir, ou o atual, para compor o Pool
        saldoOriginalDisponivel += (dcomp.valorTotalCreditoDetalhadoOriginal || dcomp.valorTotalCreditoDetalhado);
      }
    }
  }

  // Fallback de segurança: se não houver nenhum "Detalhador" Vigente na cadeia,
  // ou se o saldo computado for 0 (anomalia), adotamos o maior crédito vigente ou o primeiro.
  if (saldoOriginalDisponivel === 0) {
    let maiorCreditoVigente = 0;
    for (const dcomp of dcompsOrdenadas) {
      if (isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id)) {
        if (dcomp.valorTotalCreditoDetalhado > maiorCreditoVigente) {
          maiorCreditoVigente = dcomp.valorTotalCreditoDetalhado;
        }
      }
    }
    saldoOriginalDisponivel = maiorCreditoVigente > 0 
      ? maiorCreditoVigente 
      : (dcompsOrdenadas.length > 0 ? dcompsOrdenadas[0].valorTotalCreditoDetalhado : 0);
  }

  // REPLICAÇÃO DO VALOR DO CRÉDITO PARA A UI (FALLBACK RESTRITO)
  // Verificamos se o tipo de crédito permite múltiplos detalhamentos independentes
  const tipoCreditoLimpo = (cadeia.tipoCredito || '').toLowerCase();
  const permiteMultiplosDetalhamentos = 
    tipoCreditoLimpo.includes('pagamento indevido ou a maior esocial') ||
    tipoCreditoLimpo.includes('contribuição previdenciária indevida ou a maior');

  // Se NÃO permite múltiplos detalhamentos (ex: Saldo Negativo), replicamos o valor da Raiz 
  // para todas as DCOMPs subsequentes a fim de evitar distorções visuais.
  if (!permiteMultiplosDetalhamentos && primeiraDcompVigente) {
    let passedPrimeira = false;
    for (const dcomp of dcompsOrdenadas) {
      if (dcomp.id === primeiraDcompVigente.id) {
        passedPrimeira = true;
      } else if (passedPrimeira) {
        dcomp.valorTotalCreditoDetalhado = valorCreditoDetalhadoRaiz;
      }
    }
  }

  // Também manteremos um tracking do saldo estritamente histórico (sem nossas simulações)
  let saldoAntigoDisponivel = saldoOriginalDisponivel;

  for (let i = 0; i < dcompsOrdenadas.length; i++) {
    const dcomp = dcompsOrdenadas[i];
    const vigente = isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
    
    // Calcula o total dos débitos informados (Valor Atualizado nesta DCOMP real)
    const valorUtilizadoReal = dcomp.debitos.reduce((acc, debito) => acc + debito.valorTotal, 0);
    
    if (dcomp.indicadorCredito === 'Hipotético') {
      const lastRealDcomp = dcompsOrdenadas.slice().reverse().find(d => d.indicadorCredito !== 'Hipotético');
      let selicMultiplier = 1;
      
      if (lastRealDcomp) {
        // O Fator Selic da última DCOMP é a proporção entre os Débitos Atualizados e o Crédito Original Consumido
        const totalDebitosReal = lastRealDcomp.debitos.reduce((acc, deb) => acc + deb.valorTotalOriginal, 0);
        const originalConsumidoReal = lastRealDcomp.valorUtilizadoPerdcompOriginal;
        
        const mLast = (totalDebitosReal > 0 && originalConsumidoReal > 0) ? (totalDebitosReal / originalConsumidoReal) : 1;
        
        const dataTransmStr = lastRealDcomp.dataTransmissao;
        const dt = new Date(dataTransmStr);
        const anoLast = dt.getFullYear().toString();
        const mesLast = MESES[dt.getMonth()];
        const selicExtra = getSelicMensal(anoLast, mesLast);
        
        selicMultiplier = mLast + selicExtra;
      }
      
      dcomp.valorUtilizadoPerdcomp = valorUtilizadoReal / selicMultiplier;
      
      // O Crédito na Data de Transmissão é literalmente o saldo original transferido da DCOMP anterior
      dcomp.valorCreditoDataTransmissao = saldoOriginalDisponivel;
      
    } else {
      const totalDebitosOriginal = dcomp.debitos.reduce((acc, debito) => acc + debito.valorTotalOriginal, 0);
      const fatorHistorico = (totalDebitosOriginal > 0 && dcomp.valorUtilizadoPerdcompOriginal > 0) 
        ? (totalDebitosOriginal / dcomp.valorUtilizadoPerdcompOriginal) 
        : 1;

      // Integração Normativa: tenta calcular a SELIC rastreável
      const resultadoSelic = calcularSelicRastreavel({
        dcomp,
        totalDebitosDocumento: valorUtilizadoReal,
        taxaSelicProvider: obterTaxaSelicAcumulada,
        fatorHistorico,
      });

      dcomp.resultadoSelic = resultadoSelic;

      if (dcomp.isManuallyEdited) {
        if (resultadoSelic.statusCalculo === 'normativo' && resultadoSelic.valor) {
          dcomp.valorUtilizadoPerdcomp = resultadoSelic.valor.creditoOriginalUtilizadoCalculado;
        } else {
          // Fallback para aproximação histórica
          dcomp.valorUtilizadoPerdcomp = valorUtilizadoReal / fatorHistorico;
        }
      } else {
        // Se não foi editado, SEMPRE mantém o valor histórico exato da RFB
        dcomp.valorUtilizadoPerdcomp = dcomp.valorUtilizadoPerdcompOriginal;
      }
    }

    // Se for vigente, o valor consumido ABATE DO SALDO ORIGINAL.
    // Correção eSocial: Pedido Restituição puro não consome saldo diretamente, ele apenas espelha a soma dos DCOMPs. 
    // Subtrair aqui causaria dupla contagem.
    const isPurePER = (dcomp.tipoDocumento === 'Pedido Restituição' || dcomp.tipoDocumento === 'Pedido de Restituição') && (!dcomp.debitos || dcomp.debitos.length === 0);
    const effectiveUtilizado = isPurePER ? 0 : dcomp.valorUtilizadoPerdcomp;
    const effectiveUtilizadoOriginal = isPurePER ? 0 : dcomp.valorUtilizadoPerdcompOriginal;

    const novoSaldo = vigente ? (saldoOriginalDisponivel - effectiveUtilizado) : saldoOriginalDisponivel;
    dcomp.saldoCreditoOriginalCalculado = novoSaldo;

    const saldoAntigo = vigente ? (saldoAntigoDisponivel - effectiveUtilizadoOriginal) : saldoAntigoDisponivel;
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
        // Ignoramos a divergência para as DCOMPs Hipotéticas, pois elas não têm um saldoEntradaOriginal válido do Excel.
        if (dcomp.indicadorCredito !== 'Hipotético' && Math.abs(saldoEntradaCalculado - saldoEntradaOriginal) > 0.05) {
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
