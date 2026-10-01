// Loads the extension into Chromium, opens three windows with a pinned tab and a tab group,
// merges them, and checks the result.
// Usage: node scripts/test.mjs [extension folder, default: this repo]
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const extension = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('..', import.meta.url))

// Chrome ignores --load-extension since version 137, so the extension goes in through DevTools
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  args: ['--enable-unsafe-extension-debugging'],
  ignoreDefaultArgs: ['--disable-extensions'],
})

try {
  const cdp = await context.browser().newBrowserCDPSession()
  const workerStarted = context.waitForEvent('serviceworker')
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: extension })
  const worker = context.serviceWorkers().find((w) => w.url().includes(id)) ?? (await workerStarted)

  const result = await worker.evaluate(async () => {
    const url = (name) => `data:text/html,<title>${name}</title>`
    const normalWindows = async () => (await chrome.windows.getAll({ windowTypes: ['normal'] })).length

    const popup = await chrome.windows.create({ url: url('popup'), type: 'popup' })
    const b = await chrome.windows.create({ url: [url('b1'), url('b2'), url('b3')] })
    await chrome.tabs.update(b.tabs[0].id, { pinned: true })
    const c = await chrome.windows.create({ url: [url('c1'), url('c2'), url('c3')] })
    const groupId = await chrome.tabs.group({ tabIds: [c.tabs[1].id, c.tabs[2].id] })
    await chrome.tabGroups.update(groupId, { title: 'Research', color: 'green' })

    const [target] = await chrome.windows.getAll({ populate: true, windowTypes: ['normal'] })
    const t1 = await chrome.tabs.create({ windowId: target.id, url: url('t1') })

    const label = new Map([
      [target.tabs[0].id, 't0'],
      [t1.id, 't1'],
      ...b.tabs.map((tab, i) => [tab.id, `b${i + 1}`]),
      ...c.tabs.map((tab, i) => [tab.id, `c${i + 1}`]),
    ])

    const windowsBefore = await normalWindows()
    await mergeInto(popup.id)
    const windowsAfterPopup = await normalWindows()

    await mergeInto(target.id)
    const merged = await chrome.windows.get(target.id, { populate: true })
    const groups = await chrome.tabGroups.query({ windowId: target.id })

    return {
      windowsBefore,
      windowsAfterPopup,
      windowsAfter: await normalWindows(),
      tabs: merged.tabs.map((tab) => {
        let name = label.get(tab.id)
        if (tab.pinned) name += ' pinned'
        if (tab.groupId === groupId) name += ' grouped'
        return name
      }),
      groups: groups.map((group) => `${group.title} ${group.color}`),
      shortcut: (await chrome.commands.getAll()).find((c) => c.name === '_execute_action').shortcut,
    }
  })

  assert.equal(result.windowsBefore, 3)
  assert.equal(result.windowsAfterPopup, 3, 'merging into a popup window does nothing')
  assert.equal(result.windowsAfter, 1)
  assert.deepEqual(result.tabs, ['b1 pinned', 't0', 't1', 'b2', 'b3', 'c1', 'c2 grouped', 'c3 grouped'])
  assert.deepEqual(result.groups, ['Research green'])
  assert.notEqual(result.shortcut, '', 'the suggested shortcut is registered')

  console.log(`ok: 3 windows merged into 1, ${result.tabs.length} tabs in order, shortcut ${result.shortcut}`)
} finally {
  await context.close()
}
