// const { Worker, isMainThread } = require('worker_threads');
// const express = require('express');
// const path = require('path');
// const bodyParser = require('body-parser');
// const app = express();
// const port = 3000;

// app.use(bodyParser.json());

// app.post('/local-convert', (req, res) => {
//   const filename = req.body.filename;
//   if (filename == null) {
//     res.send({ error: 'No filename defined in the request' });
//     return;
//   }
//   if (isMainThread) {
//     let thread = new Worker(path.resolve(__dirname, 'converter_thread.js'), {
//       workerData: { filename: filename },
//     });

//     thread.on('message', (data) => {
//       res.send(data);
//     });

//     thread.on('error', (err) => {
//       res.send({ success: false, error: err });
//     });

//     thread.on('exit', (code) => {
//       if (code != 0) {
//         console.log('Worker Thread exited with code: ' + code);
//       }
//     });
//   }
// });

// app.listen(port, () => {
//   console.log(`USDZ Converter Server running at http://localhost:${port}`);
// });

const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const bodyParser = require("body-parser");
const { isMainThread, Worker } = require("worker_threads");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const https = require("https");
const typeis = require("type-is");
const mime = require("mime-types");
const { v4: uuid } = require("uuid");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

var upload = multer({ storage: storage });

app.use(express.json({ limit: "20mb" }));
app.use(cors());

app.use(express.static(path.join(__dirname, "public")));

app.post("", upload.single("gltf"), function (req, res, next) {
  const filename = req.file.filename;

  if (filename == null) {
    res.send({ error: "No filename defined in the request" });
    return;
  }
  if (isMainThread) {
    let thread = new Worker(path.resolve(__dirname, "converter_thread.js"), {
      workerData: { filename: filename },
    });

    thread.on("message", (data) => {
      res.send(data);
    });

    thread.on("error", (err) => {
      res.send({ success: false, error: err });
    });

    thread.on("exit", (code) => {
      if (code != 0) {
        console.log("Worker Thread exited with code: " + code);
      }
    });
  }
});

app.post("/from-url", function (req, res, next) {
  const { sourceUrl, destSignedUrl } = req.body;

  if (sourceUrl == null) {
    res.send({ error: "There is no source url" });
    return;
  }

  axios
    .get(sourceUrl, { responseType: "stream" })
    .then((response) => {
      console.log("file downloaded successfully, next step: convert it to glb");

      try {
        const fileId = uuid();
        const filePath = path.join(
          __dirname,
          "..",
          "uploads",
          `/${fileId}.glb`
        );
        const writer = fs.createWriteStream(filePath);

        response.data.pipe(writer);

        writer.on("finish", () => {
          if (isMainThread) {
            try {
              let thread = new Worker(
                path.resolve(__dirname, "converter_thread.js"),
                {
                  workerData: { filename: filePath },
                }
              );

              thread.on("message", (data) => {
                const { success, error } = data;
                if (success)
                  try {
                    const file = `/usr/src/app/src/${fileId}.usdz`;
                    if (destSignedUrl) {
                      try {
                        const fileData = fs.readFileSync(file);
                        axios.put(destSignedUrl, fileData);
                        res.send({ success: true, destSignedUrl });
                        return;
                      } catch (error) {
                        console.log("Upload to signed url failed");
                        console.log(error);
                        res.send({
                          hasError: true,
                          message: "Upload to signed url failed" + code,
                          error: error,
                        });
                        return;
                      }
                    }
                    res.send({ file, hasError: false });
                    return;
                  } catch (error) {
                    console.log("return file error");
                    console.log(error);
                  }
                else {
                  console.log(error);
                  res.send({ error, hasError: true, data });
                }
              });

              thread.on("error", (err) => {
                res.send({
                  hasError: true,
                  message: "Thread Has Error",
                  error: err,
                });
              });

              thread.on("exit", (code) => {
                if (code != 0) {
                  console.log("Worker Thread exited with code: " + code);
                  res.send({
                    hasError: true,
                    message: "Worker Thread exited with code" + code,
                  });
                }
              });
            } catch (error) {
              console.log("Error on making thread");
              console.log(error);
              res.send({
                hasError: true,
                message: "Error on write glb file to disk",
                error: error,
              });
            }
          }
        });

        writer.on("error", (err) => {
          res.send({
            hasError: true,
            message: "Error saving file",
            error: JSON.stringify(err),
          });
          console.log(err);
        });
      } catch (error) {
        console.log("Error on write glb file to disk");
        console.log(error);
        res.send({
          hasError: true,
          message: "Error on write glb file to disk",
          error: error,
        });
        return;
      }
    })
    .catch((error) => {
      console.log(error);
      res.send({ hasError: true, message: "Error downloading file", error });
      return;
    });
});

app.get("/status", function (req, res, next) {
  console.log("status has been called");
  filePath = path.join(__dirname, `uploads/${uuid()}`);
  res.send({ hasError: false, status: "OK", filePath });
});

app.get("", function (req, res, next) {
  var filename = req.query.file;
  const file = `/usr/src/app/uploads/${filename}`;
  res.download(file);
});

app.get("/ai/image", function (req, res, next) {
  var filename = req.query.file;
  const file = path.join(__dirname, "ai-images", filename);
  res.download(file);
});

// app.get('/download', (req, res) => {
//   const fileUrl = req.query.fileUrl; // Get the file URL from the query params

//   https.get(fileUrl, (response) => {
//     let fileBuffer = Buffer.from([]);

//     response.on('data', (chunk) => {
//       fileBuffer = Buffer.concat([fileBuffer, chunk]);
//     });

//     response.on('end', () => {
//       res.setHeader('Content-disposition', `attachment; filename=${fileUrl}`);
//       res.send(fileBuffer);
//     });
//   }).on('error', (error) => {
//     console.error(`Error downloading file: ${error}`);
//     res.status(500).send('Error downloading file');
//   });
// });

// app.get('/download', (req, res) => {
//   const fileUrl = req.query.fileUrl; // Get the file URL from the query params

//   https.get(fileUrl, (response) => {
//     let fileBuffer = Buffer.from([]);

//     response.on('data', (chunk) => {
//       fileBuffer = Buffer.concat([fileBuffer, chunk]);
//     });

//     response.on('end', () => {
//       res.setHeader('Content-disposition', 'attachment; filename=texture.png');
//       res.send(fileBuffer);
//     });
//   }).on('error', (error) => {
//     console.error(`Error downloading file: ${error}`);
//     res.status(500).send('Error downloading file');
//   });
// });
// app.post("/image", (req, res) => {
//    const base64Image = req.body.img;

//   // Decode the Base64 image data
//   const decodedImage = Buffer.from(base64Image, "base64");

//   // Set the response headers to indicate an image is being returned
//   res.setHeader("Content-Type", "image/png");
//   res.setHeader("Content-Disposition", "attachment; filename=image.png");

//   // Send the decoded image data as the response
//   res.send(decodedImage);
// });

app.post("/image", (req, res) => {
  const base64Image = req.body.img;

  // Decode the Base64 image data
  const decodedImage = Buffer.from(base64Image, "base64");

  const fileName = `${Date.now()}.png`;
  // Save the decoded image to disk
  fs.writeFile(
    path.join(__dirname, "ai-images", fileName),
    decodedImage,
    (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Error saving file");
        return;
      }

      // Set the response headers to indicate an image is being returned
      // res.setHeader("Content-Type", "image/png");
      // res.setHeader("Content-Disposition", "attachment; filename=image.png");

      // Send the decoded image data as the response
      res.json({
        fileUrl: `${req.get("host")}/ai/image?file=${fileName}`,
      });
    }
  );
});

// app.get("/download", (req, res) => {
//   const fileUrl = req.query.fileUrl; // Get the file URL from the query params

//   https
//     .get(fileUrl, (response) => {
//       let fileBuffer = Buffer.from([]);

//       response.on("data", (chunk) => {
//         fileBuffer = Buffer.concat([fileBuffer, chunk]);
//       });

//       response.on("end", () => {
//         const contentType = response.headers["content-type"];
//         const mimeType = typeis.is(fileBuffer, [contentType]);
//         if (!mimeType) {
//           console.error("Error determining file type");
//           res.status(500).send("Error determining file type");
//           return;
//         }

//         const fileExtension = mime.extension(mimeType);
//         res.setHeader(
//           "Content-disposition",
//           "attachment; filename=file." + fileExtension
//         );
//         res.setHeader("Content-type", contentType);
//         res.send(fileBuffer);
//       });
//     })
//     .on("error", (error) => {
//       console.error(`Error downloading file: ${error}`);
//       res.status(500).send("Error downloading file");
//     });
// });

// app.get("/download", (req, res) => {
//   const fileUrl = req.query.fileUrl; // Get the file URL from the query params
//   const filename = path.basename(fileUrl);
//   const filePath = path.join(__dirname, "src", "fetched-files", filename);
//   const file = fs.createWriteStream(filePath);

//   https
//     .get(fileUrl, (response) => {
//       response.pipe(file);

//       file.on("finish", () => {
//         file.close(() => {
//           res.setHeader(
//             "Content-disposition",
//             `attachment; filename=${filename}`
//           );
//           res.sendFile(filePath);
//         });
//       });
//     })
//     .on("error", (error) => {
//       console.error(`Error downloading file: ${error}`);
//       res.status(500).send("Error downloading file");
//     });
// });

app.listen(9090, () => console.log("Listening on port 9090"));
