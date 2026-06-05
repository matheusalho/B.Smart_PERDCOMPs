import { useState, useEffect } from 'react';
import { DashboardCadeias } from './components/DashboardCadeias';
import { UploadComponent } from './components/UploadComponent';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { useStore } from './store';
import { Sun, Moon, RotateCcw } from 'lucide-react';

function App() {
  const cadeias = useStore(state => state.cadeias);
  const temDados = Object.keys(cadeias).length > 0;
  const limparDados = useStore(state => state.limparDados);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <>
      <div className="bg-mesh-gradient"></div>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div className="container" style={{ flex: 1 }}>
          <header style={{ borderBottom: '1px solid var(--color-glass-border)', paddingBottom: '1.5rem', marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                overflow: 'hidden', 
                width: '36px', 
                height: '36px', 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                borderRadius: '0',
                padding: '0'
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
              <div style={{ paddingBottom: '0' }}>
                <h1 style={{ color: 'var(--color-primary)', fontSize: '1.25rem', margin: 0, fontWeight: 800 }}>B.Smart PER/DCOMPs</h1>
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
              {temDados && (
                <button 
                  className="btn btn-ghost" 
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
