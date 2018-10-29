/**
 * 数据响应观察
 * 设计结构说明：
 * 1、此对象观察分为三部分
 *     （1） 对外暴露的类 observerDriven 提供对外的接口调用
 *     （2） 观察代理 observerProxy 类 主要作为代理来封装对应的方法来操作相关监听节点
 *     （2） 数据监听节点 listenNode 类 用于数据节点相关监听、新旧数据处理
 *
 *  2、对应的源数据利用 originDataStorage （一个二维数组，第二维空间长度为15000）来存储，并其对应的数组索引位置 通过从 originDataMapStorage 中可以获取对应数据节点的位置、源数据、和拥有的监听节点信息
 *
 * Created by xiyuan on 18-6-15.
 */

const log = console;

// 源数据计数器
var originCount = 0;

// 数据观察资源
const proxyStorage = {};

// 数据观察合并资源
const proxyMergeStorage = {};

// 数据观察临时资源
const proxyTempStorage = {};

// merge时创建的新监听实例
const proxyMergeCreateStorage = {};

// 数据观察forbidWriteKeys
const proxyForbidWriteKeys = {};

// 源数据存储
const originDataStorage = [];

// 源数据对应的观察索引信息
const originDataIndexStorage = [];

// 源数据对应的观察索引信息 （包含源数据、监听的节点、位置信息）
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
		listenNode.originMapInfo = originDataMapStorage[locationInfo.one][locationInfo.key] = {
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
		
		// 当前数据映射容器第一维目前可存放的位置
		location = originDataMapStorage.length - 1;
		
		var containerStorage = originDataMapStorage[location];
		
		// 检查数据源信息存储是否已满
		if (!Object.keys(containerStorage || {}).length % 15000) {
			originDataMapStorage.push(containerStorage = {});
		}
		listenNode.originMapInfo = containerStorage[originCount] = originInfo;
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
		// 检查源数据中是否还存在数据监听节点 如果不存在继续执行后续相关数据销毁
		if (originMapInfo.list.length) return;
	} else {
		originMapInfo = getOriginMapInfo(data)
	}
	// 移除关联的监听节点
	originMapInfo.list.forEach(function (listenNode) {
		delete listenNode.originMapInfo;
	})
	
	// 记录可使用的位置，以便下次位置可以重复使用，避免存储容器过大
	usableLocation.push(originMapInfo.index);
	
	// 移除 originDataIndexStorage、originDataStorage中的源数据标识
	delete originDataStorage[originMapInfo.index.one][originMapInfo.index.two];
	delete originDataIndexStorage[originMapInfo.index.one][originMapInfo.index.two];
	// 源数据映射信息存储 存放的对象是 originMapInfo
	delete originDataMapStorage[originMapInfo.index.one][originMapInfo.index.key];
	
	// 下面注释的delete 不能打开（便于可用数据位置记录）
	// delete originMapInfo.index.one;
	// delete originMapInfo.index.two;
	// delete originMapInfo.index.key;
	
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
		key: keyInfo.nowKey,
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
 * 获取观察实例中所有代理
 * @param instance
 * @param storage
 * @returns {*|Array}
 */
function getAllProxy(instance, storage) {
	storage = storage || [];
	let id = instance.__sourceId__;
	let proxy = proxyStorage[id];
	let proxyMergeInstance = proxyMergeStorage[id];
	if (proxy) {
		if (storage.indexOf(proxy) === -1) {
			storage.push(proxy)
		}
	} else {
		proxyMergeInstance.forEach(instance => {
			getAllProxy(instance, storage)
		})
	}
	return storage;
}

// 移除数据读取监听的公共代码块
function unReadMixin(readFnInfo, fn, key, listenProxys) {
	// 得到function 位置
	let index = readFnInfo.fns.indexOf(fn);
	// 检查是否有read监听
	if (index !== -1) {
		listenProxys.forEach(proxy => {
			proxy.removeRead(key, readFnInfo.mapFns[index]);
		});
		readFnInfo.fns.splice(index, 1);
		readFnInfo.mapFns.splice(index, 1);
	}
}

// 移除监听的公共代码块
function unWatchMixin(watchFnInfo, watchFn, key) {
	// 检查是否固定监听
	let index = watchFnInfo.fixedFn.indexOf(watchFn);
	
	if (index !== -1) {
		watchFnInfo.fixedFn.splice(index, 1);
		let proxy = watchFnInfo.fixedProxy.splice(index, 1)[0];
		proxy.removeListen(key, watchFn);
	} else {
		index = watchFnInfo.fns.indexOf(watchFn)
		// 检查并移除相关代理的监听
		if (index !== -1) {
			let mapFns = watchFnInfo.mapFns.splice(index, 1)[0];
			mapFns.forEach(info => {
				info.proxy.removeListen(key, info.fn);
			})
		}
	}
}

// 移除数据读取并监听数据的公共代码块
function unReadWatchMixin(watchFnInfo, watchFn, key) {
	// 检查是否固定监听
	let index = watchFnInfo.fixedFn.indexOf(watchFn);
	
	if (index !== -1) {
		watchFnInfo.fixedFn.splice(index, 1);
		let proxy = watchFnInfo.fixedProxy.splice(index, 1)[0];
		proxy.removeReadWatch(key, watchFn);
	} else {
		index = watchFnInfo.fns.indexOf(watchFn)
		// 检查并移除相关代理的监听
		if (index !== -1) {
			let mapFns = watchFnInfo.mapFns.splice(index, 1)[0];
			mapFns.forEach(info => {
				info.proxy.removeReadWatch(key, info.fn);
			})
		}
	}
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
			this.isData = (this.parentData || {}).hasOwnProperty(nowKey);
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
			// 数据不一致则
			// 触发watch
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
 * @param instance
 * @param obj  源数据对象
 */
function observerProxy(instance, obj) {
	addOriginInfo(this.listen = new listenNode(obj));
	// 资源实例
	this.instance = instance;
	// 标识是观察根路径
	this.listen.isRoot = true;
	// 组合对象关联实例容器
	this.multipleInstance = [];
}

// 观察代理原型
observerProxy.prototype = {
	/**
	 * 资源设置
	 * @param key
	 * @param data
	 */
	set: function (key, data) {
		var listen=this.listen;
		// 检查是否销毁
		if (!listen) return;
		// 获取最后一个对象
		var lastObjInfo = completeLoopLastObj(listen.targetData, key, data);
		
		// 获取源数据映射的信息
		var originInfo = getOriginMapInfo(lastObjInfo.useObj);
		
		// 检查受影响的节点
		if (originInfo) {
			// 获取其中节点进行比对处理
			// listen.inspectionChild(lastObjInfo.useKey, lastObjInfo.useObj);
			originInfo.list.length && originInfo.list.forEach(function (listenNode) {
				listenNode.inspectionChild(lastObjInfo.useKey, lastObjInfo.useObj);
			})
		} else {
			// 此情况一般是之前直接性对源数据进行修改，导致获取最后一个对象后找不到数据映射信息（因为最后一个对象可能是直接在源数据上赋值的，用此方法<检查整体数据>与观察实例中checked方法一致）
			listen.inspectionChild('', listen.targetData);
		}
		return true;
	},
	/**
	 * 资源获取
	 * @param key
	 * @returns {*}
	 */
	get: function (key) {
		// 检查是否销毁
		if (!this.listen) return;
		if (key === "" || key === undefined) return this.listen.targetData;
		// 获取最后一个对象
		var lastObjInfo = loopGetLastObj(this.listen.targetData, key);
		return lastObjInfo ? lastObjInfo.obj[lastObjInfo.key] : lastObjInfo;
	},
	/**
	 * 检查观察数据中是否存在某个key
	 * @param key
	 * @returns {{obj, key}|boolean}
	 */
	checkedHasOwnProperty(key) {
		// 检查是否销毁
		if (!this.listen) return;
		// 获取最后一个对象
		var lastObjInfo = loopGetLastObj(this.listen.targetData, key);
		return lastObjInfo && lastObjInfo.obj.hasOwnProperty(lastObjInfo.key);
	},
	/**
	 * 数据读取
	 * @param key
	 * @param fn
	 * @returns {observerProxy}
	 */
	read: function (key, fn) {
		var resData,
			listen = this.listen;
		// 检查是否销毁
		if (!listen) return;
		var sourceObj = listen.targetData;
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
		var listen = this.listen;
		// 检查是否销毁
		if (!listen) return;
		var sourceObj = listen.targetData;
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
			listen = this.listen;
		// 检查是否销毁
		if (!listen) return;
		var sourceObj = listen.targetData;
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
		// 检查是否销毁
		if (!listen) return;
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
		// 检查是否销毁
		if (!listen) return;
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
	/**
	 * 删除数据读取与观察监听
	 * @param key
	 * @param fn
	 */
	removeReadWatch: function (key, fn) {
		var listen = this.listen;
		// 检查是否销毁
		if (!listen) return;
		recursionKey(key, function (nowKey, nextKey) {
			if (nowKey) {
				listen = listen.getChild(nowKey)
			}
			if (!(nowKey && nextKey)) {
				if (listen) {
					listen.remove(fn);
					listen.removeRead(fn);
				}
			}
			return nextKey;
		})
	},
	/**
	 * 组合对象关联 (提供销毁时候移除与组合对象之间的关联)
	 * @param parentInstance
	 */
	multipleConnected(parentInstance) {
		if (this.multipleInstance.indexOf(parentInstance)) return
		this.multipleInstance.push(parentInstance);
	},
	/**
	 * 销毁观察对象
	 */
	destroy: function () {
		// 检查是否销毁
		if (!this.listen) return;
		delete this.listen.isRoot
		this.listen.destroy();
		let selfInstace = this.instance;
		
		// 移除组合实例中关联的此实例
		this.multipleInstance.forEach(parentInstance => {
			let connectedStorage = proxyMergeStorage[parentInstance.__sourceId__];
			let index = connectedStorage.indexOf(selfInstace);
			
			if (index !== -1) {
				connectedStorage.splice(index, 1);
			}
		})
		
		
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
function observerDriven(obj, ...forbidWriteKeys) {
	let id = uid();
	this.__sourceId__ = id;
	proxyForbidWriteKeys[id] = [];
	// 检查是否空置观察实例
	if (obj) {
		// 检查是否观察驱动实例
		if (isInstance(obj, observerDriven)) return obj.forbidWrite(...forbidWriteKeys);
		proxyStorage[id] = new observerProxy(this, isMemberData(obj) ? obj : {}, forbidWriteKeys);
	} else {
		proxyTempStorage[id] = {
			read: {},
			watch: {},
			readWatch: {},
		};
		
		proxyMergeCreateStorage[id] = [];
		
		// 保存合并实例
		proxyMergeStorage[id] = [...forbidWriteKeys].reduce((arr, instance, index) => {
			if (isInstance(instance, observerDriven)) {
				let id = instance.__sourceId__
				// 检查实例是否销毁
				if (id) {
					let proxy = proxyStorage[instance.__sourceId__]
					arr.push(instance)
					// 检查被合并的实例是否单实例
					if (proxy) {
						// 存储入代理中，以备销毁时候 解除关联
						proxy.multipleConnected(this);
					}
				} else {
					log.warn('观察实例 merge 操作的第' + index + '个参数为观察实例，之前已销毁，请注意...')
				}
			} else {
				let newInstance = new observerDriven(instance);
				arr.push(newInstance);
				// 保存合并时候新创建的实例（以便销毁时候追踪）
				proxyMergeCreateStorage[id].push(newInstance);
			}
			return arr;
		}, []);
	}
}

observerDriven.prototype = {
	// 标识是观察实例
	isObserver: true,
	/**
	 * 数据赋值
	 * @param key
	 * @param data
	 */
	set: function (key, data) {
		
		let id = this.__sourceId__;
		let forbidWriteKey;
		let proxy = proxyStorage[id];
		
		if (!id) return;
		
		if (arguments.length === 1) {
			data = key;
			key = '';
		}
		
		// 检查设置的key是否存在禁止写入的名单中
		if (proxyForbidWriteKeys[id].some(function ($key) {
				forbidWriteKey = $key;
				return getNormKey(key).match(new RegExp('^' + $key + '([.]|$)')) || $key.match(new RegExp('^' + key + '([.]|$)'));
			})) return console.warn('此值不可修改 ^o^ 【 key : ' + forbidWriteKey + ' 已设置为不可写 】');
		
		
		// 检查是否组合观察实例
		if (proxy) {
			return proxy.set(key, data);
		} else {
			let instance = this.checkedHasOwnProperty(key, true).instance;
			return proxyStorage[instance.__sourceId__].set(key, data);
		}
	},
	/**
	 * 获取对应的数据
	 * @param key
	 */
	get: function (key) {
		key = typeof key === "string" ? key : '';
		
		let id = this.__sourceId__;
		let proxy = proxyStorage[id];
		
		if (!id) return;
		// 检查是否组合观察实例
		if (proxy) {
			return proxy.get(key);
		} else {
			let instance = this.checkedHasOwnProperty(key, true).instance;
			return proxyStorage[instance.__sourceId__].get(key);
		}
	},
	/**
	 * 根据key读取数据
	 * @param key
	 * @param fn
	 */
	read: function (key, fn) {
		let id = this.__sourceId__;
		let proxy = proxyStorage[id];
		
		if (!id) return this;
		// 检查是否组合观察实例
		if (proxy) {
			proxy.read(key, fn);
		} else {
			// 获取拥有属性的实例
			let instance = this.checkedHasOwnProperty(key);
			
			// 检查是否有原本存在的数据（立马执行）
			if (instance) {
				instance.read(key, fn)
			} else {
				key = getNormKey(key);
				// 获取读取监听容器
				let readInfo = proxyTempStorage[id].read;
				// 数据格式化
				let readFnInfo = readInfo[key] = readInfo[key] || {
					fns: [],
					mapFns: [],
				};
				
				// 检查是否重复 read 监听
				if (readFnInfo.fns.indexOf(fn) !== -1) return this;
				
				// 获取当前实例中所有监听代理
				let listenProxys = getAllProxy(this);
				
				// 得到function 位置
				let index = readFnInfo.fns.push(fn) - 1;
				
				// 代理监听
				const proxyWatchFn = function (...args) {
					// 代理执行
					fn.bind(this)(...args);
					// 进行遍历移除
					listenProxys.forEach(proxy => proxy.removeRead(key, arguments.callee));
					// 移除read 临时数据记录
					if (index !== -1) {
						readFnInfo.fns.splice(index, 1);
						readFnInfo.mapFns.splice(index, 1);
					}
					listenProxys = undefined
				}
				
				readFnInfo.mapFns.push(proxyWatchFn)
				
				// 进行代理读取监听
				listenProxys.forEach(function (proxy) {
					proxy.read(key, proxyWatchFn);
				})
			}
		}
		return this;
	},
	/**
	 * 移除数据读取监听
	 * @param key
	 * @param fn
	 */
	unRead: function (key, fn) {
		let id = this.__sourceId__;
		let proxy = proxyStorage[id];
		
		if (!id) return this;
		// 检查是否组合观察实例
		if (proxy) {
			proxy.removeRead(key, fn);
		} else {
			// 获取读取监听容器
			let readInfo = proxyTempStorage[id].read;
			// 获取当前实例中所有监听代理
			let listenProxys = getAllProxy(this);
			if (key) {
				key = getNormKey(key);
				// 数据格式化
				let readFnInfo = readInfo[key] || {fns: []};
				unReadMixin(readFnInfo, fn, key, listenProxys)
			} else {
				Object.keys(readInfo).forEach(key => {
					let readFnInfo = readInfo[key];
					readFnInfo.fns.forEach(fn => {
						unReadMixin(readFnInfo, fn, key, listenProxys)
					})
				})
			}
		}
		return this;
	},
	/**
	 * 数据监听
	 * @param watchKey
	 * @param watchFn
	 * @param mode 模式   默认 false 顺延   true 固定的proxy监听
	 * @returns {observerDriven}
	 */
	watch: function (watchKey, watchFn, mode) {
		let key = getNormKey(watchKey);
		let id = this.__sourceId__;
		let proxy = proxyStorage[id];
		
		if (!id) return this;
		// 检查是否符合对象
		if (proxy) {
			proxy.addListen(key, watchFn)
		} else {
			// 获取拥有属性的实例
			let instance = this.checkedHasOwnProperty(key);
			// 获取读取监听容器
			let watchInfo = proxyTempStorage[id].watch;
			// 数据格式化
			let watchFnInfo = watchInfo[key] = watchInfo[key] || {
				fns: [],
				mapFns: [],
				fixedFn: [],
				fixedProxy: [],
			};
			
			// 固定模式
			if (mode) {
				// 检查是否重复 watch 监听
				if (watchFnInfo.fixedFn.indexOf(watchFn) !== -1) return this;
				// 检查是否存在此key的实例
				if (instance) {
					let proxy = proxyStorage[instance.__sourceId__];
					proxy.addListen(key, watchFn);
					// 保存当前代理实例
					watchFnInfo.fixedFn.push(watchFn);
					watchFnInfo.fixedProxy.push(proxy);
				} else {
					let fns = [];
					// 获取当前实例中所有监听代理
					let listenProxys = getAllProxy(this);
					// 进行全部监听
					listenProxys.forEach((proxy, index) => {
						let proxyWatchFn = function (...args) {
							// 移除其他节点的监听
							listenProxys.slice(0, index).forEach(proxy => {
								proxy.removeListen(key, fns[0].fn);
								fns.splice(0, 1)
							})
							listenProxys.slice(index + 1).forEach(proxy => {
								proxy.removeListen(key, fns[0].fn);
								fns.splice(1, 1)
							})
							listenProxys = undefined;
							// 代理执行
							watchFn.bind(this)(...args);
						}
						// 用于移除对应的监听
						fns.push({
							proxy: proxy,
							fn: proxyWatchFn
						});
						// 对每一个proxy进行监听
						proxy.addListen(key, proxyWatchFn);
					})
					
					watchFnInfo.fns.push(watchFn)
					watchFnInfo.mapFns.push(fns)
				}
			} else { // 顺延
				let fns = [];
				// 获取当前实例中所有监听代理
				let listenProxys = getAllProxy(this);
				// 获取拥有属性的实例
				let instance = this.checkedHasOwnProperty(key);
				if (instance) {
					let index = listenProxys.indexOf(proxyStorage[instance.__sourceId__]);
					index === -1 || listenProxys.splice(index + 1)
				}
				
				// 进行全部监听
				listenProxys.forEach((proxy, index) => {
					let proxyWatchFn = function (...args) {
						// 移除当前节点后的节点的监听
						listenProxys.slice(index + 1).forEach(proxy => {
							proxy.removeListen(key, fns[index + 1].fn);
							fns.splice(index + 1, 1)
						})
						listenProxys.splice(0);
						// 代理执行
						watchFn.bind(this)(...args);
					}
					// 用于移除对应的监听
					fns.push({
						proxy: proxy,
						fn: proxyWatchFn
					});
					// 对每一个proxy进行监听
					proxy.addListen(key, proxyWatchFn);
				})
				
				watchFnInfo.fns.push(watchFn)
				watchFnInfo.mapFns.push(fns)
			}
		}
		return this;
	},
	/**
	 * 读取并监听数据
	 * @param watchKey
	 * @param watchFn
	 */
	unWatch: function (watchKey, watchFn) {
		let id = this.__sourceId__;
		let proxy = proxyStorage[id];
		
		if (!id) return this;
		// 检查是否组合观察实例
		if (proxy) {
			proxy.removeListen(watchKey, watchFn);
		} else {
			// 获取读取监听容器
			let watchInfo = proxyTempStorage[id].watch;
			// 判断是否全部移除
			if (watchKey) {
				let key = getNormKey(watchKey);
				// 数据格式化
				let watchFnInfo = watchInfo[key] = watchInfo[key] || {
					fns: [],
					mapFns: [],
					fixedFn: [],
					fixedProxy: [],
				};
				unWatchMixin(watchFnInfo, watchFn, key);
			} else {
				Object.keys(watchInfo).forEach(key => {
					let watchFnInfo = watchInfo[key];
					watchFnInfo.fns.forEach(watchFn => {
						unWatchMixin(watchFnInfo, watchFn, key);
					})
					watchFnInfo.fixedFn.forEach(watchFn => {
						unWatchMixin(watchFnInfo, watchFn, key);
					})
				})
			}
		}
		return this;
	},
	/**
	 * 读取并监听数据
	 * @param watchKey
	 * @param watchFn
	 */
	readWatch: function (watchKey, watchFn, mode) {
		let id = this.__sourceId__;
		let proxy = proxyStorage[id];
		let key = getNormKey(watchKey);
		if (!id) return this;
		// 检查是否组合观察实例
		if (proxy) {
			proxy.readWatch(key, watchFn);
		} else {
			// 获取拥有属性的实例
			let instance = this.checkedHasOwnProperty(key);
			// 获取读取监听容器
			let watchInfo = proxyTempStorage[id].readWatch;
			// 数据格式化
			let watchFnInfo = watchInfo[key] = watchInfo[key] || {
				fns: [],
				mapFns: [],
				fixedFn: [],
				fixedProxy: [],
			};
			
			// 固定模式
			if (mode) {
				// 检查是否重复 watch 监听
				if (watchFnInfo.fixedFn.indexOf(watchFn) !== -1) return this;
				// 检查是否存在此key的实例
				if (instance) {
					let proxy = proxyStorage[instance.__sourceId__];
					proxy.readWatch(key, watchFn);
					// 保存当前代理实例
					watchFnInfo.fixedFn.push(watchFn);
					watchFnInfo.fixedProxy.push(proxy);
				} else {
					let fns = [];
					// 获取当前实例中所有监听代理
					let listenProxys = getAllProxy(this);
					// 获取拥有属性的实例
					let instance = this.checkedHasOwnProperty(key);
					if (instance) {
						let index = listenProxys.indexOf(proxyStorage[instance.__sourceId__]);
						index === -1 || listenProxys.splice(index + 1)
					}
					
					// 进行全部监听
					listenProxys.forEach((proxy, index) => {
						let proxyWatchFn = function (...args) {
							// 移除其他节点的监听
							listenProxys.slice(0, index).forEach(proxy => {
								proxy.removeReadWatch(key, fns[0].fn);
								fns.splice(0, 1)
							})
							listenProxys.slice(index + 1).forEach(proxy => {
								proxy.removeReadWatch(key, fns[0].fn);
								fns.splice(1, 1)
							})
							listenProxys.splice(0);
							// 代理执行
							watchFn.bind(this)(...args);
						}
						// 用于移除对应的监听
						fns.push({
							proxy: proxy,
							fn: proxyWatchFn
						});
						// 对每一个proxy进行监听
						proxy.readWatch(key, proxyWatchFn);
					})
					
					watchFnInfo.fns.push(watchFn)
					watchFnInfo.mapFns.push(fns)
				}
			} else { // 顺延
				let fns = [];
				// 获取当前实例中所有监听代理
				let listenProxys = getAllProxy(this);
				// 进行全部监听
				listenProxys.forEach((proxy, index) => {
					let proxyWatchFn = function (...args) {
						// 移除当前节点后的节点的监听
						listenProxys.slice(index + 1).forEach(proxy => {
							proxy.removeReadWatch(key, fns[index + 1].fn);
							fns.splice(index + 1, 1)
						})
						listenProxys = undefined;
						// 代理执行
						watchFn.bind(this)(...args);
					}
					// 用于移除对应的监听
					fns.push({
						proxy: proxy,
						fn: proxyWatchFn
					});
					// 对每一个proxy进行监听
					proxy.readWatch(key, proxyWatchFn);
				})
				
				watchFnInfo.fns.push(watchFn)
				watchFnInfo.mapFns.push(fns)
			}
		}
		return this;
	},
	
	/**
	 * 读取并监听数据
	 * @param watchKey
	 * @param watchFn
	 */
	unReadWatch: function (watchKey, watchFn) {
		let id = this.__sourceId__;
		let proxy = proxyStorage[id];
		
		if (!id) return this;
		
		// 检查是否组合观察实例
		if (proxy) {
			proxy.removeReadWatch(watchKey, watchFn);
		} else {
			// 获取读取监听容器
			let watchInfo = proxyTempStorage[id].watch;
			// 检查是否
			if (watchKey) {
				let key = getNormKey(watchKey);
				// 数据格式化
				let watchFnInfo = watchInfo[key] = watchInfo[key] || {
					fns: [],
					mapFns: [],
					fixedFn: [],
					fixedProxy: [],
				};
				unReadWatchMixin(watchFnInfo, watchFn, key);
			} else {
				Object.keys(watchInfo).forEach(key => {
					let watchFnInfo = watchInfo[key];
					watchFnInfo.fns.forEach(watchFn => {
						unReadWatchMixin(watchFnInfo, watchFn, key);
					})
					watchFnInfo.fixedFn.forEach(watchFn => {
						unReadWatchMixin(watchFnInfo, watchFn, key);
					})
				})
			}
		}
		return this;
	},
	
	/**
	 * 检查数据
	 */
	checked: function () {
		if (!this.__sourceId__) return this;
		var listen = proxyStorage[this.__sourceId__].listen;
		listen.inspectionChild('', listen.targetData);
		return this;
	},
	/**
	 * 禁止写入
	 * @param {String | Array} keys
	 * @returns observerDriven
	 */
	forbidWrite: function (...keys) {
		if (!this.__sourceId__) return this;
		let forbidWriteKeys = proxyForbidWriteKeys[this.__sourceId__];
		[...keys].forEach(key => {
			if (typeof key === "string") {
				key = getNormKey(key);
				forbidWriteKeys.indexOf(key) === -1 && forbidWriteKeys.push(key)
			}
		});
		return this;
	},
	/**
	 * 监听实例合并
	 * @param obj
	 * @returns {observerDriven}
	 */
	merge: function (...obj) {
		// 合并参数并安全转换成监听实例
		return new observerDriven(undefined, ...([this].concat(...obj)));
	},
	/**
	 * 检查是否拥有制定的key,有则返回观察实例，没有则返回undefined
	 * @param key
	 * @param getFrist 如果为true 则直接返回第一个非组合实例
	 * @returns {*}
	 */
	checkedHasOwnProperty: function (key, getFrist) {
		let id = this.__sourceId__;
		if (!id) return getFrist ? {
			instance: this,
			res: false
		} : undefined;
		
		let proxy = proxyStorage[id];
		let proxyMergeInstance = proxyMergeStorage[id];
		
		// 检查是否组合观察实例
		if (proxy) {
			let instance = proxy.checkedHasOwnProperty(key) && this;
			return getFrist ? {
				instance: this,
				res: instance
			} : instance;
		} else {
			let i = 0;
			let len = proxyMergeInstance.length;
			
			let fristInstance
			while (i < len) {
				let isFrist = getFrist && i === 0;
				let instance = proxyMergeInstance[i++].checkedHasOwnProperty(key, isFrist || undefined);
				// 第一个实例检查特殊处理
				if (isFrist) {
					fristInstance = instance;
					instance = instance.res;
				}
				if (instance) {
					return getFrist ? {
						res: instance,
						instance: instance,
					} : instance;
				}
			}
			return fristInstance
		}
	},
	/**
	 * 观察实例销毁
	 */
	destroy: function () {
		let id = this.__sourceId__;
		let proxy = proxyStorage[id];
		
		if (proxy) {
			proxy.destroy()
		} else {
			// 销毁被关联实例之间的关系
			proxyMergeStorage[id].forEach(instance => {
				let proxy = proxyStorage[instance.__sourceId__];
				let multipleInstance = proxy.multipleInstance;
				let index = multipleInstance.indexOf(this);
				
				if (index !== -1) {
					multipleInstance.splice(index, 1);
				}
			})
			// 销毁在组合实例中创建的监听实例
			proxyMergeCreateStorage[id].forEach(instance => instance.destroy())
			// 销毁组合实例的各种监听
			this.unRead();
			this.unWatch();
			this.unReadWatch();
		}
		
		delete proxyStorage[id];
		delete proxyMergeStorage[id];
		// 移除临时存储器（实际上只针对组合实例）
		delete proxyTempStorage[id];
		delete proxyForbidWriteKeys[id];
		delete proxyMergeCreateStorage[id];
		
		//销毁所有私有属性
		Object.keys(this).forEach(function (key) {
			delete this[key];
		}.bind(this))
	}
};