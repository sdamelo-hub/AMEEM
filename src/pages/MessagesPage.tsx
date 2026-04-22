import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { Message } from '../types';

export default function MessagesPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isBureau = currentUser?.role === 'bureau_member' || isAdmin;

  useEffect(() => { loadMessages(); }, []);

  const loadMessages = async () => {
    try {
      let q;
      if (isBureau) {
        q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
      } else {
        q = query(collection(db, 'messages'), where('fromId', '==', currentUser!.uid), orderBy('timestamp', 'desc'));
      }
      const snap = await getDocs(q);
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
      // Mark as read
      if (isBureau) {
        snap.docs.filter(d => !d.data().read).forEach(d => updateDoc(doc(db, 'messages', d.id), { read: true }));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        fromId: currentUser!.uid,
        fromName: `${currentUser!.firstName} ${currentUser!.lastName}`,
        toRole: 'pcs',
        content: content.trim(),
        timestamp: new Date().toISOString(),
        read: false,
      });
      setContent('');
      loadMessages();
    } catch (e: any) { alert('Erreur: ' + e.message); }
    finally { setSending(false); }
  };

  return (
    <div className="page fade-in">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>💬 Messages</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
        {isBureau ? 'Messages reçus des étudiants' : 'Contactez le bureau'}
      </div>

      {/* Send form (for students) */}
      {!isBureau && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>✉️ Envoyer un message au bureau</div>
          <div className="input-group">
            <label className="input-label">Votre message</label>
            <textarea
              className="input"
              style={{ minHeight: 100, resize: 'none' }}
              placeholder="Écrivez votre message au PCS..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSend} disabled={sending || !content.trim()}>
            {sending ? '⏳ Envoi...' : '📨 Envoyer'}
          </button>
        </div>
      )}

      {/* Messages list */}
      <div className="section-title">{isBureau ? 'Messages reçus' : 'Mes messages'}</div>
      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : messages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
          <div>Aucun message</div>
        </div>
      ) : (
        messages.map(m => (
          <div key={m.id} className="card" style={{ marginBottom: 10, borderLeft: m.read ? '4px solid #e5e7eb' : '4px solid #1a56db' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>
                {isBureau ? m.fromName : 'Envoyé au PCS'}
                {!m.read && !isBureau && <span className="badge badge-primary" style={{ marginLeft: 8 }}>Nouveau</span>}
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{new Date(m.timestamp).toLocaleString('fr-FR')}</div>
            </div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{m.content}</div>
          </div>
        ))
      )}
    </div>
  );
}
