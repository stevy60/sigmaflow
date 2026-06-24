import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase.js'

const C = {
  bg: '#0B0F1A', panel: '#141926', border: '#1E2740',
  accent: '#2D6CFF', gold: '#F5C842', bull: '#00D48B',
  bear: '#FF4560', muted: '#8B93A8', text: '#E8ECF4',
}

// ── AI Analysis ───────────────────────────────────────────
async function analyzeSignal(signal) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a professional SMC trading analyst. Analyze this signal concisely:
Signal: ${signal.type} ${signal.asset} @ ${signal.entry}
Stop Loss: ${signal.sl} | TP1: ${signal.tp1} | TP2: ${signal.tp2 || 'N/A'}
Tags: ${(signal.tags || []).join(', ')}
Confidence: ${signal.confidence}%

Respond in exactly this format:
THESIS: [1 sentence on why this trade makes sense technically]
RISK: [1 sentence on the main risk to watch]
VERDICT: [STRONG BUY / BUY / NEUTRAL / AVOID] — [1 sentence reason]`
      }]
    })
  })
  const data = await res.json()
  return data.content?.[0]?.text || 'Analysis unavailable.'
}

// ── Components ────────────────────────────────────────────
function Pill({ children, color, bg }) {
  return (
    <span style={{
      display: 'inline-block', fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10, padding: '2px 7px', borderRadius: 3, fontWeight: 600,
      letterSpacing: '.05em', color, background: bg || color + '22'
    }}>{children}</span>
  )
}

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.panel, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: 16, ...style
    }}>{children}</div>
  )
}

function Btn({ children, onClick, variant = 'primary', style = {}, disabled }) {
  const base = {
    border: 'none', borderRadius: 6, padding: '8px 16px',
    fontFamily: "'Space Grotesk', sans-serif", fontSize: 13,
    fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'opacity .15s', letterSpacing: '.02em', opacity: disabled ? .5 : 1
  }
  const variants = {
    primary: { background: C.accent, color: '#fff' },
    ghost: { background: 'transparent', border: `1px solid ${C.border}`, color: C.muted },
    danger: { background: C.bear, color: '#fff' },
    success: { background: C.bull, color: '#fff' },
  }
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>{children}</button>
}

function StatCard({ label, value, color, sub }) {
  return (
    <Card>
      <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </Card>
  )
}

function LiveDot() {
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: C.bull, animation: 'pulse 1.8s infinite', marginRight: 5, verticalAlign: 'middle' }} />
}

// ── Signal Form Modal ─────────────────────────────────────
function SignalForm({ onClose, onSaved, providers }) {
  const [form, setForm] = useState({
    asset: 'XAUUSD', asset_class: 'Forex', type: 'BUY',
    entry: '', sl: '', tp1: '', tp2: '', confidence: 80,
    tags: '', provider_name: providers[0]?.name || 'StevenFX', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.entry || !form.sl || !form.tp1) { setErr('Entry, SL and TP1 are required'); return }
    setSaving(true)
    const { error } = await supabase.from('signals').insert({
      asset: form.asset, asset_class: form.asset_class, type: form.type,
      entry: parseFloat(form.entry), sl: parseFloat(form.sl),
      tp1: parseFloat(form.tp1), tp2: form.tp2 ? parseFloat(form.tp2) : null,
      confidence: parseInt(form.confidence), tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      provider_name: form.provider_name, notes: form.notes, status: 'ACTIVE', pips: 0
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
    onClose()
  }

  const inp = (label, key, type = 'text', opts = {}) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
        placeholder={opts.placeholder || ''}
        style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", outline: 'none' }} />
    </div>
  )

  const sel = (label, key, options) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</label>
      <select value={form[key]} onChange={e => set(key, e.target.value)}
        style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000088', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.panel, borderRadius: 12, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Post New Signal</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>{inp('Asset', 'asset', 'text', { placeholder: 'XAUUSD' })}</div>
          <div>{sel('Direction', 'type', ['BUY', 'SELL'])}</div>
        </div>
        {sel('Asset Class', 'asset_class', ['Forex', 'Crypto', 'Indices', 'Commodities'])}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>{inp('Entry Price', 'entry', 'number')}</div>
          <div>{inp('Stop Loss', 'sl', 'number')}</div>
          <div>{inp('Take Profit 1', 'tp1', 'number')}</div>
          <div>{inp('Take Profit 2', 'tp2', 'number')}</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Confidence: {form.confidence}%</label>
          <input type="range" min="50" max="100" value={form.confidence} onChange={e => set('confidence', e.target.value)}
            style={{ width: '100%', accentColor: C.accent }} />
        </div>
        {inp('Tags (comma-separated)', 'tags', 'text', { placeholder: 'SMC, FVG, London' })}
        {sel('Provider', 'provider_name', providers.map(p => p.name).length ? providers.map(p => p.name) : ['StevenFX'])}
        {inp('Notes', 'notes', 'text', { placeholder: 'Optional trade notes...' })}

        {err && <div style={{ color: C.bear, fontSize: 12, marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={submit} disabled={saving} style={{ flex: 1 }}>{saving ? 'Posting...' : 'Post Signal'}</Btn>
          <Btn onClick={onClose} variant="ghost">Cancel</Btn>
        </div>
      </div>
    </div>
  )
}

// ── Journal Form ──────────────────────────────────────────
function JournalForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ asset: '', type: 'BUY', entry: '', exit_price: '', pips: '', rr: '', outcome: 'WIN', notes: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setSaving(true)
    await supabase.from('journal').insert({
      asset: form.asset, type: form.type,
      entry: parseFloat(form.entry), exit_price: parseFloat(form.exit_price),
      pips: parseInt(form.pips), rr: form.rr, outcome: form.outcome, notes: form.notes
    })
    setSaving(false)
    onSaved(); onClose()
  }

  const inp = (label, key, type = 'text') => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
        style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", outline: 'none' }} />
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000088', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.panel, borderRadius: 12, padding: 24, width: '100%', maxWidth: 420, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Log Trade</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>{inp('Asset', 'asset')}</div>
          <div>
            <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Direction</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none' }}>
              <option>BUY</option><option>SELL</option>
            </select>
          </div>
          <div>{inp('Entry', 'entry', 'number')}</div>
          <div>{inp('Exit', 'exit_price', 'number')}</div>
          <div>{inp('Pips', 'pips', 'number')}</div>
          <div>{inp('R:R (e.g. 1:2)', 'rr')}</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Outcome</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['WIN', 'LOSS', 'BREAKEVEN'].map(o => (
              <button key={o} onClick={() => set('outcome', o)} style={{ flex: 1, padding: '7px 0', borderRadius: 6, border: `1px solid ${form.outcome === o ? (o === 'WIN' ? C.bull : o === 'LOSS' ? C.bear : C.gold) : C.border}`, background: form.outcome === o ? (o === 'WIN' ? C.bull + '22' : o === 'LOSS' ? C.bear + '22' : C.gold + '22') : 'transparent', color: form.outcome === o ? (o === 'WIN' ? C.bull : o === 'LOSS' ? C.bear : C.gold) : C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{o}</button>
            ))}
          </div>
        </div>
        {inp('Notes', 'notes')}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={submit} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving...' : 'Log Trade'}</Btn>
          <Btn onClick={onClose} variant="ghost">Cancel</Btn>
        </div>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('signals')
  const [signals, setSignals] = useState([])
  const [providers, setProviders] = useState([])
  const [journal, setJournal] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSignalForm, setShowSignalForm] = useState(false)
  const [showJournalForm, setShowJournalForm] = useState(false)
  const [filterAsset, setFilterAsset] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [aiSignal, setAiSignal] = useState(null)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [journalFilter, setJournalFilter] = useState('ALL')
  const [selectedProvider, setSelectedProvider] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [s, p, j] = await Promise.all([
      supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('providers').select('*').order('win_rate', { ascending: false }),
      supabase.from('journal').select('*').order('traded_at', { ascending: false }).limit(50)
    ])
    if (s.data) setSignals(s.data)
    if (p.data) setProviders(p.data)
    if (j.data) setJournal(j.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    // Realtime subscription for live signals
    const channel = supabase.channel('signals-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, () => {
        fetchAll()
        showToast('📡 New signal received!')
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchAll])

  const handleAI = async (signal) => {
    setAiSignal(signal)
    setAiText('')
    setAiLoading(true)
    setTab('ai')
    try {
      const txt = await analyzeSignal(signal)
      setAiText(txt)
    } catch {
      setAiText('⚠ AI analysis failed. Check connection.')
    }
    setAiLoading(false)
  }

  const updateSignalStatus = async (id, status) => {
    await supabase.from('signals').update({ status }).eq('id', id)
    fetchAll()
    showToast(`Signal updated to ${status}`)
  }

  const filteredSignals = signals.filter(s => {
    if (filterAsset !== 'ALL' && s.asset_class !== filterAsset) return false
    if (filterType !== 'ALL' && s.type !== filterType) return false
    return true
  })

  const activeCount = signals.filter(s => s.status === 'ACTIVE').length
  const avgConf = signals.length ? Math.round(signals.reduce((a, s) => a + (s.confidence || 0), 0) / signals.length) : 0
  const winCount = journal.filter(j => j.outcome === 'WIN').length
  const winRate = journal.length ? Math.round((winCount / journal.length) * 100) : 0
  const totalPips = journal.reduce((a, j) => a + (j.pips || 0), 0)

  const TABS = [
    { id: 'signals', label: '📡 Signals' },
    { id: 'providers', label: '👤 Providers' },
    { id: 'analytics', label: '📊 Analytics' },
    { id: 'journal', label: '📓 Journal' },
    { id: 'ai', label: '⚡ AI' },
  ]

  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", background: C.bg, minHeight: '100vh', color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: ${C.panel}; } ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.5)} }
        input, select { color-scheme: dark; }
        input[type=range] { accent-color: ${C.accent}; }
      `}</style>

      {/* Header */}
      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
          <rect width="28" height="28" rx="6" fill={C.accent} />
          <text x="5" y="21" fontSize="18" fontWeight="700" fontFamily="Space Grotesk" fill="white">Σ</text>
        </svg>
        <span style={{ fontWeight: 700, fontSize: 16 }}>SigmaFlow</span>
        <Pill color={C.gold}>LIVE</Pill>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading && <span style={{ fontSize: 11, color: C.muted }}>syncing...</span>}
          <LiveDot />
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>SF</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px', maxWidth: 900, margin: '0 auto', paddingBottom: 90 }}>

        {/* ── SIGNALS ── */}
        {tab === 'signals' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <StatCard label="Active Signals" value={activeCount} color={C.bull} sub="live now" />
              <StatCard label="Avg Confidence" value={avgConf + '%'} color={C.accent} sub="AI-scored" />
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {['ALL', 'Forex', 'Crypto', 'Indices'].map(f => (
                <button key={f} onClick={() => setFilterAsset(f)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${filterAsset === f ? C.accent : C.border}`, background: filterAsset === f ? C.accent + '22' : 'transparent', color: filterAsset === f ? C.accent : C.muted, fontSize: 12, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>{f}</button>
              ))}
              <div style={{ width: 1, background: C.border }} />
              {['ALL', 'BUY', 'SELL'].map(f => (
                <button key={f} onClick={() => setFilterType(f)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${filterType === f ? (f === 'BUY' ? C.bull : f === 'SELL' ? C.bear : C.accent) : C.border}`, background: filterType === f ? (f === 'BUY' ? C.bull + '22' : f === 'SELL' ? C.bear + '22' : C.accent + '22') : 'transparent', color: filterType === f ? (f === 'BUY' ? C.bull : f === 'SELL' ? C.bear : C.accent) : C.muted, fontSize: 12, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>{f}</button>
              ))}
              <Btn onClick={() => setShowSignalForm(true)} style={{ marginLeft: 'auto', padding: '5px 14px', fontSize: 12 }}>+ Signal</Btn>
            </div>

            {filteredSignals.length === 0 && !loading && (
              <Card style={{ textAlign: 'center', padding: '40px 16px', borderStyle: 'dashed' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No signals yet</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Post your first signal to get started</div>
                <Btn onClick={() => setShowSignalForm(true)}>Post Signal</Btn>
              </Card>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredSignals.map(s => (
                <Card key={s.id} style={{ borderLeft: `3px solid ${s.type === 'BUY' ? C.bull : C.bear}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 16, marginRight: 8 }}>{s.asset}</span>
                      <Pill color={s.type === 'BUY' ? C.bull : C.bear}>{s.type}</Pill>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {s.status === 'ACTIVE' && <LiveDot />}
                      <Pill color={s.status === 'ACTIVE' ? C.gold : s.status?.includes('+') ? C.bull : C.bear}>{s.status}</Pill>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
                    {[['Entry', s.entry], ['SL', s.sl, C.bear], ['TP1', s.tp1, C.bull], ['TP2', s.tp2 || '—', C.bull]].map(([l, v, c]) => (
                      <div key={l} style={{ background: C.bg, borderRadius: 6, padding: '6px 8px' }}>
                        <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", color: c || C.text }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(s.tags || []).slice(0, 3).map(t => (
                        <span key={t} style={{ fontSize: 10, background: C.accent + '15', color: C.accent, padding: '2px 6px', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace" }}>{t}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 11, color: C.muted, alignSelf: 'center' }}>{s.confidence}% conf</span>
                      <Btn onClick={() => handleAI(s)} style={{ padding: '4px 10px', fontSize: 11 }}>⚡ AI</Btn>
                      {s.status === 'ACTIVE' && (
                        <Btn onClick={() => updateSignalStatus(s.id, 'CLOSED +')} variant="ghost" style={{ padding: '4px 10px', fontSize: 11, color: C.bull, borderColor: C.bull }}>✓ Close</Btn>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 11, color: C.muted }}>
                    by {s.provider_name} · {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── PROVIDERS ── */}
        {tab === 'providers' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Signal Providers</h2>
              <p style={{ fontSize: 12, color: C.muted }}>Ranked by win rate. Tap to expand.</p>
            </div>
            {providers.length === 0 && !loading && (
              <Card style={{ textAlign: 'center', padding: '40px 16px', borderStyle: 'dashed' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No providers yet</div>
                <div style={{ fontSize: 12, color: C.muted }}>Providers are added via the SQL editor in Supabase</div>
              </Card>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {providers.map((p, i) => {
                const colors = [C.accent, C.gold, C.bull, '#8B5CF6', '#EC4899']
                const col = colors[i % colors.length]
                const expanded = selectedProvider?.id === p.id
                return (
                  <Card key={p.id} onClick={() => setSelectedProvider(expanded ? null : p)}
                    style={{ cursor: 'pointer', borderColor: expanded ? C.accent : C.border, transition: 'border-color .15s' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: col + '22', border: `2px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: col, flexShrink: 0 }}>{p.avatar || p.name?.slice(0, 2)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
                          <Pill color={p.badge === 'ELITE' ? C.gold : C.accent}>{p.badge}</Pill>
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{p.followers?.toLocaleString()} followers · {p.total_signals} signals</div>
                      </div>
                    </div>

                    {expanded && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                        <p style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>{p.bio}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                          {[['Win Rate', p.win_rate + '%', p.win_rate >= 80 ? C.bull : C.gold], ['Total Pips', '+' + (p.total_pips || 0), C.bull], ['Streak', '🔥 ' + p.streak, C.text]].map(([l, v, c]) => (
                            <div key={l} style={{ background: C.bg, borderRadius: 6, padding: '8px' }}>
                              <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{l}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(p.assets || []).map(a => <span key={a} style={{ fontSize: 10, background: C.accent + '15', color: C.accent, padding: '2px 6px', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace" }}>{a}</span>)}
                        </div>
                        <Btn onClick={e => { e.stopPropagation(); showToast(`Following ${p.name}!`) }} style={{ marginTop: 12, width: '100%' }}>Follow Provider</Btn>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === 'analytics' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Performance Analytics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <StatCard label="Win Rate" value={winRate + '%'} color={winRate >= 70 ? C.bull : C.gold} sub={`${winCount}W / ${journal.length - winCount}L`} />
              <StatCard label="Total Pips" value={(totalPips > 0 ? '+' : '') + totalPips} color={totalPips >= 0 ? C.bull : C.bear} sub="net all trades" />
              <StatCard label="Total Signals" value={signals.length} color={C.accent} sub="all time" />
              <StatCard label="Providers" value={providers.length} color={C.text} sub="active" />
            </div>

            {/* Asset class breakdown */}
            <Card style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Signals by Asset Class</div>
              {['Forex', 'Crypto', 'Indices', 'Commodities'].map(cls => {
                const count = signals.filter(s => s.asset_class === cls).length
                const pct = signals.length ? Math.round((count / signals.length) * 100) : 0
                const col = { Forex: C.accent, Crypto: C.bull, Indices: '#8B5CF6', Commodities: C.gold }[cls]
                return (
                  <div key={cls} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>{cls}</span>
                      <span style={{ fontSize: 12, color: col, fontFamily: "'IBM Plex Mono', monospace" }}>{count} signals · {pct}%</span>
                    </div>
                    <div style={{ background: C.bg, borderRadius: 3, height: 5 }}>
                      <div style={{ width: pct + '%', height: '100%', background: col, borderRadius: 3, transition: 'width .5s' }} />
                    </div>
                  </div>
                )
              })}
            </Card>

            {/* Recent signal outcomes */}
            <Card>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Signal Outcomes</div>
              {['ACTIVE', 'TP1 HIT', 'CLOSED +', 'CLOSED -'].map(status => {
                const count = signals.filter(s => s.status === status).length
                const col = status === 'ACTIVE' ? C.gold : status.includes('+') || status === 'TP1 HIT' ? C.bull : C.bear
                return (
                  <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Pill color={col}>{status}</Pill>
                    <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{count}</span>
                  </div>
                )
              })}
            </Card>
          </div>
        )}

        {/* ── JOURNAL ── */}
        {tab === 'journal' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Trade Journal</h2>
              <Btn onClick={() => setShowJournalForm(true)} style={{ fontSize: 12, padding: '6px 14px' }}>+ Log Trade</Btn>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {['ALL', 'WIN', 'LOSS'].map(f => (
                <button key={f} onClick={() => setJournalFilter(f)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${journalFilter === f ? (f === 'WIN' ? C.bull : f === 'LOSS' ? C.bear : C.accent) : C.border}`, background: journalFilter === f ? (f === 'WIN' ? C.bull + '22' : f === 'LOSS' ? C.bear + '22' : C.accent + '22') : 'transparent', color: journalFilter === f ? (f === 'WIN' ? C.bull : f === 'LOSS' ? C.bear : C.accent) : C.muted, fontSize: 12, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>{f}</button>
              ))}
            </div>

            {journal.length === 0 && !loading && (
              <Card style={{ textAlign: 'center', padding: '40px 16px', borderStyle: 'dashed' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📓</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No trades logged yet</div>
                <Btn onClick={() => setShowJournalForm(true)}>Log First Trade</Btn>
              </Card>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {journal.filter(j => journalFilter === 'ALL' || j.outcome === journalFilter).map(j => (
                <Card key={j.id} style={{ borderLeft: `3px solid ${j.outcome === 'WIN' ? C.bull : j.outcome === 'LOSS' ? C.bear : C.gold}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 15, marginRight: 8 }}>{j.asset}</span>
                      <Pill color={j.type === 'BUY' ? C.bull : C.bear}>{j.type}</Pill>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: j.pips > 0 ? C.bull : C.bear }}>{j.pips > 0 ? '+' : ''}{j.pips} pips</span>
                      <Pill color={j.outcome === 'WIN' ? C.bull : j.outcome === 'LOSS' ? C.bear : C.gold}>{j.outcome}</Pill>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                    {[['Entry', j.entry], ['Exit', j.exit_price], ['R:R', j.rr || '—']].map(([l, v]) => (
                      <div key={l}>
                        <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 1 }}>{l}</div>
                        <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {j.notes && <div style={{ fontSize: 12, color: C.muted, fontStyle: 'italic' }}>{j.notes}</div>}
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>{new Date(j.traded_at).toLocaleDateString()}</div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── AI ANALYSIS ── */}
        {tab === 'ai' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>⚡ AI Signal Analysis</h2>
            <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Claude-powered deep analysis. Select a signal from the Signals tab then tap ⚡ AI.</p>

            {!aiSignal && !aiLoading && (
              <Card style={{ textAlign: 'center', padding: '48px 16px', borderStyle: 'dashed' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No signal selected</div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Go to Signals tab and tap ⚡ AI on any signal</div>
                <Btn onClick={() => setTab('signals')} variant="ghost">Go to Signals</Btn>
              </Card>
            )}

            {aiSignal && (
              <Card style={{ marginBottom: 14, borderColor: C.accent + '44' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 16, marginRight: 8 }}>{aiSignal.asset}</span>
                    <Pill color={aiSignal.type === 'BUY' ? C.bull : C.bear}>{aiSignal.type}</Pill>
                  </div>
                  <span style={{ fontSize: 12, color: C.muted, fontFamily: "'IBM Plex Mono', monospace" }}>@ {aiSignal.entry}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[['SL', aiSignal.sl, C.bear], ['TP1', aiSignal.tp1, C.bull], ['Conf', aiSignal.confidence + '%', C.accent]].map(([l, v, c]) => (
                    <div key={l} style={{ background: C.bg, borderRadius: 6, padding: '8px' }}>
                      <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: c }}>{v}</div>
                    </div>
                  ))}
                </div>
                <Btn onClick={() => handleAI(aiSignal)} disabled={aiLoading} style={{ width: '100%' }}>
                  {aiLoading ? 'Analyzing...' : '⚡ Re-run Analysis'}
                </Btn>
              </Card>
            )}

            {(aiLoading || aiText) && (
              <Card style={{ borderColor: C.accent + '33' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <svg width="18" height="18" viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill={C.accent} /><text x="5" y="21" fontSize="18" fontWeight="700" fontFamily="Space Grotesk" fill="white">Σ</text></svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>SigmaFlow AI</span>
                </div>
                {aiLoading ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: C.muted, fontSize: 13 }}>
                    <span className="live-dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: C.accent, animation: 'pulse 1.2s infinite' }} />
                    Running deep SMC analysis...
                  </div>
                ) : (
                  <div style={{ fontSize: 13, lineHeight: 1.9 }}>
                    {aiText.split('\n').map((line, i) => {
                      const isHeader = line.match(/^(THESIS|RISK|VERDICT):/)
                      return (
                        <div key={i} style={{ marginBottom: 10 }}>
                          {isHeader ? (
                            <span>
                              <span style={{ color: C.accent, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '.08em' }}>{line.split(':')[0]}</span>
                              <span style={{ color: C.text }}>:{line.split(':').slice(1).join(':')}</span>
                            </span>
                          ) : <span style={{ color: C.text }}>{line}</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.panel, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 100 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: '10px 4px 8px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, transition: 'all .15s' }}>
            <span style={{ fontSize: 18 }}>{t.label.split(' ')[0]}</span>
            <span style={{ fontSize: 10, color: tab === t.id ? C.accent : C.muted, fontFamily: "'Space Grotesk', sans-serif", fontWeight: tab === t.id ? 600 : 400 }}>{t.label.split(' ')[1]}</span>
            {tab === t.id && <div style={{ width: 20, height: 2, background: C.accent, borderRadius: 1 }} />}
          </button>
        ))}
      </div>

      {/* Modals */}
      {showSignalForm && <SignalForm onClose={() => setShowSignalForm(false)} onSaved={() => { fetchAll(); showToast('Signal posted!') }} providers={providers} />}
      {showJournalForm && <JournalForm onClose={() => setShowJournalForm(false)} onSaved={() => { fetchAll(); showToast('Trade logged!') }} />}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, right: 16, background: C.panel, border: `1px solid ${toast.type === 'success' ? C.bull + '44' : C.bear + '44'}`, borderRadius: 8, padding: '10px 16px', fontSize: 13, zIndex: 999, boxShadow: '0 8px 32px #00000060' }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
