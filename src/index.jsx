import React from 'react';
import { Col, Row, InputNumber, Input, Checkbox, Button } from 'antd';
import ReactDOM from 'react-dom';

const CheckboxGroup = Checkbox.Group;

const DING_WEBHOOK_PREFIX = 'https://oapi.dingtalk.com/robot/send?access_token=';


const DEFAULT_CONFIG = {
  subKeys: ['盖楼', '票', '转'],
  dingRobotWebHook: 'https://oapi.dingtalk.com/robot/send?access_token=d25126c6ed27c12c759b3e7619c13678a30f7968716b590edb02cfc7620c0c2b',
  forumIds: [20, 17],
  refreshInterval: 3000,
  isRunnig: false,
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
    };
    console.log(this.state);
  }

  // componentWillMount() {
  //   // const hasSession=this.xxxxxx();
  //   // this.setState({hasSession:hasSession});
  //   if (!localStorage[CONFIG_KEY]) {
  //     localStorage[CONFIG_KEY] = JSON.stringify(DEFAULT_CONFIG);
  //   }
  //   const configFromStorage = JSON.parse(localStorage[CONFIG_KEY]);
  //   this.configParams = configFromStorage;
  // }

  updateConfig() {
    console.log('update config', this.configParams);
    localStorage[CONFIG_KEY] = JSON.stringify(this.configParams);
  }

  refreshIntervalOnChange = (value) => {
    this.setState({ refreshInterval: value });
    this.configParams.refreshInterval = value;
    this.updateConfig();
  }

  dingRobotWebHookOnChange = (e) => {
    const value = e.target.value;
    this.setState({ dingRobotWebHook: DING_WEBHOOK_PREFIX + value });
    this.configParams.dingRobotWebHook = DING_WEBHOOK_PREFIX + value;
    this.updateConfig();
  }
  forumIdsOnChange = (value) => {
    this.setState({ forumIds: value });
    this.configParams.forumIds = value;
    this.updateConfig();
  }
  isRunnigOnChange = () => {
    const isRunnig = this.state.isRunnig;
    if (isRunnig) {
      // kill it
      console.log('send msg stop');
      chrome.runtime.sendMessage({ action: 'stop' });
    } else {
      // start it
      console.log('send msg start');
      chrome.runtime.sendMessage({ action: 'start' });
    }
    this.setState({ isRunnig: !isRunnig });
    this.configParams.isRunnig = !isRunnig;
    this.updateConfig();
  }


  resetStatus = () => {
    // todo:
    chrome.runtime.sendMessage({ action: 'stop' });
    localStorage[CONFIG_KEY] = JSON.stringify(DEFAULT_CONFIG);
    // this.setState({ ...DEFAULT_CONFIG });
    window.close();
  }

  render() {
    const forumOptions = [
      { label: '精彩活动', value: 20 },
      { label: '捣浆糊', value: 17 },
      { label: '互帮互助', value: 73 },
    ];
    return (
      <div>
        <Row>
          刷新间隔：
          <InputNumber
            min={1000}
            max={24000}
            defaultValue={this.state.refreshInterval}
            onChange={this.refreshIntervalOnChange}
          />
        </Row>
        <Row>
          钉钉webhook：
          <Input
            addonBefore={DING_WEBHOOK_PREFIX}
            onChange={this.dingRobotWebHookOnChange}
            defaultValue={this.state.dingRobotWebHook.substr(DING_WEBHOOK_PREFIX.length)}
          />
        </Row>
        <Row>
          订阅板块：
          <CheckboxGroup
            options={forumOptions}
            onChange={this.forumIdsOnChange}
            defaultValue={this.state.forumIds}
          />
        </Row>
        <Row>
          <Col span={8}>
            <Button type="primary" onClick={this.isRunnigOnChange}>
              {this.state.isRunnig ? '停止' : '开始'}
            </Button>
          </Col>
          <Col span={8}>
            <Button shape="circle" loading={this.state.isRunnig} disabled />
          </Col>
          <Col span={8}>
            <Button
              onClick={this.resetStatus}
            >
              clear
            </Button>
          </Col>
        </Row>

      </div >
    );
  }
}

ReactDOM.render(<AliwayMonitor />, document.getElementById('root'));
