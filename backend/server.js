const express = require("express");
const expressStaticGzip = require("express-static-gzip");
const path = require("path");
const cors = require("cors");
const { Readable } = require("stream");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const multer = require("multer");
require("dotenv").config();
const JWT = `Bearer ${process.env.JWT}`;

const app = express();
const staticDir = path.join(__dirname, "dist");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("dist"));
app.use(
  "/",
  expressStaticGzip(staticDir, {
    enableBrotli: true,
    orderPreference: ["br", "gz"],
  })
);

const upload = multer({ dest: "uploads/" });

const pinFileToIPFS = async (filePath, fileName) => {
  const formData = new FormData();
  const file = fs.createReadStream(filePath);
  formData.append("file", file);

  const pinataMetadata = JSON.stringify({ name: fileName });
  formData.append("pinataMetadata", pinataMetadata);

  const pinataOptions = JSON.stringify({ cidVersion: 0 });
  formData.append("pinataOptions", pinataOptions);

  try {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: "Infinity",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
          Authorization: JWT,
        },
      }
    );
    return res.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const pinStringToIPFS = async (string) => {
  const buffer = Buffer.from(string, "utf8");
  const stream = Readable.from(buffer);
  const formData = new FormData();
  formData.append("file", stream, { filepath: "string.txt" });

  try {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: { Authorization: JWT },
      }
    );
    return res.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Store Text or File
app.post("/store", upload.single("file"), async (req, res) => {
  try {
    if (req.file) {
      // pinFileToIPFS
      const result = await pinFileToIPFS(req.file.path, req.file.originalname);
      res.send(result);
    } else if (req.body.text) {
      // pinStringToIPFS
      const result = await pinStringToIPFS(req.body.text);
      res.send(result);
    } else {
      res.status(400).send({ error: "No file or text provided" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to store content to IPFS" });
  }
});

// Retrieve Text or File
// app.get("/retrieve", async (req, res) => {
//   const cid = req.body.cid;
//   try {
//     const response = await axios.get(
//       `https://pink-ruling-damselfly-201.mypinata.cloud/ipfs/${cid}`,
//       {
//         headers: { Authorization: JWT },
//       }
//     );
//     res.send(response.text());
//   } catch (error) {
//     console.error(error);
//     res.status(500).send({ error: "Failed to retrieve content from IPFS" });
//   }
// });

app.get("*", (req, res) => {
  res.sendFile(path.resolve(staticDir, "index.html"));
});

// Server Connection
app.listen(8081, () => {
  console.log("Server started on http://localhost:8081");
});
