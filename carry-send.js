/*
 * The hand-off for the app's old address (register item 93).
 *
 * After the move, app.brandonrobbinsministry.com serves only this page. A
 * reader's saved things (highlights, notes, journal, plan progress, settings,
 * sign-in) live in the browser under the old address and cannot be read by the
 * new one, so this page packs them up and carries them across:
 *
 *   1. reads every saved item the app keeps on this address (localStorage; the
 *      app keeps nothing in IndexedDB),
 *   2. packs them as JSON, squeezed with gzip when they are large and the
 *      browser can do it,
 *   3. switches off the app's old background helper (public/sw.js) so an
 *      installed home-screen copy stops opening the old app,
 *   4. goes to https://beyondthewords.com/ at the same path, with the same
 *      query and the same page of the app, and the packed items in the part of
 *      the address after "#", which a browser never sends to any server.
 *
 * The app on the new address (src/lib/carry.ts) unpacks them and keeps its own
 * newer value wherever it already has one. Nothing here is deleted: the old
 * address cannot hear back from the new one, so the items stay where they were.
 *
 * The packed format must match decodeCarry in src/lib/carry.ts:
 *   #carry=j1.<base64url of the UTF-8 JSON>&to=<the app page, URI-encoded>
 *   #carry=z1.<base64url of the gzip of the UTF-8 JSON>&to=<the app page>
 * and the JSON is { "v": 1, "from": "<old host>", "ls": { key: value } }.
 *
 * Loaded by index.html and 404.html alike, so every deep link lands here. It
 * runs in a browser; tests/carry.test.mjs also loads it in Node to check that
 * what it packs is exactly what the app unpacks.
 */
;(function (root) {
  'use strict'

  var NEW_HOME = 'https://beyondthewords.com'
  // Above this the JSON is squeezed before it goes in the address.
  var SQUEEZE_OVER = 4000
  // The longest address carried. Chrome stops at 2 MB and Firefox at 1 MB, so
  // this stays under both with room for the path.
  var MAX_URL = 1000000

  function toBase64Url(bytes) {
    var s = ''
    var CHUNK = 0x8000
    for (var i = 0; i < bytes.length; i += CHUNK) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
    }
    return root.btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  function gzip(bytes) {
    var stream = new Blob([bytes]).stream().pipeThrough(new root.CompressionStream('gzip'))
    return new Response(stream).arrayBuffer().then(function (buf) {
      return new Uint8Array(buf)
    })
  }

  /** Every item the app keeps in this browser on this address, as strings. */
  function readSaved(storage) {
    var out = {}
    if (!storage) return out
    for (var i = 0; i < storage.length; i++) {
      var k = storage.key(i)
      if (k == null) continue
      var v = storage.getItem(k)
      if (typeof v === 'string') out[k] = v
    }
    return out
  }

  /** Packs the items. Resolves to "j1.<data>" or "z1.<data>", or "" when there is nothing. */
  function encodeCarry(items, from) {
    var keys = Object.keys(items || {})
    if (!keys.length) return Promise.resolve('')
    var json = JSON.stringify({ v: 1, from: from || '', ls: items })
    var bytes = new TextEncoder().encode(json)
    var plain = 'j1.' + toBase64Url(bytes)
    if (json.length <= SQUEEZE_OVER || typeof root.CompressionStream !== 'function') {
      return Promise.resolve(plain)
    }
    return gzip(bytes).then(
      function (z) {
        var squeezed = 'z1.' + toBase64Url(z)
        return squeezed.length < plain.length ? squeezed : plain
      },
      function () {
        return plain
      },
    )
  }

  /** The new address for this page, with the packed items when there are any. */
  function buildTarget(loc, packed) {
    var base = NEW_HOME + (loc.pathname || '/') + (loc.search || '')
    var page = (loc.hash || '').replace(/^#/, '')
    if (!packed) return base + (page ? '#' + page : '')
    return base + '#carry=' + packed + (page ? '&to=' + encodeURIComponent(page) : '')
  }

  /** Switches off every background helper the old app registered here. */
  function stopOldHelper(nav) {
    try {
      if (!nav || !nav.serviceWorker || !nav.serviceWorker.getRegistrations) return Promise.resolve()
      var done = nav.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(
          regs.map(function (r) {
            return r.unregister().catch(function () {})
          }),
        )
      })
      // Never hold the reader here for long over it.
      var wait = new Promise(function (resolve) {
        setTimeout(resolve, 2000)
      })
      return Promise.race([done, wait]).catch(function () {})
    } catch (e) {
      return Promise.resolve()
    }
  }

  function say(doc, text) {
    var el = doc && doc.getElementById('say')
    if (el) el.textContent = text
  }

  function go() {
    var doc = root.document
    var loc = root.location
    var items = {}
    try {
      items = readSaved(root.localStorage)
    } catch (e) {
      items = {}
    }
    var manual = doc.getElementById('manual')
    var plainTarget = buildTarget(loc, '')
    if (manual) manual.href = plainTarget

    var packing = encodeCarry(items, loc.host).catch(function () {
      return ''
    })
    Promise.all([packing, stopOldHelper(root.navigator)]).then(function (r) {
      var packed = r[0]
      var target = buildTarget(loc, packed)
      if (target.length > MAX_URL) {
        // Too much to carry in an address. Nothing is lost: it all stays here.
        say(doc, 'Your saved notes are too large to move on their own. Tap the link below to open the new home of the app, and write to us so we can help bring them across.')
        return
      }
      if (manual) manual.href = target
      loc.replace(target)
    })
  }

  root.BTWCarry = {
    NEW_HOME: NEW_HOME,
    MAX_URL: MAX_URL,
    SQUEEZE_OVER: SQUEEZE_OVER,
    readSaved: readSaved,
    encodeCarry: encodeCarry,
    buildTarget: buildTarget,
    stopOldHelper: stopOldHelper,
  }

  if (root.document && root.document.getElementById && !root.BTW_CARRY_NO_RUN) go()
})(typeof window !== 'undefined' ? window : globalThis)
