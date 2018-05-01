appModule.controller('layerPropertiesCtrl', ['$timeout', '$scope', '$http', '$filter', '$modalInstance', 'data', 'inputData', 'settingsData', 'layer', 'LayerService', 'surfToastr',
    function($timeout, $scope, $http, $filter, $modalInstance, data, inputData, settingsData, layer, LayerService, surfToastr) {
        $scope.hasPermission = false;
        $scope.settingsData = settingsData;
        $scope.inputData = inputData;
        $scope.classifierBinder = { classType: undefined, colorPaletteGenerator: undefined };
        $scope.propertiesData = { isDirty: false };
        $scope.attributeDefs = data.fields;
        $scope.isReadonly = !layer.isWritable();
        $scope.nodeData = {};
        $scope.tabs = [{}, {}, {}, {}, {}];
        $scope.showSelectStyle = false;

        $scope.visualizationSettings = { selected: layer.Style.VisualizationSettings };
        $scope.group = { "operator": "AND", "rules": [] };
        $scope.options = {
            addGroup: true,
            removeGroup: true,
            customFields: []
        };
        $scope.stringCompareOperators = [
            {name: 'Is Like', value: 'like'},
            {name: 'Is Null', value: 'null'},
            {name: 'BETWEEN', value: 'BETWEEN'}
        ];
        $scope.advancedStylingRules=[];
        $scope.ruleName="untitled rule";
        $scope.selectedAdvancedRule=undefined;
        $scope.addAdvancedRule=function (rulename) {
            $scope.advancedStylingRules.push(
                {
                    ruleName : rulename,
                    style : {default:angular.copy($scope.nodeData.layer.style.default)},
                    labelConfig : angular.copy($scope.nodeData.layer.style.labelConfig),
                    filters : { "operator": "AND", "rules": [] }
                }
            );
            $scope.ruleName="untitled rule";
        };

        $timeout(function() {
            $scope.tabs[data.selectedTabIndex].active = true;
        });
        $scope.editAdvancedRule=function (rule) {
          $scope.selectedAdvancedRule=rule;
          $scope.group=rule.filters;
        };
        $scope.cloneAdvanceRule=function (rule) {
            var cloneRule=angular.copy(rule);
            rule.ruleName=rule.ruleName+"-clone";
            $scope.advancedStylingRules.push(cloneRule);
        };
        $scope.deleteAdvanceRule=function (rule) {
            $scope.advancedStylingRules=_.without($scope.advancedStylingRules, rule);
        };
        $scope.deleteAdvanceSelectedRule=function () {
            $scope.selectedAdvancedRule=undefined;
        };

        function initNodeData() {

            $scope.nodeData.layer = {
                name: layer.getName(),
                shapeType: layer.getFeatureType(),
                dataSourceName: layer.getDataSourceName(),
                style: angular.copy(layer.getStyle()),
                id: layer.getId(),
                linearUnit: layer.linearUnit,
                attributeDefinitions: layer.getAttributeDefinition(),
                zoomlevel: layer.getZoomLevel()
                //visualizationSettings: layer.visualizationSettings
            };
            $scope.advancedStylingRules=$scope.nodeData.layer.style.advancedRules ? $scope.nodeData.layer.style.advancedRules : [];
        }
        function removeUnsavedStyle(){
            $scope.Styles = $scope.Styles.filter(e => e.id);
        }

        $scope.nodeData.fields = data.fields;

        function featurePropertiesDirty() {
            var oldStyle = layer.getStyle();
            var newStyle = $scope.nodeData.layer.style;

            var styleChanged = false;
            for (var s in { 'default': 0, 'select': 1, 'labelConfig': 2 }) {
                for (var k in newStyle[s]) {
                    if (newStyle[s][k] != oldStyle[s][k]) {
                        styleChanged = true;
                    }
                }
            }

            return layer.getName() != $scope.nodeData.layer.name || layer.getZoomLevel() != $scope.nodeData.layer.zoomlevel || styleChanged;
        }

        $scope.cancel = function() {
            $modalInstance.dismiss('cancel');
        };

        function getLayerStyles() {
            LayerService.getStylesByLayer(layer.getName())
                .then(function(res) {
                    $scope.Styles = res;
                    $scope.settingsData = $scope.nodeData.layer.style.classifierDefinitions || {};
                    $scope.classifierBinder = { classType: undefined, colorPaletteGenerator: undefined };
                    $scope.visualizationSettings = { selected: $scope.nodeData.layer.style.visualizationSettings };
                    $scope.nodeData.selectedStyle = $scope.Styles.find(function(e) {
                        return e.id == $scope.nodeData.layer.style.id;
                    });
                    if ($scope.nodeData.selectedStyle){
                        checkPermission();       
                    }
                }, function() {

                });
        }

        function checkPermission() {
            LayerService.checkLayerStylePermision($scope.nodeData.layer.id, $scope.nodeData.selectedStyle.id)
                .then(function(res) {
                    $scope.hasPermission = res.has_permission;
                }, function() {
                    $scope.hasPermission = false;
                });
        }
        initNodeData();
        (getLayerStyles)();
        $scope.onStyleChange = function() {
            if (!$scope.nodeData.selectedStyle || !$scope.nodeData.selectedStyle.hasOwnProperty('id'))
            return;
            removeUnsavedStyle();
            LayerService.getStyle($scope.nodeData.selectedStyle.id)
                .then(function(res) {
                    checkPermission();
                    $scope.nodeData.layer.style = res;
                    $scope.advancedStylingRules=$scope.nodeData.layer.style.advancedRules ? $scope.nodeData.layer.style.advancedRules : [];
                    $scope.settingsData = $scope.nodeData.layer.style.classifierDefinitions || {};
                    $scope.classifierBinder = { classType: undefined, colorPaletteGenerator: undefined };
                    $scope.visualizationSettings = { selected: $scope.nodeData.layer.style.visualizationSettings };

                    $scope.visualizationSettings = { selected: $scope.nodeData.layer.style.visualizationSettings };
                    angular.extend($scope.nodeData.layer.style, {
                        id: $scope.nodeData.selectedStyle.id,
                        Name: $scope.nodeData.selectedStyle.style.name,
                        Title: $scope.nodeData.selectedStyle.title,
                    });
                    layer.setStyle($scope.nodeData.layer.style);
                    layer.refresh();
                }, function() {

                });
        };

        $scope.newStyle = function() {
            removeUnsavedStyle();
            $scope.hasPermission = true;
            angular.copy(LayerService.getNewStyle(), $scope.nodeData.layer.style);
            $scope.nodeData.selectedStyle = $scope.nodeData.layer.style;
            $scope.settingsData = {};
            $scope.classifierBinder = { classType: undefined, colorPaletteGenerator: undefined };
            $scope.Styles.push($scope.nodeData.selectedStyle);
            $scope.visualizationSettings = { selected: undefined };
        };

        $scope.deleteStyle = function() {
            if (!$scope.nodeData.selectedStyle) {
                surfToastr.warning('Please select a style first', 'No Style');
                return;
            }
            var res = confirm("Are you suer you want to delete " + $scope.nodeData.selectedStyle.title);
            if (!res) {
                return;
            }
            LayerService.deleteStyle($scope.nodeData.selectedStyle.id)
                .then(function() {
                    surfToastr.success('Style deleted successfully', 'Style Deletion Success');
                    var index = $scope.Styles.findIndex(function(e) {
                        return e.id == $scope.nodeData.selectedStyle.id;
                    });
                    $scope.Styles.splice(index, 1);
                    $scope.nodeData.selectedStyle = $scope.Styles[0];
                    $scope.onStyleChange();
                }, function(res) {
                    surfToastr.error(res.error, 'Style Deletion Failed');
                });
        };

        $scope.save = function() {
            //if ($scope.nodeData.invalidField() || !$scope.nodeData.layer.name) {
            if (!$scope.nodeData.layer.name) {
                return;
            }
            $scope.nodeData.layer.style.visualizationSettings = $scope.visualizationSettings.selected;
            $modalInstance.close({
                updatedNode: $scope.nodeData,
                fieldChanged: $scope.propertiesData.isDirty,
                classifierDefinitions: $scope.classifierBinder.classType.getSettings($scope.classifierBinder.colorPaletteGenerator),
                propertiesChanged: featurePropertiesDirty(),
                advancedRules : $scope.advancedStylingRules
            });
        };
    }
]);