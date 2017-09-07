// console.log(document.cookie)
let subKeys = ['盖楼', '票'];
let pushedTids = new Set();
let dingRobotWebHook = 'https://oapi.dingtalk.com/robot/send?access_token=e75912c04f10588ccc496d85766e4dbf22731b9e0ea6bf22d0e1851544282a43';
let topics = [20, 17];

function checkUpdate() {
    Promise.all(topics.map(fid => {
        return fetch(`/thread.php?fid=${fid}&orderway=postdate&asc=DESC&page=1`, {
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
                parser = new DOMParser();
                let dom = parser.parseFromString(data, "text/html");
                let subjects = dom.getElementsByClassName('subject');

                Array.prototype.forEach.call(subjects,
                    (item) => {
                        let postUrl = item.href;
                        let postTitle = item.innerText;
                        let tid = postUrl.match(/tid=[0-9]+/)[0].substr(4);
                        subKeys.forEach(key => {
                            if (postTitle.indexOf(key) != -1 && !pushedTids.has(tid)) {
                                datas.push({ postUrl: item.href, postTitle: item.innerText, fid: fid, key: key })
                            }
                        }
                        );
                    }
                );
                return datas;
            }
            );
    })).then(topicsRes => topicsRes.reduce((x, y) => x.concat(y)))
        .then(dataToPush => pushToDingRobot(dataToPush, dingRobotWebHook));
}

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

function pushToDingRobot(data, webHook) {
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
                "links": data.map(item => {
                    return { title: item.postTitle, messageURL: item.postUrl }
                })
            },
            "msgtype": "feedCard"
        })
    })
}
checkUpdate();
