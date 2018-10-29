# observer.js / observerDriven.js
javascript for es5 Data observation （基于es5核心javascript的数据观察）OR Manual trigger

> 两个工具的API接口都差不多

### 代码文件说明
- observer.js   数据监听是利用ES5中的 Object.defineProperty 来实现对象属性监听
- observerDriven.js      数据监听是需要进行手动触发并监听


### api

- watch     监听
- unWatch   解除监听
- read      读取值
- unRead    解除读取值
- readWatch 读取并监听
- set       设置值
- get       获取值
- destroy   销毁实例
- merge     多个监听实例组合后返回一个新的组合实例 (observerDriven.js新添加的接口)
- forbidWrite   向监听实例中添加禁止写入指定的Key (observerDriven.js新添加的接口)
- checkedHasOwnProperty   检查是否拥有制定的key,有则返回观察实例，没有则返回undefined (observerDriven.js新添加的接口)

### observer 基本使用案例

``` javascript

    // 定义一个源数据
	var obsObj={yes:'----'};
	
	// 创建一个监听实例
    var $observer=observer(obsObj);
    
    // 监听的回调函数
    function watchFn(newVal) {
        console.log('---1---',newVal);
    }

    // 对第一个监听实例数据进行监听
    $observer.watch('name.a.c',watchFn);
    
    // 创建第二个监听实例
    var $observer2=observer(obsObj);
    
    // 创建第三个监听实例
    var $observer3=observer(obsObj);

    // 对第二个监听实例数据进行监听
    $observer2.watch('name.a.c',function (newVal) {
        console.log('---2---',newVal);
    });
    
    // 对第三个监听实例数据进行监听
    $observer3.watch('name.a.c',function (newVal) {
        console.log('---3---',newVal);
    });

    // 对源数据进行改变
    obsObj.name='xiyuan';
    
    // 解除第一个监听实例中的相关监听
    $observer.unWatch('name.a.c',watchFn);

    // 创建一个定时器
    setTimeout(function () {
        // 对源数据进行改变
        obsObj.name={a:{c:'c'}};
        
        // 对第一、第三个监听实例进行销毁
        $observer.destroy();
        $observer3.destroy();

    },1000);

    setTimeout(function () {
        // 对源数据进行改变
        obsObj.name.a.c='yes';
        obsObj.name={ag:{c:'c'}};
        
        // 对第二个监听实例进行销毁
        $observer2.destroy();

        // 输出源数据
        console.log(obsObj)

    },2000)
```

### observerDriven.js 基本使用案例

``` javascript
    // 定义一个源数据
    var testObj={c:"test"};
    
    // 创建第一个监听实例
    var w1=new observerDriven(testObj)
    
    // 对第一个监听实例数据进行监听
    w1.watch('a.c',function(newData,oldData){
    	console.log(newData,oldData)
    })
    
    // 对数据进行改变
    w1.set('a',{c:'yes'})
    
    // 创建第二个监听实例
    var w2=new observerDriven(testObj);
    
    // 对第二个监听实例数据进行监听
    w2.watch('a.b',function(newData,oldData){
    	console.log(newData,oldData,'w2')
    })
    
    // 对第二个监听实例数据进行监听
    w2.watch('a.c',function(newData,oldData){
    	console.log(newData,oldData,'w2')
    })
    
    // 对源数据进行改变
    testObj.a.c='ccc'
    
    // 调用任意同源的监听实例进行手动检查
    w2.checked();
    
    w1.destroy();
```