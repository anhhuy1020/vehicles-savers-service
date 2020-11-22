const config = require('../config.json');
const mode = config.mode;
const jwt = require('jsonwebtoken');;
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

async function getAll() {
    return await Customer.find();
}

async function getById(id) {
    return await Customer.findById(id);
}

async function getByUserId(userId) {
    return await Customer.findOne({userId: userId});
}

async function create(customerParam) {
    // validate

    console.log("create: ", customerParam);
    const customer = new Customer(customerParam);

    // save customer
    await customer.save();
    return customer;
}

async function update(id, customerParam) {
    const customer = await Customer.findById(id);

    // validate
    if (!customer) throw 'Customer not found';
    if (customer.email !== customerParam.email && await Customer.findOne({ email: customerParam.email })) {
        throw 'Email "' + customerParam.email + '" is already taken';
    }

    // hash password if it was entered
    if (customerParam.password) {
        customerParam.hash = bcrypt.hashSync(customerParam.password, 10);
    }

    // copy customerParam properties to customer
    Object.assign(customer, customerParam);

    await customer.save();
}

async function _delete(id) {
    await Customer.findByIdAndRemove(id);
}