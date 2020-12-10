const config = require('../config/config.json');
const mode = config.mode;
const bcrypt = require('bcryptjs');
const db = require('../_helpers/db');
const Bill = db.Bill;


module.exports = {
    getByBillId,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function create(billParam) {
    // validate

    console.log("create: ", billParam);
    const bill = new Bill(billParam);

    // save customer
    await bill.save();
    return bill;
}

async function getAll() {
    return await Bill.find();
}

async function getById(id) {
    return await Bill.findById(id);
}

async function getByBillId(billId) {
    return await Bill.findOne({billId: billId});
}


async function update(id, billParam) {
    const bill = await Bill.findById(id);


    // copy customerParam properties to customer
    Object.assign(customer, billParam);

    await bill.save();
}

async function _delete(id) {
    await Bill.findByIdAndRemove(id);
}