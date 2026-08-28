export const STOP = "stop";
export const CONTINUE = "continue";

const SIGNALS = {
  stop: "stop",
  continue: "continue",
};

type Plugin = () => keyof typeof SIGNALS;
