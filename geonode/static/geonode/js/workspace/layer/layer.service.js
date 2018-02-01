(function(){
    angular.module('layerApp')
    .service('layerService',function($http,$q){
         function get(url){
            var deferred = $q.defer();
            $http.get(url)
                .success(function (res) {
                    deferred.resolve(res);
                }).error(function (error, status) {
                deferred.reject({error: error, status: status});
            });
            return deferred.promise;
         }

         function post(url,data){
            var deferred = $q.defer();
            $http.post(url,data)
                .success(function (res) {
                    deferred.resolve(res);
                }).error(function (error, status) {
                deferred.reject({error: error, status: status});
            });
            return deferred.promise;
         }

        this.getLayerInformation=function(url){
            return get(url);
        };
        this.submitLayerInformation=function(url,data){
            return post(url,data);
        };
        this.getAllLayers=function(url){
            return get(url);
        };
        this.publishLayer=function(url,data){
            return post(url,data);
        };
        this.unpublishLayer=function(url,data){
            return post(url,data);
        };
    });
})();