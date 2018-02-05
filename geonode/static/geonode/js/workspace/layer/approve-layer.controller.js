(function(){
    angular.module('layerApp').controller('approveLayerController',
    function($scope,layerService,uiGridConstants){
        $scope.layer={};
        $scope.departments=[];
        $scope.gridApi={};
        $scope.layerApprovalUrl="";
        $scope.gridOption = {
            enableRowSelection: true,
            enableSelectAll: true,
            rowHeight:30,
            data: [],
            enableGridMenu: false,
            exporterCsvFilename: self.layerName + '.csv',
            enableHorizontalScrollbar: uiGridConstants.scrollbars.ALWAYS,
            columnDefs: [
                { field: 'Name' , displayName : 'Name'},
                { field: 'DateType',displayName : 'Data Type' }
            ]
        };
        $scope.gridOption.onRegisterApi = function(gridApi) {
            $scope.gridApi = gridApi;
          };

        function getPostLayerDataInformation(){
            var data={};
            data.layerId=$scope.layer.Id;
            var permittedOrganizations=_.map(_.filter($scope.departments,function(department){
                return department.IsChecked;
                }),"id");
            data.permittedOrganizations=permittedOrganizations;
            var selectedAttributes=_.map($scope.gridApi.selection.getSelectedRows(),"Name");
            data.permittedAttributes=selectedAttributes;
            return data;
        }

        function postLayerData(url,data){
            layerService.submitLayerInformation(url,data).then(function(response){
                console.log(response);
            },function(error){
                console.log(error);
            });
        }


        $scope.approveLayer=function(){
            var data=getPostLayerDataInformation();
            data.methodType="ApproveLayer";
            postLayerData($scope.layerApprovalUrl,data);
        };

        $scope.publishLayer=function(){
            var data=getPostLayerDataInformation();
            data.methodType="SubmitForApproval";
            postLayerData($scope.layerApprovalUrl,data);
        };

        function getLayerInformation(){
            layerService.getLayerInformation('/static/geonode/js/workspace/layer/layer.json').then(function(response){
                $scope.layer=response.layer;
                $scope.departments=response.organizations;
                $scope.gridOption.data=response.layer.Attributes;
            },function(error){
                console.log(error);
            });
            layerService.getOrganizations('/api/groups').then(function(response){
                    $scope.departments=response.objects;
                },function(error){
                    console.log(error);
                });
        }

        function inIt(){
            getLayerInformation();
        }
        inIt();
    });
})();
