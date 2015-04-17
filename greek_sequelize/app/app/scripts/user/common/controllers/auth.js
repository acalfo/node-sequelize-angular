'use strict';

app.controller('AuthCtrl', function ($scope, $location, User, $q, $rootScope, api, $bootbox, formType) {
	if(formType == 'login'){
		$scope.loginForm = true;
		$scope.header = 'Login';
	}else{
		$scope.loginForm = false;
		$scope.header = 'Join GreekRush!';
	}

	$scope.toggle = function(){
		$scope.loginForm = !$scope.loginForm;
		if($scope.loginForm){
			$scope.header = 'Login';
		}
		else{
			$scope.header = 'Sign Up!';
		}
	}

	$scope.login = {};

	$scope.user = {
		name: {
			first: '',
			last: ''
		},
		email: '',
		password: ''
	}

	//logged in user down arrow button dropdown redirect to home


	// 							$scope.$on('$firebaseSimpleLogin:login', function () {
	// 								 console.log('AuthCtrl');
	// 							 });

	$scope.login = function () {
		api.call('user/login', {
			method: 'POST',
			data: {
				Users_email: $scope.login.email,
				Users_password: $scope.login.password
			}
		}).then(function (user) {
			User.setCurrent(user);
			if(user.Users_complete === 'complete'){
				if(user.Users_type == 'chapter'){
					$location.path('/myCampus');
				}else{
					$location.path('/home');
				}
			}
			else{
				$location.path('/complete-info');
			}

		}, function (errors) {
			//$scope.error = errors.join('<br />');
		});
	};

	// $scope.$on('$firebaseSimpleLogin:login', function () {
	// console.log('Logged In');
	// });

	$scope.sendPasswordResetEmail = function () {
		api.call('forgot_password', {
			method: 'POST',
			data: {
				Users_email: $scope.user.email
			}
		}).then(function(data){
			$scope.error = '';
			$scope.success = 'You have been sent an email with a link to reset your password.';
		}, function(errors){
			$scope.error = errors.join('<br />');
		});
	};

	$scope.register = function () {
		//save the values as they are right now (in case they're changed before new_db_user is added to the DB)
		var new_user = angular.copy($scope.user);

		new_user.password = new_user.password.trim();

		function showErrors(errors){
			//$scope.error = errors.join('<br />');
			$bootbox.alert({
				message: errors.join('<br />')
			})
		}

		var errors = [];

		//** Client side error checking **

		if(new_user.name.first == ''){
			errors.push('Please enter your First Name.');
		}
		if(new_user.name.last == ''){
			errors.push('Please enter your Last Name.');
		}
		if(new_user.email == ''){
			errors.push('Please enter your Email Address.');
		}
		if(new_user.password.length < 8){
			errors.push('Your Password must be at least 8 characters long.');
		}

		if(errors.length){
			showErrors(errors);
		}else{
			api.call('user/register', {
				method: 'POST',
				data: {
					Users_firstname: new_user.name.first,
					Users_lastname: new_user.name.last,
					Users_email: new_user.email,
					Users_password: new_user.password,
					Users_tos: new_user.tos
				}
			}).then(function(user){
				User.setCurrent(user);

				$location.path('/complete-info');
			}, function(errors){
				//showErrors(errors);
			});
		}
	};

	//see if they're already logged in
	User.getUserFromDB().then(function(user){
		$location.path('/complete-info');
	});
});
