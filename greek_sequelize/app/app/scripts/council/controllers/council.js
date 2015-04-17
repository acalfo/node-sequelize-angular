'use strict';

app.controller('CouncilsCtrl', function ($scope, api, User, $bootbox) {
	$scope.newRecruitment = {};
	
	$scope.councils = User.getCurrent().councils_ids;
	if($scope.councils.length == 1){
		$scope.newRecruitment.Recruitments_joinCouncils_id = $scope.councils[0];
	}else{
		//TODO: if there are more than 1 council, we will need to fetch the actual councils so we have the names for the dropdown
	}
	
	//Create Organization
	$scope.createRecruitment = function () {
		api.post('recruitment/create', $scope.newRecruitment).then(function(recruitment){
			$scope.success = 'New Recruitment created!';
			$scope.err = '';
			$scope.newRecruitment = {};
			$scope.getRecruitments();	//update list
		}, function(errors){
			$scope.err = errors.join('<br />');
		});
	}
	
	$scope.open = function($event) {
		$event.preventDefault();
		$event.stopPropagation();
// 		console.log('opened');
		$scope.opened = true;
    };
	
// 	$bootbox.alert("Hello world!");
// 	console.log($bootbox);

	//List Recruitments
	$scope.getRecruitments = function () {
		api.get('council_user/recruitments').then(function(recruitments){
			$scope.recruitments = recruitments;
		});
	}
});

