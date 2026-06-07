export type FonteNormativa = {
  arquivo?: string;
  ato?: string;
  artigo?: string;
  paginaOuSecao?: string;
  resumo: string;
};

export type OrigemValor =
  | 'importado_rfb'
  | 'calculado_motor'
  | 'simulado_usuario'
  | 'replicado_credito_raiz'
  | 'fallback_operacional'
  | 'exibido_formatado';

export type StatusCalculo =
  | 'normativo'
  | 'estimativa_historica'
  | 'dados_insuficientes'
  | 'vedado'
  | 'fora_de_escopo'
  | 'tipo_nao_classificado';

export type ResultadoAuditavel<T> = {
  statusCalculo: StatusCalculo;
  valor?: T;
  metodo: string;
  origemValor: OrigemValor;
  fontesNormativas: FonteNormativa[];
  dadosUsados: string[];
  dadosAusentes: string[];
  hipoteses: string[];
  alertas: string[];
};
