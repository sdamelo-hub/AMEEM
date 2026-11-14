import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Message } from '../types';

type View = 'inbox' | 'reminders';

const NAVY = '#0F2557';
const MUTED = '#55627F';

// Un rappel est un message envoyé par l'administration à un membre
const isReminder = (m: Message) => m.fromId === 'admin' || !!(m as any).toUserId;
// Un message "supprimé" est masqué pour le bureau mais conservé dans la base
const isArchived = (m: Message) => !!(m as any).archivedByBureau;

export default function MessagesPage() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<View>('inbox');

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
      // Marquer comme lus
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
    } catch (e: any) { alert('Erreur : ' + e.message); }
    finally { setSending(false); }
  };

  // Retire le message de la liste du bureau (il reste dans la base)
  const removeMessage = async (m: Message) => {
    if (!confirm('Supprimer ce message de la liste ?')) return;
    try {
      await updateDoc(doc(db, 'messages', m.id as string), { archivedByBureau: true });
      setMessages(prev => prev.map(x => x.id === m.id ? ({ ...x, archivedByBureau: true } as any) : x));
    } catch (e: any) { alert('Erreur : ' + e.message); }
  };

  const clearReminders = async () => {
    const list = messages.filter(m => isReminder(m) && !isArchived(m));
    if (list.length === 0) return;
    if (!confirm(`Supprimer ces ${list.length} rappels de la liste ?`)) return;
    try {
      for (let i = 0; i < list.length; i += 400) {
        const batch = writeBatch(db);
        list.slice(i, i + 400).forEach(m => batch.update(doc(db, 'messages', m.id as string), { archivedByBureau: true }));
        await batch.commit();
      }
      setMessages(prev => prev.map(x => isReminder(x) ? ({ ...x, archivedByBureau: true } as any) : x));
    } catch (e: any) { alert('Erreur : ' + e.message); }
  };

  const inbox = messages.filter(m => !isReminder(m) && !isArchived(m));
  const reminders = messages.filter(m => isReminder(m) && !isArchived(m));
  const shown = isBureau ? (view === 'inbox' ? inbox : reminders) : messages;

  return (
    <div className="page fade-in">
      <div style={{ fontSize: 22, fontWeight: 800, color: NAVY, marginBottom: 4 }}>Messages</div>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>
        {isBureau ? 'Messages reçus des étudiants' : 'Contactez le bureau'}
      </div>

      {/* Envoi (étudiants) */}
      {!isBureau && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Envoyer un message au bureau</div>
          <div className="input-group">
            <label className="input-label" htmlFor="msg-content">Votre message</label>
            <textarea
              id="msg-content"
              className="input"
              style={{ minHeight: 100, resize: 'none' }}
              placeholder="Écrivez votre message au bureau..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" style={{ minHeight: 48 }} onClick={handleSend} disabled={sending || !content.trim()}>
            {sending ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      )}

      {/* Onglets (bureau) */}
      {isBureau && (
        <div style={{ display: 'flex', background: '#E6ECFA', borderRadius: 12, padding: 3, marginBottom: 16, gap: 2 }}>
          {([['inbox', `Reçus (${inbox.length})`], ['reminders', `Rappels envoyés (${reminders.length})`]] as [View, string][]).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              flex: 1, padding: '10px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600, minHeight: 44,
              background: view === v ? '#fff' : 'transparent',
              color: view === v ? NAVY : MUTED,
              boxShadow: view === v ? '0 2px 4px rgba(15,37,87,0.1)' : 'none',
            }}>{label}</button>
          ))}
        </div>
      )}

      {isBureau && view === 'reminders' && reminders.length > 0 && (
        <button className="btn btn-ghost" style={{ marginBottom: 12 }} onClick={clearReminders}>
          Supprimer tous les rappels
        </button>
      )}

      {!isBureau && <div className="section-title">Mes messages</div>}

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUTED, fontSize: 14 }}>
          {isBureau && view === 'reminders' ? 'Aucun rappel' : 'Aucun message'}
        </div>
      ) : (
        shown.map(m => (
          <div key={m.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {isBureau ? m.fromName : 'Envoyé au bureau'}
              </div>
              <div style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>{new Date(m.timestamp).toLocaleString('fr-FR')}</div>
            </div>
            <div style={{ fontSize: 14, color: '#1f2937', lineHeight: 1.5 }}>{m.content}</div>
            {isBureau && (
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <button
                  onClick={() => removeMessage(m)}
                  style={{ border: 'none', background: 'transparent', color: '#b91c1c', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 36, padding: '0 4px' }}
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
