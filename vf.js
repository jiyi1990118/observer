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
        return s1.merge(s2, {}, s3.alias({name: 'userName'}).forbidWrite(['userName']))
    },
    // 属性
    property: {
        // 如果是 Function 等同watch
        for: function (newPropertyVal, oldPropertyVal) {
            // newPropertyVal =>   "val,key in userMap[selectData.id]"

            // 对 for 属性的字符进行表达式拆分
            let expression = newPropertyVal.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+)\s*/);

            if (expression) {
                let valAndkey = expression[1];
                let listData = expression[2];
                // 进行语法监听 第三个参数标识是否外部环境
                this.syntaxWatch(listData,  (newData, oldData)=> {
                    // 进行赋值
                    this.set('listData',newData);
                }, true);
            }
        },
        // 值的定义
        value: {
            // 数据类型
            type: String,
            // 默认值
            value: '',
            // 值内部映射 Boolean
            switch: 'val',
            // 值观察
            watch: function (newData, oldData) {

            }
        }

    },
    // 方法
    methods: {
        send(data) {
            // 设置属性对应的外部值
            this.setProperty('value', data);
            // 调度自定义事件
            this.dispatchEvent('change', data)
        }
    },
    // 组件
    components: {},
    // 指令
    directives: {},
    // 过滤器
    filters: {},
    computed: {
        testData: {
            watch: ['name'],
            export() {
                this.viewClean();
                this.viewStruct.push(this.templateStructRender({}));
                this.viewRender()
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
    watch: {}
}
