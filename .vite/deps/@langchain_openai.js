import {
  require_base64_js
} from "./chunk-JCPUVSJG.js";
import {
  ChatPromptValue,
  StringPromptValue
} from "./chunk-C7ZRAUQB.js";
import {
  BaseCumulativeTransformOutputParser,
  JsonOutputParser,
  OutputParserException,
  StructuredOutputParser,
  validate
} from "./chunk-2Q7G5IGC.js";
import "./chunk-BQGOYYF2.js";
import {
  RunnablePassthrough
} from "./chunk-JGDNEVWM.js";
import "./chunk-YIGG5L74.js";
import {
  AIMessage,
  AIMessageChunk,
  AsyncCaller,
  CallbackManager,
  ChatGenerationChunk,
  ChatMessage,
  ChatMessageChunk,
  FunctionMessageChunk,
  GenerationChunk,
  HumanMessage,
  HumanMessageChunk,
  RUN_KEY,
  Runnable,
  RunnableLambda,
  RunnableSequence,
  SystemMessageChunk,
  ToolInputParsingException,
  ToolMessage,
  ToolMessageChunk,
  ZodFirstPartyTypeKind,
  _configHasToolCallId,
  _isToolCall,
  callbackHandlerPrefersStreaming,
  coerceMessageLikeToMessage,
  concat,
  convertToOpenAIImageBlock,
  convertToProviderContentBlock,
  ensureConfig,
  external_exports,
  getBufferString,
  getEnv,
  getEnvironmentVariable,
  isAIMessage,
  isAIMessageChunk,
  isBase64ContentBlock,
  isBaseMessage,
  isDataContentBlock,
  isDirectToolOutput,
  isURLContentBlock,
  parseBase64DataUrl,
  parseCallbackConfigArg,
  parseMimeType,
  parsePartialJson,
  zodToJsonSchema
} from "./chunk-BE3OOYYY.js";
import {
  __publicField,
  __toESM
} from "./chunk-OL46QLBJ.js";

// node_modules/@langchain/openai/node_modules/openai/internal/qs/formats.mjs
var default_format = "RFC3986";
var formatters = {
  RFC1738: (v) => String(v).replace(/%20/g, "+"),
  RFC3986: (v) => String(v)
};
var RFC1738 = "RFC1738";

// node_modules/@langchain/openai/node_modules/openai/internal/qs/utils.mjs
var is_array = Array.isArray;
var hex_table = (() => {
  const array = [];
  for (let i = 0; i < 256; ++i) {
    array.push("%" + ((i < 16 ? "0" : "") + i.toString(16)).toUpperCase());
  }
  return array;
})();
var limit = 1024;
var encode = (str2, _defaultEncoder, charset, _kind, format) => {
  if (str2.length === 0) {
    return str2;
  }
  let string = str2;
  if (typeof str2 === "symbol") {
    string = Symbol.prototype.toString.call(str2);
  } else if (typeof str2 !== "string") {
    string = String(str2);
  }
  if (charset === "iso-8859-1") {
    return escape(string).replace(/%u[0-9a-f]{4}/gi, function($0) {
      return "%26%23" + parseInt($0.slice(2), 16) + "%3B";
    });
  }
  let out = "";
  for (let j = 0; j < string.length; j += limit) {
    const segment = string.length >= limit ? string.slice(j, j + limit) : string;
    const arr = [];
    for (let i = 0; i < segment.length; ++i) {
      let c = segment.charCodeAt(i);
      if (c === 45 || // -
      c === 46 || // .
      c === 95 || // _
      c === 126 || // ~
      c >= 48 && c <= 57 || // 0-9
      c >= 65 && c <= 90 || // a-z
      c >= 97 && c <= 122 || // A-Z
      format === RFC1738 && (c === 40 || c === 41)) {
        arr[arr.length] = segment.charAt(i);
        continue;
      }
      if (c < 128) {
        arr[arr.length] = hex_table[c];
        continue;
      }
      if (c < 2048) {
        arr[arr.length] = hex_table[192 | c >> 6] + hex_table[128 | c & 63];
        continue;
      }
      if (c < 55296 || c >= 57344) {
        arr[arr.length] = hex_table[224 | c >> 12] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
        continue;
      }
      i += 1;
      c = 65536 + ((c & 1023) << 10 | segment.charCodeAt(i) & 1023);
      arr[arr.length] = hex_table[240 | c >> 18] + hex_table[128 | c >> 12 & 63] + hex_table[128 | c >> 6 & 63] + hex_table[128 | c & 63];
    }
    out += arr.join("");
  }
  return out;
};
function is_buffer(obj) {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
}
function maybe_map(val, fn) {
  if (is_array(val)) {
    const mapped = [];
    for (let i = 0; i < val.length; i += 1) {
      mapped.push(fn(val[i]));
    }
    return mapped;
  }
  return fn(val);
}

// node_modules/@langchain/openai/node_modules/openai/internal/qs/stringify.mjs
var has = Object.prototype.hasOwnProperty;
var array_prefix_generators = {
  brackets(prefix) {
    return String(prefix) + "[]";
  },
  comma: "comma",
  indices(prefix, key) {
    return String(prefix) + "[" + key + "]";
  },
  repeat(prefix) {
    return String(prefix);
  }
};
var is_array2 = Array.isArray;
var push = Array.prototype.push;
var push_to_array = function(arr, value_or_array) {
  push.apply(arr, is_array2(value_or_array) ? value_or_array : [value_or_array]);
};
var to_ISO = Date.prototype.toISOString;
var defaults = {
  addQueryPrefix: false,
  allowDots: false,
  allowEmptyArrays: false,
  arrayFormat: "indices",
  charset: "utf-8",
  charsetSentinel: false,
  delimiter: "&",
  encode: true,
  encodeDotInKeys: false,
  encoder: encode,
  encodeValuesOnly: false,
  format: default_format,
  formatter: formatters[default_format],
  /** @deprecated */
  indices: false,
  serializeDate(date) {
    return to_ISO.call(date);
  },
  skipNulls: false,
  strictNullHandling: false
};
function is_non_nullish_primitive(v) {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean" || typeof v === "symbol" || typeof v === "bigint";
}
var sentinel = {};
function inner_stringify(object, prefix, generateArrayPrefix, commaRoundTrip, allowEmptyArrays, strictNullHandling, skipNulls, encodeDotInKeys, encoder, filter, sort, allowDots, serializeDate, format, formatter, encodeValuesOnly, charset, sideChannel) {
  let obj = object;
  let tmp_sc = sideChannel;
  let step = 0;
  let find_flag = false;
  while ((tmp_sc = tmp_sc.get(sentinel)) !== void 0 && !find_flag) {
    const pos = tmp_sc.get(object);
    step += 1;
    if (typeof pos !== "undefined") {
      if (pos === step) {
        throw new RangeError("Cyclic object value");
      } else {
        find_flag = true;
      }
    }
    if (typeof tmp_sc.get(sentinel) === "undefined") {
      step = 0;
    }
  }
  if (typeof filter === "function") {
    obj = filter(prefix, obj);
  } else if (obj instanceof Date) {
    obj = serializeDate == null ? void 0 : serializeDate(obj);
  } else if (generateArrayPrefix === "comma" && is_array2(obj)) {
    obj = maybe_map(obj, function(value) {
      if (value instanceof Date) {
        return serializeDate == null ? void 0 : serializeDate(value);
      }
      return value;
    });
  }
  if (obj === null) {
    if (strictNullHandling) {
      return encoder && !encodeValuesOnly ? (
        // @ts-expect-error
        encoder(prefix, defaults.encoder, charset, "key", format)
      ) : prefix;
    }
    obj = "";
  }
  if (is_non_nullish_primitive(obj) || is_buffer(obj)) {
    if (encoder) {
      const key_value = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, "key", format);
      return [
        (formatter == null ? void 0 : formatter(key_value)) + "=" + // @ts-expect-error
        (formatter == null ? void 0 : formatter(encoder(obj, defaults.encoder, charset, "value", format)))
      ];
    }
    return [(formatter == null ? void 0 : formatter(prefix)) + "=" + (formatter == null ? void 0 : formatter(String(obj)))];
  }
  const values = [];
  if (typeof obj === "undefined") {
    return values;
  }
  let obj_keys;
  if (generateArrayPrefix === "comma" && is_array2(obj)) {
    if (encodeValuesOnly && encoder) {
      obj = maybe_map(obj, encoder);
    }
    obj_keys = [{ value: obj.length > 0 ? obj.join(",") || null : void 0 }];
  } else if (is_array2(filter)) {
    obj_keys = filter;
  } else {
    const keys = Object.keys(obj);
    obj_keys = sort ? keys.sort(sort) : keys;
  }
  const encoded_prefix = encodeDotInKeys ? String(prefix).replace(/\./g, "%2E") : String(prefix);
  const adjusted_prefix = commaRoundTrip && is_array2(obj) && obj.length === 1 ? encoded_prefix + "[]" : encoded_prefix;
  if (allowEmptyArrays && is_array2(obj) && obj.length === 0) {
    return adjusted_prefix + "[]";
  }
  for (let j = 0; j < obj_keys.length; ++j) {
    const key = obj_keys[j];
    const value = (
      // @ts-ignore
      typeof key === "object" && typeof key.value !== "undefined" ? key.value : obj[key]
    );
    if (skipNulls && value === null) {
      continue;
    }
    const encoded_key = allowDots && encodeDotInKeys ? key.replace(/\./g, "%2E") : key;
    const key_prefix = is_array2(obj) ? typeof generateArrayPrefix === "function" ? generateArrayPrefix(adjusted_prefix, encoded_key) : adjusted_prefix : adjusted_prefix + (allowDots ? "." + encoded_key : "[" + encoded_key + "]");
    sideChannel.set(object, step);
    const valueSideChannel = /* @__PURE__ */ new WeakMap();
    valueSideChannel.set(sentinel, sideChannel);
    push_to_array(values, inner_stringify(
      value,
      key_prefix,
      generateArrayPrefix,
      commaRoundTrip,
      allowEmptyArrays,
      strictNullHandling,
      skipNulls,
      encodeDotInKeys,
      // @ts-ignore
      generateArrayPrefix === "comma" && encodeValuesOnly && is_array2(obj) ? null : encoder,
      filter,
      sort,
      allowDots,
      serializeDate,
      format,
      formatter,
      encodeValuesOnly,
      charset,
      valueSideChannel
    ));
  }
  return values;
}
function normalize_stringify_options(opts = defaults) {
  if (typeof opts.allowEmptyArrays !== "undefined" && typeof opts.allowEmptyArrays !== "boolean") {
    throw new TypeError("`allowEmptyArrays` option can only be `true` or `false`, when provided");
  }
  if (typeof opts.encodeDotInKeys !== "undefined" && typeof opts.encodeDotInKeys !== "boolean") {
    throw new TypeError("`encodeDotInKeys` option can only be `true` or `false`, when provided");
  }
  if (opts.encoder !== null && typeof opts.encoder !== "undefined" && typeof opts.encoder !== "function") {
    throw new TypeError("Encoder has to be a function.");
  }
  const charset = opts.charset || defaults.charset;
  if (typeof opts.charset !== "undefined" && opts.charset !== "utf-8" && opts.charset !== "iso-8859-1") {
    throw new TypeError("The charset option must be either utf-8, iso-8859-1, or undefined");
  }
  let format = default_format;
  if (typeof opts.format !== "undefined") {
    if (!has.call(formatters, opts.format)) {
      throw new TypeError("Unknown format option provided.");
    }
    format = opts.format;
  }
  const formatter = formatters[format];
  let filter = defaults.filter;
  if (typeof opts.filter === "function" || is_array2(opts.filter)) {
    filter = opts.filter;
  }
  let arrayFormat;
  if (opts.arrayFormat && opts.arrayFormat in array_prefix_generators) {
    arrayFormat = opts.arrayFormat;
  } else if ("indices" in opts) {
    arrayFormat = opts.indices ? "indices" : "repeat";
  } else {
    arrayFormat = defaults.arrayFormat;
  }
  if ("commaRoundTrip" in opts && typeof opts.commaRoundTrip !== "boolean") {
    throw new TypeError("`commaRoundTrip` must be a boolean, or absent");
  }
  const allowDots = typeof opts.allowDots === "undefined" ? !!opts.encodeDotInKeys === true ? true : defaults.allowDots : !!opts.allowDots;
  return {
    addQueryPrefix: typeof opts.addQueryPrefix === "boolean" ? opts.addQueryPrefix : defaults.addQueryPrefix,
    // @ts-ignore
    allowDots,
    allowEmptyArrays: typeof opts.allowEmptyArrays === "boolean" ? !!opts.allowEmptyArrays : defaults.allowEmptyArrays,
    arrayFormat,
    charset,
    charsetSentinel: typeof opts.charsetSentinel === "boolean" ? opts.charsetSentinel : defaults.charsetSentinel,
    commaRoundTrip: !!opts.commaRoundTrip,
    delimiter: typeof opts.delimiter === "undefined" ? defaults.delimiter : opts.delimiter,
    encode: typeof opts.encode === "boolean" ? opts.encode : defaults.encode,
    encodeDotInKeys: typeof opts.encodeDotInKeys === "boolean" ? opts.encodeDotInKeys : defaults.encodeDotInKeys,
    encoder: typeof opts.encoder === "function" ? opts.encoder : defaults.encoder,
    encodeValuesOnly: typeof opts.encodeValuesOnly === "boolean" ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
    filter,
    format,
    formatter,
    serializeDate: typeof opts.serializeDate === "function" ? opts.serializeDate : defaults.serializeDate,
    skipNulls: typeof opts.skipNulls === "boolean" ? opts.skipNulls : defaults.skipNulls,
    // @ts-ignore
    sort: typeof opts.sort === "function" ? opts.sort : null,
    strictNullHandling: typeof opts.strictNullHandling === "boolean" ? opts.strictNullHandling : defaults.strictNullHandling
  };
}
function stringify(object, opts = {}) {
  let obj = object;
  const options = normalize_stringify_options(opts);
  let obj_keys;
  let filter;
  if (typeof options.filter === "function") {
    filter = options.filter;
    obj = filter("", obj);
  } else if (is_array2(options.filter)) {
    filter = options.filter;
    obj_keys = filter;
  }
  const keys = [];
  if (typeof obj !== "object" || obj === null) {
    return "";
  }
  const generateArrayPrefix = array_prefix_generators[options.arrayFormat];
  const commaRoundTrip = generateArrayPrefix === "comma" && options.commaRoundTrip;
  if (!obj_keys) {
    obj_keys = Object.keys(obj);
  }
  if (options.sort) {
    obj_keys.sort(options.sort);
  }
  const sideChannel = /* @__PURE__ */ new WeakMap();
  for (let i = 0; i < obj_keys.length; ++i) {
    const key = obj_keys[i];
    if (options.skipNulls && obj[key] === null) {
      continue;
    }
    push_to_array(keys, inner_stringify(
      obj[key],
      key,
      // @ts-expect-error
      generateArrayPrefix,
      commaRoundTrip,
      options.allowEmptyArrays,
      options.strictNullHandling,
      options.skipNulls,
      options.encodeDotInKeys,
      options.encode ? options.encoder : null,
      options.filter,
      options.sort,
      options.allowDots,
      options.serializeDate,
      options.format,
      options.formatter,
      options.encodeValuesOnly,
      options.charset,
      sideChannel
    ));
  }
  const joined = keys.join(options.delimiter);
  let prefix = options.addQueryPrefix === true ? "?" : "";
  if (options.charsetSentinel) {
    if (options.charset === "iso-8859-1") {
      prefix += "utf8=%26%2310003%3B&";
    } else {
      prefix += "utf8=%E2%9C%93&";
    }
  }
  return joined.length > 0 ? prefix + joined : "";
}

// node_modules/@langchain/openai/node_modules/openai/version.mjs
var VERSION = "4.104.0";

// node_modules/@langchain/openai/node_modules/openai/_shims/registry.mjs
var auto = false;
var kind = void 0;
var fetch2 = void 0;
var Request2 = void 0;
var Response2 = void 0;
var Headers2 = void 0;
var FormData2 = void 0;
var Blob2 = void 0;
var File2 = void 0;
var ReadableStream2 = void 0;
var getMultipartRequestOptions = void 0;
var getDefaultAgent = void 0;
var fileFromPath = void 0;
var isFsReadStream = void 0;
function setShims(shims, options = { auto: false }) {
  if (auto) {
    throw new Error(`you must \`import 'openai/shims/${shims.kind}'\` before importing anything else from openai`);
  }
  if (kind) {
    throw new Error(`can't \`import 'openai/shims/${shims.kind}'\` after \`import 'openai/shims/${kind}'\``);
  }
  auto = options.auto;
  kind = shims.kind;
  fetch2 = shims.fetch;
  Request2 = shims.Request;
  Response2 = shims.Response;
  Headers2 = shims.Headers;
  FormData2 = shims.FormData;
  Blob2 = shims.Blob;
  File2 = shims.File;
  ReadableStream2 = shims.ReadableStream;
  getMultipartRequestOptions = shims.getMultipartRequestOptions;
  getDefaultAgent = shims.getDefaultAgent;
  fileFromPath = shims.fileFromPath;
  isFsReadStream = shims.isFsReadStream;
}

// node_modules/@langchain/openai/node_modules/openai/_shims/MultipartBody.mjs
var MultipartBody = class {
  constructor(body) {
    this.body = body;
  }
  get [Symbol.toStringTag]() {
    return "MultipartBody";
  }
};

// node_modules/@langchain/openai/node_modules/openai/_shims/web-runtime.mjs
function getRuntime({ manuallyImported } = {}) {
  const recommendation = manuallyImported ? `You may need to use polyfills` : `Add one of these imports before your first \`import … from 'openai'\`:
- \`import 'openai/shims/node'\` (if you're running on Node)
- \`import 'openai/shims/web'\` (otherwise)
`;
  let _fetch, _Request, _Response, _Headers;
  try {
    _fetch = fetch;
    _Request = Request;
    _Response = Response;
    _Headers = Headers;
  } catch (error) {
    throw new Error(`this environment is missing the following Web Fetch API type: ${error.message}. ${recommendation}`);
  }
  return {
    kind: "web",
    fetch: _fetch,
    Request: _Request,
    Response: _Response,
    Headers: _Headers,
    FormData: (
      // @ts-ignore
      typeof FormData !== "undefined" ? FormData : class FormData {
        // @ts-ignore
        constructor() {
          throw new Error(`file uploads aren't supported in this environment yet as 'FormData' is undefined. ${recommendation}`);
        }
      }
    ),
    Blob: typeof Blob !== "undefined" ? Blob : class Blob {
      constructor() {
        throw new Error(`file uploads aren't supported in this environment yet as 'Blob' is undefined. ${recommendation}`);
      }
    },
    File: (
      // @ts-ignore
      typeof File !== "undefined" ? File : class File {
        // @ts-ignore
        constructor() {
          throw new Error(`file uploads aren't supported in this environment yet as 'File' is undefined. ${recommendation}`);
        }
      }
    ),
    ReadableStream: (
      // @ts-ignore
      typeof ReadableStream !== "undefined" ? ReadableStream : class ReadableStream {
        // @ts-ignore
        constructor() {
          throw new Error(`streaming isn't supported in this environment yet as 'ReadableStream' is undefined. ${recommendation}`);
        }
      }
    ),
    getMultipartRequestOptions: async (form, opts) => ({
      ...opts,
      body: new MultipartBody(form)
    }),
    getDefaultAgent: (url) => void 0,
    fileFromPath: () => {
      throw new Error("The `fileFromPath` function is only supported in Node. See the README for more details: https://www.github.com/openai/openai-node#file-uploads");
    },
    isFsReadStream: (value) => false
  };
}

// node_modules/@langchain/openai/node_modules/openai/_shims/index.mjs
var init = () => {
  if (!kind) setShims(getRuntime(), { auto: true });
};
init();

// node_modules/@langchain/openai/node_modules/openai/error.mjs
var OpenAIError = class extends Error {
};
var APIError = class _APIError extends OpenAIError {
  constructor(status, error, message, headers) {
    super(`${_APIError.makeMessage(status, error, message)}`);
    this.status = status;
    this.headers = headers;
    this.request_id = headers == null ? void 0 : headers["x-request-id"];
    this.error = error;
    const data = error;
    this.code = data == null ? void 0 : data["code"];
    this.param = data == null ? void 0 : data["param"];
    this.type = data == null ? void 0 : data["type"];
  }
  static makeMessage(status, error, message) {
    const msg = (error == null ? void 0 : error.message) ? typeof error.message === "string" ? error.message : JSON.stringify(error.message) : error ? JSON.stringify(error) : message;
    if (status && msg) {
      return `${status} ${msg}`;
    }
    if (status) {
      return `${status} status code (no body)`;
    }
    if (msg) {
      return msg;
    }
    return "(no status code or body)";
  }
  static generate(status, errorResponse, message, headers) {
    if (!status || !headers) {
      return new APIConnectionError({ message, cause: castToError(errorResponse) });
    }
    const error = errorResponse == null ? void 0 : errorResponse["error"];
    if (status === 400) {
      return new BadRequestError(status, error, message, headers);
    }
    if (status === 401) {
      return new AuthenticationError(status, error, message, headers);
    }
    if (status === 403) {
      return new PermissionDeniedError(status, error, message, headers);
    }
    if (status === 404) {
      return new NotFoundError(status, error, message, headers);
    }
    if (status === 409) {
      return new ConflictError(status, error, message, headers);
    }
    if (status === 422) {
      return new UnprocessableEntityError(status, error, message, headers);
    }
    if (status === 429) {
      return new RateLimitError(status, error, message, headers);
    }
    if (status >= 500) {
      return new InternalServerError(status, error, message, headers);
    }
    return new _APIError(status, error, message, headers);
  }
};
var APIUserAbortError = class extends APIError {
  constructor({ message } = {}) {
    super(void 0, void 0, message || "Request was aborted.", void 0);
  }
};
var APIConnectionError = class extends APIError {
  constructor({ message, cause }) {
    super(void 0, void 0, message || "Connection error.", void 0);
    if (cause)
      this.cause = cause;
  }
};
var APIConnectionTimeoutError = class extends APIConnectionError {
  constructor({ message } = {}) {
    super({ message: message ?? "Request timed out." });
  }
};
var BadRequestError = class extends APIError {
};
var AuthenticationError = class extends APIError {
};
var PermissionDeniedError = class extends APIError {
};
var NotFoundError = class extends APIError {
};
var ConflictError = class extends APIError {
};
var UnprocessableEntityError = class extends APIError {
};
var RateLimitError = class extends APIError {
};
var InternalServerError = class extends APIError {
};
var LengthFinishReasonError = class extends OpenAIError {
  constructor() {
    super(`Could not parse response content as the length limit was reached`);
  }
};
var ContentFilterFinishReasonError = class extends OpenAIError {
  constructor() {
    super(`Could not parse response content as the request was rejected by the content filter`);
  }
};

// node_modules/@langchain/openai/node_modules/openai/internal/decoders/line.mjs
var __classPrivateFieldSet = function(receiver, state, value, kind2, f) {
  if (kind2 === "m") throw new TypeError("Private method is not writable");
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind2 === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet = function(receiver, state, kind2, f) {
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind2 === "m" ? f : kind2 === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _LineDecoder_carriageReturnIndex;
var LineDecoder = class {
  constructor() {
    _LineDecoder_carriageReturnIndex.set(this, void 0);
    this.buffer = new Uint8Array();
    __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
  }
  decode(chunk) {
    if (chunk == null) {
      return [];
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
    let newData = new Uint8Array(this.buffer.length + binaryChunk.length);
    newData.set(this.buffer);
    newData.set(binaryChunk, this.buffer.length);
    this.buffer = newData;
    const lines = [];
    let patternIndex;
    while ((patternIndex = findNewlineIndex(this.buffer, __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"))) != null) {
      if (patternIndex.carriage && __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") == null) {
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, patternIndex.index, "f");
        continue;
      }
      if (__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") != null && (patternIndex.index !== __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") + 1 || patternIndex.carriage)) {
        lines.push(this.decodeText(this.buffer.slice(0, __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") - 1)));
        this.buffer = this.buffer.slice(__classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"));
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
        continue;
      }
      const endIndex = __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") !== null ? patternIndex.preceding - 1 : patternIndex.preceding;
      const line = this.decodeText(this.buffer.slice(0, endIndex));
      lines.push(line);
      this.buffer = this.buffer.slice(patternIndex.index);
      __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
    }
    return lines;
  }
  decodeText(bytes) {
    if (bytes == null)
      return "";
    if (typeof bytes === "string")
      return bytes;
    if (typeof Buffer !== "undefined") {
      if (bytes instanceof Buffer) {
        return bytes.toString();
      }
      if (bytes instanceof Uint8Array) {
        return Buffer.from(bytes).toString();
      }
      throw new OpenAIError(`Unexpected: received non-Uint8Array (${bytes.constructor.name}) stream chunk in an environment with a global "Buffer" defined, which this library assumes to be Node. Please report this error.`);
    }
    if (typeof TextDecoder !== "undefined") {
      if (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer) {
        this.textDecoder ?? (this.textDecoder = new TextDecoder("utf8"));
        return this.textDecoder.decode(bytes);
      }
      throw new OpenAIError(`Unexpected: received non-Uint8Array/ArrayBuffer (${bytes.constructor.name}) in a web platform. Please report this error.`);
    }
    throw new OpenAIError(`Unexpected: neither Buffer nor TextDecoder are available as globals. Please report this error.`);
  }
  flush() {
    if (!this.buffer.length) {
      return [];
    }
    return this.decode("\n");
  }
};
_LineDecoder_carriageReturnIndex = /* @__PURE__ */ new WeakMap();
LineDecoder.NEWLINE_CHARS = /* @__PURE__ */ new Set(["\n", "\r"]);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
function findNewlineIndex(buffer, startIndex) {
  const newline = 10;
  const carriage = 13;
  for (let i = startIndex ?? 0; i < buffer.length; i++) {
    if (buffer[i] === newline) {
      return { preceding: i, index: i + 1, carriage: false };
    }
    if (buffer[i] === carriage) {
      return { preceding: i, index: i + 1, carriage: true };
    }
  }
  return null;
}
function findDoubleNewlineIndex(buffer) {
  const newline = 10;
  const carriage = 13;
  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === newline && buffer[i + 1] === newline) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === carriage) {
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === newline && i + 3 < buffer.length && buffer[i + 2] === carriage && buffer[i + 3] === newline) {
      return i + 4;
    }
  }
  return -1;
}

// node_modules/@langchain/openai/node_modules/openai/internal/stream-utils.mjs
function ReadableStreamToAsyncIterable(stream) {
  if (stream[Symbol.asyncIterator])
    return stream;
  const reader = stream.getReader();
  return {
    async next() {
      try {
        const result = await reader.read();
        if (result == null ? void 0 : result.done)
          reader.releaseLock();
        return result;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return() {
      const cancelPromise = reader.cancel();
      reader.releaseLock();
      await cancelPromise;
      return { done: true, value: void 0 };
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}

// node_modules/@langchain/openai/node_modules/openai/streaming.mjs
var Stream = class _Stream {
  constructor(iterator, controller) {
    this.iterator = iterator;
    this.controller = controller;
  }
  static fromSSEResponse(response, controller) {
    let consumed = false;
    async function* iterator() {
      if (consumed) {
        throw new Error("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const sse of _iterSSEMessages(response, controller)) {
          if (done)
            continue;
          if (sse.data.startsWith("[DONE]")) {
            done = true;
            continue;
          }
          if (sse.event === null || sse.event.startsWith("response.") || sse.event.startsWith("transcript.")) {
            let data;
            try {
              data = JSON.parse(sse.data);
            } catch (e) {
              console.error(`Could not parse message into JSON:`, sse.data);
              console.error(`From chunk:`, sse.raw);
              throw e;
            }
            if (data && data.error) {
              throw new APIError(void 0, data.error, void 0, createResponseHeaders(response.headers));
            }
            yield data;
          } else {
            let data;
            try {
              data = JSON.parse(sse.data);
            } catch (e) {
              console.error(`Could not parse message into JSON:`, sse.data);
              console.error(`From chunk:`, sse.raw);
              throw e;
            }
            if (sse.event == "error") {
              throw new APIError(void 0, data.error, data.message, void 0);
            }
            yield { event: sse.event, data };
          }
        }
        done = true;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError")
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new _Stream(iterator, controller);
  }
  /**
   * Generates a Stream from a newline-separated ReadableStream
   * where each item is a JSON value.
   */
  static fromReadableStream(readableStream, controller) {
    let consumed = false;
    async function* iterLines() {
      const lineDecoder = new LineDecoder();
      const iter = ReadableStreamToAsyncIterable(readableStream);
      for await (const chunk of iter) {
        for (const line of lineDecoder.decode(chunk)) {
          yield line;
        }
      }
      for (const line of lineDecoder.flush()) {
        yield line;
      }
    }
    async function* iterator() {
      if (consumed) {
        throw new Error("Cannot iterate over a consumed stream, use `.tee()` to split the stream.");
      }
      consumed = true;
      let done = false;
      try {
        for await (const line of iterLines()) {
          if (done)
            continue;
          if (line)
            yield JSON.parse(line);
        }
        done = true;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError")
          return;
        throw e;
      } finally {
        if (!done)
          controller.abort();
      }
    }
    return new _Stream(iterator, controller);
  }
  [Symbol.asyncIterator]() {
    return this.iterator();
  }
  /**
   * Splits the stream into two streams which can be
   * independently read from at different speeds.
   */
  tee() {
    const left = [];
    const right = [];
    const iterator = this.iterator();
    const teeIterator = (queue) => {
      return {
        next: () => {
          if (queue.length === 0) {
            const result = iterator.next();
            left.push(result);
            right.push(result);
          }
          return queue.shift();
        }
      };
    };
    return [
      new _Stream(() => teeIterator(left), this.controller),
      new _Stream(() => teeIterator(right), this.controller)
    ];
  }
  /**
   * Converts this stream to a newline-separated ReadableStream of
   * JSON stringified values in the stream
   * which can be turned back into a Stream with `Stream.fromReadableStream()`.
   */
  toReadableStream() {
    const self = this;
    let iter;
    const encoder = new TextEncoder();
    return new ReadableStream2({
      async start() {
        iter = self[Symbol.asyncIterator]();
      },
      async pull(ctrl) {
        try {
          const { value, done } = await iter.next();
          if (done)
            return ctrl.close();
          const bytes = encoder.encode(JSON.stringify(value) + "\n");
          ctrl.enqueue(bytes);
        } catch (err) {
          ctrl.error(err);
        }
      },
      async cancel() {
        var _a2;
        await ((_a2 = iter.return) == null ? void 0 : _a2.call(iter));
      }
    });
  }
};
async function* _iterSSEMessages(response, controller) {
  if (!response.body) {
    controller.abort();
    throw new OpenAIError(`Attempted to iterate over a response with no body`);
  }
  const sseDecoder = new SSEDecoder();
  const lineDecoder = new LineDecoder();
  const iter = ReadableStreamToAsyncIterable(response.body);
  for await (const sseChunk of iterSSEChunks(iter)) {
    for (const line of lineDecoder.decode(sseChunk)) {
      const sse = sseDecoder.decode(line);
      if (sse)
        yield sse;
    }
  }
  for (const line of lineDecoder.flush()) {
    const sse = sseDecoder.decode(line);
    if (sse)
      yield sse;
  }
}
async function* iterSSEChunks(iterator) {
  let data = new Uint8Array();
  for await (const chunk of iterator) {
    if (chunk == null) {
      continue;
    }
    const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
    let newData = new Uint8Array(data.length + binaryChunk.length);
    newData.set(data);
    newData.set(binaryChunk, data.length);
    data = newData;
    let patternIndex;
    while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
      yield data.slice(0, patternIndex);
      data = data.slice(patternIndex);
    }
  }
  if (data.length > 0) {
    yield data;
  }
}
var SSEDecoder = class {
  constructor() {
    this.event = null;
    this.data = [];
    this.chunks = [];
  }
  decode(line) {
    if (line.endsWith("\r")) {
      line = line.substring(0, line.length - 1);
    }
    if (!line) {
      if (!this.event && !this.data.length)
        return null;
      const sse = {
        event: this.event,
        data: this.data.join("\n"),
        raw: this.chunks
      };
      this.event = null;
      this.data = [];
      this.chunks = [];
      return sse;
    }
    this.chunks.push(line);
    if (line.startsWith(":")) {
      return null;
    }
    let [fieldname, _, value] = partition(line, ":");
    if (value.startsWith(" ")) {
      value = value.substring(1);
    }
    if (fieldname === "event") {
      this.event = value;
    } else if (fieldname === "data") {
      this.data.push(value);
    }
    return null;
  }
};
function partition(str2, delimiter) {
  const index = str2.indexOf(delimiter);
  if (index !== -1) {
    return [str2.substring(0, index), delimiter, str2.substring(index + delimiter.length)];
  }
  return [str2, "", ""];
}

// node_modules/@langchain/openai/node_modules/openai/uploads.mjs
var isResponseLike = (value) => value != null && typeof value === "object" && typeof value.url === "string" && typeof value.blob === "function";
var isFileLike = (value) => value != null && typeof value === "object" && typeof value.name === "string" && typeof value.lastModified === "number" && isBlobLike(value);
var isBlobLike = (value) => value != null && typeof value === "object" && typeof value.size === "number" && typeof value.type === "string" && typeof value.text === "function" && typeof value.slice === "function" && typeof value.arrayBuffer === "function";
var isUploadable = (value) => {
  return isFileLike(value) || isResponseLike(value) || isFsReadStream(value);
};
async function toFile(value, name, options) {
  var _a2;
  value = await value;
  if (isFileLike(value)) {
    return value;
  }
  if (isResponseLike(value)) {
    const blob = await value.blob();
    name || (name = new URL(value.url).pathname.split(/[\\/]/).pop() ?? "unknown_file");
    const data = isBlobLike(blob) ? [await blob.arrayBuffer()] : [blob];
    return new File2(data, name, options);
  }
  const bits = await getBytes(value);
  name || (name = getName(value) ?? "unknown_file");
  if (!(options == null ? void 0 : options.type)) {
    const type = (_a2 = bits[0]) == null ? void 0 : _a2.type;
    if (typeof type === "string") {
      options = { ...options, type };
    }
  }
  return new File2(bits, name, options);
}
async function getBytes(value) {
  var _a2;
  let parts = [];
  if (typeof value === "string" || ArrayBuffer.isView(value) || // includes Uint8Array, Buffer, etc.
  value instanceof ArrayBuffer) {
    parts.push(value);
  } else if (isBlobLike(value)) {
    parts.push(await value.arrayBuffer());
  } else if (isAsyncIterableIterator(value)) {
    for await (const chunk of value) {
      parts.push(chunk);
    }
  } else {
    throw new Error(`Unexpected data type: ${typeof value}; constructor: ${(_a2 = value == null ? void 0 : value.constructor) == null ? void 0 : _a2.name}; props: ${propsForError(value)}`);
  }
  return parts;
}
function propsForError(value) {
  const props = Object.getOwnPropertyNames(value);
  return `[${props.map((p) => `"${p}"`).join(", ")}]`;
}
function getName(value) {
  var _a2;
  return getStringFromMaybeBuffer(value.name) || getStringFromMaybeBuffer(value.filename) || // For fs.ReadStream
  ((_a2 = getStringFromMaybeBuffer(value.path)) == null ? void 0 : _a2.split(/[\\/]/).pop());
}
var getStringFromMaybeBuffer = (x) => {
  if (typeof x === "string")
    return x;
  if (typeof Buffer !== "undefined" && x instanceof Buffer)
    return String(x);
  return void 0;
};
var isAsyncIterableIterator = (value) => value != null && typeof value === "object" && typeof value[Symbol.asyncIterator] === "function";
var isMultipartBody = (body) => body && typeof body === "object" && body.body && body[Symbol.toStringTag] === "MultipartBody";
var multipartFormRequestOptions = async (opts) => {
  const form = await createForm(opts.body);
  return getMultipartRequestOptions(form, opts);
};
var createForm = async (body) => {
  const form = new FormData2();
  await Promise.all(Object.entries(body || {}).map(([key, value]) => addFormValue(form, key, value)));
  return form;
};
var addFormValue = async (form, key, value) => {
  if (value === void 0)
    return;
  if (value == null) {
    throw new TypeError(`Received null for "${key}"; to pass null in FormData, you must use the string 'null'`);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    form.append(key, String(value));
  } else if (isUploadable(value)) {
    const file = await toFile(value);
    form.append(key, file);
  } else if (Array.isArray(value)) {
    await Promise.all(value.map((entry) => addFormValue(form, key + "[]", entry)));
  } else if (typeof value === "object") {
    await Promise.all(Object.entries(value).map(([name, prop]) => addFormValue(form, `${key}[${name}]`, prop)));
  } else {
    throw new TypeError(`Invalid value given to form, expected a string, number, boolean, object, Array, File or Blob but got ${value} instead`);
  }
};

// node_modules/@langchain/openai/node_modules/openai/core.mjs
var __classPrivateFieldSet2 = function(receiver, state, value, kind2, f) {
  if (kind2 === "m") throw new TypeError("Private method is not writable");
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind2 === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet2 = function(receiver, state, kind2, f) {
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind2 === "m" ? f : kind2 === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AbstractPage_client;
init();
async function defaultParseResponse(props) {
  var _a2;
  const { response } = props;
  if (props.options.stream) {
    debug("response", response.status, response.url, response.headers, response.body);
    if (props.options.__streamClass) {
      return props.options.__streamClass.fromSSEResponse(response, props.controller);
    }
    return Stream.fromSSEResponse(response, props.controller);
  }
  if (response.status === 204) {
    return null;
  }
  if (props.options.__binaryResponse) {
    return response;
  }
  const contentType = response.headers.get("content-type");
  const mediaType = (_a2 = contentType == null ? void 0 : contentType.split(";")[0]) == null ? void 0 : _a2.trim();
  const isJSON = (mediaType == null ? void 0 : mediaType.includes("application/json")) || (mediaType == null ? void 0 : mediaType.endsWith("+json"));
  if (isJSON) {
    const json = await response.json();
    debug("response", response.status, response.url, response.headers, json);
    return _addRequestID(json, response);
  }
  const text = await response.text();
  debug("response", response.status, response.url, response.headers, text);
  return text;
}
function _addRequestID(value, response) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.defineProperty(value, "_request_id", {
    value: response.headers.get("x-request-id"),
    enumerable: false
  });
}
var APIPromise = class _APIPromise extends Promise {
  constructor(responsePromise, parseResponse2 = defaultParseResponse) {
    super((resolve) => {
      resolve(null);
    });
    this.responsePromise = responsePromise;
    this.parseResponse = parseResponse2;
  }
  _thenUnwrap(transform) {
    return new _APIPromise(this.responsePromise, async (props) => _addRequestID(transform(await this.parseResponse(props), props), props.response));
  }
  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` if you can,
   * or add one of these imports before your first `import … from 'openai'`:
   * - `import 'openai/shims/node'` (if you're running on Node)
   * - `import 'openai/shims/web'` (otherwise)
   */
  asResponse() {
    return this.responsePromise.then((p) => p.response);
  }
  /**
   * Gets the parsed response data, the raw `Response` instance and the ID of the request,
   * returned via the X-Request-ID header which is useful for debugging requests and reporting
   * issues to OpenAI.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   *
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` if you can,
   * or add one of these imports before your first `import … from 'openai'`:
   * - `import 'openai/shims/node'` (if you're running on Node)
   * - `import 'openai/shims/web'` (otherwise)
   */
  async withResponse() {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response, request_id: response.headers.get("x-request-id") };
  }
  parse() {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then(this.parseResponse);
    }
    return this.parsedPromise;
  }
  then(onfulfilled, onrejected) {
    return this.parse().then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.parse().catch(onrejected);
  }
  finally(onfinally) {
    return this.parse().finally(onfinally);
  }
};
var APIClient = class {
  constructor({
    baseURL,
    maxRetries = 2,
    timeout = 6e5,
    // 10 minutes
    httpAgent,
    fetch: overriddenFetch
  }) {
    this.baseURL = baseURL;
    this.maxRetries = validatePositiveInteger("maxRetries", maxRetries);
    this.timeout = validatePositiveInteger("timeout", timeout);
    this.httpAgent = httpAgent;
    this.fetch = overriddenFetch ?? fetch2;
  }
  authHeaders(opts) {
    return {};
  }
  /**
   * Override this to add your own default headers, for example:
   *
   *  {
   *    ...super.defaultHeaders(),
   *    Authorization: 'Bearer 123',
   *  }
   */
  defaultHeaders(opts) {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": this.getUserAgent(),
      ...getPlatformHeaders(),
      ...this.authHeaders(opts)
    };
  }
  /**
   * Override this to add your own headers validation:
   */
  validateHeaders(headers, customHeaders) {
  }
  defaultIdempotencyKey() {
    return `stainless-node-retry-${uuid4()}`;
  }
  get(path, opts) {
    return this.methodRequest("get", path, opts);
  }
  post(path, opts) {
    return this.methodRequest("post", path, opts);
  }
  patch(path, opts) {
    return this.methodRequest("patch", path, opts);
  }
  put(path, opts) {
    return this.methodRequest("put", path, opts);
  }
  delete(path, opts) {
    return this.methodRequest("delete", path, opts);
  }
  methodRequest(method, path, opts) {
    return this.request(Promise.resolve(opts).then(async (opts2) => {
      const body = opts2 && isBlobLike(opts2 == null ? void 0 : opts2.body) ? new DataView(await opts2.body.arrayBuffer()) : (opts2 == null ? void 0 : opts2.body) instanceof DataView ? opts2.body : (opts2 == null ? void 0 : opts2.body) instanceof ArrayBuffer ? new DataView(opts2.body) : opts2 && ArrayBuffer.isView(opts2 == null ? void 0 : opts2.body) ? new DataView(opts2.body.buffer) : opts2 == null ? void 0 : opts2.body;
      return { method, path, ...opts2, body };
    }));
  }
  getAPIList(path, Page2, opts) {
    return this.requestAPIList(Page2, { method: "get", path, ...opts });
  }
  calculateContentLength(body) {
    if (typeof body === "string") {
      if (typeof Buffer !== "undefined") {
        return Buffer.byteLength(body, "utf8").toString();
      }
      if (typeof TextEncoder !== "undefined") {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(body);
        return encoded.length.toString();
      }
    } else if (ArrayBuffer.isView(body)) {
      return body.byteLength.toString();
    }
    return null;
  }
  buildRequest(inputOptions, { retryCount = 0 } = {}) {
    var _a2;
    const options = { ...inputOptions };
    const { method, path, query, headers = {} } = options;
    const body = ArrayBuffer.isView(options.body) || options.__binaryRequest && typeof options.body === "string" ? options.body : isMultipartBody(options.body) ? options.body.body : options.body ? JSON.stringify(options.body, null, 2) : null;
    const contentLength = this.calculateContentLength(body);
    const url = this.buildURL(path, query);
    if ("timeout" in options)
      validatePositiveInteger("timeout", options.timeout);
    options.timeout = options.timeout ?? this.timeout;
    const httpAgent = options.httpAgent ?? this.httpAgent ?? getDefaultAgent(url);
    const minAgentTimeout = options.timeout + 1e3;
    if (typeof ((_a2 = httpAgent == null ? void 0 : httpAgent.options) == null ? void 0 : _a2.timeout) === "number" && minAgentTimeout > (httpAgent.options.timeout ?? 0)) {
      httpAgent.options.timeout = minAgentTimeout;
    }
    if (this.idempotencyHeader && method !== "get") {
      if (!inputOptions.idempotencyKey)
        inputOptions.idempotencyKey = this.defaultIdempotencyKey();
      headers[this.idempotencyHeader] = inputOptions.idempotencyKey;
    }
    const reqHeaders = this.buildHeaders({ options, headers, contentLength, retryCount });
    const req = {
      method,
      ...body && { body },
      headers: reqHeaders,
      ...httpAgent && { agent: httpAgent },
      // @ts-ignore node-fetch uses a custom AbortSignal type that is
      // not compatible with standard web types
      signal: options.signal ?? null
    };
    return { req, url, timeout: options.timeout };
  }
  buildHeaders({ options, headers, contentLength, retryCount }) {
    const reqHeaders = {};
    if (contentLength) {
      reqHeaders["content-length"] = contentLength;
    }
    const defaultHeaders = this.defaultHeaders(options);
    applyHeadersMut(reqHeaders, defaultHeaders);
    applyHeadersMut(reqHeaders, headers);
    if (isMultipartBody(options.body) && kind !== "node") {
      delete reqHeaders["content-type"];
    }
    if (getHeader(defaultHeaders, "x-stainless-retry-count") === void 0 && getHeader(headers, "x-stainless-retry-count") === void 0) {
      reqHeaders["x-stainless-retry-count"] = String(retryCount);
    }
    if (getHeader(defaultHeaders, "x-stainless-timeout") === void 0 && getHeader(headers, "x-stainless-timeout") === void 0 && options.timeout) {
      reqHeaders["x-stainless-timeout"] = String(Math.trunc(options.timeout / 1e3));
    }
    this.validateHeaders(reqHeaders, headers);
    return reqHeaders;
  }
  /**
   * Used as a callback for mutating the given `FinalRequestOptions` object.
   */
  async prepareOptions(options) {
  }
  /**
   * Used as a callback for mutating the given `RequestInit` object.
   *
   * This is useful for cases where you want to add certain headers based off of
   * the request properties, e.g. `method` or `url`.
   */
  async prepareRequest(request, { url, options }) {
  }
  parseHeaders(headers) {
    return !headers ? {} : Symbol.iterator in headers ? Object.fromEntries(Array.from(headers).map((header) => [...header])) : { ...headers };
  }
  makeStatusError(status, error, message, headers) {
    return APIError.generate(status, error, message, headers);
  }
  request(options, remainingRetries = null) {
    return new APIPromise(this.makeRequest(options, remainingRetries));
  }
  async makeRequest(optionsInput, retriesRemaining) {
    var _a2, _b;
    const options = await optionsInput;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }
    await this.prepareOptions(options);
    const { req, url, timeout } = this.buildRequest(options, { retryCount: maxRetries - retriesRemaining });
    await this.prepareRequest(req, { url, options });
    debug("request", url, options, req.headers);
    if ((_a2 = options.signal) == null ? void 0 : _a2.aborted) {
      throw new APIUserAbortError();
    }
    const controller = new AbortController();
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);
    if (response instanceof Error) {
      if ((_b = options.signal) == null ? void 0 : _b.aborted) {
        throw new APIUserAbortError();
      }
      if (retriesRemaining) {
        return this.retryRequest(options, retriesRemaining);
      }
      if (response.name === "AbortError") {
        throw new APIConnectionTimeoutError();
      }
      throw new APIConnectionError({ cause: response });
    }
    const responseHeaders = createResponseHeaders(response.headers);
    if (!response.ok) {
      if (retriesRemaining && this.shouldRetry(response)) {
        const retryMessage2 = `retrying, ${retriesRemaining} attempts remaining`;
        debug(`response (error; ${retryMessage2})`, response.status, url, responseHeaders);
        return this.retryRequest(options, retriesRemaining, responseHeaders);
      }
      const errText = await response.text().catch((e) => castToError(e).message);
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? void 0 : errText;
      const retryMessage = retriesRemaining ? `(error; no more retries left)` : `(error; not retryable)`;
      debug(`response (error; ${retryMessage})`, response.status, url, responseHeaders, errMessage);
      const err = this.makeStatusError(response.status, errJSON, errMessage, responseHeaders);
      throw err;
    }
    return { response, options, controller };
  }
  requestAPIList(Page2, options) {
    const request = this.makeRequest(options, null);
    return new PagePromise(this, request, Page2);
  }
  buildURL(path, query) {
    const url = isAbsoluteURL(path) ? new URL(path) : new URL(this.baseURL + (this.baseURL.endsWith("/") && path.startsWith("/") ? path.slice(1) : path));
    const defaultQuery = this.defaultQuery();
    if (!isEmptyObj(defaultQuery)) {
      query = { ...defaultQuery, ...query };
    }
    if (typeof query === "object" && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query);
    }
    return url.toString();
  }
  stringifyQuery(query) {
    return Object.entries(query).filter(([_, value]) => typeof value !== "undefined").map(([key, value]) => {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }
      if (value === null) {
        return `${encodeURIComponent(key)}=`;
      }
      throw new OpenAIError(`Cannot stringify type ${typeof value}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`);
    }).join("&");
  }
  async fetchWithTimeout(url, init2, ms, controller) {
    const { signal, ...options } = init2 || {};
    if (signal)
      signal.addEventListener("abort", () => controller.abort());
    const timeout = setTimeout(() => controller.abort(), ms);
    const fetchOptions = {
      signal: controller.signal,
      ...options
    };
    if (fetchOptions.method) {
      fetchOptions.method = fetchOptions.method.toUpperCase();
    }
    return (
      // use undefined this binding; fetch errors if bound to something else in browser/cloudflare
      this.fetch.call(void 0, url, fetchOptions).finally(() => {
        clearTimeout(timeout);
      })
    );
  }
  shouldRetry(response) {
    const shouldRetryHeader = response.headers.get("x-should-retry");
    if (shouldRetryHeader === "true")
      return true;
    if (shouldRetryHeader === "false")
      return false;
    if (response.status === 408)
      return true;
    if (response.status === 409)
      return true;
    if (response.status === 429)
      return true;
    if (response.status >= 500)
      return true;
    return false;
  }
  async retryRequest(options, retriesRemaining, responseHeaders) {
    let timeoutMillis;
    const retryAfterMillisHeader = responseHeaders == null ? void 0 : responseHeaders["retry-after-ms"];
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }
    const retryAfterHeader = responseHeaders == null ? void 0 : responseHeaders["retry-after"];
    if (retryAfterHeader && !timeoutMillis) {
      const timeoutSeconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1e3;
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
    }
    if (!(timeoutMillis && 0 <= timeoutMillis && timeoutMillis < 60 * 1e3)) {
      const maxRetries = options.maxRetries ?? this.maxRetries;
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
    }
    await sleep(timeoutMillis);
    return this.makeRequest(options, retriesRemaining - 1);
  }
  calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
    const initialRetryDelay = 0.5;
    const maxRetryDelay = 8;
    const numRetries = maxRetries - retriesRemaining;
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);
    const jitter = 1 - Math.random() * 0.25;
    return sleepSeconds * jitter * 1e3;
  }
  getUserAgent() {
    return `${this.constructor.name}/JS ${VERSION}`;
  }
};
var AbstractPage = class {
  constructor(client, response, body, options) {
    _AbstractPage_client.set(this, void 0);
    __classPrivateFieldSet2(this, _AbstractPage_client, client, "f");
    this.options = options;
    this.response = response;
    this.body = body;
  }
  hasNextPage() {
    const items = this.getPaginatedItems();
    if (!items.length)
      return false;
    return this.nextPageInfo() != null;
  }
  async getNextPage() {
    const nextInfo = this.nextPageInfo();
    if (!nextInfo) {
      throw new OpenAIError("No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.");
    }
    const nextOptions = { ...this.options };
    if ("params" in nextInfo && typeof nextOptions.query === "object") {
      nextOptions.query = { ...nextOptions.query, ...nextInfo.params };
    } else if ("url" in nextInfo) {
      const params = [...Object.entries(nextOptions.query || {}), ...nextInfo.url.searchParams.entries()];
      for (const [key, value] of params) {
        nextInfo.url.searchParams.set(key, value);
      }
      nextOptions.query = void 0;
      nextOptions.path = nextInfo.url.toString();
    }
    return await __classPrivateFieldGet2(this, _AbstractPage_client, "f").requestAPIList(this.constructor, nextOptions);
  }
  async *iterPages() {
    let page = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }
  async *[(_AbstractPage_client = /* @__PURE__ */ new WeakMap(), Symbol.asyncIterator)]() {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
};
var PagePromise = class extends APIPromise {
  constructor(client, request, Page2) {
    super(request, async (props) => new Page2(client, props.response, await defaultParseResponse(props), props.options));
  }
  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator]() {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
};
var createResponseHeaders = (headers) => {
  return new Proxy(Object.fromEntries(
    // @ts-ignore
    headers.entries()
  ), {
    get(target, name) {
      const key = name.toString();
      return target[key.toLowerCase()] || target[key];
    }
  });
};
var requestOptionsKeys = {
  method: true,
  path: true,
  query: true,
  body: true,
  headers: true,
  maxRetries: true,
  stream: true,
  timeout: true,
  httpAgent: true,
  signal: true,
  idempotencyKey: true,
  __metadata: true,
  __binaryRequest: true,
  __binaryResponse: true,
  __streamClass: true
};
var isRequestOptions = (obj) => {
  return typeof obj === "object" && obj !== null && !isEmptyObj(obj) && Object.keys(obj).every((k) => hasOwn(requestOptionsKeys, k));
};
var getPlatformProperties = () => {
  var _a2;
  if (typeof Deno !== "undefined" && Deno.build != null) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(Deno.build.os),
      "X-Stainless-Arch": normalizeArch(Deno.build.arch),
      "X-Stainless-Runtime": "deno",
      "X-Stainless-Runtime-Version": typeof Deno.version === "string" ? Deno.version : ((_a2 = Deno.version) == null ? void 0 : _a2.deno) ?? "unknown"
    };
  }
  if (typeof EdgeRuntime !== "undefined") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": `other:${EdgeRuntime}`,
      "X-Stainless-Runtime": "edge",
      "X-Stainless-Runtime-Version": process.version
    };
  }
  if (Object.prototype.toString.call(typeof process !== "undefined" ? process : 0) === "[object process]") {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": normalizePlatform(process.platform),
      "X-Stainless-Arch": normalizeArch(process.arch),
      "X-Stainless-Runtime": "node",
      "X-Stainless-Runtime-Version": process.version
    };
  }
  const browserInfo = getBrowserInfo();
  if (browserInfo) {
    return {
      "X-Stainless-Lang": "js",
      "X-Stainless-Package-Version": VERSION,
      "X-Stainless-OS": "Unknown",
      "X-Stainless-Arch": "unknown",
      "X-Stainless-Runtime": `browser:${browserInfo.browser}`,
      "X-Stainless-Runtime-Version": browserInfo.version
    };
  }
  return {
    "X-Stainless-Lang": "js",
    "X-Stainless-Package-Version": VERSION,
    "X-Stainless-OS": "Unknown",
    "X-Stainless-Arch": "unknown",
    "X-Stainless-Runtime": "unknown",
    "X-Stainless-Runtime-Version": "unknown"
  };
};
function getBrowserInfo() {
  if (typeof navigator === "undefined" || !navigator) {
    return null;
  }
  const browserPatterns = [
    { key: "edge", pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "ie", pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "chrome", pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "firefox", pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: "safari", pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ }
  ];
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const major = match[1] || 0;
      const minor = match[2] || 0;
      const patch = match[3] || 0;
      return { browser: key, version: `${major}.${minor}.${patch}` };
    }
  }
  return null;
}
var normalizeArch = (arch) => {
  if (arch === "x32")
    return "x32";
  if (arch === "x86_64" || arch === "x64")
    return "x64";
  if (arch === "arm")
    return "arm";
  if (arch === "aarch64" || arch === "arm64")
    return "arm64";
  if (arch)
    return `other:${arch}`;
  return "unknown";
};
var normalizePlatform = (platform) => {
  platform = platform.toLowerCase();
  if (platform.includes("ios"))
    return "iOS";
  if (platform === "android")
    return "Android";
  if (platform === "darwin")
    return "MacOS";
  if (platform === "win32")
    return "Windows";
  if (platform === "freebsd")
    return "FreeBSD";
  if (platform === "openbsd")
    return "OpenBSD";
  if (platform === "linux")
    return "Linux";
  if (platform)
    return `Other:${platform}`;
  return "Unknown";
};
var _platformHeaders;
var getPlatformHeaders = () => {
  return _platformHeaders ?? (_platformHeaders = getPlatformProperties());
};
var safeJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return void 0;
  }
};
var startsWithSchemeRegexp = /^[a-z][a-z0-9+.-]*:/i;
var isAbsoluteURL = (url) => {
  return startsWithSchemeRegexp.test(url);
};
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var validatePositiveInteger = (name, n) => {
  if (typeof n !== "number" || !Number.isInteger(n)) {
    throw new OpenAIError(`${name} must be an integer`);
  }
  if (n < 0) {
    throw new OpenAIError(`${name} must be a positive integer`);
  }
  return n;
};
var castToError = (err) => {
  if (err instanceof Error)
    return err;
  if (typeof err === "object" && err !== null) {
    try {
      return new Error(JSON.stringify(err));
    } catch {
    }
  }
  return new Error(err);
};
var readEnv = (env) => {
  var _a2, _b, _c, _d, _e;
  if (typeof process !== "undefined") {
    return ((_b = (_a2 = process.env) == null ? void 0 : _a2[env]) == null ? void 0 : _b.trim()) ?? void 0;
  }
  if (typeof Deno !== "undefined") {
    return (_e = (_d = (_c = Deno.env) == null ? void 0 : _c.get) == null ? void 0 : _d.call(_c, env)) == null ? void 0 : _e.trim();
  }
  return void 0;
};
function isEmptyObj(obj) {
  if (!obj)
    return true;
  for (const _k in obj)
    return false;
  return true;
}
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
function applyHeadersMut(targetHeaders, newHeaders) {
  for (const k in newHeaders) {
    if (!hasOwn(newHeaders, k))
      continue;
    const lowerKey = k.toLowerCase();
    if (!lowerKey)
      continue;
    const val = newHeaders[k];
    if (val === null) {
      delete targetHeaders[lowerKey];
    } else if (val !== void 0) {
      targetHeaders[lowerKey] = val;
    }
  }
}
var SENSITIVE_HEADERS = /* @__PURE__ */ new Set(["authorization", "api-key"]);
function debug(action, ...args) {
  var _a2;
  if (typeof process !== "undefined" && ((_a2 = process == null ? void 0 : process.env) == null ? void 0 : _a2["DEBUG"]) === "true") {
    const modifiedArgs = args.map((arg) => {
      if (!arg) {
        return arg;
      }
      if (arg["headers"]) {
        const modifiedArg2 = { ...arg, headers: { ...arg["headers"] } };
        for (const header in arg["headers"]) {
          if (SENSITIVE_HEADERS.has(header.toLowerCase())) {
            modifiedArg2["headers"][header] = "REDACTED";
          }
        }
        return modifiedArg2;
      }
      let modifiedArg = null;
      for (const header in arg) {
        if (SENSITIVE_HEADERS.has(header.toLowerCase())) {
          modifiedArg ?? (modifiedArg = { ...arg });
          modifiedArg[header] = "REDACTED";
        }
      }
      return modifiedArg ?? arg;
    });
    console.log(`OpenAI:DEBUG:${action}`, ...modifiedArgs);
  }
}
var uuid4 = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : r & 3 | 8;
    return v.toString(16);
  });
};
var isRunningInBrowser = () => {
  return (
    // @ts-ignore
    typeof window !== "undefined" && // @ts-ignore
    typeof window.document !== "undefined" && // @ts-ignore
    typeof navigator !== "undefined"
  );
};
var isHeadersProtocol = (headers) => {
  return typeof (headers == null ? void 0 : headers.get) === "function";
};
var getHeader = (headers, header) => {
  var _a2;
  const lowerCasedHeader = header.toLowerCase();
  if (isHeadersProtocol(headers)) {
    const intercapsHeader = ((_a2 = header[0]) == null ? void 0 : _a2.toUpperCase()) + header.substring(1).replace(/([^\w])(\w)/g, (_m, g1, g2) => g1 + g2.toUpperCase());
    for (const key of [header, lowerCasedHeader, header.toUpperCase(), intercapsHeader]) {
      const value = headers.get(key);
      if (value) {
        return value;
      }
    }
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerCasedHeader) {
      if (Array.isArray(value)) {
        if (value.length <= 1)
          return value[0];
        console.warn(`Received ${value.length} entries for the ${header} header, using the first entry.`);
        return value[0];
      }
      return value;
    }
  }
  return void 0;
};
var toFloat32Array = (base64Str) => {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64Str, "base64");
    return Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.length / Float32Array.BYTES_PER_ELEMENT));
  } else {
    const binaryStr = atob(base64Str);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return Array.from(new Float32Array(bytes.buffer));
  }
};
function isObj(obj) {
  return obj != null && typeof obj === "object" && !Array.isArray(obj);
}

// node_modules/@langchain/openai/node_modules/openai/pagination.mjs
var Page = class extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.object = body.object;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  // @deprecated Please use `nextPageInfo()` instead
  /**
   * This page represents a response that isn't actually paginated at the API level
   * so there will never be any next page params.
   */
  nextPageParams() {
    return null;
  }
  nextPageInfo() {
    return null;
  }
};
var CursorPage = class extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.data = body.data || [];
    this.has_more = body.has_more || false;
  }
  getPaginatedItems() {
    return this.data ?? [];
  }
  hasNextPage() {
    if (this.has_more === false) {
      return false;
    }
    return super.hasNextPage();
  }
  // @deprecated Please use `nextPageInfo()` instead
  nextPageParams() {
    const info = this.nextPageInfo();
    if (!info)
      return null;
    if ("params" in info)
      return info.params;
    const params = Object.fromEntries(info.url.searchParams);
    if (!Object.keys(params).length)
      return null;
    return params;
  }
  nextPageInfo() {
    var _a2;
    const data = this.getPaginatedItems();
    if (!data.length) {
      return null;
    }
    const id = (_a2 = data[data.length - 1]) == null ? void 0 : _a2.id;
    if (!id) {
      return null;
    }
    return { params: { after: id } };
  }
};

// node_modules/@langchain/openai/node_modules/openai/resource.mjs
var APIResource = class {
  constructor(client) {
    this._client = client;
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/chat/completions/messages.mjs
var Messages = class extends APIResource {
  list(completionId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list(completionId, {}, query);
    }
    return this._client.getAPIList(`/chat/completions/${completionId}/messages`, ChatCompletionStoreMessagesPage, { query, ...options });
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/chat/completions/completions.mjs
var Completions = class extends APIResource {
  constructor() {
    super(...arguments);
    this.messages = new Messages(this._client);
  }
  create(body, options) {
    return this._client.post("/chat/completions", { body, ...options, stream: body.stream ?? false });
  }
  /**
   * Get a stored chat completion. Only Chat Completions that have been created with
   * the `store` parameter set to `true` will be returned.
   *
   * @example
   * ```ts
   * const chatCompletion =
   *   await client.chat.completions.retrieve('completion_id');
   * ```
   */
  retrieve(completionId, options) {
    return this._client.get(`/chat/completions/${completionId}`, options);
  }
  /**
   * Modify a stored chat completion. Only Chat Completions that have been created
   * with the `store` parameter set to `true` can be modified. Currently, the only
   * supported modification is to update the `metadata` field.
   *
   * @example
   * ```ts
   * const chatCompletion = await client.chat.completions.update(
   *   'completion_id',
   *   { metadata: { foo: 'string' } },
   * );
   * ```
   */
  update(completionId, body, options) {
    return this._client.post(`/chat/completions/${completionId}`, { body, ...options });
  }
  list(query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList("/chat/completions", ChatCompletionsPage, { query, ...options });
  }
  /**
   * Delete a stored chat completion. Only Chat Completions that have been created
   * with the `store` parameter set to `true` can be deleted.
   *
   * @example
   * ```ts
   * const chatCompletionDeleted =
   *   await client.chat.completions.del('completion_id');
   * ```
   */
  del(completionId, options) {
    return this._client.delete(`/chat/completions/${completionId}`, options);
  }
};
var ChatCompletionsPage = class extends CursorPage {
};
var ChatCompletionStoreMessagesPage = class extends CursorPage {
};
Completions.ChatCompletionsPage = ChatCompletionsPage;
Completions.Messages = Messages;

// node_modules/@langchain/openai/node_modules/openai/resources/chat/chat.mjs
var Chat = class extends APIResource {
  constructor() {
    super(...arguments);
    this.completions = new Completions(this._client);
  }
};
Chat.Completions = Completions;
Chat.ChatCompletionsPage = ChatCompletionsPage;

// node_modules/@langchain/openai/node_modules/openai/resources/audio/speech.mjs
var Speech = class extends APIResource {
  /**
   * Generates audio from the input text.
   *
   * @example
   * ```ts
   * const speech = await client.audio.speech.create({
   *   input: 'input',
   *   model: 'string',
   *   voice: 'ash',
   * });
   *
   * const content = await speech.blob();
   * console.log(content);
   * ```
   */
  create(body, options) {
    return this._client.post("/audio/speech", {
      body,
      ...options,
      headers: { Accept: "application/octet-stream", ...options == null ? void 0 : options.headers },
      __binaryResponse: true
    });
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/audio/transcriptions.mjs
var Transcriptions = class extends APIResource {
  create(body, options) {
    return this._client.post("/audio/transcriptions", multipartFormRequestOptions({
      body,
      ...options,
      stream: body.stream ?? false,
      __metadata: { model: body.model }
    }));
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/audio/translations.mjs
var Translations = class extends APIResource {
  create(body, options) {
    return this._client.post("/audio/translations", multipartFormRequestOptions({ body, ...options, __metadata: { model: body.model } }));
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/audio/audio.mjs
var Audio = class extends APIResource {
  constructor() {
    super(...arguments);
    this.transcriptions = new Transcriptions(this._client);
    this.translations = new Translations(this._client);
    this.speech = new Speech(this._client);
  }
};
Audio.Transcriptions = Transcriptions;
Audio.Translations = Translations;
Audio.Speech = Speech;

// node_modules/@langchain/openai/node_modules/openai/resources/batches.mjs
var Batches = class extends APIResource {
  /**
   * Creates and executes a batch from an uploaded file of requests
   */
  create(body, options) {
    return this._client.post("/batches", { body, ...options });
  }
  /**
   * Retrieves a batch.
   */
  retrieve(batchId, options) {
    return this._client.get(`/batches/${batchId}`, options);
  }
  list(query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList("/batches", BatchesPage, { query, ...options });
  }
  /**
   * Cancels an in-progress batch. The batch will be in status `cancelling` for up to
   * 10 minutes, before changing to `cancelled`, where it will have partial results
   * (if any) available in the output file.
   */
  cancel(batchId, options) {
    return this._client.post(`/batches/${batchId}/cancel`, options);
  }
};
var BatchesPage = class extends CursorPage {
};
Batches.BatchesPage = BatchesPage;

// node_modules/@langchain/openai/node_modules/openai/lib/EventStream.mjs
var __classPrivateFieldSet3 = function(receiver, state, value, kind2, f) {
  if (kind2 === "m") throw new TypeError("Private method is not writable");
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind2 === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet3 = function(receiver, state, kind2, f) {
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind2 === "m" ? f : kind2 === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _EventStream_instances;
var _EventStream_connectedPromise;
var _EventStream_resolveConnectedPromise;
var _EventStream_rejectConnectedPromise;
var _EventStream_endPromise;
var _EventStream_resolveEndPromise;
var _EventStream_rejectEndPromise;
var _EventStream_listeners;
var _EventStream_ended;
var _EventStream_errored;
var _EventStream_aborted;
var _EventStream_catchingPromiseCreated;
var _EventStream_handleError;
var EventStream = class {
  constructor() {
    _EventStream_instances.add(this);
    this.controller = new AbortController();
    _EventStream_connectedPromise.set(this, void 0);
    _EventStream_resolveConnectedPromise.set(this, () => {
    });
    _EventStream_rejectConnectedPromise.set(this, () => {
    });
    _EventStream_endPromise.set(this, void 0);
    _EventStream_resolveEndPromise.set(this, () => {
    });
    _EventStream_rejectEndPromise.set(this, () => {
    });
    _EventStream_listeners.set(this, {});
    _EventStream_ended.set(this, false);
    _EventStream_errored.set(this, false);
    _EventStream_aborted.set(this, false);
    _EventStream_catchingPromiseCreated.set(this, false);
    __classPrivateFieldSet3(this, _EventStream_connectedPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet3(this, _EventStream_resolveConnectedPromise, resolve, "f");
      __classPrivateFieldSet3(this, _EventStream_rejectConnectedPromise, reject, "f");
    }), "f");
    __classPrivateFieldSet3(this, _EventStream_endPromise, new Promise((resolve, reject) => {
      __classPrivateFieldSet3(this, _EventStream_resolveEndPromise, resolve, "f");
      __classPrivateFieldSet3(this, _EventStream_rejectEndPromise, reject, "f");
    }), "f");
    __classPrivateFieldGet3(this, _EventStream_connectedPromise, "f").catch(() => {
    });
    __classPrivateFieldGet3(this, _EventStream_endPromise, "f").catch(() => {
    });
  }
  _run(executor) {
    setTimeout(() => {
      executor().then(() => {
        this._emitFinal();
        this._emit("end");
      }, __classPrivateFieldGet3(this, _EventStream_instances, "m", _EventStream_handleError).bind(this));
    }, 0);
  }
  _connected() {
    if (this.ended)
      return;
    __classPrivateFieldGet3(this, _EventStream_resolveConnectedPromise, "f").call(this);
    this._emit("connect");
  }
  get ended() {
    return __classPrivateFieldGet3(this, _EventStream_ended, "f");
  }
  get errored() {
    return __classPrivateFieldGet3(this, _EventStream_errored, "f");
  }
  get aborted() {
    return __classPrivateFieldGet3(this, _EventStream_aborted, "f");
  }
  abort() {
    this.controller.abort();
  }
  /**
   * Adds the listener function to the end of the listeners array for the event.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of event and listener will result in the listener being added, and
   * called, multiple times.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  on(event, listener) {
    const listeners = __classPrivateFieldGet3(this, _EventStream_listeners, "f")[event] || (__classPrivateFieldGet3(this, _EventStream_listeners, "f")[event] = []);
    listeners.push({ listener });
    return this;
  }
  /**
   * Removes the specified listener from the listener array for the event.
   * off() will remove, at most, one instance of a listener from the listener array. If any single
   * listener has been added multiple times to the listener array for the specified event, then
   * off() must be called multiple times to remove each instance.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  off(event, listener) {
    const listeners = __classPrivateFieldGet3(this, _EventStream_listeners, "f")[event];
    if (!listeners)
      return this;
    const index = listeners.findIndex((l) => l.listener === listener);
    if (index >= 0)
      listeners.splice(index, 1);
    return this;
  }
  /**
   * Adds a one-time listener function for the event. The next time the event is triggered,
   * this listener is removed and then invoked.
   * @returns this ChatCompletionStream, so that calls can be chained
   */
  once(event, listener) {
    const listeners = __classPrivateFieldGet3(this, _EventStream_listeners, "f")[event] || (__classPrivateFieldGet3(this, _EventStream_listeners, "f")[event] = []);
    listeners.push({ listener, once: true });
    return this;
  }
  /**
   * This is similar to `.once()`, but returns a Promise that resolves the next time
   * the event is triggered, instead of calling a listener callback.
   * @returns a Promise that resolves the next time given event is triggered,
   * or rejects if an error is emitted.  (If you request the 'error' event,
   * returns a promise that resolves with the error).
   *
   * Example:
   *
   *   const message = await stream.emitted('message') // rejects if the stream errors
   */
  emitted(event) {
    return new Promise((resolve, reject) => {
      __classPrivateFieldSet3(this, _EventStream_catchingPromiseCreated, true, "f");
      if (event !== "error")
        this.once("error", reject);
      this.once(event, resolve);
    });
  }
  async done() {
    __classPrivateFieldSet3(this, _EventStream_catchingPromiseCreated, true, "f");
    await __classPrivateFieldGet3(this, _EventStream_endPromise, "f");
  }
  _emit(event, ...args) {
    if (__classPrivateFieldGet3(this, _EventStream_ended, "f")) {
      return;
    }
    if (event === "end") {
      __classPrivateFieldSet3(this, _EventStream_ended, true, "f");
      __classPrivateFieldGet3(this, _EventStream_resolveEndPromise, "f").call(this);
    }
    const listeners = __classPrivateFieldGet3(this, _EventStream_listeners, "f")[event];
    if (listeners) {
      __classPrivateFieldGet3(this, _EventStream_listeners, "f")[event] = listeners.filter((l) => !l.once);
      listeners.forEach(({ listener }) => listener(...args));
    }
    if (event === "abort") {
      const error = args[0];
      if (!__classPrivateFieldGet3(this, _EventStream_catchingPromiseCreated, "f") && !(listeners == null ? void 0 : listeners.length)) {
        Promise.reject(error);
      }
      __classPrivateFieldGet3(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet3(this, _EventStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
      return;
    }
    if (event === "error") {
      const error = args[0];
      if (!__classPrivateFieldGet3(this, _EventStream_catchingPromiseCreated, "f") && !(listeners == null ? void 0 : listeners.length)) {
        Promise.reject(error);
      }
      __classPrivateFieldGet3(this, _EventStream_rejectConnectedPromise, "f").call(this, error);
      __classPrivateFieldGet3(this, _EventStream_rejectEndPromise, "f").call(this, error);
      this._emit("end");
    }
  }
  _emitFinal() {
  }
};
_EventStream_connectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_resolveConnectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_rejectConnectedPromise = /* @__PURE__ */ new WeakMap(), _EventStream_endPromise = /* @__PURE__ */ new WeakMap(), _EventStream_resolveEndPromise = /* @__PURE__ */ new WeakMap(), _EventStream_rejectEndPromise = /* @__PURE__ */ new WeakMap(), _EventStream_listeners = /* @__PURE__ */ new WeakMap(), _EventStream_ended = /* @__PURE__ */ new WeakMap(), _EventStream_errored = /* @__PURE__ */ new WeakMap(), _EventStream_aborted = /* @__PURE__ */ new WeakMap(), _EventStream_catchingPromiseCreated = /* @__PURE__ */ new WeakMap(), _EventStream_instances = /* @__PURE__ */ new WeakSet(), _EventStream_handleError = function _EventStream_handleError2(error) {
  __classPrivateFieldSet3(this, _EventStream_errored, true, "f");
  if (error instanceof Error && error.name === "AbortError") {
    error = new APIUserAbortError();
  }
  if (error instanceof APIUserAbortError) {
    __classPrivateFieldSet3(this, _EventStream_aborted, true, "f");
    return this._emit("abort", error);
  }
  if (error instanceof OpenAIError) {
    return this._emit("error", error);
  }
  if (error instanceof Error) {
    const openAIError = new OpenAIError(error.message);
    openAIError.cause = error;
    return this._emit("error", openAIError);
  }
  return this._emit("error", new OpenAIError(String(error)));
};

// node_modules/@langchain/openai/node_modules/openai/lib/AssistantStream.mjs
var __classPrivateFieldGet4 = function(receiver, state, kind2, f) {
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind2 === "m" ? f : kind2 === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet4 = function(receiver, state, value, kind2, f) {
  if (kind2 === "m") throw new TypeError("Private method is not writable");
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind2 === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var _AssistantStream_instances;
var _AssistantStream_events;
var _AssistantStream_runStepSnapshots;
var _AssistantStream_messageSnapshots;
var _AssistantStream_messageSnapshot;
var _AssistantStream_finalRun;
var _AssistantStream_currentContentIndex;
var _AssistantStream_currentContent;
var _AssistantStream_currentToolCallIndex;
var _AssistantStream_currentToolCall;
var _AssistantStream_currentEvent;
var _AssistantStream_currentRunSnapshot;
var _AssistantStream_currentRunStepSnapshot;
var _AssistantStream_addEvent;
var _AssistantStream_endRequest;
var _AssistantStream_handleMessage;
var _AssistantStream_handleRunStep;
var _AssistantStream_handleEvent;
var _AssistantStream_accumulateRunStep;
var _AssistantStream_accumulateMessage;
var _AssistantStream_accumulateContent;
var _AssistantStream_handleRun;
var AssistantStream = class _AssistantStream extends EventStream {
  constructor() {
    super(...arguments);
    _AssistantStream_instances.add(this);
    _AssistantStream_events.set(this, []);
    _AssistantStream_runStepSnapshots.set(this, {});
    _AssistantStream_messageSnapshots.set(this, {});
    _AssistantStream_messageSnapshot.set(this, void 0);
    _AssistantStream_finalRun.set(this, void 0);
    _AssistantStream_currentContentIndex.set(this, void 0);
    _AssistantStream_currentContent.set(this, void 0);
    _AssistantStream_currentToolCallIndex.set(this, void 0);
    _AssistantStream_currentToolCall.set(this, void 0);
    _AssistantStream_currentEvent.set(this, void 0);
    _AssistantStream_currentRunSnapshot.set(this, void 0);
    _AssistantStream_currentRunStepSnapshot.set(this, void 0);
  }
  [(_AssistantStream_events = /* @__PURE__ */ new WeakMap(), _AssistantStream_runStepSnapshots = /* @__PURE__ */ new WeakMap(), _AssistantStream_messageSnapshots = /* @__PURE__ */ new WeakMap(), _AssistantStream_messageSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_finalRun = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentContentIndex = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentContent = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentToolCallIndex = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentToolCall = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentEvent = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentRunSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_currentRunStepSnapshot = /* @__PURE__ */ new WeakMap(), _AssistantStream_instances = /* @__PURE__ */ new WeakSet(), Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("event", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  static fromReadableStream(stream) {
    const runner = new _AssistantStream();
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  async _fromReadableStream(readableStream, options) {
    var _a2;
    const signal = options == null ? void 0 : options.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    this._connected();
    const stream = Stream.fromReadableStream(readableStream, this.controller);
    for await (const event of stream) {
      __classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if ((_a2 = stream.controller.signal) == null ? void 0 : _a2.aborted) {
      throw new APIUserAbortError();
    }
    return this._addRun(__classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
  static createToolAssistantStream(threadId, runId, runs, params, options) {
    const runner = new _AssistantStream();
    runner._run(() => runner._runToolAssistantStream(threadId, runId, runs, params, {
      ...options,
      headers: { ...options == null ? void 0 : options.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  async _createToolAssistantStream(run, threadId, runId, params, options) {
    var _a2;
    const signal = options == null ? void 0 : options.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    const body = { ...params, stream: true };
    const stream = await run.submitToolOutputs(threadId, runId, body, {
      ...options,
      signal: this.controller.signal
    });
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if ((_a2 = stream.controller.signal) == null ? void 0 : _a2.aborted) {
      throw new APIUserAbortError();
    }
    return this._addRun(__classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  static createThreadAssistantStream(params, thread, options) {
    const runner = new _AssistantStream();
    runner._run(() => runner._threadAssistantStream(params, thread, {
      ...options,
      headers: { ...options == null ? void 0 : options.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  static createAssistantStream(threadId, runs, params, options) {
    const runner = new _AssistantStream();
    runner._run(() => runner._runAssistantStream(threadId, runs, params, {
      ...options,
      headers: { ...options == null ? void 0 : options.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  currentEvent() {
    return __classPrivateFieldGet4(this, _AssistantStream_currentEvent, "f");
  }
  currentRun() {
    return __classPrivateFieldGet4(this, _AssistantStream_currentRunSnapshot, "f");
  }
  currentMessageSnapshot() {
    return __classPrivateFieldGet4(this, _AssistantStream_messageSnapshot, "f");
  }
  currentRunStepSnapshot() {
    return __classPrivateFieldGet4(this, _AssistantStream_currentRunStepSnapshot, "f");
  }
  async finalRunSteps() {
    await this.done();
    return Object.values(__classPrivateFieldGet4(this, _AssistantStream_runStepSnapshots, "f"));
  }
  async finalMessages() {
    await this.done();
    return Object.values(__classPrivateFieldGet4(this, _AssistantStream_messageSnapshots, "f"));
  }
  async finalRun() {
    await this.done();
    if (!__classPrivateFieldGet4(this, _AssistantStream_finalRun, "f"))
      throw Error("Final run was not received.");
    return __classPrivateFieldGet4(this, _AssistantStream_finalRun, "f");
  }
  async _createThreadAssistantStream(thread, params, options) {
    var _a2;
    const signal = options == null ? void 0 : options.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    const body = { ...params, stream: true };
    const stream = await thread.createAndRun(body, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if ((_a2 = stream.controller.signal) == null ? void 0 : _a2.aborted) {
      throw new APIUserAbortError();
    }
    return this._addRun(__classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  async _createAssistantStream(run, threadId, params, options) {
    var _a2;
    const signal = options == null ? void 0 : options.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    const body = { ...params, stream: true };
    const stream = await run.create(threadId, body, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_addEvent).call(this, event);
    }
    if ((_a2 = stream.controller.signal) == null ? void 0 : _a2.aborted) {
      throw new APIUserAbortError();
    }
    return this._addRun(__classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_endRequest).call(this));
  }
  static accumulateDelta(acc, delta) {
    for (const [key, deltaValue] of Object.entries(delta)) {
      if (!acc.hasOwnProperty(key)) {
        acc[key] = deltaValue;
        continue;
      }
      let accValue = acc[key];
      if (accValue === null || accValue === void 0) {
        acc[key] = deltaValue;
        continue;
      }
      if (key === "index" || key === "type") {
        acc[key] = deltaValue;
        continue;
      }
      if (typeof accValue === "string" && typeof deltaValue === "string") {
        accValue += deltaValue;
      } else if (typeof accValue === "number" && typeof deltaValue === "number") {
        accValue += deltaValue;
      } else if (isObj(accValue) && isObj(deltaValue)) {
        accValue = this.accumulateDelta(accValue, deltaValue);
      } else if (Array.isArray(accValue) && Array.isArray(deltaValue)) {
        if (accValue.every((x) => typeof x === "string" || typeof x === "number")) {
          accValue.push(...deltaValue);
          continue;
        }
        for (const deltaEntry of deltaValue) {
          if (!isObj(deltaEntry)) {
            throw new Error(`Expected array delta entry to be an object but got: ${deltaEntry}`);
          }
          const index = deltaEntry["index"];
          if (index == null) {
            console.error(deltaEntry);
            throw new Error("Expected array delta entry to have an `index` property");
          }
          if (typeof index !== "number") {
            throw new Error(`Expected array delta entry \`index\` property to be a number but got ${index}`);
          }
          const accEntry = accValue[index];
          if (accEntry == null) {
            accValue.push(deltaEntry);
          } else {
            accValue[index] = this.accumulateDelta(accEntry, deltaEntry);
          }
        }
        continue;
      } else {
        throw Error(`Unhandled record type: ${key}, deltaValue: ${deltaValue}, accValue: ${accValue}`);
      }
      acc[key] = accValue;
    }
    return acc;
  }
  _addRun(run) {
    return run;
  }
  async _threadAssistantStream(params, thread, options) {
    return await this._createThreadAssistantStream(thread, params, options);
  }
  async _runAssistantStream(threadId, runs, params, options) {
    return await this._createAssistantStream(runs, threadId, params, options);
  }
  async _runToolAssistantStream(threadId, runId, runs, params, options) {
    return await this._createToolAssistantStream(runs, threadId, runId, params, options);
  }
};
_AssistantStream_addEvent = function _AssistantStream_addEvent2(event) {
  if (this.ended)
    return;
  __classPrivateFieldSet4(this, _AssistantStream_currentEvent, event, "f");
  __classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_handleEvent).call(this, event);
  switch (event.event) {
    case "thread.created":
      break;
    case "thread.run.created":
    case "thread.run.queued":
    case "thread.run.in_progress":
    case "thread.run.requires_action":
    case "thread.run.completed":
    case "thread.run.incomplete":
    case "thread.run.failed":
    case "thread.run.cancelling":
    case "thread.run.cancelled":
    case "thread.run.expired":
      __classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_handleRun).call(this, event);
      break;
    case "thread.run.step.created":
    case "thread.run.step.in_progress":
    case "thread.run.step.delta":
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
      __classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_handleRunStep).call(this, event);
      break;
    case "thread.message.created":
    case "thread.message.in_progress":
    case "thread.message.delta":
    case "thread.message.completed":
    case "thread.message.incomplete":
      __classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_handleMessage).call(this, event);
      break;
    case "error":
      throw new Error("Encountered an error event in event processing - errors should be processed earlier");
    default:
      assertNever(event);
  }
}, _AssistantStream_endRequest = function _AssistantStream_endRequest2() {
  if (this.ended) {
    throw new OpenAIError(`stream has ended, this shouldn't happen`);
  }
  if (!__classPrivateFieldGet4(this, _AssistantStream_finalRun, "f"))
    throw Error("Final run has not been received");
  return __classPrivateFieldGet4(this, _AssistantStream_finalRun, "f");
}, _AssistantStream_handleMessage = function _AssistantStream_handleMessage2(event) {
  const [accumulatedMessage, newContent] = __classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_accumulateMessage).call(this, event, __classPrivateFieldGet4(this, _AssistantStream_messageSnapshot, "f"));
  __classPrivateFieldSet4(this, _AssistantStream_messageSnapshot, accumulatedMessage, "f");
  __classPrivateFieldGet4(this, _AssistantStream_messageSnapshots, "f")[accumulatedMessage.id] = accumulatedMessage;
  for (const content of newContent) {
    const snapshotContent = accumulatedMessage.content[content.index];
    if ((snapshotContent == null ? void 0 : snapshotContent.type) == "text") {
      this._emit("textCreated", snapshotContent.text);
    }
  }
  switch (event.event) {
    case "thread.message.created":
      this._emit("messageCreated", event.data);
      break;
    case "thread.message.in_progress":
      break;
    case "thread.message.delta":
      this._emit("messageDelta", event.data.delta, accumulatedMessage);
      if (event.data.delta.content) {
        for (const content of event.data.delta.content) {
          if (content.type == "text" && content.text) {
            let textDelta = content.text;
            let snapshot = accumulatedMessage.content[content.index];
            if (snapshot && snapshot.type == "text") {
              this._emit("textDelta", textDelta, snapshot.text);
            } else {
              throw Error("The snapshot associated with this text delta is not text or missing");
            }
          }
          if (content.index != __classPrivateFieldGet4(this, _AssistantStream_currentContentIndex, "f")) {
            if (__classPrivateFieldGet4(this, _AssistantStream_currentContent, "f")) {
              switch (__classPrivateFieldGet4(this, _AssistantStream_currentContent, "f").type) {
                case "text":
                  this._emit("textDone", __classPrivateFieldGet4(this, _AssistantStream_currentContent, "f").text, __classPrivateFieldGet4(this, _AssistantStream_messageSnapshot, "f"));
                  break;
                case "image_file":
                  this._emit("imageFileDone", __classPrivateFieldGet4(this, _AssistantStream_currentContent, "f").image_file, __classPrivateFieldGet4(this, _AssistantStream_messageSnapshot, "f"));
                  break;
              }
            }
            __classPrivateFieldSet4(this, _AssistantStream_currentContentIndex, content.index, "f");
          }
          __classPrivateFieldSet4(this, _AssistantStream_currentContent, accumulatedMessage.content[content.index], "f");
        }
      }
      break;
    case "thread.message.completed":
    case "thread.message.incomplete":
      if (__classPrivateFieldGet4(this, _AssistantStream_currentContentIndex, "f") !== void 0) {
        const currentContent = event.data.content[__classPrivateFieldGet4(this, _AssistantStream_currentContentIndex, "f")];
        if (currentContent) {
          switch (currentContent.type) {
            case "image_file":
              this._emit("imageFileDone", currentContent.image_file, __classPrivateFieldGet4(this, _AssistantStream_messageSnapshot, "f"));
              break;
            case "text":
              this._emit("textDone", currentContent.text, __classPrivateFieldGet4(this, _AssistantStream_messageSnapshot, "f"));
              break;
          }
        }
      }
      if (__classPrivateFieldGet4(this, _AssistantStream_messageSnapshot, "f")) {
        this._emit("messageDone", event.data);
      }
      __classPrivateFieldSet4(this, _AssistantStream_messageSnapshot, void 0, "f");
  }
}, _AssistantStream_handleRunStep = function _AssistantStream_handleRunStep2(event) {
  const accumulatedRunStep = __classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_accumulateRunStep).call(this, event);
  __classPrivateFieldSet4(this, _AssistantStream_currentRunStepSnapshot, accumulatedRunStep, "f");
  switch (event.event) {
    case "thread.run.step.created":
      this._emit("runStepCreated", event.data);
      break;
    case "thread.run.step.delta":
      const delta = event.data.delta;
      if (delta.step_details && delta.step_details.type == "tool_calls" && delta.step_details.tool_calls && accumulatedRunStep.step_details.type == "tool_calls") {
        for (const toolCall of delta.step_details.tool_calls) {
          if (toolCall.index == __classPrivateFieldGet4(this, _AssistantStream_currentToolCallIndex, "f")) {
            this._emit("toolCallDelta", toolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index]);
          } else {
            if (__classPrivateFieldGet4(this, _AssistantStream_currentToolCall, "f")) {
              this._emit("toolCallDone", __classPrivateFieldGet4(this, _AssistantStream_currentToolCall, "f"));
            }
            __classPrivateFieldSet4(this, _AssistantStream_currentToolCallIndex, toolCall.index, "f");
            __classPrivateFieldSet4(this, _AssistantStream_currentToolCall, accumulatedRunStep.step_details.tool_calls[toolCall.index], "f");
            if (__classPrivateFieldGet4(this, _AssistantStream_currentToolCall, "f"))
              this._emit("toolCallCreated", __classPrivateFieldGet4(this, _AssistantStream_currentToolCall, "f"));
          }
        }
      }
      this._emit("runStepDelta", event.data.delta, accumulatedRunStep);
      break;
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
      __classPrivateFieldSet4(this, _AssistantStream_currentRunStepSnapshot, void 0, "f");
      const details = event.data.step_details;
      if (details.type == "tool_calls") {
        if (__classPrivateFieldGet4(this, _AssistantStream_currentToolCall, "f")) {
          this._emit("toolCallDone", __classPrivateFieldGet4(this, _AssistantStream_currentToolCall, "f"));
          __classPrivateFieldSet4(this, _AssistantStream_currentToolCall, void 0, "f");
        }
      }
      this._emit("runStepDone", event.data, accumulatedRunStep);
      break;
    case "thread.run.step.in_progress":
      break;
  }
}, _AssistantStream_handleEvent = function _AssistantStream_handleEvent2(event) {
  __classPrivateFieldGet4(this, _AssistantStream_events, "f").push(event);
  this._emit("event", event);
}, _AssistantStream_accumulateRunStep = function _AssistantStream_accumulateRunStep2(event) {
  switch (event.event) {
    case "thread.run.step.created":
      __classPrivateFieldGet4(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
      return event.data;
    case "thread.run.step.delta":
      let snapshot = __classPrivateFieldGet4(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
      if (!snapshot) {
        throw Error("Received a RunStepDelta before creation of a snapshot");
      }
      let data = event.data;
      if (data.delta) {
        const accumulated = AssistantStream.accumulateDelta(snapshot, data.delta);
        __classPrivateFieldGet4(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = accumulated;
      }
      return __classPrivateFieldGet4(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
    case "thread.run.step.completed":
    case "thread.run.step.failed":
    case "thread.run.step.cancelled":
    case "thread.run.step.expired":
    case "thread.run.step.in_progress":
      __classPrivateFieldGet4(this, _AssistantStream_runStepSnapshots, "f")[event.data.id] = event.data;
      break;
  }
  if (__classPrivateFieldGet4(this, _AssistantStream_runStepSnapshots, "f")[event.data.id])
    return __classPrivateFieldGet4(this, _AssistantStream_runStepSnapshots, "f")[event.data.id];
  throw new Error("No snapshot available");
}, _AssistantStream_accumulateMessage = function _AssistantStream_accumulateMessage2(event, snapshot) {
  let newContent = [];
  switch (event.event) {
    case "thread.message.created":
      return [event.data, newContent];
    case "thread.message.delta":
      if (!snapshot) {
        throw Error("Received a delta with no existing snapshot (there should be one from message creation)");
      }
      let data = event.data;
      if (data.delta.content) {
        for (const contentElement of data.delta.content) {
          if (contentElement.index in snapshot.content) {
            let currentContent = snapshot.content[contentElement.index];
            snapshot.content[contentElement.index] = __classPrivateFieldGet4(this, _AssistantStream_instances, "m", _AssistantStream_accumulateContent).call(this, contentElement, currentContent);
          } else {
            snapshot.content[contentElement.index] = contentElement;
            newContent.push(contentElement);
          }
        }
      }
      return [snapshot, newContent];
    case "thread.message.in_progress":
    case "thread.message.completed":
    case "thread.message.incomplete":
      if (snapshot) {
        return [snapshot, newContent];
      } else {
        throw Error("Received thread message event with no existing snapshot");
      }
  }
  throw Error("Tried to accumulate a non-message event");
}, _AssistantStream_accumulateContent = function _AssistantStream_accumulateContent2(contentElement, currentContent) {
  return AssistantStream.accumulateDelta(currentContent, contentElement);
}, _AssistantStream_handleRun = function _AssistantStream_handleRun2(event) {
  __classPrivateFieldSet4(this, _AssistantStream_currentRunSnapshot, event.data, "f");
  switch (event.event) {
    case "thread.run.created":
      break;
    case "thread.run.queued":
      break;
    case "thread.run.in_progress":
      break;
    case "thread.run.requires_action":
    case "thread.run.cancelled":
    case "thread.run.failed":
    case "thread.run.completed":
    case "thread.run.expired":
      __classPrivateFieldSet4(this, _AssistantStream_finalRun, event.data, "f");
      if (__classPrivateFieldGet4(this, _AssistantStream_currentToolCall, "f")) {
        this._emit("toolCallDone", __classPrivateFieldGet4(this, _AssistantStream_currentToolCall, "f"));
        __classPrivateFieldSet4(this, _AssistantStream_currentToolCall, void 0, "f");
      }
      break;
    case "thread.run.cancelling":
      break;
  }
};
function assertNever(_x) {
}

// node_modules/@langchain/openai/node_modules/openai/resources/beta/assistants.mjs
var Assistants = class extends APIResource {
  /**
   * Create an assistant with a model and instructions.
   *
   * @example
   * ```ts
   * const assistant = await client.beta.assistants.create({
   *   model: 'gpt-4o',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/assistants", {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Retrieves an assistant.
   *
   * @example
   * ```ts
   * const assistant = await client.beta.assistants.retrieve(
   *   'assistant_id',
   * );
   * ```
   */
  retrieve(assistantId, options) {
    return this._client.get(`/assistants/${assistantId}`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Modifies an assistant.
   *
   * @example
   * ```ts
   * const assistant = await client.beta.assistants.update(
   *   'assistant_id',
   * );
   * ```
   */
  update(assistantId, body, options) {
    return this._client.post(`/assistants/${assistantId}`, {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  list(query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList("/assistants", AssistantsPage, {
      query,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Delete an assistant.
   *
   * @example
   * ```ts
   * const assistantDeleted = await client.beta.assistants.del(
   *   'assistant_id',
   * );
   * ```
   */
  del(assistantId, options) {
    return this._client.delete(`/assistants/${assistantId}`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
};
var AssistantsPage = class extends CursorPage {
};
Assistants.AssistantsPage = AssistantsPage;

// node_modules/@langchain/openai/node_modules/openai/lib/RunnableFunction.mjs
function isRunnableFunctionWithParse(fn) {
  return typeof fn.parse === "function";
}

// node_modules/@langchain/openai/node_modules/openai/lib/chatCompletionUtils.mjs
var isAssistantMessage = (message) => {
  return (message == null ? void 0 : message.role) === "assistant";
};
var isFunctionMessage = (message) => {
  return (message == null ? void 0 : message.role) === "function";
};
var isToolMessage = (message) => {
  return (message == null ? void 0 : message.role) === "tool";
};

// node_modules/@langchain/openai/node_modules/openai/lib/parser.mjs
function makeParseableResponseFormat(response_format, parser) {
  const obj = { ...response_format };
  Object.defineProperties(obj, {
    $brand: {
      value: "auto-parseable-response-format",
      enumerable: false
    },
    $parseRaw: {
      value: parser,
      enumerable: false
    }
  });
  return obj;
}
function isAutoParsableResponseFormat(response_format) {
  return (response_format == null ? void 0 : response_format["$brand"]) === "auto-parseable-response-format";
}
function isAutoParsableTool(tool) {
  return (tool == null ? void 0 : tool["$brand"]) === "auto-parseable-tool";
}
function maybeParseChatCompletion(completion, params) {
  if (!params || !hasAutoParseableInput(params)) {
    return {
      ...completion,
      choices: completion.choices.map((choice) => ({
        ...choice,
        message: {
          ...choice.message,
          parsed: null,
          ...choice.message.tool_calls ? {
            tool_calls: choice.message.tool_calls
          } : void 0
        }
      }))
    };
  }
  return parseChatCompletion(completion, params);
}
function parseChatCompletion(completion, params) {
  const choices = completion.choices.map((choice) => {
    var _a2;
    if (choice.finish_reason === "length") {
      throw new LengthFinishReasonError();
    }
    if (choice.finish_reason === "content_filter") {
      throw new ContentFilterFinishReasonError();
    }
    return {
      ...choice,
      message: {
        ...choice.message,
        ...choice.message.tool_calls ? {
          tool_calls: ((_a2 = choice.message.tool_calls) == null ? void 0 : _a2.map((toolCall) => parseToolCall(params, toolCall))) ?? void 0
        } : void 0,
        parsed: choice.message.content && !choice.message.refusal ? parseResponseFormat(params, choice.message.content) : null
      }
    };
  });
  return { ...completion, choices };
}
function parseResponseFormat(params, content) {
  var _a2, _b;
  if (((_a2 = params.response_format) == null ? void 0 : _a2.type) !== "json_schema") {
    return null;
  }
  if (((_b = params.response_format) == null ? void 0 : _b.type) === "json_schema") {
    if ("$parseRaw" in params.response_format) {
      const response_format = params.response_format;
      return response_format.$parseRaw(content);
    }
    return JSON.parse(content);
  }
  return null;
}
function parseToolCall(params, toolCall) {
  var _a2;
  const inputTool = (_a2 = params.tools) == null ? void 0 : _a2.find((inputTool2) => {
    var _a3;
    return ((_a3 = inputTool2.function) == null ? void 0 : _a3.name) === toolCall.function.name;
  });
  return {
    ...toolCall,
    function: {
      ...toolCall.function,
      parsed_arguments: isAutoParsableTool(inputTool) ? inputTool.$parseRaw(toolCall.function.arguments) : (inputTool == null ? void 0 : inputTool.function.strict) ? JSON.parse(toolCall.function.arguments) : null
    }
  };
}
function shouldParseToolCall(params, toolCall) {
  var _a2;
  if (!params) {
    return false;
  }
  const inputTool = (_a2 = params.tools) == null ? void 0 : _a2.find((inputTool2) => {
    var _a3;
    return ((_a3 = inputTool2.function) == null ? void 0 : _a3.name) === toolCall.function.name;
  });
  return isAutoParsableTool(inputTool) || (inputTool == null ? void 0 : inputTool.function.strict) || false;
}
function hasAutoParseableInput(params) {
  var _a2;
  if (isAutoParsableResponseFormat(params.response_format)) {
    return true;
  }
  return ((_a2 = params.tools) == null ? void 0 : _a2.some((t) => isAutoParsableTool(t) || t.type === "function" && t.function.strict === true)) ?? false;
}
function validateInputTools(tools) {
  for (const tool of tools ?? []) {
    if (tool.type !== "function") {
      throw new OpenAIError(`Currently only \`function\` tool types support auto-parsing; Received \`${tool.type}\``);
    }
    if (tool.function.strict !== true) {
      throw new OpenAIError(`The \`${tool.function.name}\` tool is not marked with \`strict: true\`. Only strict function tools can be auto-parsed`);
    }
  }
}

// node_modules/@langchain/openai/node_modules/openai/lib/AbstractChatCompletionRunner.mjs
var __classPrivateFieldGet5 = function(receiver, state, kind2, f) {
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind2 === "m" ? f : kind2 === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AbstractChatCompletionRunner_instances;
var _AbstractChatCompletionRunner_getFinalContent;
var _AbstractChatCompletionRunner_getFinalMessage;
var _AbstractChatCompletionRunner_getFinalFunctionCall;
var _AbstractChatCompletionRunner_getFinalFunctionCallResult;
var _AbstractChatCompletionRunner_calculateTotalUsage;
var _AbstractChatCompletionRunner_validateParams;
var _AbstractChatCompletionRunner_stringifyFunctionCallResult;
var DEFAULT_MAX_CHAT_COMPLETIONS = 10;
var AbstractChatCompletionRunner = class extends EventStream {
  constructor() {
    super(...arguments);
    _AbstractChatCompletionRunner_instances.add(this);
    this._chatCompletions = [];
    this.messages = [];
  }
  _addChatCompletion(chatCompletion) {
    var _a2;
    this._chatCompletions.push(chatCompletion);
    this._emit("chatCompletion", chatCompletion);
    const message = (_a2 = chatCompletion.choices[0]) == null ? void 0 : _a2.message;
    if (message)
      this._addMessage(message);
    return chatCompletion;
  }
  _addMessage(message, emit = true) {
    if (!("content" in message))
      message.content = null;
    this.messages.push(message);
    if (emit) {
      this._emit("message", message);
      if ((isFunctionMessage(message) || isToolMessage(message)) && message.content) {
        this._emit("functionCallResult", message.content);
      } else if (isAssistantMessage(message) && message.function_call) {
        this._emit("functionCall", message.function_call);
      } else if (isAssistantMessage(message) && message.tool_calls) {
        for (const tool_call of message.tool_calls) {
          if (tool_call.type === "function") {
            this._emit("functionCall", tool_call.function);
          }
        }
      }
    }
  }
  /**
   * @returns a promise that resolves with the final ChatCompletion, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletion.
   */
  async finalChatCompletion() {
    await this.done();
    const completion = this._chatCompletions[this._chatCompletions.length - 1];
    if (!completion)
      throw new OpenAIError("stream ended without producing a ChatCompletion");
    return completion;
  }
  /**
   * @returns a promise that resolves with the content of the final ChatCompletionMessage, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalContent() {
    await this.done();
    return __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
  }
  /**
   * @returns a promise that resolves with the the final assistant ChatCompletionMessage response,
   * or rejects if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalMessage() {
    await this.done();
    return __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
  }
  /**
   * @returns a promise that resolves with the content of the final FunctionCall, or rejects
   * if an error occurred or the stream ended prematurely without producing a ChatCompletionMessage.
   */
  async finalFunctionCall() {
    await this.done();
    return __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionCall).call(this);
  }
  async finalFunctionCallResult() {
    await this.done();
    return __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionCallResult).call(this);
  }
  async totalUsage() {
    await this.done();
    return __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this);
  }
  allChatCompletions() {
    return [...this._chatCompletions];
  }
  _emitFinal() {
    const completion = this._chatCompletions[this._chatCompletions.length - 1];
    if (completion)
      this._emit("finalChatCompletion", completion);
    const finalMessage = __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this);
    if (finalMessage)
      this._emit("finalMessage", finalMessage);
    const finalContent = __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalContent).call(this);
    if (finalContent)
      this._emit("finalContent", finalContent);
    const finalFunctionCall = __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionCall).call(this);
    if (finalFunctionCall)
      this._emit("finalFunctionCall", finalFunctionCall);
    const finalFunctionCallResult = __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalFunctionCallResult).call(this);
    if (finalFunctionCallResult != null)
      this._emit("finalFunctionCallResult", finalFunctionCallResult);
    if (this._chatCompletions.some((c) => c.usage)) {
      this._emit("totalUsage", __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_calculateTotalUsage).call(this));
    }
  }
  async _createChatCompletion(client, params, options) {
    const signal = options == null ? void 0 : options.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_validateParams).call(this, params);
    const chatCompletion = await client.chat.completions.create({ ...params, stream: false }, { ...options, signal: this.controller.signal });
    this._connected();
    return this._addChatCompletion(parseChatCompletion(chatCompletion, params));
  }
  async _runChatCompletion(client, params, options) {
    for (const message of params.messages) {
      this._addMessage(message, false);
    }
    return await this._createChatCompletion(client, params, options);
  }
  async _runFunctions(client, params, options) {
    var _a2;
    const role = "function";
    const { function_call = "auto", stream, ...restParams } = params;
    const singleFunctionToCall = typeof function_call !== "string" && (function_call == null ? void 0 : function_call.name);
    const { maxChatCompletions = DEFAULT_MAX_CHAT_COMPLETIONS } = options || {};
    const functionsByName = {};
    for (const f of params.functions) {
      functionsByName[f.name || f.function.name] = f;
    }
    const functions = params.functions.map((f) => ({
      name: f.name || f.function.name,
      parameters: f.parameters,
      description: f.description
    }));
    for (const message of params.messages) {
      this._addMessage(message, false);
    }
    for (let i = 0; i < maxChatCompletions; ++i) {
      const chatCompletion = await this._createChatCompletion(client, {
        ...restParams,
        function_call,
        functions,
        messages: [...this.messages]
      }, options);
      const message = (_a2 = chatCompletion.choices[0]) == null ? void 0 : _a2.message;
      if (!message) {
        throw new OpenAIError(`missing message in ChatCompletion response`);
      }
      if (!message.function_call)
        return;
      const { name, arguments: args } = message.function_call;
      const fn = functionsByName[name];
      if (!fn) {
        const content2 = `Invalid function_call: ${JSON.stringify(name)}. Available options are: ${functions.map((f) => JSON.stringify(f.name)).join(", ")}. Please try again`;
        this._addMessage({ role, name, content: content2 });
        continue;
      } else if (singleFunctionToCall && singleFunctionToCall !== name) {
        const content2 = `Invalid function_call: ${JSON.stringify(name)}. ${JSON.stringify(singleFunctionToCall)} requested. Please try again`;
        this._addMessage({ role, name, content: content2 });
        continue;
      }
      let parsed;
      try {
        parsed = isRunnableFunctionWithParse(fn) ? await fn.parse(args) : args;
      } catch (error) {
        this._addMessage({
          role,
          name,
          content: error instanceof Error ? error.message : String(error)
        });
        continue;
      }
      const rawContent = await fn.function(parsed, this);
      const content = __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_stringifyFunctionCallResult).call(this, rawContent);
      this._addMessage({ role, name, content });
      if (singleFunctionToCall)
        return;
    }
  }
  async _runTools(client, params, options) {
    var _a2, _b, _c;
    const role = "tool";
    const { tool_choice = "auto", stream, ...restParams } = params;
    const singleFunctionToCall = typeof tool_choice !== "string" && ((_a2 = tool_choice == null ? void 0 : tool_choice.function) == null ? void 0 : _a2.name);
    const { maxChatCompletions = DEFAULT_MAX_CHAT_COMPLETIONS } = options || {};
    const inputTools = params.tools.map((tool) => {
      if (isAutoParsableTool(tool)) {
        if (!tool.$callback) {
          throw new OpenAIError("Tool given to `.runTools()` that does not have an associated function");
        }
        return {
          type: "function",
          function: {
            function: tool.$callback,
            name: tool.function.name,
            description: tool.function.description || "",
            parameters: tool.function.parameters,
            parse: tool.$parseRaw,
            strict: true
          }
        };
      }
      return tool;
    });
    const functionsByName = {};
    for (const f of inputTools) {
      if (f.type === "function") {
        functionsByName[f.function.name || f.function.function.name] = f.function;
      }
    }
    const tools = "tools" in params ? inputTools.map((t) => t.type === "function" ? {
      type: "function",
      function: {
        name: t.function.name || t.function.function.name,
        parameters: t.function.parameters,
        description: t.function.description,
        strict: t.function.strict
      }
    } : t) : void 0;
    for (const message of params.messages) {
      this._addMessage(message, false);
    }
    for (let i = 0; i < maxChatCompletions; ++i) {
      const chatCompletion = await this._createChatCompletion(client, {
        ...restParams,
        tool_choice,
        tools,
        messages: [...this.messages]
      }, options);
      const message = (_b = chatCompletion.choices[0]) == null ? void 0 : _b.message;
      if (!message) {
        throw new OpenAIError(`missing message in ChatCompletion response`);
      }
      if (!((_c = message.tool_calls) == null ? void 0 : _c.length)) {
        return;
      }
      for (const tool_call of message.tool_calls) {
        if (tool_call.type !== "function")
          continue;
        const tool_call_id = tool_call.id;
        const { name, arguments: args } = tool_call.function;
        const fn = functionsByName[name];
        if (!fn) {
          const content2 = `Invalid tool_call: ${JSON.stringify(name)}. Available options are: ${Object.keys(functionsByName).map((name2) => JSON.stringify(name2)).join(", ")}. Please try again`;
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        } else if (singleFunctionToCall && singleFunctionToCall !== name) {
          const content2 = `Invalid tool_call: ${JSON.stringify(name)}. ${JSON.stringify(singleFunctionToCall)} requested. Please try again`;
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        }
        let parsed;
        try {
          parsed = isRunnableFunctionWithParse(fn) ? await fn.parse(args) : args;
        } catch (error) {
          const content2 = error instanceof Error ? error.message : String(error);
          this._addMessage({ role, tool_call_id, content: content2 });
          continue;
        }
        const rawContent = await fn.function(parsed, this);
        const content = __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_stringifyFunctionCallResult).call(this, rawContent);
        this._addMessage({ role, tool_call_id, content });
        if (singleFunctionToCall) {
          return;
        }
      }
    }
    return;
  }
};
_AbstractChatCompletionRunner_instances = /* @__PURE__ */ new WeakSet(), _AbstractChatCompletionRunner_getFinalContent = function _AbstractChatCompletionRunner_getFinalContent2() {
  return __classPrivateFieldGet5(this, _AbstractChatCompletionRunner_instances, "m", _AbstractChatCompletionRunner_getFinalMessage).call(this).content ?? null;
}, _AbstractChatCompletionRunner_getFinalMessage = function _AbstractChatCompletionRunner_getFinalMessage2() {
  let i = this.messages.length;
  while (i-- > 0) {
    const message = this.messages[i];
    if (isAssistantMessage(message)) {
      const { function_call, ...rest } = message;
      const ret = {
        ...rest,
        content: message.content ?? null,
        refusal: message.refusal ?? null
      };
      if (function_call) {
        ret.function_call = function_call;
      }
      return ret;
    }
  }
  throw new OpenAIError("stream ended without producing a ChatCompletionMessage with role=assistant");
}, _AbstractChatCompletionRunner_getFinalFunctionCall = function _AbstractChatCompletionRunner_getFinalFunctionCall2() {
  var _a2, _b;
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (isAssistantMessage(message) && (message == null ? void 0 : message.function_call)) {
      return message.function_call;
    }
    if (isAssistantMessage(message) && ((_a2 = message == null ? void 0 : message.tool_calls) == null ? void 0 : _a2.length)) {
      return (_b = message.tool_calls.at(-1)) == null ? void 0 : _b.function;
    }
  }
  return;
}, _AbstractChatCompletionRunner_getFinalFunctionCallResult = function _AbstractChatCompletionRunner_getFinalFunctionCallResult2() {
  for (let i = this.messages.length - 1; i >= 0; i--) {
    const message = this.messages[i];
    if (isFunctionMessage(message) && message.content != null) {
      return message.content;
    }
    if (isToolMessage(message) && message.content != null && typeof message.content === "string" && this.messages.some((x) => {
      var _a2;
      return x.role === "assistant" && ((_a2 = x.tool_calls) == null ? void 0 : _a2.some((y) => y.type === "function" && y.id === message.tool_call_id));
    })) {
      return message.content;
    }
  }
  return;
}, _AbstractChatCompletionRunner_calculateTotalUsage = function _AbstractChatCompletionRunner_calculateTotalUsage2() {
  const total = {
    completion_tokens: 0,
    prompt_tokens: 0,
    total_tokens: 0
  };
  for (const { usage } of this._chatCompletions) {
    if (usage) {
      total.completion_tokens += usage.completion_tokens;
      total.prompt_tokens += usage.prompt_tokens;
      total.total_tokens += usage.total_tokens;
    }
  }
  return total;
}, _AbstractChatCompletionRunner_validateParams = function _AbstractChatCompletionRunner_validateParams2(params) {
  if (params.n != null && params.n > 1) {
    throw new OpenAIError("ChatCompletion convenience helpers only support n=1 at this time. To use n>1, please use chat.completions.create() directly.");
  }
}, _AbstractChatCompletionRunner_stringifyFunctionCallResult = function _AbstractChatCompletionRunner_stringifyFunctionCallResult2(rawContent) {
  return typeof rawContent === "string" ? rawContent : rawContent === void 0 ? "undefined" : JSON.stringify(rawContent);
};

// node_modules/@langchain/openai/node_modules/openai/lib/ChatCompletionRunner.mjs
var ChatCompletionRunner = class _ChatCompletionRunner extends AbstractChatCompletionRunner {
  /** @deprecated - please use `runTools` instead. */
  static runFunctions(client, params, options) {
    const runner = new _ChatCompletionRunner();
    const opts = {
      ...options,
      headers: { ...options == null ? void 0 : options.headers, "X-Stainless-Helper-Method": "runFunctions" }
    };
    runner._run(() => runner._runFunctions(client, params, opts));
    return runner;
  }
  static runTools(client, params, options) {
    const runner = new _ChatCompletionRunner();
    const opts = {
      ...options,
      headers: { ...options == null ? void 0 : options.headers, "X-Stainless-Helper-Method": "runTools" }
    };
    runner._run(() => runner._runTools(client, params, opts));
    return runner;
  }
  _addMessage(message, emit = true) {
    super._addMessage(message, emit);
    if (isAssistantMessage(message) && message.content) {
      this._emit("content", message.content);
    }
  }
};

// node_modules/@langchain/openai/node_modules/openai/_vendor/partial-json-parser/parser.mjs
var STR = 1;
var NUM = 2;
var ARR = 4;
var OBJ = 8;
var NULL = 16;
var BOOL = 32;
var NAN = 64;
var INFINITY = 128;
var MINUS_INFINITY = 256;
var INF = INFINITY | MINUS_INFINITY;
var SPECIAL = NULL | BOOL | INF | NAN;
var ATOM = STR | NUM | SPECIAL;
var COLLECTION = ARR | OBJ;
var ALL = ATOM | COLLECTION;
var Allow = {
  STR,
  NUM,
  ARR,
  OBJ,
  NULL,
  BOOL,
  NAN,
  INFINITY,
  MINUS_INFINITY,
  INF,
  SPECIAL,
  ATOM,
  COLLECTION,
  ALL
};
var PartialJSON = class extends Error {
};
var MalformedJSON = class extends Error {
};
function parseJSON(jsonString, allowPartial = Allow.ALL) {
  if (typeof jsonString !== "string") {
    throw new TypeError(`expecting str, got ${typeof jsonString}`);
  }
  if (!jsonString.trim()) {
    throw new Error(`${jsonString} is empty`);
  }
  return _parseJSON(jsonString.trim(), allowPartial);
}
var _parseJSON = (jsonString, allow) => {
  const length = jsonString.length;
  let index = 0;
  const markPartialJSON = (msg) => {
    throw new PartialJSON(`${msg} at position ${index}`);
  };
  const throwMalformedError = (msg) => {
    throw new MalformedJSON(`${msg} at position ${index}`);
  };
  const parseAny = () => {
    skipBlank();
    if (index >= length)
      markPartialJSON("Unexpected end of input");
    if (jsonString[index] === '"')
      return parseStr();
    if (jsonString[index] === "{")
      return parseObj();
    if (jsonString[index] === "[")
      return parseArr();
    if (jsonString.substring(index, index + 4) === "null" || Allow.NULL & allow && length - index < 4 && "null".startsWith(jsonString.substring(index))) {
      index += 4;
      return null;
    }
    if (jsonString.substring(index, index + 4) === "true" || Allow.BOOL & allow && length - index < 4 && "true".startsWith(jsonString.substring(index))) {
      index += 4;
      return true;
    }
    if (jsonString.substring(index, index + 5) === "false" || Allow.BOOL & allow && length - index < 5 && "false".startsWith(jsonString.substring(index))) {
      index += 5;
      return false;
    }
    if (jsonString.substring(index, index + 8) === "Infinity" || Allow.INFINITY & allow && length - index < 8 && "Infinity".startsWith(jsonString.substring(index))) {
      index += 8;
      return Infinity;
    }
    if (jsonString.substring(index, index + 9) === "-Infinity" || Allow.MINUS_INFINITY & allow && 1 < length - index && length - index < 9 && "-Infinity".startsWith(jsonString.substring(index))) {
      index += 9;
      return -Infinity;
    }
    if (jsonString.substring(index, index + 3) === "NaN" || Allow.NAN & allow && length - index < 3 && "NaN".startsWith(jsonString.substring(index))) {
      index += 3;
      return NaN;
    }
    return parseNum();
  };
  const parseStr = () => {
    const start = index;
    let escape2 = false;
    index++;
    while (index < length && (jsonString[index] !== '"' || escape2 && jsonString[index - 1] === "\\")) {
      escape2 = jsonString[index] === "\\" ? !escape2 : false;
      index++;
    }
    if (jsonString.charAt(index) == '"') {
      try {
        return JSON.parse(jsonString.substring(start, ++index - Number(escape2)));
      } catch (e) {
        throwMalformedError(String(e));
      }
    } else if (Allow.STR & allow) {
      try {
        return JSON.parse(jsonString.substring(start, index - Number(escape2)) + '"');
      } catch (e) {
        return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("\\")) + '"');
      }
    }
    markPartialJSON("Unterminated string literal");
  };
  const parseObj = () => {
    index++;
    skipBlank();
    const obj = {};
    try {
      while (jsonString[index] !== "}") {
        skipBlank();
        if (index >= length && Allow.OBJ & allow)
          return obj;
        const key = parseStr();
        skipBlank();
        index++;
        try {
          const value = parseAny();
          Object.defineProperty(obj, key, { value, writable: true, enumerable: true, configurable: true });
        } catch (e) {
          if (Allow.OBJ & allow)
            return obj;
          else
            throw e;
        }
        skipBlank();
        if (jsonString[index] === ",")
          index++;
      }
    } catch (e) {
      if (Allow.OBJ & allow)
        return obj;
      else
        markPartialJSON("Expected '}' at end of object");
    }
    index++;
    return obj;
  };
  const parseArr = () => {
    index++;
    const arr = [];
    try {
      while (jsonString[index] !== "]") {
        arr.push(parseAny());
        skipBlank();
        if (jsonString[index] === ",") {
          index++;
        }
      }
    } catch (e) {
      if (Allow.ARR & allow) {
        return arr;
      }
      markPartialJSON("Expected ']' at end of array");
    }
    index++;
    return arr;
  };
  const parseNum = () => {
    if (index === 0) {
      if (jsonString === "-" && Allow.NUM & allow)
        markPartialJSON("Not sure what '-' is");
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        if (Allow.NUM & allow) {
          try {
            if ("." === jsonString[jsonString.length - 1])
              return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf(".")));
            return JSON.parse(jsonString.substring(0, jsonString.lastIndexOf("e")));
          } catch (e2) {
          }
        }
        throwMalformedError(String(e));
      }
    }
    const start = index;
    if (jsonString[index] === "-")
      index++;
    while (jsonString[index] && !",]}".includes(jsonString[index]))
      index++;
    if (index == length && !(Allow.NUM & allow))
      markPartialJSON("Unterminated number literal");
    try {
      return JSON.parse(jsonString.substring(start, index));
    } catch (e) {
      if (jsonString.substring(start, index) === "-" && Allow.NUM & allow)
        markPartialJSON("Not sure what '-' is");
      try {
        return JSON.parse(jsonString.substring(start, jsonString.lastIndexOf("e")));
      } catch (e2) {
        throwMalformedError(String(e2));
      }
    }
  };
  const skipBlank = () => {
    while (index < length && " \n\r	".includes(jsonString[index])) {
      index++;
    }
  };
  return parseAny();
};
var partialParse = (input) => parseJSON(input, Allow.ALL ^ Allow.NUM);

// node_modules/@langchain/openai/node_modules/openai/lib/ChatCompletionStream.mjs
var __classPrivateFieldSet5 = function(receiver, state, value, kind2, f) {
  if (kind2 === "m") throw new TypeError("Private method is not writable");
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind2 === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet6 = function(receiver, state, kind2, f) {
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind2 === "m" ? f : kind2 === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ChatCompletionStream_instances;
var _ChatCompletionStream_params;
var _ChatCompletionStream_choiceEventStates;
var _ChatCompletionStream_currentChatCompletionSnapshot;
var _ChatCompletionStream_beginRequest;
var _ChatCompletionStream_getChoiceEventState;
var _ChatCompletionStream_addChunk;
var _ChatCompletionStream_emitToolCallDoneEvent;
var _ChatCompletionStream_emitContentDoneEvents;
var _ChatCompletionStream_endRequest;
var _ChatCompletionStream_getAutoParseableResponseFormat;
var _ChatCompletionStream_accumulateChatCompletion;
var ChatCompletionStream = class _ChatCompletionStream extends AbstractChatCompletionRunner {
  constructor(params) {
    super();
    _ChatCompletionStream_instances.add(this);
    _ChatCompletionStream_params.set(this, void 0);
    _ChatCompletionStream_choiceEventStates.set(this, void 0);
    _ChatCompletionStream_currentChatCompletionSnapshot.set(this, void 0);
    __classPrivateFieldSet5(this, _ChatCompletionStream_params, params, "f");
    __classPrivateFieldSet5(this, _ChatCompletionStream_choiceEventStates, [], "f");
  }
  get currentChatCompletionSnapshot() {
    return __classPrivateFieldGet6(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
  }
  /**
   * Intended for use on the frontend, consuming a stream produced with
   * `.toReadableStream()` on the backend.
   *
   * Note that messages sent to the model do not appear in `.on('message')`
   * in this context.
   */
  static fromReadableStream(stream) {
    const runner = new _ChatCompletionStream(null);
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  static createChatCompletion(client, params, options) {
    const runner = new _ChatCompletionStream(params);
    runner._run(() => runner._runChatCompletion(client, { ...params, stream: true }, { ...options, headers: { ...options == null ? void 0 : options.headers, "X-Stainless-Helper-Method": "stream" } }));
    return runner;
  }
  async _createChatCompletion(client, params, options) {
    var _a2;
    super._createChatCompletion;
    const signal = options == null ? void 0 : options.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
    const stream = await client.chat.completions.create({ ...params, stream: true }, { ...options, signal: this.controller.signal });
    this._connected();
    for await (const chunk of stream) {
      __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
    }
    if ((_a2 = stream.controller.signal) == null ? void 0 : _a2.aborted) {
      throw new APIUserAbortError();
    }
    return this._addChatCompletion(__classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
  }
  async _fromReadableStream(readableStream, options) {
    var _a2;
    const signal = options == null ? void 0 : options.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_beginRequest).call(this);
    this._connected();
    const stream = Stream.fromReadableStream(readableStream, this.controller);
    let chatId;
    for await (const chunk of stream) {
      if (chatId && chatId !== chunk.id) {
        this._addChatCompletion(__classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
      }
      __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_addChunk).call(this, chunk);
      chatId = chunk.id;
    }
    if ((_a2 = stream.controller.signal) == null ? void 0 : _a2.aborted) {
      throw new APIUserAbortError();
    }
    return this._addChatCompletion(__classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_endRequest).call(this));
  }
  [(_ChatCompletionStream_params = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_choiceEventStates = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_currentChatCompletionSnapshot = /* @__PURE__ */ new WeakMap(), _ChatCompletionStream_instances = /* @__PURE__ */ new WeakSet(), _ChatCompletionStream_beginRequest = function _ChatCompletionStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet5(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
  }, _ChatCompletionStream_getChoiceEventState = function _ChatCompletionStream_getChoiceEventState2(choice) {
    let state = __classPrivateFieldGet6(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index];
    if (state) {
      return state;
    }
    state = {
      content_done: false,
      refusal_done: false,
      logprobs_content_done: false,
      logprobs_refusal_done: false,
      done_tool_calls: /* @__PURE__ */ new Set(),
      current_tool_call_index: null
    };
    __classPrivateFieldGet6(this, _ChatCompletionStream_choiceEventStates, "f")[choice.index] = state;
    return state;
  }, _ChatCompletionStream_addChunk = function _ChatCompletionStream_addChunk2(chunk) {
    var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
    if (this.ended)
      return;
    const completion = __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_accumulateChatCompletion).call(this, chunk);
    this._emit("chunk", chunk, completion);
    for (const choice of chunk.choices) {
      const choiceSnapshot = completion.choices[choice.index];
      if (choice.delta.content != null && ((_a2 = choiceSnapshot.message) == null ? void 0 : _a2.role) === "assistant" && ((_b = choiceSnapshot.message) == null ? void 0 : _b.content)) {
        this._emit("content", choice.delta.content, choiceSnapshot.message.content);
        this._emit("content.delta", {
          delta: choice.delta.content,
          snapshot: choiceSnapshot.message.content,
          parsed: choiceSnapshot.message.parsed
        });
      }
      if (choice.delta.refusal != null && ((_c = choiceSnapshot.message) == null ? void 0 : _c.role) === "assistant" && ((_d = choiceSnapshot.message) == null ? void 0 : _d.refusal)) {
        this._emit("refusal.delta", {
          delta: choice.delta.refusal,
          snapshot: choiceSnapshot.message.refusal
        });
      }
      if (((_e = choice.logprobs) == null ? void 0 : _e.content) != null && ((_f = choiceSnapshot.message) == null ? void 0 : _f.role) === "assistant") {
        this._emit("logprobs.content.delta", {
          content: (_g = choice.logprobs) == null ? void 0 : _g.content,
          snapshot: ((_h = choiceSnapshot.logprobs) == null ? void 0 : _h.content) ?? []
        });
      }
      if (((_i = choice.logprobs) == null ? void 0 : _i.refusal) != null && ((_j = choiceSnapshot.message) == null ? void 0 : _j.role) === "assistant") {
        this._emit("logprobs.refusal.delta", {
          refusal: (_k = choice.logprobs) == null ? void 0 : _k.refusal,
          snapshot: ((_l = choiceSnapshot.logprobs) == null ? void 0 : _l.refusal) ?? []
        });
      }
      const state = __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
      if (choiceSnapshot.finish_reason) {
        __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
        if (state.current_tool_call_index != null) {
          __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
        }
      }
      for (const toolCall of choice.delta.tool_calls ?? []) {
        if (state.current_tool_call_index !== toolCall.index) {
          __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitContentDoneEvents).call(this, choiceSnapshot);
          if (state.current_tool_call_index != null) {
            __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_emitToolCallDoneEvent).call(this, choiceSnapshot, state.current_tool_call_index);
          }
        }
        state.current_tool_call_index = toolCall.index;
      }
      for (const toolCallDelta of choice.delta.tool_calls ?? []) {
        const toolCallSnapshot = (_m = choiceSnapshot.message.tool_calls) == null ? void 0 : _m[toolCallDelta.index];
        if (!(toolCallSnapshot == null ? void 0 : toolCallSnapshot.type)) {
          continue;
        }
        if ((toolCallSnapshot == null ? void 0 : toolCallSnapshot.type) === "function") {
          this._emit("tool_calls.function.arguments.delta", {
            name: (_n = toolCallSnapshot.function) == null ? void 0 : _n.name,
            index: toolCallDelta.index,
            arguments: toolCallSnapshot.function.arguments,
            parsed_arguments: toolCallSnapshot.function.parsed_arguments,
            arguments_delta: ((_o = toolCallDelta.function) == null ? void 0 : _o.arguments) ?? ""
          });
        } else {
          assertNever2(toolCallSnapshot == null ? void 0 : toolCallSnapshot.type);
        }
      }
    }
  }, _ChatCompletionStream_emitToolCallDoneEvent = function _ChatCompletionStream_emitToolCallDoneEvent2(choiceSnapshot, toolCallIndex) {
    var _a2, _b, _c;
    const state = __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
    if (state.done_tool_calls.has(toolCallIndex)) {
      return;
    }
    const toolCallSnapshot = (_a2 = choiceSnapshot.message.tool_calls) == null ? void 0 : _a2[toolCallIndex];
    if (!toolCallSnapshot) {
      throw new Error("no tool call snapshot");
    }
    if (!toolCallSnapshot.type) {
      throw new Error("tool call snapshot missing `type`");
    }
    if (toolCallSnapshot.type === "function") {
      const inputTool = (_c = (_b = __classPrivateFieldGet6(this, _ChatCompletionStream_params, "f")) == null ? void 0 : _b.tools) == null ? void 0 : _c.find((tool) => tool.type === "function" && tool.function.name === toolCallSnapshot.function.name);
      this._emit("tool_calls.function.arguments.done", {
        name: toolCallSnapshot.function.name,
        index: toolCallIndex,
        arguments: toolCallSnapshot.function.arguments,
        parsed_arguments: isAutoParsableTool(inputTool) ? inputTool.$parseRaw(toolCallSnapshot.function.arguments) : (inputTool == null ? void 0 : inputTool.function.strict) ? JSON.parse(toolCallSnapshot.function.arguments) : null
      });
    } else {
      assertNever2(toolCallSnapshot.type);
    }
  }, _ChatCompletionStream_emitContentDoneEvents = function _ChatCompletionStream_emitContentDoneEvents2(choiceSnapshot) {
    var _a2, _b;
    const state = __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getChoiceEventState).call(this, choiceSnapshot);
    if (choiceSnapshot.message.content && !state.content_done) {
      state.content_done = true;
      const responseFormat = __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getAutoParseableResponseFormat).call(this);
      this._emit("content.done", {
        content: choiceSnapshot.message.content,
        parsed: responseFormat ? responseFormat.$parseRaw(choiceSnapshot.message.content) : null
      });
    }
    if (choiceSnapshot.message.refusal && !state.refusal_done) {
      state.refusal_done = true;
      this._emit("refusal.done", { refusal: choiceSnapshot.message.refusal });
    }
    if (((_a2 = choiceSnapshot.logprobs) == null ? void 0 : _a2.content) && !state.logprobs_content_done) {
      state.logprobs_content_done = true;
      this._emit("logprobs.content.done", { content: choiceSnapshot.logprobs.content });
    }
    if (((_b = choiceSnapshot.logprobs) == null ? void 0 : _b.refusal) && !state.logprobs_refusal_done) {
      state.logprobs_refusal_done = true;
      this._emit("logprobs.refusal.done", { refusal: choiceSnapshot.logprobs.refusal });
    }
  }, _ChatCompletionStream_endRequest = function _ChatCompletionStream_endRequest2() {
    if (this.ended) {
      throw new OpenAIError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet6(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
    if (!snapshot) {
      throw new OpenAIError(`request ended without sending any chunks`);
    }
    __classPrivateFieldSet5(this, _ChatCompletionStream_currentChatCompletionSnapshot, void 0, "f");
    __classPrivateFieldSet5(this, _ChatCompletionStream_choiceEventStates, [], "f");
    return finalizeChatCompletion(snapshot, __classPrivateFieldGet6(this, _ChatCompletionStream_params, "f"));
  }, _ChatCompletionStream_getAutoParseableResponseFormat = function _ChatCompletionStream_getAutoParseableResponseFormat2() {
    var _a2;
    const responseFormat = (_a2 = __classPrivateFieldGet6(this, _ChatCompletionStream_params, "f")) == null ? void 0 : _a2.response_format;
    if (isAutoParsableResponseFormat(responseFormat)) {
      return responseFormat;
    }
    return null;
  }, _ChatCompletionStream_accumulateChatCompletion = function _ChatCompletionStream_accumulateChatCompletion2(chunk) {
    var _a2, _b, _c, _d;
    let snapshot = __classPrivateFieldGet6(this, _ChatCompletionStream_currentChatCompletionSnapshot, "f");
    const { choices, ...rest } = chunk;
    if (!snapshot) {
      snapshot = __classPrivateFieldSet5(this, _ChatCompletionStream_currentChatCompletionSnapshot, {
        ...rest,
        choices: []
      }, "f");
    } else {
      Object.assign(snapshot, rest);
    }
    for (const { delta, finish_reason, index, logprobs = null, ...other } of chunk.choices) {
      let choice = snapshot.choices[index];
      if (!choice) {
        choice = snapshot.choices[index] = { finish_reason, index, message: {}, logprobs, ...other };
      }
      if (logprobs) {
        if (!choice.logprobs) {
          choice.logprobs = Object.assign({}, logprobs);
        } else {
          const { content: content2, refusal: refusal2, ...rest3 } = logprobs;
          assertIsEmpty(rest3);
          Object.assign(choice.logprobs, rest3);
          if (content2) {
            (_a2 = choice.logprobs).content ?? (_a2.content = []);
            choice.logprobs.content.push(...content2);
          }
          if (refusal2) {
            (_b = choice.logprobs).refusal ?? (_b.refusal = []);
            choice.logprobs.refusal.push(...refusal2);
          }
        }
      }
      if (finish_reason) {
        choice.finish_reason = finish_reason;
        if (__classPrivateFieldGet6(this, _ChatCompletionStream_params, "f") && hasAutoParseableInput(__classPrivateFieldGet6(this, _ChatCompletionStream_params, "f"))) {
          if (finish_reason === "length") {
            throw new LengthFinishReasonError();
          }
          if (finish_reason === "content_filter") {
            throw new ContentFilterFinishReasonError();
          }
        }
      }
      Object.assign(choice, other);
      if (!delta)
        continue;
      const { content, refusal, function_call, role, tool_calls, ...rest2 } = delta;
      assertIsEmpty(rest2);
      Object.assign(choice.message, rest2);
      if (refusal) {
        choice.message.refusal = (choice.message.refusal || "") + refusal;
      }
      if (role)
        choice.message.role = role;
      if (function_call) {
        if (!choice.message.function_call) {
          choice.message.function_call = function_call;
        } else {
          if (function_call.name)
            choice.message.function_call.name = function_call.name;
          if (function_call.arguments) {
            (_c = choice.message.function_call).arguments ?? (_c.arguments = "");
            choice.message.function_call.arguments += function_call.arguments;
          }
        }
      }
      if (content) {
        choice.message.content = (choice.message.content || "") + content;
        if (!choice.message.refusal && __classPrivateFieldGet6(this, _ChatCompletionStream_instances, "m", _ChatCompletionStream_getAutoParseableResponseFormat).call(this)) {
          choice.message.parsed = partialParse(choice.message.content);
        }
      }
      if (tool_calls) {
        if (!choice.message.tool_calls)
          choice.message.tool_calls = [];
        for (const { index: index2, id, type, function: fn, ...rest3 } of tool_calls) {
          const tool_call = (_d = choice.message.tool_calls)[index2] ?? (_d[index2] = {});
          Object.assign(tool_call, rest3);
          if (id)
            tool_call.id = id;
          if (type)
            tool_call.type = type;
          if (fn)
            tool_call.function ?? (tool_call.function = { name: fn.name ?? "", arguments: "" });
          if (fn == null ? void 0 : fn.name)
            tool_call.function.name = fn.name;
          if (fn == null ? void 0 : fn.arguments) {
            tool_call.function.arguments += fn.arguments;
            if (shouldParseToolCall(__classPrivateFieldGet6(this, _ChatCompletionStream_params, "f"), tool_call)) {
              tool_call.function.parsed_arguments = partialParse(tool_call.function.arguments);
            }
          }
        }
      }
    }
    return snapshot;
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("chunk", (chunk) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(chunk);
      } else {
        pushQueue.push(chunk);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((chunk2) => chunk2 ? { value: chunk2, done: false } : { value: void 0, done: true });
        }
        const chunk = pushQueue.shift();
        return { value: chunk, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  toReadableStream() {
    const stream = new Stream(this[Symbol.asyncIterator].bind(this), this.controller);
    return stream.toReadableStream();
  }
};
function finalizeChatCompletion(snapshot, params) {
  const { id, choices, created, model, system_fingerprint, ...rest } = snapshot;
  const completion = {
    ...rest,
    id,
    choices: choices.map(({ message, finish_reason, index, logprobs, ...choiceRest }) => {
      if (!finish_reason) {
        throw new OpenAIError(`missing finish_reason for choice ${index}`);
      }
      const { content = null, function_call, tool_calls, ...messageRest } = message;
      const role = message.role;
      if (!role) {
        throw new OpenAIError(`missing role for choice ${index}`);
      }
      if (function_call) {
        const { arguments: args, name } = function_call;
        if (args == null) {
          throw new OpenAIError(`missing function_call.arguments for choice ${index}`);
        }
        if (!name) {
          throw new OpenAIError(`missing function_call.name for choice ${index}`);
        }
        return {
          ...choiceRest,
          message: {
            content,
            function_call: { arguments: args, name },
            role,
            refusal: message.refusal ?? null
          },
          finish_reason,
          index,
          logprobs
        };
      }
      if (tool_calls) {
        return {
          ...choiceRest,
          index,
          finish_reason,
          logprobs,
          message: {
            ...messageRest,
            role,
            content,
            refusal: message.refusal ?? null,
            tool_calls: tool_calls.map((tool_call, i) => {
              const { function: fn, type, id: id2, ...toolRest } = tool_call;
              const { arguments: args, name, ...fnRest } = fn || {};
              if (id2 == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].id
${str(snapshot)}`);
              }
              if (type == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].type
${str(snapshot)}`);
              }
              if (name == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.name
${str(snapshot)}`);
              }
              if (args == null) {
                throw new OpenAIError(`missing choices[${index}].tool_calls[${i}].function.arguments
${str(snapshot)}`);
              }
              return { ...toolRest, id: id2, type, function: { ...fnRest, name, arguments: args } };
            })
          }
        };
      }
      return {
        ...choiceRest,
        message: { ...messageRest, content, role, refusal: message.refusal ?? null },
        finish_reason,
        index,
        logprobs
      };
    }),
    created,
    model,
    object: "chat.completion",
    ...system_fingerprint ? { system_fingerprint } : {}
  };
  return maybeParseChatCompletion(completion, params);
}
function str(x) {
  return JSON.stringify(x);
}
function assertIsEmpty(obj) {
  return;
}
function assertNever2(_x) {
}

// node_modules/@langchain/openai/node_modules/openai/lib/ChatCompletionStreamingRunner.mjs
var ChatCompletionStreamingRunner = class _ChatCompletionStreamingRunner extends ChatCompletionStream {
  static fromReadableStream(stream) {
    const runner = new _ChatCompletionStreamingRunner(null);
    runner._run(() => runner._fromReadableStream(stream));
    return runner;
  }
  /** @deprecated - please use `runTools` instead. */
  static runFunctions(client, params, options) {
    const runner = new _ChatCompletionStreamingRunner(null);
    const opts = {
      ...options,
      headers: { ...options == null ? void 0 : options.headers, "X-Stainless-Helper-Method": "runFunctions" }
    };
    runner._run(() => runner._runFunctions(client, params, opts));
    return runner;
  }
  static runTools(client, params, options) {
    const runner = new _ChatCompletionStreamingRunner(
      // @ts-expect-error TODO these types are incompatible
      params
    );
    const opts = {
      ...options,
      headers: { ...options == null ? void 0 : options.headers, "X-Stainless-Helper-Method": "runTools" }
    };
    runner._run(() => runner._runTools(client, params, opts));
    return runner;
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/beta/chat/completions.mjs
var Completions2 = class extends APIResource {
  parse(body, options) {
    validateInputTools(body.tools);
    return this._client.chat.completions.create(body, {
      ...options,
      headers: {
        ...options == null ? void 0 : options.headers,
        "X-Stainless-Helper-Method": "beta.chat.completions.parse"
      }
    })._thenUnwrap((completion) => parseChatCompletion(completion, body));
  }
  runFunctions(body, options) {
    if (body.stream) {
      return ChatCompletionStreamingRunner.runFunctions(this._client, body, options);
    }
    return ChatCompletionRunner.runFunctions(this._client, body, options);
  }
  runTools(body, options) {
    if (body.stream) {
      return ChatCompletionStreamingRunner.runTools(this._client, body, options);
    }
    return ChatCompletionRunner.runTools(this._client, body, options);
  }
  /**
   * Creates a chat completion stream
   */
  stream(body, options) {
    return ChatCompletionStream.createChatCompletion(this._client, body, options);
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/beta/chat/chat.mjs
var Chat2 = class extends APIResource {
  constructor() {
    super(...arguments);
    this.completions = new Completions2(this._client);
  }
};
(function(Chat3) {
  Chat3.Completions = Completions2;
})(Chat2 || (Chat2 = {}));

// node_modules/@langchain/openai/node_modules/openai/resources/beta/realtime/sessions.mjs
var Sessions = class extends APIResource {
  /**
   * Create an ephemeral API token for use in client-side applications with the
   * Realtime API. Can be configured with the same session parameters as the
   * `session.update` client event.
   *
   * It responds with a session object, plus a `client_secret` key which contains a
   * usable ephemeral API token that can be used to authenticate browser clients for
   * the Realtime API.
   *
   * @example
   * ```ts
   * const session =
   *   await client.beta.realtime.sessions.create();
   * ```
   */
  create(body, options) {
    return this._client.post("/realtime/sessions", {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/beta/realtime/transcription-sessions.mjs
var TranscriptionSessions = class extends APIResource {
  /**
   * Create an ephemeral API token for use in client-side applications with the
   * Realtime API specifically for realtime transcriptions. Can be configured with
   * the same session parameters as the `transcription_session.update` client event.
   *
   * It responds with a session object, plus a `client_secret` key which contains a
   * usable ephemeral API token that can be used to authenticate browser clients for
   * the Realtime API.
   *
   * @example
   * ```ts
   * const transcriptionSession =
   *   await client.beta.realtime.transcriptionSessions.create();
   * ```
   */
  create(body, options) {
    return this._client.post("/realtime/transcription_sessions", {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/beta/realtime/realtime.mjs
var Realtime = class extends APIResource {
  constructor() {
    super(...arguments);
    this.sessions = new Sessions(this._client);
    this.transcriptionSessions = new TranscriptionSessions(this._client);
  }
};
Realtime.Sessions = Sessions;
Realtime.TranscriptionSessions = TranscriptionSessions;

// node_modules/@langchain/openai/node_modules/openai/resources/beta/threads/messages.mjs
var Messages2 = class extends APIResource {
  /**
   * Create a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  create(threadId, body, options) {
    return this._client.post(`/threads/${threadId}/messages`, {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Retrieve a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(threadId, messageId, options) {
    return this._client.get(`/threads/${threadId}/messages/${messageId}`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Modifies a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(threadId, messageId, body, options) {
    return this._client.post(`/threads/${threadId}/messages/${messageId}`, {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  list(threadId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list(threadId, {}, query);
    }
    return this._client.getAPIList(`/threads/${threadId}/messages`, MessagesPage, {
      query,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Deletes a message.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  del(threadId, messageId, options) {
    return this._client.delete(`/threads/${threadId}/messages/${messageId}`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
};
var MessagesPage = class extends CursorPage {
};
Messages2.MessagesPage = MessagesPage;

// node_modules/@langchain/openai/node_modules/openai/resources/beta/threads/runs/steps.mjs
var Steps = class extends APIResource {
  retrieve(threadId, runId, stepId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.retrieve(threadId, runId, stepId, {}, query);
    }
    return this._client.get(`/threads/${threadId}/runs/${runId}/steps/${stepId}`, {
      query,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  list(threadId, runId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list(threadId, runId, {}, query);
    }
    return this._client.getAPIList(`/threads/${threadId}/runs/${runId}/steps`, RunStepsPage, {
      query,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
};
var RunStepsPage = class extends CursorPage {
};
Steps.RunStepsPage = RunStepsPage;

// node_modules/@langchain/openai/node_modules/openai/resources/beta/threads/runs/runs.mjs
var Runs = class extends APIResource {
  constructor() {
    super(...arguments);
    this.steps = new Steps(this._client);
  }
  create(threadId, params, options) {
    const { include, ...body } = params;
    return this._client.post(`/threads/${threadId}/runs`, {
      query: { include },
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers },
      stream: params.stream ?? false
    });
  }
  /**
   * Retrieves a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(threadId, runId, options) {
    return this._client.get(`/threads/${threadId}/runs/${runId}`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Modifies a run.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(threadId, runId, body, options) {
    return this._client.post(`/threads/${threadId}/runs/${runId}`, {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  list(threadId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list(threadId, {}, query);
    }
    return this._client.getAPIList(`/threads/${threadId}/runs`, RunsPage, {
      query,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Cancels a run that is `in_progress`.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  cancel(threadId, runId, options) {
    return this._client.post(`/threads/${threadId}/runs/${runId}/cancel`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * A helper to create a run an poll for a terminal state. More information on Run
   * lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async createAndPoll(threadId, body, options) {
    const run = await this.create(threadId, body, options);
    return await this.poll(threadId, run.id, options);
  }
  /**
   * Create a Run stream
   *
   * @deprecated use `stream` instead
   */
  createAndStream(threadId, body, options) {
    return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
  }
  /**
   * A helper to poll a run status until it reaches a terminal state. More
   * information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async poll(threadId, runId, options) {
    const headers = { ...options == null ? void 0 : options.headers, "X-Stainless-Poll-Helper": "true" };
    if (options == null ? void 0 : options.pollIntervalMs) {
      headers["X-Stainless-Custom-Poll-Interval"] = options.pollIntervalMs.toString();
    }
    while (true) {
      const { data: run, response } = await this.retrieve(threadId, runId, {
        ...options,
        headers: { ...options == null ? void 0 : options.headers, ...headers }
      }).withResponse();
      switch (run.status) {
        case "queued":
        case "in_progress":
        case "cancelling":
          let sleepInterval = 5e3;
          if (options == null ? void 0 : options.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = response.headers.get("openai-poll-after-ms");
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep(sleepInterval);
          break;
        case "requires_action":
        case "incomplete":
        case "cancelled":
        case "completed":
        case "failed":
        case "expired":
          return run;
      }
    }
  }
  /**
   * Create a Run stream
   */
  stream(threadId, body, options) {
    return AssistantStream.createAssistantStream(threadId, this._client.beta.threads.runs, body, options);
  }
  submitToolOutputs(threadId, runId, body, options) {
    return this._client.post(`/threads/${threadId}/runs/${runId}/submit_tool_outputs`, {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers },
      stream: body.stream ?? false
    });
  }
  /**
   * A helper to submit a tool output to a run and poll for a terminal run state.
   * More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async submitToolOutputsAndPoll(threadId, runId, body, options) {
    const run = await this.submitToolOutputs(threadId, runId, body, options);
    return await this.poll(threadId, run.id, options);
  }
  /**
   * Submit the tool outputs from a previous run and stream the run to a terminal
   * state. More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  submitToolOutputsStream(threadId, runId, body, options) {
    return AssistantStream.createToolAssistantStream(threadId, runId, this._client.beta.threads.runs, body, options);
  }
};
var RunsPage = class extends CursorPage {
};
Runs.RunsPage = RunsPage;
Runs.Steps = Steps;
Runs.RunStepsPage = RunStepsPage;

// node_modules/@langchain/openai/node_modules/openai/resources/beta/threads/threads.mjs
var Threads = class extends APIResource {
  constructor() {
    super(...arguments);
    this.runs = new Runs(this._client);
    this.messages = new Messages2(this._client);
  }
  create(body = {}, options) {
    if (isRequestOptions(body)) {
      return this.create({}, body);
    }
    return this._client.post("/threads", {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Retrieves a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  retrieve(threadId, options) {
    return this._client.get(`/threads/${threadId}`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Modifies a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  update(threadId, body, options) {
    return this._client.post(`/threads/${threadId}`, {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Delete a thread.
   *
   * @deprecated The Assistants API is deprecated in favor of the Responses API
   */
  del(threadId, options) {
    return this._client.delete(`/threads/${threadId}`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  createAndRun(body, options) {
    return this._client.post("/threads/runs", {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers },
      stream: body.stream ?? false
    });
  }
  /**
   * A helper to create a thread, start a run and then poll for a terminal state.
   * More information on Run lifecycles can be found here:
   * https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps
   */
  async createAndRunPoll(body, options) {
    const run = await this.createAndRun(body, options);
    return await this.runs.poll(run.thread_id, run.id, options);
  }
  /**
   * Create a thread and stream the run back
   */
  createAndRunStream(body, options) {
    return AssistantStream.createThreadAssistantStream(body, this._client.beta.threads, options);
  }
};
Threads.Runs = Runs;
Threads.RunsPage = RunsPage;
Threads.Messages = Messages2;
Threads.MessagesPage = MessagesPage;

// node_modules/@langchain/openai/node_modules/openai/resources/beta/beta.mjs
var Beta = class extends APIResource {
  constructor() {
    super(...arguments);
    this.realtime = new Realtime(this._client);
    this.chat = new Chat2(this._client);
    this.assistants = new Assistants(this._client);
    this.threads = new Threads(this._client);
  }
};
Beta.Realtime = Realtime;
Beta.Assistants = Assistants;
Beta.AssistantsPage = AssistantsPage;
Beta.Threads = Threads;

// node_modules/@langchain/openai/node_modules/openai/resources/completions.mjs
var Completions3 = class extends APIResource {
  create(body, options) {
    return this._client.post("/completions", { body, ...options, stream: body.stream ?? false });
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/containers/files/content.mjs
var Content = class extends APIResource {
  /**
   * Retrieve Container File Content
   */
  retrieve(containerId, fileId, options) {
    return this._client.get(`/containers/${containerId}/files/${fileId}/content`, {
      ...options,
      headers: { Accept: "application/binary", ...options == null ? void 0 : options.headers },
      __binaryResponse: true
    });
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/containers/files/files.mjs
var Files = class extends APIResource {
  constructor() {
    super(...arguments);
    this.content = new Content(this._client);
  }
  /**
   * Create a Container File
   *
   * You can send either a multipart/form-data request with the raw file content, or
   * a JSON request with a file ID.
   */
  create(containerId, body, options) {
    return this._client.post(`/containers/${containerId}/files`, multipartFormRequestOptions({ body, ...options }));
  }
  /**
   * Retrieve Container File
   */
  retrieve(containerId, fileId, options) {
    return this._client.get(`/containers/${containerId}/files/${fileId}`, options);
  }
  list(containerId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list(containerId, {}, query);
    }
    return this._client.getAPIList(`/containers/${containerId}/files`, FileListResponsesPage, {
      query,
      ...options
    });
  }
  /**
   * Delete Container File
   */
  del(containerId, fileId, options) {
    return this._client.delete(`/containers/${containerId}/files/${fileId}`, {
      ...options,
      headers: { Accept: "*/*", ...options == null ? void 0 : options.headers }
    });
  }
};
var FileListResponsesPage = class extends CursorPage {
};
Files.FileListResponsesPage = FileListResponsesPage;
Files.Content = Content;

// node_modules/@langchain/openai/node_modules/openai/resources/containers/containers.mjs
var Containers = class extends APIResource {
  constructor() {
    super(...arguments);
    this.files = new Files(this._client);
  }
  /**
   * Create Container
   */
  create(body, options) {
    return this._client.post("/containers", { body, ...options });
  }
  /**
   * Retrieve Container
   */
  retrieve(containerId, options) {
    return this._client.get(`/containers/${containerId}`, options);
  }
  list(query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList("/containers", ContainerListResponsesPage, { query, ...options });
  }
  /**
   * Delete Container
   */
  del(containerId, options) {
    return this._client.delete(`/containers/${containerId}`, {
      ...options,
      headers: { Accept: "*/*", ...options == null ? void 0 : options.headers }
    });
  }
};
var ContainerListResponsesPage = class extends CursorPage {
};
Containers.ContainerListResponsesPage = ContainerListResponsesPage;
Containers.Files = Files;
Containers.FileListResponsesPage = FileListResponsesPage;

// node_modules/@langchain/openai/node_modules/openai/resources/embeddings.mjs
var Embeddings = class extends APIResource {
  /**
   * Creates an embedding vector representing the input text.
   *
   * @example
   * ```ts
   * const createEmbeddingResponse =
   *   await client.embeddings.create({
   *     input: 'The quick brown fox jumped over the lazy dog',
   *     model: 'text-embedding-3-small',
   *   });
   * ```
   */
  create(body, options) {
    const hasUserProvidedEncodingFormat = !!body.encoding_format;
    let encoding_format = hasUserProvidedEncodingFormat ? body.encoding_format : "base64";
    if (hasUserProvidedEncodingFormat) {
      debug("Request", "User defined encoding_format:", body.encoding_format);
    }
    const response = this._client.post("/embeddings", {
      body: {
        ...body,
        encoding_format
      },
      ...options
    });
    if (hasUserProvidedEncodingFormat) {
      return response;
    }
    debug("response", "Decoding base64 embeddings to float32 array");
    return response._thenUnwrap((response2) => {
      if (response2 && response2.data) {
        response2.data.forEach((embeddingBase64Obj) => {
          const embeddingBase64Str = embeddingBase64Obj.embedding;
          embeddingBase64Obj.embedding = toFloat32Array(embeddingBase64Str);
        });
      }
      return response2;
    });
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/evals/runs/output-items.mjs
var OutputItems = class extends APIResource {
  /**
   * Get an evaluation run output item by ID.
   */
  retrieve(evalId, runId, outputItemId, options) {
    return this._client.get(`/evals/${evalId}/runs/${runId}/output_items/${outputItemId}`, options);
  }
  list(evalId, runId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list(evalId, runId, {}, query);
    }
    return this._client.getAPIList(`/evals/${evalId}/runs/${runId}/output_items`, OutputItemListResponsesPage, { query, ...options });
  }
};
var OutputItemListResponsesPage = class extends CursorPage {
};
OutputItems.OutputItemListResponsesPage = OutputItemListResponsesPage;

// node_modules/@langchain/openai/node_modules/openai/resources/evals/runs/runs.mjs
var Runs2 = class extends APIResource {
  constructor() {
    super(...arguments);
    this.outputItems = new OutputItems(this._client);
  }
  /**
   * Kicks off a new run for a given evaluation, specifying the data source, and what
   * model configuration to use to test. The datasource will be validated against the
   * schema specified in the config of the evaluation.
   */
  create(evalId, body, options) {
    return this._client.post(`/evals/${evalId}/runs`, { body, ...options });
  }
  /**
   * Get an evaluation run by ID.
   */
  retrieve(evalId, runId, options) {
    return this._client.get(`/evals/${evalId}/runs/${runId}`, options);
  }
  list(evalId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list(evalId, {}, query);
    }
    return this._client.getAPIList(`/evals/${evalId}/runs`, RunListResponsesPage, { query, ...options });
  }
  /**
   * Delete an eval run.
   */
  del(evalId, runId, options) {
    return this._client.delete(`/evals/${evalId}/runs/${runId}`, options);
  }
  /**
   * Cancel an ongoing evaluation run.
   */
  cancel(evalId, runId, options) {
    return this._client.post(`/evals/${evalId}/runs/${runId}`, options);
  }
};
var RunListResponsesPage = class extends CursorPage {
};
Runs2.RunListResponsesPage = RunListResponsesPage;
Runs2.OutputItems = OutputItems;
Runs2.OutputItemListResponsesPage = OutputItemListResponsesPage;

// node_modules/@langchain/openai/node_modules/openai/resources/evals/evals.mjs
var Evals = class extends APIResource {
  constructor() {
    super(...arguments);
    this.runs = new Runs2(this._client);
  }
  /**
   * Create the structure of an evaluation that can be used to test a model's
   * performance. An evaluation is a set of testing criteria and the config for a
   * data source, which dictates the schema of the data used in the evaluation. After
   * creating an evaluation, you can run it on different models and model parameters.
   * We support several types of graders and datasources. For more information, see
   * the [Evals guide](https://platform.openai.com/docs/guides/evals).
   */
  create(body, options) {
    return this._client.post("/evals", { body, ...options });
  }
  /**
   * Get an evaluation by ID.
   */
  retrieve(evalId, options) {
    return this._client.get(`/evals/${evalId}`, options);
  }
  /**
   * Update certain properties of an evaluation.
   */
  update(evalId, body, options) {
    return this._client.post(`/evals/${evalId}`, { body, ...options });
  }
  list(query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList("/evals", EvalListResponsesPage, { query, ...options });
  }
  /**
   * Delete an evaluation.
   */
  del(evalId, options) {
    return this._client.delete(`/evals/${evalId}`, options);
  }
};
var EvalListResponsesPage = class extends CursorPage {
};
Evals.EvalListResponsesPage = EvalListResponsesPage;
Evals.Runs = Runs2;
Evals.RunListResponsesPage = RunListResponsesPage;

// node_modules/@langchain/openai/node_modules/openai/resources/files.mjs
var Files2 = class extends APIResource {
  /**
   * Upload a file that can be used across various endpoints. Individual files can be
   * up to 512 MB, and the size of all files uploaded by one organization can be up
   * to 100 GB.
   *
   * The Assistants API supports files up to 2 million tokens and of specific file
   * types. See the
   * [Assistants Tools guide](https://platform.openai.com/docs/assistants/tools) for
   * details.
   *
   * The Fine-tuning API only supports `.jsonl` files. The input also has certain
   * required formats for fine-tuning
   * [chat](https://platform.openai.com/docs/api-reference/fine-tuning/chat-input) or
   * [completions](https://platform.openai.com/docs/api-reference/fine-tuning/completions-input)
   * models.
   *
   * The Batch API only supports `.jsonl` files up to 200 MB in size. The input also
   * has a specific required
   * [format](https://platform.openai.com/docs/api-reference/batch/request-input).
   *
   * Please [contact us](https://help.openai.com/) if you need to increase these
   * storage limits.
   */
  create(body, options) {
    return this._client.post("/files", multipartFormRequestOptions({ body, ...options }));
  }
  /**
   * Returns information about a specific file.
   */
  retrieve(fileId, options) {
    return this._client.get(`/files/${fileId}`, options);
  }
  list(query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList("/files", FileObjectsPage, { query, ...options });
  }
  /**
   * Delete a file.
   */
  del(fileId, options) {
    return this._client.delete(`/files/${fileId}`, options);
  }
  /**
   * Returns the contents of the specified file.
   */
  content(fileId, options) {
    return this._client.get(`/files/${fileId}/content`, {
      ...options,
      headers: { Accept: "application/binary", ...options == null ? void 0 : options.headers },
      __binaryResponse: true
    });
  }
  /**
   * Returns the contents of the specified file.
   *
   * @deprecated The `.content()` method should be used instead
   */
  retrieveContent(fileId, options) {
    return this._client.get(`/files/${fileId}/content`, options);
  }
  /**
   * Waits for the given file to be processed, default timeout is 30 mins.
   */
  async waitForProcessing(id, { pollInterval = 5e3, maxWait = 30 * 60 * 1e3 } = {}) {
    const TERMINAL_STATES = /* @__PURE__ */ new Set(["processed", "error", "deleted"]);
    const start = Date.now();
    let file = await this.retrieve(id);
    while (!file.status || !TERMINAL_STATES.has(file.status)) {
      await sleep(pollInterval);
      file = await this.retrieve(id);
      if (Date.now() - start > maxWait) {
        throw new APIConnectionTimeoutError({
          message: `Giving up on waiting for file ${id} to finish processing after ${maxWait} milliseconds.`
        });
      }
    }
    return file;
  }
};
var FileObjectsPage = class extends CursorPage {
};
Files2.FileObjectsPage = FileObjectsPage;

// node_modules/@langchain/openai/node_modules/openai/resources/fine-tuning/methods.mjs
var Methods = class extends APIResource {
};

// node_modules/@langchain/openai/node_modules/openai/resources/fine-tuning/alpha/graders.mjs
var Graders = class extends APIResource {
  /**
   * Run a grader.
   *
   * @example
   * ```ts
   * const response = await client.fineTuning.alpha.graders.run({
   *   grader: {
   *     input: 'input',
   *     name: 'name',
   *     operation: 'eq',
   *     reference: 'reference',
   *     type: 'string_check',
   *   },
   *   model_sample: 'model_sample',
   *   reference_answer: 'string',
   * });
   * ```
   */
  run(body, options) {
    return this._client.post("/fine_tuning/alpha/graders/run", { body, ...options });
  }
  /**
   * Validate a grader.
   *
   * @example
   * ```ts
   * const response =
   *   await client.fineTuning.alpha.graders.validate({
   *     grader: {
   *       input: 'input',
   *       name: 'name',
   *       operation: 'eq',
   *       reference: 'reference',
   *       type: 'string_check',
   *     },
   *   });
   * ```
   */
  validate(body, options) {
    return this._client.post("/fine_tuning/alpha/graders/validate", { body, ...options });
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/fine-tuning/alpha/alpha.mjs
var Alpha = class extends APIResource {
  constructor() {
    super(...arguments);
    this.graders = new Graders(this._client);
  }
};
Alpha.Graders = Graders;

// node_modules/@langchain/openai/node_modules/openai/resources/fine-tuning/checkpoints/permissions.mjs
var Permissions = class extends APIResource {
  /**
   * **NOTE:** Calling this endpoint requires an [admin API key](../admin-api-keys).
   *
   * This enables organization owners to share fine-tuned models with other projects
   * in their organization.
   *
   * @example
   * ```ts
   * // Automatically fetches more pages as needed.
   * for await (const permissionCreateResponse of client.fineTuning.checkpoints.permissions.create(
   *   'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
   *   { project_ids: ['string'] },
   * )) {
   *   // ...
   * }
   * ```
   */
  create(fineTunedModelCheckpoint, body, options) {
    return this._client.getAPIList(`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, PermissionCreateResponsesPage, { body, method: "post", ...options });
  }
  retrieve(fineTunedModelCheckpoint, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.retrieve(fineTunedModelCheckpoint, {}, query);
    }
    return this._client.get(`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions`, {
      query,
      ...options
    });
  }
  /**
   * **NOTE:** This endpoint requires an [admin API key](../admin-api-keys).
   *
   * Organization owners can use this endpoint to delete a permission for a
   * fine-tuned model checkpoint.
   *
   * @example
   * ```ts
   * const permission =
   *   await client.fineTuning.checkpoints.permissions.del(
   *     'ft:gpt-4o-mini-2024-07-18:org:weather:B7R9VjQd',
   *     'cp_zc4Q7MP6XxulcVzj4MZdwsAB',
   *   );
   * ```
   */
  del(fineTunedModelCheckpoint, permissionId, options) {
    return this._client.delete(`/fine_tuning/checkpoints/${fineTunedModelCheckpoint}/permissions/${permissionId}`, options);
  }
};
var PermissionCreateResponsesPage = class extends Page {
};
Permissions.PermissionCreateResponsesPage = PermissionCreateResponsesPage;

// node_modules/@langchain/openai/node_modules/openai/resources/fine-tuning/checkpoints/checkpoints.mjs
var Checkpoints = class extends APIResource {
  constructor() {
    super(...arguments);
    this.permissions = new Permissions(this._client);
  }
};
Checkpoints.Permissions = Permissions;
Checkpoints.PermissionCreateResponsesPage = PermissionCreateResponsesPage;

// node_modules/@langchain/openai/node_modules/openai/resources/fine-tuning/jobs/checkpoints.mjs
var Checkpoints2 = class extends APIResource {
  list(fineTuningJobId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list(fineTuningJobId, {}, query);
    }
    return this._client.getAPIList(`/fine_tuning/jobs/${fineTuningJobId}/checkpoints`, FineTuningJobCheckpointsPage, { query, ...options });
  }
};
var FineTuningJobCheckpointsPage = class extends CursorPage {
};
Checkpoints2.FineTuningJobCheckpointsPage = FineTuningJobCheckpointsPage;

// node_modules/@langchain/openai/node_modules/openai/resources/fine-tuning/jobs/jobs.mjs
var Jobs = class extends APIResource {
  constructor() {
    super(...arguments);
    this.checkpoints = new Checkpoints2(this._client);
  }
  /**
   * Creates a fine-tuning job which begins the process of creating a new model from
   * a given dataset.
   *
   * Response includes details of the enqueued job including job status and the name
   * of the fine-tuned models once complete.
   *
   * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/fine-tuning)
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.create({
   *   model: 'gpt-4o-mini',
   *   training_file: 'file-abc123',
   * });
   * ```
   */
  create(body, options) {
    return this._client.post("/fine_tuning/jobs", { body, ...options });
  }
  /**
   * Get info about a fine-tuning job.
   *
   * [Learn more about fine-tuning](https://platform.openai.com/docs/guides/fine-tuning)
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.retrieve(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  retrieve(fineTuningJobId, options) {
    return this._client.get(`/fine_tuning/jobs/${fineTuningJobId}`, options);
  }
  list(query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList("/fine_tuning/jobs", FineTuningJobsPage, { query, ...options });
  }
  /**
   * Immediately cancel a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.cancel(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  cancel(fineTuningJobId, options) {
    return this._client.post(`/fine_tuning/jobs/${fineTuningJobId}/cancel`, options);
  }
  listEvents(fineTuningJobId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.listEvents(fineTuningJobId, {}, query);
    }
    return this._client.getAPIList(`/fine_tuning/jobs/${fineTuningJobId}/events`, FineTuningJobEventsPage, {
      query,
      ...options
    });
  }
  /**
   * Pause a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.pause(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  pause(fineTuningJobId, options) {
    return this._client.post(`/fine_tuning/jobs/${fineTuningJobId}/pause`, options);
  }
  /**
   * Resume a fine-tune job.
   *
   * @example
   * ```ts
   * const fineTuningJob = await client.fineTuning.jobs.resume(
   *   'ft-AF1WoRqd3aJAHsqc9NY7iL8F',
   * );
   * ```
   */
  resume(fineTuningJobId, options) {
    return this._client.post(`/fine_tuning/jobs/${fineTuningJobId}/resume`, options);
  }
};
var FineTuningJobsPage = class extends CursorPage {
};
var FineTuningJobEventsPage = class extends CursorPage {
};
Jobs.FineTuningJobsPage = FineTuningJobsPage;
Jobs.FineTuningJobEventsPage = FineTuningJobEventsPage;
Jobs.Checkpoints = Checkpoints2;
Jobs.FineTuningJobCheckpointsPage = FineTuningJobCheckpointsPage;

// node_modules/@langchain/openai/node_modules/openai/resources/fine-tuning/fine-tuning.mjs
var FineTuning = class extends APIResource {
  constructor() {
    super(...arguments);
    this.methods = new Methods(this._client);
    this.jobs = new Jobs(this._client);
    this.checkpoints = new Checkpoints(this._client);
    this.alpha = new Alpha(this._client);
  }
};
FineTuning.Methods = Methods;
FineTuning.Jobs = Jobs;
FineTuning.FineTuningJobsPage = FineTuningJobsPage;
FineTuning.FineTuningJobEventsPage = FineTuningJobEventsPage;
FineTuning.Checkpoints = Checkpoints;
FineTuning.Alpha = Alpha;

// node_modules/@langchain/openai/node_modules/openai/resources/graders/grader-models.mjs
var GraderModels = class extends APIResource {
};

// node_modules/@langchain/openai/node_modules/openai/resources/graders/graders.mjs
var Graders2 = class extends APIResource {
  constructor() {
    super(...arguments);
    this.graderModels = new GraderModels(this._client);
  }
};
Graders2.GraderModels = GraderModels;

// node_modules/@langchain/openai/node_modules/openai/resources/images.mjs
var Images = class extends APIResource {
  /**
   * Creates a variation of a given image. This endpoint only supports `dall-e-2`.
   *
   * @example
   * ```ts
   * const imagesResponse = await client.images.createVariation({
   *   image: fs.createReadStream('otter.png'),
   * });
   * ```
   */
  createVariation(body, options) {
    return this._client.post("/images/variations", multipartFormRequestOptions({ body, ...options }));
  }
  /**
   * Creates an edited or extended image given one or more source images and a
   * prompt. This endpoint only supports `gpt-image-1` and `dall-e-2`.
   *
   * @example
   * ```ts
   * const imagesResponse = await client.images.edit({
   *   image: fs.createReadStream('path/to/file'),
   *   prompt: 'A cute baby sea otter wearing a beret',
   * });
   * ```
   */
  edit(body, options) {
    return this._client.post("/images/edits", multipartFormRequestOptions({ body, ...options }));
  }
  /**
   * Creates an image given a prompt.
   * [Learn more](https://platform.openai.com/docs/guides/images).
   *
   * @example
   * ```ts
   * const imagesResponse = await client.images.generate({
   *   prompt: 'A cute baby sea otter',
   * });
   * ```
   */
  generate(body, options) {
    return this._client.post("/images/generations", { body, ...options });
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/models.mjs
var Models = class extends APIResource {
  /**
   * Retrieves a model instance, providing basic information about the model such as
   * the owner and permissioning.
   */
  retrieve(model, options) {
    return this._client.get(`/models/${model}`, options);
  }
  /**
   * Lists the currently available models, and provides basic information about each
   * one such as the owner and availability.
   */
  list(options) {
    return this._client.getAPIList("/models", ModelsPage, options);
  }
  /**
   * Delete a fine-tuned model. You must have the Owner role in your organization to
   * delete a model.
   */
  del(model, options) {
    return this._client.delete(`/models/${model}`, options);
  }
};
var ModelsPage = class extends Page {
};
Models.ModelsPage = ModelsPage;

// node_modules/@langchain/openai/node_modules/openai/resources/moderations.mjs
var Moderations = class extends APIResource {
  /**
   * Classifies if text and/or image inputs are potentially harmful. Learn more in
   * the [moderation guide](https://platform.openai.com/docs/guides/moderation).
   */
  create(body, options) {
    return this._client.post("/moderations", { body, ...options });
  }
};

// node_modules/@langchain/openai/node_modules/openai/lib/ResponsesParser.mjs
function maybeParseResponse(response, params) {
  if (!params || !hasAutoParseableInput2(params)) {
    return {
      ...response,
      output_parsed: null,
      output: response.output.map((item) => {
        if (item.type === "function_call") {
          return {
            ...item,
            parsed_arguments: null
          };
        }
        if (item.type === "message") {
          return {
            ...item,
            content: item.content.map((content) => ({
              ...content,
              parsed: null
            }))
          };
        } else {
          return item;
        }
      })
    };
  }
  return parseResponse(response, params);
}
function parseResponse(response, params) {
  const output = response.output.map((item) => {
    if (item.type === "function_call") {
      return {
        ...item,
        parsed_arguments: parseToolCall2(params, item)
      };
    }
    if (item.type === "message") {
      const content = item.content.map((content2) => {
        if (content2.type === "output_text") {
          return {
            ...content2,
            parsed: parseTextFormat(params, content2.text)
          };
        }
        return content2;
      });
      return {
        ...item,
        content
      };
    }
    return item;
  });
  const parsed = Object.assign({}, response, { output });
  if (!Object.getOwnPropertyDescriptor(response, "output_text")) {
    addOutputText(parsed);
  }
  Object.defineProperty(parsed, "output_parsed", {
    enumerable: true,
    get() {
      for (const output2 of parsed.output) {
        if (output2.type !== "message") {
          continue;
        }
        for (const content of output2.content) {
          if (content.type === "output_text" && content.parsed !== null) {
            return content.parsed;
          }
        }
      }
      return null;
    }
  });
  return parsed;
}
function parseTextFormat(params, content) {
  var _a2, _b, _c, _d;
  if (((_b = (_a2 = params.text) == null ? void 0 : _a2.format) == null ? void 0 : _b.type) !== "json_schema") {
    return null;
  }
  if ("$parseRaw" in ((_c = params.text) == null ? void 0 : _c.format)) {
    const text_format = (_d = params.text) == null ? void 0 : _d.format;
    return text_format.$parseRaw(content);
  }
  return JSON.parse(content);
}
function hasAutoParseableInput2(params) {
  var _a2;
  if (isAutoParsableResponseFormat((_a2 = params.text) == null ? void 0 : _a2.format)) {
    return true;
  }
  return false;
}
function isAutoParsableTool2(tool) {
  return (tool == null ? void 0 : tool["$brand"]) === "auto-parseable-tool";
}
function getInputToolByName(input_tools, name) {
  return input_tools.find((tool) => tool.type === "function" && tool.name === name);
}
function parseToolCall2(params, toolCall) {
  const inputTool = getInputToolByName(params.tools ?? [], toolCall.name);
  return {
    ...toolCall,
    ...toolCall,
    parsed_arguments: isAutoParsableTool2(inputTool) ? inputTool.$parseRaw(toolCall.arguments) : (inputTool == null ? void 0 : inputTool.strict) ? JSON.parse(toolCall.arguments) : null
  };
}
function addOutputText(rsp) {
  const texts = [];
  for (const output of rsp.output) {
    if (output.type !== "message") {
      continue;
    }
    for (const content of output.content) {
      if (content.type === "output_text") {
        texts.push(content.text);
      }
    }
  }
  rsp.output_text = texts.join("");
}

// node_modules/@langchain/openai/node_modules/openai/resources/responses/input-items.mjs
var InputItems = class extends APIResource {
  list(responseId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list(responseId, {}, query);
    }
    return this._client.getAPIList(`/responses/${responseId}/input_items`, ResponseItemsPage, {
      query,
      ...options
    });
  }
};

// node_modules/@langchain/openai/node_modules/openai/lib/responses/ResponseStream.mjs
var __classPrivateFieldSet6 = function(receiver, state, value, kind2, f) {
  if (kind2 === "m") throw new TypeError("Private method is not writable");
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind2 === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet7 = function(receiver, state, kind2, f) {
  if (kind2 === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind2 === "m" ? f : kind2 === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ResponseStream_instances;
var _ResponseStream_params;
var _ResponseStream_currentResponseSnapshot;
var _ResponseStream_finalResponse;
var _ResponseStream_beginRequest;
var _ResponseStream_addEvent;
var _ResponseStream_endRequest;
var _ResponseStream_accumulateResponse;
var ResponseStream = class _ResponseStream extends EventStream {
  constructor(params) {
    super();
    _ResponseStream_instances.add(this);
    _ResponseStream_params.set(this, void 0);
    _ResponseStream_currentResponseSnapshot.set(this, void 0);
    _ResponseStream_finalResponse.set(this, void 0);
    __classPrivateFieldSet6(this, _ResponseStream_params, params, "f");
  }
  static createResponse(client, params, options) {
    const runner = new _ResponseStream(params);
    runner._run(() => runner._createOrRetrieveResponse(client, params, {
      ...options,
      headers: { ...options == null ? void 0 : options.headers, "X-Stainless-Helper-Method": "stream" }
    }));
    return runner;
  }
  async _createOrRetrieveResponse(client, params, options) {
    var _a2;
    const signal = options == null ? void 0 : options.signal;
    if (signal) {
      if (signal.aborted)
        this.controller.abort();
      signal.addEventListener("abort", () => this.controller.abort());
    }
    __classPrivateFieldGet7(this, _ResponseStream_instances, "m", _ResponseStream_beginRequest).call(this);
    let stream;
    let starting_after = null;
    if ("response_id" in params) {
      stream = await client.responses.retrieve(params.response_id, { stream: true }, { ...options, signal: this.controller.signal, stream: true });
      starting_after = params.starting_after ?? null;
    } else {
      stream = await client.responses.create({ ...params, stream: true }, { ...options, signal: this.controller.signal });
    }
    this._connected();
    for await (const event of stream) {
      __classPrivateFieldGet7(this, _ResponseStream_instances, "m", _ResponseStream_addEvent).call(this, event, starting_after);
    }
    if ((_a2 = stream.controller.signal) == null ? void 0 : _a2.aborted) {
      throw new APIUserAbortError();
    }
    return __classPrivateFieldGet7(this, _ResponseStream_instances, "m", _ResponseStream_endRequest).call(this);
  }
  [(_ResponseStream_params = /* @__PURE__ */ new WeakMap(), _ResponseStream_currentResponseSnapshot = /* @__PURE__ */ new WeakMap(), _ResponseStream_finalResponse = /* @__PURE__ */ new WeakMap(), _ResponseStream_instances = /* @__PURE__ */ new WeakSet(), _ResponseStream_beginRequest = function _ResponseStream_beginRequest2() {
    if (this.ended)
      return;
    __classPrivateFieldSet6(this, _ResponseStream_currentResponseSnapshot, void 0, "f");
  }, _ResponseStream_addEvent = function _ResponseStream_addEvent2(event, starting_after) {
    if (this.ended)
      return;
    const maybeEmit = (name, event2) => {
      if (starting_after == null || event2.sequence_number > starting_after) {
        this._emit(name, event2);
      }
    };
    const response = __classPrivateFieldGet7(this, _ResponseStream_instances, "m", _ResponseStream_accumulateResponse).call(this, event);
    maybeEmit("event", event);
    switch (event.type) {
      case "response.output_text.delta": {
        const output = response.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "message") {
          const content = output.content[event.content_index];
          if (!content) {
            throw new OpenAIError(`missing content at index ${event.content_index}`);
          }
          if (content.type !== "output_text") {
            throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
          }
          maybeEmit("response.output_text.delta", {
            ...event,
            snapshot: content.text
          });
        }
        break;
      }
      case "response.function_call_arguments.delta": {
        const output = response.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "function_call") {
          maybeEmit("response.function_call_arguments.delta", {
            ...event,
            snapshot: output.arguments
          });
        }
        break;
      }
      default:
        maybeEmit(event.type, event);
        break;
    }
  }, _ResponseStream_endRequest = function _ResponseStream_endRequest2() {
    if (this.ended) {
      throw new OpenAIError(`stream has ended, this shouldn't happen`);
    }
    const snapshot = __classPrivateFieldGet7(this, _ResponseStream_currentResponseSnapshot, "f");
    if (!snapshot) {
      throw new OpenAIError(`request ended without sending any events`);
    }
    __classPrivateFieldSet6(this, _ResponseStream_currentResponseSnapshot, void 0, "f");
    const parsedResponse = finalizeResponse(snapshot, __classPrivateFieldGet7(this, _ResponseStream_params, "f"));
    __classPrivateFieldSet6(this, _ResponseStream_finalResponse, parsedResponse, "f");
    return parsedResponse;
  }, _ResponseStream_accumulateResponse = function _ResponseStream_accumulateResponse2(event) {
    let snapshot = __classPrivateFieldGet7(this, _ResponseStream_currentResponseSnapshot, "f");
    if (!snapshot) {
      if (event.type !== "response.created") {
        throw new OpenAIError(`When snapshot hasn't been set yet, expected 'response.created' event, got ${event.type}`);
      }
      snapshot = __classPrivateFieldSet6(this, _ResponseStream_currentResponseSnapshot, event.response, "f");
      return snapshot;
    }
    switch (event.type) {
      case "response.output_item.added": {
        snapshot.output.push(event.item);
        break;
      }
      case "response.content_part.added": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "message") {
          output.content.push(event.part);
        }
        break;
      }
      case "response.output_text.delta": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "message") {
          const content = output.content[event.content_index];
          if (!content) {
            throw new OpenAIError(`missing content at index ${event.content_index}`);
          }
          if (content.type !== "output_text") {
            throw new OpenAIError(`expected content to be 'output_text', got ${content.type}`);
          }
          content.text += event.delta;
        }
        break;
      }
      case "response.function_call_arguments.delta": {
        const output = snapshot.output[event.output_index];
        if (!output) {
          throw new OpenAIError(`missing output at index ${event.output_index}`);
        }
        if (output.type === "function_call") {
          output.arguments += event.delta;
        }
        break;
      }
      case "response.completed": {
        __classPrivateFieldSet6(this, _ResponseStream_currentResponseSnapshot, event.response, "f");
        break;
      }
    }
    return snapshot;
  }, Symbol.asyncIterator)]() {
    const pushQueue = [];
    const readQueue = [];
    let done = false;
    this.on("event", (event) => {
      const reader = readQueue.shift();
      if (reader) {
        reader.resolve(event);
      } else {
        pushQueue.push(event);
      }
    });
    this.on("end", () => {
      done = true;
      for (const reader of readQueue) {
        reader.resolve(void 0);
      }
      readQueue.length = 0;
    });
    this.on("abort", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    this.on("error", (err) => {
      done = true;
      for (const reader of readQueue) {
        reader.reject(err);
      }
      readQueue.length = 0;
    });
    return {
      next: async () => {
        if (!pushQueue.length) {
          if (done) {
            return { value: void 0, done: true };
          }
          return new Promise((resolve, reject) => readQueue.push({ resolve, reject })).then((event2) => event2 ? { value: event2, done: false } : { value: void 0, done: true });
        }
        const event = pushQueue.shift();
        return { value: event, done: false };
      },
      return: async () => {
        this.abort();
        return { value: void 0, done: true };
      }
    };
  }
  /**
   * @returns a promise that resolves with the final Response, or rejects
   * if an error occurred or the stream ended prematurely without producing a REsponse.
   */
  async finalResponse() {
    await this.done();
    const response = __classPrivateFieldGet7(this, _ResponseStream_finalResponse, "f");
    if (!response)
      throw new OpenAIError("stream ended without producing a ChatCompletion");
    return response;
  }
};
function finalizeResponse(snapshot, params) {
  return maybeParseResponse(snapshot, params);
}

// node_modules/@langchain/openai/node_modules/openai/resources/responses/responses.mjs
var Responses = class extends APIResource {
  constructor() {
    super(...arguments);
    this.inputItems = new InputItems(this._client);
  }
  create(body, options) {
    return this._client.post("/responses", { body, ...options, stream: body.stream ?? false })._thenUnwrap((rsp) => {
      if ("object" in rsp && rsp.object === "response") {
        addOutputText(rsp);
      }
      return rsp;
    });
  }
  retrieve(responseId, query = {}, options) {
    return this._client.get(`/responses/${responseId}`, {
      query,
      ...options,
      stream: (query == null ? void 0 : query.stream) ?? false
    });
  }
  /**
   * Deletes a model response with the given ID.
   *
   * @example
   * ```ts
   * await client.responses.del(
   *   'resp_677efb5139a88190b512bc3fef8e535d',
   * );
   * ```
   */
  del(responseId, options) {
    return this._client.delete(`/responses/${responseId}`, {
      ...options,
      headers: { Accept: "*/*", ...options == null ? void 0 : options.headers }
    });
  }
  parse(body, options) {
    return this._client.responses.create(body, options)._thenUnwrap((response) => parseResponse(response, body));
  }
  /**
   * Creates a model response stream
   */
  stream(body, options) {
    return ResponseStream.createResponse(this._client, body, options);
  }
  /**
   * Cancels a model response with the given ID. Only responses created with the
   * `background` parameter set to `true` can be cancelled.
   * [Learn more](https://platform.openai.com/docs/guides/background).
   *
   * @example
   * ```ts
   * await client.responses.cancel(
   *   'resp_677efb5139a88190b512bc3fef8e535d',
   * );
   * ```
   */
  cancel(responseId, options) {
    return this._client.post(`/responses/${responseId}/cancel`, {
      ...options,
      headers: { Accept: "*/*", ...options == null ? void 0 : options.headers }
    });
  }
};
var ResponseItemsPage = class extends CursorPage {
};
Responses.InputItems = InputItems;

// node_modules/@langchain/openai/node_modules/openai/resources/uploads/parts.mjs
var Parts = class extends APIResource {
  /**
   * Adds a
   * [Part](https://platform.openai.com/docs/api-reference/uploads/part-object) to an
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object.
   * A Part represents a chunk of bytes from the file you are trying to upload.
   *
   * Each Part can be at most 64 MB, and you can add Parts until you hit the Upload
   * maximum of 8 GB.
   *
   * It is possible to add multiple Parts in parallel. You can decide the intended
   * order of the Parts when you
   * [complete the Upload](https://platform.openai.com/docs/api-reference/uploads/complete).
   */
  create(uploadId, body, options) {
    return this._client.post(`/uploads/${uploadId}/parts`, multipartFormRequestOptions({ body, ...options }));
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/uploads/uploads.mjs
var Uploads = class extends APIResource {
  constructor() {
    super(...arguments);
    this.parts = new Parts(this._client);
  }
  /**
   * Creates an intermediate
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object) object
   * that you can add
   * [Parts](https://platform.openai.com/docs/api-reference/uploads/part-object) to.
   * Currently, an Upload can accept at most 8 GB in total and expires after an hour
   * after you create it.
   *
   * Once you complete the Upload, we will create a
   * [File](https://platform.openai.com/docs/api-reference/files/object) object that
   * contains all the parts you uploaded. This File is usable in the rest of our
   * platform as a regular File object.
   *
   * For certain `purpose` values, the correct `mime_type` must be specified. Please
   * refer to documentation for the
   * [supported MIME types for your use case](https://platform.openai.com/docs/assistants/tools/file-search#supported-files).
   *
   * For guidance on the proper filename extensions for each purpose, please follow
   * the documentation on
   * [creating a File](https://platform.openai.com/docs/api-reference/files/create).
   */
  create(body, options) {
    return this._client.post("/uploads", { body, ...options });
  }
  /**
   * Cancels the Upload. No Parts may be added after an Upload is cancelled.
   */
  cancel(uploadId, options) {
    return this._client.post(`/uploads/${uploadId}/cancel`, options);
  }
  /**
   * Completes the
   * [Upload](https://platform.openai.com/docs/api-reference/uploads/object).
   *
   * Within the returned Upload object, there is a nested
   * [File](https://platform.openai.com/docs/api-reference/files/object) object that
   * is ready to use in the rest of the platform.
   *
   * You can specify the order of the Parts by passing in an ordered list of the Part
   * IDs.
   *
   * The number of bytes uploaded upon completion must match the number of bytes
   * initially specified when creating the Upload object. No Parts may be added after
   * an Upload is completed.
   */
  complete(uploadId, body, options) {
    return this._client.post(`/uploads/${uploadId}/complete`, { body, ...options });
  }
};
Uploads.Parts = Parts;

// node_modules/@langchain/openai/node_modules/openai/lib/Util.mjs
var allSettledWithThrow = async (promises) => {
  const results = await Promise.allSettled(promises);
  const rejected = results.filter((result) => result.status === "rejected");
  if (rejected.length) {
    for (const result of rejected) {
      console.error(result.reason);
    }
    throw new Error(`${rejected.length} promise(s) failed - see the above errors`);
  }
  const values = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      values.push(result.value);
    }
  }
  return values;
};

// node_modules/@langchain/openai/node_modules/openai/resources/vector-stores/files.mjs
var Files3 = class extends APIResource {
  /**
   * Create a vector store file by attaching a
   * [File](https://platform.openai.com/docs/api-reference/files) to a
   * [vector store](https://platform.openai.com/docs/api-reference/vector-stores/object).
   */
  create(vectorStoreId, body, options) {
    return this._client.post(`/vector_stores/${vectorStoreId}/files`, {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Retrieves a vector store file.
   */
  retrieve(vectorStoreId, fileId, options) {
    return this._client.get(`/vector_stores/${vectorStoreId}/files/${fileId}`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Update attributes on a vector store file.
   */
  update(vectorStoreId, fileId, body, options) {
    return this._client.post(`/vector_stores/${vectorStoreId}/files/${fileId}`, {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  list(vectorStoreId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list(vectorStoreId, {}, query);
    }
    return this._client.getAPIList(`/vector_stores/${vectorStoreId}/files`, VectorStoreFilesPage, {
      query,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Delete a vector store file. This will remove the file from the vector store but
   * the file itself will not be deleted. To delete the file, use the
   * [delete file](https://platform.openai.com/docs/api-reference/files/delete)
   * endpoint.
   */
  del(vectorStoreId, fileId, options) {
    return this._client.delete(`/vector_stores/${vectorStoreId}/files/${fileId}`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Attach a file to the given vector store and wait for it to be processed.
   */
  async createAndPoll(vectorStoreId, body, options) {
    const file = await this.create(vectorStoreId, body, options);
    return await this.poll(vectorStoreId, file.id, options);
  }
  /**
   * Wait for the vector store file to finish processing.
   *
   * Note: this will return even if the file failed to process, you need to check
   * file.last_error and file.status to handle these cases
   */
  async poll(vectorStoreId, fileId, options) {
    const headers = { ...options == null ? void 0 : options.headers, "X-Stainless-Poll-Helper": "true" };
    if (options == null ? void 0 : options.pollIntervalMs) {
      headers["X-Stainless-Custom-Poll-Interval"] = options.pollIntervalMs.toString();
    }
    while (true) {
      const fileResponse = await this.retrieve(vectorStoreId, fileId, {
        ...options,
        headers
      }).withResponse();
      const file = fileResponse.data;
      switch (file.status) {
        case "in_progress":
          let sleepInterval = 5e3;
          if (options == null ? void 0 : options.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = fileResponse.response.headers.get("openai-poll-after-ms");
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep(sleepInterval);
          break;
        case "failed":
        case "completed":
          return file;
      }
    }
  }
  /**
   * Upload a file to the `files` API and then attach it to the given vector store.
   *
   * Note the file will be asynchronously processed (you can use the alternative
   * polling helper method to wait for processing to complete).
   */
  async upload(vectorStoreId, file, options) {
    const fileInfo = await this._client.files.create({ file, purpose: "assistants" }, options);
    return this.create(vectorStoreId, { file_id: fileInfo.id }, options);
  }
  /**
   * Add a file to a vector store and poll until processing is complete.
   */
  async uploadAndPoll(vectorStoreId, file, options) {
    const fileInfo = await this.upload(vectorStoreId, file, options);
    return await this.poll(vectorStoreId, fileInfo.id, options);
  }
  /**
   * Retrieve the parsed contents of a vector store file.
   */
  content(vectorStoreId, fileId, options) {
    return this._client.getAPIList(`/vector_stores/${vectorStoreId}/files/${fileId}/content`, FileContentResponsesPage, { ...options, headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers } });
  }
};
var VectorStoreFilesPage = class extends CursorPage {
};
var FileContentResponsesPage = class extends Page {
};
Files3.VectorStoreFilesPage = VectorStoreFilesPage;
Files3.FileContentResponsesPage = FileContentResponsesPage;

// node_modules/@langchain/openai/node_modules/openai/resources/vector-stores/file-batches.mjs
var FileBatches = class extends APIResource {
  /**
   * Create a vector store file batch.
   */
  create(vectorStoreId, body, options) {
    return this._client.post(`/vector_stores/${vectorStoreId}/file_batches`, {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Retrieves a vector store file batch.
   */
  retrieve(vectorStoreId, batchId, options) {
    return this._client.get(`/vector_stores/${vectorStoreId}/file_batches/${batchId}`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Cancel a vector store file batch. This attempts to cancel the processing of
   * files in this batch as soon as possible.
   */
  cancel(vectorStoreId, batchId, options) {
    return this._client.post(`/vector_stores/${vectorStoreId}/file_batches/${batchId}/cancel`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Create a vector store batch and poll until all files have been processed.
   */
  async createAndPoll(vectorStoreId, body, options) {
    const batch = await this.create(vectorStoreId, body);
    return await this.poll(vectorStoreId, batch.id, options);
  }
  listFiles(vectorStoreId, batchId, query = {}, options) {
    if (isRequestOptions(query)) {
      return this.listFiles(vectorStoreId, batchId, {}, query);
    }
    return this._client.getAPIList(`/vector_stores/${vectorStoreId}/file_batches/${batchId}/files`, VectorStoreFilesPage, { query, ...options, headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers } });
  }
  /**
   * Wait for the given file batch to be processed.
   *
   * Note: this will return even if one of the files failed to process, you need to
   * check batch.file_counts.failed_count to handle this case.
   */
  async poll(vectorStoreId, batchId, options) {
    const headers = { ...options == null ? void 0 : options.headers, "X-Stainless-Poll-Helper": "true" };
    if (options == null ? void 0 : options.pollIntervalMs) {
      headers["X-Stainless-Custom-Poll-Interval"] = options.pollIntervalMs.toString();
    }
    while (true) {
      const { data: batch, response } = await this.retrieve(vectorStoreId, batchId, {
        ...options,
        headers
      }).withResponse();
      switch (batch.status) {
        case "in_progress":
          let sleepInterval = 5e3;
          if (options == null ? void 0 : options.pollIntervalMs) {
            sleepInterval = options.pollIntervalMs;
          } else {
            const headerInterval = response.headers.get("openai-poll-after-ms");
            if (headerInterval) {
              const headerIntervalMs = parseInt(headerInterval);
              if (!isNaN(headerIntervalMs)) {
                sleepInterval = headerIntervalMs;
              }
            }
          }
          await sleep(sleepInterval);
          break;
        case "failed":
        case "cancelled":
        case "completed":
          return batch;
      }
    }
  }
  /**
   * Uploads the given files concurrently and then creates a vector store file batch.
   *
   * The concurrency limit is configurable using the `maxConcurrency` parameter.
   */
  async uploadAndPoll(vectorStoreId, { files, fileIds = [] }, options) {
    if (files == null || files.length == 0) {
      throw new Error(`No \`files\` provided to process. If you've already uploaded files you should use \`.createAndPoll()\` instead`);
    }
    const configuredConcurrency = (options == null ? void 0 : options.maxConcurrency) ?? 5;
    const concurrencyLimit = Math.min(configuredConcurrency, files.length);
    const client = this._client;
    const fileIterator = files.values();
    const allFileIds = [...fileIds];
    async function processFiles(iterator) {
      for (let item of iterator) {
        const fileObj = await client.files.create({ file: item, purpose: "assistants" }, options);
        allFileIds.push(fileObj.id);
      }
    }
    const workers = Array(concurrencyLimit).fill(fileIterator).map(processFiles);
    await allSettledWithThrow(workers);
    return await this.createAndPoll(vectorStoreId, {
      file_ids: allFileIds
    });
  }
};

// node_modules/@langchain/openai/node_modules/openai/resources/vector-stores/vector-stores.mjs
var VectorStores = class extends APIResource {
  constructor() {
    super(...arguments);
    this.files = new Files3(this._client);
    this.fileBatches = new FileBatches(this._client);
  }
  /**
   * Create a vector store.
   */
  create(body, options) {
    return this._client.post("/vector_stores", {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Retrieves a vector store.
   */
  retrieve(vectorStoreId, options) {
    return this._client.get(`/vector_stores/${vectorStoreId}`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Modifies a vector store.
   */
  update(vectorStoreId, body, options) {
    return this._client.post(`/vector_stores/${vectorStoreId}`, {
      body,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  list(query = {}, options) {
    if (isRequestOptions(query)) {
      return this.list({}, query);
    }
    return this._client.getAPIList("/vector_stores", VectorStoresPage, {
      query,
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Delete a vector store.
   */
  del(vectorStoreId, options) {
    return this._client.delete(`/vector_stores/${vectorStoreId}`, {
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
  /**
   * Search a vector store for relevant chunks based on a query and file attributes
   * filter.
   */
  search(vectorStoreId, body, options) {
    return this._client.getAPIList(`/vector_stores/${vectorStoreId}/search`, VectorStoreSearchResponsesPage, {
      body,
      method: "post",
      ...options,
      headers: { "OpenAI-Beta": "assistants=v2", ...options == null ? void 0 : options.headers }
    });
  }
};
var VectorStoresPage = class extends CursorPage {
};
var VectorStoreSearchResponsesPage = class extends Page {
};
VectorStores.VectorStoresPage = VectorStoresPage;
VectorStores.VectorStoreSearchResponsesPage = VectorStoreSearchResponsesPage;
VectorStores.Files = Files3;
VectorStores.VectorStoreFilesPage = VectorStoreFilesPage;
VectorStores.FileContentResponsesPage = FileContentResponsesPage;
VectorStores.FileBatches = FileBatches;

// node_modules/@langchain/openai/node_modules/openai/index.mjs
var _a;
var OpenAI = class extends APIClient {
  /**
   * API Client for interfacing with the OpenAI API.
   *
   * @param {string | undefined} [opts.apiKey=process.env['OPENAI_API_KEY'] ?? undefined]
   * @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
   * @param {string | null | undefined} [opts.project=process.env['OPENAI_PROJECT_ID'] ?? null]
   * @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL'] ?? https://api.openai.com/v1] - Override the default base URL for the API.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
   * @param {Core.Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {Core.Headers} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Core.DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({ baseURL = readEnv("OPENAI_BASE_URL"), apiKey = readEnv("OPENAI_API_KEY"), organization = readEnv("OPENAI_ORG_ID") ?? null, project = readEnv("OPENAI_PROJECT_ID") ?? null, ...opts } = {}) {
    if (apiKey === void 0) {
      throw new OpenAIError("The OPENAI_API_KEY environment variable is missing or empty; either provide it, or instantiate the OpenAI client with an apiKey option, like new OpenAI({ apiKey: 'My API Key' }).");
    }
    const options = {
      apiKey,
      organization,
      project,
      ...opts,
      baseURL: baseURL || `https://api.openai.com/v1`
    };
    if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) {
      throw new OpenAIError("It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew OpenAI({ apiKey, dangerouslyAllowBrowser: true });\n\nhttps://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety\n");
    }
    super({
      baseURL: options.baseURL,
      timeout: options.timeout ?? 6e5,
      httpAgent: options.httpAgent,
      maxRetries: options.maxRetries,
      fetch: options.fetch
    });
    this.completions = new Completions3(this);
    this.chat = new Chat(this);
    this.embeddings = new Embeddings(this);
    this.files = new Files2(this);
    this.images = new Images(this);
    this.audio = new Audio(this);
    this.moderations = new Moderations(this);
    this.models = new Models(this);
    this.fineTuning = new FineTuning(this);
    this.graders = new Graders2(this);
    this.vectorStores = new VectorStores(this);
    this.beta = new Beta(this);
    this.batches = new Batches(this);
    this.uploads = new Uploads(this);
    this.responses = new Responses(this);
    this.evals = new Evals(this);
    this.containers = new Containers(this);
    this._options = options;
    this.apiKey = apiKey;
    this.organization = organization;
    this.project = project;
  }
  defaultQuery() {
    return this._options.defaultQuery;
  }
  defaultHeaders(opts) {
    return {
      ...super.defaultHeaders(opts),
      "OpenAI-Organization": this.organization,
      "OpenAI-Project": this.project,
      ...this._options.defaultHeaders
    };
  }
  authHeaders(opts) {
    return { Authorization: `Bearer ${this.apiKey}` };
  }
  stringifyQuery(query) {
    return stringify(query, { arrayFormat: "brackets" });
  }
};
_a = OpenAI;
OpenAI.OpenAI = _a;
OpenAI.DEFAULT_TIMEOUT = 6e5;
OpenAI.OpenAIError = OpenAIError;
OpenAI.APIError = APIError;
OpenAI.APIConnectionError = APIConnectionError;
OpenAI.APIConnectionTimeoutError = APIConnectionTimeoutError;
OpenAI.APIUserAbortError = APIUserAbortError;
OpenAI.NotFoundError = NotFoundError;
OpenAI.ConflictError = ConflictError;
OpenAI.RateLimitError = RateLimitError;
OpenAI.BadRequestError = BadRequestError;
OpenAI.AuthenticationError = AuthenticationError;
OpenAI.InternalServerError = InternalServerError;
OpenAI.PermissionDeniedError = PermissionDeniedError;
OpenAI.UnprocessableEntityError = UnprocessableEntityError;
OpenAI.toFile = toFile;
OpenAI.fileFromPath = fileFromPath;
OpenAI.Completions = Completions3;
OpenAI.Chat = Chat;
OpenAI.ChatCompletionsPage = ChatCompletionsPage;
OpenAI.Embeddings = Embeddings;
OpenAI.Files = Files2;
OpenAI.FileObjectsPage = FileObjectsPage;
OpenAI.Images = Images;
OpenAI.Audio = Audio;
OpenAI.Moderations = Moderations;
OpenAI.Models = Models;
OpenAI.ModelsPage = ModelsPage;
OpenAI.FineTuning = FineTuning;
OpenAI.Graders = Graders2;
OpenAI.VectorStores = VectorStores;
OpenAI.VectorStoresPage = VectorStoresPage;
OpenAI.VectorStoreSearchResponsesPage = VectorStoreSearchResponsesPage;
OpenAI.Beta = Beta;
OpenAI.Batches = Batches;
OpenAI.BatchesPage = BatchesPage;
OpenAI.Uploads = Uploads;
OpenAI.Responses = Responses;
OpenAI.Evals = Evals;
OpenAI.EvalListResponsesPage = EvalListResponsesPage;
OpenAI.Containers = Containers;
OpenAI.ContainerListResponsesPage = ContainerListResponsesPage;
var AzureOpenAI = class extends OpenAI {
  /**
   * API Client for interfacing with the Azure OpenAI API.
   *
   * @param {string | undefined} [opts.apiVersion=process.env['OPENAI_API_VERSION'] ?? undefined]
   * @param {string | undefined} [opts.endpoint=process.env['AZURE_OPENAI_ENDPOINT'] ?? undefined] - Your Azure endpoint, including the resource, e.g. `https://example-resource.azure.openai.com/`
   * @param {string | undefined} [opts.apiKey=process.env['AZURE_OPENAI_API_KEY'] ?? undefined]
   * @param {string | undefined} opts.deployment - A model deployment, if given, sets the base client URL to include `/deployments/{deployment}`.
   * @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
   * @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL']] - Sets the base URL for the API, e.g. `https://example-resource.azure.openai.com/openai/`.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
   * @param {Core.Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {Core.Headers} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Core.DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({ baseURL = readEnv("OPENAI_BASE_URL"), apiKey = readEnv("AZURE_OPENAI_API_KEY"), apiVersion = readEnv("OPENAI_API_VERSION"), endpoint, deployment, azureADTokenProvider, dangerouslyAllowBrowser, ...opts } = {}) {
    if (!apiVersion) {
      throw new OpenAIError("The OPENAI_API_VERSION environment variable is missing or empty; either provide it, or instantiate the AzureOpenAI client with an apiVersion option, like new AzureOpenAI({ apiVersion: 'My API Version' }).");
    }
    if (typeof azureADTokenProvider === "function") {
      dangerouslyAllowBrowser = true;
    }
    if (!azureADTokenProvider && !apiKey) {
      throw new OpenAIError("Missing credentials. Please pass one of `apiKey` and `azureADTokenProvider`, or set the `AZURE_OPENAI_API_KEY` environment variable.");
    }
    if (azureADTokenProvider && apiKey) {
      throw new OpenAIError("The `apiKey` and `azureADTokenProvider` arguments are mutually exclusive; only one can be passed at a time.");
    }
    apiKey ?? (apiKey = API_KEY_SENTINEL);
    opts.defaultQuery = { ...opts.defaultQuery, "api-version": apiVersion };
    if (!baseURL) {
      if (!endpoint) {
        endpoint = process.env["AZURE_OPENAI_ENDPOINT"];
      }
      if (!endpoint) {
        throw new OpenAIError("Must provide one of the `baseURL` or `endpoint` arguments, or the `AZURE_OPENAI_ENDPOINT` environment variable");
      }
      baseURL = `${endpoint}/openai`;
    } else {
      if (endpoint) {
        throw new OpenAIError("baseURL and endpoint are mutually exclusive");
      }
    }
    super({
      apiKey,
      baseURL,
      ...opts,
      ...dangerouslyAllowBrowser !== void 0 ? { dangerouslyAllowBrowser } : {}
    });
    this.apiVersion = "";
    this._azureADTokenProvider = azureADTokenProvider;
    this.apiVersion = apiVersion;
    this.deploymentName = deployment;
  }
  buildRequest(options, props = {}) {
    var _a2;
    if (_deployments_endpoints.has(options.path) && options.method === "post" && options.body !== void 0) {
      if (!isObj(options.body)) {
        throw new Error("Expected request body to be an object");
      }
      const model = this.deploymentName || options.body["model"] || ((_a2 = options.__metadata) == null ? void 0 : _a2["model"]);
      if (model !== void 0 && !this.baseURL.includes("/deployments")) {
        options.path = `/deployments/${model}${options.path}`;
      }
    }
    return super.buildRequest(options, props);
  }
  async _getAzureADToken() {
    if (typeof this._azureADTokenProvider === "function") {
      const token = await this._azureADTokenProvider();
      if (!token || typeof token !== "string") {
        throw new OpenAIError(`Expected 'azureADTokenProvider' argument to return a string but it returned ${token}`);
      }
      return token;
    }
    return void 0;
  }
  authHeaders(opts) {
    return {};
  }
  async prepareOptions(opts) {
    var _a2;
    if ((_a2 = opts.headers) == null ? void 0 : _a2["api-key"]) {
      return super.prepareOptions(opts);
    }
    const token = await this._getAzureADToken();
    opts.headers ?? (opts.headers = {});
    if (token) {
      opts.headers["Authorization"] = `Bearer ${token}`;
    } else if (this.apiKey !== API_KEY_SENTINEL) {
      opts.headers["api-key"] = this.apiKey;
    } else {
      throw new OpenAIError("Unable to handle auth");
    }
    return super.prepareOptions(opts);
  }
};
var _deployments_endpoints = /* @__PURE__ */ new Set([
  "/completions",
  "/chat/completions",
  "/embeddings",
  "/audio/transcriptions",
  "/audio/translations",
  "/audio/speech",
  "/images/generations",
  "/images/edits"
]);
var API_KEY_SENTINEL = "<Missing Key>";

// node_modules/@langchain/core/dist/utils/js-sha1/hash.js
var root = typeof window === "object" ? window : {};
var HEX_CHARS = "0123456789abcdef".split("");
var EXTRA = [-2147483648, 8388608, 32768, 128];
var SHIFT = [24, 16, 8, 0];
var blocks = [];
function Sha1(sharedMemory) {
  if (sharedMemory) {
    blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
    this.blocks = blocks;
  } else {
    this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  this.h0 = 1732584193;
  this.h1 = 4023233417;
  this.h2 = 2562383102;
  this.h3 = 271733878;
  this.h4 = 3285377520;
  this.block = this.start = this.bytes = this.hBytes = 0;
  this.finalized = this.hashed = false;
  this.first = true;
}
Sha1.prototype.update = function(message) {
  if (this.finalized) {
    return;
  }
  var notString = typeof message !== "string";
  if (notString && message.constructor === root.ArrayBuffer) {
    message = new Uint8Array(message);
  }
  var code, index = 0, i, length = message.length || 0, blocks2 = this.blocks;
  while (index < length) {
    if (this.hashed) {
      this.hashed = false;
      blocks2[0] = this.block;
      blocks2[16] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = 0;
    }
    if (notString) {
      for (i = this.start; index < length && i < 64; ++index) {
        blocks2[i >> 2] |= message[index] << SHIFT[i++ & 3];
      }
    } else {
      for (i = this.start; index < length && i < 64; ++index) {
        code = message.charCodeAt(index);
        if (code < 128) {
          blocks2[i >> 2] |= code << SHIFT[i++ & 3];
        } else if (code < 2048) {
          blocks2[i >> 2] |= (192 | code >> 6) << SHIFT[i++ & 3];
          blocks2[i >> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
        } else if (code < 55296 || code >= 57344) {
          blocks2[i >> 2] |= (224 | code >> 12) << SHIFT[i++ & 3];
          blocks2[i >> 2] |= (128 | code >> 6 & 63) << SHIFT[i++ & 3];
          blocks2[i >> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
        } else {
          code = 65536 + ((code & 1023) << 10 | message.charCodeAt(++index) & 1023);
          blocks2[i >> 2] |= (240 | code >> 18) << SHIFT[i++ & 3];
          blocks2[i >> 2] |= (128 | code >> 12 & 63) << SHIFT[i++ & 3];
          blocks2[i >> 2] |= (128 | code >> 6 & 63) << SHIFT[i++ & 3];
          blocks2[i >> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
        }
      }
    }
    this.lastByteIndex = i;
    this.bytes += i - this.start;
    if (i >= 64) {
      this.block = blocks2[16];
      this.start = i - 64;
      this.hash();
      this.hashed = true;
    } else {
      this.start = i;
    }
  }
  if (this.bytes > 4294967295) {
    this.hBytes += this.bytes / 4294967296 << 0;
    this.bytes = this.bytes % 4294967296;
  }
  return this;
};
Sha1.prototype.finalize = function() {
  if (this.finalized) {
    return;
  }
  this.finalized = true;
  var blocks2 = this.blocks, i = this.lastByteIndex;
  blocks2[16] = this.block;
  blocks2[i >> 2] |= EXTRA[i & 3];
  this.block = blocks2[16];
  if (i >= 56) {
    if (!this.hashed) {
      this.hash();
    }
    blocks2[0] = this.block;
    blocks2[16] = blocks2[1] = blocks2[2] = blocks2[3] = blocks2[4] = blocks2[5] = blocks2[6] = blocks2[7] = blocks2[8] = blocks2[9] = blocks2[10] = blocks2[11] = blocks2[12] = blocks2[13] = blocks2[14] = blocks2[15] = 0;
  }
  blocks2[14] = this.hBytes << 3 | this.bytes >>> 29;
  blocks2[15] = this.bytes << 3;
  this.hash();
};
Sha1.prototype.hash = function() {
  var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4;
  var f, j, t, blocks2 = this.blocks;
  for (j = 16; j < 80; ++j) {
    t = blocks2[j - 3] ^ blocks2[j - 8] ^ blocks2[j - 14] ^ blocks2[j - 16];
    blocks2[j] = t << 1 | t >>> 31;
  }
  for (j = 0; j < 20; j += 5) {
    f = b & c | ~b & d;
    t = a << 5 | a >>> 27;
    e = t + f + e + 1518500249 + blocks2[j] << 0;
    b = b << 30 | b >>> 2;
    f = a & b | ~a & c;
    t = e << 5 | e >>> 27;
    d = t + f + d + 1518500249 + blocks2[j + 1] << 0;
    a = a << 30 | a >>> 2;
    f = e & a | ~e & b;
    t = d << 5 | d >>> 27;
    c = t + f + c + 1518500249 + blocks2[j + 2] << 0;
    e = e << 30 | e >>> 2;
    f = d & e | ~d & a;
    t = c << 5 | c >>> 27;
    b = t + f + b + 1518500249 + blocks2[j + 3] << 0;
    d = d << 30 | d >>> 2;
    f = c & d | ~c & e;
    t = b << 5 | b >>> 27;
    a = t + f + a + 1518500249 + blocks2[j + 4] << 0;
    c = c << 30 | c >>> 2;
  }
  for (; j < 40; j += 5) {
    f = b ^ c ^ d;
    t = a << 5 | a >>> 27;
    e = t + f + e + 1859775393 + blocks2[j] << 0;
    b = b << 30 | b >>> 2;
    f = a ^ b ^ c;
    t = e << 5 | e >>> 27;
    d = t + f + d + 1859775393 + blocks2[j + 1] << 0;
    a = a << 30 | a >>> 2;
    f = e ^ a ^ b;
    t = d << 5 | d >>> 27;
    c = t + f + c + 1859775393 + blocks2[j + 2] << 0;
    e = e << 30 | e >>> 2;
    f = d ^ e ^ a;
    t = c << 5 | c >>> 27;
    b = t + f + b + 1859775393 + blocks2[j + 3] << 0;
    d = d << 30 | d >>> 2;
    f = c ^ d ^ e;
    t = b << 5 | b >>> 27;
    a = t + f + a + 1859775393 + blocks2[j + 4] << 0;
    c = c << 30 | c >>> 2;
  }
  for (; j < 60; j += 5) {
    f = b & c | b & d | c & d;
    t = a << 5 | a >>> 27;
    e = t + f + e - 1894007588 + blocks2[j] << 0;
    b = b << 30 | b >>> 2;
    f = a & b | a & c | b & c;
    t = e << 5 | e >>> 27;
    d = t + f + d - 1894007588 + blocks2[j + 1] << 0;
    a = a << 30 | a >>> 2;
    f = e & a | e & b | a & b;
    t = d << 5 | d >>> 27;
    c = t + f + c - 1894007588 + blocks2[j + 2] << 0;
    e = e << 30 | e >>> 2;
    f = d & e | d & a | e & a;
    t = c << 5 | c >>> 27;
    b = t + f + b - 1894007588 + blocks2[j + 3] << 0;
    d = d << 30 | d >>> 2;
    f = c & d | c & e | d & e;
    t = b << 5 | b >>> 27;
    a = t + f + a - 1894007588 + blocks2[j + 4] << 0;
    c = c << 30 | c >>> 2;
  }
  for (; j < 80; j += 5) {
    f = b ^ c ^ d;
    t = a << 5 | a >>> 27;
    e = t + f + e - 899497514 + blocks2[j] << 0;
    b = b << 30 | b >>> 2;
    f = a ^ b ^ c;
    t = e << 5 | e >>> 27;
    d = t + f + d - 899497514 + blocks2[j + 1] << 0;
    a = a << 30 | a >>> 2;
    f = e ^ a ^ b;
    t = d << 5 | d >>> 27;
    c = t + f + c - 899497514 + blocks2[j + 2] << 0;
    e = e << 30 | e >>> 2;
    f = d ^ e ^ a;
    t = c << 5 | c >>> 27;
    b = t + f + b - 899497514 + blocks2[j + 3] << 0;
    d = d << 30 | d >>> 2;
    f = c ^ d ^ e;
    t = b << 5 | b >>> 27;
    a = t + f + a - 899497514 + blocks2[j + 4] << 0;
    c = c << 30 | c >>> 2;
  }
  this.h0 = this.h0 + a << 0;
  this.h1 = this.h1 + b << 0;
  this.h2 = this.h2 + c << 0;
  this.h3 = this.h3 + d << 0;
  this.h4 = this.h4 + e << 0;
};
Sha1.prototype.hex = function() {
  this.finalize();
  var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4;
  return HEX_CHARS[h0 >> 28 & 15] + HEX_CHARS[h0 >> 24 & 15] + HEX_CHARS[h0 >> 20 & 15] + HEX_CHARS[h0 >> 16 & 15] + HEX_CHARS[h0 >> 12 & 15] + HEX_CHARS[h0 >> 8 & 15] + HEX_CHARS[h0 >> 4 & 15] + HEX_CHARS[h0 & 15] + HEX_CHARS[h1 >> 28 & 15] + HEX_CHARS[h1 >> 24 & 15] + HEX_CHARS[h1 >> 20 & 15] + HEX_CHARS[h1 >> 16 & 15] + HEX_CHARS[h1 >> 12 & 15] + HEX_CHARS[h1 >> 8 & 15] + HEX_CHARS[h1 >> 4 & 15] + HEX_CHARS[h1 & 15] + HEX_CHARS[h2 >> 28 & 15] + HEX_CHARS[h2 >> 24 & 15] + HEX_CHARS[h2 >> 20 & 15] + HEX_CHARS[h2 >> 16 & 15] + HEX_CHARS[h2 >> 12 & 15] + HEX_CHARS[h2 >> 8 & 15] + HEX_CHARS[h2 >> 4 & 15] + HEX_CHARS[h2 & 15] + HEX_CHARS[h3 >> 28 & 15] + HEX_CHARS[h3 >> 24 & 15] + HEX_CHARS[h3 >> 20 & 15] + HEX_CHARS[h3 >> 16 & 15] + HEX_CHARS[h3 >> 12 & 15] + HEX_CHARS[h3 >> 8 & 15] + HEX_CHARS[h3 >> 4 & 15] + HEX_CHARS[h3 & 15] + HEX_CHARS[h4 >> 28 & 15] + HEX_CHARS[h4 >> 24 & 15] + HEX_CHARS[h4 >> 20 & 15] + HEX_CHARS[h4 >> 16 & 15] + HEX_CHARS[h4 >> 12 & 15] + HEX_CHARS[h4 >> 8 & 15] + HEX_CHARS[h4 >> 4 & 15] + HEX_CHARS[h4 & 15];
};
Sha1.prototype.toString = Sha1.prototype.hex;
Sha1.prototype.digest = function() {
  this.finalize();
  var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4;
  return [
    h0 >> 24 & 255,
    h0 >> 16 & 255,
    h0 >> 8 & 255,
    h0 & 255,
    h1 >> 24 & 255,
    h1 >> 16 & 255,
    h1 >> 8 & 255,
    h1 & 255,
    h2 >> 24 & 255,
    h2 >> 16 & 255,
    h2 >> 8 & 255,
    h2 & 255,
    h3 >> 24 & 255,
    h3 >> 16 & 255,
    h3 >> 8 & 255,
    h3 & 255,
    h4 >> 24 & 255,
    h4 >> 16 & 255,
    h4 >> 8 & 255,
    h4 & 255
  ];
};
Sha1.prototype.array = Sha1.prototype.digest;
Sha1.prototype.arrayBuffer = function() {
  this.finalize();
  var buffer = new ArrayBuffer(20);
  var dataView = new DataView(buffer);
  dataView.setUint32(0, this.h0);
  dataView.setUint32(4, this.h1);
  dataView.setUint32(8, this.h2);
  dataView.setUint32(12, this.h3);
  dataView.setUint32(16, this.h4);
  return buffer;
};
var insecureHash = (message) => {
  return new Sha1(true).update(message)["hex"]();
};

// node_modules/@langchain/core/dist/caches/base.js
var getCacheKey = (...strings) => insecureHash(strings.join("_"));
var BaseCache = class {
};
var GLOBAL_MAP = /* @__PURE__ */ new Map();
var InMemoryCache = class _InMemoryCache extends BaseCache {
  constructor(map) {
    super();
    Object.defineProperty(this, "cache", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.cache = map ?? /* @__PURE__ */ new Map();
  }
  /**
   * Retrieves data from the cache using a prompt and an LLM key. If the
   * data is not found, it returns null.
   * @param prompt The prompt used to find the data.
   * @param llmKey The LLM key used to find the data.
   * @returns The data corresponding to the prompt and LLM key, or null if not found.
   */
  lookup(prompt, llmKey) {
    return Promise.resolve(this.cache.get(getCacheKey(prompt, llmKey)) ?? null);
  }
  /**
   * Updates the cache with new data using a prompt and an LLM key.
   * @param prompt The prompt used to store the data.
   * @param llmKey The LLM key used to store the data.
   * @param value The data to be stored.
   */
  async update(prompt, llmKey, value) {
    this.cache.set(getCacheKey(prompt, llmKey), value);
  }
  /**
   * Returns a global instance of InMemoryCache using a predefined global
   * map as the initial cache.
   * @returns A global instance of InMemoryCache.
   */
  static global() {
    return new _InMemoryCache(GLOBAL_MAP);
  }
};

// node_modules/js-tiktoken/dist/chunk-ZDNLBERF.js
var import_base64_js = __toESM(require_base64_js(), 1);
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField2 = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
function bytePairMerge(piece, ranks) {
  let parts = Array.from(
    { length: piece.length },
    (_, i) => ({ start: i, end: i + 1 })
  );
  while (parts.length > 1) {
    let minRank = null;
    for (let i = 0; i < parts.length - 1; i++) {
      const slice = piece.slice(parts[i].start, parts[i + 1].end);
      const rank = ranks.get(slice.join(","));
      if (rank == null)
        continue;
      if (minRank == null || rank < minRank[0]) {
        minRank = [rank, i];
      }
    }
    if (minRank != null) {
      const i = minRank[1];
      parts[i] = { start: parts[i].start, end: parts[i + 1].end };
      parts.splice(i + 1, 1);
    } else {
      break;
    }
  }
  return parts;
}
function bytePairEncode(piece, ranks) {
  if (piece.length === 1)
    return [ranks.get(piece.join(","))];
  return bytePairMerge(piece, ranks).map((p) => ranks.get(piece.slice(p.start, p.end).join(","))).filter((x) => x != null);
}
function escapeRegex(str2) {
  return str2.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&");
}
var _Tiktoken = class {
  constructor(ranks, extendedSpecialTokens) {
    /** @internal */
    __publicField(this, "specialTokens");
    /** @internal */
    __publicField(this, "inverseSpecialTokens");
    /** @internal */
    __publicField(this, "patStr");
    /** @internal */
    __publicField(this, "textEncoder", new TextEncoder());
    /** @internal */
    __publicField(this, "textDecoder", new TextDecoder("utf-8"));
    /** @internal */
    __publicField(this, "rankMap", /* @__PURE__ */ new Map());
    /** @internal */
    __publicField(this, "textMap", /* @__PURE__ */ new Map());
    this.patStr = ranks.pat_str;
    const uncompressed = ranks.bpe_ranks.split("\n").filter(Boolean).reduce((memo, x) => {
      const [_, offsetStr, ...tokens] = x.split(" ");
      const offset = Number.parseInt(offsetStr, 10);
      tokens.forEach((token, i) => memo[token] = offset + i);
      return memo;
    }, {});
    for (const [token, rank] of Object.entries(uncompressed)) {
      const bytes = import_base64_js.default.toByteArray(token);
      this.rankMap.set(bytes.join(","), rank);
      this.textMap.set(rank, bytes);
    }
    this.specialTokens = { ...ranks.special_tokens, ...extendedSpecialTokens };
    this.inverseSpecialTokens = Object.entries(this.specialTokens).reduce((memo, [text, rank]) => {
      memo[rank] = this.textEncoder.encode(text);
      return memo;
    }, {});
  }
  encode(text, allowedSpecial = [], disallowedSpecial = "all") {
    const regexes = new RegExp(this.patStr, "ug");
    const specialRegex = _Tiktoken.specialTokenRegex(
      Object.keys(this.specialTokens)
    );
    const ret = [];
    const allowedSpecialSet = new Set(
      allowedSpecial === "all" ? Object.keys(this.specialTokens) : allowedSpecial
    );
    const disallowedSpecialSet = new Set(
      disallowedSpecial === "all" ? Object.keys(this.specialTokens).filter(
        (x) => !allowedSpecialSet.has(x)
      ) : disallowedSpecial
    );
    if (disallowedSpecialSet.size > 0) {
      const disallowedSpecialRegex = _Tiktoken.specialTokenRegex([
        ...disallowedSpecialSet
      ]);
      const specialMatch = text.match(disallowedSpecialRegex);
      if (specialMatch != null) {
        throw new Error(
          `The text contains a special token that is not allowed: ${specialMatch[0]}`
        );
      }
    }
    let start = 0;
    while (true) {
      let nextSpecial = null;
      let startFind = start;
      while (true) {
        specialRegex.lastIndex = startFind;
        nextSpecial = specialRegex.exec(text);
        if (nextSpecial == null || allowedSpecialSet.has(nextSpecial[0]))
          break;
        startFind = nextSpecial.index + 1;
      }
      const end = (nextSpecial == null ? void 0 : nextSpecial.index) ?? text.length;
      for (const match of text.substring(start, end).matchAll(regexes)) {
        const piece = this.textEncoder.encode(match[0]);
        const token2 = this.rankMap.get(piece.join(","));
        if (token2 != null) {
          ret.push(token2);
          continue;
        }
        ret.push(...bytePairEncode(piece, this.rankMap));
      }
      if (nextSpecial == null)
        break;
      let token = this.specialTokens[nextSpecial[0]];
      ret.push(token);
      start = nextSpecial.index + nextSpecial[0].length;
    }
    return ret;
  }
  decode(tokens) {
    const res = [];
    let length = 0;
    for (let i2 = 0; i2 < tokens.length; ++i2) {
      const token = tokens[i2];
      const bytes = this.textMap.get(token) ?? this.inverseSpecialTokens[token];
      if (bytes != null) {
        res.push(bytes);
        length += bytes.length;
      }
    }
    const mergedArray = new Uint8Array(length);
    let i = 0;
    for (const bytes of res) {
      mergedArray.set(bytes, i);
      i += bytes.length;
    }
    return this.textDecoder.decode(mergedArray);
  }
};
var Tiktoken = _Tiktoken;
__publicField2(Tiktoken, "specialTokenRegex", (tokens) => {
  return new RegExp(tokens.map((i) => escapeRegex(i)).join("|"), "g");
});
function getEncodingNameForModel(model) {
  switch (model) {
    case "gpt2": {
      return "gpt2";
    }
    case "code-cushman-001":
    case "code-cushman-002":
    case "code-davinci-001":
    case "code-davinci-002":
    case "cushman-codex":
    case "davinci-codex":
    case "davinci-002":
    case "text-davinci-002":
    case "text-davinci-003": {
      return "p50k_base";
    }
    case "code-davinci-edit-001":
    case "text-davinci-edit-001": {
      return "p50k_edit";
    }
    case "ada":
    case "babbage":
    case "babbage-002":
    case "code-search-ada-code-001":
    case "code-search-babbage-code-001":
    case "curie":
    case "davinci":
    case "text-ada-001":
    case "text-babbage-001":
    case "text-curie-001":
    case "text-davinci-001":
    case "text-search-ada-doc-001":
    case "text-search-babbage-doc-001":
    case "text-search-curie-doc-001":
    case "text-search-davinci-doc-001":
    case "text-similarity-ada-001":
    case "text-similarity-babbage-001":
    case "text-similarity-curie-001":
    case "text-similarity-davinci-001": {
      return "r50k_base";
    }
    case "gpt-3.5-turbo-instruct-0914":
    case "gpt-3.5-turbo-instruct":
    case "gpt-3.5-turbo-16k-0613":
    case "gpt-3.5-turbo-16k":
    case "gpt-3.5-turbo-0613":
    case "gpt-3.5-turbo-0301":
    case "gpt-3.5-turbo":
    case "gpt-4-32k-0613":
    case "gpt-4-32k-0314":
    case "gpt-4-32k":
    case "gpt-4-0613":
    case "gpt-4-0314":
    case "gpt-4":
    case "gpt-3.5-turbo-1106":
    case "gpt-35-turbo":
    case "gpt-4-1106-preview":
    case "gpt-4-vision-preview":
    case "gpt-3.5-turbo-0125":
    case "gpt-4-turbo":
    case "gpt-4-turbo-2024-04-09":
    case "gpt-4-turbo-preview":
    case "gpt-4-0125-preview":
    case "text-embedding-ada-002":
    case "text-embedding-3-small":
    case "text-embedding-3-large": {
      return "cl100k_base";
    }
    case "gpt-4o":
    case "gpt-4o-2024-05-13":
    case "gpt-4o-2024-08-06":
    case "gpt-4o-2024-11-20":
    case "gpt-4o-mini-2024-07-18":
    case "gpt-4o-mini":
    case "gpt-4o-search-preview":
    case "gpt-4o-search-preview-2025-03-11":
    case "gpt-4o-mini-search-preview":
    case "gpt-4o-mini-search-preview-2025-03-11":
    case "gpt-4o-audio-preview":
    case "gpt-4o-audio-preview-2024-12-17":
    case "gpt-4o-audio-preview-2024-10-01":
    case "gpt-4o-mini-audio-preview":
    case "gpt-4o-mini-audio-preview-2024-12-17":
    case "o1":
    case "o1-2024-12-17":
    case "o1-mini":
    case "o1-mini-2024-09-12":
    case "o1-preview":
    case "o1-preview-2024-09-12":
    case "o1-pro":
    case "o1-pro-2025-03-19":
    case "o3":
    case "o3-2025-04-16":
    case "o3-mini":
    case "o3-mini-2025-01-31":
    case "o4-mini":
    case "o4-mini-2025-04-16":
    case "chatgpt-4o-latest":
    case "gpt-4o-realtime":
    case "gpt-4o-realtime-preview-2024-10-01":
    case "gpt-4o-realtime-preview-2024-12-17":
    case "gpt-4o-mini-realtime-preview":
    case "gpt-4o-mini-realtime-preview-2024-12-17":
    case "gpt-4.1":
    case "gpt-4.1-2025-04-14":
    case "gpt-4.1-mini":
    case "gpt-4.1-mini-2025-04-14":
    case "gpt-4.1-nano":
    case "gpt-4.1-nano-2025-04-14":
    case "gpt-4.5-preview":
    case "gpt-4.5-preview-2025-02-27": {
      return "o200k_base";
    }
    default:
      throw new Error("Unknown model");
  }
}

// node_modules/@langchain/core/dist/utils/tiktoken.js
var cache = {};
var caller = new AsyncCaller({});
async function getEncoding(encoding) {
  if (!(encoding in cache)) {
    cache[encoding] = caller.fetch(`https://tiktoken.pages.dev/js/${encoding}.json`).then((res) => res.json()).then((data) => new Tiktoken(data)).catch((e) => {
      delete cache[encoding];
      throw e;
    });
  }
  return await cache[encoding];
}
async function encodingForModel(model) {
  return getEncoding(getEncodingNameForModel(model));
}

// node_modules/@langchain/core/dist/language_models/base.js
var getModelNameForTiktoken = (modelName) => {
  if (modelName.startsWith("gpt-3.5-turbo-16k")) {
    return "gpt-3.5-turbo-16k";
  }
  if (modelName.startsWith("gpt-3.5-turbo-")) {
    return "gpt-3.5-turbo";
  }
  if (modelName.startsWith("gpt-4-32k")) {
    return "gpt-4-32k";
  }
  if (modelName.startsWith("gpt-4-")) {
    return "gpt-4";
  }
  if (modelName.startsWith("gpt-4o")) {
    return "gpt-4o";
  }
  return modelName;
};
var getModelContextSize = (modelName) => {
  switch (getModelNameForTiktoken(modelName)) {
    case "gpt-3.5-turbo-16k":
      return 16384;
    case "gpt-3.5-turbo":
      return 4096;
    case "gpt-4-32k":
      return 32768;
    case "gpt-4":
      return 8192;
    case "text-davinci-003":
      return 4097;
    case "text-curie-001":
      return 2048;
    case "text-babbage-001":
      return 2048;
    case "text-ada-001":
      return 2048;
    case "code-davinci-002":
      return 8e3;
    case "code-cushman-001":
      return 2048;
    default:
      return 4097;
  }
};
function isOpenAITool(tool) {
  if (typeof tool !== "object" || !tool)
    return false;
  if ("type" in tool && tool.type === "function" && "function" in tool && typeof tool.function === "object" && tool.function && "name" in tool.function && "parameters" in tool.function) {
    return true;
  }
  return false;
}
var calculateMaxTokens = async ({ prompt, modelName }) => {
  let numTokens;
  try {
    numTokens = (await encodingForModel(getModelNameForTiktoken(modelName))).encode(prompt).length;
  } catch (error) {
    console.warn("Failed to calculate number of tokens, falling back to approximate count");
    numTokens = Math.ceil(prompt.length / 4);
  }
  const maxTokens = getModelContextSize(modelName);
  return maxTokens - numTokens;
};
var getVerbosity = () => false;
var BaseLangChain = class extends Runnable {
  get lc_attributes() {
    return {
      callbacks: void 0,
      verbose: void 0
    };
  }
  constructor(params) {
    super(params);
    Object.defineProperty(this, "verbose", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "callbacks", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "tags", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "metadata", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.verbose = params.verbose ?? getVerbosity();
    this.callbacks = params.callbacks;
    this.tags = params.tags ?? [];
    this.metadata = params.metadata ?? {};
  }
};
var BaseLanguageModel = class extends BaseLangChain {
  /**
   * Keys that the language model accepts as call options.
   */
  get callKeys() {
    return ["stop", "timeout", "signal", "tags", "metadata", "callbacks"];
  }
  constructor({ callbacks, callbackManager, ...params }) {
    const { cache: cache2, ...rest } = params;
    super({
      callbacks: callbacks ?? callbackManager,
      ...rest
    });
    Object.defineProperty(this, "caller", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "cache", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "_encoding", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    if (typeof cache2 === "object") {
      this.cache = cache2;
    } else if (cache2) {
      this.cache = InMemoryCache.global();
    } else {
      this.cache = void 0;
    }
    this.caller = new AsyncCaller(params ?? {});
  }
  async getNumTokens(content) {
    if (typeof content !== "string") {
      return 0;
    }
    let numTokens = Math.ceil(content.length / 4);
    if (!this._encoding) {
      try {
        this._encoding = await encodingForModel("modelName" in this ? getModelNameForTiktoken(this.modelName) : "gpt2");
      } catch (error) {
        console.warn("Failed to calculate number of tokens, falling back to approximate count", error);
      }
    }
    if (this._encoding) {
      try {
        numTokens = this._encoding.encode(content).length;
      } catch (error) {
        console.warn("Failed to calculate number of tokens, falling back to approximate count", error);
      }
    }
    return numTokens;
  }
  static _convertInputToPromptValue(input) {
    if (typeof input === "string") {
      return new StringPromptValue(input);
    } else if (Array.isArray(input)) {
      return new ChatPromptValue(input.map(coerceMessageLikeToMessage));
    } else {
      return input;
    }
  }
  /**
   * Get the identifying parameters of the LLM.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _identifyingParams() {
    return {};
  }
  /**
   * Create a unique cache key for a specific call to a specific language model.
   * @param callOptions Call options for the model
   * @returns A unique cache key.
   */
  _getSerializedCacheKeyParametersForCall({ config, ...callOptions }) {
    const params = {
      ...this._identifyingParams(),
      ...callOptions,
      _type: this._llmType(),
      _model: this._modelType()
    };
    const filteredEntries = Object.entries(params).filter(([_, value]) => value !== void 0);
    const serializedEntries = filteredEntries.map(([key, value]) => `${key}:${JSON.stringify(value)}`).sort().join(",");
    return serializedEntries;
  }
  /**
   * @deprecated
   * Return a json-like object representing this LLM.
   */
  serialize() {
    return {
      ...this._identifyingParams(),
      _type: this._llmType(),
      _model: this._modelType()
    };
  }
  /**
   * @deprecated
   * Load an LLM from a json-like object describing it.
   */
  static async deserialize(_data) {
    throw new Error("Use .toJSON() instead");
  }
};

// node_modules/@langchain/core/dist/utils/types/is_zod_schema.js
function isZodSchema(input) {
  var _a2;
  if (!input) {
    return false;
  }
  if (typeof input !== "object") {
    return false;
  }
  if (Array.isArray(input)) {
    return false;
  }
  const asZodSchema = input;
  if (asZodSchema._def) {
    return true;
  }
  const zodFirstPartyTypeKinds = Object.values(external_exports.ZodFirstPartyTypeKind);
  if (zodFirstPartyTypeKinds.includes(((_a2 = asZodSchema.constructor) == null ? void 0 : _a2.name) ?? "NOT_INCLUDED")) {
    return true;
  }
  return typeof asZodSchema.parse === "function" && typeof asZodSchema.parseAsync === "function" && typeof asZodSchema.safeParse === "function" && typeof asZodSchema.safeParseAsync === "function";
}

// node_modules/@langchain/core/dist/language_models/chat_models.js
function _formatForTracing(messages) {
  const messagesToTrace = [];
  for (const message of messages) {
    let messageToTrace = message;
    if (Array.isArray(message.content)) {
      for (let idx = 0; idx < message.content.length; idx++) {
        const block = message.content[idx];
        if (isURLContentBlock(block) || isBase64ContentBlock(block)) {
          if (messageToTrace === message) {
            messageToTrace = new message.constructor({
              ...messageToTrace,
              content: [
                ...message.content.slice(0, idx),
                convertToOpenAIImageBlock(block),
                ...message.content.slice(idx + 1)
              ]
            });
          }
        }
      }
    }
    messagesToTrace.push(messageToTrace);
  }
  return messagesToTrace;
}
var BaseChatModel = class _BaseChatModel extends BaseLanguageModel {
  constructor(fields) {
    super(fields);
    Object.defineProperty(this, "lc_namespace", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: ["langchain", "chat_models", this._llmType()]
    });
    Object.defineProperty(this, "disableStreaming", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: false
    });
  }
  _separateRunnableConfigFromCallOptionsCompat(options) {
    const [runnableConfig, callOptions] = super._separateRunnableConfigFromCallOptions(options);
    callOptions.signal = runnableConfig.signal;
    return [runnableConfig, callOptions];
  }
  /**
   * Invokes the chat model with a single input.
   * @param input The input for the language model.
   * @param options The call options.
   * @returns A Promise that resolves to a BaseMessageChunk.
   */
  async invoke(input, options) {
    const promptValue = _BaseChatModel._convertInputToPromptValue(input);
    const result = await this.generatePrompt([promptValue], options, options == null ? void 0 : options.callbacks);
    const chatGeneration = result.generations[0][0];
    return chatGeneration.message;
  }
  // eslint-disable-next-line require-yield
  async *_streamResponseChunks(_messages, _options, _runManager) {
    throw new Error("Not implemented.");
  }
  async *_streamIterator(input, options) {
    var _a2;
    if (this._streamResponseChunks === _BaseChatModel.prototype._streamResponseChunks || this.disableStreaming) {
      yield this.invoke(input, options);
    } else {
      const prompt = _BaseChatModel._convertInputToPromptValue(input);
      const messages = prompt.toChatMessages();
      const [runnableConfig, callOptions] = this._separateRunnableConfigFromCallOptionsCompat(options);
      const inheritableMetadata = {
        ...runnableConfig.metadata,
        ...this.getLsParams(callOptions)
      };
      const callbackManager_ = await CallbackManager.configure(runnableConfig.callbacks, this.callbacks, runnableConfig.tags, this.tags, inheritableMetadata, this.metadata, { verbose: this.verbose });
      const extra = {
        options: callOptions,
        invocation_params: this == null ? void 0 : this.invocationParams(callOptions),
        batch_size: 1
      };
      const runManagers = await (callbackManager_ == null ? void 0 : callbackManager_.handleChatModelStart(this.toJSON(), [_formatForTracing(messages)], runnableConfig.runId, void 0, extra, void 0, void 0, runnableConfig.runName));
      let generationChunk;
      let llmOutput;
      try {
        for await (const chunk of this._streamResponseChunks(messages, callOptions, runManagers == null ? void 0 : runManagers[0])) {
          if (chunk.message.id == null) {
            const runId = (_a2 = runManagers == null ? void 0 : runManagers.at(0)) == null ? void 0 : _a2.runId;
            if (runId != null)
              chunk.message._updateId(`run-${runId}`);
          }
          chunk.message.response_metadata = {
            ...chunk.generationInfo,
            ...chunk.message.response_metadata
          };
          yield chunk.message;
          if (!generationChunk) {
            generationChunk = chunk;
          } else {
            generationChunk = generationChunk.concat(chunk);
          }
          if (isAIMessageChunk(chunk.message) && chunk.message.usage_metadata !== void 0) {
            llmOutput = {
              tokenUsage: {
                promptTokens: chunk.message.usage_metadata.input_tokens,
                completionTokens: chunk.message.usage_metadata.output_tokens,
                totalTokens: chunk.message.usage_metadata.total_tokens
              }
            };
          }
        }
      } catch (err) {
        await Promise.all((runManagers ?? []).map((runManager) => runManager == null ? void 0 : runManager.handleLLMError(err)));
        throw err;
      }
      await Promise.all((runManagers ?? []).map((runManager) => runManager == null ? void 0 : runManager.handleLLMEnd({
        // TODO: Remove cast after figuring out inheritance
        generations: [[generationChunk]],
        llmOutput
      })));
    }
  }
  getLsParams(options) {
    const providerName = this.getName().startsWith("Chat") ? this.getName().replace("Chat", "") : this.getName();
    return {
      ls_model_type: "chat",
      ls_stop: options.stop,
      ls_provider: providerName
    };
  }
  /** @ignore */
  async _generateUncached(messages, parsedOptions, handledOptions, startedRunManagers) {
    var _a2, _b;
    const baseMessages = messages.map((messageList) => messageList.map(coerceMessageLikeToMessage));
    let runManagers;
    if (startedRunManagers !== void 0 && startedRunManagers.length === baseMessages.length) {
      runManagers = startedRunManagers;
    } else {
      const inheritableMetadata = {
        ...handledOptions.metadata,
        ...this.getLsParams(parsedOptions)
      };
      const callbackManager_ = await CallbackManager.configure(handledOptions.callbacks, this.callbacks, handledOptions.tags, this.tags, inheritableMetadata, this.metadata, { verbose: this.verbose });
      const extra = {
        options: parsedOptions,
        invocation_params: this == null ? void 0 : this.invocationParams(parsedOptions),
        batch_size: 1
      };
      runManagers = await (callbackManager_ == null ? void 0 : callbackManager_.handleChatModelStart(this.toJSON(), baseMessages.map(_formatForTracing), handledOptions.runId, void 0, extra, void 0, void 0, handledOptions.runName));
    }
    const generations = [];
    const llmOutputs = [];
    const hasStreamingHandler = !!(runManagers == null ? void 0 : runManagers[0].handlers.find(callbackHandlerPrefersStreaming));
    if (hasStreamingHandler && !this.disableStreaming && baseMessages.length === 1 && this._streamResponseChunks !== _BaseChatModel.prototype._streamResponseChunks) {
      try {
        const stream = await this._streamResponseChunks(baseMessages[0], parsedOptions, runManagers == null ? void 0 : runManagers[0]);
        let aggregated;
        let llmOutput;
        for await (const chunk of stream) {
          if (chunk.message.id == null) {
            const runId = (_a2 = runManagers == null ? void 0 : runManagers.at(0)) == null ? void 0 : _a2.runId;
            if (runId != null)
              chunk.message._updateId(`run-${runId}`);
          }
          if (aggregated === void 0) {
            aggregated = chunk;
          } else {
            aggregated = concat(aggregated, chunk);
          }
          if (isAIMessageChunk(chunk.message) && chunk.message.usage_metadata !== void 0) {
            llmOutput = {
              tokenUsage: {
                promptTokens: chunk.message.usage_metadata.input_tokens,
                completionTokens: chunk.message.usage_metadata.output_tokens,
                totalTokens: chunk.message.usage_metadata.total_tokens
              }
            };
          }
        }
        if (aggregated === void 0) {
          throw new Error("Received empty response from chat model call.");
        }
        generations.push([aggregated]);
        await (runManagers == null ? void 0 : runManagers[0].handleLLMEnd({
          generations,
          llmOutput
        }));
      } catch (e) {
        await (runManagers == null ? void 0 : runManagers[0].handleLLMError(e));
        throw e;
      }
    } else {
      const results = await Promise.allSettled(baseMessages.map((messageList, i) => this._generate(messageList, { ...parsedOptions, promptIndex: i }, runManagers == null ? void 0 : runManagers[i])));
      await Promise.all(results.map(async (pResult, i) => {
        var _a3, _b2, _c;
        if (pResult.status === "fulfilled") {
          const result = pResult.value;
          for (const generation of result.generations) {
            if (generation.message.id == null) {
              const runId = (_a3 = runManagers == null ? void 0 : runManagers.at(0)) == null ? void 0 : _a3.runId;
              if (runId != null)
                generation.message._updateId(`run-${runId}`);
            }
            generation.message.response_metadata = {
              ...generation.generationInfo,
              ...generation.message.response_metadata
            };
          }
          if (result.generations.length === 1) {
            result.generations[0].message.response_metadata = {
              ...result.llmOutput,
              ...result.generations[0].message.response_metadata
            };
          }
          generations[i] = result.generations;
          llmOutputs[i] = result.llmOutput;
          return (_b2 = runManagers == null ? void 0 : runManagers[i]) == null ? void 0 : _b2.handleLLMEnd({
            generations: [result.generations],
            llmOutput: result.llmOutput
          });
        } else {
          await ((_c = runManagers == null ? void 0 : runManagers[i]) == null ? void 0 : _c.handleLLMError(pResult.reason));
          return Promise.reject(pResult.reason);
        }
      }));
    }
    const output = {
      generations,
      llmOutput: llmOutputs.length ? (_b = this._combineLLMOutput) == null ? void 0 : _b.call(this, ...llmOutputs) : void 0
    };
    Object.defineProperty(output, RUN_KEY, {
      value: runManagers ? { runIds: runManagers == null ? void 0 : runManagers.map((manager) => manager.runId) } : void 0,
      configurable: true
    });
    return output;
  }
  async _generateCached({ messages, cache: cache2, llmStringKey, parsedOptions, handledOptions }) {
    const baseMessages = messages.map((messageList) => messageList.map(coerceMessageLikeToMessage));
    const inheritableMetadata = {
      ...handledOptions.metadata,
      ...this.getLsParams(parsedOptions)
    };
    const callbackManager_ = await CallbackManager.configure(handledOptions.callbacks, this.callbacks, handledOptions.tags, this.tags, inheritableMetadata, this.metadata, { verbose: this.verbose });
    const extra = {
      options: parsedOptions,
      invocation_params: this == null ? void 0 : this.invocationParams(parsedOptions),
      batch_size: 1
    };
    const runManagers = await (callbackManager_ == null ? void 0 : callbackManager_.handleChatModelStart(this.toJSON(), baseMessages.map(_formatForTracing), handledOptions.runId, void 0, extra, void 0, void 0, handledOptions.runName));
    const missingPromptIndices = [];
    const results = await Promise.allSettled(baseMessages.map(async (baseMessage, index) => {
      const prompt = _BaseChatModel._convertInputToPromptValue(baseMessage).toString();
      const result = await cache2.lookup(prompt, llmStringKey);
      if (result == null) {
        missingPromptIndices.push(index);
      }
      return result;
    }));
    const cachedResults = results.map((result, index) => ({ result, runManager: runManagers == null ? void 0 : runManagers[index] })).filter(({ result }) => result.status === "fulfilled" && result.value != null || result.status === "rejected");
    const generations = [];
    await Promise.all(cachedResults.map(async ({ result: promiseResult, runManager }, i) => {
      if (promiseResult.status === "fulfilled") {
        const result = promiseResult.value;
        generations[i] = result.map((result2) => {
          if ("message" in result2 && isBaseMessage(result2.message) && isAIMessage(result2.message)) {
            result2.message.usage_metadata = {
              input_tokens: 0,
              output_tokens: 0,
              total_tokens: 0
            };
          }
          result2.generationInfo = {
            ...result2.generationInfo,
            tokenUsage: {}
          };
          return result2;
        });
        if (result.length) {
          await (runManager == null ? void 0 : runManager.handleLLMNewToken(result[0].text));
        }
        return runManager == null ? void 0 : runManager.handleLLMEnd({
          generations: [result]
        }, void 0, void 0, void 0, {
          cached: true
        });
      } else {
        await (runManager == null ? void 0 : runManager.handleLLMError(promiseResult.reason, void 0, void 0, void 0, {
          cached: true
        }));
        return Promise.reject(promiseResult.reason);
      }
    }));
    const output = {
      generations,
      missingPromptIndices,
      startedRunManagers: runManagers
    };
    Object.defineProperty(output, RUN_KEY, {
      value: runManagers ? { runIds: runManagers == null ? void 0 : runManagers.map((manager) => manager.runId) } : void 0,
      configurable: true
    });
    return output;
  }
  /**
   * Generates chat based on the input messages.
   * @param messages An array of arrays of BaseMessage instances.
   * @param options The call options or an array of stop sequences.
   * @param callbacks The callbacks for the language model.
   * @returns A Promise that resolves to an LLMResult.
   */
  async generate(messages, options, callbacks) {
    let parsedOptions;
    if (Array.isArray(options)) {
      parsedOptions = { stop: options };
    } else {
      parsedOptions = options;
    }
    const baseMessages = messages.map((messageList) => messageList.map(coerceMessageLikeToMessage));
    const [runnableConfig, callOptions] = this._separateRunnableConfigFromCallOptionsCompat(parsedOptions);
    runnableConfig.callbacks = runnableConfig.callbacks ?? callbacks;
    if (!this.cache) {
      return this._generateUncached(baseMessages, callOptions, runnableConfig);
    }
    const { cache: cache2 } = this;
    const llmStringKey = this._getSerializedCacheKeyParametersForCall(callOptions);
    const { generations, missingPromptIndices, startedRunManagers } = await this._generateCached({
      messages: baseMessages,
      cache: cache2,
      llmStringKey,
      parsedOptions: callOptions,
      handledOptions: runnableConfig
    });
    let llmOutput = {};
    if (missingPromptIndices.length > 0) {
      const results = await this._generateUncached(missingPromptIndices.map((i) => baseMessages[i]), callOptions, runnableConfig, startedRunManagers !== void 0 ? missingPromptIndices.map((i) => startedRunManagers == null ? void 0 : startedRunManagers[i]) : void 0);
      await Promise.all(results.generations.map(async (generation, index) => {
        const promptIndex = missingPromptIndices[index];
        generations[promptIndex] = generation;
        const prompt = _BaseChatModel._convertInputToPromptValue(baseMessages[promptIndex]).toString();
        return cache2.update(prompt, llmStringKey, generation);
      }));
      llmOutput = results.llmOutput ?? {};
    }
    return { generations, llmOutput };
  }
  /**
   * Get the parameters used to invoke the model
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invocationParams(_options) {
    return {};
  }
  _modelType() {
    return "base_chat_model";
  }
  /**
   * @deprecated
   * Return a json-like object representing this LLM.
   */
  serialize() {
    return {
      ...this.invocationParams(),
      _type: this._llmType(),
      _model: this._modelType()
    };
  }
  /**
   * Generates a prompt based on the input prompt values.
   * @param promptValues An array of BasePromptValue instances.
   * @param options The call options or an array of stop sequences.
   * @param callbacks The callbacks for the language model.
   * @returns A Promise that resolves to an LLMResult.
   */
  async generatePrompt(promptValues, options, callbacks) {
    const promptMessages = promptValues.map((promptValue) => promptValue.toChatMessages());
    return this.generate(promptMessages, options, callbacks);
  }
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
   *
   * Makes a single call to the chat model.
   * @param messages An array of BaseMessage instances.
   * @param options The call options or an array of stop sequences.
   * @param callbacks The callbacks for the language model.
   * @returns A Promise that resolves to a BaseMessage.
   */
  async call(messages, options, callbacks) {
    const result = await this.generate([messages.map(coerceMessageLikeToMessage)], options, callbacks);
    const generations = result.generations;
    return generations[0][0].message;
  }
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
   *
   * Makes a single call to the chat model with a prompt value.
   * @param promptValue The value of the prompt.
   * @param options The call options or an array of stop sequences.
   * @param callbacks The callbacks for the language model.
   * @returns A Promise that resolves to a BaseMessage.
   */
  async callPrompt(promptValue, options, callbacks) {
    const promptMessages = promptValue.toChatMessages();
    return this.call(promptMessages, options, callbacks);
  }
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
   *
   * Predicts the next message based on the input messages.
   * @param messages An array of BaseMessage instances.
   * @param options The call options or an array of stop sequences.
   * @param callbacks The callbacks for the language model.
   * @returns A Promise that resolves to a BaseMessage.
   */
  async predictMessages(messages, options, callbacks) {
    return this.call(messages, options, callbacks);
  }
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
   *
   * Predicts the next message based on a text input.
   * @param text The text input.
   * @param options The call options or an array of stop sequences.
   * @param callbacks The callbacks for the language model.
   * @returns A Promise that resolves to a string.
   */
  async predict(text, options, callbacks) {
    const message = new HumanMessage(text);
    const result = await this.call([message], options, callbacks);
    if (typeof result.content !== "string") {
      throw new Error("Cannot use predict when output is not a string.");
    }
    return result.content;
  }
  withStructuredOutput(outputSchema, config) {
    if (typeof this.bindTools !== "function") {
      throw new Error(`Chat model must implement ".bindTools()" to use withStructuredOutput.`);
    }
    if (config == null ? void 0 : config.strict) {
      throw new Error(`"strict" mode is not supported for this model by default.`);
    }
    const schema = outputSchema;
    const name = config == null ? void 0 : config.name;
    const description = schema.description ?? "A function available to call.";
    const method = config == null ? void 0 : config.method;
    const includeRaw = config == null ? void 0 : config.includeRaw;
    if (method === "jsonMode") {
      throw new Error(`Base withStructuredOutput implementation only supports "functionCalling" as a method.`);
    }
    let functionName = name ?? "extract";
    let tools;
    if (isZodSchema(schema)) {
      tools = [
        {
          type: "function",
          function: {
            name: functionName,
            description,
            parameters: zodToJsonSchema(schema)
          }
        }
      ];
    } else {
      if ("name" in schema) {
        functionName = schema.name;
      }
      tools = [
        {
          type: "function",
          function: {
            name: functionName,
            description,
            parameters: schema
          }
        }
      ];
    }
    const llm = this.bindTools(tools);
    const outputParser = RunnableLambda.from((input) => {
      if (!input.tool_calls || input.tool_calls.length === 0) {
        throw new Error("No tool calls found in the response.");
      }
      const toolCall = input.tool_calls.find((tc) => tc.name === functionName);
      if (!toolCall) {
        throw new Error(`No tool call found with name ${functionName}.`);
      }
      return toolCall.args;
    });
    if (!includeRaw) {
      return llm.pipe(outputParser).withConfig({
        runName: "StructuredOutput"
      });
    }
    const parserAssign = RunnablePassthrough.assign({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsed: (input, config2) => outputParser.invoke(input.raw, config2)
    });
    const parserNone = RunnablePassthrough.assign({
      parsed: () => null
    });
    const parsedWithFallback = parserAssign.withFallbacks({
      fallbacks: [parserNone]
    });
    return RunnableSequence.from([
      {
        raw: llm
      },
      parsedWithFallback
    ]).withConfig({
      runName: "StructuredOutputRunnable"
    });
  }
};

// node_modules/@langchain/core/dist/output_parsers/openai_tools/json_output_tools_parsers.js
function parseToolCall3(rawToolCall, options) {
  if (rawToolCall.function === void 0) {
    return void 0;
  }
  let functionArgs;
  if (options == null ? void 0 : options.partial) {
    try {
      functionArgs = parsePartialJson(rawToolCall.function.arguments ?? "{}");
    } catch (e) {
      return void 0;
    }
  } else {
    try {
      functionArgs = JSON.parse(rawToolCall.function.arguments);
    } catch (e) {
      throw new OutputParserException([
        `Function "${rawToolCall.function.name}" arguments:`,
        ``,
        rawToolCall.function.arguments,
        ``,
        `are not valid JSON.`,
        `Error: ${e.message}`
      ].join("\n"));
    }
  }
  const parsedToolCall = {
    name: rawToolCall.function.name,
    args: functionArgs,
    type: "tool_call"
  };
  if (options == null ? void 0 : options.returnId) {
    parsedToolCall.id = rawToolCall.id;
  }
  return parsedToolCall;
}
function convertLangChainToolCallToOpenAI(toolCall) {
  if (toolCall.id === void 0) {
    throw new Error(`All OpenAI tool calls must have an "id" field.`);
  }
  return {
    id: toolCall.id,
    type: "function",
    function: {
      name: toolCall.name,
      arguments: JSON.stringify(toolCall.args)
    }
  };
}
function makeInvalidToolCall(rawToolCall, errorMsg) {
  var _a2, _b;
  return {
    name: (_a2 = rawToolCall.function) == null ? void 0 : _a2.name,
    args: (_b = rawToolCall.function) == null ? void 0 : _b.arguments,
    id: rawToolCall.id,
    error: errorMsg,
    type: "invalid_tool_call"
  };
}
var JsonOutputToolsParser = class extends BaseCumulativeTransformOutputParser {
  static lc_name() {
    return "JsonOutputToolsParser";
  }
  constructor(fields) {
    super(fields);
    Object.defineProperty(this, "returnId", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: false
    });
    Object.defineProperty(this, "lc_namespace", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: ["langchain", "output_parsers", "openai_tools"]
    });
    Object.defineProperty(this, "lc_serializable", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: true
    });
    this.returnId = (fields == null ? void 0 : fields.returnId) ?? this.returnId;
  }
  _diff() {
    throw new Error("Not supported.");
  }
  async parse() {
    throw new Error("Not implemented.");
  }
  async parseResult(generations) {
    const result = await this.parsePartialResult(generations, false);
    return result;
  }
  /**
   * Parses the output and returns a JSON object. If `argsOnly` is true,
   * only the arguments of the function call are returned.
   * @param generations The output of the LLM to parse.
   * @returns A JSON object representation of the function call or its arguments.
   */
  async parsePartialResult(generations, partial = true) {
    var _a2;
    const message = generations[0].message;
    let toolCalls;
    if (isAIMessage(message) && ((_a2 = message.tool_calls) == null ? void 0 : _a2.length)) {
      toolCalls = message.tool_calls.map((toolCall) => {
        const { id, ...rest } = toolCall;
        if (!this.returnId) {
          return rest;
        }
        return {
          id,
          ...rest
        };
      });
    } else if (message.additional_kwargs.tool_calls !== void 0) {
      const rawToolCalls = JSON.parse(JSON.stringify(message.additional_kwargs.tool_calls));
      toolCalls = rawToolCalls.map((rawToolCall) => {
        return parseToolCall3(rawToolCall, { returnId: this.returnId, partial });
      });
    }
    if (!toolCalls) {
      return [];
    }
    const parsedToolCalls = [];
    for (const toolCall of toolCalls) {
      if (toolCall !== void 0) {
        const backwardsCompatibleToolCall = {
          type: toolCall.name,
          args: toolCall.args,
          id: toolCall.id
        };
        parsedToolCalls.push(backwardsCompatibleToolCall);
      }
    }
    return parsedToolCalls;
  }
};
var JsonOutputKeyToolsParser = class extends JsonOutputToolsParser {
  static lc_name() {
    return "JsonOutputKeyToolsParser";
  }
  constructor(params) {
    super(params);
    Object.defineProperty(this, "lc_namespace", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: ["langchain", "output_parsers", "openai_tools"]
    });
    Object.defineProperty(this, "lc_serializable", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: true
    });
    Object.defineProperty(this, "returnId", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: false
    });
    Object.defineProperty(this, "keyName", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "returnSingle", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: false
    });
    Object.defineProperty(this, "zodSchema", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.keyName = params.keyName;
    this.returnSingle = params.returnSingle ?? this.returnSingle;
    this.zodSchema = params.zodSchema;
  }
  async _validateResult(result) {
    if (this.zodSchema === void 0) {
      return result;
    }
    const zodParsedResult = await this.zodSchema.safeParseAsync(result);
    if (zodParsedResult.success) {
      return zodParsedResult.data;
    } else {
      throw new OutputParserException(`Failed to parse. Text: "${JSON.stringify(result, null, 2)}". Error: ${JSON.stringify(zodParsedResult.error.errors)}`, JSON.stringify(result, null, 2));
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async parsePartialResult(generations) {
    const results = await super.parsePartialResult(generations);
    const matchingResults = results.filter((result) => result.type === this.keyName);
    let returnedValues = matchingResults;
    if (!matchingResults.length) {
      return void 0;
    }
    if (!this.returnId) {
      returnedValues = matchingResults.map((result) => result.args);
    }
    if (this.returnSingle) {
      return returnedValues[0];
    }
    return returnedValues;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async parseResult(generations) {
    const results = await super.parsePartialResult(generations, false);
    const matchingResults = results.filter((result) => result.type === this.keyName);
    let returnedValues = matchingResults;
    if (!matchingResults.length) {
      return void 0;
    }
    if (!this.returnId) {
      returnedValues = matchingResults.map((result) => result.args);
    }
    if (this.returnSingle) {
      return this._validateResult(returnedValues[0]);
    }
    const toolCallResults = await Promise.all(returnedValues.map((value) => this._validateResult(value)));
    return toolCallResults;
  }
};

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/Options.mjs
var ignoreOverride = Symbol("Let zodToJsonSchema decide on which parser to use");
var defaultOptions = {
  name: void 0,
  $refStrategy: "root",
  effectStrategy: "input",
  pipeStrategy: "all",
  dateStrategy: "format:date-time",
  mapStrategy: "entries",
  nullableStrategy: "from-target",
  removeAdditionalStrategy: "passthrough",
  definitionPath: "definitions",
  target: "jsonSchema7",
  strictUnions: false,
  errorMessages: false,
  markdownDescription: false,
  patternStrategy: "escape",
  applyRegexFlags: false,
  emailStrategy: "format:email",
  base64Strategy: "contentEncoding:base64",
  nameStrategy: "ref"
};
var getDefaultOptions = (options) => {
  return typeof options === "string" ? {
    ...defaultOptions,
    basePath: ["#"],
    definitions: {},
    name: options
  } : {
    ...defaultOptions,
    basePath: ["#"],
    definitions: {},
    ...options
  };
};

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/util.mjs
var zodDef = (zodSchema) => {
  return "_def" in zodSchema ? zodSchema._def : zodSchema;
};
function isEmptyObj2(obj) {
  if (!obj)
    return true;
  for (const _k in obj)
    return false;
  return true;
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/Refs.mjs
var getRefs = (options) => {
  const _options = getDefaultOptions(options);
  const currentPath = _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath;
  return {
    ..._options,
    currentPath,
    propertyPath: void 0,
    seenRefs: /* @__PURE__ */ new Set(),
    seen: new Map(Object.entries(_options.definitions).map(([name, def]) => [
      zodDef(def),
      {
        def: zodDef(def),
        path: [..._options.basePath, _options.definitionPath, name],
        // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
        jsonSchema: void 0
      }
    ]))
  };
};

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/errorMessages.mjs
function addErrorMessage(res, key, errorMessage, refs) {
  if (!(refs == null ? void 0 : refs.errorMessages))
    return;
  if (errorMessage) {
    res.errorMessage = {
      ...res.errorMessage,
      [key]: errorMessage
    };
  }
}
function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
  res[key] = value;
  addErrorMessage(res, key, errorMessage, refs);
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/any.mjs
function parseAnyDef() {
  return {};
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/array.mjs
function parseArrayDef(def, refs) {
  var _a2, _b;
  const res = {
    type: "array"
  };
  if (((_b = (_a2 = def.type) == null ? void 0 : _a2._def) == null ? void 0 : _b.typeName) !== ZodFirstPartyTypeKind.ZodAny) {
    res.items = parseDef(def.type._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items"]
    });
  }
  if (def.minLength) {
    setResponseValueAndErrors(res, "minItems", def.minLength.value, def.minLength.message, refs);
  }
  if (def.maxLength) {
    setResponseValueAndErrors(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
  }
  if (def.exactLength) {
    setResponseValueAndErrors(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
    setResponseValueAndErrors(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
  }
  return res;
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/bigint.mjs
function parseBigintDef(def, refs) {
  const res = {
    type: "integer",
    format: "int64"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/boolean.mjs
function parseBooleanDef() {
  return {
    type: "boolean"
  };
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/branded.mjs
function parseBrandedDef(_def, refs) {
  return parseDef(_def.type._def, refs);
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/catch.mjs
var parseCatchDef = (def, refs) => {
  return parseDef(def.innerType._def, refs);
};

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/date.mjs
function parseDateDef(def, refs, overrideDateStrategy) {
  const strategy = overrideDateStrategy ?? refs.dateStrategy;
  if (Array.isArray(strategy)) {
    return {
      anyOf: strategy.map((item, i) => parseDateDef(def, refs, item))
    };
  }
  switch (strategy) {
    case "string":
    case "format:date-time":
      return {
        type: "string",
        format: "date-time"
      };
    case "format:date":
      return {
        type: "string",
        format: "date"
      };
    case "integer":
      return integerDateParser(def, refs);
  }
}
var integerDateParser = (def, refs) => {
  const res = {
    type: "integer",
    format: "unix-time"
  };
  if (refs.target === "openApi3") {
    return res;
  }
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        setResponseValueAndErrors(
          res,
          "minimum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
      case "max":
        setResponseValueAndErrors(
          res,
          "maximum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
    }
  }
  return res;
};

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/default.mjs
function parseDefaultDef(_def, refs) {
  return {
    ...parseDef(_def.innerType._def, refs),
    default: _def.defaultValue()
  };
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/effects.mjs
function parseEffectsDef(_def, refs, forceResolution) {
  return refs.effectStrategy === "input" ? parseDef(_def.schema._def, refs, forceResolution) : {};
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/enum.mjs
function parseEnumDef(def) {
  return {
    type: "string",
    enum: [...def.values]
  };
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/intersection.mjs
var isJsonSchema7AllOfType = (type) => {
  if ("type" in type && type.type === "string")
    return false;
  return "allOf" in type;
};
function parseIntersectionDef(def, refs) {
  const allOf = [
    parseDef(def.left._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "0"]
    }),
    parseDef(def.right._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "1"]
    })
  ].filter((x) => !!x);
  let unevaluatedProperties = refs.target === "jsonSchema2019-09" ? { unevaluatedProperties: false } : void 0;
  const mergedAllOf = [];
  allOf.forEach((schema) => {
    if (isJsonSchema7AllOfType(schema)) {
      mergedAllOf.push(...schema.allOf);
      if (schema.unevaluatedProperties === void 0) {
        unevaluatedProperties = void 0;
      }
    } else {
      let nestedSchema = schema;
      if ("additionalProperties" in schema && schema.additionalProperties === false) {
        const { additionalProperties, ...rest } = schema;
        nestedSchema = rest;
      } else {
        unevaluatedProperties = void 0;
      }
      mergedAllOf.push(nestedSchema);
    }
  });
  return mergedAllOf.length ? {
    allOf: mergedAllOf,
    ...unevaluatedProperties
  } : void 0;
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/literal.mjs
function parseLiteralDef(def, refs) {
  const parsedType = typeof def.value;
  if (parsedType !== "bigint" && parsedType !== "number" && parsedType !== "boolean" && parsedType !== "string") {
    return {
      type: Array.isArray(def.value) ? "array" : "object"
    };
  }
  if (refs.target === "openApi3") {
    return {
      type: parsedType === "bigint" ? "integer" : parsedType,
      enum: [def.value]
    };
  }
  return {
    type: parsedType === "bigint" ? "integer" : parsedType,
    const: def.value
  };
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/string.mjs
var emojiRegex;
var zodPatterns = {
  /**
   * `c` was changed to `[cC]` to replicate /i flag
   */
  cuid: /^[cC][^\s-]{8,}$/,
  cuid2: /^[0-9a-z]+$/,
  ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
  /**
   * `a-z` was added to replicate /i flag
   */
  email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
  /**
   * Constructed a valid Unicode RegExp
   *
   * Lazily instantiate since this type of regex isn't supported
   * in all envs (e.g. React Native).
   *
   * See:
   * https://github.com/colinhacks/zod/issues/2433
   * Fix in Zod:
   * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
   */
  emoji: () => {
    if (emojiRegex === void 0) {
      emojiRegex = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
    }
    return emojiRegex;
  },
  /**
   * Unused
   */
  uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
  /**
   * Unused
   */
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  /**
   * Unused
   */
  ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
  base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
  nanoid: /^[a-zA-Z0-9_-]{21}$/
};
function parseStringDef(def, refs) {
  const res = {
    type: "string"
  };
  function processPattern(value) {
    return refs.patternStrategy === "escape" ? escapeNonAlphaNumeric(value) : value;
  }
  if (def.checks) {
    for (const check of def.checks) {
      switch (check.kind) {
        case "min":
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          break;
        case "max":
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "email":
          switch (refs.emailStrategy) {
            case "format:email":
              addFormat(res, "email", check.message, refs);
              break;
            case "format:idn-email":
              addFormat(res, "idn-email", check.message, refs);
              break;
            case "pattern:zod":
              addPattern(res, zodPatterns.email, check.message, refs);
              break;
          }
          break;
        case "url":
          addFormat(res, "uri", check.message, refs);
          break;
        case "uuid":
          addFormat(res, "uuid", check.message, refs);
          break;
        case "regex":
          addPattern(res, check.regex, check.message, refs);
          break;
        case "cuid":
          addPattern(res, zodPatterns.cuid, check.message, refs);
          break;
        case "cuid2":
          addPattern(res, zodPatterns.cuid2, check.message, refs);
          break;
        case "startsWith":
          addPattern(res, RegExp(`^${processPattern(check.value)}`), check.message, refs);
          break;
        case "endsWith":
          addPattern(res, RegExp(`${processPattern(check.value)}$`), check.message, refs);
          break;
        case "datetime":
          addFormat(res, "date-time", check.message, refs);
          break;
        case "date":
          addFormat(res, "date", check.message, refs);
          break;
        case "time":
          addFormat(res, "time", check.message, refs);
          break;
        case "duration":
          addFormat(res, "duration", check.message, refs);
          break;
        case "length":
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "includes": {
          addPattern(res, RegExp(processPattern(check.value)), check.message, refs);
          break;
        }
        case "ip": {
          if (check.version !== "v6") {
            addFormat(res, "ipv4", check.message, refs);
          }
          if (check.version !== "v4") {
            addFormat(res, "ipv6", check.message, refs);
          }
          break;
        }
        case "emoji":
          addPattern(res, zodPatterns.emoji, check.message, refs);
          break;
        case "ulid": {
          addPattern(res, zodPatterns.ulid, check.message, refs);
          break;
        }
        case "base64": {
          switch (refs.base64Strategy) {
            case "format:binary": {
              addFormat(res, "binary", check.message, refs);
              break;
            }
            case "contentEncoding:base64": {
              setResponseValueAndErrors(res, "contentEncoding", "base64", check.message, refs);
              break;
            }
            case "pattern:zod": {
              addPattern(res, zodPatterns.base64, check.message, refs);
              break;
            }
          }
          break;
        }
        case "nanoid": {
          addPattern(res, zodPatterns.nanoid, check.message, refs);
        }
        case "toLowerCase":
        case "toUpperCase":
        case "trim":
          break;
        default:
          /* @__PURE__ */ ((_) => {
          })(check);
      }
    }
  }
  return res;
}
var escapeNonAlphaNumeric = (value) => Array.from(value).map((c) => /[a-zA-Z0-9]/.test(c) ? c : `\\${c}`).join("");
var addFormat = (schema, value, message, refs) => {
  var _a2;
  if (schema.format || ((_a2 = schema.anyOf) == null ? void 0 : _a2.some((x) => x.format))) {
    if (!schema.anyOf) {
      schema.anyOf = [];
    }
    if (schema.format) {
      schema.anyOf.push({
        format: schema.format,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { format: schema.errorMessage.format }
        }
      });
      delete schema.format;
      if (schema.errorMessage) {
        delete schema.errorMessage.format;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.anyOf.push({
      format: value,
      ...message && refs.errorMessages && { errorMessage: { format: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "format", value, message, refs);
  }
};
var addPattern = (schema, regex, message, refs) => {
  var _a2;
  if (schema.pattern || ((_a2 = schema.allOf) == null ? void 0 : _a2.some((x) => x.pattern))) {
    if (!schema.allOf) {
      schema.allOf = [];
    }
    if (schema.pattern) {
      schema.allOf.push({
        pattern: schema.pattern,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { pattern: schema.errorMessage.pattern }
        }
      });
      delete schema.pattern;
      if (schema.errorMessage) {
        delete schema.errorMessage.pattern;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.allOf.push({
      pattern: processRegExp(regex, refs),
      ...message && refs.errorMessages && { errorMessage: { pattern: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "pattern", processRegExp(regex, refs), message, refs);
  }
};
var processRegExp = (regexOrFunction, refs) => {
  var _a2;
  const regex = typeof regexOrFunction === "function" ? regexOrFunction() : regexOrFunction;
  if (!refs.applyRegexFlags || !regex.flags)
    return regex.source;
  const flags = {
    i: regex.flags.includes("i"),
    m: regex.flags.includes("m"),
    s: regex.flags.includes("s")
    // `.` matches newlines
  };
  const source = flags.i ? regex.source.toLowerCase() : regex.source;
  let pattern = "";
  let isEscaped = false;
  let inCharGroup = false;
  let inCharRange = false;
  for (let i = 0; i < source.length; i++) {
    if (isEscaped) {
      pattern += source[i];
      isEscaped = false;
      continue;
    }
    if (flags.i) {
      if (inCharGroup) {
        if (source[i].match(/[a-z]/)) {
          if (inCharRange) {
            pattern += source[i];
            pattern += `${source[i - 2]}-${source[i]}`.toUpperCase();
            inCharRange = false;
          } else if (source[i + 1] === "-" && ((_a2 = source[i + 2]) == null ? void 0 : _a2.match(/[a-z]/))) {
            pattern += source[i];
            inCharRange = true;
          } else {
            pattern += `${source[i]}${source[i].toUpperCase()}`;
          }
          continue;
        }
      } else if (source[i].match(/[a-z]/)) {
        pattern += `[${source[i]}${source[i].toUpperCase()}]`;
        continue;
      }
    }
    if (flags.m) {
      if (source[i] === "^") {
        pattern += `(^|(?<=[\r
]))`;
        continue;
      } else if (source[i] === "$") {
        pattern += `($|(?=[\r
]))`;
        continue;
      }
    }
    if (flags.s && source[i] === ".") {
      pattern += inCharGroup ? `${source[i]}\r
` : `[${source[i]}\r
]`;
      continue;
    }
    pattern += source[i];
    if (source[i] === "\\") {
      isEscaped = true;
    } else if (inCharGroup && source[i] === "]") {
      inCharGroup = false;
    } else if (!inCharGroup && source[i] === "[") {
      inCharGroup = true;
    }
  }
  try {
    const regexTest = new RegExp(pattern);
  } catch {
    console.warn(`Could not convert regex pattern at ${refs.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`);
    return regex.source;
  }
  return pattern;
};

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/record.mjs
function parseRecordDef(def, refs) {
  var _a2, _b, _c, _d;
  if (refs.target === "openApi3" && ((_a2 = def.keyType) == null ? void 0 : _a2._def.typeName) === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      type: "object",
      required: def.keyType._def.values,
      properties: def.keyType._def.values.reduce((acc, key) => ({
        ...acc,
        [key]: parseDef(def.valueType._def, {
          ...refs,
          currentPath: [...refs.currentPath, "properties", key]
        }) ?? {}
      }), {}),
      additionalProperties: false
    };
  }
  const schema = {
    type: "object",
    additionalProperties: parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    }) ?? {}
  };
  if (refs.target === "openApi3") {
    return schema;
  }
  if (((_b = def.keyType) == null ? void 0 : _b._def.typeName) === ZodFirstPartyTypeKind.ZodString && ((_c = def.keyType._def.checks) == null ? void 0 : _c.length)) {
    const keyType = Object.entries(parseStringDef(def.keyType._def, refs)).reduce((acc, [key, value]) => key === "type" ? acc : { ...acc, [key]: value }, {});
    return {
      ...schema,
      propertyNames: keyType
    };
  } else if (((_d = def.keyType) == null ? void 0 : _d._def.typeName) === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      ...schema,
      propertyNames: {
        enum: def.keyType._def.values
      }
    };
  }
  return schema;
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/map.mjs
function parseMapDef(def, refs) {
  if (refs.mapStrategy === "record") {
    return parseRecordDef(def, refs);
  }
  const keys = parseDef(def.keyType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "0"]
  }) || {};
  const values = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "1"]
  }) || {};
  return {
    type: "array",
    maxItems: 125,
    items: {
      type: "array",
      items: [keys, values],
      minItems: 2,
      maxItems: 2
    }
  };
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/nativeEnum.mjs
function parseNativeEnumDef(def) {
  const object = def.values;
  const actualKeys = Object.keys(def.values).filter((key) => {
    return typeof object[object[key]] !== "number";
  });
  const actualValues = actualKeys.map((key) => object[key]);
  const parsedTypes = Array.from(new Set(actualValues.map((values) => typeof values)));
  return {
    type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : ["string", "number"],
    enum: actualValues
  };
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/never.mjs
function parseNeverDef() {
  return {
    not: {}
  };
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/null.mjs
function parseNullDef(refs) {
  return refs.target === "openApi3" ? {
    enum: ["null"],
    nullable: true
  } : {
    type: "null"
  };
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/union.mjs
var primitiveMappings = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBigInt: "integer",
  ZodBoolean: "boolean",
  ZodNull: "null"
};
function parseUnionDef(def, refs) {
  if (refs.target === "openApi3")
    return asAnyOf(def, refs);
  const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
  if (options.every((x) => x._def.typeName in primitiveMappings && (!x._def.checks || !x._def.checks.length))) {
    const types = options.reduce((types2, x) => {
      const type = primitiveMappings[x._def.typeName];
      return type && !types2.includes(type) ? [...types2, type] : types2;
    }, []);
    return {
      type: types.length > 1 ? types : types[0]
    };
  } else if (options.every((x) => x._def.typeName === "ZodLiteral" && !x.description)) {
    const types = options.reduce((acc, x) => {
      const type = typeof x._def.value;
      switch (type) {
        case "string":
        case "number":
        case "boolean":
          return [...acc, type];
        case "bigint":
          return [...acc, "integer"];
        case "object":
          if (x._def.value === null)
            return [...acc, "null"];
        case "symbol":
        case "undefined":
        case "function":
        default:
          return acc;
      }
    }, []);
    if (types.length === options.length) {
      const uniqueTypes = types.filter((x, i, a) => a.indexOf(x) === i);
      return {
        type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
        enum: options.reduce((acc, x) => {
          return acc.includes(x._def.value) ? acc : [...acc, x._def.value];
        }, [])
      };
    }
  } else if (options.every((x) => x._def.typeName === "ZodEnum")) {
    return {
      type: "string",
      enum: options.reduce((acc, x) => [...acc, ...x._def.values.filter((x2) => !acc.includes(x2))], [])
    };
  }
  return asAnyOf(def, refs);
}
var asAnyOf = (def, refs) => {
  const anyOf = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map((x, i) => parseDef(x._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", `${i}`]
  })).filter((x) => !!x && (!refs.strictUnions || typeof x === "object" && Object.keys(x).length > 0));
  return anyOf.length ? { anyOf } : void 0;
};

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/nullable.mjs
function parseNullableDef(def, refs) {
  if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(def.innerType._def.typeName) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
    if (refs.target === "openApi3" || refs.nullableStrategy === "property") {
      return {
        type: primitiveMappings[def.innerType._def.typeName],
        nullable: true
      };
    }
    return {
      type: [primitiveMappings[def.innerType._def.typeName], "null"]
    };
  }
  if (refs.target === "openApi3") {
    const base2 = parseDef(def.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath]
    });
    if (base2 && "$ref" in base2)
      return { allOf: [base2], nullable: true };
    return base2 && { ...base2, nullable: true };
  }
  const base = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "0"]
  });
  return base && { anyOf: [base, { type: "null" }] };
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/number.mjs
function parseNumberDef(def, refs) {
  const res = {
    type: "number"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "int":
        res.type = "integer";
        addErrorMessage(res, "type", check.message, refs);
        break;
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/object.mjs
function decideAdditionalProperties(def, refs) {
  if (refs.removeAdditionalStrategy === "strict") {
    return def.catchall._def.typeName === "ZodNever" ? def.unknownKeys !== "strict" : parseDef(def.catchall._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    }) ?? true;
  } else {
    return def.catchall._def.typeName === "ZodNever" ? def.unknownKeys === "passthrough" : parseDef(def.catchall._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    }) ?? true;
  }
}
function parseObjectDef(def, refs) {
  const result = {
    type: "object",
    ...Object.entries(def.shape()).reduce((acc, [propName, propDef]) => {
      if (propDef === void 0 || propDef._def === void 0)
        return acc;
      const propertyPath = [...refs.currentPath, "properties", propName];
      const parsedDef = parseDef(propDef._def, {
        ...refs,
        currentPath: propertyPath,
        propertyPath
      });
      if (parsedDef === void 0)
        return acc;
      if (refs.openaiStrictMode && propDef.isOptional() && !propDef.isNullable()) {
        console.warn(`Zod field at \`${propertyPath.join("/")}\` uses \`.optional()\` without \`.nullable()\` which is not supported by the API. See: https://platform.openai.com/docs/guides/structured-outputs?api-mode=responses#all-fields-must-be-required
This will become an error in a future version of the SDK.`);
      }
      return {
        properties: {
          ...acc.properties,
          [propName]: parsedDef
        },
        required: propDef.isOptional() && !refs.openaiStrictMode ? acc.required : [...acc.required, propName]
      };
    }, { properties: {}, required: [] }),
    additionalProperties: decideAdditionalProperties(def, refs)
  };
  if (!result.required.length)
    delete result.required;
  return result;
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/optional.mjs
var parseOptionalDef = (def, refs) => {
  var _a2;
  if (refs.currentPath.toString() === ((_a2 = refs.propertyPath) == null ? void 0 : _a2.toString())) {
    return parseDef(def.innerType._def, refs);
  }
  const innerSchema = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "1"]
  });
  return innerSchema ? {
    anyOf: [
      {
        not: {}
      },
      innerSchema
    ]
  } : {};
};

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/pipeline.mjs
var parsePipelineDef = (def, refs) => {
  if (refs.pipeStrategy === "input") {
    return parseDef(def.in._def, refs);
  } else if (refs.pipeStrategy === "output") {
    return parseDef(def.out._def, refs);
  }
  const a = parseDef(def.in._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", "0"]
  });
  const b = parseDef(def.out._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", a ? "1" : "0"]
  });
  return {
    allOf: [a, b].filter((x) => x !== void 0)
  };
};

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/promise.mjs
function parsePromiseDef(def, refs) {
  return parseDef(def.type._def, refs);
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/set.mjs
function parseSetDef(def, refs) {
  const items = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items"]
  });
  const schema = {
    type: "array",
    uniqueItems: true,
    items
  };
  if (def.minSize) {
    setResponseValueAndErrors(schema, "minItems", def.minSize.value, def.minSize.message, refs);
  }
  if (def.maxSize) {
    setResponseValueAndErrors(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
  }
  return schema;
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/tuple.mjs
function parseTupleDef(def, refs) {
  if (def.rest) {
    return {
      type: "array",
      minItems: def.items.length,
      items: def.items.map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i}`]
      })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], []),
      additionalItems: parseDef(def.rest._def, {
        ...refs,
        currentPath: [...refs.currentPath, "additionalItems"]
      })
    };
  } else {
    return {
      type: "array",
      minItems: def.items.length,
      maxItems: def.items.length,
      items: def.items.map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i}`]
      })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], [])
    };
  }
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/undefined.mjs
function parseUndefinedDef() {
  return {
    not: {}
  };
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/unknown.mjs
function parseUnknownDef() {
  return {};
}

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parsers/readonly.mjs
var parseReadonlyDef = (def, refs) => {
  return parseDef(def.innerType._def, refs);
};

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/parseDef.mjs
function parseDef(def, refs, forceResolution = false) {
  var _a2;
  const seenItem = refs.seen.get(def);
  if (refs.override) {
    const overrideResult = (_a2 = refs.override) == null ? void 0 : _a2.call(refs, def, refs, seenItem, forceResolution);
    if (overrideResult !== ignoreOverride) {
      return overrideResult;
    }
  }
  if (seenItem && !forceResolution) {
    const seenSchema = get$ref(seenItem, refs);
    if (seenSchema !== void 0) {
      if ("$ref" in seenSchema) {
        refs.seenRefs.add(seenSchema.$ref);
      }
      return seenSchema;
    }
  }
  const newItem = { def, path: refs.currentPath, jsonSchema: void 0 };
  refs.seen.set(def, newItem);
  const jsonSchema = selectParser(def, def.typeName, refs, forceResolution);
  if (jsonSchema) {
    addMeta(def, refs, jsonSchema);
  }
  newItem.jsonSchema = jsonSchema;
  return jsonSchema;
}
var get$ref = (item, refs) => {
  switch (refs.$refStrategy) {
    case "root":
      return { $ref: item.path.join("/") };
    case "extract-to-root":
      const name = item.path.slice(refs.basePath.length + 1).join("_");
      if (name !== refs.name && refs.nameStrategy === "duplicate-ref") {
        refs.definitions[name] = item.def;
      }
      return { $ref: [...refs.basePath, refs.definitionPath, name].join("/") };
    case "relative":
      return { $ref: getRelativePath(refs.currentPath, item.path) };
    case "none":
    case "seen": {
      if (item.path.length < refs.currentPath.length && item.path.every((value, index) => refs.currentPath[index] === value)) {
        console.warn(`Recursive reference detected at ${refs.currentPath.join("/")}! Defaulting to any`);
        return {};
      }
      return refs.$refStrategy === "seen" ? {} : void 0;
    }
  }
};
var getRelativePath = (pathA, pathB) => {
  let i = 0;
  for (; i < pathA.length && i < pathB.length; i++) {
    if (pathA[i] !== pathB[i])
      break;
  }
  return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
};
var selectParser = (def, typeName, refs, forceResolution) => {
  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return parseStringDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNumber:
      return parseNumberDef(def, refs);
    case ZodFirstPartyTypeKind.ZodObject:
      return parseObjectDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBigInt:
      return parseBigintDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBoolean:
      return parseBooleanDef();
    case ZodFirstPartyTypeKind.ZodDate:
      return parseDateDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUndefined:
      return parseUndefinedDef();
    case ZodFirstPartyTypeKind.ZodNull:
      return parseNullDef(refs);
    case ZodFirstPartyTypeKind.ZodArray:
      return parseArrayDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUnion:
    case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return parseUnionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodIntersection:
      return parseIntersectionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodTuple:
      return parseTupleDef(def, refs);
    case ZodFirstPartyTypeKind.ZodRecord:
      return parseRecordDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLiteral:
      return parseLiteralDef(def, refs);
    case ZodFirstPartyTypeKind.ZodEnum:
      return parseEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNativeEnum:
      return parseNativeEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNullable:
      return parseNullableDef(def, refs);
    case ZodFirstPartyTypeKind.ZodOptional:
      return parseOptionalDef(def, refs);
    case ZodFirstPartyTypeKind.ZodMap:
      return parseMapDef(def, refs);
    case ZodFirstPartyTypeKind.ZodSet:
      return parseSetDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLazy:
      return parseDef(def.getter()._def, refs);
    case ZodFirstPartyTypeKind.ZodPromise:
      return parsePromiseDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNaN:
    case ZodFirstPartyTypeKind.ZodNever:
      return parseNeverDef();
    case ZodFirstPartyTypeKind.ZodEffects:
      return parseEffectsDef(def, refs, forceResolution);
    case ZodFirstPartyTypeKind.ZodAny:
      return parseAnyDef();
    case ZodFirstPartyTypeKind.ZodUnknown:
      return parseUnknownDef();
    case ZodFirstPartyTypeKind.ZodDefault:
      return parseDefaultDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBranded:
      return parseBrandedDef(def, refs);
    case ZodFirstPartyTypeKind.ZodReadonly:
      return parseReadonlyDef(def, refs);
    case ZodFirstPartyTypeKind.ZodCatch:
      return parseCatchDef(def, refs);
    case ZodFirstPartyTypeKind.ZodPipeline:
      return parsePipelineDef(def, refs);
    case ZodFirstPartyTypeKind.ZodFunction:
    case ZodFirstPartyTypeKind.ZodVoid:
    case ZodFirstPartyTypeKind.ZodSymbol:
      return void 0;
    default:
      return /* @__PURE__ */ ((_) => void 0)(typeName);
  }
};
var addMeta = (def, refs, jsonSchema) => {
  if (def.description) {
    jsonSchema.description = def.description;
    if (refs.markdownDescription) {
      jsonSchema.markdownDescription = def.description;
    }
  }
  return jsonSchema;
};

// node_modules/@langchain/openai/node_modules/openai/_vendor/zod-to-json-schema/zodToJsonSchema.mjs
var zodToJsonSchema2 = (schema, options) => {
  const refs = getRefs(options);
  const name = typeof options === "string" ? options : (options == null ? void 0 : options.nameStrategy) === "title" ? void 0 : options == null ? void 0 : options.name;
  const main = parseDef(schema._def, name === void 0 ? refs : {
    ...refs,
    currentPath: [...refs.basePath, refs.definitionPath, name]
  }, false) ?? {};
  const title = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
  if (title !== void 0) {
    main.title = title;
  }
  const definitions = (() => {
    if (isEmptyObj2(refs.definitions)) {
      return void 0;
    }
    const definitions2 = {};
    const processedDefinitions = /* @__PURE__ */ new Set();
    for (let i = 0; i < 500; i++) {
      const newDefinitions = Object.entries(refs.definitions).filter(([key]) => !processedDefinitions.has(key));
      if (newDefinitions.length === 0)
        break;
      for (const [key, schema2] of newDefinitions) {
        definitions2[key] = parseDef(zodDef(schema2), { ...refs, currentPath: [...refs.basePath, refs.definitionPath, key] }, true) ?? {};
        processedDefinitions.add(key);
      }
    }
    return definitions2;
  })();
  const combined = name === void 0 ? definitions ? {
    ...main,
    [refs.definitionPath]: definitions
  } : main : refs.nameStrategy === "duplicate-ref" ? {
    ...main,
    ...definitions || refs.seenRefs.size ? {
      [refs.definitionPath]: {
        ...definitions,
        // only actually duplicate the schema definition if it was ever referenced
        // otherwise the duplication is completely pointless
        ...refs.seenRefs.size ? { [name]: main } : void 0
      }
    } : void 0
  } : {
    $ref: [...refs.$refStrategy === "relative" ? [] : refs.basePath, refs.definitionPath, name].join("/"),
    [refs.definitionPath]: {
      ...definitions,
      [name]: main
    }
  };
  if (refs.target === "jsonSchema7") {
    combined.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (refs.target === "jsonSchema2019-09") {
    combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
  }
  return combined;
};

// node_modules/@langchain/openai/node_modules/openai/helpers/zod.mjs
function zodToJsonSchema3(schema, options) {
  return zodToJsonSchema2(schema, {
    openaiStrictMode: true,
    name: options.name,
    nameStrategy: "duplicate-ref",
    $refStrategy: "extract-to-root",
    nullableStrategy: "property"
  });
}
function zodResponseFormat(zodObject, name, props) {
  return makeParseableResponseFormat({
    type: "json_schema",
    json_schema: {
      ...props,
      name,
      strict: true,
      schema: zodToJsonSchema3(zodObject, { name })
    }
  }, (content) => zodObject.parse(JSON.parse(content)));
}

// node_modules/@langchain/openai/dist/utils/azure.js
function getEndpoint(config) {
  const { azureOpenAIApiDeploymentName, azureOpenAIApiInstanceName, azureOpenAIApiKey, azureOpenAIBasePath, baseURL, azureADTokenProvider, azureOpenAIEndpoint } = config;
  if ((azureOpenAIApiKey || azureADTokenProvider) && azureOpenAIBasePath && azureOpenAIApiDeploymentName) {
    return `${azureOpenAIBasePath}/${azureOpenAIApiDeploymentName}`;
  }
  if ((azureOpenAIApiKey || azureADTokenProvider) && azureOpenAIEndpoint && azureOpenAIApiDeploymentName) {
    return `${azureOpenAIEndpoint}/openai/deployments/${azureOpenAIApiDeploymentName}`;
  }
  if (azureOpenAIApiKey || azureADTokenProvider) {
    if (!azureOpenAIApiInstanceName) {
      throw new Error("azureOpenAIApiInstanceName is required when using azureOpenAIApiKey");
    }
    if (!azureOpenAIApiDeploymentName) {
      throw new Error("azureOpenAIApiDeploymentName is a required parameter when using azureOpenAIApiKey");
    }
    return `https://${azureOpenAIApiInstanceName}.openai.azure.com/openai/deployments/${azureOpenAIApiDeploymentName}`;
  }
  return baseURL;
}

// node_modules/@langchain/core/dist/tools/types.js
function isStructuredTool(tool) {
  return tool !== void 0 && Array.isArray(tool.lc_namespace);
}
function isRunnableToolLike(tool) {
  return tool !== void 0 && Runnable.isRunnable(tool) && "lc_name" in tool.constructor && typeof tool.constructor.lc_name === "function" && tool.constructor.lc_name() === "RunnableToolLike";
}
function isStructuredToolParams(tool) {
  return !!tool && typeof tool === "object" && "name" in tool && "schema" in tool && // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (isZodSchema(tool.schema) || tool.schema != null && typeof tool.schema === "object" && "type" in tool.schema && typeof tool.schema.type === "string" && ["null", "boolean", "object", "array", "number", "string"].includes(tool.schema.type));
}
function isLangChainTool(tool) {
  return isStructuredToolParams(tool) || isRunnableToolLike(tool) || // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isStructuredTool(tool);
}

// node_modules/@langchain/core/dist/utils/json_schema.js
function toJsonSchema(schema) {
  if (isZodSchema(schema)) {
    return zodToJsonSchema(schema);
  }
  return schema;
}

// node_modules/@langchain/core/dist/utils/function_calling.js
function convertToOpenAIFunction(tool, fields) {
  const fieldsCopy = typeof fields === "number" ? void 0 : fields;
  return {
    name: tool.name,
    description: tool.description,
    parameters: toJsonSchema(tool.schema),
    // Do not include the `strict` field if it is `undefined`.
    ...(fieldsCopy == null ? void 0 : fieldsCopy.strict) !== void 0 ? { strict: fieldsCopy.strict } : {}
  };
}
function convertToOpenAITool(tool, fields) {
  const fieldsCopy = typeof fields === "number" ? void 0 : fields;
  let toolDef;
  if (isLangChainTool(tool)) {
    toolDef = {
      type: "function",
      function: convertToOpenAIFunction(tool)
    };
  } else {
    toolDef = tool;
  }
  if ((fieldsCopy == null ? void 0 : fieldsCopy.strict) !== void 0) {
    toolDef.function.strict = fieldsCopy.strict;
  }
  return toolDef;
}

// node_modules/@langchain/openai/dist/utils/errors.js
function addLangChainErrorFields(error, lc_error_code) {
  error.lc_error_code = lc_error_code;
  error.message = `${error.message}

Troubleshooting URL: https://js.langchain.com/docs/troubleshooting/errors/${lc_error_code}/
`;
  return error;
}

// node_modules/@langchain/openai/dist/utils/openai.js
function wrapOpenAIClientError(e) {
  let error;
  if (e.constructor.name === APIConnectionTimeoutError.name) {
    error = new Error(e.message);
    error.name = "TimeoutError";
  } else if (e.constructor.name === APIUserAbortError.name) {
    error = new Error(e.message);
    error.name = "AbortError";
  } else if (e.status === 400 && e.message.includes("tool_calls")) {
    error = addLangChainErrorFields(e, "INVALID_TOOL_RESULTS");
  } else if (e.status === 401) {
    error = addLangChainErrorFields(e, "MODEL_AUTHENTICATION");
  } else if (e.status === 429) {
    error = addLangChainErrorFields(e, "MODEL_RATE_LIMIT");
  } else if (e.status === 404) {
    error = addLangChainErrorFields(e, "MODEL_NOT_FOUND");
  } else {
    error = e;
  }
  return error;
}
function formatToOpenAIAssistantTool(tool) {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: isZodSchema(tool.schema) ? zodToJsonSchema(tool.schema) : tool.schema
    }
  };
}
function formatToOpenAIToolChoice(toolChoice) {
  if (!toolChoice) {
    return void 0;
  } else if (toolChoice === "any" || toolChoice === "required") {
    return "required";
  } else if (toolChoice === "auto") {
    return "auto";
  } else if (toolChoice === "none") {
    return "none";
  } else if (typeof toolChoice === "string") {
    return {
      type: "function",
      function: {
        name: toolChoice
      }
    };
  } else {
    return toolChoice;
  }
}

// node_modules/@langchain/openai/dist/utils/openai-format-fndef.js
function isAnyOfProp(prop) {
  return prop.anyOf !== void 0 && Array.isArray(prop.anyOf);
}
function formatFunctionDefinitions(functions) {
  const lines = ["namespace functions {", ""];
  for (const f of functions) {
    if (f.description) {
      lines.push(`// ${f.description}`);
    }
    if (Object.keys(f.parameters.properties ?? {}).length > 0) {
      lines.push(`type ${f.name} = (_: {`);
      lines.push(formatObjectProperties(f.parameters, 0));
      lines.push("}) => any;");
    } else {
      lines.push(`type ${f.name} = () => any;`);
    }
    lines.push("");
  }
  lines.push("} // namespace functions");
  return lines.join("\n");
}
function formatObjectProperties(obj, indent) {
  var _a2;
  const lines = [];
  for (const [name, param] of Object.entries(obj.properties ?? {})) {
    if (param.description && indent < 2) {
      lines.push(`// ${param.description}`);
    }
    if ((_a2 = obj.required) == null ? void 0 : _a2.includes(name)) {
      lines.push(`${name}: ${formatType(param, indent)},`);
    } else {
      lines.push(`${name}?: ${formatType(param, indent)},`);
    }
  }
  return lines.map((line) => " ".repeat(indent) + line).join("\n");
}
function formatType(param, indent) {
  if (isAnyOfProp(param)) {
    return param.anyOf.map((v) => formatType(v, indent)).join(" | ");
  }
  switch (param.type) {
    case "string":
      if (param.enum) {
        return param.enum.map((v) => `"${v}"`).join(" | ");
      }
      return "string";
    case "number":
      if (param.enum) {
        return param.enum.map((v) => `${v}`).join(" | ");
      }
      return "number";
    case "integer":
      if (param.enum) {
        return param.enum.map((v) => `${v}`).join(" | ");
      }
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "object":
      return ["{", formatObjectProperties(param, indent + 2), "}"].join("\n");
    case "array":
      if (param.items) {
        return `${formatType(param.items, indent)}[]`;
      }
      return "any[]";
    default:
      return "";
  }
}

// node_modules/@langchain/openai/dist/utils/tools.js
function _convertToOpenAITool(tool, fields) {
  let toolDef;
  if (isLangChainTool(tool)) {
    toolDef = convertToOpenAITool(tool);
  } else {
    toolDef = tool;
  }
  if ((fields == null ? void 0 : fields.strict) !== void 0) {
    toolDef.function.strict = fields.strict;
  }
  return toolDef;
}

// node_modules/@langchain/openai/dist/chat_models.js
function extractGenericMessageCustomRole(message) {
  if (message.role !== "system" && message.role !== "developer" && message.role !== "assistant" && message.role !== "user" && message.role !== "function" && message.role !== "tool") {
    console.warn(`Unknown message role: ${message.role}`);
  }
  return message.role;
}
function messageToOpenAIRole(message) {
  const type = message._getType();
  switch (type) {
    case "system":
      return "system";
    case "ai":
      return "assistant";
    case "human":
      return "user";
    case "function":
      return "function";
    case "tool":
      return "tool";
    case "generic": {
      if (!ChatMessage.isInstance(message))
        throw new Error("Invalid generic chat message");
      return extractGenericMessageCustomRole(message);
    }
    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}
var completionsApiContentBlockConverter = {
  providerName: "ChatOpenAI",
  fromStandardTextBlock(block) {
    return { type: "text", text: block.text };
  },
  fromStandardImageBlock(block) {
    var _a2, _b;
    if (block.source_type === "url") {
      return {
        type: "image_url",
        image_url: {
          url: block.url,
          ...((_a2 = block.metadata) == null ? void 0 : _a2.detail) ? { detail: block.metadata.detail } : {}
        }
      };
    }
    if (block.source_type === "base64") {
      const url = `data:${block.mime_type ?? ""};base64,${block.data}`;
      return {
        type: "image_url",
        image_url: {
          url,
          ...((_b = block.metadata) == null ? void 0 : _b.detail) ? { detail: block.metadata.detail } : {}
        }
      };
    }
    throw new Error(`Image content blocks with source_type ${block.source_type} are not supported for ChatOpenAI`);
  },
  fromStandardAudioBlock(block) {
    if (block.source_type === "url") {
      const data = parseBase64DataUrl({ dataUrl: block.url });
      if (!data) {
        throw new Error(`URL audio blocks with source_type ${block.source_type} must be formatted as a data URL for ChatOpenAI`);
      }
      const rawMimeType = data.mime_type || block.mime_type || "";
      let mimeType;
      try {
        mimeType = parseMimeType(rawMimeType);
      } catch {
        throw new Error(`Audio blocks with source_type ${block.source_type} must have mime type of audio/wav or audio/mp3`);
      }
      if (mimeType.type !== "audio" || mimeType.subtype !== "wav" && mimeType.subtype !== "mp3") {
        throw new Error(`Audio blocks with source_type ${block.source_type} must have mime type of audio/wav or audio/mp3`);
      }
      return {
        type: "input_audio",
        input_audio: {
          format: mimeType.subtype,
          data: data.data
        }
      };
    }
    if (block.source_type === "base64") {
      let mimeType;
      try {
        mimeType = parseMimeType(block.mime_type ?? "");
      } catch {
        throw new Error(`Audio blocks with source_type ${block.source_type} must have mime type of audio/wav or audio/mp3`);
      }
      if (mimeType.type !== "audio" || mimeType.subtype !== "wav" && mimeType.subtype !== "mp3") {
        throw new Error(`Audio blocks with source_type ${block.source_type} must have mime type of audio/wav or audio/mp3`);
      }
      return {
        type: "input_audio",
        input_audio: {
          format: mimeType.subtype,
          data: block.data
        }
      };
    }
    throw new Error(`Audio content blocks with source_type ${block.source_type} are not supported for ChatOpenAI`);
  },
  fromStandardFileBlock(block) {
    var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    if (block.source_type === "url") {
      const data = parseBase64DataUrl({ dataUrl: block.url });
      if (!data) {
        throw new Error(`URL file blocks with source_type ${block.source_type} must be formatted as a data URL for ChatOpenAI`);
      }
      return {
        type: "file",
        file: {
          file_data: block.url,
          ...((_a2 = block.metadata) == null ? void 0 : _a2.filename) || ((_b = block.metadata) == null ? void 0 : _b.name) ? {
            filename: ((_c = block.metadata) == null ? void 0 : _c.filename) || ((_d = block.metadata) == null ? void 0 : _d.name)
          } : {}
        }
      };
    }
    if (block.source_type === "base64") {
      return {
        type: "file",
        file: {
          file_data: `data:${block.mime_type ?? ""};base64,${block.data}`,
          ...((_e = block.metadata) == null ? void 0 : _e.filename) || ((_f = block.metadata) == null ? void 0 : _f.name) || ((_g = block.metadata) == null ? void 0 : _g.title) ? {
            filename: ((_h = block.metadata) == null ? void 0 : _h.filename) || ((_i = block.metadata) == null ? void 0 : _i.name) || ((_j = block.metadata) == null ? void 0 : _j.title)
          } : {}
        }
      };
    }
    if (block.source_type === "id") {
      return {
        type: "file",
        file: {
          file_id: block.id
        }
      };
    }
    throw new Error(`File content blocks with source_type ${block.source_type} are not supported for ChatOpenAI`);
  }
};
function _convertMessagesToOpenAIParams(messages, model) {
  return messages.flatMap((message) => {
    var _a2;
    let role = messageToOpenAIRole(message);
    if (role === "system" && isReasoningModel(model)) {
      role = "developer";
    }
    const content = typeof message.content === "string" ? message.content : message.content.map((m) => {
      if (isDataContentBlock(m)) {
        return convertToProviderContentBlock(m, completionsApiContentBlockConverter);
      }
      return m;
    });
    const completionParam = {
      role,
      content
    };
    if (message.name != null) {
      completionParam.name = message.name;
    }
    if (message.additional_kwargs.function_call != null) {
      completionParam.function_call = message.additional_kwargs.function_call;
      completionParam.content = "";
    }
    if (isAIMessage(message) && !!((_a2 = message.tool_calls) == null ? void 0 : _a2.length)) {
      completionParam.tool_calls = message.tool_calls.map(convertLangChainToolCallToOpenAI);
      completionParam.content = "";
    } else {
      if (message.additional_kwargs.tool_calls != null) {
        completionParam.tool_calls = message.additional_kwargs.tool_calls;
      }
      if (message.tool_call_id != null) {
        completionParam.tool_call_id = message.tool_call_id;
      }
    }
    if (message.additional_kwargs.audio && typeof message.additional_kwargs.audio === "object" && "id" in message.additional_kwargs.audio) {
      const audioMessage = {
        role: "assistant",
        audio: {
          id: message.additional_kwargs.audio.id
        }
      };
      return [completionParam, audioMessage];
    }
    return completionParam;
  });
}
var _FUNCTION_CALL_IDS_MAP_KEY = "__openai_function_call_ids__";
function _convertReasoningSummaryToOpenAIResponsesParams(reasoning) {
  const summary = (reasoning.summary.length > 1 ? reasoning.summary.reduce((acc, curr) => {
    const last = acc.at(-1);
    if (last.index === curr.index) {
      last.text += curr.text;
    } else {
      acc.push(curr);
    }
    return acc;
  }, [{ ...reasoning.summary[0] }]) : reasoning.summary).map((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== "index")));
  return {
    ...reasoning,
    summary
  };
}
function _convertMessagesToOpenAIResponsesParams(messages, model, zdrEnabled) {
  var _a2;
  const lastAIMessage = messages.filter((m) => isAIMessage(m)).pop();
  const lastAIMessageId = (_a2 = lastAIMessage == null ? void 0 : lastAIMessage.response_metadata) == null ? void 0 : _a2.id;
  const newMessages = lastAIMessageId && lastAIMessageId.startsWith("resp_") && !zdrEnabled ? messages.slice(messages.indexOf(lastAIMessage) + 1) : messages;
  return newMessages.flatMap((lcMsg) => {
    var _a3, _b, _c, _d;
    let role = messageToOpenAIRole(lcMsg);
    if (role === "system" && isReasoningModel(model))
      role = "developer";
    if (role === "function") {
      throw new Error("Function messages are not supported in Responses API");
    }
    if (role === "tool") {
      const toolMessage = lcMsg;
      if (((_a3 = toolMessage.additional_kwargs) == null ? void 0 : _a3.type) === "computer_call_output") {
        const output = (() => {
          if (typeof toolMessage.content === "string") {
            return {
              type: "computer_screenshot",
              image_url: toolMessage.content
            };
          }
          if (Array.isArray(toolMessage.content)) {
            const oaiScreenshot = toolMessage.content.find((i) => i.type === "computer_screenshot");
            if (oaiScreenshot)
              return oaiScreenshot;
            const lcImage = toolMessage.content.find((i) => i.type === "image_url");
            if (lcImage) {
              return {
                type: "computer_screenshot",
                image_url: typeof lcImage.image_url === "string" ? lcImage.image_url : lcImage.image_url.url
              };
            }
          }
          throw new Error("Invalid computer call output");
        })();
        return {
          type: "computer_call_output",
          output,
          call_id: toolMessage.tool_call_id
        };
      }
      return {
        type: "function_call_output",
        call_id: toolMessage.tool_call_id,
        id: ((_b = toolMessage.id) == null ? void 0 : _b.startsWith("fc_")) ? toolMessage.id : void 0,
        output: typeof toolMessage.content !== "string" ? JSON.stringify(toolMessage.content) : toolMessage.content
      };
    }
    if (role === "assistant") {
      if (!zdrEnabled && lcMsg.response_metadata.output != null && Array.isArray(lcMsg.response_metadata.output) && lcMsg.response_metadata.output.length > 0 && lcMsg.response_metadata.output.every((item) => "type" in item)) {
        return lcMsg.response_metadata.output;
      }
      const input = [];
      if (!zdrEnabled && lcMsg.additional_kwargs.reasoning != null) {
        const isReasoningItem = (item) => typeof item === "object" && item != null && "type" in item && item.type === "reasoning";
        if (isReasoningItem(lcMsg.additional_kwargs.reasoning)) {
          const reasoningItem = _convertReasoningSummaryToOpenAIResponsesParams(lcMsg.additional_kwargs.reasoning);
          input.push(reasoningItem);
        }
      }
      let { content: content2 } = lcMsg;
      if (lcMsg.additional_kwargs.refusal != null) {
        if (typeof content2 === "string") {
          content2 = [{ type: "output_text", text: content2, annotations: [] }];
        }
        content2 = [
          ...content2,
          { type: "refusal", refusal: lcMsg.additional_kwargs.refusal }
        ];
      }
      input.push({
        type: "message",
        role: "assistant",
        ...lcMsg.id && !zdrEnabled ? { id: lcMsg.id } : {},
        content: typeof content2 === "string" ? content2 : content2.flatMap((item) => {
          if (item.type === "text") {
            return {
              type: "output_text",
              text: item.text,
              // @ts-expect-error TODO: add types for `annotations`
              annotations: item.annotations ?? []
            };
          }
          if (item.type === "output_text" || item.type === "refusal") {
            return item;
          }
          return [];
        })
      });
      const functionCallIds = (
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        lcMsg.additional_kwargs[_FUNCTION_CALL_IDS_MAP_KEY]
      );
      if (isAIMessage(lcMsg) && !!((_c = lcMsg.tool_calls) == null ? void 0 : _c.length)) {
        input.push(...lcMsg.tool_calls.map((toolCall) => ({
          type: "function_call",
          name: toolCall.name,
          arguments: JSON.stringify(toolCall.args),
          call_id: toolCall.id,
          ...zdrEnabled ? { id: functionCallIds == null ? void 0 : functionCallIds[toolCall.id] } : {}
        })));
      } else if (lcMsg.additional_kwargs.tool_calls != null) {
        input.push(...lcMsg.additional_kwargs.tool_calls.map((toolCall) => ({
          type: "function_call",
          name: toolCall.function.name,
          call_id: toolCall.id,
          ...zdrEnabled ? { id: functionCallIds == null ? void 0 : functionCallIds[toolCall.id] } : {},
          arguments: toolCall.function.arguments
        })));
      }
      const toolOutputs = ((_d = lcMsg.response_metadata.output) == null ? void 0 : _d.length) ? lcMsg.response_metadata.output : lcMsg.additional_kwargs.tool_outputs;
      let computerCalls = [];
      if (toolOutputs != null) {
        const castToolOutputs = toolOutputs;
        computerCalls = castToolOutputs == null ? void 0 : castToolOutputs.filter((item) => item.type === "computer_call");
        if (computerCalls.length > 0)
          input.push(...computerCalls);
      }
      return input;
    }
    const content = typeof lcMsg.content === "string" ? lcMsg.content : lcMsg.content.flatMap((item) => {
      if (isDataContentBlock(item)) {
        return convertToProviderContentBlock(item, completionsApiContentBlockConverter);
      }
      if (item.type === "text") {
        return { type: "input_text", text: item.text };
      }
      if (item.type === "image_url") {
        const image_url = typeof item.image_url === "string" ? item.image_url : item.image_url.url;
        const detail = typeof item.image_url === "string" ? "auto" : item.image_url.detail;
        return { type: "input_image", image_url, detail };
      }
      if (item.type === "input_text" || item.type === "input_image" || item.type === "input_file") {
        return item;
      }
      return [];
    });
    if (role === "user" || role === "system" || role === "developer") {
      return { type: "message", role, content };
    }
    console.warn(`Unsupported role found when converting to OpenAI Responses API: ${role}`);
    return [];
  });
}
function _convertOpenAIResponsesMessageToBaseMessage(response) {
  if (response.error) {
    const error = new Error(response.error.message);
    error.name = response.error.code;
    throw error;
  }
  let messageId;
  const content = [];
  const tool_calls = [];
  const invalid_tool_calls = [];
  const response_metadata = {
    model: response.model,
    created_at: response.created_at,
    id: response.id,
    incomplete_details: response.incomplete_details,
    metadata: response.metadata,
    object: response.object,
    status: response.status,
    user: response.user,
    // for compatibility with chat completion calls.
    model_name: response.model
  };
  const additional_kwargs = {};
  for (const item of response.output) {
    if (item.type === "message") {
      messageId = item.id;
      content.push(...item.content.flatMap((part) => {
        if (part.type === "output_text") {
          if ("parsed" in part && part.parsed != null) {
            additional_kwargs.parsed = part.parsed;
          }
          return {
            type: "text",
            text: part.text,
            annotations: part.annotations
          };
        }
        if (part.type === "refusal") {
          additional_kwargs.refusal = part.refusal;
          return [];
        }
        return part;
      }));
    } else if (item.type === "function_call") {
      const fnAdapter = {
        function: { name: item.name, arguments: item.arguments },
        id: item.call_id
      };
      try {
        tool_calls.push(parseToolCall3(fnAdapter, { returnId: true }));
      } catch (e) {
        let errMessage;
        if (typeof e === "object" && e != null && "message" in e && typeof e.message === "string") {
          errMessage = e.message;
        }
        invalid_tool_calls.push(makeInvalidToolCall(fnAdapter, errMessage));
      }
      additional_kwargs[_FUNCTION_CALL_IDS_MAP_KEY] ?? (additional_kwargs[_FUNCTION_CALL_IDS_MAP_KEY] = {});
      if (item.id) {
        additional_kwargs[_FUNCTION_CALL_IDS_MAP_KEY][item.call_id] = item.id;
      }
    } else if (item.type === "reasoning") {
      additional_kwargs.reasoning = item;
    } else {
      additional_kwargs.tool_outputs ?? (additional_kwargs.tool_outputs = []);
      additional_kwargs.tool_outputs.push(item);
    }
  }
  return new AIMessage({
    id: messageId,
    content,
    tool_calls,
    invalid_tool_calls,
    usage_metadata: response.usage,
    additional_kwargs,
    response_metadata
  });
}
function _convertOpenAIResponsesDeltaToBaseMessageChunk(chunk) {
  var _a2, _b;
  const content = [];
  let generationInfo = {};
  let usage_metadata;
  const tool_call_chunks = [];
  const response_metadata = {};
  const additional_kwargs = {};
  let id;
  if (chunk.type === "response.output_text.delta") {
    content.push({
      type: "text",
      text: chunk.delta,
      index: chunk.content_index
    });
  } else if (chunk.type === "response.output_text.annotation.added") {
    content.push({
      type: "text",
      text: "",
      annotations: [chunk.annotation],
      index: chunk.content_index
    });
  } else if (chunk.type === "response.output_item.added" && chunk.item.type === "message") {
    id = chunk.item.id;
  } else if (chunk.type === "response.output_item.added" && chunk.item.type === "function_call") {
    tool_call_chunks.push({
      type: "tool_call_chunk",
      name: chunk.item.name,
      args: chunk.item.arguments,
      id: chunk.item.call_id,
      index: chunk.output_index
    });
    additional_kwargs[_FUNCTION_CALL_IDS_MAP_KEY] = {
      [chunk.item.call_id]: chunk.item.id
    };
  } else if (chunk.type === "response.output_item.done" && (chunk.item.type === "web_search_call" || chunk.item.type === "file_search_call" || chunk.item.type === "computer_call")) {
    additional_kwargs.tool_outputs = [chunk.item];
  } else if (chunk.type === "response.created") {
    response_metadata.id = chunk.response.id;
    response_metadata.model_name = chunk.response.model;
    response_metadata.model = chunk.response.model;
  } else if (chunk.type === "response.completed") {
    const msg = _convertOpenAIResponsesMessageToBaseMessage(chunk.response);
    usage_metadata = chunk.response.usage;
    if (((_b = (_a2 = chunk.response.text) == null ? void 0 : _a2.format) == null ? void 0 : _b.type) === "json_schema") {
      additional_kwargs.parsed ?? (additional_kwargs.parsed = JSON.parse(msg.text));
    }
    for (const [key, value] of Object.entries(chunk.response)) {
      if (key !== "id")
        response_metadata[key] = value;
    }
  } else if (chunk.type === "response.function_call_arguments.delta") {
    tool_call_chunks.push({
      type: "tool_call_chunk",
      args: chunk.delta,
      index: chunk.output_index
    });
  } else if (chunk.type === "response.web_search_call.completed" || chunk.type === "response.file_search_call.completed") {
    generationInfo = {
      tool_outputs: {
        id: chunk.item_id,
        type: chunk.type.replace("response.", "").replace(".completed", ""),
        status: "completed"
      }
    };
  } else if (chunk.type === "response.refusal.done") {
    additional_kwargs.refusal = chunk.refusal;
  } else if (chunk.type === "response.output_item.added" && "item" in chunk && chunk.item.type === "reasoning") {
    const summary = chunk.item.summary ? chunk.item.summary.map((s, index) => ({
      ...s,
      index
    })) : void 0;
    additional_kwargs.reasoning = {
      // We only capture ID in the first chunk or else the concatenated result of all chunks will
      // have an ID field that is repeated once per chunk. There is special handling for the `type`
      // field that prevents this, however.
      id: chunk.item.id,
      type: chunk.item.type,
      ...summary ? { summary } : {}
    };
  } else if (chunk.type === "response.reasoning_summary_part.added") {
    additional_kwargs.reasoning = {
      type: "reasoning",
      summary: [{ ...chunk.part, index: chunk.summary_index }]
    };
  } else if (chunk.type === "response.reasoning_summary_text.delta") {
    additional_kwargs.reasoning = {
      type: "reasoning",
      summary: [
        { text: chunk.delta, type: "summary_text", index: chunk.summary_index }
      ]
    };
  } else {
    return null;
  }
  return new ChatGenerationChunk({
    // Legacy reasons, `onLLMNewToken` should pulls this out
    text: content.map((part) => part.text).join(""),
    message: new AIMessageChunk({
      id,
      content,
      tool_call_chunks,
      usage_metadata,
      additional_kwargs,
      response_metadata
    }),
    generationInfo
  });
}
function isBuiltInTool(tool) {
  return "type" in tool && tool.type !== "function";
}
function isBuiltInToolChoice(tool_choice) {
  return tool_choice != null && typeof tool_choice === "object" && "type" in tool_choice && tool_choice.type !== "function";
}
function _convertChatOpenAIToolTypeToOpenAITool(tool, fields) {
  if (isOpenAITool(tool)) {
    if ((fields == null ? void 0 : fields.strict) !== void 0) {
      return {
        ...tool,
        function: {
          ...tool.function,
          strict: fields.strict
        }
      };
    }
    return tool;
  }
  return _convertToOpenAITool(tool, fields);
}
function isReasoningModel(model) {
  return model && /^o\d/.test(model);
}
var ChatOpenAI = class extends BaseChatModel {
  static lc_name() {
    return "ChatOpenAI";
  }
  get callKeys() {
    return [
      ...super.callKeys,
      "options",
      "function_call",
      "functions",
      "tools",
      "tool_choice",
      "promptIndex",
      "response_format",
      "seed",
      "reasoning_effort"
    ];
  }
  get lc_secrets() {
    return {
      openAIApiKey: "OPENAI_API_KEY",
      apiKey: "OPENAI_API_KEY",
      organization: "OPENAI_ORGANIZATION"
    };
  }
  get lc_aliases() {
    return {
      modelName: "model",
      openAIApiKey: "openai_api_key",
      apiKey: "openai_api_key"
    };
  }
  get lc_serializable_keys() {
    return [
      "configuration",
      "logprobs",
      "topLogprobs",
      "prefixMessages",
      "supportsStrictToolCalling",
      "modalities",
      "audio",
      "reasoningEffort",
      "temperature",
      "maxTokens",
      "topP",
      "frequencyPenalty",
      "presencePenalty",
      "n",
      "logitBias",
      "user",
      "streaming",
      "streamUsage",
      "modelName",
      "model",
      "modelKwargs",
      "stop",
      "stopSequences",
      "timeout",
      "openAIApiKey",
      "apiKey",
      "cache",
      "maxConcurrency",
      "maxRetries",
      "verbose",
      "callbacks",
      "tags",
      "metadata",
      "disableStreaming",
      "useResponsesApi",
      "zdrEnabled",
      "reasoning"
    ];
  }
  constructor(fields) {
    var _a2, _b, _c;
    super(fields ?? {});
    Object.defineProperty(this, "lc_serializable", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: true
    });
    Object.defineProperty(this, "temperature", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "topP", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "frequencyPenalty", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "presencePenalty", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "n", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "logitBias", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "modelName", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "model", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "gpt-3.5-turbo"
    });
    Object.defineProperty(this, "modelKwargs", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "stop", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "stopSequences", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "user", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "timeout", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "streaming", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: false
    });
    Object.defineProperty(this, "streamUsage", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: true
    });
    Object.defineProperty(this, "maxTokens", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "logprobs", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "topLogprobs", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "openAIApiKey", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "apiKey", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "organization", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "__includeRawResponse", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "client", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "clientConfig", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "supportsStrictToolCalling", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "audio", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "modalities", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "reasoningEffort", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "reasoning", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "useResponsesApi", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: false
    });
    Object.defineProperty(this, "zdrEnabled", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.openAIApiKey = (fields == null ? void 0 : fields.apiKey) ?? (fields == null ? void 0 : fields.openAIApiKey) ?? ((_a2 = fields == null ? void 0 : fields.configuration) == null ? void 0 : _a2.apiKey) ?? getEnvironmentVariable("OPENAI_API_KEY");
    this.apiKey = this.openAIApiKey;
    this.organization = ((_b = fields == null ? void 0 : fields.configuration) == null ? void 0 : _b.organization) ?? getEnvironmentVariable("OPENAI_ORGANIZATION");
    this.model = (fields == null ? void 0 : fields.model) ?? (fields == null ? void 0 : fields.modelName) ?? this.model;
    this.modelName = this.model;
    this.modelKwargs = (fields == null ? void 0 : fields.modelKwargs) ?? {};
    this.timeout = fields == null ? void 0 : fields.timeout;
    this.temperature = (fields == null ? void 0 : fields.temperature) ?? this.temperature;
    this.topP = (fields == null ? void 0 : fields.topP) ?? this.topP;
    this.frequencyPenalty = (fields == null ? void 0 : fields.frequencyPenalty) ?? this.frequencyPenalty;
    this.presencePenalty = (fields == null ? void 0 : fields.presencePenalty) ?? this.presencePenalty;
    this.logprobs = fields == null ? void 0 : fields.logprobs;
    this.topLogprobs = fields == null ? void 0 : fields.topLogprobs;
    this.n = (fields == null ? void 0 : fields.n) ?? this.n;
    this.logitBias = fields == null ? void 0 : fields.logitBias;
    this.stop = (fields == null ? void 0 : fields.stopSequences) ?? (fields == null ? void 0 : fields.stop);
    this.stopSequences = this.stop;
    this.user = fields == null ? void 0 : fields.user;
    this.__includeRawResponse = fields == null ? void 0 : fields.__includeRawResponse;
    this.audio = fields == null ? void 0 : fields.audio;
    this.modalities = fields == null ? void 0 : fields.modalities;
    this.reasoningEffort = (fields == null ? void 0 : fields.reasoningEffort) ?? ((_c = fields == null ? void 0 : fields.reasoning) == null ? void 0 : _c.effort);
    this.reasoning = (fields == null ? void 0 : fields.reasoning) ?? ((fields == null ? void 0 : fields.reasoningEffort) ? { effort: fields.reasoningEffort } : void 0);
    this.maxTokens = (fields == null ? void 0 : fields.maxCompletionTokens) ?? (fields == null ? void 0 : fields.maxTokens);
    this.useResponsesApi = (fields == null ? void 0 : fields.useResponsesApi) ?? this.useResponsesApi;
    this.disableStreaming = (fields == null ? void 0 : fields.disableStreaming) ?? this.disableStreaming;
    this.streaming = (fields == null ? void 0 : fields.streaming) ?? false;
    if (this.disableStreaming)
      this.streaming = false;
    this.streamUsage = (fields == null ? void 0 : fields.streamUsage) ?? this.streamUsage;
    if (this.disableStreaming)
      this.streamUsage = false;
    this.clientConfig = {
      apiKey: this.apiKey,
      organization: this.organization,
      dangerouslyAllowBrowser: true,
      ...fields == null ? void 0 : fields.configuration
    };
    if ((fields == null ? void 0 : fields.supportsStrictToolCalling) !== void 0) {
      this.supportsStrictToolCalling = fields.supportsStrictToolCalling;
    }
    this.zdrEnabled = (fields == null ? void 0 : fields.zdrEnabled) ?? false;
  }
  getLsParams(options) {
    const params = this.invocationParams(options);
    return {
      ls_provider: "openai",
      ls_model_name: this.model,
      ls_model_type: "chat",
      ls_temperature: params.temperature ?? void 0,
      ls_max_tokens: params.max_tokens ?? void 0,
      ls_stop: options.stop
    };
  }
  bindTools(tools, kwargs) {
    let strict;
    if ((kwargs == null ? void 0 : kwargs.strict) !== void 0) {
      strict = kwargs.strict;
    } else if (this.supportsStrictToolCalling !== void 0) {
      strict = this.supportsStrictToolCalling;
    }
    return this.withConfig({
      tools: tools.map((tool) => isBuiltInTool(tool) ? tool : _convertChatOpenAIToolTypeToOpenAITool(tool, { strict })),
      ...kwargs
    });
  }
  createResponseFormat(resFormat) {
    if (resFormat && resFormat.type === "json_schema" && resFormat.json_schema.schema && isZodSchema2(resFormat.json_schema.schema)) {
      return zodResponseFormat(resFormat.json_schema.schema, resFormat.json_schema.name, {
        description: resFormat.json_schema.description
      });
    }
    return resFormat;
  }
  getReasoningParams(options) {
    if (!isReasoningModel(this.model)) {
      return;
    }
    let reasoning;
    if (this.reasoningEffort !== void 0) {
      reasoning = { effort: this.reasoningEffort };
    }
    if (this.reasoning !== void 0) {
      reasoning = {
        ...reasoning,
        ...this.reasoning
      };
    }
    if ((options == null ? void 0 : options.reasoning_effort) !== void 0) {
      reasoning = {
        ...reasoning,
        effort: options.reasoning_effort
      };
    }
    if ((options == null ? void 0 : options.reasoning) !== void 0) {
      reasoning = {
        ...reasoning,
        ...options.reasoning
      };
    }
    return reasoning;
  }
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(options, extra) {
    var _a2, _b;
    let strict;
    if ((options == null ? void 0 : options.strict) !== void 0) {
      strict = options.strict;
    } else if (this.supportsStrictToolCalling !== void 0) {
      strict = this.supportsStrictToolCalling;
    }
    if (this._useResponseApi(options)) {
      const params2 = {
        model: this.model,
        temperature: this.temperature,
        top_p: this.topP,
        user: this.user,
        // if include_usage is set or streamUsage then stream must be set to true.
        stream: this.streaming,
        previous_response_id: options == null ? void 0 : options.previous_response_id,
        truncation: options == null ? void 0 : options.truncation,
        include: options == null ? void 0 : options.include,
        tools: ((_a2 = options == null ? void 0 : options.tools) == null ? void 0 : _a2.length) ? options.tools.map((tool) => {
          if (isBuiltInTool(tool)) {
            return tool;
          } else if (isOpenAITool(tool)) {
            return {
              type: "function",
              name: tool.function.name,
              parameters: tool.function.parameters,
              description: tool.function.description,
              strict
            };
          } else {
            return null;
          }
        }).filter((tool) => tool !== null) : void 0,
        tool_choice: isBuiltInToolChoice(options == null ? void 0 : options.tool_choice) ? options == null ? void 0 : options.tool_choice : (() => {
          const formatted = formatToOpenAIToolChoice(options == null ? void 0 : options.tool_choice);
          if (typeof formatted === "object" && "type" in formatted) {
            return { type: "function", name: formatted.function.name };
          } else {
            return void 0;
          }
        })(),
        text: (() => {
          if (options == null ? void 0 : options.text)
            return options.text;
          const format = this.createResponseFormat(options == null ? void 0 : options.response_format);
          if ((format == null ? void 0 : format.type) === "json_schema") {
            if (format.json_schema.schema != null) {
              return {
                format: {
                  type: "json_schema",
                  schema: format.json_schema.schema,
                  description: format.json_schema.description,
                  name: format.json_schema.name,
                  strict: format.json_schema.strict
                }
              };
            }
            return void 0;
          }
          return { format };
        })(),
        parallel_tool_calls: options == null ? void 0 : options.parallel_tool_calls,
        max_output_tokens: this.maxTokens === -1 ? void 0 : this.maxTokens,
        ...this.zdrEnabled ? { store: false } : {},
        ...this.modelKwargs
      };
      const reasoning2 = this.getReasoningParams(options);
      if (reasoning2 !== void 0) {
        params2.reasoning = reasoning2;
      }
      return params2;
    }
    let streamOptionsConfig = {};
    if ((options == null ? void 0 : options.stream_options) !== void 0) {
      streamOptionsConfig = { stream_options: options.stream_options };
    } else if (this.streamUsage && (this.streaming || (extra == null ? void 0 : extra.streaming))) {
      streamOptionsConfig = { stream_options: { include_usage: true } };
    }
    const params = {
      model: this.model,
      temperature: this.temperature,
      top_p: this.topP,
      frequency_penalty: this.frequencyPenalty,
      presence_penalty: this.presencePenalty,
      logprobs: this.logprobs,
      top_logprobs: this.topLogprobs,
      n: this.n,
      logit_bias: this.logitBias,
      stop: (options == null ? void 0 : options.stop) ?? this.stopSequences,
      user: this.user,
      // if include_usage is set or streamUsage then stream must be set to true.
      stream: this.streaming,
      functions: options == null ? void 0 : options.functions,
      function_call: options == null ? void 0 : options.function_call,
      tools: ((_b = options == null ? void 0 : options.tools) == null ? void 0 : _b.length) ? options.tools.map((tool) => _convertChatOpenAIToolTypeToOpenAITool(tool, { strict })) : void 0,
      tool_choice: formatToOpenAIToolChoice(options == null ? void 0 : options.tool_choice),
      response_format: this.createResponseFormat(options == null ? void 0 : options.response_format),
      seed: options == null ? void 0 : options.seed,
      ...streamOptionsConfig,
      parallel_tool_calls: options == null ? void 0 : options.parallel_tool_calls,
      ...this.audio || (options == null ? void 0 : options.audio) ? { audio: this.audio || (options == null ? void 0 : options.audio) } : {},
      ...this.modalities || (options == null ? void 0 : options.modalities) ? { modalities: this.modalities || (options == null ? void 0 : options.modalities) } : {},
      ...this.modelKwargs
    };
    if ((options == null ? void 0 : options.prediction) !== void 0) {
      params.prediction = options.prediction;
    }
    const reasoning = this.getReasoningParams(options);
    if (reasoning !== void 0 && reasoning.effort !== void 0) {
      params.reasoning_effort = reasoning.effort;
    }
    if (isReasoningModel(params.model)) {
      params.max_completion_tokens = this.maxTokens === -1 ? void 0 : this.maxTokens;
    } else {
      params.max_tokens = this.maxTokens === -1 ? void 0 : this.maxTokens;
    }
    return params;
  }
  _convertOpenAIChatCompletionMessageToBaseMessage(message, rawResponse) {
    const rawToolCalls = message.tool_calls;
    switch (message.role) {
      case "assistant": {
        const toolCalls = [];
        const invalidToolCalls = [];
        for (const rawToolCall of rawToolCalls ?? []) {
          try {
            toolCalls.push(parseToolCall3(rawToolCall, { returnId: true }));
          } catch (e) {
            invalidToolCalls.push(makeInvalidToolCall(rawToolCall, e.message));
          }
        }
        const additional_kwargs = {
          function_call: message.function_call,
          tool_calls: rawToolCalls
        };
        if (this.__includeRawResponse !== void 0) {
          additional_kwargs.__raw_response = rawResponse;
        }
        const response_metadata = {
          model_name: rawResponse.model,
          ...rawResponse.system_fingerprint ? {
            usage: { ...rawResponse.usage },
            system_fingerprint: rawResponse.system_fingerprint
          } : {}
        };
        if (message.audio) {
          additional_kwargs.audio = message.audio;
        }
        return new AIMessage({
          content: message.content || "",
          tool_calls: toolCalls,
          invalid_tool_calls: invalidToolCalls,
          additional_kwargs,
          response_metadata,
          id: rawResponse.id
        });
      }
      default:
        return new ChatMessage(message.content || "", message.role ?? "unknown");
    }
  }
  _convertOpenAIDeltaToBaseMessageChunk(delta, rawResponse, defaultRole) {
    var _a2, _b;
    const role = delta.role ?? defaultRole;
    const content = delta.content ?? "";
    let additional_kwargs;
    if (delta.function_call) {
      additional_kwargs = {
        function_call: delta.function_call
      };
    } else if (delta.tool_calls) {
      additional_kwargs = {
        tool_calls: delta.tool_calls
      };
    } else {
      additional_kwargs = {};
    }
    if (this.__includeRawResponse) {
      additional_kwargs.__raw_response = rawResponse;
    }
    if (delta.audio) {
      additional_kwargs.audio = {
        ...delta.audio,
        index: rawResponse.choices[0].index
      };
    }
    const response_metadata = { usage: { ...rawResponse.usage } };
    if (role === "user") {
      return new HumanMessageChunk({ content, response_metadata });
    } else if (role === "assistant") {
      const toolCallChunks = [];
      if (Array.isArray(delta.tool_calls)) {
        for (const rawToolCall of delta.tool_calls) {
          toolCallChunks.push({
            name: (_a2 = rawToolCall.function) == null ? void 0 : _a2.name,
            args: (_b = rawToolCall.function) == null ? void 0 : _b.arguments,
            id: rawToolCall.id,
            index: rawToolCall.index,
            type: "tool_call_chunk"
          });
        }
      }
      return new AIMessageChunk({
        content,
        tool_call_chunks: toolCallChunks,
        additional_kwargs,
        id: rawResponse.id,
        response_metadata
      });
    } else if (role === "system") {
      return new SystemMessageChunk({ content, response_metadata });
    } else if (role === "developer") {
      return new SystemMessageChunk({
        content,
        response_metadata,
        additional_kwargs: {
          __openai_role__: "developer"
        }
      });
    } else if (role === "function") {
      return new FunctionMessageChunk({
        content,
        additional_kwargs,
        name: delta.name,
        response_metadata
      });
    } else if (role === "tool") {
      return new ToolMessageChunk({
        content,
        additional_kwargs,
        tool_call_id: delta.tool_call_id,
        response_metadata
      });
    } else {
      return new ChatMessageChunk({ content, role, response_metadata });
    }
  }
  /** @ignore */
  _identifyingParams() {
    return {
      model_name: this.model,
      ...this.invocationParams(),
      ...this.clientConfig
    };
  }
  async *_streamResponseChunks(messages, options, runManager) {
    var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    if (this._useResponseApi(options)) {
      const lastAIMessage = messages.filter((m) => isAIMessage(m)).pop();
      const lastAIMessageId = (_a2 = lastAIMessage == null ? void 0 : lastAIMessage.response_metadata) == null ? void 0 : _a2.id;
      const streamIterable2 = await this.responseApiWithRetry({
        ...this.invocationParams(options, { streaming: true }),
        input: _convertMessagesToOpenAIResponsesParams(messages, this.model, this.zdrEnabled),
        stream: true,
        ...lastAIMessageId && lastAIMessageId.startsWith("resp_") && !this.zdrEnabled ? { previous_response_id: lastAIMessageId } : {}
      }, options);
      for await (const data of streamIterable2) {
        const chunk = _convertOpenAIResponsesDeltaToBaseMessageChunk(data);
        if (chunk == null)
          continue;
        yield chunk;
      }
      return;
    }
    const messagesMapped = _convertMessagesToOpenAIParams(messages, this.model);
    const params = {
      ...this.invocationParams(options, {
        streaming: true
      }),
      messages: messagesMapped,
      stream: true
    };
    let defaultRole;
    const streamIterable = await this.completionWithRetry(params, options);
    let usage;
    for await (const data of streamIterable) {
      const choice = (_b = data == null ? void 0 : data.choices) == null ? void 0 : _b[0];
      if (data.usage) {
        usage = data.usage;
      }
      if (!choice) {
        continue;
      }
      const { delta } = choice;
      if (!delta) {
        continue;
      }
      const chunk = this._convertOpenAIDeltaToBaseMessageChunk(delta, data, defaultRole);
      defaultRole = delta.role ?? defaultRole;
      const newTokenIndices = {
        prompt: options.promptIndex ?? 0,
        completion: choice.index ?? 0
      };
      if (typeof chunk.content !== "string") {
        console.log("[WARNING]: Received non-string content from OpenAI. This is currently not supported.");
        continue;
      }
      const generationInfo = { ...newTokenIndices };
      if (choice.finish_reason != null) {
        generationInfo.finish_reason = choice.finish_reason;
        generationInfo.system_fingerprint = data.system_fingerprint;
        generationInfo.model_name = data.model;
      }
      if (this.logprobs) {
        generationInfo.logprobs = choice.logprobs;
      }
      const generationChunk = new ChatGenerationChunk({
        message: chunk,
        text: chunk.content,
        generationInfo
      });
      yield generationChunk;
      await (runManager == null ? void 0 : runManager.handleLLMNewToken(generationChunk.text ?? "", newTokenIndices, void 0, void 0, void 0, { chunk: generationChunk }));
    }
    if (usage) {
      const inputTokenDetails = {
        ...((_c = usage.prompt_tokens_details) == null ? void 0 : _c.audio_tokens) !== null && {
          audio: (_d = usage.prompt_tokens_details) == null ? void 0 : _d.audio_tokens
        },
        ...((_e = usage.prompt_tokens_details) == null ? void 0 : _e.cached_tokens) !== null && {
          cache_read: (_f = usage.prompt_tokens_details) == null ? void 0 : _f.cached_tokens
        }
      };
      const outputTokenDetails = {
        ...((_g = usage.completion_tokens_details) == null ? void 0 : _g.audio_tokens) !== null && {
          audio: (_h = usage.completion_tokens_details) == null ? void 0 : _h.audio_tokens
        },
        ...((_i = usage.completion_tokens_details) == null ? void 0 : _i.reasoning_tokens) !== null && {
          reasoning: (_j = usage.completion_tokens_details) == null ? void 0 : _j.reasoning_tokens
        }
      };
      const generationChunk = new ChatGenerationChunk({
        message: new AIMessageChunk({
          content: "",
          response_metadata: {
            usage: { ...usage }
          },
          usage_metadata: {
            input_tokens: usage.prompt_tokens,
            output_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
            ...Object.keys(inputTokenDetails).length > 0 && {
              input_token_details: inputTokenDetails
            },
            ...Object.keys(outputTokenDetails).length > 0 && {
              output_token_details: outputTokenDetails
            }
          }
        }),
        text: ""
      });
      yield generationChunk;
    }
    if ((_k = options.signal) == null ? void 0 : _k.aborted) {
      throw new Error("AbortError");
    }
  }
  /**
   * Get the identifying parameters for the model
   *
   */
  identifyingParams() {
    return this._identifyingParams();
  }
  /** @ignore */
  async _responseApiGenerate(messages, options, runManager) {
    var _a2, _b;
    const invocationParams = this.invocationParams(options);
    if (invocationParams.stream) {
      const stream = this._streamResponseChunks(messages, options, runManager);
      let finalChunk;
      for await (const chunk of stream) {
        chunk.message.response_metadata = {
          ...chunk.generationInfo,
          ...chunk.message.response_metadata
        };
        finalChunk = (finalChunk == null ? void 0 : finalChunk.concat(chunk)) ?? chunk;
      }
      return {
        generations: finalChunk ? [finalChunk] : [],
        llmOutput: {
          estimatedTokenUsage: (_a2 = finalChunk == null ? void 0 : finalChunk.message) == null ? void 0 : _a2.usage_metadata
        }
      };
    }
    const lastAIMessage = messages.filter((m) => isAIMessage(m)).pop();
    const lastAIMessageId = (_b = lastAIMessage == null ? void 0 : lastAIMessage.response_metadata) == null ? void 0 : _b.id;
    const input = _convertMessagesToOpenAIResponsesParams(messages, this.model, this.zdrEnabled);
    const data = await this.responseApiWithRetry({
      input,
      ...invocationParams,
      ...lastAIMessageId && lastAIMessageId.startsWith("resp_") && !this.zdrEnabled ? { previous_response_id: lastAIMessageId } : {}
    }, { signal: options == null ? void 0 : options.signal, ...options == null ? void 0 : options.options });
    return {
      generations: [
        {
          text: data.output_text,
          message: _convertOpenAIResponsesMessageToBaseMessage(data)
        }
      ],
      llmOutput: {
        id: data.id,
        estimatedTokenUsage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.total_tokens
        } : void 0
      }
    };
  }
  /**
   * Determines whether the responses API should be used for the given request.
   *
   * @internal
   *
   * @param options The parsed call options for the request.
   * @returns `true` if the responses API should be used, either because it is explicitly enabled,
   * or because the request requires it.
   */
  _useResponseApi(options) {
    var _a2, _b, _c;
    const usesBuiltInTools = (_a2 = options == null ? void 0 : options.tools) == null ? void 0 : _a2.some(isBuiltInTool);
    const hasResponsesOnlyKwargs = (options == null ? void 0 : options.previous_response_id) != null || (options == null ? void 0 : options.text) != null || (options == null ? void 0 : options.truncation) != null || (options == null ? void 0 : options.include) != null || ((_b = options == null ? void 0 : options.reasoning) == null ? void 0 : _b.summary) != null || ((_c = this.reasoning) == null ? void 0 : _c.summary) != null;
    return this.useResponsesApi || usesBuiltInTools || hasResponsesOnlyKwargs;
  }
  /** @ignore */
  async _generate(messages, options, runManager) {
    var _a2, _b;
    if (this._useResponseApi(options)) {
      return this._responseApiGenerate(messages, options, runManager);
    }
    const usageMetadata = {};
    const params = this.invocationParams(options);
    const messagesMapped = _convertMessagesToOpenAIParams(messages, this.model);
    if (params.stream) {
      const stream = this._streamResponseChunks(messages, options, runManager);
      const finalChunks = {};
      for await (const chunk of stream) {
        chunk.message.response_metadata = {
          ...chunk.generationInfo,
          ...chunk.message.response_metadata
        };
        const index = ((_a2 = chunk.generationInfo) == null ? void 0 : _a2.completion) ?? 0;
        if (finalChunks[index] === void 0) {
          finalChunks[index] = chunk;
        } else {
          finalChunks[index] = finalChunks[index].concat(chunk);
        }
      }
      const generations = Object.entries(finalChunks).sort(([aKey], [bKey]) => parseInt(aKey, 10) - parseInt(bKey, 10)).map(([_, value]) => value);
      const { functions, function_call } = this.invocationParams(options);
      const promptTokenUsage = await this.getEstimatedTokenCountFromPrompt(messages, functions, function_call);
      const completionTokenUsage = await this.getNumTokensFromGenerations(generations);
      usageMetadata.input_tokens = promptTokenUsage;
      usageMetadata.output_tokens = completionTokenUsage;
      usageMetadata.total_tokens = promptTokenUsage + completionTokenUsage;
      return {
        generations,
        llmOutput: {
          estimatedTokenUsage: {
            promptTokens: usageMetadata.input_tokens,
            completionTokens: usageMetadata.output_tokens,
            totalTokens: usageMetadata.total_tokens
          }
        }
      };
    } else {
      let data;
      if (options.response_format && options.response_format.type === "json_schema") {
        data = await this.betaParsedCompletionWithRetry({
          ...params,
          stream: false,
          messages: messagesMapped
        }, {
          signal: options == null ? void 0 : options.signal,
          ...options == null ? void 0 : options.options
        });
      } else {
        data = await this.completionWithRetry({
          ...params,
          stream: false,
          messages: messagesMapped
        }, {
          signal: options == null ? void 0 : options.signal,
          ...options == null ? void 0 : options.options
        });
      }
      const { completion_tokens: completionTokens, prompt_tokens: promptTokens, total_tokens: totalTokens, prompt_tokens_details: promptTokensDetails, completion_tokens_details: completionTokensDetails } = (data == null ? void 0 : data.usage) ?? {};
      if (completionTokens) {
        usageMetadata.output_tokens = (usageMetadata.output_tokens ?? 0) + completionTokens;
      }
      if (promptTokens) {
        usageMetadata.input_tokens = (usageMetadata.input_tokens ?? 0) + promptTokens;
      }
      if (totalTokens) {
        usageMetadata.total_tokens = (usageMetadata.total_tokens ?? 0) + totalTokens;
      }
      if ((promptTokensDetails == null ? void 0 : promptTokensDetails.audio_tokens) !== null || (promptTokensDetails == null ? void 0 : promptTokensDetails.cached_tokens) !== null) {
        usageMetadata.input_token_details = {
          ...(promptTokensDetails == null ? void 0 : promptTokensDetails.audio_tokens) !== null && {
            audio: promptTokensDetails == null ? void 0 : promptTokensDetails.audio_tokens
          },
          ...(promptTokensDetails == null ? void 0 : promptTokensDetails.cached_tokens) !== null && {
            cache_read: promptTokensDetails == null ? void 0 : promptTokensDetails.cached_tokens
          }
        };
      }
      if ((completionTokensDetails == null ? void 0 : completionTokensDetails.audio_tokens) !== null || (completionTokensDetails == null ? void 0 : completionTokensDetails.reasoning_tokens) !== null) {
        usageMetadata.output_token_details = {
          ...(completionTokensDetails == null ? void 0 : completionTokensDetails.audio_tokens) !== null && {
            audio: completionTokensDetails == null ? void 0 : completionTokensDetails.audio_tokens
          },
          ...(completionTokensDetails == null ? void 0 : completionTokensDetails.reasoning_tokens) !== null && {
            reasoning: completionTokensDetails == null ? void 0 : completionTokensDetails.reasoning_tokens
          }
        };
      }
      const generations = [];
      for (const part of (data == null ? void 0 : data.choices) ?? []) {
        const text = ((_b = part.message) == null ? void 0 : _b.content) ?? "";
        const generation = {
          text,
          message: this._convertOpenAIChatCompletionMessageToBaseMessage(part.message ?? { role: "assistant" }, data)
        };
        generation.generationInfo = {
          ...part.finish_reason ? { finish_reason: part.finish_reason } : {},
          ...part.logprobs ? { logprobs: part.logprobs } : {}
        };
        if (isAIMessage(generation.message)) {
          generation.message.usage_metadata = usageMetadata;
        }
        generation.message = new AIMessage(Object.fromEntries(Object.entries(generation.message).filter(([key]) => !key.startsWith("lc_"))));
        generations.push(generation);
      }
      return {
        generations,
        llmOutput: {
          tokenUsage: {
            promptTokens: usageMetadata.input_tokens,
            completionTokens: usageMetadata.output_tokens,
            totalTokens: usageMetadata.total_tokens
          }
        }
      };
    }
  }
  /**
   * Estimate the number of tokens a prompt will use.
   * Modified from: https://github.com/hmarr/openai-chat-tokens/blob/main/src/index.ts
   */
  async getEstimatedTokenCountFromPrompt(messages, functions, function_call) {
    let tokens = (await this.getNumTokensFromMessages(messages)).totalCount;
    if (functions && function_call !== "auto") {
      const promptDefinitions = formatFunctionDefinitions(functions);
      tokens += await this.getNumTokens(promptDefinitions);
      tokens += 9;
    }
    if (functions && messages.find((m) => m._getType() === "system")) {
      tokens -= 4;
    }
    if (function_call === "none") {
      tokens += 1;
    } else if (typeof function_call === "object") {
      tokens += await this.getNumTokens(function_call.name) + 4;
    }
    return tokens;
  }
  /**
   * Estimate the number of tokens an array of generations have used.
   */
  async getNumTokensFromGenerations(generations) {
    const generationUsages = await Promise.all(generations.map(async (generation) => {
      var _a2;
      if ((_a2 = generation.message.additional_kwargs) == null ? void 0 : _a2.function_call) {
        return (await this.getNumTokensFromMessages([generation.message])).countPerMessage[0];
      } else {
        return await this.getNumTokens(generation.message.content);
      }
    }));
    return generationUsages.reduce((a, b) => a + b, 0);
  }
  async getNumTokensFromMessages(messages) {
    let totalCount = 0;
    let tokensPerMessage = 0;
    let tokensPerName = 0;
    if (this.model === "gpt-3.5-turbo-0301") {
      tokensPerMessage = 4;
      tokensPerName = -1;
    } else {
      tokensPerMessage = 3;
      tokensPerName = 1;
    }
    const countPerMessage = await Promise.all(messages.map(async (message) => {
      var _a2, _b, _c, _d, _e, _f;
      const textCount = await this.getNumTokens(message.content);
      const roleCount = await this.getNumTokens(messageToOpenAIRole(message));
      const nameCount = message.name !== void 0 ? tokensPerName + await this.getNumTokens(message.name) : 0;
      let count = textCount + tokensPerMessage + roleCount + nameCount;
      const openAIMessage = message;
      if (openAIMessage._getType() === "function") {
        count -= 2;
      }
      if ((_a2 = openAIMessage.additional_kwargs) == null ? void 0 : _a2.function_call) {
        count += 3;
      }
      if ((_b = openAIMessage == null ? void 0 : openAIMessage.additional_kwargs.function_call) == null ? void 0 : _b.name) {
        count += await this.getNumTokens((_c = openAIMessage.additional_kwargs.function_call) == null ? void 0 : _c.name);
      }
      if ((_d = openAIMessage.additional_kwargs.function_call) == null ? void 0 : _d.arguments) {
        try {
          count += await this.getNumTokens(
            // Remove newlines and spaces
            JSON.stringify(JSON.parse((_e = openAIMessage.additional_kwargs.function_call) == null ? void 0 : _e.arguments))
          );
        } catch (error) {
          console.error("Error parsing function arguments", error, JSON.stringify(openAIMessage.additional_kwargs.function_call));
          count += await this.getNumTokens((_f = openAIMessage.additional_kwargs.function_call) == null ? void 0 : _f.arguments);
        }
      }
      totalCount += count;
      return count;
    }));
    totalCount += 3;
    return { totalCount, countPerMessage };
  }
  async completionWithRetry(request, options) {
    const requestOptions = this._getClientOptions(options);
    return this.caller.call(async () => {
      try {
        const res = await this.client.chat.completions.create(request, requestOptions);
        return res;
      } catch (e) {
        const error = wrapOpenAIClientError(e);
        throw error;
      }
    });
  }
  async responseApiWithRetry(request, options) {
    return this.caller.call(async () => {
      var _a2, _b;
      const requestOptions = this._getClientOptions(options);
      try {
        if (((_b = (_a2 = request.text) == null ? void 0 : _a2.format) == null ? void 0 : _b.type) === "json_schema" && !request.stream) {
          return await this.client.responses.parse(request, requestOptions);
        }
        return await this.client.responses.create(request, requestOptions);
      } catch (e) {
        const error = wrapOpenAIClientError(e);
        throw error;
      }
    });
  }
  /**
   * Call the beta chat completions parse endpoint. This should only be called if
   * response_format is set to "json_object".
   * @param {OpenAIClient.Chat.ChatCompletionCreateParamsNonStreaming} request
   * @param {OpenAICoreRequestOptions | undefined} options
   */
  async betaParsedCompletionWithRetry(request, options) {
    const requestOptions = this._getClientOptions(options);
    return this.caller.call(async () => {
      try {
        const res = await this.client.beta.chat.completions.parse(request, requestOptions);
        return res;
      } catch (e) {
        const error = wrapOpenAIClientError(e);
        throw error;
      }
    });
  }
  _getClientOptions(options) {
    if (!this.client) {
      const openAIEndpointConfig = {
        baseURL: this.clientConfig.baseURL
      };
      const endpoint = getEndpoint(openAIEndpointConfig);
      const params = {
        ...this.clientConfig,
        baseURL: endpoint,
        timeout: this.timeout,
        maxRetries: 0
      };
      if (!params.baseURL) {
        delete params.baseURL;
      }
      this.client = new OpenAI(params);
    }
    const requestOptions = {
      ...this.clientConfig,
      ...options
    };
    return requestOptions;
  }
  _llmType() {
    return "openai";
  }
  /** @ignore */
  _combineLLMOutput(...llmOutputs) {
    return llmOutputs.reduce((acc, llmOutput) => {
      if (llmOutput && llmOutput.tokenUsage) {
        acc.tokenUsage.completionTokens += llmOutput.tokenUsage.completionTokens ?? 0;
        acc.tokenUsage.promptTokens += llmOutput.tokenUsage.promptTokens ?? 0;
        acc.tokenUsage.totalTokens += llmOutput.tokenUsage.totalTokens ?? 0;
      }
      return acc;
    }, {
      tokenUsage: {
        completionTokens: 0,
        promptTokens: 0,
        totalTokens: 0
      }
    });
  }
  withStructuredOutput(outputSchema, config) {
    let schema;
    let name;
    let method;
    let includeRaw;
    if (isStructuredOutputMethodParams(outputSchema)) {
      schema = outputSchema.schema;
      name = outputSchema.name;
      method = outputSchema.method;
      includeRaw = outputSchema.includeRaw;
    } else {
      schema = outputSchema;
      name = config == null ? void 0 : config.name;
      method = config == null ? void 0 : config.method;
      includeRaw = config == null ? void 0 : config.includeRaw;
    }
    let llm;
    let outputParser;
    if ((config == null ? void 0 : config.strict) !== void 0 && method === "jsonMode") {
      throw new Error("Argument `strict` is only supported for `method` = 'function_calling'");
    }
    if (!this.model.startsWith("gpt-3") && !this.model.startsWith("gpt-4-") && this.model !== "gpt-4") {
      if (method === void 0) {
        method = "jsonSchema";
      }
    } else if (method === "jsonSchema") {
      console.warn(`[WARNING]: JSON Schema is not supported for model "${this.model}". Falling back to tool calling.`);
    }
    if (method === "jsonMode") {
      llm = this.withConfig({
        response_format: { type: "json_object" }
      });
      if (isZodSchema2(schema)) {
        outputParser = StructuredOutputParser.fromZodSchema(schema);
      } else {
        outputParser = new JsonOutputParser();
      }
    } else if (method === "jsonSchema") {
      llm = this.withConfig({
        response_format: {
          type: "json_schema",
          json_schema: {
            name: name ?? "extract",
            description: schema.description,
            schema,
            strict: config == null ? void 0 : config.strict
          }
        }
      });
      if (isZodSchema2(schema)) {
        const altParser = StructuredOutputParser.fromZodSchema(schema);
        outputParser = RunnableLambda.from((aiMessage) => {
          if ("parsed" in aiMessage.additional_kwargs) {
            return aiMessage.additional_kwargs.parsed;
          }
          return altParser;
        });
      } else {
        outputParser = new JsonOutputParser();
      }
    } else {
      let functionName = name ?? "extract";
      if (isZodSchema2(schema)) {
        const asJsonSchema = zodToJsonSchema(schema);
        llm = this.withConfig({
          tools: [
            {
              type: "function",
              function: {
                name: functionName,
                description: asJsonSchema.description,
                parameters: asJsonSchema
              }
            }
          ],
          tool_choice: {
            type: "function",
            function: {
              name: functionName
            }
          },
          // Do not pass `strict` argument to OpenAI if `config.strict` is undefined
          ...(config == null ? void 0 : config.strict) !== void 0 ? { strict: config.strict } : {}
        });
        outputParser = new JsonOutputKeyToolsParser({
          returnSingle: true,
          keyName: functionName,
          zodSchema: schema
        });
      } else {
        let openAIFunctionDefinition;
        if (typeof schema.name === "string" && typeof schema.parameters === "object" && schema.parameters != null) {
          openAIFunctionDefinition = schema;
          functionName = schema.name;
        } else {
          functionName = schema.title ?? functionName;
          openAIFunctionDefinition = {
            name: functionName,
            description: schema.description ?? "",
            parameters: schema
          };
        }
        llm = this.withConfig({
          tools: [
            {
              type: "function",
              function: openAIFunctionDefinition
            }
          ],
          tool_choice: {
            type: "function",
            function: {
              name: functionName
            }
          },
          // Do not pass `strict` argument to OpenAI if `config.strict` is undefined
          ...(config == null ? void 0 : config.strict) !== void 0 ? { strict: config.strict } : {}
        });
        outputParser = new JsonOutputKeyToolsParser({
          returnSingle: true,
          keyName: functionName
        });
      }
    }
    if (!includeRaw) {
      return llm.pipe(outputParser);
    }
    const parserAssign = RunnablePassthrough.assign({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsed: (input, config2) => outputParser.invoke(input.raw, config2)
    });
    const parserNone = RunnablePassthrough.assign({
      parsed: () => null
    });
    const parsedWithFallback = parserAssign.withFallbacks({
      fallbacks: [parserNone]
    });
    return RunnableSequence.from([{ raw: llm }, parsedWithFallback]);
  }
};
function isZodSchema2(input) {
  return typeof (input == null ? void 0 : input.parse) === "function";
}
function isStructuredOutputMethodParams(x) {
  return x !== void 0 && // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof x.schema === "object";
}

// node_modules/@langchain/openai/dist/azure/chat_models.js
var AzureChatOpenAI = class extends ChatOpenAI {
  _llmType() {
    return "azure_openai";
  }
  get lc_aliases() {
    return {
      ...super.lc_aliases,
      openAIApiKey: "openai_api_key",
      openAIApiVersion: "openai_api_version",
      openAIBasePath: "openai_api_base",
      deploymentName: "deployment_name",
      azureOpenAIEndpoint: "azure_endpoint",
      azureOpenAIApiVersion: "openai_api_version",
      azureOpenAIBasePath: "openai_api_base",
      azureOpenAIApiDeploymentName: "deployment_name"
    };
  }
  get lc_secrets() {
    return {
      ...super.lc_secrets,
      azureOpenAIApiKey: "AZURE_OPENAI_API_KEY"
    };
  }
  get lc_serializable_keys() {
    return [
      ...super.lc_serializable_keys,
      "azureOpenAIApiKey",
      "azureOpenAIApiVersion",
      "azureOpenAIBasePath",
      "azureOpenAIEndpoint",
      "azureOpenAIApiInstanceName",
      "azureOpenAIApiDeploymentName",
      "deploymentName",
      "openAIApiKey",
      "openAIApiVersion"
    ];
  }
  constructor(fields) {
    super(fields);
    Object.defineProperty(this, "azureOpenAIApiVersion", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIApiKey", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureADTokenProvider", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIApiInstanceName", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIApiDeploymentName", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIBasePath", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIEndpoint", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.azureOpenAIApiKey = (fields == null ? void 0 : fields.azureOpenAIApiKey) ?? (fields == null ? void 0 : fields.openAIApiKey) ?? (fields == null ? void 0 : fields.apiKey) ?? getEnvironmentVariable("AZURE_OPENAI_API_KEY");
    this.azureOpenAIApiInstanceName = (fields == null ? void 0 : fields.azureOpenAIApiInstanceName) ?? getEnvironmentVariable("AZURE_OPENAI_API_INSTANCE_NAME");
    this.azureOpenAIApiDeploymentName = (fields == null ? void 0 : fields.azureOpenAIApiDeploymentName) ?? (fields == null ? void 0 : fields.deploymentName) ?? getEnvironmentVariable("AZURE_OPENAI_API_DEPLOYMENT_NAME");
    this.azureOpenAIApiVersion = (fields == null ? void 0 : fields.azureOpenAIApiVersion) ?? (fields == null ? void 0 : fields.openAIApiVersion) ?? getEnvironmentVariable("AZURE_OPENAI_API_VERSION");
    this.azureOpenAIBasePath = (fields == null ? void 0 : fields.azureOpenAIBasePath) ?? getEnvironmentVariable("AZURE_OPENAI_BASE_PATH");
    this.azureOpenAIEndpoint = (fields == null ? void 0 : fields.azureOpenAIEndpoint) ?? getEnvironmentVariable("AZURE_OPENAI_ENDPOINT");
    this.azureADTokenProvider = fields == null ? void 0 : fields.azureADTokenProvider;
    if (!this.azureOpenAIApiKey && !this.apiKey && !this.azureADTokenProvider) {
      throw new Error("Azure OpenAI API key or Token Provider not found");
    }
  }
  getLsParams(options) {
    const params = super.getLsParams(options);
    params.ls_provider = "azure";
    return params;
  }
  _getClientOptions(options) {
    var _a2;
    if (!this.client) {
      const openAIEndpointConfig = {
        azureOpenAIApiDeploymentName: this.azureOpenAIApiDeploymentName,
        azureOpenAIApiInstanceName: this.azureOpenAIApiInstanceName,
        azureOpenAIApiKey: this.azureOpenAIApiKey,
        azureOpenAIBasePath: this.azureOpenAIBasePath,
        azureADTokenProvider: this.azureADTokenProvider,
        baseURL: this.clientConfig.baseURL,
        azureOpenAIEndpoint: this.azureOpenAIEndpoint
      };
      const endpoint = getEndpoint(openAIEndpointConfig);
      const params = {
        ...this.clientConfig,
        baseURL: endpoint,
        timeout: this.timeout,
        maxRetries: 0
      };
      if (!this.azureADTokenProvider) {
        params.apiKey = openAIEndpointConfig.azureOpenAIApiKey;
      }
      if (!params.baseURL) {
        delete params.baseURL;
      }
      let env = getEnv();
      if (env === "node" || env === "deno") {
        env = `(${env}/${process.version}; ${process.platform}; ${process.arch})`;
      }
      const specifiedUserAgent = (_a2 = params.defaultHeaders) == null ? void 0 : _a2["User-Agent"];
      params.defaultHeaders = {
        ...params.defaultHeaders,
        "User-Agent": `langchainjs-azure-openai/2.0.0 (${env})${specifiedUserAgent ? ` ${specifiedUserAgent}` : ""}`
      };
      this.client = new AzureOpenAI({
        apiVersion: this.azureOpenAIApiVersion,
        azureADTokenProvider: this.azureADTokenProvider,
        deployment: this.azureOpenAIApiDeploymentName,
        ...params
      });
    }
    const requestOptions = {
      ...this.clientConfig,
      ...options
    };
    if (this.azureOpenAIApiKey) {
      requestOptions.headers = {
        "api-key": this.azureOpenAIApiKey,
        ...requestOptions.headers
      };
      requestOptions.query = {
        "api-version": this.azureOpenAIApiVersion,
        ...requestOptions.query
      };
    }
    return requestOptions;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toJSON() {
    const json = super.toJSON();
    function isRecord(obj) {
      return typeof obj === "object" && obj != null;
    }
    if (isRecord(json) && isRecord(json.kwargs)) {
      delete json.kwargs.azure_openai_base_path;
      delete json.kwargs.azure_openai_api_deployment_name;
      delete json.kwargs.azure_openai_api_key;
      delete json.kwargs.azure_openai_api_version;
      delete json.kwargs.azure_open_ai_base_path;
      if (!json.kwargs.azure_endpoint && this.azureOpenAIEndpoint) {
        json.kwargs.azure_endpoint = this.azureOpenAIEndpoint;
      }
      if (!json.kwargs.azure_endpoint && this.azureOpenAIBasePath) {
        const parts = this.azureOpenAIBasePath.split("/openai/deployments/");
        if (parts.length === 2 && parts[0].startsWith("http")) {
          const [endpoint] = parts;
          json.kwargs.azure_endpoint = endpoint;
        }
      }
      if (!json.kwargs.azure_endpoint && this.azureOpenAIApiInstanceName) {
        json.kwargs.azure_endpoint = `https://${this.azureOpenAIApiInstanceName}.openai.azure.com/`;
      }
      if (!json.kwargs.deployment_name && this.azureOpenAIApiDeploymentName) {
        json.kwargs.deployment_name = this.azureOpenAIApiDeploymentName;
      }
      if (!json.kwargs.deployment_name && this.azureOpenAIBasePath) {
        const parts = this.azureOpenAIBasePath.split("/openai/deployments/");
        if (parts.length === 2) {
          const [, deployment] = parts;
          json.kwargs.deployment_name = deployment;
        }
      }
      if (json.kwargs.azure_endpoint && json.kwargs.deployment_name && json.kwargs.openai_api_base) {
        delete json.kwargs.openai_api_base;
      }
      if (json.kwargs.azure_openai_api_instance_name && json.kwargs.azure_endpoint) {
        delete json.kwargs.azure_openai_api_instance_name;
      }
    }
    return json;
  }
  withStructuredOutput(outputSchema, config) {
    const ensuredConfig = { ...config };
    if (this.model.startsWith("gpt-4o")) {
      if ((ensuredConfig == null ? void 0 : ensuredConfig.method) === void 0) {
        ensuredConfig.method = "functionCalling";
      }
    }
    return super.withStructuredOutput(outputSchema, ensuredConfig);
  }
};

// node_modules/@langchain/core/dist/language_models/llms.js
var BaseLLM = class _BaseLLM extends BaseLanguageModel {
  constructor({ concurrency, ...rest }) {
    super(concurrency ? { maxConcurrency: concurrency, ...rest } : rest);
    Object.defineProperty(this, "lc_namespace", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: ["langchain", "llms", this._llmType()]
    });
  }
  /**
   * This method takes an input and options, and returns a string. It
   * converts the input to a prompt value and generates a result based on
   * the prompt.
   * @param input Input for the LLM.
   * @param options Options for the LLM call.
   * @returns A string result based on the prompt.
   */
  async invoke(input, options) {
    const promptValue = _BaseLLM._convertInputToPromptValue(input);
    const result = await this.generatePrompt([promptValue], options, options == null ? void 0 : options.callbacks);
    return result.generations[0][0].text;
  }
  // eslint-disable-next-line require-yield
  async *_streamResponseChunks(_input, _options, _runManager) {
    throw new Error("Not implemented.");
  }
  _separateRunnableConfigFromCallOptionsCompat(options) {
    const [runnableConfig, callOptions] = super._separateRunnableConfigFromCallOptions(options);
    callOptions.signal = runnableConfig.signal;
    return [runnableConfig, callOptions];
  }
  async *_streamIterator(input, options) {
    if (this._streamResponseChunks === _BaseLLM.prototype._streamResponseChunks) {
      yield this.invoke(input, options);
    } else {
      const prompt = _BaseLLM._convertInputToPromptValue(input);
      const [runnableConfig, callOptions] = this._separateRunnableConfigFromCallOptionsCompat(options);
      const callbackManager_ = await CallbackManager.configure(runnableConfig.callbacks, this.callbacks, runnableConfig.tags, this.tags, runnableConfig.metadata, this.metadata, { verbose: this.verbose });
      const extra = {
        options: callOptions,
        invocation_params: this == null ? void 0 : this.invocationParams(callOptions),
        batch_size: 1
      };
      const runManagers = await (callbackManager_ == null ? void 0 : callbackManager_.handleLLMStart(this.toJSON(), [prompt.toString()], runnableConfig.runId, void 0, extra, void 0, void 0, runnableConfig.runName));
      let generation = new GenerationChunk({
        text: ""
      });
      try {
        for await (const chunk of this._streamResponseChunks(prompt.toString(), callOptions, runManagers == null ? void 0 : runManagers[0])) {
          if (!generation) {
            generation = chunk;
          } else {
            generation = generation.concat(chunk);
          }
          if (typeof chunk.text === "string") {
            yield chunk.text;
          }
        }
      } catch (err) {
        await Promise.all((runManagers ?? []).map((runManager) => runManager == null ? void 0 : runManager.handleLLMError(err)));
        throw err;
      }
      await Promise.all((runManagers ?? []).map((runManager) => runManager == null ? void 0 : runManager.handleLLMEnd({
        generations: [[generation]]
      })));
    }
  }
  /**
   * This method takes prompt values, options, and callbacks, and generates
   * a result based on the prompts.
   * @param promptValues Prompt values for the LLM.
   * @param options Options for the LLM call.
   * @param callbacks Callbacks for the LLM call.
   * @returns An LLMResult based on the prompts.
   */
  async generatePrompt(promptValues, options, callbacks) {
    const prompts = promptValues.map((promptValue) => promptValue.toString());
    return this.generate(prompts, options, callbacks);
  }
  /**
   * Get the parameters used to invoke the model
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  invocationParams(_options) {
    return {};
  }
  _flattenLLMResult(llmResult) {
    const llmResults = [];
    for (let i = 0; i < llmResult.generations.length; i += 1) {
      const genList = llmResult.generations[i];
      if (i === 0) {
        llmResults.push({
          generations: [genList],
          llmOutput: llmResult.llmOutput
        });
      } else {
        const llmOutput = llmResult.llmOutput ? { ...llmResult.llmOutput, tokenUsage: {} } : void 0;
        llmResults.push({
          generations: [genList],
          llmOutput
        });
      }
    }
    return llmResults;
  }
  /** @ignore */
  async _generateUncached(prompts, parsedOptions, handledOptions, startedRunManagers) {
    let runManagers;
    if (startedRunManagers !== void 0 && startedRunManagers.length === prompts.length) {
      runManagers = startedRunManagers;
    } else {
      const callbackManager_ = await CallbackManager.configure(handledOptions.callbacks, this.callbacks, handledOptions.tags, this.tags, handledOptions.metadata, this.metadata, { verbose: this.verbose });
      const extra = {
        options: parsedOptions,
        invocation_params: this == null ? void 0 : this.invocationParams(parsedOptions),
        batch_size: prompts.length
      };
      runManagers = await (callbackManager_ == null ? void 0 : callbackManager_.handleLLMStart(this.toJSON(), prompts, handledOptions.runId, void 0, extra, void 0, void 0, handledOptions == null ? void 0 : handledOptions.runName));
    }
    const hasStreamingHandler = !!(runManagers == null ? void 0 : runManagers[0].handlers.find(callbackHandlerPrefersStreaming));
    let output;
    if (hasStreamingHandler && prompts.length === 1 && this._streamResponseChunks !== _BaseLLM.prototype._streamResponseChunks) {
      try {
        const stream = await this._streamResponseChunks(prompts[0], parsedOptions, runManagers == null ? void 0 : runManagers[0]);
        let aggregated;
        for await (const chunk of stream) {
          if (aggregated === void 0) {
            aggregated = chunk;
          } else {
            aggregated = concat(aggregated, chunk);
          }
        }
        if (aggregated === void 0) {
          throw new Error("Received empty response from chat model call.");
        }
        output = { generations: [[aggregated]], llmOutput: {} };
        await (runManagers == null ? void 0 : runManagers[0].handleLLMEnd(output));
      } catch (e) {
        await (runManagers == null ? void 0 : runManagers[0].handleLLMError(e));
        throw e;
      }
    } else {
      try {
        output = await this._generate(prompts, parsedOptions, runManagers == null ? void 0 : runManagers[0]);
      } catch (err) {
        await Promise.all((runManagers ?? []).map((runManager) => runManager == null ? void 0 : runManager.handleLLMError(err)));
        throw err;
      }
      const flattenedOutputs = this._flattenLLMResult(output);
      await Promise.all((runManagers ?? []).map((runManager, i) => runManager == null ? void 0 : runManager.handleLLMEnd(flattenedOutputs[i])));
    }
    const runIds = (runManagers == null ? void 0 : runManagers.map((manager) => manager.runId)) || void 0;
    Object.defineProperty(output, RUN_KEY, {
      value: runIds ? { runIds } : void 0,
      configurable: true
    });
    return output;
  }
  async _generateCached({ prompts, cache: cache2, llmStringKey, parsedOptions, handledOptions, runId }) {
    const callbackManager_ = await CallbackManager.configure(handledOptions.callbacks, this.callbacks, handledOptions.tags, this.tags, handledOptions.metadata, this.metadata, { verbose: this.verbose });
    const extra = {
      options: parsedOptions,
      invocation_params: this == null ? void 0 : this.invocationParams(parsedOptions),
      batch_size: prompts.length
    };
    const runManagers = await (callbackManager_ == null ? void 0 : callbackManager_.handleLLMStart(this.toJSON(), prompts, runId, void 0, extra, void 0, void 0, handledOptions == null ? void 0 : handledOptions.runName));
    const missingPromptIndices = [];
    const results = await Promise.allSettled(prompts.map(async (prompt, index) => {
      const result = await cache2.lookup(prompt, llmStringKey);
      if (result == null) {
        missingPromptIndices.push(index);
      }
      return result;
    }));
    const cachedResults = results.map((result, index) => ({ result, runManager: runManagers == null ? void 0 : runManagers[index] })).filter(({ result }) => result.status === "fulfilled" && result.value != null || result.status === "rejected");
    const generations = [];
    await Promise.all(cachedResults.map(async ({ result: promiseResult, runManager }, i) => {
      if (promiseResult.status === "fulfilled") {
        const result = promiseResult.value;
        generations[i] = result.map((result2) => {
          result2.generationInfo = {
            ...result2.generationInfo,
            tokenUsage: {}
          };
          return result2;
        });
        if (result.length) {
          await (runManager == null ? void 0 : runManager.handleLLMNewToken(result[0].text));
        }
        return runManager == null ? void 0 : runManager.handleLLMEnd({
          generations: [result]
        }, void 0, void 0, void 0, {
          cached: true
        });
      } else {
        await (runManager == null ? void 0 : runManager.handleLLMError(promiseResult.reason, void 0, void 0, void 0, {
          cached: true
        }));
        return Promise.reject(promiseResult.reason);
      }
    }));
    const output = {
      generations,
      missingPromptIndices,
      startedRunManagers: runManagers
    };
    Object.defineProperty(output, RUN_KEY, {
      value: runManagers ? { runIds: runManagers == null ? void 0 : runManagers.map((manager) => manager.runId) } : void 0,
      configurable: true
    });
    return output;
  }
  /**
   * Run the LLM on the given prompts and input, handling caching.
   */
  async generate(prompts, options, callbacks) {
    if (!Array.isArray(prompts)) {
      throw new Error("Argument 'prompts' is expected to be a string[]");
    }
    let parsedOptions;
    if (Array.isArray(options)) {
      parsedOptions = { stop: options };
    } else {
      parsedOptions = options;
    }
    const [runnableConfig, callOptions] = this._separateRunnableConfigFromCallOptionsCompat(parsedOptions);
    runnableConfig.callbacks = runnableConfig.callbacks ?? callbacks;
    if (!this.cache) {
      return this._generateUncached(prompts, callOptions, runnableConfig);
    }
    const { cache: cache2 } = this;
    const llmStringKey = this._getSerializedCacheKeyParametersForCall(callOptions);
    const { generations, missingPromptIndices, startedRunManagers } = await this._generateCached({
      prompts,
      cache: cache2,
      llmStringKey,
      parsedOptions: callOptions,
      handledOptions: runnableConfig,
      runId: runnableConfig.runId
    });
    let llmOutput = {};
    if (missingPromptIndices.length > 0) {
      const results = await this._generateUncached(missingPromptIndices.map((i) => prompts[i]), callOptions, runnableConfig, startedRunManagers !== void 0 ? missingPromptIndices.map((i) => startedRunManagers == null ? void 0 : startedRunManagers[i]) : void 0);
      await Promise.all(results.generations.map(async (generation, index) => {
        const promptIndex = missingPromptIndices[index];
        generations[promptIndex] = generation;
        return cache2.update(prompts[promptIndex], llmStringKey, generation);
      }));
      llmOutput = results.llmOutput ?? {};
    }
    return { generations, llmOutput };
  }
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
   * Convenience wrapper for {@link generate} that takes in a single string prompt and returns a single string output.
   */
  async call(prompt, options, callbacks) {
    const { generations } = await this.generate([prompt], options, callbacks);
    return generations[0][0].text;
  }
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
   *
   * This method is similar to `call`, but it's used for making predictions
   * based on the input text.
   * @param text Input text for the prediction.
   * @param options Options for the LLM call.
   * @param callbacks Callbacks for the LLM call.
   * @returns A prediction based on the input text.
   */
  async predict(text, options, callbacks) {
    return this.call(text, options, callbacks);
  }
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
   *
   * This method takes a list of messages, options, and callbacks, and
   * returns a predicted message.
   * @param messages A list of messages for the prediction.
   * @param options Options for the LLM call.
   * @param callbacks Callbacks for the LLM call.
   * @returns A predicted message based on the list of messages.
   */
  async predictMessages(messages, options, callbacks) {
    const text = getBufferString(messages);
    const prediction = await this.call(text, options, callbacks);
    return new AIMessage(prediction);
  }
  /**
   * Get the identifying parameters of the LLM.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _identifyingParams() {
    return {};
  }
  /**
   * @deprecated
   * Return a json-like object representing this LLM.
   */
  serialize() {
    return {
      ...this._identifyingParams(),
      _type: this._llmType(),
      _model: this._modelType()
    };
  }
  _modelType() {
    return "base_llm";
  }
};

// node_modules/@langchain/core/dist/utils/chunk_array.js
var chunkArray = (arr, chunkSize) => arr.reduce((chunks, elem, index) => {
  const chunkIndex = Math.floor(index / chunkSize);
  const chunk = chunks[chunkIndex] || [];
  chunks[chunkIndex] = chunk.concat([elem]);
  return chunks;
}, []);

// node_modules/@langchain/openai/dist/llms.js
var OpenAI2 = class extends BaseLLM {
  static lc_name() {
    return "OpenAI";
  }
  get callKeys() {
    return [...super.callKeys, "options"];
  }
  get lc_secrets() {
    return {
      openAIApiKey: "OPENAI_API_KEY",
      apiKey: "OPENAI_API_KEY",
      organization: "OPENAI_ORGANIZATION"
    };
  }
  get lc_aliases() {
    return {
      modelName: "model",
      openAIApiKey: "openai_api_key",
      apiKey: "openai_api_key"
    };
  }
  constructor(fields) {
    var _a2, _b, _c, _d, _e;
    super(fields ?? {});
    Object.defineProperty(this, "lc_serializable", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: true
    });
    Object.defineProperty(this, "temperature", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "maxTokens", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "topP", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "frequencyPenalty", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "presencePenalty", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "n", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: 1
    });
    Object.defineProperty(this, "bestOf", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "logitBias", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "model", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "gpt-3.5-turbo-instruct"
    });
    Object.defineProperty(this, "modelName", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "modelKwargs", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "batchSize", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: 20
    });
    Object.defineProperty(this, "timeout", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "stop", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "stopSequences", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "user", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "streaming", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: false
    });
    Object.defineProperty(this, "openAIApiKey", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "apiKey", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "organization", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "client", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "clientConfig", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.openAIApiKey = (fields == null ? void 0 : fields.apiKey) ?? (fields == null ? void 0 : fields.openAIApiKey) ?? getEnvironmentVariable("OPENAI_API_KEY");
    this.apiKey = this.openAIApiKey;
    this.organization = ((_a2 = fields == null ? void 0 : fields.configuration) == null ? void 0 : _a2.organization) ?? getEnvironmentVariable("OPENAI_ORGANIZATION");
    this.model = (fields == null ? void 0 : fields.model) ?? (fields == null ? void 0 : fields.modelName) ?? this.model;
    if ((((_b = this.model) == null ? void 0 : _b.startsWith("gpt-3.5-turbo")) || ((_c = this.model) == null ? void 0 : _c.startsWith("gpt-4")) || ((_d = this.model) == null ? void 0 : _d.startsWith("o1"))) && !((_e = this.model) == null ? void 0 : _e.includes("-instruct"))) {
      throw new Error([
        `Your chosen OpenAI model, "${this.model}", is a chat model and not a text-in/text-out LLM.`,
        `Passing it into the "OpenAI" class is no longer supported.`,
        `Please use the "ChatOpenAI" class instead.`,
        "",
        `See this page for more information:`,
        "|",
        `└> https://js.langchain.com/docs/integrations/chat/openai`
      ].join("\n"));
    }
    this.modelName = this.model;
    this.modelKwargs = (fields == null ? void 0 : fields.modelKwargs) ?? {};
    this.batchSize = (fields == null ? void 0 : fields.batchSize) ?? this.batchSize;
    this.timeout = fields == null ? void 0 : fields.timeout;
    this.temperature = (fields == null ? void 0 : fields.temperature) ?? this.temperature;
    this.maxTokens = (fields == null ? void 0 : fields.maxTokens) ?? this.maxTokens;
    this.topP = (fields == null ? void 0 : fields.topP) ?? this.topP;
    this.frequencyPenalty = (fields == null ? void 0 : fields.frequencyPenalty) ?? this.frequencyPenalty;
    this.presencePenalty = (fields == null ? void 0 : fields.presencePenalty) ?? this.presencePenalty;
    this.n = (fields == null ? void 0 : fields.n) ?? this.n;
    this.bestOf = (fields == null ? void 0 : fields.bestOf) ?? this.bestOf;
    this.logitBias = fields == null ? void 0 : fields.logitBias;
    this.stop = (fields == null ? void 0 : fields.stopSequences) ?? (fields == null ? void 0 : fields.stop);
    this.stopSequences = this.stop;
    this.user = fields == null ? void 0 : fields.user;
    this.streaming = (fields == null ? void 0 : fields.streaming) ?? false;
    if (this.streaming && this.bestOf && this.bestOf > 1) {
      throw new Error("Cannot stream results when bestOf > 1");
    }
    this.clientConfig = {
      apiKey: this.apiKey,
      organization: this.organization,
      dangerouslyAllowBrowser: true,
      ...fields == null ? void 0 : fields.configuration
    };
  }
  /**
   * Get the parameters used to invoke the model
   */
  invocationParams(options) {
    return {
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      top_p: this.topP,
      frequency_penalty: this.frequencyPenalty,
      presence_penalty: this.presencePenalty,
      n: this.n,
      best_of: this.bestOf,
      logit_bias: this.logitBias,
      stop: (options == null ? void 0 : options.stop) ?? this.stopSequences,
      user: this.user,
      stream: this.streaming,
      ...this.modelKwargs
    };
  }
  /** @ignore */
  _identifyingParams() {
    return {
      model_name: this.model,
      ...this.invocationParams(),
      ...this.clientConfig
    };
  }
  /**
   * Get the identifying parameters for the model
   */
  identifyingParams() {
    return this._identifyingParams();
  }
  /**
   * Call out to OpenAI's endpoint with k unique prompts
   *
   * @param [prompts] - The prompts to pass into the model.
   * @param [options] - Optional list of stop words to use when generating.
   * @param [runManager] - Optional callback manager to use when generating.
   *
   * @returns The full LLM output.
   *
   * @example
   * ```ts
   * import { OpenAI } from "langchain/llms/openai";
   * const openai = new OpenAI();
   * const response = await openai.generate(["Tell me a joke."]);
   * ```
   */
  async _generate(prompts, options, runManager) {
    const subPrompts = chunkArray(prompts, this.batchSize);
    const choices = [];
    const tokenUsage = {};
    const params = this.invocationParams(options);
    if (params.max_tokens === -1) {
      if (prompts.length !== 1) {
        throw new Error("max_tokens set to -1 not supported for multiple inputs");
      }
      params.max_tokens = await calculateMaxTokens({
        prompt: prompts[0],
        // Cast here to allow for other models that may not fit the union
        modelName: this.model
      });
    }
    for (let i = 0; i < subPrompts.length; i += 1) {
      const data = params.stream ? await (async () => {
        var _a2;
        const choices2 = [];
        let response;
        const stream = await this.completionWithRetry({
          ...params,
          stream: true,
          prompt: subPrompts[i]
        }, options);
        for await (const message of stream) {
          if (!response) {
            response = {
              id: message.id,
              object: message.object,
              created: message.created,
              model: message.model
            };
          }
          for (const part of message.choices) {
            if (!choices2[part.index]) {
              choices2[part.index] = part;
            } else {
              const choice = choices2[part.index];
              choice.text += part.text;
              choice.finish_reason = part.finish_reason;
              choice.logprobs = part.logprobs;
            }
            void (runManager == null ? void 0 : runManager.handleLLMNewToken(part.text, {
              prompt: Math.floor(part.index / this.n),
              completion: part.index % this.n
            }));
          }
        }
        if ((_a2 = options.signal) == null ? void 0 : _a2.aborted) {
          throw new Error("AbortError");
        }
        return { ...response, choices: choices2 };
      })() : await this.completionWithRetry({
        ...params,
        stream: false,
        prompt: subPrompts[i]
      }, {
        signal: options.signal,
        ...options.options
      });
      choices.push(...data.choices);
      const { completion_tokens: completionTokens, prompt_tokens: promptTokens, total_tokens: totalTokens } = data.usage ? data.usage : {
        completion_tokens: void 0,
        prompt_tokens: void 0,
        total_tokens: void 0
      };
      if (completionTokens) {
        tokenUsage.completionTokens = (tokenUsage.completionTokens ?? 0) + completionTokens;
      }
      if (promptTokens) {
        tokenUsage.promptTokens = (tokenUsage.promptTokens ?? 0) + promptTokens;
      }
      if (totalTokens) {
        tokenUsage.totalTokens = (tokenUsage.totalTokens ?? 0) + totalTokens;
      }
    }
    const generations = chunkArray(choices, this.n).map((promptChoices) => promptChoices.map((choice) => ({
      text: choice.text ?? "",
      generationInfo: {
        finishReason: choice.finish_reason,
        logprobs: choice.logprobs
      }
    })));
    return {
      generations,
      llmOutput: { tokenUsage }
    };
  }
  // TODO(jacoblee): Refactor with _generate(..., {stream: true}) implementation?
  async *_streamResponseChunks(input, options, runManager) {
    var _a2;
    const params = {
      ...this.invocationParams(options),
      prompt: input,
      stream: true
    };
    const stream = await this.completionWithRetry(params, options);
    for await (const data of stream) {
      const choice = data == null ? void 0 : data.choices[0];
      if (!choice) {
        continue;
      }
      const chunk = new GenerationChunk({
        text: choice.text,
        generationInfo: {
          finishReason: choice.finish_reason
        }
      });
      yield chunk;
      void (runManager == null ? void 0 : runManager.handleLLMNewToken(chunk.text ?? ""));
    }
    if ((_a2 = options.signal) == null ? void 0 : _a2.aborted) {
      throw new Error("AbortError");
    }
  }
  async completionWithRetry(request, options) {
    const requestOptions = this._getClientOptions(options);
    return this.caller.call(async () => {
      try {
        const res = await this.client.completions.create(request, requestOptions);
        return res;
      } catch (e) {
        const error = wrapOpenAIClientError(e);
        throw error;
      }
    });
  }
  /**
   * Calls the OpenAI API with retry logic in case of failures.
   * @param request The request to send to the OpenAI API.
   * @param options Optional configuration for the API call.
   * @returns The response from the OpenAI API.
   */
  _getClientOptions(options) {
    if (!this.client) {
      const openAIEndpointConfig = {
        baseURL: this.clientConfig.baseURL
      };
      const endpoint = getEndpoint(openAIEndpointConfig);
      const params = {
        ...this.clientConfig,
        baseURL: endpoint,
        timeout: this.timeout,
        maxRetries: 0
      };
      if (!params.baseURL) {
        delete params.baseURL;
      }
      this.client = new OpenAI(params);
    }
    const requestOptions = {
      ...this.clientConfig,
      ...options
    };
    return requestOptions;
  }
  _llmType() {
    return "openai";
  }
};

// node_modules/@langchain/openai/dist/azure/llms.js
var AzureOpenAI2 = class extends OpenAI2 {
  get lc_aliases() {
    return {
      ...super.lc_aliases,
      openAIApiKey: "openai_api_key",
      openAIApiVersion: "openai_api_version",
      openAIBasePath: "openai_api_base",
      deploymentName: "deployment_name",
      azureOpenAIEndpoint: "azure_endpoint",
      azureOpenAIApiVersion: "openai_api_version",
      azureOpenAIBasePath: "openai_api_base",
      azureOpenAIApiDeploymentName: "deployment_name"
    };
  }
  get lc_secrets() {
    return {
      ...super.lc_secrets,
      azureOpenAIApiKey: "AZURE_OPENAI_API_KEY"
    };
  }
  constructor(fields) {
    super(fields);
    Object.defineProperty(this, "azureOpenAIApiVersion", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIApiKey", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureADTokenProvider", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIApiInstanceName", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIApiDeploymentName", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIBasePath", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIEndpoint", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.azureOpenAIApiDeploymentName = ((fields == null ? void 0 : fields.azureOpenAIApiCompletionsDeploymentName) || (fields == null ? void 0 : fields.azureOpenAIApiDeploymentName)) ?? (getEnvironmentVariable("AZURE_OPENAI_API_COMPLETIONS_DEPLOYMENT_NAME") || getEnvironmentVariable("AZURE_OPENAI_API_DEPLOYMENT_NAME"));
    this.azureOpenAIApiKey = (fields == null ? void 0 : fields.azureOpenAIApiKey) ?? (fields == null ? void 0 : fields.openAIApiKey) ?? (fields == null ? void 0 : fields.apiKey) ?? getEnvironmentVariable("AZURE_OPENAI_API_KEY");
    this.azureOpenAIApiInstanceName = (fields == null ? void 0 : fields.azureOpenAIApiInstanceName) ?? getEnvironmentVariable("AZURE_OPENAI_API_INSTANCE_NAME");
    this.azureOpenAIApiVersion = (fields == null ? void 0 : fields.azureOpenAIApiVersion) ?? (fields == null ? void 0 : fields.openAIApiVersion) ?? getEnvironmentVariable("AZURE_OPENAI_API_VERSION");
    this.azureOpenAIBasePath = (fields == null ? void 0 : fields.azureOpenAIBasePath) ?? getEnvironmentVariable("AZURE_OPENAI_BASE_PATH");
    this.azureOpenAIEndpoint = (fields == null ? void 0 : fields.azureOpenAIEndpoint) ?? getEnvironmentVariable("AZURE_OPENAI_ENDPOINT");
    this.azureADTokenProvider = fields == null ? void 0 : fields.azureADTokenProvider;
    if (!this.azureOpenAIApiKey && !this.apiKey && !this.azureADTokenProvider) {
      throw new Error("Azure OpenAI API key or Token Provider not found");
    }
  }
  _getClientOptions(options) {
    var _a2;
    if (!this.client) {
      const openAIEndpointConfig = {
        azureOpenAIApiDeploymentName: this.azureOpenAIApiDeploymentName,
        azureOpenAIApiInstanceName: this.azureOpenAIApiInstanceName,
        azureOpenAIApiKey: this.azureOpenAIApiKey,
        azureOpenAIBasePath: this.azureOpenAIBasePath,
        azureADTokenProvider: this.azureADTokenProvider,
        baseURL: this.clientConfig.baseURL
      };
      const endpoint = getEndpoint(openAIEndpointConfig);
      const params = {
        ...this.clientConfig,
        baseURL: endpoint,
        timeout: this.timeout,
        maxRetries: 0
      };
      if (!this.azureADTokenProvider) {
        params.apiKey = openAIEndpointConfig.azureOpenAIApiKey;
      }
      if (!params.baseURL) {
        delete params.baseURL;
      }
      params.defaultHeaders = {
        ...params.defaultHeaders,
        "User-Agent": ((_a2 = params.defaultHeaders) == null ? void 0 : _a2["User-Agent"]) ? `${params.defaultHeaders["User-Agent"]}: langchainjs-azure-openai-v2` : `langchainjs-azure-openai-v2`
      };
      this.client = new AzureOpenAI({
        apiVersion: this.azureOpenAIApiVersion,
        azureADTokenProvider: this.azureADTokenProvider,
        ...params
      });
    }
    const requestOptions = {
      ...this.clientConfig,
      ...options
    };
    if (this.azureOpenAIApiKey) {
      requestOptions.headers = {
        "api-key": this.azureOpenAIApiKey,
        ...requestOptions.headers
      };
      requestOptions.query = {
        "api-version": this.azureOpenAIApiVersion,
        ...requestOptions.query
      };
    }
    return requestOptions;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toJSON() {
    const json = super.toJSON();
    function isRecord(obj) {
      return typeof obj === "object" && obj != null;
    }
    if (isRecord(json) && isRecord(json.kwargs)) {
      delete json.kwargs.azure_openai_base_path;
      delete json.kwargs.azure_openai_api_deployment_name;
      delete json.kwargs.azure_openai_api_key;
      delete json.kwargs.azure_openai_api_version;
      delete json.kwargs.azure_open_ai_base_path;
    }
    return json;
  }
};

// node_modules/@langchain/core/dist/embeddings.js
var Embeddings2 = class {
  constructor(params) {
    Object.defineProperty(this, "caller", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.caller = new AsyncCaller(params ?? {});
  }
};

// node_modules/@langchain/openai/dist/embeddings.js
var OpenAIEmbeddings = class extends Embeddings2 {
  constructor(fields) {
    var _a2;
    const fieldsWithDefaults = { maxConcurrency: 2, ...fields };
    super(fieldsWithDefaults);
    Object.defineProperty(this, "model", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "text-embedding-ada-002"
    });
    Object.defineProperty(this, "modelName", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "batchSize", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: 512
    });
    Object.defineProperty(this, "stripNewLines", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: true
    });
    Object.defineProperty(this, "dimensions", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "timeout", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "organization", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "client", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "clientConfig", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    const apiKey = (fieldsWithDefaults == null ? void 0 : fieldsWithDefaults.apiKey) ?? (fieldsWithDefaults == null ? void 0 : fieldsWithDefaults.openAIApiKey) ?? getEnvironmentVariable("OPENAI_API_KEY");
    this.organization = ((_a2 = fieldsWithDefaults == null ? void 0 : fieldsWithDefaults.configuration) == null ? void 0 : _a2.organization) ?? getEnvironmentVariable("OPENAI_ORGANIZATION");
    this.model = (fieldsWithDefaults == null ? void 0 : fieldsWithDefaults.model) ?? (fieldsWithDefaults == null ? void 0 : fieldsWithDefaults.modelName) ?? this.model;
    this.modelName = this.model;
    this.batchSize = (fieldsWithDefaults == null ? void 0 : fieldsWithDefaults.batchSize) ?? this.batchSize;
    this.stripNewLines = (fieldsWithDefaults == null ? void 0 : fieldsWithDefaults.stripNewLines) ?? this.stripNewLines;
    this.timeout = fieldsWithDefaults == null ? void 0 : fieldsWithDefaults.timeout;
    this.dimensions = fieldsWithDefaults == null ? void 0 : fieldsWithDefaults.dimensions;
    this.clientConfig = {
      apiKey,
      organization: this.organization,
      dangerouslyAllowBrowser: true,
      ...fields == null ? void 0 : fields.configuration
    };
  }
  /**
   * Method to generate embeddings for an array of documents. Splits the
   * documents into batches and makes requests to the OpenAI API to generate
   * embeddings.
   * @param texts Array of documents to generate embeddings for.
   * @returns Promise that resolves to a 2D array of embeddings for each document.
   */
  async embedDocuments(texts) {
    const batches = chunkArray(this.stripNewLines ? texts.map((t) => t.replace(/\n/g, " ")) : texts, this.batchSize);
    const batchRequests = batches.map((batch) => {
      const params = {
        model: this.model,
        input: batch
      };
      if (this.dimensions) {
        params.dimensions = this.dimensions;
      }
      return this.embeddingWithRetry(params);
    });
    const batchResponses = await Promise.all(batchRequests);
    const embeddings = [];
    for (let i = 0; i < batchResponses.length; i += 1) {
      const batch = batches[i];
      const { data: batchResponse } = batchResponses[i];
      for (let j = 0; j < batch.length; j += 1) {
        embeddings.push(batchResponse[j].embedding);
      }
    }
    return embeddings;
  }
  /**
   * Method to generate an embedding for a single document. Calls the
   * embeddingWithRetry method with the document as the input.
   * @param text Document to generate an embedding for.
   * @returns Promise that resolves to an embedding for the document.
   */
  async embedQuery(text) {
    const params = {
      model: this.model,
      input: this.stripNewLines ? text.replace(/\n/g, " ") : text
    };
    if (this.dimensions) {
      params.dimensions = this.dimensions;
    }
    const { data } = await this.embeddingWithRetry(params);
    return data[0].embedding;
  }
  /**
   * Private method to make a request to the OpenAI API to generate
   * embeddings. Handles the retry logic and returns the response from the
   * API.
   * @param request Request to send to the OpenAI API.
   * @returns Promise that resolves to the response from the API.
   */
  async embeddingWithRetry(request) {
    if (!this.client) {
      const openAIEndpointConfig = {
        baseURL: this.clientConfig.baseURL
      };
      const endpoint = getEndpoint(openAIEndpointConfig);
      const params = {
        ...this.clientConfig,
        baseURL: endpoint,
        timeout: this.timeout,
        maxRetries: 0
      };
      if (!params.baseURL) {
        delete params.baseURL;
      }
      this.client = new OpenAI(params);
    }
    const requestOptions = {};
    return this.caller.call(async () => {
      try {
        const res = await this.client.embeddings.create(request, requestOptions);
        return res;
      } catch (e) {
        const error = wrapOpenAIClientError(e);
        throw error;
      }
    });
  }
};

// node_modules/@langchain/openai/dist/azure/embeddings.js
var AzureOpenAIEmbeddings = class extends OpenAIEmbeddings {
  constructor(fields) {
    super(fields);
    Object.defineProperty(this, "azureOpenAIApiVersion", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIApiKey", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureADTokenProvider", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIApiInstanceName", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIApiDeploymentName", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "azureOpenAIBasePath", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.batchSize = (fields == null ? void 0 : fields.batchSize) ?? 1;
    this.azureOpenAIApiKey = (fields == null ? void 0 : fields.azureOpenAIApiKey) ?? (fields == null ? void 0 : fields.apiKey) ?? getEnvironmentVariable("AZURE_OPENAI_API_KEY");
    this.azureOpenAIApiVersion = (fields == null ? void 0 : fields.azureOpenAIApiVersion) ?? (fields == null ? void 0 : fields.openAIApiVersion) ?? getEnvironmentVariable("AZURE_OPENAI_API_VERSION");
    this.azureOpenAIBasePath = (fields == null ? void 0 : fields.azureOpenAIBasePath) ?? getEnvironmentVariable("AZURE_OPENAI_BASE_PATH");
    this.azureOpenAIApiInstanceName = (fields == null ? void 0 : fields.azureOpenAIApiInstanceName) ?? getEnvironmentVariable("AZURE_OPENAI_API_INSTANCE_NAME");
    this.azureOpenAIApiDeploymentName = ((fields == null ? void 0 : fields.azureOpenAIApiEmbeddingsDeploymentName) || (fields == null ? void 0 : fields.azureOpenAIApiDeploymentName)) ?? (getEnvironmentVariable("AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME") || getEnvironmentVariable("AZURE_OPENAI_API_DEPLOYMENT_NAME"));
    this.azureADTokenProvider = fields == null ? void 0 : fields.azureADTokenProvider;
  }
  async embeddingWithRetry(request) {
    var _a2;
    if (!this.client) {
      const openAIEndpointConfig = {
        azureOpenAIApiDeploymentName: this.azureOpenAIApiDeploymentName,
        azureOpenAIApiInstanceName: this.azureOpenAIApiInstanceName,
        azureOpenAIApiKey: this.azureOpenAIApiKey,
        azureOpenAIBasePath: this.azureOpenAIBasePath,
        azureADTokenProvider: this.azureADTokenProvider,
        baseURL: this.clientConfig.baseURL
      };
      const endpoint = getEndpoint(openAIEndpointConfig);
      const params = {
        ...this.clientConfig,
        baseURL: endpoint,
        timeout: this.timeout,
        maxRetries: 0
      };
      if (!this.azureADTokenProvider) {
        params.apiKey = openAIEndpointConfig.azureOpenAIApiKey;
      }
      if (!params.baseURL) {
        delete params.baseURL;
      }
      params.defaultHeaders = {
        ...params.defaultHeaders,
        "User-Agent": ((_a2 = params.defaultHeaders) == null ? void 0 : _a2["User-Agent"]) ? `${params.defaultHeaders["User-Agent"]}: langchainjs-azure-openai-v2` : `langchainjs-azure-openai-v2`
      };
      this.client = new AzureOpenAI({
        apiVersion: this.azureOpenAIApiVersion,
        azureADTokenProvider: this.azureADTokenProvider,
        deployment: this.azureOpenAIApiDeploymentName,
        ...params
      });
    }
    const requestOptions = {};
    if (this.azureOpenAIApiKey) {
      requestOptions.headers = {
        "api-key": this.azureOpenAIApiKey,
        ...requestOptions.headers
      };
      requestOptions.query = {
        "api-version": this.azureOpenAIApiVersion,
        ...requestOptions.query
      };
    }
    return this.caller.call(async () => {
      try {
        const res = await this.client.embeddings.create(
          request,
          // This unknown cast is required because OpenAI types seem to be incorrect here
          // without it, we can't pass arbitrary keys via the `query` field in the options,
          // which means we can't specify the `api-version` as required by Azure OpenAI.
          // See https://learn.microsoft.com/en-us/azure/ai-services/openai/reference#rest-api-versioning
          requestOptions
        );
        return res;
      } catch (e) {
        const error = wrapOpenAIClientError(e);
        throw error;
      }
    });
  }
};

// node_modules/@langchain/core/dist/tools/index.js
var StructuredTool = class extends BaseLangChain {
  get lc_namespace() {
    return ["langchain", "tools"];
  }
  constructor(fields) {
    super(fields ?? {});
    Object.defineProperty(this, "returnDirect", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: false
    });
    Object.defineProperty(this, "verboseParsingErrors", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: false
    });
    Object.defineProperty(this, "responseFormat", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "content"
    });
    this.verboseParsingErrors = (fields == null ? void 0 : fields.verboseParsingErrors) ?? this.verboseParsingErrors;
    this.responseFormat = (fields == null ? void 0 : fields.responseFormat) ?? this.responseFormat;
  }
  /**
   * Invokes the tool with the provided input and configuration.
   * @param input The input for the tool.
   * @param config Optional configuration for the tool.
   * @returns A Promise that resolves with the tool's output.
   */
  async invoke(input, config) {
    let toolInput;
    let enrichedConfig = ensureConfig(config);
    if (_isToolCall(input)) {
      toolInput = input.args;
      enrichedConfig = {
        ...enrichedConfig,
        toolCall: input
      };
    } else {
      toolInput = input;
    }
    return this.call(toolInput, enrichedConfig);
  }
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
   *
   * Calls the tool with the provided argument, configuration, and tags. It
   * parses the input according to the schema, handles any errors, and
   * manages callbacks.
   * @param arg The input argument for the tool.
   * @param configArg Optional configuration or callbacks for the tool.
   * @param tags Optional tags for the tool.
   * @returns A Promise that resolves with a string.
   */
  async call(arg, configArg, tags) {
    const inputForValidation = _isToolCall(arg) ? arg.args : arg;
    let parsed;
    if (isZodSchema(this.schema)) {
      try {
        parsed = await this.schema.parseAsync(inputForValidation);
      } catch (e) {
        let message = `Received tool input did not match expected schema`;
        if (this.verboseParsingErrors) {
          message = `${message}
Details: ${e.message}`;
        }
        throw new ToolInputParsingException(message, JSON.stringify(arg));
      }
    } else {
      const result2 = validate(inputForValidation, this.schema);
      if (!result2.valid) {
        let message = `Received tool input did not match expected schema`;
        if (this.verboseParsingErrors) {
          message = `${message}
Details: ${result2.errors.map((e) => `${e.keywordLocation}: ${e.error}`).join("\n")}`;
        }
        throw new ToolInputParsingException(message, JSON.stringify(arg));
      }
      parsed = inputForValidation;
    }
    const config = parseCallbackConfigArg(configArg);
    const callbackManager_ = CallbackManager.configure(config.callbacks, this.callbacks, config.tags || tags, this.tags, config.metadata, this.metadata, { verbose: this.verbose });
    const runManager = await (callbackManager_ == null ? void 0 : callbackManager_.handleToolStart(
      this.toJSON(),
      // Log the original raw input arg
      typeof arg === "string" ? arg : JSON.stringify(arg),
      config.runId,
      void 0,
      void 0,
      void 0,
      config.runName
    ));
    delete config.runId;
    let result;
    try {
      result = await this._call(parsed, runManager, config);
    } catch (e) {
      await (runManager == null ? void 0 : runManager.handleToolError(e));
      throw e;
    }
    let content;
    let artifact;
    if (this.responseFormat === "content_and_artifact") {
      if (Array.isArray(result) && result.length === 2) {
        [content, artifact] = result;
      } else {
        throw new Error(`Tool response format is "content_and_artifact" but the output was not a two-tuple.
Result: ${JSON.stringify(result)}`);
      }
    } else {
      content = result;
    }
    let toolCallId;
    if (_isToolCall(arg)) {
      toolCallId = arg.id;
    }
    if (!toolCallId && _configHasToolCallId(config)) {
      toolCallId = config.toolCall.id;
    }
    const formattedOutput = _formatToolOutput({
      content,
      artifact,
      toolCallId,
      name: this.name
    });
    await (runManager == null ? void 0 : runManager.handleToolEnd(formattedOutput));
    return formattedOutput;
  }
};
var Tool = class extends StructuredTool {
  constructor(fields) {
    super(fields);
    Object.defineProperty(this, "schema", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: external_exports.object({ input: external_exports.string().optional() }).transform((obj) => obj.input)
    });
  }
  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
   *
   * Calls the tool with the provided argument and callbacks. It handles
   * string inputs specifically.
   * @param arg The input argument for the tool, which can be a string, undefined, or an input of the tool's schema.
   * @param callbacks Optional callbacks for the tool.
   * @returns A Promise that resolves with a string.
   */
  // Match the base class signature including the generics and conditional return type
  call(arg, callbacks) {
    const structuredArg = typeof arg === "string" || arg == null ? { input: arg } : arg;
    return super.call(structuredArg, callbacks);
  }
};
function _formatToolOutput(params) {
  const { content, artifact, toolCallId } = params;
  if (toolCallId && !isDirectToolOutput(content)) {
    if (typeof content === "string" || Array.isArray(content) && content.every((item) => typeof item === "object")) {
      return new ToolMessage({
        content,
        artifact,
        tool_call_id: toolCallId,
        name: params.name
      });
    } else {
      return new ToolMessage({
        content: _stringify(content),
        artifact,
        tool_call_id: toolCallId,
        name: params.name
      });
    }
  } else {
    return content;
  }
}
function _stringify(content) {
  try {
    return JSON.stringify(content, null, 2) ?? "";
  } catch (_noOp) {
    return `${content}`;
  }
}

// node_modules/@langchain/openai/dist/tools/dalle.js
var DallEAPIWrapper = class extends Tool {
  static lc_name() {
    return "DallEAPIWrapper";
  }
  constructor(fields) {
    if ((fields == null ? void 0 : fields.responseFormat) !== void 0 && ["url", "b64_json"].includes(fields.responseFormat)) {
      fields.dallEResponseFormat = fields.responseFormat;
      fields.responseFormat = "content";
    }
    super(fields);
    Object.defineProperty(this, "name", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "dalle_api_wrapper"
    });
    Object.defineProperty(this, "description", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "A wrapper around OpenAI DALL-E API. Useful for when you need to generate images from a text description. Input should be an image description."
    });
    Object.defineProperty(this, "client", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "model", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "dall-e-3"
    });
    Object.defineProperty(this, "style", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "vivid"
    });
    Object.defineProperty(this, "quality", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "standard"
    });
    Object.defineProperty(this, "n", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: 1
    });
    Object.defineProperty(this, "size", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "1024x1024"
    });
    Object.defineProperty(this, "dallEResponseFormat", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: "url"
    });
    Object.defineProperty(this, "user", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    const openAIApiKey = (fields == null ? void 0 : fields.apiKey) ?? (fields == null ? void 0 : fields.openAIApiKey) ?? getEnvironmentVariable("OPENAI_API_KEY");
    const organization = (fields == null ? void 0 : fields.organization) ?? getEnvironmentVariable("OPENAI_ORGANIZATION");
    const clientConfig = {
      apiKey: openAIApiKey,
      organization,
      dangerouslyAllowBrowser: true,
      baseURL: fields == null ? void 0 : fields.baseUrl
    };
    this.client = new OpenAI(clientConfig);
    this.model = (fields == null ? void 0 : fields.model) ?? (fields == null ? void 0 : fields.modelName) ?? this.model;
    this.style = (fields == null ? void 0 : fields.style) ?? this.style;
    this.quality = (fields == null ? void 0 : fields.quality) ?? this.quality;
    this.n = (fields == null ? void 0 : fields.n) ?? this.n;
    this.size = (fields == null ? void 0 : fields.size) ?? this.size;
    this.dallEResponseFormat = (fields == null ? void 0 : fields.dallEResponseFormat) ?? this.dallEResponseFormat;
    this.user = fields == null ? void 0 : fields.user;
  }
  /**
   * Processes the API response if multiple images are generated.
   * Returns a list of MessageContentImageUrl objects. If the response
   * format is `url`, then the `image_url` field will contain the URL.
   * If it is `b64_json`, then the `image_url` field will contain an object
   * with a `url` field with the base64 encoded image.
   *
   * @param {OpenAIClient.Images.ImagesResponse[]} response The API response
   * @returns {MessageContentImageUrl[]}
   */
  processMultipleGeneratedUrls(response) {
    if (this.dallEResponseFormat === "url") {
      return response.flatMap((res) => {
        var _a2;
        const imageUrlContent = ((_a2 = res.data) == null ? void 0 : _a2.flatMap((item) => {
          if (!item.url)
            return [];
          return {
            type: "image_url",
            image_url: item.url
          };
        }).filter((item) => item !== void 0 && item.type === "image_url" && typeof item.image_url === "string" && item.image_url !== void 0)) ?? [];
        return imageUrlContent;
      });
    } else {
      return response.flatMap((res) => {
        var _a2;
        const b64Content = ((_a2 = res.data) == null ? void 0 : _a2.flatMap((item) => {
          if (!item.b64_json)
            return [];
          return {
            type: "image_url",
            image_url: {
              url: item.b64_json
            }
          };
        }).filter((item) => item !== void 0 && item.type === "image_url" && typeof item.image_url === "object" && "url" in item.image_url && typeof item.image_url.url === "string" && item.image_url.url !== void 0)) ?? [];
        return b64Content;
      });
    }
  }
  /** @ignore */
  async _call(input) {
    var _a2, _b;
    const generateImageFields = {
      model: this.model,
      prompt: input,
      n: 1,
      size: this.size,
      response_format: this.dallEResponseFormat,
      style: this.style,
      quality: this.quality,
      user: this.user
    };
    if (this.n > 1) {
      const results = await Promise.all(Array.from({ length: this.n }).map(() => this.client.images.generate(generateImageFields)));
      return this.processMultipleGeneratedUrls(results);
    }
    const response = await this.client.images.generate(generateImageFields);
    let data = "";
    if (this.dallEResponseFormat === "url") {
      [data] = ((_a2 = response.data) == null ? void 0 : _a2.map((item) => item.url).filter((url) => url !== "undefined")) ?? [];
    } else {
      [data] = ((_b = response.data) == null ? void 0 : _b.map((item) => item.b64_json).filter((b64_json) => b64_json !== "undefined")) ?? [];
    }
    return data;
  }
};
Object.defineProperty(DallEAPIWrapper, "toolName", {
  enumerable: true,
  configurable: true,
  writable: true,
  value: "dalle_api_wrapper"
});

// node_modules/@langchain/openai/dist/utils/prompts.js
function convertPromptToOpenAI(formattedPrompt) {
  const messages = formattedPrompt.toChatMessages();
  return {
    messages: _convertMessagesToOpenAIParams(messages)
  };
}
export {
  AzureChatOpenAI,
  AzureOpenAI2 as AzureOpenAI,
  AzureOpenAIEmbeddings,
  ChatOpenAI,
  DallEAPIWrapper,
  OpenAI2 as OpenAI,
  OpenAI as OpenAIClient,
  OpenAIEmbeddings,
  _convertMessagesToOpenAIParams,
  convertPromptToOpenAI,
  formatToOpenAIAssistantTool,
  convertToOpenAIFunction as formatToOpenAIFunction,
  convertToOpenAITool as formatToOpenAITool,
  formatToOpenAIToolChoice,
  getEndpoint,
  messageToOpenAIRole,
  toFile,
  wrapOpenAIClientError
};
/*! Bundled license information:

@langchain/core/dist/utils/js-sha1/hash.js:
  (*
   * [js-sha1]{@link https://github.com/emn178/js-sha1}
   *
   * @version 0.6.0
   * @author Chen, Yi-Cyuan [emn178@gmail.com]
   * @copyright Chen, Yi-Cyuan 2014-2017
   * @license MIT
   *)
*/
//# sourceMappingURL=@langchain_openai.js.map
