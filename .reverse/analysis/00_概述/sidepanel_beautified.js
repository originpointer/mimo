import {
    c as vr,
    r as Re,
    R as tr,
    b as Tr,
    j as g,
    d as Dr,
    g as Ir,
    E as Lr,
    a as Jr
} from "./eye.js";
import {
    m as gr,
    b as Br,
    g as zr,
    R as $r,
    t as Vr,
    o as ot,
    d as We,
    a as rr,
    r as qe,
    c as ar,
    M as qr,
    L as Kr
} from "./helper.js";
import {
    l as yt,
    s as Jt
} from "./sendMessage.js";
import {
    a as Ur,
    g as Wr,
    t as nr,
    d as or
} from "./token.js";
/**
 * @license lucide-react v0.548.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Hr = [
        ["path", {
            d: "M12 15V3",
            key: "m9g1x1"
        }],
        ["path", {
            d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
            key: "ih7n3h"
        }],
        ["path", {
            d: "m7 10 5 5 5-5",
            key: "brsn70"
        }]
    ],
    _r = vr("download", Hr);
/**
 * @license lucide-react v0.548.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Gr = [
        ["path", {
            d: "M18 6 6 18",
            key: "1bl5f8"
        }],
        ["path", {
            d: "m6 6 12 12",
            key: "d8bk6v"
        }]
    ],
    Yr = vr("x", Gr);
if (!Re.useState) throw new Error("mobx-react-lite requires React with Hooks support");
if (!gr) throw new Error("mobx-react-lite@3 requires mobx at least version 6 to be available");

function Xr(a) {
    a()
}

function Zr(a) {
    a || (a = Xr), Br({
        reactionScheduler: a
    })
}

function Qr(a) {
    return zr(a)
}
var ea = 1e4,
    ta = 1e4,
    ra = function() {
        function a(n) {
            var h = this;
            Object.defineProperty(this, "finalize", {
                enumerable: !0,
                configurable: !0,
                writable: !0,
                value: n
            }), Object.defineProperty(this, "registrations", {
                enumerable: !0,
                configurable: !0,
                writable: !0,
                value: new Map
            }), Object.defineProperty(this, "sweepTimeout", {
                enumerable: !0,
                configurable: !0,
                writable: !0,
                value: void 0
            }), Object.defineProperty(this, "sweep", {
                enumerable: !0,
                configurable: !0,
                writable: !0,
                value: function(r) {
                    r === void 0 && (r = ea), clearTimeout(h.sweepTimeout), h.sweepTimeout = void 0;
                    var t = Date.now();
                    h.registrations.forEach(function(e, i) {
                        t - e.registeredAt >= r && (h.finalize(e.value), h.registrations.delete(i))
                    }), h.registrations.size > 0 && h.scheduleSweep()
                }
            }), Object.defineProperty(this, "finalizeAllImmediately", {
                enumerable: !0,
                configurable: !0,
                writable: !0,
                value: function() {
                    h.sweep(0)
                }
            })
        }
        return Object.defineProperty(a.prototype, "register", {
            enumerable: !1,
            configurable: !0,
            writable: !0,
            value: function(n, h, r) {
                this.registrations.set(r, {
                    value: h,
                    registeredAt: Date.now()
                }), this.scheduleSweep()
            }
        }), Object.defineProperty(a.prototype, "unregister", {
            enumerable: !1,
            configurable: !0,
            writable: !0,
            value: function(n) {
                this.registrations.delete(n)
            }
        }), Object.defineProperty(a.prototype, "scheduleSweep", {
            enumerable: !1,
            configurable: !0,
            writable: !0,
            value: function() {
                this.sweepTimeout === void 0 && (this.sweepTimeout = setTimeout(this.sweep, ta))
            }
        }), a
    }(),
    aa = typeof FinalizationRegistry < "u" ? FinalizationRegistry : ra,
    Kt = new aa(function(a) {
        var n;
        (n = a.reaction) === null || n === void 0 || n.dispose(), a.reaction = null
    }),
    wr = {
        exports: {}
    },
    xr = {};
/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var vt = Re;

function na(a, n) {
    return a === n && (a !== 0 || 1 / a === 1 / n) || a !== a && n !== n
}
var oa = typeof Object.is == "function" ? Object.is : na,
    sa = vt.useState,
    ia = vt.useEffect,
    ca = vt.useLayoutEffect,
    la = vt.useDebugValue;

function ua(a, n) {
    var h = n(),
        r = sa({
            inst: {
                value: h,
                getSnapshot: n
            }
        }),
        t = r[0].inst,
        e = r[1];
    return ca(function() {
        t.value = h, t.getSnapshot = n, Bt(t) && e({
            inst: t
        })
    }, [a, h, n]), ia(function() {
        return Bt(t) && e({
            inst: t
        }), a(function() {
            Bt(t) && e({
                inst: t
            })
        })
    }, [a]), la(h), h
}

function Bt(a) {
    var n = a.getSnapshot;
    a = a.value;
    try {
        var h = n();
        return !oa(a, h)
    } catch {
        return !0
    }
}

function da(a, n) {
    return n()
}
var pa = typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u" ? da : ua;
xr.useSyncExternalStore = vt.useSyncExternalStore !== void 0 ? vt.useSyncExternalStore : pa;
wr.exports = xr;
var ba = wr.exports;

function sr(a) {
    a.reaction = new $r("observer".concat(a.name), function() {
        var n;
        a.stateVersion = Symbol(), (n = a.onStoreChange) === null || n === void 0 || n.call(a)
    })
}

function fa(a, n) {
    n === void 0 && (n = "observed");
    var h = tr.useRef(null);
    if (!h.current) {
        var r = {
            reaction: null,
            onStoreChange: null,
            stateVersion: Symbol(),
            name: n,
            subscribe: function(u) {
                return Kt.unregister(r), r.onStoreChange = u, r.reaction || (sr(r), r.stateVersion = Symbol()),
                    function() {
                        var l;
                        r.onStoreChange = null, (l = r.reaction) === null || l === void 0 || l.dispose(), r.reaction = null
                    }
            },
            getSnapshot: function() {
                return r.stateVersion
            }
        };
        h.current = r
    }
    var t = h.current;
    t.reaction || (sr(t), Kt.register(h, t, t)), tr.useDebugValue(t.reaction, Qr), ba.useSyncExternalStore(t.subscribe, t.getSnapshot, t.getSnapshot);
    var e, i;
    if (t.reaction.track(function() {
            try {
                e = a()
            } catch (u) {
                i = u
            }
        }), i) throw i;
    return e
}
var zt, $t, kr = typeof Symbol == "function" && Symbol.for,
    ha = ($t = (zt = Object.getOwnPropertyDescriptor(function() {}, "name")) === null || zt === void 0 ? void 0 : zt.configurable) !== null && $t !== void 0 ? $t : !1,
    ir = kr ? Symbol.for("react.forward_ref") : typeof Re.forwardRef == "function" && Re.forwardRef(function(a) {
        return null
    }).$$typeof,
    cr = kr ? Symbol.for("react.memo") : typeof Re.memo == "function" && Re.memo(function(a) {
        return null
    }).$$typeof;

function Et(a, n) {
    var h;
    if (cr && a.$$typeof === cr) throw new Error("[mobx-react-lite] You are trying to use `observer` on a function component wrapped in either another `observer` or `React.memo`. The observer already applies 'React.memo' for you.");
    var r = (h = void 0) !== null && h !== void 0 ? h : !1,
        t = a,
        e = a.displayName || a.name;
    if (ir && a.$$typeof === ir && (r = !0, t = a.render, typeof t != "function")) throw new Error("[mobx-react-lite] `render` property of ForwardRef was not a function");
    var i = function(u, l) {
        return fa(function() {
            return t(u, l)
        }, e)
    };
    return i.displayName = a.displayName, ha && Object.defineProperty(i, "name", {
        value: a.name,
        writable: !0,
        configurable: !0
    }), a.contextTypes && (i.contextTypes = a.contextTypes), r && (i = Re.forwardRef(i)), i = Re.memo(i), ya(a, i), i
}
var ma = {
    $$typeof: !0,
    render: !0,
    compare: !0,
    type: !0,
    displayName: !0
};

function ya(a, n) {
    Object.keys(a).forEach(function(h) {
        ma[h] || Object.defineProperty(n, h, Object.getOwnPropertyDescriptor(a, h))
    })
}
var Vt;
Zr(Tr.unstable_batchedUpdates);
Vt = Kt.finalizeAllImmediately;
class va {
    constructor() {
        this.listeners = new Map
    }
    on(n, h) {
        return this.listeners.has(n) || this.listeners.set(n, new Set), this.listeners.get(n).add(h), () => this.off(n, h)
    }
    off(n, h) {
        var r;
        (r = this.listeners.get(n)) == null || r.delete(h)
    }
    emit(n, h) {
        const r = this.listeners.get(n);
        if (r)
            for (const t of r) try {
                t(h)
            } catch (e) {
                yt.error(`Error in listener for ${n}:`, e)
            }
    }
    getListenerCount(n) {
        var h;
        return ((h = this.listeners.get(n)) == null ? void 0 : h.size) ?? 0
    }
    clear() {
        this.listeners.clear()
    }
}
class ga {
    constructor() {
        this.eventEmitter = new va
    }
    async handle(n, h, r) {
        if (!this.isValidEventMessage(n)) {
            yt.warn(`${this.constructor.name}: Invalid event message, ignoring`);
            return
        }
        const t = n;
        this.handleEvent(t)
    }
    on(n, h) {
        return this.eventEmitter.on(n, h)
    }
    getListenerCount(n) {
        return this.eventEmitter.getListenerCount(n)
    }
    clear() {
        this.eventEmitter.clear()
    }
}
const st = class st extends ga {
    constructor() {
        super()
    }
    static getInstance() {
        return st.instance || (st.instance = new st), st.instance
    }
    isValidEventMessage(n) {
        return !n || typeof n != "object" ? !1 : n.source === "background"
    }
    handleEvent(n) {
        switch (n.type) {
            case "automation/progress":
                this.eventEmitter.emit("automation/progress", n.result);
                break;
            case "automation/summary":
                this.eventEmitter.emit("automation/summary", n.summary);
                break;
            case "automation/event-log":
                this.eventEmitter.emit("automation/event-log", n.log);
                break;
            default: {
                const h = n;
                yt.warn("[SidePanelEventHandler] Unhandled event type:", h)
            }
        }
    }
};
st.instance = null;
let Ut = st;
var _a = typeof global == "object" && global && global.Object === Object && global,
    wa = typeof self == "object" && self && self.Object === Object && self,
    Wt = _a || wa || Function("return this")(),
    gt = Wt.Symbol,
    jr = Object.prototype,
    xa = jr.hasOwnProperty,
    ka = jr.toString,
    jt = gt ? gt.toStringTag : void 0;

function ja(a) {
    var n = xa.call(a, jt),
        h = a[jt];
    try {
        a[jt] = void 0;
        var r = !0
    } catch {}
    var t = ka.call(a);
    return r && (n ? a[jt] = h : delete a[jt]), t
}
var Sa = Object.prototype,
    Ea = Sa.toString;

function Ca(a) {
    return Ea.call(a)
}
var Oa = "[object Null]",
    Aa = "[object Undefined]",
    lr = gt ? gt.toStringTag : void 0;

function Sr(a) {
    return a == null ? a === void 0 ? Aa : Oa : lr && lr in Object(a) ? ja(a) : Ca(a)
}

function Na(a) {
    return a != null && typeof a == "object"
}
var Fa = "[object Symbol]";

function Ht(a) {
    return typeof a == "symbol" || Na(a) && Sr(a) == Fa
}

function Ma(a, n) {
    for (var h = -1, r = a == null ? 0 : a.length, t = Array(r); ++h < r;) t[h] = n(a[h], h, a);
    return t
}
var Gt = Array.isArray,
    ur = gt ? gt.prototype : void 0,
    dr = ur ? ur.toString : void 0;

function Er(a) {
    if (typeof a == "string") return a;
    if (Gt(a)) return Ma(a, Er) + "";
    if (Ht(a)) return dr ? dr.call(a) : "";
    var n = a + "";
    return n == "0" && 1 / a == -1 / 0 ? "-0" : n
}

function Mt(a) {
    var n = typeof a;
    return a != null && (n == "object" || n == "function")
}
var Pa = "[object AsyncFunction]",
    Ra = "[object Function]",
    Ta = "[object GeneratorFunction]",
    Da = "[object Proxy]";

function Ia(a) {
    if (!Mt(a)) return !1;
    var n = Sr(a);
    return n == Ra || n == Ta || n == Pa || n == Da
}
var qt = Wt["__core-js_shared__"],
    pr = function() {
        var a = /[^.]+$/.exec(qt && qt.keys && qt.keys.IE_PROTO || "");
        return a ? "Symbol(src)_1." + a : ""
    }();

function La(a) {
    return !!pr && pr in a
}
var Ja = Function.prototype,
    Ba = Ja.toString;

function za(a) {
    if (a != null) {
        try {
            return Ba.call(a)
        } catch {}
        try {
            return a + ""
        } catch {}
    }
    return ""
}
var $a = /[\\^$.*+?()[\]{}|]/g,
    Va = /^\[object .+?Constructor\]$/,
    qa = Function.prototype,
    Ka = Object.prototype,
    Ua = qa.toString,
    Wa = Ka.hasOwnProperty,
    Ha = RegExp("^" + Ua.call(Wa).replace($a, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");

function Ga(a) {
    if (!Mt(a) || La(a)) return !1;
    var n = Ia(a) ? Ha : Va;
    return n.test(za(a))
}

function Ya(a, n) {
    return a == null ? void 0 : a[n]
}

function Yt(a, n) {
    var h = Ya(a, n);
    return Ga(h) ? h : void 0
}
var br = function() {
        try {
            var a = Yt(Object, "defineProperty");
            return a({}, "", {}), a
        } catch {}
    }(),
    Xa = 9007199254740991,
    Za = /^(?:0|[1-9]\d*)$/;

function Qa(a, n) {
    var h = typeof a;
    return n = n ?? Xa, !!n && (h == "number" || h != "symbol" && Za.test(a)) && a > -1 && a % 1 == 0 && a < n
}

function en(a, n, h) {
    n == "__proto__" && br ? br(a, n, {
        configurable: !0,
        enumerable: !0,
        value: h,
        writable: !0
    }) : a[n] = h
}

function Cr(a, n) {
    return a === n || a !== a && n !== n
}
var tn = Object.prototype,
    rn = tn.hasOwnProperty;

function an(a, n, h) {
    var r = a[n];
    (!(rn.call(a, n) && Cr(r, h)) || h === void 0 && !(n in a)) && en(a, n, h)
}
var nn = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    on = /^\w*$/;

function sn(a, n) {
    if (Gt(a)) return !1;
    var h = typeof a;
    return h == "number" || h == "symbol" || h == "boolean" || a == null || Ht(a) ? !0 : on.test(a) || !nn.test(a) || n != null && a in Object(n)
}
var St = Yt(Object, "create");

function cn() {
    this.__data__ = St ? St(null) : {}, this.size = 0
}

function ln(a) {
    var n = this.has(a) && delete this.__data__[a];
    return this.size -= n ? 1 : 0, n
}
var un = "__lodash_hash_undefined__",
    dn = Object.prototype,
    pn = dn.hasOwnProperty;

function bn(a) {
    var n = this.__data__;
    if (St) {
        var h = n[a];
        return h === un ? void 0 : h
    }
    return pn.call(n, a) ? n[a] : void 0
}
var fn = Object.prototype,
    hn = fn.hasOwnProperty;

function mn(a) {
    var n = this.__data__;
    return St ? n[a] !== void 0 : hn.call(n, a)
}
var yn = "__lodash_hash_undefined__";

function vn(a, n) {
    var h = this.__data__;
    return this.size += this.has(a) ? 0 : 1, h[a] = St && n === void 0 ? yn : n, this
}

function it(a) {
    var n = -1,
        h = a == null ? 0 : a.length;
    for (this.clear(); ++n < h;) {
        var r = a[n];
        this.set(r[0], r[1])
    }
}
it.prototype.clear = cn;
it.prototype.delete = ln;
it.prototype.get = bn;
it.prototype.has = mn;
it.prototype.set = vn;

function gn() {
    this.__data__ = [], this.size = 0
}

function Pt(a, n) {
    for (var h = a.length; h--;)
        if (Cr(a[h][0], n)) return h;
    return -1
}
var _n = Array.prototype,
    wn = _n.splice;

function xn(a) {
    var n = this.__data__,
        h = Pt(n, a);
    if (h < 0) return !1;
    var r = n.length - 1;
    return h == r ? n.pop() : wn.call(n, h, 1), --this.size, !0
}

function kn(a) {
    var n = this.__data__,
        h = Pt(n, a);
    return h < 0 ? void 0 : n[h][1]
}

function jn(a) {
    return Pt(this.__data__, a) > -1
}

function Sn(a, n) {
    var h = this.__data__,
        r = Pt(h, a);
    return r < 0 ? (++this.size, h.push([a, n])) : h[r][1] = n, this
}

function wt(a) {
    var n = -1,
        h = a == null ? 0 : a.length;
    for (this.clear(); ++n < h;) {
        var r = a[n];
        this.set(r[0], r[1])
    }
}
wt.prototype.clear = gn;
wt.prototype.delete = xn;
wt.prototype.get = kn;
wt.prototype.has = jn;
wt.prototype.set = Sn;
var En = Yt(Wt, "Map");

function Cn() {
    this.size = 0, this.__data__ = {
        hash: new it,
        map: new(En || wt),
        string: new it
    }
}

function On(a) {
    var n = typeof a;
    return n == "string" || n == "number" || n == "symbol" || n == "boolean" ? a !== "__proto__" : a === null
}

function Rt(a, n) {
    var h = a.__data__;
    return On(n) ? h[typeof n == "string" ? "string" : "hash"] : h.map
}

function An(a) {
    var n = Rt(this, a).delete(a);
    return this.size -= n ? 1 : 0, n
}

function Nn(a) {
    return Rt(this, a).get(a)
}

function Fn(a) {
    return Rt(this, a).has(a)
}

function Mn(a, n) {
    var h = Rt(this, a),
        r = h.size;
    return h.set(a, n), this.size += h.size == r ? 0 : 1, this
}

function ct(a) {
    var n = -1,
        h = a == null ? 0 : a.length;
    for (this.clear(); ++n < h;) {
        var r = a[n];
        this.set(r[0], r[1])
    }
}
ct.prototype.clear = Cn;
ct.prototype.delete = An;
ct.prototype.get = Nn;
ct.prototype.has = Fn;
ct.prototype.set = Mn;
var Pn = "Expected a function";

function Xt(a, n) {
    if (typeof a != "function" || n != null && typeof n != "function") throw new TypeError(Pn);
    var h = function() {
        var r = arguments,
            t = n ? n.apply(this, r) : r[0],
            e = h.cache;
        if (e.has(t)) return e.get(t);
        var i = a.apply(this, r);
        return h.cache = e.set(t, i) || e, i
    };
    return h.cache = new(Xt.Cache || ct), h
}
Xt.Cache = ct;
var Rn = 500;

function Tn(a) {
    var n = Xt(a, function(r) {
            return h.size === Rn && h.clear(), r
        }),
        h = n.cache;
    return n
}
var Dn = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,
    In = /\\(\\)?/g,
    Ln = Tn(function(a) {
        var n = [];
        return a.charCodeAt(0) === 46 && n.push(""), a.replace(Dn, function(h, r, t, e) {
            n.push(t ? e.replace(In, "$1") : r || h)
        }), n
    });

function Jn(a) {
    return a == null ? "" : Er(a)
}

function Bn(a, n) {
    return Gt(a) ? a : sn(a, n) ? [a] : Ln(Jn(a))
}

function zn(a) {
    if (typeof a == "string" || Ht(a)) return a;
    var n = a + "";
    return n == "0" && 1 / a == -1 / 0 ? "-0" : n
}

function $n(a, n, h, r) {
    if (!Mt(a)) return a;
    n = Bn(n, a);
    for (var t = -1, e = n.length, i = e - 1, u = a; u != null && ++t < e;) {
        var l = zn(n[t]),
            d = h;
        if (l === "__proto__" || l === "constructor" || l === "prototype") return a;
        if (t != i) {
            var m = u[l];
            d = void 0, d === void 0 && (d = Mt(m) ? m : Qa(n[t + 1]) ? [] : {})
        }
        an(u, l, d), u = u[l]
    }
    return a
}

function Vn(a, n, h) {
    return a == null ? a : $n(a, n, h)
}

function qn(a) {
    if (a.browser_navigate) return `Navigate to ${a.browser_navigate.url}`;
    if (a.browser_view) return "View page";
    if (a.browser_press_key) return `Press key: ${a.browser_press_key.key}`;
    if (a.browser_scroll_down) {
        const {
            target: n,
            to_end: h,
            coordinate_x: r,
            coordinate_y: t
        } = a.browser_scroll_down, e = h ? "Scroll to bottom" : "Scroll down";
        return n === "container" && r != null && t != null ? `${e} (container at ${r}, ${t})` : e
    }
    if (a.browser_scroll_up) {
        const {
            target: n,
            to_end: h,
            coordinate_x: r,
            coordinate_y: t
        } = a.browser_scroll_up, e = h ? "Scroll to top" : "Scroll up";
        return n === "container" && r != null && t != null ? `${e} (container at ${r}, ${t})` : e
    }
    if (a.browser_scroll_left) {
        const {
            target: n,
            to_end: h,
            coordinate_x: r,
            coordinate_y: t
        } = a.browser_scroll_left, e = h ? "Scroll to start" : "Scroll left";
        return n === "container" && r != null && t != null ? `${e} (container at ${r}, ${t})` : e
    }
    if (a.browser_scroll_right) {
        const {
            target: n,
            to_end: h,
            coordinate_x: r,
            coordinate_y: t
        } = a.browser_scroll_right, e = h ? "Scroll to end" : "Scroll right";
        return n === "container" && r != null && t != null ? `${e} (container at ${r}, ${t})` : e
    }
    if (a.browser_find_keyword) return `Find: "${a.browser_find_keyword.keyword}"`;
    if (a.browser_click) {
        const {
            index: n,
            coordinate_x: h,
            coordinate_y: r
        } = a.browser_click;
        return h != null && r != null ? `Click (${h}, ${r})` : n != null ? `Click [${n}]` : "Click"
    }
    if (a.browser_input) {
        const {
            index: n,
            coordinate_x: h,
            coordinate_y: r,
            text: t,
            press_enter: e
        } = a.browser_input;
        return `Input${h!=null&&r!=null?` (${h}, ${r})`:n!=null?` [${n}]`:""}: "${t}"${e?" ⏎":""}`
    }
    return "Unknown action"
}

function Kn(a) {
    if (a.type === "session_status") {
        const n = [`Session status: ${a.status}`];
        return a.sessionTitle && n.push(`"${a.sessionTitle}"`), a.error && n.push(`(error: ${a.error})`), n.join(" ")
    }
    return qn(a.action)
}

function Un(a, n) {
    return {
        stepNumber: n + 1,
        description: Kn(a),
        payload: a
    }
}

function Wn(a) {
    return {
        id: a.id,
        name: a.name,
        description: a.description,
        stepCount: a.steps.length,
        steps: a.steps.map(Un)
    }
}

function Hn(a) {
    return {
        ...a,
        type: a.type,
        description: Gn(a)
    }
}

function Gn(a) {
    switch (a.type) {
        case "browser_navigate":
            return `Navigate to ${a.url}`;
        case "browser_click":
            return `Click (${fr(a.target)})`;
        case "browser_input":
            return `Input text (${fr(a.target)})`;
        case "browser_press_key":
            return `Press key ${a.key}`;
        case "browser_scroll":
            return `Scroll ${a.direction}${a.toEnd?" to end":""}`;
        case "wait":
            return `Wait ${a.ms}ms`;
        case "browser_view":
            return "Capture page view";
        default:
            return "Unsupported action"
    }
}

function fr(a) {
    if (!a) return "unspecified target";
    switch (a.strategy) {
        case "bySelector":
            return `selector ${a.selector}`;
        case "byIndex":
            return `index ${a.index}`;
        case "byCoordinates":
            return `coordinates ${a.coordinateX}, ${a.coordinateY}`;
        default:
            return "unknown target"
    }
}

function Yn(a) {
    return {
        action: Hn(a.action),
        status: a.status,
        message: a.message,
        error: a.error,
        artifacts: a.artifacts
    }
}
var Xn = Object.defineProperty,
    Zn = Object.getOwnPropertyDescriptor,
    Ee = (a, n, h, r) => {
        for (var t = r > 1 ? void 0 : r ? Zn(n, h) : n, e = a.length - 1, i; e >= 0; e--)(i = a[e]) && (t = (r ? i(n, h, t) : i(t)) || t);
        return r && t && Xn(n, h, t), t
    };
const Qn = Vr.map(Wn),
    hr = {
        version: Wr(),
        buildTime: Ur()
    };
class je {
    constructor() {
        this.view = "action", this.token = null, this.devBranch = null, this.activeTab = null, this.runLogs = {}, this.runningId = null, this.actionStates = {}, gr(this)
    }
    setView(n) {
        this.view = n
    }
    setToken(n) {
        this.token = n
    }
    setDevBranch(n) {
        this.devBranch = n
    }
    setActiveTab(n) {
        this.activeTab = n
    }
    setRunningId(n) {
        this.runningId = n
    }
    setError(n) {
        this.error = n
    }
    setRunLog(n, h) {
        this.runLogs[n] = h
    }
    clearRunLogs() {
        this.runLogs = {}
    }
    setActionState(n, h) {
        this.actionStates[n] = h
    }
    clearActionState(n) {
        delete this.actionStates[n]
    }
    getActionState(n) {
        return this.actionStates[n] ?? {
            status: "idle"
        }
    }
}
Ee([ot], je.prototype, "view", 2);
Ee([ot], je.prototype, "token", 2);
Ee([ot], je.prototype, "devBranch", 2);
Ee([ot], je.prototype, "activeTab", 2);
Ee([ot], je.prototype, "runLogs", 2);
Ee([ot], je.prototype, "runningId", 2);
Ee([ot], je.prototype, "error", 2);
Ee([ot], je.prototype, "actionStates", 2);
Ee([We], je.prototype, "setView", 1);
Ee([We], je.prototype, "setToken", 1);
Ee([We], je.prototype, "setDevBranch", 1);
Ee([We], je.prototype, "setActiveTab", 1);
Ee([We], je.prototype, "setRunningId", 1);
Ee([We], je.prototype, "setError", 1);
Ee([We], je.prototype, "setRunLog", 1);
Ee([We], je.prototype, "clearRunLogs", 1);
Ee([We], je.prototype, "setActionState", 1);
Ee([We], je.prototype, "clearActionState", 1);
const fe = new je,
    Or = "view-screen-main";
class eo {
    constructor() {
        this.tabActivatedListener = null, this.tabUpdatedListener = null, this.unsubscribeToken = null, this.unsubscribeDevBranch = null
    }
    initialize() {
        this.setupStorageSync(), this.setupTabTracking()
    }
    dispose() {
        this.cleanupStorageSync(), this.cleanupTabTracking()
    }
    async runScenario(n) {
        const h = fe;
        if (h.runningId) return;
        const r = rr(n);
        if (!r) {
            h.setError(`Scenario ${n} not found.`);
            return
        }
        h.setRunningId(n), h.setError(void 0);
        try {
            const t = await Jt({
                source: "sidepanel",
                type: "automation/run-scenario",
                scenarioId: n
            });
            if (!t.ok || !t.runId) throw new Error(t.error ?? "Unknown error starting run");
            qe(() => {
                const e = h.runLogs[t.runId],
                    i = e ?? {
                        runId: t.runId,
                        scenarioId: n,
                        scenarioName: r.name,
                        status: "running",
                        startedAt: Date.now(),
                        steps: []
                    };
                h.setRunLog(t.runId, i), h.setRunningId((e == null ? void 0 : e.status) === "running" ? t.runId : null)
            })
        } catch (t) {
            yt.error("Failed to start scenario", {
                scenarioId: n,
                error: t
            }), qe(() => {
                h.setRunningId(null), h.setError(`Failed to start scenario: ${t instanceof Error?t.message:String(t)}`)
            })
        }
    }
    async stopScenario(n) {
        const h = fe;
        if (h.runningId) try {
            const r = await Jt({
                source: "sidepanel",
                type: "automation/stop-scenario",
                scenarioId: n
            });
            if (!r.ok) throw new Error(r.error ?? "Unknown error stopping scenario");
            qe(() => {
                h.setRunningId(null), h.setError(void 0)
            })
        } catch (r) {
            yt.error("Failed to stop scenario", {
                scenarioId: n,
                error: r
            }), h.setError(`Failed to stop scenario: ${r instanceof Error?r.message:String(r)}`)
        }
    }
    clearLogs() {
        fe.clearRunLogs()
    }
    async viewScreen() {
        var t;
        const n = ((t = fe.activeTab) == null ? void 0 : t.id) ?? null,
            h = this.buildBrowserAction("browser_view", {}),
            r = ar(h);
        await this.triggerAction(Or, n, r, {
            captureArtifacts: !0
        })
    }
    async triggerBrowserAction(n, h, r) {
        var u;
        const t = ((u = fe.activeTab) == null ? void 0 : u.id) ?? null,
            e = this.buildBrowserAction(h, r),
            i = ar(e);
        await this.triggerAction(n, t, i)
    }
    buildBrowserAction(n, h) {
        const r = {
            browser_navigate: null,
            browser_click: null,
            browser_input: null,
            browser_press_key: null,
            browser_scroll_up: null,
            browser_scroll_down: null,
            browser_scroll_left: null,
            browser_scroll_right: null,
            browser_view: null,
            browser_find_keyword: null
        };
        return n === "browser_view" ? r.browser_view = {} : Vn(r, n, h), r
    }
    async triggerAction(n, h, r, t) {
        const e = fe;
        if (h === null) {
            qe(() => e.setActionState(n, {
                status: "error",
                error: "No active tab"
            }));
            return
        }
        qe(() => e.setActionState(n, {
            status: "loading"
        }));
        try {
            const i = await Jt({
                source: "sidepanel",
                type: "automation/trigger-browser-action",
                tabId: h,
                action: r,
                captureArtifacts: (t == null ? void 0 : t.captureArtifacts) ?? !1
            });
            if (!i.ok) throw new Error(i.error || "Unknown error");
            qe(() => e.setActionState(n, {
                status: "success",
                message: i.message
            }))
        } catch (i) {
            const u = i instanceof Error ? i.message : String(i);
            yt.error("Browser action failed", {
                actionId: n,
                error: u
            }), qe(() => e.setActionState(n, {
                status: "error",
                error: u
            }))
        }
    }
    handleProgress(n) {
        const h = fe,
            r = this.getOrCreateRunLog(n.runId, n.scenarioId);
        qe(() => {
            h.setRunLog(r.runId, {
                ...r,
                status: n.status === "error" ? "error" : r.status,
                steps: [...r.steps, Yn(n)]
            })
        })
    }
    handleSummary(n) {
        const h = fe,
            r = this.getOrCreateRunLog(n.runId, n.scenarioId);
        let t = "error";
        n.status === "success" ? t = "completed" : n.status === "cancelled" && (t = "stopped"), qe(() => {
            h.setRunLog(n.runId, {
                ...r,
                status: t,
                completedAt: n.completedAt ?? Date.now()
            }), h.runningId === n.runId && h.setRunningId(null)
        })
    }
    handleEventLog(n) {
        const h = fe,
            r = `server-session-${n.sessionId}`;
        let t = null,
            e = null;
        for (const [u, l] of Object.entries(h.runLogs))
            if (l.scenarioId === r || u.includes(n.sessionId)) {
                t = l, e = u;
                break
            }(!t || !e) && (e = `server-${n.sessionId}-event`, t = this.getOrCreateRunLog(e, r));
        const i = {
            timestamp: n.timestamp,
            direction: n.direction,
            type: n.eventType,
            payload: n.payload
        };
        qe(() => {
            var l;
            const u = {
                ...t,
                logs: [...t.logs || [], i]
            };
            if (n.eventType === "session_status" && ((l = n.payload) != null && l.status)) {
                const d = n.payload.status;
                (d === "completed" || d === "stopped" || d === "error") && (u.status = d)
            }
            h.setRunLog(e, u)
        })
    }
    getOrCreateRunLog(n, h) {
        const r = fe.runLogs[n];
        if (r) return r;
        const t = h.startsWith("server-session-");
        let e = rr(h);
        if (t && !e) {
            const i = h.replace("server-session-", "");
            e = {
                id: h,
                name: `Server Action (${i})`,
                description: "",
                steps: []
            }
        }
        return {
            runId: n,
            scenarioId: h,
            scenarioName: (e == null ? void 0 : e.name) ?? h,
            status: "running",
            startedAt: Date.now(),
            steps: []
        }
    }
    async setupTabTracking() {
        try {
            const [n] = await chrome.tabs.query({
                active: !0,
                currentWindow: !0
            });
            n != null && n.id && fe.setActiveTab({
                id: n.id,
                title: n.title ?? "",
                url: n.url ?? ""
            }), this.tabActivatedListener = async h => {
                try {
                    const r = await chrome.tabs.get(h.tabId);
                    fe.setActiveTab({
                        id: r.id ?? h.tabId,
                        title: r.title ?? "",
                        url: r.url ?? ""
                    })
                } catch {}
            }, this.tabUpdatedListener = (h, r, t) => {
                var e;
                !t.active || ((e = fe.activeTab) == null ? void 0 : e.id) !== h || !("title" in r) && !("url" in r) && r.status !== "complete" || fe.setActiveTab({
                    id: h,
                    title: t.title ?? "",
                    url: t.url ?? ""
                })
            }, chrome.tabs.onActivated.addListener(this.tabActivatedListener), chrome.tabs.onUpdated.addListener(this.tabUpdatedListener)
        } catch {}
    }
    cleanupTabTracking() {
        this.tabActivatedListener && (chrome.tabs.onActivated.removeListener(this.tabActivatedListener), this.tabActivatedListener = null), this.tabUpdatedListener && (chrome.tabs.onUpdated.removeListener(this.tabUpdatedListener), this.tabUpdatedListener = null)
    }
    setupStorageSync() {
        qe(() => {
            fe.setToken(nr.getToken()), fe.setDevBranch(or.getDevBranch())
        }), this.unsubscribeToken = nr.subscribeToken(n => fe.setToken(n)), this.unsubscribeDevBranch = or.subscribeDevBranch(n => fe.setDevBranch(n))
    }
    cleanupStorageSync() {
        var n, h;
        (n = this.unsubscribeToken) == null || n.call(this), (h = this.unsubscribeDevBranch) == null || h.call(this), this.unsubscribeToken = null, this.unsubscribeDevBranch = null
    }
}
const _t = new eo,
    to = Et(function() {
        var h;
        const n = fe;
        return g.jsxs("header", {
            className: "flex flex-col border-b border-white/12",
            children: [g.jsxs("div", {
                className: "flex items-center justify-between px-3 py-1.5 bg-[#0f121e]/95 text-xs border-b border-white/6",
                children: [g.jsx("div", {
                    className: "inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1c2030]/80 border border-[#94a3b8]/20 text-[#94a3b8] hover:text-[#cbd5e1] transition-colors cursor-default",
                    title: `Build time: ${hr.buildTime??"Unknown"}`,
                    children: g.jsxs("span", {
                        className: "font-mono font-medium",
                        children: ["v", hr.version]
                    })
                }), g.jsx("div", {
                    className: "flex-1 mx-3 px-2 py-0.5 text-[#e2e8f0]/80 truncate text-center",
                    title: (h = n.activeTab) == null ? void 0 : h.url,
                    children: n.activeTab ? `#${n.activeTab.id} - ${n.activeTab.title||"Unnamed Tab"}` : "No Active Tab"
                }), g.jsxs("div", {
                    className: "inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1c2030]/80 border border-[#94a3b8]/20",
                    children: [g.jsx("span", {
                        className: `w-1.5 h-1.5 rounded-full ${n.error?"bg-status-error":"bg-status-success"}`
                    }), g.jsx("span", {
                        className: `text-[10px] font-medium ${n.error?"text-status-error-light":"text-status-success-light"}`,
                        children: n.error ? "Error" : "Ready"
                    })]
                })]
            }), g.jsxs("div", {
                className: "flex items-center gap-2 px-3 py-1.5 bg-[#0f121e]/90 border-b border-white/6",
                children: [g.jsx("div", {
                    className: "flex-1"
                }), g.jsx("button", {
                    type: "button",
                    onClick: () => _t.clearLogs(),
                    className: "px-3 py-1 rounded border text-[11px] font-medium transition-colors border-[#dc2626]/40 bg-[#7f1d1d]/30 text-[#fca5a5] hover:bg-[#7f1d1d]/50 hover:border-[#dc2626]/60 active:bg-[#7f1d1d]/20",
                    title: "Clear all log records",
                    children: "Clear Logs"
                })]
            }), (n.token || n.devBranch) && g.jsxs("div", {
                className: "flex items-center gap-3 px-3 py-1.5 bg-[#0f121e]/85 text-[11px] text-[#94a3b8]",
                children: [g.jsxs("div", {
                    className: "inline-flex items-center gap-1",
                    title: n.token ? `Token: ${n.token}` : void 0,
                    children: [g.jsx("span", {
                        className: n.token ? "text-status-success" : "text-status-warning",
                        children: n.token ? "✓" : "⚠"
                    }), g.jsx("span", {
                        children: n.token ? "Synced" : "Not Synced"
                    })]
                }), g.jsxs("div", {
                    className: "inline-flex items-center gap-1",
                    children: [g.jsx("span", {
                        className: "text-[#64748b]",
                        children: "Lane:"
                    }), g.jsx("span", {
                        className: "text-[#cbd5e1] font-medium",
                        children: n.devBranch || "Default"
                    })]
                })]
            })]
        })
    });

function ro({
    triggers: a,
    onTrigger: n,
    getActionStatus: h
}) {
    const [r, t] = Re.useState(() => {
        const l = {};
        for (const d of a) l[d.id] = {
            payload: JSON.stringify(d.payload || {}, null, 2),
            error: null,
            isEdited: !1
        };
        return l
    }), e = (l, d) => {
        t(m => ({
            ...m,
            [l]: {
                ...m[l],
                payload: d,
                isEdited: !0
            }
        }))
    }, i = l => {
        t(d => ({
            ...d,
            [l.id]: {
                payload: JSON.stringify(l.payload || {}, null, 2),
                error: null,
                isEdited: !1
            }
        }))
    }, u = l => {
        const d = r[l.id];
        if (d) try {
            const m = JSON.parse(d.payload);
            t(y => ({
                ...y,
                [l.id]: {
                    ...y[l.id],
                    error: null
                }
            })), n == null || n(l.id, l.browser_action, m)
        } catch (m) {
            const y = m instanceof Error ? m.message : "Invalid JSON";
            t(j => ({
                ...j,
                [l.id]: {
                    ...j[l.id],
                    error: y
                }
            }))
        }
    };
    return g.jsx("div", {
        className: "grid gap-3",
        style: {
            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))"
        },
        children: a.map(l => {
            const d = r[l.id];
            if (!d) return null;
            const m = d.error !== null,
                y = h == null ? void 0 : h(l.id),
                j = g.jsxs("div", {
                    className: "flex items-end justify-between gap-2",
                    children: [g.jsxs("div", {
                        className: "flex flex-col gap-1 min-w-0 flex-1",
                        children: [g.jsx("h3", {
                            className: "text-sm font-semibold text-white truncate",
                            children: l.name
                        }), g.jsx("span", {
                            className: "inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-[#1c2030]/80 border border-[#94a3b8]/20 text-[#94a3b8] w-fit truncate max-w-full",
                            children: l.browser_action
                        })]
                    }), !l.hideJson && g.jsxs("div", {
                        className: "flex items-center gap-2 shrink-0",
                        children: [d.isEdited && g.jsx("button", {
                            type: "button",
                            onClick: () => i(l),
                            className: "px-2 py-1 text-xs text-[#94a3b8] hover:text-[#cbd5e1] transition-colors",
                            title: "Reset to default",
                            children: "Reset"
                        }), g.jsx("button", {
                            type: "button",
                            onClick: () => u(l),
                            className: "px-2 py-1 rounded border text-xs font-medium transition-colors border-[#5a63ed]/50 bg-[#5a63ed]/20 text-[#a5b4fc] hover:bg-[#5a63ed]/30 hover:border-[#5a63ed]/70 active:bg-[#5a63ed]/15",
                            title: `Trigger ${l.browser_action}`,
                            children: "Trigger"
                        })]
                    })]
                }),
                C = y && y.status !== "idle" && g.jsxs("div", {
                    className: "flex items-start gap-1.5 px-2 py-1 rounded text-xs",
                    children: [y.status === "loading" && g.jsxs("div", {
                        className: "flex items-center gap-1.5 text-[#94a3b8]",
                        children: [g.jsx("span", {
                            className: "inline-block w-3 h-3 border-2 border-[#94a3b8] border-t-transparent rounded-full animate-spin"
                        }), g.jsx("span", {
                            children: "Executing..."
                        })]
                    }), y.status === "success" && g.jsxs("div", {
                        className: "flex items-center gap-1.5 text-green-400",
                        children: [g.jsx("span", {
                            children: "✓"
                        }), g.jsx("span", {
                            children: y.message || "Success"
                        })]
                    }), y.status === "error" && g.jsxs("div", {
                        className: "flex items-center gap-1.5 text-red-400",
                        children: [g.jsx("span", {
                            children: "✗"
                        }), g.jsx("span", {
                            children: y.error || "Failed"
                        })]
                    })]
                });
            return l.hideJson ? g.jsxs("button", {
                type: "button",
                onClick: () => u(l),
                className: "flex flex-col gap-2 px-2 py-2 rounded-lg bg-[#0f121e]/60 border border-transparent cursor-pointer transition-all duration-200 hover:bg-[#5a63ed]/20 hover:border-[#5a63ed]/50 text-left",
                children: [j, C]
            }, l.id) : g.jsxs("div", {
                className: "flex flex-col gap-2 px-2 py-2 rounded-lg bg-[#0f121e]/60",
                children: [j, C, g.jsxs("div", {
                    className: "flex flex-col gap-1",
                    children: [g.jsx("textarea", {
                        value: d.payload,
                        onChange: T => e(l.id, T.target.value),
                        className: `w-full h-24 px-3 py-2 rounded border font-mono text-[11px] leading-relaxed resize-y transition-all ${m?"border-red-500/60 bg-red-900/20 text-red-200 shadow-inner shadow-red-900/20 focus:border-red-500 focus:ring-2 focus:ring-red-500/50 focus:bg-red-900/25":"border-[#5a63ed]/30 bg-[#0a0d1a]/80 text-[#a5b4fc] shadow-inner shadow-black/20 focus:border-[#5a63ed] focus:ring-2 focus:ring-[#5a63ed]/30 focus:bg-[#0a0d1a]/90"} focus:outline-none placeholder:text-[#64748b]/50`,
                        placeholder: "JSON payload...",
                        spellCheck: !1
                    }), m && g.jsxs("div", {
                        className: "flex items-start gap-1.5 px-2 py-1 rounded bg-red-900/20 border border-red-500/30",
                        children: [g.jsx("span", {
                            className: "text-red-400 text-xs",
                            children: "⚠"
                        }), g.jsx("span", {
                            className: "text-red-300 text-xs flex-1",
                            children: d.error
                        })]
                    })]
                })]
            }, l.id)
        })
    })
}
const mr = [{
        id: "debug",
        title: "Debug",
        triggers: [{
            id: "input-by-selector",
            name: "Input by Selector (Draft Editor)",
            browser_action: "browser_input",
            payload: {
                selector: ".notranslate.public-DraftEditor-content",
                text: "hello world"
            }
        }]
    }, {
        id: "navigation",
        title: "Navigation",
        triggers: [{
            id: "nav-google",
            name: "Google (Search)",
            browser_action: "browser_navigate",
            payload: {
                url: "https://www.google.com/search?q=林俊杰"
            },
            hideJson: !0
        }, {
            id: "nav-google-manus",
            name: "Google (Search Manus)",
            browser_action: "browser_navigate",
            payload: {
                url: "https://www.google.com/search?q=manus"
            },
            hideJson: !0
        }, {
            id: "nav-baidu",
            name: "Baidu (Search)",
            browser_action: "browser_navigate",
            payload: {
                url: "https://www.baidu.com/s?wd=人工智能"
            },
            hideJson: !0
        }, {
            id: "nav-bing",
            name: "Bing (Search)",
            browser_action: "browser_navigate",
            payload: {
                url: "https://www.bing.com/search?q=machine+learning"
            },
            hideJson: !0
        }, {
            id: "nav-linkedin",
            name: "LinkedIn Feed",
            browser_action: "browser_navigate",
            payload: {
                url: "https://www.linkedin.com/feed/"
            },
            hideJson: !0
        }, {
            id: "nav-twitter",
            name: "Twitter",
            browser_action: "browser_navigate",
            payload: {
                url: "https://twitter.com"
            },
            hideJson: !0
        }, {
            id: "nav-instagram",
            name: "Instagram Explore",
            browser_action: "browser_navigate",
            payload: {
                url: "https://www.instagram.com/explore/"
            },
            hideJson: !0
        }, {
            id: "nav-tiktok",
            name: "TikTok For You",
            browser_action: "browser_navigate",
            payload: {
                url: "https://www.tiktok.com/foryou"
            },
            hideJson: !0
        }, {
            id: "nav-youtube",
            name: "YouTube (Search)",
            browser_action: "browser_navigate",
            payload: {
                url: "https://www.youtube.com/results?search_query=飞轮海"
            },
            hideJson: !0
        }, {
            id: "nav-netflix",
            name: "Netflix Browse",
            browser_action: "browser_navigate",
            payload: {
                url: "https://www.netflix.com/browse"
            },
            hideJson: !0
        }, {
            id: "nav-github",
            name: "GitHub",
            browser_action: "browser_navigate",
            payload: {
                url: "https://github.com"
            },
            hideJson: !0
        }, {
            id: "nav-stackoverflow",
            name: "Stack Overflow",
            browser_action: "browser_navigate",
            payload: {
                url: "https://stackoverflow.com"
            },
            hideJson: !0
        }, {
            id: "nav-hackernews",
            name: "Hacker News",
            browser_action: "browser_navigate",
            payload: {
                url: "https://news.ycombinator.com/"
            },
            hideJson: !0
        }, {
            id: "nav-devto",
            name: "Dev.to",
            browser_action: "browser_navigate",
            payload: {
                url: "https://dev.to/"
            },
            hideJson: !0
        }, {
            id: "nav-reddit",
            name: "Reddit r/programming",
            browser_action: "browser_navigate",
            payload: {
                url: "https://www.reddit.com/r/programming/"
            },
            hideJson: !0
        }, {
            id: "nav-medium",
            name: "Medium Technology",
            browser_action: "browser_navigate",
            payload: {
                url: "https://medium.com/tag/technology"
            },
            hideJson: !0
        }, {
            id: "nav-producthunt",
            name: "Product Hunt",
            browser_action: "browser_navigate",
            payload: {
                url: "https://www.producthunt.com/"
            },
            hideJson: !0
        }, {
            id: "nav-gmail",
            name: "Gmail",
            browser_action: "browser_navigate",
            payload: {
                url: "https://mail.google.com/mail/u/0/"
            },
            hideJson: !0
        }, {
            id: "nav-spotify",
            name: "Spotify Search",
            browser_action: "browser_navigate",
            payload: {
                url: "https://open.spotify.com/search"
            },
            hideJson: !0
        }, {
            id: "nav-wikipedia",
            name: "Wikipedia",
            browser_action: "browser_navigate",
            payload: {
                url: "https://en.wikipedia.org"
            },
            hideJson: !0
        }, {
            id: "nav-amazon",
            name: "Amazon",
            browser_action: "browser_navigate",
            payload: {
                url: "https://www.amazon.com"
            },
            hideJson: !0
        }]
    }, {
        id: "scroll-actions",
        title: "Scroll Actions",
        triggers: [{
            id: "scroll-up",
            name: "Scroll Up",
            browser_action: "browser_scroll_up",
            payload: {
                to_top: !1
            },
            hideJson: !0
        }, {
            id: "scroll-to-top",
            name: "Scroll to Top",
            browser_action: "browser_scroll_up",
            payload: {
                to_top: !0
            },
            hideJson: !0
        }, {
            id: "scroll-down",
            name: "Scroll Down",
            browser_action: "browser_scroll_down",
            payload: {
                to_bottom: !1
            },
            hideJson: !0
        }, {
            id: "scroll-to-bottom",
            name: "Scroll to Bottom",
            browser_action: "browser_scroll_down",
            payload: {
                to_bottom: !0
            },
            hideJson: !0
        }, {
            id: "scroll-left",
            name: "Scroll Left",
            browser_action: "browser_scroll_left",
            payload: {
                to_end: !1
            },
            hideJson: !0
        }, {
            id: "scroll-to-start",
            name: "Scroll to Start",
            browser_action: "browser_scroll_left",
            payload: {
                to_end: !0
            },
            hideJson: !0
        }, {
            id: "scroll-right",
            name: "Scroll Right",
            browser_action: "browser_scroll_right",
            payload: {
                to_end: !1
            },
            hideJson: !0
        }, {
            id: "scroll-to-end",
            name: "Scroll to End",
            browser_action: "browser_scroll_right",
            payload: {
                to_end: !0
            },
            hideJson: !0
        }]
    }, {
        id: "container-scroll-actions",
        title: "Container Scroll (by Coordinates)",
        triggers: [{
            id: "container-scroll-up",
            name: "Container Scroll Up (Center)",
            browser_action: "browser_scroll_up",
            payload: {
                target: "container",
                to_end: !1,
                coordinate_x: 640,
                coordinate_y: 360,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }, {
            id: "container-scroll-down",
            name: "Container Scroll Down (Center)",
            browser_action: "browser_scroll_down",
            payload: {
                target: "container",
                to_end: !1,
                coordinate_x: 640,
                coordinate_y: 360,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }, {
            id: "container-scroll-to-top",
            name: "Container Scroll to Top (Center)",
            browser_action: "browser_scroll_up",
            payload: {
                target: "container",
                to_end: !0,
                coordinate_x: 640,
                coordinate_y: 360,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }, {
            id: "container-scroll-to-bottom",
            name: "Container Scroll to Bottom (Center)",
            browser_action: "browser_scroll_down",
            payload: {
                target: "container",
                to_end: !0,
                coordinate_x: 640,
                coordinate_y: 360,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }, {
            id: "container-scroll-left",
            name: "Container Scroll Left (Center)",
            browser_action: "browser_scroll_left",
            payload: {
                target: "container",
                to_end: !1,
                coordinate_x: 640,
                coordinate_y: 360,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }, {
            id: "container-scroll-right",
            name: "Container Scroll Right (Center)",
            browser_action: "browser_scroll_right",
            payload: {
                target: "container",
                to_end: !1,
                coordinate_x: 640,
                coordinate_y: 360,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }]
    }, {
        id: "container-scroll-scenarios",
        title: "Container Scroll Scenarios",
        triggers: [{
            id: "google-search-scroll-down",
            name: "Google Search: Scroll Down",
            browser_action: "browser_scroll_down",
            payload: {
                target: "container",
                to_end: !1,
                coordinate_x: 640,
                coordinate_y: 400,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }, {
            id: "google-search-scroll-up",
            name: "Google Search: Scroll Up",
            browser_action: "browser_scroll_up",
            payload: {
                target: "container",
                to_end: !1,
                coordinate_x: 640,
                coordinate_y: 400,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }, {
            id: "google-search-scroll-to-bottom",
            name: "Google Search: Scroll to Bottom",
            browser_action: "browser_scroll_down",
            payload: {
                target: "container",
                to_end: !0,
                coordinate_x: 640,
                coordinate_y: 400,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }, {
            id: "google-search-scroll-to-top",
            name: "Google Search: Scroll to Top",
            browser_action: "browser_scroll_up",
            payload: {
                target: "container",
                to_end: !0,
                coordinate_x: 640,
                coordinate_y: 400,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }, {
            id: "gmail-scroll-down",
            name: "Gmail: Scroll Down",
            browser_action: "browser_scroll_down",
            payload: {
                target: "container",
                to_end: !1,
                coordinate_x: 640,
                coordinate_y: 400,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }, {
            id: "gmail-scroll-up",
            name: "Gmail: Scroll Up",
            browser_action: "browser_scroll_up",
            payload: {
                target: "container",
                to_end: !1,
                coordinate_x: 640,
                coordinate_y: 400,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }, {
            id: "gmail-scroll-to-bottom",
            name: "Gmail: Scroll to Bottom",
            browser_action: "browser_scroll_down",
            payload: {
                target: "container",
                to_end: !0,
                coordinate_x: 640,
                coordinate_y: 400,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }, {
            id: "gmail-scroll-to-top",
            name: "Gmail: Scroll to Top",
            browser_action: "browser_scroll_up",
            payload: {
                target: "container",
                to_end: !0,
                coordinate_x: 640,
                coordinate_y: 400,
                viewport_width: 1280,
                viewport_height: 720
            },
            hideJson: !1
        }]
    }, {
        id: "general-actions",
        title: "General Actions",
        triggers: [{
            id: "navigate",
            name: "Navigate to URL",
            browser_action: "browser_navigate",
            payload: {
                url: "https://example.com"
            }
        }, {
            id: "click-index",
            name: "Click Element by Index",
            browser_action: "browser_click",
            payload: {
                index: 0
            }
        }, {
            id: "click-coord",
            name: "Click Element by Coordinates",
            browser_action: "browser_click",
            payload: {
                coordinate_x: 100,
                coordinate_y: 200
            }
        }, {
            id: "double-click-index",
            name: "Double Click by Index",
            browser_action: "browser_click",
            payload: {
                index: 0,
                click_type: "double_left"
            }
        }, {
            id: "triple-click-index",
            name: "Triple Click by Index",
            browser_action: "browser_click",
            payload: {
                index: 0,
                click_type: "triple_left"
            }
        }, {
            id: "right-click-index",
            name: "Right Click by Index",
            browser_action: "browser_click",
            payload: {
                index: 0,
                click_type: "right"
            }
        }, {
            id: "double-click-coord",
            name: "Double Click by Coordinates",
            browser_action: "browser_click",
            payload: {
                coordinate_x: 100,
                coordinate_y: 200,
                click_type: "double_left"
            }
        }, {
            id: "triple-click-coord",
            name: "Triple Click by Coordinates",
            browser_action: "browser_click",
            payload: {
                coordinate_x: 100,
                coordinate_y: 200,
                click_type: "triple_left"
            }
        }, {
            id: "right-click-coord",
            name: "Right Click by Coordinates",
            browser_action: "browser_click",
            payload: {
                coordinate_x: 100,
                coordinate_y: 200,
                click_type: "right"
            }
        }, {
            id: "input",
            name: "Input Text",
            browser_action: "browser_input",
            payload: {
                index: 0,
                text: "hello world",
                press_enter: !1
            }
        }, {
            id: "press-key",
            name: "Press Keyboard Key",
            browser_action: "browser_press_key",
            payload: {
                key: "Enter"
            }
        }, {
            id: "find-keyword",
            name: "Find Keyword",
            browser_action: "browser_find_keyword",
            payload: {
                keyword: "search term"
            }
        }, {
            id: "mouse-move",
            name: "Move Mouse to Coordinates",
            browser_action: "browser_move_mouse",
            payload: {
                coordinate_x: 640,
                coordinate_y: 478,
                viewport_width: 1280,
                viewport_height: 956
            }
        }]
    }, {
        id: "keyboard-keys",
        title: "Press Keyboard Key",
        triggers: [{
            id: "key-f1",
            name: "F1",
            browser_action: "browser_press_key",
            payload: {
                key: "F1"
            },
            hideJson: !0
        }, {
            id: "key-f2",
            name: "F2",
            browser_action: "browser_press_key",
            payload: {
                key: "F2"
            },
            hideJson: !0
        }, {
            id: "key-f3",
            name: "F3",
            browser_action: "browser_press_key",
            payload: {
                key: "F3"
            },
            hideJson: !0
        }, {
            id: "key-f4",
            name: "F4",
            browser_action: "browser_press_key",
            payload: {
                key: "F4"
            },
            hideJson: !0
        }, {
            id: "key-f5",
            name: "F5",
            browser_action: "browser_press_key",
            payload: {
                key: "F5"
            },
            hideJson: !0
        }, {
            id: "key-f6",
            name: "F6",
            browser_action: "browser_press_key",
            payload: {
                key: "F6"
            },
            hideJson: !0
        }, {
            id: "key-f7",
            name: "F7",
            browser_action: "browser_press_key",
            payload: {
                key: "F7"
            },
            hideJson: !0
        }, {
            id: "key-f8",
            name: "F8",
            browser_action: "browser_press_key",
            payload: {
                key: "F8"
            },
            hideJson: !0
        }, {
            id: "key-f9",
            name: "F9",
            browser_action: "browser_press_key",
            payload: {
                key: "F9"
            },
            hideJson: !0
        }, {
            id: "key-f10",
            name: "F10",
            browser_action: "browser_press_key",
            payload: {
                key: "F10"
            },
            hideJson: !0
        }, {
            id: "key-f11",
            name: "F11",
            browser_action: "browser_press_key",
            payload: {
                key: "F11"
            },
            hideJson: !0
        }, {
            id: "key-f12",
            name: "F12",
            browser_action: "browser_press_key",
            payload: {
                key: "F12"
            },
            hideJson: !0
        }, {
            id: "key-escape",
            name: "Escape",
            browser_action: "browser_press_key",
            payload: {
                key: "Escape"
            },
            hideJson: !0
        }, {
            id: "key-tab",
            name: "Tab",
            browser_action: "browser_press_key",
            payload: {
                key: "Tab"
            },
            hideJson: !0
        }, {
            id: "key-capslock",
            name: "CapsLock",
            browser_action: "browser_press_key",
            payload: {
                key: "CapsLock"
            },
            hideJson: !0
        }, {
            id: "key-enter",
            name: "Enter",
            browser_action: "browser_press_key",
            payload: {
                key: "Enter"
            },
            hideJson: !0
        }, {
            id: "key-backspace",
            name: "Backspace",
            browser_action: "browser_press_key",
            payload: {
                key: "Backspace"
            },
            hideJson: !0
        }, {
            id: "key-space",
            name: "Space",
            browser_action: "browser_press_key",
            payload: {
                key: " "
            },
            hideJson: !0
        }, {
            id: "key-0",
            name: "0",
            browser_action: "browser_press_key",
            payload: {
                key: "0"
            },
            hideJson: !0
        }, {
            id: "key-1",
            name: "1",
            browser_action: "browser_press_key",
            payload: {
                key: "1"
            },
            hideJson: !0
        }, {
            id: "key-2",
            name: "2",
            browser_action: "browser_press_key",
            payload: {
                key: "2"
            },
            hideJson: !0
        }, {
            id: "key-3",
            name: "3",
            browser_action: "browser_press_key",
            payload: {
                key: "3"
            },
            hideJson: !0
        }, {
            id: "key-4",
            name: "4",
            browser_action: "browser_press_key",
            payload: {
                key: "4"
            },
            hideJson: !0
        }, {
            id: "key-5",
            name: "5",
            browser_action: "browser_press_key",
            payload: {
                key: "5"
            },
            hideJson: !0
        }, {
            id: "key-6",
            name: "6",
            browser_action: "browser_press_key",
            payload: {
                key: "6"
            },
            hideJson: !0
        }, {
            id: "key-7",
            name: "7",
            browser_action: "browser_press_key",
            payload: {
                key: "7"
            },
            hideJson: !0
        }, {
            id: "key-8",
            name: "8",
            browser_action: "browser_press_key",
            payload: {
                key: "8"
            },
            hideJson: !0
        }, {
            id: "key-9",
            name: "9",
            browser_action: "browser_press_key",
            payload: {
                key: "9"
            },
            hideJson: !0
        }, {
            id: "key-a",
            name: "A",
            browser_action: "browser_press_key",
            payload: {
                key: "A"
            },
            hideJson: !0
        }, {
            id: "key-b",
            name: "B",
            browser_action: "browser_press_key",
            payload: {
                key: "B"
            },
            hideJson: !0
        }, {
            id: "key-c",
            name: "C",
            browser_action: "browser_press_key",
            payload: {
                key: "C"
            },
            hideJson: !0
        }, {
            id: "key-d",
            name: "D",
            browser_action: "browser_press_key",
            payload: {
                key: "D"
            },
            hideJson: !0
        }, {
            id: "key-e",
            name: "E",
            browser_action: "browser_press_key",
            payload: {
                key: "E"
            },
            hideJson: !0
        }, {
            id: "key-f",
            name: "F",
            browser_action: "browser_press_key",
            payload: {
                key: "F"
            },
            hideJson: !0
        }, {
            id: "key-g",
            name: "G",
            browser_action: "browser_press_key",
            payload: {
                key: "G"
            },
            hideJson: !0
        }, {
            id: "key-h",
            name: "H",
            browser_action: "browser_press_key",
            payload: {
                key: "H"
            },
            hideJson: !0
        }, {
            id: "key-i",
            name: "I",
            browser_action: "browser_press_key",
            payload: {
                key: "I"
            },
            hideJson: !0
        }, {
            id: "key-j",
            name: "J",
            browser_action: "browser_press_key",
            payload: {
                key: "J"
            },
            hideJson: !0
        }, {
            id: "key-k",
            name: "K",
            browser_action: "browser_press_key",
            payload: {
                key: "K"
            },
            hideJson: !0
        }, {
            id: "key-l",
            name: "L",
            browser_action: "browser_press_key",
            payload: {
                key: "L"
            },
            hideJson: !0
        }, {
            id: "key-m",
            name: "M",
            browser_action: "browser_press_key",
            payload: {
                key: "M"
            },
            hideJson: !0
        }, {
            id: "key-n",
            name: "N",
            browser_action: "browser_press_key",
            payload: {
                key: "N"
            },
            hideJson: !0
        }, {
            id: "key-o",
            name: "O",
            browser_action: "browser_press_key",
            payload: {
                key: "O"
            },
            hideJson: !0
        }, {
            id: "key-p",
            name: "P",
            browser_action: "browser_press_key",
            payload: {
                key: "P"
            },
            hideJson: !0
        }, {
            id: "key-q",
            name: "Q",
            browser_action: "browser_press_key",
            payload: {
                key: "Q"
            },
            hideJson: !0
        }, {
            id: "key-r",
            name: "R",
            browser_action: "browser_press_key",
            payload: {
                key: "R"
            },
            hideJson: !0
        }, {
            id: "key-s",
            name: "S",
            browser_action: "browser_press_key",
            payload: {
                key: "S"
            },
            hideJson: !0
        }, {
            id: "key-t",
            name: "T",
            browser_action: "browser_press_key",
            payload: {
                key: "T"
            },
            hideJson: !0
        }, {
            id: "key-u",
            name: "U",
            browser_action: "browser_press_key",
            payload: {
                key: "U"
            },
            hideJson: !0
        }, {
            id: "key-v",
            name: "V",
            browser_action: "browser_press_key",
            payload: {
                key: "V"
            },
            hideJson: !0
        }, {
            id: "key-w",
            name: "W",
            browser_action: "browser_press_key",
            payload: {
                key: "W"
            },
            hideJson: !0
        }, {
            id: "key-x",
            name: "X",
            browser_action: "browser_press_key",
            payload: {
                key: "X"
            },
            hideJson: !0
        }, {
            id: "key-y",
            name: "Y",
            browser_action: "browser_press_key",
            payload: {
                key: "Y"
            },
            hideJson: !0
        }, {
            id: "key-z",
            name: "Z",
            browser_action: "browser_press_key",
            payload: {
                key: "Z"
            },
            hideJson: !0
        }, {
            id: "key-backquote",
            name: "` (Backquote)",
            browser_action: "browser_press_key",
            payload: {
                key: "`"
            },
            hideJson: !0
        }, {
            id: "key-minus",
            name: "- (Minus)",
            browser_action: "browser_press_key",
            payload: {
                key: "-"
            },
            hideJson: !0
        }, {
            id: "key-equal",
            name: "= (Equal)",
            browser_action: "browser_press_key",
            payload: {
                key: "="
            },
            hideJson: !0
        }, {
            id: "key-bracketleft",
            name: "[ (BracketLeft)",
            browser_action: "browser_press_key",
            payload: {
                key: "["
            },
            hideJson: !0
        }, {
            id: "key-bracketright",
            name: "] (BracketRight)",
            browser_action: "browser_press_key",
            payload: {
                key: "]"
            },
            hideJson: !0
        }, {
            id: "key-backslash",
            name: "\\ (Backslash)",
            browser_action: "browser_press_key",
            payload: {
                key: "\\"
            },
            hideJson: !0
        }, {
            id: "key-semicolon",
            name: "; (Semicolon)",
            browser_action: "browser_press_key",
            payload: {
                key: ";"
            },
            hideJson: !0
        }, {
            id: "key-quote",
            name: "' (Quote)",
            browser_action: "browser_press_key",
            payload: {
                key: "'"
            },
            hideJson: !0
        }, {
            id: "key-comma",
            name: ", (Comma)",
            browser_action: "browser_press_key",
            payload: {
                key: ","
            },
            hideJson: !0
        }, {
            id: "key-period",
            name: ". (Period)",
            browser_action: "browser_press_key",
            payload: {
                key: "."
            },
            hideJson: !0
        }, {
            id: "key-slash",
            name: "/ (Slash)",
            browser_action: "browser_press_key",
            payload: {
                key: "/"
            },
            hideJson: !0
        }, {
            id: "key-arrowup",
            name: "Arrow Up",
            browser_action: "browser_press_key",
            payload: {
                key: "ArrowUp"
            },
            hideJson: !0
        }, {
            id: "key-arrowdown",
            name: "Arrow Down",
            browser_action: "browser_press_key",
            payload: {
                key: "ArrowDown"
            },
            hideJson: !0
        }, {
            id: "key-arrowleft",
            name: "Arrow Left",
            browser_action: "browser_press_key",
            payload: {
                key: "ArrowLeft"
            },
            hideJson: !0
        }, {
            id: "key-arrowright",
            name: "Arrow Right",
            browser_action: "browser_press_key",
            payload: {
                key: "ArrowRight"
            },
            hideJson: !0
        }, {
            id: "key-home",
            name: "Home",
            browser_action: "browser_press_key",
            payload: {
                key: "Home"
            },
            hideJson: !0
        }, {
            id: "key-end",
            name: "End",
            browser_action: "browser_press_key",
            payload: {
                key: "End"
            },
            hideJson: !0
        }, {
            id: "key-pageup",
            name: "Page Up",
            browser_action: "browser_press_key",
            payload: {
                key: "PageUp"
            },
            hideJson: !0
        }, {
            id: "key-pagedown",
            name: "Page Down",
            browser_action: "browser_press_key",
            payload: {
                key: "PageDown"
            },
            hideJson: !0
        }, {
            id: "key-insert",
            name: "Insert",
            browser_action: "browser_press_key",
            payload: {
                key: "Insert"
            },
            hideJson: !0
        }, {
            id: "key-delete",
            name: "Delete",
            browser_action: "browser_press_key",
            payload: {
                key: "Delete"
            },
            hideJson: !0
        }, {
            id: "key-numpad0",
            name: "Numpad 0",
            browser_action: "browser_press_key",
            payload: {
                key: "Numpad0"
            },
            hideJson: !0
        }, {
            id: "key-numpad1",
            name: "Numpad 1",
            browser_action: "browser_press_key",
            payload: {
                key: "Numpad1"
            },
            hideJson: !0
        }, {
            id: "key-numpad2",
            name: "Numpad 2",
            browser_action: "browser_press_key",
            payload: {
                key: "Numpad2"
            },
            hideJson: !0
        }, {
            id: "key-numpad3",
            name: "Numpad 3",
            browser_action: "browser_press_key",
            payload: {
                key: "Numpad3"
            },
            hideJson: !0
        }, {
            id: "key-numpad4",
            name: "Numpad 4",
            browser_action: "browser_press_key",
            payload: {
                key: "Numpad4"
            },
            hideJson: !0
        }, {
            id: "key-numpad5",
            name: "Numpad 5",
            browser_action: "browser_press_key",
            payload: {
                key: "Numpad5"
            },
            hideJson: !0
        }, {
            id: "key-numpad6",
            name: "Numpad 6",
            browser_action: "browser_press_key",
            payload: {
                key: "Numpad6"
            },
            hideJson: !0
        }, {
            id: "key-numpad7",
            name: "Numpad 7",
            browser_action: "browser_press_key",
            payload: {
                key: "Numpad7"
            },
            hideJson: !0
        }, {
            id: "key-numpad8",
            name: "Numpad 8",
            browser_action: "browser_press_key",
            payload: {
                key: "Numpad8"
            },
            hideJson: !0
        }, {
            id: "key-numpad9",
            name: "Numpad 9",
            browser_action: "browser_press_key",
            payload: {
                key: "Numpad9"
            },
            hideJson: !0
        }, {
            id: "key-numpad-multiply",
            name: "Numpad *",
            browser_action: "browser_press_key",
            payload: {
                key: "NumpadMultiply"
            },
            hideJson: !0
        }, {
            id: "key-numpad-add",
            name: "Numpad +",
            browser_action: "browser_press_key",
            payload: {
                key: "NumpadAdd"
            },
            hideJson: !0
        }, {
            id: "key-numpad-subtract",
            name: "Numpad -",
            browser_action: "browser_press_key",
            payload: {
                key: "NumpadSubtract"
            },
            hideJson: !0
        }, {
            id: "key-numpad-decimal",
            name: "Numpad .",
            browser_action: "browser_press_key",
            payload: {
                key: "NumpadDecimal"
            },
            hideJson: !0
        }, {
            id: "key-numpad-divide",
            name: "Numpad /",
            browser_action: "browser_press_key",
            payload: {
                key: "NumpadDivide"
            },
            hideJson: !0
        }, {
            id: "key-numpad-enter",
            name: "Numpad Enter",
            browser_action: "browser_press_key",
            payload: {
                key: "NumpadEnter"
            },
            hideJson: !0
        }]
    }, {
        id: "combined-keys",
        title: "Combined Keys",
        triggers: [{
            id: "combo-ctrl-c",
            name: "Ctrl+C (Copy)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+C"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-c",
            name: "Cmd+C (Copy Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+C"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-v",
            name: "Ctrl+V (Paste)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+V"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-v",
            name: "Cmd+V (Paste Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+V"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-x",
            name: "Ctrl+X (Cut)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+X"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-x",
            name: "Cmd+X (Cut Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+X"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-a",
            name: "Ctrl+A (Select All)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+A"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-a",
            name: "Cmd+A (Select All Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+A"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-z",
            name: "Ctrl+Z (Undo)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+Z"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-z",
            name: "Cmd+Z (Undo Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+Z"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-y",
            name: "Ctrl+Y (Redo)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+Y"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-y",
            name: "Cmd+Y (Redo Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+Y"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-s",
            name: "Ctrl+S (Save)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+S"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-s",
            name: "Cmd+S (Save Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+S"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f",
            name: "Ctrl+F (Find)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f",
            name: "Cmd+F (Find Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F"
            },
            hideJson: !0
        }, {
            id: "combo-home",
            name: "Home",
            browser_action: "browser_press_key",
            payload: {
                key: "Home"
            },
            hideJson: !0
        }, {
            id: "combo-end",
            name: "End",
            browser_action: "browser_press_key",
            payload: {
                key: "End"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-home",
            name: "Ctrl+Home (Doc Start)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+Home"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-home",
            name: "Cmd+Home (Doc Start Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+Home"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-end",
            name: "Ctrl+End (Doc End)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+End"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-end",
            name: "Cmd+End (Doc End Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+End"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-left",
            name: "Ctrl+Left (Word Left)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+ArrowLeft"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-left",
            name: "Cmd+Left (Word Left Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+ArrowLeft"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-right",
            name: "Ctrl+Right (Word Right)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+ArrowRight"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-right",
            name: "Cmd+Right (Word Right Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+ArrowRight"
            },
            hideJson: !0
        }, {
            id: "combo-shift-tab",
            name: "Shift+Tab",
            browser_action: "browser_press_key",
            payload: {
                key: "Shift+Tab"
            },
            hideJson: !0
        }, {
            id: "combo-shift-enter",
            name: "Shift+Enter",
            browser_action: "browser_press_key",
            payload: {
                key: "Shift+Enter"
            },
            hideJson: !0
        }, {
            id: "combo-shift-home",
            name: "Shift+Home (Select to Line Start)",
            browser_action: "browser_press_key",
            payload: {
                key: "Shift+Home"
            },
            hideJson: !0
        }, {
            id: "combo-shift-end",
            name: "Shift+End (Select to Line End)",
            browser_action: "browser_press_key",
            payload: {
                key: "Shift+End"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-t",
            name: "Ctrl+T (New Tab)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+T"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-t",
            name: "Cmd+T (New Tab Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+T"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-w",
            name: "Ctrl+W (Close Tab)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+W"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-w",
            name: "Cmd+W (Close Tab Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+W"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-tab",
            name: "Ctrl+Tab (Next Tab)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+Tab"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-shift-t",
            name: "Ctrl+Shift+T (Reopen Tab)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+Shift+T"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-shift-t",
            name: "Cmd+Shift+T (Reopen Tab Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+Shift+T"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-l",
            name: "Ctrl+L (Address Bar)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+L"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-l",
            name: "Cmd+L (Address Bar Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+L"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-r",
            name: "Ctrl+R (Reload)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+R"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-r",
            name: "Cmd+R (Reload Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+R"
            },
            hideJson: !0
        }, {
            id: "combo-alt-left",
            name: "Alt+Left (Back)",
            browser_action: "browser_press_key",
            payload: {
                key: "Alt+ArrowLeft"
            },
            hideJson: !0
        }, {
            id: "combo-alt-right",
            name: "Alt+Right (Forward)",
            browser_action: "browser_press_key",
            payload: {
                key: "Alt+ArrowRight"
            },
            hideJson: !0
        }, {
            id: "combo-alt-home",
            name: "Alt+Home (Homepage)",
            browser_action: "browser_press_key",
            payload: {
                key: "Alt+Home"
            },
            hideJson: !0
        }, {
            id: "combo-f5",
            name: "F5 (Refresh)",
            browser_action: "browser_press_key",
            payload: {
                key: "F5"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f5",
            name: "Ctrl+F5 (Hard Refresh)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F5"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f5",
            name: "Cmd+F5 (Hard Refresh Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F5"
            },
            hideJson: !0
        }, {
            id: "combo-alt-f4",
            name: "Alt+F4 (Close Window)",
            browser_action: "browser_press_key",
            payload: {
                key: "Alt+F4"
            },
            hideJson: !0
        }, {
            id: "combo-shift-f10",
            name: "Shift+F10 (Context Menu)",
            browser_action: "browser_press_key",
            payload: {
                key: "Shift+F10"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f1",
            name: "Ctrl+F1",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F1"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f1",
            name: "Cmd+F1 (Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F1"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f2",
            name: "Ctrl+F2",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F2"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f2",
            name: "Cmd+F2 (Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F2"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f3",
            name: "Ctrl+F3",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F3"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f3",
            name: "Cmd+F3 (Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F3"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f4",
            name: "Ctrl+F4 (Close Tab)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F4"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f4",
            name: "Cmd+F4 (Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F4"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f6",
            name: "Ctrl+F6 (Next Document)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F6"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f6",
            name: "Cmd+F6 (Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F6"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f7",
            name: "Ctrl+F7",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F7"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f7",
            name: "Cmd+F7 (Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F7"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f8",
            name: "Ctrl+F8",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F8"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f8",
            name: "Cmd+F8 (Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F8"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f9",
            name: "Ctrl+F9",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F9"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f9",
            name: "Cmd+F9 (Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F9"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f10",
            name: "Ctrl+F10",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F10"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f10",
            name: "Cmd+F10 (Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F10"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f11",
            name: "Ctrl+F11",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F11"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f11",
            name: "Cmd+F11 (Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F11"
            },
            hideJson: !0
        }, {
            id: "combo-ctrl-f12",
            name: "Ctrl+F12 (DevTools)",
            browser_action: "browser_press_key",
            payload: {
                key: "Control+F12"
            },
            hideJson: !0
        }, {
            id: "combo-cmd-f12",
            name: "Cmd+F12 (Mac)",
            browser_action: "browser_press_key",
            payload: {
                key: "Meta+F12"
            },
            hideJson: !0
        }]
    }],
    ao = Et(function() {
        var t;
        const n = ((t = fe.activeTab) == null ? void 0 : t.id) ?? null,
            h = fe.getActionState(Or),
            r = h.status === "loading";
        return g.jsxs("div", {
            className: "h-full overflow-y-auto",
            children: [g.jsxs("div", {
                className: "mb-4",
                children: [g.jsx("h2", {
                    className: "text-lg font-semibold text-white mb-1",
                    children: "Browser Actions"
                }), g.jsx("p", {
                    className: "text-sm text-[#94a3b8] mb-3",
                    children: "Manually trigger browser actions for testing and debugging. Edit the JSON payload and click Trigger to execute."
                })]
            }), g.jsxs("div", {
                className: "mb-6",
                children: [g.jsx("button", {
                    type: "button",
                    onClick: () => _t.viewScreen(),
                    disabled: r || n === null,
                    className: `clickable w-full px-4 py-3 rounded-lg text-white font-medium transition-all flex items-center justify-center gap-2 ${r?"bg-[#5a63ed]/50 cursor-wait":n===null?"bg-[#5a63ed]/30 cursor-not-allowed opacity-50":"bg-[#5a63ed] hover:bg-[#4a53dd] active:bg-[#3a43cd]"}`,
                    children: r ? g.jsx("span", {
                        children: "Viewing..."
                    }) : g.jsx("span", {
                        children: "View Screen"
                    })
                }), h.status === "error" && g.jsx("p", {
                    className: "mt-2 text-sm text-red-400",
                    children: h.error
                }), h.status === "success" && g.jsx("p", {
                    className: "mt-2 text-sm text-green-400",
                    children: "✓ View captured successfully"
                })]
            }), mr.map((e, i) => g.jsxs("div", {
                className: i < mr.length - 1 ? "mb-6" : "",
                children: [g.jsxs("div", {
                    className: "mb-3",
                    children: [g.jsx("h3", {
                        className: "text-sm font-semibold text-white mb-2",
                        children: e.title
                    }), g.jsx("div", {
                        className: "h-px bg-[#94a3b8]/10"
                    })]
                }), g.jsx(ro, {
                    triggers: e.triggers,
                    onTrigger: (u, l, d) => _t.triggerBrowserAction(u, l, d),
                    getActionStatus: u => fe.getActionState(u)
                })]
            }, e.id))]
        })
    });

function no({
    scenarios: a,
    runningId: n,
    onRunScenario: h,
    onStopScenario: r
}) {
    const [t, e] = Re.useState({}), i = () => {
        const d = {};
        for (const m of a) d[m.id] = !0;
        e(d)
    }, u = () => {
        e({})
    }, l = d => {
        e(m => ({
            ...m,
            [d]: !m[d]
        }))
    };
    return a.length === 0 ? g.jsx("div", {
        className: "text-sm text-white/75",
        children: g.jsx("p", {
            children: "No scenarios available."
        })
    }) : g.jsxs("div", {
        className: "flex flex-col gap-3",
        children: [g.jsxs("div", {
            className: "flex flex-col gap-2",
            children: [g.jsx("button", {
                type: "button",
                onClick: i,
                disabled: a.length === 0,
                className: "px-3 py-2 rounded-lg border-none bg-white/10 text-white text-sm cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-white/15",
                children: "Expand All Steps"
            }), g.jsx("button", {
                type: "button",
                onClick: u,
                disabled: a.length === 0,
                className: "px-3 py-2 rounded-lg border-none bg-white/10 text-white text-sm cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-white/15",
                children: "Collapse All Steps"
            })]
        }), a.map(d => g.jsx(oo, {
            scenario: d,
            runningId: n,
            isStepsExpanded: t[d.id] || !1,
            onToggleSteps: () => l(d.id),
            onRun: h,
            onStop: r
        }, d.id))]
    })
}

function oo({
    scenario: a,
    runningId: n,
    isStepsExpanded: h,
    onToggleSteps: r,
    onRun: t,
    onStop: e
}) {
    const i = n !== null;
    return g.jsxs("article", {
        className: "border border-white/8 rounded-[10px] p-3 bg-white/[0.03]",
        children: [g.jsx("h3", {
            className: "m-0 mb-1 text-[15px] font-semibold text-white",
            children: a.name
        }), a.description && g.jsx("p", {
            className: "m-0 mb-2 text-sm text-white/75",
            children: a.description
        }), g.jsxs("div", {
            className: "flex items-center gap-2 mb-2",
            children: [g.jsxs("span", {
                className: "inline-block text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/90",
                children: [a.stepCount, " steps"]
            }), a.steps && a.steps.length > 0 && g.jsx("button", {
                type: "button",
                onClick: r,
                className: "text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/75 border-none cursor-pointer transition-colors hover:bg-white/10 hover:text-white",
                children: h ? "Collapse" : `Expand ${a.stepCount} steps`
            })]
        }), h && a.steps && g.jsx(so, {
            steps: a.steps
        }), g.jsxs("div", {
            className: "flex gap-2",
            children: [g.jsx("button", {
                type: "button",
                onClick: () => t(a.id),
                disabled: i,
                className: "px-3 py-2 rounded-lg border-none bg-[#5a63ed] text-white cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:opacity-90",
                children: i ? "Scenario running" : "Run scenario"
            }), g.jsx("button", {
                type: "button",
                onClick: () => e(a.id),
                disabled: !n,
                className: "px-3 py-2 rounded-lg border-none bg-white/10 text-white cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-white/15",
                children: "Stop"
            })]
        })]
    })
}

function so({
    steps: a
}) {
    return g.jsx("div", {
        className: "mb-3 border border-white/5 rounded-lg p-2 bg-white/[0.02]",
        children: g.jsx("div", {
            className: "flex flex-col gap-1",
            children: a.map(n => g.jsx(io, {
                step: n
            }, n.stepNumber))
        })
    })
}

function io({
    step: a
}) {
    const [n, h] = Re.useState(!1);
    return g.jsxs("div", {
        className: "border border-white/5 rounded-md p-2 bg-white/[0.01]",
        children: [g.jsxs("div", {
            className: "flex items-start justify-between gap-2",
            children: [g.jsxs("div", {
                className: "flex-1",
                children: [g.jsxs("span", {
                    className: "text-xs text-white/50 font-mono",
                    children: ["Step ", a.stepNumber, ":"]
                }), " ", g.jsx("span", {
                    className: "text-sm text-white/90",
                    children: a.description
                })]
            }), g.jsx("button", {
                type: "button",
                onClick: () => h(!n),
                className: "text-xs px-2 py-0.5 rounded bg-white/5 text-white/60 border-none cursor-pointer transition-colors hover:bg-white/10 hover:text-white/90 flex-shrink-0",
                children: n ? "Hide JSON" : "View JSON"
            })]
        }), n && g.jsx("pre", {
            className: "mt-2 p-2 rounded bg-black/30 text-xs text-white/70 overflow-x-auto font-mono m-0",
            children: JSON.stringify(a.payload, null, 2)
        })]
    })
}
const co = Et(function() {
    const n = fe;
    return g.jsxs("div", {
        className: "flex flex-col gap-6",
        children: [n.error && g.jsx("div", {
            className: "p-3 rounded-lg bg-[#e74c3c]/15 text-[#ff9386] border border-[#e74c3c]/25",
            children: n.error
        }), g.jsxs("section", {
            children: [g.jsx("h2", {
                className: "text-lg font-semibold text-white mb-3",
                children: "Available Scenarios"
            }), g.jsx(no, {
                scenarios: Qn,
                runningId: n.runningId,
                onRunScenario: h => _t.runScenario(h),
                onStopScenario: h => _t.stopScenario(h)
            })]
        })]
    })
});
var Ar = {
    exports: {}
};
(function(a, n) {
    (function(h, r) {
        a.exports = r(Re)
    })(Dr, function(h) {
        return function(r) {
            var t = {};

            function e(i) {
                if (t[i]) return t[i].exports;
                var u = t[i] = {
                    i,
                    l: !1,
                    exports: {}
                };
                return r[i].call(u.exports, u, u.exports, e), u.l = !0, u.exports
            }
            return e.m = r, e.c = t, e.d = function(i, u, l) {
                e.o(i, u) || Object.defineProperty(i, u, {
                    enumerable: !0,
                    get: l
                })
            }, e.r = function(i) {
                typeof Symbol < "u" && Symbol.toStringTag && Object.defineProperty(i, Symbol.toStringTag, {
                    value: "Module"
                }), Object.defineProperty(i, "__esModule", {
                    value: !0
                })
            }, e.t = function(i, u) {
                if (1 & u && (i = e(i)), 8 & u || 4 & u && typeof i == "object" && i && i.__esModule) return i;
                var l = Object.create(null);
                if (e.r(l), Object.defineProperty(l, "default", {
                        enumerable: !0,
                        value: i
                    }), 2 & u && typeof i != "string")
                    for (var d in i) e.d(l, d, (function(m) {
                        return i[m]
                    }).bind(null, d));
                return l
            }, e.n = function(i) {
                var u = i && i.__esModule ? function() {
                    return i.default
                } : function() {
                    return i
                };
                return e.d(u, "a", u), u
            }, e.o = function(i, u) {
                return Object.prototype.hasOwnProperty.call(i, u)
            }, e.p = "", e(e.s = 48)
        }([function(r, t) {
            r.exports = h
        }, function(r, t) {
            var e = r.exports = {
                version: "2.6.12"
            };
            typeof __e == "number" && (__e = e)
        }, function(r, t, e) {
            var i = e(26)("wks"),
                u = e(17),
                l = e(3).Symbol,
                d = typeof l == "function";
            (r.exports = function(m) {
                return i[m] || (i[m] = d && l[m] || (d ? l : u)("Symbol." + m))
            }).store = i
        }, function(r, t) {
            var e = r.exports = typeof window < "u" && window.Math == Math ? window : typeof self < "u" && self.Math == Math ? self : Function("return this")();
            typeof __g == "number" && (__g = e)
        }, function(r, t, e) {
            r.exports = !e(8)(function() {
                return Object.defineProperty({}, "a", {
                    get: function() {
                        return 7
                    }
                }).a != 7
            })
        }, function(r, t) {
            var e = {}.hasOwnProperty;
            r.exports = function(i, u) {
                return e.call(i, u)
            }
        }, function(r, t, e) {
            var i = e(7),
                u = e(16);
            r.exports = e(4) ? function(l, d, m) {
                return i.f(l, d, u(1, m))
            } : function(l, d, m) {
                return l[d] = m, l
            }
        }, function(r, t, e) {
            var i = e(10),
                u = e(35),
                l = e(23),
                d = Object.defineProperty;
            t.f = e(4) ? Object.defineProperty : function(m, y, j) {
                if (i(m), y = l(y, !0), i(j), u) try {
                    return d(m, y, j)
                } catch {}
                if ("get" in j || "set" in j) throw TypeError("Accessors not supported!");
                return "value" in j && (m[y] = j.value), m
            }
        }, function(r, t) {
            r.exports = function(e) {
                try {
                    return !!e()
                } catch {
                    return !0
                }
            }
        }, function(r, t, e) {
            var i = e(40),
                u = e(22);
            r.exports = function(l) {
                return i(u(l))
            }
        }, function(r, t, e) {
            var i = e(11);
            r.exports = function(u) {
                if (!i(u)) throw TypeError(u + " is not an object!");
                return u
            }
        }, function(r, t) {
            r.exports = function(e) {
                return typeof e == "object" ? e !== null : typeof e == "function"
            }
        }, function(r, t) {
            r.exports = {}
        }, function(r, t, e) {
            var i = e(39),
                u = e(27);
            r.exports = Object.keys || function(l) {
                return i(l, u)
            }
        }, function(r, t) {
            r.exports = !0
        }, function(r, t, e) {
            var i = e(3),
                u = e(1),
                l = e(53),
                d = e(6),
                m = e(5),
                y = function(j, C, T) {
                    var I, U, te, B = j & y.F,
                        re = j & y.G,
                        o = j & y.S,
                        D = j & y.P,
                        J = j & y.B,
                        z = j & y.W,
                        $ = re ? u : u[C] || (u[C] = {}),
                        S = $.prototype,
                        N = re ? i : o ? i[C] : (i[C] || {}).prototype;
                    for (I in re && (T = C), T)(U = !B && N && N[I] !== void 0) && m($, I) || (te = U ? N[I] : T[I], $[I] = re && typeof N[I] != "function" ? T[I] : J && U ? l(te, i) : z && N[I] == te ? function(R) {
                        var V = function(k, Z, W) {
                            if (this instanceof R) {
                                switch (arguments.length) {
                                    case 0:
                                        return new R;
                                    case 1:
                                        return new R(k);
                                    case 2:
                                        return new R(k, Z)
                                }
                                return new R(k, Z, W)
                            }
                            return R.apply(this, arguments)
                        };
                        return V.prototype = R.prototype, V
                    }(te) : D && typeof te == "function" ? l(Function.call, te) : te, D && (($.virtual || ($.virtual = {}))[I] = te, j & y.R && S && !S[I] && d(S, I, te)))
                };
            y.F = 1, y.G = 2, y.S = 4, y.P = 8, y.B = 16, y.W = 32, y.U = 64, y.R = 128, r.exports = y
        }, function(r, t) {
            r.exports = function(e, i) {
                return {
                    enumerable: !(1 & e),
                    configurable: !(2 & e),
                    writable: !(4 & e),
                    value: i
                }
            }
        }, function(r, t) {
            var e = 0,
                i = Math.random();
            r.exports = function(u) {
                return "Symbol(".concat(u === void 0 ? "" : u, ")_", (++e + i).toString(36))
            }
        }, function(r, t, e) {
            var i = e(22);
            r.exports = function(u) {
                return Object(i(u))
            }
        }, function(r, t) {
            t.f = {}.propertyIsEnumerable
        }, function(r, t, e) {
            var i = e(52)(!0);
            e(34)(String, "String", function(u) {
                this._t = String(u), this._i = 0
            }, function() {
                var u, l = this._t,
                    d = this._i;
                return d >= l.length ? {
                    value: void 0,
                    done: !0
                } : (u = i(l, d), this._i += u.length, {
                    value: u,
                    done: !1
                })
            })
        }, function(r, t) {
            var e = Math.ceil,
                i = Math.floor;
            r.exports = function(u) {
                return isNaN(u = +u) ? 0 : (u > 0 ? i : e)(u)
            }
        }, function(r, t) {
            r.exports = function(e) {
                if (e == null) throw TypeError("Can't call method on  " + e);
                return e
            }
        }, function(r, t, e) {
            var i = e(11);
            r.exports = function(u, l) {
                if (!i(u)) return u;
                var d, m;
                if (l && typeof(d = u.toString) == "function" && !i(m = d.call(u)) || typeof(d = u.valueOf) == "function" && !i(m = d.call(u)) || !l && typeof(d = u.toString) == "function" && !i(m = d.call(u))) return m;
                throw TypeError("Can't convert object to primitive value")
            }
        }, function(r, t) {
            var e = {}.toString;
            r.exports = function(i) {
                return e.call(i).slice(8, -1)
            }
        }, function(r, t, e) {
            var i = e(26)("keys"),
                u = e(17);
            r.exports = function(l) {
                return i[l] || (i[l] = u(l))
            }
        }, function(r, t, e) {
            var i = e(1),
                u = e(3),
                l = u["__core-js_shared__"] || (u["__core-js_shared__"] = {});
            (r.exports = function(d, m) {
                return l[d] || (l[d] = m !== void 0 ? m : {})
            })("versions", []).push({
                version: i.version,
                mode: e(14) ? "pure" : "global",
                copyright: "© 2020 Denis Pushkarev (zloirock.ru)"
            })
        }, function(r, t) {
            r.exports = "constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf".split(",")
        }, function(r, t, e) {
            var i = e(7).f,
                u = e(5),
                l = e(2)("toStringTag");
            r.exports = function(d, m, y) {
                d && !u(d = y ? d : d.prototype, l) && i(d, l, {
                    configurable: !0,
                    value: m
                })
            }
        }, function(r, t, e) {
            e(62);
            for (var i = e(3), u = e(6), l = e(12), d = e(2)("toStringTag"), m = "CSSRuleList,CSSStyleDeclaration,CSSValueList,ClientRectList,DOMRectList,DOMStringList,DOMTokenList,DataTransferItemList,FileList,HTMLAllCollection,HTMLCollection,HTMLFormElement,HTMLSelectElement,MediaList,MimeTypeArray,NamedNodeMap,NodeList,PaintRequestList,Plugin,PluginArray,SVGLengthList,SVGNumberList,SVGPathSegList,SVGPointList,SVGStringList,SVGTransformList,SourceBufferList,StyleSheetList,TextTrackCueList,TextTrackList,TouchList".split(","), y = 0; y < m.length; y++) {
                var j = m[y],
                    C = i[j],
                    T = C && C.prototype;
                T && !T[d] && u(T, d, j), l[j] = l.Array
            }
        }, function(r, t, e) {
            t.f = e(2)
        }, function(r, t, e) {
            var i = e(3),
                u = e(1),
                l = e(14),
                d = e(30),
                m = e(7).f;
            r.exports = function(y) {
                var j = u.Symbol || (u.Symbol = l ? {} : i.Symbol || {});
                y.charAt(0) == "_" || y in j || m(j, y, {
                    value: d.f(y)
                })
            }
        }, function(r, t) {
            t.f = Object.getOwnPropertySymbols
        }, function(r, t) {
            r.exports = function(e, i, u) {
                return Math.min(Math.max(e, i), u)
            }
        }, function(r, t, e) {
            var i = e(14),
                u = e(15),
                l = e(37),
                d = e(6),
                m = e(12),
                y = e(55),
                j = e(28),
                C = e(61),
                T = e(2)("iterator"),
                I = !([].keys && "next" in [].keys()),
                U = function() {
                    return this
                };
            r.exports = function(te, B, re, o, D, J, z) {
                y(re, B, o);
                var $, S, N, R = function(H) {
                        if (!I && H in W) return W[H];
                        switch (H) {
                            case "keys":
                            case "values":
                                return function() {
                                    return new re(this, H)
                                }
                        }
                        return function() {
                            return new re(this, H)
                        }
                    },
                    V = B + " Iterator",
                    k = D == "values",
                    Z = !1,
                    W = te.prototype,
                    A = W[T] || W["@@iterator"] || D && W[D],
                    Y = A || R(D),
                    be = D ? k ? R("entries") : Y : void 0,
                    ce = B == "Array" && W.entries || A;
                if (ce && (N = C(ce.call(new te))) !== Object.prototype && N.next && (j(N, V, !0), i || typeof N[T] == "function" || d(N, T, U)), k && A && A.name !== "values" && (Z = !0, Y = function() {
                        return A.call(this)
                    }), i && !z || !I && !Z && W[T] || d(W, T, Y), m[B] = Y, m[V] = U, D)
                    if ($ = {
                            values: k ? Y : R("values"),
                            keys: J ? Y : R("keys"),
                            entries: be
                        }, z)
                        for (S in $) S in W || l(W, S, $[S]);
                    else u(u.P + u.F * (I || Z), B, $);
                return $
            }
        }, function(r, t, e) {
            r.exports = !e(4) && !e(8)(function() {
                return Object.defineProperty(e(36)("div"), "a", {
                    get: function() {
                        return 7
                    }
                }).a != 7
            })
        }, function(r, t, e) {
            var i = e(11),
                u = e(3).document,
                l = i(u) && i(u.createElement);
            r.exports = function(d) {
                return l ? u.createElement(d) : {}
            }
        }, function(r, t, e) {
            r.exports = e(6)
        }, function(r, t, e) {
            var i = e(10),
                u = e(56),
                l = e(27),
                d = e(25)("IE_PROTO"),
                m = function() {},
                y = function() {
                    var j, C = e(36)("iframe"),
                        T = l.length;
                    for (C.style.display = "none", e(60).appendChild(C), C.src = "javascript:", (j = C.contentWindow.document).open(), j.write("<script>document.F=Object<\/script>"), j.close(), y = j.F; T--;) delete y.prototype[l[T]];
                    return y()
                };
            r.exports = Object.create || function(j, C) {
                var T;
                return j !== null ? (m.prototype = i(j), T = new m, m.prototype = null, T[d] = j) : T = y(), C === void 0 ? T : u(T, C)
            }
        }, function(r, t, e) {
            var i = e(5),
                u = e(9),
                l = e(57)(!1),
                d = e(25)("IE_PROTO");
            r.exports = function(m, y) {
                var j, C = u(m),
                    T = 0,
                    I = [];
                for (j in C) j != d && i(C, j) && I.push(j);
                for (; y.length > T;) i(C, j = y[T++]) && (~l(I, j) || I.push(j));
                return I
            }
        }, function(r, t, e) {
            var i = e(24);
            r.exports = Object("z").propertyIsEnumerable(0) ? Object : function(u) {
                return i(u) == "String" ? u.split("") : Object(u)
            }
        }, function(r, t, e) {
            var i = e(39),
                u = e(27).concat("length", "prototype");
            t.f = Object.getOwnPropertyNames || function(l) {
                return i(l, u)
            }
        }, function(r, t, e) {
            var i = e(24),
                u = e(2)("toStringTag"),
                l = i(function() {
                    return arguments
                }()) == "Arguments";
            r.exports = function(d) {
                var m, y, j;
                return d === void 0 ? "Undefined" : d === null ? "Null" : typeof(y = function(C, T) {
                    try {
                        return C[T]
                    } catch {}
                }(m = Object(d), u)) == "string" ? y : l ? i(m) : (j = i(m)) == "Object" && typeof m.callee == "function" ? "Arguments" : j
            }
        }, function(r, t) {
            var e;
            e = function() {
                return this
            }();
            try {
                e = e || new Function("return this")()
            } catch {
                typeof window == "object" && (e = window)
            }
            r.exports = e
        }, function(r, t) {
            var e = /-?\d+(\.\d+)?%?/g;
            r.exports = function(i) {
                return i.match(e)
            }
        }, function(r, t, e) {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.getBase16Theme = t.createStyling = t.invertTheme = void 0;
            var i = U(e(49)),
                u = U(e(76)),
                l = U(e(81)),
                d = U(e(89)),
                m = U(e(93)),
                y = function(S) {
                    if (S && S.__esModule) return S;
                    var N = {};
                    if (S != null)
                        for (var R in S) Object.prototype.hasOwnProperty.call(S, R) && (N[R] = S[R]);
                    return N.default = S, N
                }(e(94)),
                j = U(e(132)),
                C = U(e(133)),
                T = U(e(138)),
                I = e(139);

            function U(S) {
                return S && S.__esModule ? S : {
                    default: S
                }
            }
            var te = y.default,
                B = (0, d.default)(te),
                re = (0, T.default)(C.default, I.rgb2yuv, function(S) {
                    var N, R = (0, l.default)(S, 3),
                        V = R[0],
                        k = R[1],
                        Z = R[2];
                    return [(N = V, N < .25 ? 1 : N < .5 ? .9 - N : 1.1 - N), k, Z]
                }, I.yuv2rgb, j.default),
                o = function(S) {
                    return function(N) {
                        return {
                            className: [N.className, S.className].filter(Boolean).join(" "),
                            style: (0, u.default)({}, N.style || {}, S.style || {})
                        }
                    }
                },
                D = function(S, N) {
                    var R = (0, d.default)(N);
                    for (var V in S) R.indexOf(V) === -1 && R.push(V);
                    return R.reduce(function(k, Z) {
                        return k[Z] = function(W, A) {
                            if (W === void 0) return A;
                            if (A === void 0) return W;
                            var Y = W === void 0 ? "undefined" : (0, i.default)(W),
                                be = A === void 0 ? "undefined" : (0, i.default)(A);
                            switch (Y) {
                                case "string":
                                    switch (be) {
                                        case "string":
                                            return [A, W].filter(Boolean).join(" ");
                                        case "object":
                                            return o({
                                                className: W,
                                                style: A
                                            });
                                        case "function":
                                            return function(ce) {
                                                for (var H = arguments.length, ie = Array(H > 1 ? H - 1 : 0), X = 1; X < H; X++) ie[X - 1] = arguments[X];
                                                return o({
                                                    className: W
                                                })(A.apply(void 0, [ce].concat(ie)))
                                            }
                                    }
                                case "object":
                                    switch (be) {
                                        case "string":
                                            return o({
                                                className: A,
                                                style: W
                                            });
                                        case "object":
                                            return (0, u.default)({}, A, W);
                                        case "function":
                                            return function(ce) {
                                                for (var H = arguments.length, ie = Array(H > 1 ? H - 1 : 0), X = 1; X < H; X++) ie[X - 1] = arguments[X];
                                                return o({
                                                    style: W
                                                })(A.apply(void 0, [ce].concat(ie)))
                                            }
                                    }
                                case "function":
                                    switch (be) {
                                        case "string":
                                            return function(ce) {
                                                for (var H = arguments.length, ie = Array(H > 1 ? H - 1 : 0), X = 1; X < H; X++) ie[X - 1] = arguments[X];
                                                return W.apply(void 0, [o(ce)({
                                                    className: A
                                                })].concat(ie))
                                            };
                                        case "object":
                                            return function(ce) {
                                                for (var H = arguments.length, ie = Array(H > 1 ? H - 1 : 0), X = 1; X < H; X++) ie[X - 1] = arguments[X];
                                                return W.apply(void 0, [o(ce)({
                                                    style: A
                                                })].concat(ie))
                                            };
                                        case "function":
                                            return function(ce) {
                                                for (var H = arguments.length, ie = Array(H > 1 ? H - 1 : 0), X = 1; X < H; X++) ie[X - 1] = arguments[X];
                                                return W.apply(void 0, [A.apply(void 0, [ce].concat(ie))].concat(ie))
                                            }
                                    }
                            }
                        }(S[Z], N[Z]), k
                    }, {})
                },
                J = function(S, N) {
                    for (var R = arguments.length, V = Array(R > 2 ? R - 2 : 0), k = 2; k < R; k++) V[k - 2] = arguments[k];
                    if (N === null) return S;
                    Array.isArray(N) || (N = [N]);
                    var Z = N.map(function(A) {
                            return S[A]
                        }).filter(Boolean),
                        W = Z.reduce(function(A, Y) {
                            return typeof Y == "string" ? A.className = [A.className, Y].filter(Boolean).join(" ") : (Y === void 0 ? "undefined" : (0, i.default)(Y)) === "object" ? A.style = (0, u.default)({}, A.style, Y) : typeof Y == "function" && (A = (0, u.default)({}, A, Y.apply(void 0, [A].concat(V)))), A
                        }, {
                            className: "",
                            style: {}
                        });
                    return W.className || delete W.className, (0, d.default)(W.style).length === 0 && delete W.style, W
                },
                z = t.invertTheme = function(S) {
                    return (0, d.default)(S).reduce(function(N, R) {
                        return N[R] = /^base/.test(R) ? re(S[R]) : R === "scheme" ? S[R] + ":inverted" : S[R], N
                    }, {})
                },
                $ = (t.createStyling = (0, m.default)(function(S) {
                    for (var N = arguments.length, R = Array(N > 3 ? N - 3 : 0), V = 3; V < N; V++) R[V - 3] = arguments[V];
                    var k = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {},
                        Z = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {},
                        W = k.defaultBase16,
                        A = W === void 0 ? te : W,
                        Y = k.base16Themes,
                        be = Y === void 0 ? null : Y,
                        ce = $(Z, be);
                    ce && (Z = (0, u.default)({}, ce, Z));
                    var H = B.reduce(function(ye, Me) {
                            return ye[Me] = Z[Me] || A[Me], ye
                        }, {}),
                        ie = (0, d.default)(Z).reduce(function(ye, Me) {
                            return B.indexOf(Me) === -1 && (ye[Me] = Z[Me]), ye
                        }, {}),
                        X = S(H),
                        he = D(ie, X);
                    return (0, m.default)(J, 2).apply(void 0, [he].concat(R))
                }, 3), t.getBase16Theme = function(S, N) {
                    if (S && S.extend && (S = S.extend), typeof S == "string") {
                        var R = S.split(":"),
                            V = (0, l.default)(R, 2),
                            k = V[0],
                            Z = V[1];
                        S = (N || {})[k] || y[k], Z === "inverted" && (S = z(S))
                    }
                    return S && S.hasOwnProperty("base00") ? S : void 0
                })
        }, function(r, t, e) {
            var i, u = typeof Reflect == "object" ? Reflect : null,
                l = u && typeof u.apply == "function" ? u.apply : function(o, D, J) {
                    return Function.prototype.apply.call(o, D, J)
                };
            i = u && typeof u.ownKeys == "function" ? u.ownKeys : Object.getOwnPropertySymbols ? function(o) {
                return Object.getOwnPropertyNames(o).concat(Object.getOwnPropertySymbols(o))
            } : function(o) {
                return Object.getOwnPropertyNames(o)
            };
            var d = Number.isNaN || function(o) {
                return o != o
            };

            function m() {
                m.init.call(this)
            }
            r.exports = m, r.exports.once = function(o, D) {
                return new Promise(function(J, z) {
                    function $() {
                        S !== void 0 && o.removeListener("error", S), J([].slice.call(arguments))
                    }
                    var S;
                    D !== "error" && (S = function(N) {
                        o.removeListener(D, $), z(N)
                    }, o.once("error", S)), o.once(D, $)
                })
            }, m.EventEmitter = m, m.prototype._events = void 0, m.prototype._eventsCount = 0, m.prototype._maxListeners = void 0;
            var y = 10;

            function j(o) {
                if (typeof o != "function") throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof o)
            }

            function C(o) {
                return o._maxListeners === void 0 ? m.defaultMaxListeners : o._maxListeners
            }

            function T(o, D, J, z) {
                var $, S, N, R;
                if (j(J), (S = o._events) === void 0 ? (S = o._events = Object.create(null), o._eventsCount = 0) : (S.newListener !== void 0 && (o.emit("newListener", D, J.listener ? J.listener : J), S = o._events), N = S[D]), N === void 0) N = S[D] = J, ++o._eventsCount;
                else if (typeof N == "function" ? N = S[D] = z ? [J, N] : [N, J] : z ? N.unshift(J) : N.push(J), ($ = C(o)) > 0 && N.length > $ && !N.warned) {
                    N.warned = !0;
                    var V = new Error("Possible EventEmitter memory leak detected. " + N.length + " " + String(D) + " listeners added. Use emitter.setMaxListeners() to increase limit");
                    V.name = "MaxListenersExceededWarning", V.emitter = o, V.type = D, V.count = N.length, R = V, console && console.warn && console.warn(R)
                }
                return o
            }

            function I() {
                if (!this.fired) return this.target.removeListener(this.type, this.wrapFn), this.fired = !0, arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments)
            }

            function U(o, D, J) {
                var z = {
                        fired: !1,
                        wrapFn: void 0,
                        target: o,
                        type: D,
                        listener: J
                    },
                    $ = I.bind(z);
                return $.listener = J, z.wrapFn = $, $
            }

            function te(o, D, J) {
                var z = o._events;
                if (z === void 0) return [];
                var $ = z[D];
                return $ === void 0 ? [] : typeof $ == "function" ? J ? [$.listener || $] : [$] : J ? function(S) {
                    for (var N = new Array(S.length), R = 0; R < N.length; ++R) N[R] = S[R].listener || S[R];
                    return N
                }($) : re($, $.length)
            }

            function B(o) {
                var D = this._events;
                if (D !== void 0) {
                    var J = D[o];
                    if (typeof J == "function") return 1;
                    if (J !== void 0) return J.length
                }
                return 0
            }

            function re(o, D) {
                for (var J = new Array(D), z = 0; z < D; ++z) J[z] = o[z];
                return J
            }
            Object.defineProperty(m, "defaultMaxListeners", {
                enumerable: !0,
                get: function() {
                    return y
                },
                set: function(o) {
                    if (typeof o != "number" || o < 0 || d(o)) throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + o + ".");
                    y = o
                }
            }), m.init = function() {
                this._events !== void 0 && this._events !== Object.getPrototypeOf(this)._events || (this._events = Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0
            }, m.prototype.setMaxListeners = function(o) {
                if (typeof o != "number" || o < 0 || d(o)) throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + o + ".");
                return this._maxListeners = o, this
            }, m.prototype.getMaxListeners = function() {
                return C(this)
            }, m.prototype.emit = function(o) {
                for (var D = [], J = 1; J < arguments.length; J++) D.push(arguments[J]);
                var z = o === "error",
                    $ = this._events;
                if ($ !== void 0) z = z && $.error === void 0;
                else if (!z) return !1;
                if (z) {
                    var S;
                    if (D.length > 0 && (S = D[0]), S instanceof Error) throw S;
                    var N = new Error("Unhandled error." + (S ? " (" + S.message + ")" : ""));
                    throw N.context = S, N
                }
                var R = $[o];
                if (R === void 0) return !1;
                if (typeof R == "function") l(R, this, D);
                else {
                    var V = R.length,
                        k = re(R, V);
                    for (J = 0; J < V; ++J) l(k[J], this, D)
                }
                return !0
            }, m.prototype.addListener = function(o, D) {
                return T(this, o, D, !1)
            }, m.prototype.on = m.prototype.addListener, m.prototype.prependListener = function(o, D) {
                return T(this, o, D, !0)
            }, m.prototype.once = function(o, D) {
                return j(D), this.on(o, U(this, o, D)), this
            }, m.prototype.prependOnceListener = function(o, D) {
                return j(D), this.prependListener(o, U(this, o, D)), this
            }, m.prototype.removeListener = function(o, D) {
                var J, z, $, S, N;
                if (j(D), (z = this._events) === void 0) return this;
                if ((J = z[o]) === void 0) return this;
                if (J === D || J.listener === D) --this._eventsCount == 0 ? this._events = Object.create(null) : (delete z[o], z.removeListener && this.emit("removeListener", o, J.listener || D));
                else if (typeof J != "function") {
                    for ($ = -1, S = J.length - 1; S >= 0; S--)
                        if (J[S] === D || J[S].listener === D) {
                            N = J[S].listener, $ = S;
                            break
                        } if ($ < 0) return this;
                    $ === 0 ? J.shift() : function(R, V) {
                        for (; V + 1 < R.length; V++) R[V] = R[V + 1];
                        R.pop()
                    }(J, $), J.length === 1 && (z[o] = J[0]), z.removeListener !== void 0 && this.emit("removeListener", o, N || D)
                }
                return this
            }, m.prototype.off = m.prototype.removeListener, m.prototype.removeAllListeners = function(o) {
                var D, J, z;
                if ((J = this._events) === void 0) return this;
                if (J.removeListener === void 0) return arguments.length === 0 ? (this._events = Object.create(null), this._eventsCount = 0) : J[o] !== void 0 && (--this._eventsCount == 0 ? this._events = Object.create(null) : delete J[o]), this;
                if (arguments.length === 0) {
                    var $, S = Object.keys(J);
                    for (z = 0; z < S.length; ++z)($ = S[z]) !== "removeListener" && this.removeAllListeners($);
                    return this.removeAllListeners("removeListener"), this._events = Object.create(null), this._eventsCount = 0, this
                }
                if (typeof(D = J[o]) == "function") this.removeListener(o, D);
                else if (D !== void 0)
                    for (z = D.length - 1; z >= 0; z--) this.removeListener(o, D[z]);
                return this
            }, m.prototype.listeners = function(o) {
                return te(this, o, !0)
            }, m.prototype.rawListeners = function(o) {
                return te(this, o, !1)
            }, m.listenerCount = function(o, D) {
                return typeof o.listenerCount == "function" ? o.listenerCount(D) : B.call(o, D)
            }, m.prototype.listenerCount = B, m.prototype.eventNames = function() {
                return this._eventsCount > 0 ? i(this._events) : []
            }
        }, function(r, t, e) {
            r.exports.Dispatcher = e(140)
        }, function(r, t, e) {
            r.exports = e(142)
        }, function(r, t, e) {
            t.__esModule = !0;
            var i = d(e(50)),
                u = d(e(65)),
                l = typeof u.default == "function" && typeof i.default == "symbol" ? function(m) {
                    return typeof m
                } : function(m) {
                    return m && typeof u.default == "function" && m.constructor === u.default && m !== u.default.prototype ? "symbol" : typeof m
                };

            function d(m) {
                return m && m.__esModule ? m : {
                    default: m
                }
            }
            t.default = typeof u.default == "function" && l(i.default) === "symbol" ? function(m) {
                return m === void 0 ? "undefined" : l(m)
            } : function(m) {
                return m && typeof u.default == "function" && m.constructor === u.default && m !== u.default.prototype ? "symbol" : m === void 0 ? "undefined" : l(m)
            }
        }, function(r, t, e) {
            r.exports = {
                default: e(51),
                __esModule: !0
            }
        }, function(r, t, e) {
            e(20), e(29), r.exports = e(30).f("iterator")
        }, function(r, t, e) {
            var i = e(21),
                u = e(22);
            r.exports = function(l) {
                return function(d, m) {
                    var y, j, C = String(u(d)),
                        T = i(m),
                        I = C.length;
                    return T < 0 || T >= I ? l ? "" : void 0 : (y = C.charCodeAt(T)) < 55296 || y > 56319 || T + 1 === I || (j = C.charCodeAt(T + 1)) < 56320 || j > 57343 ? l ? C.charAt(T) : y : l ? C.slice(T, T + 2) : j - 56320 + (y - 55296 << 10) + 65536
                }
            }
        }, function(r, t, e) {
            var i = e(54);
            r.exports = function(u, l, d) {
                if (i(u), l === void 0) return u;
                switch (d) {
                    case 1:
                        return function(m) {
                            return u.call(l, m)
                        };
                    case 2:
                        return function(m, y) {
                            return u.call(l, m, y)
                        };
                    case 3:
                        return function(m, y, j) {
                            return u.call(l, m, y, j)
                        }
                }
                return function() {
                    return u.apply(l, arguments)
                }
            }
        }, function(r, t) {
            r.exports = function(e) {
                if (typeof e != "function") throw TypeError(e + " is not a function!");
                return e
            }
        }, function(r, t, e) {
            var i = e(38),
                u = e(16),
                l = e(28),
                d = {};
            e(6)(d, e(2)("iterator"), function() {
                return this
            }), r.exports = function(m, y, j) {
                m.prototype = i(d, {
                    next: u(1, j)
                }), l(m, y + " Iterator")
            }
        }, function(r, t, e) {
            var i = e(7),
                u = e(10),
                l = e(13);
            r.exports = e(4) ? Object.defineProperties : function(d, m) {
                u(d);
                for (var y, j = l(m), C = j.length, T = 0; C > T;) i.f(d, y = j[T++], m[y]);
                return d
            }
        }, function(r, t, e) {
            var i = e(9),
                u = e(58),
                l = e(59);
            r.exports = function(d) {
                return function(m, y, j) {
                    var C, T = i(m),
                        I = u(T.length),
                        U = l(j, I);
                    if (d && y != y) {
                        for (; I > U;)
                            if ((C = T[U++]) != C) return !0
                    } else
                        for (; I > U; U++)
                            if ((d || U in T) && T[U] === y) return d || U || 0;
                    return !d && -1
                }
            }
        }, function(r, t, e) {
            var i = e(21),
                u = Math.min;
            r.exports = function(l) {
                return l > 0 ? u(i(l), 9007199254740991) : 0
            }
        }, function(r, t, e) {
            var i = e(21),
                u = Math.max,
                l = Math.min;
            r.exports = function(d, m) {
                return (d = i(d)) < 0 ? u(d + m, 0) : l(d, m)
            }
        }, function(r, t, e) {
            var i = e(3).document;
            r.exports = i && i.documentElement
        }, function(r, t, e) {
            var i = e(5),
                u = e(18),
                l = e(25)("IE_PROTO"),
                d = Object.prototype;
            r.exports = Object.getPrototypeOf || function(m) {
                return m = u(m), i(m, l) ? m[l] : typeof m.constructor == "function" && m instanceof m.constructor ? m.constructor.prototype : m instanceof Object ? d : null
            }
        }, function(r, t, e) {
            var i = e(63),
                u = e(64),
                l = e(12),
                d = e(9);
            r.exports = e(34)(Array, "Array", function(m, y) {
                this._t = d(m), this._i = 0, this._k = y
            }, function() {
                var m = this._t,
                    y = this._k,
                    j = this._i++;
                return !m || j >= m.length ? (this._t = void 0, u(1)) : u(0, y == "keys" ? j : y == "values" ? m[j] : [j, m[j]])
            }, "values"), l.Arguments = l.Array, i("keys"), i("values"), i("entries")
        }, function(r, t) {
            r.exports = function() {}
        }, function(r, t) {
            r.exports = function(e, i) {
                return {
                    value: i,
                    done: !!e
                }
            }
        }, function(r, t, e) {
            r.exports = {
                default: e(66),
                __esModule: !0
            }
        }, function(r, t, e) {
            e(67), e(73), e(74), e(75), r.exports = e(1).Symbol
        }, function(r, t, e) {
            var i = e(3),
                u = e(5),
                l = e(4),
                d = e(15),
                m = e(37),
                y = e(68).KEY,
                j = e(8),
                C = e(26),
                T = e(28),
                I = e(17),
                U = e(2),
                te = e(30),
                B = e(31),
                re = e(69),
                o = e(70),
                D = e(10),
                J = e(11),
                z = e(18),
                $ = e(9),
                S = e(23),
                N = e(16),
                R = e(38),
                V = e(71),
                k = e(72),
                Z = e(32),
                W = e(7),
                A = e(13),
                Y = k.f,
                be = W.f,
                ce = V.f,
                H = i.Symbol,
                ie = i.JSON,
                X = ie && ie.stringify,
                he = U("_hidden"),
                ye = U("toPrimitive"),
                Me = {}.propertyIsEnumerable,
                xe = C("symbol-registry"),
                Ce = C("symbols"),
                pe = C("op-symbols"),
                ve = Object.prototype,
                De = typeof H == "function" && !!Z.f,
                He = i.QObject,
                Qe = !He || !He.prototype || !He.prototype.findChild,
                et = l && j(function() {
                    return R(be({}, "a", {
                        get: function() {
                            return be(this, "a", {
                                value: 7
                            }).a
                        }
                    })).a != 7
                }) ? function(x, M, L) {
                    var q = Y(ve, M);
                    q && delete ve[M], be(x, M, L), q && x !== ve && be(ve, M, q)
                } : be,
                tt = function(x) {
                    var M = Ce[x] = R(H.prototype);
                    return M._k = x, M
                },
                rt = De && typeof H.iterator == "symbol" ? function(x) {
                    return typeof x == "symbol"
                } : function(x) {
                    return x instanceof H
                },
                Ge = function(x, M, L) {
                    return x === ve && Ge(pe, M, L), D(x), M = S(M, !0), D(L), u(Ce, M) ? (L.enumerable ? (u(x, he) && x[he][M] && (x[he][M] = !1), L = R(L, {
                        enumerable: N(0, !1)
                    })) : (u(x, he) || be(x, he, N(1, {})), x[he][M] = !0), et(x, M, L)) : be(x, M, L)
                },
                lt = function(x, M) {
                    D(x);
                    for (var L, q = re(M = $(M)), ae = 0, Q = q.length; Q > ae;) Ge(x, L = q[ae++], M[L]);
                    return x
                },
                ut = function(x) {
                    var M = Me.call(this, x = S(x, !0));
                    return !(this === ve && u(Ce, x) && !u(pe, x)) && (!(M || !u(this, x) || !u(Ce, x) || u(this, he) && this[he][x]) || M)
                },
                at = function(x, M) {
                    if (x = $(x), M = S(M, !0), x !== ve || !u(Ce, M) || u(pe, M)) {
                        var L = Y(x, M);
                        return !L || !u(Ce, M) || u(x, he) && x[he][M] || (L.enumerable = !0), L
                    }
                },
                dt = function(x) {
                    for (var M, L = ce($(x)), q = [], ae = 0; L.length > ae;) u(Ce, M = L[ae++]) || M == he || M == y || q.push(M);
                    return q
                },
                Ye = function(x) {
                    for (var M, L = x === ve, q = ce(L ? pe : $(x)), ae = [], Q = 0; q.length > Q;) !u(Ce, M = q[Q++]) || L && !u(ve, M) || ae.push(Ce[M]);
                    return ae
                };
            De || (m((H = function() {
                if (this instanceof H) throw TypeError("Symbol is not a constructor!");
                var x = I(arguments.length > 0 ? arguments[0] : void 0),
                    M = function(L) {
                        this === ve && M.call(pe, L), u(this, he) && u(this[he], x) && (this[he][x] = !1), et(this, x, N(1, L))
                    };
                return l && Qe && et(ve, x, {
                    configurable: !0,
                    set: M
                }), tt(x)
            }).prototype, "toString", function() {
                return this._k
            }), k.f = at, W.f = Ge, e(41).f = V.f = dt, e(19).f = ut, Z.f = Ye, l && !e(14) && m(ve, "propertyIsEnumerable", ut, !0), te.f = function(x) {
                return tt(U(x))
            }), d(d.G + d.W + d.F * !De, {
                Symbol: H
            });
            for (var Be = "hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables".split(","), Oe = 0; Be.length > Oe;) U(Be[Oe++]);
            for (var nt = A(U.store), F = 0; nt.length > F;) B(nt[F++]);
            d(d.S + d.F * !De, "Symbol", {
                for: function(x) {
                    return u(xe, x += "") ? xe[x] : xe[x] = H(x)
                },
                keyFor: function(x) {
                    if (!rt(x)) throw TypeError(x + " is not a symbol!");
                    for (var M in xe)
                        if (xe[M] === x) return M
                },
                useSetter: function() {
                    Qe = !0
                },
                useSimple: function() {
                    Qe = !1
                }
            }), d(d.S + d.F * !De, "Object", {
                create: function(x, M) {
                    return M === void 0 ? R(x) : lt(R(x), M)
                },
                defineProperty: Ge,
                defineProperties: lt,
                getOwnPropertyDescriptor: at,
                getOwnPropertyNames: dt,
                getOwnPropertySymbols: Ye
            });
            var w = j(function() {
                Z.f(1)
            });
            d(d.S + d.F * w, "Object", {
                getOwnPropertySymbols: function(x) {
                    return Z.f(z(x))
                }
            }), ie && d(d.S + d.F * (!De || j(function() {
                var x = H();
                return X([x]) != "[null]" || X({
                    a: x
                }) != "{}" || X(Object(x)) != "{}"
            })), "JSON", {
                stringify: function(x) {
                    for (var M, L, q = [x], ae = 1; arguments.length > ae;) q.push(arguments[ae++]);
                    if (L = M = q[1], (J(M) || x !== void 0) && !rt(x)) return o(M) || (M = function(Q, le) {
                        if (typeof L == "function" && (le = L.call(this, Q, le)), !rt(le)) return le
                    }), q[1] = M, X.apply(ie, q)
                }
            }), H.prototype[ye] || e(6)(H.prototype, ye, H.prototype.valueOf), T(H, "Symbol"), T(Math, "Math", !0), T(i.JSON, "JSON", !0)
        }, function(r, t, e) {
            var i = e(17)("meta"),
                u = e(11),
                l = e(5),
                d = e(7).f,
                m = 0,
                y = Object.isExtensible || function() {
                    return !0
                },
                j = !e(8)(function() {
                    return y(Object.preventExtensions({}))
                }),
                C = function(I) {
                    d(I, i, {
                        value: {
                            i: "O" + ++m,
                            w: {}
                        }
                    })
                },
                T = r.exports = {
                    KEY: i,
                    NEED: !1,
                    fastKey: function(I, U) {
                        if (!u(I)) return typeof I == "symbol" ? I : (typeof I == "string" ? "S" : "P") + I;
                        if (!l(I, i)) {
                            if (!y(I)) return "F";
                            if (!U) return "E";
                            C(I)
                        }
                        return I[i].i
                    },
                    getWeak: function(I, U) {
                        if (!l(I, i)) {
                            if (!y(I)) return !0;
                            if (!U) return !1;
                            C(I)
                        }
                        return I[i].w
                    },
                    onFreeze: function(I) {
                        return j && T.NEED && y(I) && !l(I, i) && C(I), I
                    }
                }
        }, function(r, t, e) {
            var i = e(13),
                u = e(32),
                l = e(19);
            r.exports = function(d) {
                var m = i(d),
                    y = u.f;
                if (y)
                    for (var j, C = y(d), T = l.f, I = 0; C.length > I;) T.call(d, j = C[I++]) && m.push(j);
                return m
            }
        }, function(r, t, e) {
            var i = e(24);
            r.exports = Array.isArray || function(u) {
                return i(u) == "Array"
            }
        }, function(r, t, e) {
            var i = e(9),
                u = e(41).f,
                l = {}.toString,
                d = typeof window == "object" && window && Object.getOwnPropertyNames ? Object.getOwnPropertyNames(window) : [];
            r.exports.f = function(m) {
                return d && l.call(m) == "[object Window]" ? function(y) {
                    try {
                        return u(y)
                    } catch {
                        return d.slice()
                    }
                }(m) : u(i(m))
            }
        }, function(r, t, e) {
            var i = e(19),
                u = e(16),
                l = e(9),
                d = e(23),
                m = e(5),
                y = e(35),
                j = Object.getOwnPropertyDescriptor;
            t.f = e(4) ? j : function(C, T) {
                if (C = l(C), T = d(T, !0), y) try {
                    return j(C, T)
                } catch {}
                if (m(C, T)) return u(!i.f.call(C, T), C[T])
            }
        }, function(r, t) {}, function(r, t, e) {
            e(31)("asyncIterator")
        }, function(r, t, e) {
            e(31)("observable")
        }, function(r, t, e) {
            t.__esModule = !0;
            var i, u = e(77),
                l = (i = u) && i.__esModule ? i : {
                    default: i
                };
            t.default = l.default || function(d) {
                for (var m = 1; m < arguments.length; m++) {
                    var y = arguments[m];
                    for (var j in y) Object.prototype.hasOwnProperty.call(y, j) && (d[j] = y[j])
                }
                return d
            }
        }, function(r, t, e) {
            r.exports = {
                default: e(78),
                __esModule: !0
            }
        }, function(r, t, e) {
            e(79), r.exports = e(1).Object.assign
        }, function(r, t, e) {
            var i = e(15);
            i(i.S + i.F, "Object", {
                assign: e(80)
            })
        }, function(r, t, e) {
            var i = e(4),
                u = e(13),
                l = e(32),
                d = e(19),
                m = e(18),
                y = e(40),
                j = Object.assign;
            r.exports = !j || e(8)(function() {
                var C = {},
                    T = {},
                    I = Symbol(),
                    U = "abcdefghijklmnopqrst";
                return C[I] = 7, U.split("").forEach(function(te) {
                    T[te] = te
                }), j({}, C)[I] != 7 || Object.keys(j({}, T)).join("") != U
            }) ? function(C, T) {
                for (var I = m(C), U = arguments.length, te = 1, B = l.f, re = d.f; U > te;)
                    for (var o, D = y(arguments[te++]), J = B ? u(D).concat(B(D)) : u(D), z = J.length, $ = 0; z > $;) o = J[$++], i && !re.call(D, o) || (I[o] = D[o]);
                return I
            } : j
        }, function(r, t, e) {
            t.__esModule = !0;
            var i = l(e(82)),
                u = l(e(85));

            function l(d) {
                return d && d.__esModule ? d : {
                    default: d
                }
            }
            t.default = function(d, m) {
                if (Array.isArray(d)) return d;
                if ((0, i.default)(Object(d))) return function(y, j) {
                    var C = [],
                        T = !0,
                        I = !1,
                        U = void 0;
                    try {
                        for (var te, B = (0, u.default)(y); !(T = (te = B.next()).done) && (C.push(te.value), !j || C.length !== j); T = !0);
                    } catch (re) {
                        I = !0, U = re
                    } finally {
                        try {
                            !T && B.return && B.return()
                        } finally {
                            if (I) throw U
                        }
                    }
                    return C
                }(d, m);
                throw new TypeError("Invalid attempt to destructure non-iterable instance")
            }
        }, function(r, t, e) {
            r.exports = {
                default: e(83),
                __esModule: !0
            }
        }, function(r, t, e) {
            e(29), e(20), r.exports = e(84)
        }, function(r, t, e) {
            var i = e(42),
                u = e(2)("iterator"),
                l = e(12);
            r.exports = e(1).isIterable = function(d) {
                var m = Object(d);
                return m[u] !== void 0 || "@@iterator" in m || l.hasOwnProperty(i(m))
            }
        }, function(r, t, e) {
            r.exports = {
                default: e(86),
                __esModule: !0
            }
        }, function(r, t, e) {
            e(29), e(20), r.exports = e(87)
        }, function(r, t, e) {
            var i = e(10),
                u = e(88);
            r.exports = e(1).getIterator = function(l) {
                var d = u(l);
                if (typeof d != "function") throw TypeError(l + " is not iterable!");
                return i(d.call(l))
            }
        }, function(r, t, e) {
            var i = e(42),
                u = e(2)("iterator"),
                l = e(12);
            r.exports = e(1).getIteratorMethod = function(d) {
                if (d != null) return d[u] || d["@@iterator"] || l[i(d)]
            }
        }, function(r, t, e) {
            r.exports = {
                default: e(90),
                __esModule: !0
            }
        }, function(r, t, e) {
            e(91), r.exports = e(1).Object.keys
        }, function(r, t, e) {
            var i = e(18),
                u = e(13);
            e(92)("keys", function() {
                return function(l) {
                    return u(i(l))
                }
            })
        }, function(r, t, e) {
            var i = e(15),
                u = e(1),
                l = e(8);
            r.exports = function(d, m) {
                var y = (u.Object || {})[d] || Object[d],
                    j = {};
                j[d] = m(y), i(i.S + i.F * l(function() {
                    y(1)
                }), "Object", j)
            }
        }, function(r, t, e) {
            (function(i) {
                var u = [
                        ["ary", 128],
                        ["bind", 1],
                        ["bindKey", 2],
                        ["curry", 8],
                        ["curryRight", 16],
                        ["flip", 512],
                        ["partial", 32],
                        ["partialRight", 64],
                        ["rearg", 256]
                    ],
                    l = /^\s+|\s+$/g,
                    d = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/,
                    m = /\{\n\/\* \[wrapped with (.+)\] \*/,
                    y = /,? & /,
                    j = /^[-+]0x[0-9a-f]+$/i,
                    C = /^0b[01]+$/i,
                    T = /^\[object .+?Constructor\]$/,
                    I = /^0o[0-7]+$/i,
                    U = /^(?:0|[1-9]\d*)$/,
                    te = parseInt,
                    B = typeof i == "object" && i && i.Object === Object && i,
                    re = typeof self == "object" && self && self.Object === Object && self,
                    o = B || re || Function("return this")();

                function D(F, w, x) {
                    switch (x.length) {
                        case 0:
                            return F.call(w);
                        case 1:
                            return F.call(w, x[0]);
                        case 2:
                            return F.call(w, x[0], x[1]);
                        case 3:
                            return F.call(w, x[0], x[1], x[2])
                    }
                    return F.apply(w, x)
                }

                function J(F, w) {
                    return !!(F && F.length) && function(x, M, L) {
                        if (M != M) return function(Q, le, ge, _e) {
                            for (var Ae = Q.length, me = ge + -1; ++me < Ae;)
                                if (le(Q[me], me, Q)) return me;
                            return -1
                        }(x, z, L);
                        for (var q = L - 1, ae = x.length; ++q < ae;)
                            if (x[q] === M) return q;
                        return -1
                    }(F, w, 0) > -1
                }

                function z(F) {
                    return F != F
                }

                function $(F, w) {
                    for (var x = F.length, M = 0; x--;) F[x] === w && M++;
                    return M
                }

                function S(F, w) {
                    for (var x = -1, M = F.length, L = 0, q = []; ++x < M;) {
                        var ae = F[x];
                        ae !== w && ae !== "__lodash_placeholder__" || (F[x] = "__lodash_placeholder__", q[L++] = x)
                    }
                    return q
                }
                var N, R, V, k = Function.prototype,
                    Z = Object.prototype,
                    W = o["__core-js_shared__"],
                    A = (N = /[^.]+$/.exec(W && W.keys && W.keys.IE_PROTO || "")) ? "Symbol(src)_1." + N : "",
                    Y = k.toString,
                    be = Z.hasOwnProperty,
                    ce = Z.toString,
                    H = RegExp("^" + Y.call(be).replace(/[\\^$.*+?()[\]{}|]/g, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"),
                    ie = Object.create,
                    X = Math.max,
                    he = Math.min,
                    ye = (R = tt(Object, "defineProperty"), (V = tt.name) && V.length > 2 ? R : void 0);

                function Me(F) {
                    return Be(F) ? ie(F) : {}
                }

                function xe(F) {
                    return !(!Be(F) || function(w) {
                        return !!A && A in w
                    }(F)) && (function(w) {
                        var x = Be(w) ? ce.call(w) : "";
                        return x == "[object Function]" || x == "[object GeneratorFunction]"
                    }(F) || function(w) {
                        var x = !1;
                        if (w != null && typeof w.toString != "function") try {
                            x = !!(w + "")
                        } catch {}
                        return x
                    }(F) ? H : T).test(function(w) {
                        if (w != null) {
                            try {
                                return Y.call(w)
                            } catch {}
                            try {
                                return w + ""
                            } catch {}
                        }
                        return ""
                    }(F))
                }

                function Ce(F, w, x, M) {
                    for (var L = -1, q = F.length, ae = x.length, Q = -1, le = w.length, ge = X(q - ae, 0), _e = Array(le + ge), Ae = !M; ++Q < le;) _e[Q] = w[Q];
                    for (; ++L < ae;)(Ae || L < q) && (_e[x[L]] = F[L]);
                    for (; ge--;) _e[Q++] = F[L++];
                    return _e
                }

                function pe(F, w, x, M) {
                    for (var L = -1, q = F.length, ae = -1, Q = x.length, le = -1, ge = w.length, _e = X(q - Q, 0), Ae = Array(_e + ge), me = !M; ++L < _e;) Ae[L] = F[L];
                    for (var Te = L; ++le < ge;) Ae[Te + le] = w[le];
                    for (; ++ae < Q;)(me || L < q) && (Ae[Te + x[ae]] = F[L++]);
                    return Ae
                }

                function ve(F) {
                    return function() {
                        var w = arguments;
                        switch (w.length) {
                            case 0:
                                return new F;
                            case 1:
                                return new F(w[0]);
                            case 2:
                                return new F(w[0], w[1]);
                            case 3:
                                return new F(w[0], w[1], w[2]);
                            case 4:
                                return new F(w[0], w[1], w[2], w[3]);
                            case 5:
                                return new F(w[0], w[1], w[2], w[3], w[4]);
                            case 6:
                                return new F(w[0], w[1], w[2], w[3], w[4], w[5]);
                            case 7:
                                return new F(w[0], w[1], w[2], w[3], w[4], w[5], w[6])
                        }
                        var x = Me(F.prototype),
                            M = F.apply(x, w);
                        return Be(M) ? M : x
                    }
                }

                function De(F, w, x, M, L, q, ae, Q, le, ge) {
                    var _e = 128 & w,
                        Ae = 1 & w,
                        me = 2 & w,
                        Te = 24 & w,
                        Ie = 512 & w,
                        Ke = me ? void 0 : ve(F);
                    return function ze() {
                        for (var ke = arguments.length, oe = Array(ke), Ne = ke; Ne--;) oe[Ne] = arguments[Ne];
                        if (Te) var Pe = et(ze),
                            Ue = $(oe, Pe);
                        if (M && (oe = Ce(oe, M, L, Te)), q && (oe = pe(oe, q, ae, Te)), ke -= Ue, Te && ke < ge) {
                            var $e = S(oe, Pe);
                            return He(F, w, De, ze.placeholder, x, oe, $e, Q, le, ge - ke)
                        }
                        var Le = Ae ? x : this,
                            Ve = me ? Le[F] : F;
                        return ke = oe.length, Q ? oe = ut(oe, Q) : Ie && ke > 1 && oe.reverse(), _e && le < ke && (oe.length = le), this && this !== o && this instanceof ze && (Ve = Ke || ve(Ve)), Ve.apply(Le, oe)
                    }
                }

                function He(F, w, x, M, L, q, ae, Q, le, ge) {
                    var _e = 8 & w;
                    w |= _e ? 32 : 64, 4 & (w &= ~(_e ? 64 : 32)) || (w &= -4);
                    var Ae = x(F, w, L, _e ? q : void 0, _e ? ae : void 0, _e ? void 0 : q, _e ? void 0 : ae, Q, le, ge);
                    return Ae.placeholder = M, at(Ae, F, w)
                }

                function Qe(F, w, x, M, L, q, ae, Q) {
                    var le = 2 & w;
                    if (!le && typeof F != "function") throw new TypeError("Expected a function");
                    var ge = M ? M.length : 0;
                    if (ge || (w &= -97, M = L = void 0), ae = ae === void 0 ? ae : X(nt(ae), 0), Q = Q === void 0 ? Q : nt(Q), ge -= L ? L.length : 0, 64 & w) {
                        var _e = M,
                            Ae = L;
                        M = L = void 0
                    }
                    var me = [F, w, x, M, L, _e, Ae, q, ae, Q];
                    if (F = me[0], w = me[1], x = me[2], M = me[3], L = me[4], !(Q = me[9] = me[9] == null ? le ? 0 : F.length : X(me[9] - ge, 0)) && 24 & w && (w &= -25), w && w != 1) Te = w == 8 || w == 16 ? function(Ie, Ke, ze) {
                        var ke = ve(Ie);
                        return function oe() {
                            for (var Ne = arguments.length, Pe = Array(Ne), Ue = Ne, $e = et(oe); Ue--;) Pe[Ue] = arguments[Ue];
                            var Le = Ne < 3 && Pe[0] !== $e && Pe[Ne - 1] !== $e ? [] : S(Pe, $e);
                            if ((Ne -= Le.length) < ze) return He(Ie, Ke, De, oe.placeholder, void 0, Pe, Le, void 0, void 0, ze - Ne);
                            var Ve = this && this !== o && this instanceof oe ? ke : Ie;
                            return D(Ve, this, Pe)
                        }
                    }(F, w, Q) : w != 32 && w != 33 || L.length ? De.apply(void 0, me) : function(Ie, Ke, ze, ke) {
                        var oe = 1 & Ke,
                            Ne = ve(Ie);
                        return function Pe() {
                            for (var Ue = -1, $e = arguments.length, Le = -1, Ve = ke.length, pt = Array(Ve + $e), xt = this && this !== o && this instanceof Pe ? Ne : Ie; ++Le < Ve;) pt[Le] = ke[Le];
                            for (; $e--;) pt[Le++] = arguments[++Ue];
                            return D(xt, oe ? ze : this, pt)
                        }
                    }(F, w, x, M);
                    else var Te = function(Ie, Ke, ze) {
                        var ke = 1 & Ke,
                            oe = ve(Ie);
                        return function Ne() {
                            var Pe = this && this !== o && this instanceof Ne ? oe : Ie;
                            return Pe.apply(ke ? ze : this, arguments)
                        }
                    }(F, w, x);
                    return at(Te, F, w)
                }

                function et(F) {
                    return F.placeholder
                }

                function tt(F, w) {
                    var x = function(M, L) {
                        return M == null ? void 0 : M[L]
                    }(F, w);
                    return xe(x) ? x : void 0
                }

                function rt(F) {
                    var w = F.match(m);
                    return w ? w[1].split(y) : []
                }

                function Ge(F, w) {
                    var x = w.length,
                        M = x - 1;
                    return w[M] = (x > 1 ? "& " : "") + w[M], w = w.join(x > 2 ? ", " : " "), F.replace(d, `{
/* [wrapped with ` + w + `] */
`)
                }

                function lt(F, w) {
                    return !!(w = w ?? 9007199254740991) && (typeof F == "number" || U.test(F)) && F > -1 && F % 1 == 0 && F < w
                }

                function ut(F, w) {
                    for (var x = F.length, M = he(w.length, x), L = function(ae, Q) {
                            var le = -1,
                                ge = ae.length;
                            for (Q || (Q = Array(ge)); ++le < ge;) Q[le] = ae[le];
                            return Q
                        }(F); M--;) {
                        var q = w[M];
                        F[M] = lt(q, x) ? L[q] : void 0
                    }
                    return F
                }
                var at = ye ? function(F, w, x) {
                    var M, L = w + "";
                    return ye(F, "toString", {
                        configurable: !0,
                        enumerable: !1,
                        value: (M = Ge(L, dt(rt(L), x)), function() {
                            return M
                        })
                    })
                } : function(F) {
                    return F
                };

                function dt(F, w) {
                    return function(x, M) {
                        for (var L = -1, q = x ? x.length : 0; ++L < q && M(x[L], L, x) !== !1;);
                    }(u, function(x) {
                        var M = "_." + x[0];
                        w & x[1] && !J(F, M) && F.push(M)
                    }), F.sort()
                }

                function Ye(F, w, x) {
                    var M = Qe(F, 8, void 0, void 0, void 0, void 0, void 0, w = x ? void 0 : w);
                    return M.placeholder = Ye.placeholder, M
                }

                function Be(F) {
                    var w = typeof F;
                    return !!F && (w == "object" || w == "function")
                }

                function Oe(F) {
                    return F ? (F = function(w) {
                        if (typeof w == "number") return w;
                        if (function(L) {
                                return typeof L == "symbol" || function(q) {
                                    return !!q && typeof q == "object"
                                }(L) && ce.call(L) == "[object Symbol]"
                            }(w)) return NaN;
                        if (Be(w)) {
                            var x = typeof w.valueOf == "function" ? w.valueOf() : w;
                            w = Be(x) ? x + "" : x
                        }
                        if (typeof w != "string") return w === 0 ? w : +w;
                        w = w.replace(l, "");
                        var M = C.test(w);
                        return M || I.test(w) ? te(w.slice(2), M ? 2 : 8) : j.test(w) ? NaN : +w
                    }(F)) === 1 / 0 || F === -1 / 0 ? 17976931348623157e292 * (F < 0 ? -1 : 1) : F == F ? F : 0 : F === 0 ? F : 0
                }

                function nt(F) {
                    var w = Oe(F),
                        x = w % 1;
                    return w == w ? x ? w - x : w : 0
                }
                Ye.placeholder = {}, r.exports = Ye
            }).call(this, e(43))
        }, function(r, t, e) {
            function i(pe) {
                return pe && pe.__esModule ? pe.default : pe
            }
            t.__esModule = !0;
            var u = e(95);
            t.threezerotwofour = i(u);
            var l = e(96);
            t.apathy = i(l);
            var d = e(97);
            t.ashes = i(d);
            var m = e(98);
            t.atelierDune = i(m);
            var y = e(99);
            t.atelierForest = i(y);
            var j = e(100);
            t.atelierHeath = i(j);
            var C = e(101);
            t.atelierLakeside = i(C);
            var T = e(102);
            t.atelierSeaside = i(T);
            var I = e(103);
            t.bespin = i(I);
            var U = e(104);
            t.brewer = i(U);
            var te = e(105);
            t.bright = i(te);
            var B = e(106);
            t.chalk = i(B);
            var re = e(107);
            t.codeschool = i(re);
            var o = e(108);
            t.colors = i(o);
            var D = e(109);
            t.default = i(D);
            var J = e(110);
            t.eighties = i(J);
            var z = e(111);
            t.embers = i(z);
            var $ = e(112);
            t.flat = i($);
            var S = e(113);
            t.google = i(S);
            var N = e(114);
            t.grayscale = i(N);
            var R = e(115);
            t.greenscreen = i(R);
            var V = e(116);
            t.harmonic = i(V);
            var k = e(117);
            t.hopscotch = i(k);
            var Z = e(118);
            t.isotope = i(Z);
            var W = e(119);
            t.marrakesh = i(W);
            var A = e(120);
            t.mocha = i(A);
            var Y = e(121);
            t.monokai = i(Y);
            var be = e(122);
            t.ocean = i(be);
            var ce = e(123);
            t.paraiso = i(ce);
            var H = e(124);
            t.pop = i(H);
            var ie = e(125);
            t.railscasts = i(ie);
            var X = e(126);
            t.shapeshifter = i(X);
            var he = e(127);
            t.solarized = i(he);
            var ye = e(128);
            t.summerfruit = i(ye);
            var Me = e(129);
            t.tomorrow = i(Me);
            var xe = e(130);
            t.tube = i(xe);
            var Ce = e(131);
            t.twilight = i(Ce)
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "threezerotwofour",
                author: "jan t. sott (http://github.com/idleberg)",
                base00: "#090300",
                base01: "#3a3432",
                base02: "#4a4543",
                base03: "#5c5855",
                base04: "#807d7c",
                base05: "#a5a2a2",
                base06: "#d6d5d4",
                base07: "#f7f7f7",
                base08: "#db2d20",
                base09: "#e8bbd0",
                base0A: "#fded02",
                base0B: "#01a252",
                base0C: "#b5e4f4",
                base0D: "#01a0e4",
                base0E: "#a16a94",
                base0F: "#cdab53"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "apathy",
                author: "jannik siebert (https://github.com/janniks)",
                base00: "#031A16",
                base01: "#0B342D",
                base02: "#184E45",
                base03: "#2B685E",
                base04: "#5F9C92",
                base05: "#81B5AC",
                base06: "#A7CEC8",
                base07: "#D2E7E4",
                base08: "#3E9688",
                base09: "#3E7996",
                base0A: "#3E4C96",
                base0B: "#883E96",
                base0C: "#963E4C",
                base0D: "#96883E",
                base0E: "#4C963E",
                base0F: "#3E965B"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "ashes",
                author: "jannik siebert (https://github.com/janniks)",
                base00: "#1C2023",
                base01: "#393F45",
                base02: "#565E65",
                base03: "#747C84",
                base04: "#ADB3BA",
                base05: "#C7CCD1",
                base06: "#DFE2E5",
                base07: "#F3F4F5",
                base08: "#C7AE95",
                base09: "#C7C795",
                base0A: "#AEC795",
                base0B: "#95C7AE",
                base0C: "#95AEC7",
                base0D: "#AE95C7",
                base0E: "#C795AE",
                base0F: "#C79595"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "atelier dune",
                author: "bram de haan (http://atelierbram.github.io/syntax-highlighting/atelier-schemes/dune)",
                base00: "#20201d",
                base01: "#292824",
                base02: "#6e6b5e",
                base03: "#7d7a68",
                base04: "#999580",
                base05: "#a6a28c",
                base06: "#e8e4cf",
                base07: "#fefbec",
                base08: "#d73737",
                base09: "#b65611",
                base0A: "#cfb017",
                base0B: "#60ac39",
                base0C: "#1fad83",
                base0D: "#6684e1",
                base0E: "#b854d4",
                base0F: "#d43552"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "atelier forest",
                author: "bram de haan (http://atelierbram.github.io/syntax-highlighting/atelier-schemes/forest)",
                base00: "#1b1918",
                base01: "#2c2421",
                base02: "#68615e",
                base03: "#766e6b",
                base04: "#9c9491",
                base05: "#a8a19f",
                base06: "#e6e2e0",
                base07: "#f1efee",
                base08: "#f22c40",
                base09: "#df5320",
                base0A: "#d5911a",
                base0B: "#5ab738",
                base0C: "#00ad9c",
                base0D: "#407ee7",
                base0E: "#6666ea",
                base0F: "#c33ff3"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "atelier heath",
                author: "bram de haan (http://atelierbram.github.io/syntax-highlighting/atelier-schemes/heath)",
                base00: "#1b181b",
                base01: "#292329",
                base02: "#695d69",
                base03: "#776977",
                base04: "#9e8f9e",
                base05: "#ab9bab",
                base06: "#d8cad8",
                base07: "#f7f3f7",
                base08: "#ca402b",
                base09: "#a65926",
                base0A: "#bb8a35",
                base0B: "#379a37",
                base0C: "#159393",
                base0D: "#516aec",
                base0E: "#7b59c0",
                base0F: "#cc33cc"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "atelier lakeside",
                author: "bram de haan (http://atelierbram.github.io/syntax-highlighting/atelier-schemes/lakeside/)",
                base00: "#161b1d",
                base01: "#1f292e",
                base02: "#516d7b",
                base03: "#5a7b8c",
                base04: "#7195a8",
                base05: "#7ea2b4",
                base06: "#c1e4f6",
                base07: "#ebf8ff",
                base08: "#d22d72",
                base09: "#935c25",
                base0A: "#8a8a0f",
                base0B: "#568c3b",
                base0C: "#2d8f6f",
                base0D: "#257fad",
                base0E: "#5d5db1",
                base0F: "#b72dd2"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "atelier seaside",
                author: "bram de haan (http://atelierbram.github.io/syntax-highlighting/atelier-schemes/seaside/)",
                base00: "#131513",
                base01: "#242924",
                base02: "#5e6e5e",
                base03: "#687d68",
                base04: "#809980",
                base05: "#8ca68c",
                base06: "#cfe8cf",
                base07: "#f0fff0",
                base08: "#e6193c",
                base09: "#87711d",
                base0A: "#c3c322",
                base0B: "#29a329",
                base0C: "#1999b3",
                base0D: "#3d62f5",
                base0E: "#ad2bee",
                base0F: "#e619c3"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "bespin",
                author: "jan t. sott",
                base00: "#28211c",
                base01: "#36312e",
                base02: "#5e5d5c",
                base03: "#666666",
                base04: "#797977",
                base05: "#8a8986",
                base06: "#9d9b97",
                base07: "#baae9e",
                base08: "#cf6a4c",
                base09: "#cf7d34",
                base0A: "#f9ee98",
                base0B: "#54be0d",
                base0C: "#afc4db",
                base0D: "#5ea6ea",
                base0E: "#9b859d",
                base0F: "#937121"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "brewer",
                author: "timothée poisot (http://github.com/tpoisot)",
                base00: "#0c0d0e",
                base01: "#2e2f30",
                base02: "#515253",
                base03: "#737475",
                base04: "#959697",
                base05: "#b7b8b9",
                base06: "#dadbdc",
                base07: "#fcfdfe",
                base08: "#e31a1c",
                base09: "#e6550d",
                base0A: "#dca060",
                base0B: "#31a354",
                base0C: "#80b1d3",
                base0D: "#3182bd",
                base0E: "#756bb1",
                base0F: "#b15928"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "bright",
                author: "chris kempson (http://chriskempson.com)",
                base00: "#000000",
                base01: "#303030",
                base02: "#505050",
                base03: "#b0b0b0",
                base04: "#d0d0d0",
                base05: "#e0e0e0",
                base06: "#f5f5f5",
                base07: "#ffffff",
                base08: "#fb0120",
                base09: "#fc6d24",
                base0A: "#fda331",
                base0B: "#a1c659",
                base0C: "#76c7b7",
                base0D: "#6fb3d2",
                base0E: "#d381c3",
                base0F: "#be643c"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "chalk",
                author: "chris kempson (http://chriskempson.com)",
                base00: "#151515",
                base01: "#202020",
                base02: "#303030",
                base03: "#505050",
                base04: "#b0b0b0",
                base05: "#d0d0d0",
                base06: "#e0e0e0",
                base07: "#f5f5f5",
                base08: "#fb9fb1",
                base09: "#eda987",
                base0A: "#ddb26f",
                base0B: "#acc267",
                base0C: "#12cfc0",
                base0D: "#6fc2ef",
                base0E: "#e1a3ee",
                base0F: "#deaf8f"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "codeschool",
                author: "brettof86",
                base00: "#232c31",
                base01: "#1c3657",
                base02: "#2a343a",
                base03: "#3f4944",
                base04: "#84898c",
                base05: "#9ea7a6",
                base06: "#a7cfa3",
                base07: "#b5d8f6",
                base08: "#2a5491",
                base09: "#43820d",
                base0A: "#a03b1e",
                base0B: "#237986",
                base0C: "#b02f30",
                base0D: "#484d79",
                base0E: "#c59820",
                base0F: "#c98344"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "colors",
                author: "mrmrs (http://clrs.cc)",
                base00: "#111111",
                base01: "#333333",
                base02: "#555555",
                base03: "#777777",
                base04: "#999999",
                base05: "#bbbbbb",
                base06: "#dddddd",
                base07: "#ffffff",
                base08: "#ff4136",
                base09: "#ff851b",
                base0A: "#ffdc00",
                base0B: "#2ecc40",
                base0C: "#7fdbff",
                base0D: "#0074d9",
                base0E: "#b10dc9",
                base0F: "#85144b"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "default",
                author: "chris kempson (http://chriskempson.com)",
                base00: "#181818",
                base01: "#282828",
                base02: "#383838",
                base03: "#585858",
                base04: "#b8b8b8",
                base05: "#d8d8d8",
                base06: "#e8e8e8",
                base07: "#f8f8f8",
                base08: "#ab4642",
                base09: "#dc9656",
                base0A: "#f7ca88",
                base0B: "#a1b56c",
                base0C: "#86c1b9",
                base0D: "#7cafc2",
                base0E: "#ba8baf",
                base0F: "#a16946"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "eighties",
                author: "chris kempson (http://chriskempson.com)",
                base00: "#2d2d2d",
                base01: "#393939",
                base02: "#515151",
                base03: "#747369",
                base04: "#a09f93",
                base05: "#d3d0c8",
                base06: "#e8e6df",
                base07: "#f2f0ec",
                base08: "#f2777a",
                base09: "#f99157",
                base0A: "#ffcc66",
                base0B: "#99cc99",
                base0C: "#66cccc",
                base0D: "#6699cc",
                base0E: "#cc99cc",
                base0F: "#d27b53"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "embers",
                author: "jannik siebert (https://github.com/janniks)",
                base00: "#16130F",
                base01: "#2C2620",
                base02: "#433B32",
                base03: "#5A5047",
                base04: "#8A8075",
                base05: "#A39A90",
                base06: "#BEB6AE",
                base07: "#DBD6D1",
                base08: "#826D57",
                base09: "#828257",
                base0A: "#6D8257",
                base0B: "#57826D",
                base0C: "#576D82",
                base0D: "#6D5782",
                base0E: "#82576D",
                base0F: "#825757"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "flat",
                author: "chris kempson (http://chriskempson.com)",
                base00: "#2C3E50",
                base01: "#34495E",
                base02: "#7F8C8D",
                base03: "#95A5A6",
                base04: "#BDC3C7",
                base05: "#e0e0e0",
                base06: "#f5f5f5",
                base07: "#ECF0F1",
                base08: "#E74C3C",
                base09: "#E67E22",
                base0A: "#F1C40F",
                base0B: "#2ECC71",
                base0C: "#1ABC9C",
                base0D: "#3498DB",
                base0E: "#9B59B6",
                base0F: "#be643c"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "google",
                author: "seth wright (http://sethawright.com)",
                base00: "#1d1f21",
                base01: "#282a2e",
                base02: "#373b41",
                base03: "#969896",
                base04: "#b4b7b4",
                base05: "#c5c8c6",
                base06: "#e0e0e0",
                base07: "#ffffff",
                base08: "#CC342B",
                base09: "#F96A38",
                base0A: "#FBA922",
                base0B: "#198844",
                base0C: "#3971ED",
                base0D: "#3971ED",
                base0E: "#A36AC7",
                base0F: "#3971ED"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "grayscale",
                author: "alexandre gavioli (https://github.com/alexx2/)",
                base00: "#101010",
                base01: "#252525",
                base02: "#464646",
                base03: "#525252",
                base04: "#ababab",
                base05: "#b9b9b9",
                base06: "#e3e3e3",
                base07: "#f7f7f7",
                base08: "#7c7c7c",
                base09: "#999999",
                base0A: "#a0a0a0",
                base0B: "#8e8e8e",
                base0C: "#868686",
                base0D: "#686868",
                base0E: "#747474",
                base0F: "#5e5e5e"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "green screen",
                author: "chris kempson (http://chriskempson.com)",
                base00: "#001100",
                base01: "#003300",
                base02: "#005500",
                base03: "#007700",
                base04: "#009900",
                base05: "#00bb00",
                base06: "#00dd00",
                base07: "#00ff00",
                base08: "#007700",
                base09: "#009900",
                base0A: "#007700",
                base0B: "#00bb00",
                base0C: "#005500",
                base0D: "#009900",
                base0E: "#00bb00",
                base0F: "#005500"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "harmonic16",
                author: "jannik siebert (https://github.com/janniks)",
                base00: "#0b1c2c",
                base01: "#223b54",
                base02: "#405c79",
                base03: "#627e99",
                base04: "#aabcce",
                base05: "#cbd6e2",
                base06: "#e5ebf1",
                base07: "#f7f9fb",
                base08: "#bf8b56",
                base09: "#bfbf56",
                base0A: "#8bbf56",
                base0B: "#56bf8b",
                base0C: "#568bbf",
                base0D: "#8b56bf",
                base0E: "#bf568b",
                base0F: "#bf5656"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "hopscotch",
                author: "jan t. sott",
                base00: "#322931",
                base01: "#433b42",
                base02: "#5c545b",
                base03: "#797379",
                base04: "#989498",
                base05: "#b9b5b8",
                base06: "#d5d3d5",
                base07: "#ffffff",
                base08: "#dd464c",
                base09: "#fd8b19",
                base0A: "#fdcc59",
                base0B: "#8fc13e",
                base0C: "#149b93",
                base0D: "#1290bf",
                base0E: "#c85e7c",
                base0F: "#b33508"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "isotope",
                author: "jan t. sott",
                base00: "#000000",
                base01: "#404040",
                base02: "#606060",
                base03: "#808080",
                base04: "#c0c0c0",
                base05: "#d0d0d0",
                base06: "#e0e0e0",
                base07: "#ffffff",
                base08: "#ff0000",
                base09: "#ff9900",
                base0A: "#ff0099",
                base0B: "#33ff00",
                base0C: "#00ffff",
                base0D: "#0066ff",
                base0E: "#cc00ff",
                base0F: "#3300ff"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "marrakesh",
                author: "alexandre gavioli (http://github.com/alexx2/)",
                base00: "#201602",
                base01: "#302e00",
                base02: "#5f5b17",
                base03: "#6c6823",
                base04: "#86813b",
                base05: "#948e48",
                base06: "#ccc37a",
                base07: "#faf0a5",
                base08: "#c35359",
                base09: "#b36144",
                base0A: "#a88339",
                base0B: "#18974e",
                base0C: "#75a738",
                base0D: "#477ca1",
                base0E: "#8868b3",
                base0F: "#b3588e"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "mocha",
                author: "chris kempson (http://chriskempson.com)",
                base00: "#3B3228",
                base01: "#534636",
                base02: "#645240",
                base03: "#7e705a",
                base04: "#b8afad",
                base05: "#d0c8c6",
                base06: "#e9e1dd",
                base07: "#f5eeeb",
                base08: "#cb6077",
                base09: "#d28b71",
                base0A: "#f4bc87",
                base0B: "#beb55b",
                base0C: "#7bbda4",
                base0D: "#8ab3b5",
                base0E: "#a89bb9",
                base0F: "#bb9584"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "monokai",
                author: "wimer hazenberg (http://www.monokai.nl)",
                base00: "#272822",
                base01: "#383830",
                base02: "#49483e",
                base03: "#75715e",
                base04: "#a59f85",
                base05: "#f8f8f2",
                base06: "#f5f4f1",
                base07: "#f9f8f5",
                base08: "#f92672",
                base09: "#fd971f",
                base0A: "#f4bf75",
                base0B: "#a6e22e",
                base0C: "#a1efe4",
                base0D: "#66d9ef",
                base0E: "#ae81ff",
                base0F: "#cc6633"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "ocean",
                author: "chris kempson (http://chriskempson.com)",
                base00: "#2b303b",
                base01: "#343d46",
                base02: "#4f5b66",
                base03: "#65737e",
                base04: "#a7adba",
                base05: "#c0c5ce",
                base06: "#dfe1e8",
                base07: "#eff1f5",
                base08: "#bf616a",
                base09: "#d08770",
                base0A: "#ebcb8b",
                base0B: "#a3be8c",
                base0C: "#96b5b4",
                base0D: "#8fa1b3",
                base0E: "#b48ead",
                base0F: "#ab7967"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "paraiso",
                author: "jan t. sott",
                base00: "#2f1e2e",
                base01: "#41323f",
                base02: "#4f424c",
                base03: "#776e71",
                base04: "#8d8687",
                base05: "#a39e9b",
                base06: "#b9b6b0",
                base07: "#e7e9db",
                base08: "#ef6155",
                base09: "#f99b15",
                base0A: "#fec418",
                base0B: "#48b685",
                base0C: "#5bc4bf",
                base0D: "#06b6ef",
                base0E: "#815ba4",
                base0F: "#e96ba8"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "pop",
                author: "chris kempson (http://chriskempson.com)",
                base00: "#000000",
                base01: "#202020",
                base02: "#303030",
                base03: "#505050",
                base04: "#b0b0b0",
                base05: "#d0d0d0",
                base06: "#e0e0e0",
                base07: "#ffffff",
                base08: "#eb008a",
                base09: "#f29333",
                base0A: "#f8ca12",
                base0B: "#37b349",
                base0C: "#00aabb",
                base0D: "#0e5a94",
                base0E: "#b31e8d",
                base0F: "#7a2d00"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "railscasts",
                author: "ryan bates (http://railscasts.com)",
                base00: "#2b2b2b",
                base01: "#272935",
                base02: "#3a4055",
                base03: "#5a647e",
                base04: "#d4cfc9",
                base05: "#e6e1dc",
                base06: "#f4f1ed",
                base07: "#f9f7f3",
                base08: "#da4939",
                base09: "#cc7833",
                base0A: "#ffc66d",
                base0B: "#a5c261",
                base0C: "#519f50",
                base0D: "#6d9cbe",
                base0E: "#b6b3eb",
                base0F: "#bc9458"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "shapeshifter",
                author: "tyler benziger (http://tybenz.com)",
                base00: "#000000",
                base01: "#040404",
                base02: "#102015",
                base03: "#343434",
                base04: "#555555",
                base05: "#ababab",
                base06: "#e0e0e0",
                base07: "#f9f9f9",
                base08: "#e92f2f",
                base09: "#e09448",
                base0A: "#dddd13",
                base0B: "#0ed839",
                base0C: "#23edda",
                base0D: "#3b48e3",
                base0E: "#f996e2",
                base0F: "#69542d"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "solarized",
                author: "ethan schoonover (http://ethanschoonover.com/solarized)",
                base00: "#002b36",
                base01: "#073642",
                base02: "#586e75",
                base03: "#657b83",
                base04: "#839496",
                base05: "#93a1a1",
                base06: "#eee8d5",
                base07: "#fdf6e3",
                base08: "#dc322f",
                base09: "#cb4b16",
                base0A: "#b58900",
                base0B: "#859900",
                base0C: "#2aa198",
                base0D: "#268bd2",
                base0E: "#6c71c4",
                base0F: "#d33682"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "summerfruit",
                author: "christopher corley (http://cscorley.github.io/)",
                base00: "#151515",
                base01: "#202020",
                base02: "#303030",
                base03: "#505050",
                base04: "#B0B0B0",
                base05: "#D0D0D0",
                base06: "#E0E0E0",
                base07: "#FFFFFF",
                base08: "#FF0086",
                base09: "#FD8900",
                base0A: "#ABA800",
                base0B: "#00C918",
                base0C: "#1faaaa",
                base0D: "#3777E6",
                base0E: "#AD00A1",
                base0F: "#cc6633"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "tomorrow",
                author: "chris kempson (http://chriskempson.com)",
                base00: "#1d1f21",
                base01: "#282a2e",
                base02: "#373b41",
                base03: "#969896",
                base04: "#b4b7b4",
                base05: "#c5c8c6",
                base06: "#e0e0e0",
                base07: "#ffffff",
                base08: "#cc6666",
                base09: "#de935f",
                base0A: "#f0c674",
                base0B: "#b5bd68",
                base0C: "#8abeb7",
                base0D: "#81a2be",
                base0E: "#b294bb",
                base0F: "#a3685a"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "london tube",
                author: "jan t. sott",
                base00: "#231f20",
                base01: "#1c3f95",
                base02: "#5a5758",
                base03: "#737171",
                base04: "#959ca1",
                base05: "#d9d8d8",
                base06: "#e7e7e8",
                base07: "#ffffff",
                base08: "#ee2e24",
                base09: "#f386a1",
                base0A: "#ffd204",
                base0B: "#00853e",
                base0C: "#85cebc",
                base0D: "#009ddc",
                base0E: "#98005d",
                base0F: "#b06110"
            }, r.exports = t.default
        }, function(r, t, e) {
            t.__esModule = !0, t.default = {
                scheme: "twilight",
                author: "david hart (http://hart-dev.com)",
                base00: "#1e1e1e",
                base01: "#323537",
                base02: "#464b50",
                base03: "#5f5a60",
                base04: "#838184",
                base05: "#a7a7a7",
                base06: "#c3c3c3",
                base07: "#ffffff",
                base08: "#cf6a4c",
                base09: "#cda869",
                base0A: "#f9ee98",
                base0B: "#8f9d6a",
                base0C: "#afc4db",
                base0D: "#7587a6",
                base0E: "#9b859d",
                base0F: "#9b703f"
            }, r.exports = t.default
        }, function(r, t, e) {
            var i = e(33);

            function u(l) {
                var d = Math.round(i(l, 0, 255)).toString(16);
                return d.length == 1 ? "0" + d : d
            }
            r.exports = function(l) {
                var d = l.length === 4 ? u(255 * l[3]) : "";
                return "#" + u(l[0]) + u(l[1]) + u(l[2]) + d
            }
        }, function(r, t, e) {
            var i = e(134),
                u = e(135),
                l = e(136),
                d = e(137),
                m = {
                    "#": u,
                    hsl: function(j) {
                        var C = i(j),
                            T = d(C);
                        return C.length === 4 && T.push(C[3]), T
                    },
                    rgb: l
                };

            function y(j) {
                for (var C in m)
                    if (j.indexOf(C) === 0) return m[C](j)
            }
            y.rgb = l, y.hsl = i, y.hex = u, r.exports = y
        }, function(r, t, e) {
            var i = e(44),
                u = e(33);

            function l(d, m) {
                switch (d = parseFloat(d), m) {
                    case 0:
                        return u(d, 0, 360);
                    case 1:
                    case 2:
                        return u(d, 0, 100);
                    case 3:
                        return u(d, 0, 1)
                }
            }
            r.exports = function(d) {
                return i(d).map(l)
            }
        }, function(r, t) {
            r.exports = function(e) {
                e.length !== 4 && e.length !== 5 || (e = function(l) {
                    for (var d = "#", m = 1; m < l.length; m++) {
                        var y = l.charAt(m);
                        d += y + y
                    }
                    return d
                }(e));
                var i = [parseInt(e.substring(1, 3), 16), parseInt(e.substring(3, 5), 16), parseInt(e.substring(5, 7), 16)];
                if (e.length === 9) {
                    var u = parseFloat((parseInt(e.substring(7, 9), 16) / 255).toFixed(2));
                    i.push(u)
                }
                return i
            }
        }, function(r, t, e) {
            var i = e(44),
                u = e(33);

            function l(d, m) {
                return m < 3 ? d.indexOf("%") != -1 ? Math.round(255 * u(parseInt(d, 10), 0, 100) / 100) : u(parseInt(d, 10), 0, 255) : u(parseFloat(d), 0, 1)
            }
            r.exports = function(d) {
                return i(d).map(l)
            }
        }, function(r, t) {
            r.exports = function(e) {
                var i, u, l, d, m, y = e[0] / 360,
                    j = e[1] / 100,
                    C = e[2] / 100;
                if (j == 0) return [m = 255 * C, m, m];
                i = 2 * C - (u = C < .5 ? C * (1 + j) : C + j - C * j), d = [0, 0, 0];
                for (var T = 0; T < 3; T++)(l = y + 1 / 3 * -(T - 1)) < 0 && l++, l > 1 && l--, m = 6 * l < 1 ? i + 6 * (u - i) * l : 2 * l < 1 ? u : 3 * l < 2 ? i + (u - i) * (2 / 3 - l) * 6 : i, d[T] = 255 * m;
                return d
            }
        }, function(r, t, e) {
            (function(i) {
                var u = typeof i == "object" && i && i.Object === Object && i,
                    l = typeof self == "object" && self && self.Object === Object && self,
                    d = u || l || Function("return this")();

                function m(S, N, R) {
                    switch (R.length) {
                        case 0:
                            return S.call(N);
                        case 1:
                            return S.call(N, R[0]);
                        case 2:
                            return S.call(N, R[0], R[1]);
                        case 3:
                            return S.call(N, R[0], R[1], R[2])
                    }
                    return S.apply(N, R)
                }

                function y(S, N) {
                    for (var R = -1, V = N.length, k = S.length; ++R < V;) S[k + R] = N[R];
                    return S
                }
                var j = Object.prototype,
                    C = j.hasOwnProperty,
                    T = j.toString,
                    I = d.Symbol,
                    U = j.propertyIsEnumerable,
                    te = I ? I.isConcatSpreadable : void 0,
                    B = Math.max;

                function re(S) {
                    return o(S) || function(N) {
                        return function(R) {
                            return function(V) {
                                return !!V && typeof V == "object"
                            }(R) && function(V) {
                                return V != null && function(k) {
                                    return typeof k == "number" && k > -1 && k % 1 == 0 && k <= 9007199254740991
                                }(V.length) && ! function(k) {
                                    var Z = function(W) {
                                        var A = typeof W;
                                        return !!W && (A == "object" || A == "function")
                                    }(k) ? T.call(k) : "";
                                    return Z == "[object Function]" || Z == "[object GeneratorFunction]"
                                }(V)
                            }(R)
                        }(N) && C.call(N, "callee") && (!U.call(N, "callee") || T.call(N) == "[object Arguments]")
                    }(S) || !!(te && S && S[te])
                }
                var o = Array.isArray,
                    D, J, z, $ = (J = function(S) {
                        var N = (S = function(k, Z, W, A, Y) {
                                var be = -1,
                                    ce = k.length;
                                for (W || (W = re), Y || (Y = []); ++be < ce;) {
                                    var H = k[be];
                                    W(H) ? y(Y, H) : Y[Y.length] = H
                                }
                                return Y
                            }(S)).length,
                            R = N;
                        for (D; R--;)
                            if (typeof S[R] != "function") throw new TypeError("Expected a function");
                        return function() {
                            for (var V = 0, k = N ? S[V].apply(this, arguments) : arguments[0]; ++V < N;) k = S[V].call(this, k);
                            return k
                        }
                    }, z = B(z === void 0 ? J.length - 1 : z, 0), function() {
                        for (var S = arguments, N = -1, R = B(S.length - z, 0), V = Array(R); ++N < R;) V[N] = S[z + N];
                        N = -1;
                        for (var k = Array(z + 1); ++N < z;) k[N] = S[N];
                        return k[z] = V, m(J, this, k)
                    });
                r.exports = $
            }).call(this, e(43))
        }, function(r, t, e) {
            Object.defineProperty(t, "__esModule", {
                value: !0
            }), t.yuv2rgb = function(i) {
                var u, l, d, m = i[0],
                    y = i[1],
                    j = i[2];
                return u = 1 * m + 0 * y + 1.13983 * j, l = 1 * m + -.39465 * y + -.5806 * j, d = 1 * m + 2.02311 * y + 0 * j, u = Math.min(Math.max(0, u), 1), l = Math.min(Math.max(0, l), 1), d = Math.min(Math.max(0, d), 1), [255 * u, 255 * l, 255 * d]
            }, t.rgb2yuv = function(i) {
                var u = i[0] / 255,
                    l = i[1] / 255,
                    d = i[2] / 255;
                return [.299 * u + .587 * l + .114 * d, -.14713 * u + -.28886 * l + .436 * d, .615 * u + -.51499 * l + -.10001 * d]
            }
        }, function(r, t, e) {
            function i(d, m, y) {
                return m in d ? Object.defineProperty(d, m, {
                    value: y,
                    enumerable: !0,
                    configurable: !0,
                    writable: !0
                }) : d[m] = y, d
            }
            var u = e(141),
                l = function() {
                    function d() {
                        i(this, "_callbacks", void 0), i(this, "_isDispatching", void 0), i(this, "_isHandled", void 0), i(this, "_isPending", void 0), i(this, "_lastID", void 0), i(this, "_pendingPayload", void 0), this._callbacks = {}, this._isDispatching = !1, this._isHandled = {}, this._isPending = {}, this._lastID = 1
                    }
                    var m = d.prototype;
                    return m.register = function(y) {
                        var j = "ID_" + this._lastID++;
                        return this._callbacks[j] = y, j
                    }, m.unregister = function(y) {
                        this._callbacks[y] || u(!1), delete this._callbacks[y]
                    }, m.waitFor = function(y) {
                        this._isDispatching || u(!1);
                        for (var j = 0; j < y.length; j++) {
                            var C = y[j];
                            this._isPending[C] ? this._isHandled[C] || u(!1) : (this._callbacks[C] || u(!1), this._invokeCallback(C))
                        }
                    }, m.dispatch = function(y) {
                        this._isDispatching && u(!1), this._startDispatching(y);
                        try {
                            for (var j in this._callbacks) this._isPending[j] || this._invokeCallback(j)
                        } finally {
                            this._stopDispatching()
                        }
                    }, m.isDispatching = function() {
                        return this._isDispatching
                    }, m._invokeCallback = function(y) {
                        this._isPending[y] = !0, this._callbacks[y](this._pendingPayload), this._isHandled[y] = !0
                    }, m._startDispatching = function(y) {
                        for (var j in this._callbacks) this._isPending[j] = !1, this._isHandled[j] = !1;
                        this._pendingPayload = y, this._isDispatching = !0
                    }, m._stopDispatching = function() {
                        delete this._pendingPayload, this._isDispatching = !1
                    }, d
                }();
            r.exports = l
        }, function(r, t, e) {
            r.exports = function(i, u) {
                for (var l = arguments.length, d = new Array(l > 2 ? l - 2 : 0), m = 2; m < l; m++) d[m - 2] = arguments[m];
                if (!i) {
                    var y;
                    if (u === void 0) y = new Error("Minified exception occurred; use the non-minified dev environment for the full error message and additional helpful warnings.");
                    else {
                        var j = 0;
                        (y = new Error(u.replace(/%s/g, function() {
                            return String(d[j++])
                        }))).name = "Invariant Violation"
                    }
                    throw y.framesToPop = 1, y
                }
            }
        }, function(r, t, e) {
            function i(b, f, s) {
                return f in b ? Object.defineProperty(b, f, {
                    value: s,
                    enumerable: !0,
                    configurable: !0,
                    writable: !0
                }) : b[f] = s, b
            }

            function u(b, f) {
                var s = Object.keys(b);
                if (Object.getOwnPropertySymbols) {
                    var c = Object.getOwnPropertySymbols(b);
                    f && (c = c.filter(function(p) {
                        return Object.getOwnPropertyDescriptor(b, p).enumerable
                    })), s.push.apply(s, c)
                }
                return s
            }

            function l(b) {
                for (var f = 1; f < arguments.length; f++) {
                    var s = arguments[f] != null ? arguments[f] : {};
                    f % 2 ? u(Object(s), !0).forEach(function(c) {
                        i(b, c, s[c])
                    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(b, Object.getOwnPropertyDescriptors(s)) : u(Object(s)).forEach(function(c) {
                        Object.defineProperty(b, c, Object.getOwnPropertyDescriptor(s, c))
                    })
                }
                return b
            }

            function d(b, f) {
                if (!(b instanceof f)) throw new TypeError("Cannot call a class as a function")
            }

            function m(b, f) {
                for (var s = 0; s < f.length; s++) {
                    var c = f[s];
                    c.enumerable = c.enumerable || !1, c.configurable = !0, "value" in c && (c.writable = !0), Object.defineProperty(b, c.key, c)
                }
            }

            function y(b, f, s) {
                return f && m(b.prototype, f), s && m(b, s), b
            }

            function j(b, f) {
                return (j = Object.setPrototypeOf || function(s, c) {
                    return s.__proto__ = c, s
                })(b, f)
            }

            function C(b, f) {
                if (typeof f != "function" && f !== null) throw new TypeError("Super expression must either be null or a function");
                b.prototype = Object.create(f && f.prototype, {
                    constructor: {
                        value: b,
                        writable: !0,
                        configurable: !0
                    }
                }), f && j(b, f)
            }

            function T(b) {
                return (T = Object.setPrototypeOf ? Object.getPrototypeOf : function(f) {
                    return f.__proto__ || Object.getPrototypeOf(f)
                })(b)
            }

            function I(b) {
                return (I = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(f) {
                    return typeof f
                } : function(f) {
                    return f && typeof Symbol == "function" && f.constructor === Symbol && f !== Symbol.prototype ? "symbol" : typeof f
                })(b)
            }

            function U(b) {
                if (b === void 0) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                return b
            }

            function te(b, f) {
                return !f || I(f) !== "object" && typeof f != "function" ? U(b) : f
            }

            function B(b) {
                var f = function() {
                    if (typeof Reflect > "u" || !Reflect.construct || Reflect.construct.sham) return !1;
                    if (typeof Proxy == "function") return !0;
                    try {
                        return Date.prototype.toString.call(Reflect.construct(Date, [], function() {})), !0
                    } catch {
                        return !1
                    }
                }();
                return function() {
                    var s, c = T(b);
                    if (f) {
                        var p = T(this).constructor;
                        s = Reflect.construct(c, arguments, p)
                    } else s = c.apply(this, arguments);
                    return te(this, s)
                }
            }
            e.r(t);
            var re = e(0),
                o = e.n(re);

            function D() {
                var b = this.constructor.getDerivedStateFromProps(this.props, this.state);
                b != null && this.setState(b)
            }

            function J(b) {
                this.setState((function(f) {
                    var s = this.constructor.getDerivedStateFromProps(b, f);
                    return s ?? null
                }).bind(this))
            }

            function z(b, f) {
                try {
                    var s = this.props,
                        c = this.state;
                    this.props = b, this.state = f, this.__reactInternalSnapshotFlag = !0, this.__reactInternalSnapshot = this.getSnapshotBeforeUpdate(s, c)
                } finally {
                    this.props = s, this.state = c
                }
            }

            function $(b) {
                var f = b.prototype;
                if (!f || !f.isReactComponent) throw new Error("Can only polyfill class components");
                if (typeof b.getDerivedStateFromProps != "function" && typeof f.getSnapshotBeforeUpdate != "function") return b;
                var s = null,
                    c = null,
                    p = null;
                if (typeof f.componentWillMount == "function" ? s = "componentWillMount" : typeof f.UNSAFE_componentWillMount == "function" && (s = "UNSAFE_componentWillMount"), typeof f.componentWillReceiveProps == "function" ? c = "componentWillReceiveProps" : typeof f.UNSAFE_componentWillReceiveProps == "function" && (c = "UNSAFE_componentWillReceiveProps"), typeof f.componentWillUpdate == "function" ? p = "componentWillUpdate" : typeof f.UNSAFE_componentWillUpdate == "function" && (p = "UNSAFE_componentWillUpdate"), s !== null || c !== null || p !== null) {
                    var _ = b.displayName || b.name,
                        O = typeof b.getDerivedStateFromProps == "function" ? "getDerivedStateFromProps()" : "getSnapshotBeforeUpdate()";
                    throw Error(`Unsafe legacy lifecycles will not be called for components using new component APIs.

` + _ + " uses " + O + " but also contains the following legacy lifecycles:" + (s !== null ? `
  ` + s : "") + (c !== null ? `
  ` + c : "") + (p !== null ? `
  ` + p : "") + `

The above lifecycles should be removed. Learn more about this warning here:
https://fb.me/react-async-component-lifecycle-hooks`)
                }
                if (typeof b.getDerivedStateFromProps == "function" && (f.componentWillMount = D, f.componentWillReceiveProps = J), typeof f.getSnapshotBeforeUpdate == "function") {
                    if (typeof f.componentDidUpdate != "function") throw new Error("Cannot polyfill getSnapshotBeforeUpdate() for components that do not define componentDidUpdate() on the prototype");
                    f.componentWillUpdate = z;
                    var E = f.componentDidUpdate;
                    f.componentDidUpdate = function(v, P, K) {
                        var ne = this.__reactInternalSnapshotFlag ? this.__reactInternalSnapshot : K;
                        E.call(this, v, P, ne)
                    }
                }
                return b
            }

            function S(b, f) {
                if (b == null) return {};
                var s, c, p = function(O, E) {
                    if (O == null) return {};
                    var v, P, K = {},
                        ne = Object.keys(O);
                    for (P = 0; P < ne.length; P++) v = ne[P], E.indexOf(v) >= 0 || (K[v] = O[v]);
                    return K
                }(b, f);
                if (Object.getOwnPropertySymbols) {
                    var _ = Object.getOwnPropertySymbols(b);
                    for (c = 0; c < _.length; c++) s = _[c], f.indexOf(s) >= 0 || Object.prototype.propertyIsEnumerable.call(b, s) && (p[s] = b[s])
                }
                return p
            }

            function N(b) {
                var f = function(s) {
                    return {}.toString.call(s).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
                }(b);
                return f === "number" && (f = isNaN(b) ? "nan" : (0 | b) != b ? "float" : "integer"), f
            }
            D.__suppressDeprecationWarning = !0, J.__suppressDeprecationWarning = !0, z.__suppressDeprecationWarning = !0;
            var R = {
                    scheme: "rjv-default",
                    author: "mac gainor",
                    base00: "rgba(0, 0, 0, 0)",
                    base01: "rgb(245, 245, 245)",
                    base02: "rgb(235, 235, 235)",
                    base03: "#93a1a1",
                    base04: "rgba(0, 0, 0, 0.3)",
                    base05: "#586e75",
                    base06: "#073642",
                    base07: "#002b36",
                    base08: "#d33682",
                    base09: "#cb4b16",
                    base0A: "#dc322f",
                    base0B: "#859900",
                    base0C: "#6c71c4",
                    base0D: "#586e75",
                    base0E: "#2aa198",
                    base0F: "#268bd2"
                },
                V = {
                    scheme: "rjv-grey",
                    author: "mac gainor",
                    base00: "rgba(1, 1, 1, 0)",
                    base01: "rgba(1, 1, 1, 0.1)",
                    base02: "rgba(0, 0, 0, 0.2)",
                    base03: "rgba(1, 1, 1, 0.3)",
                    base04: "rgba(0, 0, 0, 0.4)",
                    base05: "rgba(1, 1, 1, 0.5)",
                    base06: "rgba(1, 1, 1, 0.6)",
                    base07: "rgba(1, 1, 1, 0.7)",
                    base08: "rgba(1, 1, 1, 0.8)",
                    base09: "rgba(1, 1, 1, 0.8)",
                    base0A: "rgba(1, 1, 1, 0.8)",
                    base0B: "rgba(1, 1, 1, 0.8)",
                    base0C: "rgba(1, 1, 1, 0.8)",
                    base0D: "rgba(1, 1, 1, 0.8)",
                    base0E: "rgba(1, 1, 1, 0.8)",
                    base0F: "rgba(1, 1, 1, 0.8)"
                },
                k = {
                    globalFontFamily: "monospace",
                    globalCursor: "default",
                    braceFontWeight: "bold",
                    braceCursor: "pointer",
                    ellipsisFontSize: "18px",
                    ellipsisLineHeight: "10px",
                    ellipsisCursor: "pointer",
                    keyMargin: "0px 5px",
                    keyLetterSpacing: "0.5px",
                    keyFontStyle: "none",
                    keyVerticalAlign: "top",
                    keyOpacity: "0.85",
                    keyOpacityHover: "1",
                    keyValPaddingTop: "3px",
                    keyValPaddingBottom: "3px",
                    keyValPaddingRight: "5px",
                    keyValBorderLeft: "1px solid",
                    keyValBorderHover: "2px solid",
                    pushedContentMarginLeft: "6px",
                    variableValuePaddingRight: "6px",
                    nullFontSize: "11px",
                    nullFontWeight: "bold",
                    nullPadding: "1px 2px",
                    nullBorderRadius: "3px",
                    nanFontSize: "11px",
                    nanFontWeight: "bold",
                    nanPadding: "1px 2px",
                    nanBorderRadius: "3px",
                    undefinedFontSize: "11px",
                    undefinedPadding: "1px 2px",
                    undefinedBorderRadius: "3px",
                    dataTypeFontSize: "11px",
                    dataTypeMarginRight: "4px",
                    datatypeOpacity: "0.8",
                    objectSizeBorderRadius: "3px",
                    objectSizeFontStyle: "italic",
                    objectSizeMargin: "0px 6px 0px 0px",
                    clipboardCursor: "pointer",
                    clipboardCheckMarginLeft: "-12px",
                    metaDataPadding: "0px 0px 0px 10px",
                    arrayGroupMetaPadding: "0px 0px 0px 4px",
                    iconContainerWidth: "17px",
                    tooltipPadding: "4px",
                    editInputMinWidth: "130px",
                    editInputBorderRadius: "2px",
                    editInputPadding: "5px",
                    editInputMarginRight: "4px",
                    editInputFontFamily: "monospace",
                    iconCursor: "pointer",
                    iconFontSize: "15px",
                    iconPaddingRight: "1px",
                    dateValueMarginLeft: "2px",
                    iconMarginRight: "3px",
                    detectedRowPaddingTop: "3px",
                    addKeyCoverBackground: "rgba(255, 255, 255, 0.3)",
                    addKeyCoverPosition: "absolute",
                    addKeyCoverPositionPx: "0px",
                    addKeyModalWidth: "200px",
                    addKeyModalMargin: "auto",
                    addKeyModalPadding: "10px",
                    addKeyModalRadius: "3px"
                },
                Z = e(45),
                W = function(b) {
                    var f = function(s) {
                        return {
                            backgroundColor: s.base00,
                            ellipsisColor: s.base09,
                            braceColor: s.base07,
                            expandedIcon: s.base0D,
                            collapsedIcon: s.base0E,
                            keyColor: s.base07,
                            arrayKeyColor: s.base0C,
                            objectSize: s.base04,
                            copyToClipboard: s.base0F,
                            copyToClipboardCheck: s.base0D,
                            objectBorder: s.base02,
                            dataTypes: {
                                boolean: s.base0E,
                                date: s.base0D,
                                float: s.base0B,
                                function: s.base0D,
                                integer: s.base0F,
                                string: s.base09,
                                nan: s.base08,
                                null: s.base0A,
                                undefined: s.base05,
                                regexp: s.base0A,
                                background: s.base02
                            },
                            editVariable: {
                                editIcon: s.base0E,
                                cancelIcon: s.base09,
                                removeIcon: s.base09,
                                addIcon: s.base0E,
                                checkIcon: s.base0E,
                                background: s.base01,
                                color: s.base0A,
                                border: s.base07
                            },
                            addKeyModal: {
                                background: s.base05,
                                border: s.base04,
                                color: s.base0A,
                                labelColor: s.base01
                            },
                            validationFailure: {
                                background: s.base09,
                                iconColor: s.base01,
                                fontColor: s.base01
                            }
                        }
                    }(b);
                    return {
                        "app-container": {
                            fontFamily: k.globalFontFamily,
                            cursor: k.globalCursor,
                            backgroundColor: f.backgroundColor,
                            position: "relative"
                        },
                        ellipsis: {
                            display: "inline-block",
                            color: f.ellipsisColor,
                            fontSize: k.ellipsisFontSize,
                            lineHeight: k.ellipsisLineHeight,
                            cursor: k.ellipsisCursor
                        },
                        "brace-row": {
                            display: "inline-block",
                            cursor: "pointer"
                        },
                        brace: {
                            display: "inline-block",
                            cursor: k.braceCursor,
                            fontWeight: k.braceFontWeight,
                            color: f.braceColor
                        },
                        "expanded-icon": {
                            color: f.expandedIcon
                        },
                        "collapsed-icon": {
                            color: f.collapsedIcon
                        },
                        colon: {
                            display: "inline-block",
                            margin: k.keyMargin,
                            color: f.keyColor,
                            verticalAlign: "top"
                        },
                        objectKeyVal: function(s, c) {
                            return {
                                style: l({
                                    paddingTop: k.keyValPaddingTop,
                                    paddingRight: k.keyValPaddingRight,
                                    paddingBottom: k.keyValPaddingBottom,
                                    borderLeft: k.keyValBorderLeft + " " + f.objectBorder,
                                    ":hover": {
                                        paddingLeft: c.paddingLeft - 1 + "px",
                                        borderLeft: k.keyValBorderHover + " " + f.objectBorder
                                    }
                                }, c)
                            }
                        },
                        "object-key-val-no-border": {
                            padding: k.keyValPadding
                        },
                        "pushed-content": {
                            marginLeft: k.pushedContentMarginLeft
                        },
                        variableValue: function(s, c) {
                            return {
                                style: l({
                                    display: "inline-block",
                                    paddingRight: k.variableValuePaddingRight,
                                    position: "relative"
                                }, c)
                            }
                        },
                        "object-name": {
                            display: "inline-block",
                            color: f.keyColor,
                            letterSpacing: k.keyLetterSpacing,
                            fontStyle: k.keyFontStyle,
                            verticalAlign: k.keyVerticalAlign,
                            opacity: k.keyOpacity,
                            ":hover": {
                                opacity: k.keyOpacityHover
                            }
                        },
                        "array-key": {
                            display: "inline-block",
                            color: f.arrayKeyColor,
                            letterSpacing: k.keyLetterSpacing,
                            fontStyle: k.keyFontStyle,
                            verticalAlign: k.keyVerticalAlign,
                            opacity: k.keyOpacity,
                            ":hover": {
                                opacity: k.keyOpacityHover
                            }
                        },
                        "object-size": {
                            color: f.objectSize,
                            borderRadius: k.objectSizeBorderRadius,
                            fontStyle: k.objectSizeFontStyle,
                            margin: k.objectSizeMargin,
                            cursor: "default"
                        },
                        "data-type-label": {
                            fontSize: k.dataTypeFontSize,
                            marginRight: k.dataTypeMarginRight,
                            opacity: k.datatypeOpacity
                        },
                        boolean: {
                            display: "inline-block",
                            color: f.dataTypes.boolean
                        },
                        date: {
                            display: "inline-block",
                            color: f.dataTypes.date
                        },
                        "date-value": {
                            marginLeft: k.dateValueMarginLeft
                        },
                        float: {
                            display: "inline-block",
                            color: f.dataTypes.float
                        },
                        function: {
                            display: "inline-block",
                            color: f.dataTypes.function,
                            cursor: "pointer",
                            whiteSpace: "pre-line"
                        },
                        "function-value": {
                            fontStyle: "italic"
                        },
                        integer: {
                            display: "inline-block",
                            color: f.dataTypes.integer
                        },
                        string: {
                            display: "inline-block",
                            color: f.dataTypes.string
                        },
                        nan: {
                            display: "inline-block",
                            color: f.dataTypes.nan,
                            fontSize: k.nanFontSize,
                            fontWeight: k.nanFontWeight,
                            backgroundColor: f.dataTypes.background,
                            padding: k.nanPadding,
                            borderRadius: k.nanBorderRadius
                        },
                        null: {
                            display: "inline-block",
                            color: f.dataTypes.null,
                            fontSize: k.nullFontSize,
                            fontWeight: k.nullFontWeight,
                            backgroundColor: f.dataTypes.background,
                            padding: k.nullPadding,
                            borderRadius: k.nullBorderRadius
                        },
                        undefined: {
                            display: "inline-block",
                            color: f.dataTypes.undefined,
                            fontSize: k.undefinedFontSize,
                            padding: k.undefinedPadding,
                            borderRadius: k.undefinedBorderRadius,
                            backgroundColor: f.dataTypes.background
                        },
                        regexp: {
                            display: "inline-block",
                            color: f.dataTypes.regexp
                        },
                        "copy-to-clipboard": {
                            cursor: k.clipboardCursor
                        },
                        "copy-icon": {
                            color: f.copyToClipboard,
                            fontSize: k.iconFontSize,
                            marginRight: k.iconMarginRight,
                            verticalAlign: "top"
                        },
                        "copy-icon-copied": {
                            color: f.copyToClipboardCheck,
                            marginLeft: k.clipboardCheckMarginLeft
                        },
                        "array-group-meta-data": {
                            display: "inline-block",
                            padding: k.arrayGroupMetaPadding
                        },
                        "object-meta-data": {
                            display: "inline-block",
                            padding: k.metaDataPadding
                        },
                        "icon-container": {
                            display: "inline-block",
                            width: k.iconContainerWidth
                        },
                        tooltip: {
                            padding: k.tooltipPadding
                        },
                        removeVarIcon: {
                            verticalAlign: "top",
                            display: "inline-block",
                            color: f.editVariable.removeIcon,
                            cursor: k.iconCursor,
                            fontSize: k.iconFontSize,
                            marginRight: k.iconMarginRight
                        },
                        addVarIcon: {
                            verticalAlign: "top",
                            display: "inline-block",
                            color: f.editVariable.addIcon,
                            cursor: k.iconCursor,
                            fontSize: k.iconFontSize,
                            marginRight: k.iconMarginRight
                        },
                        editVarIcon: {
                            verticalAlign: "top",
                            display: "inline-block",
                            color: f.editVariable.editIcon,
                            cursor: k.iconCursor,
                            fontSize: k.iconFontSize,
                            marginRight: k.iconMarginRight
                        },
                        "edit-icon-container": {
                            display: "inline-block",
                            verticalAlign: "top"
                        },
                        "check-icon": {
                            display: "inline-block",
                            cursor: k.iconCursor,
                            color: f.editVariable.checkIcon,
                            fontSize: k.iconFontSize,
                            paddingRight: k.iconPaddingRight
                        },
                        "cancel-icon": {
                            display: "inline-block",
                            cursor: k.iconCursor,
                            color: f.editVariable.cancelIcon,
                            fontSize: k.iconFontSize,
                            paddingRight: k.iconPaddingRight
                        },
                        "edit-input": {
                            display: "inline-block",
                            minWidth: k.editInputMinWidth,
                            borderRadius: k.editInputBorderRadius,
                            backgroundColor: f.editVariable.background,
                            color: f.editVariable.color,
                            padding: k.editInputPadding,
                            marginRight: k.editInputMarginRight,
                            fontFamily: k.editInputFontFamily
                        },
                        "detected-row": {
                            paddingTop: k.detectedRowPaddingTop
                        },
                        "key-modal-request": {
                            position: k.addKeyCoverPosition,
                            top: k.addKeyCoverPositionPx,
                            left: k.addKeyCoverPositionPx,
                            right: k.addKeyCoverPositionPx,
                            bottom: k.addKeyCoverPositionPx,
                            backgroundColor: k.addKeyCoverBackground
                        },
                        "key-modal": {
                            width: k.addKeyModalWidth,
                            backgroundColor: f.addKeyModal.background,
                            marginLeft: k.addKeyModalMargin,
                            marginRight: k.addKeyModalMargin,
                            padding: k.addKeyModalPadding,
                            borderRadius: k.addKeyModalRadius,
                            marginTop: "15px",
                            position: "relative"
                        },
                        "key-modal-label": {
                            color: f.addKeyModal.labelColor,
                            marginLeft: "2px",
                            marginBottom: "5px",
                            fontSize: "11px"
                        },
                        "key-modal-input-container": {
                            overflow: "hidden"
                        },
                        "key-modal-input": {
                            width: "100%",
                            padding: "3px 6px",
                            fontFamily: "monospace",
                            color: f.addKeyModal.color,
                            border: "none",
                            boxSizing: "border-box",
                            borderRadius: "2px"
                        },
                        "key-modal-cancel": {
                            backgroundColor: f.editVariable.removeIcon,
                            position: "absolute",
                            top: "0px",
                            right: "0px",
                            borderRadius: "0px 3px 0px 3px",
                            cursor: "pointer"
                        },
                        "key-modal-cancel-icon": {
                            color: f.addKeyModal.labelColor,
                            fontSize: k.iconFontSize,
                            transform: "rotate(45deg)"
                        },
                        "key-modal-submit": {
                            color: f.editVariable.addIcon,
                            fontSize: k.iconFontSize,
                            position: "absolute",
                            right: "2px",
                            top: "3px",
                            cursor: "pointer"
                        },
                        "function-ellipsis": {
                            display: "inline-block",
                            color: f.ellipsisColor,
                            fontSize: k.ellipsisFontSize,
                            lineHeight: k.ellipsisLineHeight,
                            cursor: k.ellipsisCursor
                        },
                        "validation-failure": {
                            float: "right",
                            padding: "3px 6px",
                            borderRadius: "2px",
                            cursor: "pointer",
                            color: f.validationFailure.fontColor,
                            backgroundColor: f.validationFailure.background
                        },
                        "validation-failure-label": {
                            marginRight: "6px"
                        },
                        "validation-failure-clear": {
                            position: "relative",
                            verticalAlign: "top",
                            cursor: "pointer",
                            color: f.validationFailure.iconColor,
                            fontSize: k.iconFontSize,
                            transform: "rotate(45deg)"
                        }
                    }
                };

            function A(b, f, s) {
                return b || console.error("theme has not been set"),
                    function(c) {
                        var p = R;
                        return c !== !1 && c !== "none" || (p = V), Object(Z.createStyling)(W, {
                            defaultBase16: p
                        })(c)
                    }(b)(f, s)
            }
            var Y = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = (c.rjvId, c.type_name),
                                _ = c.displayDataTypes,
                                O = c.theme;
                            return _ ? o.a.createElement("span", Object.assign({
                                className: "data-type-label"
                            }, A(O, "data-type-label")), p) : null
                        }
                    }]), s
                }(o.a.PureComponent),
                be = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props;
                            return o.a.createElement("div", A(c.theme, "boolean"), o.a.createElement(Y, Object.assign({
                                type_name: "bool"
                            }, c)), c.value ? "true" : "false")
                        }
                    }]), s
                }(o.a.PureComponent),
                ce = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props;
                            return o.a.createElement("div", A(c.theme, "date"), o.a.createElement(Y, Object.assign({
                                type_name: "date"
                            }, c)), o.a.createElement("span", Object.assign({
                                className: "date-value"
                            }, A(c.theme, "date-value")), c.value.toLocaleTimeString("en-us", {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                            })))
                        }
                    }]), s
                }(o.a.PureComponent),
                H = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props;
                            return o.a.createElement("div", A(c.theme, "float"), o.a.createElement(Y, Object.assign({
                                type_name: "float"
                            }, c)), this.props.value)
                        }
                    }]), s
                }(o.a.PureComponent);

            function ie(b, f) {
                (f == null || f > b.length) && (f = b.length);
                for (var s = 0, c = new Array(f); s < f; s++) c[s] = b[s];
                return c
            }

            function X(b, f) {
                if (b) {
                    if (typeof b == "string") return ie(b, f);
                    var s = Object.prototype.toString.call(b).slice(8, -1);
                    return s === "Object" && b.constructor && (s = b.constructor.name), s === "Map" || s === "Set" ? Array.from(b) : s === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(s) ? ie(b, f) : void 0
                }
            }

            function he(b, f) {
                var s;
                if (typeof Symbol > "u" || b[Symbol.iterator] == null) {
                    if (Array.isArray(b) || (s = X(b)) || f) {
                        s && (b = s);
                        var c = 0,
                            p = function() {};
                        return {
                            s: p,
                            n: function() {
                                return c >= b.length ? {
                                    done: !0
                                } : {
                                    done: !1,
                                    value: b[c++]
                                }
                            },
                            e: function(v) {
                                throw v
                            },
                            f: p
                        }
                    }
                    throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
                }
                var _, O = !0,
                    E = !1;
                return {
                    s: function() {
                        s = b[Symbol.iterator]()
                    },
                    n: function() {
                        var v = s.next();
                        return O = v.done, v
                    },
                    e: function(v) {
                        E = !0, _ = v
                    },
                    f: function() {
                        try {
                            O || s.return == null || s.return()
                        } finally {
                            if (E) throw _
                        }
                    }
                }
            }

            function ye(b) {
                return function(f) {
                    if (Array.isArray(f)) return ie(f)
                }(b) || function(f) {
                    if (typeof Symbol < "u" && Symbol.iterator in Object(f)) return Array.from(f)
                }(b) || X(b) || function() {
                    throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
                }()
            }
            var Me = e(46),
                xe = new(e(47)).Dispatcher,
                Ce = new(function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        var c;
                        d(this, s);
                        for (var p = arguments.length, _ = new Array(p), O = 0; O < p; O++) _[O] = arguments[O];
                        return (c = f.call.apply(f, [this].concat(_))).objects = {}, c.set = function(E, v, P, K) {
                            c.objects[E] === void 0 && (c.objects[E] = {}), c.objects[E][v] === void 0 && (c.objects[E][v] = {}), c.objects[E][v][P] = K
                        }, c.get = function(E, v, P, K) {
                            return c.objects[E] === void 0 || c.objects[E][v] === void 0 || c.objects[E][v][P] == null ? K : c.objects[E][v][P]
                        }, c.handleAction = function(E) {
                            var v = E.rjvId,
                                P = E.data;
                            switch (E.name) {
                                case "RESET":
                                    c.emit("reset-" + v);
                                    break;
                                case "VARIABLE_UPDATED":
                                    E.data.updated_src = c.updateSrc(v, P), c.set(v, "action", "variable-update", l(l({}, P), {}, {
                                        type: "variable-edited"
                                    })), c.emit("variable-update-" + v);
                                    break;
                                case "VARIABLE_REMOVED":
                                    E.data.updated_src = c.updateSrc(v, P), c.set(v, "action", "variable-update", l(l({}, P), {}, {
                                        type: "variable-removed"
                                    })), c.emit("variable-update-" + v);
                                    break;
                                case "VARIABLE_ADDED":
                                    E.data.updated_src = c.updateSrc(v, P), c.set(v, "action", "variable-update", l(l({}, P), {}, {
                                        type: "variable-added"
                                    })), c.emit("variable-update-" + v);
                                    break;
                                case "ADD_VARIABLE_KEY_REQUEST":
                                    c.set(v, "action", "new-key-request", P), c.emit("add-key-request-" + v)
                            }
                        }, c.updateSrc = function(E, v) {
                            var P = v.name,
                                K = v.namespace,
                                ne = v.new_value,
                                se = (v.existing_value, v.variable_removed);
                            K.shift();
                            var ue, ee = c.get(E, "global", "src"),
                                de = c.deepCopy(ee, ye(K)),
                                we = de,
                                G = he(K);
                            try {
                                for (G.s(); !(ue = G.n()).done;) we = we[ue.value]
                            } catch (Se) {
                                G.e(Se)
                            } finally {
                                G.f()
                            }
                            return se ? N(we) == "array" ? we.splice(P, 1) : delete we[P] : P !== null ? we[P] = ne : de = ne, c.set(E, "global", "src", de), de
                        }, c.deepCopy = function(E, v) {
                            var P, K = N(E),
                                ne = v.shift();
                            return K == "array" ? P = ye(E) : K == "object" && (P = l({}, E)), ne !== void 0 && (P[ne] = c.deepCopy(E[ne], v)), P
                        }, c
                    }
                    return s
                }(Me.EventEmitter));
            xe.register(Ce.handleAction.bind(Ce));
            var pe = Ce,
                ve = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s(c) {
                        var p;
                        return d(this, s), (p = f.call(this, c)).toggleCollapsed = function() {
                            p.setState({
                                collapsed: !p.state.collapsed
                            }, function() {
                                pe.set(p.props.rjvId, p.props.namespace, "collapsed", p.state.collapsed)
                            })
                        }, p.getFunctionDisplay = function(_) {
                            var O = U(p).props;
                            return _ ? o.a.createElement("span", null, p.props.value.toString().slice(9, -1).replace(/\{[\s\S]+/, ""), o.a.createElement("span", {
                                className: "function-collapsed",
                                style: {
                                    fontWeight: "bold"
                                }
                            }, o.a.createElement("span", null, "{"), o.a.createElement("span", A(O.theme, "ellipsis"), "..."), o.a.createElement("span", null, "}"))) : p.props.value.toString().slice(9, -1)
                        }, p.state = {
                            collapsed: pe.get(c.rjvId, c.namespace, "collapsed", !0)
                        }, p
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = this.state.collapsed;
                            return o.a.createElement("div", A(c.theme, "function"), o.a.createElement(Y, Object.assign({
                                type_name: "function"
                            }, c)), o.a.createElement("span", Object.assign({}, A(c.theme, "function-value"), {
                                className: "rjv-function-container",
                                onClick: this.toggleCollapsed
                            }), this.getFunctionDisplay(p)))
                        }
                    }]), s
                }(o.a.PureComponent),
                De = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            return o.a.createElement("div", A(this.props.theme, "nan"), "NaN")
                        }
                    }]), s
                }(o.a.PureComponent),
                He = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            return o.a.createElement("div", A(this.props.theme, "null"), "NULL")
                        }
                    }]), s
                }(o.a.PureComponent),
                Qe = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props;
                            return o.a.createElement("div", A(c.theme, "integer"), o.a.createElement(Y, Object.assign({
                                type_name: "int"
                            }, c)), this.props.value)
                        }
                    }]), s
                }(o.a.PureComponent),
                et = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props;
                            return o.a.createElement("div", A(c.theme, "regexp"), o.a.createElement(Y, Object.assign({
                                type_name: "regexp"
                            }, c)), this.props.value.toString())
                        }
                    }]), s
                }(o.a.PureComponent),
                tt = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s(c) {
                        var p;
                        return d(this, s), (p = f.call(this, c)).toggleCollapsed = function() {
                            p.setState({
                                collapsed: !p.state.collapsed
                            }, function() {
                                pe.set(p.props.rjvId, p.props.namespace, "collapsed", p.state.collapsed)
                            })
                        }, p.state = {
                            collapsed: pe.get(c.rjvId, c.namespace, "collapsed", !0)
                        }, p
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            this.state.collapsed;
                            var c = this.props,
                                p = c.collapseStringsAfterLength,
                                _ = c.theme,
                                O = c.value,
                                E = {
                                    style: {
                                        cursor: "default"
                                    }
                                };
                            return N(p) === "integer" && O.length > p && (E.style.cursor = "pointer", this.state.collapsed && (O = o.a.createElement("span", null, O.substring(0, p), o.a.createElement("span", A(_, "ellipsis"), " ...")))), o.a.createElement("div", A(_, "string"), o.a.createElement(Y, Object.assign({
                                type_name: "string"
                            }, c)), o.a.createElement("span", Object.assign({
                                className: "string-value"
                            }, E, {
                                onClick: this.toggleCollapsed
                            }), '"', O, '"'))
                        }
                    }]), s
                }(o.a.PureComponent),
                rt = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            return o.a.createElement("div", A(this.props.theme, "undefined"), "undefined")
                        }
                    }]), s
                }(o.a.PureComponent);

            function Ge() {
                return (Ge = Object.assign || function(b) {
                    for (var f = 1; f < arguments.length; f++) {
                        var s = arguments[f];
                        for (var c in s) Object.prototype.hasOwnProperty.call(s, c) && (b[c] = s[c])
                    }
                    return b
                }).apply(this, arguments)
            }
            var lt = re.useLayoutEffect,
                ut = function(b) {
                    var f = Object(re.useRef)(b);
                    return lt(function() {
                        f.current = b
                    }), f
                },
                at = function(b, f) {
                    typeof b != "function" ? b.current = f : b(f)
                },
                dt = function(b, f) {
                    var s = Object(re.useRef)();
                    return Object(re.useCallback)(function(c) {
                        b.current = c, s.current && at(s.current, null), s.current = f, f && at(f, c)
                    }, [f])
                },
                Ye = {
                    "min-height": "0",
                    "max-height": "none",
                    height: "0",
                    visibility: "hidden",
                    overflow: "hidden",
                    position: "absolute",
                    "z-index": "-1000",
                    top: "0",
                    right: "0"
                },
                Be = function(b) {
                    Object.keys(Ye).forEach(function(f) {
                        b.style.setProperty(f, Ye[f], "important")
                    })
                },
                Oe = null,
                nt = function() {},
                F = ["borderBottomWidth", "borderLeftWidth", "borderRightWidth", "borderTopWidth", "boxSizing", "fontFamily", "fontSize", "fontStyle", "fontWeight", "letterSpacing", "lineHeight", "paddingBottom", "paddingLeft", "paddingRight", "paddingTop", "tabSize", "textIndent", "textRendering", "textTransform", "width"],
                w = !!document.documentElement.currentStyle,
                x = function(b, f) {
                    var s = b.cacheMeasurements,
                        c = b.maxRows,
                        p = b.minRows,
                        _ = b.onChange,
                        O = _ === void 0 ? nt : _,
                        E = b.onHeightChange,
                        v = E === void 0 ? nt : E,
                        P = function(G, Se) {
                            if (G == null) return {};
                            var Je, Xe, At = {},
                                Ze = Object.keys(G);
                            for (Xe = 0; Xe < Ze.length; Xe++) Je = Ze[Xe], Se.indexOf(Je) >= 0 || (At[Je] = G[Je]);
                            return At
                        }(b, ["cacheMeasurements", "maxRows", "minRows", "onChange", "onHeightChange"]),
                        K, ne = P.value !== void 0,
                        se = Object(re.useRef)(null),
                        ue = dt(se, f),
                        ee = Object(re.useRef)(0),
                        de = Object(re.useRef)(),
                        we = function() {
                            var G = se.current,
                                Se = s && de.current ? de.current : function(Ze) {
                                    var Nt = window.getComputedStyle(Ze);
                                    if (Nt === null) return null;
                                    var bt, Fe = (bt = Nt, F.reduce(function(kt, ht) {
                                            return kt[ht] = bt[ht], kt
                                        }, {})),
                                        ft = Fe.boxSizing;
                                    return ft === "" ? null : (w && ft === "border-box" && (Fe.width = parseFloat(Fe.width) + parseFloat(Fe.borderRightWidth) + parseFloat(Fe.borderLeftWidth) + parseFloat(Fe.paddingRight) + parseFloat(Fe.paddingLeft) + "px"), {
                                        sizingStyle: Fe,
                                        paddingSize: parseFloat(Fe.paddingBottom) + parseFloat(Fe.paddingTop),
                                        borderSize: parseFloat(Fe.borderBottomWidth) + parseFloat(Fe.borderTopWidth)
                                    })
                                }(G);
                            if (Se) {
                                de.current = Se;
                                var Je = function(Ze, Nt, bt, Fe) {
                                        bt === void 0 && (bt = 1), Fe === void 0 && (Fe = 1 / 0), Oe || ((Oe = document.createElement("textarea")).setAttribute("tab-index", "-1"), Oe.setAttribute("aria-hidden", "true"), Be(Oe)), Oe.parentNode === null && document.body.appendChild(Oe);
                                        var ft = Ze.paddingSize,
                                            kt = Ze.borderSize,
                                            ht = Ze.sizingStyle,
                                            Qt = ht.boxSizing;
                                        Object.keys(ht).forEach(function(Lt) {
                                            var mt = Lt;
                                            Oe.style[mt] = ht[mt]
                                        }), Be(Oe), Oe.value = Nt;
                                        var Ft = function(Lt, mt) {
                                            var er = Lt.scrollHeight;
                                            return mt.sizingStyle.boxSizing === "border-box" ? er + mt.borderSize : er - mt.paddingSize
                                        }(Oe, Ze);
                                        Oe.value = "x";
                                        var Tt = Oe.scrollHeight - ft,
                                            Dt = Tt * bt;
                                        Qt === "border-box" && (Dt = Dt + ft + kt), Ft = Math.max(Dt, Ft);
                                        var It = Tt * Fe;
                                        return Qt === "border-box" && (It = It + ft + kt), [Ft = Math.min(It, Ft), Tt]
                                    }(Se, G.value || G.placeholder || "x", p, c),
                                    Xe = Je[0],
                                    At = Je[1];
                                ee.current !== Xe && (ee.current = Xe, G.style.setProperty("height", Xe + "px", "important"), v(Xe, {
                                    rowHeight: At
                                }))
                            }
                        };
                    return Object(re.useLayoutEffect)(we), K = ut(we), Object(re.useLayoutEffect)(function() {
                        var G = function(Se) {
                            K.current(Se)
                        };
                        return window.addEventListener("resize", G),
                            function() {
                                window.removeEventListener("resize", G)
                            }
                    }, []), Object(re.createElement)("textarea", Ge({}, P, {
                        onChange: function(G) {
                            ne || we(), O(G)
                        },
                        ref: ue
                    }))
                },
                M = Object(re.forwardRef)(x);

            function L(b) {
                b = b.trim();
                try {
                    if ((b = JSON.stringify(JSON.parse(b)))[0] === "[") return q("array", JSON.parse(b));
                    if (b[0] === "{") return q("object", JSON.parse(b));
                    if (b.match(/\-?\d+\.\d+/) && b.match(/\-?\d+\.\d+/)[0] === b) return q("float", parseFloat(b));
                    if (b.match(/\-?\d+e-\d+/) && b.match(/\-?\d+e-\d+/)[0] === b) return q("float", Number(b));
                    if (b.match(/\-?\d+/) && b.match(/\-?\d+/)[0] === b) return q("integer", parseInt(b));
                    if (b.match(/\-?\d+e\+\d+/) && b.match(/\-?\d+e\+\d+/)[0] === b) return q("integer", Number(b))
                } catch {}
                switch (b = b.toLowerCase()) {
                    case "undefined":
                        return q("undefined", void 0);
                    case "nan":
                        return q("nan", NaN);
                    case "null":
                        return q("null", null);
                    case "true":
                        return q("boolean", !0);
                    case "false":
                        return q("boolean", !1);
                    default:
                        if (b = Date.parse(b)) return q("date", new Date(b))
                }
                return q(!1, null)
            }

            function q(b, f) {
                return {
                    type: b,
                    value: f
                }
            }
            var ae = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.style,
                                _ = S(c, ["style"]);
                            return o.a.createElement("span", _, o.a.createElement("svg", Object.assign({}, oe(p), {
                                viewBox: "0 0 24 24",
                                fill: "currentColor",
                                preserveAspectRatio: "xMidYMid meet"
                            }), o.a.createElement("path", {
                                d: "M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7,13H17V11H7"
                            })))
                        }
                    }]), s
                }(o.a.PureComponent),
                Q = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.style,
                                _ = S(c, ["style"]);
                            return o.a.createElement("span", _, o.a.createElement("svg", Object.assign({}, oe(p), {
                                viewBox: "0 0 24 24",
                                fill: "currentColor",
                                preserveAspectRatio: "xMidYMid meet"
                            }), o.a.createElement("path", {
                                d: "M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M13,7H11V11H7V13H11V17H13V13H17V11H13V7Z"
                            })))
                        }
                    }]), s
                }(o.a.PureComponent),
                le = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.style,
                                _ = S(c, ["style"]),
                                O = oe(p).style;
                            return o.a.createElement("span", _, o.a.createElement("svg", {
                                fill: O.color,
                                width: O.height,
                                height: O.width,
                                style: O,
                                viewBox: "0 0 1792 1792"
                            }, o.a.createElement("path", {
                                d: "M1344 800v64q0 14-9 23t-23 9h-832q-14 0-23-9t-9-23v-64q0-14 9-23t23-9h832q14 0 23 9t9 23zm128 448v-832q0-66-47-113t-113-47h-832q-66 0-113 47t-47 113v832q0 66 47 113t113 47h832q66 0 113-47t47-113zm128-832v832q0 119-84.5 203.5t-203.5 84.5h-832q-119 0-203.5-84.5t-84.5-203.5v-832q0-119 84.5-203.5t203.5-84.5h832q119 0 203.5 84.5t84.5 203.5z"
                            })))
                        }
                    }]), s
                }(o.a.PureComponent),
                ge = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.style,
                                _ = S(c, ["style"]),
                                O = oe(p).style;
                            return o.a.createElement("span", _, o.a.createElement("svg", {
                                fill: O.color,
                                width: O.height,
                                height: O.width,
                                style: O,
                                viewBox: "0 0 1792 1792"
                            }, o.a.createElement("path", {
                                d: "M1344 800v64q0 14-9 23t-23 9h-352v352q0 14-9 23t-23 9h-64q-14 0-23-9t-9-23v-352h-352q-14 0-23-9t-9-23v-64q0-14 9-23t23-9h352v-352q0-14 9-23t23-9h64q14 0 23 9t9 23v352h352q14 0 23 9t9 23zm128 448v-832q0-66-47-113t-113-47h-832q-66 0-113 47t-47 113v832q0 66 47 113t113 47h832q66 0 113-47t47-113zm128-832v832q0 119-84.5 203.5t-203.5 84.5h-832q-119 0-203.5-84.5t-84.5-203.5v-832q0-119 84.5-203.5t203.5-84.5h832q119 0 203.5 84.5t84.5 203.5z"
                            })))
                        }
                    }]), s
                }(o.a.PureComponent),
                _e = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.style,
                                _ = S(c, ["style"]);
                            return o.a.createElement("span", _, o.a.createElement("svg", {
                                style: l(l({}, oe(p).style), {}, {
                                    paddingLeft: "2px",
                                    verticalAlign: "top"
                                }),
                                viewBox: "0 0 15 15",
                                fill: "currentColor"
                            }, o.a.createElement("path", {
                                d: "M0 14l6-6-6-6z"
                            })))
                        }
                    }]), s
                }(o.a.PureComponent),
                Ae = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.style,
                                _ = S(c, ["style"]);
                            return o.a.createElement("span", _, o.a.createElement("svg", {
                                style: l(l({}, oe(p).style), {}, {
                                    paddingLeft: "2px",
                                    verticalAlign: "top"
                                }),
                                viewBox: "0 0 15 15",
                                fill: "currentColor"
                            }, o.a.createElement("path", {
                                d: "M0 5l6 6 6-6z"
                            })))
                        }
                    }]), s
                }(o.a.PureComponent),
                me = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.style,
                                _ = S(c, ["style"]);
                            return o.a.createElement("span", _, o.a.createElement("svg", Object.assign({}, oe(p), {
                                viewBox: "0 0 40 40",
                                fill: "currentColor",
                                preserveAspectRatio: "xMidYMid meet"
                            }), o.a.createElement("g", null, o.a.createElement("path", {
                                d: "m30 35h-25v-22.5h25v7.5h2.5v-12.5c0-1.4-1.1-2.5-2.5-2.5h-7.5c0-2.8-2.2-5-5-5s-5 2.2-5 5h-7.5c-1.4 0-2.5 1.1-2.5 2.5v27.5c0 1.4 1.1 2.5 2.5 2.5h25c1.4 0 2.5-1.1 2.5-2.5v-5h-2.5v5z m-20-27.5h2.5s2.5-1.1 2.5-2.5 1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5 1.3 2.5 2.5 2.5h2.5s2.5 1.1 2.5 2.5h-20c0-1.5 1.1-2.5 2.5-2.5z m-2.5 20h5v-2.5h-5v2.5z m17.5-5v-5l-10 7.5 10 7.5v-5h12.5v-5h-12.5z m-17.5 10h7.5v-2.5h-7.5v2.5z m12.5-17.5h-12.5v2.5h12.5v-2.5z m-7.5 5h-5v2.5h5v-2.5z"
                            }))))
                        }
                    }]), s
                }(o.a.PureComponent),
                Te = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.style,
                                _ = S(c, ["style"]);
                            return o.a.createElement("span", _, o.a.createElement("svg", Object.assign({}, oe(p), {
                                viewBox: "0 0 40 40",
                                fill: "currentColor",
                                preserveAspectRatio: "xMidYMid meet"
                            }), o.a.createElement("g", null, o.a.createElement("path", {
                                d: "m28.6 25q0-0.5-0.4-1l-4-4 4-4q0.4-0.5 0.4-1 0-0.6-0.4-1.1l-2-2q-0.4-0.4-1-0.4-0.6 0-1 0.4l-4.1 4.1-4-4.1q-0.4-0.4-1-0.4-0.6 0-1 0.4l-2 2q-0.5 0.5-0.5 1.1 0 0.5 0.5 1l4 4-4 4q-0.5 0.5-0.5 1 0 0.7 0.5 1.1l2 2q0.4 0.4 1 0.4 0.6 0 1-0.4l4-4.1 4.1 4.1q0.4 0.4 1 0.4 0.6 0 1-0.4l2-2q0.4-0.4 0.4-1z m8.7-5q0 4.7-2.3 8.6t-6.3 6.2-8.6 2.3-8.6-2.3-6.2-6.2-2.3-8.6 2.3-8.6 6.2-6.2 8.6-2.3 8.6 2.3 6.3 6.2 2.3 8.6z"
                            }))))
                        }
                    }]), s
                }(o.a.PureComponent),
                Ie = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.style,
                                _ = S(c, ["style"]);
                            return o.a.createElement("span", _, o.a.createElement("svg", Object.assign({}, oe(p), {
                                viewBox: "0 0 40 40",
                                fill: "currentColor",
                                preserveAspectRatio: "xMidYMid meet"
                            }), o.a.createElement("g", null, o.a.createElement("path", {
                                d: "m30.1 21.4v-2.8q0-0.6-0.4-1t-1-0.5h-5.7v-5.7q0-0.6-0.4-1t-1-0.4h-2.9q-0.6 0-1 0.4t-0.4 1v5.7h-5.7q-0.6 0-1 0.5t-0.5 1v2.8q0 0.6 0.5 1t1 0.5h5.7v5.7q0 0.5 0.4 1t1 0.4h2.9q0.6 0 1-0.4t0.4-1v-5.7h5.7q0.6 0 1-0.5t0.4-1z m7.2-1.4q0 4.7-2.3 8.6t-6.3 6.2-8.6 2.3-8.6-2.3-6.2-6.2-2.3-8.6 2.3-8.6 6.2-6.2 8.6-2.3 8.6 2.3 6.3 6.2 2.3 8.6z"
                            }))))
                        }
                    }]), s
                }(o.a.PureComponent),
                Ke = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.style,
                                _ = S(c, ["style"]);
                            return o.a.createElement("span", _, o.a.createElement("svg", Object.assign({}, oe(p), {
                                viewBox: "0 0 40 40",
                                fill: "currentColor",
                                preserveAspectRatio: "xMidYMid meet"
                            }), o.a.createElement("g", null, o.a.createElement("path", {
                                d: "m31.6 21.6h-10v10h-3.2v-10h-10v-3.2h10v-10h3.2v10h10v3.2z"
                            }))))
                        }
                    }]), s
                }(o.a.PureComponent),
                ze = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.style,
                                _ = S(c, ["style"]);
                            return o.a.createElement("span", _, o.a.createElement("svg", Object.assign({}, oe(p), {
                                viewBox: "0 0 40 40",
                                fill: "currentColor",
                                preserveAspectRatio: "xMidYMid meet"
                            }), o.a.createElement("g", null, o.a.createElement("path", {
                                d: "m19.8 26.4l2.6-2.6-3.4-3.4-2.6 2.6v1.3h2.2v2.1h1.2z m9.8-16q-0.3-0.4-0.7 0l-7.8 7.8q-0.4 0.4 0 0.7t0.7 0l7.8-7.8q0.4-0.4 0-0.7z m1.8 13.2v4.3q0 2.6-1.9 4.5t-4.5 1.9h-18.6q-2.6 0-4.5-1.9t-1.9-4.5v-18.6q0-2.7 1.9-4.6t4.5-1.8h18.6q1.4 0 2.6 0.5 0.3 0.2 0.4 0.5 0.1 0.4-0.2 0.7l-1.1 1.1q-0.3 0.3-0.7 0.1-0.5-0.1-1-0.1h-18.6q-1.4 0-2.5 1.1t-1 2.5v18.6q0 1.4 1 2.5t2.5 1h18.6q1.5 0 2.5-1t1.1-2.5v-2.9q0-0.2 0.2-0.4l1.4-1.5q0.3-0.3 0.8-0.1t0.4 0.6z m-2.1-16.5l6.4 6.5-15 15h-6.4v-6.5z m9.9 3l-2.1 2-6.4-6.4 2.1-2q0.6-0.7 1.5-0.7t1.5 0.7l3.4 3.4q0.6 0.6 0.6 1.5t-0.6 1.5z"
                            }))))
                        }
                    }]), s
                }(o.a.PureComponent),
                ke = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.style,
                                _ = S(c, ["style"]);
                            return o.a.createElement("span", _, o.a.createElement("svg", Object.assign({}, oe(p), {
                                viewBox: "0 0 40 40",
                                fill: "currentColor",
                                preserveAspectRatio: "xMidYMid meet"
                            }), o.a.createElement("g", null, o.a.createElement("path", {
                                d: "m31.7 16.4q0-0.6-0.4-1l-2.1-2.1q-0.4-0.4-1-0.4t-1 0.4l-9.1 9.1-5-5q-0.5-0.4-1-0.4t-1 0.4l-2.1 2q-0.4 0.4-0.4 1 0 0.6 0.4 1l8.1 8.1q0.4 0.4 1 0.4 0.6 0 1-0.4l12.2-12.1q0.4-0.4 0.4-1z m5.6 3.6q0 4.7-2.3 8.6t-6.3 6.2-8.6 2.3-8.6-2.3-6.2-6.2-2.3-8.6 2.3-8.6 6.2-6.2 8.6-2.3 8.6 2.3 6.3 6.2 2.3 8.6z"
                            }))))
                        }
                    }]), s
                }(o.a.PureComponent);

            function oe(b) {
                return b || (b = {}), {
                    style: l(l({
                        verticalAlign: "middle"
                    }, b), {}, {
                        color: b.color ? b.color : "#000000",
                        height: "1em",
                        width: "1em"
                    })
                }
            }
            var Ne = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s(c) {
                        var p;
                        return d(this, s), (p = f.call(this, c)).copiedTimer = null, p.handleCopy = function() {
                            var _ = document.createElement("textarea"),
                                O = p.props,
                                E = O.clickCallback,
                                v = O.src,
                                P = O.namespace;
                            _.innerHTML = JSON.stringify(p.clipboardValue(v), null, "  "), document.body.appendChild(_), _.select(), document.execCommand("copy"), document.body.removeChild(_), p.copiedTimer = setTimeout(function() {
                                p.setState({
                                    copied: !1
                                })
                            }, 5500), p.setState({
                                copied: !0
                            }, function() {
                                typeof E == "function" && E({
                                    src: v,
                                    namespace: P,
                                    name: P[P.length - 1]
                                })
                            })
                        }, p.getClippyIcon = function() {
                            var _ = p.props.theme;
                            return p.state.copied ? o.a.createElement("span", null, o.a.createElement(me, Object.assign({
                                className: "copy-icon"
                            }, A(_, "copy-icon"))), o.a.createElement("span", A(_, "copy-icon-copied"), "✔")) : o.a.createElement(me, Object.assign({
                                className: "copy-icon"
                            }, A(_, "copy-icon")))
                        }, p.clipboardValue = function(_) {
                            switch (N(_)) {
                                case "function":
                                case "regexp":
                                    return _.toString();
                                default:
                                    return _
                            }
                        }, p.state = {
                            copied: !1
                        }, p
                    }
                    return y(s, [{
                        key: "componentWillUnmount",
                        value: function() {
                            this.copiedTimer && (clearTimeout(this.copiedTimer), this.copiedTimer = null)
                        }
                    }, {
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = (c.src, c.theme),
                                _ = c.hidden,
                                O = c.rowHovered,
                                E = A(p, "copy-to-clipboard").style,
                                v = "inline";
                            return _ && (v = "none"), o.a.createElement("span", {
                                className: "copy-to-clipboard-container",
                                title: "Copy to clipboard",
                                style: {
                                    verticalAlign: "top",
                                    display: O ? "inline-block" : "none"
                                }
                            }, o.a.createElement("span", {
                                style: l(l({}, E), {}, {
                                    display: v
                                }),
                                onClick: this.handleCopy
                            }, this.getClippyIcon()))
                        }
                    }]), s
                }(o.a.PureComponent),
                Pe = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s(c) {
                        var p;
                        return d(this, s), (p = f.call(this, c)).getEditIcon = function() {
                            var _ = p.props,
                                O = _.variable,
                                E = _.theme;
                            return o.a.createElement("div", {
                                className: "click-to-edit",
                                style: {
                                    verticalAlign: "top",
                                    display: p.state.hovered ? "inline-block" : "none"
                                }
                            }, o.a.createElement(ze, Object.assign({
                                className: "click-to-edit-icon"
                            }, A(E, "editVarIcon"), {
                                onClick: function() {
                                    p.prepopInput(O)
                                }
                            })))
                        }, p.prepopInput = function(_) {
                            if (p.props.onEdit !== !1) {
                                var O = function(v) {
                                        var P;
                                        switch (N(v)) {
                                            case "undefined":
                                                P = "undefined";
                                                break;
                                            case "nan":
                                                P = "NaN";
                                                break;
                                            case "string":
                                                P = v;
                                                break;
                                            case "date":
                                            case "function":
                                            case "regexp":
                                                P = v.toString();
                                                break;
                                            default:
                                                try {
                                                    P = JSON.stringify(v, null, "  ")
                                                } catch {
                                                    P = ""
                                                }
                                        }
                                        return P
                                    }(_.value),
                                    E = L(O);
                                p.setState({
                                    editMode: !0,
                                    editValue: O,
                                    parsedInput: {
                                        type: E.type,
                                        value: E.value
                                    }
                                })
                            }
                        }, p.getRemoveIcon = function() {
                            var _ = p.props,
                                O = _.variable,
                                E = _.namespace,
                                v = _.theme,
                                P = _.rjvId;
                            return o.a.createElement("div", {
                                className: "click-to-remove",
                                style: {
                                    verticalAlign: "top",
                                    display: p.state.hovered ? "inline-block" : "none"
                                }
                            }, o.a.createElement(Te, Object.assign({
                                className: "click-to-remove-icon"
                            }, A(v, "removeVarIcon"), {
                                onClick: function() {
                                    xe.dispatch({
                                        name: "VARIABLE_REMOVED",
                                        rjvId: P,
                                        data: {
                                            name: O.name,
                                            namespace: E,
                                            existing_value: O.value,
                                            variable_removed: !0
                                        }
                                    })
                                }
                            })))
                        }, p.getValue = function(_, O) {
                            var E = !O && _.type,
                                v = U(p).props;
                            switch (E) {
                                case !1:
                                    return p.getEditInput();
                                case "string":
                                    return o.a.createElement(tt, Object.assign({
                                        value: _.value
                                    }, v));
                                case "integer":
                                    return o.a.createElement(Qe, Object.assign({
                                        value: _.value
                                    }, v));
                                case "float":
                                    return o.a.createElement(H, Object.assign({
                                        value: _.value
                                    }, v));
                                case "boolean":
                                    return o.a.createElement(be, Object.assign({
                                        value: _.value
                                    }, v));
                                case "function":
                                    return o.a.createElement(ve, Object.assign({
                                        value: _.value
                                    }, v));
                                case "null":
                                    return o.a.createElement(He, v);
                                case "nan":
                                    return o.a.createElement(De, v);
                                case "undefined":
                                    return o.a.createElement(rt, v);
                                case "date":
                                    return o.a.createElement(ce, Object.assign({
                                        value: _.value
                                    }, v));
                                case "regexp":
                                    return o.a.createElement(et, Object.assign({
                                        value: _.value
                                    }, v));
                                default:
                                    return o.a.createElement("div", {
                                        className: "object-value"
                                    }, JSON.stringify(_.value))
                            }
                        }, p.getEditInput = function() {
                            var _ = p.props.theme,
                                O = p.state.editValue;
                            return o.a.createElement("div", null, o.a.createElement(M, Object.assign({
                                type: "text",
                                inputRef: function(E) {
                                    return E && E.focus()
                                },
                                value: O,
                                className: "variable-editor",
                                onChange: function(E) {
                                    var v = E.target.value,
                                        P = L(v);
                                    p.setState({
                                        editValue: v,
                                        parsedInput: {
                                            type: P.type,
                                            value: P.value
                                        }
                                    })
                                },
                                onKeyDown: function(E) {
                                    switch (E.key) {
                                        case "Escape":
                                            p.setState({
                                                editMode: !1,
                                                editValue: ""
                                            });
                                            break;
                                        case "Enter":
                                            (E.ctrlKey || E.metaKey) && p.submitEdit(!0)
                                    }
                                    E.stopPropagation()
                                },
                                placeholder: "update this value",
                                minRows: 2
                            }, A(_, "edit-input"))), o.a.createElement("div", A(_, "edit-icon-container"), o.a.createElement(Te, Object.assign({
                                className: "edit-cancel"
                            }, A(_, "cancel-icon"), {
                                onClick: function() {
                                    p.setState({
                                        editMode: !1,
                                        editValue: ""
                                    })
                                }
                            })), o.a.createElement(ke, Object.assign({
                                className: "edit-check string-value"
                            }, A(_, "check-icon"), {
                                onClick: function() {
                                    p.submitEdit()
                                }
                            })), o.a.createElement("div", null, p.showDetected())))
                        }, p.submitEdit = function(_) {
                            var O = p.props,
                                E = O.variable,
                                v = O.namespace,
                                P = O.rjvId,
                                K = p.state,
                                ne = K.editValue,
                                se = K.parsedInput,
                                ue = ne;
                            _ && se.type && (ue = se.value), p.setState({
                                editMode: !1
                            }), xe.dispatch({
                                name: "VARIABLE_UPDATED",
                                rjvId: P,
                                data: {
                                    name: E.name,
                                    namespace: v,
                                    existing_value: E.value,
                                    new_value: ue,
                                    variable_removed: !1
                                }
                            })
                        }, p.showDetected = function() {
                            var _ = p.props,
                                O = _.theme,
                                E = (_.variable, _.namespace, _.rjvId, p.state.parsedInput),
                                v = (E.type, E.value, p.getDetectedInput());
                            if (v) return o.a.createElement("div", null, o.a.createElement("div", A(O, "detected-row"), v, o.a.createElement(ke, {
                                className: "edit-check detected",
                                style: l({
                                    verticalAlign: "top",
                                    paddingLeft: "3px"
                                }, A(O, "check-icon").style),
                                onClick: function() {
                                    p.submitEdit(!0)
                                }
                            })))
                        }, p.getDetectedInput = function() {
                            var _ = p.state.parsedInput,
                                O = _.type,
                                E = _.value,
                                v = U(p).props,
                                P = v.theme;
                            if (O !== !1) switch (O.toLowerCase()) {
                                case "object":
                                    return o.a.createElement("span", null, o.a.createElement("span", {
                                        style: l(l({}, A(P, "brace").style), {}, {
                                            cursor: "default"
                                        })
                                    }, "{"), o.a.createElement("span", {
                                        style: l(l({}, A(P, "ellipsis").style), {}, {
                                            cursor: "default"
                                        })
                                    }, "..."), o.a.createElement("span", {
                                        style: l(l({}, A(P, "brace").style), {}, {
                                            cursor: "default"
                                        })
                                    }, "}"));
                                case "array":
                                    return o.a.createElement("span", null, o.a.createElement("span", {
                                        style: l(l({}, A(P, "brace").style), {}, {
                                            cursor: "default"
                                        })
                                    }, "["), o.a.createElement("span", {
                                        style: l(l({}, A(P, "ellipsis").style), {}, {
                                            cursor: "default"
                                        })
                                    }, "..."), o.a.createElement("span", {
                                        style: l(l({}, A(P, "brace").style), {}, {
                                            cursor: "default"
                                        })
                                    }, "]"));
                                case "string":
                                    return o.a.createElement(tt, Object.assign({
                                        value: E
                                    }, v));
                                case "integer":
                                    return o.a.createElement(Qe, Object.assign({
                                        value: E
                                    }, v));
                                case "float":
                                    return o.a.createElement(H, Object.assign({
                                        value: E
                                    }, v));
                                case "boolean":
                                    return o.a.createElement(be, Object.assign({
                                        value: E
                                    }, v));
                                case "function":
                                    return o.a.createElement(ve, Object.assign({
                                        value: E
                                    }, v));
                                case "null":
                                    return o.a.createElement(He, v);
                                case "nan":
                                    return o.a.createElement(De, v);
                                case "undefined":
                                    return o.a.createElement(rt, v);
                                case "date":
                                    return o.a.createElement(ce, Object.assign({
                                        value: new Date(E)
                                    }, v))
                            }
                        }, p.state = {
                            editMode: !1,
                            editValue: "",
                            hovered: !1,
                            renameKey: !1,
                            parsedInput: {
                                type: !1,
                                value: null
                            }
                        }, p
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this,
                                p = this.props,
                                _ = p.variable,
                                O = p.singleIndent,
                                E = p.type,
                                v = p.theme,
                                P = p.namespace,
                                K = p.indentWidth,
                                ne = p.enableClipboard,
                                se = p.onEdit,
                                ue = p.onDelete,
                                ee = p.onSelect,
                                de = p.displayArrayKey,
                                we = p.quotesOnKeys,
                                G = this.state.editMode;
                            return o.a.createElement("div", Object.assign({}, A(v, "objectKeyVal", {
                                paddingLeft: K * O
                            }), {
                                onMouseEnter: function() {
                                    return c.setState(l(l({}, c.state), {}, {
                                        hovered: !0
                                    }))
                                },
                                onMouseLeave: function() {
                                    return c.setState(l(l({}, c.state), {}, {
                                        hovered: !1
                                    }))
                                },
                                className: "variable-row",
                                key: _.name
                            }), E == "array" ? de ? o.a.createElement("span", Object.assign({}, A(v, "array-key"), {
                                key: _.name + "_" + P
                            }), _.name, o.a.createElement("div", A(v, "colon"), ":")) : null : o.a.createElement("span", null, o.a.createElement("span", Object.assign({}, A(v, "object-name"), {
                                className: "object-key",
                                key: _.name + "_" + P
                            }), !!we && o.a.createElement("span", {
                                style: {
                                    verticalAlign: "top"
                                }
                            }, '"'), o.a.createElement("span", {
                                style: {
                                    display: "inline-block"
                                }
                            }, _.name), !!we && o.a.createElement("span", {
                                style: {
                                    verticalAlign: "top"
                                }
                            }, '"')), o.a.createElement("span", A(v, "colon"), ":")), o.a.createElement("div", Object.assign({
                                className: "variable-value",
                                onClick: ee === !1 && se === !1 ? null : function(Se) {
                                    var Je = ye(P);
                                    (Se.ctrlKey || Se.metaKey) && se !== !1 ? c.prepopInput(_) : ee !== !1 && (Je.shift(), ee(l(l({}, _), {}, {
                                        namespace: Je
                                    })))
                                }
                            }, A(v, "variableValue", {
                                cursor: ee === !1 ? "default" : "pointer"
                            })), this.getValue(_, G)), ne ? o.a.createElement(Ne, {
                                rowHovered: this.state.hovered,
                                hidden: G,
                                src: _.value,
                                clickCallback: ne,
                                theme: v,
                                namespace: [].concat(ye(P), [_.name])
                            }) : null, se !== !1 && G == 0 ? this.getEditIcon() : null, ue !== !1 && G == 0 ? this.getRemoveIcon() : null)
                        }
                    }]), s
                }(o.a.PureComponent),
                Ue = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        var c;
                        d(this, s);
                        for (var p = arguments.length, _ = new Array(p), O = 0; O < p; O++) _[O] = arguments[O];
                        return (c = f.call.apply(f, [this].concat(_))).getObjectSize = function() {
                            var E = c.props,
                                v = E.size,
                                P = E.theme;
                            if (E.displayObjectSize) return o.a.createElement("span", Object.assign({
                                className: "object-size"
                            }, A(P, "object-size")), v, " item", v === 1 ? "" : "s")
                        }, c.getAddAttribute = function(E) {
                            var v = c.props,
                                P = v.theme,
                                K = v.namespace,
                                ne = v.name,
                                se = v.src,
                                ue = v.rjvId,
                                ee = v.depth;
                            return o.a.createElement("span", {
                                className: "click-to-add",
                                style: {
                                    verticalAlign: "top",
                                    display: E ? "inline-block" : "none"
                                }
                            }, o.a.createElement(Ie, Object.assign({
                                className: "click-to-add-icon"
                            }, A(P, "addVarIcon"), {
                                onClick: function() {
                                    var de = {
                                        name: ee > 0 ? ne : null,
                                        namespace: K.splice(0, K.length - 1),
                                        existing_value: se,
                                        variable_removed: !1,
                                        key_name: null
                                    };
                                    N(se) === "object" ? xe.dispatch({
                                        name: "ADD_VARIABLE_KEY_REQUEST",
                                        rjvId: ue,
                                        data: de
                                    }) : xe.dispatch({
                                        name: "VARIABLE_ADDED",
                                        rjvId: ue,
                                        data: l(l({}, de), {}, {
                                            new_value: [].concat(ye(se), [null])
                                        })
                                    })
                                }
                            })))
                        }, c.getRemoveObject = function(E) {
                            var v = c.props,
                                P = v.theme,
                                K = (v.hover, v.namespace),
                                ne = v.name,
                                se = v.src,
                                ue = v.rjvId;
                            if (K.length !== 1) return o.a.createElement("span", {
                                className: "click-to-remove",
                                style: {
                                    display: E ? "inline-block" : "none"
                                }
                            }, o.a.createElement(Te, Object.assign({
                                className: "click-to-remove-icon"
                            }, A(P, "removeVarIcon"), {
                                onClick: function() {
                                    xe.dispatch({
                                        name: "VARIABLE_REMOVED",
                                        rjvId: ue,
                                        data: {
                                            name: ne,
                                            namespace: K.splice(0, K.length - 1),
                                            existing_value: se,
                                            variable_removed: !0
                                        }
                                    })
                                }
                            })))
                        }, c.render = function() {
                            var E = c.props,
                                v = E.theme,
                                P = E.onDelete,
                                K = E.onAdd,
                                ne = E.enableClipboard,
                                se = E.src,
                                ue = E.namespace,
                                ee = E.rowHovered;
                            return o.a.createElement("div", Object.assign({}, A(v, "object-meta-data"), {
                                className: "object-meta-data",
                                onClick: function(de) {
                                    de.stopPropagation()
                                }
                            }), c.getObjectSize(), ne ? o.a.createElement(Ne, {
                                rowHovered: ee,
                                clickCallback: ne,
                                src: se,
                                theme: v,
                                namespace: ue
                            }) : null, K !== !1 ? c.getAddAttribute(ee) : null, P !== !1 ? c.getRemoveObject(ee) : null)
                        }, c
                    }
                    return s
                }(o.a.PureComponent);

            function $e(b) {
                var f = b.parent_type,
                    s = b.namespace,
                    c = b.quotesOnKeys,
                    p = b.theme,
                    _ = b.jsvRoot,
                    O = b.name,
                    E = b.displayArrayKey,
                    v = b.name ? b.name : "";
                return !_ || O !== !1 && O !== null ? f == "array" ? E ? o.a.createElement("span", Object.assign({}, A(p, "array-key"), {
                    key: s
                }), o.a.createElement("span", {
                    className: "array-key"
                }, v), o.a.createElement("span", A(p, "colon"), ":")) : o.a.createElement("span", null) : o.a.createElement("span", Object.assign({}, A(p, "object-name"), {
                    key: s
                }), o.a.createElement("span", {
                    className: "object-key"
                }, c && o.a.createElement("span", {
                    style: {
                        verticalAlign: "top"
                    }
                }, '"'), o.a.createElement("span", null, v), c && o.a.createElement("span", {
                    style: {
                        verticalAlign: "top"
                    }
                }, '"')), o.a.createElement("span", A(p, "colon"), ":")) : o.a.createElement("span", null)
            }

            function Le(b) {
                var f = b.theme;
                switch (b.iconStyle) {
                    case "triangle":
                        return o.a.createElement(Ae, Object.assign({}, A(f, "expanded-icon"), {
                            className: "expanded-icon"
                        }));
                    case "square":
                        return o.a.createElement(le, Object.assign({}, A(f, "expanded-icon"), {
                            className: "expanded-icon"
                        }));
                    default:
                        return o.a.createElement(ae, Object.assign({}, A(f, "expanded-icon"), {
                            className: "expanded-icon"
                        }))
                }
            }

            function Ve(b) {
                var f = b.theme;
                switch (b.iconStyle) {
                    case "triangle":
                        return o.a.createElement(_e, Object.assign({}, A(f, "collapsed-icon"), {
                            className: "collapsed-icon"
                        }));
                    case "square":
                        return o.a.createElement(ge, Object.assign({}, A(f, "collapsed-icon"), {
                            className: "collapsed-icon"
                        }));
                    default:
                        return o.a.createElement(Q, Object.assign({}, A(f, "collapsed-icon"), {
                            className: "collapsed-icon"
                        }))
                }
            }
            var pt = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s(c) {
                        var p;
                        return d(this, s), (p = f.call(this, c)).toggleCollapsed = function(_) {
                            var O = [];
                            for (var E in p.state.expanded) O.push(p.state.expanded[E]);
                            O[_] = !O[_], p.setState({
                                expanded: O
                            })
                        }, p.state = {
                            expanded: []
                        }, p
                    }
                    return y(s, [{
                        key: "getExpandedIcon",
                        value: function(c) {
                            var p = this.props,
                                _ = p.theme,
                                O = p.iconStyle;
                            return this.state.expanded[c] ? o.a.createElement(Le, {
                                theme: _,
                                iconStyle: O
                            }) : o.a.createElement(Ve, {
                                theme: _,
                                iconStyle: O
                            })
                        }
                    }, {
                        key: "render",
                        value: function() {
                            var c = this,
                                p = this.props,
                                _ = p.src,
                                O = p.groupArraysAfterLength,
                                E = (p.depth, p.name),
                                v = p.theme,
                                P = p.jsvRoot,
                                K = p.namespace,
                                ne = (p.parent_type, S(p, ["src", "groupArraysAfterLength", "depth", "name", "theme", "jsvRoot", "namespace", "parent_type"])),
                                se = 0,
                                ue = 5 * this.props.indentWidth;
                            P || (se = 5 * this.props.indentWidth);
                            var ee = O,
                                de = Math.ceil(_.length / ee);
                            return o.a.createElement("div", Object.assign({
                                className: "object-key-val"
                            }, A(v, P ? "jsv-root" : "objectKeyVal", {
                                paddingLeft: se
                            })), o.a.createElement($e, this.props), o.a.createElement("span", null, o.a.createElement(Ue, Object.assign({
                                size: _.length
                            }, this.props))), ye(Array(de)).map(function(we, G) {
                                return o.a.createElement("div", Object.assign({
                                    key: G,
                                    className: "object-key-val array-group"
                                }, A(v, "objectKeyVal", {
                                    marginLeft: 6,
                                    paddingLeft: ue
                                })), o.a.createElement("span", A(v, "brace-row"), o.a.createElement("div", Object.assign({
                                    className: "icon-container"
                                }, A(v, "icon-container"), {
                                    onClick: function(Se) {
                                        c.toggleCollapsed(G)
                                    }
                                }), c.getExpandedIcon(G)), c.state.expanded[G] ? o.a.createElement(Ct, Object.assign({
                                    key: E + G,
                                    depth: 0,
                                    name: !1,
                                    collapsed: !1,
                                    groupArraysAfterLength: ee,
                                    index_offset: G * ee,
                                    src: _.slice(G * ee, G * ee + ee),
                                    namespace: K,
                                    type: "array",
                                    parent_type: "array_group",
                                    theme: v
                                }, ne)) : o.a.createElement("span", Object.assign({}, A(v, "brace"), {
                                    onClick: function(Se) {
                                        c.toggleCollapsed(G)
                                    },
                                    className: "array-group-brace"
                                }), "[", o.a.createElement("div", Object.assign({}, A(v, "array-group-meta-data"), {
                                    className: "array-group-meta-data"
                                }), o.a.createElement("span", Object.assign({
                                    className: "object-size"
                                }, A(v, "object-size")), G * ee, " - ", G * ee + ee > _.length ? _.length : G * ee + ee)), "]")))
                            }))
                        }
                    }]), s
                }(o.a.PureComponent),
                xt = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s(c) {
                        var p;
                        d(this, s), (p = f.call(this, c)).toggleCollapsed = function() {
                            p.setState({
                                expanded: !p.state.expanded
                            }, function() {
                                pe.set(p.props.rjvId, p.props.namespace, "expanded", p.state.expanded)
                            })
                        }, p.getObjectContent = function(O, E, v) {
                            return o.a.createElement("div", {
                                className: "pushed-content object-container"
                            }, o.a.createElement("div", Object.assign({
                                className: "object-content"
                            }, A(p.props.theme, "pushed-content")), p.renderObjectContents(E, v)))
                        }, p.getEllipsis = function() {
                            return p.state.size === 0 ? null : o.a.createElement("div", Object.assign({}, A(p.props.theme, "ellipsis"), {
                                className: "node-ellipsis",
                                onClick: p.toggleCollapsed
                            }), "...")
                        }, p.getObjectMetaData = function(O) {
                            var E = p.props,
                                v = (E.rjvId, E.theme, p.state),
                                P = v.size,
                                K = v.hovered;
                            return o.a.createElement(Ue, Object.assign({
                                rowHovered: K,
                                size: P
                            }, p.props))
                        }, p.renderObjectContents = function(O, E) {
                            var v, P = p.props,
                                K = P.depth,
                                ne = P.parent_type,
                                se = P.index_offset,
                                ue = P.groupArraysAfterLength,
                                ee = P.namespace,
                                de = p.state.object_type,
                                we = [],
                                G = Object.keys(O || {});
                            return p.props.sortKeys && de !== "array" && (G = G.sort()), G.forEach(function(Se) {
                                if (v = new Nr(Se, O[Se]), ne === "array_group" && se && (v.name = parseInt(v.name) + se), O.hasOwnProperty(Se))
                                    if (v.type === "object") we.push(o.a.createElement(Ct, Object.assign({
                                        key: v.name,
                                        depth: K + 1,
                                        name: v.name,
                                        src: v.value,
                                        namespace: ee.concat(v.name),
                                        parent_type: de
                                    }, E)));
                                    else if (v.type === "array") {
                                    var Je = Ct;
                                    ue && v.value.length > ue && (Je = pt), we.push(o.a.createElement(Je, Object.assign({
                                        key: v.name,
                                        depth: K + 1,
                                        name: v.name,
                                        src: v.value,
                                        namespace: ee.concat(v.name),
                                        type: "array",
                                        parent_type: de
                                    }, E)))
                                } else we.push(o.a.createElement(Pe, Object.assign({
                                    key: v.name + "_" + ee,
                                    variable: v,
                                    singleIndent: 5,
                                    namespace: ee,
                                    type: p.props.type
                                }, E)))
                            }), we
                        };
                        var _ = s.getState(c);
                        return p.state = l(l({}, _), {}, {
                            prevProps: {}
                        }), p
                    }
                    return y(s, [{
                        key: "getBraceStart",
                        value: function(c, p) {
                            var _ = this,
                                O = this.props,
                                E = O.src,
                                v = O.theme,
                                P = O.iconStyle;
                            if (O.parent_type === "array_group") return o.a.createElement("span", null, o.a.createElement("span", A(v, "brace"), c === "array" ? "[" : "{"), p ? this.getObjectMetaData(E) : null);
                            var K = p ? Le : Ve;
                            return o.a.createElement("span", null, o.a.createElement("span", Object.assign({
                                onClick: function(ne) {
                                    _.toggleCollapsed()
                                }
                            }, A(v, "brace-row")), o.a.createElement("div", Object.assign({
                                className: "icon-container"
                            }, A(v, "icon-container")), o.a.createElement(K, {
                                theme: v,
                                iconStyle: P
                            })), o.a.createElement($e, this.props), o.a.createElement("span", A(v, "brace"), c === "array" ? "[" : "{")), p ? this.getObjectMetaData(E) : null)
                        }
                    }, {
                        key: "render",
                        value: function() {
                            var c = this,
                                p = this.props,
                                _ = p.depth,
                                O = p.src,
                                E = (p.namespace, p.name, p.type, p.parent_type),
                                v = p.theme,
                                P = p.jsvRoot,
                                K = p.iconStyle,
                                ne = S(p, ["depth", "src", "namespace", "name", "type", "parent_type", "theme", "jsvRoot", "iconStyle"]),
                                se = this.state,
                                ue = se.object_type,
                                ee = se.expanded,
                                de = {};
                            return P || E === "array_group" ? E === "array_group" && (de.borderLeft = 0, de.display = "inline") : de.paddingLeft = 5 * this.props.indentWidth, o.a.createElement("div", Object.assign({
                                className: "object-key-val",
                                onMouseEnter: function() {
                                    return c.setState(l(l({}, c.state), {}, {
                                        hovered: !0
                                    }))
                                },
                                onMouseLeave: function() {
                                    return c.setState(l(l({}, c.state), {}, {
                                        hovered: !1
                                    }))
                                }
                            }, A(v, P ? "jsv-root" : "objectKeyVal", de)), this.getBraceStart(ue, ee), ee ? this.getObjectContent(_, O, l({
                                theme: v,
                                iconStyle: K
                            }, ne)) : this.getEllipsis(), o.a.createElement("span", {
                                className: "brace-row"
                            }, o.a.createElement("span", {
                                style: l(l({}, A(v, "brace").style), {}, {
                                    paddingLeft: ee ? "3px" : "0px"
                                })
                            }, ue === "array" ? "]" : "}"), ee ? null : this.getObjectMetaData(O)))
                        }
                    }], [{
                        key: "getDerivedStateFromProps",
                        value: function(c, p) {
                            var _ = p.prevProps;
                            return c.src !== _.src || c.collapsed !== _.collapsed || c.name !== _.name || c.namespace !== _.namespace || c.rjvId !== _.rjvId ? l(l({}, s.getState(c)), {}, {
                                prevProps: c
                            }) : null
                        }
                    }]), s
                }(o.a.PureComponent);
            xt.getState = function(b) {
                var f = Object.keys(b.src).length,
                    s = (b.collapsed === !1 || b.collapsed !== !0 && b.collapsed > b.depth) && (!b.shouldCollapse || b.shouldCollapse({
                        name: b.name,
                        src: b.src,
                        type: N(b.src),
                        namespace: b.namespace
                    }) === !1) && f !== 0;
                return {
                    expanded: pe.get(b.rjvId, b.namespace, "expanded", s),
                    object_type: b.type === "array" ? "array" : "object",
                    parent_type: b.type === "array" ? "array" : "object",
                    size: f,
                    hovered: !1
                }
            };
            var Nr = function b(f, s) {
                d(this, b), this.name = f, this.value = s, this.type = N(s)
            };
            $(xt);
            var Ct = xt,
                Fr = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        var c;
                        d(this, s);
                        for (var p = arguments.length, _ = new Array(p), O = 0; O < p; O++) _[O] = arguments[O];
                        return (c = f.call.apply(f, [this].concat(_))).render = function() {
                            var E = U(c).props,
                                v = [E.name],
                                P = Ct;
                            return Array.isArray(E.src) && E.groupArraysAfterLength && E.src.length > E.groupArraysAfterLength && (P = pt), o.a.createElement("div", {
                                className: "pretty-json-container object-container"
                            }, o.a.createElement("div", {
                                className: "object-content"
                            }, o.a.createElement(P, Object.assign({
                                namespace: v,
                                depth: 0,
                                jsvRoot: !0
                            }, E))))
                        }, c
                    }
                    return s
                }(o.a.PureComponent),
                Mr = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s(c) {
                        var p;
                        return d(this, s), (p = f.call(this, c)).closeModal = function() {
                            xe.dispatch({
                                rjvId: p.props.rjvId,
                                name: "RESET"
                            })
                        }, p.submit = function() {
                            p.props.submit(p.state.input)
                        }, p.state = {
                            input: c.input ? c.input : ""
                        }, p
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this,
                                p = this.props,
                                _ = p.theme,
                                O = p.rjvId,
                                E = p.isValid,
                                v = this.state.input,
                                P = E(v);
                            return o.a.createElement("div", Object.assign({
                                className: "key-modal-request"
                            }, A(_, "key-modal-request"), {
                                onClick: this.closeModal
                            }), o.a.createElement("div", Object.assign({}, A(_, "key-modal"), {
                                onClick: function(K) {
                                    K.stopPropagation()
                                }
                            }), o.a.createElement("div", A(_, "key-modal-label"), "Key Name:"), o.a.createElement("div", {
                                style: {
                                    position: "relative"
                                }
                            }, o.a.createElement("input", Object.assign({}, A(_, "key-modal-input"), {
                                className: "key-modal-input",
                                ref: function(K) {
                                    return K && K.focus()
                                },
                                spellCheck: !1,
                                value: v,
                                placeholder: "...",
                                onChange: function(K) {
                                    c.setState({
                                        input: K.target.value
                                    })
                                },
                                onKeyPress: function(K) {
                                    P && K.key === "Enter" ? c.submit() : K.key === "Escape" && c.closeModal()
                                }
                            })), P ? o.a.createElement(ke, Object.assign({}, A(_, "key-modal-submit"), {
                                className: "key-modal-submit",
                                onClick: function(K) {
                                    return c.submit()
                                }
                            })) : null), o.a.createElement("span", A(_, "key-modal-cancel"), o.a.createElement(Ke, Object.assign({}, A(_, "key-modal-cancel-icon"), {
                                className: "key-modal-cancel",
                                onClick: function() {
                                    xe.dispatch({
                                        rjvId: O,
                                        name: "RESET"
                                    })
                                }
                            })))))
                        }
                    }]), s
                }(o.a.PureComponent),
                Pr = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        var c;
                        d(this, s);
                        for (var p = arguments.length, _ = new Array(p), O = 0; O < p; O++) _[O] = arguments[O];
                        return (c = f.call.apply(f, [this].concat(_))).isValid = function(E) {
                            var v = c.props.rjvId,
                                P = pe.get(v, "action", "new-key-request");
                            return E != "" && Object.keys(P.existing_value).indexOf(E) === -1
                        }, c.submit = function(E) {
                            var v = c.props.rjvId,
                                P = pe.get(v, "action", "new-key-request");
                            P.new_value = l({}, P.existing_value), P.new_value[E] = c.props.defaultValue, xe.dispatch({
                                name: "VARIABLE_ADDED",
                                rjvId: v,
                                data: P
                            })
                        }, c
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.active,
                                _ = c.theme,
                                O = c.rjvId;
                            return p ? o.a.createElement(Mr, {
                                rjvId: O,
                                theme: _,
                                isValid: this.isValid,
                                submit: this.submit
                            }) : null
                        }
                    }]), s
                }(o.a.PureComponent),
                Rr = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s() {
                        return d(this, s), f.apply(this, arguments)
                    }
                    return y(s, [{
                        key: "render",
                        value: function() {
                            var c = this.props,
                                p = c.message,
                                _ = c.active,
                                O = c.theme,
                                E = c.rjvId;
                            return _ ? o.a.createElement("div", Object.assign({
                                className: "validation-failure"
                            }, A(O, "validation-failure"), {
                                onClick: function() {
                                    xe.dispatch({
                                        rjvId: E,
                                        name: "RESET"
                                    })
                                }
                            }), o.a.createElement("span", A(O, "validation-failure-label"), p), o.a.createElement(Ke, A(O, "validation-failure-clear"))) : null
                        }
                    }]), s
                }(o.a.PureComponent),
                Ot = function(b) {
                    C(s, b);
                    var f = B(s);

                    function s(c) {
                        var p;
                        return d(this, s), (p = f.call(this, c)).rjvId = Date.now().toString(), p.getListeners = function() {
                            return {
                                reset: p.resetState,
                                "variable-update": p.updateSrc,
                                "add-key-request": p.addKeyRequest
                            }
                        }, p.updateSrc = function() {
                            var _, O = pe.get(p.rjvId, "action", "variable-update"),
                                E = O.name,
                                v = O.namespace,
                                P = O.new_value,
                                K = O.existing_value,
                                ne = (O.variable_removed, O.updated_src),
                                se = O.type,
                                ue = p.props,
                                ee = ue.onEdit,
                                de = ue.onDelete,
                                we = ue.onAdd,
                                G = {
                                    existing_src: p.state.src,
                                    new_value: P,
                                    updated_src: ne,
                                    name: E,
                                    namespace: v,
                                    existing_value: K
                                };
                            switch (se) {
                                case "variable-added":
                                    _ = we(G);
                                    break;
                                case "variable-edited":
                                    _ = ee(G);
                                    break;
                                case "variable-removed":
                                    _ = de(G)
                            }
                            _ !== !1 ? (pe.set(p.rjvId, "global", "src", ne), p.setState({
                                src: ne
                            })) : p.setState({
                                validationFailure: !0
                            })
                        }, p.addKeyRequest = function() {
                            p.setState({
                                addKeyRequest: !0
                            })
                        }, p.resetState = function() {
                            p.setState({
                                validationFailure: !1,
                                addKeyRequest: !1
                            })
                        }, p.state = {
                            addKeyRequest: !1,
                            editKeyRequest: !1,
                            validationFailure: !1,
                            src: s.defaultProps.src,
                            name: s.defaultProps.name,
                            theme: s.defaultProps.theme,
                            validationMessage: s.defaultProps.validationMessage,
                            prevSrc: s.defaultProps.src,
                            prevName: s.defaultProps.name,
                            prevTheme: s.defaultProps.theme
                        }, p
                    }
                    return y(s, [{
                        key: "componentDidMount",
                        value: function() {
                            pe.set(this.rjvId, "global", "src", this.state.src);
                            var c = this.getListeners();
                            for (var p in c) pe.on(p + "-" + this.rjvId, c[p]);
                            this.setState({
                                addKeyRequest: !1,
                                editKeyRequest: !1
                            })
                        }
                    }, {
                        key: "componentDidUpdate",
                        value: function(c, p) {
                            p.addKeyRequest !== !1 && this.setState({
                                addKeyRequest: !1
                            }), p.editKeyRequest !== !1 && this.setState({
                                editKeyRequest: !1
                            }), c.src !== this.state.src && pe.set(this.rjvId, "global", "src", this.state.src)
                        }
                    }, {
                        key: "componentWillUnmount",
                        value: function() {
                            var c = this.getListeners();
                            for (var p in c) pe.removeListener(p + "-" + this.rjvId, c[p])
                        }
                    }, {
                        key: "render",
                        value: function() {
                            var c = this.state,
                                p = c.validationFailure,
                                _ = c.validationMessage,
                                O = c.addKeyRequest,
                                E = c.theme,
                                v = c.src,
                                P = c.name,
                                K = this.props,
                                ne = K.style,
                                se = K.defaultValue;
                            return o.a.createElement("div", {
                                className: "react-json-view",
                                style: l(l({}, A(E, "app-container").style), ne)
                            }, o.a.createElement(Rr, {
                                message: _,
                                active: p,
                                theme: E,
                                rjvId: this.rjvId
                            }), o.a.createElement(Fr, Object.assign({}, this.props, {
                                src: v,
                                name: P,
                                theme: E,
                                type: N(v),
                                rjvId: this.rjvId
                            })), o.a.createElement(Pr, {
                                active: O,
                                theme: E,
                                rjvId: this.rjvId,
                                defaultValue: se
                            }))
                        }
                    }], [{
                        key: "getDerivedStateFromProps",
                        value: function(c, p) {
                            if (c.src !== p.prevSrc || c.name !== p.prevName || c.theme !== p.prevTheme) {
                                var _ = {
                                    src: c.src,
                                    name: c.name,
                                    theme: c.theme,
                                    validationMessage: c.validationMessage,
                                    prevSrc: c.src,
                                    prevName: c.name,
                                    prevTheme: c.theme
                                };
                                return s.validateState(_)
                            }
                            return null
                        }
                    }]), s
                }(o.a.PureComponent);
            Ot.defaultProps = {
                src: {},
                name: "root",
                theme: "rjv-default",
                collapsed: !1,
                collapseStringsAfterLength: !1,
                shouldCollapse: !1,
                sortKeys: !1,
                quotesOnKeys: !0,
                groupArraysAfterLength: 100,
                indentWidth: 4,
                enableClipboard: !0,
                displayObjectSize: !0,
                displayDataTypes: !0,
                onEdit: !1,
                onDelete: !1,
                onAdd: !1,
                onSelect: !1,
                iconStyle: "triangle",
                style: {},
                validationMessage: "Validation Error",
                defaultValue: null,
                displayArrayKey: !0
            }, Ot.validateState = function(b) {
                var f = {};
                return N(b.theme) !== "object" || function(s) {
                    var c = ["base00", "base01", "base02", "base03", "base04", "base05", "base06", "base07", "base08", "base09", "base0A", "base0B", "base0C", "base0D", "base0E", "base0F"];
                    if (N(s) === "object") {
                        for (var p = 0; p < c.length; p++)
                            if (!(c[p] in s)) return !1;
                        return !0
                    }
                    return !1
                }(b.theme) || (console.error("react-json-view error:", "theme prop must be a theme name or valid base-16 theme object.", 'defaulting to "rjv-default" theme'), f.theme = "rjv-default"), N(b.src) !== "object" && N(b.src) !== "array" && (console.error("react-json-view error:", "src property must be a valid json object"), f.name = "ERROR", f.src = {
                    message: "src property must be a valid json object"
                }), l(l({}, b), f)
            }, $(Ot), t.default = Ot
        }])
    })
})(Ar);
var lo = Ar.exports;
const uo = Ir(lo);

function po(a) {
    const n = a.label === "highlighted" ? "annotated" : "clean";
    return `screenshot-${a.id}-${n}.png`
}

function Zt(a) {
    try {
        const n = document.createElement("a");
        n.href = a.dataUrl, n.download = po(a), document.body.appendChild(n), n.click(), document.body.removeChild(n)
    } catch (n) {
        console.error("Failed to download screenshot", n)
    }
}

function bo(a) {
    a.forEach((n, h) => {
        setTimeout(() => {
            Zt(n)
        }, h * 150)
    })
}

function fo({
    runLogs: a,
    maxLogs: n = 50
}) {
    const h = Object.values(a).sort((r, t) => t.startedAt - r.startedAt).slice(0, n);
    return h.length === 0 ? g.jsx("p", {
        className: "text-sm text-white/75",
        children: "No run logs available"
    }) : g.jsx("div", {
        className: "flex flex-col gap-3",
        children: h.map(r => g.jsx(ho, {
            runLog: r
        }, r.runId))
    })
}

function ho({
    runLog: a
}) {
    const h = {
        running: {
            bg: "bg-[#5a63ed]/20",
            text: "text-[#8c92ff]"
        },
        completed: {
            bg: "bg-[#2ecc71]/20",
            text: "text-[#2ecc71]"
        },
        error: {
            bg: "bg-[#e74c3c]/20",
            text: "text-[#ff958a]"
        },
        stopped: {
            bg: "bg-[#f1c40f]/20",
            text: "text-[#f1c40f]"
        }
    } [a.status];
    return g.jsxs("div", {
        className: "border border-white/6 rounded-[10px] p-3 bg-white/[0.03]",
        children: [g.jsxs("div", {
            className: "flex justify-between items-center mb-2",
            children: [g.jsx("strong", {
                className: "text-white",
                children: a.scenarioName
            }), g.jsx("span", {
                className: `text-xs px-2 py-0.5 rounded-full ${h.bg} ${h.text}`,
                children: a.status.toUpperCase()
            })]
        }), g.jsx("ol", {
            className: "list-none p-0 m-0 flex flex-col gap-2",
            children: a.steps.map((r, t) => g.jsx(mo, {
                step: r,
                index: t
            }, `${a.runId}-step-${t}`))
        }), a.logs && a.logs.length > 0 && g.jsxs("details", {
            className: "mt-3 text-xs",
            children: [g.jsxs("summary", {
                className: "cursor-pointer text-[#8c92ff] font-semibold",
                children: ["Event logs (", a.logs.length, ")"]
            }), g.jsx("div", {
                className: "mt-2 space-y-1",
                children: a.logs.map((r, t) => g.jsx(_o, {
                    log: r
                }, `${a.runId}-log-${t}`))
            })]
        })]
    })
}

function mo({
    step: a,
    index: n
}) {
    const h = {
            pending: "border-white/4",
            success: "border-[#2ecc71]/25",
            error: "border-[#e74c3c]/25"
        },
        r = a.action.type === "browser_view",
        t = !!a.artifacts,
        e = r && !t && !a.error && a.status === "success";
    return g.jsxs("li", {
        className: `p-2 rounded-lg bg-white/[0.02] border ${h[a.status]}`,
        children: [g.jsxs("div", {
            className: "font-semibold text-white text-sm",
            children: [n + 1, ". ", a.action.description]
        }), a.message && g.jsx("div", {
            className: "mt-1 text-xs text-white/75",
            children: a.message
        }), a.error && g.jsx("div", {
            className: "mt-1 text-xs text-[#ff958a]",
            children: a.error
        }), e && g.jsx("div", {
            className: "mt-2 text-xs text-[#f1c40f] bg-[#f1c40f]/10 border border-[#f1c40f]/25 rounded px-2 py-1",
            children: "⚠️ Artifacts not available (page content was not captured)"
        }), a.artifacts && g.jsx(yo, {
            artifacts: a.artifacts
        })]
    })
}

function yo({
    artifacts: a
}) {
    var t;
    if (!a) return null;
    const n = a.textContent.length,
        h = a.markdownContent.length,
        r = (t = a.metadata) == null ? void 0 : t.highlightCount;
    return g.jsxs("div", {
        className: "mt-2 p-2 rounded-lg bg-[#5a63ed]/8 border border-[#5a63ed]/20 flex flex-col gap-2",
        children: [g.jsxs("div", {
            className: "text-xs text-white/75",
            children: ["Plain text ", n, " chars · Markdown ", h, " chars", typeof r == "number" && ` · ${r} highlighted elements`]
        }), g.jsx("div", {
            className: "text-xs leading-relaxed text-white/85 bg-[#0f111a]/50 rounded-md p-2 border border-white/8",
            children: a.markdownContent.length > 280 ? `${a.markdownContent.slice(0,280)}…` : a.markdownContent
        }), g.jsxs("details", {
            className: "text-xs",
            children: [g.jsx("summary", {
                className: "cursor-pointer text-[#8c92ff]",
                children: "Show extracted plain text"
            }), g.jsx("pre", {
                className: "mt-1.5 max-h-[200px] overflow-auto p-2 bg-[#0f111a]/85 rounded-md border border-white/8 whitespace-pre-wrap break-words text-white/90",
                children: a.textContent
            })]
        }), g.jsxs("details", {
            className: "text-xs",
            children: [g.jsx("summary", {
                className: "cursor-pointer text-[#8c92ff]",
                children: "Show extracted markdown"
            }), g.jsx("pre", {
                className: "mt-1.5 max-h-[200px] overflow-auto p-2 bg-[#0f111a]/85 rounded-md border border-white/8 whitespace-pre-wrap break-words text-white/90",
                children: a.markdownContent
            })]
        }), a.screenshots && a.screenshots.length > 0 && g.jsxs("div", {
            className: "flex flex-col gap-2",
            children: [a.screenshots.length > 1 && g.jsx("div", {
                className: "flex justify-end",
                children: g.jsxs("button", {
                    type: "button",
                    onClick: () => bo(a.screenshots),
                    className: "clickable flex items-center gap-1 px-2 py-1 text-xs text-[#8c92ff] bg-[#5a63ed]/10 border border-[#5a63ed]/30 rounded-md transition-all hover:bg-[#5a63ed]/20 hover:border-[#5a63ed]/50",
                    children: [g.jsxs("svg", {
                        className: "w-3.5 h-3.5",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2",
                        "aria-hidden": "true",
                        children: [g.jsx("path", {
                            d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                        }), g.jsx("polyline", {
                            points: "7 10 12 15 17 10"
                        }), g.jsx("line", {
                            x1: "12",
                            y1: "15",
                            x2: "12",
                            y2: "3"
                        })]
                    }), "Download All"]
                })
            }), g.jsx("div", {
                className: "flex gap-3 flex-wrap",
                children: a.screenshots.map(e => g.jsx(vo, {
                    screenshot: e
                }, e.id))
            })]
        })]
    })
}

function vo({
    screenshot: a
}) {
    const [n, h] = Re.useState(!1), r = () => {
        h(!0)
    }, t = u => {
        u.stopPropagation(), Zt(a)
    }, e = () => {
        h(!1)
    }, i = a.label === "highlighted" ? "Annotated" : "Clean";
    return g.jsxs(g.Fragment, {
        children: [g.jsxs("div", {
            className: "group relative bg-[#0f111a]/90 rounded-lg p-1 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg",
            title: `${i} screenshot - Click to preview`,
            children: [g.jsx("button", {
                type: "button",
                onClick: r,
                className: "clickable block border-none bg-transparent p-0 cursor-pointer",
                children: g.jsx("img", {
                    src: a.dataUrl,
                    alt: `${a.label} screenshot`,
                    className: "block w-[140px] h-auto rounded-md"
                })
            }), g.jsx("span", {
                className: "absolute left-2 bottom-2 px-1 py-1 text-[11px] rounded-full bg-[#0f111a]/85 text-white border border-white/20 pointer-events-none",
                children: i
            }), g.jsx("div", {
                className: "absolute inset-1 rounded-md bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none",
                children: g.jsx(Lr, {
                    className: "w-6 h-6 text-white/90"
                })
            }), g.jsx("button", {
                type: "button",
                onClick: t,
                className: "clickable absolute top-2 right-2 p-1 rounded bg-[#0f111a]/80 border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#5a63ed]/80 hover:border-[#5a63ed]/50",
                title: `Download ${i.toLowerCase()} screenshot`,
                children: g.jsx(_r, {
                    className: "w-3.5 h-3.5 text-white"
                })
            })]
        }), n && g.jsx(go, {
            screenshot: a,
            onClose: e
        })]
    })
}

function go({
    screenshot: a,
    onClose: n
}) {
    const h = a.label === "highlighted" ? "Annotated" : "Clean",
        r = i => {
            i.target === i.currentTarget && n()
        },
        t = i => {
            i.key === "Escape" && n()
        },
        e = () => {
            Zt(a)
        };
    return g.jsx("div", {
        className: "fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-4",
        onClick: r,
        onKeyDown: t,
        role: "dialog",
        "aria-modal": "true",
        "aria-label": `${h} screenshot preview`,
        tabIndex: -1,
        ref: i => i == null ? void 0 : i.focus(),
        children: g.jsxs("div", {
            className: "relative max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-3",
            children: [g.jsxs("div", {
                className: "flex items-center justify-between w-full px-2",
                children: [g.jsxs("span", {
                    className: "text-white/80 text-sm",
                    children: [h, " Screenshot"]
                }), g.jsxs("div", {
                    className: "flex items-center gap-2",
                    children: [g.jsxs("button", {
                        type: "button",
                        onClick: e,
                        className: "clickable flex items-center gap-1 px-2 py-1 text-xs text-white bg-[#5a63ed]/80 border border-[#5a63ed]/50 rounded-md transition-all hover:bg-[#5a63ed] hover:border-[#5a63ed]",
                        children: [g.jsx(_r, {
                            className: "w-3.5 h-3.5"
                        }), "Download"]
                    }), g.jsx("button", {
                        type: "button",
                        onClick: n,
                        className: "clickable p-1.5 rounded-md bg-white/10 border border-white/20 transition-all hover:bg-white/20 hover:border-white/30",
                        "aria-label": "Close preview",
                        children: g.jsx(Yr, {
                            className: "w-4 h-4 text-white"
                        })
                    })]
                })]
            }), g.jsx("img", {
                src: a.dataUrl,
                alt: `${a.label} screenshot`,
                className: "max-w-full max-h-[calc(90vh-60px)] object-contain rounded-lg shadow-2xl"
            })]
        })
    })
}

function _o({
    log: a
}) {
    const n = a.direction === "downstream" ? "text-[#3498db]" : "text-[#2ecc71]",
        h = new Date(a.timestamp).toLocaleTimeString(),
        r = a.payload && Object.keys(a.payload).length > 0;
    return g.jsxs("div", {
        className: "flex flex-col gap-1.5",
        children: [g.jsxs("div", {
            className: "flex items-start gap-2 p-1.5 bg-white/2 rounded",
            children: [g.jsx("span", {
                className: `text-xs font-mono ${n}`,
                children: a.direction === "downstream" ? "⬇" : "⬆"
            }), g.jsx("span", {
                className: "text-xs text-white/50 font-mono",
                children: h
            }), g.jsx("span", {
                className: "text-xs text-white/75 font-semibold flex-1",
                children: a.type
            })]
        }), r && g.jsxs("details", {
            className: "ml-6 text-xs",
            children: [g.jsx("summary", {
                className: "cursor-pointer text-[#8c92ff] hover:text-[#a5abff]",
                children: "Show payload"
            }), g.jsx("div", {
                className: "mt-1.5 p-2 bg-[#0f111a]/85 rounded-md border border-white/8 max-h-[300px] overflow-auto",
                children: g.jsx(uo, {
                    src: a.payload,
                    theme: "monokai",
                    collapsed: !1,
                    displayDataTypes: !1,
                    displayObjectSize: !0,
                    enableClipboard: !0,
                    name: !1,
                    iconStyle: "triangle",
                    style: {
                        background: "transparent",
                        fontSize: "11px"
                    }
                })
            })]
        })]
    })
}
const wo = Et(function() {
        return g.jsx(fo, {
            runLogs: fe.runLogs,
            maxLogs: 50
        })
    }),
    xo = [{
        id: "action",
        label: "Browser Actions"
    }, {
        id: "automation",
        label: "Automation Test"
    }, {
        id: "log",
        label: "Logs"
    }],
    ko = Et(function() {
        const n = fe,
            h = _t;
        return Re.useEffect(() => {
            const r = new qr;
            r.registerMiddleware(new Kr);
            const t = Ut.getInstance();
            return r.batchRegisterHandler(["automation/progress", "automation/summary", "automation/event-log"], t), t.on("automation/progress", e => h.handleProgress(e)), t.on("automation/summary", e => h.handleSummary(e)), t.on("automation/event-log", e => h.handleEventLog(e)), r.attach(), () => r.detach()
        }, [h]), Re.useEffect(() => (h.initialize(), () => h.dispose()), [h]), g.jsxs("div", {
            className: "flex flex-col h-full",
            children: [g.jsx(to, {}), g.jsx("nav", {
                className: "flex gap-2 px-4 pt-3",
                children: xo.map(r => g.jsx("button", {
                    type: "button",
                    onClick: () => n.setView(r.id),
                    className: `flex-1 px-3 py-2 border border-white/12 rounded-t-lg bg-transparent text-white cursor-pointer transition-all ${n.view===r.id?"bg-[#5a63ed]/15 border-b-transparent":"hover:bg-white/6"}`,
                    children: r.label
                }, r.id))
            }), g.jsx("main", {
                className: "flex-1 overflow-y-auto p-4 bg-white/2",
                children: n.view === "log" ? g.jsx(wo, {}) : n.view === "action" ? g.jsx(ao, {}) : g.jsx(co, {})
            })]
        })
    }),
    yr = document.getElementById("root");
yr && Jr(yr).render(g.jsx(ko, {}));