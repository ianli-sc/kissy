/**
 * insert swf into document in an easy way
 * @author yiminghe@gmail.com, oicuicu@gmail.com
 */
KISSY.add('swf', function (S, DOM, JSON, Base, FlashUA, undefined) {

    var UA = S.UA,
        TYPE = 'application/x-shockwave-flash',
        CID = 'clsid:d27cdb6e-ae6d-11cf-96b8-444553540000',
        FLASHVARS = 'flashvars',
        EMPTY = '',
        SPACE = ' ',
        EQUAL = '=',
        DOUBLE_QUOTE = '"',
        LT = '<',
        GT = '>',
        doc = S.Env.host.document,
        fpv = FlashUA.fpv,
        fpvGEQ = FlashUA.fpvGEQ,
        OBJECT_TAG = 'object',
        encode = encodeURIComponent,

    // flash player 的参数范围
        PARAMS = {
            // swf 传入的第三方数据。支持复杂的 Object / XML 数据 / JSON 字符串
            // flashvars: EMPTY,
            wmode: EMPTY,
            allowscriptaccess: EMPTY,
            allownetworking: EMPTY,
            allowfullscreen: EMPTY,

            // 显示 控制 删除
            play: 'false',
            loop: EMPTY,
            menu: EMPTY,
            quality: EMPTY,
            scale: EMPTY,
            salign: EMPTY,
            bgcolor: EMPTY,
            devicefont: EMPTY,
            hasPriority: EMPTY,

            //	其他控制参数
            base: EMPTY,
            swliveconnect: EMPTY,
            seamlesstabbing: EMPTY
        };

    /**
     * insert a new swf into container
     * @class KISSY.SWF
     */
    function SWF(config) {
        var self = this;
        SWF.superclass.constructor.apply(self, arguments);
        var expressInstall = self.get('expressInstall'),
            swf,
            html,
            id,
            htmlMode = self.get('htmlMode'),
            flashVars,
            params = self.get('params'),
            attrs = self.get('attrs'),
            doc = self.get('document'),
            placeHolder = DOM.create('<span>', undefined, doc),
            elBefore = self.get('elBefore'),
            installedSrc = self.get('src'),
            version = self.get('version');

        id = attrs.id = attrs.id || S.guid('ks-swf-');

        // 2. flash 插件没有安装
        if (!fpv()) {
            self.set('status', SWF.STATUS.NOT_INSTALLED);
            return;
        }

        // 3. 已安装，但当前客户端版本低于指定版本时
        if (version && !fpvGEQ(version)) {
            self.set('status', SWF.STATUS.TOO_LOW);

            // 有 expressInstall 时，将 src 替换为快速安装
            if (expressInstall) {
                installedSrc = expressInstall;
                // from swfobject
                if (!('width' in attrs) ||
                    (!/%$/.test(attrs.width) && parseInt(attrs.width, 10) < 310)) {
                    attrs.width = "310";
                }
                if (!('height' in attrs) ||
                    (!/%$/.test(attrs.height) && parseInt(attrs.height, 10) < 137)) {
                    attrs.height = "137";
                }
                flashVars = params.flashVars = params.flashVars || {};
                S.mix(flashVars, {
                    MMredirectURL: location.toString,
                    MMplayerType: UA.ie ? "ActiveX" : "PlugIn",
                    MMdoctitle: doc.title.slice(0, 47) + " - Flash Player Installation"
                });
            }
        }

        if (htmlMode == 'full') {
            html = _stringSWFFull(installedSrc, attrs, params)
        } else {
            html = _stringSWFDefault(installedSrc, attrs, params)
        }

        // ie 再取  target.innerHTML 属性大写，很多多与属性，等
        self.set('html', html);

        if (elBefore) {
            DOM.insertBefore(placeHolder, elBefore);
        } else {
            DOM.append(placeHolder, self.get('render'));
        }

        if ('outerHTML' in placeHolder) {
            placeHolder.outerHTML = html;
        } else {
            placeHolder.parentNode.replaceChild(placeHolder, DOM.create(html));
        }

        swf = DOM.get('#' + id, doc);

        self.set('swfObject', swf);

        if (htmlMode == 'full') {
            if (UA.ie) {
                self.set('swfObject', swf);
            } else {
                self.set('swfObject', swf.parentNode);
            }
        }

        // bug fix: 重新获取对象,否则还是老对象.
        // 如 入口为 div 如果不重新获取则仍然是 div	longzang | 2010/8/9
        self.set('el', swf);

        if (!self.get('status')) {
            self.set('status', SWF.STATUS.SUCCESS);
        }
    }

    S.extend(SWF, Base, {
        /**
         * Calls a specific function exposed by the SWF 's ExternalInterface.
         * @param func {String} the name of the function to call
         * @param args {Array} the set of arguments to pass to the function.
         */
        'callSWF': function (func, args) {
            var swf = this.get('el'),
                ret,
                params;
            args = args || [];
            try {
                if (swf[func]) {
                    ret = swf[func].apply(swf, args);
                }
            } catch (e) {
                // some version flash function is odd in ie: property or method not supported by object
                params = "";
                if (args.length !== 0) {
                    params = "'" + args.join("', '") + "'";
                }
                //avoid eval for compression
                ret = (new Function('swf', 'return swf.' + func + '(' + params + ');'))(swf);
            }
            return ret;
        },
        /**
         * remove its container and swf element from dom
         */
        destroy: function () {
            var self = this;
            self.detach();
            var swfObject = self.get('swfObject');
            /* Cross-browser SWF removal
             - Especially needed to safely and completely remove a SWF in Internet Explorer
             */
            if (UA.ie) {
                swfObject.style.display = 'none';
                // from swfobject
                //
                (function () {
                    if (swfObject.readyState == 4) {
                        removeObjectInIE(swfObject);
                    }
                    else {
                        setTimeout(arguments.callee, 10);
                    }
                })();
            } else {
                swfObject.parentNode.removeChild(swfObject);
            }
        }
    }, {
        ATTRS: {

            /**
             * express install swf url.
             * Defaults to: swfobject 's express install
             * @cfg {String} expressInstall
             */
            /**
             * @ignore
             */
            expressInstall: {
                value: S.config('base') + 'swf/assets/expressInstall.swf'
            },

            /**
             * new swf 's url
             * @cfg {String} src
             */
            /**
             * @ignore
             */
            src: {

            },

            /**
             * minimum flash version required. eg: "10.1.250"
             * Defaults to "9".
             * @cfg {String} version
             */
            /**
             * @ignore
             */
            version: {
                value: "9"
            },

            /**
             * params for swf element
             *  - params.flashVars
             * @cfg {Object} params
             */
            /**
             * @ignore
             */
            params: {
                value: {}
            },

            /**
             * attrs for swf element
             * @cfg {Object} attrs
             */
            /**
             * @ignore
             */
            attrs: {
                value: {}
            },
            /**
             * container where flash will be appended.
             * Defaults to: body
             * @cfg {HTMLElement}
             */
            /**
             * @ignore
             */
            render: {
                setter: function (v) {
                    if (typeof v == 'string') {
                        v = DOM.get(v, this.get('document'));
                    }
                    return v;
                },
                valueFn: function () {
                    return document.body;
                }
            },
            /**
             * element where flash will be inserted before.
             * @cfg {HTMLElement}
             */
            /**
             * @ignore
             */
            elBefore: {
                setter: function (v) {
                    if (typeof v == 'string') {
                        v = DOM.get(v, this.get('document'));
                    }
                    return v;
                }
            },

            /**
             * html document current swf belongs.
             * Defaults to: current document
             * @cfg {HTMLElement}
             */
            /**
             * @ignore
             */
            document: {
                value: doc
            },

            /**
             * status of current swf
             * @property {String}
             * @type {KISSY.SWF.STATUS}
             * @readonly
             */
            /**
             * @ignore
             */
            status: {

            },

            /**
             * swf element
             * @property swf
             * @type {HTMLElement}
             */
            /**
             * @ignore
             */
            el: {

            },

            /**
             * @ignore
             * @private
             */
            swfObject: {

            },

            /**
             * swf element 's outerHTML
             * @property html
             * @type {String}
             * @readonly
             */
            /**
             * @ignore
             */
            html: {

            },

            /**
             *  full or default(depends on browser object)
             *  !TODO
             */
            htmlMode: {

            }
        },

        fpv: fpv,
        fpvGEQ: fpvGEQ
    });

    function removeObjectInIE(obj) {
        for (var i in obj) {
            if (typeof obj[i] == "function") {
                obj[i] = null;
            }
        }
        obj.parentNode.removeChild(obj);
    }

    function getSrcElements(swf) {
        var url = "",
            params, i, param,
            elements = [],
            nodeName = DOM.nodeName(swf);
        if (nodeName == "object") {
            url = DOM.attr(swf, "data");
            if (url) {
                elements.push(swf);
            }
            params = swf.childNodes;
            for (i = 0; i < params.length; i++) {
                param = params[i];
                if (param.nodeType == 1) {
                    if ((DOM.attr(param, "name") || "").toLowerCase() == "movie") {
                        elements.push(param);
                    } else if (DOM.nodeName(param) == "embed") {
                        elements.push(param);
                    } else if (DOM.nodeName(params[i]) == "object") {
                        elements.push(param);
                    }
                }
            }
        } else if (nodeName == "embed") {
            elements.push(swf);
        }
        return elements;
    }

    // setSrc ie 不重新渲染
    /**
     * get src from existing oo/oe/o/e swf element
     * @param {HTMLElement} swf
     * @returns {String}
     * @static
     * @method KISSY.SWF.getSrc
     */
    SWF.getSrc = function (swf) {
        swf = DOM.get(swf);
        var srcElement = getSrcElements(swf)[0],
            src,
            nodeName = srcElement && DOM.nodeName(srcElement);
        if (nodeName == 'embed') {
            return DOM.attr(srcElement, 'src');
        } else if (nodeName == 'object') {
            return DOM.attr(srcElement, 'data');
        } else if (nodeName == 'param') {
            return DOM.attr(srcElement, 'value');
        }
        return null;
    };

    function collectionParams(params) {
        var par = EMPTY;
        S.each(params, function (v, k) {
            k = k.toLowerCase();
            if (k in PARAMS) {
                par += stringParam(k, v);
            }
            // 特殊参数
            else if (k == FLASHVARS) {
                par += stringParam(k, toFlashVars(v));
            }
        });
        return par;
    }


    function _stringSWFDefault(src, attrs, params) {
        return _stringSWF(src, attrs, params, UA.ie) + LT + '/' + OBJECT_TAG + GT;
    }

    function _stringSWF(src, attrs, params, ie) {
        var res,
            attr = EMPTY,
            par = EMPTY;

        if (ie == undefined) {
            ie = UA.ie;
        }

        // 普通属性
        S.each(attrs, function (v, k) {
            attr += stringAttr(k, v);
        });

        if (ie) {
            attr += stringAttr('classid', CID);
            par += stringParam('movie', src);
        } else {
            // 源
            attr += stringAttr('data', src);
            // 特殊属性
            attr += stringAttr('type', TYPE);
        }

        par += collectionParams(params);

        res = LT + OBJECT_TAG + attr + GT + par;

        return res
    }

    // full oo 结构
    function _stringSWFFull(src, attrs, params) {
        var outside, inside;
        if (UA.ie) {
            outside = _stringSWF(src, attrs, params, 1);
            delete attrs.id;
            delete attrs.style;
            inside = _stringSWF(src, attrs, params, 0);
        } else {
            inside = _stringSWF(src, attrs, params, 0);
            delete attrs.id;
            delete attrs.style;
            outside = _stringSWF(src, attrs, params, 1);
        }
        return outside + inside + LT + '/' + OBJECT_TAG + GT + LT + '/' + OBJECT_TAG + GT;
    }

    /*
     将普通对象转换为 flashvars
     eg: {a: 1, b: { x: 2, z: 's=1&c=2' }} => a=1&b=encode({"x":2,"z":"s%3D1%26c%3D2"})
     */
    function toFlashVars(obj) {
        var arr = [],
            ret;

        S.each(obj, function (data, prop) {
            if (typeof data != 'string') {
                data = JSON.stringify(data);
            }
            if (data) {
                arr.push(prop + '=' + encode(data));
            }
        });
        ret = arr.join('&');
        return ret;
    }

    function stringParam(key, value) {
        return '<param name="' + key + '" value="' + value + '"></param>';
    }

    function stringAttr(key, value) {
        return SPACE + key + EQUAL + DOUBLE_QUOTE + value + DOUBLE_QUOTE;
    }

    /**
     * swf status
     * @enum {String} KISSY.SWF.STATUS
     */
    SWF.STATUS = {
        /**
         * flash version is too low
         */
        TOO_LOW: 'flash version is too low',
        /**
         * flash is not installed
         */
        NOT_INSTALLED: 'flash is not installed',
        /**
         * success
         */
        SUCCESS: 'success'
    };

    return SWF;
}, {
    requires: ['dom', 'json', 'base', 'swf/ua']
});