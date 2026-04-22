import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import * as XLSX from 'xlsx';

interface Payment { id?: string; userId?: string; userName?: string; amount?: number; type?: string; timestamp?: string; month?: string; }
interface Withdrawal { id?: string; amount?: number; reason?: string; timestamp?: string; performedBy?: string; }

export default function ReportsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const pq = query(collection(db, 'payments'), orderBy('timestamp', 'desc'));
      const ps = await getDocs(pq);
      setPayments(ps.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));

      const wq = query(collection(db, 'withdrawals'), orderBy('timestamp', 'desc'));
      const ws = await getDocs(wq);
      setWithdrawals(ws.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filterByPeriod = <T extends { timestamp?: string }>(items: T[]): T[] => {
    if (period === 'annual') {
      const year = selectedMonth.split('-')[0];
      return items.filter(i => i.timestamp?.startsWith(year));
    }
    return items.filter(i => i.timestamp?.startsWith(selectedMonth));
  };

  const filteredPayments = filterByPeriod(payments);
  const filteredWithdrawals = filterByPeriod(withdrawals);
  const totalEntrees = filteredPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalSorties = filteredWithdrawals.reduce((s, w) => s + (w.amount || 0), 0);
  const solde = totalEntrees - totalSorties;

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Paiements
    const payData = [
      ['Date', 'Membre', 'Montant (FCFA)', 'Type'],
      ...filteredPayments.map(p => [formatDate(p.timestamp), p.userName || '—', p.amount || 0, p.type || 'mensualité']),
      [],
      ['TOTAL ENTRÉES', '', totalEntrees, ''],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(payData), 'Paiements');

    // Sheet 2 — Retraits
    const wdData = [
      ['Date', 'Motif', 'Montant (FCFA)', 'Effectué par'],
      ...filteredWithdrawals.map(w => [formatDate(w.timestamp), w.reason || '—', w.amount || 0, w.performedBy || '—']),
      [],
      ['TOTAL SORTIES', '', totalSorties, ''],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wdData), 'Retraits');

    // Sheet 3 — Résumé
    const label = period === 'annual' ? selectedMonth.split('-')[0] : selectedMonth;
    const sumData = [
      [`BILAN ${period === 'annual' ? 'ANNUEL' : 'MENSUEL'} — ${label}`],
      [],
      ['Total Entrées (FCFA)', totalEntrees],
      ['Total Sorties (FCFA)', totalSorties],
      ['Solde Net (FCFA)', solde],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumData), 'Résumé');

    XLSX.writeFile(wb, `Bilan_AMEEM_${label}.xlsx`);
  };

  const card = (label: string, value: string, color: string, icon: string) => (
    <div style={{ background: 'white', borderRadius: 16, padding: '18px 16px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: `2px solid ${color}20` }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  );

  if (loading) return <div style={{ textAlign: 'center', padding: 40, fontSize: 16 }}>⏳ Chargement...</div>;

  return (
    <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>📊 Rapports</h2>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>Bilan financier de l'amicale</p>

      {/* Période */}
      <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['monthly', 'annual'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              background: period === p ? '#1a56db' : '#f3f4f6', color: period === p ? 'white' : '#374151'
            }}>{p === 'monthly' ? '📅 Mensuel' : '📆 Annuel'}</button>
          ))}
        </div>
        <input type={period === 'monthly' ? 'month' : 'number'} value={period === 'monthly' ? selectedMonth : selectedMonth.split('-')[0]}
          onChange={e => period === 'monthly' ? setSelectedMonth(e.target.value) : setSelectedMonth(e.target.value + '-01')}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 15 }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {card('Entrées', `${totalEntrees.toLocaleString()} F`, '#059669', '💰')}
        {card('Sorties', `${totalSorties.toLocaleString()} F`, '#dc2626', '💸')}
        {card('Solde', `${solde.toLocaleString()} F`, solde >= 0 ? '#1a56db' : '#dc2626', '📈')}
      </div>

      {/* Export */}
      <button onClick={exportExcel} style={{
        width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #059669, #1a56db)', color: 'white', fontWeight: 800, fontSize: 16, marginBottom: 20
      }}>📥 Télécharger Excel</button>

      {/* Paiements */}
      <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: '#059669' }}>💰 Paiements ({filteredPayments.length})</h3>
        {filteredPayments.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: 14 }}>Aucun paiement sur cette période</p>
        ) : filteredPayments.slice(0, 10).map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.userName || 'Membre'}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{formatDate(p.timestamp)}</div>
            </div>
            <div style={{ fontWeight: 700, color: '#059669', fontSize: 15 }}>+{(p.amount || 0).toLocaleString()} F</div>
          </div>
        ))}
      </div>

      {/* Retraits */}
      <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: '#dc2626' }}>💸 Retraits ({filteredWithdrawals.length})</h3>
        {filteredWithdrawals.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: 14 }}>Aucun retrait sur cette période</p>
        ) : filteredWithdrawals.map(w => (
          <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{w.reason || '—'}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>{formatDate(w.timestamp)}</div>
            </div>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 15 }}>-{(w.amount || 0).toLocaleString()} F</div>
          </div>
        ))}
      </div>
    </div>
  );
}
