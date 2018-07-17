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
    $scope.isAddServerMode = false;
    $scope.serverModel = {
        title: '',
        url: ''
    };

    function getBoundingBox4326(boundingBoxes) {
        var box4326 = undefined;
        angular.forEach(boundingBoxes, function (box) {
            if(box.crs == 'EPSG:4326') {
                box4326 = box.extent;
            }
        });
        return box4326;
    }

    function loadLayersByWms(server) {
        var url = server.url + '?service=wms&tiled=true&request=GetCapabilities';
        layerRepository.getWmsLayers(url).then(function (response) {
            var mappedLayer = response.map(function(e) {
                        var bbox =  e.EX_GeographicBoundingBox;
                        bbox = bbox ? ol.proj.transformExtent(bbox, ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857')) : ol.extent.createEmpty();
                        return layerService._map({
                            Name: e.Name,
                            bbox: bbox ? bbox : ol.extent.createEmpty(),
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
        $scope.isAddServerMode = false;
        $scope.selectedServerName = server.title;
        server.method(server);
        $scope.layers = [];
    };

    $scope.addLayer = function(layer) {
        var newlayer = Object.assign({}, layer, { SortOrder: mapService.sortableLayers.length + 1 });
        mapService.addDataLayer(newlayer, false)
            .then(function(res) {               
                surfToastr.success('Layer Added to The Map Successfully.', 'Success');
            }, function(res){
                surfToastr.error('Layer Add Failed', 'Error!!!');
            });
    };
    $scope.addServer = function (externalServer) {
        externalServer.isExternalServer = true;
        externalServer.method = loadLayersByWms;
        $scope.serverList.push(externalServer);
        $scope.serverModel = {
            title: '',
            url: ''
        };
        // $scope.loadLayers($scope.serverList[$scope.serverList.length-1]);
    };
    $scope.enableAddServer = function () {
        $scope.isAddServerMode = true;
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