import {
  useEffect,
  useRef,
  useState,
  type CompositionEvent,
  type KeyboardEvent,
} from "react"

type EditableCellProps = {
  value: string
  onSave: (value: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string
}

// 週報表格可編輯欄位的共用外觀樣式。
const baseClassName =
  "min-h-11 w-full rounded-lg border border-transparent bg-white px-3.5 py-2.5 text-center text-base leading-7 text-slate-700 outline-none transition focus:border-slate-300 focus:bg-slate-50 focus:ring-2 focus:ring-slate-200"

const EditableCell = ({
  value,
  onSave,
  placeholder,
  multiline = false,
  className = "",
}: EditableCellProps) => {
  // draft 保存輸入中的內容，ref 用來判斷是否需要提交與避免重複 blur 儲存。
  const [draft, setDraft] = useState(value)
  const lastCommittedValueRef = useRef(value)
  const skipNextBlurCommitRef = useRef(false)
  const isComposingRef = useRef(false)

  useEffect(() => {
    // 外部資料更新時同步本地草稿，避免顯示舊值。
    setDraft(value)
    lastCommittedValueRef.current = value
  }, [value])

  // 將目前草稿修整後提交給父層，只在值有變更時觸發儲存。
  const commit = () => {
    const nextValue = draft.trim()
    if (nextValue !== lastCommittedValueRef.current) {
      lastCommittedValueRef.current = nextValue
      setDraft(nextValue)
      onSave(nextValue)
    }
  }

  // 還原成外部傳入的原始值。
  const revert = () => {
    setDraft(value)
  }

  // 處理鍵盤提交或取消，並避開中文輸入法組字期間的 Enter。
  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (isComposingRef.current) {
      return
    }

    if (event.key === "Escape") {
      revert()
      skipNextBlurCommitRef.current = true
      event.currentTarget.blur()
      return
    }

    if (!multiline && event.key === "Enter") {
      event.preventDefault()
      commit()
      skipNextBlurCommitRef.current = true
      event.currentTarget.blur()
    }

    if (multiline && (event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault()
      commit()
      skipNextBlurCommitRef.current = true
      event.currentTarget.blur()
    }
  }

  // 欄位失焦時提交資料，若前一次鍵盤操作已處理則略過。
  const handleBlur = () => {
    if (skipNextBlurCommitRef.current) {
      skipNextBlurCommitRef.current = false
      return
    }
    commit()
  }

  // 標記輸入法組字開始，避免 Enter 被誤判為提交。
  const handleCompositionStart = (
    _event: CompositionEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    isComposingRef.current = true
  }

  // 標記輸入法組字結束，恢復鍵盤快捷提交判斷。
  const handleCompositionEnd = (
    _event: CompositionEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    isComposingRef.current = false
  }

  if (multiline) {
    return (
      <textarea
        value={draft}
        rows={3}
        placeholder={placeholder}
        className={`${baseClassName} resize-y ${className}`}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
    )
  }

  return (
    <input
      value={draft}
      placeholder={placeholder}
      className={`${baseClassName} ${className}`}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  )
}

export default EditableCell
