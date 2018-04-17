mapModule.directive('cursorTooltip', [
    function () {
        return {
            restrict: 'EA',
            scope: {
                content: '='
            },
            template: "<div id='tooltip' class='tooltip'>{{content}}</div>",
            controller: [
                '$scope', '$rootScope', 'mapService', '$timeout', '$compile', 'surfToastr',
                function ($scope, $rootScope, mapService, $timeout, $compile, surfToastr) {
                    console.log($scope.content);
                    var map = mapService.getMap();
                    var tooTipOverLay;

                    var initializeToolTip=function () {
                         tooTipOverLay = new ol.Overlay({
                            element: document.getElementById('tooltip'),
                            offset: [10, 0],
                            positioning: 'bottom-left'
                        });
                        map.addOverlay(tooTipOverLay);
                    };

                    function displayTooltip(evt) {
                        if ($scope.content) {
                            tooTipOverLay.setPosition(evt.coordinate);
                        }else tooTipOverLay.setPosition(undefined);
                    }

                    function enableCursorToolTip() {
                        map.on('pointermove', displayTooltip);
                    }

                    function disableToolTipOverLay() {
                        map.un('pointermove', displayTooltip);
                    }

                    enableCursorToolTip();

                    $timeout(initializeToolTip, 0);
                }
            ]
        };
    }
]);