require('rootpath')();
global._ = require('underscore');
const express = require('express');
const app = express();
const config = require('../src/config/config.json');
const mode = config.mode;
const cors = require('cors');
const bodyParser = require('body-parser');
const errorHandler = require('./_helpers/error-handler');
const ServerSocket = require('./network/ServerSocket');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// admin service
const adminController = require('./controllers/AdminController');

// api routes
app.use("/admin", adminController);

app.get("/", function(req, res, next){
    console.log("connected");
    res.status(200).json({message:"Ok"});
})

// global error handler
app.use(errorHandler);

// start server
const port = process.env.PORT || config[mode].PORT;
const httpServer = app.listen(port, function () {
    console.log('Server listening on port ' + port);
});

global.serverSocket = new ServerSocket(httpServer);
