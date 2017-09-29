var fs = require('fs');
var path = require('path');
var parse = require('csv-parse');
var async = require('async');
const AWS = require('aws-sdk');
const dynamodbDocClient = new AWS.DynamoDB({
  region: "ap-southeast-2",
  accessKeyId: '<accessKeyId>',
  secretAccessKey: '<secretAccessKey>'
});

var csv_filename = path.resolve(__dirname, './dump.csv');

rs = fs.createReadStream(csv_filename);
parser = parse({
  columns : true,
  delimiter : ','
}, function(err, data) {
  var split_arrays = [], size = 25;

  while (data.length > 0) {

    //split_arrays.push(data.splice(0, size));
    let cur25 = data.splice(0, size)
    let item_data = []

    for (var i = cur25.length - 1; i >= 0; i--) {
      const this_item = {
        "PutRequest" : {
          "Item": {
            "submission_date": {
              "S": cur25[i]['submission_date (S)']
            },
            "conspirators": {
              "S": cur25[i]['conspirators (S)']
            },
            "drinker": {
              "S": cur25[i]['drinker (S)']
            }
          }
        }
      };
      item_data.push(this_item)
    }
    split_arrays.push(item_data);
  }
  data_imported = false;
  chunk_no = 1;
  async.each(split_arrays, (item_data, callback) => {
    const params = {
      RequestItems: {
        "KeepCupTree" : item_data
      }
    }
    // console.log('***', JSON.stringify(params, ' ', 2));
    dynamodbDocClient.batchWriteItem(params, function(err, res, cap) {
      if (err === null) {
        console.log('Success chunk #' + chunk_no);
        data_imported = true;
      } else {
        console.log(err);
        console.log('Fail chunk #' + chunk_no);
        data_imported = false;
      }
      chunk_no++;
      callback();
    });

  }, () => {
    // run after loops
    console.log('all data imported....');

  });

});
rs.pipe(parser);