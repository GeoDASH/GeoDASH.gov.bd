appModule.directive('injectTemplate', function($compile) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var appendHtml = $compile(attrs.injectTemplate)(scope);
            element.append(appendHtml);
        }
    }
});
appModule.controller("controlButtonsController", ["$scope", "$modal", "$timeout", "$rootScope", "$window", "projectService", 'mapModes', 'mapService', 'dirtyManager', 'featureService', 'interactionHandler', 'mapTools', 'CircleDrawTool', 'LayerService', 'urlResolver', '$q', 'BoxDrawTool', 'SurfMap', '$compile',
    function($scope, $modal, $timeout, $rootScope, $window, projectService, mapModes, mapService, dirtyManager, featureService, interactionHandler, mapTools, CircleDrawTool, LayerService, urlResolver, $q, BoxDrawTool, SurfMap, $compile) {
        $scope.mapService = mapService;
        $scope.mapTools = mapTools;
        var map = $scope.mapService.getMap();
        $scope.tooTipContent = '';

        $scope.toolsIsVisible = function(id) {
            for (let e in $scope.mapToolsSettings) {
                let re = new RegExp(e);
                if (re.test($window.location.pathname) && $scope.mapToolsSettings[e].find(i => i === id)) {
                    return true;
                }
            }
            return false;
        };

        $scope.animateToolbar=function () {
          $timeout(function () {
                $('#map-toobar').toggle("slide", { direction: "right" }, 500);
          });
        };


        $scope.mapToolsSettings = {
            "/maps/(new|\\d+/view)": [
                'navigation-history-buttons',
                'zoom-in-out-buttons',
                'zoom-to-max-extent-button',
                'zoom-to-extent-button',
                'drag',
                'toggle-feature-selection',
                'measurement-buttons',
                'set-marker',
                'measurement-tools',
                'search',
                'nearest-configuration',
                'over-pass-dialog',
                'save',
                'print',
                'heat-map',
                'share-map',
                'legend',
                'route-pop-up-directive'
            ],
            "/maps/\\d+(\\?.*)*$": [
                'navigation-history-buttons',
                'zoom-in-out-buttons',
                'zoom-to-max-extent-button',
                'zoom-to-extent-button',
                'drag',
                'measurement-buttons',
                'set-marker',
                'measurement-tools',
                'over-pass-dialog',
                'print',
                'legend',
                'icon-visualization'
            ],
            "/layers/\\w+:\\w+": [
                'navigation-history-buttons',
                'zoom-in-out-buttons',
                'zoom-to-max-extent-button',
                'zoom-to-extent-button',
                'drag',
                'measurement-buttons',
                'set-marker',
                'measurement-tools',
                'over-pass-dialog',
                'print',
                'legend',
                'icon-visualization'
            ]
        };

        (function() {
            $scope.enable = {};

            $scope.enable.saveProject = function() {
                return dirtyManager.isDirty() | true;
            };
        })();

        (function() {
            $scope.action = {};

            $scope.action.isNewMap = function() {
                return typeof mapService.getId() === "undefined" || mapService.getId() == 0;
            };

            $rootScope.action = $rootScope.action || {};
            $rootScope.action.saveProject = function() {
                var projectName = mapService.getMapName();
                showProjectBrowserDialog(true);
                // if (projectName) {
                //     mapService.saveMapAs(projectName).success(function(data) {
                //         projectService.executeAfterSuccessfulSave(data.layerIdToSavedDataIdMappings);
                //     });
                // } else {
                //     showProjectBrowserDialog(true);
                // }
            };

            $scope.action.saveProject = $rootScope.action.saveProject;

            $scope.action.showCloseProjectOptions = function() {

                if (dirtyManager.isDirty()) {
                    dialogBox.multiAction({
                        text: appMessages.confirm.saveChanges,
                        width: '280px',
                        actions: {
                            "Save": function() {
                                projectService.setAfterSave(function() {
                                    mapService.closeWorkingMap();
                                    featureService.setActive(null);
                                });
                                $rootScope.action.saveProject();
                                interactionHandler.setMode(mapModes.select);
                            },
                            "Discard": function() {
                                mapService.closeWorkingMap();
                                dirtyManager.setDirty(false);
                            }
                        }
                    });
                } else {
                    mapService.closeWorkingMap();
                }
            };

            $scope.action.browseProject = function() {
                showProjectBrowserDialog(false);
            };

            $scope.action.overpassApiQuery = function() {
                showOverpassApiQueryDialog();
            };


            $scope.disableAllDependentTools = function(dependentTools, mapTools, toggleButtonList) {
                angular.forEach(dependentTools, function(tool, key) {
                    if (toggleButtonList[key].isActive) {
                        if (key == 'featureSelectionTool') {
                            $scope.$parent.disableFeatureIdentifier();
                            toggleButtonList[key].isActive = false;
                        } else
                            toggleButtonList[key].isActive = mapTools[tool.toolName][tool.disableFunction]();
                    }
                });
            };

            $scope.toggleButtonsList = {
                setMarkerTool: {
                    isActive: false,
                    toolsToDisable: {
                        'lineMeasurementTool': {
                            toolName: 'measurementTool',
                            disableFunction: 'lineMeasurement'
                        },
                        'areaMeasurementTool': {
                            toolName: 'measurementTool',
                            disableFunction: 'areaMeasurement'
                        },
                        'featureSelectionTool': {
                            toolName: 'activeLayer',
                            disableFunction: 'disableActiveLayerSelectInteractions'
                        },
                        'radiusSearchTool': {
                            toolName: 'circleDrawTool',
                            disableFunction: 'Remove'
                        },
                        'bboxSearchTool': {
                            toolName: 'boxDrawTool',
                            disableFunction: 'Remove'
                        }
                    },
                    toolTip: 'Click to set marker'
                },
                lineMeasurementTool: {
                    isActive: false,
                    toolsToDisable: {
                        'areaMeasurementTool': {
                            toolName: 'measurementTool',
                            disableFunction: 'areaMeasurement'
                        },
                        'featureSelectionTool': {
                            toolName: 'activeLayer',
                            disableFunction: 'disableActiveLayerSelectInteractions'
                        },
                        'radiusSearchTool': {
                            toolName: 'circleDrawTool',
                            disableFunction: 'Remove'
                        },
                        'bboxSearchTool': {
                            toolName: 'boxDrawTool',
                            disableFunction: 'Remove'
                        },
                        'setMarkerTool': {
                            toolName: 'setMarkerTool',
                            disableFunction: 'setMarker'
                        }
                    },
                    toolTip: 'Click to draw line'
                },
                areaMeasurementTool: {
                    isActive: false,
                    toolsToDisable: {
                        'lineMeasurementTool': {
                            toolName: 'measurementTool',
                            disableFunction: 'lineMeasurement'
                        },
                        'featureSelectionTool': {
                            toolName: 'activeLayer',
                            disableFunction: 'disableActiveLayerSelectInteractions'
                        },
                        'radiusSearchTool': {
                            toolName: 'circleDrawTool',
                            disableFunction: 'Remove'
                        },
                        'bboxSearchTool': {
                            toolName: 'boxDrawTool',
                            disableFunction: 'Remove'
                        },
                        'setMarkerTool': {
                            toolName: 'setMarkerTool',
                            disableFunction: 'setMarker'
                        }
                    },
                    toolTip: 'Click to draw area'
                },
                featureSelectionTool: {
                    isActive: false,
                    toolsToDisable: {
                        'lineMeasurementTool': {
                            toolName: 'measurementTool',
                            disableFunction: 'lineMeasurement'
                        },
                        'areaMeasurementTool': {
                            toolName: 'measurementTool',
                            disableFunction: 'areaMeasurement'
                        },
                        'radiusSearchTool': {
                            toolName: 'circleDrawTool',
                            disableFunction: 'Remove'
                        },
                        'bboxSearchTool': {
                            toolName: 'boxDrawTool',
                            disableFunction: 'Remove'
                        },
                        'setMarkerTool': {
                            toolName: 'setMarkerTool',
                            disableFunction: 'setMarker'
                        }
                    },
                    toolTip: 'Click to view feature info'
                },
                zoomTool: {
                    isActive: false,
                    toolTip: 'Click to zoom map'
                },
                radiusSearchTool: {
                    isActive: false,
                    toolsToDisable: {
                        'lineMeasurementTool': {
                            toolName: 'measurementTool',
                            disableFunction: 'lineMeasurement'
                        },
                        'areaMeasurementTool': {
                            toolName: 'measurementTool',
                            disableFunction: 'areaMeasurement'
                        },
                        'featureSelectionTool': {
                            toolName: 'activeLayer',
                            disableFunction: 'disableActiveLayerSelectInteractions'
                        },
                        'bboxSearchTool': {
                            toolName: 'boxDrawTool',
                            disableFunction: 'Remove'
                        },
                        'setMarkerTool': {
                            toolName: 'setMarkerTool',
                            disableFunction: 'setMarker'
                        }
                    },
                    toolTip: 'Click to draw circle'
                },
                bboxSearchTool: {
                    isActive: false,
                    toolsToDisable: {
                        'lineMeasurementTool': {
                            toolName: 'measurementTool',
                            disableFunction: 'lineMeasurement'
                        },
                        'areaMeasurementTool': {
                            toolName: 'measurementTool',
                            disableFunction: 'areaMeasurement'
                        },
                        'featureSelectionTool': {
                            toolName: 'activeLayer',
                            disableFunction: 'disableActiveLayerSelectInteractions'
                        },
                        'radiusSearchTool': {
                            toolName: 'circleDrawTool',
                            disableFunction: 'Remove'
                        },
                        'setMarkerTool': {
                            toolName: 'setMarkerTool',
                            disableFunction: 'setMarker'
                        }
                    },
                    toolTip: 'Click to draw bounding box'
                }
            };

            $scope.initializeMapToolTip = function() {
                if ($scope.toggleButtonsList.zoomTool.isActive) {
                    $scope.tooTipContent = 'Drag to zoom map';
                }
            };

            $scope.getCrossLayerData = function (searchItemLayer,baseLayer,distance) {
                var meterPerDegree = 111325;
                var radius = (distance * 1000) / meterPerDegree;
                var requestObj = {
                    //service: 'WFS',
                    request: 'GetFeature',
                    typeName: searchItemLayer,
                    CQL_FILTER: "DWITHIN(the_geom, collectGeometries(queryCollection('" + baseLayer + "','the_geom','INCLUDE')), " + radius + ", meters)",
                    version: '1.0.0',
                    maxFeatures: 500,
                    outputFormat: 'json',
                    exceptions: 'application/json'
                };
                LayerService.getWFS('api/geoserver/', requestObj, false).then(function (response) {
                    var data = {};
                    data[searchItemLayer] = response.features.map(function (e) {
                        e.properties["Feature_Id"] = e.id;
                        return e.properties;
                    });
                    showFeaturePreviewDialog(data, requestObj);
                });
            };
            $scope.routeConfig = {
                layerId: undefined,
                radius: undefined
            };
            $scope.routeConfig = {
                layerId: undefined,
                radius: undefined
            };

            var source = $window.GeoServerHttp2Root;


            $scope.initializeCrossLayer = function () {
                $scope.layers = [];
                $scope.searchItemLayer='';
                $scope.baseLayer='';
                $scope.distance = 0;
            };

            $scope.getLayers = function() {
                var layers = mapService.getLayers();
                var customArray = [];
                angular.forEach(layers, function(layer) {
                    customArray.push({ Id: layer.LayerId, Name: layer.Name });
                });
                $timeout(function() {
                    $scope.layers = customArray;
                });
            };

            $scope.action.browseData = function() {
                $modal.open({
                    templateUrl: '/static/Templates/CatalogBrowser/Browser.html',
                    controller: 'catalogBrowserController',
                    backdrop: 'static',
                    keyboard: false,
                    windowClass: 'fullScreenModal First',
                    windowTopClass: 'Second',
                    openedClass: 'Third'
                });
            };

            $scope.action.openHelp = function(url) {
                $window.open(url);
            };

            var transform, mapStyleElem, layerSwitcher, zoomControl;

            function moveShape() {
                mapStyleElem = $(".gm-style>div:first>div");
                if (!mapStyleElem || mapStyleElem.length == 0) return;
                transform = mapStyleElem.css("transform");
                var comp = transform.split(","); //split up the transform matrix
                var mapleft = parseFloat(comp[4]); //get left value
                var maptop = parseFloat(comp[5]); //get top value
                mapStyleElem.css({
                    "transform": "none",
                    "left": mapleft,
                    "top": maptop,
                });
            }

            function removeLayerSwitcher() {
                layerSwitcher = $(document.querySelector('.olControlLayerSwitcher.olControlNoSelect'));
                layerSwitcher.hide();
            }

            function removeZoomControl() {
                zoomControl = $(document.querySelector('.olControlZoom.olControlNoSelect'));
                zoomControl.hide();
            }

            function addLayerSwitcher() {
                layerSwitcher.show();
            }

            function addZoomControl() {
                zoomControl.show();
            }

            function restoreShape() {
                if (mapStyleElem && mapStyleElem.length > 0) {
                    $(".gm-style>div:first>div").css({
                        left: 0,
                        top: 0,
                        "transform": transform
                    });
                }
            }

            var visualizationLegendBottom;
            var classesToBeHide = ['.visulization-legend-container .donot-print', '.zoom-level-display',
                '.feature-edit-button-container', '.map-loading-icon', '.base-map-switcher'
            ];

            function styleContents() {
                visualizationLegendBottom = $('.visulization-legend-container').css('bottom');
                $('.visulization-legend-container').css('bottom', 20);
                classesToBeHide.forEach(function(item) {
                    $(item).hide();
                });
            }

            function restoreStyles() {
                $('.visulization-legend-container').css('bottom', visualizationLegendBottom);
                $('.visulization-legend-container').css('bottom', 20);
                classesToBeHide.forEach(function(item) {
                    $(item).show();
                });
            }

            function showFeatures(params) {
                var layers = mapService.getLayers();
                var promises = [];
                var layer_names = [];

                for (var k in layers) {
                    var layer = layers[k];
                    if (!layer.IsVisible)
                        continue;
                    layer_names.push(k);

                    var p = LayerService.getWFS('api/geoserver/', Object.assign({}, params, {
                        typeNames: layer.getName()
                    }), false);
                    promises.push(p);
                }

                $q.all(promises)
                    .then(function(response) {
                        var data = {};
                        for (var i in layer_names) {
                            data[layer_names[i]] = response[i].features.map(function(e) {
                                e.properties["Feature_Id"] = e.id;
                                return e.properties;
                            });
                        }
                        showFeaturePreviewDialog(data, params);
                    });
            }

            var circle = $scope.mapTools.circleDrawTool;

            function enableCircleDrawTool() {
                circle.Draw(true);
                circle.OnModificationEnd(function(feature, values) {
                    var center = feature.values_.geometry.getCenter();
                    var centerLongLat = ol.proj.transform([center[0], center[1]], 'EPSG:3857', 'EPSG:4326');
                    var meterPerDegree = 111325;
                    var params = {
                        version: '1.0.0',
                        request: 'GetFeature',
                        outputFormat: 'JSON',
                        srsName: 'EPSG:3857',
                        typeNames: '',
                        cql_filter: 'DWithin(the_geom,POINT(' + centerLongLat[0] + ' ' + centerLongLat[1] + '),' + values.radius / meterPerDegree + ',meters)',
                    };
                    showFeatures(params);
                });
            }

            function disableCircleDrawTool() {
                circle.Remove();
            }

            $scope.action.drawCircle = function() {
                if (!$scope.toggleButtonsList['radiusSearchTool'].isActive) {
                    $scope.disableAllDependentTools($scope.toggleButtonsList['radiusSearchTool'].toolsToDisable, $scope.mapTools, $scope.toggleButtonsList);
                    enableCircleDrawTool();
                    $scope.toggleButtonsList['radiusSearchTool'].isActive = true;
                    $scope.tooTipContent = 'Click to draw radius';
                } else {
                    disableCircleDrawTool();
                    $scope.toggleButtonsList['radiusSearchTool'].isActive = false;
                    $scope.tooTipContent = '';
                }
            };

            function boundingBoxSearch(feature, boundingBox) {
                var extent = feature.getGeometry().getExtent();
                var bbox = mapService.getBbox('EPSG:4326', extent);
                var params = {
                    version: '1.0.0',
                    request: 'GetFeature',
                    outputFormat: 'JSON',
                    srsName: 'EPSG:3857',
                    typeNames: '',
                    bbox: bbox
                };
                showFeatures(params);
            }

            $scope.removeBoxZooming = function() {
                $scope.toggleButtonsList['zoomTool'].isActive = $scope.mapTools.zoomToExtentTool.removeDrawBox();
            };

            $scope.toggleSelectFeatureTool = function() {
                if (!$scope.toggleButtonsList['featureSelectionTool'].isActive) {
                    $scope.disableAllDependentTools($scope.toggleButtonsList['featureSelectionTool'].toolsToDisable, $scope.mapTools, $scope.toggleButtonsList);
                    // $scope.toggleButtonsList['featureSelectionTool'].isActive=mapTools.activeLayer.setActiveLayerSelectInteractions();
                    $scope.toggleButtonsList['featureSelectionTool'].isActive = true;
                    $scope.$parent.enableFeatureIdentifier();
                    $scope.tooTipContent = 'Click to view feature info';
                } else {
                    // $scope.toggleButtonsList['featureSelectionTool'].isActive=mapTools.activeLayer.disableActiveLayerSelectInteractions();
                    $scope.toggleButtonsList['featureSelectionTool'].isActive = false;
                    $scope.$parent.disableFeatureIdentifier();
                    $scope.tooTipContent = '';
                }
            };

            var box = $scope.mapTools.boxDrawTool;

            function enableBboxSearch() {
                box.Draw(true);
                box.OnBoxModificationEnd(boundingBoxSearch);
                box.OnBoxDrawEnd(boundingBoxSearch);
            }

            function disableBboxSearch() {
                box.Remove();
            }

            $scope.action.boundingBoxSearch = function() {
                if (!$scope.toggleButtonsList['bboxSearchTool'].isActive) {
                    $scope.disableAllDependentTools($scope.toggleButtonsList['bboxSearchTool'].toolsToDisable, $scope.mapTools, $scope.toggleButtonsList);
                    enableBboxSearch();
                    $scope.toggleButtonsList['bboxSearchTool'].isActive = true;
                    $scope.tooTipContent = 'Click to draw bounding box';
                } else {
                    disableBboxSearch();
                    $scope.toggleButtonsList['bboxSearchTool'].isActive = false;
                    $scope.tooTipContent = '';
                }
            };

            $scope.action.shareMap = function() {
                $modal.open({
                    templateUrl: 'static/maps/_share-map-window.html',
                    controller: 'ShareMapController as ctrl',
                    backdrop: 'static',
                    keyboard: false,
                    windowClass: 'fullScreenModal First',
                    windowTopClass: 'Second',
                    openedClass: 'Third'
                });
            };

            $scope.action.printPreview = function() {

                $rootScope.mapImage = { baseMapUrl: undefined, shapeUrl: undefined };
                $modal.open({
                    templateUrl: 'static/Templates/Print/PrintPreview.html',
                    controller: 'printPreviewController as ctrl',
                    backdrop: 'static',
                    keyboard: false,
                    windowClass: 'fullScreenModal First',
                    windowTopClass: 'Second',
                    openedClass: 'Third'
                        // windowClass: 'fullScreenModal printPreviewModal'
                });

                // moveShape();
                // removeLayerSwitcher();
                // removeZoomControl();
                // styleContents();

                // html2canvas($('#mainContent'), {
                //     useCORS: true,
                //     onrendered: function(canvas) {
                //         restoreShape();
                //         addLayerSwitcher();
                //         addZoomControl();
                //         restoreStyles();
                //         $timeout(function() {
                //             $rootScope.mapImage.baseMapUrl = canvas.toDataURL('image/png');
                //         });
                //     }
                // });
            };
        })();

        $rootScope.selectedFeatureAttributes = [];

        function showProjectBrowserDialog(openForSave) {
            $modal.open({
                templateUrl: '/static/Templates/Project/Browser.html',
                controller: 'projectBrowserController',
                backdrop: 'static',
                keyboard: false,
                // windowClass: 'fullScreenModal',
                windowClass: 'fullScreenModal First',
                windowTopClass: 'Second',
                openedClass: 'Third',
                resolve: {
                    showProjectNameInput: function() {
                        return openForSave || false;
                    }
                }
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
                    data: function() {
                        return data;
                    },
                    wfsConfig: function() {
                        return wfsConfig;
                    }
                }
            });
        }

        // function showOverpassApiQueryDialog() {
        //     $modal.open({
        //         templateUrl: '/static/Templates/Project/OverpassApiQueryBuilder.html',
        //         controller: 'OverpassApiQueryBuilderController',
        //         backdrop: 'static',
        //         keyboard: false,
        //         windowClass: 'fullScreenModal First',
        //         windowTopClass : 'Second',
        //         openedClass : 'Third'
        //         // windowClass: 'fullScreenModal'
        //     });
        // }

        $scope.toggleMapEditable = function() {
            interactionHandler.toggleEditable();
        };
    }
]);