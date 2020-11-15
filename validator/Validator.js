validator = require('validator');

function validateRegister (data){
  var result = [];
  try {
    if(!validator.isAlpha(data['name'])){
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
    result.push("Invalid req data: " + data)
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


module.exports = {
    validateRegister,
    validateLogin
}