const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
// const { getCollections } = require('../config/database');
const verifyJwt = require('../middleware/verifyJwt');
const { getCollections } = require('../config/database');

// GET /api/selected-classes/check
router.get('/check', async (req, res) => {
  try {
    const { SelectedClassCollection } = await getCollections();
    const { studentEmail, classId } = req.query;

    if (!studentEmail || !classId) {
      return res.status(400).json({
        message: 'Student email and class ID are required',
      });
    }

    const existingSelection = await SelectedClassCollection.findOne({
      studentEmail: studentEmail,
      classId: classId,
    });

    res.json({
      isSelected: !!existingSelection,
      selectionId: existingSelection?._id,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check selection status' });
  }
});

// POST /api/selected-classes
router.post('/', async (req, res) => {
  try {
    const { SelectedClassCollection } = await getCollections();
    const newSelectedClass = req.body;
    const { studentEmail, classId } = newSelectedClass;

    const existingSelection = await SelectedClassCollection.findOne({
      studentEmail: studentEmail,
      classId: classId,
    });

    if (existingSelection) {
      return res.status(409).json({
        message: 'You have already selected this class!',
        isAlreadySelected: true,
      });
    }

    const result = await SelectedClassCollection.insertOne(newSelectedClass);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to select class' });
  }
});

// GET /api/selected-classes
router.get('/', verifyJwt, async (req, res) => {
  try {
    const { SelectedClassCollection } = await getCollections();
    const { email } = req.query;

    if (!email) {
      return res.send([]);
    }

    const decodedEmail = req.decoded.email;
    if (decodedEmail !== email) {
      return res.status(403).send({
        error: true,
        message: 'Forbidden Access',
      });
    }

    const query = { studentEmail: email };
    const result = await SelectedClassCollection.find(query)
      .sort({ selectedAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch selected classes' });
  }
});

// GET /api/selected-classes/:id
router.get('/:id', async (req, res) => {
  try {
    const { SelectedClassCollection } = await getCollections();
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await SelectedClassCollection.findOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

// DELETE /api/selected-classes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { SelectedClassCollection } = await getCollections();
    const id = req.params.id;
    const result = await SelectedClassCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Selected class not found' });
    }

    res.json({
      message: 'Class removed successfully',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove class' });
  }
});

// PATCH /api/selected-classes/payment/:id
router.patch('/payment/:id', verifyJwt, async (req, res) => {
  try {
    const { SelectedClassCollection } = await getCollections();
    const id = req.params.id;
    const { status } = req.body;

    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: { status: status || 'paid' } };

    const result = await SelectedClassCollection.updateOne(filter, updateDoc);
    res.send(result);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update payment status' });
  }
});

module.exports = router;
