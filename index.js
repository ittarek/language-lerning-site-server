const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
// const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// jwt verify function
const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unAuthorized access" });
  }
  // berar token
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unAuthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// mongodb data base

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const usersCollection = client.db("summerClass").collection("users");
    const dynamicClassCollection = client.db("summerClass").collection("dynamicClass");

    // jwt api
    app.post("/jwt", (req, res) => {
      const users = req.body;
      const token = jwt.sign(users, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      // console.log("token", token);
      res.send({ token });
    });

    // admin verify middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.roll !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access you are no admin" });
      }
      next();
    };
    // admin Instructors middleware
    const verifyInstructors = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.roll !== "instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };
    // admin Instructors middleware
    const studentVerify = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.roll !== "student") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    // user get api
    app.get("/users", verifyJwt, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // user api data create
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // check admin by email using get method
    app.get("/users/admin/:email", verifyJwt, verifyAdmin, async (req, res) => {
      const email = req.params.email;

      // if (req.decoded.email !== email) {
      //   res.send({ admin: false });
      // }

      const query = { email: email };
      // console.log("130  admin query", query);
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.roll === "admin" };
      // console.log("132 admin result", result);
      res.send(result);
    });

    // make admin api
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          roll: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // make instructor api
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          roll: "instructor",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // instructors get api
    app.get("/users/instructors/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.roll === "instructor" };

      res.send(result);
    });

    // make student api
    // app.patch("/users/student/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   const updateDoc = {
    //     $set: {
    //       roll: "student",
    //     },
    //   };
    //   const result = await usersCollection.updateOne(filter, updateDoc);
    //   res.send(result);
    // });

    // student get api
    app.get("/users/student/:email", async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      if (req.decoded.email !== email) {
        res.send({ student: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { student: user?.roll === "student" };

      res.send(result);
    });


    // Add Class API by instructor using post method
    app.post("/addClass",  async (req, res) => {
      const newClass = req.body;
      // const updateDoc = {
      //   $set: {
      //     status: "pending",
      //   },
      // };
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    });

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
    // await client.db("admin").command({ ping: 1 });
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
