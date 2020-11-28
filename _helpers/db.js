const config = require('../config.json');
const mode = config.mode;
const mongoose = require('mongoose');
const connectionOptions = { useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false };
mongoose.connect(config[mode].connectionString, connectionOptions);
mongoose.Promise = global.Promise;

module.exports = {
    User: require('../models/User'),
    Customer: require('../models/Customer'),
    Demand: require('../models/Demand'),
    Partner: require('../models/Partner'),
    Bill: require('../models/Bill'),
    Feedback: require('../models/Feedback'),
};