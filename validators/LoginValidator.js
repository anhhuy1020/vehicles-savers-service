const {check} = require('express-validator');

let validateRegister = () => {
  return [ 
    check('name', 'Name is empty!').not().isEmpty(),
    check('phone', 'Phone is empty!').not().isEmpty(),
    check('phone', 'Phone is not a number!').isNumeric(),
    check('phone', 'Phone must be of 10 digit!').isLength({min:10, max:10}),
    check('email', 'Email is empty!').not().isEmpty(),
    check('password','Password is empty!').not().isEmpty(),
    check('password','Invalid password!').matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/),

  ]; 
}

let validateLogin = () => {
  return [ 
    check('email', 'Email is empty!').not().isEmpty(),
    check('email', 'Invalid email!').isEmail(),
    check('password', 'password more than 6 digits!').isLength({ min: 6 })
  ]; 
}


module.exports = {
    validateRegister,
    validateLogin
}