import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BUREAU_MEMBERS } from '../types';

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
  const [isBureauQuestion, setIsBureauQuestion] = useState<boolean | null>(null);
  const [bureauVerified, setBureauVerified] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', level: '', major: '', password: '', confirmPassword: ''
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const checkBureauMembership = (): boolean => {
    const email = form.email.toLowerCase().trim();
    const phone = form.phone.replace(/\s/g, '');
    const firstName = form.firstName.toLowerCase().trim();
    const lastName = form.lastName.toLowerCase().trim();

    for (const m of BUREAU_MEMBERS) {
      if (
        (m.email && email === m.email.toLowerCase()) ||
        (phone && phone === m.phone.replace(/\s/g, '')) ||
        (firstName.includes(m.firstName.split(' ')[0].toLowerCase()) && lastName === m.lastName.toLowerCase())
      ) return true;
    }
    return false;
  };

  const handleStep1 = () => {
    if (!form.firstName || !form.lastName || !form.phone) {
      setError('Veuillez remplir les champs obligatoires (Prénom, Nom, Téléphone)'); return;
    }
    setError('');
    // Go to bureau question step
    setStep(2);
  };

  const handleBureauAnswer = (answer: boolean) => {
    setIsBureauQuestion(answer);
    if (answer) {
      // Verify if they are really in the bureau list
      const found = checkBureauMembership();
      setBureauVerified(found);
      if (!found) {
        // Not in list - inform them
        setError('');
      }
    }
    setStep(3);
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
      // Force role based on bureau verification
      const forcedRole = (isBureauQuestion && bureauVerified) ? undefined : 'student';
      await register({ ...form, _forcedRole: forcedRole } as any);
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'inscription');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a56db 0%, #059669 100%)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', padding: '40px 20px 30px', color: 'white' }}>
        <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '2px solid rgba(255,255,255,0.4)', overflow: 'hidden' }}>
          <img src="/icons/icon-128.png" alt="AMEEM" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src='/icons/logo.jpg'; }} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>AMICALE MBOUROIS</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>Amicale des Étudiants de Mbour</div>
      </div>

      <div style={{ flex: 1, background: 'white', borderRadius: '24px 24px 0 0', padding: '28px 20px' }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ flex:1, height:3, borderRadius:2, background: step >= s ? '#1a56db' : '#e5e7eb' }} />
          ))}
        </div>

        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}><span>⚠️</span> {error}</div>}

        {/* Step 1 - Personal info */}
        {step === 1 && (
          <div className="fade-in">
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>👋 Créer votre compte</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Entrez vos informations personnelles</p>

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
              <label className="input-label">Téléphone *</label>
              <input className="input" type="tel" placeholder="77 000 00 00" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" placeholder="email@exemple.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Adresse (Quartier)</label>
              <input className="input" placeholder="Ex: Mbour Oncad" value={form.address} onChange={e => set('address', e.target.value)} />
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
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
              Déjà inscrit ?{' '}
              <button onClick={onLoginClick} style={{ color: '#1a56db', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                Se connecter
              </button>
            </div>
          </div>
        )}

        {/* Step 2 - Bureau question */}
        {step === 2 && (
          <div className="fade-in">
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>🏛️ Votre statut</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Êtes-vous membre du Bureau Exécutif de l'AMEEM ?</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <button
                onClick={() => handleBureauAnswer(true)}
                style={{ padding: '18px 20px', borderRadius: 12, border: '2px solid #1a56db', background: '#f0f4ff', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}
              >
                <span style={{ fontSize: 28 }}>🏛️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a56db' }}>Oui, je suis membre du bureau</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Mon nom figure dans la liste officielle du bureau</div>
                </div>
              </button>

              <button
                onClick={() => handleBureauAnswer(false)}
                style={{ padding: '18px 20px', borderRadius: 12, border: '2px solid #e5e7eb', background: '#fafafa', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}
              >
                <span style={{ fontSize: 28 }}>🎓</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#374151' }}>Non, je suis étudiant(e) mbourois(e)</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Je veux simplement rejoindre l'amicale</div>
                </div>
              </button>
            </div>

            <button className="btn btn-outline" onClick={() => setStep(1)}>← Retour</button>
          </div>
        )}

        {/* Step 3 - Password */}
        {step === 3 && (
          <div className="fade-in">
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>🔐 Choisir un mot de passe</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              {isBureauQuestion && bureauVerified
                ? '✅ Identité bureau vérifiée — vous serez enregistré comme membre du bureau'
                : isBureauQuestion && !bureauVerified
                ? '⚠️ Votre nom ne figure pas dans la liste du bureau — vous serez enregistré comme étudiant(e)'
                : '✅ Vous serez enregistré(e) comme étudiant(e) mbourois(e)'}
            </p>

            {isBureauQuestion && !bureauVerified && (
              <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                <span>⚠️</span> Votre identité n'a pas pu être vérifiée dans la liste officielle du bureau. Contactez l'administrateur si c'est une erreur.
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Mot de passe *</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPassword ? 'text' : 'password'} placeholder="Minimum 6 caractères" value={form.password} onChange={e => set('password', e.target.value)} style={{ paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>
                  {showPassword ? '' : '👁️'}
                </button>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Confirmer le mot de passe *</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showConfirm ? 'text' : 'password'} placeholder="Répétez le mot de passe" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} style={{ paddingRight: 48 }} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>
                  {showConfirm ? '' : '👁️'}
                </button>
              </div>
            </div>
            <div className="alert alert-info" style={{ marginBottom: 16, fontSize: 13 }}>
              <span>💡</span> Ce mot de passe est demandé pour confirmer vos paiements.
            </div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ Inscription en cours...' : '✅ S\'inscrire'}
            </button>
            <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => setStep(2)}>← Retour</button>
          </div>
        )}
      </div>
    </div>
  );
}
