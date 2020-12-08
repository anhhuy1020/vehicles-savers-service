const validator = require('../_helpers/Validator');
const Response = require('../network/Response');
const jwt = require("jsonwebtoken");
const config = require('../config/config.json');
const mode = config.mode;
const bcrypt = require('bcryptjs');
const db = require('../_helpers/db');
const EVENT_NAME = require('../const/EventName');
const ERROR_CODE = require('../const/ErrorCode');
const ROLE = require('../const/Role');
const User = db.User;
const DEMAND_STATUS = require('../const/DemandStatus');
const Demand = db.Demand;
const Customer = db.Customer;
const Partner = db.Partner;
const Feedback = db.Feedback;
const Bill = db.Bill;
const secretKey = config[mode].secret;
const avatarSaver = require('../_helpers/avatarSaver');


module.exports = {getInstance}
const PartnerService = require('./PartnerController');

class CustomerController {

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

            if (user && bcrypt.compareSync(req.password, user.hash)) {
                if(user.role == ROLE.CUSTOMER){
                    let customerInfo =  await Customer.findOne({userId: user._id});
                    if (!customerInfo){
                        customerInfo = new Customer({
                            userId: user._id,
                        });
                        customerInfo.save();
                    }
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

            const token = jwt.sign({ id: user._id, role: user.role }, secretKey, { expiresIn: '7d' });

            this.attachSocketToCustomer(user._id, socket);
            let res = {
                customer: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    history: customerInfo.history,
                    address: customerInfo.address,
                    phone: customerInfo.phone,
                    avatarUrl: customerInfo.avatarUrl
                },
                token: token,
            }
            console.log("register res = ", res);
            socket.emit(EVENT_NAME.REGISTER, new Response().json(res));
        } catch(e){
            socket.emit(EVENT_NAME.LOGIN, new Response().error(ERROR_CODE.FAIL, e));
        }
    }

    async updateProfile(socket, req, token) {
        try {
            let customer =  await this.verifyToken(token);

            if(!customer){
                socket.emit(EVENT_NAME.UPDATE_PROFILE, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            const errors = validator.updateProfile(req);

            if (errors.length > 0) {
                console.log("upload profile errors", errors, req);
                socket.emit(EVENT_NAME.UPDATE_PROFILE, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }

            let user = await User.findById(customer.userId);

            if(!user){
                console.log("upload profile user not found", customer.userId)
                socket.emit(EVENT_NAME.UPDATE_PROFILE, new Response().error(ERROR_CODE.FAIL, 'user not found!'));
                return;
            }

            if(req['name']) user.name = req['name'];
            if(req['email']) user.email = req['email'];
            if(req['phone']) customer.phone = req['phone'];
            if(req['address']) customer.address = req['address'];
            if(req['avatarUrl']){
                try{
                    let filename = await avatarSaver.saveAvatar(req.avatarUrl);
                    if(filename){
                        customer.avatarUrl = config[mode].HOST + '/avatars/' + filename;
                        console.log('new avatarUrl: ', (config[mode].HOST + '/avatars/' + filename));
                    }
                } catch (e){
                    console.log("Save avatar exception: ", e);
                }
            }

            await customer.save();
            await user.save();

            let res = {
                _id: user._id,
                name: user.name,
                email: user.email,
                address: customer.address,
                phone: customer.phone,
                avatarUrl: customer.avatarUrl
            }

            console.log("update profile success", res);

            this.sendToAllDevice(customer.userId, EVENT_NAME.UPDATE_PROFILE, new Response().json(res));

        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.UPDATE_PROFILE, new Response().error(ERROR_CODE.FAIL, "Fail"));
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
            if(customer.currentDemand){
                demand = await Demand.findById(customer.currentDemand);
                if(demand && demand.status != DEMAND_STATUS.SEARCHING_PARTNER){
                    socket.emit(EVENT_NAME.CREATE_DEMAND, new Response().error(ERROR_CODE.FAIL, "Already had a demand!"));
                    return;
                }
            }

            if(!demand){
                demand = new Demand({...req, customerId: customer.userId});
                await demand.save();
                customer.currentDemand = demand._id;
                await customer.save();
            } else{
                Object.assign(demand, req);
                await demand.save();
            }
            let res = await this.getDemandInfo(demand._id);
            console.log("createDemand: ", res);
            socket.emit(EVENT_NAME.CREATE_DEMAND, new Response());
            this.sendToAllDevice(customer.userId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));

        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.CREATE_DEMAND, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }


    async cancelDemand(socket, req, token) {
        try {
            let customer =  await this.verifyToken(token);

            if(!customer){
                socket.emit(EVENT_NAME.CANCEL_DEMAND, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            const errors = validator.cancelDemand(req);

            if (errors.length > 0) {
                socket.emit(EVENT_NAME.CANCEL_DEMAND, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }

            let demand;
            if(customer.currentDemand){
                demand = await Demand.findById(customer.currentDemand);
            }
            if(!demand){
                console.log("cancelDemand demand is null: ");
                socket.emit(EVENT_NAME.CANCEL_DEMAND, new Response().error(ERROR_CODE.FAIL, "You don't have any demand to cancel!"));
                return;
            }
            if(demand.status != DEMAND_STATUS.SEARCHING_PARTNER){
                console.log("cancelDemand demand.status: ", demand.status);
                socket.emit(EVENT_NAME.CANCEL_DEMAND, new Response().error(ERROR_CODE.FAIL, "You cannot cancel this demand!"));
                return;
            }

            demand.status = DEMAND_STATUS.CANCELED;
            demand.canceledReason = req['reason'];
            demand.canceledBy = customer.userId;
            customer.history.push(demand._id);
            customer.currentDemand = "";
            await demand.save();
            await customer.save();

            let res = await this.getDemandInfo(demand._id);
            console.log("cancelDemand: ", res);
            this.sendToAllDevice(customer.userId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));

        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.CANCEL_DEMAND, new Response().error(ERROR_CODE.FAIL, "Fail"));
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

    async pay(socket, token) {
        try {
            let customer =  await this.verifyToken(token);
            console.log("pay customer", customer);

            if(!customer){
                socket.emit(EVENT_NAME.PAY, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            if(customer.currentDemand == ""){
                socket.emit(EVENT_NAME.PAY, new Response().error(ERROR_CODE.FAIL, "Haven't had demand yet"));
                return;
            }

            let demand = await Demand.findById(customer.currentDemand);
            if(!demand){
                socket.emit(EVENT_NAME.PAY, new Response().error(ERROR_CODE.FAIL, "Demand not found"));
                return;
            }
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
            }
            customer.currentDemand = "";
            customer.history.push(demand._id);

            demand.status = DEMAND_STATUS.COMPLETED;
            demand.completedDate = Date.now();

            partner && await partner.save();
            await customer.save();
            await demand.save();

            let res = await this.getDemandInfo(demand._id);

            console.log("completed", res);
            this.sendToAllDevice(demand.customerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
            PartnerService.getInstance().sendToAllDevice(demand.partnerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.PAY, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }

    async chat(socket, req, token) {
        try {
            let customer =  await this.verifyToken(token);
            console.log("CHAT", customer);

            if(!customer){
                socket.emit(EVENT_NAME.CHAT, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            if(customer.currentDemand == ""){
                socket.emit(EVENT_NAME.CHAT, new Response().error(ERROR_CODE.FAIL, "Haven't had demand yet"));
                return;
            }

            let demand = await Demand.findById(customer.currentDemand);
            if(!demand){
                socket.emit(EVENT_NAME.CHAT, new Response().error(ERROR_CODE.FAIL, "Demand not found"));
                return;
            }
            if(demand.status != DEMAND_STATUS.HANDLING){
                socket.emit(EVENT_NAME.PAY, new Response().error(ERROR_CODE.FAIL, "Not handling phase"));
                return;
            }

            if (!demand.messages){
                demand.messages = [];
            }

            demand.messages.push({userId: customer.userId, content: req, time: Date.now()})
            await demand.save();

            let res = await this.getDemandInfo(demand._id);

            console.log("chat", res);
            this.sendToAllDevice(demand.customerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
            PartnerService.getInstance().sendToAllDevice(demand.partnerId, EVENT_NAME.FETCH_CURRENT_DEMAND, new Response().json(res));
        } catch(e){
            console.log("CHAT exception: ", e);
            socket.emit(EVENT_NAME.CHAT, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }

    async evaluate(socket,  req, token) {
        try {
            let customer =  await this.verifyToken(token);
            console.log("evaluate",req.demandId);

            if(!customer){
                socket.emit(EVENT_NAME.EVALUATE, new Response().error(ERROR_CODE.FAIL, "Invalid access"));
                return;
            }

            const errors = validator.evaluate(req);

            if (errors.length > 0) {
                console.log("evaluate errors", errors);
                socket.emit(EVENT_NAME.EVALUATE, new Response().error(ERROR_CODE.FAIL, errors));
                return;
            }

            let demand;
            if(req.demandId){
                demand = await Demand.findById(req.demandId);
            }
            if(!demand){
                socket.emit(EVENT_NAME.EVALUATE, new Response().error(ERROR_CODE.FAIL, "Demand not found"));
                return;
            }

            if(demand.customerId != customer.userId){
                socket.emit(EVENT_NAME.EVALUATE, new Response().error(ERROR_CODE.FAIL, "Not your demand"));
                return;
            }
            if(demand.status != DEMAND_STATUS.COMPLETED){
                socket.emit(EVENT_NAME.EVALUATE, new Response().error(ERROR_CODE.FAIL, "Demand hasn't been completed yet"));
                return;
            }

            if (demand.feedbackId){
                socket.emit(EVENT_NAME.EVALUATE, new Response().error(ERROR_CODE.FAIL, "Demand has already been evaluated"));
                return;
            }

            let partnerInfo = await Partner.findOne({userId: demand.partnerId});
            if(partnerInfo){
                partnerInfo.rating = (partnerInfo.rating * partnerInfo.nRating + req.rating)/ (partnerInfo.nRating +1);
                partnerInfo.nRating++;
                await partnerInfo.save();
            }

            let feedback = new Feedback(req);
            await feedback.save();
            demand.feedbackId = feedback._id;
            await demand.save();

            let res = feedback;

            console.log("evaluate", res);
            this.sendToAllDevice(demand.customerId, EVENT_NAME.EVALUATE, new Response().json(res));
        } catch(e){
            console.log("Evaluate exception: ", e);
            socket.emit(EVENT_NAME.EVALUATE, new Response().error(ERROR_CODE.FAIL, "Fail"));
        }
    }

    logout(socket){
        if(socket && socket.userId && this.listCustomerSocket[socket.userId]){
            let index = this.listCustomerSocket[socket.userId].indexOf(socket);
            if(index >= 0){
                this.listCustomerSocket[socket.userId].splice(index, 1);
            }
        }
    }


    attachSocketToCustomer(userId, socket){
        if(!this.listCustomerSocket[userId]){
            this.listCustomerSocket[userId] = [];
        }
        this.listCustomerSocket[userId].push(socket);
        socket.userId = userId;
    }

    async getDemandInfo(demandId) {
        if (!demandId){
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

            if (demand.customerId){
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

            if (demand.partnerId){
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

                let userPartner = await User.findById(partner.userId);
                if (userPartner){
                        partnerInfo.name =userPartner.name;
                        partnerInfo.email = userPartner.email;
                        partnerInfo.createdDate = userPartner.createdDate;
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

            if (demand.feedbackId){
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
                pickupLatitude: demand.pickupLatitude,
                pickupLongitude: demand.pickupLongitude,
                messages: demand.messages,
                createdDate: demand.createdDate,
                completedDate: demand.completedDate,
                canceledReason: canceledReason,
                canceledBy: canceledBy,
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

    detachSocketFromCustomer(userId, socket){
        if(!this.listCustomerSocket[userId]){
            return;
        }
        let index = this.listCustomerSocket[userId].indexOf(socket);
        if(index > 0){
            this.listCustomerSocket.splice(index, 1);
        }
        socket.userId = userId;
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
        if(!customer){
            customer = new Customer({userId: payload.id})
        }
        return customer;
    }
}

let instance;

function getInstance(){
    if(!instance){
        instance = new CustomerController();
    }
    return instance;
}
