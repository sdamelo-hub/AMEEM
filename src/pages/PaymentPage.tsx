import { useState, type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Payment, WAVE_LINK, CARTE_AMOUNT } from '../types';
import { CalendarDays, IdCard, ChevronRight, History } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function PaymentPage(_props: Props) {
  const { currentUser } = useAuth();
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Payment[]>([]);
  const [histLoaded, setHistLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Clic sur "Payer la mensualité" : ouvre Wave directement
  const handlePayMensualite = () => {
    setNotice('');
    const a = document.createElement('a');
    a.href = WAVE_LINK;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  // Les cartes de membre ne sont plus délivrées
  const handleCarte = () => {
    setNotice('Indisponible pour le moment');
  };

  const loadHistory = async () => {
    if (histLoaded) { setShowHistory(!showHistory); return; }
    setLoading(true);
    try {
      const q = query(collection(db, 'payments'), where('userId', '==', currentUser!.uid));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setHistory(list);
      setHistLoaded(true);
      setShowHistory(true);
    } catch { }
    finally { setLoading(false); }
  };

  return (
    <div className="page home fade-in">
      <div className="home-section" style={{ marginTop: 4 }}>Payer par Wave</div>

      <PayRow icon={<CalendarDays size={20} />} title="Payer la mensualité" onClick={handlePayMensualite} />
      <PayRow icon={<IdCard size={20} />} title="Carte de Membre" sub={`Obtenir votre carte digitale · ${CARTE_AMOUNT.toLocaleString('fr-FR')} FCFA`} onClick={handleCarte} />

      {notice && <div className="alert alert-warning">{notice}</div>}

      <button className="home-row" onClick={loadHistory} disabled={loading}>
        <span className="home-row-icon"><History size={20} /></span>
        <span className="home-row-text">
          <span className="home-row-title">{loading ? 'Chargement...' : 'Historique des paiements'}</span>
        </span>
        <ChevronRight size={20} />
      </button>

      {showHistory && (
        history.length === 0 ? (
          <div className="pay-empty">Aucun paiement enregistré</div>
        ) : (
          <div className="profile-card">
            {history.map(p => (
              <div key={p.id} className="profile-item">
                <span className="profile-item-text" style={{ flex: 1 }}>
                  <span className="profile-item-value">{p.description || (p.type === 'mensualite' ? 'Mensualité' : 'Carte membre')}</span>
                  <span className="profile-item-label">{new Date(p.timestamp).toLocaleDateString('fr-FR')}</span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <span className="pay-amount">+{p.amount.toLocaleString('fr-FR')} F</span>
                  <span className={`badge ${p.status === 'completed' ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: 4 }}>{p.status === 'completed' ? 'Payé' : 'En attente'}</span>
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function PayRow({ icon, title, sub, onClick }: { icon: ReactNode; title: string; sub?: string; onClick: () => void }) {
  return (
    <button className="home-row" onClick={onClick}>
      <span className="home-row-icon">{icon}</span>
      <span className="home-row-text">
        <span className="home-row-title">{title}</span>
        {sub && <span className="home-row-sub">{sub}</span>}
      </span>
      <ChevronRight size={20} />
    </button>
  );
}