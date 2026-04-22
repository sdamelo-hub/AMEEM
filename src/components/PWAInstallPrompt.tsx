import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa_dismissed');
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowBanner(false);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_dismissed', '1');
  };

  if (!showBanner || installed) return null;

  return (
    <div className="pwa-modal" style={{ zIndex: 500 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Installer l'application</div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          Installez <strong>AMEEM</strong> sur votre téléphone pour un accès rapide, comme WhatsApp ou Facebook !
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {['📶 Fonctionne hors ligne', '⚡ Accès rapide', '🔔 Notifications'].map(f => (
          <div key={f} style={{ flex: 1, background: '#f0f9ff', borderRadius: 8, padding: '8px 6px', textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#1a56db' }}>{f}</div>
        ))}
      </div>
      <button className="btn btn-primary" onClick={handleInstall} style={{ marginBottom: 10 }}>
        📲 Installer sur mon téléphone
      </button>
      <button onClick={handleDismiss} style={{ width: '100%', background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', padding: 8 }}>
        Plus tard
      </button>
    </div>
  );
}
