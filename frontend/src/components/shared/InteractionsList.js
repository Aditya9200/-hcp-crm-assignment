import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInteractions, deleteInteraction } from '../../store/slices/interactionsSlice';
import { Calendar, Trash2, Edit2, User, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { format } from 'date-fns';

const SENTIMENT_CONFIG = {
  positive: { color: '#22c55e', Icon: TrendingUp, bg: '#dcfce7' },
  neutral: { color: '#f59e0b', Icon: Minus, bg: '#fef3c7' },
  negative: { color: '#ef4444', Icon: TrendingDown, bg: '#fee2e2' },
};

const TYPE_COLORS = {
  Meeting: '#6366f1',
  Call: '#0ea5e9',
  Email: '#8b5cf6',
  Conference: '#f59e0b',
  Virtual: '#10b981',
};

export default function InteractionsList({ hcpId, onEdit }) {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector(s => s.interactions);

  useEffect(() => {
    dispatch(fetchInteractions(hcpId ? { hcp_id: hcpId } : {}));
  }, [dispatch, hcpId]);

  if (loading) return (
    <div className="list-loading">
      {[1, 2, 3].map(i => <div key={i} className="skeleton-card" />)}
    </div>
  );

  if (error) return <div className="list-error">⚠ {error}</div>;
  if (items.length === 0) return (
    <div className="list-empty">
      <p>No interactions logged yet.</p>
      <span>Use the form or chat to log your first interaction.</span>
    </div>
  );

  return (
    <div className="interactions-list">
      {items.map(item => {
        const sentiment = item.sentiment || 'neutral';
        const { color, Icon: SentimentIcon, bg } = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.neutral;
        const typeColor = TYPE_COLORS[item.interaction_type] || '#64748b';
        const date = item.date ? format(new Date(item.date), 'dd MMM yyyy · HH:mm') : 'N/A';

        return (
          <div key={item.id} className="interaction-card">
            <div className="card-top">
              <div className="card-type-badge" style={{ background: typeColor + '20', color: typeColor }}>
                {item.interaction_type}
              </div>
              <div className="card-sentiment" style={{ background: bg, color }}>
                <SentimentIcon size={11} />
                <span>{sentiment}</span>
              </div>
              <div className="card-actions">
                {onEdit && (
                  <button className="icon-btn" onClick={() => onEdit(item)} title="Edit">
                    <Edit2 size={13} />
                  </button>
                )}
                <button
                  className="icon-btn danger"
                  onClick={() => dispatch(deleteInteraction(item.id))}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="card-hcp">
              <User size={13} />
              <strong>{item.hcp?.name || `HCP #${item.hcp_id}`}</strong>
              {item.hcp?.specialty && <span className="card-specialty">· {item.hcp.specialty}</span>}
            </div>

            <div className="card-date">
              <Clock size={12} />
              <span>{date}</span>
            </div>

            {item.ai_summary && (
              <div className="card-summary">
                <span className="summary-label">✦ AI Summary</span>
                <p>{item.ai_summary}</p>
              </div>
            )}

            {item.topics_discussed && !item.ai_summary && (
              <div className="card-topics">
                <p>{item.topics_discussed.slice(0, 140)}{item.topics_discussed.length > 140 ? '...' : ''}</p>
              </div>
            )}

            {item.ai_suggested_followups?.length > 0 && (
              <div className="card-followups">
                <span className="followup-label">Suggested Follow-ups</span>
                <ul>
                  {item.ai_suggested_followups.slice(0, 3).map((f, i) => (
                    <li key={i}>» {f}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="card-footer">
              <span className="card-id">#{item.id}</span>
              {item.attendees?.length > 0 && (
                <span className="card-attendees">
                  <Users size={11} />
                  {item.attendees.join(', ')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Users({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
