const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
// Middleware
app.use(cors());
app.use(express.json());

// JWT verify function
const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized access' });
  }

  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ error: true, message: 'Unauthorized access' });
    }
    req.decoded = decoded;
    next();
  });
};

// MongoDB Connection - FIX করা হয়েছে

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hi7rjxl.mongodb.net/?appName=Cluster0`; // ⚠️ শেষের extra quote remove করুন

// Global client variable for connection reuse
let client;
let db;

async function connectDB() {
  if (db) return db; // Already connected

  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    await client.connect();
    db = client.db('summerClass');
    console.log('✅ MongoDB Connected');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Collections helper
async function getCollections() {
  const database = await connectDB();
  return {
    classCollection: database.collection('classes'),
    usersCollection: database.collection('users'),
    SelectedClassCollection: database.collection('selectedClass'),
    paymentCollection: database.collection('payments'),
    enrollCourseCollection: database.collection('enrolledClass'),
  };
}

// ==================== JWT API ====================
app.post('/jwt', (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '7d',
  });
  res.send({ token });
});

// ==================== ADMIN VERIFY MIDDLEWARE ====================
const verifyAdmin = async (req, res, next) => {
  try {
    const { usersCollection } = await getCollections();
    const email = req.decoded.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);
    if (user?.roll !== 'admin') {
      return res.status(403).send({ error: true, message: 'Forbidden access' });
    }
    next();
  } catch (error) {
    res.status(500).send({ error: true, message: 'Server error' });
  }
};

// ==================== ROOT ROUTE ====================
app.get('/', (req, res) => {
  res.send({
    message: 'Summer Camp Server is Running!',
    status: 'active',
    version: '2.0',
  });
});

// ==================== USER ROUTES ====================
app.get('/users', verifyJwt, verifyAdmin, async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const result = await usersCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

app.post('/users', async (req, res) => {
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

app.get('/users/admin/:email', verifyJwt, async (req, res) => {
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

app.patch('/users/admin/:id', async (req, res) => {
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

app.patch('/users/instructor/:id', async (req, res) => {
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

app.get('/users/instructor/:email', verifyJwt, async (req, res) => {
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

// ==================== CLASS ROUTES ====================
app.post('/addClass', async (req, res) => {
  try {
    const { classCollection } = await getCollections();
    const newClass = req.body;
    const result = await classCollection.insertOne(newClass);
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

app.get('/AllClasses', async (req, res) => {
  try {
    const { classCollection } = await getCollections();
    const result = await classCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: true, message: error.message });
  }
});

app.get('/TopClasses', async (req, res) => {
  try {
    const { classCollection } = await getCollections();
    const result = await classCollection.find().sort({ enrolled_students: -1 }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.get('/TopInstructors', async (req, res) => {
  try {
    const { classCollection } = await getCollections();
    const result = await classCollection.find().sort({ enrolled_students: -1 }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.patch('/AllClasses/approved/:id', async (req, res) => {
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

app.patch('/AllClasses/denied/:id', async (req, res) => {
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

// ==================== SELECTED CLASS ROUTES ====================
app.get('/selectedClass/check', async (req, res) => {
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

app.post('/selectedClass', async (req, res) => {
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

app.get('/getSelectedClass', verifyJwt, async (req, res) => {
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

app.get('/getSelectedClass/:id', async (req, res) => {
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

app.delete('/selectedClass/:id', async (req, res) => {
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

// ==================== PAYMENT ROUTES ====================
app.post('/create-payment-intent', verifyJwt, async (req, res) => {
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

app.post('/payments', verifyJwt, async (req, res) => {
  try {
    const { paymentCollection, SelectedClassCollection } = await getCollections();
    const payment = req.body;

    const insertResult = await paymentCollection.insertOne(payment);
    const query = { _id: new ObjectId(payment.selectItem) };
    const deleteResult = await SelectedClassCollection.deleteOne(query);

    res.send(insertResult);
  } catch (error) {
    res.status(500).json({ message: 'Failed to process payment' });
  }
});

app.patch('/reduceSeats/:id', verifyJwt, async (req, res) => {
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

// ==================== ENROLL STUDENT ROUTE (ADD TO BACKEND) ====================
app.post('/enrolledClasses', verifyJwt, async (req, res) => {
  try {
    const { enrollCourseCollection, SelectedClassCollection } = await getCollections();
    const enrollmentData = req.body;

    // Validate required fields
    if (!enrollmentData.studentEmail || !enrollmentData.className) {
      return res.status(400).json({
        message: 'Student email and class name are required',
      });
    }

    // Check if already enrolled
    const existingEnrollment = await enrollCourseCollection.findOne({
      studentEmail: enrollmentData.studentEmail,
      className: enrollmentData.className,
    });

    if (existingEnrollment) {
      return res.status(409).json({
        message: 'You are already enrolled in this class',
      });
    }

    // Add enrollment
    const result = await enrollCourseCollection.insertOne({
      ...enrollmentData,
      enrolledAt: new Date(),
      status: 'active',
    });

    res.status(201).send(result);
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      message: 'Failed to enroll in class',
      error: error.message,
    });
  }
});

// ==================== UPDATE SELECTED CLASS STATUS ROUTE ====================
app.patch('/payment/:id', verifyJwt, async (req, res) => {
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
// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({
    error: true,
    message: 'Something went wrong!',
  });
});

// ==================== EXPORT FOR VERCEL ====================
module.exports = app;
// ==================== START SERVER ====================
// app.listen(port, () => {
//   console.log(`🚀 Summer Camp server is running on port ${port}`);
// });
