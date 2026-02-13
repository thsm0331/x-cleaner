// Made by thsm0331

const REFRESH_THRESHOLD = 50;

const mainAction = async () => {
  const data = await chrome.storage.local.get("cleaner_state");
  const state = data.cleaner_state;
  if (!state || !state.isRunning) return;
  window.cleanX(state);
};

window.cleanX = async (state) => {
  let count = state.sessionCount;
  let sessionBatch = 0;
  let startDate = null;
  let endDate = null;
  if (state.startDate) {
    startDate = new Date(state.startDate + "T00:00:00");
    if (isNaN(startDate)) startDate = null;
  }
  if (state.endDate) {
    endDate = new Date(state.endDate + "T23:59:59.999");
    if (isNaN(endDate)) endDate = null;
  }

  const updateUI = (msg) => {
    chrome.runtime.sendMessage({ type: "UPDATE_UI", count: count, msg: msg });
    chrome.storage.local.set({ "cleaner_state": { ...state, sessionCount: count } });
  };

  while (true) {
    if (sessionBatch >= REFRESH_THRESHOLD) {
      updateUI("새 세션 시작 (새로고침)");
      await new Promise(r => setTimeout(r, 1000));
      location.reload(); return;
    }

    let targets = [];
    if (state.mode === 'LIKES') {
      targets = [...document.querySelectorAll('[data-testid="unlike"]')].filter(el => !el.dataset.checked);
    } else {
      const carets = [...document.querySelectorAll('[data-testid="caret"]')];
      const rts = [...document.querySelectorAll('[data-testid="unretweet"]')];
      targets = [...carets, ...rts].filter(el => !el.dataset.checked);
    }

    if (targets.length === 0) {
      window.scrollBy(0, window.innerHeight * 2);
      await new Promise(r => setTimeout(r, 2000));
      const retry = state.mode === 'LIKES' 
        ? document.querySelectorAll('[data-testid="unlike"]').length 
        : document.querySelectorAll('[data-testid="caret"], [data-testid="unretweet"]').length;
      if (retry === 0 && sessionBatch > 0) { location.reload(); return; }
      if (retry === 0) { updateUI("작업 완료"); break; }
      continue;
    }

    for (const item of targets) {
      if (sessionBatch >= REFRESH_THRESHOLD) break;
      item.dataset.checked = "true";
      const tweetCard = item.closest('[data-testid="tweet"]');
      
      if (tweetCard) {
        const timeEl = tweetCard.querySelector('time');
        if (timeEl) {
          const tweetDate = new Date(timeEl.getAttribute('datetime'));
          if ((startDate && tweetDate < startDate) || (endDate && tweetDate > endDate)) continue;
        }

        const isRT = tweetCard.querySelector('[data-testid="unretweet"]') !== null;
        if (state.opMode === 'POST_ONLY' && isRT) continue;
        if (state.opMode === 'RT_ONLY' && !isRT) continue;

        if (state.mode === 'POSTS' && state.excludeMain && !isRT) {
          if (!tweetCard.querySelector('div[dir="ltr"]')?.innerText.includes("님에게 보내는 답글")) continue;
        }
      }

      if (state.mode === 'LIKES') {
        item.click(); count++; sessionBatch++; updateUI(`${count}개 취소됨`);
        await new Promise(r => setTimeout(r, state.delay * 0.5));
      } else {
        const testId = item.getAttribute('data-testid');
        if (testId === 'unretweet') {
          item.click();
          await new Promise(r => setTimeout(r, 400));
          const undoBtn = document.querySelector('[data-testid="unretweetConfirm"]');
          if (undoBtn) undoBtn.click();
          count++; sessionBatch++; updateUI(`${count}개 처리됨`);
          await new Promise(r => setTimeout(r, state.delay));
        } else {
          item.click();
          await new Promise(r => setTimeout(r, state.delay * 0.5));
          const opt = [...document.querySelectorAll('[role="menuitem"]')].find(el => 
            el.innerText.includes('삭제') || el.innerText.includes('Delete')
          );
          if (opt) {
            opt.click();
            await new Promise(r => setTimeout(r, state.delay * 0.5));
            const conf = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (conf) conf.click();
            count++; sessionBatch++; updateUI(`${count}개 처리됨`);
            await new Promise(r => setTimeout(r, state.delay));
          } else { document.body.click(); }
        }
      }
    }
  }
};

if (document.readyState === "complete") mainAction();
else window.addEventListener("load", mainAction);
