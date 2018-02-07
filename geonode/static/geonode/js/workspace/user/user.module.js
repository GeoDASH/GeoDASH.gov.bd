(function(){
    angular.module('userApp', ['ui.grid', 'ui.grid.pagination', 'ui.grid.exporter','ui.grid.autoResize'])
    .config(['$interpolateProvider', '$locationProvider', function($interpolateProvider, $locationProvider) {
        $interpolateProvider.startSymbol('[{');
        $interpolateProvider.endSymbol('}]');
        $locationProvider.html5Mode(true);
    }]);
})();