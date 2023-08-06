const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
// console.log(process.env.PAYMENT_SECRET_KEY);
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

// const { default: Stripe } = require("stripe");
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
    const SelectedClassCollection = client
      .db("summerClass")
      .collection("selectedClass");
    const paymentCollection = client.db("summerClass").collection("payments");
    const enrollCourseCollection = client.db("summerClass").collection("enrolledClass");

    // jwt api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
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

    // user get api
    app.get("/users", verifyJwt, verifyAdmin, async (req, res) => {
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
    app.get("/users/admin/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if (decodedEmail !== email) {
        res.send({ admin: false });
      }

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
    app.get("/users/instructor/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if (decodedEmail !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      // console.log("130  instructor query", query);
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.roll === "instructor" };
      // console.log("132 instructor result", result);
      res.send(result);
    });

    // Add Class API by instructor using post method
    app.post("/addClass", async (req, res) => {
      const newClass = req.body;
      // const updateDoc = {
      //   $set: {
      //     status: "pending",
      //   },
      // };
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    });

    // Class page selected Class data post api
    app.post("/selectedClass", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const existingClass = await SelectedClassCollection.findOne(query);
      if (existingClass) {
        return res.send([]);
      }
      const newSelectedClass = req.body;
      const result = await SelectedClassCollection.insertOne(newSelectedClass);
      console.log(result);
      res.send(result);
    });
    // selected data get for student dashboard using get api
    app.get("/getSelectedClass",verifyJwt, async (req, res) => {
      const { email } = req.query;
      // if (!email) {
      //   return res.send([]);
      // }
      // const decodedEmail = req.decoded.email;

      // if (decodedEmail !== email) {
      //   return res
      //     .status(403)
      //     .send({ error: true, message: "Forbidden Access" });
      // }

      const query = { email: email };
      const result = await SelectedClassCollection.find().toArray();
      const sortedResult = result.sort((a, b) => new Date(b.date) - new Date(a.date))
      res.send(sortedResult)
    });
    // specific class get by id form payment
    app.get("/getSelectedClass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await SelectedClassCollection.findOne(query);
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
    // TODO
    // Top Instructors get api
    app.get("/TopInstructors", async (req, res) => {
      const query = { enrolled_students: -1 };
      const result = await classCollection.find().sort(query).toArray();
      res.send(result);
    });

    // handle Approve Api By patch
    app.patch("/AllClasses/approved/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    // handle Denied Api By patch
    app.patch("/AllClasses/denied/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "denied",
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // app.post("/adminFeedBack", async (req, res) => {
    //   const data = req.body;

    //   const result = await classCollection.insertMany(data);
    //   res.send(result);
    // });

  // payment's api 
  app.post("/create-payment-intent", verifyJwt, async (req, res) => {
    const { price } = req.body;
    const tk = parseFloat(price)

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: tk * 100,
      currency: "usd",
      payment_method_types: ['card']
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  });

  app.post('/payments', verifyJwt, async (req, res) => {
    const payment = req.body;
    // const {email}= req.query;
    // const item = req.body;
    // const w = item.courseItemsId;
    const insertResult = await paymentCollection.insertOne(payment);

    const query = { _id: new ObjectId(payment.selectItem) }
    const deleteResult = await SelectedClassCollection.deleteOne(query);
    res.send(insertResult);

  })

  app.patch('/reduceSeats/:id', verifyJwt, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      
      $inc: { available_seats: -1,enroll_student:1 },
      

    }

    const result = await classCollection.updateOne(filter, updateDoc)
    res.send(result)
  })




    // app.post("/payment", async (req, res) => {
    //   let status, error;
    //   const { token, amount } = req.body;
    //   const payment = req.body;
    //   const result = await paymentCollection.insertOne(payment);
    //   try {
    //     await stripe.charges.create({
    //       source: token.id,
    //       amount,
    //       currency: "usd",
    //     });
    //     status = "success";
    //   } catch (error) {
    //     console.log(error);
    //     status = "Failure";
    //   }
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const deleted = await SelectedClassCollection.deleteOne(query);
    //   res.send({ result, deleted });
    //   res.send({ error, status });
    // });

    // res.send({ result, deleted });
    // res.json({ error, status });

    // app.delete("/payment/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) };
    //   const deleted = await SelectedClassCollection.deleteOne(query);
    //   res.send(deleted);
    // });

    // app.post('/paidCourses', verifyJwt, async (req, res) => {
    //   const course = req.body;
    //   const result = await enrollCourseCollection.insertOne(course);
    //   res.send(result)
    // })


    // get enrolled class which class payment

    // app.get("/enrolledClass/:email", async (req, res) => {
    //   const email = req.params.email;
    //   const query = { email: email };
    //   const result = await paymentCollection
    //     .find(query)
    //     .sort({ date: -1 })
    //     .toArray();
    //   res.send(result);
    // });
    // app.get("/getSeat", async (req, res) => {
    //   const result = await paymentCollection.find().toArray();
    //   res.send(result);
    // });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Summer Camp Is Running Soon");
});

app.listen(port, () => {
  console.log(`Summer Camp server is running port ${port}`);
});
