import { useState, useEffect, useMemo, useRef } from 'react';
import { DashboardCadeias } from './components/DashboardCadeias';
import { UploadComponent } from './components/UploadComponent';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { useStore } from './store';
import { Sun, Moon, RotateCcw, FileText, FileSpreadsheet, Trash2, Database, BookOpen } from 'lucide-react';
import { generatePdfReport } from './services/ReportGeneratorService';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  const cadeias = useStore(state => state.cadeias);
  const empresa = useStore(state => state.empresa);
  const temDados = Object.keys(cadeias).length > 0;
  const limparDados = useStore(state => state.limparDados);
  const limparSimulacoesSalvas = useStore(state => state.limparSimulacoesSalvas);
  const simulacoesSalvas = useStore(state => state.simulacoesSalvas);

  const sizeKB = useMemo(() => {
    return (new Blob([JSON.stringify(simulacoesSalvas)]).size / 1024).toFixed(2);
  }, [simulacoesSalvas]);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const importQualityReport = useStore(state => state.importQualityReport);
  const [isExportingCompleto, setIsExportingCompleto] = useState(false);
  const [isMenuCompletoOpen, setIsMenuCompletoOpen] = useState(false);
  const menuCompletoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuCompletoRef.current && !menuCompletoRef.current.contains(event.target as Node)) {
        setIsMenuCompletoOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportCompleto = async (modo: 'completo' | 'ecac') => {
    if (isExportingCompleto) return;

    setIsMenuCompletoOpen(false);
    setIsExportingCompleto(true);
    try {
      const { generateRelatorioCompletoExcel } = await import('./services/ExcelCadeiasCompletasService');
      await generateRelatorioCompletoExcel({
        cadeias: Object.values(cadeias),
        empresa,
        importQualityReport,
        simulacoesSalvas,
        modo,
      });
      toast.success(
        modo === 'ecac'
          ? 'Relatório Excel (somente e-CAC) exportado.'
          : 'Relatório Excel completo exportado.',
      );
    } catch (error) {
      console.error('Falha ao exportar o relatório Excel completo:', error);
      toast.error('Não foi possível exportar o relatório Excel completo.');
    } finally {
      setIsExportingCompleto(false);
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleExportExcel = async () => {
    if (isExportingExcel) return;

    setIsExportingExcel(true);
    try {
      const { generateExcelReport } = await import('./services/ExcelReportGeneratorService');
      await generateExcelReport(simulacoesSalvas, Object.values(cadeias), empresa);
      toast.success('Relatório Excel exportado.');
    } catch (error) {
      console.error('Falha ao exportar o relatório Excel:', error);
      toast.error('Não foi possível exportar o relatório Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="bg-mesh-gradient"></div>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div className="container" style={{ flex: 1 }}>
          <header style={{ borderBottom: '1px solid var(--color-glass-border)', paddingBottom: '1.5rem', marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                overflow: 'hidden', 
                width: '36px', 
                height: '36px', 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
              }}>
                <img 
                  src="/balera_logo_novo.png" 
                  alt="Balera Logo B" 
                  style={{ 
                    height: '100%', 
                    width: '100%', 
                    objectFit: 'contain', 
                    objectPosition: 'center', 
                    filter: theme === 'light' ? 'invert(1) hue-rotate(180deg) brightness(1.2)' : 'none'
                  }} 
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <h1 style={{ color: 'var(--color-primary)', fontSize: '1.4rem', margin: 0, fontWeight: 600, letterSpacing: '-0.02em' }}>B.Smart</h1>
                <span style={{ 
                  color: 'var(--color-text-muted)', 
                  fontSize: '1rem', 
                  fontWeight: 400,
                  borderLeft: '1px solid var(--color-glass-border)',
                  paddingLeft: '0.75rem',
                  marginLeft: '0.75rem',
                }}>
                  PER/DCOMPs
                </span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button 
                className="btn btn-ghost" 
                onClick={toggleTheme}
                title={`Mudar para modo ${theme === 'dark' ? 'Claro' : 'Escuro'}`}
                style={{ padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <a
                className="btn btn-ghost"
                href="/orientacoes.html"
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir o guia de utilização (Orientações)"
                style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
              >
                <BookOpen size={16} /> Orientações
              </a>

              {simulacoesSalvas.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--color-glass-border)', paddingLeft: '1rem' }}>
                  <div 
                    className="status-led status-success tour-simulacao-memoria" 
                    data-tooltip={`Tamanho na memória: ${sizeKB} KB`}
                    style={{ cursor: 'help', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                  >
                    <Database size={14} /> {simulacoesSalvas.length} {simulacoesSalvas.length === 1 ? 'Simulação em Memória' : 'Simulações em Memória'}
                  </div>
                  <button 
                    className="btn btn-primary" 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                    onClick={() => generatePdfReport(simulacoesSalvas, theme, Object.values(cadeias), empresa)}
                    title="Exportar Relatório PDF com todas as simulações"
                  >
                    <FileText size={16} /> Relatório Consolidado
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem', minWidth: '138px' }}
                    onClick={handleExportExcel}
                    disabled={isExportingExcel}
                    title="Exportar Excel apenas com as simulações salvas"
                  >
                    <FileSpreadsheet size={16} /> {isExportingExcel ? 'Gerando...' : 'Excel das Simulações'}
                  </button>
                  <button 
                    className="btn btn-ghost text-danger" 
                    style={{ padding: '0.5rem', color: 'var(--color-danger)' }}
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja apagar permanentemente todas as simulações salvas?')) {
                        limparSimulacoesSalvas();
                      }
                    }}
                    title="Limpar todas as simulações salvas"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}

              {temDados && (
                <div ref={menuCompletoRef} style={{ position: 'relative' }}>
                  <button
                    className="btn btn-outline"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                    onClick={() => setIsMenuCompletoOpen(prev => !prev)}
                    disabled={isExportingCompleto}
                    title="Exportar todas as cadeias do Relatório de Análise e-CAC importado"
                    aria-haspopup="menu"
                    aria-expanded={isMenuCompletoOpen}
                  >
                    <FileSpreadsheet size={16} /> {isExportingCompleto ? 'Gerando...' : 'Excel Completo'}
                  </button>

                  {isMenuCompletoOpen && (
                    <div
                      role="menu"
                      className="card-glass"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 0.5rem)',
                        right: 0,
                        zIndex: 20,
                        minWidth: '320px',
                        padding: '0.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <button
                        role="menuitem"
                        className="btn btn-ghost"
                        style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.6rem 0.75rem' }}
                        onClick={() => handleExportCompleto('completo')}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>Completo — Original · Atual · Delta</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            Inclui as colunas de simulação da sessão.
                          </div>
                        </div>
                      </button>
                      <button
                        role="menuitem"
                        className="btn btn-ghost"
                        style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.6rem 0.75rem' }}
                        onClick={() => handleExportCompleto('ecac')}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>Somente valores do e-CAC</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            Apenas os valores originais importados; demais colunas mantidas.
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {temDados && (
                <button 
                  className="btn btn-ghost tour-nova-simulacao" 
                  style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-danger)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                  onClick={() => {
                    if (window.confirm('Tem certeza que deseja apagar a simulação atual e carregar uma nova planilha?')) {
                      limparDados();
                    }
                  }}
                >
                  <RotateCcw size={16} /> Nova Simulação
                </button>
              )}
              <OnboardingTutorial />
            </div>
          </header>

          <main>
            {!temDados ? (
              <UploadComponent />
            ) : (
              <DashboardCadeias />
            )}
          </main>
        </div>
      </div>
    </>
  );
}

export default App;
