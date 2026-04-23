import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';

interface Props {
  onNavigate: (page: string) => void;
}

export default function ProfilePage({ onNavigate }: Props) {
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
      setPwdSuccess('Mot de passe modifié avec succès !');
      setNewPwd(''); setConfirmPwd('');
      setShowChangePwd(false);
    } catch (e: any) { setPwdError('Erreur: ' + e.message); }
    finally { setSaving(false); }
  };

  const roleLabel = () => {
    if (currentUser?.role === 'admin') return '👑 Administrateur';
    if (currentUser?.role === 'bureau_member') return `🏛️ ${currentUser.bureauRole || 'Membre du Bureau'}`;
    return '🎓 Étudiant Mbourois';
  };

  const roleColor = () => {
    if (currentUser?.role === 'admin') return '#d97706';
    if (currentUser?.role === 'bureau_member') return '#7c3aed';
    return '#1a56db';
  };

  return (
    <div className="page fade-in">
      {/* Profile hero */}
      <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: `linear-gradient(135deg, ${roleColor()}, #059669)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: 'white',
          margin: '0 auto 14px', border: '3px solid #e8f0fe',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
        }}>
          {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{currentUser?.firstName} {currentUser?.lastName}</div>
        <div style={{ fontSize: 13, color: roleColor(), fontWeight: 600 }}>{roleLabel()}</div>
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

      {pwdSuccess && (
        <div className="alert alert-success" style={{ marginBottom: 12 }}>
          <span>✅</span> {pwdSuccess}
        </div>
      )}

      {/* Security */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🔐 Sécurité</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
          Votre mot de passe est utilisé pour confirmer les paiements.
        </div>
        {!showChangePwd ? (
          <button className="btn btn-ghost" onClick={() => { setShowChangePwd(true); setPwdSuccess(''); setPwdError(''); }}>
            🔑 Changer le mot de passe
          </button>
        ) : (
          <div className="fade-in">
            {pwdError && <div className="alert alert-danger" style={{ marginBottom: 10 }}>{pwdError}</div>}
            <div className="input-group">
              <label className="input-label">Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showNewPwd ? 'text' : 'password'} placeholder="Minimum 6 caractères" value={newPwd} onChange={e => setNewPwd(e.target.value)} style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>{showNewPwd ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Confirmer</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showConfirmPwd ? 'text' : 'password'} placeholder="Répéter le mot de passe" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>{showConfirmPwd ? '🙈' : '👁️'}</button>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleChangePassword} disabled={saving}>
              {saving ? '⏳ Enregistrement...' : '✅ Enregistrer'}
            </button>
            <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={() => { setShowChangePwd(false); setPwdError(''); setNewPwd(''); setConfirmPwd(''); }}>
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Quick actions for non-admin */}
      {currentUser?.role !== 'admin' && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>⚡ Actions rapides</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => onNavigate('payment')}>💳 Faire un paiement</button>
            <button className="btn btn-ghost" onClick={() => onNavigate('card')}>🪪 Voir ma carte membre</button>
            {currentUser?.role !== 'bureau_member' && (
              <button className="btn btn-ghost" onClick={() => onNavigate('emergency')}>🚨 Signaler une urgence</button>
            )}
          </div>
        </div>
      )}

      {/* Logout button - visible and clear */}
      {!confirmLogout ? (
        <button
          className="btn"
          onClick={() => setConfirmLogout(true)}
          style={{ background: '#fff', border: '2px solid #dc2626', color: '#dc2626', fontWeight: 700 }}
        >
          🚪 Se déconnecter
        </button>
      ) : (
        <div className="card" style={{ border: '2px solid #dc2626', background: '#fff5f5' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
            Confirmer la déconnexion ?
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={logout}>
              Oui, déconnecter
            </button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmLogout(false)}>
              ← Annuler
            </button>
          </div>
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
      <span style={{ color: '#6b7280', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}
