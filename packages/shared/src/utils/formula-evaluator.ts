/**
 * Formula engine cho field type FORMULA — ngôn ngữ biểu thức nhỏ, AN TOÀN
 * (không dùng eval()/Function(), tự viết tokenizer + recursive-descent parser)
 * vì field này được hiển thị cho mọi role xem Grid, không chỉ người tạo field
 * (ADMIN/HR_MANAGER) — khác FUNCTION node trong Automation (chỉ tác giả workflow
 * thấy kết quả) nên không tái dùng node:vm ở đó.
 *
 * Cú pháp: {{fieldKey}} tham chiếu field khác trên cùng record, số/chuỗi
 * literal, + - * / () so sánh (== != > < >= <=), và hàm ROUND/ABS/MIN/MAX/
 * CONCAT/IF/LEN/UPPER/LOWER.
 */

export type FormulaValue = number | string | boolean | null;

type TokenType =
  | "NUMBER"
  | "STRING"
  | "FIELD_REF"
  | "IDENT"
  | "OP"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "EOF";

interface Token {
  type: TokenType;
  value: string;
}

const OPERATORS = ["==", "!=", ">=", "<=", ">", "<", "+", "-", "*", "/"];

export function extractFormulaFieldKeys(expression: string): string[] {
  const keys = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(expression)) !== null) {
    keys.add(match[1]!);
  }
  return Array.from(keys);
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expression.length) {
    const ch = expression[i]!;

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === "{" && expression[i + 1] === "{") {
      const end = expression.indexOf("}}", i + 2);
      if (end === -1) throw new Error("Thiếu '}}' đóng tham chiếu field trong công thức");
      const fieldKey = expression.slice(i + 2, end).trim();
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldKey)) {
        throw new Error(`Tên field không hợp lệ trong {{${fieldKey}}}`);
      }
      tokens.push({ type: "FIELD_REF", value: fieldKey });
      i = end + 2;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let str = "";
      while (j < expression.length && expression[j] !== quote) {
        str += expression[j];
        j++;
      }
      if (j >= expression.length) throw new Error("Thiếu dấu nháy đóng chuỗi trong công thức");
      tokens.push({ type: "STRING", value: str });
      i = j + 1;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < expression.length && /[0-9.]/.test(expression[j]!)) j++;
      tokens.push({ type: "NUMBER", value: expression.slice(i, j) });
      i = j;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < expression.length && /[a-zA-Z0-9_]/.test(expression[j]!)) j++;
      tokens.push({ type: "IDENT", value: expression.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: ch });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ch });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "COMMA", value: ch });
      i++;
      continue;
    }

    const twoChar = expression.slice(i, i + 2);
    if (OPERATORS.includes(twoChar)) {
      tokens.push({ type: "OP", value: twoChar });
      i += 2;
      continue;
    }
    if (OPERATORS.includes(ch)) {
      tokens.push({ type: "OP", value: ch });
      i++;
      continue;
    }

    throw new Error(`Ký tự không hợp lệ trong công thức: "${ch}"`);
  }
  tokens.push({ type: "EOF", value: "" });
  return tokens;
}

const FUNCTIONS: Record<string, (args: FormulaValue[]) => FormulaValue> = {
  ROUND: (args) => {
    const [value, digits] = args;
    const d = typeof digits === "number" ? digits : 0;
    const factor = 10 ** d;
    return Math.round(toNumber(value) * factor) / factor;
  },
  ABS: (args) => Math.abs(toNumber(args[0])),
  MIN: (args) => Math.min(...args.map(toNumber)),
  MAX: (args) => Math.max(...args.map(toNumber)),
  CONCAT: (args) => args.map((a) => (a === null ? "" : String(a))).join(""),
  IF: (args) => (toBoolean(args[0]) ? args[1]! : args[2]!),
  LEN: (args) => String(args[0] ?? "").length,
  UPPER: (args) => String(args[0] ?? "").toUpperCase(),
  LOWER: (args) => String(args[0] ?? "").toLowerCase(),
};

function toNumber(value: FormulaValue | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function toBoolean(value: FormulaValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return value !== "";
}

class FormulaParser {
  private pos = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly fieldValues: Record<string, unknown>,
  ) {}

  private peek(): Token {
    return this.tokens[this.pos]!;
  }
  private next(): Token {
    return this.tokens[this.pos++]!;
  }
  private expect(type: TokenType): Token {
    const token = this.next();
    if (token.type !== type) {
      throw new Error(`Công thức sai cú pháp: kỳ vọng ${type}, gặp "${token.value}"`);
    }
    return token;
  }

  parse(): FormulaValue {
    const result = this.parseComparison();
    this.expect("EOF");
    return result;
  }

  private parseComparison(): FormulaValue {
    let left = this.parseAdditive();
    const opTokens = ["==", "!=", ">", "<", ">=", "<="];
    while (this.peek().type === "OP" && opTokens.includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseAdditive();
      left = this.applyComparison(op, left, right);
    }
    return left;
  }

  private applyComparison(op: string, left: FormulaValue, right: FormulaValue): boolean {
    switch (op) {
      case "==":
        return left === right;
      case "!=":
        return left !== right;
      case ">":
        return toNumber(left) > toNumber(right);
      case "<":
        return toNumber(left) < toNumber(right);
      case ">=":
        return toNumber(left) >= toNumber(right);
      case "<=":
        return toNumber(left) <= toNumber(right);
      default:
        throw new Error(`Toán tử so sánh không hỗ trợ: ${op}`);
    }
  }

  private parseAdditive(): FormulaValue {
    let left = this.parseMultiplicative();
    while (this.peek().type === "OP" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.next().value;
      const right = this.parseMultiplicative();
      if (op === "+") {
        left =
          typeof left === "string" || typeof right === "string"
            ? `${left ?? ""}${right ?? ""}`
            : toNumber(left) + toNumber(right);
      } else {
        left = toNumber(left) - toNumber(right);
      }
    }
    return left;
  }

  private parseMultiplicative(): FormulaValue {
    let left = this.parseUnary();
    while (this.peek().type === "OP" && (this.peek().value === "*" || this.peek().value === "/")) {
      const op = this.next().value;
      const right = this.parseUnary();
      left = op === "*" ? toNumber(left) * toNumber(right) : toNumber(left) / toNumber(right);
    }
    return left;
  }

  private parseUnary(): FormulaValue {
    if (this.peek().type === "OP" && this.peek().value === "-") {
      this.next();
      return -toNumber(this.parseUnary());
    }
    return this.parsePrimary();
  }

  private parsePrimary(): FormulaValue {
    const token = this.peek();

    if (token.type === "NUMBER") {
      this.next();
      return Number(token.value);
    }
    if (token.type === "STRING") {
      this.next();
      return token.value;
    }
    if (token.type === "FIELD_REF") {
      this.next();
      const raw = this.fieldValues[token.value];
      if (raw === undefined || raw === null) return null;
      if (typeof raw === "number" || typeof raw === "string" || typeof raw === "boolean") return raw;
      return String(raw);
    }
    if (token.type === "LPAREN") {
      this.next();
      const inner = this.parseComparison();
      this.expect("RPAREN");
      return inner;
    }
    if (token.type === "IDENT") {
      this.next();
      const fn = FUNCTIONS[token.value.toUpperCase()];
      if (!fn) throw new Error(`Hàm không được hỗ trợ: ${token.value}`);
      this.expect("LPAREN");
      const args: FormulaValue[] = [];
      if (this.peek().type !== "RPAREN") {
        args.push(this.parseComparison());
        while (this.peek().type === "COMMA") {
          this.next();
          args.push(this.parseComparison());
        }
      }
      this.expect("RPAREN");
      return fn(args);
    }

    throw new Error(`Công thức sai cú pháp tại "${token.value || "(hết)"}"`);
  }
}

export function evaluateFormula(
  expression: string,
  fieldValues: Record<string, unknown>,
): FormulaValue {
  const tokens = tokenize(expression);
  const parser = new FormulaParser(tokens, fieldValues);
  return parser.parse();
}
