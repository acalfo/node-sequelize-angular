'use strict';

/**
 * @ngdoc function
 * @name greekRush.common.controllers:HeaderCtrl
 * @description
 * # HeaderCtrl
 * Controller of the greekRush
 */

app.controller('UniversityDashCtrl', function ($scope, User, $location, $rootScope, Utils, api, Facebook) {
	console.log('University Dash Controller');
	var users = {};

	api.get('councils',{
		Universities_id: $scope.currentUser.Universities_id
	}).then(function(councils){
		$scope.councils = councils;
	}).then(function(){
		api.get('users',{
			Universities_id: $scope.currentUser.Universities_id,
			Users_type: ['chapter', 'council']
		}).then(function(users){
			$scope.chapterUsers = users;
		});
	});
	

	$scope.getCouncilUsers = function(councilId){
		$scope.councilUsers = {};
		api.get('users',{
			Users_type: 'council',
			Councils_id: $scope.unassign.councils_ids[0]
		}).then(function(users){
			$scope.councilUsers = users;
		})
	}


	$scope.assignUser = function(council){
		council.users_ids.forEach(function(Users_id){
			api.post('university_user/set_user_type',{
				Users_id: Users_id,
				Users_type: 'council',
				councils_ids: council.councils_ids
			}).then(function(user){
				//console.log(JSON.stringify(user));
			});
		});
	}

	$scope.unassignUser = function(council){
		council.users_ids.forEach(function(Users_id){
			api.post('university_user/remove_user_councils',{
				Users_id: Users_id,
				councils_ids: council.councils_ids
			}).then(function(user){
				//console.log(JSON.stringify(user));
			});
		});
	}


});
