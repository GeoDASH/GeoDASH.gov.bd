var treeModule = angular.module('tree', ['ui.sortable']);

treeModule.directive('treeAngle', ['utilityService',
    function (utilityService) {
        var defaultTemplate='/static/Templates/tree.html';
        return {
            transclude: false,
            replace: true,
            restrict: "AC",
            templateUrl: function(tElement, tAttrs) {
                            if(tAttrs.customTemplate){
                                return tAttrs.customTemplate;
                            }
                            return defaultTemplate;
                    },
            scope: true,
            controller: ['$scope', '$rootScope', function ($scope, $rootScope) {
                $scope.rootNode = { isExpanded: true };

                jantrik.EventPool.register('layerStateChanged', function () {
                    $scope.$evalAsync();
                });

                $scope.stopPropagation = function (event) {
                    event.stopPropagation();
                };
    
                $scope.initializeGroups = function (layer) {
                    layer.groups = [];
                    layer.ungrouped = [];
                    updateGroups(layer);
                    updateVisualizationLegend(layer);
                };

                function getHeatMapClasses(style) {
                    var styleClasses=[];
                    if(style) {
                       styleClasses.push({
                           "background" : "linear-gradient(to right," + style.low + ", "+style.mid+")",
                            "height" : "20px",
                            "float" : "left",
                            "width" : "60px",
                            "text-align" : "left",
                            "content" : ""
                       });
                       styleClasses.push({
                           "background" : "linear-gradient(to right," + style.mid + ", "+style.high+")",
                            "height" : "20px",
                            "float" : "left",
                            "width" : "60px",
                            "text-align" : "left"
                       });
                       styleClasses.push({
                           "background" : "linear-gradient(to right," + style.high + ", "+style.veryHigh+")",
                            "height" : "20px",
                            "float" : "left",
                            "width" : "60px",
                            "text-align" : "right"
                       });
                    }
                    return styleClasses;
                }

                function getHeatMapLabelClasses(style) {
                    return ['Low','','']
                }

                $scope.previewSize={width : 'auto',height : 'auto'};
                function updateVisualizationLegend(layer) {
                    layer.visualizationSetting=angular.copy(layer.Style.visualizationSettings);
                    var max=50;
                    if (layer.visualizationSetting) {
                        if (layer.visualizationSetting.classes) {
                            max = _.max(layer.visualizationSetting.classes, function (visClass) {
                                return visClass.style.pointRadius;
                            });
                            if (max) max = max.style.pointRadius / 5;
                        }
                        angular.forEach(layer.visualizationSetting.classes, function (visClass) {
                            visClass.style.pointRadius = visClass.style.pointRadius / 5;
                            visClass.stylePreview = {
                                height: visClass.style.pointRadius * 2 + 5,
                                width: max * 2 + 5
                            };
                        });
                        layer.selectedAttributes = utilityService.getChartSelectedAttributes(layer.visualizationSetting);
                        layer.heatMapClasses=getHeatMapClasses(layer.visualizationSetting.style);
                    }else {
                        layer.selectedAttributes=[];
                        layer.heatMapClasses=[];
                    }
                }

                function updateGroups(layer) {
                    layer.groups = [];
                    layer.ungrouped = [];

                    var classes = layer.getClassifierDefinitions().selected;

                    var groupedClasses = getGroupedClasses(classes);
                    for (var index in groupedClasses.grouped) {
                        layer.groups.push(groupedClasses.grouped[index]);
                    }
                    for (var i in groupedClasses.ungrouped) {
                        layer.ungrouped.push(groupedClasses.ungrouped[i]);
                    }
                }

                $rootScope.$on('classificationChanged', function (event, args) {
                    updateGroups(args.layer);
                    updateVisualizationLegend(args.layer);
                });

                function getGroupedClasses(classes) {
                    var ungrouped = [];
                    var groups = {};

                    for (var index in classes) {
                        var groupName = classes[index].groupName;
                        if (groupName) {
                            if (groups[groupName]) {
                                groups[groupName].classes.push(classes[index]);
                            } else {
                                groups[groupName] = { name: groupName, classes: [classes[index]] };
                            }
                        } else {
                            ungrouped.push(classes[index]);
                        }
                    }

                    checkGroups(groups);

                    return { grouped: groups, ungrouped: ungrouped };
                }

                function checkGroups(groups) {

                    for (var index in groups) {
                        for (var subIndex in groups[index].classes) {
                            groups[index].isChecked = groups[index].classes[subIndex].checked;
                        }
                    }
                }
            }]
        };
    }]);
