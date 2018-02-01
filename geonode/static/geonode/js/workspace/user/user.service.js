(function(){
    angular.module('userApp')
    .service('userService',function($http,$q){
        this.getUserInformation=function(url){
            var deferred = $q.defer();
            $http.get(url)
                .success(function (res) {
                    deferred.resolve(res);
                }).error(function (error, status) {
                deferred.reject({error: error, status: status});
            });
            return deferred.promise;
        };
        this.createUser=function(url,data){
            var deferred = $q.defer();
            $http.post(url,data)
                .success(function (res) {
                    deferred.resolve(res);
                }).error(function (error, status) {
                deferred.reject({error: error, status: status});
            });
            return deferred.promise;
        };
    });
})();