const customerService = require('../services/CustomerService');
const partnerService = require('../services/PartnerService');
const ERROR_CODE = require('../const/ErrorCode');
const EVENT_NAME = require('../const/EventName');
const Response = require('./Response');

class ServerSocket{
    constructor(httpServer){
    this.io = require("socket.io")(httpServer);

    var customersNamespace = this.io.of("/customers");
    var partnersNamespace = this.io.of("/partners");

    customersNamespace.on("connection", function(socket) {
        console.log("Customer connected...");

        socket.on(EVENT_NAME.LOGIN, function(req){
            try {
                console.log("login", req);
                customerService.login(socket, req)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.REGISTER, function(req){
            try {
                console.log("register: ", req);
                customerService.register(socket, req)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.CREATE_DEMAND, function(req, token){
            try {
                customerService.createDemand(socket, req, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.FETCH_CURRENT_DEMAND, function(token){
            try {
                customerService.fetchCurrentDemand(socket, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.CANCEL_DEMAND, function(req){
            try {
                console.log("login", req);
                customerService.cancelDemand(socket, req)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on("disconnect", function(){
            try {
                customerService.detachSocketFromCustomer(socket['userId'], socket)
                console.log("Client disconnect!");
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        })
    })

      partnersNamespace.on("connection", function(socket) {
        console.log("Partner connected...");

        socket.on(EVENT_NAME.LOGIN, function(req){
            try {
                partnerService.login(socket, req)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });
        socket.on(EVENT_NAME.FETCH_LIST_DEMAND, function(req, token){
            try {
                partnerService.fetchListDemand(socket, req, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on("disconnect", function(){
            try {
                partnerService.detachSocketFromPartner(socket['userId'], socket.id)
                console.log("Client disconnect!");
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        })
    });
    }
}

module.exports = ServerSocket;
