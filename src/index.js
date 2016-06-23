
/*
实现从微信企业号登录
 */
export const signin = ({ wxapi, cookieNameForUserId = 'userId', callbackUrl }) => {
  return (req, res) => {
    if (!callbackUrl) {
      callbackUrl = `${req.protocol}://${req.get('Host')}${req.originalUrl}}`
    }
    // 1. 判断是否带有code参数，如果是的话，则说明已经从认证服务器返回
    if ('code' in req.query){
      // 使用state验证请求是否合法
      if (req.signedCookies.state === req.query.state)
        // 使用code获取userId
        wxapi.getUserIdByCode(req.query.code, (err, result) => {
          if(err) {
            res.send({ret: -1, msg: err});
          } else {
            // 删除state 和 redirect_uri 的 cookie 值
            res.clearCookie('state');
            res.clearCookie('redirect_uri');

            // 用户验证正确，设置用户状态为登录，返回原URL
            res.cookie(cookieNameForUserId, result.UserId, {maxAge: 24*3600*1000*365, signed: true});
            // 当redirect_uri中包含中文时，可能会出错，应该进行encode操作。
            res.redirect(encodeURI(req.signedCookies.redirect_uri));
          }
        });
      else {
        res.send({ret: -1, msg: 'bad state value and illegel request.'});
      }
    }
    // 2. 无'code'参数，转向认证服务器进行认证
    else {
      // 2.1 缓存 state 和redirect_uri
      let {redirect_uri} = req.query;
      if(redirect_uri) {
        let state = Math.random().toString();

        // 将state 和 redirect_uri 存入cookie中
        res.cookie('state', state, {maxAge: 30000, signed: true});
        res.cookie('redirect_uri', redirect_uri, {maxAge:30000, signed: true});

        // 2.2 获取认证url
        let url = wxapi.getAuthorizeURL(callbackUrl, state, 'snsapi_base');

        // 2.3 返回客户端，并在转到认证服务器。
        // 此处不能直接跳转到认证url，因为这样cookie就无法在客户端生效。
        res.send(`
          <html>
            <head>
              <meta http-equiv="refresh" content="0; url=${url}" />
            </head>
          </html>
        `);
      }
      else {
        res.send({ret: -1, msg: 'redirect_uri must be provided.'});
      }
    }
  }
}

/*
获取当前登录用户的userId
 */
export const getme = ({ cookieNameForUserId = 'userId' } = {}) => {
  return (req, res) => {
    const userId = req.signedCookies[cookieNameForUserId];
    if (userId) res.send({ ret: 0, data: userId });
    else res.send({ ret: -1, msg: 'You haven\'t sign in.' });
  };
};

/*
获取当前登录用户的id，结果存放于req.user.userid，未能获取的时候直接返回响应
 */
export const getUserId = (cookieNameForUserId = 'userId') => (req, res, next) => {
  req.user = Object.assign({}, req.user, {});
  req.user.userid = req.signedCookies[cookieNameForUserId];
  if (req.user.userid) next();
  else res.send({ ret: -1, msg: 'not logged' });
};

/*
获取当前用户在微信企业号的详细信息。结果存放在req.user中，数据结构详见：
前提：必须首先调用getUserId
 */
export const getUser = ({ wxapi }) => (req, res, next) => {
  if ('user' in req && req.user.userid) {
    wxapi.getUser(req.user.userid, (err, result) => {
      if (err) {
        Object.assign(req.user, {
          errcode: 500,
          errmsg: err,
        });
      } else Object.assign(req.user, result);
      next();
    });
  } else {
    throw new Error('req.user.userid must be provided.');
  }
};
