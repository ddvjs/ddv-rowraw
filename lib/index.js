/* global FileReader Blob */
module.exports = rowraw
function rowraw () {}
Object.assign(rowraw, {
  // 判断是否为一个方法
  isFunction: function isFunction (fn) {
    return Boolean(typeof fn === 'function')
  }
})

rowraw.r = '\r'
rowraw.n = '\n'
rowraw.rn = rowraw.r + rowraw.n
rowraw.rn2len = rowraw.rn.length * 2

rowraw.stringifyPromise = function stringifyRaw (headers, body, start, callback) {
  var _promise = new Promise(function (resolve, reject) {
    try {
      resolve(rowraw.stringify(headers, body, start))
    } catch (e) {
      reject(e)
    }
  })
  if (rowraw.isFunction(callback)) {
    _promise.then(function (res) {
      callback(res)
    }, function (e) {
      callback(e)
    })
  }
  return _promise
}
rowraw.parsePromise = function parseRaw (raw, callback) {
  var _promise = new Promise(function (resolve, reject) {
    rowraw.parse(raw, function (e, res) {
      e ? reject(e) : resolve(res)
    })
  })
  if (rowraw.isFunction(callback)) {
    _promise.then(function (res) {
      callback(res)
    }, function (e) {
      callback(e)
    })
  }
  return _promise
}
rowraw.stringify = function stringifyRaw (headers, body, start, callback) {
  if (callback === undefined && rowraw.isFunction(start)) {
    callback = start
    start = undefined
  }
  var key
  var headersStr = ''
  var isRnEnd = true
  // 拼接header字符串,转buffer
  for (key in headers) {
    isRnEnd = false
    headersStr += key + ': ' + (headers[key]) + rowraw.rn
  }
  headersStr += rowraw.rn
  if (isRnEnd) {
    // 内容中是否只有一个换行符
    headersStr += rowraw.rn
  }
  headers = headersStr
  if (typeof start === 'string') {
    headers = start + (headers.length === rowraw.rn2len ? '' : rowraw.rn) + headers
  }
  headersStr = key = isRnEnd = start = undefined
  if (typeof body === 'string') {
    return rowraw.stringifyByString(headers, body, callback)
  } else if ((typeof Buffer) !== void 0 && Buffer.isBuffer && Buffer.isBuffer(body)) {
    return rowraw.stringifyByBuffer(headers, body, callback)
  } else if ((typeof Blob) !== void 0 && (body instanceof Blob)) {
    return rowraw.stringifyByBlob(headers, body, callback)
  } else {
    throw Error('Unable to parse the recognition input type')
  }
}
rowraw.parse = function parseRaw (raw, callback) {
  var e
  if (typeof raw === 'string') {
    return rowraw.parseByString(raw, callback)
  } else if ((typeof Buffer) !== void 0 && Buffer.isBuffer && Buffer.isBuffer(raw)) {
    return rowraw.parseByBuffer(raw, callback)
  } else if ((typeof Blob) !== void 0 && (raw instanceof Blob)) {
    if (typeof callback !== 'function') {
      throw Error('The second argument must have a callback')
    }
    return rowraw.parseByBlob(raw, callback)
  } else {
    e = Error('Unable to parse the recognition input type')
    if (typeof callback !== 'function') {
      throw e
    } else {
      callback(e)
    }
  }
}
rowraw.stringifyByString = function stringifyByString (headersStr, body, callback) {
  var raw = headersStr + (body || '')
  headersStr = body = undefined
  return rowraw.stringifyCb(raw, callback)
}
rowraw.stringifyByBuffer = function stringifyByBuffer (headersStr, body, callback) {
  var raw = new Buffer(headersStr, 'utf-8')// 将头信息字符串转buffer
  raw = Buffer.concat([raw, body])
  headersStr = body = undefined
  return rowraw.stringifyCb(raw, callback)
}
rowraw.stringifyByBlob = function stringifyByBuffer (headersStr, body, callback) {
  var raw = new Blob([headersStr, body])// 将头信息字符串转buffer
  headersStr = body = undefined
  return rowraw.stringifyCb(raw, callback)
}
rowraw.stringifyCb = function (raw, callback) {
  if (typeof callback === 'function') {
    callback(raw)
    callback = raw = undefined
  } else {
    callback = undefined
    return raw
  }
}
/**
 * [parseChunk description]
 * -1 继续
 * 0  终止
 * 1  解析
 */
rowraw.parseChunk = function parseChunk (chunk, p, _r, _n) {
  var r
  p = p || {}
  p.chunk_prev_1 = p.chunk_prev_1 || null
  p.chunk_prev_2 = p.chunk_prev_2 || null
  r = -1
  // 如果是换行符
  if (chunk === _r) {
    // 忽略
  } else if (chunk === _n) {
    // 双回车终止
    if (p.chunk_prev_2 === _n) {
      r = 0
    } else {
      r = 1
    }
  }
  p.chunk_prev_2 = p.chunk_prev_1
  p.chunk_prev_1 = chunk
  chunk = undefined
  return r
}
rowraw.parseByString = function (raw, callback) {
  var chunk, i, r, pr
  var len = raw.length
  var p = {}
  var start = 0
  var rawHeaders = []
  for (i = 0; i < len; i++) {
    // 提取一个字符串
    chunk = raw.charAt(i)
    pr = rowraw.parseChunk(chunk, p, '\r', '\n')
    if (pr === 1) {
      rowraw.parseLine(raw.substr(start, (i - 1 - start)), rawHeaders)
      start = i + 1
    } else if (pr === 0) {
      raw = (len - 1 > i) ? raw.substr(i + 1) : ''
      break
    }
  }
  r = rowraw.parseHeaderCb('string', rawHeaders, raw, callback)
  i = len = raw = p = start = rawHeaders = pr = undefined
  return r
}
rowraw.parseByBuffer = function (raw, callback) {
  var chunk, i, r, pr
  var len = raw.length
  var p = {}
  var start = 0
  var rawHeaders = []
  for (i = 0; i < len; i++) {
    // 提取一个字符串
    chunk = raw[i]
    pr = rowraw.parseChunk(chunk, p, 0x0d, 0x0a)
    if (pr === 1) {
      rowraw.parseLine(raw.slice(start, i - 1).toString(), rawHeaders)
      start = i + 1
    } else if (pr === 0) {
      raw = (len - 1 > i) ? raw.slice(i + 1) : (new Buffer(0))
      break
    }
  }
  r = rowraw.parseHeaderCb('buffer', rawHeaders, raw, callback)
  i = len = raw = p = start = rawHeaders = pr = undefined
  return r
}
rowraw.parseByBlob = function (raw, callback) {
  var size = raw.size
  var p = {}
  var start = 0
  var end = 10
  var rawHeaders = []
  var pr, fileReader, fileReaderRun
  var isReadRow = false
  var isReadRowEnd = false
  var rowStart = 0
  fileReader = new FileReader()
  // 文件读取后的处理
  fileReader.onload = function (e) {
    var chunk, chunkI, chunkResI, chunkLen
    chunk = e.target.result
    if (isReadRow) {
      rowraw.parseLine(chunk.toString(), rawHeaders)
      end = start = rowStart = end + 2
      isReadRow = false
      if (isReadRowEnd) {
        rowraw.parseHeaderCb('blob', rawHeaders, raw.slice((start + '\r\n'.length)), callback)
        fileReader = fileReaderRun = undefined
        size = p = start = end = rawHeaders = isReadRow = isReadRowEnd = rowStart = undefined
        return
      }
    } else {
      for (chunkI = 0, chunkLen = chunk.length; chunkI < chunkLen; chunkI++) {
        // 提取一个字符串
        chunkResI = chunk.charAt(chunkI)
        pr = rowraw.parseChunk(chunkResI, p, '\r', '\n')
        if (pr === 1) {
          // 解析一条
          isReadRow = true
          end = end - (chunkLen - chunkI) - 1
          start = rowStart
          break
        } else if (pr === 0) {
          // 终止
          isReadRowEnd = true
          isReadRow = true
          end = end - (chunkLen - chunkI) - 1
          start = rowStart
          break
        }
      }
    }
    chunk = chunkI = chunkResI = chunkLen = undefined
    if (start <= size) {
      if (isReadRow !== true) {
        start = end
        end = start + 12
      }
      fileReaderRun()
    }
  }
  fileReader.onerror = function (e) {
    callback(e)
  }
  fileReaderRun = function fileReaderRun () {
    start = start || 0
    end = Math.min(end, size)
    if (start > size) {
      return true
    }
    // 开始读流
    try {
      fileReader.readAsText(raw.slice(start, end))
    } catch (e) {
      throw Error('Failed to read blob')
    }
  }
  fileReaderRun()
}
rowraw.parseHeaderCb = function (bodytype, rawHeaders, raw, callback) {
  var r, i, len
  r = {
    rawHeaders: rawHeaders,
    headers: {},
    body: raw,
    bodytype: bodytype,
    type: 'unknow'
  }
  if (Array.isArray(rawHeaders) && typeof rawHeaders[0] === 'object') {
    Object.assign(r, rawHeaders.shift())
  }
  len = rawHeaders.length || 0
  for (i = 0; i < len; i++) {
    r.headers[(rawHeaders[i]).toLowerCase().trim().replace(/-/g, '_')] = ((rawHeaders[++i]).toString() || '').trim()
  }
  i = len = undefined
  if (typeof callback === 'function') {
    callback(null, r)
    callback = r = undefined
  } else {
    callback = undefined
    return r
  }
}
rowraw.exp = Object.create(null)
rowraw.exp.start = /^[A-Z_]+(\/\d\.\d)? /
rowraw.exp.request = /^([A-Z_]+) (.+) ([A-Z]+)\/(\d)\.(\d)$/
rowraw.exp.status = /^([A-Z]+)\/(\d)\.(\d) (\d{3}) (.*)$/
rowraw.exp.header = /^([^: \t]+):[ \t]*((?:.*[^ \t])|)/
rowraw.exp.headerContinue = /^[ \t]+(.*[^ \t])/
rowraw.parseLine = function (line, headers) {
  var match, isStartLine, t, matchContinue
  if (headers.length < 1) {
    if (rowraw.exp.start.test(line)) {
      if ((match = rowraw.exp.status.exec(line)) && match[1]) {
        t = {}
        t.type = 'response'
        t.version = [(match[2] || 0), (match[3] || 0)]
        t.protocol = (match[1] || 'unknow')
        t.status = (match[4] || 0)
        t.statusText = (match[5] || 'unknow')
        t.start_source = match[0] || ''
        headers.push(t)
      } else if ((match = rowraw.exp.request.exec(line)) && match[1]) {
        t = {}
        t.type = 'request'
        t.version = [(match[4] || 0), (match[5] || 0)]
        t.protocol = (match[3] || 'unknow')
        t.method = (match[1] || 0)
        t.path = (match[2] || 'unknow')
        t.start_source = match[0] || ''
        headers.push(t)
      }
      isStartLine = true; t = undefined
    }
  }
  if (!isStartLine) {
    if ((match = rowraw.exp.header.exec(line)) && match[1]) { // skip empty string (malformed header)
      headers.push(match[1])
      headers.push(match[2])
    } else {
      matchContinue = rowraw.exp.headerContinue.exec(line)
      if (matchContinue && headers.length) {
        if (headers[headers.length - 1]) {
          headers[headers.length - 1] += ' '
        }
        headers[headers.length - 1] += matchContinue[1]
      }
      matchContinue = undefined
    }
  }
}
