'use strict';

/**
 * @ngdoc function
 * @name greekRush.common.controllers:HeaderCtrl
 * @description
 * # HeaderCtrl
 * Controller of the greekRush
 */

app.controller('HeaderCtrl', function ($scope, $location, User, $rootScope) {
	
	// 				   $scope.$on('$firebaseSimpleLogin:login', function () {
	// 					   console.log($scope.signedIn()+' '+$scope.currentUser);
	// 				   });
	
	//Collape menu on route change
	
	$scope.isCollapsed = true;
	$scope.$on('$routeChangeSuccess', function () {
		$scope.isCollapsed = true;
	});
	
	//Set current route to active
	
	$scope.$on('$routeChangeSuccess', function () {
		$scope.publicNavTabs.forEach(
			function (data) {
			data.isActive = ($location.path().indexOf(data.link) != -1);
		});
		$scope.mainNavTabs.forEach(
			function (data) {
			data.isActive = ($location.path().indexOf(data.link) != -1);
		});
		$scope.subNavTabs.forEach(
			function (data) {
			data.isActive = ($location.path().indexOf(data.link) != -1);
		});
	})
	
	//Logout
	$scope.logout = function () {
		console.log('logout');
		User.logout();
	};
	
	// Setting Navbar Tabs Based on auth status
	$scope.publicNavTabs = [{
			"title": "About",
			"link": "#/about"
		}, {
			"title": "Login",
			"link": "#/login"
		}, {
			"title": "Join",
			"link": "#/"
		}
	];
	
	$scope.mainNavTabs = [{
			"title": "Home",
			"link": "#/home"
		},
		{
			"title": "Organizations",
			"link": "#/organizations"
		}, {
			"title": "Universities",
			"link": "#/universities"
		}
	];
	
	$scope.subNavTabs = [];
	function setSubNavTabs(){
		if(User.signedIn()){
			var currentUser = User.getCurrent();
			
			if(currentUser.Users_type == 'chapter'){
				$scope.subNavTabs = [{
					"title": "myCampus",
					"link": "#/myCampus"
				}];
			}
			else if(currentUser.Users_type == 'council'){
				$scope.subNavTabs = [{
					"title": "Recruitments",
					"link": "#/recruitments"
				}];
			}
		}
	}
	$rootScope.$on('user.set', setSubNavTabs);
	setSubNavTabs();		//not really needed;
});
