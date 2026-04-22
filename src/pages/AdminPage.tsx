import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc, addDoc, where } from 'firebase/firestore';
import { User, Payment, BUREAU_MEMBERS } from '../types';

interface Props { onNavigate: (p: string) => void; }

type Tab = 'members' | 'payments' | 'unpaid';

export default function AdminPage({ onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>('members');
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({ firstName: '', lastName: '', email: '', phone: '', bureauRole: '' });
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

  const handleToggleBureau = async (user: User) => {
    try {
      const newRole = user.role === 'bureau_member' ? 'student' : 'bureau_member';
      await updateDoc(doc(db, 'users', user.uid), { role: newRole, isBureauMember: newRole === 'bureau_member' });
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, role: newRole as any, isBureauMember: newRole === 'bureau_member' } : u));
    } catch (e: any) { alert('Erreur: ' + e.message); }
  };

  const handleAddBureauMember = async () => {
    if (!newMember.firstName || !newMember.lastName) { setAddError('Prénom et nom requis'); return; }
    setAddError('');
    try {
      const uid = 'bureau_' + Date.now();
      const user: User = {
        uid,
        firstName: newMember.firstName,
        lastName: newMember.lastName,
        email: newMember.email,
        phone: newMember.phone,
        address: '',
        role: 'bureau_member',
        bureauRole: newMember.bureauRole,
        createdAt: new Date().toISOString(),
        isBureauMember: true,
      };
      await addDoc(collection(db, 'users'), user);
      setUsers(prev => [user, ...prev]);
      setShowAddMember(false);
      setNewMember({ firstName: '', lastName: '', email: '', phone: '', bureauRole: '' });
    } catch (e: any) { setAddError('Erreur: ' + e.message); }
  };

  // Find unpaid this month
  const now = new Date();
  const paidThisMonth = new Set(
    payments.filter(p => {
      const d = new Date(p.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && p.type === 'mensualite' && p.status === 'completed';
    }).map(p => p.userId)
  );
  const unpaidUsers = users.filter(u => u.role !== 'admin' && !paidThisMonth.has(u.uid));

  const filteredUsers = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email} ${u.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);

  const sendReminderMessage = async (user: User) => {
    try {
      await addDoc(collection(db, 'messages'), {
        fromId: 'admin',
        fromName: 'Administration AMEEM',
        toUserId: user.uid,
        toRole: 'student',
        content: `Bonjour ${user.firstName}, veuillez effectuer votre paiement, on est le ${now.getDate()} du mois.`,
        timestamp: new Date().toISOString(),
        read: false,
      });
      alert(`Rappel envoyé à ${user.firstName} ${user.lastName}`);
    } catch (e: any) { alert('Erreur: ' + e.message); }
  };

  return (
    <div className="page fade-in">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>👑 Administration</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Gestion de l'AMEEM</div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Membres</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 16 }}>{totalRevenue.toLocaleString()}</div>
          <div className="stat-label">FCFA total</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#dc2626' }}>{unpaidUsers.length}</div>
          <div className="stat-label">Non payés</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 20, gap: 4 }}>
        {([['members','👥 Membres'],['payments','💳 Paiements'],['unpaid','⚠️ Non payés']] as [Tab,string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? '#1a56db' : '#6b7280',
            boxShadow: tab === t ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* Members tab */}
      {tab === 'members' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input className="input" style={{ flex: 1 }} placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddMember(true)}>+ Ajouter</button>
          </div>
          {loading ? <div className="spinner" style={{ margin: '20px auto' }} /> : (
            filteredUsers.map(u => (
              <div key={u.uid} className="member-card">
                <div className="avatar" style={{ background: u.role === 'bureau_member' ? 'linear-gradient(135deg,#7c3aed,#1a56db)' : 'linear-gradient(135deg,#1a56db,#059669)', width: 38, height: 38, fontSize: 13 }}>
                  {u.firstName?.[0]}{u.lastName?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{u.firstName} {u.lastName}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{u.email || u.phone}</div>
                  <span className={`badge ${u.role === 'admin' ? 'badge-warning' : u.role === 'bureau_member' ? 'badge-primary' : 'badge-success'}`} style={{ marginTop: 2 }}>
                    {u.role === 'admin' ? 'Admin' : u.role === 'bureau_member' ? 'Bureau' : 'Étudiant'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {u.role !== 'admin' && (
                    <button onClick={() => handleToggleBureau(u)} className="btn btn-sm btn-ghost" style={{ padding: '6px 8px', fontSize: 11 }}>
                      {u.role === 'bureau_member' ? '👤' : '🏛'}
                    </button>
                  )}
                  {u.role !== 'admin' && (
                    <button onClick={() => handleDelete(u.uid, `${u.firstName} ${u.lastName}`)} className="btn btn-sm btn-danger" style={{ padding: '6px 8px', fontSize: 11 }}>🗑</button>
                  )}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Payments tab */}
      {tab === 'payments' && (
        <>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>{payments.length} paiements enregistrés</div>
          {payments.slice(0, 50).map(p => (
            <div key={p.id} className="list-item">
              <span style={{ fontSize: 20 }}>{p.type === 'mensualite' ? '📅' : '🪪'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.userName}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{new Date(p.timestamp).toLocaleDateString('fr-FR')} — {p.type === 'mensualite' ? 'Mensualité' : 'Carte'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: '#059669' }}>{p.amount.toLocaleString()} F</div>
                <span className={`badge ${p.status === 'completed' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 10 }}>{p.status === 'completed' ? 'Payé' : 'Attente'}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Unpaid tab */}
      {tab === 'unpaid' && (
        <>
          <div className="alert alert-warning">
            <span>⚠️</span>
            <div>{unpaidUsers.length} membre(s) n'ont pas encore payé ce mois-ci ({now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })})</div>
          </div>
          {unpaidUsers.map(u => (
            <div key={u.uid} className="member-card">
              <div className="avatar" style={{ width: 38, height: 38, fontSize: 13 }}>{u.firstName?.[0]}{u.lastName?.[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{u.firstName} {u.lastName}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{u.phone || u.email}</div>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => sendReminderMessage(u)} style={{ fontSize: 11 }}>
                📩 Rappel
              </button>
            </div>
          ))}
        </>
      )}

      {/* Add member modal */}
      {showAddMember && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>➕ Ajouter un membre bureau</div>
            {addError && <div className="alert alert-danger">{addError}</div>}
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
            <div className="input-group">
              <label className="input-label">Rôle dans le bureau</label>
              <input className="input" placeholder="Ex: Trésorier" value={newMember.bureauRole} onChange={e => setNewMember(p => ({ ...p, bureauRole: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" value={newMember.email} onChange={e => setNewMember(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Téléphone</label>
              <input className="input" value={newMember.phone} onChange={e => setNewMember(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={handleAddBureauMember}>✅ Ajouter</button>
            <button className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => setShowAddMember(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}
