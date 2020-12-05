const express = require("express");
const ROLE = require("../const/Role");
const validator = require("../_helpers/Validator");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config/config.json");
const mode = config.mode;
const db = require("../_helpers/db");
const User = db.User;
const DEMAND_STATUS = require("../const/DemandStatus");
const Demand = db.Demand;
const Customer = db.Customer;
const Partner = db.Partner;
const Feedback = db.Feedback;
const Bill = db.Bill;
const secretKey = config[mode].secret;
const userService = require('../services/UserService');
const partnerService = require('../services/PartnerService');
const customerService = require('../services/CustomerService');
const demandService = require('../services/DemandService');
const feedbackService = require('../services/FeedbackService');

// routes
router.post("/login", login);
router.get("/users", verifyToken, getAllUsers);
router.get("/user-detail/:id", verifyToken, getUserDetail);
router.get("/customers", verifyToken, getAllCustomers);
router.get("/demands", verifyToken, getAllDemands);
router.get("/feedbacks", verifyToken, getAllFeedbacks);
router.get("/partners", verifyToken, getAllPartners);

module.exports = router;

async function login(req, res, next) {
  try {
    console.log("admin login", req.body);
    const errors = validator.validateLogin(req.body);

    if (errors.length > 0) {
      res.status(422).json({ errors: errors });
      return;
    }

    const user = await User.findOne({ email: req.body.email });

    if (user && bcrypt.compareSync(req.body.password, user.hash)) {
      if (user.role == ROLE.ADMIN) {
      const token = jwt.sign({ id: user._id, role: user.role }, secretKey, {
          expiresIn: "7d",
        });

        res.json({
          id: user._id,
          email: user.email,
          name: user.name,
          token: token,
        });
      } else {
        res.status(422).json({ errors: "Invalid access!" });
      }
    } else {
      res.status(422).json({ errors: "Email or password is incorrect!" });
    }
  } catch (e) {
    console.log(e);
    res.status(422).json({ errorMessage: e });
  }
}

function getAllUsers(req, res, next) {  
  userService
    .getAll()
    .then((users) => res.json({users}))
    .catch((err) => next(err));
}

async function getUserDetail(req, res, next) {
  let id = req.query.id;
  let user = await userService.getById(id);

  if(!user){
    res.status(422).json({ errors: "Invalid id" });
    return;
  }
  let info;
  let history;
  if(user.role == ROLE.CUSTOMER){
    info = await Customer.findOne({userId: id})
    history = await Demand.find({customerId:id})
  }
  if(user.role == ROLE.PARTNER){
    info = await Partner.findOne({userId: id})
    history = await Demand.find({partnerId: id})
  }


  res.json({user, info, history});
}

function getAllCustomers(req, res, next) { 
  customerService
    .getAll()
    .then((customers) => res.json({customers}))
    .catch((err) => next(err));
}

function getAllDemands(req, res, next) {  
  demandService
    .getAll()
    .then((demands) => res.json({demands}))
    .catch((err) => next(err));
}

function getAllPartners(req, res, next) {  
  partnerService
    .getAll()
    .then((partners) => res.json({partners}))
    .catch((err) => next(err));
}

function getAllFeedbacks(req, res, next) {  
  feedbackService
    .getAll()
    .then((feedbacks) => res.json({feedbacks}))
    .catch((err) => next(err));
}

function verifyToken(req, res, next) {
    var header = req.headers.authorization || '';       // get the auth header
    var token = header.split(' ').pop() || '';
    if (!token){
        res.status(401).json({errors: "Invalid Access"});
        return;
    }
    const payload = jwt.verify(token, secretKey);
    if(!payload || payload.role != ROLE.ADMIN){
        res.status(401).json({errors: "Invalid Access"});
        return;
    }
    next();

}
