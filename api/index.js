const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const nodemailer = require('nodemailer');

// ==================== EMAIL TRANSPORTER SETUP ====================
const transporter = nodemailer.createTransport({
  service: 'gmail', // অথবা আপনার email service
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD, // Gmail এর জন্য App Password ব্যবহার করুন
  },
});

// Verify transporter connection
transporter.verify((error, success) => {
  if (error) {
    console.log('Email transporter error:', error);
  } else {
    console.log('✅ Email transporter is ready');
  }
});
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
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hi7rjxl.mongodb.net/?appName=Cluster0`;

let client;
let db;

async function connectDB() {
  if (db) return db;

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
    await SelectedClassCollection.deleteOne(query);

    res.send(insertResult);
  } catch (error) {
    res.status(500).json({ message: 'Failed to process payment' });
  }
});

// ==================== ENROLL ROUTES ====================
app.post('/enrolledClasses', verifyJwt, async (req, res) => {
  try {
    const { enrollCourseCollection } = await getCollections();
    const enrollmentData = req.body;

    if (!enrollmentData.studentEmail) {
      return res.status(400).json({
        success: false,
        message: 'Student email is required',
      });
    }

    // Check if already enrolled
    const existingEnrollment = await enrollCourseCollection.findOne({
      studentEmail: enrollmentData.studentEmail,
      className: enrollmentData.className,
    });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: 'You are already enrolled in this class',
      });
    }

    // Create enrollment record
    const enrollmentRecord = {
      studentEmail: enrollmentData.studentEmail,
      studentName: enrollmentData.studentName || 'Anonymous',
      className: enrollmentData.className,
      classImage: enrollmentData.classImage || '',
      instructorName: enrollmentData.instructorName || '',
      instructorEmail: enrollmentData.instructorEmail || '',
      courseId: enrollmentData.courseId || '',
      amount: enrollmentData.amount || 0,
      transactionId: enrollmentData.transactionId || '',
      date: enrollmentData.date || new Date(),
      enrolledAt: new Date(),
      status: 'active',
    };

    const result = await enrollCourseCollection.insertOne(enrollmentRecord);

    res.status(201).json({
      success: true,
      message: 'Successfully enrolled in class',
      insertedId: result.insertedId,
      acknowledged: result.acknowledged,
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in class',
      error: error.message,
    });
  }
});

app.get('/enrolledClasses/:email', verifyJwt, async (req, res) => {
  try {
    const { enrollCourseCollection } = await getCollections();
    const email = req.params.email;
    const decodedEmail = req.decoded.email;

    if (decodedEmail !== email) {
      return res.status(403).send({
        error: true,
        message: 'Forbidden Access',
      });
    }

    const query = { studentEmail: email };
    const result = await enrollCourseCollection
      .find(query)
      .sort({ enrolledAt: -1 })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrolled classes',
      error: error.message,
    });
  }
});
// course coming soon section
// ✅ POST endpoint to send notification email
// ==================== NOTIFICATION EMAIL ROUTE ====================
app.post('/send-notification-email', async (req, res) => {
  try {
    const { email, courseTitle, courseId, startDate, coursePrice } = req.body;

    // Validate input
    if (!email || !courseTitle) {
      return res.status(400).json({
        success: false,
        message: 'Email and course title are required',
      });
    }

    // Email template
    const emailTemplate = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px; text-align: center; }
            .content { margin: 20px 0; line-height: 1.6; color: #333; }
            .course-details { background: #f9f9f9; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Course Notification Confirmed! ✅</h1>
            </div>
            
            <div class="content">
              <p>Hello,</p>
              <p>Thank you for signing up for notifications! We're excited to have you join us.</p>
              
              <div class="course-details">
                <h3>${courseTitle}</h3>
                <p><strong>Start Date:</strong> ${new Date(
                  startDate
                ).toLocaleDateString()}</p>
                <p><strong>Price:</strong> $${coursePrice}</p>
                <p><strong>Course ID:</strong> ${courseId}</p>
              </div>
              
              <p>We'll send you an email reminder when the course is about to start. You can also:</p>
              <ul>
                <li>Browse our other courses</li>
                <li>Review course prerequisites</li>
                <li>Prepare your learning environment</li>
              </ul>
              
              <a href="https://language-center-bedfd.web.app/${courseId}" class="button">View Course Details</a>
            </div>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; 2024 Language Learner. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const mailOptions = {
      from: process.env.SMTP_EMAIL,
      to: email,
      subject: `Notification Confirmed: ${courseTitle}`,
      html: emailTemplate,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Notification email sent successfully',
    });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification email',
      error: error.message,
    });
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

app.listen(port);
// ==================== ERROR HANDLING ====================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({
    error: true,
    message: 'Something went wrong!',
  });
});

module.exports = app;
