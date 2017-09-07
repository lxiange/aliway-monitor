import React from 'react'
import { Col, Row, InputNumber, Input, Checkbox, Button } from 'antd'
import ReactDOM from 'react-dom'
import Store from './store.jsx'
import Utils from './aliway.js'

const CheckboxGroup = Checkbox.Group;

const DING_WEBHOOK_PREFIX = 'https://oapi.dingtalk.com/robot/send?access_token=';

class AliwayMonitor extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      subKeys: Store.subKeys,
      dingRobotWebHook: Store.dingRobotWebHook,
      forumIds: Store.forumIds,
      refreshInterval: Store.refreshInterval,
      isRunnig: false,
    };
  }

  componentDidMount() {
  }

  refreshIntervalOnChange = (value) => {
    console.log('refreshInterval', value);
    this.setState({ refreshInterval: value });
    Store.refreshInterval = value;
  }

  dingRobotWebHookOnChange = (e) => {
    let value = e.target.value;
    console.log('dingRobotWebHook', DING_WEBHOOK_PREFIX + value);
    this.setState({ dingRobotWebHook: DING_WEBHOOK_PREFIX + value });
    Store.dingRobotWebHook = DING_WEBHOOK_PREFIX + value;
  }
  forumIdsOnChange = (value) => {
    console.log(value);
    this.setState({ subKeys: value });
    Store.subKeys = value;
  }
  isRunnigOnChange = () => {
    const isRunnig = this.state.isRunnig;
    if (isRunnig) {
      // kill it
      Utils.stop();
    } else {
      // start it
      Utils.start();
    }
    this.setState({ isRunnig: !isRunnig });

  }

  render() {
    const forumOptions = [
      { label: 'Apple', value: 20 },
      { label: 'Pear', value: 17 },
      { label: 'Orange', value: 33 },
    ];
    return (
      <div>
        <Row>
          刷新间隔：
          <InputNumber min={1000} max={24000} defaultValue={this.state.refreshInterval} onChange={this.refreshIntervalOnChange} />
        </Row>
        <Row>
          钉钉webhook：
          <Input addonBefore={DING_WEBHOOK_PREFIX} onChange={this.dingRobotWebHookOnChange} defaultValue={"e75912c04f10588ccc496d85766e4dbf22731b9e0ea6bf22d0e1851544282a43"} />
        </Row>
        <Row>
          订阅板块：
          <CheckboxGroup options={forumOptions} onChange={this.forumIdsOnChange} defaultValue={[20]} />
        </Row>
        <Row>
          <Col>
            <Button type="primary" onClick={this.isRunnigOnChange}>
              {this.state.isRunnig ? '停止' : '开始'}
            </Button>
          </Col>
          <Col>
            <Button shape="circle" loading={this.state.isRunnig} disabled />
          </Col>
        </Row>

      </div>
    );
  }
}

ReactDOM.render(<AliwayMonitor />, document.getElementById('root'));
// export default AliwayMonitor;