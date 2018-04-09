(function () {
    angular
        .module('SystemSettingsApp')
        .controller('SystemSettingsController', SystemSettingsController);

    SystemSettingsController.$inject = ['$scope', 'SettingsService'];

    function SystemSettingsController($scope, SettingsService) {
        $scope.layer=[];
        $scope.addressGeocodeLayer=undefined;
        $scope.elevationRasterLayer=undefined; 
        $scope.vectorLayers=[];
        $scope.rasterLayers=[];
        $scope.baseLayers=[];
        $scope.customBaseMap=undefined;

        var systemSettings = SettingsService.getSystemSettings();

        systemSettings.then(function (res) {

                var value=res;
                $.each(value, function (index, element) {                    
                    if (element.settings_code == "location") {
                        $scope.addressGeocodeLayer = element.content_object.uuid;
                        checkSelectedLayerAttrhave(element.content_object.uuid);
                    }else if(element.settings_code == "elevation"){
                        $scope.elevationRasterLayer=element.content_object.uuid;
                    }
                });

            }, function (error) {
                // This is called when error occurs.
            }
        );

        var rasterLayerSettings = SettingsService.getLayers("type__in=raster");
        var vectorLayerSettings = SettingsService.getLayers("type__in=vector");
        var baseLayerSettings=SettingsService.getLayersForBaseMaps();

        // var layersObject;

        rasterLayerSettings.then(function (value) {
               var layersObjects = value.objects;
                $.each(layersObjects, function (index, element) {
                    var title = element.title;
                    if (element.title.length > 22) {
                        title = element.title.substring(0, 25) + "...";
                    }
                });
                $scope.rasterLayers=layersObjects;

            }, function (error) {
                // This is called when error occurs.
            }
        );

        vectorLayerSettings.then(function (value) {
                var layersObjects = value.objects;
                $.each(layersObjects, function (index, element) {
                    var title = element.title;
                    if (element.title.length > 22) {
                        title = element.title.substring(0, 25) + "...";
                    }
                });
                $scope.vectorLayers=layersObjects;
            }, function (error) {
                // This is called when error occurs.
            }
         );

        baseLayerSettings.then(function (data) {
            $scope.baseLayers=data.objects;
            angular.forEach(data.objects,function (layer) {
                if(layer.is_base_layer=='1') $scope.customBaseMap=layer.id;
            });
        },function (error) {
            console.log(error)
        });

        function checkSelectedLayerAttrhave(uuid) {
            var addressColumnsStatus = SettingsService.getAddressAttributes(uuid);
    
            addressColumnsStatus.then(function (value) {
    
                    if (value.status == 'invalid') {
    
                        var columns = value.columns.toString().replaceAll(',', ', ');
    
                        $scope.layerStatusMsg = columns + " are missing!";
    
                    }
    
                }, function (error) {
                    // This is called when error occurs.
                }
            );
        }


        $scope.layerSettingSave = function (settingType,layerUUID) {
            var data = {
                'uuid': layerUUID,
                'settings_code': settingType
            };
            SettingsService.saveSystemSettings(data);
        };

        $scope.saveBaseMapLayer=function () {
            SettingsService.saveCustomBaseLayer({layer_ids : [$scope.customBaseMap]}).then(function (response) {
                console.log(response);
            },function (error) {
                console.log(error);
            })
        };

        $scope.changedValue = function () {
            checkSelectedLayerAttrhave($scope.addressGeocodeLayer);
        };

    }

    
})();
