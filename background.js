const NO_GROUP = chrome.tabGroups.TAB_GROUP_ID_NONE

async function moveTabs(tabIds, windowId) {
  if (tabIds.length === 0) return
  await chrome.tabs.move(tabIds, { windowId, index: -1 })
}

async function mergeInto(windowId) {
  const target = await chrome.windows.get(windowId)
  if (target.type !== 'normal') return
  const windows = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] })

  for (const win of windows) {
    if (win.id === target.id || win.incognito !== target.incognito) continue

    const pinned = win.tabs.filter((tab) => tab.pinned).map((tab) => tab.id)
    const movedGroups = new Set()
    let run = []

    for (const tab of win.tabs) {
      if (tab.groupId === NO_GROUP) {
        run.push(tab.id)
        continue
      }

      if (movedGroups.has(tab.groupId)) continue
      movedGroups.add(tab.groupId)

      await moveTabs(run, target.id)
      run = []
      await chrome.tabGroups.move(tab.groupId, { windowId: target.id, index: -1 })
    }

    await moveTabs(run, target.id)

    for (const tabId of pinned) {
      await chrome.tabs.update(tabId, { pinned: true })
    }
  }
}

chrome.action.onClicked.addListener((tab) => mergeInto(tab.windowId))
