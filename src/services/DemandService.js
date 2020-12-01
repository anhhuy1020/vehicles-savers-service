const config = require('../config.json');
const mode = config.mode;
const jwt = require('jsonwebtoken');;
const bcrypt = require('bcryptjs');
const db = require('../_helpers/db');
const Demand = require('../models/Demand');
const User = db.User;

let cacheDemand = {};

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

(async function init() {
    var demands = await Demand.find();
    for (const key in demands) {
        if (demands.hasOwnProperty(key)) {
            let element = object[key];
            cacheDemand[element._id] = element;
        }
    }
    console.log("init all demand:", demands);
    console.log("init all demand:", cacheDemand);

})();

async function getAll() {
    return cacheDemand;
}

async function getById(id) {
    if(cacheDemand[id]){
        return cacheDemand[id];
    }
    var demand = await Demand.findById(id);
    if(demand) cacheDemand[id] = demand;
    return demand;
}
async function getAllByCustomerId(userId) {
    let result = [];
    for (const key in cacheDemand) {
        if (cacheDemand.hasOwnProperty(key)) {
            const demand = cacheDemand[key];
            if(demand.customerId = userId){
                
            }
        }
    }
    var demand = await Demand.findById(id);
    cacheDemand[id] = demand;
    return demand;
}

async function create(params) {
    // validate

    console.log("create: ", params);
    const demand = new Demand(params);

    // save user
    await demand.save();

    cacheDemand[demand._id] = demand;

    return demand;
}

async function update(id, params) {
    const demand = await getById(id);

    // validate
    if (!demand) throw 'Demand not found';

    // copy userParam properties to user
    Object.assign(user, params);

    await user.save();
}

async function _delete(id) {
    await User.findByIdAndRemove(id);
}