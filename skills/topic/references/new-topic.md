# Bare Invocation: Start a New Topic

First check: does the current directory have an `INDEX.md`?

## Initialized (INDEX.md exists)

1. Read `INDEX.md` and decide merge vs. create:
   - Conversation clearly belongs to an existing topic → suggest merging, work inside that directory, update its README.
   - Plausibly related to an existing topic but uncertain → propose a directory name and ask one short question before writing files.
   - Clearly new (the default) → create.
2. Create `<kebab-case-slug>/README.md` from `<skill_dir>/templates/topic-README.template.md`, seeded from the `/topic <one-liner>` argument or the current conversation context.
3. Add an `INDEX.md` row (new topics get `status=idea`, dated today) and append one `log.md` line.
4. All artifacts produced later in this session go inside the topic directory. **Never restructure the root or touch other topic directories.**

## Not Initialized (no INDEX.md)

Lightweight fallback: create only `<slug>/README.md`. Do not generate any root control files and do not touch anything else at the root. Mention once: "This directory is not initialized as a topic archive — run /topic init to adopt it."

## Details

- Slugs are stable, descriptive kebab-case and exactly one path component; never copy separators, `.` or `..` from user input. Add a qualifier only on a real collision.
- READMEs hold synthesized outcomes, never conversation transcripts.
- Before the session ends, complete the session-close touches per the Shared Rules (in an uninitialized directory, only the topic README applies).
