const CustomerController = require('../controllers/CustomerController');
const ERROR_CODE = require('./ErrorCode');
const EVENT_NAME = require('./EventName');
const Response = require('./Response');

class ServerSocket{
    constructor(httpServer){
    this.io = require("socket.io")(httpServer);

    var userNamespace = this.io.of("/customers");

    var userController = new CustomerController(this);
    this.userController = userController;

    userNamespace.on("connection", function(socket) {
        console.log("Customer connected...");

        socket.on(EVENT_NAME.LOGIN, function(req){
            try {
                console.log("login", req);
                userController.login(socket, req)
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        });

        socket.on("disconnect", function(){
            try {
                userController.detachSocketFromCustomer(socket['userId'], socket.id)
                console.log("Client disconnect!");
            } catch(e) {
                console.log("Exception while handling " + e);
            }
        })
      }
    );
    }
}

module.exports = ServerSocket;
