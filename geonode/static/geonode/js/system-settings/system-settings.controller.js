(function () {
    angular
        .module('SystemSettingsApp')
        .controller('SystemSettingsController', SystemSettingsController);

    SystemSettingsController.$inject = ['$scope', 'SettingsService'];

    function SystemSettingsController($scope, SettingsService) {

        var systemSettings = SettingsService.getSystemSettings();

        systemSettings.then(function (value) {

                //console.log(value);
                $.each(value, function (index, element) {
                    //console.log(element.content_object.uuid);
                    checkSelectedLayerAttrhave($scope, SettingsService, element.content_object.uuid);
                    if (element.settings_code == "location") {
                        $scope.layerName = element.content_object.title;
                    }
                });

            }, function (error) {
                // This is called when error occurs.
            }
        );

        var layerSettings = SettingsService.getLayers();


        var layersObject;

        layerSettings.then(function (value) {

                layersObject = value.objects;
                $.each(layersObject, function (index, element) {
                    var title = element.title;
                    if (element.title.length > 22) {
                        title = element.title.substring(0, 25) + "...";
                    }
                    $("#layer").append("<option value='" + element.uuid + "'>" + title + "</option>");
                    //console.log(element.id +" "+element.title);
                });

            }, function (error) {
                // This is called when error occurs.
            }
        );


        $scope.layerSettingSave = function () {

            $scope.layerName = $("#layer option:selected").text();
            var uuid = $('#layer :selected').val();
            var data = {
                'uuid': uuid,
                'settings_code': 'location',
            };
            SettingsService.saveSystemSettings(data);
        };

        $scope.changedValue = function () {

            var layerUUID = $("#layer option:selected").val();
            checkSelectedLayerAttrhave($scope, SettingsService, layerUUID);


        }

    }

    function checkSelectedLayerAttrhave($scope, SettingsService, uuid) {
        var addressColumnsStatus = SettingsService.getAddressAttributes(uuid);

        addressColumnsStatus.then(function (value) {

                if (value.status == 'invalid') {

                    var columns = value.columns.toString().replaceAll(',', ', ');

                    $scope.layerStatusMsg = columns + " are missing!";

                }

            }, function (error) {
                // This is called when error occurs.
            }
        );
    }
})();
