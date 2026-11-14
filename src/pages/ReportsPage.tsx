import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { ChevronLeft, ChevronRight, Download, List } from 'lucide-react';

interface Payment { id?: string; userName?: string; amount?: number; type?: string; status?: string; timestamp: string; }
interface Withdrawal { id?: string; amount?: number; reason?: string; performedBy?: string; timestamp: string; }

// Convertit n'importe quel format de date Firestore en texte ISO
const toIso = (v: any): string => {
  if (typeof v === 'string') return v;
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  if (typeof v === 'number') return new Date(v).toISOString();
  return '';
};

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const fmt = (n: number) => n.toLocaleString('fr-FR');
const typeLabel = (t?: string) =>
  t === 'mensualite' ? 'Mensualités' : t === 'carte' ? 'Cartes de membre' : t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Autres';
const formatDate = (iso: string) => {
  if (!iso) return 'Date inconnue';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'Date inconnue' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function ReportsPage() {
  const now = new Date();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const ps = await getDocs(collection(db, 'payments'));
      setPayments(ps.docs.map(d => { const x: any = d.data(); return { id: d.id, ...x, timestamp: toIso(x.timestamp) } as Payment; }));
    } catch (e) { console.error(e); }
    try {
      const ws = await getDocs(collection(db, 'withdrawals'));
      setWithdrawals(ws.docs.map(d => { const x: any = d.data(); return { id: d.id, ...x, timestamp: toIso(x.timestamp) } as Withdrawal; }));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Période choisie
  const prefix = mode === 'year' ? `${year}` : `${year}-${String(month + 1).padStart(2, '0')}`;
  const label = mode === 'year' ? `${year}` : `${MONTHS[month]} ${year}`;
  const isCurrent = mode === 'year' ? year >= now.getFullYear() : (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth()));

  const goPrev = () => {
    if (mode === 'year') setYear(year - 1);
    else if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const goNext = () => {
    if (isCurrent) return;
    if (mode === 'year') setYear(year + 1);
    else if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // Seuls les paiements confirmés comptent (pas les « en attente » ni « rejetés »)
  const counted = payments.filter(p => !p.status || p.status === 'completed');
  const inPeriod = <T extends { timestamp: string }>(items: T[]) =>
    items.filter(i => i.timestamp.startsWith(prefix))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const periodPayments = inPeriod(counted);
  const periodWithdrawals = inPeriod(withdrawals);
  const undated = counted.filter(p => !p.timestamp).length + withdrawals.filter(w => !w.timestamp).length;

  const totalEntrees = periodPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalSorties = periodWithdrawals.reduce((s, w) => s + (w.amount || 0), 0);
  const solde = totalEntrees - totalSorties;

  // Entrées groupées par type
  const byType: Record<string, { count: number; total: number }> = {};
  periodPayments.forEach(p => {
    const k = typeLabel(p.type);
    byType[k] = byType[k] || { count: 0, total: 0 };
    byType[k].count += 1;
    byType[k].total += p.amount || 0;
  });
  const typeRows = Object.entries(byType);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const summary: (string | number)[][] = [
      [`BILAN ${mode === 'year' ? 'ANNUEL' : 'MENSUEL'} — ${label}`],
      [],
      ['Total entrées (FCFA)', totalEntrees],
      ['Total sorties (FCFA)', totalSorties],
      ['Solde de la période (FCFA)', solde],
      [],
      ['ENTRÉES PAR TYPE', 'Nombre', 'Total (FCFA)'],
      ...typeRows.map(([k, v]) => [k, v.count, v.total]),
      [],
      ['DÉTAIL DES RETRAITS', '', '', ''],
      ['Date', 'Motif', 'Responsable', 'Montant (FCFA)'],
      ...[...periodWithdrawals].reverse().map(w => [formatDate(w.timestamp), w.reason || '—', w.performedBy || '—', w.amount || 0]),
      ['TOTAL', '', '', totalSorties],
    ];
    const s1 = XLSX.utils.aoa_to_sheet(summary);
    s1['!cols'] = [{ wch: 30 }, { wch: 28 }, { wch: 22 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, s1, 'Résumé');

    const payRows = [
      ['Date', 'Membre', 'Type', 'Montant (FCFA)'],
      ...[...periodPayments].reverse().map(p => [formatDate(p.timestamp), p.userName || '—', typeLabel(p.type), p.amount || 0]),
      [],
      ['TOTAL', '', '', totalEntrees],
    ];
    const s2 = XLSX.utils.aoa_to_sheet(payRows);
    s2['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 20 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, s2, 'Paiements');

    const wdRows = [
      ['Date', 'Motif', 'Responsable', 'Montant (FCFA)'],
      ...[...periodWithdrawals].reverse().map(w => [formatDate(w.timestamp), w.reason || '—', w.performedBy || '—', w.amount || 0]),
      [],
      ['TOTAL', '', '', totalSorties],
    ];
    const s3 = XLSX.utils.aoa_to_sheet(wdRows);
    s3['!cols'] = [{ wch: 16 }, { wch: 34 }, { wch: 22 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, s3, 'Retraits');

    XLSX.writeFile(wb, `Bilan_AMEEM_${prefix}.xlsx`);
  };

  if (loading) return (
    <div className="page home" style={{ textAlign: 'center', paddingTop: 60 }}>
      <div className="spinner" style={{ margin: '0 auto' }} />
    </div>
  );

  return (
    <div className="page home fade-in">
      {/* Mois / Année */}
      <div className="rep-seg">
        <button className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>Mois</button>
        <button className={mode === 'year' ? 'active' : ''} onClick={() => setMode('year')}>Année</button>
      </div>

      {/* Navigation de période */}
      <div className="rep-nav">
        <button onClick={goPrev} aria-label="Période précédente"><ChevronLeft size={22} /></button>
        <span className="rep-nav-label">{label}</span>
        <button onClick={goNext} disabled={isCurrent} aria-label="Période suivante"><ChevronRight size={22} /></button>
      </div>

      {/* Résumé */}
      <div className="home-hero">
        <div className="home-hero-label">Solde de la période</div>
        <div className="home-hero-amount">{fmt(solde)} FCFA</div>
        <div className="rep-hero-cols">
          <div><span className="rep-hero-k">Entrées</span><span className="rep-hero-v">{fmt(totalEntrees)} F</span></div>
          <div><span className="rep-hero-k">Sorties</span><span className="rep-hero-v">{fmt(totalSorties)} F</span></div>
        </div>
      </div>

      <button className="home-row" onClick={exportExcel}>
        <span className="home-row-icon"><Download size={20} /></span>
        <span className="home-row-text">
          <span className="home-row-title">Télécharger le bilan Excel</span>
          <span className="home-row-sub">{label}</span>
        </span>
        <ChevronRight size={20} />
      </button>

      {undated > 0 && (
        <div className="alert alert-warning">{undated} enregistrement{undated > 1 ? 's' : ''} sans date {undated > 1 ? 'ne sont' : "n'est"} pas compté{undated > 1 ? 's' : ''} dans les bilans.</div>
      )}

      {/* Entrées */}
      <div className="home-section">Entrées</div>
      {typeRows.length === 0 ? (
        <div className="pay-empty">Aucune entrée sur cette période</div>
      ) : (
        <div className="profile-card">
          {typeRows.map(([k, v]) => (
            <div key={k} className="profile-item">
              <span className="profile-item-text" style={{ flex: 1 }}>
                <span className="profile-item-value">{k}</span>
                <span className="profile-item-label">{v.count} paiement{v.count > 1 ? 's' : ''}</span>
              </span>
              <span className="pay-amount">+{fmt(v.total)} F</span>
            </div>
          ))}
        </div>
      )}

      {periodPayments.length > 0 && (
        <button className="rep-toggle" onClick={() => setShowDetail(!showDetail)}>
          <List size={16} /> {showDetail ? 'Masquer le détail' : `Voir le détail (${periodPayments.length})`}
        </button>
      )}
      {showDetail && (
        <div className="profile-card">
          {periodPayments.map(p => (
            <div key={p.id} className="profile-item">
              <span className="profile-item-text" style={{ flex: 1 }}>
                <span className="profile-item-value">{p.userName || 'Membre'}</span>
                <span className="profile-item-label">{formatDate(p.timestamp)} · {typeLabel(p.type)}</span>
              </span>
              <span className="pay-amount">+{fmt(p.amount || 0)} F</span>
            </div>
          ))}
        </div>
      )}

      {/* Retraits */}
      <div className="home-section">Retraits</div>
      {periodWithdrawals.length === 0 ? (
        <div className="pay-empty">Aucun retrait sur cette période</div>
      ) : (
        <div className="profile-card">
          {periodWithdrawals.map(w => (
            <div key={w.id} className="profile-item">
              <span className="profile-item-text" style={{ flex: 1 }}>
                <span className="profile-item-value">{w.reason || 'Sans motif'}</span>
                <span className="profile-item-label">{formatDate(w.timestamp)}{w.performedBy ? ` · ${w.performedBy}` : ''}</span>
              </span>
              <span className="pay-amount rep-out">−{fmt(w.amount || 0)} F</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}