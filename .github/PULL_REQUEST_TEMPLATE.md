## Summary

<!-- What does this PR do? Write 2-3 sentences explaining the purpose and context. -->

## Type of change

<!-- Check all that apply. -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change in a backwards-incompatible way)
- [ ] Documentation update
- [ ] Refactor (no functional change, improves code quality or structure)
- [ ] Test (adds missing tests or corrects existing tests)
- [ ] CI / build / tooling change

## Related issues

<!-- Link any issues this PR resolves. Use "Closes #N" to auto-close issues on merge. -->

Closes #

## Changes made

<!-- Bullet-point summary of the concrete changes in this PR. Be specific. -->

-
-
-

## Testing

<!-- How was this change tested? Check all that apply and add any relevant detail below. -->

- [ ] Unit tests added or updated (`yarn workspace @tabpilot/api test`)
- [ ] Manual testing in browser (describe the scenario below)
- [ ] Tested end-to-end with host and at least one participant
- [ ] Tested with Podman Compose production stack (`podman compose up --build`)
- [ ] No testing required (documentation / trivial change)

**Test scenario (if manual):**

<!-- Describe the exact steps you followed to verify the change works correctly. -->

## Screenshots

<!-- If this PR changes the UI, include before/after screenshots or a short screen recording. Delete this section if not applicable. -->

| Before | After |
|--------|-------|
|        |       |

## Checklist

<!-- All items must be checked before requesting a review. -->

- [ ] All existing tests pass (`yarn test`)
- [ ] TypeScript compiles without errors (`yarn build`)
- [ ] No `any` types introduced without justification
- [ ] Relevant documentation updated (README, docs/DEVELOPMENT.md, or inline comments)
- [ ] No secrets, API keys, or credentials committed
- [ ] Tested locally against a running MongoDB instance
- [ ] PR title follows Conventional Commits format (`feat:`, `fix:`, `docs:`, etc.)
