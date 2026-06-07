import { parseExcelFile } from '../services/ExcelParser';
import { recalcularCadeia } from '../services/CalculoService';

self.onmessage = (e: MessageEvent) => {
  try {
    const { buffer } = e.data;
    const { cadeias, empresa, importQualityReport } = parseExcelFile(buffer);
    
    // Recalcula tudo no worker para tirar o peso da Main Thread
    const cadeiasRecalculadas = cadeias.map(c => recalcularCadeia(c));
    
    self.postMessage({ success: true, cadeias: cadeiasRecalculadas, empresa, importQualityReport });
  } catch (error) {
    self.postMessage({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao processar a planilha.' });
  }
};
