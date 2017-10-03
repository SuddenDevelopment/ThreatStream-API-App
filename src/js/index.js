const _ = require('lodash');
const libFile = require('fs');
const libRest = require('request');
const libTime = require('moment');

//alasql.worker();

var app = angular.module('appMain', ['ngMaterial','ngAnimate']).config(function($mdThemingProvider) {
		$mdThemingProvider.theme('default').dark();
	});
app.controller('controllerMain', function($rootScope,$scope, $mdDialog, $http, $window) {
/*----====|| SETUP VARIABLES ||====----*/
	//$scope.arrProviders=objProviders.providers;
	//generic object to hold temporary things for form selections
	$scope.tmp={
     "username":''
    ,"key":''
    ,"days":'7'
    ,"report":'orgs'
  };
  $scope.view={"summary":[]};
  $scope.data={"records":[],"orgs":[]};
  $scope.info={"records":0,"pages":0,"loaded":0};
  alasql('create table indicators');

var fnReport =function(){
  $scope.data.orgs = alasql(
    'SELECT \
    COUNT(*) as records, org, created_date \
    FROM indicators \
    GROUP BY created_date, org \
    ORDER BY MIN(created_jsts) \
  ');
  $scope.data.summary=alasql(
    'SELECT \
    COUNT(*) as records, COUNT(DISTINCT(created_date)) as days, COUNT(DISTINCT(org)) as orgs \
    FROM indicators \
  ');
  $scope.$evalAsync();
};

var fnGetIndicators=function(){
  var dt7Days = libTime().subtract(parseInt($scope.tmp.days), 'days').toISOString();
  console.log(dt7Days);
  var intOffset = $scope.info.loaded*1000;
  var objRequest={
     "method":'GET'
    ,"url":'https://api.threatstream.com/api/v2/intelligence/'
    ,"json":true
    ,"qs":{
       "username":$scope.tmp.username
      ,"api_key":$scope.tmp.key
      ,"extend_source":true
      ,"limit":1000
      ,"offset":intOffset
      ,"order_by":'-created_ts'
      ,"status":'active'
      ,"trustedcircles":10052
      ,"created_ts__gte":dt7Days
    }
  };


  libRest(objRequest, function (error, response, objBody) {
    console.log(objBody);
    if($scope.info.pages===0){ $scope.info.pages=objBody.meta.total_count/1000; }
    for(var i=0;i<objBody.objects.length;i++){
      var objRecord=objBody.objects[i];
      objRecord.created_date=libTime(objRecord.created_ts).format('YYYY-MM-DD');
      objRecord.created_jsts=libTime(objRecord.created_ts).format('x');
      $scope.data.records.push(objRecord);
    }

    //else{ $scope.data= $scope.data.concat(objBody.objects); }
    //load the data into alasql
    alasql.tables.indicators.data=$scope.data.records;
    var objResult=alasql('select count(*) as records from indicators');
    $scope.info.records=objResult['0'].records;
    //update pages loaded
    $scope.info.loaded++;
    //load next page?
    if($scope.info.pages>$scope.info.loaded){ fnGetIndicators(); }
    else{ fnReport(); }
  });
};

$scope.fnReport=function(){
  console.log($scope.tmp.username, $scope.tmp.key);
  fnGetIndicators();
  fnReport();
};


/*----====|| Modal pattern ||====----*/
	var fnShowModal=function(strTemplate,ev){
		if(typeof ev === 'undefined'){ev={};}
		$mdDialog.show({
				controller: DialogController,
				templateUrl: './templates/'+strTemplate,
				parent: angular.element(document.body),
				targetEvent: ev,
				scope:$scope,
				preserveScope: true,
				clickOutsideToClose:false
			});
	};

	$scope.hide = function() { $mdDialog.hide(); };
	$scope.cancel = function() { $mdDialog.cancel(); };

/*----====|| RUN ON INIT ||====----*/

});