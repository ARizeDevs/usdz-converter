const { exec } = require("child_process");
const { workerData, parentPort } = require("worker_threads");
const path = require("path");
const fs = require("fs");

convertFile(workerData.filename)
  .then((outputPaths) => {
    parentPort.postMessage({ success: true, outputPaths });
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

  try {
    // Get the file size
    const stats = fs.statSync(filepath);
    const fileSizeInBytes = stats.size;

    // Print the file path and its size
    console.log("File Path: " + filepath);
    console.log("File Size (in bytes): " + fileSizeInBytes);
  } catch (error) {
    console.log(error);
  }

  console.log("filename: " + filename);
  console.log("dirname: " + dirname);
  console.log("tmpFolder:", tmpFolder);

  return new Promise((resolve, reject) => {
    exec(
      `usd_from_gltf ${filepath} ${dirname}/${filename}.usdz`,
      (error, stdout, stderr) => {
        if (error) reject(error);
        else if (stdout) reject(stdout);
        else if (stderr) reject(stderr);
        else
          resolve({
            usdz: `${filename}.usdz`,
            glb: `${filepath}`,
          });
      }
    );
  });
}

function randomString() {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substring(0, 10);
}
