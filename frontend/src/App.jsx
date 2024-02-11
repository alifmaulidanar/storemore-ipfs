import "@fontsource-variable/plus-jakarta-sans";
import { useState } from "react";
import {
  CopyOutlined,
  InboxOutlined,
  DownloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  Tabs,
  Button,
  Form,
  Input,
  Select,
  message,
  Upload,
  Tooltip,
  Spin,
  Alert,
} from "antd";
const { TextArea } = Input;
const { Dragger } = Upload;

function App() {
  const [inputType, setInputType] = useState("text");
  const [fileList, setFileList] = useState([]);
  const [responseCID, setResponseCID] = useState("");
  const [responseData, setResponseData] = useState("");
  const [spinning, setSpinning] = useState(false);

  const handleChange = (value) => {
    setInputType(value);
  };

  const onFinish = async (values) => {
    setSpinning(true);
    const formData = new FormData();
    console.log({ values });

    if (inputType === "text" && values["text-input"]) {
      formData.append("text", values["text-input"]);
    } else if (inputType === "file") {
      fileList.forEach((file) => {
        formData.append("file", file);
      });
    }

    try {
      const response = await fetch(
        "https://storemore.alifmaulidanar.com/store",
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();

      if (data.IpfsHash) {
        setResponseCID(data.IpfsHash);
        message.success(
          `${
            inputType === "text" ? "Text" : "File"
          } saved successfully to IPFS.`
        );
      } else {
        message.error(data.error || "Failed to save to IPFS.");
      }
    } catch (error) {
      message.error("Failed to communicate with the server.");
      console.error(error);
    }
    setSpinning(false);
  };

  const getExtensionFromContentType = (contentType) => {
    const parts = contentType.split("/");
    const extension = parts[parts.length - 1];
    return extension.replace(/[^a-zA-Z0-9]/g, ".");
  };

  const onFinishRetrieve = async (values) => {
    setSpinning(true);
    const cid = values["cid-input"];
    try {
      const url = `https://pink-ruling-damselfly-201.mypinata.cloud/ipfs/${cid}`;
      // const url = `https://ipfs.io/ipfs/${cid}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error("Network response was not ok.");

      const contentType = response.headers.get("Content-Type");
      const extension = getExtensionFromContentType(contentType);
      const fileName = `${cid}.${extension}`;

      if (
        contentType.startsWith("text") ||
        contentType === "application/json"
      ) {
        // Untuk teks dan JSON
        const textData = await response.text();
        setResponseData(<p>{textData}</p>);
      } else if (contentType.startsWith("image")) {
        // Untuk gambar
        const imageBlob = await response.blob();
        const imageUrl = URL.createObjectURL(imageBlob);
        setResponseData(
          <img
            src={imageUrl}
            alt="Content from IPFS"
            style={{ maxWidth: "100%" }}
          />
        );
      } else if (contentType.startsWith("video")) {
        // Untuk video
        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        setResponseData(
          <video src={videoUrl} controls style={{ maxWidth: "100%" }} />
        );
      } else if (contentType.startsWith("audio")) {
        // Untuk audio
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        setResponseData(<audio src={audioUrl} controls />);
      } else if (
        contentType.startsWith("application/pdf") ||
        contentType.startsWith("application/vnd.ms-") ||
        contentType.startsWith("application/vnd.openxmlformats-officedocument")
      ) {
        const viewerUrl = `https://docs.google.com/viewerng/viewer?url=${encodeURIComponent(
          url
        )}&embedded=true`;
        setResponseData(
          <iframe src={viewerUrl} width="100%" height="820px"></iframe>
        );
      } else {
        setResponseData(
          <div className="flex flex-col gap-y-4">
            <Alert
              message="This file type can not be previewed. Click the button below to
              download it."
              type="info"
              showIcon
            />
            <Alert
              message="Make sure you input the right CID before start the download."
              type="warning"
              showIcon
            />
            <Button
              type="primary"
              href={url}
              download={fileName}
              className="w-fit"
              icon={<DownloadOutlined />}
            >
              {" "}
              {`${fileName}`}
            </Button>
          </div>
        );
      }
    } catch (error) {
      message.error("Failed to retrieve data from IPFS.");
      console.error(error);
    }
    setSpinning(false);
  };

  const onFinishFailed = (errorInfo) => {
    console.log("Failed:", errorInfo);
  };

  const props = {
    onRemove: (file) => {
      setFileList(fileList.filter((f) => f.uid !== file.uid));
    },
    beforeUpload: (file) => {
      setFileList([...fileList, file]);
      return false;
    },
    fileList,
  };

  const items = [
    {
      key: "1",
      label: (
        <>
          <p className="text-lg">
            Store Data <SaveOutlined />
          </p>
        </>
      ),
      children: (
        <div className="grid w-full">
          <p className="w-full py-4">
            All you need to do is just type something in the input field below
            if you want to save raw text to IPFS or you can change the input to
            be a file uploader using the dropdown menu.
          </p>
          <div className="grid w-full">
            <Select
              className="ml-auto"
              defaultValue="text"
              onChange={handleChange}
              options={[
                { value: "text", label: "Text" },
                { value: "file", label: "File" },
              ]}
              style={{ width: 120 }}
            />

            {/* text-input */}
            {inputType === "text" && (
              <Form
                layout="vertical"
                name="basic"
                onFinish={onFinish}
                autoComplete="off"
              >
                <Form.Item
                  className="w-full"
                  label="Type something:"
                  name="text-input"
                >
                  <TextArea
                    rows={6}
                    placeholder="Don't choose a dictator and a nepobaby in this election..."
                    className={inputType === "text" ? "" : "hidden"}
                  />
                </Form.Item>

                <Form.Item className="w-full text-right">
                  <Button type="default" htmlType="submit">
                    Submit
                  </Button>
                </Form.Item>
              </Form>
            )}

            {/* file-input */}
            {inputType === "file" && (
              <Form
                layout="vertical"
                name="basic"
                onFinish={onFinish}
                autoComplete="off"
              >
                <Alert
                  className="my-2"
                  message="Please upload file one by one."
                  type="info"
                  showIcon
                />
                <Form.Item
                  className="w-full"
                  name="file-input"
                  label="Choose file in any format:"
                  style={{ display: inputType === "file" ? "block" : "none" }}
                >
                  <Dragger {...props}>
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                      Click or drag file to this area to upload
                    </p>
                    <p className="ant-upload-hint">
                      Do not upload sensitive and personal data because it will
                      remain in the IPFS and cannot be deleted.
                    </p>
                  </Dragger>
                </Form.Item>

                <Form.Item className="w-full text-right">
                  <Button type="default" htmlType="submit">
                    Submit
                  </Button>
                </Form.Item>
              </Form>
            )}

            <p className="w-full pb-4">Result:</p>
            <div className="grid gap-4">
              {responseCID && (
                <Alert
                  message="Be careful when retrieving data with CID. Copy the CID below to get your recently stored data."
                  type="warning"
                  showIcon
                />
              )}
              <Input
                disabled
                initialValue=""
                value={responseCID}
                className="w-full"
                suffix={
                  <Tooltip title="Copy CID">
                    <Button
                      type="default"
                      shape="default"
                      onClick={() => navigator.clipboard.writeText(responseCID)}
                      icon={<CopyOutlined />}
                    />
                  </Tooltip>
                }
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <>
          <p className="text-lg">
            Retrieve Data <DownloadOutlined />
          </p>
        </>
      ),
      children: (
        <div className="grid w-full">
          <p className="w-full py-4 text-justify">
            Now, to retrieve data from IPFS, you just need to type the CID in
            the input field. You can copy the CID from the result section in
            "Store Data" tab. Remember to not use unknown/suspicious CID because
            nobody knows what's inside.
          </p>
          <div className="w-full">
            <Form
              layout="vertical"
              name="basic"
              onFinish={onFinishRetrieve}
              onFinishFailed={onFinishFailed}
              autoComplete="off"
            >
              <Form.Item
                className="w-full"
                name="cid-input"
                label="Paste CID:"
                rules={[
                  {
                    required: true,
                    message: "Please input CID!",
                  },
                ]}
              >
                <Input placeholder="Qm..." />
              </Form.Item>

              <Form.Item className="w-full text-right">
                <Button type="default" htmlType="submit">
                  Submit
                </Button>
              </Form.Item>
            </Form>
          </div>
          <div>
            <p>Result:</p>
            <div className="w-full mt-4 mb-8 h-fit">{responseData}</div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="w-[650px] mx-auto h-fit">
        <h1 className="py-16 text-3xl text-center">StoreMore IPFS🚀</h1>
        <Tabs centered defaultActiveKey="1" items={items} tabBarGutter={100} />
      </div>
      <Spin spinning={spinning} fullscreen />
    </>
  );
}

export default App;
