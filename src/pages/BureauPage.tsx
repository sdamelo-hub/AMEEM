import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BUREAU_MEMBERS } from '../types';

export default function BureauPage() {
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof BUREAU_MEMBERS[0] | null>(null);

  // All users can view contact details (the bureau is public information for members)
  const canViewDetails = true;

  const filtered = BUREAU_MEMBERS.filter(m =>
    `${m.firstName} ${m.lastName} ${m.role}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page fade-in">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>👥 Bureau Exécutif</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        {filtered.length} membre{filtered.length > 1 ? 's' : ''} — Amicale des Étudiants de Mbour
      </div>

      <div className="input-group">
        <input className="input" placeholder="🔍 Rechercher un membre..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.map((m, i) => (
        <div key={i} className="member-card" onClick={() => setSelected(m)} style={{ cursor: 'pointer' }}>
          <div className="avatar" style={{ background: `hsl(${i * 37 % 360}, 55%, 40%)`, width: 42, height: 42, fontSize: 14 }}>
            {m.firstName[0]}{m.lastName[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{m.firstName} {m.lastName}</div>
            <div style={{ fontSize: 12, color: '#1a56db', fontWeight: 500, lineHeight: 1.3 }}>{m.role}</div>
          </div>
          <span style={{ color: '#9ca3af', fontSize: 20, flexShrink: 0 }}>›</span>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 13 }}>Aucun membre trouvé</div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div className="avatar" style={{ width: 68, height: 68, fontSize: 24, margin: '0 auto 12px', background: 'linear-gradient(135deg,#1a56db,#059669)' }}>
                {selected.firstName[0]}{selected.lastName[0]}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{selected.firstName} {selected.lastName}</div>
              <span className="badge badge-primary" style={{ marginTop: 6, fontSize: 11 }}>{selected.role}</span>
            </div>
            <div className="divider" />
            {selected.phone && (
              <a href={`tel:${selected.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', textDecoration: 'none', color: 'inherit', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 22 }}>📞</span>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Téléphone</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1a56db' }}>{selected.phone}</div>
                </div>
              </a>
            )}
            {selected.email && (
              <a href={`mailto:${selected.email}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', textDecoration: 'none', color: 'inherit', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 22 }}>✉️</span>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Email</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{selected.email}</div>
                </div>
              </a>
            )}
            {selected.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0' }}>
                <span style={{ fontSize: 22 }}>📍</span>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Adresse</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selected.address}</div>
                </div>
              </div>
            )}
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setSelected(null)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
