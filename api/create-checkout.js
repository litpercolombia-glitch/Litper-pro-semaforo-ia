// ══════════════════════════════════════════════════════════════
// LITPERPRO — Vercel Serverless: Create Stripe Checkout Session
// ══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_KEY) {
    return res.status(500).json({ error: 'Stripe no configurado en el servidor' });
  }

  const { plan, annual, email, org_id } = req.body;
  if (!plan || !email) {
    return res.status(400).json({ error: 'Missing plan or email' });
  }

  // Price IDs from Stripe Dashboard - set these as env vars
  const PRICE_IDS = {
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
    enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    enterprise_annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
  };

  const priceKey = `${plan}_${annual ? 'annual' : 'monthly'}`;
  const priceId = PRICE_IDS[priceKey];

  if (!priceId) {
    return res.status(400).json({ error: 'Plan no válido: ' + priceKey });
  }

  try {
    const stripe = require('stripe')(STRIPE_KEY);

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'https://litperpro.com'}/dashboard?plan_activated=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://litperpro.com'}/checkout?plan=${plan}&canceled=1`,
      metadata: { org_id: org_id || '', plan },
      subscription_data: {
        trial_period_days: plan === 'pro' ? 7 : 14,
        metadata: { org_id: org_id || '', plan }
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      locale: 'es',
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error('Stripe error:', e);
    return res.status(500).json({ error: e.message || 'Error al crear sesión de pago' });
  }
}
