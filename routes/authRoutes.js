const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// POST /api/auth/jwt
router.post('/jwt', (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '7d',
  });
  res.send({ token });
});

module.exports = router;
