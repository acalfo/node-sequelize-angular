var db = require('../server-files/db');
var q = require('q');			//https://github.com/kriskowal/q (pretty much the same as Angular's $q)
var crypto = require('crypto');

var methods = {

	hashPassword: function(password, salt){
        return crypto.pbkdf2Sync(password, new Buffer(salt, 'base64'), 10000, 64).toString('base64');
    },
	
	logOut: function(session){
		delete session.admin;
	},
	
	//session must be req.session from a route call
	isLoggedIn: function(session){
		if(typeof session.admin === 'undefined'){
			return false;
		}
		//this should never happen, but the id is so important that we'll check for it anyways
		else if(typeof session.admin.Admins_id !== 'number'){
			this.logOut(session);
			return false;
		}else{
			return true;
		}
	},
	
	//use this to define the password rules
	passwordError: function(password){
		if(password.length < 5){
			return 'Your Password must be at least 5 characters long.';
		}
		
		return false;
	},
	
	login: function(login_data){
		var deferred = q.defer()
			errors = [];
			
		//fetch the user record by email address
		db.fetchOne('select * from Admins where Admins_username = :Admins_username', {
			Admins_username: login_data.Admins_username
		}).then(function(user){
			if(!user){
				errors.push('The username you entered is incorrect. Please check the spelling and try again.');
			}
			else if(user.Admins_password !== methods.hashPassword(login_data.Admins_password, user.Admins_password_salt)){
				errors.push('The password you entered is incorrect. Please try again.');
			}
			
			return user;
		}).done(function(admin){
			if(errors.length){
				deferred.reject(errors);
			}else{
				//The admin entered the correct credentials!
				
				var admin = db.filterObject(admin, [
					'Admins_id',
					'Admins_username',
					'Admins_special'
				]);
				
				deferred.resolve(admin);
			}
		});
		
		return deferred.promise;
	}
}

module.exports = methods;