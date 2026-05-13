import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ProposalStatus, StoredProposal, CreateProposalInput, ProposalDiagnostics } from "./types.js";
import { generateProposalId } from "./proposal-id.js";

const PROPOSALS_DIR = ".librarian";
const PROPOSALS_SUBDIR = "proposals";

const proposalsDir = (vaultPath: string) =>
  path.join(vaultPath, PROPOSALS_DIR, PROPOSALS_SUBDIR);

const proposalPath = (vaultPath: string, id: string) =>
  path.join(proposalsDir(vaultPath), `${id}.json`);

const emptyDiagnostics = (): ProposalDiagnostics => ({
  warnings: [],
  relatedPaths: [],
  duplicateCandidates: [],
});

export interface ProposalStore {
  create(input: CreateProposalInput): Promise<StoredProposal>;
  get(id: string): Promise<StoredProposal | null>;
  list(status?: ProposalStatus): Promise<StoredProposal[]>;
  updateStatus(id: string, status: ProposalStatus): Promise<StoredProposal>;
}

export class FileProposalStore implements ProposalStore {
  constructor(private readonly vaultPath: string) {}

  async create(input: CreateProposalInput): Promise<StoredProposal> {
    const id = generateProposalId();
    const now = new Date().toISOString();
    const proposal: StoredProposal = {
      id,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      sourcePath: input.sourcePath,
      proposal: input.proposal,
      diagnostics: emptyDiagnostics(),
    };

    const filePath = proposalPath(this.vaultPath, id);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(proposal, null, 2), "utf8");

    return proposal;
  }

  async get(id: string): Promise<StoredProposal | null> {
    const filePath = proposalPath(this.vaultPath, id);

    let raw: string;
    try {
      raw = await readFile(filePath, "utf8");
    } catch (error) {
      if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }

    return JSON.parse(raw) as StoredProposal;
  }

  async list(status?: ProposalStatus): Promise<StoredProposal[]> {
    const dir = proposalsDir(this.vaultPath);

    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return [];
    }

    const jsonFiles = entries.filter((e) => e.endsWith(".json"));
    const proposals: StoredProposal[] = [];

    for (const file of jsonFiles) {
      const filePath = path.join(dir, file);
      try {
        const raw = await readFile(filePath, "utf8");
        const proposal = JSON.parse(raw) as StoredProposal;
        if (!status || proposal.status === status) {
          proposals.push(proposal);
        }
      } catch {
        continue;
      }
    }

    return proposals.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async updateStatus(id: string, status: ProposalStatus): Promise<StoredProposal> {
    const proposal = await this.get(id);
    if (!proposal) {
      throw new Error(`Proposal not found: ${id}`);
    }

    proposal.status = status;
    proposal.updatedAt = new Date().toISOString();

    const filePath = proposalPath(this.vaultPath, id);
    await writeFile(filePath, JSON.stringify(proposal, null, 2), "utf8");

    return proposal;
  }
}
