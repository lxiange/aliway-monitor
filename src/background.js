/*
 * Copyright xiangge.lx (119726)
 */

const pushedTids = new Set();
const CONFIG_KEY = 'aliway_monitor_params';
const ALIWAY_LATEST_POST_URL = 'https://www.aliway.com/mode.php?m=o&q=browse&tab=t';
const console = window.console;

let intervalId = null;
const AliwayUtils = {
  refreshToSetCookie: () => {
    window.document.getElementById('iframe1').src = ALIWAY_LATEST_POST_URL;
  },

  checkUpdate: () => {
    fetch(ALIWAY_LATEST_POST_URL, {
      method: 'get',
      credentials: 'include',
    }
    ).then((resp) => {
      console.log(resp.status);
      if (resp.status === 200) {
        return resp.arrayBuffer();
      } else {
        AliwayUtils.refreshToSetCookie();
        return;
      }
    }).then((ab) => {
      const enc = new TextDecoder('gbk');
      return enc.decode(ab);
    }).then((data) => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(data, 'text/html');
      const trs = dom.getElementsByClassName('tr3');
      const dataToPush = [];
      Array.prototype.forEach.call(trs, (row) => {
        const postUrl = row.children[0].children[0].href;
        const postTitle = row.children[0].children[0].innerText;
        const tid = postUrl.match(/tid=[0-9]+/)[0].substr(4);

        AliwayUtils.configParams.subKeys.forEach((key) => {
          if (postTitle.indexOf(key) !== -1 && !pushedTids.has(tid)) {
            dataToPush.push({ postUrl, postTitle });
            pushedTids.add(tid);
          }
        });
      });
      console.log(dataToPush);
      return dataToPush;
    })
      .then((dataToPush) => {
        if (dataToPush.length !== 0) {
          AliwayUtils.pushToDingRobot(dataToPush, AliwayUtils.configParams.dingRobotWebHook);
        }
      })
      .catch((err) => {
        AliwayUtils.refreshToSetCookie();
        console.error(err);
      });
  },

  /*
  data = [
          {
              postTitle:'hahachishi',
              postUrl:'http://www.aliway.com/dsfaffd....',
              ...
          },
          {
              ...
          }
      ]
  */

  pushToDingRobot: (data, webHook) => {
    if (data.length === 0) {
      return;
    }
    console.log(data);

    fetch(webHook, {
      method: 'post',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        feedCard: {
          links: // todo: add pic
            [{ title: '您有新的订阅消息啦~', picURL: 'https://www.aliway.com/images/aliway/index/120201/index_logo.png' }].concat(data.map((item) => {
              return { title: item.postTitle, messageURL: item.postUrl };
            })),
        },
        msgtype: 'feedCard',
      }),
    });
  },

  start: () => {
    if (intervalId) {
      console.error('job is running!');
    } else {
      intervalId = setInterval(AliwayUtils.checkUpdate,
        AliwayUtils.configParams.refreshInterval * 1000);
    }
  },
  stop: () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    } else {
      console.error('no job is running!');
    }
  },
  update: () => {
    if (intervalId) {
      AliwayUtils.stop();
      AliwayUtils.start();
    }
  },
};


chrome.runtime.onMessage.addListener(messageReceived);
AliwayUtils.configParams = JSON.parse(localStorage[CONFIG_KEY]);

function messageReceived(msg) {
  AliwayUtils.configParams = JSON.parse(localStorage[CONFIG_KEY]);
  console.log('get msg', msg);
  if (msg.action === 'start') {
    AliwayUtils.start();
  } else if (msg.action === 'stop') {
    AliwayUtils.stop();
  } else if (msg.action === 'update') {
    AliwayUtils.update();
  } else {
    console.error('unknown msg!');
  }
}