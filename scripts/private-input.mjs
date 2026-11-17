import { createInterface } from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
export async function promptText(label) {
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    return await prompt.question(label);
  } finally {
    prompt.close();
  }
}
export async function promptHidden(label) {
  if (!process.stdin.isTTY)
    throw Error(
      "Run this command in an interactive terminal, or use --stdin-json with private stdin.",
    );
  process.stdout.write(label);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return await new Promise((resolve) => {
    let value = "";
    const listener = (str, key) => {
      if (key?.ctrl && key.name === "c") {
        process.stdin.setRawMode(false);
        process.exit(130);
      }
      if (key?.name === "return") {
        process.stdin.off("keypress", listener);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(value);
      } else if (key?.name === "backspace") value = value.slice(0, -1);
      else if (str && !key?.ctrl) value += str;
    };
    process.stdin.on("keypress", listener);
  });
}
export async function privateJSON() {
  const tty = process.stdin.isTTY;
  if (tty) {
    process.stdin.setRawMode(true);
    process.stdout.write(
      "Ready for private setup JSON on stdin (input is hidden).\n",
    );
  }
  process.stdin.resume();
  return await new Promise((resolve, reject) => {
    let input = "";
    const finish = () => {
      process.stdin.off("data", read);
      process.stdin.pause();
      if (tty) process.stdin.setRawMode(false);
      try {
        resolve(JSON.parse(input));
      } catch {
        reject(Error("Invalid private setup input."));
      }
    };
    const read = (chunk) => {
      input += chunk;
      if (input.includes("\u0003")) process.exit(130);
      if (input.length > 65536) {
        process.stdin.off("data", read);
        reject(Error("Private setup input is too large."));
        return;
      }
      if (input.includes("\n")) finish();
    };
    process.stdin.on("data", read);
    process.stdin.once("end", finish);
  });
}
