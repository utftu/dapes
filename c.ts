const prefix = "\x1b[32m[worker]\x1b[0m ";

const tee = async (
  read: ReadableStream<Uint8Array>,
  write: (text: string) => void,
  prefix: string
) => {
  const reader = read.getReader();
  const decoder = new TextDecoder("utf-8");
  let leftover = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      if (leftover) write(prefix + leftover + "\n");
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    const lines = (leftover + chunk).split("\n");

    leftover = lines.pop() ?? "";

    for (const line of lines) {
      write(prefix + line + "\n");
    }
  }
};

// создаём поток из текста
const input = new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode("Hello\nWorld\n"));
    controller.close();
  },
});

tee(input, (text) => process.stdout.write(text), prefix);
