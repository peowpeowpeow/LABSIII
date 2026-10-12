// Имитация авторизации по query-параметру ?auth=1
function auth(req, res, next) {
  const isAuthenticated = req.query.auth === '1';

  req.user = isAuthenticated
    ? { name: 'Донор', isAuthenticated: true }
    : { name: 'Гость', isAuthenticated: false };

  res.locals.user = req.user;
  res.locals.currentPath = req.path;

  // Построение ссылок с сохранением признака авторизации
  res.locals.link = (url) => {
    if (!isAuthenticated) return url;
    return url + (url.includes('?') ? '&' : '?') + 'auth=1';
  };

  next();
}

// Защита маршрута: гость перенаправляется на страницу входа
function requireAuth(req, res, next) {
  if (req.user && req.user.isAuthenticated) return next();
  res.redirect('/login?returnTo=' + encodeURIComponent(req.path));
}

module.exports = { auth, requireAuth };
