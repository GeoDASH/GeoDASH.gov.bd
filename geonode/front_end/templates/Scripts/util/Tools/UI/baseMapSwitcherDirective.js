mapModule.directive('baseMapSwitcher', [
    'mapTools',
    function (mapTools) {
        return {
            restrict: 'EA',
            scope: {},
            templateUrl: '/static/Templates/Tools/Map/baseMapSwitcher.html',
            controller: [
                '$scope','$http','urlResolver','mapService',
                function ($scope,$http,urlResolver,mapService) {
                    var baseMapTool = mapTools.baseMap;
                    var olMap=mapService.getMap();
                    $scope.baseMaps = baseMapTool.getAllBaseMaps();
                    $scope.expanded=false;
                    $scope.baseMapGroups = _.groupBy($scope.baseMaps, function(item){ return item.groupName; });
                    $http.get('/api/layers-list/').then(function (response) {
                        angular.forEach(response.data.objects,function (layer) {
                            if(layer.is_base_layer=='1'){
                                var olLayer= new ol.layer.Tile({
                                            title: layer.title,
                                            visible: false,
                                            source: new ol.source.TileWMS({
                                                url: urlResolver.resolveGeoserverTile(),
                                                params: {'LAYERS': layer.detail_url.split('/')[2], 'TILED': true},
                                                serverType: 'geoserver',
                                                transition: 0
                                              })
                                        });
                                $scope.baseMapGroups['CustomBaseMap']=[{
                                    groupName : 'CustomBaseMap',
                                    thumb : 'map-thumb.jpg',
                                    title : layer.title,
                                    olLayer : olLayer
                                }];
                                olMap.bottomLayers.getLayers().push(olLayer);
                            }
                        });
                    });

                    $scope.model = {};

                    $scope.changed = function (basemap) {
                        $scope.model.selectedBaseMap = basemap;
                        baseMapTool.changeBaseLayer($scope.model.selectedBaseMap);
                        $scope.expanded=false;
                    };

                    loadBaseMap();

                    if (!$scope.model.selectedBaseMap || !$scope.model.selectedBaseMap.title) {
                        baseMapTool.events
                            .register('set', loadBaseMap);
                    }
                    
                    function loadBaseMap() {
                        $scope.model.selectedBaseMap = baseMapTool.getBaseMap();
                    }
                }
            ]
        };
    }
]);