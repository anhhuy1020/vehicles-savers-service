const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    demandId: { type: String, unique: true, required: true },
    rating: {type: Number, required: true},
    comment: {type: String, required: false},
    images: {type: Array, required: false},
    createdDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Feedback', schema);