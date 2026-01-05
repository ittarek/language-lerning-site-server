const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const { getCollections } = require('../config/database');
const verifyJwt = require('../middleware/verifyJwt');
const { getCollections } = require('../config/database');

// POST /api/payments/create-intent
router.post('/create-intent', verifyJwt, async (req, res) => {
  try {
    const { price } = req.body;
    const amount = parseFloat(price) * 100;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card'],
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create payment intent' });
  }
});

// POST /api/payments
router.post('/', verifyJwt, async (req, res) => {
  try {
    const { paymentCollection, SelectedClassCollection } = await getCollections();
    const payment = req.body;

    const insertResult = await paymentCollection.insertOne(payment);
    const query = { _id: new ObjectId(payment.selectItem) };
    await SelectedClassCollection.deleteOne(query);

    res.send(insertResult);
  } catch (error) {
    res.status(500).json({ message: 'Failed to process payment' });
  }
});

// GET /api/payments/:email
router.get('/:email', verifyJwt, async (req, res) => {
  try {
    const { paymentCollection } = await getCollections();
    const email = req.params.email;
    const decodedEmail = req.decoded.email;

    if (decodedEmail !== email) {
      return res.status(403).send({
        error: true,
        message: 'Forbidden Access',
      });
    }

    const query = { email: email };
    const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();

    res.send(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payment history' });
  }
});

module.exports = router;
