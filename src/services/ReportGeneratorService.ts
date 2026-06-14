import type { SimulacaoSalva, CadeiaRelacional, DCOMP } from '../models/types';
import { format } from 'date-fns';
import { isVigente } from '../utils/statusHelper';
import { verificarVedacaoCredito, verificarVedacaoDebito } from './normativo/vedacaoCompensacaoService';
import { buscarRastreabilidadeValor } from './valueTraceability';
import type { jsPDF as JsPDFDocument } from 'jspdf';
import type { CellHookData, RowInput, Table } from 'jspdf-autotable';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

type AutoTableDoc = JsPDFDocument & {
  lastAutoTable?: Table;
};

const getLastAutoTableFinalY = (doc: AutoTableDoc, fallbackY: number): number => (
  doc.lastAutoTable?.finalY ?? fallbackY
);

const getCreditoDataTransmissaoOriginal = (dcomp: DCOMP): number => (
  dcomp.divergenciaDetalhes?.esperado ?? dcomp.valorCreditoDataTransmissao
);

const getCreditoDataTransmissaoRecalculado = (dcomp: DCOMP): number => (
  dcomp.divergenciaDetalhes?.calculado ?? dcomp.valorCreditoDataTransmissao
);

const getSaldoProximaDcompOriginal = (dcomp: DCOMP, fallback: number): number => (
  dcomp.saldoCreditoOriginalAnterior ?? fallback
);

const CAMPOS_RASTREIO_ORIGINAIS = [
  'valorTotalCreditoDetalhadoOriginal',
  'valorCreditoDataTransmissaoOriginal',
  'debitosTotalOriginal',
  'valorUtilizadoPerdcompOriginal',
  'saldoProximaDcompOriginal',
];

const CAMPOS_RASTREIO_RECALCULADOS = [
  'valorTotalCreditoDetalhado',
  'valorCreditoDataTransmissao',
  'debitosTotal',
  'valorUtilizadoPerdcomp',
  'saldoCreditoOriginalCalculado',
];

const compactarOrigemValor = (origem: string): string => {
  const mapa: Record<string, string> = {
    importado_rfb: 'RFB',
    calculado_motor: 'CALC',
    simulado_usuario: 'SIM',
    fallback_operacional: 'FALL',
    replicado_credito_raiz: 'RAIZ',
  };

  return mapa[origem] ?? origem.toUpperCase().slice(0, 6);
};

const compactarMetodo = (metodo: string): string => {
  if (metodo.includes('selic_normativa')) return 'SELIC';
  if (metodo.includes('importado_eCAC')) return 'ECAC';
  if (metodo.includes('divergencia')) return 'DIV';
  if (metodo.includes('cascata')) return 'CASC';
  if (metodo.includes('edicao_usuario')) return 'EDIC';
  if (metodo.includes('hipotetica')) return 'HIP';
  if (metodo.includes('estimativa') || metodo.includes('fallback') || metodo.includes('fator_historico')) return 'EST';
  if (metodo.includes('credito_raiz')) return 'RAIZ';

  return metodo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
};

const compactarStatus = (status: string): string => {
  const mapa: Record<string, string> = {
    normativo: 'NORM',
    estimativa_historica: 'EST',
    dados_insuficientes: 'DADOS',
    parcial: 'PARC',
  };

  return mapa[status] ?? status.toUpperCase().slice(0, 6);
};

const RASTREABILIDADE_BADGE_GLOSSARIO = [
  ['RFB', 'Valor importado da Receita Federal/e-CAC.'],
  ['ECAC', 'Método de obtenção por importação direta do e-CAC.'],
  ['CALC', 'Valor calculado pelo motor do B.Smart.'],
  ['SELIC', 'cálculo normativo com taxa SELIC conforme tipo de crédito e dados disponíveis.'],
  ['NORM', 'Status normativo: cálculo com dados suficientes para aplicação da metodologia prevista.'],
  ['SIM', 'Valor simulado ou informado pelo usuário.'],
  ['EDIC', 'Valor decorrente de edição manual do usuário.'],
  ['FALL', 'Fallback operacional aplicado quando a origem normativa completa não está disponível.'],
  ['EST', 'Estimativa histórica ou método aproximado por insuficiência de dados.'],
  ['DADOS', 'Há dados ausentes ou insuficientes associados ao valor.'],
  ['PARC', 'Cálculo parcial: parte dos valores foi calculada e parte depende de hipótese ou dado ausente.'],
  ['CASC', 'Valor produzido pela cascata de recálculo ou pelo encadeamento histórico.'],
  ['DIV', 'Valor relacionado ao tratamento de divergência entre importado, esperado ou recalculado.'],
  ['HIP', 'Valor associado a PER/DCOMP hipotética.'],
  ['RAIZ', 'Valor replicado ou derivado do crédito raiz da cadeia.'],
];

const criarIndicadoresRastreabilidade = (
  simulacao: SimulacaoSalva,
  dcomp: DCOMP,
  campos: string[],
): string => {
  const indicadores = new Set<string>();

  campos.forEach((campo) => {
    const rastreabilidade = buscarRastreabilidadeValor(simulacao, dcomp.id, campo);
    if (!rastreabilidade) return;

    indicadores.add(compactarOrigemValor(rastreabilidade.origemValor));
    indicadores.add(compactarMetodo(rastreabilidade.metodo));

    if (rastreabilidade.statusCalculo) {
      indicadores.add(compactarStatus(rastreabilidade.statusCalculo));
    }

    if (rastreabilidade.dadosAusentes.length > 0) {
      indicadores.add('DADOS');
    }
  });

  return Array.from(indicadores).join('\n');
};

const getBadgeFillColor = (label: string, isDark: boolean): [number, number, number] => {
  if (['RFB', 'ECAC'].includes(label)) return isDark ? [30, 64, 175] : [219, 234, 254];
  if (['CALC', 'SELIC', 'NORM', 'CASC'].includes(label)) return isDark ? [22, 101, 52] : [220, 252, 231];
  if (['SIM', 'EDIC', 'HIP'].includes(label)) return isDark ? [133, 77, 14] : [254, 243, 199];
  if (['FALL', 'EST', 'DADOS', 'PARC'].includes(label)) return isDark ? [127, 29, 29] : [254, 226, 226];
  return isDark ? [51, 65, 85] : [226, 232, 240];
};

const getBadgeTextColor = (label: string, isDark: boolean): [number, number, number] => {
  if (isDark) return [255, 255, 255];
  if (['RFB', 'ECAC'].includes(label)) return [30, 64, 175];
  if (['CALC', 'SELIC', 'NORM', 'CASC'].includes(label)) return [22, 101, 52];
  if (['SIM', 'EDIC', 'HIP'].includes(label)) return [146, 64, 14];
  if (['FALL', 'EST', 'DADOS', 'PARC'].includes(label)) return [153, 27, 27];
  return [51, 65, 85];
};

export const generatePdfReport = async (simulacoes: SimulacaoSalva[], theme: 'dark' | 'light', todasAsCadeias: CadeiaRelacional[] = [], empresa: { razaoSocial: string; cnpj: string } | null = null) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  }) as AutoTableDoc;

  const isDark = theme === 'dark';
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentRight = pageWidth - 14;
  
  // Paletas e Design Tokens baseados no tema
  const bgColor = isDark ? [3, 3, 5] as [number, number, number] : [248, 250, 252] as [number, number, number];
  const textColor = isDark ? [248, 250, 252] as [number, number, number] : [30, 41, 59] as [number, number, number];
  const textMuted = isDark ? [148, 163, 184] as [number, number, number] : [100, 100, 100] as [number, number, number];
  
  const baleraBlue = [0, 179, 255] as [number, number, number];
  const dangerRed = isDark ? [239, 68, 68] as [number, number, number] : [220, 53, 69] as [number, number, number];
  const successGreen = isDark ? [34, 197, 94] as [number, number, number] : [40, 167, 69] as [number, number, number];

  const tableBg = isDark ? [20, 20, 25] as [number, number, number] : [255, 255, 255] as [number, number, number];
  const tableAltBg = isDark ? [30, 30, 35] as [number, number, number] : [248, 250, 252] as [number, number, number];
  const tableBorder = isDark ? [45, 45, 55] as [number, number, number] : [226, 232, 240] as [number, number, number];
  const tableLineColor = isDark ? [45, 45, 55] as [number, number, number] : [230, 230, 230] as [number, number, number];

  const headerNeutralBg = isDark ? [45, 45, 55] as [number, number, number] : [241, 245, 249] as [number, number, number];
  const headerNeutralText = isDark ? [248, 250, 252] as [number, number, number] : [71, 85, 105] as [number, number, number];

  const traceBadgeHooks = (indicadorColumnIndex: number) => ({
    didParseCell: (data: CellHookData) => {
      if (data.section === 'body' && data.column.index === indicadorColumnIndex) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data: CellHookData) => {
      if (data.section !== 'body' || data.column.index !== indicadorColumnIndex) return;

      const raw = typeof data.cell.raw === 'string' ? data.cell.raw : '';
      const labels = raw.split('\n').filter(Boolean).slice(0, 6);
      if (labels.length === 0) return;

      const docWithShapes = data.doc as JsPDFDocument;
      const badgeHeight = 4.5;
      const gap = 1.2;
      const xStart = data.cell.x + 1.4;
      const maxWidth = data.cell.width - 2.8;
      let x = xStart;
      let y = data.cell.y + 2;

      labels.forEach((label) => {
        const width = Math.min(Math.max(label.length * 1.6 + 3.8, 9), maxWidth);
        if (x + width > xStart + maxWidth) {
          x = xStart;
          y += badgeHeight + gap;
        }

        const fillColor = getBadgeFillColor(label, isDark);
        const textBadgeColor = getBadgeTextColor(label, isDark);
        docWithShapes.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        docWithShapes.roundedRect(x, y, width, badgeHeight, 1.6, 1.6, 'F');
        docWithShapes.setFontSize(5.6);
        docWithShapes.setTextColor(textBadgeColor[0], textBadgeColor[1], textBadgeColor[2]);
        docWithShapes.text(label, x + width / 2, y + 3.2, { align: 'center' });
        x += width + gap;
      });
    },
  });

  const drawBackground = () => {
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), pageHeight, 'F');
  };

  // Monkey patch no doc.addPage para que o autotable e novas páginas herdem o fundo dark automaticamente
  const originalAddPage = doc.addPage.bind(doc);
  doc.addPage = ((formatArg?: string | number[], orientation?: 'p' | 'portrait' | 'l' | 'landscape') => {
    originalAddPage(formatArg, orientation);
    drawBackground();
    return doc;
  }) as JsPDFDocument['addPage'];

  drawBackground(); // Fundo da Capa Inicial

  // Tenta carregar a logo do Balera e inverte as cores (Branco -> Escuro) via Canvas
  let logoBase64: string | ArrayBuffer | null = null;
  try {
    const response = await fetch('/balera_logo_novo.png');
    const blob = await response.blob();
    logoBase64 = await new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch (e) {
    console.warn('Não foi possível carregar a logo', e);
  }

  // Carrega o banner de cabeçalho
  let bannerBase64: string | ArrayBuffer | null = null;
  try {
    const response = await fetch('/pdf_header_banner.png');
    const blob = await response.blob();
    bannerBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Não foi possível carregar o banner', e);
  }

  // Desenha o Fundo do Cabeçalho
  doc.setFillColor(15, 23, 42); // slate-900 (fallback escuro)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 58, 'F');

  if (bannerBase64) {
    doc.addImage(bannerBase64 as string, 'PNG', 0, 0, doc.internal.pageSize.getWidth(), 58);
  }

  // Capa / Cabeçalho Principal
  if (logoBase64) {
    doc.addImage(logoBase64 as string, 'PNG', contentRight - 20, 16, 20, 20);
  }

  doc.setFontSize(24);
  doc.setTextColor(baleraBlue[0], baleraBlue[1], baleraBlue[2]);
  doc.text('Relatório Consolidado de Simulações', 14, 22);
  
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('B.Smart PER/DCOMPs', 14, 30);

  if (empresa) {
    const formatCNPJ = (cnpj: string) => {
      const digits = cnpj.replace(/\D/g, '');
      if (digits.length !== 14) return cnpj;
      return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
    };
    
    doc.setFontSize(10);
    doc.setTextColor(180, 190, 200);
    doc.text('Empresa Analisada:', 14, 44);
    
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`${empresa.razaoSocial} (CNPJ: ${formatCNPJ(empresa.cnpj)})`, 14, 50);
  }

  // Data de Emissão alinhada à direita
  doc.setFontSize(10);
  doc.setTextColor(180, 190, 200);
  doc.text('Emitido em:', contentRight, 44, { align: 'right' });
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), contentRight, 50, { align: 'right' });
  
  let currentY = 56;

  // Calcula KPIs Globais para o Snapshot
  let cadeiasEditadas = 0;
  let debitosReduzidos = 0;
  let saldoDisponibilizado = 0;
  let totalCreditoOriginalUsadoGlobal = 0;
  let dcompsIndividuais = 0;

  // O Snapshot no PDF deve refletir as edições e consumo APENAS das cadeias que foram salvas no relatório.
  // Mas vamos mostrar o tamanho da empresa (Excel) como contexto.
  simulacoes.forEach(cadeia => {
    let isEditada = false;
    dcompsIndividuais += cadeia.dcomps.length;
    cadeia.dcomps.forEach(dcomp => {
      if (dcomp.isManuallyEdited || dcomp.indicadorCredito === 'Hipotético') {
        isEditada = true;
      }
      
      const vigente = isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);

      if (vigente && dcomp.indicadorCredito !== 'Hipotético') {
        const originalUsado = dcomp.valorUtilizadoPerdcompOriginal || dcomp.valorUtilizadoPerdcomp;
        saldoDisponibilizado += (originalUsado - dcomp.valorUtilizadoPerdcomp);
        totalCreditoOriginalUsadoGlobal += dcomp.valorUtilizadoPerdcomp;

        dcomp.debitos.forEach(deb => {
          const original = deb.valorTotalOriginal || deb.valorTotal;
          debitosReduzidos += (original - deb.valorTotal);
        });
      }
    });
    if (isEditada) cadeiasEditadas++;
  });

  doc.setDrawColor(tableBorder[0], tableBorder[1], tableBorder[2]);
  doc.line(14, currentY + 4, contentRight, currentY + 4);

  // Seção: Visão Executiva (Snapshot)
  currentY += 14;
  doc.setFontSize(14);
  doc.setTextColor(baleraBlue[0], baleraBlue[1], baleraBlue[2]);
  doc.text('Visão Executiva (Cadeias Exportadas neste Relatório)', 14, currentY);

  const globalKpisInfo = [
    ['Total de Cadeias na Empresa (Excel)', todasAsCadeias.length > 0 ? todasAsCadeias.length.toString() : simulacoes.length.toString()],
    ['Cadeias Exportadas neste Relatório', simulacoes.length.toString()],
    ['Total de PER/DCOMPs nestas Cadeias', dcompsIndividuais.toString()],
    ['Cadeias Editadas pelo Usuário', `${cadeiasEditadas}`],
    ['Crédito Original Consumido (Exportadas)', formatCurrency(totalCreditoOriginalUsadoGlobal)],
    ['Lastro Disponibilizado pelas Edições', formatCurrency(saldoDisponibilizado)],
    ['Redução Total de Débitos', formatCurrency(debitosReduzidos)]
  ];

  autoTable(doc, {
    startY: currentY + 5,
    head: [],
    body: globalKpisInfo,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4, lineColor: tableLineColor, textColor: textColor, fillColor: tableBg },
    columnStyles: { 
      0: { fontStyle: 'bold', fillColor: headerNeutralBg, cellWidth: 90, textColor: headerNeutralText }
    }
  });

  let startY = getLastAutoTableFinalY(doc, currentY + 5) + 15;

  // NOVO BLOCO: Premissas e Metodologia Global
  doc.addPage();
  startY = 20;
  doc.setFontSize(14);
  doc.setTextColor(baleraBlue[0], baleraBlue[1], baleraBlue[2]);
  doc.text('Declaração de Premissas e Metodologia', 14, startY);
  startY += 10;

  doc.setFontSize(10);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('Os valores apresentados neste relatório obedecem às seguintes classes metodológicas:', 14, startY);
  startY += 6;
  doc.text('1. Valores Importados: Provenientes diretamente do e-CAC (arquivos originais).', 14, startY);
  startY += 6;
  doc.text('2. Valores Calculados Normativamente: Aplicam a taxa SELIC oficial baseada em dados suficientes.', 14, startY);
  startY += 6;
  doc.text('3. Valores Estimados / Históricos: Utilizam fator de fallback por insuficiência de dados.', 14, startY);
  startY += 6;
  doc.text('4. Valores Simulados: Inseridos ou editados manualmente pelo usuário na plataforma.', 14, startY);
  
  startY += 12;

  doc.setFontSize(11);
  doc.setTextColor(baleraBlue[0], baleraBlue[1], baleraBlue[2]);
  doc.text('Glossário das badges da coluna Indicadores', 14, startY);
  startY += 4;

  autoTable(doc, {
    startY,
    head: [['Badge', 'Significado']],
    body: RASTREABILIDADE_BADGE_GLOSSARIO,
    headStyles: { fillColor: headerNeutralBg, textColor: headerNeutralText, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2, textColor: textColor, fillColor: tableBg, lineColor: tableLineColor },
    alternateRowStyles: { fillColor: tableAltBg },
    columnStyles: {
      0: { cellWidth: 24, minCellHeight: 8, halign: 'center' },
      1: { cellWidth: 240 }
    },
    ...traceBadgeHooks(0)
  });

  startY = getLastAutoTableFinalY(doc, startY) + 12;

  // Analisamos todas as simulações para extrair alertas globais de auditoria
  const todosAlertas = new Set<string>();
  let hasInsuficientes = false;
  let hasEstimativa = false;
  simulacoes.forEach(sim => {
    // Adicionar Alertas de Vedação Globais
    const vedacoesCredito = verificarVedacaoCredito({ tipoCredito: sim.tipoCredito });
    vedacoesCredito.forEach(v => todosAlertas.add(`Vedação de Crédito (${v.codigo}): ${v.mensagem}`));

    sim.dcomps.forEach(dcomp => {
      dcomp.debitos.forEach(deb => {
        const vedacoesDeb = verificarVedacaoDebito(deb, dcomp.dataTransmissaoOriginal || new Date(), dcomp.periodoApuracaoCredito);
        vedacoesDeb.forEach(v => todosAlertas.add(`Vedação de Débito ${deb.codigoReceita} (${v.codigo}): ${v.mensagem}`));
      });
    });

    const meta = sim.metadadosAuditoria;
    if (meta) {
      if (meta.statusCalculoGlobal === 'dados_insuficientes' || meta.statusCalculoGlobal === 'parcial') hasInsuficientes = true;
      if (meta.statusCalculoGlobal === 'estimativa_historica' || meta.statusCalculoGlobal === 'parcial') hasEstimativa = true;
      meta.hipoteses.forEach(h => todosAlertas.add(h));
      meta.dadosAusentes.forEach(d => todosAlertas.add(`Dado ausente detectado: ${d}`));
    }
  });

  if (hasInsuficientes || hasEstimativa || todosAlertas.size > 0) {
    if (hasInsuficientes || hasEstimativa) {
        doc.setTextColor(dangerRed[0], dangerRed[1], dangerRed[2]);
        doc.text('Aviso de Auditoria: Algumas cadeias neste relatório utilizam cálculos estimados ou possuem insuficiência de dados.', 14, startY);
        startY += 8;
    }
    
    const alertasArray = Array.from(todosAlertas).map(a => [a]);
    if (alertasArray.length > 0) {
      autoTable(doc, {
        startY: startY,
        head: [['Risco e Limitações Identificados']],
        body: alertasArray,
        headStyles: { fillColor: dangerRed, textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3, textColor: textColor, fillColor: tableBg, lineColor: tableLineColor }
      });
      startY = getLastAutoTableFinalY(doc, startY) + 15;
    }
  }

  simulacoes.forEach((simulacao, index) => {
    // Nova página se não couber a próxima simulação
    if (startY > pageHeight - 60 || index === 0) {
      if (index > 0 || startY > pageHeight - 60) {
         doc.addPage();
         startY = 20;
      }
    } else if (index > 0) {
      startY += 10;
      doc.setDrawColor(tableBorder[0], tableBorder[1], tableBorder[2]);
      doc.line(14, startY, contentRight, startY);
      startY += 15;
    }

    // Título da Simulação
    doc.setFontSize(16);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Simulação #${index + 1} - Cadeia Raiz: ${simulacao.numeroDcompInicial}`, 14, startY);
    startY += 6;
    doc.setFontSize(11);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Tipo de Crédito: ${simulacao.tipoCredito}`, 14, startY);
    
    startY += 12;

    // Reprodução de KPIs
    doc.setFontSize(12);
    doc.setTextColor(baleraBlue[0], baleraBlue[1], baleraBlue[2]);
    doc.text('Resumo (KPIs no momento do salvamento):', 14, startY);
    startY += 6;
    
    const totalCreditoUtilizadoCadeia = simulacao.dcomps
      .filter(d => isVigente(d.situacao, d.tipoDocumento, d.id))
      .reduce((acc, d) => acc + d.valorUtilizadoPerdcomp, 0);

    const kpisInfo = [
      ['Saldo Inicial Original', formatCurrency(simulacao.kpis.saldoOriginalTotal || 0)],
      ['Novo Saldo Inicial', formatCurrency(simulacao.kpis.saldoAtualizadoTotal || 0)],
      ['Crédito Original Usado', formatCurrency(totalCreditoUtilizadoCadeia)],
      ['Lastro Original Disponibilizado', formatCurrency(simulacao.kpis.lastroOriginalDisponibilizado || 0)],
      ['Redução de Débitos', formatCurrency(simulacao.kpis.economiaProjetada || 0)],
      ['Saldo Original Restante (Anterior)', formatCurrency(simulacao.kpis.saldoOriginalRestanteAntigo || 0)],
      ['Saldo Original Restante (Novo)', formatCurrency(simulacao.kpis.saldoOriginalRestanteNovo || 0)]
    ];

    autoTable(doc, {
      startY: startY,
      head: [],
      body: kpisInfo,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, lineColor: tableLineColor, textColor: textColor, fillColor: tableBg },
      columnStyles: { 
        0: { fontStyle: 'bold', fillColor: headerNeutralBg, cellWidth: 80, textColor: headerNeutralText }
      }
    });

    startY = getLastAutoTableFinalY(doc, startY) + 14;

    // 1º Edições Manuais
    if (startY > pageHeight - 40) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('1º Edições Manuais', 14, startY);
    startY += 6;

    const dcompsEditadas = simulacao.dcomps.filter(d => d.isManuallyEdited);

    if (dcompsEditadas.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('Nenhuma edição manual realizada nesta cadeia.', 14, startY);
      startY += 12;
    } else {
      const manualBody: RowInput[] = [];
      dcompsEditadas.forEach(d => {
        d.debitos.forEach(deb => {
          if (deb.valorTotal !== deb.valorTotalOriginal) {
            manualBody.push([
              d.id,
              deb.codigoReceita,
              deb.periodoApuracao,
              formatCurrency(deb.valorTotalOriginal),
              formatCurrency(deb.valorTotal),
              formatCurrency(deb.valorTotalOriginal - deb.valorTotal)
            ]);
          }
        });
      });

      autoTable(doc, {
        startY: startY,
        head: [['PER/DCOMP', 'Débito Editado', 'PA do Débito', 'Valor Original', 'Novo Valor', 'Variação (Delta)']],
        body: manualBody,
        headStyles: { fillColor: baleraBlue, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3, lineColor: tableLineColor, textColor: textColor, fillColor: tableBg },
        alternateRowStyles: { fillColor: tableAltBg },
        columnStyles: {
          5: { fontStyle: 'bold', textColor: successGreen }
        }
      });
      startY = getLastAutoTableFinalY(doc, startY) + 14;

      const editadasOriginalBody: RowInput[] = [];
      const editadasNovoBody: RowInput[] = [];

      dcompsEditadas.forEach(d => {
        const origCreditoDetalhado = d.valorTotalCreditoDetalhadoOriginal;
        const origCreditoTransmissao = getCreditoDataTransmissaoOriginal(d);
        const origDebitos = d.debitos.reduce((acc, deb) => acc + deb.valorTotalOriginal, 0);
        const origCreditoUsado = d.valorUtilizadoPerdcompOriginal;
        const origSaldo = getSaldoProximaDcompOriginal(d, origCreditoTransmissao - origCreditoUsado);

        const novoCreditoDetalhado = d.valorTotalCreditoDetalhado;
        const novoCreditoTransmissao = getCreditoDataTransmissaoRecalculado(d);
        const novoDebitos = d.debitos.reduce((acc, deb) => acc + deb.valorTotal, 0);
        const novoCreditoUsado = d.valorUtilizadoPerdcomp;
        const novoSaldo = d.saldoCreditoOriginalCalculado ?? 0;

        editadasOriginalBody.push([
          d.id,
          formatCurrency(origCreditoDetalhado),
          formatCurrency(origCreditoTransmissao),
          formatCurrency(origDebitos),
          formatCurrency(origCreditoUsado),
          formatCurrency(origSaldo),
          criarIndicadoresRastreabilidade(simulacao, d, CAMPOS_RASTREIO_ORIGINAIS)
        ]);

        editadasNovoBody.push([
          d.id,
          formatCurrency(novoCreditoDetalhado),
          formatCurrency(novoCreditoTransmissao),
          formatCurrency(novoDebitos),
          formatCurrency(novoCreditoUsado),
          formatCurrency(novoSaldo),
          criarIndicadoresRastreabilidade(simulacao, d, CAMPOS_RASTREIO_RECALCULADOS)
        ]);
      });

      if (startY > pageHeight - 50) {
        doc.addPage();
        startY = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('Valores Importados e Calculados Históricos', 14, startY);
      startY += 4;

      autoTable(doc, {
        startY: startY,
        head: [['PER/DCOMP', 'Valor Crédito Inicial', 'Créd. Data Transm.', 'Débitos Compensados', 'Créd. Orig. Usado', 'Saldo Próx. DCOMP', 'Indicadores']],
        body: editadasOriginalBody,
        rowPageBreak: 'avoid',
        headStyles: { fillColor: headerNeutralBg, textColor: headerNeutralText }, 
        styles: { fontSize: 7, cellPadding: 2, textColor: textColor, fillColor: tableBg, lineColor: tableLineColor },
        alternateRowStyles: { fillColor: tableAltBg },
        columnStyles: {
          6: { cellWidth: 36, minCellHeight: 18, halign: 'center' }
        },
        ...traceBadgeHooks(6)
      });

      startY = getLastAutoTableFinalY(doc, startY) + 10;

      if (startY > pageHeight - 40) {
        doc.addPage();
        drawBackground();
        startY = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(baleraBlue[0], baleraBlue[1], baleraBlue[2]);
      doc.text('Valores Simulados / Recalculados', 14, startY);
      startY += 4;

      autoTable(doc, {
        startY: startY,
        head: [['PER/DCOMP', 'Valor Crédito Inicial', 'Créd. Data Transm.', 'Débitos Compensados', 'Créd. Orig. Usado', 'Saldo Próx. DCOMP', 'Indicadores']],
        body: editadasNovoBody,
        rowPageBreak: 'avoid',
        headStyles: { fillColor: baleraBlue, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2, textColor: textColor, fillColor: tableBg, lineColor: tableLineColor },
        alternateRowStyles: { fillColor: tableAltBg },
        columnStyles: {
          6: { cellWidth: 36, minCellHeight: 18, halign: 'center' }
        },
        ...traceBadgeHooks(6)
      });

      startY = getLastAutoTableFinalY(doc, startY) + 14;
    }

    // 2º Espelho Geral da Cadeia (Antes e Depois)
    if (startY > pageHeight - 50) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text('2º Espelho de Modificações da Cadeia (Manuais e Colaterais)', 14, startY);
    startY += 6;

    const dcompsVigentesEspelho = simulacao.dcomps.filter(d =>
      d.indicadorCredito !== 'Hipotético' &&
      isVigente(d.situacao, d.tipoDocumento, d.id)
    );

    const dcompsAfetadas = dcompsVigentesEspelho.filter(d =>
      d.statusCascata === 'RETIFICAR' ||
      d.statusCascata === 'EDITADO_E_RETIFICAR' ||
      d.isManuallyEdited ||
      d.statusCascata === 'EDITADO'
    );

    if (dcompsAfetadas.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('Nenhuma declaração foi afetada nesta simulação.', 14, startY);
      startY += 12;
    } else {
      const colateralOriginalBody: RowInput[] = [];
      const colateralNovoBody: RowInput[] = [];

      dcompsVigentesEspelho.forEach(d => {
        const origCreditoDetalhado = d.valorTotalCreditoDetalhadoOriginal;
        const origCreditoTransmissao = getCreditoDataTransmissaoOriginal(d);
        const origDebitos = d.debitos.reduce((acc, deb) => acc + deb.valorTotalOriginal, 0);
        const origCreditoUsado = d.valorUtilizadoPerdcompOriginal;
        const origSaldo = getSaldoProximaDcompOriginal(d, origCreditoTransmissao - origCreditoUsado);

        const novoCreditoDetalhado = d.valorTotalCreditoDetalhado;
        const novoCreditoTransmissao = getCreditoDataTransmissaoRecalculado(d);
        const novoDebitos = d.debitos.reduce((acc, deb) => acc + deb.valorTotal, 0);
        const novoCreditoUsado = d.valorUtilizadoPerdcomp;
        const novoSaldo = d.saldoCreditoOriginalCalculado ?? 0;

        colateralOriginalBody.push([
          d.id,
          formatCurrency(origCreditoDetalhado),
          formatCurrency(origCreditoTransmissao),
          formatCurrency(origDebitos),
          formatCurrency(origCreditoUsado),
          formatCurrency(origSaldo),
          criarIndicadoresRastreabilidade(simulacao, d, CAMPOS_RASTREIO_ORIGINAIS)
        ]);

        colateralNovoBody.push([
          d.id,
          formatCurrency(novoCreditoDetalhado),
          formatCurrency(novoCreditoTransmissao),
          formatCurrency(novoDebitos),
          formatCurrency(novoCreditoUsado),
          formatCurrency(novoSaldo),
          criarIndicadoresRastreabilidade(simulacao, d, CAMPOS_RASTREIO_RECALCULADOS)
        ]);
      });

      doc.setFontSize(11);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('Valores Importados e Calculados Históricos', 14, startY);
      startY += 4;

      autoTable(doc, {
        startY: startY,
        head: [['PER/DCOMP', 'Valor Crédito Inicial', 'Créd. Data Transm.', 'Débitos Compensados', 'Créd. Orig. Usado', 'Saldo Próx. DCOMP', 'Indicadores']],
        body: colateralOriginalBody,
        rowPageBreak: 'avoid',
        headStyles: { fillColor: headerNeutralBg, textColor: headerNeutralText }, 
        styles: { fontSize: 7, cellPadding: 2, textColor: textColor, fillColor: tableBg, lineColor: tableLineColor },
        alternateRowStyles: { fillColor: tableAltBg },
        columnStyles: {
          6: { cellWidth: 36, minCellHeight: 18, halign: 'center' }
        },
        ...traceBadgeHooks(6)
      });

      startY = getLastAutoTableFinalY(doc, startY) + 10;

      if (startY > pageHeight - 40) {
        doc.addPage();
        drawBackground();
        startY = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(dangerRed[0], dangerRed[1], dangerRed[2]);
      doc.text('Valores Simulados / Recalculados (Colaterais)', 14, startY);
      startY += 4;

      autoTable(doc, {
        startY: startY,
        head: [['PER/DCOMP', 'Valor Crédito Inicial', 'Créd. Data Transm.', 'Débitos Compensados', 'Créd. Orig. Usado', 'Saldo Próx. DCOMP', 'Indicadores']],
        body: colateralNovoBody,
        rowPageBreak: 'avoid',
        headStyles: { fillColor: dangerRed, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2, textColor: textColor, fillColor: tableBg, lineColor: tableLineColor },
        alternateRowStyles: { fillColor: tableAltBg },
        columnStyles: {
          6: { cellWidth: 36, minCellHeight: 18, halign: 'center' }
        },
        ...traceBadgeHooks(6)
      });

      startY = getLastAutoTableFinalY(doc, startY) + 14;
    }

    // 3º PER/DCOMPs Hipotéticas Injetadas
    const dcompsHipoteticas = simulacao.dcomps.filter(d => d.indicadorCredito === 'Hipotético');
    
    if (dcompsHipoteticas.length > 0) {
      if (startY > pageHeight - 50) {
        doc.addPage();
        startY = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text('3º Injeção de PER/DCOMPs Hipotéticas', 14, startY);
      startY += 6;
      
      const hipoteticaBody: RowInput[] = [];
      dcompsHipoteticas.forEach(d => {
        hipoteticaBody.push([
          d.id,
          formatCurrency(d.valorCreditoDataTransmissao),
          formatCurrency(d.debitos.reduce((acc, deb) => acc + deb.valorTotal, 0)),
          formatCurrency(d.valorUtilizadoPerdcomp),
          formatCurrency(d.saldoCreditoOriginalCalculado ?? 0),
          criarIndicadoresRastreabilidade(
            simulacao,
            d,
            ['valorCreditoDataTransmissao', 'debitosTotal', 'valorUtilizadoPerdcomp', 'saldoCreditoOriginalCalculado'],
          )
        ]);
      });
      
      autoTable(doc, {
        startY: startY,
        head: [['PER/DCOMP Hipotética', 'Créd. Data Transm.', 'Débitos', 'Créd. Orig. Usado', 'Saldo Próx. DCOMP', 'Indicadores']],
        body: hipoteticaBody,
        rowPageBreak: 'avoid',
        headStyles: { fillColor: successGreen, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2, textColor: textColor, fillColor: tableBg, lineColor: tableLineColor },
        alternateRowStyles: { fillColor: tableAltBg },
        columnStyles: {
          5: { cellWidth: 36, minCellHeight: 18, halign: 'center' }
        },
        ...traceBadgeHooks(5)
      });
      
      startY = getLastAutoTableFinalY(doc, startY) + 14;
    }
  });

  doc.save('Relatorio_Consolidado_Simulacoes.pdf');
};
