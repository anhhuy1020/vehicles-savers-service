const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    userId: { type: String, unique: true, required: true },
    address: { type: String, required: false, default: "" },
    phone: { type: String, required: false, default: ""},
    history: {type: Array, require:false, default: []},
    currentDemand: {type: String, require: false, default:""},
    createdDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Partner', schema);