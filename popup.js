document.addEventListener('DOMContentLoaded', function () {
    const toggleButton = document.getElementById('toggle');
    const scrollToggleButton = document.getElementById('scrollToggle');
    const versionValue = document.getElementById('versionValue');

    const MAX_INVITES_4HOURS = 1800;  // Maximum number of invites allowed in a 4-hour period
    const MAX_INVITES_24HOURS = 7000;  // Maximum number of invites allowed in a 24-hour period
    const MAX_INVITES_MILESTONE = 20000;  // Maximum number of invites allowed since a certain milestone
    const MAX_INVITES_REMAINING = 1200;  // Maximum number of remaining invites before hitting a limit
    const MAX_VISIBLE_INVITES = 750;  // Maximum number of visible invites in the UI
    const MAX_BAR_HEIGHT = 1000;  // Max value for 1h bar in pixels; over-limit values color the column red
    const MAX_TEN_MINUTE_BARS = 24;  // Maximum number of ten-minute bars in the graph
    const TEN_MINUTE_INTERVAL = 10 * 60 * 1000;  // Interval for each ten-minute bar in milliseconds (10 minutes)
    const TEN_MINUTE_BAR_MAX_VALUE = 200;  // Max value represented by px height for 10m t-bar, over-limit values color the column red
    const languageSwitcher = document.getElementById('bopis');  // Reference to the language switcher element in the popup

    const colors = [
        '#fe6ee5', '#fc6ee8', '#fa6eec', '#f76ef0', '#f46ef4', '#f06ef8', '#ed6dfb', '#e86dfe',
        '#e36bff', '#de6aff', '#d869ff', '#d067ff', '#ca65ff', '#c262ff', '#bc5fff', '#b55cff',
        '#af58ff', '#af58ff', '#a34dff', '#9d46ff', '#973eff', '#9236ff', '#8d2eff', '#8a26ff'
    ];  // Array of color codes used for the bar graph representation

    let milestoneTimestamp = new Date('2024-07-13T13:00:00').getTime(); // Milestone time
    let invitingAnimationInterval;
    let scrollingInterval;

    const translations = {
        en: {
            start: 'START',
            stopped: 'STOPPED (ban prevention)',
            running: 'RUNNING (stop?)',
            inviting: 'INVITING',
            invitesLoaded: 'LOADED: ',
            completionEstimate: 'Completion estimate: ',
            currentlyInvited: 'Currently invited: ',
            previouslyInvited: 'Previously: ',
            invited24Hours: 'Invited in 24 hours: ',
            invited4Hours: 'Invited in 4 hours: ',
            totalSinceMilestone: 'Total invited: ',
            remainingInvites: 'Ban zone: ',
            done: 'Done',
            author: 'Author: Filip Novák',
            authorLink: 'AskFilipShow.com',
            authorUrl: 'https://askfilipshow.com/fbmassinviter'
        },
        cs: {
            start: 'SPUSTIT',
            stopped: 'ZASTAVENO (prevence banu)',
            running: 'PROBÍHÁ (zastavit?)',
            inviting: 'Probíhá zvaní',
            invitesLoaded: 'NAČTENO: ',
            completionEstimate: 'Dokončení načtených: ',
            currentlyInvited: 'Právě pozvaných: ',
            previouslyInvited: 'Předtím: ',
            invited24Hours: 'Pozvaných za 24 hodin: ',
            invited4Hours: 'Pozvaných za 4 hodiny: ',
            totalSinceMilestone: 'Pozvaných celkem: ',
            remainingInvites: 'Zóna banu: ',
            done: 'Dokončeno',
            author: 'Autor: Filip Novák',
            authorLink: 'ZeptejSeFilipa (zsf.cz)',
            authorUrl: 'https://zsf.cz/fbmassinviter'
        }
    };

    let currentLanguage = 'cs';

    // Function to save the selected language preference
    function saveLanguagePreference(language) {
        chrome.storage.local.set({ selectedLanguage: language });
    }

    // Function to load the selected language preference
    function loadLanguagePreference() {
        chrome.storage.local.get(['selectedLanguage'], function (result) {
            if (result.selectedLanguage) {
                currentLanguage = result.selectedLanguage;
                languageSwitcher.checked = (currentLanguage === 'en');
            }
            translatePageAndUpdateValues();
        });
    }

    // Function to translate the text content of the popup based on the selected language
    function translatePage() {
        const t = translations[currentLanguage];
        scrollToggleButton.innerHTML = `${t.invitesLoaded}<span class="bold">0</span>`;
        document.getElementById('time').innerHTML = `${t.completionEstimate}<span class="bold" id="completionEstimateValue"></span>`;
        document.getElementById('counter').innerHTML = `${t.currentlyInvited}<span class="bold" id="counterValue">0</span> ${t.previouslyInvited}<span class="bold" id="lastCounterValue">0</span>`;
        document.getElementById('invited24Hours').innerHTML = `${t.invited24Hours}<span class="bold" id="invited24HoursValue">0</span>`;
        document.getElementById('invited4Hours').innerHTML = `${t.invited4Hours}<span class="bold" id="invited4HoursValue">0</span>`;
        document.getElementById('totalSinceMilestone').innerHTML = `${t.totalSinceMilestone}<span class="bold" id="totalSinceMilestoneValue">0</span>`;
        document.getElementById('remainingInvites').innerHTML = `${t.remainingInvites}<span class="bold" id="remainingInvitesValue">0</span>`;
        document.querySelector('.author').innerHTML = `${t.author} <a href="${t.authorUrl}" target="_blank">${t.authorLink}</a>`;
    }

    // Function to format numbers with spaces for better readability
    function formatNumberWithSpaces(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }

    // Function to update the invite counter and progress bars
    function updateCounter() {
        chrome.storage.local.get(['inviteCount', 'lastInviteCount', 'inviteTimestamps', 'remainingInvites', 'milestoneTimestamp'], function (result) {
            document.getElementById('counterValue').innerText = formatNumberWithSpaces(result.inviteCount || 0);
            document.getElementById('lastCounterValue').innerText = formatNumberWithSpaces(result.lastInviteCount || 0);

            if (result.milestoneTimestamp) {
                milestoneTimestamp = result.milestoneTimestamp;
            }

            const now = Date.now();
            const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
            const fourHoursAgo = now - 4 * 60 * 60 * 1000;
            const inviteTimestamps = result.inviteTimestamps || [];
            const invitesIn24Hours = inviteTimestamps.filter(timestamp => timestamp > twentyFourHoursAgo).length;
            const invitesIn4Hours = inviteTimestamps.filter(timestamp => timestamp > fourHoursAgo).length;
            const totalSinceMilestone = inviteTimestamps.filter(timestamp => timestamp > milestoneTimestamp).length;
            const remainingInvites = MAX_INVITES_4HOURS - invitesIn4Hours;

            document.getElementById('invited24HoursValue').innerText = formatNumberWithSpaces(invitesIn24Hours);
            document.getElementById('invited4HoursValue').innerText = formatNumberWithSpaces(invitesIn4Hours);
            document.getElementById('totalSinceMilestoneValue').innerText = formatNumberWithSpaces(totalSinceMilestone);
            document.getElementById('remainingInvitesValue').innerText = formatNumberWithSpaces(remainingInvites);

            const progressBar4Hours = document.getElementById('progressBar4Hours');
            const progressPercentage4Hours = Math.min((invitesIn4Hours / MAX_INVITES_4HOURS) * 100, 100);
            progressBar4Hours.style.width = progressPercentage4Hours + '%';

            const progressBar24Hours = document.getElementById('progressBar24Hours');
            const progressPercentage24Hours = Math.min((invitesIn24Hours / MAX_INVITES_24HOURS) * 100, 100);
            progressBar24Hours.style.width = progressPercentage24Hours + '%';

            const progressBarMilestone = document.getElementById('progressBarMilestone');
            const progressPercentageMilestone = Math.min((totalSinceMilestone / MAX_INVITES_MILESTONE) * 100, 100);
            progressBarMilestone.style.width = progressPercentageMilestone + '%';

            const progressBarRemainingPositive = document.getElementById('progressBarRemainingPositive');
            const progressBarRemainingNegative = document.getElementById('progressBarRemainingNegative');
            const progressPercentageRemaining = Math.min((Math.abs(remainingInvites) / MAX_INVITES_REMAINING) * 100, 100);

            if (remainingInvites >= 0) {
                progressBarRemainingPositive.style.width = (progressPercentageRemaining * 50 / 100) + '%';
                progressBarRemainingPositive.style.left = '50%';
                progressBarRemainingPositive.style.transform = 'translateX(0)';
                progressBarRemainingNegative.style.width = '0';
            } else {
                progressBarRemainingNegative.style.width = (progressPercentageRemaining * 50 / 100) + '%';
                progressBarRemainingNegative.style.left = '50%';
                progressBarRemainingNegative.style.transform = 'translateX(-100%)';
                progressBarRemainingPositive.style.width = '0';
            }

            updateBarGraph(inviteTimestamps);
            updateTenMinuteBars(inviteTimestamps);
            chrome.storage.local.set({ remainingInvites: remainingInvites });
            updateCompletionEstimate();

            if (remainingInvites <= 1) {
                chrome.storage.local.set({ inviting: false }, () => {
                    updateToggleButtonToStopped();
                    chrome.runtime.sendMessage({ updateIcon: true });
                    clearInterval(invitingAnimationInterval);
                });
            }
            updateVisibleInvites();
        });
    }

    // Function to update the toggle button to show "stopped" state
    function updateToggleButtonToStopped() {
        const t = translations[currentLanguage];
        toggleButton.innerText = t.stopped;
        toggleButton.style.background = '#e70202';
        toggleButton.style.border = '1px solid #a30101';
        toggleButton.style.color = '#ffffff';
    }

    // Function to reset the toggle button to its default state
    function resetToggleButton() {
        const t = translations[currentLanguage];
        toggleButton.innerText = t.start;
        toggleButton.classList.remove('active');
        toggleButton.style.background = '';
        toggleButton.style.border = '';
        toggleButton.style.color = '';
    }

    // Function to translate the page and update the UI values
    function translatePageAndUpdateValues() {
        translatePage();
        updateCounter();
        updateUIBasedOnState(); // Update UI based on the current state after translation
    }

    // Load the preferred language on startup
    loadLanguagePreference();

    // Event listener for the toggle button click
    toggleButton.addEventListener('click', () => {
        chrome.storage.local.get(['inviting', 'inviteCount', 'inviteTimestamps', 'remainingInvites'], function (result) {
            if (result.inviting) {
                chrome.storage.local.set({
                    inviting: false,
                    lastInviteCount: result.inviteCount || 0,
                    inviteCount: 0
                }, () => {
                    resetToggleButton();
                    updateCounter();
                    chrome.runtime.sendMessage({ updateIcon: true });
                    clearInterval(invitingAnimationInterval);
                });
            } else {
                if ((result.remainingInvites || MAX_INVITES_4HOURS) > 1) {
                    chrome.storage.local.set({ inviting: true }, () => {
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            chrome.scripting.executeScript({
                                target: { tabId: tabs[0].id },
                                files: ['content.js']
                            });
                        });
                        toggleButton.innerText = translations[currentLanguage].running;
                        toggleButton.classList.add('active');
                        chrome.runtime.sendMessage({ updateIcon: true });
                    });
                } else {
                    alert(translations[currentLanguage].stopped);
                }
            }
        });
    });

    // Event listener for the scroll toggle button click
    scrollToggleButton.addEventListener('click', () => {
        chrome.storage.local.get(['scrolling'], function (result) {
            if (result.scrolling) {
                chrome.storage.local.set({ scrolling: false }, () => {
                    scrollToggleButton.innerHTML = `${translations[currentLanguage].invitesLoaded}<span class="bold">0</span>`;
                    scrollToggleButton.classList.remove('active');
                    clearInterval(scrollingInterval);
                });
            } else {
                chrome.storage.local.set({ scrolling: true }, () => {
                    scrollToggleButton.innerHTML = `${translations[currentLanguage].invitesLoaded}<span class="bold">0</span>`;
                    scrollToggleButton.classList.add('active');
                    startScrolling();
                });
            }
        });
    });

    // Event listener for the language switcher change
    languageSwitcher.addEventListener('change', function () {
        currentLanguage = languageSwitcher.checked ? 'en' : 'cs';
        saveLanguagePreference(currentLanguage);
        translatePageAndUpdateValues();
    });

    // Function to start the scrolling interval
    function startScrolling() {
        scrollingInterval = setInterval(() => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        const scrollContainer = document.querySelector('.x1tbbn4q');
                        if (scrollContainer) {
                            scrollContainer.style.height = '830px';
                            scrollContainer.scrollBy(0, window.innerHeight);
                        }
                    }
                });
            });
            updateVisibleInvites();
        }, 500); // Scrolling interval is set to 500 ms (0.5 seconds)
    }

    // Function to update the completion estimate for visible invites
    function updateCompletionEstimate() {
        const completionEstimateElement = document.getElementById('completionEstimateValue');
        const visibleInvitesText = scrollToggleButton.innerHTML.match(/<span class="bold">(\d+)<\/span>/);
        const visibleInvites = visibleInvitesText ? parseInt(visibleInvitesText[1]) : 0;

        if (visibleInvites <= 0) {
            completionEstimateElement.innerText = translations[currentLanguage].done;
        } else {
            const secondsRemaining = visibleInvites * 2;
            const minutes = Math.floor(secondsRemaining / 60);
            const seconds = secondsRemaining % 60;
            const minutesText = minutes.toString();
            const secondsText = seconds.toString();

            completionEstimateElement.innerText = `~${minutesText}m ${secondsText}s`;
        }
    }

    // Function to update the number of visible invites
    function updateVisibleInvites() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: () => {
                    return document.querySelectorAll('div[aria-label="Invite"][role="button"]').length;
                }
            }, (results) => {
                if (results && results.length > 0) {
                    const visibleInvites = results[0].result;
                    scrollToggleButton.innerHTML = `${translations[currentLanguage].invitesLoaded}<span class="bold">${visibleInvites}</span>`;
                    updateCompletionEstimate();
                }
            });
        });
    }

    // Function to update the bar graph based on invite timestamps
    function updateBarGraph(inviteTimestamps) {
        const now = Date.now();
        const hour = 60 * 60 * 1000;

        const invitesLast1Hour = inviteTimestamps.filter(ts => ts > now - hour).length;
        const invitesLast2To1Hours = inviteTimestamps.filter(ts => ts > now - 2 * hour && ts <= now - hour).length;
        const invitesLast3To2Hours = inviteTimestamps.filter(ts => ts > now - 3 * hour && ts <= now - 2 * hour).length;
        const invitesLast4To3Hours = inviteTimestamps.filter(ts => ts > now - 4 * hour && ts <= now - 3 * hour).length;

        updateBar('bar1-0', invitesLast1Hour);
        updateBar('bar2-1', invitesLast2To1Hours);
        updateBar('bar3-2', invitesLast3To2Hours);
        updateBar('bar4-3', invitesLast4To3Hours);
    }

    // Function to update an individual bar in the bar graph
    function updateBar(barId, value) {
        const barElement = document.getElementById(barId);
        const heightPercentage = Math.min((value / MAX_BAR_HEIGHT) * 100, 100);
        barElement.style.height = heightPercentage + '%';
        const colorRange = MAX_BAR_HEIGHT / colors.length;
        let colorIndex = Math.floor(value / colorRange);
        if (colorIndex >= colors.length) {
            barElement.style.backgroundColor = '#ff2626';
        } else {
            barElement.style.backgroundColor = colors[colorIndex];
        }
        barElement.parentNode.dataset.value = value;
    }

    // Function to update the ten-minute bars based on invite timestamps
    function updateTenMinuteBars(inviteTimestamps) {
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;

        for (let i = 0; i < MAX_TEN_MINUTE_BARS; i++) {
            const startTime = now - (i + 1) * tenMinutes;
            const endTime = now - i * tenMinutes;
            const invitesInTenMinutes = inviteTimestamps.filter(ts => ts > startTime && ts <= endTime).length;

            updateTenMinuteBar(`barTenMinute${i}`, invitesInTenMinutes);
        }
    }

    // Function to update an individual ten-minute bar in the graph
    function updateTenMinuteBar(barId, value) {
        const barElement = document.getElementById(barId);
        const heightPercentage = Math.min((value / TEN_MINUTE_BAR_MAX_VALUE) * 100, 100);
        barElement.style.height = heightPercentage + '%';
        const colorRange = TEN_MINUTE_BAR_MAX_VALUE / colors.length;
        let colorIndex = Math.floor(value / colorRange);
        if (colorIndex >= colors.length) {
            barElement.style.backgroundColor = '#ff2626';
        } else {
            barElement.style.backgroundColor = colors[colorIndex];
        }
        barElement.parentNode.dataset.value = value;
    }

    // Event listeners for showing tooltips on bars
    const bars = document.querySelectorAll('.t-bar');
    const tooltip = document.getElementById('tooltip');

    bars.forEach(bar => {
        bar.addEventListener('mouseover', function (event) {
            const value = bar.dataset.value;
            tooltip.innerText = value;
            tooltip.style.visibility = 'visible';
            tooltip.style.left = `${event.pageX + 5}px`;
            tooltip.style.top = `${event.pageY - 30}px`;
        });

        bar.addEventListener('mousemove', function (event) {
            tooltip.style.left = `${event.pageX + 5}px`;
            tooltip.style.top = `${event.pageY - 30}px`;
        });

        bar.addEventListener('mouseout', function () {
            tooltip.style.visibility = 'hidden';
        });
    });

    const newBarGraphBars = document.querySelectorAll('.bar-container .bar');
    const newBarGraphTooltip = document.getElementById('tooltipNewBarGraph');

    newBarGraphBars.forEach(bar => {
        bar.addEventListener('mouseover', function (event) {
            const value = bar.dataset.value;
            newBarGraphTooltip.innerText = value;
            newBarGraphTooltip.style.visibility = 'visible';
            newBarGraphTooltip.style.left = `${event.pageX + 5}px`;
            newBarGraphTooltip.style.top = `${event.pageY - 30}px`;
        });

        bar.addEventListener('mousemove', function (event) {
            newBarGraphTooltip.style.left = `${event.pageX + 5}px`;
            newBarGraphTooltip.style.top = `${event.pageY - 30}px`;
        });

        bar.addEventListener('mouseout', function () {
            newBarGraphTooltip.style.visibility = 'hidden';
        });
    });

    // Initial setup to load stored values and update the UI
    chrome.storage.local.get(['inviting', 'inviteCount', 'lastInviteCount', 'inviteTimestamps', 'remainingInvites', 'scrolling', 'milestoneTimestamp'], function (result) {
        if (result.inviting) {
            toggleButton.innerText = translations[currentLanguage].running;
            toggleButton.classList.add('active');
        } else {
            resetToggleButton();
        }
        if (result.scrolling) {
            scrollToggleButton.innerHTML = `${translations[currentLanguage].invitesLoaded}<span class="bold">${formatNumberWithSpaces(result.visibleInvites || 0)}</span>`;
            scrollToggleButton.classList.add('active');
            startScrolling();
        } else {
            scrollToggleButton.innerHTML = `${translations[currentLanguage].invitesLoaded}<span class="bold">0</span>`;
        }
        if (result.milestoneTimestamp) {
            milestoneTimestamp = result.milestoneTimestamp;
        }
        updateCounter();
        // Load version from the manifest
        const manifest = chrome.runtime.getManifest();
        versionValue.innerText = manifest.version;
    });

    // Set an interval to update the counter every second
    setInterval(updateCounter, 1000);

    // Function to update the UI based on the current state
    function updateUIBasedOnState() {
        chrome.storage.local.get(['inviting', 'remainingInvites'], function (result) {
            const t = translations[currentLanguage];
            if (result.inviting) {
                toggleButton.innerText = t.running;
            } else {
                if ((result.remainingInvites || MAX_INVITES_4HOURS) > 1) {
                    resetToggleButton();
                } else {
                    updateToggleButtonToStopped();
                }
            }
        });
    }
});
