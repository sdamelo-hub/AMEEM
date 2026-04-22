import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onSuccess: () => void;
  onRegisterClick: () => void;
  onForgotClick: () => void;
}

export default function LoginPage({ onSuccess, onRegisterClick, onForgotClick }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Veuillez remplir tous les champs'); return; }
    setLoading(true); setError('');
    try {
      await login(email, password);
      onSuccess();
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('non trouvé')) setError('Aucun compte trouvé avec cet email.');
      else if (msg.includes('incorrect') || msg.includes('password')) setError('Mot de passe incorrect. Vérifiez votre saisie.');
      else if (msg.includes('network') || msg.includes('unavailable')) setError('Erreur réseau. Vérifiez votre connexion.');
      else setError('Identifiants incorrects. Veuillez réessayer.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a56db 0%, #059669 100%)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', padding: '50px 20px 30px', color: 'white' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '2px solid rgba(255,255,255,0.4)', overflow: 'hidden' }}>
          <img src="/icons/icon-128.png" alt="AMEEM" style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src='/icons/logo.jpg'; }} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Connexion</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>Amicale des Étudiants de Mbour</div>
      </div>

      <div style={{ flex: 1, background: 'white', borderRadius: '24px 24px 0 0', padding: '28px 20px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Bon retour ! 👋</h2>
        <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 24 }}>Connectez-vous à votre compte</p>

        {error && <div className="alert alert-danger"><span>⚠️</span> {error}</div>}

        <div className="input-group">
          <label className="input-label">Email ou téléphone</label>
          <input className="input" type="email" placeholder="votre@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label" style={{ fontSize: 15 }}>Mot de passe</label>
          <div style={{ position: 'relative' }}>
            <input className="input" type={showPassword ? 'text' : 'password'} placeholder="Votre mot de passe" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ paddingRight: 48 }} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button onClick={onForgotClick} style={{ color: '#1a56db', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', marginBottom: 20, display: 'block', textAlign: 'right', width: '100%', fontWeight: 500 }}>
          Mot de passe oublié ?
        </button>

        <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? '⏳ Connexion...' : '🔓 Se connecter'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
          Pas encore de compte ?{' '}
          <button onClick={onRegisterClick} style={{ color: '#1a56db', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
            S'inscrire
          </button>
        </div>
      </div>
    </div>
  );
}
