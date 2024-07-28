let inviteCount = 0;
let blinkInterval = null;

// Function to format a number with spaces for better readability
function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Listener for messages sent from other parts of the extension
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.increment) {
      // Increment the invite count
      inviteCount += request.increment;
      // Store the updated invite count in local storage
      chrome.storage.local.set({inviteCount: inviteCount}, function() {
        console.log('Updated invite count:', formatNumber(inviteCount));
      });
    } else if (request.updateIcon) {
      // Update the browser action icon based on the current inviting status
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

// Starts blinking the browser action icon
function startBlinkingIcon() {
  const icons = ['icons/icon-active1.png', 'icons/icon-active2.png'];
  let currentIcon = 0;

  blinkInterval = setInterval(() => {
    currentIcon = (currentIcon + 1) % icons.length;
    chrome.action.setIcon({ path: icons[currentIcon] });
  }, 500); // Change icon every 500 ms
}

// Stops blinking the browser action icon
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
