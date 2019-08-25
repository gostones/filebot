import React, { Component } from "react";
// import "./App.css";
import { connect, sendMsg } from "./api";
import Header from './components/Header';
import ChatHistory from './components/ChatHistory';
import ChatInput from './components/ChatInput';
import Upload from './components/Upload';
import Tree from './components/Tree';
import Preview from './components/Preview';
// import debounce from 'lodash.debounce';
import PubSub from 'pubsub-js'

class App extends Component {
  state = {
    chatHistory: [],
    selected: new Set(),

    node: null,
    filterText: '',
    caseSensitive: false,
    exactMatch: false,
    includeAncestors: true,
    includeDescendants: true
  };

  textFilter = null;
  tree = null;

  changeCheckedState = (key) => (event) => {
      const checked = event.target.checked;

      this.setState({
          [key]: checked
      }, () => {
          this.filter();
      });
  };
  
  onUpdate = (node) => {
      let sel = this.state.selected
      console.log("node: ", node, " sel: ", sel);
      if ( node ) {
        if ( node.state && node.state.checked ) {
            sel.add(node.id);
        } else {
            sel.delete(node.id);
        }
      }
      this.setState({
          node: node,
          selected: sel
      });
  };

  filter = (keyword) => {
      if (!this.tree) {
          return;
      }

      keyword = keyword || this.textFilter.value || '';

      if (!keyword) {
          this.tree.unfilter();
          return;
      }

      const {
          caseSensitive,
          exactMatch,
          includeAncestors,
          includeDescendants
      } = this.state;

      this.tree.filter(keyword, {
          filterPath: 'name',
          caseSensitive: caseSensitive,
          exactMatch: exactMatch,
          includeAncestors: includeAncestors,
          includeDescendants: includeDescendants
      });
  };
  
  // constructor(props) {
  //   super(props);
  //   //connect();
  //   // this.state = {
  //   //   chatHistory: []
      
  //   // }      
  // }

  componentDidMount() {
    // var mySubscriber = function (msg, data) {
    //     console.log( msg, data );
    // };

    connect((msg) => {
      console.log("New Message")
      this.setState(prevState => ({
        chatHistory: [...this.state.chatHistory, msg]
      }))

      PubSub.publish('ALL', msg);

      console.log(this.state);
    });
  }

  send(event) {
    if(event.keyCode === 13) {
      sendMsg(event.target.value);
      event.target.value = "";
    }
  }
  
  render() {
    return (
      <div className="App">
      <Header />
      <div className="container-fluid">
           <div className="row">
              <div className="col-xs-6">
                  {/* <h4>Filter</h4> */}
                  {/* <input
                      ref={node => {
                          this.textFilter = node;
                      }}
                      type="text"
                      className="form-control"
                      name="text-filter"
                      placeholder="Type to filter by text"
                      onKeyUp={(event) => {
                          event.persist();

                          const { keyCode } = event;
                          const BACKSPACE = 8;
                          const DELETE = 46;
                          const ENTER = 13;

                          if ([BACKSPACE, DELETE, ENTER].includes(keyCode)) {
                              this.filter();
                          }
                      }}
                      onKeyPress={debounce((event) => {
                          this.filter();
                      }, 250)}
                  /> */}
                  
              </div>
          </div>
          <div className="row">
              <div className="col-xs-6">
                  <Tree
                      ref={c => {
                          this.tree = c ? c.tree : null;
                      }}
                      onUpdate={this.onUpdate}
                  />
              </div>
              <div className="col-xs-6">
                  <Preview node={this.state.node} />
              </div>
          </div>
          <div className="row">
            <div className="col-xs-6">
            <Upload />
            </div>
          </div>
      </div>
      <ChatInput send={this.send} />

      <ChatHistory chatHistory={this.state.chatHistory} />
    </div>
    );
  }
}

export default App;