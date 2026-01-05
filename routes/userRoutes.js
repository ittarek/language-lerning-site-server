const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
// const { getCollections } = require('../config/database');
const verifyJwt = require('../middleware/verifyJwt');
const verifyAdmin = require('../middleware/verifyAdmin');
const { getCollections } = require('../config/database');

// GET /api/users
router.get('/', verifyJwt, verifyAdmin, async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const result = await usersCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const user = req.body;
    const query = { email: user.email };
    const existingUser = await usersCollection.findOne(query);

    if (existingUser) {
      return res.send({ message: 'User already exists' });
    }

    const result = await usersCollection.insertOne(user);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

// GET /api/users/admin/:email
router.get('/admin/:email', verifyJwt, async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const email = req.params.email;
    const decodedEmail = req.decoded.email;

    if (decodedEmail !== email) {
      return res.send({ admin: false });
    }

    const query = { email: email };
    const user = await usersCollection.findOne(query);
    const result = { admin: user?.roll === 'admin' };
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

// PATCH /api/users/admin/:id
router.patch('/admin/:id', async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { roll: 'admin' } };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

// GET /api/users/instructor/:email
router.get('/instructor/:email', verifyJwt, async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const email = req.params.email;
    const decodedEmail = req.decoded.email;

    if (decodedEmail !== email) {
      return res.send({ instructor: false });
    }

    const query = { email: email };
    const user = await usersCollection.findOne(query);
    const result = { instructor: user?.roll === 'instructor' };
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

// PATCH /api/users/instructor/:id
router.patch('/instructor/:id', async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { roll: 'instructor' } };
    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

module.exports = router;
