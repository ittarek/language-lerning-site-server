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

// MongoDB Connection
// const uri =
//   'mongodb+srv://<db_username>:<db_password>@cluster0.hi7rjxl.mongodb.net/?appName=Cluster0';
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hi7rjxl.mongodb.net/?appName=Cluster0'`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    // Collections
    const classCollection = client.db('summerClass').collection('classes');
    const usersCollection = client.db('summerClass').collection('users');
    const SelectedClassCollection = client.db('summerClass').collection('selectedClass');
    const paymentCollection = client.db('summerClass').collection('payments');
    const enrollCourseCollection = client.db('summerClass').collection('enrolledClass');

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
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.roll !== 'admin') {
        return res.status(403).send({ error: true, message: 'Forbidden access' });
      }
      next();
    };

    // ==================== USER ROUTES ====================

    // Get all users
    app.get('/users', verifyJwt, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Create user
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'User already exists' });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Check if user is admin
    app.get('/users/admin/:email', verifyJwt, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (decodedEmail !== email) {
        return res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.roll === 'admin' };
      res.send(result);
    });

    // Make admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { roll: 'admin' },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Make instructor
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { roll: 'instructor' },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Check if user is instructor
    app.get('/users/instructor/:email', verifyJwt, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (decodedEmail !== email) {
        return res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.roll === 'instructor' };
      res.send(result);
    });

    // ==================== CLASS ROUTES ====================

    // Add class by instructor
    app.post('/addClass', async (req, res) => {
      const newClass = req.body;
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    });

    // Get all classes
    app.get('/AllClasses', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });
const newerr = "new error"
    // Get top classes (sorted by enrolled students)
     // Backend e logging add kora holo
    app.get('/TopClasses', async (req, res) => {
      try {
        console.log('📥 TopClasses endpoint hit!');

        const result = await classCollection
          .find()
          .sort({ enrolled_students: -1 })
          .toArray();

        console.log(`✅ Found ${result.length} classes`);
        console.log('First class:', result[0]); // Check data structure

        res.send(result);
      } catch (error) {
        console.error('❌ Error in TopClasses:', error);
        res.status(500).send({ error: error.message });
      }
    });

    // Get top instructors
      app.get('/TopInstructors', async (req, res) => {
        try {
            console.log('📥 TopInstructors endpoint hit!');
             const result = await classCollection
               .find()
               .sort({ enrolled_students: -1 })
               .toArray();
             res.send(result);
        } catch (error) {
            console.error('❌ Error in TopInstructors:', error);
            res.status(500).send({ error: error.message });
        }
     
    });

    // Approve class
    app.patch('/AllClasses/approved/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status: 'approved' },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Deny class
    app.patch('/AllClasses/denied/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status: 'denied' },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // ==================== SELECTED CLASS ROUTES ====================

    // 🆕 Check if class is already selected (FIX for your issue)
    app.get('/selectedClass/check', async (req, res) => {
      try {
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
        console.error('Error checking selection:', error);
        res.status(500).json({
          message: 'Failed to check selection status',
        });
      }
    });

    // 🔧 FIXED: Select class with duplicate check
    app.post('/selectedClass', async (req, res) => {
      try {
        const newSelectedClass = req.body;
        const { studentEmail, classId } = newSelectedClass;

        // Check if already selected
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

        // Insert new selection
        const result = await SelectedClassCollection.insertOne(newSelectedClass);
        res.status(201).send(result);
      } catch (error) {
        console.error('Error selecting class:', error);
        res.status(500).json({
          message: 'Failed to select class',
        });
      }
    });

    // 🔧 FIXED: Get selected classes for a student
    app.get('/getSelectedClass', verifyJwt, async (req, res) => {
      try {
        const { email } = req.query;

        if (!email) {
          return res.send([]);
        }

        // Verify email matches decoded token
        const decodedEmail = req.decoded.email;
        if (decodedEmail !== email) {
          return res.status(403).send({
            error: true,
            message: 'Forbidden Access',
          });
        }

        const query = { studentEmail: email }; // 🔧 FIXED: Use studentEmail
        const result = await SelectedClassCollection.find(query)
          .sort({ selectedAt: -1 }) // Sort by selection date
          .toArray();

        res.send(result);
      } catch (error) {
        console.error('Error fetching selected classes:', error);
        res.status(500).json({
          message: 'Failed to fetch selected classes',
        });
      }
    });

    // Get specific selected class by ID
    app.get('/getSelectedClass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await SelectedClassCollection.findOne(query);
      res.send(result);
    });

    // 🆕 Delete selected class
    app.delete('/selectedClass/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const result = await SelectedClassCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({
            message: 'Selected class not found',
          });
        }

        res.json({
          message: 'Class removed successfully',
          deletedCount: result.deletedCount,
        });
      } catch (error) {
        console.error('Error removing class:', error);
        res.status(500).json({
          message: 'Failed to remove class',
        });
      }
    });

    // ==================== PAYMENT ROUTES ====================

    // Create payment intent
    app.post('/create-payment-intent', verifyJwt, async (req, res) => {
      try {
        const { price } = req.body;
        const amount = parseFloat(price) * 100; // Convert to cents

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card'],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({
          message: 'Failed to create payment intent',
        });
      }
    });

    // Process payment
    app.post('/payments', verifyJwt, async (req, res) => {
      try {
        const payment = req.body;

        // Insert payment record
        const insertResult = await paymentCollection.insertOne(payment);

        // Delete from selected classes
        const query = { _id: new ObjectId(payment.selectItem) };
        const deleteResult = await SelectedClassCollection.deleteOne(query);

        res.send(insertResult);
      } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({
          message: 'Failed to process payment',
        });
      }
    });

    // Reduce available seats after enrollment
    app.patch('/reduceSeats/:id', verifyJwt, async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $inc: {
            available_seats: -1,
            enrolled_students: 1, // 🔧 FIXED: Changed enroll_student to enrolled_students
          },
        };

        const result = await classCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error('Error reducing seats:', error);
        res.status(500).json({
          message: 'Failed to update seats',
        });
      }
    });

    // 🆕 Get enrolled classes for a student
    app.get('/enrolledClasses/:email', verifyJwt, async (req, res) => {
      try {
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
        console.error('Error fetching enrolled classes:', error);
        res.status(500).json({
          message: 'Failed to fetch enrolled classes',
        });
      }
    });

    // ==================== HEALTH CHECK ====================
    console.log('✅ Successfully connected to MongoDB!');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

run().catch(console.dir);

// ==================== ROOT ROUTE ====================
app.get('/', (req, res) => {
  res.send({
    message: 'Summer Camp Server is Running!',
    status: 'active',
    version: '2.0',
  });
});

// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({
    error: true,
    message: 'Something went wrong!',
  });
});

// ==================== START SERVER ====================
// app.listen(port, () => {
//   console.log(`🚀 Summer Camp server is running on port ${port}`);
// });
