mapModule
    .factory('CircleDrawTool', CircleDrawTool);

CircleDrawTool.$inject = ['mapService'];

function CircleDrawTool(mapService) {
    return function(map) {
        var _featureId = 'bounding-circle';
        var dragCursor = 'pointer';
        var defaultCursor = 'default';
        var resizeCursor = 'e-resize';
        var prevCursor, dragCoordinate;
        var draggableFeature, circleFeature;
        var resizeFeaturePoint, circleRadiusFeature;
        var resizeFeature;
        var onCircleDrawEndCallBack;
        var map = map || mapService.getMap();
        var layer, vectorSource, features;
        var dragInteraction, drawInteraction, lineMeasurementEvent;

        var STROKE_WIDTH = 3,
            CIRCLE_RADIUS = 5;

        var FILL_COLOR = 'rgba(255, 255, 255, 0.5)',
            STROKE_COLOR = 'rgba(0, 60, 136, 0.8)';

        var verticeStyle = new ol.style.Style({
            image: new ol.style.Circle({
                radius: CIRCLE_RADIUS,
                stroke: new ol.style.Stroke({
                    color: STROKE_COLOR,
                    width: STROKE_WIDTH
                }),
                fill: new ol.style.Fill({
                    color: FILL_COLOR
                })
            })
        });


        function _createFeatures() {
            features = new ol.Collection();
            features.on('add', function(event) {
                var feature = event.element;
                feature.set('id', _featureId);
            });
        }

        function _createSource() {
            _createFeatures();
            vectorSource = new ol.source.Vector({
                features: features
            });
        }

        function _createLayer() {
            _createSource();
            layer = new ol.layer.Vector({
                source: vectorSource
            });
            mapService.addVectorLayer(layer);
        }

        function _getFeatureFromPixel(pixel) {
            var feature = map.forEachFeatureAtPixel(pixel, function(feature, layer) {

                return feature;
            });
            return feature;
        }
        var measureTooltipElement;
        var measureTooltip;

        function _createMeasureTooltip() {
            if (measureTooltipElement) {
                measureTooltipElement.parentNode.removeChild(measureTooltipElement);
            }
            measureTooltipElement = document.createElement('div');
            measureTooltipElement.className = 'tooltip tooltip-measure';
            measureTooltip = new ol.Overlay({
                element: measureTooltipElement,
                offset: [0, -15],
                positioning: 'bottom-center'
            });
            map.addOverlay(measureTooltip);
            // measurementOverlays.push(measureTooltip);
        }

        function euclideanDistance(point1, point2) {
            return Math.sqrt(Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2));
        }

        function resizeCircle(feature, coordinate) {
            var radius = euclideanDistance(feature.getGeometry().getCenter(), coordinate);
            feature.getGeometry().setRadius(radius);
            resizeFeaturePoint.getGeometry().setCoordinates(coordinate);
        }

        function resizeLine(event) {
            let geometry = this.feature.getGeometry();
            let [cx, cy] = geometry.getCenter();
            let radius = geometry.getRadius();
            console.log(radius);
            circleRadiusFeature.getGeometry().setCoordinates([
                [cx, cy],
                [cx + radius, cy]
            ]);
            pointerMoveHandler.call({ feature: this.feature }, event);
        }

        function _addDragInteraction() {
            dragInteraction = new ol.interaction.Pointer({
                handleDownEvent: function(event) {
                    var feature = _getFeatureFromPixel(event.pixel);

                    if (feature && feature.get('id') === _featureId) {
                        dragCoordinate = event.coordinate;

                        // draggableFeature = feature;
                        parentFeature = feature.get('parentFeature');
                        if (parentFeature) {
                            resizeFeature = feature;
                            draggableFeature = parentFeature;
                        } else {
                            draggableFeature = feature;
                        }
                        return true;
                    }
                    return false;
                },
                handleDragEvent: function(event) {
                    var geometry, parentFeature, updateFn;
                    var deltaX = event.coordinate[0] - dragCoordinate[0];
                    var deltaY = event.coordinate[1] - dragCoordinate[1];
                    if (resizeFeature) {
                        geometry = resizeFeature.getGeometry();
                        parentFeature = resizeFeature.get('parentFeature');
                        updateFn = resizeFeature.get('updateFn');
                        circleRadiusUpdateFn = circleRadiusFeature.get('updateFn');
                    } else {
                        geometry = draggableFeature.getGeometry();
                    }
                    if (updateFn) {
                        updateFn(parentFeature, event.coordinate);
                        circleRadiusUpdateFn.call({feature: parentFeature}, event);
                    } else {
                        draggableFeature.getGeometry().translate(deltaX, deltaY);
                        resizeFeaturePoint.getGeometry().translate(deltaX, deltaY);
                        circleRadiusFeature.getGeometry().translate(deltaX, deltaY);
                        pointerMoveHandler.call({ feature: circleFeature });
                    }

                    dragCoordinate = event.coordinate;
                },
                handleMoveEvent: function(event) {
                    var cursor = dragCursor;
                    var map = event.map;
                    var feature = _getFeatureFromPixel(event.pixel);
                    var element = map.getTargetElement();
                    if (feature && feature.get('id') == _featureId) {
                        if (feature.get('name') == 'resizeFeaturePoint') {
                            cursor = resizeCursor;
                        }
                        if (element.style.cursor != cursor) {
                            prevCursor = element.style.cursor;
                            element.style.cursor = cursor;
                        }
                    } else if (prevCursor != undefined) {
                        element.style.cursor = prevCursor;
                        prevCursor = undefined;
                    } else {
                        element.style.cursor = defaultCursor;
                    }
                },
                handleUpEvent: function(event) {
                    callBackListener(draggableFeature || resizeFeature.get('parentFeature'));

                    resizeFeature = undefined;
                    draggableFeature = undefined;
                }
            });
        }

        var formatLength = function(length) {
            var output;
            if (length > 100) {
                output = (Math.round(length / 1000 * 100) / 100).toFixed(2) +
                    ' ' + 'km';
            } else {
                output = (Math.round(length * 100) / 100).toFixed(2) +
                    ' ' + 'm';
            }
            return output;
        };

        var pointerMoveHandler = function(evt) {
            var geometry = this.feature.getGeometry();
            let [cx, cy] = geometry.getCenter();
            let radius = geometry.getRadius();

            measureTooltipElement.innerHTML = formatLength(geometry.getRadius());
            measureTooltip.setPosition([cx + radius / 2, cy]);

        };

        function drawRadius(center, radius) {
            var lineString = new ol.geom.LineString([center, [center[0] + radius, center[1]]]);
            // create the feature
            circleRadiusFeature = new ol.Feature({
                geometry: lineString,
                name: 'Line',
                updateFn: resizeLine
            });
            vectorSource.addFeature(circleRadiusFeature);
        }

        function _addDrawInteraction() {
            drawInteraction = new ol.interaction.Draw({
                source: vectorSource,
                type: 'Circle'
            });
            drawInteraction.on('drawstart', function(evt) {
                var geometry = evt.feature.getGeometry();
                var centerCoordinate = geometry.getCenter();
                var radius = geometry.getRadius();
                drawRadius(centerCoordinate, radius);

                lineMeasurementEvent = mapService.registerEvent('pointermove', resizeLine.bind({ feature: evt.feature }));

            }, this);

            drawInteraction.on('drawend', function(event) {
                callBackListener(event.feature);

                mapService.addInteraction(dragInteraction);
                mapService.removeInteraction(drawInteraction);
                mapService.removeEvent(lineMeasurementEvent);
                circleFeature = event.feature;
                var geometry = event.feature.getGeometry();
                var centerCoordinate = geometry.getCenter();
                var radius = geometry.getRadius();
                resizeFeaturePoint = new ol.Feature({
                    geometry: new ol.geom.Point([centerCoordinate[0] + radius, centerCoordinate[1]]),
                    name: 'resizeFeaturePoint',
                    parentFeature: event.feature,
                    updateFn: resizeCircle
                });

                resizeFeaturePoint.setStyle(verticeStyle);
                vectorSource.addFeature(resizeFeaturePoint);

            });
            mapService.addInteraction(drawInteraction);

        }

        function _addInteraction() {
            _addDragInteraction();
            _addDrawInteraction();
        }

        function callBackListener(feature) {
            var center = feature.getGeometry().getCenter();
            var radius = feature.getGeometry().getRadius();
            if (typeof onCircleDrawEndCallBack === 'function') {
                onCircleDrawEndCallBack(feature, {
                    center: center,
                    radius: radius
                });
            }
        }
        this.Draw = function() {
            _createLayer();
            _addInteraction();
            _createMeasureTooltip();
        };
        this.Remove = function() {
            mapService.removeInteraction(drawInteraction);
            mapService.removeInteraction(dragInteraction);
            layer && mapService.removeVectorLayer(layer);
            measureTooltip.setPosition();
            
            return false;
        };
        this.Stop = function() {
            mapService.removeInteraction(drawInteraction);
            mapService.removeInteraction(dragInteraction);
        };

        this.OnDrawEnd = function(cb) {
            onCircleDrawEndCallBack = cb;
        };
        this.OnModificationEnd = function(cb) {
            onCircleDrawEndCallBack = cb;
        };
    };
}