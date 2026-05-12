import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

type MergeStatus = 'pending_approval' | 'approved' | 'applied' | 'rejected' | 'conflict';

interface MergeProposal {
  changes: Array<{ content: string; section: string; type: 'link' | 'add' | 'update' }>;
  diff_id: string;
  proposed: string;
  source: string;
  status: MergeStatus;
  target: string;
  target_current: string;
  target_mtime: number;
}

const splitSections = (content: string) => {
  const lines = content.split(/\r?\n/);
  const sections: Array<{ heading: string; content: string[] }> = [];
  let currentHeading = 'root';
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      sections.push({ heading: currentHeading, content: currentLines });
      currentHeading = line;
      currentLines = [line];
      continue;
    }

    currentLines.push(line);
  }

  sections.push({ heading: currentHeading, content: currentLines });

  return sections;
};

const mergeContent = (targetContent: string, sourceContent: string) => {
  const targetSections = splitSections(targetContent);
  const sourceSections = splitSections(sourceContent);
  const targetByHeading = new Map(targetSections.map((section) => [section.heading, section] as const));

  for (const sourceSection of sourceSections) {
    const existing = targetByHeading.get(sourceSection.heading);

    if (!existing) {
      targetSections.push(sourceSection);
      continue;
    }

    const extraLines = sourceSection.content.filter((line) => line.trim().length > 0 && !existing.content.includes(line));
    existing.content.push(...extraLines);
  }

  return targetSections
    .flatMap((section) => section.content)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
};

const proposalDir = (basePath: string) => path.resolve(basePath, 'reportes', 'conflicts');

const proposalPath = (basePath: string, diffId: string) => path.join(proposalDir(basePath), `${diffId}.json`);

const readProposal = async (basePath: string, diffId: string): Promise<MergeProposal | null> => {
  try {
    const raw = await readFile(proposalPath(basePath, diffId), 'utf8');
    return JSON.parse(raw) as MergeProposal;
  } catch {
    return null;
  }
};

const writeProposal = async (basePath: string, proposal: MergeProposal) => {
  await mkdir(proposalDir(basePath), { recursive: true });
  await writeFile(proposalPath(basePath, proposal.diff_id), JSON.stringify(proposal, null, 2), 'utf8');
};

const createProposal = async (basePath: string, sourcePath: string, targetPath: string): Promise<MergeProposal> => {
  const absoluteSource = path.resolve(basePath, sourcePath);
  const absoluteTarget = path.resolve(basePath, targetPath);
  const [sourceContent, targetContent, targetStat] = await Promise.all([
    readFile(absoluteSource, 'utf8'),
    readFile(absoluteTarget, 'utf8'),
    stat(absoluteTarget),
  ]);

  const proposed = mergeContent(targetContent, sourceContent);

  return {
    changes: sourceContent.includes('[[')
      ? [{ content: 'wikilinks detected', section: 'links', type: 'link' }]
      : [{ content: 'content merge', section: 'body', type: 'update' }],
    diff_id: `${path.basename(targetPath)}-${Date.now()}`,
    proposed,
    source: sourcePath,
    status: 'pending_approval',
    target: targetPath,
    target_current: targetContent,
    target_mtime: targetStat.mtimeMs,
  };
};

export const createMarkdownMergeTool = (basePath: string) => ({
  proposeMerge: async (sourcePath: string, targetPath: string) => {
    const proposal = await createProposal(basePath, sourcePath, targetPath);
    await writeProposal(basePath, proposal);

    return proposal;
  },

  applyMerge: async (diffId: string) => {
    const proposal = await readProposal(basePath, diffId);

    if (!proposal) {
      return { status: 'rejected' as const, file: '' };
    }

    if (proposal.status !== 'approved') {
      return { status: 'rejected' as const, file: proposal.target };
    }

    const absoluteTarget = path.resolve(basePath, proposal.target);
    const currentStat = await stat(absoluteTarget);

    if (currentStat.mtimeMs !== proposal.target_mtime) {
      const conflictPath = path.resolve(proposalDir(basePath), `${diffId}.conflict.json`);
      await writeFile(
        conflictPath,
        JSON.stringify(
          {
            current: await readFile(absoluteTarget, 'utf8'),
            proposed: proposal.proposed,
            target: proposal.target,
          },
          null,
          2,
        ),
        'utf8',
      );

      return { conflict_path: path.relative(basePath, conflictPath), file: proposal.target, status: 'conflict' as const };
    }

    await writeFile(absoluteTarget, proposal.proposed, 'utf8');

    return { file: proposal.target, status: 'applied' as const };
  },
});

export const proposeMerge = async (basePath: string, sourcePath: string, targetPath: string) =>
  createMarkdownMergeTool(basePath).proposeMerge(sourcePath, targetPath);

export const applyMerge = async (basePath: string, diffId: string) => createMarkdownMergeTool(basePath).applyMerge(diffId);
