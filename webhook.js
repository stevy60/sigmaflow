// api/webhook.js — Vercel Serverless Function
// MT5 / TradingView can POST signals here automatically
// URL: https://your-app.vercel.app/api/webhook
//
// Example payload from TradingView alert (JSON body):
// {
//   "secret": "YOUR_WEBHOOK_SECRET",
//   "asset": "XAUUSD",
//   "asset_class": "Forex",
//   "type": "BUY",
//   "entry": 2334.50,
//   "sl": 2318.00,
//   "tp1": 2355.00,
//   "tp2": 2375.00,
//   "confidence": 85,
//   "tags": ["SMC", "FVG", "London"],
//   "provider_name": "StevenFX",
//   "notes": "4H FVG fill + liquidity sweep"
// }

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // use service key server-side
)

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'sigmaflow-secret'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { secret, ...signal } = req.body

  if (secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const required = ['asset', 'asset_class', 'type', 'entry', 'sl', 'tp1']
  for (const field of required) {
    if (!signal[field]) {
      return res.status(400).json({ error: `Missing field: ${field}` })
    }
  }

  const { data, error } = await supabase.from('signals').insert({
    asset: signal.asset,
    asset_class: signal.asset_class,
    type: signal.type.toUpperCase(),
    entry: parseFloat(signal.entry),
    sl: parseFloat(signal.sl),
    tp1: parseFloat(signal.tp1),
    tp2: signal.tp2 ? parseFloat(signal.tp2) : null,
    confidence: parseInt(signal.confidence) || 75,
    tags: signal.tags || [],
    provider_name: signal.provider_name || 'API',
    notes: signal.notes || '',
    status: 'ACTIVE',
    pips: 0
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true, signal: data })
}
