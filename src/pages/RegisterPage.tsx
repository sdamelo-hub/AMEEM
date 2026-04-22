import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onSuccess: () => void;
  onLoginClick: () => void;
}

export default function RegisterPage({ onSuccess, onLoginClick }: Props) {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', level: '', major: '', password: '', confirmPassword: ''
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleStep1 = () => {
    if (!form.firstName || !form.lastName || !form.phone) {
      setError('Veuillez remplir tous les champs obligatoires'); return;
    }
    setError(''); setStep(2);
  };

  const handleSubmit = async () => {
    if (!form.password || form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères'); return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas'); return;
    }
    setLoading(true); setError('');
    try {
      await register({ ...form });
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'inscription');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a56db 0%, #059669 100%)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '40px 20px 30px', color: 'white' }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '2px solid rgba(255,255,255,0.4)', overflow: 'hidden' }}>
          <img src="/icons/icon-128.png" alt="AMEEM" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src='/icons/logo.jpg'; }} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>AMICALE MBOUROIS</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Amicale des Étudiants de Mbour</div>
      </div>

      {/* Card */}
      <div style={{ flex: 1, background: 'white', borderRadius: '24px 24px 0 0', padding: '28px 20px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: step >= 1 ? '#1a56db' : '#e5e7eb' }} />
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: step >= 2 ? '#1a56db' : '#e5e7eb' }} />
        </div>
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 20 }}>Étape {step} sur 2</div>

        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
          {step === 1 ? '👋 Créer votre compte' : '🔐 Sécuriser votre compte'}
        </h2>
        <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 20 }}>
          {step === 1 ? 'Entrez vos informations personnelles' : 'Choisissez un mot de passe sécurisé'}
        </p>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {step === 1 && (
          <div className="fade-in">
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Prénom *</label>
                <input className="input" placeholder="Prénom" value={form.firstName} onChange={e => set('firstName', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Nom *</label>
                <input className="input" placeholder="Nom" value={form.lastName} onChange={e => set('lastName', e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" placeholder="email@exemple.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Téléphone *</label>
              <input className="input" type="tel" placeholder="77 000 00 00" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Adresse</label>
              <input className="input" placeholder="Quartier, Mbour" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Niveau</label>
                <select className="input" value={form.level} onChange={e => set('level', e.target.value)}>
                  <option value="">Sélectionner</option>
                  <option>Licence 1</option><option>Licence 2</option><option>Licence 3</option>
                  <option>Master 1</option><option>Master 2</option><option>Doctorat</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Filière</label>
                <input className="input" placeholder="Ex: Informatique" value={form.major} onChange={e => set('major', e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleStep1}>Continuer →</button>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <div className="input-group">
              <label className="input-label" style={{ fontSize: 15 }}>Mot de passe *</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPassword ? 'text' : 'password'} placeholder="Minimum 6 caractères" value={form.password} onChange={e => set('password', e.target.value)} style={{ paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" style={{ fontSize: 15 }}>Confirmer le mot de passe *</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showConfirm ? 'text' : 'password'} placeholder="Répétez le mot de passe" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} style={{ paddingRight: 48 }} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 15 }}>
              <span>💡</span> Ce mot de passe sera demandé uniquement pour les paiements.
            </div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ Inscription...' : '✅ S\'inscrire'}
            </button>
            <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => setStep(1)}>← Retour</button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
          Déjà inscrit ?{' '}
          <button onClick={onLoginClick} style={{ color: '#1a56db', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
            Se connecter
          </button>
        </div>
      </div>
    </div>
  );
}
