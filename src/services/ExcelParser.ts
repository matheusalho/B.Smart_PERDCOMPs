import * as XLSX from 'xlsx';
import type {
  CadeiaRelacional,
  DCOMP,
  DebitoOficial,
  ImportQualityReport,
  MetadadosCreditoImportado,
} from '../models/types';
import { classificarTipoCredito } from './normativo/creditRules';
import { classificarStatusProcessamento } from './normativo/statusRules';

type ExcelRow = Record<string, unknown>;

const firstValue = (...values: unknown[]): unknown => (
  values.find(value => value !== undefined && value !== null && value !== '')
);

const toStringValue = (value: unknown, fallback = ''): string => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
};

const toOptionalString = (value: unknown): string | undefined => {
  const stringValue = toStringValue(value).trim();
  return stringValue || undefined;
};

const toNumberValue = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 0;
  return Number(value);
};

const toOptionalDateValue = (value: unknown): Date | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const date = parseExcelDate(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
};

// Função para converter data do Excel (número serial) para Date do JS
const parseExcelDate = (excelDate: unknown): Date => {
  if (!excelDate) return new Date();
  if (typeof excelDate === 'number') {
    // 25569 é o offset de dias entre 01/01/1900 (Excel) e 01/01/1970 (UNIX)
    // 86400 * 1000 = ms em um dia
    const parsedDate = XLSX.SSF.parse_date_code(excelDate);
    if (parsedDate) {
      return new Date(
        parsedDate.y,
        parsedDate.m - 1,
        parsedDate.d,
        parsedDate.H,
        parsedDate.M,
        Math.floor(parsedDate.S)
      );
    }
  }
  
  if (typeof excelDate === 'string') {
     // Pode estar em string ISO ou outro formato. Tentaremos fazer parse
     // Muitas vezes vem DD/MM/AAAA ou YYYY-MM-DD HH:mm:ss
     const parts = excelDate.split(' ');
     if (parts[0].includes('/')) {
         const dParts = parts[0].split('/');
         if (dParts.length === 3) {
             const [day, month, year] = dParts.map(Number);
             return new Date(year, month - 1, day);
         }
     }
     if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
       const [year, month, day] = parts[0].split('-').map(Number);
       return new Date(year, month - 1, day);
     }
     return new Date(excelDate);
  }
  return new Date();
};

const formatPeriodoExcel = (excelVal: unknown): string => {
  if (excelVal === undefined || excelVal === null || excelVal === '') return '';
  const num = Number(excelVal);
  if (!isNaN(num) && num > 10000) {
    // É um serial de data Excel
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    // Compensar timezone para não voltar 1 dia no Brasil
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return String(excelVal);
};

const formatOptionalPeriodoExcel = (excelVal: unknown): string | undefined => {
  if (excelVal === undefined || excelVal === null || excelVal === '') return undefined;
  const formatted = formatPeriodoExcel(excelVal).trim();

  return formatted || undefined;
};

const buildMetadadosCreditoImportado = (row: ExcelRow): MetadadosCreditoImportado | undefined => {
  const metadados: MetadadosCreditoImportado = {
    dataArrecadacaoCredito: toOptionalDateValue(firstValue(row['Data de Arrecadação'], row['Data de Arrecadacao'])),
    competenciaCredito: toOptionalString(firstValue(row['Competência do Crédito'], row['Competencia do Credito'])),
    tipoCompetenciaCredito: toOptionalString(firstValue(row['Tipo Competência'], row['Tipo Competencia'])),
    numeroPagamento: toOptionalString(firstValue(row['Número do Pagamento - DARF'], row['Numero do Pagamento - DARF'])),
    periodoApuracaoDarf: formatOptionalPeriodoExcel(firstValue(row['Período de Apuração do DARF'], row['Periodo de Apuracao do DARF'])),
    processoJudicial: toOptionalString(row['Processo Judicial']),
    processoHabilitacao: toOptionalString(firstValue(row['Processo de Habilitação'], row['Processo de Habilitacao'])),
    processoAdministrativo: toOptionalString(row['Processo Administrativo']),
    numeroPerOriginal: toOptionalString(firstValue(row['Perdcomp Anterior com Detalhamento de Crédito'], row['Detalhado Perdcomp Anterior'])),
  };

  const metadadosFiltrados = Object.fromEntries(
    Object.entries(metadados).filter(([, value]) => value !== undefined && value !== ''),
  ) as MetadadosCreditoImportado;

  return Object.keys(metadadosFiltrados).length > 0 ? metadadosFiltrados : undefined;
};

export const parseExcelFile = (data: ArrayBuffer): { cadeias: CadeiaRelacional[], empresa: { cnpj: string, razaoSocial: string }, importQualityReport: ImportQualityReport } => {
  const workbook = XLSX.read(data, { 
    type: 'array',
    sheets: ['Processamento PERDCOMP', 'PERDCOMP Débitos'],
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
    cellText: false
  });

  // Pular 3 linhas significa que o header está na linha de índice 3 (4ª linha)
  // SheetJS `range` ou apenas usar `{ range: 3 }` no sheet_to_json
  
  const sheetProcessamento = workbook.Sheets['Processamento PERDCOMP'];
  const sheetDebitos = workbook.Sheets['PERDCOMP Débitos'];

  if (!sheetProcessamento) throw new Error("Aba 'Processamento PERDCOMP' não encontrada. Verifique se importou o 'Relatório de Análise e-CAC' correto gerado pelo Sistema INDEX.");
  if (!sheetDebitos) throw new Error("Aba 'PERDCOMP Débitos' não encontrada. Verifique se importou o 'Relatório de Análise e-CAC' correto gerado pelo Sistema INDEX.");

  // Header na linha 3 (0-indexed)
  const rowsProcessamento = XLSX.utils.sheet_to_json<ExcelRow>(sheetProcessamento, { range: 3 });
  const rowsDebitos = XLSX.utils.sheet_to_json<ExcelRow>(sheetDebitos, { range: 3 });

  if (rowsProcessamento.length === 0) {
     throw new Error("Aba 'Processamento PERDCOMP' está vazia ou as colunas não estão na 4ª linha (linha 4 do Excel). Por favor, utilize o relatório gerado pelo Sistema INDEX sem alterações.");
  }
  
  // Validação Colunas Críticas - Processamento
  const hasColunaDcompProc = rowsProcessamento[0]['Número Perdcomp'] !== undefined || rowsProcessamento[0]['Número do PER/DCOMP'] !== undefined;
  const hasColunaCredito = rowsProcessamento[0]['Valor Total do Crédito Detalhado'] !== undefined || rowsProcessamento[0]['Valor Total do Crédito'] !== undefined;
  
  if (!hasColunaDcompProc) {
     throw new Error("Planilha inválida: Coluna 'Número do PER/DCOMP' ausente na aba de Processamento. Verifique se o relatório é o original do Sistema INDEX.");
  }
  if (!hasColunaCredito) {
     throw new Error("Planilha inválida: Coluna 'Valor Total do Crédito Detalhado' ausente na aba de Processamento.");
  }

  if (rowsDebitos.length > 0) {
    const hasColunaDcompDeb = rowsDebitos[0]['Número do PER/DCOMP'] !== undefined;
    const hasColunaReceita = rowsDebitos[0]['Código de Receita'] !== undefined;
    const hasColunaTotal = rowsDebitos[0]['Valor Total'] !== undefined;

    if (!hasColunaDcompDeb || !hasColunaReceita || !hasColunaTotal) {
       throw new Error("Planilha inválida: Colunas essenciais ausentes na aba 'PERDCOMP Débitos' (Ex: 'Número do PER/DCOMP', 'Código de Receita' ou 'Valor Total').");
    }
  }

  // Agrupar Débitos por "ID da Cadeia Relacional" E "Número do PER/DCOMP" (ou "Nº do Recibo PER/DCOMP")
  // A aba de débito tem: "Nº do Recibo PER/DCOMP" ou "Número do PER/DCOMP"?
  // A coluna real encontrada no debug: "Número do PER/DCOMP"
  const debitosPorDcomp: Record<string, DebitoOficial[]> = {};
  
  rowsDebitos.forEach((row, index) => {
    const numeroDcomp = toStringValue(row['Número do PER/DCOMP']);
    if (!numeroDcomp) return;

    if (!debitosPorDcomp[numeroDcomp]) {
      debitosPorDcomp[numeroDcomp] = [];
    }

    debitosPorDcomp[numeroDcomp].push({
      id: `deb_${index}`,
      codigoReceita: toStringValue(row['Código de Receita']),
      periodoApuracao: formatPeriodoExcel(row['Período de Apuração do Débito']),
      dataVencimento: formatPeriodoExcel(row['Data de Vencimento Tributo Quota']),
      valorPrincipal: toNumberValue(row['Valor Principal']),
      valorMulta: toNumberValue(row['Valor Multa']),
      valorJuros: toNumberValue(row['Valor Juros']),
      valorTotal: toNumberValue(row['Valor Total']),
      valorPrincipalOriginal: toNumberValue(row['Valor Principal']),
      valorMultaOriginal: toNumberValue(row['Valor Multa']),
      valorJurosOriginal: toNumberValue(row['Valor Juros']),
      valorTotalOriginal: toNumberValue(row['Valor Total']),
      cnpjDebito: toOptionalString(row['CNPJ Detentor do Débito'])
    });
  });

  const empresa = {
    cnpj: rowsDebitos.length > 0 ? toStringValue(rowsDebitos[0]['Cnpj Transmissor PER/DCOMP'], 'N/D') : 'N/D',
    razaoSocial: rowsDebitos.length > 0 ? toStringValue(rowsDebitos[0]['Nome Empresarial'], 'N/D') : 'N/D'
  };

  // Agrupar DCOMPs por Cadeia Relacional
  const cadeiasMap: Record<string, CadeiaRelacional> = {};
  const documentosIgnorados: ImportQualityReport['documentosIgnorados'] = [];
  let dcompsCarregadas = 0;

  rowsProcessamento.forEach(row => {
    const idCadeia = toStringValue(row['IDs da Cadeia Relacional']);
    const numeroDcomp = toStringValue(firstValue(row['Número Perdcomp'], row['Número do PER/DCOMP']));

    if (!numeroDcomp) {
      documentosIgnorados.push({
        numeroPerdcomp: '',
        motivo: 'sem_numero_perdcomp',
        tipoCredito: toOptionalString(firstValue(row['Tipo de Crédito'], row['Tipo de Credito'])),
        situacao: toOptionalString(firstValue(row['Situação'], row['Situacao'])),
      });
      return;
    }

    if (!idCadeia) {
      documentosIgnorados.push({
        numeroPerdcomp: numeroDcomp,
        motivo: 'sem_cadeia_relacional',
        tipoCredito: toOptionalString(firstValue(row['Tipo de Crédito'], row['Tipo de Credito'])),
        situacao: toOptionalString(firstValue(row['Situação'], row['Situacao'])),
      });
      return;
    }
    
    // Na tabela de Proc, temos:
    // Data Transmissão, Data de Transmissão do Perdcomp, Retificado ou Cancelado Por, 
    // Perdcomp Anterior com Detalhamento de Crédito, Tipo de Crédito, Valor Total do Crédito Detalhado, etc.
    
    const dcomp: DCOMP = {
      id: numeroDcomp,
      dataTransmissaoOriginal: parseExcelDate(firstValue(row['Data Transmissão'], row['Data de Transmissão do Perdcomp'])),
      dataTransmissao: parseExcelDate(firstValue(row['Data de Transmissão do Perdcomp'], row['Data Transmissão'])),
      tipoDocumento: toStringValue(firstValue(row['Tipo do Documento'], row['Tipo de Documento'])),
      situacao: toStringValue(row['Situação'], 'Pendente'),
      indicadorCredito: toStringValue(row['Indicador de Crédito']),
      tipoCredito: toStringValue(row['Tipo de Crédito']),
      detentorCredito: toStringValue(row['Detentor do Crédito']),
      periodoApuracaoCredito: formatPeriodoExcel(firstValue(row['Período de Apuração do Crédito'], row['Período de Apuração'])),
      valorTotalCreditoDetalhado: toNumberValue(firstValue(row['Valor Total do Crédito Detalhado'], row['Valor Total do Crédito'])),
      valorTotalCreditoDetalhadoOriginal: toNumberValue(firstValue(row['Valor Total do Crédito Detalhado'], row['Valor Total do Crédito'])),
      valorCreditoDataTransmissao: toNumberValue(firstValue(row['Valor do Crédito na Data de Transmissão'], row['Valor do Crédito na Data da Transmissão'])),
      valorUtilizadoPerdcomp: toNumberValue(firstValue(row['Valor Utilizado no Perdcomp'], row['Valor Utilizado na Perdcomp'])),
      valorUtilizadoPerdcompOriginal: toNumberValue(firstValue(row['Valor Utilizado no Perdcomp'], row['Valor Utilizado na Perdcomp'])),
      idCadeiaRelacional: idCadeia,
      numeroRetificador: toOptionalString(firstValue(row['Retificado ou Cancelado Por'], row['Número Retificador'])),
      numeroDcompDetalhamento: toOptionalString(firstValue(row['Perdcomp Anterior com Detalhamento de Crédito'], row['Detalhado Perdcomp Anterior'])),
      metadadosCreditoImportado: buildMetadadosCreditoImportado(row),
      classificacaoCreditoConsultiva: classificarTipoCredito(toStringValue(row['Tipo de Crédito'])),
      statusProcessamentoConsultivo: classificarStatusProcessamento({
        status: toStringValue(row['Situação'], 'Pendente'),
        tipoDocumento: toStringValue(firstValue(row['Tipo do Documento'], row['Tipo de Documento'])),
      }),
      debitos: debitosPorDcomp[numeroDcomp] || [],
    };

    if (!cadeiasMap[idCadeia]) {
      cadeiasMap[idCadeia] = {
        id: idCadeia,
        numeroDcompInicial: numeroDcomp, // Assumiremos a primeira encontrada como inicial, depois ordenamos e arrumamos
        tipoCredito: dcomp.tipoCredito,
        periodoApuracao: dcomp.periodoApuracaoCredito,
        dcomps: []
      };
    }

    cadeiasMap[idCadeia].dcomps.push(dcomp);
    dcompsCarregadas++;
  });

  // Ajustar o número da DCOMP inicial e ordenar cada cadeia
  const cadeias: CadeiaRelacional[] = Object.values(cadeiasMap).map(cadeia => {
    
    // Algoritmo de Linhagens: Agrupar por Ancestral (Origem) e ordenar blocos
    // 1. Mapeamento de quem retifica quem
    const rectifiesMap = new Map<string, string>(); // Filho (Retificadora) -> Pai (Retificada)
    cadeia.dcomps.forEach(d => {
      if (d.numeroRetificador) {
        rectifiesMap.set(d.numeroRetificador, d.id);
      }
    });

    // Função para achar a DCOMP Ancestral (Origem) de qualquer declaração
    const getOriginalId = (id: string): string => {
      let current = id;
      let failsafe = 0;
      while (rectifiesMap.has(current) && failsafe < 100) {
        current = rectifiesMap.get(current)!;
        failsafe++;
      }
      return current;
    };

    const getDepth = (id: string): number => {
      let current = id;
      let depth = 0;
      let failsafe = 0;
      while (rectifiesMap.has(current) && failsafe < 100) {
        current = rectifiesMap.get(current)!;
        depth++;
        failsafe++;
      }
      return depth;
    };

    // 2. Agrupar em blocos com base na Origem
    const groupsMap = new Map<string, DCOMP[]>();
    cadeia.dcomps.forEach(d => {
      const origId = getOriginalId(d.id);
      if (!groupsMap.has(origId)) {
        groupsMap.set(origId, []);
      }
      groupsMap.get(origId)!.push(d);
    });

    // 3. Ordenar DCOMPs dentro de cada bloco (Cronologicamente pela Data Real)
    // E herdar a Data de Transmissão da Original
    const groups = Array.from(groupsMap.values());
    groups.forEach(group => {
      group.sort((a, b) => {
        const depthDiff = getDepth(a.id) - getDepth(b.id);
        if (depthDiff !== 0) return depthDiff;
        return a.dataTransmissao.getTime() - b.dataTransmissao.getTime();
      });
      
      const dataRefOriginal = group[0].dataTransmissao;
      group.forEach(d => {
        // Todas herdam a Data Ref do Ancestral
        d.dataTransmissaoOriginal = new Date(dataRefOriginal.getTime());
      });
    });

    // 4. Identificar o Grupo Raiz (Aquele cujo ancestral não aponta para nenhum outro grupo desta cadeia)
    const allOriginalIds = new Set(groups.map(g => g[0].id));
    let rootGroupIndex = groups.findIndex(g => {
       const original = g[0];
       const ref = original.numeroDcompDetalhamento;
       if (!ref || ref.trim() === '') return true;
       if (ref === original.id) return true; // Self-reference
       
       // Tenta ver se a DCOMP que ele aponta existe nos nossos grupos
       let resolvedRef = ref;
       if (rectifiesMap.has(ref)) {
           resolvedRef = getOriginalId(ref);
       }
       
       if (!allOriginalIds.has(resolvedRef)) return true; // Aponta pra fora da cadeia, logo é a raiz local
       
       return false;
    });
    
    if (rootGroupIndex === -1) {
      // Fallback: Pega a que tem mais dependentes ou simplesmente a primeira após ordenação
      groups.sort((a, b) => a[0].dataTransmissao.getTime() - b[0].dataTransmissao.getTime());
      rootGroupIndex = 0;
    }

    const rootGroup = groups.splice(rootGroupIndex, 1)[0];

    // 5. Ordenar os demais blocos cronologicamente baseados na Data de sua Ancestral
    groups.sort((a, b) => a[0].dataTransmissao.getTime() - b[0].dataTransmissao.getTime());

    // 6. Achatamento (Flatten): Raiz sempre no topo
    cadeia.dcomps = [...rootGroup, ...groups.flat()];

    if (cadeia.dcomps.length > 0) {
      cadeia.numeroDcompInicial = cadeia.dcomps[0].id;
    }
    return cadeia;
  });

  return {
    cadeias,
    empresa,
    importQualityReport: {
      linhasProcessamento: rowsProcessamento.length,
      linhasDebitos: rowsDebitos.length,
      dcompsCarregadas,
      cadeiasCarregadas: cadeias.length,
      debitosCarregados: cadeias.reduce(
        (total, cadeia) =>
          total + cadeia.dcomps.reduce((dcompTotal, dcomp) => dcompTotal + dcomp.debitos.length, 0),
        0,
      ),
      documentosIgnorados,
    },
  };
};
