const { isEmpty } = require('underscore');
const ROLE = require('../const/Role');

validator = require('validator');

function validateRegister (data){
  let result = [];
  try {
    if(!data['name']){
      result.push("Name is required!");
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
  let result = [];
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
  let result = [];
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
  let result = [];
  try {
    if(isNaN(data['latitude'])){
      result.push("latitude is not number!");
    }
    if(isNaN(data['longitude'])){
      result.push("longitude is not number!");
    }
    if(isNaN(data['range'])){
      result.push("Range is not number!");
    }
    if (data['range'] < 5){
      result.push("Range must > 5km!");
    }
  } catch (e){
    console.log(e);
    result.push("Invalid req data: " + JSON.stringify(data));
  }
  return result;
}

function updateLocation (data) {
  let result = [];
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

function acceptDemand (data) {
  let result = [];
  try {
    if(validator.isEmpty(data['demandId'])){
      result.push("demandId is empty!");
    }

  } catch (e){
    console.log(e);
    result.push("Invalid req data: " + JSON.stringify(data));
  }
  return result;
}

function invoice (data) {
  let result = [];
  try {
    if(!Array.isArray(data) && data.length <=0){
      result.push("items is empty!");
    }

    let totalCost = 0;

    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const element = data[key];
        let cost = element['cost'];
        if(!isNaN(cost)){
          totalCost += cost;
        }
      }
    }
    if(isNaN(totalCost) || totalCost <= 0){
      result.push("Total cost is <= 0!");
    }

  } catch (e){
    console.log(e);
    result.push("Invalid req data: " + JSON.stringify(data));
  }
  return result;
}
function evaluate (data) {
  let result = [];
  try {
    if(!data['demandId']){
      result.push("demandId is null!");
    }
  
    if(isNaN(data['rating'])){
      result.push("Rating is not a number!");
    }

    if(data['rating'] < 0 || data['rating'] > 5){
      result.push("Rating must be in 0 -> 5!");
    }

  } catch (e){
    console.log(e);
    result.push("Invalid req data: " + JSON.stringify(data));
  }
  return result;
}
function cancelDemand (data) {
  let result = [];
  try {
    if(!data || !data['reason']){
      result.push("There must be a reason to cancel!");
    }

  } catch (e){
    console.log(e);
    result.push("Invalid req data: " + JSON.stringify(data));
  }
  return result;
}

function updateProfile (data){
  let result = [];
  try {
    if(data['name'] && validator.isAlpha(data['name'], ['vi-VN'])){
      result.push("Name is invalid!");
    }
    if(data['phone'] && !validator.isMobilePhone(data['phone'])){
      result.push("Phone is invalid!");
    }
    if(data['email'] && !validator.isEmail(data['email'])){
      result.push("Email is invalid!");
    }
  } catch (e){
    result.push("Invalid req data: ", "\n", data, "\n,", e)
  }
  return result;
}

function validateAdminCreateUser (data){
  let result = [];
  try {
    if(!data['name']){
      result.push("Name is required!");
    }
    if(!data.hasOwnProperty('role')){
      result.push("Role is required!");
    }
    if(!Number.isInteger(data['role']) && data['role'] <  ROLE.ADMIN || data['role'] > ROLE.CUSTOMER){
      result.push("Role is invalid!");
    }
    if(data['role'] == ROLE.ADMIN && !validator.isMobilePhone(data['phone'])){
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



module.exports = {
    validateRegister,
    validateLogin,
    createDemand,
    fetchListDemand,
    updateLocation,
    acceptDemand,
    invoice,
    evaluate,
    cancelDemand,
    updateProfile,
    validateAdminCreateUser
}