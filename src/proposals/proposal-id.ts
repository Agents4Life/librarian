import { randomBytes } from "node:crypto";

export const generateProposalId = (): string => {
  const now = new Date();
  const iso = now.toISOString().replace(/[:.]/g, "-").replace(/Z$/, "");
  const suffix = randomBytes(3).toString("hex");
  return `${iso}-${suffix}`;
};
