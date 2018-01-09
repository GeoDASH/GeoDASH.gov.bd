﻿appModule.controller('attributeGridController', ['$scope', '$rootScope', '$modalInstance', 'featureRepository',
    'attributeGridService', 'attributeValidator', 'layerId', 'mapService', 'featureService', 'attributeTypes',
    'cqlFilterCharacterFormater', 'mapTools', '$timeout', 'mapAccessLevel',
    function ($scope, $rootScope, $modalInstance, featureRepository, attributeGridService, attributeValidator,
        layerId, mapService, featureService, attributeTypes, cqlFilterCharacterFormater, mapTools, $timeout, mapAccessLevel) {

        var surfLayer, activeLayerId;

        initGrid(layerId);

        function initGrid(newActiveLayerId) {

            $scope.gridData = { attributeRows: [] };
            attributeGridService.resetAll();
            $scope.search = {};
            activeLayerId = newActiveLayerId;
            surfLayer = mapService.getLayer(activeLayerId);
            mapService.setAllFeaturesUnselected();
            $scope.data = { loading: true, isReadonly: !surfLayer.isWritable() || !mapAccessLevel.isWritable };
            $scope.sorting = { predicate: null };
            $scope.pagination = { totalItems: 0, currentPage: 1, itemsPerPage: 10, pageSizes: [10, 50, 100] };
            $scope.gridData = { attributeDefinitions: [], attributeRows: [] };
            $scope.lastActiveHeader = { index: -1, isAccending: true };

            $scope.gridData.attributeDefinitions = surfLayer.getAttributeDefinition();

            $scope.config = {
                contextMenu: {
                    items: {
                        "remove_row": {
                            disabled: function () {
                                return $scope.data.isReadonly;
                            }
                        },
                        "alignment": {},
                        // "freeze_column": {} //todo: it sorts column, which creates problem with attribute definition mapping; need to figure this out later
                    }
                },
                manualColumnFreeze: true,
                stretchH: "all",
                afterChange: function (change, source) {
                    if (source === "edit") {
                        attributeGridService.storeChanges(change, $scope.gridData.attributeRows);
                    } else if (source === "autofill" || source === "paste") {
                        attributeGridService.storeChanges(change, $scope.gridData.attributeRows);
                    }
                },
                afterOnCellMouseDown: function (event, pos, elem) {
                    if (pos.row === -1) {
                        setActiveHeader(pos.col);
                    }
                },
                colHeaders: attributeGridService.getColumnHeaders($scope.gridData.attributeDefinitions),
                rowHeaders: true,
                columns: attributeGridService.getColumns($scope.gridData.attributeDefinitions, attributeTypes),
                manualColumnResize: true,
                manualRowResize: true,
                allowInsertRow: false,
                afterCreateRow: function (index, amount) {
                    $scope.gridData.attributeRows.splice(index, amount);
                },
                beforeRemoveRow: function (rowIndex) {
                    attributeGridService.deleteRow($scope.gridData.attributeRows[rowIndex].Fid);
                },
                cells: function (row, col) {
                    if (isNaN(col)) return { readOnly: $scope.data.isReadonly };
                    return { readOnly: $scope.data.isReadonly || attributeTypes.isReadOnlyType($scope.gridData.attributeDefinitions[col].Type) }
                },
                beforeKeyDown: function (e) {
                    validateAndUpdateValue(e);
                }
            }

            loadAttributeGridInfo();
        }

        function validateAndUpdateValue(event) {
            var selectedCell = $scope.config.table.getSelected();
            if (selectedCell) {
                var valueBeforeChange = event.realTarget.value;
                $timeout(function () {
                    if (!isAttributeValid(event.realTarget.value, $scope.gridData.attributeDefinitions[selectedCell[1]])) {
                        event.realTarget.value = valueBeforeChange;
                    }
                });
            }
        }

        function stopLoading() {
            $scope.data.loading = false;
        }

        function loadAttributeGridInfo() {

            loadGridDataFromServer($scope.pagination.currentPage, stopLoading, stopLoading);

            attributeGridService.getNumberOfFeatures(surfLayer.DataId).success(function (numberOfFeatures) {
                //$scope.pagination.totalItems = numberOfFeatures;
                $scope.pagination.totalItems = Number($(numberOfFeatures)[1].attributes.numberoffeatures.value);
                
            }).error(function () {
                //$scope.pagination.totalItems = 100;
                $scope.gridData.attributeDefinitions = [];
            });
        }

        function getRequestObject(currentPage) {
            var currentPageSize = $scope.pagination.itemsPerPage;
            var startIndex = currentPageSize * currentPage - currentPageSize;
            var requestObj = {
                request: 'GetFeature',
                typeName: surfLayer.DataId,
                startIndex: startIndex,
                count: currentPageSize,
                maxFeatures: currentPageSize,
                sortBy: $scope.sorting.predicate ? $scope.sorting.predicate + ($scope.lastActiveHeader.isAccending ? "" : "+D") : '',//surfLayer.IdColumn
                version: '2.0.0',
                outputFormat: 'GML2',
                exceptions: 'application/json'
            };

            if ($scope.search.attribute && $scope.search.value) {
                var searchValue = $scope.search.value;
                if (!attributeTypes.isNumericType($scope.search.attribute.Type)) {
                    requestObj.CQL_FILTER = $scope.search.attribute.Id + " ILIKE " + "'%25" + cqlFilterCharacterFormater.formatSpecialCharacters(searchValue) + "%25'";
                } else {
                    requestObj.CQL_FILTER = $scope.search.attribute.Id + "=" + searchValue;
                }
            }
            return requestObj;
        }

        function loadGridDataFromServer(currentPage, onSuccess, onError) {
            $scope.loading = true;
            var requestObj = getRequestObject(currentPage);

            attributeGridService.getGridData(requestObj, surfLayer).then(function (features) {
                attributeGridService.populateDataIntoGrid($scope.gridData, features);
                if (onSuccess) onSuccess();
                attributeGridService.changeEditedRows($scope.gridData);
                attributeGridService.removeDeletedRows($scope.gridData);
                $scope.loading = false;
                $scope.config.table.render();

            }).catch(function () {
                if (onError) {
                    onError();
                }
                $scope.loading = false;
            });
        }

        $scope.searchByAttribute = function () {
            loadGridDataFromServer($scope.pagination.currentPage);
            $scope.pagination.currentPage = 1;
        };

        $scope.onPageSelect = function (currentPage) {
            loadGridDataFromServer(currentPage);
            mapService.setAllFeaturesUnselected();
        }

        function setActiveHeader(colIndex) {
            if ($scope.lastActiveHeader.index === colIndex) {
                $scope.lastActiveHeader.isAccending = !$scope.lastActiveHeader.isAccending;
            } else {
                $scope.lastActiveHeader.index = colIndex;
                $scope.sorting.predicate = $scope.gridData.attributeDefinitions[colIndex].Id;
            }

            loadGridDataFromServer($scope.pagination.currentPage);
        };

        $scope.itemPerPageChanged = function () {
            $scope.pagination.currentPage = 1;
            loadGridDataFromServer($scope.pagination.currentPage);

            mapService.setAllFeaturesUnselected();
        };

        function isAttributeValid(item, attributeDefinition) {
            var isValid = true;
            if (attributeTypes.isNumericType(attributeDefinition.Type)) {
                isValid = attributeValidator.isNumberWithinRange(item, attributeDefinition.Precision, attributeDefinition.Scale);
            } else if (attributeTypes.isTextType(attributeDefinition.Type)) {
                isValid = attributeValidator.isTextLengthValid(item, attributeDefinition.Length);
            }
            return isValid;
        };


        function getMessageToShow() {
            return attributeGridService.hasSingleFeatureToDelete() ?
                appMessages.confirm.deleteSignleItemFromAttributeGrid :
                appMessages.confirm.deleteMultipleItemFromAttributeGrid;
        }

        function closeModal() {
            try {
                $modalInstance.close();
            } catch (error) {
            }
            $scope.config.table.destroy();
        }

        function saveFeatures() {
            var features = attributeGridService.getFeaturesWithChangedAttributes(activeLayerId);
            featureService.saveAttributes(features, true);
            mapTools.activeLayer.getActiveLayer().tools.selectFeature.unselectAllFeatures();
            closeModal();
        }

        $scope.saveChanges = function () {
            if (attributeGridService.haveFeaturesToDelete()) {
                dialogBox.confirm({
                    text: getMessageToShow(),
                    action: function () {
                        attributeGridService.removeDeletedFeatures(activeLayerId);
                        saveFeatures();
                    },
                    width: "350px"
                });
            } else {
                saveFeatures();
            }
        };

        //mapTools.activeLayer.events.register('changed', function (newActiveLayer) {
        //    initGrid(newActiveLayer.getId());
        //});

        //jantrik.EventPool.register('FeatureDeleted', function (fid) {
        //    attributeGridService.deletedRow(_.findWhere($scope.gridData.attributeRows, { Fid: fid }), $scope.gridData);
        //});

        $scope.closeAttributeGrid = function () {
            closeModal();
            mapService.setAllFeaturesUnselected();
        };
    }]);
