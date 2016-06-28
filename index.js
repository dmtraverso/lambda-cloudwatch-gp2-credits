"use strict";
console.log('Loading function');

let AWS = require('aws-sdk');
let cloudwatch = new AWS.CloudWatch();
let ec2 = new AWS.EC2();
const period = 3600;
var counters = [];

// returns time in seconds in string
function now() {
    var d = new Date();
    return Math.round(d.getTime() / 1000);
}

// Get Read and Write metrics for each volume
function getMetrics(vol, callback) {

    var end_time = now();
    var params = {
        EndTime: end_time,                 
        MetricName: 'VolumeReadOps',
        Namespace: 'AWS/EBS',
        Period: period,
        StartTime: end_time - period,
        Statistics: [
            'Sum',
        ],
        Dimensions: [{
            Name: 'VolumeId',
            Value: vol.VolumeId
        }]
    }

    cloudwatch.getMetricStatistics(params, function(err, data) {
        if (err) console.log(err, err.stack);   // an error occurred
        //else     console.log(data);           // successful response

        callback(data);
    });
}

exports.handler = (event, context, callback) => {
    var params = {
        Filters: [{
            Name: 'volume-type',
            Values: [
                'gp2',
            ]
        }, {
            Name: 'tag:monitor',
            Values: [
                'true',
            ]
        }]
    };

    ec2.describeVolumes(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        //else     console.log(data);           // successful response

        var itemsProcessed = 0;
        data.Volumes.forEach((item, index, array) => {
            getMetrics(item, (results) => {
                console.log(results);
                itemsProcessed++;
                if (itemsProcessed === array.length) {
                    callback(null, 'OK'); // Echo back the first key value
                }
            });
        });
    });

    // callback('Something went wrong');
};