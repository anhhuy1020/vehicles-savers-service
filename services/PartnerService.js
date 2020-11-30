
const validator = require('../validator/Validator');
const Response = require('../network/Response');
const jwt = require("jsonwebtoken");
const EVENT_NAME = require('../const/EventName');
const ERROR_CODE = require('../const/ErrorCode');
const ROLE = require('../const/Role');
const config = require('../config.json');
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


module.exports = {getInstance}
const CustomerService = require('./CustomerService.js');
class PartnerService {

    constructor(serverSocket){
        this.listPartner = {};
        this.listPartnerSocket = {};
    }

    async login(socket, req) {
        try{
            const errors = validator.validateLogin(req);
            console.log("login", req, errors);

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
                    console.log("partner info login", partnerInfo);

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

    async fetchCurrentDemand(socket, token) {
        try {
            let partner =  await this.verifyToken(token);
            console.log("fetchCurrentDemand partner", partner);

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
            console.log("fetchListDemand", req, token);
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
                console.log("err= ", err);
                for(let i in docs){
                    let demand = docs[i];
                    let customerInfo;
                    if(demand.customerId != ""){
                        let customer = await Customer.findOne({userId: demand.customerId});
                        let user = await User.findById(demand.customerId);
                        console.log("customer = ", customer);
                        console.log("user = ", user);
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

                console.log("listDemand ===== ", listDemand);
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
            console.log("acceptDemand 3", req, token);

            const errors = validator.acceptDemand(req);

            if (errors.length > 0) {
                socket.emit(EVENT_NAME.ACCEPT_DEMAND, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }
            console.log("acceptDemand", req, token);

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

            console.log("accept : ", partner);
            console.log("accept 2 : ", demand);

            console.log("acceptDemand : ", res);


            socket.emit(EVENT_NAME.ACCEPT_DEMAND, new Response().json(res));
            this.sendToAllDevice(partner.userId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res), socket);
            CustomerService.getInstance().sendToAllDevice(demand.customerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));

        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.ACCEPT_DEMAND, new Response().error(ERROR_CODE.FAIL, "Fail"));
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
            console.log("bil bil", bill);
            demand.billId = bill._id;
            await demand.save();
            await bill.save();

            let res = await this.getDemandInfo(demand._id);

            console.log("invoice : ", bill);
            console.log("invoice 2 : ", demand);

            console.log("invoice : ", res);

            socket.emit(EVENT_NAME.INVOICE, new Response());
            this.sendToAllDevice(partner.userId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
            CustomerService.getInstance().sendToAllDevice(demand.customerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));

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
            CustomerService.getInstance().sendToAllDevice(demand.customerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
        } catch(e){
            console.log("chat: ", e);
            socket.emit(EVENT_NAME.CHAT, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }


    attachSocketToPartner(userId, socket){
        if(!this.listPartnerSocket[userId]){
            this.listPartnerSocket[userId] = [];
        }
        this.listPartnerSocket[userId].push(socket);
    }

    detachSocketFromPartner(userId, socket){
        if(!this.listPartnerSocket[userId]){
            return;
        }
        let index = this.listPartnerSocket[userId].indexOf(socket);
        if(index > 0){
            this.listPartnerSocket.splice(index, 1);
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
                console.log("bill: ", bill);
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
                console.log("key", key, demandId);

                if(demandId){
                    let demand = await this.getDemandInfo(demandId);
                    console.log("demand", demand, demandId);

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

        return await Partner.findOne({userId: payload.id});
    }
}
let instance;
function getInstance(){
    if(!instance){
        instance = new PartnerService();
    }
    return instance;
}
