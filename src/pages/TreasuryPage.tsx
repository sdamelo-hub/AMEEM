import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Withdrawal, Treasury, Payment } from '../types';
import * as XLSX from 'xlsx';

export default function TreasuryPage() {
  const { currentUser, verifyPassword } = useAuth();
  const [treasury, setTreasury] = useState<Treasury>({ balance: 0, lastUpdated: new Date().toISOString() });
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const td = await getDoc(doc(db, 'treasury', 'main'));
      if (td.exists()) setTreasury(td.data() as Treasury);
      
      const wq = query(collection(db, 'withdrawals'), orderBy('timestamp', 'desc'));
      const ws = await getDocs(wq);
      setWithdrawals(ws.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal)));

      const pq = query(collection(db, 'payments'), orderBy('timestamp', 'desc'));
      const ps = await getDocs(pq);
      setPayments(ps.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Montant invalide'); return; }
    if (!reason.trim()) { setError('Veuillez indiquer le motif'); return; }
    if (amt > treasury.balance) { setError(`Solde insuffisant (${treasury.balance.toLocaleString()} FCFA disponibles)`); return; }

    setSubmitting(true); setError('');
    try {
      const ok = await verifyPassword(password);
      if (!ok) { setError('Mot de passe incorrect'); setSubmitting(false); return; }

      const newBalance = treasury.balance - amt;
      const withdrawal: Omit<Withdrawal, 'id'> = {
        amount: amt,
        reason: reason.trim(),
        pcsName: `${currentUser!.firstName} ${currentUser!.lastName}`,
        timestamp: new Date().toISOString(),
        balanceBefore: treasury.balance,
        balanceAfter: newBalance,
      };

      await addDoc(collection(db, 'withdrawals'), withdrawal);
      
      const treasuryRef = doc(db, 'treasury', 'main');
      await setDoc(treasuryRef, { balance: newBalance, lastUpdated: new Date().toISOString() });

      setTreasury({ balance: newBalance, lastUpdated: new Date().toISOString() });
      setSuccess(`Retrait de ${amt.toLocaleString()} FCFA enregistré avec succès !`);
      setShowWithdrawForm(false);
      setAmount(''); setReason(''); setPassword('');
      loadData();
    } catch (e: any) { setError('Erreur: ' + e.message); }
    finally { setSubmitting(false); }
  };

  const exportExcel = (period: 'monthly' | 'annual') => {
    const now = new Date();
    let filteredPayments = payments;
    let filteredWithdrawals = withdrawals;
    let title = '';

    if (period === 'monthly') {
      filteredPayments = payments.filter(p => {
        const d = new Date(p.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      filteredWithdrawals = withdrawals.filter(w => {
        const d = new Date(w.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      title = `Bilan_${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(' ', '_')}`;
    } else {
      filteredPayments = payments.filter(p => new Date(p.timestamp).getFullYear() === now.getFullYear());
      filteredWithdrawals = withdrawals.filter(w => new Date(w.timestamp).getFullYear() === now.getFullYear());
      title = `Bilan_Annuel_${now.getFullYear()}`;
    }

    const totalIn = filteredPayments.reduce((s, p) => s + p.amount, 0);
    const totalOut = filteredWithdrawals.reduce((s, w) => s + w.amount, 0);

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['AMICALE DES ÉTUDIANTS MBOUROIS (AMEEM)'],
      [`BILAN ${period === 'monthly' ? 'MENSUEL' : 'ANNUEL'} — ${period === 'monthly' ? now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase() : now.getFullYear()}`],
      [],
      ['RÉSUMÉ FINANCIER'],
      ['Total Entrées (FCFA)', totalIn],
      ['Total Retraits (FCFA)', totalOut],
      ['Solde Net (FCFA)', totalIn - totalOut],
      ['Solde Actuel Caisse (FCFA)', treasury.balance],
      [],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Résumé');

    // Payments sheet
    const payData = [
      ['Date', 'Membre', 'Type', 'Montant (FCFA)', 'Statut'],
      ...filteredPayments.map(p => [
        new Date(p.timestamp).toLocaleDateString('fr-FR'),
        p.userName,
        p.type === 'mensualite' ? 'Mensualité' : 'Carte membre',
        p.amount,
        p.status === 'completed' ? 'Payé' : 'En attente',
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(payData), 'Paiements');

    // Withdrawals sheet
    const wData = [
      ['Date', 'Responsable', 'Motif', 'Montant (FCFA)', 'Solde Avant', 'Solde Après'],
      ...filteredWithdrawals.map(w => [
        new Date(w.timestamp).toLocaleDateString('fr-FR'),
        w.pcsName,
        w.reason,
        w.amount,
        w.balanceBefore,
        w.balanceAfter,
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wData), 'Retraits');

    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  if (loading) return <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div className="page fade-in">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>💰 Gestion de la Caisse</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Trésorerie AMEEM</div>

      {success && <div className="alert alert-success"><span>✅</span> {success}</div>}

      {/* Balance card */}
      <div className="card card-gradient" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>💵 Solde actuel de la caisse</div>
        <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 8 }}>{treasury.balance.toLocaleString()} FCFA</div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Mis à jour le {new Date(treasury.lastUpdated).toLocaleString('fr-FR')}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }} onClick={() => { setShowWithdrawForm(true); setSuccess(''); }}>
            📤 Effectuer un retrait
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#059669' }}>
            {payments.filter(p => {
              const d = new Date(p.timestamp); const n = new Date();
              return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
            }).reduce((s, p) => s + p.amount, 0).toLocaleString()}
          </div>
          <div className="stat-label">Entrées ce mois (FCFA)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#dc2626' }}>
            {withdrawals.filter(w => {
              const d = new Date(w.timestamp); const n = new Date();
              return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
            }).reduce((s, w) => s + w.amount, 0).toLocaleString()}
          </div>
          <div className="stat-label">Retraits ce mois (FCFA)</div>
        </div>
      </div>

      {/* Export buttons */}
      <div style={{ marginBottom: 20 }}>
        <div className="section-title">📊 Générer un bilan</div>
        <div className="grid-2">
          <button className="btn btn-ghost" onClick={() => exportExcel('monthly')}>📅 Bilan Mensuel</button>
          <button className="btn btn-ghost" onClick={() => exportExcel('annual')}>📆 Bilan Annuel</button>
        </div>
      </div>

      {/* Withdraw form */}
      {showWithdrawForm && (
        <div className="modal-overlay" onClick={() => setShowWithdrawForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>📤 Nouveau retrait</div>
            {error && <div className="alert alert-danger"><span>⚠️</span> {error}</div>}
            <div className="input-group">
              <label className="input-label">Montant (FCFA) *</label>
              <input className="input" type="number" placeholder="Ex: 5000" value={amount} onChange={e => setAmount(e.target.value)} />
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Disponible: {treasury.balance.toLocaleString()} FCFA</div>
            </div>
            <div className="input-group">
              <label className="input-label">Motif du retrait *</label>
              <textarea className="input" style={{ minHeight: 80, resize: 'none' }} placeholder="Ex: Achat matériel réunion, Organisation événement..." value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Mot de passe de confirmation *</label>
              <input className="input" type="password" placeholder="Votre mot de passe" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-danger" onClick={handleWithdraw} disabled={submitting}>{submitting ? '⏳' : '✅ Confirmer le retrait'}</button>
            <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => { setShowWithdrawForm(false); setError(''); }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Withdrawals history */}
      <div>
        <div className="section-title">📋 Historique des retraits</div>
        {withdrawals.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: 13, padding: 20 }}>Aucun retrait enregistré</div>
        ) : (
          withdrawals.map(w => (
            <div key={w.id} className="card" style={{ borderLeft: '4px solid #dc2626', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 16 }}>-{w.amount.toLocaleString()} FCFA</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{new Date(w.timestamp).toLocaleDateString('fr-FR')}</div>
              </div>
              <div style={{ fontSize: 13, marginBottom: 6, color: '#374151' }}>📝 {w.reason}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>Par: {w.pcsName} • Solde avant: {w.balanceBefore.toLocaleString()} → après: {w.balanceAfter.toLocaleString()} FCFA</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
