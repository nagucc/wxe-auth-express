# wxe-auth-express
express middleware, 用它可以实现微信企业号的登录

## API
### signin
此中间件用的功能包括：
1. 发起登录认证请求，详见[微信企业号文档](http://qydev.weixin.qq.com/wiki/index.php?title=OAuth%E9%AA%8C%E8%AF%81%E6%8E%A5%E5%8F%A3)
2. 接收返回的code，并用code获取UserId

#### 参数
##### wxapi
必须的。
由 `wxent-api-redis`生成的微信企业号接口API，将被调用的接口包括：
  - `getAuthorizeURL` 用于构造认证请求URL
  - `getUserIdByCode` 用于用code获取UserId

##### cookieNameForUserId
登录后需要将（加密的）UserId存储到cookie中，此处用于指定cookie的名字，默认为`userId`。

##### callbackUrl
认证服务器返回code时使用的回调url，默认可以由系统自己构造一个当前url

### getme
用户读取当前用户的登录信息

#### 参数
##### cookieNameForUserId
登录后需要将（加密的）UserId存储到cookie中，此处用于指定cookie的名字，默认为`userId`。

### getUserId
获取当前用户的id。
成功获取时，将结果存放在`req.user.userid`，失败时，返回响应：`{ ret:-1 }`

### getUser
在使用此API时，必须先调用getUserId，或设置好`req.user.userid`的值。
获取当前用户在微信企业号的详细信息。
成功获取时，将结果存放在`req.user`中，数据结构见[微信企业号文档](http://qydev.weixin.qq.com/wiki/index.php?title=%E7%AE%A1%E7%90%86%E6%88%90%E5%91%98#.E8.8E.B7.E5.8F.96.E6.88.90.E5.91.98)；
失败时，返回响应：{ ret: -1 }
#### 参数
##### wxapi
必须的。
由 `wxent-api-redis`生成的微信企业号接口API，将被调用的接口包括：
  - `getUser` 用于获取用户数据

## Build
使用`npm run build`

## 示例
### Express处理程序

```javascript
import { Router } from 'express';
import API from 'wxent-api-redis';
import { signin, getme } from 'wxe-auth-express';

const wxapi = API(corpId, secret, agentId, redishost, redisport);
const router = new Router();

const host = 'wx.example.com';

router.get('/signin', signin({
  wxapi: wxapi,
  cookieNameForUserId: 'userId',
  callbackUrl: `http://${host}/signin`
}));

// 获取当前登录用户信息
router.get('/me', getme('userId'));
```

### 客户端

```javascript
let getMe = async() => {
  // fetch的时候必须带上cookie
  let meRes = await fetch(`/me`, {
    credentials: 'same-origin'
  });
  let result = await meRes.json();

  // 获取到用户信息，用户已经登录
  if(result.ret === 0){
    return Promise.resolve(result.data);
  }
    // 不能获取到用户信息，用户未登录
    else {
    return Promise.reject(await result.msg);
  }
}

// 检查用户是否已经登录
getMe().then(userId => {
  // 用户已经登录
  // ...
}).catch(e => {
  // 用户还未登录，转到登录页面
  // 此时必须带上redirect_uri参数，这样才知道认证之后要返回哪个页面
  window.location = `/api/signup/signin?redirect_uri=${window.location.href}`;
})
```

## 在本地进行调试
在本地进行调试需要注意的问题：
1. 在本地进行调试需要使用[微信Web开发者工具]()；
2. 需要修改本地hosts文件，将可信域名绑定到
