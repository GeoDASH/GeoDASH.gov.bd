(function(){
    angular.module('userApp').controller('userListController',
     function($scope, uiGridConstants,userService,$timeout) {
        $scope.user={};
        $scope.userInfoUrl="/static/geonode/js/workspace/user/user.json";
        $scope.search = {
            text: ""
        };
        $scope.gridApi={};
        $scope.rowFilter = function( renderableRows ){
            var matcher = new RegExp($scope.search.text.toLowerCase());
            renderableRows.forEach( function( row ) {
              var match = false;
              ['Name','Section','Role']
              .forEach(function( field ){
                if ( row.entity[field].toLowerCase().match(matcher) ){
                  match = true;
                }
              });
                if(!match){
                    row.visible=false;
                }
            });
            return renderableRows;
          };
        $scope.gridOption = {
            paginationPageSizes: [25, 50, 75, 100],
            paginationPageSize: 25,
            enableRowSelection: false,
            enableSelectAll: false,
            rowHeight:40,
            data: [],
            enableGridMenu: false,
            enableHorizontalScrollbar: uiGridConstants.scrollbars.ALWAYS,
            columnDefs: [
                {field : "Id",visible:false},
                {field: 'Name' },
                {field: 'Section' },
                {field: 'Role'},
                {
                    field: 'Action',
                    cellTemplate: '<a class="btn btn-sm btn-default top edit-btn" style="margin : 5px"' +
                        ' ng-click="grid.appScope.gridOption.editUser(row)" ' +
                        ' data-placement="top" data-toggle="tooltip" ' +
                        ' data-original-title="Edit">  ' +
                        '<span class="glyphicon glyphicon-pencil"></span> ' +
                        ' </a> ' +
                        '<a class="btn btn-sm btn-default top remove-btn" style="margin : 5px"' +
                        'data-placement="top" data-toggle="tooltip" ' +
                        'ng-click="grid.appScope.gridOption.deleteUser(row)" ' +
                        'data-original-title="Delete"> ' +
                        '<i class="fa fa-trash-o "></i> ' +
                        '</a>'
                }
            ]
        };
        $scope.gridOption.onRegisterApi = function(gridApi) {
            $scope.gridApi = gridApi;
            $scope.gridApi.grid.registerRowsProcessor( $scope.rowFilter, 200 );
        };
        $scope.filterUser=function(){
            $timeout(function(){
                $scope.gridApi.grid.refresh();             
            });
        };
        $scope.gridOption.editUser = function (row) {
            alert('edit-user');
        };
        $scope.gridOption.deleteUser = function (row) {
            alert('delete-user');
        };
        $scope.createUser=function(){
            console.log($scope.user);
            userService.createUser("/",$scope.user).then(function(response){
                console.log(response);
            },function(error){
                console.log(error);
            });
        };

        function getUserInformation(){
            userService.getUserInformation($scope.userInfoUrl).then(function(response){
                $scope.gridOption.data=response.userlist;
                $scope.user=response.userCreationInfo;
            },function(error){
                console.log(error);
            });
        }

        function inIt(){
            getUserInformation();
        }

        inIt();
    
    });
})();