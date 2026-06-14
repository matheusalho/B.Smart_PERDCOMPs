import { processExcelBuffer } from '../services/importPipeline';

self.onmessage = (e: MessageEvent) => {
  try {
    const { buffer } = e.data;
    const { cadeias, empresa, importQualityReport } = processExcelBuffer(buffer);

    self.postMessage({ success: true, cadeias, empresa, importQualityReport });
  } catch (error) {
    self.postMessage({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao processar a planilha.' });
  }
};
