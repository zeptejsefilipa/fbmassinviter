FbMassInviter
========================

Description
--------------

FbMassInviter is a Chrome extension designed to automate the process of inviting users who liked your Facebook posts to like your Facebook page. This tool is intended for users who want to increase the visibility and reach of their Facebook pages by converting post likes into page follows efficiently.

* Automated Invites: Automatically sends invites to users who liked your Facebook posts.
* Icon Notifications: Browser action icon updates to reflect the current status of the inviting process.
* Progress Tracking: Tracks and displays the number of invites sent, including invite counts over the last 4 hours, 24 hours, and since a specific milestone.
* Language Support: Supports both English and Czech languages, with an easy toggle switch in the popup UI.
* Ban Zone Indicator: Displays a warning when approaching Facebook's invite limits to prevent account bans.
* Customizable UI: Stylish and user-friendly interface with progress bars, counters, and graphs.

How to Install
--------------

- Open chrome://extensions/
- Enable "Developer mode"
- Click "Load unpacked"
- Select the directory where you cloned the repository

Usage
--------------

- Open Facebook and navigate to a page you manage.
- Open the FbMassInviter popup by clicking the extension icon.
- Click the "START" button to begin the automated inviting process.
- Monitor the progress through the popup, which displays invite counts and other statistics.
- Use the toggle switch to change the language between English and Czech if needed.

Functions
--------------
background.js
- chrome.runtime.onMessage.addListener: Listens for messages to increment invite count and update the icon.
- updateIcon: Updates the browser action icon based on the current inviting status.
- startBlinkingIcon: Starts blinking the icon to indicate the inviting process.
- stopBlinkingIcon: Stops blinking the icon.
content.js
- sleep(ms): Returns a promise that resolves after the specified milliseconds.
- injectCSS: Injects custom CSS into the Facebook page to enhance visibility.
- autoInvite: Main function that automates the inviting process by clicking invite buttons and scrolling the page.
popup.js
- updateCounter: Updates the invite counts and progress bars in the popup UI.
- translatePage: Translates the popup UI based on the selected language.
- startScrolling: Automatically scrolls the Facebook page to load more invite buttons.
- updateBarGraph: Updates the invite count bar graph in the popup.
- updateTenMinuteBars: Updates the 10-minute interval bar graphs.

License
--------------
FbMassInviter is licensed under the GNU General Public License, version 3. See GNU_GPL_V3.txt for the full license text.

For more information, visit the project page or contact the author Filip Novák.
CS: https://zsf.cz/fbmassinviter En: https://askfilipshow.com/fbmassinviter

Feel free to contribute to the project by submitting issues or pull requests. Your feedback and contributions are highly appreciated!