import {
    l as J,
    c as T,
    e as j,
    a as I,
    s as pe,
    g as Ee,
    b as Gt
} from "./sendMessage.js";
import {
    m as Xt,
    o as Ge,
    c as Tt,
    f as Jt,
    a as jt,
    M as Qt,
    L as Zt
} from "./helper.js";
import {
    b as Q,
    D as en,
    t as de,
    d as He,
    g as tn
} from "./token.js";
import {
    g as Me,
    a as X,
    u as lt,
    b as nn,
    c as ut,
    m as rn,
    d as sn,
    e as on,
    f as Ct,
    h as an,
    i as cn
} from "./chromeAsync.js";
import {
    i as ln
} from "./manus.js";
import {
    a as un,
    b as dn,
    c as hn,
    d as pn
} from "./typeGuards.js";
class fn {
    constructor(e = 1e3) {
        this.slowQueryThreshold = e
    }
    async execute(e, t, n, s) {
        const o = await s(),
            i = n.getDuration();
        return i > this.slowQueryThreshold && J.warn(`[Performance] Slow message handler: ${n.messageType} took ${i}ms (threshold: ${this.slowQueryThreshold}ms)`), o
    }
}
const $ = T("AuthHelper");
class mn {
    constructor() {
        this.cleanupWatcher = null, this.debounceTimers = new Map
    }
    async initialize() {
        try {
            const e = Q.getBrowserSettings();
            (!e || !e.browserName) && await Q.setBrowserSettings(en);
            const t = await this.getManusAppCookies();
            if ($.info("Manus app cookies obtained", {
                    cookies: t
                }), t.token) {
                const n = this.normalizeValue(t.token);
                await de.setToken(n)
            } else $.info("No token found in cookies");
            if (t.devBranch) {
                const n = this.normalizeValue(t.devBranch);
                await He.setDevBranch(n)
            } else $.info("No devBranch found in cookies");
            return {
                token: this.normalizeValue(t.token),
                initialized: !0
            }
        } catch (e) {
            const t = e instanceof Error ? e.message : String(e);
            return $.error("Failed to initialize auth", {
                error: t
            }), {
                token: null,
                initialized: !1
            }
        }
    }
    startWatcher() {
        var o;
        if (!((o = chrome.cookies) != null && o.onChanged)) {
            $.warn("chrome.cookies API unavailable; skip Manus cookies watcher");
            return
        }
        this.stopWatcher();
        const e = j.getEnvParams().webAppDomain;
        let t;
        try {
            t = new URL(e).hostname
        } catch (i) {
            $.error("Failed to start Manus cookies watcher; invalid URL", {
                url: e,
                error: i instanceof Error ? i.message : String(i)
            });
            return
        }
        const n = [{
                cookieName: "session_id",
                getCurrentValue: () => de.getToken(),
                setValue: i => de.setToken(i)
            }],
            s = i => {
                const {
                    cookie: a,
                    removed: c
                } = i;
                if (!a) return;
                const l = a.domain.startsWith(".") ? a.domain.slice(1) : a.domain;
                if (!(t === l || t.endsWith(`.${l}`))) return;
                const d = n.find(h => h.cookieName === a.name);
                d && this.handleCookieChangeWithDebounce(a.name, c, a.value, d)
            };
        chrome.cookies.onChanged.addListener(s), $.info("Started watching Manus app cookies", {
            host: t,
            cookies: n.map(i => i.cookieName)
        }), this.cleanupWatcher = () => {
            chrome.cookies.onChanged.removeListener(s);
            for (const i of this.debounceTimers.values()) clearTimeout(i);
            this.debounceTimers.clear(), $.info("Stopped watching Manus app cookies", {
                host: t,
                cookies: n.map(i => i.cookieName)
            })
        }
    }
    stopWatcher() {
        this.cleanupWatcher && (this.cleanupWatcher(), this.cleanupWatcher = null)
    }
    async getManusAppCookies() {
        const e = j.getEnvParams().webAppDomain,
            [t, n] = await Promise.all([new Promise((s, o) => {
                chrome.cookies.get({
                    url: e,
                    name: "session_id"
                }, i => {
                    if (chrome.runtime.lastError) {
                        o(new Error(chrome.runtime.lastError.message));
                        return
                    }
                    s(i)
                })
            }), new Promise((s, o) => {
                chrome.cookies.get({
                    url: e,
                    name: "devBranch"
                }, i => {
                    if (chrome.runtime.lastError) {
                        o(new Error(chrome.runtime.lastError.message));
                        return
                    }
                    s(i)
                })
            })]);
        return {
            token: (t == null ? void 0 : t.value) ?? null,
            devBranch: (n == null ? void 0 : n.value) ?? null
        }
    }
    handleCookieChangeWithDebounce(e, t, n, s) {
        const o = this.debounceTimers.get(e);
        o && clearTimeout(o);
        const i = t ? null : this.normalizeValue(n),
            a = setTimeout(() => {
                const c = s.getCurrentValue();
                i !== c && ($.info(`Manus ${e} cookie changed (debounced)`, {
                    removed: t,
                    nextValue: i,
                    currentValue: c
                }), s.setValue(i).catch(l => {
                    $.error(`Failed to sync ${e} from cookie change`, {
                        removed: t,
                        error: l instanceof Error ? l.message : String(l)
                    })
                })), this.debounceTimers.delete(e)
            }, 500);
        this.debounceTimers.set(e, a)
    }
    normalizeValue(e) {
        if (typeof e != "string") return null;
        const t = e.trim();
        return t.length > 0 ? t : null
    }
}
const ve = new mn,
    P = T("CdpClient"),
    gn = "1.3",
    yn = 60 * 1e3,
    wn = 1920,
    bn = 1080;

function kn(r) {
    return r instanceof Error && r.isDebuggingError === !0
}
const q = new Map;
var xt;
(xt = chrome.debugger) == null || xt.onDetach.addListener((r, e) => {
    if (r.tabId) {
        const t = q.get(r.tabId);
        t && (P.warn(`Debugger detached from tab ${r.tabId}`, {
            reason: e
        }), t.detachTimer && clearTimeout(t.detachTimer), q.delete(r.tabId))
    }
});
async function D(r, e, t) {
    let n = await dt(r),
        s = 0;
    const o = 2;
    for (; s <= o;) try {
        const i = t != null && t.refreshViewport ? await Rt(n.session, n.viewport) : n.viewport,
            a = await e(n.session, i);
        return P.info(`Handler executed for tab ${r}, session remains active`), a
    } catch (i) {
        if (n.detachTimer && clearTimeout(n.detachTimer), await Xe(n.target).catch(() => {}), q.delete(r), s++, s > o) throw P.error(`CDP session failed after ${o+1} attempts for tab ${r}`), i;
        const a = kn(i) ? 1e3 : 500;
        await new Promise(c => setTimeout(c, a));
        try {
            n = await dt(r), P.info(`Created fresh CDP session for retry ${s} on tab ${r}`)
        } catch (c) {
            throw P.error(`Failed to create fresh CDP session for retry on tab ${r}`, {
                createError: c
            }), c
        }
    }
    throw new Error("Unexpected end of retry loop")
}
async function En(r, e, t = {}) {
    const {
        format: n = "png",
        quality: s,
        useOriginalResolution: o = !1
    } = t, i = await Rt(r, e), a = await An(r, i, n, s, o);
    return {
        dataUrl: a.dataUrl,
        width: a.dimensions.width,
        height: a.dimensions.height,
        originalWidth: a.originalDimensions.width,
        originalHeight: a.originalDimensions.height,
        scaleX: a.scaleX,
        scaleY: a.scaleY
    }
}
async function At(r) {
    const e = q.get(r);
    e && (e.detachTimer && clearTimeout(e.detachTimer), await Xe(e.target).catch(t => {
        P.warn(`Failed to detach CDP session during cleanup for tab ${r}`, {
            error: t
        })
    }), q.delete(r))
}
async function vn() {
    const r = Array.from(q.keys()).map(e => At(e));
    await Promise.all(r)
}
async function dt(r) {
    let e = q.get(r);
    if (e) return e.lastUsed = Date.now(), ht(r, e), e;
    P.info(`Creating new persistent CDP session for tab ${r}`);
    const t = await Sn(r),
        n = _n(t);
    await n.send("Page.enable");
    const s = await Tn(n);
    return e = {
        target: t,
        session: n,
        viewport: s,
        lastUsed: Date.now()
    }, q.set(r, e), ht(r, e), e
}

function ht(r, e) {
    e.detachTimer && clearTimeout(e.detachTimer), e.detachTimer = setTimeout(() => {
        P.info(`Detaching CDP session after inactivity timeout for tab ${r}`), Xe(e.target).catch(t => {
            P.warn(`Failed to detach CDP session for tab ${r}`, {
                error: t
            })
        }), q.delete(r)
    }, yn)
}
async function Sn(r) {
    const e = {
        tabId: r
    };
    return await new Promise((t, n) => {
        chrome.debugger.attach(e, gn, () => {
            if (chrome.runtime.lastError) {
                n(new Error(chrome.runtime.lastError.message));
                return
            }
            t()
        })
    }), e
}

function Xe(r) {
    return new Promise(e => {
        chrome.debugger.detach(r, () => {
            chrome.runtime.lastError && P.warn("Failed to detach debugger", {
                error: chrome.runtime.lastError.message,
                target: r
            }), e()
        })
    })
}

function _n(r) {
    return {
        send(e, t) {
            return new Promise((n, s) => {
                chrome.debugger.sendCommand(r, e, t, o => {
                    if (chrome.runtime.lastError) {
                        const i = new Error(chrome.runtime.lastError.message);
                        chrome.runtime.lastError.message && xn(chrome.runtime.lastError.message) && (i.isDebuggingError = !0), s(i);
                        return
                    }
                    n(o)
                })
            })
        }
    }
}

function xn(r) {
    const e = ["Debugger is not attached", "Target closed", "Inspector protocol error", "Detached while handling", "Cannot access contents of", "Target crashed", "Debugger session not found", "Connection lost"],
        t = r.toLowerCase();
    return e.some(n => t.includes(n.toLowerCase()))
}
async function Tn(r) {
    await r.send("Emulation.clearDeviceMetricsOverride").catch(() => {});
    const e = await Mt(r);
    return P.info("Initialized viewport using tab dimensions", {
        cssViewport: `${e.cssWidth}x${e.cssHeight}`,
        devicePixelRatio: e.devicePixelRatio
    }), e
}
async function Mt(r) {
    var u, d;
    const e = await r.send("Page.getLayoutMetrics"),
        t = await Cn(r),
        n = e.cssLayoutViewport ?? e.layoutViewport,
        s = e.visualViewport ?? n,
        o = me([s == null ? void 0 : s.clientWidth, n == null ? void 0 : n.clientWidth, (u = e.contentSize) == null ? void 0 : u.width], wn),
        i = me([s == null ? void 0 : s.clientHeight, n == null ? void 0 : n.clientHeight, (d = e.contentSize) == null ? void 0 : d.height], bn),
        a = me([t == null ? void 0 : t.width, o], o),
        c = me([t == null ? void 0 : t.height, i], i),
        l = (t == null ? void 0 : t.devicePixelRatio) ?? 1;
    return {
        cssWidth: a,
        cssHeight: c,
        devicePixelRatio: l
    }
}
async function Rt(r, e) {
    const t = await Mt(r);
    return e.cssWidth = t.cssWidth, e.cssHeight = t.cssHeight, e.devicePixelRatio = t.devicePixelRatio, e
}
async function Cn(r) {
    var e;
    try {
        const n = (e = (await r.send("Runtime.evaluate", {
            expression: "(() => ({ width: window.innerWidth || 0, height: window.innerHeight || 0, devicePixelRatio: window.devicePixelRatio || 1 }))()",
            returnByValue: !0,
            awaitPromise: !1
        })).result) == null ? void 0 : e.value;
        if (!n) return null;
        const s = Number(n.width),
            o = Number(n.height),
            i = Number(n.devicePixelRatio);
        return {
            width: Number.isFinite(s) && s > 0 ? Math.round(s) : void 0,
            height: Number.isFinite(o) && o > 0 ? Math.round(o) : void 0,
            devicePixelRatio: Number.isFinite(i) && i > 0 ? i : void 0
        }
    } catch (t) {
        return P.warn("Failed to evaluate viewport via Runtime.evaluate", {
            error: t instanceof Error ? t.message : t
        }), null
    }
}

function me(r, e) {
    for (const t of r) {
        const n = Number(t);
        if (Number.isFinite(n) && n > 0) return Math.round(n)
    }
    return e
}
async function An(r, e, t, n, s) {
    var it, at, ct;
    const o = await r.send("Page.getLayoutMetrics"),
        i = o.cssLayoutViewport ?? o.layoutViewport,
        a = o.visualViewport ?? i,
        c = ((it = o.visualViewport) == null ? void 0 : it.scale) ?? 1,
        l = Math.max(0, Math.round((a == null ? void 0 : a.pageX) ?? 0)),
        u = Math.max(0, Math.round((a == null ? void 0 : a.pageY) ?? 0)),
        d = Math.max(1, e.cssWidth),
        h = Math.max(1, e.cssHeight),
        m = Number((at = o.contentSize) == null ? void 0 : at.width),
        k = Number((ct = o.contentSize) == null ? void 0 : ct.height),
        v = Number.isFinite(m) && m > 0 ? Math.round(m) : d,
        g = Number.isFinite(k) && k > 0 ? Math.round(k) : h,
        w = Math.max(d, v),
        b = Math.max(h, g),
        M = Math.max(1, w - l),
        R = Math.max(1, b - u),
        O = Math.min(d, M),
        C = Math.min(h, R),
        H = Math.max(1, O),
        Z = Math.max(1, C),
        fe = {
            format: t,
            fromSurface: !0,
            clip: {
                x: l,
                y: u,
                width: H,
                height: Z,
                scale: 1 / c
            }
        };
    typeof n == "number" && (fe.quality = n);
    const {
        data: Ie
    } = await r.send("Page.captureScreenshot", fe), ee = `data:image/${t};base64,${Ie}`, L = await Rn(ee), te = Pn(H, Z, L.width, L.height);
    let ie = ee,
        ne = L.width,
        Y = L.height;
    try {
        s || (ie = await Ln(L.bitmap, te.width, te.height), ne = te.width, Y = te.height)
    } finally {
        L.bitmap.close()
    }
    const nt = Math.max(1, Math.round(H)),
        rt = Math.max(1, Math.round(Z)),
        st = ne / nt,
        ot = Y / rt;
    return P.debug("Captured viewport screenshot via CDP", {
        clipX: l,
        clipY: u,
        clipWidth: H,
        clipHeight: Z,
        cssWidth: nt,
        cssHeight: rt,
        devicePixelRatio: e.devicePixelRatio,
        originalWidth: L.width,
        originalHeight: L.height,
        finalWidth: ne,
        finalHeight: Y,
        scaleX: st,
        scaleY: ot,
        useOriginalResolution: s
    }), {
        dataUrl: ie,
        scaleX: st,
        scaleY: ot,
        dimensions: {
            width: ne,
            height: Y
        },
        originalDimensions: {
            width: L.width,
            height: L.height
        }
    }
}

function Mn(r) {
    if (!/^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(r)) return !1;
    const t = r.split(",")[1];
    try {
        return atob(t), !0
    } catch {
        return !1
    }
}
async function Rn(r) {
    if (!Mn(r)) throw new Error("Invalid base64 image format");
    try {
        const t = await (await fetch(r)).blob(),
            n = await createImageBitmap(t),
            s = Math.max(1, Math.round(n.width)),
            o = Math.max(1, Math.round(n.height));
        return {
            bitmap: n,
            width: s,
            height: o
        }
    } catch (e) {
        throw new Error(`Failed to decode screenshot: ${e instanceof Error?e.message:"Unknown error"}`)
    }
}

function Pn(r, e, t, n) {
    const s = Number.isFinite(r) && r > 0,
        o = Number.isFinite(e) && e > 0;
    if (s && o) return {
        width: Math.max(1, Math.round(r)),
        height: Math.max(1, Math.round(e))
    };
    if (s) {
        const i = Math.max(1, Math.round(r)),
            a = Math.max(1, Math.round(n * i / t));
        return {
            width: i,
            height: a
        }
    }
    if (o) {
        const i = Math.max(1, Math.round(e));
        return {
            width: Math.max(1, Math.round(t * i / n)),
            height: i
        }
    }
    return {
        width: t,
        height: n
    }
}
async function Ln(r, e, t) {
    try {
        const n = new OffscreenCanvas(e, t),
            s = n.getContext("2d");
        if (!s) throw new Error("Failed to get canvas context");
        s.imageSmoothingEnabled = !0, s.imageSmoothingQuality = "high", s.fillStyle = "white", s.fillRect(0, 0, e, t), s.drawImage(r, 0, 0, r.width, r.height, 0, 0, e, t);
        const o = await n.convertToBlob({
            type: "image/png"
        });
        return await In(o)
    } catch (n) {
        throw new Error(`Failed to resize screenshot: ${n instanceof Error?n.message:"Unknown error"}`)
    }
}

function In(r) {
    return new Promise((e, t) => {
        const n = new FileReader;
        n.onload = () => e(n.result), n.onerror = () => t(new Error("Failed to convert blob to data URL")), n.readAsDataURL(r)
    })
}
const Nn = T("ManusAppHelper"),
    On = 1e4;
class Bn {
    constructor() {
        this.suspendListener = null, this.pollTimer = null
    }
    registerManusAppPolling() {
        this.unregisterListeners(), this.notifyManusAppTabs(), this.pollTimer = setInterval(() => {
            this.notifyManusAppTabs()
        }, On), this.suspendListener = () => this.unregisterListeners(), chrome.runtime.onSuspend.addListener(this.suspendListener)
    }
    unregisterListeners() {
        this.suspendListener && (chrome.runtime.onSuspend.removeListener(this.suspendListener), this.suspendListener = null), this.pollTimer && (clearInterval(this.pollTimer), this.pollTimer = null)
    }
    async notifyManusAppTabs() {
        try {
            const t = (await chrome.tabs.query({})).filter(o => {
                if (!o.url || !o.id) return !1;
                try {
                    return ln(new URL(o.url).origin)
                } catch {
                    return !1
                }
            });
            if (t.length === 0) return;
            const [n, s] = await Promise.all([Me(), Promise.resolve(Q.getBrowserSettings())]);
            for (const o of t) try {
                await chrome.scripting.executeScript({
                    target: {
                        tabId: o.id
                    },
                    func: i => {
                        window.postMessage({
                            source: "my-browser",
                            type: "extension/ready",
                            data: i
                        }, "*")
                    },
                    args: [{
                        clientId: n,
                        browserSettings: s,
                        eventTimestamp: Date.now()
                    }]
                })
            } catch {}
        } catch (e) {
            Nn.warn("ManusAppManager: Failed to notify tabs", e)
        }
    }
}
const Dn = new Bn,
    ae = T("ContentHandler");
class Fn {
    constructor(e) {
        this.sessionManager = e
    }
    async handle(e, t) {
        var s;
        if (!un(e)) throw new Error("Invalid message type for ContentMessageHandler");
        const n = (s = t.tab) == null ? void 0 : s.id;
        if (!n) return ae.warn("No tabId in message sender"), {
            ok: !1,
            error: "No tabId found"
        };
        switch (e.type) {
            case "content/heartbeat":
                return this.handleHeartbeat(n);
            case "content/get-session-state":
                return this.handleGetSessionState(n);
            case "extension/stop-task":
            case "extension/unauthorize-task":
            case "extension/resume-task": {
                const o = this.sessionManager.getSession({
                    tabId: n
                });
                if (!o) return ae.warn("No session found for tabId", {
                    tabId: n
                }), {
                    ok: !1,
                    error: "Session not found"
                };
                const i = o.sessionId;
                switch (e.type) {
                    case "extension/stop-task":
                        return this.handleStopTask(i);
                    case "extension/unauthorize-task":
                        return this.handleUnauthorizeTask(i);
                    case "extension/resume-task":
                        return this.handleResumeTask(i, e.summary)
                }
            }
        }
    }
    async handleStopTask(e) {
        try {
            return await this.sessionManager.stopSession(e), {
                ok: !0
            }
        } catch (t) {
            const n = t instanceof Error ? t.message : String(t);
            return ae.error("Failed to stop task", {
                sessionId: e,
                errorMsg: n
            }), {
                ok: !1,
                error: n
            }
        }
    }
    async handleUnauthorizeTask(e) {
        try {
            return await this.sessionManager.unauthorizeSession(e), {
                ok: !0
            }
        } catch (t) {
            const n = t instanceof Error ? t.message : String(t);
            return ae.error("Failed to terminate task", {
                sessionId: e,
                errorMsg: n
            }), {
                ok: !1,
                error: n
            }
        }
    }
    async handleResumeTask(e, t) {
        try {
            return await this.sessionManager.resumeSession(e, t), {
                ok: !0
            }
        } catch (n) {
            const s = n instanceof Error ? n.message : String(n);
            return ae.error("Failed to resume task", {
                sessionId: e,
                errorMsg: s
            }), {
                ok: !1,
                error: s
            }
        }
    }
    handleHeartbeat(e) {
        return {
            ok: !0
        }
    }
    handleGetSessionState(e) {
        const t = this.sessionManager.getSession({
            tabId: e
        });
        if (!t) return {
            ok: !0,
            state: null
        };
        let n = null;
        return t.status === "running" ? n = "ongoing" : t.status === "takeover" && (n = "takeover"), {
            ok: !0,
            state: n
        }
    }
}
var Hn = Object.defineProperty,
    Je = (r, e, t, n) => {
        for (var s = void 0, o = r.length - 1, i; o >= 0; o--)(i = r[o]) && (s = i(e, t, s) || s);
        return s && Hn(e, t, s), s
    };
class Re {
    constructor() {
        this.sessions = new Map, this.pendingSessions = new Map, this.supportsTabGroups = null, Xt(this)
    }
}
Je([Ge], Re.prototype, "sessions");
Je([Ge], Re.prototype, "pendingSessions");
Je([Ge], Re.prototype, "supportsTabGroups");
const p = new Re,
    A = T("TabHelper"),
    $e = ["👆", "🖐️", "👋", "👍", "🖖", "🫰", "✌", "🤚", "🤟", "👉", "🤞", "👇", "☝", "🤙", "👈", "✊", "🤘"],
    Pt = "✅",
    Lt = "⌛️",
    $n = 1e3,
    Un = "Manus Task",
    zn = [...$e, Pt, Lt],
    pt = new RegExp(`^(${zn.map(r=>r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")})\\s+`);
class Kn {
    constructor() {
        A.info("TabManager initialized");
        const e = this.isTabGroupsSupported();
        A.info("TabGroups support detected", {
            supportsTabGroups: e
        }), chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this)), this.setupCleanupListeners()
    }
    handleTabRemoved(e) {
        if (!this.isTabGroupsSupported()) {
            for (const [t, n] of p.sessions.entries()) n.tabId === e && (A.warn("Session tab removed, cleaning up", {
                sessionId: t,
                tabId: e
            }), this.cleanupSession(t));
            return
        }
        for (const [t, n] of p.sessions.entries()) chrome.tabs.query({
            groupId: n.groupId
        }, s => {
            s.length === 0 && (A.warn("All tabs in session group removed, cleaning up", {
                sessionId: t
            }), this.cleanupSession(t))
        })
    }
    isTabGroupsSupported() {
        if (p.supportsTabGroups !== null) return p.supportsTabGroups;
        const e = typeof chrome.tabs < "u" && typeof chrome.tabs.group == "function" && typeof chrome.tabGroups < "u";
        return p.supportsTabGroups = e, e
    }
    setupCleanupListeners() {
        var e, t;
        try {
            (t = (e = chrome.tabGroups) == null ? void 0 : e.onRemoved) == null || t.addListener(n => {
                for (const [s, o] of p.sessions.entries()) o.groupId === n.id && (A.warn("Tab group removed, cleaning up session", {
                    sessionId: s,
                    groupId: n.id
                }), this.cleanupSession(s))
            })
        } catch {}
        chrome.windows.onRemoved.addListener(n => {
            for (const [s, o] of p.sessions.entries()) o.windowId === n && this.cleanupSession(s)
        })
    }
    async getTabForSession(e) {
        var s;
        const t = p.sessions.get(e);
        if (!t) throw new Error(`Session not found: ${e}`);
        if (!this.isTabGroupsSupported()) try {
            return await X(t.tabId), t.tabId
        } catch (o) {
            throw new Error(`Tab for session ${e} is no longer available: ${o instanceof Error?o.message:String(o)}`)
        }
        try {
            const o = await chrome.tabs.query({
                groupId: t.groupId
            });
            if (o.length > 0 && ((s = o[0]) == null ? void 0 : s.id) !== void 0) return await X(o[0].id), o[0].id
        } catch (o) {
            throw new Error(`Tab for session ${e} is no longer available: ${o instanceof Error?o.message:String(o)}`)
        }
        throw new Error(`No tabs found in group for session: ${e}`)
    }
    async ensureTabForSession(e, t) {
        var o;
        const n = this.isTabGroupsSupported(),
            s = p.sessions.get(e);
        if (s && s.tabId !== void 0) try {
            if (!n) return await X(s.tabId), s.tabId;
            const i = await chrome.tabs.query({
                groupId: s.groupId,
                windowId: s.windowId
            });
            if (i.length > 0 && ((o = i[0]) == null ? void 0 : o.id) !== void 0) return await X(i[0].id), i[0].id
        } catch (i) {
            A.warn("Session tab or group missing, recreating", {
                sessionId: e,
                error: i instanceof Error ? i.message : i
            }), this.cleanupSession(e)
        }
        if (!n) return await this.createUngroupedTab(e, t);
        try {
            const {
                tabId: i,
                groupId: a,
                windowId: c
            } = await this.createGroupedTab({
                url: t,
                title: e,
                color: "grey",
                pinned: !1,
                active: !1,
                collapsed: !1
            }), l = p.sessions.get(e);
            return l ? (l.tabId = i, l.groupId = a, l.windowId = c) : p.sessions.set(e, {
                sessionId: e,
                tabId: i,
                groupId: a,
                windowId: c,
                animationInterval: null,
                queue: Promise.resolve(),
                disposed: !1,
                status: "stopped"
            }), A.info("Created tab and group for session", {
                sessionId: e,
                tabId: i,
                groupId: a,
                windowId: c
            }), i
        } catch (i) {
            const a = i instanceof Error ? i.message : String(i);
            if (a.includes("Grouping is not supported by tabs")) return A.warn("TabGroups not supported, switching to simple tab mode", {
                sessionId: e,
                error: a
            }), p.supportsTabGroups = !1, await this.createUngroupedTab(e, t);
            throw A.error("Failed to create grouped tab", {
                sessionId: e,
                error: a
            }), i
        }
    }
    async setTaskState(e, t, n = {}) {
        const s = p.sessions.get(e);
        if (!s) {
            A.warn("Cannot update group task state: session not found", {
                sessionId: e,
                state: t
            });
            return
        }
        typeof n.taskName == "string" && n.taskName.trim().length > 0 && (s.taskName = n.taskName.trim());
        const o = s.taskName || await this.getTaskLabel(s) || Un;
        switch (t) {
            case "doing": {
                this.startTaskOngoingAnimation(s, o);
                break
            }
            case "completed": {
                this.stopTaskOngoingAnimation(s), await this.updateTitle(s, `${Pt} ${o}`);
                break
            }
            case "waiting": {
                this.stopTaskOngoingAnimation(s), await this.updateTitle(s, `${Lt} ${o}`);
                break
            }
            default: {
                this.stopTaskOngoingAnimation(s), await this.updateTitle(s, o);
                break
            }
        }
    }
    async cleanupSession(e) {
        const t = p.sessions.get(e);
        t && this.stopTaskOngoingAnimation(t)
    }
    async updateTitle(e, t) {
        if (this.isTabGroupsSupported()) try {
            await lt(e.groupId, {
                title: t
            })
        } catch (n) {
            A.warn("Failed to update tab group title", {
                sessionId: e.sessionId,
                groupId: e.groupId,
                error: n instanceof Error ? n.message : n
            })
        }
    }
    async getTaskLabel(e) {
        var t, n;
        if (!this.isTabGroupsSupported()) try {
            if (!e.tabId) return null;
            const s = await X(e.tabId);
            return ((t = s == null ? void 0 : s.title) == null ? void 0 : t.replace(pt, "").trim()) || null
        } catch {
            return null
        }
        try {
            const s = await nn(e.groupId);
            return ((n = s == null ? void 0 : s.title) == null ? void 0 : n.replace(pt, "").trim()) || null
        } catch {
            return null
        }
    }
    async createUngroupedTab(e, t) {
        const n = await ut({
            url: t,
            pinned: !1,
            active: !1
        });
        if (!n.id) throw new Error("Failed to create tab");
        try {
            const o = await chrome.tabs.query({
                pinned: !0
            });
            await rn(n.id, {
                index: o.length
            })
        } catch (o) {
            A.warn("Failed to move tab to leftmost position", {
                sessionId: e,
                tabId: n.id,
                error: o instanceof Error ? o.message : String(o)
            })
        }
        const s = p.sessions.get(e);
        return s ? (s.tabId = n.id, s.windowId = n.windowId) : p.sessions.set(e, {
            sessionId: e,
            tabId: n.id,
            windowId: n.windowId,
            animationInterval: null,
            queue: Promise.resolve(),
            disposed: !1,
            status: "stopped"
        }), A.info("Created tab for session (non-tabGroup mode)", {
            sessionId: e,
            tabId: n.id,
            windowId: n.windowId
        }), n.id
    }
    async createGroupedTab(e) {
        const {
            url: t,
            title: n,
            color: s = "grey",
            pinned: o = !1,
            active: i = !1,
            collapsed: a = !1,
            windowId: c
        } = e;
        let l, u;
        try {
            const d = await ut({
                url: t,
                pinned: o,
                active: i
            });
            l = d.id, u = d.windowId;
            const h = await sn({
                createProperties: {
                    windowId: c
                },
                tabIds: [l]
            });
            await lt(h, {
                title: n,
                collapsed: a,
                color: s
            });
            const m = await chrome.tabs.query({
                pinned: !0
            });
            return await on(h, {
                index: m.length
            }), {
                tabId: l,
                groupId: h,
                windowId: u
            }
        } catch (d) {
            if (l !== void 0) try {
                await chrome.tabs.remove(l)
            } catch (h) {
                A.error("Failed to cleanup orphaned tab", {
                    tabId: l,
                    error: h instanceof Error ? h.message : String(h)
                })
            }
            throw d
        }
    }
    startTaskOngoingAnimation(e, t) {
        this.stopTaskOngoingAnimation(e);
        let n = 0;
        const s = async () => {
            const o = $e[n];
            await this.updateTitle(e, `${o} ${t}`), n = (n + 1) % $e.length
        };
        s(), e.animationInterval = setInterval(() => {
            s()
        }, $n)
    }
    stopTaskOngoingAnimation(e) {
        e.animationInterval && (clearInterval(e.animationInterval), e.animationInterval = null)
    }
    async getOtherTabsInGroup(e, t) {
        const n = p.sessions.get(e);
        return !(n != null && n.groupId) || !this.isTabGroupsSupported() ? [] : (await chrome.tabs.query({
            groupId: n.groupId
        })).filter(o => o.id !== t).map(o => ({
            title: o.title ?? "",
            url: o.url ?? ""
        }))
    }
}
const K = new Kn,
    re = T("ManusAppHandler"),
    Wn = ["https://manus.im", "https://vida.butterfly-effect.dev"],
    qn = r => Wn.includes(r) || r.startsWith("http://localhost") || r.startsWith("http://127.0.0.1"),
    ge = r => r instanceof Error ? r.message : String(r);
class Vn {
    async handle(e, t) {
        if (!dn(e)) throw new Error("Invalid message type for ManusAppHandler");
        const n = t.url;
        if (!n) return re.warn("Message rejected: no sender URL"), this.reply(e.requestId, !1, "No sender URL");
        let s;
        try {
            s = new URL(n).origin
        } catch {
            return re.warn("Message rejected: invalid sender URL", {
                senderUrl: n
            }), this.reply(e.requestId, !1, "Invalid sender URL")
        }
        if (!qn(s)) return re.warn("Message rejected: origin not allowed", {
            origin: s
        }), this.reply(e.requestId, !1, "Origin not allowed");
        switch (e.type) {
            case "my-browser/ping":
                return this.ping(e.requestId);
            case "my-browser/switch-to-tab":
                return this.switchTab(e.sessionId, e.requestId);
            case "my-browser/set-browser-settings":
                return this.setSettings(e.browserSettings, e.requestId);
            default:
                return re.error("Unsupported message type from Manus App"), this.reply("unknown", !1, "Unsupported message type")
        }
    }
    async ping(e) {
        const t = Q.getBrowserSettings();
        return this.reply(e, !0, {
            browserSettings: t
        })
    }
    async switchTab(e, t) {
        try {
            const n = await K.getTabForSession(e);
            await chrome.tabs.update(n, {
                active: !0
            });
            const s = await chrome.tabs.get(n);
            return s.windowId && await chrome.windows.update(s.windowId, {
                focused: !0
            }), this.reply(t, !0)
        } catch (n) {
            return re.error("Failed to switch tab", {
                sessionId: e,
                error: ge(n)
            }), this.reply(t, !1, `Failed to switch tab: ${ge(n)}`)
        }
    }
    async setSettings(e, t) {
        try {
            return await Q.setBrowserSettings(e), this.reply(t, !0, {
                browserSettings: e
            })
        } catch (n) {
            return re.error("Failed to update browser settings", {
                error: ge(n)
            }), this.reply(t, !1, `Failed to update settings: ${ge(n)}`)
        }
    }
    async reply(e, t, n) {
        const s = await Me();
        return t ? {
            ok: t,
            source: "my-browser",
            requestId: e,
            data: {
                clientId: s,
                ...n
            }
        } : {
            ok: t,
            source: "my-browser",
            requestId: e,
            error: n,
            data: {
                clientId: s
            }
        }
    }
}
const ft = T("PopupHandler");
class Yn {
    constructor(e, t) {
        this.sessionManager = e, this.broadcastTabStatus = t
    }
    async handle(e) {
        if (!hn(e)) throw new Error("Invalid message type for PopupMessageHandler");
        switch (e.type) {
            case "popup/get-tab-status":
                return this.handleGetTabStatus();
            case "extension/unauthorize-task":
                return this.handleUnauthorizeTask(e.sessionId);
            default:
                throw new Error("Unhandled message type")
        }
    }
    async handleGetTabStatus() {
        var t;
        const e = await chrome.tabs.query({
            active: !0,
            currentWindow: !0
        });
        return (t = e[0]) != null && t.id ? this.broadcastTabStatus(e[0].id) : ft.warn("No active tab found for popup status request"), {
            ok: !0
        }
    }
    async handleUnauthorizeTask(e) {
        try {
            return await this.sessionManager.unauthorizeSession(e), {
                ok: !0
            }
        } catch (t) {
            const n = t instanceof Error ? t.message : String(t);
            return ft.error("Failed to unauthorize task", {
                sessionId: e,
                error: n
            }), {
                ok: !1,
                error: n
            }
        }
    }
}
const Gn = `(function() {
  "use strict";
  const CLICK_FLAG_ATTR_DEFAULT = "data-manus_clickable";
  const CLICK_ID_ATTR_DEFAULT = "data-manus_click_id";
  const VISIBILITY_THRESHOLD_DEFAULT = 0.5;
  const TARGET_SAMPLE_SPACING_DEFAULT = 5;
  const MAX_SAMPLE_GRID_DEFAULT = 8;
  const MIN_RENDERABLE_SIZE_DEFAULT = 1;
  function prepareArtifacts(params) {
    try {
      const clickFlagAttr = params.clickFlagAttr ?? CLICK_FLAG_ATTR_DEFAULT;
      const clickIdAttr = params.clickIdAttr ?? CLICK_ID_ATTR_DEFAULT;
      const visibilityThreshold = params.visibilityThreshold ?? VISIBILITY_THRESHOLD_DEFAULT;
      const targetSampleSpacing = params.targetSampleSpacing ?? TARGET_SAMPLE_SPACING_DEFAULT;
      const maxSampleGrid = params.maxSampleGrid ?? MAX_SAMPLE_GRID_DEFAULT;
      const minRenderableSize = params.minRenderableSize ?? MIN_RENDERABLE_SIZE_DEFAULT;
      const maxSamplePoints = maxSampleGrid * maxSampleGrid;
      const title = extractTitle();
      const markdown = extractSimpleContent();
      const markdownContent = \`# \${title}

\${markdown}\`;
      const viewport = window.visualViewport;
      const viewportWidth = (viewport == null ? void 0 : viewport.width) ?? window.innerWidth;
      const viewportHeight = (viewport == null ? void 0 : viewport.height) ?? window.innerHeight;
      const normalizeText = (value, limit = 150) => {
        if (!value) return "";
        const trimmed = value.replace(/\\s+/g, " ").trim();
        if (!trimmed) return "";
        if (trimmed.length > limit) return \`\${trimmed.slice(0, limit)}...\`;
        return trimmed;
      };
      const buildDescription = (el, tagName, text, inputType) => {
        const hints = [];
        const idValue = normalizeText(el.id, 60);
        if (idValue) hints.push(\`id:"\${idValue}"\`);
        const ariaLabel = normalizeText(el.getAttribute("aria-label") || el.title || "", 80);
        if (ariaLabel) hints.push(\`hint:"\${ariaLabel}"\`);
        const placeholder = normalizeText(el.getAttribute("placeholder") || "", 80);
        if (placeholder) hints.push(\`placeholder:"\${placeholder}"\`);
        const role = normalizeText(el.getAttribute("role") || "", 40);
        if (role) hints.push(\`role:"\${role}"\`);
        if (inputType) hints.push(\`type:"\${inputType}"\`);
        const hintText = hints.length ? \`{\${hints.join(",")}}\` : "{}";
        if (text) return \`\${tagName} \${hintText} \${text}\`.trim();
        return \`\${tagName} \${hintText}\`.trim();
      };
      const getPrimaryText = (el, tagName, inputType) => {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          if (el.value) return normalizeText(el.value);
          if (el.placeholder) return normalizeText(el.placeholder);
        }
        if (tagName === "option" && el instanceof HTMLOptionElement) {
          return normalizeText(el.innerText || el.textContent || "");
        }
        if (tagName === "select" && el instanceof HTMLSelectElement) {
          const options = Array.from(el.options || []).slice(0, 5);
          const optionTexts = options.map((opt, idx) => {
            const val = normalizeText(opt.textContent || "");
            if (!val) return null;
            return \`option#\${idx}:\${val}\`;
          }).filter(Boolean);
          if (optionTexts.length) return optionTexts.join(", ");
        }
        const text = normalizeText(el.innerText || el.textContent || "");
        if (text) return text;
        if (inputType === "submit" || inputType === "button") {
          return normalizeText(el.value || "submit");
        }
        return "";
      };
      const normalizeTagName = (el, tagName) => {
        var _a;
        if (el.getAttribute("contenteditable") === "true") return "textarea";
        const role = (_a = el.getAttribute("role")) == null ? void 0 : _a.toLowerCase();
        if (role === "textbox" || role === "searchbox") return "textarea";
        return tagName;
      };
      const hasRenderableSize = (rect) => rect.width > minRenderableSize && rect.height > minRenderableSize;
      const isElementVisuallyVisible = (el) => {
        const style = window.getComputedStyle(el);
        if (style.display === "none") return false;
        if (style.visibility === "hidden" || style.visibility === "collapse") return false;
        if (style.pointerEvents === "none") return false;
        const opacity = Number.parseFloat(style.opacity || "1");
        if (!Number.isNaN(opacity) && opacity <= 0) return false;
        return true;
      };
      const clipRectToViewport = (rect) => {
        const left = Math.max(rect.left, 0);
        const top = Math.max(rect.top, 0);
        const right = Math.min(rect.right, viewportWidth);
        const bottom = Math.min(rect.bottom, viewportHeight);
        const width = right - left;
        const height = bottom - top;
        if (width <= minRenderableSize || height <= minRenderableSize) return null;
        return { left, top, width, height };
      };
      const buildSamplePoints = (rect) => {
        const cols = Math.min(maxSampleGrid, Math.max(1, Math.round(rect.width / targetSampleSpacing)));
        const rows = Math.min(maxSampleGrid, Math.max(1, Math.round(rect.height / targetSampleSpacing)));
        const stepX = rect.width / cols;
        const stepY = rect.height / rows;
        const points = [];
        for (let row = 0; row < rows; row += 1) {
          for (let col = 0; col < cols; col += 1) {
            const x = rect.left + stepX * (col + 0.5);
            const y = rect.top + stepY * (row + 0.5);
            points.push({ x, y });
            if (points.length >= maxSamplePoints) return points;
          }
        }
        return points;
      };
      const getTopElementAtPoint = (x, y) => {
        const element = document.elementFromPoint(x, y);
        if (!element) return null;
        if (element.shadowRoot) return element.shadowRoot.elementFromPoint(x, y) || element;
        return element;
      };
      const isDescendantOf = (node, target) => {
        if (node === target) return true;
        if (target.contains(node)) return true;
        const visited = /* @__PURE__ */ new Set();
        let current = node;
        while (current && !visited.has(current)) {
          if (current === target) return true;
          visited.add(current);
          if (current.parentElement) {
            current = current.parentElement;
            continue;
          }
          const root = current.getRootNode();
          if (root instanceof ShadowRoot) {
            current = root.host;
          } else {
            current = null;
          }
        }
        return false;
      };
      const computeVisibilityRatio = (element, rect) => {
        const samplePoints = buildSamplePoints(rect);
        if (!samplePoints.length) return 1;
        let visibleCount = 0;
        for (const point of samplePoints) {
          const top = getTopElementAtPoint(point.x, point.y);
          if (!top) continue;
          if (top === element || isDescendantOf(top, element)) visibleCount += 1;
        }
        return visibleCount / samplePoints.length;
      };
      document.querySelectorAll(\`[\${clickIdAttr}]\`).forEach((el) => {
        el.removeAttribute(clickIdAttr);
      });
      const markedElements = document.querySelectorAll(\`[\${clickFlagAttr}]\`);
      const elementRects = [];
      const elements = [];
      let index = 1;
      for (const el of markedElements) {
        const rect = el.getBoundingClientRect();
        if (!hasRenderableSize(rect)) continue;
        if (!isElementVisuallyVisible(el)) continue;
        const clippedRect = clipRectToViewport(rect);
        if (!clippedRect) continue;
        const visibilityRatio = computeVisibilityRatio(el, clippedRect);
        if (visibilityRatio < visibilityThreshold) continue;
        const rawTagName = el.tagName.toLowerCase();
        const tagName = normalizeTagName(el, rawTagName);
        const inputTypeRaw = rawTagName === "input" ? el.getAttribute("type") || "text" : null;
        const inputType = inputTypeRaw ? inputTypeRaw.toLowerCase() : void 0;
        const text = getPrimaryText(el, rawTagName, inputType ?? null);
        const description = buildDescription(el, tagName, text, inputType ?? null);
        el.setAttribute(clickIdAttr, String(index));
        elementRects.push({
          index,
          tagName,
          inputType,
          x: clippedRect.left,
          y: clippedRect.top,
          width: clippedRect.width,
          height: clippedRect.height
        });
        elements.push({
          index,
          description
        });
        index += 1;
      }
      return {
        ok: true,
        markdownContent,
        highlightCount: elementRects.length,
        elements,
        elementRects
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        elements: []
      };
    }
  }
  function extractTitle() {
    var _a;
    const ogTitle = (_a = document.querySelector('meta[property="og:title"]')) == null ? void 0 : _a.getAttribute("content");
    if (ogTitle) return ogTitle.trim();
    if (document.title) return document.title.trim();
    const h1 = document.querySelector("h1");
    if (h1 == null ? void 0 : h1.textContent) return h1.textContent.trim();
    return "";
  }
  function extractSimpleContent() {
    const mainSelectors = ["main", "article", '[role="main"]', "#content", ".content", "#main", ".main"];
    for (const selector of mainSelectors) {
      const el = document.querySelector(selector);
      if (el instanceof HTMLElement && el.innerText.length > 100) {
        return cleanText(el.innerText);
      }
    }
    return cleanText(document.body.innerText);
  }
  function cleanText(text) {
    return text.replace(/\\t/g, " ").replace(/[ ]{2,}/g, " ").replace(/\\n{3,}/g, "\\n\\n").trim();
  }
  return prepareArtifacts;
}())`,
    se = r => new Promise(e => setTimeout(e, r));

function W(r) {
    return r instanceof Error ? r.message : String(r)
}

function mt(r) {
    return r instanceof Error ? r.stack : void 0
}

function Xn(r, e, t = !1, n = !1) {
    const s = new globalThis.TextEncoder,
        o = s.encode(r);
    if (o.length <= e) return r;
    const i = o.length - e,
        a = n ? `...${i} bytes truncated...` : "...";
    if (t) {
        let u = 0,
            d = r.length;
        for (; d > 0 && u < e;) d -= 1, u += s.encode(r[d]).length;
        return u > e && (d += 1), a + r.slice(d)
    }
    let c = 0,
        l = 0;
    for (; l < r.length && c < e;) c += s.encode(r[l]).length, l += 1;
    return c > e && (l -= 1), r.slice(0, l) + a
}
const Jn = `(function() {
  "use strict";
  function describeElement(element) {
    var _a;
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName,
      id: element.id,
      classes: Array.from(element.classList),
      textContent: ((_a = element.textContent) == null ? void 0 : _a.slice(0, 100)) ?? null,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    };
  }
  function getElementFromPoint(x, y, root, stack) {
    const currentRoot = root ?? document;
    const visited = stack ?? [];
    const elements = currentRoot.elementsFromPoint ? currentRoot.elementsFromPoint(x, y) : [currentRoot.elementFromPoint(x, y)].filter(Boolean);
    const element = elements.find((el) => {
      if (!el || visited.includes(el)) return false;
      const id = el.id || "";
      const classes = typeof el.className === "string" ? el.className : "";
      return !id.includes("manus-action") && !classes.includes("manus-action") && !id.includes("monica-action") && !classes.includes("monica-action");
    }) || null;
    if (!element) {
      return null;
    }
    visited.push(element);
    if (element.shadowRoot) {
      return getElementFromPoint(x, y, element.shadowRoot, visited);
    }
    return element;
  }
  function denormalizeCoordinates(originalWidth, originalHeight, originalX, originalY) {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const normalizedX = originalX / originalWidth;
    const normalizedY = originalY / originalHeight;
    const x = Math.round(normalizedX * currentWidth);
    const y = Math.round(normalizedY * currentHeight);
    return { x, y };
  }
  function resolveTarget(target) {
    switch (target.strategy) {
      case "bySelector":
        return document.querySelector(target.selector);
      case "byIndex":
        return document.querySelector(\`[data-manus_click_id="\${target.index}"]\`);
      case "byCoordinates": {
        let x = target.coordinateX;
        let y = target.coordinateY;
        if (target.viewportWidth && target.viewportHeight) {
          const denormalized = denormalizeCoordinates(target.viewportWidth, target.viewportHeight, x, y);
          x = denormalized.x;
          y = denormalized.y;
        }
        return getElementFromPoint(x, y);
      }
      default:
        return null;
    }
  }
  function click(params) {
    const element = resolveTarget(params.target);
    if (!element || !(element instanceof HTMLElement)) {
      return {
        success: false,
        error: "Target element not found for click action."
      };
    }
    element.scrollIntoView({
      block: "center",
      inline: "center",
      behavior: "auto"
    });
    element.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
    return {
      success: true,
      message: "Click action executed",
      data: describeElement(element)
    };
  }
  return click;
}())`,
    jn = `(function() {
  "use strict";
  function clickEffect(params) {
    try {
      const { x, y } = params;
      const size = 36;
      const ripple = document.createElement("div");
      ripple.id = "manus-action-click-effect";
      ripple.style.cssText = \`
      position: fixed;
      left: \${x - size / 2}px;
      top: \${y - size / 2}px;
      width: \${size}px;
      height: \${size}px;
      background-color: rgba(0, 129, 242, 0.5);
      border-radius: 50%;
      pointer-events: none;
      z-index: 2147483647;
      animation: manus-action-ripple-effect 1.5s ease-out forwards;
    \`;
      const styleId = "manus-action-click-effect-style";
      let style = document.getElementById(styleId);
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        style.textContent = \`
        @keyframes manus-action-ripple-effect {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          20% {
            transform: scale(1);
            opacity: 0.8;
          }
          80% {
            transform: scale(1.2);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      \`;
        document.head.appendChild(style);
      }
      document.body.appendChild(ripple);
      ripple.addEventListener("animationend", () => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      });
      return {
        success: true,
        message: \`Click effect shown at (\${x}, \${y})\`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  return clickEffect;
}())`,
    Qn = `(function() {
  "use strict";
  function findKeywordInPage(text, keyword) {
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    const sentences = [];
    for (const segment of segmenter.segment(text)) {
      const cleanSentence = segment.segment.replace(/\\s+/g, " ").replace(/\\n+/g, " ").trim();
      if (cleanSentence.length > 0) {
        sentences.push(cleanSentence);
      }
    }
    const escapedKeyword = keyword.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");
    const hasCJK = /[\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff\\u3040-\\u309f\\u30a0-\\u30ff]/.test(keyword);
    const regex = hasCJK ? new RegExp(escapedKeyword, "ui") : new RegExp(\`(?<!\\\\p{L})\${escapedKeyword}(?!\\\\p{L})\`, "ui");
    const matchingSentenceIndices = [];
    sentences.forEach((sentence, index) => {
      if (regex.test(sentence)) {
        matchingSentenceIndices.push(index);
      }
    });
    const minWordCount = 20;
    const mergedResults = [];
    const sortedIndices = [...matchingSentenceIndices].sort((a, b) => a - b);
    if (sortedIndices.length === 0) {
      return mergedResults;
    }
    const countWords = (sentence) => sentence.trim().split(/\\s+/).length;
    const getContextRange = (centerIndex) => {
      let start = centerIndex;
      let end = centerIndex;
      let wordCount = countWords(sentences[centerIndex] || "");
      while (wordCount < minWordCount && (start > 0 || end < sentences.length - 1)) {
        if (start > 0) {
          start--;
          wordCount += countWords(sentences[start] || "");
        }
        if (end < sentences.length - 1 && wordCount < minWordCount) {
          end++;
          wordCount += countWords(sentences[end] || "");
        }
      }
      return { start, end };
    };
    const firstIndex = sortedIndices[0];
    if (firstIndex === void 0) {
      return mergedResults;
    }
    const currentRange = getContextRange(firstIndex);
    let currentStart = currentRange.start;
    let currentEnd = currentRange.end;
    for (let i = 1; i < sortedIndices.length; i++) {
      const currentIndex = sortedIndices[i];
      if (currentIndex === void 0) continue;
      const nextRange = getContextRange(currentIndex);
      const nextStart = nextRange.start;
      const nextEnd = nextRange.end;
      if (nextStart <= currentEnd + 1) {
        currentEnd = nextEnd;
      } else {
        const contextBlock = sentences.slice(currentStart, currentEnd + 1).join(". ").replace(/\\.\\s*\\./g, ".");
        mergedResults.push(contextBlock);
        currentStart = nextStart;
        currentEnd = nextEnd;
      }
    }
    const finalContextBlock = sentences.slice(currentStart, currentEnd + 1).join(". ").replace(/\\.\\s*\\./g, ".");
    mergedResults.push(finalContextBlock);
    return mergedResults;
  }
  function findKeyword(params) {
    const { keyword } = params;
    try {
      const trimmedKeyword = keyword.trim();
      if (!trimmedKeyword) {
        return { success: false, error: "Keyword cannot be empty" };
      }
      const results = findKeywordInPage(document.body.innerText, trimmedKeyword);
      if (!results || results.length === 0) {
        return {
          success: false,
          error: \`No text found containing "\${trimmedKeyword}" on the current page\`
        };
      }
      const totalMatches = results.length;
      const message = [
        \`Attempted to find keyword, found \${totalMatches} occurrences of "\${trimmedKeyword}"\`,
        "[Search results]",
        ...results
      ].join("\\n");
      return {
        success: true,
        message,
        data: {
          results,
          totalMatches
        }
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return { success: false, error: reason };
    }
  }
  return findKeyword;
}())`,
    Zn = `(function() {
  "use strict";
  function describeElement(element) {
    var _a;
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName,
      id: element.id,
      classes: Array.from(element.classList),
      textContent: ((_a = element.textContent) == null ? void 0 : _a.slice(0, 100)) ?? null,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    };
  }
  function getElementFromPoint(x, y, root, stack) {
    const currentRoot = root ?? document;
    const visited = stack ?? [];
    const elements = currentRoot.elementsFromPoint ? currentRoot.elementsFromPoint(x, y) : [currentRoot.elementFromPoint(x, y)].filter(Boolean);
    const element = elements.find((el) => {
      if (!el || visited.includes(el)) return false;
      const id = el.id || "";
      const classes = typeof el.className === "string" ? el.className : "";
      return !id.includes("manus-action") && !classes.includes("manus-action") && !id.includes("monica-action") && !classes.includes("monica-action");
    }) || null;
    if (!element) {
      return null;
    }
    visited.push(element);
    if (element.shadowRoot) {
      return getElementFromPoint(x, y, element.shadowRoot, visited);
    }
    return element;
  }
  function denormalizeCoordinates(originalWidth, originalHeight, originalX, originalY) {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const normalizedX = originalX / originalWidth;
    const normalizedY = originalY / originalHeight;
    const x = Math.round(normalizedX * currentWidth);
    const y = Math.round(normalizedY * currentHeight);
    return { x, y };
  }
  function resolveTarget(target) {
    switch (target.strategy) {
      case "bySelector":
        return document.querySelector(target.selector);
      case "byIndex":
        return document.querySelector(\`[data-manus_click_id="\${target.index}"]\`);
      case "byCoordinates": {
        let x = target.coordinateX;
        let y = target.coordinateY;
        if (target.viewportWidth && target.viewportHeight) {
          const denormalized = denormalizeCoordinates(target.viewportWidth, target.viewportHeight, x, y);
          x = denormalized.x;
          y = denormalized.y;
        }
        return getElementFromPoint(x, y);
      }
      default:
        return null;
    }
  }
  function getElementPosition(params) {
    const element = resolveTarget(params.target);
    if (!element || !(element instanceof HTMLElement)) {
      return {
        success: false,
        error: "Target element not found for getElementPosition."
      };
    }
    element.scrollIntoView({
      block: "center",
      inline: "center",
      behavior: "auto"
    });
    const rect = element.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    return {
      success: true,
      message: "Element position retrieved",
      data: {
        x,
        y,
        element: describeElement(element)
      }
    };
  }
  return getElementPosition;
}())`,
    er = `(function() {
  "use strict";
  const MODIFIER_KEYS = /* @__PURE__ */ new Set(["ctrl", "control", "shift", "alt", "meta", "cmd", "command"]);
  const KEY_TO_CODE_MAP = {
    ...Object.fromEntries(
      Array.from({ length: 26 }, (_, i) => {
        const char = String.fromCharCode(97 + i);
        return [char, \`Key\${char.toUpperCase()}\`];
      })
    ),
    ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), \`Digit\${i}\`])),
    ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [\`f\${i + 1}\`, \`F\${i + 1}\`])),
    enter: "Enter",
    return: "Enter",
    tab: "Tab",
    escape: "Escape",
    esc: "Escape",
    space: "Space",
    " ": "Space",
    backspace: "Backspace",
    delete: "Delete",
    del: "Delete",
    arrowup: "ArrowUp",
    arrowdown: "ArrowDown",
    arrowleft: "ArrowLeft",
    arrowright: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    home: "Home",
    end: "End",
    pageup: "PageUp",
    pagedown: "PageDown",
    shift: "ShiftLeft",
    ctrl: "ControlLeft",
    control: "ControlLeft",
    alt: "AltLeft",
    meta: "MetaLeft",
    cmd: "MetaLeft",
    command: "MetaLeft"
  };
  const KEY_TO_KEYCODE_MAP = {
    ...Object.fromEntries(
      Array.from({ length: 26 }, (_, i) => {
        const char = String.fromCharCode(97 + i);
        return [char, 65 + i];
      })
    ),
    ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), 48 + i])),
    ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [\`f\${i + 1}\`, 112 + i])),
    enter: 13,
    return: 13,
    tab: 9,
    escape: 27,
    esc: 27,
    space: 32,
    " ": 32,
    backspace: 8,
    delete: 46,
    del: 46,
    arrowup: 38,
    arrowdown: 40,
    arrowleft: 37,
    arrowright: 39,
    up: 38,
    down: 40,
    left: 37,
    right: 39,
    home: 36,
    end: 35,
    pageup: 33,
    pagedown: 34,
    shift: 16,
    ctrl: 17,
    control: 17,
    alt: 18,
    meta: 91,
    cmd: 91,
    command: 91
  };
  function getCode(key) {
    const normalizedKey = key.toLowerCase();
    return KEY_TO_CODE_MAP[normalizedKey] ?? key;
  }
  function getKeyCode(key) {
    const normalizedKey = key.toLowerCase();
    return KEY_TO_KEYCODE_MAP[normalizedKey] ?? 0;
  }
  function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  function parseKeyString(keyString) {
    const parts = keyString.split("+").map((part) => part.trim());
    const config = {
      key: "",
      code: "",
      keyCode: 0,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false
    };
    for (const part of parts) {
      const lowerPart = part.toLowerCase();
      if (MODIFIER_KEYS.has(lowerPart)) {
        if (lowerPart === "ctrl" || lowerPart === "control") {
          config.ctrlKey = true;
        } else if (lowerPart === "shift") {
          config.shiftKey = true;
        } else if (lowerPart === "alt") {
          config.altKey = true;
        } else if (lowerPart === "meta" || lowerPart === "cmd" || lowerPart === "command") {
          config.metaKey = true;
        }
      } else {
        config.key = part.length === 1 ? part : capitalizeFirstLetter(lowerPart);
        config.code = getCode(part);
        config.keyCode = getKeyCode(part);
      }
    }
    return config;
  }
  function dispatchKeyboardEvents(element, config) {
    const eventOptions = {
      key: config.key,
      code: config.code,
      keyCode: config.keyCode,
      which: config.keyCode,
      ctrlKey: config.ctrlKey,
      shiftKey: config.shiftKey,
      altKey: config.altKey,
      metaKey: config.metaKey,
      bubbles: true,
      cancelable: true,
      view: window
    };
    element.dispatchEvent(new KeyboardEvent("keydown", eventOptions));
    const isPrintable = config.key.length === 1 && !config.ctrlKey && !config.metaKey;
    if (isPrintable) {
      element.dispatchEvent(new KeyboardEvent("keypress", eventOptions));
    }
    element.dispatchEvent(new KeyboardEvent("keyup", eventOptions));
  }
  function getElementFromPoint(x, y, root, stack) {
    const currentRoot = root ?? document;
    const visited = stack ?? [];
    const elements = currentRoot.elementsFromPoint ? currentRoot.elementsFromPoint(x, y) : [currentRoot.elementFromPoint(x, y)].filter(Boolean);
    const element = elements.find((el) => {
      if (!el || visited.includes(el)) return false;
      const id = el.id || "";
      const classes = typeof el.className === "string" ? el.className : "";
      return !id.includes("manus-action") && !classes.includes("manus-action") && !id.includes("monica-action") && !classes.includes("monica-action");
    }) || null;
    if (!element) {
      return null;
    }
    visited.push(element);
    if (element.shadowRoot) {
      return getElementFromPoint(x, y, element.shadowRoot, visited);
    }
    return element;
  }
  function denormalizeCoordinates(originalWidth, originalHeight, originalX, originalY) {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const normalizedX = originalX / originalWidth;
    const normalizedY = originalY / originalHeight;
    const x = Math.round(normalizedX * currentWidth);
    const y = Math.round(normalizedY * currentHeight);
    return { x, y };
  }
  function resolveTarget(target) {
    switch (target.strategy) {
      case "bySelector":
        return document.querySelector(target.selector);
      case "byIndex":
        return document.querySelector(\`[data-manus_click_id="\${target.index}"]\`);
      case "byCoordinates": {
        let x = target.coordinateX;
        let y = target.coordinateY;
        if (target.viewportWidth && target.viewportHeight) {
          const denormalized = denormalizeCoordinates(target.viewportWidth, target.viewportHeight, x, y);
          x = denormalized.x;
          y = denormalized.y;
        }
        return getElementFromPoint(x, y);
      }
      default:
        return null;
    }
  }
  function isRichTextEditor(element) {
    const hasDraftEditorClass = Array.from(element.classList).some((cls) => cls.includes("DraftEditor"));
    if (hasDraftEditorClass || element.hasAttribute("data-contents")) {
      return true;
    }
    if (element.closest(".DraftEditor-root")) {
      return true;
    }
    return false;
  }
  function input(params) {
    var _a;
    const { target, text, pressEnter = false } = params;
    const element = resolveTarget(target);
    if (!element || !(element instanceof HTMLElement)) {
      return {
        success: false,
        error: "Target element not found for input action."
      };
    }
    const inputElement = element;
    const hasValueProperty = "value" in inputElement;
    if (hasValueProperty) {
      const nativeInputValueSetter = (_a = Object.getOwnPropertyDescriptor(
        inputElement instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        "value"
      )) == null ? void 0 : _a.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(inputElement, text);
      } else {
        inputElement.value = text;
      }
      inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      inputElement.focus();
      try {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(inputElement);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch {
      }
      if (isRichTextEditor(inputElement)) {
        if (inputElement.textContent) {
          document.execCommand("delete", false);
        }
        const insertSuccess = document.execCommand("insertText", false, text);
        if (!insertSuccess) {
          inputElement.textContent = text;
          inputElement.dispatchEvent(
            new InputEvent("beforeinput", {
              bubbles: true,
              cancelable: true,
              inputType: "insertText",
              data: text
            })
          );
          inputElement.dispatchEvent(
            new InputEvent("input", {
              bubbles: true,
              cancelable: false,
              inputType: "insertText",
              data: text
            })
          );
        }
      } else {
        inputElement.textContent = text;
        inputElement.dispatchEvent(
          new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "insertText",
            data: text
          })
        );
        inputElement.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            cancelable: false,
            inputType: "insertText",
            data: text
          })
        );
      }
    }
    inputElement.dispatchEvent(new Event("change", { bubbles: true }));
    if (pressEnter) {
      const config = parseKeyString("Enter");
      dispatchKeyboardEvents(inputElement, config);
    }
    return {
      success: true,
      message: "Input action executed",
      data: {
        textLength: text.length
      }
    };
  }
  return input;
}())`,
    tr = `(function() {
  "use strict";
  const MODIFIER_KEYS = /* @__PURE__ */ new Set(["ctrl", "control", "shift", "alt", "meta", "cmd", "command"]);
  const KEY_TO_CODE_MAP = {
    ...Object.fromEntries(
      Array.from({ length: 26 }, (_, i) => {
        const char = String.fromCharCode(97 + i);
        return [char, \`Key\${char.toUpperCase()}\`];
      })
    ),
    ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), \`Digit\${i}\`])),
    ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [\`f\${i + 1}\`, \`F\${i + 1}\`])),
    enter: "Enter",
    return: "Enter",
    tab: "Tab",
    escape: "Escape",
    esc: "Escape",
    space: "Space",
    " ": "Space",
    backspace: "Backspace",
    delete: "Delete",
    del: "Delete",
    arrowup: "ArrowUp",
    arrowdown: "ArrowDown",
    arrowleft: "ArrowLeft",
    arrowright: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    home: "Home",
    end: "End",
    pageup: "PageUp",
    pagedown: "PageDown",
    shift: "ShiftLeft",
    ctrl: "ControlLeft",
    control: "ControlLeft",
    alt: "AltLeft",
    meta: "MetaLeft",
    cmd: "MetaLeft",
    command: "MetaLeft"
  };
  const KEY_TO_KEYCODE_MAP = {
    ...Object.fromEntries(
      Array.from({ length: 26 }, (_, i) => {
        const char = String.fromCharCode(97 + i);
        return [char, 65 + i];
      })
    ),
    ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [String(i), 48 + i])),
    ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [\`f\${i + 1}\`, 112 + i])),
    enter: 13,
    return: 13,
    tab: 9,
    escape: 27,
    esc: 27,
    space: 32,
    " ": 32,
    backspace: 8,
    delete: 46,
    del: 46,
    arrowup: 38,
    arrowdown: 40,
    arrowleft: 37,
    arrowright: 39,
    up: 38,
    down: 40,
    left: 37,
    right: 39,
    home: 36,
    end: 35,
    pageup: 33,
    pagedown: 34,
    shift: 16,
    ctrl: 17,
    control: 17,
    alt: 18,
    meta: 91,
    cmd: 91,
    command: 91
  };
  function getCode(key) {
    const normalizedKey = key.toLowerCase();
    return KEY_TO_CODE_MAP[normalizedKey] ?? key;
  }
  function getKeyCode(key) {
    const normalizedKey = key.toLowerCase();
    return KEY_TO_KEYCODE_MAP[normalizedKey] ?? 0;
  }
  function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  function parseKeyString(keyString) {
    const parts = keyString.split("+").map((part) => part.trim());
    const config = {
      key: "",
      code: "",
      keyCode: 0,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false
    };
    for (const part of parts) {
      const lowerPart = part.toLowerCase();
      if (MODIFIER_KEYS.has(lowerPart)) {
        if (lowerPart === "ctrl" || lowerPart === "control") {
          config.ctrlKey = true;
        } else if (lowerPart === "shift") {
          config.shiftKey = true;
        } else if (lowerPart === "alt") {
          config.altKey = true;
        } else if (lowerPart === "meta" || lowerPart === "cmd" || lowerPart === "command") {
          config.metaKey = true;
        }
      } else {
        config.key = part.length === 1 ? part : capitalizeFirstLetter(lowerPart);
        config.code = getCode(part);
        config.keyCode = getKeyCode(part);
      }
    }
    return config;
  }
  function dispatchKeyboardEvents(element, config) {
    const eventOptions = {
      key: config.key,
      code: config.code,
      keyCode: config.keyCode,
      which: config.keyCode,
      ctrlKey: config.ctrlKey,
      shiftKey: config.shiftKey,
      altKey: config.altKey,
      metaKey: config.metaKey,
      bubbles: true,
      cancelable: true,
      view: window
    };
    element.dispatchEvent(new KeyboardEvent("keydown", eventOptions));
    const isPrintable = config.key.length === 1 && !config.ctrlKey && !config.metaKey;
    if (isPrintable) {
      element.dispatchEvent(new KeyboardEvent("keypress", eventOptions));
    }
    element.dispatchEvent(new KeyboardEvent("keyup", eventOptions));
  }
  function pressKey(params) {
    const { key } = params;
    if (!key || !key.trim()) {
      return { success: false, error: "Key string cannot be empty" };
    }
    const config = parseKeyString(key);
    if (!config.key) {
      return { success: false, error: \`Failed to parse key string: "\${key}"\` };
    }
    const element = document.activeElement ?? document.body;
    dispatchKeyboardEvents(element, config);
    const modifiers = [];
    if (config.ctrlKey) modifiers.push("Ctrl");
    if (config.shiftKey) modifiers.push("Shift");
    if (config.altKey) modifiers.push("Alt");
    if (config.metaKey) modifiers.push("Meta");
    const keyDescription = modifiers.length > 0 ? \`\${modifiers.join("+")}+\${config.key}\` : config.key;
    return {
      success: true,
      message: \`Pressed key: \${keyDescription}\`
    };
  }
  return pressKey;
}())`,
    nr = `(function() {
  "use strict";
  const MAX_ELEMENTS_TO_CHECK = 500;
  const MAX_SCROLLABLE_CONTAINERS = 10;
  const MIN_CONTAINER_SIZE = 100;
  const MAX_TOTAL_TIME_MS = 2e3;
  const MAX_DOM_TRAVERSE_DEPTH = 80;
  function getAxisFromDirection(direction) {
    return direction === "left" || direction === "right" ? "x" : "y";
  }
  function calculateScrollDelta(axis) {
    const viewportSize = axis === "y" ? window.innerHeight : window.innerWidth;
    return Math.max(120, Math.round(viewportSize * 0.6));
  }
  function isScrollableContainer(el, axis) {
    const clientSize = axis === "y" ? el.clientHeight : el.clientWidth;
    const scrollSize = axis === "y" ? el.scrollHeight : el.scrollWidth;
    if (clientSize < MIN_CONTAINER_SIZE) return false;
    if (scrollSize <= clientSize) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const overflow = axis === "y" ? style.overflowY : style.overflowX;
    return ["auto", "scroll", "overlay"].includes(overflow);
  }
  function findScrollableContainers(axis, startTime) {
    const containers = [];
    let elementsChecked = 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        const el = node;
        if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "NOSCRIPT") {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let currentNode = walker.nextNode();
    while (currentNode) {
      if (Date.now() - startTime > MAX_TOTAL_TIME_MS) break;
      if (elementsChecked >= MAX_ELEMENTS_TO_CHECK) break;
      if (containers.length >= MAX_SCROLLABLE_CONTAINERS) break;
      const el = currentNode;
      elementsChecked++;
      if (isScrollableContainer(el, axis)) {
        containers.push(el);
      }
      currentNode = walker.nextNode();
    }
    containers.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight);
    return containers;
  }
  function scrollByWindow(axis, direction, toEnd) {
    const scrollOptions = { behavior: "auto" };
    const amount = axis === "y" ? window.innerHeight : window.innerWidth;
    const currentPos = axis === "y" ? window.scrollY : window.scrollX;
    if (direction === "up" || direction === "left") {
      const targetPos = toEnd ? 0 : Math.max(currentPos - amount, 0);
      if (axis === "y") {
        scrollOptions.top = targetPos;
      } else {
        scrollOptions.left = targetPos;
      }
    } else {
      const maxSize = axis === "y" ? Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) : Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
      const targetPos = toEnd ? maxSize : currentPos + amount;
      if (axis === "y") {
        scrollOptions.top = targetPos;
      } else {
        scrollOptions.left = targetPos;
      }
    }
    window.scrollTo(scrollOptions);
  }
  function scrollByElement(element, axis, direction, toEnd) {
    if (!element) return;
    const scrollOptions = { behavior: "auto" };
    const amount = axis === "y" ? element.clientHeight : element.clientWidth;
    const currentPos = axis === "y" ? element.scrollTop : element.scrollLeft;
    if (direction === "up" || direction === "left") {
      const targetPos = toEnd ? 0 : Math.max(currentPos - amount, 0);
      if (axis === "y") {
        scrollOptions.top = targetPos;
      } else {
        scrollOptions.left = targetPos;
      }
    } else {
      const maxSize = axis === "y" ? element.scrollHeight : element.scrollWidth;
      const targetPos = toEnd ? maxSize : currentPos + amount;
      if (axis === "y") {
        scrollOptions.top = targetPos;
      } else {
        scrollOptions.left = targetPos;
      }
    }
    element.scrollTo(scrollOptions);
  }
  function denormalizeCoordinates(originalWidth, originalHeight, originalX, originalY) {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const x = Math.round(originalX / originalWidth * currentWidth);
    const y = Math.round(originalY / originalHeight * currentHeight);
    return { x, y };
  }
  function isScrollable(el, axis) {
    if (!(el instanceof Element)) return false;
    const clientSize = axis === "y" ? el.clientHeight : el.clientWidth;
    if (clientSize === 0) return false;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const scrollSize = axis === "y" ? el.scrollHeight : el.scrollWidth;
    const scrollableSpace = scrollSize - clientSize;
    return scrollableSpace > 1 && Number.isFinite(scrollableSpace);
  }
  function getParentElement(el) {
    const root = el.getRootNode ? el.getRootNode() : null;
    if (root && typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot && root.host && el !== root.host) {
      return root.host;
    }
    return el.parentElement;
  }
  function scroll(params) {
    const { direction, toEnd, target = "page", coordinateX, coordinateY, viewportWidth, viewportHeight } = params;
    const axis = getAxisFromDirection(direction);
    const scrollStartTime = Date.now();
    if (target === "container") {
      if (coordinateX === void 0 || coordinateY === void 0 || viewportWidth === void 0 || viewportHeight === void 0) {
        return {
          success: false,
          error: "Container scroll requires coordinateX, coordinateY, viewportWidth, and viewportHeight"
        };
      }
      const { x, y } = denormalizeCoordinates(viewportWidth, viewportHeight, coordinateX, coordinateY);
      const targetEl = document.elementFromPoint(x, y);
      if (!targetEl) {
        return { success: false, error: "No element found at the specified coordinates" };
      }
      let current = targetEl;
      let safety = 0;
      while (current && safety < MAX_DOM_TRAVERSE_DEPTH) {
        if (!isScrollable(current, axis)) {
          current = getParentElement(current);
          safety++;
          continue;
        }
        const before = axis === "y" ? current.scrollTop : current.scrollLeft;
        const maxOffset = (axis === "y" ? current.scrollHeight : current.scrollWidth) - (axis === "y" ? current.clientHeight : current.clientWidth);
        const dir = direction === "up" || direction === "left" ? -1 : 1;
        const delta = calculateScrollDelta(axis);
        const targetPos = toEnd ? dir < 0 ? 0 : maxOffset : Math.min(Math.max(before + dir * delta, 0), maxOffset);
        if (axis === "y") {
          current.scrollTo({ top: targetPos, behavior: "auto" });
        } else {
          current.scrollTo({ left: targetPos, behavior: "auto" });
        }
        const after = axis === "y" ? current.scrollTop : current.scrollLeft;
        const moved = Math.abs(after - before) > 1;
        if (!moved) {
          return {
            success: false,
            error: "Container did not scroll",
            data: { scrolled: false }
          };
        }
        return {
          success: true,
          message: \`Scrolled container \${direction} by \${Math.round(Math.abs(after - before))}px\`,
          data: {
            scrolled: true,
            scrollDistance: Math.abs(after - before),
            strategy: "container"
          }
        };
      }
      return { success: false, error: "No scrollable container found at point" };
    }
    const containers = findScrollableContainers(axis, scrollStartTime);
    const beforeWindowPos = axis === "y" ? window.scrollY : window.scrollX;
    const beforeContainerPos = containers[0] ? axis === "y" ? containers[0].scrollTop : containers[0].scrollLeft : 0;
    scrollByWindow(axis, direction, toEnd);
    const afterWindowPos1 = axis === "y" ? window.scrollY : window.scrollX;
    const windowScrolled = Math.abs(afterWindowPos1 - beforeWindowPos) > 1;
    if (windowScrolled) {
      return {
        success: true,
        message: \`Scrolled \${direction} by \${Math.round(Math.abs(afterWindowPos1 - beforeWindowPos))}px with Page scroll strategy.\`,
        data: {
          scrolled: true,
          scrollDistance: Math.abs(afterWindowPos1 - beforeWindowPos),
          strategy: "Page scroll"
        }
      };
    }
    scrollByElement(containers[0], axis, direction, toEnd);
    const afterContainerPos = containers[0] ? axis === "y" ? containers[0].scrollTop : containers[0].scrollLeft : 0;
    const containerScrolled = Math.abs(afterContainerPos - beforeContainerPos) > 1;
    if (containerScrolled) {
      return {
        success: true,
        message: \`Scrolled \${direction} by \${Math.round(Math.abs(afterContainerPos - beforeContainerPos))}px with Fallback container scroll strategy.\`,
        data: {
          scrolled: true,
          scrollDistance: Math.abs(afterContainerPos - beforeContainerPos),
          strategy: "Fallback container scroll"
        }
      };
    }
    return {
      success: true,
      message: \`Scroll \${direction} attempted (no position change detected)\`,
      data: { scrolled: false, scrollDistance: 0 }
    };
  }
  return scroll;
}())`,
    rr = T("CdpJsHelper"),
    sr = {
        click: Jn,
        clickEffect: jn,
        input: er,
        scroll: nr,
        pressKey: tr,
        findKeyword: Qn,
        getElementPosition: Zn
    },
    he = {
        async executeAction(r, e, t) {
            try {
                const n = await this.execute(r, e, t),
                    s = n.data;
                return n.success ? {
                    status: "success",
                    message: n.message,
                    data: s
                } : {
                    status: "error",
                    error: n.error || `${e} action failed`,
                    message: n.message,
                    data: s
                }
            } catch (n) {
                return {
                    status: "error",
                    error: n instanceof Error ? n.message : String(n)
                }
            }
        },
        async execute(r, e, t) {
            const n = sr[e];
            if (!n) throw new Error(`Unknown script: ${e}`);
            return D(r, async s => {
                const o = JSON.stringify(t),
                    i = `(${n})(${o})`;
                return or(s, i)
            })
        }
    };
async function or(r, e) {
    var n;
    const t = await r.send("Runtime.evaluate", {
        expression: e,
        returnByValue: !0,
        awaitPromise: !0
    });
    if (t.exceptionDetails) {
        const s = ((n = t.exceptionDetails.exception) == null ? void 0 : n.description) || t.exceptionDetails.text || "Script execution failed";
        throw rr.error("Script execution failed", {
            error: s,
            expressionPreview: e.slice(0, 200)
        }), new Error(s)
    }
    return t.result.value
}
const Ce = T("CdpPressKey");
async function gt(r, e) {
    Ce.info(`Pressing key "${e}" on tab ${r}`);
    try {
        const t = e.split("+").map(n => ar(n.trim()));
        return await D(r, async n => await ir(n, t))
    } catch (t) {
        const n = t instanceof Error ? t.message : String(t);
        return Ce.error(`Failed to press key "${e}" on tab ${r}`, {
            error: n
        }), {
            success: !1,
            error: `Failed to press key: ${n}`
        }
    }
}
async function ir(r, e) {
    try {
        const t = [];
        for (const o of e) {
            const i = lr(o);
            if (!i) return Ce.error(`Unsupported key: ${o}. Please add it to the key mapping.`), {
                success: !1,
                error: `Unsupported key: ${o}. Please add it to the key mapping.`
            };
            t.push(i)
        }
        const n = e.slice(0, -1),
            s = cr(n);
        for (let o = 0; o < t.length; o++) {
            const i = t[o],
                a = o === t.length - 1;
            await r.send("Input.dispatchKeyEvent", {
                type: "keyDown",
                key: i.key,
                code: i.code,
                nativeVirtualKeyCode: i.keyCode,
                windowsVirtualKeyCode: i.keyCode,
                ...a && s > 0 ? {
                    modifiers: s
                } : {}
            })
        }
        for (let o = t.length - 1; o >= 0; o--) {
            const i = t[o],
                a = o === t.length - 1;
            await r.send("Input.dispatchKeyEvent", {
                type: "keyUp",
                key: i.key,
                code: i.code,
                nativeVirtualKeyCode: i.keyCode,
                windowsVirtualKeyCode: i.keyCode,
                ...a && s > 0 ? {
                    modifiers: s
                } : {}
            })
        }
        return {
            success: !0
        }
    } catch (t) {
        const n = t instanceof Error ? t.message : String(t);
        return Ce.error(`Failed to dispatch CDP key event for keys: ${e.join("+")}`, {
            error: n
        }), {
            success: !1,
            error: `Failed to dispatch key event via CDP: ${n}`
        }
    }
}

function ar(r) {
    return {
        Command: "Meta",
        Cmd: "Meta",
        Ctrl: "Control",
        Option: "Alt"
    } [r] || r
}

function cr(r) {
    let e = 0;
    for (const t of r) switch (t) {
        case "Alt":
            e |= 1;
            break;
        case "Control":
            e |= 2;
            break;
        case "Meta":
            e |= 4;
            break;
        case "Shift":
            e |= 8;
            break
    }
    return e
}

function lr(r) {
    const e = {
        Enter: {
            key: "Enter",
            code: "Enter",
            keyCode: 13
        },
        Escape: {
            key: "Escape",
            code: "Escape",
            keyCode: 27
        },
        Backspace: {
            key: "Backspace",
            code: "Backspace",
            keyCode: 8
        },
        Tab: {
            key: "Tab",
            code: "Tab",
            keyCode: 9
        },
        Space: {
            key: " ",
            code: "Space",
            keyCode: 32
        },
        " ": {
            key: " ",
            code: "Space",
            keyCode: 32
        },
        ArrowUp: {
            key: "ArrowUp",
            code: "ArrowUp",
            keyCode: 38
        },
        ArrowDown: {
            key: "ArrowDown",
            code: "ArrowDown",
            keyCode: 40
        },
        ArrowLeft: {
            key: "ArrowLeft",
            code: "ArrowLeft",
            keyCode: 37
        },
        ArrowRight: {
            key: "ArrowRight",
            code: "ArrowRight",
            keyCode: 39
        },
        Delete: {
            key: "Delete",
            code: "Delete",
            keyCode: 46
        },
        Home: {
            key: "Home",
            code: "Home",
            keyCode: 36
        },
        End: {
            key: "End",
            code: "End",
            keyCode: 35
        },
        PageUp: {
            key: "PageUp",
            code: "PageUp",
            keyCode: 33
        },
        PageDown: {
            key: "PageDown",
            code: "PageDown",
            keyCode: 34
        },
        Shift: {
            key: "Shift",
            code: "ShiftLeft",
            keyCode: 16
        },
        Control: {
            key: "Control",
            code: "ControlLeft",
            keyCode: 17
        },
        Alt: {
            key: "Alt",
            code: "AltLeft",
            keyCode: 18
        },
        Meta: {
            key: "Meta",
            code: "MetaLeft",
            keyCode: 91
        },
        F1: {
            key: "F1",
            code: "F1",
            keyCode: 112
        },
        F2: {
            key: "F2",
            code: "F2",
            keyCode: 113
        },
        F3: {
            key: "F3",
            code: "F3",
            keyCode: 114
        },
        F4: {
            key: "F4",
            code: "F4",
            keyCode: 115
        },
        F5: {
            key: "F5",
            code: "F5",
            keyCode: 116
        },
        F6: {
            key: "F6",
            code: "F6",
            keyCode: 117
        },
        F7: {
            key: "F7",
            code: "F7",
            keyCode: 118
        },
        F8: {
            key: "F8",
            code: "F8",
            keyCode: 119
        },
        F9: {
            key: "F9",
            code: "F9",
            keyCode: 120
        },
        F10: {
            key: "F10",
            code: "F10",
            keyCode: 121
        },
        F11: {
            key: "F11",
            code: "F11",
            keyCode: 122
        },
        F12: {
            key: "F12",
            code: "F12",
            keyCode: 123
        },
        Insert: {
            key: "Insert",
            code: "Insert",
            keyCode: 45
        },
        CapsLock: {
            key: "CapsLock",
            code: "CapsLock",
            keyCode: 20
        },
        NumLock: {
            key: "NumLock",
            code: "NumLock",
            keyCode: 144
        },
        ScrollLock: {
            key: "ScrollLock",
            code: "ScrollLock",
            keyCode: 145
        },
        Pause: {
            key: "Pause",
            code: "Pause",
            keyCode: 19
        },
        ContextMenu: {
            key: "ContextMenu",
            code: "ContextMenu",
            keyCode: 93
        },
        "`": {
            key: "`",
            code: "Backquote",
            keyCode: 192
        },
        Backquote: {
            key: "`",
            code: "Backquote",
            keyCode: 192
        },
        "-": {
            key: "-",
            code: "Minus",
            keyCode: 189
        },
        Minus: {
            key: "-",
            code: "Minus",
            keyCode: 189
        },
        "=": {
            key: "=",
            code: "Equal",
            keyCode: 187
        },
        Equal: {
            key: "=",
            code: "Equal",
            keyCode: 187
        },
        "[": {
            key: "[",
            code: "BracketLeft",
            keyCode: 219
        },
        BracketLeft: {
            key: "[",
            code: "BracketLeft",
            keyCode: 219
        },
        "]": {
            key: "]",
            code: "BracketRight",
            keyCode: 221
        },
        BracketRight: {
            key: "]",
            code: "BracketRight",
            keyCode: 221
        },
        "\\": {
            key: "\\",
            code: "Backslash",
            keyCode: 220
        },
        Backslash: {
            key: "\\",
            code: "Backslash",
            keyCode: 220
        },
        ";": {
            key: ";",
            code: "Semicolon",
            keyCode: 186
        },
        Semicolon: {
            key: ";",
            code: "Semicolon",
            keyCode: 186
        },
        "'": {
            key: "'",
            code: "Quote",
            keyCode: 222
        },
        Quote: {
            key: "'",
            code: "Quote",
            keyCode: 222
        },
        ",": {
            key: ",",
            code: "Comma",
            keyCode: 188
        },
        Comma: {
            key: ",",
            code: "Comma",
            keyCode: 188
        },
        ".": {
            key: ".",
            code: "Period",
            keyCode: 190
        },
        Period: {
            key: ".",
            code: "Period",
            keyCode: 190
        },
        "/": {
            key: "/",
            code: "Slash",
            keyCode: 191
        },
        Slash: {
            key: "/",
            code: "Slash",
            keyCode: 191
        },
        Numpad0: {
            key: "0",
            code: "Numpad0",
            keyCode: 96
        },
        Numpad1: {
            key: "1",
            code: "Numpad1",
            keyCode: 97
        },
        Numpad2: {
            key: "2",
            code: "Numpad2",
            keyCode: 98
        },
        Numpad3: {
            key: "3",
            code: "Numpad3",
            keyCode: 99
        },
        Numpad4: {
            key: "4",
            code: "Numpad4",
            keyCode: 100
        },
        Numpad5: {
            key: "5",
            code: "Numpad5",
            keyCode: 101
        },
        Numpad6: {
            key: "6",
            code: "Numpad6",
            keyCode: 102
        },
        Numpad7: {
            key: "7",
            code: "Numpad7",
            keyCode: 103
        },
        Numpad8: {
            key: "8",
            code: "Numpad8",
            keyCode: 104
        },
        Numpad9: {
            key: "9",
            code: "Numpad9",
            keyCode: 105
        },
        NumpadMultiply: {
            key: "*",
            code: "NumpadMultiply",
            keyCode: 106
        },
        NumpadAdd: {
            key: "+",
            code: "NumpadAdd",
            keyCode: 107
        },
        NumpadSubtract: {
            key: "-",
            code: "NumpadSubtract",
            keyCode: 109
        },
        NumpadDecimal: {
            key: ".",
            code: "NumpadDecimal",
            keyCode: 110
        },
        NumpadDivide: {
            key: "/",
            code: "NumpadDivide",
            keyCode: 111
        },
        NumpadEnter: {
            key: "Enter",
            code: "NumpadEnter",
            keyCode: 13
        }
    };
    if (e[r]) return e[r];
    if (r.length === 1) {
        const t = r.toLowerCase(),
            n = r.toUpperCase();
        if (t >= "a" && t <= "z") {
            const s = t.charCodeAt(0) - 32;
            return {
                key: r,
                code: `Key${n}`,
                keyCode: s
            }
        }
        if (t >= "0" && t <= "9") {
            const s = t.charCodeAt(0);
            return {
                key: r,
                code: `Digit${t}`,
                keyCode: s
            }
        }
    }
    return null
}
const G = T("CdpActionHelper"),
    Ne = 50,
    ur = 500,
    dr = {
        single_left: 1,
        double_left: 2,
        triple_left: 3,
        right: 1
    };
class hr {
    async click(e, t, n = "single_left") {
        try {
            const s = await he.execute(e, "getElementPosition", {
                target: t
            });
            if (!s.success || !s.data) return G.error("Failed to get element position", {
                error: s.error
            }), {
                status: "error",
                error: s.error || "Failed to get element position"
            };
            const {
                x: o,
                y: i,
                element: a
            } = s.data;
            return await this.withActionBarHiding(e, o, i, async () => (await D(e, c => this.dispatchMouseClick(c, o, i, n)), await this.showClickEffect(e, o, i), {
                status: "success",
                message: `Click action (${n}) executed via CDP`,
                data: a
            }))
        } catch (s) {
            return G.error("CDP click action failed", {
                error: W(s)
            }), this.errorResult(s)
        }
    }
    async moveMouse(e, t) {
        try {
            const {
                x: n,
                y: s
            } = await this.resolveCoordinates(e, t);
            return await D(e, o => this.dispatchMouseMove(o, n, s)), await this.showClickEffect(e, n, s), await se(ur), {
                status: "success",
                message: `Mouse moved to (${Math.round(n)}, ${Math.round(s)})`,
                data: {
                    x: Math.round(n),
                    y: Math.round(s)
                }
            }
        } catch (n) {
            return G.error("CDP mouse move action failed", {
                error: W(n)
            }), this.errorResult(n)
        }
    }
    async input(e, t) {
        const {
            target: n,
            text: s,
            pressEnter: o = !1
        } = t;
        try {
            const i = await he.execute(e, "getElementPosition", {
                target: n
            });
            if (!i.success || !i.data) return G.error("Failed to get element position for input", {
                error: i.error
            }), {
                status: "error",
                error: i.error || "Failed to get element position for input"
            };
            const {
                x: a,
                y: c,
                element: l
            } = i.data;
            return await this.withActionBarHiding(e, a, c, async () => (n.strategy === "byIndex" || n.strategy === "bySelector" ? (await D(e, d => this.focusElement(d, n))).success || (await this.showClickEffect(e, a, c), await D(e, d => this.dispatchMouseClick(d, a, c, "single_left"))) : (await this.showClickEffect(e, a, c), await D(e, u => this.dispatchMouseClick(u, a, c, "single_left"))), await se(Ne), await D(e, async u => {
                await u.send("Input.insertText", {
                    text: s
                })
            }), o && await gt(e, "Enter"), {
                status: "success",
                message: `Input action executed via CDP (${s.length} chars)`,
                data: {
                    textLength: s.length,
                    element: l
                }
            }))
        } catch (i) {
            return G.error("CDP input action failed", {
                error: W(i)
            }), this.errorResult(i)
        }
    }
    async pressKey(e, t) {
        const n = await gt(e, t);
        return n.success ? {
            status: "success",
            message: `Pressed key via CDP: ${t}`,
            data: {
                key: t
            }
        } : {
            status: "error",
            error: n.error || `Press key failed: ${t}`
        }
    }
    errorResult(e) {
        return {
            status: "error",
            error: W(e)
        }
    }
    async showClickEffect(e, t, n) {
        try {
            await he.execute(e, "clickEffect", {
                x: t,
                y: n
            })
        } catch (s) {
            G.warn("Failed to show click effect", {
                error: W(s)
            })
        }
    }
    async resolveCoordinates(e, t) {
        const {
            coordinateX: n,
            coordinateY: s,
            viewportWidth: o,
            viewportHeight: i
        } = t;
        if (!o || !i) return {
            x: n,
            y: s
        };
        const a = await D(e, async (c, l) => l);
        return a ? {
            x: n / o * a.cssWidth,
            y: s / i * a.cssHeight
        } : {
            x: n,
            y: s
        }
    }
    async dispatchMouseMove(e, t, n) {
        await e.send("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x: t,
            y: n
        })
    }
    async dispatchMouseClick(e, t, n, s = "single_left") {
        const o = s === "right" ? "right" : "left",
            i = dr[s];
        for (let a = 1; a <= i; a++) await e.send("Input.dispatchMouseEvent", {
            type: "mousePressed",
            x: t,
            y: n,
            button: o,
            clickCount: a
        }), await se(Ne), await e.send("Input.dispatchMouseEvent", {
            type: "mouseReleased",
            x: t,
            y: n,
            button: o,
            clickCount: a
        }), a < i && await se(Ne)
    }
    async focusElement(e, t) {
        let n = null;
        if (t.strategy === "byIndex" && t.index !== void 0 ? n = `[data-manus_click_id="${t.index}"]` : t.strategy === "bySelector" && t.selector && (n = t.selector), !n) return {
            success: !1,
            error: "Cannot build selector for focus"
        };
        try {
            const s = await e.send("DOM.getDocument"),
                o = await e.send("DOM.querySelector", {
                    nodeId: s.root.nodeId,
                    selector: n
                });
            return o.nodeId ? (await e.send("DOM.focus", {
                nodeId: o.nodeId
            }), {
                success: !0
            }) : {
                success: !1,
                error: `Element not found: ${n}`
            }
        } catch (s) {
            return G.debug("Focus element failed, will fallback to click", {
                selector: n,
                error: W(s)
            }), {
                success: !1,
                error: W(s)
            }
        }
    }
    async withActionBarHiding(e, t, n, s) {
        const o = await Ct(e),
            i = o ? this.isPositionOverlappingActionBar(t, n, o.width, o.height) : !1;
        i && (await I(e, {
            source: "background",
            type: "page/event-unblock",
            hideActionBar: !0
        }), await se(50));
        try {
            return await s()
        } finally {
            i && await I(e, {
                source: "background",
                type: "page/event-block",
                restoreActionBar: !0
            })
        }
    }
    isPositionOverlappingActionBar(e, t, n, s) {
        const u = s - 24 - 48 - 16 - 36,
            d = (n - 400) / 2 - 16 - 36,
            h = (n + 400) / 2 + 16 + 36;
        return t >= u && t <= s && e >= d && e <= h
    }
}
const ye = new hr,
    pr = `(function() {
  "use strict";
  function filterClickableByVisibility(params) {
    const clickFlagAttr = params.clickFlagAttr ?? "data-manus_clickable";
    const threshold = typeof params.visibilityThreshold === "number" ? params.visibilityThreshold : 0.5;
    const spacing = typeof params.targetSampleSpacing === "number" ? params.targetSampleSpacing : 5;
    const maxGrid = typeof params.maxSampleGrid === "number" ? params.maxSampleGrid : 8;
    const minSize = typeof params.minRenderableSize === "number" ? params.minRenderableSize : 1;
    const maxSamplePoints = maxGrid * maxGrid;
    const viewport = window.visualViewport;
    const viewportWidth = (viewport == null ? void 0 : viewport.width) ?? window.innerWidth;
    const viewportHeight = (viewport == null ? void 0 : viewport.height) ?? window.innerHeight;
    const hasRenderableSize = (rect) => rect.width > minSize && rect.height > minSize;
    const isElementVisuallyVisible = (el) => {
      const style = window.getComputedStyle(el);
      if (style.display === "none") return false;
      if (style.visibility === "hidden" || style.visibility === "collapse") return false;
      if (style.pointerEvents === "none") return false;
      const opacity = Number.parseFloat(style.opacity || "1");
      if (!Number.isNaN(opacity) && opacity <= 0) return false;
      return true;
    };
    const clipRectToViewport = (rect) => {
      const left = Math.max(rect.left, 0);
      const top = Math.max(rect.top, 0);
      const right = Math.min(rect.right, viewportWidth);
      const bottom = Math.min(rect.bottom, viewportHeight);
      const width = right - left;
      const height = bottom - top;
      if (width <= minSize || height <= minSize) return null;
      return { left, top, width, height };
    };
    const buildSamplePoints = (rect) => {
      const cols = Math.min(maxGrid, Math.max(1, Math.round(rect.width / spacing)));
      const rows = Math.min(maxGrid, Math.max(1, Math.round(rect.height / spacing)));
      const stepX = rect.width / cols;
      const stepY = rect.height / rows;
      const points = [];
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = rect.left + stepX * (col + 0.5);
          const y = rect.top + stepY * (row + 0.5);
          points.push({ x, y });
          if (points.length >= maxSamplePoints) return points;
        }
      }
      return points;
    };
    const getTopElementAtPoint = (x, y) => {
      const element = document.elementFromPoint(x, y);
      if (!element) return null;
      if (element.shadowRoot) return element.shadowRoot.elementFromPoint(x, y) || element;
      return element;
    };
    const isDescendantOf = (node, target) => {
      if (node === target) return true;
      if (target.contains(node)) return true;
      const visited = /* @__PURE__ */ new Set();
      let current = node;
      while (current && !visited.has(current)) {
        if (current === target) return true;
        visited.add(current);
        if (current.parentElement) {
          current = current.parentElement;
          continue;
        }
        const root = current.getRootNode();
        if (root instanceof ShadowRoot) {
          current = root.host;
        } else {
          current = null;
        }
      }
      return false;
    };
    const computeVisibilityRatio = (element, rect) => {
      const samplePoints = buildSamplePoints(rect);
      if (!samplePoints.length) return 1;
      let visibleCount = 0;
      for (const point of samplePoints) {
        const top = getTopElementAtPoint(point.x, point.y);
        if (!top) continue;
        if (top === element || isDescendantOf(top, element)) visibleCount += 1;
      }
      return visibleCount / samplePoints.length;
    };
    const elements = Array.from(document.querySelectorAll(\`[\${clickFlagAttr}]\`));
    let kept = 0;
    let removed = 0;
    for (const node of elements) {
      const rect = node.getBoundingClientRect();
      if (!hasRenderableSize(rect) || !isElementVisuallyVisible(node)) {
        node.removeAttribute(clickFlagAttr);
        removed += 1;
        continue;
      }
      const clippedRect = clipRectToViewport(rect);
      if (!clippedRect) {
        node.removeAttribute(clickFlagAttr);
        removed += 1;
        continue;
      }
      const ratio = computeVisibilityRatio(node, clippedRect);
      if (ratio < threshold) {
        node.removeAttribute(clickFlagAttr);
        removed += 1;
        continue;
      }
      kept += 1;
    }
    return { kept, removed };
  }
  return filterClickableByVisibility;
}())`,
    yt = T("CdpClickable"),
    Ae = "data-manus_clickable",
    Ue = ["display", "visibility", "opacity", "pointer-events"],
    fr = new Set(["html", "head", "body", "svg", "script", "style", "link", "meta"]),
    mr = new Set(["a", "button", "input", "textarea", "select", "option", "label", "details", "summary", "embed", "menu", "menuitem", "object"]),
    gr = new Set(["button", "tab", "link", "checkbox", "radio", "textbox", "combobox", "listbox", "option", "menuitem", "menuitemcheckbox", "menuitemradio", "switch", "slider", "splitbutton", "searchbox", "treeitem"]),
    yr = new Set(["click", "clickmod", "dblclick"]),
    wr = ["aria-expanded", "aria-pressed", "aria-selected", "aria-checked"],
    br = ["onclick", "ng-click", "@click", "v-on:click"];
async function kr(r) {
    return D(r, async (e, t) => {
        const n = t.devicePixelRatio || 1;
        await Sr(e), await e.send("DOM.enable", {}), await e.send("CSS.enable", {});
        try {
            await e.send("DOM.getDocument", {
                depth: 0,
                pierce: !0
            })
        } catch {}
        const s = await e.send("DOMSnapshot.captureSnapshot", {
            computedStyles: Ue,
            includeDOMRects: !0,
            includePaintOrder: !0
        });
        if (!s) return yt.warn("Unexpected empty snapshot when capturing DOM snapshot"), 0;
        const o = Er(s, n),
            i = vr(o);
        if (!i.length) return yt.info("No clickable candidates found via CDP snapshot"), 0;
        const a = i.map(h => h.backendNodeId);
        let c = [];
        try {
            const h = await e.send("DOM.pushNodesByBackendIdsToFrontend", {
                backendNodeIds: a
            });
            c = (h == null ? void 0 : h.nodeIds) || []
        } catch {
            return 0
        }
        const l = new Map;
        for (let h = 0; h < a.length && h < c.length; h++) {
            const m = c[h];
            m >= 0 && l.set(a[h], m)
        }
        let u = 0;
        for (const h of i) {
            const m = l.get(h.backendNodeId);
            m !== void 0 && (await _r(e, m), u++)
        }
        const d = await xr(e);
        return u - d.removed
    })
}

function Er(r, e) {
    const t = [],
        {
            strings: n,
            documents: s
        } = r;
    if (!(n != null && n.length) || !(s != null && s.length)) return t;
    for (const o of s) {
        const {
            nodes: i,
            layout: a
        } = o;
        if (!i || !a) continue;
        const {
            backendNodeId: c,
            nodeType: l,
            nodeName: u,
            attributes: d,
            isClickable: h
        } = i, {
            nodeIndex: m,
            bounds: k,
            styles: v,
            paintOrders: g
        } = a, w = new Map;
        for (let b = 0; b < m.length; b++) {
            const M = m[b];
            w.has(M) || w.set(M, b)
        }
        for (let b = 0; b < c.length; b++) {
            if (l[b] !== 1) continue;
            const M = u[b];
            if (M < 0 || M >= n.length) continue;
            const R = n[M].toLowerCase(),
                O = w.get(b);
            if (O === void 0) continue;
            const C = k[O];
            if (!C || C.length < 4) continue;
            const [H, Z, fe, Ie] = C, ee = {
                x: H / e,
                y: Z / e,
                width: fe / e,
                height: Ie / e
            }, L = v[O] || [], te = Br(n, L);
            if (!Fr(ee, te)) continue;
            const ie = Dr(d[b], n),
                ne = Or(h, b);
            if (!Tr(R, ne, ie)) continue;
            let Y = null;
            g && O < g.length && (Y = g[O]), t.push({
                backendNodeId: c[b],
                paintOrder: Y,
                yPosition: ee.y,
                xPosition: ee.x,
                tagName: R,
                id: ie.id || null
            })
        }
    }
    return t
}

function vr(r) {
    return [...r].sort((e, t) => {
        const n = e.paintOrder !== null ? 0 : 1,
            s = t.paintOrder !== null ? 0 : 1;
        return n !== s ? n - s : e.paintOrder !== null && t.paintOrder !== null && e.paintOrder !== t.paintOrder ? e.paintOrder - t.paintOrder : e.yPosition !== t.yPosition ? e.yPosition - t.yPosition : e.xPosition - t.xPosition
    })
}
async function Sr(r) {
    try {
        await r.send("Runtime.evaluate", {
            expression: `
        (function() {
          const elements = document.querySelectorAll('[${Ae}]');
          for (const el of elements) {
            el.removeAttribute('${Ae}');
          }
          return elements.length;
        })()
      `,
            returnByValue: !0
        })
    } catch {}
}
async function _r(r, e) {
    try {
        await r.send("DOM.setAttributeValue", {
            nodeId: e,
            name: Ae,
            value: "true"
        })
    } catch {}
}
async function xr(r) {
    var e;
    try {
        const n = JSON.stringify({
                clickFlagAttr: Ae,
                visibilityThreshold: .5,
                targetSampleSpacing: 5,
                maxSampleGrid: 8,
                minRenderableSize: 1
            }),
            s = `(${pr})(${n})`,
            o = await r.send("Runtime.evaluate", {
                expression: s,
                returnByValue: !0,
                awaitPromise: !0
            });
        return o != null && o.exceptionDetails ? {
            kept: 0,
            removed: 0
        } : ((e = o == null ? void 0 : o.result) == null ? void 0 : e.value) || {
            kept: 0,
            removed: 0
        }
    } catch {
        return {
            kept: 0,
            removed: 0
        }
    }
}

function Tr(r, e, t) {
    return fr.has(r) ? !1 : !!(e || Cr(t.jsaction) || Ar(t.draggable, r) || Pr(r, t) || Rr(t.role) || Mr(t.contenteditable) || Lr(t) || Ir(t) || Nr(t))
}

function Cr(r) {
    if (!r) return !1;
    const e = r.replace(/,/g, ";").split(";");
    for (const t of e) {
        const n = t.trim();
        if (!n) continue;
        const s = n.indexOf(":"),
            o = s >= 0 ? n.slice(0, s).trim().toLowerCase() : n.toLowerCase();
        if (yr.has(o)) return !0
    }
    return !1
}

function Ar(r, e) {
    if ((e == null ? void 0 : e.toLowerCase()) === "img" || r === void 0) return !1;
    const t = r.trim().toLowerCase();
    return t ? t !== "false" : !0
}

function Mr(r) {
    if (r === void 0) return !1;
    const e = r.trim().toLowerCase();
    return e ? e !== "false" && e !== "off" : !0
}

function Rr(r) {
    if (!r) return !1;
    const e = r.split(/\s+/);
    for (const t of e) {
        const n = t.trim().toLowerCase();
        if (n && gr.has(n)) return !0
    }
    return !1
}

function Pr(r, e) {
    return mr.has(r) ? r === "input" ? (e.type || "").trim().toLowerCase() !== "hidden" : !0 : !1
}

function Lr(r) {
    for (const e of wr)
        if (e in r) return !0;
    return !1
}

function Ir(r) {
    for (const e of br)
        if (e in r) return !0;
    return !1
}

function Nr(r) {
    const e = r["data-action"];
    return e === "a-dropdown-select" || e === "a-dropdown-button"
}

function Or(r, e) {
    return r != null && r.index ? r.index.includes(e) : !1
}

function Br(r, e) {
    const t = {};
    for (let n = 0; n < e.length && n < Ue.length; n++) {
        const s = e[n];
        s >= 0 && s < r.length && (t[Ue[n]] = r[s])
    }
    return t
}

function Dr(r, e) {
    if (!r) return {};
    const t = {};
    for (let n = 0; n < r.length; n += 2) {
        const s = r[n],
            o = r[n + 1];
        if (s >= 0 && s < e.length) {
            const i = e[s],
                a = o !== void 0 && o >= 0 && o < e.length ? e[o] : "";
            t[i] = a
        }
    }
    return t
}

function Fr(r, e) {
    return !(r.width <= .5 || r.height <= .5 || e.display === "none" || e.visibility === "hidden" || e.visibility === "collapse" || e.opacity === "0" || e["pointer-events"] === "none")
}
const Oe = {
        button: "#FFFF00",
        input: "#FF7F50",
        select: "#FF4162",
        a: "#00FF00",
        textarea: "#0000FF",
        default: "#FF0000"
    },
    Hr = "black",
    we = 4,
    wt = 8,
    $r = 2,
    Ur = 6;
class zr {
    async getHighlightedSnapshot(e, t, n) {
        const s = await this.dataUrlToImageBitmap(e),
            o = new OffscreenCanvas(s.width, s.height),
            i = o.getContext("2d");
        if (!i) throw s.close(), new Error("Failed to get canvas 2d context");
        i.drawImage(s, 0, 0);
        const a = Math.min(n.scaleX, n.scaleY),
            c = [],
            l = [];
        for (const h of t) {
            const m = this.clamp(Math.round(h.x * a), 0, s.width),
                k = this.clamp(Math.round(h.y * a), 0, s.height),
                v = this.clamp(Math.round((h.x + h.width) * a), 0, s.width),
                g = this.clamp(Math.round((h.y + h.height) * a), 0, s.height);
            if (v - m < 1 || g - k < 1) continue;
            const w = this.getElementColor(h.tagName, h.inputType);
            this.drawDashedRect(i, m, k, v, g, w), l.push({
                rect: h,
                x1: m,
                y1: k,
                x2: v,
                y2: g,
                color: w
            })
        }
        for (const {
                rect: h,
                x1: m,
                y1: k,
                x2: v,
                y2: g,
                color: w
            }
            of l) this.drawLabel(i, h.index, m, k, v, g, w, s.width, s.height, c);
        const u = await o.convertToBlob({
                type: "image/png"
            }),
            d = await this.blobToDataUrl(u);
        return s.close(), d
    }
    async dataUrlToImageBitmap(e) {
        const t = e.split(",")[1];
        if (!t) throw new Error("Invalid dataUrl format");
        const n = atob(t),
            s = new Uint8Array(n.length);
        for (let i = 0; i < n.length; i++) s[i] = n.charCodeAt(i);
        const o = new Blob([s], {
            type: "image/png"
        });
        return createImageBitmap(o)
    }
    blobToDataUrl(e) {
        return new Promise((t, n) => {
            const s = new FileReader;
            s.onload = () => t(s.result), s.onerror = () => n(new Error("Failed to convert blob to data URL")), s.readAsDataURL(e)
        })
    }
    drawDashedRect(e, t, n, s, o, i) {
        e.strokeStyle = i, e.lineWidth = $r, this.drawDashedLine(e, t, n, s, n), this.drawDashedLine(e, s, n, s, o), this.drawDashedLine(e, s, o, t, o), this.drawDashedLine(e, t, o, t, n)
    }
    drawDashedLine(e, t, n, s, o) {
        if (t === s) {
            const [i, a] = n < o ? [n, o] : [o, n];
            let c = i;
            for (; c < a;) {
                const l = Math.min(c + we, a);
                e.beginPath(), e.moveTo(t, c), e.lineTo(t, l), e.stroke(), c += we + wt
            }
        } else {
            const [i, a] = t < s ? [t, s] : [s, t];
            let c = i;
            for (; c < a;) {
                const l = Math.min(c + we, a);
                e.beginPath(), e.moveTo(c, n), e.lineTo(l, n), e.stroke(), c += we + wt
            }
        }
    }
    drawLabel(e, t, n, s, o, i, a, c, l, u) {
        const d = t.toString(),
            h = Math.max(10, Math.min(20, Math.round(c * .01)));
        e.font = `bold ${h}px sans-serif`;
        const k = e.measureText(d).width,
            v = h,
            g = Math.max(4, Math.min(10, Math.round(c * .005))),
            w = Math.round(k + g * 2),
            b = Math.round(v + g * 2),
            M = {
                x1: n,
                y1: s,
                x2: o,
                y2: i
            },
            R = this.placeLabelOutsideBbox(M, w, b, c, l, u, Ur);
        u.push(R), e.fillStyle = a, e.fillRect(R.x1, R.y1, w, b), e.fillStyle = Hr, e.textBaseline = "top";
        const O = R.x1 + Math.floor((w - k) / 2),
            C = R.y1 + Math.floor((b - v) / 2);
        e.fillText(d, O, C)
    }
    clamp(e, t, n) {
        return Math.max(t, Math.min(n, e))
    }
    rectsOverlap(e, t, n = 2) {
        const s = e.x2 + n <= t.x1,
            o = t.x2 + n <= e.x1,
            i = e.y2 + n <= t.y1,
            a = t.y2 + n <= e.y1;
        return !(s || o || i || a)
    }
    clampRectWithinImage(e, t, n) {
        const s = e.x2 - e.x1,
            o = e.y2 - e.y1;
        let i, a, c, l;
        return s >= t ? (i = 0, a = t) : (i = Math.max(0, Math.min(e.x1, t - s)), a = i + s), o >= n ? (c = 0, l = n) : (c = Math.max(0, Math.min(e.y1, n - o)), l = c + o), {
            x1: i,
            y1: c,
            x2: a,
            y2: l
        }
    }
    totalOverlapArea(e, t) {
        let n = 0;
        for (const s of t) {
            const o = Math.max(0, Math.min(e.x2, s.x2) - Math.max(e.x1, s.x1)),
                i = Math.max(0, Math.min(e.y2, s.y2) - Math.max(e.y1, s.y1));
            n += o * i
        }
        return n
    }
    placeLabelOutsideBbox(e, t, n, s, o, i, a) {
        const {
            x1: c,
            y1: l,
            x2: u,
            y2: d
        } = e, h = u - c, m = d - l, k = c + Math.floor(h / 2), v = l + Math.floor(m / 2), g = [
            [k - Math.floor(t / 2), l - a - n],
            [k - Math.floor(t / 2), d + a],
            [u + a, v - Math.floor(n / 2)],
            [c - a - t, v - Math.floor(n / 2)],
            [u + a, l - n - a],
            [c - t - a, l - n - a],
            [u + a, d + a],
            [c - t - a, d + a]
        ];
        let w = null,
            b = null;
        for (const [M, R] of g) {
            const O = {
                    x1: M,
                    y1: R,
                    x2: M + t,
                    y2: R + n
                },
                C = this.clampRectWithinImage(O, s, o);
            if (this.rectsOverlap(C, e, 0)) {
                w === null && (w = C, b = this.totalOverlapArea(C, i));
                continue
            }
            const H = this.totalOverlapArea(C, i);
            if (H === 0) return C;
            (b === null || H < b) && (b = H, w = C)
        }
        return w === null && (w = this.clampRectWithinImage({
            x1: c,
            y1: d + a,
            x2: c + t,
            y2: d + a + n
        }, s, o)), w
    }
    getElementColor(e, t) {
        const n = e.toLowerCase();
        if (n === "input" && t) {
            const s = t.toLowerCase();
            if (s === "button" || s === "submit") return Oe.button
        }
        return Oe[n] ?? Oe.default
    }
}
const Kr = new zr,
    Wr = 500,
    qr = 8e3,
    B = T("ActionHelper");
class Vr {
    async runAction(e, t, n = {}) {
        try {
            await an(e) && B.info("Reset tab zoom to 100%", {
                tabId: e
            });
            const i = {
                ...await this.executeAction(e, t)
            };
            if (n.captureArtifacts ?? (t.type !== "wait" && i.status === "success")) try {
                await this.ensureContentScriptReady(e, 10);
                const c = t.type === "browser_navigate" ? 5e3 : 3e3,
                    l = n.restoreMask ?? !0,
                    u = await this.collectArtifacts(e, c, l);
                u && (i.artifacts = u)
            } catch (c) {
                const l = c instanceof Error ? c.message : String(c);
                B.error("Failed to collect artifacts after action execution", {
                    actionType: t.type,
                    error: l
                }), t.type === "browser_view" && (i.status = "error", i.error = `Artifacts collection failed: ${l}`)
            }
            return i
        } catch (s) {
            const o = s instanceof Error ? s.message : String(s);
            return B.error("Action execution failed", {
                actionType: t.type,
                reason: o
            }), {
                status: "error",
                error: o
            }
        }
    }
    async executeAction(e, t) {
        switch (t.type) {
            case "browser_navigate":
                return await cn(e, {
                    url: t.url,
                    active: !1
                }), await this.ensureContentScriptReady(e), {
                    status: "success",
                    message: `Navigated to URL: ${t.url}`
                };
            case "browser_press_key":
                return await this.withCdpUnblock(e, t, async () => await ye.pressKey(e, t.key));
            case "browser_click":
                return await this.withCdpUnblock(e, t, async () => await ye.click(e, t.target, t.clickType));
            case "browser_input":
                return await this.withCdpUnblock(e, t, async () => await ye.input(e, {
                    target: t.target,
                    text: t.text,
                    pressEnter: t.pressEnter
                }));
            case "browser_scroll":
                return await he.executeAction(e, "scroll", {
                    direction: t.direction,
                    toEnd: t.toEnd,
                    target: t.target,
                    coordinateX: t.coordinateX,
                    coordinateY: t.coordinateY,
                    viewportWidth: t.viewportWidth,
                    viewportHeight: t.viewportHeight
                });
            case "browser_find_keyword":
                return await he.executeAction(e, "findKeyword", {
                    keyword: t.keyword
                });
            case "browser_move_mouse":
                return await this.withCdpUnblock(e, t, async () => await ye.moveMouse(e, {
                    coordinateX: t.coordinateX,
                    coordinateY: t.coordinateY,
                    viewportWidth: t.viewportWidth,
                    viewportHeight: t.viewportHeight
                }));
            case "wait":
                return await this.delay(t.ms), {
                    status: "success",
                    message: `Waited ${t.ms}ms`
                };
            case "browser_view":
                return {
                    status: "success", message: "Page view captured"
                };
            default: {
                const n = t;
                throw new Error(`Unsupported action ${n.type}`)
            }
        }
    }
    async collectArtifacts(e, t, n = !0) {
        await this.ensureContentScriptReady(e);
        const s = await this.getPageViewportInfo(e),
            o = async i => {
                let a = null,
                    c = null,
                    l = "",
                    u = [];
                try {
                    await I(e, {
                        source: "background",
                        type: "page/toggle-page-effect",
                        state: "idle"
                    });
                    try {
                        await kr(e)
                    } catch (m) {
                        B.warn("Failed to mark clickable elements via CDP, falling back to JS scan", {
                            error: m instanceof Error ? m.message : String(m)
                        })
                    }
                    const d = await Yr(i.session);
                    if (B.debug("Collected artifacts via CDP script", d), !d.ok) throw new Error(d.error || "Failed to prepare artifacts");
                    l = d.markdownContent ?? "", u = d.elementRects ?? [], c = await this.captureScreenshot(i, "clean"), n && I(e, {
                        source: "background",
                        type: "page/toggle-page-effect",
                        state: "ongoing"
                    }), c && (a = await this.getHighlightedScreenshot(c, u)), (!a || !c) && B.warn("Missing captured screenshots, continuing with available data", {
                        hasHighlighted: !!a,
                        hasClean: !!c
                    }), l = Xn(l, qr, !1, !0);
                    const h = [a, c].filter(m => m !== null);
                    return {
                        textContent: l,
                        markdownContent: l,
                        screenshots: h,
                        elements: d.elements ?? [],
                        metadata: {
                            viewportInfo: s
                        }
                    }
                } finally {
                    n && I(e, {
                        source: "background",
                        type: "page/toggle-page-effect",
                        state: "ongoing"
                    })
                }
            };
        return D(e, async (i, a) => o({
            session: i,
            viewport: a
        }))
    }
    async getHighlightedScreenshot(e, t) {
        if (!t || t.length === 0) return e;
        try {
            return {
                id: "highlighted",
                label: "highlighted",
                fileName: "highlighted.png",
                dataUrl: await Kr.getHighlightedSnapshot(e.dataUrl, t, {
                    scaleX: e.scaleX,
                    scaleY: e.scaleY
                }),
                width: e.width,
                height: e.height,
                originalWidth: e.originalWidth,
                originalHeight: e.originalHeight,
                scaleX: e.scaleX,
                scaleY: e.scaleY
            }
        } catch (n) {
            const s = n instanceof Error ? n.message : String(n);
            return B.warn("Failed to generate highlighted screenshot via getHighlightedSnapshot", {
                reason: s
            }), null
        }
    }
    async captureScreenshot(e, t) {
        const n = await En(e.session, e.viewport, {
            format: "png"
        });
        return {
            id: t,
            label: t,
            fileName: `${t}.png`,
            dataUrl: n.dataUrl,
            width: n.width,
            height: n.height,
            originalWidth: n.originalWidth,
            originalHeight: n.originalHeight,
            scaleX: n.scaleX,
            scaleY: n.scaleY
        }
    }
    async getPageViewportInfo(e) {
        const t = await Ct(e);
        return t ? {
            width: t.width,
            height: t.height,
            pixelsAbove: t.pixelsAbove,
            pixelsBelow: t.pixelsBelow
        } : null
    }
    async ensureContentScriptReady(e, t = 10) {
        await this.wakeUpTab(e), await this.delay(Wr);
        let n;
        for (let s = 0; s < t; s += 1) {
            let o = !1;
            try {
                const i = await I(e, {
                    source: "background",
                    type: "page/check-ready"
                });
                if (!i.ok) throw new Error("Check-ready response indicated failure");
                if (i.ready) {
                    if ((i.sinceLoadMs ?? 0) > 2e3) return;
                    s >= 5 ? await this.delay(500) : s >= 2 && await this.delay(200);
                    return
                }
                o = !0
            } catch (i) {
                if (n = i, s === t - 1) throw B.error(`Content script failed to become ready after ${t} attempts for tab ${e}`, {
                    lastError: n instanceof Error ? n.message : n
                }), i;
                o = !0
            }
            if (o) {
                const i = s < 5 ? 200 : s < 15 ? 400 : 800;
                await this.delay(i)
            }
        }
    }
    async delay(e) {
        e <= 0 || await new Promise(t => {
            globalThis.setTimeout(t, e)
        })
    }
    async wakeUpTab(e) {
        try {
            await chrome.scripting.executeScript({
                target: {
                    tabId: e
                },
                func: () => {
                    document.body
                }
            })
        } catch (t) {
            B.warn(`Failed to wake up tab ${e} via scripting API`, {
                error: t instanceof Error ? t.message : String(t)
            })
        }
    }
    async withCdpUnblock(e, t, n) {
        const s = ["browser_press_key", "browser_scroll", "browser_input", "browser_click", "browser_move_mouse"].includes(t.type),
            o = ["browser_click", "browser_move_mouse"].includes(t.type);
        s && (await I(e, {
            source: "background",
            type: "page/event-unblock",
            hideActionBar: o
        }), await se(100));
        try {
            return await n()
        } finally {
            s && await I(e, {
                source: "background",
                type: "page/event-block",
                restoreActionBar: o
            })
        }
    }
}
async function Yr(r) {
    var e, t;
    try {
        const s = JSON.stringify({
                clickFlagAttr: "data-manus_clickable",
                clickIdAttr: "data-manus_click_id",
                visibilityThreshold: .5,
                targetSampleSpacing: 5,
                maxSampleGrid: 8,
                minRenderableSize: 1
            }),
            o = `(${Gn})(${s})`,
            i = await r.send("Runtime.evaluate", {
                expression: o,
                returnByValue: !0,
                awaitPromise: !0
            });
        if (i != null && i.exceptionDetails) {
            const a = ((e = i.exceptionDetails.exception) == null ? void 0 : e.description) || i.exceptionDetails.text || "Script execution failed";
            return B.error("prepareArtifacts script execution failed", {
                error: a
            }), {
                ok: !1,
                error: a,
                elements: []
            }
        }
        return ((t = i == null ? void 0 : i.result) == null ? void 0 : t.value) || {
            ok: !1,
            error: "Empty response",
            elements: []
        }
    } catch (n) {
        const s = n instanceof Error ? n.message : String(n);
        return B.error("Failed to execute prepareArtifacts script", {
            error: s
        }), {
            ok: !1,
            error: s,
            elements: []
        }
    }
}
const It = new Vr,
    ce = T("SidepanelHandler");
class Gr {
    constructor(e, t) {
        this.getSocketBridge = e, this.getMockSocketBridge = t
    }
    async handle(e) {
        if (!pn(e)) throw new Error("Invalid message type for SidepanelHandler");
        switch (e.type) {
            case "automation/run-scenario":
                return this.handleRunScenario(e.scenarioId);
            case "automation/stop-scenario":
                return this.handleStopScenario(e.scenarioId);
            case "automation/activate":
                return this.handleAutomationActivate();
            case "automation/trigger-browser-action":
                return this.handleBrowserActionTrigger(e.tabId, e.action, e.captureArtifacts);
            default:
                throw new Error("Unhandled message type in SidepanelHandler")
        }
    }
    async handleRunScenario(e) {
        const t = this.getMockSocketBridge();
        if (!t) return {
            ok: !1,
            error: "MockSocketBridge not initialized"
        };
        try {
            return {
                ok: !0,
                runId: await t.runMockScenario(e)
            }
        } catch (n) {
            return {
                ok: !1,
                error: n instanceof Error ? n.message : String(n)
            }
        }
    }
    async handleStopScenario(e) {
        const t = this.getMockSocketBridge();
        if (!t) return {
            ok: !1,
            error: "MockSocketBridge not initialized"
        };
        try {
            return await t.stopMockScenario(e), {
                ok: !0
            }
        } catch (n) {
            const s = n instanceof Error ? n.message : String(n);
            return ce.error("Failed to stop scenario", {
                scenarioId: e,
                reason: s
            }), {
                ok: !1,
                error: s
            }
        }
    }
    async handleAutomationActivate() {
        const {
            token: e
        } = await ve.initialize();
        if (!e) return ce.error("User token not found"), {
            ok: !1,
            sessionId: null,
            error: "session_id cookie not found"
        };
        const t = this.getSocketBridge();
        return t == null || t.emitExtensionActivation(), {
            ok: !0,
            sessionId: e
        }
    }
    async handleBrowserActionTrigger(e, t, n) {
        const s = Date.now(),
            o = `sidepanel-${t.type}-${s}`,
            i = `sidepanel-trigger-${s}`;
        try {
            ce.info("Executing browser action from sidepanel", {
                tabId: e,
                actionType: t.type,
                captureArtifacts: n,
                runId: o
            });
            const a = await It.runAction(e, t, {
                captureArtifacts: n,
                restoreMask: !1
            });
            return this.emitProgressEvent(o, i, t, a), {
                ok: a.status === "success",
                message: a.message,
                error: a.error,
                data: a.data,
                artifacts: a.artifacts
            }
        } catch (a) {
            const c = a instanceof Error ? a.message : String(a);
            return ce.error("Failed to execute browser action from sidepanel", {
                tabId: e,
                actionType: t.type,
                reason: c,
                runId: o
            }), this.emitProgressEvent(o, i, t, {
                status: "error",
                error: c
            }), {
                ok: !1,
                error: c
            }
        }
    }
    emitProgressEvent(e, t, n, s) {
        const o = s.status === "error",
            i = {
                runId: e,
                scenarioId: t,
                status: o ? "error" : "success",
                action: n,
                message: s.message,
                error: s.error,
                artifacts: s.artifacts
            };
        pe({
            source: "background",
            type: "automation/progress",
            result: i
        }).catch(a => {
            const c = a instanceof Error ? a.message : String(a);
            ce.warn("Failed to emit progress event", c)
        })
    }
}
const y = T("SessionManager");
class Xr {
    constructor(e) {
        this.onDisposeSession = e.onDisposeSession, this.onStopSession = e.onStopSession, this.onResumeSession = e.onResumeSession, chrome.tabs.onRemoved.addListener(t => {
            const n = this.findSessionIdByTabId(t);
            n && (y.warn("Pinned session tab removed, disposing session", {
                sessionId: n,
                tabId: t
            }), this.cleanupSession(n, "tab_removed"))
        })
    }
    async enqueue(e, t) {
        y.warn("📝 Enqueue task", {
            sessionId: e
        });
        const n = await this.ensureSession(e);
        y.warn("✓ Session ensured", {
            sessionId: e,
            tabId: n.tabId,
            disposed: n.disposed,
            status: n.status
        });
        const s = n.queue.then(async () => {
            if (n.disposed) throw new Error(`Session ${e} already disposed`);
            return y.warn("🚀 Executing enqueued task", {
                sessionId: e,
                tabId: n.tabId
            }), t(n.tabId)
        });
        return n.queue = s.catch(o => {
            y.error("❌ Session task failed", {
                sessionId: e,
                error: o instanceof Error ? o.message : o
            })
        }).then(() => {}), s
    }
    async ensureSession(e) {
        y.warn("🔍 Ensuring session", {
            sessionId: e,
            existingCount: p.sessions.size,
            pendingCount: p.pendingSessions.size
        });
        const t = p.sessions.get(e);
        if (t)
            if (y.warn("📌 Found existing session", {
                    sessionId: e,
                    tabId: t.tabId,
                    disposed: t.disposed,
                    status: t.status,
                    taskName: t.taskName
                }), t.tabId !== void 0) try {
                return await X(t.tabId), y.warn("✓ Existing session tab is valid", {
                    sessionId: e,
                    tabId: t.tabId
                }), t
            } catch (o) {
                y.warn("⚠️ Session tab missing, recreating", {
                    sessionId: e,
                    tabId: t.tabId,
                    error: o instanceof Error ? o.message : o
                }), this.cleanupSession(e, "tab_missing")
            } else y.info("📦 Upgrading lightweight session to full session", {
                sessionId: e,
                taskName: t.taskName
            });
        const n = p.pendingSessions.get(e);
        if (n) return y.warn("⏳ Waiting for concurrent session creation", {
            sessionId: e
        }), await n;
        y.warn("🆕 Starting new session creation", {
            sessionId: e
        });
        const s = this.createSession(e);
        p.pendingSessions.set(e, s);
        try {
            const o = await s;
            return y.warn("✅ Session created successfully", {
                sessionId: e,
                tabId: o.tabId
            }), o
        } catch (o) {
            throw y.error("💥 Session creation failed", {
                sessionId: e,
                error: o instanceof Error ? o.message : o
            }), o
        } finally {
            p.pendingSessions.delete(e), y.warn("🧹 Removed session from pending", {
                sessionId: e
            })
        }
    }
    async createSession(e) {
        var o;
        const t = (o = p.sessions.get(e)) == null ? void 0 : o.taskName;
        y.warn("🛠️ Creating session", {
            sessionId: e,
            existingTaskName: t
        });
        const n = await K.ensureTabForSession(e, "about:blank");
        await K.setTaskState(e, "doing", t ? {
            taskName: t
        } : {});
        const s = p.sessions.get(e);
        if (!s) throw new Error(`Session ${e} not found after tab creation`);
        return s.tabId = n, s.queue = Promise.resolve(), s.disposed = !1, s.status = "stopped", s
    }
    getSession(e) {
        let t;
        if ("sessionId" in e) t = e.sessionId;
        else if ("tabId" in e && (t = this.findSessionIdByTabId(e.tabId), !t)) return;
        if (!t) return;
        const n = p.sessions.get(t);
        if (!n) return;
        const {
            queue: s,
            ...o
        } = n;
        return {
            sessionId: t,
            ...o
        }
    }
    async updateSessionStatus(e, t) {
        try {
            y.warn("🔄 Updating session status", {
                sessionId: e,
                options: t
            });
            const n = p.sessions.get(e);
            if (!n) return y.warn("Cannot update status: session not found", {
                sessionId: e
            }), !1;
            n.status = t.status;
            let s, o;
            switch (t.status) {
                case "running":
                    s = "doing", o = "ongoing";
                    break;
                case "completed":
                    s = "completed", o = "idle";
                    break;
                case "stopped":
                case "error":
                    s = "waiting", o = "idle";
                    break;
                case "takeover":
                    s = "waiting", o = "takeover";
                    break
            }
            return await K.setTaskState(e, s, t.taskName !== void 0 ? {
                taskName: t.taskName
            } : {}), await I(n.tabId, {
                source: "background",
                type: "page/toggle-page-effect",
                state: o
            }).catch(i => {
                y.warn("Failed to update page effect state", {
                    sessionId: e,
                    error: i instanceof Error ? i.message : i
                })
            }), !0
        } catch (n) {
            return y.error("Failed to update session status", {
                sessionId: e,
                options: t,
                error: n instanceof Error ? n.message : n
            }), !1
        }
    }
    async unauthorizeSession(e) {
        var t;
        try {
            const n = p.sessions.get(e);
            if (!n) return;
            await ((t = this.onStopSession) == null ? void 0 : t.call(this, e)), await K.setTaskState(e, "waiting"), await I(n.tabId, {
                source: "background",
                type: "page/toggle-page-effect",
                state: "idle"
            }), this.cleanupSession(e, "user_stop_session")
        } catch (n) {
            y.error("Failed to unauthorize session", {
                sessionId: e,
                error: n instanceof Error ? n.message : n
            })
        }
    }
    async stopSession(e) {
        var t;
        try {
            const n = p.sessions.get(e);
            if (!n) return;
            await ((t = this.onStopSession) == null ? void 0 : t.call(this, e)), await K.setTaskState(e, "waiting"), await I(n.tabId, {
                source: "background",
                type: "page/toggle-page-effect",
                state: "takeover"
            })
        } catch (n) {
            y.error("Failed to stop session", {
                sessionId: e,
                error: n instanceof Error ? n.message : n
            })
        }
    }
    async resumeSession(e, t) {
        var o;
        const n = p.sessions.get(e);
        if (!n) return;
        const s = t != null && t.trim() ? t : "Take over summary not provided.";
        try {
            await ((o = this.onResumeSession) == null ? void 0 : o.call(this, e, s)), await K.setTaskState(e, "doing"), await I(n.tabId, {
                source: "background",
                type: "page/toggle-page-effect",
                state: "ongoing"
            })
        } catch (i) {
            y.error("Failed to resume session", {
                sessionId: e,
                error: i instanceof Error ? i.message : i
            })
        }
    }
    async disposeSession(e, t) {
        this.cleanupSession(e, t)
    }
    listSessions() {
        return Array.from(p.sessions.keys())
    }
    findSessionIdByTabId(e) {
        for (const [t, n] of p.sessions)
            if (n.tabId === e) return t
    }
    cleanupSession(e, t) {
        const n = p.sessions.get(e);
        if (!n) return;
        if (At(n.tabId).catch(o => {
                y.warn("Failed to cleanup CDP session during session disposal", {
                    sessionId: e,
                    tabId: n.tabId,
                    error: o instanceof Error ? o.message : o
                })
            }), K.cleanupSession(e).catch(o => {
                y.warn("Failed to cleanup tab group during session disposal", {
                    sessionId: e,
                    error: o instanceof Error ? o.message : o
                })
            }), t === "tab_removed" || t === "tab_missing" ? p.sessions.delete(e) : y.info("Keeping session entry despite cleanup", {
                sessionId: e,
                event: t,
                currentStatus: n.status
            }), this.onDisposeSession) try {
            this.onDisposeSession(e, t)
        } catch (o) {
            y.error("onSessionDisposed callback threw", {
                sessionId: e,
                error: o instanceof Error ? o.message : o
            })
        }
    }
}
async function bt(r, e) {
    const t = Jr(e.dataUrl),
        n = await globalThis.fetch(r, {
            method: "PUT",
            body: t,
            headers: {
                "Content-Type": "image/png"
            }
        });
    let s = "";
    try {
        s = await n.clone().text()
    } catch {}
    if (n.status !== 200) throw J.error("[uploadScreenshot] 上传失败", {
        label: e.label,
        status: n.status,
        statusText: n.statusText,
        body: s
    }), new Error(`Upload failed with status ${n.status}: ${s||n.statusText}`);
    const o = n.headers.get("ETag");
    if (!o) throw J.error("[uploadScreenshot] 上传失败：响应缺少 ETag", {
        label: e.label,
        status: n.status
    }), new Error("Upload failed: Missing ETag in response (S3 upload may not have completed)");
    J.info("[uploadScreenshot] 上传成功", {
        label: e.label,
        status: n.status,
        etag: o
    })
}

function Jr(r) {
    const e = /^data:(.+);base64,(.*)$/.exec(r);
    if (!e) throw J.error("[dataUrlToUint8Array] 无效的 data URL 格式", {
        dataUrlPrefix: r.substring(0, 50)
    }), new Error("Invalid data URL provided");
    const t = e[2] ?? "",
        n = globalThis.atob(t),
        s = n.length,
        o = new Uint8Array(s);
    for (let i = 0; i < s; i += 1) o[i] = n.charCodeAt(i);
    return o
}
async function jr(r, e, t) {
    const n = {
        screenshot_uploaded: !1,
        clean_screenshot_uploaded: !1
    };
    if (!(r != null && r.screenshots)) return n;
    const {
        screenshots: s
    } = r, o = s.find(c => c.label === "highlighted"), i = s.find(c => c.label === "clean"), a = [];
    return o && e && a.push(bt(e, o).then(() => {
        n.screenshot_uploaded = !0
    }).catch(c => {
        J.error("[handleScreenshotUploads] Highlighted screenshot upload failed", {
            type: "highlighted",
            screenshotPresignedUrl: e,
            error: W(c),
            stack: mt(c)
        })
    })), i && t && a.push(bt(t, i).then(() => {
        n.clean_screenshot_uploaded = !0
    }).catch(c => {
        J.error("[handleScreenshotUploads] Clean screenshot upload failed", {
            type: "clean",
            cleanScreenshotPresignedUrl: t,
            error: W(c),
            stack: mt(c)
        })
    })), await Promise.all(a), n
}
const z = Object.create(null);
z.open = "0";
z.close = "1";
z.ping = "2";
z.pong = "3";
z.message = "4";
z.upgrade = "5";
z.noop = "6";
const Se = Object.create(null);
Object.keys(z).forEach(r => {
    Se[z[r]] = r
});
const ze = {
        type: "error",
        data: "parser error"
    },
    Nt = typeof Blob == "function" || typeof Blob < "u" && Object.prototype.toString.call(Blob) === "[object BlobConstructor]",
    Ot = typeof ArrayBuffer == "function",
    Bt = r => typeof ArrayBuffer.isView == "function" ? ArrayBuffer.isView(r) : r && r.buffer instanceof ArrayBuffer,
    je = ({
        type: r,
        data: e
    }, t, n) => Nt && e instanceof Blob ? t ? n(e) : kt(e, n) : Ot && (e instanceof ArrayBuffer || Bt(e)) ? t ? n(e) : kt(new Blob([e]), n) : n(z[r] + (e || "")),
    kt = (r, e) => {
        const t = new FileReader;
        return t.onload = function() {
            const n = t.result.split(",")[1];
            e("b" + (n || ""))
        }, t.readAsDataURL(r)
    };

function Et(r) {
    return r instanceof Uint8Array ? r : r instanceof ArrayBuffer ? new Uint8Array(r) : new Uint8Array(r.buffer, r.byteOffset, r.byteLength)
}
let Be;

function Qr(r, e) {
    if (Nt && r.data instanceof Blob) return r.data.arrayBuffer().then(Et).then(e);
    if (Ot && (r.data instanceof ArrayBuffer || Bt(r.data))) return e(Et(r.data));
    je(r, !1, t => {
        Be || (Be = new TextEncoder), e(Be.encode(t))
    })
}
const vt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
    ue = typeof Uint8Array > "u" ? [] : new Uint8Array(256);
for (let r = 0; r < vt.length; r++) ue[vt.charCodeAt(r)] = r;
const Zr = r => {
        let e = r.length * .75,
            t = r.length,
            n, s = 0,
            o, i, a, c;
        r[r.length - 1] === "=" && (e--, r[r.length - 2] === "=" && e--);
        const l = new ArrayBuffer(e),
            u = new Uint8Array(l);
        for (n = 0; n < t; n += 4) o = ue[r.charCodeAt(n)], i = ue[r.charCodeAt(n + 1)], a = ue[r.charCodeAt(n + 2)], c = ue[r.charCodeAt(n + 3)], u[s++] = o << 2 | i >> 4, u[s++] = (i & 15) << 4 | a >> 2, u[s++] = (a & 3) << 6 | c & 63;
        return l
    },
    es = typeof ArrayBuffer == "function",
    Qe = (r, e) => {
        if (typeof r != "string") return {
            type: "message",
            data: Dt(r, e)
        };
        const t = r.charAt(0);
        return t === "b" ? {
            type: "message",
            data: ts(r.substring(1), e)
        } : Se[t] ? r.length > 1 ? {
            type: Se[t],
            data: r.substring(1)
        } : {
            type: Se[t]
        } : ze
    },
    ts = (r, e) => {
        if (es) {
            const t = Zr(r);
            return Dt(t, e)
        } else return {
            base64: !0,
            data: r
        }
    },
    Dt = (r, e) => {
        switch (e) {
            case "blob":
                return r instanceof Blob ? r : new Blob([r]);
            case "arraybuffer":
            default:
                return r instanceof ArrayBuffer ? r : r.buffer
        }
    },
    Ft = "",
    ns = (r, e) => {
        const t = r.length,
            n = new Array(t);
        let s = 0;
        r.forEach((o, i) => {
            je(o, !1, a => {
                n[i] = a, ++s === t && e(n.join(Ft))
            })
        })
    },
    rs = (r, e) => {
        const t = r.split(Ft),
            n = [];
        for (let s = 0; s < t.length; s++) {
            const o = Qe(t[s], e);
            if (n.push(o), o.type === "error") break
        }
        return n
    };

function ss() {
    return new TransformStream({
        transform(r, e) {
            Qr(r, t => {
                const n = t.length;
                let s;
                if (n < 126) s = new Uint8Array(1), new DataView(s.buffer).setUint8(0, n);
                else if (n < 65536) {
                    s = new Uint8Array(3);
                    const o = new DataView(s.buffer);
                    o.setUint8(0, 126), o.setUint16(1, n)
                } else {
                    s = new Uint8Array(9);
                    const o = new DataView(s.buffer);
                    o.setUint8(0, 127), o.setBigUint64(1, BigInt(n))
                }
                r.data && typeof r.data != "string" && (s[0] |= 128), e.enqueue(s), e.enqueue(t)
            })
        }
    })
}
let De;

function be(r) {
    return r.reduce((e, t) => e + t.length, 0)
}

function ke(r, e) {
    if (r[0].length === e) return r.shift();
    const t = new Uint8Array(e);
    let n = 0;
    for (let s = 0; s < e; s++) t[s] = r[0][n++], n === r[0].length && (r.shift(), n = 0);
    return r.length && n < r[0].length && (r[0] = r[0].slice(n)), t
}

function os(r, e) {
    De || (De = new TextDecoder);
    const t = [];
    let n = 0,
        s = -1,
        o = !1;
    return new TransformStream({
        transform(i, a) {
            for (t.push(i);;) {
                if (n === 0) {
                    if (be(t) < 1) break;
                    const c = ke(t, 1);
                    o = (c[0] & 128) === 128, s = c[0] & 127, s < 126 ? n = 3 : s === 126 ? n = 1 : n = 2
                } else if (n === 1) {
                    if (be(t) < 2) break;
                    const c = ke(t, 2);
                    s = new DataView(c.buffer, c.byteOffset, c.length).getUint16(0), n = 3
                } else if (n === 2) {
                    if (be(t) < 8) break;
                    const c = ke(t, 8),
                        l = new DataView(c.buffer, c.byteOffset, c.length),
                        u = l.getUint32(0);
                    if (u > Math.pow(2, 21) - 1) {
                        a.enqueue(ze);
                        break
                    }
                    s = u * Math.pow(2, 32) + l.getUint32(4), n = 3
                } else {
                    if (be(t) < s) break;
                    const c = ke(t, s);
                    a.enqueue(Qe(o ? c : De.decode(c), e)), n = 0
                }
                if (s === 0 || s > r) {
                    a.enqueue(ze);
                    break
                }
            }
        }
    })
}
const Ht = 4;

function S(r) {
    if (r) return is(r)
}

function is(r) {
    for (var e in S.prototype) r[e] = S.prototype[e];
    return r
}
S.prototype.on = S.prototype.addEventListener = function(r, e) {
    return this._callbacks = this._callbacks || {}, (this._callbacks["$" + r] = this._callbacks["$" + r] || []).push(e), this
};
S.prototype.once = function(r, e) {
    function t() {
        this.off(r, t), e.apply(this, arguments)
    }
    return t.fn = e, this.on(r, t), this
};
S.prototype.off = S.prototype.removeListener = S.prototype.removeAllListeners = S.prototype.removeEventListener = function(r, e) {
    if (this._callbacks = this._callbacks || {}, arguments.length == 0) return this._callbacks = {}, this;
    var t = this._callbacks["$" + r];
    if (!t) return this;
    if (arguments.length == 1) return delete this._callbacks["$" + r], this;
    for (var n, s = 0; s < t.length; s++)
        if (n = t[s], n === e || n.fn === e) {
            t.splice(s, 1);
            break
        } return t.length === 0 && delete this._callbacks["$" + r], this
};
S.prototype.emit = function(r) {
    this._callbacks = this._callbacks || {};
    for (var e = new Array(arguments.length - 1), t = this._callbacks["$" + r], n = 1; n < arguments.length; n++) e[n - 1] = arguments[n];
    if (t) {
        t = t.slice(0);
        for (var n = 0, s = t.length; n < s; ++n) t[n].apply(this, e)
    }
    return this
};
S.prototype.emitReserved = S.prototype.emit;
S.prototype.listeners = function(r) {
    return this._callbacks = this._callbacks || {}, this._callbacks["$" + r] || []
};
S.prototype.hasListeners = function(r) {
    return !!this.listeners(r).length
};
const Pe = typeof Promise == "function" && typeof Promise.resolve == "function" ? e => Promise.resolve().then(e) : (e, t) => t(e, 0),
    N = typeof self < "u" ? self : typeof window < "u" ? window : Function("return this")(),
    as = "arraybuffer";

function $t(r, ...e) {
    return e.reduce((t, n) => (r.hasOwnProperty(n) && (t[n] = r[n]), t), {})
}
const cs = N.setTimeout,
    ls = N.clearTimeout;

function Le(r, e) {
    e.useNativeTimers ? (r.setTimeoutFn = cs.bind(N), r.clearTimeoutFn = ls.bind(N)) : (r.setTimeoutFn = N.setTimeout.bind(N), r.clearTimeoutFn = N.clearTimeout.bind(N))
}
const us = 1.33;

function ds(r) {
    return typeof r == "string" ? hs(r) : Math.ceil((r.byteLength || r.size) * us)
}

function hs(r) {
    let e = 0,
        t = 0;
    for (let n = 0, s = r.length; n < s; n++) e = r.charCodeAt(n), e < 128 ? t += 1 : e < 2048 ? t += 2 : e < 55296 || e >= 57344 ? t += 3 : (n++, t += 4);
    return t
}

function Ut() {
    return Date.now().toString(36).substring(3) + Math.random().toString(36).substring(2, 5)
}

function ps(r) {
    let e = "";
    for (let t in r) r.hasOwnProperty(t) && (e.length && (e += "&"), e += encodeURIComponent(t) + "=" + encodeURIComponent(r[t]));
    return e
}

function fs(r) {
    let e = {},
        t = r.split("&");
    for (let n = 0, s = t.length; n < s; n++) {
        let o = t[n].split("=");
        e[decodeURIComponent(o[0])] = decodeURIComponent(o[1])
    }
    return e
}
class ms extends Error {
    constructor(e, t, n) {
        super(e), this.description = t, this.context = n, this.type = "TransportError"
    }
}
class Ze extends S {
    constructor(e) {
        super(), this.writable = !1, Le(this, e), this.opts = e, this.query = e.query, this.socket = e.socket, this.supportsBinary = !e.forceBase64
    }
    onError(e, t, n) {
        return super.emitReserved("error", new ms(e, t, n)), this
    }
    open() {
        return this.readyState = "opening", this.doOpen(), this
    }
    close() {
        return (this.readyState === "opening" || this.readyState === "open") && (this.doClose(), this.onClose()), this
    }
    send(e) {
        this.readyState === "open" && this.write(e)
    }
    onOpen() {
        this.readyState = "open", this.writable = !0, super.emitReserved("open")
    }
    onData(e) {
        const t = Qe(e, this.socket.binaryType);
        this.onPacket(t)
    }
    onPacket(e) {
        super.emitReserved("packet", e)
    }
    onClose(e) {
        this.readyState = "closed", super.emitReserved("close", e)
    }
    pause(e) {}
    createUri(e, t = {}) {
        return e + "://" + this._hostname() + this._port() + this.opts.path + this._query(t)
    }
    _hostname() {
        const e = this.opts.hostname;
        return e.indexOf(":") === -1 ? e : "[" + e + "]"
    }
    _port() {
        return this.opts.port && (this.opts.secure && +(this.opts.port !== 443) || !this.opts.secure && Number(this.opts.port) !== 80) ? ":" + this.opts.port : ""
    }
    _query(e) {
        const t = ps(e);
        return t.length ? "?" + t : ""
    }
}
class gs extends Ze {
    constructor() {
        super(...arguments), this._polling = !1
    }
    get name() {
        return "polling"
    }
    doOpen() {
        this._poll()
    }
    pause(e) {
        this.readyState = "pausing";
        const t = () => {
            this.readyState = "paused", e()
        };
        if (this._polling || !this.writable) {
            let n = 0;
            this._polling && (n++, this.once("pollComplete", function() {
                --n || t()
            })), this.writable || (n++, this.once("drain", function() {
                --n || t()
            }))
        } else t()
    }
    _poll() {
        this._polling = !0, this.doPoll(), this.emitReserved("poll")
    }
    onData(e) {
        const t = n => {
            if (this.readyState === "opening" && n.type === "open" && this.onOpen(), n.type === "close") return this.onClose({
                description: "transport closed by the server"
            }), !1;
            this.onPacket(n)
        };
        rs(e, this.socket.binaryType).forEach(t), this.readyState !== "closed" && (this._polling = !1, this.emitReserved("pollComplete"), this.readyState === "open" && this._poll())
    }
    doClose() {
        const e = () => {
            this.write([{
                type: "close"
            }])
        };
        this.readyState === "open" ? e() : this.once("open", e)
    }
    write(e) {
        this.writable = !1, ns(e, t => {
            this.doWrite(t, () => {
                this.writable = !0, this.emitReserved("drain")
            })
        })
    }
    uri() {
        const e = this.opts.secure ? "https" : "http",
            t = this.query || {};
        return this.opts.timestampRequests !== !1 && (t[this.opts.timestampParam] = Ut()), !this.supportsBinary && !t.sid && (t.b64 = 1), this.createUri(e, t)
    }
}
let zt = !1;
try {
    zt = typeof XMLHttpRequest < "u" && "withCredentials" in new XMLHttpRequest
} catch {}
const ys = zt;

function ws() {}
class bs extends gs {
    constructor(e) {
        if (super(e), typeof location < "u") {
            const t = location.protocol === "https:";
            let n = location.port;
            n || (n = t ? "443" : "80"), this.xd = typeof location < "u" && e.hostname !== location.hostname || n !== e.port
        }
    }
    doWrite(e, t) {
        const n = this.request({
            method: "POST",
            data: e
        });
        n.on("success", t), n.on("error", (s, o) => {
            this.onError("xhr post error", s, o)
        })
    }
    doPoll() {
        const e = this.request();
        e.on("data", this.onData.bind(this)), e.on("error", (t, n) => {
            this.onError("xhr poll error", t, n)
        }), this.pollXhr = e
    }
}
class U extends S {
    constructor(e, t, n) {
        super(), this.createRequest = e, Le(this, n), this._opts = n, this._method = n.method || "GET", this._uri = t, this._data = n.data !== void 0 ? n.data : null, this._create()
    }
    _create() {
        var e;
        const t = $t(this._opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
        t.xdomain = !!this._opts.xd;
        const n = this._xhr = this.createRequest(t);
        try {
            n.open(this._method, this._uri, !0);
            try {
                if (this._opts.extraHeaders) {
                    n.setDisableHeaderCheck && n.setDisableHeaderCheck(!0);
                    for (let s in this._opts.extraHeaders) this._opts.extraHeaders.hasOwnProperty(s) && n.setRequestHeader(s, this._opts.extraHeaders[s])
                }
            } catch {}
            if (this._method === "POST") try {
                n.setRequestHeader("Content-type", "text/plain;charset=UTF-8")
            } catch {}
            try {
                n.setRequestHeader("Accept", "*/*")
            } catch {}(e = this._opts.cookieJar) === null || e === void 0 || e.addCookies(n), "withCredentials" in n && (n.withCredentials = this._opts.withCredentials), this._opts.requestTimeout && (n.timeout = this._opts.requestTimeout), n.onreadystatechange = () => {
                var s;
                n.readyState === 3 && ((s = this._opts.cookieJar) === null || s === void 0 || s.parseCookies(n.getResponseHeader("set-cookie"))), n.readyState === 4 && (n.status === 200 || n.status === 1223 ? this._onLoad() : this.setTimeoutFn(() => {
                    this._onError(typeof n.status == "number" ? n.status : 0)
                }, 0))
            }, n.send(this._data)
        } catch (s) {
            this.setTimeoutFn(() => {
                this._onError(s)
            }, 0);
            return
        }
        typeof document < "u" && (this._index = U.requestsCount++, U.requests[this._index] = this)
    }
    _onError(e) {
        this.emitReserved("error", e, this._xhr), this._cleanup(!0)
    }
    _cleanup(e) {
        if (!(typeof this._xhr > "u" || this._xhr === null)) {
            if (this._xhr.onreadystatechange = ws, e) try {
                this._xhr.abort()
            } catch {}
            typeof document < "u" && delete U.requests[this._index], this._xhr = null
        }
    }
    _onLoad() {
        const e = this._xhr.responseText;
        e !== null && (this.emitReserved("data", e), this.emitReserved("success"), this._cleanup())
    }
    abort() {
        this._cleanup()
    }
}
U.requestsCount = 0;
U.requests = {};
if (typeof document < "u") {
    if (typeof attachEvent == "function") attachEvent("onunload", St);
    else if (typeof addEventListener == "function") {
        const r = "onpagehide" in N ? "pagehide" : "unload";
        addEventListener(r, St, !1)
    }
}

function St() {
    for (let r in U.requests) U.requests.hasOwnProperty(r) && U.requests[r].abort()
}
const ks = function() {
    const r = Kt({
        xdomain: !1
    });
    return r && r.responseType !== null
}();
class Es extends bs {
    constructor(e) {
        super(e);
        const t = e && e.forceBase64;
        this.supportsBinary = ks && !t
    }
    request(e = {}) {
        return Object.assign(e, {
            xd: this.xd
        }, this.opts), new U(Kt, this.uri(), e)
    }
}

function Kt(r) {
    const e = r.xdomain;
    try {
        if (typeof XMLHttpRequest < "u" && (!e || ys)) return new XMLHttpRequest
    } catch {}
    if (!e) try {
        return new N[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP")
    } catch {}
}
const Wt = typeof navigator < "u" && typeof navigator.product == "string" && navigator.product.toLowerCase() === "reactnative";
class vs extends Ze {
    get name() {
        return "websocket"
    }
    doOpen() {
        const e = this.uri(),
            t = this.opts.protocols,
            n = Wt ? {} : $t(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
        this.opts.extraHeaders && (n.headers = this.opts.extraHeaders);
        try {
            this.ws = this.createSocket(e, t, n)
        } catch (s) {
            return this.emitReserved("error", s)
        }
        this.ws.binaryType = this.socket.binaryType, this.addEventListeners()
    }
    addEventListeners() {
        this.ws.onopen = () => {
            this.opts.autoUnref && this.ws._socket.unref(), this.onOpen()
        }, this.ws.onclose = e => this.onClose({
            description: "websocket connection closed",
            context: e
        }), this.ws.onmessage = e => this.onData(e.data), this.ws.onerror = e => this.onError("websocket error", e)
    }
    write(e) {
        this.writable = !1;
        for (let t = 0; t < e.length; t++) {
            const n = e[t],
                s = t === e.length - 1;
            je(n, this.supportsBinary, o => {
                try {
                    this.doWrite(n, o)
                } catch {}
                s && Pe(() => {
                    this.writable = !0, this.emitReserved("drain")
                }, this.setTimeoutFn)
            })
        }
    }
    doClose() {
        typeof this.ws < "u" && (this.ws.onerror = () => {}, this.ws.close(), this.ws = null)
    }
    uri() {
        const e = this.opts.secure ? "wss" : "ws",
            t = this.query || {};
        return this.opts.timestampRequests && (t[this.opts.timestampParam] = Ut()), this.supportsBinary || (t.b64 = 1), this.createUri(e, t)
    }
}
const Fe = N.WebSocket || N.MozWebSocket;
class Ss extends vs {
    createSocket(e, t, n) {
        return Wt ? new Fe(e, t, n) : t ? new Fe(e, t) : new Fe(e)
    }
    doWrite(e, t) {
        this.ws.send(t)
    }
}
class _s extends Ze {
    get name() {
        return "webtransport"
    }
    doOpen() {
        try {
            this._transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name])
        } catch (e) {
            return this.emitReserved("error", e)
        }
        this._transport.closed.then(() => {
            this.onClose()
        }).catch(e => {
            this.onError("webtransport error", e)
        }), this._transport.ready.then(() => {
            this._transport.createBidirectionalStream().then(e => {
                const t = os(Number.MAX_SAFE_INTEGER, this.socket.binaryType),
                    n = e.readable.pipeThrough(t).getReader(),
                    s = ss();
                s.readable.pipeTo(e.writable), this._writer = s.writable.getWriter();
                const o = () => {
                    n.read().then(({
                        done: a,
                        value: c
                    }) => {
                        a || (this.onPacket(c), o())
                    }).catch(a => {})
                };
                o();
                const i = {
                    type: "open"
                };
                this.query.sid && (i.data = `{"sid":"${this.query.sid}"}`), this._writer.write(i).then(() => this.onOpen())
            })
        })
    }
    write(e) {
        this.writable = !1;
        for (let t = 0; t < e.length; t++) {
            const n = e[t],
                s = t === e.length - 1;
            this._writer.write(n).then(() => {
                s && Pe(() => {
                    this.writable = !0, this.emitReserved("drain")
                }, this.setTimeoutFn)
            })
        }
    }
    doClose() {
        var e;
        (e = this._transport) === null || e === void 0 || e.close()
    }
}
const xs = {
        websocket: Ss,
        webtransport: _s,
        polling: Es
    },
    Ts = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/,
    Cs = ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"];

function Ke(r) {
    if (r.length > 8e3) throw "URI too long";
    const e = r,
        t = r.indexOf("["),
        n = r.indexOf("]");
    t != -1 && n != -1 && (r = r.substring(0, t) + r.substring(t, n).replace(/:/g, ";") + r.substring(n, r.length));
    let s = Ts.exec(r || ""),
        o = {},
        i = 14;
    for (; i--;) o[Cs[i]] = s[i] || "";
    return t != -1 && n != -1 && (o.source = e, o.host = o.host.substring(1, o.host.length - 1).replace(/;/g, ":"), o.authority = o.authority.replace("[", "").replace("]", "").replace(/;/g, ":"), o.ipv6uri = !0), o.pathNames = As(o, o.path), o.queryKey = Ms(o, o.query), o
}

function As(r, e) {
    const t = /\/{2,9}/g,
        n = e.replace(t, "/").split("/");
    return (e.slice(0, 1) == "/" || e.length === 0) && n.splice(0, 1), e.slice(-1) == "/" && n.splice(n.length - 1, 1), n
}

function Ms(r, e) {
    const t = {};
    return e.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function(n, s, o) {
        s && (t[s] = o)
    }), t
}
const We = typeof addEventListener == "function" && typeof removeEventListener == "function",
    _e = [];
We && addEventListener("offline", () => {
    _e.forEach(r => r())
}, !1);
class V extends S {
    constructor(e, t) {
        if (super(), this.binaryType = as, this.writeBuffer = [], this._prevBufferLen = 0, this._pingInterval = -1, this._pingTimeout = -1, this._maxPayload = -1, this._pingTimeoutTime = 1 / 0, e && typeof e == "object" && (t = e, e = null), e) {
            const n = Ke(e);
            t.hostname = n.host, t.secure = n.protocol === "https" || n.protocol === "wss", t.port = n.port, n.query && (t.query = n.query)
        } else t.host && (t.hostname = Ke(t.host).host);
        Le(this, t), this.secure = t.secure != null ? t.secure : typeof location < "u" && location.protocol === "https:", t.hostname && !t.port && (t.port = this.secure ? "443" : "80"), this.hostname = t.hostname || (typeof location < "u" ? location.hostname : "localhost"), this.port = t.port || (typeof location < "u" && location.port ? location.port : this.secure ? "443" : "80"), this.transports = [], this._transportsByName = {}, t.transports.forEach(n => {
            const s = n.prototype.name;
            this.transports.push(s), this._transportsByName[s] = n
        }), this.opts = Object.assign({
            path: "/engine.io",
            agent: !1,
            withCredentials: !1,
            upgrade: !0,
            timestampParam: "t",
            rememberUpgrade: !1,
            addTrailingSlash: !0,
            rejectUnauthorized: !0,
            perMessageDeflate: {
                threshold: 1024
            },
            transportOptions: {},
            closeOnBeforeunload: !1
        }, t), this.opts.path = this.opts.path.replace(/\/$/, "") + (this.opts.addTrailingSlash ? "/" : ""), typeof this.opts.query == "string" && (this.opts.query = fs(this.opts.query)), We && (this.opts.closeOnBeforeunload && (this._beforeunloadEventListener = () => {
            this.transport && (this.transport.removeAllListeners(), this.transport.close())
        }, addEventListener("beforeunload", this._beforeunloadEventListener, !1)), this.hostname !== "localhost" && (this._offlineEventListener = () => {
            this._onClose("transport close", {
                description: "network connection lost"
            })
        }, _e.push(this._offlineEventListener))), this.opts.withCredentials && (this._cookieJar = void 0), this._open()
    }
    createTransport(e) {
        const t = Object.assign({}, this.opts.query);
        t.EIO = Ht, t.transport = e, this.id && (t.sid = this.id);
        const n = Object.assign({}, this.opts, {
            query: t,
            socket: this,
            hostname: this.hostname,
            secure: this.secure,
            port: this.port
        }, this.opts.transportOptions[e]);
        return new this._transportsByName[e](n)
    }
    _open() {
        if (this.transports.length === 0) {
            this.setTimeoutFn(() => {
                this.emitReserved("error", "No transports available")
            }, 0);
            return
        }
        const e = this.opts.rememberUpgrade && V.priorWebsocketSuccess && this.transports.indexOf("websocket") !== -1 ? "websocket" : this.transports[0];
        this.readyState = "opening";
        const t = this.createTransport(e);
        t.open(), this.setTransport(t)
    }
    setTransport(e) {
        this.transport && this.transport.removeAllListeners(), this.transport = e, e.on("drain", this._onDrain.bind(this)).on("packet", this._onPacket.bind(this)).on("error", this._onError.bind(this)).on("close", t => this._onClose("transport close", t))
    }
    onOpen() {
        this.readyState = "open", V.priorWebsocketSuccess = this.transport.name === "websocket", this.emitReserved("open"), this.flush()
    }
    _onPacket(e) {
        if (this.readyState === "opening" || this.readyState === "open" || this.readyState === "closing") switch (this.emitReserved("packet", e), this.emitReserved("heartbeat"), e.type) {
            case "open":
                this.onHandshake(JSON.parse(e.data));
                break;
            case "ping":
                this._sendPacket("pong"), this.emitReserved("ping"), this.emitReserved("pong"), this._resetPingTimeout();
                break;
            case "error":
                const t = new Error("server error");
                t.code = e.data, this._onError(t);
                break;
            case "message":
                this.emitReserved("data", e.data), this.emitReserved("message", e.data);
                break
        }
    }
    onHandshake(e) {
        this.emitReserved("handshake", e), this.id = e.sid, this.transport.query.sid = e.sid, this._pingInterval = e.pingInterval, this._pingTimeout = e.pingTimeout, this._maxPayload = e.maxPayload, this.onOpen(), this.readyState !== "closed" && this._resetPingTimeout()
    }
    _resetPingTimeout() {
        this.clearTimeoutFn(this._pingTimeoutTimer);
        const e = this._pingInterval + this._pingTimeout;
        this._pingTimeoutTime = Date.now() + e, this._pingTimeoutTimer = this.setTimeoutFn(() => {
            this._onClose("ping timeout")
        }, e), this.opts.autoUnref && this._pingTimeoutTimer.unref()
    }
    _onDrain() {
        this.writeBuffer.splice(0, this._prevBufferLen), this._prevBufferLen = 0, this.writeBuffer.length === 0 ? this.emitReserved("drain") : this.flush()
    }
    flush() {
        if (this.readyState !== "closed" && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
            const e = this._getWritablePackets();
            this.transport.send(e), this._prevBufferLen = e.length, this.emitReserved("flush")
        }
    }
    _getWritablePackets() {
        if (!(this._maxPayload && this.transport.name === "polling" && this.writeBuffer.length > 1)) return this.writeBuffer;
        let t = 1;
        for (let n = 0; n < this.writeBuffer.length; n++) {
            const s = this.writeBuffer[n].data;
            if (s && (t += ds(s)), n > 0 && t > this._maxPayload) return this.writeBuffer.slice(0, n);
            t += 2
        }
        return this.writeBuffer
    }
    _hasPingExpired() {
        if (!this._pingTimeoutTime) return !0;
        const e = Date.now() > this._pingTimeoutTime;
        return e && (this._pingTimeoutTime = 0, Pe(() => {
            this._onClose("ping timeout")
        }, this.setTimeoutFn)), e
    }
    write(e, t, n) {
        return this._sendPacket("message", e, t, n), this
    }
    send(e, t, n) {
        return this._sendPacket("message", e, t, n), this
    }
    _sendPacket(e, t, n, s) {
        if (typeof t == "function" && (s = t, t = void 0), typeof n == "function" && (s = n, n = null), this.readyState === "closing" || this.readyState === "closed") return;
        n = n || {}, n.compress = n.compress !== !1;
        const o = {
            type: e,
            data: t,
            options: n
        };
        this.emitReserved("packetCreate", o), this.writeBuffer.push(o), s && this.once("flush", s), this.flush()
    }
    close() {
        const e = () => {
                this._onClose("forced close"), this.transport.close()
            },
            t = () => {
                this.off("upgrade", t), this.off("upgradeError", t), e()
            },
            n = () => {
                this.once("upgrade", t), this.once("upgradeError", t)
            };
        return (this.readyState === "opening" || this.readyState === "open") && (this.readyState = "closing", this.writeBuffer.length ? this.once("drain", () => {
            this.upgrading ? n() : e()
        }) : this.upgrading ? n() : e()), this
    }
    _onError(e) {
        if (V.priorWebsocketSuccess = !1, this.opts.tryAllTransports && this.transports.length > 1 && this.readyState === "opening") return this.transports.shift(), this._open();
        this.emitReserved("error", e), this._onClose("transport error", e)
    }
    _onClose(e, t) {
        if (this.readyState === "opening" || this.readyState === "open" || this.readyState === "closing") {
            if (this.clearTimeoutFn(this._pingTimeoutTimer), this.transport.removeAllListeners("close"), this.transport.close(), this.transport.removeAllListeners(), We && (this._beforeunloadEventListener && removeEventListener("beforeunload", this._beforeunloadEventListener, !1), this._offlineEventListener)) {
                const n = _e.indexOf(this._offlineEventListener);
                n !== -1 && _e.splice(n, 1)
            }
            this.readyState = "closed", this.id = null, this.emitReserved("close", e, t), this.writeBuffer = [], this._prevBufferLen = 0
        }
    }
}
V.protocol = Ht;
class Rs extends V {
    constructor() {
        super(...arguments), this._upgrades = []
    }
    onOpen() {
        if (super.onOpen(), this.readyState === "open" && this.opts.upgrade)
            for (let e = 0; e < this._upgrades.length; e++) this._probe(this._upgrades[e])
    }
    _probe(e) {
        let t = this.createTransport(e),
            n = !1;
        V.priorWebsocketSuccess = !1;
        const s = () => {
            n || (t.send([{
                type: "ping",
                data: "probe"
            }]), t.once("packet", d => {
                if (!n)
                    if (d.type === "pong" && d.data === "probe") {
                        if (this.upgrading = !0, this.emitReserved("upgrading", t), !t) return;
                        V.priorWebsocketSuccess = t.name === "websocket", this.transport.pause(() => {
                            n || this.readyState !== "closed" && (u(), this.setTransport(t), t.send([{
                                type: "upgrade"
                            }]), this.emitReserved("upgrade", t), t = null, this.upgrading = !1, this.flush())
                        })
                    } else {
                        const h = new Error("probe error");
                        h.transport = t.name, this.emitReserved("upgradeError", h)
                    }
            }))
        };

        function o() {
            n || (n = !0, u(), t.close(), t = null)
        }
        const i = d => {
            const h = new Error("probe error: " + d);
            h.transport = t.name, o(), this.emitReserved("upgradeError", h)
        };

        function a() {
            i("transport closed")
        }

        function c() {
            i("socket closed")
        }

        function l(d) {
            t && d.name !== t.name && o()
        }
        const u = () => {
            t.removeListener("open", s), t.removeListener("error", i), t.removeListener("close", a), this.off("close", c), this.off("upgrading", l)
        };
        t.once("open", s), t.once("error", i), t.once("close", a), this.once("close", c), this.once("upgrading", l), this._upgrades.indexOf("webtransport") !== -1 && e !== "webtransport" ? this.setTimeoutFn(() => {
            n || t.open()
        }, 200) : t.open()
    }
    onHandshake(e) {
        this._upgrades = this._filterUpgrades(e.upgrades), super.onHandshake(e)
    }
    _filterUpgrades(e) {
        const t = [];
        for (let n = 0; n < e.length; n++) ~this.transports.indexOf(e[n]) && t.push(e[n]);
        return t
    }
}
let Ps = class extends Rs {
    constructor(e, t = {}) {
        const n = typeof e == "object" ? e : t;
        (!n.transports || n.transports && typeof n.transports[0] == "string") && (n.transports = (n.transports || ["polling", "websocket", "webtransport"]).map(s => xs[s]).filter(s => !!s)), super(e, n)
    }
};

function Ls(r, e = "", t) {
    let n = r;
    t = t || typeof location < "u" && location, r == null && (r = t.protocol + "//" + t.host), typeof r == "string" && (r.charAt(0) === "/" && (r.charAt(1) === "/" ? r = t.protocol + r : r = t.host + r), /^(https?|wss?):\/\//.test(r) || (typeof t < "u" ? r = t.protocol + "//" + r : r = "https://" + r), n = Ke(r)), n.port || (/^(http|ws)$/.test(n.protocol) ? n.port = "80" : /^(http|ws)s$/.test(n.protocol) && (n.port = "443")), n.path = n.path || "/";
    const o = n.host.indexOf(":") !== -1 ? "[" + n.host + "]" : n.host;
    return n.id = n.protocol + "://" + o + ":" + n.port + e, n.href = n.protocol + "://" + o + (t && t.port === n.port ? "" : ":" + n.port), n
}
const Is = typeof ArrayBuffer == "function",
    Ns = r => typeof ArrayBuffer.isView == "function" ? ArrayBuffer.isView(r) : r.buffer instanceof ArrayBuffer,
    qt = Object.prototype.toString,
    Os = typeof Blob == "function" || typeof Blob < "u" && qt.call(Blob) === "[object BlobConstructor]",
    Bs = typeof File == "function" || typeof File < "u" && qt.call(File) === "[object FileConstructor]";

function et(r) {
    return Is && (r instanceof ArrayBuffer || Ns(r)) || Os && r instanceof Blob || Bs && r instanceof File
}

function xe(r, e) {
    if (!r || typeof r != "object") return !1;
    if (Array.isArray(r)) {
        for (let t = 0, n = r.length; t < n; t++)
            if (xe(r[t])) return !0;
        return !1
    }
    if (et(r)) return !0;
    if (r.toJSON && typeof r.toJSON == "function" && arguments.length === 1) return xe(r.toJSON(), !0);
    for (const t in r)
        if (Object.prototype.hasOwnProperty.call(r, t) && xe(r[t])) return !0;
    return !1
}

function Ds(r) {
    const e = [],
        t = r.data,
        n = r;
    return n.data = qe(t, e), n.attachments = e.length, {
        packet: n,
        buffers: e
    }
}

function qe(r, e) {
    if (!r) return r;
    if (et(r)) {
        const t = {
            _placeholder: !0,
            num: e.length
        };
        return e.push(r), t
    } else if (Array.isArray(r)) {
        const t = new Array(r.length);
        for (let n = 0; n < r.length; n++) t[n] = qe(r[n], e);
        return t
    } else if (typeof r == "object" && !(r instanceof Date)) {
        const t = {};
        for (const n in r) Object.prototype.hasOwnProperty.call(r, n) && (t[n] = qe(r[n], e));
        return t
    }
    return r
}

function Fs(r, e) {
    return r.data = Ve(r.data, e), delete r.attachments, r
}

function Ve(r, e) {
    if (!r) return r;
    if (r && r._placeholder === !0) {
        if (typeof r.num == "number" && r.num >= 0 && r.num < e.length) return e[r.num];
        throw new Error("illegal attachments")
    } else if (Array.isArray(r))
        for (let t = 0; t < r.length; t++) r[t] = Ve(r[t], e);
    else if (typeof r == "object")
        for (const t in r) Object.prototype.hasOwnProperty.call(r, t) && (r[t] = Ve(r[t], e));
    return r
}
const Hs = ["connect", "connect_error", "disconnect", "disconnecting", "newListener", "removeListener"],
    $s = 5;
var f;
(function(r) {
    r[r.CONNECT = 0] = "CONNECT", r[r.DISCONNECT = 1] = "DISCONNECT", r[r.EVENT = 2] = "EVENT", r[r.ACK = 3] = "ACK", r[r.CONNECT_ERROR = 4] = "CONNECT_ERROR", r[r.BINARY_EVENT = 5] = "BINARY_EVENT", r[r.BINARY_ACK = 6] = "BINARY_ACK"
})(f || (f = {}));
class Us {
    constructor(e) {
        this.replacer = e
    }
    encode(e) {
        return (e.type === f.EVENT || e.type === f.ACK) && xe(e) ? this.encodeAsBinary({
            type: e.type === f.EVENT ? f.BINARY_EVENT : f.BINARY_ACK,
            nsp: e.nsp,
            data: e.data,
            id: e.id
        }) : [this.encodeAsString(e)]
    }
    encodeAsString(e) {
        let t = "" + e.type;
        return (e.type === f.BINARY_EVENT || e.type === f.BINARY_ACK) && (t += e.attachments + "-"), e.nsp && e.nsp !== "/" && (t += e.nsp + ","), e.id != null && (t += e.id), e.data != null && (t += JSON.stringify(e.data, this.replacer)), t
    }
    encodeAsBinary(e) {
        const t = Ds(e),
            n = this.encodeAsString(t.packet),
            s = t.buffers;
        return s.unshift(n), s
    }
}

function _t(r) {
    return Object.prototype.toString.call(r) === "[object Object]"
}
class tt extends S {
    constructor(e) {
        super(), this.reviver = e
    }
    add(e) {
        let t;
        if (typeof e == "string") {
            if (this.reconstructor) throw new Error("got plaintext data when reconstructing a packet");
            t = this.decodeString(e);
            const n = t.type === f.BINARY_EVENT;
            n || t.type === f.BINARY_ACK ? (t.type = n ? f.EVENT : f.ACK, this.reconstructor = new zs(t), t.attachments === 0 && super.emitReserved("decoded", t)) : super.emitReserved("decoded", t)
        } else if (et(e) || e.base64)
            if (this.reconstructor) t = this.reconstructor.takeBinaryData(e), t && (this.reconstructor = null, super.emitReserved("decoded", t));
            else throw new Error("got binary data when not reconstructing a packet");
        else throw new Error("Unknown type: " + e)
    }
    decodeString(e) {
        let t = 0;
        const n = {
            type: Number(e.charAt(0))
        };
        if (f[n.type] === void 0) throw new Error("unknown packet type " + n.type);
        if (n.type === f.BINARY_EVENT || n.type === f.BINARY_ACK) {
            const o = t + 1;
            for (; e.charAt(++t) !== "-" && t != e.length;);
            const i = e.substring(o, t);
            if (i != Number(i) || e.charAt(t) !== "-") throw new Error("Illegal attachments");
            n.attachments = Number(i)
        }
        if (e.charAt(t + 1) === "/") {
            const o = t + 1;
            for (; ++t && !(e.charAt(t) === "," || t === e.length););
            n.nsp = e.substring(o, t)
        } else n.nsp = "/";
        const s = e.charAt(t + 1);
        if (s !== "" && Number(s) == s) {
            const o = t + 1;
            for (; ++t;) {
                const i = e.charAt(t);
                if (i == null || Number(i) != i) {
                    --t;
                    break
                }
                if (t === e.length) break
            }
            n.id = Number(e.substring(o, t + 1))
        }
        if (e.charAt(++t)) {
            const o = this.tryParse(e.substr(t));
            if (tt.isPayloadValid(n.type, o)) n.data = o;
            else throw new Error("invalid payload")
        }
        return n
    }
    tryParse(e) {
        try {
            return JSON.parse(e, this.reviver)
        } catch {
            return !1
        }
    }
    static isPayloadValid(e, t) {
        switch (e) {
            case f.CONNECT:
                return _t(t);
            case f.DISCONNECT:
                return t === void 0;
            case f.CONNECT_ERROR:
                return typeof t == "string" || _t(t);
            case f.EVENT:
            case f.BINARY_EVENT:
                return Array.isArray(t) && (typeof t[0] == "number" || typeof t[0] == "string" && Hs.indexOf(t[0]) === -1);
            case f.ACK:
            case f.BINARY_ACK:
                return Array.isArray(t)
        }
    }
    destroy() {
        this.reconstructor && (this.reconstructor.finishedReconstruction(), this.reconstructor = null)
    }
}
class zs {
    constructor(e) {
        this.packet = e, this.buffers = [], this.reconPack = e
    }
    takeBinaryData(e) {
        if (this.buffers.push(e), this.buffers.length === this.reconPack.attachments) {
            const t = Fs(this.reconPack, this.buffers);
            return this.finishedReconstruction(), t
        }
        return null
    }
    finishedReconstruction() {
        this.reconPack = null, this.buffers = []
    }
}
const Ks = Object.freeze(Object.defineProperty({
    __proto__: null,
    Decoder: tt,
    Encoder: Us,
    get PacketType() {
        return f
    },
    protocol: $s
}, Symbol.toStringTag, {
    value: "Module"
}));

function F(r, e, t) {
    return r.on(e, t),
        function() {
            r.off(e, t)
        }
}
const Ws = Object.freeze({
    connect: 1,
    connect_error: 1,
    disconnect: 1,
    disconnecting: 1,
    newListener: 1,
    removeListener: 1
});
class Vt extends S {
    constructor(e, t, n) {
        super(), this.connected = !1, this.recovered = !1, this.receiveBuffer = [], this.sendBuffer = [], this._queue = [], this._queueSeq = 0, this.ids = 0, this.acks = {}, this.flags = {}, this.io = e, this.nsp = t, n && n.auth && (this.auth = n.auth), this._opts = Object.assign({}, n), this.io._autoConnect && this.open()
    }
    get disconnected() {
        return !this.connected
    }
    subEvents() {
        if (this.subs) return;
        const e = this.io;
        this.subs = [F(e, "open", this.onopen.bind(this)), F(e, "packet", this.onpacket.bind(this)), F(e, "error", this.onerror.bind(this)), F(e, "close", this.onclose.bind(this))]
    }
    get active() {
        return !!this.subs
    }
    connect() {
        return this.connected ? this : (this.subEvents(), this.io._reconnecting || this.io.open(), this.io._readyState === "open" && this.onopen(), this)
    }
    open() {
        return this.connect()
    }
    send(...e) {
        return e.unshift("message"), this.emit.apply(this, e), this
    }
    emit(e, ...t) {
        var n, s, o;
        if (Ws.hasOwnProperty(e)) throw new Error('"' + e.toString() + '" is a reserved event name');
        if (t.unshift(e), this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) return this._addToQueue(t), this;
        const i = {
            type: f.EVENT,
            data: t
        };
        if (i.options = {}, i.options.compress = this.flags.compress !== !1, typeof t[t.length - 1] == "function") {
            const u = this.ids++,
                d = t.pop();
            this._registerAckCallback(u, d), i.id = u
        }
        const a = (s = (n = this.io.engine) === null || n === void 0 ? void 0 : n.transport) === null || s === void 0 ? void 0 : s.writable,
            c = this.connected && !(!((o = this.io.engine) === null || o === void 0) && o._hasPingExpired());
        return this.flags.volatile && !a || (c ? (this.notifyOutgoingListeners(i), this.packet(i)) : this.sendBuffer.push(i)), this.flags = {}, this
    }
    _registerAckCallback(e, t) {
        var n;
        const s = (n = this.flags.timeout) !== null && n !== void 0 ? n : this._opts.ackTimeout;
        if (s === void 0) {
            this.acks[e] = t;
            return
        }
        const o = this.io.setTimeoutFn(() => {
                delete this.acks[e];
                for (let a = 0; a < this.sendBuffer.length; a++) this.sendBuffer[a].id === e && this.sendBuffer.splice(a, 1);
                t.call(this, new Error("operation has timed out"))
            }, s),
            i = (...a) => {
                this.io.clearTimeoutFn(o), t.apply(this, a)
            };
        i.withError = !0, this.acks[e] = i
    }
    emitWithAck(e, ...t) {
        return new Promise((n, s) => {
            const o = (i, a) => i ? s(i) : n(a);
            o.withError = !0, t.push(o), this.emit(e, ...t)
        })
    }
    _addToQueue(e) {
        let t;
        typeof e[e.length - 1] == "function" && (t = e.pop());
        const n = {
            id: this._queueSeq++,
            tryCount: 0,
            pending: !1,
            args: e,
            flags: Object.assign({
                fromQueue: !0
            }, this.flags)
        };
        e.push((s, ...o) => n !== this._queue[0] ? void 0 : (s !== null ? n.tryCount > this._opts.retries && (this._queue.shift(), t && t(s)) : (this._queue.shift(), t && t(null, ...o)), n.pending = !1, this._drainQueue())), this._queue.push(n), this._drainQueue()
    }
    _drainQueue(e = !1) {
        if (!this.connected || this._queue.length === 0) return;
        const t = this._queue[0];
        t.pending && !e || (t.pending = !0, t.tryCount++, this.flags = t.flags, this.emit.apply(this, t.args))
    }
    packet(e) {
        e.nsp = this.nsp, this.io._packet(e)
    }
    onopen() {
        typeof this.auth == "function" ? this.auth(e => {
            this._sendConnectPacket(e)
        }) : this._sendConnectPacket(this.auth)
    }
    _sendConnectPacket(e) {
        this.packet({
            type: f.CONNECT,
            data: this._pid ? Object.assign({
                pid: this._pid,
                offset: this._lastOffset
            }, e) : e
        })
    }
    onerror(e) {
        this.connected || this.emitReserved("connect_error", e)
    }
    onclose(e, t) {
        this.connected = !1, delete this.id, this.emitReserved("disconnect", e, t), this._clearAcks()
    }
    _clearAcks() {
        Object.keys(this.acks).forEach(e => {
            if (!this.sendBuffer.some(n => String(n.id) === e)) {
                const n = this.acks[e];
                delete this.acks[e], n.withError && n.call(this, new Error("socket has been disconnected"))
            }
        })
    }
    onpacket(e) {
        if (e.nsp === this.nsp) switch (e.type) {
            case f.CONNECT:
                e.data && e.data.sid ? this.onconnect(e.data.sid, e.data.pid) : this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
                break;
            case f.EVENT:
            case f.BINARY_EVENT:
                this.onevent(e);
                break;
            case f.ACK:
            case f.BINARY_ACK:
                this.onack(e);
                break;
            case f.DISCONNECT:
                this.ondisconnect();
                break;
            case f.CONNECT_ERROR:
                this.destroy();
                const n = new Error(e.data.message);
                n.data = e.data.data, this.emitReserved("connect_error", n);
                break
        }
    }
    onevent(e) {
        const t = e.data || [];
        e.id != null && t.push(this.ack(e.id)), this.connected ? this.emitEvent(t) : this.receiveBuffer.push(Object.freeze(t))
    }
    emitEvent(e) {
        if (this._anyListeners && this._anyListeners.length) {
            const t = this._anyListeners.slice();
            for (const n of t) n.apply(this, e)
        }
        super.emit.apply(this, e), this._pid && e.length && typeof e[e.length - 1] == "string" && (this._lastOffset = e[e.length - 1])
    }
    ack(e) {
        const t = this;
        let n = !1;
        return function(...s) {
            n || (n = !0, t.packet({
                type: f.ACK,
                id: e,
                data: s
            }))
        }
    }
    onack(e) {
        const t = this.acks[e.id];
        typeof t == "function" && (delete this.acks[e.id], t.withError && e.data.unshift(null), t.apply(this, e.data))
    }
    onconnect(e, t) {
        this.id = e, this.recovered = t && this._pid === t, this._pid = t, this.connected = !0, this.emitBuffered(), this.emitReserved("connect"), this._drainQueue(!0)
    }
    emitBuffered() {
        this.receiveBuffer.forEach(e => this.emitEvent(e)), this.receiveBuffer = [], this.sendBuffer.forEach(e => {
            this.notifyOutgoingListeners(e), this.packet(e)
        }), this.sendBuffer = []
    }
    ondisconnect() {
        this.destroy(), this.onclose("io server disconnect")
    }
    destroy() {
        this.subs && (this.subs.forEach(e => e()), this.subs = void 0), this.io._destroy(this)
    }
    disconnect() {
        return this.connected && this.packet({
            type: f.DISCONNECT
        }), this.destroy(), this.connected && this.onclose("io client disconnect"), this
    }
    close() {
        return this.disconnect()
    }
    compress(e) {
        return this.flags.compress = e, this
    }
    get volatile() {
        return this.flags.volatile = !0, this
    }
    timeout(e) {
        return this.flags.timeout = e, this
    }
    onAny(e) {
        return this._anyListeners = this._anyListeners || [], this._anyListeners.push(e), this
    }
    prependAny(e) {
        return this._anyListeners = this._anyListeners || [], this._anyListeners.unshift(e), this
    }
    offAny(e) {
        if (!this._anyListeners) return this;
        if (e) {
            const t = this._anyListeners;
            for (let n = 0; n < t.length; n++)
                if (e === t[n]) return t.splice(n, 1), this
        } else this._anyListeners = [];
        return this
    }
    listenersAny() {
        return this._anyListeners || []
    }
    onAnyOutgoing(e) {
        return this._anyOutgoingListeners = this._anyOutgoingListeners || [], this._anyOutgoingListeners.push(e), this
    }
    prependAnyOutgoing(e) {
        return this._anyOutgoingListeners = this._anyOutgoingListeners || [], this._anyOutgoingListeners.unshift(e), this
    }
    offAnyOutgoing(e) {
        if (!this._anyOutgoingListeners) return this;
        if (e) {
            const t = this._anyOutgoingListeners;
            for (let n = 0; n < t.length; n++)
                if (e === t[n]) return t.splice(n, 1), this
        } else this._anyOutgoingListeners = [];
        return this
    }
    listenersAnyOutgoing() {
        return this._anyOutgoingListeners || []
    }
    notifyOutgoingListeners(e) {
        if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
            const t = this._anyOutgoingListeners.slice();
            for (const n of t) n.apply(this, e.data)
        }
    }
}

function oe(r) {
    r = r || {}, this.ms = r.min || 100, this.max = r.max || 1e4, this.factor = r.factor || 2, this.jitter = r.jitter > 0 && r.jitter <= 1 ? r.jitter : 0, this.attempts = 0
}
oe.prototype.duration = function() {
    var r = this.ms * Math.pow(this.factor, this.attempts++);
    if (this.jitter) {
        var e = Math.random(),
            t = Math.floor(e * this.jitter * r);
        r = Math.floor(e * 10) & 1 ? r + t : r - t
    }
    return Math.min(r, this.max) | 0
};
oe.prototype.reset = function() {
    this.attempts = 0
};
oe.prototype.setMin = function(r) {
    this.ms = r
};
oe.prototype.setMax = function(r) {
    this.max = r
};
oe.prototype.setJitter = function(r) {
    this.jitter = r
};
class Ye extends S {
    constructor(e, t) {
        var n;
        super(), this.nsps = {}, this.subs = [], e && typeof e == "object" && (t = e, e = void 0), t = t || {}, t.path = t.path || "/socket.io", this.opts = t, Le(this, t), this.reconnection(t.reconnection !== !1), this.reconnectionAttempts(t.reconnectionAttempts || 1 / 0), this.reconnectionDelay(t.reconnectionDelay || 1e3), this.reconnectionDelayMax(t.reconnectionDelayMax || 5e3), this.randomizationFactor((n = t.randomizationFactor) !== null && n !== void 0 ? n : .5), this.backoff = new oe({
            min: this.reconnectionDelay(),
            max: this.reconnectionDelayMax(),
            jitter: this.randomizationFactor()
        }), this.timeout(t.timeout == null ? 2e4 : t.timeout), this._readyState = "closed", this.uri = e;
        const s = t.parser || Ks;
        this.encoder = new s.Encoder, this.decoder = new s.Decoder, this._autoConnect = t.autoConnect !== !1, this._autoConnect && this.open()
    }
    reconnection(e) {
        return arguments.length ? (this._reconnection = !!e, e || (this.skipReconnect = !0), this) : this._reconnection
    }
    reconnectionAttempts(e) {
        return e === void 0 ? this._reconnectionAttempts : (this._reconnectionAttempts = e, this)
    }
    reconnectionDelay(e) {
        var t;
        return e === void 0 ? this._reconnectionDelay : (this._reconnectionDelay = e, (t = this.backoff) === null || t === void 0 || t.setMin(e), this)
    }
    randomizationFactor(e) {
        var t;
        return e === void 0 ? this._randomizationFactor : (this._randomizationFactor = e, (t = this.backoff) === null || t === void 0 || t.setJitter(e), this)
    }
    reconnectionDelayMax(e) {
        var t;
        return e === void 0 ? this._reconnectionDelayMax : (this._reconnectionDelayMax = e, (t = this.backoff) === null || t === void 0 || t.setMax(e), this)
    }
    timeout(e) {
        return arguments.length ? (this._timeout = e, this) : this._timeout
    }
    maybeReconnectOnOpen() {
        !this._reconnecting && this._reconnection && this.backoff.attempts === 0 && this.reconnect()
    }
    open(e) {
        if (~this._readyState.indexOf("open")) return this;
        this.engine = new Ps(this.uri, this.opts);
        const t = this.engine,
            n = this;
        this._readyState = "opening", this.skipReconnect = !1;
        const s = F(t, "open", function() {
                n.onopen(), e && e()
            }),
            o = a => {
                this.cleanup(), this._readyState = "closed", this.emitReserved("error", a), e ? e(a) : this.maybeReconnectOnOpen()
            },
            i = F(t, "error", o);
        if (this._timeout !== !1) {
            const a = this._timeout,
                c = this.setTimeoutFn(() => {
                    s(), o(new Error("timeout")), t.close()
                }, a);
            this.opts.autoUnref && c.unref(), this.subs.push(() => {
                this.clearTimeoutFn(c)
            })
        }
        return this.subs.push(s), this.subs.push(i), this
    }
    connect(e) {
        return this.open(e)
    }
    onopen() {
        this.cleanup(), this._readyState = "open", this.emitReserved("open");
        const e = this.engine;
        this.subs.push(F(e, "ping", this.onping.bind(this)), F(e, "data", this.ondata.bind(this)), F(e, "error", this.onerror.bind(this)), F(e, "close", this.onclose.bind(this)), F(this.decoder, "decoded", this.ondecoded.bind(this)))
    }
    onping() {
        this.emitReserved("ping")
    }
    ondata(e) {
        try {
            this.decoder.add(e)
        } catch (t) {
            this.onclose("parse error", t)
        }
    }
    ondecoded(e) {
        Pe(() => {
            this.emitReserved("packet", e)
        }, this.setTimeoutFn)
    }
    onerror(e) {
        this.emitReserved("error", e)
    }
    socket(e, t) {
        let n = this.nsps[e];
        return n ? this._autoConnect && !n.active && n.connect() : (n = new Vt(this, e, t), this.nsps[e] = n), n
    }
    _destroy(e) {
        const t = Object.keys(this.nsps);
        for (const n of t)
            if (this.nsps[n].active) return;
        this._close()
    }
    _packet(e) {
        const t = this.encoder.encode(e);
        for (let n = 0; n < t.length; n++) this.engine.write(t[n], e.options)
    }
    cleanup() {
        this.subs.forEach(e => e()), this.subs.length = 0, this.decoder.destroy()
    }
    _close() {
        this.skipReconnect = !0, this._reconnecting = !1, this.onclose("forced close")
    }
    disconnect() {
        return this._close()
    }
    onclose(e, t) {
        var n;
        this.cleanup(), (n = this.engine) === null || n === void 0 || n.close(), this.backoff.reset(), this._readyState = "closed", this.emitReserved("close", e, t), this._reconnection && !this.skipReconnect && this.reconnect()
    }
    reconnect() {
        if (this._reconnecting || this.skipReconnect) return this;
        const e = this;
        if (this.backoff.attempts >= this._reconnectionAttempts) this.backoff.reset(), this.emitReserved("reconnect_failed"), this._reconnecting = !1;
        else {
            const t = this.backoff.duration();
            this._reconnecting = !0;
            const n = this.setTimeoutFn(() => {
                e.skipReconnect || (this.emitReserved("reconnect_attempt", e.backoff.attempts), !e.skipReconnect && e.open(s => {
                    s ? (e._reconnecting = !1, e.reconnect(), this.emitReserved("reconnect_error", s)) : e.onreconnect()
                }))
            }, t);
            this.opts.autoUnref && n.unref(), this.subs.push(() => {
                this.clearTimeoutFn(n)
            })
        }
    }
    onreconnect() {
        const e = this.backoff.attempts;
        this._reconnecting = !1, this.backoff.reset(), this.emitReserved("reconnect", e)
    }
}
const le = {};

function Te(r, e) {
    typeof r == "object" && (e = r, r = void 0), e = e || {};
    const t = Ls(r, e.path || "/socket.io"),
        n = t.source,
        s = t.id,
        o = t.path,
        i = le[s] && o in le[s].nsps,
        a = e.forceNew || e["force new connection"] || e.multiplex === !1 || i;
    let c;
    return a ? c = new Ye(n, e) : (le[s] || (le[s] = new Ye(n, e)), c = le[s]), t.query && !e.query && (e.query = t.queryKey), c.socket(t.path, e)
}
Object.assign(Te, {
    Manager: Ye,
    Socket: Vt,
    io: Te,
    connect: Te
});
const _ = T("SocketBridge");
class Yt {
    constructor(e) {
        this.socket = null, this.clientId = "", this.sessionManager = e;
        const {
            socketEndpoint: t
        } = j.getEnvParams();
        this.endpoint = t, this.version = tn(), this.registerAuthListener()
    }
    emitUpstream(e) {
        if (!this.socket) {
            _.error("Socket not connected; cannot emit message", e);
            return
        }
        const t = Q.getBrowserSettings(),
            n = {
                id: Ee(),
                timestamp: Date.now(),
                clientId: this.clientId,
                ua: navigator.userAgent,
                version: this.version,
                browserName: t == null ? void 0 : t.browserName,
                allowOtherClient: t == null ? void 0 : t.allowCrossBrowser,
                skipAuthorization: (t == null ? void 0 : t.skipAuthorization) ?? !1
            };
        this.socket.emit("my_browser_extension_message", {
            ...n,
            ...e
        })
    }
    async connectSocket(e = !1) {
        if (this.socket) {
            if (!e) {
                _.warn("Failed to start socket.io connection. SocketBridge already started");
                return
            }
            _.info("Restarting socket.io connection, tearing down previous socket instance"), this.socket.removeAllListeners(), this.socket.disconnect(), this.socket = null
        }
        const t = de.getToken(),
            n = He.getDevBranch();
        this.clientId = await Me(), _.info("Connecting to Manus Node Server Socket.IO bridge", {
            endpoint: this.endpoint,
            restart: e
        });
        const s = {
            token: t ?? ""
        };
        n && (s.branch = n);
        const o = {
            transports: ["websocket"],
            autoConnect: !0,
            reconnection: !0,
            reconnectionAttempts: 1 / 0,
            reconnectionDelay: 1e3,
            reconnectionDelayMax: 5e3,
            query: s
        };
        _.debug("Connecting to Manus Node Server Socket.IO bridge", {
            payload: o
        }), this.socket = Te(this.endpoint, o), this.socket.on("connect", () => {
            this.emitExtensionActivation()
        }), this.socket.on("disconnect", i => {
            _.warn("Socket.IO disconnected", {
                reason: i
            })
        }), this.socket.on("connect_error", i => {
            _.error("Socket.IO connection error", {
                error: i.message
            })
        }), this.socket.on("ping", (i, a) => {
            a({
                status: "success",
                message: "pong"
            })
        }), this.socket.on("my_browser_extension_message", (i, a) => {
            if (!("clientId" in i && !this.checkMessageValidity(i.clientId))) switch (i.type) {
                case "browser_action":
                    this.handleBrowserActionRequest(i, a);
                    break;
                case "session_status":
                    this.handleSessionTaskRequest(i);
                    break;
                case "my_browser_extension_connected":
                    _.info("My Browser Extension connected", i);
                    break;
                default:
                    _.warn("Unknown message type", {
                        payload: i
                    })
            }
        })
    }
    emitDisconnectSession(e, t) {
        const n = {
            type: "disconnect_session",
            sessionId: e,
            reason: t
        };
        this.emitUpstream(n)
    }
    emitStopSession(e) {
        e && this.emitEventLog(e, "upstream", "extension_stop_session", {}), this.emitUpstream({
            type: "extension_stop_session",
            sessionId: e
        })
    }
    emitTakeOverSummary(e, t) {
        this.emitEventLog(e, "upstream", "extension_take_over_summary", {
            summaryLength: t.length
        }), this.emitUpstream({
            type: "extension_take_over_summary",
            sessionId: e,
            summary: t
        })
    }
    emitExtensionActivation() {
        this.emitUpstream({
            type: "activate_extension"
        })
    }
    registerAuthListener() {
        const e = () => {
            this.emitExtensionActivation()
        };
        Q.subscribeBrowserSettings(e);
        const t = () => {
            _.warn("token or devBranch changed, restarting socket.io connection"), this.connectSocket(!0)
        };
        de.subscribeToken(t), He.subscribeDevBranch(t)
    }
    checkMessageValidity(e) {
        return e !== this.clientId ? (_.error("Client ID mismatch", {
            receivedClientId: e,
            myClientId: this.clientId
        }), !1) : !0
    }
    async handleSessionTaskRequest(e) {
        const {
            sessionId: t,
            status: n
        } = e;
        try {
            this.emitEventLog(t, "downstream", "session_status", {
                status: n,
                sessionTitle: e.sessionTitle,
                error: e.error
            });
            const o = n ? {
                    running: "running",
                    stopped: "completed",
                    error: "stopped",
                    take_over: "takeover"
                } [n] : void 0,
                i = p.sessions.get(t);
            (i == null ? void 0 : i.tabId) !== void 0 ? o && await this.sessionManager.updateSessionStatus(t, {
                status: o,
                taskName: e == null ? void 0 : e.sessionTitle
            }) : i ? e.sessionTitle && (i.taskName = e.sessionTitle) : (p.sessions.set(t, {
                sessionId: t,
                taskName: e.sessionTitle,
                queue: Promise.resolve(),
                disposed: !1,
                status: "stopped",
                animationInterval: null
            }), _.info("Created lightweight session entry", {
                sessionId: t,
                taskName: e.sessionTitle
            }))
        } catch (s) {
            const o = s instanceof Error ? s.message : String(s);
            throw _.error("error handling session task request", {
                status: n,
                error: o
            }), s
        }
    }
    async handleBrowserActionRequest(e, t) {
        const {
            sessionId: n,
            id: s,
            action: o
        } = e, i = l => {
            t(l)
        };
        this.emitEventLog(n, "downstream", "browser_action", {
            actionId: s,
            action: o
        });
        let a;
        try {
            a = Tt(e.action)
        } catch (l) {
            const u = l instanceof Error ? l.message : String(l);
            _.error("Action conversion error", {
                sessionId: n,
                actionId: s,
                error: u
            }), i({
                sessionId: n,
                clientId: this.clientId,
                actionId: e.id,
                status: "error",
                result: {},
                error: u
            });
            return
        }
        if (!(a.type === "browser_navigate")) {
            const l = p.sessions.get(n);
            if (!(l != null && l.tabId)) {
                _.warn("Non-navigation action received without active tab", {
                    sessionId: n,
                    actionType: a.type
                }), i({
                    sessionId: n,
                    actionId: s,
                    clientId: this.clientId,
                    status: "error",
                    result: {},
                    error: "Cannot execute action: no active tab. A navigation action is required first."
                });
                return
            }
        }
        try {
            const l = await this.sessionManager.enqueue(n, async u => (await this.sessionManager.updateSessionStatus(n, {
                status: "running"
            }), this.performActionOnSession(u, e, a)));
            i(l)
        } catch (l) {
            const u = l instanceof Error ? l.message : String(l);
            _.error("Action execution failure", {
                sessionId: n,
                error: u
            }), i({
                sessionId: n,
                actionId: s,
                clientId: this.clientId,
                status: "error",
                result: {},
                error: u
            })
        }
    }
    async performActionOnSession(e, t, n) {
        var m, k, v, g;
        const {
            sessionId: s,
            id: o
        } = t, i = await It.runAction(e, n, {
            captureArtifacts: !0
        }), a = await X(e), c = await K.getOtherTabsInGroup(s, a.id);
        this.emitProgressEvent(s, o, n, i);
        const l = i.status === "error",
            u = (k = (m = i.artifacts) == null ? void 0 : m.metadata) == null ? void 0 : k.viewportInfo,
            d = {
                url: a.url ?? "",
                title: a.title ?? "",
                result: i.message ?? "success",
                screenshot_uploaded: !1,
                clean_screenshot_uploaded: !1,
                clean_screenshot_path: "",
                elements: Jt(i.artifacts),
                markdown: ((v = i.artifacts) == null ? void 0 : v.markdownContent) ?? "",
                full_markdown: ((g = i.artifacts) == null ? void 0 : g.markdownContent) ?? "",
                pixels_above: (u == null ? void 0 : u.pixelsAbove) ?? 0,
                pixels_below: (u == null ? void 0 : u.pixelsBelow) ?? 0,
                viewport_width: (u == null ? void 0 : u.width) ?? void 0,
                viewport_height: (u == null ? void 0 : u.height) ?? void 0,
                new_pages: c
            };
        if (!l && i.artifacts) {
            const w = await jr(i.artifacts, t.screenshot_presigned_url, t.clean_screenshot_presigned_url);
            d.screenshot_uploaded = w.screenshot_uploaded, d.clean_screenshot_uploaded = w.clean_screenshot_uploaded
        }
        const h = l ? {
            url: a.url ?? "",
            title: a.title ?? "",
            result: i.error || i.message || "Action failed",
            error: !0
        } : d;
        return {
            sessionId: s,
            actionId: o,
            clientId: this.clientId,
            status: l ? "error" : "success",
            result: h,
            error: l ? i.error || "Action failed" : void 0
        }
    }
    emitProgressEvent(e, t, n, s) {
        if (j.isProd()) return;
        const o = `server-${e}-${t}`,
            i = s.status === "error",
            a = {
                runId: o,
                scenarioId: `server-session-${e}`,
                status: i ? "error" : "success",
                action: n,
                message: s.message,
                error: s.error,
                artifacts: s.artifacts
            };
        pe({
            source: "background",
            type: "automation/progress",
            result: a
        }).catch(c => {
            const l = c instanceof Error ? c.message : String(c);
            _.warn("Failed to emit progress event", l)
        })
    }
    emitEventLog(e, t, n, s) {
        if (j.isProd()) return;
        const o = {
            source: "background",
            type: "automation/event-log",
            log: {
                sessionId: e,
                timestamp: Date.now(),
                direction: t,
                eventType: n,
                payload: s
            }
        };
        pe(o).catch(i => {
            const a = i instanceof Error ? i.message : String(i);
            _.warn("Failed to emit event log", a)
        })
    }
}
const E = T("MockSocketBridge");
class qs extends Yt {
    constructor() {
        super(...arguments), this.activeMockRuns = new Map
    }
    async connectSocket() {
        this.clientId = await Me(), E.info("MockSocketBridge started (local mode, no real socket connection)", {
            clientId: this.clientId
        })
    }
    emitUpstream(e) {
        E.info("Would send upstream message:", {
            type: e.type,
            message: e
        })
    }
    async runMockScenario(e) {
        const t = jt(e);
        if (!t) throw E.error("❌ Scenario not found", {
            scenarioId: e
        }), new Error(`Scenario ${e} not found`);
        const n = crypto.randomUUID(),
            s = crypto.randomUUID();
        return E.warn("🎯 Starting scenario", {
            scenarioId: e,
            sessionId: n,
            runId: s,
            scenarioName: t.name,
            stepCount: t.steps.length,
            steps: t.steps.map((o, i) => ({
                index: i,
                type: o.type
            }))
        }), this.activeMockRuns.set(n, {
            cancelled: !1
        }), this.executeMockScenario(n, s, t).catch(o => {
            E.error("💥 Scenario execution failed in async handler", {
                scenarioId: e,
                sessionId: n,
                runId: s,
                error: o instanceof Error ? o.message : String(o),
                errorStack: o instanceof Error ? o.stack : void 0
            })
        }), E.warn("✓ Scenario started, returning runId", {
            runId: s,
            sessionId: n
        }), s
    }
    async stopMockScenario(e) {
        for (const [t, n] of this.activeMockRuns.entries()) n.cancelled = !0, E.info("Marked scenario as cancelled", {
            sessionId: t
        })
    }
    async executeMockScenario(e, t, n) {
        const s = [],
            o = Date.now();
        let i = !1;
        try {
            E.warn("🚀 Starting scenario execution", {
                sessionId: e,
                scenarioId: n.id,
                scenarioName: n.name,
                stepCount: n.steps.length,
                runId: t
            });
            for (let a = 0; a < n.steps.length; a++) {
                const c = this.activeMockRuns.get(e);
                if (c != null && c.cancelled) {
                    E.info("Scenario cancelled by user", {
                        scenarioId: n.id,
                        sessionId: e,
                        stoppedAtStep: a
                    });
                    break
                }
                const l = n.steps[a];
                switch (l.type) {
                    case "browser_action": {
                        const u = `mock-action-${a}`,
                            d = Tt(l.action),
                            h = {
                                type: "browser_action",
                                id: Ee(),
                                sessionId: e,
                                clientId: this.clientId,
                                timestamp: Date.now(),
                                action: l.action
                            };
                        E.warn("📤 Sending browser_action to handleBrowserActionRequest", {
                            sessionId: e,
                            actionId: u,
                            messageId: h.id,
                            action: h.action
                        });
                        const m = await new Promise((k, v) => {
                            this.handleBrowserActionRequest(h, g => {
                                E.warn("📥 Received action result callback", {
                                    sessionId: e,
                                    actionId: u,
                                    status: g.status,
                                    hasError: !!g.error,
                                    error: g.error
                                }), g.status === "error" ? (E.error("❌ Action failed", {
                                    sessionId: e,
                                    actionId: u,
                                    error: g.error,
                                    fullResult: g
                                }), v(new Error(g.error || "Action execution failed"))) : (E.info("✅ Action completed successfully", {
                                    sessionId: e,
                                    actionId: u,
                                    status: g.status
                                }), k(g))
                            })
                        });
                        s.push({
                            action: d,
                            result: m
                        });
                        break
                    }
                    case "session_status": {
                        const u = {
                            type: "session_status",
                            id: Ee(),
                            sessionId: e,
                            clientId: this.clientId,
                            timestamp: Date.now(),
                            status: l.status,
                            sessionTitle: l.sessionTitle,
                            error: l.error
                        };
                        await this.handleSessionTaskRequest(u), l.status === "stopped" && (i = !0, E.info("✅ Received stopped status, will send summary", {
                            sessionId: e,
                            runId: t
                        }));
                        break
                    }
                    default: {
                        const u = l;
                        throw E.error("Unknown step type", {
                            sessionId: e,
                            step: u
                        }), new Error(`Unknown step type: ${JSON.stringify(l)}`)
                    }
                }
                a < n.steps.length - 1 && await this.delay(1e3)
            }
            if (E.warn("🏁 All steps executed", {
                    scenarioId: n.id,
                    sessionId: e,
                    runId: t,
                    totalSteps: n.steps.length,
                    receivedStopStatus: i
                }), i) {
                E.warn("🎉 Scenario completed with stopped status", {
                    scenarioId: n.id,
                    sessionId: e,
                    runId: t
                }), E.warn("📨 Emitting automation/summary event", {
                    runId: t,
                    scenarioId: n.id,
                    hasOnEmitEvent: !0,
                    resultsCount: s.length
                });
                const a = {
                    runId: t,
                    scenarioId: n.id,
                    status: "success",
                    results: s.map((c, l) => ({
                        runId: t,
                        scenarioId: n.id,
                        status: "success",
                        action: c.action,
                        message: "Step completed"
                    })),
                    startedAt: o,
                    completedAt: Date.now()
                };
                pe({
                    source: "background",
                    type: "automation/summary",
                    summary: a
                }), E.warn("✓ automation/summary event emitted", {
                    runId: t,
                    summaryStatus: a.status,
                    completedAt: a.completedAt
                })
            } else E.info("⏸️ Scenario ended without stopped status (ongoing scenario)", {
                scenarioId: n.id,
                sessionId: e,
                runId: t
            })
        } catch (a) {
            E.error("💥 Scenario execution failed", n), await this.handleSessionTaskRequest({
                type: "session_status",
                id: Ee(),
                sessionId: e,
                clientId: this.clientId,
                timestamp: Date.now(),
                status: "error",
                error: a instanceof Error ? a.message : String(a)
            });
            const c = {
                runId: t,
                scenarioId: n.id,
                status: "error",
                results: s.map((l, u) => ({
                    runId: t,
                    scenarioId: n.id,
                    status: "success",
                    action: {
                        type: "browser_view"
                    },
                    message: "Step completed"
                })),
                startedAt: o,
                completedAt: Date.now()
            };
            pe({
                source: "background",
                type: "automation/summary",
                summary: c
            })
        } finally {
            this.activeMockRuns.delete(e), E.warn("🧹 Cleaned up mock run", {
                sessionId: e,
                runId: t
            })
        }
    }
    delay(e) {
        return new Promise(t => {
            globalThis.setTimeout(t, e)
        })
    }
}
const x = T("BackgroundApp");
class Vs {
    constructor() {
        this.messageBus = new Qt, this.socketBridge = null, this.mockSocketBridge = null, this.sessionManager = new Xr({
            onDisposeSession: (e, t) => {
                var n;
                (n = this.socketBridge) == null || n.emitDisconnectSession(e, t)
            },
            onStopSession: e => {
                var t;
                (t = this.socketBridge) == null || t.emitStopSession(e)
            },
            onResumeSession: (e, t) => {
                var n;
                (n = this.socketBridge) == null || n.emitTakeOverSummary(e, t)
            }
        }), this.setupMessageBus(), j.isDev() || this.disableSidePanelAutoOpen(), this.registerRuntimeListeners(), this.registerLifecycleListeners(), this.registerTabChangeListener(), this.registerManusTokenWatcher(), this.registerKeepAlivePortListener(), this.initializeStorageAndSocketBridge(), Dn.registerManusAppPolling()
    }
    setupMessageBus() {
        x.info("🚀 Initializing MessageBus architecture"), this.messageBus.registerMiddleware(new Zt), this.messageBus.registerMiddleware(new fn(1e3));
        const e = new Yn(this.sessionManager, o => this.broadcastTabStatus(o)),
            t = new Fn(this.sessionManager),
            n = new Gr(() => this.socketBridge, () => this.mockSocketBridge),
            s = new Vn;
        this.messageBus.batchRegisterHandler(["popup/get-tab-status", "extension/unauthorize-task"], e), this.messageBus.batchRegisterHandler(["extension/stop-task", "extension/resume-task", "extension/unauthorize-task", "content/heartbeat", "content/get-session-state"], t), this.messageBus.batchRegisterHandler(["automation/run-scenario", "automation/stop-scenario", "automation/activate", "automation/trigger-browser-action"], n), this.messageBus.batchRegisterHandler(["my-browser/ping", "my-browser/switch-to-tab", "my-browser/set-browser-settings"], s), x.info("✅ MessageBus setup complete", {
            handlers: this.messageBus.getHandlerCount(),
            middlewares: this.messageBus.getMiddlewareCount()
        })
    }
    registerRuntimeListeners() {
        chrome.runtime.onInstalled.addListener(e => {
            if (x.info("Extension installed or updated", {
                    reason: e.reason,
                    previousVersion: e.previousVersion
                }), e.reason === "install") {
                const {
                    onboardingUrl: t
                } = j.getEnvParams();
                try {
                    const n = chrome.tabs.create({
                        url: t
                    });
                    n && typeof n.catch == "function" && n.catch(s => {
                        x.error("Failed to open onboarding tab after install", s)
                    })
                } catch (n) {
                    x.error("Error opening onboarding tab after install", n)
                }
            }
        }), this.messageBus.attach()
    }
    async initializeStorageAndSocketBridge() {
        try {
            await ve.initialize(), await this.startSocketBridge(), x.info("Background service worker initialized. Connected to SocketBridge")
        } catch (e) {
            const t = e instanceof Error ? e.message : String(e);
            x.error("Failed to initialize extension storage", {
                error: t
            })
        }
    }
    async startSocketBridge() {
        this.socketBridge = new Yt(this.sessionManager), x.info("Starting real SocketBridge"), await this.socketBridge.connectSocket(), this.mockSocketBridge = new qs(this.sessionManager), x.info("Starting MockSocketBridge for local testing"), await this.mockSocketBridge.connectSocket()
    }
    registerTabChangeListener() {
        chrome.tabs.onActivated.addListener(e => {
            this.broadcastTabStatus(e.tabId)
        })
    }
    broadcastTabStatus(e) {
        const t = this.sessionManager.getSession({
                tabId: e
            }),
            n = {
                source: "background",
                type: "popup/tab-status-update",
                activeTabId: e,
                sessionMeta: t ? {
                    sessionId: t.sessionId,
                    status: t.status
                } : null
            };
        Gt(n)
    }
    registerLifecycleListeners() {
        chrome.runtime.onSuspend.addListener(() => {
            x.info("Extension suspending, cleaning up resources"), this.messageBus.detach(), vn().catch(e => {
                x.error("Failed to cleanup CDP sessions on suspension", e)
            }), ve.stopWatcher()
        })
    }
    registerManusTokenWatcher() {
        ve.startWatcher()
    }
    registerKeepAlivePortListener() {
        chrome.runtime.onConnect.addListener(e => {
            e.name === "keep-alive" && (e.onMessage.addListener(t => {
                var n, s;
                t.status === "ping" && x.debug("Keep-alive health check received", {
                    tabId: (s = (n = e.sender) == null ? void 0 : n.tab) == null ? void 0 : s.id
                })
            }), e.onDisconnect.addListener(() => {
                var t, n;
                x.debug("Keep-alive port disconnected", {
                    tabId: (n = (t = e.sender) == null ? void 0 : t.tab) == null ? void 0 : n.id
                })
            }))
        })
    }
    disableSidePanelAutoOpen() {
        if (x.info("Disabling side panel auto-open behavior"), !chrome.sidePanel) {
            x.warn("Side panel API unavailable");
            return
        }
        typeof chrome.sidePanel.setPanelBehavior == "function" && chrome.sidePanel.setPanelBehavior({
            openPanelOnActionClick: !1
        }, () => {
            chrome.runtime.lastError ? x.warn("Failed to disable side panel auto-open", chrome.runtime.lastError) : x.info("Side panel auto-open disabled - popup will show instead")
        })
    }
}
new Vs;