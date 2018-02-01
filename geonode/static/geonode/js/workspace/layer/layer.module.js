(function(){
    angular.module('layerApp', 
    ['ui.grid', 'ui.grid.selection', 'ui.grid.cellNav','ui.grid.autoResize','ui.grid.pagination'])
    .config(['$interpolateProvider', '$locationProvider', function($interpolateProvider, $locationProvider) {
        $interpolateProvider.startSymbol('[{');
        $interpolateProvider.endSymbol('}]');
        $locationProvider.html5Mode(true);
    }]);
})();