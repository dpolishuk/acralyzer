/*
 Copyright 2013 Kevin Gaudin (kevin.gaudin@gmail.com)

 This file is part of Acralyzer.

 Acralyzer is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 Acralyzer is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with Acralyzer.  If not, see <http://www.gnu.org/licenses/>.
 */
(function(acralyzerConfig,angular,acralyzer,acralyzerEvents,$) {
    "use strict";
    /**
     * @class AcralyzerCtrl
     *
     * Application root controller, handles global behavior such as login logout and reports store change.
     *
     */
    function AcralyzerCtrl($scope, ReportsStore, $rootScope, $notify) {
        /**
         * Application scope, visible to children scopes with $scope.acralyzer.
         * @type {Object}
         */
        $scope.acralyzer = {
            apps: []
        };
        $scope.acralyzer.app = null;
        $scope.acralyzer.isPolling = acralyzerConfig.backgroundPollingOnStartup;

        /**
         * Switch to another reports store.
         * @param {String} appName The name of the chosen android application (reports store database without database
         * prefix)
         */
        $scope.acralyzer.setApp = function(appName) {
            if(appName !== $scope.acralyzer.app) {
                $scope.acralyzer.app = appName;
                ReportsStore.setApp($scope.acralyzer.app,
                    function() {
                        console.log("broadcasting APP_CHANGED");
                        $rootScope.$broadcast(acralyzerEvents.APP_CHANGED);
                    }
                );
                if($scope.acralyzer.isPolling) {
                    console.log("Start polling in AcralyzerControllers.setApp");
                    $scope.acralyzer.startPolling();
                }
            }
        };
        $scope.acralyzer.setApp($scope.acralyzer.app);

        ReportsStore.listApps(function(data) {
            console.log("Storage list retrieved.");
            $scope.acralyzer.apps.length = 0;
            $scope.acralyzer.apps = data;
            console.log($scope.acralyzer.apps);
        }, function() {

        });

        $scope.acralyzer.startPolling = function() {
            $scope.acralyzer.isPolling = true;
            ReportsStore.startPolling(function(data){
                if($scope.acralyzer.isPolling) {

                    // Determine what kind of change occurred in the database.
                    var reportsUpdated = false;
                    var reportsDeleted = false;
                    if(data.results && data.results.length > 0) {
                        for(var i = 0; i< data.results.length && !reportsUpdated; i++) {
                            if(data.results[i].doc && data.results[i].deleted) {
                                reportsDeleted = true;
                            } else if(data.results[i].doc && data.results[i].doc.REPORT_ID) {
                                reportsUpdated = true;
                            }
                        }
                    }
                    if(reportsUpdated) {
                        $rootScope.$broadcast(acralyzerEvents.NEW_DATA);
                    } else if (reportsDeleted) {
                        $rootScope.$broadcast(acralyzerEvents.REPORTS_DELETED);
                    }
                } // Do not refresh if a late response is received after the user asked to stop polling.
            });
        };

        $scope.acralyzer.stopPolling = function() {
            console.log("Ok, let's stop polling...");
            $scope.acralyzer.isPolling = false;
            ReportsStore.stopPolling();
        };

        var notifyNewData = function() {
            $notify.warning({
                desktop: true,
                timeout: 10000,
                title: "Acralyzer - " + $scope.acralyzer.app,
                body: "Received new report(s)",
                icon: "img/loader.gif"
            });
        };

        $scope.$on(acralyzerEvents.NEW_DATA, notifyNewData);
        $scope.$on(acralyzerEvents.POLLING_FAILED, $scope.acralyzer.stopPolling);
        $scope.$on(acralyzerEvents.LOGGED_OUT, $scope.acralyzer.stopPolling);
        $scope.$on(acralyzerEvents.LOGGED_IN, function() {
            if(acralyzerConfig.backgroundPollingOnStartup) {
                $scope.acralyzer.startPolling();
            }
        });

    }
    acralyzer.controller('AcralyzerCtrl', ["$scope", "ReportsStore", "$rootScope", "$notify", AcralyzerCtrl]);
})(window.acralyzerConfig,window.angular,window.acralyzer,window.acralyzerEvents,window.jQuery);
