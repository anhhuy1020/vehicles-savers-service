require('rootpath')(); 
const express = require('express');
const app = express();
const config = require('config.json');
const mode = config.mode;
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('./_helpers/jwt');
const errorHandler = require('./_helpers/error-handler');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// use JWT auth to secure the api
app.use(jwt());

// controllers
const loginController = require('./controllers/LoginController');
const customerController = require('./controllers/CustomerController');

// api routes
app.use("/login", loginController);
app.use("/customers", customerController);

// global error handler
app.use(errorHandler);

// start server
const port = config[mode].PORT;
const server = app.listen(port, function () {
    console.log('Server listening on port ' + port);
});
