import Checkbox from '@trendmicro/react-checkbox';
import Dropdown, { MenuItem } from '@trendmicro/react-dropdown';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import InfiniteTree from 'react-infinite-tree';
import TreeNode from './components/TreeNode';
import Toggler from './components/Toggler';
import Icon from './components/Icon';
import Clickable from './components/Clickable';
import Text from './components/Text';
import Label from './components/Label';
import Loading from './components/Loading';
import PubSub from 'pubsub-js'
import { sendMsg } from "./api";

const renderTreeNode = ({ node, tree, toggleState, onUpdate }) => (
    <TreeNode
        selected={node.state.selected}
        depth={node.state.depth}
        onClick={(event) => {
            tree.selectNode(node);
        }}
    >
        <Toggler
            state={toggleState}
            onClick={(event) => {
                event.stopPropagation();

                if (toggleState === 'closed') {
                    tree.openNode(node);
                } else if (toggleState === 'opened') {
                    tree.closeNode(node);
                }
            }}
        />
        <Checkbox
            checked={node.state.checked}
            indeterminate={node.state.indeterminate}
            onClick={(event) => {
                event.stopPropagation();
            }}
            onChange={(event) => {
                tree.checkNode(node);
                onUpdate(node);
            }}
        />
        <Clickable>
            <Icon state={toggleState} />
            <Text>{node.name}</Text>
        </Clickable>
        {(node.loadOnDemand && node.children.length === 0 && !node.state.loading) &&
            <i className="fa fa-fw fa-ellipsis-v" />
        }
        {node.state.loading && <Loading />}
        <Label style={{ position: 'absolute', right: 5, top: 6 }}>
            {node.children.length}
        </Label>
        <Dropdown
            style={{ position: 'absolute', right: 20, top: 4 }}
            pullRight
        >
            <Dropdown.Toggle
                noCaret
                btnSize="xs"
                btnStyle="link"
                style={{ padding: 0 }}
            >
                <i className="dropdown fa fa-fw fa-cog" />
            </Dropdown.Toggle>
            <Dropdown.Menu>
                <MenuItem>{node.name}</MenuItem>
            </Dropdown.Menu>
        </Dropdown>
    </TreeNode>
);

// https://github.com/cheton/infinite-tree
class Tree extends PureComponent {
    static propTypes = {
        onUpdate: PropTypes.func
    };

    tree = null;
    data = null

    componentDidMount() {
        // Select the first node
        this.tree.selectNode(this.tree.getChildNodes()[0]);

        this.token = PubSub.subscribe('ALL', this.dispatcher.bind(this));
    }

    componentWillUnmount(){
        PubSub.unsubscribe(this.token);
    }

    // https://github.com/mroderick/PubSubJS
    dispatcher(topic, msg){
        console.log("dispatcher: ", topic, msg);
        try {
            var d = JSON.parse(msg.data)
            if (d.body.startsWith("/")) {
                return
            }
            var m = JSON.parse(d.body)

            if (m.tid === "root") {
                var root = this.tree.getRootNode()
                var old = this.tree.getNodeById(m.data.id)
                if (old) {
                    //update name
                    old.name = m.data.name
                    return
                }
                this.tree.appendChildNode(m.data, root)
                return
            }
            PubSub.publish(m.tid, m.data);
        } catch (e) {
            console.log(e)
        }
    }
    
    render() {
        const { onUpdate } = this.props;

        return (
            <InfiniteTree
                ref={node => {
                    this.tree = node ? node.tree : null;
                }}
                style={{
                    border: '1px solid #ccc'
                }}
                autoOpen
                selectable
                tabIndex={0}
                data={this.data}
                width="100%"
                height={400}
                rowHeight={30}
                shouldLoadNodes={(node) => {
                    return !node.hasChildren() && node.loadOnDemand;
                }}
                loadNodes={(parentNode, done) => {
                    console.log("loadNodes: parentNode: ", parentNode)
                    var root = parentNode
                    while (root.parent && root.parent.id) {
                        root = root.parent
                    }

                    if ( root.id === "/") {
                        sendMsg("/who")
                        done(null, null);
                        return
                    }

                    var tid = root.id + "." + parentNode.id
                    console.log("loadNodes: topic id: ", tid)

                    var token = PubSub.subscribe(tid, function (thread, data) {
                        console.log("thread: ", thread, " data: ", data)
                        PubSub.unsubscribe(token);
                        done(null, data);
                    });

                    sendMsg("/list " + root.id + " " + parentNode.id + " " + tid)
                }}
                shouldSelectNode={(node) => { // Defaults to null
                    if (!node || (node === this.tree.getSelectedNode())) {
                        return false; // Prevent from deselecting the current node
                    }
                    return true;
                }}
                onKeyUp={(event) => {
                    console.log('onKeyUp', event.target);
                }}
                onKeyDown={(event) => {
                    console.log('onKeyDown', event.target);

                    event.preventDefault();

                    const node = this.tree.getSelectedNode();
                    const nodeIndex = this.tree.getSelectedIndex();

                    if (event.keyCode === 37) { // Left
                        this.tree.closeNode(node);
                    } else if (event.keyCode === 38) { // Up
                        const prevNode = this.tree.nodes[nodeIndex - 1] || node;
                        this.tree.selectNode(prevNode);
                    } else if (event.keyCode === 39) { // Right
                        this.tree.openNode(node);
                    } else if (event.keyCode === 40) { // Down
                        const nextNode = this.tree.nodes[nodeIndex + 1] || node;
                        this.tree.selectNode(nextNode);
                    }
                }}
                onScroll={(scrollOffset, event) => {
                    const child = event.target.firstChild;
                    const treeViewportHeight = 400;
                    console.log((scrollOffset / (child.scrollHeight - treeViewportHeight) * 100).toFixed(2));
                    console.log('onScroll', scrollOffset, event);
                }}
                onContentWillUpdate={() => {
                    console.log('onContentWillUpdate');
                }}
                onContentDidUpdate={() => {
                    console.log('onContentDidUpdate');
                    onUpdate(this.tree.getSelectedNode());
                }}
                onOpenNode={(node) => {
                    console.log('onOpenNode:', node);
                }}
                onCloseNode={(node) => {
                    console.log('onCloseNode:', node);
                }}
                onSelectNode={(node) => {
                    console.log('onSelectNode:', node);
                    onUpdate(node);
                }}
                onWillOpenNode={(node) => {
                    console.log('onWillOpenNode:', node);
                }}
                onWillCloseNode={(node) => {
                    console.log('onWillCloseNode:', node);
                }}
                onWillSelectNode={(node) => {
                    console.log('onWillSelectNode:', node);
                }}
            >
                {({ node, tree }) => {
                    const hasChildren = node.hasChildren();

                    let toggleState = '';
                    if ((!hasChildren && node.loadOnDemand) || (hasChildren && !node.state.open)) {
                        toggleState = 'closed';
                    }
                    if (hasChildren && node.state.open) {
                        toggleState = 'opened';
                    }

                    return renderTreeNode({ node, tree, toggleState, onUpdate });
                }}
            </InfiniteTree>
        );
    }
}

export default Tree;
