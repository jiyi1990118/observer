const template = `
<div>
  <block name="nav">
    <div>菜单</div>
  </block>
  <block @:name="main">
    <div>内容体</div>
  </block>
  <for exp="(item,key) in list">
  
  </for>
  
    <div :if="$data.switch">
  
    </div>
    {{$computed.testData}}
    <div :if="$methods.switch(switch)">
    {{$methods.doc(HTMLDoc)|:toText(2,$,Math.random())}}
	</div>
</div>
`;

class storage {
	get() {
	
	}
	
	set() {
	
	}
}


let s1 = new storage({});
let s2 = new storage({});
let s3 = new storage({});


export default {
	template,
	// 数据
	data() {
		return {
			modelData: s1.merge(s2, {}, s3.alias({name: 'userName'}).forbidWrite(['userName'])),
			keyName: '',
			valExpression: '',
			keyExpression: '',
			listDataExpression: ''
		}
	},
	// 属性
	property: {
		// 如果是 Function 等同watch
		for: function (newPropertyVal, oldPropertyVal) {
			// newPropertyVal =>   "val,key in userMap[selectData.id]"
			
			// 对 for 属性的字符进行表达式拆分
			let expression = newPropertyVal.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+)\s*/);
			
			if (expression) {
				
				// 提取 值 与 key 的表达式
				let valAndkey = expression[1].split(',');
				let valExpression = valAndkey[0].trim();
				let keyExpression = (valAndkey[1] || '').trim();
				
				// 列表数据表达式
				let listDataExpression = expression[2];
				
				// 进行语法解析
				this.syntaxParse(listDataExpression)
					// 检查语法解析是否通过
					.pass(function () {
						// 移除上一次语法监听
						this.removeSyntaxWatch(this.data.listDataExpression);
						// 记录此次表达式 （以便下次清除）
						this.setData({
							valExpression: valExpression,
							keyExpression: keyExpression,
							listDataExpression: listDataExpression,
						});
					})
					// 进行表达式结构监听 第二个参数代表是否采用外部环境进行解析
					.watch((newData, oldData) => {
						// 进行赋值
						this.setData('listData', newData);
					}, true);
				
				
			}
		},
		// 值的定义
		value: {
			// 数据类型
			type: String,
			// 默认值
			value: '',
			// 内部值转换 Boolean
			transfer: 'val',
			// 值观察
			watch: function (newData, oldData) {
			
			}
		}
		
	},
	// 方法
	methods: {
		// 内部提供的方法
		send(data) {
			// 设置属性对应的外部值
			this.setProperty('value', data);
			// 调度自定义事件
			this.dispatchEvent('change', data)
		},
		// 自定义渲染方法
		render() {
			
			// 清除视图结构
			this.viewDom.clean();
			
			const valExpression = this.data.valExpression;
			const keyExpression = this.data.keyExpression;
			
			// 遍历数据
			Objec.keys(this.data.listData).forEach(key => {
				// 视图使用环境变量 (创建基于上级环境变量的环境变量)
				const environment = this.createEnvironment(this.parentEnvironment);
				
				// 新数据
				const data = {
					[valExpression]: this.data.listData[key]
				}
				
				// key表达式
				if (keyExpression) data[keyExpression] = key;
				
				// 分配数据
				environment.assignData(data);
				
				// 添加视图结构
				this.viewDom.append(this.templateDom.render(environment));
			})
			
			this.viewDom.render();
		}
	},
	// 对外提供的接口
	interface:{
	
	},
	// 组件
	components: {},
	// 指令
	directives: {},
	// 过滤器
	filters: {},
	computed: {
		testData: {
			// 依赖的数据
			depend: ['name'],
			export() {
			
			}
		}
	},
	// 生命周期钩子
	hooks: {
		// 创建之前
		berforCreate() {
		
		},
		// 创建之后
		created() {
		
		},
		// 挂载之前
		berforMount() {
		
		},
		// 挂载之后
		mounted() {
		
		},
		// 更新之前
		berforUpdate() {
		
		},
		// 更新之后
		updated() {
		
		},
		// 销毁之前
		berforDestroy() {
		
		},
		// 销毁之后
		destroyed() {
		
		}
	},
	watch: {
		listData: function () {
			this.methods.render();
		}
	}
}

/**
 *  vf可扩展
 *  1、自定义生命周期
 *  2、自定义实例属性
 *  3、自定义指令
 *  4、自定义组件
 */

