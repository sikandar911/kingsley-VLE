import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Mention from '@tiptap/extension-mention'
import { Extension } from '@tiptap/core'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import MentionList from './MentionList'

/* ── Toolbar icon button ─────────────────────────────────────────────────── */
function ToolbarBtn({ editor, onClick, active, title, children }) {
  const handleMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Execute the command — Tiptap's chain automatically preserves selection
    // Do NOT call focus() after, as it resets the cursor position
    onClick()
  }

  return (
    <button
      type="button"
      onMouseDown={handleMouseDown}
      tabIndex={-1}
      title={title}
      className={`px-2 py-1 rounded text-xs font-semibold transition select-none focus:outline-none ${
        active
          ? 'bg-[#6b1d3e] text-white'
          : 'text-gray-600 hover:text-[#6b1d3e] hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-4 bg-gray-200 mx-0.5 self-center" />
}

/* ── Tiptap rich-text editor ─────────────────────────────────────────────── */
const TiptapEditor = forwardRef(function TiptapEditor(
  { onSend, members = [], showToolbar = false, placeholder = 'Type a message...', disabled = false },
  ref
) {
  // Keep fresh refs so extension closures are never stale
  const membersRef = useRef(members)
  const onSendRef = useRef(onSend)

  useEffect(() => { membersRef.current = members }, [members])
  useEffect(() => { onSendRef.current = onSend }, [onSend])

  /* ── EnterToSend custom extension ──────────────────────────────────────── */
  const EnterToSend = useMemo(
    () =>
      Extension.create({
        name: 'enterToSend',
        // Higher priority than HardBreak (default 100) so our Shift-Enter wins
        priority: 1000,
        addKeyboardShortcuts() {
          return {
            Enter: ({ editor }) => {
              // Let Enter work normally inside list items
              if (editor.isActive('listItem')) {
                return false
              }
              onSendRef.current?.()
              return true
            },
            // Shift+Enter creates a new paragraph so each line is its own block.
            // This means heading/list formatting applies only to the SELECTED blocks,
            // not the entire text. <br> inside one <p> would apply to the whole paragraph.
            'Shift-Enter': ({ editor }) => editor.commands.splitBlock(),
          }
        },
      }),
    []
  )

  /* ── Editor instance ────────────────────────────────────────────────────── */
  const editor = useEditor({
    extensions: [
      // Disable hardBreak so Shift+Enter creates paragraphs (not <br>)
      // Each line becomes a separate <p>, so block formatting applies only to selected lines
      StarterKit.configure({ hardBreak: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'chat-link',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      // Table support (simplified - markdown tables)
      // Note: Full table extension requires additional setup; using bold/lists instead for MVP
      Mention.configure({
        HTMLAttributes: { class: 'chat-mention' },
        renderLabel({ node }) {
          return `@${node.attrs.label ?? node.attrs.id}`
        },
        suggestion: {
          items: ({ query }) =>
            membersRef.current
              .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 8),
          render: () => {
            let component
            let popup

            return {
              onStart(props) {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                })
                if (!props.clientRect) return
                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                  zIndex: 9999,
                })
              },
              onUpdate(props) {
                component.updateProps(props)
                if (!props.clientRect) return
                popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect })
              },
              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup?.[0]?.hide()
                  return true
                }
                return component.ref?.onKeyDown(props) ?? false
              },
              onExit() {
                popup?.[0]?.destroy()
                component.destroy()
              },
            }
          },
        },
      }),
      EnterToSend,
    ],
    editorProps: {
      attributes: {
        class: [
          'outline-none text-sm text-gray-800 leading-relaxed',
          'min-h-[36px] max-h-[180px] overflow-y-auto',
          disabled ? 'opacity-50 pointer-events-none' : '',
        ]
          .filter(Boolean)
          .join(' '),
      },
    },
  })

  /* ── Placeholder (CSS via data attr) ────────────────────────────────────── */
  useEffect(() => {
    if (!editor) return
    editor.setOptions({
      editorProps: {
        attributes: {
          'data-placeholder': placeholder,
          class: [
            'outline-none text-sm text-gray-800 leading-relaxed',
            'min-h-[36px] max-h-[180px] overflow-y-auto',
            disabled ? 'opacity-50 pointer-events-none' : '',
          ]
            .filter(Boolean)
            .join(' '),
        },
      },
    })
  }, [editor, placeholder, disabled])

  /* ── Imperative handle ───────────────────────────────────────────────────── */
  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() ?? '',
    isEmpty: () => !editor || editor.isEmpty,
    clear: () => editor?.commands.clearContent(true),
    focus: () => editor?.commands.focus(),
  }))

  /* ── Toolbar actions ─────────────────────────────────────────────────────── */
  const handleLink = () => {
    if (editor?.isActive('link')) {
      editor.chain().unsetLink().run()
      return
    }
    const url = window.prompt('Enter URL:')
    if (!url) return
    const href = url.startsWith('http') ? url : `https://${url}`
    editor?.chain().setLink({ href }).run()
  }

  if (!editor) return null

  return (
    <div className="flex flex-col w-full">
      {/* ── Formatting Toolbar (teachers only) ─────────────────────────────── */}
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-0.5 pb-2 mb-1 border-b border-gray-100">
          {/* Bold */}
          <ToolbarBtn
            editor={editor}
            onClick={() => editor.chain().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarBtn>

          <Divider />

          {/* Headings */}
          {[1, 2, 3].map((level) => (
            <ToolbarBtn
              key={level}
              editor={editor}
              onClick={() => editor.chain().toggleHeading({ level }).run()}
              active={editor.isActive('heading', { level })}
              title={`Heading ${level}`}
            >
              H{level}
            </ToolbarBtn>
          ))}

          <Divider />

          {/* Lists */}
          <ToolbarBtn
            editor={editor}
            onClick={() => editor.chain().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            • List
          </ToolbarBtn>
          <ToolbarBtn
            editor={editor}
            onClick={() => editor.chain().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered List"
          >
            1. List
          </ToolbarBtn>

          <Divider />

          {/* Link */}
          <ToolbarBtn
            editor={editor}
            onClick={handleLink}
            active={editor.isActive('link')}
            title="Insert / Remove Link"
          >
            🔗
          </ToolbarBtn>
        </div>
      )}

      {/* ── Editor content ───────────────────────────────────────────────────── */}
      <EditorContent editor={editor} />

      {/* ── Hint for students ────────────────────────────────────────────────── */}
      {!showToolbar && editor.isEmpty && (
        <span className="absolute pointer-events-none text-sm text-gray-400 select-none">
          {placeholder}
        </span>
      )}
    </div>
  )
})

export default TiptapEditor
