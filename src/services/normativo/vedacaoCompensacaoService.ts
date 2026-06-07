import type { DCOMP, DebitoOficial } from '../../models/types';
import type { FonteNormativa } from './types';

export interface VedacaoAlerta {
  codigo: string;
  mensagem: string;
  fontes: FonteNormativa[];
}

export function verificarVedacaoCredito(dcomp: Pick<DCOMP, 'tipoCredito'>): VedacaoAlerta[] {
  const alertas: VedacaoAlerta[] = [];
  const tipoCreditoStr = (dcomp.tipoCredito || '').toLowerCase();

  // VED-CRED-JUD-SEM-TJ
  if (tipoCreditoStr.includes('judicial')) {
    alertas.push({
      codigo: 'VED-CRED-JUD-SEM-TJ',
      mensagem: 'Crédito judicial requer trânsito em julgado e habilitação prévia (art. 170-A CTN). Compensação acima do limite mensal da Lei 9.430/1996, art. 74-A, é vedada.',
      fontes: [
        {
          resumo: 'Lei nº 9.430/1996, art. 74-A e CTN, art. 170-A',
        }
      ]
    });
  }

  // VED-CRED-SALARIO
  if (tipoCreditoStr.includes('salário-família') || tipoCreditoStr.includes('salário-maternidade') || tipoCreditoStr.includes('salario-familia') || tipoCreditoStr.includes('salario-maternidade')) {
    alertas.push({
      codigo: 'VED-CRED-SALARIO',
      mensagem: 'Salário-família e salário-maternidade admitem reembolso, mas são vedados em DCOMP administrativa padrão.',
      fontes: [
        {
          resumo: 'Vedação por não configurar indébito tributário compensável no rito comum de PER/DCOMP.'
        }
      ]
    });
  }

  // VED-CRED-SIMPLES
  if (tipoCreditoStr.includes('simples nacional')) {
    alertas.push({
      codigo: 'VED-CRED-SIMPLES',
      mensagem: 'Crédito do Simples Nacional é tratado no Portal do Simples Nacional, não em PER/DCOMP comum.',
      fontes: [
        {
          resumo: 'Normas do Simples Nacional / IN RFB nº 2.055/2021.'
        }
      ]
    });
  }

  return alertas;
}

export function verificarVedacaoDebito(
  debito: Pick<DebitoOficial, 'codigoReceita' | 'dataVencimento'>,
  dataDcomp?: Date,
): VedacaoAlerta[] {
  const alertas: VedacaoAlerta[] = [];
  const codReceita = debito.codigoReceita.replace(/[^0-9]/g, '');

  // VED-DEB-ESTIMATIVA
  const estimativasIRPJCSLL = ['2362', '5993', '2319', '2484', '2469'];
  if (estimativasIRPJCSLL.includes(codReceita)) {
    // Apenas estimativas compensadas após 30/05/2018. 
    // Como nem sempre temos a data exata da entrega, disparamos o alerta baseado na data da DCOMP (ou vencimento).
    const dataRef = dataDcomp || (debito.dataVencimento ? new Date(debito.dataVencimento.split('/').reverse().join('-')) : new Date());
    if (dataRef.getFullYear() >= 2018) {
      alertas.push({
        codigo: 'VED-DEB-ESTIMATIVA',
        mensagem: `O código de receita ${debito.codigoReceita} refere-se a estimativa mensal IRPJ/CSLL, cuja compensação é vedada para declarações após 30/05/2018.`,
        fontes: [
          {
            resumo: 'Lei nº 9.430/1996, art. 74, § 3º, inciso IX (incluído pela Lei nº 13.670/2018).'
          }
        ]
      });
    }
  }

  // VED-DCTFWEB-CRUZADA
  // Qualquer débito pode cair nisso, lançaremos um alerta genérico apenas se for contribuição previdenciária (ex: 1082, 1099, etc) 
  // e dependendo do porte, mas seguindo a diretriz vamos soltar um aviso geral de cruzamento:
  const previdenciariosPattern = /^(1082|1099|1138|1646|1652)/; // Lista ilustrativa
  if (previdenciariosPattern.test(codReceita)) {
    alertas.push({
      codigo: 'VED-DCTFWEB-CRUZADA',
      mensagem: 'Atenção: Pode haver vedação cruzada para débitos previdenciários dependendo da data de obrigatoriedade da DCTFWeb da empresa.',
      fontes: [
        {
          resumo: 'Vedação cruzada e-Social / DCTFWeb (IN RFB nº 2.055/2021).'
        }
      ]
    });
  }

  return alertas;
}
