mapModule
    .directive('zoomToExtentButton', zoomToExtentButton);
zoomToExtentButton.$inject = ['mapTools'];

function zoomToExtentButton(mapTools) {
    return {
        restrict: 'EA',
        scope: {},
        templateUrl: '/static/Templates/Tools/Map/zoomToExtentButton.html',
        controller: [
            '$scope',
            function($scope) {
                angular.extend($scope, mapTools.zoomToExtentTool);
                $scope.zoomToolStatus=$scope.$parent.toggleButtonsList["zoomTool"];
                $scope.toggleZoomTool=function () {
                    if($scope.zoomToolStatus.isActive){
                        $scope.$parent.toggleButtonsList["zoomTool"].isActive=$scope.removeDrawBox();
                    }else {
                        $scope.$parent.toggleButtonsList["zoomTool"].isActive=$scope.drawBox();
                    }
                }
            }
        ]
    };
}