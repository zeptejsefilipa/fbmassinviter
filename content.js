// Function to pause execution for a given number of milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to inject custom CSS styles into the page
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

// Retrieve or generate a user ID and store it locally
chrome.storage.local.get(['user_id'], function(result) {
  if (!result.user_id) {
    const userId = 'user_' + Math.random().toString(36).substr(2, 9);
    chrome.storage.local.set({ user_id: userId });
  }
});

// Function to format a number with spaces for better readability
function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Main function to automate the invitation process
async function autoInvite() {
  injectCSS();

  const userId = (await chrome.storage.local.get(['user_id'])).user_id;

  while (true) {
    const result = await chrome.storage.local.get(['inviting']);
    if (!result.inviting) return;

    // Array of supported invite button aria labels in various languages
    const inviteAriaLabels = [
        "Pozvat", "Invite", "邀请", "Invitar", "आमंत्रित करना", "دعوة", "আমন্ত্রণ জানানো", 
        "Convidar", "Пригласить", "招待する", "ਨਿਮੰਤਰਣ ਦੇਣਾ", "دعوت دینا", "Mengundang", 
        "Einladen", "Inviter", "Kualika", "आमंत्रित करणे", "ఆహ్వానించు", "அழைக்க", 
        "Davet etmek", "Mời", "초대하다", "Invitare", "เชิญ", "આમંત્રિત કરવું", "Zaprosić", 
        "Запросити", "ಆಹ್ವಾನಿಸು", "Menjemput", "دعوت کردن", "Gayyata"
    ];

    // Function to create the query selector string for invite buttons
    function createInviteButtonSelector(labels) {
        return labels.map(label => `div[role="button"][aria-label="${label}"]`).join(', ');
    }

    // Get the invite buttons based on the generated selector
    const inviteButtons = document.querySelectorAll(createInviteButtonSelector(inviteAriaLabels));

    for (let button of inviteButtons) {
        chrome.storage.local.get(['inviting']).then(storage => {
            if (!storage.inviting) return;
            // Add your logic here for processing each invite button when 'inviting' is true
        });
    }

      button.click();
      // Wait for 3 seconds between individual clicks
      await sleep(3000);

      // Increase the invite count in storage and add a timestamp
      const countResult = await chrome.storage.local.get(['inviteCount', 'inviteTimestamps']);
      let inviteCount = countResult.inviteCount || 0;
      inviteCount++;
      const inviteTimestamps = countResult.inviteTimestamps || [];
      inviteTimestamps.push(Date.now());
      await chrome.storage.local.set({inviteCount: inviteCount, inviteTimestamps: inviteTimestamps}, function() {
        console.log('Invite count:', formatNumber(inviteCount));
      });

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

    // Wait for 2 seconds before the next loop iteration
    await sleep(2000);
  }
}

// Start the invitation process
autoInvite();
