'use strict';

app.factory('api', function ($http/*, $state*/, $q, $rootScope, $location, $bootbox, Utils) {

	// 	FacebookProvider.init('673581516009551');
	//TODO: put this in config/settings
	// var api_url = 'http://54.193.96.75:3000/';
	var api_url ='http://greekrush-128756.usw1-2.nitrousbox.com:4000/api/v1/';
	
	function showPhoneConfirmationDialog(){
		//var user = User.getCurrent();
		var user = $rootScope.currentUser;	//using this instead to avoid circular dependency
		$bootbox.dialog({
			message: 'You have not yet verified your phone number: ' + user.Users_phone,
			buttons: {
				'Cancel': {
					className: 'btn-default'
				},
				'Text Confirmation Code': {
					className: 'btn-primary',
					callback: function(){
						post('text_confirmation_code');
						$bootbox.prompt('A Confirmation code has been sent. Please enter it below.', function(code){
							if(!Utils.isEmpty(code)){
								post('confirm_confirmation_code', {
									code: code
								}).then(function(confirmed){
									if(confirmed){
										$bootbox.alert('Your phone number has been confirmed.');
									}
								});
							}
						});
					}
				}
			}
		});
	}

	function call(url, options){
		var deferred = $q.defer();
		
		var obj = {
			url: api_url + url,
			method: 'GET',
			withCredentials: true
		};

		angular.extend(obj, options);

		//use params or data depending on the method
		if(obj.data !== 'undefined' && obj.method === 'GET'){
			obj.params = obj.data;
			delete obj.data;
		}

		$http(obj)
		.success(function(response){
			response.meta.actions.forEach(function(action){
				if(response.action == 'logout'){
					delete $rootScope.currentUser;
					$location.url('');
				}
				if(response.action == 'verifyPhone'){
					showPhoneConfirmationDialog();
				}
			});
			
			var messages = {
				error: [],
				errorInternal: [],
				success: [],
				warning: [],
				alert: []
			};
			var errorOccurred = false;
			var showGenericError = false;
			response.meta.messages.forEach(function(message){
				//remove 'ERROR: ' at the beginning of the message if it's there
				if(message.msg.indexOf('ERROR: ') === 0){
					message.msg = message.msg.replace('ERROR: ', '');
				}
				
				messages[message.type].push(message.msg);
				
				if(message.type == 'error'){
					errorOccurred = true;
				}
				else if(message.type == 'errorInternal'){
					console.log('Internal Error: ' + message.msg);
					errorOccurred = true;
					
					//if we come across an internal error that does not have hide set to true, then show the generic error
					if(Utils.isEmpty(message, 'hide') || message.hide !== true){
						showGenericError = true;
					}
				}
			});
			
			if(messages.error.length){
				$bootbox.alert({
					message: messages.error.join('<br />')
				});
			}
			else if(messages.errorInternal.length){
				if(showGenericError){
					$bootbox.hideAll();
					$bootbox.alert({
						message: 'An error has occurred.'
					});
				}
			}
			
			if(errorOccurred){
				deferred.reject(messages.error);
			}else{
				deferred.resolve(response.data);
			}
		})
		.error(function(response){
			console.log(response.toString());
			deferred.reject(response);
		});

		return deferred.promise;
	}

	function get(url, data){
		return call(url, {
			data: data
		});
	}

	function post(url, data){
		return call(url, {
			method: 'POST',
			data: data
		});
	}

	function put(url, data){
		return call(url, {
			method: 'PUT',
			data: data
		});
	}

	return {
		call: call,
		get: get,
		post: post,
		put: put
	}
});