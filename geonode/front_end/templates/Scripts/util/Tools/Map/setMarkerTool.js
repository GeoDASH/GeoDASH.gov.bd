mapModule
    .factory('SetMarkerTool', SetMarkerTool);
SetMarkerTool.$inject = ['mapService', 'layerService', 'SettingsService'];

function SetMarkerTool(mapService, layerService, SettingsService) {
    return function SetMarkerTool(map, view) {
        var container, content, close, popup;
        this.showPopup = false;
        this.elevationLayerName = "";
        var isMarkerToolEnabled = false;
        this.markerToolEvent = undefined;
        var vectorSource = new ol.source.Vector({
        });
        var vectorLayer = new ol.layer.Vector({
            source: vectorSource
        });
        map.addLayer(vectorLayer);

        function createPopup() {
            container = document.getElementById('popup');
            content = document.getElementById('popup-content');
            closer = document.getElementById('popup-closer');
            popup = new ol.Overlay({
                element: container,
                positioning: 'top-left',
                stopEvent: true,
                offset: [0, -48],
                autoPan: true,
                autoPanAnimation: {
                    duration: 250
                }
            });
            // map.addOverlay(popup);
            /**
             * Add a click handler to hide the popup.
             * @return {boolean} Don't follow the href.
             */
            closer.onclick = function(e) {
                popup.setPosition(undefined);
                closer.blur();
                return false;
            };
            // popup.setPosition(evt.coordinate);
            map.addOverlay(popup);

        }

        function addMarker(evt) {
            // var latLong = ol.proj.transform(evt.coordinate, 'EPSG:4326','EPSG:3857');
            var latLong = ol.proj.transform(evt.coordinate, 'EPSG:3857', 'EPSG:4326');
            var iconFeature = new ol.Feature({
                geometry: new ol.geom.Point(evt.coordinate),
                lat: latLong[1].toFixed(6),
                lon: latLong[0].toFixed(6),
                coordinate: evt.coordinate,
                population: 4000,
                rainfall: 500
            });

            var iconStyle = new ol.style.Style({
                image: new ol.style.Icon( /** @type {olx.style.IconOptions} */ ({
                    anchor: [0.5, 48],
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'pixels',
                    opacity: 1,
                    // size: [120, 120],
                    src: '/static/geonode/img/marker.png'
                }))
            });

            iconFeature.setStyle(iconStyle);
            //
            // var vectorSource = new ol.source.Vector({
            //     features: [iconFeature]
            // });
            //
            // var vectorLayer = new ol.layer.Vector({
            //     source: vectorSource
            // });
            //
            // map.addLayer(vectorLayer);
            vectorSource.addFeature(iconFeature);
            return iconFeature;
        }

        function insertPopupData(coordinate, lat, lon, properties) {
            var html = "<div class='pop-up'> " +
                "<p>Lat: " + lat + "</p>" +
                "<p>Lon: " + lon + "</p>";
            for (var key in properties) {
                html += "<p>Elevation: " + properties[key] + "</p>";
            }
            html += "</div>";
            content.innerHTML = html;
            container.style.visibility = 'visible';
            popup.setPosition(coordinate);
        }

        function showPopup(feature, event) {
            var size = map.getSize();
            var bbox = map.getView().calculateExtent(size);
            var lat = feature.get('lat');
            var lon = feature.get('lon');
            var coordinate = feature.get('coordinate');
            insertPopupData(coordinate, lat, lon);
            if(!this.elevationLayerName){
                //No elevation layer setup in the settings;
                return;
            }
            var urlParams = {
                bbox: bbox.join(','),
                width: size[0],
                height: size[1],
                query_layers: this.elevationLayerName,
                layers: this.elevationLayerName,
                info_format: 'application/json',
                exceptions: 'application/json',
                x: Math.round(event.pixel[0]),
                y: Math.round(event.pixel[1])
            };
            
            layerService.fetchWMSFeatures(urlParams)
                .then(function(res) {
                    var properties = res.features.length > 0 ? res.features[0].properties : {};
                    insertPopupData(coordinate, lat, lon, properties);
                }, function(error) {

                });
            // content.innerHTML = feature.get('name');
            
        }

        function enableSetMarkerTool() {
            createPopup();
            this.markerToolEvent = mapService.registerEvent('singleclick', function(evt) {
                var feature = map.forEachFeatureAtPixel(evt.pixel,
                    function(feature, layer) {
                        return feature;
                    });
                if (!feature) {
                    feature = addMarker(evt);
                }
                showPopup(feature, evt);
            });
            isMarkerToolEnabled = true;
        }

        function disableSetMarkerTool() {
            if (this.markerToolEvent) {
                mapService.removeEvent(this.markerToolEvent);
                isMarkerToolEnabled = false;
            }
        }

        this.setMarker = function() {
            if (!isMarkerToolEnabled) enableSetMarkerTool();
            else disableSetMarkerTool();
            return isMarkerToolEnabled;
        };
        this.clearAllMarkers=function () {
            if(vectorSource){
                vectorSource.clear();
                if(popup) popup.setPosition(undefined);
            }
        };

        function getSettings() {
            SettingsService.getSystemSettings()
                .then(function(res) {
                    var elevation = res.find(function(e) {
                        return e.settings_code === 'elevation';
                    });
                    this.elevationLayerName = elevation && elevation.content_object.typename;
                });
        }

        function init() {
            getSettings();
        }

        (init)();
    };
}