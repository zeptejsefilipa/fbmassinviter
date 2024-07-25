let inviteCount = 0;
let blinkInterval = null;

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.increment) {
      inviteCount += request.increment;
      chrome.storage.local.set({inviteCount: inviteCount});
    } else if (request.updateIcon) {
      updateIcon();
    }
  }
);

// Updates the browser action icon based on the current inviting status
function updateIcon() {
  chrome.storage.local.get(['inviting'], function(result) {
    const isInviting = result.inviting;
    if (isInviting) {
      if (!blinkInterval) {
        startBlinkingIcon();
      }
    } else {
      stopBlinkingIcon();
      chrome.action.setIcon({ path: 'icons/icon-inactive.png' });
    }
  });
}

function startBlinkingIcon() {
  const icons = ['icons/icon-active1.png', 'icons/icon-active2.png'];
  let currentIcon = 0;

  blinkInterval = setInterval(() => {
    currentIcon = (currentIcon + 1) % icons.length;
    chrome.action.setIcon({ path: icons[currentIcon] });
  }, 500); // Change icon every 500 ms
}

function stopBlinkingIcon() {
  if (blinkInterval) {
    clearInterval(blinkInterval);
    blinkInterval = null;
  }
}

// Initialize the icon on startup
chrome.storage.local.get('inviting', (result) => {
  updateIcon(result.inviting);
});
