import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { Announcement } from '../types';

export default function AnnouncementsPage() {
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'bureau' | 'all'>('bureau');
  const [submitting, setSubmitting] = useState(false);

  const isBureau = currentUser?.role === 'bureau_member' || currentUser?.role === 'admin';

  useEffect(() => { loadAnnouncements(); }, []);

  const loadAnnouncements = async () => {
    try {
      const q = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(isBureau ? all : all.filter(a => a.visibleTo === 'all'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        authorId: currentUser!.uid,
        authorName: `${currentUser!.firstName} ${currentUser!.lastName}`,
        authorRole: currentUser!.bureauRole || currentUser!.role,
        title: title.trim(),
        content: content.trim(),
        timestamp: new Date().toISOString(),
        visibleTo: visibility,
      });
      setTitle(''); setContent(''); setShowForm(false);
      loadAnnouncements();
    } catch (e: any) { alert('Erreur: ' + e.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    try {
      await deleteDoc(doc(db, 'announcements', id));
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (e: any) { alert('Erreur: ' + e.message); }
  };

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>📢 Informations</div>
        {isBureau && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Fermer' : '+ Publier'}
          </button>
        )}
      </div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        {isBureau ? 'Partagez des informations avec les membres' : 'Actualités de l\'Amicale'}
      </div>

      {/* Post form */}
      {showForm && isBureau && (
        <div className="card" style={{ marginBottom: 20, border: '2px solid #1a56db' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>✏️ Nouvelle annonce</div>
          <div className="input-group">
            <label className="input-label">Titre *</label>
            <input className="input" placeholder="Titre de l'annonce" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Contenu *</label>
            <textarea className="input" style={{ minHeight: 100, resize: 'none' }} placeholder="Votre message..." value={content} onChange={e => setContent(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Visibilité</label>
            <select className="input" value={visibility} onChange={e => setVisibility(e.target.value as any)}>
              <option value="bureau">🔒 Bureau uniquement</option>
              <option value="all">🌐 Tous les membres</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handlePost} disabled={submitting || !title.trim() || !content.trim()}>
            {submitting ? '⏳' : '📢 Publier'}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : announcements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#6b7280' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Aucune annonce</div>
          <div style={{ fontSize: 13 }}>Les informations publiées apparaîtront ici</div>
        </div>
      ) : (
        announcements.map(a => (
          <div key={a.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                  {a.authorName[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.authorName}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{a.authorRole}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isBureau && <span className={`badge ${a.visibleTo === 'bureau' ? 'badge-primary' : 'badge-success'}`}>{a.visibleTo === 'bureau' ? '🔒 Bureau' : '🌐 Tous'}</span>}
                {(currentUser?.role === 'admin' || currentUser?.uid === a.authorId) && (
                  <button onClick={() => handleDelete(a.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#6b7280' }}>🗑</button>
                )}
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{a.title}</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{a.content}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>{new Date(a.timestamp).toLocaleString('fr-FR')}</div>
          </div>
        ))
      )}
    </div>
  );
}
