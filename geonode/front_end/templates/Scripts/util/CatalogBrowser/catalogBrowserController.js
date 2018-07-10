appModule.controller('catalogBrowserController', catalogBrowserController);
catalogBrowserController.$inject = ['$scope',
    '$rootScope',
    'surfToastr',
    'mapService',
    'layerService',
    '$modalInstance',
    '$timeout',
    'layerRepository'
];

function catalogBrowserController($scope, $rootScope, surfToastr, mapService, layerService, $modalInstance, $timeout,layerRepository) {

    $scope.serverList = [];

    function loadLayersByWms(server) {
        var url = server.url + '?service=wms&tiled=true&request=GetCapabilities';
        layerRepository.getWmsLayers(url).then(function (response) {
            var mappedLayer = response.map(function(e) {
                        return layerService._map({
                            Name: e.Name,
                            bbox: ol.proj.transformExtent(e.BoundingBox,
                                'EPSG:4326', 'EPSG:3857'),
                            geoserverUrl: server.url
                        });
                    });
            $scope.layers =  mappedLayer;
        }, function (error) {
            surfToastr.error('Can not load layers', 'Error!!!');
        });
    }

    function loadLayersByApi(server) {
        layerService.fetchLayers()
            .then(function(res) {
                $scope.layers = res;
            });
    }
    $scope.loadLayers = function(server) {
        $scope.selectedServerName = server.title;
        server.method(server);

    };

    $scope.addLayer = function(layer) {
        let newlayer = Object.assign({}, layer, { SortOrder: mapService.sortableLayers.length + 1 });
        mapService.addDataLayer(newlayer)
            .then(function(res) {               
                surfToastr.success('Layer Added to The Map Successfully.', 'Success');
            }, function(res){
                surfToastr.error('Layer Add Failed', 'Error!!!');
            });
    };

    $scope.closeDialog = function() {
        $modalInstance.close();
    };
    $scope.loadExternalGeoservers= function () {
        layerRepository.get('/api/layersource/').then(function (response) {
            $scope.serverList.push({
                title: 'Geoserver',
                method: loadLayersByApi,
                isExternalServer: false
            });
            angular.forEach(response.objects,function (externalServer) {
                externalServer.isExternalServer = true;
                externalServer.method = loadLayersByWms
                $scope.serverList.push(externalServer);
            });
            $scope.loadLayers($scope.serverList[0]);
        })
    };

    $timeout(function () {
        $scope.loadExternalGeoservers();
    })

}