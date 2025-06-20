import {
  AIMessage,
  HumanMessage,
  Runnable,
  RunnableAssign,
  RunnableBinding,
  RunnableLambda,
  RunnableMap,
  _coerceToDict,
  _coerceToRunnable,
  concat,
  ensureConfig,
  getCallbackManagerForConfig,
  isBaseMessage,
  patchConfig
} from "./chunk-BE3OOYYY.js";

// node_modules/@langchain/core/dist/runnables/passthrough.js
var RunnablePassthrough = class extends Runnable {
  static lc_name() {
    return "RunnablePassthrough";
  }
  constructor(fields) {
    super(fields);
    Object.defineProperty(this, "lc_namespace", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: ["langchain_core", "runnables"]
    });
    Object.defineProperty(this, "lc_serializable", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: true
    });
    Object.defineProperty(this, "func", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    if (fields) {
      this.func = fields.func;
    }
  }
  async invoke(input, options) {
    const config = ensureConfig(options);
    if (this.func) {
      await this.func(input, config);
    }
    return this._callWithConfig((input2) => Promise.resolve(input2), input, config);
  }
  async *transform(generator, options) {
    const config = ensureConfig(options);
    let finalOutput;
    let finalOutputSupported = true;
    for await (const chunk of this._transformStreamWithConfig(generator, (input) => input, config)) {
      yield chunk;
      if (finalOutputSupported) {
        if (finalOutput === void 0) {
          finalOutput = chunk;
        } else {
          try {
            finalOutput = concat(finalOutput, chunk);
          } catch {
            finalOutput = void 0;
            finalOutputSupported = false;
          }
        }
      }
    }
    if (this.func && finalOutput !== void 0) {
      await this.func(finalOutput, config);
    }
  }
  /**
   * A runnable that assigns key-value pairs to the input.
   *
   * The example below shows how you could use it with an inline function.
   *
   * @example
   * ```typescript
   * const prompt =
   *   PromptTemplate.fromTemplate(`Write a SQL query to answer the question using the following schema: {schema}
   * Question: {question}
   * SQL Query:`);
   *
   * // The `RunnablePassthrough.assign()` is used here to passthrough the input from the `.invoke()`
   * // call (in this example it's the question), along with any inputs passed to the `.assign()` method.
   * // In this case, we're passing the schema.
   * const sqlQueryGeneratorChain = RunnableSequence.from([
   *   RunnablePassthrough.assign({
   *     schema: async () => db.getTableInfo(),
   *   }),
   *   prompt,
   *   new ChatOpenAI({}).withConfig({ stop: ["\nSQLResult:"] }),
   *   new StringOutputParser(),
   * ]);
   * const result = await sqlQueryGeneratorChain.invoke({
   *   question: "How many employees are there?",
   * });
   * ```
   */
  static assign(mapping) {
    return new RunnableAssign(new RunnableMap({ steps: mapping }));
  }
};

// node_modules/@langchain/core/dist/runnables/router.js
var RouterRunnable = class extends Runnable {
  static lc_name() {
    return "RouterRunnable";
  }
  constructor(fields) {
    super(fields);
    Object.defineProperty(this, "lc_namespace", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: ["langchain_core", "runnables"]
    });
    Object.defineProperty(this, "lc_serializable", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: true
    });
    Object.defineProperty(this, "runnables", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.runnables = fields.runnables;
  }
  async invoke(input, options) {
    const { key, input: actualInput } = input;
    const runnable = this.runnables[key];
    if (runnable === void 0) {
      throw new Error(`No runnable associated with key "${key}".`);
    }
    return runnable.invoke(actualInput, ensureConfig(options));
  }
  async batch(inputs, options, batchOptions) {
    var _a;
    const keys = inputs.map((input) => input.key);
    const actualInputs = inputs.map((input) => input.input);
    const missingKey = keys.find((key) => this.runnables[key] === void 0);
    if (missingKey !== void 0) {
      throw new Error(`One or more keys do not have a corresponding runnable.`);
    }
    const runnables = keys.map((key) => this.runnables[key]);
    const optionsList = this._getOptionsList(options ?? {}, inputs.length);
    const maxConcurrency = ((_a = optionsList[0]) == null ? void 0 : _a.maxConcurrency) ?? (batchOptions == null ? void 0 : batchOptions.maxConcurrency);
    const batchSize = maxConcurrency && maxConcurrency > 0 ? maxConcurrency : inputs.length;
    const batchResults = [];
    for (let i = 0; i < actualInputs.length; i += batchSize) {
      const batchPromises = actualInputs.slice(i, i + batchSize).map((actualInput, i2) => runnables[i2].invoke(actualInput, optionsList[i2]));
      const batchResult = await Promise.all(batchPromises);
      batchResults.push(batchResult);
    }
    return batchResults.flat();
  }
  async stream(input, options) {
    const { key, input: actualInput } = input;
    const runnable = this.runnables[key];
    if (runnable === void 0) {
      throw new Error(`No runnable associated with key "${key}".`);
    }
    return runnable.stream(actualInput, options);
  }
};

// node_modules/@langchain/core/dist/runnables/branch.js
var RunnableBranch = class extends Runnable {
  static lc_name() {
    return "RunnableBranch";
  }
  constructor(fields) {
    super(fields);
    Object.defineProperty(this, "lc_namespace", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: ["langchain_core", "runnables"]
    });
    Object.defineProperty(this, "lc_serializable", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: true
    });
    Object.defineProperty(this, "default", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "branches", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.branches = fields.branches;
    this.default = fields.default;
  }
  /**
   * Convenience method for instantiating a RunnableBranch from
   * RunnableLikes (objects, functions, or Runnables).
   *
   * Each item in the input except for the last one should be a
   * tuple with two items. The first is a "condition" RunnableLike that
   * returns "true" if the second RunnableLike in the tuple should run.
   *
   * The final item in the input should be a RunnableLike that acts as a
   * default branch if no other branches match.
   *
   * @example
   * ```ts
   * import { RunnableBranch } from "@langchain/core/runnables";
   *
   * const branch = RunnableBranch.from([
   *   [(x: number) => x > 0, (x: number) => x + 1],
   *   [(x: number) => x < 0, (x: number) => x - 1],
   *   (x: number) => x
   * ]);
   * ```
   * @param branches An array where the every item except the last is a tuple of [condition, runnable]
   *   pairs. The last item is a default runnable which is invoked if no other condition matches.
   * @returns A new RunnableBranch.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static from(branches) {
    if (branches.length < 1) {
      throw new Error("RunnableBranch requires at least one branch");
    }
    const branchLikes = branches.slice(0, -1);
    const coercedBranches = branchLikes.map(([condition, runnable]) => [
      _coerceToRunnable(condition),
      _coerceToRunnable(runnable)
    ]);
    const defaultBranch = _coerceToRunnable(branches[branches.length - 1]);
    return new this({
      branches: coercedBranches,
      default: defaultBranch
    });
  }
  async _invoke(input, config, runManager) {
    let result;
    for (let i = 0; i < this.branches.length; i += 1) {
      const [condition, branchRunnable] = this.branches[i];
      const conditionValue = await condition.invoke(input, patchConfig(config, {
        callbacks: runManager == null ? void 0 : runManager.getChild(`condition:${i + 1}`)
      }));
      if (conditionValue) {
        result = await branchRunnable.invoke(input, patchConfig(config, {
          callbacks: runManager == null ? void 0 : runManager.getChild(`branch:${i + 1}`)
        }));
        break;
      }
    }
    if (!result) {
      result = await this.default.invoke(input, patchConfig(config, {
        callbacks: runManager == null ? void 0 : runManager.getChild("branch:default")
      }));
    }
    return result;
  }
  async invoke(input, config = {}) {
    return this._callWithConfig(this._invoke, input, config);
  }
  async *_streamIterator(input, config) {
    const callbackManager_ = await getCallbackManagerForConfig(config);
    const runManager = await (callbackManager_ == null ? void 0 : callbackManager_.handleChainStart(this.toJSON(), _coerceToDict(input, "input"), config == null ? void 0 : config.runId, void 0, void 0, void 0, config == null ? void 0 : config.runName));
    let finalOutput;
    let finalOutputSupported = true;
    let stream;
    try {
      for (let i = 0; i < this.branches.length; i += 1) {
        const [condition, branchRunnable] = this.branches[i];
        const conditionValue = await condition.invoke(input, patchConfig(config, {
          callbacks: runManager == null ? void 0 : runManager.getChild(`condition:${i + 1}`)
        }));
        if (conditionValue) {
          stream = await branchRunnable.stream(input, patchConfig(config, {
            callbacks: runManager == null ? void 0 : runManager.getChild(`branch:${i + 1}`)
          }));
          for await (const chunk of stream) {
            yield chunk;
            if (finalOutputSupported) {
              if (finalOutput === void 0) {
                finalOutput = chunk;
              } else {
                try {
                  finalOutput = concat(finalOutput, chunk);
                } catch (e) {
                  finalOutput = void 0;
                  finalOutputSupported = false;
                }
              }
            }
          }
          break;
        }
      }
      if (stream === void 0) {
        stream = await this.default.stream(input, patchConfig(config, {
          callbacks: runManager == null ? void 0 : runManager.getChild("branch:default")
        }));
        for await (const chunk of stream) {
          yield chunk;
          if (finalOutputSupported) {
            if (finalOutput === void 0) {
              finalOutput = chunk;
            } else {
              try {
                finalOutput = concat(finalOutput, chunk);
              } catch (e) {
                finalOutput = void 0;
                finalOutputSupported = false;
              }
            }
          }
        }
      }
    } catch (e) {
      await (runManager == null ? void 0 : runManager.handleChainError(e));
      throw e;
    }
    await (runManager == null ? void 0 : runManager.handleChainEnd(finalOutput ?? {}));
  }
};

// node_modules/@langchain/core/dist/runnables/history.js
var RunnableWithMessageHistory = class extends RunnableBinding {
  constructor(fields) {
    let historyChain = RunnableLambda.from((input, options) => this._enterHistory(input, options ?? {})).withConfig({ runName: "loadHistory" });
    const messagesKey = fields.historyMessagesKey ?? fields.inputMessagesKey;
    if (messagesKey) {
      historyChain = RunnablePassthrough.assign({
        [messagesKey]: historyChain
      }).withConfig({ runName: "insertHistory" });
    }
    const bound = historyChain.pipe(fields.runnable.withListeners({
      onEnd: (run, config2) => this._exitHistory(run, config2 ?? {})
    })).withConfig({ runName: "RunnableWithMessageHistory" });
    const config = fields.config ?? {};
    super({
      ...fields,
      config,
      bound
    });
    Object.defineProperty(this, "runnable", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "inputMessagesKey", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "outputMessagesKey", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "historyMessagesKey", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "getMessageHistory", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.runnable = fields.runnable;
    this.getMessageHistory = fields.getMessageHistory;
    this.inputMessagesKey = fields.inputMessagesKey;
    this.outputMessagesKey = fields.outputMessagesKey;
    this.historyMessagesKey = fields.historyMessagesKey;
  }
  _getInputMessages(inputValue) {
    let parsedInputValue;
    if (typeof inputValue === "object" && !Array.isArray(inputValue) && !isBaseMessage(inputValue)) {
      let key;
      if (this.inputMessagesKey) {
        key = this.inputMessagesKey;
      } else if (Object.keys(inputValue).length === 1) {
        key = Object.keys(inputValue)[0];
      } else {
        key = "input";
      }
      if (Array.isArray(inputValue[key]) && Array.isArray(inputValue[key][0])) {
        parsedInputValue = inputValue[key][0];
      } else {
        parsedInputValue = inputValue[key];
      }
    } else {
      parsedInputValue = inputValue;
    }
    if (typeof parsedInputValue === "string") {
      return [new HumanMessage(parsedInputValue)];
    } else if (Array.isArray(parsedInputValue)) {
      return parsedInputValue;
    } else if (isBaseMessage(parsedInputValue)) {
      return [parsedInputValue];
    } else {
      throw new Error(`Expected a string, BaseMessage, or array of BaseMessages.
Got ${JSON.stringify(parsedInputValue, null, 2)}`);
    }
  }
  _getOutputMessages(outputValue) {
    let parsedOutputValue;
    if (!Array.isArray(outputValue) && !isBaseMessage(outputValue) && typeof outputValue !== "string") {
      let key;
      if (this.outputMessagesKey !== void 0) {
        key = this.outputMessagesKey;
      } else if (Object.keys(outputValue).length === 1) {
        key = Object.keys(outputValue)[0];
      } else {
        key = "output";
      }
      if (outputValue.generations !== void 0) {
        parsedOutputValue = outputValue.generations[0][0].message;
      } else {
        parsedOutputValue = outputValue[key];
      }
    } else {
      parsedOutputValue = outputValue;
    }
    if (typeof parsedOutputValue === "string") {
      return [new AIMessage(parsedOutputValue)];
    } else if (Array.isArray(parsedOutputValue)) {
      return parsedOutputValue;
    } else if (isBaseMessage(parsedOutputValue)) {
      return [parsedOutputValue];
    } else {
      throw new Error(`Expected a string, BaseMessage, or array of BaseMessages. Received: ${JSON.stringify(parsedOutputValue, null, 2)}`);
    }
  }
  async _enterHistory(input, kwargs) {
    var _a;
    const history = (_a = kwargs == null ? void 0 : kwargs.configurable) == null ? void 0 : _a.messageHistory;
    const messages = await history.getMessages();
    if (this.historyMessagesKey === void 0) {
      return messages.concat(this._getInputMessages(input));
    }
    return messages;
  }
  async _exitHistory(run, config) {
    var _a;
    const history = (_a = config.configurable) == null ? void 0 : _a.messageHistory;
    let inputs;
    if (Array.isArray(run.inputs) && Array.isArray(run.inputs[0])) {
      inputs = run.inputs[0];
    } else {
      inputs = run.inputs;
    }
    let inputMessages = this._getInputMessages(inputs);
    if (this.historyMessagesKey === void 0) {
      const existingMessages = await history.getMessages();
      inputMessages = inputMessages.slice(existingMessages.length);
    }
    const outputValue = run.outputs;
    if (!outputValue) {
      throw new Error(`Output values from 'Run' undefined. Run: ${JSON.stringify(run, null, 2)}`);
    }
    const outputMessages = this._getOutputMessages(outputValue);
    await history.addMessages([...inputMessages, ...outputMessages]);
  }
  async _mergeConfig(...configs) {
    const config = await super._mergeConfig(...configs);
    if (!config.configurable || !config.configurable.sessionId) {
      const exampleInput = {
        [this.inputMessagesKey ?? "input"]: "foo"
      };
      const exampleConfig = { configurable: { sessionId: "123" } };
      throw new Error(`sessionId is required. Pass it in as part of the config argument to .invoke() or .stream()
eg. chain.invoke(${JSON.stringify(exampleInput)}, ${JSON.stringify(exampleConfig)})`);
    }
    const { sessionId } = config.configurable;
    config.configurable.messageHistory = await this.getMessageHistory(sessionId);
    return config;
  }
};

export {
  RunnablePassthrough,
  RouterRunnable,
  RunnableBranch,
  RunnableWithMessageHistory
};
//# sourceMappingURL=chunk-JGDNEVWM.js.map
