import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { User, Payment } from '../types';

interface Props { onNavigate: (p: string) => void; }

type Tab = 'bureau' | 'students' | 'payments' | 'unpaid';

const formatDate = (ts: string) => {
  try { const d = new Date(ts); return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR'); } catch { return '-'; }
};

export default function AdminPage({ onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>('bureau');
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'bureau' | 'student'>('bureau');
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

  const handleDelete = async (uid: string, name: string) => {
    if (!confirm(`Supprimer ${name} ?`)) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(prev => prev.filter(u => u.uid !== uid));
    } catch (e: any) { alert('Erreur: ' + e.message); }
  };

  const handleToggleRole = async (user: User) => {
    try {
      const newRole = user.role === 'bureau_member' ? 'student' : 'bureau_member';
      await updateDoc(doc(db, 'users', user.uid), { role: newRole, isBureauMember: newRole === 'bureau_member' });
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, role: newRole as any, isBureauMember: newRole === 'bureau_member' } : u));
    } catch (e: any) { alert('Erreur: ' + e.message); }
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
      await addDoc(collection(db, 'users'), user);
      setUsers(prev => [user, ...prev]);
      setShowAddModal(false);
      setNewMember({ firstName: '', lastName: '', email: '', phone: '', bureauRole: '', address: '', level: '', major: '' });
    } catch (e: any) { setAddError('Erreur: ' + e.message); }
  };

  const now = new Date();
  const paidThisMonthSet = new Set(
    payments.filter(p => {
      const d = new Date(p.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        && p.type === 'mensualite' && p.status === 'completed';
    }).map(p => p.userId)
  );

  // Separate lists
  const bureauMembers = users.filter(u => u.role === 'bureau_member' || u.role === 'admin');
  const studentMembers = users.filter(u => u.role === 'student');
  const unpaidUsers = users.filter(u => u.role !== 'admin' && !paidThisMonthSet.has(u.uid));
  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);

  const filterUsers = (list: User[]) =>
    list.filter(u => `${u.firstName} ${u.lastName} ${u.email} ${u.phone}`.toLowerCase().includes(search.toLowerCase()));

  const sendReminder = async (user: User) => {
    try {
      await addDoc(collection(db, 'messages'), {
        fromId: 'admin',
        fromName: 'Administration AMEEM',
        toUserId: user.uid,
        content: `Bonjour ${user.firstName}, nous vous rappelons d'effectuer votre cotisation mensuelle. Merci.`,
        timestamp: new Date().toISOString(),
        read: false,
      });
      alert(`Rappel envoyé à ${user.firstName} ${user.lastName}`);
    } catch (e: any) { alert('Erreur: ' + e.message); }
  };

  const TABS: [Tab, string][] = [
    ['bureau', '🏛️ Bureau'],
    ['students', '🎓 Étudiants'],
    ['payments', '💳 Paiements'],
    ['unpaid', '⚠️ Non payés'],
  ];

  return (
    <div className="page fade-in">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>👑 Administration</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Gestion de l'AMEEM</div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 18 }}>{bureauMembers.length}</div>
          <div className="stat-label">Bureau</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 18 }}>{studentMembers.length}</div>
          <div className="stat-label">Étudiants</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 14 }}>{totalRevenue.toLocaleString()}</div>
          <div className="stat-label">FCFA</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 18, color: '#dc2626' }}>{unpaidUsers.length}</div>
          <div className="stat-label">Non payés</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 3, marginBottom: 16, gap: 2, overflowX: 'auto' }}>
        {TABS.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: '1 0 auto', padding: '7px 6px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 11, fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? '#1a56db' : '#6b7280',
            boxShadow: tab === t ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* Search + Add (for bureau/students tabs) */}
      {(tab === 'bureau' || tab === 'students') && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input className="input" style={{ flex: 1 }} placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={() => { setAddType(tab === 'bureau' ? 'bureau' : 'student'); setShowAddModal(true); }}>
            + Ajouter
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 30 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : (
        <>
          {/* Bureau Members Tab */}
          {tab === 'bureau' && (
            <>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>{filterUsers(bureauMembers).length} membre(s) du bureau</div>
              {filterUsers(bureauMembers).map(u => (
                <UserCard key={u.uid} user={u} onToggle={handleToggleRole} onDelete={handleDelete} showToggle={u.role !== 'admin'} />
              ))}
              {bureauMembers.length === 0 && <EmptyState msg="Aucun membre du bureau enregistré" />}
            </>
          )}

          {/* Students Tab */}
          {tab === 'students' && (
            <>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>{filterUsers(studentMembers).length} étudiant(s) inscrit(s)</div>
              {filterUsers(studentMembers).map(u => (
                <UserCard key={u.uid} user={u} onToggle={handleToggleRole} onDelete={handleDelete} showToggle />
              ))}
              {studentMembers.length === 0 && <EmptyState msg="Aucun étudiant inscrit" />}
            </>
          )}

          {/* Payments Tab */}
          {tab === 'payments' && (
            <>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>{payments.length} paiement(s) enregistré(s)</div>
              {payments.length === 0 ? <EmptyState msg="Aucun paiement enregistré" /> : (
                payments.slice(0, 60).map(p => (
                  <div key={p.id} className="list-item">
                    <span style={{ fontSize: 20 }}>{p.type === 'mensualite' ? '📅' : '🪪'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.userName}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{formatDate(p.timestamp)} — {p.type === 'mensualite' ? 'Mensualité' : 'Carte'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#059669', fontSize: 13 }}>{p.amount.toLocaleString()} F</div>
                      <span className={`badge ${p.status === 'completed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                        {p.status === 'completed' ? '✅ Payé' : '⏳ Attente'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Unpaid Tab */}
          {tab === 'unpaid' && (
            <>
              <div className="alert alert-warning" style={{ marginBottom: 14 }}>
                <span>⚠️</span>
                <div>{unpaidUsers.length} membre(s) n'ont pas encore payé en {now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</div>
              </div>
              {unpaidUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#059669' }}>
                  <div style={{ fontSize: 40 }}>🎉</div>
                  <div style={{ fontWeight: 600, marginTop: 8 }}>Tous ont payé ce mois-ci !</div>
                </div>
              ) : (
                unpaidUsers.map(u => (
                  <div key={u.uid} className="member-card">
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{u.firstName?.[0]}{u.lastName?.[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{u.firstName} {u.lastName}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{u.phone || u.email || '-'}</div>
                      <span className={`badge ${u.role === 'bureau_member' ? 'badge-primary' : 'badge-success'}`} style={{ marginTop: 2, fontSize: 10 }}>
                        {u.role === 'bureau_member' ? 'Bureau' : 'Étudiant'}
                      </span>
                    </div>
                    <button className="btn btn-sm btn-ghost" onClick={() => sendReminder(u)} style={{ fontSize: 11, padding: '6px 10px' }}>
                      📩 Rappel
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>
              ➕ Ajouter {addType === 'bureau' ? 'un membre bureau' : 'un étudiant'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => setAddType('bureau')} className={`btn btn-sm ${addType === 'bureau' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>🏛️ Bureau</button>
              <button onClick={() => setAddType('student')} className={`btn btn-sm ${addType === 'student' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }}>🎓 Étudiant</button>
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
                <input className="input" placeholder="Ex: Trésorier" value={newMember.bureauRole} onChange={e => setNewMember(p => ({ ...p, bureauRole: e.target.value }))} />
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
            <button className="btn btn-primary" onClick={handleAdd}>✅ Ajouter</button>
            <button className="btn btn-outline" style={{ marginTop: 8 }} onClick={() => { setShowAddModal(false); setAddError(''); }}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserCard({ user, onToggle, onDelete, showToggle }: { user: User; onToggle: (u: User) => void; onDelete: (uid: string, name: string) => void; showToggle: boolean }) {
  return (
    <div className="member-card">
      <div className="avatar" style={{
        background: user.role === 'admin' ? 'linear-gradient(135deg,#d97706,#dc2626)' : user.role === 'bureau_member' ? 'linear-gradient(135deg,#7c3aed,#1a56db)' : 'linear-gradient(135deg,#1a56db,#059669)',
        width: 38, height: 38, fontSize: 13
      }}>
        {user.firstName?.[0]}{user.lastName?.[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{user.firstName} {user.lastName}</div>
        <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email || user.phone || '-'}</div>
        <span className={`badge ${user.role === 'admin' ? 'badge-warning' : user.role === 'bureau_member' ? 'badge-primary' : 'badge-success'}`} style={{ marginTop: 2, fontSize: 10 }}>
          {user.role === 'admin' ? '👑 Admin' : user.role === 'bureau_member' ? `🏛️ ${user.bureauRole || 'Bureau'}` : '🎓 Étudiant'}
        </span>
      </div>
      {user.role !== 'admin' && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {showToggle && (
            <button onClick={() => onToggle(user)} title={user.role === 'bureau_member' ? 'Passer en étudiant' : 'Passer en bureau'} className="btn btn-sm btn-ghost" style={{ padding: '6px 8px', fontSize: 13 }}>
              {user.role === 'bureau_member' ? '🎓' : '🏛️'}
            </button>
          )}
          <button onClick={() => onDelete(user.uid, `${user.firstName} ${user.lastName}`)} className="btn btn-sm btn-danger" style={{ padding: '6px 8px', fontSize: 13 }}>🗑</button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
      <div style={{ fontSize: 13 }}>{msg}</div>
    </div>
  );
}
