const config = require('../config/config.json');
const mode = config.mode;
const bcrypt = require('bcryptjs');
const db = require('../_helpers/db');
const Partner = db.Partner;


module.exports = {
    getByPartnerId,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function create(partnerParam) {
    // validate

    console.log("create: ", partnerParam);
    const partner = new Partner(partnerParam);

    // save customer
    await partner.save();
    return partner;
}

async function getAll() {
    return await Partner.find();
}

async function getById(id) {
    return await Partner.findById(id);
}

async function getByPartnerId(partnerId) {
    return await Partner.findOne({partnerId: partnerId});
}


async function update(id, partnerParam) {
    const partner = await Partner.findById(id);


    // copy customerParam properties to customer
    Object.assign(customer, partnerParam);

    await partner.save();
}

async function _delete(id) {
    await Partner.findByIdAndRemove(id);
}