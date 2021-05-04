const createError = require('http-errors');
const express = require('express');
const path = require('path');
const app = express();

const proxy = require('./metrics/proxy');

const LOCAL = 'local'

const args = process.argv.slice(2);
console.log(args);
if (args.length > 0 && args[0] == LOCAL) {
  proxy.start(app);
}


app.use(express.static(path.join(__dirname, 'www')));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;