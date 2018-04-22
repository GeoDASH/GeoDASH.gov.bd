(function() {
    appModule
        .controller('MapController', MapController);

    MapController.$inject = ['mapService', '$window', 'analyticsService', 'LayerService', '$scope', 'layerService', 'queryOutputFactory', '$rootScope','$interval','urlResolver','mapTools','layerRepository','$q','SurfFeature','$timeout'];

    function MapController( mapService, $window, analyticsService, LayerService, $scope, oldLayerService, queryOutputFactory, $rootScope,$interval,urlResolver,mapTools,layerRepository,$q,SurfFeature,$timeout) {
        var self = this;
        var re = /\d*\/embed/;
        var map = mapService.getMap();
        self.MapConfig = $window.mapConfig;
        $scope.properties=[];
        $scope.featureList=[];
        $scope.currentIndex=undefined;
        $scope.enableVisualizationTool=false;
        $scope.toggleVisualizationTool=function () {
            $scope.enableVisualizationTool=!$scope.enableVisualizationTool;
        };

        function parseId(olFeature) {
            var idParts = (olFeature.getId() || '.').split('.');
            return {dataId: idParts[0], fid: idParts[1]};
        }

        function getFeature(event) {
            var deferred = $q.defer();
            var layers = mapService.getLayers();
            var dataIds = [];
            var styleIds = [];
            angular.forEach(layers, function (sl) {
                if (sl.IsVisible) {
                    dataIds.push(sl.LayerId);
                    styleIds.push(sl.getStyleName());
                }
            });
            if (dataIds.length === 0) return;
            var size = map.getSize();
            var bbox = map.getView().calculateExtent(size);
            var layersParamValue = dataIds.join(',');
            var urlParams = {
                service: 'wms',
                version: '1.1.0',
                request: 'GetFeatureInfo',
                layers: layersParamValue,
                query_layers: layersParamValue,
                styles: styleIds.join(','),
                srs: 'EPSG:3857',
                bbox: bbox.join(','),
                width: size[0],
                height: size[1],
                info_format: 'application/json',
                exceptions: 'application/json',
                feature_count: 100,
                x: Math.round(event.pixel[0]),
                y: Math.round(event.pixel[1])
            };


            var wmsSource = $window.GeoServerTileRoot + '?access_token=' + $window.mapConfig.access_token;

            layerRepository.getWMS(wmsSource, urlParams).then(function (response) {
                var geoJson = response;
                geoJson.features.map(function (feature) {
                    if (!feature.geometry) {
                        feature.geometry = {
                            type: "MultiPolygon",
                            coordinates: [],
                            geometry_name: 'the_geom'
                        };
                    }
                });
                var parser = new ol.format.GeoJSON();
                var olFeatures = parser.readFeatures(geoJson);
                var featureList= olFeatures.map(function (of) {
                    var id = parseId(of);
                    var lookup = {};
                    for (var key in layers) {
                        if (layers.hasOwnProperty(key)) {
                            lookup[layers[key].DataId] = layers[key];
                        }
                    }
                    var surfLayer = lookup[id.dataId];
                    var surfFeature = new SurfFeature(of, surfLayer);
                    return {
                        surfFeature: surfFeature,
                        olFeature: of
                    };
                });
                deferred.resolve(featureList);

            }).catch(function () {

            });
            return deferred.promise
        }

        function adjustPopupPosition(map, coordinate,event) {
                var center = map.getView().getCenter();
                //var pixelPosition = map.getPixelFromCoordinate([coordinate[0], coordinate[1]]);
                var pixelPosition = event.pixel;
                var mapWidth = $("#map_canvas").width();
                var mapHeight = $("#map_canvas").height();
                var popoverHeight = $(".property-grid-overlay").height();
                var popoverWidth = $(".property-grid-overlay").width();
                var thresholdTop = popoverHeight + 50;
                var thresholdBottom = mapHeight;
                var thresholdLeft = popoverWidth / 2 - 80;
                var thresholdRight = mapWidth - popoverWidth / 2 - 130;
                var newX, newY;
                if (pixelPosition[0] < thresholdLeft || pixelPosition[0] > thresholdRight || pixelPosition[1] < thresholdTop || pixelPosition[1] > thresholdBottom) {

                    if (pixelPosition[0] < thresholdLeft) {
                        newX = pixelPosition[0] + (thresholdLeft - pixelPosition[0]);
                    } else if (pixelPosition[0] > thresholdRight) {
                        newX = pixelPosition[0] - (pixelPosition[0] - thresholdRight);
                    } else {
                        newX = pixelPosition[0];
                    }
                    if (pixelPosition[1] < thresholdTop) {
                        newY = pixelPosition[1] + (thresholdTop - pixelPosition[1]);
                    } else if (pixelPosition[1] > thresholdBottom) {
                        newY = pixelPosition[1] - (pixelPosition[1] - thresholdBottom);
                    } else {
                        newY = pixelPosition[1];
                    }
                    var newCoordinate = map.getCoordinateFromPixel([newX, newY]);
                    var newCenter = [(center[0] - (newCoordinate[0] - coordinate[0])), (center[1] - (newCoordinate[1] - coordinate[1]))];
                    var pan = ol.animation.pan({
                        duration: 500,
                        source: map.getView().getCenter()
                    });
                    map.beforeRender(pan);
                    map.getView().setCenter(newCenter);
                }
            }


        var overlay;
        var container, content, close, popup;

        function featureIdentifier(event) {
            $scope.currentIndex=undefined;
            $scope.properties=[];
            if(!overlay){
                container = document.getElementById('property-grid-in-overlay');
                    // content = document.getElementById('route-popup-content');
                    var closer = document.getElementById('attribute-popup-closer');
                    container.style.visibility = 'none';

                     overlay = new ol.Overlay({
                        element: container,
                        autoPan: true,
                        autoPanAnimation: {
                            duration: 250
                        }
                    });
                closer.onclick = function (e) {
                    overlay.setPosition(undefined);
                    closer.blur();
                    return false;
                };
                map.addOverlay(overlay);
            }else {
                overlay.setPosition(undefined);
            }

            getFeature(event).then(function (response) {
                    $scope.featureList=response;
                    if($scope.featureList){
                        if($scope.featureList.length>0){
                            $scope.currentIndex=0;
                            $scope.properties=response[0].surfFeature.getAttributesWithType();
                        }else {
                            $scope.currentIndex=undefined;
                            $scope.properties=[];
                        }
                    }
                    var coordinate = map.getCoordinateFromPixel(event.pixel);
                    overlay.setPosition(coordinate);
                    container.style.visibility = 'visible';
                    $timeout(function () {
                        adjustPopupPosition(map, coordinate,event);
                    });
            },function (error) {
                    console.log(error);
            });
        }


        $scope.enableFeatureIdentification=false;
        $scope.enableFeatureIdentifier=function () {
            $scope.enableFeatureIdentification=true;
            map.on('singleclick', featureIdentifier);
        };
        $scope.disableFeatureIdentifier=function () {
            map.un('singleclick', featureIdentifier);
            if(overlay){
                map.removeOverlay(overlay);
                overlay=undefined;
                container=undefined;
            }
            $scope.enableFeatureIdentification=false;
        };

        $scope.getPreviousFeature=function () {
            $scope.currentIndex=$scope.currentIndex-1;
            $scope.properties=$scope.featureList[$scope.currentIndex].surfFeature.getAttributesWithType();
        };
        $scope.getNextFeature=function () {
            $scope.currentIndex=$scope.currentIndex+1;
            $scope.properties=$scope.featureList[$scope.currentIndex].surfFeature.getAttributesWithType();
        };

        mapService.setMapName(self.MapConfig.about.title);
        mapService.setId(self.MapConfig.id);
        mapService.setMeta(self.MapConfig.about);
        var extent = ol.extent.createEmpty();//[6374578.927979095, 1571802.0022168788, 12753707.560546765, 4100950.3941167905]; // ;
        function setLayers() {
            self.MapConfig.map.layers.forEach(function(layer, ind) {
                var url = self.MapConfig.sources[layer.source].url;
                if (url) {
                    layer.geoserverUrl = re.test($window.location.pathname) ? getCqlFilterUrl(url) : url;
                    mapService.addDataLayer(oldLayerService.map(layer, ind), true);
                   extent= ol.extent.extend(extent, layer.bbox);
                }
            });
            if(ol.extent.isEmpty(extent)) extent=[6374578.927979095, 1571802.0022168788, 12753707.560546765, 4100950.3941167905];
            var center=ol.extent.getCenter(extent);
            $timeout(function () {
                var pan = ol.animation.pan({
                    duration: 10000,
                    source: (map.getView().getCenter()),
                    start: +new Date()
                });
                var zoom = ol.animation.zoom({duration: 10000, resolution: map.getView().getResolution()});
                map.beforeRender(pan, zoom);
                map.getView().fit(extent,map.getSize());
            },3000);
        }

        function errorFn() {

        }
        var heatMapLayer=undefined;
        $scope.isHeatMapVisible=false;

        function getheatMapCQLFilter(){
            var data=getMapOrLayerLoadNonGISData();
            if(isLayerPage()){
                return 'layer_id = '+ data.id;
            }else
                return 'map_id = '+ data.id;
        }

        function addHeatMapLayer(visibility){
            var cqlFilter=getheatMapCQLFilter();
            heatMapLayer=new ol.layer.Image({
                source: new ol.source.ImageWMS({
                    url: urlResolver.resolveGeoserverTile(),
                    params: {
                        LAYERS: 'geonode:analytics_pinpointuseractivity',
                        FORMAT: 'image/png',
                        TRANSPARENT: true,
                        CQL_FILTER: cqlFilter
                    }
                }),
                visible: true
            });
            map.addLayer(heatMapLayer);
            $scope.isHeatMapVisible=true;
        }

        $scope.addHeatMap=function(){
            if(angular.isUndefined(heatMapLayer)){
                addHeatMapLayer(true);
            }else{
                heatMapLayer.setVisible(!$scope.isHeatMapVisible);
                $scope.isHeatMapVisible=!$scope.isHeatMapVisible;
            }
        };
        $scope.changeStyle = function(layerId, styleId) {
            var layer = mapService.getLayer(layerId);
            if (styleId) {
                LayerService.getStyle(styleId)
                    .then(function(res) {
                        layer.setStyle(res);
                        layer.refresh();
                    });
            } else {
                layer.setStyle(LayerService.getNewStyle());
                layer.refresh();
            }
        };
        $scope.isBoundaryBoxEnabled=true;
        $scope.group = { "a": "AND", "rules": [] };
        $scope.getQueryResult = function() {
            var query = queryOutputFactory.getOutput($scope.group);
            $rootScope.$broadcast('filterDataWithCqlFilter', {query: query,bbox:$scope.isBoundaryBoxEnabled});
        };
        $scope.disableQuery=function(){
            $rootScope.$broadcast('reloadAttributeGrid', "");
            $scope.group = { "a": "AND", "rules": [] };
        };
        $scope.$watch(function() {
            return $rootScope.layerId;
        }, function() {
            if ($rootScope.layerId)
            $scope.group = { "a": "AND", "rules": [] };
        });
        
        function getGeoServerSettings() {
            self.propertyNames = [];
            LayerService.getGeoServerSettings()
                .then(function(res) {
                    self.geoServerUrl = res.url;
                    $timeout(setLayers,0);
                    // setLayers();
                }, errorFn);
        }

        function getCqlFilterUrl(url) {
            var param = window.location.search.split('?').pop();
            if (url && param) {
                var urlParts = url.split('?');
                var filter = 'CQL_FILTER=' + param.replace(/=/gi, '%3D');
                if (urlParts.length == 1) {
                    url = urlParts[0] + '?' + filter;
                } else {
                    url += '&' + filter;
                }
            }
            return url;
        }

        var mapId = window.location.pathname.split('/').pop();
        function isLayerPage(){
            return /\/layers\//g.test(window.location.pathname);
         }

         function getMapId(){
            return self.MapConfig.id;
         }

        function getMapOrLayerLoadNonGISData(){
            var data={
                id : isLayerPage() ? layer_info : getMapId(),
                content_type : isLayerPage() ? "layer" : "map",
                activity_type: "load",
                latitude : "",
                longitude : ""
            };
            return data;
        }
        var analyticsNonGISUrl="api/analytics/non-gis/";

        function postMapOrLayerLoadData(){
            var loadData=getMapOrLayerLoadNonGISData();
            if(parseInt(loadData.id)){
                analyticsService.postNonGISData(analyticsNonGISUrl,loadData).then(function(response){
            
                },function(error){
                    console.log(error);
                });
            }
        }        

        var analyticsGISUrl='api/analytics/gis/';
        var postAnalyticsData=$interval( function(){ 
            analyticsService.postGISAnalyticsToServer(analyticsGISUrl);
         }, 60000);
         postMapOrLayerLoadData();

        (getGeoServerSettings)();
        var keyPointerDrag, keySingleClick, keyChangeResolution,keyMoveEnd;
        (function() {

            
            function getAnalyticsGISData(coordinateArray,activityType){
                var data={
                    layer_id:undefined,
                    map_id:undefined,
                    activity_type : activityType,
                    latitude: coordinateArray[1],
                    longitude : coordinateArray[0]
                };
                return data;
            }

            function setMapAndLayerId(analyticsData){
                if(isLayerPage()){
                    analyticsData.layer_id=layer_info;
                }else{
                    analyticsData.map_id=getMapId();
                }
                return analyticsData;
            }

            var resolutionChanged=false;

            function onMoveEnd(evt) {
                if(resolutionChanged){
                    //to something
                    var mapCenter= ol.proj.transform(map.getView().getCenter(), 'EPSG:3857','EPSG:4326');
                    var analyticsData=getAnalyticsGISData(mapCenter,"zoom");
                    analyticsData=setMapAndLayerId(analyticsData);
                    resolutionChanged=false;
                    if(!isLayerPage()){
                        if(parseInt(analyticsData.map_id)){
                            analyticsService.saveGISAnalyticsToLocalStorage(analyticsData);
                        }
                    }else{
                        analyticsService.saveGISAnalyticsToLocalStorage(analyticsData);
                    }
                        
                }else{
                    var dragCoordinate=ol.proj.transform(map.getView().getCenter(), 'EPSG:3857','EPSG:4326');
                    var analyticsData=getAnalyticsGISData(dragCoordinate,"pan");
                    analyticsData=setMapAndLayerId(analyticsData);
                    if(!isLayerPage()){
                        if(parseInt(analyticsData.map_id)){
                            analyticsService.saveGISAnalyticsToLocalStorage(analyticsData);
                        }
                    }else{
                        analyticsService.saveGISAnalyticsToLocalStorage(analyticsData);
                    }
                }
              }

            // function onPointerDrag(evt){
            //     var dragCoordinate=ol.proj.transform(evt.coordinate, 'EPSG:3857','EPSG:4326');
            //     var analyticsData=getAnalyticsGISData(dragCoordinate,"pan");
            //     analyticsData=setMapAndLayerId(analyticsData);
            //     if(analyticsData.map_id!='new')
            //         analyticsService.saveGISAnalyticsToLocalStorage(analyticsData);
            // }
            function singleClick(evt){
                var clickCoordinate=ol.proj.transform(evt.coordinate, 'EPSG:3857','EPSG:4326');
                var analyticsData=getAnalyticsGISData(clickCoordinate,"click");
                analyticsData=setMapAndLayerId(analyticsData);
                if(!isLayerPage()){
                    if(parseInt(analyticsData.map_id)){
                        analyticsService.saveGISAnalyticsToLocalStorage(analyticsData);
                    }
                }else{
                    analyticsService.saveGISAnalyticsToLocalStorage(analyticsData);
                }
            }
            keyMoveEnd=map.on('moveend', onMoveEnd);
            // keyPointerDrag=map.on('pointerdrag', onPointerDrag);
            keyChangeResolution = map.getView().on('change:resolution', function(evt) {
                    resolutionChanged=true;
            });
            keySingleClick=map.on('singleclick', singleClick);
        })();

        $scope.$on("$destroy", function() {
            // ol.Observable.unByKey(keyPointerDrag);
            ol.Observable.unByKey(keySingleClick);
            ol.Observable.unByKey(keyChangeResolution);
            ol.Observable.unByKey(keyMoveEnd);
            $interval.cancel(postAnalyticsData);
        });
    }

})();