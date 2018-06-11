appModule.controller('catalogBrowserController', catalogBrowserController);
catalogBrowserController.$inject = ['$scope',
    '$rootScope',
    'surfToastr',
    'mapService',
    'layerService',
    '$modalInstance',
    '$timeout'
];

function catalogBrowserController($scope, $rootScope, surfToastr, mapService, layerService, $modalInstance, $timeout) {

    $scope.serverList = [{
            name: 'Geoserver',
            method: loadLayersByApi
        },
        // {
        //     name: 'geodata.nationaalgeoregister',
        //     url: 'https://geodata.nationaalgeoregister.nl/bestuurlijkegrenzen/wms',
        //     type: 'wms',
        //     method: loadLayersByWms

        // }
    ];

    function loadLayersByWms(server) {
        var url = server.url + '?service=wms&tiled=true&request=GetCapabilities&access_token=9df608bcabe911e7a833080027252357';
        layerService.fetchWmsLayers(url)
            .then(function(res) {
                $scope.layers = res;
                $scope.layers.forEach(function(e) {
                    e.geoserverUrl = server.url;
                }, this);
            });
    }

    function loadLayersByApi(server) {
        layerService.fetchLayers()
            .then(function(res) {
                $scope.layers = res;
            });
    }
    $scope.loadLayers = function(server) {
        $scope.selectedServerName = server.name;
        server.method(server);

    };

    $scope.addLayer = function(layer) {
        let newlayer = Object.assign({}, layer, { SortOrder: mapService.sortableLayers.length + 1 });
        mapService.addDataLayer(newlayer)
            .then(function(res) {               
                surfToastr.success('Layer Added to The Map Successfully.', 'Success');
            }, function(res){
                surfToastr.success('Layer Add Failed', 'Error!!!');
            });
    };

    $scope.closeDialog = function() {
        $modalInstance.close();
    };

    $timeout(function () {
        $scope.loadLayers($scope.serverList[0]);
    })

}