// Made by thsm0331

const counterEl = document.getElementById('counter');
const statusEl = document.getElementById('statusMsg');
const excludeMainEl = document.getElementById('excludeMain');
const startDateEl = document.getElementById('startDate');
const endDateEl = document.getElementById('endDate');
const speedRangeEl = document.getElementById('speedRange');
const speedValEl = document.getElementById('speedVal');

speedRangeEl.addEventListener('input', () => {
  speedValEl.innerText = speedRangeEl.value;
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "UPDATE_UI") {
    counterEl.innerText = request.count;
    statusEl.innerText = request.msg;
  }
});

const startCleaning = async (mode) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const opMode = document.querySelector('input[name="opMode"]:checked').value;

  const settings = {
    isRunning: true,
    mode: mode,
    opMode: opMode,
    excludeMain: excludeMainEl.checked,
    startDate: startDateEl.value,
    endDate: endDateEl.value,
    delay: parseInt(speedRangeEl.value),
    sessionCount: 0 
  };
  
  await chrome.storage.local.set({ "cleaner_state": settings });
  chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { location.reload(); } });
};

document.getElementById('postsBtn').addEventListener('click', () => startCleaning('POSTS'));
document.getElementById('likesBtn').addEventListener('click', () => startCleaning('LIKES'));
document.getElementById('stopBtn').addEventListener('click', async () => {
  await chrome.storage.local.clear();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => { location.reload(); } });
});
