(function() {
    angular
        .module('LayerApp')
        .controller('AttributeViewController', AttributeViewController);

    AttributeViewController.$inject = ['$location', 'LayerService', 'uiGridConstants', 'FileUploader'];

    function AttributeViewController($location, LayerService, uiGridConstants, FileUploader) {
        var self = this;
        self.geoServerUrl = 'api/geoserver/';
        self.propertyNames = [];
        // self.layerName = $location.search().name;
        self.layerName = $location.path().split('/').pop();
        self.gridOptions = {
            paginationPageSizes: [25, 50, 75, 100],
            paginationPageSize: 25,
            data: [],
            minRowsToShow: 15,
            enableGridMenu: true,
            exporterMenuPdf: false,
            exporterMenuCsv: false,
            exporterMenuExcel: false,
            // exporterCsvFilename: self.layerName + '.csv',
            // exporterCsvLinkElement: angular.element(document.querySelectorAll(".custom-csv-link-location")),
            enableHorizontalScrollbar: uiGridConstants.scrollbars.ALWAYS
        };

        function errorFn() {

        }

        var requestObject = {
            version: '1.0.0',
            request: 'GetFeature',
            outputFormat: 'JSON',
            srsName: 'EPSG:3857',
            typeNames: ''
        };

        function getFeatureDetails(url, layerName, propertyName) {
            LayerService.getWFS(url, Object.assign({}, requestObject, {
                typeNames: layerName
            }), false).then(function (res) {
                self.attributeDetails = [];
                if (typeof res.features !== 'undefined') {
                    self.propertyNames.push('fid');
                    res.features.forEach(function (e) {
                        var obj = e.properties;
                        obj.fid = parseInt(e.id.split('.')[1]);
                        self.attributeDetails.push(obj);
                    });
                }
                self.gridOptions.data = self.attributeDetails;

                self.gridOptions.columnDefs = [];
                self.propertyNames.forEach(function (e) {
                    self.gridOptions.columnDefs.push({
                        field: e,
                        displayName: e,
                        minWidth: 120,
                        width: '*'
                    });
                });
            }, errorFn);
        }

        function getLayerFeature(url, layerName) {
            LayerService.getLayerFeatureByName(url, layerName,false).then(function(res) {
                if (typeof res.featureTypes === 'undefined') {
                    return getFeatureDetails(url, layerName, self.propertyNames);
                }
                res.featureTypes.forEach(function(featureType) {
                    featureType.properties.forEach(function(e) {
                        if (e.name !== 'the_geom')
                            self.propertyNames.push(e.name);
                    }, this);
                }, this);
                getFeatureDetails(url, layerName, self.propertyNames);
            }, errorFn);

        }

        function getLayerByName() {
            LayerService.getLayerByName(self.layerName)
                .then(function(res) {
                    getLayerFeature(self.geoServerUrl, res.typename);
                }, errorFn);
        }

        function getGeoServerSettings() {
            self.propertyNames = [];
            getLayerByName();
            // LayerService.getGeoServerSettings()
            //     .then(function(res) {
            //         self.geoServerUrl = res.url;
            //         getLayerByName();
            //
            //     }, errorFn);
        }

        self.file = new FileUploader({
            url: '/api/attribute/' + self.layerName + '/upload/',
            queueLimit: 1,
            headers: {
                'X-CSRFToken': csrftoken
            },
            filters: [{
                name: 'extension',
                fn: function(item) {
                    var fileExtension = item.name.split('.').pop();
                    if (fileExtension !== 'csv') {
                        self.isError = true;
                        self.Message.Error = "Currently supported .csv file only.";
                    }
                    return fileExtension === 'csv';
                }
            }]
        });
        self.isSuccess = false;
        self.isError = false;
        self.Message = {
            Success: "",
            Error: ""
        };
        self.file.onSuccessItem = function(item, response, status, headers) {
            self.isSuccess = true;
            self.Message.Success = "Updated " + response.success + " items.";
        };

        self.upload = function() {
            if (self.file.queue.length) {
                self.file.uploadItem(0);
            }

        };

        // Initialize Call
        (getGeoServerSettings)();
    }
})();