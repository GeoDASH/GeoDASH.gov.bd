(function(){
    angular.module('layerApp').controller('approveLayerController',
    function($scope,layerService,uiGridConstants){
        $scope.layer={};
        $scope.layer_id="";
        $scope.departments=[];
        $scope.gridApi={};
        $scope.layerApprovalUrl="/api/layer-attribute-permission-set/";
        $scope.gridOption = {
            enableRowSelection: true,
            enableSelectAll: true,
            rowHeight:30,
            data: [],
            enableGridMenu: false,
            exporterCsvFilename: self.layerName + '.csv',
            enableHorizontalScrollbar: uiGridConstants.scrollbars.ALWAYS,
            columnDefs: [
                { field: 'attribute' , displayName : 'Name'},
                { field: 'attribute_type',displayName : 'Data Type' },
                { name: 'id', visible: false,displayName:"Id" },
                { name: 'resource_uri', visible: false,displayName:"Resource Uri" }
            ]
        };
        $scope.gridOption.onRegisterApi = function(gridApi) {
            $scope.gridApi = gridApi;
          };

        function getPostLayerDataInformation(){
            var permissions = {
                'users': {},
                'groups': {}
              };
            permissions.users['AnonymousUser'] = [];
            var permissionAttributes=
          ['view_resourcebase', 'download_resourcebase'];
            var data={};
            data.layer_pk =$scope.layer_id;
            var permittedOrganizations=_.map(_.filter($scope.departments,function(department){
                return department.IsChecked;
                }),"id");
            angular.forEach(permittedOrganizations,function(organizationId){
                permissions.groups[organizationId]= permissionAttributes;
            });
            data.permissions =JSON.stringify(permissions);
            var selectedAttributes=_.map($scope.gridApi.selection.getSelectedRows(),"id");
            data.attributes =JSON.stringify(selectedAttributes);
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
            console.log(data);
            postLayerData($scope.layerApprovalUrl,data);
        };

        $scope.publishLayer=function(){
            var data=getPostLayerDataInformation();
            console.log(data);
            // postLayerData($scope.layerApprovalUrl,data);
        };
        angular.isUndefinedOrNull = function(val) {
            return angular.isUndefined(val) || val === null ;
        };
        function getLayerInformation(layerId){
            layerService.getLayerInformation('/api/layer-attributes-permission/'+layerId+'/').then(function(response){
                $scope.layer=response;
                $scope.layer.access_level=response.limited_access ? 'Public' : 'Limited';
                $scope.layer.belongs_to="" + (angular.isUndefinedOrNull(response.department) ? 'N/A' : response.department) +' > '+
                                        (angular.isUndefinedOrNull(response.organization) ? 'N/A' : response.organization) +' > '+
                                        (angular.isUndefinedOrNull(response.sector) ? 'N/A' : response.sector ) +"";
                $scope.gridOption.data=response.attributes;
            },function(error){
                console.log(error);
            });
            layerService.getOrganizations('/api/groups').then(function(response){
                    $scope.departments=response.objects;
                },function(error){
                    console.log(error);
                });
        }

        $scope.inIt=function(layerId){
            getLayerInformation(layerId);
            $scope.layer_id=layerId;
        };
    });
})();
