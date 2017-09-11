
const pushedTids = new Set();

const CONFIG_KEY = 'aliway_monitor_params';

let intervalId = null;
const AliwayUtils = {
  checkUpdate: () => {
    Promise.all(AliwayUtils.configParams.forumIds.map((fid) => {
      return fetch(`https://www.aliway.com/thread.php?fid=${fid}&orderway=postdate&asc=DESC&page=1`, {
        method: 'get',
        credentials: 'include',
      }
      ).then(resp => resp.arrayBuffer())
        .then((ab) => {
          const enc = new TextDecoder('gbk');
          return enc.decode(ab);
        })
        .then((data) => {
          const datas = [];
          const parser = new DOMParser();
          const dom = parser.parseFromString(data, 'text/html');
          const subjects = dom.getElementsByClassName('subject');

          Array.prototype.forEach.call(subjects,
            (item) => {
              const postUrl = item.href;
              const postTitle = item.innerText;
              const tid = postUrl.match(/tid=[0-9]+/)[0].substr(4);
              AliwayUtils.configParams.subKeys.forEach((key) => {
                if (postTitle.indexOf(key) !== -1 && !pushedTids.has(tid)) {
                  datas.push({ postUrl: item.href, postTitle: item.innerText, fid, key });
                  pushedTids.add(tid);
                }
              }
              );
            }
          );
          return datas;
        }
        );
    })).then(item => item.reduce((x, y) => x.concat(y)))
      .then((dataToPush) => {
        if (dataToPush.length !== 0) {
          AliwayUtils.pushToDingRobot(dataToPush, AliwayUtils.configParams.dingRobotWebHook);
        }
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
  } else {
    console.error('unknown msg!');
  }
}

