const mongoose = require('mongoose');

let bucket;

function initGridFS() {
  mongoose.connection.once('open', () => {
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads'
    });
    console.log('GridFS bucket ready');
  });
}

function getBucket() {
  if (!bucket) throw new Error('GridFS not initialized');
  return bucket;
}

module.exports = { initGridFS, getBucket };
