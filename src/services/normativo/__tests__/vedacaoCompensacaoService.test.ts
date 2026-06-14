import { describe, expect, it } from 'vitest';

import { verificarVedacaoDebito } from '../vedacaoCompensacaoService';

const debitoPrevidenciario = {
  codigoReceita: '1191-01',
  dataVencimento: '20/09/2023',
};

describe('vedacaoCompensacaoService', () => {
  it('emite alerta de compensacao cruzada para credito anterior ao PA 08/2018', () => {
    const alertas = verificarVedacaoDebito(
      debitoPrevidenciario,
      new Date('2023-09-01T00:00:00'),
      'COMPETENCIA 07/2018',
    );

    expect(alertas.map(alerta => alerta.codigo)).toContain('VED-DCTFWEB-CRUZADA');
  });

  it('nao emite alerta de compensacao cruzada para credito no PA 08/2018', () => {
    const alertas = verificarVedacaoDebito(
      debitoPrevidenciario,
      new Date('2023-09-01T00:00:00'),
      'COMPETENCIA 08/2018',
    );

    expect(alertas.map(alerta => alerta.codigo)).not.toContain('VED-DCTFWEB-CRUZADA');
  });

  it('nao emite alerta de compensacao cruzada para credito posterior ao PA 08/2018', () => {
    const alertas = verificarVedacaoDebito(
      debitoPrevidenciario,
      new Date('2023-09-01T00:00:00'),
      'EXERCICIO 2023 (DE 01/01/2022 A 31/12/2022)',
    );

    expect(alertas.map(alerta => alerta.codigo)).not.toContain('VED-DCTFWEB-CRUZADA');
  });
});
