const express = require('express');
const router = express.Router();
const userService = require('../services/UserService');
const loginValidator = require('../validators/LoginValidator');
const { body, validationResult } = require('express-validator');

// routes
router.post('', loginValidator.validateLogin(),login);

const ROLE = {
    ADMIN:0,
    PARTNER:1,
    CUSTOMER:2
}

module.exports = router;

function login(req, res, next) {
    console.log("login", req.body);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(422).json({ errors: errors.array() });
      return;
    }

    userService.authenticate(req.body)
        .then(user => user ? res.json(user) : res.status(400).json({ message: 'Email or password is incorrect!' }))
        .catch(err => next(err));
}