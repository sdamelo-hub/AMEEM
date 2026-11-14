import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

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
    <div className="login-shell">
      <div className="login-top">
        <img className="login-logo" src="/icons/icon-128.png" alt="AMEEM"
          onError={(e) => { (e.target as HTMLImageElement).src = '/icons/logo.jpg'; }} />
        <div className="login-brand">AMEEM</div>
        <div className="login-tag">Amicale des Étudiants de Mbour</div>
      </div>

      <form className="login-sheet" onSubmit={e => { e.preventDefault(); handleLogin(); }}>
        <h1 className="login-title">Connexion</h1>
        <p className="login-sub">Accédez à votre espace membre</p>

        {error && <div className="login-error" role="alert">{error}</div>}

        <div className="login-field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" className="login-input" type="text" inputMode="email" autoComplete="username"
            autoCapitalize="none" placeholder="exemple@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div className="login-field">
          <label htmlFor="login-password">Mot de passe</label>
          <div className="login-pwd">
            <input id="login-password" className="login-input" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
              placeholder="Votre mot de passe" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="login-eye" onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>
        </div>

        <div className="login-forgot">
          <button type="button" onClick={onForgotClick}>Mot de passe oublié ?</button>
        </div>

        <button type="submit" className="login-submit" disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        <div className="login-spacer" />

        <div className="login-foot">
          Pas encore de compte ?{' '}
          <button type="button" onClick={onRegisterClick}>Créer un compte</button>
        </div>
      </form>
    </div>
  );
}