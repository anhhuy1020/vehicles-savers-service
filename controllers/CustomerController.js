const express = require('express');
const router = express.Router();
const userService = require('../services/UserService');
const loginValidator = require('../validators/LoginValidator');
const { body, validationResult } = require('express-validator');
const { ROLE } = require('../services/UserService');

// routes
router.post('/register', loginValidator.validateRegister(),register);


module.exports = router;



function register(req, res, next) {
    console.log("REGISTER", req.body);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(422).json({ errors: errors.array() });
      return;
    }
    req.body.role = ROLE.CUSTOMER;
    userService.create(req.body)
        .then(() => res.json({}))
        .catch(err => next(err));
}
