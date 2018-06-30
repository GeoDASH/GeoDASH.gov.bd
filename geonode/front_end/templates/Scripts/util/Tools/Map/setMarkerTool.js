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
        var styles={
            'Point': new ol.style.Style({
                image: new ol.style.Icon( /** @type {olx.style.IconOptions} */ ({
                    anchor: [0.5, 48],
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'pixels',
                    opacity: 1,
                    // size: [120, 120],
                    src: '/static/geonode/img/marker-tool.png'
                }))
            })
        };
        var styleFunction = function(feature) {
            return [styles[feature.getGeometry().getType()]];
        };
        var vectorLayer = new ol.layer.Vector({
            source: vectorSource,
            style: styleFunction,
            name : 'pointMarkerVectorLayer'
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
            var properties={
                lat: latLong[1].toFixed(6),
                lon: latLong[0].toFixed(6)
            };
            var iconFeature = new ol.Feature(
                new ol.geom.Point(evt.coordinate)
            );
            // var iconFeature = new ol.Feature({
            //     geometry: new ol.geom.Point(evt.coordinate),
            //     lat: latLong[1].toFixed(6),
            //     lon: latLong[0].toFixed(6),
            //     coordinate: evt.coordinate
            // });

            iconFeature.setProperties(properties);
            vectorSource.addFeature(iconFeature);
            return iconFeature;
        }


        function addElevationData(feature,event) {
            if(!this.elevationLayerName){
                //No elevation layer setup in the settings;
                return;
            }
            var size = map.getSize();
            var bbox = map.getView().calculateExtent(size);
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
                .then(function (res) {
                    var elevationData=res.features.length > 0 ? res.features[0].properties : {};
                    var properties={};
                    for (var key in elevationData) {
                        properties["Elevation"] = elevationData[key];
                    }
                    properties.lat = feature.get('lat');
                    properties.lon = feature.get('lon');
                    feature.setProperties(properties);
                    insertPopupData(feature.getGeometry().getCoordinates(), feature.getProperties());
                }, function (error) {

                });
        }
        

        function insertPopupData(coordinate, properties) {
            var html = "<div class='pop-up'> ";
            for (var key in properties) {
                if(key!=='geometry')
                    html += "<p>"+key+" : " + properties[key] + "</p>";
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
            insertPopupData(feature.getGeometry().getCoordinates(), feature.getProperties());
        }

        function enableSetMarkerTool() {
            createPopup();
            this.markerToolEvent = mapService.registerEvent('singleclick', function(evt) {
                var feature = map.forEachFeatureAtPixel(evt.pixel,
                    function(feature, layer) {
                        if(layer.get('name') === 'pointMarkerVectorLayer') return feature;
                    });
                if (!feature && isMarkerToolEnabled) {
                    feature = addMarker(evt);
                    addElevationData(feature,evt);
                }
                if(feature) showPopup(feature, evt);
            });
            // isMarkerToolEnabled = true;
        }

        function disableSetMarkerTool() {
            // if (this.markerToolEvent) {
            //     mapService.removeEvent(this.markerToolEvent);
            //     isMarkerToolEnabled = false;
            // }
            isMarkerToolEnabled = false;
        }

        this.setMarker = function() {
            if (!isMarkerToolEnabled) isMarkerToolEnabled=true;
            else disableSetMarkerTool();
            return isMarkerToolEnabled;
        };
        this.clearAllMarkers=function () {
            if(vectorSource){
                vectorSource.clear();
                if(popup) popup.setPosition(undefined);
            }
        };
        this.enableInitially=function () {
           enableSetMarkerTool();
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
            // enableSetMarkerTool();
        }

        (init)();
    };
}