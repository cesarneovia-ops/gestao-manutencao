import { useEffect, useState } from 'react';

interface PWAEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function ehIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && 'ontouchend' in document)
  );
}

export default function InstalarApp() {
  const [pwaEvt, setPwaEvt] = useState<PWAEvent | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [mostraAjuda, setMostraAjuda] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const ios = ehIOS();
  const standalone = 'standalone' in navigator ? (navigator as any).standalone === true : false;

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setPwaEvt(e as PWAEvent); };
    const onInstalled = () => setInstalado(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function compartilhar() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: 'Gestão de Manutenção Predial', text: 'Sistema de gestão de OS', url }); return; } catch { /* cancelado */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch { setMostraAjuda(true); }
  }

  function clicarInstalar() {
    if (pwaEvt) {
      pwaEvt.prompt();
      pwaEvt.userChoice.then((r) => { if (r.outcome === 'accepted') setInstalado(true); });
    } else {
      setMostraAjuda(true);
    }
  }

  if (instalado || standalone) return null;

  const btn = {
    position: 'fixed' as const,
    bottom: 18,
    right: 18,
    zIndex: 1000,
    border: 'none',
    borderRadius: 999,
    padding: '12px 18px',
    fontSize: 15,
    fontWeight: 700,
    color: '#fff',
    background: 'var(--primary)',
    boxShadow: '0 4px 14px rgba(0,0,0,.25)',
    cursor: 'pointer'
  };

  return (
    <>
      <button style={btn} onClick={clicarInstalar}>
        📲 Instalar app
      </button>

      {mostraAjuda && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }} onClick={() => setMostraAjuda(false)}>
          <div style={{ background: 'var(--surface,#fff)', borderRadius: 14, padding: 22, maxWidth: 380, width: '100%', color: 'var(--text,#212529)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMostraAjuda(false)} style={{ position: 'absolute', top: 8, right: 12, border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            <h3 style={{ marginTop: 0 }}>📲 Instalar o aplicativo</h3>
            {ios ? (
              <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Toque no botão <b>Compartilhar</b> ⤴️ (navegador Safari);</li>
                <li>Escolha <b>“Adicionar à Tela de Início”</b>;</li>
                <li>Toque em <b>Adicionar</b>.</li>
              </ol>
            ) : (
              <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                <li>Abra o menu do navegador (⋮ ou ⋯);</li>
                <li>Escolha <b>“Instalar aplicativo”</b> ou “Adicionar à tela de início”;</li>
                <li>Confirme a instalação.</li>
              </ol>
            )}
            <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid rgba(0,0,0,.12)' }} />
            <strong>Link do app:</strong>
            <div style={{ fontSize: 12, margin: '6px 0 12px', wordBreak: 'break-all', opacity: .85 }}>{window.location.href}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={compartilhar}
                style={{ flex: 1, border: 'none', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontWeight: 600, color: '#fff', background: 'var(--primary)', cursor: 'pointer' }}
              >
                {copiado ? '✅ Link copiado!' : '🔗 Compartilhar link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}