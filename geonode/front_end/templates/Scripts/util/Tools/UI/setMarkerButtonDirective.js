mapModule
    .directive('setMarker', setMarker);
setMarker.$inject = ['mapTools'];

function setMarker(mapTools) {
    return {
        restrict: 'EA',
        scope: {
             disableFunction : '=',
             buttons : '=',
             content: '='
        },
        templateUrl: '/static/Templates/Tools/Map/setMarkerButton.html',
        controller: [
            '$scope',
            function($scope) {
                angular.extend($scope, mapTools.setMarkerTool);
                $scope.setMarkerToolStatus=$scope.$parent.toggleButtonsList['setMarkerTool'];
                $scope.toggleSetMarkerTool=function () {
                    if($scope.disableFunction) $scope.disableFunction($scope.buttons["setMarkerTool"].toolsToDisable,mapTools,$scope.buttons);
                    $scope.buttons['setMarkerTool'].isActive=$scope.setMarker();
                    if($scope.buttons['setMarkerTool'].isActive) $scope.content='Click to set marker';
                    else $scope.content='';
                };
                $scope.clearAllMarker=function () {
                  $scope.clearAllMarkers();
                }
            }
        ]
    };
}