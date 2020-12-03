const config = require('../config/config.json');
const mode = config.mode;
const bcrypt = require('bcryptjs');
const db = require('../_helpers/db');
const Feedback = db.Feedback;


module.exports = {
    getByFeedbackId,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function create(feedbackParam) {
    // validate

    console.log("create: ", feedbackParam);
    const feedback = new Feedback(feedbackParam);

    // save customer
    await feedback.save();
    return feedback;
}

async function getAll() {
    return await Feedback.find();
}

async function getById(id) {
    return await Feedback.findById(id);
}

async function getByFeedbackId(feedbackId) {
    return await Feedback.findOne({feedbackId: feedbackId});
}


async function update(id, feedbackParam) {
    const feedback = await Feedback.findById(id);


    // copy customerParam properties to customer
    Object.assign(customer, feedbackParam);

    await feedback.save();
}

async function _delete(id) {
    await Feedback.findByIdAndRemove(id);
}