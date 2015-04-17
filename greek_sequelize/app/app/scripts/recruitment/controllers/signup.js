'use strict';

app.controller('RecruitmentSignUpCtrl', function ($scope, api, $routeParams) {
	api.get('recruitment', {
		Recruitments_id: $routeParams.Recruitments_id
	}).then(function(recruitment){
		$scope.recruitment = recruitment;
	});
	
	
	$scope.signUp = function(){
		api.post('join_recruitment',{
			Recruitments_id: $routeParams.Recruitments_id
		}).then(function(updatedUser){
			console.log(updatedUser);
		});
	}
	
});
