import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { Payment, WAVE_LINK, MENSUALITE_AMOUNT, CARTE_AMOUNT } from '../types';

interface Props {
  onNavigate: (page: string) => void;
}

export default function PaymentPage({ onNavigate }: Props) {
  const { currentUser, verifyPassword } = useAuth();
  const [step, setStep] = useState<'choose' | 'verify' | 'wave' | 'confirm'>('choose');
  const [payType, setPayType] = useState<'mensualite' | 'carte'>('mensualite');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Payment[]>([]);
  const [histLoaded, setHistLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showVerifyPwd, setShowVerifyPwd] = useState(false);
  const [waveOpened, setWaveOpened] = useState(false); // Track if Wave was actually opened

  const amount = payType === 'mensualite' ? MENSUALITE_AMOUNT : CARTE_AMOUNT;
  const currentMonthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const handleChoose = (type: 'mensualite' | 'carte') => {
    setPayType(type);
    setStep('verify');
    setError('');
    setPassword('');
  };

  const handleVerify = async () => {
    setLoading(true); setError('');
    try {
      const ok = await verifyPassword(password);
      if (!ok) { setError('Mot de passe incorrect'); setLoading(false); return; }
      setWaveOpened(false); // reset when entering wave step
      setStep('wave');
    } catch { setError('Erreur de vérification'); }
    finally { setLoading(false); }
  };

  const handleWaveClick = () => {
    setWaveOpened(true); // Mark that user opened Wave
    const a = document.createElement('a');
    a.href = WAVE_LINK;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const handleConfirm = async () => {
    // Must have opened Wave first
    if (!waveOpened) {
      setError('Veuillez d\'abord cliquer sur "Payer via Wave" pour effectuer le paiement, puis revenir confirmer.');
      return;
    }
    
    setLoading(true); setError('');
    try {
      const payment: Omit<Payment, 'id'> = {
        userId: currentUser!.uid,
        userName: `${currentUser!.firstName} ${currentUser!.lastName}`,
        amount,
        month: new Date().toLocaleDateString('fr-FR', { month: 'long' }),
        year: new Date().getFullYear(),
        status: 'completed',
        type: payType,
        timestamp: new Date().toISOString(),
        description: payType === 'mensualite' ? `Mensualité ${currentMonthLabel}` : 'Génération carte membre',
      };
      await addDoc(collection(db, 'payments'), payment);
      
      // Update treasury
      const treasuryRef = doc(db, 'treasury', 'main');
      const treasuryDoc = await getDoc(treasuryRef);
      if (treasuryDoc.exists()) {
        await updateDoc(treasuryRef, { balance: increment(amount), lastUpdated: new Date().toISOString() });
      } else {
        await setDoc(treasuryRef, { balance: amount, lastUpdated: new Date().toISOString() });
      }

      setStep('confirm');
    } catch (e: any) {
      setError('Erreur lors de l\'enregistrement: ' + e.message);
    } finally { setLoading(false); }
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

  const resetToChoose = () => { setStep('choose'); setPassword(''); setError(''); setWaveOpened(false); };

  return (
    <div className="page fade-in">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>💳 Paiements</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Gérez vos paiements facilement</div>

      {step === 'choose' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <div className="section-title"> Payer par  wave</div>
            
            <div className="card" style={{ marginBottom: 12, cursor: 'pointer', border: '2px solid #e5e7eb' }} onClick={() => handleChoose('mensualite')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 32 }}>📅</span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Mensualité</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Cotisation mensuelle</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#1a56db', marginTop: 4 }}>{MENSUALITE_AMOUNT.toLocaleString()} FCFA</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 20 }}>→</span>
              </div>
            </div>

            <div className="card" style={{ cursor: 'pointer', border: '2px solid #e5e7eb' }} onClick={() => handleChoose('carte')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 32 }}>🪪</span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Carte de Membre</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Obtenir votre carte digitale</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', marginTop: 4 }}>{CARTE_AMOUNT.toLocaleString()} FCFA</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 20 }}>→</span>
              </div>
            </div>
          </div>

          <button className="btn btn-ghost" onClick={loadHistory} disabled={loading}>
            {loading ? '⏳ Chargement...' : '📋 Voir l\'historique des paiements'}
          </button>

          {showHistory && (
            <div style={{ marginTop: 16 }}>
              <div className="section-title">Historique</div>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, padding: 20 }}>Aucun paiement enregistré</div>
              ) : (
                history.map(p => (
                  <div key={p.id} className="list-item">
                    <span style={{ fontSize: 24 }}>{p.type === 'mensualite' ? '📅' : '🪪'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.description || (p.type === 'mensualite' ? 'Mensualité' : 'Carte membre')}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{new Date(p.timestamp).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>+{p.amount.toLocaleString()} F</div>
                      <span className={`badge ${p.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{p.status === 'completed' ? 'Payé' : 'En attente'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {step === 'verify' && (
        <div className="slide-up">
          <div className="card card-gradient" style={{ marginBottom: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Vérification de sécurité</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              {payType === 'mensualite' ? 'Mensualité' : 'Carte de membre'} — {amount.toLocaleString()} FCFA
            </div>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="input-group">
            <label className="input-label">Entrez votre mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showVerifyPwd ? 'text' : 'password'} placeholder="Votre mot de passe" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleVerify()} autoFocus style={{ paddingRight: 48 }} />
              <button type="button" onClick={() => setShowVerifyPwd(!showVerifyPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>
                {showVerifyPwd ? ' ' : '👁️'}
              </button>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleVerify} disabled={loading}>{loading ? '⏳ Vérification...' : '✅ Confirmer'}</button>
          <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={resetToChoose}>← Retour</button>
        </div>
      )}

      {step === 'wave' && (
        <div className="slide-up">
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <span>📌</span>
            <div>
              <strong>Étape 1 :</strong> "Payer via Wave" ci-dessous pour effectuer le paiement de <strong>{amount.toLocaleString()} FCFA</strong>.
            </div>
          </div>

          <button className="wave-btn" onClick={handleWaveClick} style={{ marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, background: 'white', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              <img src="/icons/wave.png" alt="Wave" style={{ width: 40, height: 40, objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).parentElement!.innerHTML='🌊'; }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Payer via Wave</div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>Montant: {amount.toLocaleString()} FCFA</div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 1 }}>Appuyez pour ouvrir Wave →</div>
            </div>
          </button>

          {waveOpened ? (
            <div className="alert alert-success" style={{ marginBottom: 12 }}>
              <span>✅</span> Wave ouvert. Apres paiement, appuyez sur "Confirmer le paiement".
            </div>
          ) : (
            <div className="alert alert-warning" style={{ marginBottom: 12 }}>
              <span>⚠️</span> Vous devez d'abord payer sur Wave avant de confirmer.
            </div>
          )}

          {error && <div className="alert alert-danger">{error}</div>}

          <button
            className="btn btn-secondary"
            onClick={handleConfirm}
            disabled={loading || !waveOpened}
            style={{ opacity: waveOpened ? 1 : 0.5 }}
          >
            {loading ? '⏳ Enregistrement...' : '✅ Confirmer le paiement'}
          </button>
          <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => setStep('choose')}>← Annuler</button>
        </div>
      )}

      {step === 'confirm' && (
        <div className="slide-up" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#059669' }}>Paiement confirmé !</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
            Votre {payType === 'mensualite' ? 'mensualité' : 'carte de membre'} a été enregistrée avec succès.
          </div>
          <div className="card" style={{ textAlign: 'left', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#059669' }}>Récapitulatif</div>
            <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Type:</span><span style={{ fontWeight: 600 }}>{payType === 'mensualite' ? 'Mensualité' : 'Carte membre'}</span>
            </div>
            <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Montant:</span><span style={{ fontWeight: 600 }}>{amount.toLocaleString()} FCFA</span>
            </div>
            <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>Date:</span><span style={{ fontWeight: 600 }}>{new Date().toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
          {payType === 'carte' && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => onNavigate('card')}>
              🪪 Voir ma carte
            </button>
          )}
          <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={resetToChoose}>Nouveau paiement</button>
        </div>
      )}
    </div>
  );
}
