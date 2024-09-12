const express = require("express");
const serverless = require("serverless-http");
const expressStaticGzip = require("express-static-gzip");
const path = require("path");
const cors = require("cors");
const { Readable } = require("stream");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const Busboy = require("busboy");
require("dotenv").config();
const JWT = `Bearer ${process.env.JWT}`;
const app = express();
const staticDir = path.join(__dirname, "../../dist");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(staticDir));
app.use("/", expressStaticGzip(staticDir, { enableBrotli: true, orderPreference: ["br", "gz"] }));
const pinFileToIPFS = async (buffer, fileName) => {
  const formData = new FormData();
  formData.append("file", buffer, fileName);
  const pinataMetadata = JSON.stringify({ name: fileName });
  formData.append("pinataMetadata", pinataMetadata);
  const pinataOptions = JSON.stringify({ cidVersion: 0 });
  formData.append("pinataOptions", pinataOptions);
  try {
    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData,
      {
        maxBodyLength: "Infinity",
        headers: { "Content-Type": `multipart/form-data; boundary=${formData._boundary}`, Authorization: JWT },
      }
    );
    return res.data;
  } catch (error) {
    console.error("Error pinning file to IPFS:", error.message);
    throw error;
  }
};

const pinStringToIPFS = async (string) => {
  const buffer = Buffer.from(string, "utf8");
  const stream = Readable.from(buffer);
  const formData = new FormData();
  formData.append("file", stream, { filepath: "string.txt" });
  try {
    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, { headers: { Authorization: JWT } });
    return res.data;
  } catch (error) {
    console.error("Error pinning text to IPFS:", error.message);
    throw error;
  }
};

app.post("/.netlify/functions/store", (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  busboy.on("file", async (fieldname, file, info) => {
    const { filename, encoding, mimetype } = info;
    const buffers = [];
    file.on("data", (data) => { buffers.push(data) });
    file.on("end", async () => {
      const buffer = Buffer.concat(buffers);
      try {
        const result = await pinFileToIPFS(buffer, filename);
        res.send(result);
      } catch (error) {
        console.error("Failed to store file to IPFS:", error.message);
        res.status(500).send({ error: "Failed to store file to IPFS" });
      }
    });
  });
  busboy.on("field", async (fieldname, val) => {
    if (fieldname === "text") {
      try {
        const result = await pinStringToIPFS(val);
        res.send(result);
      } catch (error) {
        console.error("Failed to store text to IPFS:", error.message);
        res.status(500).send({ error: "Failed to store text to IPFS" });
      }
    }
  });
  req.pipe(busboy);
});
app.get("*", (req, res) => { res.sendFile(path.resolve(staticDir, "index.html")) });
module.exports.handler = serverless(app);