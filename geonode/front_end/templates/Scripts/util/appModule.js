﻿var appModule = angular.module("appModule", ['repositoryModule', 'mapModule', 'ui.bootstrap', 'tree', 'colorpicker.module', 'app.helpers', 'surfToastr', 'handsOnTableModule',
'app.filters', 'truncateModule', 'checkboxAll', 'colorPalette', 'table.heightAdjuster', 'angularFileUpload', 'userProfileModule', 'csvImport', 'ngDragDrop', 'Jantrik.Event', 'ngCookies', 'LayerApp', 'SystemSettingsApp','app.helpers','ui.grid', 'ui.grid.selection', 'ui.grid.cellNav','ui.grid.autoResize','ui.grid.pagination', 'sarsha.spinner','rzModule'
])
.config(function($httpProvider, $interpolateProvider) {
// $httpProvider.defaults.withCredentials = true;
$interpolateProvider.startSymbol('[{');
$interpolateProvider.endSymbol('}]');
$httpProvider.interceptors.push('spinnerHttpInterceptor');
})
.run(['$rootScope', '$window', '$timeout', '$http', 'mapRepository', 'mapService', 'dirtyManager', 'surfToastr', 'urlResolver', 'userProfileService', 'mapAccessLevel', '$modal', 'layerService', 'interactionHandler', 'GeoLocationTool', 'LocationSearchTool', 'ActiveLayerTool', 'AllSelectableLayerTool', 'google', 'SurfMap', 'layerRenderingModeFactory', 'ZoomTrackerTool', 'ZoomToLayerTool', 'BaseMapTool', 'reprojection', 'mapTools', 'mapToolsFactory', 'onZoomHandler', '$cookies', 'LayerService','jantrik.Event',
function($rootScope, $window, $timeout, $http, mapRepository, mapService, dirtyManager, surfToastr, urlResolver, userProfileService, mapAccessLevel, $modal, layerService, interactionHandler, GeoLocationTool, LocationSearchTool, ActiveLayerTool, AllSelectableLayerTool, google, SurfMap, layerRenderingModeFactory, ZoomTrackerTool, ZoomToLayerTool, BaseMapTool, reprojection, mapTools, mapToolsFactory, onZoomHandler, $cookies, LayerService,Event) {
    urlResolver.setGeoserverRoot($window.GeoServerHttp2Root, $window.GeoServerTileRoot);

    var count = 0;
    function animating(){
        if(count === 0){
            // $("#panel-bottom").slideDown();
            // $('#panel-bottom').css("top", "");
            document.getElementById('panel-bottom').className = 'panel-bottom slideInUp'; 
            count++;
        }else{
            document.getElementById('panel-bottom').className = 'panel-bottom slideOutDown';
            // $("#panel-bottom").slideUp();
            // $('#panel-bottom').css("top", "");
            count--;
            }
    }
    $rootScope.showAttributeGrid = function() {
   
        $timeout(function(){

            // $( "#panel-bottom" ).removeClass( "slideOutDown" );
            animating();

        });
    };
    $rootScope.showPrintingProperties = false;
    $rootScope.closePrintPreview = function () {
        $rootScope.showPrintingProperties = false;
    };

    var navAnCount = 0; 
    function naVAnimating(){
        if(navAnCount === 0){
            // $("#panel-bottom").slideDown();
            // $('#panel-bottom').css("top", "");
            document.getElementById('gd-navbar').className = 'navbar navbar-fixed-top headerSlideOutDown'; 
            navAnCount++;
        }else{
            document.getElementById('gd-navbar').className = ' navbar navbar-fixed-top headerSlideInUp ';
            // $("#panel-bottom").slideUp();
            // $('#panel-bottom').css("top", "");
            navAnCount--;
            }
    }

    $rootScope.navBarAnimation = function() {
             $timeout(function(){
                 // $( "#panel-bottom" ).removeClass( "slideOutDown" );
                 naVAnimating();
     
             });
         };


    

    $rootScope.showProperties = function(selectedTabIndex) {

        if (!mapAccessLevel.isWritable || !mapTools.activeLayer.hasActiveLayer() || mapTools.activeLayer.getActiveLayer().IsRaster) {
            return;
        }
        var layer = mapTools.activeLayer.getActiveLayer();
        var attrDefs = layer.getAttributeDefinition();

        $modal.open({
            templateUrl: '/static/Templates/LayerProperties.html',
            controller: 'layerPropertiesCtrl',
            windowClass: 'properties-modal',
            backdrop: 'static',
            keyboard: false,
            resolve: {
                data: function() {
                    var fields = new Array();
                    for (var key in attrDefs) {
                        var field = angular.copy(attrDefs[key]);
                        field.Status = 'unchanged';
                        fields.push(field);
                    }
                    return { fields: fields, selectedTabIndex: selectedTabIndex };
                },
                inputData: function() {
                    return {
                        attributes: (function() {
                            var attributes = [];
                            for (var i = 0; i < attrDefs.length; i++) {
                                attributes.push({ id: attrDefs[i].Id, name: attrDefs[i].Name, type: attrDefs[i].Type });
                            }
                            return attributes;
                        })(),
                        layerId: layer.getId()
                    };
                },
                settingsData: function() {
                    return angular.copy(layer.getClassifierDefinitions());
                },
                layer: function() {
                    return layer;
                }
            }
        }).result.then(function(result) {
            var updatedLayer = result.updatedNode.layer;
            var originalLayer = mapService.getLayer(updatedLayer.id);
            var classifierDirty = (function() {
                var oldClassifier = originalLayer.getClassifierDefinitions();
                if (!oldClassifier.selectedField && !result.classifierDefinitions.selectedField) {
                    return false;
                }
                return !angular.equals(oldClassifier, result.classifierDefinitions);
            })();

            function isAttributeDeleted(attributeId) {
                for (var i in result.updatedNode.fields) {
                    var field = result.updatedNode.fields[i];
                    if (field.Status !== 'deleted' && field.Id === attributeId) {
                        return false;
                    }
                }
                return true;
            }

            var classifierAttributeDeleted = (function() {
                var selectedFieldId = result.classifierDefinitions.selectedField;
                if (!selectedFieldId) {
                    return false;
                }

                if (isAttributeDeleted(selectedFieldId)) {
                    result.classifierDefinitions.selectedField = undefined;
                    result.classifierDefinitions.selected = [];
                    return true;
                }

                return false;
            })();

            var labelChanged = (function checkLabelAttributeExists() {
                if (!updatedLayer.style.labelConfig || !updatedLayer.style.labelConfig.attribute) return false;
                var deleted = isAttributeDeleted(updatedLayer.style.labelConfig.attribute);
                if (deleted) {
                    updatedLayer.style.labelConfig.attribute = undefined;
                    return true;
                }
                return false;
            })();

            // if (result.propertiesChanged || labelChanged) {
                updatedLayer.style.classifierDefinitions = result.classifierDefinitions;
                updatedLayer.style.advancedRules=result.advancedRules || [];
                layerService.saveProperties(originalLayer, updatedLayer.name, updatedLayer.zoomlevel, updatedLayer.style, false)
                .then(function() {
                    surfToastr.success('Style Saved Successfully', 'Success');
                    // saveClassificationOnNeed();
                    // $rootScope.$broadcast('layerPropertiesChanged', { layer: layer });
                },function(res) {
                    surfToastr.error('Style Save Failed. Reason: ' + res, 'Error!');                    
                    // saveClassificationOnNeed();
                });
            // } else {
            //     saveClassificationOnNeed();
            // }

            if (result.fieldChanged) {
                layerService.saveAttributeDefinitions(originalLayer, result.updatedNode.fields);
            }

            // function saveClassificationOnNeed() {
            //     if (classifierDirty || classifierAttributeDeleted) {
            //         layerService.saveClassifierDefinitions(originalLayer, result.classifierDefinitions, false, false, true);
            //     }
            // }
        });
    };

    $rootScope.attributeTableOptions = {
        isDirty: false,
        showProperties: $rootScope.showProperties
    };
    var maxExtent= ol.proj.transformExtent([88.0105667114258, 21.1280899047852, 92.6736602783204, 26.6343994140626], ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));
    var centerExtent=ol.extent.getCenter(maxExtent);
    buildObjectGraph();
    if (!mapAccessLevel.isPrivate) {
        mapService.loadPublicMap(mapAccessLevel.publicId);
    } else {
        // signalRManager.manageSignalR(urlResolver.resolve('Map', 'ShowMultipleTabMessage', { returnUrl: "Index" }), window.Username);
        mapService.loadWorkingMap();
    }

    $window.onbeforeunload = function() {
        if (!mapAccessLevel.isPrivate) {
            return null;
        }
        if (dirtyManager.isDirty() && !window.isAutoLeave) {
            return "You have unsaved changes in your map";
        } else {
            return null;
        }
    };

    $rootScope.bodyClicked = function() {
        jantrik.EventPool.broadcast("bodyClicked");
    };

    mapTools.activeLayer.events.register('changed', function (newActiveLayer) {
        $rootScope.layerId = mapTools.activeLayer.getActiveLayer().getId();
    });

    $rootScope.$on('featureAttributeSelectionChanged', function(event, info) {
        mapService.setFeatureSelected(fid, info.isSelected);
    });

    $(document).ajaxError(function(event, jqXHR) {
        var responseData;
        try {
            responseData = JSON.parse(jqXHR.responseText);
        } catch (e) {
            responseData = jqXHR.responseText;
        }
        switch (jqXHR.status) {
            case 403:
                if (responseData.SubscriptionFailed) {
                    if (responseData.SubscriptionType === "DownloadLimit") {
                        // redirect
                    } else {
                        surfToastr.error(responseData.Message, appMessages.toastr.upgradeRequiredTitle());
                    }
                }
                break;
            default:
        }
    });

    maintenanceMessageManager.ShowMessageIfPossible();

    $("#map_canvas,#attribute-table").click(function(event) {
        event.stopPropagation();
    });

    function buildObjectGraph() {

        var olMap = createMap('olmap');
        var gMap = new google.maps.Map(document.getElementById('gmap'), {
            disableDefaultUI: true,
            keyboardShortcuts: false,
            draggable: false,
            disableDoubleClickZoom: true,
            scrollwheel: false,
            streetViewControl: false,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            zoom: 6,
            center:  ol.proj.transform(centerExtent,ol.proj.get('EPSG:3857'), ol.proj.get('EPSG:4326')).reverse(),
            tilt: 0
        });

        var surfMap = new SurfMap(olMap);

        mapService.setSurfMap(surfMap);
        mapService.olMap = olMap;

        layerRenderingModeFactory.initialize(surfMap, olMap);
        mapToolsFactory.initialize(surfMap, olMap, gMap);

        mapTools.geoLocation = mapToolsFactory.createGeoLocationTool(olMap.getView());
        mapTools.search = mapToolsFactory.createLocationSearchTool();

        if (mapAccessLevel.isEmbedded) {
            mapTools.allSelectableLayer = mapToolsFactory.createAllSelectableLayerTool();
        } else {
            mapTools.activeLayer = mapToolsFactory.createActiveLayerTool(interactionHandler);
            mapTools.zoomToLayer = mapToolsFactory.createZoomToLayerTool();
        }

        mapTools.zoomTracker = mapToolsFactory.createZoomTrackerTool();
        mapTools.baseMap = mapToolsFactory.createBaseMapTool();
        mapTools.navigationHistory = mapToolsFactory.createNavigationHistoryTool();
        mapTools.zoomInOutTool = mapToolsFactory.createZoomInOutTool();
        mapTools.selectFeature = mapToolsFactory.createSelectFeatureTool();
        mapTools.zoomToMaxExtentTool = mapToolsFactory.createZoomToMaxExtentTool();
        mapTools.zoomToExtentTool = mapToolsFactory.createZoomToExtentTool();
        mapTools.measurementTool = mapToolsFactory.createMeasurementTool();
        mapTools.setMarkerTool = mapToolsFactory.createSetMarkerTool();
        mapTools.circleDrawTool=mapToolsFactory.createCircleDrawTool();
        mapTools.boxDrawTool=mapToolsFactory.createBoxDrawTool();
        onZoomHandler.activate(olMap);

        if (mapAccessLevel.isPrivate) {
            mapTools.baseMap.events.register('changed', function(newLayerName) {
                mapService.saveBaseLayerName(newLayerName);
            });
        }
    }

    function createMap(mapContainerId) {
        var attributionControl = new ol.control.Attribution({
            collapsible: false
        });
        var controls = ol.control.defaults({ attribution: false }).extend([
            attributionControl,
            new ol.control.ScaleLine(),
            new ol.control.MousePosition({
                coordinateFormat: function(coordinate) {
                    return ol.coordinate.format(coordinate, '{y}° N, {x}° E', 4);
                },
                projection: 'EPSG:4326',
                undefinedHTML: ''
            })
        ]);
        var view = new ol.View({
            minZoom: 6,
            maxZoom: 21,
            projection: 'EPSG:3857',
            center: centerExtent,
            extent:maxExtent,
            zoom: 6
        });

        var _bottomLayers = new ol.layer.Group();
        var _midLayers = new ol.layer.Group();
        var _topLayers = new ol.layer.Group();

        var map = new ol.Map({
            target: mapContainerId,
            controls: controls,
            view: view,
            layers: [
                _bottomLayers, _midLayers
            ]
        });

        map.bottomLayers = _bottomLayers;
        map.midLayers = _midLayers;
        map.topLayers = _topLayers;

        return map;
    }
}
]);

appModule.controller('appController', [
'$scope', 'mapService', '$modal', '$timeout', 'mapAccessLevel', 'interactionHandler',
function($scope, mapService, $modal, $timeout, mapAccessLevel, interactionHandler) {
mapService.setId(undefined);

$scope.mapService = mapService;
$scope.mapAccessLevel = mapAccessLevel;

var sidePaneStyles = {
    false: {
        width: '28px;'
    },
    true: {
        width: '248px'
    }
};

var centerPaneLeft = {
    true: '261px',
    false: '42px'
};

var centerPaneRight = {
    true: {
        true: '261px',
        false: '42px'
    },
    false: {
        true: '5px',
        false: '5px'
    }
};

function updateStyles() {
    layout.leftStyle = sidePaneStyles[layout.leftVisible];
    layout.rightStyle = sidePaneStyles[layout.rightVisible];
    layout.centerStyle = {
        left: centerPaneLeft[layout.leftVisible],
        right: centerPaneRight[!layout.isRightPaneHidden][layout.rightVisible]
    };

    $timeout(function() {
        mapService.updateSize();
    });
}

$scope.isEditing = function() {
    return interactionHandler.isEditing();
};

$scope.isTracking = function() {
    return mapTools.geoLocation.isActive();
};

var layout = {
    isEmbedded: mapService.isEmbedded(),
    setLeftVisible: function(visible) {
        this.leftVisible = visible;
        updateStyles();
    },
    setRightVisible: function(visible) {
        this.rightVisible = visible;
        updateStyles();
    },
    isRightPaneHidden: true
};

$scope.layout = layout;

if (!mapAccessLevel.isEmbedded) {
    layout.setLeftVisible(true);
    layout.setRightVisible(true);
} else {
    layout.centerStyle = {
        left: '0',
        right: '0',
        top: '0',
        bottom: '0',
        padding: '0',
        border: 'none'
    };

    $timeout(function() {
        mapService.updateSize();
    });
}

$scope.viewMapInfo = function() {
    $modal.open({
        templateUrl: 'static/Templates/mapInfoDialog.html',
        backdrop: 'static',
        keyboard: false,
        scope: $scope
    });
};

mapService.events.register('infoLoaded', function(info) {
    $scope.layout.isRightPaneHidden = $scope.mapAccessLevel.isPublic && info.PropertyInPopup;
    updateStyles();
});
}
]);

appModule.directive('draftOnly', ['mapAccessLevel',
function(mapAccessLevel) {
return {
    restrict: 'A',
    link: function(scope, element) {
        if (!mapAccessLevel.isWritable) {
            if (element.is('input,select')) {
                element.prop('disabled', true);
            } else {
                element.remove();
            }
        }
    }
};
}
]);

appModule.value('fidColumnName', 'gid')
.value('geometryColumnName', 'geom')
.value('imageColumnName', 'surfimages')
.value('imageUrlRoot', '/Data/Image/')
.value('imageFileExtension', '.jpeg')
.value('defaultDateFormat', 'dd MMM, yyyy')
.value('defaultDateTimeFormat', 'dd MMM, yyyy h:m:s.sss a');

appModule.directive("limitToMax", function () {
    return {
        link: function (scope, element, attributes) {
            element.on("keydown keyup", function (e) {
                if (Number(element.val()) > Number(attributes.ngMax) &&
                    e.keyCode != 46 // delete
                    &&
                    e.keyCode != 8 // backspace
                ) {
                    e.preventDefault();
                    element.val(attributes.ngMax);
                }
            });
        }
    };
});

appModule.directive("limitToMin", function () {
    return {
        link: function (scope, element, attributes) {
            element.on("keydown keyup", function (e) {
                if (Number(element.val()) < Number(attributes.ngMin) &&
                    e.keyCode != 46 // delete
                    &&
                    e.keyCode != 8 // backspace
                ) {
                    e.preventDefault();
                    element.val(attributes.ngMin);
                }
            });
        }
    };
});