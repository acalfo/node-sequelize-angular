var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill('gvNEWBLoZNYLqTIFUCbmSQ');
var db = require('./db');
var q = require('q');
var fs = require('fs');
var extend = require('extend');
var Utils = require('./utils');
var Handlebars = require('handlebars');

var partialsDeferred = q.defer();

function registerPartial(key, partial){
		var deferred = q.defer();

		fs.readFile(partial, {encoding: 'utf-8'}, function(err, source){
			if(!err){
				Handlebars.registerPartial(key, source);
				//console.log('partial registered: ' + key);
				deferred.resolve();
			}else{
				deferred.reject(err);
			}
		});
//test
		return deferred.promise;
	}

function registerAllPartials(){
	var partials = {
		'header': __dirname + '/../emails/partials/header.html',
		'footer': __dirname + '/../emails/partials/footer.html'
	};
	
	var partialPromises = [];

	for(var key in partials){
		partialPromises.push(registerPartial(key, partials[key]));
	};

	q.all(partialPromises).then(function(){
		partialsDeferred.resolve();
	}, function(error){
		console.log('Error loading email partials: ', error);
	});
}

var methods = {
	_init: function(){
		registerAllPartials();
	},
	
	render: function(emailFileName, data){
		var deferred = q.defer();
		
		fs.readFile(__dirname + '/../emails/' + emailFileName, {encoding: 'utf-8'}, function(err, source){
			if(!err){
				partialsDeferred.promise.then(function(){
					try{
						var template = Handlebars.compile(source);
						var output = template(data);
						
						deferred.resolve(output);
					}catch(e){
						console.log('Error compiling Handlebars email: ', e);
					}
				});
			}else{
				deferred.reject(err);
			}
		});
		
		return deferred.promise;
	},
	
	/*
	'to': [{
		'email': 'recipient.email@example.com',
		'name': 'Recipient Name',
		'type': 'to'
	}]
	*/
	sendHtml: function(_params){
		var deferred = q.defer(),
			errors = [];
		
		if(Utils.isEmpty(_params, 'html')){
			errors.push('emails.js: Missing "html"');
		}
		if(Utils.isEmpty(_params, 'to')){
			errors.push('emails.js: Missing "to"');
		}
		
		if(errors.length){
			deferred.reject(errors);
			return deferred.promise;
		}
		
		if(typeof _params.to === 'string'){
			_params.to = [{
				email: _params.to
			}];
		}
		
		// https://mandrillapp.com/api/docs/messages.nodejs.html#method=send
		var message = extend(true, {
			'subject': 'GreekRush',
			'from_email': 'info@greekrush.com',
			'from_name': 'GreekRush',
			'headers': {
				'Reply-To': 'info@greekrush.com'
			},
			'inline_css': true,
			//'bcc_address': 'cody@greekrush.com',		//'message.bcc_address@example.com',
		}, _params);

		var mandrillObject = {
			'message': message
		};

		//Record the email in the DB
		db.insert('Emails', {
			Emails_mandrillObject: JSON.stringify(mandrillObject),
			Emails_html: message.html,
			Emails_to: JSON.stringify(message.to),
			Emails_statuses: 'send attempted'
		}).then(function(email){
			mandrill_client.messages.send(mandrillObject, function(results) {
				var statuses = [];
				results.forEach(function(result){
					statuses.push(result.status);
				});

				db.update('Emails', {
					Emails_statuses: JSON.stringify(statuses),
					Emails_mandrillResults: JSON.stringify(results)
				}, email.Emails_id).then(function(){
					deferred.resolve(results);
				}, function(error){
					deferred.reject(error);
				});
			}, function(e) {
				var error = 'A mandrill error occurred: ' + e.name + ' - ' + e.message;
				console.log(error);
				deferred.reject(error);
			});
		});
		
		return deferred.promise;
	},
	
	/*
	'to': [{
		'email': 'recipient.email@example.com',
		'name': 'Recipient Name',
		'type': 'to'
	}]
	*/
	sendTemplate: function(emailFileName, _params, data){
		var deferred = q.defer(),
			errors = [];
		
		if(Utils.isEmpty(emailFileName)){
			errors.push('emails.js: Missing "emailFileName"');
		}
		
		if(!Utils.isEmpty(_params, 'html')){
			errors.push('emails.js sendTemplate: "html" is set but it will be overwritten.');
		}
		
		if(errors.length){
			deferred.reject(errors);
		}else{
			this.render(emailFileName, data).then(function(emailHtml){
				var message = extend(true, _params, {
					html: emailHtml
				});
				
				return methods.sendHtml(message);
			}).then(function(mandrillResults){
				deferred.resolve(mandrillResults);
			}, function(error){
				console.log('failed to render: ', error);
				deferred.reject(error);
			});
		}
		
		return deferred.promise;
	},
	
	forgotPassword: function(emailAddress, resetPasswordLink){
		var errors = [];
		
		if(Utils.isEmpty(resetPasswordLink)){
			errors.push('resetPasswordLink required');
		}
		
		if(errors.length){
			var deferred = q.defer();
			deferred.reject(errors);
			return deferred.promise;
		}
		
		return this.sendTemplate('forgot-password.html', {
			to: [{
				'email': emailAddress
			}]
		}, {
			resetPasswordLink: resetPasswordLink
		});
	},
	
	emailConfirmationCode: function(emailAddress, code){
		var errors = [];
		
		if(Utils.isEmpty(code)){
			errors.push('code required');
		}
		
		if(errors.length){
			var deferred = q.defer();
			deferred.reject(errors);
			return deferred.promise;
		}
		
		return this.sendTemplate('email-confirmation-code.html', {
			to: [{
				'email': emailAddress
			}]
		}, {
			code: code
		});
	}
}

methods._init();

module.exports = methods;