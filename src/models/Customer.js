const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    userId: { type: String, unique: true, required: true },
    address: { type: String, required: false , default: ""},
    phone: { type: String, required: false, default: ""},
    avatarUrl: { type: String, required: false, default: "https://source.unsplash.com/300x300/?portrait"},
    history: {type: Array, required:false, default: []},
    currentDemand: {type: String, required: false, default:""},
    createdDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customer', schema);