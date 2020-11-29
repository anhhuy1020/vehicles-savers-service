const mongoose = require('mongoose');
const DEMAND_STATUS = require('../const/DemandStatus');
const Schema = mongoose.Schema;

const schema = new Schema({
    customerId: { type: String, required: true },
    partnerId: { type: String, required: false, default: ""},
    pickupLatitude: { type: Number, required: true },
    pickupLongitude: { type: Number, required: true },
    addressDetail: { type: String, required: false, default: ""},
    problemDescription: { type: String, required: false, default: ""},
    vehicleType: { type: String, required: false, default: "unknown"},
    status: {type: String, required: false, default: DEMAND_STATUS.SEARCHING_PARTNER},
    billId: {type: String, require: false, default: ""},
    feedbackId: {type: String, require: false, default: ""},
    createdDate: { type: Date, require:false, default: Date.now },
    messages: {type: Array, require: false, default: []},
    completedDate: {type: Date}
});

module.exports = mongoose.model('Demand', schema);