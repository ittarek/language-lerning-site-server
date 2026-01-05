// config/database.js
const { MongoClient, ServerApiVersion } = require('mongodb');

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

module.exports = { connectDB, getCollections };
