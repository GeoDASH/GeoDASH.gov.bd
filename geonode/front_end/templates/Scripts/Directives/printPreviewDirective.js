/**
 * Created by atiq on 7/19/18.
 */
appModule.directive('printPreview', function() {
    return {
        templateUrl: 'static/Templates/Print/printPreviewDirective.html',
        restrict: 'AE',
        controllerAs: 'ctrl',
        controller: ['$scope', 'mapService', '$rootScope', 'mapTools', '$window', '$http', 'surfToastr', function($scope, map, $rootScope, mapTools, $window, $http, surfToastr) {
            var self = this;

            function findClosestScale(l, h, scale) {
                if (l >= h) {
                    return l;
                }
                let mid = (l + h) / 2;
                let mid_scale = Number(self.scales[mid].value);
                if (mid_scale == scale) {
                    return mid;
                } else if (mid_scale < scale) {
                    return findClosestScale(mid + 1, h, scale);
                } else {
                    return findClosestScale(l, mid - 1, scale);
                }
            }

            function initialize() {
                map.getPrintingConfiguration()
                    .then(function(res) {
                        var metaInfo = map.getMeta();
                        self.mapTitle = metaInfo.title;
                        self.comments = metaInfo.abstract;
                        self.layouts = res.data.layouts;
                        self.dpis = res.data.dpis;
                        self.printURL = res.data.printURL;
                        self.createURL = res.data.createURL;
                        self.scales = res.data.scales;

                        self.selectedLayout = self.layouts[0].name;
                        self.selectedDpi = self.dpis[0].value;
                        self.includeLegend = true;
                        let scale = getScaleFromResolution();
                        self.selectedScaleIndex = findClosestScale(0, self.scales.length - 1, parseInt(scale));
                        self.selectedScale = self.scales[self.selectedScaleIndex].value;
                        self.OnScaleChange(self.selectedScale);
                    });
            }

            var _map = map.getMap();
            var _view = _map.getView();
            var _inches_per_unit = {
                'm': 39.37,
                'dd': 4374754
            };
            var _dpi = (function getDPI() {
                var div = document.createElement("div");
                div.style.height = "1in";
                div.style.width = "1in";
                div.style.top = "-100%";
                div.style.left = "-100%";
                div.style.position = "absolute";

                document.body.appendChild(div);

                var result = div.offsetHeight;

                document.body.removeChild(div);

                return result;

            }());

            function getScaleFromResolution() {
                var scale = _inches_per_unit[_map.getView().getProjection().getUnits()] * _dpi * _view.getResolution();
                return scale;
            }

            function getResolutionFromScale(scale) {
                var units = _map.getView().getProjection().getUnits();
                var dpi = _dpi;
                var mpu = ol.proj.METERS_PER_UNIT[units];
                var resolution = scale / (mpu * 39.37 * dpi);
                return resolution;
            }

            self.OnScaleChange = function(scale) {
                let resolution = getResolutionFromScale(scale);
                // _view.setResolution(resolution);
                _view.setZoom(0);
                while (_view.getResolution() > resolution) {
                    _view.setZoom(_view.getZoom() + 1);
                }
                _view.setZoom(_view.getZoom() - 1);

            };

            self.init = function() {
                initialize();
            };

            // var mapInstance = map.olMap;

            // mapInstance.once('postcompose', function (event) {
            //     var canvas = event.context.canvas;
            //     // $rootScope.mapImage.shapeUrl = canvas.toDataURL('image/png');
            // });

            // mapInstance.renderSync();

            $scope.legendPositions = ['top', 'right', 'bottom', 'left'];

            $scope.legend = {
                values: map.sortableLayers,
                show: true,
                position: $scope.legendPositions[0]
            };

            $scope.headerOptions = {
                show: true,
                textFieldId: 'map-title-box',
                displayText: map.getMapName() || 'Untitled',
                alignment: 'left',
                fontSize: 20,
                backgroundColor: 'transparent',
                color: '#000000',
                showBackground: true,
                height: 'auto',
                onShowBackgroundToggle: function() {
                    $scope.headerOptions.height = $scope.headerOptions.showBackground ? 'auto' : 0;
                }
            };

            $scope.footerOptions = {
                show: true,
                textFieldId: 'map-footer-box',
                displayText: 'Footer',
                alignment: 'left',
                fontSize: 8,
                color: '#000000',
                backgroundColor: 'transparent',
                showBackground: true,
                height: 'auto',
                top: 'sss',
                onShowBackgroundToggle: function() {
                    $scope.footerOptions.height = $scope.footerOptions.showBackground ? 'auto' : 0;
                }
            };

            $scope.highlightTitleBox = function() {
                $(document.querySelector('#map-title-box')).focus();
            };

            $scope.highlightFooterBox = function() {
                $(document.querySelector('#map-footer-box')).focus();
            };

            function mapLayers(baseMap, layers) {

                var baseMap = {
                    "baseURL": baseMap.url,
                    "customParams": baseMap.customParams,
                    "opacity": 1,
                    "type": baseMap.type || "xyz",
                    "maxExtent": [-20037508.3392, -20037508.3392,
                        20037508.3392,
                        20037508.3392
                    ],
                    "tileSize": [
                        256,
                        256
                    ],
                    "extension": "png",
                    "resolutions": [
                        156543.03390625,
                        78271.516953125,
                        39135.7584765625,
                        19567.87923828125,
                        9783.939619140625,
                        4891.9698095703125,
                        2445.9849047851562,
                        1222.9924523925781,
                        611.4962261962891,
                        305.74811309814453,
                        152.87405654907226,
                        76.43702827453613,
                        38.218514137268066,
                        19.109257068634033,
                        9.554628534317017,
                        4.777314267158508,
                        2.388657133579254,
                        1.194328566789627,
                        0.5971642833948135
                    ]
                };
                var mappedLayers = [baseMap];
                for (var k in layers) {
                    var layer = layers[k];
                    mappedLayers.push({
                        "baseURL": $window.GeoServerTileRoot,
                        "opacity": 1,
                        "singleTile": false,
                        "type": "WMS",
                        "layers": [
                            layer.Name
                        ],
                        "format": "image/png",
                        "styles": [
                            layer.getStyle().Name
                        ],
                        "customParams": {
                            "TRANSPARENT": true,
                            "TILED": true
                        }
                    });
                }

                return mappedLayers;
            }

            $scope.pageSize = 'LEGAL';

            function getLegendsConf(layers) {
                var legends = [];
                for (var k in layers) {
                    var layer = layers[k];
                    let options = {
                        request: 'GetLegendGraphic',
                        width: '20',
                        height: '20',
                        layer: layer.Name,
                        style: layer.getStyle().Name,
                        transparent: 'true',
                        format: 'image%2Fpng',
                        legend_options: 'fontAntiAliasing%3Atrue%2CfontSize%3A11%3BfontName%3AArial',
                        SCALE: self.selectedScale,

                    };
                    let params = '';
                    for (let k in options) {
                        params += k + '=' + options[k] + '&';
                    }
                    let uri = $window.GeoServerTileRoot + "?" + params;

                    legends.push({
                        "name": "",
                        "classes": [{
                            "name": "",
                            "icons": [
                                uri
                            ]
                        }]
                    });
                }
                return legends;
            }
            self.downloadMap = function() {
                var baseMap = mapTools.baseMap.getBaseMap();
                if (baseMap.groupName === 'Google') {
                    surfToastr.error('Can not print with google map', 'Error');
                    return;
                }
                // window.print();
                var data = {
                    "units": "m",
                    "srs": "EPSG:3857",
                    "layout": self.selectedLayout,
                    "dpi": self.selectedDpi,
                    "outputFilename": "GeoExplorer-print",
                    "mapTitle": self.mapTitle,
                    "comment": self.comments,
                    "layers": mapLayers(baseMap, map.getLayers()),
                    "pages": [{
                        "center": map.getCenter(),
                        "scale": self.selectedScale,
                        "rotation": 0
                    }],
                };
                if (self.includeLegend) {
                    data["legends"] = getLegendsConf(map.getLayers());
                }
                $http.post('/geoserver/pdf/create.json', data)
                    .then(function(res) {
                        $window.location = res.data.getURL;
                    });
            };

            $scope.closeDialog = function() {
                $rootScope.showPrintingProperties = false;
            };
        }]
    }
});