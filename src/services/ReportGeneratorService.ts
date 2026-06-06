
import type { SimulacaoSalva, CadeiaRelacional } from '../models/types';
import { format } from 'date-fns';
import { isVigente } from '../utils/statusHelper';
import type { jsPDF as JsPDFDocument } from 'jspdf';
import type { RowInput, Table } from 'jspdf-autotable';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

type AutoTableDoc = JsPDFDocument & {
  lastAutoTable?: Table;
};

const getLastAutoTableFinalY = (doc: AutoTableDoc, fallbackY: number): number => (
  doc.lastAutoTable?.finalY ?? fallbackY
);

export const generatePdfReport = async (simulacoes: SimulacaoSalva[], theme: 'dark' | 'light', todasAsCadeias: CadeiaRelacional[] = [], empresa: { razaoSocial: string; cnpj: string } | null = null) => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  }) as AutoTableDoc;

  const isDark = theme === 'dark';
  const pageHeight = doc.internal.pageSize.getHeight();
  
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
    doc.addImage(logoBase64 as string, 'PNG', 176, 16, 20, 20);
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
  doc.text('Emitido em:', 196, 44, { align: 'right' });
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), 196, 50, { align: 'right' });
  
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
  doc.line(14, currentY + 4, 196, currentY + 4);

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

  simulacoes.forEach((simulacao, index) => {
    // Nova página se não couber a próxima simulação
    if (index > 0 && startY > pageHeight - 60) {
      doc.addPage();
      startY = 20;
    } else if (index > 0) {
      startY += 10;
      doc.setDrawColor(tableBorder[0], tableBorder[1], tableBorder[2]);
      doc.line(14, startY, 196, startY);
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

      // Adicionar as tabelas comparativas "Antes e Depois" para as edições manuais
      const editadasOriginalBody: RowInput[] = [];
      const editadasNovoBody: RowInput[] = [];

      dcompsEditadas.forEach(d => {
        const origCreditoDetalhado = d.valorTotalCreditoDetalhadoOriginal;
        const origCreditoTransmissao = d.divergenciaDetalhes?.esperado ?? d.valorCreditoDataTransmissao;
        const origDebitos = d.debitos.reduce((acc, deb) => acc + deb.valorTotalOriginal, 0);
        const origCreditoUsado = d.valorUtilizadoPerdcompOriginal;
        const origSaldoProx = d.saldoCreditoOriginalAnterior ?? 0;

        const novoCreditoDetalhado = d.valorTotalCreditoDetalhado;
        const novoCreditoTransmissao = d.divergenciaDetalhes?.calculado ?? d.valorCreditoDataTransmissao;
        const novoDebitos = d.debitos.reduce((acc, deb) => acc + deb.valorTotal, 0);
        const novoCreditoUsado = d.valorUtilizadoPerdcomp;
        const novoSaldoProx = d.saldoCreditoOriginalCalculado ?? 0;

        editadasOriginalBody.push([
          d.id,
          formatCurrency(origCreditoDetalhado),
          formatCurrency(origCreditoTransmissao),
          formatCurrency(origDebitos),
          formatCurrency(origCreditoUsado),
          formatCurrency(origSaldoProx)
        ]);

        editadasNovoBody.push([
          d.id,
          formatCurrency(novoCreditoDetalhado),
          formatCurrency(novoCreditoTransmissao),
          formatCurrency(novoDebitos),
          formatCurrency(novoCreditoUsado),
          formatCurrency(novoSaldoProx)
        ]);
      });

      if (startY > pageHeight - 50) {
        doc.addPage();
        startY = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('Valores Anteriores (Originais)', 14, startY);
      startY += 4;

      autoTable(doc, {
        startY: startY,
        head: [['PER/DCOMP', 'Valor Crédito Inicial', 'Créd. Data Transm.', 'Débitos Compensados', 'Créd. Orig. Usado', 'Saldo Próx. DCOMP']],
        body: editadasOriginalBody,
        headStyles: { fillColor: headerNeutralBg, textColor: headerNeutralText }, 
        styles: { fontSize: 7, cellPadding: 2, textColor: textColor, fillColor: tableBg, lineColor: tableLineColor },
        alternateRowStyles: { fillColor: tableAltBg }
      });

      startY = getLastAutoTableFinalY(doc, startY) + 10;

      if (startY > pageHeight - 40) {
        doc.addPage();
        drawBackground();
        startY = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(baleraBlue[0], baleraBlue[1], baleraBlue[2]);
      doc.text('Novos Valores Corretos', 14, startY);
      startY += 4;

      autoTable(doc, {
        startY: startY,
        head: [['PER/DCOMP', 'Valor Crédito Inicial', 'Créd. Data Transm.', 'Débitos Compensados', 'Créd. Orig. Usado', 'Saldo Próx. DCOMP']],
        body: editadasNovoBody,
        headStyles: { fillColor: baleraBlue, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2, textColor: textColor, fillColor: tableBg, lineColor: tableLineColor },
        alternateRowStyles: { fillColor: tableAltBg }
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

    const dcompsAfetadas = simulacao.dcomps.filter(d => 
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

      dcompsAfetadas.forEach(d => {
        // Obter os valores antigos
        const origCreditoDetalhado = d.valorTotalCreditoDetalhadoOriginal;
        const origCreditoTransmissao = d.divergenciaDetalhes?.esperado ?? d.valorCreditoDataTransmissao;
        const origDebitos = d.debitos.reduce((acc, deb) => acc + deb.valorTotalOriginal, 0);
        const origCreditoUsado = d.valorUtilizadoPerdcompOriginal;
        const origSaldoProx = d.saldoCreditoOriginalAnterior ?? 0;

        // Obter os valores novos
        const novoCreditoDetalhado = d.valorTotalCreditoDetalhado;
        const novoCreditoTransmissao = d.divergenciaDetalhes?.calculado ?? d.valorCreditoDataTransmissao;
        const novoDebitos = d.debitos.reduce((acc, deb) => acc + deb.valorTotal, 0);
        const novoCreditoUsado = d.valorUtilizadoPerdcomp;
        const novoSaldoProx = d.saldoCreditoOriginalCalculado ?? 0;

        colateralOriginalBody.push([
          d.id,
          formatCurrency(origCreditoDetalhado),
          formatCurrency(origCreditoTransmissao),
          formatCurrency(origDebitos),
          formatCurrency(origCreditoUsado),
          formatCurrency(origSaldoProx)
        ]);

        colateralNovoBody.push([
          d.id,
          formatCurrency(novoCreditoDetalhado),
          formatCurrency(novoCreditoTransmissao),
          formatCurrency(novoDebitos),
          formatCurrency(novoCreditoUsado),
          formatCurrency(novoSaldoProx)
        ]);
      });

      doc.setFontSize(11);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('Valores Anteriores (Originais)', 14, startY);
      startY += 4;

      autoTable(doc, {
        startY: startY,
        head: [['PER/DCOMP', 'Valor Crédito Inicial', 'Créd. Data Transm.', 'Débitos Compensados', 'Créd. Orig. Usado', 'Saldo Próx. DCOMP']],
        body: colateralOriginalBody,
        headStyles: { fillColor: headerNeutralBg, textColor: headerNeutralText }, 
        styles: { fontSize: 7, cellPadding: 2, textColor: textColor, fillColor: tableBg, lineColor: tableLineColor },
        alternateRowStyles: { fillColor: tableAltBg }
      });

      startY = getLastAutoTableFinalY(doc, startY) + 10;

      if (startY > pageHeight - 40) {
        doc.addPage();
        drawBackground();
        startY = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(dangerRed[0], dangerRed[1], dangerRed[2]);
      doc.text('Novos Valores Corretos (Colaterais)', 14, startY);
      startY += 4;

      autoTable(doc, {
        startY: startY,
        head: [['PER/DCOMP', 'Valor Crédito Inicial', 'Créd. Data Transm.', 'Débitos Compensados', 'Créd. Orig. Usado', 'Saldo Próx. DCOMP']],
        body: colateralNovoBody,
        headStyles: { fillColor: dangerRed, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2, textColor: textColor, fillColor: tableBg, lineColor: tableLineColor },
        alternateRowStyles: { fillColor: tableAltBg }
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
          formatCurrency(d.saldoCreditoOriginalCalculado ?? 0)
        ]);
      });
      
      autoTable(doc, {
        startY: startY,
        head: [['PER/DCOMP Hipotética', 'Créd. Data Transm.', 'Débitos', 'Créd. Orig. Usado', 'Saldo Próx. DCOMP']],
        body: hipoteticaBody,
        headStyles: { fillColor: successGreen, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2, textColor: textColor, fillColor: tableBg, lineColor: tableLineColor },
        alternateRowStyles: { fillColor: tableAltBg }
      });
      
      startY = getLastAutoTableFinalY(doc, startY) + 14;
    }
  });

  doc.save('Relatorio_Consolidado_Simulacoes.pdf');
};
