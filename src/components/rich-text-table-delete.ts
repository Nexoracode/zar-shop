import { Extension } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import type { ResolvedPos, Node as ProseMirrorNode } from "@tiptap/pm/model";

const cellTypes = new Set(["tableCell", "tableHeader"]);

/** The cell and the table the caret currently sits in, or nulls when it is outside a table. */
function tableContext($pos: ResolvedPos) {
  let cell: ProseMirrorNode | null = null;
  let table: ProseMirrorNode | null = null;
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    if (!cell && cellTypes.has(node.type.name)) cell = node;
    if (node.type.name === "table") { table = node; break; }
  }
  return { cell, table };
}

/**
 * Makes `Delete` remove table structure rather than only text.
 *
 * A table has no button of its own once the toolbar is collapsed, and a cell cannot be removed
 * on its own the way a paragraph can — the grid has to stay rectangular. So `Delete` maps onto
 * the nearest real operation:
 *
 *   - cells selected across whole rows → those rows go
 *   - cells selected across whole columns → those columns go
 *   - a selection covering the whole grid → the table goes
 *   - the caret in an empty cell → its row goes, or the table when it was the last row
 *
 * Anything else falls through, so `Delete` still deletes text inside a cell that has some.
 */
export const TableDeleteShortcut = Extension.create({
  name: "tableDeleteShortcut",

  addKeyboardShortcuts() {
    return {
      Delete: () => {
        const { editor } = this;
        if (!editor.isActive("table")) return false;

        const { selection } = editor.state;
        if (selection instanceof CellSelection) {
          const wholeRows = selection.isRowSelection();
          const wholeColumns = selection.isColSelection();
          if (wholeRows && wholeColumns) return editor.chain().focus().deleteTable().run();
          if (wholeRows) return editor.chain().focus().deleteRow().run();
          if (wholeColumns) return editor.chain().focus().deleteColumn().run();
          // A partial block of cells: let the default clear their content.
          return false;
        }

        const { cell, table } = tableContext(selection.$from);
        if (!cell || !table || cell.textContent.trim() !== "") return false;
        // `childCount` on the table is its number of rows.
        if (table.childCount <= 1) return editor.chain().focus().deleteTable().run();
        return editor.chain().focus().deleteRow().run();
      },
    };
  },
});
