function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function injectCSS() {
  const css = `
    .x1tbbn4q .xe8uvvx { font-size: 14px; }
    .x1tbbn4q .xz9dl7a { padding-top: 2px; }
    .x1tbbn4q .xsag5q8 { padding-bottom: 2px; }
    .x1tbbn4q .x1xmf6yo { margin-top: 0px; }
    .x1tbbn4q .x1e56ztr { margin-bottom: 0px; }
    .x1tbbn4q .xq8finb { margin-right: 4px; }
    .x1tbbn4q .x1r1pt67 { height: 24px; }
    .x1tbbn4q .xwcfey6 { background-color: #ffffff; }
    .x1tbbn4q .xn6708d { padding-right: 30px; }
    .x1tbbn4q .x1ye3gou { padding-left: 30px; }
    .x1tbbn4q .x1dem4cn { color: #8822ff; }
    .x1tbbn4q .x6prxxf { font-size: .9rem; }
    .x1tbbn4q .x1s688f { font-weight: 500; }
    .x1tbbn4q .x1qhmfi1 { background-color: #fcdf3e; }
    .x1tbbn4q .x1gg8mnh { height: 26px; min-height: 10px; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

chrome.storage.local.get(['user_id'], function(result) {
  if (!result.user_id) {
    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    chrome.storage.local.set({ user_id: userId });
  }
});

async function autoInvite() {
  injectCSS();

  const userId = (await chrome.storage.local.get(['user_id'])).user_id;

  while (true) {
    const result = await chrome.storage.local.get(['inviting']);
    if (!result.inviting) return;

    const inviteButtons = document.querySelectorAll('div[aria-label="Pozvat"][role="button"]');

    for (let button of inviteButtons) {
      if (!(await chrome.storage.local.get(['inviting'])).inviting) return;

      button.click();
      await sleep(2000);

      // Increase the counter in storage and add timestamp
      const countResult = await chrome.storage.local.get(['inviteCount', 'inviteTimestamps']);
      let inviteCount = countResult.inviteCount || 0;
      inviteCount++;
      const inviteTimestamps = countResult.inviteTimestamps || [];
      inviteTimestamps.push(Date.now());
      await chrome.storage.local.set({inviteCount: inviteCount, inviteTimestamps: inviteTimestamps});

      // Send the invite count to the server
      fetch('https://fbmassinviter.zsf.cz/update_invite_count.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, increment: 1 })
      })
      .then(response => response.json())
      .then(data => {
        console.log('Updated server with invite count:', data);
      })
      .catch(error => console.error('Error updating server:', error));
    }

    const scrollContainer = document.querySelector('.x1tbbn4q');
    if (scrollContainer) {
      scrollContainer.style.height = '830px';
      scrollContainer.scrollBy(0, window.innerHeight);
    }

    await sleep(2000);
  }
}

autoInvite();
