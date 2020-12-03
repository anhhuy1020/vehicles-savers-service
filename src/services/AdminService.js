const express = require('express');
const ROLE = require('../const/Role');
const validator = require('../_helpers/Validator');
const router = express.Router();


// routes
router.post('/login',login);

module.exports = router;

async function login(req, res, next) {
    try{
    console.log("admin login", req.body);
    const errors = validator.validateLogin(req.body);

    if (errors.length > 0) {
      res.status(422).json({ errors: errors});
      return;
    }

    const user = await User.findOne({email: req.body.email});

    if (user && bcrypt.compareSync(req.body.password, user.hash)) {
        if(user.role == ROLE.ADMIN){
            let partnerInfo =  await Partner.findOne({userId: user._id});
            if (!partnerInfo){
                partnerInfo = new Partner({
                    userId: user._id,
                });
                partnerInfo.save();
            }

            const token = jwt.sign({ id: user._id, role: user.role }, secretKey, { expiresIn: '7d' });

            res.json({...user, token:token});
        } else{
            res.status(422).json({ errorMessage: "Invalid access!"});
        }
    } else{
        res.status(422).json({ errorMessage: "Email or password is incorrect!"});
    }
} catch(e){
    console.log(e);
    res.status(422).json({ errorMessage: e });

}
}

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
