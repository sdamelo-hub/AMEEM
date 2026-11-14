import { useState, type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BUREAU_MEMBERS } from '../types';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';

interface Props {
  onSuccess: () => void;
  onLoginClick: () => void;
}

const TITLES = [
  { t: 'Créer votre compte', s: 'Vos informations de base' },
  { t: 'Vos études', s: 'Facultatif, vous pouvez passer cette étape' },
  { t: 'Sécurité', s: 'Choisissez un mot de passe' },
];

export default function RegisterPage({ onSuccess, onLoginClick }: Props) {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isBureau, setIsBureau] = useState(false);
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

  const bureauVerified = isBureau ? checkBureauMembership() : null;

  const handleStep1 = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('Veuillez saisir votre prénom et votre nom.'); return; }
    if (form.phone.replace(/\D/g, '').length < 9) { setError('Veuillez saisir un numéro de téléphone valide (9 chiffres minimum).'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError('Veuillez saisir une adresse email valide : elle sert à vous connecter.'); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!form.password || form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.'); return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.'); return;
    }
    setLoading(true); setError('');
    try {
      // Rôle bureau uniquement si la case est cochée ET que l'identité figure dans la liste officielle
      const forcedRole = (isBureau && bureauVerified) ? undefined : 'student';
      await register({ ...form, email: form.email.trim(), _forcedRole: forcedRole } as any);
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'inscription');
    } finally { setLoading(false); }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (step === 1) handleStep1();
    else if (step === 2) { setError(''); setStep(3); }
    else handleSubmit();
  };

  const goBack = () => { setError(''); setStep(step - 1); };

  return (
    <div className="login-shell">
      <div className="login-top compact">
        <img className="login-logo" src="/icons/icon-128.png" alt="AMEEM"
          onError={(e) => { (e.target as HTMLImageElement).src = '/icons/logo.jpg'; }} />
        <div className="login-brand">AMEEM</div>
        <div className="login-tag">Amicale des Étudiants de Mbour</div>
      </div>

      <form className="login-sheet" onSubmit={onSubmit} noValidate>
        <div className="reg-meta">
          {step > 1 ? (
            <button type="button" className="reg-back" onClick={goBack}><ChevronLeft size={20} /> Retour</button>
          ) : <span />}
          <span className="reg-count">Étape {step} sur 3</span>
        </div>
        <div className="reg-progress" aria-hidden="true">
          {[1, 2, 3].map(s => <span key={s} className={step >= s ? 'active' : ''} />)}
        </div>

        <h1 className="login-title">{TITLES[step - 1].t}</h1>
        <p className="login-sub">{TITLES[step - 1].s}</p>

        {error && <div className="login-error" role="alert">{error}</div>}

        {step === 1 && (
          <div className="fade-in">
            <Field id="reg-first" label="Prénom">
              <input id="reg-first" className="login-input" autoComplete="given-name" placeholder="Votre prénom"
                value={form.firstName} onChange={e => set('firstName', e.target.value)} />
            </Field>
            <Field id="reg-last" label="Nom">
              <input id="reg-last" className="login-input" autoComplete="family-name" placeholder="Votre nom"
                value={form.lastName} onChange={e => set('lastName', e.target.value)} />
            </Field>
            <Field id="reg-phone" label="Téléphone">
              <input id="reg-phone" className="login-input" type="tel" inputMode="tel" autoComplete="tel" placeholder="77 000 00 00"
                value={form.phone} onChange={e => set('phone', e.target.value)} />
            </Field>
            <Field id="reg-email" label="Email">
              <input id="reg-email" className="login-input" type="text" inputMode="email" autoComplete="email" autoCapitalize="none" placeholder="exemple@email.com"
                value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <Field id="reg-level" label="Niveau" optional>
              <select id="reg-level" className="login-input" value={form.level} onChange={e => set('level', e.target.value)}>
                <option value="">Choisir</option>
                <option>Licence 1</option><option>Licence 2</option><option>Licence 3</option>
                <option>Master 1</option><option>Master 2</option><option>Doctorat</option>
              </select>
            </Field>
            <Field id="reg-major" label="Filière" optional>
              <input id="reg-major" className="login-input" placeholder="Ex : Informatique"
                value={form.major} onChange={e => set('major', e.target.value)} />
            </Field>
            <Field id="reg-address" label="Quartier" optional>
              <input id="reg-address" className="login-input" autoComplete="street-address" placeholder="Ex : Mbour Oncad"
                value={form.address} onChange={e => set('address', e.target.value)} />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <label className="reg-check">
              <input type="checkbox" checked={isBureau} onChange={e => setIsBureau(e.target.checked)} />
              <span>
                <span className="reg-check-title">Je fais partie du Bureau Exécutif</span>
                <span className="reg-check-sub" style={{ display: 'block' }}>Réservé aux membres de la liste officielle</span>
              </span>
            </label>
            {isBureau && (
              bureauVerified
                ? <div className="login-hint ok">Identité vérifiée : vous serez enregistré(e) comme membre du bureau.</div>
                : <div className="login-hint warn">Votre identité ne figure pas dans la liste du bureau : vous serez enregistré(e) comme étudiant(e). Contactez l'administrateur si c'est une erreur.</div>
            )}

            <Field id="reg-pwd" label="Mot de passe">
              <div className="login-pwd">
                <input id="reg-pwd" className="login-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="6 caractères minimum"
                  value={form.password} onChange={e => set('password', e.target.value)} />
                <button type="button" className="login-eye" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </Field>
            <Field id="reg-confirm" label="Confirmer le mot de passe">
              <div className="login-pwd">
                <input id="reg-confirm" className="login-input" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Répétez le mot de passe"
                  value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
                <button type="button" className="login-eye" onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  {showConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </Field>
          </div>
        )}

        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>
          <button type="submit" className="login-submit" disabled={loading}>
            {step === 3 ? (loading ? 'Inscription...' : 'Créer mon compte') : 'Continuer'}
          </button>
          {step === 2 && (
            <button type="button" className="reg-skip" onClick={() => { setError(''); setStep(3); }}>Passer cette étape</button>
          )}
        </div>

        <div className="login-spacer" />

        {step === 1 && (
          <div className="login-foot">
            Déjà inscrit ?{' '}
            <button type="button" onClick={onLoginClick}>Se connecter</button>
          </div>
        )}
      </form>
    </div>
  );
}

function Field({ id, label, optional, children }: { id: string; label: string; optional?: boolean; children: ReactNode }) {
  return (
    <div className="login-field">
      <label htmlFor={id}>{label}{optional && <span className="opt"> (facultatif)</span>}</label>
      {children}
    </div>
  );
}