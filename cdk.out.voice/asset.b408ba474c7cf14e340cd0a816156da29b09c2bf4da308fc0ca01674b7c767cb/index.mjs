import { createRequire } from 'module';const require = createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/zod/v3/helpers/util.js
var util, objectUtil, ZodParsedType, getParsedType;
var init_util = __esm({
  "node_modules/zod/v3/helpers/util.js"() {
    (function(util2) {
      util2.assertEqual = (_) => {
      };
      function assertIs(_arg) {
      }
      util2.assertIs = assertIs;
      function assertNever(_x) {
        throw new Error();
      }
      util2.assertNever = assertNever;
      util2.arrayToEnum = (items) => {
        const obj = {};
        for (const item of items) {
          obj[item] = item;
        }
        return obj;
      };
      util2.getValidEnumValues = (obj) => {
        const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
        const filtered = {};
        for (const k of validKeys) {
          filtered[k] = obj[k];
        }
        return util2.objectValues(filtered);
      };
      util2.objectValues = (obj) => {
        return util2.objectKeys(obj).map(function(e) {
          return obj[e];
        });
      };
      util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
        const keys = [];
        for (const key in object) {
          if (Object.prototype.hasOwnProperty.call(object, key)) {
            keys.push(key);
          }
        }
        return keys;
      };
      util2.find = (arr, checker) => {
        for (const item of arr) {
          if (checker(item))
            return item;
        }
        return void 0;
      };
      util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
      function joinValues(array, separator = " | ") {
        return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
      }
      util2.joinValues = joinValues;
      util2.jsonStringifyReplacer = (_, value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      };
    })(util || (util = {}));
    (function(objectUtil2) {
      objectUtil2.mergeShapes = (first, second) => {
        return {
          ...first,
          ...second
          // second overwrites first
        };
      };
    })(objectUtil || (objectUtil = {}));
    ZodParsedType = util.arrayToEnum([
      "string",
      "nan",
      "number",
      "integer",
      "float",
      "boolean",
      "date",
      "bigint",
      "symbol",
      "function",
      "undefined",
      "null",
      "array",
      "object",
      "unknown",
      "promise",
      "void",
      "never",
      "map",
      "set"
    ]);
    getParsedType = (data) => {
      const t = typeof data;
      switch (t) {
        case "undefined":
          return ZodParsedType.undefined;
        case "string":
          return ZodParsedType.string;
        case "number":
          return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
        case "boolean":
          return ZodParsedType.boolean;
        case "function":
          return ZodParsedType.function;
        case "bigint":
          return ZodParsedType.bigint;
        case "symbol":
          return ZodParsedType.symbol;
        case "object":
          if (Array.isArray(data)) {
            return ZodParsedType.array;
          }
          if (data === null) {
            return ZodParsedType.null;
          }
          if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
            return ZodParsedType.promise;
          }
          if (typeof Map !== "undefined" && data instanceof Map) {
            return ZodParsedType.map;
          }
          if (typeof Set !== "undefined" && data instanceof Set) {
            return ZodParsedType.set;
          }
          if (typeof Date !== "undefined" && data instanceof Date) {
            return ZodParsedType.date;
          }
          return ZodParsedType.object;
        default:
          return ZodParsedType.unknown;
      }
    };
  }
});

// node_modules/zod/v3/ZodError.js
var ZodIssueCode, quotelessJson, ZodError;
var init_ZodError = __esm({
  "node_modules/zod/v3/ZodError.js"() {
    init_util();
    ZodIssueCode = util.arrayToEnum([
      "invalid_type",
      "invalid_literal",
      "custom",
      "invalid_union",
      "invalid_union_discriminator",
      "invalid_enum_value",
      "unrecognized_keys",
      "invalid_arguments",
      "invalid_return_type",
      "invalid_date",
      "invalid_string",
      "too_small",
      "too_big",
      "invalid_intersection_types",
      "not_multiple_of",
      "not_finite"
    ]);
    quotelessJson = (obj) => {
      const json = JSON.stringify(obj, null, 2);
      return json.replace(/"([^"]+)":/g, "$1:");
    };
    ZodError = class _ZodError extends Error {
      get errors() {
        return this.issues;
      }
      constructor(issues) {
        super();
        this.issues = [];
        this.addIssue = (sub) => {
          this.issues = [...this.issues, sub];
        };
        this.addIssues = (subs = []) => {
          this.issues = [...this.issues, ...subs];
        };
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
          Object.setPrototypeOf(this, actualProto);
        } else {
          this.__proto__ = actualProto;
        }
        this.name = "ZodError";
        this.issues = issues;
      }
      format(_mapper) {
        const mapper = _mapper || function(issue) {
          return issue.message;
        };
        const fieldErrors = { _errors: [] };
        const processError = (error) => {
          for (const issue of error.issues) {
            if (issue.code === "invalid_union") {
              issue.unionErrors.map(processError);
            } else if (issue.code === "invalid_return_type") {
              processError(issue.returnTypeError);
            } else if (issue.code === "invalid_arguments") {
              processError(issue.argumentsError);
            } else if (issue.path.length === 0) {
              fieldErrors._errors.push(mapper(issue));
            } else {
              let curr = fieldErrors;
              let i = 0;
              while (i < issue.path.length) {
                const el = issue.path[i];
                const terminal = i === issue.path.length - 1;
                if (!terminal) {
                  curr[el] = curr[el] || { _errors: [] };
                } else {
                  curr[el] = curr[el] || { _errors: [] };
                  curr[el]._errors.push(mapper(issue));
                }
                curr = curr[el];
                i++;
              }
            }
          }
        };
        processError(this);
        return fieldErrors;
      }
      static assert(value) {
        if (!(value instanceof _ZodError)) {
          throw new Error(`Not a ZodError: ${value}`);
        }
      }
      toString() {
        return this.message;
      }
      get message() {
        return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
      }
      get isEmpty() {
        return this.issues.length === 0;
      }
      flatten(mapper = (issue) => issue.message) {
        const fieldErrors = {};
        const formErrors = [];
        for (const sub of this.issues) {
          if (sub.path.length > 0) {
            const firstEl = sub.path[0];
            fieldErrors[firstEl] = fieldErrors[firstEl] || [];
            fieldErrors[firstEl].push(mapper(sub));
          } else {
            formErrors.push(mapper(sub));
          }
        }
        return { formErrors, fieldErrors };
      }
      get formErrors() {
        return this.flatten();
      }
    };
    ZodError.create = (issues) => {
      const error = new ZodError(issues);
      return error;
    };
  }
});

// node_modules/zod/v3/locales/en.js
var errorMap, en_default;
var init_en = __esm({
  "node_modules/zod/v3/locales/en.js"() {
    init_ZodError();
    init_util();
    errorMap = (issue, _ctx) => {
      let message;
      switch (issue.code) {
        case ZodIssueCode.invalid_type:
          if (issue.received === ZodParsedType.undefined) {
            message = "Required";
          } else {
            message = `Expected ${issue.expected}, received ${issue.received}`;
          }
          break;
        case ZodIssueCode.invalid_literal:
          message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
          break;
        case ZodIssueCode.unrecognized_keys:
          message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
          break;
        case ZodIssueCode.invalid_union:
          message = `Invalid input`;
          break;
        case ZodIssueCode.invalid_union_discriminator:
          message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
          break;
        case ZodIssueCode.invalid_enum_value:
          message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
          break;
        case ZodIssueCode.invalid_arguments:
          message = `Invalid function arguments`;
          break;
        case ZodIssueCode.invalid_return_type:
          message = `Invalid function return type`;
          break;
        case ZodIssueCode.invalid_date:
          message = `Invalid date`;
          break;
        case ZodIssueCode.invalid_string:
          if (typeof issue.validation === "object") {
            if ("includes" in issue.validation) {
              message = `Invalid input: must include "${issue.validation.includes}"`;
              if (typeof issue.validation.position === "number") {
                message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
              }
            } else if ("startsWith" in issue.validation) {
              message = `Invalid input: must start with "${issue.validation.startsWith}"`;
            } else if ("endsWith" in issue.validation) {
              message = `Invalid input: must end with "${issue.validation.endsWith}"`;
            } else {
              util.assertNever(issue.validation);
            }
          } else if (issue.validation !== "regex") {
            message = `Invalid ${issue.validation}`;
          } else {
            message = "Invalid";
          }
          break;
        case ZodIssueCode.too_small:
          if (issue.type === "array")
            message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
          else if (issue.type === "string")
            message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
          else if (issue.type === "number")
            message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
          else if (issue.type === "bigint")
            message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
          else if (issue.type === "date")
            message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
          else
            message = "Invalid input";
          break;
        case ZodIssueCode.too_big:
          if (issue.type === "array")
            message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
          else if (issue.type === "string")
            message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
          else if (issue.type === "number")
            message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
          else if (issue.type === "bigint")
            message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
          else if (issue.type === "date")
            message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
          else
            message = "Invalid input";
          break;
        case ZodIssueCode.custom:
          message = `Invalid input`;
          break;
        case ZodIssueCode.invalid_intersection_types:
          message = `Intersection results could not be merged`;
          break;
        case ZodIssueCode.not_multiple_of:
          message = `Number must be a multiple of ${issue.multipleOf}`;
          break;
        case ZodIssueCode.not_finite:
          message = "Number must be finite";
          break;
        default:
          message = _ctx.defaultError;
          util.assertNever(issue);
      }
      return { message };
    };
    en_default = errorMap;
  }
});

// node_modules/zod/v3/errors.js
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var overrideErrorMap;
var init_errors = __esm({
  "node_modules/zod/v3/errors.js"() {
    init_en();
    overrideErrorMap = en_default;
  }
});

// node_modules/zod/v3/helpers/parseUtil.js
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var makeIssue, EMPTY_PATH, ParseStatus, INVALID, DIRTY, OK, isAborted, isDirty, isValid, isAsync;
var init_parseUtil = __esm({
  "node_modules/zod/v3/helpers/parseUtil.js"() {
    init_errors();
    init_en();
    makeIssue = (params) => {
      const { data, path, errorMaps, issueData } = params;
      const fullPath = [...path, ...issueData.path || []];
      const fullIssue = {
        ...issueData,
        path: fullPath
      };
      if (issueData.message !== void 0) {
        return {
          ...issueData,
          path: fullPath,
          message: issueData.message
        };
      }
      let errorMessage = "";
      const maps = errorMaps.filter((m) => !!m).slice().reverse();
      for (const map of maps) {
        errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
      }
      return {
        ...issueData,
        path: fullPath,
        message: errorMessage
      };
    };
    EMPTY_PATH = [];
    ParseStatus = class _ParseStatus {
      constructor() {
        this.value = "valid";
      }
      dirty() {
        if (this.value === "valid")
          this.value = "dirty";
      }
      abort() {
        if (this.value !== "aborted")
          this.value = "aborted";
      }
      static mergeArray(status, results) {
        const arrayValue = [];
        for (const s2 of results) {
          if (s2.status === "aborted")
            return INVALID;
          if (s2.status === "dirty")
            status.dirty();
          arrayValue.push(s2.value);
        }
        return { status: status.value, value: arrayValue };
      }
      static async mergeObjectAsync(status, pairs) {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value
          });
        }
        return _ParseStatus.mergeObjectSync(status, syncPairs);
      }
      static mergeObjectSync(status, pairs) {
        const finalObject = {};
        for (const pair of pairs) {
          const { key, value } = pair;
          if (key.status === "aborted")
            return INVALID;
          if (value.status === "aborted")
            return INVALID;
          if (key.status === "dirty")
            status.dirty();
          if (value.status === "dirty")
            status.dirty();
          if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
            finalObject[key.value] = value.value;
          }
        }
        return { status: status.value, value: finalObject };
      }
    };
    INVALID = Object.freeze({
      status: "aborted"
    });
    DIRTY = (value) => ({ status: "dirty", value });
    OK = (value) => ({ status: "valid", value });
    isAborted = (x) => x.status === "aborted";
    isDirty = (x) => x.status === "dirty";
    isValid = (x) => x.status === "valid";
    isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
  }
});

// node_modules/zod/v3/helpers/typeAliases.js
var init_typeAliases = __esm({
  "node_modules/zod/v3/helpers/typeAliases.js"() {
  }
});

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
var init_errorUtil = __esm({
  "node_modules/zod/v3/helpers/errorUtil.js"() {
    (function(errorUtil2) {
      errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
      errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
    })(errorUtil || (errorUtil = {}));
  }
});

// node_modules/zod/v3/types.js
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var ParseInputLazyPath, handleResult, ZodType, cuidRegex, cuid2Regex, ulidRegex, uuidRegex, nanoidRegex, jwtRegex, durationRegex, emailRegex, _emojiRegex, emojiRegex, ipv4Regex, ipv4CidrRegex, ipv6Regex, ipv6CidrRegex, base64Regex, base64urlRegex, dateRegexSource, dateRegex, ZodString, ZodNumber, ZodBigInt, ZodBoolean, ZodDate, ZodSymbol, ZodUndefined, ZodNull, ZodAny, ZodUnknown, ZodNever, ZodVoid, ZodArray, ZodObject, ZodUnion, getDiscriminator, ZodDiscriminatedUnion, ZodIntersection, ZodTuple, ZodRecord, ZodMap, ZodSet, ZodFunction, ZodLazy, ZodLiteral, ZodEnum, ZodNativeEnum, ZodPromise, ZodEffects, ZodOptional, ZodNullable, ZodDefault, ZodCatch, ZodNaN, BRAND, ZodBranded, ZodPipeline, ZodReadonly, late, ZodFirstPartyTypeKind, instanceOfType, stringType, numberType, nanType, bigIntType, booleanType, dateType, symbolType, undefinedType, nullType, anyType, unknownType, neverType, voidType, arrayType, objectType, strictObjectType, unionType, discriminatedUnionType, intersectionType, tupleType, recordType, mapType, setType, functionType, lazyType, literalType, enumType, nativeEnumType, promiseType, effectsType, optionalType, nullableType, preprocessType, pipelineType, ostring, onumber, oboolean, coerce, NEVER;
var init_types = __esm({
  "node_modules/zod/v3/types.js"() {
    init_ZodError();
    init_errors();
    init_errorUtil();
    init_parseUtil();
    init_util();
    ParseInputLazyPath = class {
      constructor(parent, value, path, key) {
        this._cachedPath = [];
        this.parent = parent;
        this.data = value;
        this._path = path;
        this._key = key;
      }
      get path() {
        if (!this._cachedPath.length) {
          if (Array.isArray(this._key)) {
            this._cachedPath.push(...this._path, ...this._key);
          } else {
            this._cachedPath.push(...this._path, this._key);
          }
        }
        return this._cachedPath;
      }
    };
    handleResult = (ctx, result) => {
      if (isValid(result)) {
        return { success: true, data: result.value };
      } else {
        if (!ctx.common.issues.length) {
          throw new Error("Validation failed but no issues detected.");
        }
        return {
          success: false,
          get error() {
            if (this._error)
              return this._error;
            const error = new ZodError(ctx.common.issues);
            this._error = error;
            return this._error;
          }
        };
      }
    };
    ZodType = class {
      get description() {
        return this._def.description;
      }
      _getType(input) {
        return getParsedType(input.data);
      }
      _getOrReturnCtx(input, ctx) {
        return ctx || {
          common: input.parent.common,
          data: input.data,
          parsedType: getParsedType(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        };
      }
      _processInputParams(input) {
        return {
          status: new ParseStatus(),
          ctx: {
            common: input.parent.common,
            data: input.data,
            parsedType: getParsedType(input.data),
            schemaErrorMap: this._def.errorMap,
            path: input.path,
            parent: input.parent
          }
        };
      }
      _parseSync(input) {
        const result = this._parse(input);
        if (isAsync(result)) {
          throw new Error("Synchronous parse encountered promise.");
        }
        return result;
      }
      _parseAsync(input) {
        const result = this._parse(input);
        return Promise.resolve(result);
      }
      parse(data, params) {
        const result = this.safeParse(data, params);
        if (result.success)
          return result.data;
        throw result.error;
      }
      safeParse(data, params) {
        const ctx = {
          common: {
            issues: [],
            async: params?.async ?? false,
            contextualErrorMap: params?.errorMap
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: getParsedType(data)
        };
        const result = this._parseSync({ data, path: ctx.path, parent: ctx });
        return handleResult(ctx, result);
      }
      "~validate"(data) {
        const ctx = {
          common: {
            issues: [],
            async: !!this["~standard"].async
          },
          path: [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: getParsedType(data)
        };
        if (!this["~standard"].async) {
          try {
            const result = this._parseSync({ data, path: [], parent: ctx });
            return isValid(result) ? {
              value: result.value
            } : {
              issues: ctx.common.issues
            };
          } catch (err) {
            if (err?.message?.toLowerCase()?.includes("encountered")) {
              this["~standard"].async = true;
            }
            ctx.common = {
              issues: [],
              async: true
            };
          }
        }
        return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        });
      }
      async parseAsync(data, params) {
        const result = await this.safeParseAsync(data, params);
        if (result.success)
          return result.data;
        throw result.error;
      }
      async safeParseAsync(data, params) {
        const ctx = {
          common: {
            issues: [],
            contextualErrorMap: params?.errorMap,
            async: true
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: getParsedType(data)
        };
        const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
        const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
        return handleResult(ctx, result);
      }
      refine(check, message) {
        const getIssueProperties = (val) => {
          if (typeof message === "string" || typeof message === "undefined") {
            return { message };
          } else if (typeof message === "function") {
            return message(val);
          } else {
            return message;
          }
        };
        return this._refinement((val, ctx) => {
          const result = check(val);
          const setError = () => ctx.addIssue({
            code: ZodIssueCode.custom,
            ...getIssueProperties(val)
          });
          if (typeof Promise !== "undefined" && result instanceof Promise) {
            return result.then((data) => {
              if (!data) {
                setError();
                return false;
              } else {
                return true;
              }
            });
          }
          if (!result) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      refinement(check, refinementData) {
        return this._refinement((val, ctx) => {
          if (!check(val)) {
            ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
            return false;
          } else {
            return true;
          }
        });
      }
      _refinement(refinement) {
        return new ZodEffects({
          schema: this,
          typeName: ZodFirstPartyTypeKind.ZodEffects,
          effect: { type: "refinement", refinement }
        });
      }
      superRefine(refinement) {
        return this._refinement(refinement);
      }
      constructor(def) {
        this.spa = this.safeParseAsync;
        this._def = def;
        this.parse = this.parse.bind(this);
        this.safeParse = this.safeParse.bind(this);
        this.parseAsync = this.parseAsync.bind(this);
        this.safeParseAsync = this.safeParseAsync.bind(this);
        this.spa = this.spa.bind(this);
        this.refine = this.refine.bind(this);
        this.refinement = this.refinement.bind(this);
        this.superRefine = this.superRefine.bind(this);
        this.optional = this.optional.bind(this);
        this.nullable = this.nullable.bind(this);
        this.nullish = this.nullish.bind(this);
        this.array = this.array.bind(this);
        this.promise = this.promise.bind(this);
        this.or = this.or.bind(this);
        this.and = this.and.bind(this);
        this.transform = this.transform.bind(this);
        this.brand = this.brand.bind(this);
        this.default = this.default.bind(this);
        this.catch = this.catch.bind(this);
        this.describe = this.describe.bind(this);
        this.pipe = this.pipe.bind(this);
        this.readonly = this.readonly.bind(this);
        this.isNullable = this.isNullable.bind(this);
        this.isOptional = this.isOptional.bind(this);
        this["~standard"] = {
          version: 1,
          vendor: "zod",
          validate: (data) => this["~validate"](data)
        };
      }
      optional() {
        return ZodOptional.create(this, this._def);
      }
      nullable() {
        return ZodNullable.create(this, this._def);
      }
      nullish() {
        return this.nullable().optional();
      }
      array() {
        return ZodArray.create(this);
      }
      promise() {
        return ZodPromise.create(this, this._def);
      }
      or(option) {
        return ZodUnion.create([this, option], this._def);
      }
      and(incoming) {
        return ZodIntersection.create(this, incoming, this._def);
      }
      transform(transform) {
        return new ZodEffects({
          ...processCreateParams(this._def),
          schema: this,
          typeName: ZodFirstPartyTypeKind.ZodEffects,
          effect: { type: "transform", transform }
        });
      }
      default(def) {
        const defaultValueFunc = typeof def === "function" ? def : () => def;
        return new ZodDefault({
          ...processCreateParams(this._def),
          innerType: this,
          defaultValue: defaultValueFunc,
          typeName: ZodFirstPartyTypeKind.ZodDefault
        });
      }
      brand() {
        return new ZodBranded({
          typeName: ZodFirstPartyTypeKind.ZodBranded,
          type: this,
          ...processCreateParams(this._def)
        });
      }
      catch(def) {
        const catchValueFunc = typeof def === "function" ? def : () => def;
        return new ZodCatch({
          ...processCreateParams(this._def),
          innerType: this,
          catchValue: catchValueFunc,
          typeName: ZodFirstPartyTypeKind.ZodCatch
        });
      }
      describe(description) {
        const This = this.constructor;
        return new This({
          ...this._def,
          description
        });
      }
      pipe(target) {
        return ZodPipeline.create(this, target);
      }
      readonly() {
        return ZodReadonly.create(this);
      }
      isOptional() {
        return this.safeParse(void 0).success;
      }
      isNullable() {
        return this.safeParse(null).success;
      }
    };
    cuidRegex = /^c[^\s-]{8,}$/i;
    cuid2Regex = /^[0-9a-z]+$/;
    ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
    uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
    nanoidRegex = /^[a-z0-9_-]{21}$/i;
    jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
    emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
    _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
    ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
    ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
    ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
    base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
    dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
    dateRegex = new RegExp(`^${dateRegexSource}$`);
    ZodString = class _ZodString extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = String(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.string) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.string,
            received: ctx2.parsedType
          });
          return INVALID;
        }
        const status = new ParseStatus();
        let ctx = void 0;
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            if (input.data.length < check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            if (input.data.length > check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "length") {
            const tooBig = input.data.length > check.value;
            const tooSmall = input.data.length < check.value;
            if (tooBig || tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              if (tooBig) {
                addIssueToContext(ctx, {
                  code: ZodIssueCode.too_big,
                  maximum: check.value,
                  type: "string",
                  inclusive: true,
                  exact: true,
                  message: check.message
                });
              } else if (tooSmall) {
                addIssueToContext(ctx, {
                  code: ZodIssueCode.too_small,
                  minimum: check.value,
                  type: "string",
                  inclusive: true,
                  exact: true,
                  message: check.message
                });
              }
              status.dirty();
            }
          } else if (check.kind === "email") {
            if (!emailRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "email",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "emoji") {
            if (!emojiRegex) {
              emojiRegex = new RegExp(_emojiRegex, "u");
            }
            if (!emojiRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "emoji",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "uuid") {
            if (!uuidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "uuid",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "nanoid") {
            if (!nanoidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "nanoid",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cuid") {
            if (!cuidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "cuid",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cuid2") {
            if (!cuid2Regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "cuid2",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "ulid") {
            if (!ulidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "ulid",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "url") {
            try {
              new URL(input.data);
            } catch {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "url",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "regex") {
            check.regex.lastIndex = 0;
            const testResult = check.regex.test(input.data);
            if (!testResult) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "regex",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "trim") {
            input.data = input.data.trim();
          } else if (check.kind === "includes") {
            if (!input.data.includes(check.value, check.position)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: { includes: check.value, position: check.position },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "toLowerCase") {
            input.data = input.data.toLowerCase();
          } else if (check.kind === "toUpperCase") {
            input.data = input.data.toUpperCase();
          } else if (check.kind === "startsWith") {
            if (!input.data.startsWith(check.value)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: { startsWith: check.value },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "endsWith") {
            if (!input.data.endsWith(check.value)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: { endsWith: check.value },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "datetime") {
            const regex = datetimeRegex(check);
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: "datetime",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "date") {
            const regex = dateRegex;
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: "date",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "time") {
            const regex = timeRegex(check);
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: "time",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "duration") {
            if (!durationRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "duration",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "ip") {
            if (!isValidIP(input.data, check.version)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "ip",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "jwt") {
            if (!isValidJWT(input.data, check.alg)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "jwt",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cidr") {
            if (!isValidCidr(input.data, check.version)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "cidr",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "base64") {
            if (!base64Regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "base64",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "base64url") {
            if (!base64urlRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "base64url",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      _regex(regex, validation, message) {
        return this.refinement((data) => regex.test(data), {
          validation,
          code: ZodIssueCode.invalid_string,
          ...errorUtil.errToObj(message)
        });
      }
      _addCheck(check) {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      email(message) {
        return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
      }
      url(message) {
        return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
      }
      emoji(message) {
        return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
      }
      uuid(message) {
        return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
      }
      nanoid(message) {
        return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
      }
      cuid(message) {
        return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
      }
      cuid2(message) {
        return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
      }
      ulid(message) {
        return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
      }
      base64(message) {
        return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
      }
      base64url(message) {
        return this._addCheck({
          kind: "base64url",
          ...errorUtil.errToObj(message)
        });
      }
      jwt(options) {
        return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
      }
      ip(options) {
        return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
      }
      cidr(options) {
        return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
      }
      datetime(options) {
        if (typeof options === "string") {
          return this._addCheck({
            kind: "datetime",
            precision: null,
            offset: false,
            local: false,
            message: options
          });
        }
        return this._addCheck({
          kind: "datetime",
          precision: typeof options?.precision === "undefined" ? null : options?.precision,
          offset: options?.offset ?? false,
          local: options?.local ?? false,
          ...errorUtil.errToObj(options?.message)
        });
      }
      date(message) {
        return this._addCheck({ kind: "date", message });
      }
      time(options) {
        if (typeof options === "string") {
          return this._addCheck({
            kind: "time",
            precision: null,
            message: options
          });
        }
        return this._addCheck({
          kind: "time",
          precision: typeof options?.precision === "undefined" ? null : options?.precision,
          ...errorUtil.errToObj(options?.message)
        });
      }
      duration(message) {
        return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
      }
      regex(regex, message) {
        return this._addCheck({
          kind: "regex",
          regex,
          ...errorUtil.errToObj(message)
        });
      }
      includes(value, options) {
        return this._addCheck({
          kind: "includes",
          value,
          position: options?.position,
          ...errorUtil.errToObj(options?.message)
        });
      }
      startsWith(value, message) {
        return this._addCheck({
          kind: "startsWith",
          value,
          ...errorUtil.errToObj(message)
        });
      }
      endsWith(value, message) {
        return this._addCheck({
          kind: "endsWith",
          value,
          ...errorUtil.errToObj(message)
        });
      }
      min(minLength, message) {
        return this._addCheck({
          kind: "min",
          value: minLength,
          ...errorUtil.errToObj(message)
        });
      }
      max(maxLength, message) {
        return this._addCheck({
          kind: "max",
          value: maxLength,
          ...errorUtil.errToObj(message)
        });
      }
      length(len, message) {
        return this._addCheck({
          kind: "length",
          value: len,
          ...errorUtil.errToObj(message)
        });
      }
      /**
       * Equivalent to `.min(1)`
       */
      nonempty(message) {
        return this.min(1, errorUtil.errToObj(message));
      }
      trim() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "trim" }]
        });
      }
      toLowerCase() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "toLowerCase" }]
        });
      }
      toUpperCase() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "toUpperCase" }]
        });
      }
      get isDatetime() {
        return !!this._def.checks.find((ch) => ch.kind === "datetime");
      }
      get isDate() {
        return !!this._def.checks.find((ch) => ch.kind === "date");
      }
      get isTime() {
        return !!this._def.checks.find((ch) => ch.kind === "time");
      }
      get isDuration() {
        return !!this._def.checks.find((ch) => ch.kind === "duration");
      }
      get isEmail() {
        return !!this._def.checks.find((ch) => ch.kind === "email");
      }
      get isURL() {
        return !!this._def.checks.find((ch) => ch.kind === "url");
      }
      get isEmoji() {
        return !!this._def.checks.find((ch) => ch.kind === "emoji");
      }
      get isUUID() {
        return !!this._def.checks.find((ch) => ch.kind === "uuid");
      }
      get isNANOID() {
        return !!this._def.checks.find((ch) => ch.kind === "nanoid");
      }
      get isCUID() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid");
      }
      get isCUID2() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid2");
      }
      get isULID() {
        return !!this._def.checks.find((ch) => ch.kind === "ulid");
      }
      get isIP() {
        return !!this._def.checks.find((ch) => ch.kind === "ip");
      }
      get isCIDR() {
        return !!this._def.checks.find((ch) => ch.kind === "cidr");
      }
      get isBase64() {
        return !!this._def.checks.find((ch) => ch.kind === "base64");
      }
      get isBase64url() {
        return !!this._def.checks.find((ch) => ch.kind === "base64url");
      }
      get minLength() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxLength() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
    };
    ZodString.create = (params) => {
      return new ZodString({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodString,
        coerce: params?.coerce ?? false,
        ...processCreateParams(params)
      });
    };
    ZodNumber = class _ZodNumber extends ZodType {
      constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
        this.step = this.multipleOf;
      }
      _parse(input) {
        if (this._def.coerce) {
          input.data = Number(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.number) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.number,
            received: ctx2.parsedType
          });
          return INVALID;
        }
        let ctx = void 0;
        const status = new ParseStatus();
        for (const check of this._def.checks) {
          if (check.kind === "int") {
            if (!util.isInteger(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: "integer",
                received: "float",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "min") {
            const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
            if (tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: "number",
                inclusive: check.inclusive,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
            if (tooBig) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: "number",
                inclusive: check.inclusive,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "multipleOf") {
            if (floatSafeRemainder(input.data, check.value) !== 0) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.not_multiple_of,
                multipleOf: check.value,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "finite") {
            if (!Number.isFinite(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.not_finite,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      gte(value, message) {
        return this.setLimit("min", value, true, errorUtil.toString(message));
      }
      gt(value, message) {
        return this.setLimit("min", value, false, errorUtil.toString(message));
      }
      lte(value, message) {
        return this.setLimit("max", value, true, errorUtil.toString(message));
      }
      lt(value, message) {
        return this.setLimit("max", value, false, errorUtil.toString(message));
      }
      setLimit(kind, value, inclusive, message) {
        return new _ZodNumber({
          ...this._def,
          checks: [
            ...this._def.checks,
            {
              kind,
              value,
              inclusive,
              message: errorUtil.toString(message)
            }
          ]
        });
      }
      _addCheck(check) {
        return new _ZodNumber({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      int(message) {
        return this._addCheck({
          kind: "int",
          message: errorUtil.toString(message)
        });
      }
      positive(message) {
        return this._addCheck({
          kind: "min",
          value: 0,
          inclusive: false,
          message: errorUtil.toString(message)
        });
      }
      negative(message) {
        return this._addCheck({
          kind: "max",
          value: 0,
          inclusive: false,
          message: errorUtil.toString(message)
        });
      }
      nonpositive(message) {
        return this._addCheck({
          kind: "max",
          value: 0,
          inclusive: true,
          message: errorUtil.toString(message)
        });
      }
      nonnegative(message) {
        return this._addCheck({
          kind: "min",
          value: 0,
          inclusive: true,
          message: errorUtil.toString(message)
        });
      }
      multipleOf(value, message) {
        return this._addCheck({
          kind: "multipleOf",
          value,
          message: errorUtil.toString(message)
        });
      }
      finite(message) {
        return this._addCheck({
          kind: "finite",
          message: errorUtil.toString(message)
        });
      }
      safe(message) {
        return this._addCheck({
          kind: "min",
          inclusive: true,
          value: Number.MIN_SAFE_INTEGER,
          message: errorUtil.toString(message)
        })._addCheck({
          kind: "max",
          inclusive: true,
          value: Number.MAX_SAFE_INTEGER,
          message: errorUtil.toString(message)
        });
      }
      get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
      get isInt() {
        return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
      }
      get isFinite() {
        let max = null;
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
            return true;
          } else if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          } else if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return Number.isFinite(min) && Number.isFinite(max);
      }
    };
    ZodNumber.create = (params) => {
      return new ZodNumber({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodNumber,
        coerce: params?.coerce || false,
        ...processCreateParams(params)
      });
    };
    ZodBigInt = class _ZodBigInt extends ZodType {
      constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
      }
      _parse(input) {
        if (this._def.coerce) {
          try {
            input.data = BigInt(input.data);
          } catch {
            return this._getInvalidInput(input);
          }
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.bigint) {
          return this._getInvalidInput(input);
        }
        let ctx = void 0;
        const status = new ParseStatus();
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
            if (tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                type: "bigint",
                minimum: check.value,
                inclusive: check.inclusive,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
            if (tooBig) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                type: "bigint",
                maximum: check.value,
                inclusive: check.inclusive,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "multipleOf") {
            if (input.data % check.value !== BigInt(0)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.not_multiple_of,
                multipleOf: check.value,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      _getInvalidInput(input) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.bigint,
          received: ctx.parsedType
        });
        return INVALID;
      }
      gte(value, message) {
        return this.setLimit("min", value, true, errorUtil.toString(message));
      }
      gt(value, message) {
        return this.setLimit("min", value, false, errorUtil.toString(message));
      }
      lte(value, message) {
        return this.setLimit("max", value, true, errorUtil.toString(message));
      }
      lt(value, message) {
        return this.setLimit("max", value, false, errorUtil.toString(message));
      }
      setLimit(kind, value, inclusive, message) {
        return new _ZodBigInt({
          ...this._def,
          checks: [
            ...this._def.checks,
            {
              kind,
              value,
              inclusive,
              message: errorUtil.toString(message)
            }
          ]
        });
      }
      _addCheck(check) {
        return new _ZodBigInt({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      positive(message) {
        return this._addCheck({
          kind: "min",
          value: BigInt(0),
          inclusive: false,
          message: errorUtil.toString(message)
        });
      }
      negative(message) {
        return this._addCheck({
          kind: "max",
          value: BigInt(0),
          inclusive: false,
          message: errorUtil.toString(message)
        });
      }
      nonpositive(message) {
        return this._addCheck({
          kind: "max",
          value: BigInt(0),
          inclusive: true,
          message: errorUtil.toString(message)
        });
      }
      nonnegative(message) {
        return this._addCheck({
          kind: "min",
          value: BigInt(0),
          inclusive: true,
          message: errorUtil.toString(message)
        });
      }
      multipleOf(value, message) {
        return this._addCheck({
          kind: "multipleOf",
          value,
          message: errorUtil.toString(message)
        });
      }
      get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
    };
    ZodBigInt.create = (params) => {
      return new ZodBigInt({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodBigInt,
        coerce: params?.coerce ?? false,
        ...processCreateParams(params)
      });
    };
    ZodBoolean = class extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = Boolean(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.boolean) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.boolean,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodBoolean.create = (params) => {
      return new ZodBoolean({
        typeName: ZodFirstPartyTypeKind.ZodBoolean,
        coerce: params?.coerce || false,
        ...processCreateParams(params)
      });
    };
    ZodDate = class _ZodDate extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = new Date(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.date) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.date,
            received: ctx2.parsedType
          });
          return INVALID;
        }
        if (Number.isNaN(input.data.getTime())) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_date
          });
          return INVALID;
        }
        const status = new ParseStatus();
        let ctx = void 0;
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            if (input.data.getTime() < check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                message: check.message,
                inclusive: true,
                exact: false,
                minimum: check.value,
                type: "date"
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            if (input.data.getTime() > check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                message: check.message,
                inclusive: true,
                exact: false,
                maximum: check.value,
                type: "date"
              });
              status.dirty();
            }
          } else {
            util.assertNever(check);
          }
        }
        return {
          status: status.value,
          value: new Date(input.data.getTime())
        };
      }
      _addCheck(check) {
        return new _ZodDate({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      min(minDate, message) {
        return this._addCheck({
          kind: "min",
          value: minDate.getTime(),
          message: errorUtil.toString(message)
        });
      }
      max(maxDate, message) {
        return this._addCheck({
          kind: "max",
          value: maxDate.getTime(),
          message: errorUtil.toString(message)
        });
      }
      get minDate() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min != null ? new Date(min) : null;
      }
      get maxDate() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max != null ? new Date(max) : null;
      }
    };
    ZodDate.create = (params) => {
      return new ZodDate({
        checks: [],
        coerce: params?.coerce || false,
        typeName: ZodFirstPartyTypeKind.ZodDate,
        ...processCreateParams(params)
      });
    };
    ZodSymbol = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.symbol) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.symbol,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodSymbol.create = (params) => {
      return new ZodSymbol({
        typeName: ZodFirstPartyTypeKind.ZodSymbol,
        ...processCreateParams(params)
      });
    };
    ZodUndefined = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.undefined) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.undefined,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodUndefined.create = (params) => {
      return new ZodUndefined({
        typeName: ZodFirstPartyTypeKind.ZodUndefined,
        ...processCreateParams(params)
      });
    };
    ZodNull = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.null) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.null,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodNull.create = (params) => {
      return new ZodNull({
        typeName: ZodFirstPartyTypeKind.ZodNull,
        ...processCreateParams(params)
      });
    };
    ZodAny = class extends ZodType {
      constructor() {
        super(...arguments);
        this._any = true;
      }
      _parse(input) {
        return OK(input.data);
      }
    };
    ZodAny.create = (params) => {
      return new ZodAny({
        typeName: ZodFirstPartyTypeKind.ZodAny,
        ...processCreateParams(params)
      });
    };
    ZodUnknown = class extends ZodType {
      constructor() {
        super(...arguments);
        this._unknown = true;
      }
      _parse(input) {
        return OK(input.data);
      }
    };
    ZodUnknown.create = (params) => {
      return new ZodUnknown({
        typeName: ZodFirstPartyTypeKind.ZodUnknown,
        ...processCreateParams(params)
      });
    };
    ZodNever = class extends ZodType {
      _parse(input) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.never,
          received: ctx.parsedType
        });
        return INVALID;
      }
    };
    ZodNever.create = (params) => {
      return new ZodNever({
        typeName: ZodFirstPartyTypeKind.ZodNever,
        ...processCreateParams(params)
      });
    };
    ZodVoid = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.undefined) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.void,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodVoid.create = (params) => {
      return new ZodVoid({
        typeName: ZodFirstPartyTypeKind.ZodVoid,
        ...processCreateParams(params)
      });
    };
    ZodArray = class _ZodArray extends ZodType {
      _parse(input) {
        const { ctx, status } = this._processInputParams(input);
        const def = this._def;
        if (ctx.parsedType !== ZodParsedType.array) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.array,
            received: ctx.parsedType
          });
          return INVALID;
        }
        if (def.exactLength !== null) {
          const tooBig = ctx.data.length > def.exactLength.value;
          const tooSmall = ctx.data.length < def.exactLength.value;
          if (tooBig || tooSmall) {
            addIssueToContext(ctx, {
              code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
              minimum: tooSmall ? def.exactLength.value : void 0,
              maximum: tooBig ? def.exactLength.value : void 0,
              type: "array",
              inclusive: true,
              exact: true,
              message: def.exactLength.message
            });
            status.dirty();
          }
        }
        if (def.minLength !== null) {
          if (ctx.data.length < def.minLength.value) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: def.minLength.value,
              type: "array",
              inclusive: true,
              exact: false,
              message: def.minLength.message
            });
            status.dirty();
          }
        }
        if (def.maxLength !== null) {
          if (ctx.data.length > def.maxLength.value) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: def.maxLength.value,
              type: "array",
              inclusive: true,
              exact: false,
              message: def.maxLength.message
            });
            status.dirty();
          }
        }
        if (ctx.common.async) {
          return Promise.all([...ctx.data].map((item, i) => {
            return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
          })).then((result2) => {
            return ParseStatus.mergeArray(status, result2);
          });
        }
        const result = [...ctx.data].map((item, i) => {
          return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        });
        return ParseStatus.mergeArray(status, result);
      }
      get element() {
        return this._def.type;
      }
      min(minLength, message) {
        return new _ZodArray({
          ...this._def,
          minLength: { value: minLength, message: errorUtil.toString(message) }
        });
      }
      max(maxLength, message) {
        return new _ZodArray({
          ...this._def,
          maxLength: { value: maxLength, message: errorUtil.toString(message) }
        });
      }
      length(len, message) {
        return new _ZodArray({
          ...this._def,
          exactLength: { value: len, message: errorUtil.toString(message) }
        });
      }
      nonempty(message) {
        return this.min(1, message);
      }
    };
    ZodArray.create = (schema, params) => {
      return new ZodArray({
        type: schema,
        minLength: null,
        maxLength: null,
        exactLength: null,
        typeName: ZodFirstPartyTypeKind.ZodArray,
        ...processCreateParams(params)
      });
    };
    ZodObject = class _ZodObject extends ZodType {
      constructor() {
        super(...arguments);
        this._cached = null;
        this.nonstrict = this.passthrough;
        this.augment = this.extend;
      }
      _getCached() {
        if (this._cached !== null)
          return this._cached;
        const shape = this._def.shape();
        const keys = util.objectKeys(shape);
        this._cached = { shape, keys };
        return this._cached;
      }
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.object) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.object,
            received: ctx2.parsedType
          });
          return INVALID;
        }
        const { status, ctx } = this._processInputParams(input);
        const { shape, keys: shapeKeys } = this._getCached();
        const extraKeys = [];
        if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
          for (const key in ctx.data) {
            if (!shapeKeys.includes(key)) {
              extraKeys.push(key);
            }
          }
        }
        const pairs = [];
        for (const key of shapeKeys) {
          const keyValidator = shape[key];
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
        if (this._def.catchall instanceof ZodNever) {
          const unknownKeys = this._def.unknownKeys;
          if (unknownKeys === "passthrough") {
            for (const key of extraKeys) {
              pairs.push({
                key: { status: "valid", value: key },
                value: { status: "valid", value: ctx.data[key] }
              });
            }
          } else if (unknownKeys === "strict") {
            if (extraKeys.length > 0) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.unrecognized_keys,
                keys: extraKeys
              });
              status.dirty();
            }
          } else if (unknownKeys === "strip") {
          } else {
            throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
          }
        } else {
          const catchall = this._def.catchall;
          for (const key of extraKeys) {
            const value = ctx.data[key];
            pairs.push({
              key: { status: "valid", value: key },
              value: catchall._parse(
                new ParseInputLazyPath(ctx, value, ctx.path, key)
                //, ctx.child(key), value, getParsedType(value)
              ),
              alwaysSet: key in ctx.data
            });
          }
        }
        if (ctx.common.async) {
          return Promise.resolve().then(async () => {
            const syncPairs = [];
            for (const pair of pairs) {
              const key = await pair.key;
              const value = await pair.value;
              syncPairs.push({
                key,
                value,
                alwaysSet: pair.alwaysSet
              });
            }
            return syncPairs;
          }).then((syncPairs) => {
            return ParseStatus.mergeObjectSync(status, syncPairs);
          });
        } else {
          return ParseStatus.mergeObjectSync(status, pairs);
        }
      }
      get shape() {
        return this._def.shape();
      }
      strict(message) {
        errorUtil.errToObj;
        return new _ZodObject({
          ...this._def,
          unknownKeys: "strict",
          ...message !== void 0 ? {
            errorMap: (issue, ctx) => {
              const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
              if (issue.code === "unrecognized_keys")
                return {
                  message: errorUtil.errToObj(message).message ?? defaultError
                };
              return {
                message: defaultError
              };
            }
          } : {}
        });
      }
      strip() {
        return new _ZodObject({
          ...this._def,
          unknownKeys: "strip"
        });
      }
      passthrough() {
        return new _ZodObject({
          ...this._def,
          unknownKeys: "passthrough"
        });
      }
      // const AugmentFactory =
      //   <Def extends ZodObjectDef>(def: Def) =>
      //   <Augmentation extends ZodRawShape>(
      //     augmentation: Augmentation
      //   ): ZodObject<
      //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
      //     Def["unknownKeys"],
      //     Def["catchall"]
      //   > => {
      //     return new ZodObject({
      //       ...def,
      //       shape: () => ({
      //         ...def.shape(),
      //         ...augmentation,
      //       }),
      //     }) as any;
      //   };
      extend(augmentation) {
        return new _ZodObject({
          ...this._def,
          shape: () => ({
            ...this._def.shape(),
            ...augmentation
          })
        });
      }
      /**
       * Prior to zod@1.0.12 there was a bug in the
       * inferred type of merged objects. Please
       * upgrade if you are experiencing issues.
       */
      merge(merging) {
        const merged = new _ZodObject({
          unknownKeys: merging._def.unknownKeys,
          catchall: merging._def.catchall,
          shape: () => ({
            ...this._def.shape(),
            ...merging._def.shape()
          }),
          typeName: ZodFirstPartyTypeKind.ZodObject
        });
        return merged;
      }
      // merge<
      //   Incoming extends AnyZodObject,
      //   Augmentation extends Incoming["shape"],
      //   NewOutput extends {
      //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
      //       ? Augmentation[k]["_output"]
      //       : k extends keyof Output
      //       ? Output[k]
      //       : never;
      //   },
      //   NewInput extends {
      //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
      //       ? Augmentation[k]["_input"]
      //       : k extends keyof Input
      //       ? Input[k]
      //       : never;
      //   }
      // >(
      //   merging: Incoming
      // ): ZodObject<
      //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
      //   Incoming["_def"]["unknownKeys"],
      //   Incoming["_def"]["catchall"],
      //   NewOutput,
      //   NewInput
      // > {
      //   const merged: any = new ZodObject({
      //     unknownKeys: merging._def.unknownKeys,
      //     catchall: merging._def.catchall,
      //     shape: () =>
      //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
      //     typeName: ZodFirstPartyTypeKind.ZodObject,
      //   }) as any;
      //   return merged;
      // }
      setKey(key, schema) {
        return this.augment({ [key]: schema });
      }
      // merge<Incoming extends AnyZodObject>(
      //   merging: Incoming
      // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
      // ZodObject<
      //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
      //   Incoming["_def"]["unknownKeys"],
      //   Incoming["_def"]["catchall"]
      // > {
      //   // const mergedShape = objectUtil.mergeShapes(
      //   //   this._def.shape(),
      //   //   merging._def.shape()
      //   // );
      //   const merged: any = new ZodObject({
      //     unknownKeys: merging._def.unknownKeys,
      //     catchall: merging._def.catchall,
      //     shape: () =>
      //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
      //     typeName: ZodFirstPartyTypeKind.ZodObject,
      //   }) as any;
      //   return merged;
      // }
      catchall(index) {
        return new _ZodObject({
          ...this._def,
          catchall: index
        });
      }
      pick(mask) {
        const shape = {};
        for (const key of util.objectKeys(mask)) {
          if (mask[key] && this.shape[key]) {
            shape[key] = this.shape[key];
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => shape
        });
      }
      omit(mask) {
        const shape = {};
        for (const key of util.objectKeys(this.shape)) {
          if (!mask[key]) {
            shape[key] = this.shape[key];
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => shape
        });
      }
      /**
       * @deprecated
       */
      deepPartial() {
        return deepPartialify(this);
      }
      partial(mask) {
        const newShape = {};
        for (const key of util.objectKeys(this.shape)) {
          const fieldSchema = this.shape[key];
          if (mask && !mask[key]) {
            newShape[key] = fieldSchema;
          } else {
            newShape[key] = fieldSchema.optional();
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => newShape
        });
      }
      required(mask) {
        const newShape = {};
        for (const key of util.objectKeys(this.shape)) {
          if (mask && !mask[key]) {
            newShape[key] = this.shape[key];
          } else {
            const fieldSchema = this.shape[key];
            let newField = fieldSchema;
            while (newField instanceof ZodOptional) {
              newField = newField._def.innerType;
            }
            newShape[key] = newField;
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => newShape
        });
      }
      keyof() {
        return createZodEnum(util.objectKeys(this.shape));
      }
    };
    ZodObject.create = (shape, params) => {
      return new ZodObject({
        shape: () => shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodObject.strictCreate = (shape, params) => {
      return new ZodObject({
        shape: () => shape,
        unknownKeys: "strict",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodObject.lazycreate = (shape, params) => {
      return new ZodObject({
        shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodUnion = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const options = this._def.options;
        function handleResults(results) {
          for (const result of results) {
            if (result.result.status === "valid") {
              return result.result;
            }
          }
          for (const result of results) {
            if (result.result.status === "dirty") {
              ctx.common.issues.push(...result.ctx.common.issues);
              return result.result;
            }
          }
          const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_union,
            unionErrors
          });
          return INVALID;
        }
        if (ctx.common.async) {
          return Promise.all(options.map(async (option) => {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            };
            return {
              result: await option._parseAsync({
                data: ctx.data,
                path: ctx.path,
                parent: childCtx
              }),
              ctx: childCtx
            };
          })).then(handleResults);
        } else {
          let dirty = void 0;
          const issues = [];
          for (const option of options) {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            };
            const result = option._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            });
            if (result.status === "valid") {
              return result;
            } else if (result.status === "dirty" && !dirty) {
              dirty = { result, ctx: childCtx };
            }
            if (childCtx.common.issues.length) {
              issues.push(childCtx.common.issues);
            }
          }
          if (dirty) {
            ctx.common.issues.push(...dirty.ctx.common.issues);
            return dirty.result;
          }
          const unionErrors = issues.map((issues2) => new ZodError(issues2));
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_union,
            unionErrors
          });
          return INVALID;
        }
      }
      get options() {
        return this._def.options;
      }
    };
    ZodUnion.create = (types, params) => {
      return new ZodUnion({
        options: types,
        typeName: ZodFirstPartyTypeKind.ZodUnion,
        ...processCreateParams(params)
      });
    };
    getDiscriminator = (type) => {
      if (type instanceof ZodLazy) {
        return getDiscriminator(type.schema);
      } else if (type instanceof ZodEffects) {
        return getDiscriminator(type.innerType());
      } else if (type instanceof ZodLiteral) {
        return [type.value];
      } else if (type instanceof ZodEnum) {
        return type.options;
      } else if (type instanceof ZodNativeEnum) {
        return util.objectValues(type.enum);
      } else if (type instanceof ZodDefault) {
        return getDiscriminator(type._def.innerType);
      } else if (type instanceof ZodUndefined) {
        return [void 0];
      } else if (type instanceof ZodNull) {
        return [null];
      } else if (type instanceof ZodOptional) {
        return [void 0, ...getDiscriminator(type.unwrap())];
      } else if (type instanceof ZodNullable) {
        return [null, ...getDiscriminator(type.unwrap())];
      } else if (type instanceof ZodBranded) {
        return getDiscriminator(type.unwrap());
      } else if (type instanceof ZodReadonly) {
        return getDiscriminator(type.unwrap());
      } else if (type instanceof ZodCatch) {
        return getDiscriminator(type._def.innerType);
      } else {
        return [];
      }
    };
    ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.object) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.object,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const discriminator = this.discriminator;
        const discriminatorValue = ctx.data[discriminator];
        const option = this.optionsMap.get(discriminatorValue);
        if (!option) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_union_discriminator,
            options: Array.from(this.optionsMap.keys()),
            path: [discriminator]
          });
          return INVALID;
        }
        if (ctx.common.async) {
          return option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
        } else {
          return option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
        }
      }
      get discriminator() {
        return this._def.discriminator;
      }
      get options() {
        return this._def.options;
      }
      get optionsMap() {
        return this._def.optionsMap;
      }
      /**
       * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
       * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
       * have a different value for each object in the union.
       * @param discriminator the name of the discriminator property
       * @param types an array of object schemas
       * @param params
       */
      static create(discriminator, options, params) {
        const optionsMap = /* @__PURE__ */ new Map();
        for (const type of options) {
          const discriminatorValues = getDiscriminator(type.shape[discriminator]);
          if (!discriminatorValues.length) {
            throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
          }
          for (const value of discriminatorValues) {
            if (optionsMap.has(value)) {
              throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
            }
            optionsMap.set(value, type);
          }
        }
        return new _ZodDiscriminatedUnion({
          typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
          discriminator,
          options,
          optionsMap,
          ...processCreateParams(params)
        });
      }
    };
    ZodIntersection = class extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const handleParsed = (parsedLeft, parsedRight) => {
          if (isAborted(parsedLeft) || isAborted(parsedRight)) {
            return INVALID;
          }
          const merged = mergeValues(parsedLeft.value, parsedRight.value);
          if (!merged.valid) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_intersection_types
            });
            return INVALID;
          }
          if (isDirty(parsedLeft) || isDirty(parsedRight)) {
            status.dirty();
          }
          return { status: status.value, value: merged.data };
        };
        if (ctx.common.async) {
          return Promise.all([
            this._def.left._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            }),
            this._def.right._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            })
          ]).then(([left, right]) => handleParsed(left, right));
        } else {
          return handleParsed(this._def.left._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }), this._def.right._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }));
        }
      }
    };
    ZodIntersection.create = (left, right, params) => {
      return new ZodIntersection({
        left,
        right,
        typeName: ZodFirstPartyTypeKind.ZodIntersection,
        ...processCreateParams(params)
      });
    };
    ZodTuple = class _ZodTuple extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.array) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.array,
            received: ctx.parsedType
          });
          return INVALID;
        }
        if (ctx.data.length < this._def.items.length) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: this._def.items.length,
            inclusive: true,
            exact: false,
            type: "array"
          });
          return INVALID;
        }
        const rest = this._def.rest;
        if (!rest && ctx.data.length > this._def.items.length) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: this._def.items.length,
            inclusive: true,
            exact: false,
            type: "array"
          });
          status.dirty();
        }
        const items = [...ctx.data].map((item, itemIndex) => {
          const schema = this._def.items[itemIndex] || this._def.rest;
          if (!schema)
            return null;
          return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
        }).filter((x) => !!x);
        if (ctx.common.async) {
          return Promise.all(items).then((results) => {
            return ParseStatus.mergeArray(status, results);
          });
        } else {
          return ParseStatus.mergeArray(status, items);
        }
      }
      get items() {
        return this._def.items;
      }
      rest(rest) {
        return new _ZodTuple({
          ...this._def,
          rest
        });
      }
    };
    ZodTuple.create = (schemas, params) => {
      if (!Array.isArray(schemas)) {
        throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
      }
      return new ZodTuple({
        items: schemas,
        typeName: ZodFirstPartyTypeKind.ZodTuple,
        rest: null,
        ...processCreateParams(params)
      });
    };
    ZodRecord = class _ZodRecord extends ZodType {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.object) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.object,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const pairs = [];
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        for (const key in ctx.data) {
          pairs.push({
            key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
            value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
        if (ctx.common.async) {
          return ParseStatus.mergeObjectAsync(status, pairs);
        } else {
          return ParseStatus.mergeObjectSync(status, pairs);
        }
      }
      get element() {
        return this._def.valueType;
      }
      static create(first, second, third) {
        if (second instanceof ZodType) {
          return new _ZodRecord({
            keyType: first,
            valueType: second,
            typeName: ZodFirstPartyTypeKind.ZodRecord,
            ...processCreateParams(third)
          });
        }
        return new _ZodRecord({
          keyType: ZodString.create(),
          valueType: first,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(second)
        });
      }
    };
    ZodMap = class extends ZodType {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.map) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.map,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        const pairs = [...ctx.data.entries()].map(([key, value], index) => {
          return {
            key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
            value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
          };
        });
        if (ctx.common.async) {
          const finalMap = /* @__PURE__ */ new Map();
          return Promise.resolve().then(async () => {
            for (const pair of pairs) {
              const key = await pair.key;
              const value = await pair.value;
              if (key.status === "aborted" || value.status === "aborted") {
                return INVALID;
              }
              if (key.status === "dirty" || value.status === "dirty") {
                status.dirty();
              }
              finalMap.set(key.value, value.value);
            }
            return { status: status.value, value: finalMap };
          });
        } else {
          const finalMap = /* @__PURE__ */ new Map();
          for (const pair of pairs) {
            const key = pair.key;
            const value = pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        }
      }
    };
    ZodMap.create = (keyType, valueType, params) => {
      return new ZodMap({
        valueType,
        keyType,
        typeName: ZodFirstPartyTypeKind.ZodMap,
        ...processCreateParams(params)
      });
    };
    ZodSet = class _ZodSet extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.set) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.set,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const def = this._def;
        if (def.minSize !== null) {
          if (ctx.data.size < def.minSize.value) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: def.minSize.value,
              type: "set",
              inclusive: true,
              exact: false,
              message: def.minSize.message
            });
            status.dirty();
          }
        }
        if (def.maxSize !== null) {
          if (ctx.data.size > def.maxSize.value) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: def.maxSize.value,
              type: "set",
              inclusive: true,
              exact: false,
              message: def.maxSize.message
            });
            status.dirty();
          }
        }
        const valueType = this._def.valueType;
        function finalizeSet(elements2) {
          const parsedSet = /* @__PURE__ */ new Set();
          for (const element of elements2) {
            if (element.status === "aborted")
              return INVALID;
            if (element.status === "dirty")
              status.dirty();
            parsedSet.add(element.value);
          }
          return { status: status.value, value: parsedSet };
        }
        const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
        if (ctx.common.async) {
          return Promise.all(elements).then((elements2) => finalizeSet(elements2));
        } else {
          return finalizeSet(elements);
        }
      }
      min(minSize, message) {
        return new _ZodSet({
          ...this._def,
          minSize: { value: minSize, message: errorUtil.toString(message) }
        });
      }
      max(maxSize, message) {
        return new _ZodSet({
          ...this._def,
          maxSize: { value: maxSize, message: errorUtil.toString(message) }
        });
      }
      size(size, message) {
        return this.min(size, message).max(size, message);
      }
      nonempty(message) {
        return this.min(1, message);
      }
    };
    ZodSet.create = (valueType, params) => {
      return new ZodSet({
        valueType,
        minSize: null,
        maxSize: null,
        typeName: ZodFirstPartyTypeKind.ZodSet,
        ...processCreateParams(params)
      });
    };
    ZodFunction = class _ZodFunction extends ZodType {
      constructor() {
        super(...arguments);
        this.validate = this.implement;
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.function) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.function,
            received: ctx.parsedType
          });
          return INVALID;
        }
        function makeArgsIssue(args, error) {
          return makeIssue({
            data: args,
            path: ctx.path,
            errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
            issueData: {
              code: ZodIssueCode.invalid_arguments,
              argumentsError: error
            }
          });
        }
        function makeReturnsIssue(returns, error) {
          return makeIssue({
            data: returns,
            path: ctx.path,
            errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
            issueData: {
              code: ZodIssueCode.invalid_return_type,
              returnTypeError: error
            }
          });
        }
        const params = { errorMap: ctx.common.contextualErrorMap };
        const fn = ctx.data;
        if (this._def.returns instanceof ZodPromise) {
          const me = this;
          return OK(async function(...args) {
            const error = new ZodError([]);
            const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
              error.addIssue(makeArgsIssue(args, e));
              throw error;
            });
            const result = await Reflect.apply(fn, this, parsedArgs);
            const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
              error.addIssue(makeReturnsIssue(result, e));
              throw error;
            });
            return parsedReturns;
          });
        } else {
          const me = this;
          return OK(function(...args) {
            const parsedArgs = me._def.args.safeParse(args, params);
            if (!parsedArgs.success) {
              throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
            }
            const result = Reflect.apply(fn, this, parsedArgs.data);
            const parsedReturns = me._def.returns.safeParse(result, params);
            if (!parsedReturns.success) {
              throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
            }
            return parsedReturns.data;
          });
        }
      }
      parameters() {
        return this._def.args;
      }
      returnType() {
        return this._def.returns;
      }
      args(...items) {
        return new _ZodFunction({
          ...this._def,
          args: ZodTuple.create(items).rest(ZodUnknown.create())
        });
      }
      returns(returnType) {
        return new _ZodFunction({
          ...this._def,
          returns: returnType
        });
      }
      implement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
      }
      strictImplement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
      }
      static create(args, returns, params) {
        return new _ZodFunction({
          args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
          returns: returns || ZodUnknown.create(),
          typeName: ZodFirstPartyTypeKind.ZodFunction,
          ...processCreateParams(params)
        });
      }
    };
    ZodLazy = class extends ZodType {
      get schema() {
        return this._def.getter();
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const lazySchema = this._def.getter();
        return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
      }
    };
    ZodLazy.create = (getter, params) => {
      return new ZodLazy({
        getter,
        typeName: ZodFirstPartyTypeKind.ZodLazy,
        ...processCreateParams(params)
      });
    };
    ZodLiteral = class extends ZodType {
      _parse(input) {
        if (input.data !== this._def.value) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            received: ctx.data,
            code: ZodIssueCode.invalid_literal,
            expected: this._def.value
          });
          return INVALID;
        }
        return { status: "valid", value: input.data };
      }
      get value() {
        return this._def.value;
      }
    };
    ZodLiteral.create = (value, params) => {
      return new ZodLiteral({
        value,
        typeName: ZodFirstPartyTypeKind.ZodLiteral,
        ...processCreateParams(params)
      });
    };
    ZodEnum = class _ZodEnum extends ZodType {
      _parse(input) {
        if (typeof input.data !== "string") {
          const ctx = this._getOrReturnCtx(input);
          const expectedValues = this._def.values;
          addIssueToContext(ctx, {
            expected: util.joinValues(expectedValues),
            received: ctx.parsedType,
            code: ZodIssueCode.invalid_type
          });
          return INVALID;
        }
        if (!this._cache) {
          this._cache = new Set(this._def.values);
        }
        if (!this._cache.has(input.data)) {
          const ctx = this._getOrReturnCtx(input);
          const expectedValues = this._def.values;
          addIssueToContext(ctx, {
            received: ctx.data,
            code: ZodIssueCode.invalid_enum_value,
            options: expectedValues
          });
          return INVALID;
        }
        return OK(input.data);
      }
      get options() {
        return this._def.values;
      }
      get enum() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      get Values() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      get Enum() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      extract(values, newDef = this._def) {
        return _ZodEnum.create(values, {
          ...this._def,
          ...newDef
        });
      }
      exclude(values, newDef = this._def) {
        return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
          ...this._def,
          ...newDef
        });
      }
    };
    ZodEnum.create = createZodEnum;
    ZodNativeEnum = class extends ZodType {
      _parse(input) {
        const nativeEnumValues = util.getValidEnumValues(this._def.values);
        const ctx = this._getOrReturnCtx(input);
        if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
          const expectedValues = util.objectValues(nativeEnumValues);
          addIssueToContext(ctx, {
            expected: util.joinValues(expectedValues),
            received: ctx.parsedType,
            code: ZodIssueCode.invalid_type
          });
          return INVALID;
        }
        if (!this._cache) {
          this._cache = new Set(util.getValidEnumValues(this._def.values));
        }
        if (!this._cache.has(input.data)) {
          const expectedValues = util.objectValues(nativeEnumValues);
          addIssueToContext(ctx, {
            received: ctx.data,
            code: ZodIssueCode.invalid_enum_value,
            options: expectedValues
          });
          return INVALID;
        }
        return OK(input.data);
      }
      get enum() {
        return this._def.values;
      }
    };
    ZodNativeEnum.create = (values, params) => {
      return new ZodNativeEnum({
        values,
        typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
        ...processCreateParams(params)
      });
    };
    ZodPromise = class extends ZodType {
      unwrap() {
        return this._def.type;
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.promise,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
        return OK(promisified.then((data) => {
          return this._def.type.parseAsync(data, {
            path: ctx.path,
            errorMap: ctx.common.contextualErrorMap
          });
        }));
      }
    };
    ZodPromise.create = (schema, params) => {
      return new ZodPromise({
        type: schema,
        typeName: ZodFirstPartyTypeKind.ZodPromise,
        ...processCreateParams(params)
      });
    };
    ZodEffects = class extends ZodType {
      innerType() {
        return this._def.schema;
      }
      sourceType() {
        return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const effect = this._def.effect || null;
        const checkCtx = {
          addIssue: (arg) => {
            addIssueToContext(ctx, arg);
            if (arg.fatal) {
              status.abort();
            } else {
              status.dirty();
            }
          },
          get path() {
            return ctx.path;
          }
        };
        checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
        if (effect.type === "preprocess") {
          const processed = effect.transform(ctx.data, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(processed).then(async (processed2) => {
              if (status.value === "aborted")
                return INVALID;
              const result = await this._def.schema._parseAsync({
                data: processed2,
                path: ctx.path,
                parent: ctx
              });
              if (result.status === "aborted")
                return INVALID;
              if (result.status === "dirty")
                return DIRTY(result.value);
              if (status.value === "dirty")
                return DIRTY(result.value);
              return result;
            });
          } else {
            if (status.value === "aborted")
              return INVALID;
            const result = this._def.schema._parseSync({
              data: processed,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return INVALID;
            if (result.status === "dirty")
              return DIRTY(result.value);
            if (status.value === "dirty")
              return DIRTY(result.value);
            return result;
          }
        }
        if (effect.type === "refinement") {
          const executeRefinement = (acc) => {
            const result = effect.refinement(acc, checkCtx);
            if (ctx.common.async) {
              return Promise.resolve(result);
            }
            if (result instanceof Promise) {
              throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
            }
            return acc;
          };
          if (ctx.common.async === false) {
            const inner = this._def.schema._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (inner.status === "aborted")
              return INVALID;
            if (inner.status === "dirty")
              status.dirty();
            executeRefinement(inner.value);
            return { status: status.value, value: inner.value };
          } else {
            return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
              if (inner.status === "aborted")
                return INVALID;
              if (inner.status === "dirty")
                status.dirty();
              return executeRefinement(inner.value).then(() => {
                return { status: status.value, value: inner.value };
              });
            });
          }
        }
        if (effect.type === "transform") {
          if (ctx.common.async === false) {
            const base = this._def.schema._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (!isValid(base))
              return INVALID;
            const result = effect.transform(base.value, checkCtx);
            if (result instanceof Promise) {
              throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
            }
            return { status: status.value, value: result };
          } else {
            return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
              if (!isValid(base))
                return INVALID;
              return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
                status: status.value,
                value: result
              }));
            });
          }
        }
        util.assertNever(effect);
      }
    };
    ZodEffects.create = (schema, effect, params) => {
      return new ZodEffects({
        schema,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect,
        ...processCreateParams(params)
      });
    };
    ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
      return new ZodEffects({
        schema,
        effect: { type: "preprocess", transform: preprocess },
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        ...processCreateParams(params)
      });
    };
    ZodOptional = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === ZodParsedType.undefined) {
          return OK(void 0);
        }
        return this._def.innerType._parse(input);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    ZodOptional.create = (type, params) => {
      return new ZodOptional({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodOptional,
        ...processCreateParams(params)
      });
    };
    ZodNullable = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === ZodParsedType.null) {
          return OK(null);
        }
        return this._def.innerType._parse(input);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    ZodNullable.create = (type, params) => {
      return new ZodNullable({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodNullable,
        ...processCreateParams(params)
      });
    };
    ZodDefault = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        let data = ctx.data;
        if (ctx.parsedType === ZodParsedType.undefined) {
          data = this._def.defaultValue();
        }
        return this._def.innerType._parse({
          data,
          path: ctx.path,
          parent: ctx
        });
      }
      removeDefault() {
        return this._def.innerType;
      }
    };
    ZodDefault.create = (type, params) => {
      return new ZodDefault({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodDefault,
        defaultValue: typeof params.default === "function" ? params.default : () => params.default,
        ...processCreateParams(params)
      });
    };
    ZodCatch = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const newCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          }
        };
        const result = this._def.innerType._parse({
          data: newCtx.data,
          path: newCtx.path,
          parent: {
            ...newCtx
          }
        });
        if (isAsync(result)) {
          return result.then((result2) => {
            return {
              status: "valid",
              value: result2.status === "valid" ? result2.value : this._def.catchValue({
                get error() {
                  return new ZodError(newCtx.common.issues);
                },
                input: newCtx.data
              })
            };
          });
        } else {
          return {
            status: "valid",
            value: result.status === "valid" ? result.value : this._def.catchValue({
              get error() {
                return new ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        }
      }
      removeCatch() {
        return this._def.innerType;
      }
    };
    ZodCatch.create = (type, params) => {
      return new ZodCatch({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodCatch,
        catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
        ...processCreateParams(params)
      });
    };
    ZodNaN = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.nan) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.nan,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return { status: "valid", value: input.data };
      }
    };
    ZodNaN.create = (params) => {
      return new ZodNaN({
        typeName: ZodFirstPartyTypeKind.ZodNaN,
        ...processCreateParams(params)
      });
    };
    BRAND = /* @__PURE__ */ Symbol("zod_brand");
    ZodBranded = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const data = ctx.data;
        return this._def.type._parse({
          data,
          path: ctx.path,
          parent: ctx
        });
      }
      unwrap() {
        return this._def.type;
      }
    };
    ZodPipeline = class _ZodPipeline extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.common.async) {
          const handleAsync = async () => {
            const inResult = await this._def.in._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (inResult.status === "aborted")
              return INVALID;
            if (inResult.status === "dirty") {
              status.dirty();
              return DIRTY(inResult.value);
            } else {
              return this._def.out._parseAsync({
                data: inResult.value,
                path: ctx.path,
                parent: ctx
              });
            }
          };
          return handleAsync();
        } else {
          const inResult = this._def.in._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return {
              status: "dirty",
              value: inResult.value
            };
          } else {
            return this._def.out._parseSync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        }
      }
      static create(a, b) {
        return new _ZodPipeline({
          in: a,
          out: b,
          typeName: ZodFirstPartyTypeKind.ZodPipeline
        });
      }
    };
    ZodReadonly = class extends ZodType {
      _parse(input) {
        const result = this._def.innerType._parse(input);
        const freeze = (data) => {
          if (isValid(data)) {
            data.value = Object.freeze(data.value);
          }
          return data;
        };
        return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    ZodReadonly.create = (type, params) => {
      return new ZodReadonly({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodReadonly,
        ...processCreateParams(params)
      });
    };
    late = {
      object: ZodObject.lazycreate
    };
    (function(ZodFirstPartyTypeKind2) {
      ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
      ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
      ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
      ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
      ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
      ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
      ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
      ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
      ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
      ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
      ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
      ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
      ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
      ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
      ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
      ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
      ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
      ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
      ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
      ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
      ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
      ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
      ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
      ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
      ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
      ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
      ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
      ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
      ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
      ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
      ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
      ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
      ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
      ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
      ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
      ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
    })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
    instanceOfType = (cls, params = {
      message: `Input not instance of ${cls.name}`
    }) => custom((data) => data instanceof cls, params);
    stringType = ZodString.create;
    numberType = ZodNumber.create;
    nanType = ZodNaN.create;
    bigIntType = ZodBigInt.create;
    booleanType = ZodBoolean.create;
    dateType = ZodDate.create;
    symbolType = ZodSymbol.create;
    undefinedType = ZodUndefined.create;
    nullType = ZodNull.create;
    anyType = ZodAny.create;
    unknownType = ZodUnknown.create;
    neverType = ZodNever.create;
    voidType = ZodVoid.create;
    arrayType = ZodArray.create;
    objectType = ZodObject.create;
    strictObjectType = ZodObject.strictCreate;
    unionType = ZodUnion.create;
    discriminatedUnionType = ZodDiscriminatedUnion.create;
    intersectionType = ZodIntersection.create;
    tupleType = ZodTuple.create;
    recordType = ZodRecord.create;
    mapType = ZodMap.create;
    setType = ZodSet.create;
    functionType = ZodFunction.create;
    lazyType = ZodLazy.create;
    literalType = ZodLiteral.create;
    enumType = ZodEnum.create;
    nativeEnumType = ZodNativeEnum.create;
    promiseType = ZodPromise.create;
    effectsType = ZodEffects.create;
    optionalType = ZodOptional.create;
    nullableType = ZodNullable.create;
    preprocessType = ZodEffects.createWithPreprocess;
    pipelineType = ZodPipeline.create;
    ostring = () => stringType().optional();
    onumber = () => numberType().optional();
    oboolean = () => booleanType().optional();
    coerce = {
      string: ((arg) => ZodString.create({ ...arg, coerce: true })),
      number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
      boolean: ((arg) => ZodBoolean.create({
        ...arg,
        coerce: true
      })),
      bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
      date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
    };
    NEVER = INVALID;
  }
});

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});
var init_external = __esm({
  "node_modules/zod/v3/external.js"() {
    init_errors();
    init_parseUtil();
    init_typeAliases();
    init_util();
    init_types();
    init_ZodError();
  }
});

// node_modules/zod/index.js
var init_zod = __esm({
  "node_modules/zod/index.js"() {
    init_external();
    init_external();
  }
});

// node_modules/ulid/dist/index.umd.js
var require_index_umd = __commonJS({
  "node_modules/ulid/dist/index.umd.js"(exports, module) {
    (function(global, factory) {
      typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.ULID = {}));
    })(exports, (function(exports2) {
      "use strict";
      function createError(message) {
        const err = new Error(message);
        err.source = "ulid";
        return err;
      }
      const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
      const ENCODING_LEN = ENCODING.length;
      const TIME_MAX = Math.pow(2, 48) - 1;
      const TIME_LEN = 10;
      const RANDOM_LEN = 16;
      function replaceCharAt(str, index, char) {
        if (index > str.length - 1) {
          return str;
        }
        return str.substr(0, index) + char + str.substr(index + 1);
      }
      function incrementBase32(str) {
        let done = void 0;
        let index = str.length;
        let char;
        let charIndex;
        const maxCharIndex = ENCODING_LEN - 1;
        while (!done && index-- >= 0) {
          char = str[index];
          charIndex = ENCODING.indexOf(char);
          if (charIndex === -1) {
            throw createError("incorrectly encoded string");
          }
          if (charIndex === maxCharIndex) {
            str = replaceCharAt(str, index, ENCODING[0]);
            continue;
          }
          done = replaceCharAt(str, index, ENCODING[charIndex + 1]);
        }
        if (typeof done === "string") {
          return done;
        }
        throw createError("cannot increment this string");
      }
      function randomChar(prng) {
        let rand = Math.floor(prng() * ENCODING_LEN);
        if (rand === ENCODING_LEN) {
          rand = ENCODING_LEN - 1;
        }
        return ENCODING.charAt(rand);
      }
      function encodeTime(now, len) {
        if (isNaN(now)) {
          throw new Error(now + " must be a number");
        }
        if (now > TIME_MAX) {
          throw createError("cannot encode time greater than " + TIME_MAX);
        }
        if (now < 0) {
          throw createError("time must be positive");
        }
        if (Number.isInteger(Number(now)) === false) {
          throw createError("time must be an integer");
        }
        let mod;
        let str = "";
        for (; len > 0; len--) {
          mod = now % ENCODING_LEN;
          str = ENCODING.charAt(mod) + str;
          now = (now - mod) / ENCODING_LEN;
        }
        return str;
      }
      function encodeRandom(len, prng) {
        let str = "";
        for (; len > 0; len--) {
          str = randomChar(prng) + str;
        }
        return str;
      }
      function decodeTime(id) {
        if (id.length !== TIME_LEN + RANDOM_LEN) {
          throw createError("malformed ulid");
        }
        var time = id.substr(0, TIME_LEN).split("").reverse().reduce((carry, char, index) => {
          const encodingIndex = ENCODING.indexOf(char);
          if (encodingIndex === -1) {
            throw createError("invalid character found: " + char);
          }
          return carry += encodingIndex * Math.pow(ENCODING_LEN, index);
        }, 0);
        if (time > TIME_MAX) {
          throw createError("malformed ulid, timestamp too large");
        }
        return time;
      }
      function detectPrng(allowInsecure = false, root) {
        if (!root) {
          root = typeof window !== "undefined" ? window : null;
        }
        const browserCrypto = root && (root.crypto || root.msCrypto);
        if (browserCrypto) {
          return () => {
            const buffer = new Uint8Array(1);
            browserCrypto.getRandomValues(buffer);
            return buffer[0] / 255;
          };
        } else {
          try {
            const nodeCrypto = __require("crypto");
            return () => nodeCrypto.randomBytes(1).readUInt8() / 255;
          } catch (e) {
          }
        }
        if (allowInsecure) {
          try {
            console.error("secure crypto unusable, falling back to insecure Math.random()!");
          } catch (e) {
          }
          return () => Math.random();
        }
        throw createError("secure crypto unusable, insecure Math.random not allowed");
      }
      function factory(currPrng) {
        if (!currPrng) {
          currPrng = detectPrng();
        }
        return function ulid3(seedTime) {
          if (isNaN(seedTime)) {
            seedTime = Date.now();
          }
          return encodeTime(seedTime, TIME_LEN) + encodeRandom(RANDOM_LEN, currPrng);
        };
      }
      function monotonicFactory(currPrng) {
        if (!currPrng) {
          currPrng = detectPrng();
        }
        let lastTime = 0;
        let lastRandom;
        return function ulid3(seedTime) {
          if (isNaN(seedTime)) {
            seedTime = Date.now();
          }
          if (seedTime <= lastTime) {
            const incrementedRandom = lastRandom = incrementBase32(lastRandom);
            return encodeTime(lastTime, TIME_LEN) + incrementedRandom;
          }
          lastTime = seedTime;
          const newRandom = lastRandom = encodeRandom(RANDOM_LEN, currPrng);
          return encodeTime(seedTime, TIME_LEN) + newRandom;
        };
      }
      const ulid2 = factory();
      exports2.decodeTime = decodeTime;
      exports2.detectPrng = detectPrng;
      exports2.encodeRandom = encodeRandom;
      exports2.encodeTime = encodeTime;
      exports2.factory = factory;
      exports2.incrementBase32 = incrementBase32;
      exports2.monotonicFactory = monotonicFactory;
      exports2.randomChar = randomChar;
      exports2.replaceCharAt = replaceCharAt;
      exports2.ulid = ulid2;
    }));
  }
});

// src/core/envelope.ts
function newId(prefix) {
  return `${prefix}${(0, import_ulid.ulid)()}`;
}
function makeEvent(input) {
  return EventEnvelope.parse({
    event_id: newId("evt_"),
    type: input.type,
    version: 1,
    occurred_at: (/* @__PURE__ */ new Date()).toISOString(),
    source: input.source,
    principal: input.principal,
    subject: input.subject,
    links: input.links ?? [],
    data: input.data ?? {},
    correlation_id: input.correlation_id ?? newId("cor_"),
    causation_id: input.causation_id ?? null,
    pii: input.pii ?? []
  });
}
function redactEvent(evt) {
  if (evt.pii.length === 0) return evt;
  const data = structuredClone(evt.data);
  for (const path of evt.pii) {
    const parts = path.split(".");
    let cur = data;
    for (let i = 0; i < parts.length - 1 && cur; i++) {
      const next = cur[parts[i]];
      cur = next && typeof next === "object" ? next : void 0;
    }
    const last = parts.at(-1);
    if (cur && last && last in cur) cur[last] = "[redacted]";
  }
  return { ...evt, data };
}
var import_ulid, PrincipalKind, Principal, RecordRef, EventEnvelope, MAX_ENVELOPE_BYTES;
var init_envelope = __esm({
  "src/core/envelope.ts"() {
    "use strict";
    init_zod();
    import_ulid = __toESM(require_index_umd(), 1);
    PrincipalKind = external_exports.enum([
      "staff",
      "installer",
      "customer",
      "visitor",
      "agent",
      "system",
      "integration"
    ]);
    Principal = external_exports.object({
      kind: PrincipalKind,
      id: external_exports.string().min(1),
      /** Roles from the existing backend (ADMIN, INSTALLER, CUSTOMER…) or the agent id. */
      roles: external_exports.array(external_exports.string()).default([]),
      /** Set when an agent acts for a person. */
      on_behalf_of: external_exports.string().nullable().default(null)
    });
    RecordRef = external_exports.object({ type: external_exports.string().min(1), id: external_exports.string().min(1) });
    EventEnvelope = external_exports.object({
      event_id: external_exports.string().min(10),
      type: external_exports.string().regex(/^[a-z_]+\.[a-z_]+$/, "type must be <entity>.<past_tense_verb>"),
      version: external_exports.number().int().positive().default(1),
      occurred_at: external_exports.string().datetime(),
      source: external_exports.string().min(1),
      principal: Principal,
      subject: RecordRef,
      links: external_exports.array(RecordRef).default([]),
      data: external_exports.record(external_exports.unknown()).default({}),
      correlation_id: external_exports.string().min(1),
      causation_id: external_exports.string().nullable().default(null),
      pii: external_exports.array(external_exports.string()).default([])
    });
    MAX_ENVELOPE_BYTES = 64 * 1024;
  }
});

// src/contacts/finder.ts
var finder_exports = {};
__export(finder_exports, {
  BraveWebSearch: () => BraveWebSearch,
  ContactFinder: () => ContactFinder,
  DEFAULT_CONTACT_RULES: () => DEFAULT_CONTACT_RULES,
  FakeWebSearch: () => FakeWebSearch,
  hostOf: () => hostOf,
  htmlToText: () => htmlToText,
  matchesName: () => matchesName,
  officialDomain: () => officialDomain,
  registrable: () => registrable
});
function htmlToText(html) {
  return html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<a [^>]*href=["']mailto:([^"'?]+)[^>]*>/gi, " $1 ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#64;|&commat;/g, "@").replace(/\s+/g, " ").slice(0, 8e4);
}
function matchesName(name, p) {
  const n = norm(name);
  const pn = norm(String(p.name ?? ""));
  if (!pn) return false;
  return n === pn || n.includes(pn) || pn.includes(n) || (p.aliases ?? []).some((a) => norm(a) === n);
}
function hostOf(u) {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}
function officialDomain(org, hits) {
  const key = norm(org).slice(0, 8);
  const counts = /* @__PURE__ */ new Map();
  for (const h of hits) {
    const host = hostOf(h.url);
    if (!host || !key || !host.replace(/[^a-z0-9]/g, "").includes(key)) continue;
    const base = registrable(host);
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
function registrable(host) {
  const parts = host.split(".");
  const two = ["com.au", "net.au", "org.au", "gov.au", "asn.au", "co.nz", "co.uk"];
  const last2 = parts.slice(-2).join(".");
  return two.includes(last2) ? parts.slice(-3).join(".") : last2;
}
function parsePick(text, n) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    const index = Number.isInteger(j.index) && j.index < n ? j.index : -1;
    return { index, confidence: Math.max(0, Math.min(1, Number(j.confidence ?? 0))), why: String(j.why ?? "").slice(0, 300) };
  } catch {
    return null;
  }
}
var BraveWebSearch, AVOID_ALWAYS, DEFAULT_CONTACT_RULES, FREE_MAIL, ContactFinder, norm, FakeWebSearch;
var init_finder = __esm({
  "src/contacts/finder.ts"() {
    "use strict";
    BraveWebSearch = class {
      constructor(key = process.env.SEARCH_API_KEY ?? "", fetchImpl = fetch) {
        this.key = key;
        this.fetchImpl = fetchImpl;
      }
      key;
      fetchImpl;
      async search(query, count) {
        if (!this.key) throw new Error("SEARCH_API_KEY is not set");
        const r = await this.fetchImpl(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&country=au`, {
          headers: { Accept: "application/json", "X-Subscription-Token": this.key }
        });
        if (!r.ok) return [];
        const j = await r.json();
        return (j.web?.results ?? []).map((x) => ({ title: x.title, url: x.url, snippet: x.description }));
      }
      async page(url) {
        try {
          const r = await this.fetchImpl(url, { headers: { "User-Agent": "EasyLinkSolarBot/1.0 (+https://easylinksolar.com.au)" }, redirect: "follow" });
          if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
          return htmlToText(await r.text());
        } catch {
          return null;
        }
      }
    };
    AVOID_ALWAYS = ["noreply", "no-reply", "donotreply", "privacy", "media", "press", "careers", "jobs", "recruitment", "investor", "webmaster", "abuse", "unsubscribe"];
    DEFAULT_CONTACT_RULES = {
      retailer: {
        queries: ["{org} solar installation documents email", "{org} solar meter reconfiguration email", "{org} embedded generation solar contact email"],
        prefer: ["solar", "solarconnections", "meter", "metering", "generation", "embeddedgeneration", "connections", "newconnections", "feedin", "service", "customerservice", "enquiries"],
        avoid: [...AVOID_ALWAYS, "complaints", "hardship", "accounts", "billing"],
        minConfidence: 0.8,
        purpose: "receiving solar installation documents from an installer (proof of completion, electrical safety certificate) so the retailer can arrange the meter change and solar feed-in"
      },
      dnsp: {
        queries: ["{org} solar connection application email", "{org} embedded generation connection contact", "{org} electrical safety certificate submission email"],
        prefer: ["connections", "generation", "embeddedgeneration", "solar", "metering", "networkconnections", "customerservice"],
        avoid: [...AVOID_ALWAYS, "faults", "emergency"],
        minConfidence: 0.8,
        purpose: "receiving solar connection and electrical safety documents from an installer"
      },
      supplier: {
        queries: ["{org} warranty claims email Australia", "{org} sales contact email Australia"],
        prefer: ["warranty", "service", "support", "sales", "orders", "info"],
        avoid: AVOID_ALWAYS,
        minConfidence: 0.75,
        purpose: "warranty claims and orders from a solar installer"
      },
      other: {
        queries: ["{org} contact email"],
        prefer: ["info", "enquiries", "contact", "admin", "service"],
        avoid: AVOID_ALWAYS,
        minConfidence: 0.85,
        purpose: "business correspondence from a solar installer"
      }
    };
    FREE_MAIL = /@(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|bigpond|optusnet|aol|proton|protonmail)\./i;
    ContactFinder = class {
      constructor(deps) {
        this.deps = deps;
      }
      deps;
      get svc() {
        return { token: this.deps.serviceToken };
      }
      async find(org, kind, purposeHint = "") {
        const name = org.trim();
        const partners = (await this.deps.backend.list("partner", { kind }, this.svc)).data ?? [];
        const known = partners.find((p) => matchesName(name, p));
        if (known?.id && (known.submissionEmail || known.email)) {
          return {
            found: {
              partner: { type: "partner", id: String(known.id) },
              name: String(known.name),
              email: String(known.submissionEmail ?? known.email),
              domain: String(known.domain ?? ""),
              verified: known.verified !== false,
              source: known.source ?? null,
              confidence: 1
            }
          };
        }
        const custom2 = (await this.deps.store.getRecord("config", "contact_rules"))?.rules;
        const rule = custom2?.[kind] ?? DEFAULT_CONTACT_RULES[kind] ?? DEFAULT_CONTACT_RULES.other;
        const hits = [];
        for (const q of rule.queries.slice(0, 3)) {
          const query = q.replace("{org}", name);
          for (const h of await this.deps.web.search(query, 8).catch(() => [])) hits.push({ ...h, query });
        }
        const domain = officialDomain(name, hits);
        if (!domain) return { found: null, reason: `Couldn't identify ${name}'s official website.`, candidates: [] };
        const urls = Array.from(/* @__PURE__ */ new Set([...hits.filter((h) => hostOf(h.url).endsWith(domain)).map((h) => h.url), `https://www.${domain}/contact`, `https://www.${domain}/contact-us`])).slice(0, 6);
        const candidates = [];
        for (const url of urls) {
          const text = await this.deps.web.page(url);
          if (!text) continue;
          for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
            const email = m[0].toLowerCase().replace(/\.$/, "");
            const at = m.index ?? 0;
            if (!email.split("@")[1].endsWith(domain) || FREE_MAIL.test(email)) continue;
            const local = email.split("@")[0];
            if (rule.avoid.some((a) => local.includes(a))) continue;
            if (candidates.some((c) => c.email === email)) continue;
            candidates.push({ email, url, context: text.slice(Math.max(0, at - 220), at + 120), query: hits.find((h) => h.url === url)?.query ?? "" });
          }
        }
        if (!candidates.length) return { found: null, reason: `No email address for this purpose is published on ${domain}.`, candidates: [] };
        const turn = await this.deps.model.converse({
          tier: "fast",
          maxTokens: 300,
          system: `You choose which published email address of an Australian organisation should receive a message. Purpose: ${rule.purpose}.${purposeHint ? ` Context: ${purposeHint}.` : ""}
Prefer mailboxes like: ${rule.prefer.join(", ")}. Never choose personal staff addresses when a role mailbox fits.
Answer ONLY JSON {"index": <number from the list, or -1 if none fits>, "confidence": 0..1, "why": "<one sentence>"}.`,
          messages: [
            {
              role: "user",
              text: `Organisation: ${name} (${domain})
Candidates:
${candidates.map((c, i) => `${i}. ${c.email}
   page: ${c.url}
   text around it: "${c.context.replace(/\s+/g, " ").trim()}"`).join("\n")}`
            }
          ]
        });
        const pick = parsePick(turn.text, candidates.length);
        const chosen = pick && pick.index >= 0 ? candidates.at(pick.index) : void 0;
        if (!chosen || !pick || pick.confidence < rule.minConfidence) {
          return { found: null, reason: `Not sure which ${name} address is right for this (best guess below the ${rule.minConfidence} rule).`, candidates: candidates.map((c) => ({ email: c.email, url: c.url })) };
        }
        const now = (this.deps.now?.() ?? /* @__PURE__ */ new Date()).toISOString();
        const source = { url: chosen.url, query: chosen.query, why: pick.why, foundAt: now };
        const row = { name, kind, domain, submissionEmail: chosen.email, attach: kind === "retailer" || kind === "dnsp", verified: false, source, aliases: [] };
        const created = await this.deps.backend.create("partner", row, this.svc);
        if (!created.ok || !created.data) return { found: null, reason: "Couldn't save the contact.", candidates: [] };
        return { found: { partner: { type: "partner", id: String(created.data.id) }, name, email: chosen.email, domain, verified: false, source, confidence: pick.confidence } };
      }
    };
    norm = (s2) => s2.toLowerCase().replace(/\b(pty|ltd|limited|energy|australia|the)\b/g, "").replace(/[^a-z0-9]/g, "");
    FakeWebSearch = class {
      constructor(results = {}, pages = {}) {
        this.results = results;
        this.pages = pages;
      }
      results;
      pages;
      searches = [];
      async search(query) {
        this.searches.push(query);
        return Object.entries(this.results).find(([k]) => query.toLowerCase().includes(k.toLowerCase()))?.[1] ?? [];
      }
      async page(url) {
        return this.pages[url] ?? null;
      }
    };
  }
});

// src/files/classify.ts
var classify_exports = {};
__export(classify_exports, {
  AUTO_CONFIDENCE: () => AUTO_CONFIDENCE,
  AnyFileBytes: () => AnyFileBytes,
  DEFAULT_ROUTES: () => DEFAULT_ROUTES,
  FILE_LABELS: () => FILE_LABELS,
  FileClassifier: () => FileClassifier,
  S3FileBytes: () => S3FileBytes,
  UrlFileBytes: () => UrlFileBytes,
  absoluteUrl: () => absoluteUrl,
  documentFormat: () => documentFormat,
  imageFormat: () => imageFormat,
  parseClassification: () => parseClassification,
  sameAddress: () => sameAddress
});
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
function absoluteUrl(u, origin) {
  if (!u) return "";
  if (/^https?:\/\//.test(u)) return u;
  return origin ? `${origin.replace(/\/+$/, "")}/${u.replace(/^\/+/, "")}` : "";
}
function documentFormat(nameOrMime) {
  const s2 = nameOrMime.toLowerCase();
  if (/pdf/.test(s2)) return "pdf";
  if (/wordprocessingml|\.docx$/.test(s2)) return "docx";
  if (/msword|\.doc$/.test(s2)) return "doc";
  if (/spreadsheetml|\.xlsx$/.test(s2)) return "xlsx";
  if (/ms-excel|\.xls$/.test(s2)) return "xls";
  if (/csv/.test(s2)) return "csv";
  if (/text\/plain|\.txt$/.test(s2)) return "txt";
  return null;
}
function sameAddress(a, b) {
  const key = (x) => {
    const m = x.toLowerCase().match(/(\d+[a-z]?)\s+([a-z]+)/);
    return m ? `${m[1]} ${m[2]}` : x.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
  };
  return key(a) === key(b);
}
function imageFormat(nameOrMime) {
  const s2 = nameOrMime.toLowerCase();
  if (/jpe?g/.test(s2)) return "jpeg";
  if (/png/.test(s2)) return "png";
  if (/webp/.test(s2)) return "webp";
  return null;
}
function parseClassification(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    const labels = (j.labels ?? []).filter((l) => !!l && FILE_LABELS.includes(l.label) && typeof l.confidence === "number").map((l) => ({ label: l.label, confidence: Math.max(0, Math.min(1, l.confidence)) })).sort((a, b) => b.confidence - a.confidence);
    const extracted = {};
    for (const [k, v] of Object.entries(j.extracted ?? {})) if (typeof v === "string" || typeof v === "number") extracted[k] = String(v);
    const issues = Array.isArray(j.issues) ? j.issues.filter((x) => typeof x === "string").map((x) => x.slice(0, 200)).slice(0, 10) : [];
    return { labels, extracted, description: String(j.description ?? ""), issues };
  } catch {
    return null;
  }
}
var FILE_LABELS, DEFAULT_ROUTES, nameOf, typeOf, S3FileBytes, UrlFileBytes, AnyFileBytes, SYSTEM_PROMPT, AUTO_CONFIDENCE, FileClassifier;
var init_classify = __esm({
  "src/files/classify.ts"() {
    "use strict";
    init_envelope();
    FILE_LABELS = [
      "meter",
      "switchboard",
      "inverter",
      "isolator",
      "array",
      "roof",
      "serial_plate",
      "battery",
      "before_clean",
      "after_clean",
      "electricity_bill",
      "licence",
      "compliance_certificate",
      "site_photo",
      // documents
      "proof_of_completion",
      "site_report",
      "electrical_safety_certificate",
      "commissioning_sheet",
      "stc_assignment_form",
      "signed_contract",
      "warranty",
      "invoice",
      "quote",
      "other_document",
      "other"
    ];
    DEFAULT_ROUTES = {
      proof_of_completion: ["customer", "retailer"],
      electrical_safety_certificate: ["customer", "retailer"],
      compliance_certificate: ["customer", "retailer"],
      site_report: ["customer"],
      commissioning_sheet: ["customer"],
      signed_contract: ["customer"],
      warranty: ["customer"],
      invoice: ["customer"],
      quote: ["customer"]
    };
    nameOf = (doc) => String(doc.fileName ?? doc.name ?? "file");
    typeOf = (doc) => String(doc.mimeType ?? "application/octet-stream");
    S3FileBytes = class {
      constructor(bucket = process.env.FILES_BUCKET ?? "", s3 = new S3Client({ region: process.env.AWS_REGION ?? "ap-southeast-2" })) {
        this.bucket = bucket;
        this.s3 = s3;
      }
      bucket;
      s3;
      async load(doc) {
        const key = doc.s3Key;
        const format = imageFormat(String(doc.mimeType ?? doc.fileName ?? key ?? ""));
        if (!key || !format) return null;
        const r = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
        const bytes = await r.Body?.transformToByteArray();
        return bytes && bytes.byteLength <= 375e4 ? { format, bytes } : null;
      }
      async raw(doc, maxBytes) {
        const key = doc.s3Key;
        if (!key) return null;
        const r = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
        if ((r.ContentLength ?? 0) > maxBytes) return null;
        const bytes = await r.Body?.transformToByteArray();
        return bytes ? { bytes, contentType: r.ContentType ?? typeOf(doc), fileName: nameOf(doc) } : null;
      }
    };
    UrlFileBytes = class {
      constructor(origin = process.env.PUBLIC_SITE_URL ?? "", fetchImpl = fetch) {
        this.origin = origin;
        this.fetchImpl = fetchImpl;
      }
      origin;
      fetchImpl;
      async load(doc) {
        const url = absoluteUrl(String(doc.url ?? doc.fileUrl ?? ""), this.origin);
        const format = imageFormat(String(doc.mimeType ?? doc.fileName ?? url));
        if (!url || !format) return null;
        const r = await this.fetchImpl(url);
        if (!r.ok) return null;
        const bytes = new Uint8Array(await r.arrayBuffer());
        return bytes.byteLength <= 375e4 ? { format, bytes } : null;
      }
      async raw(doc, maxBytes) {
        const url = absoluteUrl(String(doc.url ?? doc.fileUrl ?? ""), this.origin);
        if (!url) return null;
        const r = await this.fetchImpl(url);
        if (!r.ok || Number(r.headers.get("content-length") ?? 0) > maxBytes) return null;
        const bytes = new Uint8Array(await r.arrayBuffer());
        return bytes.byteLength <= maxBytes ? { bytes, contentType: r.headers.get("content-type") ?? typeOf(doc), fileName: nameOf(doc) } : null;
      }
    };
    AnyFileBytes = class {
      constructor(s3 = new S3FileBytes(), web = new UrlFileBytes()) {
        this.s3 = s3;
        this.web = web;
      }
      s3;
      web;
      load(doc) {
        return doc.s3Key ? this.s3.load(doc) : this.web.load(doc);
      }
      raw(doc, maxBytes) {
        return doc.s3Key ? this.s3.raw(doc, maxBytes) : this.web.raw(doc, maxBytes);
      }
    };
    SYSTEM_PROMPT = `You label photos and documents uploaded to an Australian solar installer's job files.
Return ONLY JSON: {"labels":[{"label":<one of ${FILE_LABELS.join(", ")}>,"confidence":0..1}],"extracted":{...},"issues":[...],"description":"<one sentence>"}.
Put the best label first. "electrical_safety_certificate" covers the state certificates (CCEW in NSW, COES in VIC, Certificate of Testing and Safety in QLD, and the equivalents elsewhere).
In "extracted" include only values you can read clearly, using these keys when present:
meter_number, nmi, serial_number, inverter_serial, panel_count, make, model, kw_rating, system_kw, retailer, bill_period,
site_address, completion_date, installer_name, installer_licence, certificate_number, signed_by_customer (yes/no), signed_by_installer (yes/no),
licence_number, licence_expiry.
In "issues" list problems a reviewer would send back: missing signatures, blank required fields, unreadable pages, a date in the future. Empty if none.
Do not describe people. If a photo shows a person's face or a licence, do not copy personal details other than licence_number and licence_expiry.`;
    AUTO_CONFIDENCE = 0.7;
    FileClassifier = class {
      constructor(deps, principal = { kind: "system", id: "file-classifier", roles: ["SYSTEM"], on_behalf_of: null }) {
        this.deps = deps;
        this.principal = principal;
      }
      deps;
      principal;
      async classify(evt) {
        if (evt.subject.type !== "document") return null;
        const svc = { token: this.deps.serviceToken };
        const doc = await this.deps.backend.get("document", evt.subject.id, svc);
        if (!doc.ok || !doc.data) return null;
        const d = doc.data;
        const image = await this.deps.bytes.load(d).catch(() => null);
        const name = String(d.fileName ?? "");
        const docFormat = !image ? documentFormat(String(d.mimeType ?? name)) : null;
        const raw2 = docFormat ? await this.deps.bytes.raw(d, 45e5).catch(() => null) : null;
        const hint = [name, d.category, evt.data.slot].filter(Boolean).join(" | ");
        const turn = await this.deps.model.converse({
          tier: "fast",
          system: SYSTEM_PROMPT,
          maxTokens: 700,
          messages: [
            {
              role: "user",
              image: image ?? void 0,
              document: raw2 && docFormat ? { format: docFormat, name, bytes: raw2.bytes } : void 0,
              text: `File: ${hint || "(no name)"}${image || raw2 ? "" : "\n(Contents not available; label from the name only.)"}`
            }
          ]
        });
        const c = parseClassification(turn.text);
        if (!c) return null;
        const links = [];
        const add = (type, id) => {
          if (id != null && id !== "" && !links.some((l) => l.type === type && l.id === String(id))) links.push({ type, id: String(id) });
        };
        add("customer", d.customerId);
        add("lead", d.leadId);
        add("user", d.installerId ?? d.uploadedById);
        if (evt.principal.kind === "installer" || evt.principal.kind === "staff") add("user", evt.principal.id);
        for (const l of evt.links) add(l.type, l.id);
        const customer = d.customerId ? await this.deps.backend.get("customer", String(d.customerId), svc) : null;
        if (customer?.data?.leadId) add("lead", customer.data.leadId);
        const issues = [...c.issues];
        const site = String(customer?.data?.address ?? "");
        if (c.extracted.site_address && site && !sameAddress(c.extracted.site_address, site)) {
          issues.push(`Site address on the document (${c.extracted.site_address}) doesn't match the customer's address (${site}).`);
        }
        const top = c.labels[0];
        const reviewState = top && top.confidence >= AUTO_CONFIDENCE ? "auto" : "needs_review";
        const routesConfig = (await this.deps.store.getRecord("config", "document_routes"))?.routes ?? DEFAULT_ROUTES;
        const routes = top && reviewState === "auto" ? routesConfig[top.label] ?? [] : [];
        await this.deps.actions.run({
          name: "update_record",
          input: {
            record: evt.subject,
            fields: { aiLabels: c.labels, extracted: c.extracted, issues, reviewState }
          },
          principal: this.principal,
          causationId: evt.event_id,
          correlationId: evt.correlation_id
        });
        const [prev] = await this.deps.store.getFileLabels([evt.subject.id]);
        await this.deps.store.putFileLabels({
          ...prev ?? {},
          documentId: evt.subject.id,
          labels: c.labels,
          extracted: c.extracted,
          reviewState,
          description: c.description,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          links,
          routes,
          issues,
          deliveredTo: prev?.deliveredTo ?? []
        });
        c.issues = issues;
        if (reviewState === "needs_review") {
          const now = /* @__PURE__ */ new Date();
          await this.deps.store.putInbox({
            id: newId("inb_"),
            kind: "review",
            status: "open",
            title: `Check label: ${top?.label ?? "unknown"} (${Math.round((top?.confidence ?? 0) * 100)}%)`,
            agentId: null,
            subject: evt.subject,
            action: null,
            input: { labels: c.labels },
            reasoning: c.description,
            createdAt: now.toISOString(),
            dueAt: new Date(now.getTime() + 864e5).toISOString(),
            decisionId: null,
            resolvedBy: null,
            resolvedAt: null,
            resolution: null,
            editedInput: null
          });
        }
        return c;
      }
    };
  }
});

// src/jobs/model.ts
function invoiceTotals(lines) {
  const exGst = round2(lines.reduce((s2, l) => s2 + l.qty * l.unitExGst, 0));
  const gst = round2(lines.reduce((s2, l) => s2 + (l.gst ? l.qty * l.unitExGst * 0.1 : 0), 0));
  return { exGst, gst, total: round2(exGst + gst) };
}
var MILESTONES, money, round2;
var init_model = __esm({
  "src/jobs/model.ts"() {
    "use strict";
    MILESTONES = [
      { key: "design_selected", stage: 1, label: "Design chosen", who: "customer", next: "Choose one of your four designs" },
      { key: "installer_assigned", stage: 2, label: "Installer assigned", who: "installer", next: "Accept or decline the job offer" },
      { key: "selection_confirmed", stage: 3, label: "Selection confirmed", who: "customer", next: "Confirm your panels, battery and extras" },
      { key: "site_photos_ok", stage: 3, label: "Site photos received", who: "customer", next: "Send photos of your meter and switchboard" },
      { key: "job_accepted", stage: 3, label: "Job accepted", who: "installer", next: "Review the photos and accept the job" },
      { key: "agreement_signed", stage: 3, label: "Agreement signed", who: "customer", next: "Sign your quote and installation agreement" },
      { key: "deposit_paid", stage: 4, label: "Deposit paid", who: "customer", next: "Pay your deposit" },
      { key: "install_date_set", stage: 4, label: "Installation date set", who: "customer", next: "Pick your installation dates" },
      { key: "connection_applied", stage: 5, label: "Connection applied for", who: "installer", next: "Submit the connection application to the DNSP" },
      { key: "connection_approved", stage: 5, label: "Connection approved", who: "installer", next: "Record the DNSP approval" },
      { key: "bills_received", stage: 6, label: "Energy bills received", who: "customer", next: "Upload your recent energy bills" },
      { key: "quote_final", stage: 6, label: "Quote final", who: "installer", next: "Confirm the final quote" },
      { key: "equipment_paid", stage: 6, label: "Equipment ordered and paid", who: "installer", next: "Place and pay the equipment order" },
      { key: "delivered", stage: 6, label: "Equipment delivered", who: "installer", next: "Book the delivery truck" },
      { key: "install_started", stage: 7, label: "Installation started", who: "installer", next: "Check in on site" },
      { key: "installed", stage: 7, label: "Installation complete", who: "installer", next: "Finish the on-site checklist" },
      { key: "site_docs_sent", stage: 7, label: "Site documents sent", who: "installer", next: "Send today's documents" },
      { key: "final_paid", stage: 8, label: "Final payment received", who: "customer", next: "Pay the final invoice" },
      { key: "stc_pack_signed", stage: 8, label: "STC pack signed", who: "customer", next: "Sign your STC assignment form" },
      { key: "handover_sent", stage: 8, label: "Handover pack sent", who: "installer", next: "Send the handover pack" },
      { key: "stc_lodged", stage: 8, label: "STCs lodged", who: "installer", next: "Lodge the STC claim" },
      { key: "monitoring_clear", stage: 9, label: "Three clear days", who: "installer", next: "Watch the system for three days" }
    ];
    money = (n) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
    round2 = (n) => Math.round(n * 100) / 100;
  }
});

// src/jobs/docs.ts
var docs_exports = {};
__export(docs_exports, {
  STC_PRICE: () => STC_PRICE,
  agreementHtml: () => agreementHtml,
  installCompleteHtml: () => installCompleteHtml,
  invoiceHtml: () => invoiceHtml,
  revisionHtml: () => revisionHtml,
  signedCopy: () => signedCopy,
  stcAssignmentHtml: () => stcAssignmentHtml
});
function agreementHtml(j) {
  const { n, value } = stcLine(j);
  const deposit = Math.round(j.selection.price * j.depositPercent) / 100;
  return SHELL(
    "Quote and installation agreement",
    `<h1>Quote and installation agreement</h1><p class="muted">Version ${j.quoteVersion} \xB7 ${esc(j.site.address)}</p>${parties(j)}
<h2>System</h2>${equipment(j)}
<h2>Price</h2><table><tbody><tr><td>System price (GST incl.)</td><td class="r">${money(j.selection.price)}</td></tr><tr><td>STC point-of-sale discount (${n} STCs at ${money(STC_PRICE)})</td><td class="r">\u2212${money(value)}</td></tr><tr class="tot"><td>You pay</td><td class="r">${money(j.selection.price - value)}</td></tr><tr><td>Deposit on signing (${j.depositPercent}%)</td><td class="r">${money(deposit)}</td></tr><tr><td>Balance on completion</td><td class="r">${money(j.selection.price - value - deposit)}</td></tr></tbody></table>
<h2>Terms</h2><ul><li>Installation by an SAA-accredited installer to AS/NZS 5033, 4777 and 5139 where a battery is installed.</li><li>You assign the right to create the STCs for this system to the seller's registered agent; the discount above depends on it.</li><li>Grid connection is subject to your distributor's approval; the export limit it sets applies.</li><li>Warranties: manufacturers' product warranties, and the installer's workmanship warranty, are listed in your handover pack.</li><li>Cooling-off: if this agreement was made in an unsolicited sale, you may cancel within 10 business days.</li></ul>
<p class="muted">Estimated yearly output ${j.selection.annualOutputKwh.toLocaleString("en-AU")} kWh; estimated savings ${money(j.selection.savingsPerYear)} a year. Estimates, not guarantees.</p>`
  );
}
function revisionHtml(j, changes, newPrice) {
  return SHELL(
    `Quote revision ${j.quoteVersion + 1}`,
    `<h1>Quote revision ${j.quoteVersion + 1}</h1><p class="muted">${esc(j.site.address)}</p>${parties(j)}<h2>What changed</h2><ul>${changes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><div class="box">Price was ${money(j.selection.price)}; now <strong>${money(newPrice)}</strong> (GST incl., before the STC discount).</div><p>Everything else in your signed agreement stays the same.</p>`
  );
}
function installCompleteHtml(j) {
  const t = j.onsite.tests;
  return SHELL(
    "Installation complete",
    `<h1>Installation complete</h1><p class="muted">${esc(j.site.address)} \xB7 ${day(j.installDates?.day2)}</p>${parties(j)}<h2>Installed</h2>${equipment(j)}
<h2>Commissioning</h2><table><tbody><tr><td>Insulation resistance</td><td>${t ? `${t.insulationMOhm} M\u03A9` : "\u2014"}</td></tr><tr><td>Earth continuity</td><td>${t ? t.earthOk ? "Pass" : "Fail" : "\u2014"}</td></tr><tr><td>Export limit set</td><td>${t ? `${t.exportLimitKw} kW` : "\u2014"}</td></tr><tr><td>CSIP-AUS capability test</td><td>${t ? t.csipTest.replace("_", " ") : "\u2014"}</td></tr></tbody></table>
<p>I confirm the system above was installed, I was shown how to shut it down safely, and the site was left clean.</p>`
  );
}
function stcAssignmentHtml(j) {
  const { n, value } = stcLine(j);
  const serials = j.onsite.scanned.filter((s2) => s2.matched);
  return SHELL(
    "STC assignment form",
    `<h1>Small-scale technology certificate assignment</h1><p class="muted">Prepared for the seller's registered agent \xB7 ${esc(j.site.address)}</p>${parties(j)}
<h2>System</h2><table><tbody><tr><td>Installation date</td><td>${day(j.onsite.completeAt ?? j.installDates?.day2)}</td></tr><tr><td>Solar</td><td>${j.selection.kw.toFixed(2)} kW \xB7 ${esc(j.selection.panels.model)} \xD7 ${j.selection.panels.count}</td></tr><tr><td>Inverter</td><td>${esc(j.selection.inverter.model)}</td></tr>${j.selection.battery ? `<tr><td>Battery</td><td>${esc(j.selection.battery.model)} \xB7 ${j.selection.battery.usableKwh} kWh usable</td></tr>` : ""}<tr><td>Deeming period</td><td>${j.stc.deemingYears} years</td></tr><tr><td>Zone rating</td><td>${j.site.zoneRating}</td></tr><tr><td>STCs</td><td>${j.stc.solar} solar + ${j.stc.battery} battery = <strong>${n}</strong></td></tr><tr><td>Benefit passed to you</td><td>${money(value)} point-of-sale discount</td></tr></tbody></table>
<h2>Serial numbers</h2><table><thead><tr><th>Type</th><th>Serial</th></tr></thead><tbody>${serials.map((s2) => `<tr><td>${esc(s2.kind)}</td><td>${esc(s2.serial)}</td></tr>`).join("") || `<tr><td colspan="2">\u2014</td></tr>`}</tbody></table>
<h2>Owner's declaration</h2><p>I am the owner of the system above. I assign the right to create the STCs for it to the seller's registered agent, in exchange for the benefit shown. No STCs have been created for this system before.</p>`
  );
}
function invoiceHtml(inv) {
  const kindLabel = inv.kind === "credit" ? "Adjustment note" : "Tax invoice";
  return SHELL(
    `${kindLabel} ${inv.number}`,
    `<h1>${kindLabel}</h1><p class="muted">${esc(inv.number)} \xB7 issued ${day(inv.issueDate)} \xB7 due ${day(inv.dueDate)}${inv.creditFor ? ` \xB7 adjusts ${esc(inv.creditFor)}` : ""}</p>
<div class="grid"><div><h2>From</h2>${esc(inv.seller.name)}<br>ABN ${esc(inv.seller.abn ?? "\u2014")}<br>${esc(inv.seller.address ?? "")}<br>${esc(inv.seller.email ?? "")}</div><div><h2>To</h2>${esc(inv.buyer.name)}<br>${esc(inv.buyer.address ?? "")}<br>${esc(inv.buyer.email ?? "")}</div></div>
<table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit ex GST</th><th class="r">GST</th><th class="r">Amount</th></tr></thead><tbody>${inv.lines.map((l) => {
      const ex = l.qty * l.unitExGst;
      const g = l.gst ? ex * 0.1 : 0;
      return `<tr><td>${esc(l.description)}</td><td class="r">${l.qty}</td><td class="r">${money(l.unitExGst)}</td><td class="r">${l.gst ? money(g) : "GST-free"}</td><td class="r">${money(ex + g)}</td></tr>`;
    }).join("")}</tbody></table>
<table><tbody><tr><td>Total ex GST</td><td class="r">${money(inv.totals.exGst)}</td></tr><tr><td>GST</td><td class="r">${money(inv.totals.gst)}</td></tr><tr class="tot"><td>Total (GST incl.)</td><td class="r">${money(inv.totals.total)}</td></tr>${inv.payments.map((p) => `<tr><td>Paid ${day(p.at)} \xB7 ${esc(p.method)} ${esc(p.ref)}</td><td class="r">\u2212${money(p.amount)}</td></tr>`).join("")}<tr class="tot"><td>Balance due</td><td class="r">${money(Math.max(0, inv.totals.total - inv.payments.reduce((s2, p) => s2 + p.amount, 0)))}</td></tr></tbody></table>
${inv.notes ? `<p>${esc(inv.notes)}</p>` : ""}<p class="muted">Pay online with the link in your email or portal, or by EFT quoting ${esc(inv.number)}.</p>`
  );
}
function signedCopy(s2) {
  if (!s2.audit) return s2.html;
  const a = s2.audit;
  const page = `<section style="page-break-before:always;border-top:2px solid #0f172a;margin-top:32px;padding-top:16px"><h2>Signature record</h2><table><tbody><tr><td>Signed by</td><td>${esc(a.name)}</td></tr><tr><td>Confirmed with a one-time code sent to</td><td>${esc(a.phone)}</td></tr><tr><td>Signed at</td><td>${esc(new Date(a.at).toLocaleString("en-AU", { timeZone: "Australia/Sydney" }))} (Sydney time)</td></tr><tr><td>IP address</td><td>${esc(a.ip)}</td></tr><tr><td>Document fingerprint (SHA-256)</td><td style="word-break:break-all">${esc(a.hash)}</td></tr></tbody></table></section>`;
  return s2.html.replace("</main>", `${page}</main>`);
}
var esc, day, SHELL, parties, equipment, stcLine, STC_PRICE;
var init_docs = __esm({
  "src/jobs/docs.ts"() {
    "use strict";
    init_model();
    esc = (s2) => String(s2 ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    day = (iso) => iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" }) : "\u2014";
    SHELL = (title, body) => `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:0;background:#fff}main{max-width:760px;margin:0 auto;padding:32px 24px}h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:24px 0 8px}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#475569}.r{text-align:right}.muted{color:#475569}.grid{display:flex;flex-wrap:wrap;gap:24px}.grid>div{flex:1 1 240px}.tot td{font-weight:700}.box{border:1px solid #cbd5e1;border-radius:8px;padding:12px 14px;margin:12px 0}@media print{main{padding:0}}</style></head><body><main>${body}</main></body></html>`;
    parties = (j) => `<div class="grid"><div><h2>Seller</h2>${esc(j.seller.name)}<br>ABN ${esc(j.seller.abn ?? "\u2014")}<br>${esc(j.seller.address ?? "")}<br>${esc(j.seller.email ?? "")}</div><div><h2>Customer</h2>${esc(j.customerName)}<br>${esc(j.site.address)}<br>${esc(j.customerEmail ?? "")}</div></div>`;
    equipment = (j) => {
      const s2 = j.selection;
      const rows = [
        [`${s2.panels.count} \xD7 ${s2.panels.model} (${s2.panels.watts} W)`, `${s2.kw.toFixed(2)} kW array`],
        [s2.inverter.model, `${s2.inverter.kw} kW inverter`],
        ...s2.battery ? [[s2.battery.model, `${s2.battery.usableKwh} kWh usable`]] : [],
        ...s2.accessories.map((a) => [a.name, money(a.price)])
      ];
      return `<table><thead><tr><th>Item</th><th>Detail</th></tr></thead><tbody>${rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table>`;
    };
    stcLine = (j) => {
      const n = j.stc.solar + j.stc.battery;
      return { n, value: n * STC_PRICE };
    };
    STC_PRICE = 38;
  }
});

// node_modules/hono/dist/utils/encode.js
var encodeBase64 = (buf) => {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0, len = bytes.length; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};
var decodeBase64 = (str) => {
  const binary = atob(str);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  const half = binary.length / 2;
  for (let i = 0, j = binary.length - 1; i <= half; i++, j--) {
    bytes[i] = binary.charCodeAt(i);
    bytes[j] = binary.charCodeAt(j);
  }
  return bytes;
};

// node_modules/hono/dist/adapter/aws-lambda/handler.js
function sanitizeHeaderValue(value) {
  if (!/[^\x00-\x7F]/.test(value)) return value;
  return encodeURIComponent(value);
}
var getRequestContext = (event) => {
  return event.requestContext;
};
var handle = (app, { isContentTypeBinary } = { isContentTypeBinary: void 0 }) => {
  return async (event, lambdaContext) => {
    const processor = getProcessor(event);
    let req, requestContext;
    try {
      req = processor.createRequest(event);
      requestContext = getRequestContext(event);
    } catch (error) {
      console.error("Error processing request:", error);
      const errorResponse = error instanceof TypeError ? new Response("Invalid request", { status: 400 }) : new Response("Internal Server Error", { status: 500 });
      return processor.createResult(event, errorResponse, { isContentTypeBinary });
    }
    const res = await app.fetch(req, {
      event,
      requestContext,
      lambdaContext
    });
    return processor.createResult(event, res, { isContentTypeBinary });
  };
};
var EventProcessor = class {
  getHeaderValue(headers, key) {
    return headers ? Array.isArray(headers[key]) ? headers[key][0] : headers[key] : void 0;
  }
  getDomainName(event) {
    if (event.requestContext && "domainName" in event.requestContext) return event.requestContext.domainName;
    const hostFromHeaders = this.getHeaderValue(event.headers, "host");
    if (hostFromHeaders) return hostFromHeaders;
    const multiValueHeaders = "multiValueHeaders" in event ? event.multiValueHeaders : {};
    return this.getHeaderValue(multiValueHeaders, "host");
  }
  createRequest(event) {
    const queryString = this.getQueryString(event);
    const urlPath = `https://${this.getDomainName(event)}${this.getPath(event)}`;
    const url = queryString ? `${urlPath}?${queryString}` : urlPath;
    const headers = this.getHeaders(event);
    const requestInit = {
      headers,
      method: this.getMethod(event)
    };
    if (event.body) {
      const body = event.isBase64Encoded ? decodeBase64(event.body) : new TextEncoder().encode(event.body);
      requestInit.body = body;
      headers.set("content-length", body.length.toString());
    }
    return new Request(url, requestInit);
  }
  async createResult(event, res, options) {
    const contentType = res.headers.get("content-type");
    const isContentTypeBinary = options.isContentTypeBinary ?? defaultIsContentTypeBinary;
    let isBase64Encoded = contentType && isContentTypeBinary(contentType) ? true : false;
    if (!isBase64Encoded) {
      const contentEncoding = res.headers.get("content-encoding");
      isBase64Encoded = isContentEncodingBinary(contentEncoding);
    }
    const result = {
      body: isBase64Encoded ? encodeBase64(await res.arrayBuffer()) : await res.text(),
      statusCode: res.status,
      isBase64Encoded,
      ..."multiValueHeaders" in event && event.multiValueHeaders ? { multiValueHeaders: {} } : { headers: {} }
    };
    this.setCookies(event, res, result);
    if (result.multiValueHeaders) res.headers.forEach((value, key) => {
      result.multiValueHeaders[key] = [value];
    });
    else res.headers.forEach((value, key) => {
      result.headers[key] = value;
    });
    return result;
  }
  setCookies(_event, res, result) {
    if (res.headers.has("set-cookie")) {
      const cookies = res.headers.getSetCookie ? res.headers.getSetCookie() : Array.from(res.headers.entries()).filter(([k]) => k === "set-cookie").map(([, v]) => v);
      if (Array.isArray(cookies)) {
        this.setCookiesToResult(result, cookies);
        res.headers.delete("set-cookie");
      }
    }
  }
};
var EventV2Processor = class extends EventProcessor {
  getPath(event) {
    return event.rawPath;
  }
  getMethod(event) {
    return event.requestContext.http.method;
  }
  getQueryString(event) {
    return event.rawQueryString;
  }
  getCookies(event, headers) {
    if (Array.isArray(event.cookies)) headers.set("Cookie", event.cookies.join("; "));
  }
  setCookiesToResult(result, cookies) {
    result.cookies = cookies;
  }
  getHeaders(event) {
    const headers = new Headers();
    this.getCookies(event, headers);
    if (event.headers) {
      for (const [k, v] of Object.entries(event.headers)) if (v) headers.set(k, v);
    }
    return headers;
  }
};
var v2Processor = new EventV2Processor();
var EventV1Processor = class extends EventProcessor {
  getPath(event) {
    return event.path;
  }
  getMethod(event) {
    return event.httpMethod;
  }
  getQueryString(event) {
    if (event.multiValueQueryStringParameters) return Object.entries(event.multiValueQueryStringParameters || {}).filter(([, value]) => value).map(([key, values]) => values.map((value) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")).join("&");
    else return Object.entries(event.queryStringParameters || {}).filter(([, value]) => value !== void 0).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value || "")}`).join("&");
  }
  getCookies(_event, _headers) {
  }
  getHeaders(event) {
    const headers = new Headers();
    this.getCookies(event, headers);
    if (event.multiValueHeaders) {
      for (const [k, values] of Object.entries(event.multiValueHeaders)) if (values) values.forEach((v) => headers.append(k, sanitizeHeaderValue(v)));
    }
    if (event.headers) {
      for (const [k, v] of Object.entries(event.headers)) if (v && !headers.has(k)) headers.set(k, sanitizeHeaderValue(v));
    }
    return headers;
  }
  setCookiesToResult(result, cookies) {
    result.multiValueHeaders = { "set-cookie": cookies };
  }
};
var v1Processor = new EventV1Processor();
var ALBProcessor = class extends EventProcessor {
  getHeaders(event) {
    const headers = new Headers();
    if (event.multiValueHeaders) {
      for (const [key, values] of Object.entries(event.multiValueHeaders)) if (values && Array.isArray(values)) {
        const sanitizedValue = sanitizeHeaderValue(values.join("; "));
        headers.set(key, sanitizedValue);
      }
    } else for (const [key, value] of Object.entries(event.headers ?? {})) if (value) headers.set(key, sanitizeHeaderValue(value));
    return headers;
  }
  getPath(event) {
    return event.path;
  }
  getMethod(event) {
    return event.httpMethod;
  }
  getQueryString(event) {
    if (event.multiValueQueryStringParameters) return Object.entries(event.multiValueQueryStringParameters || {}).filter(([, value]) => value).map(([key, value]) => `${key}=${value.join(`&${key}=`)}`).join("&");
    else return Object.entries(event.queryStringParameters || {}).filter(([, value]) => value !== void 0).map(([key, value]) => `${key}=${value}`).join("&");
  }
  getCookies(event, headers) {
    let cookie;
    if (event.multiValueHeaders) cookie = event.multiValueHeaders["cookie"]?.join("; ");
    else cookie = event.headers ? event.headers["cookie"] : void 0;
    if (cookie) headers.append("Cookie", cookie);
  }
  setCookiesToResult(result, cookies) {
    if (result.multiValueHeaders) result.multiValueHeaders["set-cookie"] = cookies;
    else result.headers["set-cookie"] = cookies[0];
  }
};
var albProcessor = new ALBProcessor();
var LatticeV2Processor = class extends EventProcessor {
  getPath(event) {
    return event.path;
  }
  getMethod(event) {
    return event.method;
  }
  getQueryString() {
    return "";
  }
  getHeaders(event) {
    const headers = new Headers();
    if (event.headers) {
      for (const [k, values] of Object.entries(event.headers)) if (values) values.forEach((v) => headers.append(k, sanitizeHeaderValue(v)));
    }
    return headers;
  }
  getCookies() {
  }
  setCookiesToResult(result, cookies) {
    result.headers = {
      ...result.headers,
      "set-cookie": cookies
    };
  }
};
var latticeV2Processor = new LatticeV2Processor();
var getProcessor = (event) => {
  if (isProxyEventALB(event)) return albProcessor;
  if (isProxyEventV2(event)) return v2Processor;
  if (isLatticeEventV2(event)) return latticeV2Processor;
  return v1Processor;
};
var isProxyEventALB = (event) => {
  if (event.requestContext) return Object.hasOwn(event.requestContext, "elb");
  return false;
};
var isProxyEventV2 = (event) => {
  return Object.hasOwn(event, "rawPath") && Object.hasOwn(event.requestContext ?? {}, "http");
};
var isLatticeEventV2 = (event) => {
  if (event.requestContext) return Object.hasOwn(event.requestContext, "serviceArn");
  return false;
};
var defaultIsContentTypeBinary = (contentType) => {
  if (/^application\/vnd\.(?:apple\.installer|mozilla\.xul)\+xml\s*(?:;|$)/i.test(contentType)) return true;
  return !/^text\/(?:plain|html|css|javascript|csv)|(?:\/|\+)(?:json|xml)\s*(?:;|$)/i.test(contentType);
};
var isContentEncodingBinary = (contentEncoding) => {
  return !!contentEncoding && !/^identity$/i.test(contentEncoding);
};

// src/actions/service.ts
import { createHash, randomBytes } from "node:crypto";

// src/core/actions.ts
init_zod();
init_envelope();

// src/core/records.ts
var backendHasProjects = () => process.env.BACKEND_PROJECTS_API === "1";
var RECORD_TYPES = {
  lead: {
    type: "lead",
    path: "/leads",
    portal: "installer",
    search: ["status", "search", "assignedToId", "page", "limit"],
    pii: ["customerName", "customerEmail", "customerPhone", "address"],
    aiWritable: ["notes", "status", "projectPhase"],
    ownerInstallerPath: "assignedToId",
    supports: { list: true, get: true, create: true, update: true, delete: false },
    events: { created: "lead.created", updated: "lead.updated" }
  },
  customer: {
    type: "customer",
    path: "/customers",
    portal: "installer",
    search: ["search", "leadLinkedOnly", "page", "limit"],
    pii: ["firstName", "lastName", "email", "phone", "address"],
    aiWritable: [],
    supports: { list: true, get: true, create: true, update: true, delete: false },
    events: { created: "customer.created", updated: "customer.updated" }
  },
  design: {
    type: "design",
    path: "/designs",
    portal: "installer",
    search: ["leadId", "customerId", "status", "limit"],
    pii: [],
    aiWritable: ["notes"],
    supports: { list: true, get: true, create: false, update: true, delete: false },
    events: { created: "design.saved", updated: "design.updated" }
  },
  product: {
    type: "product",
    path: "/products",
    portal: "installer",
    search: ["search", "category", "page", "limit"],
    pii: [],
    aiWritable: [],
    supports: { list: true, get: true, create: false, update: false, delete: false },
    events: { created: "record.purged", updated: "record.purged" }
  },
  appointment: {
    type: "appointment",
    path: "/appointments",
    portal: "installer",
    search: ["from", "to", "leadId", "customerId"],
    pii: ["location"],
    aiWritable: ["notes"],
    ownerInstallerPath: "installerId",
    supports: { list: true, get: true, create: true, update: true, delete: false },
    events: { created: "appointment.booked", updated: "appointment.moved" }
  },
  task: {
    type: "task",
    path: "/installer-tasks",
    portal: "installer",
    search: ["leadId", "customerId", "status"],
    pii: [],
    aiWritable: ["title", "description", "dueDate", "status", "priority"],
    ownerInstallerPath: "assignedToId",
    supports: { list: true, get: true, create: true, update: true, delete: false },
    events: { created: "task.created", updated: "task.updated" }
  },
  note: {
    type: "note",
    path: "/installer-notes",
    portal: "installer",
    search: ["leadId", "customerId"],
    pii: [],
    aiWritable: ["content"],
    supports: { list: true, get: true, create: true, update: true, delete: false },
    events: { created: "note.created", updated: "note.updated" }
  },
  /** Payments (services, product orders, quotes) and installer payouts. Listed through the master endpoint. */
  payment: {
    type: "payment",
    path: "/payments/master",
    portal: "admin",
    search: ["status", "kind", "installerId", "limit"],
    pii: ["customerEmail", "customerName"],
    aiWritable: [],
    supports: { list: true, get: false, create: false, update: false, delete: false },
    events: { created: "payment.succeeded", updated: "payment.succeeded" }
  },
  /** Portal users (installers, staff, customers). Confirm `/users/:id` exists for admin tokens in the backend. */
  user: {
    type: "user",
    path: "/users",
    portal: "admin",
    search: ["role", "search"],
    pii: ["firstName", "lastName", "email", "phone"],
    aiWritable: [],
    supports: { list: true, get: true, create: false, update: false, delete: false },
    events: { created: "record.purged", updated: "record.purged" }
  },
  /**
   * Organisations documents are sent to: electricity retailers, DNSPs, suppliers,
   * finance providers. In the backend's `partners` table once BACKEND_PROJECTS_API=1,
   * kept by the AI platform before that.
   * Fields: name, kind (retailer | dnsp | supplier | finance | other), email,
   * submissionEmail, phone, requires (document labels it wants), attach (send
   * files as attachments), subjectTemplate, notes.
   */
  partner: {
    type: "partner",
    path: "/partners",
    portal: "admin",
    search: ["kind", "search"],
    pii: [],
    aiWritable: [],
    supports: { list: true, get: true, create: true, update: true, delete: false },
    events: { created: "partner.created", updated: "partner.updated" },
    get storedIn() {
      return backendHasProjects() ? "backend" : "ai";
    }
  },
  document: {
    type: "document",
    path: "/installer-customer-documents",
    portal: "installer",
    search: ["customerId", "leadId", "category"],
    pii: [],
    aiWritable: ["aiLabels", "extracted", "issues", "reviewState", "leadId", "s3Key"],
    ownerCustomerPath: "customerId",
    supports: { list: true, get: true, create: false, update: true, delete: false },
    events: { created: "file.uploaded", updated: "file.classified" }
  }
};
function getRecordType(type) {
  const def = RECORD_TYPES[type];
  if (!def) throw new Error(`Unknown record type: ${type}`);
  return def;
}
function readPath(obj, path) {
  if (!path || obj == null || typeof obj !== "object") return void 0;
  return path.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object") return acc[key];
    return void 0;
  }, obj);
}

// src/core/actions.ts
var ACTION_FAMILIES = {
  messages: { label: "Outbound messages and calls", detail: "Email, SMS, Voxa outbound calls" },
  quotes: { label: "Quote changes and discounts", detail: "Sales agent" },
  offers: { label: "Job offers to installers", detail: "Matching agent" },
  refunds: { label: "Refunds and payouts", detail: "Support and Finance agents" },
  lodging: { label: "DNSP and STC submissions", detail: "Delivery agent" },
  dispatch: { label: "VPP battery dispatch", detail: "Optimiser stays in its own safe mode" },
  records: { label: "Record changes", detail: "Leads, customers, tasks, notes, files" },
  scheduling: { label: "Bookings", detail: "Consultations, installs, service visits" },
  workflows: { label: "Workflows", detail: "Multi-step templates" },
  memory: { label: "AI memory", detail: "Facts and summaries" }
};
var recordTypeEnum = external_exports.enum(Object.keys(RECORD_TYPES));
var MessageChannel = external_exports.enum(["email", "sms", "portal"]);
var ACTIONS = {
  search_records: {
    name: "search_records",
    kind: "read",
    family: "records",
    sensitivity: "low",
    description: "Find records of one type (lead, customer, design, product, appointment, task, note, document) using filters. Returns at most `limit` records the caller is allowed to see.",
    input: external_exports.object({
      type: recordTypeEnum,
      filter: external_exports.record(external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean()])).default({}),
      limit: external_exports.number().int().min(1).max(50).default(10)
    })
  },
  get_record: {
    name: "get_record",
    kind: "read",
    family: "records",
    sensitivity: "low",
    description: "Read one record by type and id, with its AI summary and confirmed facts.",
    input: external_exports.object({ record: RecordRef })
  },
  search_memory: {
    name: "search_memory",
    kind: "read",
    family: "memory",
    sensitivity: "low",
    description: "Search past conversations, notes, transcripts and facts for text relevant to a question. Results are limited to records the caller may see.",
    input: external_exports.object({ query: external_exports.string().min(2), subjects: external_exports.array(RecordRef).default([]), limit: external_exports.number().int().min(1).max(8).default(5) })
  },
  create_record: {
    name: "create_record",
    kind: "write",
    family: "records",
    sensitivity: "medium",
    description: "Create a record of the given type with the given fields.",
    input: external_exports.object({ type: recordTypeEnum, fields: external_exports.record(external_exports.unknown()) })
  },
  update_record: {
    name: "update_record",
    kind: "write",
    family: "records",
    sensitivity: "medium",
    description: "Change fields on an existing record. Agents may only change fields marked AI-writable for that type.",
    input: external_exports.object({ record: RecordRef, fields: external_exports.record(external_exports.unknown()) })
  },
  link_records: {
    name: "link_records",
    kind: "write",
    family: "records",
    sensitivity: "low",
    description: "Link one record to another, e.g. a document to a lead.",
    input: external_exports.object({ from: RecordRef, to: RecordRef })
  },
  list_files: {
    name: "list_files",
    kind: "read",
    family: "records",
    sensitivity: "low",
    description: "List documents and photos on a customer or lead, optionally filtered by slot or AI label (meter, switchboard, inverter, isolator, array, roof, serial_plate, before_clean, after_clean, electricity_bill, licence).",
    input: external_exports.object({
      record: RecordRef,
      slot: external_exports.string().optional(),
      label: external_exports.string().optional(),
      latest_only: external_exports.boolean().default(true)
    })
  },
  get_file_link: {
    name: "get_file_link",
    kind: "read",
    family: "records",
    sensitivity: "medium",
    description: "Get a time-limited download link for a file.",
    input: external_exports.object({ file: RecordRef, expires_in_hours: external_exports.number().int().min(1).max(168).default(168) })
  },
  send_message: {
    name: "send_message",
    kind: "send",
    family: "messages",
    sensitivity: "high",
    description: "Send an email, SMS or portal message, optionally with files, to anyone on record: a customer, lead, portal user (installer or staff) or partner (retailer, DNSP, supplier). `to` is always a record; the platform looks up the contact details, so raw addresses are never accepted. Files are checked for type, size and malware before sending.",
    input: external_exports.object({
      to: external_exports.object({ record: RecordRef }),
      channel: external_exports.array(MessageChannel).min(1),
      purpose: external_exports.enum(["transactional", "marketing"]).default("transactional"),
      subject: external_exports.string().max(140).optional(),
      body: external_exports.string().min(1).max(4e3),
      files: external_exports.array(RecordRef).max(20).default([]),
      /** Send files as email attachments instead of links (partners that require it get attachments anyway). */
      attach: external_exports.boolean().default(false),
      /** Why this recipient gets it, e.g. "customer", "retailer" (shown in delivery history). */
      role: external_exports.string().max(40).optional(),
      /** The project this message is about, so it shows in that project's history. */
      about: RecordRef.optional(),
      reason: external_exports.string().min(3)
    })
  },
  place_call: {
    name: "place_call",
    kind: "send",
    family: "messages",
    sensitivity: "high",
    description: "Place an outbound call to a person on file through the distributor line.",
    input: external_exports.object({
      to: external_exports.object({ record: RecordRef }),
      purpose: external_exports.enum(["operational", "marketing"]),
      reason: external_exports.string().min(3)
    })
  },
  schedule: {
    name: "schedule",
    kind: "write",
    family: "scheduling",
    sensitivity: "medium",
    description: "Book, move or cancel an appointment, or list availability.",
    input: external_exports.object({
      mode: external_exports.enum(["book", "move", "cancel", "availability"]),
      appointment: RecordRef.optional(),
      fields: external_exports.record(external_exports.unknown()).default({})
    })
  },
  create_task: {
    name: "create_task",
    kind: "write",
    family: "records",
    sensitivity: "low",
    description: "Hand a piece of work to a person: title, details, due date and the record it is about.",
    input: external_exports.object({
      title: external_exports.string().min(3).max(200),
      details: external_exports.string().max(4e3).default(""),
      due: external_exports.string().optional(),
      about: RecordRef.optional(),
      assignee_id: external_exports.string().optional()
    })
  },
  start_workflow: {
    name: "start_workflow",
    kind: "write",
    family: "workflows",
    sensitivity: "medium",
    description: "Start a saved workflow template by name with inputs.",
    input: external_exports.object({ template: external_exports.string().min(2), inputs: external_exports.record(external_exports.unknown()).default({}) })
  },
  assign_installer: {
    name: "assign_installer",
    kind: "write",
    family: "offers",
    sensitivity: "high",
    description: "Assign an installer to a customer's project (customer or lead), replacing the current one or adding a second. Staff do it directly; a customer or installer asking for it sends the request to EasyLink staff. The new installer sees the project's full history; the previous one stops seeing it.",
    input: external_exports.object({
      project: RecordRef,
      installer: RecordRef,
      mode: external_exports.enum(["replace", "add"]).default("replace"),
      reason: external_exports.string().min(3).max(500),
      notify: external_exports.boolean().default(true)
    })
  },
  find_contact: {
    name: "find_contact",
    kind: "write",
    family: "records",
    sensitivity: "medium",
    description: "Find the right email for an organisation that isn't on file (an electricity retailer, DNSP, supplier) by searching its own website, following EasyLink's contact rules. Saves it as an unverified partner and returns it; the first send to it waits for a staff OK.",
    input: external_exports.object({
      organisation: external_exports.string().min(2).max(120),
      kind: external_exports.enum(["retailer", "dnsp", "supplier", "other"]),
      purpose: external_exports.string().max(300).default(""),
      about: RecordRef.optional()
    })
  },
  draft_invoice: {
    name: "draft_invoice",
    kind: "write",
    family: "quotes",
    sensitivity: "medium",
    description: "Draft a tax invoice on a job when an installer or staff member asks (e.g. 'invoice Daniel for the switchboard upgrade'). Lines are ex GST with a GST flag. It is only a draft: the installer checks it and presses Send.",
    input: external_exports.object({
      job: external_exports.string().min(1).describe("The job id (the lead id)"),
      kind: external_exports.enum(["deposit", "final", "variation", "other"]).default("variation"),
      lines: external_exports.array(external_exports.object({ description: external_exports.string().min(1).max(200), qty: external_exports.number().positive(), unitExGst: external_exports.number(), gst: external_exports.boolean().default(true) })).min(1).max(30),
      notes: external_exports.string().max(1e3).default(""),
      dueDays: external_exports.number().int().min(0).max(90).default(7)
    })
  },
  write_fact: {
    name: "write_fact",
    kind: "write",
    family: "memory",
    sensitivity: "low",
    description: "Save a short, durable fact about a record (e.g. 'dog on site, call ahead'). Never store health conditions; store only the handling instruction.",
    input: external_exports.object({
      about: RecordRef,
      statement: external_exports.string().min(3).max(300),
      confidence: external_exports.number().min(0).max(1).default(0.8)
    })
  },
  request_approval: {
    name: "request_approval",
    kind: "meta",
    family: "records",
    sensitivity: "low",
    description: "Ask a person a question or for approval when the agent cannot proceed safely.",
    input: external_exports.object({ question: external_exports.string().min(5), about: RecordRef.optional() })
  }
};
function isActionName(name) {
  return name in ACTIONS;
}
function toolSpecFor(name, allowedRecordTypes) {
  const def = ACTIONS[name];
  const schema = zodToJsonSchema(def.input);
  if (allowedRecordTypes) restrictRecordTypes(schema, allowedRecordTypes);
  return { toolSpec: { name: def.name, description: def.description, inputSchema: { json: schema } } };
}
function restrictRecordTypes(schema, allowed) {
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    const n = node;
    if (Array.isArray(n.enum) && n.enum.every((v) => typeof v === "string" && v in RECORD_TYPES)) {
      n.enum = n.enum.filter((v) => allowed.includes(v));
    }
    for (const v of Object.values(n)) walk(v);
  };
  walk(schema);
}
function zodToJsonSchema(s2) {
  const def = s2._def;
  switch (def.typeName) {
    case "ZodObject": {
      const shape = s2.shape;
      const properties = {};
      const required = [];
      for (const [k, v] of Object.entries(shape)) {
        properties[k] = zodToJsonSchema(v);
        const t = v._def.typeName;
        if (t !== "ZodOptional" && t !== "ZodDefault") required.push(k);
      }
      return { type: "object", properties, ...required.length ? { required } : {} };
    }
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodEnum":
      return { type: "string", enum: [...def.values] };
    case "ZodArray":
      return { type: "array", items: zodToJsonSchema(def.type) };
    case "ZodRecord":
      return { type: "object", additionalProperties: zodToJsonSchema(def.valueType) };
    case "ZodUnion":
      return { anyOf: def.options.map(zodToJsonSchema) };
    case "ZodOptional":
      return zodToJsonSchema(def.innerType);
    case "ZodDefault": {
      const inner = zodToJsonSchema(def.innerType);
      return { ...inner, default: def.defaultValue() };
    }
    case "ZodUnknown":
    case "ZodAny":
      return {};
    case "ZodNullable":
      return zodToJsonSchema(def.innerType);
    default:
      return {};
  }
}

// src/actions/service.ts
init_envelope();

// src/compliance/au.ts
var STATE_TZ = {
  NSW: "Australia/Sydney",
  ACT: "Australia/Sydney",
  VIC: "Australia/Melbourne",
  TAS: "Australia/Hobart",
  QLD: "Australia/Brisbane",
  SA: "Australia/Adelaide",
  NT: "Australia/Darwin",
  WA: "Australia/Perth"
};
function stateFromPostcode(postcode) {
  const p = Number(String(postcode).trim());
  if (!Number.isFinite(p)) return null;
  if (p >= 200 && p <= 299 || p >= 2600 && p <= 2618 || p >= 2900 && p <= 2920) return "ACT";
  if (p >= 1e3 && p <= 2599 || p >= 2619 && p <= 2899 || p >= 2921 && p <= 2999) return "NSW";
  if (p >= 3e3 && p <= 3999 || p >= 8e3 && p <= 8999) return "VIC";
  if (p >= 4e3 && p <= 4999 || p >= 9e3 && p <= 9999) return "QLD";
  if (p >= 5e3 && p <= 5999) return "SA";
  if (p >= 6e3 && p <= 6999) return "WA";
  if (p >= 7e3 && p <= 7999) return "TAS";
  if (p >= 800 && p <= 999) return "NT";
  return null;
}
function stateFromAddress(address) {
  if (!address) return null;
  const explicit = address.match(/\b(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/i)?.[1]?.toUpperCase();
  if (explicit) return explicit;
  const pcs = address.match(/\b\d{4}\b/g);
  return pcs ? stateFromPostcode(pcs.at(-1)) : null;
}
var NATIONAL_PUBLIC_HOLIDAYS = /* @__PURE__ */ new Set([
  // 2026
  "2026-01-01",
  "2026-01-26",
  "2026-04-03",
  "2026-04-06",
  "2026-04-25",
  "2026-12-25",
  "2026-12-28",
  // 2027
  "2027-01-01",
  "2027-01-26",
  "2027-03-26",
  "2027-03-29",
  "2027-04-25",
  "2027-12-27",
  "2027-12-28"
]);
function localTime(at, tz) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short"
  }).formatToParts(at);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const hour = Number(get("hour")) % 24;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, weekday: wd, hour, minute: Number(get("minute")) };
}
function withinTelemarketingHours(at, state) {
  const zones = state ? [STATE_TZ[state]] : Object.values(STATE_TZ);
  for (const tz of zones) {
    const t = localTime(at, tz);
    if (NATIONAL_PUBLIC_HOLIDAYS.has(t.date)) return { ok: false, reason: `national public holiday (${t.date})` };
    if (t.weekday === 0) return { ok: false, reason: "Sunday" };
    const mins = t.hour * 60 + t.minute;
    if (t.weekday === 6) {
      if (mins < 9 * 60 || mins >= 17 * 60) return { ok: false, reason: "outside 9am\u20135pm Saturday" };
    } else if (mins < 9 * 60 || mins >= 20 * 60) {
      return { ok: false, reason: "outside 9am\u20138pm weekdays" };
    }
  }
  return { ok: true };
}
function withinSmsHours(at, state) {
  const zones = state ? [STATE_TZ[state]] : Object.values(STATE_TZ);
  return zones.every((tz) => {
    const { hour } = localTime(at, tz);
    return hour >= 8 && hour < 20;
  });
}
function isOptOut(text) {
  return /^\s*(stop|stop all|unsubscribe|cancel|end|quit|opt out|optout)\s*[.!]?\s*$/i.test(text);
}

// src/policy/policy.ts
var STAFF_ROLES = /* @__PURE__ */ new Set(["ADMIN", "SUPER_ADMIN", "MASTER", "STAFF", "DISTRIBUTOR"]);
function isStaff(p) {
  return p.kind === "staff" || p.roles.some((r) => STAFF_ROLES.has(r.toUpperCase()));
}
function evaluatePolicy(req) {
  const policies = [];
  const reasons = [];
  let requireHuman = false;
  const deny = (id, why) => ({ decision: "deny", policies: [...policies, id], reasons: [...reasons, why] });
  const now = req.now ?? /* @__PURE__ */ new Date();
  const p = req.principal;
  if (p.kind === "visitor" && !["search_memory"].includes(req.action)) {
    return deny("visitor_read_only", "Website visitors cannot run actions until they are a lead or customer.");
  }
  const res = req.resource;
  if (res?.data && (p.kind === "installer" || p.kind === "customer") && !isStaff(p)) {
    const def = RECORD_TYPES[res.ref.type];
    if (def) {
      if (p.kind === "installer" && def.ownerInstallerPath) {
        const owner = readPath(res.data, def.ownerInstallerPath);
        if (owner != null && String(owner) !== p.id) {
          return deny("installer_own_records", `Installer ${p.id} is not assigned to ${res.ref.type} ${res.ref.id}.`);
        }
        policies.push("installer_own_records");
      }
      if (p.kind === "customer") {
        const owner = readPath(res.data, def.ownerCustomerPath ?? "customerId") ?? readPath(res.data, "userId");
        if (owner == null || String(owner) !== p.id) {
          return deny("customer_own_records", `Customers can only see their own records.`);
        }
        policies.push("customer_own_records");
      }
    }
  }
  if (p.kind === "agent" && req.action === "update_record" && res) {
    const def = RECORD_TYPES[res.ref.type];
    const writable = new Set(def?.aiWritable ?? []);
    const blocked = (req.changedFields ?? []).filter((f) => !writable.has(f));
    if (blocked.length) {
      requireHuman = true;
      policies.push("agent_ai_writable_fields");
      reasons.push(`Fields ${blocked.join(", ")} are not AI-writable; a person must approve.`);
    } else {
      policies.push("agent_ai_writable_fields");
    }
  }
  if (req.action === "send_message" || req.action === "place_call") {
    const r = req.recipient;
    if (!r?.resolvedFromRecord && !isStaff(p)) {
      return deny("send_to_contact_on_file", "Messages and calls may only go to contact details already on a record.");
    }
    policies.push("send_to_contact_on_file");
    if (r?.optedOut && (req.purpose === "marketing" || req.channels?.includes("sms") || req.action === "place_call")) {
      return deny("respect_opt_out", "The recipient has opted out of marketing, SMS and calls.");
    }
    if (r?.verified === false && !isStaff(p)) {
      requireHuman = true;
      policies.push("new_contact_needs_approval");
      reasons.push(`First send to a contact the AI found${r.source ? ` on ${r.source}` : ""}: EasyLink staff confirm it once, then it's trusted.`);
    }
    if (req.purpose === "marketing" && !isStaff(p) && p.kind !== "agent" && p.kind !== "system") {
      return deny("marketing_from_easylink_only", "Only EasyLink can send marketing messages.");
    }
    const state = stateFromAddress(r?.address);
    if (req.action === "send_message") {
      if (req.purpose === "marketing") {
        if (!r?.consent?.marketing) return deny("spam_act_consent", "No marketing consent recorded (Spam Act 2003).");
        policies.push("spam_act_consent");
      }
      if (p.kind === "agent" && r?.type !== "user" && req.channels?.includes("sms") && !withinSmsHours(now, state)) {
        return deny("sms_quiet_hours", "Agent SMS is not sent between 8pm and 8am in the recipient's time zone.");
      }
    }
    if (req.action === "place_call" && req.purpose === "marketing") {
      const hours = withinTelemarketingHours(now, state);
      if (!hours.ok) return deny("acma_calling_hours", `Marketing calls not allowed now: ${hours.reason}.`);
      if (r?.dncrRegistered && !r.consent?.calls) {
        return deny("dncr", "Number is on the Do Not Call Register and no consent is recorded.");
      }
      policies.push("acma_calling_hours", "dncr");
    }
  }
  if (req.action === "assign_installer") {
    if (req.related === false) return deny("own_projects_only", "You can only ask about projects you are part of.");
    if (!isStaff(p) && p.kind !== "system") {
      requireHuman = true;
      policies.push("assignment_by_staff");
      reasons.push("Changing the installer is decided by EasyLink staff.");
    }
  }
  if ((req.count ?? 1) > 20) {
    requireHuman = true;
    policies.push("bulk_requires_approval");
    reasons.push(`Affects ${req.count} records.`);
  }
  if (p.kind === "agent" && req.action === "update_record" && res?.ref.type === "lead") {
    const status = String(req.fields?.status ?? "");
    if (["WON", "LOST"].includes(status)) {
      requireHuman = true;
      policies.push("always_human_sale_outcome");
    }
  }
  return { decision: "allow", policies, reasons, requireHuman };
}

// src/policy/autonomy.ts
var LEVEL_LABEL = {
  L0: "Shadow",
  L1: "Recommends",
  L2: "Decides",
  L3: "Decides"
};
function defaultLevel(action) {
  const def = ACTIONS[action];
  if (def.kind === "read") return "L3";
  if (action === "write_fact" || action === "create_task" || action === "request_approval" || action === "find_contact") return "L2";
  return "L1";
}
function resolveAutonomy(args) {
  const { agentId, action, context, rules, control } = args;
  const def = ACTIONS[action];
  if (control.pausedAgents[agentId]) return { level: "L0", outcome: "shadow", why: "Agent is paused in the AI control centre." };
  if (control.familiesOff[def.family] && def.kind !== "read") {
    return { level: "L0", outcome: "blocked", why: `The "${def.family}" kill switch is off.` };
  }
  const matching = rules.filter((r) => r.agentId === agentId && r.action === action).filter((r) => Object.entries(r.condition).every(([k, v]) => context[k] === v)).sort((a, b) => Object.keys(b.condition).length - Object.keys(a.condition).length);
  let level = matching[0]?.level ?? defaultLevel(action);
  let why = matching[0] ? `Rule set by ${matching[0].setBy}: ${matching[0].reason}` : "Default level for this action.";
  if (def.kind !== "read" && control.globalRecommendOnly && (level === "L2" || level === "L3")) {
    level = "L1";
    why = "All agents are set to recommend-only.";
  }
  if (args.requireHuman && def.kind !== "read" && (level === "L2" || level === "L3")) {
    level = "L1";
    why = "Policy requires a person for this change.";
  }
  if (level === "L0") return { level, outcome: def.kind === "read" ? "execute" : "shadow", why };
  if (level === "L1" && def.kind !== "read") return { level, outcome: "propose", why };
  return { level, outcome: "execute", why };
}
function suggestPromotion(stats) {
  const rate = stats.proposals ? stats.approvedUnchanged / stats.proposals : 0;
  if (stats.complianceRejections > 0) return null;
  if (stats.level === "L1" && stats.proposals >= 100 && rate >= 0.97) return "L2";
  if (stats.level === "L2" && stats.proposals >= 300 && rate >= 0.99 && stats.reversals === 0) return "L3";
  return null;
}

// src/actions/workflows.ts
init_finder();
var ref = (v) => v;
var WORKFLOWS = {
  request_missing_photos: {
    id: "request_missing_photos",
    title: "Request missing photos",
    description: "Ask the customer (or installer) to upload photos for slots that are still empty, and track it as a task.",
    steps: (i) => {
      const to = ref(i.to ?? i.customer);
      const slots = i.slots ?? ["meter", "switchboard"];
      const pretty3 = slots.map((s2) => s2.replace(/_/g, " ")).join(", ");
      return [
        {
          id: "message",
          action: "send_message",
          input: {
            to: { record: to },
            channel: ["sms", "email"],
            purpose: "transactional",
            subject: "Photos needed for your solar installation",
            body: `Hi, to keep your installation on track we need photos of: ${pretty3}. You can upload them in your EasyLink portal under Documents.`,
            reason: `Missing photo slots: ${pretty3}`
          }
        },
        {
          id: "task",
          action: "create_task",
          optional: true,
          input: {
            title: `Chase photos: ${pretty3}`,
            details: "Created by the request_missing_photos workflow. Close when the photos arrive.",
            about: to,
            due: i.due
          }
        }
      ];
    }
  },
  lead_intake: {
    id: "lead_intake",
    title: "Lead intake",
    description: "Qualify a new lead: mark it contacted, record the summary as a fact and hand a follow-up to sales.",
    steps: (i) => {
      const lead = ref(i.lead);
      return [
        { id: "status", action: "update_record", input: { record: lead, fields: { status: "CONTACTED" } } },
        ...i.summary ? [{ id: "fact", action: "write_fact", input: { about: lead, statement: String(i.summary).slice(0, 300), confidence: 0.9 }, optional: true }] : [],
        {
          id: "task",
          action: "create_task",
          input: { title: "Follow up new lead", details: String(i.summary ?? ""), about: lead, assignee_id: i.assignee_id }
        }
      ];
    }
  },
  lead_to_customer: {
    id: "lead_to_customer",
    title: "Convert lead to customer record",
    description: "Write a qualified lead as a customer record and link the two.",
    steps: (i) => {
      const lead = ref(i.lead);
      const f = i.fields ?? {};
      return [
        { id: "create", action: "create_record", input: { type: "customer", fields: { ...f, leadId: lead.id } } },
        { id: "status", action: "update_record", input: { record: lead, fields: { status: "QUALIFIED" } }, optional: true }
      ];
    }
  },
  reassign_installer: {
    id: "reassign_installer",
    title: "Change the installer",
    description: "Assign a new installer to a project and tell the new installer and the customer.",
    family: "offers",
    steps: async (i, ctx) => {
      const project = ref(i.project);
      const installer = ref(i.installer);
      const inst = await ctx.get(installer);
      const proj = await ctx.get(project);
      const customer = project.type === "customer" ? proj : proj?.customerId ? await ctx.get({ type: "customer", id: String(proj.customerId) }) : null;
      const site = String(customer?.address ?? proj?.address ?? "the site");
      const instName = [inst?.firstName, inst?.lastName].filter(Boolean).join(" ") || String(inst?.name ?? "your new installer");
      const steps = [{ id: "assign", action: "assign_installer", input: { project, installer, mode: i.mode ?? "replace", reason: String(i.reason ?? "Reassigned by EasyLink") } }];
      steps.push({
        id: "tell-installer",
        action: "send_message",
        optional: true,
        input: {
          to: { record: installer },
          channel: ["portal", "email"],
          purpose: "transactional",
          subject: `New job assigned \u2013 ${site}`,
          body: `Hi ${String(inst?.firstName ?? "there")},

EasyLink has assigned you the job at ${site}. Its documents, messages and history are in your portal now.`,
          reason: "Installer assignment",
          role: "installer",
          about: project
        }
      });
      if (customer?.id) {
        steps.push({
          id: "tell-customer",
          action: "send_message",
          optional: true,
          input: {
            to: { record: { type: "customer", id: String(customer.id) } },
            channel: ["portal", "email"],
            purpose: "transactional",
            subject: "Your installer has changed",
            body: `Hi ${String(customer.firstName ?? "there")},

${instName} is now your installer for ${site}. Everything so far is kept in your portal.`,
            reason: "Installer assignment",
            role: "customer",
            about: project
          }
        });
      }
      return steps;
    }
  },
  deliver_documents: {
    id: "deliver_documents",
    title: "Store and send documents",
    description: "Send documents to the people and organisations that need them: the customer, their electricity retailer, the installer, the DNSP or any record. Files are already saved and linked; this sends them and records who got what.",
    steps: (i, ctx) => deliverSteps(i, ctx)
  },
  job_completion_pack: {
    id: "job_completion_pack",
    title: "Job completion pack",
    description: "When an install is finished: send the completion documents to the customer and their retailer, then mark the job complete.",
    steps: async (i, ctx) => {
      const about = ref(i.about ?? i.customer);
      let documents = i.documents ?? [];
      if (!documents.length) {
        const files = await ctx.list("document", { [about.type === "lead" ? "leadId" : "customerId"]: about.id });
        const profiles = await ctx.fileProfiles(files.map((f) => String(f.id)));
        documents = profiles.filter((p) => (p.routes?.length ?? 0) > 0 && !p.deliveredTo?.length).map((p) => ({ type: "document", id: p.documentId }));
      }
      const steps = await deliverSteps({ ...i, about, documents, to: i.to ?? ["customer", "retailer"] }, ctx);
      const customer = about.type === "customer" ? await ctx.get(about) : null;
      const lead = about.type === "lead" ? about.id : customer?.leadId;
      if (lead) steps.push({ id: "complete", action: "update_record", optional: true, input: { record: { type: "lead", id: String(lead) }, fields: { projectPhase: "COMPLETED" } } });
      return steps;
    }
  }
};
var BODY = {
  customer: (who, site, names) => ({
    subject: "Your solar installation documents",
    body: `Hi ${who},

Your installation documents are ready: ${names}. They are also saved in your EasyLink portal under Documents.

Thanks for choosing EasyLink Solar.`
  }),
  retailer: (_who, site, names) => ({
    subject: `Solar installation documents \u2013 ${site}`,
    body: `Hello,

Please find attached the documents for the solar installation at ${site}: ${names}.

Regards,
EasyLink Solar`
  }),
  installer: (who, site, names) => ({ subject: `Documents \u2013 ${site}`, body: `Hi ${who},

Documents for ${site}: ${names}.` }),
  other: (_who, site, names) => ({ subject: `Documents \u2013 ${site}`, body: `Hello,

Documents for ${site}: ${names}.

EasyLink Solar` })
};
async function deliverSteps(i, ctx) {
  const about = ref(i.about);
  const documents = (i.documents ?? []).filter((d) => d?.id);
  if (!documents.length) return [{ id: "nothing", action: "request_approval", optional: true, input: { question: "There were no documents to send for this job.", about } }];
  const subject = await ctx.get(about);
  const customer = about.type === "customer" ? subject : subject?.customerId ? await ctx.get({ type: "customer", id: String(subject.customerId) }) : null;
  const site = String(customer?.address ?? subject?.address ?? "the site");
  const profiles = await ctx.fileProfiles(documents.map((d) => d.id));
  const names = profiles.map((p) => (p.labels[0]?.label ?? "document").replace(/_/g, " ")).join(", ") || `${documents.length} documents`;
  const wanted = i.to ?? Array.from(new Set(profiles.flatMap((p) => p.routes ?? [])));
  const steps = [];
  for (const w of wanted) {
    let to = null;
    let organisation = null;
    let role = typeof w === "string" ? w : "organisation" in w ? w.kind ?? "other" : w.type;
    if (typeof w !== "string" && "organisation" in w) {
      const known = (await ctx.list("partner", {})).find((p) => matchesName(w.organisation, p));
      to = known ? { type: "partner", id: String(known.id) } : null;
      organisation = to ? null : w.organisation;
    } else if (typeof w !== "string") to = w;
    else if (w === "customer") to = customer ? { type: "customer", id: String(customer.id) } : about.type === "lead" ? about : null;
    else if (w === "installer") {
      const inst = profiles.flatMap((p) => p.links ?? []).find((l) => l.type === "user");
      to = inst ?? (subject?.assignedToId ? { type: "user", id: String(subject.assignedToId) } : null);
    } else if (w === "retailer" || w === "dnsp") {
      const r = await findPartner(ctx, w, customer, documents);
      to = r.ref;
      organisation = r.ref ? null : r.name;
    }
    const send = (target, isPartner, who2, stepRole) => {
      const t = (BODY[stepRole] ?? BODY.other)(who2, site, names);
      return {
        id: `send-${stepRole}-${"id" in target ? target.id : target.$step}`,
        action: "send_message",
        optional: true,
        input: {
          to: { record: target },
          channel: isPartner ? ["email"] : ["portal", "email"],
          purpose: "transactional",
          subject: t.subject,
          body: i.note ? `${t.body}

${String(i.note).slice(0, 1e3)}` : t.body,
          files: documents,
          attach: isPartner,
          role: stepRole,
          reason: `Job documents for ${site} (${names})`
        }
      };
    };
    if (!to && organisation) {
      const findId = `find-${role}`;
      steps.push({ id: findId, action: "find_contact", optional: true, input: { organisation, kind: ["retailer", "dnsp", "supplier"].includes(role) ? role : "other", purpose: `documents for ${site}: ${names}`, about } });
      steps.push(send({ $step: findId, path: "partner" }, true, "there", role));
      continue;
    }
    if (!to) {
      steps.push({
        id: `missing-${role}`,
        action: "request_approval",
        optional: true,
        input: { question: `Which ${role} should receive ${names} for ${site}? It isn't on the customer record or their electricity bill.`, about }
      });
      continue;
    }
    const rec = await ctx.get(to);
    if (to.type === "partner") role = String(rec?.kind ?? role);
    const who = String(rec?.firstName ?? rec?.name ?? rec?.customerName ?? "there");
    steps.push(send(to, to.type === "partner", who, role));
  }
  return steps;
}
async function findPartner(ctx, kind, customer, documents) {
  const idField = kind === "dnsp" ? "dnspPartnerId" : "retailerPartnerId";
  if (customer?.[idField]) return { ref: { type: "partner", id: String(customer[idField]) }, name: null };
  let name = String(customer?.[kind] ?? customer?.[kind === "dnsp" ? "dnspName" : "retailerName"] ?? "");
  if (!name && customer?.id) {
    const files = await ctx.list("document", { customerId: customer.id });
    const profiles = await ctx.fileProfiles([...files.map((f) => String(f.id)), ...documents.map((d) => d.id)]);
    name = profiles.map((p) => p.extracted?.[kind === "dnsp" ? "dnsp" : "retailer"]).find(Boolean) ?? "";
  }
  if (!name) return { ref: null, name: null };
  const hit = (await ctx.list("partner", { kind })).find((p) => matchesName(name, p));
  return { ref: hit ? { type: "partner", id: String(hit.id) } : null, name };
}

// src/actions/service.ts
init_classify();

// src/files/safety.ts
import { S3Client as S3Client2, GetObjectTaggingCommand } from "@aws-sdk/client-s3";
var LIMITS = {
  /** Largest single file that may be sent at all. */
  maxFileBytes: 25 * 1024 * 1024,
  /** Largest total of attachments on one email; above this, files go as links. */
  maxAttachBytes: 10 * 1024 * 1024,
  maxFilesPerMessage: 20,
  maxBodyChars: 4e3,
  /** Per sender (people only; agents have their own budget). */
  perHour: 60,
  perDay: 300
};
var ALLOWED = {
  pdf: ["application/pdf"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  heic: ["image/heic", "image/heif"],
  gif: ["image/gif"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  csv: ["text/csv", "text/plain"],
  txt: ["text/plain"],
  mp4: ["video/mp4"],
  mov: ["video/quicktime"],
  zip: ["application/zip", "application/x-zip-compressed", "multipart/x-zip"]
};
var BLOCKED_EXT = /* @__PURE__ */ new Set([
  "exe",
  "msi",
  "bat",
  "cmd",
  "com",
  "scr",
  "pif",
  "ps1",
  "vbs",
  "vbe",
  "js",
  "jse",
  "wsf",
  "wsh",
  "hta",
  "jar",
  "apk",
  "app",
  "dmg",
  "pkg",
  "iso",
  "img",
  "lnk",
  "reg",
  "dll",
  "sys",
  "sh",
  "html",
  "htm",
  "svg",
  "xhtml",
  "docm",
  "xlsm",
  "pptm",
  "dotm",
  "xltm",
  "one",
  "rar",
  "7z"
]);
function extOf(name) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "";
}
function sniff(bytes) {
  const b = (i) => bytes[i] ?? -1;
  if (b(0) === 37 && b(1) === 80 && b(2) === 68 && b(3) === 70) return "pdf";
  if (b(0) === 255 && b(1) === 216 && b(2) === 255) return "jpg";
  if (b(0) === 137 && b(1) === 80 && b(2) === 78 && b(3) === 71) return "png";
  if (b(0) === 71 && b(1) === 73 && b(2) === 70) return "gif";
  if (b(0) === 82 && b(1) === 73 && b(2) === 70 && b(3) === 70 && b(8) === 87 && b(9) === 69) return "webp";
  if (b(4) === 102 && b(5) === 116 && b(6) === 121 && b(7) === 112) return "ftyp";
  if (b(0) === 80 && b(1) === 75 && b(2) === 3 && b(3) === 4) return "zip";
  if (b(0) === 208 && b(1) === 207 && b(2) === 17 && b(3) === 224) return "ole";
  if (b(0) === 77 && b(1) === 90) return "exe";
  if (b(0) === 127 && b(1) === 69 && b(2) === 76 && b(3) === 70) return "exe";
  return null;
}
var SNIFF_OK = {
  pdf: ["pdf"],
  jpg: ["jpg"],
  jpeg: ["jpg"],
  png: ["png"],
  gif: ["gif"],
  webp: ["webp"],
  heic: ["ftyp"],
  mp4: ["ftyp"],
  mov: ["ftyp"],
  docx: ["zip"],
  xlsx: ["zip"],
  zip: ["zip"],
  doc: ["ole"],
  xls: ["ole"]
};
function checkFile(f) {
  const name = f.name || "file";
  const ext = extOf(name);
  const parts = name.toLowerCase().split(".").slice(1);
  if (parts.some((p) => BLOCKED_EXT.has(p)) || BLOCKED_EXT.has(ext)) {
    return { ok: false, code: "blocked_type", reason: `${name}: this kind of file can't be sent (.${parts.find((p) => BLOCKED_EXT.has(p)) ?? ext}).` };
  }
  if (!ALLOWED[ext]) return { ok: false, code: "blocked_type", reason: `${name}: .${ext || "no extension"} files can't be sent. Send a PDF, photo, Word or Excel file instead.` };
  if (f.mimeType && !ALLOWED[ext].includes(f.mimeType.toLowerCase()) && f.mimeType !== "application/octet-stream") {
    return { ok: false, code: "type_mismatch", reason: `${name}: the file type (${f.mimeType}) doesn't match its name.` };
  }
  if ((f.sizeBytes ?? f.bytes?.byteLength ?? 0) > LIMITS.maxFileBytes) {
    return { ok: false, code: "too_large", reason: `${name}: larger than ${LIMITS.maxFileBytes / 1024 / 1024} MB.` };
  }
  if (ext === "zip" && !f.bytes?.byteLength) return { ok: false, code: "unscanned", reason: `${name}: the zip couldn't be opened to check what's inside.` };
  if (f.scan === "infected") return { ok: false, code: "malware", reason: `${name}: the malware scan found a threat. It has been held for review.` };
  if (f.bytes?.byteLength) {
    const kind = sniff(f.bytes);
    if (kind === "exe") return { ok: false, code: "blocked_type", reason: `${name}: this is a program, not a document.` };
    const expect = SNIFF_OK[ext];
    if (expect && kind && !expect.includes(kind)) return { ok: false, code: "type_mismatch", reason: `${name}: the contents don't match a .${ext} file.` };
    if (ext === "pdf") {
      const head = new TextDecoder("latin1").decode(f.bytes.subarray(0, Math.min(f.bytes.byteLength, 2e6)));
      if (/\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction\s*<<[^>]*\/S\s*\/JavaScript)/.test(head)) {
        return { ok: false, code: "active_content", reason: `${name}: the PDF contains scripts or embedded files. Re-save it as a plain PDF ("Print to PDF").` };
      }
    }
    if (ext === "zip") {
      const z = inspectZip(f.bytes);
      if (!z.ok) return { ok: false, code: z.code, reason: `${name}: ${z.reason}` };
    }
    if ((ext === "docx" || ext === "xlsx") && /vbaProject\.bin/.test(new TextDecoder("latin1").decode(f.bytes))) {
      return { ok: false, code: "active_content", reason: `${name}: the document contains macros. Save it without macros.` };
    }
  }
  return { ok: true, scan: f.scan === "clean" ? "clean" : "basic_checks_only" };
}
var ZIP_LIMITS = { maxEntries: 500, maxUnpackedBytes: 500 * 1024 * 1024, maxRatio: 100 };
function inspectZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.byteLength - 22; i >= Math.max(0, bytes.byteLength - 65557); i--) {
    if (dv.getUint32(i, true) === 101010256) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return { ok: false, code: "type_mismatch", reason: "the zip can't be read (damaged or not a zip)." };
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  if (count > ZIP_LIMITS.maxEntries) return { ok: false, code: "too_large", reason: `has more than ${ZIP_LIMITS.maxEntries} files.` };
  const names = [];
  let packed = 0;
  let unpacked = 0;
  for (let n = 0; n < count; n++) {
    if (p + 46 > bytes.byteLength || dv.getUint32(p, true) !== 33639248) return { ok: false, code: "type_mismatch", reason: "the zip's file list is damaged." };
    const flags = dv.getUint16(p + 8, true);
    const csize = dv.getUint32(p + 20, true);
    const usize = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const entry = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (flags & 1) return { ok: false, code: "active_content", reason: "is password-protected, so its contents can't be checked. Send it without a password." };
    if (entry.endsWith("/")) continue;
    if (entry.includes("..") || entry.startsWith("/")) return { ok: false, code: "active_content", reason: `contains an unsafe path (${entry}).` };
    const base = entry.split("/").pop() ?? entry;
    if (/^(__MACOSX|\._|\.DS_Store$|Thumbs\.db$)/.test(base) || entry.startsWith("__MACOSX/")) continue;
    const e = extOf(base);
    if (e === "zip" || e === "rar" || e === "7z") return { ok: false, code: "blocked_type", reason: `contains another archive (${base}). Put all files in one zip.` };
    const inner = checkFile({ name: base, sizeBytes: usize });
    if (!inner.ok) return { ok: false, code: inner.code, reason: `contains ${base}, which can't be sent (${inner.reason.replace(/^[^:]+: /, "")})` };
    packed += csize;
    unpacked += usize;
    names.push(entry);
  }
  if (unpacked > ZIP_LIMITS.maxUnpackedBytes || packed > 0 && unpacked / packed > ZIP_LIMITS.maxRatio && unpacked > 50 * 1024 * 1024) {
    return { ok: false, code: "too_large", reason: "unpacks to far more than its size (possible zip bomb)." };
  }
  return { ok: true, names };
}
function checkMessageBody(body, opts) {
  if (body.length > LIMITS.maxBodyChars) return { ok: false, reason: `Message is longer than ${LIMITS.maxBodyChars} characters.` };
  if (opts.senderIsStaff) return { ok: true };
  const allowed = opts.allowedDomains ?? ["easylinksolar.com.au", "gov.au", "cleanenergyregulator.gov.au"];
  const urls = body.match(/\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi) ?? [];
  for (const u of urls) {
    let host = "";
    try {
      host = new URL(u.startsWith("http") ? u : `https://${u}`).hostname.toLowerCase();
    } catch {
      return { ok: false, reason: "The message contains a link that can't be read." };
    }
    if (!allowed.some((d) => host === d || host.endsWith(`.${d}`))) {
      return { ok: false, reason: `Links to ${host} can't be sent through the portal. Attach the file instead, or ask EasyLink staff to send it.` };
    }
  }
  return { ok: true };
}
async function s3ScanStatus(bucket, key, s3 = new S3Client2({ region: process.env.AWS_REGION ?? "ap-southeast-2" })) {
  try {
    const r = await s3.send(new GetObjectTaggingCommand({ Bucket: bucket, Key: key }));
    const v = r.TagSet?.find((t) => t.Key === "GuardDutyMalwareScanStatus")?.Value;
    if (v === "NO_THREATS_FOUND") return "clean";
    if (v === "THREATS_FOUND") return "infected";
    return null;
  } catch {
    return null;
  }
}

// src/access/relations.ts
var Relations = class {
  constructor(deps) {
    this.deps = deps;
  }
  deps;
  get svc() {
    return { token: this.deps.serviceToken };
  }
  async assignments() {
    return await this.deps.store.listRecords("assignment");
  }
  /** The backend's assignment rows for a customer, in this file's shape. */
  async backendHistory(customerId) {
    const r = await this.deps.backend.call("GET", `/projects/${encodeURIComponent(customerId)}/assignments`, null, this.svc);
    return (r.data ?? []).map((a) => ({
      id: String(a.id),
      customerId: a.customerId ? String(a.customerId) : customerId,
      leadId: a.leadId ? String(a.leadId) : null,
      installerId: String(a.installerId),
      from: a.startedAt ? String(a.startedAt) : "",
      to: a.endedAt ? String(a.endedAt) : null,
      assignedBy: String(a.assignedById ?? ""),
      reason: String(a.reason ?? "")
    }));
  }
  /** Assignments for one customer or lead, newest first. */
  async history(ref2) {
    const ids = await this.linkedIds(ref2);
    if (backendHasProjects()) {
      const rows = [];
      for (const id of ids.customers) rows.push(...await this.backendHistory(id));
      return rows.filter((a, i) => rows.findIndex((x) => x.id === a.id) === i).sort((a, b) => b.from.localeCompare(a.from));
    }
    return (await this.assignments()).filter((a) => a.customerId && ids.customers.has(a.customerId) || a.leadId && ids.leads.has(a.leadId)).sort((a, b) => b.from.localeCompare(a.from));
  }
  /** Installers assigned now: from assignments, else from the backend's own fields. */
  async currentInstallers(ref2) {
    const h = await this.history(ref2);
    if (h.length) return Array.from(new Set(h.filter((a) => !a.to).map((a) => a.installerId)));
    const ids = await this.linkedIds(ref2);
    const out = /* @__PURE__ */ new Set();
    for (const id of ids.leads) {
      const l = await this.deps.backend.get("lead", id, this.svc);
      if (l.data?.assignedToId) out.add(String(l.data.assignedToId));
    }
    for (const id of ids.customers) {
      const c = await this.deps.backend.get("customer", id, this.svc);
      const v = c.data?.installerId ?? c.data?.assignedInstallerId;
      if (v) out.add(String(v));
    }
    return [...out];
  }
  /** A customer and its lead are one project: either id finds the other. */
  async linkedIds(ref2) {
    const customers = /* @__PURE__ */ new Set();
    const leads = /* @__PURE__ */ new Set();
    if (ref2.type === "customer") {
      customers.add(ref2.id);
      const c = await this.deps.backend.get("customer", ref2.id, this.svc);
      if (c.data?.leadId) leads.add(String(c.data.leadId));
    } else if (ref2.type === "lead") {
      leads.add(ref2.id);
      const l = await this.deps.backend.get("lead", ref2.id, this.svc);
      if (l.data?.customerId) customers.add(String(l.data.customerId));
    }
    return { customers, leads };
  }
  /** The customer record(s) a signed-in customer owns. */
  async customerIdsForUser(user) {
    if (user.customerId) return [String(user.customerId)];
    const email = String(user.email ?? "").toLowerCase();
    const r = await this.deps.backend.list("customer", email ? { search: email } : { search: String(user.id ?? "") }, this.svc);
    return (r.data ?? []).filter((c) => email && String(c.email ?? "").toLowerCase() === email || String(c.userId ?? "") === String(user.id ?? "")).map((c) => String(c.id));
  }
  /** Everything this person may see. */
  async scope(p, user = {}, token) {
    if (isStaff(p) || p.kind === "system" || p.kind === "agent") return { all: true };
    const customers = /* @__PURE__ */ new Set();
    const leads = /* @__PURE__ */ new Set();
    if (backendHasProjects() && token && (p.kind === "customer" || p.kind === "installer")) {
      const r = await this.deps.backend.call("GET", "/projects?limit=200", null, { token });
      for (const row of r.data ?? []) customers.add(String(row.customerId));
      for (const id of [...customers]) (await this.linkedIds({ type: "customer", id })).leads.forEach((x) => leads.add(x));
      return { all: false, customers, leads, self: p.id };
    }
    if (p.kind === "customer") {
      for (const id of await this.customerIdsForUser({ id: p.id, ...user })) {
        customers.add(id);
        const l = await this.linkedIds({ type: "customer", id });
        l.leads.forEach((x) => leads.add(x));
      }
    } else if (p.kind === "installer") {
      const mine = (await this.assignments()).filter((a) => a.installerId === p.id && !a.to);
      const reassigned = new Set((await this.assignments()).filter((a) => a.installerId === p.id && a.to).flatMap((a) => [a.customerId, a.leadId]).filter(Boolean));
      for (const a of mine) {
        if (a.customerId) customers.add(a.customerId);
        if (a.leadId) leads.add(a.leadId);
      }
      const r = await this.deps.backend.list("lead", { assignedToId: p.id }, this.svc);
      for (const l of r.data ?? []) {
        if (reassigned.has(String(l.id))) continue;
        leads.add(String(l.id));
        if (l.customerId) customers.add(String(l.customerId));
      }
      for (const leadId of [...leads]) {
        const l = await this.linkedIds({ type: "lead", id: leadId });
        l.customers.forEach((x) => customers.add(x));
      }
    }
    return { all: false, customers, leads, self: p.id };
  }
  static covers(scope, ref2, extra) {
    if (scope.all) return true;
    if (ref2.type === "customer") return scope.customers.has(ref2.id);
    if (ref2.type === "lead") return scope.leads.has(ref2.id);
    if (ref2.type === "user") return ref2.id === scope.self;
    const c = extra?.customerId != null ? String(extra.customerId) : null;
    const l = extra?.leadId != null ? String(extra.leadId) : null;
    return !!c && scope.customers.has(c) || !!l && scope.leads.has(l);
  }
  /** Record a new assignment (closing the current one) and keep the backend's lead in step. */
  async assign(args) {
    if (backendHasProjects()) {
      const customerId = args.customerId ?? [...(await this.linkedIds({ type: "lead", id: args.leadId })).customers][0];
      if (!customerId) throw new Error("This lead has no customer yet, so the installer can't be recorded on a project.");
      const before = await this.backendHistory(customerId);
      const r = await this.deps.backend.call(
        "POST",
        `/projects/${encodeURIComponent(customerId)}/assignments`,
        { installerId: args.installerId, ...args.leadId ? { leadId: args.leadId } : {}, mode: args.replace ? "REPLACE" : "ADD", reason: args.reason },
        this.svc
      );
      if (!r.ok || !r.data) throw new Error(r.message ?? `The backend refused the assignment (${r.status}).`);
      const a = r.data.assignment;
      const current2 = { id: String(a.id), customerId, leadId: a.leadId ? String(a.leadId) : args.leadId, installerId: args.installerId, installerName: args.installerName, from: String(a.startedAt ?? args.now), to: null, assignedBy: args.by, reason: args.reason };
      const closed2 = before.filter((b) => !b.to && (r.data.ended ?? []).includes(b.installerId)).map((b) => ({ ...b, to: args.now }));
      return { current: current2, closed: closed2 };
    }
    const prior = await this.history(args.customerId ? { type: "customer", id: args.customerId } : { type: "lead", id: args.leadId });
    const closed = [];
    if (args.replace) {
      for (const a of prior.filter((x) => !x.to && x.installerId !== args.installerId)) {
        const done = { ...a, to: args.now };
        await this.deps.store.putRecord("assignment", done);
        closed.push(done);
      }
    }
    if (!prior.length && args.replace) {
      for (const id of await this.currentInstallers(args.customerId ? { type: "customer", id: args.customerId } : { type: "lead", id: args.leadId })) {
        if (id === args.installerId) continue;
        const done = { id: `asg_${id}_${args.customerId ?? args.leadId}_before`, customerId: args.customerId, leadId: args.leadId, installerId: id, from: "", to: args.now, assignedBy: "backend", reason: "Assigned before history was kept" };
        await this.deps.store.putRecord("assignment", done);
        closed.push(done);
      }
    }
    const current = {
      id: `asg_${args.installerId}_${args.customerId ?? args.leadId}_${args.now}`,
      customerId: args.customerId,
      leadId: args.leadId,
      installerId: args.installerId,
      installerName: args.installerName,
      from: args.now,
      to: null,
      assignedBy: args.by,
      reason: args.reason
    };
    await this.deps.store.putRecord("assignment", current);
    return { current, closed };
  }
};

// src/actions/service.ts
var SITE = () => process.env.PUBLIC_SITE_URL ?? "";
function contactOf(type, d) {
  return {
    email: type === "partner" ? d.submissionEmail ?? d.email : d.email ?? d.customerEmail,
    phone: d.phone ?? d.mobile ?? d.customerPhone,
    name: String(d.name ?? ([d.firstName, d.lastName].filter(Boolean).join(" ") || d.customerName) ?? `${type} ${d.id}`)
  };
}
var SafetyError = class extends Error {
};
var ActionService = class {
  constructor(deps) {
    this.deps = deps;
  }
  deps;
  now() {
    return this.deps.now?.() ?? /* @__PURE__ */ new Date();
  }
  async run(req) {
    const actionId = newId("act_");
    const base = { action_id: actionId, events: [], autonomy_level: null };
    const allow = { decision: "allow", policies: [], reasons: [] };
    if (!isActionName(req.name)) {
      return { ...base, status: "invalid", policy: allow, message: `Unknown action ${req.name}` };
    }
    const name = req.name;
    const parsed = ACTIONS[name].input.safeParse(req.input);
    if (!parsed.success) {
      await this.log(actionId, req, name, "invalid", [], null);
      return { ...base, status: "invalid", policy: allow, errors: parsed.error.flatten() };
    }
    const input = parsed.data;
    if (req.idempotencyKey) {
      const prior = await this.deps.store.getIdempotent(`${req.principal.id}:${req.idempotencyKey}`);
      if (prior) return prior;
    }
    const usesService = ["agent", "system", "integration"].includes(req.principal.kind);
    const auth = usesService ? { token: this.deps.serviceToken } : req.auth;
    if (!auth?.token) {
      return { ...base, status: "denied", policy: { decision: "deny", policies: ["authenticated"], reasons: ["No credentials for the backend."] } };
    }
    const ctx = { req, name, input, auth, events: [], correlationId: req.correlationId ?? newId("cor_") };
    let policy;
    let subject = null;
    try {
      const pr = await this.buildPolicyRequest(ctx);
      subject = pr.resource?.ref ?? null;
      policy = evaluatePolicy(pr);
    } catch (e) {
      return { ...base, status: "error", policy: allow, message: e.message };
    }
    if (policy.decision === "deny") {
      await this.log(actionId, req, name, "denied", policy.policies, subject);
      return { ...base, status: "denied", policy };
    }
    let level = null;
    if (req.principal.kind === "agent" && req.agent && !req.approvedBy) {
      const [rules, control] = await Promise.all([this.deps.store.listAutonomyRules(req.agent.agentId), this.deps.store.getControl()]);
      const a = resolveAutonomy({
        agentId: req.agent.agentId,
        action: name,
        context: this.autonomyContext(ctx, subject),
        rules,
        control,
        requireHuman: policy.requireHuman
      });
      level = a.level;
      if (a.outcome === "blocked") {
        await this.log(actionId, req, name, "denied", [...policy.policies, "kill_switch"], subject);
        return { ...base, autonomy_level: level, status: "blocked", policy, message: a.why };
      }
      if (a.outcome === "shadow") {
        await this.log(actionId, req, name, "dry_run", policy.policies, subject);
        return { ...base, autonomy_level: level, status: "shadow", policy, message: a.why };
      }
      if (a.outcome === "propose") {
        const item = await this.propose(ctx, subject, a.why);
        await this.log(actionId, req, name, "proposed", policy.policies, subject);
        const evt = this.event(ctx, "ai.proposed", subject ?? { type: "inbox", id: item.id }, { inbox_id: item.id, action: name });
        await this.emit(ctx, [evt]);
        return { ...base, autonomy_level: level, status: "proposed", approval_id: item.id, policy, events: [evt.event_id] };
      }
    }
    if (req.principal.kind !== "agent" && policy.requireHuman && !req.approvedBy && !isStaff(req.principal) && !req.dryRun) {
      if (name === "send_message") {
        for (const f of input.files ?? []) {
          const fr = await this.deps.backend.get(f.type, f.id, auth);
          if (!fr.ok) return { ...base, status: "denied", policy: { decision: "deny", policies: ["sender_can_open_files"], reasons: [`You can't send ${f.type} ${f.id}.`] } };
        }
      }
      const item = await this.propose(ctx, subject, policy.reasons.join(" ") || "Needs a staff approval.");
      await this.log(actionId, req, name, "proposed", policy.policies, subject);
      const evt = this.event(ctx, "ai.proposed", subject ?? { type: "inbox", id: item.id }, { inbox_id: item.id, action: name, requested_by: req.principal.id });
      await this.emit(ctx, [evt]);
      return { ...base, status: "proposed", approval_id: item.id, policy, events: [evt.event_id], message: "Sent to EasyLink staff to approve. You'll be told when it goes." };
    }
    if (req.dryRun) return { ...base, autonomy_level: level, status: "dry_run", policy };
    try {
      const result = await this.execute(ctx);
      await this.log(actionId, req, name, "executed", policy.policies, subject);
      await this.emit(ctx, ctx.events);
      const out = {
        ...base,
        autonomy_level: level,
        status: "executed",
        result,
        policy,
        events: ctx.events.map((e) => e.event_id)
      };
      if (req.idempotencyKey) await this.deps.store.putIdempotent(`${req.principal.id}:${req.idempotencyKey}`, out);
      return out;
    } catch (e) {
      if (e instanceof SafetyError) {
        await this.log(actionId, req, name, "denied", [...policy.policies, "content_safety"], subject);
        return { ...base, autonomy_level: level, status: "denied", policy: { decision: "deny", policies: [...policy.policies, "content_safety"], reasons: [e.message] }, message: e.message };
      }
      await this.log(actionId, req, name, "error", policy.policies, subject);
      return { ...base, autonomy_level: level, status: "error", policy, message: e.message };
    }
  }
  /** A person approves (optionally after editing) an inbox proposal. */
  async approve(inboxId, approver, editedInput) {
    const item = await this.deps.store.getInbox(inboxId);
    if (!item || item.kind !== "proposal" || !item.action || !(item.agentId || item.requestedBy)) throw new Error("Not an open proposal");
    if (item.status !== "open") throw new Error(`Proposal is already ${item.status}`);
    const input = editedInput ?? item.input;
    const res = item.agentId ? await this.run({
      name: item.action,
      input,
      principal: { kind: "agent", id: item.agentId, roles: [item.agentId], on_behalf_of: approver.id },
      agent: { agentId: item.agentId, decisionId: item.decisionId ?? void 0 },
      approvedBy: approver.id
    }) : (
      // A person's request: runs as them; file access was checked when they asked.
      await this.run({ name: item.action, input, principal: item.requestedBy, auth: { token: this.deps.serviceToken }, approvedBy: approver.id })
    );
    if (res.status === "executed" && item.action === "send_message") {
      const to = input?.to?.record;
      if (to?.type === "partner") {
        await this.deps.backend.update("partner", to.id, { verified: true, verifiedBy: approver.id, verifiedAt: this.now().toISOString() }, { token: this.deps.serviceToken });
      }
    }
    const resolved = {
      ...item,
      status: res.status === "executed" ? "approved" : "open",
      resolvedBy: approver.id,
      resolvedAt: this.now().toISOString(),
      resolution: res.status === "executed" ? editedInput ? "approved_with_edits" : "approved_unchanged" : `failed: ${res.message ?? res.status}`,
      editedInput: editedInput ?? null
    };
    await this.deps.store.putInbox(resolved);
    return res;
  }
  async reject(inboxId, approver, reason) {
    const item = await this.deps.store.getInbox(inboxId);
    if (!item) throw new Error("Inbox item not found");
    const resolved = {
      ...item,
      status: "rejected",
      resolvedBy: approver.id,
      resolvedAt: this.now().toISOString(),
      resolution: reason
    };
    await this.deps.store.putInbox(resolved);
    const evt = makeEvent({
      type: "ai.corrected",
      source: "inbox",
      principal: approver,
      subject: item.subject ?? { type: "inbox", id: item.id },
      data: { inbox_id: item.id, agent: item.agentId, action: item.action, reason }
    });
    await this.deps.store.recordEvent(evt);
    await this.deps.bus.publish([evt]);
    return resolved;
  }
  // ---------- internals ----------
  async buildPolicyRequest(ctx) {
    const { name, input, req, auth } = ctx;
    const pr = { principal: req.principal, action: name, now: this.now() };
    const loadRef = async (ref2) => {
      if (!ref2 || !RECORD_TYPES[ref2.type]) return void 0;
      const r = await this.deps.backend.get(ref2.type, ref2.id, auth);
      return { ref: ref2, data: r.ok ? r.data : null };
    };
    switch (name) {
      case "get_record":
      case "list_files":
        pr.resource = await loadRef(input.record);
        break;
      case "update_record": {
        pr.resource = await loadRef(input.record);
        pr.fields = input.fields;
        pr.changedFields = Object.keys(pr.fields);
        break;
      }
      case "get_file_link":
        pr.resource = await loadRef(input.file);
        break;
      case "write_fact":
        pr.resource = await loadRef(input.about);
        break;
      case "send_message":
      case "place_call": {
        const to = input.to.record;
        const r = RECORD_TYPES[to.type] ? await this.deps.backend.get(to.type, to.id, { token: this.deps.serviceToken }) : null;
        const loaded = r?.ok && r.data ? { ref: to, data: r.data } : void 0;
        const d = loaded?.data ?? {};
        pr.recipient = {
          resolvedFromRecord: !!loaded?.data,
          type: to.type,
          consent: {
            sms: d.smsConsent,
            email: d.emailConsent,
            calls: d.callConsent,
            marketing: d.marketingConsent
          },
          optedOut: Boolean(d.optedOut),
          dncrRegistered: Boolean(d.dncrRegistered),
          address: d.address ?? null,
          verified: to.type === "partner" ? d.verified !== false : true,
          source: d.source?.url ?? null
        };
        pr.purpose = input.purpose;
        pr.channels = input.channel ?? (name === "place_call" ? ["call"] : []);
        break;
      }
      case "assign_installer": {
        const project = input.project;
        pr.resource = { ref: project, data: null };
        if (this.deps.relations && !isStaff(req.principal) && ["customer", "installer"].includes(req.principal.kind)) {
          const scope = await this.deps.relations.scope(req.principal, req.user ?? {});
          pr.related = Relations.covers(scope, project);
        }
        break;
      }
      case "start_workflow": {
        const ids = input.inputs.records;
        pr.count = Array.isArray(ids) ? ids.length : 1;
        break;
      }
    }
    return pr;
  }
  autonomyContext(ctx, subject) {
    const c = {};
    if (subject) c.record_type = subject.type;
    if (ctx.name === "send_message") {
      c.recipient_type = ctx.input.to.record.type;
      c.purpose = String(ctx.input.purpose);
    }
    if (ctx.name === "start_workflow") c.template = String(ctx.input.template);
    return c;
  }
  async propose(ctx, subject, why) {
    const now = this.now();
    const urgentMinutes = ctx.req.agent?.agentId === "concierge" ? 15 : 120;
    const item = {
      id: newId("inb_"),
      kind: "proposal",
      status: "open",
      title: describeAction(ctx.name, ctx.input),
      agentId: ctx.req.agent?.agentId ?? null,
      requestedBy: ctx.req.agent ? null : ctx.req.principal,
      subject,
      action: ctx.name,
      input: ctx.input,
      reasoning: ctx.req.agent?.reasoning ?? why,
      createdAt: now.toISOString(),
      dueAt: new Date(now.getTime() + urgentMinutes * 6e4).toISOString(),
      decisionId: ctx.req.agent?.decisionId ?? null,
      resolvedBy: null,
      resolvedAt: null,
      resolution: null,
      editedInput: null
    };
    await this.deps.store.putInbox(item);
    return item;
  }
  event(ctx, type, subject, data = {}, links = []) {
    return makeEvent({
      type,
      source: ctx.req.principal.kind === "agent" ? `agent:${ctx.req.principal.id}` : "action-api",
      principal: ctx.req.principal,
      subject,
      links,
      data,
      correlation_id: ctx.correlationId,
      causation_id: ctx.req.causationId ?? ctx.req.agent?.eventId ?? null
    });
  }
  async emit(_ctx, events) {
    if (!events.length) return;
    for (const e of events) await this.deps.store.recordEvent(e);
    await this.deps.bus.publish(events);
  }
  async log(id, req, action, outcome, policyIds, subject) {
    await this.deps.store.putActionLog({
      id,
      principal: req.principal,
      action,
      inputDigest: createHash("sha256").update(JSON.stringify(req.input ?? null)).digest("hex").slice(0, 16),
      outcome,
      policyIds,
      decisionId: req.agent?.decisionId ?? null,
      subject,
      createdAt: this.now().toISOString()
    });
  }
  async execute(ctx) {
    const { name, input, auth } = ctx;
    const b = this.deps.backend;
    switch (name) {
      case "search_records": {
        const type = input.type;
        const r = await b.list(type, input.filter, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        let rows = r.data ?? [];
        const def = RECORD_TYPES[type];
        const p = ctx.req.principal;
        if (p.kind === "installer" && !isStaff(p) && def?.ownerInstallerPath) {
          rows = rows.filter((row) => {
            const o = readPath(row, def.ownerInstallerPath);
            return o == null || String(o) === p.id;
          });
        }
        return rows.slice(0, input.limit);
      }
      case "get_record": {
        const ref2 = input.record;
        const r = await b.get(ref2.type, ref2.id, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        const [summary, facts] = await Promise.all([this.deps.store.getSummary(ref2), this.deps.store.listFacts(ref2)]);
        return { record: r.data, summary: summary ?? null, facts: facts.filter((f) => f.confirmed) };
      }
      case "search_memory": {
        const p = ctx.req.principal;
        const subjects = input.subjects;
        const allowed = isStaff(p) || p.kind === "agent" ? subjects.length ? subjects : "all" : subjects;
        return this.deps.store.searchChunks(input.query, allowed, input.limit);
      }
      case "create_record": {
        const type = input.type;
        const r = await b.create(type, input.fields, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        const id = String(r.data?.id ?? "");
        ctx.events.push(this.event(ctx, RECORD_TYPES[type].events.created, { type, id }, { fields: Object.keys(input.fields) }));
        return r.data;
      }
      case "update_record": {
        const ref2 = input.record;
        const r = await b.update(ref2.type, ref2.id, input.fields, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        ctx.events.push(this.event(ctx, RECORD_TYPES[ref2.type].events.updated, ref2, { fields: Object.keys(input.fields) }));
        return r.data;
      }
      case "link_records": {
        const from = input.from;
        const to = input.to;
        const r = await b.update(from.type, from.id, { [`${to.type}Id`]: to.id }, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        ctx.events.push(this.event(ctx, RECORD_TYPES[from.type].events.updated, from, { linked: to }, [to]));
        return r.data;
      }
      case "list_files": {
        const ref2 = input.record;
        const filterKey = ref2.type === "lead" ? "leadId" : "customerId";
        const r = await b.list("document", { [filterKey]: ref2.id }, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        let rows = r.data ?? [];
        const stored = new Map((await this.deps.store.getFileLabels(rows.map((f) => String(f.id)))).map((l) => [l.documentId, l]));
        rows = rows.map((f) => {
          const l = stored.get(String(f.id));
          if (!l) return f;
          return {
            ...f,
            ...f.aiLabels ? {} : { aiLabels: l.labels, extracted: l.extracted, reviewState: l.reviewState },
            routes: l.routes ?? [],
            issues: l.issues ?? [],
            deliveredTo: l.deliveredTo ?? []
          };
        });
        const want = input.slot ?? input.label;
        if (want) {
          rows = rows.filter((f) => {
            const labels = f.aiLabels ?? [];
            return f.slot === want || f.category === want || labels.some((l) => l.label === want && l.confidence >= 0.7);
          });
        }
        rows.sort((a, z) => String(z.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
        if (input.latest_only && want) rows = rows.slice(0, 3);
        return rows.map((f) => ({
          id: f.id,
          name: f.fileName ?? f.name ?? f.title,
          slot: f.slot ?? f.category ?? null,
          labels: f.aiLabels ?? [],
          reviewState: f.reviewState ?? (f.aiLabels ? "auto" : "pending"),
          url: f.url ?? null,
          mimeType: f.mimeType ?? null,
          routes: f.routes ?? [],
          issues: f.issues ?? [],
          deliveredTo: (f.deliveredTo ?? []).map((d) => ({ role: d.role, at: d.at, channels: d.channels })),
          createdAt: f.createdAt ?? null
        }));
      }
      case "get_file_link": {
        const ref2 = input.file;
        const r = await b.get(ref2.type, ref2.id, auth);
        if (!r.ok || !r.data) throw new Error("File not found");
        const f = r.data;
        const url = f.s3Key ? await this.deps.files.signedUrl(String(f.s3Key), input.expires_in_hours * 3600) : absoluteUrl(String(f.url ?? f.fileUrl ?? ""), SITE());
        if (!url) throw new Error("File has no stored location");
        ctx.events.push(this.event(ctx, "file.shared", ref2, { expires_in_hours: input.expires_in_hours }));
        return { url, expires_in_hours: input.expires_in_hours };
      }
      case "send_message":
        return this.sendMessage(ctx);
      case "place_call": {
        const to = input.to.record;
        const rec = await b.get(to.type, to.id, auth);
        const phone = String(rec.data?.phone ?? rec.data?.customerPhone ?? "");
        if (!phone) throw new Error("Recipient has no phone number on file");
        const r = await b.call("POST", "/calls/dial", { to: phone, reason: input.reason }, { token: this.deps.serviceToken });
        if (!r.ok) throw new Error(r.message ?? "Dial failed");
        ctx.events.push(this.event(ctx, "call.started", to, { direction: "outbound", purpose: input.purpose }));
        return r.data;
      }
      case "schedule":
        return this.schedule(ctx);
      case "create_task": {
        const about = input.about;
        const fields = {
          title: input.title,
          description: input.details,
          dueDate: input.due,
          assignedToId: input.assignee_id,
          ...about ? { [`${about.type}Id`]: about.id } : {}
        };
        const r = await b.create("task", fields, auth);
        if (!r.ok) throw new Error(r.message ?? `Backend returned ${r.status}`);
        ctx.events.push(this.event(ctx, "task.created", { type: "task", id: String(r.data?.id ?? "") }, {}, about ? [about] : []));
        return r.data;
      }
      case "start_workflow":
        return this.startWorkflow(ctx);
      case "assign_installer": {
        if (!this.deps.relations) throw new Error("Assignments are not configured.");
        const project = input.project;
        if (!["customer", "lead"].includes(project.type)) throw new Error("A project is a customer or a lead.");
        const svc = { token: this.deps.serviceToken };
        const inst = await this.deps.backend.get("user", input.installer.id, svc);
        if (!inst.ok || !inst.data) throw new Error("Installer not found");
        if (String(inst.data.role ?? "").toUpperCase() !== "INSTALLER") throw new Error("That user isn't an installer.");
        const installerName = [inst.data.firstName, inst.data.lastName].filter(Boolean).join(" ") || String(inst.data.name ?? inst.data.id);
        const ids = await this.deps.relations.linkedIds(project);
        const customerId = [...ids.customers][0] ?? null;
        const leadId = [...ids.leads][0] ?? null;
        const before = await this.deps.relations.currentInstallers(project);
        const { current, closed } = await this.deps.relations.assign({
          customerId,
          leadId,
          installerId: String(inst.data.id),
          installerName,
          by: ctx.req.approvedBy ?? ctx.req.principal.id,
          reason: String(input.reason),
          replace: input.mode === "replace",
          now: this.now().toISOString()
        });
        if (leadId) {
          const r = await this.deps.backend.call("POST", `/leads/${encodeURIComponent(leadId)}/assign`, { installerId: current.installerId, assignedToId: current.installerId }, svc);
          if (!r.ok) await this.deps.backend.update("lead", leadId, { assignedToId: current.installerId }, svc);
        }
        const links = [{ type: "user", id: current.installerId }];
        if (customerId) links.push({ type: "customer", id: customerId });
        if (leadId) links.push({ type: "lead", id: leadId });
        ctx.events.push(this.event(ctx, "installer.assigned", project, { installer_id: current.installerId, installer_name: installerName, reason: input.reason, mode: input.mode, previous: before }, links));
        for (const c of closed) {
          ctx.events.push(this.event(ctx, "installer.unassigned", project, { installer_id: c.installerId, installer_name: c.installerName ?? null }, [{ type: "user", id: c.installerId }, ...links.slice(1)]));
        }
        return { assignment: current, previous: closed.map((c) => c.installerId), installerName };
      }
      case "draft_invoice": {
        if (!this.deps.jobs) throw new Error("Jobs are not configured.");
        const r = await this.deps.jobs().act(String(input.job), "create_invoice", { kind: input.kind, lines: input.lines, notes: input.notes, dueDays: input.dueDays, via: "ai" }, ctx.req.principal);
        return { invoice_id: r.invoice.id, number: r.invoice.number, total: r.invoice.totals.total, status: "draft \u2014 the installer checks it and presses Send" };
      }
      case "find_contact": {
        if (!this.deps.contacts) throw new Error("Contact search is not configured (SEARCH_API_KEY).");
        const r = await this.deps.contacts.find(String(input.organisation), String(input.kind), String(input.purpose ?? ""));
        const about = input.about;
        if (!r.found) {
          const item = {
            id: newId("inb_"),
            kind: "question",
            status: "open",
            title: `Who at ${input.organisation} should receive this? ${r.reason}`,
            agentId: ctx.req.agent?.agentId ?? null,
            subject: about ?? null,
            action: null,
            input: { organisation: input.organisation, kind: input.kind, candidates: r.candidates },
            reasoning: r.candidates.length ? `Addresses seen: ${r.candidates.map((c) => c.email).join(", ")}` : r.reason,
            createdAt: this.now().toISOString(),
            dueAt: new Date(this.now().getTime() + 4 * 36e5).toISOString(),
            decisionId: ctx.req.agent?.decisionId ?? null,
            resolvedBy: null,
            resolvedAt: null,
            resolution: null,
            editedInput: null,
            requestedBy: ctx.req.agent ? null : ctx.req.principal
          };
          await this.deps.store.putInbox(item);
          ctx.events.push(this.event(ctx, "ai.escalated", about ?? { type: "inbox", id: item.id }, { inbox_id: item.id, reason: r.reason }));
          return { partner: null, reason: r.reason, inbox_id: item.id };
        }
        const f = r.found;
        if (!f.verified && f.source) ctx.events.push(this.event(ctx, "partner.created", f.partner, { found_by: "ai", source: f.source.url, domain: f.domain }));
        return { partner: f.partner, name: f.name, email: f.email, verified: f.verified, source: f.source?.url ?? null, confidence: f.confidence };
      }
      case "write_fact": {
        const about = input.about;
        const confidence = input.confidence;
        const fact = {
          id: newId("fct_"),
          subject: about,
          statement: input.statement,
          confidence,
          confirmed: confidence >= 0.8 || ctx.req.principal.kind !== "agent",
          writtenBy: ctx.req.principal.id,
          sourceEventId: ctx.req.agent?.eventId ?? null,
          createdAt: this.now().toISOString()
        };
        await this.deps.store.putFact(fact);
        if (!fact.confirmed) {
          await this.deps.store.putInbox({
            id: newId("inb_"),
            kind: "review",
            status: "open",
            title: `Confirm fact: "${fact.statement}"`,
            agentId: ctx.req.agent?.agentId ?? null,
            subject: about,
            action: null,
            input: { fact_id: fact.id },
            reasoning: `Written with confidence ${confidence.toFixed(2)}.`,
            createdAt: fact.createdAt,
            dueAt: new Date(this.now().getTime() + 864e5).toISOString(),
            decisionId: ctx.req.agent?.decisionId ?? null,
            resolvedBy: null,
            resolvedAt: null,
            resolution: null,
            editedInput: null
          });
        }
        ctx.events.push(this.event(ctx, "fact.written", about, { fact_id: fact.id, confirmed: fact.confirmed }));
        return fact;
      }
      case "request_approval": {
        const item = {
          id: newId("inb_"),
          kind: "question",
          status: "open",
          title: input.question,
          agentId: ctx.req.agent?.agentId ?? null,
          subject: input.about ?? null,
          action: null,
          input: null,
          reasoning: ctx.req.agent?.reasoning ?? "",
          createdAt: this.now().toISOString(),
          dueAt: new Date(this.now().getTime() + 4 * 36e5).toISOString(),
          decisionId: ctx.req.agent?.decisionId ?? null,
          resolvedBy: null,
          resolvedAt: null,
          resolution: null,
          editedInput: null
        };
        await this.deps.store.putInbox(item);
        ctx.events.push(this.event(ctx, "ai.escalated", item.subject ?? { type: "inbox", id: item.id }, { inbox_id: item.id }));
        return { inbox_id: item.id };
      }
    }
  }
  async sendMessage(ctx) {
    const { input, auth, req } = ctx;
    const p = req.principal;
    const to = input.to.record;
    const rec = await this.deps.backend.get(to.type, to.id, { token: this.deps.serviceToken });
    if (!rec.ok || !rec.data) throw new Error("Recipient not found");
    const contact = contactOf(to.type, rec.data);
    const channels = input.channel;
    const files = input.files;
    const people = !["agent", "system", "integration"].includes(p.kind);
    if (people) {
      const body = checkMessageBody(String(input.body), { senderIsStaff: isStaff(p) });
      if (!body.ok) throw new SafetyError(body.reason);
      await this.rateLimit(p.id);
    }
    if (files.length > LIMITS.maxFilesPerMessage) throw new SafetyError(`At most ${LIMITS.maxFilesPerMessage} files per message.`);
    const copyId = newId("msg_");
    const wantAttach = Boolean(input.attach) || Boolean(rec.data.attach);
    const prepared = [];
    for (const f of files) {
      const fr = await this.deps.backend.get(f.type, f.id, auth);
      if (!fr.ok || !fr.data) throw new SafetyError(`You can't send ${f.type} ${f.id}: it isn't on a record you can open.`);
      const doc = fr.data;
      const raw2 = this.deps.bytes ? await this.deps.bytes.raw(doc, LIMITS.maxFileBytes).catch(() => null) : null;
      const scan = this.deps.scan ? await this.deps.scan(doc) : doc.s3Key && process.env.FILES_BUCKET ? await s3ScanStatus(process.env.FILES_BUCKET, String(doc.s3Key)) : null;
      const verdict = checkFile({ name: String(doc.fileName ?? doc.name ?? f.id), sizeBytes: Number(doc.sizeBytes ?? raw2?.bytes.byteLength ?? 0), mimeType: doc.mimeType, bytes: raw2?.bytes, scan });
      if (!verdict.ok) {
        ctx.events.push(this.event(ctx, "document.issue_found", f, { code: verdict.code, reason: verdict.reason }));
        await this.emit(ctx, ctx.events.splice(0));
        throw new SafetyError(verdict.reason);
      }
      const direct = doc.s3Key ? await this.deps.files.signedUrl(String(doc.s3Key), 7 * 86400) : absoluteUrl(String(doc.url ?? ""), SITE());
      const url = direct ? await this.trackedLink(f, String(doc.fileName ?? f.id), to, copyId, direct) : "";
      prepared.push({ ref: f, name: String(doc.fileName ?? f.id), url, raw: raw2, customerId: doc.customerId, leadId: doc.leadId });
    }
    const attachBytes = prepared.reduce((s2, x) => s2 + (x.raw?.bytes.byteLength ?? Infinity), 0);
    const attach = wantAttach && prepared.length > 0 && attachBytes <= LIMITS.maxAttachBytes;
    const links = attach ? [] : prepared.map((x) => x.url).filter(Boolean);
    const records = [to];
    if (p.kind !== "agent" && p.kind !== "system" && p.kind !== "integration") records.push({ type: p.kind === "customer" ? "user" : "user", id: p.id });
    for (const f of prepared) {
      records.push(f.ref);
      if (f.customerId) records.push({ type: "customer", id: String(f.customerId) });
      if (f.leadId) records.push({ type: "lead", id: String(f.leadId) });
    }
    if (input.about) records.push(input.about);
    if (to.type === "customer" && rec.data.leadId) records.push({ type: "lead", id: String(rec.data.leadId) });
    if (to.type === "lead" && rec.data.customerId) records.push({ type: "customer", id: String(rec.data.customerId) });
    const uniq = records.filter((r, i) => records.findIndex((x) => x.type === r.type && x.id === r.id) === i);
    const role = String(input.role ?? (to.type === "partner" ? String(rec.data.kind ?? "partner") : to.type));
    const fileList = prepared.map((x) => ({ id: x.ref.id, name: x.name }));
    const common = { message_copy_id: copyId, to_name: contact.name, role, subject: input.subject ?? null, files: fileList, records: uniq, attached: false };
    const sent = {};
    if (channels.includes("email")) {
      if (!contact.email) throw new Error(`${contact.name} has no email on file`);
      sent.email = (await this.deps.messaging.sendEmail({
        to: contact.email,
        subject: input.subject ?? "EasyLink Solar",
        body: input.body,
        links,
        attachments: attach ? prepared.map((x) => ({ fileName: x.raw.fileName || x.name, contentType: x.raw.contentType, bytes: x.raw.bytes })) : void 0
      })).id;
      ctx.events.push(this.event(ctx, "email.sent", to, { ...common, message_id: sent.email, attached: attach }));
    }
    if (channels.includes("sms")) {
      if (!contact.phone) throw new Error(`${contact.name} has no mobile on file`);
      const body = [String(input.body).slice(0, 320), ...prepared.map((x) => x.url).filter(Boolean)].join("\n");
      sent.sms = (await this.deps.messaging.sendSms({ to: contact.phone, body })).id;
      ctx.events.push(this.event(ctx, "sms.sent", to, { ...common, message_id: sent.sms }));
    }
    if (channels.includes("portal")) {
      ctx.events.push(this.event(ctx, "message.sent", to, { ...common, channel: "portal" }));
    }
    const at = this.now().toISOString();
    const contract = /* @__PURE__ */ new Set(["proof_of_completion", "electrical_safety_certificate", "compliance_certificate", "signed_contract", "stc_assignment_form", "warranty", "commissioning_sheet"]);
    const profiles = await this.deps.store.getFileLabels(prepared.map((x) => x.ref.id));
    const copy = {
      id: copyId,
      at,
      from: { kind: p.kind, id: p.id },
      to: { record: to, name: contact.name, role, address: [channels.includes("email") ? contact.email : null, channels.includes("sms") ? contact.phone : null].filter(Boolean).join(", ") },
      channels,
      subject: String(input.subject ?? ""),
      body: String(input.body),
      files: fileList,
      attached: attach,
      status: "sent",
      statusAt: at,
      providerIds: sent,
      records: uniq,
      retention: profiles.some((x) => contract.has(x.labels[0]?.label ?? "")) ? "contract_7y" : "sales_12m"
    };
    await this.deps.store.putRecord("message", copy);
    for (const [, pid] of Object.entries(sent)) if (pid) await this.deps.store.putRecord("message_by_provider", { id: pid, copyId });
    for (const f of prepared) {
      const [cur] = await this.deps.store.getFileLabels([f.ref.id]);
      const base = cur ?? { documentId: f.ref.id, labels: [], extracted: {}, reviewState: "auto", description: "", updatedAt: at };
      const delivery = { recipient: to, role, channels, at, by: p.id, attached: attach };
      await this.deps.store.putFileLabels({ ...base, updatedAt: at, deliveredTo: [...base.deliveredTo ?? [], delivery] });
      ctx.events.push(this.event(ctx, "document.delivered", f.ref, { to, role, channels, attached: attach, message_copy_id: copyId }, [to]));
      ctx.events.push(this.event(ctx, "file.shared", f.ref, { to }));
    }
    return { sent, message_id: copyId, to: { type: to.type, name: contact.name }, files: prepared.length, attached: attach, links: links.length };
  }
  /**
   * A link that goes through the platform (PUBLIC_API_URL/f/<token>) so opening the
   * file is recorded, then redirects to the stored file. Expires with the file link.
   */
  async trackedLink(file, fileName, to, copyId, direct) {
    const api = process.env.PUBLIC_API_URL;
    if (!api) return direct;
    const token = randomBytes(18).toString("base64url");
    await this.deps.store.putRecord("share_link", { id: token, file, fileName, to, copyId, direct, expiresAt: new Date(this.now().getTime() + 7 * 864e5).toISOString() });
    return `${api.replace(/\/+$/, "")}/f/${token}`;
  }
  /** Per-person sending limits (people only; agents have their own budget). */
  async rateLimit(senderId) {
    const now = this.now();
    const hourKey = `${senderId}:${now.toISOString().slice(0, 13)}`;
    const dayKey = `${senderId}:${now.toISOString().slice(0, 10)}`;
    const [h, d] = await Promise.all([this.deps.store.getRecord("send_count", hourKey), this.deps.store.getRecord("send_count", dayKey)]);
    const hn = Number(h?.n ?? 0) + 1;
    const dn = Number(d?.n ?? 0) + 1;
    if (hn > LIMITS.perHour || dn > LIMITS.perDay) throw new SafetyError("Sending limit reached. Try again later or ask EasyLink staff.");
    await Promise.all([this.deps.store.putRecord("send_count", { id: hourKey, n: hn }), this.deps.store.putRecord("send_count", { id: dayKey, n: dn })]);
  }
  async schedule(ctx) {
    const { input, auth } = ctx;
    const b = this.deps.backend;
    const mode = input.mode;
    const fields = input.fields;
    const appt = input.appointment;
    if (mode === "availability") {
      const r2 = await b.list("appointment", fields, auth);
      return { booked: r2.data ?? [] };
    }
    if (mode === "book") {
      const r2 = await b.create("appointment", fields, auth);
      if (!r2.ok) throw new Error(r2.message ?? "Booking failed");
      ctx.events.push(this.event(ctx, "appointment.booked", { type: "appointment", id: String(r2.data?.id ?? "") }));
      return r2.data;
    }
    if (!appt) throw new Error("appointment is required to move or cancel");
    const patch = mode === "cancel" ? { ...fields, status: "CANCELLED" } : fields;
    const r = await b.update("appointment", appt.id, patch, auth);
    if (!r.ok) throw new Error(r.message ?? "Update failed");
    ctx.events.push(this.event(ctx, mode === "cancel" ? "appointment.cancelled" : "appointment.moved", appt));
    return r.data;
  }
  async startWorkflow(ctx) {
    const template = WORKFLOWS[ctx.input.template];
    if (!template) throw new Error(`Unknown workflow ${ctx.input.template}`);
    if (template.family && (await this.deps.store.getControl()).familiesOff[template.family]) {
      throw new Error(`The "${template.family}" kill switch is off.`);
    }
    const results = [];
    const outputs = /* @__PURE__ */ new Map();
    const resolve = (v) => {
      if (Array.isArray(v)) return v.map(resolve);
      if (v && typeof v === "object") {
        const o = v;
        if (typeof o.$step === "string") return readPath(outputs.get(o.$step), String(o.path ?? "")) ?? null;
        return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, resolve(x)]));
      }
      return v;
    };
    const hasNull = (v) => v === null || (Array.isArray(v) ? v.some(hasNull) : !!v && typeof v === "object" && Object.values(v).some(hasNull));
    const svc = { token: this.deps.serviceToken };
    const wctx = {
      get: async (r) => {
        const x = RECORD_TYPES[r.type] ? await this.deps.backend.get(r.type, r.id, svc) : null;
        return x?.ok ? x.data : null;
      },
      list: async (type, filter) => {
        const x = await this.deps.backend.list(type, filter, svc);
        return x.ok ? x.data ?? [] : [];
      },
      fileProfiles: (ids) => this.deps.store.getFileLabels(ids)
    };
    for (const step of await template.steps(ctx.input.inputs, wctx)) {
      const input = resolve(step.input);
      if (JSON.stringify(step.input).includes('"$step"') && hasNull(input)) {
        results.push({ step: step.id, status: "invalid", message: "Skipped: an earlier step found nothing to use." });
        continue;
      }
      const r = await this.run({
        name: step.action,
        input,
        principal: ctx.req.principal,
        auth: ctx.req.auth,
        correlationId: ctx.correlationId,
        causationId: ctx.req.causationId,
        agent: ctx.req.agent,
        approvedBy: ctx.req.approvedBy
      });
      results.push({ step: step.id, status: r.status, message: r.message });
      outputs.set(step.id, r.result);
      if (!["executed", "proposed"].includes(r.status) && !step.optional) break;
    }
    return { template: template.id, results };
  }
};
function describeAction(name, input) {
  switch (name) {
    case "send_message": {
      const to = input.to.record;
      return `Send ${input.channel.join(" + ")} to ${to.type} ${to.id}`;
    }
    case "place_call":
      return `Call ${input.to.record.type} ${input.to.record.id}`;
    case "update_record": {
      const r = input.record;
      return `Update ${r.type} ${r.id}: ${Object.keys(input.fields).join(", ")}`;
    }
    case "create_record":
      return `Create ${input.type}`;
    case "schedule":
      return `${String(input.mode)[0].toUpperCase()}${String(input.mode).slice(1)} appointment`;
    case "start_workflow":
      return `Run workflow "${input.template}"`;
    case "create_task":
      return `Create task: ${input.title}`;
    default:
      return name.replace(/_/g, " ");
  }
}

// src/actions/ports.ts
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from "@aws-sdk/client-pinpoint-sms-voice-v2";
import { PutObjectCommand, S3Client as S3Client3, GetObjectCommand as GetObjectCommand2 } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
var AwsMessaging = class {
  constructor(from = process.env.EMAIL_FROM ?? "EasyLink Solar <hello@easylinksolar.com.au>", smsOriginator = process.env.SMS_ORIGINATOR ?? "EasyLink", ses = new SESv2Client({ region: process.env.AWS_REGION ?? "ap-southeast-2" }), sms = new PinpointSMSVoiceV2Client({ region: process.env.AWS_REGION ?? "ap-southeast-2" })) {
    this.from = from;
    this.smsOriginator = smsOriginator;
    this.ses = ses;
    this.sms = sms;
  }
  from;
  smsOriginator;
  ses;
  sms;
  async sendEmail(m) {
    const text = [m.body, ...m.links?.length ? ["", ...m.links] : []].join("\n");
    const r = await this.ses.send(
      new SendEmailCommand({
        FromEmailAddress: this.from,
        Destination: { ToAddresses: [m.to] },
        ReplyToAddresses: m.replyTo ? [m.replyTo] : void 0,
        // Delivery, bounce and open receipts come back through this configuration set.
        ConfigurationSetName: process.env.SES_CONFIGURATION_SET || void 0,
        Content: {
          Simple: {
            Subject: { Data: m.subject },
            Body: { Text: { Data: text } },
            Attachments: m.attachments?.map((a) => ({ FileName: a.fileName, ContentType: a.contentType, RawContent: a.bytes, ContentDisposition: "ATTACHMENT" }))
          }
        }
      })
    );
    return { id: r.MessageId ?? "" };
  }
  async sendSms(m) {
    const r = await this.sms.send(
      new SendTextMessageCommand({
        DestinationPhoneNumber: m.to,
        MessageBody: m.body,
        OriginationIdentity: this.smsOriginator,
        MessageType: "TRANSACTIONAL",
        ConfigurationSetName: process.env.SMS_CONFIGURATION_SET || void 0
      })
    );
    return { id: r.MessageId ?? "" };
  }
};
var FakeMessaging = class {
  sent = [];
  async sendEmail(m) {
    this.sent.push({ channel: "email", ...m });
    return { id: `email_${this.sent.length}` };
  }
  async sendSms(m) {
    this.sent.push({ channel: "sms", ...m });
    return { id: `sms_${this.sent.length}` };
  }
};
var S3FileLinks = class {
  constructor(bucket = process.env.FILES_BUCKET ?? "", s3 = new S3Client3({ region: process.env.AWS_REGION ?? "ap-southeast-2" })) {
    this.bucket = bucket;
    this.s3 = s3;
  }
  bucket;
  s3;
  signedUrl(key, expiresInSeconds) {
    return getSignedUrl(this.s3, new GetObjectCommand2({ Bucket: this.bucket, Key: key }), { expiresIn: Math.min(expiresInSeconds, 604800) });
  }
  async put(key, bytes, contentType) {
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: contentType, ServerSideEncryption: "aws:kms" }));
  }
};
var FakeFileLinks = class {
  stored = /* @__PURE__ */ new Map();
  async signedUrl(key, expiresInSeconds) {
    return `https://files.example.test/${key}?expires=${expiresInSeconds}`;
  }
  async put(key, bytes, contentType) {
    this.stored.set(key, { bytes, contentType });
  }
};

// src/ai/runtime.ts
import { createHash as createHash2 } from "node:crypto";

// src/core/catalogue.ts
var EVENT_CATALOGUE = {
  page: ["viewed"],
  form: ["submitted", "abandoned"],
  field: ["hesitated"],
  cta: ["clicked"],
  price: ["viewed"],
  help: ["sought"],
  ui: ["interacted", "error_seen"],
  widget: ["opened", "message_sent"],
  search: ["performed"],
  design: ["requested", "generated", "saved", "shared", "abandoned", "option_viewed", "updated"],
  cart: ["updated", "abandoned"],
  order: ["placed", "paid", "refunded"],
  payment: ["failed", "succeeded"],
  customer: ["created", "updated", "imported", "deleted"],
  lead: ["created", "updated", "qualified", "lost", "assigned", "converted", "deleted"],
  consent: ["changed"],
  quote: ["drafted", "sent", "viewed", "accepted", "expired"],
  cooling_off: ["started", "ended"],
  job: ["created", "scheduled", "rescheduled", "started", "completed", "issue_raised", "progressed"],
  stc: ["submitted"],
  installer: ["assigned", "unassigned", "change_requested", "accepted", "declined", "document_expiring"],
  file: ["uploaded", "classified", "text_extracted", "shared", "deleted", "downloaded"],
  call: ["started", "ended", "transcribed", "summarised", "escalated"],
  voicemail: ["received"],
  email: ["received", "sent"],
  sms: ["received", "sent"],
  message: ["sent", "delivered", "opened", "bounced", "failed", "opted_out"],
  appointment: ["booked", "moved", "cancelled", "missed"],
  task: ["created", "updated", "completed"],
  note: ["created", "updated"],
  system: ["output_dropped", "fault_reported"],
  clean: ["due", "completed"],
  drone: ["flight_logged"],
  invoice: ["created", "overdue", "paid"],
  commission: ["earned"],
  ai: ["triaged", "proposed", "acted", "escalated", "corrected", "autonomy_changed", "paused", "resumed"],
  screen: ["requested", "generated", "rejected_binding", "pinned", "shared", "promoted"],
  fact: ["written", "deleted"],
  timer: ["fired"],
  record: ["purged"],
  partner: ["created", "updated"],
  document: ["delivered", "issue_found"],
  assist: ["requested", "answered", "confirmed", "cancelled"],
  integration: ["error"]
};
function isRegisteredType(type) {
  const [entity, verb] = type.split(".");
  if (!entity || !verb) return false;
  return EVENT_CATALOGUE[entity]?.includes(verb) ?? false;
}

// src/ai/runtime.ts
init_envelope();

// src/ai/agents.ts
var READS = ["search_records", "get_record", "search_memory", "list_files"];
var ALWAYS = ["write_fact", "create_task", "request_approval"];
var AGENTS = {
  concierge: {
    id: "concierge",
    name: "Concierge",
    triggers: ["call.transcribed", "voicemail.received", "sms.received", "email.received", "widget.message_sent"],
    actions: [...READS, ...ALWAYS, "get_file_link", "send_message", "schedule", "start_workflow"],
    recordTypes: ["lead", "customer", "document", "appointment", "user", "task", "note"],
    tier: "smart",
    maxSteps: 8,
    brief: "You answer the EasyLink Solar phone line, SMS, email and website chat. Work out who is contacting us and what they need, then do it or hand it to the right person. If an installer asks for photos or documents on a customer file, find them with list_files (photos are already labelled by AI, e.g. meter, switchboard) and send them back to the installer's own contact details on file."
  },
  design: {
    id: "design",
    name: "Design",
    triggers: ["design.requested", "design.abandoned", "design.saved", "file.classified"],
    actions: [...READS, ...ALWAYS, "update_record", "send_message"],
    recordTypes: ["lead", "customer", "design", "product", "document"],
    tier: "smart",
    maxSteps: 6,
    brief: "You look after solar system designs: check a design against the roof and bill photos, note gaps, and nudge customers who abandoned a design."
  },
  sales: {
    id: "sales",
    name: "Sales",
    triggers: ["lead.created", "lead.updated", "quote.viewed", "quote.expired", "form.submitted", "price.viewed"],
    actions: [...READS, ...ALWAYS, "update_record", "send_message", "place_call", "schedule", "start_workflow"],
    recordTypes: ["lead", "customer", "design", "appointment", "task", "note"],
    tier: "smart",
    maxSteps: 6,
    brief: "You qualify and follow up leads. Respond to new leads quickly, keep lead status and notes current, and book consultations. Never mark a lead WON or LOST yourself."
  },
  matching: {
    id: "matching",
    name: "Matching",
    triggers: ["lead.qualified", "installer.declined"],
    actions: [...READS, ...ALWAYS, "update_record"],
    recordTypes: ["lead", "user", "appointment"],
    tier: "fast",
    maxSteps: 4,
    brief: "You match qualified leads to installers by area, availability and accreditation."
  },
  delivery: {
    id: "delivery",
    name: "Delivery",
    triggers: ["job.*", "appointment.*", "file.uploaded", "file.classified", "installer.document_expiring"],
    actions: [...READS, ...ALWAYS, "update_record", "send_message", "schedule", "start_workflow"],
    recordTypes: ["customer", "lead", "appointment", "task", "document", "user"],
    tier: "fast",
    maxSteps: 6,
    brief: "You keep installations on track: confirm bookings, chase missing photos and documents (use the request_missing_photos workflow), and flag jobs at risk."
  },
  care: {
    id: "care",
    name: "Care",
    triggers: ["system.output_dropped", "system.fault_reported", "clean.due"],
    actions: [...READS, ...ALWAYS, "send_message", "schedule"],
    recordTypes: ["customer", "appointment", "document"],
    tier: "fast",
    maxSteps: 5,
    brief: "You look after installed systems: explain drops in output, book cleans and service visits."
  },
  drone: {
    id: "drone",
    name: "Drone",
    triggers: ["drone.flight_logged"],
    actions: [...READS, ...ALWAYS],
    recordTypes: ["customer", "document"],
    tier: "fast",
    maxSteps: 3,
    brief: "You review drone inspection results and raise issues for the care team."
  },
  vpp: {
    id: "vpp",
    name: "VPP",
    triggers: [],
    actions: [...READS, ...ALWAYS],
    recordTypes: ["customer"],
    tier: "fast",
    maxSteps: 3,
    brief: "You manage virtual power plant enrolment and explain VPP events to customers."
  },
  finance: {
    id: "finance",
    name: "Finance",
    triggers: ["payment.failed", "invoice.overdue", "order.refunded", "stc.submitted"],
    actions: [...READS, ...ALWAYS, "send_message"],
    recordTypes: ["customer", "lead"],
    tier: "fast",
    maxSteps: 4,
    brief: "You follow up failed payments and overdue invoices politely, and never offer discounts or refunds yourself."
  },
  support: {
    id: "support",
    name: "Support",
    triggers: ["ui.error_seen", "help.sought", "integration.error"],
    actions: [...READS, ...ALWAYS, "send_message"],
    recordTypes: ["customer", "lead", "user", "task"],
    tier: "fast",
    maxSteps: 4,
    brief: "You help people stuck in the portals and turn repeated problems into tasks for the team."
  }
};
function agentsForEvent(type) {
  const entity = type.split(".")[0];
  return Object.values(AGENTS).filter((a) => a.triggers.includes(type) || a.triggers.includes(`${entity}.*`));
}
var SHARED_RULES = `
Rules for every EasyLink agent:
- You work for EasyLink Solar in Australia. Use Australian English, AUD and the customer's local time.
- Use only the tools given. Never invent record ids, phone numbers, emails or prices; look them up.
- Messages and calls go only to contact details already on a record. Cite the record you are using.
- Tool results with status "proposed" are waiting for a person; tell the requester it is being checked, do not retry.
- If a tool is "denied", do not try to work around it; explain or ask a person with request_approval.
- Never store health, financial-hardship or other sensitive details as facts; store only the handling instruction.
- Keep it short. When nothing needs doing, reply "No action needed." and stop.
`.trim();

// src/ai/model.ts
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
var COST_PER_1K_AUD = {
  fast: { in: Number(process.env.COST_FAST_IN ?? 15e-4), out: Number(process.env.COST_FAST_OUT ?? 75e-4) },
  smart: { in: Number(process.env.COST_SMART_IN ?? 46e-4), out: Number(process.env.COST_SMART_OUT ?? 0.023) }
};
function turnCostAud(tier, t) {
  const c = COST_PER_1K_AUD[tier];
  return t.usage.inputTokens / 1e3 * c.in + t.usage.outputTokens / 1e3 * c.out;
}
var BedrockModel = class {
  constructor(ids = {
    fast: process.env.MODEL_FAST_ID ?? "",
    smart: process.env.MODEL_SMART_ID ?? ""
  }, client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? "ap-southeast-2" })) {
    this.ids = ids;
    this.client = client;
  }
  ids;
  client;
  async converse(args) {
    const modelId = this.ids[args.tier];
    if (!modelId) throw new Error(`Model id for tier "${args.tier}" is not configured (MODEL_${args.tier.toUpperCase()}_ID)`);
    const res = await this.client.send(
      new ConverseCommand({
        modelId,
        system: [{ text: args.system }],
        messages: args.messages.map(toBedrock),
        toolConfig: args.tools?.length ? { tools: args.tools } : void 0,
        inferenceConfig: { maxTokens: args.maxTokens ?? 1500, temperature: 0.2 }
      })
    );
    const blocks = res.output?.message?.content ?? [];
    return {
      text: blocks.map((b) => "text" in b && b.text ? b.text : "").join(""),
      toolUses: blocks.filter((b) => "toolUse" in b && !!b.toolUse).map((b) => ({ toolUseId: b.toolUse.toolUseId, name: b.toolUse.name, input: b.toolUse.input ?? {} })),
      stopReason: res.stopReason ?? "end_turn",
      usage: { inputTokens: res.usage?.inputTokens ?? 0, outputTokens: res.usage?.outputTokens ?? 0 }
    };
  }
};
function toBedrock(m) {
  if (m.role === "assistant") {
    const content2 = [];
    if (m.text) content2.push({ text: m.text });
    for (const t of m.toolUses) content2.push({ toolUse: { toolUseId: t.toolUseId, name: t.name, input: t.input } });
    return { role: "assistant", content: content2 };
  }
  const content = [];
  for (const r of m.toolResults ?? []) {
    content.push({ toolResult: { toolUseId: r.toolUseId, content: [{ json: r.json }], status: r.error ? "error" : "success" } });
  }
  if (m.image) content.push({ image: { format: m.image.format, source: { bytes: m.image.bytes } } });
  if (m.document) {
    const name = m.document.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9 \-()[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "document";
    content.push({ document: { format: m.document.format, name, source: { bytes: m.document.bytes } } });
  }
  if (m.text) content.push({ text: m.text });
  return { role: "user", content };
}
var FakeModel = class {
  constructor(script = []) {
    this.script = script;
  }
  script;
  calls = [];
  push(t) {
    this.script.push(t);
  }
  async converse(args) {
    this.calls.push({ tier: args.tier, system: args.system, messages: structuredClone(args.messages), toolNames: (args.tools ?? []).map((t2) => "toolSpec" in t2 ? t2.toolSpec?.name ?? "" : "") });
    const next = this.script.shift();
    const t = typeof next === "function" ? next({ messages: args.messages, system: args.system }) : next ?? { text: "No action needed." };
    const toolUses = (t.tools ?? []).map((u, i) => ({ toolUseId: `tu_${this.calls.length}_${i}`, name: u.name, input: u.input }));
    return { text: t.text ?? "", toolUses, stopReason: toolUses.length ? "tool_use" : "end_turn", usage: { inputTokens: 500, outputTokens: 100 } };
  }
};

// src/ai/runtime.ts
var SYSTEM = { kind: "system", id: "ai-platform", roles: ["SYSTEM"], on_behalf_of: null };
var MEMORY_ONLY = /* @__PURE__ */ new Set(["page.viewed", "cta.clicked", "ui.interacted", "field.hesitated", "search.performed"]);
var TEXT_FIELDS = ["transcript", "summary", "body", "text", "message", "content", "notes"];
var AiRuntime = class {
  constructor(deps) {
    this.deps = deps;
  }
  deps;
  now() {
    return this.deps.now?.() ?? /* @__PURE__ */ new Date();
  }
  async handle(raw2) {
    const parsed = EventEnvelope.safeParse(raw2);
    const id = raw2?.event_id ?? "unknown";
    if (!parsed.success) {
      await this.deps.store.quarantine(raw2, `Invalid envelope: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
      return { event_id: id, status: "quarantined", agents: [] };
    }
    const evt = parsed.data;
    if (!isRegisteredType(evt.type)) {
      await this.deps.store.quarantine(evt, `Unregistered event type ${evt.type}`);
      return { event_id: evt.event_id, status: "quarantined", agents: [] };
    }
    if (!await this.deps.store.markEventSeen(evt.event_id)) return { event_id: evt.event_id, status: "duplicate", agents: [] };
    await this.remember(evt);
    await this.rules(evt);
    if (MEMORY_ONLY.has(evt.type)) return { event_id: evt.event_id, status: "memory_only", agents: [] };
    const agents = agentsForEvent(evt.type).filter(
      // An agent is never woken by its own actions (prevents loops).
      (a) => !(evt.principal.kind === "agent" && evt.principal.id === a.id)
    );
    const out = [];
    for (const agent of agents) out.push(await this.runAgent(agent, evt));
    return { event_id: evt.event_id, status: "handled", agents: out };
  }
  /** Deterministic handling that must never depend on a model. */
  async rules(evt) {
    if (evt.type === "sms.received" || evt.type === "email.received") {
      const text = String(evt.data.body ?? evt.data.text ?? "");
      if (isOptOut(text) && ["customer", "lead"].includes(evt.subject.type)) {
        await this.deps.actions.run({
          name: "update_record",
          input: { record: evt.subject, fields: { optedOut: true, smsConsent: false, marketingConsent: false } },
          principal: SYSTEM,
          causationId: evt.event_id,
          correlationId: evt.correlation_id
        });
      }
    }
    if (evt.type === "file.uploaded" && this.deps.classifier) {
      await this.deps.classifier.classify(evt);
    }
  }
  async remember(evt) {
    const texts = TEXT_FIELDS.map((k) => evt.data[k]).filter((v) => typeof v === "string" && v.trim().length > 0);
    if (!texts.length) return;
    await this.deps.store.putChunk({
      id: newId("chk_"),
      subjects: [evt.subject, ...evt.links],
      sourceType: evt.type,
      sourceId: evt.event_id,
      text: texts.join("\n").slice(0, 8e3),
      occurredAt: evt.occurred_at
    });
  }
  async overBudget() {
    const control = await this.deps.store.getControl();
    if (control.dailyBudgetAud == null) return false;
    const start = new Date(this.now());
    start.setUTCHours(0, 0, 0, 0);
    const today = await this.deps.store.listDecisions({ sinceIso: start.toISOString(), limit: 1e4 });
    return today.reduce((s2, d) => s2 + d.costAud, 0) >= control.dailyBudgetAud;
  }
  async runAgent(agent, evt) {
    const decisionId = newId("dec_");
    const principal = { kind: "agent", id: agent.id, roles: [agent.id], on_behalf_of: null };
    const results = [];
    let cost = 0;
    let lastAction = null;
    let lastLevel = null;
    let outcome = "no_action";
    let summary = "";
    const control = await this.deps.store.getControl();
    if (control.pausedAgents[agent.id] || await this.overBudget()) {
      outcome = "escalated";
      summary = control.pausedAgents[agent.id] ? "Agent paused." : "Daily AI budget reached.";
      await this.saveDecision({ decisionId, agent, evt, summary, lastAction, lastLevel, outcome, cost, contextHash: null });
      return { agentId: agent.id, outcome, steps: 0, results };
    }
    const context = await this.contextFor(principal, agent, evt, decisionId);
    const tools = agent.actions.map((a) => toolSpecFor(a, agent.recordTypes));
    const system = `You are the ${agent.name} agent. ${agent.brief}

${SHARED_RULES}

Now (UTC): ${this.now().toISOString()}`;
    const messages = [{ role: "user", text: context }];
    const contextHash = createHash2("sha256").update(system + context).digest("hex").slice(0, 16);
    let steps = 0;
    for (; steps < agent.maxSteps; steps++) {
      const turn = await this.deps.model.converse({ tier: agent.tier, system, messages, tools });
      cost += turnCostAud(agent.tier, turn);
      messages.push({ role: "assistant", text: turn.text, toolUses: turn.toolUses });
      if (!turn.toolUses.length) {
        summary = turn.text.slice(0, 500);
        break;
      }
      const toolResults = [];
      for (const use of turn.toolUses) {
        const r = await this.deps.actions.run({
          name: use.name,
          input: use.input,
          principal,
          agent: { agentId: agent.id, decisionId, eventId: evt.event_id, reasoning: turn.text.slice(0, 1e3) },
          correlationId: evt.correlation_id,
          causationId: evt.event_id,
          idempotencyKey: `${evt.event_id}:${agent.id}:${use.name}:${hashInput(use.input)}`
        });
        results.push({ action: use.name, status: r.status });
        if (r.status !== "invalid" && use.name !== "search_records" && use.name !== "get_record" && use.name !== "search_memory" && use.name !== "list_files") {
          lastAction = use.name;
          lastLevel = r.autonomy_level;
        }
        toolResults.push({
          toolUseId: use.toolUseId,
          json: { status: r.status, result: r.result ?? null, message: r.message ?? null, reasons: r.policy.reasons, approval_id: r.approval_id ?? null },
          error: ["invalid", "denied", "error", "blocked"].includes(r.status)
        });
      }
      messages.push({ role: "user", toolResults });
    }
    const statuses = results.map((r) => r.status);
    if (statuses.includes("proposed")) outcome = "proposed";
    else if (results.some((r) => r.status === "executed" && !["search_records", "get_record", "search_memory", "list_files"].includes(r.action))) outcome = "executed";
    else if (statuses.includes("denied") || statuses.includes("blocked")) outcome = "denied";
    else if (statuses.includes("error")) outcome = "error";
    if (results.some((r) => r.action === "request_approval" && r.status === "executed")) outcome = "escalated";
    if (steps >= agent.maxSteps && !summary) summary = "Stopped at the step limit.";
    await this.saveDecision({ decisionId, agent, evt, summary, lastAction, lastLevel, outcome, cost, contextHash });
    return { agentId: agent.id, outcome, steps: steps + 1, results };
  }
  async saveDecision(a) {
    await this.deps.store.putDecision({
      id: a.decisionId,
      agentId: a.agent.id,
      eventId: a.evt.event_id,
      subject: a.evt.subject,
      reasoningSummary: a.summary,
      action: a.lastAction,
      autonomyLevel: a.lastLevel,
      outcome: a.outcome,
      approverId: null,
      costAud: Math.round(a.cost * 1e4) / 1e4,
      contextHash: a.contextHash,
      createdAt: this.now().toISOString()
    });
  }
  /** What the agent sees: the event (PII paths redacted), the subject record and its memory. */
  async contextFor(principal, agent, evt, decisionId) {
    const parts = [`Event:
${JSON.stringify(redactEvent(evt), null, 2)}`];
    if (agent.recordTypes.includes(evt.subject.type)) {
      const r = await this.deps.actions.run({
        name: "get_record",
        input: { record: evt.subject },
        principal,
        agent: { agentId: agent.id, decisionId, eventId: evt.event_id }
      });
      if (r.status === "executed") parts.push(`Subject record (${evt.subject.type} ${evt.subject.id}):
${JSON.stringify(r.result, null, 2).slice(0, 6e3)}`);
    }
    const recent = await this.deps.store.searchChunks(String(evt.data.transcript ?? evt.data.body ?? evt.type), [evt.subject], 3);
    if (recent.length) parts.push(`Related memory:
${recent.map((c) => `- [${c.sourceType} ${c.occurredAt}] ${c.text.slice(0, 400)}`).join("\n")}`);
    parts.push("Decide what, if anything, needs doing for this event and do it with the tools.");
    return parts.join("\n\n");
  }
};
function hashInput(v) {
  return createHash2("sha1").update(JSON.stringify(v)).digest("hex").slice(0, 10);
}

// src/backend/client.ts
var ADAPTERS = {
  partner: {
    toBackend: (f) => f.kind ? { ...f, kind: String(f.kind).toUpperCase() } : f,
    fromBackend: (r) => r.kind ? { ...r, kind: String(r.kind).toLowerCase() } : r
  },
  document: {
    updatePath: (id) => `/installer-customer-documents/${encodeURIComponent(id)}/ai`,
    toBackend: (f) => {
      const out = {};
      if (f.aiLabels !== void 0) out.aiLabels = f.aiLabels;
      if (f.extracted !== void 0) out.aiExtracted = f.extracted;
      if (f.issues !== void 0) out.aiIssues = f.issues;
      for (const k of ["reviewState", "leadId", "s3Key"]) if (f[k] !== void 0) out[k] = f[k];
      return out;
    },
    fromBackend: (r) => ({ ...r, extracted: r.extracted ?? r.aiExtracted, issues: r.issues ?? r.aiIssues })
  }
};
var adapter = (type) => backendHasProjects() ? ADAPTERS[type] : void 0;
var HttpBackend = class {
  constructor(baseUrl = process.env.BACKEND_API_BASE_URL ?? "", fetchImpl = fetch) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    if (!this.baseUrl) throw new Error("BACKEND_API_BASE_URL is not set");
  }
  baseUrl;
  fetchImpl;
  url(path) {
    return `${this.baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }
  async call(method, path, body, auth) {
    const res = await this.fetchImpl(this.url(path), {
      method,
      headers: {
        Authorization: `Bearer ${auth.token}`,
        Accept: "application/json",
        ...body != null ? { "Content-Type": "application/json" } : {}
      },
      body: body != null ? JSON.stringify(body) : void 0
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    const env = json && typeof json === "object" ? json : {};
    const data = "data" in env ? env.data : json;
    return { ok: res.ok, status: res.status, data: res.ok ? data : null, message: env.message };
  }
  list(type, filter, auth) {
    const def = getRecordType(type);
    const qs = new URLSearchParams();
    const a = adapter(type);
    const f = a?.toBackend && filter.kind ? a.toBackend(filter) : filter;
    for (const [k, v] of Object.entries(f)) if (v != null && def.search.includes(k)) qs.set(k, String(v));
    const q = qs.toString();
    return this.call("GET", `${def.path}${q ? `?${q}` : ""}`, null, auth).then((r) => ({
      ...r,
      data: normaliseList(r.data).map((row) => a?.fromBackend && row && typeof row === "object" ? a.fromBackend(row) : row)
    }));
  }
  one(type, r) {
    const a = adapter(type);
    return a?.fromBackend && r.data ? { ...r, data: a.fromBackend(r.data) } : r;
  }
  async get(type, id, auth) {
    return this.one(type, await this.call("GET", `${getRecordType(type).path}/${encodeURIComponent(id)}`, null, auth));
  }
  async create(type, fields, auth) {
    const a = adapter(type);
    return this.one(type, await this.call("POST", getRecordType(type).path, a?.toBackend ? a.toBackend(fields) : fields, auth));
  }
  async update(type, id, fields, auth) {
    const a = adapter(type);
    const path = a?.updatePath ? a.updatePath(id) : `${getRecordType(type).path}/${encodeURIComponent(id)}`;
    return this.one(type, await this.call("PATCH", path, a?.toBackend ? a.toBackend(fields) : fields, auth));
  }
  whoAmI(auth) {
    return this.call("GET", "/users/me", null, auth);
  }
};
function normaliseList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const v of Object.values(data)) if (Array.isArray(v)) return v;
  }
  return [];
}
var FakeBackend = class {
  records = /* @__PURE__ */ new Map();
  calls = [];
  users = /* @__PURE__ */ new Map();
  // token -> user
  seq = 1;
  seed(type, rows) {
    const m = this.records.get(type) ?? /* @__PURE__ */ new Map();
    for (const r of rows) m.set(String(r.id), r);
    this.records.set(type, m);
  }
  table(type) {
    if (!this.records.has(type)) this.records.set(type, /* @__PURE__ */ new Map());
    return this.records.get(type);
  }
  async list(type, filter) {
    const rows = [...this.table(type).values()].filter(
      (r) => Object.entries(filter).every(
        ([k, v]) => k === "search" ? JSON.stringify(r).toLowerCase().includes(String(v).toLowerCase()) : ["page", "limit"].includes(k) || String(r[k]) === String(v)
      )
    );
    return { ok: true, status: 200, data: rows };
  }
  async get(type, id) {
    const r = this.table(type).get(id);
    return r ? { ok: true, status: 200, data: r } : { ok: false, status: 404, data: null, message: "Not found" };
  }
  async create(type, fields) {
    const id = String(fields.id ?? `${type}_${this.seq++}`);
    const row = { ...fields, id };
    this.table(type).set(id, row);
    return { ok: true, status: 201, data: row };
  }
  async update(type, id, fields) {
    const cur = this.table(type).get(id);
    if (!cur) return { ok: false, status: 404, data: null, message: "Not found" };
    const row = { ...cur, ...fields };
    this.table(type).set(id, row);
    return { ok: true, status: 200, data: row };
  }
  /** Extra endpoints for tests (e.g. the /projects routes from the backend patch). */
  routes = [];
  async call(method, path, body, auth) {
    this.calls.push({ method, path, body, token: auth.token });
    for (const r of this.routes) {
      const hit = r(method, path, body, auth.token);
      if (hit) return hit;
    }
    const m = path.match(/^\/leads\/([^/]+)\/assign$/);
    if (m && method === "POST") {
      const b = body;
      await this.update("lead", decodeURIComponent(m[1]), { assignedToId: b.assignedToId ?? b.installerId });
      return { ok: true, status: 200, data: { assigned: true } };
    }
    return { ok: true, status: 200, data: { queued: true } };
  }
  async whoAmI(auth) {
    const u = this.users.get(auth.token);
    return u ? { ok: true, status: 200, data: u } : { ok: false, status: 401, data: null, message: "Unauthorized" };
  }
};

// src/bus/bus.ts
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
var MemoryBus = class {
  published = [];
  subs = [];
  subscribe(fn) {
    this.subs.push(fn);
  }
  async publish(events) {
    this.published.push(...events);
    for (const e of events) for (const s2 of this.subs) await s2(e);
  }
};
var EventBridgeBus = class {
  constructor(busName = process.env.EVENT_BUS_NAME ?? "easylink-core", client = new EventBridgeClient({ region: process.env.AWS_REGION ?? "ap-southeast-2" })) {
    this.busName = busName;
    this.client = client;
  }
  busName;
  client;
  async publish(events) {
    for (let i = 0; i < events.length; i += 10) {
      const batch = events.slice(i, i + 10);
      const res = await this.client.send(
        new PutEventsCommand({
          Entries: batch.map((e) => ({
            EventBusName: this.busName,
            Source: `easylink.${e.source}`,
            DetailType: e.type,
            Detail: JSON.stringify(e),
            Time: new Date(e.occurred_at)
          }))
        })
      );
      if (res.FailedEntryCount) throw new Error(`EventBridge rejected ${res.FailedEntryCount} events`);
    }
  }
};

// src/container.ts
init_classify();

// src/store/dynamo.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

// src/store/types.ts
var DEFAULT_CONTROL = {
  globalRecommendOnly: false,
  pausedAgents: {},
  familiesOff: {},
  dailyBudgetAud: null,
  updatedBy: "system",
  updatedAt: (/* @__PURE__ */ new Date(0)).toISOString()
};
var refKey = (r) => `${r.type}#${r.id}`;

// src/store/dynamo.ts
var DynamoStore = class {
  constructor(table, client = new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-southeast-2" })) {
    this.table = table;
    this.doc = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
  }
  table;
  doc;
  ttl(days) {
    return Math.floor(Date.now() / 1e3) + days * 86400;
  }
  async put(item, condition) {
    await this.doc.send(new PutCommand({ TableName: this.table, Item: item, ConditionExpression: condition }));
  }
  async get(pk, sk) {
    const r = await this.doc.send(new GetCommand({ TableName: this.table, Key: { pk, sk } }));
    return r.Item?.data;
  }
  async query(input) {
    const r = await this.doc.send(new QueryCommand({ TableName: this.table, ...input }));
    return (r.Items ?? []).map((i) => i.data);
  }
  async markEventSeen(eventId) {
    try {
      await this.put({ pk: `SEEN#${eventId}`, sk: "SEEN", ttl: this.ttl(7) }, "attribute_not_exists(pk)");
      return true;
    } catch (e) {
      if (e.name === "ConditionalCheckFailedException") return false;
      throw e;
    }
  }
  async quarantine(evt, reason) {
    const at = (/* @__PURE__ */ new Date()).toISOString();
    await this.put({ pk: "QUAR", sk: `${at}#${Math.random().toString(36).slice(2)}`, ttl: this.ttl(30), data: { evt, reason, at } });
  }
  async listQuarantine(limit) {
    return this.query({
      KeyConditionExpression: "pk = :p",
      ExpressionAttributeValues: { ":p": "QUAR" },
      ScanIndexForward: false,
      Limit: limit
    });
  }
  async recordEvent(evt) {
    await this.put({ pk: "EVT", sk: `${evt.occurred_at}#${evt.event_id}`, ttl: this.ttl(90), data: evt });
  }
  async recentEvents(limit) {
    return this.query({
      KeyConditionExpression: "pk = :p",
      ExpressionAttributeValues: { ":p": "EVT" },
      ScanIndexForward: false,
      Limit: limit
    });
  }
  async getIdempotent(key) {
    return this.get(`IDEM#${key}`, "IDEM");
  }
  async putIdempotent(key, value) {
    await this.put({ pk: `IDEM#${key}`, sk: "IDEM", ttl: this.ttl(1), data: value });
  }
  async putInbox(item) {
    await this.put({ pk: "INBOX", sk: `${item.createdAt}#${item.id}`, gsi1pk: `INBOX#${item.status}`, gsi1sk: item.createdAt, data: item });
    await this.put({ pk: `INBOXID#${item.id}`, sk: "INBOX", data: item });
  }
  async getInbox(id) {
    return this.get(`INBOXID#${id}`, "INBOX");
  }
  async listInbox(filter) {
    const items = filter.status ? await this.query({
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :p",
      ExpressionAttributeValues: { ":p": `INBOX#${filter.status}` },
      ScanIndexForward: false,
      Limit: filter.limit ?? 100
    }) : await this.query({
      KeyConditionExpression: "pk = :p",
      ExpressionAttributeValues: { ":p": "INBOX" },
      ScanIndexForward: false,
      Limit: filter.limit ?? 100
    });
    const fresh = await Promise.all(items.map((i) => this.getInbox(i.id)));
    return fresh.filter((i) => !!i).filter((i) => (!filter.status || i.status === filter.status) && (!filter.kind || i.kind === filter.kind));
  }
  async putDecision(d) {
    await this.put({
      pk: "DEC",
      sk: `${d.createdAt}#${d.id}`,
      gsi1pk: `DECAGENT#${d.agentId}`,
      gsi1sk: d.createdAt,
      ...d.subject ? { gsi2pk: `SUBJ#${refKey(d.subject)}`, gsi2sk: d.createdAt } : {},
      ttl: this.ttl(730),
      data: d
    });
  }
  async listDecisions(filter) {
    const since = filter.sinceIso ?? "0";
    if (filter.subject) {
      return this.query({
        IndexName: "gsi2",
        KeyConditionExpression: "gsi2pk = :p AND gsi2sk >= :s",
        ExpressionAttributeValues: { ":p": `SUBJ#${refKey(filter.subject)}`, ":s": since },
        ScanIndexForward: false,
        Limit: filter.limit ?? 50
      });
    }
    if (filter.agentId) {
      return this.query({
        IndexName: "gsi1",
        KeyConditionExpression: "gsi1pk = :p AND gsi1sk >= :s",
        ExpressionAttributeValues: { ":p": `DECAGENT#${filter.agentId}`, ":s": since },
        ScanIndexForward: false,
        Limit: filter.limit ?? 500
      });
    }
    return this.query({
      KeyConditionExpression: "pk = :p AND sk >= :s",
      ExpressionAttributeValues: { ":p": "DEC", ":s": since },
      ScanIndexForward: false,
      Limit: filter.limit ?? 500
    });
  }
  async putActionLog(e) {
    await this.put({
      pk: "ACT",
      sk: `${e.createdAt}#${e.id}`,
      ...e.subject ? { gsi2pk: `SUBJ#${refKey(e.subject)}`, gsi2sk: e.createdAt } : {},
      ttl: this.ttl(730),
      data: e
    });
  }
  async listActionLog(filter) {
    const since = filter.sinceIso ?? "0";
    if (filter.subject) {
      const rows = await this.query({
        IndexName: "gsi2",
        KeyConditionExpression: "gsi2pk = :p AND gsi2sk >= :s",
        ExpressionAttributeValues: { ":p": `SUBJ#${refKey(filter.subject)}`, ":s": since },
        ScanIndexForward: false,
        Limit: filter.limit ?? 50
      });
      return rows.filter((r) => "action" in r && "inputDigest" in r);
    }
    return this.query({
      KeyConditionExpression: "pk = :p AND sk >= :s",
      ExpressionAttributeValues: { ":p": "ACT", ":s": since },
      ScanIndexForward: false,
      Limit: filter.limit ?? 500
    });
  }
  async listAutonomyRules(agentId) {
    if (agentId) {
      return this.query({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `RULE#${agentId}` } });
    }
    return this.query({ IndexName: "gsi1", KeyConditionExpression: "gsi1pk = :p", ExpressionAttributeValues: { ":p": "RULES" } });
  }
  async putAutonomyRule(rule) {
    const cond = Object.entries(rule.condition).sort().map(([k, v]) => `${k}=${v}`).join("&") || "*";
    await this.put({ pk: `RULE#${rule.agentId}`, sk: `${rule.action}#${cond}`, gsi1pk: "RULES", gsi1sk: `${rule.agentId}#${rule.action}#${cond}`, data: rule });
  }
  async getControl() {
    return await this.get("CONTROL", "CONTROL") ?? { ...DEFAULT_CONTROL };
  }
  async putControl(state) {
    await this.put({ pk: "CONTROL", sk: "CONTROL", data: state });
  }
  async putFact(f) {
    await this.put({ pk: `FACT#${refKey(f.subject)}`, sk: f.id, data: f });
  }
  async listFacts(subject) {
    return this.query({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `FACT#${refKey(subject)}` } });
  }
  async getSummary(subject) {
    return this.get(`SUM#${refKey(subject)}`, "SUM");
  }
  async putSummary(s2) {
    await this.put({ pk: `SUM#${refKey(s2.subject)}`, sk: "SUM", data: s2 });
  }
  async putChunk(c) {
    await Promise.all(
      c.subjects.map((s2) => this.put({ pk: `CHUNK#${refKey(s2)}`, sk: `${c.occurredAt}#${c.id}`, data: c }))
    );
  }
  async searchChunks(query, allowed, limit) {
    if (allowed === "all") return [];
    const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
    const lists = await Promise.all(
      allowed.slice(0, 10).map(
        (s2) => this.query({
          KeyConditionExpression: "pk = :p",
          ExpressionAttributeValues: { ":p": `CHUNK#${refKey(s2)}` },
          ScanIndexForward: false,
          Limit: 200
        })
      )
    );
    return lists.flat().map((c) => ({ c, score: terms.reduce((n, t) => n + (c.text.toLowerCase().includes(t) ? 1 : 0), 0) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.c);
  }
  async putFileLabels(l) {
    await this.put({ pk: `LABELS#${l.documentId}`, sk: "LABELS", data: l });
  }
  async getFileLabels(ids) {
    const out = await Promise.all(ids.map((id) => this.get(`LABELS#${id}`, "LABELS")));
    return out.filter((x) => !!x);
  }
  async putTimeline(item) {
    const seen = /* @__PURE__ */ new Set();
    for (const r of item.records) {
      const k = refKey(r);
      if (seen.has(k)) continue;
      seen.add(k);
      await this.put({ pk: `TL#${k}`, sk: `${item.at}#${item.id}`, ttl: this.ttl(2557), data: item });
    }
  }
  async listTimeline(record, limit) {
    return this.query({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `TL#${refKey(record)}` }, ScanIndexForward: false, Limit: limit });
  }
  async putRecord(type, row) {
    await this.put({ pk: `REC#${type}`, sk: row.id, data: row });
  }
  async getRecord(type, id) {
    return this.get(`REC#${type}`, id);
  }
  async listRecords(type) {
    return this.query({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `REC#${type}` } });
  }
  async putScreen(s2) {
    await this.put({ pk: `SCREEN#${s2.ownerId}`, sk: s2.id, data: s2 });
  }
  async listScreens(ownerId) {
    return this.query({ KeyConditionExpression: "pk = :p", ExpressionAttributeValues: { ":p": `SCREEN#${ownerId}` } });
  }
};

// src/store/memory.ts
var MemoryStore = class {
  seen = /* @__PURE__ */ new Set();
  quarantined = [];
  events = [];
  idem = /* @__PURE__ */ new Map();
  inbox = /* @__PURE__ */ new Map();
  decisions = [];
  actionLog = [];
  rules = [];
  control = { ...DEFAULT_CONTROL };
  facts = [];
  summaries = /* @__PURE__ */ new Map();
  chunks = [];
  screens = [];
  labels = /* @__PURE__ */ new Map();
  records = /* @__PURE__ */ new Map();
  timeline = [];
  async markEventSeen(eventId) {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    return true;
  }
  async quarantine(evt, reason) {
    this.quarantined.push({ evt, reason, at: (/* @__PURE__ */ new Date()).toISOString() });
  }
  async listQuarantine(limit) {
    return this.quarantined.slice(-limit).reverse();
  }
  async recordEvent(evt) {
    this.events.push(evt);
    if (this.events.length > 5e3) this.events.shift();
  }
  async recentEvents(limit) {
    return this.events.slice(-limit).reverse();
  }
  async getIdempotent(key) {
    return this.idem.get(key);
  }
  async putIdempotent(key, value) {
    this.idem.set(key, value);
  }
  async putInbox(item) {
    this.inbox.set(item.id, item);
  }
  async getInbox(id) {
    return this.inbox.get(id);
  }
  async listInbox(filter) {
    return [...this.inbox.values()].filter((i) => (!filter.status || i.status === filter.status) && (!filter.kind || i.kind === filter.kind)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, filter.limit ?? 100);
  }
  async putDecision(d) {
    this.decisions.push(d);
  }
  async listDecisions(filter) {
    return this.decisions.filter(
      (d) => (!filter.agentId || d.agentId === filter.agentId) && (!filter.subject || d.subject && refKey(d.subject) === refKey(filter.subject)) && (!filter.sinceIso || d.createdAt >= filter.sinceIso)
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, filter.limit ?? 500);
  }
  async putActionLog(e) {
    this.actionLog.push(e);
  }
  async listActionLog(filter) {
    return this.actionLog.filter(
      (e) => (!filter.subject || e.subject && refKey(e.subject) === refKey(filter.subject)) && (!filter.sinceIso || e.createdAt >= filter.sinceIso)
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, filter.limit ?? 500);
  }
  async listAutonomyRules(agentId) {
    return this.rules.filter((r) => !agentId || r.agentId === agentId);
  }
  async putAutonomyRule(rule) {
    const same = (r) => r.agentId === rule.agentId && r.action === rule.action && JSON.stringify(r.condition) === JSON.stringify(rule.condition);
    this.rules = this.rules.filter((r) => !same(r));
    this.rules.push(rule);
  }
  async getControl() {
    return this.control;
  }
  async putControl(state) {
    this.control = state;
  }
  async putFact(f) {
    this.facts = this.facts.filter((x) => x.id !== f.id);
    this.facts.push(f);
  }
  async listFacts(subject) {
    return this.facts.filter((f) => refKey(f.subject) === refKey(subject));
  }
  async getSummary(subject) {
    return this.summaries.get(refKey(subject));
  }
  async putSummary(s2) {
    this.summaries.set(refKey(s2.subject), s2);
  }
  async putChunk(c) {
    this.chunks.push(c);
  }
  async searchChunks(query, allowed, limit) {
    const allowedKeys = allowed === "all" ? null : new Set(allowed.map(refKey));
    const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
    return this.chunks.filter((c) => !allowedKeys || c.subjects.some((s2) => allowedKeys.has(refKey(s2)))).map((c) => ({ c, score: terms.reduce((n, t) => n + (c.text.toLowerCase().includes(t) ? 1 : 0), 0) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score || b.c.occurredAt.localeCompare(a.c.occurredAt)).slice(0, limit).map((x) => x.c);
  }
  async putFileLabels(l) {
    this.labels.set(l.documentId, l);
  }
  async getFileLabels(ids) {
    return ids.map((id) => this.labels.get(id)).filter((x) => !!x);
  }
  async putTimeline(item) {
    this.timeline = this.timeline.filter((t) => t.id !== item.id);
    this.timeline.push(item);
  }
  async listTimeline(record, limit) {
    const k = refKey(record);
    return this.timeline.filter((t) => t.records.some((r) => refKey(r) === k)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  }
  async putRecord(type, row) {
    const m = this.records.get(type) ?? /* @__PURE__ */ new Map();
    m.set(row.id, row);
    this.records.set(type, m);
  }
  async getRecord(type, id) {
    return this.records.get(type)?.get(id);
  }
  async listRecords(type) {
    return [...this.records.get(type)?.values() ?? []];
  }
  async putScreen(s2) {
    this.screens = this.screens.filter((x) => x.id !== s2.id);
    this.screens.push(s2);
  }
  async listScreens(ownerId) {
    return this.screens.filter((s2) => s2.ownerId === ownerId);
  }
};

// src/backend/overlay.ts
init_envelope();
var OverlayBackend = class {
  constructor(inner, store) {
    this.inner = inner;
    this.store = store;
  }
  inner;
  store;
  local(type) {
    return RECORD_TYPES[type]?.storedIn === "ai";
  }
  async canWrite(auth) {
    const r = await this.inner.whoAmI(auth);
    const u = r.data?.user ?? r.data ?? {};
    return r.ok && ["ADMIN", "SUPER_ADMIN", "MASTER", "STAFF", "DISTRIBUTOR"].includes(String(u.role ?? "").toUpperCase());
  }
  async signedIn(auth) {
    return (await this.inner.whoAmI(auth)).ok;
  }
  denied() {
    return { ok: false, status: 403, data: null, message: "Not allowed" };
  }
  async list(type, filter, auth) {
    if (!this.local(type)) return this.inner.list(type, filter, auth);
    if (!await this.signedIn(auth)) return this.denied();
    const rows = (await this.store.listRecords(type)).filter(
      (r) => Object.entries(filter).every(
        ([k, v]) => k === "search" ? JSON.stringify(r).toLowerCase().includes(String(v).toLowerCase()) : ["page", "limit"].includes(k) || String(r[k]) === String(v)
      )
    );
    return { ok: true, status: 200, data: rows };
  }
  async get(type, id, auth) {
    if (!this.local(type)) return this.inner.get(type, id, auth);
    if (!await this.signedIn(auth)) return this.denied();
    const r = await this.store.getRecord(type, id);
    return r ? { ok: true, status: 200, data: r } : { ok: false, status: 404, data: null, message: "Not found" };
  }
  async create(type, fields, auth) {
    if (!this.local(type)) return this.inner.create(type, fields, auth);
    if (!await this.canWrite(auth)) return this.denied();
    const row = { ...fields, id: String(fields.id ?? newId(`${type.slice(0, 3)}_`)), createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    await this.store.putRecord(type, row);
    return { ok: true, status: 201, data: row };
  }
  async update(type, id, fields, auth) {
    if (!this.local(type)) return this.inner.update(type, id, fields, auth);
    if (!await this.canWrite(auth)) return this.denied();
    const cur = await this.store.getRecord(type, id);
    if (!cur) return { ok: false, status: 404, data: null, message: "Not found" };
    const row = { ...cur, ...fields, id, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await this.store.putRecord(type, row);
    return { ok: true, status: 200, data: row };
  }
  call(method, path, body, auth) {
    return this.inner.call(method, path, body, auth);
  }
  whoAmI(auth) {
    return this.inner.whoAmI(auth);
  }
};

// src/jobs/service.ts
import { createHash as createHash3, randomInt } from "node:crypto";
init_envelope();
init_docs();
init_model();

// src/jobs/stc.ts
function batteryFactor(installDate) {
  const d = installDate.slice(0, 10);
  if (d >= "2027-07-01") return 5.2;
  if (d >= "2027-01-01") return 5.7;
  if (d >= "2026-05-01") return 6.8;
  return 8.4;
}
function deemingYears(installDate) {
  const y = Number(installDate.slice(0, 4));
  return Math.max(1, 2030 - y + 1);
}
function solarStcs(kw, zoneRating, installDate) {
  return Math.floor(kw * zoneRating * deemingYears(installDate));
}
function batteryStcs(usableKwh, installDate) {
  const f = batteryFactor(installDate);
  const a = Math.min(usableKwh, 14);
  const b = Math.max(0, Math.min(usableKwh, 28) - 14);
  const c = Math.max(0, Math.min(usableKwh, 50) - 28);
  return Math.floor(a * f + b * f * 0.6 + c * f * 0.15);
}

// src/jobs/service.ts
var PREREQS = {
  design_selected: [],
  installer_assigned: ["design_selected"],
  selection_confirmed: ["installer_assigned"],
  site_photos_ok: ["installer_assigned"],
  job_accepted: ["selection_confirmed", "site_photos_ok"],
  agreement_signed: ["job_accepted"],
  deposit_paid: ["agreement_signed"],
  install_date_set: ["deposit_paid"],
  connection_applied: ["job_accepted"],
  connection_approved: ["connection_applied"],
  bills_received: ["job_accepted"],
  quote_final: ["bills_received"],
  equipment_paid: ["quote_final", "deposit_paid"],
  delivered: ["equipment_paid", "install_date_set"],
  install_started: ["delivered", "connection_approved"],
  installed: ["install_started"],
  site_docs_sent: ["installed"],
  final_paid: ["installed"],
  stc_pack_signed: ["installed"],
  handover_sent: ["final_paid", "stc_pack_signed"],
  stc_lodged: ["stc_pack_signed"],
  monitoring_clear: ["installed"]
};
var JobError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
  status;
};
var round4 = (n) => Math.round(n * 1e4) / 1e4;
var nowIso = () => (/* @__PURE__ */ new Date()).toISOString();
var addDays = (iso, d) => new Date(Date.parse(iso) + d * 864e5).toISOString();
var sha = (s2) => createHash3("sha256").update(s2).digest("hex");
var maskPhone = (p) => p ? `${p.slice(0, 4)} \u2022\u2022\u2022 ${p.slice(-3)}` : "the mobile on file";
function viewerOf(p) {
  return { who: isStaff(p) || p.kind === "system" || p.kind === "agent" ? "staff" : p.kind === "installer" ? "installer" : "customer", id: p.id };
}
function openMilestones(j) {
  return MILESTONES.filter((m) => !j.milestones[m.key] && PREREQS[m.key].every((k) => j.milestones[k])).map((m) => m.key);
}
var JobService = class {
  constructor(c) {
    this.c = c;
  }
  c;
  // ---------- storage ----------
  async get(id) {
    return await this.c.store.getRecord("job", id);
  }
  async save(j) {
    j.updatedAt = nowIso();
    await this.c.store.putRecord("job", j);
  }
  async invoices(jobId) {
    return (await this.c.store.listRecords("invoice")).filter((i) => i.jobId === jobId).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }
  async signatures(jobId) {
    return (await this.c.store.listRecords("signature")).filter((s2) => s2.jobId === jobId);
  }
  async offers(jobId) {
    return (await this.c.store.listRecords("offer")).filter((o) => !jobId || o.jobId === jobId);
  }
  async counter(name) {
    const cur = await this.c.store.getRecord("counter", name);
    const n = Number(cur?.n ?? 1e3) + 1;
    await this.c.store.putRecord("counter", { id: name, n });
    return n;
  }
  // ---------- who may see / act ----------
  async canSee(j, p, meta = {}) {
    const v = viewerOf(p);
    if (v.who === "staff") return true;
    if (v.who === "installer") return j.installerId === p.id || (await this.offers(j.id)).some((o) => o.installerId === p.id && o.status === "open");
    const scope = await this.c.relations.scope(p, meta.user ?? {}, meta.token ?? void 0);
    return !!j.customerId && Relations.covers(scope, { type: "customer", id: j.customerId }) || Relations.covers(scope, { type: "lead", id: j.leadId });
  }
  async list(p, meta = {}) {
    for (const j of await this.c.store.listRecords("job")) if (!j.installerId) await this.expireOffers(j);
    const all = await this.c.store.listRecords("job");
    const out = [];
    for (const j of all) if (await this.canSee(j, p, meta)) out.push(j);
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  /** The job as this viewer may see it, with their next steps. */
  async view(j0, p) {
    if (!j0.installerId) await this.expireOffers(j0);
    const j = await this.get(j0.id) ?? j0;
    const v = viewerOf(p);
    const open = openMilestones(j);
    const invoices = (await this.invoices(j.id)).filter((i) => v.who !== "customer" || i.status !== "draft");
    const signatures = (await this.signatures(j.id)).map(({ html: _h, codeHash: _c, ...s2 }) => s2);
    const offers = v.who === "staff" ? await this.offers(j.id) : v.who === "installer" ? (await this.offers(j.id)).filter((o) => o.installerId === p.id) : [];
    const base = { ...j };
    if (v.who === "installer" && j.installerId !== p.id) {
      const suburb = j.site.address.split(",").slice(-1)[0]?.trim() ?? "";
      base.customerName = `Customer in ${suburb}`;
      base.customerEmail = void 0;
      base.customerPhone = void 0;
      base.site = { ...j.site, address: suburb, nmi: void 0, lat: Math.round(j.site.lat * 100) / 100, lng: Math.round(j.site.lng * 100) / 100 };
      base.bills = { items: [] };
      base.confirmation = void 0;
      base.photos = { items: j.photos.items.map((x) => ({ label: x.label, ok: x.ok })) };
    }
    if (v.who === "customer") {
      base.order = { ...j.order, lines: [], ref: void 0 };
      base.monitoring = { ...j.monitoring, issues: j.monitoring.issues.filter((i) => i.status === "open") };
    }
    return {
      job: base,
      milestones: MILESTONES.map((m) => ({ ...m, done: !!j.milestones[m.key], at: j.milestones[m.key]?.at ?? null, open: open.includes(m.key) })),
      next: MILESTONES.filter((m) => open.includes(m.key) && (v.who === "staff" || m.who === v.who)).map((m) => ({ key: m.key, label: m.next, who: m.who })),
      waitingOn: MILESTONES.filter((m) => open.includes(m.key) && v.who !== "staff" && m.who !== v.who).map((m) => ({ key: m.key, label: m.label, who: m.who })),
      invoices,
      signatures,
      offers,
      stage: Math.max(1, ...MILESTONES.filter((m) => j.milestones[m.key]).map((m) => m.stage)),
      viewer: v.who,
      stcPrice: STC_PRICE
    };
  }
  /** A phone call about this job, into its history (the voice agent calls this when a call ends). */
  async noteCall(jobId, p, title, detail) {
    const j = await this.get(jobId);
    if (!j) return;
    await this.progress(j, p, title, { detail: detail || void 0, kind: "call" });
  }
  // ---------- recording ----------
  async progress(j, p, title, opts = {}) {
    for (const k of opts.reach ?? []) if (!j.milestones[k]) j.milestones[k] = { at: nowIso(), by: p.id };
    await this.save(j);
    const links = j.customerId ? [{ type: "customer", id: j.customerId }] : [];
    if (j.installerId) links.push({ type: "user", id: j.installerId });
    const evt = makeEvent({
      type: "job.progressed",
      source: "jobs",
      principal: p,
      subject: { type: "lead", id: j.leadId },
      links,
      data: { title, detail: opts.detail ?? null, kind: opts.kind ?? "record", audience: opts.audience ?? "related", milestones: opts.reach ?? [] }
    });
    await this.c.store.recordEvent(evt);
    await this.c.bus.publish([evt]);
  }
  async notify(j, to, text, p) {
    const phone = to === "customer" ? j.customerPhone : void 0;
    if (to === "customer" && phone) await this.c.messaging.sendSms({ to: phone, body: `EasyLink Solar: ${text}` }).catch(() => void 0);
    if (to === "installer" && j.installerId) {
      const u = await this.c.backend.get("user", j.installerId, { token: this.c.serviceToken }).catch(() => null);
      const ph = u?.data?.phone ? String(u.data.phone) : null;
      if (ph) await this.c.messaging.sendSms({ to: ph, body: `EasyLink: ${j.customerName} \u2014 ${text}` }).catch(() => void 0);
    }
    void p;
  }
  // ---------- invoices ----------
  async createInvoice(j, p, input) {
    if (!input.lines.length) throw new JobError("Add at least one line.");
    const issue = nowIso();
    const n = await this.counter("invoice");
    const inv = {
      id: newId("inv_"),
      number: `${input.kind === "credit" ? "ADJ" : "INV"}-${n}`,
      jobId: j.id,
      kind: input.kind,
      seller: j.seller,
      buyer: { name: j.customerName, address: j.site.address, email: j.customerEmail },
      lines: input.lines.map((l) => ({ description: l.description.slice(0, 200), qty: Number(l.qty), unitExGst: round4(Number(l.unitExGst)), gst: !!l.gst })),
      notes: input.notes?.slice(0, 1e3),
      issueDate: issue,
      dueDate: addDays(issue, input.dueDays ?? 7),
      status: "draft",
      totals: invoiceTotals(input.lines),
      payments: [],
      creditFor: input.creditFor,
      createdBy: p.id,
      createdVia: input.via
    };
    await this.c.store.putRecord("invoice", inv);
    await this.progress(j, p, `${input.kind === "credit" ? "Adjustment note" : "Invoice"} ${inv.number} drafted (${money(inv.totals.total)})`, { audience: "staff", kind: "record" });
    return inv;
  }
  depositLines(j) {
    const youPay = j.selection.price - (j.stc.solar + j.stc.battery) * STC_PRICE;
    const deposit = round2(j.selection.price * j.depositPercent / 100);
    void youPay;
    return [{ description: `Deposit (${j.depositPercent}%) \u2014 ${j.selection.title}, ${j.site.address}`, qty: 1, unitExGst: round4(deposit / 1.1), gst: true }];
  }
  finalLines(j, paidSoFar) {
    const stcs = j.stc.solar + j.stc.battery;
    return [
      { description: `${j.selection.title} \u2014 supply and installation, ${j.site.address}`, qty: 1, unitExGst: round4(j.selection.price / 1.1), gst: true },
      { description: `STC point-of-sale discount (${stcs} STCs at ${money(STC_PRICE)})`, qty: 1, unitExGst: -round4(stcs * STC_PRICE / 1.1), gst: true },
      { description: "Less deposit received", qty: 1, unitExGst: -round4(paidSoFar / 1.1), gst: true }
    ];
  }
  // ---------- signatures ----------
  async requestSignature(j, kind, title, html, signer) {
    const s2 = { id: newId("sig_"), jobId: j.id, kind, title, signer, html, hash: sha(html), status: "pending", attempts: 0, createdAt: nowIso() };
    await this.c.store.putRecord("signature", s2);
    return s2;
  }
  async signatureHtml(id) {
    const s2 = await this.c.store.getRecord("signature", id);
    if (!s2) return void 0;
    const { signedCopy: signedCopy2 } = await Promise.resolve().then(() => (init_docs(), docs_exports));
    return { s: s2, html: signedCopy2(s2) };
  }
  async invoiceDoc(id) {
    const inv = await this.c.store.getRecord("invoice", id);
    return inv ? { inv, html: invoiceHtml(inv) } : void 0;
  }
  // ---------- matching ----------
  async rank(j) {
    const r = await this.c.backend.list("user", { role: "INSTALLER" }, { token: this.c.serviceToken });
    const today = nowIso().slice(0, 10);
    const rows = (r.data ?? []).filter((u) => String(u.role ?? "").toUpperCase() === "INSTALLER");
    const tried = new Set((await this.offers(j.id)).map((o) => o.installerId));
    const out = rows.map((u) => {
      const lat = Number(u.lat ?? NaN);
      const lng = Number(u.lng ?? NaN);
      const distanceKm = Number.isFinite(lat) ? Math.round(haversine(j.site.lat, j.site.lng, lat, lng)) : 999;
      const reviews = Number(u.reviewCount ?? 0);
      const rating = Number(u.rating ?? 0);
      const shrunk = (rating * reviews + 4.5 * 5) / (reviews + 5);
      const reliability = Number(u.reliability ?? 0.8);
      const reasons = [];
      if (!u.saaExpiry || String(u.saaExpiry) < today) reasons.push("SAA accreditation not current");
      if (j.selection.battery && !u.batteryEndorsed) reasons.push("no battery endorsement");
      if (distanceKm > Number(u.serviceRadiusKm ?? 60)) reasons.push("outside service area");
      if (u.paused) reasons.push("paused");
      if (tried.has(String(u.id))) reasons.push("already offered");
      const score = Math.round((0.4 * (1 - Math.min(distanceKm, 100) / 100) + 0.35 * (shrunk / 5) + 0.25 * reliability) * 100);
      return { installerId: String(u.id), name: [u.firstName, u.lastName].filter(Boolean).join(" ") || String(u.id), distanceKm, rating: round2(shrunk), reviews, reliability, score, eligible: reasons.length === 0, reasons };
    });
    return out.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
  }
  /** Offers past their answer-by time lapse and the job moves to the next installer. */
  async expireOffers(j) {
    const now = nowIso();
    const stale = (await this.offers(j.id)).filter((o) => o.status === "open" && o.expiresAt < now);
    if (!stale.length) return;
    const sys = { kind: "system", id: "jobs", roles: [], on_behalf_of: null };
    for (const o of stale) {
      o.status = "expired";
      await this.c.store.putRecord("offer", o);
      await this.progress(j, sys, `${o.installerName} didn't answer in time`, { audience: "staff", kind: "assignment" });
    }
    await this.offerNext(j, sys);
  }
  /**
   * Offer to the next eligible installer. After three offers without a yes, or when no one is
   * eligible, the job goes to EasyLink staff to place (wider area, EasyLink's own crew, or the
   * Ready Sites marketplace) and the customer is told it's being arranged.
   */
  async offerNext(j, p) {
    const tried = (await this.offers(j.id)).filter((o2) => o2.status !== "open").length;
    const best = tried >= 3 ? void 0 : (await this.rank(j)).find((c) => c.eligible);
    if (!best) {
      const why = tried >= 3 ? "three installers didn't take it" : "no installer nearby is eligible";
      await this.c.actions.run({ name: "request_approval", input: { question: `Place ${j.customerName}'s job (${j.site.address.split(",").slice(-1)[0]?.trim()}): ${why}. Options: widen the area, offer to EasyLink's own crew, or list it on Ready Sites.`, about: { type: "lead", id: j.leadId } }, principal: { kind: "system", id: "jobs", roles: [], on_behalf_of: null } }).catch(() => void 0);
      await this.progress(j, p, "Waiting for EasyLink to place the job", { detail: why, audience: "staff", kind: "assignment" });
      await this.notify(j, "customer", "we're lining up the right installer for your system and will update you within one business day.", p);
      return null;
    }
    const o = { id: newId("off_"), jobId: j.id, installerId: best.installerId, installerName: best.name, score: best.score, parts: { distanceKm: best.distanceKm, rating: best.rating, reliability: best.reliability }, status: "open", at: nowIso(), expiresAt: new Date(Date.now() + 4 * 36e5).toISOString() };
    await this.c.store.putRecord("offer", o);
    await this.progress(j, p, `Job offered to ${best.name}`, { detail: `${best.distanceKm} km away, rating ${best.rating}`, audience: "staff", kind: "assignment" });
    return o;
  }
  // ---------- the steps ----------
  async act(jobId, action, input, p, meta = {}) {
    const j = await this.get(jobId);
    if (!j) throw new JobError("Job not found", 404);
    if (!await this.canSee(j, p, meta)) throw new JobError("Not your job", 403);
    const v = viewerOf(p);
    const need = (...who) => {
      if (v.who === "staff") return;
      if (!who.includes(v.who)) throw new JobError("Not something you can do on this job", 403);
      if (v.who === "installer" && action !== "accept_offer" && action !== "decline_offer" && j.installerId !== p.id) throw new JobError("This job isn't assigned to you", 403);
    };
    const reached = (k) => !!j.milestones[k];
    const requires = (...ks) => {
      const miss = ks.filter((k) => !reached(k));
      if (miss.length) throw new JobError(`Not yet: first ${MILESTONES.find((m) => m.key === miss[0]).label.toLowerCase()}.`, 409);
    };
    const s2 = (k) => String(input[k] ?? "").trim();
    switch (action) {
      // Stage 2 — matching
      case "match": {
        need("staff");
        return { offer: await this.offerNext(j, p), ranking: await this.rank(j) };
      }
      case "accept_offer":
      case "decline_offer": {
        need("installer");
        const o = (await this.offers(j.id)).find((x) => x.status === "open" && (v.who === "staff" || x.installerId === p.id));
        if (!o) throw new JobError("There is no open offer for you on this job.", 409);
        if (action === "decline_offer") {
          o.status = "declined";
          o.reason = s2("reason") || "Declined";
          await this.c.store.putRecord("offer", o);
          await this.progress(j, p, `${o.installerName} declined the job`, { detail: o.reason, audience: "staff", kind: "assignment" });
          await this.offerNext(j, p);
          return { ok: true };
        }
        o.status = "accepted";
        await this.c.store.putRecord("offer", o);
        j.installerId = o.installerId;
        j.installerName = o.installerName;
        await this.c.relations.assign({ customerId: j.customerId, leadId: j.leadId, installerId: o.installerId, installerName: o.installerName, by: p.id, reason: `Matched: ${o.parts.distanceKm} km, rating ${o.parts.rating}`, replace: true, now: nowIso() }).catch(() => void 0);
        await this.c.backend.call("POST", `/leads/${encodeURIComponent(j.leadId)}/assign`, { installerId: o.installerId }, { token: this.c.serviceToken }).catch(() => void 0);
        await this.progress(j, p, `${o.installerName} is your installer`, { reach: ["installer_assigned"], kind: "assignment" });
        await this.notify(j, "customer", `${o.installerName} will install your system. You can message them from My Project.`, p);
        return { ok: true };
      }
      // Stage 3 — confirmation, photos, acceptance
      case "confirm_selection": {
        need("customer");
        requires("installer_assigned");
        const s0 = j.selection;
        j.confirmation = {
          transcript: s2("transcript").slice(0, 2e3) || "Confirmed in the portal",
          at: nowIso(),
          items: [`${s0.panels.count} \xD7 ${s0.panels.model}`, s0.inverter.model, ...s0.battery ? [`${s0.battery.model} (${s0.battery.usableKwh} kWh)`] : [], ...s0.accessories.map((a) => a.name)]
        };
        await this.progress(j, p, "Customer confirmed the selection", { reach: ["selection_confirmed"], detail: j.confirmation.items.join(" \xB7 "), kind: "message" });
        await this.notify(j, "installer", "confirmed their selection. Review the photos and accept the job.", p);
        return { ok: true };
      }
      case "request_photos": {
        need("installer");
        j.photos.requestedAt = nowIso();
        await this.progress(j, p, "Site photos requested", { kind: "message" });
        await this.notify(j, "customer", "your installer needs photos of your meter and switchboard. Open My Project to send them.", p);
        return { ok: true };
      }
      case "upload_photo": {
        need("customer", "installer");
        const label = s2("label");
        const item = j.photos.items.find((i) => i.label === label);
        if (!item) throw new JobError("Unknown photo");
        item.ok = true;
        item.documentId = s2("documentId") || item.documentId;
        item.note = s2("note") || item.note;
        const done = j.photos.items.filter((i) => i.label === "Meter" || i.label === "Switchboard").every((i) => i.ok);
        await this.progress(j, p, `Photo received: ${label}`, { reach: done ? ["site_photos_ok"] : [], kind: "file" });
        return { ok: true };
      }
      case "reject_photo": {
        need("installer");
        const label = s2("label");
        const reason = s2("reason");
        if (!reason) throw new JobError("Say what's wrong with the photo so the customer can fix it first time");
        const item = j.photos.items.find((i) => i.label === label);
        if (!item) throw new JobError("Unknown photo");
        item.ok = false;
        item.note = reason.slice(0, 300);
        j.milestones.site_photos_ok = void 0;
        await this.progress(j, p, `Photo needed again: ${label}`, { detail: reason, kind: "message" });
        await this.notify(j, "customer", `please retake the ${label.toLowerCase()} photo: ${reason}`, p);
        return { ok: true };
      }
      case "accept_job": {
        need("installer");
        requires("selection_confirmed", "site_photos_ok");
        const sig = await this.requestSignature(j, "agreement", "Quote and installation agreement", agreementHtml(j), { who: "customer", id: j.customerId ?? j.leadId, name: j.customerName, phone: j.customerPhone });
        await this.progress(j, p, `${j.installerName ?? "Installer"} accepted the job`, { reach: ["job_accepted"], kind: "assignment" });
        await this.notify(j, "customer", "your installer accepted the job. Please sign your agreement in My Project.", p);
        return { signatureId: sig.id };
      }
      // Signing (any document)
      case "request_code":
      case "sign": {
        const sig = await this.c.store.getRecord("signature", s2("signatureId"));
        if (!sig || sig.jobId !== j.id) throw new JobError("Document not found", 404);
        if (sig.status === "signed") throw new JobError("Already signed", 409);
        const onSite = sig.kind === "install_complete" && v.who === "installer";
        if (v.who !== "staff" && sig.signer.who !== v.who && !onSite) throw new JobError("This document is for someone else to sign", 403);
        if (action === "request_code") {
          const code = String(randomInt(0, 1e6)).padStart(6, "0");
          sig.codeHash = sha(`${sig.id}:${code}`);
          sig.codeExpires = new Date(Date.now() + 10 * 6e4).toISOString();
          sig.attempts = 0;
          await this.c.store.putRecord("signature", sig);
          if (sig.signer.phone) await this.c.messaging.sendSms({ to: sig.signer.phone, body: `EasyLink Solar: your signing code is ${code}. It expires in 10 minutes. Don't share it.` });
          return { sentTo: maskPhone(sig.signer.phone), ...process.env.AI_MODE === "local" ? { devCode: code } : {} };
        }
        if (!sig.codeHash || !sig.codeExpires || sig.codeExpires < nowIso()) throw new JobError("The code has expired. Ask for a new one.", 409);
        if (sig.attempts >= 5) throw new JobError("Too many attempts. Ask for a new code.", 429);
        if (sha(`${sig.id}:${s2("code")}`) !== sig.codeHash) {
          sig.attempts += 1;
          await this.c.store.putRecord("signature", sig);
          throw new JobError("That code isn't right.", 400);
        }
        sig.status = "signed";
        sig.signedAt = nowIso();
        sig.codeHash = void 0;
        sig.audit = { name: s2("name") || sig.signer.name, phone: maskPhone(sig.signer.phone), at: sig.signedAt, ip: meta.ip ?? "unknown", userAgent: (meta.userAgent ?? "").slice(0, 200), hash: sig.hash };
        await this.c.store.putRecord("signature", sig);
        await this.afterSigned(j, sig, p);
        return { ok: true };
      }
      // Stage 4 — invoices, payment, dates
      case "create_invoice": {
        need("installer");
        const lines = input.lines ?? [];
        const kind = s2("kind") || "other";
        if (!["deposit", "final", "variation", "other"].includes(kind)) throw new JobError("Unknown invoice kind");
        const inv = await this.createInvoice(j, p, { kind, lines, dueDays: Number(input.dueDays ?? 7), notes: s2("notes"), via: input.via === "ai" ? "ai" : "form" });
        return { invoice: inv };
      }
      case "draft_invoice": {
        need("installer");
        const kind = s2("kind");
        const paid = (await this.invoices(j.id)).filter((i) => i.kind === "deposit").reduce((t, i) => t + i.payments.reduce((x, y) => x + y.amount, 0), 0);
        const lines = kind === "final" ? this.finalLines(j, paid) : this.depositLines(j);
        return { invoice: await this.createInvoice(j, p, { kind, lines, dueDays: kind === "final" ? 7 : 7, via: "auto" }) };
      }
      case "update_invoice": {
        need("installer");
        const inv = await this.c.store.getRecord("invoice", s2("invoiceId"));
        if (!inv || inv.jobId !== j.id) throw new JobError("Invoice not found", 404);
        if (inv.status !== "draft") throw new JobError("A sent invoice can't be changed. Issue an adjustment note instead.", 409);
        if (Array.isArray(input.lines)) inv.lines = input.lines.map((l) => ({ description: String(l.description).slice(0, 200), qty: Number(l.qty), unitExGst: round4(Number(l.unitExGst)), gst: !!l.gst }));
        if (input.notes !== void 0) inv.notes = s2("notes");
        if (input.dueDays !== void 0) inv.dueDate = addDays(inv.issueDate, Number(input.dueDays));
        inv.totals = invoiceTotals(inv.lines);
        await this.c.store.putRecord("invoice", inv);
        return { invoice: inv };
      }
      case "send_invoice": {
        need("installer");
        const inv = await this.c.store.getRecord("invoice", s2("invoiceId"));
        if (!inv || inv.jobId !== j.id) throw new JobError("Invoice not found", 404);
        if (inv.status !== "draft") throw new JobError("Already sent", 409);
        inv.status = "sent";
        inv.sentAt = nowIso();
        await this.c.store.putRecord("invoice", inv);
        if (j.customerEmail)
          await this.c.messaging.sendEmail({ to: j.customerEmail, subject: `Tax invoice ${inv.number} from ${j.seller.name}`, body: `Hi ${j.customerName.split(" ")[0]},

Your ${inv.kind} invoice ${inv.number} for ${money(inv.totals.total)} is ready. View and pay it in My Project.

${j.seller.name}` }).catch(() => void 0);
        await this.notify(j, "customer", `invoice ${inv.number} for ${money(inv.totals.total)} is ready to pay in My Project.`, p);
        await this.progress(j, p, `Invoice ${inv.number} sent (${money(inv.totals.total)})`, { kind: "message" });
        return { invoice: inv };
      }
      case "credit_invoice": {
        need("installer");
        const inv = await this.c.store.getRecord("invoice", s2("invoiceId"));
        if (!inv || inv.jobId !== j.id || inv.status === "draft") throw new JobError("Only a sent invoice can be adjusted", 409);
        const note = await this.createInvoice(j, p, { kind: "credit", creditFor: inv.number, lines: inv.lines.map((l) => ({ ...l, unitExGst: -l.unitExGst })), notes: s2("reason") || "Correction", via: "form" });
        return { invoice: note };
      }
      case "submit_payment_proof": {
        need("customer");
        const inv = await this.c.store.getRecord("invoice", s2("invoiceId"));
        if (!inv || inv.jobId !== j.id) throw new JobError("Invoice not found", 404);
        if (inv.status !== "sent") throw new JobError(inv.status === "paid" ? "Already paid" : "This invoice hasn't been sent yet", 409);
        if (!s2("fileId")) throw new JobError("Attach the screenshot of the transfer");
        const due = round2(inv.totals.total - inv.payments.reduce((t, x) => t + x.amount, 0));
        inv.payments.push({ at: nowIso(), amount: Number(input.amount ?? due), method: "Bank transfer (receipt)", ref: s2("ref") || inv.number, verified: false, receiptFileId: s2("fileId") });
        if (inv.payments.reduce((t, x) => t + x.amount, 0) >= inv.totals.total - 0.01) {
          inv.status = "paid";
          inv.paidAt = nowIso();
        }
        await this.c.store.putRecord("invoice", inv);
        const reach = inv.status === "paid" ? inv.kind === "deposit" ? ["deposit_paid"] : inv.kind === "final" ? ["final_paid"] : [] : [];
        await this.progress(j, p, `Bank transfer receipt received for ${inv.number}`, { reach, detail: "Accepted now; EasyLink confirms it against the bank statement", kind: "record" });
        await this.notify(j, "installer", `sent a bank transfer receipt for ${inv.number}.`, p);
        if (reach.includes("deposit_paid") && !j.windows.length) await this.offerWindows(j);
        return { invoice: inv };
      }
      case "verify_payment": {
        need("staff");
        const inv = await this.c.store.getRecord("invoice", s2("invoiceId"));
        if (!inv || inv.jobId !== j.id) throw new JobError("Invoice not found", 404);
        for (const x of inv.payments) if (x.verified === false) x.verified = true;
        await this.c.store.putRecord("invoice", inv);
        await this.progress(j, p, `Bank transfer for ${inv.number} confirmed on the statement`, { audience: "staff" });
        return { invoice: inv };
      }
      case "pay_invoice":
      case "record_payment": {
        if (action === "record_payment") need("staff");
        else need("customer");
        const inv = await this.c.store.getRecord("invoice", s2("invoiceId"));
        if (!inv || inv.jobId !== j.id) throw new JobError("Invoice not found", 404);
        if (inv.status !== "sent") throw new JobError(inv.status === "paid" ? "Already paid" : "This invoice hasn't been sent yet", 409);
        if (action === "pay_invoice" && process.env.AI_MODE !== "local") {
          const r = await this.c.backend.call("POST", "/payments/checkout", { invoiceNumber: inv.number, amount: inv.totals.total, jobId: j.id }, { token: meta.token ?? "" });
          return { payUrl: r.data?.url ?? null };
        }
        const due = round2(inv.totals.total - inv.payments.reduce((t, x) => t + x.amount, 0));
        inv.payments.push({ at: nowIso(), amount: Number(input.amount ?? due), method: s2("method") || (action === "pay_invoice" ? "Card (test)" : "EFT"), ref: s2("ref") || newId("pay_").slice(-8) });
        if (inv.payments.reduce((t, x) => t + x.amount, 0) >= inv.totals.total - 0.01) {
          inv.status = "paid";
          inv.paidAt = nowIso();
        }
        await this.c.store.putRecord("invoice", inv);
        const reach = inv.status === "paid" ? inv.kind === "deposit" ? ["deposit_paid"] : inv.kind === "final" ? ["final_paid"] : [] : [];
        await this.progress(j, p, `Payment received for ${inv.number} (${money(inv.payments.at(-1).amount)})`, { reach, kind: "record" });
        await this.notify(j, "installer", `paid ${inv.number}.`, p);
        if (reach.includes("deposit_paid") && !j.windows.length) await this.offerWindows(j);
        return { invoice: inv };
      }
      case "propose_windows": {
        need("installer");
        const w = input.windows ?? [];
        if (w.length) j.windows = w.slice(0, 3).map((x) => ({ id: newId("win_"), day1: x.day1, day2: x.day2 }));
        else await this.offerWindows(j);
        await this.progress(j, p, "Installation dates offered", { kind: "booking" });
        return { windows: j.windows };
      }
      case "pick_window": {
        need("customer");
        requires("deposit_paid");
        const w = j.windows.find((x) => x.id === s2("windowId"));
        if (!w) throw new JobError("Pick one of the offered dates");
        j.installDates = { day1: w.day1, day2: w.day2 };
        await this.progress(j, p, `Installation booked for ${fmtDay(w.day1)} and ${fmtDay(w.day2)}`, { reach: ["install_date_set"], kind: "booking" });
        await this.notify(j, "installer", `picked ${fmtDay(w.day1)}\u2013${fmtDay(w.day2)} for installation.`, p);
        return { ok: true };
      }
      // Stage 5 — connection
      case "submit_connection": {
        need("installer");
        requires("job_accepted");
        if (!s2("reference")) throw new JobError("Enter the DNSP's application reference");
        j.connection = { ...j.connection, status: "submitted", reference: s2("reference"), submittedAt: nowIso() };
        await this.progress(j, p, `Connection application submitted to ${j.connection.dnsp}`, { reach: ["connection_applied"], detail: `Reference ${s2("reference")}` });
        return { ok: true };
      }
      case "record_approval": {
        need("installer");
        requires("connection_applied");
        const limit = Number(input.exportLimitKw);
        if (!s2("number") || !Number.isFinite(limit)) throw new JobError("Enter the approval number and export limit");
        j.connection = { ...j.connection, status: "approved", approval: { number: s2("number"), exportLimitKw: limit, at: nowIso(), conditions: s2("conditions") || void 0 } };
        const lower = limit < j.selection.inverter.kw;
        await this.progress(j, p, `${j.connection.dnsp} approved the connection`, { reach: ["connection_approved"], detail: `Approval ${s2("number")}, export limit ${limit} kW${lower ? " \u2014 lower than the inverter size; savings re-checked" : ""}` });
        return { ok: true };
      }
      // Stage 6 — bills, quote, order, delivery
      case "request_bills": {
        need("installer");
        j.bills.requestedAt = nowIso();
        await this.progress(j, p, "Energy bills requested", { kind: "message" });
        await this.notify(j, "customer", "please upload your last 2\u20134 energy bills in My Project.", p);
        return { ok: true };
      }
      case "upload_bill": {
        need("customer", "installer");
        const b = { retailer: s2("retailer") || "Unknown retailer", nmi: s2("nmi") || void 0, tariff: s2("tariff") || "Flat", dailyKwh: Number(input.dailyKwh ?? 0), feedInCents: input.feedInCents != null ? Number(input.feedInCents) : void 0, period: s2("period") || "" };
        j.bills.items.push(b);
        if (!j.retailer) j.retailer = { name: b.retailer };
        if (b.nmi && !j.site.nmi) j.site.nmi = b.nmi;
        const yearly = b.dailyKwh * 365;
        j.bills.savingsBefore = j.selection.savingsPerYear;
        j.bills.savingsAfter = Math.round(Math.min(yearly, j.selection.annualOutputKwh) * (j.selection.battery ? 0.32 : 0.27));
        await this.progress(j, p, `Energy bill received (${b.retailer})`, { reach: ["bills_received"], detail: `${b.dailyKwh} kWh/day \xB7 ${b.tariff}`, kind: "file" });
        return { savingsBefore: j.bills.savingsBefore, savingsAfter: j.bills.savingsAfter };
      }
      case "confirm_quote": {
        need("installer");
        requires("bills_received");
        const changes = (input.changes ?? []).map((c) => String(c).slice(0, 200)).filter(Boolean);
        const newPrice = input.newPrice != null ? Number(input.newPrice) : j.selection.price;
        if (!changes.length && newPrice === j.selection.price) {
          await this.progress(j, p, "Quote confirmed \u2014 no changes after the bills", { reach: ["quote_final"] });
          return { ok: true };
        }
        const sig = await this.requestSignature(j, "quote_revision", `Quote revision ${j.quoteVersion + 1}`, revisionHtml(j, changes, newPrice), { who: "customer", id: j.customerId ?? j.leadId, name: j.customerName, phone: j.customerPhone });
        j.revisions.push({ version: j.quoteVersion + 1, at: nowIso(), changes, price: newPrice, status: "sent", signatureId: sig.id });
        await this.progress(j, p, `Quote revision ${j.quoteVersion + 1} sent for acceptance`, { detail: changes.join("; ") });
        await this.notify(j, "customer", "your quote changed after checking your bills. Please review and accept it in My Project.", p);
        return { signatureId: sig.id };
      }
      case "place_order": {
        need("installer");
        requires("quote_final");
        if (j.order.status !== "draft") throw new JobError("Already ordered", 409);
        j.order = { ...j.order, status: "placed", placedAt: nowIso(), ref: `SO-${await this.counter("order")}` };
        await this.progress(j, p, `Equipment ordered from the EasyLink warehouse (${j.order.ref})`, { audience: "related", kind: "record" });
        return { order: j.order };
      }
      case "pay_order": {
        need("installer");
        if (j.order.status !== "placed") throw new JobError("Place the order first", 409);
        j.order.status = "paid";
        j.order.paidAt = nowIso();
        if (!j.order.serials.length) j.order.serials = allocateSerials(j);
        await this.progress(j, p, "Equipment paid and being picked", { reach: ["equipment_paid"] });
        return { order: j.order };
      }
      case "book_delivery": {
        need("installer");
        requires("equipment_paid", "install_date_set");
        const window2 = s2("window") || `${fmtDay(addDays(j.installDates.day1, -1))}, 7 am \u2013 11 am`;
        j.delivery = { status: "booked", carrier: s2("carrier") || "EasyLink truck", window: window2, bookedAt: nowIso() };
        await this.progress(j, p, `Delivery booked: ${window2}`, { kind: "booking" });
        await this.notify(j, "customer", `your equipment arrives ${window2}.`, p);
        return { delivery: j.delivery };
      }
      case "mark_delivered": {
        need("installer");
        if (j.delivery.status !== "booked") throw new JobError("Book the delivery first", 409);
        j.delivery = { ...j.delivery, status: "delivered", pod: { at: nowIso(), note: s2("note") || "Delivered and signed for" } };
        await this.progress(j, p, "Equipment delivered", { reach: ["delivered"], detail: j.delivery.pod.note, kind: "booking" });
        return { delivery: j.delivery };
      }
      // Stage 7 — on site
      case "check_in": {
        need("installer");
        requires("delivered", "connection_approved");
        const day2 = Number(input.day) === 2 ? 2 : 1;
        if ((input.lat == null || input.lng == null) && v.who !== "staff") throw new JobError("Turn on location for this site so the check-in can be recorded.", 400);
        const lat = Number(input.lat ?? j.site.lat);
        const lng = Number(input.lng ?? j.site.lng);
        const km = haversine(lat, lng, j.site.lat, j.site.lng);
        if (km > 0.5) throw new JobError(`You're ${km.toFixed(1)} km from the site. Check in when you arrive.`, 409);
        j.onsite.checkins.push({ day: day2, at: nowIso(), lat, lng });
        await this.progress(j, p, `${j.installerName ?? "Installer"} arrived (day ${day2})`, { reach: day2 === 1 ? ["install_started"] : [], kind: "booking" });
        if (day2 === 1) await this.notify(j, "customer", `${j.installerName ?? "your installer"} has arrived.`, p);
        return { ok: true };
      }
      case "tick": {
        need("installer");
        const item = j.onsite.checklist.find((i) => i.key === s2("key"));
        if (!item) throw new JobError("Unknown checklist item");
        item.done = input.done !== false;
        item.at = nowIso();
        await this.save(j);
        return { item };
      }
      case "scan_serial": {
        need("installer");
        const serial = s2("serial").toUpperCase();
        if (!serial) throw new JobError("Scan or type a serial");
        if (j.onsite.scanned.some((x) => x.serial === serial)) throw new JobError("Already scanned", 409);
        const hit = j.order.serials.find((x) => x.serial === serial);
        const used = (await this.c.store.listRecords("job")).some((o) => o.id !== j.id && o.onsite.scanned.some((x) => x.serial === serial));
        j.onsite.scanned.push({ kind: hit?.kind ?? (s2("kind") || "panel"), serial, matched: !!hit && !used, at: nowIso() });
        await this.save(j);
        if (!hit) throw new JobError(`${serial} isn't on this job's order. Check the box or call the warehouse.`, 409);
        if (used) throw new JobError(`${serial} is already recorded on another job.`, 409);
        return { ok: true, scanned: j.onsite.scanned.length, expected: j.order.serials.length };
      }
      case "record_tests": {
        need("installer");
        const t = input;
        j.onsite.tests = {
          insulationMOhm: Number(t.insulationMOhm),
          vocPerString: (t.vocPerString ?? []).map(Number),
          iscPerString: (t.iscPerString ?? []).map(Number),
          earthOk: !!t.earthOk,
          exportLimitKw: Number(t.exportLimitKw ?? j.connection.approval?.exportLimitKw ?? 0),
          csipTest: ["passed", "failed", "not_required"].includes(String(t.csipTest)) ? t.csipTest : "not_required",
          at: nowIso()
        };
        if (j.connection.approval && j.onsite.tests.exportLimitKw > j.connection.approval.exportLimitKw) throw new JobError(`Export limit is above the approved ${j.connection.approval.exportLimitKw} kW`, 409);
        await this.save(j);
        return { tests: j.onsite.tests };
      }
      case "complete_install": {
        need("installer");
        requires("install_started");
        const missing = [
          ...j.onsite.checklist.filter((i) => !i.done).map((i) => i.label),
          ...j.onsite.tests ? [] : ["Test results"],
          ...j.onsite.tests && j.onsite.tests.insulationMOhm < 1 ? ["Insulation resistance below 1 M\u03A9"] : [],
          ...j.order.serials.length && j.order.serials.some((x) => !j.onsite.scanned.some((y) => y.serial === x.serial && y.matched)) ? [`${j.order.serials.filter((x) => !j.onsite.scanned.some((y) => y.serial === x.serial)).length} serials not scanned`] : []
        ];
        if (missing.length) throw new JobError(`Still to do: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "\u2026" : ""}`, 409);
        const sig = await this.requestSignature(j, "install_complete", "Installation complete", installCompleteHtml(j), { who: "customer", id: j.customerId ?? j.leadId, name: j.customerName, phone: j.customerPhone });
        j.onsite.customerSignatureId = sig.id;
        await this.save(j);
        return { signatureId: sig.id };
      }
      case "send_site_docs": {
        need("installer");
        requires("installed");
        let status = "sent";
        if (j.customerId && meta.token) {
          const r = await this.c.actions.run({ name: "start_workflow", input: { workflow: "job_completion_pack", inputs: { about: { type: "customer", id: j.customerId } } }, principal: p, auth: { token: meta.token }, user: meta.user }).catch((e) => ({ status: "failed", error: e.message }));
          status = String(r.status ?? "sent");
        }
        await this.progress(j, p, "Site documents sent to the customer and retailer", { reach: ["site_docs_sent"], detail: status === "proposed" ? "First send to this retailer waits for an EasyLink OK" : void 0, kind: "message" });
        return { status };
      }
      // Stage 8 — STCs and handover
      case "send_stc_pack": {
        need("installer");
        requires("installed");
        this.computeStc(j);
        const fails = j.stc.checks.filter((c) => !c.ok);
        if (fails.length) {
          await this.save(j);
          throw new JobError(`Fix before sending: ${fails.map((f) => f.label).join(", ")}`, 409);
        }
        const sig = await this.requestSignature(j, "stc_assignment", "STC assignment form", stcAssignmentHtml(j), { who: "customer", id: j.customerId ?? j.leadId, name: j.customerName, phone: j.customerPhone });
        j.stc.status = "sent_for_signature";
        j.stc.signatureId = sig.id;
        await this.progress(j, p, "STC pack sent to the customer to sign", { detail: `${j.stc.solar + j.stc.battery} STCs`, kind: "message" });
        await this.notify(j, "customer", "please sign your STC assignment form in My Project.", p);
        return { signatureId: sig.id };
      }
      case "lodge_stc": {
        need("installer");
        requires("stc_pack_signed");
        j.stc.status = "lodged";
        j.stc.agentRef = s2("agentRef") || `STC-${await this.counter("stc")}`;
        j.stc.lodgedAt = nowIso();
        await this.progress(j, p, `STCs lodged with the agent (${j.stc.agentRef})`, { reach: ["stc_lodged"], detail: "Validation usually takes 4\u20136 weeks" });
        return { agentRef: j.stc.agentRef };
      }
      case "send_handover": {
        need("installer");
        requires("final_paid", "stc_pack_signed");
        const sigs = (await this.signatures(j.id)).filter((x) => x.status === "signed");
        const invs = (await this.invoices(j.id)).filter((i) => i.status !== "draft");
        j.handover = {
          sentAt: nowIso(),
          documents: [
            ...sigs.map((x) => `${x.title} (signed)`),
            ...invs.map((i) => `${i.kind === "credit" ? "Adjustment note" : "Tax invoice"} ${i.number}`),
            "Manufacturer warranties with serials",
            "Workmanship warranty certificate",
            "Certificate of electrical safety",
            "Single-line diagram",
            "Commissioning and test results",
            "User manuals and shutdown procedure",
            "Maintenance schedule",
            "Monitoring app guide"
          ]
        };
        if (j.customerEmail)
          await this.c.messaging.sendEmail({ to: j.customerEmail, subject: "Your solar handover pack", body: `Hi ${j.customerName.split(" ")[0]},

Everything for your new system is in My Project \u2192 Everything:

- ${j.handover.documents.join("\n- ")}

${j.seller.name}` }).catch(() => void 0);
        await this.progress(j, p, `Handover pack sent (${j.handover.documents.length} documents)`, { reach: ["handover_sent"], kind: "message" });
        return { handover: j.handover };
      }
      // Stage 9 — monitoring
      case "link_monitoring": {
        need("installer");
        j.monitoring.provider = s2("provider") || j.monitoring.provider;
        j.monitoring.linkedAt = nowIso();
        await this.progress(j, p, `Monitoring linked (${j.monitoring.provider})`);
        return { ok: true };
      }
      case "record_reading": {
        need("staff");
        const d = { date: s2("date") || nowIso().slice(0, 10), kwh: Number(input.kwh), expectedKwh: Number(input.expectedKwh), online: input.online !== false, faults: (input.faults ?? []).map(String) };
        j.monitoring.days = [...j.monitoring.days.filter((x) => x.date !== d.date), d].sort((a, b) => a.date.localeCompare(b.date));
        const issues = siteWatch(d);
        for (const t of issues) j.monitoring.issues.push({ at: nowIso(), text: t, status: "open" });
        const clear = j.monitoring.days.length >= 3 && j.monitoring.days.slice(-3).every((x) => !siteWatch(x).length) && !j.monitoring.issues.some((i) => i.status === "open");
        await this.progress(j, p, `Day ${j.monitoring.days.length}: ${d.kwh} kWh (${Math.round(d.kwh / Math.max(d.expectedKwh, 0.1) * 100)}% of expected)${issues.length ? ` \u2014 ${issues.join("; ")}` : ""}`, {
          reach: clear ? ["monitoring_clear"] : [],
          kind: issues.length ? "warning" : "record"
        });
        if (clear) j.phase = "MAINTENANCE_AND_MONITORING";
        await this.save(j);
        return { issues };
      }
      case "resolve_issue": {
        need("installer");
        const i = Number(input.index);
        if (!j.monitoring.issues[i]) throw new JobError("Unknown issue");
        j.monitoring.issues[i].status = "fixed";
        await this.progress(j, p, `Fixed: ${j.monitoring.issues[i].text}`);
        return { ok: true };
      }
      default:
        throw new JobError(`Unknown step: ${action}`, 404);
    }
  }
  async offerWindows(j) {
    const out = [];
    let d = new Date(Date.now() + 5 * 864e5);
    while (out.length < 3) {
      const a = new Date(d);
      const b = new Date(d.getTime() + 864e5);
      if (a.getUTCDay() >= 1 && a.getUTCDay() <= 4) out.push({ id: newId("win_"), day1: a.toISOString().slice(0, 10), day2: b.toISOString().slice(0, 10) });
      d = new Date(d.getTime() + (a.getUTCDay() >= 1 && a.getUTCDay() <= 4 ? 7 : 1) * 864e5);
    }
    j.windows = out;
    await this.save(j);
  }
  computeStc(j) {
    const date = j.onsite.completeAt ?? j.installDates?.day2 ?? nowIso();
    j.stc.deemingYears = deemingYears(date);
    j.stc.batteryFactor = batteryFactor(date);
    j.stc.solar = solarStcs(j.selection.kw, j.site.zoneRating, date);
    j.stc.battery = j.selection.battery ? batteryStcs(j.selection.battery.usableKwh, date) : 0;
    const scanned = (k) => j.onsite.scanned.filter((x) => x.kind === k && x.matched).length;
    const expected = (k) => j.order.serials.filter((x) => x.kind === k).length;
    j.stc.deadline = addDays(date, 365).slice(0, 10);
    j.stc.checks = [
      { label: "Every panel serial scanned on the product", ok: expected("panel") > 0 && scanned("panel") >= expected("panel"), detail: `${scanned("panel")} of ${expected("panel")}` },
      { label: "Inverter serial scanned", ok: scanned("inverter") >= expected("inverter") && expected("inverter") > 0 },
      ...j.selection.battery ? [{ label: "Battery serial and safety labels", ok: scanned("battery") >= expected("battery") && !!j.onsite.checklist.find((i) => i.key === "battery_labels")?.done }] : [],
      { label: "Installer on-site photo, geotagged", ok: j.onsite.checkins.length > 0 },
      { label: "Customer signed installation complete", ok: !!j.milestones.installed },
      { label: "Zone rating confirmed for the postcode", ok: j.site.zoneConfirmed, detail: `${j.site.postcode}: ${j.site.zoneRating}` },
      { label: "Inside the 12-month creation window", ok: nowIso().slice(0, 10) <= j.stc.deadline, detail: `by ${j.stc.deadline}` }
    ];
    if (j.stc.status === "not_started") j.stc.status = "ready";
  }
  async afterSigned(j, sig, p) {
    switch (sig.kind) {
      case "agreement": {
        await this.progress(j, p, "Agreement signed", { reach: ["agreement_signed"], kind: "file" });
        await this.createInvoice(j, { kind: "system", id: "jobs", roles: [], on_behalf_of: null }, { kind: "deposit", lines: this.depositLines(j), via: "auto" });
        await this.notify(j, "installer", "signed the agreement. The deposit invoice is ready to send.", p);
        break;
      }
      case "quote_revision": {
        const r = j.revisions.find((x) => x.signatureId === sig.id);
        if (r) {
          r.status = "accepted";
          j.selection.price = r.price;
          j.quoteVersion = r.version;
        }
        await this.progress(j, p, `Quote revision ${j.quoteVersion} accepted`, { reach: ["quote_final"], kind: "file" });
        break;
      }
      case "install_complete": {
        j.onsite.completeAt = nowIso();
        j.phase = "COMMISSIONING";
        this.computeStc(j);
        await this.progress(j, p, "Installation complete \u2014 signed by the customer", { reach: ["installed"], kind: "file" });
        const paid = (await this.invoices(j.id)).filter((i) => i.kind === "deposit").reduce((t, i) => t + i.payments.reduce((x, y) => x + y.amount, 0), 0);
        await this.createInvoice(j, { kind: "system", id: "jobs", roles: [], on_behalf_of: null }, { kind: "final", lines: this.finalLines(j, paid), via: "auto" });
        break;
      }
      case "stc_assignment": {
        j.stc.status = "signed";
        await this.progress(j, p, "STC assignment signed", { reach: ["stc_pack_signed"], kind: "file" });
        await this.notify(j, "installer", "signed the STC assignment. You can lodge it now.", p);
        break;
      }
    }
  }
};
function siteWatch(d) {
  const out = [];
  if (!d.online) out.push("Inverter offline for part of the day \u2014 check Wi-Fi");
  if (d.expectedKwh > 0 && d.kwh < 0.8 * d.expectedKwh) out.push(`Output ${Math.round(d.kwh / d.expectedKwh * 100)}% of expected \u2014 check strings and shading`);
  for (const f of d.faults) out.push(`Fault: ${f}`);
  return out;
}
function haversine(a1, o1, a2, o2) {
  const r = (x) => x * Math.PI / 180;
  const h = Math.sin(r(a2 - a1) / 2) ** 2 + Math.cos(r(a1)) * Math.cos(r(a2)) * Math.sin(r(o2 - o1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
function fmtDay(iso) {
  return new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Sydney" });
}
function allocateSerials(j) {
  const base = j.id.replace(/[^A-Z0-9]/gi, "").slice(-4).toUpperCase();
  return [
    ...Array.from({ length: j.selection.panels.count }, (_, i) => ({ kind: "panel", serial: `JKM${base}${String(i + 1).padStart(4, "0")}` })),
    { kind: "inverter", serial: `INV${base}0001` },
    ...j.selection.battery ? [{ kind: "battery", serial: `BAT${base}0001` }] : []
  ];
}

// src/history/timeline.ts
init_envelope();
var pretty = (s2) => String(s2 ?? "").replace(/_/g, " ");
function lineFor(evt) {
  const d = evt.data;
  switch (evt.type) {
    case "file.uploaded":
      return { kind: "file", title: `Uploaded ${pretty(d.fileName ?? "a file")}`, files: [{ id: evt.subject.id, name: d.fileName }], audience: "related" };
    case "file.classified": {
      const labels = d.labels ?? [];
      const fields = d.fields ?? [];
      if (!labels.length && !fields.includes("aiLabels")) return null;
      return { kind: "ai", title: `AI read the file${labels[0] ? `: ${pretty(labels[0].label)}` : ""}`, files: [{ id: evt.subject.id }], audience: "related" };
    }
    case "document.issue_found":
      return { kind: "warning", title: "Not sent: the file didn't pass the safety checks", detail: String(d.reason ?? ""), files: [{ id: evt.subject.id }], audience: "related" };
    case "document.delivered":
      return null;
    // the message line below carries it
    case "email.sent":
    case "sms.sent":
    case "message.sent": {
      const channel = evt.type === "email.sent" ? "email" : evt.type === "sms.sent" ? "SMS" : "the portal";
      const name = String(d.to_name ?? `${evt.subject.type}`);
      const files = Array.isArray(d.files) ? d.files.map((f) => typeof f === "string" ? { id: f } : f) : [];
      return {
        kind: "message",
        title: `Sent to ${name}${d.role ? ` (${pretty(d.role)})` : ""} by ${channel}${files.length ? ` with ${files.length} file${files.length > 1 ? "s" : ""}` : ""}`,
        detail: d.subject ? String(d.subject) : void 0,
        files,
        messageId: d.message_copy_id,
        audience: "related",
        extraRecords: Array.isArray(d.records) ? d.records : []
      };
    }
    case "message.delivered":
    case "message.opened":
    case "message.bounced":
    case "message.failed":
      return {
        kind: evt.type === "message.bounced" || evt.type === "message.failed" ? "warning" : "message",
        title: `Message ${evt.type.split(".")[1]}${d.to_name ? ` (${d.to_name})` : ""}`,
        detail: d.reason ? String(d.reason) : void 0,
        messageId: d.message_copy_id,
        audience: "related",
        extraRecords: Array.isArray(d.records) ? d.records : []
      };
    case "file.downloaded":
      return { kind: "file", title: `Opened ${pretty(d.fileName ?? "a file")}${d.by_name ? ` (${d.by_name})` : ""}`, files: [{ id: evt.subject.id, name: d.fileName }], audience: "related" };
    case "installer.assigned":
      return { kind: "assignment", title: `${d.installer_name ?? "An installer"} assigned`, detail: d.reason ? String(d.reason) : void 0, audience: "related", extraRecords: [{ type: "user", id: String(d.installer_id) }] };
    case "installer.unassigned":
      return { kind: "assignment", title: `${d.installer_name ?? "Previous installer"} no longer assigned`, audience: "related" };
    case "installer.change_requested":
      return { kind: "assignment", title: "Asked EasyLink for a different installer", detail: d.reason ? String(d.reason) : void 0, audience: "related" };
    case "job.progressed":
      return { kind: String(d.kind ?? "record"), title: String(d.title ?? "Job updated"), detail: d.detail ? String(d.detail) : void 0, audience: d.audience === "staff" ? "staff" : "related" };
    case "lead.created":
      return { kind: "record", title: "Enquiry received", audience: "related" };
    case "lead.updated":
    case "lead.qualified":
    case "lead.lost": {
      const fields = d.fields ?? [];
      return { kind: "record", title: evt.type === "lead.qualified" ? "Project qualified" : evt.type === "lead.lost" ? "Project closed" : `Project updated${fields.length ? `: ${fields.join(", ")}` : ""}`, audience: "related" };
    }
    case "lead.converted":
    case "customer.created":
      return { kind: "record", title: "Customer account created", audience: "related" };
    case "appointment.booked":
    case "appointment.moved":
    case "appointment.cancelled":
      return { kind: "booking", title: `Appointment ${evt.type.split(".")[1]}`, detail: d.startsAt ? String(d.startsAt) : void 0, audience: "related" };
    case "call.transcribed":
      return { kind: "call", title: "Phone call", detail: d.summary ? String(d.summary).slice(0, 300) : void 0, audience: "related" };
    case "ai.proposed":
      return { kind: "approval", title: "Waiting for an EasyLink approval", detail: d.action ? pretty(d.action) : void 0, audience: "related" };
    case "ai.corrected":
      return { kind: "approval", title: "EasyLink declined an AI proposal", detail: d.reason ? String(d.reason) : void 0, audience: "staff" };
    case "ai.escalated":
      return { kind: "approval", title: "Question for EasyLink staff", audience: "staff" };
    default:
      return null;
  }
}
var TimelineWriter = class {
  constructor(deps) {
    this.deps = deps;
  }
  deps;
  names = /* @__PURE__ */ new Map();
  async name(kind, id) {
    if (kind === "agent") return "EasyLink AI";
    if (kind === "system" || kind === "integration") return "EasyLink";
    if (kind === "visitor") return "Website visitor";
    if (this.names.has(id)) return this.names.get(id);
    const r = await this.deps.backend.get("user", id, { token: this.deps.serviceToken }).catch(() => null);
    const n = r?.data ? [r.data.firstName, r.data.lastName].filter(Boolean).join(" ") || String(r.data.name ?? "") : "";
    if (n) this.names.set(id, n);
    return n || void 0;
  }
  /** The project a record belongs to, so a document's line also shows on its customer. */
  async related(ref2) {
    if (ref2.type !== "document" && ref2.type !== "appointment" && ref2.type !== "task" && ref2.type !== "note") return [];
    const r = await this.deps.backend.get(ref2.type, ref2.id, { token: this.deps.serviceToken }).catch(() => null);
    const out = [];
    if (r?.data?.customerId) out.push({ type: "customer", id: String(r.data.customerId) });
    if (r?.data?.leadId) out.push({ type: "lead", id: String(r.data.leadId) });
    return out;
  }
  async index(evt) {
    const line = lineFor(evt);
    if (!line) return null;
    const { extraRecords = [], ...rest } = line;
    const records = [evt.subject, ...evt.links, ...extraRecords];
    for (const r of [...records]) records.push(...await this.related(r));
    for (const f of rest.files ?? []) records.push(...await this.related({ type: "document", id: f.id }));
    const uniq = records.filter((r, i) => r?.id && records.findIndex((x) => x.type === r.type && x.id === r.id) === i);
    const item = {
      ...rest,
      id: newId("tl_"),
      at: evt.occurred_at,
      actor: { kind: evt.principal.kind, id: evt.principal.id, name: await this.name(evt.principal.kind, evt.principal.id) },
      records: uniq,
      eventId: evt.event_id
    };
    await this.deps.store.putTimeline(item);
    return item;
  }
};

// src/container.ts
init_finder();
function buildContainer(over = {}) {
  const local = process.env.AI_MODE === "local";
  const store = over.store ?? (local ? new MemoryStore() : new DynamoStore(process.env.AI_TABLE ?? "easylink-ai"));
  const bus = over.bus ?? (local ? new MemoryBus() : new EventBridgeBus());
  const backend = new OverlayBackend(over.backend ?? (local ? new FakeBackend() : new HttpBackend()), store);
  const messaging = over.messaging ?? (local ? new FakeMessaging() : new AwsMessaging());
  const files = over.files ?? (local ? new FakeFileLinks() : new S3FileLinks());
  const model = over.model ?? (local ? new FakeModel() : new BedrockModel());
  const serviceToken = over.serviceToken ?? process.env.AI_SERVICE_TOKEN ?? (local ? "svc-local" : "");
  const ingestKey = over.ingestKey ?? process.env.EVENT_INGEST_KEY ?? (local ? "ingest-local" : "");
  if (!serviceToken) throw new Error("AI_SERVICE_TOKEN is not set");
  const bytes = over.bytes ?? new AnyFileBytes();
  const web = over.web ?? (process.env.SEARCH_API_KEY ? new BraveWebSearch() : local ? new FakeWebSearch() : void 0);
  const contacts = web ? new ContactFinder({ web, model, backend, store, serviceToken, now: over.now }) : null;
  const relations = new Relations({ store, backend, serviceToken });
  let jobsSvc = null;
  const actions = new ActionService({ store, bus, backend, messaging, files, serviceToken, bytes, contacts: contacts ?? void 0, relations, now: over.now, jobs: () => jobsSvc });
  const classifier = new FileClassifier({ model, backend, actions, store, bytes, serviceToken });
  const runtime = new AiRuntime({ store, actions, model, classifier, now: over.now });
  const timeline = new TimelineWriter({ store, backend, serviceToken });
  if (bus instanceof MemoryBus) {
    bus.subscribe((e) => timeline.index(e).then(() => void 0, (err) => console.error("timeline", err)));
    bus.subscribe((e) => void runtime.handle(e));
  }
  const c = { store, bus, backend, messaging, files, model, actions, runtime, classifier, contacts, relations, timeline, serviceToken, ingestKey };
  jobsSvc = new JobService(c);
  return c;
}

// src/handlers/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
async function loadSecrets() {
  const map = {
    AI_SERVICE_TOKEN: process.env.SECRETS_SERVICE_TOKEN_ARN,
    EVENT_INGEST_KEY: process.env.SECRETS_INGEST_KEY_ARN,
    SEARCH_API_KEY: process.env.SECRETS_SEARCH_KEY_ARN,
    VOICE_KEY: process.env.SECRETS_VOICE_KEY_ARN
  };
  const sm = new SecretsManagerClient({ region: process.env.AWS_REGION ?? "ap-southeast-2" });
  await Promise.all(
    Object.entries(map).map(async ([name, arn]) => {
      if (!arn || process.env[name]) return;
      const r = await sm.send(new GetSecretValueCommand({ SecretId: arn }));
      if (r.SecretString) process.env[name] = r.SecretString;
    })
  );
}

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()) } }).formData();
};

// node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const mediaType = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return parseFormData(request, {
    all,
    dot
  });
  return {};
};
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
  const formData = await formDataPromise;
  if (formData) return convertFormDataToBodyData(formData, options);
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    if (!(options.all || key.endsWith("[]"))) form[key] = value;
    else handleParsingAllValues(form, key, value);
  });
  if (options.dot) Object.entries(form).forEach(([key, value]) => {
    if (key.includes(".")) {
      handleParsingNestedValues(form, key, value, nestingState);
      delete form[key];
    }
  });
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) form[key].push(value);
    else form[key] = [form[key], value];
  } else if (!key.endsWith("[]")) form[key] = value;
  else form[key] = [value];
};
var handleParsingNestedValues = (form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) return;
  let nestedForm = form;
  const keys = key.split(".", 34);
  if (keys.length > 33) throwNestingLimitExceeded();
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) nestedForm[key2] = value;
    else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};
var throwNestingLimitExceeded = () => {
  throw new Error("Nesting limit exceeded");
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") paths.shift();
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return {
    groups,
    path
  };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) if (paths[j].includes(mark)) {
      paths[j] = paths[j].replace(mark, groups[i][1]);
      break;
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") return "*";
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [
        cacheKey,
        match2[1],
        new RegExp(`^${match2[2]}(?=/${next})`)
      ] : [
        label,
        match2[1],
        new RegExp(`^${match2[2]}$`)
      ];
      else patternCache[cacheKey] = [
        label,
        match2[1],
        true
      ];
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) break;
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) sub = mergePath(sub, ...rest);
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
    else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") results.push("/");
        else results.push(basePath);
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else basePath += "/" + segment;
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value) => {
  if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
  return tryDecodeURIComponent(value);
};
var _getQueryParam = (url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) url = url.slice(0, hashIndex);
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) return;
    if (!url.startsWith(key, keyIndex2 + 1)) keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) return "";
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) return;
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
    if (encoded) name = _decodeURI(name);
    keyIndex = nextKeyIndex;
    if (name === "") continue;
    let value;
    if (valueIndex === -1) value = "";
    else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) value = _decodeURI(value);
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
      results[name].push(value);
    } else results[name] ??= value;
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
  * `.raw` can get the raw Request object.
  *
  * @see {@link https://hono.dev/docs/api/request#raw}
  *
  * @example
  * ```ts
  * // For Cloudflare Workers
  * app.post('/', async (c) => {
  *   const metadata = c.req.raw.cf?.hostMetadata?
  *   ...
  * })
  * ```
  */
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
  * `.path` can get the pathname of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#path}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const pathname = c.req.path // `/about/me`
  * })
  * ```
  */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) return this.raw.headers.get(name) ?? void 0;
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) return cachedBody;
    for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
      if (anyCachedKey === "json") body = JSON.stringify(body);
      const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
      return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
    });
    return bodyCache[key] = raw2[key]();
  };
  /**
  * `.json()` can parse Request body of type `application/json`
  *
  * @see {@link https://hono.dev/docs/api/request#json}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.json()
  * })
  * ```
  */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
  * `.text()` can parse Request body of type `text/plain`
  *
  * @see {@link https://hono.dev/docs/api/request#text}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.text()
  * })
  * ```
  */
  text() {
    return this.#cachedBody("text");
  }
  /**
  * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
  *
  * @see {@link https://hono.dev/docs/api/request#arraybuffer}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.arrayBuffer()
  * })
  * ```
  */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
  * `.bytes()` parses the request body as a `Uint8Array`.
  *
  * @see {@link https://hono.dev/docs/api/request#bytes}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.bytes()
  * })
  * ```
  */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
  * Parses the request body as a `Blob`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.blob();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#blob
  */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
  * Parses the request body as `FormData`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.formData();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#formdata
  */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
  * Adds validated data to the request.
  *
  * @param target - The target of the validation.
  * @param data - The validated data to add.
  */
  addValidatedData(target, data) {
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
  * `.url` can get the request url strings.
  *
  * @see {@link https://hono.dev/docs/api/request#url}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const url = c.req.url // `http://localhost:8787/about/me`
  *   ...
  * })
  * ```
  */
  get url() {
    return this.raw.url;
  }
  /**
  * `.method` can get the method name of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#method}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const method = c.req.method // `GET`
  * })
  * ```
  */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
  * `.matchedRoutes` can return a matched route in the handler
  *
  * @deprecated
  *
  * Use matchedRoutes helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#matchedroutes}
  *
  * @example
  * ```ts
  * app.use('*', async function logger(c, next) {
  *   await next()
  *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
  *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
  *     console.log(
  *       method,
  *       ' ',
  *       path,
  *       ' '.repeat(Math.max(10 - path.length, 0)),
  *       name,
  *       i === c.req.routeIndex ? '<- respond from here' : ''
  *     )
  *   })
  * })
  * ```
  */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
  * `.routePath` can retrieve the path registered within the handler
  *
  * @deprecated
  *
  * Use routePath helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#routepath}
  *
  * @example
  * ```ts
  * app.get('/posts/:id', (c) => {
  *   return c.json({ path: c.req.routePath })
  * })
  * ```
  */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) str = str.toString();
    if (str instanceof Promise) str = await str;
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) return Promise.resolve(str);
  if (buffer) buffer[0] += str;
  else buffer = [str];
  const resStr = Promise.all(callbacks.map((c) => c({
    phase,
    buffer,
    context
  }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))).then(() => buffer[0]));
  if (preserveCallbacks) return raw(await resStr, callbacks);
  else return resStr;
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
  * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
  *
  * @see {@link https://hono.dev/docs/api/context#env}
  *
  * @example
  * ```ts
  * // Environment object for Cloudflare Workers
  * app.get('*', async c => {
  *   const counter = c.env.COUNTER
  * })
  * ```
  */
  env = {};
  #var;
  finalized = false;
  /**
  * `.error` can get the error object from the middleware if the Handler throws an error.
  *
  * @see {@link https://hono.dev/docs/api/context#error}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   await next()
  *   if (c.error) {
  *     // do something...
  *   }
  * })
  * ```
  */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
  * Creates an instance of the Context class.
  *
  * @param req - The Request object.
  * @param options - Optional configuration options for the context.
  */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
  * `.req` is the instance of {@link HonoRequest}.
  */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#event}
  * The FetchEvent associated with the current request.
  *
  * @throws Will throw an error if the context does not have a FetchEvent.
  */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no FetchEvent");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#executionctx}
  * The ExecutionContext associated with the current request.
  *
  * @throws Will throw an error if the context does not have an ExecutionContext.
  */
  get executionCtx() {
    if (this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no ExecutionContext");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#res}
  * The Response object for the current request.
  */
  get res() {
    return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
  }
  /**
  * Sets the Response object for the current request.
  *
  * @param _res - The Response object to set.
  */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") continue;
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
        } else _res.headers.set(k, v);
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
  * `.render()` can create a response within a layout.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   return c.render('Hello!')
  * })
  * ```
  */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
  * Sets the layout for the response.
  *
  * @param layout - The layout to set.
  * @returns The layout function.
  */
  setLayout = (layout) => this.#layout = layout;
  /**
  * Gets the current layout for the response.
  *
  * @returns The current layout function.
  */
  getLayout = () => this.#layout;
  /**
  * `.setRenderer()` can set the layout in the custom middleware.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```tsx
  * app.use('*', async (c, next) => {
  *   c.setRenderer((content) => {
  *     return c.html(
  *       <html>
  *         <body>
  *           <p>{content}</p>
  *         </body>
  *       </html>
  *     )
  *   })
  *   await next()
  * })
  * ```
  */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
  * `.header()` can set headers.
  *
  * @see {@link https://hono.dev/docs/api/context#header}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *
  *   // Append multiple headers using the append option (e.g. Vary)
  *   c.header('Vary', 'Accept-Encoding', { append: true })
  *   c.header('Vary', 'User-Agent', { append: true })
  *
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  header = (name, value, options) => {
    if (this.finalized) this.#res = createResponseInstance(this.#res.body, this.#res);
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) headers.delete(name);
    else if (options?.append) headers.append(name, value);
    else headers.set(name, value);
  };
  status = (status) => {
    this.#status = status;
  };
  /**
  * `.set()` can set the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   c.set('message', 'Hono is hot!!')
  *   await next()
  * })
  * ```
  */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
  * `.get()` can use the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   const message = c.get('message')
  *   return c.text(`The message is "${message}"`)
  * })
  * ```
  */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
  * `.var` can access the value of a variable.
  *
  * @see {@link https://hono.dev/docs/api/context#var}
  *
  * @example
  * ```ts
  * const result = c.var.client.oneMethod()
  * ```
  */
  get var() {
    if (!this.#var) return {};
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
      else responseHeaders.set(key, value);
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) if (++count > 1 || typeof headers[k] !== "string") {
          responseHeaders = new Headers();
          break;
        }
      }
      if (responseHeaders) for (const k in headers) {
        const v = headers[k];
        if (typeof v === "string") responseHeaders.set(k, v);
        else {
          responseHeaders.delete(k);
          for (const v2 of v) responseHeaders.append(k, v2);
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
  * `.body()` can return the HTTP response.
  * You can set headers with `.header()` and set HTTP status code with `.status`.
  * This can also be set in `.text()`, `.json()` and so on.
  *
  * @see {@link https://hono.dev/docs/api/context#body}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *   // Set HTTP status code
  *   c.status(201)
  *
  *   // Return the response body
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
  * `.text()` can render text as `Content-Type:text/plain`.
  *
  * @see {@link https://hono.dev/docs/api/context#text}
  *
  * @example
  * ```ts
  * app.get('/say', (c) => {
  *   return c.text('Hello!')
  * })
  * ```
  */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
  };
  /**
  * `.json()` can render JSON as `Content-Type:application/json`.
  *
  * @see {@link https://hono.dev/docs/api/context#json}
  *
  * @example
  * ```ts
  * app.get('/api', (c) => {
  *   return c.json({ message: 'Hello!' })
  * })
  * ```
  */
  json = (object, arg, headers) => {
    return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
  * `.redirect()` can Redirect, default status code is 302.
  *
  * @see {@link https://hono.dev/docs/api/context#redirect}
  *
  * @example
  * ```ts
  * app.get('/redirect', (c) => {
  *   return c.redirect('/')
  * })
  * app.get('/redirect-permanently', (c) => {
  *   return c.redirect('/', 301)
  * })
  * ```
  */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
    return this.newResponse(null, status ?? 302);
  };
  /**
  * `.notFound()` can return the Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/context#notfound}
  *
  * @example
  * ```ts
  * app.get('/notfound', (c) => {
  *   return c.notFound()
  * })
  * ```
  */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      let res;
      let isError = false;
      let handler2;
      if (middleware[i]) {
        handler2 = middleware[i][0][0];
        context.req.routeIndex = i;
      } else handler2 = i === middleware.length && next || void 0;
      if (handler2) try {
        res = await handler2(context, () => dispatch(i + 1));
      } catch (err) {
        if (err instanceof Error && onError) {
          context.error = err;
          res = await onError(err, context);
          isError = true;
        } else throw err;
      }
      else if (context.finalized === false && onNotFound) res = await onNotFound(context);
      if (res && (context.finalized === false || isError)) context.res = res;
      return context;
    }
  };
};

// node_modules/hono/dist/router.js
var METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
  "query"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class Hono2 {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    [...METHODS, "all"].forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") this.#path = args1;
        else this.#addRoute(methodName, this.#path, args1);
        args.forEach((handler2) => {
          this.#addRoute(methodName, this.#path, handler2);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler2 of handlers) this.#addRoute(methodName, this.#path, handler2);
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") this.#path = arg1;
      else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler2) => {
        this.#addRoute("ALL", this.#path, handler2);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono2({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  /**
  * `.route()` allows grouping other Hono instance in routes.
  *
  * @see {@link https://hono.dev/docs/api/routing#grouping}
  *
  * @param {string} path - base Path
  * @param {Hono} app - other Hono instance
  * @returns {Hono} routed Hono instance
  *
  * @example
  * ```ts
  * const app = new Hono()
  * const app2 = new Hono()
  *
  * app2.get("/user", (c) => c.text("user"))
  * app.route("/api", app2) // GET /api/user
  * ```
  */
  route(path, app) {
    const subApp = this.basePath(path);
    app.routes.map((r) => {
      let handler2;
      if (app.errorHandler === errorHandler) handler2 = r.handler;
      else {
        handler2 = async (c, next) => (await compose([], app.errorHandler)(c, () => r.handler(c, next))).res;
        handler2[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler2, r.basePath);
    });
    return this;
  }
  /**
  * `.basePath()` allows base paths to be specified.
  *
  * @see {@link https://hono.dev/docs/api/routing#base-path}
  *
  * @param {string} path - base Path
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * const api = new Hono().basePath('/api')
  * ```
  */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
  * `.onError()` handles an error and returns a customized Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#error-handling}
  *
  * @param {ErrorHandler} handler - request Handler for error
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.onError((err, c) => {
  *   console.error(`${err}`)
  *   return c.text('Custom Error Message', 500)
  * })
  * ```
  */
  onError = (handler2) => {
    this.errorHandler = handler2;
    return this;
  };
  /**
  * `.notFound()` allows you to customize a Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#not-found}
  *
  * @param {NotFoundHandler} handler - request handler for not-found
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.notFound((c) => {
  *   return c.text('Custom 404 Message', 404)
  * })
  * ```
  */
  notFound = (handler2) => {
    this.#notFoundHandler = handler2;
    return this;
  };
  /**
  * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
  *
  * @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
  *
  * @see {@link https://hono.dev/docs/api/hono#mount}
  *
  * @param {string} path - base Path
  * @param {Function} applicationHandler - other Request Handler
  * @param {MountOptions} [options] - options of `.mount()`
  * @returns {Hono} mounted Hono instance
  *
  * @example
  * ```ts
  * import { Router as IttyRouter } from 'itty-router'
  * import { Hono } from 'hono'
  * // Create itty-router application
  * const ittyRouter = IttyRouter()
  * // GET /itty-router/hello
  * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
  *
  * const app = new Hono()
  * app.mount('/itty-router', ittyRouter.handle)
  * ```
  *
  * @example
  * ```ts
  * const app = new Hono()
  * // Send the request to another application without modification.
  * app.mount('/app', anotherApp, {
  *   replaceRequest: (req) => req,
  * })
  * ```
  */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") optionHandler = options;
      else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) replaceRequest = (request) => request;
        else replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler2 = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) return res;
      await next();
    };
    this.#addRoute("ALL", mergePath(path, "*"), handler2);
    return this;
  }
  #addRoute(method, path, handler2, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler: handler2
    };
    this.router.add(method, path, [handler2, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) return this.errorHandler(err, c);
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
  * `.fetch()` will be entry point of your app.
  *
  * @see {@link https://hono.dev/docs/api/hono#fetch}
  *
  * @param {Request} request - request Object of request
  * @param {Env} env - env Object
  * @param {ExecutionContext} executionCtx - context of execution
  * @returns {Response | Promise<Response>} response of request
  *
  */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
  * `.request()` is a useful method for testing.
  * You can pass a URL or pathname to send a GET request.
  * app will return a Response object.
  * ```ts
  * test('GET /hello is ok', async () => {
  *   const res = await app.request('/hello')
  *   expect(res.status).toBe(200)
  * })
  * ```
  * @see https://hono.dev/docs/api/hono#request
  */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  };
  /**
  * `.fire()` automatically adds a global fetch event listener.
  * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
  * @deprecated
  * Use `fire` from `hono/service-worker` instead.
  * ```ts
  * import { Hono } from 'hono'
  * import { fire } from 'hono/service-worker'
  *
  * const app = new Hono()
  * // ...
  * fire(app)
  * ```
  * @see https://hono.dev/docs/api/hono#fire
  * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
  */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/utils.js
var createNullObject = () => /* @__PURE__ */ Object.create(null);

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers["ALL"];
    const staticMatch = matcher[2][path2];
    if (staticMatch) return staticMatch;
    const match3 = path2.match(matcher[0]);
    if (!match3) return [[], emptyParam];
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) return b.length === 1 ? a < b ? -1 : 1 : -1;
  if (b.length === 1) return 1;
  if (a === ".*" || a === "(?:|/.*)") return b === "(?:|/.*)" ? -1 : 1;
  else if (b === ".*" || b === "(?:|/.*)") return -1;
  if (a === "[^/]+") return 1;
  else if (b === "[^/]+") return -1;
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class Node2 {
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
        "",
        "",
        ".*"
      ] : [
        "",
        "",
        LABEL_REG_EXP_STR
      ] : null : token === "/*" ? [
        "",
        "",
        TAIL_WILDCARD_REG_EXP_STR
      ] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || "[^/]+";
        if (name && pattern[2]) {
          if (regexpStr === ".*") throw PATH_ERROR;
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ".*" && regexpStr !== "(?:|/.*)") {
            for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          }
          nextNode = node.#children[regexpStr] = new Node2();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) if (k.length > 1 && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          nextNode = node.#children[token] = new Node2();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) throw PATH_ERROR;
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
    if (strList.length === 0) return "";
    if (strList.length === 1) return strList[0];
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  paths = createNullObject();
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) break;
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) if (tokens[j].indexOf(mark) !== -1) {
        tokens[j] = tokens[j].replace(mark, groups[i][1]);
        break;
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") return [
      /^$/,
      [],
      []
    ];
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(`^${path.replace(/\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g, (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ".*" : `/:${LABEL_REG_EXP_STR}`)}$`);
}
function findMiddleware(middleware, path) {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) if (buildWildcardRegExp(k).test(path)) return [...middleware[k]];
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { ["ALL"]: createNullObject() };
    this.#routes = { ["ALL"]: createNullObject() };
    this.#tries = { ["ALL"]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler2) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap["ALL"]) {
          handlerMap[method][p] = [...handlerMap["ALL"][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path === "/*") path = "*";
    const methods = method === "ALL" ? Object.keys(middleware) : [method];
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      for (const m of methods) if (!middleware[m][path]) {
        this.#insertPath(m, path);
        middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware["ALL"], path) || [];
      }
      for (const handlerMap of [middleware, routes]) for (const m of methods) for (const p in handlerMap[m]) re.test(p) && handlerMap[m][p].push([handler2, path]);
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) for (const m of methods) {
      if (!routes[m][path2]) {
        this.#insertPath(m, path2);
        routes[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware["ALL"], path2) || [];
      }
      routes[m][path2].push([handler2, path2]);
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) matchers[method] = this.#buildMatcher(method);
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) for (const path in r) {
      const handlers = r[path];
      const pathData = trie.paths[path];
      if (!pathData) {
        staticMap[path] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
        continue;
      }
      handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [h, trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
        map[key] = paramReplacementMap[pathData[1][i][1]];
        return map;
      }, createNullObject())]);
    }
    return [
      regexp,
      indexReplacementMap.map((i) => handlerData[i]),
      staticMap
    ];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler2) {
    if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#routes.push([
      method,
      path,
      handler2
    ]);
  }
  match(method, path) {
    if (!this.#routes) throw new Error("Fatal error");
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) router.add(...routes[i2]);
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) continue;
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) throw new Error("Fatal error");
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node3 = class Node4 {
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler2) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new Node4();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) possibleKeys.add(pattern[1]);
    }
    curNode.#methods.push({ [method]: {
      handler: handler2,
      possibleKeys: [...possibleKeys],
      score: ++order
    } });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m["ALL"];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    let curNodes = [this];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else tempNodes.push(nextNode);
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) continue;
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                (curNodesQueue[componentCount] ||= []).push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [handlerSets.map(({ handler: handler2, params }) => [handler2, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node3();
  add(method, path, handler2) {
    for (const result of checkOptionalParameter(path) || [path]) this.#node.insert(method, result, handler2);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono3 = class extends Hono {
  /**
  * Creates an instance of the Hono class.
  *
  * @param options - Optional configuration options for the Hono instance.
  */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
  }
};

// src/http/app.ts
init_zod();
import { createHash as createHash5, timingSafeEqual } from "node:crypto";
init_envelope();

// src/screens/spec.ts
init_zod();
var Binding = external_exports.object({
  action: external_exports.enum(["search_records", "get_record", "list_files", "search_memory"]),
  input: external_exports.record(external_exports.unknown())
});
var Base = { id: external_exports.string().min(1).max(40), title: external_exports.string().max(80).optional(), span: external_exports.number().int().min(1).max(12).default(12) };
var Component = external_exports.discriminatedUnion("kind", [
  external_exports.object({ ...Base, kind: external_exports.literal("kpi"), binding: Binding, measure: external_exports.enum(["count", "sum", "avg"]).default("count"), field: external_exports.string().optional() }),
  external_exports.object({
    ...Base,
    kind: external_exports.literal("table"),
    binding: Binding,
    columns: external_exports.array(external_exports.object({ field: external_exports.string(), label: external_exports.string() })).min(1).max(10),
    rowLink: external_exports.enum(["lead", "customer", "appointment", "task"]).optional()
  }),
  external_exports.object({
    ...Base,
    kind: external_exports.literal("chart"),
    binding: Binding,
    chart: external_exports.enum(["bar", "line"]),
    x: external_exports.string(),
    y: external_exports.string().optional(),
    measure: external_exports.enum(["count", "sum"]).default("count")
  }),
  external_exports.object({ ...Base, kind: external_exports.literal("record_panel"), record: external_exports.object({ type: external_exports.string(), id: external_exports.string() }) }),
  external_exports.object({ ...Base, kind: external_exports.literal("files"), binding: Binding }),
  external_exports.object({ ...Base, kind: external_exports.literal("text"), markdown: external_exports.string().max(2e3) }),
  external_exports.object({
    ...Base,
    kind: external_exports.literal("action_form"),
    action: external_exports.string(),
    fields: external_exports.array(external_exports.object({ name: external_exports.string(), label: external_exports.string(), type: external_exports.enum(["text", "textarea", "date", "select", "number"]), options: external_exports.array(external_exports.string()).optional() })).max(12),
    fixed: external_exports.record(external_exports.unknown()).default({}),
    submitLabel: external_exports.string().max(30).default("Submit")
  })
]);
var ScreenSpec = external_exports.object({
  version: external_exports.literal(1).default(1),
  title: external_exports.string().min(2).max(80),
  description: external_exports.string().max(300).default(""),
  components: external_exports.array(Component).min(1).max(12)
});
function visibleTypes(p) {
  if (isStaff(p)) return Object.keys(RECORD_TYPES);
  if (p.kind === "installer") return ["lead", "customer", "design", "product", "appointment", "task", "note", "document"];
  if (p.kind === "customer") return ["design", "appointment", "document"];
  return [];
}
function validateScreen(raw2, viewer) {
  const parsed = ScreenSpec.safeParse(raw2);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
  const spec = parsed.data;
  const errors = [];
  const types = new Set(visibleTypes(viewer));
  const seen = /* @__PURE__ */ new Set();
  for (const c of spec.components) {
    if (seen.has(c.id)) errors.push(`Duplicate component id ${c.id}`);
    seen.add(c.id);
    if ("binding" in c) {
      const t = c.binding.input.type ?? c.binding.input.record?.type;
      if (c.binding.action === "search_records" && (!t || !types.has(t))) errors.push(`${c.id}: record type ${t} is not available to this viewer`);
      const check = ACTIONS[c.binding.action].input.safeParse(c.binding.input);
      if (!check.success) errors.push(`${c.id}: binding input invalid (${check.error.issues[0]?.message})`);
    }
    if (c.kind === "record_panel" && !types.has(c.record.type)) errors.push(`${c.id}: record type ${c.record.type} not available`);
    if (c.kind === "action_form") {
      if (!isActionName(c.action)) errors.push(`${c.id}: unknown action ${c.action}`);
      else if (ACTIONS[c.action].kind === "read") errors.push(`${c.id}: forms must submit a write action`);
      else if (viewer.kind === "customer" && !["schedule", "create_task"].includes(c.action)) errors.push(`${c.id}: customers cannot submit ${c.action}`);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, spec };
}
var SCREEN_PROMPT = (viewer) => `You design screens for the EasyLink Solar portals by writing a JSON screen spec. You never write code.
Components: kpi, table, chart, record_panel, files, text, action_form (span is a 12-column grid width).
Data bindings use only these read actions: search_records {type, filter, limit}, get_record {record}, list_files {record, slot?, label?}, search_memory {query}.
Record types available to this viewer: ${visibleTypes(viewer).join(", ")}.
Lead statuses: NEW, CONTACTED, QUALIFIED, PROPOSAL_SENT, NEGOTIATION, WON, LOST.
action_form submits one of: update_record, create_task, schedule, send_message, start_workflow (put constant inputs in "fixed").
Return ONLY the JSON object: {"title","description","components":[...]}.`;
async function generateScreen(model, request, viewer, feedback) {
  const turn = await model.converse({
    tier: "smart",
    system: SCREEN_PROMPT(viewer),
    maxTokens: 2500,
    messages: [{ role: "user", text: feedback?.length ? `${request}

Your last spec was rejected:
- ${feedback.join("\n- ")}
Fix it.` : request }]
  });
  const m = turn.text.match(/\{[\s\S]*\}/);
  if (!m) return { ok: false, errors: ["Model did not return JSON"] };
  try {
    return validateScreen(JSON.parse(m[0]), viewer);
  } catch {
    return { ok: false, errors: ["Model returned invalid JSON"] };
  }
}
async function generateScreenWithRepair(model, request, viewer) {
  const first = await generateScreen(model, request, viewer);
  if (first.ok) return first;
  return generateScreen(model, request, viewer, first.errors);
}

// src/http/projects.ts
init_zod();
init_envelope();
init_classify();

// src/access/items.ts
var s = (v) => v == null ? "" : String(v);
var money2 = (amount, currency = "AUD") => amount == null || amount === "" ? null : new Intl.NumberFormat("en-AU", { style: "currency", currency: s(currency).toUpperCase() || "AUD" }).format(Number(amount));
var when = (d, ...keys) => {
  for (const k of keys) if (d[k]) return s(d[k]);
  return null;
};
var auDate = (iso) => iso ? new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Sydney", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null;
var pretty2 = (v) => s(v).replace(/_/g, " ").toLowerCase();
async function listBy(ctx, type, extra = {}) {
  const rows = [];
  for (const id of ctx.scope.customers) rows.push(...(await ctx.backend.list(type, { customerId: id, ...extra }, ctx.svc)).data ?? []);
  for (const id of ctx.scope.leads) rows.push(...(await ctx.backend.list(type, { leadId: id, ...extra }, ctx.svc)).data ?? []);
  const mine = rows.filter(
    (r) => r.customerId != null && ctx.scope.customers.includes(s(r.customerId)) || r.leadId != null && ctx.scope.leads.includes(s(r.leadId)) || r.customerId == null && r.leadId == null
  );
  return mine.filter((r, i) => mine.findIndex((x) => s(x.id) === s(r.id)) === i);
}
var refsOf = (r) => [
  ...r.customerId ? [{ type: "customer", id: s(r.customerId) }] : [],
  ...r.leadId ? [{ type: "lead", id: s(r.leadId) }] : []
];
var SOURCES = [
  {
    kind: "document",
    label: "Documents and photos",
    audience: ["staff", "installer", "customer"],
    load: async (ctx) => {
      const rows = await listBy(ctx, "document");
      const extra = ctx.scope.users.length ? ((await ctx.backend.list("document", {}, ctx.svc)).data ?? []).filter((d) => ctx.scope.users.includes(s(d.installerId ?? d.uploadedById))) : [];
      const all = [...rows, ...extra].filter((r, i, a) => a.findIndex((x) => s(x.id) === s(r.id)) === i);
      const profiles = new Map((await ctx.store.getFileLabels(all.map((r) => s(r.id)))).map((p) => [p.documentId, p]));
      return all.map((d) => {
        const p = profiles.get(s(d.id));
        const label = p?.labels[0]?.label ?? d.aiLabels?.[0]?.label ?? s(d.category);
        return {
          key: `document:${d.id}`,
          kind: "document",
          id: s(d.id),
          title: s(d.fileName ?? d.name ?? d.id),
          subtitle: [label ? pretty2(label) : "not read yet", p?.deliveredTo?.length ? `sent to ${Array.from(new Set(p.deliveredTo.map((x) => x.role))).join(", ")}` : null].filter(Boolean).join(" \xB7 "),
          at: when(d, "createdAt"),
          status: p?.issues?.length ? "needs attention" : p?.reviewState === "needs_review" ? "being checked" : null,
          amount: null,
          open: { type: "file", id: s(d.id) },
          records: [...refsOf(d), ...d.installerId ? [{ type: "user", id: s(d.installerId) }] : []],
          by: s(d.installerId ?? d.uploadedById) || null
        };
      });
    }
  },
  {
    kind: "design",
    label: "Designs and proposals",
    audience: ["staff", "installer", "customer"],
    load: async (ctx) => (await listBy(ctx, "design")).map((d) => ({
      key: `design:${d.id}`,
      kind: "design",
      id: s(d.id),
      title: s(d.name ?? d.title ?? `Design ${s(d.id).slice(-6)}`),
      subtitle: [d.systemSize ?? d.systemSizeKw ? `${d.systemSize ?? d.systemSizeKw} kW` : null, d.panelCount ? `${d.panelCount} panels` : null, d.inverter ? s(d.inverter) : null].filter(Boolean).join(" \xB7 ") || "Solar design",
      at: when(d, "updatedAt", "createdAt"),
      status: d.status ? pretty2(d.status) : null,
      amount: money2(d.price ?? d.totalPrice ?? d.salePrice),
      open: { type: "none" },
      records: refsOf(d),
      by: s(d.installerId ?? d.createdById) || null
    }))
  },
  {
    kind: "appointment",
    label: "Bookings",
    audience: ["staff", "installer", "customer"],
    load: async (ctx) => (await listBy(ctx, "appointment")).map((a) => ({
      key: `appointment:${a.id}`,
      kind: "appointment",
      id: s(a.id),
      title: s(a.title ?? a.type ?? "Appointment"),
      subtitle: [auDate(when(a, "startTime", "startsAt", "date")), a.location ? s(a.location) : null].filter(Boolean).join(" \xB7 "),
      at: when(a, "startTime", "startsAt", "date", "createdAt"),
      status: a.status ? pretty2(a.status) : null,
      amount: null,
      open: { type: "none" },
      records: [...refsOf(a), ...a.installerId ? [{ type: "user", id: s(a.installerId) }] : []],
      by: s(a.installerId) || null
    }))
  },
  {
    kind: "payment",
    label: "Payments and quotes",
    audience: ["staff", "installer", "customer"],
    load: async (ctx) => {
      const rows = ((await ctx.backend.list("payment", { limit: 500 }, ctx.svc)).data ?? []).filter(
        (p) => p.customerId && ctx.scope.customers.includes(s(p.customerId)) || p.installerId && ctx.scope.users.includes(s(p.installerId))
      );
      return rows.map((p) => ({
        key: `payment:${p.id}`,
        kind: "payment",
        id: s(p.id),
        title: s(p.description) || (p.kind === "AD_QUOTE" ? "Quote" : p.kind === "PRODUCT_ORDER" ? "Order" : "Payment"),
        subtitle: [p.kind ? pretty2(p.kind) : null, p.payoutStatus === "PAID_OUT" ? "paid out to installer" : null].filter(Boolean).join(" \xB7 "),
        at: when(p, "paidAt", "createdAt"),
        status: p.status ? pretty2(p.status) : null,
        amount: money2(p.amount, s(p.currency || "AUD")),
        open: { type: "none" },
        records: [...p.customerId ? [{ type: "customer", id: s(p.customerId) }] : [], ...p.installerId ? [{ type: "user", id: s(p.installerId) }] : []],
        by: null
      }));
    }
  },
  {
    kind: "task",
    label: "Tasks",
    audience: ["staff", "installer"],
    load: async (ctx) => {
      const rows = await listBy(ctx, "task");
      const own = ctx.scope.users.length ? ((await ctx.backend.list("task", {}, ctx.svc)).data ?? []).filter((t) => ctx.scope.users.includes(s(t.assignedToId))) : [];
      return [...rows, ...own].filter((r, i, a) => a.findIndex((x) => s(x.id) === s(r.id)) === i).map((t) => ({
        key: `task:${t.id}`,
        kind: "task",
        id: s(t.id),
        title: s(t.title ?? "Task"),
        subtitle: [t.dueDate ? `due ${s(t.dueDate).slice(0, 10)}` : null, t.description ? s(t.description).slice(0, 80) : null].filter(Boolean).join(" \xB7 "),
        at: when(t, "updatedAt", "createdAt"),
        status: t.status ? pretty2(t.status) : null,
        amount: null,
        open: { type: "none" },
        records: [...refsOf(t), ...t.assignedToId ? [{ type: "user", id: s(t.assignedToId) }] : []],
        by: s(t.createdById) || null
      }));
    }
  },
  {
    // Installer notes are working notes: EasyLink staff and the installer assigned, never customers.
    kind: "note",
    label: "Installer notes",
    audience: ["staff", "installer"],
    load: async (ctx) => (await listBy(ctx, "note")).map((n) => ({
      key: `note:${n.id}`,
      kind: "note",
      id: s(n.id),
      title: s(n.content ?? n.text ?? "").slice(0, 120) || "Note",
      subtitle: "",
      at: when(n, "updatedAt", "createdAt"),
      status: null,
      amount: null,
      open: { type: "none" },
      records: refsOf(n),
      by: s(n.installerId ?? n.createdById) || null
    }))
  },
  {
    kind: "message",
    label: "Messages sent",
    audience: ["staff", "installer", "customer"],
    load: async (ctx) => {
      const wanted = /* @__PURE__ */ new Set([...ctx.scope.customers.map((id) => `customer#${id}`), ...ctx.scope.leads.map((id) => `lead#${id}`), ...ctx.scope.users.map((id) => `user#${id}`)]);
      const copies = (await ctx.store.listRecords("message")).filter(
        (m) => m.records.some((r) => wanted.has(`${r.type}#${r.id}`)) || ctx.scope.users.includes(m.from.id)
      );
      return copies.map((m) => ({
        key: `message:${m.id}`,
        kind: "message",
        id: m.id,
        title: m.subject || m.body.slice(0, 80),
        subtitle: `to ${m.to.name} (${m.to.role}) by ${m.channels.join(" + ")}${m.files.length ? ` \xB7 ${m.files.length} file${m.files.length > 1 ? "s" : ""}` : ""}`,
        at: m.at,
        status: m.status,
        amount: null,
        open: { type: "message", id: m.id },
        records: m.records,
        by: m.from.id
      }));
    }
  }
];
async function loadItems(args) {
  const ctx = { backend: args.backend, store: args.store, svc: args.svc, scope: args.scope };
  const out = [];
  const kinds = [];
  for (const src of SOURCES.filter((x) => x.audience.includes(args.viewer))) {
    const items = await src.load(ctx).catch((e) => {
      console.error(`items ${src.kind}`, e);
      return [];
    });
    out.push(...items);
    if (items.length) kinds.push({ kind: src.kind, label: src.label, count: items.length });
  }
  out.sort((a, b) => s(b.at).localeCompare(s(a.at)));
  return { items: out, kinds };
}

// src/http/projects.ts
var SITE2 = () => process.env.PUBLIC_SITE_URL ?? "";
function registerProjectRoutes(app, c) {
  const svc = () => ({ token: c.serviceToken });
  const ok = (ctx, data, status = 200) => ctx.json({ success: true, message: "OK", data }, status);
  const scopeOf = (ctx) => c.relations.scope(ctx.get("principal"), ctx.get("user") ?? {}, ctx.get("token") ?? void 0);
  const staff = (ctx) => isStaff(ctx.get("principal"));
  const project = async (ctx) => {
    const ref2 = { type: ctx.req.param("type") ?? "", id: ctx.req.param("id") ?? "" };
    if (!["customer", "lead"].includes(ref2.type)) return ctx.json({ success: false, message: "A project is a customer or a lead" }, 400);
    const scope = await scopeOf(ctx);
    if (!Relations.covers(scope, ref2)) return ctx.json({ success: false, message: "Not your project" }, 403);
    return { ref: ref2, scope };
  };
  const userName = async (id) => {
    const u = await c.backend.get("user", id, svc());
    return u.data ? [u.data.firstName, u.data.lastName].filter(Boolean).join(" ") || String(u.data.name ?? id) : id;
  };
  app.get("/v1/ai/projects", async (ctx) => {
    const scope = await scopeOf(ctx);
    const q = ctx.req.query("search") ?? "";
    let customers = [];
    let leads = [];
    if (scope.all) {
      customers = (await c.backend.list("customer", q ? { search: q } : {}, svc())).data ?? [];
      leads = (await c.backend.list("lead", q ? { search: q } : {}, svc())).data ?? [];
      customers = customers.slice(0, 50);
      leads = leads.filter((l) => !customers.some((cu) => String(cu.leadId ?? "") === String(l.id))).slice(0, 50);
    } else {
      for (const id of scope.customers) {
        const r = await c.backend.get("customer", id, svc());
        if (r.data) customers.push(r.data);
      }
      for (const id of scope.leads) {
        if (customers.some((cu) => String(cu.leadId ?? "") === id)) continue;
        const r = await c.backend.get("lead", id, svc());
        if (r.data) leads.push(r.data);
      }
    }
    const row = async (type, d) => {
      const ref2 = { type, id: String(d.id) };
      const installers = await c.relations.currentInstallers(ref2);
      return {
        ref: ref2,
        name: type === "customer" ? [d.firstName, d.lastName].filter(Boolean).join(" ") || String(d.name ?? d.id) : String(d.customerName ?? d.id),
        address: String(d.address ?? ""),
        status: String(d.status ?? d.projectPhase ?? ""),
        installers: await Promise.all(installers.map(async (id) => ({ id, name: await userName(id) })))
      };
    };
    return ok(ctx, [...await Promise.all(customers.map((d) => row("customer", d))), ...await Promise.all(leads.map((d) => row("lead", d)))]);
  });
  app.get("/v1/ai/projects/:type/:id", async (ctx) => {
    const pj = await project(ctx);
    if (pj instanceof Response) return pj;
    const r = await c.backend.get(pj.ref.type, pj.ref.id, svc());
    if (!r.ok || !r.data) return ctx.json({ success: false, message: "Not found" }, 404);
    const d = r.data;
    const history = await c.relations.history(pj.ref);
    const current = await c.relations.currentInstallers(pj.ref);
    const p = ctx.get("principal");
    return ok(ctx, {
      ref: pj.ref,
      name: pj.ref.type === "customer" ? [d.firstName, d.lastName].filter(Boolean).join(" ") : String(d.customerName ?? ""),
      address: String(d.address ?? ""),
      status: String(d.status ?? d.projectPhase ?? ""),
      // Contact details only for staff and the project's own installer.
      contact: staff(ctx) || p.kind === "installer" && current.includes(p.id) ? { email: d.email ?? d.customerEmail ?? null, phone: d.phone ?? d.customerPhone ?? null } : null,
      installers: await Promise.all(current.map(async (id) => ({ id, name: await userName(id) }))),
      installerHistory: await Promise.all(
        history.map(async (a) => ({ installer: { id: a.installerId, name: a.installerName ?? await userName(a.installerId) }, from: a.from || null, to: a.to, reason: a.reason, assignedBy: staff(ctx) ? a.assignedBy : void 0 }))
      ),
      can: {
        assignInstaller: staff(ctx),
        requestInstallerChange: !staff(ctx) && (p.kind === "customer" || p.kind === "installer"),
        seeContacts: staff(ctx)
      }
    });
  });
  app.get("/v1/ai/projects/:type/:id/files", async (ctx) => {
    const pj = await project(ctx);
    if (pj instanceof Response) return pj;
    const ids = await c.relations.linkedIds(pj.ref);
    const rows = [];
    for (const id of ids.customers) rows.push(...(await c.backend.list("document", { customerId: id }, svc())).data ?? []);
    for (const id of ids.leads) rows.push(...(await c.backend.list("document", { leadId: id }, svc())).data ?? []);
    const uniq = rows.filter((r, i) => rows.findIndex((x) => String(x.id) === String(r.id)) === i);
    const profiles = new Map((await c.store.getFileLabels(uniq.map((r) => String(r.id)))).map((l) => [l.documentId, l]));
    const names = /* @__PURE__ */ new Map();
    const nameOf2 = async (id) => {
      if (!id) return null;
      if (!names.has(id)) names.set(id, await userName(id));
      return names.get(id);
    };
    const out = await Promise.all(
      uniq.map(async (f) => {
        const pr = profiles.get(String(f.id));
        const by = String(f.installerId ?? f.uploadedById ?? "");
        return {
          id: String(f.id),
          name: String(f.fileName ?? f.name ?? f.id),
          mimeType: f.mimeType ?? null,
          sizeBytes: f.sizeBytes ?? null,
          createdAt: f.createdAt ?? null,
          uploadedBy: by ? { id: by, name: await nameOf2(by) } : null,
          // Labels live on the backend row once it has the columns; until then in the AI store.
          label: pr?.labels[0]?.label ?? f.aiLabels?.[0]?.label ?? f.category ?? null,
          confidence: pr?.labels[0]?.confidence ?? f.aiLabels?.[0]?.confidence ?? null,
          reviewState: pr?.reviewState ?? f.reviewState ?? (f.aiLabels ? "auto" : "pending"),
          issues: pr?.issues ?? [],
          // Who it went to: names and roles, never addresses.
          deliveredTo: (pr?.deliveredTo ?? []).map((d) => ({ role: d.role, channels: d.channels, at: d.at, attached: d.attached }))
        };
      })
    );
    out.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return ok(ctx, out);
  });
  app.get("/v1/ai/projects/:type/:id/items", async (ctx) => {
    const pj = await project(ctx);
    if (pj instanceof Response) return pj;
    const p = ctx.get("principal");
    const viewer = staff(ctx) ? "staff" : p.kind === "installer" ? "installer" : "customer";
    const ids = await c.relations.linkedIds(pj.ref);
    const scope = { customers: [...ids.customers], leads: [...ids.leads], users: [] };
    if (backendHasProjects()) {
      const items = [];
      for (const id of scope.customers) {
        const r = await c.backend.call("GET", `/projects/${encodeURIComponent(id)}/items`, null, { token: ctx.get("token") });
        if (r.status === 403) return ctx.json({ success: false, message: "Not your project" }, 403);
        items.push(...(r.data ?? []).map((x) => fromBackendItem(x, id)));
      }
      items.push(...await sentMessages(scope));
      items.push(...await jobDocs(scope, viewer));
      return ok(ctx, summarise(items));
    }
    const local = await loadItems({ backend: c.backend, store: c.store, svc: svc(), scope, viewer });
    return ok(ctx, summarise([...local.items, ...await jobDocs(scope, viewer)]));
  });
  app.get("/v1/ai/people/:userId/items", async (ctx) => {
    const p = ctx.get("principal");
    const raw2 = ctx.req.param("userId") ?? "me";
    const userId = raw2 === "me" ? p.id : raw2;
    if (userId !== p.id && !staff(ctx)) return ctx.json({ success: false, message: "Only your own" }, 403);
    if (backendHasProjects()) {
      const r = await c.backend.call("GET", `/projects/people/${encodeURIComponent(userId)}/items`, null, { token: ctx.get("token") });
      if (!r.ok) return ctx.json({ success: false, message: r.message ?? "Could not load your items" }, r.status || 502);
      return ok(ctx, summarise((r.data ?? []).map((x) => fromBackendItem(x, null))));
    }
    const own = p.kind === "customer" && userId === p.id ? await (async () => {
      const sc = await scopeOf(ctx);
      return sc.all ? { customers: [], leads: [], users: [userId] } : { customers: [...sc.customers], leads: [...sc.leads], users: [userId] };
    })() : { customers: [], leads: [], users: [userId] };
    const viewer = staff(ctx) ? "staff" : p.kind === "installer" ? "installer" : "customer";
    return ok(ctx, await loadItems({ backend: c.backend, store: c.store, svc: svc(), scope: own, viewer }));
  });
  const jobDocs = async (scope, viewer) => {
    const jobs = (await c.store.listRecords("job")).filter((j) => scope.leads.includes(j.leadId) || !!j.customerId && scope.customers.includes(j.customerId));
    const ids = new Set(jobs.map((j) => j.id));
    const records = (j) => [{ type: "lead", id: j.leadId }, ...j.customerId ? [{ type: "customer", id: j.customerId }] : []];
    const byId = new Map(jobs.map((j) => [j.id, j]));
    const invs = (await c.store.listRecords("invoice")).filter((i) => ids.has(i.jobId) && (viewer !== "customer" || i.status !== "draft"));
    const sigs = (await c.store.listRecords("signature")).filter((x) => ids.has(x.jobId));
    return [
      ...invs.map((i) => ({
        key: `invoice:${i.id}`,
        kind: "invoice",
        id: i.id,
        title: `${i.kind === "credit" ? "Adjustment note" : "Tax invoice"} ${i.number}`,
        subtitle: `${i.kind} \xB7 due ${i.dueDate.slice(0, 10)}`,
        at: i.sentAt ?? i.issueDate,
        status: i.status,
        amount: new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(i.totals.total),
        open: { type: "invoice", id: i.id },
        records: records(byId.get(i.jobId)),
        by: i.createdBy
      })),
      ...sigs.map((x) => ({
        key: `signature:${x.id}`,
        kind: "document",
        id: x.id,
        title: x.title,
        subtitle: x.status === "signed" ? `signed by ${x.audit?.name ?? x.signer.name}` : `waiting for ${x.signer.name} to sign`,
        at: x.signedAt ?? x.createdAt,
        status: x.status === "signed" ? "signed" : "to sign",
        amount: null,
        open: { type: "signature", id: x.id },
        records: records(byId.get(x.jobId)),
        by: null
      }))
    ];
  };
  const sentMessages = async (scope) => {
    const all = await c.store.listRecords("message");
    return all.filter((m) => m.records.some((r) => r.type === "customer" && scope.customers.includes(r.id) || r.type === "lead" && scope.leads.includes(r.id))).map((m) => ({
      key: `message:${m.id}`,
      kind: "message",
      id: m.id,
      title: m.subject || `Message to ${m.to.name ?? m.to.role}`,
      subtitle: `${m.channels.join(" + ")} to ${m.to.name ?? m.to.role}`,
      at: m.at,
      status: m.status ?? "sent",
      amount: null,
      open: { type: "message", id: m.id },
      records: m.records,
      by: m.from.id
    }));
  };
  app.get("/v1/ai/projects/:type/:id/history", async (ctx) => {
    const pj = await project(ctx);
    if (pj instanceof Response) return pj;
    const ids = await c.relations.linkedIds(pj.ref);
    const lines = [];
    for (const id of ids.customers) lines.push(...await c.store.listTimeline({ type: "customer", id }, 500));
    for (const id of ids.leads) lines.push(...await c.store.listTimeline({ type: "lead", id }, 500));
    const seen = /* @__PURE__ */ new Set();
    const p = ctx.get("principal");
    const shown = lines.filter((l) => seen.has(l.id) ? false : (seen.add(l.id), true)).filter((l) => staff(ctx) || l.audience === "related").sort((a, b) => b.at.localeCompare(a.at)).map((l) => ({
      id: l.id,
      at: l.at,
      kind: l.kind,
      title: l.title,
      detail: l.detail ?? null,
      actor: { kind: l.actor.kind, name: l.actor.kind === p.kind && l.actor.id === p.id ? "You" : l.actor.name ?? actorLabel(l.actor.kind), mine: l.actor.id === p.id },
      files: l.files ?? [],
      messageId: l.messageId ?? null
    }));
    return ok(ctx, shown);
  });
  app.get("/v1/ai/messages/:id", async (ctx) => {
    const m = await c.store.getRecord("message", ctx.req.param("id") ?? "");
    if (!m) return ctx.json({ success: false, message: "Not found" }, 404);
    const scope = await scopeOf(ctx);
    const p = ctx.get("principal");
    const mine = m.from.id === p.id || m.to.record.type === "user" && m.to.record.id === p.id;
    if (!mine && !m.records.some((r) => Relations.covers(scope, r))) return ctx.json({ success: false, message: "Not yours" }, 403);
    return ok(ctx, {
      ...m,
      to: { ...m.to, address: staff(ctx) ? m.to.address : void 0 },
      from: { ...m.from, name: m.from.id === p.id ? "You" : await userName(m.from.id).catch(() => actorLabel(m.from.kind)) },
      providerIds: staff(ctx) ? m.providerIds : void 0
    });
  });
  app.get("/v1/ai/files/:id/link", async (ctx) => {
    const id = ctx.req.param("id") ?? "";
    const doc = await c.backend.get("document", id, svc());
    if (!doc.ok || !doc.data) return ctx.json({ success: false, message: "Not found" }, 404);
    const scope = await scopeOf(ctx);
    const p = ctx.get("principal");
    const own = String(doc.data.installerId ?? doc.data.uploadedById ?? "") === p.id;
    if (!own && !Relations.covers(scope, { type: "document", id }, { customerId: doc.data.customerId, leadId: doc.data.leadId })) {
      return ctx.json({ success: false, message: "Not your file" }, 403);
    }
    const url = doc.data.s3Key ? await c.files.signedUrl(String(doc.data.s3Key), 900) : absoluteUrl(String(doc.data.url ?? ""), SITE2());
    const evt = makeEvent({ type: "file.downloaded", source: "portal", principal: p, subject: { type: "document", id }, data: { fileName: doc.data.fileName ?? null } });
    await c.store.recordEvent(evt);
    await c.bus.publish([evt]);
    return ok(ctx, { url, expiresInSeconds: 900 });
  });
  app.post("/v1/ai/projects/:type/:id/installer-change", async (ctx) => {
    const pj = await project(ctx);
    if (pj instanceof Response) return pj;
    const { reason } = external_exports.object({ reason: external_exports.string().min(3).max(1e3) }).parse(await ctx.req.json());
    const p = ctx.get("principal");
    const r = await c.actions.run({
      name: "request_approval",
      input: { question: `${actorLabel(p.kind)} asks for a different installer: ${reason}`, about: pj.ref },
      principal: p,
      auth: { token: ctx.get("token") },
      user: ctx.get("user")
    });
    const evt = makeEvent({ type: "installer.change_requested", source: "portal", principal: p, subject: pj.ref, data: { reason } });
    await c.store.recordEvent(evt);
    await c.bus.publish([evt]);
    return ok(ctx, { status: r.status, inbox_id: r.result?.inbox_id ?? null }, 202);
  });
  app.get("/v1/ai/installers", async (ctx) => {
    if (!staff(ctx)) return ctx.json({ success: false, message: "Staff only" }, 403);
    const r = await c.backend.list("user", { role: "INSTALLER", search: ctx.req.query("search") ?? "" }, svc());
    return ok(
      ctx,
      (r.data ?? []).filter((u) => String(u.role ?? "").toUpperCase() === "INSTALLER").map((u) => ({ id: String(u.id), name: [u.firstName, u.lastName].filter(Boolean).join(" ") || String(u.name ?? u.id), area: u.address ?? u.serviceArea ?? null }))
    );
  });
  app.get("/f/:token", async (ctx) => {
    const link = await c.store.getRecord("share_link", ctx.req.param("token") ?? "");
    if (!link || String(link.expiresAt) < (/* @__PURE__ */ new Date()).toISOString()) return ctx.text("This link has expired. Ask EasyLink Solar for a new one.", 410);
    const to = link.to;
    const who = { kind: "integration", id: `${to.type}:${to.id}`, roles: [], on_behalf_of: null };
    const evt = makeEvent({ type: "file.downloaded", source: "email-link", principal: who, subject: link.file, links: [to], data: { fileName: link.fileName ?? null, message_copy_id: link.copyId, by_name: "recipient" } });
    await c.store.recordEvent(evt);
    await c.bus.publish([evt]);
    return ctx.redirect(String(link.direct), 302);
  });
}
var KIND_LABELS = {
  document: "Documents and photos",
  design: "Designs and proposals",
  lead: "Enquiries",
  appointment: "Bookings",
  milestone: "Milestones",
  payment: "Payments and quotes",
  invoice: "Invoices",
  signature: "Documents to sign",
  call: "Calls",
  message: "Messages",
  note: "Installer notes",
  task: "Tasks",
  profile: "Sale price and profit",
  activity: "Activity",
  assignment: "Installers"
};
function fromBackendItem(x, customerId) {
  const kind = String(x.kind);
  const id = String(x.id);
  return {
    key: String(x.key ?? `${kind}:${id}`),
    kind,
    id,
    title: String(x.title ?? ""),
    subtitle: String(x.subtitle ?? ""),
    at: x.at ? String(x.at) : null,
    status: x.status ? String(x.status) : null,
    amount: x.amount ? String(x.amount) : null,
    open: kind === "document" ? { type: "file", id } : { type: "none" },
    records: customerId ? [{ type: "customer", id: customerId }] : [],
    by: x.byUserId ? String(x.byUserId) : null
  };
}
function summarise(items) {
  const uniq = items.filter((x, i) => items.findIndex((y) => y.key === x.key) === i).sort((a, b) => String(b.at ?? "").localeCompare(String(a.at ?? "")));
  const counts = /* @__PURE__ */ new Map();
  for (const i of uniq) counts.set(i.kind, (counts.get(i.kind) ?? 0) + 1);
  return { items: uniq, kinds: [...counts].map(([kind, count]) => ({ kind, label: KIND_LABELS[kind] ?? kind, count })) };
}
function actorLabel(kind) {
  return { staff: "EasyLink", agent: "EasyLink AI", system: "EasyLink", integration: "EasyLink", installer: "Installer", customer: "Customer", visitor: "Visitor" }[kind] ?? kind;
}

// src/http/jobs.ts
init_zod();
init_envelope();
function registerJobRoutes(app, c) {
  const jobs = new JobService(c);
  const meta = (ctx) => ({
    ip: ctx.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? ctx.req.header("x-real-ip") ?? "unknown",
    userAgent: ctx.req.header("user-agent") ?? "",
    token: ctx.get("token"),
    user: ctx.get("user")
  });
  const fail = (ctx, e) => {
    if (e instanceof JobError) return ctx.json({ success: false, message: e.message }, e.status);
    if (e instanceof external_exports.ZodError) return ctx.json({ success: false, message: "Check the details and try again", errors: e.issues }, 400);
    console.error("jobs", e);
    return ctx.json({ success: false, message: "Something went wrong" }, 500);
  };
  app.get("/v1/ai/jobs", async (ctx) => {
    const p = ctx.get("principal");
    const list = await jobs.list(p, meta(ctx));
    const offers = await jobs.offers();
    return ctx.json({
      success: true,
      message: "OK",
      data: list.map((j) => {
        const open = offers.find((o) => o.jobId === j.id && o.status === "open");
        return {
          id: j.id,
          customerName: j.customerName,
          address: j.site.address,
          installerName: j.installerName ?? null,
          system: `${j.selection.kw.toFixed(1)} kW${j.selection.battery ? ` + ${j.selection.battery.usableKwh} kWh` : ""}`,
          stage: Math.max(1, ...Object.keys(j.milestones).map((k) => ({ design_selected: 1, installer_assigned: 2, selection_confirmed: 3, site_photos_ok: 3, job_accepted: 3, agreement_signed: 3, deposit_paid: 4, install_date_set: 4, connection_applied: 5, connection_approved: 5, bills_received: 6, quote_final: 6, equipment_paid: 6, delivered: 6, install_started: 7, installed: 7, site_docs_sent: 7, final_paid: 8, stc_pack_signed: 8, handover_sent: 8, stc_lodged: 8, monitoring_clear: 9 })[k] ?? 1)),
          installDates: j.installDates ?? null,
          updatedAt: j.updatedAt,
          offer: open && (viewerOf(p).who === "staff" || open.installerId === p.id) ? { id: open.id, expiresAt: open.expiresAt, installerName: open.installerName } : null
        };
      })
    });
  });
  app.get("/v1/ai/jobs/:id", async (ctx) => {
    const p = ctx.get("principal");
    const j = await jobs.get(ctx.req.param("id") ?? "");
    if (!j) return ctx.json({ success: false, message: "Job not found" }, 404);
    if (!await jobs.canSee(j, p, meta(ctx))) return ctx.json({ success: false, message: "Not your job" }, 403);
    return ctx.json({ success: true, message: "OK", data: await jobs.view(j, p) });
  });
  app.get("/v1/ai/jobs/:id/ranking", async (ctx) => {
    if (viewerOf(ctx.get("principal")).who !== "staff") return ctx.json({ success: false, message: "Staff only" }, 403);
    const j = await jobs.get(ctx.req.param("id") ?? "");
    if (!j) return ctx.json({ success: false, message: "Job not found" }, 404);
    return ctx.json({ success: true, message: "OK", data: await jobs.rank(j) });
  });
  app.post("/v1/ai/jobs/:id/steps/:action", async (ctx) => {
    try {
      const input = external_exports.record(external_exports.unknown()).parse(await ctx.req.json().catch(() => ({})));
      const data = await jobs.act(ctx.req.param("id") ?? "", ctx.req.param("action") ?? "", input, ctx.get("principal"), meta(ctx));
      return ctx.json({ success: true, message: "OK", data });
    } catch (e) {
      return fail(ctx, e);
    }
  });
  app.post("/v1/ai/jobs/:id/uploads", async (ctx) => {
    const p = ctx.get("principal");
    const j = await jobs.get(ctx.req.param("id") ?? "");
    if (!j) return ctx.json({ success: false, message: "Job not found" }, 404);
    if (!await jobs.canSee(j, p, meta(ctx))) return ctx.json({ success: false, message: "Not your job" }, 403);
    const form = await ctx.req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") return ctx.json({ success: false, message: "Choose a file" }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const verdict = checkFile({ name: file.name, sizeBytes: bytes.length, mimeType: file.type, bytes });
    if (!verdict.ok) return ctx.json({ success: false, message: verdict.reason }, 400);
    const id = newId("jf_");
    const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
    const key = `jobs/${j.id}/${id}-${safe}`;
    await c.files.put(key, bytes, file.type || "application/octet-stream");
    const row = { id, jobId: j.id, key, name: file.name.slice(0, 200), mimeType: file.type, sizeBytes: bytes.length, purpose: String(form?.get("purpose") ?? "photo").slice(0, 20), label: String(form?.get("label") ?? "").slice(0, 60), by: p.id, at: (/* @__PURE__ */ new Date()).toISOString() };
    await c.store.putRecord("job_file", row);
    return ctx.json({ success: true, message: "OK", data: { fileId: id, name: row.name } });
  });
  app.get("/v1/ai/jobs/:id/files/:fileId/link", async (ctx) => {
    const p = ctx.get("principal");
    const j = await jobs.get(ctx.req.param("id") ?? "");
    const f = await c.store.getRecord("job_file", ctx.req.param("fileId") ?? "");
    if (!j || !f || f.jobId !== j.id) return ctx.json({ success: false, message: "Not found" }, 404);
    if (!await jobs.canSee(j, p, meta(ctx))) return ctx.json({ success: false, message: "Not your job" }, 403);
    return ctx.json({ success: true, message: "OK", data: { url: await c.files.signedUrl(String(f.key), 900) } });
  });
  const doc = async (ctx, html, jobId) => {
    const j = await jobs.get(jobId);
    if (!j || !await jobs.canSee(j, ctx.get("principal"), meta(ctx))) return ctx.json({ success: false, message: "Not yours" }, 403);
    return ctx.json({ success: true, message: "OK", data: { html } });
  };
  app.get("/v1/ai/documents/invoice/:id", async (ctx) => {
    const d = await jobs.invoiceDoc(ctx.req.param("id") ?? "");
    if (!d) return ctx.json({ success: false, message: "Not found" }, 404);
    if (viewerOf(ctx.get("principal")).who === "customer" && d.inv.status === "draft") return ctx.json({ success: false, message: "Not found" }, 404);
    return doc(ctx, d.html, d.inv.jobId);
  });
  app.get("/v1/ai/documents/signature/:id", async (ctx) => {
    const d = await jobs.signatureHtml(ctx.req.param("id") ?? "");
    if (!d) return ctx.json({ success: false, message: "Not found" }, 404);
    return doc(ctx, d.html, d.s.jobId);
  });
  return jobs;
}

// src/http/voice.ts
init_zod();
import { createHash as createHash4, randomInt as randomInt2 } from "node:crypto";
var VOICE_STEPS = {
  customer: ["confirm_selection", "request_code", "sign", "pick_window"],
  installer: [
    "accept_offer",
    "decline_offer",
    "accept_job",
    "request_photos",
    "propose_windows",
    "submit_connection",
    "record_approval",
    "request_bills",
    "confirm_quote",
    "book_delivery",
    "mark_delivered",
    "send_invoice",
    "send_site_docs",
    "send_stc_pack",
    "send_handover",
    "resolve_issue",
    "request_code"
  ]
};
var PORTAL = process.env.PORTAL_BASE_URL ?? "https://www.easylinksolar.com.au";
var STAFF_EMAIL = process.env.STAFF_EMAIL ?? "sales@easylinksolar.com.au";
function normalisePhone(raw2) {
  const d = String(raw2 ?? "").replace(/^sip:/i, "").replace(/@.*$/, "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.startsWith("61")) return `+${d}`;
  if (d.startsWith("0")) return `+61${d.slice(1)}`;
  return d ? `+${d}` : "";
}
var variants = (e164) => e164.startsWith("+61") ? [e164, `0${e164.slice(3)}`] : [e164];
var sha2 = (s2) => createHash4("sha256").update(s2).digest("hex");
var safeEq = (a, b) => a.length === b.length && sha2(a) === sha2(b);
function registerVoiceRoutes(app, c, jobs, opts = {}) {
  const key = opts.key ?? process.env.VOICE_KEY ?? (process.env.AI_MODE === "local" ? "voice-local" : "");
  const svc = { token: c.serviceToken };
  const meta = (call) => ({ ip: "phone", userAgent: "EasyLink voice agent", token: null, user: call.user });
  app.use("/voice/*", async (ctx, next) => {
    const k = ctx.req.header("x-voice-key") ?? "";
    if (!key || !k || !safeEq(k, key)) return ctx.json({ success: false, message: "Unauthorised" }, 401);
    return next();
  });
  const load = async (id) => await c.store.getRecord("voice_call", id);
  const save = (v) => c.store.putRecord("voice_call", v);
  const fail = (ctx, e) => {
    if (e instanceof JobError) return ctx.json({ success: false, message: e.message }, e.status);
    if (e instanceof external_exports.ZodError) return ctx.json({ success: false, message: "Check the details", errors: e.issues }, 400);
    console.error("voice", e);
    return ctx.json({ success: false, message: "Something went wrong" }, 500);
  };
  const verified = async (ctx) => {
    const v = await load(ctx.req.param("callId") ?? "");
    if (!v) throw new JobError("Call not found", 404);
    if (!v.principal) throw new JobError("This number isn't on an EasyLink account", 403);
    if (!v.verified) throw new JobError("Verify the caller first: text a code and have them read it back", 403);
    return v;
  };
  const myJob = async (v, jobId) => {
    const j = await jobs.get(jobId);
    if (!j || !await jobs.canSee(j, v.principal, meta(v))) throw new JobError("Not one of this caller's jobs", 404);
    return j;
  };
  async function identify(phone) {
    const same = (x) => normalisePhone(String(x ?? "")) === phone;
    for (const q of variants(phone)) {
      const users = (await c.backend.list("user", { search: q }, svc)).data ?? [];
      const u = users.find((x) => same(x.phone));
      if (u) {
        const p = principalFromUser(u);
        if (p.kind === "customer" || p.kind === "installer") return { known: true, kind: p.kind, principal: p, user: u, firstName: String(u.firstName ?? "") };
        return { known: false, kind: null, principal: null, user: {}, firstName: "" };
      }
      const custs = (await c.backend.list("customer", { search: q }, svc)).data ?? [];
      const cu = custs.find((x) => same(x.phone));
      if (cu) {
        const user = { id: String(cu.userId ?? `phone-${cu.id}`), customerId: String(cu.id), email: cu.email };
        return { known: true, kind: "customer", principal: { kind: "customer", id: user.id, roles: ["CUSTOMER"], on_behalf_of: null }, user, firstName: String(cu.firstName ?? "") };
      }
    }
    const j = (await c.store.listRecords("job")).find((x) => x.customerId && same(x.customerPhone));
    if (j) {
      const user = { id: `phone-${j.customerId}`, customerId: String(j.customerId) };
      return { known: true, kind: "customer", principal: { kind: "customer", id: user.id, roles: ["CUSTOMER"], on_behalf_of: null }, user, firstName: j.customerName.split(" ")[0] ?? "" };
    }
    return { known: false, kind: null, principal: null, user: {}, firstName: "" };
  }
  async function brief(j, v) {
    const view = await jobs.view(j, v.principal);
    return {
      id: j.id,
      address: v.kind === "installer" && !j.installerId ? `${j.site.postcode} area` : j.site.address,
      system: `${j.selection.kw.toFixed(1)} kW solar${j.selection.battery ? ` + ${j.selection.battery.usableKwh} kWh battery` : ""}`,
      price: j.selection.price,
      installer: j.installerName ?? null,
      stage: view.stage,
      yourNextSteps: (view.next ?? []).map((n) => n.label),
      waitingOn: (view.waitingOn ?? []).map((n) => `${n.who}: ${n.label}`),
      installDates: j.installDates ?? null,
      dateOptions: j.windows.map((w) => ({ windowId: w.id, day1: w.day1, day2: w.day2 })),
      invoices: (view.invoices ?? []).map((i) => ({ invoiceId: i.id, number: i.number, kind: i.kind, total: i.totals?.total, status: i.status, dueDate: i.dueDate })),
      documents: (view.signatures ?? []).map((s2) => ({ signatureId: s2.id, title: s2.title, status: s2.status, signer: s2.signer?.who })),
      openOffer: (view.offers ?? []).find((o) => o.status === "open") ? { expiresAt: (view.offers ?? []).find((o) => o.status === "open").expiresAt } : null,
      photosNeeded: j.photos.items.filter((p) => !p.ok).map((p) => p.note ? `${p.label} (${p.note})` : p.label),
      monitoringIssues: j.monitoring.issues.filter((i) => i.status === "open").map((i) => i.text)
    };
  }
  app.post("/voice/calls", async (ctx) => {
    try {
      const b = external_exports.object({ callId: external_exports.string().min(1).max(120), from: external_exports.string().min(3).max(80) }).parse(await ctx.req.json());
      const phone = normalisePhone(b.from);
      const prev = await load(b.callId);
      if (prev) return ctx.json({ success: true, message: "OK", data: { known: prev.known, kind: prev.kind, verified: prev.verified } });
      const who = await identify(phone);
      const v = { id: b.callId, phone, ...who, verified: false, codesSent: 0, attempts: 0, jobIds: [], startedAt: (/* @__PURE__ */ new Date()).toISOString() };
      await save(v);
      return ctx.json({ success: true, message: "OK", data: { known: v.known, kind: v.kind, verified: false } });
    } catch (e) {
      return fail(ctx, e);
    }
  });
  app.post("/voice/calls/:callId/code", async (ctx) => {
    try {
      const v = await load(ctx.req.param("callId") ?? "");
      if (!v) throw new JobError("Call not found", 404);
      if (!v.principal) throw new JobError("This number isn't on an EasyLink account", 403);
      if (v.codesSent >= 3) throw new JobError("Three codes have been sent on this call. Ask them to use the portal or call back later.", 429);
      const code = String(randomInt2(0, 1e6)).padStart(6, "0");
      v.codeHash = sha2(`${v.id}:${code}`);
      v.codeExpires = new Date(Date.now() + 10 * 6e4).toISOString();
      v.codesSent += 1;
      v.attempts = 0;
      await save(v);
      await c.messaging.sendSms({ to: v.phone, body: `EasyLink Solar: your phone code is ${code}. Read it to our assistant on the call. It expires in 10 minutes. Don't share it with anyone else.` });
      return ctx.json({ success: true, message: "OK", data: { sentTo: `number ending ${v.phone.slice(-3)}` } });
    } catch (e) {
      return fail(ctx, e);
    }
  });
  app.post("/voice/calls/:callId/verify", async (ctx) => {
    try {
      const { code } = external_exports.object({ code: external_exports.string().max(20) }).parse(await ctx.req.json());
      const v = await load(ctx.req.param("callId") ?? "");
      if (!v?.principal || !v.codeHash) throw new JobError("Send a code first", 409);
      if (v.attempts >= 5) throw new JobError("Too many wrong codes on this call", 429);
      if (!v.codeExpires || v.codeExpires < (/* @__PURE__ */ new Date()).toISOString()) throw new JobError("That code has expired. Send a new one.", 410);
      const digits = code.replace(/\D/g, "");
      if (!safeEq(sha2(`${v.id}:${digits}`), v.codeHash)) {
        v.attempts += 1;
        await save(v);
        throw new JobError(`That code doesn't match (${5 - v.attempts} tries left).`, 400);
      }
      v.verified = true;
      v.codeHash = void 0;
      const list = await jobs.list(v.principal, meta(v));
      v.jobIds = list.map((j) => j.id);
      await save(v);
      return ctx.json({ success: true, message: "OK", data: { firstName: v.firstName, kind: v.kind, jobs: await Promise.all(list.slice(0, 5).map((j) => brief(j, v))) } });
    } catch (e) {
      return fail(ctx, e);
    }
  });
  app.get("/voice/calls/:callId/jobs/:jobId", async (ctx) => {
    try {
      const v = await verified(ctx);
      return ctx.json({ success: true, message: "OK", data: await brief(await myJob(v, ctx.req.param("jobId") ?? ""), v) });
    } catch (e) {
      return fail(ctx, e);
    }
  });
  app.post("/voice/calls/:callId/jobs/:jobId/steps/:action", async (ctx) => {
    try {
      const v = await verified(ctx);
      const action = ctx.req.param("action") ?? "";
      if (!VOICE_STEPS[v.kind].includes(action)) throw new JobError("That can't be done over the phone. Text them a link to the portal instead.", 400);
      const j = await myJob(v, ctx.req.param("jobId") ?? "");
      const input = external_exports.record(external_exports.unknown()).parse(await ctx.req.json().catch(() => ({})));
      if (action === "confirm_selection") input.transcript = `On a phone call (${v.phone}): ${String(input.transcript ?? "").slice(0, 1800)}`;
      const data = await jobs.act(j.id, action, input, v.principal, meta(v));
      return ctx.json({ success: true, message: "OK", data: { result: data, job: await brief(await jobs.get(j.id), v) } });
    } catch (e) {
      return fail(ctx, e);
    }
  });
  app.post("/voice/calls/:callId/jobs/:jobId/link", async (ctx) => {
    try {
      const v = await verified(ctx);
      const { what } = external_exports.object({ what: external_exports.enum(["pay", "photos", "bill", "documents", "sign", "job"]) }).parse(await ctx.req.json());
      const j = await myJob(v, ctx.req.param("jobId") ?? "");
      const url = v.kind === "installer" ? `${PORTAL}/installers/dashboard/jobs/${encodeURIComponent(j.id)}` : `${PORTAL}/customers/project`;
      const why = { pay: "to pay your invoice", photos: "to upload your photos", bill: "to upload your energy bill", documents: "to read your documents", sign: "to read and sign your document", job: "for your job" }[what];
      await c.messaging.sendSms({ to: v.phone, body: `EasyLink Solar: here's the link ${why}: ${url}` });
      return ctx.json({ success: true, message: "OK", data: { sent: true } });
    } catch (e) {
      return fail(ctx, e);
    }
  });
  app.post("/voice/calls/:callId/end", async (ctx) => {
    try {
      const b = external_exports.object({ durationSec: external_exports.number().min(0).max(36e3).optional(), transcriptKey: external_exports.string().max(300).optional(), recordingKey: external_exports.string().max(300).optional(), summary: external_exports.string().max(1e3).optional(), jobId: external_exports.string().max(80).optional(), messages: external_exports.array(external_exports.string().max(600)).max(10).optional() }).parse(await ctx.req.json().catch(() => ({})));
      const v = await load(ctx.req.param("callId") ?? "");
      if (!v) throw new JobError("Call not found", 404);
      Object.assign(v, { endedAt: (/* @__PURE__ */ new Date()).toISOString(), transcriptKey: b.transcriptKey, recordingKey: b.recordingKey, summary: b.summary });
      await save(v);
      if (b.messages?.length) {
        const who = v.verified ? `${v.firstName || v.kind} (verified ${v.kind})` : v.known ? `a ${v.kind} number, not verified` : "an unknown caller";
        await c.messaging.sendEmail({ to: STAFF_EMAIL, subject: `Call back ${v.phone}`, body: `A phone call from ${v.phone} \u2014 ${who} \u2014 left ${b.messages.length > 1 ? "these messages" : "this message"}:

- ${b.messages.join("\n- ")}

Call ID ${v.id}${b.recordingKey ? `
Recording: ${b.recordingKey}` : ""}` }).catch((e) => console.error("voice staff email", e));
      }
      if (v.verified && v.principal && b.jobId && v.jobIds.includes(b.jobId)) {
        const mins = Math.max(1, Math.round((b.durationSec ?? 0) / 60));
        await jobs.noteCall(b.jobId, v.principal, `Phone call with ${v.firstName || v.kind} (${mins} min)`, [b.summary, b.recordingKey && `Recording: ${b.recordingKey}`, b.transcriptKey && `Transcript: ${b.transcriptKey}`].filter(Boolean).join("\n"));
      }
      return ctx.json({ success: true, message: "OK", data: { saved: true } });
    } catch (e) {
      return fail(ctx, e);
    }
  });
}

// src/http/app.ts
function principalFromUser(u) {
  const role = String(u.role ?? u.userType ?? "").toUpperCase();
  const kind = ["ADMIN", "SUPER_ADMIN", "MASTER", "STAFF", "DISTRIBUTOR"].includes(role) ? "staff" : role === "INSTALLER" ? "installer" : "customer";
  return { kind, id: String(u.id ?? u._id ?? ""), roles: role ? [role] : [], on_behalf_of: null };
}
var safeEq2 = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
function createApp(c) {
  const app = new Hono3();
  const whoCache = /* @__PURE__ */ new Map();
  app.get("/health", (ctx) => ctx.json({ ok: true, service: "easylink-ai-platform" }));
  app.use("/v1/*", async (ctx, next) => {
    const h = ctx.req.header("authorization") ?? "";
    const token = h.startsWith("Bearer ") ? h.slice(7).trim() : null;
    const ingest = ctx.req.header("x-ingest-key");
    if (token) {
      const key = createHash5("sha256").update(token).digest("hex");
      const hit = whoCache.get(key);
      let p = hit && hit.exp > Date.now() ? hit.p : null;
      let user = hit?.user ?? {};
      if (!p) {
        const r = await c.backend.whoAmI({ token });
        if (!r.ok || !r.data) return ctx.json({ success: false, message: "Unauthorised" }, 401);
        user = r.data.user ?? r.data;
        p = principalFromUser(user);
        whoCache.set(key, { p, user, exp: Date.now() + 6e4 });
      }
      ctx.set("principal", p);
      ctx.set("user", user);
      ctx.set("token", token);
      ctx.set("relay", !!(ingest && c.ingestKey && safeEq2(ingest, c.ingestKey)));
      return next();
    }
    if (ingest && c.ingestKey && safeEq2(ingest, c.ingestKey) && ctx.req.path === "/v1/events") {
      const anon = ctx.req.header("x-visitor-id") ?? "anonymous";
      ctx.set("principal", { kind: "visitor", id: anon.slice(0, 64), roles: [], on_behalf_of: null });
      ctx.set("token", null);
      ctx.set("relay", true);
      return next();
    }
    return ctx.json({ success: false, message: "Unauthorised" }, 401);
  });
  const staffOnly = async (ctx, next) => {
    if (!isStaff(ctx.get("principal"))) return ctx.json({ success: false, message: "Staff only" }, 403);
    await next();
  };
  const ok = (ctx, data, status = 200) => ctx.json({ success: true, message: "OK", data }, status);
  const InEvent = external_exports.object({
    type: external_exports.string(),
    subject: RecordRef.optional(),
    links: external_exports.array(RecordRef).default([]),
    data: external_exports.record(external_exports.unknown()).default({}),
    correlation_id: external_exports.string().optional(),
    pii: external_exports.array(external_exports.string()).default([])
  });
  app.post("/v1/events", async (ctx) => {
    const body = await ctx.req.json().catch(() => null);
    const list = external_exports.array(InEvent).max(50).safeParse(Array.isArray(body) ? body : body?.events ?? [body]);
    if (!list.success) return ctx.json({ success: false, message: "Invalid events", errors: list.error.flatten() }, 400);
    const p = ctx.get("principal");
    const accepted = [];
    const quarantined = [];
    const events = [];
    for (const e of list.data) {
      if (!ctx.get("relay") && (p.kind === "visitor" || p.kind === "customer" || p.kind === "installer")) {
        const entity = e.type.split(".")[0] ?? "";
        if (!["page", "form", "field", "cta", "price", "help", "ui", "widget", "search", "design", "cart"].includes(entity)) {
          quarantined.push(e.type);
          continue;
        }
      }
      const evt = makeEvent({
        type: e.type,
        source: p.kind === "visitor" ? "web" : `portal:${p.kind}`,
        principal: p,
        subject: e.subject ?? { type: p.kind === "visitor" ? "visitor" : "user", id: p.id },
        links: e.links,
        data: e.data,
        correlation_id: e.correlation_id,
        pii: e.pii
      });
      if (!isRegisteredType(evt.type)) {
        await c.store.quarantine(evt, `Unregistered event type ${evt.type}`);
        quarantined.push(e.type);
        continue;
      }
      await c.store.recordEvent(evt);
      events.push(evt);
      accepted.push(evt.event_id);
    }
    if (events.length) await c.bus.publish(events);
    return ok(ctx, { accepted, quarantined }, 202);
  });
  app.get(
    "/v1/actions",
    (ctx) => ok(
      ctx,
      Object.values(ACTIONS).map((a) => ({ name: a.name, kind: a.kind, family: a.family, sensitivity: a.sensitivity, description: a.description }))
    )
  );
  app.post("/v1/actions/:name", async (ctx) => {
    const body = await ctx.req.json().catch(() => ({}));
    const r = await c.actions.run({
      name: ctx.req.param("name") ?? "",
      input: body.input ?? {},
      principal: ctx.get("principal"),
      auth: ctx.get("token") ? { token: ctx.get("token") } : void 0,
      user: ctx.get("user"),
      idempotencyKey: ctx.req.header("idempotency-key") ?? void 0,
      dryRun: !!body.dry_run
    });
    const status = { executed: 200, proposed: 202, dry_run: 200, shadow: 200, denied: 403, blocked: 403, invalid: 400, error: 502 }[r.status];
    return ctx.json({ success: r.status === "executed" || r.status === "proposed" || r.status === "dry_run", message: r.message ?? r.status, data: r }, status);
  });
  app.get("/v1/ai/control", staffOnly, async (ctx) => {
    const since = new Date(Date.now() - 864e5).toISOString();
    const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
    const [control, rules, decisions, inbox, decisions30, quarantine] = await Promise.all([
      c.store.getControl(),
      c.store.listAutonomyRules(),
      c.store.listDecisions({ sinceIso: since, limit: 5e3 }),
      c.store.listInbox({ status: "open", limit: 500 }),
      c.store.listDecisions({ sinceIso: since30, limit: 2e4 }),
      c.store.listQuarantine(20)
    ]);
    const agents = Object.values(AGENTS).map((a) => {
      const mine = decisions.filter((d) => d.agentId === a.id);
      const writes = a.actions.filter((x) => ACTIONS[x].kind !== "read");
      const actionLevels = {};
      for (const x of writes) {
        const own = rules.filter((r) => r.agentId === a.id && r.action === x);
        const order2 = ["L0", "L1", "L2", "L3"];
        let lv = own.find((r) => !Object.keys(r.condition).length)?.level ?? defaultLevel(x);
        for (const r of own) if (order2.indexOf(r.level) > order2.indexOf(lv)) lv = r.level;
        if (control.globalRecommendOnly && (lv === "L2" || lv === "L3")) lv = "L1";
        actionLevels[x] = lv;
      }
      const levels = Object.values(actionLevels);
      const top = ["L3", "L2", "L1", "L0"].find((l) => levels.includes(l)) ?? "L1";
      const m30 = decisions30.filter((d) => d.agentId === a.id && d.outcome === "proposed");
      return {
        id: a.id,
        name: a.name,
        paused: !!control.pausedAgents[a.id],
        level: control.globalRecommendOnly && (top === "L2" || top === "L3") ? "L1" : top,
        label: LEVEL_LABEL[control.globalRecommendOnly && (top === "L2" || top === "L3") ? "L1" : top],
        decisions24h: mine.length,
        executed24h: mine.filter((d) => d.outcome === "executed").length,
        proposed24h: mine.filter((d) => d.outcome === "proposed").length,
        escalated24h: mine.filter((d) => d.outcome === "escalated").length,
        costAud24h: Math.round(mine.reduce((s2, d) => s2 + d.costAud, 0) * 100) / 100,
        openInbox: inbox.filter((i) => i.agentId === a.id).length,
        proposals30d: m30.length,
        triggers: a.triggers,
        actions: a.actions,
        actionLevels
      };
    });
    const families = Object.entries(ACTION_FAMILIES).map(([f, m]) => ({ family: f, label: m.label, detail: m.detail, off: !!control.familiesOff[f] }));
    const kpis = {
      decisions24h: decisions.length,
      autoResolvedPct: decisions.length ? Math.round(decisions.filter((d) => d.outcome === "executed" || d.outcome === "no_action").length / decisions.length * 100) : 0,
      openInbox: inbox.length,
      overdueInbox: inbox.filter((i) => i.dueAt < (/* @__PURE__ */ new Date()).toISOString()).length,
      costAud24h: Math.round(decisions.reduce((s2, d) => s2 + d.costAud, 0) * 100) / 100,
      quarantined: quarantine.length
    };
    return ok(ctx, { control, agents, families, rules, kpis, quarantine });
  });
  app.put("/v1/ai/control/global", staffOnly, async (ctx) => {
    const { recommendOnly } = external_exports.object({ recommendOnly: external_exports.boolean() }).parse(await ctx.req.json());
    const cur = await c.store.getControl();
    const next = { ...cur, globalRecommendOnly: recommendOnly, updatedBy: ctx.get("principal").id, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await c.store.putControl(next);
    await audit(c, ctx.get("principal"), recommendOnly ? "ai.paused" : "ai.resumed", { scope: "global" });
    return ok(ctx, next);
  });
  app.post("/v1/ai/control/agents/:id/pause", staffOnly, async (ctx) => {
    const id = ctx.req.param("id") ?? "";
    if (!AGENTS[id]) return ctx.json({ success: false, message: "Unknown agent" }, 404);
    const { paused } = external_exports.object({ paused: external_exports.boolean() }).parse(await ctx.req.json());
    const cur = await c.store.getControl();
    const next = { ...cur, pausedAgents: { ...cur.pausedAgents, [id]: paused }, updatedBy: ctx.get("principal").id, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await c.store.putControl(next);
    await audit(c, ctx.get("principal"), paused ? "ai.paused" : "ai.resumed", { agent: id });
    return ok(ctx, next);
  });
  app.put("/v1/ai/control/switches/:family", staffOnly, async (ctx) => {
    const family = ctx.req.param("family") ?? "";
    if (!(family in ACTION_FAMILIES)) return ctx.json({ success: false, message: "Unknown action family" }, 404);
    const { off } = external_exports.object({ off: external_exports.boolean() }).parse(await ctx.req.json());
    const cur = await c.store.getControl();
    const next = { ...cur, familiesOff: { ...cur.familiesOff, [family]: off }, updatedBy: ctx.get("principal").id, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await c.store.putControl(next);
    await audit(c, ctx.get("principal"), off ? "ai.paused" : "ai.resumed", { family });
    return ok(ctx, next);
  });
  app.put("/v1/ai/control/budget", staffOnly, async (ctx) => {
    const { dailyBudgetAud } = external_exports.object({ dailyBudgetAud: external_exports.number().min(0).nullable() }).parse(await ctx.req.json());
    const cur = await c.store.getControl();
    const next = { ...cur, dailyBudgetAud, updatedBy: ctx.get("principal").id, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await c.store.putControl(next);
    return ok(ctx, next);
  });
  app.put("/v1/ai/control/autonomy", staffOnly, async (ctx) => {
    const body = external_exports.object({
      agentId: external_exports.string(),
      action: external_exports.string(),
      condition: external_exports.record(external_exports.string()).default({}),
      level: external_exports.enum(["L0", "L1", "L2", "L3"]),
      reason: external_exports.string().min(3)
    }).parse(await ctx.req.json());
    if (!AGENTS[body.agentId] || !(body.action in ACTIONS)) return ctx.json({ success: false, message: "Unknown agent or action" }, 400);
    const rule = { ...body, action: body.action, setBy: ctx.get("principal").id, setAt: (/* @__PURE__ */ new Date()).toISOString() };
    await c.store.putAutonomyRule(rule);
    await audit(c, ctx.get("principal"), "ai.autonomy_changed", rule);
    return ok(ctx, rule);
  });
  app.get("/v1/ai/control/promotions", staffOnly, async (ctx) => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const [inbox, rules] = await Promise.all([c.store.listInbox({ limit: 1e4 }), c.store.listAutonomyRules()]);
    const out = [];
    for (const a of Object.values(AGENTS)) {
      for (const action of a.actions.filter((x) => ACTIONS[x].kind !== "read")) {
        const mine = inbox.filter((i) => i.kind === "proposal" && i.agentId === a.id && i.action === action && i.createdAt >= since && i.status !== "open");
        if (!mine.length) continue;
        const level = rules.find((r) => r.agentId === a.id && r.action === action && !Object.keys(r.condition).length)?.level ?? defaultLevel(action);
        const s2 = suggestPromotion({
          level,
          proposals: mine.length,
          approvedUnchanged: mine.filter((i) => i.resolution === "approved_unchanged").length,
          complianceRejections: mine.filter((i) => i.status === "rejected" && /compliance|consent|privacy/i.test(i.resolution ?? "")).length,
          reversals: 0
        });
        if (s2) out.push({ agentId: a.id, action, from: level, to: s2, proposals: mine.length });
      }
    }
    return ok(ctx, out);
  });
  app.get("/v1/ai/inbox", staffOnly, async (ctx) => {
    const status = ctx.req.query("status") ?? "open";
    const kind = ctx.req.query("kind");
    const items = await c.store.listInbox({ status, kind, limit: Number(ctx.req.query("limit") ?? 100) });
    items.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    return ok(ctx, items);
  });
  app.post("/v1/ai/inbox/:id/approve", staffOnly, async (ctx) => {
    const body = await ctx.req.json().catch(() => ({}));
    try {
      return ok(ctx, await c.actions.approve(ctx.req.param("id") ?? "", ctx.get("principal"), body.input));
    } catch (e) {
      return ctx.json({ success: false, message: e.message }, 409);
    }
  });
  app.post("/v1/ai/inbox/:id/reject", staffOnly, async (ctx) => {
    const { reason } = external_exports.object({ reason: external_exports.string().min(2) }).parse(await ctx.req.json());
    try {
      return ok(ctx, await c.actions.reject(ctx.req.param("id") ?? "", ctx.get("principal"), reason));
    } catch (e) {
      return ctx.json({ success: false, message: e.message }, 404);
    }
  });
  app.post("/v1/ai/inbox/:id/resolve", staffOnly, async (ctx) => {
    const { note, label } = external_exports.object({ note: external_exports.string().default(""), label: external_exports.string().optional() }).parse(await ctx.req.json().catch(() => ({})));
    const item = await c.store.getInbox(ctx.req.param("id") ?? "");
    if (!item) return ctx.json({ success: false, message: "Not found" }, 404);
    const p = ctx.get("principal");
    if (item.kind === "review" && label && item.subject?.type === "document") {
      const [cur] = await c.store.getFileLabels([item.subject.id]);
      const labels = [{ label, confidence: 1 }, ...(cur?.labels ?? []).filter((l) => l.label !== label)];
      await c.store.putFileLabels({ documentId: item.subject.id, labels, extracted: cur?.extracted ?? {}, reviewState: "confirmed", description: cur?.description ?? "", updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
      await c.actions.run({ name: "update_record", input: { record: item.subject, fields: { aiLabels: labels, reviewState: "confirmed" } }, principal: p, auth: { token: ctx.get("token") } });
    }
    if (item.kind === "review" && typeof item.input?.fact_id === "string" && item.subject) {
      const fact = (await c.store.listFacts(item.subject)).find((f) => f.id === item.input.fact_id);
      if (fact) await c.store.putFact({ ...fact, confirmed: true });
    }
    const next = { ...item, status: item.kind === "question" ? "answered" : "resolved", resolvedBy: p.id, resolvedAt: (/* @__PURE__ */ new Date()).toISOString(), resolution: note || "resolved" };
    await c.store.putInbox(next);
    await audit(c, p, "ai.corrected", { inbox_id: item.id, kind: item.kind, note }, item.subject ?? void 0);
    return ok(ctx, next);
  });
  app.get("/v1/ai/records/:type/:id/panel", async (ctx) => {
    const type = ctx.req.param("type") ?? "";
    const id = ctx.req.param("id") ?? "";
    if (!RECORD_TYPES[type]) return ctx.json({ success: false, message: "Unknown record type" }, 404);
    const p = ctx.get("principal");
    const ref2 = { type, id };
    const rec = await c.actions.run({ name: "get_record", input: { record: ref2 }, principal: p, auth: { token: ctx.get("token") } });
    if (rec.status !== "executed") return ctx.json({ success: false, message: rec.message ?? "Not allowed", data: rec }, rec.status === "denied" ? 403 : 404);
    const [summary, facts, decisions, actions, inbox] = await Promise.all([
      c.store.getSummary(ref2),
      c.store.listFacts(ref2),
      isStaff(p) ? c.store.listDecisions({ subject: ref2, limit: 20 }) : Promise.resolve([]),
      isStaff(p) ? c.store.listActionLog({ subject: ref2, limit: 30 }) : Promise.resolve([]),
      isStaff(p) ? c.store.listInbox({ status: "open", limit: 500 }) : Promise.resolve([])
    ]);
    let files = [];
    if (type === "customer" || type === "lead") {
      const f = await c.actions.run({ name: "list_files", input: { record: ref2, latest_only: false }, principal: p, auth: { token: ctx.get("token") } });
      files = f.result ?? [];
    }
    return ok(ctx, {
      summary: summary ?? null,
      facts: isStaff(p) ? facts : facts.filter((f) => f.confirmed),
      decisions,
      actions,
      inbox: inbox.filter((i) => i.subject?.type === type && i.subject.id === id),
      files,
      workflows: Object.values(WORKFLOWS).map((w) => ({ id: w.id, title: w.title, description: w.description }))
    });
  });
  app.post("/v1/ai/screens", async (ctx) => {
    const { request } = external_exports.object({ request: external_exports.string().min(5).max(1e3) }).parse(await ctx.req.json());
    const p = ctx.get("principal");
    if (p.kind === "visitor") return ctx.json({ success: false, message: "Sign in first" }, 403);
    const r = await generateScreenWithRepair(c.model, request, p);
    const evtType = r.ok ? "screen.generated" : "screen.rejected_binding";
    await audit(c, p, evtType, { request, errors: r.ok ? [] : r.errors });
    if (!r.ok) return ctx.json({ success: false, message: "Could not build a valid screen", errors: r.errors }, 422);
    const rec = { id: newId("scr_"), title: r.spec.title, ownerId: p.id, spec: r.spec, pinned: false, sharedRoles: [], version: 1, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
    await c.store.putScreen(rec);
    return ok(ctx, rec, 201);
  });
  app.get("/v1/ai/screens", async (ctx) => ok(ctx, await c.store.listScreens(ctx.get("principal").id)));
  app.post("/v1/ai/screens/:id/pin", async (ctx) => {
    const p = ctx.get("principal");
    const screens = await c.store.listScreens(p.id);
    const s2 = screens.find((x) => x.id === (ctx.req.param("id") ?? ""));
    if (!s2) return ctx.json({ success: false, message: "Not found" }, 404);
    const { pinned } = external_exports.object({ pinned: external_exports.boolean() }).parse(await ctx.req.json());
    const next = { ...s2, pinned };
    await c.store.putScreen(next);
    if (pinned) await audit(c, p, "screen.pinned", { screen_id: s2.id });
    return ok(ctx, next);
  });
  app.post("/v1/ai/screens/validate", async (ctx) => {
    const r = validateScreen(await ctx.req.json(), ctx.get("principal"));
    return r.ok ? ok(ctx, r.spec) : ctx.json({ success: false, message: "Invalid", errors: r.errors }, 422);
  });
  app.get("/v1/ai/partners", staffOnly, async (ctx) => ok(ctx, await c.store.listRecords("partner")));
  app.put("/v1/ai/partners/:id", staffOnly, async (ctx) => {
    const body = external_exports.object({
      name: external_exports.string().min(2).optional(),
      kind: external_exports.enum(["retailer", "dnsp", "supplier", "finance", "other"]).optional(),
      submissionEmail: external_exports.string().email().optional(),
      email: external_exports.string().email().optional(),
      phone: external_exports.string().optional(),
      attach: external_exports.boolean().optional(),
      aliases: external_exports.array(external_exports.string()).optional(),
      verified: external_exports.boolean().optional(),
      notes: external_exports.string().max(1e3).optional()
    }).parse(await ctx.req.json());
    const id = ctx.req.param("id") ?? "";
    const cur = await c.store.getRecord("partner", id);
    const p = ctx.get("principal");
    const row = { ...cur ?? { createdAt: (/* @__PURE__ */ new Date()).toISOString() }, ...body, id, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), ...body.verified ? { verifiedBy: p.id, verifiedAt: (/* @__PURE__ */ new Date()).toISOString() } : {} };
    await c.store.putRecord("partner", row);
    await audit(c, p, cur ? "partner.updated" : "partner.created", { fields: Object.keys(body) }, { type: "partner", id });
    return ok(ctx, row);
  });
  app.get("/v1/ai/config/:key", staffOnly, async (ctx) => {
    const key = ctx.req.param("key") ?? "";
    if (!["document_routes", "contact_rules"].includes(key)) return ctx.json({ success: false, message: "Unknown setting" }, 404);
    const { DEFAULT_ROUTES: DEFAULT_ROUTES2 } = await Promise.resolve().then(() => (init_classify(), classify_exports));
    const { DEFAULT_CONTACT_RULES: DEFAULT_CONTACT_RULES2 } = await Promise.resolve().then(() => (init_finder(), finder_exports));
    const cur = await c.store.getRecord("config", key);
    return ok(ctx, cur ?? { id: key, [key === "document_routes" ? "routes" : "rules"]: key === "document_routes" ? DEFAULT_ROUTES2 : DEFAULT_CONTACT_RULES2, default: true });
  });
  app.put("/v1/ai/config/:key", staffOnly, async (ctx) => {
    const key = ctx.req.param("key") ?? "";
    if (!["document_routes", "contact_rules"].includes(key)) return ctx.json({ success: false, message: "Unknown setting" }, 404);
    const body = await ctx.req.json();
    const row = { ...body, id: key, updatedBy: ctx.get("principal").id, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
    await c.store.putRecord("config", row);
    await audit(c, ctx.get("principal"), "ai.autonomy_changed", { setting: key });
    return ok(ctx, row);
  });
  app.get("/v1/ai/activity", staffOnly, async (ctx) => {
    const limit = Math.min(Number(ctx.req.query("limit") ?? 50), 200);
    const [decisions, events] = await Promise.all([c.store.listDecisions({ limit }), c.store.recentEvents(limit)]);
    return ok(ctx, { decisions, events: events.map((e) => ({ id: e.event_id, type: e.type, at: e.occurred_at, subject: e.subject, principal: { kind: e.principal.kind, id: e.principal.id } })) });
  });
  registerProjectRoutes(app, c);
  const jobs = registerJobRoutes(app, c);
  registerVoiceRoutes(app, c, jobs);
  app.onError((err, ctx) => {
    if (err instanceof external_exports.ZodError) return ctx.json({ success: false, message: "Invalid request", errors: err.flatten() }, 400);
    console.error(err);
    return ctx.json({ success: false, message: "Internal error" }, 500);
  });
  return app;
}
async function audit(c, p, type, data, subject) {
  const evt = makeEvent({ type, source: "ai-control", principal: p, subject: subject ?? { type: "ai_control", id: "global" }, data });
  await c.store.recordEvent(evt);
  await c.bus.publish([evt]);
}

// src/handlers/api.ts
await loadSecrets();
var handler = handle(createApp(buildContainer()));
export {
  handler
};
