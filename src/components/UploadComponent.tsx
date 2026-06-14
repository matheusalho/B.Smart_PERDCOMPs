import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Database, Loader2, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { mockCadeias } from '../mockData';
import { useStore } from '../store';

export const UploadComponent: React.FC = () => {
  const importarDados = useStore(state => state.importarDados);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      toast.error('Formato de arquivo inválido. Envie apenas planilhas Excel (.xlsx).');
      return;
    }

    setLoading(true);
    setProgressMsg('Lendo arquivo...');

    try {
      const file = acceptedFiles[0];
      const buffer = await file.arrayBuffer();

      setProgressMsg('Processando dados e simulando regras (isto pode levar alguns segundos)...');

      const worker = new Worker(new URL('../workers/excelWorker.ts', import.meta.url), { type: 'module' });

      worker.onmessage = (e) => {
        const { success, cadeias, empresa, importQualityReport, error: workerError } = e.data;

        if (success) {
          toast.success('Planilha processada com sucesso!');
          importarDados(cadeias, empresa, true, importQualityReport);
        } else {
          toast.error(workerError || 'Erro desconhecido ao processar a planilha.');
          setLoading(false);
        }

        worker.terminate();
      };

      worker.onerror = async (err: Event | ErrorEvent) => {
        err.preventDefault?.();
        console.error(err);
        worker.terminate();

        const errMsg = describeWorkerError(err);
        setProgressMsg('Worker indisponível. Processando no thread principal...');
        toast.error(`Worker indisponível: ${errMsg}. Tentando fallback local.`);

        try {
          const fallbackBuffer = await file.arrayBuffer();
          const { processExcelBuffer } = await import('../services/importPipeline');
          const { cadeias, empresa, importQualityReport } = processExcelBuffer(fallbackBuffer);

          toast.success('Planilha processada com sucesso pelo fallback local.');
          importarDados(cadeias, empresa, true, importQualityReport);
        } catch (fallbackError) {
          console.error(fallbackError);
          toast.error(
            fallbackError instanceof Error
              ? `Falha ao processar a planilha: ${fallbackError.message}`
              : 'Falha ao processar a planilha.',
          );
          setLoading(false);
        }
      };

      worker.onmessageerror = (err) => {
        console.error(err);
        toast.error('Falha ao transferir dados entre a tela e o Worker.');
        setLoading(false);
        worker.terminate();
      };

      worker.postMessage({ buffer }, [buffer]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido ao ler o arquivo.');
      console.error(err);
      setLoading(false);
    }
  }, [importarDados]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', marginTop: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '800px', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '2.5rem', color: 'var(--color-text-main)', marginBottom: '1rem' }}>
          Simulador de Cascatas Tributárias
        </h2>
        <p className="text-muted" style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
          Faça o upload do seu relatório em Excel extraído do e-CAC. O B.Smart mapeará automaticamente todas as suas PER/DCOMPs, calculará os reflexos das atualizações da Selic e montará a cadeia relacional completa de forma visual.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`dropzone upload-area ${isDragActive ? 'active' : ''}`}
        style={{
          width: '100%',
          maxWidth: '600px',
        }}
      >
        <input {...getInputProps()} />
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Loader2 className="animate-spin mx-auto" size={48} color="var(--color-primary)" />
            <div style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {progressMsg}
            </div>
          </div>
        ) : (
          <div className="icon-container" style={{ marginBottom: '1.5rem' }}>
            <UploadCloud size={64} className="mx-auto" />
          </div>
        )}
        <h3 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>
          {isDragActive ? 'Solte o arquivo aqui...' : 'Arraste o Relatório e-CAC'}
        </h3>
        <p className="text-muted" style={{ fontSize: '0.95rem' }}>
          Ou clique para selecionar um arquivo (.xlsx)
        </p>
      </div>

      <button
        className="btn btn-ghost"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}
        onClick={() => {
          importarDados(mockCadeias, { cnpj: '00.000.000/0001-00', razaoSocial: 'EMPRESA MOCK DE EXEMPLO S/A' });
          toast.success('Dados de exemplo carregados!');
        }}
      >
        <Database size={18} />
        Carregar Dados de Exemplo (Mock)
      </button>
    </div>
  );
};

function describeWorkerError(err: Event | ErrorEvent): string {
  if ('message' in err && err.message) {
    const location = 'filename' in err && err.filename
      ? ` (${err.filename}:${err.lineno || 0}:${err.colno || 0})`
      : '';

    return `${err.message}${location}`;
  }

  return 'erro de carregamento ou execução sem mensagem detalhada';
}
