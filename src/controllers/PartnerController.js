
const validator = require('../_helpers/Validator');
const Response = require('../network/Response');
const jwt = require("jsonwebtoken");
const EVENT_NAME = require('../const/EventName');
const ERROR_CODE = require('../const/ErrorCode');
const ROLE = require('../const/Role');
const config = require('../config/config.json');
const mode = config.mode;
const secretKey = config[mode].secret;
const bcrypt = require('bcryptjs');
const db = require('../_helpers/db');
const DEMAND_STATUS = require('../const/DemandStatus');
const Feedback = require('../models/Feedback.js');
const Partner = db.Partner;
const User = db.User;
const Demand = db.Demand;
const Customer = db.Customer;
const Bill = db.Bill;
const avatarSaver = require('../_helpers/avatarSaver');

module.exports = {getInstance}
const CustomerController = require('./CustomerController.js');
const utility = require('../_helpers/utility');
const CustomerService = require('../services/CustomerService');
class PartnerController {

    constructor(serverSocket){
        this.listPartner = {};
        this.listPartnerSocket = {};
    }

    async login(socket, req) {
        try{
            const errors = validator.validateLogin(req);

            if (errors.length > 0) {
                socket.emit(EVENT_NAME.LOGIN, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }
            const user = await User.findOne({email: req.email});

            if (user && bcrypt.compareSync(req.password, user.hash)) {
                if(user.role == ROLE.PARTNER){
                    let partnerInfo =  await Partner.findOne({userId: user._id});
                    if (!partnerInfo){
                        partnerInfo = new Partner({
                            userId: user._id,
                        });
                        partnerInfo.save();
                    }

                    let demandHistory = await this.getDemandHistory(partnerInfo.history);
                    let currentDemand = await this.getDemandInfo(partnerInfo.currentDemand)

                    const token = jwt.sign({ id: user._id, role: user.role }, secretKey, { expiresIn: '7d' });
                    let res = {
                        partner: {
                            _id: user._id,
                            name: user.name,
                            email: user.email,
                            address: partnerInfo.address,
                            phone: partnerInfo.phone,
                            avatarUrl: partnerInfo.avatarUrl,
                            nRating: partnerInfo.nRating,
                            rating: partnerInfo.rating
                        },
                        history: demandHistory,
                        currentDemand: currentDemand,
                        token: token,
                    }
                    this.attachSocketToPartner(user._id, socket);
                    socket.emit(EVENT_NAME.LOGIN, new Response().json(res));
                } else{
                    socket.emit(EVENT_NAME.LOGIN, new Response().error(ERROR_CODE.FAIL, "Invalid access!"));
                }
            } else{
                socket.emit(EVENT_NAME.LOGIN, new Response().error(ERROR_CODE.FAIL, "Email or password is incorrect!"));
            }
        } catch(e){
            console.log(e);
            socket.emit(EVENT_NAME.LOGIN, new Response().error(ERROR_CODE.FAIL, e));
        }
    }

    async updateProfile(socket, req, token) {
        try {
            let partner =  await this.verifyToken(token);

            if(!partner){
                socket.emit(EVENT_NAME.UPDATE_PROFILE, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            const errors = validator.updateProfile(req);

            if (errors.length > 0) {
                console.log("upload profile errors", errors, req);
                socket.emit(EVENT_NAME.UPDATE_PROFILE, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }

            let user = await User.findById(partner.userId);

            if(!user){
                console.log("upload profile user not found", partner.userId)
                socket.emit(EVENT_NAME.UPDATE_PROFILE, new Response().error(ERROR_CODE.FAIL, 'user not found!'));
                return;
            }

            if(req['name']) user.name = req['name'];
            if(req['email']) user.email = req['email'];
            if(req['phone']) partner.phone = req['phone'];
            if(req['address']) partner.address = req['address'];
            if(req['avatarUrl']){
                try{
                    let filename = await avatarSaver.saveAvatar(req.avatarUrl);
                    if(filename){
                        partner.avatarUrl = config[mode].HOST + '/avatars/' + filename;
                        console.log('new avatarUrl: ', (config[mode].HOST + '/avatars/' + filename));
                    }
                } catch (e){
                    console.log("Save avatar exception: ", e);
                }
            }

            await partner.save();
            await user.save();

            let res = {
                _id: user._id,
                name: user.name,
                email: user.email,
                address: partner.address,
                phone: partner.phone,
                avatarUrl: partner.avatarUrl
            }

            console.log("update profile success", res);

            this.sendToAllDevice(partner.userId, EVENT_NAME.UPDATE_PROFILE, new Response().json(res));

        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.UPDATE_PROFILE, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }

    async fetchCurrentDemand(socket, token) {
        try {
            let partner =  await this.verifyToken(token);

            if(!partner){
                socket.emit(EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            if(partner.currentDemand == ""){
                return;
            }

            let demand = await this.getDemandInfo(partner.currentDemand);
            if(!demand){
                socket.emit(EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().error(ERROR_CODE.FAIL, "Demand not found"));
                return;
            }
            console.log("fetchCurrentDemand", demand);
            socket.emit(EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(demand));

        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }


    async fetchListDemand(socket, req, token) {
        try {
            let partner =  await this.verifyToken(token);

            if(!partner){
                socket.emit(EVENT_NAME.FETCH_LIST_DEMAND, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            const errors = validator.fetchListDemand(req);

            if (errors.length > 0) {
                socket.emit(EVENT_NAME.FETCH_LIST_DEMAND, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }

            partner.latitude = req.latitude;
            partner.longitude = req.longitude;
            partner.save();

            let listDemand = [];
            Demand.find({status: DEMAND_STATUS.SEARCHING_PARTNER},async function(err, docs) {
                for(let i in docs){
                    let demand = docs[i];
                    let customerInfo;
                    let distance = utility.calculateDistance(demand.pickupLatitude, demand.pickupLongitude, req.latitude, req.longitude);

                    if(distance > req.range){
                        continue;
                    }

                    if(demand.customerId != ""){
                        let customer = await Customer.findOne({userId: demand.customerId});
                        let user = await User.findById(demand.customerId);
                         customerInfo =  {
                            name: user.name,
                            email: user.email,
                            phone: customer.phone,
                            avatarUrl: customer.avatarUrl
                        };

                    }
                    listDemand.push({
                        addressDetail: demand.addressDetail,
                        problemDescription: demand.problemDescription,
                        vehicleType: demand.vehicleType,
                        status: demand.status,
                        _id: demand._id,
                        pickupLatitude: demand.pickupLatitude,
                        pickupLongitude: demand.pickupLongitude,
                        customer: {...customerInfo,
                        _id: demand.customerId}
                    })
                }

                socket.emit(EVENT_NAME.FETCH_LIST_DEMAND, new Response().json(listDemand));
           });


        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.FETCH_LIST_DEMAND, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }

    async acceptDemand(socket, req, token) {
        try {
            let partner =  await this.verifyToken(token);

            if(!partner){
                socket.emit(EVENT_NAME.ACCEPT_DEMAND, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            if(partner.currentDemand != ""){
                socket.emit(EVENT_NAME.ACCEPT_DEMAND, new Response().error(ERROR_CODE.FAIL, "Already have a demand"));
                return;
            }

            const errors = validator.acceptDemand(req);

            if (errors.length > 0) {
                socket.emit(EVENT_NAME.ACCEPT_DEMAND, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }

            let demand = await Demand.findById(req.demandId);
            if(!demand){
                socket.emit(EVENT_NAME.ACCEPT_DEMAND, new Response().error(ERROR_CODE.FAIL, "Invalid id"));
                return;
            }
            if(demand.status != DEMAND_STATUS.SEARCHING_PARTNER){
                socket.emit(EVENT_NAME.ACCEPT_DEMAND, new Response().error(ERROR_CODE.FAIL, "Demand is not available!"));
                return;
            }
            demand.partnerId = partner.userId;
            demand.status = DEMAND_STATUS.HANDLING;
            partner.currentDemand = demand._id;
            await demand.save();
            await partner.save();

            let res = await this.getDemandInfo(demand._id);

            socket.emit(EVENT_NAME.ACCEPT_DEMAND, new Response().json(res));
            this.sendToAllDevice(partner.userId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res), socket);
            CustomerController.getInstance().sendToAllDevice(demand.customerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));

        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.ACCEPT_DEMAND, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }

    async cancelDemand(socket, req, token) {
        try {
            let partner =  await this.verifyToken(token);

            if(!partner){
                console.log("cancelDemand partner not found", token);
                socket.emit(EVENT_NAME.CANCEL_DEMAND, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            const errors = validator.cancelDemand(req);

            if (errors.length > 0) {
                console.log("cancelDemand partner errors", errors, req);
                socket.emit(EVENT_NAME.CANCEL_DEMAND, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }

            let demand;
            if(partner.currentDemand){
                demand = await Demand.findById(partner.currentDemand);
            }
            if(!demand){
                console.log("cancelDemand demand is null: ");
                socket.emit(EVENT_NAME.CANCEL_DEMAND, new Response().error(ERROR_CODE.FAIL, "You don't have any demand to cancel!"));
                return;
            }
            if(demand.status != DEMAND_STATUS.HANDLING){
                console.log("cancelDemand demand.status: ", demand.status);
                socket.emit(EVENT_NAME.CANCEL_DEMAND, new Response().error(ERROR_CODE.FAIL, "You cannot cancel this demand!"));
                return;
            }

            demand.status = DEMAND_STATUS.CANCELED;
            demand.canceledReason = req['reason'];
            demand.canceledBy = partner.userId;
            partner.history.push(demand._id);
            partner.currentDemand = "";
            if(demand.customerId){
                let customer = await Customer.findOne({userId: demand.customerId});
                if(customer){
                    customer.currentDemand = "";
                    customer.history.push(demand._id);
                    await customer.save();
                }
            }
            await demand.save();
            await partner.save();

            let res = await this.getDemandInfo(demand._id);
            console.log("cancelDemand: ", res);
            this.sendToAllDevice(partner.userId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
            CustomerController.getInstance().sendToAllDevice(demand.customerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));

        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.CANCEL_DEMAND, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }


    async invoice(socket, req, token) {
        try {
            let partner =  await this.verifyToken(token);

            if(!partner){
                socket.emit(EVENT_NAME.INVOICE, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            if(partner.currentDemand == ""){
                socket.emit(EVENT_NAME.INVOICE, new Response().error(ERROR_CODE.FAIL, "Haven't demand yet"));
                return;
            }

            const errors = validator.invoice(req);
            if (errors.length > 0) {
                socket.emit(EVENT_NAME.INVOICE, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }

            let demand;

            if(partner.currentDemand != ""){
                demand = await Demand.findById(partner.currentDemand);
            }
 
            if(!demand){
                socket.emit(EVENT_NAME.INVOICE, new Response().error(ERROR_CODE.FAIL, "Invalid id"));
                return;
            }
            if(demand.status != DEMAND_STATUS.HANDLING && demand.status != DEMAND_STATUS.PAYING){
                socket.emit(EVENT_NAME.INVOICE, new Response().error(ERROR_CODE.FAIL, "Demand is not available!"));
                return;
            }

            demand.status = DEMAND_STATUS.PAYING;
            let bill = new Bill({items:req, fee: config.fee, demandId: demand._id});
            demand.billId = bill._id;
            await demand.save();
            await bill.save();

            let res = await this.getDemandInfo(demand._id);

            socket.emit(EVENT_NAME.INVOICE, new Response());
            this.sendToAllDevice(partner.userId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
            CustomerController.getInstance().sendToAllDevice(demand.customerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));

        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.INVOICE, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }

    async chat(socket, req, token) {
        try {
            let partner =  await this.verifyToken(token);
            console.log("CHAT", partner);

            if(!partner){
                socket.emit(EVENT_NAME.CHAT, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            if(partner.currentDemand == ""){
                socket.emit(EVENT_NAME.CHAT, new Response().error(ERROR_CODE.FAIL, "Haven't had demand yet"));
                return;
            }

            let demand = await Demand.findById(partner.currentDemand);
            if(!demand){
                socket.emit(EVENT_NAME.CHAT, new Response().error(ERROR_CODE.FAIL, "Demand not found"));
                return;
            }
            if(demand.status != DEMAND_STATUS.HANDLING){
                socket.emit(EVENT_NAME.CHAT, new Response().error(ERROR_CODE.FAIL, "Not handling phase"));
                return;
            }

            if (!demand.messages){
                demand.messages = [];
            }

            demand.messages.push({userId: partner.userId, content: req, time: Date.now()})
            await demand.save();

            let res = await this.getDemandInfo(demand._id);

            console.log("chat", res);
            this.sendToAllDevice(demand.partnerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
            CustomerController.getInstance().sendToAllDevice(demand.customerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
        } catch(e){
            console.log("chat: ", e);
            socket.emit(EVENT_NAME.CHAT, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }

    async updateLocation(socket, req, token) {
        try {
            let partner =  await this.verifyToken(token);

            if(!partner){
                console.log("UPDATE_LOCATION partner null", token);
                socket.emit(EVENT_NAME.UPDATE_LOCATION, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            const errors = validator.updateLocation(req);

            if (errors.length > 0) {
                console.log("UPDATE_LOCATION errors", errors);
                socket.emit(EVENT_NAME.UPDATE_LOCATION, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }

            if(partner.currentDemand == ""){
                console.log("UPDATE_LOCATION currentDemand", partner.currentDemand);
                socket.emit(EVENT_NAME.UPDATE_LOCATION, new Response().error(ERROR_CODE.FAIL, "Haven't had demand yet"));
                return;
            }

            let demand = await Demand.findById(partner.currentDemand);
            if(!demand){
                socket.emit(EVENT_NAME.UPDATE_LOCATION, new Response().error(ERROR_CODE.FAIL, "Demand not found"));
                return;
            }
            if(demand.status != DEMAND_STATUS.HANDLING){
                socket.emit(EVENT_NAME.UPDATE_LOCATION, new Response().error(ERROR_CODE.FAIL, "Not handling phase"));
                return;
            }

            partner.latitude = req.latitude;
            partner.longitude = req.longitude;
            await partner.save();

            let res = await this.getDemandInfo(demand._id);

            CustomerController.getInstance().sendToAllDevice(demand.customerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
        } catch(e){
            console.log("updateLocation: ", e);
            socket.emit(EVENT_NAME.UPDATE_LOCATION, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }


    logout(socket){
        if(socket && socket.userId && this.listPartnerSocket[socket.userId]){
            let index = this.listPartnerSocket[socket.userId].indexOf(socket);
            if(index >= 0){
                this.listPartnerSocket[socket.userId].splice(index, 1);
            }
        }
    }


    attachSocketToPartner(userId, socket){
        if(!this.listPartnerSocket[userId]){
            this.listPartnerSocket[userId] = [];
        }
        this.listPartnerSocket[userId].push(socket);
        socket.userId = userId;
    }

    detachSocketFromPartner(userId, socket){
        if(!this.listPartnerSocket[userId]){
            return;
        }
        let index = this.listPartnerSocket[userId].indexOf(socket);
        if(index > 0){
            this.listPartnerSocket[userId].splice(index, 1);
        }
    }

    async getDemandInfo(demandId) {
        if (demandId.length <= 0){
            return null;
        }
        let demand = await Demand.findById(demandId);
        if(demand){
            let customerInfo = {};
            let partnerInfo = {};

            let canceledReason = '';
            let canceledBy = ''

            if(demand.status == DEMAND_STATUS.CANCELED){
                canceledReason = demand.canceledReason;
                if(demand.canceledBy){
                    let canceledUser = await User.findById(demand.canceledBy);
                    if(canceledUser) canceledBy = canceledUser.name;
                }
            }


            if (demand.customerId.length){
                let customer = await Customer.findOne({userId: demand.customerId});
                if(customer){
                    customerInfo.phone = customer.phone;
                    customerInfo.avatarUrl = customer.avatarUrl;
                }
                let userCustomer = await User.findById(demand.customerId);
                if (userCustomer){
                    customerInfo.name = userCustomer.name;
                    customerInfo.email = userCustomer.email;
                }
            }

            if (demand.partnerId.length){
                let partner = await Partner.findOne({userId: demand.partnerId});
                if(partner){
                    partnerInfo._id = partner._id;
                    partnerInfo.phone = partner.phone;
                    partnerInfo.avatarUrl = partner.avatarUrl;
                    partnerInfo.latitude = partner.latitude;
                    partnerInfo.longitude = partner.longitude;
                    partnerInfo.rating = partner.rating;
                    partnerInfo.nRating = partner.nRating;
                    partnerInfo.nHandling = partner.history.length

                }
                let userPartner = await User.findById(demand.partnerId);
                if (userPartner){
                        partnerInfo.name =userPartner.name;
                        partnerInfo.email = userPartner.email;
                    };
            }

            let billInfo = {};

            if (demand.billId.length){
                let bill = await Bill.findById(demand.billId);
                if(bill){
                    billInfo.items = bill.items;
                    billInfo.fee = bill.fee;
                    billInfo.createdDate = bill.createdDate;
                }
            }

            return {
                addressDetail: demand.addressDetail,
                problemDescription: demand.problemDescription,
                vehicleType: demand.vehicleType,
                status: demand.status,
                _id: demand._id,
                pickupLatitude: demand.pickupLatitude,
                pickupLongitude: demand.pickupLongitude,
                createdDate: demand.createdDate,
                completedDate: demand.completedDate,
                canceledReason: canceledReason,
                canceledBy: canceledBy,
                messages: demand.messages,
                customer: Object.keys(customerInfo).length === 0? null: customerInfo,
                partner: Object.keys(partnerInfo).length === 0? null: partnerInfo,
                bill: Object.keys(billInfo).length === 0? null: billInfo,
            }
        } else{
            return null;
        }
    }


    async getDemandHistory(listId){
        if (listId.length <= 0){
            return [];
        }
        let result = [];

        for (const key in listId) {
            if (listId.hasOwnProperty(key)) {

                const demandId = listId[key];

                if(demandId){
                    let demand = await this.getDemandInfo(demandId);
                    if(demand){
                        result.push(demand);
                    }
                 }
            }
        }
    
        return result;
    }

    sendToAllDevice(userId, eventName, data, except){
        for (const key in this.listPartnerSocket[userId]) {
            if (this.listPartnerSocket[userId].hasOwnProperty(key)) {
                const socket = this.listPartnerSocket[userId][key];
                if(except === socket) continue;
                socket.emit(eventName, data);
            }
        }
    }

    async verifyToken(token){
        if (!token){
            return null;
        }
        const payload = jwt.verify(token, secretKey);
        if(!payload || payload.role != ROLE.PARTNER){
            return null
        }

        let partner =  await Partner.findOne({userId: payload.id});
        if(!partner){
            partner = new Partner({userId: payload.id})
        }
        return partner;
    }
}
let instance;
function getInstance(){
    if(!instance){
        instance = new PartnerController();
    }
    return instance;
}
