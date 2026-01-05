const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
// const { getCollections } = require('../config/database');
const verifyJwt = require('../middleware/verifyJwt');
const { getCollections } = require('../config/database');

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE generic routes like /:id
// Otherwise /top will be treated as an ID parameter

// GET /api/classes/top - MUST be before /:id
router.get('/top', async (req, res) => {
  try {
    const { classCollection } = await getCollections();
    const result = await classCollection.find().sort({ enrolled_students: -1 }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// GET /api/classes/top-instructors - MUST be before /:id
router.get('/top-instructors', async (req, res) => {
  try {
    const { classCollection } = await getCollections();
    const result = await classCollection.find().sort({ enrolled_students: -1 }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// POST /api/classes - Add new class
router.post('/', async (req, res) => {
  try {
    const { classCollection } = await getCollections();
    const newClass = req.body;
    const result = await classCollection.insertOne(newClass);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

// GET /api/classes - Get all classes
router.get('/', async (req, res) => {
  try {
    const { classCollection } = await getCollections();
    const result = await classCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

// PATCH /api/classes/approve/:id - Approve class
router.patch('/approve/:id', async (req, res) => {
  try {
    const { classCollection } = await getCollections();
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { status: 'approved' } };
    const result = await classCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

// PATCH /api/classes/deny/:id - Deny class
router.patch('/deny/:id', async (req, res) => {
  try {
    const { classCollection } = await getCollections();
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { status: 'denied' } };
    const result = await classCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

// PATCH /api/classes/reduce-seats/:id - Reduce available seats
router.patch('/reduce-seats/:id', verifyJwt, async (req, res) => {
  try {
    const { classCollection } = await getCollections();
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $inc: {
        available_seats: -1,
        enrolled_students: 1,
      },
    };

    const result = await classCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update seats' });
  }
});

// GET /api/classes/:id - Get single class by ID (MUST be last)
router.get('/:id', async (req, res) => {
  try {
    const { classCollection } = await getCollections();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await classCollection.findOne(query);

    if (!result) {
      return res.status(404).send({ error: true, message: 'Class not found' });
    }

    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

module.exports = router;
