var emails = require('../server-files/emails.js');

/*
emails.sendHtml({
	html: '<h1>testing email</h1>',
	to: [{
		'email': 'rickyk586@gmail.com',
		'name': 'Rick K',
		'type': 'to'
	}]
}).then(function(result){
	console.log('Result:', result);
}, function(error){
	console.log('Error:', error)
});
*/

/*
emails.sendTemplate('forgot-password.html', {
	to: [{
		'email': 'rickyk586@gmail.com',
		'name': 'Rick K',
		'type': 'to'
	}]
}, {
	resetPasswordLink: 'http://www.google.com'
}).then(function(result){
	console.log('Result:', result);
}, function(error){
	console.log('Error:', error)
});
*/

//emails.emailConfirmationCode(user.Users_edu, userConfirmationCode.UserConfirmationCodes_code)
emails.forgotPassword('rickyk586@gmail.com', 'http://www.google.com').then(function(result){
	console.log('Result:', result);
}, function(error){
	console.log('Error:', error)
});