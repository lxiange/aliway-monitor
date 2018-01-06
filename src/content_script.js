

const actualCode = `(${function () {
  console.log('in content_script');
  // setTimeout(function () {
  //   document.dispatchEvent(new CustomEvent('RW759_connectExtension', {
  //     detail: 'GLOBALS', // Some variable from Gmail.
  //   }));
  // }, 0);
  //   document.dispatchEvent(new CustomEvent('RW759_connectExtension', {
  //       detail: 'GLOBALS', // Some variable from Gmail.
  //     }));
}})();`;
const script = document.createElement('script');
script.textContent = actualCode;
(document.head || document.documentElement).appendChild(script);
script.remove();


console.log('out content_script');
chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    console.log(request, sender);
    if (request.action === 'post') {
      document.getElementsByName('Submit')[0].click();
      sendResponse('done!');
    }
  });
