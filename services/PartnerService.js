const express = require('express');
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
const Partner = db.Partner;
const User = db.User;
const Demand = db.Demand;
const Customer = db.Customer;

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
                    let currentDemand;
                    if(partnerInfo.currentDemand != ""){
                        await Demand.findById(partnerInfo.currentDemand);
                    }
                    console.log("partner info login", partnerInfo);
                    const token = jwt.sign({ id: user._id, role: user.role }, secretKey, { expiresIn: '7d' });
                    let res = {
                        partner: {
                            id: user._id,
                            name: user.name,
                            email: user.email,
                            currentDemand: currentDemand,
                            history: partnerInfo.history,
                            address: partnerInfo.address,
                            phone: partnerInfo.phone
                        },
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

            let listDemand = Demand.find({status: DEMAND_STATUS.SEARCHING_PARTNER});
            for(i in listDemand){
                let demand = listDemand[i];
                if(demand.customerId != ""){
                    let customer = await Customer.findOnce({userId: demand.customerId});
                    let user = await User.findById(demand.customerId);
                    demand.customer = {
                        name: user.name,
                        email: user.email,
                        phone: customer.phone,
                    }
                }
            }

            console.log("listDemand", listDemand);
            socket.emit(EVENT_NAME.FETCH_LIST_DEMAND, new Response().json(listDemand));

        } catch(e){
            console.log("createDemand: ", e);
            socket.emit(EVENT_NAME.FETCH_LIST_DEMAND, new Response().error(ERROR_CODE.FAIL, "Fail"));
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

    sendToAllDevice(userId, eventName, data){
        for (const key in this.listPartnerSocket[userId]) {
            if (this.listPartnerSocket[userId].hasOwnProperty(key)) {
                const socket = this.listPartnerSocket[userId][key];
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
let instance = new PartnerService();

module.exports = instance