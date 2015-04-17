'use strict'

angular
  .module('theme.gallery', [])
  .controller('GalleryController', ['$scope', 'gallery', '$modal', '$timeout', function ($scope, galleryService, $modal, $t) {
    $scope.galleryInstance = galleryService.get();

    $scope.galleryFilter = 'all';

    $scope.showGrid = function () {
      $scope.galleryInstance.setGrid();
    };
    $scope.showList = function () {
      $scope.galleryInstance.setList();
    };
    $scope.recompile = function (scope) {
      $t( function () {
        $scope.galleryInstance.recompile(scope);
      }, 600);
    };

    $scope.openImageModal = function ($event) {
      $event.preventDefault();
      $event.stopPropagation();
      var modalInstance = $modal.open({
        templateUrl: 'imageModalContent.html',
        controller: ['$scope', '$modalInstance', 'src', function ($scope, $modalInstance, src) {
          $scope.src = src;
          $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
          };
        }],
        size: 'lg',
        resolve: {
          src: function () {
            console.log($event.target.src.replace('thumb_', ''));
            return $event.target.src.replace('thmb_', '');
          }
        }
      });
    };

    $scope.$watch('galleryFilter', function (newVal) {
      $scope.galleryInstance.filter(newVal);
    });
  }])
  .service('gallery', ['$compile', function ($compile) {
    this.element = null;
    this.get = function () { return this; };
    this.setElement = function (element) {
      this.element = element;
    };
    this.setGrid = function () {
      $(this.element).mixitup('toGrid');
      $(this.element).removeClass('full-width');
    };
    this.setList = function () {
      $(this.element).mixitup('toList');
      $(this.element).addClass('full-width');
    };
    this.filter = function (cat) {
      $(this.element).mixitup('filter', cat);
    };
    this.recompile = function (scope) {
      var html = $(this.element).html();
      $(this.element).html('');
      var compiled = angular.element($compile(html)(scope));
      $(this.element).append(compiled)
    };
    this.done = function () {
      console.log('done');
    };
  }])
  .directive('gallery', function () {
    return {
      restrict: 'A',
      scope: {
        galleryInstance: '=gallery'
      },
      link: function (scope, element, attr) {
        $(element).mixitup();
        scope.galleryInstance.setElement(element);
      }
    };
  })
