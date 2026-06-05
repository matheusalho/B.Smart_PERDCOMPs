import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Loader2, Database } from 'lucide-react';
import { parseExcelFile } from '../services/ExcelParser';
import { useStore } from '../store';
import { mockCadeias } from '../mockData';

export const UploadComponent: React.FC = () => {
  const importarDados = useStore(state => state.importarDados);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setLoading(true);
    setError(null);
    try {
      const file = acceptedFiles[0];
      const buffer = await file.arrayBuffer();
      const cadeias = parseExcelFile(buffer);
      importarDados(cadeias);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido ao processar planilha.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [importarDados]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''}`}
        style={{
          width: '100%',
          maxWidth: '600px'
        }}
      >
        <input {...getInputProps()} />
        {loading ? (
          <Loader2 className="animate-spin text-primary mx-auto mb-4" size={48} />
        ) : (
          <UploadCloud className="text-muted mx-auto mb-4" size={48} />
        )}
        <h3 style={{ marginBottom: '1rem' }}>
          {isDragActive ? 'Solte o arquivo aqui...' : 'Arraste o Relatório e-CAC (Excel)'}
        </h3>
        <p className="text-muted">
          Ou clique para selecionar um arquivo .xlsx
        </p>
      </div>

      <button 
        className="btn btn-ghost" 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}
        onClick={() => importarDados(mockCadeias)}
      >
        <Database size={18} />
        Carregar Dados de Exemplo (Mock)
      </button>

      {error && (
        <div style={{ 
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          color: 'var(--color-danger)', 
          padding: '1rem', 
          borderRadius: '8px',
          maxWidth: '600px',
          width: '100%',
          textAlign: 'center'
        }}>
          <strong>Erro na Importação:</strong> {error}
        </div>
      )}
    </div>
  );
};
