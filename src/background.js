/*
 * Copyright xiangge.lx (119726)
 */

const pushedTids = new Set();
const CONFIG_KEY = 'aliway_monitor_params';
const ALIWAY_LATEST_POST_URL = 'https://www.aliway.com/mode.php?m=o&q=browse&tab=t';
const ALIWAY_ICON_URL = 'https://www.aliway.com/images/aliway/index/120201/index_logo.png';
const EXTENSION_ICON = 'aliway.png';
const NOTIFICATION_SOUND = '3.mp3';
const console = window.console;
const NOTIFICATION_ID_SUFFIX_LEN = 5;

let intervalId = null;
let monitorIntervalId = null;
const AliwayUtils = {
  refreshToSetCookie: () => {
    window.document.getElementById('iframe1').src = ALIWAY_LATEST_POST_URL;
  },

  checkUpdate: () => {
    // fetch(ALIWAY_LATEST_POST_URL, {
    //   method: 'get',
    //   credentials: 'include',
    // }
    // ).then((resp) => {
    //   if (resp.status === 200) {
    //     return resp.arrayBuffer();
    //   } else {
    //     AliwayUtils.refreshToSetCookie();
    //     console.error(resp.status);
    //     return;
    //   }
    // }).then((ab) => {
    //   const enc = new TextDecoder('gbk');
    //   return enc.decode(ab);
    // })

    AliwayUtils.fetchAndParseDom(ALIWAY_LATEST_POST_URL)
      .then((dom) => {
        // const parser = new DOMParser();
        // const dom = parser.parseFromString(data, 'text/html');
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
        return dataToPush;
      })
      .then((dataToPush) => {
        if (dataToPush.length !== 0) {
          console.log(dataToPush);
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
  randomString: (len) => {
    const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    for (let i = 0; i < len; i += 1) {
      const randomPoz = Math.floor(Math.random() * charSet.length);
      randomString += charSet.substring(randomPoz, randomPoz + 1);
    }
    return randomString;
  },

  pushToChromeNotifications: (data) => {
    if (data.length === 0) {
      return;
    }
    data.forEach((item) => {
      const opt = {
        type: 'basic',
        iconUrl: EXTENSION_ICON,
        title: item.postTitle,
        message: item.postUrl,
      };
      chrome.notifications.create(
        item.postUrl + AliwayUtils.randomString(NOTIFICATION_ID_SUFFIX_LEN),
        opt, () => {
          const myAudio = new window.Audio();
          myAudio.src = NOTIFICATION_SOUND;
          myAudio.play();
        });
    });
  },

  fetchAndParseDom: (url) => {
    return fetch(url, {
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
      return parser.parseFromString(data, 'text/html');
    });
  },

  getFloorNum: (tid) => {
    const queryUrl = `https://www.aliway.com/read.php?tid=${tid}&page=e`;
    return AliwayUtils.fetchAndParseDom(queryUrl).then(dom => window.parseInt(dom.getElementsByTagName('em')[1].innerText));
  },

  start: () => {
    if (intervalId) {
      console.error('job is running!');
    } else {
      AliwayUtils.checkUpdate();
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
    if (monitorIntervalId) {
      AliwayUtils.stopMonitor();
      AliwayUtils.startMonitor(AliwayUtils.configParams.floorMonitorTid,
        AliwayUtils.configParams.floorMonitorSuffix);
    }
  },
  reset: () => {
    AliwayUtils.stop();
    pushedTids.clear();
  },
  sync: () => {
    AliwayUtils.refreshToSetCookie();
    if (AliwayUtils.configParams.isRunning) {
      if (!intervalId) {
        AliwayUtils.start();
      }
    } else if (intervalId) {
      AliwayUtils.stop();
    }

    if (AliwayUtils.configParams.isFloorMonitorRunning) {
      if (!monitorIntervalId) {
        AliwayUtils.startMonitor(AliwayUtils.configParams.floorMonitorTid,
          AliwayUtils.configParams.floorMonitorSuffix);
      }
    } else if (monitorIntervalId) {
      AliwayUtils.stopMonitor();
    }
  },

  checkMonitorOnce: (tid, floorSuffix) => {
    AliwayUtils.getFloorNum(tid).then((floors) => {
      const queryUrl = `*://*.aliway.com/*tid=${tid}*`;
      console.log(floors);
      if (String(floors + 1).endsWith(floorSuffix)) {
        const dataToPush = [
          {
            postTitle: '抢楼成功！',
            postUrl: `https://www.aliway.com/read.php?tid=${tid}&page=e`,
          },
        ];
        if (AliwayUtils.configParams.enableDingRebot) {
          AliwayUtils.pushToDingRobot(dataToPush);
        }
        AliwayUtils.pushToChromeNotifications(dataToPush);

        chrome.runtime.sendMessage({ action: 'check' });
        chrome.tabs.query({ url: queryUrl }, (tabs) => {
          console.log(tabs);
          tabs.forEach(tab => chrome.tabs.sendMessage(
            tab.id,
            { action: 'post' },
            response => console.log(response)));
        });
      }
    });
  },
  startMonitor: (tid, floorSuffix) => {
    console.log('start monitor');
    if (!monitorIntervalId) {
      monitorIntervalId = setInterval(() => AliwayUtils.checkMonitorOnce(tid, floorSuffix), 1000);
    }
  },
  stopMonitor: () => {
    console.log('stop monitor');
    if (monitorIntervalId) {
      clearInterval(monitorIntervalId);
      monitorIntervalId = null;
    }
  },
};


chrome.runtime.onMessage.addListener(messageReceived);
chrome.notifications.onClicked.addListener(
  id => chrome.tabs.create({
    url: id.substr(0, id.length - NOTIFICATION_ID_SUFFIX_LEN),
  }));
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
  } else if (msg.action === 'sync') {
    AliwayUtils.sync();
  } else if (msg.action === 'startMonitor') {
    AliwayUtils.startMonitor(msg.tid, msg.floorSuffix);
  } else if (msg.action === 'stopMonitor') {
    AliwayUtils.stopMonitor();
  } else {
    console.error('unknown msg!');
  }
}
