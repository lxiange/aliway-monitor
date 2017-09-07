
let pushedTids = new Set();
import Store from './store.jsx';

let intervalId = null;
const AliwayUtils = {
    checkUpdate: () => {
        Promise.all(Store.forumIds.map(fid => {
            return fetch(`https://www.aliway.com/thread.php?fid=${fid}&orderway=postdate&asc=DESC&page=1`, {
                method: 'get',
                credentials: "include"
            }
            ).then(resp => resp.arrayBuffer())
                .then((ab) => {
                    let enc = new TextDecoder('gbk');
                    return enc.decode(ab);
                })
                .then(data => {
                    let datas = [];
                    let parser = new DOMParser();
                    let dom = parser.parseFromString(data, "text/html");
                    let subjects = dom.getElementsByClassName('subject');

                    Array.prototype.forEach.call(subjects,
                        (item) => {
                            let postUrl = item.href;
                            let postTitle = item.innerText;
                            let tid = postUrl.match(/tid=[0-9]+/)[0].substr(4);
                            Store.subKeys.forEach(key => {
                                if (postTitle.indexOf(key) != -1 && !pushedTids.has(tid)) {
                                    datas.push({ postUrl: item.href, postTitle: item.innerText, fid: fid, key: key })
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
            .then(dataToPush => {
                if (dataToPush.length != 0) {
                    AliwayUtils.pushToDingRobot(dataToPush, Store.dingRobotWebHook);
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
        if (data.length == 0) {
            return;
        }
        console.log(data);

        fetch(webHook, {
            method: 'post',
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify({
                "feedCard": {
                    "links": //todo: add pic
                    [{ title: '您有新的订阅消息啦~' }].concat(data.map(item => {
                        return { title: item.postTitle, messageURL: item.postUrl }
                    }))
                },
                "msgtype": "feedCard"
            })
        })
    },

    start: () => {
        if (intervalId) {
            console.error('job is running!');
        } else {
            intervalId = setInterval(AliwayUtils.checkUpdate, Store.refreshInterval);
        }
    },
    stop: () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        } else {
            console.error('no job is running!');
        }
    }
};
// checkUpdate();
export default AliwayUtils
