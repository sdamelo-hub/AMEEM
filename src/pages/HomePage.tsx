import { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { Payment, Emergency, Announcement, Treasury, MENSUALITE_AMOUNT } from '../types';
import {
  Megaphone, MessageCircle, IdCard, Siren, BarChart3,
  Users, Landmark, ChevronRight, CircleCheck,
} from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

export default function HomePage({ onNavigate }: Props) {
  const { currentUser } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [treasury, setTreasury] = useState<Treasury | null>(null);
  const [, setLoading] = useState(true);

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
      if (currentUser && currentUser.uid !== 'admin_001') {
        const pq = query(collection(db, 'payments'), where('userId', '==', currentUser.uid), orderBy('timestamp', 'desc'), limit(5));
        const ps = await getDocs(pq);
        setPayments(ps.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
      }

      if (isAdmin || isBureau) {
        const eq = query(collection(db, 'emergencies'), where('status', '==', 'active'), orderBy('timestamp', 'desc'), limit(3));
        const es = await getDocs(eq);
        setEmergencies(es.docs.map(d => ({ id: d.id, ...d.data() } as Emergency)));
      }

      const aq = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'), limit(4));
      const as2 = await getDocs(aq);
      const allAnn = as2.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(isBureau ? allAnn : allAnn.filter(a => a.visibleTo === 'all'));

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
    return ((currentUser.firstName[0] || '') + (currentUser.lastName[0] || '')).toUpperCase();
  };

  const monthName = new Date().toLocaleDateString('fr-FR', { month: 'long' });
  const monthLabel = /^[aeiouéèêàâîôû]/i.test(monthName) ? `d'${monthName}` : `de ${monthName}`;
  const paidThisMonth = payments.some(p => {
    const d = new Date(p.timestamp);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && p.type === 'mensualite' && p.status === 'completed';
  });

  const formatDate = (ts: string) => {
    try { const d = new Date(ts); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR'); } catch { return ''; }
  };

  return (
    <div className="page home fade-in">
      {/* En-tête */}
      <div className="home-top">
        <span className="home-brand">AMEEM</span>
        <button className="avatar home-avatar" onClick={() => onNavigate('profile')} aria-label="Mon profil">
          {getInitials()}
        </button>
      </div>

      {/* Carte principale */}
      {isAdmin ? (
        <div className="home-hero">
          <div className="home-hero-label">Solde de la caisse</div>
          <div className="home-hero-amount">
            {treasury ? `${treasury.balance.toLocaleString('fr-FR')} FCFA` : '— FCFA'}
          </div>
          {treasury && <div className="home-hero-sub">Mis à jour le {formatDate(treasury.lastUpdated)}</div>}
          <button className="home-hero-btn" onClick={() => onNavigate('treasury')}>Gérer la caisse</button>
        </div>
      ) : (
        <div className="home-hero">
          <div className="home-hero-title">Paiement mensuel du logement {monthLabel}</div>
          {paidThisMonth ? (
            <div className="home-hero-paid"><CircleCheck size={20} /> Paiement réglé, merci</div>
          ) : (
            <button className="home-hero-btn" onClick={() => onNavigate('payment')}>Payer</button>
          )}
        </div>
      )}

      {/* Raccourcis */}
      <div className="home-grid">
        <Shortcut icon={<Megaphone size={22} />} title="Annonces" sub="Dernières infos" onClick={() => onNavigate('announcements')} />
        <Shortcut icon={<MessageCircle size={22} />} title="Messages" sub={isBureau ? 'Messages reçus' : 'Écrire au bureau'} onClick={() => onNavigate('messages')} />
        {isAdmin ? (
          <>
            <Shortcut icon={<Siren size={22} />} title="Urgences" sub="Alertes actives" danger onClick={() => onNavigate('emergency-list')} />
            <Shortcut icon={<BarChart3 size={22} />} title="Rapports" sub="Bilans" onClick={() => onNavigate('reports')} />
          </>
        ) : (
          <>
            <Shortcut icon={<IdCard size={22} />} title="Carte de membre" sub="Ma carte" onClick={() => onNavigate('card')} />
            <Shortcut icon={<Siren size={22} />} title="Urgence" sub="Alerter le bureau" danger onClick={() => onNavigate('emergency')} />
          </>
        )}
      </div>

      {/* Bouton large */}
      {isAdmin ? (
        <WideRow icon={<Users size={20} />} title="Administration" sub="Membres, bureau et paiements" onClick={() => onNavigate('admin')} />
      ) : (
        <WideRow icon={<Users size={20} />} title="Le Bureau" sub="L'équipe de l'amicale" onClick={() => onNavigate('bureau')} />
      )}

      {/* Gestion (rôles concernés seulement) */}
      {!isAdmin && isPCS && (
        <>
          <div className="home-section">Gestion</div>
          <WideRow
            icon={<Landmark size={20} />}
            title="Trésorerie"
            sub={treasury ? `${treasury.balance.toLocaleString('fr-FR')} FCFA en caisse` : 'Gérer la caisse'}
            onClick={() => onNavigate('treasury')}
          />
        </>
      )}

      {/* Urgences actives (bureau / admin) */}
      {isBureau && emergencies.length > 0 && (
        <>
          <div className="home-section home-section-danger">Urgences actives</div>
          {emergencies.map(e => (
            <button key={e.id} className="home-alert" onClick={() => onNavigate('emergency-list')}>
              <div className="home-alert-name">{e.userName}</div>
              <div className="home-alert-msg">{e.message}</div>
              <div className="home-alert-date">{formatDate(e.timestamp)}</div>
            </button>
          ))}
        </>
      )}

      {/* Dernières annonces */}
      {announcements.length > 0 && (
        <>
          <div className="home-section">Dernières annonces</div>
          {announcements.slice(0, 2).map(a => (
            <button key={a.id} className="home-news" onClick={() => onNavigate('announcements')}>
              <div className="home-news-head">
                <span className="home-news-title">{a.title}</span>
                {isBureau && a.visibleTo === 'bureau' && <span className="badge badge-primary">Bureau</span>}
              </div>
              <div className="home-news-meta">{a.authorName} • {formatDate(a.timestamp)}</div>
              <div className="home-news-text">{a.content}</div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

function Shortcut({ icon, title, sub, onClick, danger }: { icon: ReactNode; title: string; sub: string; onClick: () => void; danger?: boolean }) {
  return (
    <button className="home-tile" onClick={onClick}>
      <span className={`home-tile-icon ${danger ? 'danger' : ''}`}>{icon}</span>
      <span className="home-tile-title">{title}</span>
      <span className="home-tile-sub">{sub}</span>
    </button>
  );
}

function WideRow({ icon, title, sub, onClick }: { icon: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button className="home-row" onClick={onClick}>
      <span className="home-row-icon">{icon}</span>
      <span className="home-row-text">
        <span className="home-row-title">{title}</span>
        <span className="home-row-sub">{sub}</span>
      </span>
      <ChevronRight size={20} />
    </button>
  );
}