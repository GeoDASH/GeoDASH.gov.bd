mapModule.directive('routePopUpDirective', [
    'mapService', 'LayerService', '$timeout', 'mapToolsFactory', '$http', 'SurfMap', '$cookies', 'urlResolver', '$modal', '$q',
    function (mapService, LayerService, $timeout, mapToolsFactory, $http, SurfMap, $cookies, urlResolver, $modal, $q) {
        return {
            restrict: 'EA',
            scope: {},
            templateUrl: "/static/Templates/Tools/Map/routeDirectionOverlay.html",
            controller: [
                '$scope', '$rootScope', 'mapService', '$timeout', '$compile', 'surfToastr',
                function ($scope, $rootScope, mapService, $timeout, $compile, surfToastr) {
                    $scope.sourceCoordinates = [];
                    $scope.destinationCoordinates = [];
                    var sourceFeature = {};
                    var destinationFeature = {};
                    var routeFeature = {};
                    $scope.coordinate = [];
                    $scope.layers = [];
                    var container, content, closer, popup;
                    container = document.getElementById('route-popup');
                    content = document.getElementById('route-popup-content');
                    closer = document.getElementById('route-popup-closer');
                    container.style.visibility = 'none';

                    var overlay = new ol.Overlay({
                        element: container,
                        autoPan: true,
                        autoPanAnimation: {
                            duration: 250
                        }
                    });
                    var
                        vectorSource = new ol.source.Vector(),
                        vectorLayer = new ol.layer.Vector({
                            source: vectorSource
                        });

                    var sourceStyle = new ol.style.Style({
                        image: new ol.style.Icon({
                            anchor: [0.5, 46],
                            anchorXUnits: 'fraction',
                            anchorYUnits: 'pixels',
                            opacity: 0.75,
                            src: '/static/geonode/img/marker.png'
                        }),
                        text: new ol.style.Text({
                            font: '12px Calibri,sans-serif',
                            fill: new ol.style.Fill({color: '#000'}),
                            stroke: new ol.style.Stroke({
                                color: '#fff', width: 2
                            }),
                            text: 'Source'
                        })
                    });

                    var destinationStyle = new ol.style.Style({
                        image: new ol.style.Icon({
                            anchor: [0.5, 46],
                            anchorXUnits: 'fraction',
                            anchorYUnits: 'pixels',
                            opacity: 0.75,
                            src: '/static/geonode/img/marker.png'
                        }),
                        text: new ol.style.Text({
                            font: '12px Calibri,sans-serif',
                            fill: new ol.style.Fill({color: '#000'}),
                            stroke: new ol.style.Stroke({
                                color: '#fff', width: 2
                            }),
                            text: 'Destination'
                        })
                    });
                    $scope.show = false;
                    $scope.bufferArea = undefined;
                    $scope.showInput = function () {
                        $scope.show = !$scope.show;
                    };

                    var map = mapService.getMap();
                    map.getViewport().addEventListener('contextmenu', function (evt) {
                        $scope.layers = [];
                        var layers = mapService.getLayers();
                        angular.forEach(layers, function (data) {
                            if (data.ShapeType === 'point') {
                                $scope.layers.push(data);
                            }
                        });
                        var coordinate = map.getEventCoordinate(evt);
                        var html = '<ul class="list-group">\n' +
                            '                <button class="list-group-item" ng-click="call(true)" style="cursor: pointer" ng-hide="sourceCoordinates.length>0">Direction from here </button>\n' +
                            '                <button class="list-group-item" ng-click="call(false)" style="cursor: pointer" \n' + 'ng-show="sourceCoordinates.length>0">Direction to there </button>\n' +
                            '                <button class="list-group-item" ng-show="sourceCoordinates.length>0"> \n' +
                            '                    <div class="dropdown">\n' +
                            '                        <span class="dropbtn" style="cursor: pointer"\n' + '>Direction from layers</span>\n' +
                            '                        <div class="dropdown-content">\n' +
                            '                            <a style="cursor: pointer"ng-repeat="(key, value) in layers track by $index" \n' +
                            ' ng-click="routeFromLayer(value.Name)">[{value.Name}]</a>\n' +
                            '                        </div>\n' +
                            '                    </div>\n' +
                            '                </button>\n' +
                            '<button class="list-group-item" ng-click="showInput()" ng-show="sourceCoordinates.length>0" style="cursor: pointer">Set Layer Search Radius</button>\n' +
                            '<button class="list-group-item" style="cursor: default" ng-show="show && sourceCoordinates.length>0"> <div class="col-md-9"><div class="input-group"> <input type="number" ng-model="bufferArea" min="0" class="form-control" aria-describedby="basic-addon2"><span class="input-group-addon" id="basic-addon2">K.M.</span> </div></div><div class="col-md-3"><input type="button" ng-click="showInput()" class="btn btn-primary btn-sm" value="Save"></div></button>\n' +
                            '<button class="list-group-item" ng-show="sourceCoordinates.length>0" ng-click="resetAll()">Reset All</button>' +
                            '<button class="list-group-item" style="cursor: pointer"ng-click="searchForBuffer()">Buffer Search</button>' +
                            '            </ul>';
                        var linkFn = $compile(html);
                        var element = linkFn($scope);

                        $timeout(function () {
                            var myEl = angular.element(document.querySelector('#route-popup-content'));
                            myEl.empty();
                            myEl.append(element);
                            overlay.setPosition(coordinate);
                        });

                        $scope.coordinate = coordinate;
                        evt.preventDefault();
                        container.style.visibility = 'visible';
                    });

                    function showFeatures(params) {
                        var layers = mapService.getLayers();
                        var promises = [];
                        var layer_names = [];

                        for (var k in layers) {
                            var layer = layers[k];
                            if (!layer.IsVisible)
                                continue;
                            layer_names.push(k);

                            let p = LayerService.getWFS('api/geoserver/', Object.assign({}, params, {
                                typeNames: layer.getName()
                            }), false);
                            promises.push(p);
                        }

                        $q.all(promises)
                            .then(function (response) {
                                var data = {};
                                for (var i in layer_names) {
                                    data[layer_names[i]] = response[i].features.map(function (e) {
                                        e.properties["Feature_Id"] = e.id;
                                        return e.properties;
                                    });
                                }
                                showFeaturePreviewDialog(data, params);
                            });
                    }

                    function showFeaturePreviewDialog(data, wfsConfig) {
                        $modal.open({
                            templateUrl: '/static/layers/feature-preview.html',
                            controller: 'FeaturePreviewController as ctrl',
                            backdrop: 'static',
                            keyboard: false,
                            windowClass: 'fullScreenModal First',
                            resolve: {
                                data: function () {
                                    return data;
                                },
                                wfsConfig: function () {
                                    return wfsConfig;
                                }
                            }
                        });
                    }

                    $scope.searchForBuffer = function () {
                        var center = $scope.coordinate;
                        var centerLongLat = ol.proj.transform([center[0], center[1]], 'EPSG:3857', 'EPSG:4326');
                        var radius = 1000;
                        var params = {
                            version: '1.0.0',
                            request: 'GetFeature',
                            outputFormat: 'JSON',
                            srsName: 'EPSG:3857',
                            typeNames: '',
                            cql_filter: 'DWithin(the_geom,POINT(' + centerLongLat[0] + ' ' + centerLongLat[1] + '),' + radius + ',meters)',
                        };
                        showFeatures(params);
                        closer.onclick();
                    };

                    function addBlankOverlay() {
                        closer.onclick = function (e) {
                            overlay.setPosition(undefined);
                            closer.blur();
                            return false;
                        };
                        map.addOverlay(overlay);
                        overlay.setPosition(undefined);
                    }

                    function addBlankVectorLayer() {
                        map.addLayer(vectorLayer);
                    }

                    function inIt() {
                        addBlankOverlay();
                        addBlankVectorLayer();
                    }

                    inIt();

                    function addRoutePlyLine(origin, destination) {
                        var directionsService = new google.maps.DirectionsService();
                        var request = {
                            origin: origin,
                            destination: destination,
                            travelMode: 'DRIVING'
                        };
                        directionsService.route(request, function (response, status) {
                            if (status == 'OK') {
                                var polyline = response.routes[0].overview_polyline;
                                var route = /** @type {ol.geom.LineString} */ (new ol.format.Polyline({
                                    factor: 1e5
                                }).readGeometry(polyline, {
                                    dataProjection: 'EPSG:4326',
                                    featureProjection: 'EPSG:3857'
                                }));
                                if (!angular.equals(routeFeature, {}))
                                    vectorLayer.getSource().removeFeature(routeFeature);
                                routeFeature = new ol.Feature({
                                    type: 'route',
                                    geometry: route
                                });
                                routeFeature.setStyle(new ol.style.Style({
                                    stroke: new ol.style.Stroke({
                                        width: 6, color: [255, 0, 0, 0.8]
                                    })
                                }));
                                vectorSource.addFeature(routeFeature);
                            } else {
                                if (!angular.equals(routeFeature, {}))
                                    vectorLayer.getSource().removeFeature(routeFeature);
                                surfToastr.error('Google Map can not give you direction', 'Error');
                                routeFeature = {};
                            }
                        });
                    }

                    function addFeatureToVectorLayer(feature) {
                        vectorSource.addFeature(feature);
                    }

                    function removeFeature(feature) {
                        vectorLayer.getSource().removeFeature(feature);
                    }

                    $scope.call = function (bool) {
                        var feature = new ol.Feature(
                            new ol.geom.Point($scope.coordinate)
                        );
                        if (bool) {
                            $scope.sourceCoordinates = $scope.coordinate;
                            feature.setStyle(sourceStyle);
                            sourceFeature = feature;
                        } else {
                            if (!angular.equals(destinationFeature, {}))
                                removeFeature(destinationFeature);
                            $scope.destinationCoordinates = $scope.coordinate;
                            feature.setStyle(destinationStyle);
                            destinationFeature = feature;
                            var origin = ol.proj.transform(angular.copy($scope.sourceCoordinates), 'EPSG:3857', 'EPSG:4326').reverse().join(',');
                            var destination = ol.proj.transform(angular.copy($scope.destinationCoordinates), 'EPSG:3857', 'EPSG:4326').reverse().join(',');
                            addRoutePlyLine(origin, destination);
                        }
                        addFeatureToVectorLayer(feature);
                        closer.onclick();
                    };
                    var service = new google.maps.DistanceMatrixService();
                    $scope.routeFromLayer = function (layer) {
                        var center = $scope.sourceCoordinates;
                        var centerLongLat = ol.proj.transform([center[0], center[1]], 'EPSG:3857', 'EPSG:4326');
                        if(!$scope.bufferArea){
                            surfToastr.error("Set buffer area in kilometers","Error");
                            $scope.showInput();
                            return;
                        }
                        var radius = ($scope.bufferArea * 1000)/111325;

                        var requestObj = {
                            version: '1.0.0',
                            request: 'GetFeature',
                            outputFormat: 'JSON',
                            typeNames: layer,
                            maxFeatures: 1000,
                            propertyName: 'the_geom',
                            cql_filter: 'DWithin(the_geom,POINT(' + centerLongLat[0] + ' ' + centerLongLat[1] + '),' + radius + ',meters)',
                            exceptions: 'application/json'
                        };
                        LayerService.getWFSWithGeom('api/geoserver/', requestObj, false).then(function (response) {
                            var mapFeatures = (new ol.format.GeoJSON()).readFeatures(response, {featureProjection: 'EPSG:3857'});
                            if(mapFeatures.length<24 && mapFeatures.length>0){
                                var featureCoordinates = mapFeatures.map(function (feature) {
                                    var coordinates = ol.proj.transform(feature.getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326').reverse();
                                        return coordinates;
                                });
                                var origins = [new google.maps.LatLng(centerLongLat[1], centerLongLat[0])];
                                var destinations = [];
                                angular.forEach(featureCoordinates, function (coordinates) {
                                    destinations.push(new google.maps.LatLng(coordinates[0], coordinates[1]));
                                });
                                service.getDistanceMatrix(
                                    {
                                        origins: origins,
                                        destinations: destinations,
                                        travelMode: 'DRIVING'
                                    }, callback);

                                function callback(response, status) {
                                     if (status == 'OK') {
                                        var origins = response.originAddresses;
                                        //var destinationAddress = response.destinationAddresses;
                                        var results = response.rows[0].elements;
                                        var minDistance=_.min(results, function(o,index){
                                            return o.distance.value;
                                        });
                                        var minDistanceIndex=_.findIndex(results,minDistance);
                                        var destinationCoordinate=ol.proj.transform(mapFeatures[minDistanceIndex].getGeometry().getCoordinates(), 'EPSG:3857', 'EPSG:4326').reverse();
                                        var origin = ol.proj.transform(angular.copy($scope.sourceCoordinates), 'EPSG:3857', 'EPSG:4326').reverse();
                                        addRoutePlyLine(origin.join(','), destinationCoordinate.join(','));
                                        var point=mapFeatures[minDistanceIndex].getGeometry().getCoordinates();
                                        var feature = new ol.Feature(
                                            new ol.geom.Point(point)
                                        );
                                        if (!angular.equals(destinationFeature, {}))
                                            removeFeature(destinationFeature);
                                        feature.setStyle(destinationStyle);
                                        destinationFeature = feature;
                                        addFeatureToVectorLayer(feature);
                                        closer.onclick();
                                      }else {
                                        surfToastr.error('Google Map could not determine route distance',"Error");
                                     }
                                }
                            }else {
                                surfToastr.warning('Maximum 25 points are allowed but got '+mapFeatures.length+' points from radius search.', 'Warning');
                            }
                        });
                    };
                    $scope.resetAll = function () {
                        if (!angular.equals(sourceFeature, {}))
                            removeFeature(sourceFeature);
                        if (!angular.equals(destinationFeature, {}))
                            removeFeature(destinationFeature);
                        if (!angular.equals(routeFeature, {}))
                            vectorLayer.getSource().removeFeature(routeFeature);
                        $scope.sourceCoordinates = [];
                        $scope.destinationCoordinates = [];
                        sourceFeature = {};
                        destinationFeature = {};
                        routeFeature = {};
                        $scope.coordinate = [];
                        $scope.layers = [];
                        closer.onclick();
                    };
                }
            ]
        };
    }
]);