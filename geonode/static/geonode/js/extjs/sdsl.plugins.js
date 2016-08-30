/*
 To change this license header, choose License Headers in Project Properties.
 To change this template file, choose Tools | Templates
 and open the template in the editor.
 *
 *
    ptype: "sdsl_SearchByBoundBox"
    ptype: "sdsl_SearchByRadius"
 *
 *
 */
/*
 Created on : Augest 06, 2016, 04:45:00 PM
 Author     : Nazmul
 */

Ext.ns("SDSL.plugins");

/**
 * @require plugins/Tool.js
 * @require GeoExt/widgets/Action.js
 * @require OpenLayers/Control/DrawFeature.js
 * @require OpenLayers/Handler/RegularPolygon.js
 * @require OpenLayers/Layer/Vector.js
 * @require OpenLayers/Renderer/SVG.js
 * @require OpenLayers/Renderer/VML.js
 * http://dev.openlayers.org/examples/regular-polygons.html
 * http://www.sitpa.cl:8080/opengeo-docs/webapps/gxp/plugin/action.html
 * http://jsfiddle.net/expedio/L529bqb5/
 */

SDSL.plugins.SearchView = Ext.extend(gxp.plugins.Tool, {

  ptype: "sdsl_SearchView",

  addOutput: function(config) {
    return SDSL.plugins.SearchView.superclass.addOutput.call(this, Ext.apply({
      title: "Box info",
      html: "This is where the box info will be shown"
    }, config));
  }

});

Ext.preg(SDSL.plugins.SearchView.prototype.ptype, SDSL.plugins.SearchView);

SDSL.plugins.SearchByBoundBox = Ext.extend(gxp.plugins.Tool, {

    ptype: "sdsl_SearchByBoundBox",

    addActions: function () {
        var map = this.target.mapPanel.map;
        this.boxLayer = new OpenLayers.Layer.Vector(null, {displayInLayerSwitcher: false});
        map.addLayers([this.boxLayer]);
        // keep our vector layer on top so that it's visible
        map.events.on({
            addlayer: this.raiseLayer,
            scope: this
        });
        var action = new GeoExt.Action({
            text: "Search by bound box", // BoundBox //rectangle
            toggleGroup: "draw",
            enableToggle: true,
            map: map,
            control: new OpenLayers.Control.DrawFeature(this.boxLayer,
                OpenLayers.Handler.RegularPolygon, {
                    handlerOptions: {
                        sides: 4,
                        irregular: true
                    }
                }
            )
        });
        return SDSL.plugins.SearchByBoundBox.superclass.addActions.apply(this, [action]);
    },

    raiseLayer: function () {
        var map = this.boxLayer && this.boxLayer.map;
        if (map) {
            map.setLayerIndex(this.boxLayer, map.layers.length);
        }
    }

});
Ext.preg(SDSL.plugins.SearchByBoundBox.prototype.ptype, SDSL.plugins.SearchByBoundBox);

// Search By Radius
SDSL.plugins.SearchByRadius = Ext.extend(gxp.plugins.Tool, {

    ptype: "sdsl_SearchByRadius",

    addActions: function () {

        var map = this.target.mapPanel.map;
        this.boxLayer = new OpenLayers.Layer.Vector(null, {displayInLayerSwitcher: false});
        map.addLayers([this.boxLayer]);
        // keep our vector layer on top so that it's visible
        map.events.on({
            addlayer: this.raiseLayer,
            scope: this
        });
        map.events.register("click", this, function (e) {
            console.log('click', e.xy.x, e.xy.y);
        });
        var action = new GeoExt.Action({
            text: "Search by radius", // Radius //rectangle
            toggleGroup: "draw",
            enableToggle: true,
            map: map,
            handler: function (button, event) {
                //console.log(button, event);
            },
            control: new OpenLayers.Control.DrawFeature(this.boxLayer,
                OpenLayers.Handler.RegularPolygon, {
                    handlerOptions: {
                        sides: 40
                    }
                }
            )
        });
        action.control.events.register('featureadded', this, function (e) {
            console.log('featureadded event fire', e);
            // DRY-principle not applied
            var f = e.feature;
            // ###############
            // get pixel value
            // ###############
            /*var geometry = f.geometry;
             var coordinate = new OpenLayers.LonLat(geometry.x, geometry.y);
             var pixel = f.layer.map.getPixelFromLonLat(coordinate);
             console.log(geometry.x, geometry.y, pixel);*/
            //calculate the min/max coordinates of a circle
            var minX = f.geometry.bounds.left;
            var minY = f.geometry.bounds.bottom;
            var maxX = f.geometry.bounds.right;
            var maxY = f.geometry.bounds.top;
            //calculate the center coordinates
            var startX = (minX + maxX) / 2;
            var startY = (minY + maxY) / 2;
            // ########################################
            //make two points at center and at the edge
            // ########################################
            var startPoint = new OpenLayers.Geometry.Point(startX, startY);
            var endPoint = new OpenLayers.Geometry.Point(maxX, startY);
            var radius = new OpenLayers.Geometry.LineString([startPoint, endPoint]);
            // #########################################################
            //console.log('getResolution', f.layer.map.getResolution());
            //calculate length. WARNING! The EPSG:900913 lengths are meaningless except around the equator. Either use a local coordinate system like UTM, or geodesic calculations.
            // #########################################################
            var len = Math.round(radius.getLength()).toString();
            var radiusInPixel = parseInt(len / f.layer.map.getResolution());
            console.log('radiusInPixel', radiusInPixel);
            // ####################
            // Get Search Layer URL
            // Get Search Layer URL
            // ####################
            var searchLayerList = [];
            var mLayers = f.layer.map.layers;
            for (var a = 0; a < mLayers.length; a++) {
                if ((mLayers[a].url != undefined) && (typeof mLayers[a].url === 'string')) {
                    searchLayerList.push(mLayers[a]);
                }
            }
            /*for(var a = 0; a < searchLayerList.length; a++ ){
             console.log('searchLayerList', a, searchLayerList[a].name, searchLayerList[a].url);
             }*/
            // ##################
            // get center lat lon
            // get center lat lon
            // ##################
            var mapProjection = new OpenLayers.Projection(f.layer.map.projection);
            var projDisplayObj = new OpenLayers.Projection("EPSG:4326");
            var centerPoint = startPoint.clone().transform(mapProjection, projDisplayObj);


            // get center position clientXY pixel
            var pixel = {x: 0, y: 0};
            var mapBound = f.layer.map.getExtent();
            var mbMinX = mapBound.left;
            var mbMinY = mapBound.bottom;
            var mbMaxX = mapBound.right;
            var mbMaxY = mapBound.top;
            var size = f.layer.map.size;
            var xPx = (((size.w) * (startPoint.x - mbMinX)) / (mbMaxX - mbMinX));
            var yPx = (((size.h) * (startPoint.y - mbMinY)) / (mbMaxY - mbMinY));
            //console.log('center position ::', xPx, yPx);
            pixel.x = parseInt(xPx);
            pixel.y = parseInt(yPx);
            /*var coordinate = new OpenLayers.LonLat(centerPoint.x, centerPoint.y);
             var pixel = f.layer.map.getPixelFromLonLat(coordinate);
             var viewPixel = f.layer.map.getViewPortPxFromLonLat(coordinate);
             console.log([startPoint, centerPoint, pixel, viewPixel]);*/
            if (searchLayerList.length > 0) {
                this.getFeatureInfo(searchLayerList, pixel, radiusInPixel);
            }
            // ###############
            //style the radius
            //style the radius
            // ###############
            var punktstyle = {
                strokeColor: "red",
                strokeWidth: 2,
                pointRadius: 5,
                fillOpacity: 0.2
            };
            var style = {
                strokeColor: "#0500bd",
                strokeWidth: 3,
                label: len + " m",
                labelAlign: "left",
                labelXOffset: "20",
                labelYOffset: "10",
                labelOutlineColor: "white",
                labelOutlineWidth: 3
            };
            // ################################
            //add radius feature to radii layer
            //add radius feature to radii layer
            // ################################
            var centerPointDrawing = new OpenLayers.Feature.Vector(startPoint, {}, punktstyle);
            var radiusLineDrawing = new OpenLayers.Feature.Vector(radius, {'length': len}, style);
            // action control deactivate when draw done
            action.control.deactivate();
            // ##############################
            // draw radius on selected circle
            // draw radius on selected circle
            // ##############################
            this.boxLayer.addFeatures([centerPointDrawing, radiusLineDrawing]);
            //this.boxLayer.addFeatures([radiusLineDrawing]);
        });
        /*action.control.handler.callbacks.move = function (e) {

         var linearRing = new OpenLayers.Geometry.LinearRing(e.components[0].components);
         var geometry = new OpenLayers.Geometry.Polygon([linearRing]);
         var polygonFeature = new OpenLayers.Feature.Vector(geometry, null);
         var polybounds = polygonFeature.geometry.getBounds();

         var minX = polybounds.left;
         var minY = polybounds.bottom;
         var maxX = polybounds.right;
         var maxY = polybounds.top;

         //calculate the center coordinates

         var startX = (minX + maxX) / 2;
         var startY = (minY + maxY) / 2;

         //make two points at center and at the edge
         var startPoint = new OpenLayers.Geometry.Point(startX, startY);
         var endPoint = new OpenLayers.Geometry.Point(maxX, startY);
         var radius = new OpenLayers.Geometry.LineString([startPoint, endPoint]);
         var len = Math.round(radius.getLength()).toString();

         var laenge;
         if (len > 1000) {
         laenge = len / 1000;
         einheit = "km";
         } else {
         laenge = len;
         einheit = "m";
         }
         //document.getElementById("radius").innerHTML = laenge;
         //document.getElementById("einheit").innerHTML = einheit;
         console.log(laenge, einheit);
         }*/
        return SDSL.plugins.SearchByRadius.superclass.addActions.apply(this, [action]);
    },
    getFeatureInfoRequestParams: function (layer, pixel) {
        console.log('layer', layer);
        // ###################
        // get extent for bbox
        // ###################
        var extent = layer.getExtent();
        var projDisplayObj = new OpenLayers.Projection("EPSG:4326");
        var extentLatLonObj = extent.clone().transform(layer.projection, projDisplayObj);
        // #################
        // get layer map obj
        // #################
        var size = layer.map.size;
        // ###################
        // get params of layer
        // ###################
        var params = layer.params;

        // ##############
        // Make request params
        // ##############
        var requestParams = {};
        requestParams.info_format = 'application/json';
        requestParams.REQUEST = 'GetFeatureInfo';
        requestParams.SERVICE = params.SERVICE || '';
        requestParams.VERSION = params.VERSION || '';
        requestParams.LAYERS = params.LAYERS || layer.name || '';
        //requestParams.layers = layer.name || '';
        requestParams.styles = params.styles || '';
        //requestParams.SRS = params.SRS || '';
        requestParams.SRS = 'EPSG:4326';
        requestParams.BBOX = extentLatLonObj.toBBOX() || '';
        requestParams.width = size.w || '';
        requestParams.height = size.h || '';
        requestParams.query_layers = params.LAYERS || layer.name || '';
        requestParams.x = pixel.x || '';
        requestParams.y = pixel.y || '';
        requestParams.EXCEPTIONS = 'application/vnd.ogc.se_xml';
        requestParams.feature_count = 50;

        // debug code
        /*console.log(requestParams);
         console.log('RequestParams String :: ');
         console.log(JSON.stringify(requestParams));*/

        return requestParams;
    },
    getFeatureInfoRequestUrl: function (layer) {
        var url = layer.url;
        var uri = url.split('/wms');
        return uri[0] + '/wms';
    },
    getFeatureInfo: function (searchLayerList, pixel, radiusInPixel) {
        for (var i = 0; i < searchLayerList.length; i++) {
            var layer = searchLayerList[i];
            var url = this.getFeatureInfoRequestUrl(layer);
            var parameter = this.getFeatureInfoRequestParams(layer, pixel);
            parameter.buffer = radiusInPixel;

            var thatObj = this;
            // Basic request
            Ext.Ajax.request({
                url: url,
                method: "GET",
                params: parameter,
                success: function (response, data) {
                    //console.log('success responseText');
                    //console.log(response.responseText);
                    thatObj.addOutput(parameter, response.responseText);
                },
                failure: function (error) {
                    console.log('failure', error);
                }
            });
        }
    },
    raiseLayer: function () {
        //console.log('raiseLayers');
        this.boxLayer.destroyFeatures();
        var map = this.boxLayer && this.boxLayer.map;
        if (map) {
            map.setLayerIndex(this.boxLayer, map.layers.length);
        }
    },
    /** api: method[addOutput]
     */
    addOutput: function (parameter, response) {
        console.log('out');
        var gridTitle = parameter.LAYERS;
        var columnsLen = 0;
        var tableHeader = [];
        var tableField = [];
        var tableRows = [];
        var loadGridData = false;

        var data = Ext.decode(response);
        if (data.features != undefined) {
            var features = data.features;
            var len = features.length;
            if (len > 0) {

                for (var i = 0; i < len; i++) {
                    var properties = features[i].properties;
                    if ((properties instanceof Object) && !(properties instanceof Array)) {
                        var keys = Object.keys(properties);
                        columnsLen = keys.length;
                        var tableRow = [];
                        for (var j = 0; j < columnsLen; j++) {
                            var proName = keys[j];
                            if (tableHeader.length != columnsLen) {
                                var header = {
                                    id: proName,
                                    header: proName,
                                    sortable: true,
                                    dataIndex: proName
                                };
                                tableHeader.push(header);
                                var field = {
                                    name: proName
                                };
                                tableField.push(field);
                            }
                            tableRow.push(properties[proName]);
                            console.log('tableRow', tableRow);
                        }
                        tableRows.push(tableRow);
                    }
                }
                loadGridData = true;
            }
        }

        if(loadGridData){
            // create the data store
            var store = new Ext.data.ArrayStore({
                fields: tableField
            });

            // manually load local data
            store.loadData(tableRows);

            // create the Grid
            var grid = new Ext.grid.GridPanel({
                store: store,
                columns: tableHeader,
                stripeRows: true,
                height: 350,
                width: 600,
                title: gridTitle,
                // config options for stateful behavior
                stateful: true,
                stateId: 'grid'
            });

            //return false;
            var config = Ext.apply(grid, config || {});
        }

        //return SDSL.plugins.SearchByRadius.superclass.addActions.apply(this, [action]);
        var queryForm = SDSL.plugins.SearchByRadius.superclass.addOutput.call(this, config);
    }
});
Ext.preg(SDSL.plugins.SearchByRadius.prototype.ptype, SDSL.plugins.SearchByRadius);
