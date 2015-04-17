var db = require('./db');
var q = require('q');
var extend = require('extend');
var Utils = require('./utils');

var accountSid = 'AC3b9a9b1248b8dcb595e6132fce944143';
var authToken = '45e5ca1bfc4908e5e2c6ee3408220c2a';
var client = require('twilio')(accountSid, authToken);

var methods = {
	send: function(to, body){
		return this._send({
			to: to,
			body: body
		});
	},
	
	_send: function(_params){
		var deferred = q.defer(),
			errors = [];
		
		if(Utils.isEmpty(_params, 'body')){
			errors.push('texts.js: Missing "html"');
		}
		if(Utils.isEmpty(_params, 'to')){
			errors.push('texts.js: Missing "to"');
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		// https://mandrillapp.com/api/docs/messages.nodejs.html#method=send
		var twilioObject = extend(true, {
			from: '+16194304860'
		}, _params);

		//Record the email in the DB
		db.insert('Texts', {
			Texts_twilioObject: JSON.stringify(twilioObject),
			Texts_body: _params.body,
			Texts_to: _params.to,
			Texts_status: 'send attempted'
		}).then(function(text){
			client.messages.create(twilioObject, function(err, message){
				if(err){
					db.update('Texts', {
						Texts_twilioErrorReturned: JSON.stringify(err),
						Texts_status: 'failed to send'
					}, text.Texts_id).then(function(){
						var error = 'A Twilio error occurred: ' + err.message;
						console.log(error);
						deferred.reject(error);
					});
					
					return false;
				}
				
				db.update('Texts', {
					Texts_twilioObjectReturned: JSON.stringify(message)
					// Texts_status: to be updated using StatusCallback in the future
				}, text.Texts_id).then(function(){
					deferred.resolve(message);
				});
			});
		});
		
		return deferred.promise;
	}
}

module.exports = methods;