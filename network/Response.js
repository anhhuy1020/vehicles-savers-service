const ERROR_CODE = require('../network/ErrorCode');

class Response{
    constructor(){
        this.errorCode = ERROR_CODE.SUCCESS;
        this.body = {};
    }
    error(errCode, errMessage){
        this.errorCode = errCode;
        this.body = {errorMessage: errMessage};
        return this;
    }
    json(data){
        this.body = data;
        return this;
    }
}

module.exports = Response;