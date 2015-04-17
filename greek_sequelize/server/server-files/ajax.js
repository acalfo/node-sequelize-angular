//This allows all ajax calls to follow the same convention

function Ajax(){
	this.obj = {
		action: '',		//deprecated
		errors: [],		//deprecated
		meta: {
			actions: [],
			messages: [],
		},
		data: {}
	};
}

//deprecated
Ajax.prototype.setAction = function(action){
	this.obj.action = action;
}
Ajax.prototype.addAction = function(action){
	this.obj.action = action;								//legacy
	this.obj.meta.actions.push(action);
}

Ajax.prototype.addMessage = function(type, message, hide){
	var message = {
		type: type,
		msg: message
	};
	
	if(hide === true){
		message.hide = true;
	}
	
	this.obj.meta.messages.push(message);
}
Ajax.prototype.addMessages = function(type, messages, hide){
	var self = this;
	messages.forEach(function(message){
		self.addMessage(type, message);
	});
}

//Errors
Ajax.prototype.addError = function(error){
	this.obj.errors.push(error);							//legacy
	
	//it might be a javascript error
	try{
		error = error.toString();
	}catch(e){}
	
	//this happens if error.toString() works
	error = error.replace('Error: ERROR:', 'ERROR:');
	
	if(error.indexOf('ERROR: ') === 0){
		this.addMessage('error', error)
	}else{
		this.addMessage('errorInternal', error);
	}
}
Ajax.prototype.addErrors = function(errors){
	if(typeof errors === 'string'){
		this.addError(errors);
		return;
	}
	
	if(typeof errors.length === 'undefined'){
		//it might be a javascript error
		try{
			var error_string = errors.toString();
			this.addError(error_string);
			return;
		}catch(e){}
	}
	
	var self = this;
	errors.forEach(function(error){
		self.addError(error);
	})
}

//Internal Errors
Ajax.prototype.addErrorInternal = function(error, hide){	
// 	this.obj.errors.push(error);							//legacy
	this.addMessage('errorInternal', error, hide);
}
Ajax.prototype.addErrorsInternal = function(errors, hide){
// 	this.obj.errors = this.obj.errors.concat(errors);		//legacy
	this.addMessages('errorInternal', errors. hide);
}

//Successes
Ajax.prototype.addSuccess = function(success){	
	this.addMessage('success', success);
}
Ajax.prototype.addSuccesses = function(successes){
	this.addMessages('success', successes);
}

//Warnings
Ajax.prototype.addWarning = function(warning){	
	this.addMessage('warning', warning);
}
Ajax.prototype.addWarnings = function(warnings){
	this.addMessages('warning', warnings);
}

//Alerts
Ajax.prototype.addAlert = function(alert){	
	this.addMessage('alert', alert);
}
Ajax.prototype.addAlerts = function(alerts){
	this.addMessages('alert', alerts);
}

Ajax.prototype.setData = function(data){
	this.obj.data = data;
}

module.exports = Ajax;