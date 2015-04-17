'use strict';

/**
 * @ngdoc function
 * @name greekRush.common.controllers:HeaderCtrl
 * @description
 * # HeaderCtrl
 * Controller of the greekRush
 */

app.controller('UniversitiesCtrl', function ($scope, api, $routeParams) {

	var getUniversityChapters = function (){

		api.get('chapters', {
			Universities_id: $routeParams.universityId
		}).then(function(chapters){
			$scope.chapters = chapters;
		});
	}



	//List Universities

	api.get('universities').then(function(universities){
		$scope.universities = universities;
	});



})
.controller('UniversityCtrl', function ($scope, api, $routeParams){ 
	$scope.status = {
		one:true,
		two:true
	};


	var getUniversityChapters = function (){

		api.get('chapters', {
			Universities_id: $routeParams.universityId
		}).then(function(chapters){
			console.log(chapters);
			$scope.chapters = chapters;
		});
	}


	getUniversityChapters();
	api.get('university', {
		Universities_id: $routeParams.universityId
	}).then(function(university){
		console.log(university);
		$scope.university = university;

	}).then(function(){
// 		api.get('users',{
// 			Universities_id:$scope.university.Universities_id
// 		}).then(function(users){
// 			console.log(users.length);
// 			$scope.numUsers = users.length;
// 		});
	});





});
