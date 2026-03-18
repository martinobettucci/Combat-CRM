import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import * as admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-02-24.acacia',
});

// Initialize Firebase Admin (optional, for webhook)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (e) {
    console.warn('Failed to initialize Firebase Admin. Webhooks will not update Firestore.');
  }
}

// Webhook endpoint needs raw body
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET not set. Skipping webhook validation.');
    return res.status(400).send('Webhook secret not configured.');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      
      // Determine plan based on amount or price ID
      // For simplicity, we assume the metadata contains the plan
      const plan = session.metadata?.plan || 'small_gym';

      if (userId && admin.apps.length > 0) {
        try {
          await admin.firestore().collection('users').doc(userId).update({
            'subscription.plan': plan,
            'subscription.status': 'active',
            'subscription.stripeCustomerId': customerId,
            'subscription.stripeSubscriptionId': subscriptionId,
            'subscription.updatedAt': new Date().toISOString()
          });
          console.log(`Successfully updated subscription for user ${userId}`);
        } catch (e) {
          console.error('Error updating Firestore:', e);
        }
      } else {
        console.log(`Checkout completed for ${userId}, but Firebase Admin not initialized.`);
      }
      break;
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      const status = subscription.status;
      const subId = subscription.id;
      
      if (admin.apps.length > 0) {
        try {
          // Find user by subscription ID
          const usersRef = admin.firestore().collection('users');
          const snapshot = await usersRef.where('subscription.stripeSubscriptionId', '==', subId).get();
          if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            await userDoc.ref.update({
              'subscription.status': status,
              'subscription.updatedAt': new Date().toISOString()
            });
            console.log(`Updated subscription status to ${status} for user ${userDoc.id}`);
          }
        } catch (e) {
          console.error('Error updating Firestore:', e);
        }
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Regular middleware for other routes
app.use(cors());
app.use(express.json());

// Create Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
  const { plan, userId, email } = req.body;

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe is not configured on the server.' });
  }

  // Define pricing (in cents)
  let priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData;
  if (plan === 'small_gym') {
    priceData = {
      currency: 'eur',
      product_data: {
        name: 'Small Gym Plan',
        description: 'Up to 2 admins and 50 athletes',
      },
      unit_amount: 6900, // 69€
      recurring: { interval: 'month' },
    };
  } else if (plan === 'unlimited') {
    priceData = {
      currency: 'eur',
      product_data: {
        name: 'Unlimited Plan',
        description: 'Unlimited admins and athletes',
      },
      unit_amount: 15000, // 150€
      recurring: { interval: 'month' },
    };
  } else {
    return res.status(400).json({ error: 'Invalid plan selected' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: priceData, quantity: 1 }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing`,
      client_reference_id: userId,
      customer_email: email,
      metadata: { plan },
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
