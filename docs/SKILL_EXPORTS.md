# Optimization skill exports

AI Usage Lens can turn a supported optimization signal into an editable `SKILL.md` draft for Codex or Cursor. This is a download-only workflow: the app does not install the file, create directories, enable a skill, or modify client settings.

## Evidence boundary

The generator accepts only three pre-authored templates and their validated aggregate evidence:

- high measured input relative to output;
- low reported cache share;
- high measured output total.

It never includes prompt or response text, conversation titles, message IDs, provider/source labels, account namespaces, identity fields, credentials, or imported instructions. Imported content is treated as untrusted data. The generated guidance preserves requirements and safety constraints and makes no guaranteed savings claim.

## Manual placement

After reviewing and editing the download, a user may manually place it at the client-specific path shown in the interface:

- Codex: `.codex/skills/<skill-name>/SKILL.md`
- Cursor: `.cursor/skills/<skill-name>/SKILL.md`

The YAML frontmatter contains only the required `name` and `description`. The Markdown body contains the aggregate evidence, bounded instructions, limitations, and a client note.

Official references: [Codex skills](https://learn.chatgpt.com/docs/build-skills) and [Cursor skills](https://cursor.com/docs/skills).
