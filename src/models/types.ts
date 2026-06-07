import type { ResultadoAuditavel, FonteNormativa } from '../services/normativo/types';
import type { SelicRastreavelResult } from '../services/normativo/selicService';

export type SituaçãoProcessamento = 
  | 'Análise concluída'
  | 'Análise concluída com direito creditório reconhecido'
  | 'Cancelado'
  | 'Despacho Decisório Emitido'
  | 'Em discussão administrativa – CARF'
  | 'Em discussão administrativa – CSRF'
  | 'Em discussão administrativa – DRJ'
  | 'Homologado'
  | 'Não Admitido'
  | 'Pedido de Cancelamento Deferido'
  | 'PER Deferido'
  | 'Retificado'
  | 'Pendente' // Adicionado genérico para DCOMPs que não estão impedidas
  | string;

export interface DebitoOficial {
  id: string; // Gerado internamente para controle React
  codigoReceita: string; // Ex: 5952-07
  periodoApuracao: string; // Ex: 2024-09-01 00:00:00 ou MM/AAAA
  dataVencimento: string; // DD/MM/AAAA
  valorPrincipal: number;
  valorMulta: number;
  valorJuros: number;
  valorTotal: number;
  // Valores Originais (Vindos da Planilha)
  valorPrincipalOriginal: number;
  valorMultaOriginal: number;
  valorJurosOriginal: number;
  valorTotalOriginal: number;
  // Campos extras mapeados se houver:
  cnpjDebito?: string;
}

export interface MetadadosCreditoImportado {
  dataArrecadacaoCredito?: Date;
  competenciaCredito?: string;
  tipoCompetenciaCredito?: string;
  numeroPagamento?: string;
  periodoApuracaoDarf?: string;
  processoJudicial?: string;
  processoHabilitacao?: string;
  processoAdministrativo?: string;
  dataProtocoloPerOriginal?: Date;
  numeroPerOriginal?: string;
  origemDataProtocoloPerOriginal?: 'importada' | 'resolvida_por_linhagem' | 'informada_usuario';
}

export interface ImportQualityReport {
  linhasProcessamento: number;
  linhasDebitos: number;
  dcompsCarregadas: number;
  cadeiasCarregadas: number;
  debitosCarregados: number;
  documentosIgnorados: Array<{
    numeroPerdcomp: string;
    motivo: 'sem_cadeia_relacional' | 'sem_numero_perdcomp' | 'linha_invalida';
    tipoCredito?: string;
    situacao?: string;
  }>;
}

export interface DCOMP {
  id: string; // Número do PER/DCOMP
  dataTransmissaoOriginal: Date; // A data que vale para cronologia e SELIC
  dataTransmissao: Date; // Data real de transmissão (pode ser retificadora)
  tipoDocumento: string; // Declaração de Compensação, etc.
  situacao: SituaçãoProcessamento;
  indicadorCredito: string; // Se 1 ou 2 etc
  tipoCredito: string;
  detentorCredito: string;
  periodoApuracaoCredito: string;
  
  // Valores da aba "Processamento PERDCOMP"
  valorTotalCreditoDetalhado: number;
  valorTotalCreditoDetalhadoOriginal: number; // Para referenciar quando alterarmos
  valorCreditoDataTransmissao: number; // Trazido da planilha
  valorUtilizadoPerdcomp: number;
  valorUtilizadoPerdcompOriginal: number; // Guardar o valor original do excel
  
  // Relações
  numeroRetificador?: string; // Se preenchido, é um DCOMP Não Vigente (substituído)
  numeroDcompDetalhamento?: string; // Número da PER/DCOMP com Detalhamento de Crédito
  metadadosCreditoImportado?: MetadadosCreditoImportado;
  classificacaoCreditoConsultiva?: CreditoClassificado;
  statusProcessamentoConsultivo?: StatusProcessamentoClassificado;
  isManuallyEdited?: boolean; // Flag para KPI de Retificadas pelo Usuário
  idCadeiaRelacional: string;
  
  // Eixo Débitos
  debitos: DebitoOficial[];

  // Campos Calculados pelo App
  saldoCreditoOriginalCalculado?: number; // Calculado pelo Zustand (Novo Saldo)
  saldoCreditoOriginalAnterior?: number; // Calculado histórico puro sem edições
  isDivergente?: boolean; // Sinaliza divergência matemática
  statusCascata?: 'OK' | 'RETIFICAR' | 'EDITADO' | 'EDITADO_E_RETIFICAR' | 'BLOQUEADO' | 'IMPACTADO_BLOQUEADO'; // Flag dinâmica da simulação
  divergenciaDetalhes?: {
    esperado: number;
    calculado: number;
  };
  resultadoSelic?: ResultadoAuditavel<SelicRastreavelResult>;
}

export interface CadeiaRelacional {
  id: string; // ID da cadeia relacional
  numeroDcompInicial: string;
  tipoCredito: string;
  periodoApuracao: string;
  dcomps: DCOMP[]; // Todas as DCOMPs ordenadas por dataTransmissaoOriginal
}

export interface KpiSnapshot {
  saldoOriginalTotal: number;
  saldoAtualizadoTotal: number;
  economiaProjetada: number;
  lastroOriginalDisponibilizado: number;
  saldoOriginalRestanteAntigo: number;
  saldoOriginalRestanteNovo: number;
}

export interface MetadadosAuditoriaRelatorio {
  versaoMotorCalculo: string;
  statusCalculoGlobal: 'normativo' | 'estimativa_historica' | 'parcial' | 'dados_insuficientes';
  fontesNormativas: FonteNormativa[];
  tabelaSelic?: {
    fonte: string;
    emitidaEm?: string;
    coberturaAte?: string;
  };
  hipoteses: string[];
  dadosAusentes: string[];
}

export interface SimulacaoSalva {
  id: string;
  dataSalvamento: Date;
  cadeiaId: string;
  numeroDcompInicial: string;
  tipoCredito: string;
  kpis: KpiSnapshot;
  dcomps: DCOMP[];
  metadadosAuditoria?: MetadadosAuditoriaRelatorio;
}

export interface Empresa {
  cnpj: string;
  razaoSocial: string;
}

export interface SimulacaoState {
  empresa: Empresa | null;
  cadeias: Record<string, CadeiaRelacional>; // Map de cadeias por ID
  cadeiaSelecionadaId: string | null;
  simulacoesSalvas: SimulacaoSalva[];
  importQualityReport: ImportQualityReport | null;
  
  // Actions
  importarDados: (cadeias: CadeiaRelacional[], empresa: Empresa, isRecalculated?: boolean, importQualityReport?: ImportQualityReport) => void;
  selecionarCadeia: (id: string) => void;
  atualizarDebitos: (dcompId: string, novosDebitos: DebitoOficial[]) => void;
  editarCreditoOriginal: (cadeiaId: string, novoValor: number) => void;
  adicionarDcompHipotetica: (cadeiaId: string, debitosSimulados: Array<{codigoReceita: string, periodoApuracao: string, dataVencimento: string, principal: number, multa: number, juros: number}>, dataTransmissao: Date) => void;
  removerDcompHipotetica: (cadeiaId: string, dcompId: string) => void;
  recalcularCadeia: (cadeiaId: string) => void;
  limparDados: () => void;
  salvarSimulacaoCadeia: (cadeiaId: string, kpis: KpiSnapshot, metadadosAuditoria?: MetadadosAuditoriaRelatorio) => void;
  limparSimulacoesSalvas: () => void;
}
import type { CreditoClassificado } from '../services/normativo/creditRules';
import type { StatusProcessamentoClassificado } from '../services/normativo/statusRules';
