import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc, setDoc, addDoc } from 'firebase/firestore';
import { User, Payment } from '../types';

interface Props { onNavigate: (p: string) => void; }

type Tab = 'payments' | 'verify' | 'unpaid' | 'members';
type Filter = 'all' | 'bureau' | 'student';

const NAVY = '#0F2557';
const MUTED = '#55627F';

const formatDate = (ts?: string) => {
  try { const d = new Date(ts || ''); return isNaN(d.getTime()) ? 'Date inconnue' : d.toLocaleDateString('fr-FR'); } catch { return 'Date inconnue'; }
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function AdminPage(_props: Props) {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>('payments');
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [validAmounts, setValidAmounts] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'bureau' | 'student'>('student');
  const [newMember, setNewMember] = useState({ firstName: '', lastName: '', email: '', phone: '', bureauRole: '', address: '', level: '', major: '' });
  const [addError, setAddError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const uq = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const us = await getDocs(uq);
      setUsers(us.docs.map(d => ({ ...d.data() } as User)));

      const pq = query(collection(db, 'payments'), orderBy('timestamp', 'desc'));
      const ps = await getDocs(pq);
      setPayments(ps.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  /* ---------- Mois sélectionné ---------- */
  const [yy, mm] = month.split('-').map(Number);
  const monthLabel = new Date(yy, mm - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const isCurrentMonth = month >= monthKey(new Date());
  const shiftMonth = (delta: number) => {
    const d = new Date(yy, mm - 1 + delta, 1);
    setMonth(monthKey(d));
  };

  /* ---------- Données calculées ---------- */
  const isMensualite = (p: Payment) => p.type === 'mensualite';
  const monthPaid = payments.filter(p => isMensualite(p) && p.status === 'completed' && (p.timestamp || '').startsWith(month));
  const paidSet = new Set(monthPaid.map(p => p.userId));
  const monthTotal = monthPaid.reduce((s, p) => s + (p.amount || 0), 0);
  const pending = payments.filter(p => isMensualite(p) && p.status !== 'completed' && (p.status as string) !== 'rejected');

  const members = users.filter(u => u.role !== 'admin');
  const unpaidUsers = members.filter(u => !paidSet.has(u.uid));

  /* ---------- Actions paiements ---------- */
  const validatePayment = async (p: Payment) => {
    const raw = validAmounts[p.id as string];
    const amt = Math.round(parseFloat(raw !== undefined ? raw : String(p.amount)) || 0);
    if (amt <= 0) { alert('Montant invalide'); return; }
    try {
      const patch = {
        status: 'completed',
        amount: amt,
        validatedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'admin',
        validatedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'payments', p.id as string), patch);
      setPayments(prev => prev.map(x => x.id === p.id ? ({ ...x, ...patch } as any) : x));
    } catch (e: any) { alert('Erreur : ' + e.message); }
  };

  const rejectPayment = async (p: Payment) => {
    if (!confirm(`Rejeter ce paiement de ${p.userName} ?`)) return;
    try {
      await updateDoc(doc(db, 'payments', p.id as string), { status: 'rejected', validatedAt: new Date().toISOString() });
      setPayments(prev => prev.map(x => x.id === p.id ? ({ ...x, status: 'rejected' } as any) : x));
    } catch (e: any) { alert('Erreur : ' + e.message); }
  };

  /* ---------- Actions membres ---------- */
  const handleDelete = async (uid: string, name: string) => {
    if (!confirm(`Supprimer ${name} ?`)) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(prev => prev.filter(u => u.uid !== uid));
    } catch (e: any) { alert('Erreur : ' + e.message); }
  };

  const handleToggleRole = async (user: User) => {
    try {
      const newRole = user.role === 'bureau_member' ? 'student' : 'bureau_member';
      await updateDoc(doc(db, 'users', user.uid), { role: newRole, isBureauMember: newRole === 'bureau_member' });
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, role: newRole as any, isBureauMember: newRole === 'bureau_member' } : u));
    } catch (e: any) { alert('Erreur : ' + e.message); }
  };

  const handleAdd = async () => {
    if (!newMember.firstName || !newMember.lastName) { setAddError('Prénom et nom requis'); return; }
    setAddError('');
    try {
      const uid = (addType === 'bureau' ? 'bureau_' : 'student_') + Date.now();
      const user: User = {
        uid,
        firstName: newMember.firstName,
        lastName: newMember.lastName,
        email: newMember.email,
        phone: newMember.phone,
        address: newMember.address,
        role: addType === 'bureau' ? 'bureau_member' : 'student',
        bureauRole: addType === 'bureau' ? newMember.bureauRole : '',
        level: newMember.level,
        major: newMember.major,
        createdAt: new Date().toISOString(),
        isBureauMember: addType === 'bureau',
      };
      // L'identifiant du document = uid, pour que la suppression et le changement de rôle fonctionnent
      await setDoc(doc(db, 'users', uid), user);
      setUsers(prev => [user, ...prev]);
      setShowAddModal(false);
      setNewMember({ firstName: '', lastName: '', email: '', phone: '', bureauRole: '', address: '', level: '', major: '' });
    } catch (e: any) { setAddError('Erreur : ' + e.message); }
  };

  const sendReminder = async (user: User) => {
    try {
      await addDoc(collection(db, 'messages'), {
        fromId: 'admin',
        fromName: 'Administration AMEEM',
        toUserId: user.uid,
        content: `Bonjour ${user.firstName}, nous vous rappelons d'effectuer votre mensualité de ${monthLabel}. Merci.`,
        timestamp: new Date().toISOString(),
        read: false,
      });
      alert(`Rappel envoyé à ${user.firstName} ${user.lastName}`);
    } catch (e: any) { alert('Erreur : ' + e.message); }
  };

  const waLink = (u: User) => {
    const d = (u.phone || '').replace(/\D/g, '');
    if (!d) return '';
    const n = d.length === 9 ? '221' + d : d;
    const text = encodeURIComponent(`Bonjour ${u.firstName}, rappel de la mensualité AMEEM de ${monthLabel}. Merci.`);
    return `https://wa.me/${n}?text=${text}`;
  };

  const shownMembers = members
    .filter(u => filter === 'all' ? true : filter === 'bureau' ? u.role === 'bureau_member' : u.role === 'student')
    .filter(u => `${u.firstName} ${u.lastName} ${u.email} ${u.phone}`.toLowerCase().includes(search.toLowerCase()));

  const TABS: [Tab, string][] = [
    ['payments', 'Paiements'],
    ['verify', pending.length ? `À vérifier (${pending.length})` : 'À vérifier'],
    ['unpaid', 'Non payés'],
    ['members', 'Membres'],
  ];

  return (
    <div className="page fade-in">
      <div style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginBottom: 14 }}>Administration</div>

      {/* Sélecteur de mois */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 14, padding: '6px 8px', marginBottom: 14, boxShadow: '0 2px 8px rgba(15,37,87,0.06)' }}>
        <button aria-label="Mois précédent" onClick={() => shiftMonth(-1)} style={{ border: 'none', background: 'transparent', fontSize: 22, color: NAVY, minWidth: 44, minHeight: 44, cursor: 'pointer' }}>‹</button>
        <div style={{ fontWeight: 700, color: NAVY, textTransform: 'capitalize' }}>{monthLabel}</div>
        <button aria-label="Mois suivant" onClick={() => shiftMonth(1)} disabled={isCurrentMonth} style={{ border: 'none', background: 'transparent', fontSize: 22, color: isCurrentMonth ? '#c5cbd9' : NAVY, minWidth: 44, minHeight: 44, cursor: isCurrentMonth ? 'default' : 'pointer' }}>›</button>
      </div>

      {/* Chiffres du mois */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 18, color: '#059669' }}>{paidSet.size}</div>
          <div className="stat-label">Ont payé</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 18, color: '#dc2626' }}>{unpaidUsers.length}</div>
          <div className="stat-label">Non payés</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 15 }}>{monthTotal.toLocaleString()}</div>
          <div className="stat-label">FCFA encaissés</div>
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', background: '#E6ECFA', borderRadius: 12, padding: 3, marginBottom: 16, gap: 2 }}>
        {TABS.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600, minHeight: 44,
            background: tab === t ? '#fff' : 'transparent',
            color: tab === t ? NAVY : MUTED,
            boxShadow: tab === t ? '0 2px 4px rgba(15,37,87,0.1)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 30 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <>
          {/* ===== Paiements du mois ===== */}
          {tab === 'payments' && (
            <>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>
                {monthPaid.length} mensualité(s) confirmée(s) en {monthLabel}
              </div>
              {monthPaid.length === 0 ? <EmptyState msg="Aucun paiement confirmé ce mois-ci" /> : (
                monthPaid.map(p => (
                  <div key={p.id} className="list-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{p.userName}</div>
                      <div style={{ fontSize: 12, color: MUTED }}>{formatDate(p.timestamp)}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#059669', fontSize: 15 }}>{(p.amount || 0).toLocaleString()} F</div>
                  </div>
                ))
              )}

            </>
          )}

          {/* ===== À vérifier ===== */}
          {tab === 'verify' && (
            <>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>
                Comparez chaque paiement avec le relevé Wave, corrigez le montant si besoin, puis validez. Seuls les paiements validés comptent dans les bilans.
              </div>
              {pending.length === 0 ? <EmptyState msg="Aucun paiement à vérifier" /> : (
                pending.map(p => (
                  <div key={p.id} className="card" style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontWeight: 700 }}>{p.userName}</div>
                      <div style={{ fontSize: 12, color: MUTED }}>{formatDate(p.timestamp)}</div>
                    </div>
                    {(p as any).reference && (
                      <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>Réf. Wave : {(p as any).reference}</div>
                    )}
                    <label className="input-label" htmlFor={`va-${p.id}`}>Montant reçu (FCFA)</label>
                    <input
                      id={`va-${p.id}`} className="input" type="number" inputMode="numeric"
                      value={validAmounts[p.id as string] !== undefined ? validAmounts[p.id as string] : String(p.amount || '')}
                      onChange={e => setValidAmounts(v => ({ ...v, [p.id as string]: e.target.value }))}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button className="btn btn-primary" style={{ flex: 2, minHeight: 44 }} onClick={() => validatePayment(p)}>Valider</button>
                      <button className="btn btn-outline" style={{ flex: 1, minHeight: 44 }} onClick={() => rejectPayment(p)}>Rejeter</button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* ===== Non payés ===== */}
          {tab === 'unpaid' && (
            <>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>
                {unpaidUsers.length} membre(s) sans paiement confirmé en {monthLabel}
              </div>
              {unpaidUsers.length === 0 ? (
                <EmptyState msg="Tous les membres ont payé ce mois-ci" />
              ) : (
                unpaidUsers.map(u => (
                  <div key={u.uid} className="member-card">
                    <div className="avatar" style={{ width: 38, height: 38, fontSize: 13 }}>{u.firstName?.[0]}{u.lastName?.[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize: 12, color: MUTED }}>{u.phone || u.email || '-'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {waLink(u) && (
                        <a href={waLink(u)} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" style={{ textDecoration: 'none', minHeight: 40 }}>WhatsApp</a>
                      )}
                      <button className="btn btn-sm btn-ghost" style={{ minHeight: 40 }} onClick={() => sendReminder(u)}>Rappel</button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* ===== Membres ===== */}
          {tab === 'members' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input className="input" style={{ flex: 1 }} placeholder="Rechercher un nom" aria-label="Rechercher un membre" value={search} onChange={e => setSearch(e.target.value)} />
                <button className="btn btn-primary btn-sm" onClick={() => { setAddType('student'); setShowAddModal(true); }}>Ajouter</button>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {([['all', 'Tous'], ['bureau', 'Bureau'], ['student', 'Étudiants']] as [Filter, string][]).map(([f, l]) => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    border: 'none', borderRadius: 20, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36,
                    background: filter === f ? NAVY : '#E6ECFA', color: filter === f ? '#fff' : NAVY,
                  }}>{l}</button>
                ))}
              </div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>{shownMembers.length} membre(s)</div>
              {shownMembers.map(u => (
                <UserCard key={u.uid} user={u} onToggle={handleToggleRole} onDelete={handleDelete} />
              ))}
              {shownMembers.length === 0 && <EmptyState msg="Aucun membre trouvé" />}
            </>
          )}
        </>
      )}

      {/* Ajouter un membre */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginBottom: 12 }}>Ajouter un membre</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => setAddType('student')} className={`btn btn-sm ${addType === 'student' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>Étudiant</button>
              <button onClick={() => setAddType('bureau')} className={`btn btn-sm ${addType === 'bureau' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>Bureau</button>
            </div>
            {addError && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{addError}</div>}
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Prénom *</label>
                <input className="input" value={newMember.firstName} onChange={e => setNewMember(p => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label">Nom *</label>
                <input className="input" value={newMember.lastName} onChange={e => setNewMember(p => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>
            {addType === 'bureau' && (
              <div className="input-group">
                <label className="input-label">Rôle dans le bureau</label>
                <input className="input" placeholder="Ex : Trésorier" value={newMember.bureauRole} onChange={e => setNewMember(p => ({ ...p, bureauRole: e.target.value }))} />
              </div>
            )}
            <div className="input-group">
              <label className="input-label">Téléphone</label>
              <input className="input" type="tel" value={newMember.phone} onChange={e => setNewMember(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" value={newMember.email} onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))} />
            </div>
            {addType === 'student' && (
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Niveau</label>
                  <select className="input" value={newMember.level} onChange={e => setNewMember(p => ({ ...p, level: e.target.value }))}>
                    <option value="">-</option>
                    <option>Licence 1</option><option>Licence 2</option><option>Licence 3</option>
                    <option>Master 1</option><option>Master 2</option><option>Doctorat</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Filière</label>
                  <input className="input" value={newMember.major} onChange={e => setNewMember(p => ({ ...p, major: e.target.value }))} />
                </div>
              </div>
            )}
            <button className="btn btn-primary" style={{ minHeight: 48 }} onClick={handleAdd}>Ajouter</button>
            <button className="btn" style={{ background: 'transparent', color: MUTED, marginTop: 6, minHeight: 44 }} onClick={() => { setShowAddModal(false); setAddError(''); }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserCard({ user, onToggle, onDelete }: { user: User; onToggle: (u: User) => void; onDelete: (uid: string, name: string) => void }) {
  const isBureau = user.role === 'bureau_member';
  return (
    <div className="member-card">
      <div className="avatar" style={{ width: 38, height: 38, fontSize: 13 }}>
        {user.firstName?.[0]}{user.lastName?.[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{user.firstName} {user.lastName}</div>
        <div style={{ fontSize: 12, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.phone || user.email || '-'}</div>
        <span className={`badge ${isBureau ? 'badge-primary' : 'badge-success'}`} style={{ marginTop: 2, fontSize: 10 }}>
          {isBureau ? (user.bureauRole || 'Bureau') : 'Étudiant'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onToggle(user)} className="btn btn-sm btn-ghost" style={{ fontSize: 11, padding: '6px 10px' }}>
          {isBureau ? 'Passer étudiant' : 'Passer bureau'}
        </button>
        <button onClick={() => onDelete(user.uid, `${user.firstName} ${user.lastName}`)} className="btn btn-sm btn-danger" style={{ fontSize: 11, padding: '6px 10px' }}>
          Supprimer
        </button>
      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: MUTED, fontSize: 14 }}>{msg}</div>
  );
}
