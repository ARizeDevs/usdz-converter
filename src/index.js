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

const express = require('express');
const app = express();
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const { isMainThread, Worker } = require('worker_threads');
const cors = require('cors')

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

var upload = multer({ storage: storage });

app.use(bodyParser.json());
app.use(cors())

app.use(express.static(path.join(__dirname, 'public')));

app.post('', upload.single('gltf'), function (req, res, next) {
  const filename = req.file.filename;

  if (filename == null) {
    res.send({ error: 'No filename defined in the request' });
    return;
  }
  if (isMainThread) {
    let thread = new Worker(path.resolve(__dirname, 'converter_thread.js'), {
      workerData: { filename: filename },
    });

    thread.on('message', (data) => {
      res.send(data);
    });

    thread.on('error', (err) => {
      res.send({ success: false, error: err });
    });

    thread.on('exit', (code) => {
      if (code != 0) {
        console.log('Worker Thread exited with code: ' + code);
      }
    });
  }
});

app.get('', function (req, res, next) {
  var filename = req.query.file;
  const file = `/usr/src/app/uploads/${filename}`;
  res.download(file);
});

app.listen(8080, () => console.log('Listening on port 8080'));
