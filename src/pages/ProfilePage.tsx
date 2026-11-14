import { useState, type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { Mail, Phone, GraduationCap, KeyRound, LogOut, Eye, EyeOff, ChevronRight, CircleCheck } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function ProfilePage(_props: Props) {
  const { currentUser, logout } = useAuth();
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  };

  const handleChangePassword = async () => {
    if (!newPwd || newPwd.length < 6) { setPwdError('Minimum 6 caractères'); return; }
    if (newPwd !== confirmPwd) { setPwdError('Les mots de passe ne correspondent pas'); return; }
    setSaving(true); setPwdError('');
    try {
      const hashedPwd = simpleHash(newPwd);
      if (currentUser!.uid !== 'admin_001') {
        const q = query(collection(db, 'users'), where('uid', '==', currentUser!.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(doc(db, 'users', snap.docs[0].id), { password: hashedPwd });
        }
      }
      const stored = JSON.parse(localStorage.getItem('amicale_user') || '{}');
      stored.password = hashedPwd;
      localStorage.setItem('amicale_user', JSON.stringify(stored));
      setPwdSuccess('Mot de passe modifié avec succès');
      setNewPwd(''); setConfirmPwd('');
      setShowChangePwd(false);
    } catch (e: any) { setPwdError('Erreur: ' + e.message); }
    finally { setSaving(false); }
  };

  const roleLabel = () => {
    if (currentUser?.role === 'admin') return 'Administrateur';
    if (currentUser?.role === 'bureau_member') return currentUser.bureauRole || 'Membre du Bureau';
    return 'Étudiant Mbourois';
  };

  const studies = [currentUser?.level, currentUser?.major].filter(Boolean).join(' · ');

  return (
    <div className="page home fade-in">
      {/* Identité */}
      <div className="profile-hero">
        <div className="profile-avatar">
          {(currentUser?.firstName?.[0] || '') + (currentUser?.lastName?.[0] || '')}
        </div>
        <div className="profile-name">{currentUser?.firstName} {currentUser?.lastName}</div>
        <span className="profile-role">{roleLabel()}</span>
      </div>

      {/* Informations essentielles */}
      <div className="profile-card">
        {currentUser?.phone && <Item icon={<Phone size={18} />} label="Téléphone" value={currentUser.phone} />}
        {currentUser?.email && <Item icon={<Mail size={18} />} label="Email" value={currentUser.email} />}
        {studies && <Item icon={<GraduationCap size={18} />} label="Études" value={studies} />}
      </div>

      {pwdSuccess && (
        <div className="profile-success"><CircleCheck size={18} /> {pwdSuccess}</div>
      )}

      {/* Mot de passe */}
      {!showChangePwd ? (
        <button className="home-row" onClick={() => { setShowChangePwd(true); setPwdSuccess(''); setPwdError(''); }}>
          <span className="home-row-icon"><KeyRound size={20} /></span>
          <span className="home-row-text">
            <span className="home-row-title">Mot de passe</span>
            <span className="home-row-sub">Modifier mon mot de passe</span>
          </span>
          <ChevronRight size={20} />
        </button>
      ) : (
        <div className="profile-card profile-form fade-in">
          {pwdError && <div className="alert alert-danger" style={{ marginBottom: 10 }}>{pwdError}</div>}
          <div className="input-group">
            <label className="input-label">Nouveau mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showNewPwd ? 'text' : 'password'} placeholder="Minimum 6 caractères" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={{ paddingRight: 44 }} />
              <button type="button" className="profile-eye" onClick={() => setShowNewPwd(!showNewPwd)} aria-label="Afficher le mot de passe">
                {showNewPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Confirmer</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showConfirmPwd ? 'text' : 'password'} placeholder="Répéter le mot de passe" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} style={{ paddingRight: 44 }} />
              <button type="button" className="profile-eye" onClick={() => setShowConfirmPwd(!showConfirmPwd)} aria-label="Afficher le mot de passe">
                {showConfirmPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleChangePassword} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
          <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={() => { setShowChangePwd(false); setPwdError(''); setNewPwd(''); setConfirmPwd(''); }}>
            Annuler
          </button>
        </div>
      )}

      {/* Déconnexion */}
      {!confirmLogout ? (
        <button className="profile-logout" onClick={() => setConfirmLogout(true)}>
          <LogOut size={20} /> Se déconnecter
        </button>
      ) : (
        <div className="profile-card profile-confirm">
          <div className="profile-confirm-title">Se déconnecter ?</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={logout}>Oui</button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmLogout(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Item({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="profile-item">
      <span className="home-row-icon">{icon}</span>
      <span className="profile-item-text">
        <span className="profile-item-label">{label}</span>
        <span className="profile-item-value">{value}</span>
      </span>
    </div>
  );
}