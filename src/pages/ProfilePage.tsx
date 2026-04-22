import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';

export default function ProfilePage() {
  const { currentUser, logout } = useAuth();
  const [showForgot, setShowForgot] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [saving, setSaving] = useState(false);

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
      // Update localStorage
      const stored = JSON.parse(localStorage.getItem('amicale_user') || '{}');
      stored.password = hashedPwd;
      localStorage.setItem('amicale_user', JSON.stringify(stored));
      setPwdSuccess('Mot de passe modifié avec succès !');
      setNewPwd(''); setConfirmPwd('');
      setShowForgot(false);
    } catch (e: any) { setPwdError('Erreur: ' + e.message); }
    finally { setSaving(false); }
  };

  const roleLabel = () => {
    if (currentUser?.role === 'admin') return '👑 Administrateur';
    if (currentUser?.role === 'bureau_member') return `🏛 ${currentUser.bureauRole || 'Membre du Bureau'}`;
    return '🎓 Étudiant Mbourois';
  };

  return (
    <div className="page fade-in">
      {/* Profile hero */}
      <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#1a56db,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: 'white', margin: '0 auto 12px', border: '3px solid #e8f0fe' }}>
          {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{currentUser?.firstName} {currentUser?.lastName}</div>
        <div style={{ fontSize: 13, color: '#6b7280' }}>{roleLabel()}</div>
      </div>

      {/* Info card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📋 Informations personnelles</div>
        {currentUser?.email && <InfoRow label="Email" value={currentUser.email} />}
        {currentUser?.phone && <InfoRow label="Téléphone" value={currentUser.phone} />}
        {currentUser?.address && <InfoRow label="Adresse" value={currentUser.address} />}
        {currentUser?.level && <InfoRow label="Niveau" value={currentUser.level} />}
        {currentUser?.major && <InfoRow label="Filière" value={currentUser.major} />}
        <InfoRow label="Membre depuis" value={currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('fr-FR') : '-'} />
      </div>

      {pwdSuccess && <div className="alert alert-success"><span>✅</span> {pwdSuccess}</div>}

      {/* Security */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔐 Sécurité</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
          Votre mot de passe est utilisé pour confirmer les paiements.
        </div>
        {!showForgot ? (
          <button className="btn btn-ghost" onClick={() => { setShowForgot(true); setPwdSuccess(''); }}>
            🔑 Changer le mot de passe
          </button>
        ) : (
          <div className="fade-in">
            {pwdError && <div className="alert alert-danger">{pwdError}</div>}
            <div className="input-group">
              <label className="input-label">Nouveau mot de passe</label>
              <input className="input" type="password" placeholder="Minimum 6 caractères" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Confirmer</label>
              <input className="input" type="password" placeholder="Répéter le mot de passe" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleChangePassword} disabled={saving}>{saving ? '⏳' : '✅ Enregistrer'}</button>
            <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={() => { setShowForgot(false); setPwdError(''); }}>Annuler</button>
          </div>
        )}
      </div>

      {/* Logout */}
      <button className="btn btn-danger" onClick={logout}>🚪 Se déconnecter</button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}
