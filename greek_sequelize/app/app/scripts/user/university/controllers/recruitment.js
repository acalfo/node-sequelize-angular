app.controller('UniversityRecruitmentCtrl', function ($scope, api, $routeParams, $filter, Utils, $q) {

	$scope.reverse = false;
	$scope.perPage = 10;
	$scope.pageNum = 1;
	$scope.predicate = '';
	$scope.search = "";
	$scope.numPages = 1;
	
	$scope.list = [];
	$scope.boxes = [];

	// 	$scope.watchers = [$scope.reverse , $scope.perPage, $scope.pageNum, $scope.predicate];

	var paginate = function(data, perPagestring , sortBy , search, reverse, pageNumstring){
		console.log('HERE IN PAGE');
		var deferred = $q.defer();
		var perPage = parseInt(perPagestring);
		var pageNum = parseInt(pageNumstring);
		var filtered = $filter('filter')(data , {$:search});
		var sorted = $filter('orderBy')(filtered, sortBy, reverse);
		console.log(sorted);
		var numPages = Math.ceil(sorted.length/perPage);
		$scope.totalNum = sorted.length;
		$scope.numPages = numPages;
		var start = perPage*(pageNum-1);
		if(pageNum*perPage >=sorted.length){
			var pageData = sorted.slice(start);
			console.log(pageData);
			deferred.resolve(pageData);
		}
		else{
			var end = perPage;
			var pageData = sorted.slice(start , end);
			deferred.resolve(pageData);
		}
		return deferred.promise;
	}
	
	var getTableData = function(type){
		api.get('recruitment_users',{
			Recruitments_id: $routeParams.Recruitments_id,
			RecruitmentUsers_status: type
		}).then(function(users){
			console.log(users);
			$scope.users = users;
			paginate(users , $scope.perPage, $scope.predicate,$scope.search, $scope.reverse, $scope.pageNum).then(function(pageData){
				$scope.pageData = pageData;
			});
		});
		
	}
	
	$scope.getTableData = function(type){
		getTableData(type);
	}


	api.get('recruitment', {
		Recruitments_id: $routeParams.Recruitments_id
	}).then(function(recruitment){
		console.log(recruitment);
		$scope.recruitment = recruitment;
	}).then(function(){
		console.log('HERE!!!!');
// 		api.get('recruitment_users',{
// 			Recruitments_id: $routeParams.Recruitments_id,
// 			RecruitmentUsers_status: 'pending'
// 		}).then(function(users){
// 			console.log(users);
// 			$scope.users = users;
// 			paginate(users , $scope.perPage, $scope.predicate,$scope.search, $scope.reverse, $scope.pageNum).then(function(pageData){
// 				$scope.pageData = pageData;
// 			});
// 		})
		getTableData('pending');
	});
	
	$scope.verify= function(userId){
		var ids = [];
		ids.push(userId);
		console.log(ids);
		api.post('university_user/update_recruitment_users_statuses',{
			recruitmentusers_ids:ids,
			RecruitmentUsers_status:'approved'
		}).then(function(some){
			console.log(some);
			getTableData();
		})
	}
	
	$scope.reject= function(userId){
		var ids = [];
		ids.push(userId);
		console.log(ids);
		api.post('university_user/update_recruitment_users_statuses',{
			recruitmentusers_ids:ids,
			RecruitmentUsers_status:'rejected'
		}).then(function(some){
			console.log(some);
			getTableData();
		})
	}
	
	$scope.updateList = function(action , user){
		$scope.mailto = '';
		if(action==='add'){
			$scope.list.push(user);
			for( var i in $scope.list){
				var user = $scope.list[i];
				if($scope.mailto ===''){
					$scope.mailto = user;
				}
				else{
					$scope.mailto = $scope.mailto+','+user;
				}
				
			}
		}
		else if(action==='remove'){
			$scope.box = 'remove';
			var here = $scope.list.indexOf(user);
			$scope.list.splice(here,1);
			for( var i in $scope.list){
				var user = $scope.list[i];
				if($scope.mailto ===''){
					$scope.mailto = user;
				}
				else{
					$scope.mailto = $scope.mailto+','+user;
				}
			}
		}
		console.log($scope.list);
	}
	$scope.updateListAll = function(action , users){
		$scope.list = [];
		$scope.mailto = '';
		if(action==='add'){
			for(var i in users){
				var user = users[i].Users_email;
				$scope.list.push(user);
				$scope.boxes[i] = 'add';
				if($scope.mailto ===''){
					$scope.mailto = user;
				}
				else{
					$scope.mailto = $scope.mailto+','+user;
				}
			}
		}
		else{
			$scope.boxes = [];
		}
		
		console.log($scope.mailto);
	}

	$scope.emailSelected = function(){
		
	}

	$scope.$watchCollection('[perPage, predicate, search.$, reverse, pageNum, users]',function(newVals, oldVals){
		console.log('new: '+newVals);
		console.log('old: '+oldVals);
		if(!Utils.isEmpty(oldVals)){
			if(newVals[0]===''){
				return false;
			}
			else{
				console.log('before pagedata');
				paginate(newVals[5] , newVals[0], newVals[1], newVals[2], newVals[3], newVals[4]).then(function(pageData){
					console.log(pageData);
					$scope.pageData = pageData;
				});
			}
		}
		else if(Utils.isEmpty(oldVals)&& !Utils.isEmpty(newVals[4])){
			if(newVals[0]===''){
				return false;
			}
			else{
				paginate(newVals[5] , newVals[0], newVals[1], newVals[2], newVals[3], newVals[4]).then(function(pageData){
					$scope.pageData = pageData;
				});
			}
		}
		// 		else if(newVals[0]!==''){
		// 			paginate($scope.users , newVals[0], newVals[1], newVals[2], newVals[3], newVals[4]);
		// 		}

	});


});
