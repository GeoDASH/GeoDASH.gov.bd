angular.merge=function (src,newObj) {
    return angular.extend({},src,newObj);
};
(function(){
    angular.module('layerApp', [])
    .config(['$interpolateProvider', '$locationProvider', function($interpolateProvider, $locationProvider) {
        $interpolateProvider.startSymbol('[{');
        $interpolateProvider.endSymbol('}]');
        $locationProvider.html5Mode(true);
    }]);
})();