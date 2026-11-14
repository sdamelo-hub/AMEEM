import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { IdCard, GraduationCap } from 'lucide-react';

interface Props { onNavigate: (p: string) => void; }

export default function CardPage(_props: Props) {
  const { currentUser } = useAuth();
  const [hasCard, setHasCard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCard();
  }, []);

  // Une carte déjà obtenue reste visible
  const checkCard = async () => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'payments'),
        where('userId', '==', currentUser.uid),
        where('type', '==', 'carte'),
        where('status', '==', 'completed')
      );
      const snap = await getDocs(q);
      setHasCard(!snap.empty);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const year = new Date().getFullYear();
  const cardNumber = currentUser ? `AMEEM-${year}-${currentUser.uid.slice(-6).toUpperCase()}` : '';

  if (loading) return (
    <div className="page home" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div className="spinner" style={{ margin: '0 auto' }} />
    </div>
  );

  if (!hasCard) return (
    <div className="page home fade-in">
      <div className="card-empty">
        <div className="card-empty-icon"><IdCard size={34} /></div>
        <div className="card-empty-title">Carte non disponible</div>
        <div className="card-empty-sub">Les cartes de membre ne sont plus délivrées pour le moment.</div>
      </div>
    </div>
  );

  return (
    <div className="page home fade-in">
      <div className="id-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 2, letterSpacing: 1 }}>AMICALE</div>
            <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>ÉTUDIANTS<br />MBOUROIS</div>
          </div>
          <div style={{ width: 42, height: 42, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.4)' }}>
            <GraduationCap size={22} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 50, height: 50, background: 'rgba(255,255,255,0.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, border: '2px solid rgba(255,255,255,0.5)' }}>
            {currentUser?.firstName[0]}{currentUser?.lastName[0]}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{currentUser?.firstName} {currentUser?.lastName}</div>
            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
              {currentUser?.bureauRole || (currentUser?.level ? `${currentUser.level}${currentUser.major ? ` — ${currentUser.major}` : ''}` : 'Étudiant Mbourois')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>N° CARTE</div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>{cardNumber}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 2 }}>VALIDE</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{year}</div>
          </div>
        </div>

        <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: -20, right: 60 }} />
        <div style={{ position: 'absolute', width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: 10, right: 10 }} />
      </div>
    </div>
  );
}