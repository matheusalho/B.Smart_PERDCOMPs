import selicMensal from '../../selicMensal.json';

/**
 * Retorna a taxa SELIC mensal correspondente a um ano e mês.
 * Caso o dado não exista na tabela, retorna undefined.
 * @param anoMes String no formato 'YYYY-MM'
 */
export function obterTaxaSelicMensal(anoMes: string): number | undefined {
  const [ano, mesStr] = anoMes.split('-');
  
  const taxasPorAno = (selicMensal as Record<string, Record<string, number>>)[ano];
  if (!taxasPorAno) {
    return undefined;
  }

  const taxaMensalPercentual = taxasPorAno[mesStr];
  if (taxaMensalPercentual === undefined) {
    return undefined;
  }

  // Convertendo de percentual (ex: 1.15) para decimal (ex: 0.0115)
  return taxaMensalPercentual / 100.0;
}

/**
 * Calcula a taxa SELIC Acumulada para um período normativo.
 * A regra da Receita Federal define que a taxa SELIC acumulada é a soma
 * das taxas mensais do termo inicial até o termo final, acrescida de 1% (0.01)
 * referente ao mês de entrega/transmissão.
 *
 * @param termoInicialMes Termo inicial (inclusivo) no formato YYYY-MM
 * @param termoFinalMes Termo final (inclusivo) no formato YYYY-MM
 * @returns A taxa acumulada decimal, ou undefined se faltar alguma taxa na tabela.
 */
export function obterTaxaSelicAcumulada(
  termoInicialMes: string,
  termoFinalMes: string,
): number | undefined {
  let somaDecimal = 0.0;

  const atual = new Date(`${termoInicialMes}-02T00:00:00Z`); // Usa dia 02 para evitar fuso horário
  const final = new Date(`${termoFinalMes}-02T00:00:00Z`);

  // Se o termo inicial é posterior ao final, a tabela do SICALC indica que a taxa aplicável 
  // para o intervalo é ZERO. Nesse caso, a atualização de juros nem acontece no meio tempo,
  // mas vamos somar 1% do mês corrente mesmo assim?
  // O manual afirma: "Se a declaração de compensação original for apresentada no mesmo mês
  // em que for finalizado o período de apuração, não é cabível a atualização do crédito".
  // Nesses casos o termoInicialMes gerado pelo motor pode até cruzar o termoFinalMes.
  // Devolvemos 0 direto, já que a DCOMP foi apresentada no mesmo mês ou no mês anterior (sem acúmulo).
  if (atual > final) {
    return 0.0;
  }

  while (atual <= final) {
    const ano = atual.getUTCFullYear().toString();
    const mes = (atual.getUTCMonth() + 1).toString().padStart(2, '0');
    const anoMes = `${ano}-${mes}`;

    const taxa = obterTaxaSelicMensal(anoMes);
    if (taxa === undefined) {
      return undefined; // Não podemos calcular se falta alguma taxa no meio
    }

    somaDecimal += taxa;

    // Avança 1 mês
    atual.setUTCMonth(atual.getUTCMonth() + 1);
  }

  // Acréscimo de 1% referente ao mês corrente (o mês da entrega)
  return somaDecimal + 0.01;
}
