validator = require('validator');

function validateRegister (data){
  var result = [];
  try {
    if(validator.isAlpha(data['name'], ['vi-VN'])){
      result.push("Name is invalid!");
    }
    if(!validator.isMobilePhone(data['phone'])){
      result.push("Phone is invalid!");
    }
    if(!validator.isEmail(data['email'])){
      result.push("Email is invalid!");
    }
    if(!validator.matches(data['password'], /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/)){
      result.push("Password is invalid!");
    }
  } catch (e){
    result.push("Invalid req data: ", "\n", data, "\n,", e)
  }
  return result;
}

function validateLogin (data) {
  var result = [];
  try {
    if(!validator.isEmail(data['email'])){
      result.push("Email is invalid!");
    }
    if(!validator.matches(data['password'], /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/)){
      result.push("Password is invalid!");
    }
  } catch (e){
    result.push("Invalid req data: " + data);
  }
  return result;
}

function createDemand (data) {
  var result = [];
  try {
    if(isNaN(data['pickupLatitude'])){
      result.push("pickupLatitude is not number!");
    }
    if(isNaN(data['pickupLongitude'])){
      result.push("pickupLatitude is not number!");
    }
  } catch (e){
    console.log(e);
    result.push("Invalid req data: " + JSON.stringify(data));
  }
  return result;
}
function fetchListDemand (data) {
  var result = [];
  try {
    if(isNaN(data['latitude'])){
      result.push("latitude is not number!");
    }
    if(isNaN(data['longitude'])){
      result.push("longitude is not number!");
    }
  } catch (e){
    console.log(e);
    result.push("Invalid req data: " + JSON.stringify(data));
  }
  return result;
}


module.exports = {
    validateRegister,
    validateLogin,
    createDemand
}