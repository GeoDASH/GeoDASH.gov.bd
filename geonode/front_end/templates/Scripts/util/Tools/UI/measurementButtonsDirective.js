mapModule
.directive('measurementButtons', measurementButtons);
measurementButtons.$inject = ['mapTools'];

function measurementButtons(mapTools) {
return {
    restrict: 'EA',
    scope: {
        disableFunction : '=',
        buttons : '=',
        content : '='
    },
    templateUrl: '/static/Templates/Tools/Map/measurementButtons.html',
    controller: [
        '$scope',
        function($scope) {
            angular.extend($scope, mapTools.measurementTool);
            // $scope.lineButtonStatus=$scope.buttons["lineMeasurementTool"];
            // $scope.areaButtonStatus=$scope.buttons["areaMeasurementTool"];
            $scope.toggleLineMeasurementTool=function () {
                if($scope.disableFunction) $scope.disableFunction($scope.buttons["lineMeasurementTool"].toolsToDisable,mapTools,$scope.buttons);
                $scope.buttons["lineMeasurementTool"].isActive= $scope.lineMeasurement();
                if($scope.buttons["lineMeasurementTool"].isActive) $scope.content='Click to draw line';
                else $scope.content='';
            };
            $scope.toggleAreaMeasurementTool=function () {
                if($scope.disableFunction) $scope.disableFunction($scope.buttons["areaMeasurementTool"].toolsToDisable,mapTools,$scope.buttons);
                $scope.buttons["areaMeasurementTool"].isActive=$scope.areaMeasurement();
                if($scope.buttons["areaMeasurementTool"].isActive) $scope.content='Click to draw area';
                else $scope.content='';
            };
        }
    ]
};
}