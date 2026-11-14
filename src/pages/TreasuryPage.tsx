import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { Withdrawal, Treasury, Payment } from '../types';
import * as XLSX from 'xlsx';

const NAVY = '#0F2557';
const MUTED = '#55627F';

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

      // Seuls les paiements confirmés comptent dans les entrées
      const pq = query(collection(db, 'payments'), orderBy('timestamp', 'desc'));
      const ps = await getDocs(pq);
      setPayments(
        ps.docs
          .map(d => ({ id: d.id, ...d.data() } as Payment))
          .filter(p => p.status === 'completed')
      );
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const amt = Math.round(parseFloat(amount) || 0);

  const closeForm = () => {
    setShowWithdrawForm(false);
    setError('');
    setAmount(''); setReason(''); setPassword('');
  };

  const handleWithdraw = async () => {
    if (!amt || amt <= 0) { setError('Entrez un montant valide.'); return; }
    if (!reason.trim()) { setError('Indiquez le motif du retrait.'); return; }
    if (amt > treasury.balance) { setError(`Solde insuffisant : ${treasury.balance.toLocaleString()} FCFA disponibles.`); return; }
    if (!password) { setError('Entrez votre mot de passe pour confirmer.'); return; }

    setSubmitting(true); setError('');
    try {
      const ok = await verifyPassword(password);
      if (!ok) { setError('Mot de passe incorrect.'); setSubmitting(false); return; }

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
      await setDoc(doc(db, 'treasury', 'main'), { balance: newBalance, lastUpdated: new Date().toISOString() });

      setTreasury({ balance: newBalance, lastUpdated: new Date().toISOString() });
      setSuccess(`Retrait de ${amt.toLocaleString()} FCFA enregistré. Effectuez maintenant le même retrait sur Wave.`);
      closeForm();
      loadData();
    } catch (e: any) { setError('Erreur : ' + e.message); }
    finally { setSubmitting(false); }
  };

  const sameMonth = (iso: string, ref: Date) => {
    const d = new Date(iso);
    return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
  };

  const now = new Date();
  const monthIn = payments.filter(p => sameMonth(p.timestamp, now)).reduce((s, p) => s + p.amount, 0);
  const monthOut = withdrawals.filter(w => sameMonth(w.timestamp, now)).reduce((s, w) => s + w.amount, 0);

  const typeLabel = (t?: string) =>
    t === 'mensualite' ? 'Mensualités'
    : t === 'carte' ? 'Cartes de membre'
    : t ? t.charAt(0).toUpperCase() + t.slice(1)
    : 'Autre';

  const exportExcel = (period: 'monthly' | 'annual') => {
    const ref = new Date();
    let filteredPayments = payments;
    let filteredWithdrawals = withdrawals;
    let title = '';
    let periodLabel = '';

    if (period === 'monthly') {
      filteredPayments = payments.filter(p => sameMonth(p.timestamp, ref));
      filteredWithdrawals = withdrawals.filter(w => sameMonth(w.timestamp, ref));
      periodLabel = ref.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase();
      title = `Bilan_${ref.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(' ', '_')}`;
    } else {
      filteredPayments = payments.filter(p => new Date(p.timestamp).getFullYear() === ref.getFullYear());
      filteredWithdrawals = withdrawals.filter(w => new Date(w.timestamp).getFullYear() === ref.getFullYear());
      periodLabel = String(ref.getFullYear());
      title = `Bilan_Annuel_${ref.getFullYear()}`;
    }

    const totalIn = filteredPayments.reduce((s, p) => s + p.amount, 0);
    const totalOut = filteredWithdrawals.reduce((s, w) => s + w.amount, 0);

    // Entrées regroupées par type de paiement
    const byType: Record<string, { count: number; total: number }> = {};
    filteredPayments.forEach(p => {
      const key = (p.type as string) || 'autre';
      if (!byType[key]) byType[key] = { count: 0, total: 0 };
      byType[key].count += 1;
      byType[key].total += p.amount;
    });
    const typeRows = Object.entries(byType).map(([k, v]) => [typeLabel(k), v.count, v.total]);

    // Retraits du plus ancien au plus récent
    const sortedW = [...filteredWithdrawals].sort(
      (x, y) => new Date(x.timestamp).getTime() - new Date(y.timestamp).getTime()
    );

    const wb = XLSX.utils.book_new();

    // ---- Feuille Résumé (tout l'essentiel sur une page) ----
    const summaryData: (string | number)[][] = [
      ['AMICALE DES ÉTUDIANTS MBOUROIS (AMEEM)'],
      [`BILAN ${period === 'monthly' ? 'MENSUEL' : 'ANNUEL'} — ${periodLabel}`],
      [],
      ['RÉSUMÉ FINANCIER'],
      ['Total entrées (FCFA)', totalIn],
      ['Total retraits (FCFA)', totalOut],
      ['Solde net de la période (FCFA)', totalIn - totalOut],
      ['Solde actuel de la caisse (FCFA)', treasury.balance],
      [],
      ['ENTRÉES PAR TYPE'],
      ['Type', 'Nombre', 'Total (FCFA)'],
      ...(typeRows.length ? typeRows : [['Aucune entrée sur la période', 0, 0]]),
      ['TOTAL', filteredPayments.length, totalIn],
      [],
      ['DÉTAIL DES RETRAITS'],
      ['Date', 'Motif', 'Responsable', 'Montant (FCFA)'],
      ...(sortedW.length
        ? sortedW.map(w => [new Date(w.timestamp).toLocaleDateString('fr-FR'), w.reason, w.pcsName, w.amount])
        : [['Aucun retrait sur la période', '', '', 0]]),
      ['TOTAL', '', '', totalOut],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    summarySheet['!cols'] = [{ wch: 34 }, { wch: 40 }, { wch: 22 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Résumé');

    // ---- Feuille Paiements ----
    const payData = [
      ['Date', 'Membre', 'Type', 'Montant (FCFA)', 'Statut'],
      ...filteredPayments.map(p => [
        new Date(p.timestamp).toLocaleDateString('fr-FR'),
        p.userName,
        typeLabel(p.type as string),
        p.amount,
        p.status === 'completed' ? 'Payé' : 'En attente',
      ]),
      [],
      ['TOTAL', '', '', totalIn, ''],
    ];
    const paySheet = XLSX.utils.aoa_to_sheet(payData);
    paySheet['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, paySheet, 'Paiements');

    // ---- Feuille Retraits ----
    const wData = [
      ['Date', 'Responsable', 'Motif', 'Montant (FCFA)', 'Solde avant', 'Solde après'],
      ...sortedW.map(w => [
        new Date(w.timestamp).toLocaleDateString('fr-FR'),
        w.pcsName,
        w.reason,
        w.amount,
        w.balanceBefore,
        w.balanceAfter,
      ]),
      [],
      ['TOTAL', '', '', totalOut, '', ''],
    ];
    const wSheet = XLSX.utils.aoa_to_sheet(wData);
    wSheet['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 40 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wSheet, 'Retraits');

    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  if (loading) return <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div className="page fade-in">
      <div style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginBottom: 16 }}>Caisse</div>

      {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success}</div>}

      {/* Solde */}
      <div className="card card-gradient" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>Solde de la caisse</div>
        <div style={{ fontSize: 34, fontWeight: 800, margin: '6px 0' }}>{treasury.balance.toLocaleString()} FCFA</div>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Mis à jour le {new Date(treasury.lastUpdated).toLocaleString('fr-FR')}</div>
        <button
          className="btn"
          style={{ background: '#fff', color: NAVY, fontWeight: 700, marginTop: 16, width: '100%', minHeight: 48 }}
          onClick={() => { setShowWithdrawForm(true); setSuccess(''); }}
        >
          Nouveau retrait
        </button>
      </div>

      {/* Ce mois-ci */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#059669' }}>{monthIn.toLocaleString()}</div>
          <div className="stat-label">Entrées ce mois (FCFA)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#dc2626' }}>{monthOut.toLocaleString()}</div>
          <div className="stat-label">Retraits ce mois (FCFA)</div>
        </div>
      </div>

      {/* Bilans */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-title">Télécharger un bilan (Excel)</div>
        <div className="grid-2">
          <button className="btn btn-ghost" onClick={() => exportExcel('monthly')}>Ce mois</button>
          <button className="btn btn-ghost" onClick={() => exportExcel('annual')}>Cette année</button>
        </div>
      </div>

      {/* Historique */}
      <div>
        <div className="section-title">Retraits récents</div>
        {withdrawals.length === 0 ? (
          <div style={{ textAlign: 'center', color: MUTED, fontSize: 14, padding: 20 }}>Aucun retrait enregistré.</div>
        ) : (
          <div className="card" style={{ padding: '4px 16px' }}>
            {withdrawals.map((w, i) => (
              <div key={w.id} style={{ padding: '14px 0', borderBottom: i < withdrawals.length - 1 ? '1px solid #E5E9F2' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#b91c1c' }}>-{w.amount.toLocaleString()} FCFA</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{new Date(w.timestamp).toLocaleDateString('fr-FR')}</div>
                </div>
                <div style={{ fontSize: 14, color: '#1f2937', margin: '4px 0' }}>{w.reason}</div>
                <div style={{ fontSize: 12, color: MUTED }}>
                  {w.pcsName} · solde après : {w.balanceAfter.toLocaleString()} FCFA
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulaire de retrait */}
      {showWithdrawForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 16 }}>Nouveau retrait</div>

            {error && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{error}</div>}

            <div className="input-group">
              <label className="input-label" htmlFor="wd-amount">Montant (FCFA)</label>
              <input id="wd-amount" className="input" type="number" inputMode="numeric" placeholder="Ex : 5000" value={amount} onChange={e => setAmount(e.target.value)} />
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Disponible : {treasury.balance.toLocaleString()} FCFA</div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="wd-reason">Motif</label>
              <input id="wd-reason" className="input" type="text" placeholder="Ex : achat de matériel" value={reason} onChange={e => setReason(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="wd-pass">Mot de passe</label>
              <input id="wd-pass" className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <button className="btn btn-danger" style={{ minHeight: 48 }} onClick={handleWithdraw} disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Confirmer le retrait'}
            </button>
            <button
              className="btn"
              style={{ background: 'transparent', color: MUTED, marginTop: 6, minHeight: 44 }}
              onClick={closeForm}
              disabled={submitting}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
