/**
 * Created by atiq on 7/19/18.
 */
(function() {
    'use strict';

    appModule
        .directive('printPreview', function() {
        return {
            templateUrl: 'static/Templates/Print/printPreviewDirective.html',
            restrict: 'AE',
            controllerAs: 'ctrl',
            controller: 'printPreviewController'
        };
    });
})();
