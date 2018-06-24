/**
 * Created by rudra on 3/23/18.
 */
(function(){
    angular.module('layerApp').controller('organizationLayerBackupController',
    function($scope,layerService){
        $scope.backupUrl="/layers/organization/layers/backup";
        $scope.showLoader=false;
        $scope.success=false;
        $scope.error=false;
        $scope.message="An email has been sent to mail to download the backup files";
        function getBackupUrl(){
            return '/layers/organization/'+ $("#org-id").val() + '/layers/backup';
        }
        $scope.backupLayer=function () {
            $scope.showLoader=true;
            $scope.success=false;
            $scope.error=false;
            layerService.backupOrganizationLayers(getBackupUrl()).then(function (response) {
                if(response.success) {
                    $scope.success = true;
                } else {
                    $scope.error = true;
                }
                $scope.message = response.message;
                $scope.showLoader=false;
            },function (error) {
                $scope.message="Internal Server Error";
                $scope.error=true;
                $scope.showLoader=false;
            });

        }
    });
})();