/**
 * Created by rudra on 4/17/18.
 */
mapModule
    .directive('nearestConfiguration', nearestConfiguration);
nearestConfiguration.$inject = ['mapTools', 'mapService'];

function nearestConfiguration(mapTools) {
    return {
        restrict: 'EA',
        scope: {
            routeConfig:'='
        },
        templateUrl: '/static/Templates/Tools/Map/nearestSearchConfiguration.html',
        controller: [
            '$scope', 'mapService','$timeout',
            function ($scope, mapService,$timeout) {
                $scope.getLayers = function () {
                    var layers = mapService.getLayers();
                    var customArray = [];
                    angular.forEach(layers, function (layer) {
                         if (layer.ShapeType === 'point') {
                                customArray.push({Id: layer.LayerId, Name: layer.Name});
                            }
                    });
                    $scope.layers = customArray;
                    $timeout(function () {
                        $('.stop-propagation2').on('click', function (e) {
                            e.stopPropagation();
                        });
                    },0)
                }
            }
        ]
    };
}