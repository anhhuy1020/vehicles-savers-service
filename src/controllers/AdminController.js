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
const billService = require('../services/BillService');

// routes
router.post("/login", login);
router.get("/users", verifyToken, getAllUsers);
router.post("/users/create", verifyToken, createUser);
router.get("/user-detail/:id", verifyToken, getUserDetail);
router.get("/demands", verifyToken, getAllDemands);
router.get("/demand-detail/:id", verifyToken, getDemandDetail);
router.get("/feedbacks", verifyToken, getAllFeedbacks);

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
    .then((users) => res.json({ users }))
    .catch((err) => next(err));
}

async function getUserDetail(req, res, next) {
  let id = req.query.id;
  let user = await userService.getById(id);

  if (!user) {
    res.status(422).json({ errors: "Invalid id" });
    return;
  }
  let info;
  let history;
  if (user.role == ROLE.CUSTOMER) {
    info = await Customer.findOne({ userId: id })
    history = await Demand.find({ customerId: id })
  }
  if (user.role == ROLE.PARTNER) {
    info = await Partner.findOne({ userId: id })
    history = await Demand.find({ partnerId: id })
  }

  res.json({ user, info, history });
}

async function createUser(req, res, next) {
  try {
    let userParams = req.body;
    console.log("admin create", req.body);

    const errors = validator.validateLogin(userParams);

    if (errors.length > 0) {
      res.status(422).json({ errors: errors });
      return;
    }

    let user = await User.findOne({ email: userParams.email });
    if (user) {
      res.status(422).json({ errors: 'Email "' + userParams.email + '" is already taken' });
      return;
    }

    user = new User(userParams);
    if (userParams.password) {
      user.hash = bcrypt.hashSync(userParams.password, 10);
    }
    await user.save();

    if (userParams.role == ROLE.CUSTOMER) {
      let customer = new Customer({ userId: user._id, ...userParams });
      await customer.save();
    }
    if (userParams.role == ROLE.PARTNER) {
      let partner = new Partner({ userId: user._id, ...userParams });
      await partner.save();
    }
    res.status(200).json({});
  } catch (e) {
    console.log(e);
    res.status(422).json({ errorMessage: e });
  }
}

function getAllDemands(req, res, next) {
  demandService
    .getAll()
    .then((demands) => res.json({ demands }))
    .catch((err) => next(err));
}

async function getDemandDetail(req, res, next) {
  let id = req.query.id;
  let demand = await demandService.getById(id);

  if (!demand) {
    res.status(422).json({ errors: "Invalid id" });
    return;
  }

  let customer = {};
  let partner = {};
  let bill = {};
  let feedback = {};

  if (demand.customerId) {
    let customerUser = await userService.getById(demand.customerId);
    let customerInfo = await customerService.getByUserId(demand.customerId)
    customer = {
      "user": customerUser,
      "info": customerInfo
    }
  }
  if (demand.partnerId) {
    let partnerUser = await userService.getById(demand.partnerId);
    let partnerInfo = await partnerService.getByPartnerId(demand.partnerId);
    partner = {
      "user": partnerUser,
      "info": partnerInfo
    }
  }
  if (demand.billId) {
    bill = await billService.getById(demand.billId)
  }
  if (demand.feedbackId) {
    feedback = await feedbackService.getById(demand.feedbackId)
  }

  res.json({"demand": demand, "customer": customer, "partner": partner, "bill": bill, "feedback":feedback });
}
function getAllFeedbacks(req, res, next) {
  feedbackService
    .getAll()
    .then((feedbacks) => res.json({ feedbacks }))
    .catch((err) => next(err));
}

function verifyToken(req, res, next) {
  var header = req.headers.authorization || '';       // get the auth header
  var token = header.split(' ').pop() || '';
  if (!token) {
    res.status(401).json({ errors: "Invalid Access" });
    return;
  }
  const payload = jwt.verify(token, secretKey);
  if (!payload || payload.role != ROLE.ADMIN) {
    res.status(401).json({ errors: "Invalid Access" });
    return;
  }
  next();

}
