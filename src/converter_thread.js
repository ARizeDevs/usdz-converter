const { exec } = require('child_process');
const { workerData, parentPort } = require('worker_threads');
const path = require('path');

convertFile(workerData.filename)
  .then((outputPath) => {
    parentPort.postMessage({ success: true, outputPath: outputPath });
  })
  .catch((error) => {
    parentPort.postMessage({ success: false, error: error });
  });

function convertFile(filepath) {
  // // absolute paths are not allowed
  // if (path.isAbsolute(filepath)) {
  //   reject('Absolute paths are not allowed!');
  //   return;
  // }

  // construct absolute path by adding the working dir
  // const absolutePath = path.normalize(filepath);

  // check if path is outside of working dir
  // if (!absolutePath.startsWith('/usr/src/app/')) {
  //   reject('You are trying to access a path outside of the working directory');
  //   return;
  // }
  const filename = path.parse(filepath).name;
  const dirname = path.dirname(filepath);
  const tmpFolder = randomString();

  console.log(filename, dirname, tmpFolder);
  return new Promise((resolve, reject) => {
    exec(
      `usd_from_gltf ${filepath} /usr/src/app/tmp/${tmpFolder}/${filename}.usdz && mv /usr/src/app/tmp/${tmpFolder}/${filename}.usdz ${dirname} && rmdir /usr/src/app/tmp/${tmpFolder}`,
      (error, stdout, stderr) => {
        if (error) {
          reject(error.message);
          return;
        }
        if (stderr) {
          reject(stderr);
          return;
        }
        resolve(`${filename}.usdz`);
      }
    );
  });
}

function randomString() {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substring(0, 10);
}
