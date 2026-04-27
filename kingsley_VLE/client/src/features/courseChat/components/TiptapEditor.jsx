import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  useRef,
} from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import { Extension } from "@tiptap/core";
import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import MentionList from "./MentionList";

/* ── Toolbar icon button ─────────────────────────────────────────────────── */
function ToolbarBtn({ editor, onClick, active, title, children }) {
  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Execute the command while preserving selection.
    onClick();
  };

  return (
    <button
      type="button"
      onMouseDown={handleMouseDown}
      tabIndex={-1}
      title={title}
      className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[11px] sm:text-xs font-semibold transition select-none focus:outline-none ${
        active
          ? "bg-[#6b1d3e] text-white"
          : "text-gray-600 hover:text-[#6b1d3e] hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-gray-200 mx-0.5 self-center" />;
}

/* ── Tiptap rich-text editor ─────────────────────────────────────────────── */
const TiptapEditor = forwardRef(function TiptapEditor(
  {
    onSend,
    members = [],
    showToolbar = false,
    placeholder = "Type a message...",
    disabled = false,
  },
  ref,
) {
  const membersRef = useRef(members);
  const onSendRef = useRef(onSend);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    onSendRef.current = onSend;
  }, [onSend]);

  // Keep Shift+Enter as an explicit newline action.
  const ShiftEnterNewLine = useMemo(
    () =>
      Extension.create({
        name: "shiftEnterNewLine",
        priority: 1000,
        addKeyboardShortcuts() {
          return {
            "Shift-Enter": ({ editor }) => editor.commands.splitBlock(),
          };
        },
      }),
    [],
  );

  const editorClassName = [
    "outline-none text-sm text-gray-800 leading-relaxed break-words [overflow-wrap:anywhere] whitespace-pre-wrap",
    "min-h-[24px] max-h-[72px] sm:min-h-[34px] sm:max-h-[90px] overflow-y-auto",
    disabled ? "opacity-50 pointer-events-none" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const isInsideListItem = (selection) => {
    for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
      if (selection.$from.node(depth).type.name === "listItem") {
        return true;
      }
    }
    return false;
  };

  const handleEditorKeyDown = (view, event) => {
    if (event.key !== "Enter") return false;

    // Shift+Enter should insert a new line, not send.
    if (event.shiftKey) return false;

    // Keep normal Enter behavior for list items.
    if (isInsideListItem(view.state.selection)) {
      return false;
    }

    onSendRef.current?.();
    return true;
  };

  const syncEditorEmptyState = (editorInstance) => {
    setIsEditorEmpty(editorInstance?.isEmpty ?? true);
  };

  const editor = useEditor({
    onCreate: ({ editor }) => syncEditorEmptyState(editor),
    onUpdate: ({ editor }) => syncEditorEmptyState(editor),
    extensions: [
      StarterKit.configure({ hardBreak: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "chat-link",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Mention.configure({
        HTMLAttributes: { class: "chat-mention" },
        renderLabel({ node }) {
          return `@${node.attrs.label ?? node.attrs.id}`;
        },
        suggestion: {
          items: ({ query }) =>
            membersRef.current
              .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 8),
          render: () => {
            let component;
            let popup;

            return {
              onStart(props) {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });
                if (!props.clientRect) return;
                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                  zIndex: 9999,
                });
              },
              onUpdate(props) {
                component.updateProps(props);
                if (!props.clientRect) return;
                popup?.[0]?.setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },
              onKeyDown(props) {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  return true;
                }
                return component.ref?.onKeyDown(props) ?? false;
              },
              onExit() {
                popup?.[0]?.destroy();
                component.destroy();
              },
            };
          },
        },
      }),
      ShiftEnterNewLine,
    ],
    editorProps: {
      handleKeyDown: handleEditorKeyDown,
      attributes: {
        class: editorClassName,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        handleKeyDown: handleEditorKeyDown,
        attributes: {
          "data-placeholder": placeholder,
          class: editorClassName,
        },
      },
    });
  }, [editor, placeholder, editorClassName]);

  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() ?? "",
    isEmpty: () => !editor || editor.isEmpty,
    clear: () => editor?.commands.clearContent(true),
    focus: () => editor?.commands.focus(),
  }));

  const handleLink = () => {
    if (editor?.isActive("link")) {
      editor.chain().unsetLink().run();
      return;
    }
    const url = window.prompt("Enter URL:");
    if (!url) return;
    const href = url.startsWith("http") ? url : `https://${url}`;
    editor?.chain().setLink({ href }).run();
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col w-full">
      {showToolbar && (
        <div className="flex items-center gap-0.5 pb-0 mb-0.5 border-b border-gray-100 overflow-x-auto whitespace-nowrap">
          <ToolbarBtn
            editor={editor}
            onClick={() => editor.chain().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarBtn>

          <Divider />

          {[1, 2, 3].map((level) => (
            <ToolbarBtn
              key={level}
              editor={editor}
              onClick={() => editor.chain().toggleHeading({ level }).run()}
              active={editor.isActive("heading", { level })}
              title={`Heading ${level}`}
            >
              H{level}
            </ToolbarBtn>
          ))}

          <Divider />

          <ToolbarBtn
            editor={editor}
            onClick={() => editor.chain().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet List"
          >
            • List
          </ToolbarBtn>
          <ToolbarBtn
            editor={editor}
            onClick={() => editor.chain().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Numbered List"
          >
            1. List
          </ToolbarBtn>

          <Divider />

          <ToolbarBtn
            editor={editor}
            onClick={handleLink}
            active={editor.isActive("link")}
            title="Insert / Remove Link"
          >
            🔗
          </ToolbarBtn>
        </div>
      )}

      <EditorContent editor={editor} />

      {!showToolbar && isEditorEmpty && (
        <span className="absolute pointer-events-none text-xs md:text-[13px] text-gray-400 select-none">
          {placeholder}
        </span>
      )}
    </div>
  );
});

export default TiptapEditor;
