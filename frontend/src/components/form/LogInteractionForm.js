import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createInteraction } from '../../store/slices/interactionsSlice';
import { fetchHCPs } from '../../store/slices/hcpSlice';
import { Calendar, Clock, Users, FileText, Package, Smile, Meh, Frown, ChevronDown, Plus, X } from 'lucide-react';

const INTERACTION_TYPES = ['Meeting', 'Call', 'Email', 'Conference', 'Virtual'];
const SENTIMENTS = [
  { value: 'positive', label: 'Positive', Icon: Smile, color: '#22c55e' },
  { value: 'neutral', label: 'Neutral', Icon: Meh, color: '#f59e0b' },
  { value: 'negative', label: 'Negative', Icon: Frown, color: '#ef4444' },
];

export default function LogInteractionForm({ onSuccess }) {
  const dispatch = useDispatch();
  const { items: hcps, loading: hcpLoading } = useSelector(s => s.hcp);
  const { loading } = useSelector(s => s.interactions);

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5);

  const [form, setForm] = useState({
    hcp_id: '',
    interaction_type: 'Meeting',
    date: today,
    time: now,
    attendees: [],
    topics_discussed: '',
    materials_shared: [],
    samples_distributed: [],
    sentiment: 'neutral',
    outcomes: '',
    follow_up_actions: '',
  });

  const [attendeeInput, setAttendeeInput] = useState('');
  const [materialInput, setMaterialInput] = useState('');
  const [sampleInput, setSampleInput] = useState({ product: '', quantity: '' });
  const [hcpSearch, setHcpSearch] = useState('');
  const [showHcpDropdown, setShowHcpDropdown] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  useEffect(() => { dispatch(fetchHCPs()); }, [dispatch]);

  const filteredHcps = hcps.filter(h =>
    h.name.toLowerCase().includes(hcpSearch.toLowerCase())
  );

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const addAttendee = () => {
    if (attendeeInput.trim()) {
      set('attendees', [...form.attendees, attendeeInput.trim()]);
      setAttendeeInput('');
    }
  };

  const addMaterial = () => {
    if (materialInput.trim()) {
      set('materials_shared', [...form.materials_shared, materialInput.trim()]);
      setMaterialInput('');
    }
  };

  const addSample = () => {
    if (sampleInput.product && sampleInput.quantity) {
      set('samples_distributed', [...form.samples_distributed, { ...sampleInput }]);
      setSampleInput({ product: '', quantity: '' });
    }
  };

  const handleSubmit = async () => {
    if (!form.hcp_id || !form.topics_discussed) {
      setSubmitStatus({ type: 'error', msg: 'HCP and Topics are required.' });
      return;
    }
    const dateTime = new Date(`${form.date}T${form.time}`).toISOString();
    const payload = {
      ...form,
      hcp_id: parseInt(form.hcp_id),
      date: dateTime,
    };
    delete payload.time;

    const result = await dispatch(createInteraction(payload));
    if (createInteraction.fulfilled.match(result)) {
      setSubmitStatus({ type: 'success', msg: 'Interaction logged successfully!' });
      setAiSuggestions(result.payload.ai_suggested_followups || []);
      if (onSuccess) onSuccess(result.payload);
    } else {
      setSubmitStatus({ type: 'error', msg: result.payload || 'Failed to log.' });
    }
  };

  const selectedHcp = hcps.find(h => h.id === parseInt(form.hcp_id));

  return (
    <div className="log-form">
      <div className="form-grid">

        {/* HCP Name */}
        <div className="field-group">
          <label className="field-label">HCP Name <span className="required">*</span></label>
          <div className="hcp-search-wrapper">
            <input
              className="field-input"
              placeholder="Search or select HCP..."
              value={selectedHcp ? selectedHcp.name : hcpSearch}
              onChange={(e) => {
                setHcpSearch(e.target.value);
                set('hcp_id', '');
                setShowHcpDropdown(true);
              }}
              onFocus={() => setShowHcpDropdown(true)}
            />
            {showHcpDropdown && filteredHcps.length > 0 && (
              <div className="hcp-dropdown">
                {filteredHcps.slice(0, 8).map(h => (
                  <div
                    key={h.id}
                    className="hcp-option"
                    onClick={() => {
                      set('hcp_id', h.id);
                      setHcpSearch(h.name);
                      setShowHcpDropdown(false);
                    }}
                  >
                    <span className="hcp-option-name">{h.name}</span>
                    <span className="hcp-option-spec">{h.specialty} · {h.institution}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interaction Type */}
        <div className="field-group">
          <label className="field-label">Interaction Type</label>
          <div className="select-wrapper">
            <select
              className="field-select"
              value={form.interaction_type}
              onChange={e => set('interaction_type', e.target.value)}
            >
              {INTERACTION_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown size={14} className="select-icon" />
          </div>
        </div>

        {/* Date */}
        <div className="field-group">
          <label className="field-label"><Calendar size={13} /> Date</label>
          <input
            type="date"
            className="field-input"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
        </div>

        {/* Time */}
        <div className="field-group">
          <label className="field-label"><Clock size={13} /> Time</label>
          <input
            type="time"
            className="field-input"
            value={form.time}
            onChange={e => set('time', e.target.value)}
          />
        </div>

        {/* Attendees */}
        <div className="field-group full-width">
          <label className="field-label"><Users size={13} /> Attendees</label>
          <div className="tag-input-row">
            <input
              className="field-input"
              placeholder="Enter names or search..."
              value={attendeeInput}
              onChange={e => setAttendeeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addAttendee()}
            />
            <button className="add-btn" onClick={addAttendee}><Plus size={14} /></button>
          </div>
          <div className="tags-row">
            {form.attendees.map((a, i) => (
              <span key={i} className="tag">
                {a}
                <button onClick={() => set('attendees', form.attendees.filter((_, j) => j !== i))}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Topics Discussed */}
        <div className="field-group full-width">
          <label className="field-label"><FileText size={13} /> Topics Discussed <span className="required">*</span></label>
          <textarea
            className="field-textarea"
            placeholder="Enter key discussion points..."
            value={form.topics_discussed}
            onChange={e => set('topics_discussed', e.target.value)}
            rows={3}
          />
        </div>

        {/* Materials Shared */}
        <div className="field-group">
          <label className="field-label">Materials Shared</label>
          <div className="tag-input-row">
            <input
              className="field-input"
              placeholder="Search/Add material..."
              value={materialInput}
              onChange={e => setMaterialInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMaterial()}
            />
            <button className="add-btn" onClick={addMaterial}><Plus size={14} /></button>
          </div>
          <div className="tags-row">
            {form.materials_shared.map((m, i) => (
              <span key={i} className="tag tag-blue">
                {m}
                <button onClick={() => set('materials_shared', form.materials_shared.filter((_, j) => j !== i))}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Samples Distributed */}
        <div className="field-group">
          <label className="field-label"><Package size={13} /> Samples Distributed</label>
          <div className="sample-input-row">
            <input
              className="field-input"
              placeholder="Product name"
              value={sampleInput.product}
              onChange={e => setSampleInput(s => ({ ...s, product: e.target.value }))}
            />
            <input
              className="field-input field-input-sm"
              placeholder="Qty"
              value={sampleInput.quantity}
              onChange={e => setSampleInput(s => ({ ...s, quantity: e.target.value }))}
            />
            <button className="add-btn" onClick={addSample}><Plus size={14} /></button>
          </div>
          <div className="tags-row">
            {form.samples_distributed.map((s, i) => (
              <span key={i} className="tag tag-purple">
                {s.product} × {s.quantity}
                <button onClick={() => set('samples_distributed', form.samples_distributed.filter((_, j) => j !== i))}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Sentiment */}
        <div className="field-group full-width">
          <label className="field-label">Observed / Inferred HCP Sentiment</label>
          <div className="sentiment-row">
            {SENTIMENTS.map(({ value, label, Icon, color }) => (
              <label key={value} className={`sentiment-option ${form.sentiment === value ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="sentiment"
                  value={value}
                  checked={form.sentiment === value}
                  onChange={() => set('sentiment', value)}
                />
                <Icon size={16} style={{ color }} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Outcomes */}
        <div className="field-group full-width">
          <label className="field-label">Outcomes</label>
          <textarea
            className="field-textarea"
            placeholder="Key outcomes or agreements..."
            value={form.outcomes}
            onChange={e => set('outcomes', e.target.value)}
            rows={2}
          />
        </div>

        {/* Follow-up Actions */}
        <div className="field-group full-width">
          <label className="field-label">Follow-up Actions</label>
          <textarea
            className="field-textarea"
            placeholder="Enter next steps or tasks..."
            value={form.follow_up_actions}
            onChange={e => set('follow_up_actions', e.target.value)}
            rows={2}
          />
        </div>

        {/* AI Suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="field-group full-width">
            <div className="ai-suggestions">
              <div className="ai-suggestions-header">✦ AI Suggested Follow-ups</div>
              {aiSuggestions.map((s, i) => (
                <div key={i} className="ai-suggestion-item">» {s}</div>
              ))}
            </div>
          </div>
        )}

        {/* Status */}
        {submitStatus && (
          <div className={`status-msg ${submitStatus.type}`}>
            {submitStatus.msg}
          </div>
        )}

        {/* Submit */}
        <div className="field-group full-width form-actions">
          <button
            className="btn-secondary"
            onClick={() => setForm({
              hcp_id: '', interaction_type: 'Meeting', date: today, time: now,
              attendees: [], topics_discussed: '', materials_shared: [],
              samples_distributed: [], sentiment: 'neutral', outcomes: '', follow_up_actions: ''
            })}
          >
            Clear
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Logging...' : '⬆ Log Interaction'}
          </button>
        </div>

      </div>
    </div>
  );
}
