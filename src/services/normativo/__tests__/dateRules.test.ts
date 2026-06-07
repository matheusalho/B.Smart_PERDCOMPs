import { describe, expect, it } from 'vitest';

import {
  ajustarEntregaArt157,
  calcularTermoInicialArt152,
  calcularTermoInicialPagamento,
  calcularTermoInicialRetencaoPrevidenciaria,
  calcularTermoInicialSaldoNegativo,
} from '../dateRules';

describe('dateRules', () => {
  it('calcula termo inicial de pagamento indevido no mes seguinte ao pagamento', () => {
    const result = calcularTermoInicialPagamento(new Date('2024-01-15T00:00:00'));

    expect(result.statusCalculo).toBe('normativo');
    expect(result.valor?.termoInicialMes).toBe('2024-02');
  });

  it('calcula termo inicial de saldo negativo no mes seguinte ao fim do periodo de apuracao', () => {
    const result = calcularTermoInicialSaldoNegativo(new Date('2023-12-31T00:00:00'));

    expect(result.statusCalculo).toBe('normativo');
    expect(result.valor?.termoInicialMes).toBe('2024-01');
  });

  it('calcula termo inicial de retencao previdenciaria no segundo mes seguinte a competencia', () => {
    const result = calcularTermoInicialRetencaoPrevidenciaria('2024-01');

    expect(result.statusCalculo).toBe('normativo');
    expect(result.valor?.termoInicialMes).toBe('2024-03');
  });

  it('calcula termo inicial preliminar do art 152 no mes seguinte ao 361 dia do PER original', () => {
    const result = calcularTermoInicialArt152(new Date('2024-01-10T00:00:00'));

    expect(result.statusCalculo).toBe('normativo');
    expect(result.valor?.termoInicialMes).toBe('2025-02');
    expect(result.hipoteses).toContain('contagem_calendario_pendente_validacao_usuario');
  });

  it('retorna dados insuficientes quando a data do PER original nao existe', () => {
    const result = calcularTermoInicialArt152(undefined);

    expect(result.statusCalculo).toBe('dados_insuficientes');
    expect(result.dadosAusentes).toContain('dataProtocoloPerOriginal');
  });

  it('ajusta entrega transmitida em domingo para a segunda-feira seguinte sem alterar a data original', () => {
    const result = ajustarEntregaArt157(new Date('2025-06-01T00:00:00'));

    expect(result.statusCalculo).toBe('normativo');
    expect(result.valor?.dataTransmissaoOriginal.toISOString().slice(0, 10)).toBe('2025-06-01');
    expect(result.valor?.dataEntregaValoracao.toISOString().slice(0, 10)).toBe('2025-06-02');
    expect(result.valor?.ajusteArt157Aplicado).toBe(true);
  });
});
