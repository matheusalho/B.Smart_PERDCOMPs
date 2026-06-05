import * as XLSX from 'xlsx';
import type { CadeiaRelacional, DCOMP, DebitoOficial } from '../models/types';

// Função para converter data do Excel (número serial) para Date do JS
const parseExcelDate = (excelDate: any): Date => {
  if (!excelDate) return new Date();
  if (typeof excelDate === 'number') {
    // 25569 é o offset de dias entre 01/01/1900 (Excel) e 01/01/1970 (UNIX)
    // 86400 * 1000 = ms em um dia
    return new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  }
  
  if (typeof excelDate === 'string') {
     // Pode estar em string ISO ou outro formato. Tentaremos fazer parse
     // Muitas vezes vem DD/MM/AAAA ou YYYY-MM-DD HH:mm:ss
     const parts = excelDate.split(' ');
     if (parts[0].includes('/')) {
         const dParts = parts[0].split('/');
         if (dParts.length === 3) {
             return new Date(`${dParts[2]}-${dParts[1]}-${dParts[0]}T00:00:00Z`);
         }
     }
     return new Date(excelDate);
  }
  return new Date();
};

export const parseExcelFile = (data: ArrayBuffer): CadeiaRelacional[] => {
  const workbook = XLSX.read(data, { type: 'array' });

  // Pular 3 linhas significa que o header está na linha de índice 3 (4ª linha)
  // SheetJS `range` ou apenas usar `{ range: 3 }` no sheet_to_json
  
  const sheetProcessamento = workbook.Sheets['Processamento PERDCOMP'];
  const sheetDebitos = workbook.Sheets['PERDCOMP Débitos'];

  if (!sheetProcessamento || !sheetDebitos) {
    throw new Error('As abas "Processamento PERDCOMP" e "PERDCOMP Débitos" são obrigatórias.');
  }

  // Header na linha 3 (0-indexed)
  const rowsProcessamento = XLSX.utils.sheet_to_json<any>(sheetProcessamento, { range: 3 });
  const rowsDebitos = XLSX.utils.sheet_to_json<any>(sheetDebitos, { range: 3 });

  // Agrupar Débitos por "ID da Cadeia Relacional" E "Número do PER/DCOMP" (ou "Nº do Recibo PER/DCOMP")
  // A aba de débito tem: "Nº do Recibo PER/DCOMP" ou "Número do PER/DCOMP"?
  // A coluna real encontrada no debug: "Número do PER/DCOMP"
  const debitosPorDcomp: Record<string, DebitoOficial[]> = {};
  
  rowsDebitos.forEach((row, index) => {
    const numeroDcomp = row['Número do PER/DCOMP'];
    if (!numeroDcomp) return;

    if (!debitosPorDcomp[numeroDcomp]) {
      debitosPorDcomp[numeroDcomp] = [];
    }

    debitosPorDcomp[numeroDcomp].push({
      id: `deb_${index}`,
      codigoReceita: row['Código de Receita'] || '',
      periodoApuracao: row['Período de Apuração do Débito'] || '',
      dataVencimento: row['Data de Vencimento Tributo Quota'] || '',
      valorPrincipal: Number(row['Valor Principal'] || 0),
      valorMulta: Number(row['Valor Multa'] || 0),
      valorJuros: Number(row['Valor Juros'] || 0),
      valorTotal: Number(row['Valor Total'] || 0),
      valorPrincipalOriginal: Number(row['Valor Principal'] || 0),
      valorMultaOriginal: Number(row['Valor Multa'] || 0),
      valorJurosOriginal: Number(row['Valor Juros'] || 0),
      valorTotalOriginal: Number(row['Valor Total'] || 0),
      cnpjDebito: row['CNPJ Detentor do Débito']
    });
  });

  // Agrupar DCOMPs por Cadeia Relacional
  const cadeiasMap: Record<string, CadeiaRelacional> = {};

  rowsProcessamento.forEach(row => {
    const idCadeia = row['IDs da Cadeia Relacional'];
    if (!idCadeia) return;

    const numeroDcomp = row['Número Perdcomp'] || row['Número do PER/DCOMP'];
    
    // Na tabela de Proc, temos:
    // Data Transmissão, Data de Transmissão do Perdcomp, Retificado ou Cancelado Por, 
    // Perdcomp Anterior com Detalhamento de Crédito, Tipo de Crédito, Valor Total do Crédito Detalhado, etc.
    
    const dcomp: DCOMP = {
      id: numeroDcomp,
      dataTransmissaoOriginal: parseExcelDate(row['Data Transmissão'] || row['Data de Transmissão do Perdcomp']),
      dataTransmissao: parseExcelDate(row['Data de Transmissão do Perdcomp'] || row['Data Transmissão']),
      tipoDocumento: row['Tipo do Documento'] || row['Tipo de Documento'] || '',
      situacao: row['Situação'] || 'Pendente',
      indicadorCredito: row['Indicador de Crédito'] || '',
      tipoCredito: row['Tipo de Crédito'] || '',
      detentorCredito: row['Detentor do Crédito'] || '',
      periodoApuracaoCredito: row['Período de Apuração do Crédito'] || '',
      valorTotalCreditoDetalhado: Number(row['Valor Total do Crédito Detalhado'] || 0),
      valorTotalCreditoDetalhadoOriginal: Number(row['Valor Total do Crédito Detalhado'] || 0),
      valorCreditoDataTransmissao: Number(row['Valor do Crédito na Data de Transmissão'] || 0),
      valorUtilizadoPerdcomp: Number(row['Valor Utilizado no Perdcomp'] || 0),
      valorUtilizadoPerdcompOriginal: Number(row['Valor Utilizado no Perdcomp'] || 0),
      idCadeiaRelacional: idCadeia,
      numeroRetificador: row['Retificado ou Cancelado Por'] || undefined,
      numeroDcompDetalhamento: row['Perdcomp Anterior com Detalhamento de Crédito'] || undefined,
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

  return cadeias;
};
