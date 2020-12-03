const config = require('../config/config.json');
const mode = config.mode;
const bcrypt = require('bcryptjs');
const db = require('../_helpers/db');
const User = db.User;


module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function create(userParam) {
    // validate

    console.log("create: ", userParam);
    const user = new User(userParam);

    // save customer
    await user.save();
    return user;
}

async function getAll() {
    return await User.find();
}

async function getById(id) {
    return await User.findById(id);
}

async function update(id, userParam) {
    const user = await User.findById(id);


    // copy customerParam properties to customer
    Object.assign(customer, userParam);

    await user.save();
}

async function _delete(id) {
    await User.findByIdAndRemove(id);
}