"use strict";
console.log('Loading function');

let async = require('async');
let AWS = require('aws-sdk');
let cloudwatch = new AWS.CloudWatch();
let ec2 = new AWS.EC2();

// Variables 
const period = 3600;
var counters = [];

// returns time in seconds in string
function now() {
    var d = new Date();
    return Math.round(d.getTime() / 1000);
}

function getVolumeMetric(volume_id, metric, callback) {
    var end_time = now();

    // Prepare params variable for CloudWatch
    var params = {
        MetricName : metric,
        EndTime: end_time,
        Namespace: 'AWS/EBS',
        Period: period,
        StartTime: end_time - period,
        Statistics: [
            'Sum',
        ],
        Dimensions: [{
            Name: 'VolumeId',
            Value: volume_id
        }]
    }

    // Call CloudWatch
    cloudwatch.getMetricStatistics(params, function(err, data) {
        if (err) {
            callback(err.stack);
        }
        else {
            //console.log(data);
            if (data.Datapoints.length !== 0) {
                //console.log(data);
                callback(data.Datapoints[0].Sum); 
            }
            else {
                callback(0);
            }
        }
    });
}

// Get Read and Write metrics for each volume
function getMetrics(vol, callback) {

    async.parallel({
        ReadOps: function(callback) {

            getVolumeMetric(vol.VolumeId, 'VolumeReadOps', (data) => {
                callback(null, data);
            });
        },

        WriteOps: function(callback) {

            getVolumeMetric(vol.VolumeId, 'VolumeWriteOps', (data) => {
                callback(null, data);
            });
        } 
    }, function(err, results) {

            // results is now equals to: {one: 'abc\n', two: 'xyz\n'}
            console.log('Results', results);
            //callback(results.ReadOps + results.WriteOps);
            callback(results.ReadOps + results.WriteOps);
    });
};

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
        }, {
            Name: 'attachment.status',
            Values: [
                'attached'
            ]
        }]
    };

    ec2.describeVolumes(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        //else     console.log(data);           // successful response

     /*   async.each(data.Volumes, function(volume, callback) {

            // Perform operation on file here.
            console.log('Processing volume ' + volume.VolumeId);
            getMetrics(volume, (results) => {
                console.log(results);
                callback();
            });
        }, function(err){
            // if any of the file processing produced an error, err would equal that error
            if (err) {
              // One of the iterations produced an error.
              // All processing will now stop.
              console.log('A file failed to process');
            } else {
              console.log('All files have been processed successfully');
            }
        });*/
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