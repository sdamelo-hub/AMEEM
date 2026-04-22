import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Payment } from '../types';

interface Props { onNavigate: (p: string) => void; }

export default function CardPage({ onNavigate }: Props) {
  const { currentUser } = useAuth();
  const [hasPaid, setHasPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkCardPayment();
  }, []);

  const checkCardPayment = async () => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'payments'),
        where('userId', '==', currentUser.uid),
        where('type', '==', 'carte'),
        where('status', '==', 'completed')
      );
      const snap = await getDocs(q);
      setHasPaid(!snap.empty);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const year = new Date().getFullYear();
  const cardNumber = currentUser ? `AMEEM-${year}-${currentUser.uid.slice(-6).toUpperCase()}` : '';

  if (loading) return (
    <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div className="spinner" style={{ margin: '0 auto' }} />
    </div>
  );

  if (!hasPaid) return (
    <div className="page fade-in">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🪪 Carte de Membre</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Obtenez votre carte digitale officielle</div>

      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🪪</div>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Carte non disponible</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, lineHeight: 1.6 }}>
          Pour obtenir votre carte de membre, vous devez payer les frais de <strong>1 000 FCFA</strong> via Wave.
        </div>
        <div className="card" style={{ textAlign: 'left', background: '#f0f9ff', border: '1px solid #bae6fd', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>✨ Avantages de la carte</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
            • Identifiant officiel en tant qu'étudiant Mbourois<br />
            • Accès aux services de l'Amicale<br />
            • Reconnaissance lors des événements<br />
            • Valable pour l'année {year}
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('payment')}>
          💳 Payer 1 000 FCFA pour obtenir ma carte
        </button>
      </div>
    </div>
  );

  return (
    <div className="page fade-in">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>🪪 Ma Carte de Membre</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Votre carte officielle AMEEM</div>

      {/* ID Card */}
      <div ref={cardRef} className="id-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 2, letterSpacing: 1 }}>AMICALE</div>
            <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>ÉTUDIANTS<br />MBOUROIS</div>
          </div>
          <div style={{ width: 42, height: 42, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: '2px solid rgba(255,255,255,0.4)' }}>
            🎓
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

        {/* Decorative circles */}
        <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: -20, right: 60 }} />
        <div style={{ position: 'absolute', width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: 10, right: 10 }} />
      </div>

      {/* Card info */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📋 Informations</div>
        <InfoRow label="Nom complet" value={`${currentUser?.firstName} ${currentUser?.lastName}`} />
        {currentUser?.phone && <InfoRow label="Téléphone" value={currentUser.phone} />}
        {currentUser?.level && <InfoRow label="Niveau" value={currentUser.level} />}
        {currentUser?.major && <InfoRow label="Filière" value={currentUser.major} />}
        {currentUser?.address && <InfoRow label="Adresse" value={currentUser.address} />}
        <InfoRow label="Statut" value={currentUser?.bureauRole ? `Membre du Bureau — ${currentUser.bureauRole}` : 'Étudiant Membre'} />
        <InfoRow label="Année" value={`${year}`} />
      </div>

      <div className="alert alert-info">
        <span>💡</span> Présentez cette carte lors des événements de l'Amicale pour être reconnu comme membre officiel.
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}
