function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  return copied ? Promise.resolve() : Promise.reject(new Error('copy failed'));
}

function showFeedback(message) {
  const feedback = document.querySelector('#social-feedback');
  if (!feedback) return;
  feedback.textContent = message;
  feedback.hidden = false;
  clearTimeout(showFeedback.timeout);
  showFeedback.timeout = setTimeout(() => { feedback.hidden = true; }, 3200);
}

function initVideoChannelLinks(root = document) {
  root.querySelectorAll('[data-video-channel-account]').forEach((link) => {
    link.addEventListener('click', async (event) => {
      event.preventDefault();
      const account = link.dataset.videoChannelAccount;
      try {
        await copyText(account);
        showFeedback(`已复制视频号名称“${account}”，正在打开微信`);
      } catch {
        showFeedback(`请在微信视频号中搜索“${account}”`);
      }

      if (!/MicroMessenger/iu.test(navigator.userAgent)) {
        setTimeout(() => { window.location.href = link.href; }, 260);
      }
    });
  });
}

if (typeof document !== 'undefined') initVideoChannelLinks();

export { copyText, initVideoChannelLinks };
