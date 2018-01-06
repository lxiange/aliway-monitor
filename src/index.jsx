/*
 * Copyright xiangge.lx (119726)
 */
import React from 'react';
import { Col, Row, InputNumber, Input, Button, Tag, Tooltip, Switch, Spin } from 'antd';
import ReactDOM from 'react-dom';

const console = window.console;
const DING_WEBHOOK_PREFIX = 'https://oapi.dingtalk.com/robot/send?access_token=';


const DEFAULT_CONFIG = {
  subKeys: ['单身', '妹子', '征友'],
  dingRobotWebHook: 'https://oapi.dingtalk.com/robot/send?access_token=d25126c6ed27c12c759b3e7619c13678a30f7968716b590edb02cfc7620c0c2b',
  refreshInterval: 10,
  isRunning: false,
  enableDingRebot: false,
  isFloorMonitorRunning: false,
  floorMonitorTid: 0,
  floorMonitorSuffix: 8,
};

const CONFIG_KEY = 'aliway_monitor_params';

class AliwayMonitor extends React.Component {
  constructor(props) {
    super(props);
    if (!localStorage[CONFIG_KEY]) {
      localStorage[CONFIG_KEY] = JSON.stringify(DEFAULT_CONFIG);
    }
    const configFromStorage = JSON.parse(localStorage[CONFIG_KEY]);
    this.configParams = configFromStorage;

    this.state = {
      ...this.configParams,
      hasSession: false,
      inputVisible: false,
      inputValue: '',
    };
    console.log(this.state);
  }

  componentWillMount() {
    chrome.runtime.sendMessage({ action: 'sync' });
    fetch('https://www.aliway.com/', {
      method: 'get',
      credentials: 'include',
    }).then(resp => resp.arrayBuffer())
      .then((ab) => {
        const enc = new TextDecoder('gbk');
        return enc.decode(ab);
      })
      .then((data) => {
        if (data.indexOf('个人中心') !== -1) {
          this.setState({ hasSession: true });
        }
      })
      .catch((x) => { console.log(x); this.setState({ hasSession: false }); });
  }

  updateConfig() {
    console.log('update config:', this.configParams);
    localStorage[CONFIG_KEY] = JSON.stringify(this.configParams);
    chrome.runtime.sendMessage({ action: 'update' });
  }

  refreshIntervalOnChange = (value) => {
    this.setState({ refreshInterval: value });
    this.configParams.refreshInterval = value;
    this.updateConfig();
  }

  pushMethodSwitchOnChange = (value) => {
    this.setState({ enableDingRebot: value });
    this.configParams.enableDingRebot = value;
    this.updateConfig();
  }

  dingRobotWebHookOnChange = (e) => {
    const value = e.target.value;
    this.setState({ dingRobotWebHook: DING_WEBHOOK_PREFIX + value });
    this.configParams.dingRobotWebHook = DING_WEBHOOK_PREFIX + value;
    this.updateConfig();
  }

  isRunningOnChange = () => {
    const isRunning = this.state.isRunning;
    if (isRunning) {
      console.log('send msg stop');
      chrome.runtime.sendMessage({ action: 'stop' });
    } else {
      console.log('send msg start');
      chrome.runtime.sendMessage({ action: 'start' });
    }
    this.setState({ isRunning: !isRunning });
    this.configParams.isRunning = !isRunning;
    this.updateConfig();
  }

  isFloorMonitorRunningOnChange = () => {
    const isFloorMonitorRunning = this.state.isFloorMonitorRunning;
    if (isFloorMonitorRunning) {
      console.log('send msg stopMonitor');
      chrome.runtime.sendMessage({ action: 'stopMonitor' });
    } else {
      console.log('send msg startMonitor');
      chrome.runtime.sendMessage({
        action: 'startMonitor',
        tid: this.configParams.floorMonitorTid,
        floorSuffix: this.configParams.floorMonitorSuffix,
      });
    }
    this.setState({ isFloorMonitorRunning: !isFloorMonitorRunning });
    this.configParams.isFloorMonitorRunning = !isFloorMonitorRunning;
    this.updateConfig();
  }

  floorMonitorTidOnChange = (e) => {
    const value = e.target.value;
    this.setState({ floorMonitorTid: value });
    this.configParams.floorMonitorTid = value;
    this.updateConfig();
  }

  floorMonitorSuffixOnChange = (value) => {
    this.setState({ floorMonitorSuffix: value });
    this.configParams.floorMonitorSuffix = value;
    this.updateConfig();
  }


  resetStatus = () => {
    chrome.runtime.sendMessage({ action: 'reset' });
    localStorage[CONFIG_KEY] = JSON.stringify(DEFAULT_CONFIG);
    window.close();
  }

  showInput = () => {
    this.setState({ inputVisible: true }, () => this.input.focus());
  }

  handleInputChange = (e) => {
    this.setState({ inputValue: e.target.value });
  }

  handleInputConfirm = () => {
    const state = this.state;
    const inputValue = state.inputValue;
    let subKeys = state.subKeys;
    if (inputValue && subKeys.indexOf(inputValue) === -1) {
      subKeys = [...subKeys, inputValue];
    }
    console.log(subKeys);
    this.setState({
      subKeys,
      inputVisible: false,
      inputValue: '',
    });
    this.configParams.subKeys = subKeys;
    this.updateConfig();
  }

  handleClose = (removedTag) => {
    const subKeys = this.state.subKeys.filter(tag => tag !== removedTag);
    console.log(subKeys);
    this.setState({ subKeys });
    this.configParams.subKeys = subKeys;
    this.updateConfig();
  }

  saveInputRef = (input) => {
    this.input = input;
  };

  render() {
    if (this.state.hasSession) {
      return (
        <div>
          <Row style={{ paddingTop: 5, paddingLeft: 5 }}>
            <div>刷新间隔(秒)，建议60秒以上：</div>
            <InputNumber
              min={5}
              max={24000}
              defaultValue={this.state.refreshInterval}
              onChange={this.refreshIntervalOnChange}
            />
          </Row>

          <Row>
            <div>是否启用钉钉推送</div>
            <Switch
              defaultChecked={this.state.enableDingRebot}
              onChange={this.pushMethodSwitchOnChange}
            />
          </Row>
          {this.state.enableDingRebot && (<div>
            <Row style={{ paddingTop: 5, paddingLeft: 5 }}>
              钉钉webhook：
              </Row>
            <Row style={{ paddingTop: 5, paddingLeft: 5 }}>
              <Input
                addonBefore={DING_WEBHOOK_PREFIX}
                onChange={this.dingRobotWebHookOnChange}
                defaultValue={this.state.dingRobotWebHook.substr(DING_WEBHOOK_PREFIX.length)}
              />
            </Row>
          </div>)}

          <Row style={{ paddingTop: 5, paddingLeft: 5 }}>
            订阅关键词：
            {this.state.subKeys.map((tag) => {
              const isLongTag = tag.length > 20;
              const tagElem = (
                <Tag key={tag} closable afterClose={() => this.handleClose(tag)}>
                  {isLongTag ? `${tag.slice(0, 20)}...` : tag}
                </Tag>
              );
              return isLongTag ? <Tooltip title={tag}>{tagElem}</Tooltip> : tagElem;
            })}
            {this.state.inputVisible && (
              <Input
                ref={this.saveInputRef}
                type="text"
                size="small"
                style={{ width: 78 }}
                value={this.state.inputValue}
                onChange={this.handleInputChange}
                onBlur={this.handleInputConfirm}
                onPressEnter={this.handleInputConfirm}
              />
            )}
            {!this.state.inputVisible && <Button size="small" type="dashed" onClick={this.showInput}>+ New Tag</Button>}
          </Row>
          <Row>
            <Col span={7}>
              <div>是否抢楼</div>
              <Switch
                defaultChecked={this.state.isFloorMonitorRunning}
                onChange={this.isFloorMonitorRunningOnChange}
              />
            </Col>
            <Col span={2}>
              <div>抢楼tid:</div>
              <Input
                defaultValue={this.state.floorMonitorTid}
                onChange={this.floorMonitorTidOnChange}
              />
            </Col>
            <Col span={7} offset={5}>
              <div>抢楼尾数:</div>
              <InputNumber
                defaultValue={this.state.floorMonitorSuffix}
                onChange={this.floorMonitorSuffixOnChange}
              />
            </Col>
          </Row>

          <Row style={{ paddingTop: 5, paddingLeft: 5 }}>
            <Col span={7}>
              <Button type="primary" onClick={this.isRunningOnChange}>
                {this.state.isRunning ? '暂停' : '开始'}
              </Button>
            </Col>
            <Col span={7}>
              <div style={{ display: 'flex' }}>
                <div>运行状态：</div>
                {this.state.isRunning ? <Spin size="large" /> : null}
              </div>
            </Col>
            <Col span={7}>
              <Button
                onClick={this.resetStatus}
              >
                停止并恢复默认配置
            </Button>
            </Col>
            <Col span={3}>
              <a
                onClick={() => {
                  // chrome.tabs.create({ url: 'https://www.aliway.com/mode.php?m=o&q=browse&tab=t' });
                  chrome.runtime.sendMessage({ action: 'startMonitor', tid: 389388, floorSuffix: 4 });
                }}
              >
                查看最新帖子
              </a>
            </Col>
          </Row>
        </div >
      );
    } else {
      return (
        <div>
          Please check if you can visit aliway.com
        </div>
      );
    }
  }
}

ReactDOM.render(<AliwayMonitor />, document.getElementById('root'));
