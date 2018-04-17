appHelperModule.directive('stylePreviewSmall', [
    'featureTypes',
    function (featureTypes) {
        var defaultTemplate='/static/Templates/stylePreviewSmall.html';
        return {
            restrict: 'AE',
            templateUrl: function(tElement, tAttrs) {
                                if(tAttrs.customTemplate){
                                    return tAttrs.customTemplate;
                                }
                            return defaultTemplate;
                    },
            scope: {
                featureType: '=',
                styleHash: '='
            },
            controller: [
                '$scope','guidGenerator',
                function ($scope, guidGenerator) {
                    $scope.uniqueId = guidGenerator.generateNew();

                    $scope.isPoint = $scope.featureType == featureTypes.point;
                    $scope.isPolyline = $scope.featureType == featureTypes.polyline;
                    $scope.isPolygon = $scope.featureType == featureTypes.polygon;
                    $scope.isGeoTiff = $scope.featureType == featureTypes.geoTiff;

                    $scope.getFill = function(style) {
                        if (style.fillPattern) {
                            return "url(#" + style.fillPattern + $scope.uniqueId + ")";
                        }
                        return style.fillColor;
                    }
                   
                }
            ]
        }
    }]);
