import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Emergency } from '../types';

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
    } catch (e: any) { alert('Erreur: ' + e.message); }
    finally { setLoading(false); }
  };

  const handleResolve = async (id: string) => {
    try {
      await updateDoc(doc(db, 'emergencies', id), { status: 'resolved' });
      loadEmergencies();
    } catch (e: any) { alert('Erreur: ' + e.message); }
  };

  return (
    <div className="page fade-in">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🚨 Urgences</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        {isBureau ? 'Gérer les signalements d\'urgence' : 'Signalez une situation d\'urgence'}
      </div>

      {/* Send form (for students) */}
      {!isBureau && (
        <div className="card" style={{ marginBottom: 20, border: '2px solid #fee2e2' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#dc2626' }}>🆘 Signaler une urgence</div>
          {sent && (
            <div className="alert alert-success" style={{ marginBottom: 12 }}>
              <span>✅</span> Votre signalement a été envoyé. Le bureau a été notifié.
            </div>
          )}
          <div className="input-group">
            <label className="input-label">Décrivez votre situation</label>
            <textarea
              className="input"
              style={{ minHeight: 100, resize: 'none' }}
              placeholder="Décrivez clairement votre situation d'urgence..."
              value={message}
              onChange={e => { setMessage(e.target.value); setSent(false); }}
            />
          </div>
          <div className="alert alert-warning" style={{ marginBottom: 12 }}>
            <span>⚠️</span> N'utilisez ce formulaire que pour de vraies urgences. Le bureau sera immédiatement alerté.
          </div>
          <button className="btn btn-danger" onClick={handleSend} disabled={loading || !message.trim()}>
            {loading ? '⏳ Envoi...' : '🚨 Envoyer le signalement'}
          </button>
        </div>
      )}

      {/* List for admin/bureau */}
      {isBureau && (
        <>
          <div className="section-title">Signalements reçus</div>
          {loadingList ? (
            <div style={{ textAlign: 'center', padding: 30 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : allEmergencies.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: '#6b7280', padding: 30 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
              <div>Aucune urgence signalée</div>
            </div>
          ) : (
            allEmergencies.map(e => (
              <div key={e.id} className="card" style={{ borderLeft: `4px solid ${e.status === 'active' ? '#dc2626' : '#059669'}`, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{e.userName}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{new Date(e.timestamp).toLocaleString('fr-FR')}</div>
                  </div>
                  <span className={`badge ${e.status === 'active' ? 'badge-danger' : 'badge-success'}`}>
                    {e.status === 'active' ? '🔴 Actif' : '✅ Résolu'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, marginBottom: 10 }}>{e.message}</div>
                {e.status === 'active' && isAdmin && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleResolve(e.id!)}>
                    ✅ Marquer comme résolu
                  </button>
                )}
              </div>
            ))
          )}
        </>
      )}

      {/* My emergencies (for students) */}
      {!isBureau && myEmergencies.length > 0 && (
        <>
          <div className="section-title">Mes signalements</div>
          {myEmergencies.map(e => (
            <div key={e.id} className="card" style={{ borderLeft: `4px solid ${e.status === 'active' ? '#dc2626' : '#059669'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{new Date(e.timestamp).toLocaleString('fr-FR')}</div>
                <span className={`badge ${e.status === 'active' ? 'badge-danger' : 'badge-success'}`}>
                  {e.status === 'active' ? 'En cours' : 'Résolu'}
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
