import {
    g as jr,
    l as Y,
    c as xr
} from "./sendMessage.js";
class Mr {
    constructor(r, n) {
        this.requestId = jr(), this.messageType = r, this.startTime = Date.now(), this.sender = n
    }
    getDuration() {
        return Date.now() - this.startTime
    }
    getSenderInfo() {
        return this.sender.tab ? `tab-${this.sender.tab.id}` : "extension"
    }
}
class Pi {
    constructor() {
        this.handlers = new Map, this.middlewares = []
    }
    registerHandler(r, n) {
        this.handlers.set(r, n)
    }
    batchRegisterHandler(r, n) {
        for (const t of r) this.registerHandler(t, n)
    }
    registerMiddleware(r) {
        this.middlewares.push(r)
    }
    handleMessage(r, n, t) {
        const i = this.extractMessageType(r);
        if (!i) return Y.error("Invalid message: no type field", r), t({
            error: "Invalid message format"
        }), !1;
        if (!this.handlers.has(i)) return !1;
        const s = new Mr(i, n);
        return this.processMessage(r, n, s).then(o => {
            t(o)
        }).catch(o => {
            Y.error(`Error handling ${i}:`, o), t({
                error: o.message
            })
        }), !0
    }
    async processMessage(r, n, t) {
        const i = this.handlers.get(t.messageType);
        if (!i) throw new Error(`No handler registered for ${t.messageType}`);
        return this.executeMiddlewareChain(r, n, t, i)
    }
    async executeMiddlewareChain(r, n, t, i) {
        let s = 0;
        const o = async () => s < this.middlewares.length ? this.middlewares[s++].execute(r, n, t, o) : i.handle(r, n, t);
        return o()
    }
    extractMessageType(r) {
        if (!r || typeof r != "object") return null;
        const n = r;
        return typeof n.type == "string" ? n.type : null
    }
    getHandlerCount() {
        return this.handlers.size
    }
    getMiddlewareCount() {
        return this.middlewares.length
    }
    attach() {
        if (this.messageListener) {
            Y.warn("MessageBus already attached, skipping");
            return
        }
        this.messageListener = (r, n, t) => this.handleMessage(r, n, t), chrome.runtime.onMessage.addListener(this.messageListener)
    }
    detach() {
        if (!this.messageListener) {
            Y.warn("MessageBus not attached, nothing to detach");
            return
        }
        chrome.runtime.onMessage.removeListener(this.messageListener), this.messageListener = void 0, Y.info("MessageBus detached from chrome.runtime.onMessage")
    }
    isAttached() {
        return this.messageListener !== void 0
    }
}
class ji {
    async execute(r, n, t, i) {
        Y.info(`[${t.requestId}] Handling ${t.messageType} from ${t.getSenderInfo()}`);
        try {
            const s = await i();
            return Y.info(`[${t.requestId}] Completed ${t.messageType} in ${t.getDuration()}ms`), s
        } catch (s) {
            throw Y.error(`[${t.requestId}] Error in ${t.messageType}:`, s), s
        }
    }
}

function h(e) {
    for (var r = arguments.length, n = new Array(r > 1 ? r - 1 : 0), t = 1; t < r; t++) n[t - 1] = arguments[t];
    throw new Error(typeof e == "number" ? "[MobX] minified error nr: " + e + (n.length ? " " + n.map(String).join(",") : "") + ". Find the full error at: https://github.com/mobxjs/mobx/blob/main/packages/mobx/src/errors.ts" : "[MobX] " + e)
}
var Cr = {};

function Fe() {
    return typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : Cr
}
var Vt = Object.assign,
    De = Object.getOwnPropertyDescriptor,
    V = Object.defineProperty,
    Ge = Object.prototype,
    rt = [];
Object.freeze(rt);
var It = {};
Object.freeze(It);
var Dr = typeof Proxy < "u",
    Nr = Object.toString();

function Ut() {
    Dr || h("Proxy not available")
}

function $t(e) {
    var r = !1;
    return function() {
        if (!r) return r = !0, e.apply(this, arguments)
    }
}
var ue = function() {};

function x(e) {
    return typeof e == "function"
}

function Q(e) {
    var r = typeof e;
    switch (r) {
        case "string":
        case "symbol":
        case "number":
            return !0
    }
    return !1
}

function Ke(e) {
    return e !== null && typeof e == "object"
}

function W(e) {
    if (!Ke(e)) return !1;
    var r = Object.getPrototypeOf(e);
    if (r == null) return !0;
    var n = Object.hasOwnProperty.call(r, "constructor") && r.constructor;
    return typeof n == "function" && n.toString() === Nr
}

function Ft(e) {
    var r = e == null ? void 0 : e.constructor;
    return r ? r.name === "GeneratorFunction" || r.displayName === "GeneratorFunction" : !1
}

function qe(e, r, n) {
    V(e, r, {
        enumerable: !1,
        writable: !0,
        configurable: !0,
        value: n
    })
}

function Gt(e, r, n) {
    V(e, r, {
        enumerable: !1,
        writable: !1,
        configurable: !0,
        value: n
    })
}

function ne(e, r) {
    var n = "isMobX" + e;
    return r.prototype[n] = !0,
        function(t) {
            return Ke(t) && t[n] === !0
        }
}

function pe(e) {
    return e != null && Object.prototype.toString.call(e) === "[object Map]"
}

function Rr(e) {
    var r = Object.getPrototypeOf(e),
        n = Object.getPrototypeOf(r),
        t = Object.getPrototypeOf(n);
    return t === null
}

function $(e) {
    return e != null && Object.prototype.toString.call(e) === "[object Set]"
}
var Kt = typeof Object.getOwnPropertySymbols < "u";

function Br(e) {
    var r = Object.keys(e);
    if (!Kt) return r;
    var n = Object.getOwnPropertySymbols(e);
    return n.length ? [].concat(r, n.filter(function(t) {
        return Ge.propertyIsEnumerable.call(e, t)
    })) : r
}
var Ye = typeof Reflect < "u" && Reflect.ownKeys ? Reflect.ownKeys : Kt ? function(e) {
    return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e))
} : Object.getOwnPropertyNames;

function qt(e) {
    return e === null ? null : typeof e == "object" ? "" + e : e
}

function G(e, r) {
    return Ge.hasOwnProperty.call(e, r)
}
var Lr = Object.getOwnPropertyDescriptors || function(r) {
    var n = {};
    return Ye(r).forEach(function(t) {
        n[t] = De(r, t)
    }), n
};

function m(e, r) {
    return !!(e & r)
}

function k(e, r, n) {
    return n ? e |= r : e &= ~r, e
}

function kt(e, r) {
    (r == null || r > e.length) && (r = e.length);
    for (var n = 0, t = Array(r); n < r; n++) t[n] = e[n];
    return t
}

function Vr(e, r) {
    for (var n = 0; n < r.length; n++) {
        var t = r[n];
        t.enumerable = t.enumerable || !1, t.configurable = !0, "value" in t && (t.writable = !0), Object.defineProperty(e, Ur(t.key), t)
    }
}

function he(e, r, n) {
    return r && Vr(e.prototype, r), Object.defineProperty(e, "prototype", {
        writable: !1
    }), e
}

function ce(e, r) {
    var n = typeof Symbol < "u" && e[Symbol.iterator] || e["@@iterator"];
    if (n) return (n = n.call(e)).next.bind(n);
    if (Array.isArray(e) || (n = $r(e)) || r) {
        n && (e = n);
        var t = 0;
        return function() {
            return t >= e.length ? {
                done: !0
            } : {
                done: !1,
                value: e[t++]
            }
        }
    }
    throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
}

function ee() {
    return ee = Object.assign ? Object.assign.bind() : function(e) {
        for (var r = 1; r < arguments.length; r++) {
            var n = arguments[r];
            for (var t in n)({}).hasOwnProperty.call(n, t) && (e[t] = n[t])
        }
        return e
    }, ee.apply(null, arguments)
}

function Yt(e, r) {
    e.prototype = Object.create(r.prototype), e.prototype.constructor = e, nt(e, r)
}

function nt(e, r) {
    return nt = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(n, t) {
        return n.__proto__ = t, n
    }, nt(e, r)
}

function Ir(e, r) {
    if (typeof e != "object" || !e) return e;
    var n = e[Symbol.toPrimitive];
    if (n !== void 0) {
        var t = n.call(e, r);
        if (typeof t != "object") return t;
        throw new TypeError("@@toPrimitive must return a primitive value.")
    }
    return String(e)
}

function Ur(e) {
    var r = Ir(e, "string");
    return typeof r == "symbol" ? r : r + ""
}

function $r(e, r) {
    if (e) {
        if (typeof e == "string") return kt(e, r);
        var n = {}.toString.call(e).slice(8, -1);
        return n === "Object" && e.constructor && (n = e.constructor.name), n === "Map" || n === "Set" ? Array.from(e) : n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n) ? kt(e, r) : void 0
    }
}
var L = Symbol("mobx-stored-annotations");

function I(e) {
    function r(n, t) {
        if (ke(t)) return e.decorate_20223_(n, t);
        me(n, t, e)
    }
    return Object.assign(r, e)
}

function me(e, r, n) {
    G(e, L) || qe(e, L, ee({}, e[L])), Wr(n) || (e[L][r] = n)
}

function Fr(e) {
    return G(e, L) || qe(e, L, ee({}, e[L])), e[L]
}

function ke(e) {
    return typeof e == "object" && typeof e.kind == "string"
}
var f = Symbol("mobx administration"),
    X = function() {
        function e(n) {
            n === void 0 && (n = "Atom"), this.name_ = void 0, this.flags_ = 0, this.observers_ = new Set, this.lastAccessedBy_ = 0, this.lowestObserverState_ = d.NOT_TRACKING_, this.onBOL = void 0, this.onBUOL = void 0, this.name_ = n
        }
        var r = e.prototype;
        return r.onBO = function() {
            this.onBOL && this.onBOL.forEach(function(t) {
                return t()
            })
        }, r.onBUO = function() {
            this.onBUOL && this.onBUOL.forEach(function(t) {
                return t()
            })
        }, r.reportObserved = function() {
            return cr(this)
        }, r.reportChanged = function() {
            E(), lr(this), T()
        }, r.toString = function() {
            return this.name_
        }, he(e, [{
            key: "isBeingObserved",
            get: function() {
                return m(this.flags_, e.isBeingObservedMask_)
            },
            set: function(t) {
                this.flags_ = k(this.flags_, e.isBeingObservedMask_, t)
            }
        }, {
            key: "isPendingUnobservation",
            get: function() {
                return m(this.flags_, e.isPendingUnobservationMask_)
            },
            set: function(t) {
                this.flags_ = k(this.flags_, e.isPendingUnobservationMask_, t)
            }
        }, {
            key: "diffValue",
            get: function() {
                return m(this.flags_, e.diffValueMask_) ? 1 : 0
            },
            set: function(t) {
                this.flags_ = k(this.flags_, e.diffValueMask_, t === 1)
            }
        }])
    }();
X.isBeingObservedMask_ = 1;
X.isPendingUnobservationMask_ = 2;
X.diffValueMask_ = 4;
var pt = ne("Atom", X);

function Ht(e, r, n) {
    r === void 0 && (r = ue), n === void 0 && (n = ue);
    var t = new X(e);
    return r !== ue && Jn(t, r), n !== ue && vr(t, n), t
}

function Gr(e, r) {
    return Pr(e, r)
}

function Kr(e, r) {
    return Object.is ? Object.is(e, r) : e === r ? e !== 0 || 1 / e === 1 / r : e !== e && r !== r
}
var Ne = {
    structural: Gr,
    default: Kr
};

function te(e, r, n) {
    return wr(e) ? e : Array.isArray(e) ? y.array(e, {
        name: n
    }) : W(e) ? y.object(e, void 0, {
        name: n
    }) : pe(e) ? y.map(e, {
        name: n
    }) : $(e) ? y.set(e, {
        name: n
    }) : typeof e == "function" && !_e(e) && !we(e) ? Ft(e) ? fe(e) : ge(n, e) : e
}

function qr(e, r, n) {
    if (e == null || Ze(e) || Je(e) || se(e) || B(e)) return e;
    if (Array.isArray(e)) return y.array(e, {
        name: n,
        deep: !1
    });
    if (W(e)) return y.object(e, void 0, {
        name: n,
        deep: !1
    });
    if (pe(e)) return y.map(e, {
        name: n,
        deep: !1
    });
    if ($(e)) return y.set(e, {
        name: n,
        deep: !1
    })
}

function He(e) {
    return e
}

function Yr(e, r) {
    return Pr(e, r) ? r : e
}
var Hr = "override";

function Wr(e) {
    return e.annotationType_ === Hr
}

function Oe(e, r) {
    return {
        annotationType_: e,
        options_: r,
        make_: zr,
        extend_: Xr,
        decorate_20223_: Jr
    }
}

function zr(e, r, n, t) {
    var i;
    if ((i = this.options_) != null && i.bound) return this.extend_(e, r, n, !1) === null ? 0 : 1;
    if (t === e.target_) return this.extend_(e, r, n, !1) === null ? 0 : 2;
    if (_e(n.value)) return 1;
    var s = Wt(e, this, r, n, !1);
    return V(t, r, s), 2
}

function Xr(e, r, n, t) {
    var i = Wt(e, this, r, n);
    return e.defineProperty_(r, i, t)
}

function Jr(e, r) {
    var n = r.kind,
        t = r.name,
        i = r.addInitializer,
        s = this,
        o = function(c) {
            var _, p, v, g;
            return re((_ = (p = s.options_) == null ? void 0 : p.name) != null ? _ : t.toString(), c, (v = (g = s.options_) == null ? void 0 : g.autoAction) != null ? v : !1)
        };
    if (n == "field") return function(u) {
        var c, _ = u;
        return _e(_) || (_ = o(_)), (c = s.options_) != null && c.bound && (_ = _.bind(this), _.isMobxAction = !0), _
    };
    if (n == "method") {
        var a;
        return _e(e) || (e = o(e)), (a = this.options_) != null && a.bound && i(function() {
            var u = this,
                c = u[t].bind(u);
            c.isMobxAction = !0, u[t] = c
        }), e
    }
    h("Cannot apply '" + s.annotationType_ + "' to '" + String(t) + "' (kind: " + n + "):" + (`
'` + s.annotationType_ + "' can only be used on properties with a function value."))
}

function Zr(e, r, n, t) {
    r.annotationType_, t.value
}

function Wt(e, r, n, t, i) {
    var s, o, a, u, c, _, p;
    i === void 0 && (i = l.safeDescriptors), Zr(e, r, n, t);
    var v = t.value;
    if ((s = r.options_) != null && s.bound) {
        var g;
        v = v.bind((g = e.proxy_) != null ? g : e.target_)
    }
    return {
        value: re((o = (a = r.options_) == null ? void 0 : a.name) != null ? o : n.toString(), v, (u = (c = r.options_) == null ? void 0 : c.autoAction) != null ? u : !1, (_ = r.options_) != null && _.bound ? (p = e.proxy_) != null ? p : e.target_ : void 0),
        configurable: i ? e.isPlainObject_ : !0,
        enumerable: !1,
        writable: !i
    }
}

function zt(e, r) {
    return {
        annotationType_: e,
        options_: r,
        make_: Qr,
        extend_: en,
        decorate_20223_: tn
    }
}

function Qr(e, r, n, t) {
    var i;
    if (t === e.target_) return this.extend_(e, r, n, !1) === null ? 0 : 2;
    if ((i = this.options_) != null && i.bound && (!G(e.target_, r) || !we(e.target_[r])) && this.extend_(e, r, n, !1) === null) return 0;
    if (we(n.value)) return 1;
    var s = Xt(e, this, r, n, !1, !1);
    return V(t, r, s), 2
}

function en(e, r, n, t) {
    var i, s = Xt(e, this, r, n, (i = this.options_) == null ? void 0 : i.bound);
    return e.defineProperty_(r, s, t)
}

function tn(e, r) {
    var n, t = r.name,
        i = r.addInitializer;
    return we(e) || (e = fe(e)), (n = this.options_) != null && n.bound && i(function() {
        var s = this,
            o = s[t].bind(s);
        o.isMobXFlow = !0, s[t] = o
    }), e
}

function rn(e, r, n, t) {
    r.annotationType_, t.value
}

function Xt(e, r, n, t, i, s) {
    s === void 0 && (s = l.safeDescriptors), rn(e, r, n, t);
    var o = t.value;
    if (we(o) || (o = fe(o)), i) {
        var a;
        o = o.bind((a = e.proxy_) != null ? a : e.target_), o.isMobXFlow = !0
    }
    return {
        value: o,
        configurable: s ? e.isPlainObject_ : !0,
        enumerable: !1,
        writable: !s
    }
}

function ht(e, r) {
    return {
        annotationType_: e,
        options_: r,
        make_: nn,
        extend_: sn,
        decorate_20223_: on
    }
}

function nn(e, r, n) {
    return this.extend_(e, r, n, !1) === null ? 0 : 1
}

function sn(e, r, n, t) {
    return an(e, this, r, n), e.defineComputedProperty_(r, ee({}, this.options_, {
        get: n.get,
        set: n.set
    }), t)
}

function on(e, r) {
    var n = this,
        t = r.name,
        i = r.addInitializer;
    return i(function() {
            var s = de(this)[f],
                o = ee({}, n.options_, {
                    get: e,
                    context: this
                });
            o.name || (o.name = "ObservableObject." + t.toString()), s.values_.set(t, new M(o))
        }),
        function() {
            return this[f].getObservablePropValue_(t)
        }
}

function an(e, r, n, t) {
    r.annotationType_, t.get
}

function We(e, r) {
    return {
        annotationType_: e,
        options_: r,
        make_: un,
        extend_: cn,
        decorate_20223_: ln
    }
}

function un(e, r, n) {
    return this.extend_(e, r, n, !1) === null ? 0 : 1
}

function cn(e, r, n, t) {
    var i, s;
    return _n(e, this), e.defineObservableProperty_(r, n.value, (i = (s = this.options_) == null ? void 0 : s.enhancer) != null ? i : te, t)
}

function ln(e, r) {
    var n = this,
        t = r.kind,
        i = r.name,
        s = new WeakSet;

    function o(a, u) {
        var c, _, p = de(a)[f],
            v = new Z(u, (c = (_ = n.options_) == null ? void 0 : _.enhancer) != null ? c : te, "ObservableObject." + i.toString(), !1);
        p.values_.set(i, v), s.add(a)
    }
    if (t == "accessor") return {
        get: function() {
            return s.has(this) || o(this, e.get.call(this)), this[f].getObservablePropValue_(i)
        },
        set: function(u) {
            return s.has(this) || o(this, u), this[f].setObservablePropValue_(i, u)
        },
        init: function(u) {
            return s.has(this) || o(this, u), u
        }
    }
}

function _n(e, r, n, t) {
    r.annotationType_
}
var fn = "true",
    pn = Jt();

function Jt(e) {
    return {
        annotationType_: fn,
        options_: e,
        make_: hn,
        extend_: dn,
        decorate_20223_: vn
    }
}

function hn(e, r, n, t) {
    var i, s;
    if (n.get) return ze.make_(e, r, n, t);
    if (n.set) {
        var o = _e(n.set) ? n.set : re(r.toString(), n.set);
        return t === e.target_ ? e.defineProperty_(r, {
            configurable: l.safeDescriptors ? e.isPlainObject_ : !0,
            set: o
        }) === null ? 0 : 2 : (V(t, r, {
            configurable: !0,
            set: o
        }), 2)
    }
    if (t !== e.target_ && typeof n.value == "function") {
        var a;
        if (Ft(n.value)) {
            var u, c = (u = this.options_) != null && u.autoBind ? fe.bound : fe;
            return c.make_(e, r, n, t)
        }
        var _ = (a = this.options_) != null && a.autoBind ? ge.bound : ge;
        return _.make_(e, r, n, t)
    }
    var p = ((i = this.options_) == null ? void 0 : i.deep) === !1 ? y.ref : y;
    if (typeof n.value == "function" && (s = this.options_) != null && s.autoBind) {
        var v;
        n.value = n.value.bind((v = e.proxy_) != null ? v : e.target_)
    }
    return p.make_(e, r, n, t)
}

function dn(e, r, n, t) {
    var i, s;
    if (n.get) return ze.extend_(e, r, n, t);
    if (n.set) return e.defineProperty_(r, {
        configurable: l.safeDescriptors ? e.isPlainObject_ : !0,
        set: re(r.toString(), n.set)
    }, t);
    if (typeof n.value == "function" && (i = this.options_) != null && i.autoBind) {
        var o;
        n.value = n.value.bind((o = e.proxy_) != null ? o : e.target_)
    }
    var a = ((s = this.options_) == null ? void 0 : s.deep) === !1 ? y.ref : y;
    return a.extend_(e, r, n, t)
}

function vn(e, r) {
    h("'" + this.annotationType_ + "' cannot be used as a decorator")
}
var bn = "observable",
    yn = "observable.ref",
    gn = "observable.shallow",
    wn = "observable.struct",
    Zt = {
        deep: !0,
        name: void 0,
        defaultDecorator: void 0,
        proxy: !0
    };
Object.freeze(Zt);

function Te(e) {
    return e || Zt
}
var it = We(bn),
    mn = We(yn, {
        enhancer: He
    }),
    kn = We(gn, {
        enhancer: qr
    }),
    On = We(wn, {
        enhancer: Yr
    }),
    Qt = I(it);

function Pe(e) {
    return e.deep === !0 ? te : e.deep === !1 ? He : Sn(e.defaultDecorator)
}

function An(e) {
    var r;
    return e ? (r = e.defaultDecorator) != null ? r : Jt(e) : void 0
}

function Sn(e) {
    var r, n;
    return e && (r = (n = e.options_) == null ? void 0 : n.enhancer) != null ? r : te
}

function er(e, r, n) {
    if (ke(r)) return it.decorate_20223_(e, r);
    if (Q(r)) {
        me(e, r, it);
        return
    }
    return wr(e) ? e : W(e) ? y.object(e, r, n) : Array.isArray(e) ? y.array(e, r) : pe(e) ? y.map(e, r) : $(e) ? y.set(e, r) : typeof e == "object" && e !== null ? e : y.box(e, r)
}
Vt(er, Qt);
var En = {
        box: function(r, n) {
            var t = Te(n);
            return new Z(r, Pe(t), t.name, !0, t.equals)
        },
        array: function(r, n) {
            var t = Te(n);
            return (l.useProxies === !1 || t.proxy === !1 ? gi : ci)(r, Pe(t), t.name)
        },
        map: function(r, n) {
            var t = Te(n);
            return new kr(r, Pe(t), t.name)
        },
        set: function(r, n) {
            var t = Te(n);
            return new Or(r, Pe(t), t.name)
        },
        object: function(r, n, t) {
            return oe(function() {
                return ei(l.useProxies === !1 || (t == null ? void 0 : t.proxy) === !1 ? de({}, t) : oi({}, t), r, n)
            })
        },
        ref: I(mn),
        shallow: I(kn),
        deep: Qt,
        struct: I(On)
    },
    y = Vt(er, En),
    tr = "computed",
    Tn = "computed.struct",
    st = ht(tr),
    Pn = ht(Tn, {
        equals: Ne.structural
    }),
    ze = function(r, n) {
        if (ke(n)) return st.decorate_20223_(r, n);
        if (Q(n)) return me(r, n, st);
        if (W(r)) return I(ht(tr, r));
        var t = W(n) ? n : {};
        return t.get = r, t.name || (t.name = r.name || ""), new M(t)
    };
Object.assign(ze, st);
ze.struct = I(Pn);
var Ot, At, Re = 0,
    jn = 1,
    xn = (Ot = (At = De(function() {}, "name")) == null ? void 0 : At.configurable) != null ? Ot : !1,
    St = {
        value: "action",
        configurable: !0,
        writable: !1,
        enumerable: !1
    };

function re(e, r, n, t) {
    n === void 0 && (n = !1);

    function i() {
        return rr(e, n, r, t || this, arguments)
    }
    return i.isMobxAction = !0, i.toString = function() {
        return r.toString()
    }, xn && (St.value = e, V(i, "name", St)), i
}

function rr(e, r, n, t, i) {
    var s = Mn(e, r);
    try {
        return n.apply(t, i)
    } catch (o) {
        throw s.error_ = o, o
    } finally {
        Cn(s)
    }
}

function Mn(e, r, n, t) {
    var i = !1,
        s = 0,
        o = l.trackingDerivation,
        a = !r || !o;
    E();
    var u = l.allowStateChanges;
    a && (ie(), u = dt(!0));
    var c = bt(!0),
        _ = {
            runAsAction_: a,
            prevDerivation_: o,
            prevAllowStateChanges_: u,
            prevAllowStateReads_: c,
            notifySpy_: i,
            startTime_: s,
            actionId_: jn++,
            parentActionId_: Re
        };
    return Re = _.actionId_, _
}

function Cn(e) {
    Re !== e.actionId_ && h(30), Re = e.parentActionId_, e.error_ !== void 0 && (l.suppressReactionErrors = !0), vt(e.prevAllowStateChanges_), be(e.prevAllowStateReads_), T(), e.runAsAction_ && K(e.prevDerivation_), l.suppressReactionErrors = !1
}

function dt(e) {
    var r = l.allowStateChanges;
    return l.allowStateChanges = e, r
}

function vt(e) {
    l.allowStateChanges = e
}
var Z = function(e) {
        function r(t, i, s, o, a) {
            var u;
            return s === void 0 && (s = "ObservableValue"), a === void 0 && (a = Ne.default), u = e.call(this, s) || this, u.enhancer = void 0, u.name_ = void 0, u.equals = void 0, u.hasUnreportedChange_ = !1, u.interceptors_ = void 0, u.changeListeners_ = void 0, u.value_ = void 0, u.dehancer = void 0, u.enhancer = i, u.name_ = s, u.equals = a, u.value_ = i(t, void 0, s), u
        }
        Yt(r, e);
        var n = r.prototype;
        return n.dehanceValue = function(i) {
            return this.dehancer !== void 0 ? this.dehancer(i) : i
        }, n.set = function(i) {
            this.value_, i = this.prepareNewValue_(i), i !== l.UNCHANGED && this.setNewValue_(i)
        }, n.prepareNewValue_ = function(i) {
            if (A(this)) {
                var s = S(this, {
                    object: this,
                    type: U,
                    newValue: i
                });
                if (!s) return l.UNCHANGED;
                i = s.newValue
            }
            return i = this.enhancer(i, this.value_, this.name_), this.equals(this.value_, i) ? l.UNCHANGED : i
        }, n.setNewValue_ = function(i) {
            var s = this.value_;
            this.value_ = i, this.reportChanged(), P(this) && j(this, {
                type: U,
                object: this,
                newValue: i,
                oldValue: s
            })
        }, n.get = function() {
            return this.reportObserved(), this.dehanceValue(this.value_)
        }, n.intercept_ = function(i) {
            return Ae(this, i)
        }, n.observe_ = function(i, s) {
            return s && i({
                observableKind: "value",
                debugObjectName: this.name_,
                object: this,
                type: U,
                newValue: this.value_,
                oldValue: void 0
            }), Se(this, i)
        }, n.raw = function() {
            return this.value_
        }, n.toJSON = function() {
            return this.get()
        }, n.toString = function() {
            return this.name_ + "[" + this.value_ + "]"
        }, n.valueOf = function() {
            return qt(this.get())
        }, n[Symbol.toPrimitive] = function() {
            return this.valueOf()
        }, r
    }(X),
    M = function() {
        function e(n) {
            this.dependenciesState_ = d.NOT_TRACKING_, this.observing_ = [], this.newObserving_ = null, this.observers_ = new Set, this.runId_ = 0, this.lastAccessedBy_ = 0, this.lowestObserverState_ = d.UP_TO_DATE_, this.unboundDepsCount_ = 0, this.value_ = new Le(null), this.name_ = void 0, this.triggeredBy_ = void 0, this.flags_ = 0, this.derivation = void 0, this.setter_ = void 0, this.isTracing_ = Be.NONE, this.scope_ = void 0, this.equals_ = void 0, this.requiresReaction_ = void 0, this.keepAlive_ = void 0, this.onBOL = void 0, this.onBUOL = void 0, n.get || h(31), this.derivation = n.get, this.name_ = n.name || "ComputedValue", n.set && (this.setter_ = re("ComputedValue-setter", n.set)), this.equals_ = n.equals || (n.compareStructural || n.struct ? Ne.structural : Ne.default), this.scope_ = n.context, this.requiresReaction_ = n.requiresReaction, this.keepAlive_ = !!n.keepAlive
        }
        var r = e.prototype;
        return r.onBecomeStale_ = function() {
            Ln(this)
        }, r.onBO = function() {
            this.onBOL && this.onBOL.forEach(function(t) {
                return t()
            })
        }, r.onBUO = function() {
            this.onBUOL && this.onBUOL.forEach(function(t) {
                return t()
            })
        }, r.get = function() {
            if (this.isComputing && h(32, this.name_, this.derivation), l.inBatch === 0 && this.observers_.size === 0 && !this.keepAlive_) ot(this) && (this.warnAboutUntrackedRead_(), E(), this.value_ = this.computeValue_(!1), T());
            else if (cr(this), ot(this)) {
                var t = l.trackingContext;
                this.keepAlive_ && !t && (l.trackingContext = this), this.trackAndCompute() && Bn(this), l.trackingContext = t
            }
            var i = this.value_;
            if (xe(i)) throw i.cause;
            return i
        }, r.set = function(t) {
            if (this.setter_) {
                this.isRunningSetter && h(33, this.name_), this.isRunningSetter = !0;
                try {
                    this.setter_.call(this.scope_, t)
                } finally {
                    this.isRunningSetter = !1
                }
            } else h(34, this.name_)
        }, r.trackAndCompute = function() {
            var t = this.value_,
                i = this.dependenciesState_ === d.NOT_TRACKING_,
                s = this.computeValue_(!0),
                o = i || xe(t) || xe(s) || !this.equals_(t, s);
            return o && (this.value_ = s), o
        }, r.computeValue_ = function(t) {
            this.isComputing = !0;
            var i = dt(!1),
                s;
            if (t) s = nr(this, this.derivation, this.scope_);
            else if (l.disableErrorBoundaries === !0) s = this.derivation.call(this.scope_);
            else try {
                s = this.derivation.call(this.scope_)
            } catch (o) {
                s = new Le(o)
            }
            return vt(i), this.isComputing = !1, s
        }, r.suspend_ = function() {
            this.keepAlive_ || (at(this), this.value_ = void 0)
        }, r.observe_ = function(t, i) {
            var s = this,
                o = !0,
                a = void 0;
            return Yn(function() {
                var u = s.get();
                if (!o || i) {
                    var c = ie();
                    t({
                        observableKind: "computed",
                        debugObjectName: s.name_,
                        type: U,
                        object: s,
                        newValue: u,
                        oldValue: a
                    }), K(c)
                }
                o = !1, a = u
            })
        }, r.warnAboutUntrackedRead_ = function() {}, r.toString = function() {
            return this.name_ + "[" + this.derivation.toString() + "]"
        }, r.valueOf = function() {
            return qt(this.get())
        }, r[Symbol.toPrimitive] = function() {
            return this.valueOf()
        }, he(e, [{
            key: "isComputing",
            get: function() {
                return m(this.flags_, e.isComputingMask_)
            },
            set: function(t) {
                this.flags_ = k(this.flags_, e.isComputingMask_, t)
            }
        }, {
            key: "isRunningSetter",
            get: function() {
                return m(this.flags_, e.isRunningSetterMask_)
            },
            set: function(t) {
                this.flags_ = k(this.flags_, e.isRunningSetterMask_, t)
            }
        }, {
            key: "isBeingObserved",
            get: function() {
                return m(this.flags_, e.isBeingObservedMask_)
            },
            set: function(t) {
                this.flags_ = k(this.flags_, e.isBeingObservedMask_, t)
            }
        }, {
            key: "isPendingUnobservation",
            get: function() {
                return m(this.flags_, e.isPendingUnobservationMask_)
            },
            set: function(t) {
                this.flags_ = k(this.flags_, e.isPendingUnobservationMask_, t)
            }
        }, {
            key: "diffValue",
            get: function() {
                return m(this.flags_, e.diffValueMask_) ? 1 : 0
            },
            set: function(t) {
                this.flags_ = k(this.flags_, e.diffValueMask_, t === 1)
            }
        }])
    }();
M.isComputingMask_ = 1;
M.isRunningSetterMask_ = 2;
M.isBeingObservedMask_ = 4;
M.isPendingUnobservationMask_ = 8;
M.diffValueMask_ = 16;
var Xe = ne("ComputedValue", M),
    d;
(function(e) {
    e[e.NOT_TRACKING_ = -1] = "NOT_TRACKING_", e[e.UP_TO_DATE_ = 0] = "UP_TO_DATE_", e[e.POSSIBLY_STALE_ = 1] = "POSSIBLY_STALE_", e[e.STALE_ = 2] = "STALE_"
})(d || (d = {}));
var Be;
(function(e) {
    e[e.NONE = 0] = "NONE", e[e.LOG = 1] = "LOG", e[e.BREAK = 2] = "BREAK"
})(Be || (Be = {}));
var Le = function(r) {
    this.cause = void 0, this.cause = r
};

function xe(e) {
    return e instanceof Le
}

function ot(e) {
    switch (e.dependenciesState_) {
        case d.UP_TO_DATE_:
            return !1;
        case d.NOT_TRACKING_:
        case d.STALE_:
            return !0;
        case d.POSSIBLY_STALE_: {
            for (var r = bt(!0), n = ie(), t = e.observing_, i = t.length, s = 0; s < i; s++) {
                var o = t[s];
                if (Xe(o)) {
                    if (l.disableErrorBoundaries) o.get();
                    else try {
                        o.get()
                    } catch {
                        return K(n), be(r), !0
                    }
                    if (e.dependenciesState_ === d.STALE_) return K(n), be(r), !0
                }
            }
            return sr(e), K(n), be(r), !1
        }
    }
}

function nr(e, r, n) {
    var t = bt(!0);
    sr(e), e.newObserving_ = new Array(e.runId_ === 0 ? 100 : e.observing_.length), e.unboundDepsCount_ = 0, e.runId_ = ++l.runId;
    var i = l.trackingDerivation;
    l.trackingDerivation = e, l.inBatch++;
    var s;
    if (l.disableErrorBoundaries === !0) s = r.call(n);
    else try {
        s = r.call(n)
    } catch (o) {
        s = new Le(o)
    }
    return l.inBatch--, l.trackingDerivation = i, Dn(e), be(t), s
}

function Dn(e) {
    for (var r = e.observing_, n = e.observing_ = e.newObserving_, t = d.UP_TO_DATE_, i = 0, s = e.unboundDepsCount_, o = 0; o < s; o++) {
        var a = n[o];
        a.diffValue === 0 && (a.diffValue = 1, i !== o && (n[i] = a), i++), a.dependenciesState_ > t && (t = a.dependenciesState_)
    }
    for (n.length = i, e.newObserving_ = null, s = r.length; s--;) {
        var u = r[s];
        u.diffValue === 0 && ar(u, e), u.diffValue = 0
    }
    for (; i--;) {
        var c = n[i];
        c.diffValue === 1 && (c.diffValue = 0, Rn(c, e))
    }
    t !== d.UP_TO_DATE_ && (e.dependenciesState_ = t, e.onBecomeStale_())
}

function at(e) {
    var r = e.observing_;
    e.observing_ = [];
    for (var n = r.length; n--;) ar(r[n], e);
    e.dependenciesState_ = d.NOT_TRACKING_
}

function ir(e) {
    var r = ie();
    try {
        return e()
    } finally {
        K(r)
    }
}

function ie() {
    var e = l.trackingDerivation;
    return l.trackingDerivation = null, e
}

function K(e) {
    l.trackingDerivation = e
}

function bt(e) {
    var r = l.allowStateReads;
    return l.allowStateReads = e, r
}

function be(e) {
    l.allowStateReads = e
}

function sr(e) {
    if (e.dependenciesState_ !== d.UP_TO_DATE_) {
        e.dependenciesState_ = d.UP_TO_DATE_;
        for (var r = e.observing_, n = r.length; n--;) r[n].lowestObserverState_ = d.UP_TO_DATE_
    }
}
var Me = function() {
        this.version = 6, this.UNCHANGED = {}, this.trackingDerivation = null, this.trackingContext = null, this.runId = 0, this.mobxGuid = 0, this.inBatch = 0, this.pendingUnobservations = [], this.pendingReactions = [], this.isRunningReactions = !1, this.allowStateChanges = !1, this.allowStateReads = !0, this.enforceActions = !0, this.spyListeners = [], this.globalReactionErrorHandlers = [], this.computedRequiresReaction = !1, this.reactionRequiresObservable = !1, this.observableRequiresReaction = !1, this.disableErrorBoundaries = !1, this.suppressReactionErrors = !1, this.useProxies = !0, this.verifyProxies = !1, this.safeDescriptors = !0
    },
    Ce = !0,
    or = !1,
    l = function() {
        var e = Fe();
        return e.__mobxInstanceCount > 0 && !e.__mobxGlobals && (Ce = !1), e.__mobxGlobals && e.__mobxGlobals.version !== new Me().version && (Ce = !1), Ce ? e.__mobxGlobals ? (e.__mobxInstanceCount += 1, e.__mobxGlobals.UNCHANGED || (e.__mobxGlobals.UNCHANGED = {}), e.__mobxGlobals) : (e.__mobxInstanceCount = 1, e.__mobxGlobals = new Me) : (setTimeout(function() {
            or || h(35)
        }, 1), new Me)
    }();

function Nn() {
    if ((l.pendingReactions.length || l.inBatch || l.isRunningReactions) && h(36), or = !0, Ce) {
        var e = Fe();
        --e.__mobxInstanceCount === 0 && (e.__mobxGlobals = void 0), l = new Me
    }
}

function Rn(e, r) {
    e.observers_.add(r), e.lowestObserverState_ > r.dependenciesState_ && (e.lowestObserverState_ = r.dependenciesState_)
}

function ar(e, r) {
    e.observers_.delete(r), e.observers_.size === 0 && ur(e)
}

function ur(e) {
    e.isPendingUnobservation === !1 && (e.isPendingUnobservation = !0, l.pendingUnobservations.push(e))
}

function E() {
    l.inBatch++
}

function T() {
    if (--l.inBatch === 0) {
        _r();
        for (var e = l.pendingUnobservations, r = 0; r < e.length; r++) {
            var n = e[r];
            n.isPendingUnobservation = !1, n.observers_.size === 0 && (n.isBeingObserved && (n.isBeingObserved = !1, n.onBUO()), n instanceof M && n.suspend_())
        }
        l.pendingUnobservations = []
    }
}

function cr(e) {
    var r = l.trackingDerivation;
    return r !== null ? (r.runId_ !== e.lastAccessedBy_ && (e.lastAccessedBy_ = r.runId_, r.newObserving_[r.unboundDepsCount_++] = e, !e.isBeingObserved && l.trackingContext && (e.isBeingObserved = !0, e.onBO())), e.isBeingObserved) : (e.observers_.size === 0 && l.inBatch > 0 && ur(e), !1)
}

function lr(e) {
    e.lowestObserverState_ !== d.STALE_ && (e.lowestObserverState_ = d.STALE_, e.observers_.forEach(function(r) {
        r.dependenciesState_ === d.UP_TO_DATE_ && r.onBecomeStale_(), r.dependenciesState_ = d.STALE_
    }))
}

function Bn(e) {
    e.lowestObserverState_ !== d.STALE_ && (e.lowestObserverState_ = d.STALE_, e.observers_.forEach(function(r) {
        r.dependenciesState_ === d.POSSIBLY_STALE_ ? r.dependenciesState_ = d.STALE_ : r.dependenciesState_ === d.UP_TO_DATE_ && (e.lowestObserverState_ = d.UP_TO_DATE_)
    }))
}

function Ln(e) {
    e.lowestObserverState_ === d.UP_TO_DATE_ && (e.lowestObserverState_ = d.POSSIBLY_STALE_, e.observers_.forEach(function(r) {
        r.dependenciesState_ === d.UP_TO_DATE_ && (r.dependenciesState_ = d.POSSIBLY_STALE_, r.onBecomeStale_())
    }))
}
var z = function() {
    function e(n, t, i, s) {
        n === void 0 && (n = "Reaction"), this.name_ = void 0, this.onInvalidate_ = void 0, this.errorHandler_ = void 0, this.requiresObservable_ = void 0, this.observing_ = [], this.newObserving_ = [], this.dependenciesState_ = d.NOT_TRACKING_, this.runId_ = 0, this.unboundDepsCount_ = 0, this.flags_ = 0, this.isTracing_ = Be.NONE, this.name_ = n, this.onInvalidate_ = t, this.errorHandler_ = i, this.requiresObservable_ = s
    }
    var r = e.prototype;
    return r.onBecomeStale_ = function() {
        this.schedule_()
    }, r.schedule_ = function() {
        this.isScheduled || (this.isScheduled = !0, l.pendingReactions.push(this), _r())
    }, r.runReaction_ = function() {
        if (!this.isDisposed) {
            E(), this.isScheduled = !1;
            var t = l.trackingContext;
            if (l.trackingContext = this, ot(this)) {
                this.isTrackPending = !0;
                try {
                    this.onInvalidate_()
                } catch (i) {
                    this.reportExceptionInDerivation_(i)
                }
            }
            l.trackingContext = t, T()
        }
    }, r.track = function(t) {
        if (!this.isDisposed) {
            E(), this.isRunning = !0;
            var i = l.trackingContext;
            l.trackingContext = this;
            var s = nr(this, t, void 0);
            l.trackingContext = i, this.isRunning = !1, this.isTrackPending = !1, this.isDisposed && at(this), xe(s) && this.reportExceptionInDerivation_(s.cause), T()
        }
    }, r.reportExceptionInDerivation_ = function(t) {
        var i = this;
        if (this.errorHandler_) {
            this.errorHandler_(t, this);
            return
        }
        if (l.disableErrorBoundaries) throw t;
        var s = "[mobx] uncaught error in '" + this + "'";
        l.suppressReactionErrors || console.error(s, t), l.globalReactionErrorHandlers.forEach(function(o) {
            return o(t, i)
        })
    }, r.dispose = function() {
        this.isDisposed || (this.isDisposed = !0, this.isRunning || (E(), at(this), T()))
    }, r.getDisposer_ = function(t) {
        var i = this,
            s = function o() {
                i.dispose(), t == null || t.removeEventListener == null || t.removeEventListener("abort", o)
            };
        return t == null || t.addEventListener == null || t.addEventListener("abort", s), s[f] = this, "dispose" in Symbol && typeof Symbol.dispose == "symbol" && (s[Symbol.dispose] = s), s
    }, r.toString = function() {
        return "Reaction[" + this.name_ + "]"
    }, r.trace = function(t) {}, he(e, [{
        key: "isDisposed",
        get: function() {
            return m(this.flags_, e.isDisposedMask_)
        },
        set: function(t) {
            this.flags_ = k(this.flags_, e.isDisposedMask_, t)
        }
    }, {
        key: "isScheduled",
        get: function() {
            return m(this.flags_, e.isScheduledMask_)
        },
        set: function(t) {
            this.flags_ = k(this.flags_, e.isScheduledMask_, t)
        }
    }, {
        key: "isTrackPending",
        get: function() {
            return m(this.flags_, e.isTrackPendingMask_)
        },
        set: function(t) {
            this.flags_ = k(this.flags_, e.isTrackPendingMask_, t)
        }
    }, {
        key: "isRunning",
        get: function() {
            return m(this.flags_, e.isRunningMask_)
        },
        set: function(t) {
            this.flags_ = k(this.flags_, e.isRunningMask_, t)
        }
    }, {
        key: "diffValue",
        get: function() {
            return m(this.flags_, e.diffValueMask_) ? 1 : 0
        },
        set: function(t) {
            this.flags_ = k(this.flags_, e.diffValueMask_, t === 1)
        }
    }])
}();
z.isDisposedMask_ = 1;
z.isScheduledMask_ = 2;
z.isTrackPendingMask_ = 4;
z.isRunningMask_ = 8;
z.diffValueMask_ = 16;
var Vn = 100,
    ut = function(r) {
        return r()
    };

function _r() {
    l.inBatch > 0 || l.isRunningReactions || ut(In)
}

function In() {
    l.isRunningReactions = !0;
    for (var e = l.pendingReactions, r = 0; e.length > 0;) {
        ++r === Vn && (console.error("[mobx] cycle in reaction: " + e[0]), e.splice(0));
        for (var n = e.splice(0), t = 0, i = n.length; t < i; t++) n[t].runReaction_()
    }
    l.isRunningReactions = !1
}
var Ve = ne("Reaction", z);

function Un(e) {
    var r = ut;
    ut = function(t) {
        return e(function() {
            return r(t)
        })
    }
}

function ye() {
    return !1
}

function $n(e) {
    return console.warn("[mobx.spy] Is a no-op in production builds"),
        function() {}
}
var fr = "action",
    Fn = "action.bound",
    pr = "autoAction",
    Gn = "autoAction.bound",
    hr = "<unnamed action>",
    ct = Oe(fr),
    Kn = Oe(Fn, {
        bound: !0
    }),
    lt = Oe(pr, {
        autoAction: !0
    }),
    qn = Oe(Gn, {
        autoAction: !0,
        bound: !0
    });

function dr(e) {
    var r = function(t, i) {
        if (x(t)) return re(t.name || hr, t, e);
        if (x(i)) return re(t, i, e);
        if (ke(i)) return (e ? lt : ct).decorate_20223_(t, i);
        if (Q(i)) return me(t, i, e ? lt : ct);
        if (Q(t)) return I(Oe(e ? pr : fr, {
            name: t,
            autoAction: e
        }))
    };
    return r
}
var le = dr(!1);
Object.assign(le, ct);
var ge = dr(!0);
Object.assign(ge, lt);
le.bound = I(Kn);
ge.bound = I(qn);

function xi(e) {
    return rr(e.name || hr, !1, e, this, void 0)
}

function _e(e) {
    return x(e) && e.isMobxAction === !0
}

function Yn(e, r) {
    var n, t, i, s;
    r === void 0 && (r = It);
    var o = (n = (t = r) == null ? void 0 : t.name) != null ? n : "Autorun",
        a = !r.scheduler && !r.delay,
        u;
    if (a) u = new z(o, function() {
        this.track(p)
    }, r.onError, r.requiresObservable);
    else {
        var c = Wn(r),
            _ = !1;
        u = new z(o, function() {
            _ || (_ = !0, c(function() {
                _ = !1, u.isDisposed || u.track(p)
            }))
        }, r.onError, r.requiresObservable)
    }

    function p() {
        e(u)
    }
    return (i = r) != null && (i = i.signal) != null && i.aborted || u.schedule_(), u.getDisposer_((s = r) == null ? void 0 : s.signal)
}
var Hn = function(r) {
    return r()
};

function Wn(e) {
    return e.scheduler ? e.scheduler : e.delay ? function(r) {
        return setTimeout(r, e.delay)
    } : Hn
}
var zn = "onBO",
    Xn = "onBUO";

function Jn(e, r, n) {
    return br(zn, e, r, n)
}

function vr(e, r, n) {
    return br(Xn, e, r, n)
}

function br(e, r, n, t) {
    var i = $e(r),
        s = x(t) ? t : n,
        o = e + "L";
    return i[o] ? i[o].add(s) : i[o] = new Set([s]),
        function() {
            var a = i[o];
            a && (a.delete(s), a.size === 0 && delete i[o])
        }
}
var Zn = "never",
    je = "always",
    Qn = "observed";

function Mi(e) {
    e.isolateGlobalState === !0 && Nn();
    var r = e.useProxies,
        n = e.enforceActions;
    if (r !== void 0 && (l.useProxies = r === je ? !0 : r === Zn ? !1 : typeof Proxy < "u"), r === "ifavailable" && (l.verifyProxies = !0), n !== void 0) {
        var t = n === je ? je : n === Qn;
        l.enforceActions = t, l.allowStateChanges = !(t === !0 || t === je)
    } ["computedRequiresReaction", "reactionRequiresObservable", "observableRequiresReaction", "disableErrorBoundaries", "safeDescriptors"].forEach(function(i) {
        i in e && (l[i] = !!e[i])
    }), l.allowStateReads = !l.observableRequiresReaction, e.reactionScheduler && Un(e.reactionScheduler)
}

function ei(e, r, n, t) {
    var i = Lr(r);
    return oe(function() {
        var s = de(e, t)[f];
        Ye(i).forEach(function(o) {
            s.extend_(o, i[o], n && o in n ? n[o] : !0)
        })
    }), e
}

function Ci(e, r) {
    return yr($e(e, r))
}

function yr(e) {
    var r = {
        name: e.name_
    };
    return e.observing_ && e.observing_.length > 0 && (r.dependencies = ti(e.observing_).map(yr)), r
}

function ti(e) {
    return Array.from(new Set(e))
}
var ri = 0;

function gr() {
    this.message = "FLOW_CANCELLED"
}
gr.prototype = Object.create(Error.prototype);
var et = zt("flow"),
    ni = zt("flow.bound", {
        bound: !0
    }),
    fe = Object.assign(function(r, n) {
        if (ke(n)) return et.decorate_20223_(r, n);
        if (Q(n)) return me(r, n, et);
        var t = r,
            i = t.name || "<unnamed flow>",
            s = function() {
                var a = this,
                    u = arguments,
                    c = ++ri,
                    _ = le(i + " - runid: " + c + " - init", t).apply(a, u),
                    p, v = void 0,
                    g = new Promise(function(D, N) {
                        var R = 0;
                        p = N;

                        function Ee(w) {
                            v = void 0;
                            var q;
                            try {
                                q = le(i + " - runid: " + c + " - yield " + R++, _.next).call(_, w)
                            } catch (J) {
                                return N(J)
                            }
                            ve(q)
                        }

                        function Qe(w) {
                            v = void 0;
                            var q;
                            try {
                                q = le(i + " - runid: " + c + " - yield " + R++, _.throw).call(_, w)
                            } catch (J) {
                                return N(J)
                            }
                            ve(q)
                        }

                        function ve(w) {
                            if (x(w == null ? void 0 : w.then)) {
                                w.then(ve, N);
                                return
                            }
                            return w.done ? D(w.value) : (v = Promise.resolve(w.value), v.then(Ee, Qe))
                        }
                        Ee(void 0)
                    });
                return g.cancel = le(i + " - runid: " + c + " - cancel", function() {
                    try {
                        v && Et(v);
                        var D = _.return(void 0),
                            N = Promise.resolve(D.value);
                        N.then(ue, ue), Et(N), p(new gr)
                    } catch (R) {
                        p(R)
                    }
                }), g
            };
        return s.isMobXFlow = !0, s
    }, et);
fe.bound = I(ni);

function Et(e) {
    x(e.cancel) && e.cancel()
}

function we(e) {
    return (e == null ? void 0 : e.isMobXFlow) === !0
}

function ii(e, r) {
    return e ? Ze(e) || !!e[f] || pt(e) || Ve(e) || Xe(e) : !1
}

function wr(e) {
    return ii(e)
}

function F(e, r) {
    r === void 0 && (r = void 0), E();
    try {
        return e.apply(r)
    } finally {
        T()
    }
}

function ae(e) {
    return e[f]
}
var si = {
    has: function(r, n) {
        return ae(r).has_(n)
    },
    get: function(r, n) {
        return ae(r).get_(n)
    },
    set: function(r, n, t) {
        var i;
        return Q(n) ? (i = ae(r).set_(n, t, !0)) != null ? i : !0 : !1
    },
    deleteProperty: function(r, n) {
        var t;
        return Q(n) ? (t = ae(r).delete_(n, !0)) != null ? t : !0 : !1
    },
    defineProperty: function(r, n, t) {
        var i;
        return (i = ae(r).defineProperty_(n, t)) != null ? i : !0
    },
    ownKeys: function(r) {
        return ae(r).ownKeys_()
    },
    preventExtensions: function(r) {
        h(13)
    }
};

function oi(e, r) {
    var n, t;
    return Ut(), e = de(e, r), (t = (n = e[f]).proxy_) != null ? t : n.proxy_ = new Proxy(e, si)
}

function A(e) {
    return e.interceptors_ !== void 0 && e.interceptors_.length > 0
}

function Ae(e, r) {
    var n = e.interceptors_ || (e.interceptors_ = []);
    return n.push(r), $t(function() {
        var t = n.indexOf(r);
        t !== -1 && n.splice(t, 1)
    })
}

function S(e, r) {
    var n = ie();
    try {
        for (var t = [].concat(e.interceptors_ || []), i = 0, s = t.length; i < s && (r = t[i](r), r && !r.type && h(14), !!r); i++);
        return r
    } finally {
        K(n)
    }
}

function P(e) {
    return e.changeListeners_ !== void 0 && e.changeListeners_.length > 0
}

function Se(e, r) {
    var n = e.changeListeners_ || (e.changeListeners_ = []);
    return n.push(r), $t(function() {
        var t = n.indexOf(r);
        t !== -1 && n.splice(t, 1)
    })
}

function j(e, r) {
    var n = ie(),
        t = e.changeListeners_;
    if (t) {
        t = t.slice();
        for (var i = 0, s = t.length; i < s; i++) t[i](r);
        K(n)
    }
}

function Di(e, r, n) {
    return oe(function() {
        var t, i = de(e, n)[f];
        (t = r) != null || (r = Fr(e)), Ye(r).forEach(function(s) {
            return i.make_(s, r[s])
        })
    }), e
}
var Tt = "splice",
    U = "update",
    ai = 1e4,
    ui = {
        get: function(r, n) {
            var t = r[f];
            return n === f ? t : n === "length" ? t.getArrayLength_() : typeof n == "string" && !isNaN(n) ? t.get_(parseInt(n)) : G(Ie, n) ? Ie[n] : r[n]
        },
        set: function(r, n, t) {
            var i = r[f];
            return n === "length" && i.setArrayLength_(t), typeof n == "symbol" || isNaN(n) ? r[n] = t : i.set_(parseInt(n), t), !0
        },
        preventExtensions: function() {
            h(15)
        }
    },
    yt = function() {
        function e(n, t, i, s) {
            n === void 0 && (n = "ObservableArray"), this.owned_ = void 0, this.legacyMode_ = void 0, this.atom_ = void 0, this.values_ = [], this.interceptors_ = void 0, this.changeListeners_ = void 0, this.enhancer_ = void 0, this.dehancer = void 0, this.proxy_ = void 0, this.lastKnownLength_ = 0, this.owned_ = i, this.legacyMode_ = s, this.atom_ = new X(n), this.enhancer_ = function(o, a) {
                return t(o, a, "ObservableArray[..]")
            }
        }
        var r = e.prototype;
        return r.dehanceValue_ = function(t) {
            return this.dehancer !== void 0 ? this.dehancer(t) : t
        }, r.dehanceValues_ = function(t) {
            return this.dehancer !== void 0 && t.length > 0 ? t.map(this.dehancer) : t
        }, r.intercept_ = function(t) {
            return Ae(this, t)
        }, r.observe_ = function(t, i) {
            return i === void 0 && (i = !1), i && t({
                observableKind: "array",
                object: this.proxy_,
                debugObjectName: this.atom_.name_,
                type: "splice",
                index: 0,
                added: this.values_.slice(),
                addedCount: this.values_.length,
                removed: [],
                removedCount: 0
            }), Se(this, t)
        }, r.getArrayLength_ = function() {
            return this.atom_.reportObserved(), this.values_.length
        }, r.setArrayLength_ = function(t) {
            (typeof t != "number" || isNaN(t) || t < 0) && h("Out of range: " + t);
            var i = this.values_.length;
            if (t !== i)
                if (t > i) {
                    for (var s = new Array(t - i), o = 0; o < t - i; o++) s[o] = void 0;
                    this.spliceWithArray_(i, 0, s)
                } else this.spliceWithArray_(t, i - t)
        }, r.updateArrayLength_ = function(t, i) {
            t !== this.lastKnownLength_ && h(16), this.lastKnownLength_ += i, this.legacyMode_ && i > 0 && Tr(t + i + 1)
        }, r.spliceWithArray_ = function(t, i, s) {
            var o = this;
            this.atom_;
            var a = this.values_.length;
            if (t === void 0 ? t = 0 : t > a ? t = a : t < 0 && (t = Math.max(0, a + t)), arguments.length === 1 ? i = a - t : i == null ? i = 0 : i = Math.max(0, Math.min(i, a - t)), s === void 0 && (s = rt), A(this)) {
                var u = S(this, {
                    object: this.proxy_,
                    type: Tt,
                    index: t,
                    removedCount: i,
                    added: s
                });
                if (!u) return rt;
                i = u.removedCount, s = u.added
            }
            if (s = s.length === 0 ? s : s.map(function(p) {
                    return o.enhancer_(p, void 0)
                }), this.legacyMode_) {
                var c = s.length - i;
                this.updateArrayLength_(a, c)
            }
            var _ = this.spliceItemsIntoValues_(t, i, s);
            return (i !== 0 || s.length !== 0) && this.notifyArraySplice_(t, s, _), this.dehanceValues_(_)
        }, r.spliceItemsIntoValues_ = function(t, i, s) {
            if (s.length < ai) {
                var o;
                return (o = this.values_).splice.apply(o, [t, i].concat(s))
            } else {
                var a = this.values_.slice(t, t + i),
                    u = this.values_.slice(t + i);
                this.values_.length += s.length - i;
                for (var c = 0; c < s.length; c++) this.values_[t + c] = s[c];
                for (var _ = 0; _ < u.length; _++) this.values_[t + s.length + _] = u[_];
                return a
            }
        }, r.notifyArrayChildUpdate_ = function(t, i, s) {
            var o = !this.owned_ && ye(),
                a = P(this),
                u = a || o ? {
                    observableKind: "array",
                    object: this.proxy_,
                    type: U,
                    debugObjectName: this.atom_.name_,
                    index: t,
                    newValue: i,
                    oldValue: s
                } : null;
            this.atom_.reportChanged(), a && j(this, u)
        }, r.notifyArraySplice_ = function(t, i, s) {
            var o = !this.owned_ && ye(),
                a = P(this),
                u = a || o ? {
                    observableKind: "array",
                    object: this.proxy_,
                    debugObjectName: this.atom_.name_,
                    type: Tt,
                    index: t,
                    removed: s,
                    added: i,
                    removedCount: s.length,
                    addedCount: i.length
                } : null;
            this.atom_.reportChanged(), a && j(this, u)
        }, r.get_ = function(t) {
            if (this.legacyMode_ && t >= this.values_.length) {
                console.warn("[mobx] Out of bounds read: " + t);
                return
            }
            return this.atom_.reportObserved(), this.dehanceValue_(this.values_[t])
        }, r.set_ = function(t, i) {
            var s = this.values_;
            if (this.legacyMode_ && t > s.length && h(17, t, s.length), t < s.length) {
                this.atom_;
                var o = s[t];
                if (A(this)) {
                    var a = S(this, {
                        type: U,
                        object: this.proxy_,
                        index: t,
                        newValue: i
                    });
                    if (!a) return;
                    i = a.newValue
                }
                i = this.enhancer_(i, o);
                var u = i !== o;
                u && (s[t] = i, this.notifyArrayChildUpdate_(t, i, o))
            } else {
                for (var c = new Array(t + 1 - s.length), _ = 0; _ < c.length - 1; _++) c[_] = void 0;
                c[c.length - 1] = i, this.spliceWithArray_(s.length, 0, c)
            }
        }, e
    }();

function ci(e, r, n, t) {
    return n === void 0 && (n = "ObservableArray"), t === void 0 && (t = !1), Ut(), oe(function() {
        var i = new yt(n, r, t, !1);
        Gt(i.values_, f, i);
        var s = new Proxy(i.values_, ui);
        return i.proxy_ = s, e && e.length && i.spliceWithArray_(0, 0, e), s
    })
}
var Ie = {
    clear: function() {
        return this.splice(0)
    },
    replace: function(r) {
        var n = this[f];
        return n.spliceWithArray_(0, n.values_.length, r)
    },
    toJSON: function() {
        return this.slice()
    },
    splice: function(r, n) {
        for (var t = arguments.length, i = new Array(t > 2 ? t - 2 : 0), s = 2; s < t; s++) i[s - 2] = arguments[s];
        var o = this[f];
        switch (arguments.length) {
            case 0:
                return [];
            case 1:
                return o.spliceWithArray_(r);
            case 2:
                return o.spliceWithArray_(r, n)
        }
        return o.spliceWithArray_(r, n, i)
    },
    spliceWithArray: function(r, n, t) {
        return this[f].spliceWithArray_(r, n, t)
    },
    push: function() {
        for (var r = this[f], n = arguments.length, t = new Array(n), i = 0; i < n; i++) t[i] = arguments[i];
        return r.spliceWithArray_(r.values_.length, 0, t), r.values_.length
    },
    pop: function() {
        return this.splice(Math.max(this[f].values_.length - 1, 0), 1)[0]
    },
    shift: function() {
        return this.splice(0, 1)[0]
    },
    unshift: function() {
        for (var r = this[f], n = arguments.length, t = new Array(n), i = 0; i < n; i++) t[i] = arguments[i];
        return r.spliceWithArray_(0, 0, t), r.values_.length
    },
    reverse: function() {
        return l.trackingDerivation && h(37, "reverse"), this.replace(this.slice().reverse()), this
    },
    sort: function() {
        l.trackingDerivation && h(37, "sort");
        var r = this.slice();
        return r.sort.apply(r, arguments), this.replace(r), this
    },
    remove: function(r) {
        var n = this[f],
            t = n.dehanceValues_(n.values_).indexOf(r);
        return t > -1 ? (this.splice(t, 1), !0) : !1
    }
};
b("at", O);
b("concat", O);
b("flat", O);
b("includes", O);
b("indexOf", O);
b("join", O);
b("lastIndexOf", O);
b("slice", O);
b("toString", O);
b("toLocaleString", O);
b("toSorted", O);
b("toSpliced", O);
b("with", O);
b("every", C);
b("filter", C);
b("find", C);
b("findIndex", C);
b("findLast", C);
b("findLastIndex", C);
b("flatMap", C);
b("forEach", C);
b("map", C);
b("some", C);
b("toReversed", C);
b("reduce", mr);
b("reduceRight", mr);

function b(e, r) {
    typeof Array.prototype[e] == "function" && (Ie[e] = r(e))
}

function O(e) {
    return function() {
        var r = this[f];
        r.atom_.reportObserved();
        var n = r.dehanceValues_(r.values_);
        return n[e].apply(n, arguments)
    }
}

function C(e) {
    return function(r, n) {
        var t = this,
            i = this[f];
        i.atom_.reportObserved();
        var s = i.dehanceValues_(i.values_);
        return s[e](function(o, a) {
            return r.call(n, o, a, t)
        })
    }
}

function mr(e) {
    return function() {
        var r = this,
            n = this[f];
        n.atom_.reportObserved();
        var t = n.dehanceValues_(n.values_),
            i = arguments[0];
        return arguments[0] = function(s, o, a) {
            return i(s, o, a, r)
        }, t[e].apply(t, arguments)
    }
}
var li = ne("ObservableArrayAdministration", yt);

function Je(e) {
    return Ke(e) && li(e[f])
}
var _i = {},
    H = "add",
    Ue = "delete",
    kr = function() {
        function e(n, t, i) {
            var s = this;
            t === void 0 && (t = te), i === void 0 && (i = "ObservableMap"), this.enhancer_ = void 0, this.name_ = void 0, this[f] = _i, this.data_ = void 0, this.hasMap_ = void 0, this.keysAtom_ = void 0, this.interceptors_ = void 0, this.changeListeners_ = void 0, this.dehancer = void 0, this.enhancer_ = t, this.name_ = i, x(Map) || h(18), oe(function() {
                s.keysAtom_ = Ht("ObservableMap.keys()"), s.data_ = new Map, s.hasMap_ = new Map, n && s.merge(n)
            })
        }
        var r = e.prototype;
        return r.has_ = function(t) {
            return this.data_.has(t)
        }, r.has = function(t) {
            var i = this;
            if (!l.trackingDerivation) return this.has_(t);
            var s = this.hasMap_.get(t);
            if (!s) {
                var o = s = new Z(this.has_(t), He, "ObservableMap.key?", !1);
                this.hasMap_.set(t, o), vr(o, function() {
                    return i.hasMap_.delete(t)
                })
            }
            return s.get()
        }, r.set = function(t, i) {
            var s = this.has_(t);
            if (A(this)) {
                var o = S(this, {
                    type: s ? U : H,
                    object: this,
                    newValue: i,
                    name: t
                });
                if (!o) return this;
                i = o.newValue
            }
            return s ? this.updateValue_(t, i) : this.addValue_(t, i), this
        }, r.delete = function(t) {
            var i = this;
            if (this.keysAtom_, A(this)) {
                var s = S(this, {
                    type: Ue,
                    object: this,
                    name: t
                });
                if (!s) return !1
            }
            if (this.has_(t)) {
                var o = ye(),
                    a = P(this),
                    u = a || o ? {
                        observableKind: "map",
                        debugObjectName: this.name_,
                        type: Ue,
                        object: this,
                        oldValue: this.data_.get(t).value_,
                        name: t
                    } : null;
                return F(function() {
                    var c;
                    i.keysAtom_.reportChanged(), (c = i.hasMap_.get(t)) == null || c.setNewValue_(!1);
                    var _ = i.data_.get(t);
                    _.setNewValue_(void 0), i.data_.delete(t)
                }), a && j(this, u), !0
            }
            return !1
        }, r.updateValue_ = function(t, i) {
            var s = this.data_.get(t);
            if (i = s.prepareNewValue_(i), i !== l.UNCHANGED) {
                var o = ye(),
                    a = P(this),
                    u = a || o ? {
                        observableKind: "map",
                        debugObjectName: this.name_,
                        type: U,
                        object: this,
                        oldValue: s.value_,
                        name: t,
                        newValue: i
                    } : null;
                s.setNewValue_(i), a && j(this, u)
            }
        }, r.addValue_ = function(t, i) {
            var s = this;
            this.keysAtom_, F(function() {
                var c, _ = new Z(i, s.enhancer_, "ObservableMap.key", !1);
                s.data_.set(t, _), i = _.value_, (c = s.hasMap_.get(t)) == null || c.setNewValue_(!0), s.keysAtom_.reportChanged()
            });
            var o = ye(),
                a = P(this),
                u = a || o ? {
                    observableKind: "map",
                    debugObjectName: this.name_,
                    type: H,
                    object: this,
                    name: t,
                    newValue: i
                } : null;
            a && j(this, u)
        }, r.get = function(t) {
            return this.has(t) ? this.dehanceValue_(this.data_.get(t).get()) : this.dehanceValue_(void 0)
        }, r.dehanceValue_ = function(t) {
            return this.dehancer !== void 0 ? this.dehancer(t) : t
        }, r.keys = function() {
            return this.keysAtom_.reportObserved(), this.data_.keys()
        }, r.values = function() {
            var t = this,
                i = this.keys();
            return Pt({
                next: function() {
                    var o = i.next(),
                        a = o.done,
                        u = o.value;
                    return {
                        done: a,
                        value: a ? void 0 : t.get(u)
                    }
                }
            })
        }, r.entries = function() {
            var t = this,
                i = this.keys();
            return Pt({
                next: function() {
                    var o = i.next(),
                        a = o.done,
                        u = o.value;
                    return {
                        done: a,
                        value: a ? void 0 : [u, t.get(u)]
                    }
                }
            })
        }, r[Symbol.iterator] = function() {
            return this.entries()
        }, r.forEach = function(t, i) {
            for (var s = ce(this), o; !(o = s()).done;) {
                var a = o.value,
                    u = a[0],
                    c = a[1];
                t.call(i, c, u, this)
            }
        }, r.merge = function(t) {
            var i = this;
            return se(t) && (t = new Map(t)), F(function() {
                W(t) ? Br(t).forEach(function(s) {
                    return i.set(s, t[s])
                }) : Array.isArray(t) ? t.forEach(function(s) {
                    var o = s[0],
                        a = s[1];
                    return i.set(o, a)
                }) : pe(t) ? (Rr(t) || h(19, t), t.forEach(function(s, o) {
                    return i.set(o, s)
                })) : t != null && h(20, t)
            }), this
        }, r.clear = function() {
            var t = this;
            F(function() {
                ir(function() {
                    for (var i = ce(t.keys()), s; !(s = i()).done;) {
                        var o = s.value;
                        t.delete(o)
                    }
                })
            })
        }, r.replace = function(t) {
            var i = this;
            return F(function() {
                for (var s = fi(t), o = new Map, a = !1, u = ce(i.data_.keys()), c; !(c = u()).done;) {
                    var _ = c.value;
                    if (!s.has(_)) {
                        var p = i.delete(_);
                        if (p) a = !0;
                        else {
                            var v = i.data_.get(_);
                            o.set(_, v)
                        }
                    }
                }
                for (var g = ce(s.entries()), D; !(D = g()).done;) {
                    var N = D.value,
                        R = N[0],
                        Ee = N[1],
                        Qe = i.data_.has(R);
                    if (i.set(R, Ee), i.data_.has(R)) {
                        var ve = i.data_.get(R);
                        o.set(R, ve), Qe || (a = !0)
                    }
                }
                if (!a)
                    if (i.data_.size !== o.size) i.keysAtom_.reportChanged();
                    else
                        for (var w = i.data_.keys(), q = o.keys(), J = w.next(), mt = q.next(); !J.done;) {
                            if (J.value !== mt.value) {
                                i.keysAtom_.reportChanged();
                                break
                            }
                            J = w.next(), mt = q.next()
                        }
                i.data_ = o
            }), this
        }, r.toString = function() {
            return "[object ObservableMap]"
        }, r.toJSON = function() {
            return Array.from(this)
        }, r.observe_ = function(t, i) {
            return Se(this, t)
        }, r.intercept_ = function(t) {
            return Ae(this, t)
        }, he(e, [{
            key: "size",
            get: function() {
                return this.keysAtom_.reportObserved(), this.data_.size
            }
        }, {
            key: Symbol.toStringTag,
            get: function() {
                return "Map"
            }
        }])
    }(),
    se = ne("ObservableMap", kr);

function Pt(e) {
    return e[Symbol.toStringTag] = "MapIterator", wt(e)
}

function fi(e) {
    if (pe(e) || se(e)) return e;
    if (Array.isArray(e)) return new Map(e);
    if (W(e)) {
        var r = new Map;
        for (var n in e) r.set(n, e[n]);
        return r
    } else return h(21, e)
}
var pi = {},
    Or = function() {
        function e(n, t, i) {
            var s = this;
            t === void 0 && (t = te), i === void 0 && (i = "ObservableSet"), this.name_ = void 0, this[f] = pi, this.data_ = new Set, this.atom_ = void 0, this.changeListeners_ = void 0, this.interceptors_ = void 0, this.dehancer = void 0, this.enhancer_ = void 0, this.name_ = i, x(Set) || h(22), this.enhancer_ = function(o, a) {
                return t(o, a, i)
            }, oe(function() {
                s.atom_ = Ht(s.name_), n && s.replace(n)
            })
        }
        var r = e.prototype;
        return r.dehanceValue_ = function(t) {
            return this.dehancer !== void 0 ? this.dehancer(t) : t
        }, r.clear = function() {
            var t = this;
            F(function() {
                ir(function() {
                    for (var i = ce(t.data_.values()), s; !(s = i()).done;) {
                        var o = s.value;
                        t.delete(o)
                    }
                })
            })
        }, r.forEach = function(t, i) {
            for (var s = ce(this), o; !(o = s()).done;) {
                var a = o.value;
                t.call(i, a, a, this)
            }
        }, r.add = function(t) {
            var i = this;
            if (this.atom_, A(this)) {
                var s = S(this, {
                    type: H,
                    object: this,
                    newValue: t
                });
                if (!s) return this;
                t = s.newValue
            }
            if (!this.has(t)) {
                F(function() {
                    i.data_.add(i.enhancer_(t, void 0)), i.atom_.reportChanged()
                });
                var o = !1,
                    a = P(this),
                    u = a || o ? {
                        observableKind: "set",
                        debugObjectName: this.name_,
                        type: H,
                        object: this,
                        newValue: t
                    } : null;
                a && j(this, u)
            }
            return this
        }, r.delete = function(t) {
            var i = this;
            if (A(this)) {
                var s = S(this, {
                    type: Ue,
                    object: this,
                    oldValue: t
                });
                if (!s) return !1
            }
            if (this.has(t)) {
                var o = !1,
                    a = P(this),
                    u = a || o ? {
                        observableKind: "set",
                        debugObjectName: this.name_,
                        type: Ue,
                        object: this,
                        oldValue: t
                    } : null;
                return F(function() {
                    i.atom_.reportChanged(), i.data_.delete(t)
                }), a && j(this, u), !0
            }
            return !1
        }, r.has = function(t) {
            return this.atom_.reportObserved(), this.data_.has(this.dehanceValue_(t))
        }, r.entries = function() {
            var t = this.values();
            return jt({
                next: function() {
                    var s = t.next(),
                        o = s.value,
                        a = s.done;
                    return a ? {
                        value: void 0,
                        done: a
                    } : {
                        value: [o, o],
                        done: a
                    }
                }
            })
        }, r.keys = function() {
            return this.values()
        }, r.values = function() {
            this.atom_.reportObserved();
            var t = this,
                i = this.data_.values();
            return jt({
                next: function() {
                    var o = i.next(),
                        a = o.value,
                        u = o.done;
                    return u ? {
                        value: void 0,
                        done: u
                    } : {
                        value: t.dehanceValue_(a),
                        done: u
                    }
                }
            })
        }, r.intersection = function(t) {
            if ($(t) && !B(t)) return t.intersection(this);
            var i = new Set(this);
            return i.intersection(t)
        }, r.union = function(t) {
            if ($(t) && !B(t)) return t.union(this);
            var i = new Set(this);
            return i.union(t)
        }, r.difference = function(t) {
            return new Set(this).difference(t)
        }, r.symmetricDifference = function(t) {
            if ($(t) && !B(t)) return t.symmetricDifference(this);
            var i = new Set(this);
            return i.symmetricDifference(t)
        }, r.isSubsetOf = function(t) {
            return new Set(this).isSubsetOf(t)
        }, r.isSupersetOf = function(t) {
            return new Set(this).isSupersetOf(t)
        }, r.isDisjointFrom = function(t) {
            if ($(t) && !B(t)) return t.isDisjointFrom(this);
            var i = new Set(this);
            return i.isDisjointFrom(t)
        }, r.replace = function(t) {
            var i = this;
            return B(t) && (t = new Set(t)), F(function() {
                Array.isArray(t) ? (i.clear(), t.forEach(function(s) {
                    return i.add(s)
                })) : $(t) ? (i.clear(), t.forEach(function(s) {
                    return i.add(s)
                })) : t != null && h("Cannot initialize set from " + t)
            }), this
        }, r.observe_ = function(t, i) {
            return Se(this, t)
        }, r.intercept_ = function(t) {
            return Ae(this, t)
        }, r.toJSON = function() {
            return Array.from(this)
        }, r.toString = function() {
            return "[object ObservableSet]"
        }, r[Symbol.iterator] = function() {
            return this.values()
        }, he(e, [{
            key: "size",
            get: function() {
                return this.atom_.reportObserved(), this.data_.size
            }
        }, {
            key: Symbol.toStringTag,
            get: function() {
                return "Set"
            }
        }])
    }(),
    B = ne("ObservableSet", Or);

function jt(e) {
    return e[Symbol.toStringTag] = "SetIterator", wt(e)
}
var xt = Object.create(null),
    Mt = "remove",
    Ar = function() {
        function e(n, t, i, s) {
            t === void 0 && (t = new Map), s === void 0 && (s = pn), this.target_ = void 0, this.values_ = void 0, this.name_ = void 0, this.defaultAnnotation_ = void 0, this.keysAtom_ = void 0, this.changeListeners_ = void 0, this.interceptors_ = void 0, this.proxy_ = void 0, this.isPlainObject_ = void 0, this.appliedAnnotations_ = void 0, this.pendingKeys_ = void 0, this.target_ = n, this.values_ = t, this.name_ = i, this.defaultAnnotation_ = s, this.keysAtom_ = new X("ObservableObject.keys"), this.isPlainObject_ = W(this.target_)
        }
        var r = e.prototype;
        return r.getObservablePropValue_ = function(t) {
            return this.values_.get(t).get()
        }, r.setObservablePropValue_ = function(t, i) {
            var s = this.values_.get(t);
            if (s instanceof M) return s.set(i), !0;
            if (A(this)) {
                var o = S(this, {
                    type: U,
                    object: this.proxy_ || this.target_,
                    name: t,
                    newValue: i
                });
                if (!o) return null;
                i = o.newValue
            }
            if (i = s.prepareNewValue_(i), i !== l.UNCHANGED) {
                var a = P(this),
                    u = !1,
                    c = a || u ? {
                        type: U,
                        observableKind: "object",
                        debugObjectName: this.name_,
                        object: this.proxy_ || this.target_,
                        oldValue: s.value_,
                        name: t,
                        newValue: i
                    } : null;
                s.setNewValue_(i), a && j(this, c)
            }
            return !0
        }, r.get_ = function(t) {
            return l.trackingDerivation && !G(this.target_, t) && this.has_(t), this.target_[t]
        }, r.set_ = function(t, i, s) {
            return s === void 0 && (s = !1), G(this.target_, t) ? this.values_.has(t) ? this.setObservablePropValue_(t, i) : s ? Reflect.set(this.target_, t, i) : (this.target_[t] = i, !0) : this.extend_(t, {
                value: i,
                enumerable: !0,
                writable: !0,
                configurable: !0
            }, this.defaultAnnotation_, s)
        }, r.has_ = function(t) {
            if (!l.trackingDerivation) return t in this.target_;
            this.pendingKeys_ || (this.pendingKeys_ = new Map);
            var i = this.pendingKeys_.get(t);
            return i || (i = new Z(t in this.target_, He, "ObservableObject.key?", !1), this.pendingKeys_.set(t, i)), i.get()
        }, r.make_ = function(t, i) {
            if (i === !0 && (i = this.defaultAnnotation_), i !== !1) {
                if (!(t in this.target_)) {
                    var s;
                    if ((s = this.target_[L]) != null && s[t]) return;
                    h(1, i.annotationType_, this.name_ + "." + t.toString())
                }
                for (var o = this.target_; o && o !== Ge;) {
                    var a = De(o, t);
                    if (a) {
                        var u = i.make_(this, t, a, o);
                        if (u === 0) return;
                        if (u === 1) break
                    }
                    o = Object.getPrototypeOf(o)
                }
                Dt(this, i, t)
            }
        }, r.extend_ = function(t, i, s, o) {
            if (o === void 0 && (o = !1), s === !0 && (s = this.defaultAnnotation_), s === !1) return this.defineProperty_(t, i, o);
            var a = s.extend_(this, t, i, o);
            return a && Dt(this, s, t), a
        }, r.defineProperty_ = function(t, i, s) {
            s === void 0 && (s = !1), this.keysAtom_;
            try {
                E();
                var o = this.delete_(t);
                if (!o) return o;
                if (A(this)) {
                    var a = S(this, {
                        object: this.proxy_ || this.target_,
                        name: t,
                        type: H,
                        newValue: i.value
                    });
                    if (!a) return null;
                    var u = a.newValue;
                    i.value !== u && (i = ee({}, i, {
                        value: u
                    }))
                }
                if (s) {
                    if (!Reflect.defineProperty(this.target_, t, i)) return !1
                } else V(this.target_, t, i);
                this.notifyPropertyAddition_(t, i.value)
            } finally {
                T()
            }
            return !0
        }, r.defineObservableProperty_ = function(t, i, s, o) {
            o === void 0 && (o = !1), this.keysAtom_;
            try {
                E();
                var a = this.delete_(t);
                if (!a) return a;
                if (A(this)) {
                    var u = S(this, {
                        object: this.proxy_ || this.target_,
                        name: t,
                        type: H,
                        newValue: i
                    });
                    if (!u) return null;
                    i = u.newValue
                }
                var c = Ct(t),
                    _ = {
                        configurable: l.safeDescriptors ? this.isPlainObject_ : !0,
                        enumerable: !0,
                        get: c.get,
                        set: c.set
                    };
                if (o) {
                    if (!Reflect.defineProperty(this.target_, t, _)) return !1
                } else V(this.target_, t, _);
                var p = new Z(i, s, "ObservableObject.key", !1);
                this.values_.set(t, p), this.notifyPropertyAddition_(t, p.value_)
            } finally {
                T()
            }
            return !0
        }, r.defineComputedProperty_ = function(t, i, s) {
            s === void 0 && (s = !1), this.keysAtom_;
            try {
                E();
                var o = this.delete_(t);
                if (!o) return o;
                if (A(this)) {
                    var a = S(this, {
                        object: this.proxy_ || this.target_,
                        name: t,
                        type: H,
                        newValue: void 0
                    });
                    if (!a) return null
                }
                i.name || (i.name = "ObservableObject.key"), i.context = this.proxy_ || this.target_;
                var u = Ct(t),
                    c = {
                        configurable: l.safeDescriptors ? this.isPlainObject_ : !0,
                        enumerable: !1,
                        get: u.get,
                        set: u.set
                    };
                if (s) {
                    if (!Reflect.defineProperty(this.target_, t, c)) return !1
                } else V(this.target_, t, c);
                this.values_.set(t, new M(i)), this.notifyPropertyAddition_(t, void 0)
            } finally {
                T()
            }
            return !0
        }, r.delete_ = function(t, i) {
            if (i === void 0 && (i = !1), this.keysAtom_, !G(this.target_, t)) return !0;
            if (A(this)) {
                var s = S(this, {
                    object: this.proxy_ || this.target_,
                    name: t,
                    type: Mt
                });
                if (!s) return null
            }
            try {
                var o;
                E();
                var a = P(this),
                    u = !1,
                    c = this.values_.get(t),
                    _ = void 0;
                if (!c && (a || u)) {
                    var p;
                    _ = (p = De(this.target_, t)) == null ? void 0 : p.value
                }
                if (i) {
                    if (!Reflect.deleteProperty(this.target_, t)) return !1
                } else delete this.target_[t];
                if (c && (this.values_.delete(t), c instanceof Z && (_ = c.value_), lr(c)), this.keysAtom_.reportChanged(), (o = this.pendingKeys_) == null || (o = o.get(t)) == null || o.set(t in this.target_), a || u) {
                    var v = {
                        type: Mt,
                        observableKind: "object",
                        object: this.proxy_ || this.target_,
                        debugObjectName: this.name_,
                        oldValue: _,
                        name: t
                    };
                    a && j(this, v)
                }
            } finally {
                T()
            }
            return !0
        }, r.observe_ = function(t, i) {
            return Se(this, t)
        }, r.intercept_ = function(t) {
            return Ae(this, t)
        }, r.notifyPropertyAddition_ = function(t, i) {
            var s, o = P(this),
                a = !1;
            if (o || a) {
                var u = o || a ? {
                    type: H,
                    observableKind: "object",
                    debugObjectName: this.name_,
                    object: this.proxy_ || this.target_,
                    name: t,
                    newValue: i
                } : null;
                o && j(this, u)
            }(s = this.pendingKeys_) == null || (s = s.get(t)) == null || s.set(!0), this.keysAtom_.reportChanged()
        }, r.ownKeys_ = function() {
            return this.keysAtom_.reportObserved(), Ye(this.target_)
        }, r.keys_ = function() {
            return this.keysAtom_.reportObserved(), Object.keys(this.target_)
        }, e
    }();

function de(e, r) {
    var n;
    if (G(e, f)) return e;
    var t = (n = r == null ? void 0 : r.name) != null ? n : "ObservableObject",
        i = new Ar(e, new Map, String(t), An(r));
    return qe(e, f, i), e
}
var hi = ne("ObservableObjectAdministration", Ar);

function Ct(e) {
    return xt[e] || (xt[e] = {
        get: function() {
            return this[f].getObservablePropValue_(e)
        },
        set: function(n) {
            return this[f].setObservablePropValue_(e, n)
        }
    })
}

function Ze(e) {
    return Ke(e) ? hi(e[f]) : !1
}

function Dt(e, r, n) {
    var t;
    (t = e.target_[L]) == null || delete t[n]
}
var di = Er(0),
    vi = function() {
        var e = !1,
            r = {};
        return Object.defineProperty(r, "0", {
            set: function() {
                e = !0
            }
        }), Object.create(r)[0] = 1, e === !1
    }(),
    tt = 0,
    Sr = function() {};

function bi(e, r) {
    Object.setPrototypeOf ? Object.setPrototypeOf(e.prototype, r) : e.prototype.__proto__ !== void 0 ? e.prototype.__proto__ = r : e.prototype = r
}
bi(Sr, Array.prototype);
var gt = function(e) {
    function r(t, i, s, o) {
        var a;
        return s === void 0 && (s = "ObservableArray"), o === void 0 && (o = !1), a = e.call(this) || this, oe(function() {
            var u = new yt(s, i, o, !0);
            u.proxy_ = a, Gt(a, f, u), t && t.length && a.spliceWithArray(0, 0, t), vi && Object.defineProperty(a, "0", di)
        }), a
    }
    Yt(r, e);
    var n = r.prototype;
    return n.concat = function() {
        this[f].atom_.reportObserved();
        for (var i = arguments.length, s = new Array(i), o = 0; o < i; o++) s[o] = arguments[o];
        return Array.prototype.concat.apply(this.slice(), s.map(function(a) {
            return Je(a) ? a.slice() : a
        }))
    }, n[Symbol.iterator] = function() {
        var t = this,
            i = 0;
        return wt({
            next: function() {
                return i < t.length ? {
                    value: t[i++],
                    done: !1
                } : {
                    done: !0,
                    value: void 0
                }
            }
        })
    }, he(r, [{
        key: "length",
        get: function() {
            return this[f].getArrayLength_()
        },
        set: function(i) {
            this[f].setArrayLength_(i)
        }
    }, {
        key: Symbol.toStringTag,
        get: function() {
            return "Array"
        }
    }])
}(Sr);
Object.entries(Ie).forEach(function(e) {
    var r = e[0],
        n = e[1];
    r !== "concat" && qe(gt.prototype, r, n)
});

function Er(e) {
    return {
        enumerable: !1,
        configurable: !0,
        get: function() {
            return this[f].get_(e)
        },
        set: function(n) {
            this[f].set_(e, n)
        }
    }
}

function yi(e) {
    V(gt.prototype, "" + e, Er(e))
}

function Tr(e) {
    if (e > tt) {
        for (var r = tt; r < e + 100; r++) yi(r);
        tt = e
    }
}
Tr(1e3);

function gi(e, r, n) {
    return new gt(e, r, n)
}

function $e(e, r) {
    if (typeof e == "object" && e !== null) {
        if (Je(e)) return r !== void 0 && h(23), e[f].atom_;
        if (B(e)) return e.atom_;
        if (se(e)) {
            if (r === void 0) return e.keysAtom_;
            var n = e.data_.get(r) || e.hasMap_.get(r);
            return n || h(25, r, _t(e)), n
        }
        if (Ze(e)) {
            if (!r) return h(26);
            var t = e[f].values_.get(r);
            return t || h(27, r, _t(e)), t
        }
        if (pt(e) || Xe(e) || Ve(e)) return e
    } else if (x(e) && Ve(e[f])) return e[f];
    h(28)
}

function wi(e, r) {
    if (e || h(29), pt(e) || Xe(e) || Ve(e) || se(e) || B(e)) return e;
    if (e[f]) return e[f];
    h(24, e)
}

function _t(e, r) {
    var n;
    if (r !== void 0) n = $e(e, r);
    else {
        if (_e(e)) return e.name;
        Ze(e) || se(e) || B(e) ? n = wi(e) : n = $e(e)
    }
    return n.name_
}

function oe(e) {
    var r = ie(),
        n = dt(!0);
    E();
    try {
        return e()
    } finally {
        T(), vt(n), K(r)
    }
}
var Nt = Ge.toString;

function Pr(e, r, n) {
    return n === void 0 && (n = -1), ft(e, r, n)
}

function ft(e, r, n, t, i) {
    if (e === r) return e !== 0 || 1 / e === 1 / r;
    if (e == null || r == null) return !1;
    if (e !== e) return r !== r;
    var s = typeof e;
    if (s !== "function" && s !== "object" && typeof r != "object") return !1;
    var o = Nt.call(e);
    if (o !== Nt.call(r)) return !1;
    switch (o) {
        case "[object RegExp]":
        case "[object String]":
            return "" + e == "" + r;
        case "[object Number]":
            return +e != +e ? +r != +r : +e == 0 ? 1 / +e === 1 / r : +e == +r;
        case "[object Date]":
        case "[object Boolean]":
            return +e == +r;
        case "[object Symbol]":
            return typeof Symbol < "u" && Symbol.valueOf.call(e) === Symbol.valueOf.call(r);
        case "[object Map]":
        case "[object Set]":
            n >= 0 && n++;
            break
    }
    e = Rt(e), r = Rt(r);
    var a = o === "[object Array]";
    if (!a) {
        if (typeof e != "object" || typeof r != "object") return !1;
        var u = e.constructor,
            c = r.constructor;
        if (u !== c && !(x(u) && u instanceof u && x(c) && c instanceof c) && "constructor" in e && "constructor" in r) return !1
    }
    if (n === 0) return !1;
    n < 0 && (n = -1), t = t || [], i = i || [];
    for (var _ = t.length; _--;)
        if (t[_] === e) return i[_] === r;
    if (t.push(e), i.push(r), a) {
        if (_ = e.length, _ !== r.length) return !1;
        for (; _--;)
            if (!ft(e[_], r[_], n - 1, t, i)) return !1
    } else {
        var p = Object.keys(e),
            v = p.length;
        if (Object.keys(r).length !== v) return !1;
        for (var g = 0; g < v; g++) {
            var D = p[g];
            if (!(G(r, D) && ft(e[D], r[D], n - 1, t, i))) return !1
        }
    }
    return t.pop(), i.pop(), !0
}

function Rt(e) {
    return Je(e) ? e.slice() : pe(e) || se(e) || $(e) || B(e) ? Array.from(e.entries()) : e
}
var Bt, mi = ((Bt = Fe().Iterator) == null ? void 0 : Bt.prototype) || {};

function wt(e) {
    return e[Symbol.iterator] = ki, Object.assign(Object.create(mi), e)
}

function ki() {
    return this
} ["Symbol", "Map", "Set"].forEach(function(e) {
    var r = Fe();
    typeof r[e] > "u" && h("MobX requires global '" + e + "' to be available or polyfilled")
});
typeof __MOBX_DEVTOOLS_GLOBAL_HOOK__ == "object" && __MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobx({
    spy: $n,
    extras: {
        getDebugName: _t
    },
    $mobx: f
});
const Oi = [{
    id: "linkedin-messaging",
    name: "LinkedIn Messaging",
    description: "Navigate to LinkedIn messaging, input a greeting message, and click send button.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://www.linkedin.com/messaging/"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "LinkedIn Messaging"
    }, {
        type: "browser_action",
        action: {
            browser_input: {
                selector: ".msg-form__contenteditable",
                text: "Hello I am Manus Xuankun"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_click: {
                selector: ".msg-form__send-button"
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "twitter-post",
    name: "Twitter Post",
    description: "Navigate to Twitter home, input hello world, and click post button.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://x.com/home"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Twitter Post"
    }, {
        type: "browser_action",
        action: {
            browser_input: {
                selector: ".notranslate.public-DraftEditor-content",
                text: `hello world - ${new Date().toLocaleString()}`
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_click: {
                selector: 'button[data-testid="tweetButtonInline"]'
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "continuous-scroll-300",
    name: "持续滚动测试 (300 次)",
    description: "Continuously scroll to bottom and top for 300 cycles.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://www.youtube.com/results?search_query=林俊杰"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Continuous Scroll Test - 300 cycles"
    }, ...Array.from({
        length: 300
    }, () => [{
        type: "browser_action",
        action: {
            browser_scroll_down: {
                to_end: !0,
                target: "page"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_scroll_up: {
                to_end: !0,
                target: "page"
            }
        }
    }]).flat(), {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "youtube-jj-lin-ongoing",
    name: "YouTube 林俊杰搜索 (永不结束)",
    description: "Navigate to YouTube search JJ Lin and stay in running state forever.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://www.youtube.com/results?search_query=林俊杰"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "YouTube JJ Lin Search - Ongoing"
    }]
}, {
    id: "duckduckgo-search",
    name: "DuckDuckGo search",
    description: "Search for Manus AI on DuckDuckGo using input and press enter.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://duckduckgo.com/"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "DuckDuckGo search"
    }, {
        type: "browser_action",
        action: {
            browser_input: {
                index: 3,
                text: "Manus AI Agent"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_click: {
                selector: 'button[aria-label="Search"][type="submit"]'
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_scroll_down: {
                target: "page"
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "browser-view-test",
    name: "Browser View Test",
    description: "Navigate to YouTube search JJ Lin and stay in running state forever.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://www.youtube.com/results?search_query=林俊杰"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_view: {}
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "YouTube JJ Lin Search - Ongoing"
    }]
}, {
    id: "google-search",
    name: "Google search",
    description: "Search for Manus AI on Google home page, using input and press enter.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://google.com/"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Google Search"
    }, {
        type: "browser_action",
        action: {
            browser_input: {
                selector: 'textarea[name="q"]',
                text: "Manus AI Agent",
                press_enter: !0
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_scroll_down: {
                to_end: !0,
                target: "page"
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "example-follow-link",
    name: "Follow link on example.com",
    description: "Click the More Information link on example.com to verify click handling.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://example.com/"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Link following test"
    }, {
        type: "browser_action",
        action: {
            browser_click: {
                index: 1
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "gmail-inbox-scroll",
    name: "Gmail inbox scroll",
    description: "Open Gmail inbox and scroll down one screen.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://mail.google.com/mail/u/0/#inbox"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Gmail scrolling"
    }, {
        type: "browser_action",
        action: {
            browser_scroll_down: {
                to_end: !0,
                target: "page"
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "test-takeover",
    name: "User Takeover Test",
    description: "Test take_over status handling - AI pauses and user can take control.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://example.com/"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Takeover test"
    }, {
        type: "browser_action",
        action: {
            browser_view: {}
        }
    }, {
        type: "session_status",
        status: "take_over"
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "test-error-status",
    name: "Error Status Test",
    description: "Test session error status handling.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://example.com/"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Error test"
    }, {
        type: "browser_action",
        action: {
            browser_view: {}
        }
    }, {
        type: "session_status",
        status: "error",
        error: "Simulated error for testing"
    }]
}, {
    id: "test-session-lifecycle",
    name: "Session Lifecycle Test",
    description: "Test complete session lifecycle with status transitions.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://playwright.dev/"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Task - Step 1"
    }, {
        type: "browser_action",
        action: {
            browser_scroll_down: {
                to_end: !0,
                target: "page"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Task - Step 2"
    }, {
        type: "browser_action",
        action: {
            browser_scroll_up: {
                to_end: !0,
                target: "page"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Task - Step 3"
    }, {
        type: "browser_action",
        action: {
            browser_view: {}
        }
    }, {
        type: "session_status",
        status: "stopped"
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Task - Step 4"
    }, {
        type: "browser_action",
        action: {
            browser_scroll_down: {
                to_end: !0,
                target: "page"
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "google-search-scroll",
    name: "Google Search Scroll Test",
    description: "Navigate to Google search and test scroll to bottom and top.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://www.google.com/search?q=she"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Google search scroll test"
    }, {
        type: "browser_action",
        action: {
            browser_scroll_down: {
                to_end: !0,
                target: "page"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_scroll_up: {
                to_end: !0,
                target: "page"
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "google-search-scroll-pixels",
    name: "Google Search Scroll",
    description: "Navigate to Google search and test scrolling by viewport height.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://www.google.com/search?q=she"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Google search scroll test"
    }, {
        type: "browser_action",
        action: {
            browser_scroll_down: {
                target: "container",
                coordinate_x: 600,
                coordinate_y: 400,
                viewport_height: 1200,
                viewport_width: 800
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_scroll_down: {
                target: "container",
                coordinate_x: 600,
                coordinate_y: 400,
                viewport_height: 1200,
                viewport_width: 800
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_scroll_up: {
                target: "container",
                coordinate_x: 600,
                coordinate_y: 400,
                viewport_height: 1200,
                viewport_width: 800
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "baidu-search-and-scroll",
    name: "Baidu Search and Scroll",
    description: "Navigate to Baidu search results for 人工智能",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://www.baidu.com/s?wd=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Baidu Search and Scroll"
    }, {
        type: "browser_action",
        action: {
            browser_scroll_down: {
                target: "page"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_scroll_down: {
                to_end: !0,
                target: "page"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_scroll_up: {
                target: "page"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_scroll_up: {
                to_end: !0,
                target: "page"
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "youtube-search-jj-lin",
    name: "YouTube Scroll",
    description: "Navigate to YouTube search results for 林俊杰 and test full scroll cycle: down to bottom, scroll up, then to top.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://www.youtube.com/results?search_query=%E6%9E%97%E4%BF%8A%E6%9D%B0"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "YouTube Scroll Test"
    }, {
        type: "browser_action",
        action: {
            browser_scroll_down: {
                to_end: !0,
                target: "page"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_scroll_up: {
                target: "page"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_scroll_up: {
                to_end: !0,
                target: "page"
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "youtube-scroll-pagekey",
    name: "YouTube News Scroll by Page Up/Down",
    description: "Youtube News Channel Page Down and Page Up keys scrolling.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://www.youtube.com/channel/UCYfdidRxbB8Qhf0Nx7ioOYw,"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "YouTube Page Up/Down Test"
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "PageDown"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "PageDown"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "PageDown"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "PageUp"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "PageUp"
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "playground-click-test",
    name: "Local Playground Click Test",
    description: "Navigate to playground click-playground page and click all 6 buttons sequentially at their center points (viewport coordinates).",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "http://localhost:5173/click-playground"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Click playground test"
    }, {
        type: "browser_action",
        action: {
            browser_click: {
                coordinate_x: 140,
                coordinate_y: 188
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_click: {
                coordinate_x: 140,
                coordinate_y: 288
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_click: {
                coordinate_x: 140,
                coordinate_y: 388
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_click: {
                coordinate_x: 290,
                coordinate_y: 188
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_click: {
                coordinate_x: 290,
                coordinate_y: 288
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_click: {
                coordinate_x: 290,
                coordinate_y: 388
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "full-keyboard-test",
    name: "完整键盘测试",
    description: "Test all keyboard keys sequentially on keyboard tester website.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://www.zfrontier.com/lab/keyboardTester"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Full Keyboard Test"
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Escape"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F1"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F2"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F3"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F4"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F5"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F6"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F7"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F8"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F9"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F10"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F11"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F12"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "`"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "1"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "2"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "3"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "4"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "5"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "6"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "7"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "8"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "9"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "0"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "-"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "="
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Backspace"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Tab"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Q"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "W"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "E"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "R"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "T"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Y"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "U"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "I"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "O"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "P"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "["
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "]"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "\\"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "CapsLock"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "A"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "S"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "D"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "G"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "H"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "J"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "K"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "L"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: ";"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "'"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Enter"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Z"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "X"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "C"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "V"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "B"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "N"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "M"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: ","
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "."
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "/"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Shift"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Control"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Alt"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Meta"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: " "
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Insert"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Home"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "PageUp"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Delete"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "End"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "PageDown"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "ArrowUp"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "ArrowDown"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "ArrowLeft"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "ArrowRight"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Numpad0"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Numpad1"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Numpad2"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Numpad3"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Numpad4"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Numpad5"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Numpad6"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Numpad7"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Numpad8"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Numpad9"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "NumpadDivide"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "NumpadMultiply"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "NumpadSubtract"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "NumpadAdd"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "NumpadDecimal"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "NumpadEnter"
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}, {
    id: "key-combinations-test",
    name: "组合键测试",
    description: "Test various key combinations including Command+End, Control+A, Shift+End, etc.",
    steps: [{
        type: "browser_action",
        action: {
            browser_navigate: {
                url: "https://www.zfrontier.com/lab/keyboardTester"
            }
        }
    }, {
        type: "session_status",
        status: "running",
        sessionTitle: "Key Combinations Test"
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Command+End"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Command+Home"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Shift+End"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Shift+ArrowLeft"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Shift+ArrowRight"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Control+Shift+A"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Cmd+A"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Ctrl+C"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Alt+ArrowLeft"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F1"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "F5"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Control+F5"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Meta+F1"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Shift+F10"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Alt+F4"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Control+F12"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Enter"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "Escape"
            }
        }
    }, {
        type: "browser_action",
        action: {
            browser_press_key: {
                key: "ArrowDown"
            }
        }
    }, {
        type: "session_status",
        status: "stopped"
    }]
}];

function Ni(e) {
    return Oi.find(r => r.id === e)
}
const Ai = xr("SocketHelper");

function Ri(e) {
    if (e.browser_navigate) {
        if (!e.browser_navigate.url) throw new Error("browser_navigate missing url");
        return {
            type: "browser_navigate",
            url: e.browser_navigate.url
        }
    }
    if (e.browser_click) {
        const {
            click_type: n,
            index: t,
            coordinate_x: i,
            coordinate_y: s,
            selector: o,
            viewport_height: a,
            viewport_width: u,
            browser_viewport_height: c,
            browser_viewport_width: _
        } = e.browser_click;
        return {
            type: "browser_click",
            target: Lt({
                index: t,
                coordinateX: i,
                coordinateY: s,
                selector: o,
                viewportHeight: a || c,
                viewportWidth: u || _
            }),
            clickType: n
        }
    }
    if (e.browser_input) {
        const {
            selector: n,
            index: t,
            coordinate_x: i,
            coordinate_y: s,
            text: o,
            press_enter: a,
            viewport_height: u,
            viewport_width: c,
            browser_viewport_height: _,
            browser_viewport_width: p
        } = e.browser_input;
        return {
            type: "browser_input",
            target: Lt({
                selector: n,
                index: t,
                coordinateX: i,
                coordinateY: s,
                viewportHeight: u || _,
                viewportWidth: c || p
            }),
            text: o,
            pressEnter: !!a
        }
    }
    if (e.browser_press_key) return {
        type: "browser_press_key",
        key: e.browser_press_key.key
    };
    const r = Ei(e);
    if (r) return r;
    if (e.browser_find_keyword) return {
        type: "browser_find_keyword",
        keyword: e.browser_find_keyword.keyword
    };
    if (e.browser_view) return {
        type: "browser_view"
    };
    if (e.browser_move_mouse) {
        const {
            coordinate_x: n,
            coordinate_y: t,
            viewport_width: i,
            viewport_height: s,
            browser_viewport_height: o,
            browser_viewport_width: a
        } = e.browser_move_mouse;
        return {
            type: "browser_move_mouse",
            coordinateX: n,
            coordinateY: t,
            viewportWidth: i || a,
            viewportHeight: s || o
        }
    }
    throw Ai.error("Received unsupported browser action", {
        wrapper: e
    }), new Error("Unsupported browser action in payload")
}
const Si = {
    browser_scroll_up: "up",
    browser_scroll_down: "down",
    browser_scroll_left: "left",
    browser_scroll_right: "right"
};

function Ei(e) {
    if (e.browser_scroll) {
        const {
            direction: r,
            target: n,
            to_end: t,
            coordinate_x: i,
            coordinate_y: s,
            viewport_height: o,
            viewport_width: a,
            browser_viewport_height: u,
            browser_viewport_width: c
        } = e.browser_scroll;
        return {
            type: "browser_scroll",
            direction: r,
            toEnd: !!t,
            target: n,
            coordinateX: i,
            coordinateY: s,
            viewportHeight: o || u,
            viewportWidth: a || c
        }
    }
    for (const [r, n] of Object.entries(Si)) {
        const t = e[r];
        if (t) {
            const {
                target: i,
                to_end: s,
                coordinate_x: o,
                coordinate_y: a,
                viewport_height: u,
                viewport_width: c,
                browser_viewport_height: _,
                browser_viewport_width: p
            } = t;
            return {
                type: "browser_scroll",
                direction: n,
                toEnd: !!s,
                target: i,
                coordinateX: o,
                coordinateY: a,
                viewportHeight: u || _,
                viewportWidth: c || p
            }
        }
    }
    return null
}

function Lt(e) {
    const {
        index: r,
        coordinateX: n,
        coordinateY: t,
        selector: i,
        viewportWidth: s,
        viewportHeight: o
    } = e;
    if (i) return {
        strategy: "bySelector",
        selector: i
    };
    if (typeof r == "number" && Number.isFinite(r)) return {
        strategy: "byIndex",
        index: r
    };
    if (typeof n == "number" && typeof t == "number") return {
        strategy: "byCoordinates",
        coordinateX: n,
        coordinateY: t,
        viewportHeight: o,
        viewportWidth: s
    };
    throw new Error("Action target missing index or coordinates")
}

function Bi(e) {
    return e != null && e.elements ? e.elements.slice(0, 500).map(r => `${r.index}[:]{${r.description}}`).join(`
`) : ""
}
export {
    ji as L, Pi as M, z as R, Ni as a, Mi as b, Ri as c, le as d, Bi as f, Ci as g, Di as m, y as o, xi as r, Oi as t
};