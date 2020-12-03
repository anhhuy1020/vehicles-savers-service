const config = require('../config/config.json');
const mode = config.mode;
const bcrypt = require('bcryptjs');
const db = require('../_helpers/db');
const Customer = db.Customer;


module.exports = {
    getByUserId,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function create(customerParam) {
    // validate

    console.log("create: ", customerParam);
    const customer = new Customer(customerParam);

    // save customer
    await customer.save();
    return customer;
}

async function getAll() {
    return await Customer.find();
}

async function getById(id) {
    return await Customer.findById(id);
}

async function getByUserId(userId) {
    return await Customer.findOne({userId: userId});
}


async function update(id, customerParam) {
    const customer = await Customer.findById(id);


    // copy customerParam properties to customer
    Object.assign(customer, customerParam);

    await customer.save();
}

async function _delete(id) {
    await Customer.findByIdAndRemove(id);
}