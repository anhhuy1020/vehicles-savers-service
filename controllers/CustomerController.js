const express = require('express');
const validator = require('../validator/Validator');
const Response = require('../network/Response');
const router = express.Router();
const userService = require('../services/UserService');
const EVENT_NAME = require('../network/EventName');
const ERROR_CODE = require('../network/ErrorCode');
const ROLE = userService.ROLE;

class CustomerController {

    constructor(serverSocket){
        this.serverSocket = serverSocket;
        this.listCustomer = {};
    }

    handleCustomerRequest(eventName, socket, req){
        switch(eventName){
            case EventName.LOGIN:
                this.login(socket, req);
        }
    }

    login(socket, req) {
        const errors = validator.validateLogin(req);
        console.log("login", req, errors);

        if (errors.length > 0) {
            socket.emit(EventName.LOGIN, new Response().error(ERROR_CODE.FAIL, errors));
            return;
        }

        userService.authenticate(req)
            .then(function (user) {
                if(user) {
                    if(user.role == ROLE.CUSTOMER){
                        this.attachSocketToCustomer(user._id, socket);
                        socket.emit(EVENT_NAME.LOGIN, new Response().json(user));
                    } else{
                        socket.emit(EVENT_NAME.LOGIN, new Response().error(ERROR_CODE.FAIL, "Invalid access!"));
                    }
                } else{
                    socket.emit(EVENT_NAME.LOGIN, new Response().error(ERROR_CODE.FAIL, "Email or password is incorrect!"));
                }
            }.bind(this))
            .catch(function(err){
                 socket.emit(EVENT_NAME.LOGIN, new Response().error(ERROR_CODE.FAIL, err));
            });
    }

    register(socket, req) {
        console.log("register", req);
        const errors = validator.register(req);

        if (errors.length > 0) {
            socket.emit(EVENT_NAME.REGISTER, new Response().error(ERROR_CODE.FAIL, errors));
            return;
        }

        req.role = ROLE.CUSTOMER;
        userService.create(req)
            .then(function(user) {
                this.attachSocketToCustomer(user._id, socket);
                socket.emit(EVENT_NAME.REGISTER, new Response().json(user));
            })
            .catch(err => socket.emit(EVENT_NAME.REGISTER, new Response().error(ERROR_CODE.FAIL, err)));
    }

    attachSocketToCustomer(userId, socket){
        socket.userId = userId;
        if(!this.listCustomer[userId]){
            this.listCustomer[userId] = [];
        }
        this.listCustomer[userId].push(socket.id);
    }

    detachSocketFromCustomer(userId, socketId){
        if(!socketId){
            this.listCustomer[userId] = [];
        } else if(_.isArray(this.listCustomer[userId])){
            let index = this.listCustomer[userId].indexOf(socketId);
            if(index >= 0){
                this.listCustomer[userId].splice(index, 1);
            }
        }
    }

}

module.exports = CustomerController