const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// In-memory users and subscription status
const users = {};
const subscriptions = {};

// User registration
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  if (users[email]) {
    return res.status(400).json({ error: 'User already exists' });
  }
  const hashed = await bcrypt.hash(password, 10);
  users[email] = { email, password: hashed };
  res.json({ message: 'Registered successfully' });
});

// User login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users[email];
  if (!user) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  res.json({ message: 'Login successful' });
});

// Create Stripe Checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  const { priceId, email } = req.body;
  if (!priceId || !email) {
    return res.status(400).json({ error: 'priceId and email required' });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/cancel.html`,
    });
    res.json({ id: session.id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Stripe webhook handler
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    subscriptions[session.customer_email] = 'active';
  }
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    if (sub.customer_email) {
      subscriptions[sub.customer_email] = 'canceled';
    }
  }
  res.json({ received: true });
});

// Serve static frontend
app.use(express.static(path.join(__dirname)));

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
