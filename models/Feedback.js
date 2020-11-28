const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    demandId: { type: String, unique: true, required: true },
    rating: {type: Number, require: true},
    comment: {type: String, require: false},
    images: {type: Array, require: false},
    createdDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Feedback', schema);