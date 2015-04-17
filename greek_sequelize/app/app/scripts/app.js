'use strict';

var app= angular.module('greekRush', [
	//    'easypiechart',
	//    'toggle-switch',
	'ui.bootstrap',
	'ui.bootstrap.pagination',
	'theme.template-overrides',
	//    'ui.tree',
	//    'ui.select2',
	//    'ngGrid',
	//    'xeditable',
	//    'flow',
	'theme.services',
	'theme.directives',
	'theme.navigation-controller',
	//     'theme.notifications-controller',
	//     'theme.messages-controller',
	//     'theme.colorpicker-controller',
	//     'theme.layout-horizontal',
	//     'theme.layout-boxed',
	//     'theme.vector_maps',
	//     'theme.google_maps',
	//     'theme.calendars',
	//     'theme.gallery',
	//     'theme.tasks',
	//     'theme.ui-tables-basic',
	//     'theme.ui-panels',
	//     'theme.ui-ratings',
	//     'theme.ui-modals',
	//     'theme.ui-tiles',
	//     'theme.ui-alerts',
	//     'theme.ui-sliders',
	//     'theme.ui-progressbars',
	//     'theme.ui-paginations',
	//     'theme.ui-carousel',
	//     'theme.ui-tabs',
	//     'theme.ui-nestable',
	'theme.form-components',
	'theme.form-directives',
	'theme.form-validation',
	'theme.form-inline',
	//     'theme.form-image-crop',
	//     'theme.form-uploads',
	//     'theme.tables-ng-grid',
	//     'theme.tables-editable',
	//     'theme.charts-flot',
	//     'theme.charts-canvas',
	//     'theme.charts-svg',
	//     'theme.charts-inline',
	//     'theme.pages-controllers',
	'theme.dashboard',
	//     'theme.templates',
	//     'theme.template-overrides',
	'ngCookies',
	'ngResource',
	'ngSanitize',
	'ngRoute',
	'ngAnimate',
	'facebook',
	'Utils'
])
.controller('MainController', function ($scope, $global, $timeout, User, $rootScope) {
	$rootScope.userGot = false;

	$scope.style_fixedHeader = $global.get('fixedHeader');
	$scope.style_headerBarHidden = $global.get('headerBarHidden');
	$scope.style_layoutBoxed = $global.get('layoutBoxed');
	$scope.style_fullscreen = $global.get('fullscreen');
	$scope.style_leftbarCollapsed = $global.get('leftbarCollapsed');
	$scope.style_leftbarShown = $global.get('leftbarShown');
	// 	$rootScope.style_leftbarShown = $global.get('leftbarShown');
	$scope.style_rightbarCollapsed = $global.get('rightbarCollapsed');
	$scope.style_isSmallScreen = false;
	$scope.style_showSearchCollapsed = $global.get('showSearchCollapsed');;

	$scope.hideSearchBar = function () {
		$global.set('showSearchCollapsed', false);
	};

	$scope.hideHeaderBar = function () {
		$global.set('headerBarHidden', true);
	};

	$scope.showHeaderBar = function ($event) {
		$event.stopPropagation();
		$global.set('headerBarHidden', false);
	};

	$scope.toggleLeftBar = function () {
		if ($scope.style_isSmallScreen) {
			return $global.set('leftbarShown', !$scope.style_leftbarShown);
		}
		$global.set('leftbarCollapsed', !$scope.style_leftbarCollapsed);
	};

	$scope.toggleRightBar = function () {
		$global.set('rightbarCollapsed', !$scope.style_rightbarCollapsed);
	};

	$scope.$on('globalStyles:changed', function (event, newVal) {
		$scope['style_'+newVal.key] = newVal.value;
	});
	$scope.$on('globalStyles:maxWidth767', function (event, newVal) {
		$timeout( function () {      
			$scope.style_isSmallScreen = newVal;
			if (!newVal) {
				$global.set('leftbarShown', false);
			} else {
				$global.set('leftbarCollapsed', false);
			}
		});
	});

	// there are better ways to do this, e.g. using a dedicated service
	// but for the purposes of this demo this will do :P
	//     $scope.isLoggedIn = true;
	//     $scope.logOut = function () {
	//       $scope.isLoggedIn = false;
	//     };
	//     $scope.logIn = function () {
	//       $scope.isLoggedIn = true;
	//     };

	$scope.logOut = function () {
		User.logout();
	};

	$scope.rightbarAccordionsShowOne = false;
	$scope.rightbarAccordions = [{open:true},{open:true},{open:true},{open:true},{open:true},{open:true},{open:true}];
})
.config(['$provide', '$routeProvider', 'FacebookProvider', function ($provide, $routeProvider, FacebookProvider, User) {
	/*$routeProvider
	.when('/', {
		templateUrl: 'views/index.html',
		controller: 'MainController'
	})
	.when('/:templateFile', {
		templateUrl: function (param) { return 'views/'+param.templateFile+'.html' }
	})
	.otherwise({
		redirectTo: '/'
	});*/


	FacebookProvider.init('673581516009551');

	var userLoginRequired = function($q, $location, User){
		var deferred = $q.defer();

		if(User.signedIn()){
			deferred.resolve(User.getCurrent());
			return deferred.promise;
		}

		User.getUserFromDB().then(function(user){
			if(user.Users_complete !== 'complete'){
				$location.url('complete-info');
			}

			deferred.resolve(user);
		}, function(error){
			deferred.reject();
			$location.url('/');
			console.log('denied access: userLoginRequired()');
		});

		return deferred.promise;
	};

	var userTypeRequired = function(type){
		var types = typeof type == 'string' ? [type] : type;	//allows an array of types

		return function($q, $location, User, api, Utils){
			var deferred = $q.defer();

			userLoginRequired($q, $location, User, api).then(function(user){
				if(types.indexOf(user.Users_type) === -1){
					deferred.reject();
					$location.url('/home');
					console.log('denied access: ' + type + ' user required');
				}else{
					deferred.resolve(user);
				}
			}, function(){
				//not even logged in
				deferred.reject();
				$location.url('/home');		//should already be handled in userLoginRequired()
			});

			return deferred.promise;
		}
	};

	$routeProvider
	.when('/', {
		redirectTo: '/register'
	})
	.when('/register', {
		title: "Welcome to GreekRush!",
		templateUrl: 'views/user/sign-up.html',
		controller: 'AuthCtrl',
		publicAccess: true,
		resolve: {
			formType: function(){
				return 'register';
			}
		}
	})
	.when('/login', {
		title: "Welcome to GreekRush!",
		templateUrl: 'views/user/sign-up.html',
		controller: 'AuthCtrl',
		publicAccess: true,
		resolve: {
			formType: function(){
				return 'login';
			}
		}
	})
	.when('/about', {
		title: 'About',
		templateUrl: 'views/basic/about.html',
		controller: 'AboutCtrl',
		publicAccess: false
	})
	.when('/user-agreement', {
		title: 'User Agreement',
		templateUrl: 'views/basic/terms.html',
		controller: 'TermsCtrl',
		resolve: {
			tos: function(api){
				return api.get('tos');
			}
		}
	})
	.when('/home', {
		title: 'Home',
		templateUrl: 'views/user/home.html',
		controller: 'DashCtrl',
		resolve: {
			userLoginRequired: userLoginRequired
		}
	})
	.when('/complete-info', {
		title: 'Complete Info',
		templateUrl: 'views/user/information.html',
		// 		controller: 'SignUpCtrl',
		publicAccess: false,
		resolve: {
			userLoginRequired: userLoginRequired
		}
	})
	.when('/settings', {
		title: 'Settings',
		templateUrl: 'views/user/settings.html',
		controller: 'UserSettingsCtrl',
		publicAccess: false,
		resolve: {
			userLoginRequired: userLoginRequired
		}
	})
	.when('/user/:userId', {
		title: 'Profile',
		templateUrl: 'views/user/profile.html',
		controller: 'ProfileCtrl',
		publicAccess: false,
		resolve: {
			userLoginRequired: userLoginRequired
		}
	})
	.when('/forgotpassword', {
		title: 'Forgot Password',
		templateUrl: 'views/user/forgot_password.html',
		controller: 'AuthCtrl',
		publicAccess: true,
		resolve: {
			formType: function(){
				return 'login';
			}
		}
	})
	.when('/passwordreset/:Users_id/:code', {
		title: 'Password Reset',
		templateUrl: 'views/user/reset_pass.html',
		controller: 'ResetPassCtrl',
		publicAccess: true
	})

	.when('/recruitments', {
		title: 'Recruitments',
		templateUrl: 'views/recruitment/recruitments.html',
		controller: 'RecruitmentsCtrl',
		resolve: {
			userLoginRequired: userTypeRequired('council')
		}
	})
	.when('/recruitment/:Recruitments_id', {
		title: 'Recruitment',
		templateUrl: 'views/recruitment/recruitment.html',
		controller: 'UniversityRecruitmentCtrl',
		resolve: {
			userLoginRequired: userTypeRequired('university')
		}
	})
	.when('/organizations', {
		title: 'Organizations',
		templateUrl: 'views/org/organizations.html',
		controller: 'OrgsCtrl',
		// 		publicAccess: false,
		// 		resolve: {
		// 			getUserData: userLoginRequired
		// 		}
	})
	.when('/organizations/:orgId', {
		title: 'Organizations',
		templateUrl: 'views/org/organization.html',
		controller: 'OrgCtrl',
		// 		publicAccess: false,
		// 		resolve: {
		// 			getUserData: userLoginRequired
		// 		}
	})
	.when('/universities', {
		title: 'Universities',
		templateUrl: 'views/university/universities.html',
		controller: 'UniversitiesCtrl',
		// 		publicAccess: false,
		// 		resolve: {
		// 			userLoginRequired: userLoginRequired
		// 		}
	})
	.when('/universities/admin', {
		title: 'Universities',
		templateUrl: 'views/university/dash.html',
		controller: 'UniversityDashCtrl',
		publicAccess: false,
		resolve: {
			userLoginRequired: userTypeRequired('university')
		}
	})
	.when('/universities/:universityId', {
		title: 'University',
		templateUrl: 'views/university/university.html',
		controller: 'UniversityCtrl',
		// 		publicAccess: false,
		// 		resolve: {
		// 			userLoginRequired: userLoginRequired
		// 		}
	})
	.when('/organizations/:orgName/:chapterName', {
		title: 'Chapter',
		templateUrl: 'views/chapter/chapter.html',
		controller: 'ChapterCtrl',
		// 		publicAccess: false,
		// 		resolve: {
		// 			getUserData: userLoginRequired
		// 		}
	})
	.when('/chapter/admin', {
		title: 'Chapter Settings',
		templateUrl: 'views/user/admin/chapter.html',
		controller: 'ChapterAdminCtrl',
		publicAccess: false,
		resolve: {
			userLoginRequired: userTypeRequired('chapter')	//maybe also make sure they're a president
		}
	})
	.when('/myRecruitment/chapter-directory', {
		title: 'Chapter Directory',
		templateUrl: 'views/recruitment/myRecruitment/chapter-directory.html',
		controller: 'MyRecruitmentCtrl',
		publicAccess: false,
		resolve: {
			userLoginRequired: userLoginRequired
		}
	})
	.when('/myRecruitment/dash', {
		title: 'Chapter Directory',
		templateUrl: 'views/recruitment/myRecruitment/dash.html',
		controller: 'MyRecruitmentCtrl',
		publicAccess: false,
		resolve: {
			userLoginRequired: userLoginRequired
		}
	})
	.when('/myRecruitment/events', {
		title: 'Chapter Directory',
		templateUrl: 'views/recruitment/myRecruitment/events.html',
		controller: 'MyRecruitmentCtrl',
		publicAccess: false,
		resolve: {
			userLoginRequired: userLoginRequired
		}
	})
	.when('/myCampus/join-recruitment', {
		title: 'Current Recruitment',
		templateUrl: 'views/recruitment/signup.html',
		controller: 'RecruitmentSignUpCtrl',
		publicAccess:false,
		resolve: {
			userLoginRequired: userLoginRequired
		}
	})

	.when('/myCampus', {
		title: 'myCampus',
		templateUrl: 'views/user/myCampus.html',
		controller: 'CampusCtrl',
		publicAccess: false,
		resolve: {
			userLoginRequired: userLoginRequired
		}
	})

	.when('/events', {
		title: 'Events',
		templateUrl: 'views/event/calendar.html',
		controller: 'EventsCtrl',
		publicAccess: false,
		resolve: {
			userLoginRequired: userLoginRequired
		}
	})
	//President of a chapter
	.when('/pending-chapter-requests', {
		title: 'Pending Requests',
		templateUrl: 'views/chapter/requests.html',
		controller: 'ChapterRequestsCtrl',
		publicAccess: false,
		resolve: {
			userLoginRequired: userTypeRequired('chapter')	//maybe also make sure they're a president
		}
	})


	.otherwise({
		redirectTo: '/'
	});
}])
.run(function ($rootScope, $location, $route, api, Utils, User) {
	//for live debugging in browser console
	window.debug = {
		rootScope: $rootScope,
		api: api
	};

	// 	$rootScope.$on('$routeChangeStart', function(event, next, current) {
	// 		$templateCache.remove(current.templateUrl);
	// 	});

	//push routes that are open to public to this array
	var routesOpenToPublic = [];

	// ...same for superadmin only
	var superAdminRoutes = [];

	angular.forEach($route.routes, function (route, path) {
		// push route onto routesOpenToPublic if it has a truthy publicAccess value
		route.publicAccess && (routesOpenToPublic.push(path));
		if (route.special === "superadmin") {
			superAdminRoutes.push(path);
		}
	});

	//Change Header Title on route change
	$rootScope.$on('$routeChangeSuccess', function (event, current, previous) {
		if(!Utils.isEmpty(current.$$route, 'title')){
			$rootScope.title = current.$$route.title;
		}
	});

	$rootScope.$on('$routeChangeStart', function (event, nextLoc, currentLoc) {

		var closedToPublic = (-1 === routesOpenToPublic.indexOf($location.path()));
		var superAdminOnly = (-1 < superAdminRoutes.indexOf($location.path()));

		///console.log("path = " + $location.path());

		/*
		if (closedToPublic) {
			api.call('isLoggedIn').then(function(response){
				if(response.data === false){
					console.log("closed to public must be signed in");
					$location.path('/');
				}
			});
		}
		*/
	});

	User.getUserFromDB();
})

// not being used anywhere
// .directive('scrollOnClick', function() {
// 	return {
// 		restrict: 'A',
// 		link: function(scope, $elm, attrs) {
// 			$elm.on('click', function(e) {
// 				e.preventDefault();
				
// 				var $target = attrs.href ? $target = angular.element(attrs.href) : $elm;
				
// 				$target.parents('.scroll-section, body').animate({scrollTop: $target.offset().top}, "slow");
// 			});
// 		}
// 	}
// })

.filter('to_trusted', ['$sce', function($sce){
	return function(text) {
		return $sce.trustAsHtml(text);
	};
}])

.filter('friendly_role', function(){
	return function(shortRole) {
		if(shortRole == 'nm'){
			return 'New Member';
		}
		if(shortRole == 'm'){
			return 'Member';
		}
		
		return shortRole.charAt(0).toUpperCase() + shortRole.slice(1);		//just uppercase it
	};
})

.filter('reformatdate', function($filter){
	return function(input, format){
		if(input === null){ return ""; }
		return $filter('date')(new Date(input), format);
	};
});
