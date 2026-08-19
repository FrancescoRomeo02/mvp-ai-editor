---
target: workspace editor (app/page.tsx + src/BlockEditor.tsx)
total_score: 22
p0_count: 0
p1_count: 5
timestamp: 2026-08-19T11-26-15Z
slug: workspace-editor-app-page-tsx-src-blockeditor-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 2/4 | “Saved locally” is static and remote save failures are only logged. |
| 2 | Match System / Real World | 3/4 | Paper/file language is strong, but Unicode glyphs do not communicate actions reliably. |
| 3 | User Control and Freedom | 2/4 | Native prompts block the flow; setup dialog has no visible cancel/Escape path. |
| 4 | Consistency and Standards | 2/4 | Mixed text/glyph controls and inert navigation create inconsistent interaction expectations. |
| 5 | Error Prevention | 2/4 | File actions have no inline validation or recoverable error state. |
| 6 | Recognition Rather Than Recall | 2/4 | Outline and file actions are hidden or unavailable on mobile; commands depend on prior knowledge. |
| 7 | Flexibility and Efficiency | 3/4 | Slash commands and keyboard behavior are useful for experienced writers. |
| 8 | Aesthetic and Minimalist Design | 3/4 | Calm visual language works, but several controls look like unfinished placeholders. |
| 9 | Error Recovery | 1/4 | Upload/save failures do not surface actionable recovery UI. |
| 10 | Help and Documentation | 2/4 | Empty-editor hints help, but shortcuts and file semantics are not explained consistently. |
| **Total** |  | **22/40** | Usable MVP foundation; interaction polish and state feedback need a focused pass. |

#### Anti-Patterns Verdict

The interface does not read as generic AI-generated SaaS: the restrained research-workspace tone is appropriate. The main quality tell is unfinished iconography rather than the palette: `▰＋`, `▤＋`, `↑`, `✎`, `×`, and `⌂` are used as UI symbols in `ProjectSidebar.tsx` and `FileTree.tsx`. Replace them with one coherent icon set or inline SVGs with consistent stroke weight and 44px hit areas.

The deterministic detector could not run because the bundled detector entrypoint was missing. Browser visual inspection was attempted against the local app but access to `localhost:3001` was denied by browser permission, so no visual overlay evidence is claimed.

#### Overall Impression

The core writing surface is thoughtfully restrained and the slash menu is a strong power-user affordance. The biggest opportunity is to make the workspace feel trustworthy: every visible action should be real, discoverable, appropriately labeled, and followed by a clear result.

#### What's Working

- The product hierarchy is correct: files and outline are secondary to the editor, and the document top bar keeps context visible.
- The slash menu has filtered results, previews, keyboard help, and selected-state feedback.
- Focus-visible styling, semantic labels, reduced-motion handling, and structured editor landmarks show good accessibility intent.

#### Priority Issues

- **[P1] Primary file actions use placeholder glyphs and undersized hit areas.** `ProjectSidebar.tsx` uses Unicode symbols for new folder, new file, and upload; `FileTree.tsx` uses them for folder/file/rename/delete. Several targets are 22–27px. This weakens recognition and fails comfortable touch interaction. Replace with consistent icons, keep visible labels/tooltips for unfamiliar actions, and use at least 44×44px interactive boxes.
- **[P1] File creation, rename, and deletion rely on native dialogs.** `window.prompt()` and `window.confirm()` interrupt the writing flow, cannot be styled or validated, and provide poor recovery. Use a small inline popover/dialog with labeled input, cancel, Enter/Escape behavior, duplicate-name validation, and an undoable delete toast.
- **[P1] Mobile removes important navigation.** At `max-width: 640px`, `.outline-section`, `.sidebar-footer`, and `.sidebar-nav` are hidden, while the root folder row is hidden and the remaining files become a horizontal strip. Users lose document structure and the “New paper” action. Replace this with a compact mobile drawer/sheet: Files, Outline, project actions, and account actions remain reachable.
- **[P1] Visible controls are inert.** “Workspace” and “＋ New paper” render as buttons but have no handlers. A visible dead action damages trust more than a missing action. Wire them or remove them until their behavior exists.
- **[P1] Save and upload feedback is not trustworthy.** The toolbar always says “Saved locally”, while remote project saves happen asynchronously and errors only go to `console.error`. Add `Saving…`, `Saved`, `Offline/Not synced`, and `Couldn’t save — Retry` states; surface upload progress, unsupported-file errors, and partial-failure results.

#### Persona Red Flags

**Jordan (first-time researcher):** sees cryptic glyphs, must infer that `↑` means upload, and cannot understand why the editor hint says Space opens AI. Native prompts expose implementation-level labels such as “Folder name” instead of a guided action.

**Alex (power user):** slash commands are efficient, but frequent file operations require mouse-only prompt dialogs. There is no visible keyboard route for file navigation, rename, delete, or moving nodes without drag-and-drop.

**Mina (mobile student):** loses the outline and project actions at 640px. The horizontal file strip is hard to scan, and small 30px rows/buttons make precise touch interaction difficult.

#### Minor Observations

- Clicking a folder both selects it and toggles it; selection should usually expand/collapse while the active editor file remains a file.
- The setup dialog has `role="dialog"` and `aria-modal`, but no focus trap, close affordance, or Escape handling.
- Login has no “Forgot password?” recovery path.
- `aria-selected` in the slash menu is helpful, but an active-descendant relationship to the editor would improve screen-reader context.
- The editor hint and AI chat make AI discoverable, but the trigger is hidden behind a blank paragraph and Space overrides normal typing only in that state; explain the shortcut in a persistent help affordance.

#### Questions to Consider

- Should the mobile experience prioritize a Files/Outline drawer, or should the outline become a collapsible panel directly above the editor?
- Do you want the icon language to be neutral technical (Lucide-style line icons) or more editorial (small document/folder glyphs with a stronger brand treatment)?
- For the first implementation pass, should we fix only P1 trust/accessibility issues, or also redesign the file-management interaction end-to-end?
