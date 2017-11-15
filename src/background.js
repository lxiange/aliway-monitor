/*
 * Copyright xiangge.lx (119726)
 */

const pushedTids = new Set();
const CONFIG_KEY = 'aliway_monitor_params';
const ALIWAY_LATEST_POST_URL = 'https://www.aliway.com/mode.php?m=o&q=browse&tab=t';
const ALIWAY_ICON_URL = 'https://www.aliway.com/images/aliway/index/120201/index_logo.png';
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
      if (resp.status === 200) {
        return resp.arrayBuffer();
      } else {
        AliwayUtils.refreshToSetCookie();
        console.error(resp.status);
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
          if (AliwayUtils.configParams.enableDingRebot) {
            AliwayUtils.pushToDingRobot(dataToPush);
          }
          AliwayUtils.pushToChromeNotifications(dataToPush);
        }
      })
      .catch((err) => {
        console.error(err);
        AliwayUtils.refreshToSetCookie();
      });
  },

  /*
  data = [
          {
              postTitle:'hahachishi',
              postUrl:'https://www.aliway.com/read.php?fid=122&tid=384496',
              ...
          },
          {
              ...
          }
      ]
  */

  pushToDingRobot: (data) => {
    const webHookUrl = AliwayUtils.configParams.dingRobotWebHook;
    if (data.length === 0) {
      return;
    }
    console.log(data);

    fetch(webHookUrl, {
      method: 'post',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        feedCard: {
          links:
            [{ title: '您有新的订阅消息啦~', picURL: ALIWAY_ICON_URL }].concat(data.map((item) => {
              return { title: item.postTitle, messageURL: item.postUrl };
            })),
        },
        msgtype: 'feedCard',
      }),
    });
  },

  pushToChromeNotifications: (data) => {
    data.forEach((item) => {
      const opt = {
        type: 'basic',
        iconUrl: 'aliway.png',
        title: item.postTitle,
        message: item.postUrl,
      };
      chrome.notifications.create(item.postUrl, opt, () => {
        const myAudio = new window.Audio();
        myAudio.src = '3.mp3';
        myAudio.play();
      });
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
  reset: () => {
    AliwayUtils.stop();
    pushedTids.clear();
  },
};


chrome.runtime.onMessage.addListener(messageReceived);
chrome.notifications.onClicked.addListener(id => chrome.tabs.create({ url: id }));
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
  } else if (msg.action === 'reset') {
    AliwayUtils.reset();
  } else {
    console.error('unknown msg!');
  }
}
