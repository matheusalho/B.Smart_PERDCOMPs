import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseExcelFile } from '../../ExcelParser';
import { calcularSelicRastreavel } from '../selicService';

const sheetsDir = resolve(process.cwd(), '..', 'Sheets');

describe('SelicService - dados reais importados', () => {
  it('calcula SELIC normativa rastreavel para saldo negativo IRPJ com taxa injetada e dados suficientes', () => {
    const dcomp = findDcomp('06251.86776.210720.1.7.02-1771');

    const result = calcularSelicRastreavel({
      dcomp,
      totalDebitosDocumento: dcomp.valorUtilizadoPerdcompOriginal,
      taxaSelicDecimal: 0.1,
      fonteTabelaSelic: 'fixture_taxa_validada',
    });

    expect(result.statusCalculo).toBe('normativo');
    expect(result.origemValor).toBe('calculado_motor');
    expect(result.metodo).toBe('selic_normativa_por_tipo_credito');
    expect(result.valor?.tipoCreditoId).toBe('saldo_negativo_irpj');
    expect(result.valor?.termoInicialMes).toBe('2016-01');
    expect(result.valor?.termoFinalMes).toBe('2016-03');
    expect(result.valor?.taxaSelicDecimal).toBe(0.1);
    expect(result.valor?.creditoOriginalUtilizadoCalculado).toBeCloseTo(
      dcomp.valorUtilizadoPerdcompOriginal / 1.1,
      2,
    );
    expect(result.dadosAusentes).toEqual([]);
    expect(result.dadosUsados).toContain('periodoApuracaoCredito');
    expect(result.dadosUsados).toContain('taxaSelicDecimal');
  });

  it('calcula SELIC normativa rastreavel para saldo negativo CSLL com taxa injetada', () => {
    const dcomp = findDcomp('17339.63413.191224.1.3.03-0151');
    const result = calcularSelicRastreavel({
      dcomp,
      totalDebitosDocumento: dcomp.valorUtilizadoPerdcompOriginal,
      taxaSelicDecimal: 0.1,
      fonteTabelaSelic: 'fixture_taxa_validada',
    });

    if (dcomp.periodoApuracaoCredito) {
      expect(result.statusCalculo).toBe('normativo');
      expect(result.valor?.tipoCreditoId).toBe('saldo_negativo_csll');
      expect(result.dadosUsados).toContain('periodoApuracaoCredito');
    } else {
      expect(result.statusCalculo).toBe('dados_insuficientes');
      expect(result.dadosAusentes).toContain('periodoApuracaoCredito');
    }
  });

  it('calcula SELIC normativa rastreavel para pagamento indevido a maior com taxa injetada', () => {
    const dcomp = findDcomp('04545.00403.181224.1.3.04-9218');
    const result = calcularSelicRastreavel({
      dcomp,
      totalDebitosDocumento: dcomp.valorUtilizadoPerdcompOriginal,
      taxaSelicDecimal: 0.1,
      fonteTabelaSelic: 'fixture_taxa_validada',
    });

    if (dcomp.metadadosCreditoImportado?.dataArrecadacaoCredito) {
      expect(result.statusCalculo).toBe('normativo');
      expect(result.valor?.tipoCreditoId).toBe('pagamento_indevido_maior');
    } else {
      expect(result.statusCalculo).toBe('dados_insuficientes');
      expect(result.dadosAusentes).toContain('dataArrecadacaoCredito');
    }
  });

  it('calcula SELIC normativa rastreavel para contribuicao previdenciaria indevida a maior com taxa injetada', () => {
    const dcomp = findDcomp('37701.32986.170423.1.3.16-2407');
    const result = calcularSelicRastreavel({
      dcomp,
      totalDebitosDocumento: dcomp.valorUtilizadoPerdcompOriginal,
      taxaSelicDecimal: 0.1,
      fonteTabelaSelic: 'fixture_taxa_validada',
    });

    if (dcomp.metadadosCreditoImportado?.dataArrecadacaoCredito) {
      expect(result.statusCalculo).toBe('normativo');
      expect(result.valor?.tipoCreditoId).toBe('contribuicao_previdenciaria_indevida_maior');
    } else {
      expect(result.statusCalculo).toBe('dados_insuficientes');
      expect(result.dadosAusentes).toContain('dataArrecadacaoCredito');
    }
  });

  it('calcula SELIC normativa rastreavel para pagamento indevido eSocial com taxa injetada', () => {
    const dcomp = findDcomp('09896.37478.250424.1.3.24-6461');
    const result = calcularSelicRastreavel({
      dcomp,
      totalDebitosDocumento: dcomp.valorUtilizadoPerdcompOriginal,
      taxaSelicDecimal: 0.1,
      fonteTabelaSelic: 'fixture_taxa_validada',
    });

    if (dcomp.metadadosCreditoImportado?.dataArrecadacaoCredito) {
      expect(result.statusCalculo).toBe('normativo');
      expect(result.valor?.tipoCreditoId).toBe('pagamento_indevido_maior_esocial');
    } else {
      expect(result.statusCalculo).toBe('dados_insuficientes');
      expect(result.dadosAusentes).toContain('dataArrecadacaoCredito');
    }
  });

  it('retorna dados insuficientes para credito judicial real sem componentes importados', () => {
    const dcomp = findDcomp('32552.06818.210225.1.3.57-2529');

    const result = calcularSelicRastreavel({
      dcomp,
      totalDebitosDocumento: dcomp.valorUtilizadoPerdcompOriginal,
      taxaSelicDecimal: 0.1,
      fonteTabelaSelic: 'fixture_taxa_validada',
    });

    expect(result.statusCalculo).toBe('dados_insuficientes');
    expect(result.valor).toBeUndefined();
    expect(result.dadosAusentes).toContain('componentesCreditoJudicial');
    expect(result.alertas).toContain('credito_judicial_sem_componentes_importados');
  });

  it('mantem fator historico como fallback identificado quando taxa normativa esta ausente', () => {
    const dcomp = findDcomp('06251.86776.210720.1.7.02-1771');

    const result = calcularSelicRastreavel({
      dcomp,
      totalDebitosDocumento: dcomp.valorUtilizadoPerdcompOriginal,
      fatorHistorico: 1.25,
    });

    expect(result.statusCalculo).toBe('estimativa_historica');
    expect(result.metodo).toBe('fator_historico_identificado');
    expect(result.origemValor).toBe('fallback_operacional');
    expect(result.valor?.creditoOriginalUtilizadoCalculado).toBeCloseTo(
      dcomp.valorUtilizadoPerdcompOriginal / 1.25,
      2,
    );
    expect(result.dadosAusentes).toContain('taxaSelicDecimal');
  });
});

function findDcomp(dcompId: string) {
  const result = parseExcelFile(readRealSheet(latestSheetFile()));
  const dcomp = result.cadeias
    .flatMap((cadeia) => cadeia.dcomps)
    .find((item) => item.id === dcompId);

  if (!dcomp) {
    throw new Error(`DCOMP real nao encontrada: ${dcompId}`);
  }

  return dcomp;
}

function readRealSheet(fileName: string): ArrayBuffer {
  const buffer = readFileSync(resolve(sheetsDir, fileName));

  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

function latestSheetFile(): string {
  return readdirSync(sheetsDir)
    .filter((file) => file.toLowerCase().endsWith('.xlsx') && !file.startsWith('~$'))
    .map((file) => ({
      file,
      mtime: statSync(resolve(sheetsDir, file)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)[0].file;
}
