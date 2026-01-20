// const { getCollections } = require('../config/database');

const { getCollections } = require("../config/database");

const verifyAdmin = async (req, res, next) => {
  try {
    const { usersCollection } = await getCollections();
    const email = req.decoded.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);

    if (user?.role !== 'admin') {
      return res.status(403).send({ error: true, message: 'Forbidden access' });
    }
    next();
  } catch (error) {
    res.status(500).send({ error: true, message: 'Server error' });
  }
};

module.exports = verifyAdmin;
