'use strict';

/**
 * @ngdoc function
 * @name greekRush.common.controllers:HeaderCtrl
 * @description
 * # HeaderCtrl
 * Controller of the greekRush
 */

app.controller('CampusCtrl', function ($scope, api, $routeParams, User, Utils, $location, $filter, $bootbox) {
	var user = User.getCurrent();
	
	$scope.currentUser = user;
	
	$scope.status = {
		one:false,
		two:false,
		three:false
	};
	$scope.buttonMsg = 'Sign Up For Recruitment';
	
	function userIsSignedUpForRecruitment(){
		$scope.active = 'disabled';
		$scope.buttonMsg = "You're Signed Up!";
	}
	
	// Deactive Sign Up Button if not during Sign up Period
	function isOpen(start, end){
		var today = (new Date()).getTime();

		var startDate = (new Date(start)).getTime();
		var endDate = (new Date(end)).getTime();
		
		if((startDate < today) && (today< endDate)){

			$scope.buttonMsg = 'Sign Up For Recruitment';
			return true;
		}else{

			$scope.active = 'disabled';
			$scope.buttonMsg = 'Sign Ups Open ' + $filter('reformatdate')(start);
			return false;
		}
	}
	
	api.get('chapters', {
		Universities_id: user.Universities_id
	}).then(function(chapters){
		$scope.chapters = chapters;
		
		return api.get('recruitments', {
			active: true,
			Councils_gender: user.Users_gender,
			Universities_id: user.Universities_id
		})
	}).then(function(recruitments){
		if(recruitments.length>0){
			//console.log('Recruitments '+recruitments);
			$scope.selected = recruitments[0];
			$scope.selected.recs = JSON.parse(recruitments[0].Recruitments_requirements);
			
			isOpen($scope.selected.Recruitments_startSignUp, $scope.selected.Recruitments_endSignUp);
			
			if(!Utils.isEmpty(user, 'recruitmentUsers')){
				user.recruitmentUsers.forEach(function(recruitmentUser){
					if(recruitmentUser.Recruitments_id == $scope.selected.Recruitments_id){
						userIsSignedUpForRecruitment();
					}
				});
			}
		}
	});
	
	api.get('university', {
		Universities_id: user.Universities_id
	}).then(function(university){
		$scope.university = university;
	});

	$scope.joinRecruitment = function(recruitment){
		console.log(recruitment);
		// 		if(!Utils.isEmpty(recruitment,'Recruitments_requirements')){
		// 			$location.url('/myCampus/join-recruitment');
		// 		}
		// 		else{
		// 			api.post('join_recruitment',{
		// 				Recruitments_id: recruitment.Recruitments_id
		// 			}).then(function(returned){
		// 				$scope.active = 'disabled';
		// 				$scope.buttonMsg = "You're Signed Up!";
		// 			})
		// 		}
		
		userIsSignedUpForRecruitment();
		api.post('join_recruitment',{
			Recruitments_id: recruitment.Recruitments_id
		}).then(function(returned){
// 			userIsSignedUpForRecruitment();
			
			//update user so the nav updates
			User.getUserFromDB();
		});
	}

	$scope.showTerms = function(term){
		var msg = '<b>'+term.key+' :</b><br/>'+term.value;
		$bootbox.dialog({
			message: msg
		});
	}

});
