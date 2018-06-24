/**
 * 数据响应观察
 * Created by xiyuan on 18-6-15.
 */

// 源数据计数器
var originCount = 0;

// 数据观察资源
const proxyStorage = {};

// 源数据存储
const originDataStorage = [];

// 源数据对应的观察索引信息
const originDataIndexStorage = [];

// 源数据对应的观察索引信息
const originDataMapStorage = [];

// 可使用的源数据位置
const usableLocation = [];

/**
 * 全局唯一id生成
 * @returns {*}
 */
function uid() {
    function n() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    return n() + n() + n() + n() + n() + n() + n() + n();
}

/**
 * 数据类型获取
 * @param data
 * @returns {*}
 */
function getType(data) {
    return {}.toString.call(data).match(/object\s+(\w*)/)[1]
}

/**
 * 检查是否成员数据 即可被观察
 * @param data
 * @param isType
 * @returns {boolean}
 */
function isMemberData(data, isType) {
    switch (isType ? data : getType(data)) {
        case 'Object':
        case 'Array':
            return true;
        default:
            return false
    }
}

/**
 * 实例对比
 * @param L 表示左表达式
 * @param R 表示右表达式
 * @returns {boolean}
 */
function isInstance(L, R) {//L 表示左表达式，R 表示右表达式
    var O = R.prototype;// 取 R 的显示原型
    L = L.__proto__;// 取 L 的隐式原型
    while (true) {
        if (L === null)
            return false;
        if (O === L)// 这里重点：当 O 严格等于 L 时，返回 true
            return true;
        L = L.__proto__;
    }
}

/**
 * 获取源数据观察索引信息
 * @param obj
 * @returns {*}
 */
function getOriginIndexInfo(obj) {
    var originList = [];
    var len = originDataStorage.length;
    for (var i = 0; i < len; i++) {
        originList = originDataStorage[i];
        var jlen = originList.length;
        for (var j = 0; j < jlen; j++) {
            if (obj === originList[j]) {
                return originDataIndexStorage[i][j];
            }
        }
    }
}

/**
 * 获取源数据观察信息
 * @param obj
 * @returns {*}
 */
function getOriginMapInfo(obj) {
    var index = getOriginIndexInfo(obj);
    if (index) {
        var len = originDataMapStorage.length;
        for (var i = 0; i < len; i++) {
            if (originDataMapStorage[i][index]) {
                return originDataMapStorage[i][index]
            }
        }
    }
}

/**
 * 存储观察信息数据
 * @param {listenNode} listenNode
 */
function addOriginInfo(listenNode) {
    // 检查是否对象 否则不进行关联处理
    if (!isMemberData(listenNode.describe.type, true)) return;

    // 获取源数据映射信息
    var originMapInfo = getOriginMapInfo(listenNode.targetData);
    if (originMapInfo) {
        // 对监听的数据节点进行源数据关联
        listenNode.originMapInfo = originMapInfo
        // 检查在源数据节点集合中是否存在此监听节点
        var index = originMapInfo.list.indexOf(listenNode);
        // 如果不存在则加入
        index === -1 && originMapInfo.list.push(listenNode);

        // 检查是否有可用的位置
    } else if (usableLocation.length) {
        var locationInfo = usableLocation.shift();
        originDataStorage[locationInfo.one][locationInfo.two] = listenNode.targetData;
        originDataIndexStorage[locationInfo.one][locationInfo.two] = locationInfo.key;
        // 存入源数据对应的观察索引信息
        originDataMapStorage[locationInfo.one][locationInfo.key] = {
            targetData: listenNode.targetData,
            list: [listenNode],
            index: locationInfo
        };
    } else {
        var index;
        var list = [];
        var List = [];
        var location = 0;

        originCount++;

        if (originDataStorage.length) {
            location = originDataStorage.length - 1;
            list = originDataStorage[location];
            List = originDataIndexStorage[location];

            // 检查容器是否存放满
            if (list.length === 15000) {
                list = [];
                List = [];
                originDataStorage.push(list);
                originDataIndexStorage.push(List);
            }
        } else {
            location = 0;
            originDataStorage.push(list);
            originDataIndexStorage.push(List);
        }

        List.push(originCount);
        index = list.push(listenNode.targetData) - 1;

        // 存入源数据对应的观察索引信息
        var originInfo = {
            targetData: listenNode.targetData,
            list: [listenNode],
            index: {
                one: location,
                two: index,
                key: originCount
            }
        };

        location = originDataMapStorage.length - 1;

        var containerStorage = originDataMapStorage[location];

        // 检查数据源信息存储是否已满
        if (!Object.keys(containerStorage || {}).length % 15000) {
            originDataMapStorage.push(containerStorage = {});
        }
        containerStorage[originCount] = originInfo;
    }
}

/**
 * 移除对应的观察信息数据
 * @param {listenNode | Object} data
 */
function removeOriginInfo(data) {
    var originMapInfo;
    // 检查是否listenNode实例
    if (isInstance(data, listenNode)) {
        originMapInfo = data.originMapInfo;
        if (!originMapInfo || data.isRoot) return;
        var index = originMapInfo.list.indexOf(data);
        if (index !== -1) originMapInfo.list.splice(index, 1);
        // 移除关联
        delete data.originMapInfo;
        // 检查源数据中是否还存在数据监听节点
        if (originMapInfo.list.length) return;
    } else {
        originMapInfo = getOriginMapInfo(data)
    }
    // 移除关联的监听节点
    originMapInfo.list.forEach(function (listenNode) {
        delete listenNode.originMapInfo;
    })

    // 记录可使用的位置
    usableLocation.push(originMapInfo.index);

    // 移除 originDataIndexStorage、originDataStorage中的源数据标识
    delete originDataStorage[originMapInfo.index.one][originMapInfo.index.two];
    delete originDataIndexStorage[originMapInfo.index.one][originMapInfo.index.two];
    delete originMapInfo.list;
    delete originMapInfo.index;
    delete originMapInfo.targetData;
}

/**
 * 字符串KEY分解
 * @param keyString
 * @returns {{nowKey: string, keyString: string | *}}
 */
function resolveKey(keyString) {
    var nowKey = '';
    keyString = (String(keyString) || '').replace(/^\[([^.\]]+)\]|^\.?([^.\[\]]+)/, function (str, arrKey, objKey) {
        //匹配提取[key]或.key 这两种形式的key 并去除key外部的单引号或双引号
        nowKey = (arrKey || objKey).match(/^(['"]?)([\s\S]+)\1$/).pop();
        return '';
    });
    return {
        nowKey: nowKey,
        keyString: keyString,
    }
}

/**
 * 对key进行序列化
 * @param key
 * @returns {string}
 */
function getNormKey(key) {
    var keyInfo = resolveKey(key)
    if (keyInfo.keyString) {
        return keyInfo.nowKey + '.' + getNormKey(keyInfo.keyString)
    }
    return keyInfo.nowKey;
}

/**
 * 递归key
 * @param key
 * @param callback
 * @returns {*|string}
 */
function recursionKey(key, callback) {
    var keyInfo = resolveKey(key);
    //递归查找
    return callback(keyInfo.nowKey, keyInfo.keyString) && (keyInfo.keyString || keyInfo.nowKey) && recursionKey(keyInfo.keyString, callback);
}

/**
 * 获取key的最后一层对象
 * @param obj
 * @param key
 * @returns {*}
 */
function loopGetLastObj(obj, key) {
    //检查传递的数据是否是对象
    if (typeof obj !== 'object' || obj === null) {
        return;
    }
    var keyInfo = resolveKey(key);
    // 检查是否递归完毕
    if (keyInfo.keyString) {
        return loopGetLastObj(obj[keyInfo.nowKey], keyInfo.keyString)
    }
    return {
        obj: obj,
        key: keyInfo.nowKey
    }
}

/**
 * 组装数据的完整性、并获取最后一次可用的
 * @param obj
 * @param key
 * @param data
 * @param parentObj
 * @param parentKey
 * @param useObj
 * @param useKey
 * @returns {*}
 */
function completeLoopLastObj(obj, key, data, parentObj, parentKey, useObj, useKey, afterKey) {
    var keyInfo = resolveKey(key);

    //检查传递的数据是否是对象
    if (typeof obj !== 'object' || obj === null) {
        parentObj[parentKey] = obj = {};
        // 检查是否有标识可用的数据
        if (!useObj) {
            useObj = parentObj;
            useKey = parentKey;
            afterKey = keyInfo.keyString;
        }
    }

    // 检查是否递归完毕
    if (keyInfo.keyString) {
        return completeLoopLastObj(obj[keyInfo.nowKey], keyInfo.keyString, data, obj, keyInfo.nowKey, useObj, useKey, afterKey)
    } else {
        obj[keyInfo.nowKey] = data;
    }

    return {
        obj: obj,
        key: keyInfo.nowKey,
        useObj: useObj || obj,
        useKey: useKey || keyInfo.nowKey,
        afterKey: afterKey || ''
    }
}

/**
 * 获取数据描述
 * @param targetData
 * @returns {{type: *, keys: string, string: string}}
 */
function getDescribe(targetData) {
    var isEmpty = targetData === undefined || targetData === null;
    return {
        // 数据类型
        type: getType(targetData),
        // 数据keys
        keys: isEmpty ? '' : Object.keys(targetData).join(','),
        // 数据string
        string: isEmpty ? 'empty' : (targetData).toString()
    }
}

/**
 * 检查数据描述是否一致
 * @param describe
 * @param data
 * @returns {boolean}
 */
function describeDiff(describe, data) {
    var equal = false;
    var targetDescribe = getDescribe(data);
    if (describe.type === targetDescribe.type && describe.keys === targetDescribe.keys && describe.string === targetDescribe.string) {
        equal = true;
    }
    return equal;
}

/**
 * 检查子节点是否有监听
 * @param {listenNode} listenNode
 * @returns {boolean}
 */
function checkChildListen(listenNode) {

    var i = ~0,
        key,
        isUse,
        nowListen,
        childKeys = Object.keys(listenNode.child),
        len = childKeys.length;

    //检查当前节点是否有监听
    isUse = listenNode.listens.length || listenNode.listensRead.length;

    if (isUse) return true;

    while (++i < len) {
        key = childKeys[i];
        nowListen = listenNode.child[key];
        // 递归检查
        if (checkChildListen(nowListen)) return true;
    }
    return false;
}

/**
 * 检查父节点是否存在监听的节点
 * @param listenNode
 * @returns {*}
 */
function checkParentListen(listenNode) {
    // 检查当前节点是否存在监听
    if (!listenNode.listens.length && !listenNode.listensRead.length) {
        // 递归检查
        if (listenNode.parent) return checkParentListen(listenNode.parent);
        return listenNode;
    }
    return false;
}

/**
 * 数据监听节点
 * @param parentListen
 * @param nowKey
 */
function listenNode(parentListen, nowKey) {
    //子级数据
    this.child = {};
    //监听的回调集合
    this.listens = [];
    //监听数据读取的回调集合
    this.listensRead = [];
    //检查传递数据类型
    if (isInstance(parentListen, listenNode)) {
        //父级监听数据
        this.parent = parentListen;
        if (nowKey) {
            //当前节点key
            this.nowKey = nowKey;
            this.parentData = parentListen.targetData;
            //当前节点目标数据
            this.targetData = (this.parentData || {})[nowKey];
            // 更新节点数据的描述
            this.describeUpdate();
            //标识有数据
            this.isData = this.targetData !== undefined;
        }
    } else {
        this.targetData = parentListen;
        // 更新节点数据的描述
        this.describeUpdate();
        switch (this.describe.type) {
            case 'Object':
            case 'Array':
                // 存储观察信息数据
                addOriginInfo(this);
                break;
            default:
                //标识初始化是否有数据
                this.isData = parentListen !== undefined;
        }
    }
}

listenNode.prototype = {
    /**
     * 数据节点信息更新
     * @param targetData
     */
    describeUpdate: function (targetData) {
        targetData = targetData || this.targetData;
        // 数据节点描述
        this.describe = getDescribe(targetData);
        // 关联新的源数据信息 检查是否需要监听
        (Object.keys(this.child).length || this.listens.length || this.listensRead) && addOriginInfo(this);
    },

    /**
     * 检查所有观察的同一数据子节点如有改变则进行全部比对处理
     * @param key  子节点的key
     * @param data 子节点对应的值
     */
    inspectionChild: function (key, data) {
        var childListenNode = key ? this.child[key] : this;
        // 检查是否有对应的子级数据
        if (!childListenNode) return;
        var describe = childListenNode.describe;
        // 检查子节点的数据是否一致
        var equal = describeDiff(describe, data);

        // 检查数据是否同一对象
        if (!equal || data !== childListenNode.targetData || !key) {
            // 利用父节点的对象特性获取同一数据的所有listenNode,再对子节点进行更换源，并触发watch
            if (this.originMapInfo) {
                this.originMapInfo.list.forEach(function (listenNode) {
                    // 检查是否拥有子节点监听节点
                    if (childListenNode = key ? listenNode.child[key] : listenNode) {
                        childListenNode.inspection(key ? data[key] : data, !key);
                    }
                })
            } else {
                this.inspection(data, !key);
            }
        }
    },
    /**
     * 检查所有观察的同一数据如有改变则进行全部比对处理
     * @param data
     * @param isCheck
     */
    inspection: function (data, isCheck) {
        var child = this.child;
        var describe = this.describe;
        var oldData = this.targetData;
        var targetData = arguments.length ? data : this.targetData;
        // 检查数据是否有更变
        var equal = describeDiff(describe, data);
        // 检查数据是否同一对象
        if (!equal || targetData !== oldData || isCheck) {
            this.targetData = targetData;
            // 重新赋值、并与父节点进行关联
            if (targetData && this.parent) this.parent.targetData[this.nowKey] = this.parent.targetData[this.nowKey] = targetData;
            // 进行子节点的变化对比
            Object.keys(child).forEach(function (key) {
                child[key].inspection(targetData ? targetData[key] : targetData, isCheck);
            });
            // 移除并变更 源数据观察信息
            if (this.originMapInfo) {
                // 移除关联的源数据信息
                removeOriginInfo(this);
            }
            // 更新数据描述
            this.describeUpdate();
            // 数据不一致则触发watch
            equal || this.emit(oldData);
        }
    },
    /**
     * 添加监听
     * @param fn
     */
    watch: function (fn) {
        this.listens.push(fn);
        return this;
    },
    /**
     * 添加数据读取监听
     * @param fn
     */
    read: function (fn) {
        this.listensRead.push(fn);
        return this;
    },
    /**
     * 监听触发器
     * @param oldData 旧数据
     */
    emit: function (oldData) {
        var newData = this.targetData;
        // 触发监听
        this.listens.forEach(function (fn) {
            fn(newData, oldData);
        });
        // 触发数据读取监听
        this.listensRead.forEach(function (fn) {
            fn(newData, oldData);
        });
        // 清空read监听
        this.listensRead = [];
        return this;
    },
    /**
     * 移除监听
     * @param fn
     */
    remove: function (fn) {
        var listen = this;
        if (typeof fn === "function") {
            var index = this.listens.indexOf(fn);
            return index === -1 ? false : this.listens.splice(this.listens.indexOf(fn), 1)[0];
        } else {
            this.listens = [];
        }

        //所有监听移除后还原数据原有属性
        if (!this.listens.length && !Object.keys(this.child).length) {
            //此处检查子节点是否有监听,否则销毁监听节点
            if (checkChildListen(listen)) {
                return this;
            } else {
                this.destroy();
            }

            if (listen.parent) {
                var i = ~0,
                    key,
                    isUse,
                    nowListen,
                    childKeys = Object.keys(listen.parent.child),
                    len = childKeys.length;

                //检查同级元素中是否有监听
                while (++i < len) {
                    key = childKeys[i];
                    if (listen.nowKey === key) continue;
                    nowListen = listen.parent.child[key];
                    if (isUse = checkChildListen(nowListen)) break;
                }

                if (isUse) return this;

                //检查父节点上的上层是否有监听
                if (isUse = checkParentListen(listen.parent)) return isUse.destroy();

            }
        }
        return this;
    },
    /**
     * 移除read监听
     * @param fn
     */
    removeRead: function (fn) {
        if (typeof fn === "function") {
            var index = this.listensRead.indexOf(fn);
            return index === -1 ? false : this.listensRead.splice(this.listens.indexOf(fn), 1)[0];
        } else {
            this.listensRead = [];
        }
        return this;
    },
    /**
     * 添加子节点
     * @param key
     * @param listenNode
     */
    addChild: function (key, listenNode) {
        return this.child[key] = listenNode;
    },
    /**
     * 根据key获取子节点
     * @param key
     */
    getChild: function (key) {
        return key ? this.child[key] : this.child;
    },
    /**
     * 移除子节点
     * @param key
     */
    removeChild: function (key) {
        var child = this.child[key];
        return delete this.child[key] && child;
    },
    /**
     * 节点销毁
     */
    destroy: function () {
        var listen = this;

        // 移除父级关联的子节点
        this.parent && this.parent.removeChild(this.nowKey);

        // 移除源数据中关联信息
        removeOriginInfo(this);

        //检查数据 是否需要归原
        if (!this.isData && this.parentData) {
            delete this.parentData[this.nowKey];
        }

        //销毁子节点
        this.child && Object.keys(this.child).forEach(function (key) {
            listen.child[key].destroy();
        });

        //删除当前对象所有属性
        Object.keys(this).forEach(function (key) {
            delete listen[key];
        })
    }
};

/**
 * 观察代理
 * @param obj  源数据对象
 * @param forbidWriteKeys  禁止写入的key
 */
function observerProxy(obj, forbidWriteKeys) {
    addOriginInfo(this.listen = new listenNode(obj));
    // 标识是观察根路径
    this.listen.isRoot = true;
    // 存储禁止写入的key
    switch (getType(forbidWriteKeys)) {
        case 'Array':
            break;
        case 'String':
            forbidWriteKeys = forbidWriteKeys.split(',')
            break;
        default:
            forbidWriteKeys = [];
    }
    // 存入禁止写入的名单中
    this.forbidWriteKeys = forbidWriteKeys.map(function (key) {
        return getNormKey(key);
    });
}

// 观察代理原型
observerProxy.prototype = {
    /**
     * 资源设置
     * @param key
     * @param data
     */
    set: function (key, data) {
        key = getNormKey(key);

        var forbidWriteKey;
        // 检查设置的key是否存在禁止写入的名单中
        if (this.forbidWriteKeys.some(function ($key) {
            forbidWriteKey = $key;
            return key.match(new RegExp('^' + $key + '([.]|$)')) || $key.match(new RegExp('^' + key + '([.]|$)'));
        })) return console.warn('此值不可修改 ^o^ 【 key : ' + forbidWriteKey + ' 已设置为不可写 】');

        // 获取最后一个对象
        var lastObjInfo = completeLoopLastObj(this.listen.targetData, key, data);

        // 获取源数据映射的信息
        var originInfo = getOriginMapInfo(lastObjInfo.useObj);

        // 检查受影响的节点
        if (originInfo && originInfo.list.length) {
            // 获取其中一个节点进行比对处理
            originInfo.list.forEach(function (listenNode) {
                listenNode.inspectionChild(lastObjInfo.useKey, lastObjInfo.useObj);
            })
        }
        return true;
    },
    /**
     * 资源获取
     * @param key
     * @returns {*}
     */
    get: function (key) {
        // 获取最后一个对象
        var lastObjInfo = loopGetLastObj(this.listen.targetData, key);
        return lastObjInfo ? lastObjInfo.obj[lastObjInfo.key] : lastObjInfo;
    },
    /**
     * 数据读取
     * @param key
     * @param fn
     * @returns {observerProxy}
     */
    read: function (key, fn) {
        var resData,
            listen = this.listen,
            sourceObj = listen.targetData;
        if (typeof fn !== "function") {
            fn = key;
            key = ''
        }
        // 存储节点观察信息数据
        listen.originMapInfo || addOriginInfo(listen);
        //遍历监听的Key
        recursionKey(key, function (nowKey, nextKey) {
            if (nowKey) {
                var nextData = (sourceObj || {})[nowKey];
                //获取层级节点
                listen = listen.getChild(nowKey) || listen.addChild(nowKey, new listenNode(listen, nowKey));
                sourceObj = nextData;
            }
            if (!(nowKey && nextKey)) {
                resData = listen.targetData;
                //检查是否有数据 并触发回调
                if (listen.isData) {
                    fn(resData);
                } else {
                    listen.read(fn);
                }
            }
            // 存储节点观察信息数据
            listen.originMapInfo || addOriginInfo(listen);
            return nextKey;
        });

        return this;
    },
    /**
     * 新增数据监听
     * @param key
     * @param fn
     */
    addListen: function (key, fn) {
        var listen = this.listen,
            sourceObj = listen.targetData;
        if (typeof fn !== "function") {
            fn = key;
            key = ''
        }
        // 存储节点观察信息数据
        listen.originMapInfo || addOriginInfo(listen);
        //遍历监听的Key
        recursionKey(key, function (nowKey, nextKey) {
            if (nowKey) {
                var nextData = (sourceObj || {})[nowKey];
                //获取层级节点
                listen = listen.getChild(nowKey) || listen.addChild(nowKey, new listenNode(listen, nowKey));
                sourceObj = nextData;
            }
            if (!(nowKey && nextKey)) {
                listen.watch(fn);
            }
            // 存储节点观察信息数据
            listen.originMapInfo || addOriginInfo(listen);
            return nextKey;
        });
        return this;
    },
    /**
     * 读取并监听数据
     * @param key
     * @param fn
     */
    readWatch: function (key, fn) {
        var resData,
            listen = this.listen,
            sourceObj = listen.targetData;
        if (typeof fn !== "function") {
            fn = key;
            key = ''
        }

        // 存储节点观察信息数据
        listen.originMapInfo || addOriginInfo(listen);
        //遍历监听的Key
        recursionKey(key, function (nowKey, nextKey) {
            if (nowKey) {
                var nextData = (sourceObj || {})[nowKey];
                //获取层级节点
                listen = listen.getChild(nowKey) || listen.addChild(nowKey, new listenNode(listen, nowKey));
                sourceObj = nextData;
            }
            if (!(nowKey && nextKey)) {
                listen.watch(fn);
                resData = listen.targetData;
                //检查是否有数据 并触发回调
                if (listen.isData) fn(resData);
            }
            // 存储节点观察信息数据
            listen.originMapInfo || addOriginInfo(listen);
            return nextKey;
        });
        return this;
    },
    /**
     * 移除监听
     * @param key
     * @param fn
     */
    removeListen: function (key, fn) {
        var listen = this.listen;
        recursionKey(key, function (nowKey, nextKey) {
            if (nowKey) {
                listen = listen.getChild(nowKey)
            }
            if (!(nowKey && nextKey)) {
                listen && listen.remove(fn);
            }
            return nextKey;
        })
    },
    /**
     * 删除数据读取监听
     * @param key
     * @param fn
     */
    removeRead: function (key, fn) {
        var listen = this.listen;
        recursionKey(key, function (nowKey, nextKey) {
            if (nowKey) {
                listen = listen.getChild(nowKey)
            }
            if (!(nowKey && nextKey)) {
                listen && listen.removeRead(fn);
            }
            return nextKey;
        })
    },
    merge:function(drivenArray){
        // 标示当前是复合实例
        this.isMerge=true;
    },
    /**
     * 销毁观察对象
     */
    destroy: function () {
        delete this.listen.isRoot
        this.listen.destroy();
        Object.keys(this).forEach(function (key) {
            delete this[key];
        }.bind(this))
    }
};

/**
 * 数据驱动类
 * @param obj  源数据对象
 * @param {String | Array | Null } forbidWriteKeys  禁止写入的key
 * @constructor
 */
function Driven(obj, forbidWriteKeys) {
    if (isInstance(obj, Driven)) return obj.forbidWrite(forbidWriteKeys);
    proxyStorage[this.__sourceId__ = uid()] = new observerProxy(isMemberData(obj) ? obj : {}, forbidWriteKeys);
}

Driven.prototype = {
    // 标识是观察实例
    isObserver: true,
    /**
     * 数据赋值
     * @param key
     * @param data
     */
    set: function (key, data) {
        if (arguments.length === 1) {
            data = key;
            key = '';
        }
        return proxyStorage[this.__sourceId__].set(key, data);
    },
    /**
     * 获取对应的数据
     * @param key
     */
    get: function (key) {
        key = typeof key === "string" ? key : '';
        return proxyStorage[this.__sourceId__].get(key);
    },
    /**
     * 根据key读取数据
     * @param key
     * @param fn
     */
    read: function (key, fn) {
        proxyStorage[this.__sourceId__].read(key, fn);
        return this;
    },
    /**
     * 移除数据读取监听
     * @param key
     * @param fn
     */
    unRead: function (key, fn) {
        var This = this;
        [].concat(key).forEach(function (key) {
            proxyStorage[This.__sourceId__].removeRead(key, fn);
        });
        return this;
    },
    /**
     * 数据监听
     * @param watchKey
     * @param watchFn
     */
    watch: function (watchKey, watchFn) {
        var This = this;
        if (typeof watchFn !== "function") {
            watchFn = watchKey;
            watchKey = '';
        }

        [].concat(watchKey).forEach(function (key) {
            proxyStorage[This.__sourceId__].addListen(key, watchFn);
        });
        return this;
    },
    /**
     * 读取并监听数据
     * @param watchKey
     * @param watchFn
     */
    unWatch: function (watchKey, watchFn) {
        var This = this;
        if (typeof watchFn !== "function" && typeof watchKey === "function") {
            watchFn = watchKey;
            watchKey = '';
        }
        [].concat(watchKey).forEach(function (key) {
            proxyStorage[This.__sourceId__].removeListen(key, watchFn);
        });
        return this;
    },
    /**
     * 读取并监听数据
     * @param watchKey
     * @param watchFn
     */
    readWatch: function (watchKey, watchFn) {
        var This = this;
        [].concat(watchKey).forEach(function (key) {
            proxyStorage[This.__sourceId__].readWatch(key, watchFn);
        });
        return this;
    },

    /**
     * 检查数据
     */
    checked: function () {
        var listen = proxyStorage[this.__sourceId__].listen;
        listen.inspectionChild('', listen.targetData);
        return this;
    },
    /**
     * 禁止写入
     * @param {String | Array} keys
     * @returns Driven
     */
    forbidWrite: function (keys) {
        if (typeof keys !== "string") return this;
        var listen = proxyStorage[this.__sourceId__].listen;
        return new Driven(listen.targetData, keys)
    },
    /**
     * 观察实例销毁
     */
    destroy: function () {
        proxyStorage[this.__sourceId__].destroy();
        delete proxyStorage[this.__sourceId__];
        //销毁所有私有属性
        Object.keys(this).forEach(function (key) {
            delete this[key];
        }.bind(this))
    },
    /**
     * 监听实例合并
     * @param obj
     * @returns {Driven}
     */
    merge: function (obj) {
        var mergeInstance=new Driven({});
        // 合并参数并安全转换成监听实例
        proxyStorage[mergeInstance.__sourceId__].merge([this].concat(Array.prototype.slice.apply(arguments).map(function (instance) {
            return isInstance(instance, Driven)? instance:new Driven(instance);
        })));

        return mergeInstance;
    }
};