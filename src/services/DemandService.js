const config = require('../config/config.json');
const mode = config.mode;
const bcrypt = require('bcryptjs');
const db = require('../_helpers/db');
const Demand = db.Demand;


module.exports = {
    getByDemandId,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function create(demandParam) {
    // validate

    console.log("create: ", demandParam);
    const demand = new Demand(demandParam);

    // save customer
    await demand.save();
    return demand;
}

async function getAll() {
    return await Demand.find();
}

async function getById(id) {
    return await Demand.findById(id);
}

async function getByDemandId(demandId) {
    return await Demand.findOne({demandId: demandId});
}


async function update(id, demandParam) {
    const demand = await Demand.findById(id);


    // copy customerParam properties to customer
    Object.assign(customer, demandParam);

    await demand.save();
}

async function _delete(id) {
    await Demand.findByIdAndRemove(id);
}