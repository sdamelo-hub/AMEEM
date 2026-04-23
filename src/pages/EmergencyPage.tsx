import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Emergency } from '../types';

const formatDate = (ts: string): string => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

export default function EmergencyPage() {
  const { currentUser } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [myEmergencies, setMyEmergencies] = useState<Emergency[]>([]);
  const [allEmergencies, setAllEmergencies] = useState<Emergency[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const isAdmin = currentUser?.role === 'admin';
  const isBureau = currentUser?.role === 'bureau_member' || isAdmin;

  useEffect(() => { loadEmergencies(); }, []);

  const loadEmergencies = async () => {
    if (!currentUser) return;
    try {
      if (isAdmin || isBureau) {
        const q = query(collection(db, 'emergencies'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        setAllEmergencies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Emergency)));
      } else {
        const q = query(collection(db, 'emergencies'), where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        setMyEmergencies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Emergency)));
      }
    } catch (e) { console.error(e); }
    finally { setLoadingList(false); }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'emergencies'), {
        userId: currentUser!.uid,
        userName: `${currentUser!.firstName} ${currentUser!.lastName}`,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        status: 'active',
      });
      setSent(true);
      setMessage('');
      loadEmergencies();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleResolve = async (id: string) => {
    try {
      await updateDoc(doc(db, 'emergencies', id), { status: 'resolved' });
      setAllEmergencies(prev => prev.map(e => e.id === id ? { ...e, status: 'resolved' } : e));
    } catch (e: any) { alert('Erreur: ' + e.message); }
  };

  // ADMIN/BUREAU VIEW - list of all emergencies
  if (isAdmin || isBureau) {
    const active = allEmergencies.filter(e => e.status === 'active');
    const resolved = allEmergencies.filter(e => e.status === 'resolved');
    
    return (
      <div className="page fade-in">
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🚨 Urgences</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Signalements des membres</div>

        {loadingList ? (
          <div style={{ textAlign: 'center', paddingTop: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : allEmergencies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#6b7280' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Aucune urgence signalée</div>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <div className="section-title" style={{ color: '#dc2626' }}>🔴 Actives ({active.length})</div>
                {active.map(e => (
                  <div key={e.id} className="card" style={{ borderLeft: '4px solid #dc2626', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{e.userName}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>{formatDate(e.timestamp)}</div>
                        <div style={{ fontSize: 13, color: '#374151' }}>{e.message}</div>
                      </div>
                      <button
                        onClick={() => handleResolve(e.id!)}
                        style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', marginLeft: 10 }}
                      >
                        ✅ Résolu
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
            {resolved.length > 0 && (
              <>
                <div className="section-title" style={{ color: '#059669', marginTop: 16 }}>✅ Résolues ({resolved.length})</div>
                {resolved.map(e => (
                  <div key={e.id} className="card" style={{ borderLeft: '4px solid #059669', marginBottom: 10, opacity: 0.75 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{e.userName}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{formatDate(e.timestamp)}</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{e.message}</div>
                    <span className="badge badge-success" style={{ marginTop: 6 }}>✅ Résolu</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // STUDENT VIEW - send emergency
  return (
    <div className="page fade-in">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🚨 Signaler une urgence</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Le bureau sera notifié de votre situation</div>

      {sent && (
        <div className="alert alert-success" style={{ marginBottom: 16 }}>
          <span>✅</span> Votre signalement a été envoyé. Le bureau vous contactera bientôt.
        </div>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="input-group">
          <label className="input-label">Décrivez votre situation</label>
          <textarea
            className="input"
            style={{ minHeight: 120, resize: 'none' }}
            placeholder="Expliquez brièvement votre urgence..."
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
        </div>
        <button className="btn btn-danger" onClick={handleSend} disabled={loading || !message.trim()}>
          {loading ? '⏳ Envoi...' : '🚨 Envoyer le signalement'}
        </button>
      </div>

      {/* Show user's own past emergencies */}
      {myEmergencies.length > 0 && (
        <>
          <div className="section-title">Mes signalements</div>
          {myEmergencies.map(e => (
            <div key={e.id} className="card" style={{ borderLeft: `4px solid ${e.status === 'active' ? '#dc2626' : '#059669'}`, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{formatDate(e.timestamp)}</div>
                <span className={`badge ${e.status === 'active' ? 'badge-danger' : 'badge-success'}`}>
                  {e.status === 'active' ? '🔴 Actif' : '✅ Résolu'}
                </span>
              </div>
              <div style={{ fontSize: 13 }}>{e.message}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
