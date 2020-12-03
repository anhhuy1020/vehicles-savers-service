const CustomerController = require('../controllers/CustomerController');
const PartnerController = require('../controllers/PartnerController');
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
                CustomerController.getInstance().login(socket, req)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.REGISTER, function(req){
            try {
                console.log("register: ", req);
                CustomerController.getInstance().register(socket, req)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.CREATE_DEMAND, function(req, token){
            try {
                CustomerController.getInstance().createDemand(socket, req, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.FETCH_CURRENT_DEMAND, function(token){
            try {
                CustomerController.getInstance().fetchCurrentDemand(socket, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.CANCEL_DEMAND, function(token){
            try {
                CustomerController.getInstance().cancelDemand(socket, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });
        socket.on(EVENT_NAME.PAY, function(token){
            try {
                console.log("pay!!");
                CustomerController.getInstance().pay(socket, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.CHAT, function(req, token){
            try {
                console.log("chat")
                CustomerController.getInstance().chat(socket, req, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });
        socket.on(EVENT_NAME.EVALUATE, function(req, token){
            try {
                CustomerController.getInstance().evaluate(socket, req, token);
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on("disconnect", function(){
            try {
                CustomerController.getInstance().detachSocketFromCustomer(socket['userId'], socket)
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
                PartnerController.getInstance().login(socket, req)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.FETCH_CURRENT_DEMAND, function(token){
            try {
                PartnerController.getInstance().fetchCurrentDemand(socket, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.FETCH_LIST_DEMAND, function(req, token){
            try {
                PartnerController.getInstance().fetchListDemand(socket, req, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.ACCEPT_DEMAND, function(req, token){
            try {
                PartnerController.getInstance().acceptDemand(socket, req, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.INVOICE, function(req, token){
            try {
                console.log("invoice")
                PartnerController.getInstance().invoice(socket, req, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on(EVENT_NAME.CHAT, function(req, token){
            try {
                console.log("chat")
                PartnerController.getInstance().chat(socket, req, token)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });
        socket.on("disconnect", function(){
            try {
                PartnerController.getInstance().detachSocketFromPartner(socket['userId'], socket.id)
                console.log("Partner disconnect!");
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        })
    });
    }
}

module.exports = ServerSocket;
