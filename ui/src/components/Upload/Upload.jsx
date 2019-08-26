import React, { Component } from "react";
import "./Upload.scss";
import Progress from "../Progress";
import PubSub from 'pubsub-js';
import { sendMsg } from "../../api";
// import { ENETDOWN } from "constants";

class Upload extends Component {
  constructor(props) {
    super(props);
    this.state = {
      files: [],
      uploading: false,
      uploadProgress: {},
      successfulUpload: false
    };

    this.onFilesAdded = this.onFilesAdded.bind(this);
    this.uploadFiles = this.uploadFiles.bind(this);
    this.sendRequest = this.sendRequest.bind(this);
    this.renderActions = this.renderActions.bind(this);
  }

  onFilesAdded(files) {
    console.log("got files:", files);
    this.setState(prevState => ({
      files: files
    }));
  }

  async uploadFiles() {
    console.log("uploading files...", this.state.files);

    this.setState({ uploadProgress: {}, uploading: true });
    const promises = [];
    this.state.files.forEach(file => {
      console.log("uploading file:", file);
      promises.push(this.sendRequest(file));
    });
    try {
      await Promise.all(promises);

      this.setState({ successfulUpload: true, uploading: false });
    } catch (e) {
      // Not Production ready! Do some error handling here instead...
      this.setState({ successfulUpload: true, uploading: false });
    }
  }

  sendRequest(file) {
    return new Promise((resolve, reject) => {
      var tid = "progress." + file.root + "." + file.name
      console.log("send request: topic id: ", tid)

      var token = PubSub.subscribe(tid, (thread, event) => {
          console.log("send request thread: ", thread, " data: ", event)

          const copy = { ...this.state.uploadProgress };
          if (event.error) {
            copy[file.name] = { state: "error", percentage: 0 };
            PubSub.unsubscribe(token);
            reject(event);
          } else if (event.loaded === event.total) {
            copy[file.name] = { state: "done", percentage: 100 };
            PubSub.unsubscribe(token);
            resolve(event);
          } else {
            copy[file.name] = {
              state: "pending",
              percentage: (event.loaded / event.total) * 100
            };
          }

          this.setState({ uploadProgress: copy });
      });

      sendMsg("/upload " + file.root + " " + file.name + " " + tid)

      // const req = new XMLHttpRequest();

      // req.upload.addEventListener("progress", event => {
      //   if (event.lengthComputable) {
      //     const copy = { ...this.state.uploadProgress };
      //     copy[file.name] = {
      //       state: "pending",
      //       percentage: (event.loaded / event.total) * 100
      //     };
      //     this.setState({ uploadProgress: copy });
      //   }
      // });

      // req.upload.addEventListener("load", event => {
      //   const copy = { ...this.state.uploadProgress };
      //   copy[file.name] = { state: "done", percentage: 100 };
      //   this.setState({ uploadProgress: copy });
      //   resolve(req.response);
      // });

      // req.upload.addEventListener("error", event => {
      //   const copy = { ...this.state.uploadProgress };
      //   copy[file.name] = { state: "error", percentage: 0 };
      //   this.setState({ uploadProgress: copy });
      //   reject(req.response);
      // });

      // const formData = new FormData();
      // formData.append("file", file, file.name);

      // req.open("POST", "http://localhost:8000/upload");
      // req.send(formData);
    });
  }

  renderProgress(file) {
    const uploadProgress = this.state.uploadProgress[file.name];
    if (this.state.uploading || this.state.successfulUpload) {
      return (
        <div className="ProgressWrapper">
          <Progress progress={uploadProgress ? uploadProgress.percentage : 0} />
          <img
            className="CheckIcon"
            alt="done"
            src="baseline-check_circle_outline-24px.svg"
            style={{
              opacity:
                uploadProgress && uploadProgress.state === "done" ? 0.5 : 0
            }}
          />
        </div>
      );
    }
  }

  renderActions() {
    if (this.state.uploading) {
      return (
        <button
          onClick={() =>
            // this.setState({ files: [], successfulUpload: false })
            this.setState({ successfulUpload: false })
          }
        >
          Cancel
        </button>
      );
    } else {
      return (
        <button
          disabled={this.state.files.length <= 0}
          onClick={this.uploadFiles}
        >
          Upload
        </button>
      );
    }
  }

  render() {
    return (
      <div className="Upload">
        {/* <span className="Title">Upload files</span> */}
        <div className="Content">
          {/* <div>
            <Dropzone
              onFilesAdded={this.onFilesAdded}
              disabled={this.state.uploading || this.state.successfulUpload}
            />
          </div> */}
          <div className="Files">
            {this.state.files.map(file => {
              return (
                <div key={file.name} className="Row">
                  <span className="Filename">{file.name}</span>
                  {this.renderProgress(file)}
                </div>
              );
            })}
          </div>
        </div>
        <div className="Actions">{this.renderActions()}</div>
      </div>
    );
  }
}

export default Upload;
