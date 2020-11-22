const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    demandId: { type: String, unique: true, required: true },
    items: {type: Array, require: true}
});

module.exports = mongoose.model('Bill', schema);