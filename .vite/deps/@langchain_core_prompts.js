import {
  AIMessagePromptTemplate,
  BaseChatPromptTemplate,
  BaseMessagePromptTemplate,
  BaseMessageStringPromptTemplate,
  ChatMessagePromptTemplate,
  ChatPromptTemplate,
  DictPromptTemplate,
  FewShotChatMessagePromptTemplate,
  FewShotPromptTemplate,
  HumanMessagePromptTemplate,
  ImagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate
} from "./chunk-EQEX45YV.js";
import {
  BasePromptTemplate,
  BaseStringPromptTemplate,
  DEFAULT_FORMATTER_MAPPING,
  DEFAULT_PARSER_MAPPING,
  PromptTemplate,
  checkValidTemplate,
  interpolateFString,
  interpolateMustache,
  parseFString,
  parseMustache,
  parseTemplate,
  renderTemplate
} from "./chunk-K6BANGZR.js";
import "./chunk-C7ZRAUQB.js";
import "./chunk-YIGG5L74.js";
import {
  RunnableBinding
} from "./chunk-BE3OOYYY.js";
import "./chunk-OL46QLBJ.js";

// node_modules/@langchain/core/dist/prompts/pipeline.js
var PipelinePromptTemplate = class _PipelinePromptTemplate extends BasePromptTemplate {
  static lc_name() {
    return "PipelinePromptTemplate";
  }
  constructor(input) {
    super({ ...input, inputVariables: [] });
    Object.defineProperty(this, "pipelinePrompts", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "finalPrompt", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    this.pipelinePrompts = input.pipelinePrompts;
    this.finalPrompt = input.finalPrompt;
    this.inputVariables = this.computeInputValues();
  }
  /**
   * Computes the input values required by the pipeline prompts.
   * @returns Array of input values required by the pipeline prompts.
   */
  computeInputValues() {
    const intermediateValues = this.pipelinePrompts.map((pipelinePrompt) => pipelinePrompt.name);
    const inputValues = this.pipelinePrompts.map((pipelinePrompt) => pipelinePrompt.prompt.inputVariables.filter((inputValue) => !intermediateValues.includes(inputValue))).flat();
    return [...new Set(inputValues)];
  }
  static extractRequiredInputValues(allValues, requiredValueNames) {
    return requiredValueNames.reduce((requiredValues, valueName) => {
      requiredValues[valueName] = allValues[valueName];
      return requiredValues;
    }, {});
  }
  /**
   * Formats the pipeline prompts based on the provided input values.
   * @param values Input values to format the pipeline prompts.
   * @returns Promise that resolves with the formatted input values.
   */
  async formatPipelinePrompts(values) {
    const allValues = await this.mergePartialAndUserVariables(values);
    for (const { name: pipelinePromptName, prompt: pipelinePrompt } of this.pipelinePrompts) {
      const pipelinePromptInputValues = _PipelinePromptTemplate.extractRequiredInputValues(allValues, pipelinePrompt.inputVariables);
      if (pipelinePrompt instanceof ChatPromptTemplate) {
        allValues[pipelinePromptName] = await pipelinePrompt.formatMessages(pipelinePromptInputValues);
      } else {
        allValues[pipelinePromptName] = await pipelinePrompt.format(pipelinePromptInputValues);
      }
    }
    return _PipelinePromptTemplate.extractRequiredInputValues(allValues, this.finalPrompt.inputVariables);
  }
  /**
   * Formats the final prompt value based on the provided input values.
   * @param values Input values to format the final prompt value.
   * @returns Promise that resolves with the formatted final prompt value.
   */
  async formatPromptValue(values) {
    return this.finalPrompt.formatPromptValue(await this.formatPipelinePrompts(values));
  }
  async format(values) {
    return this.finalPrompt.format(await this.formatPipelinePrompts(values));
  }
  /**
   * Handles partial prompts, which are prompts that have been partially
   * filled with input values.
   * @param values Partial input values.
   * @returns Promise that resolves with a new PipelinePromptTemplate instance with updated input variables.
   */
  async partial(values) {
    const promptDict = { ...this };
    promptDict.inputVariables = this.inputVariables.filter((iv) => !(iv in values));
    promptDict.partialVariables = {
      ...this.partialVariables ?? {},
      ...values
    };
    return new _PipelinePromptTemplate(promptDict);
  }
  serialize() {
    throw new Error("Not implemented.");
  }
  _getPromptType() {
    return "pipeline";
  }
};

// node_modules/@langchain/core/dist/prompts/structured.js
function isWithStructuredOutput(x) {
  return typeof x === "object" && x != null && "withStructuredOutput" in x && typeof x.withStructuredOutput === "function";
}
function isRunnableBinding(x) {
  return typeof x === "object" && x != null && "lc_id" in x && Array.isArray(x.lc_id) && x.lc_id.join("/") === "langchain_core/runnables/RunnableBinding";
}
var StructuredPrompt = class _StructuredPrompt extends ChatPromptTemplate {
  get lc_aliases() {
    return {
      ...super.lc_aliases,
      schema: "schema_"
    };
  }
  constructor(input) {
    super(input);
    Object.defineProperty(this, "schema", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "method", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, "lc_namespace", {
      enumerable: true,
      configurable: true,
      writable: true,
      value: ["langchain_core", "prompts", "structured"]
    });
    this.schema = input.schema;
    this.method = input.method;
  }
  pipe(coerceable) {
    if (isWithStructuredOutput(coerceable)) {
      return super.pipe(coerceable.withStructuredOutput(this.schema));
    }
    if (isRunnableBinding(coerceable) && isWithStructuredOutput(coerceable.bound)) {
      return super.pipe(new RunnableBinding({
        bound: coerceable.bound.withStructuredOutput(this.schema, ...this.method ? [{ method: this.method }] : []),
        kwargs: coerceable.kwargs ?? {},
        config: coerceable.config,
        configFactories: coerceable.configFactories
      }));
    }
    throw new Error(`Structured prompts need to be piped to a language model that supports the "withStructuredOutput()" method.`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static fromMessagesAndSchema(promptMessages, schema, method) {
    return _StructuredPrompt.fromMessages(promptMessages, { schema, method });
  }
};
export {
  AIMessagePromptTemplate,
  BaseChatPromptTemplate,
  BaseMessagePromptTemplate,
  BaseMessageStringPromptTemplate,
  BasePromptTemplate,
  BaseStringPromptTemplate,
  ChatMessagePromptTemplate,
  ChatPromptTemplate,
  DEFAULT_FORMATTER_MAPPING,
  DEFAULT_PARSER_MAPPING,
  DictPromptTemplate,
  FewShotChatMessagePromptTemplate,
  FewShotPromptTemplate,
  HumanMessagePromptTemplate,
  ImagePromptTemplate,
  MessagesPlaceholder,
  PipelinePromptTemplate,
  PromptTemplate,
  StructuredPrompt,
  SystemMessagePromptTemplate,
  checkValidTemplate,
  interpolateFString,
  interpolateMustache,
  parseFString,
  parseMustache,
  parseTemplate,
  renderTemplate
};
//# sourceMappingURL=@langchain_core_prompts.js.map
