import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { Payment, Emergency, Announcement, Treasury } from '../types';

interface Props {
  onNavigate: (page: string) => void;
}

export default function HomePage({ onNavigate }: Props) {
  const { currentUser, logout } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [loading, setLoading] = useState(true);

  const isPCS = currentUser?.role === 'pcs' || 
    currentUser?.bureauRole?.toLowerCase().includes('pcs') ||
    currentUser?.bureauRole?.toLowerCase().includes('trésor');
  const isAdmin = currentUser?.role === 'admin';
  const isBureau = currentUser?.role === 'bureau_member' || isAdmin;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // My payments
      if (currentUser && currentUser.uid !== 'admin_001') {
        const pq = query(collection(db, 'payments'), where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(5));
        const ps = await getDocs(pq);
        setPayments(ps.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
      }

      // Emergencies (for admin/bureau)
      if (isAdmin || isBureau) {
        const eq = query(collection(db, 'emergencies'), where('status', '==', 'active'), orderBy('timestamp', 'desc'), limit(5));
        const es = await getDocs(eq);
        setEmergencies(es.docs.map(d => ({ id: d.id, ...d.data() } as Emergency)));
      }

      // Announcements
      const aq = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'), limit(5));
      const as2 = await getDocs(aq);
      const allAnn = as2.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(isBureau ? allAnn : allAnn.filter(a => a.visibleTo === 'all'));

      // Treasury
      if (isAdmin || isPCS) {
        const td = await getDoc(doc(db, 'treasury', 'main'));
        if (td.exists()) setTreasury(td.data() as Treasury);
      }
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const getInitials = () => {
    if (!currentUser) return 'U';
    return (currentUser.firstName[0] || '') + (currentUser.lastName[0] || '');
  };

  const currentMonth = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const paidThisMonth = payments.some(p => {
    const d = new Date(p.timestamp);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && p.type === 'mensualite' && p.status === 'completed';
  });

  return (
    <div className="page fade-in">
      {/* User greeting */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Bonjour 👋</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{currentUser?.firstName} {currentUser?.lastName}</div>
          {currentUser?.bureauRole && (
            <div style={{ fontSize: 11, color: '#1a56db', fontWeight: 600, marginTop: 2 }}>
              🏛 {currentUser.bureauRole}
            </div>
          )}
          {isAdmin && <div style={{ fontSize: 11, color: '#d97706', fontWeight: 600, marginTop: 2 }}>👑 Administrateur</div>}
        </div>
        <div className="avatar" style={{ width: 48, height: 48, fontSize: 18, cursor: 'pointer' }} onClick={() => onNavigate('profile')}>
          {getInitials()}
        </div>
      </div>

      {/* Treasury card (admin/PCS) */}
      {(isAdmin || isPCS) && treasury && (
        <div className="card card-gradient" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>💰 Solde de la Caisse</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{treasury.balance.toLocaleString()} FCFA</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Mis à jour le {new Date(treasury.lastUpdated).toLocaleDateString('fr-FR')}</div>
          {isPCS && (
            <button className="btn btn-sm" style={{ marginTop: 12, background: 'rgba(255,255,255,0.25)', color: 'white', width: 'auto' }} onClick={() => onNavigate('treasury')}>
              Gérer la caisse →
            </button>
          )}
        </div>
      )}

      {/* Payment status */}
      {!isAdmin && (
        <div className={`card`} style={{ borderLeft: `4px solid ${paidThisMonth ? '#059669' : '#dc2626'}`, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            {paidThisMonth ? '✅ Mensualité payée' : '⚠️ Mensualité en attente'}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{currentMonth}</div>
          {!paidThisMonth && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => onNavigate('payment')}>
              Payer maintenant
            </button>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ marginBottom: 20 }}>
        <div className="section-title">Actions rapides</div>
        <div className="grid-2">
          {!isAdmin && (
            <>
              <ActionBtn icon="💳" label="Payer mensualité" onClick={() => onNavigate('payment')} color="#1a56db" />
              <ActionBtn icon="🚨" label="Signaler urgence" onClick={() => onNavigate('emergency')} color="#dc2626" />
              <ActionBtn icon="🪪" label="Ma carte" onClick={() => onNavigate('card')} color="#059669" />
              <ActionBtn icon="👥" label="Bureau" onClick={() => onNavigate('bureau')} color="#7c3aed" />
            </>
          )}
          {isAdmin && (
            <>
              <ActionBtn icon="👥" label="Membres" onClick={() => onNavigate('admin-members')} color="#1a56db" />
              <ActionBtn icon="💰" label="Paiements" onClick={() => onNavigate('admin-payments')} color="#059669" />
              <ActionBtn icon="🚨" label="Urgences" onClick={() => onNavigate('emergency-list')} color="#dc2626" />
              <ActionBtn icon="📊" label="Rapports" onClick={() => onNavigate('reports')} color="#7c3aed" />
            </>
          )}
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div>
          <div className="section-title">📢 Informations</div>
          {announcements.slice(0, 3).map(a => (
            <div key={a.id} className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                  {a.authorName[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{a.authorName} • {new Date(a.timestamp).toLocaleDateString('fr-FR')}</div>
                </div>
                {a.visibleTo === 'bureau' && <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>Bureau</span>}
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{a.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* Active emergencies for admin/bureau */}
      {(isAdmin || isBureau) && emergencies.length > 0 && (
        <div>
          <div className="section-title">🆘 Urgences actives</div>
          {emergencies.map(e => (
            <div key={e.id} className="card" style={{ borderLeft: '4px solid #dc2626' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{e.userName}</div>
              <div style={{ fontSize: 13, color: '#374151', margin: '6px 0' }}>{e.message}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{new Date(e.timestamp).toLocaleString('fr-FR')}</div>
            </div>
          ))}
        </div>
      )}

      {/* Messages from students (PCS/Admin) */}
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <button onClick={logout} style={{ color: '#6b7280', background: 'none', border: 'none', fontSize: 12, cursor: 'pointer', padding: 8 }}>
          Déconnexion
        </button>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, color }: { icon: string; label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} style={{
      background: 'white', border: `1px solid #e5e7eb`, borderRadius: 12, padding: 14,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color, textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </button>
  );
}
