/*
 * Copyright (C) 2016 Intel Corporation
 */

/*
 * fetch
 *
 * Utility function that performs an XMLHttpRequest to @url
 * and on completion, invokes callback(headers, response)
 * If there is an error, response will be an instanceof Error
 *
 * @url URL to request
 * @callback Callback to invoke on completion
 * @method optional method (*GET*, PUT, POST)
 * @params optional JSON params object (sent at BODY if present)
 *
 * Example:
 * fetch('/api/v1/boards', function(headers, response) {
 *   if (response instanceof Error) {
 *     console.log('Error: ' + response.message);
 *     return;
 *   }
 *   ...
 * });
 */
function fetch(url, callback, method, params) {
  callback = (typeof callback === 'undefined') ? null : callback;
  method = method || 'GET';

  var request = new XMLHttpRequest();

  request.onerror = function () {
    if (callback) callback(request.getAllResponseHeaders(), new Error(this.responseText));
  };

  request.onreadystatechange = function (event) {
    if (this.readyState !== 4) {
      return;
    }
    if (this.status == 200) {
      if (callback) callback(request.getAllResponseHeaders(), this.responseText);
    } else if (this.status >= 400) {
      if (callback) callback(request.getAllResponseHeaders(), new Error(this.responseText));
    }
  };

  try {
    request.open(method, url, true);
    if (params) {
      request.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      request.send(JSON.stringify(params));
    } else {
      request.send();
    }
  } catch (error) {
    if (callback) callback(request.getAllResponseHeaders(), error);
  }
}
