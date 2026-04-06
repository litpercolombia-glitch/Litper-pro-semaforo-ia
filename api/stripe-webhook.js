// ══════════════════════════════════════════════════════════════
// LITPERPRO — Vercel Serverless: Stripe Webhook Handler
// ══════════════════════════════════════════════════════════════

import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gtsivwbnhcawvmsfujby.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!STRIPE_KEY || !WEBHOOK_SECRET || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Server config missing' });
  }

  const stripe = require('stripe')(STRIPE_KEY);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let event;
  try {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(buf, sig, WEBHOOK_SECRET);
  } catch (e) {
    console.error('Webhook signature verification failed:', e.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const PLAN_QUOTAS = { pro: 50, enterprise: 999999 };

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId = session.metadata?.org_id;
        const plan = session.metadata?.plan || 'pro';
        if (orgId) {
          await supabase.from('organizations').update({
            plan,
            ai_quota: PLAN_QUOTAS[plan] || 50,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            subscription_status: 'active',
          }).eq('id', orgId);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const orgId = sub.metadata?.org_id;
        if (orgId) {
          await supabase.from('organizations').update({
            subscription_status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          }).eq('id', orgId);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const orgId = sub.metadata?.org_id;
        if (orgId) {
          await supabase.from('organizations').update({
            plan: 'starter',
            ai_quota: 10,
            ai_used: 0,
            subscription_status: 'canceled',
          }).eq('id', orgId);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (subId) {
          await supabase.from('organizations').update({
            subscription_status: 'past_due',
          }).eq('stripe_subscription_id', subId);
        }
        break;
      }
    }
  } catch (e) {
    console.error('Webhook handler error:', e);
  }

  return res.status(200).json({ received: true });
}
