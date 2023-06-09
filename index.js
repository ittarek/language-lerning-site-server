const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb data base

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hi7rjxl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classCollection = client.db("summerClass").collection("classes");

    //     All Class get Api
    app.get("/AllClasses", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });
    // Top class get api
    app.get("/TopClasses", async (req, res) => {
      const query = { enrolled_students: -1 };
      const result = await classCollection.find().sort(query).toArray();
      res.send(result);
    });
    // Top Instructors get api
    app.get("/TopInstructors", async (req, res) => {
      const query = { enrolled_students: -1 };
      const result = await classCollection.find().sort(query).toArray();
      res.send(result);
    });

    app.get("/", (req, res) => {
      res.send("Summer Camp Is Running Soon");
    });

    app.listen(port, () => {
      console.log(`Summer Camp server is running port ${port}`);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    //     await client.close();
  }
}
run().catch(console.dir);

// Todo . vercel  এ ডিপ্লয় করার আগে এই line  গুলু  comment  করে দিতে হভে
// // Send a ping to confirm a successful connection
// await client.db("admin").command({ ping: 1 });
// console.log(
// "Pinged your deployment. You successfully connected to MongoDB!"
// );
//   } finally {
// Ensures that the client will close when you finish/error
//     await client.close();
