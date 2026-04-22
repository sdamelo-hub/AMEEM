import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BUREAU_MEMBERS } from '../types';

export default function BureauPage() {
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof BUREAU_MEMBERS[0] | null>(null);

  const isBureau = currentUser?.role === 'bureau_member' || currentUser?.role === 'admin';

  const filtered = BUREAU_MEMBERS.filter(m =>
    `${m.firstName} ${m.lastName} ${m.role}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page fade-in">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>👥 Bureau Exécutif</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Amicale des Étudiants de Mbour</div>

      <div className="input-group">
        <input className="input" placeholder="🔍 Rechercher un membre..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{filtered.length} membre{filtered.length > 1 ? 's' : ''}</div>

      {filtered.map((m, i) => (
        <div key={i} className="member-card" onClick={() => isBureau ? setSelected(m) : null} style={{ cursor: isBureau ? 'pointer' : 'default' }}>
          <div className="avatar" style={{ background: `hsl(${i * 37}, 60%, 45%)` }}>
            {m.firstName[0]}{m.lastName[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{m.firstName} {m.lastName}</div>
            <div style={{ fontSize: 12, color: '#1a56db', fontWeight: 500, lineHeight: 1.3 }}>{m.role}</div>
            {!isBureau && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Membre du bureau</div>}
          </div>
          {isBureau && <span style={{ color: '#6b7280', fontSize: 18 }}>›</span>}
        </div>
      ))}

      {/* Detail modal for bureau members */}
      {selected && isBureau && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div className="avatar" style={{ width: 64, height: 64, fontSize: 24, margin: '0 auto 12px', background: 'linear-gradient(135deg,#1a56db,#059669)' }}>
                {selected.firstName[0]}{selected.lastName[0]}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{selected.firstName} {selected.lastName}</div>
              <span className="badge badge-primary" style={{ marginTop: 6 }}>{selected.role}</span>
            </div>
            <div className="divider" />
            {selected.phone && (
              <a href={`tel:${selected.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', textDecoration: 'none', color: 'inherit', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 20 }}>📞</span>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Téléphone</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.phone}</div>
                </div>
              </a>
            )}
            {selected.email && (
              <a href={`mailto:${selected.email}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', textDecoration: 'none', color: 'inherit', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontSize: 20 }}>📧</span>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Email</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.email}</div>
                </div>
              </a>
            )}
            {selected.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                <span style={{ fontSize: 20 }}>📍</span>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Adresse</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.address}</div>
                </div>
              </div>
            )}
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setSelected(null)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
