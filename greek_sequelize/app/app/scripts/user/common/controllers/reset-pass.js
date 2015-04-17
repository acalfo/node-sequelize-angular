'use strict';

app.controller('ResetPassCtrl', function ($scope, $routeParams, Utils, api) {
	$scope.resetPassword = function(){
		var errors = [];
		
		if($scope.password !== $scope.passwordRepeat){
			errors.push('The passwords you entered do not match.');
		}
		
		if(errors.length){
			$scope.error = errors.join('<br />');
			$scope.success = '';
		}else{
			api.call('reset_password', {
				method: 'POST',
				data: {
					password: $scope.password,
					Users_id: $routeParams.Users_id,
					code: $routeParams.code
				}
			}).then(function(data){
				$scope.error = '';
				$scope.success = 'Your password has been updated.';
			}, function(errors){
				$scope.error = errors.join('<br />');
				$scope.success = '';
			});
		}
	}
});
