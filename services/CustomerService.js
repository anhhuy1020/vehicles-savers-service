const validator = require('../validator/Validator');
const Response = require('../network/Response');
const jwt = require("jsonwebtoken");
const config = require('../config.json');
const mode = config.mode;
const bcrypt = require('bcryptjs');
const db = require('../_helpers/db');
const EVENT_NAME = require('../const/EventName');
const ERROR_CODE = require('../const/ErrorCode');
const ROLE = require('../const/Role');
const User = db.User;
const DEMAND_STATUS = require('../const/DemandStatus');
const { sendToAllDevice } = require('./PartnerService');
const Demand = db.Demand;
const Customer = db.Customer;
const Partner = db.Partner;
const Feedback = db.Feedback;
const Bill = db.Bill;
const secretKey = config[mode].secret;
const PartnerService = require('./PartnerService');

class CustomerService {

    constructor(){
        this.listCustomer = {};
        this.listCustomerSocket = {};
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
            console.log("user info login", user);

            if (user && bcrypt.compareSync(req.password, user.hash)) {
                if(user.role == ROLE.CUSTOMER){
                    let customerInfo =  await Customer.findOne({userId: user._id});
                    if (!customerInfo){
                        customerInfo = new Customer({
                            userId: user._id,
                        });
                        customerInfo.save();
                    }
                    console.log("customer info login", customerInfo);
                    let history = await this.getDemandHistory(customerInfo.history);
                    let currentDemand = await this.getDemandInfo(customerInfo.currentDemand);

                    const token = jwt.sign({ id: user._id, role: user.role }, secretKey, { expiresIn: '7d' });
                    let res = {
                        customer: {
                            _id: user._id,
                            name: user.name,
                            email: user.email,
                            address: customerInfo.address,
                            phone: customerInfo.phone,
                            avatarUrl: customerInfo.avatarUrl
                        },
                        history: history,
                        currentDemand: currentDemand,
                        token: token,
                    }
                    this.attachSocketToCustomer(user._id, socket);
                    socket.emit(EVENT_NAME.LOGIN, new Response().json(res));
                } else{
                    socket.emit(EVENT_NAME.LOGIN, new Response().error(ERROR_CODE.FAIL, "Invalid access!"));
                }
            } else{
                socket.emit(EVENT_NAME.LOGIN, new Response().error(ERROR_CODE.FAIL, "Email or password is incorrect!"));
            }
        } catch(e){
            console.log("login exception ", e);
            socket.emit(EVENT_NAME.LOGIN, new Response().error(ERROR_CODE.FAIL, e));
        }
    }
    async register(socket, req) {
        try{
            const errors = validator.validateRegister(req);
            console.log("register errors: ", errors);

            if (errors.length > 0) {
                socket.emit(EVENT_NAME.REGISTER, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }

            let user = await User.findOne({email: req.email});
            console.log("user,", user)
            if(user){
                socket.emit(EVENT_NAME.REGISTER, new Response().error(ERROR_CODE.FAIL, 'Email "' + req.email + '" is already taken'));
                return;
            }
            user = new User({...req, role:ROLE.CUSTOMER});
            // hash password
            if (req.password) {
                user.hash = bcrypt.hashSync(req.password, 10);
            }

            // save user
            let customerInfo =  await Customer.findOne({userId:user._id});
            if (!customerInfo){
                customerInfo = new Customer({
                    userId: user._id,
                    address: req.address,
                    phone: req.phone,
                });
            }
            await user.save();
            await customerInfo.save();
            let currentDemand;
            if(customerInfo.currentDemand != ""){
                await Demand.findById(customerInfo.currentDemand);
            }
            console.log("customerInfo", customerInfo);
            console.log("currentDemand", currentDemand)
            const token = jwt.sign({ id: user._id, role: user.role }, secretKey, { expiresIn: '7d' });

            this.attachSocketToCustomer(user._id, socket);
            let res = {
                customer: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    currentDemand: currentDemand,
                    history: customerInfo.history,
                    address: customerInfo.address,
                    phone: customerInfo.phone,
                    avatarUrl: customerInfo.avatarUrl
                },
                token: token,
            }
            socket.emit(EVENT_NAME.REGISTER, new Response().json(res));
        } catch(e){
            socket.emit(EVENT_NAME.LOGIN, new Response().error(ERROR_CODE.FAIL, e));
        }
    }

    async createDemand(socket, req, token) {
        try {
            let customer =  await this.verifyToken(token);

            if(!customer){
                socket.emit(EVENT_NAME.CREATE_DEMAND, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            const errors = validator.createDemand(req);

            if (errors.length > 0) {
                socket.emit(EVENT_NAME.CREATE_DEMAND, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }

            let demand;
            if(customer.currentDemand != ""){
                demand = await Demand.findById(customer.currentDemand);
                if(demand && demand.status != DEMAND_STATUS.SEARCHING_PARTNER){
                    socket.emit(EVENT_NAME.CREATE_DEMAND, new Response().error(ERROR_CODE.FAIL, "Already had a demand!"));
                    return;
                }
            }

            if(!demand){
                demand = await DemandService.create({...req, customerId: customer.userId});
                customer.currentDemand = demand._id;
                await customer.save();
            } else{
                Object.assign(demand, req);
                await demand.save();
            }
            console.log("demand", demand);
            socket.emit(EVENT_NAME.CREATE_DEMAND, new Response());
            this.sendToAllDevice(customer.userId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(demand));

        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.CREATE_DEMAND, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }

    async fetchCurrentDemand(socket, token) {
        try {
            let customer =  await this.verifyToken(token);
            console.log("fetchCurrentDemand customer", customer);

            if(!customer){
                socket.emit(EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            if(customer.currentDemand == ""){
                return;
            }

            let demand = await this.getDemandInfo(customer.currentDemand);

            console.log("fetchCurrentDemand", demand);
            socket.emit(EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(demand));

        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }

    async pay(socket, token) {
        try {
            let customer =  await this.verifyToken(token);
            console.log("fetchCurrentDemand customer", customer);

            if(!customer){
                socket.emit(EVENT_NAME.PAY, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            if(customer.currentDemand == ""){
                socket.emit(EVENT_NAME.PAY, new Response().error(ERROR_CODE.FAIL, "Haven't had demand yet"));
                return;
            }

            let demand = await Demand.findById(customer.currentDemand);
            if(demand.status != DEMAND_STATUS.PAYING){
                socket.emit(EVENT_NAME.PAY, new Response().error(ERROR_CODE.FAIL, "Not paying phase"));
                return;
            }
            
            let partner = await Partner.findOne({userId: demand.partnerId});
            if(partner){
                partner.currentDemand = "";
                if(!partner.history){
                    partner.history = [];
                }
                partner.history.push(demand._id)
                partner.save();
            }
            customer.currentDemand = "";
            customer.history.push(demand._id);
            customer.save();

            demand.status == DEMAND_STATUS.COMPLETED;
            demand.completedDate = Date().now();
            demand.save();

            let res = await this.getDemandInfo(demand._id);

            console.log("completed", res);
            this.sendToAllDevice(demand.customerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
            PartnerService.sendToAllDevice(demand.partnerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.PAY, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }

    attachSocketToCustomer(userId, socket){
        if(!this.listCustomerSocket[userId]){
            this.listCustomerSocket[userId] = [];
        }
        this.listCustomerSocket[userId].push(socket);
    }
    async getDemandInfo(demandId) {
        if (demandId.length <= 0){
            return null;
        }
        let demand = await Demand.findById(demandId);
        if(demand){
            let customerInfo = {};
            let partnerInfo = {};

            if (demand.customerId.length > 0){
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

            if (demand.partnerId.length > 0){
                let partner = await Partner.findOne({userId: demand.partnerId});
                if(partner){
                    partnerInfo._id = partner._id;
                    partnerInfo.phone = partner.phone;
                    partnerInfo.avatarUrl = partner.avatarUrl;
                    partnerInfo.latitude = partner.latitude;
                    partnerInfo.longitude = partner.longitude;
                    partnerInfo.rating = partner.rating;
                    partnerInfo.nRating = partner.nRating;
                }
                let userPartner = await User.findById(partner.userId);
                if (userPartner){
                        partnerInfo.name =userPartner.name;
                        partnerInfo.email = userPartner.email;
                };
            }


            let billInfo = {};

            if (demand.billId.length > 0){
                let bill = await Bill.findById(demand.billId);
                if(bill){
                    billInfo.items = bill.items;
                    billInfo.fee = bill.fee;
                    billInfo.createdDate = bill.createdDate;
                }
            }

            let feedbackInfo = {};

            if (demand.feedbackId.length > 0){
                let feedback = await Feedback.findById(demand.feedbackId);
                if(feedback){
                    feedbackInfo.rating = feedback.rating;
                    feedbackInfo.comment = feedback.comment;
                    feedbackInfo.images = feedback.images;
                    feedbackInfo.createdDate = feedback.createdDate;
                }
            }

            return {
                addressDetail: demand.addressDetail,
                problemDescription: demand.problemDescription,
                vehicleType: demand.vehicleType,
                status: demand.status,
                _id: demand._id,
                pickupLongitude: demand.pickupLatitude,
                pickupLatitude: demand.pickupLongitude,
                customer: Object.keys(customerInfo).length === 0? null: customerInfo,
                partner: Object.keys(partnerInfo).length === 0? null: partnerInfo,
                bill: Object.keys(billInfo).length === 0? null: billInfo,
                feedback: Object.keys(feedbackInfo).length === 0? null: feedbackInfo,
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
                if(demandId.length > 0){
                    let demand = await this.getDemandInfo(demandId);
                    if(demand){
                        result.push(demand);
                    }
                 }
            }
        }
        return result;
    }

    detachSocketFromCustomer(userId, socket){
        if(!this.listCustomerSocket[userId]){
            return;
        }
        let index = this.listCustomerSocket[userId].indexOf(socket);
        if(index > 0){
            this.listCustomerSocket.splice(index, 1);
        }
    }

    sendToAllDevice(userId, eventName, data){
        for (const key in this.listCustomerSocket[userId]) {
            if (this.listCustomerSocket[userId].hasOwnProperty(key)) {
                const socket = this.listCustomerSocket[userId][key];
                socket.emit(eventName, data);
            }
        }
    }

    async verifyToken(token){
        if (!token){
            return null;
        }
        const payload = jwt.verify(token, secretKey);
        if(!payload || payload.role != ROLE.CUSTOMER){
            return null
        }

        let customer = await Customer.findOne({userId: payload.id});
        return customer;
    }
}

let instance = new CustomerService();

module.exports = instance