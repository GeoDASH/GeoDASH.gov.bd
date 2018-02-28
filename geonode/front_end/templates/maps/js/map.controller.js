(function() {
    appModule
        .controller('MapController', MapController);

    MapController.$inject = ['mapService', '$window', 'analyticsService', 'LayerService', '$scope', 'layerService', 'queryOutputFactory', '$rootScope'];

    function MapController( mapService, $window, analyticsService, LayerService, $scope, oldLayerService, queryOutputFactory, $rootScope) {
        var self = this;
        var re = /\d*\/embed/;
        var map = mapService.getMap();
        self.MapConfig = $window.mapConfig;

        mapService.setMapName(self.MapConfig.about.title);
        mapService.setId(self.MapConfig.id);
        mapService.setMeta(self.MapConfig.about);

        function setLayers() {
            self.MapConfig.map.layers.forEach(function(layer) {
                var url = self.MapConfig.sources[layer.source].url;
                if (url) {
                    layer.geoserverUrl = re.test($window.location.pathname) ? getCqlFilterUrl(url) : url;
                    mapService.addDataLayer(oldLayerService.map(layer), false);
                }
            });
        }

        function errorFn() {

        }

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

        $scope.group = { "a": "AND", "rules": [] };
        $scope.getQueryResult = function() {
            var query = queryOutputFactory.getOutput($scope.group);
            $rootScope.$broadcast('filterDataWithCqlFilter', query);
        };

        function getGeoServerSettings() {
            self.propertyNames = [];
            LayerService.getGeoServerSettings()
                .then(function(res) {
                    self.geoServerUrl = res.url;
                    setLayers();
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
        analyticsService.saveGISAnalyticsToLocalStorage({name : 'Rudra'});

        // var postAnalyticsData=setInterval( function(){ 
        //     analyticsService.postGISAnalyticsToServer('/');
        //  }, 2000);

        (getGeoServerSettings)();
        var keyPointerDrag, keyPostRender, keyChangeResolution;
        (function() {


            // if (re.test($window.location.pathname)) {
            //     //Do not need analytics in share map
            //     return;
            // }

            keyPostRender = map.on('postrender', function(evt) {
                var user_href = window.location.href.split('/');
                var map_info = user_href[user_href.length - 2];
                var user_location = JSON.parse(localStorage.getItem("user_location"));
                var url = '/analytics/api/map/load/create/';
                var latitude;
                var longitude;
                try {
                    latitude = user_location.latitude.toString();
                    longitude = user_location.longitude.toString()
                } catch (err) {
                    latitude = "";
                    longitude = "";
                }
                var data = {
                    'user': user_info,
                    'map': map_info,
                    'latitude': latitude,
                    'longitude': longitude,
                    'agent': '',
                    'ip': ''
                };
                analyticsService.saveAnalytics(data, url);
            });
            // Map drag / pan event
            keyPointerDrag = map.on('pointerdrag', function(evt) {
                var user_location = JSON.parse(localStorage.getItem("user_location"));

                var url = '/analytics/api/user/activity/create/';

                var latitude;
                var longitude;
                try {
                    latitude = user_location.latitude.toString();
                    longitude = user_location.longitude.toString()
                } catch (err) {
                    latitude = "";
                    longitude = "";
                }

                var user_href = window.location.href.split('/');
                var map_info = user_href[user_href.length - 2];

                var data = {
                    'user': user_info,
                    'layer': layer_info,
                    'map': map_info,
                    'activity_type': 'pan',
                    'latitude': latitude,
                    'longitude': longitude,
                    'agent': '',
                    'ip': '',
                    'point': ''
                };

                analyticsService.saveAnalytics(data, url);

            });

            //zoom in out event
            keyChangeResolution = map.getView().on('change:resolution', function(evt) {

                var zoomType;
                var user_location = JSON.parse(localStorage.getItem("user_location"));

                var url = '/analytics/api/user/activity/create/';

                var latitude = '';
                var longitude = '';

                // Zoom in
                if (evt.oldValue > evt.currentTarget.getResolution()) {
                    //console.log("Zoom in called");
                    zoomType = 'zoom-in';
                }

                // Zoom out
                if (evt.oldValue < evt.currentTarget.getResolution()) {
                    //console.log("Zoom out called");
                    zoomType = 'zoom-out';
                }

                try {
                    latitude = user_location.latitude.toString();
                    longitude = user_location.longitude.toString();
                } catch (err) {
                    latitude = "";
                    longitude = "";
                }

                var user_href = window.location.href.split('/');
                var map_info = user_href[user_href.length - 2];

                var data = {
                    'user': user_info,
                    'layer': layer_info,
                    'map': map_info,
                    'activity_type': zoomType,
                    'latitude': latitude,
                    'longitude': longitude,
                    'agent': '',
                    'ip': '',
                    'point': ''
                };

                analyticsService.saveAnalytics(data, url);
            });
        });

        $scope.$on("$destroy", function() {
            ol.Observable.unByKey(keyPointerDrag);
            ol.Observable.unByKey(keyPostRender);
            ol.Observable.unByKey(keyChangeResolution);
            clearInterval(postAnalyticsData);
        });
    }

})();