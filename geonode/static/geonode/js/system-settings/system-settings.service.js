(function () {
    angular
        .module('SystemSettingsApp')
        .factory('SettingsService', SettingsService);

    SettingsService.$inject = ['$http', '$q', '$cookies'];

    function SettingsService($http, $q, $cookies) {

        var layerSettings = {};

        function get(url) {
            var deferred = $q.defer();
            $http.get(url)
                .success(function (res) {
                    deferred.resolve(res);
                }).error(function (error, status) {
                deferred.reject({error: error, status: status});
            });
            return deferred.promise;
        }

        function getWithParams(url,data){
            var deferred = $q.defer();
            $http.get(url,data)
                .success(function (res) {
                    deferred.resolve(res);
                }).error(function (error, status) {
                deferred.reject({error: error, status: status});
            });
            return deferred.promise;
        }

        function put(url, data) {
            $http.put(url, data, {
                headers: {
                    'X-CSRFToken': $cookies.get('csrftoken')
                }
            })
                .then(
                    function (response) {
                        // success callback
                        //console.log(response);
                    },
                    function (response) {
                        // failure callback
                    }
                );
        }

        function post(url,data) {
            var deferred = $q.defer();
            $http.post(url,data).then(function (response) {
                deferred.resolve(res);
            },function (error) {
                deferred.reject({error: error, status: status});
                console.log(error);
            });
            return deferred.promise;
        }

        return {
            getLayers: function (data) {
                return get('/api/layers/?'+data);
            },
            getSystemSettings: function (url) {
                return get('/settings/api/system/settings/');
            },
            saveSystemSettings: function (data) {
                return put('/settings/api/settings/save/', data);
            },
            getAddressAttributes: function(uuid){
                return get('/settings/api/address/attributes/'+uuid+"/");
            },
            getLayersForBaseMaps : function () {
                return get('/api/layers-list/');
            },
            saveCustomBaseLayer : function (data) {
                return post("/api/set-layers-base-layer/",data);
            }

        }

    }
})();
