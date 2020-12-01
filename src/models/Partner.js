const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    userId: { type: String, unique: true, required: true },
    address: { type: String, required: false, default: "" },
    phone: { type: String, required: false, default: ""},
    avatarUrl: { type: String, required: false, default: "https://source.unsplash.com/300x300/?portrait"},
    history: {type: Array, require:false, default: []},
    currentDemand: {type: String, require: false, default:""},
    rating: {type: Number, require: false, default: 0},
    nRating: {type: Number, require: false, default: 0},
    latitude: { type: Number, required: false, default:0.0 },
    longitude: { type: Number, required: false, default:0.0},
    createdDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Partner', schema);