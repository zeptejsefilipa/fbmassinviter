let totalInviteCount = 0; // Celkový počet pozvánek, který se nebude resetovat
let inviteCount = 0;
let blinkInterval = null;

// Funkce pro odeslání dat na server
function sendDataToServer(inviteCount) {
  fetch('https://fbmassinviter.zsf.cz/update_invite_count.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'count=' + inviteCount
  })
  .then(response => response.json())
  .then(data => {
    console.log('Success:', data);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.increment) {
      inviteCount += request.increment;
      totalInviteCount += request.increment; // Přidání do celkového počtu pozvánek
      chrome.storage.local.set({inviteCount: inviteCount});
      sendDataToServer(request.increment); // Odeslání incrementu na server
    } else if (request.updateIcon) {
      updateIcon();
    } else if (request.resetCount) {
      inviteCount = 0; // Reset lokálního počítadla
      chrome.storage.local.set({inviteCount: inviteCount});
    }
  }
);

// Aktualizace ikony
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
  }, 500);
}

function stopBlinkingIcon() {
  if (blinkInterval) {
    clearInterval(blinkInterval);
    blinkInterval = null;
  }
}

chrome.storage.local.get('inviting', (result) => {
  updateIcon(result.inviting);
});
