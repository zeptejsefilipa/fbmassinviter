document.addEventListener('DOMContentLoaded', async function () {
    const toggleButton = document.getElementById('toggle');
    const scrollToggleButton = document.getElementById('scrollToggle');
    const versionValue = document.getElementById('versionValue');
    const languageSwitcher = document.getElementById('bopis');

    const MAX_INVITES_4HOURS = 1800;
    const MAX_INVITES_24HOURS = 7000;
    const MAX_INVITES_MILESTONE = 20000;
    const MAX_INVITES_REMAINING = 1200;
    const MAX_VISIBLE_INVITES = 9900;
    const MAX_BAR_HEIGHT = 1200;
    const MAX_TEN_MINUTE_BARS = 24;
    const TEN_MINUTE_INTERVAL = 10 * 60 * 1000;
    const TEN_MINUTE_BAR_MAX_VALUE = 200;

    const colors = [
        '#fe6ee5', '#fc6ee8', '#fa6eec', '#f76ef0', '#f46ef4', '#f06ef8', '#ed6dfb', '#e86dfe',
        '#e36bff', '#de6aff', '#d869ff', '#d067ff', '#ca65ff', '#c262ff', '#bc5fff', '#b55cff',
        '#af58ff', '#af58ff', '#a34dff', '#9d46ff', '#973eff', '#9236ff', '#8d2eff', '#8a26ff'
    ];

    let milestoneTimestamp = new Date('2024-07-13T13:00:00').getTime();
    let invitingAnimationInterval;
    let scrollingInterval;

    let currentLanguage = 'cs';
    let translations = {};

    async function loadLanguage(language) {
        try {
            const response = await fetch(chrome.runtime.getURL(`lang/${language}.json`));
            translations = await response.json();
        } catch (error) {
            console.error('Failed to load language file:', error);
        }
    }

    function saveLanguagePreference(language) {
        chrome.storage.local.set({ selectedLanguage: language });
    }

    async function loadLanguagePreference() {
        try {
            const result = await chrome.storage.local.get(['selectedLanguage']);
            if (result.selectedLanguage) {
                currentLanguage = result.selectedLanguage;
                languageSwitcher.checked = (currentLanguage === 'en');
            }
            await loadLanguage(currentLanguage);
            translatePageAndUpdateValues();
        } catch (error) {
            console.error('Failed to load language preference:', error);
        }
    }

    async function translatePage() {
        if (!translations || Object.keys(translations).length === 0) {
            console.error('Translations not loaded');
            return;
        }
        const t = translations;
        scrollToggleButton.innerHTML = `${t.invitesLoaded}<span class="bold">0</span>`;
        document.getElementById('time').innerHTML = `${t.completionEstimate}<span class="bold" id="completionEstimateValue"></span>`;
        document.getElementById('counter').innerHTML = `${t.currentlyInvited}<span class="bold" id="counterValue">0</span> ${t.previouslyInvited}<span class="bold" id="lastCounterValue">0</span>`;
        document.getElementById('invited24Hours').innerHTML = `${t.invited24Hours}<span class="bold" id="invited24HoursValue">0</span>`;
        document.getElementById('invited4Hours').innerHTML = `${t.invited4Hours}<span class="bold" id="invited4HoursValue">0</span>`;
        document.getElementById('totalSinceMilestone').innerHTML = `${t.totalSinceMilestone}<span class="bold" id="totalSinceMilestoneValue">0</span>`;
        document.getElementById('remainingInvites').innerHTML = `${t.remainingInvites}<span class="bold" id="remainingInvitesValue">0</span>`;
        document.querySelector('.author').innerHTML = `${t.author} <a href="${t.authorUrl}" target="_blank">${t.authorLink}</a>`;
    }

    function formatNumberWithSpaces(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }

    async function updateCounter() {
        try {
            const result = await chrome.storage.local.get(['inviteCount', 'lastInviteCount', 'inviteTimestamps', 'remainingInvites', 'milestoneTimestamp']);
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
            await chrome.storage.local.set({ remainingInvites: remainingInvites });
            updateCompletionEstimate();

            if (remainingInvites <= 1) {
                await chrome.storage.local.set({ inviting: false });
                updateToggleButtonToStopped();
                chrome.runtime.sendMessage({ updateIcon: true });
                clearInterval(invitingAnimationInterval);
            }
            updateVisibleInvites();
        } catch (error) {
            console.error('Failed to update counter:', error);
        }
    }

    function updateToggleButtonToStopped() {
        const t = translations;
        toggleButton.innerText = t.stopped;
        toggleButton.style.background = '#e70202';
        toggleButton.style.border = '1px solid #a30101';
        toggleButton.style.color = '#ffffff';
    }

    function resetToggleButton() {
        const t = translations;
        toggleButton.innerText = t.start;
        toggleButton.classList.remove('active');
        toggleButton.style.background = '';
        toggleButton.style.border = '';
        toggleButton.style.color = '';
    }

    function translatePageAndUpdateValues() {
        translatePage();
        updateCounter();
        updateUIBasedOnState();
    }

    async function loadInitialValues() {
        try {
            const result = await chrome.storage.local.get(['inviting', 'inviteCount', 'lastInviteCount', 'inviteTimestamps', 'remainingInvites', 'scrolling', 'milestoneTimestamp']);
            if (result.inviting) {
                toggleButton.innerText = translations.running;
                toggleButton.classList.add('active');
            } else {
                resetToggleButton();
            }
            if (result.scrolling) {
                scrollToggleButton.innerHTML = `${translations.invitesLoaded}<span class="bold">${formatNumberWithSpaces(result.visibleInvites || 0)}</span>`;
                scrollToggleButton.classList.add('active');
                startScrolling();
            } else {
                scrollToggleButton.innerHTML = `${translations.invitesLoaded}<span class="bold">0</span>`;
            }
            if (result.milestoneTimestamp) {
                milestoneTimestamp = result.milestoneTimestamp;
            }
            updateCounter();
            const manifest = chrome.runtime.getManifest();
            versionValue.innerText = manifest.version;
        } catch (error) {
            console.error('Failed to load initial values:', error);
        }
    }

    loadLanguagePreference();
    loadInitialValues();

    toggleButton.addEventListener('click', async () => {
        try {
            const result = await chrome.storage.local.get(['inviting', 'inviteCount', 'inviteTimestamps', 'remainingInvites']);
            if (result.inviting) {
                await chrome.storage.local.set({
                    inviting: false,
                    lastInviteCount: result.inviteCount || 0,
                    inviteCount: 0
                });
                resetToggleButton();
                updateCounter();
                chrome.runtime.sendMessage({ updateIcon: true });
                clearInterval(invitingAnimationInterval);
            } else {
                if ((result.remainingInvites || MAX_INVITES_4HOURS) > 1) {
                    await chrome.storage.local.set({ inviting: true });
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id },
                            files: ['content.js']
                        });
                    });
                    toggleButton.innerText = translations.running;
                    toggleButton.classList.add('active');
                    chrome.runtime.sendMessage({ updateIcon: true });
                } else {
                    alert(translations.stopped);
                }
            }
        } catch (error) {
            console.error('Failed to handle toggle button click:', error);
        }
    });

    scrollToggleButton.addEventListener('click', async () => {
        try {
            const result = await chrome.storage.local.get(['scrolling']);
            if (result.scrolling) {
                await chrome.storage.local.set({ scrolling: false });
                scrollToggleButton.innerHTML = `${translations.invitesLoaded}<span class="bold">0</span>`;
                scrollToggleButton.classList.remove('active');
                clearInterval(scrollingInterval);
            } else {
                await chrome.storage.local.set({ scrolling: true });
                scrollToggleButton.innerHTML = `${translations.invitesLoaded}<span class="bold">0</span>`;
                scrollToggleButton.classList.add('active');
                startScrolling();
            }
        } catch (error) {
            console.error('Failed to handle scroll toggle button click:', error);
        }
    });

    languageSwitcher.addEventListener('change', async function () {
        currentLanguage = languageSwitcher.checked ? 'en' : 'cs';
        saveLanguagePreference(currentLanguage);
        await loadLanguage(currentLanguage);
        translatePageAndUpdateValues();
    });

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
        }, 500);
    }

    function updateCompletionEstimate() {
        const completionEstimateElement = document.getElementById('completionEstimateValue');
        const visibleInvitesText = scrollToggleButton.innerHTML.match(/<span class="bold">(\d+)<\/span>/);
        const visibleInvites = visibleInvitesText ? parseInt(visibleInvitesText[1]) : 0;

        if (visibleInvites <= 0) {
            completionEstimateElement.innerText = translations.done;
        } else {
            const secondsRemaining = visibleInvites * 2;
            const minutes = Math.floor(secondsRemaining / 60);
            const seconds = secondsRemaining % 60;
            const minutesText = minutes.toString();
            const secondsText = seconds.toString();

            completionEstimateElement.innerText = `~${minutesText}m ${secondsText}s`;
        }
    }

    function updateVisibleInvites() {
        const labels = [
            "Pozvat", "Invite", "邀请", "Invitar", "आमंत्रित करना", "دعوة", "আমন্ত্রণ জানানো", "Convidar", 
            "Пригласить", "招待する", "ਨਿਮੰਤਰਣ ਦੇਣਾ", "دعوت دینا", "Mengundang", "Einladen", "Inviter", 
            "Kualika", "आमंत्रित करणे", "ఆహ్వానించు", "அழைக்க", "Davet etmek", "Mời", "초대하다", 
            "Invitare", "เชิญ", "આમંત્રિત કરવું", "Zaprosić", "Запросити", "ಆಹ್ವಾನಿಸು", "Menjemput", 
            "دعوت کردن", "Gayyata"
        ];

        const selectors = labels.map(label => `div[role="button"][aria-label="${label}"]`).join(', ');

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (selectors) => {
                    return document.querySelectorAll(selectors).length;
                },
                args: [selectors]
            }, (results) => {
                if (results && results.length > 0) {
                    let visibleInvites = results[0].result;
                    if (visibleInvites > MAX_VISIBLE_INVITES) {
                        visibleInvites = MAX_VISIBLE_INVITES;
                    }
                    scrollToggleButton.innerHTML = `${translations.invitesLoaded}<span class="bold">${visibleInvites}</span>`;
                    updateCompletionEstimate();
                }
            });
        });
    }

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

    setInterval(updateCounter, 1000);

    function updateUIBasedOnState() {
        chrome.storage.local.get(['inviting', 'remainingInvites'], function (result) {
            const t = translations;
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
